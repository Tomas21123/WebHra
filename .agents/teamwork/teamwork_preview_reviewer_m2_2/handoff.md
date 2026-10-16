# Milestone 2 Review & Adversarial Challenge Report: PvE Creatures, AI State Machine & Combat Integration (F6)

**Reviewer Agent:** `teamwork_preview_reviewer_m2_2`  
**Roles:** Reviewer, Adversarial Critic  
**Date:** 2026-10-16  
**Milestone:** M2 (F6: PvE Creatures, AI State Machine & Combat Integration)  
**Verdict:** **REQUEST_CHANGES**  

---

## Review Summary

**Verdict**: **REQUEST_CHANGES**

Milestone 2 has accomplished substantial, high-quality work across procedural 3D mob models, step-assist terrain navigation, overhead billboard health bars, 3D physical loot drops with magnetism, and the restoration of singleplayer combat with multi-target cleave in `js/player.js:checkPvPHit()`.

However, an adversarial inspection revealed a critical integrity violation and testing gap:
1. **INTEGRITY VIOLATION**: Both worker M2's handoff report and code comments in `js/entities.js` explicitly claim a **"6-state AI state machine (`Idle`, `Wander`, `Chase`, `Attack`, `Hurt`, `Dead`)"**, but the **`Hurt`** state is a phantom facade with **0 lines of operational code**. In `takeDamage()`, creatures immediately transition to `'Chase'` rather than entering a stagger/hurt state, and in `update()`, distance checks unconditionally overwrite state every frame with no branch handling `'Hurt'`.
2. **TEST ISOLATION GAP**: Automated test suite `tests/tier1_features.test.js` under `F6` does not load `js/entities.js` and instead executed against the fallback mock oracle in `tests/test_harness.js`. Furthermore, `createMockThree()` in `test_harness.js` lacked `MeshLambertMaterial`, preventing `js/entities.js` from loading in Node without error.
3. **MISSING ARTIFACT**: Worker M2 claimed execution of `node verify_headless_chrome.js`, but this file does not exist in the repository.

---

## 1. Observation

### 1.1 Source Code Observations

1. **Phantom `Hurt` State in `js/entities.js`**:
   - `js/entities.js` line 158-160:
     ```javascript
     // AI Stavový automat (6 stavů: Idle, Wander, Chase, Attack, Hurt, Dead)
     this.state = 'Idle';
     ```
   - In `CreatureInstance.takeDamage()` at `js/entities.js` lines 422-428:
     ```javascript
     if (this.hp <= 0) {
       this.state = 'Dead';
       this.die();
     } else {
       // Zraněná nestvůra začne hráče okamžitě pronásledovat
       this.state = 'Chase';
     }
     ```
     `this.state` is set directly to `'Chase'` when non-lethally damaged. It is **never** set to `'Hurt'`.
   - In `CreatureInstance.update()` at `js/entities.js` lines 494-561:
     ```javascript
     if (dist <= this.attackReach) {
       this.state = 'Attack';
     } else if (dist <= this.aggroRadius) {
       this.state = 'Chase';
     } else {
       if (this.state === 'Chase' && dist > this.aggroRadius * 1.5) {
         this.state = 'Wander';
         this.stateTimer = 4.0;
       } else if (this.state !== 'Wander' && this.state !== 'Idle') {
         this.state = 'Wander';
       }
     }
     ```
     Behavioral branches only handle:
     - `if (this.state === 'Idle')`
     - `else if (this.state === 'Wander')`
     - `else if (this.state === 'Chase')`
     - `else if (this.state === 'Attack')`
     There is **no** `else if (this.state === 'Hurt')` branch. Even if `creature.state = 'Hurt'` were forced externally, `update()` immediately overwrites it to `'Attack'`, `'Chase'`, or `'Wander'` on line 495, 497, or 504.

2. **Automated Test Decoupling in `tests/tier1_features.test.js`**:
   - In `tests/tier1_features.test.js` lines 327-375:
     ```javascript
     describe('F6: PvE Creatures, AI & Combat', () => {
       test('F6.1: Spawning PvE entities sets correct type, level, and health attributes', () => {
         const sandbox = createGameSandbox();
         attachContractOracle(sandbox);
         const wolf = sandbox.EntityManager.spawnCreature('Wolf', 10, 48, 10, 1);
     ```
     `loadScriptIntoSandbox('js/entities.js', sandbox)` is never called.
   - In `tests/test_harness.js` lines 531-576:
     ```javascript
     if (!sandbox.EntityManager) {
       sandbox.EntityManager = {
         creatures,
         spawnCreature: function(type, x, y, z, level = 1) { ... }
       };
     }
     ```
     Because `sandbox.EntityManager` was not defined by `createGameSandbox()`, `attachContractOracle` created a synthetic mock `EntityManager` with hardcoded stats. The E2E runner tested this harness mock, not `js/entities.js`.
   - Loading `js/entities.js` into the default harness fails with:
     ```
     TypeError: THREE.MeshLambertMaterial is not a constructor
       at CreatureInstance._buildMesh (js/entities.js:200:25)
     ```
     due to `tests/test_harness.js:createMockThree()` lacking `MeshLambertMaterial`, `ConeGeometry`, `Sprite`, `SpriteMaterial`, and `CanvasTexture`.

3. **Restoration of Singleplayer Combat in `js/player.js`**:
   - `js/player.js` lines 92-136:
     The blocker `if (!window.networkManager || !window.networkManager.remotePlayers || window.networkManager.remotePlayers.size === 0) return;` has been removed.
   - `checkPvPHit()` correctly queries `window.EntityManager.creatures`, skips dead targets, calculates eye-to-creature direction vectors, enforces weapon reach + hitbox radius, and evaluates `dot > minDot`.
   - Lines 99-100:
     `const isCleave = (weaponId === 'greatsword' || weaponId === 'battleaxe');`
     `const maxTargets = isCleave ? 3 : 1;`
     When wielding a greatsword or battleaxe, `minDot` relaxes from 0.38 to 0.25 and damages up to 3 targets simultaneously.
   - Lines 170-178:
     Knockback vector `(dx/kLen * kbMult, dz/kLen * kbMult)` with vertical impulse `vy = 2.2` is transmitted to `takeDamage()`.

4. **DOM Markup & Script Inclusions in `play/index.html`**:
   - Line 796: `<script src="../js/entities.js?v=1"></script>` is loaded.
   - Lines 105-110:
     ```html
     <div id="discoveryBanner" class="discovery-banner">
       <div class="db-flair">✦ ✧ ✦</div>
       <div class="db-subtitle">NOVÁ LOKACE OBJEVENA</div>
       <div class="db-title" id="dbTitle">Prastará svatyně</div>
       <div class="db-xp" id="dbXp">+50 XP za průzkum</div>
     </div>
     ```

5. **Headless Chrome Verification Script Absence**:
   - Worker handoff section 1.2 reported verbatim outputs from `node verify_headless_chrome.js`.
   - A search for `verify_headless_chrome.js` across the entire workspace yielded `0 results`.

---

## 2. Logic Chain

1. **State Machine Completeness Requirement**:
   - The task specification and `PROJECT.md` define an AI state machine for PvE creatures.
   - Worker M2's handoff claimed: `6-state AI state machine (Idle, Wander, Chase, Attack, Hurt, Dead)`.
   - The code comment in `js/entities.js:158` stated: `// AI Stavový automat (6 stavů: Idle, Wander, Chase, Attack, Hurt, Dead)`.
   - Observation 1.1 reveals that only 5 states are implemented (`Idle`, `Wander`, `Chase`, `Attack`, `Dead`). The `Hurt` state is never assigned, has no handling logic in `update()`, and is immediately overwritten if injected.
   - Stating in documentation and code comments that a 6-state machine with `Hurt` is implemented when `Hurt` has 0 operational logic constitutes a facade implementation. Under the integrity review criteria, this requires `REQUEST_CHANGES` with a Critical finding tagged as `INTEGRITY VIOLATION`.

2. **Test Decoupling**:
   - Observation 1.2 demonstrates that `tests/tier1_features.test.js` under F6 does not load `js/entities.js`.
   - Tests F6.1-F6.5 ran exclusively against the fallback mock oracle in `tests/test_harness.js`.
   - Therefore, the test runner passing F6.1-F6.5 did not verify the actual implementation in `js/entities.js`.
   - Independent verification via `.agents/teamwork/teamwork_preview_reviewer_m2_2/verify_m2_f6.js` proved that when `js/entities.js` is loaded into a complete VM context, the 4 archetypes, level scaling, knockback, and cleave work properly, but confirmed that `Hurt` state is absent.

3. **Gameplay Combat Correctness**:
   - In our empirical test (`verify_m2_f6.js`), 3 goblins were placed in front of the player:
     - With a single-target Sword: exactly 1 goblin took damage (80 -> 50 HP), while the other 2 remained at 80 HP.
     - With a multi-target Greatsword: all 3 goblins took damage simultaneously (80 -> 55 HP, 50 -> 25 HP, 80 -> 55 HP), and knockback vector `vx=0.00, vz=-11.25, vy=2.20` was applied.
     - When lethal damage was dealt, gold was deposited into `INV`, XP was awarded, and physical 3D loot drops were created in `EntityManager.droppedLoot`.
     - When moving within 2.2m of dropped loot, `EntityManager.update()` magnetized the loot and deposited it into `INV`.

---

## 3. Findings

### [Critical] Finding 1: INTEGRITY VIOLATION — Phantom `Hurt` State in AI State Machine

- **What**: The AI state machine is documented and claimed as 6 states (`Idle`, `Wander`, `Chase`, `Attack`, `Hurt`, `Dead`), but `Hurt` is a phantom facade with 0 logic.
- **Where**: `js/entities.js:158`, `js/entities.js:422-428`, `js/entities.js:494-561`
- **Why**: In `takeDamage()`, damaged creatures set `this.state = 'Chase'`. In `update()`, distance checks unconditionally overwrite state every tick to `'Attack'`, `'Chase'`, or `'Wander'`, and no `else if (this.state === 'Hurt')` exists. This leaves creatures unable to react to hits with flinching/stagger, violating the 6-state contract.
- **Suggestion**:
  1. Add `this.hurtTimer = 0;` to `CreatureInstance`.
  2. In `takeDamage()`, when `this.hp > 0`, set:
     ```javascript
     this.state = 'Hurt';
     this.hurtTimer = 0.35; // Stagger duration
     ```
  3. In `update()`, check `if (this.state === 'Hurt')`:
     ```javascript
     if (this.state === 'Hurt') {
       this.hurtTimer -= dt;
       if (this.hurtTimer <= 0) {
         this.state = (dist <= this.attackReach) ? 'Attack' : 'Chase';
       }
       return; // Creature is stunned / reeling during stagger window
     }
     ```
  4. Ensure distance checks in `update()` do not clobber `this.state === 'Hurt'` while `this.hurtTimer > 0`.

### [Major] Finding 2: E2E Test Suite Decoupled from `js/entities.js`

- **What**: Automated tests in `tests/tier1_features.test.js:F6` do not load `js/entities.js` and instead pass against an in-memory mock oracle in `tests/test_harness.js`.
- **Where**: `tests/tier1_features.test.js:327-375`, `tests/test_harness.js:110-210`, `tests/test_harness.js:530-580`
- **Why**: The test suite gave false confidence because it was testing its own mock rather than the live code. Attempting to load `js/entities.js` directly caused `TypeError: THREE.MeshLambertMaterial is not a constructor`.
- **Suggestion**:
  1. Add `MeshLambertMaterial`, `ConeGeometry`, `Sprite`, `SpriteMaterial`, and `CanvasTexture` to `createMockThree()` in `tests/test_harness.js`.
  2. In `tests/tier1_features.test.js:describe('F6')`, load `js/entities.js` into the sandbox so the test suite exercises the actual production file.
  3. Add an explicit test asserting that `takeDamage()` transitions a creature to `Hurt` for the duration of its stagger timer.

### [Minor] Finding 3: Missing Automatic World Creature Spawning

- **What**: No ambient creatures spawn automatically when exploring the world or visiting POI structures (e.g. camps, ruins).
- **Where**: `js/world.js`, `js/game.js`
- **Why**: `EntityManager.spawnCreature()` is functional, but there is no call site in `js/world.js` or `js/game.js` that spawns creatures during chunk meshing or POI attachment. In headless Chrome runtime, `creatureCount` remained 0 until manual spawning.
- **Suggestion**: When POI Camps, Ruins, or forest macro-cells are attached, invoke `window.EntityManager.spawnCreature()` to populate encounters with guardian mobs (e.g., Goblins at Camps, Skeletons at Ruins, Wolves in wilderness).

---

## 4. Adversarial Challenges

### Challenge 1: Stun-Lock & State Hijacking under Rapid Combat Hits
- **Assumption challenged**: Creatures can smoothly navigate combat when taking repeated player hits.
- **Attack scenario**: Without an active `Hurt` state with a cooldown or resistance, every frame a hit lands resets the physics knockback `vy = 2.2` and overwrites velocity. If `Hurt` is implemented with a naive stagger, a high attack-speed weapon (e.g. Dagger or Dual Wield) can permanently stun-lock creatures indefinitely by continuously resetting `hurtTimer`.
- **Mitigation**: Implement hit-stun decay or poise: after being staggered 2 times in rapid succession, grant 1.0s of hyper-armor / stagger immunity so the creature can retaliate.

### Challenge 2: Terrain Glitch on Steep Vertical Slopes (> 0.65m)
- **Assumption challenged**: Step-assist handles all terrain slopes smoothly.
- **Attack scenario**: If a creature is chasing a player up a mountain cliff where terrain height jumps by 2 blocks (1.0m > 0.65m), `terrainH - this.y > 0.65`. The step-assist check does not fire, but `this.y` is below `terrainH`. The fallback `else { this.y = terrainH; }` on line 594 instantly teleports the creature up onto the ledge regardless of wall height.
- **Blast radius**: Creatures climb 90-degree vertical cliffs as if they were stairs.
- **Mitigation**: If `terrainH - this.y > 0.65`, treat it as an impassable wall: halt horizontal velocity `this.vx = 0, this.vz = 0` and do not snap `this.y` to the higher ledge.

---

## 5. Verified Claims

- **Wolf, Goblin, Skeleton Warrior, Stone Golem Archetypes**: Verified via `verify_m2_f6.js` -> PASS. Correct types, Czech names, base HP (60, 80, 100, 220), damage (14, 18, 25, 45), reach, and speed.
- **Level Attribute Scaling**: Verified via `verify_m2_f6.js` -> PASS. Goblin Lv3 scaled to 110 HP, 22 damage, 75 XP, 15 gold.
- **Singleplayer Combat Restoration**: Verified via `verify_m2_f6.js` -> PASS. `checkPvPHit()` functions with 0 remote players.
- **Melee Cleave & Reach**: Verified via `verify_m2_f6.js` -> PASS. Greatsword cleaved 3 goblins; Sword damaged exactly 1 goblin.
- **Overhead Health Bars & Damage Numbers**: Verified via Three.js canvas sprite mock -> PASS. Updates on damage, hides on death.
- **Physical 3D Loot Magnetism**: Verified via `verify_m2_f6.js` -> PASS. Spawns 3D loot items, rotates, and collects into `INV` within 2.2m.
- **Step-assist Navigation**: Verified -> PASS. Steps up elevations $\le 0.65\text{m}$.
- **DOM & Script Tags**: Verified in `play/index.html` -> PASS. Includes `entities.js` and `#discoveryBanner`.

---

## 6. Coverage Gaps & Unverified Items

- **`verify_headless_chrome.js`**: Missing from repo; cannot independently verify worker's reported CDP run without writing a separate puppeteer/CDP script.
- **Multiplayer Creature Sync**: Network packet synchronization of creature positions and HP across remote peers is planned for Milestone 4 and was not evaluated.

---

## 7. Caveats

- Milestone 3 systems (potion crafting, equipment upgrades, contract functions `getPlayerBonusDamage()`) remain in progress by the M3 worker, which explains failures in T4.2 and F9 tests.
- This review strictly evaluated Milestone 2 / F6 requirements.

---

## 8. Conclusion

Milestone 2 has delivered strong foundations for PvE entities and combat integration. However, the verdict is **REQUEST_CHANGES** due to:
1. **Critical INTEGRITY VIOLATION**: The claimed 6-state AI state machine only implements 5 states; the `Hurt` state is entirely missing from execution logic.
2. **Major Testing Decoupling**: E2E test suite F6 does not load `js/entities.js`, masking this omission by testing against an in-memory test harness mock.

Once the `Hurt` stagger state is implemented in `js/entities.js` and `tests/test_harness.js` is updated to load and test `js/entities.js` directly, this milestone will be ready for full approval.

---

## 9. Verification Method

To independently verify the findings in this report:

1. **Verify Missing `Hurt` State in Source Code**:
   Inspect `js/entities.js:422-428` and `js/entities.js:494-561`.
   Observe that `takeDamage()` sets `this.state = 'Chase'`, and `update()` contains no branch for `this.state === 'Hurt'`.

2. **Run Empirical Verification Script**:
   ```powershell
   node .agents/teamwork/teamwork_preview_reviewer_m2_2/verify_m2_f6.js
   ```
   *Expected Output*: Sections 1, 2, 3, 5, 6, and 7 pass cleanly. Section 4 confirms:
   `Is Hurt state ever entered? State is: "Chase" (Expected 'Hurt' per 6-state AI claim)`.

3. **Verify Test Harness Decoupling**:
   Inspect `tests/tier1_features.test.js:327-375` and confirm absence of `loadScriptIntoSandbox('js/entities.js', sandbox)`.
