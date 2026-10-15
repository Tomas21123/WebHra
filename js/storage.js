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
    const newWorld = {
      id: 'world_' + Date.now(),
      name: (name || 'Nový svět').trim().slice(0, 30),
      seed: newSeed,
      p2pCode: Math.floor(1000 + Math.random() * 9000),
      createdAt: new Date().toLocaleDateString('cs-CZ'),
      lastPlayed: new Date().toLocaleDateString('cs-CZ'),
      playerState: null,
      worldDeltas: {}
    };
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
    }
  },

  // Smazat svět
  deleteWorld(id) {
    let worlds = this.getWorlds();
    worlds = worlds.filter(w => w.id !== id);
    this.saveWorlds(worlds);
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
  }
};

window.GameStorage = GameStorage;
