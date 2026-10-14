// ---------- 3D Voxelová Minimapa (Cube World Style) ----------
let minimapOpen = false;
let minimapExpanded = false;
let mmRenderer = null, mmScene = null, mmCam = null;
let mmTerrainMesh = null, mmPlayerMarker = null;
let mmRotY = 0.785, mmPitch = 0.62, mmDist = 32;
let mmIsDragging = false, mmLastX = 0, mmLastY = 0;
let mmLastXPos = -9999, mmLastZPos = -9999;
let mmZoomLevel = 1; // 0 = detail (krok 0.5), 1 = střední (krok 1.0), 2 = široký (krok 2.0)
let mmNeedsRebuild = true;

const MM_SIZES = [
  { step: 0.5, radius: 20, name: 'Detailní (10m)' },
  { step: 1.0, radius: 26, name: 'Standardní (26m)' },
  { step: 2.0, radius: 32, name: 'Regionální (64m)' }
];

function toggleMinimap(force) {
  minimapOpen = (force !== undefined) ? force : !minimapOpen;
  const box = $('minimapBox');
  if (!box) return;
  box.hidden = !minimapOpen;

  if (minimapOpen) {
    if (!mmRenderer) initMinimap();
    mmNeedsRebuild = true;
    updateMinimapSize();
    toast('3D Minimapa: Zapnuto [M]');
  } else {
    toast('3D Minimapa: Skryto [M]');
  }
}

function initMinimap() {
  const canvas = $('minimapCanvas');
  if (!canvas) return;

  const w = minimapExpanded ? 600 : 300;
  const h = minimapExpanded ? 480 : 280;

  mmRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  mmRenderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  mmRenderer.setSize(w, h);

  mmScene = new THREE.Scene();
  mmScene.background = new THREE.Color(0x0c121e);

  mmCam = new THREE.PerspectiveCamera(38, w / h, 0.5, 300);

  // Osvětlení ve stylu Cube World
  const ambient = new THREE.AmbientLight(0xffffff, 0.75);
  mmScene.add(ambient);

  const sun = new THREE.DirectionalLight(0xfff7e6, 0.85);
  sun.position.set(1.2, 2.5, 0.9);
  mmScene.add(sun);

  const rim = new THREE.DirectionalLight(0x76a0d0, 0.4);
  rim.position.set(-1.5, 1.2, -1.2);
  mmScene.add(rim);

  // 3D Voxelová Značka Hráče (svítící šipka ve stylu Cube World)
  mmPlayerMarker = (() => {
    const group = new THREE.Group();

    // Voxelová šipka
    const pointerGeo = new THREE.ConeGeometry(0.8, 1.6, 4);
    pointerGeo.rotateX(Math.PI / 2);
    pointerGeo.rotateY(Math.PI / 4);
    const pointerMat = new THREE.MeshBasicMaterial({ color: 0x00f5ff });
    const pointer = new THREE.Mesh(pointerGeo, pointerMat);
    pointer.scale.set(0.7, 0.35, 1.1);
    group.add(pointer);

    // Vnější pulzující prstenec
    const ringGeo = new THREE.RingGeometry(0.85, 1.1, 16);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffe600, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = -0.3;
    group.add(ring);

    mmScene.add(group);
    return group;
  })();

  // Myš – rotace dioramatu
  canvas.addEventListener('mousedown', e => {
    mmIsDragging = true;
    mmLastX = e.clientX;
    mmLastY = e.clientY;
  });

  window.addEventListener('mousemove', e => {
    if (!mmIsDragging || !minimapOpen) return;
    const dx = e.clientX - mmLastX, dy = e.clientY - mmLastY;
    mmLastX = e.clientX; mmLastY = e.clientY;
    mmRotY += dx * 0.015;
    mmPitch = Math.max(0.18, Math.min(1.4, mmPitch + dy * 0.012));
    updateMinimapCam();
  });

  window.addEventListener('mouseup', () => mmIsDragging = false);

  // Zoom kolečkem myši
  canvas.addEventListener('wheel', e => {
    if (!minimapOpen) return;
    mmDist = Math.max(16, Math.min(65, mmDist + e.deltaY * 0.04));
    updateMinimapCam();
    e.preventDefault();
  }, { passive: false });

  // Tlačítka ovládání
  $('mmRotL').onclick = () => { mmRotY -= Math.PI / 4; updateMinimapCam(); };
  $('mmRotR').onclick = () => { mmRotY += Math.PI / 4; updateMinimapCam(); };
  $('mmCenter').onclick = () => {
    mmRotY = face + Math.PI; // Srovnat pohled za záda hráče
    mmPitch = 0.62;
    mmDist = 32;
    updateMinimapCam();
  };
  $('mmZoomIn').onclick = () => {
    mmZoomLevel = Math.max(0, mmZoomLevel - 1);
    mmNeedsRebuild = true;
    toast('Měřítko mapy: ' + MM_SIZES[mmZoomLevel].name);
  };
  $('mmZoomOut').onclick = () => {
    mmZoomLevel = Math.min(MM_SIZES.length - 1, mmZoomLevel + 1);
    mmNeedsRebuild = true;
    toast('Měřítko mapy: ' + MM_SIZES[mmZoomLevel].name);
  };
  $('mmExpandBtn').onclick = () => {
    minimapExpanded = !minimapExpanded;
    updateMinimapSize();
  };
  $('mmCloseBtn').onclick = () => toggleMinimap(false);

  updateMinimapCam();
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

// Generování 3D stepped voxel dioramatu kolem hráče
function buildMinimapTerrainMesh() {
  if (!mmScene) return;

  const conf = MM_SIZES[mmZoomLevel];
  const step = conf.step;
  const rad = conf.radius;
  const size = rad * 2 + 1;

  // Střed mapy v blocích
  const centerBX = Math.floor(P.x / S);
  const centerBZ = Math.floor(P.z / S);
  const centerH = height(centerBX, centerBZ);

  // Načtení výšek mřížky
  const heights = new Float32Array(size * size);
  const biomes = new Uint8Array(size * size);

  for (let z = 0; z < size; z++) {
    for (let x = 0; x < size; x++) {
      const bx = centerBX + (x - rad) * (step / S);
      const bz = centerBZ + (z - rad) * (step / S);
      const h = height(bx, bz);
      heights[x + z * size] = h;
      biomes[x + z * size] = biome(bx, bz, h);
    }
  }

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

  const miniScaleH = 0.18; // Škálování výšky pro přehlednost v 3D pohledu

  for (let z = 0; z < size; z++) {
    for (let x = 0; x < size; x++) {
      const h = heights[x + z * size];
      const bi = biomes[x + z * size];
      const isWater = h < SEA;
      const renderH = isWater ? SEA : h;
      const yTop = (renderH - centerH) * miniScaleH;

      // Pozice v lokálním souřadném systému scény
      const x0 = (x - rad - 0.5) * step;
      const x1 = (x - rad + 0.5) * step;
      const z0 = (z - rad - 0.5) * step;
      const z1 = (z - rad + 0.5) * step;

      // Barva voxelového povrchu (Cube World paleta)
      let r = 0.35, g = 0.65, b = 0.25; // Tráva

      if (isWater) {
        r = 0.15; g = 0.45; b = 0.78; // Voda
      } else if (h <= SEA + 2 || bi === 1) {
        r = 0.86; g = 0.72; b = 0.42; // Písek / Pláž / Poušť
      } else if (h >= 135 || bi === 2) {
        if (h >= 150) { r = 0.96; g = 0.98; b = 1.0; } // Sníh
        else { r = 0.82; g = 0.86; b = 0.92; } // Ledový sníh
      } else if (h >= 80) {
        r = 0.48; g = 0.52; b = 0.58; // Kamenná hora
      } else if (bi === 0) {
        // Zelená tráva se stínováním podle výšky
        const lum = 0.85 + (h / 80) * 0.25;
        r = 0.30 * lum; g = 0.62 * lum; b = 0.22 * lum;
      }

      // 1. Horní stěna (Top Face)
      addQuad(
        [x0, yTop, z0],
        [x0, yTop, z1],
        [x1, yTop, z1],
        [x1, yTop, z0],
        [r, g, b]
      );

      // 2. Boční stěny (Stepped Voxel Sides - západ, východ, sever, jih)
      const hN = (z > 0) ? (heights[x + (z - 1) * size] < SEA ? SEA : heights[x + (z - 1) * size]) : renderH;
      const hS = (z < size - 1) ? (heights[x + (z + 1) * size] < SEA ? SEA : heights[x + (z + 1) * size]) : renderH;
      const hW = (x > 0) ? (heights[(x - 1) + z * size] < SEA ? SEA : heights[(x - 1) + z * size]) : renderH;
      const hE = (x < size - 1) ? (heights[(x + 1) + z * size] < SEA ? SEA : heights[(x + 1) + z * size]) : renderH;

      // Západní stěna (W)
      if (renderH > hW) {
        const yBot = (hW - centerH) * miniScaleH;
        addQuad([x0, yTop, z1], [x0, yTop, z0], [x0, yBot, z0], [x0, yBot, z1], [r * 0.72, g * 0.72, b * 0.72]);
      }
      // Východní stěna (E)
      if (renderH > hE) {
        const yBot = (hE - centerH) * miniScaleH;
        addQuad([x1, yTop, z0], [x1, yTop, z1], [x1, yBot, z1], [x1, yBot, z0], [r * 0.82, g * 0.82, b * 0.82]);
      }
      // Severní stěna (N)
      if (renderH > hN) {
        const yBot = (hN - centerH) * miniScaleH;
        addQuad([x0, yTop, z0], [x1, yTop, z0], [x1, yBot, z0], [x0, yBot, z0], [r * 0.62, g * 0.62, b * 0.62]);
      }
      // Jižní stěna (S)
      if (renderH > hS) {
        const yBot = (hS - centerH) * miniScaleH;
        addQuad([x1, yTop, z1], [x0, yTop, z1], [x0, yBot, z1], [x1, yBot, z1], [r * 0.78, g * 0.78, b * 0.78]);
      }

      // 3. Miniaturní stromy na zalesněném povrchu (voxelové korunky)
      if (!isWater && bi === 0 && h > SEA + 4 && h < 80) {
        const treeHash = h2(centerBX + (x - rad) * (step / S), centerBZ + (z - rad) * (step / S));
        if (treeHash > 0.94) {
          const tw = step * 0.75, th = step * 1.1;
          const ty0 = yTop, ty1 = yTop + th;
          const tx0 = (x - rad - 0.35) * step, tx1 = (x - rad + 0.35) * step;
          const tz0 = (z - rad - 0.35) * step, tz1 = (z - rad + 0.35) * step;
          const treeCol = [0.18, 0.48, 0.16];
          // Stromový mini-voxel
          addQuad([tx0, ty1, tz0], [tx0, ty1, tz1], [tx1, ty1, tz1], [tx1, ty1, tz0], treeCol);
          addQuad([tx0, ty1, tz1], [tx0, ty1, tz0], [tx0, ty0, tz0], [tx0, ty0, tz1], [treeCol[0]*0.7, treeCol[1]*0.7, treeCol[2]*0.7]);
          addQuad([tx1, ty1, tz0], [tx1, ty1, tz1], [tx1, ty0, tz1], [tx1, ty0, tz0], [treeCol[0]*0.8, treeCol[1]*0.8, treeCol[2]*0.8]);
        }
      }
    }
  }

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

// Aktualizace minimapy v hlavní smyčce
function updateMinimap(dt, now) {
  if (!minimapOpen || !mmRenderer) return;

  const curBX = Math.floor(P.x / S);
  const curBZ = Math.floor(P.z / S);
  const curH = height(curBX, curBZ);
  const curBio = biome(curBX, curBZ, curH);

  // Přegenerování dioramatu při posunu o více než 2 bloky nebo při změně zoomu
  const movedDist = Math.hypot(curBX - mmLastXPos, curBZ - mmLastZPos);
  if (mmNeedsRebuild || movedDist >= 2) {
    mmLastXPos = curBX;
    mmLastZPos = curBZ;
    mmNeedsRebuild = false;
    buildMinimapTerrainMesh();
  }

  // Aktualizace značky hráče
  if (mmPlayerMarker) {
    const miniScaleH = 0.18;
    const playerLocalY = (P.y / S - curH) * miniScaleH + 0.6;
    const hoverBob = Math.sin(now * 0.005) * 0.15;
    mmPlayerMarker.position.set(0, playerLocalY + hoverBob, 0);
    mmPlayerMarker.rotation.y = model.rotation.y;
  }

  // Aktualizace informací v HUD minimapy
  const coordsEl = $('mmCoords');
  if (coordsEl) {
    coordsEl.textContent = `X: ${P.x.toFixed(0)} · Y: ${P.y.toFixed(0)} · Z: ${P.z.toFixed(0)}`;
  }

  const biomeEl = $('mmBiome');
  if (biomeEl) {
    let bName = '🌲 Horský les & louky';
    if (P.y / S <= SEA) bName = '🌊 Moře & pobřeží';
    else if (curH <= SEA + 2) bName = '🏖️ Písečná pláž';
    else if (curBio === 1) bName = '🏜️ Vyprahlá poušť';
    else if (curBio === 2 || curH >= 120) bName = '🏔️ Sněžný horský štít';
    else if (curH >= 80) bName = '⛰️ Skalnaté pohoří';
    biomeEl.textContent = bName;
  }

  updateMinimapCam();
  mmRenderer.render(mmScene, mmCam);
}
