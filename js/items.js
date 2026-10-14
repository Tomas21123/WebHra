// ---------- Položky, 3D Voxelové Zbraně & Ikony ----------
const INV = [
  // 10 Zbraní
  { id: 'sword', name: 'Ocelový meč', cat: 'weapon' },
  { id: 'spear', name: 'Rytířské kopí', cat: 'weapon' },
  { id: 'dagger', name: 'Zlodějská dýka', cat: 'weapon' },
  { id: 'battleaxe', name: 'Válečná sekera', cat: 'weapon' },
  { id: 'mace', name: 'Okovaný palcát', cat: 'weapon' },
  { id: 'greatsword', name: 'Obouruční meč', cat: 'weapon' },
  { id: 'staff_fire', name: 'Ohnivá hůl', cat: 'weapon' },
  { id: 'bow', name: 'Tisový luk', cat: 'weapon' },
  { id: 'hammer', name: 'Kovářské kladivo', cat: 'weapon' },
  { id: 'katana', name: 'Východní katana', cat: 'weapon' },

  // 10 Kusů oblečení
  { id: 'cape_black', name: 'Černý plášť stínů', cat: 'armor', slot: 'cape', color: 0x16171d },
  { id: 'cape_royal', name: 'Královský plášť', cat: 'armor', slot: 'cape', color: 0x8e1b24 },
  { id: 'tunic_linen', name: 'Plátěná tunika', cat: 'armor', slot: 'chest', color: 0x4a7c59 },
  { id: 'armor_iron', name: 'Rytířský kyrys', cat: 'armor', slot: 'chest', color: 0x9aa3b4 },
  { id: 'robe_mage', name: 'Kouzelnické roucho', cat: 'armor', slot: 'chest', color: 0x24336a },
  { id: 'pants_leather', name: 'Kožené kalhoty', cat: 'armor', slot: 'legs', color: 0x6e4726 },
  { id: 'pants_plate', name: 'Plátové nohavice', cat: 'armor', slot: 'legs', color: 0x7c8594 },
  { id: 'boots_leather', name: 'Cestovní boty', cat: 'armor', slot: 'feet', color: 0x2e251e },
  { id: 'boots_fur', name: 'Kožešinové boty', cat: 'armor', slot: 'feet', color: 0x4a3b30 },
  { id: 'hood_hunter', name: 'Lovecká kápě', cat: 'armor', slot: 'head', color: 0x2f4836 },

  // 10 Surovin / Loot
  { id: 'wood', name: 'Dubové dřevo', cat: 'loot' },
  { id: 'stone', name: 'Kamenný blok', cat: 'loot' },
  { id: 'ore_iron', name: 'Železná ruda', cat: 'loot' },
  { id: 'ore_gold', name: 'Zlatý valoun', cat: 'loot' },
  { id: 'gem_ruby', name: 'Ohnivý rubín', cat: 'loot' },
  { id: 'gem_sapphire', name: 'Hvězdný safír', cat: 'loot' },
  { id: 'leather', name: 'Vyčiněná useň', cat: 'loot' },
  { id: 'potion_hp', name: 'Léčivý lektvar', cat: 'loot' },
  { id: 'apple', name: 'Zlaté jablko', cat: 'loot' },
  { id: 'torch', name: 'Pochodeň', cat: 'loot' }
];

const STEEL = 0xd5dbe6, DSTEEL = 0x8f98ab, GOLD = 0xe8c34a, LEATHER = 0x3a2a1e, WOOD = 0x6a3f1e;

const W3 = (() => {
  const sw = [], sp = [], dg = [], ba = [], mc = [], gs = [], sf = [], bw = [], hm = [], kt = [];

  // 1. Meč
  bx(sw, -1, -1, -3, 1, 1, 3, WOOD);
  bx(sw, -1, -1, -5, 1, 1, -3, GOLD);
  bx(sw, -5, -1, 3, 5, 1, 5, GOLD);
  bx(sw, -2, -1, 5, 2, 1, 30, STEEL);
  bx(sw, -1, -1, 30, 1, 1, 34, STEEL);

  // 2. Kopí
  bx(sp, -1, -1, -14, 1, 1, 30, WOOD);
  bx(sp, -1, -1, 28, 1, 1, 31, 0xd0301f);
  bx(sp, -2, -1, 31, 2, 1, 38, STEEL);
  bx(sp, -1, -1, 38, 1, 1, 44, STEEL);

  // 3. Dýka
  bx(dg, -1, -1, -3, 1, 1, 2, LEATHER);
  bx(dg, -1, -1, -4, 1, 1, -3, GOLD);
  bx(dg, -3, -1, 2, 3, 1, 3, DSTEEL);
  bx(dg, -1, -1, 3, 1, 1, 16, STEEL);
  bx(dg, 0, -1, 16, 1, 1, 19, STEEL);

  // 4. Válečná sekera
  bx(ba, -1, -1, -6, 1, 1, 28, WOOD);
  bx(ba, -1, -1, -7, 1, 1, -6, DSTEEL);
  bx(ba, -1, -1, 28, 1, 1, 31, DSTEEL);
  bx(ba, 1, -1, 20, 8, 1, 30, STEEL);
  bx(ba, 8, -1, 22, 11, 1, 28, STEEL);
  bx(ba, -8, -1, 20, -1, 1, 30, STEEL);
  bx(ba, -11, -1, 22, -8, 1, 28, STEEL);

  // 5. Palcát
  bx(mc, -1, -1, -6, 1, 1, 24, DSTEEL);
  bx(mc, -1, -1, -9, 1, 1, -6, LEATHER);
  bx(mc, -4, -4, 20, 4, 4, 28, STEEL);
  bx(mc, -2, -2, 28, 2, 2, 32, STEEL);

  // 6. Obouruční meč
  bx(gs, -1, -1, -9, 1, 1, 2, LEATHER);
  bx(gs, -2, -1, -12, 2, 1, -9, GOLD);
  bx(gs, -8, -1, 2, 8, 1, 5, GOLD);
  bx(gs, -3, -1, 5, 3, 1, 44, STEEL);
  bx(gs, -2, -1, 44, 2, 1, 49, STEEL);
  bx(gs, -1, -1, 49, 1, 1, 53, STEEL);

  // 7. Ohnivá hůl
  bx(sf, -1, -1, -10, 1, 1, 32, 0x4a2e18);
  bx(sf, -2, -2, 30, 2, 2, 34, GOLD);
  bx(sf, -2, -2, 34, 2, 2, 40, 0xff2a2a);
  bx(sf, -1, -1, 40, 1, 1, 43, 0xffaa33);

  // 8. Luk
  bx(bw, -1, -1, -1, 1, 1, 2, LEATHER);
  bx(bw, -1, -1, 2, 1, 7, 18, 0x8a5a30);
  bx(bw, -1, -1, -18, 1, 7, -1, 0x8a5a30);
  bx(bw, -1, 7, -18, 1, 8, 18, 0xe0e6ed);

  // 9. Kladivo
  bx(hm, -1, -1, -6, 1, 1, 26, WOOD);
  bx(hm, -1, -1, -9, 1, 1, -6, DSTEEL);
  bx(hm, -6, -4, 20, 6, 4, 29, STEEL);
  bx(hm, -8, -3, 22, 8, 3, 27, DSTEEL);

  // 10. Katana
  bx(kt, -1, -1, -8, 1, 1, 1, 0x1f2421);
  bx(kt, -3, -1, 1, 3, 1, 3, GOLD);
  bx(kt, -1, -1, 3, 1, 1, 5, GOLD);
  bx(kt, -1, -1, 5, 1, 1, 37, STEEL);
  bx(kt, 0, -1, 37, 1, 1, 40, STEEL);

  const o = {
    sword: createSingleVoxMesh(sw, 0, 0, 0),
    spear: createSingleVoxMesh(sp, 0, 0, 0),
    dagger: createSingleVoxMesh(dg, 0, 0, 0),
    battleaxe: createSingleVoxMesh(ba, 0, 0, 0),
    mace: createSingleVoxMesh(mc, 0, 0, 0),
    greatsword: createSingleVoxMesh(gs, 0, 0, 0),
    staff_fire: createSingleVoxMesh(sf, 0, 0, 0),
    bow: createSingleVoxMesh(bw, 0, 0, 0),
    hammer: createSingleVoxMesh(hm, 0, 0, 0),
    katana: createSingleVoxMesh(kt, 0, 0, 0)
  };
  return o;
})();

function attachWeaponsToHand(targetHand) {
  if (!targetHand) return;
  for (const k in W3) {
    targetHand.add(W3[k]);
    W3[k].visible = false;
  }
}

function applyHeld() {
  for (const k in W3) W3[k].visible = (k === heldId);
}

function icon(id) {
  const c = document.createElement('canvas');
  c.width = c.height = 16;
  const g = c.getContext('2d');
  const px = (x, y, col) => { g.fillStyle = col; g.fillRect(x, y, 1, 1); };
  const ln = (x0, y0, x1, y1, col) => {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let i = 0; i <= n; i++) px(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), col);
  };
  const bx2 = (x0, y0, w, h, col) => { g.fillStyle = col; g.fillRect(x0, y0, w, h); };

  switch (id) {
    // --- ZBRANĚ (10) ---
    case 'sword':
      ln(5, 10, 13, 2, '#d5dbe6'); ln(6, 10, 13, 3, '#9aa3b4'); ln(3, 9, 6, 12, '#e8c34a'); ln(4, 11, 2, 13, '#6a3f1e'); px(1, 14, '#e8c34a'); px(14, 1, '#ffffff'); break;
    case 'spear':
      ln(2, 14, 11, 5, '#8a5a30'); ln(3, 14, 12, 5, '#6a3f1e'); ln(12, 4, 14, 2, '#d5dbe6'); ln(12, 5, 14, 3, '#9aa3b4'); px(10, 6, '#d0301f'); px(9, 7, '#d0301f'); break;
    case 'dagger':
      ln(8, 8, 13, 3, '#d5dbe6'); ln(9, 8, 13, 4, '#9aa3b4'); ln(6, 8, 9, 11, '#e8c34a'); ln(6, 10, 4, 12, '#3a2a1e'); px(3, 13, '#e8c34a'); break;
    case 'battleaxe':
      ln(3, 13, 11, 5, '#6a3f1e'); bx2(9, 2, 5, 3, '#d5dbe6'); bx2(12, 1, 3, 5, '#9aa3b4'); bx2(6, 5, 3, 5, '#d5dbe6'); bx2(5, 8, 3, 3, '#9aa3b4'); px(10, 4, '#4a5465'); break;
    case 'mace':
      ln(3, 13, 9, 7, '#6a3f1e'); bx2(9, 3, 5, 5, '#8f98ab'); px(10, 2, '#d5dbe6'); px(14, 6, '#d5dbe6'); px(8, 5, '#5a6375'); px(12, 9, '#5a6375'); break;
    case 'greatsword':
      ln(3, 13, 14, 2, '#ffffff'); ln(4, 13, 14, 3, '#9aa3b4'); bx2(4, 9, 4, 2, '#e8c34a'); bx2(3, 10, 2, 4, '#e8c34a'); ln(2, 14, 1, 15, '#3a2a1e'); break;
    case 'staff_fire':
      ln(2, 14, 10, 6, '#4a2e18'); bx2(10, 3, 4, 4, '#ffd86b'); bx2(11, 2, 3, 3, '#ff2a2a'); px(12, 3, '#ffaa33'); px(13, 1, '#ff7a2a'); break;
    case 'bow':
      ln(3, 3, 13, 3, '#8a5a30'); ln(13, 3, 13, 13, '#8a5a30'); ln(3, 3, 3, 13, '#8a5a30'); ln(3, 13, 13, 13, '#e0e6ed'); ln(3, 3, 13, 13, '#ffffff'); break;
    case 'hammer':
      ln(2, 14, 9, 7, '#6a3f1e'); bx2(8, 2, 6, 4, '#8f98ab'); bx2(10, 4, 4, 4, '#5a6375'); px(9, 3, '#d5dbe6'); break;
    case 'katana':
      ln(3, 13, 5, 11, '#1f2421'); px(6, 10, '#ffd86b'); ln(7, 9, 14, 2, '#d5dbe6'); ln(8, 9, 15, 2, '#ffffff'); break;

    // --- OBLEČENÍ (10) ---
    case 'cape_black':
      bx2(4, 2, 8, 2, '#3a4252'); bx2(3, 4, 10, 9, '#161820'); bx2(4, 13, 8, 2, '#0f1117'); px(2, 3, '#ffd86b'); px(13, 3, '#ffd86b'); break;
    case 'cape_royal':
      bx2(4, 2, 8, 2, '#ffd86b'); bx2(3, 4, 10, 9, '#8e1b24'); bx2(4, 13, 8, 2, '#ffd86b'); px(5, 8, '#c73642'); px(10, 8, '#c73642'); break;
    case 'tunic_linen':
      bx2(4, 4, 8, 9, '#4a7c59'); bx2(2, 5, 12, 3, '#4a7c59'); bx2(4, 12, 8, 1, '#2d5338'); bx2(7, 4, 2, 3, '#2d5338'); bx2(5, 5, 6, 1, '#8fb996'); break;
    case 'armor_iron':
      bx2(4, 3, 8, 10, '#9aa3b4'); bx2(2, 4, 12, 4, '#9aa3b4'); bx2(5, 5, 2, 2, '#d5dbe6'); bx2(9, 5, 2, 2, '#d5dbe6'); bx2(4, 12, 8, 1, '#5a6375'); break;
    case 'robe_mage':
      bx2(4, 3, 8, 11, '#24336a'); bx2(2, 4, 12, 4, '#24336a'); bx2(7, 4, 2, 8, '#ffd86b'); bx2(3, 13, 10, 2, '#1b2752'); px(7, 8, '#4a90e2'); break;
    case 'pants_leather':
      bx2(4, 4, 8, 3, '#6e4726'); bx2(4, 7, 3, 7, '#6e4726'); bx2(9, 7, 3, 7, '#6e4726'); bx2(4, 4, 8, 1, '#482d16'); bx2(7, 7, 2, 2, '#482d16'); break;
    case 'pants_plate':
      bx2(4, 4, 8, 3, '#7c8594'); bx2(4, 7, 3, 7, '#7c8594'); bx2(9, 7, 3, 7, '#7c8594'); bx2(4, 4, 8, 1, '#5a6375'); bx2(4, 9, 3, 1, '#d5dbe6'); bx2(9, 9, 3, 1, '#d5dbe6'); break;
    case 'boots_leather':
      bx2(3, 6, 4, 7, '#3a2618'); bx2(9, 6, 4, 7, '#3a2618'); bx2(2, 11, 6, 3, '#3a2618'); bx2(8, 11, 6, 3, '#3a2618'); bx2(2, 13, 6, 1, '#1e130c'); bx2(8, 13, 6, 1, '#1e130c'); break;
    case 'boots_fur':
      bx2(3, 5, 4, 2, '#d0d5dc'); bx2(9, 5, 4, 2, '#d0d5dc'); bx2(3, 7, 4, 6, '#4a3b30'); bx2(9, 7, 4, 6, '#4a3b30'); bx2(2, 11, 6, 3, '#4a3b30'); bx2(8, 11, 6, 3, '#4a3b30'); break;
    case 'hood_hunter':
      bx2(4, 3, 8, 9, '#2f4836'); bx2(3, 5, 10, 6, '#2f4836'); bx2(6, 6, 4, 4, '#142017'); px(7, 4, '#4a7c59'); break;

    // --- LOOT / MATERIÁLY (10) ---
    case 'wood':
      bx2(3, 4, 10, 8, '#8a5a30'); bx2(5, 6, 6, 4, '#6a3f1e'); bx2(3, 4, 10, 2, '#a87442'); break;
    case 'stone':
      bx2(3, 4, 10, 8, '#7c8594'); bx2(5, 6, 4, 4, '#5a6375'); bx2(3, 4, 10, 2, '#9aa3b4'); break;
    case 'ore_iron':
      bx2(3, 4, 10, 8, '#5a6375'); px(5, 6, '#d5dbe6'); px(8, 5, '#ffffff'); px(9, 8, '#d5dbe6'); px(6, 9, '#ffffff'); break;
    case 'ore_gold':
      bx2(3, 4, 10, 8, '#b88622'); px(5, 6, '#ffd86b'); px(8, 5, '#fff2b2'); px(9, 8, '#ffd86b'); px(6, 9, '#ffffff'); break;
    case 'gem_ruby':
      bx2(5, 4, 6, 8, '#c72635'); bx2(6, 3, 4, 10, '#ff3b4e'); px(7, 5, '#ffffff'); px(8, 5, '#ff9aa5'); break;
    case 'gem_sapphire':
      bx2(5, 4, 6, 8, '#2455b5'); bx2(6, 3, 4, 10, '#3d7bf0'); px(7, 5, '#ffffff'); px(8, 5, '#a8c7fa'); break;
    case 'leather':
      bx2(4, 4, 8, 8, '#8a522a'); bx2(3, 5, 10, 6, '#8a522a'); bx2(5, 6, 6, 4, '#6e3e1c'); break;
    case 'potion_hp':
      bx2(6, 2, 4, 3, '#a87442'); bx2(4, 5, 8, 8, '#ff2a2a'); bx2(5, 4, 6, 10, '#ff4a4a'); px(6, 7, '#ffffff'); px(7, 8, '#ffb0b0'); break;
    case 'apple':
      bx2(4, 5, 8, 7, '#ffd86b'); bx2(5, 4, 6, 9, '#ffd86b'); px(7, 2, '#4a7c59'); px(8, 3, '#7bd45a'); px(6, 6, '#ffffff'); break;
    case 'torch':
      ln(3, 14, 10, 7, '#6a3f1e'); bx2(9, 3, 5, 5, '#ff7a1e'); bx2(10, 2, 3, 3, '#ffd86b'); px(11, 3, '#ffffff'); break;
  }
  return c.toDataURL();
}

for (const it of INV) it.icon = icon(it.id);
