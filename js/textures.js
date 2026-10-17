// ---------- Textury (atlas 8x8, dlaždice 16 px, rozměr 128x128 px) ----------
const atlas = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  let s = 1337;
  const r = () => {
    s = (Math.imul(s ^ s >>> 15, 2246822519) + 1013904223) | 0;
    return ((s >>> 0) % 10000) / 10000;
  };
  const j = (b, a) => b + (r() - 0.5) * a;

  const tile = (t, fn) => {
    const tx = t & 7, ty = t >> 3;
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const p = fn(x, y);
        if (!p) continue;
        const a = p.length > 3 ? p[3] : 1;
        g.fillStyle = `rgba(${p[0] | 0},${p[1] | 0},${p[2] | 0},${a})`;
        g.fillRect(tx * 16 + x, ty * 16 + y, 1, 1);
      }
    }
  };

  const grass = () => [j(92, 20), j(172, 30), j(58, 14)];
  const dirt = () => {
    const k = r() < 0.1 ? 0.75 : 1;
    return [j(124, 22) * k, j(86, 18) * k, j(56, 14) * k];
  };

  // --- Základní terénní bloky (0–15) ---
  tile(0, grass);
  tile(1, (x, y) => (y < 3 + (r() < 0.45 ? 2 : 0) ? grass() : dirt()));
  tile(2, dirt);
  tile(3, () => {
    const v = j(128, 30) * (r() < 0.06 ? 0.7 : 1);
    return [v, v, v * 1.04];
  });
  tile(4, () => [j(226, 14), j(206, 14), j(150, 14)]);
  tile(5, () => [58, j(150, 12), j(215, 14)]);
  tile(6, (x) => {
    const k = x % 4 === 0 ? 0.78 : 1;
    return [j(112, 10) * k, j(78, 10) * k, j(44, 8) * k];
  });
  tile(7, () => (r() < 0.22 ? [30, j(94, 14), 32] : [j(58, 18), j(150, 34), j(48, 16)]));
  tile(8, () => [j(238, 10), j(245, 8), 255]);
  tile(9, () => (r() < 0.2 ? [170, 70, 28] : [j(220, 24), j(116, 30), j(34, 14)]));
  tile(10, () => (r() < 0.2 ? [210, 110, 150] : [j(244, 14), j(160, 26), j(192, 18)]));
  tile(11, () => (r() < 0.25 ? [255, 214, 70] : [j(255, 10), j(110, 50), 20]));
  tile(12, (x) => (x % 4 === 0 ? [40, 120, 50] : [j(70, 14), j(160, 24), j(70, 14)]));
  tile(13, () => (r() < 0.07 ? [200, 60, 20] : [j(52, 14), j(44, 10), j(50, 12)]));
  tile(14, () => (r() < 0.22 ? [18, j(60, 10), 30] : [j(34, 12), j(100, 24), j(56, 14)]));
  tile(15, (x, y) => (r() < 0.12 || (y % 5 === 2 && x % 3 === 0) ? [50, 46, 44] : [j(236, 10), j(232, 10), j(222, 10)]));

  // --- Nové detailní dlaždice (16–27) ---

  // Helper pro barevný gradient stébel trávy
  const grassCol = (y, tipCol) => {
    if (tipCol) return tipCol;
    if (y >= 13) return [j(60, 10), j(125, 14), j(40, 8)];  // Tmavší báze
    if (y >= 7)  return [j(85, 12), j(175, 16), j(50, 10)]; // Střední stéblo
    return [j(125, 14), j(215, 18), j(65, 12)];            // Zářivý vrcholek
  };

  // 16: Nízká tráva (krátký Minecraft trs trávy)
  tile(16, (x, y) => {
    const b1 = (x === 4 && y >= 11);
    const b2 = (x === 5 && y >= 9);
    const b3 = (x === 7 && y >= 7);
    const b4 = (x === 8 && y >= 8);
    const b5 = (x === 10 && y >= 9);
    const b6 = (x === 11 && y >= 11);
    const base = (x >= 6 && x <= 9 && y >= 13);
    if (b1 || b2 || b3 || b4 || b5 || b6 || base) {
      return grassCol(y);
    }
    return null;
  });

  // 17: Střední tráva (klasická Minecraft tráva se svislými a vějířovitými stébly)
  tile(17, (x, y) => {
    const bLeft = (x === 2 && y >= 7 && y <= 9) || (x === 3 && y >= 5 && y <= 8) || (x === 4 && y >= 4 && y <= 6) || (x === 5 && y >= 3 && y <= 5);
    const bMidL = (x === 6 && y >= 2 && y <= 14) || (x === 7 && y >= 1 && y <= 15);
    const bMidR = (x === 8 && y >= 2 && y <= 15) || (x === 9 && y >= 3 && y <= 14);
    const bRight = (x === 11 && y >= 4 && y <= 7) || (x === 12 && y >= 5 && y <= 9) || (x === 13 && y >= 8 && y <= 11);
    const bBase = (x >= 5 && x <= 10 && y >= 12);
    const bShoot = (x === 4 && y >= 9 && y <= 12) || (x === 11 && y >= 10 && y <= 13);
    if (bLeft || bMidL || bMidR || bRight || bBase || bShoot) {
      return grassCol(y);
    }
    return null;
  });

  // 18: Vysoká tráva (vysoká prérijní stébla s klásky jako v Minecraftu)
  tile(18, (x, y) => {
    const s1 = (x === 7 && y >= 1);
    const s2 = (x === 8 && y >= 0);
    const s3 = (x === 6 && y >= 3);
    const s4 = (x === 9 && y >= 3);
    const s5 = (x === 4 && y >= 5 && y <= 13) || (x === 3 && y >= 7 && y <= 11);
    const s6 = (x === 11 && y >= 4 && y <= 13) || (x === 12 && y >= 6 && y <= 11);
    const base = (x >= 5 && x <= 10 && y >= 12);

    if (s1 || s2 || s3 || s4 || s5 || s6 || base) {
      if (y <= 4 && (x >= 6 && x <= 9)) {
        return [j(225, 14), j(200, 14), j(100, 12)]; // Zlatavý klas
      }
      return grassCol(y);
    }
    return null;
  });

  // 19: Popadané listí – Lesní (zelené a hnědé dubové listí)
  tile(19, (x, y) => {
    const l1 = (Math.hypot(x - 4, y - 5) < 3.2 && (x + y) % 2 === 0);
    const l2 = (Math.hypot(x - 11, y - 6) < 2.8);
    const l3 = (Math.hypot(x - 6, y - 12) < 2.5);
    const l4 = (Math.hypot(x - 12, y - 12) < 3.1 && (x * y) % 3 !== 0);
    if (l1 || l3) return [j(85, 15), j(145, 20), j(42, 12)];
    if (l2 || l4) return [j(140, 20), j(105, 16), j(40, 10)];
    return null;
  });

  // 20: Popadané listí – Podzimní (zlatavé a oranžové listí)
  tile(20, (x, y) => {
    const l1 = (Math.hypot(x - 5, y - 6) < 3.2);
    const l2 = (Math.hypot(x - 11, y - 5) < 2.6);
    const l3 = (Math.hypot(x - 4, y - 12) < 2.8);
    const l4 = (Math.hypot(x - 12, y - 11) < 3.0);
    if (l1 || l4) return [j(235, 15), j(130, 20), j(32, 10)];
    if (l2) return [j(245, 10), j(190, 20), j(40, 10)];
    if (l3) return [j(205, 18), j(65, 15), j(28, 8)];
    return null;
  });

  // 21: Popadané listí – Sakurové (růžové okvětní lístky)
  tile(21, (x, y) => {
    const p1 = (Math.hypot(x - 4, y - 4) < 2.2);
    const p2 = (Math.hypot(x - 11, y - 6) < 2.0);
    const p3 = (Math.hypot(x - 6, y - 11) < 2.1);
    const p4 = (Math.hypot(x - 12, y - 12) < 2.4);
    const p5 = (Math.hypot(x - 8, y - 8) < 1.6);
    if (p1 || p3 || p5) return [j(250, 10), j(160, 15), j(195, 12)];
    if (p2 || p4) return [j(255, 8), j(195, 12), j(220, 10)];
    return null;
  });

  // 22: Kamínky (drobné zaoblené oblázky na zemi)
  tile(22, (x, y) => {
    const d1 = Math.hypot((x - 5) * 1.2, y - 6);
    if (d1 < 2.8) {
      const hi = (y <= 5 && x <= 5);
      return hi ? [175, 175, 170] : [j(115, 12), j(115, 12), j(112, 10)];
    }
    const d2 = Math.hypot((x - 11) * 1.1, y - 7);
    if (d2 < 2.4) {
      const hi = (y <= 6 && x <= 11);
      return hi ? [185, 180, 175] : [j(130, 14), j(125, 12), j(120, 10)];
    }
    const d3 = Math.hypot((x - 8) * 1.3, y - 12);
    if (d3 < 2.5) {
      const hi = (y <= 11 && x <= 8);
      return hi ? [165, 170, 175] : [j(95, 10), j(100, 12), j(105, 10)];
    }
    return null;
  });

  // 23: Balvan / Zvětralý kámen (plný blok s mechem a patinou)
  tile(23, (x, y) => {
    const isMoss = (r() < 0.28 && ((x + y) % 4 <= 1));
    if (isMoss) return [j(88, 14), j(138, 20), j(68, 14)];
    const v = j(118, 24) * (r() < 0.1 ? 0.8 : 1);
    return [v, v * 1.02, v * 0.98];
  });

  // 24: Keřík (husté listí s lesními plody)
  tile(24, (x, y) => {
    const isBerry = ((x % 5 === 2 && y % 5 === 2) || (x % 6 === 4 && y % 4 === 1)) && r() < 0.75;
    if (isBerry) return [j(225, 15), j(35, 15), j(45, 10)];
    return r() < 0.25 ? [j(45, 14), j(115, 20), j(40, 12)] : [j(70, 18), j(160, 28), j(55, 15)];
  });

  // 25: Lijány (visící liány z větví stromů)
  tile(25, (x, y) => {
    const cord1 = Math.abs(x - (4 + Math.sin(y * 0.6) * 1.5)) <= 0.8;
    const cord2 = Math.abs(x - (11 + Math.cos(y * 0.5) * 1.5)) <= 0.8;
    const leaf1 = (Math.hypot(x - 3, (y % 4) - 2) < 1.8 && (y % 4 <= 2));
    const leaf2 = (Math.hypot(x - 12, (y % 5) - 2) < 1.8 && (y % 5 <= 2));
    if (cord1 || cord2) return [j(55, 10), j(120, 16), j(45, 10)];
    if (leaf1 || leaf2) return [j(80, 15), j(165, 24), j(55, 14)];
    return null;
  });

  // 26: Lesní květiny (červený vlčí mák v Minecraft stylu na křížovém modelu)
  tile(26, (x, y) => {
    // Svislý zelený stonek
    if ((x === 7 || x === 8) && y >= 6) {
      return [j(65, 12), j(145, 16), j(45, 10)];
    }
    // Lístky na stonku
    if ((x === 6 && y === 11) || (x === 9 && y === 10) || (x === 5 && y === 12) || (x === 10 && y === 11)) {
      return [j(75, 12), j(160, 18), j(50, 10)];
    }
    // Květ na vrcholku
    const d = Math.hypot((x - 7.5) * 1.15, y - 4.5);
    if (d <= 2.8) {
      if (d <= 0.9) return [45, 35, 30]; // Střed květu
      return [j(235, 15), j(38, 12), j(45, 12)]; // Zářivě červený květ vlčího máku
    }
    return null;
  });

  // 27: Lesní houby (červená muchomůrka s tečkami v Minecraft stylu)
  tile(27, (x, y) => {
    // Bílý klobouček/noha uprostřed
    if ((x === 7 || x === 8) && y >= 9) {
      return (x === 7 && y % 2 === 0) ? [230, 225, 218] : [248, 245, 240];
    }
    // Klobouk muchomůrky
    if (x >= 4 && x <= 11 && y >= 5 && y <= 8) {
      if ((x === 4 || x === 11) && y === 5) return null;
      const isSpot = (x === 6 && y === 6) || (x === 9 && y === 6) || (x === 7 && y === 7);
      if (isSpot) return [255, 255, 255];
      return [j(225, 14), j(35, 10), j(35, 10)];
    }
    return null;
  });

  // 28: Žlutá pampeliška / pryskyřník (Minecraft pampeliška)
  tile(28, (x, y) => {
    if ((x === 7 || x === 8) && y >= 7) return [j(65, 12), j(145, 16), j(45, 10)];
    if ((x === 6 && y === 12) || (x === 9 && y === 11)) return [j(75, 12), j(160, 18), j(50, 10)];
    const d = Math.hypot((x - 7.5) * 1.1, y - 5);
    if (d <= 2.8) {
      if (d <= 0.8) return [230, 160, 15]; // Tmavší střed
      return [j(255, 8), j(215, 12), j(25, 8)]; // Zářivě žluté okvětní lístky
    }
    return null;
  });

  // 29: Modrá chrpa / orchidej (Minecraft modrá květina)
  tile(29, (x, y) => {
    if ((x === 7 || x === 8) && y >= 6) return [j(60, 10), j(140, 14), j(45, 10)];
    if ((x === 6 && y === 10) || (x === 9 && y === 12)) return [j(70, 10), j(150, 16), j(50, 10)];
    const d = Math.hypot((x - 7.5) * 1.15, y - 4);
    if (d <= 2.6) {
      if (d <= 0.7) return [70, 90, 200];
      return (x + y) % 2 === 0 ? [j(45, 10), j(145, 16), j(245, 10)] : [j(30, 10), j(180, 18), j(255, 8)];
    }
    return null;
  });

  // 30: Bílá kopretina (Minecraft bílá kopretina se žlutým středem)
  tile(30, (x, y) => {
    if ((x === 7 || x === 8) && y >= 7) return [j(65, 12), j(145, 16), j(45, 10)];
    if ((x === 6 && y === 11) || (x === 9 && y === 13)) return [j(75, 12), j(160, 18), j(50, 10)];
    const d = Math.hypot(x - 7.5, y - 5);
    if (d <= 2.7) {
      if (d <= 1.0) return [255, 205, 20]; // Zlatý střed
      return (x === 7 || y === 5 || d > 1.8) ? [250, 252, 255] : [230, 235, 245]; // Bílé lístky
    }
    return null;
  });

  // 31: Fialové allium / levandule (Minecraft fialová koule allia)
  tile(31, (x, y) => {
    if ((x === 7 || x === 8) && y >= 7) return [j(65, 12), j(145, 16), j(45, 10)];
    const d = Math.hypot(x - 7.5, y - 4);
    if (d <= 2.9) {
      if (d > 2.4 && (x + y) % 2 === 0) return null;
      return (x + y) % 2 === 0 ? [j(200, 15), j(75, 15), j(220, 15)] : [j(170, 15), j(50, 12), j(190, 15)];
    }
    return null;
  });

  // 32: Lesní kapradí (Minecraft kapradí)
  tile(32, (x, y) => {
    const isSpine = (x === 7 || x === 8) && y >= 2;
    const f1 = (y >= 4 && y <= 6 && Math.abs(x - 7.5) <= 2.5 && y - 4 === Math.floor(Math.abs(x - 7.5)));
    const f2 = (y >= 7 && y <= 10 && Math.abs(x - 7.5) <= 4.5 && y - 7 === Math.floor(Math.abs(x - 7.5) * 0.7));
    const f3 = (y >= 11 && y <= 14 && Math.abs(x - 7.5) <= 5.5 && y - 11 === Math.floor(Math.abs(x - 7.5) * 0.6));
    if (isSpine || f1 || f2 || f3) {
      const isTip = y <= 5 || Math.abs(x - 7.5) >= 3.5;
      return isTip ? [j(95, 12), j(195, 18), j(55, 10)] : [j(55, 10), j(140, 16), j(45, 8)];
    }
    return null;
  });

  // --- Architektonické bloky pro voxelové budovy (33–37) ---

  // 33: Opracované kamenné cihly (pro svatyně, věže a zříceniny)
  tile(33, (x, y) => {
    const row = (y >> 2);
    const mortarY = (y % 8 === 0 || y % 8 === 4);
    const offset = (row % 2 === 0) ? 0 : 4;
    const mortarX = ((x + offset) % 8 === 0);
    if (mortarY || mortarX) {
      return [j(110, 10), j(122, 10), j(138, 10)];
    }
    const bevel = (y % 4 === 1 || (x + offset) % 8 === 1) ? 1.07 : 0.96;
    return [j(168, 14) * bevel, j(182, 14) * bevel, j(202, 14) * bevel];
  });

  // 34: Dřevěná prkna (pro tábory, podlahy, lešení věží a bedny)
  tile(34, (x, y) => {
    const seamY = (y % 4 === 0);
    const seamX = ((x + (y >> 2) * 5) % 16 === 0);
    if (seamY || seamX) {
      return [j(92, 8), j(62, 8), j(34, 6)];
    }
    const grain = Math.sin(x * 0.7 + (y >> 2) * 1.9) * 8;
    return [j(158 + grain, 10), j(112 + grain * 0.7, 8), j(64 + grain * 0.4, 6)];
  });

  // 35: Zářivý runový krystal (azurový magický blok pro svatyně a lucerny)
  tile(35, (x, y) => {
    const cx = Math.abs(x - 7.5), cy = Math.abs(y - 7.5);
    const facet = cx + cy;
    if (facet < 3.2) return [224, 252, 255];
    if (facet < 6.5) return [j(95, 16), j(228, 14), 255];
    if (x === 0 || x === 15 || y === 0 || y === 15) return [24, 148, 210];
    return [j(56, 14), j(196, 16), j(248, 10)];
  });

  // 36: Tmavý oltářní čedič se zlatým/runovým lemováním
  tile(36, (x, y) => {
    const border = (x === 1 || x === 14 || y === 1 || y === 14);
    const rune = (Math.abs(x - 7.5) <= 2.5 && Math.abs(y - 7.5) <= 2.5 && ((x + y) % 2 === 0));
    if (border || rune) {
      return [j(245, 12), j(190, 14), j(42, 10)];
    }
    return [j(52, 10), j(64, 10), j(82, 12)];
  });

  // 37: Plátno stanu / Terakotová krytina (pro stany a střechy táborů)
  tile(37, (x, y) => {
    const stripe = ((x + y) % 8 === 0);
    if (stripe) return [j(145, 10), j(62, 8), j(24, 6)];
    return [j(196, 14), j(92, 12), j(36, 10)];
  });

  const t = new THREE.CanvasTexture(c);
  t.magFilter = t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  return t;
})();

const TILES = {
  1: [0, 1, 2],
  2: [2, 2, 2],
  3: [3, 3, 3],
  4: [4, 4, 4],
  5: [5, 5, 5],
  6: [6, 6, 6],
  7: [7, 7, 7],
  8: [8, 3, 3],
  9: [9, 9, 9],
  10: [10, 10, 10],
  11: [11, 11, 11],
  12: [12, 12, 12],
  13: [13, 13, 13],
  14: [14, 14, 14],
  15: [15, 15, 15],
  // Detaily:
  16: [16, 16, 16], // Nízká tráva
  17: [17, 17, 17], // Střední tráva
  18: [18, 18, 18], // Vysoká tráva
  19: [19, 19, 19], // Popadané listí lesní
  20: [20, 20, 20], // Popadané listí podzimní
  21: [21, 21, 21], // Popadané listí sakurové
  22: [22, 22, 22], // Kamínky
  23: [23, 23, 23], // Balvan / Zvětralý kámen
  24: [24, 24, 24], // Keřík
  25: [25, 25, 25], // Lijány
  26: [26, 26, 26], // Červený vlčí mák
  27: [27, 27, 27], // Muchomůrka
  28: [28, 28, 28], // Žlutá pampeliška
  29: [29, 29, 29], // Modrá chrpa
  30: [30, 30, 30], // Bílá kopretina
  31: [31, 31, 31], // Fialové allium
  32: [32, 32, 32], // Lesní kapradí
  // Architektonické bloky budov:
  33: [33, 33, 33], // Opracované kamenné cihly
  34: [34, 34, 34], // Dřevěná prkna
  35: [35, 35, 35], // Zářivý runový krystal
  36: [36, 36, 36], // Zlatem zdobený oltářní kámen
  37: [37, 37, 37]  // Plátno stanu / Terakota
};
