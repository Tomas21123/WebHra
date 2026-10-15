// =============================================================================
// Voxelový svět – Síťový Klient & Multiplayer Synchronizace (js/network.js)
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

    // Inicializace podle zvoleného herního režimu
    this.init();
  }

  init() {
    if (typeof GameStorage !== 'undefined') {
      this.activeGame = GameStorage.getActiveGame();
    } else {
      this.activeGame = { mode: 'singleplayer' };
    }

    if (this.activeGame.mode === 'multiplayer') {
      this.connectToServer(this.activeGame.serverAddress || 'localhost:3000');
    } else {
      this.initSingleplayer();
    }
  }

  // ===========================================================================
  // 1. SINGLEPLAYER – Ukládání a Načítání
  // ===========================================================================
  initSingleplayer() {
    const worldId = this.activeGame.worldId || 'world_default';
    const savedWorld = GameStorage.getWorld(worldId);

    if (savedWorld) {
      // 1. Aplikace uložených úprav terénu
      if (savedWorld.worldDeltas) {
        this.worldDeltas = Object.assign({}, savedWorld.worldDeltas);
      }

      // 2. Načtení pozice a stavu hráče po načtení hry
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
            if (typeof toast === 'function') {
              toast(`Svět "${savedWorld.name}" načten.`);
            }
          }
        }, 500);
      });
    }

    // Automatické periodické ukládání singleplayeru každých 6 sekund
    this.autoSaveTimer = setInterval(() => {
      this.saveSingleplayerWorld();
    }, 6000);

    // Uložení při zavření okna
    window.addEventListener('beforeunload', () => {
      this.saveSingleplayerWorld();
    });
  }

  saveSingleplayerWorld() {
    if (this.activeGame.mode !== 'singleplayer' || typeof P === 'undefined') return;
    const worldId = this.activeGame.worldId || 'world_default';

    const playerState = {
      x: P.x,
      y: P.y,
      z: P.z,
      yaw: typeof yaw !== 'undefined' ? yaw : 0,
      pitch: typeof pitch !== 'undefined' ? pitch : 0,
      hp: typeof G !== 'undefined' ? G.hp : 100,
      st: typeof G !== 'undefined' ? G.st : 100
    };

    GameStorage.updateWorldData(worldId, playerState, this.worldDeltas);
  }

  // ===========================================================================
  // 2. MULTIPLAYER – WebSocket Spojení se Serverem
  // ===========================================================================
  connectToServer(address) {
    let host = address.trim();
    if (!host.startsWith('ws://') && !host.startsWith('wss://')) {
      const isHttps = window.location.protocol === 'https:';
      host = (isHttps ? 'wss://' : 'ws://') + host;
    }

    this.showNetStatus(`Připojuji se k serveru: ${address}…`, 'connecting');

    try {
      this.socket = new WebSocket(host);
    } catch (e) {
      this.showNetStatus(`Chyba připojení: ${e.message}`, 'error');
      return;
    }

    this.socket.onopen = () => {
      this.connected = true;
      this.showNetStatus(`Připojeno k serveru! Ověřuji hráče…`, 'success');

      // Odeslat Handshake se jménem a skinem
      const nickname = (typeof getPlayerNickname === 'function') ? getPlayerNickname() : 'Hráč';
      const skin = (typeof currentCustomization !== 'undefined') ? currentCustomization : {};

      this.send({
        type: 'join',
        nickname: nickname,
        skin: skin
      });

      // Spustit odesílání polohy hráče (20 ticků za sekundu)
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
      this.showNetStatus('Spojení se serverem bylo ukončeno.', 'error', true);
      if (typeof addChatMessage === 'function') {
        addChatMessage('Systém', 'Byl jsi odpojen od serveru.', 'error');
      }
    };

    this.socket.onerror = (err) => {
      console.warn('[Net] WebSocket chyba:', err);
      this.showNetStatus('Nelze se spojit se serverem. Běží server na zadané adrese?', 'error', true);
    };
  }

  send(obj) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(obj));
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

  // Zpracování zpráv ze serveru
  handleServerMessage(msg) {
    switch (msg.type) {
      case 'init':
        this.playerId = msg.playerId;
        this.isOp = !!msg.isOp;
        this.hideNetStatus();

        if (typeof addChatMessage === 'function') {
          addChatMessage('Systém', `Vítej na serveru "${msg.serverName}"! ${msg.isOp ? '👑 Máš práva operátora (OP).' : ''}`, 'info');
          if (msg.motd) addChatMessage('Server', msg.motd, 'system');
        }

        // Načtení úprav světa ze serveru
        if (msg.worldDeltas) {
          this.worldDeltas = Object.assign({}, msg.worldDeltas);
          this.applyWorldDeltas();
        }

        // Vytvoření stávajících hráčů
        if (Array.isArray(msg.players)) {
          msg.players.forEach(p => this.spawnRemotePlayer(p));
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

      case 'opStatus':
        this.isOp = !!msg.isOp;
        break;

      case 'kicked':
        alert(msg.reason || 'Byl jsi vyhozen ze serveru.');
        window.location.replace('../index.html');
        break;

      case 'serverShutdown':
        alert(msg.message || 'Server byl ukončen.');
        window.location.replace('../index.html');
        break;
    }
  }

  // ===========================================================================
  // 3. Vykreslování Ostatních Hráčů ve Světě (3D Three.js Rig & Nametag)
  // ===========================================================================
  spawnRemotePlayer(playerData) {
    if (this.remotePlayers.has(playerData.id)) return;
    if (typeof scene === 'undefined' || typeof createCharacterRig === 'undefined') return;

    // Vytvoření 3D kostry postavy
    const rig = createCharacterRig();
    const group = rig.root;

    // Vytvoření voxelového vzhledu postavy
    const custom = playerData.skin || {};
    const voxels = generateCharacterVoxels(custom, {});

    setVoxGroupMesh(rig.torso, voxels.torso, 0, 8, 0, true);
    setVoxGroupMesh(rig.head, voxels.head, 0, 16, 0, true);
    setVoxGroupMesh(rig.legs[0], voxels.legL, -2.1, 7, 0, true);
    setVoxGroupMesh(rig.legs[1], voxels.legR, 2.1, 7, 0, true);
    setVoxGroupMesh(rig.arms[0], voxels.armL, -5.3, 14, 0, true);
    setVoxGroupMesh(rig.arms[1], voxels.armR, 5.3, 14, 0, true);

    // Přidání zbraní do ruky
    if (typeof attachWeaponsToHand === 'function') {
      attachWeaponsToHand(rig.hand);
    }

    // Jmenovka hráče nad hlavou (3D Canvas Sprite)
    const nametag = this.createNametagSprite(playerData.nickname, playerData.isOp);
    nametag.position.set(0, 2.2, 0);
    group.add(nametag);

    // Počáteční pozice
    group.position.set(playerData.x || 0, playerData.y || 80, playerData.z || 0);
    scene.add(group);

    this.remotePlayers.set(playerData.id, {
      id: playerData.id,
      nickname: playerData.nickname,
      group: group,
      rig: rig,
      nametag: nametag,
      targetX: playerData.x || 0,
      targetY: playerData.y || 80,
      targetZ: playerData.z || 0,
      targetYaw: playerData.yaw || 0,
      targetPitch: playerData.pitch || 0,
      phase: 0,
      isMoving: false
    });
  }

  // Tvorba plovoucí jmenovky nad hlavou hráče
  createNametagSprite(name, isOp = false) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    // Poloprůhledné zaoblené pozadí
    ctx.fillStyle = 'rgba(10, 15, 25, 0.75)';
    ctx.beginPath();
    ctx.roundRect(10, 12, 236, 40, 12);
    ctx.fill();
    ctx.strokeStyle = isOp ? 'rgba(251, 191, 36, 0.8)' : 'rgba(56, 189, 248, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Text nicku
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isOp ? '#fbbf24' : '#ffffff';
    const label = (isOp ? '👑 ' : '') + name;
    ctx.fillText(label, 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const mat = new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true });
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
    p.isRolling = !!data.isRolling;
    p.attacking = !!data.attacking;
  }

  removeRemotePlayer(id) {
    const p = this.remotePlayers.get(id);
    if (p && typeof scene !== 'undefined') {
      scene.remove(p.group);
      this.remotePlayers.delete(id);
    }
  }

  // Interpolace pohybu a animací ostatních hráčů (voláno v game loopu)
  updateAllRemotePlayers(dt) {
    if (this.remotePlayers.size === 0) return;

    for (const [, p] of this.remotePlayers) {
      const g = p.group;
      const dx = p.targetX - g.position.x;
      const dy = p.targetY - g.position.y;
      const dz = p.targetZ - g.position.z;
      const dist = Math.hypot(dx, dz);

      // Plynulý posun (Lerp) k cílové pozici
      g.position.x += dx * Math.min(1, dt * 14);
      g.position.y += dy * Math.min(1, dt * 14);
      g.position.z += dz * Math.min(1, dt * 14);

      // Rotace těla
      g.rotation.y = p.targetYaw;

      // Animace chůze/běhu končetin
      if (dist > 0.04) {
        p.phase += dt * 12;
        const armSwing = Math.sin(p.phase) * 0.7;
        const legSwing = Math.sin(p.phase) * 0.8;
        p.rig.arms[0].rotation.x = armSwing;
        p.rig.arms[1].rotation.x = -armSwing;
        p.rig.legs[0].rotation.x = -legSwing;
        p.rig.legs[1].rotation.x = legSwing;
      } else {
        // Návrat do klidové polohy
        p.rig.arms[0].rotation.x *= 0.85;
        p.rig.arms[1].rotation.x *= 0.85;
        p.rig.legs[0].rotation.x *= 0.85;
        p.rig.legs[1].rotation.x *= 0.85;
      }
    }
  }

  // ===========================================================================
  // 4. Synchronizace Bloků a Terénu
  // ===========================================================================
  modifyBlock(x, y, z, blockType) {
    const key = `${x},${y},${z}`;
    this.worldDeltas[key] = blockType;

    // Aplikace lokálně
    this.applySingleBlock(x, y, z, blockType);

    // Odeslání na server v multiplayeru
    if (this.connected) {
      this.send({
        type: 'blockChange',
        x: x,
        y: y,
        z: z,
        blockType: blockType
      });
    }
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

  // Odeslání chatové zprávy do sítě
  sendChatMessage(text) {
    if (this.connected) {
      this.send({
        type: 'chat',
        text: text
      });
      return true;
    }
    return false;
  }

  // UI status lišta pro připojování
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

// Vytvoření globální instance
window.networkManager = new NetworkManager();
