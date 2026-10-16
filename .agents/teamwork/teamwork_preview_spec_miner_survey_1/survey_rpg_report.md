# Comprehensive Specification & Code Analysis Report
## Cube World Exploration, Encounters, RPG Progression & Crafting (R2, R3)

**Author:** `teamwork_preview_spec_miner_survey_1`  
**Date:** 2026-10-16  
**Project:** Voxelový svět / Cube World Action-RPG Transformation  
**Target File:** `survey_rpg_report.md`

---

## 1. Executive Summary & Codebase Audit

An exhaustive audit of the existing codebase (`js/`, `play/index.html`, `index.html`, `ServerSource/server.js`) was conducted to evaluate the current architecture, existing RPG/combat foundations, and requirements for transforming the game into a polished **Cube World-style 3D Voxel Action-RPG & Exploration game**.

### Key Findings
1. **Existing Rich Asset Base**:
   - `items.js` contains 25+ item definitions, 13 custom voxel weapon models (`W3`), canvas-generated 16x16 pixel-art icons, and 5 rarity tiers (`common`, `uncommon`, `rare`, `epic`, `legendary`).
   - `character.js` and `voxelBuilder.js` provide a hierarchical 3D voxel character rig with procedural skin, armor pieces, capes, and customizable palettes.
   - `inventory.js` implements a 5-section RPG inventory UI with dual-hand slotting (dominant vs offhand), ring slots, armor slots, and basic item consumption.
   - `minimap.js` implements a real-time 3D voxel diorama rendered via Three.js with Fog of War persistence (`exploredChunks` in `localStorage`).
2. **Current Gaps & Deficiencies**:
   - **No Creature/PvE Enemies**: `player.js:checkPvPHit()` only tests against `window.networkManager.remotePlayers`. No interactive monsters, animals, or PvE targets exist in the world.
   - **No Projectile or Spell Mechanics**: Bows and magic staffs (`staff_fire`, `staff_frost`) merely play attack sound effects on click; they do not instantiate physical 3D projectiles or deal damage at a distance.
   - **No World Points of Interest (POIs)**: World generation in `world.js` generates pure biomes (trees, cacti, terrain). No ruins, ancient shrines, monster camps, landmarks, or loot chests are generated or rendered on the 3D minimap.
   - **No Leveling or XP Progression**: The game lacks XP gain, level thresholds, stat upgrades upon leveling, and an XP bar on the HUD.
   - **No Equipment Upgrading**: While 13 basic crafting recipes exist in `inventory.js`, there is no mechanism to upgrade existing weapons, shields, staffs, bows, or armor to higher tiers (`+1` to `+5`) using collected ores, gems, or gold.
   - **Missing Contract Functions**: Acceptance criteria require `getPlayerBonusDamage()`, `getPlayerBonusHP()`, and `getPlayerBonusDefense()`, none of which are currently exposed on `window`.
   - **Persistence Gaps**: `network.js:saveSingleplayerWorld()` and `GameStorage` only persist basic position, HP, and hotbar slots. They fail to persist `EQUIPPED_SLOTS`, full inventory item counts, upgrade tiers, player level, XP, and discovered POIs.
   - **Syntax Blocker**: `js/player.js` line 559 contains an unexpected extra closing brace `}` that causes `SyntaxError` on script evaluation.

---

## 2. World Generation & Discoverable Points of Interest (POIs) (R2)

### 2.1 Spatial Macro-Grid & Deterministic Generation Algorithm
To ensure identical structure placement across singleplayer sessions and multiplayer client/host instances without bloating network state, POI locations are derived deterministically from the world seed (`SEED`) using the existing fast PRNG hash function `h2(x, z)`.

- **Macro-Cell Partitioning**:
  The infinite world coordinate space is divided into a regular grid of Macro-Cells:
  $$L_{\text{cell}} = 160\text{ blocks} = 80\text{ meters (since } S = 0.5\text{m)}$$
  Each macro-cell $(cx, cz) \in \mathbb{Z}^2$ spans block coordinates $[cx \cdot L, (cx+1) \cdot L - 1]$.

- **Deterministic Point Derivation**:
  For cell $(cx, cz)$:
  $$\text{cellSeed} = \text{h2}(cx \cdot 73856093, cz \cdot 19349663) \oplus \text{SEED}$$
  $$\text{relX} = 24 + \lfloor \text{h2}(\text{cellSeed}, 101) \cdot (L - 48) \rfloor$$
  $$\text{relZ} = 24 + \lfloor \text{h2}(\text{cellSeed}, 202) \cdot (L - 48) \rfloor$$
  $$\text{worldBX} = cx \cdot L + \text{relX}, \quad \text{worldBZ} = cz \cdot L + \text{relZ}$$
  $$\text{worldBY} = \text{height}(\text{worldBX}, \text{worldBZ})$$

- **Terrain Feasibility & Safety Checks**:
  1. *Submersion rejection*: If $\text{worldBY} < \text{SEA} + 3$ ($\text{SEA} = 44$), the point is aquatic; convert to a Sunken Shipwreck or shift to the nearest shoreline.
  2. *Slope test*: Query heights at $(\text{worldBX} \pm 3, \text{worldBZ} \pm 3)$. If $|\Delta h| > 4$, the site is too steep for building placement; flatten local terrain foundation or reject.

### 2.2 POI Taxonomy, Visual Design & Interaction Specs

| POI Type | ID Prefix | Biome Affinity | Visual 3D Representation | Spawns / Guardians | Interaction Mechanic | Rewards |
|---|---|---|---|---|---|---|
| **Ancient Shrine (Prastará svatyně)** | `poi_shrine_` | All biomes (Plains, Peaks, Forest) | 4 carved stone columns supporting an altar; hovering, spinning runic crystal emitting point light | None (Sacred peace zone) | Player approaches within 3m and presses `[E]` / click. Crystal flares with radiance. | +250 XP; full HP/Stamina restore; 5-min "Blessing of the Ancients" (+15% Atk & Spd) |
| **Ruins (Tajemné zříceniny)** | `poi_ruins_` | Forest, Snow, Desert | Crumbling stone arches, weathered flagstones, fallen pillars, central pedestal | 2-3 Skeleton Warriors (`creature_skeleton_warrior`) | Defeat guardians to unlock the Ancient Relic Chest at the center. | +180 Exploration XP; Relic Chest with Gold, Ruby/Sapphire gems, upgrade materials |
| **Monster Camp (Tábor nestvůr)** | `poi_camp_` | Plains, Jungle, Desert | Central campfire with smoke/fire particles, 2 wooden tents, barricade spikes | 3-4 Goblin Raiders + 1 Camp Chieftain (Mini-boss) | Destroy camp enemies to open the Monster Supply Cache. | +200 Combat/Exploration XP; Iron/Gold ores, Potions, Leather |
| **Treasure Chest (Pokladnice)** | `poi_chest_` | Cliff edges, caves, grove clearings | Ornate iron-reinforced oak chest with latch atop stone slab | Optional solitary guardian (e.g. Dire Wolf) | Player presses `[E]` or clicks. Lid swings open 75°. 3D loot icons pop up. | +80 XP; Gold, consumables, weapon upgrade stones |
| **Landmark Vista (Strážní maják)** | `poi_vista_` | High mountains ($h > 75$) | Tall stone watchtower with burning beacon basket | None | Player climbs or walks to peak beacon. Discovers landmark banner. | +300 Explorer XP; instantly clears Fog of War in a 12-chunk radius |

### 2.3 3D World Rendering & Lifecycle
- Rather than destructively re-meshing static chunk voxel geometry, POIs are instantiated as Three.js `Group` objects using `createSingleVoxMesh()` from `voxelBuilder.js`.
- Foundation blocks are anchored at $y = \text{worldBY} \cdot S$.
- Interactive components (chest lids, floating shrine crystals, flame particles) have dynamic update hooks inside `game.js:loop()`.
- **Frustum & Distance Culling**: POI groups within `(RD + 1) * CS * S` meters are attached to `scene`; groups beyond this boundary are removed and their geometries cached.

### 2.4 3D Minimap POI Integration & Fog of War
- In `minimap.js`, the minimap terrain mesh is augmented with a dynamic POI marker overlay.
- When player moves within $R_{\text{disc}} = 36\text{m}$ of a POI:
  1. POI ID is added to `exploredPOIs` (`Set`), saved to `localStorage`.
  2. Screen toast/banner triggers: `🗺️ Objeveno nové místo: [POI Name] (+XP)`.
  3. Web Audio chime plays.
- In `buildMinimapTerrainMesh()`:
  - For all discovered POIs in the visible bounds, miniature 3D markers are placed on the diorama:
    - *Shrine*: Floating glowing diamond (`0x38bdf8`) with rotating ring.
    - *Ruins*: Grey miniature arch (`0x94a3b8`).
    - *Camp*: Orange fire tetrahedron (`0xf97316`).
    - *Chest*: Golden cube (`0xf59e0b`).
    - *Landmark*: Red pennant flag (`0xef4444`).

---

## 3. Combat & Creatures/Enemies System (R2, R3)

### 3.1 Creature Entity Architecture & Stat Matrix

Each creature entity is managed in a centralized `EntityManager` with state, physics, bounding sphere, and AI loop:

| Entity ID | Display Name | Base HP | Melee Dmg | Speed | Attack Reach | Aggro Radius | AI Archetype | Loot Drop Table | XP |
|---|---|---|---|---|---|---|---|---|---|
| `creature_wolf` | Lesní vlk | 65 | 14 | 7.0 m/s | 1.8 m | 16 m | Leap & Bite; circle strafe | `leather` (2-4), `meat` (1-2) | 35 |
| `creature_goblin` | Goblin záškodník | 90 | 18 | 5.4 m/s | 2.1 m | 15 m | Sprint & Strike; retreats at 20% HP | `ore_iron` (1-2), `ore_gold` (1), `apple` (1) | 50 |
| `creature_skeleton_warrior` | Kostlivý strážce | 130 | 25 | 4.6 m/s | 2.5 m | 14 m | Sword & Shield; blocks player attacks | `stone` (3-5), `ore_iron` (2-3) | 75 |
| `creature_skeleton_archer` | Kostlivý střelec | 80 | 22 (Arrow) | 4.8 m/s | 20.0 m | 22 m | Kiting ranged; maintains 10m distance | `wood` (3-6), `potion_hp` (1) | 65 |
| `creature_stone_golem` | Kamenný strážce | 400 | 48 (Slam) | 3.0 m/s | 3.4 m | 18 m | Heavy Tank; ground slam AOE shockwave | `gem_ruby` (1-2), `gem_sapphire` (1), `ore_gold` (3) | 250 |

### 3.2 Creature AI State Machine
Creatures execute a tick loop at 20 Hz (`updateCreatures(dt)`):
1. **IDLE**:
   - Grazes/wanders within 6m of spawn anchor. Plays breathing and head-turn animations.
   - Transition to **AGGRO** if player distance $d \le R_{\text{aggro}}$.
2. **AGGRO / CHASE**:
   - Faces player: $\theta = \text{atan2}(P.x - x, P.z - z)$.
   - Moves along vector with voxel step-assist (similar to player physics, climbing 0.55m obstacles).
   - If distance $d \le \text{reach}$, transitions to **ATTACK**.
   - If player flees beyond $1.6 \times R_{\text{aggro}}$, loses interest and returns to spawn anchor.
3. **ATTACK**:
   - Starts windup animation ($0.15\text{s}$).
   - Executes hit check against player. If player is not rolling (i-frame) and not blocking, inflicts damage via `hurt(dmg)`.
   - If player is blocking with a shield: damage reduced by shield block power ($65\% - 90\%$), player consumes 10 stamina, `playBlockSound()` plays.
   - Attack cooldown timer: $1.2\text{s} - 1.8\text{s}$ before next swing.
4. **HURT**:
   - Flashes red emissive material for $0.14\text{s}$.
   - Pushed back along impact direction vector: $\mathbf{v}_{\text{kb}} = \mathbf{dir} \times \text{knockbackForce}$.
   - Displays floating damage indicator.
5. **DEATH**:
   - Plays collapse/shatter animation.
   - Spawns physical loot drop pickups that fly outwards and land on the ground.
   - Awards XP directly to player: `grantXP(creature.xp)`.
   - Removes entity from scene after $0.8\text{s}$.

### 3.3 Weapon Mechanics & Hitbox Specification

All weapon types from `items.js` are fully integrated with specific attack profiles, ranges, slashes, and projectiles:

```
+---------------------------------------------------------------------------------------------------+
| WEAPON COMBAT SPECIFICATION MATRIX                                                                |
+---------------+---------+--------+-------+-------+------------+-----------+-----------------------+
| Item ID       | Type    | Damage | Reach | Speed | Crit Chance| Animation | Special Mechanic      |
+---------------+---------+--------+-------+-------+------------+-----------+-----------------------+
| sword         | Melee   | 26 HP  | 3.2 m | 1.1x  | 12%        | Slash     | Balanced 2-hit combo  |
| spear         | Melee   | 34 HP  | 4.8 m | 0.95x | 15%        | Thrust    | Armor pierce +15%     |
| dagger        | Melee   | 18 HP  | 2.2 m | 1.6x  | 30%        | Rapid Jab | High crit burst       |
| battleaxe     | Melee   | 42 HP  | 3.4 m | 0.8x  | 18%        | Heavy Arc | Cleave 2 targets      |
| mace          | Melee   | 30 HP  | 3.0 m | 1.0x  | 10%        | Smash     | +25% Knockback        |
| greatsword    | Melee   | 54 HP  | 3.9 m | 0.72x | 20%        | Wide Sweep| 70° AOE Cleave        |
| hammer        | Melee   | 50 HP  | 3.2 m | 0.7x  | 20%        | Slam      | Stun / stagger 0.5s   |
| katana        | Melee   | 46 HP  | 3.6 m | 1.35x | 35%        | Swift Cut | Fast recovery         |
| bow           | Ranged  | 36 HP  | 45 m  | 1.0x  | 22%        | Draw/Shoot| Physical Arrow Projectile |
| staff_fire    | Magic   | 62 HP  | 35 m  | 0.85x | 25%        | Cast      | Fireball + 3m Explosion|
| staff_frost   | Magic   | 58 HP  | 35 m  | 0.9x  | 22%        | Cast      | Frost Shard + -40% Slow|
| shield_wood   | Shield  | -      | -     | -     | -          | Block     | 65% Damage Absorption |
| shield_iron   | Shield  | -      | -     | -     | -          | Block     | 90% Damage Absorption |
+---------------+---------+--------+-------+-------+------------+-----------+-----------------------+
```

### 3.4 Projectile Physics & Magic System
- **Arrow Entity (`projectile_arrow`)**:
  - Velocity: $42\text{ m/s}$ along player aim ray ($\mathbf{v} = (\sin(\text{yaw})\cos(\text{pitch}), \sin(-\text{pitch}), \cos(\text{yaw})\cos(\text{pitch})) \cdot 42$).
  - Gravity: $-9.8\text{ m/s}^2$ downward trajectory.
  - Voxel Raycast & Entity Hitbox Collision check each frame. On contact with terrain, sticks into voxel for $5\text{s}$ then despawns; on contact with creature, deals weapon damage and despawns.
- **Fireball Entity (`projectile_fireball`)**:
  - Velocity: $30\text{ m/s}$ linear (zero gravity).
  - Emits dynamic point light (`#ff7a2a`) and flame particle trail.
  - On impact: Triggers radial splash damage dealing $62\text{ HP}$ to all entities within $3.2\text{m}$.
- **Frost Shard Entity (`projectile_frost`)**:
  - Velocity: $34\text{ m/s}$ linear.
  - Cyan crystalline mesh with glitter particle trail.
  - On impact: Deals $58\text{ HP}$ and applies a `FrostSlow` debuff (-40% movement speed for $4.0\text{s}$) indicated by blue frost particles on the target.

### 3.5 Visual Combat Effects & Hit Feedback
- **Melee Slash Arcs**: Semi-transparent curved ribbon mesh (`THREE.BufferGeometry`) spawned along the weapon sweep path during frames $0.15 \times \text{attackDuration}$ to $0.65 \times \text{attackDuration}$, fading out smoothly over $0.12\text{s}$.
- **Floating Damage Numbers (Billboard Text)**:
  - Spawns at impact coordinate $(x, y + 1.2, z)$.
  - Rises $+1.0\text{m}$ upward while fading opacity from 1.0 to 0.0 over $0.7\text{s}$.
  - Color coding: Normal hit = `#f8fafc` (white), Critical hit = `💥 #fbbf24` (gold, bold, scale 1.4x), Player damage taken = `#ef4444` (red).
- **Target Damage Flash**: Target creature flashes red (`emissive: 0xaa2222`) for $0.12\text{s}$ upon taking damage.

---

## 4. RPG Progression & Leveling System (R3)

### 4.1 XP Curve & Level Progression Mathematics
Leveling follows a smooth polynomial curve modeled on classic action-RPGs:
$$\text{XP}_{\text{req}}(L) = \lfloor 100 \times L^{1.5} \rfloor$$
Where $\text{XP}_{\text{req}}(L)$ is the incremental XP required to advance from level $L$ to level $L+1$.

```
Level  1 ->  2:   100 XP  (Cumulative:     0 XP)
Level  2 ->  3:   282 XP  (Cumulative:   100 XP)
Level  3 ->  4:   519 XP  (Cumulative:   382 XP)
Level  4 ->  5:   800 XP  (Cumulative:   901 XP)
Level  5 ->  6: 1,118 XP  (Cumulative: 1,701 XP)
Level  6 ->  7: 1,469 XP  (Cumulative: 2,819 XP)
Level  7 ->  8: 1,852 XP  (Cumulative: 4,288 XP)
Level  8 ->  9: 2,262 XP  (Cumulative: 6,140 XP)
Level  9 -> 10: 2,700 XP  (Cumulative: 8,402 XP)
Level 10 -> 11: 3,162 XP  (Cumulative: 11,102 XP)
```

### 4.2 XP Gain Sources
1. **World Exploration**:
   - First entry into an unexplored chunk ($16 \times 16$ blocks): $+15\text{ XP}$.
   - Discovering a Point of Interest (Shrine, Ruins, Camp, Landmark): $+100\text{ to }+300\text{ XP}$.
2. **Combat Encounters**:
   - Defeating wild creatures (Wolf, Goblin): $+35\text{ to }+50\text{ XP}$.
   - Defeating elite/dungeon guardians (Skeleton Warrior/Archer): $+65\text{ to }+75\text{ XP}$.
   - Defeating boss/golem (Stone Golem, Chieftain): $+200\text{ to }+300\text{ XP}$.
3. **Loot & Discovery**:
   - Opening treasure chests: $+75\text{ to }+120\text{ XP}$.
4. **Crafting & Upgrading**:
   - Crafting potions or equipment: $+20\text{ to }+40\text{ XP}$.
   - Upgrading equipment to higher tier: $+50\text{ to }+100\text{ XP}$.

### 4.3 Stat Scaling per Level
Upon leveling up, the player's core stats permanently increase:
- **Max HP**: $+10\text{ HP}$ per level:
  $$\text{BaseMaxHP}(L) = 100 + (L - 1) \cdot 10$$
  $$\text{TotalMaxHP} = \text{BaseMaxHP}(L) + \text{getPlayerBonusHP()}$$
- **Max Stamina**: $+3\text{ Stamina}$ per level:
  $$\text{BaseMaxStamina}(L) = 100 + (L - 1) \cdot 3$$
- **Attack Power Bonus**: $+2\text{ Attack Power}$ per level:
  $$\text{BaseAtkPower}(L) = 10 + (L - 1) \cdot 2$$
- **Base Critical Strike Chance**: $+0.5\%$ ($+0.005$) per level:
  $$\text{BaseCrit}(L) = 0.05 + (L - 1) \cdot 0.005$$
- **Base Movement Speed**: $+1\%$ ($+0.01$) per level:
  $$\text{BaseSpeedBonus}(L) = (L - 1) \cdot 0.01$$

### 4.4 HUD Level & XP Bar
- HUD integration in `#bars` (`play/index.html`):
  - Add an interactive Level Badge: `<div class="b lvl"><span id="hudLevelBadge">LVL 1</span></div>`.
  - Add an XP progress bar: `<div class="b xp" title="Zkušenosti (XP)"><div class="b-track"><i id="xpBarFill"></i><span id="xpBarText">0 / 100 XP</span></div></div>`.
  - Update `ui()` in `config.js` to compute width percentage:
    $$\text{fillPct} = \frac{\text{currentXP}}{\text{reqXP}} \times 100\%$$
- **Level-Up Celebration Sequence**:
  1. Full HP, Stamina, and Oxygen instantly restored to 100%.
  2. Golden volumetric particle fountain burst centered on the player model.
  3. Screen announcement banner: `🌟 POSTOUPIL JSI NA ÚROVEŇ [L]!`.
  4. Audio fanfare: Web Audio API synthesizes a 4-note ascending major arpeggio ($C_5 \to E_5 \to G_5 \to C_6$).

### 4.5 Persistence via `GameStorage` & `localStorage`
- The `playerState` object persisted by `network.js:saveSingleplayerWorld()` and stored in `GameStorage.updateWorldData()` must be extended with:
  ```json
  {
    "level": 3,
    "xp": 240,
    "maxHp": 120,
    "maxStamina": 106,
    "equippedSlots": {
      "cloth_head": null,
      "cloth_chest": "tunic_linen",
      "hand_r": "sword",
      "hand_l": "shield_wood"
    },
    "inventory": [
      { "id": "sword", "count": 1, "upgradeLevel": 2 },
      { "id": "ore_iron", "count": 12 },
      { "id": "potion_hp", "count": 4 }
    ],
    "discoveredPOIs": ["poi_12_4", "poi_14_8"]
  }
  ```
- On session load, `initSingleplayer()` deserializes these properties, restoring stats, level, inventory counts, upgrade tiers, and discovered POIs without data loss.

---

## 5. Crafting & Equipment Upgrading System (R3)

### 5.1 Consumables & Alchemy Crafting Specification

Expanding the alchemy workbench in `inventory.js` to provide full combat utility:

| Recipe ID | Item Result | Count | Category | Ingredients | Consumable Effect |
|---|---|---|---|---|---|
| `craft_potion_hp` | `potion_hp` | 1 | `alchemy` | 1x `apple` | ❤️ Restores $+40\text{ HP}$ immediately |
| `craft_potion_hp_great` | `potion_hp_great` | 1 | `alchemy` | 2x `apple`, 1x `gem_ruby` | 💖 Restores $+100\text{ HP}$ immediately |
| `craft_potion_stamina` | `potion_stamina` | 1 | `alchemy` | 1x `apple`, 1x `leather` | ⚡ Instantly restores 100% Stamina; +50% regen speed for $30\text{s}$ |
| `craft_elixir_strength` | `elixir_strength` | 1 | `alchemy` | 1x `ore_iron`, 1x `gem_ruby` | ⚔️ Válečný elixír: $+25\%$ Attack Damage for $60\text{s}$ |
| `craft_elixir_swiftness` | `elixir_swiftness` | 1 | `alchemy` | 1x `leather`, 1x `gem_sapphire` | 🏃 Lektvar hbitosti: $+30\%$ Movement Speed for $60\text{s}$ |
| `craft_elixir_stoneskin` | `elixir_stoneskin` | 1 | `alchemy` | 2x `stone`, 1x `ore_iron` | 🛡️ Kamenná kůže: $+20\%$ Damage Absorption for $60\text{s}$ |

### 5.2 Equipment Upgrading (Kovárna) Specification

Players can upgrade any weapon, shield, or armor item from tier `+0` up to `+5` (Masterwork) at the forge:

```
+---------------------------------------------------------------------------------------------------------+
| EQUIPMENT UPGRADE PROGRESSION TABLE (+0 -> +5)                                                          |
+------+-----------------------+---------------------+-------------------+-------------------+------------+
| Tier | Required Ingredients  | Weapon Stat Boost   | Armor Stat Boost  | Shield Stat Boost | Rarity     |
+------+-----------------------+---------------------+-------------------+-------------------+------------+
| +1   | 2x Iron, 1x Leather   | +12% Base Damage    | +4% Defense, +8 HP| +5% Block Power   | Same       |
| +2   | 3x Iron, 1x Gold      | +25% Base Damage    | +8% Defense, +16HP| +10% Block Power  | Uncommon   |
| +3   | 5x Iron, 2x Gold, 1x Gem | +40% Base Damage | +14% Def, +25 HP  | +15% Block Power  | Rare       |
| +4   | 8x Iron, 4x Gold, 2x Gem | +60% Base Damage | +20% Def, +40 HP  | +20% Block Power  | Epic       |
| +5   | 12x Iron, 6x Gold, 3x Gem| +85% Base Damage | +28% Def, +60 HP  | +25% Block Power  | Legendary  |
+------+-----------------------+---------------------+-------------------+-------------------+------------+
```

### 5.3 Stat Calculation & Contract Integration

The required global contract functions must be exposed on `window`:

1. `window.getPlayerBonusDamage()`:
   $$\text{BonusDamage} = \sum_{\text{equipped}} \left( \text{item.damage} \times (\text{item.upgradeLevel} \times 0.15) \right) + \text{ringBonusDamage} + \text{buffBonusDamage}$$
2. `window.getPlayerBonusHP()`:
   $$\text{BonusHP} = \sum_{\text{equipped}} \left( (\text{item.bonusHp} || 0) + (\text{item.upgradeLevel} \times 8) \right) + \text{ringBonusHP}$$
3. `window.getPlayerBonusDefense()`:
   $$\text{BonusDefense} = \sum_{\text{equipped}} \left( (\text{item.defense} || 0) \times (1 + \text{item.upgradeLevel} \times 0.15) \right) + \text{shieldDefense} + \text{buffDefense}$$
4. `window.getPlayerAttackDamage(whichHand)`:
   $$\text{Dmg} = \left( \text{baseWeaponDmg} + \text{getPlayerBonusDamage()} + (\text{level}-1)\times 2 \right) \times (1 + \text{upgradeMult}) \times (1 \pm 0.1)$$
   Critical hit multipliers ($1.5\times$) apply conditionally.

### 5.4 Tooltip & UI Formatting
- Upgraded items display the upgrade tier suffix: `Ocelový meč +3`.
- Rarity badge dynamically updates to reflect the upgraded tier (e.g. `+3` becomes Rare / blue border; `+5` becomes Legendary / amber border).
- Tooltips format enhanced stats with a green boost indicator:
  - `⚔️ Poškození: 36 HP (+10 z vylepšení +3)`
  - `🛡️ Masivní obrana těla: +39% (+11% z vylepšení +3)`

---

## 6. Features Discovered & Specification Catalog

```
## Features Discovered
| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Exploration | Deterministic POI Generator | Spawns Shrines, Ruins, Camps, Chests, and Landmarks across world macro-cells | `SEED`, `cx_poi`, `cz_poi` | POI metadata object `{ id, type, x, y, z, biome, state }` | Rejects deep water or sheer cliff terrain | Code audit of `world.js` & `h2()` PRNG |
| 2 | Exploration | 3D Minimap Marker Layer | Renders mini 3D icons for discovered POIs on the 3D diorama | `exploredPOIs`, camera bounds | 3D meshes in `mmScene` | Suppresses undiscovered POIs hidden by Fog of War | Code audit of `minimap.js` |
| 3 | Exploration | Discovery Event & Fanfare | Triggers UI banner, audio chime, and XP reward when player nears a POI | Player $(x, y, z)$, POI radius (36m) | Screen toast, Web Audio chime, XP addition | Ignores already discovered POI IDs | `ORIGINAL_REQUEST.md` R2 |
| 4 | Combat | PvE Creature Entities | Spawns interactive Wolves, Goblins, Skeletons, and Golems | Chunk coordinate, biome, difficulty tier | Animated 3D mesh, AI state, hitbox | Despawns if player moves beyond 120m | `ORIGINAL_REQUEST.md` R2, R3 |
| 5 | Combat | Comprehensive Hit Detection | Melee cone/sweep raycast against both creatures and remote players | `whichHand`, reach, angle, eye vector | Hit event, damage floater, knockback | Returns empty if no target in forward cone | `player.js:checkPvPHit` |
| 6 | Combat | Physical Arrow Projectile | Bow shoots arrows affected by velocity and gravity | Mouse aim vector, bow equipped | 3D arrow entity, terrain/entity collision | Sticks to voxel terrain on miss; despawns | `items.js:bow` & R3 |
| 7 | Combat | Fireball & Frost Magic | Staffs shoot explosive Fireball or slowing Frost Crystal | Aim vector, magic staff equipped | 3D glowing spell mesh, AOE splash, slow debuff | Explodes on contact; zero gravity | `items.js:staff_fire/frost` |
| 8 | Combat | Shield Active Blocking | RMB raises shield to absorb 65%-90% damage and negate knockback | RMB held with shield in offhand | Damage absorption, stamina drain, clank sound | Exhausts if stamina reaches 0 | `player.js:isPlayerBlocking` |
| 9 | Combat | Floating Damage Numbers | 3D billboard text rising above targets showing damage and crits | Target position, damage value, `isCrit` | Temporary Three.js sprite or DOM overlay | Fades out and garbage collects after 0.7s | Action-RPG convention & R2 |
| 10 | RPG | XP & Level Progression | Awards XP for combat, discoveries, and chests; levels up player | XP delta, current XP, current level | Level increment, stat boosts, fanfare | Clamped at soft cap (Level 50) | `ORIGINAL_REQUEST.md` R3 |
| 11 | RPG | Dynamic Stat Scaling | Recalculates Max HP, Max Stamina, Attack Power, Crit, Speed per level | `level`, equipped items, buffs | Updated `G.hp`, `G.st`, attack values | Maintains minimum 1 damage and 1 HP | R3 acceptance criteria |
| 12 | RPG | HUD Level & XP Bar | Displays current level badge and animated gold XP progress bar | Current XP, next level XP threshold | HTML DOM bar widths, text badges | Hides overflow if XP exceeds max | `play/index.html` `#bars` |
| 13 | Crafting | Expanded Alchemy Potions | Crafts Great HP, Stamina, Strength, Swiftness, and Stoneskin potions | Materials in `INV` (apples, herbs, ores, gems) | New consumable item added to `INV` | Disables craft button if ingredients missing | `inventory.js:CRAFTING_RECIPES` |
| 14 | Upgrading | Equipment Forge (+0 to +5) | Upgrades weapons, shields, and armor using ores/gems/gold | Target equipment, required materials | Upgraded tier, boosted stats, updated rarity | Rejects upgrade if insufficient materials | `ORIGINAL_REQUEST.md` R3 |
| 15 | Contracts | Stat Bonus Query APIs | `getPlayerBonusDamage()`, `getPlayerBonusHP()`, `getPlayerBonusDefense()` | Current equipment & buffs | Numeric bonus values | Defaults to 0 if slots are empty | R3 Acceptance Criteria |
| 16 | Persistence | Full RPG State Serialization | Saves level, XP, inventory counts, upgrade tiers, and POIs | `GameStorage`, `localStorage` | Persisted JSON under world save | Graceful fallback to default values on parse error | `storage.js` & `network.js` |
```

---

## 7. Edge Cases & Fault Tolerance Analysis

```
## Edge Cases
| # | Feature | Input / Condition | Observed Behavior / Required Handling |
|---|---------|-------------------|----------------------------------------|
| 1 | POI Generation | Macro-cell center lands in deep ocean ($y < \text{SEA} + 2$) | Displace POI to the nearest coastal land voxel or convert to a Sunken Ruin platform with stone pillars reaching above water. |
| 2 | POI Generation | Terrain slope variance $|\Delta h| > 6$ (sheer mountain cliff) | Build a raised stone foundation platform beneath the POI structure so it never floats in mid-air. |
| 3 | Combat | Player attacks while sprinting or falling | Attack animation blends smoothly with torso without canceling ground physics or sprint state. |
| 4 | Combat | Player rolls (Dodge Roll) during incoming enemy attack | Active i-frames (0.04s to 0.52s) negate 100% of damage and knockback; creature attack hits air. |
| 5 | Combat | Player runs out of stamina while holding shield block | Shield guard breaks, player is staggered for 0.6s, takes 100% damage from the breakthrough hit. |
| 6 | Combat | Multiple enemies caught in Greatsword / Battleaxe sweep | Arc check hits up to 3 creatures within cone, dividing knockback evenly and applying damage to all. |
| 7 | Projectiles | Arrow fired directly into sky or open void | Arrow flies up to max range (80m or 3s lifetime) and despawns cleanly without leaking Three.js objects. |
| 8 | RPG Leveling | Player receives massive XP (e.g. +1000 XP) exceeding multiple level thresholds | Loop processes cascading level-ups sequentially, awarding cumulative stat boosts and triggering celebration. |
| 9 | RPG Stats | Equipment with negative speed modifier equipped (e.g. heavy plate armor) | `SpeedMult` clamped to a minimum of 0.4x so the player can never become completely immobilized. |
| 10 | Crafting | Player crafts item with full hotbar / inventory | Stackable items increment count; unique equipment adds to grid; no crash or item loss. |
| 11 | Upgrading | Item upgraded to +5 (max tier) | UI replaces "Vylepšit" with "Maximální úroveň (Masterwork)", prevents further ingredient consumption. |
| 12 | Persistence | World saved with non-existent or modded item ID | Serializer drops unknown IDs or maps to fallback material; game loads without throwing exception. |
```

---

## 8. Verification & Compatibility Plan

1. **Syntax Check**:
   - Resolve line 559 in `js/player.js`.
   - Verify `node --check js/*.js` passes with zero syntax errors.
2. **Interface Verification**:
   - Confirm `window.getPlayerBonusDamage`, `window.getPlayerBonusHP`, `window.getPlayerBonusDefense` exist and return numeric values.
   - Confirm `window.equipToSlot`, `window.unequipSlot`, `window.getPlayerAttackDamage` function correctly with upgraded tiers.
3. **Exploration & Minimap Verification**:
   - Launch world with seed 12345.
   - Confirm POI structures appear in 3D world.
   - Open 3D minimap (`[M]`), confirm POI markers appear above terrain.
4. **Progression Verification**:
   - Defeat enemy or open chest; confirm XP bar increments.
   - Reach level threshold; confirm level-up fanfare, HUD badge updates, and Max HP increases.
   - Refresh page; confirm level, XP, and upgraded items persist in `localStorage`.
5. **Crafting & Upgrading Verification**:
   - Craft potions from apples/materials; verify inventory count increases.
   - Upgrade weapon to `+1`; verify `getPlayerBonusDamage()` increases and tooltip displays `+12%`.
