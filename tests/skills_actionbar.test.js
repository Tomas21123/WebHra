/**
 * =============================================================================
 * VERIFICATION SUITE: ACTION BAR (5 SLOTS), RMB REMAPPING & WEAPON SKILLS
 * =============================================================================
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { describe, test, assert, assertEqual, runSuites } = require('./test_utils');
const { createGameSandbox } = require('./test_harness');

const PROJECT_ROOT = path.resolve(__dirname, '..');

function createSkillsSandbox() {
  const sandbox = createGameSandbox();
  sandbox.$ = id => sandbox.document.getElementById(id);
  sandbox.playAttackSound = sound => sandbox.soundEvents.push(sound);
  sandbox.soundEvents = [];
  sandbox.toasts = [];
  sandbox.toast = msg => sandbox.toasts.push(msg);
  sandbox.ui = () => {};
  sandbox.updatePlayerAppearance = () => {};
  sandbox.updateInventoryPreview = () => {};
  sandbox.CS = 16;
  sandbox.H = 128;
  sandbox.SEA = 32;
  sandbox.S = 1;
  sandbox.height = () => 45;
  sandbox.biome = () => 0;
  sandbox.FACES = [
    { n: [1, 0, 0], u: [0, 1, 0], v: [0, 0, 1], uy: 1, s: 0.82, k: 0 },
    { n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0], uy: 0, s: 0.7, k: 0 },
    { n: [0, 1, 0], u: [0, 0, 1], v: [1, 0, 0], uy: 0, s: 1, k: 1 },
    { n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1], uy: 0, s: 0.5, k: 2 },
    { n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0], uy: 0, s: 0.9, k: 0 },
    { n: [0, 0, -1], u: [0, 1, 0], v: [1, 0, 0], uy: 1, s: 0.74, k: 0 }
  ];
  sandbox.CORN = [[-1, -1], [1, -1], [1, 1], [-1, 1]];

  const winListeners = {};
  sandbox.addEventListener = (ev, fn) => {
    if (!winListeners[ev]) winListeners[ev] = [];
    winListeners[ev].push(fn);
  };
  sandbox.dispatchEvent = (ev) => {
    if (winListeners[ev.type]) winListeners[ev.type].forEach(fn => fn(ev));
  };

  sandbox.THREE.Color.prototype.set = function(v) { return this; };
  sandbox.THREE.Float32BufferAttribute = class { constructor(a, s) { this.array = a; this.itemSize = s; } };
  sandbox.THREE.Uint32BufferAttribute = class { constructor(a, s) { this.array = a; this.itemSize = s; } };
  sandbox.THREE.BufferGeometry = class {
    constructor() { this.attributes = {}; }
    setAttribute(n, a) { this.attributes[n] = a; return this; }
    setIndex(i) { this.index = i; return this; }
    computeVertexNormals() {}
    computeBoundingSphere() {}
    dispose() {}
  };
  sandbox.THREE.Object3D.prototype.clone = function() { return new this.constructor(); };
  sandbox.THREE.Vector3.prototype.setScalar = function(s) { this.x = s; this.y = s; this.z = s; return this; };
  sandbox.THREE.MeshLambertMaterial = sandbox.THREE.MeshBasicMaterial;
  sandbox.THREE.CanvasTexture = class { constructor(c) { this.image = c; } dispose() {} };
  sandbox.THREE.PointLight = class extends sandbox.THREE.Object3D {};
  sandbox.THREE.AmbientLight = class extends sandbox.THREE.Object3D {};
  sandbox.THREE.DirectionalLight = class extends sandbox.THREE.Object3D {};
  sandbox.matSolid = new sandbox.THREE.MeshBasicMaterial();
  sandbox.matTrans = new sandbox.THREE.MeshBasicMaterial();
  sandbox.matWater = new sandbox.THREE.MeshBasicMaterial();

  const origCreateElement = sandbox.document.createElement;
  sandbox.document.createElement = function(tag) {
    const el = origCreateElement(tag);
    if (tag.toLowerCase() === 'canvas') {
      el.toDataURL = () => 'data:image/png;base64,mock';
      el.getContext = () => ({
        fillStyle: '#000',
        strokeStyle: '#000',
        lineWidth: 1,
        font: '12px sans-serif',
        textAlign: 'center',
        fillRect: () => {},
        strokeRect: () => {},
        fillText: () => {},
        clearRect: () => {},
        getImageData: () => ({ data: new Uint8Array(16 * 16 * 4) }),
        putImageData: () => {}
      });
    }
    return el;
  };

  if (sandbox.$('p2pModal')) sandbox.$('p2pModal').hidden = true;
  if (sandbox.$('inv')) sandbox.$('inv').hidden = true;

  const context = vm.createContext(sandbox);
  const scripts = [
    'js/config.js',
    'js/storage.js',
    'js/textures.js',
    'js/world.js',
    'js/voxelBuilder.js',
    'js/items.js',
    'js/skills.js',
    'js/customizer.js',
    'js/character.js',
    'js/inventory.js',
    'js/player.js',
    'js/minimap.js',
    'js/entities.js',
    'js/chat.js'
  ];

  for (const rel of scripts) {
    const full = path.join(PROJECT_ROOT, rel);
    vm.runInContext(fs.readFileSync(full, 'utf8'), context, { filename: full });
  }

  vm.runInContext(`
    window.S = S;
    window.CS = CS;
    window.H = H;
    window.SEA = SEA;
    window.TILES = TILES;
    window.INV = INV;
    window.EQUIPPED_SLOTS = EQUIPPED_SLOTS;
    window.isAttacking = () => attacking;
    window.setAttacking = (v) => { attacking = v; };
    window.getActiveAttackHand = () => activeAttackHand;
    window.G = G;
  `, context);

  return sandbox;
}

describe('1. Two Basic Attacks per Weapon (Fast LMB & Heavy Body-Motion RMB), Cooldowns & Non-Interruptible Animations', () => {
  test('1.1: Every weapon has a fast attack on LMB (Slot 1) and a slower heavy attack with physical body movement on RMB (Slot 2), and active animations cannot be interrupted', () => {
    const sb = createSkillsSandbox();
    const cv = sb.document.createElement('canvas');
    sb.initPlayerControls(cv);

    // Equip sword in dominant hand and dagger in off-hand
    sb.equipToSlot('sword', 'hand_r');
    sb.equipToSlot('dagger', 'hand_l');

    // 1. LMB (Mouse0) -> Slot 1: Fast light attack
    cv.dispatchEvent({ type: 'mousedown', button: 0 });
    assertEqual(sb.isAttacking(), true, 'LMB triggers attack');
    assertEqual(sb.getAttackType(), 'light', 'LMB triggers fast light attack');
    assertEqual(sb.getActiveAttackHand(), 'dominant', 'LMB uses dominant hand');
    assert(sb.PlayerSkillsData.isOnCooldown('basic_sword_slash'), 'Primary attack enters cooldown');

    // 2. While LMB animation is still active (attacking === true), RMB cannot interrupt it!
    sb.P.vx = 0;
    sb.P.vz = 0;
    cv.dispatchEvent({ type: 'mousedown', button: 2 });
    assertEqual(sb.getAttackType(), 'light', 'Active light attack animation CANNOT be interrupted by RMB heavy attack');
    assertEqual(Math.hypot(sb.P.vx, sb.P.vz), 0, 'Blocked RMB did not apply heavy impulse');

    // 3. Once the light attack animation finishes (attacking = false), RMB triggers Slot 2 heavy attack with body movement
    sb.setAttacking(false);
    cv.dispatchEvent({ type: 'mousedown', button: 2 });
    assertEqual(sb.isAttacking(), true, 'RMB triggers Slot 2 heavy attack after previous animation finishes');
    assertEqual(sb.getAttackType(), 'heavy', 'RMB triggers heavy attack');
    assertEqual(sb.getActiveAttackHand(), 'dominant', 'RMB uses dominant weapon (not off-hand)');
    assert(Math.hypot(sb.P.vx, sb.P.vz) > 4.0, 'Heavy attack on RMB applies physical body movement impulse');
    assert(sb.PlayerSkillsData.isOnCooldown('sec_sword_heavy_lunge'), 'Secondary heavy attack enters cooldown');

    // 4. Even if animation finishes early, cooldown prevents immediate re-cast of the heavy attack
    sb.setAttacking(false);
    const reCastHeavy = sb.ActionBarManager.triggerSlot(1);
    assertEqual(reCastHeavy, false, 'Heavy attack cannot be re-cast while on cooldown');
  });

  test('1.2: RMB (Mouse2) can be remapped to any Action Bar slot (e.g., Slot 3 Weapon Skill)', () => {
    const sb = createSkillsSandbox();
    const cv = sb.document.createElement('canvas');
    sb.initPlayerControls(cv);

    sb.equipToSlot('sword', 'hand_r');
    sb.PlayerSkillsData.setWeaponSkillSlot('sword', 0, 'sword_whirlwind');

    // Remap Mouse2 to Slot 3 (index 2) secondary bind
    sb.KeybindManager.setBind(2, 'secondary', 'Mouse2');
    assertEqual(sb.KeybindManager.findSlotByInputCode('Mouse2'), 2, 'Mouse2 must resolve to Slot 3 (index 2)');
    assertEqual(sb.KeybindManager.getSlotBinds(1).secondary, null, 'Conflict resolution must clear Mouse2 from Slot 2');

    // Clicking RMB now triggers Slot 3 skill (Whirlwind)
    const initialSt = sb.G.st;
    cv.dispatchEvent({ type: 'mousedown', button: 2 });
    assert(sb.G.st < initialSt, 'RMB triggered bound skill in Slot 3 and consumed stamina');
    assert(sb.PlayerSkillsData.isOnCooldown('sword_whirlwind'), 'Skill in Slot 3 entered cooldown after RMB press');
  });
});

describe('2. Dynamic 5-Slot Action Bar & Dual Keybinds', () => {
  test('2.1: Action Bar has fixed size of 5 slots and dynamically updates when dominant weapon changes', () => {
    const sb = createSkillsSandbox();

    sb.equipToSlot('sword', 'hand_r');
    let defs = sb.ActionBarManager.getSlotDefinitions();
    assertEqual(defs.length, 5, 'Action Bar must always have exactly 5 slots');
    assertEqual(defs[0].kind, 'primary');
    assertEqual(defs[1].kind, 'secondary');
    assert(defs[0].title.includes('Seknutí'), 'Sword Slot 1 title reflects sword primary attack');

    // Switch dominant weapon to staff_fire
    sb.equipToSlot('staff_fire', 'hand_r');
    defs = sb.ActionBarManager.getSlotDefinitions();
    assertEqual(defs.length, 5);
    assert(defs[0].title.includes('Magický výboj'), 'Staff Slot 1 title dynamically updates to staff attack');
  });

  test('2.2: Default keybinds support independent Primary and Secondary binds per slot', () => {
    const sb = createSkillsSandbox();
    sb.KeybindManager.resetToDefaults();

    const s1 = sb.KeybindManager.getSlotBinds(0);
    const s2 = sb.KeybindManager.getSlotBinds(1);
    const s3 = sb.KeybindManager.getSlotBinds(2);
    const s4 = sb.KeybindManager.getSlotBinds(3);
    const s5 = sb.KeybindManager.getSlotBinds(4);

    assertEqual(s1.primary, 'Digit1');
    assertEqual(s1.secondary, 'Mouse0');
    assertEqual(s2.primary, 'Digit2');
    assertEqual(s2.secondary, 'Mouse2');
    assertEqual(s3.primary, 'Digit3');
    assertEqual(s3.secondary, null);
    assertEqual(s4.primary, 'Digit4');
    assertEqual(s5.primary, 'Digit5');
  });
});

describe('3. Weapon Skill Slots (3 Slots per Weapon) & Subcategory Filtering', () => {
  test('3.1: Each weapon has 3 skill slots filtered by weapon subcategory and projected into Action Bar Slots 3-5', () => {
    const sb = createSkillsSandbox();
    sb.equipToSlot('sword', 'hand_r');

    const swordSkills = sb.PlayerSkillsData.getUnlockedSkillsForSubcat('sword');
    const axeSkills = sb.PlayerSkillsData.getUnlockedSkillsForSubcat('axe');
    assert(swordSkills.length >= 3, 'Sword subcategory has its own skill pool');
    assert(axeSkills.length >= 3, 'Axe subcategory has its own skill pool');
    assert(swordSkills.every(s => s.weaponSubcat === 'sword'), 'Filtered skills only belong to sword');

    // Attempt to bind an axe skill to a sword -> rejected
    const invalidBind = sb.PlayerSkillsData.setWeaponSkillSlot('sword', 0, axeSkills[0].id);
    assertEqual(invalidBind, false, 'Cannot bind axe skill onto a sword');

    // Bind 3 sword skills to sword slots 0, 1, 2
    assertEqual(sb.PlayerSkillsData.setWeaponSkillSlot('sword', 0, swordSkills[0].id), true);
    assertEqual(sb.PlayerSkillsData.setWeaponSkillSlot('sword', 1, swordSkills[1].id), true);
    assertEqual(sb.PlayerSkillsData.setWeaponSkillSlot('sword', 2, swordSkills[2].id), true);

    // Check projection into Action Bar Slots 3-5 (indices 2, 3, 4)
    const defs = sb.ActionBarManager.getSlotDefinitions();
    assertEqual(defs[2].kind, 'skill');
    assertEqual(defs[2].skill.id, swordSkills[0].id);
    assertEqual(defs[3].skill.id, swordSkills[1].id);
    assertEqual(defs[4].skill.id, swordSkills[2].id);
  });
});

describe('4. Inventory UI - Skills Section (Dovednosti)', () => {
  test('4.1: PlayerSkillsData.getAllUnlockedSkillsGrouped returns unlocked skills organized by weapon categories', () => {
    const sb = createSkillsSandbox();
    const grouped = sb.PlayerSkillsData.getAllUnlockedSkillsGrouped();
    for (const subcat of ['sword', 'axe', 'spear', 'staff', 'bow', 'dagger', 'blunt']) {
      assert(Array.isArray(grouped[subcat]) && grouped[subcat].length > 0, `Category ${subcat} must have unlocked skills`);
    }
  });
});

describe('5. Voxel Buildings & Map Click-to-Teleport Prompt', () => {
  test('5.1: All world POI buildings (Shrine, Ruins, Camp, Landmark, Chest) stamp real voxel blocks into chunks', () => {
    const sb = createSkillsSandbox();

    assert(sb.TILES[33] && sb.TILES[34] && sb.TILES[35] && sb.TILES[36] && sb.TILES[37], 'Architectural voxel block textures 33-37 are registered');

    for (const type of ['Shrine', 'Ruins', 'Camp', 'Landmark', 'Chest']) {
      const placed = [];
      const poi = { id: `test_${type}`, type, name: `Test ${type}`, x: 8, y: 45, z: 8, bx: 8, by: 45, bz: 8, discovered: false };
      sb.POIManager.instances.set('0,0', poi);
      sb.POIManager.pois = [poi];
      sb.POIManager.stampChunkStructures(0, 0, (wx, wy, wz, id) => {
        if (id > 0) placed.push({ wx, wy, wz, id });
      });
      assert(placed.length > 20, `${type} must stamp real voxel blocks into the chunk (stamped ${placed.length} blocks)`);
      const hasArchBlock = placed.some(b => [6, 11, 23, 33, 34, 35, 36, 37].includes(b.id));
      assert(hasArchBlock, `${type} must use architectural voxel blocks`);
    }
  });

  test('5.2: Teleportation is strictly restricted to discovered buildings only', () => {
    const sb = createSkillsSandbox();

    const shrinePoi = { id: 'poi_shrine_1', type: 'Shrine', name: 'Prastará svatyně #1', x: 160, y: 45, z: 240, bx: 160, by: 45, bz: 240, discovered: false };
    sb.POIManager.pois = [shrinePoi];
    sb.POIManager.instances.set('1,1', shrinePoi);
    sb.POIManager.discoveredPOIs.clear();

    // 1. Undiscovered POI cannot open teleport prompt AND cannot be teleported to directly
    const blockedPrompt = sb.openMinimapTeleportPrompt(shrinePoi);
    assertEqual(blockedPrompt, null, 'Undiscovered building must not open teleport prompt');
    const blockedDirect = sb.POIManager.teleportToPOI(shrinePoi);
    assertEqual(blockedDirect, false, 'Undiscovered building must reject direct teleportation');

    // 2. Discover the building
    sb.POIManager.discoverPOI(shrinePoi.id);
    assertEqual(sb.POIManager.isDiscovered(shrinePoi.id), true, 'Building is now discovered');

    // 3. Click on the discovered building marker on the map -> opens confirmation prompt
    const opened = sb.openMinimapTeleportPrompt(shrinePoi);
    assert(opened && opened.id === 'poi_shrine_1', 'Discovered building opens teleport confirmation prompt');

    // 4. Confirm teleportation -> teleports player in front of the building
    sb.P.x = 0;
    sb.P.z = 0;
    const tpOk = sb.confirmMinimapTeleport();
    assertEqual(tpOk, true, 'confirmMinimapTeleport succeeds for discovered building');
    const distAfter = Math.hypot(sb.P.x / sb.S - shrinePoi.x, sb.P.z / sb.S - shrinePoi.z);
    assert(distAfter <= 12, `Player should be teleported right in front of the building (dist=${distAfter})`);
  });

  test('5.3: Teleportation never leaves player stuck in a block and resolvePlayerStuck frees any overlapping hitbox', () => {
    const sb = createSkillsSandbox();

    for (const type of ['Shrine', 'Ruins', 'Camp', 'Landmark', 'Chest']) {
      const poi = { id: `poi_tp_${type}`, type, name: `Test ${type}`, x: 80, y: 47, z: 80, bx: 80, by: 47, bz: 80, discovered: true };
      sb.POIManager.instances.set('0,0', poi);
      sb.POIManager.pois = [poi];
      sb.POIManager.discoveredPOIs.add(poi.id);

      const ok = sb.POIManager.teleportToPOI(poi);
      assertEqual(ok, true, `Teleport to ${type} succeeds`);
      assertEqual(sb.hits(sb.P.x, sb.P.y, sb.P.z), false, `Player hitbox must be 100% free of solid blocks after teleporting to ${type}`);
    }

    // Simulate player getting wedged inside a solid block -> resolvePlayerStuck must free them
    const bx = Math.floor(sb.P.x / sb.S);
    const by = Math.floor(sb.P.y / sb.S);
    const bz = Math.floor(sb.P.z / sb.S);
    const ch = sb.getChunk(bx >> 4, bz >> 4);
    ch.d[(bx & 15) + (bz & 15) * sb.CS + by * 256] = 33; // Place solid stone block right inside player's feet
    assertEqual(sb.hits(sb.P.x, sb.P.y, sb.P.z), true, 'Player is initially stuck inside a block');

    const unstuck = sb.resolvePlayerStuck();
    assertEqual(unstuck, true, 'resolvePlayerStuck detects and resolves the collision');
    assertEqual(sb.hits(sb.P.x, sb.P.y, sb.P.z), false, 'Player is completely free of blocks after resolvePlayerStuck');
  });
});

describe('6. Chat /spawn Command, Wild Animals, Taming & Pet Riding (Key R)', () => {
  test('6.1: /spawn <název moba> spawns any mob or animal in front of the player (Czech & English names)', () => {
    const sb = createSkillsSandbox();
    sb.EntityManager.clearAll();
    sb.P.x = 10;
    sb.P.y = 45;
    sb.P.z = 10;
    sb.yaw = 0;

    const queries = [
      { q: 'ovcak', expected: 'DogShepherd' },
      { q: 'husky', expected: 'DogHusky' },
      { q: 'jezevcik', expected: 'DogDachshund' },
      { q: 'kocka', expected: 'Cat' },
      { q: 'krava', expected: 'Cow' },
      { q: 'ovce', expected: 'Sheep' },
      { q: 'kozel', expected: 'Goat' },
      { q: 'veverka', expected: 'Squirrel' },
      { q: 'goblin', expected: 'Goblin' }
    ];

    for (const item of queries) {
      const beforeCount = sb.EntityManager.creatures.length;
      const ok = sb.executeCommand(`/spawn ${item.q}`);
      assertEqual(ok, true, `/spawn ${item.q} command succeeds`);
      assertEqual(sb.EntityManager.creatures.length, beforeCount + 1, `/spawn ${item.q} adds 1 creature`);
      const spawned = sb.EntityManager.creatures[sb.EntityManager.creatures.length - 1];
      assertEqual(spawned.type, item.expected, `/spawn ${item.q} resolves to ${item.expected}`);
      const dist = Math.hypot(spawned.x - sb.P.x, spawned.z - sb.P.z);
      assert(dist > 1.5 && dist < 6.0, `Spawned ${item.expected} is directly in front of player (dist=${dist})`);
    }
  });

  test('6.2: Each animal is tamed with its dedicated item and placed into the Mazlíčci (pets) inventory category', () => {
    const sb = createSkillsSandbox();
    sb.EntityManager.clearAll();
    sb.P.x = 0;
    sb.P.y = 45;
    sb.P.z = 0;

    const pairs = [
      { type: 'DogShepherd', tameItem: 'tame_bone', petId: 'pet_dog_shepherd' },
      { type: 'DogHusky', tameItem: 'tame_bone', petId: 'pet_dog_husky' },
      { type: 'DogDachshund', tameItem: 'tame_bone', petId: 'pet_dog_dachshund' },
      { type: 'Cat', tameItem: 'tame_fish', petId: 'pet_cat' },
      { type: 'Cow', tameItem: 'tame_wheat', petId: 'pet_cow' },
      { type: 'Sheep', tameItem: 'tame_clover', petId: 'pet_sheep' },
      { type: 'Goat', tameItem: 'tame_apple', petId: 'pet_goat' },
      { type: 'Squirrel', tameItem: 'tame_acorn', petId: 'pet_squirrel' }
    ];

    for (const pair of pairs) {
      sb.EntityManager.clearAll();
      const tameInvItem = sb.INV.find(i => i.id === pair.tameItem);
      const petInvItem = sb.INV.find(i => i.id === pair.petId);
      assert(tameInvItem, `Taming item ${pair.tameItem} exists in INV`);
      assert(petInvItem && petInvItem.cat === 'pets' && petInvItem.slot === 'pet', `Pet item ${pair.petId} exists in 'pets' category with 'pet' slot`);

      tameInvItem.count = 2;
      petInvItem.count = 0;

      // Spawn the wild animal within taming range
      sb.EntityManager.spawnCreature(pair.type, 1.5, 45, 1.5, 1);
      assertEqual(sb.EntityManager.creatures.length, 1);

      // Tame the animal
      const tamed = sb.EntityManager.tryTameClosest(sb.P.x, sb.P.y, sb.P.z);
      assertEqual(tamed, true, `Taming ${pair.type} with ${pair.tameItem} succeeds`);
      assertEqual(tameInvItem.count, 1, `1 ${pair.tameItem} consumed upon taming`);
      assertEqual(petInvItem.count, 1, `Player receives 1 ${pair.petId} in Mazlíčci category`);
      assertEqual(sb.EntityManager.creatures.length, 0, `Wild ${pair.type} is removed from world after being tamed`);
    }
  });

  test('6.3: Equipping a pet into the pet slot and pressing R summons the pet and mounts it for riding', () => {
    const sb = createSkillsSandbox();
    sb.EntityManager.clearAll();
    sb.P.x = 10;
    sb.P.y = 45;
    sb.P.z = 10;

    const huskyItem = sb.INV.find(i => i.id === 'pet_dog_husky');
    huskyItem.count = 1;

    // Equip Husky into the dedicated 'pet' slot
    sb.equipToSlot('pet_dog_husky', 'pet');
    assertEqual(sb.EQUIPPED_SLOTS.pet, 'pet_dog_husky', 'Husky is equipped in EQUIPPED_SLOTS.pet');

    // Press R (PetManager.handleKeyR) -> summons pet next to player and mounts it!
    const rOk = sb.PetManager.handleKeyR();
    assertEqual(rOk, true, 'handleKeyR summons and mounts equipped pet');
    assert(sb.PetManager.activePet !== null, 'Active pet entity is spawned in the world');
    assertEqual(sb.PetManager.isRiding, true, 'Player is now riding the pet');
    assertEqual(sb.P.isRiding, true, 'P.isRiding flag is active');
    assert(sb.P.rideSpeed > 9.0, 'Riding pet increases player movement speed');
    assert(sb.P.rideJumpBoost > 9.5, 'Riding pet increases player jump height');

    // Update PetManager while riding -> pet follows player position seamlessly
    sb.P.x = 22;
    sb.P.z = 28;
    sb.PetManager.update(0.016, 1000);
    assertEqual(sb.PetManager.activePet.x, 22, 'Mounted pet X syncs with rider');
    assertEqual(sb.PetManager.activePet.z, 28, 'Mounted pet Z syncs with rider');

    // Pressing E (interactClosestPet) dismounts the pet while keeping it summoned nearby
    const dismounted = sb.PetManager.interactClosestPet(sb.P.x, sb.P.y, sb.P.z);
    assertEqual(dismounted, true, 'interactClosestPet dismounts when riding');
    assertEqual(sb.P.isRiding, false, 'Player is no longer riding after dismount');
    assert(sb.PetManager.activePet !== null, 'Pet remains summoned next to player after dismount');

    // Pressing R again while already riding recalls (despawns) the pet
    sb.PetManager.handleKeyR(); // mounts again
    assertEqual(sb.P.isRiding, true);
    sb.PetManager.handleKeyR(); // despawns
    assertEqual(sb.P.isRiding, false, 'Second R press while riding recalls pet');
    assertEqual(sb.PetManager.activePet, null, 'Active pet is despawned when recalled');
  });

  test('6.4: Animals and mobs stand above ground surface (height + 1) * S without sinking and feature 3D eyes, head & hip-pivoted legs', () => {
    const sb = createSkillsSandbox();
    sb.EntityManager.clearAll();
    sb.P.x = 10;
    sb.P.y = 45;
    sb.P.z = 10;

    const allTypes = [
      'Wolf', 'DogShepherd', 'DogHusky', 'DogDachshund', 'Cat',
      'Cow', 'Sheep', 'Goat', 'Squirrel', 'Goblin', 'Skeleton', 'Golem'
    ];

    for (const type of allTypes) {
      const res = sb.EntityManager.spawnCreatureInFrontOfPlayer(type);
      const c = res && res.creature;
      assert(c !== null && c !== undefined, `${type} spawns cleanly`);

      // Verify creature stands on TOP of the ground block ((height + 1) * S)
      const s = sb.S || 0.5;
      const bx = Math.floor(c.x / s);
      const bz = Math.floor(c.z / s);
      const minSurfaceY = (sb.height(bx, bz) + 1) * s;
      assert(c.y >= minSurfaceY - 0.001, `${type} y (${c.y}) is at or above surface top (${minSurfaceY})`);

      // Verify hip-pivoted legs and animated head exist
      const legs = c.limbMeshes.legs;
      assert(Array.isArray(legs) && legs.length >= 2, `${type} has hip-pivoted legs array`);
      for (const leg of legs) {
        assert(typeof leg.position.y === 'number' && leg.position.y > 0 && leg.children.length === 2, `${type} leg pivot sits at hip height (${leg.position.y}) with upper leg + paw/hoof`);
      }
      assert(c.limbMeshes.head !== undefined && c.limbMeshes.head !== null, `${type} has dedicated head group with eyes`);
      assert(c.limbMeshes.head.children.length >= 6, `${type} head has multi-part 3D eyes (sclera, iris, pupil, catchlight) and facial features`);

      // Simulate 30 frames of walking and verify creature never clips below ground surface
      c.state = 'Wander';
      c.stateTimer = 10.0;
      c.wanderTarget = { x: c.x + 8, z: c.z + 8 };
      for (let i = 0; i < 30; i++) {
        c.update({ x: c.x + 8, y: c.y, z: c.z + 8 }, 0.05);
        const curBX = Math.floor(c.x / s);
        const curBZ = Math.floor(c.z / s);
        const curSurface = (sb.height(curBX, curBZ) + 1) * s;
        assert(c.group.position.y >= curSurface - 0.001, `${type} group.position.y (${c.group.position.y}) never clips below surface (${curSurface}) while walking`);
        const root = c.limbMeshes.root;
        if (root) {
          assert(root.position.y >= 0, `${type} root bounce (${root.position.y}) is strictly non-negative`);
        }
      }
    }
  });
});

runSuites().then(failed => {
  process.exit(failed > 0 ? 1 : 0);
});
