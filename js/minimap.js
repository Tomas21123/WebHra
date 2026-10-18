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
function getMinimapStorageKey() {
  const sKey = (typeof SEED !== 'undefined') ? SEED : 'default';
  try {
    if (typeof GameStorage !== 'undefined' && typeof GameStorage.getActiveGame === 'function') {
      const act = GameStorage.getActiveGame();
      if (act && (act.worldId || act.id)) {
        return `voxel_map_explored_v2_${act.worldId || act.id}_${sKey}`;
      }
    }
  } catch (e) {}
  return `voxel_map_explored_v2_${sKey}`;
}

function loadExploredHistory() {
  try {
    const key = getMinimapStorageKey();
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
    const key = getMinimapStorageKey();
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
    toast('3D Mapa světa: Klikni na objevenou budovu pro teleportaci [M]');
  } else {
    closeMinimapTeleportPrompt();
    const tt = $('mmPoiTooltip');
    if (tt) tt.hidden = true;
    try { (window.cv || (window.renderer && renderer.domElement))?.requestPointerLock(); } catch (e) {}
    toast('3D Mapa: Zavřeno [M]');
  }
}

let mmDownClientX = 0, mmDownClientY = 0, mmMovedDuringDrag = false;
let mmSelectedTeleportPoi = null;

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

  // 3D Voxelová Značka Hráče (složená z kostek)
  mmPlayerMarker = (() => {
    const group = new THREE.Group();
    const pointerMat = new THREE.MeshBasicMaterial({ color: 0x00f5ff });
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.35, 0.55), pointerMat);
    tip.position.set(0, 0, 0.55);
    group.add(tip);
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.35, 0.65), pointerMat);
    body.position.set(0, 0, -0.05);
    group.add(body);

    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffd700 });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const seg = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 0.28), ringMat);
      seg.position.set(Math.cos(a) * 1.05, -0.3, Math.sin(a) * 1.05);
      group.add(seg);
    }

    mmScene.add(group);
    return group;
  })();

  // Ovládání myší: levé tlačítko = kliknutí na budovu / rotace dioramatu, pravé tlačítko / Shift = posun (Pan)
  canvas.addEventListener('contextmenu', e => e.preventDefault());

  canvas.addEventListener('mousedown', e => {
    if (e.button === 2 || e.shiftKey) {
      mmIsPanning = true;
    } else if (e.button === 0) {
      mmIsDragging = true;
    }
    mmLastX = e.clientX;
    mmLastY = e.clientY;
    mmDownClientX = e.clientX;
    mmDownClientY = e.clientY;
    mmMovedDuringDrag = false;
  });

  canvas.addEventListener('mousemove', e => {
    if (!minimapOpen) return;
    if (!mmIsDragging && !mmIsPanning) {
      updateMinimapHoverTooltip(e.clientX, e.clientY);
    }
  });

  canvas.addEventListener('mouseleave', () => {
    const tt = $('mmPoiTooltip');
    if (tt) tt.hidden = true;
  });

  window.addEventListener('mousemove', e => {
    if ((!mmIsDragging && !mmIsPanning) || !minimapOpen) return;
    const dx = e.clientX - mmLastX, dy = e.clientY - mmLastY;
    if (Math.hypot(e.clientX - mmDownClientX, e.clientY - mmDownClientY) > 6) {
      mmMovedDuringDrag = true;
      const tt = $('mmPoiTooltip');
      if (tt) tt.hidden = true;
    }
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

  window.addEventListener('mouseup', e => {
    const wasLeftDrag = mmIsDragging;
    mmIsDragging = false;
    mmIsPanning = false;

    if (wasLeftDrag && e.button === 0 && !mmMovedDuringDrag && minimapOpen) {
      const rect = canvas.getBoundingClientRect();
      if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
        const hitPoi = findPoiMarkerAtClientPos(e.clientX, e.clientY);
        if (hitPoi) {
          openMinimapTeleportPrompt(hitPoi);
        }
      }
    }
  });

  // Napojení modalu teleportace
  const tpCancelBtn = $('mmTpCancelBtn');
  if (tpCancelBtn) tpCancelBtn.onclick = () => closeMinimapTeleportPrompt();
  const tpConfirmBtn = $('mmTpConfirmBtn');
  if (tpConfirmBtn) tpConfirmBtn.onclick = () => confirmMinimapTeleport();
  const tpModal = $('mmTeleportModal');
  if (tpModal) {
    tpModal.addEventListener('click', e => {
      if (e.target === tpModal) closeMinimapTeleportPrompt();
    });
  }

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
    let bKey = 'forest';
    if (P.y / S <= SEA) { bName = '🌊 Moře & oceán'; bKey = 'ocean'; }
    else if (curH <= SEA + 2) { bName = '🏖️ Písečná pláž'; bKey = 'beach'; }
    else if (curBio === 1) { bName = '🏜️ Vyprahlá poušť'; bKey = 'desert'; }
    else if (curBio === 2 || curH >= 120) { bName = '🏔️ Sněžný štít'; bKey = 'snow'; }
    else if (curBio === 3) { bName = '🌴 Džungle & prales'; bKey = 'jungle'; }
    else if (curH >= 80) { bName = '⛰️ Skalnaté hory'; bKey = 'mountains'; }
    biomeEl.textContent = bName;

    // Průzkumná mechanika: Objevení nového biomu přináší průzkumné XP
    if (typeof window !== 'undefined' && bKey !== 'ocean') {
      if (!window._discoveredBiomes) {
        window._discoveredBiomes = new Set();
        try {
          const saved = localStorage.getItem('voxel_discovered_biomes');
          if (saved) JSON.parse(saved).forEach(k => window._discoveredBiomes.add(k));
        } catch (e) {}
      }
      if (!window._discoveredBiomes.has(bKey)) {
        window._discoveredBiomes.add(bKey);
        try {
          localStorage.setItem('voxel_discovered_biomes', JSON.stringify(Array.from(window._discoveredBiomes)));
        } catch (e) {}
        if (typeof showDiscoveryToast === 'function') {
          showDiscoveryToast(`Nový biom: ${bName}`, 75);
        }
        if (typeof window.addPlayerXP === 'function') {
          window.addPlayerXP(75, 'biome_exploration');
        }
      }
    }
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
  group.userData = { id: poi.id, type: poi.type, poi };

  const normType = String(poi.type || '').toLowerCase();
  const addBox = (parent, w, h, d, x, y, z, mat, name) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.userData = { id: poi.id, type: poi.type, poi };
    if (name) m.name = name;
    parent.add(m);
    return m;
  };

  if (normType === 'shrine') {
    // Voxelový chrám se stupňovitým krystalem a prstencem z kostiček
    const stoneMat = (typeof THREE.MeshLambertMaterial !== 'undefined')
      ? new THREE.MeshLambertMaterial({ color: 0xcbd5e1 })
      : new THREE.MeshBasicMaterial({ color: 0xcbd5e1 });
    const crystalMat = (typeof THREE.MeshStandardMaterial !== 'undefined')
      ? new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, roughness: 0.2, metalness: 0.8, flatShading: true })
      : new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x7dd3fc });

    // Základna a 4 rohové sloupky svatyně
    addBox(group, 1.5, 0.22, 1.5, 0, -0.55, 0, stoneMat);
    for (const sx of [-0.55, 0.55]) {
      for (const sz of [-0.55, 0.55]) {
        addBox(group, 0.22, 0.75, 0.22, sx, -0.1, sz, stoneMat);
      }
    }
    // Stupňovitý voxelový krystal uprostřed
    addBox(group, 0.65, 0.65, 0.65, 0, 0.25, 0, crystalMat);
    addBox(group, 0.38, 1.05, 0.38, 0, 0.25, 0, crystalMat);

    const ring = new THREE.Group();
    ring.name = 'ring';
    ring.position.set(0, 0.25, 0);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      addBox(ring, 0.22, 0.16, 0.22, Math.cos(a) * 1.15, 0, Math.sin(a) * 1.15, ringMat);
    }
    group.add(ring);
  } else if (normType === 'ruins') {
    // Voxelová kamenná klenba s prastarou runou
    const mat = (typeof THREE.MeshLambertMaterial !== 'undefined')
      ? new THREE.MeshLambertMaterial({ color: 0x94a3b8 })
      : new THREE.MeshBasicMaterial({ color: 0x94a3b8 });
    addBox(group, 1.6, 0.22, 1.2, 0, 0.05, 0, mat);
    addBox(group, 0.4, 1.35, 0.4, -0.58, 0.72, 0, mat);
    addBox(group, 0.4, 1.35, 0.4, 0.58, 0.72, 0, mat);
    addBox(group, 1.75, 0.35, 0.5, 0, 1.48, 0, mat);

    const runeMat = new THREE.MeshBasicMaterial({ color: 0x60a5fa });
    addBox(group, 0.35, 0.35, 0.35, 0, 0.75, 0, runeMat, 'rune');
  } else if (normType === 'camp') {
    // Voxelový tábor (stan z kostek + ohniště z kostek)
    const tentMat = (typeof THREE.MeshLambertMaterial !== 'undefined')
      ? new THREE.MeshLambertMaterial({ color: 0xd97706 })
      : new THREE.MeshBasicMaterial({ color: 0xd97706 });
    const flameMat = (typeof THREE.MeshStandardMaterial !== 'undefined')
      ? new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0xea580c, flatShading: true })
      : new THREE.MeshBasicMaterial({ color: 0xf97316 });
    const emberMat = new THREE.MeshBasicMaterial({ color: 0x475569 });

    // Stupňovitý voxelový stan vzadu
    addBox(group, 1.2, 0.35, 0.9, 0, 0.2, -0.35, tentMat);
    addBox(group, 0.85, 0.35, 0.85, 0, 0.55, -0.35, tentMat);
    addBox(group, 0.45, 0.3, 0.8, 0, 0.85, -0.35, tentMat);

    // Voxelový plamen vpředu
    const flame = new THREE.Group();
    flame.name = 'flame';
    flame.position.set(0, 0.35, 0.45);
    addBox(flame, 0.5, 0.5, 0.5, 0, 0, 0, flameMat);
    addBox(flame, 0.3, 0.45, 0.3, 0, 0.4, 0, new THREE.MeshBasicMaterial({ color: 0xfef08a }));
    group.add(flame);

    for (let i = 0; i < 4; i++) {
      const ang = (i / 4) * Math.PI * 2;
      addBox(group, 0.24, 0.22, 0.24, Math.cos(ang) * 0.5, 0.11, 0.45 + Math.sin(ang) * 0.5, emberMat);
    }
  } else if (normType === 'chest') {
    // Voxelová zlatá pokladnice se zámkem
    const chestMat = (typeof THREE.MeshStandardMaterial !== 'undefined')
      ? new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xb45309, roughness: 0.3, metalness: 0.6, flatShading: true })
      : new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    addBox(group, 1.0, 0.6, 0.7, 0, 0.3, 0, chestMat);
    addBox(group, 1.04, 0.25, 0.74, 0, 0.7, 0, chestMat);
    addBox(group, 0.2, 0.22, 0.12, 0, 0.52, 0.38, new THREE.MeshBasicMaterial({ color: 0xfffbeb }));
  } else if (normType === 'dungeonlabyrinth') {
    // Voxelová krypta / vchod do podzemního labyrintu
    const darkMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
    const runeMat = new THREE.MeshBasicMaterial({ color: 0xa855f7 });
    addBox(group, 1.4, 0.4, 1.4, 0, 0.2, 0, darkMat);
    addBox(group, 0.3, 0.8, 0.3, -0.5, 0.6, 0.5, darkMat);
    addBox(group, 0.3, 0.8, 0.3, 0.5, 0.6, 0.5, darkMat);
    addBox(group, 1.3, 0.3, 0.5, 0, 1.1, 0.5, darkMat);
    addBox(group, 0.4, 0.4, 0.4, 0, 0.5, 0, runeMat, 'dungeon_eye');
  } else if (normType === 'dungeonstronghold') {
    // Voxelová pevnost / hrad se 4 věžičkami
    const wallMat = new THREE.MeshLambertMaterial({ color: 0x475569 });
    const goldMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    addBox(group, 1.6, 0.6, 1.6, 0, 0.3, 0, wallMat);
    for (const sx of [-0.65, 0.65]) {
      for (const sz of [-0.65, 0.65]) {
        addBox(group, 0.38, 1.2, 0.38, sx, 0.6, sz, wallMat);
      }
    }
    addBox(group, 0.7, 1.4, 0.7, 0, 0.7, 0, wallMat);
    addBox(group, 0.3, 0.4, 0.3, 0, 1.5, 0, goldMat, 'keep_flag');
  } else {
    // Voxelová strážní věž / Maják z kostek
    const towerMat = (typeof THREE.MeshLambertMaterial !== 'undefined')
      ? new THREE.MeshLambertMaterial({ color: 0x64748b })
      : new THREE.MeshBasicMaterial({ color: 0x64748b });
    const roofMat = (typeof THREE.MeshLambertMaterial !== 'undefined')
      ? new THREE.MeshLambertMaterial({ color: 0xb45309 })
      : new THREE.MeshBasicMaterial({ color: 0xb45309 });
    addBox(group, 1.1, 0.35, 1.1, 0, 0.18, 0, towerMat);
    addBox(group, 0.78, 1.25, 0.78, 0, 0.95, 0, towerMat);
    addBox(group, 1.05, 0.28, 1.05, 0, 1.68, 0, roofMat);
    addBox(group, 0.48, 0.48, 0.48, 0, 2.08, 0, new THREE.MeshBasicMaterial({ color: 0x38bdf8 }), 'beacon');
  }

  return group;
}

function getPoiDisplayMeta(poi) {
  const normType = String((poi && poi.type) || '').toLowerCase();
  const typeMeta = {
    shrine:   { icon: '⛩️', typeLabel: 'Prastará svatyně' },
    ruins:    { icon: '🏛️', typeLabel: 'Kamenné ruiny' },
    camp:     { icon: '⛺', typeLabel: 'Opuštěný tábor' },
    landmark: { icon: '🗼', typeLabel: 'Strážní věž' },
    chest:    { icon: '🧰', typeLabel: 'Truhla s pokladem' },
    dragonnestfire: { icon: '🔥🐉', typeLabel: 'Hnízdo ohnivého draka' },
    dragonnestice:  { icon: '❄️🐉', typeLabel: 'Hnízdo ledového draka' },
    dungeonlabyrinth:  { icon: '🗝️', typeLabel: 'Podzemní labyrint' },
    dungeonstronghold: { icon: '🏰', typeLabel: 'Velká pevnost' }
  }[normType] || { icon: '🏛️', typeLabel: 'Významná stavba' };

  const bx = (typeof poi.x === 'number') ? poi.x : (poi.bx || 0);
  const bz = (typeof poi.z === 'number') ? poi.z : (poi.bz || 0);
  const pbx = (typeof P !== 'undefined') ? Math.floor(P.x / S) : 0;
  const pbz = (typeof P !== 'undefined') ? Math.floor(P.z / S) : 0;
  const distBlocks = Math.round(Math.hypot(bx - pbx, bz - pbz));

  return {
    icon: typeMeta.icon,
    typeLabel: typeMeta.typeLabel,
    title: poi.name || typeMeta.typeLabel,
    bx,
    bz,
    distBlocks
  };
}

function findPoiMarkerAtClientPos(clientX, clientY) {
  if (!mmCam || !mmPoiGroup || !window.POIManager) return null;
  const canvas = $('minimapCanvas');
  if (!canvas) return null;
  const rect = canvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;

  // 1) Raycast proti 3D voxelovým značkám pouze OBahraných/Objevených budov
  if (typeof THREE !== 'undefined' && typeof THREE.Raycaster === 'function') {
    const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1;
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), mmCam);
    const visibleMarkers = mmPoiGroup.children.filter(c => c.visible && c.userData && c.userData.poi && window.POIManager.isDiscovered(c.userData.poi));
    const hits = raycaster.intersectObjects(visibleMarkers, true);
    if (hits.length > 0) {
      let obj = hits[0].object;
      while (obj && (!obj.userData || !obj.userData.poi)) {
        obj = obj.parent;
      }
      if (obj && obj.userData && obj.userData.poi && window.POIManager.isDiscovered(obj.userData.poi)) {
        return obj.userData.poi;
      }
    }
  }

  // 2) 2D projekce pozic objevených značek na obrazovku (tolerance 36 px pro pohodlné kliknutí)
  let bestPoi = null;
  let bestDist = 36;
  for (const [id, mesh] of mmPoiMarkersMap.entries()) {
    if (!mesh || !mesh.visible || !mesh.userData || !mesh.userData.poi) continue;
    if (!window.POIManager.isDiscovered(mesh.userData.poi)) continue;
    const v = mesh.position.clone().project(mmCam);
    if (v.z > 1) continue;
    const sx = rect.left + (v.x * 0.5 + 0.5) * rect.width;
    const sy = rect.top + (-v.y * 0.5 + 0.5) * rect.height;
    const d = Math.hypot(clientX - sx, clientY - sy);
    if (d < bestDist) {
      bestDist = d;
      bestPoi = mesh.userData.poi;
    }
  }
  return bestPoi;
}

function updateMinimapHoverTooltip(clientX, clientY) {
  const canvas = $('minimapCanvas');
  const tt = $('mmPoiTooltip');
  if (!canvas) return;
  const hitPoi = findPoiMarkerAtClientPos(clientX, clientY);
  if (!hitPoi) {
    canvas.style.cursor = 'grab';
    if (tt) tt.hidden = true;
    return;
  }

  canvas.style.cursor = 'pointer';
  if (tt) {
    const meta = getPoiDisplayMeta(hitPoi);
    const viewport = canvas.parentElement;
    const vpRect = viewport ? viewport.getBoundingClientRect() : canvas.getBoundingClientRect();
    tt.innerHTML = `${meta.icon} ${meta.title}<span class="mm-tt-sub">⚡ Klikni pro teleportaci (${meta.distBlocks} bloků)</span>`;
    tt.style.left = `${clientX - vpRect.left}px`;
    tt.style.top = `${clientY - vpRect.top}px`;
    tt.hidden = false;
  }
}

function openMinimapTeleportPrompt(poiOrId) {
  if (!poiOrId || !window.POIManager) return null;
  let poi = poiOrId;
  if (typeof poiOrId === 'string') {
    for (const p of (window.POIManager.instances ? window.POIManager.instances.values() : [])) {
      if (p.id === poiOrId) { poi = p; break; }
    }
    if (typeof poi === 'string') {
      poi = (window.POIManager.pois || []).find(p => p.id === poiOrId);
    }
  }
  if (!poi || typeof poi !== 'object') return null;
  if (!window.POIManager.isDiscovered(poi)) {
    if (typeof toast === 'function') toast('🔒 K této budově se můžeš teleportovat až poté, co ji objevíš!');
    return null;
  }

  mmSelectedTeleportPoi = poi;
  const meta = getPoiDisplayMeta(poi);

  const modal = $('mmTeleportModal');
  const iconEl = $('mmTpIcon');
  const titleEl = $('mmTpTitle');
  const metaEl = $('mmTpMeta');
  const tt = $('mmPoiTooltip');
  if (tt) tt.hidden = true;

  if (iconEl) iconEl.textContent = meta.icon;
  if (titleEl) titleEl.textContent = meta.title;
  if (metaEl) metaEl.textContent = `${meta.typeLabel} · Vzdálenost: ${meta.distBlocks} bloků [X: ${meta.bx}, Z: ${meta.bz}]`;
  if (modal) modal.hidden = false;

  return poi;
}

function closeMinimapTeleportPrompt() {
  mmSelectedTeleportPoi = null;
  const modal = $('mmTeleportModal');
  if (modal) modal.hidden = true;
}

function confirmMinimapTeleport() {
  const target = mmSelectedTeleportPoi;
  if (!target || !window.POIManager || !window.POIManager.isDiscovered(target) || typeof window.POIManager.teleportToPOI !== 'function') {
    closeMinimapTeleportPrompt();
    return false;
  }
  const ok = window.POIManager.teleportToPOI(target);
  closeMinimapTeleportPrompt();
  if (ok) {
    mmPanX = 0;
    mmPanZ = 0;
    mmNeedsRebuild = true;
    if (minimapOpen) toggleMinimap(false);
  }
  return ok;
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
    if (window.POIManager.discoveredPOIs && typeof window.POIManager.getPoiForCell === 'function') {
      for (const id of window.POIManager.discoveredPOIs) {
        if (!window.POIManager.pois || !window.POIManager.pois.some(p => p.id === id)) {
          const m = String(id).match(/poi_(-?\d+)_(-?\d+)/);
          if (m) {
            window.POIManager.getPoiForCell(parseInt(m[1], 10), parseInt(m[2], 10));
          }
        }
      }
    }
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
      mesh.userData = { id: poi.id, type: poi.type, poi };

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
  window.findPoiMarkerAtClientPos = findPoiMarkerAtClientPos;
  window.openMinimapTeleportPrompt = openMinimapTeleportPrompt;
  window.closeMinimapTeleportPrompt = closeMinimapTeleportPrompt;
  window.confirmMinimapTeleport = confirmMinimapTeleport;
}
