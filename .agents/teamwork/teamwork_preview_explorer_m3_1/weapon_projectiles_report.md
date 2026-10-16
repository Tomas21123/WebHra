# Technical Exploration & Architecture Blueprint
# Weapon Arsenal, Active Projectiles & Shield Mechanics (Feature F7 / Milestone 3)

**Author:** `teamwork_preview_explorer_m3_1`  
**Date:** 2026-10-16  
**Target Subsystem:** `js/combat.js`, `js/player.js`, `js/entities.js`, `js/items.js`, `js/character.js`, `js/audio.js`  
**Output File:** `weapon_projectiles_report.md`

---

## 1. Executive Summary & Codebase Audit

An in-depth technical analysis of the combat, player physics, item data, character animations, and networking code was performed to design the implementation of **Feature F7: Full Weapon Arsenal, Active Projectiles & Shield Mechanics**.

### Key Observations & Existing Code Status:
1. **Existing Asset Base (`js/items.js`)**:
   - `INV` defines 13 weapon/shield items: `sword`, `spear`, `dagger`, `battleaxe`, `mace`, `greatsword`, `staff_fire`, `staff_frost`, `bow`, `hammer`, `katana`, `shield_wood`, and `shield_iron`.
   - `W3` and `W3_OFF` generate procedural 3D voxel models for all 13 weapons using `createSingleVoxMesh()` from `voxelBuilder.js`.
   - Items define attributes: `damage`, `reach`, `speed`, `critChance`, and for shields `defense` and `blockPower`.
2. **Current Player Combat Pipeline (`js/player.js`)**:
   - `checkPvPHit(whichHand)` performs a directional dot-product cone check against `EntityManager.creatures` and `window.networkManager.remotePlayers`.
   - Cleave logic is partially present: `isCleave = (weaponId === 'greatsword' || weaponId === 'battleaxe')` hits up to 3 targets.
   - Dual-wielding actions are handled via `handleHandAction('dominant')` (LMB) and `handleHandAction('secondary')` (RMB).
   - If an off-hand item is a shield (`item.subcat === 'shield'`), holding RMB sets `isPlayerBlocking = true` and `blockingHand = whichHand`.
3. **Identified Deficiencies & Gaps**:
   - **No Active Projectile System**: Bows (`bow`) and staffs (`staff_fire`, `staff_frost`) merely call `playAttackSound('bow')` or `playAttackSound('staff')` and execute the melee `checkPvPHit()` at short range. No physical 3D arrow, fireball, or frost projectile is spawned or simulated in the world.
   - **No Magic Spell Effects**: Neither burn damage-over-time (DoT) nor freezing slow debuffs exist on entities.
   - **No Shield Projectile Deflection**: While `isPlayerBlocking` mitigates creature melee damage in `entities.js:646`, there is no mechanism for deflecting incoming missiles, arrows, or fireballs, and stamina drain during blocking is not hooked into `G.st` or player fatigue/guard-break states.
   - **No Dedicated Combat/Projectile Module**: `EntityManager` in `entities.js:692` has an empty `projectiles: []` array that is never populated or updated.
   - **Missing Network Synchronization for Blocking**: The player movement packet in `network.js:1184` does not synchronize `isBlocking`, preventing remote players from seeing shield blocking stances or projectile deflections.

---

## 2. Comprehensive Weapon Arsenal Specification

The game features 13 distinct weapons and shields grouped into 4 combat archetypes: Melee, Ranged, Magic, and Defense.

### 2.1 Weapon Combat Matrix

| ID | Name | Archetype | Subcat | Dmg | Reach | Spd | Crit | Stamina Cost | Special Mechanics |
|---|---|---|---|---|---|---|---|---|---|
| `sword` | Ocelový meč | Melee | `sword` | 26 | 3.2m | 1.10x | 12% | 6 ST | Balanced 2-hit diagonal slash combo |
| `spear` | Rytířské kopí | Melee | `spear` | 34 | 4.8m | 0.95x | 15% | 9 ST | Long-range linear thrust, +15% armor piercing |
| `dagger` | Zlodějská dýka | Melee | `other` | 18 | 2.2m | 1.60x | 30% | 3 ST | High attack speed, rapid jab & slice combo, 30% crit |
| `battleaxe` | Válečná sekera | Melee | `other` | 42 | 3.4m | 0.80x | 18% | 12 ST | Heavy wide arc, cleaves up to 2 targets |
| `mace` | Okovaný palcát | Melee | `other` | 30 | 3.0m | 1.00x | 10% | 10 ST | High impact, +25% knockback force |
| `greatsword`| Obouruční meč | Melee | `sword` | 54 | 3.9m | 0.72x | 20% | 16 ST | 70° sweeping arc, cleaves up to 3 targets, +40% knockback |
| `hammer` | Kovářské kladivo | Melee | `other` | 50 | 3.2m | 0.70x | 20% | 15 ST | Overhead ground slam, causes 0.5s stagger/stun on target |
| `katana` | Východní katana | Melee | `sword` | 46 | 3.6m | 1.35x | 35% | 8 ST | Swift slice, fast recovery, 35% crit chance |
| `bow` | Tisový luk | Ranged | `bow` | 36 | 60.0m | 1.00x | 22% | 8 ST | Shoots physical 3D arrow with gravity trajectory (45 m/s) |
| `staff_fire`| Ohnivá hůl | Magic | `staff` | 62 | 45.0m | 0.85x | 25% | 12 ST | Fires Fireball: 3.2m radial AoE explosion + 3.2s Burn DoT |
| `staff_frost`| Mrazivá hůl | Magic | `staff` | 58 | 45.0m | 0.90x | 22% | 12 ST | Fires Frost Shard: 4.0s Frost Slow (-40% speed) + icy effect |
| `shield_wood`| Dubový štít | Defense | `shield`| - | - | - | - | 12 ST/blk | Blocks 70% damage, deflects arrows, cancels knockback |
| `shield_iron`| Královský štít | Defense | `shield`| - | - | - | - | 15 ST/blk | Blocks 85% damage, deflects magic & arrows, cancels knockback |

---

### 2.2 Melee Combat Mechanics & Stamina

1. **Attack Cadence & Animation Duration**:
   Attack duration ($T_{\text{atk}}$) scales inversely with weapon speed multiplier:
   $$T_{\text{atk}} = \frac{0.28\text{ s}}{\text{speed}}$$
   - Dagger: $0.28 / 1.6 \approx 0.175\text{ s}$
   - Katana: $0.28 / 1.35 \approx 0.207\text{ s}$
   - Sword: $0.28 / 1.1 \approx 0.254\text{ s}$
   - Battleaxe: $0.28 / 0.8 \approx 0.350\text{ s}$
   - Greatsword: $0.28 / 0.72 \approx 0.388\text{ s}$
   - Hammer: $0.28 / 0.70 \approx 0.400\text{ s}$

2. **Stamina Management**:
   Every melee swing consumes stamina from `G.st`:
   - If `G.st < cost`: attack damage is reduced by 50% and attack speed is reduced by 30% ("Exhausted swing").
   - Stamina regeneration delay (`G.sd`) resets to 0 upon swinging.

3. **Multi-Target Cleave Calculation**:
   In `checkPvPHit()`:
   - Greatsword: `maxTargets = 3`, cone half-angle $\theta = 35^\circ$ ($\min \text{dot} \approx 0.25$).
   - Battleaxe: `maxTargets = 2`, cone half-angle $\theta = 30^\circ$ ($\min \text{dot} \approx 0.30$).
   - Standard weapons: `maxTargets = 1`, cone half-angle $\theta = 22^\circ$ ($\min \text{dot} \approx 0.38$).

4. **Spear Armor Penetration**:
   Spears ignore 15% of the target's base defense or creature damage reduction:
   $$\text{EffectiveDamage} = \text{damage} \times (1 + 0.15)$$

5. **Hammer Stagger / Stun**:
   Creatures struck by `hammer` are placed into state `'Hurt'` with `hurtTimer = 0.50s`, completely locking their AI and movement.

---

## 3. Ranged Bow & Ballistic Arrow System

### 3.1 3D Arrow Mesh Specification

The arrow entity is rendered as a clean, high-performance 3D composite mesh (`THREE.Group`):
- **Shaft**: Cylindrical wooden body:
  - Geometry: `new THREE.CylinderGeometry(0.015, 0.015, 0.72, 6)`
  - Material: `MeshLambertMaterial({ color: 0x8a5a30 })` (Ash wood)
- **Arrowhead**: Sharp triangular steel tip:
  - Geometry: `new THREE.ConeGeometry(0.045, 0.14, 4)`
  - Position: $(0, 0.36 + 0.07, 0)$
  - Material: `MeshLambertMaterial({ color: 0xd5dbe6 })` (Polished steel)
- **Fletching (Vanes)**: 3 feather vanes positioned at the tail:
  - 3 thin flat boxes `BoxGeometry(0.005, 0.12, 0.05)` rotated at $0^\circ$, $120^\circ$, and $240^\circ$ around the shaft axis.
  - Position: $(0, -0.28, 0)$
  - Material: `MeshLambertMaterial({ color: 0xe0e6ed })` (White feather)
- Default Orientation: Aligned along its forward $+Z$ flight axis (`rotation.x = Math.PI / 2`).

### 3.2 Launch & Physics Trajectory

1. **Aim Vector Derivation**:
   Calculated from the camera look angles (`yaw`, `pitch`):
   $$\mathbf{dir} = \begin{pmatrix} -\sin(\text{yaw}) \cos(\text{pitch}) \\ -\sin(\text{pitch}) \\ -\cos(\text{yaw}) \cos(\text{pitch}) \end{pmatrix}$$
2. **Initial Position**:
   Spawned at the player's eye level offset forward by 0.6m to prevent clipping into the player hitbox:
   $$\mathbf{p}_0 = \mathbf{p}_{\text{eye}} + \mathbf{dir} \times 0.6$$
3. **Ballistic Simulation**:
   - Initial velocity: $\mathbf{v}_0 = \mathbf{dir} \times 45.0\text{ m/s}$.
   - Gravity: $g = -9.81\text{ m/s}^2$ applied strictly to vertical velocity:
     $$v_y(t + \Delta t) = v_y(t) - 9.81 \cdot \Delta t$$
     $$\mathbf{p}(t + \Delta t) = \mathbf{p}(t) + \mathbf{v}(t) \cdot \Delta t$$
4. **Attitude Alignment**:
   On every frame, the arrow mesh aligns its orientation to point along its instantaneous velocity vector:
   $$\mathbf{v}_{\text{norm}} = \frac{\mathbf{v}}{\|\mathbf{v}\|}$$
   `mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), vNorm);`

### 3.3 Continuous Collision Detection (CCD)

Because arrows travel $45\text{ m/s}$ ($0.75\text{ m}$ per frame at 60 FPS), discrete point testing could tunnel through voxels or entities. The system executes a linear swept segment check from $\mathbf{p}_{\text{start}}$ to $\mathbf{p}_{\text{end}}$:

1. **Terrain Raycast**:
   Sample along the path in increments of $0.25\text{ m}$ using `solid(x, y, z)`:
   - If a solid voxel is encountered:
     - Arrow sticks into the block face at impact point $\mathbf{p}_{\text{hit}}$.
     - Marks `arrow.stuck = true`, freezes velocity to $\mathbf{0}$.
     - Stays visible embedded in the terrain for $5.0\text{s}$, then smoothly fades opacity and is disposed.
2. **Entity Hit Check**:
   For all active creatures in `EntityManager.creatures`:
   - Compute the shortest distance from the creature's sphere center $\mathbf{c}$ to the swept line segment $[\mathbf{p}_{\text{start}}, \mathbf{p}_{\text{end}}]$.
   - If $d \le r_{\text{hitbox}} + 0.1\text{ m}$:
     - Inflicts weapon damage calculated via `getPlayerAttackDamage('dominant')`.
     - Applies knockback along flight vector: $\mathbf{v}_{\text{kb}} = \mathbf{v}_{\text{norm}} \times 2.8$.
     - Despawns arrow immediately with blood/spark particles and impact sound.
3. **Remote Player Hit Check (Multiplayer)**:
   - Checks against all remote player bounding capsules in `networkManager.remotePlayers`.
   - On hit, broadcasts `playerHit` packet and spawns damage number.

---

## 4. Magic Staffs: Fire & Frost Spell Mechanics

### 4.1 Fire Staff (`staff_fire`)

- **Visual Manifestation**:
  - Central Fireball Core: `THREE.SphereGeometry(0.22, 10, 10)` with emissive material (`color: 0xff3300`, `emissive: 0xff6600`).
  - Outer Fiery Corona: Translucent pulsing shell (`color: 0xffaa00`, `opacity: 0.65`, `transparent: true`).
  - Dynamic PointLight: `new THREE.PointLight(0xff5500, 2.0, 6.0)` traveling with the projectile.
  - Flame Particle Trail: 2 ember particles spawned per frame behind the projectile with subtle upward drift and size attenuation.
- **Flight Characteristics**:
  - Speed: $32.0\text{ m/s}$ linear (zero gravity for magical levitation).
  - Max Range: $60\text{ m}$ / Max Lifetime: $3.0\text{ s}$.
- **Detonation & Splash Damage**:
  - Triggers on collision with any solid voxel, creature, or player.
  - Spawns expanding fiery explosion sphere (`radius: 0.4m -> 3.2m` in $0.18\text{ s}$, then fades).
  - Deals radial splash damage to all entities within $R_{\text{splash}} = 3.2\text{ m}$:
    $$\text{Dmg}(d) = \text{baseDamage} \times \left(1 - \frac{d}{R_{\text{splash}}} \times 0.5\right)$$
    (Guaranteed at least 50% damage even at the outer edge).
- **Ignite & Burn DoT (Damage over Time)**:
  - Any entity caught in the blast radius gains the `burn` status effect:
    ```javascript
    target.statusEffects.burn = {
      dps: 8,
      duration: 3.2,
      tickTimer: 0.8,
      elapsed: 0
    };
    ```
  - Ticks every $0.8\text{ s}$ for 4 ticks, inflicting $4 \times 8 = 32\text{ HP}$ extra damage while emitting burning embers from the target's body.

### 4.2 Frost Staff (`staff_frost`)

- **Visual Manifestation**:
  - Crystalline Frost Shard: Elongated faceted octahedron or cone (`0x38bdf8`) with sharp edges and frosted white specular highlights.
  - Dynamic PointLight: `new THREE.PointLight(0x00e1ff, 1.8, 5.5)`.
  - Ice Crystal Glitter Trail: Emits shimmering cyan diamond particles.
- **Flight Characteristics**:
  - Speed: $36.0\text{ m/s}$ linear (zero gravity).
  - Max Range: $65\text{ m}$ / Max Lifetime: $3.0\text{ s}$.
- **Impact & Shatter**:
  - On contact, the shard shatters into 6-8 micro ice crystals that disperse radially and dissolve.
  - Direct damage: 58 HP base damage (plus upgrades/player bonuses).
- **Frost Slow Debuff**:
  - The target gains the `frost_slow` status effect:
    ```javascript
    target.statusEffects.frost_slow = {
      speedMult: 0.60, // -40% Movement Speed
      duration: 4.0,
      elapsed: 0
    };
    ```
  - Target's `speedChase` and `speedWander` are multiplied by 0.60.
  - Target flashes cyan/blue with icy particles rising around them for the full 4.0s duration.

---

## 5. Shield Mechanics & Active Blocking

### 5.1 Shield Input & State Pipeline

1. **Input Mapping**:
   In `js/player.js`:
   - Right-click mouse button (RMB) invokes `handleHandAction('secondary')`.
   - If secondary hand holds a shield (`item.subcat === 'shield'`):
     - `isPlayerBlocking = true;`
     - `blockingHand = 'secondary';`
   - Releasing RMB invokes `handleHandRelease('secondary')`, resetting `isPlayerBlocking = false`.
2. **Movement Modifier**:
   - While blocking, player sprint is disabled.
   - Ground movement speed is multiplied by $0.70\times$ (defensive posture).
3. **Visual Character Animation**:
   - `character.js:754-770` raises the shield arm directly in front of the chest and head (`rotation.set(-1.45, -0.45, 0.22)`).
   - This posture is fully visible in both third-person camera and to remote multiplayer peers.

### 5.2 Damage Mitigation & Guard Break

1. **Damage Mitigation**:
   When an incoming attack (creature melee, monster bite, player slash) hits a player while blocking:
   - Base damage is reduced by **70%** (Wood Shield: 70%, Iron Shield: 85-90%):
     $$\text{MitigatedDamage} = \max(1, \text{round}(\text{IncomingDamage} \times (1 - \text{blockPower})))$$
   - Player HP is reduced only by $\text{MitigatedDamage}$.
2. **Stamina Drain**:
   - Each blocked melee attack consumes 15 stamina: `G.st = Math.max(0, G.st - 15)`.
   - If stamina drops to 0 during a block:
     - **Guard Break!**
     - Staggers player for $0.65\text{ s}$, temporarily disabling blocking and movement.
     - `G.tired = 1`.
     - Full unblocked damage from that breakthrough blow passes through.
     - Audio: Heavy metal clank/break sound.
3. **Sound & Audio Synthesis**:
   - Every successful block calls `window.playBlockSound()` (already implemented in `audio.js:75`), generating a crisp metallic chime/clang.
   - Screen feedback: Toast `🛡️ Útok vykryt štítem (-[N] HP)` and yellow/white spark particles at shield coordinates.

### 5.3 Active Projectile Deflection

Shields have the ability to **deflect incoming projectiles** (arrows, fireballs, darts) entirely when facing the oncoming threat:

1. **Facing Angle Verification**:
   Let $\mathbf{fwd}$ be the player's forward gaze direction vector and $\mathbf{v}_{\text{proj}}$ be the incoming projectile's velocity:
   $$\cos(\phi) = \frac{\mathbf{fwd} \cdot (-\mathbf{v}_{\text{proj}})}{\|\mathbf{v}_{\text{proj}}\|}$$
   - If $\cos(\phi) > 0.25$ (the player is facing within $\pm 75^\circ$ of the projectile source):
     - **Deflection Successful!**
2. **Deflection Physics**:
   - The projectile's damage to the player is negated ($0\text{ damage}$).
   - Stamina cost: 10 stamina drained (`G.st = Math.max(0, G.st - 10)`).
   - The projectile is reflected backwards with angular dispersion:
     $$\mathbf{v}_{\text{deflected}} = -\mathbf{v}_{\text{proj}} \times 0.45 + \mathbf{v}_{\text{scatter}}$$
     $$\text{gravity} = -14.0\text{ m/s}^2$$
   - The projectile enters a "deflected" state, where it no longer harms the defender and drops to the dirt.
   - `window.playBlockSound()` plays, accompanied by rich spark particle burst.
   - Toast: `🛡️ Projektil odražen štítem!`.

---

## 6. Projectile Management Architecture

### 6.1 Placement: `js/combat.js` vs `js/entities.js`

- **Analysis**:
  - `entities.js` currently hosts `EntityManager`, which owns `creatures: []`, `droppedLoot: []`, `damageNumbers: []`, and an unused `projectiles: []`.
  - However, projectiles are fired by the **player** (`js/player.js`), **remote players** (`js/network.js`), and potentially ranged creatures (e.g. `Skeleton Archer` in `entities.js`).
  - Creating a dedicated, modular **`js/combat.js`** cleanly decouples combat mathematics, projectile simulations, status effects, and shield deflection logic from monster AI.
  - `CombatManager` (or `ProjectileManager`) can be exposed globally on `window` and its `.update(dt)` invoked inside `game.js:504` right alongside `EntityManager.update(dt)`.
  - Alternatively, if single-script loading without modifying script tags in `play/index.html` is preferred, the projectile manager can be embedded directly into `js/entities.js` or `js/player.js`.
  - **Recommendation**: Implement `CombatManager` in `js/combat.js` and load it before `player.js` in `play/index.html`. Also mirror/forward `window.EntityManager.projectiles` to `CombatManager.projectiles` for seamless compatibility.

### 6.2 Data Structures & Class Architecture

```javascript
class ProjectileInstance {
  constructor(cfg) {
    this.id = cfg.id || nextProjectileId++;
    this.type = cfg.type; // 'arrow' | 'fireball' | 'frost'
    this.owner = cfg.owner || 'player'; // 'player' | 'creature' | 'remotePlayer'
    this.ownerId = cfg.ownerId || null;

    // Spatial & Physics
    this.x = cfg.x;
    this.y = cfg.y;
    this.z = cfg.z;
    this.vx = cfg.vx;
    this.vy = cfg.vy;
    this.vz = cfg.vz;
    this.gravity = cfg.gravity || 0; // -9.81 for arrow, 0 for spells
    this.speed = cfg.speed || 40.0;

    // Combat Stats
    this.damage = cfg.damage || 20;
    this.isCrit = !!cfg.isCrit;
    this.splashRadius = cfg.splashRadius || 0;

    // Lifespan & Culling
    this.age = 0;
    this.maxAge = 3.0; // 3.0s lifetime culling
    this.distanceTraveled = 0;
    this.maxDistance = 90.0; // distance culling
    this.stuck = false;
    this.stuckTimer = 5.0; // despawns 5s after sticking into voxel
    this.dead = false;

    // 3D Visuals
    this.mesh = null;
    this.light = null;
    this.trailTimer = 0;

    this._initVisuals();
  }
}
```

```javascript
const CombatManager = {
  projectiles: [],
  activeStatusEffects: [], // creatures/players with burn or frost_slow

  spawnProjectile: function (type, origin, direction, weaponStats, owner = 'player') {
    // Calculates initial position, velocity, assigns 3D mesh, registers to scene
  },

  update: function (dt) {
    // 1. Updates all active projectiles (physics, CCD, collision, culling)
    // 2. Updates active status effects (burn DoT ticks, frost slow expiration)
    // 3. Updates particle trails and visual light fades
  },

  clearAll: function () {
    // Disposes all Three.js meshes, materials, point lights
  }
};
```

### 6.3 Lifecycle & Memory Management

1. **Step Execution**:
   - `age += dt; if (age >= maxAge) dispose();`
   - Calculate trajectory:
     $$\mathbf{p}_{\text{start}} = (x, y, z)$$
     $$v_y \mathrel{-}= \text{gravity} \cdot dt$$
     $$\mathbf{p}_{\text{end}} = \mathbf{p}_{\text{start}} + \mathbf{v} \cdot dt$$
     $$\text{distStep} = \|\mathbf{p}_{\text{end}} - \mathbf{p}_{\text{start}}\|$$
     $$\text{distanceTraveled} += \text{distStep}$$
     - If $\text{distanceTraveled} > \text{maxDistance}$ (90m), mark dead.
2. **CCD Raycasting**:
   - Segment $[\mathbf{p}_{\text{start}}, \mathbf{p}_{\text{end}}]$ checked against:
     1. Terrain voxels via `solid(x, y, z)`
     2. Creatures via `EntityManager.creatures`
     3. Players via `remotePlayers` & local player `P` (with shield deflection)
3. **Disposal**:
   When `dead === true`:
   - `scene.remove(mesh)`
   - Dispose geometries and materials recursively.
   - `if (light) scene.remove(light); light.dispose();`
   - Splice from `projectiles` array.

---

## 7. Status Effects Architecture (Burn & Frost Slow)

### 7.1 Data Schema on Entities

To support magic mechanics without altering the base game loop:
Every creature instance in `EntityManager.creatures` is extended with:
```javascript
this.statusEffects = {
  burn: null,      // { dps: 8, duration: 3.2, tickTimer: 0.8, timer: 0 }
  frost_slow: null // { slowPercent: 0.40, duration: 4.0, timer: 0 }
};
```

### 7.2 Update Loop in `CreatureInstance.prototype.update`

```javascript
// Aplikace efektu hoření (Burn DoT)
if (this.statusEffects && this.statusEffects.burn) {
  const b = this.statusEffects.burn;
  b.timer += dt;
  b.tickTimer += dt;
  if (b.tickTimer >= 0.8) {
    b.tickTimer = 0;
    this.takeDamage(b.dps, null, false, 'burn');
    // Spawnuje malý plamínek
    if (window.EntityManager) {
      window.EntityManager.spawnDamageNumber(this.x, this.y + this.height * 0.9, this.z, b.dps, false, false);
    }
  }
  if (b.timer >= b.duration) {
    this.statusEffects.burn = null;
  }
}

// Aplikace mrazivého zpomalení (Frost Slow)
let speedMult = 1.0;
if (this.statusEffects && this.statusEffects.frost_slow) {
  const f = this.statusEffects.frost_slow;
  f.timer += dt;
  speedMult = (1 - f.slowPercent); // 0.60x rychlost
  if (f.timer >= f.duration) {
    this.statusEffects.frost_slow = null;
  }
}
```

---

## 8. Multiplayer Synchronization Protocol

To ensure seamless multiplayer combat across both dedicated WebSocket server and PeerJS P2P:

### 8.1 Network Packet Additions

1. **Player Transform Packet Extension (`move` / `playerMove`)**:
   Add `isBlocking`:
   ```javascript
   {
     type: 'move',
     x, y, z, vx, vy, vz,
     yaw, pitch,
     isRolling, rollTimer,
     attacking, attackTime,
     isBlocking: isPlayerBlocking(), // NEW
     blockingHand: blockingHand      // NEW
   }
   ```
2. **Spawn Projectile Broadcast Packet (`spawnProjectile`)**:
   When any player fires an arrow or casts a spell:
   ```javascript
   {
     type: 'spawnProjectile',
     id: projectileId,
     ownerId: networkManager.playerId,
     projType: 'arrow' | 'fireball' | 'frost',
     x, y, z,
     vx, vy, vz,
     damage: calculatedDamage,
     isCrit: isCrit
   }
   ```
   Upon receiving `spawnProjectile`, remote clients instantiate a client-side visual projectile instance so all players see arrows arching through the sky and fireballs illuminating the terrain.
3. **Player Deflection Event (`shieldDeflect`)**:
   ```javascript
   {
     type: 'shieldDeflect',
     playerId: defenderId,
     x, y, z
   }
   ```
   Plays the block audio chime and triggers spark particles on all connected peers.

---

## 9. Implementation Plan & Concrete Code Changes

### Step 1: Create `js/combat.js`
Create `js/combat.js` housing:
- `createArrowMesh()`, `createFireballMesh()`, `createFrostMesh()`
- `ProjectileInstance` class
- `window.CombatManager` with `projectiles: []`, `spawnProjectile()`, `update(dt)`, `clearAll()`
- Shield deflection checks and radial explosion handler.

### Step 2: Integrate into `js/player.js`
1. In `triggerHandAttack(whichHand)`:
   - If held item is `bow`: call `CombatManager.spawnProjectile('arrow', ...)` and consume 8 stamina.
   - If held item is `staff_fire`: call `CombatManager.spawnProjectile('fireball', ...)` and consume 12 stamina.
   - If held item is `staff_frost`: call `CombatManager.spawnProjectile('frost', ...)` and consume 12 stamina.
   - If held item is melee: deduct weapon stamina cost, apply cleave / hammer stun.
2. In `handleHandAction(whichHand)`:
   - If held item is shield: set `isPlayerBlocking = true`, `blockingHand = whichHand`.
3. In `handleHandRelease(whichHand)`:
   - If `blockingHand === whichHand`: set `isPlayerBlocking = false`, `blockingHand = null`.
4. In `hurt(n)` (`config.js` or `player.js`):
   - Check if `isPlayerBlocking` is active: reduce incoming damage by 70%, drain 15 stamina, trigger `playBlockSound()`. If stamina is 0, trigger guard break.

### Step 3: Update `js/entities.js`
1. Hook `statusEffects` (`burn`, `frost_slow`) inside `CreatureInstance`.
2. Connect `EntityManager.update(dt)` to update `CombatManager.update(dt)` if loaded, or maintain synchronization.
3. Enable ranged AI creatures (such as `Skeleton Archer`) to call `CombatManager.spawnProjectile('arrow', ...)` targeting the player.

### Step 4: Update `js/character.js`
Ensure `isBlock` evaluates `s.isBlocking || s.blocking || (window.isPlayerBlocking && window.isPlayerBlocking())` so character animations reflect shield raising smoothly.

### Step 5: Update `play/index.html` & `index.html`
Add `<script src="../js/combat.js?v=1"></script>` right before `player.js` in `play/index.html`.

---

## 10. Edge Cases & Fault Tolerance

1. **Zero-Gravity Spells vs Terrain Boundaries**:
   Fireballs and frost crystals traveling towards infinite void despawn cleanly after $3.0\text{ s}$ or $90\text{ m}$ traveled, ensuring no memory leaks.
2. **High-Speed Tunneling Protection**:
   Sub-stepping CCD guarantees arrows traveling at $45\text{ m/s}$ never pass through single-voxel walls or small creatures between frames.
3. **Dual Shield Wielding / Hand Switching**:
   If a player equips shields in both hands or switches dominant hands, `isPlayerBlocking` dynamically queries the active blocking hand and shields player without animation glitches.
4. **Stamina Exhaustion Mid-Block**:
   When stamina is depleted to zero while blocking, `isPlayerBlocking` is forcefully canceled for $0.65\text{ s}$ (guard break stagger), preventing infinite blocking exploitation.
5. **Multiplayer Latency & Desync**:
   Hit confirmations remain authoritative on the shooter's client, sending verified `playerHit` damage events to the server/host, while visual projectiles are simulated locally for zero input lag.
