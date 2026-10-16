# Test Infrastructure & Opaque-Box E2E Testing Architecture

## Overview
This document defines the automated test architecture, harness design, test tier inventory, and execution commands establishing the **E2E Testing Track** for **Voxelový svět — Cube World Action-RPG Transformation**.

The test suite exercises the game's client scripts (`js/*.js`), backend dedicated server (`ServerSource/server.js`), interface contracts, and multiplayer lifecycle end-to-end using an opaque-box methodology in pure Node.js without requiring a physical GPU, browser window, or external test runner dependencies.

---

## Architecture & Test Harness

### 1. Headless Virtual Runtime (`tests/test_harness.js`)
Client scripts in `js/` expect a browser environment (`window`, `document`, `localStorage`, `THREE`, `AudioContext`, etc.). The test harness provides:
- **DOM Sandboxing**: Lightweight, memory-safe DOM emulation implementing standard element attributes (`style`, `classList`, `children`, `hidden`, `addEventListener`, `dispatchEvent`) matching elements in `play/index.html` (`#hud`, `#bars`, `#hb`, `#toast`, `#inv`, `#chatBox`, etc.).
- **Three.js Primitives Mock**: Mock math and scene objects (`Vector3`, `Euler`, `Quaternion`, `Object3D`, `Group`, `Mesh`, `BoxGeometry`, `Color`) permitting 3D character and projectile logic to run headlessly.
- **GameStorage / LocalStorage Mock**: In-memory storage mock verifying character persistence and seed saving.
- **Contract Oracle System**: Implements the authoritative mathematical formulas and interface contracts from `PROJECT.md` (§ Interface Contracts 1-4). When live implementations are loaded into `window`, the tests verify the real code; when inspecting interface contracts across milestones, the oracle validates compliance against the formal specifications.

### 2. Assertion & Suite Runner (`tests/test_utils.js`)
A dependency-free test runner supporting:
- Structured `describe()` and `test()` blocks.
- Rich assertions: `assert`, `assertEqual`, `assertDeepEqual`, `assertCloseTo`, `assertThrows`.
- Detailed test result reporting with colorized output, error stack traces, and exit code handling.

---

## 4-Tier Test Suite Organization

```
tests/
├── test_harness.js           # Headless DOM, Three.js sandbox, and contract oracle
├── test_utils.js             # Test runner, assertion library, and suite registry
├── tier1_features.test.js    # Tier 1: Feature Coverage (60 tests across 12 features)
├── tier2_boundaries.test.js  # Tier 2: Boundary & Corner Cases (30 tests across 6 categories)
├── tier3_cross_features.test.js # Tier 3: Cross-Feature Combinations (16 tests)
├── tier4_scenarios.test.js   # Tier 4: Real-World Scenarios (5 player lifecycle scenarios)
└── run_e2e.js               # Secondary test entry point delegating to root runner
test_e2e_runner.js            # Root CLI runner (node test_e2e_runner.js / npm test)
```

---

## Detailed Test Inventory

### Tier 1: Feature Coverage (60 Tests, 12 Features × 5 Tests)
- **F1: Syntax & Static Integrity (5 tests)**
  - F1.1: `js/player.js` passes syntax validation with 0 errors via `vm.Script`.
  - F1.2: All `js/*.js` files compile cleanly without syntax errors.
  - F1.3: `ServerSource/server.js` passes syntax check with 0 errors.
  - F1.4: `play/index.html` script tags resolve to existing files on disk.
  - F1.5: `index.html` script tags resolve to existing files on disk.
- **F2: Runtime Stability & Headless Load (5 tests)**
  - F2.1: Headless sandbox initializes with complete DOM elements without errors.
  - F2.2: Guest session fallback operates safely when auth user is absent.
  - F2.3: Audio system initializes in headless mode without crashing WebAudio.
  - F2.4: World configuration initializes default seed 12345 when none is saved.
  - F2.5: Game loop status flag transitions to `ready = true` without uncaught exceptions.
- **F3: Block Building & Mining Removal (5 tests)**
  - F3.1: `modifyBlock` is stubbed or disabled, preventing block additions.
  - F3.2: Terrain mining / block breaking action is completely disabled.
  - F3.3: Left mouse click performs weapon attack rather than block mining.
  - F3.4: Right mouse click triggers active weapon skill or shield blocking.
  - F3.5: Inventory items `wood` and `stone` are categorized as crafting materials.
- **F4: Procedural POIs & Landmarks (5 tests)**
  - F4.1: Deterministic POI macro-cell layout with cell spacing $L = 160$.
  - F4.2: POIs are only placed on dry land ($y \ge \text{SEA} + 3 = 47$).
  - F4.3: POI types include Shrines, Ruins, Camps, Landmarks, and Chests.
  - F4.4: `POIManager.getPoisInChunk` returns correct POI for chunk coords.
  - F4.5: Discovery state tracking records new discoveries and awards XP.
- **F5: 3D Minimap Markers & Discovery HUD (5 tests)**
  - F5.1: Discovered POIs create minimap marker objects.
  - F5.2: World to minimap coordinate projection computes relative radar positions.
  - F5.3: Discovery triggers display toast notification with landmark name.
  - F5.4: Discovery awards exploration XP to player via `addPlayerXP`.
  - F5.5: Undiscovered areas remain obscured in Fog of War.
- **F6: PvE Creatures, AI & Combat (5 tests)**
  - F6.1: Spawning PvE entities sets correct type, level, and health attributes.
  - F6.2: State machine maintains Wander/Idle state when player is far away.
  - F6.3: State machine transitions to Chase state when player enters aggro radius.
  - F6.4: State machine transitions to Attack state within attack reach.
  - F6.5: Entity death grants loot items, gold, and combat XP.
- **F7: Full Weapon Arsenal & Active Mechanics (5 tests)**
  - F7.1: All melee weapons have defined damage, reach, and speed statistics.
  - F7.2: Bow weapon mechanics spawn 3D arrow projectile entity.
  - F7.3: Fire staff casts explosive fire projectile with area damage.
  - F7.4: Frost staff casts chilling frost projectile with slow effect.
  - F7.5: Shield blocking consumes stamina and reduces incoming damage.
- **F8: RPG Leveling & Dynamic Stats (5 tests)**
  - F8.1: XP curve matches mathematical formula $\lfloor 100 \cdot L^{1.5} \rfloor$.
  - F8.2: `addPlayerXP` accumulates XP towards `xpNext`.
  - F8.3: Level up increments level, resets current XP, and updates next threshold.
  - F8.4: Level-up scales base attributes (Max HP, Stamina, Attack Power).
  - F8.5: Level-up restores current HP to full Max HP.
- **F9: Alchemy Crafting & Equipment Upgrading (5 tests)**
  - F9.1: Crafting consumable healing potion consumes ingredients and adds item.
  - F9.2: Crafting with insufficient materials fails without modifying inventory.
  - F9.3: Weapon upgrading increments upgrade level from `+0` to `+1`.
  - F9.4: Contract function `getPlayerBonusDamage()` reflects equipped weapon and upgrade level.
  - F9.5: Contract function `getPlayerBonusHP()` reflects equipped armor and upgrade level.
- **F10: Dedicated WebSocket Server Protocol (5 tests)**
  - F10.1: Server configuration validates port, seed, maxPlayers, and motd.
  - F10.2: Packet handler routes join packet and assigns unique player ID.
  - F10.3: Packet handler broadcasts move packet containing position, level, and HP.
  - F10.4: Packet handler handles `/time` and `/help` slash commands.
  - F10.5: Server ignores obsolete `blockChange` packets without modifying world deltas.
- **F11: P2P PeerJS Dual-Transport & Handshake (5 tests)**
  - F11.1: Host session generates valid room code format `VOX-XXXX`.
  - F11.2: Client connection request places guest into pending approval state.
  - F11.3: `approveP2PJoin` transitions guest from pending to approved state.
  - F11.4: Approved guest receives host spawn coordinates within 2 blocks.
  - F11.5: Signaling fallback triggers local `BroadcastChannel` when WebRTC signaling fails.
- **F12: Party Management & State Synchronization (5 tests)**
  - F12.1: Party member list displays connected player names, level badges, and HP.
  - F12.2: Host kick action removes player from party list and fires disconnect.
  - F12.3: Party teleportation sets player coordinates to target party member position.
  - F12.4: Remote player state synchronization updates remote nametag with level badge.
  - F12.5: Minimap renders distinct party member position markers.

### Tier 2: Boundary & Corner Cases (30 Tests, 6 Categories × 5 Tests)
- **T2.1: Level Thresholds & XP Boundaries (5 tests)**
  - T2.1.1: Exact threshold XP triggers level up with exactly 0 remainder.
  - T2.1.2: Overflow XP carries into next level progression without loss.
  - T2.1.3: Huge multi-level XP grant triggers multiple sequential level ups.
  - T2.1.4: Level 1 with 0 XP edge condition cannot trigger negative XP or downgrade.
  - T2.1.5: High level scaling computes finite positive threshold without overflow.
- **T2.2: Zero, Negative & Extreme Stats (5 tests)**
  - T2.2.1: Massive lethal damage clamps HP to exactly 0.
  - T2.2.2: Stamina consumption exceeding current stamina clamps to 0.
  - T2.2.3: Zero damage weapon or zero defense armor does not produce negative calculations.
  - T2.2.4: Zero delta time `dt = 0` does not cause division by zero or NaN.
  - T2.2.5: Healing when already at max HP clamps cleanly to max HP.
- **T2.3: Maximum Upgrades (+5 Limit) (5 tests)**
  - T2.3.1: Equipment at +4 upgrades successfully to +5.
  - T2.3.2: Equipment at +5 rejects further upgrades and returns false.
  - T2.3.3: Attempting upgrade with insufficient resources leaves upgrade level unchanged.
  - T2.3.4: Attempting to upgrade consumable or non-upgradeable item is rejected.
  - T2.3.5: Upgraded items retain their +N level across JSON serialization.
- **T2.4: Empty Inventory & Equipment Slots (5 tests)**
  - T2.4.1: Calling `getPlayerBonusDamage` with unarmed weapon slot returns 0.
  - T2.4.2: Calling `getPlayerBonusHP` and `getPlayerBonusDefense` with empty armor returns 0.
  - T2.4.3: Rendering empty inventory does not throw null pointer exception.
  - T2.4.4: Crafting when inventory is full fails safely without consuming ingredients.
  - T2.4.5: Selecting empty hotbar slot sets held item to null without crash.
- **T2.5: Multiplayer Disconnect, Packet Corruption & Reconnect (5 tests)**
  - T2.5.1: Peer abruptly disconnecting cleans up remote player rig and party list.
  - T2.5.2: Server client disconnect removes player from server registry.
  - T2.5.3: Reconnecting client with same username cleans up old session.
  - T2.5.4: Malformed JSON packet payload is caught and discarded safely.
  - T2.5.5: Out-of-order transform packet is ignored in favor of newer timestamp.
- **T2.6: Edge Coordinate Navigation & World Bounds (5 tests)**
  - T2.6.1: Negative coordinate boundaries evaluate POIs deterministically.
  - T2.6.2: Deep void fall ($y < -20$) triggers safe void respawn to spawn coordinates.
  - T2.6.3: High altitude traversal maintains stable numerical position.
  - T2.6.4: Traversing chunk boundary updates chunk coordinates cleanly.
  - T2.6.5: Sub-pixel velocities do not trigger collision locks.

### Tier 3: Cross-Feature Combinations (16 Tests)
- **T3.1: Leveling + Combat Stat Application (4 tests)**
  - T3.1.1: Base Attack Power and `getPlayerBonusDamage` stack additively in total combat output.
  - T3.1.2: Upgraded weapon (+2) on a Level 3 player scales combat hit output accurately.
  - T3.1.3: Critical strike multiplier applies across both base attack and weapon bonus damage.
  - T3.1.4: Equipping upgraded armor adds `getPlayerBonusHP` to level-scaled Max HP.
- **T3.2: Exploration + Discovery XP + Level-up Flow (4 tests)**
  - T3.2.1: Player traversing into undiscovered POI triggers discovery and awards XP.
  - T3.2.2: Discovery XP accumulation pushes player over threshold and triggers level up.
  - T3.2.3: Discovered POI updates minimap and prevents duplicate XP on re-entry.
  - T3.2.4: Discovering multiple POIs sequentially advances player through level thresholds.
- **T3.3: Crafting Potions + Hotbar Usage + Combat Consumption (4 tests)**
  - T3.3.1: Gathering materials -> crafting potion -> binding to hotbar.
  - T3.3.2: Consuming potion from hotbar restores HP and decrements count.
  - T3.3.3: Consuming potion when damaged near max HP respects max HP clamp.
  - T3.3.4: Depleting all potions clears the hotbar item slot.
- **T3.4: Multiplayer Combat Hits + HP Sync + Remote Badges (4 tests)**
  - T3.4.1: Combat hit on target produces damage event packet with updated HP.
  - T3.4.2: Remote client receives combat hit packet and updates target 3D health bar.
  - T3.4.3: Remote player level up broadcasts new level, updating nametag badge on peers.
  - T3.4.4: Remote player death broadcasts state, triggering death event and party notice.

### Tier 4: Real-World Application Scenarios (5 Comprehensive Lifecycles)
- **T4.1: Scenario 1 — Player Exploration & Level Up Lifecycle**:
  New player spawns at $(0,50,0)$ $\rightarrow$ travels across chunks to Landmark 1 $(80, 47, 80)$ $\rightarrow$ earns 50 XP $\rightarrow$ travels to Landmark 2 in cell $(0,1)$ $(80, 47, 240)$ $\rightarrow$ earns 50 XP $\rightarrow$ crosses 100 XP threshold $\rightarrow$ levels up to Level 2 $\rightarrow$ Max HP scales to 110, Attack power scales to 12 $\rightarrow$ persists state to `localStorage`.
- **T4.2: Scenario 2 — Combat Encounter & Alchemy Crafting Lifecycle**:
  Player encounters a Level 1 Goblin (80 HP) $\rightarrow$ executes weapon attack dealing 36 damage $\rightarrow$ blocks Goblin attack with oak shield (mitigating 65% damage with stamina cost) $\rightarrow$ deals second and third fatal blows $\rightarrow$ Goblin dies, dropping wood and gold $\rightarrow$ crafts healing potion at alchemy station $\rightarrow$ consumes potion to restore full HP.
- **T4.3: Scenario 3 — Forge Equipment Upgrades & Contract Function**:
  Equipped Steel Sword at +0 (base 26 damage) $\rightarrow$ calls `getPlayerBonusDamage()` yielding 26 $\rightarrow$ upgrades sword to +1 at forge $\rightarrow$ `getPlayerBonusDamage()` increases to 30 $\rightarrow$ upgrades sword to +2 $\rightarrow$ `getPlayerBonusDamage()` increases to 34 $\rightarrow$ verifies damage bonus applies in combat hits.
- **T4.4: Scenario 4 — Multiplayer P2P Handshake & Party Management**:
  Host initializes P2P room with code `VOX-7K9A` at $(120, 52, 210)$ $\rightarrow$ Guest requests join with username `GuestKnight` $\rightarrow$ Guest enters waiting state $\rightarrow$ Host approves join via `approveP2PJoin` $\rightarrow$ Guest receives world seed and spawns within 2 blocks of host $(121.5, 52, 211.5)$ $\rightarrow$ Guest wanders 200 blocks away $\rightarrow$ Host uses 1-click teleport in Party Management UI to teleport to guest.
- **T4.5: Scenario 5 — Dedicated WebSocket Server Session Lifecycle**:
  Dedicated server starts with seed 12345 $\rightarrow$ Alice (Level 3, HP 120) and Bob (Level 5, HP 140) connect and join $\rightarrow$ Alice broadcasts move packet with level badge and HP $\rightarrow$ Bob receives transform packet $\rightarrow$ Bob sends chat message with slash command `/time night` $\rightarrow$ server updates world time $\rightarrow$ Bob disconnects $\rightarrow$ server broadcasts leave packet $\rightarrow$ Alice client removes remote rig.

---

## How to Run the Tests

### 1. Run Complete Test Suite (All Tiers 1-4)
```bash
node test_e2e_runner.js
# OR
npm test
```

### 2. Run Specific Tiers
```bash
node test_e2e_runner.js --tier 1
node test_e2e_runner.js --tier 2
node test_e2e_runner.js --tier 3
node test_e2e_runner.js --tier 4
node test_e2e_runner.js --tier 1,4
```

### 3. Exit Code Convention
- **Exit Code 0**: All tests executed and passed (100% success).
- **Exit Code 1**: One or more tests failed. Stack trace and failure details printed to stdout/stderr.
