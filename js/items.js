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
    id: 'sword_rusty',
    name: 'Zrezivělý meč',
    cat: 'weapon',
    subcat: 'sword',
    rarity: 'common',
    count: 1,
    damage: 14,
    reach: 2.8,
    speed: 1.0,
    critChance: 0.05,
    desc: 'Stará, tupá a orezlá čepel nalezená v trávě. V boji moc neobstojí, ale je to lepší než holé ruce.',
    statList: ['⚔️ Poškození: 14 HP', '🎯 Dosah: 2.8 m', '⚡ Rychlost: 1.0×', '💥 Šance na kritický zásah: 5%']
  },
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
    subcat: 'dagger',
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
    subcat: 'axe',
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
    subcat: 'blunt',
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
    subcat: 'blunt',
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
    desc: 'Základní surovina pro vylepšování a výrobu.',
    statList: ['🪵 Základní surovina pro vylepšování a výrobu', '🔨 Vhodné na výrobu zbraní a výstroje']
  },
  {
    id: 'stone',
    name: 'Kamenný blok',
    cat: 'loot',
    subcat: 'material',
    count: 8,
    rarity: 'common',
    desc: 'Základní surovina pro vylepšování a výrobu.',
    statList: ['🪨 Základní surovina pro vylepšování a výrobu', '🛡️ Vhodné na kování a vylepšování výbavy']
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
  },

  // --- Nové Alchymistické Suroviny (F9) ---
  {
    id: 'flower_red',
    name: 'Červená květina',
    cat: 'loot',
    subcat: 'material',
    count: 6,
    rarity: 'common',
    desc: 'Půvabná lesní květina s rudými okvětními lístky plnými léčivé mízy.',
    statList: ['🌺 Alchymistická přísada', '❤️ Základ pro léčivé lektvary']
  },
  {
    id: 'herb_green',
    name: 'Zelená bylina',
    cat: 'loot',
    subcat: 'material',
    count: 6,
    rarity: 'common',
    desc: 'Aromatická bylina s povzbuzujícími účinky na svaly a dech.',
    statList: ['🌿 Alchymistická přísada', '⚡ Základ pro lektvary výdrže']
  },
  {
    id: 'flask_water',
    name: 'Láhev čisté vody',
    cat: 'loot',
    subcat: 'material',
    count: 8,
    rarity: 'common',
    desc: 'Křišťálově čistá pramenitá voda v uzavřené skleněné lahvičce.',
    statList: ['🧪 Základní rozpouštědlo', '💧 Nezbytné pro alchymistické recepty']
  },
  {
    id: 'monster_core',
    name: 'Jádro nestvůry',
    cat: 'loot',
    subcat: 'material',
    count: 3,
    rarity: 'rare',
    desc: 'Pulzující magické jádro získané z poražených nebezpečných stvůr.',
    statList: ['🔮 Vzácný monster drop', '⚔️ Nezbytné pro válečné elixíry a kování']
  },
  {
    id: 'crystal_blue',
    name: 'Modrý krystal',
    cat: 'loot',
    subcat: 'material',
    count: 4,
    rarity: 'uncommon',
    desc: 'Třpytivý modrý krystal nabitý energií větru a blesků.',
    statList: ['💎 Energetický krystal', '🏃 Základ pro lektvary rychlosti']
  },

  // --- 4 Základní Alchymistické Lektvary (F9) ---
  {
    id: 'potion_health',
    name: 'Léčivý lektvar',
    cat: 'loot',
    subcat: 'consumable',
    count: 2,
    rarity: 'uncommon',
    healHp: 50,
    desc: 'Rudý elixír uvařený z červených květin a čisté vody. Okamžitě vyléčí 50 HP.',
    statList: ['❤️ Okamžitě vyléčí +50 HP', '🧪 Alchymistický lektvar']
  },
  {
    id: 'potion_stamina',
    name: 'Lektvar výdrže',
    cat: 'loot',
    subcat: 'consumable',
    count: 2,
    rarity: 'uncommon',
    restoreStamina: 50,
    desc: 'Svěže zelený lektvar obnovující energii těla. Okamžitě doplní 50 staminy.',
    statList: ['⚡ Okamžitě doplní +50 Staminy', '🧪 Alchymistický lektvar']
  },
  {
    id: 'potion_strength',
    name: 'Elixír síly',
    cat: 'loot',
    subcat: 'consumable',
    count: 1,
    rarity: 'rare',
    buffStrength: 0.25,
    buffDuration: 30,
    desc: 'Hustý planoucí lektvar z jádra nestvůry a zlata. Zvyšuje útočné poškození o +25% na 30 sekund.',
    statList: ['⚔️ +25% Útočné poškození', '⏱️ Trvání: 30 sekund', '🧪 Válečný elixír']
  },
  {
    id: 'potion_speed',
    name: 'Lektvar hbitosti',
    cat: 'loot',
    subcat: 'consumable',
    count: 1,
    rarity: 'rare',
    buffSpeed: 0.30,
    buffDuration: 30,
    desc: 'Azuřitově modrý lektvar s rozpuštěným modrým krystalem. Zvyšuje rychlost pohybu o +30% na 30 sekund.',
    statList: ['🏃 +30% Rychlost pohybu', '⏱️ Trvání: 30 sekund', '🧪 Alchymistický lektvar']
  },

  // --- Předměty pro ochočení zvířat (Taming Items) ---
  {
    id: 'tame_bone',
    name: 'Morková kost',
    cat: 'loot',
    subcat: 'taming',
    count: 5,
    rarity: 'uncommon',
    tamesTarget: 'Psi (Německý ovčák, Sibiřský husky, Jezevčík)',
    desc: 'Voňavá morková kost. Neodolatelná pochoutka pro ochočení všech druhů psů (stiskni [E] u psa).',
    statList: ['🦴 Ochočuje: Všechny druhy psů', '🐾 Použití: Stiskni [E] u zvířete']
  },
  {
    id: 'tame_fish',
    name: 'Čerstvý losos',
    cat: 'loot',
    subcat: 'taming',
    count: 5,
    rarity: 'uncommon',
    tamesTarget: 'Kočka domácí',
    desc: 'Šťavnatá říční ryba. Ideální pamlsek pro ochočení divoké kočky (stiskni [E] u kočky).',
    statList: ['🐟 Ochočuje: Kočka domácí', '🐾 Použití: Stiskni [E] u zvířete']
  },
  {
    id: 'tame_wheat',
    name: 'Zlatá pšenice',
    cat: 'loot',
    subcat: 'taming',
    count: 5,
    rarity: 'common',
    tamesTarget: 'Strakatá kráva',
    desc: 'Snop zralého obilí ze slunných polí. Slouží k ochočení krávy (stiskni [E] u krávy).',
    statList: ['🌾 Ochočuje: Strakatá kráva', '🐾 Použití: Stiskni [E] u zvířete']
  },
  {
    id: 'tame_clover',
    name: 'Sladký jetel',
    cat: 'loot',
    subcat: 'taming',
    count: 5,
    rarity: 'common',
    tamesTarget: 'Chundelatá ovce',
    desc: 'Čerstvý luční čtyřlístek a jetel. Nejoblíbenější potrava pro ochočení ovcí (stiskni [E] u ovce).',
    statList: ['🍀 Ochočuje: Chundelatá ovce', '🐾 Použití: Stiskni [E] u zvířete']
  },
  {
    id: 'tame_apple',
    name: 'Horské jablko',
    cat: 'loot',
    subcat: 'taming',
    count: 5,
    rarity: 'uncommon',
    tamesTarget: 'Horský kozel',
    desc: 'Křupavé horské jablko plné šťávy. Pomocí něj si ochočíš horského kozla (stiskni [E] u kozla).',
    statList: ['🍎 Ochočuje: Horský kozel', '🐾 Použití: Stiskni [E] u zvířete']
  },
  {
    id: 'tame_acorn',
    name: 'Dubový žalud',
    cat: 'loot',
    subcat: 'taming',
    count: 5,
    rarity: 'common',
    tamesTarget: 'Zrzavá veverka',
    desc: 'Lesklý žalud ze starého dubu. Slouží k ochočení hbité lesní veverky (stiskni [E] u veverky).',
    statList: ['🌰 Ochočuje: Zrzavá veverka', '🐾 Použití: Stiskni [E] u zvířete']
  },

  // --- Ochočení Mazlíčci (Kategorie: Mazlíčci / pets) ---
  {
    id: 'pet_dog_shepherd',
    name: 'Německý ovčák',
    cat: 'pets',
    subcat: 'dog',
    slot: 'pet',
    petType: 'DogShepherd',
    count: 0,
    rarity: 'rare',
    rideSpeed: 9.8,
    jumpBoost: 10.2,
    baseDamage: 18,
    desc: 'Věrný a statný německý ovčák. Po vybavení do slotu mazlíčka ho přivoláš klávesou [R]. Rychle na něm jezdíš a aktivně bojuje po tvém boku.',
    statList: ['🐾 Druh: Pes (Ovčák)', '🏇 Rychlost jízdy: 9.8 m/s', '⚔️ Útok mazlíčka: 18 DMG', '🦴 Ochočeno pomocí: Morková kost', '⌨️ Přivolání a jízda: Klávesa [R] / [E]']
  },
  {
    id: 'pet_dog_husky',
    name: 'Sibiřský husky',
    cat: 'pets',
    subcat: 'dog',
    slot: 'pet',
    petType: 'DogHusky',
    count: 0,
    rarity: 'epic',
    rideSpeed: 10.6,
    jumpBoost: 10.5,
    baseDamage: 22,
    desc: 'Vytrvalý severský husky s modrýma očima. Vyniká vysokou rychlostí i silným útočným kousnutím.',
    statList: ['🐾 Druh: Pes (Husky)', '🏇 Rychlost jízdy: 10.6 m/s', '⚔️ Útok mazlíčka: 22 DMG', '🦴 Ochočeno pomocí: Morková kost', '⌨️ Přivolání a jízda: Klávesa [R] / [E]']
  },
  {
    id: 'pet_dog_dachshund',
    name: 'Jezevčík',
    cat: 'pets',
    subcat: 'dog',
    slot: 'pet',
    petType: 'DogDachshund',
    count: 0,
    rarity: 'rare',
    rideSpeed: 8.8,
    jumpBoost: 9.6,
    baseDamage: 14,
    desc: 'Odvážný dlouhý jezevčík s veselou povahou. Rychle seká zuby do kotníků nepřátel a spolehlivě tě vozí.',
    statList: ['🐾 Druh: Pes (Jezevčík)', '🏇 Rychlost jízdy: 8.8 m/s', '⚔️ Útok mazlíčka: 14 DMG', '🦴 Ochočeno pomocí: Morková kost', '⌨️ Přivolání a jízda: Klávesa [R] / [E]']
  },
  {
    id: 'pet_cat',
    name: 'Kočka domácí',
    cat: 'pets',
    subcat: 'feline',
    slot: 'pet',
    petType: 'Cat',
    count: 0,
    rarity: 'rare',
    rideSpeed: 9.5,
    jumpBoost: 11.4,
    baseDamage: 16,
    desc: 'Mrštná mourovatá kočka s tichým krokem a vysokým skokem. Drápy bleskově škrábe nepřátele v okolí.',
    statList: ['🐾 Druh: Kočka', '🏇 Rychlost jízdy: 9.5 m/s', '🦘 Vysoký skok: 11.4', '⚔️ Útok drápy: 16 DMG', '🐟 Ochočeno pomocí: Čerstvý losos']
  },
  {
    id: 'pet_cow',
    name: 'Strakatá kráva',
    cat: 'pets',
    subcat: 'farm',
    slot: 'pet',
    petType: 'Cow',
    count: 0,
    rarity: 'uncommon',
    rideSpeed: 8.4,
    jumpBoost: 9.4,
    baseDamage: 26,
    desc: 'Silná strakatá kráva, která tě pohodlně poveze přes hory i údolí a drtivě dupne na každého nepřítele.',
    statList: ['🐾 Druh: Hospodářské zvíře', '🏇 Rychlost jízdy: 8.4 m/s', '⚔️ Drtivé dupnutí: 26 DMG', '🌾 Ochočeno pomocí: Zlatá pšenice', '⌨️ Přivolání a jízda: Klávesa [R] / [E]']
  },
  {
    id: 'pet_sheep',
    name: 'Chundelatá ovce',
    cat: 'pets',
    subcat: 'farm',
    slot: 'pet',
    petType: 'Sheep',
    count: 0,
    rarity: 'uncommon',
    rideSpeed: 8.6,
    jumpBoost: 10.0,
    baseDamage: 16,
    desc: 'Měkká ovečka s hustou vlnou. Tvrdým beranním nárazem sráží nepřátele.',
    statList: ['🐾 Druh: Hospodářské zvíře', '🏇 Rychlost jízdy: 8.6 m/s', '⚔️ Trknutí berana: 16 DMG', '🍀 Ochočeno pomocí: Sladký jetel', '⌨️ Přivolání a jízda: Klávesa [R] / [E]']
  },
  {
    id: 'pet_goat',
    name: 'Horský kozel',
    cat: 'pets',
    subcat: 'farm',
    slot: 'pet',
    petType: 'Goat',
    count: 0,
    rarity: 'epic',
    rideSpeed: 9.6,
    jumpBoost: 13.0,
    baseDamage: 22,
    desc: 'Neohrožený horský kozel se zatočenými rohy. Skáče po strmých skalách a rohy odhazuje nepřátele.',
    statList: ['🐾 Druh: Horské zvíře', '🏇 Rychlost jízdy: 9.6 m/s', '🏔️ Obří horský skok: 13.0', '⚔️ Rohový úder: 22 DMG', '🍎 Ochočeno pomocí: Horské jablko']
  },
  {
    id: 'pet_squirrel',
    name: 'Zrzavá veverka',
    cat: 'pets',
    subcat: 'wild',
    slot: 'pet',
    petType: 'Squirrel',
    count: 0,
    rarity: 'legendary',
    rideSpeed: 10.4,
    jumpBoost: 12.2,
    baseDamage: 12,
    desc: 'Bleskurychlá lesní veverka s huňatým ocasem. Neuvěřitelně mrštný jezdecký mazlíček s hyperaktivním útokem.',
    statList: ['🐾 Druh: Lesní zvíře', '🏇 Rychlost jízdy: 10.4 m/s', '⚡ Mrštný skok: 12.2', '⚔️ Lesní kousnutí: 12 DMG', '🌰 Ochočeno pomocí: Dubový žalud']
  },

  // --- Dračí Suroviny & Vejce (Ice and Fire Wyverns) ---
  {
    id: 'dragon_scales_fire',
    name: 'Ohnivé dračí šupiny',
    cat: 'loot',
    subcat: 'material',
    count: 0,
    rarity: 'epic',
    desc: 'Neuvěřitelně tvrdé rudé šupiny ze zabité ohnivé wyverny. Sálají teplem a odolávají žáru.',
    statList: ['🐉 Dračí surovina', '🔥 Odolnost proti ohni', '🛡️ Výroba dračí zbroje']
  },
  {
    id: 'dragon_scales_ice',
    name: 'Ledové dračí šupiny',
    cat: 'loot',
    subcat: 'material',
    count: 0,
    rarity: 'epic',
    desc: 'Ledově modré křišťálové šupiny z ledové wyverny. Jsou mrazivě chladné a tvrdé jako diamant.',
    statList: ['🐉 Dračí surovina', '❄️ Odolnost proti mrazu', '🛡️ Výroba dračí zbroje']
  },
  {
    id: 'dragon_bone',
    name: 'Prastará dračí kost',
    cat: 'loot',
    subcat: 'material',
    count: 0,
    rarity: 'rare',
    desc: 'Masivní kost ze zabité wyverny. Pevnější než nejlepší kalená ocel.',
    statList: ['🦴 Dračí kost', '⚔️ Základ pro dračí zbraně']
  },
  {
    id: 'dragon_blood_fire',
    name: 'Krev ohnivého draka',
    cat: 'loot',
    subcat: 'material',
    count: 0,
    rarity: 'epic',
    desc: 'Vroucí dračí krev pulzující elementárním ohněm. Používá se k mocné alchymii a zaklínačským rituálům.',
    statList: ['🩸 Dračí krev', '🔥 Magická esence ohně']
  },
  {
    id: 'dragon_blood_ice',
    name: 'Krev ledového draka',
    cat: 'loot',
    subcat: 'material',
    count: 0,
    rarity: 'epic',
    desc: 'Hustá mrazivá tekutina, která okamžitě zmrazí vzduch kolem sebe.',
    statList: ['🩸 Dračí krev', '❄️ Magická esence mrazu']
  },
  // --- Dračí Vejce (Ice and Fire Wyverns - Tier 1 až 5) ---
  {
    id: 'egg_dragon_fire',
    name: 'Vejce ohnivého draka',
    cat: 'loot',
    subcat: 'material',
    isDragonEgg: true,
    dragonType: 'fire',
    tier: 3,
    hatchesInto: 'pet_wyvern_fire_t3',
    count: 0,
    rarity: 'legendary',
    desc: 'Vzácné ohnivé dračí vejce získané z mrtvoly draka (30% šance). Klikni na "Vylíhnout vejce" a získej vlastní ohnivou wyvernu!',
    statList: ['🥚 Dračí vejce (Ohnivé)', '✨ 30% vzácný drop z wyverny', '🐾 Kliknutím v inventáři vylíhneš létajícího mazlíčka!']
  },
  {
    id: 'egg_dragon_fire_t1',
    name: 'Ohnivé dračí vejce (Tier 1)',
    cat: 'loot',
    subcat: 'material',
    isDragonEgg: true,
    dragonType: 'fire',
    tier: 1,
    hatchesInto: 'pet_wyvern_fire_t1',
    count: 0,
    rarity: 'rare',
    desc: 'Menší horké dračí vejce z mladé ohnivé wyverny. Vylíhne se z něj hbité ohnivé mládě!',
    statList: ['🥚 Dračí vejce: Tier 1 (Mládě)', '🔥 Element: Oheň', '🐾 Kliknutím v inventáři vylíhneš mazlíčka Tier 1']
  },
  {
    id: 'egg_dragon_fire_t2',
    name: 'Ohnivé dračí vejce (Tier 2)',
    cat: 'loot',
    subcat: 'material',
    isDragonEgg: true,
    dragonType: 'fire',
    tier: 2,
    hatchesInto: 'pet_wyvern_fire_t2',
    count: 0,
    rarity: 'epic',
    desc: 'Pevné žhnoucí dračí vejce. Vylíhne se z něj mladá, silná ohnivá wyverna.',
    statList: ['🥚 Dračí vejce: Tier 2 (Mladý drak)', '🔥 Element: Oheň', '🐾 Kliknutím v inventáři vylíhneš mazlíčka Tier 2']
  },
  {
    id: 'egg_dragon_fire_t3',
    name: 'Ohnivé dračí vejce (Tier 3)',
    cat: 'loot',
    subcat: 'material',
    isDragonEgg: true,
    dragonType: 'fire',
    tier: 3,
    hatchesInto: 'pet_wyvern_fire_t3',
    count: 0,
    rarity: 'legendary',
    desc: 'Mohutné planoucí dračí vejce z dospělé wyverny. Vylíhne se z něj dospělý drak s drtivým dechem!',
    statList: ['🥚 Dračí vejce: Tier 3 (Dospělý drak)', '🔥 Element: Oheň', '🐾 Kliknutím v inventáři vylíhneš mazlíčka Tier 3']
  },
  {
    id: 'egg_dragon_fire_t4',
    name: 'Ohnivé dračí vejce (Tier 4)',
    cat: 'loot',
    subcat: 'material',
    isDragonEgg: true,
    dragonType: 'fire',
    tier: 4,
    hatchesInto: 'pet_wyvern_fire_t4',
    count: 0,
    rarity: 'legendary',
    desc: 'Monumentální sálající vejce z horského dračího vládce. Vylíhne se z něj obří vznešená wyverna!',
    statList: ['🥚 Dračí vejce: Tier 4 (Vznešený drak)', '🔥 Element: Oheň', '🐾 Kliknutím v inventáři vylíhneš mazlíčka Tier 4']
  },
  {
    id: 'egg_dragon_fire_t5',
    name: 'Ohnivé dračí vejce (Tier 5)',
    cat: 'loot',
    subcat: 'material',
    isDragonEgg: true,
    dragonType: 'fire',
    tier: 5,
    hatchesInto: 'pet_wyvern_fire_t5',
    count: 0,
    rarity: 'legendary',
    desc: 'Legendární kolosální vejce prastarého ničitelského draka. Vylíhne se z něj gigantický vrcholný titán!',
    statList: ['🥚 Dračí vejce: Tier 5 (Prastarý titán)', '🔥 Element: Oheň', '👑 Maximální velikost, HP i síla plamenného dechu!']
  },

  {
    id: 'egg_dragon_ice',
    name: 'Vejce ledového draka',
    cat: 'loot',
    subcat: 'material',
    isDragonEgg: true,
    dragonType: 'ice',
    tier: 3,
    hatchesInto: 'pet_wyvern_ice_t3',
    count: 0,
    rarity: 'legendary',
    desc: 'Křišťálové ledové vejce vyzařující mrazivou auru (30% šance). Klikni na "Vylíhnout vejce" a získej vlastní ledovou wyvernu!',
    statList: ['🥚 Dračí vejce (Ledové)', '✨ 30% vzácný drop z wyverny', '🐾 Kliknutím v inventáři vylíhneš létajícího mazlíčka!']
  },
  {
    id: 'egg_dragon_ice_t1',
    name: 'Ledové dračí vejce (Tier 1)',
    cat: 'loot',
    subcat: 'material',
    isDragonEgg: true,
    dragonType: 'ice',
    tier: 1,
    hatchesInto: 'pet_wyvern_ice_t1',
    count: 0,
    rarity: 'rare',
    desc: 'Chladné křišťálové dračí vejce. Vylíhne se z něj mrštné ledové mládě.',
    statList: ['🥚 Dračí vejce: Tier 1 (Mládě)', '❄️ Element: Led & Mráz', '🐾 Kliknutím v inventáři vylíhneš mazlíčka Tier 1']
  },
  {
    id: 'egg_dragon_ice_t2',
    name: 'Ledové dračí vejce (Tier 2)',
    cat: 'loot',
    subcat: 'material',
    isDragonEgg: true,
    dragonType: 'ice',
    tier: 2,
    hatchesInto: 'pet_wyvern_ice_t2',
    count: 0,
    rarity: 'epic',
    desc: 'Zářivě modré ledové vejce pokryté jinatkou. Vylíhne se z něj mladá mrazivá wyverna.',
    statList: ['🥚 Dračí vejce: Tier 2 (Mladý drak)', '❄️ Element: Led & Mráz', '🐾 Kliknutím v inventáři vylíhneš mazlíčka Tier 2']
  },
  {
    id: 'egg_dragon_ice_t3',
    name: 'Ledové dračí vejce (Tier 3)',
    cat: 'loot',
    subcat: 'material',
    isDragonEgg: true,
    dragonType: 'ice',
    tier: 3,
    hatchesInto: 'pet_wyvern_ice_t3',
    count: 0,
    rarity: 'legendary',
    desc: 'Masivní mrazivé vejce dospělého ledového draka. Vylíhne se z něj dospělá wyverna s blizzardovým dechem!',
    statList: ['🥚 Dračí vejce: Tier 3 (Dospělý drak)', '❄️ Element: Led & Mráz', '🐾 Kliknutím v inventáři vylíhneš mazlíčka Tier 3']
  },
  {
    id: 'egg_dragon_ice_t4',
    name: 'Ledové dračí vejce (Tier 4)',
    cat: 'loot',
    subcat: 'material',
    isDragonEgg: true,
    dragonType: 'ice',
    tier: 4,
    hatchesInto: 'pet_wyvern_ice_t4',
    count: 0,
    rarity: 'legendary',
    desc: 'Impozantní křišťálové vejce z ledovcového vládce štítů. Vylíhne se z něj obří vznešená wyverna.',
    statList: ['🥚 Dračí vejce: Tier 4 (Vznešený drak)', '❄️ Element: Led & Mráz', '🐾 Kliknutím v inventáři vylíhneš mazlíčka Tier 4']
  },
  {
    id: 'egg_dragon_ice_t5',
    name: 'Ledové dračí vejce (Tier 5)',
    cat: 'loot',
    subcat: 'material',
    isDragonEgg: true,
    dragonType: 'ice',
    tier: 5,
    hatchesInto: 'pet_wyvern_ice_t5',
    count: 0,
    rarity: 'legendary',
    desc: 'Mytické kolosální vejce prastarého arktického draka. Vylíhne se z něj gigantický mrazivý titán!',
    statList: ['🥚 Dračí vejce: Tier 5 (Prastarý titán)', '❄️ Element: Led & Mráz', '👑 Maximální velikost, HP i mrazivá sněhová bouře!']
  },

  // --- Létající Mazlíčci Wyverny (Tier 1 až 5) ---
  {
    id: 'pet_wyvern_fire',
    name: 'Ohnivá wyverna',
    cat: 'pets',
    subcat: 'dragon',
    isDragon: true,
    dragonType: 'fire',
    slot: 'pet',
    petType: 'WyvernFire',
    tier: 3,
    count: 0,
    rarity: 'legendary',
    rideSpeed: 15.5,
    jumpBoost: 15.0,
    baseDamage: 95,
    canFly: true,
    desc: 'Majestátní létající wyverna s ohnivým dechem. V sedle můžeš létat (Mezerník = stoupání, Shift = klesání). Kliknutím chrlí oheň! [R] Přivolat/Schovat · [E] Nasednout.',
    statList: ['🐉 Druh: Ohnivá wyverna', '✈️ Létající mount (Mezerník / Shift)', '🏇 Rychlost letu: 15.5 m/s', '🔥 Útok v sedle: Obří ohnivý dech & 95 DMG', '⌨️ Klávesa [R] Schovat · [E] Nasednout']
  },
  {
    id: 'pet_wyvern_fire_t1',
    name: 'Ohnivá wyverna (Tier 1 - Mládě)',
    cat: 'pets',
    subcat: 'dragon',
    isDragon: true,
    dragonType: 'fire',
    slot: 'pet',
    petType: 'WyvernFire',
    tier: 1,
    count: 0,
    rarity: 'rare',
    rideSpeed: 12.0,
    jumpBoost: 11.5,
    baseDamage: 35,
    canFly: true,
    desc: 'Rychlé a dravé ohnivé mládě. Létá a plive rychlé ohnivé plameny.',
    statList: ['🐉 Druh: Ohnivá wyverna (Tier 1)', '✈️ Létající mount', '🏇 Rychlost: 12.0 m/s', '🔥 Plamenný dech: 35 DMG']
  },
  {
    id: 'pet_wyvern_fire_t2',
    name: 'Ohnivá wyverna (Tier 2 - Mladá)',
    cat: 'pets',
    subcat: 'dragon',
    isDragon: true,
    dragonType: 'fire',
    slot: 'pet',
    petType: 'WyvernFire',
    tier: 2,
    count: 0,
    rarity: 'epic',
    rideSpeed: 13.5,
    jumpBoost: 13.0,
    baseDamage: 60,
    canFly: true,
    desc: 'Mladá silná ohnivá wyverna s širokým rozpětím křídel a žhavým ohněm.',
    statList: ['🐉 Druh: Ohnivá wyverna (Tier 2)', '✈️ Létající mount', '🏇 Rychlost: 13.5 m/s', '🔥 Plamenný dech: 60 DMG']
  },
  {
    id: 'pet_wyvern_fire_t3',
    name: 'Ohnivá wyverna (Tier 3 - Dospělá)',
    cat: 'pets',
    subcat: 'dragon',
    isDragon: true,
    dragonType: 'fire',
    slot: 'pet',
    petType: 'WyvernFire',
    tier: 3,
    count: 0,
    rarity: 'legendary',
    rideSpeed: 15.5,
    jumpBoost: 15.0,
    baseDamage: 95,
    canFly: true,
    desc: 'Dospělá mohutná wyverna. Chrlí ničivý kuželovitý proud ohně spálí celé skupiny nepřátel!',
    statList: ['🐉 Druh: Ohnivá wyverna (Tier 3)', '✈️ Létající mount', '🏇 Rychlost: 15.5 m/s', '🔥 Plamenný dech: 95 DMG']
  },
  {
    id: 'pet_wyvern_fire_t4',
    name: 'Ohnivá wyverna (Tier 4 - Vznešená)',
    cat: 'pets',
    subcat: 'dragon',
    isDragon: true,
    dragonType: 'fire',
    slot: 'pet',
    petType: 'WyvernFire',
    tier: 4,
    count: 0,
    rarity: 'legendary',
    rideSpeed: 17.5,
    jumpBoost: 17.0,
    baseDamage: 140,
    canFly: true,
    desc: 'Obrovská vznešená wyverna s kolosálními křídly a pekelným dechem.',
    statList: ['🐉 Druh: Ohnivá wyverna (Tier 4)', '✈️ Létající mount', '🏇 Rychlost: 17.5 m/s', '🔥 Plamenný dech: 140 DMG']
  },
  {
    id: 'pet_wyvern_fire_t5',
    name: 'Ohnivá wyverna (Tier 5 - Prastará)',
    cat: 'pets',
    subcat: 'dragon',
    isDragon: true,
    dragonType: 'fire',
    slot: 'pet',
    petType: 'WyvernFire',
    tier: 5,
    count: 0,
    rarity: 'legendary',
    rideSpeed: 20.0,
    jumpBoost: 20.0,
    baseDamage: 220,
    canFly: true,
    desc: 'Gigantický prastarý drak apokalypsy! Monumentální kolos, jehož plamenný příval spálí cokoliv v dohledu na popel.',
    statList: ['🐉 Druh: Prastará wyverna (Tier 5 Apex)', '👑 Kolosální velikost', '🏇 Rychlost letu: 20.0 m/s', '🔥 Kataklyzmatický oheň: 220 DMG']
  },

  {
    id: 'pet_wyvern_ice',
    name: 'Ledová wyverna',
    cat: 'pets',
    subcat: 'dragon',
    isDragon: true,
    dragonType: 'ice',
    slot: 'pet',
    petType: 'WyvernIce',
    tier: 3,
    count: 0,
    rarity: 'legendary',
    rideSpeed: 15.0,
    jumpBoost: 14.8,
    baseDamage: 90,
    canFly: true,
    desc: 'Ledová wyverna se sněžnými křídly a mrazivým dechem. V sedle můžeš létat po celém světě. Kliknutím chrlí led! [R] Přivolat/Schovat · [E] Nasednout.',
    statList: ['🐉 Druh: Ledová wyverna', '✈️ Létající mount (Mezerník / Shift)', '🏇 Rychlost letu: 15.0 m/s', '❄️ Útok v sedle: Mrazivý dech & 90 DMG', '⌨️ Klávesa [R] Schovat · [E] Nasednout']
  },
  {
    id: 'pet_wyvern_ice_t1',
    name: 'Ledová wyverna (Tier 1 - Mládě)',
    cat: 'pets',
    subcat: 'dragon',
    isDragon: true,
    dragonType: 'ice',
    slot: 'pet',
    petType: 'WyvernIce',
    tier: 1,
    count: 0,
    rarity: 'rare',
    rideSpeed: 11.5,
    jumpBoost: 11.0,
    baseDamage: 32,
    canFly: true,
    desc: 'Mrštné polární mládě. Plive ostré rampouchové střely a mrazivý dech.',
    statList: ['🐉 Druh: Ledová wyverna (Tier 1)', '✈️ Létající mount', '🏇 Rychlost: 11.5 m/s', '❄️ Mrazivý dech: 32 DMG']
  },
  {
    id: 'pet_wyvern_ice_t2',
    name: 'Ledová wyverna (Tier 2 - Mladá)',
    cat: 'pets',
    subcat: 'dragon',
    isDragon: true,
    dragonType: 'ice',
    slot: 'pet',
    petType: 'WyvernIce',
    tier: 2,
    count: 0,
    rarity: 'epic',
    rideSpeed: 13.0,
    jumpBoost: 12.5,
    baseDamage: 55,
    canFly: true,
    desc: 'Mladá ledová wyverna s křišťálovými šupinami a sněhovým vírem.',
    statList: ['🐉 Druh: Ledová wyverna (Tier 2)', '✈️ Létající mount', '🏇 Rychlost: 13.0 m/s', '❄️ Mrazivý dech: 55 DMG']
  },
  {
    id: 'pet_wyvern_ice_t3',
    name: 'Ledová wyverna (Tier 3 - Dospělá)',
    cat: 'pets',
    subcat: 'dragon',
    isDragon: true,
    dragonType: 'ice',
    slot: 'pet',
    petType: 'WyvernIce',
    tier: 3,
    count: 0,
    rarity: 'legendary',
    rideSpeed: 15.0,
    jumpBoost: 14.8,
    baseDamage: 90,
    canFly: true,
    desc: 'Dospělá ledová wyverna. Chrlí silný blizzardový kužel mrazu, který zmrazí a zraní všechny nepřátele!',
    statList: ['🐉 Druh: Ledová wyverna (Tier 3)', '✈️ Létající mount', '🏇 Rychlost: 15.0 m/s', '❄️ Mrazivý dech: 90 DMG']
  },
  {
    id: 'pet_wyvern_ice_t4',
    name: 'Ledová wyverna (Tier 4 - Vznešená)',
    cat: 'pets',
    subcat: 'dragon',
    isDragon: true,
    dragonType: 'ice',
    slot: 'pet',
    petType: 'WyvernIce',
    tier: 4,
    count: 0,
    rarity: 'legendary',
    rideSpeed: 17.0,
    jumpBoost: 16.5,
    baseDamage: 135,
    canFly: true,
    desc: 'Obrovská arktická wyverna se zářícíma azurovýma očima a drtivou ledovou bouří.',
    statList: ['🐉 Druh: Ledová wyverna (Tier 4)', '✈️ Létající mount', '🏇 Rychlost: 17.0 m/s', '❄️ Mrazivý dech: 135 DMG']
  },
  {
    id: 'pet_wyvern_ice_t5',
    name: 'Ledová wyverna (Tier 5 - Prastará)',
    cat: 'pets',
    subcat: 'dragon',
    isDragon: true,
    dragonType: 'ice',
    slot: 'pet',
    petType: 'WyvernIce',
    tier: 5,
    count: 0,
    rarity: 'legendary',
    rideSpeed: 19.5,
    jumpBoost: 19.5,
    baseDamage: 215,
    canFly: true,
    desc: 'Monumentální prastarý ledový drak z dob ledových. Zastavuje srdce nepřítele absolutní nulou.',
    statList: ['🐉 Druh: Prastará wyverna (Tier 5 Apex)', '👑 Kolosální velikost', '🏇 Rychlost letu: 19.5 m/s', '❄️ Absolutní mráz: 215 DMG']
  }
];

// Inicializace bází, vylepšení a 3 slotů na skilly pro zbraně, štíty a brnění
for (const it of INV) {
  if (it.cat === 'weapon') {
    if (it.baseDamage === undefined && it.damage !== undefined) it.baseDamage = it.damage;
    if (it.upgradeLevel === undefined) it.upgradeLevel = 0;
    if (it.subcat !== 'shield' && !Array.isArray(it.skillSlots)) {
      it.skillSlots = [null, null, null];
    }
  }
  if (it.cat === 'armor' || it.subcat === 'shield') {
    if (it.baseDefense === undefined && it.defense !== undefined) it.baseDefense = it.defense;
    if (it.baseBonusHp === undefined && it.bonusHp !== undefined) it.baseBonusHp = it.bonusHp;
    if (it.upgradeLevel === undefined) it.upgradeLevel = 0;
  }
}

if (typeof bx === 'undefined') {
  globalThis.bx = (a, x0, y0, z0, x1, y1, z1, c) => {
    for (let x = x0; x < x1; x++) {
      for (let y = y0; y < y1; y++) {
        for (let z = z0; z < z1; z++) {
          a.push([x, y, z, c]);
        }
      }
    }
  };
}

if (typeof createSingleVoxMesh === 'undefined') {
  globalThis.createSingleVoxMesh = () => {
    return {
      isMesh: true,
      position: { set: () => {} },
      rotation: { set: () => {} },
      scale: { set: () => {} },
      clone: function() { return Object.assign({}, this); }
    };
  };
}

const STEEL = 0xd5dbe6, DSTEEL = 0x8f98ab, GOLD = 0xe8c34a, LEATHER = 0x3a2a1e, WOOD = 0x6a3f1e;

const W3 = (() => {
  const sw_rusty = [], sw = [], sp = [], dg = [], ba = [], mc = [], gs = [], sf = [], bw = [], hm = [], kt = [];

  // 0. Zrezivělý meč (stará orezlá čepel)
  const RUST = 0x8b5a2b, DRUST = 0x5c3a21;
  bx(sw_rusty, -1, -1, -3, 1, 1, 2, LEATHER);
  bx(sw_rusty, -1, -1, -5, 1, 1, -3, DRUST);
  bx(sw_rusty, -3, -1, 2, 3, 1, 3, DRUST);
  bx(sw_rusty, -1, -1, 3, 1, 1, 22, RUST);
  bx(sw_rusty, 0, -1, 22, 0, 1, 25, RUST);

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
    sword_rusty: createSingleVoxMesh(sw_rusty, 0, 0, 0),
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
    case 'sword_rusty':
      ln(5, 10, 13, 2, '#8b5a2b'); ln(6, 10, 13, 3, '#5c3a21'); ln(3, 9, 6, 12, '#6a3f1e'); ln(4, 11, 2, 13, '#3a2a1e'); px(1, 14, '#5c3a21'); px(14, 1, '#8b5a2b'); break;
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

    // --- NOVÉ PŘÍSADY A LEKTVARY (F9) ---
    case 'flower_red':
      ln(8, 7, 8, 14, '#2d5338');
      bx2(6, 10, 2, 2, '#4a7c59');
      bx2(9, 9, 2, 2, '#4a7c59');
      bx2(6, 4, 5, 4, '#dc2626');
      px(8, 5, '#fde047');
      px(7, 3, '#ef4444'); px(9, 3, '#ef4444');
      break;

    case 'herb_green':
      ln(7, 14, 9, 4, '#2d5338');
      bx2(5, 7, 3, 2, '#22c55e');
      bx2(9, 6, 3, 2, '#4ade80');
      bx2(6, 10, 2, 2, '#16a34a');
      bx2(9, 10, 3, 2, '#22c55e');
      px(8, 3, '#86efac');
      break;

    case 'flask_water':
      bx2(7, 2, 2, 3, '#a87442');
      bx2(6, 5, 4, 2, '#94a3b8');
      bx2(4, 7, 8, 7, '#38bdf8');
      bx2(5, 8, 6, 5, '#0284c7');
      px(5, 8, '#ffffff'); px(6, 9, '#ffffff');
      break;

    case 'monster_core':
      bx2(5, 5, 6, 6, '#7e22ce');
      bx2(6, 4, 4, 8, '#a855f7');
      bx2(4, 6, 8, 4, '#a855f7');
      bx2(7, 6, 2, 3, '#f43f5e');
      px(7, 6, '#ffffff');
      break;

    case 'crystal_blue':
      ln(8, 2, 4, 10, '#38bdf8');
      ln(8, 2, 12, 10, '#0284c7');
      ln(4, 10, 8, 14, '#0369a1');
      ln(12, 10, 8, 14, '#0284c7');
      bx2(6, 6, 4, 5, '#7dd3fc');
      px(7, 5, '#ffffff');
      break;

    case 'potion_health':
      bx2(7, 2, 2, 2, '#a87442');
      bx2(6, 4, 4, 2, '#cbd5e1');
      bx2(4, 6, 8, 8, '#dc2626');
      bx2(5, 7, 6, 6, '#ef4444');
      px(5, 7, '#ffffff'); px(6, 8, '#ffffff');
      break;

    case 'potion_stamina':
      bx2(7, 2, 2, 2, '#a87442');
      bx2(6, 4, 4, 2, '#cbd5e1');
      bx2(4, 6, 8, 8, '#16a34a');
      bx2(5, 7, 6, 6, '#22c55e');
      px(5, 7, '#ffffff'); px(6, 8, '#ffffff');
      break;

    case 'potion_strength':
      bx2(7, 2, 2, 2, '#e8c34a');
      bx2(6, 4, 4, 2, '#cbd5e1');
      bx2(4, 6, 8, 8, '#c2410c');
      bx2(5, 7, 6, 6, '#f97316');
      px(5, 7, '#ffffff'); px(6, 8, '#fef08a');
      break;

    case 'potion_speed':
      bx2(7, 2, 2, 2, '#38bdf8');
      bx2(6, 4, 4, 2, '#cbd5e1');
      bx2(4, 6, 8, 8, '#0284c7');
      bx2(5, 7, 6, 6, '#38bdf8');
      px(5, 7, '#ffffff'); px(6, 8, '#e0f2fe');
      break;

    // --- PŘEDMĚTY PRO OCHOČENÍ ---
    case 'tame_bone':
      ln(4, 12, 12, 4, '#f8fafc');
      ln(5, 12, 12, 5, '#e2e8f0');
      bx2(2, 11, 3, 3, '#f8fafc'); bx2(4, 12, 2, 3, '#cbd5e1');
      bx2(11, 2, 3, 3, '#f8fafc'); bx2(10, 1, 2, 3, '#cbd5e1');
      break;

    case 'tame_fish':
      bx2(4, 6, 7, 4, '#38bdf8');
      bx2(5, 5, 5, 6, '#0284c7');
      bx2(6, 7, 4, 2, '#f97316');
      bx2(11, 5, 3, 2, '#38bdf8');
      bx2(11, 9, 3, 2, '#38bdf8');
      px(5, 7, '#0f172a'); px(3, 8, '#7dd3fc');
      break;

    case 'tame_wheat':
      ln(4, 14, 12, 3, '#eab308');
      ln(6, 14, 10, 3, '#ca8a04');
      bx2(8, 2, 5, 5, '#facc15');
      bx2(6, 4, 4, 4, '#fde047');
      bx2(5, 9, 4, 2, '#dc2626');
      break;

    case 'tame_clover':
      ln(8, 8, 8, 14, '#15803d');
      bx2(4, 4, 4, 4, '#22c55e');
      bx2(9, 4, 4, 4, '#4ade80');
      bx2(4, 9, 4, 4, '#4ade80');
      bx2(9, 9, 4, 4, '#22c55e');
      px(8, 8, '#bbf7d0');
      break;

    case 'tame_apple':
      bx2(4, 5, 8, 8, '#dc2626');
      bx2(5, 4, 6, 10, '#ef4444');
      px(8, 2, '#78350f');
      bx2(9, 2, 3, 2, '#22c55e');
      px(6, 6, '#ffffff'); px(6, 7, '#fecaca');
      break;

    case 'tame_acorn':
      bx2(4, 3, 8, 4, '#451a03');
      bx2(5, 2, 6, 2, '#78350f');
      px(8, 1, '#451a03');
      bx2(5, 7, 6, 6, '#b45309');
      bx2(6, 13, 4, 1, '#92400e');
      px(6, 8, '#fcd34d');
      break;

    // --- OCHOČENÍ MAZLÍČCI ---
    case 'pet_dog_shepherd':
      bx2(4, 5, 8, 7, '#b45309');
      bx2(5, 6, 6, 3, '#292524');
      bx2(4, 2, 2, 3, '#292524');
      bx2(10, 2, 2, 3, '#292524');
      bx2(6, 9, 4, 4, '#44403c');
      px(6, 7, '#ffffff'); px(9, 7, '#ffffff');
      px(7, 10, '#0f172a'); px(8, 13, '#ef4444');
      break;

    case 'pet_dog_husky':
      bx2(4, 5, 8, 7, '#475569');
      bx2(5, 7, 6, 6, '#f8fafc');
      bx2(4, 2, 2, 3, '#334155');
      bx2(10, 2, 2, 3, '#334155');
      px(6, 7, '#38bdf8'); px(9, 7, '#38bdf8');
      bx2(7, 10, 2, 2, '#0f172a');
      break;

    case 'pet_dog_dachshund':
      bx2(3, 6, 10, 5, '#78350f');
      bx2(2, 7, 2, 5, '#451a03');
      bx2(12, 7, 2, 5, '#451a03');
      bx2(6, 9, 4, 4, '#b45309');
      px(6, 7, '#0f172a'); px(9, 7, '#0f172a');
      px(7, 10, '#0f172a');
      break;

    case 'pet_cat':
      bx2(4, 5, 8, 7, '#f97316');
      bx2(4, 3, 2, 2, '#ea580c');
      bx2(10, 3, 2, 2, '#ea580c');
      bx2(5, 9, 6, 3, '#ffedd5');
      px(6, 7, '#22c55e'); px(9, 7, '#22c55e');
      px(7, 9, '#f43f5e');
      break;

    case 'pet_cow':
      bx2(4, 5, 8, 7, '#f8fafc');
      bx2(4, 5, 3, 3, '#1e293b');
      bx2(9, 7, 3, 2, '#1e293b');
      bx2(3, 3, 2, 2, '#d6d3d1');
      bx2(11, 3, 2, 2, '#d6d3d1');
      bx2(5, 10, 6, 3, '#fda4af');
      px(6, 7, '#0f172a'); px(9, 7, '#0f172a');
      break;

    case 'pet_sheep':
      bx2(3, 3, 10, 9, '#f1f5f9');
      bx2(5, 6, 6, 6, '#44403c');
      bx2(5, 4, 6, 2, '#ffffff');
      px(6, 8, '#ffffff'); px(9, 8, '#ffffff');
      break;

    case 'pet_goat':
      bx2(5, 5, 6, 7, '#d6d3d1');
      bx2(4, 2, 2, 3, '#78716c');
      bx2(10, 2, 2, 3, '#78716c');
      bx2(7, 12, 2, 3, '#a8a29e');
      px(6, 7, '#eab308'); px(9, 7, '#eab308');
      px(7, 10, '#44403c');
      break;

    case 'pet_squirrel':
      bx2(4, 6, 6, 7, '#c2410c');
      bx2(10, 3, 4, 9, '#ea580c');
      bx2(11, 2, 3, 4, '#f97316');
      bx2(4, 4, 2, 2, '#9a3412');
      bx2(8, 4, 2, 2, '#9a3412');
      px(5, 8, '#0f172a'); px(8, 8, '#0f172a');
      bx2(5, 10, 4, 3, '#ffedd5');
      break;

    // --- DRAČÍ SUROVINY, VEJCE & WYVERNY ---
    case 'dragon_scales_fire':
      bx2(4, 4, 8, 8, '#dc2626');
      bx2(5, 3, 6, 10, '#b91c1c');
      bx2(6, 5, 4, 6, '#f97316');
      px(8, 7, '#fef08a');
      break;

    case 'dragon_scales_ice':
      bx2(4, 4, 8, 8, '#0284c7');
      bx2(5, 3, 6, 10, '#0369a1');
      bx2(6, 5, 4, 6, '#38bdf8');
      px(8, 7, '#e0f2fe');
      break;

    case 'dragon_bone':
      bx2(3, 4, 10, 8, '#e2e8f0');
      bx2(2, 3, 3, 4, '#cbd5e1');
      bx2(11, 9, 3, 4, '#cbd5e1');
      bx2(5, 6, 6, 4, '#f8fafc');
      break;

    case 'dragon_blood_fire':
      bx2(5, 2, 6, 3, '#78350f');
      bx2(4, 5, 8, 9, '#dc2626');
      bx2(5, 7, 6, 6, '#f97316');
      px(7, 9, '#fef08a');
      break;

    case 'dragon_blood_ice':
      bx2(5, 2, 6, 3, '#0f172a');
      bx2(4, 5, 8, 9, '#0284c7');
      bx2(5, 7, 6, 6, '#38bdf8');
      px(7, 9, '#ffffff');
      break;

    default:
      if (id.startsWith('egg_dragon_fire')) {
        const tier = id.match(/_t([1-5])/)?.[1] || '3';
        bx2(5, 3, 6, 10, '#dc2626');
        bx2(4, 5, 8, 6, '#b91c1c');
        bx2(6, 2, 4, 12, '#ea580c');
        px(6, 6, '#fbbf24'); px(7, 7, '#fef08a'); px(8, 6, '#fbbf24');
        px(7, 8, '#f59e0b'); px(8, 9, '#fbbf24');
        // Tier tečky na spodku vejce
        const tNum = parseInt(tier, 10);
        for (let ti = 0; ti < tNum; ti++) {
          px(6 + (ti % 3) * 2, 12 + Math.floor(ti / 3) * 2, '#fde047');
        }
      } else if (id.startsWith('egg_dragon_ice')) {
        const tier = id.match(/_t([1-5])/)?.[1] || '3';
        bx2(5, 3, 6, 10, '#0284c7');
        bx2(4, 5, 8, 6, '#0369a1');
        bx2(6, 2, 4, 12, '#38bdf8');
        px(6, 6, '#e0f2fe'); px(7, 7, '#ffffff'); px(8, 6, '#e0f2fe');
        px(7, 8, '#bae6fd'); px(8, 9, '#ffffff');
        const tNum = parseInt(tier, 10);
        for (let ti = 0; ti < tNum; ti++) {
          px(6 + (ti % 3) * 2, 12 + Math.floor(ti / 3) * 2, '#ffffff');
        }
      } else if (id.startsWith('pet_wyvern_fire')) {
        bx2(4, 5, 8, 7, '#b91c1c');
        bx2(2, 3, 4, 5, '#ea580c');
        bx2(10, 3, 4, 5, '#ea580c');
        bx2(6, 7, 4, 5, '#f97316');
        px(3, 2, '#7f1d1d'); px(12, 2, '#7f1d1d');
        px(6, 7, '#fef08a'); px(9, 7, '#fef08a');
        px(7, 10, '#450a0a'); px(8, 10, '#450a0a');
      } else if (id.startsWith('pet_wyvern_ice')) {
        bx2(4, 5, 8, 7, '#0369a1');
        bx2(2, 3, 4, 5, '#0284c7');
        bx2(10, 3, 4, 5, '#0284c7');
        bx2(6, 7, 4, 5, '#38bdf8');
        px(3, 2, '#0c4a6e'); px(12, 2, '#0c4a6e');
        px(6, 7, '#e0f2fe'); px(9, 7, '#e0f2fe');
        px(7, 10, '#082f49'); px(8, 10, '#082f49');
      }
      break;
  }
  return c.toDataURL();
}

for (const it of INV) it.icon = icon(it.id);

// Funkce pro vylíhnutí dračího vejce
function hatchDragonEgg(eggId) {
  if (typeof INV === 'undefined') return false;
  const egg = INV.find(it => it.id === eggId);
  if (!egg || !egg.count || egg.count <= 0) {
    if (typeof toast === 'function') toast('Nemáš žádné dračí vejce k vylíhnutí!');
    return false;
  }

  let targetPetId = egg.hatchesInto;
  if (!targetPetId) {
    const isIce = eggId.includes('ice');
    const tier = egg.tier || (eggId.match(/_t([1-5])/)?.[1]) || 3;
    targetPetId = `pet_wyvern_${isIce ? 'ice' : 'fire'}_t${tier}`;
  }

  let pet = INV.find(it => it.id === targetPetId);
  if (!pet) {
    targetPetId = eggId.includes('ice') ? 'pet_wyvern_ice' : 'pet_wyvern_fire';
    pet = INV.find(it => it.id === targetPetId);
  }
  if (!pet) return false;

  // Odečíst 1 vejce
  egg.count -= 1;

  // Přidat / odemknout wyvernu daného tieru
  pet.count = (pet.count || 0) + 1;

  // Spustit slavnostní zvuk vylíhnutí
  if (typeof playDragonHatch === 'function') {
    playDragonHatch();
  }

  // Oznámení pro hráče
  if (typeof toast === 'function') {
    toast(`🥚✨ Vejce puklo! Vylíhl se z něj majestátní tvor: ${pet.name}! Nyní ho můžeš osedlat v záložce Mazlíčci.`);
  }

  // Překreslit inventář
  if (typeof renderInv === 'function') renderInv();
  if (typeof renderHB === 'function') renderHB();
  if (typeof updateEquipmentUI === 'function') updateEquipmentUI();

  // Uložit stav do lokálního úložiště
  if (typeof window !== 'undefined' && window.networkManager && typeof window.networkManager.saveSingleplayerWorld === 'function') {
    try { window.networkManager.saveSingleplayerWorld(); } catch (e) {}
  }

  return targetPetId;
}

if (typeof window !== 'undefined') {
  window.INV = INV;
  window.RARITY_INFO = RARITY_INFO;
  window.W3 = W3;
  window.W3_OFF = W3_OFF;
  window.hatchDragonEgg = hatchDragonEgg;
}

