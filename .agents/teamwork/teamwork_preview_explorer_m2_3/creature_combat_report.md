# Architectural Blueprint & Technical Exploration Report
## Feature 6: PvE Creatures, AI State Machine & Combat Hitbox Expansion (F6)

**Author:** `teamwork_preview_explorer_m2_3`  
**Date:** 2026-10-16  
**Project:** Voxelový svět / Cube World Action-RPG Transformation  
**Target Path:** `.agents/teamwork/teamwork_preview_explorer_m2_3/creature_combat_report.md`  
**Dependencies:** F1 (Syntax), F2 (Runtime), F3 (No Block Building), F4 (POIs)

---

## 1. Executive Summary & Codebase Audit

### 1.1 Problem Statement
The current version of the game lacks non-player combat entities. Specifically:
1. **Empty World Combat**: In singleplayer or when no other players are connected, `player.js:checkPvPHit()` immediately exits at line 93 because `window.networkManager.remotePlayers.size === 0`.
2. **Missing Creature System**: No `js/entities.js` exists in the codebase. There are no wild animals, monsters, or dungeon guardians in the procedural voxel world.
3. **Missing AI State Machine**: No entity state engine exists to drive creature behavior (Idle, Wander, Chase, Attack, Hurt, Death) and terrain navigation.
4. **Hitbox & Combat Disconnect**: Attacks only test against remote human players in network mode. Weapons like daggers, swords, greatswords, axes, and spears have reach and damage values in `items.js` and `inventory.js`, but they cannot hit PvE targets.
5. **No Overhead Feedback or Loot**: No 3D floating health bars exist for creatures, no floating damage numbers billboard for PvE hits, and no physical loot or XP drops occur upon creature death.

### 1.2 Audit of Key Files
- **`js/player.js` (lines 92–151 & 199–229)**:
  - `checkPvPHit(whichHand)`: Computes forward ray from camera $(fwdX, fwdY, fwdZ)$ and eye coordinates $(eyeX, eyeY, eyeZ)$. Checks remote players within `reach + 0.75m` with a cone test $(dot > 0.38)$.
  - `triggerHandAttack(whichHand)`: Triggers weapon attack duration ($0.20\text{s} - 0.38\text{s}$), plays weapon audio via `playAttackSound()`, and schedules `checkPvPHit(whichHand)` after $70 - 110\text{ms}$.
  - `hits(x, y, z, customH)` and `physics(dt)`: Shows standard collision checking using `vs(i, j, k)` and a smooth step-assist ($0.55\text{m}$) allowing characters to automatically climb 1-block steps.
- **`js/character.js` & `js/voxelBuilder.js`**:
  - `voxelBuilder.js` provides `bx(list, x0, y0, z0, x1, y1, z1, color)` and `buildVoxGeometry(list, ox, oy, oz)` with `VX = 0.05` ($5\text{cm}$ per voxel unit).
  - Built geometries use `THREE.BufferGeometry` with `THREE.Float32BufferAttribute` for position and vertex color shading, compatible with `THREE.MeshLambertMaterial({ vertexColors: true })`.
- **`js/game.js`**:
  - Main animation loop `loop(now)` handles `physics(dt)`, `ui()`, remote player updates `window.networkManager.updateAllRemotePlayers(dt)`, and renders the scene with `renderer.render(scene, cam)`.
  - Hook point for `EntityManager.update(dt)` exists immediately before rendering (around lines 478–483).
- **`tests/test_harness.js` & `tests/tier1_features.test.js`**:
  - Test suites require strict adherence to `window.EntityManager` contract API:
    - Types: `'Wolf'`, `'Goblin'`, `'Skeleton'` (or `'Skeleton Warrior'`), `'Golem'` (or `'Stone Golem'`).
    - Base HP formula: `maxHp = baseHpMap[type] + (level - 1) * 15`.
      - Wolf: Base $60$ (Lv1 = $60$)
      - Goblin: Base $80$ (Lv2 = $95$)
      - Skeleton: Base $100$ (Lv1 = $100$)
      - Golem: Base $220$ (Lv1 = $220$)
    - State machine: `'Idle'`, `'Wander'`, `'Chase'`, `'Attack'`, `'Dead'`.
    - Loot object: `{ gold, wood, ore_iron, xp }`.
    - Method: `getNearbyCreatures(x, z, radius)`.

---

## 2. Architecture of `js/entities.js`

### 2.1 Interface Contract
`js/entities.js` exposes `window.EntityManager` adhering to the project contract:

```javascript
window.EntityManager = {
  creatures: [],        // Active CreatureInstance array
  projectiles: [],      // Active projectile instances (arrows, magic)
  droppedLoot: [],      // Active 3D physical loot pickups in world
  damageNumbers: [],    // Active floating billboard damage indicators

  spawnCreature(type, x, y, z, level = 1): CreatureInstance,
  removeCreature(id): void,
  getNearbyCreatures(x, z, radius): CreatureInstance[],
  update(dt): void,
  
  // Visual Combat & Drop APIs
  spawnDamageNumber(x, y, z, damage, isCrit, isHeal = false): void,
  spawnLootDrop(itemId, count, x, y, z): void,
  clearAll(): void
};
```

### 2.2 Creature Instance Lifecycle & Data Schema
Each creature instantiated via `spawnCreature` possesses the following structure:

```javascript
{
  id: Number,                    // Unique entity ID
  type: String,                  // 'Wolf' | 'Goblin' | 'Skeleton' | 'Golem'
  name: String,                  // Localized display name ('Lesní vlk', etc.)
  level: Number,                 // Creature level (>= 1)
  x: Number, y: Number, z: Number, // World coordinates (meters)
  vx: Number, vy: Number, vz: Number, // Velocity vector
  rotationY: Number,             // Current yaw orientation
  targetRotationY: Number,       // Desired facing direction
  
  // Health & Stats
  hp: Number,                    // Current health
  maxHp: Number,                 // Maximum health
  baseDamage: Number,            // Melee attack damage
  speedChase: Number,            // Sprint speed during pursuit (m/s)
  speedWander: Number,           // Strolling speed (m/s)
  aggroRadius: Number,           // Detection radius (meters)
  attackReach: Number,           // Melee strike distance (meters)
  attackCooldown: Number,        // Time between attacks (seconds)
  attackTimer: Number,           // Cooldown countdown
  
  // Hitbox & Physics
  hitboxRadius: Number,          // Radial collision boundary (0.6m - 1.2m)
  height: Number,                // Entity vertical height (0.8m - 2.6m)
  ground: Boolean,               // On ground flag
  
  // AI State Engine
  state: String,                 // 'Idle' | 'Wander' | 'Chase' | 'Attack' | 'Hurt' | 'Dead'
  stateTimer: Number,            // Time remaining in current state
  wanderTarget: { x, z },        // Destination coordinates for wandering
  spawnAnchor: { x, y, z },      // Territory center point (spawning site)
  
  // Graphics & 3D Rig
  group: THREE.Group,            // Root 3D scene node
  rig: Object,                   // Rig limb groups (head, torso, legs, arms, tail)
  healthBarSprite: THREE.Sprite, // Overhead health bar & level billboard
  flashTimer: Number,            // Red hurt flash countdown
  
  // Loot & XP Table
  loot: { gold: Number, xp: Number, items: Array<{ id: String, count: Number, chance: Number }> },
  
  // Methods
  takeDamage(dmg, knockback, isCrit, attacker): Number,
  die(): void,
  update(playerPos, dt): void
}
```

---

## 3. Creature Specifications & Stat Matrix

| Creature | Archetype ID | Level 1 HP | Dmg | Speed (Chase/Wander) | Reach | Aggro | Hitbox ($r \times h$) | Drops / Loot Table | XP |
|---|---|---|---|---|---|---|---|---|---|
| **Wolf** | `'Wolf'` / `'creature_wolf'` | 60 | 14 | 6.8 / 2.2 m/s | 2.5 m | 15 m | $0.65\text{m} \times 0.8\text{m}$ | `leather` (1-3, 90%), `apple` (1, 30%), gold (5) | 25 |
| **Goblin** | `'Goblin'` / `'creature_goblin'` | 80 | 18 | 5.4 / 2.0 m/s | 2.1 m | 15 m | $0.60\text{m} \times 1.3\text{m}$ | `ore_iron` (1-2, 80%), `ore_gold` (1, 35%), `apple` (1, 40%), gold (8) | 35 |
| **Skeleton Warrior** | `'Skeleton'` / `'creature_skeleton_warrior'` | 100 | 25 | 4.6 / 1.8 m/s | 2.5 m | 14 m | $0.70\text{m} \times 1.8\text{m}$ | `stone` (3-5, 95%), `ore_iron` (2-3, 75%), `wood` (2-4, 80%), gold (12) | 50 |
| **Stone Golem** | `'Golem'` / `'creature_stone_golem'` | 220 | 45 | 3.0 / 1.4 m/s | 3.4 m | 18 m | $1.20\text{m} \times 2.6\text{m}$ | `gem_ruby` (1, 60%), `gem_sapphire` (1, 40%), `ore_gold` (3-5, 90%), `stone` (8-12, 100%), gold (30) | 150 |

### 3.1 Stat Scaling Across Levels
For any level $L \ge 1$:
- $\text{MaxHP}(L) = \text{baseHp} + (L - 1) \times 15$
- $\text{Damage}(L) = \lfloor \text{baseDamage} \times (1 + (L - 1) \times 0.12) \rfloor$
- $\text{Loot Gold}(L) = \text{baseGold} \times L$
- $\text{XP}(L) = \text{baseXp} \times L$

---

## 4. Procedural Voxel Models & 3D Skeletal Rigs

To guarantee high performance (60 FPS) and avoid redundant geometry recomputation, **voxel geometries for each limb type are cached once in a static geometry cache** (`GEOMETRY_CACHE`), and instantiated into Three.js `Mesh` objects.

```
       [Creature Root Group] (x, y, z, rotation.y)
                 │
                 ▼
          [Body / Center]
         ┌───────┼───────┐
         ▼       ▼       ▼
       Head    Torso    Limbs (Legs/Arms/Tail)
```

### 4.1 Wolf Model Topology
- **Root Group**: Position $(x, y, z)$.
- **Body**: Offset $y = 7 \cdot VX$. Voxel dimensions: Width 8, Height 7, Depth 16 ($0.4\text{m} \times 0.35\text{m} \times 0.8\text{m}$). Slate grey fur `#64748b`, dark dorsal spine `#334155`.
- **Head Group**: Pivot at $(0, 10 \cdot VX, 8 \cdot VX)$.
  - Snout: protruding 6 voxels forward, black nose tip `#1e293b`.
  - Pointed ears (+Y): `#475569`.
  - Glowing amber eyes: `#fbbf24`.
- **Tail Group**: Pivot at $(0, 8 \cdot VX, -8 \cdot VX)$. Slanted downward with gentle sinusoidal wag.
- **4 Legs**: Quadruped pivots ($FL, FR, BL, BR$). Height 8 voxels ($0.4\text{m}$).

### 4.2 Goblin Model Topology
- **Root Group**: Position $(x, y, z)$.
- **Hunched Torso**: Hunched forward $15^\circ$ ($0.26\text{ rad}$). Forest green skin `#22c55e` with olive shadow `#15803d`. Brown ragged loincloth `#78350f`.
- **Head Group**: Pivot at $(0, 14 \cdot VX, 2 \cdot VX)$. Oversized pointed ears protruding laterally (+X/-X), sharp chin, ruby red eyes `#dc2626`.
- **Arms**: Left arm holds small round wooden buckler; right arm holds jagged bone dagger.
- **Legs**: Short, energetic legs ($6\text{ voxels}$ height).

### 4.3 Skeleton Warrior Model Topology
- **Root Group**: Position $(x, y, z)$.
- **Torso**: Ribcage with alternating bone struts (`#f1f5f9` / `#cbd5e1`), spinal column, and pelvis.
- **Head Group**: Hollow cranium with glowing cyan soul fire in eye sockets (`#38bdf8`, emissive).
- **Arms**:
  - Arm Left: Rusted iron round shield with wooden boss.
  - Arm Right: Notched iron broadsword (`0x94a3b8`).
- **Legs**: Slender white skeletal legs ($10\text{ voxels}$ length).

### 4.4 Stone Golem Model Topology
- **Root Group**: Position $(x, y, z)$. Scale factor: $1.8\times$.
- **Torso**: Heavy granite monolith block ($16 \times 16 \times 12\text{ voxels}$). Dark stone `#475569`, mossy vines `#166534`, and an exposed pulsing amethyst core `#a855f7`.
- **Head Group**: Flat stone faceplate set into torso shoulder crest. Glowing amethyst slit eyes.
- **Arms**: Massive blocky boulder arms ($8 \times 20 \times 8\text{ voxels}$) terminating in giant fists.
- **Legs**: Sturdy stone columns ($8 \times 12 \times 8\text{ voxels}$).

---

## 5. AI State Machine Implementation

```
                        ┌─────────────┐
                        │    IDLE     │◄─────────────────┐
                        └──────┬──────┘                  │
                         ▲     │ timer <= 0              │
              timer <= 0 │     ▼                         │
                        ┌┴────────────┐                  │
                        │   WANDER    │                  │
                        └──────┬──────┘                  │
                               │ dist <= aggroRadius     │ dist > 1.6 * aggro
                               ▼                         │
                        ┌─────────────┐                  │
                        │    CHASE    ├──────────────────┘
                        └──────┬──────┘
                               │ dist <= attackReach
                               ▼
                        ┌─────────────┐
        ┌──────────────►│   ATTACK    │
        │               └──────┬──────┘
        │                      │ attack finished
        │                      ▼
        │               ┌─────────────┐
        └───────────────┤    HURT     │ (upon receiving hit)
                        └──────┬──────┘
                               │ hp <= 0
                               ▼
                        ┌─────────────┐
                        │    DEAD     │ ──► Spawns 3D Loot + Awards XP
                        └─────────────┘
```

### 5.1 State Logic Breakdown
1. **`Idle`**:
   - Creature pauses, breathes, heads pan smoothly.
   - Transitions to `Wander` after $2.0\text{s} - 4.5\text{s}$.
   - Checks player distance: if $d \le \text{aggroRadius}$, switches instantly to `Chase`.
2. **`Wander`**:
   - Creature navigates towards random point within $8\text{m}$ of `spawnAnchor`.
   - Forward speed: `speedWander`.
   - Rotates towards heading: $\theta = \text{atan2}(targetX - x, targetZ - z)$.
   - Obstacle step-assist: checks `solid(nextX, y, nextZ)`. If blocked by 1 voxel ($0.5\text{m}$), steps up.
   - If destination reached or timer expires ($5.0\text{s}$), returns to `Idle`.
   - Checks player distance: if $d \le \text{aggroRadius}$, switches instantly to `Chase`.
3. **`Chase`**:
   - Focuses strictly on player position $(P.x, P.z)$.
   - Heading: $\theta = \text{atan2}(P.x - x, P.z - z)$. Smooth rotational lerp ($12 \cdot dt$).
   - Forward speed: `speedChase`.
   - Obstacle step-assist: climbs blocks up to $0.55\text{m}$.
   - Distance checks:
     - If $d \le \text{attackReach}$: transitions to `Attack`.
     - If $d > 1.6 \times \text{aggroRadius}$: creature gives up pursuit and returns to `Wander`.
   - **Goblin Special AI (Tactical Flee)**: If Goblin $\text{hp} < 0.20 \times \text{maxHp}$, inverts heading ($\theta + \pi$) and runs away for $3\text{s}$ before resuming attacks!
4. **`Attack`**:
   - Windup phase ($0.15\text{s} - 0.35\text{s}$): limb swings back, weapon readies.
   - Strike execution:
     - Tests if player is within strike cone ($d \le \text{reach} + 0.6\text{m}$).
     - **Dodge Roll Check**: If player is rolling (`isRolling && rollTimer > 0.04 && rollTimer < 0.52`), attack misses cleanly (Elden Ring i-frames)!
     - **Shield Block Check**: If player holds RMB with shield (`isPlayerBlocking() && getEquippedShield()`):
       - Damage reduced by shield block power ($65\% - 90\%$).
       - Player stamina reduced by $12\text{ st}$.
       - Shield audio: `playBlockSound()`.
       - Feedback toast: `🛡️ Útok vykryt štítem!`.
     - **Unblocked Hit**:
       - Applies armor reduction: `finalDmg = Math.max(1, Math.round(creature.damage * (1 - armorRed)))`.
       - Calls player hurt function: `hurt(finalDmg)`.
       - Triggers screen red flash: `#damageFlash`.
       - Applies player knockback: $P.vx \mathrel{+}= dirX \cdot 3.8, P.vz \mathrel{+}= dirZ \cdot 3.8, P.vy = \max(P.vy, 2.0)$.
       - Spawns floating damage indicator on player.
   - Recovery phase: enters cooldown timer (`attackCooldown`).
5. **`Hurt`**:
   - Interrupts `Idle` or `Wander` into aggressive pursuit of attacker.
   - Red emissive material flash applied to all creature meshes for $0.15\text{s}$.
   - Receives impulse: $\mathbf{v}_{\text{kb}} = \mathbf{dir} \times (\text{kbForce} \cdot (1 - \text{knockbackResist}))$.
   - **Skeleton Warrior Special AI (Shield Block)**: $30\%$ chance to raise shield if player attacks from front ($dot > 0.3$), reducing incoming damage by $70\%$ and playing shield clank sound!
   - If $\text{hp} \le 0$: transitions to `Dead`.
6. **`Dead`**:
   - Hitbox disabled immediately.
   - Plays collapse animation (falls $90^\circ$ onto side or collapses into voxel pile).
   - Spawns physical 3D loot pickups in world.
   - Grants player XP: `window.addPlayerXP(creature.loot.xp, creature.name)` (or increments `P.xp`).
   - After $1.2\text{s}$, disposes Three.js meshes/textures and removes from `EntityManager.creatures`.

---

## 6. Overhead Floating UI & Feedback Systems

### 6.1 Floating Overhead Health Bar Billboard
Each creature has an overhead billboard `THREE.Sprite`:
- Position: $(x, y + \text{height} + 0.35, z)$.
- Dynamic 2D canvas ($256 \times 64\text{ px}$):
  - Top text: `[Lvl L] Creature Name` (gold & white bold text with shadow).
  - Bottom bar: Translucent dark background (`rgba(15, 23, 42, 0.8)`), colored health fill (`#22c55e` if $>50\%$, `#f59e0b` if $25-50\%$, `#ef4444` if $<25\%$).
- **Performance Optimization**: The canvas texture is only re-rendered when the creature's HP changes, not every frame!
- Only visible within $35\text{m}$ of player.

### 6.2 Floating 3D Damage Numbers Billboard
When a creature or player takes damage:
- Method: `EntityManager.spawnDamageNumber(x, y, z, damage, isCrit, isHeal)`
- Creates a `THREE.Sprite` with canvas texture:
  - Normal hit: `-${damage}` in white `#ffffff` with black outline.
  - Critical hit: `💥 -${damage}!` in bold amber `#fbbf24`, scale $1.4\times$.
  - Player hit: `-${damage}` in bright red `#ef4444`.
- Animates upwards: $+1.5\text{m}$ along Y while fading opacity over $0.75\text{s}$.
- Auto-disposes geometry and canvas texture upon completion.

---

## 7. Physical 3D Loot Pickups & XP System

When a creature dies, loot items spawn as physical 3D pickups:
- Method: `EntityManager.spawnLootDrop(itemId, count, x, y, z)`
- Creates an interactive 3D pickup:
  - Miniature voxel representation (or colored glowing orb).
  - Bobs gently on Y axis ($y = \text{baseY} + \sin(t \cdot 3) \times 0.12$).
  - Rotates continuously around Y axis.
  - Soft glowing ground ring.
- **Magnet & Collection**:
  - Distance check in `update(dt)`: If $\| \mathbf{player} - \mathbf{loot} \| \le 2.2\text{m}$:
    - Magnetizes directly towards player.
    - Adds item to inventory:
      ```javascript
      const it = INV.find(item => item.id === itemId);
      if (it) it.count = (it.count || 0) + count;
      ```
    - Plays pickup audio chime.
    - Displays on-screen toast: `📦 Sebráno: +${count}x ${it ? it.name : itemId}`.
    - Disposes 3D object from scene.
- **XP Reward**:
  - Calls `window.addPlayerXP(creature.loot.xp, creature.name)`.
  - Spawns floating golden XP text `+${creature.loot.xp} XP` above creature corpse.

---

## 8. Hitbox Expansion in `player.js:checkPvPHit()`

### 8.1 Critical Analysis of Current `checkPvPHit()`
In `js/player.js` (lines 92–151):
1. **Early Return Flaw**:
   ```javascript
   if (!window.networkManager || !window.networkManager.remotePlayers || window.networkManager.remotePlayers.size === 0) {
     return; // <--- BREAKS ALL SINGLEPLAYER COMBAT!
   }
   ```
2. **PvE Targets Ignored**: The loop only iterates `window.networkManager.remotePlayers`.
3. **Cleave Weapons Ignored**: Heavy weapons (`greatsword`, `battleaxe`) are capped at a single target rather than cleaving through multiple foes in an arc.

### 8.2 Redesigned `checkPvPHit()` Blueprint
The updated function handles both PvE creatures and PvP players seamlessly:

```javascript
function checkPvPHit(whichHand = 'dominant') {
  const reach = (typeof getPlayerAttackReach === 'function') ? getPlayerAttackReach(whichHand) : 2.4;
  const atkInfo = (typeof getPlayerAttackDamage === 'function') ? getPlayerAttackDamage(whichHand) : { damage: 12, isCrit: false, weaponName: 'Zbraň' };
  
  const weaponId = (whichHand === 'secondary') 
    ? (typeof getEquippedOffHandId === 'function' ? getEquippedOffHandId() : null)
    : ((typeof getEquippedMainHandId === 'function' ? getEquippedMainHandId() : null) || heldId);
  const isCleave = (weaponId === 'greatsword' || weaponId === 'battleaxe');
  const maxTargets = isCleave ? 3 : 1;

  // Player forward aim vector
  const cp = Math.cos(pitch);
  const fwdX = -Math.sin(yaw) * cp;
  const fwdY = -Math.sin(pitch);
  const fwdZ = -Math.cos(yaw) * cp;

  const eyeX = P.x;
  const eyeY = (P.renderY ?? P.y) + 1.45;
  const eyeZ = P.z;

  const candidateTargets = [];

  // 1. Check PvE Creatures
  if (window.EntityManager && Array.isArray(window.EntityManager.creatures)) {
    for (const creature of window.EntityManager.creatures) {
      if (!creature || creature.state === 'Dead' || creature.hp <= 0) continue;
      const targetX = creature.x;
      const targetY = creature.y + (creature.height || 1.0) * 0.5;
      const targetZ = creature.z;

      const dx = targetX - eyeX;
      const dy = targetY - eyeY;
      const dz = targetZ - eyeZ;
      const dist = Math.hypot(dx, dy, dz);
      const hitboxR = creature.hitboxRadius || 0.75;

      if (dist <= reach + hitboxR) {
        const dot = (dx * fwdX + dy * fwdY + dz * fwdZ) / (dist || 1);
        const minDot = dist < 1.2 ? 0.15 : (isCleave ? 0.25 : 0.38);
        if (dot > minDot) {
          const score = dot * 10 - dist;
          candidateTargets.push({ type: 'creature', target: creature, dist, score, dx, dy, dz });
        }
      }
    }
  }

  // 2. Check Remote Human Players (Multiplayer)
  if (window.networkManager && window.networkManager.remotePlayers && window.networkManager.remotePlayers.size > 0) {
    for (const [id, p] of window.networkManager.remotePlayers) {
      if (!p.group) continue;
      const targetX = p.group.position.x;
      const targetY = p.group.position.y + 0.9;
      const targetZ = p.group.position.z;

      const dx = targetX - eyeX;
      const dy = targetY - eyeY;
      const dz = targetZ - eyeZ;
      const dist = Math.hypot(dx, dy, dz);

      if (dist <= reach + 0.75) {
        const dot = (dx * fwdX + dy * fwdY + dz * fwdZ) / (dist || 1);
        const minDot = dist < 1.2 ? 0.15 : (isCleave ? 0.25 : 0.38);
        if (dot > minDot) {
          const score = dot * 10 - dist;
          candidateTargets.push({ type: 'player', id, p, dist, score, dx, dy, dz });
        }
      }
    }
  }

  if (candidateTargets.length === 0) return;

  // Sort candidates by targeting score descending
  candidateTargets.sort((a, b) => b.score - a.score);
  const targetsToHit = candidateTargets.slice(0, maxTargets);

  for (const cand of targetsToHit) {
    const kLen = Math.hypot(cand.dx, cand.dz) || 1;
    const kbMult = (atkInfo.isCrit ? 1.5 : 1.0) * (weaponId === 'mace' || weaponId === 'hammer' ? 1.35 : 1.0);
    const knockback = {
      x: (cand.dx / kLen) * kbMult,
      z: (cand.dz / kLen) * kbMult
    };

    if (cand.type === 'creature') {
      cand.target.takeDamage(atkInfo.damage, knockback, atkInfo.isCrit, 'player');
      if (typeof toast === 'function') {
        const critText = atkInfo.isCrit ? ' 💥 KRITICKÝ ZÁSAH!' : '';
        toast(`Zásah do ${cand.target.name}: -${atkInfo.damage} HP${critText}`);
      }
    } else if (cand.type === 'player') {
      window.networkManager.sendPlayerHit(cand.id, atkInfo.damage, knockback, atkInfo.isCrit, atkInfo.weaponName);
      if (typeof toast === 'function') {
        const critText = atkInfo.isCrit ? ' 💥 KRITICKÝ ZÁSAH!' : '';
        toast(`Zásah do hráče ${cand.p.nickname || 'Přítel'}: -${atkInfo.damage} HP${critText}`);
      }
    }
  }
}
```

---

## 9. Integration Blueprint & Exact File Changes

### 9.1 File 1: New Script `js/entities.js`
- Contains `EntityManager` object with creature models, state machine loop, floating health bars, floating damage numbers, and 3D loot drops.
- Implements contract functions `EntityManager.spawnCreature(type, x, y, z, level)`, `EntityManager.update(dt)`, and `EntityManager.getNearbyCreatures(x, z, radius)`.

### 9.2 File 2: `play/index.html` Script Tag Insertion
Insert `<script src="../js/entities.js?v=1"></script>` right after `js/items.js` and `js/voxelBuilder.js`:
```html
<script src="../js/voxelBuilder.js?v=3"></script>
<script src="../js/items.js?v=7"></script>
<script src="../js/entities.js?v=1"></script>
<script src="../js/character.js?v=8"></script>
```

### 9.3 File 3: `js/game.js` Loop Hook
Inside `loop(now)` right before `renderer.render(scene, cam)`:
```javascript
// Aktualizace PvE entit & nestvůr (Cube World AI & Combat)
if (window.EntityManager && typeof window.EntityManager.update === 'function') {
  window.EntityManager.update(dt);
}
```

### 9.4 File 4: `js/player.js` Combat Hit Detection Expansion
Replace lines 92–151 in `js/player.js` with the unified multi-target PvE/PvP logic detailed in Section 8.2.

### 9.5 File 5: `js/minimap.js` Radar Integration (Optional Enhancement)
In `updateMinimap(dt, now)`:
Query `EntityManager.getNearbyCreatures(P.x, P.z, 50)` and render small red voxel dots on the 3D minimap diorama for active hostile creatures.

---

## 10. Verification Method & Test Coverage

1. **Static Syntax Check**:
   - Run `node --check js/entities.js`
   - Run `node --check js/player.js`
   - Zero syntax errors.
2. **Unit & Contract Verification**:
   - `node test_e2e_runner.js`
   - Verify `F6: PvE Creatures, AI & Combat` tests pass (F6.1 - F6.5).
   - Verify Scenario 2 in Tier 4 (`T4.2: Combat Encounter & Alchemy Crafting Lifecycle`) passes.
3. **Gameplay Verification**:
   - Spawn a Wolf, Goblin, Skeleton, and Golem.
   - Attack with a sword, greatsword, and spear:
     - Verify reach differences: Spear strikes from $4.8\text{m}$, Greatsword cleaves multiple creatures.
     - Verify floating damage numbers appear with correct damage and crit highlights.
     - Verify creature flashes red and takes knockback.
     - Verify overhead health bar smoothly decreases.
     - Slay creature: verify collapse animation, XP grant, and physical loot drop pickup.
