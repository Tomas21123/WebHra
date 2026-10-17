// ---------- Voxelový svět — PvE Entity, AI & Bojový Systém (Milestone 2 - F6) ----------
(function () {
  'use strict';

  // Základní statistiky nestvůr a divokých zvířat
  const CREATURE_CONFIGS = {
    Wolf: {
      type: 'Wolf',
      aliases: ['wolf', 'creature_wolf', 'vlk', 'lesni vlk'],
      name: 'Lesní vlk',
      baseHp: 60,
      baseDamage: 14,
      speedChase: 6.8,
      speedWander: 2.2,
      aggroRadius: 15.0,
      attackReach: 2.5,
      attackCooldown: 1.4,
      hitboxRadius: 0.65,
      height: 0.8,
      xpBase: 25,
      goldBase: 5,
      color: 0x64748b,
      drops: [
        { id: 'wood', min: 1, max: 2, chance: 0.8 },
        { id: 'ore_iron', min: 1, max: 1, chance: 0.3 }
      ]
    },
    Goblin: {
      type: 'Goblin',
      aliases: ['goblin', 'creature_goblin', 'skret', 'skřet'],
      name: 'Skřet nájezdník',
      baseHp: 80,
      baseDamage: 18,
      speedChase: 5.4,
      speedWander: 2.0,
      aggroRadius: 15.0,
      attackReach: 2.5,
      attackCooldown: 1.2,
      hitboxRadius: 0.60,
      height: 1.3,
      xpBase: 25,
      goldBase: 5,
      color: 0x15803d,
      drops: [
        { id: 'ore_iron', min: 1, max: 2, chance: 0.8 },
        { id: 'wood', min: 2, max: 3, chance: 0.9 }
      ]
    },
    Skeleton: {
      type: 'Skeleton',
      aliases: ['skeleton', 'skeleton warrior', 'creature_skeleton_warrior', 'kostlivec', 'kostra'],
      name: 'Kostlivý válečník',
      baseHp: 100,
      baseDamage: 25,
      speedChase: 4.6,
      speedWander: 1.8,
      aggroRadius: 14.0,
      attackReach: 2.5,
      attackCooldown: 1.6,
      hitboxRadius: 0.70,
      height: 1.8,
      xpBase: 50,
      goldBase: 12,
      color: 0x94a3b8,
      drops: [
        { id: 'stone', min: 3, max: 5, chance: 0.95 },
        { id: 'ore_iron', min: 2, max: 3, chance: 0.75 },
        { id: 'wood', min: 2, max: 4, chance: 0.8 }
      ]
    },
    Golem: {
      type: 'Golem',
      aliases: ['golem', 'stone golem', 'creature_stone_golem', 'kamenny golem'],
      name: 'Kamenný golem',
      baseHp: 220,
      baseDamage: 45,
      speedChase: 3.0,
      speedWander: 1.4,
      aggroRadius: 18.0,
      attackReach: 3.4,
      attackCooldown: 2.4,
      hitboxRadius: 1.20,
      height: 2.6,
      xpBase: 150,
      goldBase: 30,
      color: 0x475569,
      drops: [
        { id: 'stone', min: 6, max: 12, chance: 1.0 },
        { id: 'ore_iron', min: 3, max: 5, chance: 0.9 }
      ]
    },

    // --- ZVÍŘATA K OCHOČENÍ (3 druhy psů, kočka, kráva, ovce, kozel, veverka) ---
    DogShepherd: {
      type: 'DogShepherd',
      aliases: ['dogshepherd', 'ovcak', 'nemecky ovcak', 'pes', 'dog', 'shepherd', 'vlcak'],
      name: 'Německý ovčák',
      isPassive: true,
      tameItem: 'tame_bone',
      tameItemName: 'Morková kost',
      petItemId: 'pet_dog_shepherd',
      rideSpeed: 9.8,
      jumpBoost: 10.2,
      mountHeight: 0.56,
      baseHp: 55,
      baseDamage: 0,
      speedChase: 5.5,
      speedWander: 2.3,
      aggroRadius: 0,
      attackReach: 0,
      attackCooldown: 2.0,
      hitboxRadius: 0.65,
      height: 0.82,
      xpBase: 30,
      goldBase: 2,
      color: 0xb45309,
      drops: [{ id: 'tame_bone', min: 1, max: 1, chance: 0.5 }]
    },
    DogHusky: {
      type: 'DogHusky',
      aliases: ['doghusky', 'husky', 'sibirsky husky', 'dog_husky', 'pes husky'],
      name: 'Sibiřský husky',
      isPassive: true,
      tameItem: 'tame_bone',
      tameItemName: 'Morková kost',
      petItemId: 'pet_dog_husky',
      rideSpeed: 10.6,
      jumpBoost: 10.5,
      mountHeight: 0.56,
      baseHp: 60,
      baseDamage: 0,
      speedChase: 6.0,
      speedWander: 2.5,
      aggroRadius: 0,
      attackReach: 0,
      attackCooldown: 2.0,
      hitboxRadius: 0.65,
      height: 0.82,
      xpBase: 35,
      goldBase: 3,
      color: 0x475569,
      drops: [{ id: 'tame_bone', min: 1, max: 1, chance: 0.5 }]
    },
    DogDachshund: {
      type: 'DogDachshund',
      aliases: ['dogdachshund', 'jezevcik', 'dachshund', 'dog_dachshund', 'pes jezevcik'],
      name: 'Jezevčík',
      isPassive: true,
      tameItem: 'tame_bone',
      tameItemName: 'Morková kost',
      petItemId: 'pet_dog_dachshund',
      rideSpeed: 8.8,
      jumpBoost: 9.6,
      mountHeight: 0.38,
      baseHp: 45,
      baseDamage: 0,
      speedChase: 4.8,
      speedWander: 2.1,
      aggroRadius: 0,
      attackReach: 0,
      attackCooldown: 2.0,
      hitboxRadius: 0.60,
      height: 0.62,
      xpBase: 30,
      goldBase: 2,
      color: 0x78350f,
      drops: [{ id: 'tame_bone', min: 1, max: 1, chance: 0.5 }]
    },
    Cat: {
      type: 'Cat',
      aliases: ['cat', 'kocka', 'kocicka', 'kotatko', 'kocka domaci'],
      name: 'Kočka domácí',
      isPassive: true,
      tameItem: 'tame_fish',
      tameItemName: 'Čerstvý losos',
      petItemId: 'pet_cat',
      rideSpeed: 9.5,
      jumpBoost: 11.4,
      mountHeight: 0.42,
      baseHp: 40,
      baseDamage: 0,
      speedChase: 5.5,
      speedWander: 2.4,
      aggroRadius: 0,
      attackReach: 0,
      attackCooldown: 2.0,
      hitboxRadius: 0.55,
      height: 0.65,
      xpBase: 30,
      goldBase: 2,
      color: 0xf97316,
      drops: [{ id: 'tame_fish', min: 1, max: 1, chance: 0.5 }]
    },
    Cow: {
      type: 'Cow',
      aliases: ['cow', 'krava', 'kravicka', 'strakata krava'],
      name: 'Strakatá kráva',
      isPassive: true,
      tameItem: 'tame_wheat',
      tameItemName: 'Zlatá pšenice',
      petItemId: 'pet_cow',
      rideSpeed: 8.4,
      jumpBoost: 9.4,
      mountHeight: 0.88,
      baseHp: 85,
      baseDamage: 0,
      speedChase: 4.0,
      speedWander: 1.5,
      aggroRadius: 0,
      attackReach: 0,
      attackCooldown: 2.0,
      hitboxRadius: 0.85,
      height: 1.15,
      xpBase: 30,
      goldBase: 3,
      color: 0xf8fafc,
      drops: [{ id: 'leather', min: 1, max: 2, chance: 0.9 }]
    },
    Sheep: {
      type: 'Sheep',
      aliases: ['sheep', 'ovce', 'ovecka', 'beran', 'chundelata ovce'],
      name: 'Chundelatá ovce',
      isPassive: true,
      tameItem: 'tame_clover',
      tameItemName: 'Sladký jetel',
      petItemId: 'pet_sheep',
      rideSpeed: 8.6,
      jumpBoost: 10.0,
      mountHeight: 0.68,
      baseHp: 65,
      baseDamage: 0,
      speedChase: 4.2,
      speedWander: 1.7,
      aggroRadius: 0,
      attackReach: 0,
      attackCooldown: 2.0,
      hitboxRadius: 0.72,
      height: 0.92,
      xpBase: 28,
      goldBase: 2,
      color: 0xf1f5f9,
      drops: [{ id: 'tame_clover', min: 1, max: 1, chance: 0.5 }]
    },
    Goat: {
      type: 'Goat',
      aliases: ['goat', 'kozel', 'koza', 'horsky kozel'],
      name: 'Horský kozel',
      isPassive: true,
      tameItem: 'tame_apple',
      altTameItem: 'apple',
      tameItemName: 'Horské jablko',
      petItemId: 'pet_goat',
      rideSpeed: 9.6,
      jumpBoost: 13.0,
      mountHeight: 0.70,
      baseHp: 70,
      baseDamage: 0,
      speedChase: 5.0,
      speedWander: 2.1,
      aggroRadius: 0,
      attackReach: 0,
      attackCooldown: 2.0,
      hitboxRadius: 0.70,
      height: 0.95,
      xpBase: 35,
      goldBase: 3,
      color: 0xd6d3d1,
      drops: [{ id: 'tame_apple', min: 1, max: 1, chance: 0.5 }]
    },
    Squirrel: {
      type: 'Squirrel',
      aliases: ['squirrel', 'veverka', 'vevericka', 'zrzava veverka'],
      name: 'Zrzavá veverka',
      isPassive: true,
      tameItem: 'tame_acorn',
      tameItemName: 'Dubový žalud',
      petItemId: 'pet_squirrel',
      rideSpeed: 10.4,
      jumpBoost: 12.2,
      mountHeight: 0.36,
      baseHp: 35,
      baseDamage: 0,
      speedChase: 6.2,
      speedWander: 2.8,
      aggroRadius: 0,
      attackReach: 0,
      attackCooldown: 2.0,
      hitboxRadius: 0.50,
      height: 0.58,
      xpBase: 35,
      goldBase: 2,
      color: 0xc2410c,
      drops: [{ id: 'tame_acorn', min: 1, max: 1, chance: 0.6 }]
    }
  };

  function stripDiacritics(str) {
    return String(str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/_/g, ' ').trim();
  }

  function resolveCreatureType(query) {
    if (!query) return null;
    const s = stripDiacritics(query);
    if (!s) return null;

    // 1. Přesná shoda typu, jména nebo aliasu
    for (const key in CREATURE_CONFIGS) {
      const cfg = CREATURE_CONFIGS[key];
      if (stripDiacritics(cfg.type) === s || stripDiacritics(cfg.name) === s) return cfg.type;
      if (cfg.aliases && cfg.aliases.some(a => stripDiacritics(a) === s)) return cfg.type;
    }

    // 2. Částečná shoda klíčových slov
    if (s.includes('husky')) return 'DogHusky';
    if (s.includes('jezevc') || s.includes('dachs')) return 'DogDachshund';
    if (s.includes('ovcak') || s.includes('shepherd') || s.includes('pes') || s.includes('dog')) return 'DogShepherd';
    if (s.includes('kock') || s.includes('cat') || s.includes('kot')) return 'Cat';
    if (s.includes('krav') || s.includes('cow')) return 'Cow';
    if (s.includes('ovc') || s.includes('sheep') || s.includes('beran')) return 'Sheep';
    if (s.includes('kozel') || s.includes('koza') || s.includes('goat')) return 'Goat';
    if (s.includes('veverk') || s.includes('squirrel')) return 'Squirrel';
    if (s.includes('wolf') || s.includes('vlk')) return 'Wolf';
    if (s.includes('goblin') || s.includes('skret')) return 'Goblin';
    if (s.includes('skel') || s.includes('kost')) return 'Skeleton';
    if (s.includes('golem')) return 'Golem';
    return null;
  }

  function normalizeCreatureType(type) {
    return resolveCreatureType(type) || 'Wolf';
  }

  // Výpočet přesné výšky horního povrchu terénu / kostky pod souřadnicemi (wx, wz)
  // Voxel na indexu h = height(bx, bz) zabírá prostor od h * S do (h + 1) * S,
  // takže jeho horní pochozí plocha je vždy (h + 1) * S!
  function getGroundSurfaceY(wx, wz, refY) {
    const s = (typeof S !== 'undefined') ? S : 0.5;
    const bx = Math.floor(wx / s);
    const bz = Math.floor(wz / s);
    let baseBlock = 48;
    if (typeof height === 'function') {
      baseBlock = height(bx, bz);
    }

    // Pokud existuje kolizní mapa kostek vs(bx, by, bz), zkontrolujeme i skutečné bloky (stavby, kameny, schody)
    if (typeof vs === 'function') {
      const startBy = (typeof refY === 'number' && Number.isFinite(refY))
        ? Math.floor(refY / s) + 2
        : baseBlock + 3;
      const minBy = Math.max(1, baseBlock - 3);
      for (let by = startBy; by >= minBy; by--) {
        if (vs(bx, by, bz) && !vs(bx, by + 1, bz)) {
          return (by + 1) * s;
        }
      }
    }

    return (baseBlock + 1) * s;
  }

  // Vzorkování povrchu pod celým půdorysem zvířete (zabraňuje zaboření předních/zadních tlapek do schodu)
  function getFootprintSurfaceY(wx, wz, radius = 0.22, refY) {
    const cY = getGroundSurfaceY(wx, wz, refY);
    const offsets = [
      [radius, 0], [-radius, 0], [0, radius], [0, -radius]
    ];
    let bestY = cY;
    for (let i = 0; i < offsets.length; i++) {
      const sampleY = getGroundSurfaceY(wx + offsets[i][0], wz + offsets[i][1], refY);
      // Zohlednit okolní schod, pokud je v dosahu běžného vykročení (max +0.65m)
      if (sampleY > bestY && sampleY - cY <= 0.65) {
        bestY = sampleY;
      }
    }
    return bestY;
  }

  // Sdílený 3D stavitel detailních modelů pro divoká zvířata, mazlíčky i monstra
  function buildCreatureVoxelGroup(type, limbMeshes, isTamedPet = false) {
    if (typeof THREE === 'undefined') return null;
    const root = new THREE.Group();
    limbMeshes.legs = [];
    limbMeshes.arms = [];
    limbMeshes.head = null;

    // Pomocná funkce pro přidání 4 kloubových nohou (pivot v kyčli/rameni nahoře + tlapka/kopýtko dole)
    // Spodek tlapky je v klidovém stavu přesně na y = 0.0 a při chůzi se obloukem zvedá NAD zem!
    const addFourLegs = (w, h, d, _legacyY, xOff, zFront, zBack, legMat, pawMat = null) => {
      const positions = [
        [-xOff, h, zFront], [xOff, h, zFront],
        [-xOff, h, zBack], [xOff, h, zBack]
      ];
      const footMat = pawMat || legMat;
      const pawH = Math.max(0.05, h * 0.24);
      const upperH = Math.max(0.06, h - pawH * 0.5);

      positions.forEach(pos => {
        const legPivot = new THREE.Group();
        legPivot.position.set(pos[0], pos[1], pos[2]);

        const upperLeg = new THREE.Mesh(new THREE.BoxGeometry(w, upperH, d), legMat);
        upperLeg.position.set(0, -upperH * 0.5, 0);
        legPivot.add(upperLeg);

        const paw = new THREE.Mesh(new THREE.BoxGeometry(w * 1.12, pawH, d * 1.24), footMat);
        paw.position.set(0, -h + pawH * 0.5, d * 0.10);
        legPivot.add(paw);

        root.add(legPivot);
        limbMeshes.legs.push(legPivot);
      });
    };

    // Pomocná funkce pro přidání 2 kloubových nohou (pro humanoidní moby: Goblin, Kostlivec, Golem)
    const addTwoLegs = (w, h, d, xOff, zOff, legMat, bootMat = null) => {
      const positions = [[-xOff, h, zOff], [xOff, h, zOff]];
      const footMat = bootMat || legMat;
      const bootH = Math.max(0.07, h * 0.22);
      const shinH = Math.max(0.10, h - bootH * 0.5);

      positions.forEach(pos => {
        const legPivot = new THREE.Group();
        legPivot.position.set(pos[0], pos[1], pos[2]);

        const shin = new THREE.Mesh(new THREE.BoxGeometry(w, shinH, d), legMat);
        shin.position.set(0, -shinH * 0.5, 0);
        legPivot.add(shin);

        const boot = new THREE.Mesh(new THREE.BoxGeometry(w * 1.14, bootH, d * 1.32), footMat);
        boot.position.set(0, -h + bootH * 0.5, d * 0.14);
        legPivot.add(boot);

        root.add(legPivot);
        limbMeshes.legs.push(legPivot);
      });
    };

    // Pomocná funkce pro výrazné 3D oči (bělmo + duhovka + zornička + odlesk + obočí)
    // Oči jsou předsazené před přední stěnu hlavy, takže nikdy nezaniknou v textuře hlavy!
    const addExpressiveEyes = (parent, zFront, yEye, xSep, irisHex, browHex = null, scale = 1.0, angryBrow = false) => {
      const scleraMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const irisMat = new THREE.MeshBasicMaterial({ color: irisHex });
      const pupilMat = new THREE.MeshBasicMaterial({ color: 0x09090b });
      const browMat = browHex !== null ? new THREE.MeshLambertMaterial({ color: browHex }) : null;

      const ew = 0.075 * scale;
      const eh = 0.075 * scale;
      const ed = 0.028;

      [-1, 1].forEach(side => {
        const ex = side * xSep;
        // 1. Bělmo
        const sclera = new THREE.Mesh(new THREE.BoxGeometry(ew, eh, ed), scleraMat);
        sclera.position.set(ex, yEye, zFront + 0.010);
        parent.add(sclera);

        // 2. Barevná duhovka
        const iris = new THREE.Mesh(new THREE.BoxGeometry(ew * 0.68, eh * 0.72, ed), irisMat);
        iris.position.set(ex + side * (-0.004 * scale), yEye, zFront + 0.018);
        parent.add(iris);

        // 3. Tmavá zornička
        const pupil = new THREE.Mesh(new THREE.BoxGeometry(ew * 0.38, eh * 0.46, ed), pupilMat);
        pupil.position.set(ex + side * (-0.005 * scale), yEye, zFront + 0.024);
        parent.add(pupil);

        // 4. Jiskřivý bílý odlesk v oku (catchlight)
        const shine = new THREE.Mesh(new THREE.BoxGeometry(ew * 0.22, eh * 0.22, ed), scleraMat);
        shine.position.set(ex + side * (0.012 * scale), yEye + eh * 0.18, zFront + 0.028);
        parent.add(shine);

        // 5. Obočí / nadočnicový oblouk
        if (browMat) {
          const brow = new THREE.Mesh(new THREE.BoxGeometry(ew * 1.18, eh * 0.32, ed * 1.3), browMat);
          brow.position.set(ex, yEye + eh * 0.64, zFront + 0.015);
          if (angryBrow) brow.rotation.z = side * 0.22;
          parent.add(brow);
        }
      });
    };

    if (type === 'Wolf') {
      // Divoký lesní vlk: břidlicová srst, tmavá naježená hříva, jantarové oči a vyceněné tesáky
      const bodyMat = new THREE.MeshLambertMaterial({ color: 0x475569 });
      const maneMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
      const bellyMat = new THREE.MeshLambertMaterial({ color: 0x94a3b8 });
      const noseMat = new THREE.MeshBasicMaterial({ color: 0x09090b });
      const fangMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });

      const body = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.42, 0.88), bodyMat);
      body.position.set(0, 0.56, -0.02);
      root.add(body);

      const belly = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.16, 0.80), bellyMat);
      belly.position.set(0, 0.38, -0.02);
      root.add(belly);

      // Mohutná vlčí hříva kolem krku a ramen
      const mane = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.48, 0.36), maneMat);
      mane.position.set(0, 0.62, 0.28);
      root.add(mane);

      const headGrp = new THREE.Group();
      headGrp.position.set(0, 0.72, 0.54);
      root.add(headGrp);
      limbMeshes.head = headGrp;

      const head = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.34, 0.36), bodyMat);
      headGrp.add(head);

      const cheekFurL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.20, 0.22), bellyMat);
      cheekFurL.position.set(-0.20, -0.05, 0.02);
      const cheekFurR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.20, 0.22), bellyMat);
      cheekFurR.position.set(0.20, -0.05, 0.02);
      headGrp.add(cheekFurL); headGrp.add(cheekFurR);

      // Čenich, čumáček a tesáky
      const snout = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.26), maneMat);
      snout.position.set(0, -0.05, 0.28);
      headGrp.add(snout);

      const lowerJaw = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.07, 0.22), bellyMat);
      lowerJaw.position.set(0, -0.14, 0.25);
      headGrp.add(lowerJaw);

      const nose = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.08, 0.07), noseMat);
      nose.position.set(0, 0.01, 0.41);
      headGrp.add(nose);

      const fangL = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.06, 0.03), fangMat);
      fangL.position.set(-0.07, -0.11, 0.34);
      const fangR = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.06, 0.03), fangMat);
      fangR.position.set(0.07, -0.11, 0.34);
      headGrp.add(fangL); headGrp.add(fangR);

      // Jantarově žluté dravčí oči se zamračeným obočím
      addExpressiveEyes(headGrp, 0.18, 0.05, 0.105, 0xf59e0b, 0x0f172a, 1.0, true);

      // Špičaté uši s vnitřkem
      [-1, 1].forEach(s => {
        const ear = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.18, 0.08), maneMat);
        ear.position.set(s * 0.12, 0.24, -0.02);
        const earIn = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.11, 0.03), bellyMat);
        earIn.position.set(s * 0.12, 0.23, 0.025);
        headGrp.add(ear); headGrp.add(earIn);
      });

      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 0.44), maneMat);
      tail.position.set(0, 0.56, -0.60);
      tail.rotation.x = -0.35;
      root.add(tail);
      limbMeshes.tail = tail;

      addFourLegs(0.12, 0.38, 0.12, 0.19, 0.16, 0.30, -0.30, bodyMat, maneMat);

    } else if (type === 'DogShepherd') {
      // Německý ovčák: zlatohnědá srst s černým sedlem, výrazné oči, vyplazený růžový jazyk a obojek se známkou
      const tanMat = new THREE.MeshLambertMaterial({ color: 0xd97706 });
      const creamMat = new THREE.MeshLambertMaterial({ color: 0xfde68a });
      const darkMat = new THREE.MeshLambertMaterial({ color: 0x1c1917 });
      const pinkMat = new THREE.MeshBasicMaterial({ color: 0xfb7185 });
      const noseMat = new THREE.MeshBasicMaterial({ color: 0x09090b });
      const collarMat = new THREE.MeshBasicMaterial({ color: isTamedPet ? 0xef4444 : 0x991b1b });
      const goldMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });

      const body = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.40, 0.88), tanMat);
      body.position.set(0, 0.54, 0);
      root.add(body);

      const chest = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.34, 0.28), creamMat);
      chest.position.set(0, 0.50, 0.34);
      root.add(chest);

      const saddleCoat = new THREE.Mesh(new THREE.BoxGeometry(0.49, 0.24, 0.62), darkMat);
      saddleCoat.position.set(0, 0.64, -0.04);
      root.add(saddleCoat);

      // Obojek se zlatou psí známkou
      const collar = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.10, 0.14), collarMat);
      collar.position.set(0, 0.62, 0.38);
      root.add(collar);
      const tag = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.08, 0.05), goldMat);
      tag.position.set(0, 0.53, 0.46);
      root.add(tag);

      const headGrp = new THREE.Group();
      headGrp.position.set(0, 0.74, 0.50);
      root.add(headGrp);
      limbMeshes.head = headGrp;

      const head = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.34, 0.36), tanMat);
      headGrp.add(head);

      const foreheadPatch = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.10, 0.30), darkMat);
      foreheadPatch.position.set(0, 0.14, -0.01);
      headGrp.add(foreheadPatch);

      // Čenich, čumáček a vyplazený růžový jazyk
      const snout = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.15, 0.26), darkMat);
      snout.position.set(0, -0.04, 0.27);
      headGrp.add(snout);

      const lowerJaw = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 0.22), tanMat);
      lowerJaw.position.set(0, -0.13, 0.24);
      headGrp.add(lowerJaw);

      const tongue = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.10), pinkMat);
      tongue.position.set(0, -0.12, 0.34);
      tongue.rotation.x = 0.25;
      headGrp.add(tongue);

      const nose = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.08, 0.06), noseMat);
      nose.position.set(0, 0.02, 0.40);
      headGrp.add(nose);

      // Výrazné hnědo-zlaté psí oči s obočím
      addExpressiveEyes(headGrp, 0.18, 0.05, 0.10, 0x92400e, 0x1c1917, 1.0, false);

      // Vysoké špičaté ovčácké uši s růžovým vnitřkem
      [-1, 1].forEach(s => {
        const ear = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.20, 0.08), darkMat);
        ear.position.set(s * 0.12, 0.25, -0.02);
        const earIn = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.13, 0.03), pinkMat);
        earIn.position.set(s * 0.12, 0.24, 0.025);
        headGrp.add(ear); headGrp.add(earIn);
      });

      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.44), darkMat);
      tail.position.set(0, 0.54, -0.58);
      tail.rotation.x = -0.30;
      root.add(tail);
      limbMeshes.tail = tail;

      addFourLegs(0.12, 0.36, 0.12, 0.18, 0.15, 0.30, -0.30, tanMat, darkMat);

    } else if (type === 'DogHusky') {
      // Sibiřský husky: sněhově bílý kožich, břidlicový hřbet, jasně ledově modré oči a huňatý zatočený ocas
      const greyMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
      const whiteMat = new THREE.MeshLambertMaterial({ color: 0xf8fafc });
      const pinkMat = new THREE.MeshBasicMaterial({ color: 0xfb7185 });
      const noseMat = new THREE.MeshBasicMaterial({ color: 0x09090b });
      const collarMat = new THREE.MeshBasicMaterial({ color: 0x0284c7 });

      const body = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.40, 0.88), whiteMat);
      body.position.set(0, 0.54, 0);
      root.add(body);

      const backFur = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.24, 0.86), greyMat);
      backFur.position.set(0, 0.64, -0.01);
      root.add(backFur);

      const neckRuff = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.38, 0.26), whiteMat);
      neckRuff.position.set(0, 0.56, 0.34);
      root.add(neckRuff);

      const collar = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.09, 0.14), collarMat);
      collar.position.set(0, 0.62, 0.39);
      root.add(collar);

      const headGrp = new THREE.Group();
      headGrp.position.set(0, 0.75, 0.52);
      root.add(headGrp);
      limbMeshes.head = headGrp;

      const head = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.34, 0.36), greyMat);
      headGrp.add(head);

      // Bílé tváře huskyho masky
      const faceMask = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.22, 0.04), whiteMat);
      faceMask.position.set(0, -0.04, 0.17);
      headGrp.add(faceMask);

      // Čenich a čumáček
      const snout = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.15, 0.24), whiteMat);
      snout.position.set(0, -0.05, 0.27);
      headGrp.add(snout);

      const snoutBridge = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.05, 0.20), greyMat);
      snoutBridge.position.set(0, 0.02, 0.25);
      headGrp.add(snoutBridge);

      const nose = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.08, 0.06), noseMat);
      nose.position.set(0, 0.01, 0.39);
      headGrp.add(nose);

      const tongue = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.04, 0.09), pinkMat);
      tongue.position.set(0, -0.13, 0.32);
      headGrp.add(tongue);

      // Pronikavé ledově modré oči (předsazené před masku!)
      addExpressiveEyes(headGrp, 0.19, 0.05, 0.105, 0x38bdf8, 0x1e293b, 1.02, false);

      // Chlupaté trojúhelníkové uši
      [-1, 1].forEach(s => {
        const ear = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.18, 0.08), greyMat);
        ear.position.set(s * 0.12, 0.24, -0.02);
        const earIn = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.11, 0.03), whiteMat);
        earIn.position.set(s * 0.12, 0.23, 0.025);
        headGrp.add(ear); headGrp.add(earIn);
      });

      // Zatočený huňatý ocas nahoru
      const tailGrp = new THREE.Group();
      tailGrp.position.set(0, 0.62, -0.44);
      const tailBase = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.28, 0.18), greyMat);
      tailBase.position.set(0, 0.10, -0.04);
      const tailTip = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.18, 0.20), whiteMat);
      tailTip.position.set(0, 0.24, 0.04);
      tailGrp.add(tailBase); tailGrp.add(tailTip);
      root.add(tailGrp);
      limbMeshes.tail = tailGrp;

      addFourLegs(0.12, 0.36, 0.12, 0.18, 0.15, 0.30, -0.30, whiteMat, whiteMat);

    } else if (type === 'DogDachshund') {
      // Jezevčík: dlouhé kaštanové tělíčko, tříslové bříško a tlapky, velké věrné oči a dlouhé plandavé uši
      const brownMat = new THREE.MeshLambertMaterial({ color: 0x78350f });
      const earMat = new THREE.MeshLambertMaterial({ color: 0x451a03 });
      const tanMat = new THREE.MeshLambertMaterial({ color: 0xd97706 });
      const noseMat = new THREE.MeshBasicMaterial({ color: 0x09090b });
      const collarMat = new THREE.MeshBasicMaterial({ color: 0x16a34a });

      const body = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.28, 1.06), brownMat);
      body.position.set(0, 0.34, 0);
      root.add(body);

      const belly = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.98), tanMat);
      belly.position.set(0, 0.22, 0.02);
      root.add(belly);

      const collar = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 0.12), collarMat);
      collar.position.set(0, 0.42, 0.48);
      root.add(collar);

      const headGrp = new THREE.Group();
      headGrp.position.set(0, 0.50, 0.58);
      root.add(headGrp);
      limbMeshes.head = headGrp;

      const head = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.26, 0.32), brownMat);
      headGrp.add(head);

      // Dlouhý čumáček jezevčíka s černým nosem
      const snout = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.13, 0.26), brownMat);
      snout.position.set(0, -0.03, 0.26);
      headGrp.add(snout);

      const snoutTan = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.07, 0.22), tanMat);
      snoutTan.position.set(0, -0.07, 0.24);
      headGrp.add(snoutTan);

      const nose = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.07, 0.06), noseMat);
      nose.position.set(0, 0.01, 0.39);
      headGrp.add(nose);

      // Velké roztomilé psí oči s tříslovým obočím (typické pro jezevčíky)
      addExpressiveEyes(headGrp, 0.16, 0.04, 0.085, 0x78350f, 0xf59e0b, 0.92, false);

      // Dlouhé visící plandavé uši podél hlavy
      [-1, 1].forEach(s => {
        const ear = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.24, 0.16), earMat);
        ear.position.set(s * 0.17, -0.03, -0.02);
        ear.rotation.z = s * (-0.12);
        headGrp.add(ear);
      });

      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.08, 0.34), brownMat);
      tail.position.set(0, 0.42, -0.64);
      tail.rotation.x = 0.35;
      root.add(tail);
      limbMeshes.tail = tail;

      addFourLegs(0.10, 0.20, 0.10, 0.10, 0.13, 0.38, -0.38, brownMat, tanMat);

    } else if (type === 'Cat') {
      // Mourovatá kočka: zrzavý kožíšek s pruhy, bílá náprsenka a tlapky, smaragdově zelené oči, růžový čumáček a vousky
      const gingerMat = new THREE.MeshLambertMaterial({ color: 0xf97316 });
      const stripeMat = new THREE.MeshLambertMaterial({ color: 0x9a3412 });
      const creamMat = new THREE.MeshLambertMaterial({ color: 0xfff7ed });
      const pinkMat = new THREE.MeshBasicMaterial({ color: 0xfb7185 });

      const body = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.26, 0.68), gingerMat);
      body.position.set(0, 0.37, 0);
      root.add(body);

      const chestBib = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.18), creamMat);
      chestBib.position.set(0, 0.35, 0.28);
      root.add(chestBib);

      // Mourovaté pruhy na hřbetě
      [-0.18, 0.0, 0.18].forEach(zPos => {
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.14, 0.09), stripeMat);
        stripe.position.set(0, 0.45, zPos);
        root.add(stripe);
      });

      const headGrp = new THREE.Group();
      headGrp.position.set(0, 0.54, 0.38);
      root.add(headGrp);
      limbMeshes.head = headGrp;

      const head = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.26, 0.28), gingerMat);
      headGrp.add(head);

      const foreheadStripe = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.16), stripeMat);
      foreheadStripe.position.set(0, 0.10, 0.06);
      headGrp.add(foreheadStripe);

      // Nadýchané bílé polštářky čumáku, růžový nosík a bílé vousky
      const muzzleL = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.08), creamMat);
      muzzleL.position.set(-0.045, -0.05, 0.15);
      const muzzleR = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.08), creamMat);
      muzzleR.position.set(0.045, -0.05, 0.15);
      headGrp.add(muzzleL); headGrp.add(muzzleR);

      const nose = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.05), pinkMat);
      nose.position.set(0, -0.01, 0.19);
      headGrp.add(nose);

      // 3D kočičí vousky po stranách
      [-1, 1].forEach(s => {
        const w1 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.018, 0.018), creamMat);
        w1.position.set(s * 0.14, -0.03, 0.15);
        w1.rotation.z = s * 0.12;
        const w2 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.018, 0.018), creamMat);
        w2.position.set(s * 0.14, -0.06, 0.15);
        w2.rotation.z = s * (-0.10);
        headGrp.add(w1); headGrp.add(w2);
      });

      // Velké smaragdově zelené kočičí oči
      addExpressiveEyes(headGrp, 0.14, 0.04, 0.085, 0x22c55e, 0x9a3412, 0.95, false);

      // Špičatá ouška s růžovým vnitřkem
      [-1, 1].forEach(s => {
        const ear = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.12, 0.06), stripeMat);
        ear.position.set(s * 0.10, 0.18, 0.0);
        const earIn = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.03), pinkMat);
        earIn.position.set(s * 0.10, 0.17, 0.025);
        headGrp.add(ear); headGrp.add(earIn);
      });

      // Dlouhý vztyčený ocas s bílou špičkou
      const tailGrp = new THREE.Group();
      tailGrp.position.set(0, 0.46, -0.34);
      const tailMain = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.34, 0.07), gingerMat);
      tailMain.position.set(0, 0.15, -0.04);
      const tailTip = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.12, 0.075), creamMat);
      tailTip.position.set(0, 0.35, -0.06);
      tailGrp.add(tailMain); tailGrp.add(tailTip);
      tailGrp.rotation.x = -0.22;
      root.add(tailGrp);
      limbMeshes.tail = tailGrp;

      addFourLegs(0.08, 0.24, 0.08, 0.12, 0.11, 0.24, -0.24, gingerMat, creamMat);

    } else if (type === 'Cow') {
      // Strakatá kráva: bílé tělo s černými skvrnami, vemínko, zvonec na krku, velké oči, růžový čumák s nozdrami a rohy
      const whiteMat = new THREE.MeshLambertMaterial({ color: 0xf8fafc });
      const spotMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
      const pinkMat = new THREE.MeshLambertMaterial({ color: 0xfda4af });
      const nostrilMat = new THREE.MeshBasicMaterial({ color: 0x4c0519 });
      const hornMat = new THREE.MeshLambertMaterial({ color: 0xe7e5e4 });
      const bellMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
      const strapMat = new THREE.MeshLambertMaterial({ color: 0x78350f });

      const body = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.58, 1.18), whiteMat);
      body.position.set(0, 0.71, 0);
      root.add(body);

      // Černé holštýnské skvrny
      const spot1 = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.34, 0.44), spotMat);
      spot1.position.set(0, 0.80, 0.20);
      const spot2 = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.32, 0.38), spotMat);
      spot2.position.set(0, 0.68, -0.32);
      const spot3 = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.18, 0.50), spotMat);
      spot3.position.set(0.18, 0.92, -0.05);
      root.add(spot1); root.add(spot2); root.add(spot3);

      // Růžové vemínko pod břichem
      const udder = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.12, 0.32), pinkMat);
      udder.position.set(0, 0.38, -0.22);
      root.add(udder);

      // Řemen a zlatý kravský zvonec na krku
      const strap = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.46, 0.10), strapMat);
      strap.position.set(0, 0.74, 0.54);
      const bell = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 0.12), bellMat);
      bell.position.set(0, 0.46, 0.58);
      root.add(strap); root.add(bell);

      const headGrp = new THREE.Group();
      headGrp.position.set(0, 0.92, 0.72);
      root.add(headGrp);
      limbMeshes.head = headGrp;

      const head = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.42, 0.42), spotMat);
      headGrp.add(head);

      // Bílá lysinka uprostřed čela
      const blaze = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.26, 0.04), whiteMat);
      blaze.position.set(0, 0.06, 0.20);
      headGrp.add(blaze);

      // Velký růžový kravský čumák s tmavými nozdrami
      const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.22, 0.18), pinkMat);
      muzzle.position.set(0, -0.09, 0.26);
      headGrp.add(muzzle);

      [-1, 1].forEach(s => {
        const nostril = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.04), nostrilMat);
        nostril.position.set(s * 0.10, -0.07, 0.34);
        headGrp.add(nostril);
      });

      // Velké výrazné kravské oči
      addExpressiveEyes(headGrp, 0.21, 0.08, 0.14, 0x451a03, 0x0f172a, 1.15, false);

      // Odstávající uši a zahnuté rohy
      [-1, 1].forEach(s => {
        const ear = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.10, 0.08), spotMat);
        ear.position.set(s * 0.30, 0.10, 0.02);
        const earIn = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.03), pinkMat);
        earIn.position.set(s * 0.30, 0.10, 0.055);
        const horn = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.20, 0.08), hornMat);
        horn.position.set(s * 0.20, 0.27, -0.02);
        horn.rotation.z = s * (-0.20);
        headGrp.add(ear); headGrp.add(earIn); headGrp.add(horn);
      });

      // Ocas se střapcem
      const tailGrp = new THREE.Group();
      tailGrp.position.set(0, 0.86, -0.58);
      const tailRod = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.42, 0.07), whiteMat);
      tailRod.position.set(0, -0.18, -0.04);
      const tailTuft = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.14, 0.11), spotMat);
      tailTuft.position.set(0, -0.40, -0.04);
      tailGrp.add(tailRod); tailGrp.add(tailTuft);
      tailGrp.rotation.x = 0.15;
      root.add(tailGrp);
      limbMeshes.tail = tailGrp;

      addFourLegs(0.16, 0.42, 0.16, 0.21, 0.24, 0.40, -0.40, whiteMat, spotMat);

    } else if (type === 'Sheep') {
      // Horská ovce: nadýchané vrstvené rouno, tmavý obličej s velkýma očima, růžový čumáček a ouška
      const woolMat = new THREE.MeshLambertMaterial({ color: 0xf8fafc });
      const woolShadeMat = new THREE.MeshLambertMaterial({ color: 0xe2e8f0 });
      const faceMat = new THREE.MeshLambertMaterial({ color: 0x44403c });
      const hoofMat = new THREE.MeshLambertMaterial({ color: 0x1c1917 });
      const pinkMat = new THREE.MeshBasicMaterial({ color: 0xfda4af });

      // Vícevrstvé chundelaté rouno (vypadá jako nadýchaný obláček)
      const woolCore = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.52, 0.94), woolMat);
      woolCore.position.set(0, 0.60, 0);
      const woolTop = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.14, 0.84), woolShadeMat);
      woolTop.position.set(0, 0.89, -0.02);
      const woolSides = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.40, 0.80), woolShadeMat);
      woolSides.position.set(0, 0.60, 0);
      const woolChest = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.42, 0.16), woolMat);
      woolChest.position.set(0, 0.58, 0.48);
      root.add(woolCore); root.add(woolTop); root.add(woolSides); root.add(woolChest);

      const headGrp = new THREE.Group();
      headGrp.position.set(0, 0.76, 0.58);
      root.add(headGrp);
      limbMeshes.head = headGrp;

      const head = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.34, 0.36), faceMat);
      headGrp.add(head);

      // Chundelatá čepička z vlny na hlavě
      const woolCap = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.34), woolMat);
      woolCap.position.set(0, 0.18, -0.02);
      headGrp.add(woolCap);

      // Čumáček
      const snout = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.12), faceMat);
      snout.position.set(0, -0.06, 0.20);
      const nose = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.07, 0.05), pinkMat);
      nose.position.set(0, -0.03, 0.26);
      headGrp.add(snout); headGrp.add(nose);

      // Velké roztomilé ovčí oči
      addExpressiveEyes(headGrp, 0.18, 0.04, 0.11, 0x1c1917, 0xf8fafc, 1.05, false);

      // Vodorovné ovčí uši
      [-1, 1].forEach(s => {
        const ear = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.07), faceMat);
        ear.position.set(s * 0.23, 0.04, 0.0);
        ear.rotation.z = s * (-0.25);
        headGrp.add(ear);
      });

      const woolTail = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 0.18), woolMat);
      woolTail.position.set(0, 0.64, -0.52);
      root.add(woolTail);
      limbMeshes.tail = woolTail;

      addFourLegs(0.12, 0.34, 0.12, 0.17, 0.20, 0.32, -0.32, faceMat, hoofMat);

    } else if (type === 'Goat') {
      // Horský kozel: šedohnědé tělo, tmavý hřbetní pruh, dlouhá bílá bradka, jantarové oči a mohutné zahnuté rohy
      const coatMat = new THREE.MeshLambertMaterial({ color: 0xa8a29e });
      const bellyMat = new THREE.MeshLambertMaterial({ color: 0xf5f5f4 });
      const darkMat = new THREE.MeshLambertMaterial({ color: 0x44403c });
      const hornMat = new THREE.MeshLambertMaterial({ color: 0x57534e });
      const beardMat = new THREE.MeshLambertMaterial({ color: 0xffffff });

      const body = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.46, 0.90), coatMat);
      body.position.set(0, 0.59, 0);
      root.add(body);

      const belly = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.16, 0.84), bellyMat);
      belly.position.set(0, 0.40, 0);
      const dorsalStripe = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 0.88), darkMat);
      dorsalStripe.position.set(0, 0.83, 0);
      root.add(belly); root.add(dorsalStripe);

      const headGrp = new THREE.Group();
      headGrp.position.set(0, 0.86, 0.52);
      root.add(headGrp);
      limbMeshes.head = headGrp;

      const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.38), coatMat);
      headGrp.add(head);

      const snout = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.18), coatMat);
      snout.position.set(0, -0.05, 0.24);
      const nose = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.05), darkMat);
      nose.position.set(0, -0.02, 0.33);
      headGrp.add(snout); headGrp.add(nose);

      // Dlouhá bílá kozlí bradka
      const beard = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.24, 0.12), beardMat);
      beard.position.set(0, -0.24, 0.20);
      beard.rotation.x = 0.18;
      headGrp.add(beard);

      // Zlatavé kozlí oči
      addExpressiveEyes(headGrp, 0.19, 0.06, 0.105, 0xfacc15, 0x44403c, 1.0, false);

      // Uši a dvoudílné mohutné zahnuté horské rohy (ibex)
      [-1, 1].forEach(s => {
        const ear = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.07, 0.07), coatMat);
        ear.position.set(s * 0.22, 0.06, -0.02);

        const hornBase = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.26, 0.11), hornMat);
        hornBase.position.set(s * 0.11, 0.26, -0.04);
        hornBase.rotation.x = -0.38;
        hornBase.rotation.z = s * (-0.12);

        const hornTip = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.24, 0.09), darkMat);
        hornTip.position.set(s * 0.14, 0.38, -0.22);
        hornTip.rotation.x = -0.95;
        headGrp.add(ear); headGrp.add(hornBase); headGrp.add(hornTip);
      });

      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.18, 0.10), darkMat);
      tail.position.set(0, 0.78, -0.48);
      tail.rotation.x = 0.35;
      root.add(tail);
      limbMeshes.tail = tail;

      addFourLegs(0.12, 0.36, 0.12, 0.18, 0.17, 0.30, -0.30, coatMat, darkMat);

    } else if (type === 'Squirrel') {
      // Zrzavá veverka: rezavý kožíšek, krémové bříško a tvářičky, velké korálkové oči, hlodáky, štětičky na uších a obří huňatý ocas
      const furMat = new THREE.MeshLambertMaterial({ color: 0xea580c });
      const darkFurMat = new THREE.MeshLambertMaterial({ color: 0x9a3412 });
      const bellyMat = new THREE.MeshLambertMaterial({ color: 0xffedd5 });
      const toothMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const noseMat = new THREE.MeshBasicMaterial({ color: 0x1c1917 });

      const body = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.24, 0.44), furMat);
      body.position.set(0, 0.28, 0);
      root.add(body);

      const belly = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.40), bellyMat);
      belly.position.set(0, 0.22, 0.02);
      root.add(belly);

      const headGrp = new THREE.Group();
      headGrp.position.set(0, 0.44, 0.24);
      root.add(headGrp);
      limbMeshes.head = headGrp;

      const head = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.22, 0.24), furMat);
      headGrp.add(head);

      // Naducané světlé tvářičky, čumáček a dva přední zoubky (hlodáky)
      const cheeks = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.11, 0.14), bellyMat);
      cheeks.position.set(0, -0.05, 0.08);
      const nose = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.05), noseMat);
      nose.position.set(0, -0.01, 0.15);
      const teeth = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.03), toothMat);
      teeth.position.set(0, -0.09, 0.14);
      headGrp.add(cheeks); headGrp.add(nose); headGrp.add(teeth);

      // Velké lesklé veverčí oči
      addExpressiveEyes(headGrp, 0.12, 0.03, 0.075, 0x451a03, 0x9a3412, 0.85, false);

      // Ouška se zrzavými štětičkami
      [-1, 1].forEach(s => {
        const ear = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.10, 0.06), furMat);
        ear.position.set(s * 0.09, 0.15, 0.0);
        const tuft = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.07, 0.04), darkFurMat);
        tuft.position.set(s * 0.09, 0.22, 0.0);
        headGrp.add(ear); headGrp.add(tuft);
      });

      // Obří vícevrstvý huňatý ocas do oblouku
      const tailGrp = new THREE.Group();
      tailGrp.position.set(0, 0.30, -0.22);
      const t1 = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.26, 0.22), darkFurMat);
      t1.position.set(0, 0.10, -0.08);
      const t2 = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.32, 0.26), furMat);
      t2.position.set(0, 0.32, -0.12);
      const t3 = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.20, 0.22), bellyMat);
      t3.position.set(0, 0.50, -0.04);
      tailGrp.add(t1); tailGrp.add(t2); tailGrp.add(t3);
      root.add(tailGrp);
      limbMeshes.tail = tailGrp;

      addFourLegs(0.07, 0.16, 0.07, 0.08, 0.09, 0.14, -0.14, furMat, darkFurMat);

    } else if (type === 'Goblin') {
      // Skřetí zvěd: kožená vesta, opasek s přezkou, žluto-rudé oči, skobovitý nos, vyceněné kly, dýka a puklíř
      const skinMat = new THREE.MeshLambertMaterial({ color: 0x16a34a });
      const vestMat = new THREE.MeshLambertMaterial({ color: 0x78350f });
      const darkLeatherMat = new THREE.MeshLambertMaterial({ color: 0x451a03 });
      const goldMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
      const steelMat = new THREE.MeshLambertMaterial({ color: 0xcbd5e1 });
      const tuskMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });

      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.48, 0.28), vestMat);
      torso.position.set(0, 0.56, 0);
      root.add(torso);

      const belt = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.08, 0.30), darkLeatherMat);
      belt.position.set(0, 0.36, 0);
      const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.09, 0.04), goldMat);
      buckle.position.set(0, 0.36, 0.15);
      root.add(belt); root.add(buckle);

      const headGrp = new THREE.Group();
      headGrp.position.set(0, 0.98, 0.04);
      root.add(headGrp);
      limbMeshes.head = headGrp;

      const head = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.36, 0.36), skinMat);
      headGrp.add(head);

      // Dlouhý skřetí nos a spodní čelist s kly
      const nose = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.14), skinMat);
      nose.position.set(0, -0.02, 0.22);
      nose.rotation.x = 0.25;
      headGrp.add(nose);

      const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.05, 0.04), darkLeatherMat);
      mouth.position.set(0, -0.12, 0.18);
      headGrp.add(mouth);

      [-1, 1].forEach(s => {
        const tusk = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.07, 0.04), tuskMat);
        tusk.position.set(s * 0.07, -0.09, 0.20);
        headGrp.add(tusk);
      });

      // Zářivě žluto-rudé skřetí oči se zamračeným obočím
      addExpressiveEyes(headGrp, 0.18, 0.05, 0.10, 0xef4444, 0x052e16, 1.0, true);

      // Dlouhé špičaté uši se zlatou náušnicí
      [-1, 1].forEach(s => {
        const ear = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.10, 0.07), skinMat);
        ear.position.set(s * 0.28, 0.03, -0.02);
        ear.rotation.z = s * 0.25;
        headGrp.add(ear);
      });
      const earring = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.05), goldMat);
      earring.position.set(-0.34, -0.03, -0.02);
      headGrp.add(earring);

      // Kloubové paže: pravá drží detailní dýku, levá dřevěný puklíř
      const armL = new THREE.Group();
      armL.position.set(-0.29, 0.76, 0);
      const armLMesh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.36, 0.12), skinMat);
      armLMesh.position.set(0, -0.16, 0);
      const buckler = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.26, 0.26), darkLeatherMat);
      buckler.position.set(-0.08, -0.22, 0.06);
      armL.add(armLMesh); armL.add(buckler);

      const armR = new THREE.Group();
      armR.position.set(0.29, 0.76, 0);
      const armRMesh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.36, 0.12), skinMat);
      armRMesh.position.set(0, -0.16, 0);
      const hilt = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.16), darkLeatherMat);
      hilt.position.set(0, -0.32, 0.08);
      const guard = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.05), goldMat);
      guard.position.set(0, -0.32, 0.16);
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.32), steelMat);
      blade.position.set(0, -0.32, 0.34);
      armR.add(armRMesh); armR.add(hilt); armR.add(guard); armR.add(blade);

      root.add(armL); root.add(armR);
      limbMeshes.arms = [armL, armR];

      addTwoLegs(0.14, 0.34, 0.14, 0.13, 0, vestMat, darkLeatherMat);

    } else if (type === 'Skeleton') {
      // Kostlivec válečník: anatomický hrudní koš s žebry a páteří, železné nárameníky, lebka s azurovým ohněm v očích a rytířský meč
      const boneMat = new THREE.MeshLambertMaterial({ color: 0xe2e8f0 });
      const darkBoneMat = new THREE.MeshLambertMaterial({ color: 0x94a3b8 });
      const socketMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
      const eyeGlowMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      const armorMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
      const goldMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });

      // Páteř, pánev a žebra
      const spine = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.62, 0.12), darkBoneMat);
      spine.position.set(0, 0.86, -0.04);
      const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.12, 0.20), boneMat);
      pelvis.position.set(0, 0.58, 0);
      root.add(spine); root.add(pelvis);

      [0.72, 0.86, 1.00].forEach(ry => {
        const rib = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.07, 0.22), boneMat);
        rib.position.set(0, ry, 0.02);
        root.add(rib);
      });

      // Železné nárameníky
      [-1, 1].forEach(s => {
        const pauldron = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.24), armorMat);
        pauldron.position.set(s * 0.26, 1.12, 0);
        root.add(pauldron);
      });

      const headGrp = new THREE.Group();
      headGrp.position.set(0, 1.36, 0);
      root.add(headGrp);
      limbMeshes.head = headGrp;

      const skull = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.34, 0.34), boneMat);
      headGrp.add(skull);

      const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.10, 0.26), darkBoneMat);
      jaw.position.set(0, -0.19, 0.03);
      headGrp.add(jaw);

      // Tmavé oční důlky se zářivě modrými zorničkami a nosní dutina
      [-1, 1].forEach(s => {
        const socket = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.10, 0.03), socketMat);
        socket.position.set(s * 0.09, 0.03, 0.17);
        const soulEye = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.03), eyeGlowMat);
        soulEye.position.set(s * 0.09, 0.03, 0.185);
        headGrp.add(socket); headGrp.add(soulEye);
      });
      const nasal = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.03), socketMat);
      nasal.position.set(0, -0.05, 0.175);
      headGrp.add(nasal);

      // Kostěné paže a rytířský meč
      const armL = new THREE.Group();
      armL.position.set(-0.26, 1.08, 0);
      const armLBone = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.48, 0.10), boneMat);
      armLBone.position.set(0, -0.22, 0);
      armL.add(armLBone);

      const armR = new THREE.Group();
      armR.position.set(0.26, 1.08, 0);
      const armRBone = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.48, 0.10), boneMat);
      armRBone.position.set(0, -0.22, 0);
      const swordGuard = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.06), goldMat);
      swordGuard.position.set(0, -0.44, 0.14);
      const swordBlade = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.09, 0.68), boneMat);
      swordBlade.position.set(0, -0.44, 0.50);
      armR.add(armRBone); armR.add(swordGuard); armR.add(swordBlade);

      root.add(armL); root.add(armR);
      limbMeshes.arms = [armL, armR];

      addTwoLegs(0.11, 0.55, 0.11, 0.14, 0, boneMat, armorMat);

    } else if (type === 'Golem') {
      // Kamenný golem: mohutný žulový strážce s mechem, zářícím runovým jádrem v hrudi a fialovýma očima
      const stoneMat = new THREE.MeshLambertMaterial({ color: 0x475569 });
      const darkStoneMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
      const mossMat = new THREE.MeshLambertMaterial({ color: 0x15803d });
      const runeMat = new THREE.MeshBasicMaterial({ color: 0xc084fc });
      const runeCoreMat = new THREE.MeshBasicMaterial({ color: 0xf0abfc });

      const torso = new THREE.Mesh(new THREE.BoxGeometry(1.18, 1.15, 0.76), stoneMat);
      torso.position.set(0, 1.42, 0);
      const waist = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.34, 0.58), darkStoneMat);
      waist.position.set(0, 0.78, 0);
      root.add(torso); root.add(waist);

      // Zářící magické runové jádro v hrudi
      const coreFrame = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.38, 0.08), darkStoneMat);
      coreFrame.position.set(0, 1.48, 0.37);
      const coreGem = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.10), runeMat);
      coreGem.position.set(0, 1.48, 0.39);
      const coreInner = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), runeCoreMat);
      coreInner.position.set(0, 1.48, 0.40);
      root.add(coreFrame); root.add(coreGem); root.add(coreInner);

      // Porost mechu na ramenou
      const mossShoulder = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.14, 0.80), mossMat);
      mossShoulder.position.set(-0.38, 1.98, 0);
      root.add(mossShoulder);

      const headGrp = new THREE.Group();
      headGrp.position.set(0, 2.26, 0.08);
      root.add(headGrp);
      limbMeshes.head = headGrp;

      const head = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.54, 0.54), stoneMat);
      const browSlab = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.14, 0.58), darkStoneMat);
      browSlab.position.set(0, 0.16, 0.04);
      const mossCap = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.08, 0.44), mossMat);
      mossCap.position.set(0.05, 0.29, -0.02);
      headGrp.add(head); headGrp.add(browSlab); headGrp.add(mossCap);

      // Zářící fialové runové oči golema
      addExpressiveEyes(headGrp, 0.27, 0.02, 0.16, 0xa855f7, 0x1e293b, 1.45, true);

      // Mohutné kloubové kamenné paže s runovými náramky
      [-1, 1].forEach(s => {
        const armGrp = new THREE.Group();
        armGrp.position.set(s * 0.82, 1.88, 0);
        const upperArm = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.62, 0.38), stoneMat);
        upperArm.position.set(0, -0.28, 0);
        const runeBand = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.10, 0.42), runeMat);
        runeBand.position.set(0, -0.62, 0);
        const fist = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.46, 0.44), darkStoneMat);
        fist.position.set(0, -0.88, 0.04);
        armGrp.add(upperArm); armGrp.add(runeBand); armGrp.add(fist);
        root.add(armGrp);
        limbMeshes.arms.push(armGrp);
      });

      addTwoLegs(0.42, 0.72, 0.42, 0.34, 0, stoneMat, darkStoneMat);
    }

    limbMeshes.root = root;
    return root;
  }

  let nextEntityId = 1;

  // ---------------------------------------------------------------------------
  // Třída CreatureInstance
  // ---------------------------------------------------------------------------
  class CreatureInstance {
    constructor(type, x, y, z, level = 1) {
      const normType = normalizeCreatureType(type);
      const cfg = CREATURE_CONFIGS[normType] || CREATURE_CONFIGS.Wolf;

      this.id = nextEntityId++;
      this.type = cfg.type;
      this.name = cfg.name;
      this.level = Math.max(1, Math.floor(level));
      this.isPassive = !!cfg.isPassive;
      this.tameItem = cfg.tameItem || null;
      this.altTameItem = cfg.altTameItem || null;
      this.tameItemName = cfg.tameItemName || '';
      this.petItemId = cfg.petItemId || null;

      // Pozice a fyzika
      this.x = Number(x) || 0;
      this.y = Number(y) || 50;
      this.z = Number(z) || 0;
      this.vx = 0;
      this.vy = 0;
      this.vz = 0;
      this.rotationY = 0;
      this.ground = true;

      // Zdraví & Škálování podle úrovně
      this.maxHp = cfg.baseHp + (this.level - 1) * 15;
      this.hp = this.maxHp;
      this.baseDamage = Math.floor(cfg.baseDamage * (1 + (this.level - 1) * 0.12));

      // Vzdálenosti & Rychlosti
      this.speedChase = cfg.speedChase;
      this.speedWander = cfg.speedWander;
      this.aggroRadius = cfg.aggroRadius;
      this.attackReach = cfg.attackReach;
      this.attackCooldown = cfg.attackCooldown;
      this.attackTimer = 0;
      this.hitboxRadius = cfg.hitboxRadius;
      this.height = cfg.height;

      // Kořist
      this.loot = {
        gold: cfg.goldBase * this.level,
        wood: 2,
        ore_iron: 1,
        xp: cfg.xpBase * this.level
      };
      this.dropTemplates = cfg.drops;

      // AI Stavový automat (6 stavů: Idle, Wander, Chase, Attack, Hurt, Dead)
      this.state = 'Idle';
      this.stateTimer = 2.0;
      this.hurtTimer = 0;
      this.spawnAnchor = { x: this.x, y: this.y, z: this.z };
      this.wanderTarget = { x: this.x, z: this.z };
      this.flashTimer = 0;
      this.deathTimer = 0;

      // Vizuální 3D reprezentace
      this.group = null;
      this.healthSprite = null;
      this.healthCanvas = null;
      this.healthTexture = null;
      this.limbMeshes = {};

      this._initVisuals();
    }

    _initVisuals() {
      if (typeof THREE === 'undefined') return;

      const grp = new THREE.Group();
      grp.position.set(this.x, this.y, this.z);
      this.group = grp;

      this._buildMesh();
      this._createHealthBar();

      if (typeof scene !== 'undefined' && scene && typeof scene.add === 'function') {
        scene.add(grp);
      }
    }

    _buildMesh() {
      if (typeof THREE === 'undefined') return;
      const root = buildCreatureVoxelGroup(this.type, this.limbMeshes, false);
      if (root) {
        this.group.add(root);
      }
    }

    _createHealthBar() {
      if (typeof document === 'undefined' || typeof THREE === 'undefined') return;

      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 80;
      this.healthCanvas = canvas;

      const texture = new THREE.CanvasTexture(canvas);
      this.healthTexture = texture;

      const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.scale.set(2.0, 0.62, 1);
      sprite.position.set(0, this.height + 0.42, 0);

      this.healthSprite = sprite;
      this.group.add(sprite);

      this._updateHealthCanvas();
    }

    _updateHealthCanvas() {
      if (!this.healthCanvas) return;
      const ctx = this.healthCanvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, 256, 80);

      // Titulek: Level & Jméno
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 4;
      ctx.fillText(this.isPassive ? `🐾 ${this.name}` : `[Lv.${this.level}] ${this.name}`, 128, 22);

      // Pokud jde o zvíře k ochočení, ukázat čím se ochočuje
      if (this.tameItemName) {
        ctx.fillStyle = '#fde047';
        ctx.font = 'bold 15px sans-serif';
        ctx.fillText(`[E] Ochočit: ${this.tameItemName}`, 128, 42);
      }
      ctx.shadowBlur = 0;

      const barY = this.tameItemName ? 50 : 36;
      // Pozadí baru
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(20, barY, 216, 16);
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      ctx.strokeRect(20, barY, 216, 16);

      // Vyplnění zdraví
      const pct = Math.max(0, Math.min(1, this.hp / (this.maxHp || 1)));
      let barColor = '#22c55e';
      if (pct < 0.25) barColor = '#ef4444';
      else if (pct < 0.55) barColor = '#f59e0b';

      ctx.fillStyle = barColor;
      ctx.fillRect(22, barY + 2, Math.floor(212 * pct), 12);

      if (this.healthTexture) this.healthTexture.needsUpdate = true;
    }

    takeDamage(dmg, knockback, isCrit = false, attacker = 'player') {
      if (this.state === 'Dead') return 0;

      const actualDmg = Math.max(1, Math.round(dmg || 1));
      this.hp = Math.max(0, this.hp - actualDmg);
      this._updateHealthCanvas();

      // Vizuální indikátor poškození
      if (window.EntityManager && typeof window.EntityManager.spawnDamageNumber === 'function') {
        window.EntityManager.spawnDamageNumber(this.x, this.y + this.height * 0.8, this.z, actualDmg, isCrit, false);
      }

      // Knockback impuls
      if (knockback && typeof knockback === 'object') {
        this.vx += (knockback.x || 0) * 4.5;
        this.vz += (knockback.z || 0) * 4.5;
        this.vy = Math.max(this.vy, 2.2);
        this.ground = false;
      }

      this.flashTimer = 0.2; // Červený záblesk po zásahu

      if (this.hp <= 0) {
        this.state = 'Dead';
        this.die();
      } else {
        // Zraněná nestvůra přejde do stavu Hurt (stagger / ochromení)
        this.state = 'Hurt';
        this.hurtTimer = 0.35; // Stagger duration
      }

      return this.hp;
    }

    die() {
      this.state = 'Dead';
      this.deathTimer = 1.2;

      // Zrušení zdravíčka
      if (this.healthSprite) {
        this.healthSprite.visible = false;
      }

      // Udělení zkušeností hráči
      if (typeof window !== 'undefined') {
        if (typeof window.addPlayerXP === 'function') {
          window.addPlayerXP(this.loot.xp, this.name);
        } else if (typeof P !== 'undefined' && P) {
          P.xp = (P.xp || 0) + this.loot.xp;
          if (typeof window.checkPlayerLevelUp === 'function') {
            window.checkPlayerLevelUp();
          }
        }
      }

      // Zlato přímo do inventáře
      if (typeof INV !== 'undefined' && Array.isArray(INV)) {
        const goldIt = INV.find(it => it.id === 'coin_gold' || it.id === 'gold');
        if (goldIt) goldIt.count = (goldIt.count || 0) + this.loot.gold;
      }

      // Fyzický loot drop v herním světě
      if (window.EntityManager && typeof window.EntityManager.spawnLootDrop === 'function') {
        // Drop dřeva & železa podle loot tabulky
        if (this.loot.wood > 0) {
          window.EntityManager.spawnLootDrop('wood', this.loot.wood, this.x + 0.3, this.y + 0.2, this.z);
        }
        if (this.loot.ore_iron > 0) {
          window.EntityManager.spawnLootDrop('ore_iron', this.loot.ore_iron, this.x - 0.3, this.y + 0.2, this.z);
        }
      }

      // Animace pádu / kolapsu
      if (this.limbMeshes.root) {
        this.limbMeshes.root.rotation.x = Math.PI / 2;
        this.limbMeshes.root.position.y = 0.2;
      }
    }

    // Aktualizace AI chování a pohybu v terénu
    update(playerPos, dt = 0.016) {
      if (this.state === 'Dead') {
        this.deathTimer -= dt;
        return;
      }

      const px = (playerPos && typeof playerPos.x === 'number') ? playerPos.x : (typeof P !== 'undefined' ? P.x : 0);
      const pz = (playerPos && typeof playerPos.z === 'number') ? playerPos.z : (typeof P !== 'undefined' ? P.z : 0);
      const dist = Math.hypot(this.x - px, this.z - pz);

      if (this.attackTimer > 0) this.attackTimer -= dt;

      // -----------------------------------------------------------------------
      // AI Stav Hurt (stagger / ochromení po zásahu)
      // -----------------------------------------------------------------------
      if (this.state === 'Hurt') {
        this.hurtTimer -= dt;
        if (this.hurtTimer <= 0) {
          this.state = this.isPassive ? 'Wander' : ((dist <= this.attackReach) ? 'Attack' : 'Chase');
        }
        return; // Creature reels/staggers, freezing movement & attack during hurtTimer
      }

      // -----------------------------------------------------------------------
      // AI Přechody mezi stavy
      // -----------------------------------------------------------------------
      if (this.isPassive) {
        if (this.state !== 'Wander' && this.state !== 'Idle') {
          this.state = 'Wander';
          this.stateTimer = 3.0;
        }
      } else if (dist <= this.attackReach) {
        this.state = 'Attack';
      } else if (dist <= this.aggroRadius) {
        this.state = 'Chase';
      } else {
        // Hráč je mimo dosah vidění
        if (this.state === 'Chase' && dist > this.aggroRadius * 1.5) {
          this.state = 'Wander';
          this.stateTimer = 4.0;
        } else if (this.state !== 'Wander' && this.state !== 'Idle') {
          this.state = 'Wander';
        }
      }

      // -----------------------------------------------------------------------
      // AI Provádění chování
      // -----------------------------------------------------------------------
      let moveDirX = 0;
      let moveDirZ = 0;
      let moveSpeed = 0;

      if (this.state === 'Idle') {
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.state = 'Wander';
          this.stateTimer = 3.0 + Math.random() * 3.0;
          const wanderAng = Math.random() * Math.PI * 2;
          const wanderR = 4.0 + Math.random() * 8.0;
          this.wanderTarget.x = this.spawnAnchor.x + Math.cos(wanderAng) * wanderR;
          this.wanderTarget.z = this.spawnAnchor.z + Math.sin(wanderAng) * wanderR;
        }
      } else if (this.state === 'Wander') {
        this.stateTimer -= dt;
        const toWanderX = this.wanderTarget.x - this.x;
        const toWanderZ = this.wanderTarget.z - this.z;
        const wanderDist = Math.hypot(toWanderX, toWanderZ);

        if (wanderDist > 0.8 && this.stateTimer > 0) {
          moveDirX = toWanderX / wanderDist;
          moveDirZ = toWanderZ / wanderDist;
          moveSpeed = this.speedWander;
          this.rotationY = Math.atan2(moveDirX, moveDirZ);
        } else {
          this.state = 'Idle';
          this.stateTimer = 2.0 + Math.random() * 2.0;
        }
      } else if (this.state === 'Chase') {
        const toPlayerX = px - this.x;
        const toPlayerZ = pz - this.z;
        const pDist = Math.hypot(toPlayerX, toPlayerZ);

        if (pDist > 0.5) {
          moveDirX = toPlayerX / pDist;
          moveDirZ = toPlayerZ / pDist;
          moveSpeed = this.speedChase;
          this.rotationY = Math.atan2(moveDirX, moveDirZ);
        }
      } else if (this.state === 'Attack') {
        const toPlayerX = px - this.x;
        const toPlayerZ = pz - this.z;
        this.rotationY = Math.atan2(toPlayerX, toPlayerZ);

        if (this.attackTimer <= 0) {
          this.attackTimer = this.attackCooldown;
          this._performAttack(dist);
        }
      }

      // -----------------------------------------------------------------------
      // Pohyb & Fyzika s asistencí schodů (Step-assist 0.55m)
      // -----------------------------------------------------------------------
      const targetVx = moveDirX * moveSpeed;
      const targetVz = moveDirZ * moveSpeed;
      this.vx += (targetVx - this.vx) * Math.min(1, dt * 10);
      this.vz += (targetVz - this.vz) * Math.min(1, dt * 10);

      const prevX = this.x;
      const prevZ = this.z;
      this.x += this.vx * dt;
      this.z += this.vz * dt;

      // Výpočet přesné výšky horního povrchu terénu / kostek pod celým půdorysem zvířete
      if (typeof height === 'function') {
        const terrainH = getFootprintSurfaceY(this.x, this.z, 0.22, this.y);

        // Pokud je terén vyšší o blok (max 0.65m), zvíře/mob plynule vystoupá na kostku
        if (terrainH > this.y && terrainH - this.y <= 0.65) {
          this.y = terrainH;
          this.vy = 0;
          this.ground = true;
        } else if (terrainH - this.y > 0.65) {
          // Nepřekročitelná stěna / svislý útes: zastavit horizontální rychlost
          this.x = prevX;
          this.z = prevZ;
          this.vx = 0;
          this.vz = 0;
        } else if (this.y > terrainH) {
          this.vy -= 22 * dt; // Gravitace
          this.y += this.vy * dt;
          if (this.y <= terrainH) {
            this.y = terrainH;
            this.vy = 0;
            this.ground = true;
          }
        } else {
          this.y = terrainH;
          this.vy = 0;
          this.ground = true;
        }
      }

      // Plynulé vyhlazení vertikálního přechodu při chůzi do schodů/kopce
      if (typeof this.renderY !== 'number') this.renderY = this.y;
      const dyRender = this.y - this.renderY;
      if (Math.abs(dyRender) < 0.85 && this.ground) {
        this.renderY += dyRender * Math.min(1, dt * 22);
      } else {
        this.renderY = this.y;
      }
      // Nikdy nedovolit, aby se vizuální model propadl pod aktuální pevný povrch pod nohama
      if (this.renderY < this.y) {
        this.renderY = this.y;
      }

      // Živá animace chůze, poskoku, hlavy, paží a ocasu
      const animNow = (typeof performance !== 'undefined' && typeof performance.now === 'function') ? performance.now() : Date.now();
      const walkPhase = animNow * 0.011 * Math.max(1.8, moveSpeed) + this.id * 1.3;

      if (this.limbMeshes.legs) {
        if (moveSpeed > 0.05) {
          const legSwing = Math.sin(walkPhase) * 0.50;
          this.limbMeshes.legs.forEach((leg, i) => {
            leg.rotation.x = (i % 2 === 0) ? legSwing : -legSwing;
          });
        } else {
          this.limbMeshes.legs.forEach(leg => { leg.rotation.x = 0; });
        }
      }

      if (this.limbMeshes.arms && this.limbMeshes.arms.length > 0) {
        if (moveSpeed > 0.05) {
          const armSwing = Math.sin(walkPhase) * 0.45;
          this.limbMeshes.arms.forEach((arm, i) => {
            arm.rotation.x = (i % 2 === 0) ? -armSwing : armSwing;
          });
        } else {
          const idleArm = Math.sin(animNow * 0.003 + this.id) * 0.05;
          this.limbMeshes.arms.forEach((arm, i) => {
            arm.rotation.x = (i % 2 === 0) ? idleArm : -idleArm;
          });
        }
      }

      if (this.limbMeshes.head) {
        if (moveSpeed > 0.05) {
          this.limbMeshes.head.rotation.x = Math.sin(walkPhase * 2) * 0.06;
          this.limbMeshes.head.rotation.y = Math.sin(walkPhase) * 0.04;
        } else {
          this.limbMeshes.head.rotation.x = Math.sin(animNow * 0.0025 + this.id) * 0.04;
          this.limbMeshes.head.rotation.y = Math.sin(animNow * 0.0018 + this.id * 2) * 0.12;
        }
      }

      if (this.limbMeshes.tail) {
        const tailFreq = moveSpeed > 0.05 ? 0.014 : 0.006;
        const tailAmp = moveSpeed > 0.05 ? 0.26 : 0.14;
        this.limbMeshes.tail.rotation.z = Math.sin(animNow * tailFreq + this.id) * tailAmp;
      }

      // Lehký odraz tělíčka směrem VZHŮRU při každém kroku (zaručuje, že tlapky nikdy nezajedou pod zem)
      if (this.limbMeshes.root && this.state !== 'Dead') {
        const strideBounce = (moveSpeed > 0.05) ? Math.abs(Math.sin(walkPhase)) * 0.035 : 0;
        this.limbMeshes.root.position.y = strideBounce;
      }

      // Synchronizace 3D scény
      if (this.group) {
        this.group.position.set(this.x, this.renderY, this.z);
        this.group.rotation.y = this.rotationY;
      }
    }

    _performAttack(dist) {
      if (this.isPassive || this.baseDamage <= 0) return;
      if (dist > this.attackReach + 0.6) return;

      // Hráčský dodge roll i-frames check
      if (typeof P !== 'undefined' && P.isRolling) {
        return; // Zásah minut díky úskoku
      }

      // Hráčský shield block check
      if (typeof P !== 'undefined' && P.isBlocking) {
        const blockPower = 0.70;
        const mitigatedDmg = Math.max(1, Math.round(this.baseDamage * (1 - blockPower)));
        if (typeof P.hp === 'number') P.hp = Math.max(0, P.hp - mitigatedDmg);
        if (typeof G !== 'undefined' && typeof G.hp === 'number') G.hp = Math.max(0, G.hp - mitigatedDmg);
        if (typeof P.stamina === 'number') P.stamina = Math.max(0, P.stamina - 15);
        if (typeof playBlockSound === 'function') playBlockSound();
        if (typeof toast === 'function') toast(`🛡️ Útok nestvůry vykryt štítem (-${mitigatedDmg} HP)`);
        return;
      }

      // Přímý zásah hráče
      const dmg = this.baseDamage;
      if (typeof P !== 'undefined' && typeof P.hp === 'number') {
        P.hp = Math.max(0, P.hp - dmg);
      }
      if (typeof G !== 'undefined' && typeof G.hp === 'number') {
        G.hp = Math.max(0, G.hp - dmg);
      }

      if (typeof toast === 'function') {
        toast(`⚠️ ${this.name} tě zasáhl za -${dmg} HP!`);
      }

      // Červený záblesk obrazovky při zranění
      const flash = (typeof document !== 'undefined') ? document.getElementById('damageFlash') : null;
      if (flash) {
        flash.style.opacity = '0.55';
        setTimeout(() => { if (flash) flash.style.opacity = '0'; }, 160);
      }
    }

    dispose() {
      if (this.group && typeof scene !== 'undefined' && scene) {
        scene.remove(this.group);
      }
      if (this.healthTexture) this.healthTexture.dispose();
      this.group = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Globální Správce Entit (window.EntityManager)
  // ---------------------------------------------------------------------------
  const EntityManager = {
    creatures: [],
    projectiles: [],
    droppedLoot: [],
    damageNumbers: [],

    resolveCreatureType: resolveCreatureType,

    getAvailableCreatures: function () {
      return Object.values(CREATURE_CONFIGS).map(cfg => ({
        type: cfg.type,
        cmdName: cfg.aliases && cfg.aliases[1] ? cfg.aliases[1] : cfg.type.toLowerCase(),
        name: cfg.name,
        isPassive: !!cfg.isPassive,
        tameItemName: cfg.tameItemName || null
      }));
    },

    spawnCreature: function (type, x, y, z, level = 1) {
      const creature = new CreatureInstance(type, x, y, z, level);
      this.creatures.push(creature);
      return creature;
    },

    spawnCreatureInFrontOfPlayer: function (query, level = 1) {
      const resolvedType = resolveCreatureType(query);
      if (!resolvedType) {
        return { error: true, query };
      }

      const pObj = (typeof P !== 'undefined') ? P : { x: 0, y: 50, z: 0 };
      const playerYaw = (typeof yaw !== 'undefined') ? yaw : 0;
      const dist = 3.2;
      const spawnX = pObj.x - Math.sin(playerYaw) * dist;
      const spawnZ = pObj.z - Math.cos(playerYaw) * dist;

      let spawnY = pObj.y;
      if (typeof height === 'function') {
        spawnY = getFootprintSurfaceY(spawnX, spawnZ, 0.22, pObj.y);
      }

      const creature = this.spawnCreature(resolvedType, spawnX, spawnY, spawnZ, level);
      // Otočit čelem k hráči
      creature.rotationY = Math.atan2(pObj.x - spawnX, pObj.z - spawnZ);
      if (creature.group) {
        creature.group.rotation.y = creature.rotationY;
      }

      return { creature, config: CREATURE_CONFIGS[resolvedType] };
    },

    spawnTameParticles: function (x, y, z) {
      if (typeof scene === 'undefined' || !scene || typeof THREE === 'undefined') return;
      const grp = new THREE.Group();
      grp.position.set(x, y + 0.5, z);
      const colors = [0xf43f5e, 0xfb7185, 0xfde047, 0x4ade80];
      const parts = [];
      for (let i = 0; i < 16; i++) {
        const mat = new THREE.MeshBasicMaterial({ color: colors[i % colors.length], transparent: true, opacity: 1 });
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), mat);
        const ang = (i / 16) * Math.PI * 2;
        const spd = 1.2 + Math.random() * 1.2;
        parts.push({
          mesh: m,
          vx: Math.cos(ang) * spd,
          vy: 1.8 + Math.random() * 1.5,
          vz: Math.sin(ang) * spd
        });
        grp.add(m);
      }
      scene.add(grp);
      let t = 0;
      const iv = setInterval(() => {
        t += 0.03;
        for (const p of parts) {
          p.mesh.position.x += p.vx * 0.03;
          p.mesh.position.y += p.vy * 0.03;
          p.mesh.position.z += p.vz * 0.03;
          p.mesh.material.opacity = Math.max(0, 1 - t / 0.9);
        }
        if (t >= 0.9) {
          clearInterval(iv);
          scene.remove(grp);
        }
      }, 30);
    },

    // Ochočení nejbližšího divokého zvířete v dosahu (klávesa [E] nebo použití pamlsku v inventáři)
    tryTameClosest: function (px, py, pz, maxRadius = 4.2, filterTameItemId = null) {
      let bestCreature = null;
      let bestDist = maxRadius;

      for (const c of this.creatures) {
        if (!c || c.state === 'Dead' || !c.tameItem || !c.petItemId) continue;
        if (filterTameItemId && c.tameItem !== filterTameItemId && c.altTameItem !== filterTameItemId) continue;
        const d = Math.hypot(c.x - px, c.z - pz);
        if (d <= bestDist) {
          bestDist = d;
          bestCreature = c;
        }
      }

      if (!bestCreature) return false;

      if (typeof INV === 'undefined' || !Array.isArray(INV)) return false;

      // Najít požadovaný předmět pro ochočení v inventáři
      let tameIt = INV.find(it => it.id === bestCreature.tameItem && (it.count || 0) > 0);
      if (!tameIt && bestCreature.altTameItem) {
        tameIt = INV.find(it => it.id === bestCreature.altTameItem && (it.count || 0) > 0);
      }

      if (!tameIt) {
        if (typeof toast === 'function') {
          toast(`🦴 Pro ochočení (${bestCreature.name}) potřebuješ předmět: ${bestCreature.tameItemName}!`);
        }
        return true; // Zpracováno (zobrazena informace co je potřeba)
      }

      // Odečíst 1 ks předmětu pro ochočení
      tameIt.count = Math.max(0, (tameIt.count || 1) - 1);

      // Přidat ochočeného mazlíčka do kategorie Mazlíčci (pets) v inventáři
      const petItem = INV.find(it => it.id === bestCreature.petItemId);
      if (petItem) {
        petItem.count = (petItem.count || 0) + 1;

        // Pokud hráč ještě nemá ve slotu žádného mazlíčka, rovnou mu ho vybavíme do slotu!
        if (typeof EQUIPPED_SLOTS !== 'undefined' && !EQUIPPED_SLOTS.pet) {
          EQUIPPED_SLOTS.pet = petItem.id;
          if (typeof syncEQArray === 'function') syncEQArray();
        }
      }

      // Efekt srdíček a zvuk
      this.spawnTameParticles(bestCreature.x, bestCreature.y, bestCreature.z);
      if (typeof window !== 'undefined' && typeof window.playDiscoverySound === 'function') {
        window.playDiscoverySound();
      }
      if (typeof window !== 'undefined' && typeof window.addPlayerXP === 'function') {
        window.addPlayerXP(40, 'taming');
      }

      const tamedName = petItem ? petItem.name : bestCreature.name;
      this.removeCreature(bestCreature.id);

      if (typeof renderInv === 'function') renderInv();
      if (typeof updateEquipmentUI === 'function') updateEquipmentUI();

      if (typeof toast === 'function') {
        toast(`🐾 Ochočeno: ${tamedName}! Najdeš ho v inventáři [I] -> Mazlíčci. Stiskni [R] pro přivolání a jízdu!`);
      }
      return true;
    },

    removeCreature: function (id) {
      const idx = this.creatures.findIndex(c => c.id === id);
      if (idx !== -1) {
        const c = this.creatures[idx];
        c.dispose();
        this.creatures.splice(idx, 1);
      }
    },

    getNearbyCreatures: function (x, z, radius = 20) {
      return this.creatures.filter(c => {
        if (!c || c.state === 'Dead') return false;
        return Math.hypot(c.x - x, c.z - z) <= radius;
      });
    },

    spawnDamageNumber: function (x, y, z, damage, isCrit = false, isHeal = false) {
      if (typeof document === 'undefined' || typeof THREE === 'undefined' || typeof scene === 'undefined' || !scene) return;

      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, 128, 64);
      ctx.textAlign = 'center';
      ctx.font = isCrit ? 'bold 36px sans-serif' : 'bold 28px sans-serif';
      ctx.fillStyle = isHeal ? '#22c55e' : (isCrit ? '#fbbf24' : '#ffffff');
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 4;

      const text = isHeal ? `+${damage}` : (isCrit ? `💥 -${damage}!` : `-${damage}`);
      ctx.strokeText(text, 64, 44);
      ctx.fillText(text, 64, 44);

      const texture = new THREE.CanvasTexture(canvas);
      const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.position.set(x + (Math.random() - 0.5) * 0.4, y + 0.6, z + (Math.random() - 0.5) * 0.4);
      sprite.scale.set(isCrit ? 1.6 : 1.2, isCrit ? 0.8 : 0.6, 1);

      scene.add(sprite);

      this.damageNumbers.push({
        sprite,
        texture,
        vy: 1.8,
        life: 0.75,
        maxLife: 0.75
      });
    },

    spawnLootDrop: function (itemId, count, x, y, z) {
      if (typeof THREE === 'undefined' || typeof scene === 'undefined' || !scene) return;

      const grp = new THREE.Group();
      grp.position.set(x, y + 0.25, z);

      // Zářící kostička reprezentující kořist
      const geo = new THREE.BoxGeometry(0.24, 0.24, 0.24);
      const mat = new THREE.MeshLambertMaterial({
        color: itemId.includes('iron') ? 0x94a3b8 : (itemId.includes('gold') ? 0xf59e0b : 0x78350f)
      });
      const mesh = new THREE.Mesh(geo, mat);
      grp.add(mesh);

      scene.add(grp);

      this.droppedLoot.push({
        itemId,
        count: count || 1,
        x, y, z,
        baseY: y,
        group: grp,
        mesh,
        age: 0
      });
    },

    update: function (dt = 0.016) {
      const playerPos = (typeof P !== 'undefined') ? P : { x: 0, z: 0 };

      // 1. Aktualizace všech nestvůr
      for (let i = this.creatures.length - 1; i >= 0; i--) {
        const c = this.creatures[i];
        c.update(playerPos, dt);

        if (c.state === 'Dead' && c.deathTimer <= 0) {
          c.dispose();
          this.creatures.splice(i, 1);
        }
      }

      // 2. Aktualizace poletujících čísel zranění
      for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
        const dn = this.damageNumbers[i];
        dn.life -= dt;
        dn.sprite.position.y += dn.vy * dt;
        dn.sprite.material.opacity = Math.max(0, dn.life / dn.maxLife);

        if (dn.life <= 0) {
          if (typeof scene !== 'undefined' && scene) scene.remove(dn.sprite);
          if (dn.texture) dn.texture.dispose();
          this.damageNumbers.splice(i, 1);
        }
      }

      // 3. Aktualizace a magnetismus fyzického lootu
      for (let i = this.droppedLoot.length - 1; i >= 0; i--) {
        const loot = this.droppedLoot[i];
        loot.age += dt;

        if (loot.mesh) {
          loot.mesh.rotation.y += dt * 2.2;
          loot.mesh.position.y = Math.sin(loot.age * 4.0) * 0.08;
        }

        // Magnetické přitahování k hráči
        if (typeof P !== 'undefined') {
          const dx = P.x - loot.x;
          const dz = P.z - loot.z;
          const d = Math.hypot(dx, dz);

          if (d <= 2.2) {
            // Sebrání do inventáře
            if (typeof INV !== 'undefined' && Array.isArray(INV)) {
              const item = INV.find(it => it.id === loot.itemId);
              if (item) {
                item.count = (item.count || 0) + loot.count;
              }
            }
            if (typeof toast === 'function') {
              toast(`📦 Sebráno: +${loot.count}x ${loot.itemId}`);
            }

            if (typeof scene !== 'undefined' && scene) scene.remove(loot.group);
            this.droppedLoot.splice(i, 1);
          }
        }
      }
    },

    clearAll: function () {
      this.creatures.forEach(c => c.dispose());
      this.creatures = [];
      this.damageNumbers.forEach(dn => {
        if (typeof scene !== 'undefined' && scene) scene.remove(dn.sprite);
        if (dn.texture) dn.texture.dispose();
      });
      this.damageNumbers = [];
      this.droppedLoot.forEach(l => {
        if (typeof scene !== 'undefined' && scene) scene.remove(l.group);
      });
      this.droppedLoot = [];
    }
  };

  // ---------------------------------------------------------------------------
  // Globální Správce Ochočených Mazlíčků a Jízdy (window.PetManager)
  // ---------------------------------------------------------------------------
  const PetManager = {
    activePet: null,
    get isRiding() {
      return !!(typeof P !== 'undefined' && P && P.isRiding);
    },

    _updatePetLabel: function () {
      const pet = this.activePet;
      if (!pet || !pet.labelCanvas) return;
      const ctx = pet.labelCanvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, 256, 64);
      const isRiding = (typeof P !== 'undefined' && P && P.isRiding);

      ctx.fillStyle = '#4ade80';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 4;
      ctx.fillText(`🐾 ${pet.name}`, 128, 24);

      ctx.fillStyle = '#fde047';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText(isRiding ? '🏇 Jedeš ([E] sesednout, [R] odvolat)' : '🏇 Jezdit [R / E]', 128, 46);
      ctx.shadowBlur = 0;

      if (pet.labelTexture) pet.labelTexture.needsUpdate = true;
    },

    summonPet: function (petItemId) {
      if (!petItemId && typeof EQUIPPED_SLOTS !== 'undefined') {
        petItemId = EQUIPPED_SLOTS.pet;
      }
      if (!petItemId || typeof INV === 'undefined') return null;

      const petItem = INV.find(it => it.id === petItemId);
      if (!petItem) return null;

      // Pokud už je jiný pet přivolán, nejprve ho uklidit
      if (this.activePet) {
        this.despawnPet(true);
      }

      const petType = petItem.petType || 'DogShepherd';
      const cfg = CREATURE_CONFIGS[petType] || CREATURE_CONFIGS.DogShepherd;
      const pObj = (typeof P !== 'undefined') ? P : { x: 0, y: 50, z: 0 };
      const playerYaw = (typeof yaw !== 'undefined') ? yaw : 0;

      // Spawn vedle hráče (1.5 m napravo od hráče)
      const sideX = Math.cos(playerYaw) * 1.5;
      const sideZ = -Math.sin(playerYaw) * 1.5;
      const px = pObj.x + sideX;
      const pz = pObj.z + sideZ;
      let py = pObj.y;
      if (typeof height === 'function') {
        py = getFootprintSurfaceY(px, pz, 0.22, pObj.y);
      }

      const limbMeshes = {};
      let group = null;
      let labelSprite = null;
      let labelCanvas = null;
      let labelTexture = null;

      if (typeof THREE !== 'undefined') {
        group = new THREE.Group();
        group.position.set(px, py, pz);
        const root = buildCreatureVoxelGroup(petType, limbMeshes, true);
        if (root) group.add(root);

        if (typeof document !== 'undefined') {
          labelCanvas = document.createElement('canvas');
          labelCanvas.width = 256;
          labelCanvas.height = 64;
          labelTexture = new THREE.CanvasTexture(labelCanvas);
          const spMat = new THREE.SpriteMaterial({ map: labelTexture, transparent: true, depthTest: false });
          labelSprite = new THREE.Sprite(spMat);
          labelSprite.scale.set(2.0, 0.52, 1);
          labelSprite.position.set(0, (cfg.height || 0.8) + 0.45, 0);
          group.add(labelSprite);
        }

        if (typeof scene !== 'undefined' && scene && typeof scene.add === 'function') {
          scene.add(group);
        }
      }

      this.activePet = {
        petItemId: petItem.id,
        petType,
        name: petItem.name || cfg.name,
        x: px,
        y: py,
        z: pz,
        vx: 0,
        vz: 0,
        rotationY: (typeof face !== 'undefined') ? face : 0,
        rideSpeed: petItem.rideSpeed || cfg.rideSpeed || 9.5,
        jumpBoost: petItem.jumpBoost || cfg.jumpBoost || 10.5,
        mountHeight: cfg.mountHeight || 0.56,
        height: cfg.height || 0.8,
        group,
        limbMeshes,
        labelSprite,
        labelCanvas,
        labelTexture
      };

      this._updatePetLabel();
      if (typeof EntityManager !== 'undefined' && typeof EntityManager.spawnTameParticles === 'function') {
        EntityManager.spawnTameParticles(px, py, pz);
      }
      return this.activePet;
    },

    despawnPet: function (silent = false) {
      if (!this.activePet) return;
      const oldName = this.activePet.name;
      if (typeof P !== 'undefined' && P && P.isRiding) {
        this.dismountPet(true);
      }
      if (this.activePet.group && typeof scene !== 'undefined' && scene) {
        scene.remove(this.activePet.group);
      }
      if (this.activePet.labelTexture) {
        this.activePet.labelTexture.dispose();
      }
      this.activePet = null;
      if (!silent && typeof toast === 'function') {
        toast(`🐾 Mazlíček (${oldName}) byl odvolán.`);
      }
    },

    mountPet: function () {
      if (!this.activePet || typeof P === 'undefined' || !P) return false;
      P.isRiding = true;
      P.ridingPetType = this.activePet.petType;
      P.mountHeight = this.activePet.mountHeight || 0.55;
      P.rideSpeed = this.activePet.rideSpeed || 9.5;
      P.rideJumpBoost = this.activePet.jumpBoost || 10.5;

      // Přesunout hráče přímo na hřbet mazlíčka
      P.x = this.activePet.x;
      P.z = this.activePet.z;
      this._updatePetLabel();

      if (typeof toast === 'function') {
        toast(`🏇 Jedeš na mazlíčkovi: ${this.activePet.name}! ([E] sesednout, [R] odvolat)`);
      }
      return true;
    },

    dismountPet: function (silent = false) {
      if (typeof P === 'undefined' || !P || !P.isRiding) return false;
      P.isRiding = false;
      P.ridingPetType = null;
      P.mountHeight = 0;

      if (this.activePet) {
        const playerYaw = (typeof yaw !== 'undefined') ? yaw : 0;
        this.activePet.x = P.x + Math.cos(playerYaw) * 1.35;
        this.activePet.z = P.z - Math.sin(playerYaw) * 1.35;
        if (typeof height === 'function') {
          this.activePet.y = getFootprintSurfaceY(this.activePet.x, this.activePet.z, 0.22, P.y);
        } else {
          this.activePet.y = P.y;
        }
        if (this.activePet.group) {
          this.activePet.group.position.set(this.activePet.x, this.activePet.y, this.activePet.z);
        }
        this._updatePetLabel();
        if (!silent && typeof toast === 'function') {
          toast(`🐾 Sesedl jsi z mazlíčka (${this.activePet.name}).`);
        }
      }
      return true;
    },

    // Obsluha klávesy [R]:
    // 1. Pokud mazlíček není přivolán -> spawne ho vedle hráče a rovnou umožní jízdu (nasedne)
    // 2. Pokud je mazlíček přivolán vedle hráče a hráč nejede -> nasedne na něj a jede!
    // 3. Pokud hráč už na mazlíčkovi jede -> sesedne a odvolá ho
    handleKeyR: function () {
      if (typeof EQUIPPED_SLOTS === 'undefined' || typeof INV === 'undefined') return false;

      let equippedPetId = EQUIPPED_SLOTS.pet;
      if (!equippedPetId) {
        // Pokud si hráč mazlíčka ochočil, ale ještě ho nedal do slotu, automaticky vybavíme prvního ochočeného
        const ownedPet = INV.find(it => it.cat === 'pets' && (it.count || 0) > 0);
        if (ownedPet) {
          EQUIPPED_SLOTS.pet = ownedPet.id;
          equippedPetId = ownedPet.id;
          if (typeof syncEQArray === 'function') syncEQArray();
          if (typeof updateEquipmentUI === 'function') updateEquipmentUI();
        } else {
          if (typeof toast === 'function') {
            toast('🐾 Nemáš žádného mazlíčka! Ochoč si zvíře v přírodě klávesou [E] a dej si ho do slotu.');
          }
          return false;
        }
      }

      if (!this.activePet || this.activePet.petItemId !== equippedPetId) {
        const pet = this.summonPet(equippedPetId);
        if (pet) {
          this.mountPet();
        }
        return !!pet;
      }

      if (typeof P !== 'undefined' && P && !P.isRiding) {
        return this.mountPet();
      } else {
        this.despawnPet(false);
        return true;
      }
    },

    // Interakce klávesou [E] s přivolaným mazlíčkem (nasednutí / sesednutí)
    interactClosestPet: function (px, py, pz) {
      if (!this.activePet) return false;
      if (typeof P !== 'undefined' && P && P.isRiding) {
        return this.dismountPet(false);
      }
      const d = Math.hypot(this.activePet.x - px, this.activePet.z - pz);
      if (d <= 3.8) {
        return this.mountPet();
      }
      return false;
    },

    update: function (dt = 0.016, now = 0) {
      if (!this.activePet) {
        if (typeof P !== 'undefined' && P && P.isRiding) {
          P.isRiding = false;
          P.mountHeight = 0;
        }
        return;
      }

      // Pokud byl mazlíček sundán ze slotu v inventáři, odvoláme ho
      if (typeof EQUIPPED_SLOTS !== 'undefined' && EQUIPPED_SLOTS.pet !== this.activePet.petItemId) {
        if (!EQUIPPED_SLOTS.pet) {
          this.despawnPet(true);
          return;
        } else {
          this.summonPet(EQUIPPED_SLOTS.pet);
          return;
        }
      }

      const pet = this.activePet;
      const pObj = (typeof P !== 'undefined') ? P : null;
      if (!pObj) return;

      const animTime = now || ((typeof performance !== 'undefined') ? performance.now() : Date.now());

      if (pObj.isRiding) {
        // Hráč jede na mazlíčkovi: mazlíček je přímo pod hráčem a kopíruje jeho pohyb
        pet.x = pObj.x;
        pet.y = (typeof pObj.renderY === 'number') ? pObj.renderY : pObj.y;
        pet.z = pObj.z;
        pet.rotationY = (typeof model !== 'undefined' && model) ? model.rotation.y : ((typeof face !== 'undefined') ? face : 0);

        const mv = Math.hypot(pObj.vx || 0, pObj.vz || 0);
        const ridePhase = animTime * 0.014 * Math.max(4, mv);
        if (pet.limbMeshes && pet.limbMeshes.legs) {
          if (mv > 0.15) {
            const swing = Math.sin(ridePhase) * 0.58;
            pet.limbMeshes.legs.forEach((leg, i) => {
              leg.rotation.x = (i % 2 === 0) ? swing : -swing;
            });
          } else {
            pet.limbMeshes.legs.forEach(leg => { leg.rotation.x = 0; });
          }
        }
        if (pet.limbMeshes && pet.limbMeshes.root) {
          pet.limbMeshes.root.position.y = (mv > 0.15 && pObj.ground !== false) ? Math.abs(Math.sin(ridePhase)) * 0.035 : 0;
        }
        if (pet.limbMeshes && pet.limbMeshes.head) {
          pet.limbMeshes.head.rotation.x = (mv > 0.15) ? Math.sin(ridePhase * 2) * 0.05 : 0;
        }
        if (pet.limbMeshes && pet.limbMeshes.tail) {
          pet.limbMeshes.tail.rotation.z = Math.sin(animTime * 0.01) * 0.25;
        }
      } else {
        // Mazlíček věrně následuje vedle hráče
        const targetAngle = ((typeof face !== 'undefined') ? face : 0) - Math.PI * 0.45;
        const targetX = pObj.x + Math.sin(targetAngle) * 1.65;
        const targetZ = pObj.z + Math.cos(targetAngle) * 1.65;
        const dx = targetX - pet.x;
        const dz = targetZ - pet.z;
        const dist = Math.hypot(dx, dz);

        let moveSpd = 0;
        if (dist > 22) {
          pet.x = targetX;
          pet.z = targetZ;
        } else if (dist > 0.65) {
          moveSpd = Math.min(pet.rideSpeed || 9.5, dist * 3.8);
          const nx = dx / dist;
          const nz = dz / dist;
          pet.x += nx * moveSpd * dt;
          pet.z += nz * moveSpd * dt;
          pet.rotationY = Math.atan2(nx, nz);
        }

        if (typeof height === 'function') {
          const th = getFootprintSurfaceY(pet.x, pet.z, 0.22, pet.y);
          pet.y += (th - pet.y) * Math.min(1, dt * 18);
          if (pet.y < th) pet.y = th;
        } else {
          pet.y = pObj.y;
        }

        const followPhase = animTime * 0.012 * Math.max(2, moveSpd);
        if (pet.limbMeshes && pet.limbMeshes.legs) {
          if (moveSpd > 0.2) {
            const swing = Math.sin(followPhase) * 0.5;
            pet.limbMeshes.legs.forEach((leg, i) => {
              leg.rotation.x = (i % 2 === 0) ? swing : -swing;
            });
          } else {
            pet.limbMeshes.legs.forEach(leg => { leg.rotation.x = 0; });
          }
        }
        if (pet.limbMeshes && pet.limbMeshes.root) {
          pet.limbMeshes.root.position.y = (moveSpd > 0.2) ? Math.abs(Math.sin(followPhase)) * 0.035 : 0;
        }
        if (pet.limbMeshes && pet.limbMeshes.head) {
          pet.limbMeshes.head.rotation.x = (moveSpd > 0.2) ? Math.sin(followPhase * 2) * 0.05 : Math.sin(animTime * 0.003) * 0.04;
        }
        if (pet.limbMeshes && pet.limbMeshes.tail) {
          pet.limbMeshes.tail.rotation.z = Math.sin(animTime * 0.008) * 0.22;
        }
      }

      if (pet.group) {
        pet.group.position.set(pet.x, pet.y, pet.z);
        pet.group.rotation.y = pet.rotationY;
      }
    }
  };

  // Export do globálního okna
  if (typeof window !== 'undefined') {
    window.CREATURE_CONFIGS = CREATURE_CONFIGS;
    window.EntityManager = EntityManager;
    window.PetManager = PetManager;
  }
})();

