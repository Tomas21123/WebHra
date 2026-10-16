# Codebase Survey & Stability Report: Core Bug Fixes, Runtime Mechanics & Block-Building Removal (R1)

**Date**: 2026-10-16  
**Investigator**: `teamwork_preview_explorer_survey_1`  
**Target Milestone**: R1 (Core Bug Fixes, Stability & Removal of Block Building)  
**Project Root**: `c:\Users\tomas\Desktop\WebHra`

---

## 1. Executive Summary

This survey provides a comprehensive audit of all JavaScript, HTML, and server components of "Voxelový svět" to establish rock-solid stability and clear architectural guidance for transitioning the game into a polished **Cube World-style 3D Voxel Action-RPG & Exploration game**.

Key findings:
1. **Critical Syntax Error Identified & Isolated**: `js/player.js` line 559 contains an unexpected extra closing brace `}`. This causes `node --check js/player.js` to fail with `SyntaxError: Unexpected token '}'`. In the browser, this halts script execution, preventing `initPlayerControls`, `P`, `physics`, and related symbols from being defined, triggering fatal cascading `ReferenceError` exceptions in `js/game.js` and freezing the loading screen.
2. **All Other JavaScript Files Parse Cleanly**: Every other file in `js/` (17 files), `ServerSource/server.js`, and all inline scripts in `index.html` and `play/index.html` pass syntax checks with zero errors.
3. **Headless Chrome Runtime Verified**: We built a native Headless Chrome test runner over Chrome DevTools Protocol (CDP). Removing the redundant brace in `js/player.js` enabled `play/index.html` to boot cleanly with **0 errors**, **0 exceptions**, pump all 49 initial chunks, and set `ready = true`.
4. **All Block-Building & Terrain-Modification Code Cataloged**: Raycast voxel destruction/placement is already absent from player controls (clicks trigger weapon attacks, potions, and shield blocking). However, legacy network synchronization, server delta storage, UI permission toggles, and inventory items still contain vestigial block-building code that must be disabled or repurposed for party management and RPG crafting.

---

## 2. Syntax & Static File Audit

### 2.1 File-by-File Syntax Check (`node --check`)

| File Path | Status | Details / Line Number |
|---|---|---|
| `js/player.js` | ❌ **SYNTAX ERROR** | **Line 559**: `SyntaxError: Unexpected token '}'`. Redundant closing brace after `function physics(dt)` closing brace at line 558. |
| `js/audio.js` | ✅ OK | Clean syntax; Web Audio API synthesizers for attacks, blocks, rolls. |
| `js/character.js` | ✅ OK | Clean syntax; 3D character rig, equipment mesh attachments, universal animator. |
| `js/chat.js` | ✅ OK | Clean syntax; chat box, autocomplete suggestions, in-game commands (`/tp`, `/heal`, etc.). |
| `js/config.js` | ✅ OK | Clean syntax; constants (`S=1`, `CS=16`, `RD=7`, `SEA=48`), player vitals (`G`), `ui()`, `hurt()`. |
| `js/cursor.js` | ✅ OK | Clean syntax; context-menu prevention, canvas particle FX following cursor. |
| `js/customizer.js` | ✅ OK | Clean syntax; character customization UI, palette swatches, 3D preview canvas. |
| `js/emotes.js` | ✅ OK | Clean syntax; emote wheel modal, dance, wave, point, sit emotes. |
| `js/game.js` | ✅ OK | Clean syntax; Three.js scene, camera, game loop, chunk pump, HUD updates. |
| `js/inventory.js` | ✅ OK | Clean syntax; hotbar, equipment slots, crafting workbench (`CRAFTING_RECIPES`). |
| `js/items.js` | ✅ OK | Clean syntax; item database `INV`, 3D voxel weapon geometries `W3`, icons. |
| `js/minimap.js` | ✅ OK | Clean syntax; 3D Cube World diorama minimap, Fog of War, chunk exploration memory. |
| `js/network.js` | ✅ OK | Clean syntax; PeerJS P2P networking, WebSocket server client, player state sync. |
| `js/peerjs.min.js` | ✅ OK | Clean syntax; PeerJS v1.5.4 bundled library. |
| `js/storage.js` | ✅ OK | Clean syntax; `GameStorage` localStorage manager for worlds, servers, active game. |
| `js/textures.js` | ✅ OK | Clean syntax; procedural texture atlas (8x8 tiles, 128x128 px), block definition tiles. |
| `js/voxelBuilder.js` | ✅ OK | Clean syntax; Three.js voxel geometry generator (`buildVoxGeometry`). |
| `js/world.js` | ✅ OK | Clean syntax; procedural world generator, biome calculation, chunk meshing, `manage()`, `pump()`. |
| `ServerSource/server.js` | ✅ OK | Clean syntax; Node.js WebSocket dedicated multiplayer server. |

### 2.2 Deep Dive: `js/player.js` Syntax Error (Line 559)

In `js/player.js`:
```javascript
554: 
555:   if (P.y < -20) {
556:     P.x = SPX; P.z = SPZ; P.y = SPY; P.vy = 0;
557:   }
558: }
559: }
560: 
```
- Line 305 begins `function physics(dt) {`.
- Line 558 closes `function physics(dt) {` with `}`.
- Line 559 contains a duplicate dangling `}` with no matching opening brace.
- **Fix**: Remove line 559.
- **Verification**: Verified via `node -e "new Function(codeWithoutLastBrace)"` — parses with zero errors.

---

## 3. HTML Pages, Script Tags & Load Order

### 3.1 `index.html` (Main Menu)
- **Role**: Main menu, authentication modal (login / registration / demo guest), world creation/selection, multiplayer server list, settings, audio toggles.
- **Script Tags**:
  1. Line 8: Inline URL path cleaner (`window.history.replaceState`).
  2. Line 1521: `<script src="js/storage.js?v=4"></script>`
  3. Line 1523: `<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>`
  4. Line 1525: Inline script (~1000 lines) handling 3D voxel background scene, Web Audio sound effects, auth requests to `api.php`, and world launch.
  5. Line 2542: `<script src="js/cursor.js"></script>`
- **Audit Findings**:
  - All script tags reference valid local files or CDN URLs.
  - Loads with **0 errors and 0 exceptions** in headless Chrome.
  - Game launch function `launchGame(gameConfig)` writes to `GameStorage.setActiveGame(gameConfig)` and redirects to `play/`.

### 3.2 `play/index.html` (In-Game Runtime)
- **Role**: Core 3D game canvas, HUD, pause ESC menu, inventory/crafting modal, 3D minimap, P2P & multiplayer management.
- **Script Tags**:
  1. Line 17: Inline root URL calculation and auth check:
     ```javascript
     try {
       if (!localStorage.getItem('voxel_auth_user')) {
         window.location.replace(getRootUrl());
       }
     } catch (e) { }
     ```
     *Note*: If `voxel_auth_user` is absent (e.g. direct URL visit or automated test), it redirects to `../index.html`. A graceful fallback or guest auto-population prevents unexpected redirects during test runs.
  2. Line 747: Inline P2P waiting screen updater (displays `Čekám na schválení hostitelem…` if mode is `p2p_client`).
  3. Lines 779–799: Sequential script includes:
     - `three.min.js` (Three.js r128 3D engine)
     - `../js/storage.js` (`GameStorage`)
     - `../js/config.js` (Constants, `G`, `ui()`, `hurt()`)
     - `../js/textures.js` (Atlas canvas, `TILES`)
     - `../js/world.js` (Chunk generation, meshing, `manage()`, `pump()`)
     - `../js/voxelBuilder.js` (`buildVoxGeometry`, `createSingleVoxMesh`)
     - `../js/items.js` (`INV`, `W3`, `applyHeld`)
     - `../js/character.js` (`createCharacterRig`, `playerRig`, `model`)
     - `../js/inventory.js` (Hotbar, equipment, crafting workbench)
     - `../js/customizer.js` (Character customization modal, preview rig)
     - `../js/audio.js` (Synthesizers: attack, shield block, roll)
     - `../js/player.js` (Spawn, inputs, combat hit detection, physics, swimming)
     - `../js/minimap.js` (3D Cube World diorama minimap)
     - `../js/emotes.js` (Emote wheel modal & animations)
     - `../js/cursor.js` (Cursor FX)
     - `../js/chat.js` (Chat window & commands)
     - `../js/peerjs.min.js` + fallback unpkg script
     - `../js/network.js` (`NetworkManager`, P2P WebRTC & WS client)
     - `../js/game.js` (Renderer, scene, camera, game loop, chunk pump)

### 3.3 Dependency & Symbol Order Evaluation
- `world.js` references `scene.add(me)` inside `buildMesh(c)`, but `buildMesh` is only invoked during `pump()` in `game.js`, at which point `scene` is already instantiated.
- `character.js` references `getEquippedMap()` inside `updatePlayerAppearance()`, but `updatePlayerAppearance()` is only called during `game.js:229` and `inventory.js`, after `inventory.js` defines `getEquippedMap`.
- `ready` is declared with `let ready = false;` in `world.js:771` and assigned `ready = false;` / `ready = true;` in `game.js:292, 333` without re-declaring `let`, avoiding lexical identifier conflicts.
- All dependencies are topologically valid.

---

## 4. Runtime Mechanics & Game Loop Analysis

### 4.1 Game Loop Initialization (`ready = true`) & Chunk Meshing
- In `js/game.js:306`, `loop(now)` requests next frame via `requestAnimationFrame(loop)`.
- If `window.isP2PWaitingApproval` is true, loop renders scene and returns without generating chunks until host approves join request.
- `manage()` evaluates player chunk position `(pcx, pcz)`:
  - If player changed chunks, queues all chunks within render distance `RD` sorted by distance (`queue.sort((a,b) => a[0] - b[0])`).
- When `ready` is `false`:
  - `need = (2 * 3 + 1) ** 2 = 49` chunks (a 7x7 chunk grid centered on player spawn).
  - Each frame, `pump(30)` processes chunk generation and meshing up to a 30ms budget.
  - Counts meshed chunks in the 7x7 grid: `ok`.
  - Updates loading progress bar: `bar.style.width = (ok / need * 100) + '%'`.
  - When `ok >= need`:
    - `ready = true`
    - `#load` overlay opacity fades to `0` and element is removed after 600ms.
- When `ready` is `true`:
  - `pump(6)` maintains seamless background chunk streaming with a 6ms frame budget.
  - Sub-stepped physics runs 3 times per frame: `for (let i = 0; i < 3; i++) physics(dt / 3);`.
  - Local regeneration updates: `G.rg += dt; if (G.rg > 4) G.hp = Math.min(100, G.hp + 3 * dt); ui();`.

### 4.2 Player Physics, Swimming & Water-Exit Step-Assist
Located in `js/player.js:305-558`:
1. **Liquid Detection**:
   - `wb(y)` samples voxel at `(P.x, y, P.z)`.
   - `lq(b) => b === 5 || b === 11` (Water or Lava).
   - `inW = lq(wb(P.y + 0.3)) || lq(wb(P.y + 0.9))`.
   - Scans 8 vertical voxels around player to determine exact water surface height `waterTopY`.
2. **Swimming State**:
   - `P.isSwimming = inW && (!P.ground || (waterTopY > -900 && P.y > waterTopY - 0.75)) && (isMovingInput || isMovingFast)`.
   - Lowers hitbox from standing height (`1.8m`) to swimming height (`0.7m`) via `getPlayerHitboxHeight()`.
   - Underwater oxygen depletes at `7.5 * dt` (~13 seconds of air) and damages player when depleted (`hurt(10 * dt)`).
3. **Water-Exit Jump & Bank Impulses**:
   - If player is at water surface and presses Space: `P.vy = 7.8; waterJumpTimer = 0.4; autoJumpTimer = 0.35;` plus horizontal boost towards movement direction.
   - While swimming into a shore bank (`hitsBank && clearAbove`), automated step-assist launches player up onto the bank: `P.vy = 7.0; P.vx += dirX * 1.8; P.vz += dirZ * 1.8;`.
   - `waterJumpTimer` disables water drag deceleration during water exit, allowing clean ascent onto dry land.
4. **Dodge Rolling (Kotrmelec)**:
   - Double-tap Shift triggers `triggerRoll()`.
   - Consumes 5 stamina; sets `isRolling = true; rollTimer = 0; ROLL_DURATION = 0.62;`.
   - Grants Elden Ring-style invincibility frames (i-frames in `hurt()`: `if (isRolling && rollTimer > 0.04 && rollTimer < 0.52) return;`).
   - Phase 1 (0–25%): 11.2 m/s dash; Phase 2 (25–72%): rolling decelerates to 7.5 m/s; Phase 3 (72–100%): recover to stance.

### 4.3 Camera Controls & Collision Pull-in
Located in `js/game.js:453-469`:
- Camera calculates spherical direction vector from `yaw` and `pitch` (`pitch` clamped between `-0.4` and `1.4` radians).
- Target head position: `targetHeadY = (P.isSwimming) ? 0.85 : 1.55`.
- Raymarching collision prevention (`for (let t = 0.3; t <= dist; t += 0.25)`): if solid voxel encountered between head and camera distance `dist`, clamps distance `dd = Math.max(0, t - 0.35)` to prevent camera from clipping inside terrain blocks.
- First-person vs third-person: hides player model when `dd <= 0.8`.
- Sky dome dynamically follows camera position: `dome.position.copy(cam.position)`.

### 4.4 UI Modals & Interaction Routing
- Key listeners in `js/game.js:121-224` route ESC and shortcut keys:
  - `Escape`: priority cascade closes in order: Chat -> Emotes -> Minimap -> In-Game Settings -> In-Game Controls -> P2P Modal -> Character Editor -> Inventory -> Pause ESC Menu.
  - `KeyI`: Toggles Inventory & Crafting Workbench (`toggleInv()`).
  - `KeyM`: Toggles 3D Minimap fullscreen diorama (`toggleMinimap()`).
  - `KeyV`: Toggles Emotes Wheel modal (`toggleEmotes()`).
  - `KeyT` or `/`: Opens Chat and Command input (`openChat()`).
  - Mouse clicks on canvas: LMB triggers dominant hand attack / item action, RMB triggers secondary hand action / shield block. Pointer lock requested on LMB click if not already locked.

---

## 5. Audit of Block Building, Mining & Terrain Modification

To transform the game into an Action-RPG (Cube World direction), terrain modification must be entirely disabled or replaced. Below is the complete catalog of all terrain modification code in the project.

### 5.1 Player Voxel Interaction (Click & Mining Handlers)
- **Status in `js/player.js`**: Already purged of block placement and mining!
  - `cv.addEventListener('mousedown')` at line 244 only calls:
    - LMB (button 0): `handleHandAction('dominant')` -> `triggerHandAttack('dominant')`
    - RMB (button 2): `handleHandAction('secondary')` -> `triggerHandAttack('secondary')` or shield blocking (`isPlayerBlocking = true`).
  - There are NO Three.js `Raycaster` calls, NO `setVoxel` calls, and NO voxel wireframe outline boxes for targeting blocks.

### 5.2 Multiplayer Network Sync (`js/network.js`)
Vestigial block synchronization code still remains and must be cleaned up:
1. **`this.worldDeltas` object** (lines 29, 105–107, 192, 250, 1232–1234, 1858–1874):
   - Stores modified blocks as `{ "x,y,z": blockType }`.
   - Sent to server/P2P clients during initial connection.
2. **`modifyBlock(x, y, z, blockType)`** (lines 1857–1869):
   - Updates `this.worldDeltas` and calls `this.send({ type: 'blockChange', x, y, z, blockType })`.
   - *Action needed*: Remove or replace with empty stub so no block changes can ever be initiated.
3. **`onRemoteBlockChange(x, y, z, blockType)`** (lines 1871–1875):
   - Applies remote block edit to chunk data and re-meshes chunk (`dispose(c); buildMesh(c)`).
   - *Action needed*: Remove or ignore `blockChange` packets.
4. **`applySingleBlock(x, y, z, blockType)`** (lines 1877–1892) & **`applyWorldDeltas()`** (lines 1894–1900):
   - Modifies raw chunk buffer `c.d[...] = blockType` and calls `dispose(c); buildMesh(c)`.
   - *Action needed*: Deprecate/no-op.

### 5.3 Dedicated Server Sync (`ServerSource/server.js`)
1. **World deltas persistence** (lines 80–100):
   - Reads/writes `data/world.json` with `worldDeltas`.
2. **Initial sync** (line 380):
   - Sends `worldDeltas` in `init` message to newly connected clients.
3. **`blockChange` packet handler** (lines 453–465):
   - Receives `msg.type === 'blockChange'`, mutates `worldDeltas[key] = blockType`, and broadcasts to all clients.
   - *Action needed*: Ignore or disable `blockChange` handling.

### 5.4 Items Database & Hotbar (`js/items.js`)
Currently in `INV`:
1. `id: 'stone'`:
   - `name: 'Kamenný blok'`
   - `desc: 'Pevný opracovaný kámen pro budování opevnění.'`
   - `statList: ['🪨 Odolný stavební kámen', '🏰 Ochrana před zničením']`
   - *Action needed*: Rename to `name: 'Žula'` or `'Kámen'`, update description to an RPG crafting resource (e.g. `Kvalitní kámen pro kování a vylepšování zbraní a brnění`), and remove any building references.
2. `id: 'wood'`:
   - `name: 'Dubové dřevo'`
   - `desc: 'Základní stavební materiál získaný kácením lesních stromů.'`
   - `statList: ['🪵 Základní stavební materiál', '🔨 Vhodné na výrobu nástrojů']`
   - *Action needed*: Update description to crafting material (e.g. `Kvalitní dřevo na výrobu luků, holí a násad`).
3. Ensure starting hotbars (`HB`) and default loadouts do not feature terrain building blocks.

### 5.5 P2P Management UI & Permissions (`play/index.html` & `js/network.js`)
- Currently in `js/network.js:677-756` and `play/index.html:525-542`:
  - Contains toggles: `#p2pToggleHostCmd`, `#p2pToggle_${peerId}` for command/building permissions.
  - *Action needed*: Modernize this into a true Cube World **Party Management** interface:
    - Display player Class & RPG Level / HP badge (e.g. `Lv. 3 · 100/100 HP`).
    - Provide "Teleport to Player" (`/tp <nickname>`).
    - Provide "Kick from Party" (`/kick <nickname>`) for host.
    - Remove obsolete text about building/command restrictions.

---

## 6. Recommended Action Plan & Files to Modify for R1 Implementation

| File | Target Lines / Sections | Required Action |
|---|---|---|
| `js/player.js` | Line 559 | Delete the redundant extra closing brace `}`. This immediately restores engine parsing. |
| `js/network.js` | Lines 1857–1900 | Stub out/disable `modifyBlock`, `onRemoteBlockChange`, `applySingleBlock`, `applyWorldDeltas`. |
| `js/network.js` | Lines 667–772 | Upgrade `renderP2PPlayersList()` to render party members with Level, HP, Teleport, and Kick buttons rather than permission checkboxes. |
| `ServerSource/server.js` | Lines 453–465 | Disable or ignore `blockChange` packets; keep `worldDeltas` empty. |
| `js/items.js` | Lines 400–419 | Update `stone` and `wood` names and descriptions to emphasize weapon/armor crafting & equipment upgrading rather than building/fortification. |
| `play/index.html` | Lines 29–33 | Add guest fallback or bypass so direct loading or headless testing does not redirect when `voxel_auth_user` is not yet populated. |
| `play/index.html` | Lines 524–542 | Update P2P modal copy from "správa příkazů" to "Správa Družiny (Party)". |
| `js/audio.js` | End of file | Add `playJumpSound()` synthesizer to provide missing audio feedback for water exit / jumps referenced in `player.js:446`. |

---

## 7. Automated Verification & Testing Strategy

To ensure zero regressions and verify acceptance criteria continuously:

1. **Static Syntax Verification**:
   - Command: `node --check js/*.js ServerSource/*.js`
   - Criteria: Zero syntax errors across all JavaScript files.
2. **Headless Chrome Runtime Verification**:
   - Harness: Node.js runner with Chrome CDP (`--headless=new`, `--remote-debugging-port=...`).
   - Criteria:
     - `http://localhost:port/index.html` loads with 0 errors and 0 exceptions.
     - `http://localhost:port/play/index.html` loads with 0 errors, 0 exceptions, connects to local P2P hub, generates 49 initial chunks, and evaluates `ready === true`.
3. **Dedicated Server Verification**:
   - Harness: Node child process running `ServerSource/server.js`.
   - Criteria: Responds to HTTP `GET /api/status` with `status: 'online'` and accepts WebSocket client `join` packet returning `init` handshake with `seed` and `playerId`.
4. **Gameplay Verification**:
   - Verify LMB/RMB trigger hand attacks, shield block, or potion consumption without mutating terrain voxels.
   - Verify swimming step-assist smoothly lifts the player out of water onto shore.
