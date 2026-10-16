# Orchestrator Soft Handoff — Generation 1 to Generation 2

**Predecessor:** `teamwork_preview_orchestrator_1` (Conv ID: `24461840-fd70-4e09-bae3-4df27de3b558`)  
**Parent Conversation ID:** `fb806dba-a6ca-4e8c-be7f-231ab7d4f4c8`  
**Working Directory:** `c:\Users\tomas\Desktop\WebHra\.agents\teamwork\teamwork_preview_orchestrator_1\`  
**Date:** 2026-10-16T22:25:00Z  
**Handoff Type:** Soft Handoff (Context Succession at Spawn Count 19 >= 16)  

---

## 1. Observation (Completed Work & Current State)

### Completed Phases & Milestones
1. **Phase 0 (Survey & Investigation)**:
   - 3 parallel specialist subagents completed comprehensive codebase analysis:
     - `teamwork_preview_explorer_survey_1`: Stability, syntax errors (`js/player.js:559` extra brace), and removal of all block-building / terrain modification mechanics.
     - `teamwork_preview_spec_miner_survey_1`: Cube World exploration, POIs, creature combat, RPG stats, XP curves, and alchemy crafting/upgrades.
     - `teamwork_preview_explorer_survey_2`: P2P WebRTC / BroadcastChannel multiplayer and `ServerSource/server.js` WebSocket protocol.
2. **Phase 1 (Decomposition & E2E Testing Architecture)**:
   - Authored global architecture specification `PROJECT.md` defining 14 features (F1–F14), 5 sequential milestones (M1–M5), interface contracts (`getPlayerBonusDamage`, `EntityManager`, `POIManager`, network payloads), and strict worker file write boundaries.
   - `teamwork_preview_test_writer_e2e` published `TEST_INFRA.md`, `TEST_READY.md`, and 111 opaque-box tests across Tiers 1–4 with unified master runner `test_e2e_runner.js`.
3. **Milestone 1 (Core Bug Fixes, Stability & Removal of Block Building — R1)**:
   - **Status:** **PASSED GATE**
   - Syntax error in `js/player.js:559` eliminated.
   - Guest session fallback added in `play/index.html:29-33`.
   - Block placement, mining, and chunk mutation disabled across client (`js/network.js`) and server (`ServerSource/server.js`).
   - All 19 JS files verified with `node --check` (0 syntax errors).
   - Gate verdicts: Reviewer 1 (APPROVE), Reviewer 2 (APPROVE), Challenger 1 (APPROVE), Challenger 2 (APPROVE), Auditor (CLEAN).
4. **Milestone 2 (Cube World Exploration, Encounters & World Discovery — R2, F4–F6)**:
   - **Implementation:** Completed by `teamwork_preview_worker_m2`.
     - `js/world.js`: `window.POIManager` macro-cell generation ($L = 160$), dry land candidate probing ($y \ge 47$), 3D Three.js Group structures (Shrines, Ruins, Camps, Landmarks, Chests) without modifying chunk voxel arrays.
     - `js/minimap.js`: 3D diorama markers, `window.projectToRadar()`, Fog of War reveals, and localStorage persistence under `voxel_poi_discovered_${SEED}`.
     - `js/entities.js`: `window.EntityManager` managing Wolf, Goblin, Skeleton Warrior, Stone Golem with procedural 3D voxel models, AI state machine, overhead health bars, floating damage numbers, and physical 3D loot drops.
     - `js/player.js`: `checkPvPHit()` singleplayer blocker removed, expanded to scan `EntityManager.creatures` with reach, crits, knockback, and cleave.
     - `js/audio.js` (`playDiscoveryChime()`) and `play/index.html` (`#discoveryBanner`).
   - **Milestone 2 Gate (Iteration 1) Status:**
     - `reviewer_m2_1`: **APPROVE** (POIManager dry land generation & minimap diorama markers pass).
     - `challenger_m2_1`: **APPROVE** (34/34 empirical stress tests pass in `tests/m2_adversarial_stress.test.js`).
     - `challenger_m2_2`: **APPROVE** (26/26 combat AI & cleave tests pass in `tests/adversarial_m2_combat_ai.test.js`, 9/9 in live Chrome).
     - `auditor_m2`: **CLEAN** (13/13 forensic integrity checks pass in `tests/m2_forensic_integrity.test.js`, zero cheating/facades).
     - `reviewer_m2_2`: **REQUEST_CHANGES** (identified missing `Hurt` stagger state logic in `js/entities.js` and test decoupling in `tests/tier1_features.test.js:F6`).

---

## 2. Logic Chain & Required Remediation for Successor

### Reviewer 2 (`reviewer_m2_2`) Finding:
- **Critical Finding**: Both worker M2's handoff and comments in `js/entities.js:158` state: `// AI Stavový automat (6 stavů: Idle, Wander, Chase, Attack, Hurt, Dead)`. However, `takeDamage()` sets `this.state = 'Chase'` directly without entering `'Hurt'`, and `update()` has no `else if (this.state === 'Hurt')` branch. Even if injected externally, distance checks in `update()` overwrite it every tick.
- **Major Finding**: In `tests/tier1_features.test.js:327-375`, F6 tests did not call `loadScriptIntoSandbox('js/entities.js', sandbox)` and tested against an in-memory mock in `tests/test_harness.js`. `createMockThree()` lacked `MeshLambertMaterial`, `ConeGeometry`, `Sprite`, `SpriteMaterial`, `CanvasTexture`.

### Concrete Remediation Plan for Milestone 2 Iteration 2:
1. **Spawn `worker_m2_fix`** (`teamwork_preview_worker`) with instructions to:
   - In `js/entities.js`:
     - Add `this.hurtTimer = 0;` in `CreatureInstance` constructor.
     - In `takeDamage(damage, knockback, isCrit, attacker)`: when `this.hp > 0`, set `this.state = 'Hurt'` and `this.hurtTimer = 0.35` (stagger duration).
     - In `update(dt)`: before distance-based state updates, check:
       ```javascript
       if (this.state === 'Hurt') {
         this.hurtTimer -= dt;
         if (this.hurtTimer <= 0) {
           this.state = (dist <= this.attackReach) ? 'Attack' : 'Chase';
         }
         return; // Creature reels/staggers, freezing movement & attack during hurtTimer
       }
       ```
     - Ensure terrain step-assist checks do not climb 90-degree cliffs $> 0.65$m.
   - In `tests/test_harness.js`:
     - In `createMockThree()`, add `MeshLambertMaterial`, `ConeGeometry`, `Sprite`, `SpriteMaterial`, and `CanvasTexture`.
   - In `tests/tier1_features.test.js:describe('F6')`:
     - Load `js/entities.js` directly into the sandbox and add a test asserting that taking non-lethal damage transitions creature to `Hurt` for `hurtTimer = 0.35s`.
   - In `js/world.js` / `js/game.js`:
     - Ensure guardian creatures spawn at Camps (Goblins) and Ruins (Skeletons) on attachment.
2. **Re-verify with `reviewer_m2_2`** (`teamwork_preview_reviewer`).
   - When verdict is **APPROVE**, mark Milestone 2 as **PASS** in `GATE_STATUS.md` and `DONE` in `PROJECT.md`.

---

## 3. Remaining Milestones & Next Steps

1. **Milestone 2 (Remediation)**:
   - Dispatch Worker fix -> Reviewer 2 verification -> Gate PASS.
2. **Milestone 3 (RPG Progression, Leveling, Crafting & Equipment Upgrades — R3, F7–F9)**:
   - Implement XP progression, leveling curve ($\lfloor 100 \cdot L^{1.5} \rfloor$), stat growth, HUD level/XP bar, and `GameStorage` persistence.
   - Implement potion crafting and equipment upgrades (`+0` to `+5`) in `js/inventory.js`.
   - Implement contract functions on `window`: `getPlayerBonusDamage()`, `getPlayerBonusHP()`, `getPlayerBonusDefense()`.
   - Implement 3D active arrow projectiles for bows and spell projectiles for magic staffs in `js/player.js`.
   - Full gate verification: Worker -> 2 Reviewers -> 2 Challengers -> 1 Auditor.
3. **Milestone 4 (Multiplayer P2P & Dedicated WebSocket Server — R4, F10–F12)**:
   - Synchronize level/HP in network packets, render level badges and 3D health bars on nametags.
   - Transform `#p2pModal` into Party Management UI (teleport to party members, kick, view stats).
   - Ensure `/setTime` and combat packets work with zero server crashes.
   - Full gate verification: Worker -> 2 Reviewers -> 2 Challengers -> 1 Auditor.
4. **Milestone 5 (E2E Test Suite Pass & Adversarial Hardening — F13, F14)**:
   - Phase 1: Run full 111-test suite in `test_e2e_runner.js` until 100% pass (0 failures).
   - Phase 2: Adversarial coverage hardening (Tier 5) with Challengers and final Forensic Audit.
   - Report final completion to parent (`fb806dba-a6ca-4e8c-be7f-231ab7d4f4c8`).

---

## 4. Key Constraints & Operational Rules for Successor
- **DISPATCH-ONLY**: You MUST NOT write source code or run build/test commands directly. You only edit `.md` files in `.agents/teamwork/`.
- **Integrity Forensics**: The Forensic Auditor's verdict is a **BINARY VETO**.
- **Parent Passthrough**: Your parent is `fb806dba-a6ca-4e8c-be7f-231ab7d4f4c8`. All messages/escalation must go to this ID.
- **Heartbeat Task**: Re-establish your recurring heartbeat cron `schedule(CronExpression="*/10 * * * *")` upon taking over.
- **Always Pass `ORIGINAL_REQUEST.md`**: Subagents must always be given the full path to `ORIGINAL_REQUEST.md`.
