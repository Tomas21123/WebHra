// ---------- 3D Voxelová Minimapa (Cube World Style) s pamětí prozkoumaného území ----------
let minimapOpen = false;
let minimapExpanded = false;
let mmRenderer = null, mmScene = null, mmCam = null;
let mmTerrainMesh = null, mmPlayerMarker = null;
let mmRotY = 0.785, mmPitch = 0.62, mmDist = 34;
let mmIsDragging = false, mmIsPanning = false, mmLastX = 0, mmLastY = 0;
let mmLastXPos = -9999, mmLastZPos = -9999;
let mmZoomLevel = 1; // 0 = detail, 1 = standard, 2 = široký přehled
let mmNeedsRebuild = true;
let mmPanX = 0, mmPanZ = 0; // Posun středu dioramatu v blocích vůči hráči

// Paměť prozkoumaných oblastí (Fog of War)
const exploredChunks = new Set();
let lastExploredSaveTime = 0;

const MM_SIZES = [
  { step: 1.0, name: 'Detailní (vysoké rozlišení)' },
  { step: 2.0, name: 'Standardní (přehledná miniatura)' },
  { step: 4.0, name: 'Široký (kontinentální přehled)' }
];

// Načtení a uložení prozkoumaného území
function loadExploredHistory() {
  try {
    const key = (typeof SEED !== 'undefined') ? `voxel_map_explored_${SEED}` : 'voxel_map_explored_default';
    const saved = localStorage.getItem(key);
    if (saved) {
      const arr = JSON.parse(saved);
      if (Array.isArray(arr)) {
        arr.forEach(k => exploredChunks.add(k));
      }
    }
  } catch (e) {}
}

function saveExploredHistory() {
  const now = performance.now();
  if (now - lastExploredSaveTime < 3000) return; // Debounce 3 sekundy
  lastExploredSaveTime = now;
  try {
    const key = (typeof SEED !== 'undefined') ? `voxel_map_explored_${SEED}` : 'voxel_map_explored_default';
    const arr = Array.from(exploredChunks);
    // Ukládat maximálně 500 nejrelevantnějších chunků pro úsporu místa
    const toSave = arr.length > 500 ? arr.slice(-500) : arr;
    localStorage.setItem(key, JSON.stringify(toSave));
  } catch (e) {}
}

// Zaznamenání nově navštíveného území kolem aktuální pozice hráče
function markExploredAroundPlayer() {
  if (typeof P === 'undefined') return;
  const pcx = Math.floor(P.x / (CS * S));
  const pcz = Math.floor(P.z / (CS * S));

  // Hráč odkrývá své bezprostřední okolí v okruhu 2 chunků (cca 32-40 bloků)
  const r = 2;
  let hasNew = false;
  for (let dx = -r; dx <= r; dx++) {
    for (let dz = -r; dz <= r; dz++) {
      if (dx * dx + dz * dz <= (r + 0.5) * (r + 0.5)) {
        const k = `${pcx + dx},${pcz + dz}`;
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

function getMinimapViewportDimensions() {
  const box = $('minimapBox');
  const viewport = box ? box.querySelector('.minimap-viewport') : null;
  const w = (viewport && viewport.clientWidth > 0) ? viewport.clientWidth : Math.max(320, window.innerWidth - 32);
  const h = (viewport && viewport.clientHeight > 0) ? viewport.clientHeight : Math.max(240, window.innerHeight - 120);
  return { w, h };
}

function toggleMinimap(force) {
  minimapOpen = (force !== undefined) ? force : !minimapOpen;
  const box = $('minimapBox');
  if (!box) return;
  box.hidden = !minimapOpen;

  if (minimapOpen) {
    if (document.exitPointerLock) {
      try { document.exitPointerLock(); } catch(e) {}
    }
    if (!mmRenderer) initMinimap();
    markExploredAroundPlayer();
    mmNeedsRebuild = true;
    requestAnimationFrame(() => {
      updateMinimapSize();
      updateMinimapCam();
    });
    toast('3D Mapa světa: Otevřena na celou obrazovku [M]');
  } else {
    try { (window.cv || (window.renderer && renderer.domElement))?.requestPointerLock(); } catch (e) {}
    toast('3D Mapa: Zavřeno [M]');
  }
}

function initMinimap() {
  const canvas = $('minimapCanvas');
  if (!canvas) return;

  loadExploredHistory();
  markExploredAroundPlayer();

  const { w, h } = getMinimapViewportDimensions();

  mmRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  mmRenderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  mmRenderer.setSize(w, h);

  mmScene = new THREE.Scene();
  mmScene.background = new THREE.Color(0x0c1322);

  mmCam = new THREE.PerspectiveCamera(38, w / h, 0.5, 450);

  // Osvětlení ve stylu Cube World dioramatu
  const ambient = new THREE.AmbientLight(0xffffff, 0.78);
  mmScene.add(ambient);

  const sun = new THREE.DirectionalLight(0xfffae8, 0.9);
  sun.position.set(1.4, 2.8, 1.1);
  mmScene.add(sun);

  const rim = new THREE.DirectionalLight(0x76a0d0, 0.45);
  rim.position.set(-1.8, 1.4, -1.5);
  mmScene.add(rim);

  // 3D Voxelová Značka Hráče (svítící šipka ve stylu Cube World)
  mmPlayerMarker = (() => {
    const group = new THREE.Group();

    // Voxelová šipka
    const pointerGeo = new THREE.ConeGeometry(0.85, 1.7, 4);
    pointerGeo.rotateX(Math.PI / 2);
    pointerGeo.rotateY(Math.PI / 4);
    const pointerMat = new THREE.MeshBasicMaterial({ color: 0x00f5ff });
    const pointer = new THREE.Mesh(pointerGeo, pointerMat);
    pointer.scale.set(0.7, 0.35, 1.1);
    group.add(pointer);

    // Vnější pulzující prstenec
    const ringGeo = new THREE.RingGeometry(0.9, 1.2, 16);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffd700, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = -0.3;
    group.add(ring);

    mmScene.add(group);
    return group;
  })();

  // Ovládání myší: levé tlačítko = rotace dioramatu, pravé tlačítko / Shift = posun (Pan)
  canvas.addEventListener('contextmenu', e => e.preventDefault());

  canvas.addEventListener('mousedown', e => {
    if (e.button === 2 || e.shiftKey) {
      mmIsPanning = true;
    } else {
      mmIsDragging = true;
    }
    mmLastX = e.clientX;
    mmLastY = e.clientY;
  });

  window.addEventListener('mousemove', e => {
    if ((!mmIsDragging && !mmIsPanning) || !minimapOpen) return;
    const dx = e.clientX - mmLastX, dy = e.clientY - mmLastY;
    mmLastX = e.clientX;
    mmLastY = e.clientY;

    if (mmIsPanning) {
      // Posun středu mapy podle úhlu kamery
      const panSpeed = (mmDist * 0.0035);
      const cosR = Math.cos(mmRotY), sinR = Math.sin(mmRotY);
      mmPanX += (-dx * cosR - dy * sinR) * panSpeed * (1 / 0.45);
      mmPanZ += (dx * sinR - dy * cosR) * panSpeed * (1 / 0.45);
      mmNeedsRebuild = true;
    } else {
      // Rotace kamery kolem středu
      mmRotY += dx * 0.014;
      mmPitch = Math.max(0.12, Math.min(1.42, mmPitch + dy * 0.011));
    }
    updateMinimapCam();
  });

  window.addEventListener('mouseup', () => {
    mmIsDragging = false;
    mmIsPanning = false;
  });

  // Zoom kolečkem myši (plynulý rozsah od 18 do 280)
  canvas.addEventListener('wheel', e => {
    if (!minimapOpen) return;
    mmDist = Math.max(16, Math.min(280, mmDist + e.deltaY * 0.05));
    updateMinimapCam();
    e.preventDefault();
  }, { passive: false });

  // Tlačítka ovládání minimapy
  $('mmRotL').onclick = () => { mmRotY -= Math.PI / 4; updateMinimapCam(); };
  $('mmRotR').onclick = () => { mmRotY += Math.PI / 4; updateMinimapCam(); };

  // Vycentrování na hráče
  $('mmCenter').onclick = () => {
    mmPanX = 0;
    mmPanZ = 0;
    mmRotY = (typeof face !== 'undefined') ? face + Math.PI : 0.785;
    mmPitch = 0.62;
    mmDist = 34;
    mmNeedsRebuild = true;
    updateMinimapCam();
    toast('Pohled vycentrován na hráče');
  };

  // Zobrazení celého objeveného území (Fit All)
  const btnFitAll = $('mmFitAll');
  if (btnFitAll) {
    btnFitAll.onclick = fitAllExploredTerrain;
  }

  $('mmZoomIn').onclick = () => {
    mmDist = Math.max(18, mmDist * 0.75);
    updateMinimapCam();
  };
  $('mmZoomOut').onclick = () => {
    mmDist = Math.min(260, mmDist * 1.35);
    updateMinimapCam();
  };

  $('mmExpandBtn').onclick = () => {
    minimapExpanded = !minimapExpanded;
    updateMinimapSize();
  };

  $('mmCloseBtn').onclick = () => toggleMinimap(false);

  updateMinimapCam();
}

// Zobrazení celého objeveného území
function fitAllExploredTerrain() {
  if (exploredChunks.size === 0) return;

  let minCX = Infinity, maxCX = -Infinity;
  let minCZ = Infinity, maxCZ = -Infinity;

  exploredChunks.forEach(k => {
    const [cx, cz] = k.split(',').map(Number);
    if (cx < minCX) minCX = cx;
    if (cx > maxCX) maxCX = cx;
    if (cz < minCZ) minCZ = cz;
    if (cz > maxCZ) maxCZ = cz;
  });

  const curBX = Math.floor(P.x / S);
  const curBZ = Math.floor(P.z / S);

  const midBX = Math.floor(((minCX + maxCX) / 2) * CS + CS / 2);
  const midBZ = Math.floor(((minCZ + maxCZ) / 2) * CS + CS / 2);

  // Nastavit posun na střed všech objevených chunků
  mmPanX = midBX - curBX;
  mmPanZ = midBZ - curBZ;

  // Spočítat potřebnou vzdálenost kamery
  const spanBlocksX = (maxCX - minCX + 1) * CS;
  const spanBlocksZ = (maxCZ - minCZ + 1) * CS;
  const maxSpan = Math.max(spanBlocksX, spanBlocksZ);

  mmDist = Math.max(40, Math.min(270, maxSpan * 0.45 * 1.25));
  mmPitch = 0.75;
  mmNeedsRebuild = true;
  updateMinimapCam();

  toast(`Celá mapa: ${exploredChunks.size} objevených oblastí`);
}

function updateMinimapSize() {
  const box = $('minimapBox');
  if (!box || !mmRenderer) return;

  const { w, h } = getMinimapViewportDimensions();
  mmRenderer.setSize(w, h);
  if (mmCam) {
    mmCam.aspect = w / h;
    mmCam.updateProjectionMatrix();
  }
}

window.addEventListener('resize', () => {
  if (minimapOpen) {
    updateMinimapSize();
  }
});

function updateMinimapCam() {
  if (!mmCam) return;
  const cy = Math.sin(mmPitch) * mmDist;
  const cd = Math.cos(mmPitch) * mmDist;
  const cx = Math.sin(mmRotY) * cd;
  const cz = Math.cos(mmRotY) * cd;
  mmCam.position.set(cx, cy + 4, cz);
  mmCam.lookAt(0, 0, 0);

  // Kompas rotace
  const compass = $('mmCompass');
  if (compass) {
    const deg = Math.round((-mmRotY * 180 / Math.PI) % 360);
    compass.style.transform = `rotate(${deg}deg)`;
  }
}

// Generování miniaturního 3D voxelového dioramatu pro všechna prozkoumaná území
function buildMinimapTerrainMesh() {
  if (!mmScene) return;

  markExploredAroundPlayer();

  // Střed zobrazení v blocích (hráč + volitelný posun kamerou)
  const centerBX = Math.floor(P.x / S) + mmPanX;
  const centerBZ = Math.floor(P.z / S) + mmPanZ;
  const centerH = height(centerBX, centerBZ);

  const miniScale = 0.42; // Měřítko voxelů v dioramatické scéně
  const miniScaleH = 0.15; // Vertikální měřítko výšek

  // Všechny chunky k vykreslení: prozkoumané chunky + okamžité okolí hráče
  const chunksToRender = new Set(exploredChunks);

  const curCX = Math.floor(P.x / (CS * S));
  const curCZ = Math.floor(P.z / (CS * S));
  for (let dx = -2; dx <= 2; dx++) {
    for (let dz = -2; dz <= 2; dz++) {
      chunksToRender.add(`${curCX + dx},${curCZ + dz}`);
    }
  }

  // Přizpůsobení hustoty kroků počtu chunků, aby byl rendering bleskový
  // Krok 2 bloky = 8x8 sloupků na chunk (vysoká věrnost terénu a 60 FPS i při stovkách chunků)
  const step = chunksToRender.size > 120 ? 4 : 2;

  const positions = [];
  const colors = [];

  const addQuad = (p0, p1, p2, p3, rgb) => {
    positions.push(
      p0[0], p0[1], p0[2],
      p1[0], p1[1], p1[2],
      p2[0], p2[1], p2[2],
      p0[0], p0[1], p0[2],
      p2[0], p2[1], p2[2],
      p3[0], p3[1], p3[2]
    );
    for (let i = 0; i < 6; i++) colors.push(rgb[0], rgb[1], rgb[2]);
  };

  // Procházení každého prozkoumaného chunku
  chunksToRender.forEach(chunkKey => {
    const [cx, cz] = chunkKey.split(',').map(Number);
    const chunkOriginX = cx * CS;
    const chunkOriginZ = cz * CS;

    for (let lz = 0; lz < CS; lz += step) {
      for (let lx = 0; lx < CS; lx += step) {
        const bx = chunkOriginX + lx;
        const bz = chunkOriginZ + lz;

        const h = height(bx, bz);
        const bi = biome(bx, bz, h);
        const isWater = h < SEA;
        const renderH = isWater ? SEA : h;
        const yTop = (renderH - centerH) * miniScaleH;

        // Pozice v lokálním souřadném systému scény dioramatu
        const x0 = (bx - centerBX) * miniScale;
        const x1 = (bx + step - centerBX) * miniScale;
        const z0 = (bz - centerBZ) * miniScale;
        const z1 = (bz + step - centerBZ) * miniScale;

        // Barva voxelového povrchu (věrně odpovídající hernímu terénu)
        let r = 0.32, g = 0.63, b = 0.24; // Tráva

        if (isWater) {
          r = 0.14; g = 0.44; b = 0.78; // Hluboká voda
        } else if (h <= SEA + 2 || bi === 1) {
          r = 0.86; g = 0.73; b = 0.44; // Písek / Poušť / Pláž
        } else if (h >= 135 || bi === 2) {
          if (h >= 150) { r = 0.96; g = 0.98; b = 1.0; } // Sníh
          else { r = 0.82; g = 0.86; b = 0.92; } // Led
        } else if (h >= 80) {
          r = 0.48; g = 0.52; b = 0.58; // Skála
        } else if (bi === 3) {
          r = 0.18; g = 0.54; b = 0.20; // Džungle
        } else if (bi === 0) {
          const lum = 0.85 + (h / 80) * 0.22;
          r = 0.30 * lum; g = 0.62 * lum; b = 0.22 * lum;
        }

        // 1. Horní stěna miniaturního voxelu
        addQuad(
          [x0, yTop, z0],
          [x0, yTop, z1],
          [x1, yTop, z1],
          [x1, yTop, z0],
          [r, g, b]
        );

        // 2. Kaskádovité boční stěny (Stepped Voxel Sides pro 3D plasticitu)
        const hW = height(bx - step, bz);
        const hE = height(bx + step, bz);
        const hN = height(bx, bz - step);
        const hS = height(bx, bz + step);

        const rHW = hW < SEA ? SEA : hW;
        const rHE = hE < SEA ? SEA : hE;
        const rHN = hN < SEA ? SEA : hN;
        const rHS = hS < SEA ? SEA : hS;

        if (renderH > rHW) {
          const yBot = (rHW - centerH) * miniScaleH;
          addQuad([x0, yTop, z1], [x0, yTop, z0], [x0, yBot, z0], [x0, yBot, z1], [r * 0.72, g * 0.72, b * 0.72]);
        }
        if (renderH > rHE) {
          const yBot = (rHE - centerH) * miniScaleH;
          addQuad([x1, yTop, z0], [x1, yTop, z1], [x1, yBot, z1], [x1, yBot, z0], [r * 0.82, g * 0.82, b * 0.82]);
        }
        if (renderH > rHN) {
          const yBot = (rHN - centerH) * miniScaleH;
          addQuad([x0, yTop, z0], [x1, yTop, z0], [x1, yBot, z0], [x0, yBot, z0], [r * 0.62, g * 0.62, b * 0.62]);
        }
        if (renderH > rHS) {
          const yBot = (rHS - centerH) * miniScaleH;
          addQuad([x1, yTop, z1], [x0, yTop, z1], [x0, yBot, z1], [x1, yBot, z1], [r * 0.78, g * 0.78, b * 0.78]);
        }

        // 3. Miniaturní koruny stromů na zalesněném povrchu
        if (!isWater && bi === 0 && h > SEA + 4 && h < 80) {
          if (h2(bx * 7 + 3, bz * 13 + 5) > 0.94) {
            const tw = step * 0.75, th = step * 0.9;
            const ty0 = yTop, ty1 = yTop + th * miniScaleH * 2.5;
            const tx0 = x0 + (x1 - x0) * 0.15, tx1 = x1 - (x1 - x0) * 0.15;
            const tz0 = z0 + (z1 - z0) * 0.15, tz1 = z1 - (z1 - z0) * 0.15;
            const treeCol = [0.18, 0.48, 0.16];
            addQuad([tx0, ty1, tz0], [tx0, ty1, tz1], [tx1, ty1, tz1], [tx1, ty1, tz0], treeCol);
            addQuad([tx0, ty1, tz1], [tx0, ty1, tz0], [tx0, ty0, tz0], [tx0, ty0, tz1], [treeCol[0]*0.7, treeCol[1]*0.7, treeCol[2]*0.7]);
            addQuad([tx1, ty1, tz0], [tx1, ty1, tz1], [tx1, ty0, tz1], [tx1, ty0, tz0], [treeCol[0]*0.8, treeCol[1]*0.8, treeCol[2]*0.8]);
          }
        }
      }
    }
  });

  if (mmTerrainMesh) {
    mmScene.remove(mmTerrainMesh);
    mmTerrainMesh.geometry.dispose();
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  mmTerrainMesh = new THREE.Mesh(geo, mat);
  mmScene.add(mmTerrainMesh);
}

// Aktualizace minimapy v hlavní smyčce hry
function updateMinimap(dt, now) {
  if (!minimapOpen || !mmRenderer) return;

  const curBX = Math.floor(P.x / S);
  const curBZ = Math.floor(P.z / S);
  const curH = height(curBX, curBZ);
  const curBio = biome(curBX, curBZ, curH);

  // Průběžná aktualizace prozkoumaného okolí při pohybu
  const movedDist = Math.hypot(curBX - mmLastXPos, curBZ - mmLastZPos);
  if (movedDist >= 12) {
    mmLastXPos = curBX;
    mmLastZPos = curBZ;
    markExploredAroundPlayer();
  }

  // Přegenerování dioramatu při požadavku
  if (mmNeedsRebuild) {
    mmNeedsRebuild = false;
    buildMinimapTerrainMesh();
  }

  // Aktualizace polohy značky hráče na dioramatu
  if (mmPlayerMarker) {
    const centerBX = Math.floor(P.x / S) + mmPanX;
    const centerBZ = Math.floor(P.z / S) + mmPanZ;
    const centerH = height(centerBX, centerBZ);
    const miniScale = 0.42;
    const miniScaleH = 0.15;

    // Relativní poloha hráče vůči středu dioramatu
    const playerRelX = (curBX - centerBX) * miniScale;
    const playerRelZ = (curBZ - centerBZ) * miniScale;
    const playerLocalY = (P.y / S - centerH) * miniScaleH + 0.65;
    const hoverBob = Math.sin(now * 0.005) * 0.12;

    mmPlayerMarker.position.set(playerRelX, playerLocalY + hoverBob, playerRelZ);
    if (typeof model !== 'undefined' && model) {
      mmPlayerMarker.rotation.y = model.rotation.y;
    }
  }

  // Aktualizace souřadnic v HUD minimapy
  const coordsEl = $('mmCoords');
  if (coordsEl) {
    coordsEl.textContent = `X: ${curBX} · Y: ${Math.round(P.y / S)} · Z: ${curBZ}`;
  }

  // Informace o biomu
  const biomeEl = $('mmBiome');
  if (biomeEl) {
    let bName = '🌲 Horský les & louky';
    if (P.y / S <= SEA) bName = '🌊 Moře & oceán';
    else if (curH <= SEA + 2) bName = '🏖️ Písečná pláž';
    else if (curBio === 1) bName = '🏜️ Vyprahlá poušť';
    else if (curBio === 2 || curH >= 120) bName = '🏔️ Sněžný štít';
    else if (curBio === 3) bName = '🌴 Džungle & prales';
    else if (curH >= 80) bName = '⛰️ Skalnaté hory';
    biomeEl.textContent = bName;
  }

  // Počítadlo prozkoumaného území
  const expEl = $('mmExplored');
  if (expEl) {
    expEl.textContent = `🗺️ Objeveno: ${exploredChunks.size} oblastí`;
  }

  // 3D POI Značky na dioramatu (F5)
  updateMinimapMarkers(now);

  updateMinimapCam();
  mmRenderer.render(mmScene, mmCam);
}

// ============================================================================
// 3D Minimap Markers & Discovery System (Milestone 2 - F5)
// ============================================================================
let mmPoiGroup = null;
const mmPoiMarkersMap = new Map();

function createPoiMarkerMesh(poi) {
  if (typeof THREE === 'undefined') return null;
  const group = new THREE.Group();
  group.userData = { id: poi.id, type: poi.type };

  const normType = String(poi.type || '').toLowerCase();

  if (normType === 'shrine') {
    // Vznášející se azurový oktaedr s rotujícím prstencem
    const geo = new THREE.OctahedronGeometry(0.85, 0);
    const mat = (typeof THREE.MeshStandardMaterial !== 'undefined')
      ? new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, roughness: 0.2, metalness: 0.8, flatShading: true })
      : new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const core = new THREE.Mesh(geo, mat);
    group.add(core);

    const ringGeo = new THREE.TorusGeometry(1.25, 0.1, 4, 12);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x7dd3fc });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.name = 'ring';
    group.add(ring);
  } else if (normType === 'ruins') {
    // Kamenná klenba s prastarou runou
    const mat = (typeof THREE.MeshLambertMaterial !== 'undefined')
      ? new THREE.MeshLambertMaterial({ color: 0x94a3b8 })
      : new THREE.MeshBasicMaterial({ color: 0x94a3b8 });
    const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.4, 0.4), mat); p1.position.set(-0.6, 0.7, 0); group.add(p1);
    const p2 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.4, 0.4), mat); p2.position.set(0.6, 0.7, 0); group.add(p2);
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.35, 0.5), mat); top.position.set(0, 1.5, 0); group.add(top);

    const rune = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), new THREE.MeshBasicMaterial({ color: 0x60a5fa }));
    rune.position.set(0, 0.7, 0);
    rune.name = 'rune';
    group.add(rune);
  } else if (normType === 'camp') {
    // Táborový oheň s plamenem a uhlíky
    const flameGeo = new THREE.ConeGeometry(0.7, 1.4, 4);
    flameGeo.rotateY(Math.PI / 4);
    const flameMat = (typeof THREE.MeshStandardMaterial !== 'undefined')
      ? new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0xea580c, flatShading: true })
      : new THREE.MeshBasicMaterial({ color: 0xf97316 });
    const flame = new THREE.Mesh(flameGeo, flameMat);
    flame.position.y = 0.7;
    flame.name = 'flame';
    group.add(flame);

    const emberMat = new THREE.MeshBasicMaterial({ color: 0x475569 });
    for (let i = 0; i < 4; i++) {
      const ang = (i / 4) * Math.PI * 2;
      const emb = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.25), emberMat);
      emb.position.set(Math.cos(ang) * 0.7, 0.12, Math.sin(ang) * 0.7);
      group.add(emb);
    }
  } else if (normType === 'chest') {
    // Zlatá pokladnice se zámkem
    const chestMat = (typeof THREE.MeshStandardMaterial !== 'undefined')
      ? new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xb45309, roughness: 0.3, metalness: 0.6, flatShading: true })
      : new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.6, 0.7), chestMat);
    body.position.y = 0.3;
    group.add(body);
    const lid = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.25, 0.74), chestMat);
    lid.position.y = 0.7;
    group.add(lid);
    const latch = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.2, 0.1), new THREE.MeshBasicMaterial({ color: 0xfffbeb }));
    latch.position.set(0, 0.52, 0.38);
    group.add(latch);
  } else {
    // Strážní věž / Maják
    const towerMat = (typeof THREE.MeshLambertMaterial !== 'undefined')
      ? new THREE.MeshLambertMaterial({ color: 0x64748b })
      : new THREE.MeshBasicMaterial({ color: 0x64748b });
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.55, 1.8, 4), towerMat);
    tower.position.y = 0.9;
    group.add(tower);
    const beacon = new THREE.Mesh(new THREE.OctahedronGeometry(0.45, 0), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    beacon.position.y = 2.0;
    beacon.name = 'beacon';
    group.add(beacon);
  }

  return group;
}

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

  if (window.POIManager) {
    const list = window.POIManager.pois || [];
    for (const poi of list) {
      if (!window.POIManager.isDiscovered(poi.id)) {
        const existing = mmPoiMarkersMap.get(poi.id);
        if (existing) existing.visible = false;
        continue;
      }

      let mesh = mmPoiMarkersMap.get(poi.id);
      if (!mesh) {
        mesh = createPoiMarkerMesh(poi);
        if (mesh) {
          mmPoiMarkersMap.set(poi.id, mesh);
          mmPoiGroup.add(mesh);
        }
      }

      if (!mesh) continue;
      mesh.visible = true;

      const poiBX = (typeof poi.x === 'number') ? poi.x : (poi.bx || 0);
      const poiBZ = (typeof poi.z === 'number') ? poi.z : (poi.bz || 0);
      const poiBY = (typeof poi.y === 'number') ? poi.y : (poi.by || height(poiBX, poiBZ));

      const relX = (poiBX - centerBX) * miniScale;
      const relZ = (poiBZ - centerBZ) * miniScale;
      const baseY = (poiBY - centerH) * miniScaleH + 1.25;

      const normType = String(poi.type || '').toLowerCase();
      if (normType === 'shrine') {
        mesh.position.set(relX, baseY + Math.sin(now * 0.003) * 0.18, relZ);
        mesh.rotation.y += 0.02;
        const ring = mesh.getObjectByName('ring');
        if (ring) { ring.rotation.x += 0.015; ring.rotation.y += 0.025; }
      } else if (normType === 'camp') {
        mesh.position.set(relX, baseY, relZ);
        const flame = mesh.getObjectByName('flame');
        if (flame) {
          const s = 1.0 + 0.12 * Math.sin(now * 0.014);
          flame.scale.set(s, s * 1.15, s);
        }
      } else if (normType === 'chest') {
        mesh.position.set(relX, baseY + Math.sin(now * 0.004) * 0.12, relZ);
        mesh.rotation.y = Math.sin(now * 0.002) * 0.25;
      } else if (normType === 'landmark') {
        mesh.position.set(relX, baseY, relZ);
        mesh.rotation.y += 0.008;
      } else {
        mesh.position.set(relX, baseY, relZ);
      }
    }
  }
}

// Projekce na 2D radar s oříznutím na hranu
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

// Kontrola odhalení chunku v mlze (Fog of War)
function isChunkRevealed(cx, cz) {
  return exploredChunks.has(`${cx},${cz}`);
}

// Zobrazení RPG banneru a toastu při objevení lokace
function showDiscoveryToast(name, xpReward = 50) {
  const message = `Objevena lokace: ${name}!`;
  if (typeof toast === 'function') {
    toast(`🗺️ ${message} (+${xpReward} XP)`);
  }

  if (typeof document !== 'undefined') {
    const banner = document.getElementById('discoveryBanner');
    if (banner) {
      const titleEl = document.getElementById('dbTitle');
      const xpEl = document.getElementById('dbXp');
      if (titleEl) titleEl.textContent = name;
      if (xpEl) xpEl.textContent = `+${xpReward} XP za objevení`;

      banner.classList.remove('active');
      void banner.offsetWidth; // Force CSS reflow
      banner.classList.add('active');

      if (window._discoveryBannerTimer) clearTimeout(window._discoveryBannerTimer);
      window._discoveryBannerTimer = setTimeout(() => {
        banner.classList.remove('active');
      }, 4200);
    }
  }
}

// Export do globálního okna
if (typeof window !== 'undefined') {
  window.projectToRadar = projectToRadar;
  window.isChunkRevealed = isChunkRevealed;
  window.showDiscoveryToast = showDiscoveryToast;
  window.updateMinimapMarkers = updateMinimapMarkers;
}

