const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..', '..', '..');

// Create mock Three.js environment
function createMockThree() {
  class Object3D {
    constructor() {
      this.position = { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } };
      this.rotation = { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } };
      this.scale = { x: 1, y: 1, z: 1, set(x, y, z) { this.x = x; this.y = y; this.z = z; } };
      this.children = [];
      this.name = '';
      this.visible = true;
    }
    add(child) { this.children.push(child); }
    remove(child) {
      const idx = this.children.indexOf(child);
      if (idx !== -1) this.children.splice(idx, 1);
    }
    getObjectByName(name) {
      if (this.name === name) return this;
      for (const c of this.children) {
        if (c.getObjectByName) {
          const found = c.getObjectByName(name);
          if (found) return found;
        }
      }
      return null;
    }
  }

  return {
    Group: class extends Object3D {},
    Mesh: class extends Object3D {
      constructor(geo, mat) {
        super();
        this.geometry = geo;
        this.material = mat;
      }
    },
    BoxGeometry: class {},
    CylinderGeometry: class {},
    OctahedronGeometry: class {},
    ConeGeometry: class {},
    TorusGeometry: class {},
    MeshLambertMaterial: class { constructor(opt) { Object.assign(this, opt); } },
    MeshBasicMaterial: class { constructor(opt) { Object.assign(this, opt); } },
    MeshStandardMaterial: class { constructor(opt) { Object.assign(this, opt); } },
    PointLight: class extends Object3D { constructor(c, i, d) { super(); this.color = c; this.intensity = i; this.distance = d; } },
    Sprite: class extends Object3D { constructor(mat) { super(); this.material = mat; } },
    SpriteMaterial: class { constructor(opt) { Object.assign(this, opt); } },
    CanvasTexture: class { constructor(c) { this.image = c; this.dispose = () => {}; } },
    MathUtils: { lerp: (a, b, t) => a + (b - a) * t }
  };
}

const mockCanvas = {
  getContext: () => ({
    clearRect: () => {},
    fillText: () => {},
    strokeText: () => {},
    fillRect: () => {},
    strokeRect: () => {},
    beginPath: () => {},
    arc: () => {},
    fill: () => {},
    measureText: () => ({ width: 50 })
  })
};

const sandbox = {
  console: console,
  window: null,
  document: {
    querySelector: () => ({ style: {}, textContent: '' }),
    querySelectorAll: () => [],
    createElement: (tag) => {
      if (tag === 'canvas') return mockCanvas;
      return { style: {}, classList: { add: () => {}, remove: () => {} }, offsetWidth: 100 };
    },
    getElementById: (id) => ({
      style: {},
      classList: { add: () => {}, remove: () => {} },
      textContent: ''
    })
  },
  localStorage: {
    getItem: () => null,
    setItem: () => {}
  },
  THREE: createMockThree(),
  P: { x: 0, y: 50, z: 0, hp: 100, maxHp: 100, xp: 0, level: 1 },
  S: 0.5,
  CS: 16,
  RD: 8,
  SEA: 44,
  height: (bx, bz) => 50, // mock height function returning 50 blocks
  exploredChunks: new Set(),
  performance: globalThis.performance || { now: () => Date.now() },
  addEventListener: () => {},
  removeEventListener: () => {},
  scene: new (createMockThree().Group)(),
  toast: () => {},
  setTimeout: setTimeout,
  clearTimeout: clearTimeout
};
sandbox.window = sandbox;

const context = vm.createContext(sandbox);

console.log('Loading js/config.js into VM sandbox...');
const configCode = fs.readFileSync(path.join(root, 'js', 'config.js'), 'utf8');
vm.runInContext(configCode, context);

console.log('Loading js/world.js into VM sandbox...');
const worldCode = fs.readFileSync(path.join(root, 'js', 'world.js'), 'utf8');
vm.runInContext(worldCode, context);

console.log('Testing live POIManager from js/world.js:');
console.log('- POIManager exists:', typeof sandbox.window.POIManager !== 'undefined');
console.log('- POIManager.macroCellSize:', sandbox.window.POIManager.macroCellSize);

// Test deterministic generation
const p00a = sandbox.window.POIManager.getPoiForCell(0, 0);
const p00b = sandbox.window.POIManager.getPoiForCell(0, 0);
console.log('- Deterministic check p00a === p00b:', p00a === p00b, 'id:', p00a.id, 'type:', p00a.type, 'y:', p00a.y);

// Test dry land across 25 macro cells
let dryCount = 0;
const typesSeen = new Set();
for (let cx = -2; cx <= 2; cx++) {
  for (let cz = -2; cz <= 2; cz++) {
    const poi = sandbox.window.POIManager.getPoiForCell(cx, cz);
    if (poi.y >= 47) dryCount++;
    typesSeen.add(poi.type);
  }
}
console.log('- Cells with y >= 47:', dryCount, '/ 25');
console.log('- Types observed:', Array.from(typesSeen));

// Test 3D Mesh creation for all types
for (const type of ['Shrine', 'Ruins', 'Camp', 'Landmark', 'Chest']) {
  const dummyPoi = {
    id: 'test_' + type,
    type: type,
    wx: 0, wy: 25, wz: 0,
    displayName: type
  };
  const mesh = sandbox.window.POIManager.buildPOIMesh(dummyPoi);
  console.log(`- Built 3D Mesh for ${type}:`, !!mesh, 'children count:', mesh ? mesh.children.length : 0);
}

// Test discovery and Fog of War
const initialXp = sandbox.P.xp;
sandbox.window.POIManager.discoverPOI(p00a.id);
console.log('- Discovered POI, isDiscovered:', sandbox.window.POIManager.isDiscovered(p00a.id));
console.log('- XP gained:', sandbox.P.xp - initialXp);

// Now load js/minimap.js
console.log('\nLoading js/minimap.js into VM sandbox...');
const minimapCode = fs.readFileSync(path.join(root, 'js', 'minimap.js'), 'utf8');
vm.runInContext(minimapCode, context);

console.log('- projectToRadar exists:', typeof sandbox.window.projectToRadar === 'function');
if (typeof sandbox.window.projectToRadar === 'function') {
  const radar = sandbox.window.projectToRadar(0, 0, 100, 0, 50);
  console.log('  projectToRadar(0,0, 100,0, 50) =>', radar);
}

console.log('- isChunkRevealed exists:', typeof sandbox.window.isChunkRevealed === 'function');
sandbox.exploredChunks.add('1,2');
console.log('  isChunkRevealed(1,2) =>', sandbox.window.isChunkRevealed(1, 2));
console.log('  isChunkRevealed(9,9) =>', sandbox.window.isChunkRevealed(9, 9));

// Now load js/entities.js
console.log('\nLoading js/entities.js into VM sandbox...');
const entitiesCode = fs.readFileSync(path.join(root, 'js', 'entities.js'), 'utf8');
vm.runInContext(entitiesCode, context);

console.log('- EntityManager exists:', typeof sandbox.window.EntityManager !== 'undefined');
const wolf = sandbox.window.EntityManager.spawnCreature('Wolf', 10, 50, 10, 1);
console.log('- Spawned Wolf:', wolf.name, 'HP:', wolf.hp, '/', wolf.maxHp, 'State:', wolf.state);

// Test wolf AI update
sandbox.P.x = 10; sandbox.P.z = 10; // Player right at wolf -> should enter Attack
wolf.update(sandbox.P, 0.016);
console.log('- Wolf state at distance 0:', wolf.state);

sandbox.P.x = 22; sandbox.P.z = 10; // Distance = 12 (<= aggro 15) -> should enter Chase
wolf.update(sandbox.P, 0.016);
console.log('- Wolf state at distance 12:', wolf.state);

sandbox.P.x = 100; sandbox.P.z = 100; // Distance = 127 -> should Wander
wolf.update(sandbox.P, 0.016);
console.log('- Wolf state at distance 127:', wolf.state);

// Test wolf combat damage and death
const hpLeft = wolf.takeDamage(100, null, true, 'player');
console.log('- Wolf after 100 damage: HP =', hpLeft, 'State =', wolf.state);
