// ---------- Položky, 3D Voxelové Zbraně, Rarity & RPG Statistiky ----------
const RARITY_INFO = {
  common: { name: 'Běžné', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.14)', border: 'rgba(148, 163, 184, 0.4)' },
  uncommon: { name: 'Neobyčejné', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.18)', border: 'rgba(34, 197, 94, 0.55)' },
  rare: { name: 'Vzácné', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.22)', border: 'rgba(56, 189, 248, 0.65)' },
  epic: { name: 'Epické', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.24)', border: 'rgba(168, 85, 247, 0.72)' },
  legendary: { name: 'Legendární', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.28)', border: 'rgba(245, 158, 11, 0.85)' }
};

const INV = [
  // Zbraně & Štíty
  {
    id: 'sword',
    name: 'Ocelový meč',
    cat: 'weapon',
    subcat: 'sword',
    rarity: 'uncommon',
    damage: 26,
    reach: 3.2,
    speed: 1.1,
    critChance: 0.12,
    desc: 'Vyvážený jednoruční meč z kalené oceli. Spolehlivý v boji zblízka.',
    statList: ['⚔️ Poškození: 26 HP', '🎯 Dosah: 3.2 m', '⚡ Rychlost: 1.1×', '💥 Šance na kritický zásah: 12%']
  },
  {
    id: 'spear',
    name: 'Rytířské kopí',
    cat: 'weapon',
    subcat: 'spear',
    rarity: 'rare',
    damage: 34,
    reach: 4.8,
    speed: 0.95,
    critChance: 0.15,
    desc: 'Dlouhé obouruční kopí s ocelovým hrotem. Umožňuje probodnout nepřátele z bezpečné vzdálenosti.',
    statList: ['⚔️ Poškození: 34 HP', '🎯 Extra dosah: 4.8 m', '⚡ Bodný útok: 0.95×', '🛡️ Průraznost zbroje: +15%']
  },
  {
    id: 'dagger',
    name: 'Zlodějská dýka',
    cat: 'weapon',
    subcat: 'other',
    rarity: 'uncommon',
    damage: 18,
    reach: 2.2,
    speed: 1.6,
    critChance: 0.30,
    desc: 'Extrémně rychlá čepel pro zákeřné a bleskurychlé bodné útoky.',
    statList: ['⚔️ Poškození: 18 HP', '⚡ Rychlost útoku: 1.6×', '🎯 Dosah: 2.2 m', '💥 Zvýšený kritický zásah: 30%']
  },
  {
    id: 'battleaxe',
    name: 'Válečná sekera',
    cat: 'weapon',
    subcat: 'other',
    rarity: 'rare',
    damage: 42,
    reach: 3.4,
    speed: 0.8,
    critChance: 0.18,
    desc: 'Těžká dvoubřitá sekera schopná rozdrtit i to nejtvrdší brnění.',
    statList: ['⚔️ Poškození: 42 HP', '💥 Drtivý zásah: +20%', '🎯 Dosah: 3.4 m', '⚡ Rychlost: 0.8× (Těžká)']
  },
  {
    id: 'mace',
    name: 'Okovaný palcát',
    cat: 'weapon',
    subcat: 'other',
    rarity: 'uncommon',
    damage: 30,
    reach: 3.0,
    speed: 1.0,
    critChance: 0.10,
    desc: 'Hrotitá železná hlavice navržená na lámání kostí a štítů.',
    statList: ['⚔️ Poškození: 30 HP', '🛡️ Odmrštění cíle: +25%', '🎯 Dosah: 3.0 m', '⚡ Rychlost: 1.0×']
  },
  {
    id: 'greatsword',
    name: 'Obouruční meč',
    cat: 'weapon',
    subcat: 'sword',
    rarity: 'epic',
    damage: 54,
    reach: 3.9,
    speed: 0.72,
    critChance: 0.20,
    desc: 'Masivní obouruční zbraň s drtivým plošným seknutím.',
    statList: ['⚔️ Poškození: 54 HP', '🌀 Plošný sek: 3.9 m', '💥 Odmrštění: +40%', '⚡ Rychlost: 0.72×']
  },
  {
    id: 'staff_fire',
    name: 'Ohnivá hůl',
    cat: 'weapon',
    subcat: 'staff',
    rarity: 'legendary',
    damage: 62,
    reach: 5.5,
    speed: 0.85,
    critChance: 0.25,
    desc: 'Mocná magická hůl vyzařující žár dračího plamene. Sežehne nepřátele na dálku.',
    statList: ['🔥 Magické poškození: 62 HP', '🎯 Dosah: 5.5 m', '✨ Ohnivá exploze', '💥 Šance na kritický zásah: 25%']
  },
  {
    id: 'staff_frost',
    name: 'Mrazivá ledová hůl',
    cat: 'weapon',
    subcat: 'staff',
    rarity: 'legendary',
    damage: 58,
    reach: 5.6,
    speed: 0.9,
    critChance: 0.22,
    desc: 'Prastará hůl vyřezaná z polárního dřeva s pulzujícím ledovým krystalem. Vrhá mrazivý vichr a zpomaluje protivníky.',
    statList: ['❄️ Magické poškození: 58 HP', '🎯 Dosah kouzla: 5.6 m', '🧊 Mrazivé zpomalení cíle: -40%', '💥 Šance na kritický zásah: 22%']
  },
  {
    id: 'bow',
    name: 'Tisový luk',
    cat: 'weapon',
    subcat: 'bow',
    rarity: 'rare',
    damage: 36,
    reach: 8.5,
    speed: 1.0,
    critChance: 0.22,
    desc: 'Pružný lovecký luk s vynikajícím dostřelem a přesností.',
    statList: ['🏹 Střelecké poškození: 36 HP', '🎯 Daleký dostřel: 8.5 m', '⚡ Rychlost nátahu: 1.0×']
  },
  {
    id: 'hammer',
    name: 'Kovářské kladivo',
    cat: 'weapon',
    subcat: 'other',
    rarity: 'epic',
    damage: 50,
    reach: 3.2,
    speed: 0.7,
    critChance: 0.20,
    desc: 'Monstrózní perlík schopný způsobit otřes země při každém úderu.',
    statList: ['⚔️ Poškození: 50 HP', '💥 Otřes země a omráčení', '🛡️ Proráží obranu: +35%', '⚡ Rychlost: 0.7×']
  },
  {
    id: 'katana',
    name: 'Východní katana',
    cat: 'weapon',
    subcat: 'sword',
    rarity: 'legendary',
    damage: 46,
    reach: 3.6,
    speed: 1.35,
    critChance: 0.35,
    desc: 'Mistrovsky kovaná čepel ostrá jako břitva. Rychlá a smrtící.',
    statList: ['⚔️ Poškození: 46 HP', '⚡ Bleskový sek: 1.35×', '💥 Šance na kritický zásah: 35%', '🎯 Dosah: 3.6 m']
  },
  {
    id: 'shield_wood',
    name: 'Dubový okrouhlý štít',
    cat: 'weapon',
    subcat: 'shield',
    slot: 'shield',
    rarity: 'uncommon',
    defense: 0.16,
    blockPower: 0.65,
    desc: 'Pevný dřevěný štít s okovaným okrajem a puklicí. Spolehlivě vykryje bodné i sečné útoky.',
    statList: ['🛡️ Pasivní obrana: +16%', '🛡️ Vykrytí útoků: 65%', '⚔️ Aktivní blok (Pravé tlačítko myši)', '💨 Lehký štít bez postihu k rychlosti']
  },
  {
    id: 'shield_iron',
    name: 'Královský erbovní štít',
    cat: 'weapon',
    subcat: 'shield',
    slot: 'shield',
    rarity: 'epic',
    defense: 0.30,
    blockPower: 0.90,
    desc: 'Těžký plátový štít rytířů královské gardy. Vykryje i ty nejtvrdší drtivé rány a odrazí šípy.',
    statList: ['🛡️ Masivní obrana: +30%', '🛡️ Vykrytí útoků: 90%', '🛡️ Absorpce drtivých ran', '⚔️ Aktivní blok (Pravé tlačítko myši)']
  },

  // Oblečení & Brnění
  {
    id: 'cape_black',
    name: 'Černý plášť stínů',
    cat: 'armor',
    subcat: 'cape',
    slot: 'cape',
    rarity: 'epic',
    color: 0x16171d,
    defense: 0.12,
    bonusHp: 15,
    bonusSpeed: 0.15,
    desc: 'Tajemný vlající plášť utkaný ze stínů noci. Zvyšuje rychlost pohybu.',
    statList: ['🛡️ Obrana těla: +12%', '🏃 Rychlost běhu: +15%', '❤️ Bonusové zdraví: +15 HP', '⚡ Rychlejší obnova staminy']
  },
  {
    id: 'cape_royal',
    name: 'Královský plášť',
    cat: 'armor',
    subcat: 'cape',
    slot: 'cape',
    rarity: 'legendary',
    color: 0x8e1b24,
    defense: 0.18,
    bonusHp: 30,
    bonusSpeed: 0.10,
    desc: 'Purpurový plášť se zlatým lemováním nošený starověkými králi.',
    statList: ['🛡️ Obrana těla: +18%', '❤️ Bonusové zdraví: +30 HP', '👑 Královská autorita', '🏃 Rychlost běhu: +10%']
  },
  {
    id: 'hood_hunter',
    name: 'Lovecká kápě',
    cat: 'armor',
    subcat: 'cloth',
    slot: 'head',
    rarity: 'uncommon',
    color: 0x2f4836,
    defense: 0.12,
    bonusHp: 15,
    bonusSpeed: 0.06,
    desc: 'Nenápadná maskovací kápě lesních stopařů a lovců.',
    statList: ['🛡️ Obrana hlavy: +12%', '🎯 Přesnost zásahů: +15%', '❤️ Zdraví: +15 HP', '🏃 Rychlost: +6%']
  },
  {
    id: 'helmet_iron',
    name: 'Rytířská přilba',
    cat: 'armor',
    subcat: 'armor',
    slot: 'head',
    rarity: 'rare',
    color: 0x9aa3b4,
    defense: 0.18,
    bonusHp: 20,
    desc: 'Ocelová uzavřená přilba s průzorem chránící hlavu před smrtícími seky.',
    statList: ['🛡️ Obrana hlavy: +18%', '❤️ Extra zdraví: +20 HP', '🛡️ Odolnost proti omráčení']
  },
  {
    id: 'tunic_linen',
    name: 'Plátěná tunika',
    cat: 'armor',
    subcat: 'cloth',
    slot: 'chest',
    rarity: 'common',
    color: 0x4a7c59,
    defense: 0.06,
    bonusHp: 10,
    bonusSpeed: 0.05,
    desc: 'Lehká a pohodlná tunika vhodná na cesty divočinou.',
    statList: ['🛡️ Obrana těla: +6%', '❤️ Zdraví: +10 HP', '🏃 Lehký oděv: +5% rychlost']
  },
  {
    id: 'robe_mage',
    name: 'Kouzelnické roucho',
    cat: 'armor',
    subcat: 'cloth',
    slot: 'chest',
    rarity: 'epic',
    color: 0x24336a,
    defense: 0.15,
    bonusHp: 20,
    bonusSpeed: 0.10,
    desc: 'Hedvábné roucho protkané magickými runami a ochrannými bariérami.',
    statList: ['🛡️ Obrana těla: +15%', '✨ Síla kouzel: +25%', '❤️ Zdraví: +20 HP', '🏃 Rychlost: +10%']
  },
  {
    id: 'armor_iron',
    name: 'Rytířský kyrys',
    cat: 'armor',
    subcat: 'armor',
    slot: 'chest',
    rarity: 'rare',
    color: 0x9aa3b4,
    defense: 0.28,
    bonusHp: 40,
    bonusSpeed: -0.05,
    desc: 'Robustní ocelový kyrys kovaný k ochraně srdce před drtivými údery.',
    statList: ['🛡️ Masivní obrana těla: +28%', '❤️ Extra zdraví: +40 HP', '🛡️ Odolnost proti sražení']
  },
  {
    id: 'pants_leather',
    name: 'Kožené kalhoty',
    cat: 'armor',
    subcat: 'cloth',
    slot: 'legs',
    rarity: 'common',
    color: 0x6e4726,
    defense: 0.08,
    bonusHp: 10,
    bonusSpeed: 0.05,
    desc: 'Pevné kalhoty z jelení kůže s vyztuženými koleny.',
    statList: ['🛡️ Obrana nohou: +8%', '❤️ Zdraví: +10 HP', '⚡ Kapacita staminy: +15%']
  },
  {
    id: 'pants_plate',
    name: 'Plátové nohavice',
    cat: 'armor',
    subcat: 'armor',
    slot: 'legs',
    rarity: 'rare',
    color: 0x7c8594,
    defense: 0.22,
    bonusHp: 25,
    bonusSpeed: 0.0,
    desc: 'Ocelové plátové nohavice chránící stehna a holeně.',
    statList: ['🛡️ Obrana nohou: +22%', '❤️ Extra zdraví: +25 HP', '🛡️ Ochrana před pádem']
  },
  {
    id: 'boots_leather',
    name: 'Cestovní boty',
    cat: 'armor',
    subcat: 'cloth',
    slot: 'feet',
    rarity: 'common',
    color: 0x2e251e,
    defense: 0.05,
    bonusHp: 5,
    bonusSpeed: 0.10,
    desc: 'Pohodlná kožená obuv určená pro dlouhé pochody terénem.',
    statList: ['🛡️ Obrana nohou: +5%', '🏃 Rychlost chůze a běhu: +10%', '❤️ Zdraví: +5 HP']
  },
  {
    id: 'boots_fur',
    name: 'Kožešinové boty',
    cat: 'armor',
    subcat: 'cloth',
    slot: 'feet',
    rarity: 'uncommon',
    color: 0x4a3b30,
    defense: 0.10,
    bonusHp: 15,
    bonusSpeed: 0.08,
    desc: 'Teplé boty vystlané horskou kožešinou. Chrání před mrazem.',
    statList: ['🛡️ Obrana nohou: +10%', '❤️ Zdraví: +15 HP', '❄️ Odolnost v horách a sněhu', '🏃 Rychlost: +8%']
  },
  {
    id: 'boots_plate',
    name: 'Plátové boty',
    cat: 'armor',
    subcat: 'armor',
    slot: 'feet',
    rarity: 'rare',
    color: 0x7c8594,
    defense: 0.16,
    bonusHp: 15,
    bonusSpeed: -0.02,
    desc: 'Těžké okované plátové boty poskytující neprostupnou ochranu nohou.',
    statList: ['🛡️ Obrana nohou: +16%', '❤️ Extra zdraví: +15 HP', '🛡️ Stabilita při pádu']
  },

  // 4 Prsteny
  {
    id: 'ring_ruby',
    name: 'Rubínový prsten síly',
    cat: 'loot',
    subcat: 'ring',
    slot: 'ring',
    rarity: 'rare',
    bonusDamage: 12,
    bonusCrit: 0.08,
    desc: 'Zlatý prsten osazený planoucím rubínem. Vlévá nositeli do žil divokou bojovou sílu.',
    statList: ['⚔️ Bonus k poškození: +12 HP', '💥 Bonus ke kritickému zásahu: +8%', '🔥 Ohnivá válečná aura']
  },
  {
    id: 'ring_emerald',
    name: 'Smaragdový prsten vitality',
    cat: 'loot',
    subcat: 'ring',
    slot: 'ring',
    rarity: 'rare',
    bonusHp: 35,
    desc: 'Tajemný prsten z leštěného smaragdu pulzující životní silou hvozdů.',
    statList: ['❤️ Bonusové zdraví: +35 HP', '🌿 Ochrana před vyčerpáním staminy']
  },
  {
    id: 'ring_sapphire',
    name: 'Safírový prsten moudrosti',
    cat: 'loot',
    subcat: 'ring',
    slot: 'ring',
    rarity: 'epic',
    bonusSpeed: 0.14,
    bonusHp: 15,
    desc: 'Prsten z meteorického stříbra s modrým safírem propůjčující nositeli lehkost větru.',
    statList: ['🏃 Rychlost běhu: +14%', '❤️ Bonusové zdraví: +15 HP', '⚡ Rychlejší regenerace staminy']
  },
  {
    id: 'ring_gold',
    name: 'Zlatý prsten ochrany',
    cat: 'loot',
    subcat: 'ring',
    slot: 'ring',
    rarity: 'uncommon',
    defense: 0.10,
    bonusHp: 15,
    desc: 'Ryzí zlatý prsten opatřený ochrannou runou bránící nositele před zraněním.',
    statList: ['🛡️ Ochrana těla: +10%', '❤️ Bonusové zdraví: +15 HP']
  },

  // Suroviny & Spotřební předměty (Loot)
  {
    id: 'wood',
    name: 'Dubové dřevo',
    cat: 'loot',
    subcat: 'material',
    count: 10,
    rarity: 'common',
    desc: 'Základní stavební materiál získaný kácením lesních stromů.',
    statList: ['🪵 Základní stavební materiál', '🔨 Vhodné na výrobu nástrojů']
  },
  {
    id: 'stone',
    name: 'Kamenný blok',
    cat: 'loot',
    subcat: 'material',
    count: 8,
    rarity: 'common',
    desc: 'Pevný opracovaný kámen pro budování opevnění.',
    statList: ['🪨 Odolný stavební kámen', '🏰 Ochrana před zničením']
  },
  {
    id: 'ore_iron',
    name: 'Železná ruda',
    cat: 'loot',
    subcat: 'material',
    count: 8,
    rarity: 'uncommon',
    desc: 'Surové železo vytěžené z hlubin skalnatých hor.',
    statList: ['⛏️ Kovový materiál', '⚔️ Základ pro zbraně a zbroje']
  },
  {
    id: 'ore_gold',
    name: 'Zlatý valoun',
    cat: 'loot',
    subcat: 'material',
    count: 4,
    rarity: 'rare',
    desc: 'Třpytivý valoun ryzího zlata s vysokou hodnotou.',
    statList: ['💰 Vzácný drahý kov', '✨ Magická vodivost']
  },
  {
    id: 'gem_ruby',
    name: 'Ohnivý rubín',
    cat: 'loot',
    subcat: 'material',
    count: 2,
    rarity: 'epic',
    desc: 'Zářící rudý drahokam plný spalující elementární energie.',
    statList: ['💎 Epický drahokam', '🔥 Ohnivá elementární síla']
  },
  {
    id: 'gem_sapphire',
    name: 'Hvězdný safír',
    cat: 'loot',
    subcat: 'material',
    count: 2,
    rarity: 'legendary',
    desc: 'Legendární křišťálově modrý safír pulzující vesmírnou energií.',
    statList: ['💎 Legendární drahokam', '✨ Nekonečná magická moc']
  },
  {
    id: 'leather',
    name: 'Vyčiněná useň',
    cat: 'loot',
    subcat: 'material',
    count: 6,
    rarity: 'common',
    desc: 'Kvalitní pružná useň pro výrobu toulců a zbrojí.',
    statList: ['🧵 Kožený materiál', '🛡️ Výroba lehkého vybavení']
  },
  {
    id: 'potion_hp',
    name: 'Léčivý lektvar',
    cat: 'loot',
    subcat: 'consumable',
    count: 3,
    rarity: 'uncommon',
    healHp: 40,
    desc: 'Hojivý elixír uvařený z léčivých lesních bylin.',
    statList: ['❤️ Okamžitě vyléčí +40 HP', '🧪 Jednorázové použití']
  },
  {
    id: 'apple',
    name: 'Zlaté jablko',
    cat: 'loot',
    subcat: 'consumable',
    count: 2,
    rarity: 'rare',
    healHp: 25,
    restoreStamina: 100,
    desc: 'Posvátné ovoce poskytující okamžité zotavení těla i ducha.',
    statList: ['❤️ Vyléčí +25 HP', '⚡ Okamžitě doplní 100% staminy']
  },
  {
    id: 'torch',
    name: 'Pochodeň',
    cat: 'loot',
    subcat: 'consumable',
    count: 4,
    rarity: 'common',
    desc: 'Spolehlivý zdroj světla zahánějící temnotu jeskyní a noci.',
    statList: ['🔥 Zdroj teplého světla', '👁️ Zlepšuje viditelnost']
  }
];

const STEEL = 0xd5dbe6, DSTEEL = 0x8f98ab, GOLD = 0xe8c34a, LEATHER = 0x3a2a1e, WOOD = 0x6a3f1e;

const W3 = (() => {
  const sw = [], sp = [], dg = [], ba = [], mc = [], gs = [], sf = [], bw = [], hm = [], kt = [];

  // 1. Meč (vyvážený jednoruční rytířský meč)
  bx(sw, -1, -1, -3, 1, 1, 2, WOOD);
  bx(sw, -1, -1, -5, 1, 1, -3, GOLD);
  bx(sw, -3, -1, 2, 3, 1, 4, GOLD);
  bx(sw, -1, -1, 4, 1, 1, 28, STEEL);
  bx(sw, 0, -1, 28, 0, 1, 31, STEEL);

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

  // 8. Mrazivá hůl
  const sff = [];
  bx(sff, -1, -1, -10, 1, 1, 32, 0x1e293b);
  bx(sff, -2, -2, 28, 2, 2, 33, 0xd5dbe6);
  bx(sff, -3, -3, 33, 3, 3, 35, 0x0284c7);
  bx(sff, -2, -2, 35, 2, 2, 42, 0x38bdf8);
  bx(sff, -1, -1, 42, 1, 1, 46, 0xe0f2fe);
  bx(sff, -3, -1, 37, 3, 1, 40, 0x7dd3fc);

  // 9. Luk
  bx(bw, -1, -1, -1, 1, 1, 2, LEATHER);
  bx(bw, -1, -1, 2, 1, 7, 18, 0x8a5a30);
  bx(bw, -1, -1, -18, 1, 7, -1, 0x8a5a30);
  bx(bw, -1, 7, -18, 1, 8, 18, 0xe0e6ed);

  // 10. Kladivo
  bx(hm, -1, -1, -6, 1, 1, 26, WOOD);
  bx(hm, -1, -1, -9, 1, 1, -6, DSTEEL);
  bx(hm, -6, -4, 20, 6, 4, 29, STEEL);
  bx(hm, -8, -3, 22, 8, 3, 27, DSTEEL);

  // 11. Katana
  bx(kt, -1, -1, -8, 1, 1, 1, 0x1f2421);
  bx(kt, -3, -1, 1, 3, 1, 3, GOLD);
  bx(kt, -1, -1, 3, 1, 1, 5, GOLD);
  bx(kt, -1, -1, 5, 1, 1, 37, STEEL);
  bx(kt, 0, -1, 37, 1, 1, 40, STEEL);

  // 12. Dubový štít (kruhový)
  const shw = [];
  bx(shw, -5, -6, -1, 5, 6, 0, 0x6a3f1e);
  bx(shw, -6, -5, -1, 6, 5, 0, 0x6a3f1e);
  bx(shw, -6, -2, 0, 6, 2, 1, 0x8f98ab);
  bx(shw, -2, -6, 0, 2, 6, 1, 0x8f98ab);
  bx(shw, -2, -2, 1, 2, 2, 2, 0xd5dbe6);
  bx(shw, -1, -1, 2, 1, 1, 3, 0xffffff);

  // 13. Královský erbovní štít
  const shi = [];
  bx(shi, -5, -6, -1, 5, 6, 0, 0xd5dbe6);
  bx(shi, -4, -9, -1, 4, -6, 0, 0xd5dbe6);
  bx(shi, -2, -12, -1, 2, -9, 0, 0xd5dbe6);
  bx(shi, -5, -6, 0, 5, 6, 1, 0x8f98ab);
  bx(shi, -1, -10, 1, 1, 5, 2, 0xe8c34a);
  bx(shi, -4, 0, 1, 4, 2, 2, 0xe8c34a);
  bx(shi, -2, 0, 2, 2, 2, 3, 0xffffff);

  const o = {
    sword: createSingleVoxMesh(sw, 0, 0, 0),
    spear: createSingleVoxMesh(sp, 0, 0, 0),
    dagger: createSingleVoxMesh(dg, 0, 0, 0),
    battleaxe: createSingleVoxMesh(ba, 0, 0, 0),
    mace: createSingleVoxMesh(mc, 0, 0, 0),
    greatsword: createSingleVoxMesh(gs, 0, 0, 0),
    staff_fire: createSingleVoxMesh(sf, 0, 0, 0),
    staff_frost: createSingleVoxMesh(sff, 0, 0, 0),
    bow: createSingleVoxMesh(bw, 0, 0, 0),
    hammer: createSingleVoxMesh(hm, 0, 0, 0),
    katana: createSingleVoxMesh(kt, 0, 0, 0),
    shield_wood: createSingleVoxMesh(shw, 0, 0, 0),
    shield_iron: createSingleVoxMesh(shi, 0, 0, 0)
  };
  return o;
})();

const W3_OFF = {};
function initOffhandWeapons() {
  for (const k in W3) {
    if (W3[k]) {
      const clone = W3[k].clone();
      clone.visible = false;
      W3_OFF[k] = clone;
    }
  }
}
initOffhandWeapons();

function attachWeaponsToHand(targetHand, targetOffhand) {
  if (!targetHand) return;
  for (const k in W3) {
    targetHand.add(W3[k]);
    W3[k].visible = false;
  }
  if (targetOffhand) {
    for (const k in W3_OFF) {
      targetOffhand.add(W3_OFF[k]);
      W3_OFF[k].visible = false;
    }
  }
}

function createWeaponInstances() {
  const o = {};
  for (const k in W3) {
    if (W3[k]) {
      const clone = W3[k].clone();
      clone.visible = false;
      o[k] = clone;
    }
  }
  return o;
}

function applyHeld() {
  const mainHandItem = (typeof getEquippedMainHandId === 'function') ? getEquippedMainHandId() : (HB[hbSel] || heldId);
  const offHandItem = (typeof getEquippedOffHandId === 'function') ? getEquippedOffHandId() : null;
  for (const k in W3) {
    if (W3[k]) W3[k].visible = (k === mainHandItem);
  }
  for (const k in W3_OFF) {
    if (W3_OFF[k]) W3_OFF[k].visible = (k === offHandItem);
  }
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
    // --- ZBRANĚ & ŠTÍTY ---
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
    case 'staff_frost':
      ln(2, 14, 10, 6, '#1e293b'); bx2(10, 3, 4, 4, '#0284c7'); bx2(11, 2, 3, 3, '#38bdf8'); px(12, 3, '#e0f2fe'); px(13, 1, '#ffffff'); break;
    case 'bow':
      ln(3, 3, 13, 3, '#8a5a30'); ln(13, 3, 13, 13, '#8a5a30'); ln(3, 3, 3, 13, '#8a5a30'); ln(3, 13, 13, 13, '#e0e6ed'); ln(3, 3, 13, 13, '#ffffff'); break;
    case 'hammer':
      ln(2, 14, 9, 7, '#6a3f1e'); bx2(8, 2, 6, 4, '#8f98ab'); bx2(10, 4, 4, 4, '#5a6375'); px(9, 3, '#d5dbe6'); break;
    case 'katana':
      ln(3, 13, 5, 11, '#1f2421'); px(6, 10, '#ffd86b'); ln(7, 9, 14, 2, '#d5dbe6'); ln(8, 9, 15, 2, '#ffffff'); break;
    case 'shield_wood':
      bx2(4, 3, 8, 10, '#6a3f1e'); bx2(3, 4, 10, 8, '#6a3f1e'); ln(3, 8, 12, 8, '#8f98ab'); ln(8, 3, 8, 12, '#8f98ab'); bx2(7, 7, 2, 2, '#ffffff'); break;
    case 'shield_iron':
      bx2(3, 2, 10, 7, '#d5dbe6'); bx2(4, 9, 8, 3, '#d5dbe6'); bx2(6, 12, 4, 2, '#d5dbe6'); px(7, 14, '#8f98ab'); ln(7, 3, 7, 12, '#e8c34a'); ln(4, 6, 11, 6, '#e8c34a'); break;

    // --- OBLEČENÍ & BRNĚNÍ ---
    case 'cape_black':
      bx2(4, 2, 8, 2, '#3a4252'); bx2(3, 4, 10, 9, '#161820'); bx2(4, 13, 8, 2, '#0f1117'); px(2, 3, '#ffd86b'); px(13, 3, '#ffd86b'); break;
    case 'cape_royal':
      bx2(4, 2, 8, 2, '#ffd86b'); bx2(3, 4, 10, 9, '#8e1b24'); bx2(4, 13, 8, 2, '#ffd86b'); px(5, 8, '#c73642'); px(10, 8, '#c73642'); break;
    case 'hood_hunter':
      bx2(4, 3, 8, 9, '#2f4836'); bx2(3, 5, 10, 6, '#2f4836'); bx2(6, 6, 4, 4, '#142017'); px(7, 4, '#4a7c59'); break;
    case 'helmet_iron':
      bx2(3, 2, 10, 10, '#9aa3b4'); bx2(4, 1, 8, 2, '#d5dbe6'); bx2(4, 7, 8, 2, '#1b2433'); ln(4, 7, 11, 7, '#0b0e14'); px(4, 5, '#ffffff'); break;
    case 'tunic_linen':
      bx2(4, 4, 8, 9, '#4a7c59'); bx2(2, 5, 12, 3, '#4a7c59'); bx2(4, 12, 8, 1, '#2d5338'); bx2(7, 4, 2, 3, '#2d5338'); bx2(5, 5, 6, 1, '#8fb996'); break;
    case 'robe_mage':
      bx2(4, 3, 8, 11, '#24336a'); bx2(2, 4, 12, 4, '#24336a'); bx2(7, 4, 2, 8, '#ffd86b'); bx2(3, 13, 10, 2, '#1b2752'); px(7, 8, '#4a90e2'); break;
    case 'armor_iron':
      bx2(4, 3, 8, 10, '#9aa3b4'); bx2(2, 4, 12, 4, '#9aa3b4'); bx2(5, 5, 2, 2, '#d5dbe6'); bx2(9, 5, 2, 2, '#d5dbe6'); bx2(4, 12, 8, 1, '#5a6375'); break;
    case 'pants_leather':
      bx2(4, 4, 8, 3, '#6e4726'); bx2(4, 7, 3, 7, '#6e4726'); bx2(9, 7, 3, 7, '#6e4726'); bx2(4, 4, 8, 1, '#482d16'); bx2(7, 7, 2, 2, '#482d16'); break;
    case 'pants_plate':
      bx2(4, 4, 8, 3, '#7c8594'); bx2(4, 7, 3, 7, '#7c8594'); bx2(9, 7, 3, 7, '#7c8594'); bx2(4, 4, 8, 1, '#5a6375'); bx2(4, 9, 3, 1, '#d5dbe6'); bx2(9, 9, 3, 1, '#d5dbe6'); break;
    case 'boots_leather':
      bx2(3, 6, 4, 7, '#3a2618'); bx2(9, 6, 4, 7, '#3a2618'); bx2(2, 11, 6, 3, '#3a2618'); bx2(8, 11, 6, 3, '#3a2618'); bx2(2, 13, 6, 1, '#1e130c'); bx2(8, 13, 6, 1, '#1e130c'); break;
    case 'boots_fur':
      bx2(3, 5, 4, 2, '#d0d5dc'); bx2(9, 5, 4, 2, '#d0d5dc'); bx2(3, 7, 4, 6, '#4a3b30'); bx2(9, 7, 4, 6, '#4a3b30'); bx2(2, 11, 6, 3, '#4a3b30'); bx2(8, 11, 6, 3, '#4a3b30'); break;
    case 'boots_plate':
      bx2(3, 4, 4, 9, '#7c8594'); bx2(9, 4, 4, 9, '#7c8594'); bx2(2, 10, 6, 4, '#9aa3b4'); bx2(8, 10, 6, 4, '#9aa3b4'); px(3, 6, '#ffffff'); px(9, 6, '#ffffff'); break;

    // --- PRSTENY ---
    case 'ring_ruby':
      bx2(4, 6, 8, 7, '#e8c34a'); bx2(5, 7, 6, 5, '#1b2433'); bx2(6, 3, 4, 4, '#ff2a2a'); px(7, 4, '#ffffff'); break;
    case 'ring_emerald':
      bx2(4, 6, 8, 7, '#e8c34a'); bx2(5, 7, 6, 5, '#1b2433'); bx2(6, 3, 4, 4, '#10b981'); px(7, 4, '#a7f3d0'); break;
    case 'ring_sapphire':
      bx2(4, 6, 8, 7, '#d5dbe6'); bx2(5, 7, 6, 5, '#1b2433'); bx2(6, 3, 4, 4, '#0284c7'); px(7, 4, '#7dd3fc'); break;
    case 'ring_gold':
      bx2(4, 5, 8, 8, '#e8c34a'); bx2(5, 7, 6, 5, '#1b2433'); bx2(6, 3, 4, 3, '#ffd86b'); px(7, 4, '#fff9d6'); break;

    // --- LOOT / MATERIÁLY ---
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
