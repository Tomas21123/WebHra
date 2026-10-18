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
      baseDamage: 18,
      speedChase: 5.5,
      speedWander: 2.3,
      aggroRadius: 0,
      attackReach: 2.8,
      attackCooldown: 1.2,
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
      baseDamage: 22,
      speedChase: 6.0,
      speedWander: 2.5,
      aggroRadius: 0,
      attackReach: 2.8,
      attackCooldown: 1.1,
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
      baseDamage: 14,
      speedChase: 4.8,
      speedWander: 2.1,
      aggroRadius: 0,
      attackReach: 2.2,
      attackCooldown: 0.9,
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
      baseDamage: 16,
      speedChase: 5.5,
      speedWander: 2.4,
      aggroRadius: 0,
      attackReach: 2.4,
      attackCooldown: 0.8,
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
      baseDamage: 26,
      speedChase: 4.0,
      speedWander: 1.5,
      aggroRadius: 0,
      attackReach: 3.2,
      attackCooldown: 1.6,
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
      baseDamage: 16,
      speedChase: 4.2,
      speedWander: 1.7,
      aggroRadius: 0,
      attackReach: 2.6,
      attackCooldown: 1.3,
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
      baseDamage: 22,
      speedChase: 5.0,
      speedWander: 2.1,
      aggroRadius: 0,
      attackReach: 2.8,
      attackCooldown: 1.2,
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
      baseDamage: 12,
      speedChase: 6.2,
      speedWander: 2.8,
      aggroRadius: 0,
      attackReach: 2.2,
      attackCooldown: 0.7,
      hitboxRadius: 0.50,
      height: 0.58,
      xpBase: 35,
      goldBase: 2,
      color: 0xc2410c,
      drops: [{ id: 'tame_acorn', min: 1, max: 1, chance: 0.6 }]
    },

    // --- DRAČÍ WYVERNY (Ice and Fire Wyverns - 2 zadní nohy + 2 křídla jako přední končetiny) ---
    WyvernFire: {
      type: 'WyvernFire',
      aliases: ['wyvernfire', 'wyvern_fire', 'wyverna', 'ohniva wyverna', 'ohnivy drak', 'fire wyvern', 'fire dragon', 'drak'],
      name: 'Ohnivá wyverna',
      isDragon: true,
      dragonType: 'fire',
      baseHp: 650,
      baseDamage: 52,
      speedChase: 5.8,
      speedWander: 2.3,
      aggroRadius: 28.0,
      attackReach: 5.5,
      attackCooldown: 2.1,
      hitboxRadius: 2.2,
      height: 3.2,
      xpBase: 500,
      goldBase: 120,
      color: 0xdc2626,
      canFly: true,
      petItemId: 'pet_wyvern_fire',
      rideSpeed: 14.5,
      jumpBoost: 14.0,
      mountHeight: 1.35,
      drops: [
        { id: 'dragon_scales_fire', min: 3, max: 6, chance: 1.0 },
        { id: 'dragon_bone', min: 2, max: 4, chance: 1.0 },
        { id: 'dragon_blood_fire', min: 1, max: 2, chance: 0.8 }
      ]
    },
    WyvernIce: {
      type: 'WyvernIce',
      aliases: ['wyvernice', 'wyvern_ice', 'ledova wyverna', 'ledovy drak', 'ice wyvern', 'ice dragon'],
      name: 'Ledová wyverna',
      isDragon: true,
      dragonType: 'ice',
      baseHp: 620,
      baseDamage: 48,
      speedChase: 5.6,
      speedWander: 2.3,
      aggroRadius: 28.0,
      attackReach: 5.5,
      attackCooldown: 2.1,
      hitboxRadius: 2.2,
      height: 3.2,
      xpBase: 500,
      goldBase: 120,
      color: 0x38bdf8,
      canFly: true,
      petItemId: 'pet_wyvern_ice',
      rideSpeed: 14.0,
      jumpBoost: 13.8,
      mountHeight: 1.35,
      drops: [
        { id: 'dragon_scales_ice', min: 3, max: 6, chance: 1.0 },
        { id: 'dragon_bone', min: 2, max: 4, chance: 1.0 },
        { id: 'dragon_blood_ice', min: 1, max: 2, chance: 0.8 }
      ]
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
    if (s.includes('ice') || s.includes('led')) {
      if (s.includes('wyvern') || s.includes('drak') || s.includes('dragon')) return 'WyvernIce';
    }
    if (s.includes('fire') || s.includes('ohen') || s.includes('ohniv')) {
      if (s.includes('wyvern') || s.includes('drak') || s.includes('dragon')) return 'WyvernFire';
    }
    if (s.includes('wyvern') || s.includes('drak') || s.includes('dragon')) return 'WyvernFire';
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

  // Procedurální generátor ještěřích šupin, rohoviny a tence potrhaných blan křídel pro wyverny (Ice and Fire styl)
  const _wyvernTextureCache = {};
  function getWyvernTexture(texType, colorHex, accentHex) {
    if (typeof document === 'undefined' || typeof document.createElement !== 'function') return null;
    const key = `${texType}_${colorHex}_${accentHex}`;
    if (_wyvernTextureCache[key]) return _wyvernTextureCache[key];

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      const baseC = '#' + (colorHex.toString(16).padStart(6, '0'));
      const accC = '#' + (accentHex.toString(16).padStart(6, '0'));

      ctx.fillStyle = baseC;
      ctx.fillRect(0, 0, 64, 64);

      if (texType === 'scales') {
        // Členité šupiny s dravčím ještěřím reliéfem
        ctx.fillStyle = accC;
        for (let y = 0; y < 64; y += 8) {
          const shift = (y % 16 === 0) ? 0 : 4;
          for (let x = -4; x < 68; x += 8) {
            ctx.beginPath();
            ctx.moveTo(x + shift, y);
            ctx.lineTo(x + shift + 4, y + 4);
            ctx.lineTo(x + shift, y + 8);
            ctx.lineTo(x + shift - 4, y + 4);
            ctx.closePath();
            ctx.fill();
          }
        }
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 10; i++) {
          ctx.beginPath();
          ctx.moveTo((i * 19) % 64, 0);
          ctx.lineTo((i * 37) % 64, 64);
          ctx.stroke();
        }
      } else if (texType === 'wing') {
        // Kožnatá, žilnatá blána křídel s mikrotrhlinami
        ctx.fillStyle = accC;
        ctx.globalAlpha = 0.35;
        ctx.fillRect(0, 0, 64, 64);
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = 'rgba(15,23,42,0.5)';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 6; i++) {
          ctx.beginPath();
          ctx.moveTo(0, 10 + i * 8);
          ctx.bezierCurveTo(20, 18 + i * 7, 44, 12 + i * 9, 64, 20 + i * 7);
          ctx.stroke();
        }
      } else if (texType === 'horn') {
        // Kruhové prstence a drážky zrohovatělé tkáně rohů
        ctx.strokeStyle = 'rgba(0,0,0,0.45)';
        ctx.lineWidth = 2;
        for (let y = 4; y < 64; y += 8) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(64, y);
          ctx.stroke();
        }
      }

      if (typeof THREE !== 'undefined' && typeof THREE.CanvasTexture === 'function') {
        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        _wyvernTextureCache[key] = tex;
        return tex;
      }
    } catch (e) {
      // Fallback pro prostředí bez podpory Canvas 2D
    }
    return null;
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

    } else if (type === 'WyvernFire' || type === 'WyvernIce') {
      // Dospělá dravá Wyverna (Ice and Fire styl):
      // Anatomie: 2 silné zadní raptor nohy + 2 masivní kožnatá křídla tvořící přední opěrné končetiny (tetrapod),
      // štíhlé svalnaté tělo s hlubokým kýlovitým hrudníkem, S-prohnutý krk, rohy, zubaté čelisti a potrhané blány.
      const isIce = (type === 'WyvernIce');
      const scaleColor  = isIce ? 0x0369a1 : 0x991b1b; // Hluboká modrá vs temně rudá dračí šupina
      const accentScale = isIce ? 0x0284c7 : 0xb91c1c; // Sekundární tón šupin
      const bellyColor  = isIce ? 0x7dd3fc : 0xf97316; // Mrazivý tyrkys vs plamenná oranž na břišních plátech
      const darkColor   = isIce ? 0x082f49 : 0x3f0a0a; // Obsidiánové ostny a hřbetní hřeben
      const hornColor   = isIce ? 0x0c4a6e : 0x18181b; // Mohutné zakřivené keratinové rohy
      const eyeColor    = isIce ? 0x38bdf8 : 0xfbbf24; // Zářící safírové vs jantarově žluté predátorské oči
      const wingColor   = isIce ? 0x38bdf8 : 0xdc2626; // Kožnatá blána křídel

      const scaleTex = getWyvernTexture('scales', scaleColor, accentScale);
      const accentTex= getWyvernTexture('scales', accentScale, scaleColor);
      const wingTex  = getWyvernTexture('wing', wingColor, darkColor);
      const hornTex  = getWyvernTexture('horn', hornColor, 0x000000);

      const talonMat  = new THREE.MeshLambertMaterial({ color: 0x18181b });
      const toothMat  = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
      const throatMat = new THREE.MeshLambertMaterial({
        color: isIce ? 0x0284c7 : 0xb91c1c,
        emissive: isIce ? 0x0369a1 : 0xdc2626,
        emissiveIntensity: 0.18
      });

      const scaleMat  = new THREE.MeshLambertMaterial({ color: scaleColor, map: scaleTex });
      const accentMat = new THREE.MeshLambertMaterial({ color: accentScale, map: accentTex });
      const bellyMat  = new THREE.MeshLambertMaterial({ color: bellyColor });
      const darkMat   = new THREE.MeshLambertMaterial({ color: darkColor, map: hornTex });
      const hornMat   = new THREE.MeshLambertMaterial({ color: hornColor, map: hornTex });
      const wingMat   = new THREE.MeshLambertMaterial({ color: wingColor, side: THREE.DoubleSide, map: wingTex, transparent: true, opacity: 0.94 });

      // 1. Tělo / Svalnatý hrudník s hlubokým kýlem a atletickým pasem
      const chestGrp = new THREE.Group();
      chestGrp.position.set(0, 0.96, 0.35);
      root.add(chestGrp);
      limbMeshes.chest = chestGrp;

      // Hrudní svalstvo a trup
      const chestCore = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.88, 0.92), scaleMat);
      chestGrp.add(chestCore);

      // Zešikmené boční svahy hrudníku (eliminují plochou kostkovitost)
      [-1, 1].forEach(side => {
        const sidePectoral = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.74, 0.86), accentMat);
        sidePectoral.position.set(side * 0.48, -0.06, 0);
        sidePectoral.rotation.z = side * 0.18;
        chestGrp.add(sidePectoral);
      });

      // Segmentované břišní pláty (Sternal Gastralia) pod hrudí
      for (let bIdx = -1; bIdx <= 1; bIdx++) {
        const sternalPlt = new THREE.Mesh(new THREE.BoxGeometry(0.72 - Math.abs(bIdx) * 0.08, 0.14, 0.28), bellyMat);
        sternalPlt.position.set(0, -0.46, bIdx * 0.28);
        chestGrp.add(sternalPlt);
      }

      // Hřbetní ostny nad hrudníkem
      for (let sIdx = -2; sIdx <= 2; sIdx++) {
        const spH = 0.26 + (1 - Math.abs(sIdx) / 3) * 0.18;
        const sp = new THREE.Mesh(new THREE.BoxGeometry(0.08, spH, 0.16), darkMat);
        sp.position.set(0, 0.46 + spH * 0.45, sIdx * 0.22);
        sp.rotation.x = -0.15;
        chestGrp.add(sp);
      }

      // Lopatkové trny (Scapular spines)
      [-1, 1].forEach(side => {
        const scapSpike = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.32, 0.16), darkMat);
        scapSpike.position.set(side * 0.34, 0.48, 0.12);
        scapSpike.rotation.z = side * 0.35;
        scapSpike.rotation.x = -0.22;
        chestGrp.add(scapSpike);
      });

      // Štíhlý ještěří pas (Flanks & Waist)
      const waist = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.70, 0.84), accentMat);
      waist.position.set(0, 0.88, -0.45);
      root.add(waist);

      const bellyRear = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.18, 0.78), bellyMat);
      bellyRear.position.set(0, 0.52, -0.45);
      root.add(bellyRear);

      // Pánevní hřbetní ostny
      for (let pIdx = -2; pIdx <= 1; pIdx++) {
        const pSpH = 0.24 - pIdx * 0.03;
        const pSpine = new THREE.Mesh(new THREE.BoxGeometry(0.08, pSpH, 0.16), darkMat);
        pSpine.position.set(0, 1.28, -0.32 + pIdx * 0.22);
        pSpine.rotation.x = -0.20;
        root.add(pSpine);
      }

      // Sedlo pro ochočenou wyvernu
      if (isTamedPet) {
        const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.16, 0.72), new THREE.MeshLambertMaterial({ color: 0x451a03 }));
        saddle.position.set(0, 1.38, 0.05);
        const stirrupL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.45, 0.06), new THREE.MeshBasicMaterial({ color: 0xfacc15 }));
        stirrupL.position.set(-0.46, 0.95, 0.05);
        const stirrupR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.45, 0.06), new THREE.MeshBasicMaterial({ color: 0xfacc15 }));
        stirrupR.position.set(0.46, 0.95, 0.05);
        root.add(saddle); root.add(stirrupL); root.add(stirrupR);
      }

      // 2. Anatomicky členitý S-prohnutý ještěří krk (3 kloubové segmenty)
      const neckBase = new THREE.Group();
      neckBase.position.set(0, 1.16, 0.85);
      const neckBaseMesh = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.54, 0.56), scaleMat);
      neckBase.add(neckBaseMesh);
      const dewlap = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.16, 0.52), bellyMat);
      dewlap.position.set(0, -0.24, 0.02);
      neckBase.add(dewlap);
      const neckSp1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.28, 0.18), darkMat);
      neckSp1.position.set(0, 0.36, -0.05);
      neckSp1.rotation.x = -0.25;
      neckBase.add(neckSp1);
      neckBase.rotation.x = -0.32;
      root.add(neckBase);

      const neckMid = new THREE.Group();
      neckMid.position.set(0, 1.42, 1.25);
      const neckMidMesh = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.48, 0.54), accentMat);
      neckMid.add(neckMidMesh);
      const throatUnder = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.15, 0.50), bellyMat);
      throatUnder.position.set(0, -0.22, 0.02);
      neckMid.add(throatUnder);
      const neckSp2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.32, 0.18), darkMat);
      neckSp2.position.set(0, 0.34, -0.05);
      neckSp2.rotation.x = -0.20;
      neckMid.add(neckSp2);
      neckMid.rotation.x = -0.15;
      root.add(neckMid);

      const neckTop = new THREE.Group();
      neckTop.position.set(0, 1.66, 1.66);
      const neckTopMesh = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.42, 0.50), scaleMat);
      neckTop.add(neckTopMesh);
      const gularPlt = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.46), bellyMat);
      gularPlt.position.set(0, -0.19, 0.02);
      neckTop.add(gularPlt);
      const neckSp3 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.25, 0.16), darkMat);
      neckSp3.position.set(0, 0.28, -0.05);
      neckSp3.rotation.x = -0.18;
      neckTop.add(neckSp3);
      neckTop.rotation.x = 0.12;
      root.add(neckTop);

      limbMeshes.neckSegments = [neckBase, neckMid, neckTop];

      // 3. Dravčí lebka, mohutné zakřivené rohy a otevíratelná tlama s vnitřním žárem
      const headGrp = new THREE.Group();
      headGrp.position.set(0, 1.82, 1.98);
      root.add(headGrp);
      limbMeshes.head = headGrp;

      // Lebka
      const skull = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.40, 0.60), scaleMat);
      skull.position.set(0, 0.12, 0);
      headGrp.add(skull);

      // Výrazné nadočnicové oblouky dodávající predátorský výraz
      [-1, 1].forEach(side => {
        const brow = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.42), darkMat);
        brow.position.set(side * 0.24, 0.24, 0.08);
        brow.rotation.z = side * -0.25;
        brow.rotation.y = side * 0.15;
        headGrp.add(brow);
      });

      // Zúžený čenich s horní čelistí
      const upperSnout = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.22, 0.64), scaleMat);
      upperSnout.position.set(0, 0.05, 0.52);
      headGrp.add(upperSnout);

      // Nozdry
      [-0.10, 0.10].forEach(nx => {
        const nostril = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.12), darkMat);
        nostril.position.set(nx, 0.18, 0.76);
        headGrp.add(nostril);
      });

      // Nosní hřebínek
      const nasalSpike = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.18), darkMat);
      nasalSpike.position.set(0, 0.18, 0.45);
      nasalSpike.rotation.x = -0.35;
      headGrp.add(nasalSpike);

      // Horní patro tlamy
      const upperMouth = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.06, 0.54), throatMat);
      upperMouth.position.set(0, -0.06, 0.52);
      headGrp.add(upperMouth);

      // Horní řada zubů: 2 přední dravčí tesáky + zubaté jehly
      [-0.08, 0.08].forEach(fx => {
        const frontTooth = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.05), toothMat);
        frontTooth.position.set(fx, -0.12, 0.81);
        headGrp.add(frontTooth);
      });
      [-0.17, 0.17].forEach(sideX => {
        for (let tIdx = 0; tIdx < 4; tIdx++) {
          const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.10, 0.05), toothMat);
          tooth.position.set(sideX, -0.10, 0.30 + tIdx * 0.13);
          headGrp.add(tooth);
        }
      });

      // Spodní čelist na pohyblivém pantu (Hinged Jaw)
      const jawPivot = new THREE.Group();
      jawPivot.position.set(0, -0.05, 0.12);
      headGrp.add(jawPivot);
      limbMeshes.jaw = jawPivot;

      const lowerJaw = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.14, 0.66), bellyMat);
      lowerJaw.position.set(0, -0.08, 0.38);
      jawPivot.add(lowerJaw);

      // Bradový trn (Gular spur)
      const chinSpur = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.20), darkMat);
      chinSpur.position.set(0, -0.16, 0.35);
      chinSpur.rotation.x = -0.40;
      jawPivot.add(chinSpur);

      // Jazyk a vnitřní hrdelní výheň (Emissive Throat Cavity)
      const tongue = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.46), throatMat);
      tongue.position.set(0, -0.01, 0.38);
      jawPivot.add(tongue);

      const throatCore = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.16, 0.28), throatMat);
      throatCore.position.set(0, 0.06, 0.10);
      jawPivot.add(throatCore);
      limbMeshes.throatMat = throatMat;

      // Dolní řada zubů
      [-0.07, 0.07].forEach(fx => {
        const frontTooth = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.13, 0.04), toothMat);
        frontTooth.position.set(fx, 0.04, 0.68);
        jawPivot.add(frontTooth);
      });
      [-0.15, 0.15].forEach(sideX => {
        for (let tIdx = 0; tIdx < 4; tIdx++) {
          const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.09, 0.05), toothMat);
          tooth.position.set(sideX, 0.03, 0.20 + tIdx * 0.12);
          jawPivot.add(tooth);
        }
      });

      // Zářící predátorské oči
      addExpressiveEyes(headGrp, 0.30, 0.18, 0.18, eyeColor, 0x0f172a, 1.4, true);

      // Rohy: 2 hlavní masivní zakřivené rohy (3 segmenty) + 2 lícní trny
      [-1, 1].forEach(side => {
        const hornBase = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.15, 0.44), hornMat);
        hornBase.position.set(side * 0.22, 0.32, -0.22);
        hornBase.rotation.x = -0.52;
        hornBase.rotation.y = side * 0.18;
        headGrp.add(hornBase);

        const hornMid = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.11, 0.38), hornMat);
        hornMid.position.set(side * 0.29, 0.52, -0.54);
        hornMid.rotation.x = -0.80;
        hornMid.rotation.y = side * 0.24;
        headGrp.add(hornMid);

        const hornTip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.32), hornMat);
        hornTip.position.set(side * 0.35, 0.72, -0.82);
        hornTip.rotation.x = -1.05;
        hornTip.rotation.y = side * 0.28;
        headGrp.add(hornTip);

        const cheekSpike = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.10, 0.30), darkMat);
        cheekSpike.position.set(side * 0.30, 0.05, -0.10);
        cheekSpike.rotation.x = -0.30;
        cheekSpike.rotation.y = side * 0.45;
        headGrp.add(cheekSpike);
      });

      // 4. Masivní křídla tvořící přední končetiny (Tetrapod Wyvern Wings)
      limbMeshes.wings = [];
      [-1, 1].forEach(side => {
        const wingPivot = new THREE.Group();
        wingPivot.position.set(side * 0.52, 1.26, 0.46);

        // Pažní kost (Humerus)
        const armHumerus = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.88), scaleMat);
        armHumerus.position.set(side * 0.38, 0.08, 0.15);
        armHumerus.rotation.y = side * 0.40;
        armHumerus.rotation.z = side * 0.16;
        wingPivot.add(armHumerus);

        // Loket s ostrou ostruhou (Olecranon spur)
        const elbow = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.20, 0.22), accentMat);
        elbow.position.set(side * 0.72, 0.15, 0.46);
        wingPivot.add(elbow);

        const elbowSpur = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.18), darkMat);
        elbowSpur.position.set(side * 0.72, 0.24, 0.40);
        elbowSpur.rotation.x = -0.45;
        wingPivot.add(elbowSpur);

        // Předloktí (Radius/Ulna) směřující k zemi
        const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.55), scaleMat);
        forearm.position.set(side * 0.74, -0.06, 0.62);
        forearm.rotation.x = 0.42;
        wingPivot.add(forearm);

        // Zápěstí (Carpal joint) s mohutným opěrným palcovým drápem (Carpal Talon)
        const carpalJoint = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.18), accentMat);
        carpalJoint.position.set(side * 0.76, -0.24, 0.76);
        wingPivot.add(carpalJoint);

        const thumbClaw = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.28, 0.12), talonMat);
        thumbClaw.position.set(side * 0.76, -0.38, 0.82);
        thumbClaw.rotation.x = 0.35;
        wingPivot.add(thumbClaw);

        // 4 prstové články (Digits I-IV) nesoucí blánu
        const ribAngles = [-0.35, -0.06, 0.24, 0.54];
        ribAngles.forEach((an, rIdx) => {
          const ribLen = 2.25 - rIdx * 0.24;
          const rib = new THREE.Mesh(new THREE.BoxGeometry(ribLen, 0.07, 0.07), darkMat);
          rib.position.set(side * (0.82 + ribLen * 0.48), 0.10 - rIdx * 0.04, 0.35 - rIdx * 0.32);
          rib.rotation.y = side * (an * 0.75);
          wingPivot.add(rib);
        });

        // Potrhaná kožnatá blána křídla (Tattered Patagium)
        const mainMembrane = new THREE.Mesh(new THREE.BoxGeometry(2.40, 0.04, 1.48), wingMat);
        mainMembrane.position.set(side * 1.60, 0.08, 0.05);
        wingPivot.add(mainMembrane);

        const innerFlap = new THREE.Mesh(new THREE.BoxGeometry(1.20, 0.03, 0.85), wingMat);
        innerFlap.position.set(side * 0.95, 0.04, 0.40);
        wingPivot.add(innerFlap);

        root.add(wingPivot);
        limbMeshes.wings.push(wingPivot);
      });

      // 5. Dvě silné zadní dravčí končetiny (Digitigrade Raptor Legs)
      limbMeshes.legs = [];
      [-1, 1].forEach(side => {
        const legPivot = new THREE.Group();
        legPivot.position.set(side * 0.44, 0.88, -0.42);

        // Stehno (Femur)
        const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.52, 0.40), scaleMat);
        thigh.position.set(0, -0.20, 0.05);
        thigh.rotation.x = -0.24;
        legPivot.add(thigh);

        // Kolenní štítek
        const kneePlate = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.12), darkMat);
        kneePlate.position.set(0, -0.42, 0.16);
        legPivot.add(kneePlate);

        // Holen (Digitigrade Tibia)
        const shin = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.50, 0.26), accentMat);
        shin.position.set(0, -0.54, -0.08);
        shin.rotation.x = 0.32;
        legPivot.add(shin);

        // Nárt a chodidlo
        const foot = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.50), talonMat);
        foot.position.set(0, -0.80, 0.12);
        legPivot.add(foot);

        // 3 přední dravčí hákovité drápy
        [-0.11, 0, 0.11].forEach(cx => {
          const claw = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.20), darkMat);
          claw.position.set(cx, -0.82, 0.40);
          claw.rotation.x = 0.28;
          legPivot.add(claw);
        });

        // 1 zadní opěrný dráp (Hallux)
        const rearClaw = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.15), darkMat);
        rearClaw.position.set(0, -0.82, -0.15);
        rearClaw.rotation.x = -0.38;
        legPivot.add(rearClaw);

        root.add(legPivot);
        limbMeshes.legs.push(legPivot);
      });

      // 6. Dlouhý ještěří bičovitý ocas (5 článků) s ostnatým koncovým kormidlem
      const tail = new THREE.Group();
      tail.position.set(0, 0.85, -0.82);

      const t1 = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.38, 0.75), scaleMat);
      t1.position.set(0, 0, -0.35);
      tail.add(t1);
      const s1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.25, 0.16), darkMat);
      s1.position.set(0, 0.24, -0.35);
      tail.add(s1);

      const t2 = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.32, 0.75), accentMat);
      t2.position.set(0, -0.06, -1.05);
      tail.add(t2);
      const s2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.16), darkMat);
      s2.position.set(0, 0.16, -1.05);
      tail.add(s2);

      const t3 = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.24, 0.75), scaleMat);
      t3.position.set(0, -0.12, -1.75);
      tail.add(t3);
      const s3 = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.20, 0.14), darkMat);
      s3.position.set(0, 0.08, -1.75);
      tail.add(s3);

      const t4 = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.70), accentMat);
      t4.position.set(0, -0.16, -2.45);
      tail.add(t4);
      const s4 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.12), darkMat);
      s4.position.set(0, 0.02, -2.45);
      tail.add(s4);

      const t5 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.65), scaleMat);
      t5.position.set(0, -0.19, -3.10);
      tail.add(t5);

      // Koncová ploutev / kormidlo
      const finL = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.05, 0.55), wingMat);
      finL.position.set(-0.24, -0.18, -3.35);
      finL.rotation.y = 0.40;
      tail.add(finL);

      const finR = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.05, 0.55), wingMat);
      finR.position.set(0.24, -0.18, -3.35);
      finR.rotation.y = -0.40;
      tail.add(finR);

      const finCenter = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.36, 0.55), darkMat);
      finCenter.position.set(0, -0.06, -3.35);
      tail.add(finCenter);

      root.add(tail);
      limbMeshes.tail = tail;
    }

    limbMeshes.root = root;
    return root;
  }

  let nextEntityId = 1;

  // ---------------------------------------------------------------------------
  // Impozantní masivní chrlení dračího ohně a ledu (Torrent of Flames / Blizzard)
  // Inspirováno Ice and Fire módem - desítky expandujících vířících voxelů s dynamickým světlem
  // ---------------------------------------------------------------------------
  function spawnSpectacularDragonBreath(originX, originY, originZ, dirX, dirY, dirZ, isIce, tierScale = 1.0, isPlayerMount = false, damage = 50) {
    if (typeof scene === 'undefined' || !scene || typeof THREE === 'undefined') return;

    // Normalizace směru
    const len = Math.hypot(dirX, dirY, dirZ) || 1;
    const ndx = dirX / len;
    const ndy = dirY / len;
    const ndz = dirZ / len;

    // Zvukový doprovod řevu a plamenů/vichřice
    if (typeof playDragonRoar === 'function') playDragonRoar(isIce);
    if (typeof playDragonBreath === 'function') playDragonBreath(isIce);

    // Dynamické bodové světlo vrhané plamenem na okolní svět
    const breathLight = new THREE.PointLight(isIce ? 0x38bdf8 : 0xf97316, 4.0 * Math.min(2.0, tierScale), 26 * Math.min(2.0, tierScale));
    breathLight.position.set(originX + ndx * 1.5, originY + ndy * 1.5, originZ + ndz * 1.5);
    scene.add(breathLight);

    const grp = new THREE.Group();
    grp.position.set(originX, originY, originZ);
    scene.add(grp);

    // Barevné spektrum: plameny, rozžhavené jádro i kouř
    const fireColors = [0xffffff, 0xfef08a, 0xfacc15, 0xf97316, 0xef4444, 0xdc2626, 0x991b1b, 0x27272a];
    const iceColors  = [0xffffff, 0xe0f2fe, 0xbae6fd, 0x7dd3fc, 0x38bdf8, 0x0284c7, 0x0369a1, 0x94a3b8];
    const colors = isIce ? iceColors : fireColors;

    const particles = [];
    const particleCount = Math.round(55 + tierScale * 25);
    const baseGeo = new THREE.BoxGeometry(1, 1, 1);

    for (let i = 0; i < particleCount; i++) {
      const col = colors[i % colors.length];
      const mat = new THREE.MeshBasicMaterial({
        color: col,
        transparent: true,
        opacity: 0.95
      });
      const mesh = new THREE.Mesh(baseGeo, mat);

      const initScale = 0.18 + Math.random() * 0.18;
      mesh.scale.set(initScale, initScale, initScale);

      // Postupné uvolňování částic v proudu
      const delay = (i / particleCount) * 0.42;

      // Kuželovitý rozptyl směru (Conical spread)
      const spreadAngle = (Math.random() * 0.35 + 0.05);
      const spreadPhi = Math.random() * Math.PI * 2;
      const perpX = -ndz * Math.cos(spreadPhi);
      const perpZ = ndx * Math.cos(spreadPhi);
      const perpY = Math.sin(spreadPhi);

      const spd = (16.0 + Math.random() * 12.0) * Math.min(1.5, Math.max(0.8, tierScale * 0.7));

      particles.push({
        mesh,
        delay,
        life: 0,
        maxLife: 0.75 + Math.random() * 0.35,
        targetScale: (0.45 + Math.random() * 0.85) * Math.max(0.8, tierScale * 0.85),
        vx: (ndx + perpX * spreadAngle) * spd,
        vy: (ndy + perpY * spreadAngle) * spd + (isIce ? -0.5 : 0.8),
        vz: (ndz + perpZ * spreadAngle) * spd,
        spawned: false
      });
    }

    // Kamera shake
    if (isPlayerMount && typeof window !== 'undefined' && typeof window.triggerCameraShake === 'function') {
      window.triggerCameraShake(0.18, 0.25);
    }

    // Poškození nepřátel v kuželu (AoE Cone Hit)
    if (isPlayerMount && typeof EntityManager !== 'undefined' && Array.isArray(EntityManager.creatures)) {
      const maxDist = (20.0 + tierScale * 6.0);
      const hitConeAngle = 0.78;

      EntityManager.creatures.forEach(c => {
        if (!c || c.state === 'Dead') return;
        const cdx = c.x - originX;
        const cdz = c.z - originZ;
        const distToCreature = Math.hypot(cdx, cdz);

        if (distToCreature <= maxDist) {
          const dot = (cdx * ndx + cdz * ndz) / (distToCreature || 1);
          if (dot >= Math.cos(hitConeAngle)) {
            const isCrit = Math.random() < 0.25;
            const finalDmg = Math.round(damage * (isCrit ? 1.5 : 1.0));
            c.takeDamage(finalDmg, { x: ndx * 1.5, z: ndz * 1.5 }, isCrit, isIce ? 'ice_breath' : 'dragon_fire');

            if (typeof EntityManager.spawnDamageNumber === 'function') {
              EntityManager.spawnDamageNumber(c.x, c.y + (c.height || 1.0) * 0.5, c.z, finalDmg, isCrit);
            }
            if (typeof toast === 'function' && Math.random() < 0.35) {
              toast(`${isIce ? '❄️ Mrazivý dech' : '🔥 Plameny draka'} zasáhly ${c.name} za -${finalDmg} HP!`);
            }
          }
        }
      });
    }

    let elapsed = 0;
    const iv = setInterval(() => {
      elapsed += 0.033;

      const lightProg = Math.min(1.0, elapsed / 0.6);
      breathLight.position.set(
        originX + ndx * (lightProg * 14.0 * Math.max(0.8, tierScale)),
        originY + ndy * (lightProg * 14.0 * Math.max(0.8, tierScale)),
        originZ + ndz * (lightProg * 14.0 * Math.max(0.8, tierScale))
      );
      breathLight.intensity = Math.max(0, 4.0 * (1 - lightProg * 0.8));

      let allDone = true;
      for (const p of particles) {
        if (elapsed < p.delay) {
          allDone = false;
          continue;
        }

        if (!p.spawned) {
          p.spawned = true;
          grp.add(p.mesh);
        }

        p.life += 0.033;
        if (p.life < p.maxLife) {
          allDone = false;
          const prog = p.life / p.maxLife;

          p.mesh.position.x += p.vx * 0.033;
          p.mesh.position.y += p.vy * 0.033;
          p.mesh.position.z += p.vz * 0.033;

          const curScale = THREE.MathUtils.lerp(0.20, p.targetScale, Math.min(1.0, prog * 2.2));
          p.mesh.scale.set(curScale, curScale, curScale);
          p.mesh.material.opacity = Math.max(0, (1 - prog) * 0.95);
        } else if (p.mesh.parent) {
          grp.remove(p.mesh);
          p.mesh.geometry.dispose();
          p.mesh.material.dispose();
        }
      }

      if (allDone || elapsed >= 1.4) {
        clearInterval(iv);
        if (grp.parent) scene.remove(grp);
        if (breathLight.parent) scene.remove(breathLight);
      }
    }, 33);
  }
  if (typeof window !== 'undefined') {
    window.spawnSpectacularDragonBreath = spawnSpectacularDragonBreath;
  }

  // ---------------------------------------------------------------------------
  // Jemné obláčky kouře a popela stoupající z tlamy/nozder wyverny při doznívání (Recovery fáze)
  // ---------------------------------------------------------------------------
  function spawnWyvernSmokePuff(originX, originY, originZ, dirX, dirZ, isIce) {
    if (typeof scene === 'undefined' || !scene || typeof THREE === 'undefined') return;
    const smokeGrp = new THREE.Group();
    smokeGrp.position.set(originX, originY, originZ);
    scene.add(smokeGrp);

    const smokeColors = isIce ? [0xe0f2fe, 0xbae6fd, 0x94a3b8] : [0x27272a, 0x3f3f46, 0x52525b, 0xf97316];
    const smokeCount = 6;
    const baseGeo = new THREE.BoxGeometry(1, 1, 1);
    const smokeParts = [];

    for (let i = 0; i < smokeCount; i++) {
      const col = smokeColors[i % smokeColors.length];
      const mat = new THREE.MeshBasicMaterial({
        color: col,
        transparent: true,
        opacity: 0.70
      });
      const mesh = new THREE.Mesh(baseGeo, mat);
      const initScale = 0.09 + Math.random() * 0.08;
      mesh.scale.set(initScale, initScale, initScale);
      mesh.position.set(
        (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.2,
        (Math.random() - 0.5) * 0.3
      );
      smokeGrp.add(mesh);
      smokeParts.push({
        mesh,
        mat,
        vy: 1.1 + Math.random() * 0.8,
        vx: (dirX || 0) * 0.5 + (Math.random() - 0.5) * 0.35,
        vz: (dirZ || 0) * 0.5 + (Math.random() - 0.5) * 0.35,
        grow: 0.75 + Math.random() * 0.75,
        life: 0,
        maxLife: 0.70 + Math.random() * 0.40
      });
    }

    let elapsed = 0;
    const iv = setInterval(() => {
      elapsed += 0.033;
      let allDead = true;
      for (const p of smokeParts) {
        p.life += 0.033;
        if (p.life < p.maxLife) {
          allDead = false;
          const prog = p.life / p.maxLife;
          p.mesh.position.x += p.vx * 0.033;
          p.mesh.position.y += p.vy * 0.033;
          p.mesh.position.z += p.vz * 0.033;
          const sc = p.mesh.scale.x + p.grow * 0.033;
          p.mesh.scale.set(sc, sc, sc);
          p.mat.opacity = Math.max(0, 0.70 * (1 - prog));
        } else if (p.mesh.parent) {
          smokeGrp.remove(p.mesh);
          p.mesh.geometry.dispose();
          p.mat.dispose();
        }
      }

      if (allDead || elapsed >= 1.2) {
        clearInterval(iv);
        if (smokeGrp.parent) scene.remove(smokeGrp);
      }
    }, 33);
  }
  if (typeof window !== 'undefined') {
    window.spawnWyvernSmokePuff = spawnWyvernSmokePuff;
  }

  // ---------------------------------------------------------------------------
  // Třída CreatureInstance
  // ---------------------------------------------------------------------------
  class CreatureInstance {
    constructor(type, x, y, z, level = 1, tier = null) {
      const normType = normalizeCreatureType(type);
      const cfg = CREATURE_CONFIGS[normType] || CREATURE_CONFIGS.Wolf;

      this.id = nextEntityId++;
      this.type = cfg.type;
      this.name = cfg.name;
      this.level = Math.max(1, Math.floor(level));
      this.isPassive = !!cfg.isPassive;
      this.isDragon = !!cfg.isDragon;
      this.dragonType = cfg.dragonType || null;
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
      this.baseDamage = Math.floor(cfg.baseDamage * (1 + (this.level - 1) * 0.15));

      // Vzdálenosti & Rychlosti (škálování rychlosti pro vyšší levely: +2.5% za level nad 1, max +25%)
      const lvlSpeedMult = 1 + Math.min(0.25, Math.max(0, this.level - 1) * 0.025);
      this.speedChase = cfg.speedChase * lvlSpeedMult;
      this.speedWander = cfg.speedWander;
      this.aggroRadius = cfg.aggroRadius;
      this.attackReach = cfg.attackReach;
      this.attackCooldown = Math.max(0.7, cfg.attackCooldown * (1 - Math.min(0.25, (this.level - 1) * 0.02)));
      this.attackTimer = 0;
      this.hitboxRadius = cfg.hitboxRadius;
      this.height = cfg.height;

      // Kořist a XP škálování
      this.loot = {
        gold: Math.round(cfg.goldBase * (1 + (this.level - 1) * 0.75)),
        wood: Math.min(6, 2 + Math.floor(this.level / 2)),
        ore_iron: Math.min(5, 1 + Math.floor(this.level / 2)),
        xp: Math.round(cfg.xpBase * (1 + (this.level - 1) * 0.8))
      };
      this.dropTemplates = cfg.drops;

      // Škálování draků podle TIERŮ 1-5 (Mládě -> Mladá -> Dospělá -> Prastará -> Veleještěr)
      this.tier = 3;
      this.tierScale = 1.0;
      if (this.isDragon) {
        if (typeof tier === 'number' && tier >= 1 && tier <= 5) {
          this.tier = Math.floor(tier);
        } else {
          this.tier = Math.min(5, Math.max(1, 1 + Math.floor(Math.random() * 5)));
        }
        const TIER_DEFS = [
          { tier: 1, name: 'Mládě', hpMult: 0.55, dmgMult: 0.60, scale: 0.65, reachMult: 0.70, xpMult: 0.50 },
          { tier: 2, name: 'Mladá', hpMult: 0.80, dmgMult: 0.80, scale: 0.85, reachMult: 0.85, xpMult: 0.75 },
          { tier: 3, name: 'Dospělá', hpMult: 1.10, dmgMult: 1.05, scale: 1.10, reachMult: 1.00, xpMult: 1.00 },
          { tier: 4, name: 'Prastará', hpMult: 1.65, dmgMult: 1.40, scale: 1.50, reachMult: 1.25, xpMult: 1.60 },
          { tier: 5, name: 'Veleještěr', hpMult: 2.50, dmgMult: 1.90, scale: 2.05, reachMult: 1.50, xpMult: 2.40 }
        ];
        const tDef = TIER_DEFS[this.tier - 1];
        this.tierScale = tDef.scale;
        this.name = `[Tier ${this.tier} ${tDef.name}] ${cfg.name}`;
        this.maxHp = Math.round((cfg.baseHp + (this.level - 1) * 25) * tDef.hpMult);
        this.hp = this.maxHp;
        this.baseDamage = Math.round(cfg.baseDamage * (1 + (this.level - 1) * 0.15) * tDef.dmgMult);
        this.attackReach = cfg.attackReach * tDef.reachMult;
        this.hitboxRadius = cfg.hitboxRadius * tDef.scale;
        this.height = cfg.height * tDef.scale;
        this.loot.xp = Math.round(this.loot.xp * tDef.xpMult);
      }

      // AI Stavový automat (6 stavů: Idle, Wander, Chase, Attack, Hurt, Dead)
      this.state = 'Idle';
      this.stateTimer = 2.0;
      this.hurtTimer = 0;
      this.spawnAnchor = { x: this.x, y: this.y, z: this.z };
      this.wanderTarget = { x: this.x, z: this.z };
      this.flashTimer = 0;
      this.deathTimer = 0;
      this.wyvernAttackStage = 'idle';
      this.wyvernStageTimer = 0;
      this.wyvernSmokeCooldown = 0;

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
        if (this.isDragon && this.tierScale) {
          root.scale.set(this.tierScale, this.tierScale, this.tierScale);
        }
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

      const pLvl = (typeof P !== 'undefined' && P && P.level) ? P.level : 1;
      const lvlDiff = this.level - pLvl;

      // Pozadí a rámeček jména
      ctx.textAlign = 'center';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 4;

      if (this.isPassive) {
        ctx.fillStyle = '#a7f3d0';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText(`🐾 ${this.name}`, 128, 20);
      } else {
        // Barevné odlišení nebezpečnosti protivníka
        let badgeColor = '#38bdf8'; // Vyrovnaný
        if (lvlDiff >= 3) badgeColor = '#ef4444'; // Smrtící nebezpečí
        else if (lvlDiff >= 1) badgeColor = '#f59e0b'; // Vyšší výzva
        else if (lvlDiff <= -2) badgeColor = '#94a3b8'; // Slabý protivník

        // Vykreslení Level odznaku a jména
        ctx.fillStyle = badgeColor;
        ctx.font = 'bold 19px sans-serif';
        ctx.fillText(`[Lv.${this.level}] ${this.name}`, 128, 20);
      }

      // Pokud jde o zvíře k ochočení, ukázat čím se ochočuje
      if (this.tameItemName) {
        ctx.fillStyle = '#fde047';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText(`[E] Ochočit: ${this.tameItemName}`, 128, 38);
      }
      ctx.shadowBlur = 0;

      const barY = this.tameItemName ? 48 : 32;
      const barH = 18;

      // Pozadí baru s jemným stínem
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(16, barY, 224, barH);
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      ctx.strokeRect(16, barY, 224, barH);

      // Vyplnění zdraví
      const pct = Math.max(0, Math.min(1, this.hp / (this.maxHp || 1)));
      let barColor = '#22c55e';
      if (pct < 0.25) barColor = '#ef4444';
      else if (pct < 0.55) barColor = '#f59e0b';

      ctx.fillStyle = barColor;
      ctx.fillRect(18, barY + 2, Math.floor(220 * pct), barH - 4);

      // Textové zobrazení životů (např. 85 / 100 HP)
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 3;
      ctx.fillText(`${Math.ceil(this.hp)} / ${this.maxHp}`, 128, barY + 14);
      ctx.shadowBlur = 0;

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

      this.flashTimer = 0.22; // Červený záblesk po zásahu

      // CombatJuice: Zásahové jiskry při poškození
      if (typeof CombatJuice !== 'undefined' && typeof CombatJuice.spawnHitSparks === 'function') {
        CombatJuice.spawnHitSparks(this.x, this.y + (this.height || 1.0) * 0.5, this.z, isCrit);
      }

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

      // CombatJuice: Dramatický rozpad nestvůry na voxelové částice (Creature Death Shatter)
      if (typeof CombatJuice !== 'undefined' && typeof CombatJuice.spawnCreatureDeathShatter === 'function') {
        const cfg = CREATURE_CONFIGS[this.type] || {};
        CombatJuice.spawnCreatureDeathShatter(this.x, this.y + (this.height || 1.0) * 0.5, this.z, cfg.color || 0xd97706);
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

        // Unikátní bonusový loot z nepřátel vyšších levelů (Lv. 2+)
        if (this.level >= 2 && !this.isPassive) {
          if (this.level >= 3 && Math.random() < 0.45) {
            window.EntityManager.spawnLootDrop('gem_ruby', 1, this.x, this.y + 0.2, this.z + 0.3);
          } else if (Math.random() < 0.60) {
            window.EntityManager.spawnLootDrop('ore_gold', 1, this.x, this.y + 0.2, this.z + 0.3);
          } else {
            window.EntityManager.spawnLootDrop('potion_health', 1, this.x, this.y + 0.2, this.z - 0.3);
          }
        }
      }

      // Pro draky/wyverny zanechat na zemi trvalou mrtvolu k prozkoumání a vybrání kořisti
      if (this.isDragon) {
        if (typeof window !== 'undefined' && window.EntityManager && typeof window.EntityManager.spawnDragonCorpse === 'function') {
          window.EntityManager.spawnDragonCorpse({
            dragonType: this.dragonType,
            typeName: this.type,
            name: this.name,
            tier: this.tier || 3,
            tierScale: this.tierScale || 1.1,
            x: this.x,
            y: this.renderY || this.y,
            z: this.z,
            rotationY: this.rotationY
          });
        }
      }

      // Animace pádu / kolapsu
      if (this.limbMeshes.root) {
        this.limbMeshes.root.rotation.x = Math.PI / 2;
        this.limbMeshes.root.position.y = 0.2;
      }
    }

    // Aktualizace AI chování a pohybu v terénu
    update(playerPosOrDt, secondArg = 0.016) {
      let playerPos = null;
      let dt = 0.016;
      if (typeof playerPosOrDt === 'number') {
        dt = playerPosOrDt;
        playerPos = (typeof secondArg === 'object') ? secondArg : null;
      } else {
        playerPos = playerPosOrDt;
        dt = (typeof secondArg === 'number') ? secondArg : 0.016;
      }

      if (this.state === 'Dead') {
        this.deathTimer -= dt;
        const deathP = Math.max(0, Math.min(1, 1 - (this.deathTimer / 1.2)));
        if (this.limbMeshes && this.limbMeshes.root) {
          this.limbMeshes.root.rotation.x = (Math.PI / 2) * Math.min(1, deathP * 2.8);
          this.limbMeshes.root.rotation.z = Math.sin(deathP * Math.PI) * 0.22;
          this.limbMeshes.root.position.y = 0.2 - deathP * 0.14;
        }
        if (this.group) {
          if (deathP > 0.6) {
            const scaleDown = Math.max(0.01, 1 - (deathP - 0.6) / 0.4);
            this.group.scale.set(scaleDown, scaleDown, scaleDown);
          }
        }
        return;
      }

      const px = (playerPos && typeof playerPos.x === 'number') ? playerPos.x : (typeof P !== 'undefined' ? P.x : 0);
      const pz = (playerPos && typeof playerPos.z === 'number') ? playerPos.z : (typeof P !== 'undefined' ? P.z : 0);
      const dist = Math.hypot(this.x - px, this.z - pz);

      if (this.attackTimer > 0) this.attackTimer -= dt;

      // -----------------------------------------------------------------------
      // AI Stav Hurt (Hit Stun / stagger / ochromení po zásahu)
      // -----------------------------------------------------------------------
      if (this.state === 'Hurt') {
        this.hurtTimer -= dt;
        if (this.hurtTimer <= 0) {
          this.state = this.isPassive ? 'Wander' : ((dist <= this.attackReach) ? 'Attack' : 'Chase');
        }
        // Flinch / Hit-Stun stagger animace těla a končetin
        const hurtProgress = Math.max(0, this.hurtTimer / 0.35);
        const shudder = Math.sin(hurtProgress * Math.PI * 6) * 0.12 * hurtProgress;
        if (this.limbMeshes && this.limbMeshes.root) {
          this.limbMeshes.root.rotation.x = -0.38 * hurtProgress;
          this.limbMeshes.root.rotation.z = shudder;
        }
        if (this.limbMeshes && this.limbMeshes.head) {
          this.limbMeshes.head.rotation.x = -0.42 * hurtProgress;
        }
        if (this.limbMeshes && this.limbMeshes.legs) {
          this.limbMeshes.legs.forEach((leg, i) => {
            leg.rotation.x = (i < 2 ? -0.45 : 0.35) * hurtProgress;
          });
        }
        // Fyzický posuv při knockbacku
        this.vx *= 0.90;
        this.vz *= 0.90;
        this.x += this.vx * dt;
        this.z += this.vz * dt;
        if (this.group) {
          this.group.position.set(this.x, this.renderY || this.y, this.z);
        }
        this._updateMeshFlash(dt);
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
      } else if (this.isDragon && this.wyvernAttackStage && this.wyvernAttackStage !== 'idle') {
        this.state = 'Attack';
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

        if (this.isDragon) {
          if ((!this.wyvernAttackStage || this.wyvernAttackStage === 'idle') && this.attackTimer <= 0) {
            this.wyvernAttackStage = 'windup';
            this.wyvernStageTimer = 0.75;
            this.attackTimer = this.attackCooldown;
          }
        } else {
          if (this.attackTimer <= 0) {
            this.attackTimer = this.attackCooldown;
            this._performAttack(dist);
          }
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

      // Živé máchání dračími křídly (Wyvern Wings)
      if (this.limbMeshes.wings && this.limbMeshes.wings.length > 0) {
        const wingFreq = moveSpeed > 0.05 ? 0.016 : 0.004;
        const wingAmp = moveSpeed > 0.05 ? 0.58 : 0.18;
        const flap = Math.sin(animNow * wingFreq + this.id) * wingAmp;
        this.limbMeshes.wings.forEach((w, i) => {
          w.rotation.z = (i === 0 ? -1 : 1) * flap;
        });
      }

      // Základní pozice a rotace těla
      let rootRotX = 0;
      let rootPosZ = 0;
      const strideBounce = (moveSpeed > 0.05) ? Math.abs(Math.sin(walkPhase)) * 0.035 : 0;
      let rootPosY = strideBounce;

      // Telegrafování a úderová animace při útoku
      if (this.isDragon) {
        if (this.state !== 'Attack' && (!this.wyvernAttackStage || this.wyvernAttackStage === 'idle')) {
          // Klidový cyklus: plynulé dýchání hrudi, mírné kmitání ocasu a slabý žár v hrdle
          if (this.limbMeshes.chest) {
            const idleBreathe = Math.sin(animNow * 0.003 + this.id) * 0.035;
            this.limbMeshes.chest.scale.set(1.0 + idleBreathe, 1.0 + idleBreathe, 1.0 + idleBreathe * 0.5);
          }
          if (this.limbMeshes.throatMat) {
            this.limbMeshes.throatMat.emissiveIntensity = 0.15;
          }
          if (this.limbMeshes.jaw) {
            this.limbMeshes.jaw.rotation.x = 0;
          }
        } else if (this.wyvernAttackStage && this.wyvernAttackStage !== 'idle') {
          this.wyvernStageTimer -= dt;

          if (this.wyvernAttackStage === 'windup') {
            const p = Math.max(0, Math.min(1, 1 - (this.wyvernStageTimer / 0.75)));
            // 1. Wind-up (Příprava): Wyverna se zapře, roztáhne křídla pro rovnováhu, nadechne se a v hrdle se rozsvěcí žár
            rootPosY = strideBounce - 0.20 * Math.sin(p * Math.PI * 0.5);
            rootRotX = -0.24 * p;
            rootPosZ = -0.16 * p;

            if (this.limbMeshes.wings && this.limbMeshes.wings.length > 0) {
              this.limbMeshes.wings.forEach((w, i) => {
                w.rotation.z = (i === 0 ? -1 : 1) * (0.35 + 0.55 * p);
                w.rotation.y = (i === 0 ? 1 : -1) * (0.22 * p);
              });
            }

            if (this.limbMeshes.chest) {
              this.limbMeshes.chest.scale.set(1.0 + 0.22 * p, 1.0 + 0.20 * p, 1.0 + 0.15 * p);
            }

            if (this.limbMeshes.neckSegments && this.limbMeshes.neckSegments.length >= 3) {
              this.limbMeshes.neckSegments[0].rotation.x = -0.42 * p;
              this.limbMeshes.neckSegments[1].rotation.x = 0.38 * p;
              this.limbMeshes.neckSegments[2].rotation.x = -0.28 * p;
            }
            if (this.limbMeshes.head) {
              this.limbMeshes.head.rotation.x = -0.32 * p;
            }

            if (this.limbMeshes.throatMat) {
              const glow = 0.2 + 2.4 * Math.sin(p * Math.PI * 0.5);
              const flicker = Math.sin(animNow * 0.035) * 0.3;
              this.limbMeshes.throatMat.emissiveIntensity = Math.min(3.5, glow + flicker);
            }

            if (this.limbMeshes.jaw) {
              this.limbMeshes.jaw.rotation.x = 0.25 * p;
            }

            if (this.limbMeshes.tail) {
              this.limbMeshes.tail.rotation.x = -0.22 * p;
            }

            if (this.wyvernStageTimer <= 0) {
              this.wyvernAttackStage = 'fire';
              this.wyvernStageTimer = 0.85;
              this._performAttack(dist);
              if (this.limbMeshes.jaw) this.limbMeshes.jaw.rotation.x = 1.15;
              if (this.limbMeshes.throatMat) this.limbMeshes.throatMat.emissiveIntensity = 2.8;
              if (this.limbMeshes.head) this.limbMeshes.head.rotation.x = 0.35;
              rootPosZ = -0.32;
            }
          } else if (this.wyvernAttackStage === 'fire') {
            const p = Math.max(0, Math.min(1, 1 - (this.wyvernStageTimer / 0.85)));

            // 2. Samotný útok: Hlava vyrazí prudce dopředu, čelisti se plně rozevřou, plameny tryskají se zpětným rázem
            if (this.limbMeshes.neckSegments && this.limbMeshes.neckSegments.length >= 3) {
              this.limbMeshes.neckSegments[0].rotation.x = 0.36;
              this.limbMeshes.neckSegments[1].rotation.x = -0.16;
              this.limbMeshes.neckSegments[2].rotation.x = 0.24;
            }
            if (this.limbMeshes.head) {
              this.limbMeshes.head.rotation.x = 0.35;
            }

            if (this.limbMeshes.jaw) {
              this.limbMeshes.jaw.rotation.x = 1.15; // plné rozevření (~66°)
            }

            const recoil = Math.sin(p * Math.PI);
            rootPosZ = -0.38 * Math.max(0.2, recoil);
            rootRotX = 0.18 * recoil;
            rootPosY = strideBounce + (Math.random() - 0.5) * 0.04;

            if (this.limbMeshes.wings && this.limbMeshes.wings.length > 0) {
              this.limbMeshes.wings.forEach((w, i) => {
                w.rotation.z = (i === 0 ? -1 : 1) * (0.42 + Math.sin(animNow * 0.04) * 0.08);
              });
            }

            if (this.limbMeshes.chest) {
              this.limbMeshes.chest.scale.set(1.0 + 0.22 * (1 - p), 1.0 + 0.20 * (1 - p), 1.0 + 0.15 * (1 - p));
            }

            if (this.limbMeshes.tail) {
              this.limbMeshes.tail.rotation.z = Math.sin(p * Math.PI * 2) * 0.48;
            }

            if (this.limbMeshes.throatMat) {
              this.limbMeshes.throatMat.emissiveIntensity = 2.8;
            }

            if (this.wyvernStageTimer <= 0) {
              this.wyvernAttackStage = 'recovery';
              this.wyvernStageTimer = 0.65;
              if (this.limbMeshes.jaw) this.limbMeshes.jaw.rotation.x = 0.35;
              if (this.limbMeshes.throatMat) this.limbMeshes.throatMat.emissiveIntensity = 2.0;
            }
          } else if (this.wyvernAttackStage === 'recovery') {
            const p = Math.max(0, Math.min(1, 1 - (this.wyvernStageTimer / 0.65)));

            // 3. Doznívání: Plynulý návrat do bojového postoje, kouř stoupá z tlamy
            if (this.limbMeshes.jaw) {
              this.limbMeshes.jaw.rotation.x = 0.35 * (1 - p);
            }
            if (this.limbMeshes.neckSegments && this.limbMeshes.neckSegments.length >= 3) {
              this.limbMeshes.neckSegments[0].rotation.x = 0.36 * (1 - p);
              this.limbMeshes.neckSegments[1].rotation.x = -0.16 * (1 - p);
              this.limbMeshes.neckSegments[2].rotation.x = 0.24 * (1 - p);
            }
            if (this.limbMeshes.head) {
              this.limbMeshes.head.rotation.x = 0.35 * (1 - p);
            }

            rootPosZ = -0.38 * (1 - p);
            rootRotX = 0;
            if (this.limbMeshes.chest) {
              this.limbMeshes.chest.scale.set(1, 1, 1);
            }

            if (this.limbMeshes.throatMat) {
              this.limbMeshes.throatMat.emissiveIntensity = Math.max(0.15, 2.8 * (1 - p));
            }

            this.wyvernSmokeCooldown = (this.wyvernSmokeCooldown || 0) - dt;
            if (this.wyvernSmokeCooldown <= 0) {
              this.wyvernSmokeCooldown = 0.16;
              if (typeof window !== 'undefined' && typeof window.spawnWyvernSmokePuff === 'function') {
                const fwdX = Math.sin(this.rotationY);
                const fwdZ = Math.cos(this.rotationY);
                const mouthY = (this.renderY || this.y) + 1.8 * (this.tierScale || 1.0);
                const mouthX = this.x + fwdX * 2.1 * (this.tierScale || 1.0);
                const mouthZ = this.z + fwdZ * 2.1 * (this.tierScale || 1.0);
                window.spawnWyvernSmokePuff(mouthX, mouthY, mouthZ, fwdX, fwdZ, this.dragonType === 'ice');
              }
            }

            if (this.wyvernStageTimer <= 0) {
              this.wyvernAttackStage = 'idle';
            }
          }
        }
      } else {
        // Standardní creature útok (vlci, skřeti, golemové atd.)
        if (this.state === 'Attack') {
          if (this.attackTimer > 0 && this.attackTimer <= 0.45) {
            const tw = 1 - (this.attackTimer / 0.45);
            const windupSin = Math.sin(tw * Math.PI);
            rootRotX = -0.32 * windupSin;
            rootPosY = strideBounce + 0.12 * windupSin;
            if (this.limbMeshes.head) {
              this.limbMeshes.head.rotation.x = -0.38 * windupSin;
            }
            if (this.limbMeshes.arms && this.limbMeshes.arms.length > 0) {
              this.limbMeshes.arms.forEach(arm => { arm.rotation.x = -1.6 * windupSin; });
            }
          } else if (this.attackTimer > this.attackCooldown - 0.22) {
            const ts = (this.attackCooldown - this.attackTimer) / 0.22;
            const strikeSin = Math.sin(ts * Math.PI);
            rootRotX = 0.32 * strikeSin;
            rootPosZ = 0.22 * strikeSin;
            if (this.limbMeshes.head) {
              this.limbMeshes.head.rotation.x = 0.35 * strikeSin;
            }
            if (this.limbMeshes.arms && this.limbMeshes.arms.length > 0) {
              this.limbMeshes.arms.forEach(arm => { arm.rotation.x = 0.55 * strikeSin; });
            }
          }
        }

        if (this.limbMeshes.jaw) {
          if (this.state === 'Attack') {
            if (this.attackTimer > 0 && this.attackTimer <= 0.45) {
              const tw = 1 - (this.attackTimer / 0.45);
              this.limbMeshes.jaw.rotation.x = 0.70 * Math.sin(tw * Math.PI);
            } else if (this.attackTimer > this.attackCooldown - 0.22) {
              const ts = (this.attackCooldown - this.attackTimer) / 0.22;
              this.limbMeshes.jaw.rotation.x = 0.60 * Math.sin(ts * Math.PI);
            } else {
              this.limbMeshes.jaw.rotation.x = 0;
            }
          } else {
            this.limbMeshes.jaw.rotation.x = 0;
          }
        }
      }

      // Lehký odraz tělíčka směrem VZHŮRU při každém kroku (zaručuje, že tlapky nikdy nezajedou pod zem)
      if (this.limbMeshes.root && this.state !== 'Dead') {
        this.limbMeshes.root.rotation.x = rootRotX;
        this.limbMeshes.root.rotation.z = 0;
        this.limbMeshes.root.position.set(0, rootPosY, rootPosZ);
      }

      // Synchronizace 3D scény
      if (this.group) {
        this.group.position.set(this.x, this.renderY, this.z);
        this.group.rotation.y = this.rotationY;
      }

      // Červený záblesk poškození na 3D modelu
      this._updateMeshFlash(dt);
    }

    _updateMeshFlash(dt) {
      if (this.flashTimer > 0) {
        this.flashTimer = Math.max(0, this.flashTimer - dt);
        this._setMeshFlash(this.flashTimer > 0);
      }
    }

    _setMeshFlash(isFlashing) {
      if (!this.group || !this.group.children) return;
      if (typeof this.group.traverse !== 'function') return;
      this.group.traverse(obj => {
        if (obj && obj.material) {
          const mat = obj.material;
          if (mat && mat.emissive && typeof mat.emissive.setHex === 'function') {
            mat.emissive.setHex(isFlashing ? 0xcc2222 : 0x000000);
          }
        }
      });
    }

    // Impozantní vizuální dech draka (plameny / mráz) - přesně jako na obrázku 3!
    _spawnDragonBreathVisual(isIce) {
      const rotY = this.rotationY;
      const fwdX = Math.sin(rotY);
      const fwdZ = Math.cos(rotY);
      if (typeof window.spawnSpectacularDragonBreath === 'function') {
        window.spawnSpectacularDragonBreath(
          this.x,
          (this.renderY || this.y) + 1.2 * (this.tierScale || 1.0),
          this.z,
          fwdX,
          0,
          fwdZ,
          isIce,
          this.tierScale || 1.0,
          false,
          this.baseDamage
        );
      }
    }

    _performAttack(dist) {
      if (this.isPassive || this.baseDamage <= 0) return;
      if (dist > this.attackReach + 0.6) return;

      // Zvuk a masivní vizuální efekt dračího dechu
      if (this.isDragon) {
        const isIce = (this.dragonType === 'ice');
        this._spawnDragonBreathVisual(isIce);
      }

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
        const breathPrefix = this.isDragon ? (this.dragonType === 'ice' ? '❄️ Ledový dech wyverny: ' : '🔥 Ohnivý dech wyverny: ') : '';
        toast(`⚠️ ${breathPrefix}${this.name} tě zasáhl za -${dmg} HP!`);
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
    corpses: [],
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

    computeScaledLevel: function(x = 0, z = 0, baseLevel = null) {
      const pLvl = (typeof P !== 'undefined' && P && typeof P.level === 'number') ? Math.max(1, P.level) : 1;
      if (typeof baseLevel === 'number' && baseLevel > 1) {
        // Pokud je explicitně zadán vyšší level (např. strážce ruin Lv. 2), posílíme ho dle hráče
        return Math.max(baseLevel, pLvl + (baseLevel - 1));
      }
      // Škálování podle vzdálenosti od startovního bodu (každých 180 metrů = +1 level)
      const distFromSpawn = Math.hypot(x, z);
      const distLvlBoost = Math.floor(distFromSpawn / 180);

      // Škálování dle hráče v rozmezí [-1, +2]
      const delta = Math.floor(Math.random() * 4) - 1; // -1, 0, +1, +2
      const targetLvl = pLvl + delta + distLvlBoost;
      return Math.max(1, Math.min(60, targetLvl));
    },

    spawnCreature: function (type, x, y, z, level = null, tier = null) {
      let finalLvl = level;
      if (typeof finalLvl !== 'number' || finalLvl < 1) {
        finalLvl = this.computeScaledLevel(x, z, null);
      }
      const creature = new CreatureInstance(type, x, y, z, finalLvl, tier);
      this.creatures.push(creature);
      return creature;
    },

    spawnCreatureInFrontOfPlayer: function (query, level = 1, tier = null) {
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

      const creature = this.spawnCreature(resolvedType, spawnX, spawnY, spawnZ, level, tier);
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

      // Okamžitě trvale uložit svět i inventář, aby mazlíček nezmizel po restartu
      if (typeof window !== 'undefined' && window.networkManager && typeof window.networkManager.saveSingleplayerWorld === 'function') {
        try { window.networkManager.saveSingleplayerWorld(); } catch (e) {}
      }

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

    // Vytvoření trvalé 3D mrtvoly draka/wyverny s interakcí [E]
    spawnDragonCorpse: function (dataOrType, x, y, z, tier = null) {
      const data = (typeof dataOrType === 'object' && dataOrType !== null) ? dataOrType : {
        typeName: dataOrType,
        x: x || 0,
        y: y || 0,
        z: z || 0,
        tier: tier || 3
      };
      if (typeof THREE === 'undefined' || typeof scene === 'undefined' || !scene) return null;
      const corpseGroup = new THREE.Group();
      corpseGroup.position.set(data.x, data.y, data.z);
      corpseGroup.rotation.y = data.rotationY || 0;

      const limbMeshes = {};
      const root = buildCreatureVoxelGroup(data.typeName || 'WyvernFire', limbMeshes, false);
      if (root) {
        // Poražená poloha: tělo leží na zemi s mírně přeloženými křídly a skloněnou hlavou
        root.position.y = 0.08;
        root.rotation.z = 0.35;
        root.rotation.x = 0.15;
        if (limbMeshes.head) {
          limbMeshes.head.rotation.x = 0.45;
          limbMeshes.head.rotation.z = -0.35;
        }
        if (limbMeshes.wings) {
          limbMeshes.wings.forEach((w, i) => {
            w.rotation.z = (i === 0 ? 0.75 : -0.75);
          });
        }
        if (data.tierScale) {
          root.scale.set(data.tierScale, data.tierScale, data.tierScale);
        }
        corpseGroup.add(root);
      }

      // Interaktivní štítek nad mrtvolou: [E] Prozkoumat mrtvolu draka
      let labelSprite = null;
      let labelCanvas = null;
      let labelTexture = null;
      if (typeof document !== 'undefined') {
        labelCanvas = document.createElement('canvas');
        labelCanvas.width = 320;
        labelCanvas.height = 76;
        const ctx = labelCanvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#f8fafc';
          ctx.font = 'bold 22px sans-serif';
          ctx.textAlign = 'center';
          ctx.shadowColor = '#000000';
          ctx.shadowBlur = 6;
          ctx.fillText(`🐉 Mrtvola draka (${data.name || 'Wyverna'})`, 160, 28);
          ctx.fillStyle = '#38bdf8';
          ctx.font = 'bold 18px sans-serif';
          ctx.fillText(`[E] Prozkoumat a sebrat kořist`, 160, 58);
        }
        labelTexture = new THREE.CanvasTexture(labelCanvas);
        const spMat = new THREE.SpriteMaterial({ map: labelTexture, transparent: true, depthTest: false });
        labelSprite = new THREE.Sprite(spMat);
        labelSprite.scale.set(3.4, 0.80, 1);
        labelSprite.position.set(0, 1.85 * (data.tierScale || 1.0), 0);
        corpseGroup.add(labelSprite);
      }

      scene.add(corpseGroup);

      const corpseObj = {
        id: nextEntityId++,
        x: data.x,
        y: data.y,
        z: data.z,
        dragonType: data.dragonType || (data.typeName === 'WyvernIce' ? 'ice' : 'fire'),
        typeName: data.typeName,
        tier: data.tier || 3,
        group: corpseGroup,
        labelSprite,
        labelTexture,
        looted: false
      };

      if (!this.corpses) this.corpses = [];
      this.corpses.push(corpseObj);
      return corpseObj;
    },

    // Prozkoumání nejbližší mrtvoly draka stiskem klávesy [E]
    tryLootClosestCorpse: function (px, py, pz) {
      if (!this.corpses || this.corpses.length === 0) return false;
      let closest = null;
      let closestDist = 4.0;

      for (const c of this.corpses) {
        if (c.looted) continue;
        const d = Math.hypot(c.x - px, c.z - pz);
        if (d < closestDist) {
          closestDist = d;
          closest = c;
        }
      }

      if (!closest) return false;

      // Vybrání kořisti z dračí mrtvoly!
      closest.looted = true;
      const isIce = (closest.dragonType === 'ice');
      const tier = closest.tier || 3;
      const scaleItemId = isIce ? 'dragon_scales_ice' : 'dragon_scales_fire';
      const bloodItemId = isIce ? 'dragon_blood_ice' : 'dragon_blood_fire';
      const eggItemId   = `egg_dragon_${isIce ? 'ice' : 'fire'}_t${tier}`;

      const scaleCount = 3 + Math.floor(Math.random() * 4); // 3 - 6 šupin
      const boneCount  = 2 + Math.floor(Math.random() * 3); // 2 - 4 kostí
      const bloodCount = 1 + Math.floor(Math.random() * 2); // 1 - 2 krve
      const rollEgg    = Math.random() < 0.30; // 30% šance na dračí vejce!

      if (typeof INV !== 'undefined' && Array.isArray(INV)) {
        const addIt = (id, count) => {
          const item = INV.find(it => it.id === id);
          if (item) item.count = (item.count || 0) + count;
        };
        addIt(scaleItemId, scaleCount);
        addIt('dragon_bone', boneCount);
        addIt(bloodItemId, bloodCount);
        if (rollEgg) {
          addIt(eggItemId, 1);
          // Přidat i do obecného egg_dragon_* pro maximální kompatibilitu
          addIt(isIce ? 'egg_dragon_ice' : 'egg_dragon_fire', 1);
        }
      }

      // Audio zpětná vazba
      if (typeof playAttackSound === 'function') playAttackSound('heavy');
      if (rollEgg && typeof playDragonHatch === 'function') playDragonHatch();

      if (typeof toast === 'function') {
        const eggMsg = rollEgg ? ` 🥚✨ NALEZENO VZÁCNÉ DRAČÍ VEJCE (Tier ${tier})!` : '';
        toast(`🐉 Mrtvola draka prozkoumána: +${scaleCount}x šupiny, +${boneCount}x dračí kost, +${bloodCount}x dračí krev!${eggMsg}`);
      }

      // Rozpad mrtvoly na částice
      if (closest.group && typeof scene !== 'undefined' && scene) {
        if (typeof CombatJuice !== 'undefined' && typeof CombatJuice.spawnCreatureDeathShatter === 'function') {
          CombatJuice.spawnCreatureDeathShatter(closest.x, closest.y + 0.6, closest.z, isIce ? 0x38bdf8 : 0xdc2626);
        }
        scene.remove(closest.group);
        if (closest.labelTexture) closest.labelTexture.dispose();
      }

      const idx = this.corpses.indexOf(closest);
      if (idx >= 0) this.corpses.splice(idx, 1);

      if (typeof renderInv === 'function') renderInv();
      if (typeof updateEquipmentUI === 'function') updateEquipmentUI();

      // Uložit stav světa
      if (typeof window !== 'undefined' && window.networkManager && typeof window.networkManager.saveSingleplayerWorld === 'function') {
        try { window.networkManager.saveSingleplayerWorld(); } catch (e) {}
      }

      return true;
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

      // 4. Aktualizace 3D štítků dračích mrtvol (viditelnost do 25 m)
      if (this.corpses && this.corpses.length > 0) {
        for (const c of this.corpses) {
          if (!c.labelSprite) continue;
          const d = Math.hypot(c.x - playerPos.x, c.z - playerPos.z);
          c.labelSprite.visible = (d <= 25);
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
      if (this.corpses) {
        this.corpses.forEach(c => {
          if (c.group && typeof scene !== 'undefined' && scene) scene.remove(c.group);
          if (c.labelTexture) c.labelTexture.dispose();
        });
        this.corpses = [];
      }
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
      ctx.fillText(`${pet.canFly ? '🐉' : '🐾'} ${pet.name}`, 128, 24);

      ctx.fillStyle = '#fde047';
      ctx.font = 'bold 14px sans-serif';
      if (pet.canFly) {
        ctx.fillText(isRiding ? '✈️ Létáš ([E] sesednout, [R] schovat)' : '🐉 [E] Nasednout & létat · [R] Schovat', 128, 46);
      } else {
        ctx.fillText(isRiding ? '🏇 Jedeš ([E] sesednout, [R] schovat)' : '🐾 [E] Nasednout · [R] Schovat', 128, 46);
      }
      ctx.shadowBlur = 0;

      if (pet.labelTexture) pet.labelTexture.needsUpdate = true;
      if (pet.labelSprite) {
        pet.labelSprite.visible = !isRiding;
      }
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

      const isDragon = (petType === 'WyvernFire' || petType === 'WyvernIce');
      const parsedTier = petItem.tier || (petItemId.match(/_t([1-5])/)?.[1]) || (isDragon ? '3' : '1');
      const tier = Math.min(5, Math.max(1, parseInt(parsedTier, 10)));
      const tierScales = [0.70, 0.95, 1.35, 1.80, 2.45];
      const tierScale = isDragon ? (tierScales[tier - 1] || 1.35) : 1.0;

      if (typeof THREE !== 'undefined') {
        group = new THREE.Group();
        group.position.set(px, py, pz);
        const root = buildCreatureVoxelGroup(petType, limbMeshes, true);
        if (root) group.add(root);
        if (isDragon) {
          group.scale.set(tierScale, tierScale, tierScale);
        }

        if (typeof document !== 'undefined') {
          labelCanvas = document.createElement('canvas');
          labelCanvas.width = 256;
          labelCanvas.height = 64;
          labelTexture = new THREE.CanvasTexture(labelCanvas);
          const spMat = new THREE.SpriteMaterial({ map: labelTexture, transparent: true, depthTest: false });
          labelSprite = new THREE.Sprite(spMat);
          labelSprite.scale.set(2.0, 0.52, 1);
          labelSprite.position.set(0, (cfg.height || 0.8) * tierScale + 0.45, 0);
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
        tier,
        tierScale,
        isDragon,
        dragonType: isDragon ? (petType === 'WyvernIce' ? 'ice' : 'fire') : null,
        x: px,
        y: py,
        z: pz,
        vx: 0,
        vz: 0,
        rotationY: (typeof face !== 'undefined') ? face : 0,
        rideSpeed: petItem.rideSpeed || cfg.rideSpeed || 9.5,
        jumpBoost: petItem.jumpBoost || cfg.jumpBoost || 10.5,
        mountHeight: (cfg.mountHeight || 0.56) * tierScale,
        height: (cfg.height || 0.8) * tierScale,
        baseDamage: petItem.baseDamage || (isDragon ? [35, 60, 95, 140, 220][tier - 1] : cfg.baseDamage || 16),
        canFly: !!(petItem.canFly || cfg.canFly),
        attackReach: (cfg.attackReach || 2.8) * tierScale,
        attackCooldown: cfg.attackCooldown || 1.1,
        attackCooldownTimer: 0,
        attackAnimTimer: 0,
        targetEnemy: null,
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
      P.ridingPet = this.activePet;
      P.ridingPetType = this.activePet.petType;
      P.mountHeight = this.activePet.mountHeight || 0.55;
      P.rideSpeed = this.activePet.rideSpeed || 9.5;
      P.rideJumpBoost = this.activePet.jumpBoost || 10.5;
      P.canFly = !!this.activePet.canFly;

      // Umístit mazlíčka přímo pod hráče bez trhání nebo kolizního zaseknutí hráče
      this.activePet.x = P.x;
      this.activePet.z = P.z;
      this.activePet.y = (typeof P.renderY === 'number') ? P.renderY : P.y;
      this.activePet.rotationY = (typeof model !== 'undefined' && model) ? model.rotation.y : ((typeof face !== 'undefined') ? face : 0);
      if (this.activePet.group) {
        this.activePet.group.position.set(this.activePet.x, this.activePet.y, this.activePet.z);
        this.activePet.group.rotation.y = this.activePet.rotationY;
      }
      this._updatePetLabel();

      if (typeof toast === 'function') {
        const flyNote = this.activePet.canFly ? ' (Mezerník = stoupání, Shift = klesání, LMB = chrlení)' : '';
        toast(`🏇 Jedeš na mazlíčkovi: ${this.activePet.name}!${flyNote} ([E] sesednout, [R] schovat)`);
      }
      return true;
    },

    dismountPet: function (silent = false) {
      if (typeof P === 'undefined' || !P || !P.isRiding) return false;
      P.isRiding = false;
      P.ridingPet = null;
      P.ridingPetType = null;
      P.mountHeight = 0;
      P.canFly = false;

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

    // Chrlení dračího ohně nebo mrazu při jízdě na drakovi (místo útoku zbraní!)
    triggerMountDragonBreath: function () {
      if (!this.activePet || !this.activePet.isDragon) return false;
      const pet = this.activePet;
      if (pet.attackCooldownTimer > 0) return false;

      pet.attackCooldownTimer = 1.15; // plynulý cooldown mezi chrleními
      pet.attackAnimTimer = 1.05;

      // Otevřít tlamu dokořán
      if (pet.limbMeshes && pet.limbMeshes.jaw) {
        pet.limbMeshes.jaw.rotation.x = 0.65;
      }

      const pObj = (typeof P !== 'undefined') ? P : { x: pet.x, y: pet.y, z: pet.z };
      const yawVal = (typeof yaw !== 'undefined') ? yaw : 0;
      const pitchVal = (typeof pitch !== 'undefined') ? pitch : 0;

      const dirX = -Math.sin(yawVal) * Math.cos(pitchVal);
      const dirY = Math.sin(pitchVal);
      const dirZ = -Math.cos(yawVal) * Math.cos(pitchVal);

      // Pozice tlamy draka
      const mouthDist = 1.8 * (pet.tierScale || 1.0);
      const originX = pet.x + dirX * mouthDist;
      const originY = (pet.y || pObj.y) + 1.2 * (pet.tierScale || 1.0);
      const originZ = pet.z + dirZ * mouthDist;

      const isIce = (pet.dragonType === 'ice');
      const dmg = Math.round(pet.baseDamage * 1.5);

      if (typeof window.spawnSpectacularDragonBreath === 'function') {
        window.spawnSpectacularDragonBreath(originX, originY, originZ, dirX, dirY, dirZ, isIce, pet.tierScale || 1.0, true, dmg);
      }

      return true;
    },

    // Útok mazlíčka na nepřátelskou entitu
    attackTarget: function (target) {
      const pet = this.activePet;
      if (!pet || !target || target.state === 'Dead' || target.hp <= 0) return false;
      if (pet.attackCooldownTimer > 0) return false;

      pet.attackCooldownTimer = pet.attackCooldown || 1.1;
      pet.attackAnimTimer = 0.45;

      // Zranění škáluje se základním útokem mazlíčka a úrovní hráče
      const playerLvl = (typeof P !== 'undefined' && P && P.level) ? P.level : 1;
      const lvlBonus = (playerLvl - 1) * 2;
      const baseDmg = pet.baseDamage || 16;
      const isCrit = Math.random() < 0.22;
      const critMult = isCrit ? 1.5 : 1.0;
      const totalDmg = Math.max(1, Math.round((baseDmg + lvlBonus) * critMult));

      const dx = target.x - pet.x;
      const dz = target.z - pet.z;
      const dist = Math.hypot(dx, dz) || 1;
      const kb = {
        x: (dx / dist) * 1.35,
        z: (dz / dist) * 1.35
      };

      target.takeDamage(totalDmg, kb, isCrit, 'pet');

      if (pet.isDragon) {
        const isIce = (pet.dragonType === 'ice');
        if (typeof window.spawnSpectacularDragonBreath === 'function') {
          window.spawnSpectacularDragonBreath(
            pet.x,
            (pet.y || 50) + 1.2 * (pet.tierScale || 1.0),
            pet.z,
            dx / dist,
            0,
            dz / dist,
            isIce,
            pet.tierScale || 1.0,
            true,
            totalDmg
          );
        }
      } else {
        if (typeof playAttackSound === 'function') {
          playAttackSound('punch');
        }
      }

      if (typeof toast === 'function') {
        const critText = isCrit ? ' 💥 KRITICKÝ ÚTOK!' : '';
        toast(`🐾 Mazlíček (${pet.name}) zaútočil na ${target.name || 'nepřítele'}: -${totalDmg} HP${critText}`);
      }

      return true;
    },

    // Reakce na hráčův útok: mazlíček okamžitě zaměří napadeného nepřítele
    onPlayerAttacked: function (target) {
      if (!this.activePet || !target || target.state === 'Dead') return;
      this.activePet.targetEnemy = target;
      if (this.isRiding) {
        const d = Math.hypot(target.x - this.activePet.x, target.z - this.activePet.z);
        if (d <= (this.activePet.attackReach || 2.8) + (target.hitboxRadius || 0.75)) {
          this.attackTarget(target);
        }
      }
    },

    // Obsluha klávesy [R]:
    // 1. Pokud mazlíček není přivolán -> pouze ho vyvolá vedle hráče (BEZ nasednutí!)
    // 2. Pokud je mazlíček již vyvolán -> pouze ho schová / odvolá
    // (Nasednutí a sesednutí je výhradně klávesou [E])
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
            toast('🐾 Nemáš žádného mazlíčka! Ochoč si zvíře v přírodě nebo vylíhni dračí vejce.');
          }
          return false;
        }
      }

      // 1. Pokud mazlíček není přivolán (nebo je ve slotu jiný) -> vyvolat vedle hráče
      if (!this.activePet || this.activePet.petItemId !== equippedPetId) {
        const pet = this.summonPet(equippedPetId);
        if (pet && typeof toast === 'function') {
          toast(`🐾 Mazlíček (${pet.name}) byl přivolán. Pro nasednutí stiskni [E], pro schování [R].`);
        }
        return !!pet;
      }

      // 2. Pokud je mazlíček již vyvolán (nebo na něm hráč sedí) -> schovat / odvolat
      if (typeof P !== 'undefined' && P && P.isRiding) {
        this.dismountPet(true);
      }
      this.despawnPet(false);
      return true;
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

      // Aktualizace časovačů útoku mazlíčka
      if (pet.attackCooldownTimer > 0) pet.attackCooldownTimer -= dt;
      if (pet.attackAnimTimer > 0) pet.attackAnimTimer -= dt;

      // Animace výpadu / kousnutí a rozevření čelisti při útoku nebo chrlení
      let attackLungeHead = 0;
      let attackLungeRoot = 0;
      let attackJawOpen = 0;
      if (pet.attackAnimTimer > 0) {
        if (pet.isDragon) {
          const animDuration = 1.05;
          const progress = Math.max(0, Math.min(1, 1 - (pet.attackAnimTimer / animDuration)));
          if (progress < 0.28) {
            // 1. Wind-up (nápřah, roztažení křídel, expanze hrudníku a žár v hrdle)
            const p = progress / 0.28;
            attackLungeRoot = -0.16 * p;
            attackLungeHead = -0.32 * p;
            attackJawOpen = 0.24 * p + 0.05;
            if (pet.limbMeshes && pet.limbMeshes.chest) {
              pet.limbMeshes.chest.scale.set(1.0 + 0.20 * p, 1.0 + 0.18 * p, 1.0 + 0.12 * p);
            }
            if (pet.limbMeshes && pet.limbMeshes.throatMat) {
              pet.limbMeshes.throatMat.emissiveIntensity = 0.2 + 2.4 * p;
            }
          } else if (progress < 0.70) {
            // 2. Fire Blast & Recoil (výpad, plameny, plné rozevření čelistí a zpětný ráz)
            const p = (progress - 0.28) / 0.42;
            attackLungeHead = 0.35;
            attackJawOpen = 1.15; // plné rozevření čelistí (~66°)
            attackLungeRoot = -0.36 * Math.sin(p * Math.PI);
            if (pet.limbMeshes && pet.limbMeshes.chest) {
              pet.limbMeshes.chest.scale.set(1.0 + 0.20 * (1 - p), 1.0 + 0.18 * (1 - p), 1.0 + 0.12 * (1 - p));
            }
            if (pet.limbMeshes && pet.limbMeshes.throatMat) {
              pet.limbMeshes.throatMat.emissiveIntensity = 2.8;
            }
          } else {
            // 3. Recovery & Smoke (doznění, kouř z tlamy, chladnutí)
            const p = (progress - 0.70) / 0.30;
            attackLungeHead = 0.35 * (1 - p);
            attackJawOpen = 0.28 * (1 - p);
            attackLungeRoot = -0.36 * (1 - p);
            if (pet.limbMeshes && pet.limbMeshes.chest) {
              pet.limbMeshes.chest.scale.set(1, 1, 1);
            }
            if (pet.limbMeshes && pet.limbMeshes.throatMat) {
              pet.limbMeshes.throatMat.emissiveIntensity = Math.max(0.15, 2.8 * (1 - p));
            }
            pet.smokeCool = (pet.smokeCool || 0) - dt;
            if (pet.smokeCool <= 0) {
              pet.smokeCool = 0.16;
              if (typeof window !== 'undefined' && typeof window.spawnWyvernSmokePuff === 'function') {
                const fwdX = -Math.sin(pet.rotationY);
                const fwdZ = -Math.cos(pet.rotationY);
                const mouthY = (pet.y || 50) + 1.8 * (pet.tierScale || 1.0);
                const mouthX = pet.x + fwdX * 2.0 * (pet.tierScale || 1.0);
                const mouthZ = pet.z + fwdZ * 2.0 * (pet.tierScale || 1.0);
                window.spawnWyvernSmokePuff(mouthX, mouthY, mouthZ, fwdX, fwdZ, pet.dragonType === 'ice');
              }
            }
          }
        } else {
          const animDuration = 0.35;
          const progress = Math.max(0, Math.min(1, 1 - (pet.attackAnimTimer / animDuration)));
          const lunge = Math.sin(progress * Math.PI);
          attackLungeHead = -lunge * 0.45;
          attackLungeRoot = lunge * 0.12;
          attackJawOpen = lunge * 0.75;
        }
      }

      // Pomocná funkce pro vyhledání nejlepšího nepřátelského cíle
      const findBestEnemy = () => {
        if (typeof window === 'undefined' || !window.EntityManager || !Array.isArray(window.EntityManager.creatures)) return null;
        if (pet.targetEnemy && pet.targetEnemy.state !== 'Dead' && pet.targetEnemy.hp > 0) {
          const distToP = Math.hypot(pet.targetEnemy.x - pObj.x, pet.targetEnemy.z - pObj.z);
          if (distToP <= 16) return pet.targetEnemy;
        }
        let best = null;
        let bestDist = 12;
        for (const c of window.EntityManager.creatures) {
          if (!c || c.isPassive || c.state === 'Dead' || c.hp <= 0) continue;
          const d = Math.hypot(c.x - pObj.x, c.z - pObj.z);
          if (d < bestDist) {
            bestDist = d;
            best = c;
          }
        }
        return best;
      };

      if (pObj.isRiding) {
        // Hráč jede na mazlíčkovi: mazlíček je přímo pod hráčem a kopíruje jeho pohyb
        pet.x = pObj.x;
        pet.y = (typeof pObj.renderY === 'number') ? pObj.renderY : pObj.y;
        pet.z = pObj.z;
        pet.rotationY = (typeof model !== 'undefined' && model) ? model.rotation.y : ((typeof face !== 'undefined') ? face : 0);

        // Automatický útok mazlíčka na nepřátele v dosahu při jízdě
        const enemy = findBestEnemy();
        if (enemy && pet.attackCooldownTimer <= 0) {
          const d = Math.hypot(enemy.x - pet.x, enemy.z - pet.z);
          if (d <= (pet.attackReach || 2.8) + (enemy.hitboxRadius || 0.75)) {
            this.attackTarget(enemy);
          }
        }

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
          const bob = (mv > 0.15 && pObj.ground !== false) ? Math.abs(Math.sin(ridePhase)) * 0.035 : 0;
          pet.limbMeshes.root.position.y = bob;
          pet.limbMeshes.root.position.z = attackLungeRoot;
        }
        if (pet.limbMeshes && pet.limbMeshes.head) {
          const headBob = (mv > 0.15) ? Math.sin(ridePhase * 2) * 0.05 : 0;
          pet.limbMeshes.head.rotation.x = headBob + attackLungeHead;
        }
        if (pet.limbMeshes && pet.limbMeshes.tail) {
          pet.limbMeshes.tail.rotation.z = Math.sin(animTime * 0.01) * 0.25;
        }
        if (pet.limbMeshes && pet.limbMeshes.wings) {
          const isFlying = pObj.canFly && (pObj.ground === false || mv > 0.1);
          const wingFreq = isFlying ? 0.018 : (mv > 0.15 ? 0.012 : 0.0035);
          const wingAmp = isFlying ? 0.72 : (mv > 0.15 ? 0.45 : 0.16);
          const flap = Math.sin(animTime * wingFreq) * wingAmp;
          pet.limbMeshes.wings.forEach((w, i) => {
            w.rotation.z = (i === 0 ? -1 : 1) * flap;
          });
        }
      } else {
        // Mazlíček je věrný společník a ochránce!
        const enemy = findBestEnemy();
        let targetX, targetZ;
        let moveSpd = 0;

        if (enemy) {
          // Mazlíček útočí na nepřítele
          pet.targetEnemy = enemy;
          targetX = enemy.x;
          targetZ = enemy.z;
          const dx = targetX - pet.x;
          const dz = targetZ - pet.z;
          const distToEnemy = Math.hypot(dx, dz);
          const reach = (pet.attackReach || 2.5) + (enemy.hitboxRadius || 0.65);

          pet.rotationY = Math.atan2(dx, dz);

          if (distToEnemy <= reach) {
            if (pet.attackCooldownTimer <= 0) {
              this.attackTarget(enemy);
            }
          } else {
            moveSpd = Math.min((pet.rideSpeed || 9.5) * 1.15, distToEnemy * 4.0);
            const nx = dx / distToEnemy;
            const nz = dz / distToEnemy;
            pet.x += nx * moveSpd * dt;
            pet.z += nz * moveSpd * dt;
          }
        } else {
          // Žádný nepřítel: mazlíček věrně následuje hráče po boku
          pet.targetEnemy = null;
          const targetAngle = ((typeof face !== 'undefined') ? face : 0) - Math.PI * 0.45;
          targetX = pObj.x + Math.sin(targetAngle) * 1.65;
          targetZ = pObj.z + Math.cos(targetAngle) * 1.65;
          const dx = targetX - pet.x;
          const dz = targetZ - pet.z;
          const dist = Math.hypot(dx, dz);

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
          const bob = (moveSpd > 0.2) ? Math.abs(Math.sin(followPhase)) * 0.035 : 0;
          pet.limbMeshes.root.position.y = bob;
          pet.limbMeshes.root.position.z = attackLungeRoot;
        }
        if (pet.limbMeshes && pet.limbMeshes.head) {
          const idleHead = (moveSpd > 0.2) ? Math.sin(followPhase * 2) * 0.05 : Math.sin(animTime * 0.003) * 0.04;
          pet.limbMeshes.head.rotation.x = idleHead + attackLungeHead;
        }
        if (pet.limbMeshes && pet.limbMeshes.tail) {
          pet.limbMeshes.tail.rotation.z = Math.sin(animTime * 0.008) * 0.22;
        }
        if (pet.limbMeshes && pet.limbMeshes.wings) {
          const wingFreq = moveSpd > 0.2 ? 0.014 : 0.0035;
          const wingAmp = moveSpd > 0.2 ? 0.50 : 0.15;
          const flap = Math.sin(animTime * wingFreq) * wingAmp;
          pet.limbMeshes.wings.forEach((w, i) => {
            w.rotation.z = (i === 0 ? -1 : 1) * flap;
          });
        }
      }

      if (pet.limbMeshes && pet.limbMeshes.jaw) {
        pet.limbMeshes.jaw.rotation.x = attackJawOpen;
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

