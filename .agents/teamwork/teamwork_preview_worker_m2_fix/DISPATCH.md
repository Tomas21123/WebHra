# DISPATCH — 2026-10-16T22:25:00Z

## Assigned Subagent: teamwork_preview_worker_m2_fix
Working directory: c:\Users\tomas\Desktop\WebHra\.agents\teamwork\teamwork_preview_worker_m2_fix\
Project root: c:\Users\tomas\Desktop\WebHra

Read the original user request at:
c:\Users\tomas\Desktop\WebHra\.agents\teamwork\ORIGINAL_REQUEST.md

Read the project specification at:
c:\Users\tomas\Desktop\WebHra\.agents\teamwork\PROJECT.md

Read the Reviewer 2 feedback that requested changes at:
c:\Users\tomas\Desktop\WebHra\.agents\teamwork\teamwork_preview_reviewer_m2_2\handoff.md

Read the Forensic Auditor's report at:
c:\Users\tomas\Desktop\WebHra\.agents\teamwork\teamwork_preview_auditor_m2\handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Scope & Write Boundaries:
You own:
- `js/entities.js`
- `tests/test_harness.js`
- `tests/tier1_features.test.js`
- `js/world.js` / `js/game.js`

Task: Milestone 2 Iteration 2 Remediation (Implement Hurt Stagger State, Test Harness Mocks & Guardian Spawns)
1. In `js/entities.js`:
   - In `CreatureInstance` constructor: add `this.hurtTimer = 0;`.
   - In `takeDamage(damage, knockback, isCrit, attacker)`: when `this.hp > 0`, set `this.state = 'Hurt'` and `this.hurtTimer = 0.35` (stagger duration).
   - In `update(dt)`: before distance-based state updates, check:
     ```javascript
     if (this.state === 'Hurt') {
       this.hurtTimer -= dt;
       if (this.hurtTimer <= 0) {
         this.state = (dist <= this.attackReach) ? 'Attack' : 'Chase';
       }
       return; // Creature reels/staggers, freezing movement and attacks during hurtTimer
     }
     ```
   - Guard distance checks in `update()` so they do not overwrite `this.state === 'Hurt'` while `this.hurtTimer > 0`.
   - In step-assist terrain navigation: if `terrainH - this.y > 0.65`, treat it as an impassable wall (halt horizontal velocity `this.vx = 0, this.vz = 0` and do not snap `this.y = terrainH` to climb vertical cliffs).
2. In `tests/test_harness.js`:
   - In `createMockThree()`: ensure `MeshLambertMaterial`, `ConeGeometry`, `Sprite`, `SpriteMaterial`, and `CanvasTexture` are available constructors so `js/entities.js` can load cleanly without error in Node.
3. In `tests/tier1_features.test.js:describe('F6')`:
   - Ensure `loadScriptIntoSandbox('js/entities.js', sandbox)` is called so the test suite exercises the actual production file.
   - Add tests verifying that `takeDamage()` transitions creature to `Hurt` state for `hurtTimer = 0.35s`, and that lethal damage transitions to `Dead`.
4. In `js/world.js` / `js/game.js`:
   - Ensure guardian creatures spawn at Camps (Goblins) and Ruins (Skeletons) on attachment, or ambient wolves in wilderness, populating the world with live encounters.
5. Verification:
   - Check syntax across all 19 JavaScript files: `node --check js/*.js ServerSource/*.js`
   - Run tests: `node test_e2e_runner.js`
   - Run reviewer verification script: `node .agents/teamwork/teamwork_preview_reviewer_m2_2/verify_m2_f6.js`
   - Document all changes and verification outputs in `c:\Users\tomas\Desktop\WebHra\.agents\teamwork\teamwork_preview_worker_m2_fix\handoff.md`.
