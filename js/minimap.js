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

function toggleMinimap(force) {
  minimapOpen = (force !== undefined) ? force : !minimapOpen;
  const box = $('minimapBox');
  if (!box) return;
  box.hidden = !minimapOpen;

  if (minimapOpen) {
    if (!mmRenderer) initMinimap();
    markExploredAroundPlayer();
    mmNeedsRebuild = true;
    updateMinimapSize();
    toast('3D Mapa světa: Zapnuto [M]');
  } else {
    toast('3D Mapa: Skryto [M]');
  }
}

function initMinimap() {
  const canvas = $('minimapCanvas');
  if (!canvas) return;

  loadExploredHistory();
  markExploredAroundPlayer();

  const w = minimapExpanded ? 640 : 310;
  const h = minimapExpanded ? 500 : 270;

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
  box.classList.toggle('expanded', minimapExpanded);
  $('mmExpandBtn').textContent = minimapExpanded ? '⤡' : '⤢';

  const w = minimapExpanded ? 640 : 310;
  const h = minimapExpanded ? 500 : 270;
  mmRenderer.setSize(w, h);
  mmCam.aspect = w / h;
  mmCam.updateProjectionMatrix();
}

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

  updateMinimapCam();
  mmRenderer.render(mmScene, mmCam);
}
