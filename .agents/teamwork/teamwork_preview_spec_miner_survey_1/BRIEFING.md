# BRIEFING — 2026-10-16T18:54:50Z

## Mission
Comprehensive Specification & Code Analysis for Cube World Exploration, Encounters, RPG Progression & Crafting (R2, R3). Discover and document all features, interfaces, math curves, data structures, and edge cases.

## 🔒 My Identity
- Archetype: SPECIFICATION MINER
- Roles: Specification Mining, Code Analysis, Systems Architecture Survey
- Working directory: c:\Users\tomas\Desktop\WebHra\.agents\teamwork\teamwork_preview_spec_miner_survey_1
- Original parent: 24461840-fd70-4e09-bae3-4df27de3b558
- Milestone: M1 / Survey & Specification Phase

## 🔒 Key Constraints
- Read-only on project implementation code (do not implement features or modify game code in `js/`).
- Only write metadata, reports, and handoffs in working directory `c:\Users\tomas\Desktop\WebHra\.agents\teamwork\teamwork_preview_spec_miner_survey_1\`.
- Output comprehensive specification report to `survey_rpg_report.md` and handoff to `handoff.md`.
- Prioritize authoritative sources in existing codebase and user request.

## Current Parent
- Conversation ID: 24461840-fd70-4e09-bae3-4df27de3b558
- Updated: 2026-10-16T18:54:50Z

## Task Summary
- **What to analyze**: Existing RPG, combat, inventory, items, player, world generation, rendering, minimap, storage code.
- **What was specced**:
  1. Points of Interest (shrines, ruins, camps, loot chests, landmarks) generation, 3D rendering, minimap markers, interaction, loot/XP rewards.
  2. Combat & Creatures/Enemies system: creature types, AI/movement, hitboxes, weapon types (melee swords/axes/daggers/spears/maces, ranged bows, magic fire/frost staffs, shields), projectiles, slashes, cooldowns, stats.
  3. RPG Progression system: XP gain, level-up curve, stat formulas (HP, Stamina, Attack Power, Crit, Speed), HUD level/XP bar, persistence via GameStorage.
  4. Crafting & Equipment Upgrading system: crafting consumables (potions), upgrading weapons/shields/staffs/bows/armor with materials/gold, stat bonus integration (`getPlayerBonusDamage()`, `getPlayerBonusHP()`, `getPlayerBonusDefense()`, tooltips).
- **Deliverables**: `survey_rpg_report.md`, `handoff.md`.

## Key Decisions Made
- All features specced with exact mathematical formulas, data structures, and integration points.
- Analyzed and documented the syntax error in `js/player.js:559`.
- Full 5-component hard handoff created.

## Artifact Index
- `DISPATCH.md` — Dispatch prompt and assignment
- `BRIEFING.md` — Persistent identity and context
- `progress.md` — Liveness and step tracking
- `survey_rpg_report.md` — Comprehensive analysis and feature specification report (Features Discovered & Edge Cases tables included)
- `handoff.md` — 5-component hard handoff report
