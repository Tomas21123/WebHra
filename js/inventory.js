// ---------- Inventář, Lišta a Výbava ----------
const EQ = [], HB = [null], MAXHB = 9;
let hbSel = -1, heldId = null, invOpen = false, tab = 'all';

function getEquippedMap() {
  const map = {};
  for (const id of EQ) {
    const it = INV.find(x => x.id === id);
    if (it && it.cat === 'armor') map[it.slot] = it;
  }
  return map;
}

function getPlayerAttackDamage() {
  const it = INV.find(x => x.id === heldId);
  const baseDmg = (it && it.damage) ? it.damage : 10;
  const critChance = (it && it.critChance) ? it.critChance : 0.05;
  const isCrit = Math.random() < critChance;
  const variance = (Math.random() * 0.2 - 0.1); // ±10% rozptyl
  let finalDmg = Math.round(baseDmg * (1 + variance));
  if (isCrit) finalDmg = Math.round(finalDmg * 1.5);
  return { damage: Math.max(1, finalDmg), isCrit, weaponName: it ? it.name : 'Pěsti' };
}

function getPlayerAttackReach() {
  const it = INV.find(x => x.id === heldId);
  return (it && it.reach) ? it.reach : 2.2;
}

function getPlayerArmorReduction() {
  const eqMap = getEquippedMap();
  let totalDef = 0;
  for (const k in eqMap) {
    if (eqMap[k] && eqMap[k].defense) {
      totalDef += eqMap[k].defense;
    }
  }
  return Math.min(0.75, totalDef); // Max 75% absorpce poškození
}

function getPlayerBonusHp() {
  const eqMap = getEquippedMap();
  let bonus = 0;
  for (const k in eqMap) {
    if (eqMap[k] && eqMap[k].bonusHp) bonus += eqMap[k].bonusHp;
  }
  return bonus;
}

function getPlayerBonusSpeed() {
  const eqMap = getEquippedMap();
  let bonus = 0;
  for (const k in eqMap) {
    if (eqMap[k] && eqMap[k].bonusSpeed) bonus += eqMap[k].bonusSpeed;
  }
  return bonus;
}

window.getPlayerAttackDamage = getPlayerAttackDamage;
window.getPlayerAttackReach = getPlayerAttackReach;
window.getPlayerArmorReduction = getPlayerArmorReduction;
window.getPlayerBonusHp = getPlayerBonusHp;
window.getPlayerBonusSpeed = getPlayerBonusSpeed;

function renderHB() {
  const el = $('hb');
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

function equip(id) {
  const it = INV.find(x => x.id === id);
  if (!it) return;
  if (it.cat === 'weapon') {
    if (EQ.includes(id)) return;
    let i = HB.indexOf(null);
    if (i < 0) {
      if (!addSlot()) { toast('Lišta je plná'); return; }
      i = HB.length - 1;
    }
    EQ.push(id);
    HB[i] = id;
    hbSel = i;
    heldId = id;
    applyHeld();
    renderHB();
    toast('Vzato do ruky: ' + it.name);
  } else if (it.cat === 'armor') {
    const prev = EQ.find(x => {
      const item = INV.find(i => i.id === x);
      return item && item.slot === it.slot;
    });
    if (prev) EQ.splice(EQ.indexOf(prev), 1);
    EQ.push(id);
    updatePlayerAppearance();
    toast('Oblečeno: ' + it.name);
  }
  if (window.networkManager && typeof window.networkManager.sendEquipmentChange === 'function') {
    window.networkManager.sendEquipmentChange();
  }
}

function unequip(id) {
  const k = EQ.indexOf(id);
  if (k < 0) return;
  const it = INV.find(x => x.id === id);
  EQ.splice(k, 1);
  if (it && it.cat === 'weapon') {
    const i = HB.indexOf(id);
    if (i >= 0) HB[i] = null;
    if (heldId === id) { heldId = null; hbSel = -1; }
    applyHeld();
    renderHB();
    toast('Odloženo: ' + it.name);
  } else if (it && it.cat === 'armor') {
    updatePlayerAppearance();
    toast('Sundáno: ' + it.name);
  }
  if (window.networkManager && typeof window.networkManager.sendEquipmentChange === 'function') {
    window.networkManager.sendEquipmentChange();
  }
}

function renderInv() {
  const g = $('grid');
  g.innerHTML = '';
  document.querySelectorAll('#inv .tabs button').forEach(b => b.classList.toggle('on', b.dataset.c === tab));
  const list = INV.filter(x => tab === 'all' || x.cat === tab).sort((a, b) => {
    const ea = EQ.indexOf(a.id), eb = EQ.indexOf(b.id);
    return ea >= 0 && eb >= 0 ? ea - eb : ea >= 0 ? -1 : eb >= 0 ? 1 : INV.indexOf(a) - INV.indexOf(b);
  });
  if (!list.length) {
    g.innerHTML = '<p class="empty">Zatím tu nic není.</p>';
    return;
  }
  for (const it of list) {
    const d = document.createElement('div');
    const rarityClass = ' rarity-' + (it.rarity || 'common');
    d.className = 'tile' + rarityClass + (EQ.includes(it.id) ? ' eq' : '');
    d.innerHTML = '<img src="' + it.icon + '"><span>' + it.name + '</span>';
    d.onclick = () => openPop(it, d);
    g.appendChild(d);
  }
}

function openPop(it, d) {
  const r = d.getBoundingClientRect(), pop = $('pop'), on = EQ.includes(it.id);
  const rarityKey = it.rarity || 'common';
  const rInfo = (typeof RARITY_INFO !== 'undefined' && RARITY_INFO[rarityKey]) ? RARITY_INFO[rarityKey] : { name: 'Běžné', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.14)' };

  // 1. Hlavička a Rarita
  const rBadge = $('popRarity');
  if (rBadge) {
    rBadge.textContent = rInfo.name;
    rBadge.style.color = rInfo.color;
    rBadge.style.borderColor = rInfo.color;
    rBadge.style.background = rInfo.bg;
  }
  pop.style.borderColor = rInfo.color;
  pop.style.boxShadow = `0 16px 40px rgba(0, 0, 0, 0.85), 0 0 25px ${rInfo.bg}`;

  // 2. Název a Typ předmětu
  $('pn').textContent = it.name;
  const typeEl = $('popType');
  if (typeEl) {
    let typeName = 'Předmět';
    if (it.cat === 'weapon') typeName = '⚔️ Zbraň na blízko';
    else if (it.cat === 'armor') {
      const slotNames = { head: 'Přilba', chest: 'Zbroj těla', legs: 'Kalhoty', boots: 'Boty', cape: 'Plášť' };
      typeName = `🛡️ Zbroj (${slotNames[it.slot] || 'Oblečení'})`;
    } else if (it.cat === 'loot') {
      typeName = (it.healHp || it.restoreStamina) ? '🧪 Spotřební předmět' : '💎 Vzácná surovina';
    }
    typeEl.textContent = typeName;
  }

  // 3. Statistiky předmětu (RPG Stats)
  const statsEl = $('popStats');
  if (statsEl) {
    statsEl.innerHTML = '';
    const stats = it.statList || [];
    if (stats.length === 0) {
      if (it.damage) stats.push(`⚔️ Poškození: ${it.damage} HP`);
      if (it.reach) stats.push(`🎯 Dosah: ${it.reach} m`);
      if (it.defense) stats.push(`🛡️ Obrana: +${Math.round(it.defense * 100)}%`);
      if (it.bonusHp) stats.push(`❤️ Bonus HP: +${it.bonusHp}`);
    }
    for (const s of stats) {
      const itemRow = document.createElement('div');
      itemRow.className = 'pop-stat-item';
      itemRow.textContent = s;
      statsEl.appendChild(itemRow);
    }
  }

  // 4. Popis předmětu
  const descEl = $('popDesc');
  if (descEl) {
    descEl.textContent = it.desc || '';
    descEl.style.display = it.desc ? 'block' : 'none';
  }

  // 5. Tlačítko akce
  const eqb = $('eqb');
  if (it.cat === 'armor') {
    eqb.textContent = on ? 'Sundat výbavu' : 'Obléknout výbavu';
    eqb.onclick = () => { on ? unequip(it.id) : equip(it.id); pop.hidden = true; renderInv(); };
  } else if (it.cat === 'weapon') {
    eqb.textContent = on ? 'Odložit zbraň' : 'Vzít do ruky';
    eqb.onclick = () => { on ? unequip(it.id) : equip(it.id); pop.hidden = true; renderInv(); };
  } else if (it.cat === 'loot') {
    if (it.id === 'potion_hp' || it.id === 'apple' || it.healHp) {
      eqb.textContent = 'Vypít / Sníst';
      eqb.onclick = () => {
        if (it.id === 'potion_hp') {
          G.hp = Math.min(100, G.hp + 40); ui(); toast('Vypil jsi léčivý lektvar (+40 HP)!');
        } else {
          G.hp = Math.min(100, G.hp + 25); G.st = 100; ui(); toast('Snědl jsi zlaté jablko (+25 HP, plná stamina)!');
        }
        pop.hidden = true;
      };
    } else {
      eqb.textContent = 'Prozkoumat surovinu';
      eqb.onclick = () => { toast(it.name + ' – cenný řemeslný materiál'); pop.hidden = true; };
    }
  }

  // Bezpečné umístění aby okno nepřesáhlo okraj obrazovky
  const popW = 260, popH = 260;
  pop.style.left = Math.max(12, Math.min(r.left, innerWidth - popW - 12)) + 'px';
  pop.style.top = Math.max(12, Math.min(r.bottom + 6, innerHeight - popH - 12)) + 'px';
  pop.hidden = false;
}

function toggleInv() {
  invOpen = !invOpen;
  $('inv').hidden = !invOpen;
  $('pop').hidden = true;
  if (invOpen) {
    if (escOpen) closeEscMenu();
    try { document.exitPointerLock(); } catch (e) {}
    for (const k in keys) keys[k] = 0;
    drag = false;
    renderInv();
  }
}

function invKey(e) {
  if (e.code === 'KeyI') { toggleInv(); return true; }
  if (e.code.startsWith('Digit')) { selSlot(+e.code.slice(5) - 1); return true; }
  return false;
}

$('invx').onclick = toggleInv;
document.querySelectorAll('#inv .tabs button').forEach(b => {
  b.onclick = () => { tab = b.dataset.c; $('pop').hidden = true; renderInv(); };
});
$('inv').addEventListener('mousedown', e => {
  if (!e.target.closest('.tile') && !e.target.closest('#pop')) $('pop').hidden = true;
});
