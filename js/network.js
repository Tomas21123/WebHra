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

    // Podpora URL parametru ?p2p=VOX-XXXX
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const p2pParam = urlParams.get('p2p');
      if (p2pParam) {
        const fullCode = p2pParam.toUpperCase().startsWith('VOX-') ? p2pParam.toUpperCase() : `VOX-${p2pParam}`;
        this.activeGame = {
          mode: 'p2p_client',
          p2pRoomCode: fullCode,
          serverName: `P2P Svět (${fullCode})`
        };
        if (typeof GameStorage !== 'undefined') {
          GameStorage.setActiveGame(this.activeGame);
        }
      }
    } catch(e) {}

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
                const safe = findSafeSpawnCoords(pbx, pbz);
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

    // Automaticky připravit P2P hostitelský kanál na pozadí se stálým kódem tohoto světa
    this.startP2PHost();
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
  
  // Hostitel: Otevření dialogu se stálým kódem světa
  openP2PHostDialog() {
    const modal = document.getElementById('p2pModal');
    if (!modal) return;

    if (!this.isP2PHost || !this.peer || this.peer.destroyed) {
      this.startP2PHost();
    }

    const display = document.getElementById('p2pRoomCodeDisplay');
    if (display && this.p2pRoomCode) display.textContent = this.p2pRoomCode;

    modal.hidden = false;
    this.updateP2PPlayerCount();
  }

  startP2PHost() {
    if (typeof Peer === 'undefined') {
      console.warn('[P2P Host] Knihovna PeerJS není načtena.');
      return;
    }
    if (this.peer && !this.peer.destroyed) {
      // Již aktivní
      return;
    }

    const worldId = this.activeGame?.worldId || 'world_default';
    this.p2pRoomCode = (typeof GameStorage !== 'undefined') ? GameStorage.getP2PRoomCode(worldId) : 'VOX-7429';
    const cleanNum = this.p2pRoomCode.replace(/[^0-9]/g, '');
    const peerId = `vox-world-${cleanNum}`;

    console.log(`[P2P Host] Registruji Peer hostitele: ID ${peerId} (kód: ${this.p2pRoomCode})`);

    const PEER_CONFIG = {
      debug: 1,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' }
        ]
      }
    };

    try {
      this.peer = new Peer(peerId, PEER_CONFIG);
    } catch (e) {
      console.warn('[P2P Host] Chyba vytvoření peer instance:', e);
      return;
    }

    this.peer.on('open', (id) => {
      this.isP2PHost = true;
      this.connected = true;
      console.log(`[P2P Host] Připraven přijímat přátele s ID: ${id}`);

      const display = document.getElementById('p2pRoomCodeDisplay');
      if (display) display.textContent = this.p2pRoomCode;

      if (!this.syncTimer) {
        this.syncTimer = setInterval(() => this.sendPlayerTransform(), 50);
      }
    });

    // Příchozí WebRTC spojení od přítele
    this.peer.on('connection', (conn) => {
      console.log('[P2P Host] Příchozí WebRTC připojení od:', conn.peer);

      conn.on('data', (data) => {
        console.log('[P2P Host] Přijata zpráva od klienta:', data.type);
        if (data.type === 'joinRequest') {
          // Zobrazit žádost o schválení vstupu (klient zatím NEVSTUPUJE do světa!)
          this.promptJoinRequest(conn, data);
        } else {
          // Zpracovat herní zprávy POUZE pro již schválené klienty!
          if (this.p2pClients.has(conn.peer)) {
            this.handleP2PClientMessage(conn, data);
          }
        }
      });

      conn.on('close', () => {
        console.log('[P2P Host] Klient odpojen:', conn.peer);
        this.p2pClients.delete(conn.peer);
        this.removeRemotePlayer(conn.peer);
        this.updateP2PPlayerCount();
        if (typeof addChatMessage === 'function') {
          addChatMessage('Systém', `Hráč opustil svět.`, 'system');
        }
      });

      conn.on('error', (err) => {
        console.warn('[P2P Host Conn Error]', err);
      });
    });

    this.peer.on('error', (err) => {
      console.warn('[P2P Host Error]', err);
      if (err.type === 'unavailable-id') {
        console.warn('[P2P Host] Kód je obsazen nebo předchozí relace ještě nevypršela. Obnovuji kód světa...');
        const newNum = Math.floor(1000 + Math.random() * 9000);
        this.p2pRoomCode = `VOX-${newNum}`;
        if (typeof GameStorage !== 'undefined') {
          const w = GameStorage.getWorld(worldId);
          if (w) {
            w.p2pCode = newNum;
            GameStorage.saveWorlds(GameStorage.getWorlds());
          }
        }
        setTimeout(() => this.startP2PHost(), 800);
      }
    });

    this.peer.on('disconnected', () => {
      console.log('[P2P Host] Odpojeno od PeerJS brokera, obnovuji spojení...');
      if (this.peer && !this.peer.destroyed) {
        this.peer.reconnect();
      }
    });
  }

  // Zobrazení žádosti o připojení hostiteli
  promptJoinRequest(conn, data) {
    // Pokud je již schválen, jen znovu odešleme init data
    if (this.p2pClients.has(conn.peer)) {
      this.sendInitToClient(conn);
      return;
    }

    this.pendingP2PConn = { conn, data };

    // Uvolnit pointer lock kurzoru, aby hostitel mohl okamžitě kliknout myší
    if (document.exitPointerLock) {
      try { document.exitPointerLock(); } catch(e) {}
    }

    const popup = document.getElementById('p2pRequestPopup');
    const text = document.getElementById('p2pRequestText');
    if (popup && text) {
      text.innerHTML = `
        <div style="font-size:16px;font-weight:800;color:#34d399;margin-bottom:4px;">
          ${this.escape(data.nickname || 'Přítel')}
        </div>
        <div style="font-size:13.5px;color:#e2e8f0;line-height:1.45;">
          žádá o připojení do tvého světa.
        </div>
        <div style="font-size:11.5px;color:#94a3b8;margin-top:8px;background:rgba(255,255,255,0.06);padding:4px 8px;border-radius:6px;">
          ⌨ Stiskni <strong>[Y]</strong> pro povolení nebo <strong>[N]</strong> pro odmítnutí
        </div>
      `;
      popup.style.display = 'block';
      popup.style.zIndex = '9999999';
    }

    if (typeof playClickSound === 'function') playClickSound();

    if (typeof addChatMessage === 'function') {
      addChatMessage('Systém', `🔔 Hráč "${data.nickname || 'Přítel'}" poslal žádost o připojení! Klikni na [Povolit] na obrazovce nebo stiskni [Y].`, 'system');
    }
    if (typeof toast === 'function') {
      toast(`Žádost o připojení: ${data.nickname || 'Hráč'}`);
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

    // Odeslat klientovi potvrzení, seed a existující svět
    this.sendInitToClient(conn);

    // Vytvořit model hráče u hostitele
    this.spawnRemotePlayer({
      id: conn.peer,
      nickname: data.nickname || 'Hráč',
      skin: data.skin || {},
      equipment: data.equipment || {},
      x: P.x + 1.5, y: P.y + 0.2, z: P.z + 1.5,
      isOp: false
    });

    // Ujistit se, že hostitel odesílá svou polohu všem klientům každých 50ms
    if (!this.syncTimer) {
      this.syncTimer = setInterval(() => this.sendPlayerTransform(), 50);
    }

    // Upozornit ostatní klienty o novém hráči
    this.broadcastP2P({
      type: 'playerJoin',
      player: {
        id: conn.peer,
        nickname: data.nickname || 'Hráč',
        skin: data.skin || {},
        equipment: data.equipment || {},
        x: P.x + 1.5, y: P.y + 0.2, z: P.z + 1.5,
        isOp: false
      }
    }, conn.peer);

    this.updateP2PPlayerCount();

    if (typeof addChatMessage === 'function') {
      addChatMessage('Systém', `Hráč ${data.nickname || 'Přítel'} vstoupil do tvého světa!`, 'system');
    }
    if (typeof toast === 'function') {
      toast(`Hráč ${data.nickname} se připojil.`);
    }
  }

  sendInitToClient(conn) {
    const hostNick = (typeof getPlayerNickname === 'function') ? getPlayerNickname() : 'Hostitel';
    let currentSeed = 12345;
    if (typeof SEED !== 'undefined' && SEED) {
      currentSeed = SEED;
    } else if (this.activeGame && this.activeGame.seed) {
      currentSeed = parseInt(this.activeGame.seed);
    } else if (this.activeGame && this.activeGame.worldId && typeof GameStorage !== 'undefined') {
      const w = GameStorage.getWorld(this.activeGame.worldId);
      if (w && w.seed) currentSeed = parseInt(w.seed);
    }

    console.log(`[P2P Host] Odesílám init klientovi: Seed=${currentSeed}, Hráč=${hostNick}, Pos=(${P.x.toFixed(1)}, ${P.y.toFixed(1)}, ${P.z.toFixed(1)}), Bloků=${Object.keys(this.worldDeltas).length}`);

    conn.send({
      type: 'init',
      playerId: conn.peer,
      serverName: `Svět hráče ${hostNick}`,
      seed: currentSeed,
      isOp: false,
      worldDeltas: this.worldDeltas,
      players: [
        {
          id: 'host',
          nickname: hostNick,
          isOp: true,
          x: P.x, y: P.y, z: P.z,
          bodyYaw: (typeof model !== 'undefined') ? model.rotation.y : ((typeof face !== 'undefined') ? face : 0),
          yaw: typeof yaw !== 'undefined' ? yaw : 0,
          pitch: typeof pitch !== 'undefined' ? pitch : 0,
          emote: (typeof currentEmote !== 'undefined') ? currentEmote : null,
          skin: this.getLocalPlayerSkin(),
          equipment: this.getLocalEquippedMap()
        }
      ]
    });
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
      const clientData = Object.assign({ id: conn.peer }, msg);
      this.updateRemotePlayer(clientData);
      this.broadcastP2P(Object.assign({ type: 'playerMove' }, clientData), conn.peer);
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

    // Zastavit pohyb hráče dokud není schválen
    if (typeof P !== 'undefined') {
      P.moveX = 0; P.moveZ = 0; P.vx = 0; P.vz = 0;
    }

    const targetPeerId = `vox-world-${cleanNum}`;
    this.showNetStatus(`Připojuji se k příteli (${roomCode})…`, 'connecting');

    const statusDetail = document.getElementById('p2pClientStatusDetail');
    if (statusDetail) statusDetail.textContent = `Hledám hostitele (${roomCode})…`;

    const PEER_CONFIG = {
      debug: 1,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' }
        ]
      }
    };

    try {
      this.peer = new Peer(PEER_CONFIG);
    } catch (e) {
      this.showNetStatus(`P2P chyba: ${e.message}`, 'error', true);
      if (statusDetail) statusDetail.textContent = `Chyba P2P: ${e.message}`;
      return;
    }

    this.peer.on('open', (myId) => {
      console.log(`[P2P Client] Peer aktivní s ID: ${myId}. Spojuji se s: ${targetPeerId}`);
      if (statusDetail) statusDetail.textContent = `Navazuji spojení s hostitelem ${roomCode}…`;

      this.p2pHostConn = this.peer.connect(targetPeerId, { reliable: true });

      const sendJoin = () => {
        if (this.approved) {
          if (this.joinRetryTimer) clearInterval(this.joinRetryTimer);
          return;
        }
        if (this.p2pHostConn && this.p2pHostConn.open) {
          console.log('[P2P Client] Odesílám joinRequest...');
          const nickname = (typeof getPlayerNickname === 'function') ? getPlayerNickname() : 'Hráč';
          this.p2pHostConn.send({
            type: 'joinRequest',
            nickname: nickname,
            skin: this.getLocalPlayerSkin(),
            equipment: this.getLocalEquippedMap()
          });
          if (statusDetail) statusDetail.textContent = 'Žádost odeslána. Čekám na schválení hostitelem…';
        }
      };

      this.p2pHostConn.on('open', () => {
        console.log('[P2P Client] WebRTC kanál s hostitelem OTEVŘEN!');
        sendJoin();
        // Pravidelné opakování žádosti každých 1.5s pro jistotu spolehlivého doručení
        if (this.joinRetryTimer) clearInterval(this.joinRetryTimer);
        this.joinRetryTimer = setInterval(sendJoin, 1500);
      });

      this.p2pHostConn.on('data', (msg) => {
        console.log('[P2P Client] Přijata zpráva od hostitele:', msg.type);
        if (msg.type === 'rejected') {
          if (this.joinRetryTimer) clearInterval(this.joinRetryTimer);
          alert(msg.message || 'Hostitel odmítl žádost o připojení.');
          window.location.replace('../index.html');
          return;
        }
        if (msg.type === 'init') {
          if (this.joinRetryTimer) clearInterval(this.joinRetryTimer);
          this.approved = true;
          if (statusDetail) statusDetail.textContent = 'Vstup schválen! Generuji svět…';
        }
        this.handleServerMessage(msg);
      });

      this.p2pHostConn.on('close', () => {
        this.connected = false;
        if (this.joinRetryTimer) clearInterval(this.joinRetryTimer);
        if (this.syncTimer) clearInterval(this.syncTimer);
        this.showNetStatus('Spojení s hostitelem bylo ukončeno.', 'error', true);
      });

      this.p2pHostConn.on('error', (err) => {
        console.warn('[P2P Client Conn Error]', err);
      });
    });

    this.peer.on('error', (err) => {
      console.warn('[P2P Client Peer Error]', err);
      if (this.joinRetryTimer) clearInterval(this.joinRetryTimer);

      if (err.type === 'peer-unavailable') {
        if (statusDetail) {
          statusDetail.innerHTML = `
            <span style="color:#f87171;font-weight:700;">Hostitel s kódem ${roomCode} není online.</span><br>
            <span style="color:#94a3b8;font-size:12px;">Ujisti se, že hostitel má spuštěný svět a kód je správný.</span>
          `;
        }
        this.showNetStatus(`Hostitel ${roomCode} nebyl nalezen. Zkontroluj kód.`, 'error', true);
      } else {
        if (statusDetail) statusDetail.textContent = `Chyba spojení: ${err.message}`;
        this.showNetStatus(`Chyba spojení: ${err.message}`, 'error', true);
      }
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

    const currentBodyYaw = (typeof model !== 'undefined') ? model.rotation.y : ((typeof face !== 'undefined') ? face : 0);
    const activeEmote = (typeof currentEmote !== 'undefined') ? currentEmote : null;
    const isSpr = (typeof isSprinting !== 'undefined') ? !!isSprinting : false;
    const isFwdSpr = !!(isSpr && (P.moveZ || 0) > 0.1 && P.ground);
    const isRoll = (typeof isRolling !== 'undefined') ? !!isRolling : false;
    const rTimer = (typeof rollTimer !== 'undefined') ? rollTimer : 0;
    const isAtk = (typeof attacking !== 'undefined') ? !!attacking : false;
    const aTime = (typeof attackTime !== 'undefined') ? attackTime : 0;
    const aDur = (typeof attackDuration !== 'undefined') ? attackDuration : 0.26;
    const aCombo = (typeof attackCombo !== 'undefined') ? attackCombo : 0;
    const hId = (typeof heldId !== 'undefined') ? heldId : null;

    const payload = {
      x: P.x,
      y: P.y,
      z: P.z,
      vx: P.vx || 0,
      vy: P.vy || 0,
      vz: P.vz || 0,
      ground: !!P.ground,
      inWater: !!P.inWater,
      isSprinting: isSpr,
      isForwardSprint: isFwdSpr,
      bodyYaw: currentBodyYaw,
      yaw: typeof yaw !== 'undefined' ? yaw : 0,
      pitch: typeof pitch !== 'undefined' ? pitch : 0,
      emote: activeEmote,
      heldItem: hId,
      isRolling: isRoll,
      rollTimer: rTimer,
      attacking: isAtk,
      attackTime: aTime,
      attackDuration: aDur,
      attackCombo: aCombo
    };

    if (this.isP2PHost) {
      // Host odesílá svou polohu s id: 'host' a type: 'playerMove' všem připojeným klientům
      this.broadcastP2P(Object.assign({ type: 'playerMove', id: 'host' }, payload));
      return;
    }

    // Klient posílá move na server nebo hostiteli
    this.send(Object.assign({ type: 'move' }, payload));
  }

  // Společné zpracování zpráv (ze serveru i z P2P)
  handleServerMessage(msg) {
    switch (msg.type) {
      case 'init':
        this.connected = true;
        this.approved = true;
        this.playerId = msg.playerId;
        this.isOp = !!msg.isOp;
        this.hideNetStatus();

        if (msg.worldDeltas) {
          this.worldDeltas = Object.assign({}, msg.worldDeltas);
        }

        // 1. Spustit generování světa u klienta se správným seedem hostitele, deltas a polohou u hostitele
        if (typeof window.approveP2PJoin === 'function' && msg.seed) {
          window.approveP2PJoin(msg.seed, this.worldDeltas, msg.players);
        }

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
          this.applyWorldDeltas();
        }

        if (Array.isArray(msg.players)) {
          msg.players.forEach(p => {
            if (p.id !== this.playerId && p.id !== 'self') {
              this.spawnRemotePlayer(p);
            }
          });

          // Teleportovat klienta přímo k hostiteli
          const host = msg.players.find(p => p.id === 'host') || msg.players[0];
          if (host && typeof host.x === 'number' && typeof P !== 'undefined') {
            P.x = host.x + 1.5;
            P.z = host.z + 1.5;
            const pbx = Math.floor(P.x / S);
            const pbz = Math.floor(P.z / S);
            const terrainH = (typeof height === 'function') ? height(pbx, pbz) : 45;
            P.y = Math.max(host.y + 0.2, (terrainH + 1.5) * S);
            P.vx = 0; P.vy = 0; P.vz = 0;
            if (typeof lastC !== 'undefined') lastC = '';
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
      case 'move':
        const senderId = msg.id || (this.p2pHostConn ? 'host' : null);
        if (senderId && senderId !== this.playerId) {
          this.updateRemotePlayer(Object.assign({}, msg, { id: senderId }));
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

    // Vytvořit sadu zbraní pro ruku vzdáleného hráče
    let remoteWeapons = null;
    if (typeof createWeaponInstances === 'function') {
      remoteWeapons = createWeaponInstances();
      for (const k in remoteWeapons) {
        rig.hand.add(remoteWeapons[k]);
        remoteWeapons[k].visible = (k === (playerData.heldItem || null));
      }
    }

    group.position.set(playerData.x || 0, playerData.y || 80, playerData.z || 0);
    scene.add(group);

    const initialBodyYaw = (typeof playerData.bodyYaw === 'number')
      ? playerData.bodyYaw
      : ((typeof playerData.yaw === 'number') ? Math.atan2(-Math.sin(playerData.yaw), -Math.cos(playerData.yaw)) : 0);
    group.rotation.y = initialBodyYaw;

    this.remotePlayers.set(playerData.id, {
      id: playerData.id,
      nickname: playerData.nickname || 'Hráč',
      group: group,
      rig: rig,
      weapons: remoteWeapons,
      nametag: nametag,
      targetX: playerData.x || 0,
      targetY: playerData.y || 80,
      targetZ: playerData.z || 0,
      targetBodyYaw: initialBodyYaw,
      targetYaw: playerData.yaw || 0,
      targetPitch: playerData.pitch || 0,
      vx: playerData.vx || 0,
      vy: playerData.vy || 0,
      vz: playerData.vz || 0,
      ground: (typeof playerData.ground !== 'undefined') ? !!playerData.ground : true,
      inWater: (typeof playerData.inWater !== 'undefined') ? !!playerData.inWater : false,
      isSprinting: !!playerData.isSprinting,
      isForwardSprint: !!playerData.isForwardSprint,
      heldItem: playerData.heldItem || null,
      isRolling: !!playerData.isRolling,
      rollTimer: playerData.rollTimer || 0,
      attacking: !!playerData.attacking,
      attackTime: playerData.attackTime || 0,
      attackDuration: playerData.attackDuration || 0.26,
      attackCombo: playerData.attackCombo || 0,
      emote: playerData.emote || null,
      emoteTimer: 0,
      phase: 0,
      airPhase: 0,
      airBlend: 0,
      swimBlend: 0,
      narutoBlend: 0,
      bankLean: 0,
      landingSquash: 0,
      wasGround: true,
      lastBodyYaw: initialBodyYaw
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

    if (typeof data.x === 'number') p.targetX = data.x;
    if (typeof data.y === 'number') p.targetY = data.y;
    if (typeof data.z === 'number') p.targetZ = data.z;

    // bodyYaw určuje skutečný směr otočení těla postavy
    if (typeof data.bodyYaw === 'number') {
      p.targetBodyYaw = data.bodyYaw;
    } else if (typeof data.yaw === 'number') {
      p.targetBodyYaw = Math.atan2(-Math.sin(data.yaw), -Math.cos(data.yaw));
    }

    if (typeof data.yaw === 'number') p.targetYaw = data.yaw;
    if (typeof data.pitch === 'number') p.targetPitch = data.pitch;
    if (typeof data.vx === 'number') p.vx = data.vx;
    if (typeof data.vy === 'number') p.vy = data.vy;
    if (typeof data.vz === 'number') p.vz = data.vz;
    if (typeof data.ground !== 'undefined') p.ground = !!data.ground;
    if (typeof data.inWater !== 'undefined') p.inWater = !!data.inWater;
    if (typeof data.isSprinting !== 'undefined') p.isSprinting = !!data.isSprinting;
    if (typeof data.isForwardSprint !== 'undefined') p.isForwardSprint = !!data.isForwardSprint;
    if (typeof data.heldItem !== 'undefined') {
      p.heldItem = data.heldItem;
      if (p.weapons) {
        for (const k in p.weapons) p.weapons[k].visible = (k === p.heldItem);
      }
    }
    if (typeof data.isRolling !== 'undefined') p.isRolling = !!data.isRolling;
    if (typeof data.rollTimer === 'number') p.rollTimer = data.rollTimer;
    if (typeof data.attacking !== 'undefined') p.attacking = !!data.attacking;
    if (typeof data.attackTime === 'number') p.attackTime = data.attackTime;
    if (typeof data.attackDuration === 'number') p.attackDuration = data.attackDuration;
    if (typeof data.attackCombo === 'number') p.attackCombo = data.attackCombo;

    if (typeof data.emote !== 'undefined') {
      if (p.emote !== data.emote) {
        if (!data.emote && p.rig && typeof resetRigEmote === 'function') {
          resetRigEmote(p.rig);
        }
        p.emote = data.emote;
        p.emoteTimer = 0;
      }
    }
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
    const now = performance.now();

    for (const [, p] of this.remotePlayers) {
      const g = p.group;
      const dx = p.targetX - g.position.x;
      const dy = p.targetY - g.position.y;
      const dz = p.targetZ - g.position.z;
      const dist = Math.hypot(dx, dz);

      // Pokud dojde k velkému skoku (teleport, respawn), skočit okamžitě
      if (dist > 30) {
        g.position.x = p.targetX;
        g.position.y = p.targetY;
        g.position.z = p.targetZ;
      } else {
        // Plynulá interpolace všech tří prostorových os X, Y, Z
        const factor = Math.min(1, dt * 14);
        g.position.x += dx * factor;
        g.position.y += dy * factor;
        g.position.z += dz * factor;
      }

      // Plynulá rotace těla podle skutečného směru postavy (bodyYaw)
      const targetBody = (typeof p.targetBodyYaw === 'number') ? p.targetBodyYaw : (p.targetYaw || 0);
      let diffYaw = targetBody - g.rotation.y;
      while (diffYaw < -Math.PI) diffYaw += Math.PI * 2;
      while (diffYaw > Math.PI) diffYaw -= Math.PI * 2;
      g.rotation.y += diffYaw * Math.min(1, dt * 14);

      // Výpočet rychlosti pohybu pro animátor
      const packetMv = Math.hypot(p.vx || 0, p.vz || 0);
      const estMv = dist / Math.max(0.001, dt);
      const animMv = Math.max(packetMv, (dist > 0.04 ? estMv : 0));

      if (p.attacking) {
        p.attackTime = (p.attackTime || 0) + dt;
        if (p.attackTime >= (p.attackDuration || 0.26)) {
          p.attacking = false;
        }
      }
      if (p.isRolling) {
        p.rollTimer = (p.rollTimer || 0) + dt;
        if (p.rollTimer >= 0.55) {
          p.isRolling = false;
        }
      }

      // Příprava stavu pro univerzální animátor postavy
      p.mv = animMv;
      p.bodyYaw = g.rotation.y;
      p.lookYaw = p.targetYaw;
      p.lookPitch = p.targetPitch;
      p.heldId = p.heldItem;

      // Spustit identický univerzální animátor pro model vzdáleného hráče!
      if (typeof animateFullCharacterRig === 'function') {
        animateFullCharacterRig(p.rig, p, dt, now);
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
    const doBind = () => {
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

      // 5. Klávesové zkratky pro hostitele: [Y] / [Z] / [Enter] = schválit, [N] / [Escape] = odmítnout
      window.addEventListener('keydown', (e) => {
        if (!this.pendingP2PConn) return;
        if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
          return;
        }

        if (e.code === 'KeyY' || e.code === 'KeyZ' || e.key === 'y' || e.key === 'Y' || e.key === 'z' || e.key === 'Z' || e.code === 'Enter') {
          e.preventDefault();
          this.acceptPendingP2P();
        } else if (e.code === 'KeyN' || e.key === 'n' || e.key === 'N') {
          e.preventDefault();
          this.rejectPendingP2P();
        }
      });
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', doBind);
    } else {
      doBind();
    }
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
