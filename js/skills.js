// =============================================================================
// Systém Dovedností (Skills), Akční Lišty (Action Bar) a Mapování Ovládání
// Architektura: Čisté oddělení datové vrstvy hráče (Model) od vykreslování (UI)
// =============================================================================

// ---------- 1. Metadata Podkategorií Zbraní ----------
const WEAPON_SUBCAT_META = {
  sword:  { id: 'sword',  name: 'Meče',             icon: '⚔️', color: '#38bdf8' },
  axe:    { id: 'axe',    name: 'Sekery',           icon: '🪓', color: '#f97316' },
  spear:  { id: 'spear',  name: 'Kopí',             icon: '🔱', color: '#10b981' },
  staff:  { id: 'staff',  name: 'Čarovné hole',     icon: '🪄', color: '#a855f7' },
  bow:    { id: 'bow',    name: 'Luky',             icon: '🏹', color: '#22c55e' },
  dagger: { id: 'dagger', name: 'Dýky',             icon: '🗡️', color: '#f43f5e' },
  blunt:  { id: 'blunt',  name: 'Kladiva a palcáty', icon: '🔨', color: '#eab308' }
};

// ---------- 2. Generátor Pixel-Art Ikon pro Akce a Dovednosti ----------
const _skillIconCache = {};
function getSkillIcon(iconKey) {
  if (_skillIconCache[iconKey]) return _skillIconCache[iconKey];
  if (typeof document === 'undefined') return 'data:image/png;base64,mock';

  const c = document.createElement('canvas');
  c.width = c.height = 16;
  const g = c.getContext('2d');
  if (!g) return '';

  const px = (x, y, col) => { g.fillStyle = col; g.fillRect(x, y, 1, 1); };
  const bx2 = (x0, y0, w, h, col) => { g.fillStyle = col; g.fillRect(x0, y0, w, h); };
  const ln = (x0, y0, x1, y1, col) => {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let i = 0; i <= n; i++) {
      px(Math.round(x0 + (x1 - x0) * i / (n || 1)), Math.round(y0 + (y1 - y0) * i / (n || 1)), col);
    }
  };

  // Jemné pozadí ikony dovednosti
  switch (iconKey) {
    // Primární a sekundární základní útoky (Slot 1 = Rychlý LMB, Slot 2 = Těžký s pohybem těla RMB)
    case 'act_primary_slash':
      ln(3, 13, 13, 3, '#e2e8f0'); ln(4, 13, 13, 4, '#94a3b8');
      ln(2, 10, 6, 14, '#fbbf24'); ln(8, 2, 14, 2, '#38bdf8'); ln(14, 2, 14, 8, '#38bdf8');
      break;
    case 'act_secondary_heavy':
      ln(2, 13, 13, 2, '#fb923c'); ln(3, 14, 14, 3, '#f97316');
      bx2(10, 1, 5, 5, '#fef08a'); bx2(11, 2, 3, 3, '#ef4444');
      ln(1, 7, 6, 2, '#fde047'); ln(7, 14, 13, 9, '#fde047');
      break;
    case 'act_secondary_block':
      bx2(4, 2, 8, 9, '#38bdf8'); bx2(5, 3, 6, 7, '#1e293b');
      bx2(6, 11, 4, 3, '#38bdf8'); ln(7, 4, 7, 10, '#fbbf24'); ln(5, 6, 10, 6, '#fbbf24');
      break;

    // Meče (sword)
    case 'sword_whirlwind':
      bx2(3, 6, 10, 4, '#38bdf8'); bx2(5, 7, 6, 2, '#e0f2fe');
      ln(2, 4, 13, 4, '#7dd3fc'); ln(3, 12, 14, 12, '#7dd3fc');
      ln(7, 2, 9, 14, '#ffffff');
      break;
    case 'sword_lunge':
      ln(2, 13, 14, 2, '#38bdf8'); ln(3, 13, 14, 3, '#ffffff');
      bx2(11, 2, 4, 4, '#bae6fd'); px(14, 1, '#ffffff');
      break;
    case 'sword_execution':
      bx2(7, 1, 2, 11, '#ef4444'); bx2(6, 2, 4, 8, '#fca5a5');
      bx2(4, 11, 8, 2, '#fbbf24'); bx2(6, 13, 4, 2, '#991b1b');
      break;
    case 'sword_blade_wave':
      ln(3, 3, 11, 8, '#38bdf8'); ln(11, 8, 3, 13, '#38bdf8');
      ln(5, 2, 13, 8, '#e0f2fe'); ln(13, 8, 5, 14, '#e0f2fe');
      break;

    // Sekery (axe)
    case 'axe_cleave':
      ln(3, 13, 12, 4, '#92400e');
      bx2(8, 2, 6, 6, '#f97316'); bx2(10, 3, 4, 5, '#ffedd5');
      ln(2, 5, 8, 2, '#ef4444');
      break;
    case 'axe_blood_rage':
      bx2(4, 4, 8, 8, '#dc2626'); bx2(6, 2, 4, 12, '#ef4444');
      bx2(2, 6, 12, 4, '#ef4444'); bx2(6, 6, 4, 4, '#fef08a');
      break;
    case 'axe_decapitate':
      bx2(3, 3, 10, 5, '#ea580c'); bx2(5, 2, 6, 4, '#fed7aa');
      ln(8, 8, 8, 14, '#78350f'); bx2(4, 12, 8, 2, '#dc2626');
      break;
    case 'axe_whirl':
      bx2(2, 6, 5, 4, '#f97316'); bx2(9, 6, 5, 4, '#f97316');
      bx2(6, 2, 4, 12, '#fde047'); bx2(6, 6, 4, 4, '#ffffff');
      break;

    // Kopí (spear)
    case 'spear_impale':
      ln(1, 14, 14, 1, '#10b981'); ln(2, 14, 14, 2, '#a7f3d0');
      bx2(11, 1, 4, 4, '#ffffff');
      break;
    case 'spear_flurry':
      ln(2, 12, 12, 2, '#34d399');
      ln(4, 14, 14, 4, '#10b981');
      ln(1, 9, 9, 1, '#a7f3d0');
      break;
    case 'spear_sweep':
      bx2(2, 7, 12, 3, '#10b981'); bx2(4, 6, 8, 2, '#d1fae5');
      ln(3, 12, 13, 12, '#fbbf24');
      break;
    case 'spear_javelin':
      ln(2, 14, 14, 2, '#fde047'); bx2(11, 2, 3, 3, '#ffffff');
      ln(4, 9, 9, 4, '#10b981');
      break;

    // Čarovné hole (staff)
    case 'staff_nova':
      bx2(5, 5, 6, 6, '#a855f7'); bx2(7, 2, 2, 12, '#e9d5ff');
      bx2(2, 7, 12, 2, '#e9d5ff'); bx2(6, 6, 4, 4, '#ffffff');
      break;
    case 'staff_meteor':
      bx2(4, 5, 7, 7, '#ea580c'); bx2(5, 6, 5, 5, '#fef08a');
      ln(9, 4, 14, 1, '#f97316'); ln(10, 7, 15, 3, '#ef4444');
      break;
    case 'staff_frost_ring':
      bx2(3, 3, 10, 10, '#0284c7'); bx2(5, 5, 6, 6, '#0f172a');
      bx2(7, 2, 2, 12, '#7dd3fc'); bx2(2, 7, 12, 2, '#7dd3fc');
      break;
    case 'staff_arcane_surge':
      bx2(6, 3, 4, 10, '#22c55e'); bx2(3, 6, 10, 4, '#22c55e');
      bx2(7, 4, 2, 8, '#bbf7d0'); bx2(4, 7, 8, 2, '#bbf7d0');
      break;

    // Luky (bow)
    case 'bow_power_shot':
      ln(2, 8, 14, 8, '#22c55e'); bx2(11, 6, 3, 5, '#bbf7d0');
      ln(8, 3, 14, 8, '#4ade80'); ln(8, 13, 14, 8, '#4ade80');
      break;
    case 'bow_multishot':
      ln(2, 8, 14, 3, '#4ade80');
      ln(2, 8, 14, 8, '#ffffff');
      ln(2, 8, 14, 13, '#4ade80');
      break;
    case 'bow_explosive_arrow':
      ln(2, 13, 12, 3, '#f97316'); bx2(9, 2, 5, 5, '#ef4444');
      bx2(10, 3, 3, 3, '#fef08a');
      break;
    case 'bow_wind_step':
      ln(3, 5, 13, 5, '#7dd3fc'); ln(5, 8, 14, 8, '#ffffff');
      ln(2, 11, 11, 11, '#38bdf8');
      break;

    // Dýky (dagger)
    case 'dagger_backstab':
      ln(4, 12, 12, 4, '#f43f5e'); bx2(9, 3, 4, 4, '#ffe4e6');
      bx2(3, 11, 3, 3, '#fbbf24');
      break;
    case 'dagger_shadow_dash':
      bx2(3, 6, 10, 4, '#4c1d95'); ln(2, 8, 14, 8, '#f43f5e');
      bx2(11, 6, 3, 4, '#ffffff');
      break;
    case 'dagger_fan_knives':
      ln(8, 13, 3, 3, '#fda4af');
      ln(8, 13, 8, 2, '#ffffff');
      ln(8, 13, 13, 3, '#fda4af');
      break;
    case 'dagger_poison_edge':
      ln(3, 13, 13, 3, '#22c55e'); bx2(8, 3, 4, 4, '#86efac');
      px(6, 12, '#4ade80'); px(11, 9, '#4ade80');
      break;

    // Kladiva a palcáty (blunt)
    case 'blunt_earthshatter':
      bx2(4, 2, 8, 5, '#eab308'); ln(8, 7, 8, 12, '#78350f');
      ln(2, 13, 14, 13, '#fef08a'); ln(4, 14, 12, 14, '#ca8a04');
      break;
    case 'blunt_skullcrusher':
      bx2(4, 3, 8, 6, '#f59e0b'); bx2(6, 4, 4, 4, '#fef08a');
      ln(8, 9, 8, 14, '#92400e');
      break;
    case 'blunt_shockwave':
      bx2(3, 6, 10, 4, '#eab308');
      ln(2, 3, 14, 3, '#fef08a'); ln(2, 13, 14, 13, '#fef08a');
      break;
    case 'blunt_iron_skin':
      bx2(4, 2, 8, 11, '#94a3b8'); bx2(5, 3, 6, 9, '#e2e8f0');
      bx2(6, 5, 4, 5, '#eab308');
      break;

    default:
      bx2(4, 4, 8, 8, '#38bdf8');
      bx2(6, 6, 4, 4, '#ffffff');
      break;
  }

  const url = c.toDataURL();
  _skillIconCache[iconKey] = url;
  return url;
}

// ---------- 3. Základní Útoky Zbraní (Slot 1 = Rychlý útok [LMB], Slot 2 = Těžký útok s pohybem těla [RMB]) ----------
const WEAPON_BASE_ACTIONS = {
  sword: {
    primary: {
      id: 'basic_sword_slash',
      name: 'Seknutí mečem (Rychlý)',
      slotRole: 'Rychlý útok (LMB)',
      attackType: 'light',
      cooldown: 0.45,
      iconKey: 'act_primary_slash',
      desc: 'Svižný diagonální sek čepelí s rychlou kadencí (Cooldown 0.45s).'
    },
    secondary: {
      id: 'sec_sword_heavy_lunge',
      name: 'Výpadový sek s otočkou',
      slotRole: 'Těžký útok s pohybem (RMB)',
      attackType: 'heavy',
      cooldown: 1.50,
      damageMult: 1.45,
      iconKey: 'act_secondary_heavy',
      desc: 'Pomalejší drtivý útok (145 % poškození, Cooldown 1.5s): postava vykročí vpřed, provede 360° otočku celým tělem v podřepu a tvrdě sekne.'
    }
  },
  axe: {
    primary: {
      id: 'basic_axe_chop',
      name: 'Seknutí sekerou (Rychlý)',
      slotRole: 'Rychlý útok (LMB)',
      attackType: 'light',
      cooldown: 0.55,
      iconKey: 'act_primary_slash',
      desc: 'Rychlý šikmý sek válečnou sekerou (Cooldown 0.55s).'
    },
    secondary: {
      id: 'sec_axe_heavy_leap',
      name: 'Skokový drtivý dopad',
      slotRole: 'Těžký útok s pohybem (RMB)',
      attackType: 'heavy',
      cooldown: 1.80,
      damageMult: 1.55,
      iconKey: 'act_secondary_heavy',
      desc: 'Pomalejší masivní úder (155 % poškození, Cooldown 1.8s): postava se odrazí vpřed do výskoku a v hlubokém dřepu zatne sekeru oběma rukama.'
    }
  },
  spear: {
    primary: {
      id: 'basic_spear_thrust',
      name: 'Bodnutí kopím (Rychlý)',
      slotRole: 'Rychlý útok (LMB)',
      attackType: 'light',
      cooldown: 0.48,
      iconKey: 'act_primary_slash',
      desc: 'Rychlý a přesný bodný útok kopím z postoje (Cooldown 0.48s).'
    },
    secondary: {
      id: 'sec_spear_heavy_lunge',
      name: 'Hluboký průrazný výpad',
      slotRole: 'Těžký útok s pohybem (RMB)',
      attackType: 'heavy',
      cooldown: 1.55,
      damageMult: 1.45,
      iconKey: 'act_secondary_heavy',
      desc: 'Pomalejší silný průraz (145 % poškození, Cooldown 1.55s): dlouhý skluzný výpad vpřed v hlubokém pokleku s vytočením ramen a prodlouženým dosahem.'
    }
  },
  staff: {
    primary: {
      id: 'basic_staff_bolt',
      name: 'Magický výboj (Rychlý)',
      slotRole: 'Rychlý útok (LMB)',
      attackType: 'light',
      cooldown: 0.50,
      iconKey: 'act_primary_slash',
      desc: 'Rychlé švihnutí holí, které okamžitě vyšle magický projektil (Cooldown 0.5s).'
    },
    secondary: {
      id: 'sec_staff_heavy_surge',
      name: 'Nabitý magický ráz',
      slotRole: 'Těžký útok s pohybem (RMB)',
      attackType: 'heavy',
      cooldown: 1.70,
      damageMult: 1.50,
      iconKey: 'act_secondary_heavy',
      desc: 'Pomalejší silné zaklínadlo (150 % poškození, Cooldown 1.7s): rituální vzepětí nad hlavou s výkrokem a prudkým švihem celého těla vpřed.'
    }
  },
  bow: {
    primary: {
      id: 'basic_bow_shot',
      name: 'Výstřel šípu (Rychlý)',
      slotRole: 'Rychlý útok (LMB)',
      attackType: 'light',
      cooldown: 0.50,
      iconKey: 'act_primary_slash',
      desc: 'Svižné napnutí tětivy a rychlý výstřel šípu (Cooldown 0.5s).'
    },
    secondary: {
      id: 'sec_bow_heavy_kneel',
      name: 'Průrazný výstřel v pokleku',
      slotRole: 'Těžký útok s pohybem (RMB)',
      attackType: 'heavy',
      cooldown: 1.65,
      damageMult: 1.55,
      iconKey: 'act_secondary_heavy',
      desc: 'Pomalejší ostrostřelecký výstřel (155 % poškození, Cooldown 1.65s): zakleknutí pro stabilitu, plný nátah tětivy a zpětný ráz tělem.'
    }
  },
  dagger: {
    primary: {
      id: 'basic_dagger_stab',
      name: 'Rychlé bodnutí (Rychlý)',
      slotRole: 'Rychlý útok (LMB)',
      attackType: 'light',
      cooldown: 0.35,
      iconKey: 'act_primary_slash',
      desc: 'Bleskový útok dýkou s velmi vysokou rychlostí (Cooldown 0.35s).'
    },
    secondary: {
      id: 'sec_dagger_heavy_spin',
      name: 'Pirueta s podřezem',
      slotRole: 'Těžký útok s pohybem (RMB)',
      attackType: 'heavy',
      cooldown: 1.25,
      damageMult: 1.50,
      iconKey: 'act_secondary_heavy',
      desc: 'Pomalejší akrobatický útok (150 % poškození, Cooldown 1.25s): nízký přikrčený výpad vpřed s 360° otočkou těla a dvojitým řezem.'
    }
  },
  blunt: {
    primary: {
      id: 'basic_blunt_smash',
      name: 'Těžký úder (Rychlý)',
      slotRole: 'Rychlý útok (LMB)',
      attackType: 'light',
      cooldown: 0.60,
      iconKey: 'act_primary_slash',
      desc: 'Svižný boční úder palcátem či kladivem (Cooldown 0.6s).'
    },
    secondary: {
      id: 'sec_blunt_heavy_crush',
      name: 'Zemětřesný drtivý dopad',
      slotRole: 'Těžký útok s pohybem (RMB)',
      attackType: 'heavy',
      cooldown: 1.90,
      damageMult: 1.60,
      iconKey: 'act_secondary_heavy',
      desc: 'Pomalejší drtivý útok (160 % poškození, Cooldown 1.9s): mohutný záklon, výkrok vpřed a pád celou vahou těla do hlubokého dřepu.'
    }
  },
  unarmed: {
    primary: {
      id: 'basic_unarmed_punch',
      name: 'Úder pěstí (Rychlý)',
      slotRole: 'Rychlý útok (LMB)',
      attackType: 'light',
      cooldown: 0.38,
      iconKey: 'act_primary_slash',
      desc: 'Rychlý direkt holou pěstí (Cooldown 0.38s).'
    },
    secondary: {
      id: 'sec_unarmed_heavy_hook',
      name: 'Těžký hák s výkrokem',
      slotRole: 'Těžký útok s pohybem (RMB)',
      attackType: 'heavy',
      cooldown: 1.30,
      damageMult: 1.45,
      iconKey: 'act_secondary_heavy',
      desc: 'Pomalejší silný úder (145 % poškození, Cooldown 1.3s): výpad vpřed se snížením těžiště a plnou rotací boků a ramen.'
    }
  }
};

// ---------- 4. Katalog Dovedností podle Podkategorií Zbraní ----------
const SKILL_CATALOG = [
  // === MEČE (sword) ===
  {
    id: 'sword_whirlwind',
    name: 'Vířivý sek',
    weaponSubcat: 'sword',
    cooldown: 4.0,
    staminaCost: 18,
    damageMult: 1.45,
    reach: 4.0,
    maxTargets: 4,
    effectType: 'aoe_melee',
    unlockedByDefault: true,
    desc: 'Otočný sek kolem celé postavy, který zasáhne až 4 nepřátele v okruhu 4 metrů (145 % poškození).'
  },
  {
    id: 'sword_lunge',
    name: 'Rytířský výpad',
    weaponSubcat: 'sword',
    cooldown: 3.5,
    staminaCost: 15,
    damageMult: 1.65,
    reach: 4.6,
    maxTargets: 1,
    dashSpeed: 10.5,
    effectType: 'dash_strike',
    unlockedByDefault: true,
    desc: 'Prudký výpad vpřed s probodnutím cíle způsobující 165 % poškození zbraně.'
  },
  {
    id: 'sword_execution',
    name: 'Popravčí úder',
    weaponSubcat: 'sword',
    cooldown: 6.0,
    staminaCost: 24,
    damageMult: 1.95,
    bonusCrit: 0.35,
    reach: 3.6,
    maxTargets: 1,
    effectType: 'heavy_strike',
    unlockedByDefault: true,
    desc: 'Drtivý vertikální sek se zvýšenou šancí na kritický zásah (+35 %) a 195 % poškozením.'
  },
  {
    id: 'sword_blade_wave',
    name: 'Vlna čepele',
    weaponSubcat: 'sword',
    cooldown: 5.0,
    staminaCost: 20,
    damageMult: 1.50,
    projectileType: 'frost',
    effectType: 'projectile',
    unlockedByDefault: true,
    desc: 'Švihnutím meče vyšle energetickou vlnu ostří, která zasáhne cíl na dálku (150 % poškození).'
  },

  // === SEKERY (axe) ===
  {
    id: 'axe_cleave',
    name: 'Rozpolcení',
    weaponSubcat: 'axe',
    cooldown: 4.0,
    staminaCost: 20,
    damageMult: 1.60,
    reach: 3.8,
    maxTargets: 3,
    effectType: 'aoe_melee',
    unlockedByDefault: true,
    desc: 'Široký obouruční sek sekerou, který zasáhne až 3 nepřátele před hráčem (160 % poškození).'
  },
  {
    id: 'axe_blood_rage',
    name: 'Krvavý běs',
    weaponSubcat: 'axe',
    cooldown: 10.0,
    staminaCost: 20,
    buffType: 'strength',
    buffMult: 0.30,
    buffDuration: 12,
    effectType: 'self_buff',
    unlockedByDefault: true,
    desc: 'Bojový pokřik berserka zvyšující útočné poškození o +30 % po dobu 12 sekund.'
  },
  {
    id: 'axe_decapitate',
    name: 'Katův sek',
    weaponSubcat: 'axe',
    cooldown: 6.5,
    staminaCost: 26,
    damageMult: 2.05,
    bonusCrit: 0.25,
    reach: 3.5,
    maxTargets: 1,
    effectType: 'heavy_strike',
    unlockedByDefault: true,
    desc: 'Nekompromisní sek shora s obrovským poškozením (205 %) a silným odmrštěním.'
  },
  {
    id: 'axe_whirl',
    name: 'Bouře seker',
    weaponSubcat: 'axe',
    cooldown: 5.0,
    staminaCost: 22,
    damageMult: 1.55,
    reach: 4.2,
    maxTargets: 4,
    effectType: 'aoe_melee',
    unlockedByDefault: true,
    desc: 'Roztočí sekeru v divokém víru a zasáhne všechny okolní protivníky (155 % poškození).'
  },

  // === KOPÍ (spear) ===
  {
    id: 'spear_impale',
    name: 'Průrazný hrot',
    weaponSubcat: 'spear',
    cooldown: 3.5,
    staminaCost: 16,
    damageMult: 1.70,
    reach: 6.0,
    maxTargets: 2,
    effectType: 'heavy_strike',
    unlockedByDefault: true,
    desc: 'Dlouhý průrazný výpad na vzdálenost 6 metrů způsobující 170 % poškození.'
  },
  {
    id: 'spear_flurry',
    name: 'Salva bodnutí',
    weaponSubcat: 'spear',
    cooldown: 4.5,
    staminaCost: 20,
    damageMult: 1.85,
    reach: 5.0,
    maxTargets: 2,
    effectType: 'dash_strike',
    dashSpeed: 7.5,
    unlockedByDefault: true,
    desc: 'Série bleskových bodnutí s krokem vpřed (185 % poškození).'
  },
  {
    id: 'spear_sweep',
    name: 'Podmetení nohou',
    weaponSubcat: 'spear',
    cooldown: 5.0,
    staminaCost: 18,
    damageMult: 1.40,
    reach: 4.5,
    maxTargets: 4,
    effectType: 'aoe_melee',
    unlockedByDefault: true,
    desc: 'Kruhový rozmách ratištěm, který odhodí a zpomalí okolní nepřátele (140 % poškození).'
  },
  {
    id: 'spear_javelin',
    name: 'Astrální oštěp',
    weaponSubcat: 'spear',
    cooldown: 5.5,
    staminaCost: 22,
    damageMult: 1.75,
    projectileType: 'arrow',
    effectType: 'projectile',
    unlockedByDefault: true,
    desc: 'Vrhne energetickou projekci kopí na velkou vzdálenost (175 % poškození).'
  },

  // === ČAROVNÉ HOLE (staff) ===
  {
    id: 'staff_nova',
    name: 'Živelná nova',
    weaponSubcat: 'staff',
    cooldown: 5.5,
    staminaCost: 25,
    damageMult: 1.70,
    reach: 5.5,
    maxTargets: 5,
    effectType: 'aoe_magic',
    unlockedByDefault: true,
    desc: 'Vyvolá kruhovou explozi živlů kolem postavy zasahující nepřátele v okruhu 5.5 m (170 % poškození).'
  },
  {
    id: 'staff_meteor',
    name: 'Arkanický meteor',
    weaponSubcat: 'staff',
    cooldown: 7.0,
    staminaCost: 28,
    damageMult: 2.10,
    projectileType: 'fireball',
    effectType: 'projectile',
    unlockedByDefault: true,
    desc: 'Vystřelí zhuštěnou ohnivou kouli s ničivou plošnou explozí (210 % poškození).'
  },
  {
    id: 'staff_frost_ring',
    name: 'Mrazivý prstenec',
    weaponSubcat: 'staff',
    cooldown: 6.0,
    staminaCost: 20,
    damageMult: 1.45,
    projectileType: 'frost',
    effectType: 'projectile',
    unlockedByDefault: true,
    desc: 'Sešle ledové kopí, které cíl zasáhne za 145 % poškození a výrazně jej zpomalí.'
  },
  {
    id: 'staff_arcane_surge',
    name: 'Magické zotavení',
    weaponSubcat: 'staff',
    cooldown: 10.0,
    staminaCost: 15,
    healHp: 35,
    effectType: 'self_heal',
    unlockedByDefault: true,
    desc: 'Souzruje léčivou energii hole a okamžitě obnoví +35 HP.'
  },

  // === LUKY (bow) ===
  {
    id: 'bow_power_shot',
    name: 'Průrazný šíp',
    weaponSubcat: 'bow',
    cooldown: 4.0,
    staminaCost: 18,
    damageMult: 1.85,
    bonusCrit: 0.30,
    projectileType: 'arrow',
    effectType: 'projectile',
    unlockedByDefault: true,
    desc: 'Plně natažený mistrovský výstřel způsobující 185 % poškození se zvýšenou šancí na krit.'
  },
  {
    id: 'bow_multishot',
    name: 'Trojitá salva',
    weaponSubcat: 'bow',
    cooldown: 5.0,
    staminaCost: 22,
    damageMult: 1.35,
    projectileCount: 3,
    projectileType: 'arrow',
    effectType: 'multishot',
    unlockedByDefault: true,
    desc: 'Vystřelí 3 šípy současně v kuželu před lučištníka (3× 135 % poškození).'
  },
  {
    id: 'bow_explosive_arrow',
    name: 'Výbušný šíp',
    weaponSubcat: 'bow',
    cooldown: 6.5,
    staminaCost: 25,
    damageMult: 1.75,
    projectileType: 'fireball',
    effectType: 'projectile',
    unlockedByDefault: true,
    desc: 'Vystřelí šíp s alchymistickou náloží, který při dopadu exploduje (175 % plošné poškození).'
  },
  {
    id: 'bow_wind_step',
    name: 'Větrný krok',
    weaponSubcat: 'bow',
    cooldown: 7.0,
    staminaCost: 15,
    buffType: 'speed',
    buffMult: 0.35,
    buffDuration: 8,
    effectType: 'self_buff',
    unlockedByDefault: true,
    desc: 'Propůjčí střelci lehkost větru a zvýší rychlost pohybu o +35 % na 8 sekund.'
  },

  // === DÝKY (dagger) ===
  {
    id: 'dagger_backstab',
    name: 'Zákeřné bodnutí',
    weaponSubcat: 'dagger',
    cooldown: 4.5,
    staminaCost: 16,
    damageMult: 2.15,
    bonusCrit: 0.50,
    reach: 2.8,
    maxTargets: 1,
    effectType: 'heavy_strike',
    unlockedByDefault: true,
    desc: 'Bleskový útok na slabé místo cíle s +50% šancí na kritický zásah (215 % poškození).'
  },
  {
    id: 'dagger_shadow_dash',
    name: 'Stínový přepad',
    weaponSubcat: 'dagger',
    cooldown: 3.5,
    staminaCost: 14,
    damageMult: 1.65,
    reach: 3.8,
    dashSpeed: 12.0,
    effectType: 'dash_strike',
    unlockedByDefault: true,
    desc: 'Okamžitý skok vpřed následovaný prudkým podříznutím (165 % poškození).'
  },
  {
    id: 'dagger_fan_knives',
    name: 'Vějíř nožů',
    weaponSubcat: 'dagger',
    cooldown: 4.0,
    staminaCost: 18,
    damageMult: 1.30,
    projectileCount: 3,
    projectileType: 'arrow',
    effectType: 'multishot',
    unlockedByDefault: true,
    desc: 'Vrhne 3 ostré vrhací nože v oblouku před sebe (3× 130 % poškození).'
  },
  {
    id: 'dagger_poison_edge',
    name: 'Jedovaté ostří',
    weaponSubcat: 'dagger',
    cooldown: 4.0,
    staminaCost: 15,
    damageMult: 1.55,
    reach: 2.8,
    maxTargets: 2,
    effectType: 'aoe_melee',
    unlockedByDefault: true,
    desc: 'Rychlý dvojitý sek otrávenou čepelí, který cíl zpomalí (155 % poškození).'
  },

  // === KLADIVA A PALCÁTY (blunt) ===
  {
    id: 'blunt_earthshatter',
    name: 'Otřes země',
    weaponSubcat: 'blunt',
    cooldown: 5.5,
    staminaCost: 24,
    damageMult: 1.80,
    reach: 4.8,
    maxTargets: 4,
    effectType: 'aoe_melee',
    unlockedByDefault: true,
    desc: 'Úder do země vyvolávající tlakovou vlnu v okruhu 4.8 m se silným odhozením (180 % poškození).'
  },
  {
    id: 'blunt_skullcrusher',
    name: 'Drtič lebek',
    weaponSubcat: 'blunt',
    cooldown: 6.0,
    staminaCost: 26,
    damageMult: 2.10,
    bonusCrit: 0.25,
    reach: 3.4,
    maxTargets: 1,
    effectType: 'heavy_strike',
    unlockedByDefault: true,
    desc: 'Masivní úder prorážející zbroj s 210 % poškozením.'
  },
  {
    id: 'blunt_shockwave',
    name: 'Hromový úder',
    weaponSubcat: 'blunt',
    cooldown: 4.0,
    staminaCost: 18,
    damageMult: 1.55,
    reach: 3.8,
    maxTargets: 3,
    effectType: 'aoe_melee',
    unlockedByDefault: true,
    desc: 'Rozmáchlý úder odmršťující všechny nepřátele před hráčem (155 % poškození).'
  },
  {
    id: 'blunt_iron_skin',
    name: 'Kamenná tvrz',
    weaponSubcat: 'blunt',
    cooldown: 11.0,
    staminaCost: 20,
    healHp: 25,
    buffType: 'strength',
    buffMult: 0.25,
    buffDuration: 10,
    effectType: 'self_heal',
    unlockedByDefault: true,
    desc: 'Zpevní tělo, okamžitě vyléčí +25 HP a posílí útoky o +25 % na 10 sekund.'
  }
];

// Přiřazení vygenerovaných ikon všem dovednostem a základním akcím
for (const sk of SKILL_CATALOG) {
  sk.icon = getSkillIcon(sk.id);
}
for (const sub in WEAPON_BASE_ACTIONS) {
  WEAPON_BASE_ACTIONS[sub].primary.icon = getSkillIcon(WEAPON_BASE_ACTIONS[sub].primary.iconKey);
  WEAPON_BASE_ACTIONS[sub].secondary.icon = getSkillIcon(WEAPON_BASE_ACTIONS[sub].secondary.iconKey);
}

// =============================================================================
// 5. DATOVÁ VRSTVA HRÁČE PRO DOVEDNOSTI (PlayerSkillsData)
// Odděluje stav odemčených dovedností a slotů na zbraních od samotného UI
// =============================================================================
const STORAGE_KEY_PLAYER_SKILLS = 'voxel_player_skills_v1';
const STORAGE_KEY_ACTION_BINDS = 'voxel_actionbar_keybinds_v1';

const PlayerSkillsData = {
  unlockedSkillIds: new Set(SKILL_CATALOG.filter(s => s.unlockedByDefault).map(s => s.id)),
  weaponSkillSlots: {}, // { [weaponId]: [skillId0 | null, skillId1 | null, skillId2 | null] }
  cooldowns: {},        // { [skillId]: timestampMs }

  init() {
    this.load();
    this.syncWithInventoryItems();
  },

  load() {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(STORAGE_KEY_PLAYER_SKILLS);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed.unlocked)) {
            parsed.unlocked.forEach(id => this.unlockedSkillIds.add(id));
          }
          if (parsed.weaponSkillSlots && typeof parsed.weaponSkillSlots === 'object') {
            for (const wid in parsed.weaponSkillSlots) {
              const arr = parsed.weaponSkillSlots[wid];
              if (Array.isArray(arr)) {
                this.weaponSkillSlots[wid] = [arr[0] || null, arr[1] || null, arr[2] || null];
              }
            }
          }
        }
      }
    } catch (e) {}
  },

  save() {
    try {
      if (typeof localStorage !== 'undefined') {
        const payload = {
          unlocked: Array.from(this.unlockedSkillIds),
          weaponSkillSlots: this.weaponSkillSlots
        };
        localStorage.setItem(STORAGE_KEY_PLAYER_SKILLS, JSON.stringify(payload));
      }
    } catch (e) {}
  },

  syncWithInventoryItems() {
    if (typeof INV === 'undefined' || !Array.isArray(INV)) return;
    for (const it of INV) {
      if (it.cat === 'weapon' && it.subcat !== 'shield') {
        if (!Array.isArray(this.weaponSkillSlots[it.id])) {
          if (Array.isArray(it.skillSlots) && it.skillSlots.length === 3) {
            this.weaponSkillSlots[it.id] = [it.skillSlots[0] || null, it.skillSlots[1] || null, it.skillSlots[2] || null];
          } else {
            this.weaponSkillSlots[it.id] = [null, null, null];
          }
        }
        it.skillSlots = this.weaponSkillSlots[it.id];
      }
    }
  },

  isSkillUnlocked(skillId) {
    return this.unlockedSkillIds.has(skillId);
  },

  unlockSkill(skillId) {
    const sk = SKILL_CATALOG.find(s => s.id === skillId);
    if (!sk) return false;
    this.unlockedSkillIds.add(skillId);
    this.save();
    return true;
  },

  getSkillById(skillId) {
    if (!skillId) return null;
    return SKILL_CATALOG.find(s => s.id === skillId) || null;
  },

  getUnlockedSkillsForSubcat(subcat) {
    return SKILL_CATALOG.filter(s => s.weaponSubcat === subcat && this.unlockedSkillIds.has(s.id));
  },

  getAllUnlockedSkillsGrouped() {
    const grouped = {};
    for (const key in WEAPON_SUBCAT_META) {
      grouped[key] = [];
    }
    for (const sk of SKILL_CATALOG) {
      if (this.unlockedSkillIds.has(sk.id)) {
        if (!grouped[sk.weaponSubcat]) grouped[sk.weaponSubcat] = [];
        grouped[sk.weaponSubcat].push(sk);
      }
    }
    return grouped;
  },

  getWeaponSkillSlots(weaponId) {
    if (!weaponId) return [null, null, null];
    this.syncWithInventoryItems();
    if (!Array.isArray(this.weaponSkillSlots[weaponId])) {
      this.weaponSkillSlots[weaponId] = [null, null, null];
    }
    return this.weaponSkillSlots[weaponId];
  },

  setWeaponSkillSlot(weaponId, slotIndex, skillId) {
    if (slotIndex < 0 || slotIndex > 2) return false;
    const weapon = (typeof INV !== 'undefined' && Array.isArray(INV)) ? INV.find(x => x.id === weaponId) : null;
    if (!weapon || weapon.cat !== 'weapon' || weapon.subcat === 'shield') return false;

    const slots = this.getWeaponSkillSlots(weaponId);

    if (skillId === null || skillId === '') {
      slots[slotIndex] = null;
      weapon.skillSlots = slots;
      this.save();
      if (typeof renderHB === 'function') renderHB();
      return true;
    }

    const skill = this.getSkillById(skillId);
    if (!skill) return false;
    // Kontrola podkategorie zbraně
    if (skill.weaponSubcat !== weapon.subcat) return false;
    if (!this.isSkillUnlocked(skillId)) return false;

    // Pokud už je tento skill v jiném slotu téže zbraně, uvolníme starý slot
    for (let i = 0; i < 3; i++) {
      if (slots[i] === skillId && i !== slotIndex) {
        slots[i] = null;
      }
    }

    slots[slotIndex] = skillId;
    weapon.skillSlots = slots;
    this.save();
    if (typeof renderHB === 'function') renderHB();
    return true;
  },

  getRemainingCooldown(skillId) {
    const exp = this.cooldowns[skillId] || 0;
    const rem = (exp - Date.now()) / 1000;
    return rem > 0 ? rem : 0;
  },

  isOnCooldown(skillId) {
    return this.getRemainingCooldown(skillId) > 0;
  },

  startCooldown(skillId, seconds) {
    this.cooldowns[skillId] = Date.now() + seconds * 1000;
  },

  clearCooldowns() {
    this.cooldowns = {};
  }
};

// =============================================================================
// 6. SPRÁVCE MAPOVÁNÍ KLÁVES A TLAČÍTEK MYŠI (KeybindManager)
// Podporuje Primary a Secondary vazbu pro každý z 5 slotů akční lišty
// =============================================================================
const DEFAULT_ACTION_BAR_BINDS = [
  { slot: 0, primary: 'Digit1', secondary: 'Mouse0' }, // Slot 1: Klávesa 1 nebo Levé tlačítko myši (LMB)
  { slot: 1, primary: 'Digit2', secondary: 'Mouse2' }, // Slot 2: Klávesa 2 nebo Pravé tlačítko myši (RMB)
  { slot: 2, primary: 'Digit3', secondary: null },     // Slot 3: Klávesa 3 (sekundární volitelná)
  { slot: 3, primary: 'Digit4', secondary: null },     // Slot 4: Klávesa 4 (sekundární volitelná)
  { slot: 4, primary: 'Digit5', secondary: null }      // Slot 5: Klávesa 5 (sekundární volitelná)
];

const KeybindManager = {
  SLOT_COUNT: 5,
  binds: DEFAULT_ACTION_BAR_BINDS.map(b => ({ ...b })),
  listeningTarget: null, // { slotIndex, bindType: 'primary' | 'secondary' }

  init() {
    this.load();
  },

  load() {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(STORAGE_KEY_ACTION_BINDS);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length === 5) {
            this.binds = parsed.map((b, i) => ({
              slot: i,
              primary: b.primary !== undefined ? b.primary : DEFAULT_ACTION_BAR_BINDS[i].primary,
              secondary: b.secondary !== undefined ? b.secondary : DEFAULT_ACTION_BAR_BINDS[i].secondary
            }));
          }
        }
      }
    } catch (e) {}
  },

  save() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_ACTION_BINDS, JSON.stringify(this.binds));
      }
    } catch (e) {}
  },

  resetToDefaults() {
    this.binds = DEFAULT_ACTION_BAR_BINDS.map(b => ({ ...b }));
    this.save();
    if (typeof renderHB === 'function') renderHB();
    if (typeof renderKeybindsConfigUI === 'function') renderKeybindsConfigUI();
  },

  getSlotBinds(slotIndex) {
    if (slotIndex < 0 || slotIndex >= this.SLOT_COUNT) return { primary: null, secondary: null };
    return this.binds[slotIndex];
  },

  setBind(slotIndex, bindType, code) {
    if (slotIndex < 0 || slotIndex >= this.SLOT_COUNT) return false;
    if (bindType !== 'primary' && bindType !== 'secondary') return false;

    const normalized = code || null;

    // Pokud nastavujeme nenulový kód, odstraníme ho z případných jiných slotů/vazeb, aby nevznikaly kolize
    if (normalized) {
      for (let i = 0; i < this.SLOT_COUNT; i++) {
        if (this.binds[i].primary === normalized && !(i === slotIndex && bindType === 'primary')) {
          this.binds[i].primary = null;
        }
        if (this.binds[i].secondary === normalized && !(i === slotIndex && bindType === 'secondary')) {
          this.binds[i].secondary = null;
        }
      }
    }

    this.binds[slotIndex][bindType] = normalized;
    this.save();
    if (typeof renderHB === 'function') renderHB();
    if (typeof renderKeybindsConfigUI === 'function') renderKeybindsConfigUI();
    return true;
  },

  findSlotByInput(code) {
    if (!code) return -1;
    for (let i = 0; i < this.SLOT_COUNT; i++) {
      const b = this.binds[i];
      if (b.primary === code || b.secondary === code) {
        return i;
      }
    }
    return -1;
  },

  findSlotByInputCode(code) {
    return this.findSlotByInput(code);
  },

  formatBindCode(code) {
    if (!code) return '—';
    if (code === 'Mouse0') return 'LMB';
    if (code === 'Mouse2') return 'RMB';
    if (code === 'Mouse1') return 'MMB';
    if (code.startsWith('Digit')) return code.slice(5);
    if (code.startsWith('Numpad')) return 'Num' + code.slice(6);
    if (code.startsWith('Key')) return code.slice(3);
    if (code === 'Space') return 'Mezerník';
    if (code === 'ShiftLeft' || code === 'ShiftRight') return 'Shift';
    if (code === 'ControlLeft' || code === 'ControlRight') return 'Ctrl';
    if (code === 'AltLeft' || code === 'AltRight') return 'Alt';
    return code;
  },

  formatSlotBindsBadge(slotIndex) {
    const b = this.getSlotBinds(slotIndex);
    const p = b.primary ? this.formatBindCode(b.primary) : null;
    const s = b.secondary ? this.formatBindCode(b.secondary) : null;
    if (p && s) return `${p} · ${s}`;
    if (p) return p;
    if (s) return s;
    return '—';
  }
};

// =============================================================================
// 7. SPRÁVCE AKČNÍ LIŠTY A SPOUŠTĚNÍ DOVEDNOSTÍ (ActionBarManager)
// Fixní velikost 5 slotů. Dynamický obsah dle zbraně v dominantní ruce.
// =============================================================================
const ActionBarManager = {
  SLOT_COUNT: 5,
  activeHeldSlot: -1,

  getDominantWeapon() {
    const domItem = (typeof getEquippedDominantHandItem === 'function')
      ? getEquippedDominantHandItem()
      : null;
    if (domItem && domItem.cat === 'weapon' && domItem.subcat !== 'shield') {
      return domItem;
    }
    return null;
  },

  getSlotDefinitions() {
    const weapon = this.getDominantWeapon();
    const subcat = weapon ? (weapon.subcat || 'sword') : 'unarmed';
    const basePair = WEAPON_BASE_ACTIONS[subcat] || WEAPON_BASE_ACTIONS.unarmed;
    const skillSlots = weapon ? PlayerSkillsData.getWeaponSkillSlots(weapon.id) : [null, null, null];

    const slots = [];

    // Slot 1 (index 0): Rychlý primární útok (LMB / Klávesa 1)
    slots.push({
      slotIndex: 0,
      slotNumber: 1,
      kind: 'primary',
      actionId: basePair.primary.id,
      cooldown: basePair.primary.cooldown || 0.45,
      attackType: 'light',
      title: basePair.primary.name,
      subtitle: weapon ? `${weapon.name} · Rychlý útok` : 'Rychlý útok',
      desc: basePair.primary.desc,
      icon: weapon ? weapon.icon : basePair.primary.icon,
      binds: KeybindManager.getSlotBinds(0),
      bindLabel: KeybindManager.formatSlotBindsBadge(0),
      weaponId: weapon ? weapon.id : null,
      skill: null
    });

    // Slot 2 (index 1): Pomalejší těžký útok s pohybem těla (RMB / Klávesa 2)
    slots.push({
      slotIndex: 1,
      slotNumber: 2,
      kind: 'secondary',
      actionId: basePair.secondary.id,
      cooldown: basePair.secondary.cooldown || 1.50,
      attackType: 'heavy',
      title: basePair.secondary.name,
      subtitle: weapon ? `${weapon.name} · Těžký útok s pohybem` : 'Těžký útok s pohybem',
      desc: basePair.secondary.desc,
      icon: basePair.secondary.icon,
      binds: KeybindManager.getSlotBinds(1),
      bindLabel: KeybindManager.formatSlotBindsBadge(1),
      weaponId: weapon ? weapon.id : null,
      skill: null
    });

    // Sloty 3–5 (indexy 2, 3, 4): Navázané skilly ze zbraně v dominantní ruce
    for (let i = 0; i < 3; i++) {
      const slotIdx = i + 2;
      const skillId = skillSlots[i];
      const skill = skillId ? PlayerSkillsData.getSkillById(skillId) : null;
      slots.push({
        slotIndex: slotIdx,
        slotNumber: slotIdx + 1,
        weaponSkillIndex: i,
        kind: skill ? 'skill' : 'empty_skill',
        actionId: skill ? skill.id : null,
        cooldown: skill ? (skill.cooldown || 4.0) : 0,
        title: skill ? skill.name : 'Volný slot dovednosti',
        subtitle: weapon ? `${weapon.name} (Slot ${i + 1})` : 'Vyžaduje zbraň',
        desc: skill ? skill.desc : 'Rozklikni zbraň v inventáři [I] a přiřaď dovednost do slotu.',
        icon: skill ? skill.icon : null,
        binds: KeybindManager.getSlotBinds(slotIdx),
        bindLabel: KeybindManager.formatSlotBindsBadge(slotIdx),
        weaponId: weapon ? weapon.id : null,
        skill: skill
      });
    }

    return slots;
  },

  triggerByInputCode(code) {
    const slotIdx = KeybindManager.findSlotByInput(code);
    if (slotIdx < 0) return false;
    return this.triggerSlot(slotIdx);
  },

  releaseByInputCode(code) {
    const slotIdx = KeybindManager.findSlotByInput(code);
    if (slotIdx < 0) return false;
    return this.releaseSlot(slotIdx);
  },

  triggerSlot(slotIndex) {
    if (slotIndex < 0 || slotIndex >= this.SLOT_COUNT) return false;
    if (typeof escOpen !== 'undefined' && escOpen) return false;
    if (typeof charOpen !== 'undefined' && charOpen) return false;
    if (typeof invOpen !== 'undefined' && invOpen) return false;
    if (typeof chatOpen !== 'undefined' && chatOpen) return false;
    if (typeof emoteOpen !== 'undefined' && emoteOpen) return false;
    if (typeof isRolling !== 'undefined' && isRolling) return false;

    // Pokud již probíhá animace útoku/skillu, nelze ji přerušit ani nahradit jinou!
    if (typeof attacking !== 'undefined' && attacking) return false;

    const defs = this.getSlotDefinitions();
    const slotDef = defs[slotIndex];
    if (!slotDef) return false;

    // Slot 1: Rychlý primární útok dominantní ruky (LMB)
    if (slotDef.kind === 'primary') {
      if (slotDef.actionId && PlayerSkillsData.isOnCooldown(slotDef.actionId)) {
        return false;
      }
      this.activeHeldSlot = slotIndex;
      if (typeof hbSel !== 'undefined') hbSel = slotIndex;

      let started = false;
      if (typeof handleHandAction === 'function') {
        started = handleHandAction('dominant', { attackType: 'light' }) !== false;
      } else if (typeof triggerHandAttack === 'function') {
        started = triggerHandAttack('dominant', { attackType: 'light' }) !== false;
      }
      if (started && slotDef.actionId && slotDef.cooldown) {
        PlayerSkillsData.startCooldown(slotDef.actionId, slotDef.cooldown);
      }
      if (typeof renderHB === 'function') renderHB();
      return started;
    }

    // Slot 2: Pomalejší těžký útok s pohybem těla (RMB)
    if (slotDef.kind === 'secondary') {
      if (slotDef.actionId && PlayerSkillsData.isOnCooldown(slotDef.actionId)) {
        const remCd = PlayerSkillsData.getRemainingCooldown(slotDef.actionId);
        if (typeof toast === 'function') toast(`⏳ ${slotDef.title} se nabíjí (${remCd.toFixed(1)}s)`);
        return false;
      }
      this.activeHeldSlot = slotIndex;
      if (typeof hbSel !== 'undefined') hbSel = slotIndex;

      let started = false;
      if (typeof triggerHandAttack === 'function') {
        started = triggerHandAttack('dominant', { attackType: 'heavy' }) !== false;
      }
      if (started && slotDef.actionId && slotDef.cooldown) {
        PlayerSkillsData.startCooldown(slotDef.actionId, slotDef.cooldown);
      }
      if (typeof renderHB === 'function') renderHB();
      return started;
    }

    // Sloty 3–5: Dovednosti zbraně
    if (slotDef.kind === 'skill' && slotDef.skill) {
      this.activeHeldSlot = slotIndex;
      if (typeof hbSel !== 'undefined') hbSel = slotIndex;
      return this.executeWeaponSkill(slotDef.skill, slotIndex);
    }

    if (slotDef.kind === 'empty_skill') {
      if (typeof toast === 'function') {
        const weapon = this.getDominantWeapon();
        if (weapon) {
          toast(`Slot ${slotIndex + 1} je prázdný – přiřaď dovednost na zbrani (${weapon.name}) v inventáři [I].`);
        } else {
          toast(`Slot ${slotIndex + 1}: Nejprve vybav zbraň do dominantní ruky.`);
        }
      }
      if (typeof renderHB === 'function') renderHB();
      return false;
    }

    return false;
  },

  releaseSlot(slotIndex) {
    if (slotIndex === 1 || this.activeHeldSlot === slotIndex) {
      if (typeof stopActionBarBlock === 'function') {
        stopActionBarBlock();
      }
      if (this.activeHeldSlot === slotIndex) {
        this.activeHeldSlot = -1;
      }
      if (typeof renderHB === 'function') renderHB();
      return true;
    }
    return false;
  },

  executeWeaponSkill(skill, slotIndex) {
    if (!skill) return false;
    // Během aktivní animace útoku nelze spustit jiný skill ani přerušit současný cast
    if (typeof attacking !== 'undefined' && attacking) return false;

    const weapon = this.getDominantWeapon();
    if (!weapon || weapon.subcat !== skill.weaponSubcat) {
      if (typeof toast === 'function') toast('Tato dovednost vyžaduje odpovídající zbraň v dominantní ruce!');
      return false;
    }

    // 1. Kontrola cooldownu
    const remCd = PlayerSkillsData.getRemainingCooldown(skill.id);
    if (remCd > 0) {
      if (typeof toast === 'function') toast(`⏳ ${skill.name} se nabíjí (${remCd.toFixed(1)}s)`);
      return false;
    }

    // 2. Kontrola a odečet staminy
    const stCost = skill.staminaCost || 15;
    const curSt = (typeof G !== 'undefined') ? G.st : 100;
    if (curSt < stCost) {
      if (typeof toast === 'function') toast(`⚡ Nedostatek výdrže pro ${skill.name} (potřeba ${stCost} ST)!`);
      return false;
    }

    if (typeof G !== 'undefined') {
      G.st = Math.max(0, G.st - stCost);
      G.sd = 0;
    }
    PlayerSkillsData.startCooldown(skill.id, skill.cooldown || 4.0);

    // 3. Spuštění animace útoku a zvuku
    if (typeof triggerHandAttack === 'function') {
      triggerHandAttack('dominant', { isSkill: true, skill });
    }

    // 4. Provedení efektu dovednosti
    this.applySkillEffect(skill, weapon);

    if (typeof ui === 'function') ui();
    if (typeof renderHB === 'function') renderHB();
    return true;
  },

  applySkillEffect(skill, weapon) {
    const pObj = (typeof window !== 'undefined' && window.P) ? window.P : (typeof P !== 'undefined' ? P : null);
    if (!pObj) return;

    // A) Self-Heal / Buff dovednosti
    if (skill.effectType === 'self_heal' || skill.effectType === 'self_buff') {
      if (skill.healHp && typeof G !== 'undefined') {
        const maxHp = pObj.maxHp || 100;
        G.hp = Math.min(maxHp, G.hp + skill.healHp);
        pObj.hp = G.hp;
      }
      if (skill.buffType && typeof applyPlayerBuff === 'function') {
        applyPlayerBuff(skill.buffType, skill.buffMult || 0.25, (skill.buffDuration || 10) * 1000);
      }
      if (typeof spawnLevelUpParticles === 'function') {
        spawnLevelUpParticles(pObj.x, pObj.y, pObj.z);
      }
      if (typeof toast === 'function') {
        toast(`✨ Aktivována dovednost: ${skill.name}!`);
      }
      return;
    }

    // B) Výpad vpřed (Dash Strike)
    if (skill.effectType === 'dash_strike' && skill.dashSpeed) {
      const yawVal = (typeof yaw !== 'undefined') ? yaw : 0;
      const fwdX = -Math.sin(yawVal);
      const fwdZ = -Math.cos(yawVal);
      pObj.vx = fwdX * skill.dashSpeed;
      pObj.vz = fwdZ * skill.dashSpeed;
    }

    // C) Projektilové a Multishot dovednosti
    if ((skill.effectType === 'projectile' || skill.effectType === 'multishot') && typeof ProjectileManager !== 'undefined') {
      const baseAtk = (typeof getPlayerAttackDamage === 'function')
        ? getPlayerAttackDamage('dominant')
        : { damage: 30, isCrit: false, weaponName: weapon.name };
      const skillDmg = Math.max(1, Math.round(baseAtk.damage * (skill.damageMult || 1.4)));
      const yawVal = (typeof yaw !== 'undefined') ? yaw : 0;
      const pitchVal = (typeof pitch !== 'undefined') ? pitch : 0;
      const count = skill.projectileCount || 1;
      const pType = skill.projectileType || (weapon.id === 'staff_frost' ? 'frost' : (weapon.subcat === 'staff' ? 'fireball' : 'arrow'));
      const speed = pType === 'arrow' ? 44.0 : 34.0;

      for (let i = 0; i < count; i++) {
        const angleOffset = count > 1 ? ((i - (count - 1) / 2) * 0.14) : 0;
        const yAngle = yawVal + angleOffset;
        const cp = Math.cos(pitchVal);
        const dirX = -Math.sin(yAngle) * cp;
        const dirY = -Math.sin(pitchVal);
        const dirZ = -Math.cos(yAngle) * cp;

        ProjectileManager.spawn({
          type: pType,
          owner: 'player',
          x: pObj.x + dirX * 0.7,
          y: (pObj.renderY ?? pObj.y) + 1.42 + dirY * 0.4,
          z: pObj.z + dirZ * 0.7,
          vx: dirX * speed,
          vy: dirY * speed + (pType === 'arrow' ? 1.5 : 0),
          vz: dirZ * speed,
          damage: skillDmg,
          isCrit: baseAtk.isCrit || (skill.bonusCrit && Math.random() < skill.bonusCrit),
          weaponName: `${weapon.name} (${skill.name})`
        });
      }
      if (typeof toast === 'function') {
        toast(`✨ ${skill.name} (${weapon.name})!`);
      }
      return;
    }

    // D) Kontaktní a AoE útoky (aoe_melee, aoe_magic, heavy_strike, dash_strike)
    const baseAtk = (typeof getPlayerAttackDamage === 'function')
      ? getPlayerAttackDamage('dominant')
      : { damage: 25, isCrit: false, weaponName: weapon.name };
    const extraCrit = skill.bonusCrit ? (Math.random() < skill.bonusCrit) : false;
    const isCrit = baseAtk.isCrit || extraCrit;
    const mult = (skill.damageMult || 1.5) * (extraCrit && !baseAtk.isCrit ? 1.35 : 1.0);
    const finalDmg = Math.max(1, Math.round(baseAtk.damage * mult));
    const reach = skill.reach || weapon.reach || 3.8;
    const maxTargets = skill.maxTargets || 1;
    const is360AoE = (skill.effectType === 'aoe_melee' || skill.effectType === 'aoe_magic') && maxTargets >= 3;

    if (typeof ProjectileManager !== 'undefined' && typeof ProjectileManager.detonateEffect === 'function') {
      const vfxType = skill.effectType === 'aoe_magic' ? 'fireball' : 'frost';
      ProjectileManager.detonateEffect(pObj.x, (pObj.renderY ?? pObj.y) + 1.0, pObj.z, vfxType);
    }

    const yawVal = (typeof yaw !== 'undefined') ? yaw : 0;
    const pitchVal = (typeof pitch !== 'undefined') ? pitch : 0;
    const cp = Math.cos(pitchVal);
    const fwdX = -Math.sin(yawVal) * cp;
    const fwdY = -Math.sin(pitchVal);
    const fwdZ = -Math.cos(yawVal) * cp;

    let hitCount = 0;
    if (typeof window !== 'undefined' && window.EntityManager && Array.isArray(window.EntityManager.creatures)) {
      const candidates = [];
      for (const c of window.EntityManager.creatures) {
        if (!c || c.state === 'Dead' || c.hp <= 0) continue;
        const dx = c.x - pObj.x;
        const dy = (c.y + (c.height || 1.0) * 0.5) - ((pObj.renderY ?? pObj.y) + 1.4);
        const dz = c.z - pObj.z;
        const dist = Math.hypot(dx, dy, dz);
        if (dist <= reach + (c.hitboxRadius || 0.75)) {
          const dot = (dx * fwdX + dy * fwdY + dz * fwdZ) / (dist || 1);
          if (is360AoE || dot > 0.15 || dist < 1.5) {
            candidates.push({ c, dist, dx, dz });
          }
        }
      }
      candidates.sort((a, b) => a.dist - b.dist);
      for (const item of candidates.slice(0, maxTargets)) {
        const kLen = Math.hypot(item.dx, item.dz) || 1;
        const kb = { x: (item.dx / kLen) * 1.6, z: (item.dz / kLen) * 1.6 };
        item.c.takeDamage(finalDmg, kb, isCrit, 'player');
        hitCount++;
      }
    }

    if (typeof toast === 'function') {
      if (hitCount > 0) {
        toast(`✨ ${skill.name}: Zasaženo (${hitCount}×) za -${finalDmg} HP${isCrit ? ' 💥 KRIT!' : ''}`);
      } else {
        toast(`✨ Použita dovednost: ${skill.name}`);
      }
    }
  }
};

// Inicializace datové vrstvy a mapování kláves
PlayerSkillsData.init();
KeybindManager.init();

if (typeof window !== 'undefined') {
  window.WEAPON_SUBCAT_META = WEAPON_SUBCAT_META;
  window.WEAPON_BASE_ACTIONS = WEAPON_BASE_ACTIONS;
  window.SKILL_CATALOG = SKILL_CATALOG;
  window.PlayerSkillsData = PlayerSkillsData;
  window.KeybindManager = KeybindManager;
  window.ActionBarManager = ActionBarManager;
  window.getSkillIcon = getSkillIcon;
}
