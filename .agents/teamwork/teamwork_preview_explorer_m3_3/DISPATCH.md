# DISPATCH — 2026-10-16T22:46:00Z

## Assigned Subagent: teamwork_preview_explorer_m3_3
Working directory: c:\Users\tomas\Desktop\WebHra\.agents\teamwork\teamwork_preview_explorer_m3_3\
Project root: c:\Users\tomas\Desktop\WebHra

Read the original user request at:
c:\Users\tomas\Desktop\WebHra\.agents\teamwork\ORIGINAL_REQUEST.md

Read the project specification at:
c:\Users\tomas\Desktop\WebHra\.agents\teamwork\PROJECT.md

Read the RPG survey report at:
c:\Users\tomas\Desktop\WebHra\.agents\teamwork\teamwork_preview_spec_miner_survey_1\survey_rpg_report.md

Task: Technical Exploration for Alchemy Crafting, Equipment Upgrades & Contract Bonus Functions (F9)
1. Investigate `js/inventory.js`, `js/items.js`, and `play/index.html`.
2. Formulate the implementation plan for Alchemy Potion Crafting:
   - Recipes for 4 core potions:
     - Healing Potion (`potion_health`): Red flowers + water flask $\to$ restores 50 HP.
     - Stamina Potion (`potion_stamina`): Green herbs + water flask $\to$ restores 50 Stamina.
     - Strength Elixir (`potion_strength`): Monster core + gold $\to$ $+25\%$ damage buff for 30s.
     - Swiftness Tonic (`potion_speed`): Blue crystals + water flask $\to$ $+30\%$ speed buff for 30s.
   - Potion consumption mechanics in `inventory.js` / hotbar usage.
3. Formulate the implementation plan for Equipment Upgrades:
   - Weapons & armor can be upgraded from `+0` up to `+5`.
   - Upgrade costs: Wood, stone, monster materials, and gold.
   - Upgrade bonuses:
     - Weapons: $+15\%$ base damage per upgrade level.
     - Armor / Shields: $+10$ Max HP and $+5$ Defense per upgrade level.
   - Name and tooltip formatting (e.g., `Železný meč +3`).
4. Implement Contract Bonus Functions exposed on `window`:
   - `window.getPlayerBonusDamage()`: Computes total bonus damage from equipped upgraded weapons.
   - `window.getPlayerBonusHP()`: Computes total bonus HP from equipped armor, shields, and upgrades.
   - `window.getPlayerBonusDefense()`: Computes total defense/armor rating from equipped gear.
5. Document the architectural blueprint, data structures, and recommended fix strategy in:
   `c:\Users\tomas\Desktop\WebHra\.agents\teamwork\teamwork_preview_explorer_m3_3\crafting_upgrades_report.md`
   And write handoff to:
   `c:\Users\tomas\Desktop\WebHra\.agents\teamwork\teamwork_preview_explorer_m3_3\handoff.md`

Send a message back to the orchestrator when completed.
