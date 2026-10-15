// =============================================================================
// Voxelový svět – Síťový Klient, WebSockets & Peer-to-Peer (js/network.js)
// =============================================================================

class NetworkManager {
  constructor() {
    this.activeGame = null;
    this.socket = null;
    this.connected = false;
    this.playerId = null;
    this.isOp = false;
    this.remotePlayers = new Map(); // id -> { group, rig, nametag, targetX, targetY, targetZ, targetYaw, targetPitch, phase }
    this.worldDeltas = {};
    this.syncTimer = null;
    this.autoSaveTimer = null;
    this.autoSaveBadgeTimer = null;

    // P2P (WebRTC přes PeerJS) stav
    this.peer = null;
    this.p2pRoomCode = null;
    this.isP2PHost = false;
    this.p2pHostConn = null; // Pokud jsme klient, spojení na hostitele
    this.p2pClients = new Map(); // Pokud jsme hostitel: peerId -> conn
    this.pendingP2PConn = null; // Čekající žádost o připojení

    // Inicializace po načtení
    this.init();
    this.bindP2PUI();
  }

  // Získání aktuálního vzhledu postavy s bezpečnými výchozími hodnotami (žádný bílý objekt!)
  getLocalPlayerSkin() {
    if (typeof playerCustom !== 'undefined' && playerCustom && playerCustom.skinColor) {
      return playerCustom;
    }
    try {
      const saved = localStorage.getItem('voxel_char_custom');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    if (typeof DEFAULT_CUSTOM !== 'undefined') return DEFAULT_CUSTOM;
    return {
      skinColor: '#f5cfb3',
      hairStyle: 'short',
      hairColor: '#3e271a',
      eyeColor: '#2980b9',
      facialHair: 'none',
      underwearColor: '#23395d',
      underwearStyle: 'boxers'
    };
  }

  getLocalEquippedMap() {
    if (typeof getEquippedMap === 'function') {
      return getEquippedMap();
    }
    return {};
  }

  init() {
    if (typeof GameStorage !== 'undefined') {
      this.activeGame = GameStorage.getActiveGame();
    } else {
      this.activeGame = { mode: 'singleplayer' };
    }

    if (this.activeGame.mode === 'multiplayer') {
      this.connectToServer(this.activeGame.serverAddress || 'localhost:3000');
    } else if (this.activeGame.mode === 'p2p_client') {
      this.connectToP2PHost(this.activeGame.p2pRoomCode);
    } else {
      this.initSingleplayer();
    }
  }

  // ===========================================================================
  // 1. SINGLEPLAYER – Ukládání a Načítání
  // ===========================================================================
  initSingleplayer() {
    const worldId = this.activeGame.worldId || 'world_default';
    const savedWorld = (typeof GameStorage !== 'undefined') ? GameStorage.getWorld(worldId) : null;

    if (savedWorld) {
      if (savedWorld.worldDeltas) {
        this.worldDeltas = Object.assign({}, savedWorld.worldDeltas);
      }

      window.addEventListener('load', () => {
        setTimeout(() => {
          if (savedWorld.playerState && typeof P !== 'undefined') {
            const ps = savedWorld.playerState;
            if (ps.x && ps.y && ps.z) {
              P.x = ps.x;
              P.y = ps.y;
              P.z = ps.z;
            }
            if (typeof yaw !== 'undefined' && ps.yaw) yaw = ps.yaw;
            if (typeof pitch !== 'undefined' && ps.pitch) pitch = ps.pitch;
            if (typeof G !== 'undefined') {
              if (ps.hp) G.hp = ps.hp;
              if (ps.st) G.st = ps.st;
            }
            if (ps.hotbar && typeof HB !== 'undefined') {
              HB.length = 0;
              ps.hotbar.forEach(item => HB.push(item));
              if (typeof renderHB === 'function') renderHB();
            }
            if (ps.equipped && typeof EQ !== 'undefined') {
              EQ.length = 0;
              ps.equipped.forEach(item => EQ.push(item));
            }
            if (ps.custom && typeof playerCustom !== 'undefined') {
              Object.assign(playerCustom, ps.custom);
              if (typeof updatePlayerAppearance === 'function') updatePlayerAppearance();
            }

            // Ochrana před spawnem ve vodě
            const pbx = Math.floor(P.x / S);
            const pbz = Math.floor(P.z / S);
            const sh = (typeof height === 'function') ? height(pbx, pbz) : 80;
            if (P.y <= (SEA + 1) * S || sh < SEA + 2) {
              if (typeof findSafeSpawnCoords === 'function') {
                const safe = findSafeSpawnCoords();
                P.x = safe.x; P.y = safe.y; P.z = safe.z;
                P.vx = 0; P.vy = 0; P.vz = 0;
              }
            }

            if (typeof toast === 'function') {
              toast(`Svět "${savedWorld.name}" načten.`);
            }
          }
        }, 500);
      });
    }

    // Automatické ukládání postupu přesně každých 5 sekund
    this.autoSaveTimer = setInterval(() => {
      this.saveSingleplayerWorld();
    }, 5000);

    window.addEventListener('beforeunload', () => {
      this.saveSingleplayerWorld();
    });
  }

  saveSingleplayerWorld() {
    if (this.activeGame.mode !== 'singleplayer' && !this.isP2PHost) return;
    if (typeof P === 'undefined' || typeof GameStorage === 'undefined') return;
    const worldId = this.activeGame.worldId || 'world_default';

    const playerState = {
      x: P.x,
      y: P.y,
      z: P.z,
      yaw: typeof yaw !== 'undefined' ? yaw : 0,
      pitch: typeof pitch !== 'undefined' ? pitch : 0,
      hp: typeof G !== 'undefined' ? G.hp : 100,
      st: typeof G !== 'undefined' ? G.st : 100,
      hotbar: (typeof HB !== 'undefined') ? [...HB] : [],
      equipped: (typeof EQ !== 'undefined') ? [...EQ] : [],
      custom: this.getLocalPlayerSkin()
    };

    GameStorage.updateWorldData(worldId, playerState, this.worldDeltas);
    this.showAutoSaveBadge();
  }

  showAutoSaveBadge() {
    const el = document.getElementById('autoSaveIndicator');
    if (!el) return;
    el.style.display = 'block';
    el.style.opacity = '1';
    if (this.autoSaveBadgeTimer) clearTimeout(this.autoSaveBadgeTimer);
    this.autoSaveBadgeTimer = setTimeout(() => {
      el.style.opacity = '0';
      setTimeout(() => {
        if (el.style.opacity === '0') el.style.display = 'none';
      }, 600);
    }, 1200);
  }

  // ===========================================================================
  // 2. PEER-TO-PEER (P2P LAN / Přátelé přes WebRTC)
  // ===========================================================================
  
  // Hostitel: Otevření světa pro přátele (vygeneruje kód)
  openP2PHostDialog() {
    const modal = document.getElementById('p2pModal');
    if (!modal) return;

    if (!this.isP2PHost) {
      this.startP2PHost();
    }

    modal.hidden = false;
    this.updateP2PPlayerCount();
  }

  startP2PHost() {
    if (typeof Peer === 'undefined') {
      alert('Knihovna PeerJS se nenačetla. Zkontrolujte připojení k internetu.');
      return;
    }

    // Generování 4-místného kódu (např. VOX-7429)
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    this.p2pRoomCode = `VOX-${randomNum}`;
    const peerId = `vox-world-${randomNum}`;

    this.showNetStatus(`Zakládám P2P místnost ${this.p2pRoomCode}…`, 'connecting');

    try {
      this.peer = new Peer(peerId, { debug: 1 });
    } catch (e) {
      this.showNetStatus(`Chyba P2P: ${e.message}`, 'error', true);
      return;
    }

    this.peer.on('open', () => {
      this.isP2PHost = true;
      this.connected = true;
      this.hideNetStatus();

      const display = document.getElementById('p2pRoomCodeDisplay');
      if (display) display.textContent = this.p2pRoomCode;

      if (typeof addChatMessage === 'function') {
        addChatMessage('Systém', `Svět byl otevřen pro přátele! Kód světa: ${this.p2pRoomCode}`, 'info');
      }
      if (typeof toast === 'function') {
        toast(`Kód světa: ${this.p2pRoomCode}`);
      }

      // Spustit rozesílání své polohy připojeným hráčům
      if (!this.syncTimer) {
        this.syncTimer = setInterval(() => this.sendPlayerTransform(), 50);
      }

      // Ukládání světa hostitele každých 5 sekund
      if (!this.autoSaveTimer) {
        this.autoSaveTimer = setInterval(() => this.saveSingleplayerWorld(), 5000);
      }
    });

    // Příchozí spojení od jiného hráče
    this.peer.on('connection', (conn) => {
      conn.on('data', (data) => {
        if (data.type === 'joinRequest') {
          // Zobrazit dialog se schválením připojení (klient zatím NEVSTUPUJE do světa!)
          this.promptJoinRequest(conn, data);
        } else {
          // Zpracovat herní zprávy POUZE pro schválené klienty!
          if (this.p2pClients.has(conn.peer)) {
            this.handleP2PClientMessage(conn, data);
          }
        }
      });

      conn.on('close', () => {
        this.p2pClients.delete(conn.peer);
        this.removeRemotePlayer(conn.peer);
        this.updateP2PPlayerCount();
        if (typeof addChatMessage === 'function') {
          addChatMessage('Systém', `Hráč opustil svět.`, 'system');
        }
      });
    });

    this.peer.on('error', (err) => {
      console.warn('[P2P Host Error]', err);
      if (err.type === 'unavailable-id') {
        this.startP2PHost();
      } else {
        this.showNetStatus(`P2P chyba: ${err.message}`, 'error');
      }
    });
  }

  // Zobrazení žádosti o připojení hostiteli
  promptJoinRequest(conn, data) {
    this.pendingP2PConn = { conn, data };
    const popup = document.getElementById('p2pRequestPopup');
    const text = document.getElementById('p2pRequestText');
    if (popup && text) {
      text.innerHTML = `Hráč <strong>${this.escape(data.nickname || 'Hráč')}</strong> se chce připojit do tvého světa.`;
      popup.style.display = 'block';
      if (typeof playClickSound === 'function') playClickSound();
    }
  }

  // Schválení připojení hostitelem
  acceptPendingP2P() {
    if (!this.pendingP2PConn) return;
    const { conn, data } = this.pendingP2PConn;
    this.pendingP2PConn = null;

    const popup = document.getElementById('p2pRequestPopup');
    if (popup) popup.style.display = 'none';

    // Přidat klienta do schválených
    this.p2pClients.set(conn.peer, conn);

    // 1. Odeslat klientovi potvrzení, seed světa a stávající bloky
    const hostNick = (typeof getPlayerNickname === 'function') ? getPlayerNickname() : 'Hostitel';
    conn.send({
      type: 'init',
      playerId: conn.peer,
      serverName: `Svět hráče ${hostNick}`,
      seed: this.activeGame.seed || 12345,
      isOp: false,
      worldDeltas: this.worldDeltas,
      players: [
        {
          id: 'host',
          nickname: hostNick,
          isOp: true,
          x: P.x, y: P.y, z: P.z,
          yaw: typeof yaw !== 'undefined' ? yaw : 0,
          skin: this.getLocalPlayerSkin(),
          equipment: this.getLocalEquippedMap()
        }
      ]
    });

    // 2. Vytvořit model hráče u hostitele s jeho reálným skinem
    this.spawnRemotePlayer({
      id: conn.peer,
      nickname: data.nickname || 'Hráč',
      skin: data.skin || {},
      equipment: data.equipment || {},
      x: P.x + 2, y: P.y + 0.2, z: P.z + 2,
      isOp: false
    });

    this.updateP2PPlayerCount();

    if (typeof addChatMessage === 'function') {
      addChatMessage('Systém', `Hráč ${data.nickname || 'Přítel'} vstoupil do tvého světa!`, 'system');
    }
    if (typeof toast === 'function') {
      toast(`Hráč ${data.nickname} se připojil.`);
    }
  }

  // Odmítnutí připojení hostitelem
  rejectPendingP2P() {
    if (!this.pendingP2PConn) return;
    const { conn } = this.pendingP2PConn;
    this.pendingP2PConn = null;

    const popup = document.getElementById('p2pRequestPopup');
    if (popup) popup.style.display = 'none';

    conn.send({ type: 'rejected', message: 'Hostitel odmítl žádost o připojení.' });
    setTimeout(() => conn.close(), 200);
  }

  // Zpracování zpráv od klienta na hostiteli
  handleP2PClientMessage(conn, msg) {
    if (!this.p2pClients.has(conn.peer)) return;

    if (msg.type === 'move') {
      this.updateRemotePlayer(Object.assign({ id: conn.peer }, msg));
      this.broadcastP2P(Object.assign({ id: conn.peer }, msg), conn.peer);
    } else if (msg.type === 'blockChange') {
      this.onRemoteBlockChange(msg.x, msg.y, msg.z, msg.blockType);
      this.broadcastP2P(msg, conn.peer);
    } else if (msg.type === 'chat') {
      if (typeof addChatMessage === 'function') {
        addChatMessage(msg.sender || 'Hráč', msg.text, 'user');
      }
      this.broadcastP2P(msg, conn.peer);
    }
  }

  // Rozeslání zprávy všem P2P klientům
  broadcastP2P(msg, excludePeer = null) {
    for (const [peerId, conn] of this.p2pClients) {
      if (peerId !== excludePeer && conn.open) {
        conn.send(msg);
      }
    }
  }

  updateP2PPlayerCount() {
    const el = document.getElementById('p2pPlayersCount');
    if (el) {
      el.textContent = `${this.p2pClients.size + 1} / 4 hráčů`;
    }
  }

  // ===========================================================================
  // 3. P2P KLIENT – Připojení ke světu přítele
  // ===========================================================================
  connectToP2PHost(roomCode) {
    if (typeof Peer === 'undefined') {
      alert('Knihovna PeerJS se nenačetla.');
      return;
    }

    const cleanNum = (roomCode || '').replace(/[^0-9]/g, '');
    if (!cleanNum) {
      this.showNetStatus('Neplatný formát kódu světa.', 'error', true);
      return;
    }

    // Zobrazit modal čekání na schválení hostitelem (hráč nesmí vstoupit dříve, než hostitel povolí!)
    const waitingModal = document.getElementById('p2pWaitingModal');
    if (waitingModal) {
      waitingModal.style.display = 'flex';
      waitingModal.hidden = false;
    }

    // Zastavit pohyb hráče dokud není schválen
    if (typeof P !== 'undefined') {
      P.moveX = 0; P.moveZ = 0; P.vx = 0; P.vz = 0;
    }

    const targetPeerId = `vox-world-${cleanNum}`;
    this.showNetStatus(`Připojuji se k příteli (${roomCode})…`, 'connecting');

    try {
      this.peer = new Peer({ debug: 1 });
    } catch (e) {
      this.showNetStatus(`P2P chyba: ${e.message}`, 'error', true);
      return;
    }

    this.peer.on('open', () => {
      this.p2pHostConn = this.peer.connect(targetPeerId);

      this.p2pHostConn.on('open', () => {
        this.showNetStatus('Odeslána žádost o připojení. Čekám na schválení hostitelem…', 'connecting');

        const nickname = (typeof getPlayerNickname === 'function') ? getPlayerNickname() : 'Hráč';
        const skin = this.getLocalPlayerSkin();
        const equipment = this.getLocalEquippedMap();

        this.p2pHostConn.send({
          type: 'joinRequest',
          nickname: nickname,
          skin: skin,
          equipment: equipment
        });
      });

      this.p2pHostConn.on('data', (msg) => {
        if (msg.type === 'rejected') {
          if (waitingModal) waitingModal.style.display = 'none';
          alert(msg.message || 'Hostitel odmítl žádost o připojení.');
          window.location.replace('../index.html');
          return;
        }
        this.handleServerMessage(msg);
      });

      this.p2pHostConn.on('close', () => {
        this.connected = false;
        if (waitingModal) waitingModal.style.display = 'none';
        if (this.syncTimer) clearInterval(this.syncTimer);
        this.showNetStatus('Spojení s hostitelem bylo ukončeno.', 'error', true);
      });

      this.p2pHostConn.on('error', (err) => {
        console.warn('[P2P Client Conn Error]', err);
        if (waitingModal) waitingModal.style.display = 'none';
        this.showNetStatus('Nelze se spojit s hostitelem. Zkontroluj kód a zda je hostitel ve hře.', 'error', true);
      });
    });

    this.peer.on('error', (err) => {
      console.warn('[P2P Client Peer Error]', err);
      if (waitingModal) waitingModal.style.display = 'none';
      this.showNetStatus('Chyba spojení s přítelem: ' + err.message, 'error', true);
    });
  }

  // ===========================================================================
  // 4. MULTIPLAYER – WebSocket Spojení se Serverem
  // ===========================================================================
  connectToServer(address) {
    let raw = (address || '').trim();
    let cleanHost = raw.replace(/^(ws:\/\/|wss:\/\/|http:\/\/|https:\/\/)/i, '').replace(/\/+$/, '');
    
    if (!cleanHost.includes(':')) {
      cleanHost += ':3000';
    }

    const isHttps = window.location.protocol === 'https:';
    const wsUrl = (isHttps ? 'wss://' : 'ws://') + cleanHost;
    let hasConnected = false;

    this.showNetStatus(`Připojuji se k ${wsUrl}…`, 'connecting');

    try {
      this.socket = new WebSocket(wsUrl);
    } catch (e) {
      this.showNetStatus(`Chyba syntaxe adresy: ${e.message}`, 'error', true);
      return;
    }

    this.socket.onopen = () => {
      hasConnected = true;
      this.connected = true;
      this.showNetStatus(`Připojeno k serveru! Ověřuji hráče…`, 'success');

      const nickname = (typeof getPlayerNickname === 'function') ? getPlayerNickname() : 'Hráč';
      const skin = this.getLocalPlayerSkin();
      const equipment = this.getLocalEquippedMap();

      this.send({
        type: 'join',
        nickname: nickname,
        skin: skin,
        equipment: equipment
      });

      this.syncTimer = setInterval(() => {
        this.sendPlayerTransform();
      }, 50);
    };

    this.socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        this.handleServerMessage(msg);
      } catch (err) {
        console.error('[Net] Chyba zpracování zprávy ze serveru:', err);
      }
    };

    this.socket.onclose = () => {
      this.connected = false;
      if (this.syncTimer) clearInterval(this.syncTimer);

      if (!hasConnected) {
        let detail = `Nelze se spojit se serverem na "${cleanHost}".`;
        if (isHttps) {
          detail += ' Prohlížeč blokuje spojení z HTTPS na lokální ws:// server. Otevři hru z http:// nebo lokálně ze souboru index.html.';
        } else {
          detail += ' Zkontroluj, zda jsi na stejné Wi-Fi síti a zda jsi zadal správnou IP s portem :3000.';
        }
        this.showNetStatus(detail, 'error', true);
      } else {
        this.showNetStatus('Spojení se serverem bylo ukončeno.', 'error', true);
      }

      if (typeof addChatMessage === 'function') {
        addChatMessage('Systém', 'Byl jsi odpojen od serveru.', 'error');
      }
    };

    this.socket.onerror = (err) => {
      console.warn('[Net] WebSocket chyba spojení:', err);
    };
  }

  // Odesílání zpráv (přes WebSocket nebo P2P)
  send(obj) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(obj));
    } else if (this.p2pHostConn && this.p2pHostConn.open) {
      this.p2pHostConn.send(obj);
    } else if (this.isP2PHost) {
      this.broadcastP2P(obj);
    }
  }

  sendPlayerTransform() {
    if (!this.connected || typeof P === 'undefined') return;

    this.send({
      type: 'move',
      x: P.x,
      y: P.y,
      z: P.z,
      yaw: typeof yaw !== 'undefined' ? yaw : 0,
      pitch: typeof pitch !== 'undefined' ? pitch : 0,
      heldItem: typeof heldId !== 'undefined' ? heldId : null,
      isRolling: typeof isRolling !== 'undefined' ? isRolling : false,
      attacking: typeof attacking !== 'undefined' ? attacking : false
    });
  }

  // Společné zpracování zpráv (ze serveru i z P2P)
  handleServerMessage(msg) {
    switch (msg.type) {
      case 'init':
        this.connected = true;
        this.playerId = msg.playerId;
        this.isOp = !!msg.isOp;
        this.hideNetStatus();

        // Skrýt čekací modal po schválení hostitelem
        const waitingModal = document.getElementById('p2pWaitingModal');
        if (waitingModal) {
          waitingModal.style.display = 'none';
          waitingModal.hidden = true;
        }

        if (typeof addChatMessage === 'function') {
          addChatMessage('Systém', `Vítej ve světě "${msg.serverName}"! ${msg.isOp ? '👑 Máš práva operátora (OP).' : ''}`, 'info');
        }
        if (typeof toast === 'function') {
          toast('Připojení schváleno! Vítej ve světě.');
        }

        if (msg.worldDeltas) {
          this.worldDeltas = Object.assign({}, msg.worldDeltas);
          this.applyWorldDeltas();
        }

        if (Array.isArray(msg.players)) {
          msg.players.forEach(p => this.spawnRemotePlayer(p));
        }

        // Kontrola, aby hráč při připojení nespawnul ve vodě
        if (typeof P !== 'undefined') {
          const pbx = Math.floor(P.x / S);
          const pbz = Math.floor(P.z / S);
          const sh = (typeof height === 'function') ? height(pbx, pbz) : 80;
          if (P.y <= (SEA + 1) * S || sh < SEA + 2) {
            if (typeof findSafeSpawnCoords === 'function') {
              const safe = findSafeSpawnCoords();
              P.x = safe.x; P.y = safe.y; P.z = safe.z;
              P.vx = 0; P.vy = 0; P.vz = 0;
            }
          }
        }

        // Pokud jsme P2P klient, spustit odesílání polohy
        if (this.p2pHostConn && !this.syncTimer) {
          this.syncTimer = setInterval(() => this.sendPlayerTransform(), 50);
        }
        break;

      case 'playerJoin':
        if (msg.player && msg.player.id !== this.playerId) {
          this.spawnRemotePlayer(msg.player);
        }
        break;

      case 'playerMove':
        if (msg.id !== this.playerId) {
          this.updateRemotePlayer(msg);
        }
        break;

      case 'playerLeave':
        this.removeRemotePlayer(msg.id);
        break;

      case 'blockChange':
        this.onRemoteBlockChange(msg.x, msg.y, msg.z, msg.blockType);
        break;

      case 'chat':
        if (typeof addChatMessage === 'function') {
          const myNick = (typeof getPlayerNickname === 'function') ? getPlayerNickname() : '';
          const senderClean = (msg.sender || '').replace(/^👑\s*/, '').trim();
          if (!msg.isSystem && myNick && senderClean.toLowerCase() === myNick.toLowerCase()) {
            break;
          }
          const type = msg.isSystem ? 'system' : 'user';
          const prefix = msg.isOp ? '👑 ' : '';
          addChatMessage(prefix + msg.sender, msg.text, type);
        }
        break;

      case 'teleport':
        if (typeof P !== 'undefined') {
          P.x = msg.x;
          P.y = msg.y;
          P.z = msg.z;
          P.vx = 0; P.vy = 0; P.vz = 0;
          if (typeof toast === 'function') toast('Byl jsi teleportován!');
        }
        break;
    }
  }

  // ===========================================================================
  // 5. Vykreslování Ostatních Hráčů ve Světě (3D Three.js Rig & Nametag)
  // ===========================================================================
  spawnRemotePlayer(playerData) {
    if (this.remotePlayers.has(playerData.id)) return;
    if (typeof scene === 'undefined' || typeof createCharacterRig === 'undefined') return;

    const rig = createCharacterRig();
    const group = rig.root;

    // Bezpečný vzhled postavy bez chybějících částí těla (žádný bílý objekt!)
    const fallbackCustom = (typeof DEFAULT_CUSTOM !== 'undefined') ? DEFAULT_CUSTOM : {
      skinColor: '#f5cfb3',
      hairStyle: 'short',
      hairColor: '#3e271a',
      eyeColor: '#2980b9',
      facialHair: 'none',
      underwearColor: '#23395d',
      underwearStyle: 'boxers'
    };
    const custom = Object.assign({}, fallbackCustom, playerData.skin || {});
    const eqMap = playerData.equipment || {};

    // Oficiální generátor kompletní postavy z character.js
    if (typeof updateCharacterRig === 'function') {
      updateCharacterRig(rig, custom, eqMap);
    }

    // Jmenovka nad hlavou hráče
    const nametag = this.createNametagSprite(playerData.nickname || 'Hráč', playerData.isOp);
    nametag.position.set(0, 2.3, 0);
    group.add(nametag);

    group.position.set(playerData.x || 0, playerData.y || 80, playerData.z || 0);
    scene.add(group);

    this.remotePlayers.set(playerData.id, {
      id: playerData.id,
      nickname: playerData.nickname || 'Hráč',
      group: group,
      rig: rig,
      nametag: nametag,
      targetX: playerData.x || 0,
      targetY: playerData.y || 80,
      targetZ: playerData.z || 0,
      targetYaw: playerData.yaw || 0,
      targetPitch: playerData.pitch || 0,
      phase: 0
    });
  }

  createNametagSprite(name, isOp = false) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    // Bezpečné vykreslení štítku
    ctx.fillStyle = 'rgba(10, 15, 25, 0.78)';
    if (typeof ctx.roundRect === 'function') {
      ctx.beginPath();
      ctx.roundRect(10, 12, 236, 40, 10);
      ctx.fill();
      ctx.strokeStyle = isOp ? 'rgba(251, 191, 36, 0.85)' : 'rgba(56, 189, 248, 0.6)';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else {
      ctx.fillRect(10, 12, 236, 40);
      ctx.strokeStyle = isOp ? '#fbbf24' : '#38bdf8';
      ctx.lineWidth = 2;
      ctx.strokeRect(10, 12, 236, 40);
    }

    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isOp ? '#fbbf24' : '#ffffff';
    const label = (isOp ? '👑 ' : '') + name;
    ctx.fillText(label, 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    texture.minFilter = THREE.LinearFilter;
    const mat = new THREE.SpriteMaterial({
      map: texture,
      depthTest: true,
      depthWrite: false,
      transparent: true
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(1.8, 0.45, 1);
    return sprite;
  }

  updateRemotePlayer(data) {
    const p = this.remotePlayers.get(data.id);
    if (!p) return;

    p.targetX = data.x;
    p.targetY = data.y;
    p.targetZ = data.z;
    p.targetYaw = data.yaw;
    p.targetPitch = data.pitch;
    p.heldItem = data.heldItem;
  }

  removeRemotePlayer(id) {
    const p = this.remotePlayers.get(id);
    if (p && typeof scene !== 'undefined') {
      scene.remove(p.group);
      this.remotePlayers.delete(id);
    }
  }

  updateAllRemotePlayers(dt) {
    if (this.remotePlayers.size === 0) return;

    for (const [, p] of this.remotePlayers) {
      const g = p.group;
      const dx = p.targetX - g.position.x;
      const dy = p.targetY - g.position.y;
      const dz = p.targetZ - g.position.z;
      const dist = Math.hypot(dx, dz);

      g.position.x += dx * Math.min(1, dt * 14);
      g.position.y += dy * Math.min(1, dt * 14);
      g.position.z += dz * Math.min(1, dt * 14);
      g.rotation.y = p.targetYaw;

      if (p.rig && p.rig.arms && p.rig.legs) {
        if (dist > 0.04) {
          p.phase += dt * 12;
          const armSwing = Math.sin(p.phase) * 0.7;
          const legSwing = Math.sin(p.phase) * 0.8;
          p.rig.arms[0].rotation.x = armSwing;
          p.rig.arms[1].rotation.x = -armSwing;
          p.rig.legs[0].rotation.x = -legSwing;
          p.rig.legs[1].rotation.x = legSwing;
        } else {
          p.rig.arms[0].rotation.x *= 0.85;
          p.rig.arms[1].rotation.x *= 0.85;
          p.rig.legs[0].rotation.x *= 0.85;
          p.rig.legs[1].rotation.x *= 0.85;
        }
      }
    }
  }

  // ===========================================================================
  // 6. Synchronizace Bloků a Chatu
  // ===========================================================================
  modifyBlock(x, y, z, blockType) {
    const key = `${x},${y},${z}`;
    this.worldDeltas[key] = blockType;
    this.applySingleBlock(x, y, z, blockType);

    this.send({
      type: 'blockChange',
      x: x,
      y: y,
      z: z,
      blockType: blockType
    });
  }

  onRemoteBlockChange(x, y, z, blockType) {
    const key = `${x},${y},${z}`;
    this.worldDeltas[key] = blockType;
    this.applySingleBlock(x, y, z, blockType);
  }

  applySingleBlock(x, y, z, blockType) {
    if (typeof getChunk === 'undefined' || typeof CS === 'undefined') return;
    const cx = x >> 4, cz = z >> 4;
    const k = cx + ',' + cz;
    if (typeof chunks !== 'undefined' && chunks.has(k)) {
      const c = chunks.get(k);
      const lx = x & 15, lz = z & 15;
      if (y >= 0 && y < c.H) {
        c.d[lx + lz * CS + y * 256] = blockType;
        if (typeof dispose === 'function' && typeof buildMesh === 'function') {
          dispose(c);
          buildMesh(c);
        }
      }
    }
  }

  applyWorldDeltas() {
    if (!this.worldDeltas) return;
    for (const key of Object.keys(this.worldDeltas)) {
      const [x, y, z] = key.split(',').map(Number);
      this.applySingleBlock(x, y, z, this.worldDeltas[key]);
    }
  }

  sendChatMessage(text) {
    if (this.connected) {
      const nick = (typeof getPlayerNickname === 'function') ? getPlayerNickname() : 'Hráč';
      this.send({
        type: 'chat',
        sender: nick,
        text: text
      });
      return true;
    }
    return false;
  }

  // ===========================================================================
  // 7. Event listenery tlačítek v rozhraní
  // ===========================================================================
  bindP2PUI() {
    window.addEventListener('DOMContentLoaded', () => {
      // 1. Tlačítko v pauza menu (ESC)
      const escP2PBtn = document.getElementById('escOpenP2P');
      if (escP2PBtn) {
        escP2PBtn.onclick = () => {
          if (typeof closeEscMenu === 'function') closeEscMenu();
          this.openP2PHostDialog();
        };
      }

      // 2. Zavření P2P modálu
      const p2pClose = document.getElementById('p2pClose');
      if (p2pClose) {
        p2pClose.onclick = () => {
          const m = document.getElementById('p2pModal');
          if (m) m.hidden = true;
        };
      }

      // 3. Kopírování kódu do schránky
      const copyBtn = document.getElementById('p2pCopyCodeBtn');
      if (copyBtn) {
        copyBtn.onclick = () => {
          if (this.p2pRoomCode && navigator.clipboard) {
            navigator.clipboard.writeText(this.p2pRoomCode);
            if (typeof toast === 'function') toast('Kód zkopírován do schránky!');
          }
        };
      }

      // 4. Schválení / Odmítnutí příchozího hráče
      const acceptBtn = document.getElementById('p2pAcceptBtn');
      if (acceptBtn) acceptBtn.onclick = () => this.acceptPendingP2P();

      const rejectBtn = document.getElementById('p2pRejectBtn');
      if (rejectBtn) rejectBtn.onclick = () => this.rejectPendingP2P();
    });
  }

  escape(str) {
    if (typeof str !== 'string') return String(str);
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  showNetStatus(msg, type = 'connecting', showHomeBtn = false) {
    let el = document.getElementById('netStatusBanner');
    if (!el) {
      el = document.createElement('div');
      el.id = 'netStatusBanner';
      el.style.cssText = `
        position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
        padding: 12px 24px; border-radius: 99px; font-family: 'Outfit', sans-serif;
        font-weight: 700; font-size: 14px; z-index: 99999; display: flex; align-items: center; gap: 12px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.6); backdrop-filter: blur(12px);
      `;
      document.body.appendChild(el);
    }

    if (type === 'connecting') {
      el.style.background = 'rgba(15, 23, 42, 0.85)';
      el.style.border = '1px solid rgba(56, 189, 248, 0.4)';
      el.style.color = '#38bdf8';
      el.innerHTML = `<span>⏳</span> <span>${msg}</span>`;
    } else if (type === 'success') {
      el.style.background = 'rgba(6, 78, 59, 0.85)';
      el.style.border = '1px solid rgba(16, 185, 129, 0.5)';
      el.style.color = '#34d399';
      el.innerHTML = `<span>✔</span> <span>${msg}</span>`;
      setTimeout(() => this.hideNetStatus(), 2500);
    } else if (type === 'error') {
      el.style.background = 'rgba(69, 10, 10, 0.9)';
      el.style.border = '1px solid rgba(239, 68, 68, 0.5)';
      el.style.color = '#fca5a5';
      el.innerHTML = `<span>⚠</span> <span>${msg}</span> ${showHomeBtn ? '<button onclick="window.location.replace(\'../index.html\')" style="margin-left:8px;padding:4px 10px;background:#ef4444;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:bold;">Zpět do menu</button>' : ''}`;
    }
  }

  hideNetStatus() {
    const el = document.getElementById('netStatusBanner');
    if (el) el.remove();
  }
}

window.networkManager = new NetworkManager();
