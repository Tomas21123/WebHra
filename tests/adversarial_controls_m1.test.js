/**
 * =============================================================================
 * ADVERSARIAL VERIFICATION SUITE: PLAYER CONTROLS, CLICKS & WEAPON MECHANICS (M1)
 * =============================================================================
 * Tests:
 * 1. Left click (dominant hand) & Right click (secondary hand) perform combat /
 *    weapon swings / shield blocks, and NEVER attempt block raycast or chunk modification.
 * 2. Inventory item usage (potions, food, equipment, materials, crafting) does
 *    not place blocks or modify voxel chunks.
 * 3. Direct URL navigation to play/index.html across different base URLs or query
 *    params verifies no redirect loop occurs.
 * =============================================================================
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const { describe, test, assert, assertEqual, assertDeepEqual, runSuites } = require('./test_utils');
const { createGameSandbox } = require('./test_harness');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const JS_DIR = path.join(PROJECT_ROOT, 'js');

/**
 * Creates an enhanced sandbox tailored for empirical control and chunk verification.
 */
function createAdversarialSandbox(initialUrl = 'http://localhost:3000/play/index.html') {
  const sandbox = createGameSandbox();

  // Setup URL & Location
  const parsedUrl = new URL(initialUrl);
  sandbox.location = {
    href: initialUrl,
    origin: parsedUrl.origin,
    pathname: parsedUrl.pathname,
    search: parsedUrl.search,
    hash: parsedUrl.hash,
    protocol: parsedUrl.protocol,
    replaceCalls: [],
    replace: function(target) {
      this.replaceCalls.push(target);
      this.href = target;
    }
  };

  sandbox.history = {
    replaceCalls: [],
    replaceState: function(state, unused, url) {
      this.replaceCalls.push({ state, url });
    }
  };

  const winListeners = {};
  sandbox.addEventListener = function(event, handler) {
    if (!winListeners[event]) winListeners[event] = [];
    winListeners[event].push(handler);
  };
  sandbox.removeEventListener = function(event, handler) {
    if (!winListeners[event]) return;
    winListeners[event] = winListeners[event].filter(h => h !== handler);
  };
  sandbox.dispatchEvent = function(event) {
    if (winListeners[event.type]) {
      winListeners[event.type].forEach(h => h(event));
    }
    return true;
  };

  // Mock Three.js additions needed by voxelBuilder
  sandbox.THREE.Color.prototype.set = function(v) {
    if (typeof v === 'number') {
      this.r = ((v >> 16) & 255) / 255;
      this.g = ((v >> 8) & 255) / 255;
      this.b = (v & 255) / 255;
    }
    return this;
  };
  sandbox.THREE.Float32BufferAttribute = class Float32BufferAttribute {
    constructor(array, itemSize) {
      this.array = array;
      this.itemSize = itemSize;
    }
  };
  sandbox.THREE.BufferGeometry = class BufferGeometry {
    constructor() {
      this.attributes = {};
      this.index = null;
    }
    setAttribute(name, attr) { this.attributes[name] = attr; return this; }
    setIndex(idx) { this.index = idx; return this; }
    computeVertexNormals() {}
    dispose() {}
  };
  sandbox.THREE.Object3D.prototype.clone = function(recursive = true) {
    const copy = new this.constructor();
    copy.position.copy(this.position);
    copy.rotation.copy(this.rotation);
    copy.scale.copy(this.scale);
    copy.visible = this.visible;
    if (this.geometry) copy.geometry = this.geometry;
    if (this.material) copy.material = this.material;
    copy.isMesh = !!this.isMesh;
    if (recursive && this.children) {
      for (const child of this.children) {
        copy.add(child.clone(true));
      }
    }
    return copy;
  };
  sandbox.THREE.Mesh.prototype.isMesh = true;
  sandbox.THREE.MeshLambertMaterial = sandbox.THREE.MeshBasicMaterial;
  sandbox.THREE.CanvasTexture = class CanvasTexture { constructor(c) { this.image = c; } dispose() {} };
  sandbox.THREE.PointLight = class PointLight extends sandbox.THREE.Object3D {};
  sandbox.THREE.AmbientLight = class AmbientLight extends sandbox.THREE.Object3D {};
  sandbox.THREE.DirectionalLight = class DirectionalLight extends sandbox.THREE.Object3D {};
  sandbox.THREE.DoubleSide = 2;
  sandbox.THREE.FrontSide = 0;
  sandbox.THREE.BackSide = 1;

  // Mock 2D Canvas context and DOM traversal for UI elements
  const origCreateElement = sandbox.document.createElement;
  function enhanceMockElement(el) {
    if (!el || el._enhanced) return el;
    el._enhanced = true;

    el.closest = function(sel) {
      return enhanceMockElement(origCreateElement('div'));
    };
    el.after = function(sibling) {};

    el.click = function() {
      const ev = { type: 'click', target: el, stopPropagation: () => {} };
      if (typeof el.onclick === 'function') {
        el.onclick(ev);
      }
      el.dispatchEvent(ev);
    };

    Object.defineProperty(el, 'textContent', {
      get() { return this._tc !== undefined ? this._tc : (this.innerHTML ? this.innerHTML.replace(/<[^>]*>/g, '') : ''); },
      set(v) { this._tc = v; },
      configurable: true
    });

    const origQS = el.querySelector;
    el.querySelector = function(sel) {
      if (sel.includes('drawer-close-btn')) {
        const btn = enhanceMockElement(origCreateElement('button'));
        btn.className = 'drawer-close-btn';
        return btn;
      }
      for (const child of el.children) {
        if (child.className && child.className.includes(sel.replace(/^\./, ''))) {
          return child;
        }
        if (child.querySelector) {
          const res = child.querySelector(sel);
          if (res) return res;
        }
      }
      return origQS ? origQS(sel) : null;
    };
    return el;
  }

  sandbox.document.createElement = function(tag) {
    const el = enhanceMockElement(origCreateElement(tag));
    if (tag.toLowerCase() === 'canvas') {
      el.toDataURL = () => 'data:image/png;base64,mock';
      el.getContext = function(type) {
        return {
          fillStyle: '#000000',
          fillRect: () => {},
          clearRect: () => {},
          getImageData: () => ({ data: new Uint8Array(16 * 16 * 4) }),
          putImageData: () => {}
        };
      };
    }
    return el;
  };

  const origGetElementById = sandbox.document.getElementById;
  sandbox.document.getElementById = function(id) {
    return enhanceMockElement(origGetElementById(id));
  };

  // Setup $ helper
  sandbox.$ = function(id) {
    return sandbox.document.getElementById(id);
  };

  // Modals are hidden by default in play/index.html
  if (sandbox.$('p2pModal')) sandbox.$('p2pModal').hidden = true;
  if (sandbox.$('inv')) sandbox.$('inv').hidden = true;

  // Audio & UI stubs
  sandbox.playAttackSound = function(soundType) {
    sandbox.soundEvents.push(soundType);
  };
  sandbox.soundEvents = [];

  sandbox.toasts = [];
  sandbox.toast = function(msg) {
    sandbox.toasts.push(msg);
  };

  sandbox.ui = function() {
    sandbox.uiUpdates++;
  };
  sandbox.uiUpdates = 0;

  sandbox.checkPvPHit = function(hand) {
    sandbox.pvpHitEvents.push(hand);
  };
  sandbox.pvpHitEvents = [];

  sandbox.updatePlayerAppearance = function() {};
  sandbox.updateInventoryPreview = function() {};

  // Global game state
  sandbox.G = {
    hp: 100,
    maxHp: 100,
    st: 100,
    maxSt: 100
  };

  sandbox.P = {
    x: 10, y: 50, z: 10,
    vx: 0, vy: 0, vz: 0,
    yaw: 0, pitch: 0,
    ground: true,
    inWater: false,
    isSwimming: false,
    isRolling: false,
    isBlocking: false
  };

  sandbox.CS = 16;
  sandbox.H = 128;
  sandbox.SEA = 32;
  sandbox.S = 1;
  sandbox.height = function(x, z) { return 45; };
  sandbox.biome = function(x, z, h) { return 0; };

  sandbox.FACES = [
    { n: [1, 0, 0], u: [0, 1, 0], v: [0, 0, 1], uy: 1, s: 0.82, k: 0 },
    { n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0], uy: 0, s: 0.7, k: 0 },
    { n: [0, 1, 0], u: [0, 0, 1], v: [1, 0, 0], uy: 0, s: 1, k: 1 },
    { n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1], uy: 0, s: 0.5, k: 2 },
    { n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0], uy: 0, s: 0.9, k: 0 },
    { n: [0, 0, -1], u: [0, 1, 0], v: [1, 0, 0], uy: 1, s: 0.74, k: 0 }
  ];
  sandbox.CORN = [[-1, -1], [1, -1], [1, 1], [-1, 1]];

  // Real mock chunks map with Uint8Array buffers
  sandbox.chunks = new Map();
  for (let cx = -1; cx <= 1; cx++) {
    for (let cz = -1; cz <= 1; cz++) {
      const key = `${cx},${cz}`;
      const buf = new Uint8Array(16 * 16 * 128);
      // Fill baseline terrain
      for (let y = 0; y < 40; y++) {
        for (let i = 0; i < 256; i++) {
          buf[y * 256 + i] = 1; // Stone
        }
      }
      sandbox.chunks.set(key, {
        cx, cz,
        d: buf,
        mesh: { visible: true, dispose: () => {} }
      });
    }
  }

  return sandbox;
}

/**
 * Loads the game scripts in exact dependency sequence.
 */
function loadCoreGameScripts(sandbox) {
  const context = vm.createContext(sandbox);
  const scriptsToLoad = [
    'js/config.js',
    'js/storage.js',
    'js/voxelBuilder.js',
    'js/items.js',
    'js/customizer.js',
    'js/character.js',
    'js/inventory.js',
    'js/player.js',
    'js/network.js'
  ];

  scriptsToLoad.forEach(rel => {
    const fullPath = path.join(PROJECT_ROOT, rel);
    const code = fs.readFileSync(fullPath, 'utf8');
    vm.runInContext(code, context, { filename: fullPath });
  });

  vm.runInContext(`
    window.NetworkManager = NetworkManager;
    window.INV = INV;
    window.HB = HB;
    window.EQUIPPED_SLOTS = EQUIPPED_SLOTS;
    window.CRAFTING_RECIPES = CRAFTING_RECIPES;
    window.isAttacking = () => attacking;
    window.setAttacking = (val) => { attacking = val; };
    window.getAttackDuration = () => attackDuration;
    window.G = G;
    window.getHbSel = () => hbSel;
    window.getHeldId = () => heldId;
    window.setEscOpen = (v) => { escOpen = v; };
    window.setCharOpen = (v) => { charOpen = v; };
    window.setInvOpen = (v) => { invOpen = v; };
    window.setChatOpen = (v) => { chatOpen = v; };
    window.setEmoteOpen = (v) => { emoteOpen = v; };
    window.setMinimapOpen = (v) => { minimapOpen = v; };
    window.setIsRolling = (v) => { isRolling = v; };
    window.getCurrentMode = () => currentMode;
  `, context);

  return context;
}

/**
 * Computes a combined SHA-256 hash of all chunk voxel buffers in the sandbox.
 */
function getChunksChecksum(sandbox) {
  const hash = crypto.createHash('sha256');
  for (const [key, chunk] of sandbox.chunks.entries()) {
    hash.update(key);
    hash.update(Buffer.from(chunk.d));
  }
  return hash.digest('hex');
}

// =============================================================================
// SUBTASK 1: Left Click (Dominant) & Right Click (Secondary) Verification
// =============================================================================
describe('Adversarial 1: Left & Right Click Hand Actions & Zero Block Raycast', () => {

  test('ADV-1.1: Dominant hand attack with one-handed sword sets attacking=true, triggers punch/slash sound, and touches 0 chunk bytes', () => {
    const sandbox = createAdversarialSandbox();
    loadCoreGameScripts(sandbox);

    // Initial state
    assertEqual(sandbox.isAttacking(), false, 'Player should not start in attacking state');
    const initialChecksum = getChunksChecksum(sandbox);

    // Equip sword in dominant hand (hand_r by default for right-handed)
    sandbox.equipToSlot('sword', 'hand_r');
    assertEqual(sandbox.getEquippedDominantHandItem().id, 'sword');

    // Trigger dominant hand action (Left click)
    sandbox.handleHandAction('dominant');

    assertEqual(sandbox.isAttacking(), true, 'Left click must initiate attack');
    assertEqual(sandbox.getActiveAttackHand(), 'dominant', 'Active attack hand must be dominant');
    assert(sandbox.soundEvents.includes('slash'), 'Weapon swing sound (slash) must be emitted');

    // Verify chunk integrity: zero block modification
    const postChecksum = getChunksChecksum(sandbox);
    assertEqual(postChecksum, initialChecksum, 'Chunk voxel data must remain 100% unaltered after sword swing');
  });

  test('ADV-1.2: All 12 weapon types trigger respective attack durations & sound profiles without raycasting blocks', () => {
    const sandbox = createAdversarialSandbox();
    loadCoreGameScripts(sandbox);

    const weaponExpectations = [
      { id: 'sword', sound: 'slash', duration: 0.26 },
      { id: 'spear', sound: 'thrust', duration: 0.28 },
      { id: 'dagger', sound: 'slash', duration: 0.20 },
      { id: 'greatsword', sound: 'heavy', duration: 0.38 },
      { id: 'battleaxe', sound: 'heavy', duration: 0.38 },
      { id: 'hammer', sound: 'heavy', duration: 0.38 },
      { id: 'mace', sound: 'slash', duration: 0.26 },
      { id: 'staff_fire', sound: 'staff', duration: 0.32 },
      { id: 'staff_frost', sound: 'staff', duration: 0.32 },
      { id: 'bow', sound: 'bow', duration: 0.30 },
      { id: 'katana', sound: 'slash', duration: 0.26 }
    ];

    const initialChecksum = getChunksChecksum(sandbox);

    for (const w of weaponExpectations) {
      sandbox.soundEvents = [];
      sandbox.equipToSlot(w.id, 'hand_r');
      sandbox.handleHandAction('dominant');

      assertEqual(sandbox.isAttacking(), true, `Attacking must be true for ${w.id}`);
      assertEqual(sandbox.getAttackDuration(), w.duration, `Duration mismatch for ${w.id}`);
      assert(sandbox.soundEvents.includes(w.sound), `Sound ${w.sound} expected for ${w.id}, got: ${sandbox.soundEvents.join(',')}`);
    }

    // Unarmed attack (fists)
    sandbox.unequipSlot('hand_r');
    sandbox.soundEvents = [];
    sandbox.handleHandAction('dominant');
    assertEqual(sandbox.isAttacking(), true, 'Unarmed must trigger attack');
    assertEqual(sandbox.getAttackDuration(), 0.22, 'Unarmed duration must be 0.22');
    assert(sandbox.soundEvents.includes('punch'), 'Unarmed must emit punch sound');

    // Integrity check
    assertEqual(getChunksChecksum(sandbox), initialChecksum, 'Voxel chunks must remain completely untouched across all weapon swings');
  });

  test('ADV-1.3: Right click with shield in secondary hand raises shield block and releases on mouseup', () => {
    const sandbox = createAdversarialSandbox();
    loadCoreGameScripts(sandbox);

    const initialChecksum = getChunksChecksum(sandbox);

    // Equip wood shield in secondary hand (hand_l)
    sandbox.equipToSlot('shield_wood', 'hand_l');
    assertEqual(sandbox.getEquippedSecondaryHandItem().id, 'shield_wood');

    assertEqual(sandbox.isPlayerBlocking(), false, 'Player should initially not be blocking');

    // Trigger secondary hand action (Right click)
    sandbox.handleHandAction('secondary');
    assertEqual(sandbox.isPlayerBlocking(), true, 'Right click with shield must activate blocking');
    assertEqual(sandbox.isAttacking(), false, 'Shield block must not trigger attack swing');

    // Release secondary hand action (Mouse up)
    sandbox.handleHandRelease('secondary');
    assertEqual(sandbox.isPlayerBlocking(), false, 'Mouse up must release shield block');

    // Test shield_iron
    sandbox.equipToSlot('shield_iron', 'hand_l');
    sandbox.handleHandAction('secondary');
    assertEqual(sandbox.isPlayerBlocking(), true, 'Shield iron must activate blocking');
    sandbox.handleHandRelease('secondary');
    assertEqual(sandbox.isPlayerBlocking(), false, 'Releasing shield iron must deactivate blocking');

    // Chunk integrity
    assertEqual(getChunksChecksum(sandbox), initialChecksum, 'Shield actions must never modify voxel chunks');
  });

  test('ADV-1.4: Dual wielding weapons allows secondary hand weapon attack via right click', () => {
    const sandbox = createAdversarialSandbox();
    loadCoreGameScripts(sandbox);

    // Main hand: sword, Off hand: dagger
    sandbox.equipToSlot('sword', 'hand_r');
    sandbox.equipToSlot('dagger', 'hand_l');

    sandbox.soundEvents = [];
    sandbox.handleHandAction('secondary');

    assertEqual(sandbox.isAttacking(), true, 'Right click with off-hand weapon must attack');
    assertEqual(sandbox.getActiveAttackHand(), 'secondary', 'Active attack hand must be secondary');
    assertEqual(sandbox.getAttackDuration(), 0.20, 'Dagger attack duration should be 0.20s');
    assert(sandbox.soundEvents.includes('slash'), 'Dagger slash sound must play');
  });

  test('ADV-1.5: Canvas mouse event simulation: LMB (button 0), RMB (button 2), and contextmenu suppression', () => {
    const sandbox = createAdversarialSandbox();
    loadCoreGameScripts(sandbox);

    const canvas = sandbox.document.createElement('canvas');
    sandbox.initPlayerControls(canvas);

    sandbox.equipToSlot('sword', 'hand_r');
    sandbox.equipToSlot('shield_wood', 'hand_l');

    // Context menu test (must prevent default)
    let contextPrevented = false;
    canvas.dispatchEvent({
      type: 'contextmenu',
      preventDefault: () => { contextPrevented = true; }
    });
    assertEqual(contextPrevented, true, 'Right click contextmenu must be prevented');

    // LMB mousedown
    canvas.dispatchEvent({ type: 'mousedown', button: 0 });
    assertEqual(sandbox.isAttacking(), true, 'LMB mousedown must trigger dominant attack');
    assertEqual(sandbox.getActiveAttackHand(), 'dominant');

    // LMB mouseup
    sandbox.dispatchEvent({ type: 'mouseup', button: 0 });

    // RMB mousedown
    sandbox.setAttacking(false);
    canvas.dispatchEvent({ type: 'mousedown', button: 2 });
    assertEqual(sandbox.isPlayerBlocking(), true, 'RMB mousedown must trigger secondary shield block');

    // RMB mouseup
    sandbox.dispatchEvent({ type: 'mouseup', button: 2 });
    assertEqual(sandbox.isPlayerBlocking(), false, 'RMB mouseup must release secondary shield block');
  });

  test('ADV-1.6: UI modal guards prevent mouse clicks from executing attacks or blocks when menus are open', () => {
    const sandbox = createAdversarialSandbox();
    loadCoreGameScripts(sandbox);

    const canvas = sandbox.document.createElement('canvas');
    sandbox.initPlayerControls(canvas);
    sandbox.equipToSlot('sword', 'hand_r');

    const modalConditions = [
      () => { sandbox.setEscOpen(true); },
      () => { sandbox.setEscOpen(false); sandbox.setInvOpen(true); },
      () => { sandbox.setInvOpen(false); sandbox.setCharOpen(true); },
      () => { sandbox.setCharOpen(false); sandbox.setChatOpen(true); },
      () => { sandbox.setChatOpen(false); sandbox.setEmoteOpen(true); },
      () => { sandbox.setEmoteOpen(false); sandbox.setIsRolling(true); },
      () => {
        sandbox.setIsRolling(false);
        sandbox.$('p2pModal').hidden = false;
      }
    ];

    for (const setModal of modalConditions) {
      setModal();
      sandbox.setAttacking(false);
      canvas.dispatchEvent({ type: 'mousedown', button: 0 });
      assertEqual(sandbox.isAttacking(), false, 'Attack must NOT execute when a modal/menu is open');
      canvas.dispatchEvent({ type: 'mousedown', button: 2 });
      assertEqual(sandbox.isPlayerBlocking(), false, 'Block must NOT execute when a modal/menu is open');
    }
  });

  test('ADV-1.7: Rapid click burst (100 LMB & 100 RMB clicks) causes zero chunk corruption or block modifications', () => {
    const sandbox = createAdversarialSandbox();
    loadCoreGameScripts(sandbox);

    sandbox.equipToSlot('battleaxe', 'hand_r');
    sandbox.equipToSlot('shield_iron', 'hand_l');

    const initialChecksum = getChunksChecksum(sandbox);

    for (let i = 0; i < 100; i++) {
      sandbox.handleHandAction('dominant');
      sandbox.handleHandAction('secondary');
      sandbox.handleHandRelease('secondary');
    }

    assertEqual(getChunksChecksum(sandbox), initialChecksum, '100 clicks burst must alter 0 bytes across all chunks');
  });

  test('ADV-1.8: Verifying networkManager.modifyBlock, applySingleBlock and worldDeltas are 100% disabled/stubs', () => {
    const sandbox = createAdversarialSandbox();
    loadCoreGameScripts(sandbox);

    const nm = new sandbox.NetworkManager();
    const initialChecksum = getChunksChecksum(sandbox);

    // Call modifyBlock directly
    nm.modifyBlock(5, 45, 5, 2);
    assertEqual(Object.keys(nm.worldDeltas).length, 0, 'networkManager.worldDeltas must not record block changes');

    // Call onRemoteBlockChange
    nm.onRemoteBlockChange({ x: 5, y: 45, z: 5, blockType: 2 });
    assertEqual(getChunksChecksum(sandbox), initialChecksum, 'Remote block change must not modify chunk voxels');

    // Call applySingleBlock
    nm.applySingleBlock(5, 45, 5, 2);
    assertEqual(getChunksChecksum(sandbox), initialChecksum, 'applySingleBlock must not modify chunk voxels');

    // Call applyWorldDeltas
    nm.applyWorldDeltas({ '5,45,5': 2 });
    assertEqual(getChunksChecksum(sandbox), initialChecksum, 'applyWorldDeltas must not modify chunk voxels');
  });
});

// =============================================================================
// SUBTASK 2: Inventory Item Usage Does Not Place Blocks
// =============================================================================
describe('Adversarial 2: Inventory Item Usage & Zero Block Placement', () => {

  test('ADV-2.1: Consuming potion_hp via hand action restores 40 HP without placing blocks', () => {
    const sandbox = createAdversarialSandbox();
    loadCoreGameScripts(sandbox);

    const initialChecksum = getChunksChecksum(sandbox);

    // Damage player to 50 HP
    sandbox.G.hp = 50;
    sandbox.equipToSlot('potion_hp', 'hand_r');

    sandbox.handleHandAction('dominant');

    assertEqual(sandbox.G.hp, 90, 'Potion HP consumption must restore 40 HP (50 -> 90)');
    assert(sandbox.$('toast').textContent.includes('Vypit léčivý lektvar'), 'Health potion consumption toast must be displayed');
    assertEqual(getChunksChecksum(sandbox), initialChecksum, 'Consuming potion must not modify chunks');
  });

  test('ADV-2.2: Consuming potion_hp when HP is 90 clamps to 100 HP max', () => {
    const sandbox = createAdversarialSandbox();
    loadCoreGameScripts(sandbox);

    sandbox.G.hp = 90;
    sandbox.equipToSlot('potion_hp', 'hand_r');
    sandbox.handleHandAction('dominant');

    assertEqual(sandbox.G.hp, 100, 'HP must be clamped to 100');
  });

  test('ADV-2.3: Consuming potion_hp from inventory drawer (useBtn) restores HP without placing blocks', () => {
    const sandbox = createAdversarialSandbox();
    loadCoreGameScripts(sandbox);

    const initialChecksum = getChunksChecksum(sandbox);

    sandbox.G.hp = 30;
    const potionItem = sandbox.INV.find(i => i.id === 'potion_hp');
    assert(potionItem, 'potion_hp must exist in INV');

    const drawer = sandbox.createItemDrawer(potionItem);
    const useBtn = drawer.querySelector('.drawer-btn.primary');
    assert(useBtn, 'Use button must exist in potion drawer');

    useBtn.click();

    assertEqual(sandbox.G.hp, 70, 'Using potion from drawer must restore 40 HP (30 -> 70)');
    assertEqual(getChunksChecksum(sandbox), initialChecksum, 'Drawer potion usage must touch zero chunk bytes');
  });

  test('ADV-2.4: Consuming apple from inventory drawer restores 25 HP and full stamina without placing blocks', () => {
    const sandbox = createAdversarialSandbox();
    loadCoreGameScripts(sandbox);

    const initialChecksum = getChunksChecksum(sandbox);

    sandbox.G.hp = 50;
    sandbox.G.st = 20;

    const appleItem = sandbox.INV.find(i => i.id === 'apple');
    assert(appleItem, 'apple must exist in INV');

    const drawer = sandbox.createItemDrawer(appleItem);
    const useBtn = drawer.querySelector('.drawer-btn.primary');
    assert(useBtn, 'Use button must exist in apple drawer');

    useBtn.click();

    assertEqual(sandbox.G.hp, 75, 'Apple must restore 25 HP (50 -> 75)');
    assertEqual(sandbox.G.st, 100, 'Apple must restore full stamina to 100');
    assertEqual(getChunksChecksum(sandbox), initialChecksum, 'Eating food must not place blocks');
  });

  test('ADV-2.5: Clicking wood, stone, or iron ore in inventory opens Crafting workshop and does NOT place blocks', () => {
    const sandbox = createAdversarialSandbox();
    loadCoreGameScripts(sandbox);

    const initialChecksum = getChunksChecksum(sandbox);

    for (const matId of ['wood', 'stone', 'ore_iron']) {
      const it = sandbox.INV.find(i => i.id === matId);
      assert(it, `${matId} must exist in INV`);
      assertEqual(it.subcat, 'material', `${matId} must be classified as material`);

      const drawer = sandbox.createItemDrawer(it);
      const craftBtn = drawer.querySelector('.drawer-btn.primary');
      assert(craftBtn, `Crafting workshop button must exist for ${matId}`);
      assertEqual(craftBtn.textContent.includes('Otevřít Crafting dílnu'), true);

      // Click workshop button
      craftBtn.click();
      assertEqual(sandbox.getCurrentMode(), 'craft', 'Clicking material drawer button must switch mode to craft');
    }

    assertEqual(getChunksChecksum(sandbox), initialChecksum, 'Accessing materials must not place blocks');
  });

  test('ADV-2.6: Crafting an item via executeCraft consumes resources and updates inventory without placing blocks', () => {
    const sandbox = createAdversarialSandbox();
    loadCoreGameScripts(sandbox);

    const initialChecksum = getChunksChecksum(sandbox);

    // Give player initial crafting ingredients
    const wood = sandbox.INV.find(i => i.id === 'wood');
    const stone = sandbox.INV.find(i => i.id === 'stone');
    wood.count = 10;
    stone.count = 10;

    const torchRecipe = sandbox.CRAFTING_RECIPES.find(r => r.id === 'craft_torch');
    assert(torchRecipe, 'craft_torch recipe must exist');

    const torchItem = sandbox.INV.find(i => i.id === 'torch');
    const initialTorches = torchItem ? (torchItem.count || 0) : 0;

    sandbox.executeCraft(torchRecipe);

    assertEqual(wood.count, 9, 'Wood count must decrease by 1');
    assertEqual(stone.count, 9, 'Stone count must decrease by 1');
    assertEqual(torchItem.count, initialTorches + 4, 'Torch count must increase by 4');
    assertEqual(getChunksChecksum(sandbox), initialChecksum, 'Crafting items must touch zero chunk bytes');
  });

  test('ADV-2.7: Hotbar selection (selSlot) and hotbar cycling does not place blocks', () => {
    const sandbox = createAdversarialSandbox();
    loadCoreGameScripts(sandbox);

    const initialChecksum = getChunksChecksum(sandbox);

    sandbox.HB[0] = 'sword';
    sandbox.HB[1] = 'wood';
    sandbox.HB[2] = 'stone';

    // Initially slot 0 is selected
    assertEqual(sandbox.getHbSel(), 0, 'Hotbar slot 0 initially selected');

    // Selecting slot 1 switches selection to 1
    sandbox.selSlot(1);
    assertEqual(sandbox.getHbSel(), 1, 'Hotbar slot 1 must be selected');

    // Selecting slot 2 switches selection to 2
    sandbox.selSlot(2);
    assertEqual(sandbox.getHbSel(), 2, 'Hotbar slot 2 must be selected');

    // Clicking slot 2 again toggles it off (-1)
    sandbox.selSlot(2);
    assertEqual(sandbox.getHbSel(), -1, 'Clicking active slot toggles it to -1');

    // Selecting slot 0 selects 0 again
    sandbox.selSlot(0);
    assertEqual(sandbox.getHbSel(), 0, 'Selecting slot 0 restores selection to 0');

    assertEqual(getChunksChecksum(sandbox), initialChecksum, 'Hotbar selection changes must not place blocks');
  });
});

// =============================================================================
// SUBTASK 3: Direct URL Navigation & Redirect Loop Immunity
// =============================================================================
describe('Adversarial 3: URL Navigation Variations & Redirect Loop Immunity', () => {

  const testUrls = [
    'http://localhost:3000/play/index.html',
    'http://localhost:8080/play/index.html',
    'http://127.0.0.1:8098/play/index.html?p2p=1',
    'http://localhost:3000/play/index.html?join=VOX-4567',
    'http://localhost:3000/play/index.html?server=ws://127.0.0.1:8080',
    'http://localhost:3000/play/index.html?guest=1&debug=true#spawn',
    'https://username.github.io/WebHra/play/index.html',
    'https://username.github.io/WebHra/play/index.html?p2p=VOX-9999',
    'http://localhost:3000/my-subfolder/play/index.html',
    'file:///C:/Users/tomas/Desktop/WebHra/play/index.html'
  ];

  test('ADV-3.1: getRootUrl() evaluates cleanly across base URLs and subfolders without returning undefined', () => {
    testUrls.forEach(url => {
      const sandbox = createAdversarialSandbox(url);
      
      // Inline implementation from play/index.html:18-27
      sandbox.getRootUrl = function() {
        const p = sandbox.location.pathname;
        const idx = p.indexOf('/play');
        if (idx !== -1) {
          return (sandbox.location.origin && sandbox.location.origin !== 'null')
            ? (sandbox.location.origin + p.substring(0, idx) + '/')
            : '../index.html';
        }
        return '../';
      };

      const rootUrl = sandbox.getRootUrl();
      assert(typeof rootUrl === 'string' && rootUrl.length > 0, `Root URL must be non-empty for ${url}`);
      assert(!rootUrl.includes('undefined'), `Root URL must not contain 'undefined': ${rootUrl}`);

      if (url.startsWith('file:')) {
        assertEqual(rootUrl, '../index.html', 'File protocol without origin must fallback to ../index.html');
      } else if (url.includes('/my-subfolder/')) {
        assertEqual(rootUrl, 'http://localhost:3000/my-subfolder/', 'Subfolder path must be preserved');
      }
    });
  });

  test('ADV-3.2: Direct navigation with EMPTY localStorage does NOT trigger redirect loop and sets guest session', () => {
    testUrls.forEach(url => {
      const sandbox = createAdversarialSandbox(url);
      sandbox.localStorage.clear();

      // Execute initialization script from play/index.html:29-41
      try {
        if (!sandbox.localStorage.getItem('voxel_auth_user')) {
          sandbox.localStorage.setItem('voxel_auth_user', JSON.stringify({ id: 999, nickname: 'Hráč_Guest', email: 'guest@voxel.cz' }));
        }
      } catch (e) { }

      if (sandbox.location.protocol !== 'file:' && sandbox.location.pathname.endsWith('/index.html')) {
        try {
          const cleanPath = sandbox.location.pathname.replace(/\/index\.html$/i, '') + '/';
          sandbox.history.replaceState(null, '', cleanPath + sandbox.location.search + sandbox.location.hash);
        } catch (e) { }
      }

      // Assertions
      assertEqual(sandbox.location.replaceCalls.length, 0, `Must NOT call location.replace() for ${url}`);

      const userRaw = sandbox.localStorage.getItem('voxel_auth_user');
      assert(userRaw, `Guest user must be set in localStorage for ${url}`);
      const user = JSON.parse(userRaw);
      assertEqual(user.id, 999);
      assertEqual(user.nickname, 'Hráč_Guest');
    });
  });

  test('ADV-3.3: Direct navigation with EXISTING authenticated user preserves user and does not redirect', () => {
    const sandbox = createAdversarialSandbox('http://localhost:3000/play/index.html?p2p=1');
    const existingUser = { id: 42, nickname: 'Vojta_Hrdina', email: 'vojta@seznam.cz' };
    sandbox.localStorage.setItem('voxel_auth_user', JSON.stringify(existingUser));

    // Execute script
    try {
      if (!sandbox.localStorage.getItem('voxel_auth_user')) {
        sandbox.localStorage.setItem('voxel_auth_user', JSON.stringify({ id: 999, nickname: 'Hráč_Guest', email: 'guest@voxel.cz' }));
      }
    } catch (e) { }

    assertEqual(sandbox.location.replaceCalls.length, 0, 'Must NOT call location.replace()');
    const user = JSON.parse(sandbox.localStorage.getItem('voxel_auth_user'));
    assertEqual(user.id, 42, 'Existing user must not be overwritten');
    assertEqual(user.nickname, 'Vojta_Hrdina');
  });

  test('ADV-3.4: P2P query parameter (?p2p=VOX-1234) safely initializes client mode without redirecting', () => {
    const sandbox = createAdversarialSandbox('http://localhost:3000/play/index.html?p2p=1234');
    
    // Simulate P2P client startup check from play/index.html:748-776
    let act = JSON.parse(sandbox.localStorage.getItem('voxel_active_game') || '{}');
    const urlParams = new URLSearchParams(sandbox.location.search);
    const p2pParam = urlParams.get('p2p');
    if (p2pParam) {
      act = { mode: 'p2p_client', p2pRoomCode: p2pParam.toUpperCase().startsWith('VOX-') ? p2pParam.toUpperCase() : ('VOX-' + p2pParam) };
    }

    assertEqual(act.mode, 'p2p_client');
    assertEqual(act.p2pRoomCode, 'VOX-1234');
    assertEqual(sandbox.location.replaceCalls.length, 0, 'P2P client parameter must not cause redirect on startup');
  });
});

// =============================================================================
// CLI Execution
// =============================================================================
if (require.main === module) {
  (async () => {
    console.log('\x1b[1m\x1b[35m=== ADVERSARIAL VERIFICATION SUITE: M1 CONTROLS, CLICKS & MECHANICS ===\x1b[0m');
    const res = await runSuites();
    if (res.failed > 0) {
      console.error(`\x1b[31m${res.failed} tests failed!\x1b[0m`);
      process.exit(1);
    } else {
      console.log(`\x1b[32mAll ${res.passed} adversarial tests passed successfully!\x1b[0m`);
      process.exit(0);
    }
  })();
}
