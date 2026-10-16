# Original User Request

## Initial Request — 2026-10-16T18:41:24Z

Fix all syntax, runtime, UI, and multiplayer bugs in the existing 3D voxel web game ("Voxelový svět"), and transform/expand it into a polished **Cube World-style 3D Voxel Action-RPG & Exploration game** where players explore a rich procedural world, gain XP and levels, upgrade/craft equipment and potions, and play together via P2P or dedicated WebSocket server — **without block building or terrain destruction**.

Working directory: c:\Users\tomas\Desktop\WebHra
Integrity mode: development

## Requirements

### R1. Core Bug Fixes, Stability & Removal of Block Building (Cube World Direction)
Fix the syntax error in `js/player.js` (unexpected closing brace at line 559) and resolve all runtime, physics, swimming/water-exit, camera, UI modal, and script initialization bugs across `index.html`, `play/index.html`, `js/*.js`, and `ServerSource/server.js`. Remove or disable block placement and block breaking/mining mechanics (and remove obsolete block-building permission toggles/hotbar building blocks) so the game is purely a Cube World-style exploration and action-RPG experience where players walk, swim, dodge-roll, fight, and explore the world without modifying voxel terrain.

### R2. Cube World-Style Exploration, Encounters & World Discovery
Make exploring the procedural voxel world engaging and rewarding like Cube World: populate the world with discoverable points of interest (e.g., shrines, ruins, camps, or lootable chests/landmarks visible in the world and on the 3D minimap) and interactive creatures/enemies or targets to fight. Exploring new regions, discovering landmarks, and defeating enemies or opening chests should reward the player with XP, gold/materials, and loot.

### R3. RPG Progression, Leveling, Crafting & Equipment Upgrading
Implement a complete RPG progression system integrated with the existing inventory, character stats, and HUD:
- **XP & Leveling**: Players earn XP from exploration, discoveries, and combat; leveling up increases base stats (Max HP, Max Stamina, Attack Power, Crit, Speed) with clear visual/audio feedback in the HUD.
- **Crafting & Equipment Upgrading**: Allow players to use collected materials/essences/gold in the inventory UI to craft consumables (healing/stamina/buff potions) and upgrade weapons, shields, staffs, bows, and armor (increasing rarity/stats/level).
- **Combat & Consumables**: Ensure all weapon types (melee swords/axes/daggers/spears/maces, ranged bows, magic fire/frost staffs, shields) and potions have working active mechanics, hit detection, visual projectile/slash effects, cooldowns, and stat application.

### R4. Polished P2P & WebSocket Server Multiplayer
Ensure both PeerJS (P2P host/client with join approval popup and waiting screen) and `ServerSource/server.js` (WebSocket server) work reliably. Synchronize player positions, swimming/rolling/attack/emote animations, equipped 3D weapons/armor/appearance, RPG level/HP badges, combat hits/projectiles, and chat. Update the P2P/server management UI to focus on party/session management (approving/rejecting joins, kicking players, viewing player levels/stats, teleporting to party members) rather than block-building permissions.

## Acceptance Criteria

### Static & Syntax Verification
- [ ] Every `.js` file in `js/` and `ServerSource/` passes `node --check` with zero syntax errors.
- [ ] All script tags in `index.html` and `play/index.html` reference existing files and consistent global symbols without undefined reference errors.

### Runtime & Gameplay Verification
- [ ] Loading `index.html` and `play/index.html` in a headless browser (or automated test harness) produces zero uncaught exceptions or `console.error` messages, and the game loop reaches `ready = true` with chunks meshed and rendered.
- [ ] Block building and terrain block destruction are completely disabled: left/right mouse clicks perform combat attacks, ranged/magic casts, shield blocking, or item usage rather than placing or breaking voxel blocks, and no placeable terrain block items clutter the inventory.
- [ ] RPG progression works end-to-end: gaining XP triggers level-ups at threshold, updates HUD level/XP bars and character stats, and persists via `GameStorage` (`localStorage`).
- [ ] Crafting and equipment upgrading work end-to-end: players can craft potions and upgrade weapons/equipment using resources, with updated stats reflected in `getPlayerBonusDamage()`, `getPlayerBonusHP()`, `getPlayerBonusDefense()`, and tooltips.
- [ ] World exploration features discoverable points of interest / encounters that grant XP/loot/materials and integrate cleanly with the HUD and 3D minimap.

### Multiplayer & Persistence Verification
- [ ] Automated test or simulation verifies `ServerSource/server.js` starts cleanly and handles client connections, player state broadcasts (including RPG level, HP, animations, and combat events), and chat messages without crashing.
- [ ] P2P host approval flow (`approveP2PJoin`), player spawning next to host, remote player rig rendering, and party management UI work without errors and without obsolete block-building permission controls.
