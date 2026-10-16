# DISPATCH — 2026-10-16T22:56:00Z

## Assigned Subagent: teamwork_preview_worker_m3
Working directory: c:\Users\tomas\Desktop\WebHra\.agents\teamwork\teamwork_preview_worker_m3\
Project root: c:\Users\tomas\Desktop\WebHra

Read the original user request at:
c:\Users\tomas\Desktop\WebHra\.agents\teamwork\ORIGINAL_REQUEST.md

Read the project specification at:
c:\Users\tomas\Desktop\WebHra\.agents\teamwork\PROJECT.md

Read the 3 Explorer reports for Milestone 3:
- c:\Users\tomas\Desktop\WebHra\.agents\teamwork\teamwork_preview_explorer_m3_1\weapon_projectiles_report.md
- c:\Users\tomas\Desktop\WebHra\.agents\teamwork\teamwork_preview_explorer_m3_2\leveling_stats_report.md
- c:\Users\tomas\Desktop\WebHra\.agents\teamwork\teamwork_preview_explorer_m3_3\crafting_upgrades_report.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Scope & Write Boundaries:
You own edits to:
- `js/items.js` (potions, crafting materials, upgrade metadata)
- `js/inventory.js` (alchemy potion crafting, equipment upgrades +0 to +5, potion consumption, contract bonus functions)
- `js/player.js` (XP progression curve, addPlayerXP, checkPlayerLevelUp, stat scaling, projectile manager for bows & magic staffs, shield blocking)
- `js/storage.js` (GameStorage RPG stats persistence: savePlayerRPG, loadPlayerRPG)
- `play/index.html` (HUD level badge, XP bar, level-up toast/banner)
- `tests/test_harness.js` (ensure mocks support M3 contract functions & equipment)

Task: Implement Milestone 3 (RPG Progression, Leveling, Crafting & Equipment Upgrades - F7, F8, F9)
1. Weapon Arsenal, Active Projectiles & Shield Blocking (F7):
   - In `js/player.js`:
     - Implement `ProjectileManager`: `spawnProjectile(type, origin, direction, weaponInfo)`, `update(dt)`, collision detection against `EntityManager.creatures` and `remotePlayers`, terrain collision, and culling (max 3.0s or 90m).
     - Ranged Bows: when firing bow, launch 3D arrow with velocity 45 m/s and gravity trajectory (-9.81 m/s²). On impact, deal damage and apply knockback.
     - Magic Staffs: Fire staff launches flaming orb with PointLight (AoE splash + Burn DoT); Frost staff launches cyan crystal shard (Frost slow debuff -40% speed).
     - Shield: holding right click (secondary action) activates `P.isBlocking`, mitigating 70% damage, consuming stamina, deflecting incoming projectiles.
2. RPG Leveling Curve, Dynamic Stats & Persistence (F8):
   - In `js/player.js`:
     - Initialize `window.P.level = 1`, `window.P.xp = 0`, `window.P.xpNext = 100`.
     - Define `window.addPlayerXP(amount, source)`: adds XP, triggers floating XP text / HUD update, and invokes `checkPlayerLevelUp()`.
     - Define `window.checkPlayerLevelUp()`: while `P.xp >= P.xpNext`, increments `P.level`, recalculates `P.xpNext = Math.floor(100 * Math.pow(P.level, 1.5))`, scales stats:
       - Max HP: +10 per level (matching test suite base, e.g. Lv 2 = 110 HP)
       - Max Stamina: +5 per level
       - Base Attack Power: +2 per level
       - Crit Chance: +0.005 per level
       - Move Speed: +0.05 per level
       - Full heals player HP & Stamina upon level up.
       - Triggers level-up banner `#levelUpBanner` and plays audio chime.
       - Automatically calls `GameStorage.savePlayerRPG()`.
   - In `js/storage.js`:
     - Add `savePlayerRPG(data)` and `loadPlayerRPG()` saving/loading to `localStorage` under `voxel_rpg_player_${USER_ID}` and fallback `voxel_rpg_stats`.
     - Automatically load saved RPG progress on engine start.
   - In `play/index.html`:
     - Add HUD elements: `#hudLevelBadge` (displaying "Lv. 1"), `#xpBarFill` (width %), `#xpBarText` ("0 / 100 XP"), and `#levelUpBanner`.
3. Alchemy Crafting, Equipment Upgrades & Contract Bonus Functions (F9):
   - In `js/items.js`:
     - Define 4 potions: `potion_health`, `potion_stamina`, `potion_strength`, `potion_speed`.
     - Define 5 crafting resources: `flower_red`, `herb_green`, `flask_water`, `monster_core`, `crystal_blue`.
   - In `js/inventory.js`:
     - Implement alchemy crafting recipes for all 4 potions.
     - Implement equipment upgrade system: weapons & armor can be upgraded from `+0` to `+5` using materials and gold.
       - Weapons: +15% base damage (+4 damage per level on swords, e.g. 26 -> 30 -> 34 -> 38 -> 42 -> 46).
       - Armor / Shields: +10 Max HP and +5% defense per level.
     - Implement consumable consumption engine: drinking health restores 50 HP, stamina restores 50 stamina, strength adds +25% damage buff for 30s, speed adds +30% speed buff for 30s.
     - Expose the Mandatory Contract Functions on `window`:
       - `window.getPlayerBonusDamage()`: returns total integer bonus damage from equipped upgraded weapons.
       - `window.getPlayerBonusHP()`: returns total integer bonus max HP from equipped armor, shields, and upgrades.
       - `window.getPlayerBonusDefense()`: returns total integer bonus armor/defense rating from equipped gear.
       Ensure these functions check both `window.P.equipment` and `window.INV` defensively so they pass in both live browser and headless test harness environments.
4. Verification:
   - Check static syntax across all 19 JavaScript source files: `node --check js/*.js ServerSource/*.js`
   - Run opaque-box E2E tests: `node test_e2e_runner.js` (verify that F7, F8, F9, and related Tier 2/3/4 tests pass)
   - Verify headless Chrome loads `play/index.html` with zero console errors or uncaught exceptions.
   - Deliver handoff report to `c:\Users\tomas\Desktop\WebHra\.agents\teamwork\teamwork_preview_worker_m3\handoff.md`.

Send a message back to the orchestrator when completed.
