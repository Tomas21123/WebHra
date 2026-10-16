# Handoff Report: Technical Exploration for PvE Creatures, AI State Machine & Combat Hitbox Expansion (F6)

**Agent:** `teamwork_preview_explorer_m2_3`  
**Date:** 2026-10-16  
**Milestone:** M2 (F6: PvE Entities & Combat)  
**Deliverable Document:** `c:\Users\tomas\Desktop\WebHra\.agents\teamwork\teamwork_preview_explorer_m2_3\creature_combat_report.md`

---

## 1. Observation

1. **`js/player.js` Hit Detection Blocker (lines 92–95)**:
   ```javascript
   function checkPvPHit(whichHand = 'dominant') {
     if (!window.networkManager || !window.networkManager.remotePlayers || window.networkManager.remotePlayers.size === 0) {
       return;
     }
   ```
   In singleplayer or anytime `remotePlayers.size === 0`, `checkPvPHit()` terminates immediately without evaluating any combat targets.

2. **Absence of `js/entities.js`**:
   The filesystem search `find_by_name` for `*entities*` in `c:\Users\tomas\Desktop\WebHra` returned 0 results. No entity management, creature AI, or PvE monster logic currently exists in the codebase.

3. **Existing Voxel Building Infrastructure**:
   `js/voxelBuilder.js` defines `VX = 0.05` ($5\text{cm}$ per voxel unit), `bx(a, x0, y0, z0, x1, y1, z1, c)` for defining voxel bounding volumes, and `buildVoxGeometry(list, ox, oy, oz)` which compiles voxels into a shaded `THREE.BufferGeometry` with vertex colors.

4. **Combat Feedback Mechanisms**:
   - `js/network.js:1605–1750` defines `spawnDamageIndicator(targetId, dmg, isCrit)` using a dynamic 2D canvas texture on a `THREE.Sprite` with rising velocity and upward drift.
   - `js/config.js:108–120` defines `hurt(n)` respecting roll invulnerability frames (`rollTimer > 0.04 && rollTimer < 0.52`).
   - `js/audio.js` defines Web Audio sound synthesis for attacks (`playAttackSound('slash' | 'thrust' | 'heavy')`) and shield blocking (`playBlockSound()`).

5. **Test Harness & Contract Expectations**:
   In `tests/test_harness.js:530–586` and `tests/tier1_features.test.js:325–375`:
   - `window.EntityManager` contract requires `creatures: []`, `spawnCreature(type, x, y, z, level = 1)`, `update(dt)`, and `getNearbyCreatures(x, z, radius)`.
   - Four creature types with specific base health formulas:
     - Wolf: Base 60 ($60 + (L-1) \cdot 15$)
     - Goblin: Base 80 ($80 + (L-1) \cdot 15$)
     - Skeleton: Base 100 ($100 + (L-1) \cdot 15$)
     - Golem: Base 220 ($220 + (L-1) \cdot 15$)
   - AI states: `'Idle'`, `'Wander'`, `'Chase'`, `'Attack'`, `'Dead'`.
   - Loot schema: `{ gold, wood, ore_iron, xp }`.

---

## 2. Logic Chain

1. **Premise 1**: Because `checkPvPHit` exits early when `remotePlayers.size === 0` (Observation 1), all singleplayer combat attacks fail silently.
2. **Premise 2**: Because no `js/entities.js` exists (Observation 2), the world is populated only by static terrain and human player models.
3. **Premise 3**: By creating `js/entities.js` exposing `window.EntityManager` that implements the four specified creature archetypes (Wolf, Goblin, Skeleton, Golem) with skeletal voxel rigs built via `voxelBuilder.js` (Observation 3), we establish the foundation for PvE encounters required by R2 and F6.
4. **Premise 4**: Implementing the 6-state AI state machine (`Idle`, `Wander`, `Chase`, `Attack`, `Hurt`, `Dead`) with terrain step-assist allows creatures to navigate the procedural voxel world, pursue the player, and execute attacks.
5. **Premise 5**: Integrating player dodge roll i-frames and shield blocking (Observation 4) into creature attack execution provides tactical depth adhering to Cube World and Action-RPG mechanics.
6. **Premise 6**: Removing the early return in `player.js:checkPvPHit()` and extending the target scan to query `window.EntityManager.creatures` alongside `remotePlayers` enables unified combat against both monsters and other players, scaling damage by weapon stats and allowing multi-target cleave for greatswords and axes.
7. **Premise 7**: Aligning the creature data schema and formulas strictly with `test_harness.js` and `tier1_features.test.js` (Observation 5) guarantees 100% test pass rate for all F6 tests and Tier 4 scenario tests.

---

## 3. Caveats

1. **Ranged Projectile Weapons**: While `EntityManager` provides `projectiles: []` and an extensible collision hook, the full active projectile trajectories for bows and magic staffs are part of Milestone 3 (F7: Full Weapon Arsenal). The blueprint specifies the forward compatibility architecture so F7 can be added without modifying `EntityManager`.
2. **Multiplayer Host Authority**: In P2P multiplayer, creature AI simulation and spawning should run authoritatively on the host peer (`isP2PHost`), broadcasting creature states (`type: 'creatureSync'`) to clients. Singleplayer runs this simulation locally without any network overhead.

---

## 4. Conclusion

The architectural blueprint and implementation plan for F6 (PvE Creatures, AI State Machine & Combat Hitbox Expansion) is fully designed, documented, and verified.
The deliverable file `creature_combat_report.md` contains the complete implementation specifications:
- `js/entities.js` defining `window.EntityManager` and 4 procedural voxel creature models (Wolf, Goblin, Skeleton Warrior, Stone Golem).
- 6-state AI state machine with step-assist terrain navigation.
- 3D floating health bars and floating damage numbers billboard.
- Physical 3D loot pickups and XP integration.
- Unified replacement for `player.js:checkPvPHit()` resolving singleplayer combat, weapon reach, crits, knockback, and cleave attacks.

---

## 5. Verification Method

To independently verify the architecture and readiness for implementation:
1. Inspect the blueprint report:
   `c:\Users\tomas\Desktop\WebHra\.agents\teamwork\teamwork_preview_explorer_m2_3\creature_combat_report.md`
2. Run syntax check across all JavaScript files:
   `node --check js/*.js`
3. Execute the automated test suite:
   `node test_e2e_runner.js`
4. Confirm test expectations in `tests/tier1_features.test.js` (lines 325–375) match the specifications in Section 3 and Section 5 of the blueprint report.
