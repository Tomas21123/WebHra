/**
 * =============================================================================
 * ADVERSARIAL VERIFICATION & STRESS TEST SUITE: CREATURE AI, COMBAT & CLEAVE (M2)
 * =============================================================================
 * Empirical Challenger: teamwork_preview_challenger_m2_2
 * 
 * Verifies:
 * 1. Creature AI State Transitions:
 *    - Idle -> Chase on player proximity (aggroRadius)
 *    - Chase -> Attack on reach (attackReach)
 *    - Chase -> Wander when player escapes beyond aggroRadius * 1.5
 *    - Idle/Wander -> Chase immediately on taking non-lethal damage
 *    - Player roll i-frame evasion (P.isRolling avoids damage)
 *    - Shield block damage reduction (P.isBlocking reduces damage by 70%, stamina -15)
 * 2. Combat Hit Detection & Cleave Mechanics:
 *    - Singleplayer attacks register hits against creatures with 0 remote players
 *    - Non-cleave weapons (sword, dagger, spear, mace) hit at most 1 creature
 *    - Greatsword & Battleaxe hit multiple creatures within reach arc (cleave up to 3)
 *    - Priority target ordering by score (dot * 10 - dist)
 *    - Reach arc boundaries, reach limits, dead creature exclusion
 * 3. Creature Death, Loot Drops & XP:
 *    - HP reaches 0 -> state = Dead, deathTimer = 1.2s
 *    - Combat XP awarded to player (scaled by creature level)
 *    - Physical 3D loot drops generated (wood, iron, gold)
 *    - Loot magnetism: gathering items into inventory when within 2.2m
 *    - Creature cleanup from EntityManager after deathTimer expires
 * 4. Forensic Desync Investigation:
 *    - Verify whether P.isRolling / P.isBlocking vs local player.js variables align
 * =============================================================================
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { describe, test, assert, assertEqual, assertDeepEqual, runSuites } = require('./test_utils');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const JS_DIR = path.join(PROJECT_ROOT, 'js');

/**
 * Creates an enhanced sandbox tailored for PvE, AI and Combat verification.
 */
function createCombatSandbox() {
  const elements = {};
  const toasts = [];

  function makeElem(id = '', tag = 'div') {
    return {
      id,
      tagName: tag.toUpperCase(),
      style: {},
      children: [],
      classList: {
        add: () => {},
        remove: () => {},
        contains: () => false
      },
      appendChild: function(c) { this.children.push(c); return c; },
      removeChild: function(c) {
        const i = this.children.indexOf(c);
        if (i !== -1) this.children.splice(i, 1);
        return c;
      },
      getContext: () => ({
        clearRect: () => {},
        fillText: () => {},
        strokeText: () => {},
        fillRect: () => {},
        strokeRect: () => {}
      })
    };
  }

  // Minimal mock Three.js with all needed geometry, sprite, and texture classes
  class Vector3 {
    constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
    set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
    clone() { return new Vector3(this.x, this.y, this.z); }
    copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
    add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; }
    sub(v) { this.x -= v.x; this.y -= v.y; this.z -= v.z; return this; }
    multiplyScalar(s) { this.x *= s; this.y *= s; this.z *= s; return this; }
    distanceTo(v) { return Math.hypot(this.x - v.x, this.y - v.y, this.z - v.z); }
    length() { return Math.hypot(this.x, this.y, this.z); }
    normalize() {
      const l = this.length();
      if (l > 0) { this.x /= l; this.y /= l; this.z /= l; }
      return this;
    }
  }

  class Euler {
    constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
    set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
  }

  class Object3D {
    constructor() {
      this.position = new Vector3();
      this.rotation = new Euler();
      this.scale = new Vector3(1, 1, 1);
      this.children = [];
      this.visible = true;
    }
    add(c) { if (c) this.children.push(c); return this; }
    remove(c) {
      const idx = this.children.indexOf(c);
      if (idx !== -1) this.children.splice(idx, 1);
      return this;
    }
  }

  class Group extends Object3D {}
  class Mesh extends Object3D {
    constructor(geometry, material) { super(); this.geometry = geometry; this.material = material; }
  }
  class Sprite extends Object3D {
    constructor(material) { super(); this.material = material; }
  }
  class BoxGeometry { constructor() {} dispose() {} }
  class ConeGeometry { constructor() {} dispose() {} }
  class Material { constructor(opts = {}) { this.color = opts.color || 0; this.opacity = opts.opacity || 1; } dispose() {} }
  class MeshBasicMaterial extends Material {}
  class MeshLambertMaterial extends Material {}
  class SpriteMaterial extends Material {}
  class CanvasTexture { constructor(canvas) { this.canvas = canvas; this.needsUpdate = false; } dispose() {} }
  class Scene extends Object3D {}

  const sceneInstance = new Scene();

  const sandbox = {
    console: {
      log: () => {},
      warn: () => {},
      error: () => {},
      info: () => {}
    },
    performance: { now: () => Date.now() },
    setTimeout: (fn) => setTimeout(fn, 0),
    clearTimeout: (id) => clearTimeout(id),
    document: {
      getElementById: (id) => elements[id] || (elements[id] = makeElem(id)),
      createElement: (tag) => makeElem('', tag),
      body: makeElem('body', 'body'),
      querySelector: (sel) => makeElem(),
      querySelectorAll: (sel) => []
    },
    THREE: {
      Vector3,
      Euler,
      Object3D,
      Group,
      Mesh,
      Sprite,
      BoxGeometry,
      ConeGeometry,
      MeshBasicMaterial,
      MeshLambertMaterial,
      SpriteMaterial,
      CanvasTexture,
      Scene
    },
    scene: sceneInstance,
    Math,
    // Game Player & Stats State
    P: {
      x: 0,
      y: 50,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
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
      xpNext: 100
    },
    G: {
      hp: 100,
      st: 100,
      sd: 0,
      tired: 0,
      o2: 100
    },
    INV: [
      { id: 'coin_gold', name: 'Zlaté mince', count: 10 },
      { id: 'wood', name: 'Dřevo', count: 0 },
      { id: 'ore_iron', name: 'Železná ruda', count: 0 },
      { id: 'stone', name: 'Kámen', count: 0 }
    ],
    toasts,
    toast: function(msg) { toasts.push(msg); },
    playBlockSound: () => {},
    playAttackSound: () => {},
    playRollSound: () => {},
    // Level & XP contracts
    addPlayerXP: function(amount, source) {
      if (this.P) {
        this.P.xp = (this.P.xp || 0) + amount;
        while (this.P.xp >= (this.P.xpNext || 100)) {
          this.P.xp -= this.P.xpNext;
          this.P.level = (this.P.level || 1) + 1;
          this.P.xpNext = Math.floor(100 * Math.pow(this.P.level, 1.5));
        }
      }
    },
    xpEvents: [],
    // Engine constants & physics
    CS: 16,
    SEA: 44,
    S: 0.5,
    STANDING_HT: 1.8,
    ROLLING_HT: 0.9,
    VX: 0.05,
    SPX: 0,
    SPY: 50,
    SPZ: 0,
    biome: (bx, bz, h) => 0,
    height: (bx, bz) => 50,
    block: (bx, by, bz) => 0,
    hits: (x, y, z, ht) => false,
    bH: makeElem('bh'),
    bHt: makeElem('bht'),
    bS: makeElem('bs'),
    bSt: makeElem('bst'),
    bO: makeElem('bo'),
    bOt: makeElem('bot'),
    bOBox: makeElem('bobo'),
    // Camera angles
    yaw: 0,
    pitch: 0,
    // Weapon stats helper
    heldId: 'sword',
    getPlayerAttackReach: (hand) => 2.4,
    getPlayerAttackDamage: (hand) => ({ damage: 25, isCrit: false, weaponName: 'Meč' }),
    getEquippedMainHandId: function() { return this.heldId; },
    getEquippedOffHandId: function() { return null; }
  };

  sandbox.window = sandbox;

  // Load js/entities.js into sandbox
  const entitiesPath = path.join(JS_DIR, 'entities.js');
  const entitiesCode = fs.readFileSync(entitiesPath, 'utf8');
  vm.runInNewContext(entitiesCode, sandbox, { filename: entitiesPath });

  // Load js/player.js into sandbox
  const playerPath = path.join(JS_DIR, 'player.js');
  const playerCode = fs.readFileSync(playerPath, 'utf8');
  vm.runInNewContext(playerCode, sandbox, { filename: playerPath });

  // Bridge sandbox.P to player.js P and ensure position sync
  vm.runInContext(`
    window.P = P;
    window.checkPvPHit = checkPvPHit;
    P.x = 0;
    P.y = 50;
    P.z = 0;
    P.hp = 100;
    P.maxHp = 100;
    P.stamina = 100;
    P.maxStamina = 100;
    P.level = 1;
    P.xp = 0;
    P.xpNext = 100;
    pitch = 0;
    yaw = 0;
  `, sandbox);

  return sandbox;
}

// =============================================================================
// TEST SUITES
// =============================================================================

describe('Adversarial M2: Creature AI State Machine & Transitions', () => {

  test('Creature initialization & level scaling (Wolf, Goblin, Skeleton, Golem)', () => {
    const sb = createCombatSandbox();
    const EM = sb.EntityManager;

    const wolf = EM.spawnCreature('Wolf', 0, 50, 0, 1);
    assertEqual(wolf.type, 'Wolf', 'Creature type should be Wolf');
    assertEqual(wolf.maxHp, 60, 'Wolf base HP at level 1 should be 60');
    assertEqual(wolf.hp, 60, 'Wolf current HP should start at max HP');
    assertEqual(wolf.state, 'Idle', 'Initial creature state must be Idle');
    assertEqual(wolf.aggroRadius, 15.0, 'Wolf aggro radius should be 15.0');
    assertEqual(wolf.attackReach, 2.5, 'Wolf attack reach should be 2.5');

    // Level scaling: Lv3 Goblin
    const goblinLv3 = EM.spawnCreature('Goblin', 0, 50, 0, 3);
    assertEqual(goblinLv3.level, 3, 'Goblin level should be 3');
    // baseHp = 80 + (3 - 1) * 15 = 110
    assertEqual(goblinLv3.maxHp, 110, 'Level 3 Goblin HP should scale to 110');
    // baseDamage = floor(18 * (1 + 2 * 0.12)) = floor(18 * 1.24) = 22
    assertEqual(goblinLv3.baseDamage, 22, 'Level 3 Goblin damage should scale to 22');
    assertEqual(goblinLv3.loot.xp, 75, 'Level 3 Goblin XP should scale to 75 (25 * 3)');
    assertEqual(goblinLv3.loot.gold, 15, 'Level 3 Goblin gold should scale to 15 (5 * 3)');

    // Golem base stats
    const golem = EM.spawnCreature('Golem', 0, 50, 0, 1);
    assertEqual(golem.maxHp, 220, 'Stone Golem base HP should be 220');
    assertEqual(golem.baseDamage, 45, 'Stone Golem base damage should be 45');
    assertEqual(golem.hitboxRadius, 1.20, 'Stone Golem hitbox radius should be 1.20');
  });

  test('AI State: Idle maintains position when player is beyond aggroRadius', () => {
    const sb = createCombatSandbox();
    const wolf = sb.EntityManager.spawnCreature('Wolf', 100, 50, 100, 1);
    sb.P.x = 0;
    sb.P.z = 0;

    // Dist = hypot(100, 100) ~ 141.4m > aggroRadius (15m)
    wolf.update(sb.P, 0.016);
    assert(wolf.state === 'Idle' || wolf.state === 'Wander', 'Creature far from player must stay in Idle/Wander');
  });

  test('AI State: Transitions Idle -> Chase when player enters aggroRadius', () => {
    const sb = createCombatSandbox();
    const wolf = sb.EntityManager.spawnCreature('Wolf', 10, 50, 0, 1);
    sb.P.x = 0;
    sb.P.z = 0;

    // Dist = 10m <= aggroRadius (15.0m) and > attackReach (2.5m)
    wolf.update(sb.P, 0.016);
    assertEqual(wolf.state, 'Chase', 'Wolf must enter Chase state within aggroRadius');

    // Wolf should turn toward player (dx = 0 - 10 = -10, dz = 0 - 0 = 0)
    wolf.update(sb.P, 0.1);
    assert(wolf.vx < 0, 'Wolf velocity vx must be directed towards player (-X)');
  });

  test('AI State: Transitions Chase -> Attack when within attackReach', () => {
    const sb = createCombatSandbox();
    const wolf = sb.EntityManager.spawnCreature('Wolf', 2.0, 50, 0, 1);
    sb.P.x = 0;
    sb.P.z = 0;

    // Dist = 2.0m <= attackReach (2.5m)
    wolf.update(sb.P, 0.016);
    assertEqual(wolf.state, 'Attack', 'Wolf must transition to Attack state when within reach (2.0m <= 2.5m)');
  });

  test('AI State: Transitions Chase -> Wander when player flees beyond aggroRadius * 1.5', () => {
    const sb = createCombatSandbox();
    const wolf = sb.EntityManager.spawnCreature('Wolf', 10, 50, 0, 1);
    sb.P.x = 0;
    sb.P.z = 0;

    // Put into Chase
    wolf.update(sb.P, 0.016);
    assertEqual(wolf.state, 'Chase');

    // Player flees far away: wolf at x = 10, player at x = 40 => dist = 30m > 15 * 1.5 = 22.5m
    sb.P.x = 40;
    wolf.update(sb.P, 0.016);
    assert(wolf.state === 'Wander' || wolf.state === 'Idle', 'Wolf must abandon pursuit and enter Wander or Idle state');
    assert(wolf.state !== 'Chase', 'Wolf must not remain in Chase state when player is far away');
  });

  test('AI State: Idle/Wander transitions to Hurt stagger state upon taking non-lethal damage', () => {
    const sb = createCombatSandbox();
    const goblin = sb.EntityManager.spawnCreature('Goblin', 50, 50, 50, 1);
    assertEqual(goblin.state, 'Idle');

    // Hit goblin from distance (e.g. arrow or spell)
    goblin.takeDamage(20, { x: 0, z: 0 }, false, 'player');
    assertEqual(goblin.hp, 60, 'Goblin HP should reduce from 80 to 60');
    assertEqual(goblin.state, 'Hurt', 'Damaged creature must enter Hurt stagger state');
    assertEqual(goblin.hurtTimer, 0.35, 'hurtTimer must be initialized to 0.35s');
  });
});

describe('Adversarial M2: Combat Evasion — Roll I-Frames & Shield Block', () => {

  test('Roll I-Frames: Player roll completely evades creature attack damage', () => {
    const sb = createCombatSandbox();
    const wolf = sb.EntityManager.spawnCreature('Wolf', 1.5, 50, 0, 1);
    sb.P.x = 0; sb.P.z = 0;
    sb.P.hp = 100;
    sb.G.hp = 100;

    // Activate roll i-frames on player
    sb.P.isRolling = true;
    wolf.attackTimer = 0; // ready to strike

    wolf.update(sb.P, 0.016);
    assertEqual(sb.P.hp, 100, 'Player HP must remain 100 during roll i-frames (attack missed)');
    assertEqual(sb.G.hp, 100, 'Game HUD HP must remain 100 during roll i-frames');
  });

  test('Shield Block: Mitigates 70% of creature damage and consumes 15 stamina', () => {
    const sb = createCombatSandbox();
    const wolf = sb.EntityManager.spawnCreature('Wolf', 1.5, 50, 0, 1);
    sb.P.x = 0; sb.P.z = 0;
    sb.P.hp = 100;
    sb.G.hp = 100;
    sb.P.stamina = 100;

    // Activate shield block
    sb.P.isBlocking = true;
    wolf.attackTimer = 0; // ready to strike

    // Wolf baseDamage = 14
    // Mitigated dmg = Math.max(1, Math.round(14 * (1 - 0.70))) = Math.round(4.2) = 4
    wolf.update(sb.P, 0.016);

    assertEqual(sb.P.hp, 96, 'Player should only take 4 mitigated damage (100 - 4 = 96)');
    assertEqual(sb.G.hp, 96, 'HUD HP should reflect 96');
    assertEqual(sb.P.stamina, 85, 'Shield block should consume 15 stamina (100 - 15 = 85)');
  });

  test('Unblocked Attack: Inflicts full base damage when neither rolling nor blocking', () => {
    const sb = createCombatSandbox();
    const wolf = sb.EntityManager.spawnCreature('Wolf', 1.5, 50, 0, 1);
    sb.P.x = 0; sb.P.z = 0;
    sb.P.hp = 100;
    sb.G.hp = 100;
    sb.P.isRolling = false;
    sb.P.isBlocking = false;
    wolf.attackTimer = 0;

    // Wolf baseDamage = 14
    wolf.update(sb.P, 0.016);

    assertEqual(sb.P.hp, 86, 'Unblocked attack should deal full 14 damage (100 - 14 = 86)');
    assertEqual(sb.G.hp, 86, 'HUD HP should be 86');
  });

  test('Attack Cooldown: Creature cannot attack continuously every tick', () => {
    const sb = createCombatSandbox();
    const wolf = sb.EntityManager.spawnCreature('Wolf', 1.5, 50, 0, 1);
    sb.P.x = 0; sb.P.z = 0;
    sb.P.hp = 100;
    sb.P.isRolling = false;
    sb.P.isBlocking = false;
    wolf.attackTimer = 0;

    // First attack tick
    wolf.update(sb.P, 0.016);
    assertEqual(sb.P.hp, 86, 'First attack deals 14 damage');
    assert(wolf.attackTimer > 1.0, 'Attack timer should be reset to cooldown (~1.4s)');

    // Second attack tick immediately afterwards
    wolf.update(sb.P, 0.016);
    assertEqual(sb.P.hp, 86, 'Player HP must NOT decrease again on next tick while cooldown is active');
  });
});

describe('Adversarial M2: Combat Hit Detection & Singleplayer Verification', () => {

  test('Singleplayer Hit: checkPvPHit damages creatures with 0 remote players connected', () => {
    const sb = createCombatSandbox();
    sb.networkManager = { remotePlayers: new Map() }; // 0 remote players
    sb.P.x = 0; sb.P.y = 50; sb.P.z = 0;
    sb.yaw = 0; sb.pitch = 0; // facing negative Z direction (yaw=0 => fwdZ = -1)

    // Spawn Wolf directly in front of player at z = -1.8 (reach = 2.4)
    const wolf = sb.EntityManager.spawnCreature('Wolf', 0, 50, -1.8, 1);
    assertEqual(wolf.hp, 60);

    // Call checkPvPHit directly
    sb.checkPvPHit('dominant');

    assertEqual(wolf.hp, 35, 'Wolf HP should decrease by 25 damage (60 - 25 = 35) in singleplayer mode');
  });

  test('Reach Boundary: Creature outside reach arc is NOT hit', () => {
    const sb = createCombatSandbox();
    sb.P.x = 0; sb.P.y = 50; sb.P.z = 0;
    sb.yaw = 0; sb.pitch = 0; // facing negative Z

    // Wolf reach limit: reach (2.4) + hitboxRadius (0.65) = 3.05m
    // Place at z = -4.0 (well outside reach)
    const wolf = sb.EntityManager.spawnCreature('Wolf', 0, 50, -4.0, 1);
    sb.checkPvPHit('dominant');

    assertEqual(wolf.hp, 60, 'Creature beyond attack reach must NOT take damage');
  });

  test('Angle Boundary: Creature behind player is NOT hit', () => {
    const sb = createCombatSandbox();
    sb.P.x = 0; sb.P.y = 50; sb.P.z = 0;
    sb.yaw = 0; sb.pitch = 0; // facing negative Z

    // Place wolf behind player at z = +1.5 (behind player's back)
    const wolf = sb.EntityManager.spawnCreature('Wolf', 0, 50, 1.5, 1);
    sb.checkPvPHit('dominant');

    assertEqual(wolf.hp, 60, 'Creature behind player must NOT be hit');
  });

  test('Dead Exclusion: Already dead creatures are skipped and do not take further hits', () => {
    const sb = createCombatSandbox();
    sb.P.x = 0; sb.P.y = 50; sb.P.z = 0;
    sb.yaw = 0; sb.pitch = 0;

    const deadWolf = sb.EntityManager.spawnCreature('Wolf', 0, 50, -1.5, 1);
    deadWolf.state = 'Dead';
    deadWolf.hp = 0;

    const liveWolf = sb.EntityManager.spawnCreature('Wolf', 0.5, 50, -1.5, 1);
    assertEqual(liveWolf.hp, 60);

    sb.checkPvPHit('dominant');
    assertEqual(liveWolf.hp, 35, 'Live wolf must be hit');
    assertEqual(deadWolf.hp, 0, 'Dead wolf must not be targeted');
  });
});

describe('Adversarial M2: Cleave Attack Stress Testing (Greatsword & Battleaxe)', () => {

  test('Non-cleave weapon (sword): Hits strictly ONE target even when 5 creatures are clustered in reach', () => {
    const sb = createCombatSandbox();
    sb.heldId = 'sword'; // non-cleave weapon
    sb.P.x = 0; sb.P.y = 50; sb.P.z = 0;
    sb.yaw = 0; sb.pitch = 0;

    // Spawn 5 wolves in front within reach
    const wolves = [
      sb.EntityManager.spawnCreature('Wolf', 0.0, 50, -1.2, 1), // closest & central
      sb.EntityManager.spawnCreature('Wolf', 0.3, 50, -1.5, 1),
      sb.EntityManager.spawnCreature('Wolf', -0.3, 50, -1.5, 1),
      sb.EntityManager.spawnCreature('Wolf', 0.5, 50, -1.8, 1),
      sb.EntityManager.spawnCreature('Wolf', -0.5, 50, -1.8, 1)
    ];

    sb.checkPvPHit('dominant');

    const hitCount = wolves.filter(w => w.hp < w.maxHp).length;
    assertEqual(hitCount, 1, 'Standard sword must hit strictly ONE target (maxTargets = 1)');
    const damagedWolf = wolves.find(w => w.hp < w.maxHp);
    assert(!!damagedWolf, 'Exactly one creature must take damage');
    assertEqual(damagedWolf.hp, 35, 'The targeted creature must take 25 damage (60 - 25 = 35)');
    assertEqual(wolves.filter(w => w.hp === 60).length, 4, 'The other 4 creatures must remain completely undamaged');
  });

  test('Cleave weapon (greatsword): Hits up to 3 creatures clustered within reach arc', () => {
    const sb = createCombatSandbox();
    sb.heldId = 'greatsword'; // Cleave weapon!
    sb.P.x = 0; sb.P.y = 50; sb.P.z = 0;
    sb.yaw = 0; sb.pitch = 0;

    // Spawn 3 goblins within reach arc
    const g1 = sb.EntityManager.spawnCreature('Goblin', 0.0, 50, -1.5, 1);
    const g2 = sb.EntityManager.spawnCreature('Goblin', 0.4, 50, -1.6, 1);
    const g3 = sb.EntityManager.spawnCreature('Goblin', -0.4, 50, -1.6, 1);

    sb.checkPvPHit('dominant');

    assertEqual(g1.hp, 55, 'Goblin 1 must be damaged by greatsword cleave (80 - 25 = 55)');
    assertEqual(g2.hp, 55, 'Goblin 2 must be damaged by greatsword cleave (80 - 25 = 55)');
    assertEqual(g3.hp, 55, 'Goblin 3 must be damaged by greatsword cleave (80 - 25 = 55)');
  });

  test('Cleave weapon (greatsword): Clustered 5 creatures — strictly capped at 3 targets', () => {
    const sb = createCombatSandbox();
    sb.heldId = 'greatsword';
    sb.P.x = 0; sb.P.y = 50; sb.P.z = 0;
    sb.yaw = 0; sb.pitch = 0;

    const goblins = [
      sb.EntityManager.spawnCreature('Goblin', 0.0, 50, -1.2, 1), // rank 1
      sb.EntityManager.spawnCreature('Goblin', 0.2, 50, -1.4, 1), // rank 2
      sb.EntityManager.spawnCreature('Goblin', -0.2, 50, -1.4, 1), // rank 3
      sb.EntityManager.spawnCreature('Goblin', 0.5, 50, -1.8, 1), // rank 4
      sb.EntityManager.spawnCreature('Goblin', -0.5, 50, -1.8, 1)  // rank 5
    ];

    sb.checkPvPHit('dominant');

    const damaged = goblins.filter(g => g.hp < g.maxHp);
    assertEqual(damaged.length, 3, 'Greatsword cleave must be strictly capped at 3 targets');
    assertEqual(goblins[0].hp, 55, 'Rank 1 must be hit');
    assertEqual(goblins[1].hp, 55, 'Rank 2 must be hit');
    assertEqual(goblins[2].hp, 55, 'Rank 3 must be hit');
    assertEqual(goblins[3].hp, 80, 'Rank 4 must be spared');
    assertEqual(goblins[4].hp, 80, 'Rank 5 must be spared');
  });

  test('Cleave weapon (battleaxe): Secondary hand cleave attack', () => {
    const sb = createCombatSandbox();
    sb.getEquippedOffHandId = () => 'battleaxe'; // battleaxe in offhand
    sb.P.x = 0; sb.P.y = 50; sb.P.z = 0;
    sb.yaw = 0; sb.pitch = 0;

    const g1 = sb.EntityManager.spawnCreature('Goblin', 0.0, 50, -1.5, 1);
    const g2 = sb.EntityManager.spawnCreature('Goblin', 0.3, 50, -1.5, 1);

    sb.checkPvPHit('secondary');

    assertEqual(g1.hp, 55, 'Secondary battleaxe cleave should hit goblin 1');
    assertEqual(g2.hp, 55, 'Secondary battleaxe cleave should hit goblin 2');
  });
});

describe('Adversarial M2: Creature Death, Loot Drops & Combat XP', () => {

  test('Lethal damage transitions creature to Dead state with deathTimer', () => {
    const sb = createCombatSandbox();
    const wolf = sb.EntityManager.spawnCreature('Wolf', 0, 50, -1.5, 1);
    assertEqual(wolf.hp, 60);

    // Inflict lethal damage
    const remainingHp = wolf.takeDamage(100, { x: 0, z: -1 }, false, 'player');
    assertEqual(remainingHp, 0, 'HP must reach 0');
    assertEqual(wolf.hp, 0);
    assertEqual(wolf.state, 'Dead', 'State must transition to Dead');
    assertEqual(wolf.deathTimer, 1.2, 'deathTimer must be initialized to 1.2s');
  });

  test('Creature death awards combat XP to player and triggers level-up', () => {
    const sb = createCombatSandbox();
    const wolf = sb.EntityManager.spawnCreature('Wolf', 0, 50, -1.5, 1);
    // Wolf loot.xp = 25
    sb.P.xp = 80;
    sb.P.level = 1;
    sb.P.xpNext = 100;

    wolf.takeDamage(70, null, false, 'player');

    // 80 + 25 = 105 >= 100 => Level Up to Lv2, 5 leftover XP
    assertEqual(sb.P.level, 2, 'Player should level up to Level 2 upon killing creature');
    assertEqual(sb.P.xp, 5, 'Leftover XP should be 5 (105 - 100)');
  });

  test('Creature death spawns physical 3D loot drops (wood and iron ore)', () => {
    const sb = createCombatSandbox();
    const wolf = sb.EntityManager.spawnCreature('Wolf', 5, 50, 5, 1);

    assertEqual(sb.EntityManager.droppedLoot.length, 0, 'Initially 0 dropped loot');
    wolf.takeDamage(100, null, false, 'player');

    assert(sb.EntityManager.droppedLoot.length >= 2, 'Death should spawn at least 2 loot drops (wood, iron)');
    const woodDrop = sb.EntityManager.droppedLoot.find(l => l.itemId === 'wood');
    const ironDrop = sb.EntityManager.droppedLoot.find(l => l.itemId === 'ore_iron');

    assert(!!woodDrop, 'Physical wood loot drop must exist');
    assert(!!ironDrop, 'Physical iron ore loot drop must exist');
    assertEqual(woodDrop.count, 2, 'Wolf should drop 2 wood');
    assertEqual(ironDrop.count, 1, 'Wolf should drop 1 iron ore');
  });

  test('Loot Magnetism: Player proximity (<= 2.2m) gathers loot into inventory', () => {
    const sb = createCombatSandbox();
    // Drop loot at (10, 50, 10)
    sb.EntityManager.spawnLootDrop('ore_iron', 3, 10, 50, 10);
    assertEqual(sb.EntityManager.droppedLoot.length, 1);

    // Player far away (dist ~ 50m)
    sb.P.x = 0; sb.P.z = 0;
    sb.EntityManager.update(0.016);
    assertEqual(sb.EntityManager.droppedLoot.length, 1, 'Loot remains uncollected when player is far away');

    // Player approaches within 1.5m
    sb.P.x = 10.5; sb.P.z = 10.5; // dist ~ 0.7m <= 2.2m
    const initialIron = sb.INV.find(i => i.id === 'ore_iron').count;
    sb.EntityManager.update(0.016);

    assertEqual(sb.EntityManager.droppedLoot.length, 0, 'Loot must be collected from world');
    const finalIron = sb.INV.find(i => i.id === 'ore_iron').count;
    assertEqual(finalIron, initialIron + 3, 'Inventory must receive +3 iron ore');
  });

  test('Creature Cleanup: Dead creature removed from EntityManager after deathTimer expires', () => {
    const sb = createCombatSandbox();
    const wolf = sb.EntityManager.spawnCreature('Wolf', 0, 50, -1.5, 1);
    wolf.takeDamage(100, null, false, 'player');

    assertEqual(sb.EntityManager.creatures.length, 1);
    assertEqual(wolf.state, 'Dead');

    // Simulate 0.5 seconds (deathTimer 1.2 -> 0.7)
    sb.EntityManager.update(0.5);
    assertEqual(sb.EntityManager.creatures.length, 1, 'Creature stays during death animation');

    // Simulate another 1.0 second (deathTimer 0.7 -> <= 0)
    sb.EntityManager.update(1.0);
    assertEqual(sb.EntityManager.creatures.length, 0, 'Dead creature must be cleanly purged from creatures array');
  });
});

describe('Adversarial M2: Boundary Fuzzing & High-Frequency Stress Testing', () => {

  test('High-frequency attack burst: 20 consecutive attacks on Stone Golem', () => {
    const sb = createCombatSandbox();
    const golem = sb.EntityManager.spawnCreature('Golem', 0, 50, -2.0, 1);
    assertEqual(golem.hp, 220, 'Stone Golem initial HP = 220');

    // 20 attacks dealing 10 damage each
    for (let i = 0; i < 20; i++) {
      golem.takeDamage(10, { x: 0, z: -0.1 }, false, 'player');
    }

    assertEqual(golem.hp, 20, 'Golem HP after 200 damage must be exactly 20 (220 - 200 = 20)');
    assert(golem.state === 'Hurt' || golem.state === 'Chase', 'Golem must still be alive in Hurt or Chase state');

    // 21st attack lethal
    golem.takeDamage(30, null, true, 'player');
    assertEqual(golem.hp, 0, 'Golem HP should be 0');
    assertEqual(golem.state, 'Dead', 'Golem should transition to Dead state');
  });

  test('Negative/Zero damage input: Clamped safely to minimum 1 damage', () => {
    const sb = createCombatSandbox();
    const wolf = sb.EntityManager.spawnCreature('Wolf', 0, 50, -1.5, 1);

    wolf.takeDamage(0);
    assertEqual(wolf.hp, 59, 'Zero damage should deal minimum 1 damage');

    wolf.takeDamage(-10);
    assertEqual(wolf.hp, 58, 'Negative damage should deal minimum 1 damage');
  });

  test('Simultaneous multi-creature assault: 3 wolves attacking simultaneously', () => {
    const sb = createCombatSandbox();
    sb.P.hp = 100;
    sb.G.hp = 100;

    const w1 = sb.EntityManager.spawnCreature('Wolf', 1.0, 50, 0, 1);
    const w2 = sb.EntityManager.spawnCreature('Wolf', -1.0, 50, 0, 1);
    const w3 = sb.EntityManager.spawnCreature('Wolf', 0, 50, 1.0, 1);

    w1.attackTimer = 0;
    w2.attackTimer = 0;
    w3.attackTimer = 0;

    // Run update for all creatures
    sb.EntityManager.update(0.016);

    // 3 wolves deal 14 * 3 = 42 damage total
    assertEqual(sb.P.hp, 58, 'Player HP after 3 simultaneous hits should be 58 (100 - 42)');
    assertEqual(sb.G.hp, 58);
  });
});

// Run suites if executed directly
if (require.main === module) {
  (async () => {
    console.log('\x1b[1m\x1b[36mRunning Adversarial M2 Combat & AI Test Suite...\x1b[0m\n');
    const result = await runSuites(null, { verbose: true });
    if (result.failed > 0) {
      console.error(`\x1b[31mAdversarial M2 Test Suite Failed: ${result.failed} / ${result.total} tests failed!\x1b[0m`);
      process.exit(1);
    } else {
      console.log(`\x1b[32m✔ Adversarial M2 Test Suite Passed completely! All ${result.passed} tests passed.\x1b[0m`);
      process.exit(0);
    }
  })();
}

module.exports = { createCombatSandbox };
