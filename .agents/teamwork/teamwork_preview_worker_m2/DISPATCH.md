## 2026-10-16T19:53:18Z
You are teamwork_preview_worker_m2.
Your working directory is: c:\Users\tomas\Desktop\WebHra\.agents\teamwork\teamwork_preview_worker_m2\
The project root is: c:\Users\tomas\Desktop\WebHra

Read the original request at: c:\Users\tomas\Desktop\WebHra\.agents\teamwork\ORIGINAL_REQUEST.md
Read the project architecture at: c:\Users\tomas\Desktop\WebHra\.agents\teamwork\PROJECT.md
Read the 3 M2 explorer reports:
- c:\Users\tomas\Desktop\WebHra\.agents\teamwork\teamwork_preview_explorer_m2_1\poi_exploration_report.md
- c:\Users\tomas\Desktop\WebHra\.agents\teamwork\teamwork_preview_explorer_m2_2\minimap_discovery_report.md
- c:\Users\tomas\Desktop\WebHra\.agents\teamwork\teamwork_preview_explorer_m2_3\creature_combat_report.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Scope & Write Boundaries:
You own:
- `js/entities.js` (NEW)
- `js/world.js` (POIManager & macro-cell procedural structures)
- `js/minimap.js` (3D diorama markers, `projectToRadar`, Fog of War POI discovery)
- `js/player.js` (`checkPvPHit()` creature target scanning, singleplayer combat fix)
- `js/audio.js` (`playDiscoveryChime()`)
- `js/game.js` (loop hooks for POIManager, EntityManager, discovery checks, KeyE interaction)
- `play/index.html` (include `js/entities.js` script tag, `#discoveryBanner` markup)

Task: Implement Milestone 2 (Cube World Exploration, Encounters & World Discovery - F4, F5, F6)
1. Create `js/entities.js`:
   - Define `window.EntityManager` adhering to the contract in `PROJECT.md`:
     `creatures: []`, `spawnCreature(type, x, y, z, level = 1)`, `update(dt)`, `getNearbyCreatures(x, z, radius)`.
   - Implement the 4 creature types: Wolf (`creature_wolf`), Goblin (`creature_goblin`), Skeleton Warrior (`creature_skeleton_warrior`), Stone Golem (`creature_stone_golem`) with procedural voxel models, base stats matching `survey_rpg_report.md` / `creature_combat_report.md`, and 6-state AI state machine (`Idle`, `Wander`, `Chase`, `Attack`, `Hurt`, `Dead`) with step-assist terrain navigation.
   - Implement floating 3D health bars, floating damage numbers, and physical loot/XP drops on death.
2. In `play/index.html`:
   - Add `<script src="../js/entities.js?v=1"></script>` in the script tag list (after `voxelBuilder.js` and `character.js`, before `player.js` and `game.js`).
   - Add `#discoveryBanner` markup.
3. In `js/player.js`:
   - In `checkPvPHit()`: remove the early return that blocked combat when `remotePlayers.size === 0`.
   - Expand `checkPvPHit()` to check `window.EntityManager.creatures` in addition to `remotePlayers`, applying weapon reach, weapon damage, crits, knockback, and multi-target cleave.
4. In `js/world.js`:
   - Implement `window.POIManager` with macro-cell spatial grid ($L = 160$), deterministic candidate probing via `h2(x, z)` on dry land ($y \ge \text{SEA} + 3$).
   - Create 3D voxel structures for Shrines, Ruins, Camps, Landmarks, and Chests as Three.js Groups without modifying chunk voxel arrays (`c.d`).
5. In `js/minimap.js`:
   - Add 3D diorama markers in `mmScene` above the terrain with distinct shapes, glowing colors, and idle animations.
   - Expose `window.projectToRadar(playerX, playerZ, targetX, targetZ, radarRadius = 60)` matching contract.
   - Persist discovered POIs in `localStorage` under `voxel_poi_discovered_${SEED}` and reveal Fog of War.
6. In `js/audio.js`:
   - Add `playDiscoveryChime()` (4-note ascending major arpeggio).
7. In `js/game.js`:
   - Update `loop()` to update `POIManager`, `EntityManager`, and check POI discovery within $R = 36$m every 15 frames.
   - Add `KeyE` listener for opening loot chests and activating shrine blessings.
8. Verify everything:
   - Check static syntax: `node --check js/*.js`
   - Run tests: `node test_e2e_runner.js`
   - Verify headless Chrome loads `play/index.html` with zero console errors or uncaught exceptions.
9. Deliver your handoff report to `c:\Users\tomas\Desktop\WebHra\.agents\teamwork\teamwork_preview_worker_m2\handoff.md`.
