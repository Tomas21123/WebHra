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
  } else if (it && it.cat === 'armor') {
    updatePlayerAppearance();
    toast('Sundáno: ' + it.name);
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
    d.className = 'tile' + (EQ.includes(it.id) ? ' eq' : '');
    d.innerHTML = '<img src="' + it.icon + '"><span>' + it.name + '</span>';
    d.onclick = () => openPop(it, d);
    g.appendChild(d);
  }
}

function openPop(it, d) {
  const r = d.getBoundingClientRect(), pop = $('pop'), on = EQ.includes(it.id);
  $('pn').textContent = it.name;
  if (it.cat === 'armor') {
    $('eqb').textContent = on ? 'Sundat' : 'Obléknout';
    $('eqb').onclick = () => { on ? unequip(it.id) : equip(it.id); pop.hidden = true; renderInv(); };
  } else if (it.cat === 'weapon') {
    $('eqb').textContent = on ? 'Odložit' : 'Vzít do ruky';
    $('eqb').onclick = () => { on ? unequip(it.id) : equip(it.id); pop.hidden = true; renderInv(); };
  } else if (it.cat === 'loot') {
    if (it.id === 'potion_hp' || it.id === 'apple') {
      $('eqb').textContent = 'Použít';
      $('eqb').onclick = () => {
        if (it.id === 'potion_hp') {
          G.hp = Math.min(100, G.hp + 40); ui(); toast('Vypil jsi léčivý lektvar (+40 HP)!');
        } else {
          G.hp = Math.min(100, G.hp + 25); G.st = 100; ui(); toast('Snědl jsi zlaté jablko (+25 HP, plná stamina)!');
        }
        pop.hidden = true;
      };
    } else {
      $('eqb').textContent = 'Prozkoumat';
      $('eqb').onclick = () => { toast(it.name + ' – surovina'); pop.hidden = true; };
    }
  }
  pop.style.left = Math.max(8, Math.min(r.left, innerWidth - 190)) + 'px';
  pop.style.top = Math.min(r.bottom + 6, innerHeight - 110) + 'px';
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
