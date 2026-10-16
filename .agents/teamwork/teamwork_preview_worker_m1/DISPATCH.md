## 2026-10-16T19:06:36Z
You are teamwork_preview_worker_m1.
Your working directory is: c:\Users\tomas\Desktop\WebHra\.agents\teamwork\teamwork_preview_worker_m1\
The project root is: c:\Users\tomas\Desktop\WebHra

Read the original request at: c:\Users\tomas\Desktop\WebHra\.agents\teamwork\ORIGINAL_REQUEST.md
Read the project architecture and features at: c:\Users\tomas\Desktop\WebHra\.agents\teamwork\PROJECT.md
Read the stability survey report at: c:\Users\tomas\Desktop\WebHra\.agents\teamwork\teamwork_preview_explorer_survey_1\survey_stability_report.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Scope & Write Boundaries:
You own edits to:
- `js/player.js`
- `js/network.js` (block modification stubs)
- `ServerSource/server.js` (disable blockChange)
- `js/items.js` (re-label stone and wood)
- `play/index.html` (guest session fallback)

Task: Implement Milestone 1 (Core Bug Fixes, Stability & Removal of Block Building)
1. In `js/player.js`: remove the redundant extra closing brace `}` at line 559.
2. Run `node --check` across all files in `js/*.js` and `ServerSource/*.js` to verify zero syntax errors.
3. In `play/index.html` (lines 29-33): ensure safe fallback for guest sessions so direct navigation or headless browser runs do not crash or redirect if `voxel_auth_user` is not set in localStorage (e.g. default to demo guest `{ id: 999, nickname: 'Hráč_Guest', email: 'guest@voxel.cz' }`).
4. In `js/network.js`: disable block placement and destruction over the network. Stub out `modifyBlock`, `onRemoteBlockChange`, `applySingleBlock`, and `applyWorldDeltas` so they do not mutate chunk voxel arrays or rebuild chunk meshes.
5. In `ServerSource/server.js`: ignore `blockChange` packets so voxel terrain modification is completely removed.
6. In `js/items.js`: update `wood` and `stone` item descriptions to be crafting and upgrading resources ("Základní surovina pro vylepšování a výrobu") rather than building materials.
7. Run tests / headless verification to prove that:
   - Every `.js` file in `js/` and `ServerSource/` passes `node --check` with 0 errors.
   - Headless Chrome loads `play/index.html` with 0 errors, chunks mesh, and `ready === true`.
   - Left and right click handlers trigger combat / actions without placing or destroying blocks.
8. Document all commands, diffs, and verification output in `c:\Users\tomas\Desktop\WebHra\.agents\teamwork\teamwork_preview_worker_m1\handoff.md`.

Send a message back to the orchestrator when completed.
