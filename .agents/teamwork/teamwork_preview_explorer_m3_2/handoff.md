# Handoff Report — Technical Exploration for RPG Leveling Curve, Dynamic Stats & Persistence (F8)

**Subagent:** `teamwork_preview_explorer_m3_2`  
**Date:** 2026-10-16  
**Working Directory:** `c:\Users\tomas\Desktop\WebHra\.agents\teamwork\teamwork_preview_explorer_m3_2\`  
**Target Recipient:** Orchestrator (`24461840-fd70-4e09-bae3-4df27de3b558`) & Milestone 3 Implementation Worker  

---

## 1. Observation

1. **`js/player.js`**:
   - Lines 41-45: `const P = { x: SPX, y: SPY, z: SPZ, vx: 0, vy: 0, vz: 0, ground: false, moveX: 0, moveZ: 0 };`
   - `P` is declared locally and never attached to `window.P`.
   - Lines 449-457: `const bonusSpd = (typeof getPlayerBonusSpeed === 'function') ? getPlayerBonusSpeed() : 0;` expects `getPlayerBonusSpeed()` which is not defined.
   - Syntax validation passes cleanly (`node --check js/player.js` returns exit code 0).
2. **`js/storage.js`**:
   - Defines `GameStorage` object with world and server management (`getWorlds`, `saveWorlds`, `createWorld`, `getWorld`, `updateWorldData`, `getActiveGame`, etc.).
   - `GameStorage.getUser` is absent: in `tests/tier1_features.test.js:102`, test failure occurs: `Error: sandbox.GameStorage.getUser is not a function`.
   - No user-scoped RPG progression persistence exists yet.
3. **`play/index.html` & `css/style.css`**:
   - `play/index.html:48-100` defines `#bars` with `.b.hp`, `.b.st`, and `.b.o2`. No Level badge or XP progress bar exists in `#bars`.
   - `play/index.html:105-110` defines `#discoveryBanner` with `.db-title` and `.db-xp`. No `#levelUpBanner` exists yet.
   - `css/style.css:66-138` styles `#bars`, `.b`, `.b-ico`, `.b-track`, and gradients.
4. **Existing XP Hooks in `js/entities.js` and `js/world.js`**:
   - `js/entities.js:446-454` invokes `window.addPlayerXP(this.loot.xp, this.name);` and fallback `window.checkPlayerLevelUp();`.
   - `js/world.js:977-984` invokes `window.addPlayerXP(xp, 'discovery');` and fallback `window.checkPlayerLevelUp();`.
   - `js/world.js:1293-1298` invokes `window.addPlayerXP(80, poi.displayName);` and fallback `window.checkPlayerLevelUp();`.
   - Neither `window.addPlayerXP` nor `window.checkPlayerLevelUp` is currently defined on `window` in runtime scripts.
5. **XP Values in Code vs. Dispatch**:
   - `js/entities.js:6-92` defines `CREATURE_CONFIGS` with:
     - Wolf: `xpBase: 25` (Dispatch specifies: 35 XP)
     - Goblin: `xpBase: 25` (Dispatch specifies: 45 XP)
     - Skeleton: `xpBase: 50` (Dispatch specifies: 60 XP)
     - Golem: `xpBase: 150` (Dispatch specifies: 150 XP)
   - `js/world.js:928` sets `poi.xpReward = 50` (matches 50 XP in dispatch).
   - `js/world.js:1294` sets `window.addPlayerXP(80, poi.displayName)` (Dispatch specifies 25 XP).
6. **Critical Test Suite Assertion Discrepancy on Stat Growth**:
   - Dispatch requests: "Max HP: +15 per level".
   - `tests/tier1_features.test.js:540-545`:
     ```javascript
     const initialHp = sandbox.P.baseStats.maxHp;
     sandbox.addPlayerXP(100, 'combat');
     assertEqual(sandbox.P.level, 2, 'Level should be 2');
     assertEqual(sandbox.P.baseStats.maxHp, initialHp + 10, 'Max HP should increase by +10');
     ```
   - `tests/tier4_scenarios.test.js:57`: `assertEqual(sandbox.P.baseStats.maxHp, 110, 'Max HP scaled to 110');`
   - `tests/test_harness.js:514`: `sandbox.P.baseStats.maxHp += 10;`
   - Hardcoding $+15$ HP breaks existing test suites `tier1_features.test.js` (`F8.4`) and `tier4_scenarios.test.js` (`T4.1`).

---

## 2. Logic Chain

1. From Observation 1, because `P` is not bound to `window.P`, external subsystems (`EntityManager`, `POIManager`, network sync, contract functions) cannot inspect or mutate the player's level, XP, or baseStats.
2. From Observation 4, `js/entities.js` and `js/world.js` already contain calls to `window.addPlayerXP` and `window.checkPlayerLevelUp`. Therefore, defining these two functions on `window` and attaching `window.P = P` instantly connects combat kills, POI discoveries, and chest openings to the leveling system without requiring architectural rewrites in those modules.
3. From Observation 2, `GameStorage` in `js/storage.js` manages world saves but lacks `getUser()`, which causes test failure in `tier1_features.test.js` (F2.2). Adding `getUser()` with fallback `{ id: 999, nickname: 'Hráč_Guest', email: 'guest@voxel.cz' }` resolves the F2.2 test failure and provides the required `USER_ID` for `voxel_rpg_player_${USER_ID}`.
4. From Observation 5 and 6, dispatch requests $+15$ Max HP per level, but automated tests enforce $+10$ Max HP per level (`100 -> 110`). The reconciliatory logic is to implement default base growth of $+10$ Max HP per level, while allowing `window.RPG_STAT_GROWTH = { maxHp: 15, ... }` override. This ensures 100% pass rate in regression tests while allowing the requested $+15$ HP scaling.
5. From Observation 3, adding `#hudLevelBadge`, `#xpBarFill`, `#xpBarText`, and `#levelUpBanner` to `play/index.html` with corresponding styles in `css/style.css` provides the complete visual feedback loop.
6. From Observation 1 and 3, updating `ui()` in `js/config.js` to compute `G.hp / P.maxHp` and `G.st / P.maxStamina` avoids visual overflow bugs when stats exceed 100.

---

## 3. Caveats

1. **Test Suite Stat Assertion**: The test suite in `tests/tier1_features.test.js:544` and `tests/tier4_scenarios.test.js:57` hardcodes expectation of `+10` Max HP per level. If the team explicitly decides that `+15` is preferred over `+10`, the test assertions in those two test files must be updated simultaneously; otherwise the recommended default of `+10` (with configurable `+15` via `window.RPG_STAT_GROWTH`) should be used.
2. **Read-Only Explorer Scope**: In accordance with the system prompt, no modifications to game source code or tests were made by this subagent. All changes are documented in `leveling_stats_report.md` for execution by the Milestone 3 implementation worker.
3. **Multiplayer State Broadcast**: When level up occurs, `sendPlayerTransform()` should broadcast the new `level`, `hp`, and `maxHp` to remote peers. Remote nametag level badge rendering belongs to Milestone 4 (F12).

---

## 4. Conclusion

The architectural investigation for Feature F8 is complete. The progression curve formula $\text{xpNext}(L) = \lfloor 100 \cdot L^{1.5} \rfloor$, stat growth matrix, XP sources, HUD elements, audio fanfare, particle fountain, and user-scoped `GameStorage` persistence scheme (`voxel_rpg_player_${USER_ID}` with dual-write to `voxel_rpg_stats`) are fully designed and documented in:
`c:\Users\tomas\Desktop\WebHra\.agents\teamwork\teamwork_preview_explorer_m3_2\leveling_stats_report.md`

All integration points with existing modules (`js/player.js`, `js/storage.js`, `js/config.js`, `js/audio.js`, `js/entities.js`, `js/world.js`, `play/index.html`, and `css/style.css`) are mapped out with concrete code snippets ready for drop-in implementation.

---

## 5. Verification Method

1. **Verify Static Syntax of All Target Files**:
   ```powershell
   node --check js/player.js
   node --check js/storage.js
   node --check js/config.js
   node --check js/audio.js
   node --check js/entities.js
   node --check js/world.js
   ```
   *Expected result*: Exit code 0 on all files.

2. **Verify Automated F8 Test Scenarios**:
   ```powershell
   node tests/run_e2e.js
   ```
   *Expected result*: All F8 tests pass:
   - `F8.1: XP curve matches mathematical formula floor(100 * L^1.5)`
   - `F8.2: addPlayerXP accumulates XP towards xpNext`
   - `F8.3: Level up increments level, resets current XP, and updates next threshold`
   - `F8.4: Level-up scales base attributes (Max HP, Stamina, Attack Power)`
   - `F8.5: Level-up restores current HP to full Max HP`
   - Category 1 boundary tests in `tier2_boundaries.test.js` (`T2.1.1` to `T2.1.5`)
   - Cross-feature tests in `tier3_cross_features.test.js` (`T3.2.1` to `T3.2.4`)
   - Scenario 1 in `tier4_scenarios.test.js` (`T4.1`)

3. **Verify Persistence & Storage Keys**:
   Inspect `localStorage` in browser or test harness:
   ```javascript
   // Check primary user-scoped key
   const userState = JSON.parse(localStorage.getItem('voxel_rpg_player_999'));
   console.assert(userState && userState.level >= 1, 'User-scoped RPG key must exist');

   // Check backwards compatibility key
   const compatState = JSON.parse(localStorage.getItem('voxel_rpg_stats'));
   console.assert(compatState && compatState.level >= 1, 'Compatibility RPG key must exist');
   ```

4. **Invalidation Conditions**:
   - If `calculateXpNext(1)` does not equal 100 or `calculateXpNext(2)` does not equal 282.
   - If negative XP causes player level or XP to drop below 0.
   - If `addPlayerXP` does not heal HP to full on level up.
   - If `GameStorage.getUser()` throws or returns undefined.
