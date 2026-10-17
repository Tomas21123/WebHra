/**
 * =============================================================================
 * UNIT & INTEGRATION TEST SUITE: COMBAT JUICE & DYNAMIC ANIMATIONS
 * =============================================================================
 * Verifies:
 * 1. CombatJuice API & Micro-Freeze / Hitstop
 * 2. Camera Shake Intensity & Decay
 * 3. Weapon Trails, Sparks & Shockwaves Creation
 * 4. Creature Attack Telegraphing & Hurt Stagger / Flinch Animation
 * 5. Creature Death Shatter & Flash Tinting
 * =============================================================================
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { describe, test, assert, assertEqual, runSuites } = require('./test_utils');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const JS_DIR = path.join(PROJECT_ROOT, 'js');

function createJuiceSandbox() {
  class Vector3 {
    constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
    set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
    clone() { return new Vector3(this.x, this.y, this.z); }
    copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
    add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; }
    sub(v) { this.x -= v.x; this.y -= v.y; this.z -= v.z; return this; }
    multiplyScalar(s) { this.x *= s; this.y *= s; this.z *= s; return this; }
  }

  class Euler {
    constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
    set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
  }

  class Color {
    constructor(hex = 0) { this.hex = hex; }
    setHex(hex) { this.hex = hex; return this; }
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
    traverse(fn) {
      fn(this);
      this.children.forEach(c => { if (c && typeof c.traverse === 'function') c.traverse(fn); });
    }
  }

  class Group extends Object3D {}
  class Mesh extends Object3D {
    constructor(geo, mat) {
      super();
      this.isMesh = true;
      this.geometry = geo;
      this.material = mat || new Material();
    }
  }
  class BufferGeometry {
    constructor() { this.attributes = {}; }
    setAttribute(name, attr) { this.attributes[name] = attr; }
    setIndex() {}
    computeVertexNormals() {}
    dispose() {}
  }
  class BufferAttribute {
    constructor(arr, size) { this.array = arr; this.itemSize = size; }
  }
  class TorusGeometry extends BufferGeometry { constructor() { super(); } }
  class RingGeometry extends BufferGeometry { constructor() { super(); } }
  class BoxGeometry extends BufferGeometry { constructor() { super(); } }
  class Material {
    constructor(opts = {}) {
      this.color = opts.color || 0;
      this.emissive = new Color(0);
      this.opacity = opts.opacity || 1;
      this.transparent = !!opts.transparent;
    }
    dispose() {}
  }
  class MeshBasicMaterial extends Material {}
  class MeshLambertMaterial extends Material {}
  class Scene extends Object3D {}

  const sceneInstance = new Scene();

  const sandbox = {
    console,
    Math,
    Date,
    performance: { now: () => Date.now() },
    THREE: {
      Vector3,
      Euler,
      Color,
      Object3D,
      Group,
      Mesh,
      BufferGeometry,
      BufferAttribute,
      TorusGeometry,
      RingGeometry,
      BoxGeometry,
      Material,
      MeshBasicMaterial,
      MeshLambertMaterial,
      Scene,
      DoubleSide: 2
    },
    scene: sceneInstance,
    P: { x: 0, y: 50, z: 0, renderY: 50 },
    yaw: 0,
    pitch: 0
  };
  sandbox.window = sandbox;

  // Load js/combatJuice.js
  const juiceCode = fs.readFileSync(path.join(JS_DIR, 'combatJuice.js'), 'utf8');
  vm.runInNewContext(juiceCode, sandbox);

  // Load js/entities.js
  const entitiesCode = fs.readFileSync(path.join(JS_DIR, 'entities.js'), 'utf8');
  vm.runInNewContext(entitiesCode, sandbox);

  return sandbox;
}

describe('CombatJuice: Hitstop, Screen Shake & Particle Systems', () => {

  test('Hitstop: triggerHitstop pauses effective dt during micro-freeze', () => {
    const sb = createJuiceSandbox();
    const CJ = sb.CombatJuice;

    assert(CJ, 'CombatJuice must be defined');
    assertEqual(CJ.hitstopRemaining, 0, 'Hitstop starts at 0');

    CJ.triggerHitstop(0.06);
    assertEqual(CJ.hitstopRemaining, 0.06, 'Hitstop timer must be set to 0.06s');

    // First update step: effective dt should be 0 because of hitstop
    const effDt = CJ.update(0.02);
    assertEqual(effDt, 0, 'effectiveDt must be 0 while hitstop is active');
    assertEqual(Math.round(CJ.hitstopRemaining * 1000) / 1000, 0.04, 'Hitstop timer must decrement by dt');

    // Let hitstop expire
    CJ.update(0.05);
    assertEqual(CJ.hitstopRemaining, 0, 'Hitstop timer clamps to 0 on expiry');
    const normalDt = CJ.update(0.016);
    assertEqual(normalDt, 0.016, 'effectiveDt resumes normal dt after hitstop');
  });

  test('Camera Shake: triggerCameraShake computes decaying offsets', () => {
    const sb = createJuiceSandbox();
    const CJ = sb.CombatJuice;

    CJ.triggerCameraShake(0.25, 0.20);
    assert(CJ.shakeIntensity > 0, 'Shake intensity should be initialized');
    assert(CJ.shakeDuration > 0, 'Shake duration should be initialized');

    CJ.update(0.05);
    // Offsets should be generated
    assert(typeof CJ.shakeOffsetX === 'number', 'shakeOffsetX must be a number');
    assert(typeof CJ.shakeOffsetY === 'number', 'shakeOffsetY must be a number');
    assert(typeof CJ.shakeOffsetZ === 'number', 'shakeOffsetZ must be a number');

    // After full duration, offsets should decay to 0
    CJ.update(0.20);
    assertEqual(CJ.shakeOffsetX, 0, 'shakeOffsetX decays to 0');
    assertEqual(CJ.shakeOffsetY, 0, 'shakeOffsetY decays to 0');
    assertEqual(CJ.shakeOffsetZ, 0, 'shakeOffsetZ decays to 0');
  });

  test('Visual VFX: Weapon trails, shockwaves, and death shatter spawn objects into scene', () => {
    const sb = createJuiceSandbox();
    const CJ = sb.CombatJuice;

    const trail = CJ.spawnWeaponTrail({ radius: 1.8, isHeavy: true, isCrit: true, color: 0xf59e0b });
    assert(trail, 'Weapon trail must be created');
    assert(sb.scene.children.includes(trail), 'Trail group must be added to scene');

    const sw = CJ.spawnShockwave(5, 50, 5, { maxRadius: 3.5, color: 0xef4444 });
    assert(sw, 'Shockwave group must be created');
    assert(sb.scene.children.includes(sw), 'Shockwave group must be added to scene');

    const shatter = CJ.spawnCreatureDeathShatter(10, 50, 10, 0x10b981);
    assert(shatter, 'Creature death shatter must be created');
    assert(sb.scene.children.includes(shatter), 'Shatter group must be added to scene');

    // Updating combat juice advances and eventually cleans up finished visual groups
    for (let i = 0; i < 50; i++) {
      CJ.update(0.05);
    }
    assertEqual(CJ.trails.length, 0, 'Finished trails must be cleaned up');
    assertEqual(CJ.shockwaves.length, 0, 'Finished shockwaves must be cleaned up');
    assertEqual(CJ.sparks.length, 0, 'Finished sparks/shatters must be cleaned up');
  });

});

describe('Mob Animations: Telegraphing, Hurt Reaction & Mesh Flash', () => {

  test('Attack Telegraphing: Windup animation prepares before attack, lunge follows strike', () => {
    const sb = createJuiceSandbox();
    const wolf = sb.EntityManager.spawnCreature('Wolf', 2.0, 50, 0, 1);
    wolf.state = 'Attack';
    wolf.attackTimer = 0.30; // within 0.45s windup telegraph

    wolf.update(sb.P, 0.016);
    // During windup, root and head tilt backward (-X rotation)
    assert(wolf.limbMeshes.root.rotation.x < 0, 'Root must tilt backward during attack windup');
    assert(wolf.limbMeshes.head.rotation.x < 0, 'Head must pull back during attack windup');

    // Right after strike (active follow-through frame)
    wolf.attackTimer = wolf.attackCooldown - 0.05;
    wolf.update(sb.P, 0.016);
    assert(wolf.limbMeshes.root.rotation.x > 0, 'Root must lunge forward during active strike');
    assert(wolf.limbMeshes.head.rotation.x > 0, 'Head must lunge forward during active strike');
  });

  test('Hit Reaction: Hurt state triggers flinch shudder and red flash tint', () => {
    const sb = createJuiceSandbox();
    const goblin = sb.EntityManager.spawnCreature('Goblin', 3.0, 50, 0, 1);

    goblin.takeDamage(15, { x: 1, z: 0 }, false, 'player');
    assertEqual(goblin.state, 'Hurt', 'State transitions to Hurt upon damage');
    assert(goblin.flashTimer > 0, 'flashTimer is initialized');

    goblin.update(sb.P, 0.016);
    // In Hurt state: root tilts back (-X) with shudder
    assert(goblin.limbMeshes.root.rotation.x < 0, 'Root must flinch backward in Hurt state');
    assert(goblin.limbMeshes.head.rotation.x < 0, 'Head must flinch backward in Hurt state');

    // Flash timer expires and resets emissive tint
    goblin.flashTimer = 0.01;
    goblin.update(sb.P, 0.02);
    assertEqual(goblin.flashTimer, 0, 'flashTimer clamps to 0');
  });

  test('Death Collapse: Dead state progressively slumps and scales down', () => {
    const sb = createJuiceSandbox();
    const wolf = sb.EntityManager.spawnCreature('Wolf', 2.0, 50, 0, 1);
    wolf.takeDamage(999, { x: 0, z: 0 }, false, 'player');

    assertEqual(wolf.state, 'Dead', 'State must be Dead');
    assertEqual(wolf.deathTimer, 1.2, 'deathTimer starts at 1.2s');

    // Update through half of death
    wolf.update(sb.P, 0.5);
    assert(wolf.limbMeshes.root.rotation.x > 1.0, 'Root rotation tilts creature onto its side/back');

    // Update to end of death
    wolf.update(sb.P, 0.5);
    assert(wolf.group.scale.x < 1.0, 'Creature scale shrinks smoothly into the ground');
  });

});

if (require.main === module) {
  runSuites();
}

module.exports = { createJuiceSandbox };
