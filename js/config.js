// ---------- Globální konstanty a konfigurace ----------
const CS = 16, SEA = 44, S = 0.5, SEED = (Math.random() * 1e9) | 0;
let RD = 8;

const $ = id => document.getElementById(id);

function toast(t) {
  const e = $('toast');
  e.textContent = t;
  e.style.opacity = 1;
  setTimeout(() => e.style.opacity = 0, 1800);
}

// ---------- Šum a matematické funkce ----------
function h2(x, z) {
  let h = Math.imul(x, 374761393) + Math.imul(z, 668265263) + SEED | 0;
  h = Math.imul(h ^ h >>> 13, 1274126177);
  return ((h ^ h >>> 16) >>> 0) / 4294967296;
}

function vn(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz;
  const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  const a = h2(ix, iz), b = h2(ix + 1, iz), c = h2(ix, iz + 1), d = h2(ix + 1, iz + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function fbm(x, z, o) {
  let s = 0, a = 0.5, n = 0;
  for (let i = 0; i < o; i++) {
    s += vn(x, z) * a;
    n += a;
    x *= 2;
    z *= 2;
    a *= 0.5;
  }
  return s / n;
}

const sm = (a, b, x) => {
  x = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return x * x * (3 - 2 * x);
};

// ---------- Pomocné funkce pro barvy ----------
function toHex(col) {
  if (typeof col === 'number') return col;
  if (typeof col === 'string') return parseInt(col.replace('#', ''), 16);
  return 0xffffff;
}

function shade(hexNum, lum) {
  const r = Math.min(255, Math.max(0, Math.round(((hexNum >> 16) & 255) * (1 + lum))));
  const g = Math.min(255, Math.max(0, Math.round(((hexNum >> 8) & 255) * (1 + lum))));
  const b = Math.min(255, Math.max(0, Math.round((hexNum & 255) * (1 + lum))));
  return (r << 16) | (g << 8) | b;
}

// ---------- Stav hráče (Životy, Stamina, Kyslík) ----------
const G = { hp: 100, st: 100, o2: 100, rg: 0, sd: 0, tired: 0 };
const bH = document.querySelector('.hp i'), bHt = document.querySelector('.hp span');
const bS = document.querySelector('.st i'), bSt = document.querySelector('.st span');
const bO = document.querySelector('.o2 i'), bOt = document.querySelector('.o2 span'), bOBox = document.querySelector('.o2');

function ui() {
  bH.style.width = G.hp + '%';
  bS.style.width = G.st + '%';
  bHt.textContent = 'Životy ' + Math.ceil(G.hp) + ' / 100';
  bSt.textContent = 'Stamina ' + Math.ceil(G.st) + ' / 100';

  if (bOBox) {
    if (G.o2 < 99.5) {
      bOBox.hidden = false;
      if (bO) bO.style.width = Math.max(0, G.o2) + '%';
      if (bOt) bOt.textContent = 'Kyslík ' + Math.max(0, Math.ceil(G.o2)) + ' %';
    } else {
      bOBox.hidden = true;
    }
  }
}

function hurt(n) {
  G.hp = Math.max(0, G.hp - n);
  G.rg = 0;
  if (G.hp <= 0) {
    P.x = SPX; P.z = 0.5; P.y = SPY;
    P.vx = P.vy = P.vz = 0;
    G.hp = 100; G.st = 100; G.o2 = 100;
  }
}
