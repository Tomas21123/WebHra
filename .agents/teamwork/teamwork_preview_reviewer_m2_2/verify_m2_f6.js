const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..', '..', '..');

function createMockThree() {
  class Object3D {
    constructor() {
      this.position = { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } };
      this.rotation = { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } };
      this.scale = { x: 1, y: 1, z: 1, set(x, y, z) { this.x = x; this.y = y; this.z = z; } };
      this.children = [];
      this.visible = true;
    }
    add(c) { this.children.push(c); }
    remove(c) {
      const idx = this.children.indexOf(c);
      if (idx !== -1) this.children.splice(idx, 1);
    }
  }
  return {
    Group: class extends Object3D {},
    Mesh: class extends Object3D { constructor(g, m) { super(); this.geometry = g; this.material = m; } },
    BoxGeometry: class {},
    ConeGeometry: class {},
    MeshLambertMaterial: class { constructor(o) { Object.assign(this, o); } },
    MeshBasicMaterial: class { constructor(o) { Object.assign(this, o); } },
    Sprite: class extends Object3D { constructor(m) { super(); this.material = m; } },
    SpriteMaterial: class { constructor(o) { Object.assign(this, o); } },
    CanvasTexture: class { constructor(c) { this.image = c; this.dispose = () => {}; } }
  };
}

const mockCanvas = {
  getContext: () => ({
    clearRect: () => {},
    fillText: () => {},
    strokeText: () => {},
    fillRect: () => {},
    strokeRect: () => {}
  })
};

const sandbox = {
  console: console,
  window: null,
  document: {
    createElement: (tag) => {
      if (tag === 'canvas') return mockCanvas;
      return { style: {} };
    },
    getElementById: (id) => ({ style: {} })
  },
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  THREE: createMockThree(),
  scene: new (createMockThree().Group)(),
  G: { hp: 100, maxHp: 100, st: 100, tired: 0 },
  INV: [
    { id: 'wood', count: 0 },
    { id: 'ore_iron', count: 0 },
    { id: 'coin_gold', count: 0 }
  ],
  toast: (msg) => { sandbox.lastToast = msg; },
  addPlayerXP: (amt, src) => { sandbox.xpAwarded = (sandbox.xpAwarded || 0) + amt; },
  S: 0.5,
  SEA: 44,
  height: (bx, bz) => 50,
  biome: (bx, bz, h) => 0,
  performance: { now: () => 1000 },
  escOpen: false,
  charOpen: false,
  invOpen: false
};
sandbox.window = sandbox;

const context = vm.createContext(sandbox);

// 1. Load entities.js
const entitiesCode = fs.readFileSync(path.join(root, 'js', 'entities.js'), 'utf8');
vm.runInContext(entitiesCode, context);

// 2. Load player.js
const playerCode = fs.readFileSync(path.join(root, 'js', 'player.js'), 'utf8');
vm.runInContext(playerCode, context);

const EM = sandbox.window.EntityManager;
console.log('--- 1. Testing 4 Creature Types Spawning & Normalization ---');
const archetypes = ['Wolf', 'Goblin', 'Skeleton Warrior', 'Stone Golem'];
archetypes.forEach(type => {
  const c = EM.spawnCreature(type, 0, 50, 0, 1);
  console.log(`Input "${type}" => Type: ${c.type}, Name: "${c.name}", HP: ${c.hp}, Dmg: ${c.baseDamage}, Reach: ${c.attackReach}, SpeedChase: ${c.speedChase}`);
});

console.log('\n--- 2. Testing Level 3 Attribute Scaling ---');
const gLv3 = EM.spawnCreature('Goblin', 0, 50, 0, 3);
console.log(`Goblin Lv3: HP=${gLv3.maxHp} (Base 80 + 2*15 = 110), Dmg=${gLv3.baseDamage} (Base 18 * 1.24 = 22), XP=${gLv3.loot.xp} (25*3 = 75), Gold=${gLv3.loot.gold} (5*3 = 15)`);

console.log('\n--- 3. Testing AI State Transitions ---');
const w = EM.spawnCreature('Wolf', 0, 50, 0, 1);
console.log(`Initial spawn state: ${w.state}`);

vm.runInContext(`
  P.x = 0; P.y = 50; P.z = 1.0;
`, context);
w.update(vm.runInContext('P', context), 0.016);
console.log(`Player at 1.0m (within reach 2.5) => State: ${w.state}`);

vm.runInContext(`
  P.z = 10.0;
`, context);
w.update(vm.runInContext('P', context), 0.016);
console.log(`Player at 10.0m (within aggro 15.0) => State: ${w.state}`);

vm.runInContext(`
  P.z = 30.0;
`, context);
w.update(vm.runInContext('P', context), 0.016);
console.log(`Player at 30.0m (beyond aggro) => State: ${w.state}`);

console.log('\n--- 4. Testing Combat Damage, Knockback & Hurt State ---');
w.state = 'Idle';
console.log(`Before damage: State = ${w.state}, HP = ${w.hp}`);
w.takeDamage(20, { x: 0, z: 1 }, false);
console.log(`After 20 damage: State = ${w.state}, HP = ${w.hp}, vx = ${w.vx}, vz = ${w.vz}, vy = ${w.vy}`);
console.log(`Is Hurt state ever entered? State is: "${w.state}" (Expected 'Hurt' per 6-state AI claim)`);

console.log('\n--- 5. Testing Lethal Damage & Loot Distribution ---');
const goldBefore = sandbox.INV.find(i => i.id === 'coin_gold').count;
const xpBefore = sandbox.xpAwarded || 0;
w.takeDamage(50, null, true);
console.log(`After lethal damage: HP = ${w.hp}, State = ${w.state}, deathTimer = ${w.deathTimer}`);
console.log(`Gold added to INV: ${sandbox.INV.find(i => i.id === 'coin_gold').count - goldBefore}`);
console.log(`XP awarded via addPlayerXP: ${(sandbox.xpAwarded || 0) - xpBefore}`);
console.log(`Physical 3D loot entities spawned in world: ${EM.droppedLoot.length}`);

console.log('\n--- 6. Testing Loot Magnetism ---');
const woodBefore = sandbox.INV.find(i => i.id === 'wood').count;
vm.runInContext(`
  P.x = ${EM.droppedLoot[0].x};
  P.z = ${EM.droppedLoot[0].z};
`, context);
EM.update(0.016);
console.log(`Loot magnet picked up wood: +${sandbox.INV.find(i => i.id === 'wood').count - woodBefore}x wood`);
console.log(`Remaining dropped loot entities in world: ${EM.droppedLoot.length}`);

console.log('\n--- 7. Testing checkPvPHit in js/player.js ---');
EM.clearAll();

// Set player position and orientation cleanly in the context
// Looking along -Z (yaw = 0, pitch = 0)
// Forward vector: fwdX = 0, fwdY = 0, fwdZ = -1
vm.runInContext(`
  P.x = 0; P.y = 50; P.renderY = 50; P.z = 0;
  yaw = 0; pitch = 0;
`, context);

// Goblins in front of player (looking along -Z)
const g1 = EM.spawnCreature('Goblin', -0.3, 50, -1.8, 1);
const g2 = EM.spawnCreature('Goblin', 0.0, 50, -2.0, 1);
const g3 = EM.spawnCreature('Goblin', 0.3, 50, -1.9, 1);

console.log(`Spawned 3 Goblins in front of player: g1 hp=${g1.hp}, g2 hp=${g2.hp}, g3 hp=${g3.hp}`);

// Test Single Target hit (default weapon: sword, reach = 2.4, single target)
sandbox.getPlayerAttackReach = () => 2.4;
sandbox.getPlayerAttackDamage = () => ({ damage: 30, isCrit: false, weaponName: 'Meč' });
sandbox.getEquippedMainHandId = () => 'sword';

vm.runInContext(`checkPvPHit('dominant');`, context);
console.log(`After Sword hit (single-target): g1 hp=${g1.hp}, g2 hp=${g2.hp}, g3 hp=${g3.hp}`);
let damagedCount = [g1, g2, g3].filter(g => g.hp < 80).length;
console.log(`Number of damaged targets: ${damagedCount} (Expected 1)`);

// Test Cleave hit (weapon: greatsword, maxTargets = 3)
sandbox.getEquippedMainHandId = () => 'greatsword';
sandbox.getPlayerAttackReach = () => 3.2;
sandbox.getPlayerAttackDamage = () => ({ damage: 25, isCrit: true, weaponName: 'Obouruční meč' });

vm.runInContext(`checkPvPHit('dominant');`, context);
console.log(`After Greatsword Cleave hit (multi-target): g1 hp=${g1.hp}, g2 hp=${g2.hp}, g3 hp=${g3.hp}`);
let cleavedCount = [g1, g2, g3].filter(g => g.hp < 80).length;
console.log(`Number of cleaved targets: ${cleavedCount} (Expected 3)`);
console.log(`Knockback on g2: vx=${g2.vx.toFixed(2)}, vz=${g2.vz.toFixed(2)}, vy=${g2.vy.toFixed(2)}`);
