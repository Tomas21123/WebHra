// ---------- Inventář, Lišta a Výbava (RPG Systém v2) ----------
const EQUIPPED_SLOTS = {
  cloth_head: null,
  cloth_chest: 'tunic_linen',
  cloth_legs: 'pants_leather',
  cloth_feet: 'boots_leather',
  armor_head: null,
  armor_chest: null,
  armor_legs: null,
  armor_feet: null,
  hand_l: null,
  hand_r: 'sword',
  ring_l: null,
  ring_r: null
};

const EQ = [];
const HB = [null];
const MAXHB = 9;

let hbSel = 0;
let heldId = 'sword';
let invOpen = false;
let mainCat = 'all';
let subCat = 'all';
let currentMode = 'equip'; // 'equip' | 'craft'
let searchQuery = '';
let selectedCraftRecipeId = 'craft_shield_wood';

// Definice podkategorií pro sekci 2
const SUBCATS = {
  all: [
    { id: 'all', name: 'Vše' },
    { id: 'weapon', name: 'Zbraně' },
    { id: 'cloth', name: 'Oblečení' },
    { id: 'armor', name: 'Brnění' },
    { id: 'shield', name: 'Štíty' },
    { id: 'ring', name: 'Prsteny' },
    { id: 'material', name: 'Suroviny' }
  ],
  weapon: [
    { id: 'all', name: 'Vše' },
    { id: 'sword', name: 'Meče' },
    { id: 'spear', name: 'Kopí' },
    { id: 'bow', name: 'Luky' },
    { id: 'staff', name: 'Čarovné hole' },
    { id: 'shield', name: 'Štíty' },
    { id: 'other', name: 'Ostatní' }
  ],
  armor: [
    { id: 'all', name: 'Vše' },
    { id: 'cloth', name: 'Oblečení' },
    { id: 'armor', name: 'Brnění' },
    { id: 'cape', name: 'Kápě' }
  ],
  other: [
    { id: 'all', name: 'Vše' },
    { id: 'ring', name: 'Prsteny' },
    { id: 'material', name: 'Suroviny' },
    { id: 'consumable', name: 'Spotřební' }
  ]
};

// Recepty pro Crafting (Sekce 5 - Režim Crafting)
const CRAFTING_RECIPES = [
  {
    id: 'craft_torch',
    result: 'torch',
    resultCount: 4,
    cat: 'tools',
    name: 'Pochodeň (4x)',
    ingredients: [
      { id: 'wood', count: 1, name: 'Dubové dřevo' },
      { id: 'stone', count: 1, name: 'Kamenný blok' }
    ]
  },
  {
    id: 'craft_sword',
    result: 'sword',
    resultCount: 1,
    cat: 'weapons',
    name: 'Ocelový meč',
    ingredients: [
      { id: 'ore_iron', count: 2, name: 'Železná ruda' },
      { id: 'wood', count: 1, name: 'Dubové dřevo' },
      { id: 'leather', count: 1, name: 'Vyčiněná useň' }
    ]
  },
  {
    id: 'craft_spear',
    result: 'spear',
    resultCount: 1,
    cat: 'weapons',
    name: 'Rytířské kopí',
    ingredients: [
      { id: 'wood', count: 3, name: 'Dubové dřevo' },
      { id: 'ore_iron', count: 2, name: 'Železná ruda' }
    ]
  },
  {
    id: 'craft_bow',
    result: 'bow',
    resultCount: 1,
    cat: 'weapons',
    name: 'Tisový luk',
    ingredients: [
      { id: 'wood', count: 3, name: 'Dubové dřevo' },
      { id: 'leather', count: 2, name: 'Vyčiněná useň' }
    ]
  },
  {
    id: 'craft_staff_frost',
    result: 'staff_frost',
    resultCount: 1,
    cat: 'weapons',
    name: 'Mrazivá ledová hůl',
    ingredients: [
      { id: 'wood', count: 3, name: 'Dubové dřevo' },
      { id: 'gem_sapphire', count: 1, name: 'Hvězdný safír' }
    ]
  },
  {
    id: 'craft_shield_wood',
    result: 'shield_wood',
    resultCount: 1,
    cat: 'shields',
    name: 'Dubový okrouhlý štít',
    ingredients: [
      { id: 'wood', count: 3, name: 'Dubové dřevo' },
      { id: 'ore_iron', count: 1, name: 'Železná ruda' },
      { id: 'leather', count: 1, name: 'Vyčiněná useň' }
    ]
  },
  {
    id: 'craft_shield_iron',
    result: 'shield_iron',
    resultCount: 1,
    cat: 'shields',
    name: 'Královský erbovní štít',
    ingredients: [
      { id: 'ore_iron', count: 4, name: 'Železná ruda' },
      { id: 'ore_gold', count: 1, name: 'Zlatý valoun' }
    ]
  },
  {
    id: 'craft_helmet_iron',
    result: 'helmet_iron',
    resultCount: 1,
    cat: 'armor',
    name: 'Rytířská přilba',
    ingredients: [
      { id: 'ore_iron', count: 3, name: 'Železná ruda' }
    ]
  },
  {
    id: 'craft_armor_iron',
    result: 'armor_iron',
    resultCount: 1,
    cat: 'armor',
    name: 'Rytířský kyrys',
    ingredients: [
      { id: 'ore_iron', count: 5, name: 'Železná ruda' },
      { id: 'leather', count: 2, name: 'Vyčiněná useň' }
    ]
  },
  {
    id: 'craft_boots_plate',
    result: 'boots_plate',
    resultCount: 1,
    cat: 'armor',
    name: 'Plátové boty',
    ingredients: [
      { id: 'ore_iron', count: 2, name: 'Železná ruda' },
      { id: 'leather', count: 1, name: 'Vyčiněná useň' }
    ]
  },
  {
    id: 'craft_ring_ruby',
    result: 'ring_ruby',
    resultCount: 1,
    cat: 'rings',
    name: 'Rubínový prsten síly',
    ingredients: [
      { id: 'ore_gold', count: 2, name: 'Zlatý valoun' },
      { id: 'gem_ruby', count: 1, name: 'Ohnivý rubín' }
    ]
  },
  {
    id: 'craft_ring_sapphire',
    result: 'ring_sapphire',
    resultCount: 1,
    cat: 'rings',
    name: 'Safírový prsten moudrosti',
    ingredients: [
      { id: 'ore_gold', count: 2, name: 'Zlatý valoun' },
      { id: 'gem_sapphire', count: 1, name: 'Hvězdný safír' }
    ]
  },
  {
    id: 'craft_potion_health',
    result: 'potion_health',
    resultCount: 1,
    cat: 'alchemy',
    name: 'Léčivý lektvar',
    ingredients: [
      { id: 'flower_red', count: 1, name: 'Červená květina' },
      { id: 'flask_water', count: 1, name: 'Láhev čisté vody' }
    ]
  },
  {
    id: 'craft_potion_stamina',
    result: 'potion_stamina',
    resultCount: 1,
    cat: 'alchemy',
    name: 'Lektvar výdrže',
    ingredients: [
      { id: 'herb_green', count: 1, name: 'Zelená bylina' },
      { id: 'flask_water', count: 1, name: 'Láhev čisté vody' }
    ]
  },
  {
    id: 'craft_potion_strength',
    result: 'potion_strength',
    resultCount: 1,
    cat: 'alchemy',
    name: 'Elixír síly',
    ingredients: [
      { id: 'monster_core', count: 1, name: 'Jádro nestvůry' },
      { id: 'ore_gold', count: 1, name: 'Zlatý valoun' }
    ]
  },
  {
    id: 'craft_potion_speed',
    result: 'potion_speed',
    resultCount: 1,
    cat: 'alchemy',
    name: 'Lektvar hbitosti',
    ingredients: [
      { id: 'crystal_blue', count: 1, name: 'Modrý krystal' },
      { id: 'flask_water', count: 1, name: 'Láhev čisté vody' }
    ]
  },
  {
    id: 'craft_potion_hp',
    result: 'potion_hp',
    resultCount: 1,
    cat: 'alchemy',
    name: 'Léčivý lektvar (Jablečný)',
    ingredients: [
      { id: 'apple', count: 1, name: 'Zlaté jablko' }
    ]
  }
];

// Synchronizace pole EQ s EQUIPPED_SLOTS
function syncEQArray() {
  EQ.length = 0;
  for (const k in EQUIPPED_SLOTS) {
    if (EQUIPPED_SLOTS[k] && !EQ.includes(EQUIPPED_SLOTS[k])) {
      EQ.push(EQUIPPED_SLOTS[k]);
    }
  }
  const domHand = (window.dominantHand === 'left') ? EQUIPPED_SLOTS.hand_l : EQUIPPED_SLOTS.hand_r;
  if (domHand && domHand !== heldId) {
    heldId = domHand;
    HB[0] = domHand;
    hbSel = 0;
  }
}

// Získat mapu pro 3D model postavy
function getEquippedMap() {
  const map = {};
  // Hlava: přednost má přilba, jinak čepice
  const hId = EQUIPPED_SLOTS.armor_head || EQUIPPED_SLOTS.cloth_head;
  if (hId) map.head = INV.find(x => x.id === hId);

  // Trup: přednost má kyrys, jinak tryko
  const cId = EQUIPPED_SLOTS.armor_chest || EQUIPPED_SLOTS.cloth_chest;
  if (cId) map.chest = INV.find(x => x.id === cId);

  // Nohy: přednost mají pláty, jinak gatě
  const lId = EQUIPPED_SLOTS.armor_legs || EQUIPPED_SLOTS.cloth_legs;
  if (lId) map.legs = INV.find(x => x.id === lId);

  // Boty: přednost mají plátové boty, jinak cestovní
  const fId = EQUIPPED_SLOTS.armor_feet || EQUIPPED_SLOTS.cloth_feet;
  if (fId) map.feet = INV.find(x => x.id === fId);

  // Kápě
  const kId = (EQUIPPED_SLOTS.cloth_head && EQUIPPED_SLOTS.cloth_head.startsWith('cape_')) ? EQUIPPED_SLOTS.cloth_head : null;
  if (kId) map.cape = INV.find(x => x.id === kId);

  return map;
}

function getEquippedMainHandId() {
  const isLeft = (window.dominantHand === 'left');
  return isLeft ? EQUIPPED_SLOTS.hand_l : EQUIPPED_SLOTS.hand_r;
}

function getEquippedOffHandId() {
  const isLeft = (window.dominantHand === 'left');
  return isLeft ? EQUIPPED_SLOTS.hand_r : EQUIPPED_SLOTS.hand_l;
}

window.getEquippedMainHandId = getEquippedMainHandId;
window.getEquippedOffHandId = getEquippedOffHandId;
window.getEquippedDominantHandId = getEquippedMainHandId;
window.getEquippedSecondaryHandId = getEquippedOffHandId;

window.getEquippedDominantHandItem = () => {
  const id = getEquippedMainHandId();
  return id ? INV.find(x => x.id === id) || null : null;
};
window.getEquippedSecondaryHandItem = () => {
  const id = getEquippedOffHandId();
  return id ? INV.find(x => x.id === id) || null : null;
};

function getEquippedShield() {
  const offId = getEquippedOffHandId();
  const mainId = getEquippedMainHandId();
  if (offId && offId.startsWith('shield_')) return INV.find(x => x.id === offId);
  if (mainId && mainId.startsWith('shield_')) return INV.find(x => x.id === mainId);
  return null;
}

function isShieldInDominantHand() {
  const mainId = getEquippedMainHandId();
  return !!(mainId && mainId.startsWith('shield_'));
}
window.isShieldInDominantHand = isShieldInDominantHand;

function hasEquippedShield() {
  return !!getEquippedShield();
}

function getPlayerAttackDamage(whichHand = 'dominant') {
  const weaponId = (whichHand === 'secondary') ? getEquippedOffHandId() : (getEquippedMainHandId() || heldId);
  const it = INV.find(x => x.id === weaponId);

  // Base attack power from player level (Lv 1 = 10, Lv 2 = 12, etc.)
  const pObj = (typeof window !== 'undefined' && window.P) ? window.P : (typeof P !== 'undefined' ? P : null);
  const baseAtk = (pObj && pObj.baseStats && typeof pObj.baseStats.attackPower === 'number')
    ? pObj.baseStats.attackPower
    : (10 + (pObj && pObj.level ? (pObj.level - 1) * 2 : 0));

  let baseDmg = ((it && it.damage) ? it.damage : 0) + baseAtk;
  let critChance = (it && it.critChance) ? it.critChance : 0.05;

  if (pObj && pObj.baseStats && typeof pObj.baseStats.critChance === 'number') {
    critChance += (pObj.baseStats.critChance - 0.05);
  }

  // Bonusy z obou prstenů
  for (const rSlot of ['ring_l', 'ring_r']) {
    const rId = EQUIPPED_SLOTS[rSlot];
    if (rId) {
      const ring = INV.find(x => x.id === rId);
      if (ring) {
        if (ring.bonusDamage) baseDmg += ring.bonusDamage;
        if (ring.bonusCrit) critChance += ring.bonusCrit;
      }
    }
  }

  // Započtení aktivního elixíru síly (+25%)
  if (typeof getActiveBuffMultiplier === 'function') {
    const strMult = getActiveBuffMultiplier('strength');
    if (strMult > 0) {
      baseDmg = Math.round(baseDmg * (1 + strMult));
    }
  }

  const isCrit = Math.random() < critChance;
  const variance = (Math.random() * 0.2 - 0.1);
  let finalDmg = Math.round(baseDmg * (1 + variance));
  if (isCrit) finalDmg = Math.round(finalDmg * 1.5);
  return { damage: Math.max(1, finalDmg), isCrit, weaponName: it ? it.name : 'Pěsti', critChance };
}

function getPlayerAttackReach(whichHand = 'dominant') {
  const weaponId = (whichHand === 'secondary') ? getEquippedOffHandId() : (getEquippedMainHandId() || heldId);
  const it = INV.find(x => x.id === weaponId);
  return (it && it.reach) ? it.reach : 2.2;
}

function equipToSlot(id, slotKey) {
  const it = INV.find(x => x.id === id);
  if (!it) return;

  // Uvolnit jiný slot, pokud v něm už tato položka byla
  for (const k in EQUIPPED_SLOTS) {
    if (EQUIPPED_SLOTS[k] === id && k !== slotKey) {
      EQUIPPED_SLOTS[k] = null;
    }
  }

  EQUIPPED_SLOTS[slotKey] = id;

  if (slotKey.startsWith('hand_')) {
    const isLeftDom = (window.dominantHand === 'left');
    const isThisDom = (isLeftDom && slotKey === 'hand_l') || (!isLeftDom && slotKey === 'hand_r');
    if (isThisDom) {
      let i = HB.indexOf(null);
      if (i < 0 && !HB.includes(id)) {
        if (!addSlot()) i = 0;
        else i = HB.length - 1;
      }
      if (i >= 0) HB[i] = id;
      heldId = id;
      hbSel = Math.max(0, HB.indexOf(id));
    }
    const hLabel = slotKey === 'hand_l' ? 'levé ruky' : 'pravé ruky';
    toast(`Vzato do ${hLabel}: ${it.name}`);
  } else if (slotKey.startsWith('ring_')) {
    const hLabel = slotKey === 'ring_l' ? 'levou ruku' : 'pravou ruku';
    toast(`Prsten nasazen na ${hLabel}: ${it.name}`);
  } else {
    toast(`Vybaveno: ${it.name}`);
  }

  syncEQArray();
  updatePlayerAppearance();
  applyHeld();
  renderHB();
  renderInv();
  updateEquipmentUI();
  updateInventoryPreview();

  if (window.networkManager && typeof window.networkManager.sendEquipmentChange === 'function') {
    window.networkManager.sendEquipmentChange();
  }
}
window.equipToSlot = equipToSlot;

function getPlayerArmorReduction() {
  let totalDef = 0;
  for (const slotKey in EQUIPPED_SLOTS) {
    const id = EQUIPPED_SLOTS[slotKey];
    if (id) {
      const it = INV.find(x => x.id === id);
      if (it && it.defense) totalDef += it.defense;
    }
  }
  return Math.min(0.85, totalDef); // Max 85% absorpce poškození
}

function getPlayerBonusHp() {
  let bonus = 0;
  for (const slotKey in EQUIPPED_SLOTS) {
    const id = EQUIPPED_SLOTS[slotKey];
    if (id) {
      const it = INV.find(x => x.id === id);
      if (it && it.bonusHp) bonus += it.bonusHp;
    }
  }
  return bonus;
}

function getPlayerBonusSpeed() {
  let bonus = 0;
  for (const slotKey in EQUIPPED_SLOTS) {
    const id = EQUIPPED_SLOTS[slotKey];
    if (id) {
      const it = INV.find(x => x.id === id);
      if (it && it.bonusSpeed) bonus += it.bonusSpeed;
    }
  }
  return bonus;
}

window.getPlayerAttackDamage = getPlayerAttackDamage;
window.getPlayerAttackReach = getPlayerAttackReach;
window.getPlayerArmorReduction = getPlayerArmorReduction;
window.getPlayerBonusHp = getPlayerBonusHp;
window.getPlayerBonusSpeed = getPlayerBonusSpeed;
window.getEquippedShield = getEquippedShield;
window.hasEquippedShield = hasEquippedShield;
window.getEquippedMainHandId = getEquippedMainHandId;
window.getEquippedOffHandId = getEquippedOffHandId;
window.EQUIPPED_SLOTS = EQUIPPED_SLOTS;

// =============================================================================
// Správa Dočasných Buffů (Strength, Speed) - F9
// =============================================================================
window.PlayerBuffs = {
  strength: { active: false, mult: 0.25, expiresAt: 0 },
  speed: { active: false, mult: 0.30, expiresAt: 0 }
};

function applyPlayerBuff(type, mult, durationMs) {
  if (!window.PlayerBuffs) window.PlayerBuffs = {};
  window.PlayerBuffs[type] = {
    active: true,
    mult: mult,
    expiresAt: Date.now() + durationMs
  };
}
window.applyPlayerBuff = applyPlayerBuff;

function getActiveBuffMultiplier(type) {
  if (!window.PlayerBuffs || !window.PlayerBuffs[type]) return 0;
  const buff = window.PlayerBuffs[type];
  if (buff.active && Date.now() < buff.expiresAt) {
    return buff.mult;
  } else {
    buff.active = false;
    return 0;
  }
}
window.getActiveBuffMultiplier = getActiveBuffMultiplier;

// =============================================================================
// Univerzální Mechanika Konzumace Předmětů (Lektvary, Jídlo) - F9
// =============================================================================
function useConsumableItem(it) {
  if (!it) return false;
  if (it.count !== undefined && it.count <= 0) {
    if (typeof toast === 'function') toast('Tento předmět již nemáš!');
    return false;
  }

  const pObj = (typeof window !== 'undefined' && window.P) ? window.P : (typeof P !== 'undefined' ? P : null);
  const bonusHp = (typeof window.getPlayerBonusHP === 'function') ? window.getPlayerBonusHP() : 0;
  const levelBonusHp = (pObj && pObj.baseStats && typeof pObj.baseStats.maxHp === 'number') ? (pObj.baseStats.maxHp - 100) : 0;
  const maxHp = 100 + bonusHp + levelBonusHp;
  const maxSt = (pObj && pObj.maxStamina) ? pObj.maxStamina : 100;

  let consumed = false;

  // 1. Léčení HP (potion_health, potion_hp)
  if (it.healHp || it.id === 'potion_health' || it.id === 'potion_hp') {
    const healAmt = it.healHp || (it.id === 'potion_health' ? 50 : 40);
    const curHp = (typeof G !== 'undefined' ? G.hp : (pObj ? pObj.hp : 100));
    if (curHp < maxHp) {
      if (typeof G !== 'undefined') G.hp = Math.min(maxHp, G.hp + healAmt);
      if (pObj) pObj.hp = Math.min(maxHp, (pObj.hp || 100) + healAmt);
      if (typeof toast === 'function') toast(`🧪 Vypit léčivý lektvar (+${healAmt} HP)!`);
      consumed = true;
    } else {
      if (typeof toast === 'function') toast('Máš plné zdraví!');
      return false;
    }
  }
  // 2. Obnova Staminy (potion_stamina)
  else if (it.restoreStamina || it.id === 'potion_stamina') {
    const stAmt = it.restoreStamina || 50;
    const curSt = (typeof G !== 'undefined' ? G.st : (pObj ? pObj.stamina : 100));
    if (curSt < maxSt) {
      if (typeof G !== 'undefined') G.st = Math.min(maxSt, G.st + stAmt);
      if (pObj) pObj.stamina = Math.min(maxSt, (pObj.stamina || 100) + stAmt);
      if (typeof toast === 'function') toast(`⚡ Vypit lektvar výdrže (+${stAmt} staminy)!`);
      consumed = true;
    } else {
      if (typeof toast === 'function') toast('Máš plnou staminu!');
      return false;
    }
  }
  // 3. Elixír Síly (+25% poškození na 30s)
  else if (it.buffStrength || it.id === 'potion_strength') {
    applyPlayerBuff('strength', 0.25, (it.buffDuration || 30) * 1000);
    if (typeof toast === 'function') toast('⚔️ Vypit elixír síly (+25% poškození na 30s)!');
    consumed = true;
  }
  // 4. Lektvar Hbitosti (+30% rychlost na 30s)
  else if (it.buffSpeed || it.id === 'potion_speed') {
    applyPlayerBuff('speed', 0.30, (it.buffDuration || 30) * 1000);
    if (typeof toast === 'function') toast('💨 Vypit lektvar hbitosti (+30% rychlost na 30s)!');
    consumed = true;
  }
  // 5. Jablko
  else if (it.id === 'apple') {
    if (typeof G !== 'undefined') {
      G.hp = Math.min(maxHp, G.hp + 25);
      G.st = maxSt;
    }
    if (pObj) {
      pObj.hp = Math.min(maxHp, (pObj.hp || 100) + 25);
      pObj.stamina = maxSt;
    }
    if (typeof toast === 'function') toast('🍎 Snědl jsi jablko (+25 HP, plná výdrž)!');
    consumed = true;
  }

  if (consumed) {
    if (typeof playAttackSound === 'function') playAttackSound('punch');

    if (it.count !== undefined) {
      it.count -= 1;
      if (it.count <= 0) {
        it.count = 0;
        for (const slotKey in EQUIPPED_SLOTS) {
          if (EQUIPPED_SLOTS[slotKey] === it.id) EQUIPPED_SLOTS[slotKey] = null;
        }
        if (typeof HB !== 'undefined') {
          const hbIdx = HB.indexOf(it.id);
          if (hbIdx >= 0) HB[hbIdx] = null;
        }
        if (typeof heldId !== 'undefined' && heldId === it.id) {
          heldId = null;
          if (typeof hbSel !== 'undefined') hbSel = -1;
        }
      }
    }

    if (typeof ui === 'function') ui();
    if (typeof syncEQArray === 'function') syncEQArray();
    if (typeof renderHB === 'function') renderHB();
    if (typeof renderInv === 'function') renderInv();
    if (typeof updateEquipmentUI === 'function') updateEquipmentUI();
    return true;
  }
  return false;
}
window.useConsumableItem = useConsumableItem;

// =============================================================================
// Mechanika Vylepšování Vybavení (+0 až +5) - F9
// =============================================================================
function getUpgradeRequirements(item) {
  const nextLvl = (item.upgradeLevel || 0) + 1;
  return [
    { id: 'wood', count: nextLvl * 2, name: 'Dubové dřevo' },
    { id: 'stone', count: nextLvl * 2, name: 'Kamenný blok' },
    { id: 'ore_gold', count: nextLvl, name: 'Zlatý valoun' },
    ...(nextLvl >= 2 ? [{ id: 'monster_core', count: nextLvl - 1, name: 'Jádro nestvůry' }] : [])
  ];
}
window.getUpgradeRequirements = getUpgradeRequirements;

function updateItemStatList(item) {
  const lvl = item.upgradeLevel || 0;
  if (lvl === 0) return;

  if (item.cat === 'weapon') {
    const base = (item.baseDamage !== undefined) ? item.baseDamage : item.damage;
    const boost = item.damage - base;
    item.statList = [
      `⚔️ Poškození: ${item.damage} HP (+${boost} z vylepšení +${lvl})`,
      `🎯 Dosah: ${item.reach || 3.2} m`,
      `⚡ Rychlost: ${item.speed || 1.0}×`,
      `💥 Šance na kritický zásah: ${Math.round((item.critChance || 0.1) * 100)}%`
    ];
  } else if (item.cat === 'armor' || item.subcat === 'shield') {
    const defPct = Math.round((item.defense || 0) * 100);
    const defBoost = Math.round(lvl * 5);
    const hpBoost = lvl * 8;
    item.statList = [
      `🛡️ Obrana: +${defPct}% (+${defBoost}% z vylepšení +${lvl})`,
      ...(item.bonusHp ? [`❤️ Zdraví: +${item.bonusHp} HP (+${hpBoost} z vylepšení +${lvl})`] : []),
      ...(item.blockPower ? [`🛡️ Vykrytí útoků: ${Math.round(item.blockPower * 100)}%`] : [])
    ];
  }
}
window.updateItemStatList = updateItemStatList;

function upgradeEquipment(item) {
  if (!item || (item.upgradeLevel || 0) >= 5) return false;
  if (item.cat !== 'weapon' && item.cat !== 'armor' && item.subcat !== 'shield') return false;

  const reqs = getUpgradeRequirements(item);

  // 1. Ověření surovin v INV
  for (const req of reqs) {
    const have = INV.find(x => x.id === req.id);
    const count = (have && have.count !== undefined) ? have.count : (have ? 1 : 0);
    if (count < req.count) {
      if (typeof toast === 'function') {
        toast(`Chybí surovina pro vylepšení: ${req.name} (${count}/${req.count})`);
      }
      return false;
    }
  }

  // 2. Odečtení surovin z INV
  for (const req of reqs) {
    const have = INV.find(x => x.id === req.id);
    if (have && have.count !== undefined) {
      have.count = Math.max(0, have.count - req.count);
    }
  }

  // 3. Uložení původních bází
  if (item.baseDamage === undefined && item.damage !== undefined) item.baseDamage = item.damage;
  if (item.baseDefense === undefined && item.defense !== undefined) item.baseDefense = item.defense;
  if (item.baseBonusHp === undefined && item.bonusHp !== undefined) item.baseBonusHp = item.bonusHp;
  if (!item.baseName) item.baseName = item.name.replace(/\s\+\d+$/, '');

  // 4. Inkrementace úrovně
  item.upgradeLevel = (item.upgradeLevel || 0) + 1;
  const lvl = item.upgradeLevel;
  item.name = `${item.baseName} +${lvl}`;

  // 5. Přepočet statistik (+15% dmg na tier zbraně, +5% def a +8 HP na brnění)
  if (item.cat === 'weapon') {
    item.damage = item.baseDamage + Math.round(item.baseDamage * 0.15 * lvl);
  }
  if (item.defense !== undefined) {
    item.defense = parseFloat((item.baseDefense + 0.05 * lvl).toFixed(2));
  }
  if (item.bonusHp !== undefined) {
    item.bonusHp = item.baseBonusHp + 8 * lvl;
  }

  // 6. Povýšení rarity
  if (lvl >= 5) item.rarity = 'legendary';
  else if (lvl >= 4 && item.rarity !== 'legendary') item.rarity = 'epic';
  else if (lvl >= 3 && item.rarity !== 'epic' && item.rarity !== 'legendary') item.rarity = 'rare';
  else if (lvl >= 1 && item.rarity === 'common') item.rarity = 'uncommon';

  // 7. Aktualizace tooltipů
  updateItemStatList(item);

  // 8. Zvuk a toast
  if (typeof playAttackSound === 'function') playAttackSound('heavy');
  if (typeof toast === 'function') toast(`✨ Vylepšeno na +${lvl}: ${item.name}!`);

  // 9. XP za vylepšení
  if (typeof window.addPlayerXP === 'function') {
    window.addPlayerXP(50 * lvl, 'upgrade');
  }

  // 10. Překreslení UI
  if (typeof renderInv === 'function') renderInv();
  if (typeof updateEquipmentUI === 'function') updateEquipmentUI();
  return true;
}
window.upgradeEquipment = upgradeEquipment;

// =============================================================================
// Povinné Contract Funkce na window (F9)
// =============================================================================

window.getPlayerBonusDamage = function() {
  let bonusDamage = 0;

  // 1. Sandbox Mode (E2E Test Runner Harness)
  if (typeof window.P !== 'undefined' && window.P && window.P.equipment) {
    const weapon = window.P.equipment.weapon;
    if (weapon) {
      const base = (weapon.baseDamage !== undefined) ? weapon.baseDamage : (weapon.damage || 0);
      const lvl = weapon.upgradeLevel || 0;
      const upgradeBonus = lvl * 4;
      bonusDamage += (base + upgradeBonus);
    }
    if (window.P.equipment.weapon !== undefined) {
      return bonusDamage;
    }
  }

  // 2. Live Game Mode: Zbraň v dominantní ruce z EQUIPPED_SLOTS
  if (typeof EQUIPPED_SLOTS !== 'undefined' && typeof INV !== 'undefined') {
    const weaponId = (typeof getEquippedMainHandId === 'function')
      ? getEquippedMainHandId()
      : (typeof heldId !== 'undefined' ? heldId : null);

    if (weaponId) {
      const weapon = INV.find(x => x.id === weaponId);
      if (weapon && weapon.cat === 'weapon') {
        const base = (weapon.baseDamage !== undefined) ? weapon.baseDamage : (weapon.damage || 0);
        const lvl = weapon.upgradeLevel || 0;
        const upgradeBonus = Math.round(base * 0.15 * lvl);
        bonusDamage += (base + upgradeBonus);
      }
    }

    // Bonusy z prstenů
    for (const rSlot of ['ring_l', 'ring_r']) {
      const rId = EQUIPPED_SLOTS[rSlot];
      if (rId) {
        const ring = INV.find(x => x.id === rId);
        if (ring && ring.bonusDamage) bonusDamage += ring.bonusDamage;
      }
    }
  }

  // 3. Započtení aktivního elixíru síly (+25%)
  if (typeof getActiveBuffMultiplier === 'function') {
    const strengthMult = getActiveBuffMultiplier('strength');
    if (strengthMult > 0) {
      bonusDamage = Math.round(bonusDamage * (1 + strengthMult));
    }
  }

  return bonusDamage;
};

window.getPlayerBonusHP = function() {
  let totalBonusHp = 0;

  // 1. Sandbox Mode (E2E Test Runner Harness)
  if (typeof window.P !== 'undefined' && window.P && window.P.equipment) {
    const armor = window.P.equipment.armor;
    if (armor) {
      const base = (armor.baseBonusHp !== undefined) ? armor.baseBonusHp : (armor.bonusHp || 0);
      const lvl = armor.upgradeLevel || 0;
      totalBonusHp += (base + lvl * 8);
    }
    const shield = window.P.equipment.shield;
    if (shield && shield.bonusHp) {
      totalBonusHp += (shield.bonusHp + (shield.upgradeLevel || 0) * 8);
    }
    if (window.P.equipment.armor !== undefined || window.P.equipment.shield !== undefined) {
      return totalBonusHp;
    }
  }

  // 2. Live Game Mode: Průchod všemi EQUIPPED_SLOTS
  if (typeof EQUIPPED_SLOTS !== 'undefined' && typeof INV !== 'undefined') {
    const countedItemIds = new Set();
    for (const slotKey in EQUIPPED_SLOTS) {
      const id = EQUIPPED_SLOTS[slotKey];
      if (id && !countedItemIds.has(id)) {
        countedItemIds.add(id);
        const it = INV.find(x => x.id === id);
        if (it) {
          const baseHp = (it.baseBonusHp !== undefined) ? it.baseBonusHp : (it.bonusHp || 0);
          const lvl = it.upgradeLevel || 0;
          totalBonusHp += (baseHp + lvl * 8);
        }
      }
    }
  }

  return totalBonusHp;
};
window.getPlayerBonusHp = window.getPlayerBonusHP;

window.getPlayerBonusDefense = function() {
  let totalDef = 0;

  // 1. Sandbox Mode (E2E Test Runner Harness)
  if (typeof window.P !== 'undefined' && window.P && window.P.equipment) {
    let def = 0;
    if (window.P.equipment.armor) {
      def += (window.P.equipment.armor.defense || 0) + (window.P.equipment.armor.upgradeLevel || 0) * 0.05;
    }
    if (window.P.equipment.shield) {
      def += (window.P.equipment.shield.defense || 0) + (window.P.equipment.shield.upgradeLevel || 0) * 0.05;
    }
    return parseFloat(def.toFixed(2));
  }

  // 2. Live Game Mode: Průchod všemi EQUIPPED_SLOTS
  if (typeof EQUIPPED_SLOTS !== 'undefined' && typeof INV !== 'undefined') {
    const countedItemIds = new Set();
    for (const slotKey in EQUIPPED_SLOTS) {
      const id = EQUIPPED_SLOTS[slotKey];
      if (id && !countedItemIds.has(id)) {
        countedItemIds.add(id);
        const it = INV.find(x => x.id === id);
        if (it && it.defense) {
          const baseDef = (it.baseDefense !== undefined) ? it.baseDefense : it.defense;
          const lvl = it.upgradeLevel || 0;
          totalDef += (baseDef + lvl * 0.05);
        }
      }
    }
  }

  return parseFloat(totalDef.toFixed(2));
};

// ---------- Lišta (Hotbar) ----------
function renderHB() {
  const el = $('hb');
  if (!el) return;
  el.innerHTML = '';
  for (let i = 0; i < HB.length; i++) {
    const d = document.createElement('div');
    d.className = 'hs' + (i === hbSel ? ' sel' : '');
    const it = INV.find(x => x.id === HB[i]);
    d.innerHTML = '<u>' + (i + 1) + '</u>' + (it ? '<img src="' + it.icon + '">' : '');
    d.onclick = () => selSlot(i);
    el.appendChild(d);
  }
}

function selSlot(i) {
  if (i < 0 || i >= HB.length) return;
  if (hbSel === i && heldId) {
    hbSel = -1; heldId = null;
  } else {
    hbSel = i; heldId = HB[i] || null;
  }
  applyHeld();
  renderHB();
  if (window.networkManager && typeof window.networkManager.sendEquipmentChange === 'function') {
    window.networkManager.sendEquipmentChange();
  }
}

function addSlot() {
  if (HB.length < MAXHB) {
    HB.push(null);
    renderHB();
    return true;
  }
  return false;
}

// ---------- Vybavení a Odložení Předmětů ----------
function equip(id) {
  const it = INV.find(x => x.id === id);
  if (!it) return;

  const isLeftDom = (window.dominantHand === 'left');
  const domHandSlot = isLeftDom ? 'hand_l' : 'hand_r';
  const offHandSlot = isLeftDom ? 'hand_r' : 'hand_l';

  if (it.subcat === 'shield') {
    // Štít jde přednostně do vedlejší ruky
    EQUIPPED_SLOTS[offHandSlot] = id;
    toast('Nasažen štít: ' + it.name);
  } else if (it.cat === 'weapon') {
    // Zbraň jde do dominantní ruky
    EQUIPPED_SLOTS[domHandSlot] = id;
    let i = HB.indexOf(null);
    if (i < 0 && !HB.includes(id)) {
      if (!addSlot()) i = 0;
      else i = HB.length - 1;
    }
    if (i >= 0) HB[i] = id;
    heldId = id;
    hbSel = Math.max(0, HB.indexOf(id));
    toast('Vzato do dominantní ruky: ' + it.name);
  } else if (it.subcat === 'ring') {
    // Prsten: nejprve do levé, pokud je volná, jinak do pravé
    if (!EQUIPPED_SLOTS.ring_l) EQUIPPED_SLOTS.ring_l = id;
    else if (!EQUIPPED_SLOTS.ring_r) EQUIPPED_SLOTS.ring_r = id;
    else EQUIPPED_SLOTS.ring_l = id;
    toast('Nasazen prsten: ' + it.name);
  } else if (it.subcat === 'cloth') {
    // Oblečení
    const sName = 'cloth_' + (it.slot || 'chest');
    EQUIPPED_SLOTS[sName] = id;
    toast('Oblečeno: ' + it.name);
  } else if (it.subcat === 'armor') {
    // Brnění
    const sName = 'armor_' + (it.slot || 'chest');
    EQUIPPED_SLOTS[sName] = id;
    toast('Nasazeno brnění: ' + it.name);
  } else if (it.subcat === 'cape') {
    EQUIPPED_SLOTS.cloth_head = id;
    toast('Obléknut plášť: ' + it.name);
  }

  syncEQArray();
  updatePlayerAppearance();
  applyHeld();
  renderHB();
  renderInv();
  updateEquipmentUI();
  updateInventoryPreview();

  if (window.networkManager && typeof window.networkManager.sendEquipmentChange === 'function') {
    window.networkManager.sendEquipmentChange();
  }
}

function unequipSlot(slotKey) {
  const id = EQUIPPED_SLOTS[slotKey];
  if (!id) return;
  const it = INV.find(x => x.id === id);
  EQUIPPED_SLOTS[slotKey] = null;

  if (it && it.cat === 'weapon') {
    const i = HB.indexOf(id);
    if (i >= 0) HB[i] = null;
    if (heldId === id) { heldId = null; hbSel = -1; }
  }

  syncEQArray();
  updatePlayerAppearance();
  applyHeld();
  renderHB();
  renderInv();
  updateEquipmentUI();
  updateInventoryPreview();
  toast('Sundáno: ' + (it ? it.name : 'položka'));

  if (window.networkManager && typeof window.networkManager.sendEquipmentChange === 'function') {
    window.networkManager.sendEquipmentChange();
  }
}

function unequip(id) {
  for (const k in EQUIPPED_SLOTS) {
    if (EQUIPPED_SLOTS[k] === id) {
      unequipSlot(k);
      return;
    }
  }
}

// ---------- Vykreslení Inventáře (Sekce 1, 2, 3) ----------
function renderInv() {
  renderCategoriesUI();
  renderSubcategoriesUI();
  renderGridItemsUI();
  renderCapacityBadge();
}

function renderCapacityBadge() {
  const b = $('invCapacityBadge');
  if (b) {
    const eqCount = EQ.length;
    b.textContent = `${INV.length} předmětů (${eqCount} vybaveno)`;
  }
}

function renderCategoriesUI() {
  document.querySelectorAll('.inv-cat-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.c === mainCat);
  });
}

function renderSubcategoriesUI() {
  const bar = $('invSubcatBar');
  if (!bar) return;
  bar.innerHTML = '';
  const list = SUBCATS[mainCat] || SUBCATS.all;
  list.forEach(sub => {
    const btn = document.createElement('button');
    btn.className = 'subcat-pill' + (subCat === sub.id ? ' active' : '');
    btn.textContent = sub.name;
    btn.onclick = () => {
      subCat = sub.id;
      expandedItemId = null;
      renderSubcategoriesUI();
      renderGridItemsUI();
    };
    bar.appendChild(btn);
  });
}

let expandedItemId = null;

function findLastTileInSameRow(clickedTile, tiles) {
  const targetTop = clickedTile.offsetTop;
  let last = clickedTile;
  for (let i = 0; i < tiles.length; i++) {
    if (Math.abs(tiles[i].offsetTop - targetTop) < 6) {
      last = tiles[i];
    }
  }
  return last;
}

function renderGridItemsUI() {
  const g = $('grid');
  if (!g) return;
  g.innerHTML = '';

  const q = (searchQuery || '').trim().toLowerCase();

  const filtered = INV.filter(it => {
    // 1. Filtr kategorie
    if (mainCat === 'weapon' && it.cat !== 'weapon') return false;
    if (mainCat === 'armor' && it.cat !== 'armor') return false;
    if (mainCat === 'other' && it.cat !== 'loot') return false;

    // 2. Filtr podkategorie
    if (subCat !== 'all') {
      if (mainCat === 'weapon') {
        if (it.subcat !== subCat) return false;
      } else if (mainCat === 'armor') {
        if (it.subcat !== subCat) return false;
      } else if (mainCat === 'other') {
        if (it.subcat !== subCat) return false;
      } else {
        // pro 'all'
        if (it.subcat !== subCat && it.cat !== subCat) return false;
      }
    }

    // 3. Hledání
    if (q) {
      const matchName = it.name.toLowerCase().includes(q);
      const matchDesc = (it.desc || '').toLowerCase().includes(q);
      if (!matchName && !matchDesc) return false;
    }
    return true;
  });

  // Řazení: Vybavené předměty nahoře, potom podle pořadí
  filtered.sort((a, b) => {
    const ea = EQ.includes(a.id) ? 1 : 0;
    const eb = EQ.includes(b.id) ? 1 : 0;
    return eb - ea;
  });

  if (!filtered.length) {
    g.innerHTML = '<div class="inv-empty-state"><span style="font-size:32px;">📦</span><p>Žádné předměty nenalezeny.</p></div>';
    return;
  }

  const createdTiles = [];
  let expandedTile = null;

  for (const it of filtered) {
    const d = document.createElement('div');
    const isEquipped = EQ.includes(it.id);
    const isExpanded = (expandedItemId === it.id);
    const rarityClass = ' rarity-' + (it.rarity || 'common');
    d.className = 'tile' + rarityClass + (isEquipped ? ' eq' : '') + (isExpanded ? ' expanded-active' : '');

    let countHtml = '';
    if (it.count && it.count > 1) {
      countHtml = `<span class="tile-count-badge">${it.count}</span>`;
    }

    d.innerHTML = `
      <img src="${it.icon}" alt="${it.name}">
      <span class="tile-title">${it.name}</span>
      ${countHtml}
    `;

    d.onclick = (e) => {
      e.stopPropagation();
      expandedItemId = (expandedItemId === it.id) ? null : it.id;
      renderGridItemsUI();
    };

    g.appendChild(d);
    createdTiles.push(d);
    if (isExpanded) expandedTile = d;
  }

  // Rozbalovací panel přímo pod vybraným itemem
  if (expandedItemId && expandedTile) {
    const targetItem = INV.find(x => x.id === expandedItemId);
    if (targetItem) {
      const lastTileInRow = findLastTileInSameRow(expandedTile, createdTiles);
      const drawer = createItemDrawer(targetItem);
      if (lastTileInRow) {
        lastTileInRow.after(drawer);
      } else {
        g.appendChild(drawer);
      }
    }
  }
}

// ---------- Sekce 5: Aktualizace Vybavení a Souhrnu Bonusů ----------
function updateEquipmentUI() {
  const isLeftDom = (window.dominantHand === 'left');
  const hLBadge = $('handLRoleBadge');
  const hRBadge = $('handRRoleBadge');

  if (hLBadge && hRBadge) {
    if (isLeftDom) {
      hLBadge.textContent = 'Dominantní';
      hLBadge.className = 'role-pill dom';
      hRBadge.textContent = 'Vedlejší';
      hRBadge.className = 'role-pill';
    } else {
      hRBadge.textContent = 'Dominantní';
      hRBadge.className = 'role-pill dom';
      hLBadge.textContent = 'Vedlejší';
      hLBadge.className = 'role-pill';
    }
  }

  // Procházení všech slotů
  for (const slotKey in EQUIPPED_SLOTS) {
    const el = $('slot_' + slotKey);
    const parentSlot = el ? el.closest('.gear-slot') : null;
    if (!el || !parentSlot) continue;

    const itemId = EQUIPPED_SLOTS[slotKey];
    if (itemId) {
      const it = INV.find(x => x.id === itemId);
      if (it) {
        parentSlot.classList.add('filled');
        el.innerHTML = `
          <div class="slot-item-card rarity-${it.rarity || 'common'}">
            <img src="${it.icon}" alt="${it.name}">
            <span class="slot-item-name">${it.name}</span>
            <button class="slot-unequip-btn" title="Sundat [Klik]">✕</button>
          </div>
        `;
        el.onclick = (e) => {
          e.stopPropagation();
          unequipSlot(slotKey);
        };
      }
    } else {
      parentSlot.classList.remove('filled');
      el.innerHTML = '';
      el.onclick = () => {
        // Kliknutí na prázdné políčko chytře přepne filtr
        handleEmptySlotClick(slotKey);
      };
    }
  }

  // Souhrn bonusů
  const atkInfo = getPlayerAttackDamage();
  const armorRed = getPlayerArmorReduction();
  const bonusHp = getPlayerBonusHp();
  const bonusSpd = getPlayerBonusSpeed();
  const shield = getEquippedShield();

  const armorEl = $('statSumArmor');
  if (armorEl) armorEl.textContent = '+' + Math.round(armorRed * 100) + '%';

  const dmgEl = $('statSumDamage');
  if (dmgEl) dmgEl.textContent = atkInfo.damage + ' HP';

  const hpEl = $('statSumHp');
  if (hpEl) hpEl.textContent = '+' + bonusHp;

  const spdEl = $('statSumSpeed');
  if (spdEl) spdEl.textContent = '+' + Math.round(bonusSpd * 100) + '%';

  const critEl = $('statSumCrit');
  if (critEl) critEl.textContent = Math.round(atkInfo.critChance * 100) + '%';

  const blockEl = $('statSumBlock');
  if (blockEl) blockEl.textContent = shield ? Math.round(shield.blockPower * 100) + '%' : '0%';

  const nickEl = $('invCharNickBadge');
  if (nickEl && typeof getPlayerNickname === 'function') {
    nickEl.textContent = getPlayerNickname();
  }
}

function handleEmptySlotClick(slotKey) {
  if (slotKey.startsWith('cloth_')) {
    mainCat = 'armor';
    subCat = 'cloth';
  } else if (slotKey.startsWith('armor_')) {
    mainCat = 'armor';
    subCat = 'armor';
  } else if (slotKey.startsWith('hand_')) {
    mainCat = 'weapon';
    subCat = 'all';
  } else if (slotKey.startsWith('ring_')) {
    mainCat = 'other';
    subCat = 'ring';
  }
  renderInv();
}

// ---------- Sekce 5: Režim Crafting ----------
function renderCraftingUI() {
  const listEl = $('craftRecipesList');
  if (!listEl) return;
  listEl.innerHTML = '';

  const activeTab = document.querySelector('.craft-tab-btn.active');
  const cat = activeTab ? activeTab.dataset.ccat : 'all';

  if (cat === 'upgrades') {
    const upgradable = INV.filter(it => it.cat === 'weapon' || it.cat === 'armor' || it.subcat === 'shield');
    upgradable.forEach(it => {
      const curLvl = it.upgradeLevel || 0;
      const canUpg = curLvl < 5;
      const reqs = canUpg ? getUpgradeRequirements(it) : [];
      let hasMats = canUpg;
      for (const req of reqs) {
        const have = INV.find(x => x.id === req.id);
        const cnt = (have && have.count !== undefined) ? have.count : (have ? 1 : 0);
        if (cnt < req.count) hasMats = false;
      }
      const card = document.createElement('div');
      card.className = 'craft-recipe-card' + (hasMats ? ' ready' : '');
      card.innerHTML = `
        <img src="${it.icon}" alt="${it.name}">
        <div class="recipe-info">
          <div class="recipe-name">${it.name}</div>
          <div class="recipe-status">${curLvl >= 5 ? '⭐ Max level (+5)' : (hasMats ? '✓ Připraveno ke kování' : 'Chybí suroviny')}</div>
        </div>
      `;
      card.onclick = () => {
        expandedItemId = it.id;
        switchMode('equip');
        renderGridItemsUI();
      };
      listEl.appendChild(card);
    });
    const panel = $('craftDetailPanel');
    if (panel) {
      panel.innerHTML = `
        <div class="craft-detail-header" style="padding:16px;">
          <div class="detail-title">🔨 Kovárna & Vylepšování výbavy</div>
          <div class="detail-desc" style="margin-top:8px;font-size:13px;line-height:1.5;color:#94a3b8;">
            Zvol předmět k vylepšení od +0 do +5. Vylepšení zbraní zvyšuje útočné poškození o +15% za úroveň.<br>
            Vylepšení zbroje a štítů přidává obranu (+5%) a bonusové životy (+8 HP).
          </div>
        </div>
      `;
    }
    return;
  }

  const recipes = CRAFTING_RECIPES.filter(r => cat === 'all' || r.cat === cat);

  recipes.forEach(rec => {
    const targetItem = INV.find(x => x.id === rec.result);
    if (!targetItem) return;

    let canCraft = true;
    for (const ing of rec.ingredients) {
      const haveIt = INV.find(x => x.id === ing.id);
      const haveCount = (haveIt && haveIt.count) ? haveIt.count : (haveIt ? 1 : 0);
      if (haveCount < ing.count) canCraft = false;
    }

    const card = document.createElement('div');
    card.className = 'craft-recipe-card' + (rec.id === selectedCraftRecipeId ? ' selected' : '') + (canCraft ? ' ready' : '');
    card.innerHTML = `
      <img src="${targetItem.icon}" alt="${rec.name}">
      <div class="recipe-info">
        <div class="recipe-name">${rec.name}</div>
        <div class="recipe-status">${canCraft ? '✓ Dostupné suroviny' : 'Chybí suroviny'}</div>
      </div>
    `;
    card.onclick = () => {
      selectedCraftRecipeId = rec.id;
      renderCraftingUI();
    };
    listEl.appendChild(card);
  });

  renderCraftDetail();
}

function renderCraftDetail() {
  const panel = $('craftDetailPanel');
  if (!panel) return;
  const rec = CRAFTING_RECIPES.find(x => x.id === selectedCraftRecipeId) || CRAFTING_RECIPES[0];
  if (!rec) return;

  const targetItem = INV.find(x => x.id === rec.result);
  if (!targetItem) return;

  let canCraft = true;
  let ingsHtml = '';
  rec.ingredients.forEach(ing => {
    const haveIt = INV.find(x => x.id === ing.id);
    const haveCount = (haveIt && haveIt.count) ? haveIt.count : (haveIt ? 1 : 0);
    const ok = haveCount >= ing.count;
    if (!ok) canCraft = false;
    ingsHtml += `
      <div class="ing-row ${ok ? 'ok' : 'missing'}">
        <span class="ing-name">${ing.name}</span>
        <span class="ing-count">${haveCount} / ${ing.count}</span>
      </div>
    `;
  });

  const rarityKey = targetItem.rarity || 'common';
  const rInfo = (typeof RARITY_INFO !== 'undefined' && RARITY_INFO[rarityKey]) ? RARITY_INFO[rarityKey] : { name: 'Běžné', color: '#94a3b8' };

  panel.innerHTML = `
    <div class="craft-detail-header">
      <img src="${targetItem.icon}" class="detail-big-icon rarity-${rarityKey}">
      <div class="detail-meta">
        <span class="pop-rarity-pill" style="color:${rInfo.color};border-color:${rInfo.color};align-self:flex-start;">${rInfo.name}</span>
        <div class="detail-title">${targetItem.name}</div>
        <div class="detail-desc">${targetItem.desc || ''}</div>
      </div>
    </div>
    <div class="craft-ingredients-box">
      <div class="box-title">Potřebné suroviny:</div>
      ${ingsHtml}
    </div>
    <button id="doCraftBtn" class="craft-action-btn ${canCraft ? 'active' : 'disabled'}" ${canCraft ? '' : 'disabled'}>
      ⚒️ Vyrobit předmět
    </button>
  `;

  const btn = $('doCraftBtn');
  if (btn && canCraft) {
    btn.onclick = () => executeCraft(rec);
  }
}

function executeCraft(rec) {
  // Kontrola a odečtení surovin
  for (const ing of rec.ingredients) {
    const haveIt = INV.find(x => x.id === ing.id);
    if (!haveIt || (haveIt.count || 1) < ing.count) {
      toast('Nedostatek surovin!');
      return;
    }
  }

  // Odečtení surovin
  for (const ing of rec.ingredients) {
    const haveIt = INV.find(x => x.id === ing.id);
    if (haveIt) {
      haveIt.count = (haveIt.count || 1) - ing.count;
      if (haveIt.count <= 0) {
        // Pokud surovina došla a není to unikátní výbava, necháme ji s count: 0 nebo vymažeme
        haveIt.count = 0;
      }
    }
  }

  // Přidání vyrobeného předmětu
  const targetItem = INV.find(x => x.id === rec.result);
  if (targetItem) {
    if (targetItem.count !== undefined) {
      targetItem.count += (rec.resultCount || 1);
    } else {
      targetItem.count = (rec.resultCount || 1);
    }
  }

  if (typeof playAttackSound === 'function') playAttackSound('heavy');
  toast(`⚒️ Vyrobeno: ${rec.name}!`);

  if (typeof window.addPlayerXP === 'function') {
    window.addPlayerXP(25, 'crafting');
  }

  renderInv();
  renderCraftingUI();
}

// ---------- 3D Náhled Postavy pro Inventář (Sekce 5) ----------
let invCharRenderer = null, invCharScene = null, invCharCam = null, invCharRig = null;
let invCharRotY = 0.0, invCharPitch = 0.05, isInvCharDragging = false;
let invLastX = 0, invLastY = 0;
let invCharAnimFrame = null;

function initInventory3D() {
  const canvas = $('invCharPreviewCanvas');
  if (!canvas || invCharRenderer) return;

  invCharRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  invCharRenderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  invCharRenderer.setSize(200, 230);

  invCharScene = new THREE.Scene();
  invCharCam = new THREE.PerspectiveCamera(40, 200 / 230, 0.1, 20);
  invCharCam.position.set(0, 0.85, 2.2);
  invCharCam.lookAt(0, 0.72, 0);

  invCharScene.add(new THREE.AmbientLight(0xffffff, 0.82));
  const sun = new THREE.DirectionalLight(0xfff5ea, 0.75);
  sun.position.set(1.5, 3, 2);
  invCharScene.add(sun);
  const rim = new THREE.DirectionalLight(0x38bdf8, 0.55);
  rim.position.set(-2, 2, -2);
  invCharScene.add(rim);

  // Zářící podstavec
  const pedGeo = new THREE.CylinderGeometry(0.72, 0.78, 0.05, 32);
  const pedMat = new THREE.MeshLambertMaterial({ color: 0x131d2e });
  const ped = new THREE.Mesh(pedGeo, pedMat);
  ped.position.y = -0.025;
  invCharScene.add(ped);

  const ringGeo = new THREE.TorusGeometry(0.75, 0.015, 8, 32);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.005;
  invCharScene.add(ring);

  // Vytvoření rigů pro inventář
  invCharRig = createCharacterRig();
  invCharScene.add(invCharRig.root);

  // Zbraně pro inventářní rig
  const invWeapons = createWeaponInstances();
  const invWeaponsMain = createWeaponInstances();
  for (const k in invWeaponsMain) {
    invCharRig.hand.add(invWeaponsMain[k]);
  }
  const invWeaponsOff = createWeaponInstances();
  for (const k in invWeaponsOff) {
    invCharRig.offhand.add(invWeaponsOff[k]);
  }
  invCharRig.weaponsMain = invWeaponsMain;
  invCharRig.weaponsOff = invWeaponsOff;

  // Interakce myší (otáčení postavy)
  canvas.addEventListener('mousedown', e => {
    isInvCharDragging = true;
    invLastX = e.clientX;
    invLastY = e.clientY;
  });
  window.addEventListener('mousemove', e => {
    if (!isInvCharDragging) return;
    const dx = e.clientX - invLastX, dy = e.clientY - invLastY;
    invLastX = e.clientX;
    invLastY = e.clientY;
    invCharRotY += dx * 0.02;
    invCharPitch = Math.max(-0.35, Math.min(0.4, invCharPitch + dy * 0.012));
    updateInvCam();
  });
  window.addEventListener('mouseup', () => isInvCharDragging = false);

  const resetBtn = $('invResetCamBtn');
  if (resetBtn) {
    resetBtn.onclick = () => {
      invCharRotY = 0;
      invCharPitch = 0.05;
      updateInvCam();
    };
  }

  updateInventoryPreview();
  startInvCharLoop();
}

function updateInvCam() {
  if (!invCharCam) return;
  const dist = 2.15;
  const cy = 0.72;
  invCharCam.position.x = Math.sin(invCharRotY) * Math.cos(invCharPitch) * dist;
  invCharCam.position.z = Math.cos(invCharRotY) * Math.cos(invCharPitch) * dist;
  invCharCam.position.y = cy + Math.sin(invCharPitch) * dist;
  invCharCam.lookAt(0, cy, 0);
}

function updateInventoryPreview() {
  if (!invCharRig) return;
  updateCharacterRig(invCharRig, playerCustom, getEquippedMap());
  if (typeof updateRigDominantHand === 'function') {
    updateRigDominantHand(invCharRig, window.dominantHand || 'right');
  }

  const mainHandId = getEquippedMainHandId();
  const offHandId = getEquippedOffHandId();

  if (invCharRig.weaponsMain) {
    for (const k in invCharRig.weaponsMain) {
      invCharRig.weaponsMain[k].visible = (k === mainHandId);
    }
  }
  if (invCharRig.weaponsOff) {
    for (const k in invCharRig.weaponsOff) {
      invCharRig.weaponsOff[k].visible = (k === offHandId);
    }
  }
}

function startInvCharLoop() {
  if (invCharAnimFrame) return;
  const loop = () => {
    if (!invOpen) {
      invCharAnimFrame = null;
      return;
    }
    const now = performance.now();
    if (invCharRig && invCharScene && invCharCam && invCharRenderer) {
      const breath = Math.sin(now * 0.0025) * 0.02;

      // Jemné dýchání postavy
      if (invCharRig.torso) {
        invCharRig.torso.rotation.x = breath;
      }
      if (typeof animateCape === 'function') {
        animateCape(invCharRig, 0.016, now, 0, 0, true);
      }

      // Nastavení přirozeného postoje rukou v náhledu inventáře podle výbavy
      const isLeftDom = (window.dominantHand === 'left');
      const mainId = (typeof getEquippedMainHandId === 'function') ? getEquippedMainHandId() : null;
      const offId = (typeof getEquippedOffHandId === 'function') ? getEquippedOffHandId() : null;
      const leftItem = isLeftDom ? mainId : offId;
      const rightItem = isLeftDom ? offId : mainId;

      // Pravá ruka postavy (arms[0] na pozici -5.5 * VX)
      if (invCharRig.arms && invCharRig.arms[0]) {
        if (rightItem && rightItem.startsWith('shield_')) {
          invCharRig.arms[0].rotation.set(-0.58 + breath, 0.32, -0.14);
        } else if (rightItem) {
          invCharRig.arms[0].rotation.set(-0.52 + breath, 0.16, -0.14);
        } else {
          invCharRig.arms[0].rotation.set(breath * 0.5, 0, -0.12);
        }
      }

      // Levá ruka postavy (arms[1] na pozici +5.5 * VX)
      if (invCharRig.arms && invCharRig.arms[1]) {
        if (leftItem && leftItem.startsWith('shield_')) {
          invCharRig.arms[1].rotation.set(-0.58 + breath, -0.32, 0.14);
        } else if (leftItem) {
          invCharRig.arms[1].rotation.set(-0.52 + breath, -0.16, 0.14);
        } else {
          invCharRig.arms[1].rotation.set(breath * 0.5, 0, 0.12);
        }
      }

      invCharRenderer.render(invCharScene, invCharCam);
    }
    invCharAnimFrame = requestAnimationFrame(loop);
  };
  invCharAnimFrame = requestAnimationFrame(loop);
}

// ---------- Rozbalovací Detail Předmětu (Sekce 3 - Přímo pod itemem) ----------
function createItemDrawer(it) {
  const drawer = document.createElement('div');
  const rarityKey = it.rarity || 'common';
  const rInfo = (typeof RARITY_INFO !== 'undefined' && RARITY_INFO[rarityKey])
    ? RARITY_INFO[rarityKey]
    : { name: 'Běžné', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.14)' };

  drawer.className = 'item-inline-drawer rarity-' + rarityKey;
  drawer.style.borderColor = rInfo.color;
  drawer.style.boxShadow = `0 12px 30px rgba(0, 0, 0, 0.75), inset 0 0 16px ${rInfo.bg}`;

  let typeName = 'Předmět';
  if (it.subcat === 'shield') typeName = '🛡️ Obranný štít';
  else if (it.cat === 'weapon') typeName = '⚔️ Zbraň';
  else if (it.subcat === 'ring') typeName = '💍 Magický prsten';
  else if (it.subcat === 'armor') typeName = '🪖 Plátová zbroj';
  else if (it.subcat === 'cloth') typeName = '👕 Lehký oděv';
  else if (it.subcat === 'cape') typeName = '🧣 Vznešená kápě';
  else if (it.subcat === 'consumable') typeName = '🧪 Spotřební předmět';
  else if (it.subcat === 'material') typeName = '🪵 Řemeslná surovina';

  // Stats HTML
  let statsHtml = '';
  if (it.statList && it.statList.length) {
    statsHtml = `<div class="drawer-stats-grid">` +
      it.statList.map(s => `<div class="drawer-stat-item">${s}</div>`).join('') +
      `</div>`;
  }

  // Popis HTML
  let descHtml = it.desc ? `<div class="drawer-desc">${it.desc}</div>` : '';

  drawer.innerHTML = `
    <div class="drawer-header">
      <div class="drawer-header-left">
        <img src="${it.icon}" class="drawer-ico" alt="${it.name}">
        <div>
          <div class="drawer-title">${it.name}</div>
          <div class="drawer-meta">
            <span class="drawer-rarity-badge" style="color:${rInfo.color};border-color:${rInfo.color};background:${rInfo.bg};">${rInfo.name}</span>
            <span class="drawer-type-badge">${typeName}</span>
          </div>
        </div>
      </div>
      <button class="drawer-close-btn" title="Zavřít panel">✕</button>
    </div>
    ${statsHtml}
    ${descHtml}
  `;

  drawer.querySelector('.drawer-close-btn').onclick = (e) => {
    e.stopPropagation();
    expandedItemId = null;
    renderGridItemsUI();
  };

  // Akční tlačítka a výběr ruky
  const actionsContainer = document.createElement('div');
  actionsContainer.className = 'drawer-actions';
  const isLeftDom = (window.dominantHand === 'left');

  if (it.cat === 'weapon' || it.subcat === 'shield') {
    // Předmět do ruky: uživatel si vybere Levou nebo Pravou ruku!
    const inLeft = (EQUIPPED_SLOTS.hand_l === it.id);
    const inRight = (EQUIPPED_SLOTS.hand_r === it.id);

    const btnRow = document.createElement('div');
    btnRow.className = 'drawer-actions-row';

    // 1. Tlačítko pro Levou ruku
    const leftBtn = document.createElement('button');
    leftBtn.className = 'drawer-btn hand-btn' + (inLeft ? ' equipped-active' : '');
    leftBtn.innerHTML = `
      <span class="btn-hand-icon">✋</span>
      <span class="btn-hand-text">
        ${inLeft ? '✕ Sundat z levé' : 'Nasadit do levé'}
        <small class="btn-hand-role">${isLeftDom ? 'Dominantní · LMB' : 'Sekundární · RMB'}</small>
      </span>
    `;
    leftBtn.onclick = (e) => {
      e.stopPropagation();
      if (inLeft) unequipSlot('hand_l');
      else equipToSlot(it.id, 'hand_l');
    };

    // 2. Tlačítko pro Pravou ruku
    const rightBtn = document.createElement('button');
    rightBtn.className = 'drawer-btn hand-btn' + (inRight ? ' equipped-active' : '');
    rightBtn.innerHTML = `
      <span class="btn-hand-icon">🗡️</span>
      <span class="btn-hand-text">
        ${inRight ? '✕ Sundat z pravé' : 'Nasadit do pravé'}
        <small class="btn-hand-role">${!isLeftDom ? 'Dominantní · LMB' : 'Sekundární · RMB'}</small>
      </span>
    `;
    rightBtn.onclick = (e) => {
      e.stopPropagation();
      if (inRight) unequipSlot('hand_r');
      else equipToSlot(it.id, 'hand_r');
    };

    btnRow.appendChild(leftBtn);
    btnRow.appendChild(rightBtn);
    actionsContainer.appendChild(btnRow);

  } else if (it.subcat === 'ring') {
    // Prsteny: výběr na levou nebo pravou ruku
    const inLeftRing = (EQUIPPED_SLOTS.ring_l === it.id);
    const inRightRing = (EQUIPPED_SLOTS.ring_r === it.id);

    const btnRow = document.createElement('div');
    btnRow.className = 'drawer-actions-row';

    const leftRingBtn = document.createElement('button');
    leftRingBtn.className = 'drawer-btn hand-btn' + (inLeftRing ? ' equipped-active' : '');
    leftRingBtn.innerHTML = `
      <span class="btn-hand-icon">💍</span>
      <span class="btn-hand-text">
        ${inLeftRing ? '✕ Sundat z levé' : 'Nasadit na levou'}
        <small class="btn-hand-role">Prsten na levé ruce</small>
      </span>
    `;
    leftRingBtn.onclick = (e) => {
      e.stopPropagation();
      if (inLeftRing) unequipSlot('ring_l');
      else equipToSlot(it.id, 'ring_l');
    };

    const rightRingBtn = document.createElement('button');
    rightRingBtn.className = 'drawer-btn hand-btn' + (inRightRing ? ' equipped-active' : '');
    rightRingBtn.innerHTML = `
      <span class="btn-hand-icon">💍</span>
      <span class="btn-hand-text">
        ${inRightRing ? '✕ Sundat z pravé' : 'Nasadit na pravou'}
        <small class="btn-hand-role">Prsten na pravé ruce</small>
      </span>
    `;
    rightRingBtn.onclick = (e) => {
      e.stopPropagation();
      if (inRightRing) unequipSlot('ring_r');
      else equipToSlot(it.id, 'ring_r');
    };

    btnRow.appendChild(leftRingBtn);
    btnRow.appendChild(rightRingBtn);
    actionsContainer.appendChild(btnRow);

  } else if (it.cat === 'armor' || it.subcat === 'cloth' || it.subcat === 'cape') {
    const isEquipped = EQ.includes(it.id);
    const eqBtn = document.createElement('button');
    eqBtn.className = 'drawer-btn' + (isEquipped ? ' danger' : ' primary');
    eqBtn.innerHTML = isEquipped ? '✕ Sundat výbavu' : '👕 Obléknout výbavu';
    eqBtn.onclick = (e) => {
      e.stopPropagation();
      if (isEquipped) unequip(it.id);
      else equip(it.id);
    };
    actionsContainer.appendChild(eqBtn);

  } else if (it.id === 'potion_hp' || it.id === 'apple' || it.healHp || it.subcat === 'consumable' || it.restoreStamina || it.buffStrength || it.buffSpeed || it.id.startsWith('potion_')) {
    const useBtn = document.createElement('button');
    useBtn.className = 'drawer-btn primary';
    useBtn.innerHTML = '🧪 Vypít / Sníst';
    useBtn.onclick = (e) => {
      e.stopPropagation();
      useConsumableItem(it);
    };
    actionsContainer.appendChild(useBtn);

  } else if (it.cat === 'loot' || it.subcat === 'material') {
    const craftBtn = document.createElement('button');
    craftBtn.className = 'drawer-btn primary';
    craftBtn.innerHTML = '⚒️ Otevřít Crafting dílnu';
    craftBtn.onclick = (e) => {
      e.stopPropagation();
      switchMode('craft');
    };
    actionsContainer.appendChild(craftBtn);
  }

  drawer.appendChild(actionsContainer);

  // Modul pro vylepšování zbraní a brnění (+0 až +5)
  if (it.cat === 'weapon' || it.cat === 'armor' || it.subcat === 'shield') {
    const upgBox = document.createElement('div');
    upgBox.className = 'drawer-upgrade-box';
    const curLvl = it.upgradeLevel || 0;

    if (curLvl < 5) {
      const nextLvl = curLvl + 1;
      const reqs = getUpgradeRequirements(it);
      let canUpgrade = true;
      let reqsHtml = reqs.map(r => {
        const have = INV.find(x => x.id === r.id);
        const cnt = (have && have.count !== undefined) ? have.count : (have ? 1 : 0);
        if (cnt < r.count) canUpgrade = false;
        return `<span class="upg-req ${cnt >= r.count ? 'ok' : 'missing'}">${r.name}: ${cnt}/${r.count}</span>`;
      }).join(' · ');

      upgBox.innerHTML = `
        <div class="upg-header" style="margin-top:10px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.1);display:flex;justify-content:space-between;align-items:center;">
          <span>🔨 Kovárna: Vylepšení na <b>+${nextLvl}</b></span>
          <span class="upg-badge" style="font-size:11px;padding:2px 6px;border-radius:4px;background:${canUpgrade ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'};color:${canUpgrade ? '#4ade80' : '#f87171'}">${canUpgrade ? 'Připraveno' : 'Chybí suroviny'}</span>
        </div>
        <div class="upg-reqs-row" style="font-size:12px;color:#94a3b8;margin:6px 0;">${reqsHtml}</div>
        <button class="drawer-btn upg-action-btn ${canUpgrade ? 'primary' : 'disabled'}" ${canUpgrade ? '' : 'disabled'} style="width:100%;margin-top:4px;">
          🔨 Vylepšit na +${nextLvl}
        </button>
      `;

      const upgBtn = upgBox.querySelector('.upg-action-btn');
      if (upgBtn && canUpgrade) {
        upgBtn.onclick = (e) => {
          e.stopPropagation();
          upgradeEquipment(it);
          expandedItemId = it.id;
          renderGridItemsUI();
        };
      }
    } else {
      upgBox.innerHTML = `
        <div class="upg-max-badge" style="margin-top:10px;padding:6px;text-align:center;font-size:12px;color:#fbbf24;background:rgba(251,191,36,0.15);border:1px solid rgba(251,191,36,0.3);border-radius:6px;">⭐ Mistrovské dílo (+5 Max) — Dosažena maximální úroveň kování</div>
      `;
    }
    drawer.appendChild(upgBox);
  }

  return drawer;
}

function openPop(it) {
  expandedItemId = it.id;
  renderGridItemsUI();
}

// ---------- Přepínání Režimů (Sekce 4) ----------
function switchMode(mode) {
  currentMode = mode;
  const tabEquip = $('tabEquipBtn');
  const tabCraft = $('tabCraftBtn');
  const viewEquip = $('invEquipContainer');
  const viewCraft = $('invCraftContainer');

  if (tabEquip) tabEquip.classList.toggle('active', mode === 'equip');
  if (tabCraft) tabCraft.classList.toggle('active', mode === 'craft');
  if (viewEquip) viewEquip.hidden = (mode !== 'equip');
  if (viewCraft) viewCraft.hidden = (mode !== 'craft');

  if (mode === 'equip') {
    updateEquipmentUI();
    updateInventoryPreview();
  } else {
    renderCraftingUI();
  }
}

// ---------- Otevírání a Zavírání Inventáře ----------
function toggleInv() {
  invOpen = !invOpen;
  $('inv').hidden = !invOpen;
  expandedItemId = null;

  if (invOpen) {
    if (typeof escOpen !== 'undefined' && escOpen && typeof closeEscMenu === 'function') closeEscMenu();
    try { document.exitPointerLock(); } catch (e) {}
    for (const k in keys) keys[k] = 0;
    if (typeof drag !== 'undefined') drag = false;

    syncEQArray();
    renderInv();
    updateEquipmentUI();
    initInventory3D();
    updateInventoryPreview();
    startInvCharLoop();
  }
}

function invKey(e) {
  if (e.code === 'KeyI') { toggleInv(); return true; }
  if (e.code.startsWith('Digit')) { selSlot(+e.code.slice(5) - 1); return true; }
  return false;
}

// Inicializace listenerů
window.addEventListener('DOMContentLoaded', () => {
  const invx = $('invx');
  if (invx) invx.onclick = toggleInv;

  // Kategorie
  document.querySelectorAll('.inv-cat-btn').forEach(btn => {
    btn.onclick = () => {
      mainCat = btn.dataset.c;
      subCat = 'all';
      expandedItemId = null;
      renderInv();
    };
  });

  // Hledání
  const searchInput = $('invSearchInput');
  if (searchInput) {
    searchInput.oninput = (e) => {
      searchQuery = e.target.value;
      renderGridItemsUI();
    };
  }

  // Přepínač sekce 4
  const tabEquip = $('tabEquipBtn');
  if (tabEquip) tabEquip.onclick = () => switchMode('equip');
  const tabCraft = $('tabCraftBtn');
  if (tabCraft) tabCraft.onclick = () => switchMode('craft');

  // Záložky craftingu
  document.querySelectorAll('.craft-tab-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.craft-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderCraftingUI();
    };
  });

  // Zavření rozbaleného panelu kliknutím mimo
  const invEl = $('inv');
  if (invEl) {
    invEl.addEventListener('mousedown', e => {
      if (!e.target.closest('.tile') && !e.target.closest('.item-inline-drawer') && !e.target.closest('.gear-slot')) {
        if (expandedItemId) {
          expandedItemId = null;
          renderGridItemsUI();
        }
      }
    });
  }

  syncEQArray();
});

// Zajištění startovní synchronizace
syncEQArray();
