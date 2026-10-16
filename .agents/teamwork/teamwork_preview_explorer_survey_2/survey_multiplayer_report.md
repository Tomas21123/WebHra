# Comprehensive Multiplayer (P2P & WebSocket) Architecture & Party Management Survey (R4)

**Document Metadata:**
- **Author:** `teamwork_preview_explorer_survey_2` (Teamwork Explorer)
- **Target Component:** Multiplayer Architecture (P2P PeerJS & Dedicated WebSocket Server)
- **Relevant Requirements:** R4 (Polished P2P & WebSocket Server Multiplayer), R1 (Core Stability & UI), R2/R3 (RPG Integration)
- **Date:** 2026-10-16

---

## Executive Summary

The multiplayer architecture of *Voxelový svět* employs a dual-stack networking model designed to satisfy two distinct multiplayer paradigms:
1. **Peer-to-Peer (P2P / WebRTC via PeerJS + BroadcastChannel)**: Zero-setup casual co-op for friends using room codes (`VOX-XXXX`) with host admission approval, host-side world generation authority, and local browser tab synchronization.
2. **Dedicated WebSocket Server (`ServerSource/server.js`)**: Persistent multiplayer server capable of hosting up to 20 players, equipped with operator permissions (OP), real-time game commands (`/tp`, `/time`, `/kick`), automatic world persistence, a REST API (`/api/status`), and a web administration panel (`/admin`).

While the foundation is remarkably rich (featuring full 3D skeletal rig synchronization, water physics, dodge roll flip animators, directional head tracking, and cosmetic customization sync), significant architectural and functional gaps prevent it from delivering a complete Cube World-style Action-RPG party experience. Crucially:
- **RPG Stats & Badges Missing from Network Packets**: Remote player nametags only render usernames without level badges or HP bars; position packets omit Level, current HP, and max HP.
- **Ranged Combat & Projectiles Unsynchronized**: Bows and magic staffs currently rely on client-side instant raycasts rather than synchronized flying 3D projectile entities.
- **Party UI Deficits**: The current P2P modal focuses on raw command permissions rather than party management (no kick buttons in P2P modal, no 1-click party teleportation buttons, no party frames on the HUD).
- **Packet Inconsistencies**: Server commands like `setTime` are broadcast by the dedicated server but ignored by the client `NetworkManager`.
- **Testability**: Modern Node.js natively supports `BroadcastChannel`, enabling headless automated integration tests of the entire P2P handshake and broadcast flow without needing external STUN/TURN brokers.

---

## 1. PeerJS P2P Implementation Deep Dive

### 1.1 Architecture & Dual-Transport Layer
The P2P implementation resides primarily in `js/network.js` (`lines 18-35, 210-658, 811-1076`) with storage support in `js/storage.js` (`lines 104-120`).

To guarantee robustness both over the public internet and across browser tabs on the same computer, the game implements a **dual-transport hybrid**:
1. **Local Inter-Tab Transport (`BroadcastChannel`)**:
   - Host opens `new BroadcastChannel('vox_p2p_' + cleanNum)` and a backup hub `new BroadcastChannel('vox_p2p_local_hub')` (`js/network.js:324-334`).
   - Client joins the same channel with a generated client ID `local_client_${random}` (`js/network.js:853`).
   - Packets wrap payload with `{ sender, target, data }`.
   - **Advantage**: Instant, 100% reliable local messaging for same-PC testing without WebRTC loopback failures or broker rate limits.
2. **Internet WebRTC Transport (`PeerJS`)**:
   - Host registers peer ID `vox-world-${cleanNum}` (`js/network.js:240, 360`).
   - STUN servers configured: `stun.l.google.com:19302`, `stun1.l.google.com:19302`, `stun2.l.google.com:19302` (`js/network.js:351-355`).
   - Client connects to host peer ID with `{ reliable: true }` (`js/network.js:992`).

### 1.2 Room Code Generation & Lifecycle
- In `js/storage.js:104-120`, `getP2PRoomCode(worldId)` checks the world save. If unset, it generates a 4-digit code (`Math.floor(1000 + Math.random() * 9000)`), yielding formatted strings like `VOX-7429`.
- The numeric component is sanitized (`cleanNum = code.replace(/[^0-9]/g, '')`) to form the deterministic PeerJS ID `vox-world-${cleanNum}`.
- Deep-linking is supported: accessing `play/index.html?p2p=7429` automatically triggers client connection mode (`js/network.js:76-86`).

### 1.3 Join Approval Handshake Protocol
The connection handshake enforces strict host authority:
```
Client (play/index.html)                          Host (play/index.html)
       |                                                    |
       |----- (1) joinRequest (nick, skin, equip) --------->|
       |      [Client shows #p2pWaitingModal]               | [Host shows #p2pRequestPopup]
       |      [Client loop paused: isP2PWaitingApproval]    | [PointerLock released]
       |                                                    |
       |                                                    |-- Host presses [Y] or [N]
       |                                                    |
       |<---- (2a) rejected ("Hostitel odmítl...") ---------| (If Rejected)
       |      [Alert & redirect to index.html]              |
       |                                                    |
       |<---- (2b) init (seed, deltas, players, isOp) ------| (If Approved)
       |                                                    |-- Host spawns remote rig (x+1.5)
       |                                                    |-- Host broadcasts playerJoin to peers
       |-- approveP2PJoin(seed, deltas, players)            |
       |-- setWorldSeed(seed), clear chunks                 |
       |-- Teleport local player to (host.x+1.5, z+1.5)     |
       |-- Hide #p2pWaitingModal, unpause loop              |
       |                                                    |
       |<==== (3) 20Hz Bidirectional Transform Sync ======>|
```

**Key Code Locations for Join Handshake:**
- **Join Request Emission**: `js/network.js:931-940` (BroadcastChannel) & `1001-1008` (PeerJS).
- **Host Join Prompt**: `js/network.js:434-487` (`promptJoinRequest`). Releases pointer lock (`document.exitPointerLock()`), updates `#p2pRequestPopup` and `#p2pRequestText`, plays click sound, announces in chat.
- **Host Approval Execution**: `js/network.js:490-543` (`acceptPendingP2P`). Adds connection to `p2pClients` Map, calls `sendInitToClient(conn)`, spawns client rig at host offset (`P.x + 1.5, P.y + 0.2, P.z + 1.5`), broadcasts `playerJoin` to other peers.
- **Client Handover & World Bootstrap**: `js/game.js:239-299` (`window.approveP2PJoin`). Resets `window.isP2PWaitingApproval = false`, calls `setWorldSeed(hostSeed)`, copies `hostDeltas`, teleports local player `P.x = host.x + 1.5, P.z = host.z + 1.5, P.y = Math.max(host.y + 0.2, (th + 1.5) * S)`, purges old chunk meshes from Three.js scene, resets ready flag, and initiates meshing.

### 1.4 Identified P2P Limitations & Fragilities
1. **Single Pending Connection Bug**: Host stores `this.pendingP2PConn = { conn, data }` (`js/network.js:440`). If two players send join requests simultaneously, the second overwrites the first in memory without closing or notifying the first.
2. **WebRTC Broker ID Collision (`unavailable-id`)**: If a host tab refreshes rapidly, the broker server retains the ID for several seconds. Line 413 attempts `this.peer.reconnect()`, but if the ID is still locked, PeerJS throws an unhandled error.
3. **Missing Party Controls**: Host cannot kick connected guests from `#p2pModal`; only command permission toggling is implemented (`js/network.js:677-757`).

---

## 2. Dedicated WebSocket Server Architecture (`ServerSource/server.js`)

### 2.1 Server Technology & Runtime Profile
- **Runtime**: Node.js standard library (`http`, `fs`, `path`, `os`) + `ws` (`^8.18.0`).
- **Files**:
  - `ServerSource/server.js`: Complete server logic (879 lines).
  - `ServerSource/config.json`: Configuration (`serverName`, `port: 3000`, `maxPlayers: 20`, `seed: 12345`, `motd`, `pvp`, `saveIntervalSeconds`, `adminPassword`, `enableWebAdmin`).
  - `ServerSource/ops.json`: List of operator nicknames (`["Tomas", "Admin"]`).
  - `ServerSource/data/world.json`: World deltas and seed persistence.
- **Syntax Verification**: `node --check ServerSource/server.js` passes with zero errors.

### 2.2 HTTP REST API & Web Administration Dashboard
The server runs an integrated HTTP server (`ServerSource/server.js:158-306`) alongside the WebSocket listener:
1. `GET /api/status`: Returns JSON status object:
   ```json
   {
     "status": "online",
     "serverName": "Voxelový Server",
     "motd": "Vítej ve Voxelovém RPG světě!",
     "playersOnline": 2,
     "maxPlayers": 20,
     "seed": 12345,
     "pvp": true,
     "uptimeSeconds": 1420
   }
   ```
   Used by client ping and server list displays (`index.html`).
2. `POST /api/admin/action`: Handles administration actions (`save`, `kick`, `toggleOp`, `broadcast`).
3. `GET /admin`: Complete, self-contained HTML/CSS admin portal featuring real-time RAM usage, uptime, seed, interactive player table (with OP toggle and Kick buttons), network IP helper badges, live server log console, and global in-game broadcast field (`ServerSource/server.js:661-839`).

### 2.3 WebSocket Message Routing & State Registry
Client connections are managed via `clients = new Map()` mapping `ws -> player` object (`ServerSource/server.js:309`):
```javascript
player = {
  id: nextPlayerId++,
  nickname: `Hráč_${playerId}`,
  isOp: false,
  x: 0, y: 80, z: 0,
  yaw: 0, pitch: 0,
  heldItem: null,
  skin: {},
  isRolling: false,
  attacking: false,
  hp: 100, stamina: 100,
  ping: 0
};
```

#### Protocol Packet Registry:
| Type | Direction | Payload Attributes | Description |
|---|---|---|---|
| `join` | Client -> Srv | `nickname`, `skin`, `equipment` | Initial handshake. Server checks `isPlayerOp()`, logs IP, replies with `init`, broadcasts `playerJoin` and chat notice. |
| `init` | Srv -> Client | `playerId`, `serverName`, `seed`, `motd`, `isOp`, `pvp`, `worldDeltas`, `players` | World parameters and existing remote player list. |
| `playerJoin` | Srv -> Peers | `player` object | Notifies existing clients to spawn remote rig. |
| `move` | Client -> Srv | `x, y, z, vx, vy, vz, ground, inWater, isSprinting, isForwardSprint, bodyYaw, yaw, pitch, emote, heldItem, isRolling, rollTimer, attacking, attackTime, attackDuration, attackCombo` | Client kinematic & animation state. |
| `playerMove` | Srv -> Peers | Same as `move`, with `id: player.id` | Broadcast to all other clients for remote interpolation. |
| `equipmentChange` | Bidirectional | `id, equipment, skin, heldItem` | Live sync of armor/weapon swaps and appearance updates. |
| `playerHit` | Bidirectional | `attackerId, attackerNick, targetId, damage, knockback, isCrit, weaponName` | Combat damage & knockback distribution. |
| `chat` | Bidirectional | `sender, text, isOp, isSystem` | In-game messaging or slash command trigger. |
| `blockChange` | Bidirectional | `x, y, z, blockType, playerId` | Voxel terrain modification (legacy building mechanic). |
| `stats` | Client -> Srv | `hp, stamina` | Health/stamina updates. |
| `ping` / `pong` | Bidirectional | `time` | Latency calculation. |
| `teleport` | Srv -> Client | `x, y, z` | Forced relocation triggered by `/tp` or `/spawn`. |
| `setTime` | Srv -> Clients | `time` | Broadcast when OP runs `/time den` or `/time noc`. |

### 2.4 Server Disconnect & Lifecycle Cleanup
- On client close (`ws.on('close')`, line 541): removes client from `clients` Map, broadcasts `playerLeave` with `id` and `nickname`, broadcasts chat announcement.
- On shutdown (`SIGINT`/`SIGTERM`, lines 866-879): calls `saveWorld()`, `saveOps()`, broadcasts `serverShutdown`, closes sockets, exits cleanly.

---

## 3. Network Player Synchronization & Animation System

### 3.1 Kinematic Interpolation & Smoothing Pipeline
Client kinematic transmission occurs at 20Hz (every 50ms, `setInterval`, `js/network.js:377, 1119`).

Remote player interpolation is computed inside the main render loop (`js/game.js:480` -> `js/network.js:1786-1852`, `updateAllRemotePlayers(dt)`):
1. **Spatial Interpolation**:
   - Teleport threshold: If distance $> 30$ units, position snaps instantly (`g.position.set(p.targetX, p.targetY, p.targetZ)`).
   - Smoothing: For normal motion, exponential lerp is applied:
     $$\Delta \text{pos} = \Delta \text{pos} \times \min(1, dt \times 14)$$
2. **Body Rotation Interpolation**:
   - `targetBodyYaw` is calculated from movement direction or camera heading.
   - Angle difference is wrapped cleanly between $[-\pi, \pi]$:
     ```javascript
     let diffYaw = targetBody - g.rotation.y;
     while (diffYaw < -Math.PI) diffYaw += Math.PI * 2;
     while (diffYaw > Math.PI) diffYaw -= Math.PI * 2;
     g.rotation.y += diffYaw * Math.min(1, dt * 14);
     ```
3. **Motion Speed Estimation**:
   - Blends packet velocities (`Math.hypot(p.vx, p.vz)`) with actual position displacement (`dist / dt`) to drive leg cadence even during packet jitter.

### 3.2 Unified Character Rig Animator (`animateFullCharacterRig`)
In `js/character.js:350-926`, the game features an identical animation pipeline for the local player and all remote players. Both receive the same rig structure and animState object:

```
            [Head] (Look Pitch & Yaw tracking)
              |
          [Torso] (Breathing, Banking, Naruto forward pitch)
         /   |   \
   [Arm 0] [Body] [Arm 1] (Held weapon, Shield block, Fist punch, Spear thrust)
             |
       [Leg 0] [Leg 1] (Walk swing, Sprint stride, Air flutter, Swim kick)
             |
          [Cape] (Physics cloth wave simulation)
```

**Key Animation Features Synchronized Over Network:**
1. **Swimming (Front Crawl & Treading)** (`js/character.js:789-871`):
   - Controlled by `s.inWater` transitioning `s.swimBlend` (rate $dt \times 7$).
   - When moving ($mv > 0.12$): Body pitches forward ($1.34\text{ rad} \approx 77^\circ$), torso rolls ($\pm 0.28\text{ rad}$), head rolls opposite to breathe, arms execute alternating 360-degree front crawl strokes (`Math.sin(phase) * 1.65 - 0.42`), and legs perform rapid flutter kicks (`phase * 3.8`).
   - When stationary ($mv \le 0.12$): Body remains upright, head looks forward, arms and legs paddle synchronously in gentle water-treading loops.
2. **Dodge Roll (Kotrmelec)** (`js/character.js:873-919`):
   - Activated by double-tap Shift (`js/player.js:212`).
   - Synchronized via `isRolling` flag and `rollTimer` (0.55s total).
   - Phase 1 ($p < 0.25$): Crouch and initial pitch forward ($1.26\text{ rad}$), arms tuck in.
   - Phase 2 ($0.25 \le p < 0.72$): Full 360-degree forward rotation (`rollRot` up to $2\pi + 0.35$), vertical hop lift ($y + 0.28$), chin tucked tightly into chest ($0.65\text{ rad}$).
   - Phase 3 ($p \ge 0.72$): Landing recovery, spine extension, arm re-centering.
   - Invulnerability: During $0.04 < rollTimer < 0.52$, player is completely immune to damage (`js/network.js:1630`, `js/config.js:110`).
3. **Combat Attack Strokes** (`js/character.js:549-740`):
   - Fist Punch: Alternating left/right boxing extension with torso recoil.
   - Spear Thrust: Two-handed forward thrust along $+Z$ axis (up to $+90\text{ cm}$ forward reach) with rear hand pushing at waist level.
   - Heavy Weapons (Greatsword/Battleaxe/Hammer): High 2-handed vertical overhead strike and ground slam.
   - Shields: Dynamic guard stance (`arms[0].rotation.set(-1.45, 0.45, -0.22)`).
4. **Emotes**: Wave, Clap, Dance, Sit (`js/emotes.js` & `js/character.js:358-364`).

### 3.3 3D Gear & Appearance Synchronization
- Remote rigs are instantiated with `createCharacterRig()` (`js/character.js:1-339`).
- Customization attributes: `skinColor`, `hairStyle`, `hairColor`, `eyeColor`, `facialHair`, `underwearColor`, `underwearStyle`.
- Equipment mapping: 8 slots (`helmet`, `chestplate`, `leggings`, `boots`, `cape`, `ring`, `amulet`, `shield`).
- Weapons: `createWeaponInstances()` attaches all voxel item meshes to `rig.hand`; setting `visible = (k === heldItem)` instantly displays active weapons on remote models.

### 3.4 Synchronization Deficiencies & Missing Elements

| Feature Area | Current State | Required State (R4 Cube World RPG) | Severity |
|---|---|---|---|
| **RPG Level in Nametag** | Sprite only displays `(isOp ? '👑 ' : '') + name` (`js/network.js:1499`). | Must display `[Lvl {level}] {name}` above head. | High |
| **HP Bar in Nametag** | No health bar above remote players; only name is drawn on canvas (`js/network.js:1473-1514`). | 3D billboard health bar above head showing current HP / max HP with green/red fill. | High |
| **Level/HP in Packets** | `sendPlayerTransform()` (`js/network.js:1184-1206`) does NOT send `hp`, `maxHp`, or `level`. | Add `hp`, `maxHp`, `level` to 20Hz `move` and `init` packets. | High |
| **Ranged Projectiles** | Bows and magic staffs trigger instant melee check in `checkPvPHit()` (`js/player.js:92-151`). No projectile meshes exist in network. | Networked 3D projectile entities (`arrow`, `fireball`, `frostbolt`) with velocity, gravity/particle trails, and collision sync. | High |
| **Server `setTime` Handling** | Server broadcasts `{ type: 'setTime', time }` (`ServerSource/server.js:646`). Client `handleServerMessage` lacks `case 'setTime'`. | Add `case 'setTime': worldTime = msg.time; break;` in `js/network.js:1220`. | Medium |
| **Minimap Player Visibility** | `js/minimap.js` only renders `mmPlayerMarker` (local player). | Remote party members must appear as colored dots/chevrons on the 3D minimap diorama. | Medium |

---

## 4. Multiplayer UI Transformation: Obsolete Permissions to Party Management

### 4.1 Identification of Obsolete Block-Building Mechanics
In accordance with Requirement R1 (Cube World direction without block modification) and R4:
1. **Network Layer Block Remnants**:
   - `modifyBlock(x, y, z, blockType)` (`js/network.js:1857-1870`).
   - `onRemoteBlockChange()`, `applySingleBlock()`, `applyWorldDeltas()` (`js/network.js:1871-1900`).
   - Server `blockChange` handler & `data/world.json` block delta storage (`ServerSource/server.js:80-108, 453-470`).
2. **Controls Modal Mislabel**:
   - In `play/index.html:393-395`, the controls dialog describes RMB as `"Zničení / Blok"` (Destruction / Block). In Cube World RPG, RMB is Shield Blocking, Secondary Weapon Attack, or Magic Cast.
3. **P2P Permissions Modal**:
   - `renderP2PPlayersList()` (`js/network.js:667-772`) currently provides only a checkbox switch: `"Povolit nebo zakázat používání herních příkazů (např. /tp, /time)"`.
   - While building permissions were previously converted to command toggles, the dialog remains a generic permission panel rather than an RPG Party & Session Manager.

### 4.2 Party & Session Management Architecture Blueprint

The transformation converts `#p2pModal` into **Správa Družiny (Party & Session Management)**:

```
+-------------------------------------------------------------------------+
|  🌐 DRUŽINA A P2P SVĚT                                           [✕]    |
+-------------------------------------------------------------------------+
|  Kód světa: [  VOX-7429  ]   [📋 Kopírovat kód]   [🔗 Pozvat odkazem]    |
|  Stav světa: 3 / 4 členů družiny                                        |
+-------------------------------------------------------------------------+
|  ČLENOVÉ DRUŽINY:                                                       |
|                                                                         |
|  +-------------------------------------------------------------------+  |
|  | 👑 [Tomas] (Ty / Hostitel)            Lvl 14 Válečník            |  |
|  |    HP: [████████████████████] 180/180   Pozice: [120, 45, -30]    |  |
|  |    Zbraň: Ocelový meč + Štít           [⚙️ Nastavení světa]       |  |
|  +-------------------------------------------------------------------+  |
|                                                                         |
|  +-------------------------------------------------------------------+  |
|  | 👤 [Marek] (Člen družiny)             Lvl 11 Hraničář            |  |
|  |    HP: [██████████████░░░░░] 135/160   Vzdálenost: 42 m           |  |
|  |    Zbraň: Lovecký luk                                             |  |
|  |    [📍 Teleportovat k němu]  [👑 Předat vedení]  [🚪 Vyhodit]     |  |
|  +-------------------------------------------------------------------+  |
|                                                                         |
|  +-------------------------------------------------------------------+  |
|  | 👤 [Petr] (Člen družiny)              Lvl 9 Kouzelník             |  |
|  |    HP: [████████████████████] 110/110   Vzdálenost: 156 m          |  |
|  |    Zbraň: Ohnivá hůl                                              |  |
|  |    [📍 Teleportovat k němu]  [👑 Předat vedení]  [🚪 Vyhodit]     |  |
|  +-------------------------------------------------------------------+  |
+-------------------------------------------------------------------------+
|  ČEKAJÍCÍ ŽÁDOSTI O VSTUP (1):                                          |
|  • [Karel] (Lvl 5) žádá o připojení...      [✔ Povolit]  [✕ Odmítnout]  |
+-------------------------------------------------------------------------+
```

#### Detailed Feature Specifications:
1. **Party Roster Display**:
   - Each card dynamically reflects player nickname, archetype/weapon badge, Level, and current HP bar (synchronized via transform packets).
   - Real-time distance calculation:
     $$\text{dist} = \sqrt{(P.x - rp.x)^2 + (P.z - rp.z)^2}\text{ meters}$$
2. **Instant Party Teleportation (`Teleportovat k hráči`)**:
   - Dedicated button on each party member card.
   - When clicked, immediately updates local coordinates next to that party member:
     ```javascript
     P.x = target.x + 1.2;
     P.y = target.y + 0.1;
     P.z = target.z + 1.2;
     P.vx = 0; P.vy = 0; P.vz = 0;
     ```
   - Does NOT require entering chat or memorizing `/tp` syntax.
3. **Host Session Administration (Kick Player)**:
   - Host can click `[🚪 Vyhodit]` next to any connected guest.
   - Sends `{ type: 'kicked', reason: 'Byl jsi vyhozen hostitelem světa.' }`.
   - Closes WebRTC/BroadcastChannel, deletes from `p2pClients`, removes remote 3D rig, announces in chat.
4. **Queue of Pending Requests**:
   - Replaces fragile single-variable `pendingP2PConn` with `pendingP2PRequests = new Map()`.
   - Host can approve or reject each pending player individually from the party dialog or via keyboard shortcut.
5. **In-Game HUD Party Widget (Cube World Overlay)**:
   - Compact overlay in top-left HUD (under player bars).
   - Lists party members with mini HP bars and a compass indicator pointing toward their relative bearing.

---

## 5. Automated Testing & Simulation Strategy

### 5.1 Dedicated Server Headless Test Harness
The dedicated WebSocket server (`ServerSource/server.js`) can be verified completely in an automated Node.js environment without starting a browser.

#### Test Architecture:
```
[Node Test Runner (node:test or standalone script)]
       |
       +---> Start ServerSource/server.js on isolated port (e.g. 3847)
       |
       +---> Client 1 (ws://localhost:3847) -> send('join', nick: 'Alice')
       |     Client 2 (ws://localhost:3847) -> send('join', nick: 'Bob')
       |
       +---> Verification Matrix:
       |     [x] Handshake: Client receives 'init' with valid seed, playerId, players array
       |     [x] Join Notification: Client 1 receives 'playerJoin' for Client 2
       |     [x] Kinematic Broadcast: Client 1 sends 'move', Client 2 receives 'playerMove'
       |     [x] Combat Relay: Client 1 sends 'playerHit', Client 2 receives 'playerHit'
       |     [x] Chat Relay: Client 1 sends 'chat', Client 2 receives message
       |     [x] Admin REST API: GET /api/status returns playersOnline == 2
       |     [x] OP Command: Alice (OP) sends '/time den', Client 2 receives 'setTime'
       |     [x] Disconnect: Client 2 closes socket, Client 1 receives 'playerLeave'
       |
       +---> Server Clean Shutdown (SIGTERM -> saveWorld -> exit 0)
```

### 5.2 P2P Handshake Simulation via Native `BroadcastChannel`
Because Node.js (v18+) includes a native global `BroadcastChannel` implementation, the local P2P layer can be rigorously tested without WebRTC mocks or browsers:

#### Test Code Prototype:
```javascript
const { test } = require('node:test');
const assert = require('node:assert');

test('P2P Local Channel Handshake & Sync', async () => {
  const roomCode = '9876';
  const hostChannel = new BroadcastChannel(`vox_p2p_${roomCode}`);
  const clientChannel = new BroadcastChannel(`vox_p2p_${roomCode}`);

  let clientApproved = false;

  // Host listener
  hostChannel.onmessage = (event) => {
    const { sender, target, data } = event.data;
    if (target === 'host' && data.type === 'joinRequest') {
      // Host approves client
      hostChannel.postMessage({
        sender: 'host',
        target: sender,
        data: {
          type: 'init',
          playerId: sender,
          seed: 424242,
          players: [{ id: 'host', nickname: 'HostPlayer', x: 100, y: 50, z: 100 }]
        }
      });
    }
  };

  // Client listener
  clientChannel.onmessage = (event) => {
    const { sender, target, data } = event.data;
    if (data.type === 'init') {
      assert.strictEqual(data.seed, 424242);
      assert.strictEqual(data.players[0].nickname, 'HostPlayer');
      clientApproved = true;
    }
  };

  // Client sends join request
  clientChannel.postMessage({
    sender: 'client_unit_test',
    target: 'host',
    data: { type: 'joinRequest', nickname: 'TestGuest', skin: {}, equipment: {} }
  });

  await new Promise(r => setTimeout(r, 100));
  assert.strictEqual(clientApproved, true, 'Client should receive init packet from host');

  hostChannel.close();
  clientChannel.close();
});
```

---

## 6. Implementation Action Plan for R4

1. **Syntax Fix (Precondition)**:
   - Remove the superfluous closing brace at line 559 in `js/player.js` (`node --check js/player.js`).
2. **Packet Schema Extension for RPG Level & HP**:
   - In `js/network.js:1184` (`sendPlayerTransform`), include:
     ```javascript
     hp: (typeof G !== 'undefined' ? G.hp : 100),
     maxHp: (typeof getPlayerBonusHP === 'function' ? 100 + getPlayerBonusHP() : 100),
     level: (typeof getPlayerLevel === 'function' ? getPlayerLevel() : 1)
     ```
   - In `ServerSource/server.js:401-450`, include `hp`, `maxHp`, and `level` in `playerMove` relay.
3. **Remote Nametag 3D Badges**:
   - In `js/network.js:1473-1514` (`createNametagSprite`) & `updateRemotePlayer`, render:
     - Level badge pill: `[Lvl {p.level || 1}]` with gold/cyan styling.
     - Player name: `p.nickname`.
     - Health bar canvas: Green background proportionate to `p.hp / p.maxHp`, with subtle dark border.
4. **Party Management Modal**:
   - Redesign `renderP2PPlayersList()` in `js/network.js:667` to replace the solitary command switch with a party card layout containing: Level badge, HP bar, 1-Click `[📍 Teleportovat]` button, and host `[🚪 Vyhodit]` button.
   - Implement `kickP2PPlayer(peerId)` sending `{ type: 'kicked' }`.
5. **Projectiles & Combat Hits**:
   - Synchronize bow and staff attacks by dispatching `{ type: 'projectileSpawn', id, projType, x, y, z, vx, vy, vz, damage, attackerId }`.
   - Animate flying arrows/fireballs in the scene and resolve impacts smoothly.
6. **Clean Up Obsolete Block Building Controls**:
   - Change controls dialog text in `play/index.html:393` from `"Zničení / Blok"` to `"Krytí štítem / Sekundární akce"`.
   - Remove unused block manipulation hotkeys.
7. **Automated Verification Harness**:
   - Add automated test scripts in `tests/` verifying `ServerSource/server.js` startup, packet broadcast, and P2P `BroadcastChannel` handshake.

---
*Report compiled and verified by teamwork_preview_explorer_survey_2.*
