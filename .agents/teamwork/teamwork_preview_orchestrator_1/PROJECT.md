# Project: Voxelový svět — Cube World Action-RPG Transformation

## Architecture
Voxelový svět is transformed into a pure Cube World-style 3D Voxel Action-RPG & Exploration game where block building and terrain destruction are eliminated.
The client runs on Three.js (procedural voxel terrain, diorama 3D minimap, rigged character animation, lighting, audio synthesis), while networking operates via dual-transport PeerJS (P2P WebRTC with local BroadcastChannel fallback) and a dedicated WebSocket server (`ServerSource/server.js`).

### Major Subsystems:
1. **Core Engine & Stability**: Three.js render loop, chunk meshing, player physics, swimming & water exit, third-person camera, audio manager, local guest fallback.
2. **Exploration & World Generation**: Deterministic macro-cell POI generation ($L = 160$ blocks) on dry land ($y \ge \text{SEA} + 3$), 3D voxel POI structures (Shrines, Ruins, Camps, Landmarks, Chests), discovery trigger system, 3D minimap diorama marker rendering, and Fog of War integration.
3. **PvE Entities & Combat**: `EntityManager` for creatures (Wolf, Goblin, Skeleton, Golem) with AI state machine (Idle, Wander, Chase, Attack, Flee), hitboxes, damage numbers, health bars, and loot drops.
4. **Weapons & Active Skills**: Melee slashes/thrusts/slams, ranged bows with 3D arrow entities, magic fire/frost staffs with spell projectiles, and shield blocking with stamina consumption.
5. **RPG Progression & Inventory**: XP accumulation ($\lfloor 100 \cdot L^{1.5} \rfloor$), level-up attribute scaling (Max HP, Max Stamina, Attack Power, Crit, Speed), HUD level/XP bar, alchemy crafting (healing/stamina/buff potions), equipment upgrading (`+0` to `+5`), contract functions (`getPlayerBonusDamage()`, `getPlayerBonusHP()`, `getPlayerBonusDefense()`), and `GameStorage` (`localStorage`) persistence.
6. **Multiplayer & Party Management**: Dual-transport P2P and dedicated WebSocket server, state broadcast with level & HP, remote nametags with level badges & 3D health bars, Party Management modal with 1-click teleportation and host kick, and headless testability.

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | Syntax & Static Integrity | Fix syntax error in `js/player.js:559` (extra `}`) and ensure all JS files pass `node --check` with 0 errors. | M1 | R1, Survey |
| F2 | Runtime Stability & Headless Load | Ensure `index.html` and `play/index.html` load with 0 uncaught exceptions/errors, mesh chunks, and reach `ready = true` in headless browser with guest session fallback. | M1 | R1, Survey |
| F3 | Block Building & Mining Removal | Disable/stub out `modifyBlock`, `onRemoteBlockChange`, `applySingleBlock`, and `worldDeltas` in client and server; re-label building blocks to RPG crafting resources; preserve purely action combat clicks. | M1 | R1, Survey |
| F4 | Procedural POIs & Landmarks | Implement deterministic macro-cell placement ($L = 160$) of Shrines, Ruins, Camps, Landmarks, and interactive loot chests with 3D voxel meshes. | M2 | R2, Survey |
| F5 | 3D Minimap Markers & Discovery HUD | Render 3D diorama POI markers on minimap, trigger on-screen discovery toasts with audio when entering undiscovered areas, and update Fog of War. | M2 | R2, Survey |
| F6 | PvE Creatures, AI & Combat | Create PvE creatures (Wolf, Goblin, Skeleton, Golem) with wander/chase/attack AI, hitboxes, damage calculation, health bars, and loot/XP drops. | M2 | R2, Survey |
| F7 | Full Weapon Arsenal & Active Mechanics | Implement active mechanics for all 13 weapons (swords, axes, daggers, spears, maces), 3D arrow projectiles for bows, fire/frost magic projectiles for staffs, and shield blocking. | M3 | R3, Survey |
| F8 | RPG Leveling & Dynamic Stats | Implement XP curve ($\lfloor 100 \cdot L^{1.5} \rfloor$), level-up HUD banner, attribute scaling (Max HP, Max Stamina, Attack, Crit, Speed), and `GameStorage` persistence. | M3 | R3, Survey |
| F9 | Alchemy Crafting & Equipment Upgrading | Implement consumable potion crafting, weapon/armor upgrading (`+0` to `+5`), tooltips, and contract functions `getPlayerBonusDamage()`, `getPlayerBonusHP()`, `getPlayerBonusDefense()`. | M3 | R3, Survey |
| F10 | Dedicated WebSocket Server Protocol | Verify `ServerSource/server.js` lifecycle, packet routing (join, move, chat, equipment, combat, stats, ping, /setTime), and zero-crash operation. | M4 | R4, Survey |
| F11 | P2P PeerJS Dual-Transport & Approval | P2P host/client handshake with WebRTC and BroadcastChannel fallback, join approval modal, queue for multiple requests, and spawn synchronization. | M4 | R4, Survey |
| F12 | Party Management & State Synchronization | Transform `#p2pModal` into Party Manager with player stats, 1-click teleport, host kick; sync remote Level badges, 3D health bars, and minimap party markers. | M4 | R4, Survey |
| F13 | Opaque-Box E2E Test Suite (Tiers 1-4) | Comprehensive automated test suite covering all features in isolation, boundaries, cross-feature interactions, and real-world gameplay scenarios. | M5 | Acceptance Criteria |
| F14 | Adversarial Hardening & Integrity Audit (Tier 5) | White-box stress-testing, boundary fuzzing, and complete forensic audit with zero integrity violations. | M5 | Acceptance Criteria |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Core Stability, Syntax & Removal of Block Building | F1, F2, F3 (`js/player.js`, `js/network.js`, `ServerSource/server.js`, `js/items.js`, `play/index.html`) | None | DONE |
| M2 | Cube World Exploration, Encounters & World Discovery | F4, F5, F6 (`js/world.js`, `js/minimap.js`, `js/entities.js`, `js/ui.js`) | M1 | DONE |
| M3 | RPG Progression, Leveling, Crafting & Equipment Upgrades | F7, F8, F9 (`js/player.js`, `js/inventory.js`, `js/items.js`, `js/combat.js`) | M1, M2 | IN_PROGRESS |
| M4 | Polished P2P & WebSocket Server Multiplayer | F10, F11, F12 (`js/network.js`, `ServerSource/server.js`, `play/index.html`, `js/character.js`) | M1, M3 | PLANNED |
| M5 | E2E Test Suite Pass (Tiers 1-4) & Adversarial Hardening (Tier 5) | F13, F14 (All systems verified end-to-end against acceptance criteria) | M1, M2, M3, M4 | PLANNED |

---

## Interface Contracts

### 1. Contract Functions (Mandatory for R3)
Exposed on `window`:
- `window.getPlayerBonusDamage()`: Returns integer bonus damage from equipped upgraded weapons and rarity multipliers.
- `window.getPlayerBonusHP()`: Returns integer bonus max HP from equipped armor, shields, and upgrades.
- `window.getPlayerBonusDefense()`: Returns integer bonus armor/defense value from equipped gear.

### 2. Player State & RPG Stats
Exposed on `window.P` and synchronized via `GameStorage`:
```javascript
window.P.level = 1;
window.P.xp = 0;
window.P.xpNext = 100;
window.P.baseStats = {
  maxHp: 100,
  maxStamina: 100,
  attackPower: 10,
  critChance: 0.05,
  moveSpeed: 6.0
};
window.addPlayerXP = function(amount, source) { ... };
window.checkPlayerLevelUp = function() { ... };
```

### 3. Entity & POI System Contract
```javascript
window.EntityManager = {
  creatures: [],
  spawnCreature(type, x, y, z, level): CreatureInstance,
  update(dt): void,
  getNearbyCreatures(x, z, radius): CreatureInstance[]
};

window.POIManager = {
  pois: [],
  getPoisInChunk(cx, cz): POIInstance[],
  discoverPOI(poiId): void,
  isDiscovered(poiId): boolean
};
```

### 4. Multiplayer Network Payloads
`sendPlayerTransform()` extended packet:
```javascript
{
  type: 'move',
  x, y, z, yaw, pitch,
  vx, vy, vz,
  moving, sprinting, sneaking,
  inWater, isSwimming, isRolling, isBlocking,
  weaponAction,
  level: window.P.level,
  hp: window.P.hp,
  maxHp: window.P.maxHp
}
```

---

## Code Layout & Write Boundaries
To ensure strict isolation between concurrent agents:
- **Milestone 1 Worker**: Owns edits to `js/player.js:559` syntax fix, block-building stubs in `js/network.js` (lines 1855-1905), building item descriptions in `js/items.js`, and direct load guest fallback in `play/index.html`.
- **Milestone 2 Worker**: Owns POI generation in `js/world.js`, 3D POI minimap markers in `js/minimap.js`, and creature management in `js/entities.js`.
- **Milestone 3 Worker**: Owns RPG progression, leveling UI in `js/ui.js` / `js/player.js`, potion crafting & equipment upgrading in `js/inventory.js`, and contract bonus functions.
- **Milestone 4 Worker**: Owns network packet expansion in `js/network.js`, nametag sprites in `js/network.js`, party management modal in `play/index.html`, and server packet handling in `ServerSource/server.js`.
- **E2E Test Writer**: Owns files under `tests/` or `test/`. Does NOT modify game source code files.
