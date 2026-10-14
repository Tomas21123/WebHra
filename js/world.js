// ---------- Generování terénu a světa ----------
function height(x, z) {
  const wx = x + (fbm(x / 180 + 300, z / 180, 2) - 0.5) * 140;
  const wz = z + (fbm(x / 180, z / 180 + 300, 2) - 0.5) * 140;
  const c = fbm(wx / 440, wz / 440, 4);
  const m = sm(0.52, 0.8, fbm(wx / 600 + 500, wz / 600, 3));
  const d = fbm(x / 36, z / 36, 2);
  const r = Math.abs(fbm(wx / 400 + 800, wz / 400 + 800, 3) - 0.5);
  const o = sm(0.4, 0.28, fbm(wx / 700 + 3000, wz / 700, 3));
  const s = (28 + c * 40 + m * 68) / 12, f = Math.floor(s);
  let h = (28 + c * 40 + m * 68) * 0.35 + (f + sm(0.25, 0.75, s - f)) * 12 * 0.65 + d * 4;
  h += (1 - Math.abs(2 * vn(x / 50 + 7, z / 90) - 1)) * 8 * sm(0.55, 0.64, temp(x, z)) * sm(0.52, 0.4, hum(x, z));
  h += (SEA - 4 - h) * sm(0.034, 0.012, r) * (1 - m);
  h -= o * 38;

  // Neomezené vysokohorské štíty a hřebeny
  const ridge1 = 1 - Math.abs(fbm(wx / 240 + 700, wz / 240 + 700, 3) * 2 - 1);
  const ridge2 = 1 - Math.abs(fbm(wx / 95 + 350, wz / 95 + 350, 3) * 2 - 1);
  const alpine = sm(0.48, 0.84, fbm(wx / 850 + 1500, wz / 850 + 1500, 3));
  h += m * (ridge1 * 65 + Math.pow(ridge2, 2.2) * 60 + alpine * 100);

  return Math.max(2, Math.floor(h));
}

const temp = (x, z) => fbm(x / 600 + 2000, z / 600 + 2000, 2);
const hum = (x, z) => fbm(x / 560 + 4000, z / 560, 2);
const biome = (x, z, h) => {
  const t = temp(x, z) - Math.max(0, h - SEA - 8) * 0.0055 + (vn(x / 7, z / 7) - 0.5) * 0.05;
  const u = hum(x, z) + (vn(x / 9 + 5, z / 9) - 0.5) * 0.05;
  return t < 0.38 ? 2 : t > 0.6 ? (u > 0.5 ? 3 : 1) : 0;
};

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
            const l = (b === 11 || isCutout(b)) ? (isCutout(b) ? 1.05 * F.s * tint : 1.15) : AOV[a] * F.s * tint;
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
