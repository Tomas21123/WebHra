// ---------- Generování terénu a světa ----------
function height(x, z) {
  // Rozsáhlé kontinentální zemské desky a 10× větší rozlohy biomů
  const wx = x + (fbm(x / 1200 + 300, z / 1200, 2) - 0.5) * 280;
  const wz = z + (fbm(x / 1200, z / 1200 + 300, 2) - 0.5) * 280;
  const c = fbm(wx / 2200, wz / 2200, 4);
  const m = sm(0.52, 0.8, fbm(wx / 3500 + 500, wz / 3500, 3));
  const d = fbm(x / 120, z / 120, 2);
  const r = Math.abs(fbm(wx / 2400 + 800, wz / 2400 + 800, 3) - 0.5);
  // Omezení oceánů/vodních ploch: práh posunut, aby dominovala pevnina a oceány byly vzácnější
  const o = sm(0.24, 0.12, fbm(wx / 4500 + 3000, wz / 4500, 3));
  const s = (36 + c * 38 + m * 64) / 12, f = Math.floor(s);
  let h = (36 + c * 38 + m * 64) * 0.35 + (f + sm(0.25, 0.75, s - f)) * 12 * 0.65 + d * 4;
  h += (1 - Math.abs(2 * vn(x / 250 + 7, z / 350) - 1)) * 8 * sm(0.55, 0.64, temp(x, z)) * sm(0.52, 0.4, hum(x, z));
  // Plynulé zanoření do vody jen v řídkých depresích (výrazně zúžený vliv)
  h += (SEA - 4 - h) * sm(0.016, 0.004, r) * (1 - m);
  h -= o * 22;

  // Neomezené vysokohorské štíty a hřebeny
  const ridge1 = 1 - Math.abs(fbm(wx / 1400 + 700, wz / 1400 + 700, 3) * 2 - 1);
  const ridge2 = 1 - Math.abs(fbm(wx / 480 + 350, wz / 480 + 350, 3) * 2 - 1);
  const alpine = sm(0.48, 0.84, fbm(wx / 4200 + 1500, wz / 4200 + 1500, 3));
  h += m * (ridge1 * 65 + Math.pow(ridge2, 2.2) * 60 + alpine * 100);

  return Math.max(2, Math.floor(h));
}

const temp = (x, z) => fbm(x / 6000 + 2000, z / 6000 + 2000, 2);
const hum = (x, z) => fbm(x / 5600 + 4000, z / 5600, 2);
const biome = (x, z, h) => {
  const t = temp(x, z) - Math.max(0, h - SEA - 8) * 0.0055 + (vn(x / 70, z / 70) - 0.5) * 0.03;
  const u = hum(x, z) + (vn(x / 90 + 5, z / 90) - 0.5) * 0.03;
  return t < 0.38 ? 2 : t > 0.6 ? (u > 0.5 ? 3 : 1) : 0;
};
if (typeof window !== 'undefined') {
  window.height = height;
  window.biome = biome;
  window.temp = temp;
  window.hum = hum;
}

// ---------- Chunks & Bloky ----------
const chunks = new Map();
const key = (x, z) => x + ',' + z;

function gen(cx, cz) {
  let chunkMaxH = SEA;
  for (let lz = 0; lz < CS; lz++) {
    for (let lx = 0; lx < CS; lx++) {
      const hh = height(cx * CS + lx, cz * CS + lz);
      if (hh > chunkMaxH) chunkMaxH = hh;
    }
  }

  let H = Math.max(96, chunkMaxH + 50);
  let d = new Uint8Array(256 * H);
  let maxY = SEA;
  const c = { d, H, maxY, cx, cz, meshed: false, mesh: null, water: null };

  for (let lz = 0; lz < CS; lz++) {
    for (let lx = 0; lx < CS; lx++) {
      const X = cx * CS + lx, Z = cz * CS + lz, h = height(X, Z), bi = biome(X, Z, h);
      if (h > maxY) maxY = h;
      if (h >= H) {
        const newH = h + 64, newD = new Uint8Array(256 * newH);
        newD.set(d); d = newD; H = newH; c.d = d; c.H = H;
      }
      let top = 1, sub = 2;
      const snowLine = 105 + sm(0.3, 0.7, temp(X, Z)) * 40;
      if (h <= SEA + 2 || bi === 1) {
        top = sub = 4;
      } else if (bi === 2 || h >= snowLine) {
        top = 8; sub = h >= 84 ? 3 : 2;
      } else if (h >= 84 + ((vn(X / 5, Z / 5) - 0.5) * 8 | 0)) {
        top = sub = 3;
      }
      for (let y = 0; y <= h; y++) d[lx + lz * CS + y * 256] = y === h ? top : y >= h - 6 ? sub : 3;
      for (let y = h + 1; y <= SEA; y++) d[lx + lz * CS + y * 256] = 5;
    }
  }

  const set = (wx, y, wz, b) => {
    const lx = wx - cx * CS, lz = wz - cz * CS;
    if (lx < 0 || lx >= CS || lz < 0 || lz >= CS || y < 0) return;
    if (y >= H) {
      const newH = Math.max(y + 48, H + 96), newD = new Uint8Array(256 * newH);
      newD.set(d); d = newD; H = newH; c.d = d; c.H = H;
    }
    const i = lx + lz * CS + y * 256;
    if (d[i] === 0 || b === 6 || b === 15) {
      d[i] = b;
      if (y > maxY) maxY = y;
      c.maxY = maxY;
    }
  };

  // Kaktusy
  for (let wx = cx * CS - 7; wx < cx * CS + CS + 7; wx++) {
    for (let wz = cz * CS - 7; wz < cz * CS + CS + 7; wz++) {
      if (h2(wx * 11 + 3, wz * 17 + 7) > 0.0012) continue;
      const h = height(wx, wz);
      if (h <= SEA + 2 || biome(wx, wz, h) !== 1) continue;
      const th = 16 + ((h2(wx + 1, wz + 2) * 14) | 0);
      for (let y = h + 1; y <= h + th; y++) {
        for (let a = -1; a <= 1; a++) {
          for (let b = -1; b <= 1; b++) set(wx + a, y, wz + b, 12);
        }
      }
      for (const sd of [-1, 1]) {
        const ay = h + (th >> 1) + (sd > 0 ? 3 : 0);
        for (let k = 2; k <= 5; k++) for (let yy = 0; yy < 2; yy++) for (let b = -1; b <= 0; b++) set(wx + sd * k, ay + yy, wz + b, 12);
        for (let yy = 0; yy < 9; yy++) for (let b = -1; b <= 0; b++) set(wx + sd * 5, ay + yy, wz + b, 12);
      }
    }
  }

  const ball = (X, Y, Z, rx, ry, rz, b) => {
    const gx = rx * 1.3, gy = ry * 1.3, gz = rz * 1.3;
    const x0 = Math.max(Math.floor(X - gx), cx * CS), x1 = Math.min(Math.ceil(X + gx), cx * CS + CS - 1);
    const z0 = Math.max(Math.floor(Z - gz), cz * CS), z1 = Math.min(Math.ceil(Z + gz), cz * CS + CS - 1);
    for (let x = x0; x <= x1; x++) {
      for (let z = z0; z <= z1; z++) {
        for (let y = Math.floor(Y - gy); y <= Y + gy; y++) {
          const q = ((x - X) / rx) ** 2 + ((y - Y) / ry) ** 2 + ((z - Z) / rz) ** 2;
          if (q > 1.7) continue;
          const k = 0.68 + 0.62 * vn(x * 0.14 + y * 0.1 + Y * 0.31, z * 0.14 - y * 0.08 + X * 0.17);
          if (q <= k * k && (q < k * k * 0.75 || h2(x * 31 + Y, z * 17 + y) < 0.6)) set(x, y, z, b);
        }
      }
    }
  };

  const trunk = (X, Z, y0, y1, w, b, tp) => {
    const x0 = Math.max(X - w, cx * CS), x1 = Math.min(X + w, cx * CS + CS - 1);
    const z0 = Math.max(Z - w, cz * CS), z1 = Math.min(Z + w, cz * CS + CS - 1);
    for (let x = x0; x <= x1; x++) {
      for (let z = z0; z <= z1; z++) {
        for (let y = y0; y < y1; y++) {
          if (tp && y > y0 + (y1 - y0) * 0.55 && Math.abs(x - X) === w && Math.abs(z - Z) === w) continue;
          set(x, y, z, b);
        }
      }
    }
  };

  const cone = (X, Y, Z, r0, hg, b) => {
    for (let y = 0; y <= hg; y++) {
      const r = r0 * (1 - y / hg) * ((y % 8) < 3 ? 1 : 0.7) + 0.6, R = r * 1.25 + 1;
      const x0 = Math.max(Math.floor(X - R), cx * CS), x1 = Math.min(Math.ceil(X + R), cx * CS + CS - 1);
      const z0 = Math.max(Math.floor(Z - R), cz * CS), z1 = Math.min(Math.ceil(Z + R), cz * CS + CS - 1);
      for (let x = x0; x <= x1; x++) {
        for (let z = z0; z <= z1; z++) {
          const dd = (x - X) ** 2 + (z - Z) ** 2;
          if (dd > R * R) continue;
          if (dd <= r * r * (0.6 + 0.75 * vn(x * 0.2 + y * 0.13, z * 0.2 - y * 0.11))) set(x, Y + y, z, b);
        }
      }
    }
  };

  const lobes = (X, Y, Z, n, rmin, rmax, spread, b, fl) => {
    for (let i = 0; i < n; i++) {
      const an = h2(X + i * 13, Z + i * 7) * 6.283;
      const dd = spread * (0.35 + 0.65 * h2(X + i * 5, Z - i * 3));
      const r = rmin + (rmax - rmin) * h2(X + i * 17, Z + i * 19);
      ball(X + Math.round(Math.cos(an) * dd), Y + Math.round((h2(X - i * 9, Z + i * 11) - 0.45) * r * 1.4), Z + Math.round(Math.sin(an) * dd), r, r * (fl || 0.75), r, b);
    }
  };

  const branch = (X, Y, Z, an, len, rise, th, b) => {
    let ex = X, ey = Y, ez = Z;
    for (let t = 0; t <= len; t++) {
      const x = Math.round(X + Math.cos(an) * t);
      const z = Math.round(Z + Math.sin(an) * t);
      const y = Math.round(Y + rise * t + Math.sin(t * 0.5 + an) * 1.2);
      const tt = t > len * 0.55 ? Math.max(1, th - 1) : th;
      ex = x; ey = y; ez = z;
      for (let a = 0; a < tt; a++) for (let c = 0; c < tt; c++) for (let q = 0; q < tt; q++) set(x + a, y + q, z + c, b);
    }
    return [ex, ey, ez];
  };

  const dropLeaves = (X, Z, R, leafBlock, density) => {
    const leafR = Math.min(18, Math.round(R * 1.15));
    const minX = Math.max(cx * CS, X - leafR);
    const maxX = Math.min(cx * CS + CS - 1, X + leafR);
    const minZ = Math.max(cz * CS, Z - leafR);
    const maxZ = Math.min(cz * CS + CS - 1, Z + leafR);
    for (let gx = minX; gx <= maxX; gx++) {
      const lx = gx - cx * CS;
      for (let gz = minZ; gz <= maxZ; gz++) {
        const lz = gz - cz * CS;
        const dx = gx - X, dz = gz - Z;
        const dist2 = dx * dx + dz * dz;
        if (dist2 > leafR * leafR) continue;
        const rnd = h2(gx * 29 + 13, gz * 31 + 7);
        const prob = (1 - dist2 / (leafR * leafR)) * density;
        if (rnd < prob) {
          const gh = height(gx, gz);
          if (gh > SEA + 2 && gh + 1 < H) {
            const under = d[lx + lz * CS + gh * 256];
            const above = d[lx + lz * CS + (gh + 1) * 256];
            if ((under === 1 || under === 2) && above === 0) {
              set(gx, gh + 1, gz, leafBlock);
            }
          }
        }
      }
    }
  };

  const hangVines = (vx, vy, vz, len) => {
    const lx = vx - cx * CS, lz = vz - cz * CS;
    if (lx < 0 || lx >= CS || lz < 0 || lz >= CS) return;
    for (let y = vy; y >= vy - len; y--) {
      if (y <= SEA + 2) break;
      if (y >= H) continue;
      const idx = lx + lz * CS + y * 256;
      if (d[idx] !== 0) break;
      set(vx, y, vz, 25);
    }
  };

  // Stromy
  const M = 46;
  for (let X = cx * CS - M; X < cx * CS + CS + M; X++) {
    for (let Z = cz * CS - M; Z < cz * CS + CS + M; Z++) {
      if (h2(X * 7 + 1, Z * 13 + 2) > 0.0012) continue;
      const hc = height(X, Z), bq = biome(X, Z, hc), hq = h2(X * 3 + 5, Z * 5 + 9), tp = temp(X, Z), uu = hum(X, Z);
      if (bq === 1 || (bq === 0 && hq > 0.1 + 0.55 * sm(0.42, 0.6, uu)) || (bq === 2 && hq > 0.3)) continue;
      const v = h2(X + 3, Z + 4), r1 = h2(X + 99, Z + 77), r2 = h2(X + 5, Z + 8), lv = v < 0.08 ? 10 : v < 0.2 ? 9 : 7;
      const type = bq === 3 ? 3 : bq === 2 ? 2 : (h2(X + 11, Z + 13) < sm(0.5, 0.38, tp) ? 2 : tp > 0.56 ? 4 : (r2 < 0.5 ? 0 : 1));
      const w = [2, 1, 1, 3, 2][type];
      const c1 = height(X - w, Z - w), c2 = height(X + w, Z - w), c3 = height(X - w, Z + w), c4 = height(X + w, Z + w);
      const h = Math.min(c1, c2, c3, c4), h0 = Math.max(c1, c2, c3, c4);
      if (h <= SEA + 2 || h0 >= 84 || h0 - h > 6) continue;
      const ra = (i, k) => h2(X + i * k + 1, Z - i * 3 + k);

      if (type === 0) {
        const top = h + 24 + ((r1 * 10) | 0), R = 12 + ((r2 * 5) | 0);
        trunk(X, Z, h, top, 2, 6, 1);
        for (let i = 0; i < 4 + ((r1 * 3) | 0); i++) {
          const e = branch(X, h + Math.round((top - h) * (0.5 + 0.4 * ra(i, 7))), Z, ra(i, 3) * 6.283, 9 + ((ra(i, 5) * 8) | 0), 0.45, 2, 6);
          ball(e[0], e[1] + 2, e[2], 6 + ra(i, 11) * 4, 5, 6 + ra(i, 13) * 4, lv);
        }
        ball(X, top, Z, R, 9, R, lv);
        lobes(X, top, Z, 5, 6, 10, R * 0.8, lv);
        if (uu > 0.44 || r1 < 0.45) {
          for (let k = 0; k < 7; k++) {
            const an = k * 0.9 + r2 * 6.28, rr = R * (0.6 + 0.35 * ra(k, 11));
            const vx = X + Math.round(Math.cos(an) * rr), vz = Z + Math.round(Math.sin(an) * rr);
            const vy = top - 4 - (k % 3) * 2;
            const vlen = 3 + ((ra(k, 13) * 5) | 0);
            hangVines(vx, vy, vz, vlen);
          }
        }
        dropLeaves(X, Z, R, lv === 9 ? 20 : (lv === 10 ? 21 : 19), 0.5);
      } else if (type === 1) {
        const top = h + 32 + ((r1 * 10) | 0);
        trunk(X, Z, h, top, 1, 15, 0);
        for (let i = 0; i < 5; i++) {
          const e = branch(X, h + Math.round((top - h) * (0.45 + 0.45 * ra(i, 7))), Z, ra(i, 3) * 6.283, 6 + (i % 3) * 2, 0.6, 1, 15);
          ball(e[0], e[1] + 1, e[2], 4 + (i % 2) * 2, 4, 4 + (i % 2) * 2, lv);
        }
        ball(X, top - 2, Z, 7, 11, 7, lv);
        lobes(X, top - 6, Z, 4, 4, 7, 7, lv, 1.1);
        dropLeaves(X, Z, 8, 19, 0.4);
      } else if (type === 2) {
        const th = 38 + ((r1 * 12) | 0), top = h + th;
        trunk(X, Z, h, top, 1, 6, 0);
        for (let i = 0; i < 4; i++) branch(X, h + 3 + i * 2, Z, i * 1.57 + r1 * 3, 6, 0.2, 1, 6);
        cone(X, h + 10, Z, 14, th - 4, 14);
        ball(X, top + 3, Z, 2, 3, 2, 14);
        dropLeaves(X, Z, 12, 19, 0.35);
      } else if (type === 3) {
        const top = h + 46 + ((r1 * 12) | 0);
        trunk(X, Z, h, top, 3, 6, 1);
        for (let i = 0; i < 5; i++) {
          const e = branch(X, h + Math.round((top - h) * (0.6 + 0.3 * ra(i, 7))), Z, ra(i, 3) * 6.283 + i * 1.2, 14 + ((ra(i, 5) * 8) | 0), 0.3, 3, 6);
          ball(e[0], e[1] + 3, e[2], 10 + ra(i, 11) * 5, 6, 10 + ra(i, 13) * 5, 7);
        }
        ball(X, top, Z, 18, 9, 18, 7);
        lobes(X, top - 2, Z, 6, 9, 14, 18, 7);
        for (let k = 0; k < 14; k++) {
          const an = k * 0.48 + r1 * 6.28, rr = 12 + (k % 4) * 3;
          const vx = X + Math.round(Math.cos(an) * rr), vz = Z + Math.round(Math.sin(an) * rr);
          const vy = top - 4 - (k % 3) * 2;
          const vlen = 8 + ((ra(k, 19) * 12) | 0);
          hangVines(vx, vy, vz, vlen);
        }
        dropLeaves(X, Z, 18, 19, 0.65);
      } else {
        const top = h + 22 + ((r1 * 8) | 0);
        trunk(X, Z, h, top, 2, 6, 1);
        for (let i = 0; i < 5; i++) {
          const e = branch(X, top - 2 - (i % 2) * 3, Z, ra(i, 3) * 6.283 + i * 1.25, 14 + ((ra(i, 5) * 7) | 0), 0.28, 2, 6);
          ball(e[0], e[1] + 2, e[2], 9 + ra(i, 11) * 4, 4, 9 + ra(i, 13) * 4, lv);
        }
        ball(X, top + 2, Z, 16, 5, 16, lv);
        lobes(X, top + 1, Z, 4, 7, 10, 14, lv, 0.45);
        for (let k = 0; k < 10; k++) {
          const an = k * 0.63 + r2 * 6.28, rr = 12 + (k % 3) * 3;
          const vx = X + Math.round(Math.cos(an) * rr), vz = Z + Math.round(Math.sin(an) * rr);
          const vy = top - 2;
          const vlen = 5 + ((ra(k, 17) * 7) | 0);
          hangVines(vx, vy, vz, vlen);
        }
        dropLeaves(X, Z, 16, lv === 9 ? 20 : (lv === 10 ? 21 : 19), 0.55);
      }
    }
  }

  // 1. Občasné seskupení kamenných balvanů (boulders - shluky kamene)
  const boulderSeed = h2(cx * 157 + 31, cz * 163 + 47);
  if (boulderSeed < 0.18) {
    const bx = cx * CS + 5 + Math.floor(h2(cx * 71 + 3, cz * 73 + 7) * 6);
    const bz = cz * CS + 5 + Math.floor(h2(cx * 79 + 5, cz * 83 + 11) * 6);
    const bh = height(bx, bz);
    const bBi = biome(bx, bz, bh);
    if (bh > SEA + 4 && bBi !== 1) {
      const slope1 = Math.abs(height(bx + 2, bz) - bh);
      const slope2 = Math.abs(height(bx, bz + 2) - bh);
      if (slope1 <= 2 && slope2 <= 2) {
        const rx = 1.6 + h2(bx * 7, bz * 11) * 1.1;
        const rz = 1.6 + h2(bz * 13, bx * 17) * 1.1;
        const ry = 1.2 + h2(bx * 3, bz * 5) * 0.9;
        for (let dx = -3; dx <= 3; dx++) {
          for (let dz = -3; dz <= 3; dz++) {
            for (let dy = -1; dy <= 3; dy++) {
              const dDist = (dx / rx) ** 2 + (dy / ry) ** 2 + (dz / rz) ** 2;
              if (dDist <= 1.05 + 0.2 * vn((bx + dx) * 0.35, (bz + dz) * 0.35)) {
                const bType = (h2(bx + dx * 13, bz + dz * 17) < 0.35) ? 23 : 3;
                set(bx + dx, bh + dy, bz + dz, bType);
              }
            }
          }
        }
        // Kamínky kolem základny balvanu
        for (let p = 0; p < 3; p++) {
          const px = bx + Math.round((h2(bx + p * 7, bz) - 0.5) * (rx + 2.5));
          const pz = bz + Math.round((h2(bz + p * 11, bx) - 0.5) * (rz + 2.5));
          const ph = height(px, pz);
          if (ph > SEA + 2) set(px, ph + 1, pz, 22);
        }
      }
    }
  }

  // 2. Detaily terénu: tráva (nízká, střední, vysoká), keříky, kamínky, květiny a houby
  for (let lz = 0; lz < CS; lz++) {
    for (let lx = 0; lx < CS; lx++) {
      const X = cx * CS + lx, Z = cz * CS + lz;
      const h = height(X, Z);
      if (h + 1 >= H) continue;
      const idxAbove = lx + lz * CS + (h + 1) * 256;
      if (d[idxAbove] !== 0) continue;

      const idxGround = lx + lz * CS + h * 256;
      const groundB = d[idxGround];
      const bi = biome(X, Z, h);
      const u = hum(X, Z);

      // 1. Skály a horské štíty: pouze drobné kamínky (žádné osamocené kostky balvanů)
      if (h >= 80 || (groundB === 3 && h > SEA + 2)) {
        const rockNoise = h2(X * 47 + 1, Z * 53 + 9);
        if (rockNoise < 0.02) {
          set(X, h + 1, Z, 22); // Kamínky
        }
        continue;
      }

      // 2. Pláže a břehy řek: občasné ploché oblázky (žádné osamocené balvany na písku!)
      if (groundB === 4 || (h >= SEA + 1 && h <= SEA + 4)) {
        const beachNoise = h2(X * 37 + 11, Z * 41 + 17);
        if (beachNoise < 0.015) {
          set(X, h + 1, Z, 22); // Kamínek na pláži
        }
        continue;
      }

      // 3. Poušť: pouze vzácné kamínky
      if (bi === 1) {
        const desertNoise = h2(X * 31 + 5, Z * 37 + 7);
        if (desertNoise < 0.012) {
          set(X, h + 1, Z, 22); // Pouštní kamínek
        }
        continue;
      }

      // 4. Travnaté louky a lesy
      if (groundB === 1 && h > SEA + 2) {
        const rnd = h2(X * 17 + 3, Z * 19 + 7);

        // Keříky s lesními plody (plné bloky vegetace)
        const bushNoise = h2(X * 53 + 7, Z * 59 + 11);
        if (bushNoise < 0.018) {
          set(X, h + 1, Z, 24); // Keřík
          continue;
        }

        // Drobné kamínky na louce (kamenná tlačítka)
        if (rnd < 0.009) {
          set(X, h + 1, Z, 22); // Kamínek
          continue;
        }

        // Lesní kapradí a houby (vlhčí oblasti / stín)
        if (u > 0.52) {
          if (rnd < 0.04) {
            set(X, h + 1, Z, 32); // Kapradí
            continue;
          } else if (rnd < 0.065) {
            set(X, h + 1, Z, 27); // Houba
            continue;
          }
        }

        // Květinová pole (více druhů květin: vlčí máky, pampelišky, chrpy, kopretiny, allium)
        const flowerPatch = vn(X * 0.11 + 100, Z * 0.11 + 100);
        if (flowerPatch > 0.64 && rnd < 0.35) {
          const flowerChoice = Math.floor(h2(X * 89 + 11, Z * 97 + 13) * 5);
          const flowerBlock = [26, 28, 29, 30, 31][flowerChoice];
          set(X, h + 1, Z, flowerBlock);
          continue;
        }

        // Občasná květina rozesetá v běžné trávě
        if (rnd < 0.025) {
          const singleFlower = (h2(X * 41 + 3, Z * 47 + 7) < 0.5) ? 26 : 28;
          set(X, h + 1, Z, singleFlower);
          continue;
        }

        // Traviny podle biomových shluků: nízká, střední, vysoká tráva
        const grassPatch = vn(X * 0.07 + 50, Z * 0.07 + 50);
        if (grassPatch > 0.72) {
          if (rnd < 0.75) {
            set(X, h + 1, Z, 18); // Vysoká tráva
          } else if (rnd < 0.92) {
            set(X, h + 1, Z, 17); // Střední tráva
          }
        } else if (grassPatch > 0.44) {
          if (rnd < 0.60) {
            set(X, h + 1, Z, 17); // Střední tráva
          } else if (rnd < 0.85) {
            set(X, h + 1, Z, 16); // Nízká tráva
          }
        } else if (grassPatch > 0.22) {
          if (rnd < 0.50) {
            set(X, h + 1, Z, 16); // Nízká tráva
          }
        }
      }
    }
  }

  // 3. Voxelové budovy a struktury světa (POIs složené z reálných kostek v chunku)
  const putBlock = (wx, y, wz, b) => {
    const lx = wx - cx * CS, lz = wz - cz * CS;
    if (lx < 0 || lx >= CS || lz < 0 || lz >= CS || y < 0) return;
    if (y >= H) {
      if (b === 0) return;
      const newH = Math.max(y + 48, H + 96), newD = new Uint8Array(256 * newH);
      newD.set(d); d = newD; H = newH; c.d = d; c.H = H;
    }
    d[lx + lz * CS + y * 256] = b;
    if (b !== 0 && y > maxY) {
      maxY = y;
      c.maxY = maxY;
    }
  };
  if (typeof window !== 'undefined' && window.POIManager && typeof window.POIManager.stampChunkStructures === 'function') {
    window.POIManager.stampChunkStructures(cx, cz, putBlock);
  }

  // Aplikace změn bloků (položené / zničené bloky ze sítě či uloženého světa)
  if (typeof window !== 'undefined' && window.networkManager && window.networkManager.worldDeltas) {
    const deltas = window.networkManager.worldDeltas;
    for (const key of Object.keys(deltas)) {
      const parts = key.split(',');
      if (parts.length === 3) {
        const bx = parseInt(parts[0]), by = parseInt(parts[1]), bz = parseInt(parts[2]);
        if (Math.floor(bx / CS) === cx && Math.floor(bz / CS) === cz) {
          const lx = bx - cx * CS, lz = bz - cz * CS;
          if (by >= 0) {
            if (by >= H) {
              const newH = Math.max(by + 48, H + 96), newD = new Uint8Array(256 * newH);
              newD.set(d); d = newD; H = newH; c.d = d; c.H = H;
            }
            d[lx + lz * CS + by * 256] = deltas[key];
            if (by > maxY) maxY = by;
          }
        }
      }
    }
  }

  c.d = d; c.H = H; c.maxY = maxY;
  return c;
}

function getChunk(cx, cz) {
  const k = key(cx, cz);
  let c = chunks.get(k);
  if (!c) {
    c = gen(cx, cz);
    chunks.set(k, c);
  }
  return c;
}

function block(x, y, z) {
  if (y < 0) return 3;
  const c = getChunk(x >> 4, z >> 4);
  if (y >= c.H) return 0;
  return c.d[(x & 15) + (z & 15) * CS + y * 256];
}

const isCross = (b) => (b >= 16 && b <= 18) || (b >= 25 && b <= 32);
const isFlatFloor = (b) => b === 19 || b === 20 || b === 21;
const isPebble = (b) => b === 22;
const isCutout = (b) => isCross(b) || isFlatFloor(b) || isPebble(b);
const isOpaque = (b) => b !== 0 && b !== 5 && !isCutout(b);

const vs = (i, j, k) => {
  const b = block(i, j, k);
  return b !== 0 && b !== 5 && b !== 11 && !isCutout(b);
};

const solid = (x, y, z) => vs(Math.floor(x / S), Math.floor(y / S), Math.floor(z / S));

// ---------- Mesher ----------
const FACES = [
  { n: [1, 0, 0], u: [0, 1, 0], v: [0, 0, 1], uy: 1, s: 0.82, k: 0 },
  { n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0], uy: 0, s: 0.7, k: 0 },
  { n: [0, 1, 0], u: [0, 0, 1], v: [1, 0, 0], uy: 0, s: 1, k: 1 },
  { n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1], uy: 0, s: 0.5, k: 2 },
  { n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0], uy: 0, s: 0.9, k: 0 },
  { n: [0, 0, -1], u: [0, 1, 0], v: [1, 0, 0], uy: 1, s: 0.74, k: 0 }
];
const CORN = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
const AOV = [0.5, 0.68, 0.84, 1];

function buildMesh(c) {
  const ox = c.cx * CS, oz = c.cz * CS, d = c.d;
  const B = (x, y, z) => y < 0 ? 3 : (x >= 0 && x < CS && z >= 0 && z < CS) ? (y >= c.H ? 0 : d[x + z * CS + y * 256]) : block(ox + x, y, oz + z);
  const O = () => ({ p: [], u: [], c: [], i: [], n: 0 }), SO = O(), W = O();

  for (let y = 0; y <= c.maxY; y++) {
    for (let z = 0; z < CS; z++) {
      for (let x = 0; x < CS; x++) {
        const b = d[x + z * CS + y * 256];
        if (!b) continue;
        const m = b === 5 ? W : SO;

        // 1. Křížový model (Minecraft styl: více 3D modelů, přirozený posun ze středu bloku a variace výšky)
        if (isCross(b)) {
          const X = ox + x, Z = oz + z;
          let tint = 0.92 + 0.18 * vn(X * 0.035, Z * 0.035);
          let cr = 1, cg = 1, cb = 1;
          if (b === 16 || b === 17 || b === 18 || b === 25 || b === 32) {
            const t = temp(X, Z) - Math.max(0, y - SEA - 8) * 0.0055, u = hum(X, Z), n = vn(X * 0.0075, Z * 0.0075);
            const dry = sm(0.55, 0.38, u) * sm(0.45, 0.58, t), cold = sm(0.5, 0.38, t), wet = sm(0.5, 0.65, u) * sm(0.52, 0.62, t);
            cr = (1 + 0.45 * dry - 0.15 * cold - 0.35 * wet) * (0.9 + 0.2 * n);
            cg = 1 - 0.05 * dry - 0.06 * wet;
            cb = (1 - 0.4 * dry + 0.25 * cold - 0.15 * wet) * (1.05 - 0.15 * n);
          }
          const t = TILES[b] ? TILES[b][0] : 0;
          const tx = t & 7, ty = t >> 3;
          const u0 = tx * 0.125 + 0.002, u1 = (tx + 1) * 0.125 - 0.002;
          const v0 = 1 - (ty + 1) * 0.125 + 0.002, v1 = 1 - ty * 0.125 - 0.002;

          // Přirozený Minecraft posun (jitter) ze středu bloku
          const jx = (h2(X * 31 + 7, Z * 37 + 11) - 0.5) * 0.28;
          const jz = (h2(Z * 43 + 13, X * 47 + 17) - 0.5) * 0.28;
          const cx0 = x + 0.5 + jx;
          const cz0 = z + 0.5 + jz;

          // Variace výšky každé jednotlivé rostliny
          const hVar = 0.88 + 0.24 * h2(X * 67 + 19, Z * 71 + 23);
          const baseHg = (b === 18) ? 1.35 : (b === 16 ? 0.72 : (b === 27 ? 0.65 : (b === 32 ? 0.85 : (b >= 28 && b <= 31 ? 0.88 : 0.95))));
          const hg = baseHg * hVar;

          // Pomocná funkce pro svislou rovinu
          const addPlane = (px, pz, ang, w, h) => {
            const dx = Math.cos(ang) * w * 0.5;
            const dz = Math.sin(ang) * w * 0.5;
            const k = m.n;
            m.p.push(
              px - dx, y, pz - dz,
              px + dx, y, pz + dz,
              px + dx, y + h, pz + dz,
              px - dx, y + h, pz - dz
            );
            m.u.push(u0, v0, u1, v0, u1, v1, u0, v1);
            for (let i = 0; i < 4; i++) m.c.push(tint * cr, tint * cg, tint * cb);
            m.i.push(k, k + 1, k + 2, k, k + 2, k + 3);
            m.n += 4;
          };

          // 4 různé prostorové modely pro rozmanitost sousedící trávy
          const modelType = Math.floor(h2(X * 79 + 5, Z * 83 + 9) * 4);

          if (modelType === 0) {
            // Model 0: Klasický Minecraft kříž (45° a 135°)
            addPlane(cx0, cz0, Math.PI / 4, 0.96, hg);
            addPlane(cx0, cz0, 3 * Math.PI / 4, 0.96, hg);
          } else if (modelType === 1) {
            // Model 1: Pootočený kříž (cca 22° a 112°)
            addPlane(cx0, cz0, 0.38, 0.96, hg);
            addPlane(cx0, cz0, 0.38 + Math.PI / 2, 0.96, hg);
          } else if (modelType === 2) {
            // Model 2: Hustý 3-rovinový trs (hvězdice po 60°)
            addPlane(cx0, cz0, 0.15, 0.92, hg);
            addPlane(cx0, cz0, 0.15 + Math.PI / 3, 0.92, hg);
            addPlane(cx0, cz0, 0.15 + 2 * Math.PI / 3, 0.92, hg);
          } else {
            // Model 3: Dvojitý trs (dva menší překřížené chomáčky na jednom bloku)
            addPlane(cx0 - 0.11, cz0 - 0.11, Math.PI / 4, 0.72, hg * 0.94);
            addPlane(cx0 - 0.11, cz0 - 0.11, 3 * Math.PI / 4, 0.72, hg * 0.94);
            addPlane(cx0 + 0.13, cz0 + 0.13, 0.4, 0.65, hg * 0.84);
            addPlane(cx0 + 0.13, cz0 + 0.13, 0.4 + Math.PI / 2, 0.65, hg * 0.84);
          }
          continue;
        }

        // 2. Popadané listí (plochý horizontální koberec na zemi)
        if (isFlatFloor(b)) {
          const t = TILES[b] ? TILES[b][0] : 0;
          const tx = t & 7, ty = t >> 3;
          const u0 = tx * 0.125 + 0.002, u1 = (tx + 1) * 0.125 - 0.002;
          const v0 = 1 - (ty + 1) * 0.125 + 0.002, v1 = 1 - ty * 0.125 - 0.002;

          let k = m.n;
          m.p.push(
            x, y + 0.015, z,
            x, y + 0.015, z + 1,
            x + 1, y + 0.015, z + 1,
            x + 1, y + 0.015, z
          );
          m.u.push(u0, v0, u0, v1, u1, v1, u1, v0);
          for (let i = 0; i < 4; i++) m.c.push(0.96, 0.96, 0.96);
          m.i.push(k, k + 1, k + 2, k, k + 2, k + 3);
          m.n += 4;
          continue;
        }

        // 3. Kamínky (3D kamenná tlačítka na zemi ve stylu Minecraftu – více modelů)
        if (isPebble(b)) {
          const X = ox + x, Z = oz + z;
          const model = Math.floor(h2(X * 43 + 17, Z * 59 + 29) * 4);

          const addBox = (bx0, bx1, by0, by1, bz0, bz1, tileIdx) => {
            const tx = tileIdx & 7, ty = tileIdx >> 3;
            const u0 = tx * 0.125 + 0.002, u1 = (tx + 1) * 0.125 - 0.002;
            const v0 = 1 - (ty + 1) * 0.125 + 0.002, v1 = 1 - ty * 0.125 - 0.002;

            // Vrch
            let k = m.n;
            m.p.push(bx0, by1, bz0, bx0, by1, bz1, bx1, by1, bz1, bx1, by1, bz0);
            m.u.push(u0, v0, u0, v1, u1, v1, u1, v0);
            for (let i = 0; i < 4; i++) m.c.push(1.0, 1.0, 1.04);
            m.i.push(k, k + 1, k + 2, k, k + 2, k + 3);
            m.n += 4;

            // Boky
            k = m.n;
            m.p.push(bx0, by0, bz0, bx1, by0, bz0, bx1, by1, bz0, bx0, by1, bz0);
            m.u.push(u0, v0, u1, v0, u1, v1, u0, v1);
            for (let i = 0; i < 4; i++) m.c.push(0.74, 0.74, 0.77);
            m.i.push(k, k + 1, k + 2, k, k + 2, k + 3);
            m.n += 4;

            k = m.n;
            m.p.push(bx1, by0, bz1, bx0, by0, bz1, bx0, by1, bz1, bx1, by1, bz1);
            m.u.push(u0, v0, u1, v0, u1, v1, u0, v1);
            for (let i = 0; i < 4; i++) m.c.push(0.9, 0.9, 0.93);
            m.i.push(k, k + 1, k + 2, k, k + 2, k + 3);
            m.n += 4;

            k = m.n;
            m.p.push(bx0, by0, bz1, bx0, by0, bz0, bx0, by1, bz0, bx0, by1, bz1);
            m.u.push(u0, v0, u1, v0, u1, v1, u0, v1);
            for (let i = 0; i < 4; i++) m.c.push(0.7, 0.7, 0.73);
            m.i.push(k, k + 1, k + 2, k, k + 2, k + 3);
            m.n += 4;

            k = m.n;
            m.p.push(bx1, by0, bz0, bx1, by0, bz1, bx1, by1, bz1, bx1, by1, bz0);
            m.u.push(u0, v0, u1, v0, u1, v1, u0, v1);
            for (let i = 0; i < 4; i++) m.c.push(0.82, 0.82, 0.85);
            m.i.push(k, k + 1, k + 2, k, k + 2, k + 3);
            m.n += 4;
          };

          if (model === 0) {
            addBox(x + 0.35, x + 0.65, y, y + 0.12, z + 0.32, z + 0.68, 3);
          } else if (model === 1) {
            addBox(x + 0.24, x + 0.52, y, y + 0.10, z + 0.44, z + 0.74, 3);
          } else if (model === 2) {
            addBox(x + 0.22, x + 0.50, y, y + 0.11, z + 0.25, z + 0.52, 3);
            addBox(x + 0.58, x + 0.78, y, y + 0.08, z + 0.52, z + 0.74, 3);
          } else {
            addBox(x + 0.20, x + 0.42, y, y + 0.09, z + 0.28, z + 0.48, 3);
            addBox(x + 0.54, x + 0.78, y, y + 0.11, z + 0.22, z + 0.46, 3);
            addBox(x + 0.42, x + 0.66, y, y + 0.07, z + 0.58, z + 0.82, 3);
          }
          continue;
        }

        for (let f = 0; f < 6; f++) {
          const F = FACES[f], n = F.n, nb = B(x + n[0], y + n[1], z + n[2]);
          if (b === 5 ? nb !== 0 : isOpaque(nb)) continue;

          const t = TILES[b] ? TILES[b][F.k === 0 ? 1 : F.k === 1 ? 0 : 2] : 0;
          const tx = t & 7, ty = t >> 3, u0 = tx * 0.125, v0 = 1 - (ty + 1) * 0.125;
          let tint = 1;
          if (b === 7 || b === 9 || b === 10 || b === 16 || b === 17 || b === 18 || (b === 1 && F.k === 1)) {
            tint = 0.85 + 0.3 * vn((ox + x) * 0.035, (oz + z) * 0.035);
          }
          let cr = 1, cg = 1, cb = 1;
          if (b === 7 || b === 16 || b === 17 || b === 18 || b === 24 || b === 25 || (b === 1 && F.k !== 2)) {
            const X = ox + x, Z = oz + z;
            const t = temp(X, Z) - Math.max(0, y - SEA - 8) * 0.0055, u = hum(X, Z), n = vn(X * 0.0075, Z * 0.0075);
            const dry = sm(0.55, 0.38, u) * sm(0.45, 0.58, t), cold = sm(0.5, 0.38, t), wet = sm(0.5, 0.65, u) * sm(0.52, 0.62, t);
            cr = (1 + 0.45 * dry - 0.15 * cold - 0.35 * wet) * (0.9 + 0.2 * n);
            cg = 1 - 0.05 * dry - 0.06 * wet;
            cb = (1 - 0.4 * dry + 0.25 * cold - 0.15 * wet) * (1.05 - 0.15 * n);
          }

          const ao = [];
          for (let q = 0; q < 4; q++) {
            const su = CORN[q][0], sv = CORN[q][1], U = F.u, V = F.v;
            let px = x + 0.5 + n[0] * 0.5 + su * U[0] * 0.5 + sv * V[0] * 0.5;
            let py = y + 0.5 + n[1] * 0.5 + su * U[1] * 0.5 + sv * V[1] * 0.5;
            let pz = z + 0.5 + n[2] * 0.5 + su * U[2] * 0.5 + sv * V[2] * 0.5;
            if (b === 5 && py > y + 0.5) py -= 0.1;
            let a = 3;
            if (b !== 5 && !isCutout(b)) {
              const s1 = B(x + n[0] + su * U[0], y + n[1] + su * U[1], z + n[2] + su * U[2]);
              const s2 = B(x + n[0] + sv * V[0], y + n[1] + sv * V[1], z + n[2] + sv * V[2]);
              const s3 = B(x + n[0] + su * U[0] + sv * V[0], y + n[1] + su * U[1] + sv * V[1], z + n[2] + su * U[2] + sv * V[2]);
              const o1 = isOpaque(s1) ? 1 : 0, o2 = isOpaque(s2) ? 1 : 0, o3 = isOpaque(s3) ? 1 : 0;
              a = o1 && o2 ? 0 : 3 - (o1 + o2 + o3);
            }
            ao.push(a);
            const l = (b === 11 || b === 35 || isCutout(b)) ? (isCutout(b) ? 1.05 * F.s * tint : 1.2) : AOV[a] * F.s * tint;
            let tu, tv;
            if (F.k === 0) {
              tv = ((F.uy ? su : sv) + 1) / 2;
              tu = ((F.uy ? sv : su) + 1) / 2;
            } else {
              tu = (su + 1) / 2;
              tv = (sv + 1) / 2;
            }
            m.p.push(px, py, pz);
            m.c.push(l * cr, l * cg, l * cb);
            m.u.push(u0 + (0.002 + tu * 0.996) * 0.125, v0 + (0.002 + tv * 0.996) * 0.125);
          }
          const k = m.n;
          m.i.push(...(ao[0] + ao[2] >= ao[1] + ao[3] ? [k, k + 1, k + 2, k, k + 2, k + 3] : [k + 1, k + 2, k + 3, k + 1, k + 3, k]));
          m.n += 4;
        }
      }
    }
  }

  const mk = (o, mat) => {
    if (!o.n) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(o.p, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(o.u, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(o.c, 3));
    g.setIndex(new THREE.Uint32BufferAttribute(o.i, 1));
    g.computeBoundingSphere();
    const me = new THREE.Mesh(g, mat);
    me.position.set(ox * S, 0, oz * S);
    me.scale.setScalar(S);
    scene.add(me);
    return me;
  };

  c.mesh = mk(SO, matSolid);
  c.water = mk(W, matWater);
  if (c.water) c.water.renderOrder = 1;
  c.meshed = true;
}

function dispose(c) {
  for (const m of [c.mesh, c.water]) {
    if (m) {
      scene.remove(m);
      m.geometry.dispose();
    }
  }
}

// ---------- Načítání a správa chunků v dohledu ----------
let lastC = '', queue = [], ready = false;

function manage() {
  const pcx = Math.floor(P.x / (CS * S)), pcz = Math.floor(P.z / (CS * S)), kc = pcx + ',' + pcz;
  if (kc === lastC) return;
  lastC = kc;
  queue = [];
  for (let dx = -RD; dx <= RD; dx++) {
    for (let dz = -RD; dz <= RD; dz++) {
      const r = Math.hypot(dx, dz);
      if (r > RD + 0.5) continue;
      const c = chunks.get(key(pcx + dx, pcz + dz));
      if (!c || !c.meshed) queue.push([r, pcx + dx, pcz + dz]);
    }
  }
  queue.sort((a, b) => a[0] - b[0]);
  for (const [k, c] of chunks) {
    if (Math.hypot(c.cx - pcx, c.cz - pcz) > RD + 2) {
      dispose(c);
      chunks.delete(k);
    }
  }
}

function pump(budget) {
  const t = performance.now();
  while (queue.length && performance.now() - t < budget) {
    const [, cx, cz] = queue.shift();
    const c = getChunk(cx, cz);
    if (!c.meshed) buildMesh(c);
  }
}

// ============================================================================
// Procedural POIs & Real Voxel Block Structures (Milestone 2 - F4)
// Všechny generované budovy jsou složené ze skutečných kostek (voxelů)!
// ============================================================================
(function () {
  'use strict';

  const MACRO_L = 160;
  const POI_MARGIN = 24;
  const POI_TYPES = ['Shrine', 'Ruins', 'Camp', 'Landmark', 'Chest'];
  const DISPLAY_NAMES = {
    Shrine: 'Prastará svatyně',
    Ruins: 'Tajemné zříceniny',
    Camp: 'Tábor nestvůr',
    Chest: 'Tajemná pokladnice',
    Landmark: 'Strážní maják',
    DragonNestFire: 'Hnízdo ohnivého draka',
    DragonNestIce: 'Hnízdo ledového draka'
  };

  const POIManager = {
    macroCellSize: MACRO_L,
    pois: [],
    instances: new Map(),
    discoveredPOIs: new Set(),
    openedChests: new Set(),
    activeShrines: new Map(),

    _getStorageScope: function () {
      const sKey = (typeof SEED !== 'undefined') ? SEED : 'default';
      try {
        if (typeof GameStorage !== 'undefined' && typeof GameStorage.getActiveGame === 'function') {
          const act = GameStorage.getActiveGame();
          if (act && (act.worldId || act.id)) {
            return `${act.worldId || act.id}_${sKey}`;
          }
        }
      } catch (e) {}
      return `${sKey}`;
    },

    init: function () {
      this.discoveredIds = this.discoveredPOIs;
      try {
        const scope = this._getStorageScope();
        if (typeof localStorage !== 'undefined') {
          const disc = localStorage.getItem(`voxel_poi_discovered_v2_${scope}`);
          if (disc) {
            const arr = JSON.parse(disc);
            if (Array.isArray(arr)) arr.forEach(id => this.discoveredPOIs.add(id));
          }
          const opn = localStorage.getItem(`voxel_opened_chests_v2_${scope}`);
          if (opn) {
            const arr = JSON.parse(opn);
            if (Array.isArray(arr)) arr.forEach(id => this.openedChests.add(id));
          }
        }
      } catch (e) {}
    },

    save: function () {
      try {
        const scope = this._getStorageScope();
        if (typeof localStorage !== 'undefined') {
          const discList = Array.from(this.discoveredPOIs);
          localStorage.setItem(`voxel_poi_discovered_v2_${scope}`, JSON.stringify(discList));
          localStorage.setItem(`voxel_opened_chests_v2_${scope}`, JSON.stringify(Array.from(this.openedChests)));
        }
      } catch (e) {}
    },

    getPoiForCell: function (cellX, cellZ) {
      const key = `${cellX},${cellZ}`;
      if (this.instances.has(key)) return this.instances.get(key);

      const sea = (typeof SEA !== 'undefined') ? SEA : 44;
      const s = (typeof S !== 'undefined') ? S : 0.5;

      // Deterministický výběr typu POI
      const typeHash = Math.abs(Math.sin(cellX * 12.9898 + cellZ * 78.233) * 43758.5453) % 1;
      const typeIndex = Math.floor(typeHash * POI_TYPES.length);
      let type = POI_TYPES[typeIndex];

      // Deterministické prohledávání suché země (y >= SEA + 3)
      const offsets = [
        [0, 0], [24, 0], [-24, 0], [0, 24], [0, -24], [36, 36], [-36, -36]
      ];

      let bestBX = cellX * MACRO_L + 80;
      let bestBZ = cellZ * MACRO_L + 80;
      let bestBY = Math.max(sea + 3, 47);

      // Hledání vhodného místa v buňce
      for (const [ox, oz] of offsets) {
        const hashRelX = Math.abs(Math.sin(cellX * 37.11 + cellZ * 19.33 + ox * 0.1) * 23421.1) % 1;
        const hashRelZ = Math.abs(Math.sin(cellX * 17.55 + cellZ * 43.77 + oz * 0.1) * 87654.3) % 1;
        const relX = Math.floor(POI_MARGIN + hashRelX * (MACRO_L - 2 * POI_MARGIN));
        const relZ = Math.floor(POI_MARGIN + hashRelZ * (MACRO_L - 2 * POI_MARGIN));
        const candBX = cellX * MACRO_L + Math.min(MACRO_L - 16, Math.max(16, relX + ox));
        const candBZ = cellZ * MACRO_L + Math.min(MACRO_L - 16, Math.max(16, relZ + oz));

        let candBY = Math.max(sea + 3, 47);
        if (typeof height === 'function') {
          candBY = height(candBX, candBZ);
        }

        if (candBY >= sea + 3) {
          bestBX = candBX;
          bestBZ = candBZ;
          bestBY = candBY;
          break;
        }
      }

      // Bezpečnostní garance suché země (y >= SEA + 3 = 47)
      if (bestBY < sea + 3) {
        bestBY = sea + 3;
      }

      // Horská dračí hnízda (Wyverny v horách):
      // Pokud je lokalita na vyvýšeném horském štítu (bestBY >= 60), usadí se zde drak/wyverna
      if (bestBY >= 60) {
        const isIce = (typeof temp === 'function' ? temp(bestBX, bestBZ) < 0.44 : (cellX + cellZ) % 2 === 0);
        type = isIce ? 'DragonNestIce' : 'DragonNestFire';
      }
      const displayName = DISPLAY_NAMES[type] || type;

      const id = `poi_${cellX}_${cellZ}`;
      const isOpened = this.openedChests.has(id);
      const isDisc = this.discoveredPOIs.has(id);

      const poi = {
        id,
        cellX,
        cellZ,
        x: bestBX,
        y: bestBY,
        z: bestBZ,
        bx: bestBX,
        by: bestBY,
        bz: bestBZ,
        wx: bestBX * s,
        wy: bestBY * s,
        wz: bestBZ * s,
        type,
        displayName,
        name: displayName,
        xpReward: 50,
        xp: 50,
        discovered: isDisc,
        group: null,
        attached: false,
        guardiansSpawned: false,
        opened: isOpened,
        openAngle: isOpened ? 1.3 : 0,
        targetAngle: isOpened ? 1.3 : 0
      };

      this.instances.set(key, poi);
      if (!this.pois.some(p => p.id === id)) {
        this.pois.push(poi);
      }

      return poi;
    },

    getPoisInChunk: function (cx, cz) {
      const cellX = Math.floor((cx * 16) / MACRO_L);
      const cellZ = Math.floor((cz * 16) / MACRO_L);
      return [this.getPoiForCell(cellX, cellZ)];
    },

    // =========================================================================
    // Vykreslení skutečných voxelových budov přímo do blokové mřížky chunku
    // =========================================================================
    stampChunkStructures: function (cx, cz, putBlock) {
      const cs = (typeof CS !== 'undefined') ? CS : 16;
      const chunkMinX = cx * cs;
      const chunkMaxX = chunkMinX + cs - 1;
      const chunkMinZ = cz * cs;
      const chunkMaxZ = chunkMinZ + cs - 1;

      const baseCellX = Math.floor(chunkMinX / MACRO_L);
      const baseCellZ = Math.floor(chunkMinZ / MACRO_L);

      for (let dcx = -1; dcx <= 1; dcx++) {
        for (let dcz = -1; dcz <= 1; dcz++) {
          const poi = this.getPoiForCell(baseCellX + dcx, baseCellZ + dcz);
          if (!poi) continue;

          const R = 12; // Poloměr půdorysu budov + rovného vstupního nádvoří v blocích
          const pbx = (typeof poi.bx === 'number') ? poi.bx : poi.x;
          const pbz = (typeof poi.bz === 'number') ? poi.bz : poi.z;
          if (pbx + R < chunkMinX || pbx - R > chunkMaxX ||
              pbz + R < chunkMinZ || pbz - R > chunkMaxZ) {
            continue;
          }

          this._stampSinglePOI(poi, chunkMinX, chunkMaxX, chunkMinZ, chunkMaxZ, putBlock);
        }
      }
    },

    _stampSinglePOI: function (poi, minX, maxX, minZ, maxZ, put) {
      const bx = (typeof poi.bx === 'number') ? poi.bx : poi.x;
      const by = (typeof poi.by === 'number') ? poi.by : poi.y;
      const bz = (typeof poi.bz === 'number') ? poi.bz : poi.z;
      const type = poi.type;

      // Pomocná funkce: postaví pevný základ od přirozeného terénu až do úrovně yFloor
      // a vyčistí prostor nad budovou od případných stromů či trávy
      const prepareColumn = (wx, wz, yFloor, clearHeight, foundationBlock) => {
        if (wx < minX || wx > maxX || wz < minZ || wz > maxZ) return false;
        const th = (typeof height === 'function') ? height(wx, wz) : by;
        const startY = Math.min(th, yFloor - 3);
        for (let y = startY; y <= yFloor; y++) {
          put(wx, y, wz, foundationBlock);
        }
        for (let y = yFloor + 1; y <= yFloor + clearHeight; y++) {
          put(wx, y, wz, 0);
        }
        return true;
      };

      // Rovné, čisté kamenné předdvoří před jižním vchodem budovy (pro 100% bezpečnou teleportaci bez zaseknutí)
      const entranceStartZ = (type === 'Camp' || type === 'Ruins' || type === 'DragonNestFire' || type === 'DragonNestIce') ? 8 : (type === 'Shrine' ? 7 : 6);
      for (let dx = -2; dx <= 2; dx++) {
        for (let dz = entranceStartZ; dz <= entranceStartZ + 3; dz++) {
          prepareColumn(bx + dx, bz + dz, by, 18, 23);
        }
      }

      // -----------------------------------------------------------------------
      // 1. PRASTARÁ SVATYNĚ (Shrine) – Kaskádový chrám z kostek se 4 sloupy a oltářem
      // -----------------------------------------------------------------------
      if (type === 'Shrine') {
        for (let dx = -6; dx <= 6; dx++) {
          for (let dz = -6; dz <= 6; dz++) {
            const wx = bx + dx, wz = bz + dz;
            const adx = Math.abs(dx), adz = Math.abs(dz);
            const maxD = Math.max(adx, adz);

            // Odstranění rohových kostek vnějšího stupně pro čistý chrámový půdorys
            if (adx === 6 && adz === 6) continue;

            // Spodní stupeň podstavce (y = by): tmavý oltářní kámen / kamenné cihly
            const baseBlock = (maxD === 6) ? 36 : 33;
            if (!prepareColumn(wx, wz, by, 16, baseBlock)) continue;

            // Horní chrámová terasa (y = by + 1) pro dx, dz v [-5..5] + přístupové schody na 4 stranách
            const isStair = (maxD === 6 && (adx <= 1 || adz <= 1));
            if (maxD <= 5 || isStair) {
              if (adx === 5 && adz === 5) continue;
              const isRuneCross = (adx <= 1 || adz <= 1) && maxD <= 4;
              const floorBlock = isRuneCross ? 36 : 33;
              put(wx, by + 1, wz, floorBlock);
            }

            // 4 mohutné rohové sloupy (2x2 kostky) na pozicích (±3..±4, ±3..±4)
            const inPillarX = (adx >= 3 && adx <= 4);
            const inPillarZ = (adz >= 3 && adz <= 4);
            if (inPillarX && inPillarZ) {
              // Patka sloupu (y = by + 2)
              put(wx, by + 2, wz, 36);
              // Dřík sloupu z kamenných cihel (y = by + 3 .. by + 8)
              for (let py = by + 3; py <= by + 8; py++) {
                put(wx, py, wz, 33);
              }
              // Hlavice sloupu se zlatým lemem (y = by + 9)
              put(wx, by + 9, wz, 36);
              // Zářivý runový krystal na vrcholu vnitřního rohu sloupu (y = by + 10)
              if (adx === 3 && adz === 3) {
                put(wx, by + 10, wz, 35);
              }
            }

            // Centrální oltář z kostek uprostřed svatyně (dx, dz v [-1..1])
            if (adx <= 1 && adz <= 1) {
              put(wx, by + 2, wz, 36);
              if (adx === 0 && adz === 0) {
                // Vyvýšený střed oltáře se zářivou krystalovou kostkou
                put(wx, by + 3, wz, 35);
              } else if (adx === 0 || adz === 0) {
                put(wx, by + 3, wz, 36);
              }
            }
          }
        }
      }

      // -----------------------------------------------------------------------
      // 2. TAJEMNÉ ZŘÍCENINY (Ruins) – Starobylý chrám s klenbami, mechem a liánami
      // -----------------------------------------------------------------------
      else if (type === 'Ruins') {
        for (let dx = -7; dx <= 7; dx++) {
          for (let dz = -7; dz <= 7; dz++) {
            const wx = bx + dx, wz = bz + dz;
            const adx = Math.abs(dx), adz = Math.abs(dz);
            const maxD = Math.max(adx, adz);
            if (adx === 7 && adz === 7) continue;

            // Základ a zvětralá kamenná podlaha
            const isMossy = ((dx * 7 + dz * 13) & 3) === 0;
            const fBlock = isMossy ? 23 : 33;
            if (!prepareColumn(wx, wz, by, 15, fBlock)) continue;

            if (maxD <= 6) {
              put(wx, by + 1, wz, isMossy ? 23 : 33);
            }

            // Obvodové zdi a kamenné klenby na |dx| === 5 nebo |dz| === 5
            const onWallX = (adx === 5 && adz <= 5);
            const onWallZ = (adz === 5 && adx <= 5);
            if (onWallX || onWallZ) {
              // Vstupní brána na jihu (+Z) a severu (-Z) s klenutým překladem
              const isDoorway = (adz === 5 && adx <= 1);
              const isSideWindow = (adx === 5 && adz <= 1);

              // Výška zříceniny kolísá deterministicky podle souřadnice (efekt pobořeného chrámu)
              const wallHash = Math.abs((dx * 19 + dz * 31) % 5);
              const wallTop = (adx === 5 && adz === 5) ? 8 : (4 + wallHash);

              for (let wy = 2; wy <= wallTop; wy++) {
                if (isDoorway && wy <= 6) continue;
                if (isSideWindow && wy >= 4 && wy <= 5) continue;
                const wBlk = ((wy + dx + dz) % 3 === 0) ? 23 : 33;
                put(wx, by + wy, wz, wBlk);
              }

              // Kamenný oblouk nad jižní a severní bránou
              if (adz === 5 && adx <= 2) {
                put(wx, by + 7, wz, 33);
                if (adx <= 1) put(wx, by + 8, wz, 36);
                // Visící liány z klenby
                if (adx === 1) {
                  put(wx, by + 6, wz, 25);
                  put(wx, by + 5, wz, 25);
                }
              }
            }

            // Povalený kamenný sloup z kostek na podlaze (dx v [2..3], dz v [1..3])
            if (dx >= 2 && dx <= 3 && dz >= 1 && dz <= 2) {
              put(wx, by + 2, wz, 23);
            }

            // Středový podstavec pod truhlou
            if (adx <= 1 && adz <= 1) {
              put(wx, by + 1, wz, 36);
            }
          }
        }
      }

      // -----------------------------------------------------------------------
      // 3. TÁBOR NESTVŮR (Camp) – Dřevěná palisáda, voxelový stan, bedny a ohniště
      // -----------------------------------------------------------------------
      else if (type === 'Camp') {
        for (let dx = -7; dx <= 7; dx++) {
          for (let dz = -7; dz <= 7; dz++) {
            const wx = bx + dx, wz = bz + dz;
            const adx = Math.abs(dx), adz = Math.abs(dz);
            const maxD = Math.max(adx, adz);
            if (adx === 7 && adz === 7) continue;

            // Udusaná zemina a pískové nádvoří tábora
            const groundBlk = (maxD <= 2) ? 23 : ((dx + dz) % 2 === 0 ? 2 : 4);
            if (!prepareColumn(wx, wz, by, 14, groundBlk)) continue;

            // Dřevěná kůlová palisáda po obvodu (maxD === 7) s bránou na jihu (dz === 7, |dx| <= 1)
            if (maxD === 7) {
              const isGate = (dz === 7 && adx <= 1);
              if (!isGate) {
                const stakeH = ((dx + dz) & 1) === 0 ? 4 : 3;
                for (let py = 1; py <= stakeH; py++) {
                  put(wx, by + py, wz, 6); // Kmeny stromů
                }
              }
              // Strážní sloupky u brány s pochodněmi
              if (dz === 7 && adx === 2) {
                for (let py = 1; py <= 5; py++) put(wx, by + py, wz, 6);
                put(wx, by + 5, wz, 34);
                put(wx, by + 6, wz, 11); // Plamen pochodně
              }
            }

            // Voxelový stan (A-frame z kostek) v severozápadní části (dx v [-5..-1], dz v [-5..-1])
            if (dx >= -5 && dx <= -1 && dz >= -5 && dz <= -1) {
              put(wx, by, wz, 34); // Dřevěná podlaha stanu
              const tentRelX = dx + 3; // -2 .. +2
              const roofH = 4 - Math.abs(tentRelX); // Stupňovitá sedlová střecha: výška 2, 3, 4
              // Zadní stěna stanu (dz === -5)
              if (dz === -5) {
                for (let ty = 1; ty <= roofH; ty++) {
                  put(wx, by + ty, wz, ty === roofH ? 37 : 34);
                }
              } else {
                // Boční šikmé stěny stanu z plátna (blok 37) a dřevěné podpěry
                if (Math.abs(tentRelX) === 2) {
                  put(wx, by + 1, wz, 6);
                  put(wx, by + 2, wz, 37);
                } else if (Math.abs(tentRelX) === 1) {
                  put(wx, by + 3, wz, 37);
                } else if (tentRelX === 0) {
                  put(wx, by + 4, wz, 37);
                }
              }
            }

            // Dřevěné zásobní bedny na východní straně
            if (dx >= 3 && dx <= 4 && dz >= -3 && dz <= -2) {
              put(wx, by + 1, wz, 34);
              if (dx === 4 && dz === -3) put(wx, by + 2, wz, 34);
            }

            // Centrální kamenné ohniště z kostek (dx, dz v [-1..1])
            if (adx <= 1 && adz <= 1) {
              if (adx === 0 && adz === 0) {
                put(wx, by + 1, wz, 11); // Žhnoucí oheň uprostřed
              } else if (adx === 0 || adz === 0) {
                put(wx, by + 1, wz, 23); // Kamenná obruba ohniště
              }
            }
          }
        }
      }

      // -----------------------------------------------------------------------
      // 4. STRÁŽNÍ MAJÁK / VĚŽ (Landmark) – Vysoká kamenná věž s cimbuřím a ohněm
      // -----------------------------------------------------------------------
      else if (type === 'Landmark') {
        for (let dx = -5; dx <= 5; dx++) {
          for (let dz = -5; dz <= 5; dz++) {
            const wx = bx + dx, wz = bz + dz;
            const adx = Math.abs(dx), adz = Math.abs(dz);
            const maxD = Math.max(adx, adz);
            if (adx === 5 && adz === 5) continue;

            // Pevný kamenný sokl věže
            if (!prepareColumn(wx, wz, by, 22, 33)) continue;

            // Schodišťový stupeň soklu (y = by + 1)
            if (maxD <= 4 || (dz === 5 && adx <= 1)) {
              put(wx, by + 1, wz, (adx <= 1 && adz <= 1) ? 36 : 33);
            }

            // Tělo věže (dx, dz v [-3..3], y = by + 2 .. by + 14)
            if (maxD <= 3) {
              const isPerimeter = (adx === 3 || adz === 3);
              const isCorner = (adx === 3 && adz === 3);
              const isDoor = (dz === 3 && adx <= 1);
              const isWindow = ((adx === 3 && adz === 0) || (adz === 3 && adx === 0));

              for (let ty = 2; ty <= 14; ty++) {
                if (isPerimeter) {
                  if (isDoor && ty <= 5) continue; // Vstupní brána do přízemí věže
                  if (isWindow && (ty === 8 || ty === 9)) continue; // Střílny / okna
                  const blk = isCorner ? 36 : (((ty + dx + dz) % 4 === 0) ? 23 : 33);
                  put(wx, by + ty, wz, blk);
                } else {
                  // Dřevěná patra uvnitř věže (ve výšce 6 a 10)
                  if ((ty === 6 || ty === 10) && !(adx === 0 && adz === 0)) {
                    put(wx, by + ty, wz, 34);
                  }
                }
              }
            }

            // Předsunuté vyhlídkové ochozy s cimbuřím (dx, dz v [-4..4], y = by + 15 .. by + 16)
            if (maxD <= 4) {
              put(wx, by + 15, wz, (maxD === 4) ? 36 : 33);
              // Zuby cimbuří po obvodu
              if (maxD === 4 && ((dx + dz) % 2 === 0)) {
                put(wx, by + 16, wz, 33);
                if (adx === 4 && adz === 4) {
                  put(wx, by + 17, wz, 35); // Rohové krystalové lucerny
                }
              }
            }

            // Signální ohnivý maják na vrcholu věže (dx, dz v [-1..1], y = by + 16 .. by + 18)
            if (adx <= 1 && adz <= 1) {
              put(wx, by + 16, wz, 36);
              if (adx === 0 && adz === 0) {
                put(wx, by + 17, wz, 11);
                put(wx, by + 18, wz, 11);
              } else if (adx === 0 || adz === 0) {
                put(wx, by + 17, wz, 11);
              }
            }
          }
        }
      }

      // -----------------------------------------------------------------------
      // 5. TAJEMNÁ POKLADNICE (Chest) – Kamenný pavilon / krypta se střechou z kostek
      // -----------------------------------------------------------------------
      else if (type === 'Chest') {
        for (let dx = -4; dx <= 4; dx++) {
          for (let dz = -4; dz <= 4; dz++) {
            const wx = bx + dx, wz = bz + dz;
            const adx = Math.abs(dx), adz = Math.abs(dz);
            const maxD = Math.max(adx, adz);
            if (adx === 4 && adz === 4) continue;

            if (!prepareColumn(wx, wz, by, 12, 33)) continue;

            // Podlaha pavilonu (y = by + 1)
            if (maxD <= 3 || (adx <= 1 || adz <= 1)) {
              put(wx, by + 1, wz, (adx <= 1 && adz <= 1) ? 36 : 33);
            }

            // 4 rohové kamenné pilíře (na ±3, ±3)
            if (adx === 3 && adz === 3) {
              for (let py = 2; py <= 5; py++) {
                put(wx, by + py, wz, py === 5 ? 36 : 33);
              }
            }

            // Stupňovitá klenutá střecha pavilonu z kostek (y = by + 6 .. by + 8)
            if (maxD <= 3) {
              put(wx, by + 6, wz, (maxD === 3) ? 36 : 33);
            }
            if (maxD <= 2) {
              put(wx, by + 7, wz, 33);
            }
            if (adx === 0 && adz === 0) {
              put(wx, by + 8, wz, 35); // Zářivý krystal na špičce střechy
              put(wx, by + 5, wz, 35); // Stropní krystalová lucerna nad truhlou
            }
          }
        }
      }

      // -----------------------------------------------------------------------
      // 6. DRAČÍ HNÍZDO (DragonNestFire / DragonNestIce) - Horský kráter / hnízdo wyverny
      // -----------------------------------------------------------------------
      else if (type === 'DragonNestFire' || type === 'DragonNestIce') {
        const isIce = (type === 'DragonNestIce');
        const rimBlock = isIce ? 8 : 36;       // Sníh/led nebo temný obsidián
        const floorBlock = isIce ? 33 : 23;     // Ledový kámen nebo zvětralá skála
        const centerBlock = isIce ? 35 : 11;    // Ledový krystal nebo žhavý oheň

        for (let dx = -7; dx <= 7; dx++) {
          for (let dz = -7; dz <= 7; dz++) {
            const wx = bx + dx, wz = bz + dz;
            const distSq = dx * dx + dz * dz;
            if (distSq > 49) continue;

            const dist = Math.sqrt(distSq);

            // Vyrovnání a pevný základ hnízda
            if (!prepareColumn(wx, wz, by, 16, floorBlock)) continue;

            // Zvýšený sopečný / ledový okraj hnízda (dist mezi 5.0 a 7.0)
            if (dist >= 5.0 && dist <= 7.0) {
              const rimHeight = ((Math.abs(dx * 7 + dz * 13) % 3) + 1);
              for (let ry = 1; ry <= rimHeight; ry++) {
                put(wx, by + ry, wz, rimBlock);
              }
              if ((dx + dz) % 3 === 0) {
                put(wx, by + rimHeight + 1, wz, isIce ? 35 : 36);
              }
            } else if (dist < 5.0) {
              // Vnitřní miska dračího hnízda
              put(wx, by + 1, wz, floorBlock);

              // Oheň nebo mrazivé krystaly po obvodu hnízda
              if (dist >= 3.2 && dist <= 4.2 && ((dx * 3 + dz * 5) % 4 === 0)) {
                put(wx, by + 2, wz, isIce ? 35 : 11);
              }

              // Středová plošina pro truhlu se zlatem a dračím pokladem
              if (Math.abs(dx) <= 1 && Math.abs(dz) <= 1) {
                put(wx, by + 1, wz, 36);
                if (dx === 0 && dz === 0) {
                  put(wx, by + 2, wz, centerBlock);
                }
              }
            }
          }
        }
      }
    },

    isDiscovered: function (poiOrId) {
      const poiId = (typeof poiOrId === 'object' && poiOrId) ? poiOrId.id : poiOrId;
      if (!poiId) return false;
      if (this.discoveredPOIs.has(poiId)) return true;
      let poi = (typeof poiOrId === 'object' && poiOrId) ? poiOrId : null;
      if (!poi) {
        for (const p of this.instances.values()) {
          if (p.id === poiId) { poi = p; break; }
        }
        if (!poi) poi = this.pois.find(p => p.id === poiId);
      }
      return !!(poi && poi.discovered === true);
    },

    discoverPOI: function (poiId) {
      if (this.isDiscovered(poiId)) {
        return false;
      }

      this.discoveredPOIs.add(poiId);

      // Vyhledání instance POI
      let poi = null;
      for (const p of this.instances.values()) {
        if (p.id === poiId) { poi = p; break; }
      }
      if (!poi) {
        poi = this.pois.find(p => p.id === poiId);
      }
      if (poi) {
        poi.discovered = true;
      }

      const xp = (poi && (poi.xpReward || poi.xp)) || 50;
      const name = (poi && (poi.displayName || poi.name)) || 'Neznámé místo';

      // Odkrytí chunku s budovou na 3D mapě
      if (poi && typeof exploredChunks !== 'undefined') {
        const cs = (typeof CS !== 'undefined') ? CS : 16;
        const pbx = (typeof poi.bx === 'number') ? poi.bx : (poi.x || 0);
        const pbz = (typeof poi.bz === 'number') ? poi.bz : (poi.z || 0);
        const pcx = Math.floor(pbx / cs);
        const pcz = Math.floor(pbz / cs);
        for (let dx = -1; dx <= 1; dx++) {
          for (let dz = -1; dz <= 1; dz++) {
            exploredChunks.add(`${pcx + dx},${pcz + dz}`);
          }
        }
      }

      // 1. Udělení zkušeností
      if (typeof window !== 'undefined') {
        if (typeof window.addPlayerXP === 'function') {
          window.addPlayerXP(xp, 'discovery');
        } else if (typeof P !== 'undefined' && P) {
          P.xp = (P.xp || 0) + xp;
          if (typeof window.checkPlayerLevelUp === 'function') {
            window.checkPlayerLevelUp();
          }
        }
      }

      // 2. Web Audio fanfára
      if (typeof window !== 'undefined' && typeof window.playDiscoveryChime === 'function') {
        window.playDiscoveryChime();
      }

      // 3. On-screen toast a RPG banner
      if (typeof window !== 'undefined' && typeof window.showDiscoveryToast === 'function') {
        window.showDiscoveryToast(name, xp);
      } else if (typeof toast === 'function') {
        toast(`🗺️ Objeveno: ${name} (+${xp} XP)`);
      }

      // 4. Landmark speciální odhalení mlhy (Fog of War 12 chunků)
      if (poi && poi.type === 'Landmark') {
        if (typeof exploredChunks !== 'undefined') {
          const s = (typeof S !== 'undefined') ? S : 0.5;
          const cs = (typeof CS !== 'undefined') ? CS : 16;
          const pcx = Math.floor(poi.wx / (cs * s));
          const pcz = Math.floor(poi.wz / (cs * s));
          let hasNew = false;
          for (let lx = -12; lx <= 12; lx++) {
            for (let lz = -12; lz <= 12; lz++) {
              if (lx * lx + lz * lz <= 144) {
                const k = `${pcx + lx},${pcz + lz}`;
                if (!exploredChunks.has(k)) {
                  exploredChunks.add(k);
                  hasNew = true;
                }
              }
            }
          }
          if (hasNew && typeof saveExploredHistory === 'function') {
            saveExploredHistory();
          }
        }
      }

      // 5. Aktualizace minimapy
      if (typeof mmNeedsRebuild !== 'undefined') {
        mmNeedsRebuild = true;
      }

      this.save();
      return true;
    },

    // =========================================================================
    // Teleportace hráče POUZE k objevené budově + 100% ochrana proti zaseknutí v bloku
    // =========================================================================
    teleportToPOI: function (poiOrId) {
      let poi = (typeof poiOrId === 'object' && poiOrId) ? poiOrId : null;
      if (!poi && typeof poiOrId === 'string') {
        for (const p of this.instances.values()) {
          if (p.id === poiOrId) { poi = p; break; }
        }
        if (!poi) poi = this.pois.find(p => p.id === poiOrId);
      }
      if (!poi || !this.isDiscovered(poi)) {
        if (typeof toast === 'function') toast('🔒 K této budově se můžeš teleportovat až poté, co ji objevíš!');
        return false;
      }

      const s = (typeof S !== 'undefined') ? S : 0.5;
      const cs = (typeof CS !== 'undefined') ? CS : 16;
      const pObj = (typeof window !== 'undefined' && window.P) ? window.P : (typeof P !== 'undefined' ? P : null);
      if (!pObj) return false;

      const pbx = (typeof poi.bx === 'number') ? poi.bx : poi.x;
      const pby = (typeof poi.by === 'number') ? poi.by : (poi.y || 47);
      const pbz = (typeof poi.bz === 'number') ? poi.bz : poi.z;

      // Střed připraveného vstupního předdvoří na jižní straně (+Z)
      const entranceOffsetBlocks = (poi.type === 'Camp' || poi.type === 'Ruins' || poi.type === 'DragonNestFire' || poi.type === 'DragonNestIce') ? 9 : (poi.type === 'Shrine' ? 8 : 7);
      const prefBX = pbx;
      const prefBZ = pbz + entranceOffsetBlocks;

      // 1. Vynutit vygenerování všech chunků v okolí budovy i předdvoří
      if (typeof getChunk === 'function') {
        const tcx = Math.floor(prefBX / cs);
        const tcz = Math.floor(prefBZ / cs);
        for (let dx = -2; dx <= 2; dx++) {
          for (let dz = -2; dz <= 2; dz++) {
            getChunk(tcx + dx, tcz + dz);
          }
        }
      }

      // 2. Vyčistit prostor 3x3x5 kostek přímo v místě přistání v chunk datech (proti větvím stromů apod.)
      if (typeof getChunk === 'function' && typeof vs === 'function') {
        for (let dx = -1; dx <= 1; dx++) {
          for (let dz = -1; dz <= 1; dz++) {
            const wx = prefBX + dx;
            const wz = prefBZ + dz;
            const ch = getChunk(wx >> 4, wz >> 4);
            if (!ch || !ch.d) continue;
            const lx = wx & 15, lz = wz & 15;
            // Zaručit pevnou podlahu na pby
            if (pby >= 0 && pby < ch.H && ch.d[lx + lz * cs + pby * 256] === 0) {
              ch.d[lx + lz * cs + pby * 256] = 23;
            }
            // Vyčistit 6 bloků vzduchu nad podlahou předdvoří (y = pby + 1 .. pby + 6)
            for (let clearY = pby + 1; clearY <= Math.min(ch.H - 1, pby + 6); clearY++) {
              ch.d[lx + lz * cs + clearY * 256] = 0;
            }
            ch.meshed = false;
          }
        }
      }

      // 3. Ověření celého 3D hitboxu hráče (šířka ±HW, výška 1.8m)
      const isBoxFree = (wx, wy, wz) => {
        if (typeof hits === 'function') {
          return !hits(wx, wy, wz, 1.8);
        }
        if (typeof vs === 'function') {
          const hw = 0.3;
          for (let i = Math.floor((wx - hw) / s); i <= Math.floor((wx + hw) / s); i++) {
            for (let j = Math.floor(wy / s); j <= Math.floor((wy + 1.79) / s); j++) {
              for (let k = Math.floor((wz - hw) / s); k <= Math.floor((wz + hw) / s); k++) {
                if (vs(i, j, k)) return false;
              }
            }
          }
        }
        return true;
      };

      let finalX = (prefBX + 0.5) * s;
      let finalZ = (prefBZ + 0.5) * s;
      let finalY = (pby + 1.04) * s;

      // Kandidáti v předdvoří a kolem budovy
      const candidates = [
        [prefBX, prefBZ],
        [prefBX, prefBZ + 1],
        [prefBX - 1, prefBZ],
        [prefBX + 1, prefBZ],
        [prefBX, prefBZ + 2],
        [pbx, pbz - entranceOffsetBlocks]
      ];

      let foundSafe = false;
      for (const [cxB, czB] of candidates) {
        const testWX = (cxB + 0.5) * s;
        const testWZ = (czB + 0.5) * s;
        for (let byTest = pby; byTest <= pby + 14; byTest++) {
          const testWY = (byTest + 1.04) * s;
          const hasFloor = (typeof vs === 'function') ? vs(cxB, byTest, czB) : true;
          if (hasFloor && isBoxFree(testWX, testWY, testWZ)) {
            finalX = testWX;
            finalY = testWY;
            finalZ = testWZ;
            foundSafe = true;
            break;
          }
        }
        if (foundSafe) break;
      }

      // Pokud by i přesto cokoliv kolidovalo, zvedat Y dokud není celý hitbox 100% volný
      let liftSteps = 0;
      while (!isBoxFree(finalX, finalY, finalZ) && liftSteps < 30) {
        finalY += s;
        liftSteps++;
      }

      pObj.x = finalX;
      pObj.y = finalY;
      pObj.z = finalZ;
      pObj.renderY = finalY;
      pObj.vx = 0;
      pObj.vy = 0;
      pObj.vz = 0;
      pObj.ground = true;
      pObj.isRolling = false;
      if (typeof isRolling !== 'undefined') isRolling = false;
      if (typeof resetAttackState === 'function') resetAttackState();

      // Natočení kamery a postavy čelem k budově (směrem -Z)
      if (typeof yaw !== 'undefined') yaw = 0;
      if (typeof face !== 'undefined') face = Math.PI;
      if (typeof model !== 'undefined' && model) {
        model.position.set(pObj.x, pObj.y, pObj.z);
        model.rotation.y = Math.PI;
      }

      if (typeof lastC !== 'undefined') lastC = '';
      if (typeof manage === 'function') manage();
      if (typeof pump === 'function') pump(45);
      if (typeof markExploredAroundPlayer === 'function') markExploredAroundPlayer();

      if (typeof window !== 'undefined' && typeof window.playDiscoveryChime === 'function') {
        window.playDiscoveryChime();
      }
      if (typeof window !== 'undefined' && typeof window.spawnLevelUpParticles === 'function') {
        window.spawnLevelUpParticles(pObj.x, pObj.y, pObj.z);
      }
      if (typeof window !== 'undefined' && window.networkManager && typeof window.networkManager.sendPlayerTransform === 'function') {
        window.networkManager.sendPlayerTransform();
      }
      if (typeof toast === 'function') {
        toast(`✨ Teleportováno k budově: ${poi.displayName || poi.name}!`);
      }
      return true;
    },

    // =========================================================================
    // Voxelové interaktivní prvky a osvětlení budov (100% složené z kostek!)
    // =========================================================================
    buildPOIMesh: function (poi) {
      if (poi.group) return poi.group;
      if (typeof THREE === 'undefined') return null;

      const s = (typeof S !== 'undefined') ? S : 0.5;
      const grp = new THREE.Group();
      // Umístění na střed bloku (bx + 0.5, bz + 0.5) a povrch podlahy budovy (by + 2)
      grp.position.set((poi.bx + 0.5) * s, (poi.by + 2) * s, (poi.bz + 0.5) * s);

      if (poi.type === 'Shrine') {
        // Vznášející se runový krystal a prstenec – 100% složený z voxelových kostek!
        const crystalGroup = new THREE.Group();
        crystalGroup.position.set(0, 2.25, 0);

        const voxSize = 0.16;
        const cubeGeo = new THREE.BoxGeometry(voxSize, voxSize, voxSize);
        const coreMat = new THREE.MeshLambertMaterial({ color: 0x38bdf8, emissive: 0x0284c7 });
        const innerMat = new THREE.MeshBasicMaterial({ color: 0xe0f2fe });
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x7dd3fc });

        // 1. Voxelový krystal (stupňovitý 3D diamant z kostek)
        for (let vy = -3; vy <= 3; vy++) {
          const maxSpan = 3 - Math.abs(vy);
          for (let vx = -maxSpan; vx <= maxSpan; vx++) {
            for (let vz = -maxSpan; vz <= maxSpan; vz++) {
              if (Math.abs(vx) + Math.abs(vz) <= maxSpan) {
                const isSurface = (Math.abs(vx) + Math.abs(vz) + Math.abs(vy) === 3);
                const isCenter = (vx === 0 && vy === 0 && vz === 0);
                if (!isSurface && !isCenter) continue;
                const m = new THREE.Mesh(cubeGeo, isCenter ? innerMat : coreMat);
                m.position.set(vx * voxSize, vy * voxSize, vz * voxSize);
                crystalGroup.add(m);
              }
            }
          }
        }

        // 2. Voxelový prstenec z kostek kolem krystalu
        const ringGroup = new THREE.Group();
        const ringCoords = [
          [0, 6], [2, 6], [4, 5], [5, 4], [6, 2],
          [6, 0], [6, -2], [5, -4], [4, -5], [2, -6],
          [0, -6], [-2, -6], [-4, -5], [-5, -4], [-6, -2],
          [-6, 0], [-6, 2], [-5, 4], [-4, 5], [-2, 6]
        ];
        const rVoxSize = 0.14;
        const rGeo = new THREE.BoxGeometry(rVoxSize, rVoxSize, rVoxSize);
        for (const [rx, ry] of ringCoords) {
          const rm = new THREE.Mesh(rGeo, ringMat);
          rm.position.set(rx * rVoxSize, ry * rVoxSize, 0);
          ringGroup.add(rm);
        }
        crystalGroup.add(ringGroup);

        const light = new THREE.PointLight(0x38bdf8, 1.5, 16);
        crystalGroup.add(light);

        grp.add(crystalGroup);
        poi.crystalGroup = crystalGroup;
        poi.crystalLight = light;
        poi.crystalBaseY = 2.25;

      } else if (poi.type === 'Ruins') {
        // Voxelová truhla uprostřed kamenných zřícenin
        this._buildChestGroup(grp, poi, 0, 0, 0);

      } else if (poi.type === 'Camp') {
        // Voxelová truhla se zásobami vedle stanu a světlo ohniště
        // V táboře je podlaha na úrovni (poi.by + 1) * s, proto y = -s
        const fireLight = new THREE.PointLight(0xf97316, 1.6, 18);
        fireLight.position.set(0, 0.5, 0);
        grp.add(fireLight);
        poi.fireLight = fireLight;
        poi.baseLightIntensity = 1.6;

        this._buildChestGroup(grp, poi, -1.2, -s, 0.8);

      } else if (poi.type === 'Chest') {
        // Voxelová truhla uprostřed kamenného pavilonu pokladnice
        this._buildChestGroup(grp, poi, 0, 0, 0);
        const vaultLight = new THREE.PointLight(0xfbbf24, 1.2, 12);
        vaultLight.position.set(0, 1.4, 0);
        grp.add(vaultLight);

      } else if (poi.type === 'Landmark') {
        // Světlo majáku na vrcholu voxelové strážní věže + truhla v přízemí věže
        const beaconLight = new THREE.PointLight(0xfbbf24, 2.2, 36);
        beaconLight.position.set(0, 16 * s, 0);
        grp.add(beaconLight);
        poi.fireLight = beaconLight;
        poi.baseLightIntensity = 2.2;

        this._buildChestGroup(grp, poi, 0, 0, -0.6);

      } else if (poi.type === 'DragonNestFire' || poi.type === 'DragonNestIce') {
        const isIce = (poi.type === 'DragonNestIce');
        // Voxelová dračí truhla s pokladem uprostřed hnízda
        this._buildChestGroup(grp, poi, 0, 0, 0);

        // Zářivé světlo hnízda (žhavé plameny nebo polární mráz)
        const nestLight = new THREE.PointLight(isIce ? 0x38bdf8 : 0xef4444, 2.2, 28);
        nestLight.position.set(0, 1.4, 0);
        grp.add(nestLight);
        poi.fireLight = nestLight;
        poi.baseLightIntensity = 2.2;
      }

      poi.group = grp;
      return grp;
    },

    _buildChestGroup: function (parentGroup, poi, ox = 0, oy = 0, oz = 0) {
      if (typeof THREE === 'undefined') return;

      const chestGroup = new THREE.Group();
      chestGroup.position.set(ox, oy, oz);

      const woodMat = new THREE.MeshLambertMaterial({ color: 0x78350f });
      const darkWoodMat = new THREE.MeshLambertMaterial({ color: 0x451a03 });
      const goldMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });

      // Spodní část truhly složená z voxelových dřevěných kvádrů a rohových sloupků
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.44, 0.56), woodMat);
      base.position.y = 0.22;
      chestGroup.add(base);

      for (const sx of [-0.4, 0.4]) {
        for (const sz of [-0.26, 0.26]) {
          const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.46, 0.1), darkWoodMat);
          post.position.set(sx, 0.23, sz);
          chestGroup.add(post);
        }
      }

      // Kloubové voxelové víko truhly
      const lidGroup = new THREE.Group();
      lidGroup.position.set(0, 0.45, -0.28);

      const lidLower = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.14, 0.60), woodMat);
      lidLower.position.set(0, 0.07, 0.28);
      lidGroup.add(lidLower);

      const lidUpper = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.10, 0.48), darkWoodMat);
      lidUpper.position.set(0, 0.18, 0.28);
      lidGroup.add(lidUpper);

      const latch = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.18, 0.08), goldMat);
      latch.position.set(0, 0.02, 0.60);
      lidGroup.add(latch);

      if (poi.opened) {
        lidGroup.rotation.x = -1.30;
      }

      chestGroup.add(lidGroup);
      parentGroup.add(chestGroup);
      poi.lidGroup = lidGroup;
    },

    update: function (dt, now, px, py, pz) {
      const s = (typeof S !== 'undefined') ? S : 0.5;
      const cs = (typeof CS !== 'undefined') ? CS : 16;
      const rd = (typeof RD !== 'undefined') ? RD : 8;

      const curCellX = Math.floor(px / (MACRO_L * s));
      const curCellZ = Math.floor(pz / (MACRO_L * s));
      const maxAttachDist = (rd + 1) * cs * s;
      const cullDist = (rd + 2) * cs * s;

      // Zkoumání 3x3 okolních macro-cells
      for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
          const poi = this.getPoiForCell(curCellX + dx, curCellZ + dz);
          if (!poi) continue;

          const d = Math.hypot(px - poi.wx, pz - poi.wz);

          // 1. Automatické odhalení až při skutečném přiblížení k budově (14 metrů = 28 bloků)
          if (d <= 14.0 && !this.isDiscovered(poi.id)) {
            this.discoverPOI(poi.id);
          }

          // 2. Připojení / Odpojení 3D modelu
          if (d <= maxAttachDist) {
            if (!poi.group) this.buildPOIMesh(poi);
            if (poi.group && !poi.attached && typeof scene !== 'undefined' && scene) {
              scene.add(poi.group);
              poi.attached = true;

              // Automatický spawn strážců POI (Goblins v táborech, Kostlivci v ruinách, Vlci u památek)
              const em = (typeof window !== 'undefined' && window.EntityManager) || (typeof EntityManager !== 'undefined' ? EntityManager : null);
              if (!poi.guardiansSpawned && em && typeof em.spawnCreature === 'function') {
                poi.guardiansSpawned = true;
                const calcLvl = (base) => (typeof em.computeScaledLevel === 'function') ? em.computeScaledLevel(poi.wx, poi.wz, base) : (base || 1);
                if (poi.type === 'Camp') {
                  em.spawnCreature('Goblin', poi.wx + 2.5, poi.wy + 1.0, poi.wz + 4.5, calcLvl(1));
                  em.spawnCreature('Goblin', poi.wx - 2.0, poi.wy + 1.0, poi.wz + 4.5, calcLvl(1));
                } else if (poi.type === 'Ruins') {
                  em.spawnCreature('Skeleton', poi.wx + 1.8, poi.wy + 1.0, poi.wz + 4.0, calcLvl(1));
                  em.spawnCreature('Skeleton', poi.wx - 1.5, poi.wy + 1.0, poi.wz + 4.0, calcLvl(2));
                } else if (poi.type === 'Landmark') {
                  em.spawnCreature('Wolf', poi.wx + 3.5, poi.wy + 1.0, poi.wz + 4.0, calcLvl(1));
                } else if (poi.type === 'DragonNestFire') {
                  const dragonTier = Math.min(5, Math.max(2, Math.floor(Math.random() * 3) + 2)); // Tier 2-4
                  em.spawnCreature('WyvernFire', poi.wx, poi.wy + 1.5, poi.wz, calcLvl(5), dragonTier);
                } else if (poi.type === 'DragonNestIce') {
                  const dragonTier = Math.min(5, Math.max(2, Math.floor(Math.random() * 3) + 2)); // Tier 2-4
                  em.spawnCreature('WyvernIce', poi.wx, poi.wy + 1.5, poi.wz, calcLvl(5), dragonTier);
                }
              }
            }
          } else if (d > cullDist && poi.attached && poi.group && typeof scene !== 'undefined' && scene) {
            scene.remove(poi.group);
            poi.attached = false;
          }

          // 3. Per-frame animace připojených POI
          if (poi.attached) {
            if (poi.crystalGroup) {
              poi.crystalGroup.rotation.y += dt * 1.5;
              poi.crystalGroup.position.y = poi.crystalBaseY + Math.sin(now * 0.003) * 0.12;
            }
            if (poi.fireLight) {
              poi.fireLight.intensity = poi.baseLightIntensity + Math.sin(now * 0.015) * 0.18 + (Math.random() - 0.5) * 0.05;
            }
            if (poi.lidGroup && Math.abs(poi.openAngle - poi.targetAngle) > 0.01) {
              if (typeof THREE !== 'undefined' && THREE.MathUtils) {
                poi.openAngle = THREE.MathUtils.lerp(poi.openAngle, poi.targetAngle, Math.min(1, dt * 8));
              } else {
                poi.openAngle = poi.targetAngle;
              }
              poi.lidGroup.rotation.x = -poi.openAngle;
            }
          }
        }
      }
    },

    interactClosest: function (px, py, pz) {
      const s = (typeof S !== 'undefined') ? S : 0.5;
      const curCellX = Math.floor(px / (MACRO_L * s));
      const curCellZ = Math.floor(pz / (MACRO_L * s));

      for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
          const poi = this.getPoiForCell(curCellX + dx, curCellZ + dz);
          if (!poi || !poi.attached) continue;

          const d = Math.hypot(px - poi.wx, pz - poi.wz);
          if (d <= 5.2) {
            if ((poi.type === 'Chest' || poi.type === 'Ruins' || poi.type === 'Camp' || poi.type === 'Landmark') && !poi.opened) {
              poi.opened = true;
              poi.targetAngle = 1.30;
              this.openedChests.add(poi.id);
              this.save();

              if (typeof toast === 'function') {
                toast(`🎁 Otevřena ${poi.displayName}! (+80 XP, Zlato & Předměty)`);
              }
              if (typeof window !== 'undefined' && typeof window.addPlayerXP === 'function') {
                window.addPlayerXP(80, poi.displayName);
              } else if (typeof P !== 'undefined') {
                P.xp = (P.xp || 0) + 80;
                if (typeof window.checkPlayerLevelUp === 'function') window.checkPlayerLevelUp();
              }

              // Odměny do inventáře
              if (typeof INV !== 'undefined' && Array.isArray(INV)) {
                const potion = INV.find(it => it.id === 'potion_hp');
                if (potion) potion.count = (potion.count || 0) + 2;
                const iron = INV.find(it => it.id === 'ore_iron');
                if (iron) iron.count = (iron.count || 0) + 3;
                const gold = INV.find(it => it.id === 'coin_gold' || it.id === 'gold');
                if (gold) gold.count = (gold.count || 0) + 40;
              }
              return true;
            } else if (poi.type === 'Shrine') {
              if (typeof P !== 'undefined' && typeof P.maxHp === 'number') {
                P.hp = P.maxHp;
                P.stamina = P.maxStamina || 100;
              }
              if (typeof G !== 'undefined') {
                G.hp = (typeof P !== 'undefined' ? P.maxHp : 100);
                G.st = 100;
              }
              if (poi.crystalLight) {
                poi.crystalLight.intensity = 3.5;
                setTimeout(() => { if (poi.crystalLight) poi.crystalLight.intensity = 1.4; }, 1200);
              }
              if (typeof toast === 'function') {
                toast(`✨ Prastará svatyně: Plné zdraví a stamina obnovena!`);
              }
              return true;
            }
          }
        }
      }
      return false;
    }
  };

  POIManager.init();

  if (typeof window !== 'undefined') {
    window.POIManager = POIManager;
  }
})();

