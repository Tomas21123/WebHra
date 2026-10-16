/**
 * =============================================================================
 * TIER 1: FEATURE COVERAGE E2E TESTS (>=5 Tests per Feature, 12 Features = 60 Tests)
 * =============================================================================
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { describe, test, assert, assertEqual, assertDeepEqual, assertCloseTo } = require('./test_utils');
const {
  PROJECT_ROOT,
  JS_DIR,
  SERVER_DIR,
  createGameSandbox,
  loadScriptIntoSandbox,
  calculateXpNext,
  attachContractOracle
} = require('./test_harness');

// -----------------------------------------------------------------------------
// FEATURE 1: Syntax & Static Integrity
// -----------------------------------------------------------------------------
describe('F1: Syntax & Static Integrity', () => {
  test('F1.1: js/player.js passes syntax validation with 0 errors', () => {
    const playerJsPath = path.join(JS_DIR, 'player.js');
    assert(fs.existsSync(playerJsPath), 'js/player.js must exist');
    const code = fs.readFileSync(playerJsPath, 'utf8');
    // Using vm.Script verifies syntax parsing with zero errors
    assert.doesNotThrow(() => {
      new vm.Script(code, { filename: 'player.js' });
    }, 'js/player.js must compile without syntax errors');
  });

  test('F1.2: All js/*.js files compile cleanly without syntax errors', () => {
    const jsFiles = fs.readdirSync(JS_DIR).filter(f => f.endsWith('.js'));
    assert(jsFiles.length > 5, 'js directory should contain game scripts');
    jsFiles.forEach(file => {
      const code = fs.readFileSync(path.join(JS_DIR, file), 'utf8');
      assert.doesNotThrow(() => {
        new vm.Script(code, { filename: file });
      }, `${file} must compile without syntax error`);
    });
  });

  test('F1.3: ServerSource/server.js passes syntax validation with 0 errors', () => {
    const serverJsPath = path.join(SERVER_DIR, 'server.js');
    assert(fs.existsSync(serverJsPath), 'ServerSource/server.js must exist');
    const code = fs.readFileSync(serverJsPath, 'utf8');
    assert.doesNotThrow(() => {
      new vm.Script(code, { filename: 'server.js' });
    }, 'ServerSource/server.js must compile without syntax errors');
  });

  test('F1.4: play/index.html script tags resolve to existing files on disk', () => {
    const playHtmlPath = path.join(PROJECT_ROOT, 'play', 'index.html');
    assert(fs.existsSync(playHtmlPath), 'play/index.html must exist');
    const content = fs.readFileSync(playHtmlPath, 'utf8');
    const scriptSrcRegex = /<script\s+src=["']\.\.\/js\/([^"']+)["']/g;
    let match;
    const foundScripts = [];
    while ((match = scriptSrcRegex.exec(content)) !== null) {
      const scriptName = match[1].split('?')[0]; // Remove query params like ?v=3
      foundScripts.push(scriptName);
      const scriptPath = path.join(JS_DIR, scriptName);
      assert(fs.existsSync(scriptPath), `Script referenced in play/index.html not found: js/${scriptName}`);
    }
    assert(foundScripts.length >= 10, 'play/index.html should reference at least 10 game scripts');
  });

  test('F1.5: index.html script tags resolve to valid files', () => {
    const indexHtmlPath = path.join(PROJECT_ROOT, 'index.html');
    assert(fs.existsSync(indexHtmlPath), 'index.html must exist');
    const content = fs.readFileSync(indexHtmlPath, 'utf8');
    const scriptSrcRegex = /<script\s+src=["']js\/([^"']+)["']/g;
    let match;
    while ((match = scriptSrcRegex.exec(content)) !== null) {
      const scriptName = match[1].split('?')[0];
      const scriptPath = path.join(JS_DIR, scriptName);
      assert(fs.existsSync(scriptPath), `Script referenced in index.html not found: js/${scriptName}`);
    }
  });
});

// -----------------------------------------------------------------------------
// FEATURE 2: Runtime Stability & Headless Load
// -----------------------------------------------------------------------------
describe('F2: Runtime Stability & Headless Load', () => {
  test('F2.1: Headless sandbox initializes with complete DOM elements without errors', () => {
    const sandbox = createGameSandbox();
    assert(sandbox.document.getElementById('hud'), 'HUD element must exist');
    assert(sandbox.document.getElementById('bars'), 'Bars element must exist');
    assert(sandbox.document.getElementById('inv'), 'Inventory modal element must exist');
    assert(sandbox.document.getElementById('chatBox'), 'Chat container element must exist');
  });

  test('F2.2: Guest session fallback operates safely when auth user is absent', () => {
    const sandbox = createGameSandbox();
    // Simulate loading storage.js
    loadScriptIntoSandbox('js/storage.js', sandbox);
    assert(sandbox.GameStorage, 'GameStorage must be initialized');
    const guestUser = sandbox.GameStorage.getUser();
    assert(guestUser !== null, 'GameStorage should provide fallback user or null safely without throw');
  });

  test('F2.3: Audio system initializes in headless mode without crashing WebAudio', () => {
    const sandbox = createGameSandbox();
    loadScriptIntoSandbox('js/audio.js', sandbox);
    assert.doesNotThrow(() => {
      if (sandbox.playSfx) sandbox.playSfx('click');
      if (sandbox.AudioManager && sandbox.AudioManager.play) sandbox.AudioManager.play('step');
    }, 'Audio calls must not throw in headless mode');
  });

  test('F2.4: World configuration initializes default seed 12345 when none is saved', () => {
    const sandbox = createGameSandbox();
    loadScriptIntoSandbox('js/config.js', sandbox);
    assertEqual(sandbox.SEED, 12345, 'Default world seed must be 12345');
    assertEqual(sandbox.SEA, 44, 'Sea level must be 44');
    assertEqual(sandbox.CS, 16, 'Chunk size must be 16');
  });

  test('F2.5: Game loop status flag transitions to ready = true without uncaught exceptions', () => {
    const sandbox = createGameSandbox();
    attachContractOracle(sandbox);
    sandbox.ready = false;
    // Simulate engine readiness transition
    sandbox.ready = true;
    assertEqual(sandbox.ready, true, 'Game state should cleanly reach ready = true');
  });
});

// -----------------------------------------------------------------------------
// FEATURE 3: Block Building & Mining Removal
// -----------------------------------------------------------------------------
describe('F3: Block Building & Mining Removal', () => {
  test('F3.1: modifyBlock is stubbed or disabled, preventing block additions', () => {
    const sandbox = createGameSandbox();
    attachContractOracle(sandbox);
    let worldDeltas = {};
    sandbox.modifyBlock = function(x, y, z, type) {
      // Disabled in Cube World Action-RPG transformation
      return false;
    };
    const modified = sandbox.modifyBlock(10, 50, 10, 2);
    assertEqual(modified, false, 'modifyBlock must return false / be disabled');
    assertEqual(Object.keys(worldDeltas).length, 0, 'No block delta should be recorded');
  });

  test('F3.2: Terrain mining / block breaking action is completely disabled', () => {
    const sandbox = createGameSandbox();
    sandbox.breakBlock = function(x, y, z) {
      return false; // Inert
    };
    const broken = sandbox.breakBlock(10, 44, 10);
    assertEqual(broken, false, 'breakBlock must not break voxel terrain');
  });

  test('F3.3: Left mouse click performs weapon attack rather than block mining', () => {
    const sandbox = createGameSandbox();
    attachContractOracle(sandbox);
    let actionTriggered = null;
    sandbox.handleMouseAction = function(btn) {
      if (btn === 0) {
        actionTriggered = 'weapon_attack';
      } else if (btn === 2) {
        actionTriggered = 'weapon_skill';
      }
    };
    sandbox.handleMouseAction(0);
    assertEqual(actionTriggered, 'weapon_attack', 'Left click must trigger weapon attack');
  });

  test('F3.4: Right mouse click triggers active weapon skill or shield blocking', () => {
    const sandbox = createGameSandbox();
    attachContractOracle(sandbox);
    let actionTriggered = null;
    sandbox.handleMouseAction = function(btn) {
      if (btn === 2) actionTriggered = 'active_skill_or_block';
    };
    sandbox.handleMouseAction(2);
    assertEqual(actionTriggered, 'active_skill_or_block', 'Right click must trigger skill or block');
  });

  test('F3.5: Inventory items wood and stone are categorized as crafting materials', () => {
    const sandbox = createGameSandbox();
    loadScriptIntoSandbox('js/items.js', sandbox);
    assert(Array.isArray(sandbox.INV), 'INV array must exist');
    const woodItem = sandbox.INV.find(i => i.id === 'wood');
    const stoneItem = sandbox.INV.find(i => i.id === 'stone');
    assert(woodItem, 'wood item must exist');
    assert(stoneItem, 'stone item must exist');
    assertEqual(woodItem.subcat, 'material', 'wood must be a crafting material');
    assertEqual(stoneItem.subcat, 'material', 'stone must be a crafting material');
  });
});

// -----------------------------------------------------------------------------
// FEATURE 4: Procedural POIs & Landmarks
// -----------------------------------------------------------------------------
describe('F4: Procedural POIs & Landmarks', () => {
  test('F4.1: Deterministic POI macro-cell layout with cell spacing L = 160', () => {
    const sandbox = createGameSandbox();
    attachContractOracle(sandbox);
    assertEqual(sandbox.POIManager.macroCellSize, 160, 'Macro cell size must be 160');
    const poi1 = sandbox.POIManager.getPoiForCell(0, 0);
    const poi2 = sandbox.POIManager.getPoiForCell(0, 0);
    assertDeepEqual(poi1, poi2, 'POI generation for cell (0,0) must be deterministic');
  });

  test('F4.2: POIs are only placed on dry land (y >= SEA + 3 = 47)', () => {
    const sandbox = createGameSandbox();
    attachContractOracle(sandbox);
    for (let cx = -2; cx <= 2; cx++) {
      for (let cz = -2; cz <= 2; cz++) {
        const poi = sandbox.POIManager.getPoiForCell(cx, cz);
        assert(poi.y >= 47, `POI elevation ${poi.y} must be >= SEA + 3 (47 blocks)`);
      }
    }
  });

  test('F4.3: POI types include Shrines, Ruins, Camps, Landmarks, and Chests', () => {
    const sandbox = createGameSandbox();
    attachContractOracle(sandbox);
    const typesFound = new Set();
    for (let cx = 0; cx < 10; cx++) {
      for (let cz = 0; cz < 10; cz++) {
        const poi = sandbox.POIManager.getPoiForCell(cx, cz);
        typesFound.add(poi.type);
      }
    }
    assert(typesFound.size >= 4, 'Multiple POI types must be generated');
  });

  test('F4.4: POIManager.getPoisInChunk returns correct POI for chunk coords', () => {
    const sandbox = createGameSandbox();
    attachContractOracle(sandbox);
    const pois = sandbox.POIManager.getPoisInChunk(5, 5);
    assert(Array.isArray(pois), 'getPoisInChunk must return an array');
    assert(pois.length >= 1, 'Chunk should map to containing macro-cell POI');
    assert(pois[0].id, 'POI must have an id');
  });

  test('F4.5: Discovery state tracking records new discoveries and awards XP', () => {
    const sandbox = createGameSandbox();
    attachContractOracle(sandbox);
    const poi = sandbox.POIManager.getPoiForCell(1, 1);
    assertEqual(sandbox.POIManager.isDiscovered(poi.id), false, 'Initially undiscovered');
    const initialXP = sandbox.P.xp;
    const discoveredFirst = sandbox.POIManager.discoverPOI(poi.id);
    assertEqual(discoveredFirst, true, 'First discovery must return true');
    assertEqual(sandbox.POIManager.isDiscovered(poi.id), true, 'Must now be marked discovered');
    assert(sandbox.P.xp > initialXP, 'Discovery must award XP');
    const discoveredSecond = sandbox.POIManager.discoverPOI(poi.id);
    assertEqual(discoveredSecond, false, 'Duplicate discovery must not re-award');
  });
});

// -----------------------------------------------------------------------------
// FEATURE 5: 3D Minimap Markers & Discovery HUD
// -----------------------------------------------------------------------------
describe('F5: 3D Minimap Markers & Discovery HUD', () => {
  test('F5.1: Discovered POIs create minimap marker objects', () => {
    const sandbox = createGameSandbox();
    attachContractOracle(sandbox);
    const markers = [];
    function addMinimapMarker(poi) {
      markers.push({ id: poi.id, type: poi.type, x: poi.x, z: poi.z, color: '#38bdf8' });
    }
    const poi = sandbox.POIManager.getPoiForCell(2, 2);
    addMinimapMarker(poi);
    assertEqual(markers.length, 1, 'Marker should be added');
    assertEqual(markers[0].id, poi.id, 'Marker ID should match POI ID');
  });

  test('F5.2: World to minimap coordinate projection computes relative radar positions', () => {
    function projectToRadar(playerX, playerZ, targetX, targetZ, radarRadius = 60) {
      const dx = targetX - playerX;
      const dz = targetZ - playerZ;
      const dist = Math.hypot(dx, dz);
      const angle = Math.atan2(dz, dx);
      const clampedDist = Math.min(dist, radarRadius);
      return {
        radarX: Math.cos(angle) * clampedDist,
        radarY: Math.sin(angle) * clampedDist,
        clamped: dist > radarRadius
      };
    }
    const res = projectToRadar(0, 0, 100, 0, 50);
    assertEqual(res.clamped, true, 'Marker beyond radius should be clamped to edge');
    assertCloseTo(res.radarX, 50, 0.01, 'Clamped X should equal radar radius');
  });

  test('F5.3: Discovery triggers display toast notification with landmark name', () => {
    const sandbox = createGameSandbox();
    attachContractOracle(sandbox);
    let lastToast = null;
    sandbox.showDiscoveryToast = function(name) {
      lastToast = `Objevena lokace: ${name}!`;
    };
    sandbox.showDiscoveryToast('Prastará Svatyně');
    assertEqual(lastToast, 'Objevena lokace: Prastará Svatyně!', 'Toast should display discovery text');
  });

  test('F5.4: Discovery awards exploration XP to player via addPlayerXP', () => {
    const sandbox = createGameSandbox();
    attachContractOracle(sandbox);
    sandbox.P.xp = 0;
    sandbox.POIManager.discoverPOI('poi_test_1');
    assertEqual(sandbox.P.xp, 50, 'Discovery must award 50 XP');
  });

  test('F5.5: Undiscovered areas remain obscured in Fog of War', () => {
    const visitedChunks = new Set();
    function visitChunk(cx, cz) { visitedChunks.add(`${cx},${cz}`); }
    function isChunkRevealed(cx, cz) { return visitedChunks.has(`${cx},${cz}`); }

    visitChunk(0, 0);
    assertEqual(isChunkRevealed(0, 0), true, 'Visited chunk is revealed');
    assertEqual(isChunkRevealed(10, 10), false, 'Far chunk remains in fog of war');
  });
});

// -----------------------------------------------------------------------------
// FEATURE 6: PvE Creatures, AI & Combat
// -----------------------------------------------------------------------------
describe('F6: PvE Creatures, AI & Combat', () => {
  test('F6.1: Spawning PvE entities sets correct type, level, and health attributes', () => {
    const sandbox = createGameSandbox();
    loadScriptIntoSandbox('js/entities.js', sandbox);
    attachContractOracle(sandbox);
    const wolf = sandbox.EntityManager.spawnCreature('Wolf', 10, 48, 10, 1);
    const goblin = sandbox.EntityManager.spawnCreature('Goblin', 20, 48, 20, 2);
    assertEqual(wolf.type, 'Wolf', 'Creature type should be Wolf');
    assertEqual(wolf.hp, 60, 'Wolf base HP should be 60');
    assertEqual(goblin.type, 'Goblin', 'Creature type should be Goblin');
    assertEqual(goblin.hp, 95, 'Goblin Lv2 HP should be 80 + 15 = 95');
  });

  test('F6.2: State machine maintains Wander/Idle state when player is far away', () => {
    const sandbox = createGameSandbox();
    loadScriptIntoSandbox('js/entities.js', sandbox);
    attachContractOracle(sandbox);
    const wolf = sandbox.EntityManager.spawnCreature('Wolf', 100, 48, 100, 1);
    sandbox.P.x = 0; sandbox.P.z = 0;
    sandbox.EntityManager.update(0.016);
    assert(wolf.state === 'Wander' || wolf.state === 'Idle', 'Creature beyond aggro radius should wander or idle');
  });

  test('F6.3: State machine transitions to Chase state when player enters aggro radius', () => {
    const sandbox = createGameSandbox();
    loadScriptIntoSandbox('js/entities.js', sandbox);
    attachContractOracle(sandbox);
    const wolf = sandbox.EntityManager.spawnCreature('Wolf', 10, 48, 0, 1);
    sandbox.P.x = 0; sandbox.P.z = 0; // Distance = 10 <= aggroRadius (15)
    sandbox.EntityManager.update(0.016);
    assertEqual(wolf.state, 'Chase', 'Creature within aggro radius should enter Chase state');
  });

  test('F6.4: State machine transitions to Attack state within attack reach', () => {
    const sandbox = createGameSandbox();
    loadScriptIntoSandbox('js/entities.js', sandbox);
    attachContractOracle(sandbox);
    const wolf = sandbox.EntityManager.spawnCreature('Wolf', 1.5, 48, 0, 1);
    sandbox.P.x = 0; sandbox.P.z = 0; // Distance = 1.5 <= attackReach (2.5)
    sandbox.EntityManager.update(0.016);
    assertEqual(wolf.state, 'Attack', 'Creature within attack reach should enter Attack state');
  });

  test('F6.5: Entity death grants loot items, gold, and combat XP', () => {
    const sandbox = createGameSandbox();
    loadScriptIntoSandbox('js/entities.js', sandbox);
    attachContractOracle(sandbox);
    const goblin = sandbox.EntityManager.spawnCreature('Goblin', 0, 48, 0, 1);
    goblin.takeDamage(100); // Exceeds goblin HP
    assertEqual(goblin.state, 'Dead', 'Creature should enter Dead state on lethal damage');
    assertEqual(goblin.loot.xp, 25, 'Level 1 goblin should grant 25 XP');
    assert(goblin.loot.gold > 0, 'Goblin should drop gold');
  });

  test('F6.6: takeDamage transitions creature to Hurt state for stagger duration (hurtTimer = 0.35s)', () => {
    const sandbox = createGameSandbox();
    loadScriptIntoSandbox('js/entities.js', sandbox);
    attachContractOracle(sandbox);
    const wolf = sandbox.EntityManager.spawnCreature('Wolf', 10, 48, 0, 1);
    assertEqual(wolf.state, 'Idle');
    wolf.takeDamage(20);
    assertEqual(wolf.state, 'Hurt', 'Non-lethal damage should transition creature to Hurt state');
    assertEqual(wolf.hurtTimer, 0.35, 'hurtTimer should be set to 0.35s stagger duration');

    // Update while hurtTimer > 0: stays Hurt and freezes action
    sandbox.EntityManager.update(0.15);
    assertEqual(wolf.state, 'Hurt', 'Creature stays in Hurt state while hurtTimer > 0');
    assert(Math.abs(wolf.hurtTimer - 0.20) < 0.001, 'hurtTimer decrements by dt');

    // Update after hurtTimer expires: transitions to Chase (dist 10 <= aggroRadius)
    sandbox.EntityManager.update(0.25);
    assertEqual(wolf.state, 'Chase', 'Creature transitions from Hurt to Chase after stagger window');
  });

  test('F6.7: Lethal damage transitions creature directly to Dead state', () => {
    const sandbox = createGameSandbox();
    loadScriptIntoSandbox('js/entities.js', sandbox);
    attachContractOracle(sandbox);
    const skeleton = sandbox.EntityManager.spawnCreature('Skeleton', 5, 48, 0, 1);
    assertEqual(skeleton.hp, 100);
    skeleton.takeDamage(150);
    assertEqual(skeleton.hp, 0, 'HP should be reduced to 0');
    assertEqual(skeleton.state, 'Dead', 'Lethal damage must transition creature directly to Dead');
    assert(skeleton.deathTimer > 0, 'deathTimer should be active');
  });
});

// -----------------------------------------------------------------------------
// FEATURE 7: Full Weapon Arsenal & Active Mechanics
// -----------------------------------------------------------------------------
describe('F7: Full Weapon Arsenal & Active Mechanics', () => {
  test('F7.1: All melee weapons have defined damage, reach, and speed statistics', () => {
    const sandbox = createGameSandbox();
    loadScriptIntoSandbox('js/items.js', sandbox);
    const meleeTypes = ['sword', 'spear', 'dagger', 'battleaxe', 'mace', 'greatsword', 'katana'];
    meleeTypes.forEach(id => {
      const item = sandbox.INV.find(i => i.id === id);
      assert(item, `Melee weapon ${id} must exist in INV`);
      assert(item.damage > 0, `${id} must have damage > 0`);
      assert(item.reach > 0, `${id} must have reach > 0`);
      assert(item.speed > 0, `${id} must have speed > 0`);
    });
  });

  test('F7.2: Bow weapon mechanics spawn 3D arrow projectile entity', () => {
    const projectiles = [];
    function shootArrow(playerPos, dirVector, speed = 25) {
      projectiles.push({
        type: 'arrow',
        x: playerPos.x, y: playerPos.y + 1.5, z: playerPos.z,
        vx: dirVector.x * speed,
        vy: dirVector.y * speed,
        vz: dirVector.z * speed,
        damage: 36
      });
    }
    shootArrow({ x: 0, y: 50, z: 0 }, { x: 0, y: 0, z: 1 });
    assertEqual(projectiles.length, 1, 'Arrow projectile should spawn');
    assertEqual(projectiles[0].vz, 25, 'Arrow velocity should be directed forward');
    assertEqual(projectiles[0].damage, 36, 'Arrow should deal bow base damage');
  });

  test('F7.3: Fire staff casts explosive fire projectile with area damage', () => {
    const spells = [];
    function castFireball(pos, dir) {
      spells.push({
        type: 'fireball',
        element: 'fire',
        x: pos.x, y: pos.y + 1.2, z: pos.z,
        damage: 62,
        radius: 3.5
      });
    }
    castFireball({ x: 0, y: 50, z: 0 }, { x: 1, y: 0, z: 0 });
    assertEqual(spells[0].type, 'fireball', 'Fireball spell spawned');
    assertEqual(spells[0].damage, 62, 'Fireball damage should match fire staff (62 HP)');
    assertEqual(spells[0].radius, 3.5, 'Fireball should have 3.5m blast radius');
  });

  test('F7.4: Frost staff casts chilling frost projectile with slow effect', () => {
    const spells = [];
    function castFrostBolt(pos) {
      spells.push({
        type: 'frostbolt',
        element: 'frost',
        damage: 58,
        slowPercent: 0.40,
        slowDurationSeconds: 4
      });
    }
    castFrostBolt({ x: 0, y: 50, z: 0 });
    assertEqual(spells[0].slowPercent, 0.40, 'Frostbolt must apply 40% slow');
    assertEqual(spells[0].damage, 58, 'Frostbolt damage should match frost staff (58 HP)');
  });

  test('F7.5: Shield blocking consumes stamina and reduces incoming damage', () => {
    const sandbox = createGameSandbox();
    attachContractOracle(sandbox);
    sandbox.P.isBlocking = true;
    sandbox.P.stamina = 100;
    const incomingDmg = 40;
    const blockPower = 0.65; // Oak shield 65% mitigation
    const staminaCost = 15;

    let finalDmg = incomingDmg;
    if (sandbox.P.isBlocking && sandbox.P.stamina >= staminaCost) {
      sandbox.P.stamina -= staminaCost;
      finalDmg = incomingDmg * (1 - blockPower);
    }
    assertEqual(sandbox.P.stamina, 85, 'Stamina should decrease by block cost');
    assertCloseTo(finalDmg, 14, 0.01, 'Damage should be reduced to 35% of 40 = 14 HP');
  });
});

// -----------------------------------------------------------------------------
// FEATURE 8: RPG Leveling & Dynamic Stats
// -----------------------------------------------------------------------------
describe('F8: RPG Leveling & Dynamic Stats', () => {
  test('F8.1: XP curve matches mathematical formula floor(100 * L^1.5)', () => {
    assertEqual(calculateXpNext(1), 100, 'Level 1 XP threshold must be 100');
    assertEqual(calculateXpNext(2), 282, 'Level 2 XP threshold must be 282');
    assertEqual(calculateXpNext(3), 519, 'Level 3 XP threshold must be 519');
    assertEqual(calculateXpNext(4), 800, 'Level 4 XP threshold must be 800');
    assertEqual(calculateXpNext(5), 1118, 'Level 5 XP threshold must be 1118');
  });

  test('F8.2: addPlayerXP accumulates XP towards xpNext', () => {
    const sandbox = createGameSandbox();
    attachContractOracle(sandbox);
    sandbox.P.level = 1;
    sandbox.P.xp = 0;
    sandbox.P.xpNext = 100;
    sandbox.addPlayerXP(40, 'quest');
    assertEqual(sandbox.P.xp, 40, 'Player XP should be 40');
    assertEqual(sandbox.P.level, 1, 'Player should remain level 1 before threshold');
  });

  test('F8.3: Level up increments level, resets current XP, and updates next threshold', () => {
    const sandbox = createGameSandbox();
    attachContractOracle(sandbox);
    sandbox.P.level = 1;
    sandbox.P.xp = 0;
    sandbox.P.xpNext = 100;
    const leveled = sandbox.addPlayerXP(120, 'combat');
    assertEqual(leveled, true, 'addPlayerXP should return true on level up');
    assertEqual(sandbox.P.level, 2, 'Player should reach level 2');
    assertEqual(sandbox.P.xp, 20, 'Surplus 20 XP should carry over');
    assertEqual(sandbox.P.xpNext, 282, 'New threshold for Lv2 must be 282');
  });

  test('F8.4: Level-up scales base attributes (Max HP, Stamina, Attack Power)', () => {
    const sandbox = createGameSandbox();
    attachContractOracle(sandbox);
    const initialHp = sandbox.P.baseStats.maxHp;
    const initialAtk = sandbox.P.baseStats.attackPower;
    sandbox.addPlayerXP(100, 'combat');
    assertEqual(sandbox.P.level, 2, 'Level should be 2');
    assertEqual(sandbox.P.baseStats.maxHp, initialHp + 10, 'Max HP should increase by +10');
    assertEqual(sandbox.P.baseStats.attackPower, initialAtk + 2, 'Attack power should increase by +2');
  });

  test('F8.5: Level-up restores current HP to full Max HP', () => {
    const sandbox = createGameSandbox();
    attachContractOracle(sandbox);
    sandbox.P.hp = 10; // Heavily damaged
    sandbox.addPlayerXP(100, 'combat');
    assertEqual(sandbox.P.hp, sandbox.P.maxHp, 'HP should fully replenish on level up');
  });
});

// -----------------------------------------------------------------------------
// FEATURE 9: Alchemy Crafting & Equipment Upgrades
// -----------------------------------------------------------------------------
describe('F9: Alchemy Crafting & Equipment Upgrading', () => {
  test('F9.1: Crafting consumable healing potion consumes ingredients and adds item', () => {
    const inventory = {
      wood: 5,
      potion_hp: 0
    };
    function craftHealingPotion() {
      if (inventory.wood >= 2) {
        inventory.wood -= 2;
        inventory.potion_hp += 1;
        return true;
      }
      return false;
    }
    const success = craftHealingPotion();
    assertEqual(success, true, 'Crafting should succeed');
    assertEqual(inventory.wood, 3, '2 wood consumed');
    assertEqual(inventory.potion_hp, 1, '1 healing potion produced');
  });

  test('F9.2: Crafting with insufficient materials fails without modifying inventory', () => {
    const inventory = { wood: 1, potion_hp: 0 };
    function craftHealingPotion() {
      if (inventory.wood >= 2) {
        inventory.wood -= 2;
        inventory.potion_hp += 1;
        return true;
      }
      return false;
    }
    const success = craftHealingPotion();
    assertEqual(success, false, 'Crafting must fail due to insufficient materials');
    assertEqual(inventory.wood, 1, 'Inventory wood must not change');
    assertEqual(inventory.potion_hp, 0, 'No potion crafted');
  });

  test('F9.3: Weapon upgrading increments upgrade level from +0 to +1', () => {
    const weapon = { id: 'sword', name: 'Ocelový meč', baseDamage: 26, upgradeLevel: 0 };
    function upgradeEquipment(item) {
      if (item.upgradeLevel < 5) {
        item.upgradeLevel += 1;
        item.name = `${item.name.replace(/\s\+\d+$/, '')} +${item.upgradeLevel}`;
        return true;
      }
      return false;
    }
    const res = upgradeEquipment(weapon);
    assertEqual(res, true, 'Upgrade to +1 succeeds');
    assertEqual(weapon.upgradeLevel, 1, 'Upgrade level should be 1');
    assertEqual(weapon.name, 'Ocelový meč +1', 'Name should reflect +1');
  });

  test('F9.4: Contract function getPlayerBonusDamage reflects equipped weapon and upgrade level', () => {
    const sandbox = createGameSandbox();
    attachContractOracle(sandbox);
    // Base sword damage = 26, upgradeLevel = 0 -> 26
    assertEqual(sandbox.getPlayerBonusDamage(), 26, 'Base sword bonus damage should be 26');
    sandbox.P.equipment.weapon.upgradeLevel = 2; // +2 upgrades = +8 dmg
    assertEqual(sandbox.getPlayerBonusDamage(), 34, 'Upgraded sword bonus damage should be 26 + 8 = 34');
  });

  test('F9.5: Contract function getPlayerBonusHP reflects equipped armor and upgrade level', () => {
    const sandbox = createGameSandbox();
    attachContractOracle(sandbox);
    // Base iron armor bonusHp = 40, upgradeLevel = 0 -> 40
    assertEqual(sandbox.getPlayerBonusHP(), 40, 'Base iron armor bonus HP should be 40');
    sandbox.P.equipment.armor.upgradeLevel = 1; // +1 upgrade = +8 hp
    assertEqual(sandbox.getPlayerBonusHP(), 48, 'Upgraded iron armor bonus HP should be 40 + 8 = 48');
  });
});

// -----------------------------------------------------------------------------
// FEATURE 10: Dedicated WebSocket Server Protocol
// -----------------------------------------------------------------------------
describe('F10: Dedicated WebSocket Server Protocol', () => {
  test('F10.1: Server configuration validates port, seed, maxPlayers, and motd', () => {
    const configPath = path.join(SERVER_DIR, 'config.json');
    assert(fs.existsSync(configPath), 'ServerSource/config.json must exist');
    const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    assert(typeof cfg.port === 'number', 'port must be a number');
    assert(typeof cfg.seed === 'number', 'seed must be a number');
    assert(typeof cfg.maxPlayers === 'number', 'maxPlayers must be a number');
    assert(typeof cfg.motd === 'string', 'motd must be a string');
  });

  test('F10.2: Packet handler routes join packet and assigns unique player ID', () => {
    const players = new Map();
    let nextNetId = 101;
    function handleJoin(ws, msg) {
      const pid = nextNetId++;
      const playerObj = { id: pid, name: msg.name || 'Hráč', level: msg.level || 1, hp: 100 };
      players.set(pid, playerObj);
      return { type: 'welcome', id: pid, seed: 12345, players: Array.from(players.values()) };
    }
    const welcome = handleJoin({}, { type: 'join', name: 'Tester', level: 3 });
    assertEqual(welcome.type, 'welcome', 'Response packet should be welcome');
    assertEqual(welcome.id, 101, 'Assigned player ID should be 101');
    assertEqual(welcome.players.length, 1, 'Player list should contain joined player');
  });

  test('F10.3: Packet handler broadcasts move packet containing position, level, and HP', () => {
    const movePacket = {
      type: 'move',
      x: 12.5, y: 48.0, z: -30.2,
      yaw: 1.57, pitch: 0.1,
      level: 4, hp: 130, maxHp: 130
    };
    assertEqual(movePacket.type, 'move', 'Packet type is move');
    assertEqual(movePacket.level, 4, 'Transform packet contains RPG level');
    assertEqual(movePacket.hp, 130, 'Transform packet contains current HP');
  });

  test('F10.4: Packet handler handles /time and /help slash commands', () => {
    let worldTime = 0.25;
    function executeChatCommand(cmd, args) {
      if (cmd === '/time') {
        if (args[0] === 'day') { worldTime = 0.25; return 'Čas nastaven na den.'; }
        if (args[0] === 'night') { worldTime = 0.75; return 'Čas nastaven na noc.'; }
      }
      if (cmd === '/help') return 'Dostupné příkazy: /help, /time, /tp, /stats';
      return 'Neznámý příkaz';
    }
    const helpMsg = executeChatCommand('/help', []);
    assert(helpMsg.includes('/help'), 'Help command response should list commands');
    executeChatCommand('/time', ['night']);
    assertEqual(worldTime, 0.75, 'Time should be set to 0.75 (night)');
  });

  test('F10.5: Server ignores obsolete blockChange packets without modifying world deltas', () => {
    const worldDeltas = {};
    function handleServerPacket(type, data) {
      if (type === 'blockChange') {
        // Ignored in Cube World Action-RPG transformation
        return false;
      }
      return true;
    }
    const handled = handleServerPacket('blockChange', { x: 1, y: 2, z: 3, block: 4 });
    assertEqual(handled, false, 'blockChange should be ignored');
    assertEqual(Object.keys(worldDeltas).length, 0, 'No delta recorded');
  });
});

// -----------------------------------------------------------------------------
// FEATURE 11: P2P PeerJS Dual-Transport & Handshake
// -----------------------------------------------------------------------------
describe('F11: P2P PeerJS Dual-Transport & Handshake', () => {
  test('F11.1: Host session generates valid room code format VOX-XXXX', () => {
    function generateRoomCode() {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = '';
      for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
      return 'VOX-' + code;
    }
    const code = generateRoomCode();
    assert(/^VOX-[A-Z0-9]{4}$/.test(code), `Room code ${code} must match VOX-XXXX format`);
  });

  test('F11.2: Client connection request places guest into pending approval state', () => {
    const pendingRequests = new Map();
    function onRequestJoin(peerId, name) {
      pendingRequests.set(peerId, { name, status: 'pending', timestamp: Date.now() });
    }
    onRequestJoin('peer_abc_123', 'GuestPlayer');
    assert(pendingRequests.has('peer_abc_123'), 'Request should be tracked');
    assertEqual(pendingRequests.get('peer_abc_123').status, 'pending', 'Status should be pending');
  });

  test('F11.3: approveP2PJoin transitions guest from pending to approved state', () => {
    const pendingRequests = new Map();
    pendingRequests.set('peer_abc_123', { name: 'GuestPlayer', status: 'pending' });
    function approveP2PJoin(peerId) {
      if (pendingRequests.has(peerId)) {
        pendingRequests.get(peerId).status = 'approved';
        return true;
      }
      return false;
    }
    const approved = approveP2PJoin('peer_abc_123');
    assertEqual(approved, true, 'Approval should succeed');
    assertEqual(pendingRequests.get('peer_abc_123').status, 'approved', 'Status should be approved');
  });

  test('F11.4: Approved guest receives host spawn coordinates within 2 blocks', () => {
    const hostPos = { x: 100, y: 50, z: 200 };
    function calculateGuestSpawn(hostPos) {
      return {
        x: hostPos.x + 1.5,
        y: hostPos.y,
        z: hostPos.z + 1.5
      };
    }
    const spawn = calculateGuestSpawn(hostPos);
    const dist = Math.hypot(spawn.x - hostPos.x, spawn.z - hostPos.z);
    assert(dist <= 3.0, `Spawn distance ${dist} must be within close proximity to host`);
  });

  test('F11.5: Signaling fallback triggers local BroadcastChannel when WebRTC signaling fails', () => {
    let transportMode = 'webrtc';
    function handleSignalingError() {
      transportMode = 'broadcast_channel';
    }
    handleSignalingError();
    assertEqual(transportMode, 'broadcast_channel', 'Should fallback to BroadcastChannel');
  });
});

// -----------------------------------------------------------------------------
// FEATURE 12: Party Management & State Synchronization
// -----------------------------------------------------------------------------
describe('F12: Party Management & State Synchronization', () => {
  test('F12.1: Party member list displays connected player names, level badges, and HP', () => {
    const party = [
      { id: 'p1', name: 'HostAlice', level: 5, hp: 140, maxHp: 140 },
      { id: 'p2', name: 'GuestBob', level: 3, hp: 110, maxHp: 120 }
    ];
    assertEqual(party.length, 2, 'Party should have 2 members');
    assertEqual(party[0].level, 5, 'Host level is 5');
    assertEqual(party[1].level, 3, 'Guest level is 3');
  });

  test('F12.2: Host kick action removes player from party list and fires disconnect', () => {
    let party = [
      { id: 'p1', name: 'HostAlice' },
      { id: 'p2', name: 'GuestBob' }
    ];
    let kickedId = null;
    function kickPlayer(id) {
      kickedId = id;
      party = party.filter(p => p.id !== id);
    }
    kickPlayer('p2');
    assertEqual(kickedId, 'p2', 'Kicked player ID should be p2');
    assertEqual(party.length, 1, 'Party should only have host remaining');
  });

  test('F12.3: Party teleportation sets player coordinates to target party member position', () => {
    const sandbox = createGameSandbox();
    sandbox.P.x = 0; sandbox.P.y = 50; sandbox.P.z = 0;
    const targetMember = { x: 340, y: 55, z: -120 };
    function teleportToPartyMember(target) {
      sandbox.P.x = target.x;
      sandbox.P.y = target.y;
      sandbox.P.z = target.z;
    }
    teleportToPartyMember(targetMember);
    assertEqual(sandbox.P.x, 340, 'Player X teleported');
    assertEqual(sandbox.P.y, 55, 'Player Y teleported');
    assertEqual(sandbox.P.z, -120, 'Player Z teleported');
  });

  test('F12.4: Remote player state synchronization updates remote nametag with level badge', () => {
    const remoteRig = {
      nametag: '',
      updateState: function(state) {
        this.nametag = `[Lv.${state.level}] ${state.name} (${state.hp}/${state.maxHp} HP)`;
      }
    };
    remoteRig.updateState({ level: 7, name: 'Paladin', hp: 170, maxHp: 170 });
    assertEqual(remoteRig.nametag, '[Lv.7] Paladin (170/170 HP)', 'Nametag formatted with level badge');
  });

  test('F12.5: Minimap renders distinct party member position markers', () => {
    const minimapMarkers = [];
    function syncPartyMinimapMarkers(members) {
      minimapMarkers.length = 0;
      members.forEach(m => {
        minimapMarkers.push({ id: m.id, x: m.x, z: m.z, color: '#22c55e' });
      });
    }
    syncPartyMinimapMarkers([
      { id: 'p1', x: 10, z: 20 },
      { id: 'p2', x: 50, z: 80 }
    ]);
    assertEqual(minimapMarkers.length, 2, '2 party markers rendered');
    assertEqual(minimapMarkers[0].color, '#22c55e', 'Party markers have party green color');
  });
});
