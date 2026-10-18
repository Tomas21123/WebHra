// =============================================================================
// Voxelový svět – Správce Ukládání Světů a Serverů (js/storage.js)
// =============================================================================

const STORAGE_KEY_WORLDS = 'voxel_worlds_list';
const STORAGE_KEY_ACTIVE = 'voxel_active_game';
const STORAGE_KEY_SERVERS = 'voxel_servers_list';

// Výchozí servery v multiplayer seznamu
const DEFAULT_SERVERS = [
  {
    id: 'srv_local',
    name: 'Lokální Server (Tento počítač)',
    address: 'localhost:3000',
    description: 'Server běžící na tomto PC nebo LAN síti'
  },
  {
    id: 'srv_rpi',
    name: 'Raspberry Pi Server',
    address: '192.168.1.100:3000',
    description: 'Výchozí adresa pro domácí Raspberry Pi 4'
  }
];

const GameStorage = {
  // ---------- SVĚTY (Singleplayer) ----------
  
  // Získat všechny uložené světy
  getWorlds() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_WORLDS);
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          let dirty = false;
          list.forEach(w => {
            if (!w.p2pCode) {
              w.p2pCode = Math.floor(1000 + Math.random() * 9000);
              dirty = true;
            }
          });
          if (dirty) this.saveWorlds(list);
          return list;
        }
      }
    } catch (e) {
      console.error('[Storage] Chyba načítání světů:', e);
    }
    // Pokud ještě žádný svět neexistuje, vytvoříme výchozí
    const defaultWorld = {
      id: 'world_default',
      name: 'Můj První Svět',
      seed: 12345,
      p2pCode: Math.floor(1000 + Math.random() * 9000),
      createdAt: new Date().toLocaleDateString('cs-CZ'),
      lastPlayed: new Date().toLocaleDateString('cs-CZ'),
      playerState: null,
      worldDeltas: {}
    };
    this.saveWorlds([defaultWorld]);
    return [defaultWorld];
  },

  // Uložit seznam světů
  saveWorlds(worlds) {
    try {
      localStorage.setItem(STORAGE_KEY_WORLDS, JSON.stringify(worlds));
    } catch (e) {
      console.error('[Storage] Chyba ukládání světů:', e);
    }
  },

  // Vytvořit nový svět
  createWorld(name, seed = null) {
    const worlds = this.getWorlds();
    const newSeed = (seed && !isNaN(parseInt(seed))) ? parseInt(seed) : Math.floor(Math.random() * 999999) + 1;
    const starterEquippedSlots = {
      cloth_head: null,
      cloth_chest: null,
      cloth_legs: null,
      cloth_feet: null,
      armor_head: null,
      armor_chest: null,
      armor_legs: null,
      armor_feet: null,
      hand_l: null,
      hand_r: 'sword_rusty',
      ring_l: null,
      ring_r: null,
      pet: null
    };
    const starterInventory = [
      { id: 'sword_rusty', count: 1 }
    ];
    const starterPlayerState = {
      level: 0,
      xp: 0,
      xpNext: 50,
      skillPoints: 0,
      baseStats: {
        maxHp: 100,
        maxStamina: 100,
        attackPower: 8,
        defense: 0,
        critChance: 0.05,
        moveSpeed: 6.0
      },
      hp: 100,
      stamina: 100,
      equippedSlots: starterEquippedSlots,
      inventory: starterInventory
    };
    const newWorld = {
      id: 'world_' + Date.now(),
      name: (name || 'Nový svět').trim().slice(0, 30),
      seed: newSeed,
      p2pCode: Math.floor(1000 + Math.random() * 9000),
      createdAt: new Date().toLocaleDateString('cs-CZ'),
      lastPlayed: new Date().toLocaleDateString('cs-CZ'),
      playerState: starterPlayerState,
      worldDeltas: {}
    };

    // Uložit čistý výchozí RPG stav a inventář specificky pro tento nový svět
    this.savePlayerRPGState({
      userId: this.getUserId(),
      worldId: newWorld.id,
      level: 0,
      xp: 0,
      xpNext: 50,
      skillPoints: 0,
      baseStats: {
        maxHp: 100,
        maxStamina: 100,
        attackPower: 8,
        defense: 0,
        critChance: 0.05,
        moveSpeed: 6.0
      },
      hp: 100,
      stamina: 100,
      savedAt: Date.now()
    }, newWorld.id);

    this.savePlayerInventory(newWorld.id, starterInventory, starterEquippedSlots, null);
    worlds.unshift(newWorld);
    this.saveWorlds(worlds);
    return newWorld;
  },

  // Získat jeden svět podle ID
  getWorld(id) {
    const worlds = this.getWorlds();
    const w = worlds.find(w => w.id === id);
    if (w && !w.p2pCode) {
      w.p2pCode = Math.floor(1000 + Math.random() * 9000);
      this.saveWorlds(worlds);
    }
    return w || null;
  },

  // Získat stálý P2P kód pro daný svět
  getP2PRoomCode(id) {
    if (!id) {
      const active = this.getActiveGame();
      id = active ? active.worldId : null;
    }
    if (id) {
      const w = this.getWorld(id);
      if (w && w.p2pCode) return `VOX-${w.p2pCode}`;
    }
    // Fallback do localStorage
    let saved = localStorage.getItem('voxel_p2p_host_code');
    if (!saved) {
      saved = `VOX-${Math.floor(1000 + Math.random() * 9000)}`;
      localStorage.setItem('voxel_p2p_host_code', saved);
    }
    return saved;
  },

  // Aktualizovat data světa (postup hráče, položené/rozbité bloky)
  updateWorldData(id, playerState, worldDeltas) {
    const worlds = this.getWorlds();
    const idx = worlds.findIndex(w => w.id === id);
    if (idx !== -1) {
      worlds[idx].lastPlayed = new Date().toLocaleDateString('cs-CZ');
      if (playerState) worlds[idx].playerState = playerState;
      if (worldDeltas) worlds[idx].worldDeltas = worldDeltas;
      this.saveWorlds(worlds);

      if (playerState && (playerState.inventory || playerState.equippedSlots)) {
        this.savePlayerInventory(id, playerState.inventory, playerState.equippedSlots, playerState.activePetId);
      }
    }
  },

  // Uložit inventář a mazlíčky hráče pro daný svět
  savePlayerInventory(worldId, invData, equippedSlots, activePetId) {
    if (!worldId) {
      const active = this.getActiveGame();
      worldId = active ? active.worldId : 'world_default';
    }
    try {
      const key = `voxel_inventory_${worldId}`;
      const payload = {
        inventory: invData || [],
        equippedSlots: equippedSlots || {},
        activePetId: activePetId || null,
        savedAt: Date.now()
      };
      localStorage.setItem(key, JSON.stringify(payload));
      return true;
    } catch (e) {
      console.error('[Storage] Chyba ukládání inventáře:', e);
      return false;
    }
  },

  // Načíst inventář a mazlíčky hráče pro daný svět
  loadPlayerInventory(worldId) {
    if (!worldId) {
      const active = this.getActiveGame();
      worldId = active ? active.worldId : 'world_default';
    }
    try {
      const key = `voxel_inventory_${worldId}`;
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error('[Storage] Chyba načítání inventáře:', e);
    }
    return null;
  },

  // Smazat svět
  deleteWorld(id) {
    let worlds = this.getWorlds();
    worlds = worlds.filter(w => w.id !== id);
    this.saveWorlds(worlds);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(this.getRpgStorageKey(id));
        localStorage.removeItem(`voxel_inventory_${id}`);
        const keys = Object.keys(localStorage);
        for (const k of keys) {
          if (k.startsWith(`voxel_poi_discovered_v2_${id}`) || k.startsWith(`voxel_opened_chests_v2_${id}`) || k.startsWith(`voxel_explored_chunks_${id}`)) {
            localStorage.removeItem(k);
          }
        }
      }
    } catch (e) {}
    return worlds;
  },

  // Exportovat svět do stáhnutelného JSON souboru
  exportWorld(id) {
    const world = this.getWorld(id);
    if (!world) return;
    const blob = new Blob([JSON.stringify(world, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${world.name.replace(/\s+/g, '_')}_backup.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    }, 100);
  },

  // Importovat svět ze souboru JSON
  importWorld(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || !parsed.name || typeof parsed.seed === 'undefined') {
        throw new Error('Neplatný formát souboru světa.');
      }
      parsed.id = 'world_' + Date.now();
      parsed.name = parsed.name + ' (Import)';
      parsed.lastPlayed = new Date().toLocaleDateString('cs-CZ');
      const worlds = this.getWorlds();
      worlds.unshift(parsed);
      this.saveWorlds(worlds);
      return parsed;
    } catch (e) {
      alert('Chyba importu světa: ' + e.message);
      return null;
    }
  },

  // ---------- SERVERY (Multiplayer) ----------

  // Získat seznam serverů
  getServers() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SERVERS);
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list) && list.length > 0) return list;
      }
    } catch (e) {
      console.error('[Storage] Chyba načítání serverů:', e);
    }
    this.saveServers(DEFAULT_SERVERS);
    return DEFAULT_SERVERS;
  },

  // Uložit seznam serverů
  saveServers(servers) {
    try {
      localStorage.setItem(STORAGE_KEY_SERVERS, JSON.stringify(servers));
    } catch (e) {
      console.error('[Storage] Chyba ukládání serverů:', e);
    }
  },

  // Přidat nový server
  addServer(name, address) {
    const servers = this.getServers();
    const newServer = {
      id: 'srv_' + Date.now(),
      name: (name || 'Nový Server').trim().slice(0, 35),
      address: address.trim().replace(/^ws:\/\/|^wss:\/\/|^http:\/\//i, ''),
      description: 'Uživatelský herní server'
    };
    servers.push(newServer);
    this.saveServers(servers);
    return newServer;
  },

  // Odstranit server
  deleteServer(id) {
    let servers = this.getServers();
    servers = servers.filter(s => s.id !== id);
    this.saveServers(servers);
    return servers;
  },

  // ---------- AKTIVNÍ HRA (Session) ----------

  // Nastavit aktivní hru pro přechod do /play/
  setActiveGame(gameConfig) {
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVE, JSON.stringify(gameConfig));
    } catch (e) {}
  },

  // Načíst aktivní hru
  getActiveGame() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_ACTIVE);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    // Výchozí fallback: Singleplayer výchozí svět
    return {
      mode: 'singleplayer',
      worldId: 'world_default',
      worldName: 'Můj První Svět',
      seed: 12345
    };
  },

  // ---------- UŽIVATEL (Auth / Guest Session) ----------
  getUser() {
    try {
      const raw = localStorage.getItem('voxel_auth_user');
      if (raw) {
        const u = JSON.parse(raw);
        if (u && typeof u === 'object') return u;
      }
    } catch (e) {}
    const fallbackUser = { id: 999, nickname: 'Hráč_Guest', email: 'guest@voxel.cz' };
    try {
      localStorage.setItem('voxel_auth_user', JSON.stringify(fallbackUser));
    } catch (e) {}
    return fallbackUser;
  },

  getUserId() {
    const u = this.getUser();
    return (u && (u.id !== undefined && u.id !== null)) ? String(u.id) : '999';
  },

  getRpgStorageKey(worldId = null) {
    if (!worldId) {
      const active = this.getActiveGame();
      worldId = (active && (active.worldId || active.id)) ? (active.worldId || active.id) : 'world_default';
    }
    return `voxel_rpg_player_${this.getUserId()}_${worldId}`;
  },

  // ---------- RPG POSTUP & PERSISTENCE (F8) ----------
  savePlayerRPGState(customState = null, customWorldId = null) {
    try {
      const active = this.getActiveGame();
      const worldId = customWorldId || (customState && customState.worldId) || (active && (active.worldId || active.id)) || 'world_default';
      const key = this.getRpgStorageKey(worldId);
      let stateToSave = customState;

      if (!stateToSave && typeof window !== 'undefined' && window.P) {
        const p = window.P;
        const curLvl = (typeof p.level === 'number') ? p.level : 0;
        stateToSave = {
          userId: this.getUserId(),
          worldId: worldId,
          level: curLvl,
          xp: p.xp || 0,
          xpNext: p.xpNext || (typeof window.calculateXpNext === 'function' ? window.calculateXpNext(curLvl) : (curLvl === 0 ? 50 : 100)),
          skillPoints: p.skillPoints || 0,
          baseStats: {
            maxHp: (p.baseStats && p.baseStats.maxHp) || 100,
            maxStamina: (p.baseStats && p.baseStats.maxStamina) || 100,
            attackPower: (p.baseStats && p.baseStats.attackPower) || 8,
            defense: (p.baseStats && p.baseStats.defense) || 0,
            critChance: (p.baseStats && p.baseStats.critChance) || 0.05,
            moveSpeed: (p.baseStats && p.baseStats.moveSpeed) || 6.0
          },
          hp: (typeof G !== 'undefined' ? G.hp : (p.hp || 100)),
          stamina: (typeof G !== 'undefined' ? G.st : (p.stamina || 100)),
          savedAt: Date.now()
        };
      }

      if (stateToSave) {
        const json = JSON.stringify(stateToSave);
        localStorage.setItem(key, json);
        return true;
      }
    } catch (e) {
      console.error('[Storage] Chyba při ukládání RPG stavu:', e);
    }
    return false;
  },

  savePlayerRPG(data, customWorldId = null) {
    return this.savePlayerRPGState(data, customWorldId);
  },

  loadPlayerRPGState(customWorldId = null) {
    try {
      const active = this.getActiveGame();
      const worldId = customWorldId || (active && (active.worldId || active.id)) || 'world_default';
      const key = this.getRpgStorageKey(worldId);
      let raw = localStorage.getItem(key);

      // Pokud záznam pro daný svět zatím v localStorage neexistuje, zkontrolovat svět
      if (!raw) {
        const world = this.getWorld(worldId);
        if (world && world.playerState && (typeof world.playerState.level !== 'undefined')) {
          const ps = world.playerState;
          const lvl = (typeof ps.level === 'number') ? Math.max(0, ps.level) : (ps.level !== undefined && !isNaN(parseInt(ps.level)) ? Math.max(0, parseInt(ps.level)) : 0);
          return {
            level: lvl,
            xp: Math.max(0, Number(ps.xp) || 0),
            xpNext: Number(ps.xpNext) || (typeof window.calculateXpNext === 'function' ? window.calculateXpNext(lvl) : (lvl === 0 ? 50 : 100)),
            skillPoints: Math.max(0, Number(ps.skillPoints) || 0),
            baseStats: {
              maxHp: Number(ps.baseStats?.maxHp) || 100,
              maxStamina: Number(ps.baseStats?.maxStamina) || 100,
              attackPower: Number(ps.baseStats?.attackPower) || 8,
              defense: Number(ps.baseStats?.defense) || 0,
              critChance: Number(ps.baseStats?.critChance) || 0.05,
              moveSpeed: Number(ps.baseStats?.moveSpeed) || 6.0
            },
            hp: Number(ps.hp) || 100,
            stamina: Number(ps.stamina) || 100
          };
        }

        // Zpětná kompatibilita POUZE pro výchozí svět 'world_default'
        if (worldId === 'world_default') {
          const legacyKey = `voxel_rpg_player_${this.getUserId()}`;
          raw = localStorage.getItem(legacyKey) || localStorage.getItem('voxel_rpg_stats');
        }
      }

      if (raw) {
        const data = JSON.parse(raw);
        if (data && typeof data === 'object') {
          const lvl = (typeof data.level === 'number') ? Math.max(0, data.level) : (data.level !== undefined && !isNaN(parseInt(data.level)) ? Math.max(0, parseInt(data.level)) : 0);
          return {
            level: lvl,
            xp: Math.max(0, Number(data.xp) || 0),
            xpNext: Number(data.xpNext) || (typeof window.calculateXpNext === 'function' ? window.calculateXpNext(lvl) : (lvl === 0 ? 50 : 100)),
            skillPoints: Math.max(0, Number(data.skillPoints) || 0),
            baseStats: {
              maxHp: Number(data.baseStats?.maxHp) || Number(data.maxHp) || 100,
              maxStamina: Number(data.baseStats?.maxStamina) || Number(data.maxStamina) || 100,
              attackPower: Number(data.baseStats?.attackPower) || 8,
              defense: Number(data.baseStats?.defense) || 0,
              critChance: Number(data.baseStats?.critChance) || 0.05,
              moveSpeed: Number(data.baseStats?.moveSpeed) || 6.0
            },
            hp: Number(data.hp) || null,
            stamina: Number(data.stamina) || null
          };
        }
      }

      // Pro nový svět bez předchozích záznamů: začínáme striktně na Level 0
      return {
        level: 0,
        xp: 0,
        xpNext: 50,
        skillPoints: 0,
        baseStats: {
          maxHp: 100,
          maxStamina: 100,
          attackPower: 8,
          defense: 0,
          critChance: 0.05,
          moveSpeed: 6.0
        },
        hp: 100,
        stamina: 100
      };
    } catch (e) {
      console.error('[Storage] Chyba při načítání RPG stavu:', e);
    }
    return null;
  },

  loadPlayerRPG(customWorldId = null) {
    return this.loadPlayerRPGState(customWorldId);
  },

  applyPlayerRPGState(targetP = (typeof P !== 'undefined' ? P : (typeof window !== 'undefined' ? window.P : null)), customWorldId = null) {
    if (!targetP) return false;
    const state = this.loadPlayerRPGState(customWorldId);
    if (!state) return false;

    targetP.level = (typeof state.level === 'number') ? state.level : 0;
    targetP.xp = Number(state.xp) || 0;
    targetP.xpNext = Number(state.xpNext) || (targetP.level === 0 ? 50 : 100);
    targetP.skillPoints = Number(state.skillPoints) || 0;
    targetP.baseStats = Object.assign({}, state.baseStats);
    targetP.attackPower = targetP.baseStats.attackPower || 8;

    const bonusHp = (typeof window !== 'undefined' && typeof window.getPlayerBonusHP === 'function') ? window.getPlayerBonusHP() : 0;
    targetP.maxHp = targetP.baseStats.maxHp + bonusHp;
    targetP.maxStamina = targetP.baseStats.maxStamina;

    if (state.hp !== null && typeof G !== 'undefined') {
      G.hp = Math.min(targetP.maxHp, state.hp);
    }
    if (state.stamina !== null && typeof G !== 'undefined') {
      G.st = Math.min(targetP.maxStamina, state.stamina);
    }

    if (typeof window !== 'undefined') {
      if (typeof window.ui === 'function') window.ui();
      if (typeof window.updateXpUI === 'function') window.updateXpUI();
    }
    return true;
  }
};

window.GameStorage = GameStorage;
