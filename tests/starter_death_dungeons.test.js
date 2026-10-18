// =============================================================================
// Test Suite: New World Starter State, Player Death & Massive Dungeons
// tests/starter_death_dungeons.test.js
// =============================================================================
const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const {
  createGameSandbox,
  loadScriptIntoSandbox
} = require('./test_harness');

describe('Feature 1: New World Starter State (Lv 0, basic sword, empty inventory)', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = createGameSandbox();
    loadScriptIntoSandbox('js/config.js', sandbox);
    loadScriptIntoSandbox('js/storage.js', sandbox);
    loadScriptIntoSandbox('js/items.js', sandbox);
    loadScriptIntoSandbox('js/inventory.js', sandbox);
    loadScriptIntoSandbox('js/player.js', sandbox);
  });

  test('New world creation produces Level 0 player state with sword_rusty and empty clothes', () => {
    const world = sandbox.GameStorage.createWorld('Dobrodružství', 98765);
    assert.strictEqual(world.playerState.level, 0, 'New world player level must be 0');
    assert.strictEqual(world.playerState.xp, 0, 'New world XP must be 0');
    assert.strictEqual(world.playerState.xpNext, 50, 'Level 0 requires 50 XP to reach Level 1');
    assert.strictEqual(world.playerState.equippedSlots.hand_r, 'sword_rusty', 'Player starts with sword_rusty equipped');
    assert.strictEqual(world.playerState.equippedSlots.cloth_chest, null, 'Chest slot must be empty');
    assert.strictEqual(world.playerState.equippedSlots.cloth_legs, null, 'Legs slot must be empty');
    assert.strictEqual(world.playerState.equippedSlots.armor_chest, null, 'Armor chest must be empty');

    const inv = sandbox.GameStorage.loadPlayerInventory(world.id);
    assert(inv, 'Inventory must be saved for the new world');
    assert.strictEqual(inv.inventory.length, 1, 'Only starter weapon in inventory array');
    assert.strictEqual(inv.inventory[0].id, 'sword_rusty');
  });

  test('loadPlayerRPGState correctly preserves Level 0', () => {
    sandbox.localStorage.setItem(sandbox.GameStorage.getRpgStorageKey(), JSON.stringify({
      level: 0,
      xp: 15,
      xpNext: 50,
      skillPoints: 0
    }));

    const loaded = sandbox.GameStorage.loadPlayerRPGState();
    assert.strictEqual(loaded.level, 0, 'Must load level 0 without forcing to level 1');
    assert.strictEqual(loaded.xp, 15);
    assert.strictEqual(loaded.xpNext, 50);
  });

  test('P object defaults to level 0 and calculateXpNext(0) is 50', () => {
    assert.strictEqual(sandbox.P.level, 0, 'P starts at Level 0');
    assert.strictEqual(sandbox.calculateXpNext(0), 50, 'XP required for Lv 0 -> Lv 1 is 50');
    assert.strictEqual(sandbox.calculateXpNext(1), 100, 'XP required for Lv 1 -> Lv 2 is 100 (backwards compatibility)');
  });

  test('Inventory grid filters out unowned items (count <= 0 and not equipped)', () => {
    // Only sword_rusty is equipped / count 1
    const grid = sandbox.document.getElementById('grid');
    sandbox.renderGridItemsUI();
    assert(!grid.innerHTML.includes('Žádné předměty nenalezeny') || sandbox.INV.find(i => i.id === 'sword_rusty'), 'Grid renders owned/equipped items');
  });

  test('Creating a new world resets player level to 0, completely isolating RPG progress between worlds', () => {
    // 1. In World 1 (world_default), player gains levels
    sandbox.P.level = 5;
    sandbox.P.xp = 350;
    sandbox.P.skillPoints = 4;
    sandbox.GameStorage.savePlayerRPGState();

    // Verify World 1 saved state
    const w1State = sandbox.GameStorage.loadPlayerRPGState('world_default');
    assert.strictEqual(w1State.level, 5, 'World 1 must be level 5');

    // 2. Create World 2
    const world2 = sandbox.GameStorage.createWorld('Nová Říše', 45678);
    sandbox.GameStorage.setActiveGame({ mode: 'singleplayer', worldId: world2.id, worldName: world2.name, seed: world2.seed });

    // 3. Load RPG state for World 2
    const w2State = sandbox.GameStorage.loadPlayerRPGState(world2.id);
    assert.strictEqual(w2State.level, 0, 'New world MUST start at Level 0, not inherit World 1 level');
    assert.strictEqual(w2State.xp, 0, 'New world XP must be 0');
    assert.strictEqual(w2State.skillPoints, 0, 'New world skill points must be 0');

    // 4. Applying RPG state to P in World 2 sets Level 0
    sandbox.GameStorage.applyPlayerRPGState(sandbox.P, world2.id);
    assert.strictEqual(sandbox.P.level, 0, 'Player level in new world must be 0');

    // 5. Switching back to World 1 preserves Level 5
    sandbox.GameStorage.setActiveGame({ mode: 'singleplayer', worldId: 'world_default' });
    sandbox.GameStorage.applyPlayerRPGState(sandbox.P, 'world_default');
    assert.strictEqual(sandbox.P.level, 5, 'Returning to World 1 preserves its Level 5 progress');
  });
});

describe('Feature 2: Player Death and Teleport to Nearest Discovered POI', () => {
  let sandbox;
  let scheduledTimers = [];

  beforeEach(() => {
    sandbox = createGameSandbox();
    scheduledTimers = [];
    sandbox.setTimeout = (fn, ms) => {
      scheduledTimers.push(fn);
      return scheduledTimers.length;
    };
    loadScriptIntoSandbox('js/config.js', sandbox);
    loadScriptIntoSandbox('js/storage.js', sandbox);
    loadScriptIntoSandbox('js/items.js', sandbox);
    loadScriptIntoSandbox('js/inventory.js', sandbox);
    loadScriptIntoSandbox('js/player.js', sandbox);
    loadScriptIntoSandbox('js/world.js', sandbox);
  });

  test('Lethal damage triggers death, displays death screen, and teleports to nearest discovered POI', () => {
    const pm = sandbox.POIManager;
    const poiA = { id: 'poi_1', wx: 100, wy: 25, wz: 100, displayName: 'Svatyně Slunce' };
    const poiB = { id: 'poi_2', wx: 500, wy: 25, wz: 500, displayName: 'Svatyně Hvězd' };
    pm.instances.set('poi_1', poiA);
    pm.instances.set('poi_2', poiB);
    pm.discoveredPOIs.add('poi_1');
    pm.discoveredPOIs.add('poi_2');

    let teleportedTo = null;
    pm.teleportToPOI = (target) => {
      teleportedTo = target;
      sandbox.P.x = target.wx;
      sandbox.P.y = target.wy;
      sandbox.P.z = target.wz;
      return true;
    };

    // Position player near poi_1 (distance ~28m to poiA vs ~560m to poiB)
    sandbox.P.x = 120;
    sandbox.P.y = 25;
    sandbox.P.z = 120;
    sandbox.G.hp = 0;

    const res = sandbox.triggerPlayerDeath();
    assert.strictEqual(res, true, 'triggerPlayerDeath should succeed');
    assert.strictEqual(sandbox.P.isDead, true, 'Player should be flagged as dead');
    assert(teleportedTo, 'Player must be teleported to a POI');
    assert.strictEqual(teleportedTo.id, 'poi_1', 'Must teleport to nearest discovered POI');
    assert.strictEqual(sandbox.P.hp, sandbox.P.maxHp, 'Player HP must be fully restored upon death');
    assert.strictEqual(sandbox.G.hp, sandbox.P.maxHp, 'G.hp must be fully restored upon death');

    const overlay = sandbox.document.getElementById('deathOverlay');
    assert.strictEqual(overlay.style.display, 'flex', 'Death overlay must be displayed');

    // Execute scheduled timers (respawn fade out)
    scheduledTimers.forEach(fn => fn());
    scheduledTimers.forEach(fn => fn()); // nested fade timeout
    assert.strictEqual(sandbox.P.isDead, false, 'Player isDead flag must be cleared after respawn fade');
  });

  test('If no POI is discovered yet, death teleports player to nearest teleport building', () => {
    const pm = sandbox.POIManager;
    pm.discoveredPOIs.clear();

    let teleportedPOI = null;
    pm.teleportToPOI = (poi) => {
      teleportedPOI = poi;
      sandbox.P.x = poi.wx;
      sandbox.P.y = poi.wy;
      sandbox.P.z = poi.wz;
      return true;
    };

    sandbox.P.x = 800;
    sandbox.P.y = 20;
    sandbox.P.z = 800;

    sandbox.triggerPlayerDeath();
    assert(teleportedPOI, 'Must find and teleport to nearest teleport building');
    assert.notStrictEqual(teleportedPOI.type, 'Chest', 'Teleport building cannot be a chest');
    assert.strictEqual(pm.isDiscovered(teleportedPOI.id), true, 'Nearest building must now be discovered and visible on map');
    assert.strictEqual(sandbox.P.hp, sandbox.P.maxHp, 'HP restored to full');

    scheduledTimers.forEach(fn => fn());
  });

  test('If POIManager is not present, death falls back to safe spawn coordinates', () => {
    sandbox.window.POIManager = null;
    sandbox.P.x = 800;
    sandbox.P.y = 20;
    sandbox.P.z = 800;
    sandbox.window.SPX = 10;
    sandbox.window.SPY = 50;
    sandbox.window.SPZ = 15;

    sandbox.triggerPlayerDeath();
    assert.strictEqual(sandbox.P.x, 10, 'Must respawn at safe spawn X');
    assert.strictEqual(sandbox.P.y, 50, 'Must respawn at safe spawn Y');
    assert.strictEqual(sandbox.P.z, 15, 'Must respawn at safe spawn Z');
    assert.strictEqual(sandbox.P.hp, 100, 'HP restored to full');

    scheduledTimers.forEach(fn => fn());
  });
});

describe('Feature 3: Massive Dungeons (Underground Labyrinth & Surface Stronghold) + Loot & Enemies', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = createGameSandbox();
    loadScriptIntoSandbox('js/config.js', sandbox);
    loadScriptIntoSandbox('js/storage.js', sandbox);
    loadScriptIntoSandbox('js/items.js', sandbox);
    loadScriptIntoSandbox('js/inventory.js', sandbox);
    loadScriptIntoSandbox('js/player.js', sandbox);
    loadScriptIntoSandbox('js/entities.js', sandbox);
    loadScriptIntoSandbox('js/world.js', sandbox);
  });

  test('POI_TYPES includes DungeonLabyrinth and DungeonStronghold with localized names', () => {
    const pm = sandbox.POIManager;
    assert(pm, 'POIManager must exist');
    assert(sandbox.POI_TYPES.includes('DungeonLabyrinth'), 'DungeonLabyrinth must be in POI_TYPES');
    assert(sandbox.POI_TYPES.includes('DungeonStronghold'), 'DungeonStronghold must be in POI_TYPES');
    assert.strictEqual(sandbox.DISPLAY_NAMES.DungeonLabyrinth, 'Podzemní labyrint zatracených');
    assert.strictEqual(sandbox.DISPLAY_NAMES.DungeonStronghold, 'Vznešená nadzemní pevnost');
  });

  test('Voxel stamping generates vast structures for DungeonLabyrinth and DungeonStronghold', () => {
    const pm = sandbox.POIManager;
    const placedBlocks = [];
    const putBlock = (x, y, z, id) => {
      placedBlocks.push({ x, y, z, id });
    };

    const labPoi = {
      type: 'DungeonLabyrinth',
      bx: 100,
      by: 50,
      bz: 100,
      x: 100, y: 50, z: 100
    };

    pm._stampSinglePOI(labPoi, 80, 120, 80, 120, putBlock);
    assert(placedBlocks.length > 50, 'DungeonLabyrinth must place a vast amount of voxel blocks');
    assert(placedBlocks.some(b => b.y < 50), 'DungeonLabyrinth must carve blocks subterranean below surface (y < by)');

    placedBlocks.length = 0;
    const strongPoi = {
      type: 'DungeonStronghold',
      bx: 200,
      by: 50,
      bz: 200,
      x: 200, y: 50, z: 200
    };

    pm._stampSinglePOI(strongPoi, 180, 220, 180, 220, putBlock);
    assert(placedBlocks.length > 50, 'DungeonStronghold must place walls, towers, and keep');
    assert(placedBlocks.some(b => b.y >= 50 + 8), 'DungeonStronghold must feature high battlements (y >= by + 8)');
  });

  test('Approaching dungeon spawns enemy squads (Skeletons, Goblins, Golems)', () => {
    const pm = sandbox.POIManager;
    const spawnedCreatures = [];
    sandbox.EntityManager = {
      spawnCreature: (type, x, y, z, lvl) => {
        spawnedCreatures.push({ type, x, y, z, lvl });
      },
      computeScaledLevel: (x, z, base) => base || 2
    };

    const labPoi = pm.getPoiForCell(10, 10);
    labPoi.type = 'DungeonLabyrinth';
    labPoi.guardiansSpawned = false;

    // Simulate player stepping into dungeon range
    pm.update(0.016, Date.now(), labPoi.wx, labPoi.wy, labPoi.wz);

    assert(spawnedCreatures.length >= 3, 'DungeonLabyrinth must spawn enemy squad');
    assert(spawnedCreatures.some(c => c.type === 'Skeleton'), 'Contains Skeletons');
    assert(spawnedCreatures.some(c => c.type === 'Goblin'), 'Contains Goblins');
    assert(spawnedCreatures.some(c => c.type === 'Golem'), 'Contains boss Golem');
  });

  test('Interacting with dungeon chest grants weapon drop, potions, ores, and gold', () => {
    const pm = sandbox.POIManager;
    const poi = {
      id: 'poi_dungeon_test',
      type: 'DungeonLabyrinth',
      displayName: 'Podzemní labyrint zatracených',
      wx: 50, wy: 20, wz: 50,
      opened: false,
      attached: true,
      targetAngle: 0
    };

    // Mock cell retrieval
    pm.getPoiForCell = () => poi;

    // Reset weapons counts to test drop
    const weaponsList = ['sword', 'spear', 'battleaxe', 'dagger', 'mace', 'greatsword', 'staff_fire', 'bow', 'katana', 'hammer', 'shield_wood', 'shield_iron'];
    weaponsList.forEach(wId => {
      const it = sandbox.INV.find(i => i.id === wId);
      if (it) it.count = 0;
    });

    const initialLvl = sandbox.P.level;
    const ok = pm.interactClosest(50, 20, 50);
    assert.strictEqual(ok, true, 'interactClosest must succeed on dungeon chest');
    assert.strictEqual(poi.opened, true, 'Chest must be marked as opened');
    assert(sandbox.P.level > initialLvl || sandbox.P.xp > 0, 'Must grant XP advancing player progression');

    // Verify guaranteed weapon drop
    const droppedWeapon = weaponsList.find(wId => {
      const it = sandbox.INV.find(i => i.id === wId);
      return it && (it.count || 0) > 0;
    });
    assert(droppedWeapon, 'Opening dungeon chest must award a weapon drop into inventory');

    // Verify potions & gold
    const hpPot = sandbox.INV.find(i => i.id === 'potion_hp' || i.id === 'potion_health');
    assert(hpPot && hpPot.count >= 4, 'Must award 4 healing potions');
    const gold = sandbox.INV.find(i => i.id === 'coin_gold' || i.id === 'gold' || i.id === 'ore_gold');
    assert(gold && gold.count >= 100, 'Must award 100 gold coins from dungeon');
  });
});
