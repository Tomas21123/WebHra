## 2026-10-16T19:06:36Z
You are teamwork_preview_test_writer_e2e.
Your working directory is: c:\Users\tomas\Desktop\WebHra\.agents\teamwork\teamwork_preview_test_writer_e2e\
The project root is: c:\Users\tomas\Desktop\WebHra

Read the original request at: c:\Users\tomas\Desktop\WebHra\.agents\teamwork\ORIGINAL_REQUEST.md
Read the project architecture and features at: c:\Users\tomas\Desktop\WebHra\.agents\teamwork\PROJECT.md

Task: Architect and write the comprehensive Opaque-Box E2E Test Suite (Tiers 1-4)
Your work establishes the E2E Testing Track for this project.
Follow the E2E Testing Track Principles and 4-Tier Methodology:
- **Tier 1 - Feature Coverage (>=5 per feature)**: Unit / functional verification of each feature (syntax integrity, headless load, block removal, POI generation, minimap markers, creature AI, weapon mechanics, leveling curve, crafting/upgrades, multiplayer server, P2P handshake, party UI).
- **Tier 2 - Boundary & Corner Cases (>=5 per feature)**: Level thresholds, zero/negative stats, maximum upgrades (+5 limit), empty inventory, disconnect/reconnect, edge coordinate navigation.
- **Tier 3 - Cross-Feature Combinations (Pairwise)**: Leveling + combat stat application (`getPlayerBonusDamage`), exploration + discovery XP + level-up, crafting potions + hotbar usage, multiplayer combat hits + HP sync.
- **Tier 4 - Real-World Application Scenarios (>=5 scenarios)**: Full player lifecycle scenarios:
  1. New player spawn -> explore world -> discover landmark -> earn XP -> level up.
  2. Combat encounter -> slay goblin -> collect materials & gold -> craft healing potion.
  3. Equipment upgrade -> upgrade sword to +1 and +2 -> verify `getPlayerBonusDamage()` increases.
  4. Multiplayer P2P host & guest connection -> approval -> spawn next to host -> party teleport.
  5. Dedicated WebSocket server multiplayer session -> connect -> sync positions & chat -> disconnect.

Requirements:
1. Create a single runner script (e.g. `node test_e2e_runner.js` or `npm test` script in project root/tests) that runs all test tiers and exits with code 0 on pass or code 1 on fail.
2. Create `c:\Users\tomas\Desktop\WebHra\.agents\teamwork\TEST_INFRA.md` describing test architecture, test cases, and invocation.
3. Once the test suite files and runner are created and ready to be run against current and future milestones, create `c:\Users\tomas\Desktop\WebHra\.agents\teamwork\TEST_READY.md`.
4. Deliver your handoff report to `c:\Users\tomas\Desktop\WebHra\.agents\teamwork\teamwork_preview_test_writer_e2e\handoff.md`.

Send a message back to the orchestrator when complete.
