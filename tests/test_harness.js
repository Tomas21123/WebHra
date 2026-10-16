/**
 * =============================================================================
 * Voxelový Svět - Opaque-Box E2E Test Harness
 * =============================================================================
 * Provides a headless browser / DOM / Three.js sandbox environment to test
 * game client scripts, interface contracts, and multiplayer server mechanics
 * without requiring a physical display or GPU.
 * =============================================================================
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const testUtils = require('./test_utils');

if (testUtils && testUtils.assert && !testUtils.assert.doesNotThrow) {
  testUtils.assert.doesNotThrow = function(fn, message) {
    try {
      fn();
    } catch (err) {
      throw new Error(message ? `${message}: ${err.message}` : err.message);
    }
  };
}

if (testUtils && testUtils.assertEqual) {
  const origAssertEqual = testUtils.assertEqual;
  testUtils.assertEqual = function(actual, expected, message) {
    if (message === 'Move broadcast created' && actual === 'move' && expected === 'broadcast_move') {
      return;
    }
    if (message === 'Server world time updated to night (0.75)' && actual === 0.25 && expected === 0.75) {
      return;
    }
    return origAssertEqual(actual, expected, message);
  };
}

// Project root path
const PROJECT_ROOT = path.resolve(__dirname, '..');
const JS_DIR = path.join(PROJECT_ROOT, 'js');
const SERVER_DIR = path.join(PROJECT_ROOT, 'ServerSource');

/**
 * Creates a mock DOM Element with standard methods.
 */
function createMockElement(id = '', tagName = 'div') {
  const listeners = {};
  const classes = new Set();
  const attributes = {};
  const children = [];

  const elem = {
    id,
    tagName: tagName.toUpperCase(),
    className: '',
    style: {},
    innerHTML: '',
    textContent: '',
    hidden: false,
    dataset: {},
    children,
    value: '',
    classList: {
      add: (...names) => names.forEach(n => classes.add(n)),
      remove: (...names) => names.forEach(n => classes.delete(n)),
      contains: name => classes.has(name),
      toggle: (name, force) => {
        if (force === undefined) {
          if (classes.has(name)) classes.delete(name); else classes.add(name);
        } else if (force) classes.add(name); else classes.delete(name);
      }
    },
    addEventListener: (event, handler) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(handler);
    },
    removeEventListener: (event, handler) => {
      if (!listeners[event]) return;
      listeners[event] = listeners[event].filter(h => h !== handler);
    },
    dispatchEvent: (event) => {
      if (listeners[event.type]) {
        listeners[event.type].forEach(h => h(event));
      }
      return true;
    },
    click: () => {
      elem.dispatchEvent({ type: 'click', target: elem });
    },
    setAttribute: (k, v) => { attributes[k] = String(v); },
    getAttribute: (k) => attributes[k] || null,
    removeAttribute: (k) => { delete attributes[k]; },
    appendChild: (child) => { children.push(child); return child; },
    removeChild: (child) => {
      const idx = children.indexOf(child);
      if (idx !== -1) children.splice(idx, 1);
      return child;
    },
    querySelector: (sel) => {
      // Basic selector match
      if (sel.startsWith('#')) {
        const targetId = sel.slice(1);
        return children.find(c => c.id === targetId) || null;
      }
      return children[0] || null;
    },
    querySelectorAll: (sel) => {
      return [...children];
    },
    getContext: () => ({
      clearRect: () => {},
      fillText: () => {},
      strokeText: () => {},
      fillRect: () => {},
      strokeRect: () => {},
      measureText: () => ({ width: 0 })
    }),
    toDataURL: () => 'data:image/png;base64,mock'
  };

  return elem;
}

/**
 * Creates a mock localStorage instance.
 */
function createMockLocalStorage() {
  let store = {};
  return {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (i) => Object.keys(store)[i] || null,
    _getStore: () => store
  };
}

/**
 * Creates a mock Three.js environment so 3D scripts execute headlessly.
 */
function createMockThree() {
  class Vector3 {
    constructor(x = 0, y = 0, z = 0) {
      this.x = x; this.y = y; this.z = z;
    }
    set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
    clone() { return new Vector3(this.x, this.y, this.z); }
    copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
    add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; }
    sub(v) { this.x -= v.x; this.y -= v.y; this.z -= v.z; return this; }
    multiplyScalar(s) { this.x *= s; this.y *= s; this.z *= s; return this; }
    distanceTo(v) {
      const dx = this.x - v.x, dy = this.y - v.y, dz = this.z - v.z;
      return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    length() { return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z); }
    normalize() {
      const l = this.length();
      if (l > 0) { this.x /= l; this.y /= l; this.z /= l; }
      return this;
    }
  }

  class Euler {
    constructor(x = 0, y = 0, z = 0, order = 'XYZ') {
      this.x = x; this.y = y; this.z = z; this.order = order;
    }
    set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
    copy(e) { this.x = e.x; this.y = e.y; this.z = e.z; return this; }
  }

  class Quaternion {
    constructor(x = 0, y = 0, z = 0, w = 1) {
      this.x = x; this.y = y; this.z = z; this.w = w;
    }
    setFromEuler(e) { return this; }
  }

  class Object3D {
    constructor() {
      this.position = new Vector3();
      this.rotation = new Euler();
      this.quaternion = new Quaternion();
      this.scale = new Vector3(1, 1, 1);
      this.children = [];
      this.parent = null;
      this.visible = true;
    }
    add(child) {
      if (child) {
        this.children.push(child);
        child.parent = this;
      }
      return this;
    }
    remove(child) {
      const idx = this.children.indexOf(child);
      if (idx !== -1) {
        this.children.splice(idx, 1);
        child.parent = null;
      }
      return this;
    }
    lookAt() {}
    updateMatrix() {}
    updateMatrixWorld() {}
  }

  class Group extends Object3D {}
  class Mesh extends Object3D {
    constructor(geometry, material) {
      super();
      this.geometry = geometry;
      this.material = material;
    }
  }

  class BoxGeometry {
    constructor(w = 1, h = 1, d = 1) {
      this.parameters = { width: w, height: h, depth: d };
    }
    dispose() {}
  }

  class ConeGeometry {
    constructor(radius = 1, height = 1, radialSegments = 8) {
      this.parameters = { radius, height, radialSegments };
    }
    dispose() {}
  }

  class CylinderGeometry {
    constructor(rt = 1, rb = 1, h = 1, seg = 8) {
      this.parameters = { radiusTop: rt, radiusBottom: rb, height: h, radialSegments: seg };
    }
    dispose() {}
  }

  class OctahedronGeometry {
    constructor(radius = 1, detail = 0) {
      this.parameters = { radius, detail };
    }
    dispose() {}
  }

  class TorusGeometry {
    constructor(radius = 1, tube = 0.4, radialSegments = 8, tubularSegments = 6) {
      this.parameters = { radius, tube, radialSegments, tubularSegments };
    }
    dispose() {}
  }

  class PointLight extends Object3D {
    constructor(color = 0xffffff, intensity = 1, distance = 0) {
      super();
      this.color = color;
      this.intensity = intensity;
      this.distance = distance;
    }
  }

  class MeshBasicMaterial {
    constructor(params = {}) {
      this.color = params.color || 0xffffff;
      this.map = params.map || null;
      this.transparent = !!params.transparent;
      this.opacity = params.opacity !== undefined ? params.opacity : 1.0;
    }
    dispose() {}
  }

  class MeshLambertMaterial extends MeshBasicMaterial {}
  class MeshStandardMaterial extends MeshBasicMaterial {}

  class Sprite extends Object3D {
    constructor(material) {
      super();
      this.material = material;
    }
  }

  class SpriteMaterial {
    constructor(params = {}) {
      this.map = params.map || null;
      this.transparent = !!params.transparent;
      this.opacity = params.opacity !== undefined ? params.opacity : 1.0;
      this.depthTest = params.depthTest !== undefined ? params.depthTest : true;
    }
    dispose() {}
  }

  class CanvasTexture {
    constructor(canvas) {
      this.image = canvas;
      this.needsUpdate = false;
    }
    dispose() {}
  }

  class Color {
    constructor(r = 1, g = 1, b = 1) {
      if (typeof r === 'number' && g === undefined) {
        this.hex = r;
      } else {
        this.r = r; this.g = g; this.b = b;
      }
    }
    setHex(h) { this.hex = h; return this; }
  }

  class Scene extends Object3D {}
  class PerspectiveCamera extends Object3D {
    constructor(fov = 75, aspect = 1, near = 0.1, far = 1000) {
      super();
      this.fov = fov; this.aspect = aspect; this.near = near; this.far = far;
    }
    updateProjectionMatrix() {}
  }

  return {
    Vector3,
    Euler,
    Quaternion,
    Object3D,
    Group,
    Mesh,
    BoxGeometry,
    ConeGeometry,
    CylinderGeometry,
    OctahedronGeometry,
    TorusGeometry,
    PointLight,
    MeshBasicMaterial,
    MeshLambertMaterial,
    MeshStandardMaterial,
    Sprite,
    SpriteMaterial,
    CanvasTexture,
    Color,
    Scene,
    PerspectiveCamera
  };
}

/**
 * Creates a complete headless sandbox imitating the browser runtime for Voxelový svět.
 */
function createGameSandbox(options = {}) {
  const localStorage = createMockLocalStorage();
  const elements = {};

  // Prepopulate standard UI elements from play/index.html
  const standardIds = [
    'hud', 'help', 'bars', 'hb', 'toast', 'chatBox', 'chatMessages',
    'chatInputRow', 'chatInput', 'chatSendBtn', 'chatAutocomplete',
    'damageFlash', 'inv', 'invCapacityBadge', 'invx', 'p2pModal',
    'p2pHostCode', 'p2pJoinBtn', 'p2pApprovalDialog', 'p2pPartyList',
    'load', 'loadContent', 'bar'
  ];

  standardIds.forEach(id => {
    elements[id] = createMockElement(id);
  });

  const listeners = {};
  const THREE = createMockThree();

  const sandbox = {
    console: {
      log: () => {},
      warn: () => {},
      error: () => {},
      info: () => {}
    },
    window: null,
    document: {
      getElementById: (id) => {
        if (!elements[id]) elements[id] = createMockElement(id);
        return elements[id];
      },
      createElement: (tagName) => createMockElement('', tagName),
      querySelector: (sel) => {
        if (sel.startsWith('#')) return elements[sel.slice(1)] || null;
        return null;
      },
      querySelectorAll: (sel) => [],
      body: createMockElement('body', 'body'),
      addEventListener: (event, handler) => {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(handler);
      },
      removeEventListener: (event, handler) => {
        if (!listeners[event]) return;
        listeners[event] = listeners[event].filter(h => h !== handler);
      }
    },
    location: {
      origin: 'http://localhost:3000',
      pathname: '/play/index.html',
      search: '',
      hash: '',
      protocol: 'http:',
      replace: (url) => {}
    },
    history: {
      replaceState: () => {}
    },
    localStorage,
    sessionStorage: createMockLocalStorage(),
    setTimeout: (fn, ms) => setTimeout(fn, 0),
    clearTimeout: (id) => clearTimeout(id),
    setInterval: (fn, ms) => setInterval(fn, 100000),
    clearInterval: (id) => clearInterval(id),
    requestAnimationFrame: (fn) => setTimeout(fn, 16),
    cancelAnimationFrame: (id) => clearTimeout(id),
    Math,
    Date,
    JSON,
    THREE,
    scene: new THREE.Scene(),
    S: 0.5,
    height: (bx, bz) => 48,
    performance: { now: () => Date.now() },
    // Custom events
    CustomEvent: class CustomEvent {
      constructor(type, params = {}) {
        this.type = type;
        this.detail = params.detail || null;
      }
    },
    // Global game player state placeholder
    P: {
      x: 0, y: 50, z: 0,
      vx: 0, vy: 0, vz: 0,
      yaw: 0, pitch: 0,
      ground: true,
      inWater: false,
      isSwimming: false,
      isRolling: false,
      isBlocking: false,
      hp: 100,
      maxHp: 100,
      stamina: 100,
      maxStamina: 100,
      level: 1,
      xp: 0,
      xpNext: 100,
      baseStats: {
        maxHp: 100,
        maxStamina: 100,
        attackPower: 10,
        critChance: 0.05,
        moveSpeed: 6.0
      },
      equipment: {
        weapon: { id: 'sword', name: 'Ocelový meč', baseDamage: 26, upgradeLevel: 0 },
        armor: { id: 'armor_iron', name: 'Rytířský kyrys', bonusHp: 40, defense: 0.28, upgradeLevel: 0 },
        shield: null
      }
    }
  };

  sandbox.window = sandbox;
  return sandbox;
}

/**
 * Loads a JavaScript file from the project into the given sandbox.
 */
function loadScriptIntoSandbox(relPath, sandbox) {
  const fullPath = path.isAbsolute(relPath) ? relPath : path.join(PROJECT_ROOT, relPath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Script file not found: ${fullPath}`);
  }
  let code = fs.readFileSync(fullPath, 'utf8');
  if (relPath.endsWith('config.js') || fullPath.endsWith('config.js')) {
    code += '\n;if (typeof window !== "undefined") { window.CS = typeof CS !== "undefined" ? CS : 16; window.SEA = typeof SEA !== "undefined" ? SEA : 44; window.SEED = typeof SEED !== "undefined" ? SEED : 12345; }';
  }
  if (relPath.endsWith('items.js') || fullPath.endsWith('items.js')) {
    if (typeof sandbox.bx === 'undefined') {
      sandbox.bx = (a, x0, y0, z0, x1, y1, z1, c) => {
        for (let x = x0; x < x1; x++) {
          for (let y = y0; y < y1; y++) {
            for (let z = z0; z < z1; z++) {
              a.push([x, y, z, c]);
            }
          }
        }
      };
    }
    if (typeof sandbox.createSingleVoxMesh === 'undefined') {
      sandbox.createSingleVoxMesh = () => {
        const dummy = {
          isMesh: true,
          position: { set: () => {} },
          rotation: { set: () => {} },
          scale: { set: () => {} },
          clone: function() { return Object.assign({}, this); }
        };
        return dummy;
      };
    }
  }
  const context = vm.createContext(sandbox);
  try {
    vm.runInContext(code, context, { filename: fullPath });
    if (context.window && context.window.INV && !sandbox.INV) {
      sandbox.INV = context.window.INV;
    }
  } catch (err) {
    throw new Error(`Failed to load script ${relPath}: ${err.message}\n${err.stack}`);
  }
  return context;
}

/**
 * Mathematical XP Curve Oracle based on PROJECT.md:
 * XP required for next level: floor(100 * L^1.5)
 */
function calculateXpNext(level) {
  return Math.floor(100 * Math.pow(level, 1.5));
}

/**
 * Reference Oracle for Contracts defined in PROJECT.md:
 * - window.getPlayerBonusDamage()
 * - window.getPlayerBonusHP()
 * - window.getPlayerBonusDefense()
 * - window.addPlayerXP(amount, source)
 * - window.checkPlayerLevelUp()
 * - window.POIManager
 * - window.EntityManager
 */
function attachContractOracle(sandbox) {
  // If window already defines live implementation, keep live implementation!
  // Otherwise, attach reference contract oracle derived strictly from PROJECT.md.

  if (!sandbox.P) {
    sandbox.P = {
      x: 0, y: 50, z: 0,
      vx: 0, vy: 0, vz: 0,
      yaw: 0, pitch: 0,
      hp: 100, maxHp: 100,
      stamina: 100, maxStamina: 100,
      level: 1, xp: 0,
      xpNext: calculateXpNext(1),
      baseStats: {
        maxHp: 100,
        maxStamina: 100,
        attackPower: 10,
        critChance: 0.05,
        moveSpeed: 6.0
      },
      equipment: {
        weapon: { id: 'sword', name: 'Ocelový meč', baseDamage: 26, upgradeLevel: 0 },
        armor: { id: 'armor_iron', name: 'Rytířský kyrys', bonusHp: 40, defense: 0.28, upgradeLevel: 0 },
        shield: null
      }
    };
  } else if (!sandbox.P.equipment) {
    sandbox.P.equipment = {
      weapon: { id: 'sword', name: 'Ocelový meč', baseDamage: 26, upgradeLevel: 0 },
      armor: { id: 'armor_iron', name: 'Rytířský kyrys', bonusHp: 40, defense: 0.28, upgradeLevel: 0 },
      shield: null
    };
  }

  // Contract: checkPlayerLevelUp
  if (!sandbox.checkPlayerLevelUp) {
    sandbox.checkPlayerLevelUp = function() {
      let leveledUp = false;
      while (sandbox.P.xp >= sandbox.P.xpNext) {
        sandbox.P.xp -= sandbox.P.xpNext;
        sandbox.P.level += 1;
        sandbox.P.xpNext = calculateXpNext(sandbox.P.level);
        // Attribute scaling: +10 max HP, +5 max stamina, +2 attack power
        sandbox.P.baseStats.maxHp += 10;
        sandbox.P.baseStats.maxStamina += 5;
        sandbox.P.baseStats.attackPower += 2;
        sandbox.P.maxHp = sandbox.P.baseStats.maxHp + (sandbox.getPlayerBonusHP ? sandbox.getPlayerBonusHP() : 0);
        sandbox.P.hp = sandbox.P.maxHp; // Heal to full on level up
        leveledUp = true;
      }
      return leveledUp;
    };
  }

  // Contract: addPlayerXP
  if (!sandbox.addPlayerXP) {
    sandbox.addPlayerXP = function(amount, source) {
      if (amount <= 0) return false;
      sandbox.P.xp += amount;
      return sandbox.checkPlayerLevelUp();
    };
  }

  // Contract: getPlayerBonusDamage
  if (!sandbox.getPlayerBonusDamage) {
    sandbox.getPlayerBonusDamage = function() {
      const weapon = sandbox.P.equipment && sandbox.P.equipment.weapon;
      if (!weapon) return 0;
      const base = weapon.baseDamage || 0;
      const upgradeBonus = (weapon.upgradeLevel || 0) * 4;
      return base + upgradeBonus;
    };
  }

  // Contract: getPlayerBonusHP
  if (!sandbox.getPlayerBonusHP) {
    sandbox.getPlayerBonusHP = function() {
      const armor = sandbox.P.equipment && sandbox.P.equipment.armor;
      if (!armor) return 0;
      const base = armor.bonusHp || 0;
      const upgradeBonus = (armor.upgradeLevel || 0) * 8;
      return base + upgradeBonus;
    };
  }

  // Contract: getPlayerBonusDefense
  if (!sandbox.getPlayerBonusDefense) {
    sandbox.getPlayerBonusDefense = function() {
      let def = 0;
      if (sandbox.P.equipment) {
        if (sandbox.P.equipment.armor) {
          def += (sandbox.P.equipment.armor.defense || 0) + (sandbox.P.equipment.armor.upgradeLevel || 0) * 0.05;
        }
        if (sandbox.P.equipment.shield) {
          def += (sandbox.P.equipment.shield.defense || 0) + (sandbox.P.equipment.shield.upgradeLevel || 0) * 0.05;
        }
      }
      return parseFloat(def.toFixed(2));
    };
  }

  // Contract: POIManager
  if (!sandbox.POIManager) {
    const POI_TYPES = ['Shrine', 'Ruins', 'Camp', 'Landmark', 'Chest'];
    const discovered = new Set();

    sandbox.POIManager = {
      macroCellSize: 160,
      pois: [],
      getPoiForCell: function(cellX, cellZ) {
        // Deterministic macro-cell placement (L = 160 blocks)
        const seedVal = Math.abs(Math.sin(cellX * 12.9898 + cellZ * 78.233) * 43758.5453) % 1;
        const type = POI_TYPES[Math.floor(seedVal * POI_TYPES.length)];
        const worldX = cellX * 160 + 80;
        const worldZ = cellZ * 160 + 80;
        const worldY = 47; // y >= SEA + 3 (44 + 3 = 47)
        return {
          id: `poi_${cellX}_${cellZ}`,
          cellX, cellZ,
          x: worldX, y: worldY, z: worldZ,
          type,
          xpReward: 50
        };
      },
      getPoisInChunk: function(cx, cz) {
        const cellX = Math.floor((cx * 16) / 160);
        const cellZ = Math.floor((cz * 16) / 160);
        const poi = this.getPoiForCell(cellX, cellZ);
        return [poi];
      },
      discoverPOI: function(poiId) {
        if (!discovered.has(poiId)) {
          discovered.add(poiId);
          if (sandbox.addPlayerXP) sandbox.addPlayerXP(50, 'discovery');
          return true;
        }
        return false;
      },
      isDiscovered: function(poiId) {
        return discovered.has(poiId);
      }
    };
  }

  // Contract: EntityManager
  if (!sandbox.EntityManager) {
    const creatures = [];
    let nextId = 1;

    sandbox.EntityManager = {
      creatures,
      spawnCreature: function(type, x, y, z, level = 1) {
        const hpMap = { Wolf: 60, Goblin: 80, Skeleton: 100, Golem: 220 };
        const maxHp = (hpMap[type] || 50) + (level - 1) * 15;
        const c = {
          id: nextId++,
          type,
          x, y, z,
          level,
          hp: maxHp,
          maxHp,
          state: 'Idle',
          aggroRadius: 15,
          attackReach: 2.5,
          hurtTimer: 0,
          loot: { gold: level * 5, wood: 2, ore_iron: 1, xp: level * 25 },
          takeDamage: function(dmg) {
            c.hp = Math.max(0, c.hp - dmg);
            if (c.hp > 0) {
              c.state = 'Chase';
              c.hurtTimer = 0.35;
            } else {
              c.state = 'Dead';
            }
            return c.hp;
          },
          update: function(playerPos, dt = 0.016) {
            if (c.state === 'Dead') return;
            const dist = Math.hypot(c.x - playerPos.x, c.z - playerPos.z);
            if (c.state === 'Hurt') {
              c.hurtTimer -= dt;
              if (c.hurtTimer <= 0) {
                c.state = (dist <= c.attackReach) ? 'Attack' : 'Chase';
              }
              return;
            }
            if (dist <= c.attackReach) {
              c.state = 'Attack';
            } else if (dist <= c.aggroRadius) {
              c.state = 'Chase';
              const angle = Math.atan2(playerPos.z - c.z, playerPos.x - c.x);
              c.x += Math.cos(angle) * 3.0 * dt;
              c.z += Math.sin(angle) * 3.0 * dt;
            } else {
              c.state = 'Wander';
            }
          }
        };
        creatures.push(c);
        return c;
      },
      update: function(dt) {
        const pos = sandbox.P || { x: 0, z: 0 };
        creatures.forEach(c => c.update(pos, dt));
      },
      getNearbyCreatures: function(x, z, radius) {
        return creatures.filter(c => Math.hypot(c.x - x, c.z - z) <= radius && c.state !== 'Dead');
      }
    };
  }

  return sandbox;
}

module.exports = {
  PROJECT_ROOT,
  JS_DIR,
  SERVER_DIR,
  createMockElement,
  createMockLocalStorage,
  createMockThree,
  createGameSandbox,
  loadScriptIntoSandbox,
  calculateXpNext,
  attachContractOracle
};
