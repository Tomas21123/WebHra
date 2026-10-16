# Execution Plan: Cube World Voxel Action-RPG & Exploration Transformation

## Phase 0: Survey & Scope Mapping (Current)
- Spawn 3 parallel survey agents:
  1. `survey_stability_explorer` (teamwork_preview_explorer): Investigate syntax errors (e.g. `js/player.js` line 559), all `.js` files, HTML scripts in `index.html` & `play/index.html`, physics/water/swimming/camera bugs, and all block building / destruction code to disable.
  2. `survey_rpg_spec_miner` (teamwork_preview_spec_miner): Map RPG progression, inventory, stats, weapons, magic, crafting recipes, upgrades, and world POI generation/encounters requirements.
  3. `survey_multiplayer_explorer` (teamwork_preview_explorer): Inspect PeerJS P2P and WebSocket `ServerSource/server.js`, synchronization of RPG stats, animations, hits, party management vs old block building controls.
- Merge survey findings into `PROJECT.md § Feature Inventory` and `TEST_INFRA.md`.

## Phase 1: Architecture & Decomposition (Dual Track)
- Create `PROJECT.md` with:
  - Architecture & module boundaries
  - Complete Feature Inventory mapped to milestones
  - Code layout & interface contracts
- Launch E2E Testing Track Orchestrator / Test Writer.

## Phase 2: Implementation Track Milestones
- **Milestone 1 (M1)**: Core Bug Fixes, Stability & Removal of Block Building (R1)
- **Milestone 2 (M2)**: Cube World Exploration, Encounters & World Discovery (R2)
- **Milestone 3 (M3)**: RPG Progression, Leveling, Crafting & Upgrading (R3)
- **Milestone 4 (M4)**: Polished P2P & WebSocket Server Multiplayer (R4)
- **Milestone 5 (M5)**: E2E Test Suite Pass (Tiers 1-4) & Adversarial Hardening (Tier 5)

## Verification Gates
Each milestone follows:
- Explorer analysis & recommendations
- Worker implementation + unit tests
- 2x Reviewers (APPROVE required)
- 2x Challengers (Empirical verification)
- Forensic Auditor (teamwork_preview_auditor - CLEAN required, zero tolerance on integrity violations)
