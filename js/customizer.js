// ---------- Editor vzhledu postavy & ESC Menu ----------
const DEFAULT_CUSTOM = {
  skinColor: '#f5cfb3',
  hairStyle: 'short',
  hairColor: '#3e271a',
  eyeColor: '#2980b9',
  facialHair: 'none',
  underwearColor: '#23395d',
  underwearStyle: 'boxers'
};

let playerCustom = { ...DEFAULT_CUSTOM };
try {
  const saved = localStorage.getItem('voxel_char_custom');
  if (saved) Object.assign(playerCustom, JSON.parse(saved));
} catch (e) {}

let previewCustom = { ...playerCustom };
let escOpen = false, charOpen = false;

// Možnosti pro editor
const SKIN_COLORS = ['#fdf0e6', '#f5cfb3', '#e5b894', '#cb9b71', '#a56b46', '#68412b', '#462719', '#c6d8e8', '#759862'];
const HAIR_STYLES = [
  { id: 'short', name: 'Krátké' },
  { id: 'long', name: 'Dlouhé' },
  { id: 'spiky', name: 'Rozcuch' },
  { id: 'mohawk', name: 'Číro' },
  { id: 'parted', name: 'Pěšinka' },
  { id: 'bald', name: 'Pleš' }
];
const HAIR_COLORS = ['#1b1b1b', '#3e271a', '#633923', '#ab4626', '#e2ba6f', '#f7e5b5', '#d8dde3', '#4a90e2', '#9b51e0', '#e91e63', '#27ae60'];
const BEARD_STYLES = [
  { id: 'none', name: 'Oholený' },
  { id: 'stubble', name: 'Strniště' },
  { id: 'beard', name: 'Plnovous' },
  { id: 'mustache', name: 'Knírek' }
];
const EYE_COLORS = ['#2980b9', '#27ae60', '#795548', '#e67e22', '#7f8c8d', '#8e44ad', '#c0392b'];
const UND_STYLES = [
  { id: 'boxers', name: 'Boxerky' },
  { id: 'briefs', name: 'Trenýrky' }
];
const UND_COLORS = ['#23395d', '#1f232b', '#7b1e2a', '#3f4f2c', '#c29b38', '#e6e9ef', '#3498db'];

function buildCharUI() {
  renderSwatches('skinSwatches', SKIN_COLORS, 'skinColor');
  renderPills('hairStylePills', HAIR_STYLES, 'hairStyle');
  renderSwatches('hairSwatches', HAIR_COLORS, 'hairColor');
  renderPills('beardPills', BEARD_STYLES, 'facialHair');
  renderSwatches('eyeSwatches', EYE_COLORS, 'eyeColor');
  renderPills('undStylePills', UND_STYLES, 'underwearStyle');
  renderSwatches('undSwatches', UND_COLORS, 'underwearColor');
}

function renderSwatches(containerId, colors, prop) {
  const el = $(containerId);
  el.innerHTML = '';
  colors.forEach(col => {
    const b = document.createElement('button');
    b.className = 'swatch' + (previewCustom[prop].toLowerCase() === col.toLowerCase() ? ' active' : '');
    b.style.backgroundColor = col;
    b.onclick = () => {
      previewCustom[prop] = col;
      buildCharUI();
      updatePreviewModel();
    };
    el.appendChild(b);
  });
  const wrap = document.createElement('label');
  wrap.className = 'color-picker-wrap';
  wrap.title = 'Vlastní barva';
  const inp = document.createElement('input');
  inp.type = 'color';
  inp.value = previewCustom[prop];
  inp.oninput = (e) => {
    previewCustom[prop] = e.target.value;
    buildCharUI();
    updatePreviewModel();
  };
  wrap.appendChild(inp);
  el.appendChild(wrap);
}

function renderPills(containerId, list, prop) {
  const el = $(containerId);
  el.innerHTML = '';
  list.forEach(it => {
    const b = document.createElement('button');
    b.className = 'pill-btn' + (previewCustom[prop] === it.id ? ' active' : '');
    b.textContent = it.name;
    b.onclick = () => {
      previewCustom[prop] = it.id;
      buildCharUI();
      updatePreviewModel();
    };
    el.appendChild(b);
  });
}

// ---------- 3D Náhled pro editor postavy ----------
let previewRenderer = null, previewScene = null, previewCam = null, previewRig = null;
let previewRotY = 0.35, previewPitch = 0.12, previewDist = 2.2, isPreviewDragging = false;
let pvLastX = 0, pvLastY = 0;

function initPreview3D() {
  const canvas = $('charPreviewCanvas');
  previewRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  previewRenderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  previewRenderer.setSize(270, 320);

  previewScene = new THREE.Scene();
  previewCam = new THREE.PerspectiveCamera(40, 270 / 320, 0.1, 20);

  previewScene.add(new THREE.AmbientLight(0xffffff, 0.78));
  const sun1 = new THREE.DirectionalLight(0xfff5ea, 0.7);
  sun1.position.set(1.5, 3, 2);
  previewScene.add(sun1);
  const rimLight = new THREE.DirectionalLight(0x8fb4ee, 0.45);
  rimLight.position.set(-2, 2, -2);
  previewScene.add(rimLight);

  // Podstavec
  const pedGeo = new THREE.CylinderGeometry(0.75, 0.82, 0.06, 32);
  const pedMat = new THREE.MeshLambertMaterial({ color: 0x1b2636 });
  const ped = new THREE.Mesh(pedGeo, pedMat);
  ped.position.y = -0.03;
  previewScene.add(ped);

  const ringGeo = new THREE.TorusGeometry(0.78, 0.015, 8, 32);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffd86b });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.005;
  previewScene.add(ring);

  previewRig = createCharacterRig();
  previewScene.add(previewRig.root);

  canvas.addEventListener('mousedown', e => {
    isPreviewDragging = true; pvLastX = e.clientX; pvLastY = e.clientY;
  });
  window.addEventListener('mousemove', e => {
    if (!isPreviewDragging) return;
    const dx = e.clientX - pvLastX, dy = e.clientY - pvLastY;
    pvLastX = e.clientX; pvLastY = e.clientY;
    previewRotY += dx * 0.018;
    previewPitch = Math.max(-0.4, Math.min(0.5, previewPitch + dy * 0.014));
    updatePreviewCam();
  });
  window.addEventListener('mouseup', () => isPreviewDragging = false);

  canvas.addEventListener('touchstart', e => {
    if (e.touches.length === 1) {
      isPreviewDragging = true; pvLastX = e.touches[0].clientX; pvLastY = e.touches[0].clientY;
    }
  }, { passive: true });
  window.addEventListener('touchmove', e => {
    if (!isPreviewDragging || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - pvLastX, dy = e.touches[0].clientY - pvLastY;
    pvLastX = e.touches[0].clientX; pvLastY = e.touches[0].clientY;
    previewRotY += dx * 0.018;
    previewPitch = Math.max(-0.4, Math.min(0.5, previewPitch + dy * 0.014));
    updatePreviewCam();
  }, { passive: true });
  window.addEventListener('touchend', () => isPreviewDragging = false);

  canvas.addEventListener('wheel', e => {
    previewDist = Math.max(1.3, Math.min(3.8, previewDist + e.deltaY * 0.003));
    updatePreviewCam();
    e.preventDefault();
  }, { passive: false });

  $('pvRotL').onclick = () => { previewRotY -= 0.5; updatePreviewCam(); };
  $('pvRotR').onclick = () => { previewRotY += 0.5; updatePreviewCam(); };
  $('pvReset').onclick = () => { previewRotY = 0.35; previewPitch = 0.12; previewDist = 2.2; updatePreviewCam(); };
}

function updatePreviewCam() {
  if (!previewCam) return;
  const targetY = 13 * VX;
  const cy = targetY + Math.sin(previewPitch) * previewDist;
  const cd = Math.cos(previewPitch) * previewDist;
  const cx = Math.sin(previewRotY) * cd;
  const cz = Math.cos(previewRotY) * cd;
  previewCam.position.set(cx, cy, cz);
  previewCam.lookAt(0, targetY, 0);
}

function updatePreviewModel() {
  if (!previewRig) return;
  updateCharacterRig(previewRig, previewCustom, getEquippedMap());
}

// ---------- Otevření a zavření editoru & ESC menu ----------
function openCharEditor() {
  previewCustom = { ...playerCustom };
  if (!previewRenderer) initPreview3D();
  buildCharUI();
  updatePreviewModel();
  updatePreviewCam();
  charOpen = true;
  $('charModal').hidden = false;
  try { document.exitPointerLock(); } catch (e) {}
}

function closeCharEditor() {
  charOpen = false;
  $('charModal').hidden = true;
}

$('charClose').onclick = () => { closeCharEditor(); openEscMenu(); };
$('charCancel').onclick = () => { closeCharEditor(); openEscMenu(); };
$('charSave').onclick = () => {
  playerCustom = { ...previewCustom };
  try { localStorage.setItem('voxel_char_custom', JSON.stringify(playerCustom)); } catch (e) {}
  updatePlayerAppearance();
  closeCharEditor();
  openEscMenu();
  toast('Vzhled postavy byl uložen!');
};

$('charRandom').onclick = () => {
  const rnd = arr => arr[Math.floor(Math.random() * arr.length)];
  previewCustom.skinColor = rnd(SKIN_COLORS);
  previewCustom.hairStyle = rnd(HAIR_STYLES).id;
  previewCustom.hairColor = rnd(HAIR_COLORS);
  previewCustom.facialHair = rnd(BEARD_STYLES).id;
  previewCustom.eyeColor = rnd(EYE_COLORS);
  previewCustom.underwearStyle = rnd(UND_STYLES).id;
  previewCustom.underwearColor = rnd(UND_COLORS);
  buildCharUI();
  updatePreviewModel();
};

function openEscMenu() {
  if (charOpen) closeCharEditor();
  if (invOpen) toggleInv();
  escOpen = true;
  $('escMenu').hidden = false;
  try { document.exitPointerLock(); } catch (e) {}
  for (const k in keys) keys[k] = 0;
  drag = false;
}

function closeEscMenu() {
  escOpen = false;
  $('escMenu').hidden = true;
  try { (window.cv || (window.renderer && renderer.domElement))?.requestPointerLock(); } catch (e) {}
}

$('escResume').onclick = closeEscMenu;
$('escCharEdit').onclick = () => { closeEscMenu(); openCharEditor(); };
$('escInv').onclick = () => { closeEscMenu(); toggleInv(); };
$('escRespawn').onclick = () => {
  P.x = SPX; P.z = 0.5; P.y = SPY; P.vx = P.vy = P.vz = 0; G.hp = 100; G.st = 100;
  closeEscMenu();
  toast('Pozice byla obnovena!');
};
