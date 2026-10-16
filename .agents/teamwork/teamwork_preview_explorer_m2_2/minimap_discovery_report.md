# Technical Exploration & Architectural Blueprint: 3D Minimap Markers & Discovery HUD System (F5)

**Author:** `teamwork_preview_explorer_m2_2`  
**Date:** 2026-10-16  
**Subsystem:** Minimap, Exploration Triggers, Discovery HUD, Web Audio Chime  
**Target Files:** `js/minimap.js`, `js/audio.js`, `js/game.js`, `play/index.html`, `css/style.css`

---

## 1. Executive Summary

This report establishes the complete architectural blueprint and implementation plan for **Feature 5: 3D Minimap Markers & Discovery HUD System**, fulfilling Requirement **R2 (Cube World-Style Exploration, Encounters & World Discovery)**.

The system expands the existing 3D voxel diorama minimap (`js/minimap.js`) into an interactive, real-time tactical radar and exploration tracking hub. It provides:
1. **3D Diorama Markers**: Distinct procedural Three.js geometries for 5 POI types (**Shrines**, **Ruins**, **Monster Camps**, **Treasure Chests**, and **Landmark Vistas**) rendered directly onto the stepped voxel diorama with custom glowing materials and per-frame idle animations (spinning runes, flickering campfires, floating bobbing chests, pulsing beacon crowns).
2. **POI Discovery Trigger**: A performant spatial distance trigger ($R = 36$m in world coordinates) using macro-cell spatial hashing ($L = 160$ blocks) that queries at most 9 candidate cells, preventing redundant global searches.
3. **Fog of War Integration**: Cohesive integration with `exploredChunks`. Undiscovered POIs remain obscured by the Fog of War. Discovered POIs display prominent 3D markers on explored terrain. Reaching a Landmark Vista clears Fog of War in a massive 12-chunk radius.
4. **Seed-Scoped Persistence**: Discovered POI IDs are saved to `localStorage` under `voxel_poi_discovered_${SEED}`, automatically maintaining world isolation and persisting across reloads.
5. **On-Screen Discovery Banner & Web Audio Chime**: An audiovisual fanfare when discovering a landmark, consisting of an on-screen glowing banner (`showDiscoveryToast(name, xp)`) and a pure Web Audio API 4-note ascending major arpeggio chime ($C_5 \to E_5 \to G_5 \to C_6$) with zero external audio assets.
6. **Radar Projection Contract**: Exposing `window.projectToRadar(playerX, playerZ, targetX, targetZ, radarRadius)` fulfilling automated test contracts with edge clamping.

---

## 2. Codebase Audit of Existing Systems

### 2.1 `js/minimap.js` Audit
- **Rendering Architecture**:
  - `mmRenderer`: Three.js WebGLRenderer rendering into `<canvas id="minimapCanvas">`.
  - `mmScene`: Three.js Scene containing `AmbientLight` (0.78), `DirectionalLight` (sun, 0.9), `DirectionalLight` (rim, 0.45), `mmTerrainMesh` (stepped voxel terrain), and `mmPlayerMarker` (cyan pointer + gold ring).
  - `mmCam`: Three.js PerspectiveCamera orbiting the diorama center at distance `mmDist` (16–280), yaw `mmRotY`, pitch `mmPitch`.
- **Coordinate Transformation**:
  - Scale factors:
    $$\text{miniScale} = 0.42 \quad (\text{horizontal: blocks} \to \text{scene units})$$
    $$\text{miniScaleH} = 0.15 \quad (\text{vertical: blocks} \to \text{scene units})$$
  - Diorama Center:
    $$\text{centerBX} = \lfloor P.x / S \rfloor + \text{mmPanX}, \quad \text{centerBZ} = \lfloor P.z / S \rfloor + \text{mmPanZ}, \quad \text{centerH} = \text{height}(\text{centerBX}, \text{centerBZ})$$
  - Transformation for any point $(bx, by, bz)$:
    $$x_{\text{mm}} = (bx - \text{centerBX}) \cdot \text{miniScale}$$
    $$z_{\text{mm}} = (bz - \text{centerBZ}) \cdot \text{miniScale}$$
    $$y_{\text{mm}} = (by - \text{centerH}) \cdot \text{miniScaleH}$$
- **Current Limitations**:
  - No marker collection or management for POIs.
  - No POI discovery distance checks in the update loop.
  - Fog of War (`exploredChunks`) only controls terrain quad inclusion, without POI visibility gating.
  - No `projectToRadar` function exposed on `window`.

### 2.2 `js/audio.js` Audit
- Implements synthesized sound effects using `window.AudioContext`:
  - `playAttackSound(type)` (thrust, heavy, staff, bow, melee)
  - `playBlockSound()` (triangle bandpass clank)
  - `playRollSound()` (whoosh + thud)
- **Gap**: Lacks a discovery chime for exploration fanfare.

### 2.3 `js/game.js` Audit
- The main animation loop `loop(timestamp)` executes:
  - `updateMinimap(dt, now)` at line 487 (only runs when `minimapOpen = true`).
  - `markExploredAroundPlayer()` at line 490 (runs every 45 frames regardless of minimap state).
- **Opportunity**: POI discovery distance checking should be evaluated alongside `markExploredAroundPlayer()` in the world loop so that discoveries happen actively during gameplay even when the full-screen minimap is closed.

### 2.4 HUD Elements & Styling in `play/index.html` & `css/style.css`
- `#toast`: Simple text notification at `bottom: 90px`.
- `#minimapBox`: Fullscreen overlay modal with canvas, compass `#mmCompass`, badges `#mmBiome`, `#mmExplored`, `#mmCoords`, and control toolbar.
- **Gap**: No dedicated discovery banner element with RPG flair (glowing border, landmark name, XP reward).

---

## 3. 3D Diorama Markers Specification

### 3.1 POI Marker Visual Taxonomy & Geometries

All markers are constructed as Three.js `Group` objects added to a dedicated `mmPoiGroup` inside `mmScene`. They are rendered with lightweight Three.js geometries and vibrant `MeshStandardMaterial` / `MeshBasicMaterial` colors:

| POI Type | Model Composition | Primary Color | Emissive Color | Visual Accent | Idle Animation |
|---|---|---|---|---|---|
| **Ancient Shrine** (`Shrine`) | Central Octahedron (`r=0.85`) + Orbiting Torus Ring (`r=1.25, pipe=0.12`) | Sky Blue (`0x38bdf8`) | Cyan (`0x0284c7`) | Rotating runic energy ring | Y-axis continuous spin ($1.5\,\text{rad/s}$), vertical hover bob ($\pm 0.2\text{m}$) |
| **Ruins** (`Ruins`) | Twin Pillars (`0.4 \times 1.4 \times 0.4`) + Lintel Arch (`1.8 \times 0.35 \times 0.5`) | Slate Grey (`0x94a3b8`) | Azure Glow (`0x3b82f6`) | Central floating ancient rune block | Ambient breathing pulse on rune emissive intensity |
| **Monster Camp** (`Camp`) | 4-sided Cone Tetrahedron Flame (`r=0.7, h=1.4`) + 4 Stone Ember Cubes | Fiery Orange (`0xf97316`) | Amber Flame (`0xfbbf24`) | Charcoal ember ring at base | Flickering flame scale pulsation ($1.0 \pm 0.15$ at $12\,\text{Hz}$) |
| **Treasure Chest** (`Chest`) | Oak Chest Base (`1.0 \times 0.6 \times 0.7`) + Lid (`1.04 \times 0.25 \times 0.74`) + Latch | Golden Amber (`0xf59e0b`) | Gold Ore (`0xd97706`) | Luminous gold lock latch (`0xfffbeb`) | Floating vertical bob ($\pm 0.15\text{m}$) + gentle yaw wobble oscillation |
| **Landmark Vista** (`Landmark`) | Tapered Watchtower Pillar (`r_t=0.3, r_b=0.55, h=1.8`) + Beacon Crown Octahedron | Fortress Slate (`0x64748b`) | Crimson Beacon (`0xef4444`) | Radiant crimson beacon crystal atop tower | Pulsing beacon radiance ($0.6 \to 1.0$) + slow rotation |

### 3.2 Marker Diorama Coordinate Projection
For each discovered POI $i$ with block coordinates $(bx_i, by_i, bz_i)$:
1. Obtain current diorama center:
   $$centerBX = \lfloor P.x / S \rfloor + mmPanX$$
   $$centerBZ = \lfloor P.z / S \rfloor + mmPanZ$$
   $$centerH = height(centerBX, centerBZ)$$
2. Compute relative position:
   $$X_{\text{local}} = (bx_i - centerBX) \cdot 0.42$$
   $$Z_{\text{local}} = (bz_i - centerBZ) \cdot 0.42$$
   $$Y_{\text{local}} = (by_i - centerH) \cdot 0.15 + Y_{\text{elevation}}$$
   Where $Y_{\text{elevation}} = 1.25$ units above the terrain surface to ensure complete visual clearance over stepped voxel slopes.

### 3.3 Dynamic Marker Lifecycle & Culling
- Minimap markers are cached in `mmPoiMarkersMap = new Map()`.
- During `updateMinimapMarkers(dt, now)`:
  - If a discovered POI's projected coordinate $(X_{\text{local}}, Z_{\text{local}})$ lies within the visible diorama radius ($d_{\text{diorama}} \le mmDist \cdot 1.8$):
    - If marker does not exist in `mmPoiMarkersMap`: Instantiate via `createPoiMarkerMesh(poi)`, add to `mmPoiGroup`, and store in map.
    - If marker exists: Update position and execute idle animation step.
    - Set `marker.visible = true`.
  - If POI is outside visible bounds: Set `marker.visible = false`.
- On minimap rebuild or seed change: Cleanly remove meshes, dispose geometries/materials, and clear `mmPoiMarkersMap`.

---

## 4. POI Discovery Trigger System ($R = 36$m)

### 4.1 Coordinate Alignment & Units
- In the game engine:
  - $S = 0.5$ meters per block ($1\text{ block} = 0.5\text{m}$, $1\text{ meter} = 2\text{ blocks}$).
  - Player coordinates: $P.x, P.y, P.z$ are in **world meters**.
  - POI coordinates: $bx, by, bz$ from `POIManager` are in **world voxel blocks**.
  - POI position in meters: $(bx \cdot S, by \cdot S, bz \cdot S)$.

### 4.2 Spatial Partitioning ($L = 160$ blocks)
- Macro-cell size: $L = 160$ blocks $= 80$ meters.
- Player macro-cell coordinate:
  $$cx_{\text{macro}} = \lfloor P.x / (L \cdot S) \rfloor = \lfloor P.x / 80 \rfloor$$
  $$cz_{\text{macro}} = \lfloor P.z / (L \cdot S) \rfloor = \lfloor P.z / 80 \rfloor$$
- Discovery radius: $R_{\text{disc}} = 36$ meters.
- Since $R_{\text{disc}} = 36 < 80$, the player can only ever be within $36$m of POIs located in the current macro-cell and its immediate 8 neighbors:
  $$\Delta cx \in \{-1, 0, 1\}, \quad \Delta cz \in \{-1, 0, 1\}$$
- **Total candidate POIs evaluated per check: At most 9 POIs!**
- This guarantees $O(1)$ constant time complexity regardless of world size.

### 4.3 Trigger Evaluation Pipeline
Checked every 15 frames in `game.js:loop()` (approx. 4 times per second):
```javascript
function checkPOIDiscoveryAroundPlayer() {
  if (typeof P === 'undefined' || !window.POIManager) return;

  const L_METERS = (window.POIManager.macroCellSize || 160) * S; // 80m
  const curCellX = Math.floor(P.x / L_METERS);
  const curCellZ = Math.floor(P.z / L_METERS);
  const R_DISC_SQ = 36 * 36; // 1296 m^2

  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      const poi = window.POIManager.getPoiForCell(curCellX + dx, curCellZ + dz);
      if (!poi || window.POIManager.isDiscovered(poi.id)) continue;

      // Convert POI block coordinates to meters
      const poiXm = poi.x * S;
      const poiZm = poi.z * S;
      const distSq = (P.x - poiXm) * (P.x - poiXm) + (P.z - poiZm) * (P.z - poiZm);

      if (distSq <= R_DISC_SQ) {
        // Trigger Discovery!
        window.POIManager.discoverPOI(poi.id);
      }
    }
  }
}
```

### 4.4 Discovery Event Execution Sequence
When `window.POIManager.discoverPOI(poiId)` executes:
1. **Deduplication Check**: If `isDiscovered(poiId)` is already true, return `false`.
2. **State Update**: Add `poiId` to `discoveredPOIs` Set.
3. **Persistence**: Write updated array to `localStorage.setItem('voxel_poi_discovered_' + SEED, ...)`.
4. **XP Award**:
   ```javascript
   if (typeof window.addPlayerXP === 'function') {
     window.addPlayerXP(poi.xpReward || 50, 'discovery');
   }
   ```
5. **Audiovisual Feedback**:
   ```javascript
   if (typeof window.playDiscoveryChime === 'function') {
     window.playDiscoveryChime();
   }
   if (typeof window.showDiscoveryToast === 'function') {
     window.showDiscoveryToast(poi.name || poi.type, poi.xpReward || 50);
   }
   ```
6. **Fog of War Expansion (Landmark Special)**:
   If `poi.type === 'Landmark'`, clear Fog of War in a 12-chunk radius:
   ```javascript
   revealChunksAround(poi.x, poi.z, 12);
   ```
7. **Minimap Invalidation**: Set `mmNeedsRebuild = true`.
8. Return `true`.

---

## 5. Fog of War Integration

### 5.1 Rules of Visibility
1. **Terrain Diorama**: Rendered for all chunks in `exploredChunks` plus the player's immediate 2-chunk radius.
2. **POI Markers**: Only displayed on the diorama if:
   - The POI has been discovered (`isDiscovered(poi.id) === true`).
   - Undiscovered POIs remain invisible on the minimap, preserving the sense of adventure and exploration.
3. **Chunk Revealed Query Contract**:
   Exposed globally on `window`:
   ```javascript
   window.isChunkRevealed = function(cx, cz) {
     return exploredChunks.has(`${cx},${cz}`);
   };
   ```

### 5.2 Landmark Vista Fog Clearing
When a player reaches a `Landmark` vista (e.g. mountain watchtower / beacon):
```javascript
function revealChunksAround(blockX, blockZ, radiusChunks = 12) {
  const centerCX = Math.floor(blockX / CS);
  const centerCZ = Math.floor(blockZ / CS);
  let hasNew = false;
  for (let dx = -radiusChunks; dx <= radiusChunks; dx++) {
    for (let dz = -radiusChunks; dz <= radiusChunks; dz++) {
      if (dx * dx + dz * dz <= (radiusChunks + 0.5) * (radiusChunks + 0.5)) {
        const k = `${centerCX + dx},${centerCZ + dz}`;
        if (!exploredChunks.has(k)) {
          exploredChunks.add(k);
          hasNew = true;
        }
      }
    }
  }
  if (hasNew) {
    mmNeedsRebuild = true;
    saveExploredHistory();
  }
}
```

---

## 6. Persistence Architecture (`localStorage`)

### 6.1 Storage Keys
- **Explored Terrain Chunks**: `voxel_map_explored_${SEED}` (fallback: `voxel_map_explored_default`)
- **Discovered POIs**: `voxel_poi_discovered_${SEED}` (fallback: `voxel_poi_discovered_default`)

### 6.2 Data Lifecycle & Error Handling
```javascript
const discoveredPOIs = new Set();

function getPOIDiscoveryStorageKey() {
  return (typeof SEED !== 'undefined') ? `voxel_poi_discovered_${SEED}` : 'voxel_poi_discovered_default';
}

function loadDiscoveredPOIs() {
  try {
    const raw = localStorage.getItem(getPOIDiscoveryStorageKey());
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        list.forEach(id => discoveredPOIs.add(id));
      }
    }
  } catch (err) {
    console.warn('[Minimap] Failed to parse discovered POIs from storage:', err);
  }
}

function saveDiscoveredPOIs() {
  try {
    const list = Array.from(discoveredPOIs);
    localStorage.setItem(getPOIDiscoveryStorageKey(), JSON.stringify(list));
  } catch (err) {
    console.warn('[Minimap] Failed to save discovered POIs to storage:', err);
  }
}
```

---

## 7. Discovery HUD & Audio Feedback System

### 7.1 Discovery Toast & Banner Implementation
To support both the existing automated contract test expectation (`sandbox.showDiscoveryToast`) and the visual on-screen RPG presentation:

```javascript
function showDiscoveryToast(name, xpReward = 50) {
  // 1. Standard toast fallback for test assertion & quick notification
  const message = `Objevena lokace: ${name}!`;
  if (typeof toast === 'function') {
    toast(`🗺️ ${message} (+${xpReward} XP)`);
  }

  // 2. Enhanced visual RPG Discovery Banner if DOM element exists
  const banner = $('discoveryBanner');
  if (banner) {
    const titleEl = $('dbTitle');
    const xpEl = $('dbXp');
    if (titleEl) titleEl.textContent = name;
    if (xpEl) xpEl.textContent = `+${xpReward} XP za objevení`;

    banner.classList.remove('active');
    void banner.offsetWidth; // Force CSS reflow to re-trigger animation
    banner.classList.add('active');

    if (window._discoveryBannerTimer) clearTimeout(window._discoveryBannerTimer);
    window._discoveryBannerTimer = setTimeout(() => {
      banner.classList.remove('active');
    }, 4200);
  }
}
window.showDiscoveryToast = showDiscoveryToast;
```

### 7.2 Discovery Banner Markup (`play/index.html`)
Add into `play/index.html` inside `<body>`:
```html
<!-- On-Screen RPG Discovery Banner -->
<div id="discoveryBanner" class="discovery-banner">
  <div class="db-flair">✦ ✧ ✦</div>
  <div class="db-subtitle">NOVÁ LOKACE OBJEVENA</div>
  <div class="db-title" id="dbTitle">Prastará svatyně</div>
  <div class="db-xp" id="dbXp">+50 XP za průzkum</div>
</div>
```

### 7.3 Discovery Banner Styling (`css/style.css`)
```css
/* RPG Discovery Banner */
.discovery-banner {
  position: fixed;
  top: 14%;
  left: 50%;
  transform: translate(-50%, -20px) scale(0.92);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 18px 36px;
  background: radial-gradient(ellipse at center, rgba(15, 23, 42, 0.95) 0%, rgba(8, 12, 22, 0.98) 100%);
  border: 1px solid rgba(245, 158, 11, 0.65);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.75), 0 0 25px rgba(245, 158, 11, 0.35);
  border-radius: 8px;
  pointer-events: none;
  z-index: 1500;
  opacity: 0;
  transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1), transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  text-align: center;
}

.discovery-banner.active {
  opacity: 1;
  transform: translate(-50%, 0) scale(1.0);
}

.db-flair {
  color: #fbbf24;
  font-size: 14px;
  letter-spacing: 6px;
  margin-bottom: 4px;
}

.db-subtitle {
  color: #94a3b8;
  font-family: 'Pixelify Sans', Outfit, sans-serif;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 3px;
  text-transform: uppercase;
  margin-bottom: 6px;
}

.db-title {
  color: #f8fafc;
  font-family: 'Pixelify Sans', Outfit, sans-serif;
  font-size: 26px;
  font-weight: 700;
  letter-spacing: 1px;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.8), 0 0 16px rgba(56, 189, 248, 0.4);
  margin-bottom: 6px;
}

.db-xp {
  color: #38bdf8;
  font-family: 'Outfit', sans-serif;
  font-size: 14px;
  font-weight: 700;
  background: rgba(56, 189, 248, 0.12);
  padding: 3px 12px;
  border-radius: 9999px;
  border: 1px solid rgba(56, 189, 248, 0.3);
}
```

### 7.4 Procedural Web Audio API Discovery Chime (`js/audio.js`)
Synthesizes a fantasy landmark discovery fanfare using a 4-note ascending major arpeggio ($C_5, E_5, G_5, C_6$) with shimmering overtones:

```javascript
function playDiscoveryChime() {
  if (window.soundMuted) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const t = audioCtx.currentTime;

    const notes = [
      { freq: 523.25, time: 0.00, dur: 0.35, vol: 0.16 }, // C5
      { freq: 659.25, time: 0.09, dur: 0.38, vol: 0.18 }, // E5
      { freq: 783.99, time: 0.18, dur: 0.45, vol: 0.20 }, // G5
      { freq: 1046.50, time: 0.28, dur: 0.75, vol: 0.24 } // C6 (celestial bell)
    ];

    notes.forEach(n => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const filter = audioCtx.createBiquadFilter();

      osc.type = 'sine';
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2800, t + n.time);

      osc.frequency.setValueAtTime(n.freq, t + n.time);
      // Gentle frequency sparkle shimmer
      osc.frequency.exponentialRampToValueAtTime(n.freq * 1.008, t + n.time + n.dur);

      gain.gain.setValueAtTime(0.0001, t + n.time);
      gain.gain.linearRampToValueAtTime(n.vol, t + n.time + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + n.time + n.dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(t + n.time);
      osc.stop(t + n.time + n.dur);
    });
  } catch (e) {}
}
window.playDiscoveryChime = playDiscoveryChime;
```

---

## 8. Radar Projection Contract (`projectToRadar`)

Test `F5.2` specifies:
```javascript
projectToRadar(playerX, playerZ, targetX, targetZ, radarRadius = 60)
```
- Inputs:
  - `playerX`, `playerZ`: Coordinates of reference observer (player).
  - `targetX`, `targetZ`: Coordinates of target POI.
  - `radarRadius`: Radius cutoff in radar display units (default: 60).
- Outputs:
  - `radarX`: Polar projected X offset relative to radar center.
  - `radarY`: Polar projected Y offset relative to radar center.
  - `clamped`: Boolean indicating if target was beyond `radarRadius`.
- Implementation:
```javascript
function projectToRadar(playerX, playerZ, targetX, targetZ, radarRadius = 60) {
  const dx = targetX - playerX;
  const dz = targetZ - playerZ;
  const dist = Math.hypot(dx, dz);
  const angle = Math.atan2(dz, dx);
  const clampedDist = Math.min(dist, radarRadius);
  return {
    radarX: Math.cos(angle) * clampedDist,
    radarY: Math.sin(angle) * clampedDist,
    clamped: dist > radarRadius
  };
}
window.projectToRadar = projectToRadar;
```

---

## 9. Concrete Implementation & Integration Plan

### File Modification Map

```
js/
├── audio.js         -> Add playDiscoveryChime() and export on window
├── minimap.js       -> Add POI marker meshes, mmPoiGroup, updateMinimapMarkers(),
│                       loadDiscoveredPOIs(), saveDiscoveredPOIs(), isChunkRevealed(),
│                       and projectToRadar()
├── game.js          -> Call checkPOIDiscoveryAroundPlayer() in game loop (every 15 frames)
css/
└── style.css        -> Add styles for #discoveryBanner
play/
└── index.html       -> Add #discoveryBanner markup
```

### Detailed Code Snippet for `js/minimap.js`

```javascript
// POI Marker Group & Discovered Set
let mmPoiGroup = null;
const mmPoiMarkersMap = new Map();
const discoveredPOIs = new Set();

function getPOIDiscoveryStorageKey() {
  return (typeof SEED !== 'undefined') ? `voxel_poi_discovered_${SEED}` : 'voxel_poi_discovered_default';
}

function loadDiscoveredPOIs() {
  try {
    const raw = localStorage.getItem(getPOIDiscoveryStorageKey());
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        arr.forEach(id => discoveredPOIs.add(id));
      }
    }
  } catch (e) {}
}

function saveDiscoveredPOIs() {
  try {
    localStorage.setItem(getPOIDiscoveryStorageKey(), JSON.stringify(Array.from(discoveredPOIs)));
  } catch (e) {}
}

function isDiscovered(poiId) {
  return discoveredPOIs.has(poiId);
}

function isChunkRevealed(cx, cz) {
  return exploredChunks.has(`${cx},${cz}`);
}
window.isChunkRevealed = isChunkRevealed;

// 3D POI Marker Mesh Factory
function createPoiMarkerMesh(poi) {
  const group = new THREE.Group();
  group.userData = { id: poi.id, type: poi.type };

  switch (poi.type) {
    case 'Shrine': {
      // Cyan octahedron + orbiting torus ring
      const geo = new THREE.OctahedronGeometry(0.85, 0);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        roughness: 0.2,
        metalness: 0.8,
        flatShading: true
      });
      const core = new THREE.Mesh(geo, mat);
      group.add(core);

      const ringGeo = new THREE.TorusGeometry(1.25, 0.1, 4, 12);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x7dd3fc, wireframe: false });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.name = 'ring';
      group.add(ring);
      break;
    }
    case 'Ruins': {
      // Stone portal arch + glowing rune
      const mat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.9, flatShading: true });
      const pilGeo = new THREE.BoxGeometry(0.4, 1.4, 0.4);
      const p1 = new THREE.Mesh(pilGeo, mat); p1.position.set(-0.6, 0.7, 0); group.add(p1);
      const p2 = new THREE.Mesh(pilGeo, mat); p2.position.set(0.6, 0.7, 0); group.add(p2);
      const topGeo = new THREE.BoxGeometry(1.8, 0.35, 0.5);
      const top = new THREE.Mesh(topGeo, mat); top.position.set(0, 1.5, 0); group.add(top);

      const runeGeo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
      const runeMat = new THREE.MeshBasicMaterial({ color: 0x60a5fa });
      const rune = new THREE.Mesh(runeGeo, runeMat);
      rune.position.set(0, 0.7, 0);
      rune.name = 'rune';
      group.add(rune);
      break;
    }
    case 'Camp': {
      // Flame cone + ember blocks
      const flameGeo = new THREE.ConeGeometry(0.7, 1.4, 4);
      flameGeo.rotateY(Math.PI / 4);
      const flameMat = new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0xea580c, flatShading: true });
      const flame = new THREE.Mesh(flameGeo, flameMat);
      flame.position.y = 0.7;
      flame.name = 'flame';
      group.add(flame);

      const emberMat = new THREE.MeshStandardMaterial({ color: 0x475569, flatShading: true });
      for (let i = 0; i < 4; i++) {
        const ang = (i / 4) * Math.PI * 2;
        const emb = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.25), emberMat);
        emb.position.set(Math.cos(ang) * 0.7, 0.12, Math.sin(ang) * 0.7);
        group.add(emb);
      }
      break;
    }
    case 'Chest': {
      // Gold chest + latch
      const chestMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xb45309, roughness: 0.3, metalness: 0.6, flatShading: true });
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.6, 0.7), chestMat);
      body.position.y = 0.3;
      group.add(body);
      const lid = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.25, 0.74), chestMat);
      lid.position.y = 0.7;
      group.add(lid);
      const latch = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.2, 0.1), new THREE.MeshBasicMaterial({ color: 0xfffbeb }));
      latch.position.set(0, 0.52, 0.38);
      group.add(latch);
      break;
    }
    case 'Landmark':
    default: {
      // Watchtower beacon
      const towerMat = new THREE.MeshStandardMaterial({ color: 0x64748b, flatShading: true });
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.55, 1.8, 4), towerMat);
      tower.position.y = 0.9;
      group.add(tower);
      const beaconMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
      const beacon = new THREE.Mesh(new THREE.OctahedronGeometry(0.45, 0), beaconMat);
      beacon.position.y = 2.0;
      beacon.name = 'beacon';
      group.add(beacon);
      break;
    }
  }

  return group;
}

// Update minimap markers on each render
function updateMinimapMarkers(now) {
  if (!mmScene) return;
  if (!mmPoiGroup) {
    mmPoiGroup = new THREE.Group();
    mmScene.add(mmPoiGroup);
  }

  const centerBX = Math.floor(P.x / S) + mmPanX;
  const centerBZ = Math.floor(P.z / S) + mmPanZ;
  const centerH = height(centerBX, centerBZ);
  const miniScale = 0.42;
  const miniScaleH = 0.15;

  // Retrieve discovered POIs from POIManager or internal set
  if (window.POIManager && Array.isArray(window.POIManager.pois)) {
    window.POIManager.pois.forEach(poi => {
      if (!isDiscovered(poi.id)) return;

      let mesh = mmPoiMarkersMap.get(poi.id);
      if (!mesh) {
        mesh = createPoiMarkerMesh(poi);
        mmPoiMarkersMap.set(poi.id, mesh);
        mmPoiGroup.add(mesh);
      }

      const relX = (poi.x - centerBX) * miniScale;
      const relZ = (poi.z - centerBZ) * miniScale;
      const poiH = poi.y !== undefined ? poi.y : height(poi.x, poi.z);
      const baseY = (poiH - centerH) * miniScaleH + 1.25;

      // Position & subtle idle animations
      if (poi.type === 'Shrine') {
        mesh.position.set(relX, baseY + Math.sin(now * 0.003) * 0.18, relZ);
        mesh.rotation.y += 0.02;
        const ring = mesh.getObjectByName('ring');
        if (ring) { ring.rotation.x += 0.015; ring.rotation.y += 0.025; }
      } else if (poi.type === 'Camp') {
        mesh.position.set(relX, baseY, relZ);
        const flame = mesh.getObjectByName('flame');
        if (flame) {
          const s = 1.0 + 0.12 * Math.sin(now * 0.014);
          flame.scale.set(s, s * 1.15, s);
        }
      } else if (poi.type === 'Chest') {
        mesh.position.set(relX, baseY + Math.sin(now * 0.004) * 0.12, relZ);
        mesh.rotation.y = Math.sin(now * 0.002) * 0.25;
      } else if (poi.type === 'Landmark') {
        mesh.position.set(relX, baseY, relZ);
        mesh.rotation.y += 0.008;
      } else {
        mesh.position.set(relX, baseY, relZ);
      }
    });
  }
}
```

---

## 10. Edge Cases & Fault Tolerance Analysis

| Edge Case | Failure Scenario | Architectural Remedy |
|---|---|---|
| **World Seed Switch** | Player loads a different save world; previous discoveries pollute the new world. | Scope storage key to `voxel_poi_discovered_${SEED}`. Clear `discoveredPOIs` Set and `mmPoiMarkersMap` on seed change or world load. |
| **Missing / Delayed `POIManager`** | `minimap.js` loads or runs before `POIManager` is attached by `world.js`. | Guard with `if (window.POIManager)`. Fallback gracefully without throwing uncaught exceptions. |
| **Headless Environment (Node.js)** | Web Audio API / AudioContext or DOM elements not available in test runner. | In `playDiscoveryChime()`, check `window.soundMuted`, wrap AudioContext initialization in `try / catch`, and safely check `document.getElementById`. |
| **Rapid Player Movement (Teleport / Speedhack)** | Player moves $>80$m in a single tick, bypassing cell boundary checks. | The distance check in `game.js:loop()` evaluates all 9 cells adjacent to the current player position. Even with teleportation, the landing cell and neighbors are immediately checked upon arrival. |
| **Minimap Memory Leaks** | Continuous rebuilding creates orphaned Three.js geometries and materials. | On rebuild or close, traverse `mmPoiMarkersMap`, call `geometry.dispose()` and `material.dispose()`, and remove from `mmPoiGroup`. |
| **Duplicate Discovery Events** | Triggering discovery twice in consecutive frames awards double XP and double fanfare. | Guard `discoverPOI(id)` with `if (discoveredPOIs.has(id)) return false;` at the absolute entry point before any side effects. |

---

## 11. Verification & Test Plan

1. **Tier 1 Coverage (Tests F5.1 - F5.5)**:
   - `F5.1`: Ensure `addMinimapMarker(poi)` creates marker object matching POI properties.
   - `F5.2`: Ensure `projectToRadar(0, 0, 100, 0, 50)` clamps markers beyond radius to edge.
   - `F5.3`: Ensure `showDiscoveryToast('Prastará Svatyně')` sets toast to `'Objevena lokace: Prastará Svatyně!'`.
   - `F5.4`: Ensure discovery awards 50 XP to player.
   - `F5.5`: Ensure undiscovered chunks remain in Fog of War.
2. **Tier 3 Pairwise (T3.2.1 - T3.2.4)**:
   - Verify player traversing into undiscovered POI triggers discovery, awards XP, pushes player across level thresholds, and prevents duplicate XP on re-entry.
3. **Tier 4 Scenario (T4.1)**:
   - Player spawn $\to$ travel $\to$ discover 2 landmarks $\to$ level up to Lv2.
4. **Visual & Auditory Manual Verification**:
   - Open 3D minimap (`[M]`).
   - Walk within $36$m of a shrine or ruins.
   - Confirm ascending Web Audio arpeggio chime plays, discovery banner animates on screen, and corresponding glowing 3D marker appears on the diorama.
