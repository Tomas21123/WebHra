// Bezpečné vyhledání suchozemského bodu pro spawn (nikdy ve vodě!)
function findSafeSpawnCoords(startX = 0, startZ = 0) {
  const step = 8;
  const maxR = 3000;
  for (let r = 0; r <= maxR; r += step) {
    if (r === 0) {
      const h0 = height(startX, startZ);
      if (h0 >= SEA + 3) {
        return { x: startX * S + S / 2, y: (h0 + 1.5) * S, z: startZ * S + S / 2 };
      }
      continue;
    }
    const sampleStep = Math.max(8, Math.floor(r / 10));
    for (let i = -r; i <= r; i += sampleStep) {
      const candidates = [
        [startX + i, startZ - r],
        [startX + i, startZ + r],
        [startX - r, startZ + i],
        [startX + r, startZ + i]
      ];
      for (const [bx, bz] of candidates) {
        const h = height(bx, bz);
        // Musí být bezpečně alespoň 3 bloky nad hladinou moře (SEA)
        if (h >= SEA + 3) {
          const b = biome(bx, bz, h);
          // Preferovat pevninu (les, hory, sníh, džungle)
          if (b === 0 || b === 2 || b === 3 || h >= SEA + 4) {
            return {
              x: bx * S + S / 2,
              y: (h + 1.5) * S,
              z: bz * S + S / 2
            };
          }
        }
      }
    }
  }
  return { x: startX * S + S / 2, y: (SEA + 8) * S, z: startZ * S + S / 2 };
}

const safeSpawn = findSafeSpawnCoords();
let SPX = safeSpawn.x;
let SPY = safeSpawn.y;
let SPZ = safeSpawn.z;
const P = {
  x: SPX, y: SPY, z: SPZ,
  vx: 0, vy: 0, vz: 0,
  ground: false, moveX: 0, moveZ: 0,
  inWater: false, isSwimming: false, isRolling: false,
  level: 0,
  xp: 0,
  xpNext: 50,
  skillPoints: 0,
  hp: 100,
  maxHp: 100,
  stamina: 100,
  maxStamina: 100,
  baseStats: {
    maxHp: 100,
    maxStamina: 100,
    attackPower: 8,
    defense: 0,
    critChance: 0.05,
    moveSpeed: 6.0
  }
};
if (typeof window !== 'undefined') {
  window.P = P;
}

function investSkillPoint(statKey) {
  const pObj = (typeof window !== 'undefined' && window.P) ? window.P : P;
  if (!pObj) return false;
  if (typeof pObj.skillPoints !== 'number' || pObj.skillPoints < 1) {
    if (typeof toast === 'function') toast('Nemáš žádné volné dovednostní body!');
    return false;
  }
  if (!pObj.baseStats) {
    pObj.baseStats = { maxHp: 100, maxStamina: 100, attackPower: 10, defense: 0, critChance: 0.05, moveSpeed: 6.0 };
  }
  if (typeof pObj.baseStats.defense !== 'number') pObj.baseStats.defense = 0;

  switch (statKey) {
    case 'hp':
    case 'maxHp':
      pObj.baseStats.maxHp = (pObj.baseStats.maxHp || 100) + 15;
      break;
    case 'stamina':
    case 'maxStamina':
      pObj.baseStats.maxStamina = (pObj.baseStats.maxStamina || 100) + 10;
      break;
    case 'attack':
    case 'damage':
    case 'attackPower':
      pObj.baseStats.attackPower = (pObj.baseStats.attackPower || 10) + 3;
      break;
    case 'defense':
    case 'armor':
      pObj.baseStats.defense = Math.min(0.40, parseFloat(((pObj.baseStats.defense || 0) + 0.03).toFixed(3)));
      break;
    case 'crit':
    case 'critChance':
      pObj.baseStats.critChance = Math.min(0.50, parseFloat(((pObj.baseStats.critChance || 0.05) + 0.015).toFixed(4)));
      break;
    case 'speed':
    case 'moveSpeed':
      pObj.baseStats.moveSpeed = parseFloat(((pObj.baseStats.moveSpeed || 6.0) + 0.15).toFixed(2));
      break;
    default:
      return false;
  }

  pObj.skillPoints -= 1;

  // Okamžitý přepočet reálných hodnot ve hře
  const bonusHp = (typeof window !== 'undefined' && typeof window.getPlayerBonusHP === 'function') ? window.getPlayerBonusHP() : 0;
  pObj.maxHp = pObj.baseStats.maxHp + bonusHp;
  pObj.maxStamina = pObj.baseStats.maxStamina;

  if (typeof G !== 'undefined') {
    G.hp = Math.min(pObj.maxHp, G.hp + 15);
    G.st = Math.min(pObj.maxStamina, G.st + 10);
    pObj.hp = G.hp;
    pObj.stamina = G.st;
  }

  if (typeof ui === 'function') ui();
  if (typeof updateEquipmentUI === 'function') updateEquipmentUI();
  if (typeof window !== 'undefined' && typeof window.updateEquipmentUI === 'function') window.updateEquipmentUI();

  // Uložení stavu
  if (typeof window !== 'undefined' && window.GameStorage && typeof window.GameStorage.savePlayerRPGState === 'function') {
    window.GameStorage.savePlayerRPGState();
  }

  if (typeof toast === 'function') {
    toast(`✨ Bod přiřazen! Zbývá volných bodů: ${pObj.skillPoints}`);
  }
  return true;
}
if (typeof window !== 'undefined') {
  window.investSkillPoint = investSkillPoint;
}

function calculateXpNext(level) {
  if (level !== undefined && level !== null && level <= 0) return 50;
  const l = Math.max(1, Math.floor(level || 1));
  return Math.floor(100 * Math.pow(l, 1.5));
}
if (typeof window !== 'undefined') {
  window.calculateXpNext = calculateXpNext;
  window.getPlayerLevel = () => (typeof P.level === 'number' ? P.level : 0);
}

function showLevelUpBanner(newLevel, levelsGained = 1) {
  const banner = document.getElementById('levelUpBanner');
  const titleEl = document.getElementById('lubTitle');
  const statsEl = document.getElementById('lubStats');
  if (banner) {
    if (titleEl) titleEl.textContent = `ÚROVEŇ ${newLevel} DOSAŽENA!`;
    if (statsEl) {
      statsEl.textContent = `+${10 * levelsGained} Max HP · +${5 * levelsGained} Výdrž · +${2 * levelsGained} Útok`;
    }
    banner.classList.add('active');
    clearTimeout(banner._hideTimer);
    banner._hideTimer = setTimeout(() => {
      banner.classList.remove('active');
    }, 3600);
  } else if (typeof toast === 'function') {
    toast(`🌟 Úroveň zvýšena na Lv. ${newLevel}! (+${10 * levelsGained} HP, +${2 * levelsGained} Útok)`);
  }
}
if (typeof window !== 'undefined') {
  window.showLevelUpBanner = showLevelUpBanner;
}

function spawnLevelUpParticles(x, y, z) {
  if (typeof scene === 'undefined' || typeof THREE === 'undefined') return;
  const group = new THREE.Group();
  group.position.set(x, y + 0.8, z);
  const colors = [0xfbbf24, 0x34d399, 0x38bdf8, 0xfef08a];
  const particles = [];
  for (let i = 0; i < 18; i++) {
    const mat = new THREE.MeshBasicMaterial({ color: colors[i % colors.length], transparent: true, opacity: 0.95 });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), mat);
    const angle = (i / 18) * Math.PI * 2;
    const speed = 1.6 + Math.random() * 1.4;
    particles.push({
      mesh,
      vx: Math.cos(angle) * speed,
      vy: 2.2 + Math.random() * 2.0,
      vz: Math.sin(angle) * speed
    });
    group.add(mesh);
  }
  scene.add(group);
  let elapsed = 0;
  const iv = setInterval(() => {
    elapsed += 0.03;
    for (const pt of particles) {
      pt.mesh.position.x += pt.vx * 0.03;
      pt.mesh.position.y += pt.vy * 0.03;
      pt.mesh.position.z += pt.vz * 0.03;
      pt.vy -= 4.5 * 0.03;
      pt.mesh.material.opacity = Math.max(0, 1 - elapsed / 1.1);
    }
    if (elapsed >= 1.1) {
      clearInterval(iv);
      scene.remove(group);
    }
  }, 30);
}
if (typeof window !== 'undefined') {
  window.spawnLevelUpParticles = spawnLevelUpParticles;
}

function checkPlayerLevelUp() {
  const pObj = (typeof window !== 'undefined' && window.P) ? window.P : P;
  if (!pObj) return false;
  if (typeof pObj.level !== 'number' || pObj.level < 0) pObj.level = 0;
  if (typeof pObj.xp !== 'number' || pObj.xp < 0) pObj.xp = 0;
  if (typeof pObj.xpNext !== 'number' || pObj.xpNext <= 0) {
    pObj.xpNext = calculateXpNext(pObj.level);
  }
  if (!pObj.baseStats) {
    pObj.baseStats = { maxHp: 100, maxStamina: 100, attackPower: 10, defense: 0, critChance: 0.05, moveSpeed: 6.0 };
  }
  if (typeof pObj.baseStats.defense !== 'number') pObj.baseStats.defense = 0;

  const growth = Object.assign({
    maxHp: 10,
    maxStamina: 5,
    attackPower: 2,
    critChance: 0.005,
    moveSpeed: 0.05
  }, (typeof window !== 'undefined' && window.RPG_STAT_GROWTH) ? window.RPG_STAT_GROWTH : {});

  let leveledUp = false;
  const startLevel = pObj.level;

  while (pObj.xp >= pObj.xpNext) {
    pObj.xp -= pObj.xpNext;
    pObj.level += 1;
    pObj.xpNext = calculateXpNext(pObj.level);

    pObj.baseStats.maxHp += growth.maxHp;
    pObj.baseStats.maxStamina += growth.maxStamina;
    pObj.baseStats.attackPower += growth.attackPower;
    pObj.baseStats.critChance = parseFloat((pObj.baseStats.critChance + growth.critChance).toFixed(4));
    pObj.baseStats.moveSpeed = parseFloat((pObj.baseStats.moveSpeed + growth.moveSpeed).toFixed(3));
    pObj.skillPoints = (pObj.skillPoints || 0) + 1;

    const bonusHp = (typeof window !== 'undefined' && typeof window.getPlayerBonusHP === 'function') ? window.getPlayerBonusHP() : 0;
    pObj.maxHp = pObj.baseStats.maxHp + bonusHp;
    pObj.maxStamina = pObj.baseStats.maxStamina;
    pObj.hp = pObj.maxHp;
    pObj.stamina = pObj.maxStamina;

    if (typeof G !== 'undefined') {
      G.hp = pObj.maxHp;
      G.st = pObj.maxStamina;
      G.tired = 0;
      G.o2 = 100;
    }
    leveledUp = true;
  }

  if (leveledUp) {
    const gained = pObj.level - startLevel;
    if (typeof window !== 'undefined' && typeof window.playLevelUpSound === 'function') {
      window.playLevelUpSound();
    } else if (typeof window !== 'undefined' && typeof window.playDiscoverySound === 'function') {
      window.playDiscoverySound();
    }
    spawnLevelUpParticles(pObj.x, pObj.y, pObj.z);
    showLevelUpBanner(pObj.level, gained);
    if (typeof window !== 'undefined' && window.GameStorage && typeof window.GameStorage.savePlayerRPGState === 'function') {
      window.GameStorage.savePlayerRPGState();
    }
    if (typeof window !== 'undefined' && window.networkManager && typeof window.networkManager.sendPlayerTransform === 'function') {
      window.networkManager.sendPlayerTransform();
    }
  }
  if (typeof ui === 'function') ui();
  return leveledUp;
}

function addPlayerXP(amount, source = 'combat') {
  const num = Number(amount);
  if (!num || isNaN(num) || num <= 0) return false;
  const pObj = (typeof window !== 'undefined' && window.P) ? window.P : P;
  if (!pObj) return false;
  pObj.xp = (pObj.xp || 0) + Math.round(num);
  const leveled = checkPlayerLevelUp();
  if (!leveled && typeof window !== 'undefined' && window.GameStorage && typeof window.GameStorage.savePlayerRPGState === 'function') {
    window.GameStorage.savePlayerRPGState();
  }
  if (typeof ui === 'function') ui();
  return leveled;
}

if (typeof window !== 'undefined') {
  window.checkPlayerLevelUp = checkPlayerLevelUp;
  window.addPlayerXP = addPlayerXP;
}

// Rozšíření HUD ui() o Level Badge, XP Bar a škálované životy/staminu
const _origUi = (typeof ui === 'function') ? ui : null;
ui = function () {
  const bonusHp = (typeof window !== 'undefined' && typeof window.getPlayerBonusHP === 'function') ? window.getPlayerBonusHP() : 0;
  const baseMaxHp = (P.baseStats && P.baseStats.maxHp) ? P.baseStats.maxHp : 100;
  const baseMaxSt = (P.baseStats && P.baseStats.maxStamina) ? P.baseStats.maxStamina : 100;
  P.maxHp = baseMaxHp + bonusHp;
  P.maxStamina = baseMaxSt;

  if (typeof G !== 'undefined') {
    if (G.hp > P.maxHp) G.hp = P.maxHp;
    if (G.st > P.maxStamina) G.st = P.maxStamina;
    P.hp = G.hp;
    P.stamina = G.st;
  }

  const hpPct = Math.max(0, Math.min(100, (G.hp / (P.maxHp || 100)) * 100));
  const stPct = Math.max(0, Math.min(100, (G.st / (P.maxStamina || 100)) * 100));
  if (typeof bH !== 'undefined' && bH) bH.style.width = hpPct + '%';
  if (typeof bS !== 'undefined' && bS) bS.style.width = stPct + '%';
  if (typeof bHt !== 'undefined' && bHt) bHt.textContent = `${Math.ceil(G.hp)} / ${P.maxHp}`;
  if (typeof bSt !== 'undefined' && bSt) bSt.textContent = `${Math.ceil(G.st)} / ${P.maxStamina}`;

  if (typeof bOBox !== 'undefined' && bOBox) {
    if (G.o2 < 99.5) {
      bOBox.hidden = false;
      if (typeof bO !== 'undefined' && bO) bO.style.width = Math.max(0, G.o2) + '%';
      if (typeof bOt !== 'undefined' && bOt) bOt.textContent = Math.max(0, Math.ceil(G.o2));
    } else {
      bOBox.hidden = true;
    }
  }

  const lvlBadge = document.getElementById('hudLevelBadge');
  if (lvlBadge) lvlBadge.textContent = `Lv. ${typeof P.level === 'number' ? P.level : 0}`;
  const xpFill = document.getElementById('xpBarFill');
  const xpText = document.getElementById('xpBarText');
  const curLevel = typeof P.level === 'number' ? P.level : 0;
  const xpNext = P.xpNext || calculateXpNext(curLevel);
  const xpPct = Math.max(0, Math.min(100, ((P.xp || 0) / xpNext) * 100));
  if (xpFill) xpFill.style.width = xpPct + '%';
  if (xpText) xpText.textContent = `${P.xp || 0} / ${xpNext} XP`;
};

// =============================================================================
// Správa Smrti Hráče a Oživení u Nejbližší Objevené Budovy
// =============================================================================
function triggerPlayerDeath() {
  const pObj = (typeof window !== 'undefined' && window.P) ? window.P : P;
  if (!pObj || pObj.isDead) return false;
  pObj.isDead = true;

  // Sesednout z mazlíčka pokud hráč jede
  if (pObj.isRiding && typeof window.PetManager !== 'undefined' && typeof window.PetManager.dismountPet === 'function') {
    window.PetManager.dismountPet(true);
  }

  // Zvukový efekt smrti
  if (typeof playAttackSound === 'function') {
    playAttackSound('heavy');
  }

  // Zobrazit obrazovku smrti
  const overlay = (typeof document !== 'undefined') ? document.getElementById('deathOverlay') : null;
  const descEl = (typeof document !== 'undefined') ? document.getElementById('deathDesc') : null;
  const respawnMsgEl = (typeof document !== 'undefined') ? document.getElementById('deathRespawnMsg') : null;

  if (overlay) {
    overlay.style.display = 'flex';
    overlay.style.opacity = '1';
    if (descEl) descEl.textContent = 'Tvé tělo podlehlo ranám v boji...';
    if (respawnMsgEl) respawnMsgEl.textContent = 'Probouzíš se u nejbližší svatyně...';
  } else if (typeof toast === 'function') {
    toast('💀 ZEMŘEL JSI! Teleportuji tě k nejbližší svatyni...');
  }

  // Vyhledání nejbližší teleportační budovy (jak se ukazují na mapě)
  let targetPOI = null;
  let minDist = Infinity;
  const pm = (typeof window !== 'undefined' && window.POIManager) ? window.POIManager : null;

  if (pm) {
    // 1. Nejprve zkontrolujeme všechny již objevené budovy (svatyně, ruiny, tábory, věže, labyrinty, pevnosti)
    if (pm.discoveredPOIs && pm.discoveredPOIs.size > 0) {
      for (const id of pm.discoveredPOIs) {
        let poi = null;
        if (pm.instances) {
          for (const p of pm.instances.values()) {
            if (p.id === id) { poi = p; break; }
          }
        }
        if (!poi && pm.pois) {
          poi = pm.pois.find(p => p.id === id);
        }
        if (!poi && typeof pm.getPoiForCell === 'function') {
          const match = String(id).match(/poi_(-?\d+)_(-?\d+)/);
          if (match) {
            poi = pm.getPoiForCell(parseInt(match[1], 10), parseInt(match[2], 10));
          }
        }
        if (poi && poi.type !== 'Chest') {
          const d = Math.hypot(pObj.x - poi.wx, pObj.z - poi.wz);
          if (d < minDist) {
            minDist = d;
            targetPOI = poi;
          }
        }
      }
    }

    // 2. Pokud hráč zatím neobjevil žádnou budovu, prohledáme okolní macro-buňky (okruh 8 buněk) a najdeme nejbližší budovu
    if (!targetPOI && typeof pm.getPoiForCell === 'function') {
      const s = (typeof S !== 'undefined') ? S : 0.5;
      const macroL = pm.macroCellSize || 64;
      const curCellX = Math.floor(pObj.x / (macroL * s));
      const curCellZ = Math.floor(pObj.z / (macroL * s));

      for (let r = 0; r <= 8; r++) {
        for (let dx = -r; dx <= r; dx++) {
          for (let dz = -r; dz <= r; dz++) {
            if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
            const candidate = pm.getPoiForCell(curCellX + dx, curCellZ + dz);
            if (candidate && candidate.type !== 'Chest') {
              const d = Math.hypot(pObj.x - candidate.wx, pObj.z - candidate.wz);
              if (d < minDist) {
                minDist = d;
                targetPOI = candidate;
              }
            }
          }
        }
        if (targetPOI) break;
      }
    }

    // 3. Fallback: Počáteční svatyně poutníků v buňce 0, 0
    if (!targetPOI && typeof pm.getPoiForCell === 'function') {
      targetPOI = pm.getPoiForCell(0, 0);
    }

    // Pokud budova dosud nebyla objevena, odhalíme ji na mapě
    if (targetPOI && !pm.isDiscovered(targetPOI.id) && typeof pm.discoverPOI === 'function') {
      pm.discoverPOI(targetPOI.id);
    }
  }

  let destName = 'Počáteční svatyně';
  if (targetPOI && pm && typeof pm.teleportToPOI === 'function') {
    pm.teleportToPOI(targetPOI);
    destName = targetPOI.displayName || targetPOI.name || 'Svatyně';
  } else {
    // Pokud POIManager není k dispozici, teleportovat na bezpečný spawn
    const spawnX = (typeof window !== 'undefined' && typeof window.SPX === 'number') ? window.SPX : ((typeof SPX !== 'undefined') ? SPX : 0);
    const spawnY = (typeof window !== 'undefined' && typeof window.SPY === 'number') ? window.SPY : ((typeof SPY !== 'undefined') ? SPY : 50);
    const spawnZ = (typeof window !== 'undefined' && typeof window.SPZ === 'number') ? window.SPZ : ((typeof SPZ !== 'undefined') ? SPZ : 0);
    pObj.x = spawnX;
    pObj.y = spawnY;
    pObj.z = spawnZ;
  }
  pObj.vx = pObj.vy = pObj.vz = 0;

  if (respawnMsgEl) {
    respawnMsgEl.textContent = `Probouzíš se u teleportační budovy: ${destName}...`;
  }

  // Obnovení životů a staminy na maximum
  pObj.hp = pObj.maxHp || 100;
  pObj.stamina = pObj.maxStamina || 100;
  if (typeof G !== 'undefined') {
    G.hp = pObj.hp;
    G.st = pObj.stamina;
    G.rg = 0;
  }
  if (typeof ui === 'function') ui();

  // Přemístění mazlíčka k hráči
  if (typeof window.PetManager !== 'undefined' && window.PetManager && window.PetManager.activePet) {
    window.PetManager.activePet.x = pObj.x + 2;
    window.PetManager.activePet.z = pObj.z + 2;
    window.PetManager.activePet.y = pObj.y;
    if (window.PetManager.activePet.group) {
      window.PetManager.activePet.group.position.set(window.PetManager.activePet.x, window.PetManager.activePet.y, window.PetManager.activePet.z);
    }
  }

  // Časovač pro plynulé zhasnutí obrazovky smrti po 2 sekundách
  setTimeout(() => {
    if (overlay) {
      overlay.style.opacity = '0';
      setTimeout(() => {
        if (overlay) overlay.style.display = 'none';
        pObj.isDead = false;
      }, 500);
    } else {
      pObj.isDead = false;
    }
    if (typeof toast === 'function') {
      toast(`✨ Oživen u teleportační budovy: ${destName}! Plné zdraví obnoveno.`);
    }
  }, 2000);

  return true;
}
window.triggerPlayerDeath = triggerPlayerDeath;

if (typeof window !== 'undefined') {
  window.ui = ui;
  if (window.GameStorage && typeof window.GameStorage.applyPlayerRPGState === 'function') {
    window.GameStorage.applyPlayerRPGState(P);
  }
}

let yaw = 0, pitch = 0.45, dist = 6, face = 0, phase = 0;
let isSprinting = false, airBlend = 0, landingSquash = 0, wasGround = true;
let attacking = false, attackTime = 0, attackDuration = 0.26, attackCombo = 0;
let autoJumpTimer = 0, waterExitTimer = 0, waterJumpTimer = 0;

// Elden Ring / Souls-like Dodge Roll (Kotrmelec)
let isRolling = false;
let rollTimer = 0;
const ROLL_DURATION = 0.62;
let rollDirX = 0, rollDirZ = 0;
let lastShiftTapTime = 0;

function triggerRoll() {
  if (isRolling || attacking || P.inWater || !P.ground || G.st < 5) return;
  if (typeof cancelEmote === 'function') cancelEmote();

  isRolling = true;
  rollTimer = 0;

  // Směr kotrmelce podle směru pohybu kláves nebo čelem dopředu
  const fx = P.moveX || 0, fz = P.moveZ || 0;
  if (Math.hypot(fx, fz) > 0.1) {
    const rwx = (-Math.sin(yaw)) * fz + Math.cos(yaw) * fx;
    const rwz = (-Math.cos(yaw)) * fz - Math.sin(yaw) * fx;
    const len = Math.hypot(rwx, rwz) || 1;
    rollDirX = rwx / len;
    rollDirZ = rwz / len;
  } else {
    rollDirX = -Math.sin(yaw);
    rollDirZ = -Math.cos(yaw);
  }
  face = Math.atan2(rollDirX, rollDirZ);

  // Spotřeba staminy (pouze 5 staminy)
  G.st = Math.max(0, G.st - 5);
  G.sd = 0;
  if (G.st <= 0) G.tired = 1;

  // Přirozený kotrmelec na zemi (nízký skok dopředu)
  P.vy = 1.4;
  P.ground = false;

  if (typeof playRollSound === 'function') playRollSound();
}

function checkPvPHit(whichHand = 'dominant', opts = null) {
  const isHeavy = !!(opts && opts.attackType === 'heavy');
  const reachBonus = (opts && typeof opts.reachBonus === 'number') ? opts.reachBonus : (isHeavy ? 0.45 : 0);
  const dmgMult = (opts && typeof opts.damageMult === 'number') ? opts.damageMult : (isHeavy ? 1.50 : 1.0);
  const kbExtra = (opts && typeof opts.knockbackMult === 'number') ? opts.knockbackMult : (isHeavy ? 1.65 : 1.0);

  const baseReach = (typeof getPlayerAttackReach === 'function') ? getPlayerAttackReach(whichHand) : 2.4;
  const reach = baseReach + reachBonus;
  const rawAtkInfo = (typeof getPlayerAttackDamage === 'function') ? getPlayerAttackDamage(whichHand) : { damage: 12, isCrit: false, weaponName: 'Zbraň' };
  const atkInfo = {
    ...rawAtkInfo,
    damage: Math.max(1, Math.round(rawAtkInfo.damage * dmgMult))
  };

  const weaponId = (whichHand === 'secondary')
    ? (typeof getEquippedOffHandId === 'function' ? getEquippedOffHandId() : null)
    : ((typeof getEquippedMainHandId === 'function' ? getEquippedMainHandId() : null) || (typeof heldId !== 'undefined' ? heldId : null));
  const isCleave = isHeavy || (weaponId === 'greatsword' || weaponId === 'battleaxe');
  const maxTargets = isCleave ? 3 : 1;

  // Směr pohledu hráče
  const cp = Math.cos(pitch);
  const fwdX = -Math.sin(yaw) * cp;
  const fwdY = -Math.sin(pitch);
  const fwdZ = -Math.cos(yaw) * cp;

  const eyeX = P.x;
  const eyeY = (P.renderY ?? P.y) + 1.45;
  const eyeZ = P.z;

  const candidateTargets = [];

  // 1. Kontrola PvE nestvůr (Cube World PvE systém)
  if (window.EntityManager && Array.isArray(window.EntityManager.creatures)) {
    for (const creature of window.EntityManager.creatures) {
      if (!creature || creature.state === 'Dead' || creature.hp <= 0) continue;
      const targetX = (creature.group && typeof creature.group.position.x === 'number') ? creature.group.position.x : creature.x;
      const targetY = ((creature.group && typeof creature.group.position.y === 'number') ? creature.group.position.y : (creature.renderY !== undefined ? creature.renderY : creature.y)) + (creature.height || 1.0) * 0.5;
      const targetZ = (creature.group && typeof creature.group.position.z === 'number') ? creature.group.position.z : creature.z;

      const dx = targetX - eyeX;
      const dy = targetY - eyeY;
      const dz = targetZ - eyeZ;
      const dist = Math.hypot(dx, dy, dz);
      const hitboxR = creature.hitboxRadius || 0.75;

      if (dist <= reach + hitboxR) {
        const dot = (dx * fwdX + dy * fwdY + dz * fwdZ) / (dist || 1);
        const minDot = dist < 1.2 ? 0.15 : (isCleave ? 0.25 : 0.38);
        if (dot > minDot) {
          const score = dot * 10 - dist;
          candidateTargets.push({ type: 'creature', target: creature, dist, score, dx, dy, dz });
        }
      }
    }
  }

  // 2. Kontrola ostatních hráčů (Multiplayer PvP)
  if (window.networkManager && window.networkManager.remotePlayers && window.networkManager.remotePlayers.size > 0) {
    for (const [id, p] of window.networkManager.remotePlayers) {
      if (!p.group) continue;
      const targetX = p.group.position.x;
      const targetY = p.group.position.y + 0.9; // střed těla cíle
      const targetZ = p.group.position.z;

      const dx = targetX - eyeX;
      const dy = targetY - eyeY;
      const dz = targetZ - eyeZ;
      const dist = Math.hypot(dx, dy, dz);

      if (dist <= reach + 0.75) {
        const dot = (dx * fwdX + dy * fwdY + dz * fwdZ) / (dist || 1);
        const minDot = dist < 1.2 ? 0.15 : (isCleave ? 0.25 : 0.38);
        if (dot > minDot) {
          const score = dot * 10 - dist;
          candidateTargets.push({ type: 'player', id, p, dist, score, dx, dy, dz });
        }
      }
    }
  }

  if (candidateTargets.length === 0) return;

  // Seřazení cílů podle zacílení
  candidateTargets.sort((a, b) => b.score - a.score);
  const targetsToHit = candidateTargets.slice(0, maxTargets);

  for (const cand of targetsToHit) {
    const kLen = Math.hypot(cand.dx, cand.dz) || 1;
    const kbMult = (atkInfo.isCrit ? 1.5 : 1.0) * (weaponId === 'mace' || weaponId === 'hammer' ? 1.35 : 1.0) * kbExtra;
    const knockback = {
      x: (cand.dx / kLen) * kbMult,
      z: (cand.dz / kLen) * kbMult
    };

    if (cand.type === 'creature') {
      cand.target.takeDamage(atkInfo.damage, knockback, atkInfo.isCrit, 'player');
      if (typeof window !== 'undefined' && window.PetManager && typeof window.PetManager.onPlayerAttacked === 'function') {
        window.PetManager.onPlayerAttacked(cand.target);
      }
      // CombatJuice: Jiskry, Hitstop a Otřes kamery
      if (typeof CombatJuice !== 'undefined') {
        if (typeof CombatJuice.spawnHitSparks === 'function') {
          CombatJuice.spawnHitSparks(cand.target.x, cand.target.y + (cand.target.height || 1.0) * 0.5, cand.target.z, atkInfo.isCrit);
        }
        if (typeof CombatJuice.triggerHitstop === 'function') {
          CombatJuice.triggerHitstop(atkInfo.isCrit ? 0.08 : (isHeavy ? 0.06 : 0.035));
        }
        if (typeof CombatJuice.triggerCameraShake === 'function') {
          CombatJuice.triggerCameraShake(atkInfo.isCrit ? 0.22 : (isHeavy ? 0.14 : 0.06), atkInfo.isCrit ? 0.24 : 0.16);
        }
      }
      if (typeof toast === 'function') {
        const critText = atkInfo.isCrit ? ' 💥 KRITICKÝ ZÁSAH!' : '';
        const heavyLabel = isHeavy ? '⚡ Těžký zásah' : 'Zásah';
        toast(`${heavyLabel} do ${cand.target.name || 'nestvůry'}: -${atkInfo.damage} HP${critText}`);
      }
    } else if (cand.type === 'player') {
      if (window.networkManager && typeof window.networkManager.sendPlayerHit === 'function') {
        window.networkManager.sendPlayerHit(cand.id, atkInfo.damage, knockback, atkInfo.isCrit, atkInfo.weaponName);
      }
      if (typeof CombatJuice !== 'undefined') {
        if (typeof CombatJuice.spawnHitSparks === 'function') {
          CombatJuice.spawnHitSparks(cand.dx + eyeX, cand.dy + eyeY, cand.dz + eyeZ, atkInfo.isCrit);
        }
        if (typeof CombatJuice.triggerHitstop === 'function') {
          CombatJuice.triggerHitstop(atkInfo.isCrit ? 0.07 : 0.035);
        }
        if (typeof CombatJuice.triggerCameraShake === 'function') {
          CombatJuice.triggerCameraShake(atkInfo.isCrit ? 0.18 : 0.08, 0.18);
        }
      }
      if (typeof toast === 'function') {
        const critText = atkInfo.isCrit ? ' 💥 KRITICKÝ ZÁSAH!' : '';
        const heavyLabel = isHeavy ? '⚡ Těžký zásah' : 'Zásah';
        toast(`${heavyLabel} do hráče ${cand.p.nickname || 'Přítel'}: -${atkInfo.damage} HP${critText}`);
      }
    }
  }
}


let activeAttackHand = 'dominant'; // 'dominant' nebo 'secondary'
let attackType = 'light'; // 'light' (LMB rychlý) nebo 'heavy' (RMB pomalejší s pohybem těla)
window.activeAttackHand = activeAttackHand;
window.attackType = attackType;
window.getActiveAttackHand = () => activeAttackHand;
window.getAttackType = () => attackType;

function getHandItem(whichHand) {
  if (whichHand === 'secondary') {
    return (typeof getEquippedSecondaryHandItem === 'function') ? getEquippedSecondaryHandItem() : null;
  } else {
    return (typeof getEquippedDominantHandItem === 'function') ? getEquippedDominantHandItem() : null;
  }
}

function handleHandAction(whichHand, opts = null) {
  if ((typeof escOpen !== 'undefined' && escOpen) || (typeof charOpen !== 'undefined' && charOpen) || (typeof invOpen !== 'undefined' && invOpen) || (typeof emoteOpen !== 'undefined' && emoteOpen) || (typeof chatOpen !== 'undefined' && chatOpen) || (typeof isRolling !== 'undefined' && isRolling) || (typeof attacking !== 'undefined' && attacking)) return false;

  // Pokud hráč sedí a jede na drakovi, místo útoku zbraněmi drak chrlí oheň nebo mráz
  if (typeof P !== 'undefined' && P && P.isRiding && (P.canFly || (P.ridingPet && P.ridingPet.isDragon) || (typeof window !== 'undefined' && window.PetManager && window.PetManager.activePet && window.PetManager.activePet.isDragon))) {
    if (typeof window !== 'undefined' && window.PetManager && typeof window.PetManager.triggerMountDragonBreath === 'function') {
      return window.PetManager.triggerMountDragonBreath();
    }
  }

  const item = getHandItem(whichHand);

  // 1. Pokud je v této ruce štít: stisknutí tlačítka vykrývá útoky
  if (item && item.subcat === 'shield') {
    isPlayerBlocking = true;
    blockingHand = whichHand;
    P.isBlocking = true;
    return true;
  }

  // 2. Pokud je v této ruce spotřební lektvar nebo jídlo
  if (item && (item.subcat === 'consumable' || item.healHp || item.restoreStamina || item.buffStrength || item.buffSpeed || item.id === 'potion_hp' || item.id === 'apple' || (item.id && item.id.startsWith('potion_')))) {
    if (typeof window !== 'undefined' && typeof window.useConsumableItem === 'function') {
      return window.useConsumableItem(item);
    } else if (G.hp < (P.maxHp || 100)) {
      G.hp = Math.min(P.maxHp || 100, G.hp + (item.healHp || 40));
      if (typeof ui === 'function') ui();
      if (typeof playAttackSound === 'function') playAttackSound('punch');
      if (typeof toast === 'function') toast(`🧪 Vypit ${item.name || 'léčivý lektvar'} (+${item.healHp || 40} HP)`);
      return true;
    }
    return false;
  }

  // 3. Útok danou rukou (dominantní nebo sekundární)
  return triggerHandAttack(whichHand, opts);
}

function handleHandRelease(whichHand) {
  if (blockingHand === whichHand) {
    isPlayerBlocking = false;
    blockingHand = null;
    P.isBlocking = false;
  }
}

// ---------- Správce 3D Projektilů (Luky, Ohnivé a Ledové Hole - F7) ----------
const ProjectileManager = {
  projectiles: [],
  nextId: 1,

  createMesh(type) {
    if (typeof THREE === 'undefined') return null;
    const grp = new THREE.Group();
    if (type === 'arrow') {
      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.018, 0.72, 6),
        new THREE.MeshLambertMaterial({ color: 0x8a5a30 })
      );
      shaft.rotation.x = Math.PI / 2;
      grp.add(shaft);
      const tip = new THREE.Mesh(
        new THREE.ConeGeometry(0.045, 0.14, 4),
        new THREE.MeshLambertMaterial({ color: 0xd5dbe6 })
      );
      tip.rotation.x = Math.PI / 2;
      tip.position.z = 0.4;
      grp.add(tip);
    } else if (type === 'fireball') {
      const core = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.22, 1),
        new THREE.MeshBasicMaterial({ color: 0xff4500 })
      );
      const aura = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.32, 1),
        new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.55 })
      );
      grp.add(core);
      grp.add(aura);
    } else if (type === 'frost') {
      const shard = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.24, 0),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
      );
      shard.scale.set(0.7, 0.7, 1.6);
      grp.add(shard);
    }
    return grp;
  },

  spawn(cfg) {
    const type = cfg.type || 'arrow';
    const mesh = this.createMesh(type);
    if (mesh && typeof scene !== 'undefined') {
      mesh.position.set(cfg.x, cfg.y, cfg.z);
      scene.add(mesh);
    }
    const proj = {
      id: cfg.id || (this.nextId++),
      type,
      owner: cfg.owner || 'player',
      ownerId: cfg.ownerId || null,
      x: cfg.x,
      y: cfg.y,
      z: cfg.z,
      vx: cfg.vx,
      vy: cfg.vy,
      vz: cfg.vz,
      gravity: cfg.gravity !== undefined ? cfg.gravity : (type === 'arrow' ? -9.81 : 0),
      damage: cfg.damage || 28,
      isCrit: !!cfg.isCrit,
      weaponName: cfg.weaponName || 'Projektil',
      splashRadius: cfg.splashRadius || (type === 'fireball' ? 3.2 : 0),
      age: 0,
      maxAge: cfg.maxAge || 3.2,
      stuck: false,
      mesh
    };
    this.projectiles.push(proj);
    if (typeof window !== 'undefined' && window.EntityManager && Array.isArray(window.EntityManager.projectiles)) {
      window.EntityManager.projectiles = this.projectiles;
    }
    return proj;
  },

  spawnFromPlayer(weaponId, whichHand = 'dominant', opts = null) {
    const isHeavy = !!(opts && opts.attackType === 'heavy');
    const dmgMult = (opts && typeof opts.damageMult === 'number') ? opts.damageMult : (isHeavy ? 1.50 : 1.0);
    const spdMult = (opts && typeof opts.speedMult === 'number') ? opts.speedMult : (isHeavy ? 1.25 : 1.0);

    const rawAtk = (typeof getPlayerAttackDamage === 'function')
      ? getPlayerAttackDamage(whichHand)
      : { damage: 30, isCrit: false, weaponName: 'Projektil' };
    const atkInfo = {
      ...rawAtk,
      damage: Math.max(1, Math.round(rawAtk.damage * dmgMult))
    };

    const cp = Math.cos(pitch);
    const dirX = -Math.sin(yaw) * cp;
    const dirY = -Math.sin(pitch);
    const dirZ = -Math.cos(yaw) * cp;

    const type = weaponId === 'staff_fire' ? 'fireball' : (weaponId === 'staff_frost' ? 'frost' : 'arrow');
    const speed = (type === 'arrow' ? 42.0 : (type === 'frost' ? 36.0 : 32.0)) * spdMult;
    const startX = P.x + dirX * 0.65;
    const startY = (P.renderY ?? P.y) + 1.42 + dirY * 0.45;
    const startZ = P.z + dirZ * 0.65;

    const proj = this.spawn({
      type,
      owner: 'player',
      x: startX,
      y: startY,
      z: startZ,
      vx: dirX * speed,
      vy: dirY * speed + (type === 'arrow' ? 1.6 : 0),
      vz: dirZ * speed,
      damage: atkInfo.damage,
      isCrit: atkInfo.isCrit,
      weaponName: atkInfo.weaponName,
      splashRadius: type === 'fireball' ? (isHeavy ? 4.4 : 3.2) : 0
    });

    if (typeof window !== 'undefined' && window.networkManager && typeof window.networkManager.sendProjectileSpawn === 'function') {
      window.networkManager.sendProjectileSpawn(proj);
    }
    return proj;
  },

  detonateEffect(x, y, z, type) {
    if (typeof scene === 'undefined' || typeof THREE === 'undefined') return;
    const col = type === 'fireball' ? 0xff5500 : (type === 'frost' ? 0x38bdf8 : 0xe2e8f0);
    const radius = type === 'fireball' ? 1.8 : 0.7;
    const sphere = new THREE.Mesh(
      new THREE.OctahedronGeometry(radius, 1),
      new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.75 })
    );
    sphere.position.set(x, y, z);
    scene.add(sphere);
    let t = 0;
    const iv = setInterval(() => {
      t += 0.03;
      sphere.scale.setScalar(1 + t * 4.5);
      sphere.material.opacity = Math.max(0, 0.75 - t * 3.2);
      if (t >= 0.24) {
        clearInterval(iv);
        scene.remove(sphere);
      }
    }, 25);
  },

  applyImpact(proj, hitX, hitY, hitZ, directCreature = null, directPlayer = null) {
    this.detonateEffect(hitX, hitY, hitZ, proj.type);
    const kLen = Math.hypot(proj.vx, proj.vz) || 1;
    const kb = { x: (proj.vx / kLen) * 1.4, z: (proj.vz / kLen) * 1.4 };

    if (proj.type === 'fireball' && proj.splashRadius > 0 && window.EntityManager && Array.isArray(window.EntityManager.creatures)) {
      for (const c of window.EntityManager.creatures) {
        if (!c || c.state === 'Dead' || c.hp <= 0) continue;
        const d = Math.hypot(c.x - hitX, (c.y + 0.8) - hitY, c.z - hitZ);
        if (d <= proj.splashRadius) {
          const mult = Math.max(0.5, 1 - (d / proj.splashRadius) * 0.5);
          const splashDmg = Math.max(1, Math.round(proj.damage * mult));
          c.takeDamage(splashDmg, kb, proj.isCrit, 'player');
          if (typeof toast === 'function' && c === directCreature) {
            toast(`🔥 Ohnivá exploze zasáhla ${c.name}: -${splashDmg} HP!`);
          }
        }
      }
    } else if (directCreature) {
      directCreature.takeDamage(proj.damage, kb, proj.isCrit, 'player');
      if (proj.type === 'frost') {
        directCreature._frostSlowUntil = Date.now() + 4000;
        if (typeof toast === 'function') {
          toast(`❄️ Mrazivý zásah do ${directCreature.name}: -${proj.damage} HP (Zpomalení -40%)`);
        }
      } else if (typeof toast === 'function') {
        toast(`🏹 Zásah z dálky do ${directCreature.name}: -${proj.damage} HP${proj.isCrit ? ' 💥 KRIT!' : ''}`);
      }
    }

    if (directPlayer && proj.owner === 'player') {
      if (window.networkManager && typeof window.networkManager.sendPlayerHit === 'function') {
        window.networkManager.sendPlayerHit(directPlayer.id, proj.damage, kb, proj.isCrit, proj.weaponName);
      }
      if (typeof toast === 'function') {
        toast(`🏹 Zásah do hráče ${directPlayer.p.nickname || 'Přítel'}: -${proj.damage} HP`);
      }
    }
  },

  update(dt) {
    if (!this.projectiles.length) return;
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.age += dt;
      if (p.age >= p.maxAge) {
        if (p.mesh && typeof scene !== 'undefined') scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
        continue;
      }
      if (p.stuck) continue;

      p.vy += p.gravity * dt;
      const nx = p.x + p.vx * dt;
      const ny = p.y + p.vy * dt;
      const nz = p.z + p.vz * dt;

      // Kontrola zásahu PvE bytostí
      let hitCreature = null;
      if (p.owner === 'player' && window.EntityManager && Array.isArray(window.EntityManager.creatures)) {
        for (const c of window.EntityManager.creatures) {
          if (!c || c.state === 'Dead' || c.hp <= 0) continue;
          const cy = c.y + (c.height || 1.0) * 0.5;
          const d = Math.hypot(c.x - nx, cy - ny, c.z - nz);
          if (d <= (c.hitboxRadius || 0.85) + 0.35) {
            hitCreature = c;
            break;
          }
        }
      }

      // Kontrola zásahu vzdálených hráčů
      let hitRemote = null;
      if (!hitCreature && p.owner === 'player' && window.networkManager && window.networkManager.remotePlayers) {
        for (const [id, rp] of window.networkManager.remotePlayers) {
          if (!rp.group) continue;
          const d = Math.hypot(rp.group.position.x - nx, (rp.group.position.y + 0.9) - ny, rp.group.position.z - nz);
          if (d <= 0.95) {
            hitRemote = { id, p: rp };
            break;
          }
        }
      }

      // Kontrola kolize s pevným terénem
      const hitSolid = (typeof solid === 'function') ? solid(nx, ny, nz) : false;

      if (hitCreature || hitRemote || hitSolid) {
        this.applyImpact(p, nx, ny, nz, hitCreature, hitRemote);
        if (p.mesh && typeof scene !== 'undefined') scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
        continue;
      }

      p.x = nx; p.y = ny; p.z = nz;
      if (p.mesh) {
        p.mesh.position.set(p.x, p.y, p.z);
        p.mesh.rotation.y = Math.atan2(p.vx, p.vz);
      }
    }
  }
};
if (typeof window !== 'undefined') {
  window.ProjectileManager = ProjectileManager;
}

function resetAttackState() {
  attacking = false;
  attackTime = 0;
}
if (typeof window !== 'undefined') {
  window.resetAttackState = resetAttackState;
}

function triggerHandAttack(whichHand, opts = null) {
  if ((typeof escOpen !== 'undefined' && escOpen) || (typeof charOpen !== 'undefined' && charOpen) || (typeof invOpen !== 'undefined' && invOpen) || (typeof isRolling !== 'undefined' && isRolling) || (typeof attacking !== 'undefined' && attacking)) return false;

  // Pokud hráč sedí a jede na drakovi, místo útoku zbraněmi drak chrlí oheň nebo mráz
  if (typeof P !== 'undefined' && P && P.isRiding && (P.canFly || (P.ridingPet && P.ridingPet.isDragon) || (typeof window !== 'undefined' && window.PetManager && window.PetManager.activePet && window.PetManager.activePet.isDragon))) {
    if (typeof window !== 'undefined' && window.PetManager && typeof window.PetManager.triggerMountDragonBreath === 'function') {
      return window.PetManager.triggerMountDragonBreath();
    }
  }

  const item = getHandItem(whichHand);
  const itId = item ? item.id : null;
  const isSkill = !!(opts && opts.isSkill);
  const isHeavy = !!(opts && opts.attackType === 'heavy');

  activeAttackHand = whichHand;
  window.activeAttackHand = whichHand;
  attackType = isHeavy ? 'heavy' : 'light';
  window.attackType = attackType;
  attacking = true;
  attackTime = 0;
  attackCombo = (attackCombo + 1) % 2;

  if (isHeavy) {
    // Pomalejší těžký útok (Slot 2 / RMB) s pohybem celého těla
    if (!itId) {
      attackDuration = 0.42; playAttackSound('heavy');
    } else if (itId === 'spear') {
      attackDuration = 0.48; playAttackSound('thrust');
    } else if (itId === 'dagger') {
      attackDuration = 0.40; playAttackSound('slash');
    } else if (itId === 'greatsword' || itId === 'battleaxe' || itId === 'hammer') {
      attackDuration = 0.56; playAttackSound('heavy');
    } else if (itId === 'staff_fire' || itId === 'staff_frost') {
      attackDuration = 0.50; playAttackSound('staff');
    } else if (itId === 'bow') {
      attackDuration = 0.50; playAttackSound('bow');
    } else {
      attackDuration = 0.48; playAttackSound('heavy');
    }

    // Fyzický pohyb postavy při těžkém útoku (výpad vpřed, skokový dopad nebo zpětný ráz luku)
    const fwdX = -Math.sin(yaw);
    const fwdZ = -Math.cos(yaw);
    face = Math.atan2(fwdX, fwdZ);

    if (itId === 'greatsword' || itId === 'battleaxe' || itId === 'hammer' || (item && item.subcat === 'axe')) {
      // Skokový drtivý dopad vpřed
      P.vx = fwdX * 6.4;
      P.vz = fwdZ * 6.4;
      if (P.ground && !P.inWater) {
        P.vy = 2.5;
        P.ground = false;
      }
    } else if (itId === 'spear') {
      // Dlouhý skluzný výpad vpřed
      P.vx = fwdX * 8.2;
      P.vz = fwdZ * 8.2;
    } else if (itId === 'dagger') {
      // Bleskový nízký přemet/pirueta vpřed
      P.vx = fwdX * 7.2;
      P.vz = fwdZ * 7.2;
    } else if (itId === 'bow') {
      // Stabilizační zakleknutí a mírný zpětný ráz tělem
      P.vx = -fwdX * 2.8;
      P.vz = -fwdZ * 2.8;
    } else if (itId === 'staff_fire' || itId === 'staff_frost') {
      // Magický výkrok s rázem
      P.vx = fwdX * 4.2;
      P.vz = fwdZ * 4.2;
    } else {
      // Meče, katany, palcáty a pěsti: razantní výpadový krok vpřed s rotací těla
      P.vx = fwdX * 6.2;
      P.vz = fwdZ * 6.2;
    }
  } else {
    // Rychlý primární útok (Slot 1 / LMB) nebo skill
    if (!itId) {
      attackDuration = 0.22; playAttackSound('punch');
    } else if (itId === 'spear') {
      attackDuration = 0.28; playAttackSound('thrust');
    } else if (itId === 'dagger') {
      attackDuration = 0.20; playAttackSound('slash');
    } else if (itId === 'greatsword' || itId === 'battleaxe' || itId === 'hammer') {
      attackDuration = 0.38; playAttackSound('heavy');
    } else if (itId === 'staff_fire' || itId === 'staff_frost') {
      attackDuration = 0.32; playAttackSound('staff');
    } else if (itId === 'bow') {
      attackDuration = 0.30; playAttackSound('bow');
    } else {
      attackDuration = 0.26; playAttackSound('slash');
    }
  }

  // Spuštění dynamické světelné stopy zbraně (Weapon Slash Trail)
  if (typeof CombatJuice !== 'undefined' && typeof CombatJuice.spawnWeaponTrail === 'function') {
    if (itId !== 'bow') {
      const isAxeOrCleave = itId === 'greatsword' || itId === 'battleaxe' || itId === 'hammer';
      CombatJuice.spawnWeaponTrail({
        radius: isHeavy ? (isAxeOrCleave ? 2.2 : 1.9) : (isAxeOrCleave ? 1.7 : 1.4),
        isHeavy,
        isCrit: !!(typeof isPlayerCritReady === 'function' && isPlayerCritReady()),
        color: (itId === 'staff_fire') ? 0xf97316 : ((itId === 'staff_frost') ? 0x38bdf8 : (isHeavy ? 0xfbbf24 : 0x7dd3fc)),
        swingSign: attackCombo === 0 ? 1 : -1
      });
    }
  }

  if (!isSkill) {
    const hitOpts = isHeavy ? { attackType: 'heavy', damageMult: 1.50, reachBonus: 0.45, knockbackMult: 1.7 } : { attackType: 'light' };
    // Střelné a magické zbraně vystřelují 3D projektil
    if (itId === 'bow' || itId === 'staff_fire' || itId === 'staff_frost') {
      ProjectileManager.spawnFromPlayer(itId, whichHand, hitOpts);
    }

    setTimeout(() => {
      checkPvPHit(whichHand, hitOpts);
    }, Math.min(180, Math.round(attackDuration * 340)));
  }
  return true;
}

function triggerAttack() {
  return triggerHandAttack('dominant', { attackType: 'light' });
}

const keys = {};
let drag = false;
let isPlayerBlocking = false;
let blockingHand = null;
window.isPlayerBlocking = () => isPlayerBlocking;

function startActionBarBlock() {
  if (escOpen || charOpen || invOpen || (typeof emoteOpen !== 'undefined' && emoteOpen) || (typeof chatOpen !== 'undefined' && chatOpen) || isRolling) return;
  isPlayerBlocking = true;
  blockingHand = 'actionbar';
  P.isBlocking = true;
  if (typeof playBlockSound === 'function') playBlockSound();
}

function stopActionBarBlock() {
  isPlayerBlocking = false;
  blockingHand = null;
  P.isBlocking = false;
}
window.startActionBarBlock = startActionBarBlock;
window.stopActionBarBlock = stopActionBarBlock;

// Event listenery pro ovládání myší (Mapovatelné spouštěče Akční Lišty)
function initPlayerControls(cv) {
  cv.addEventListener('contextmenu', e => e.preventDefault());
  cv.addEventListener('mousedown', e => {
    if (typeof tryEnableFullscreen === 'function') tryEnableFullscreen();
    const isP2POpen = document.getElementById('p2pModal') && !document.getElementById('p2pModal').hidden;
    if (escOpen || charOpen || invOpen || (typeof emoteOpen !== 'undefined' && emoteOpen) || (typeof chatOpen !== 'undefined' && chatOpen) || (typeof minimapOpen !== 'undefined' && minimapOpen) || isP2POpen) return;

    if (e.button === 0 && !document.pointerLockElement) {
      drag = true;
      try { cv.requestPointerLock(); } catch (err) { }
    }

    const bindCode = 'Mouse' + e.button;
    if (typeof ActionBarManager !== 'undefined' && typeof ActionBarManager.triggerByInputCode === 'function') {
      ActionBarManager.triggerByInputCode(bindCode);
    } else {
      // Fallback pokud není načten ActionBarManager
      if (e.button === 0) handleHandAction('dominant');
      else if (e.button === 2) handleHandAction('secondary');
    }
  });

  addEventListener('mouseup', e => {
    drag = false;
    const bindCode = 'Mouse' + e.button;
    if (typeof ActionBarManager !== 'undefined' && typeof ActionBarManager.releaseByInputCode === 'function') {
      ActionBarManager.releaseByInputCode(bindCode);
    } else {
      if (e.button === 0) handleHandRelease('dominant');
      if (e.button === 2) handleHandRelease('secondary');
    }
  });
  addEventListener('mousemove', e => {
    const isP2POpen = document.getElementById('p2pModal') && !document.getElementById('p2pModal').hidden;
    if ((document.pointerLockElement || drag) && !escOpen && !charOpen && !invOpen && !(typeof chatOpen !== 'undefined' && chatOpen) && !(typeof minimapOpen !== 'undefined' && minimapOpen) && !isP2POpen) {
      yaw -= e.movementX * 0.0025;
      pitch = Math.min(1.4, Math.max(-0.4, pitch + e.movementY * 0.0025));
    }
  });

  addEventListener('wheel', e => {
    const isP2POpen = document.getElementById('p2pModal') && !document.getElementById('p2pModal').hidden;
    if (escOpen || charOpen || invOpen || (typeof chatOpen !== 'undefined' && chatOpen) || (typeof minimapOpen !== 'undefined' && minimapOpen) || isP2POpen) return;
    dist = Math.min(14, Math.max(0, dist + e.deltaY * 0.005));
  }, { passive: true });
}

// Kolize a fyzikální simulace
const HW = 0.3;
const STANDING_HT = 1.8;
const SWIMMING_HT = 0.7;
const ROLLING_HT = 0.85;

function getPlayerHitboxHeight() {
  if (P.isSwimming) return SWIMMING_HT;
  if (isRolling) return ROLLING_HT;
  return STANDING_HT;
}

function hits(x, y, z, customH) {
  const ht = (customH !== undefined) ? customH : getPlayerHitboxHeight();
  for (let i = Math.floor((x - HW) / S); i <= Math.floor((x + HW) / S); i++) {
    for (let j = Math.floor(y / S); j <= Math.floor((y + ht - 0.01) / S); j++) {
      for (let k = Math.floor((z - HW) / S); k <= Math.floor((z + HW) / S); k++) {
        if (vs(i, j, k)) return true;
      }
    }
  }
  return false;
}

// Automatické vyproštění hráče, pokud se jeho hitbox kdykoliv ocitne uvnitř bloku (např. při teleportaci nebo výpadu)
function resolvePlayerStuck() {
  if (!hits(P.x, P.y, P.z)) return false;

  // 1. Zkusit drobné horizontální a vertikální odsunutí od hrany bloku
  const nudges = [0, -0.18, 0.18, -0.35, 0.35, -0.55, 0.55];
  const ySteps = [0, 0.25, 0.52, 1.02, -0.25];
  for (const dy of ySteps) {
    for (const dx of nudges) {
      for (const dz of nudges) {
        if (dx === 0 && dy === 0 && dz === 0) continue;
        if (!hits(P.x + dx, P.y + dy, P.z + dz)) {
          P.x += dx;
          P.y += dy;
          P.z += dz;
          if (dy > 0) {
            P.vy = Math.max(0, P.vy);
            P.ground = true;
          }
          return true;
        }
      }
    }
  }

  // 2. Pokud je hráč hlouběji v bloku, plynule jej vytáhnout nahoru na první volný povrch
  for (let step = 1; step <= 36; step++) {
    const testY = P.y + step * S;
    if (!hits(P.x, testY, P.z)) {
      P.y = testY;
      P.renderY = testY;
      P.vy = 0;
      P.ground = true;
      return true;
    }
  }
  return false;
}
if (typeof window !== 'undefined') {
  window.resolvePlayerStuck = resolvePlayerStuck;
}

function physics(dt) {
  if (P && P.isDead) {
    P.vx = 0;
    P.vz = 0;
    return;
  }
  if (autoJumpTimer > 0) autoJumpTimer -= dt;
  if (waterJumpTimer > 0) waterJumpTimer -= dt;

  resolvePlayerStuck();

  const wb = y => block(Math.floor(P.x / S), Math.floor(y / S), Math.floor(P.z / S));
  const lq = b => b === 5 || b === 11;
  const inW = lq(wb(P.y + 0.3)) || lq(wb(P.y + 0.9));
  let waterTopY = -999;
  if (inW) {
    const curVoxelY = Math.floor((P.y + 1.2) / S);
    for (let testY = curVoxelY + 3; testY >= curVoxelY - 4; testY--) {
      if (lq(block(Math.floor(P.x / S), testY, Math.floor(P.z / S)))) {
        waterTopY = (testY + 1) * S;
        break;
      }
    }
  }
  const surf = inW && (waterTopY > -900) && (P.y >= waterTopY - 1.15);
  const headUnderwater = inW && (waterTopY > -900 ? (P.y + 1.55 < waterTopY) : lq(wb(P.y + 1.65)));

  P.inWater = inW;
  P.headUnderwater = headUnderwater;
  P.waterTopY = waterTopY;
  P.waterSurfaceTread = inW && surf;

  if (inW) {
    waterExitTimer = 0.35;
  } else {
    waterExitTimer = Math.max(0, waterExitTimer - dt);
  }

  // Kyslík & topení se pod vodou
  if (headUnderwater) {
    G.o2 = Math.max(0, G.o2 - 7.5 * dt); // cca 13 sekund dechu
    if (G.o2 <= 0) hurt(10 * dt);
  } else {
    if (G.o2 < 100) G.o2 = Math.min(100, G.o2 + 35 * dt);
  }

  if (wb(P.y + 0.2) === 11) {
    P.x = SPX; P.z = SPZ; P.y = SPY; P.vx = P.vy = P.vz = 0;
  }

  let fx = 0, fz = 0;
  if (keys.KeyW || keys.ArrowUp) fz++;
  if (keys.KeyS || keys.ArrowDown) fz--;
  if (keys.KeyD || keys.ArrowRight) fx++;
  if (keys.KeyA || keys.ArrowLeft) fx--;

  const l = Math.hypot(fx, fz) || 1;
  fx /= l; fz /= l;
  P.moveX = fx;
  P.moveZ = fz;

  const isMovingInput = (fx !== 0 || fz !== 0);
  const isMovingFast = Math.hypot(P.vx, P.vz) > 0.12;

  // Hráč plave (vodorovná plavecká animace i nízký hitbox 0.7m), pokud je ve vodě, pohybuje se a nestojí nohama pevně na dně
  const isSwimming = inW && (!P.ground || (waterTopY > -900 && P.y > waterTopY - 0.75)) && (isMovingInput || isMovingFast);
  P.isSwimming = isSwimming;

  // Kotrmelec (Elden Ring Dodge Roll) - priorita pohybu
  if (isRolling) {
    rollTimer += dt;
    if (rollTimer >= ROLL_DURATION) {
      isRolling = false;
      rollTimer = 0;
    } else {
      const p = rollTimer / ROLL_DURATION;
      let rollSpeed;
      if (p < 0.25) {
        // Fáze 1: Skok střemhlav (rychlý rozjezd)
        rollSpeed = 11.2;
      } else if (p < 0.72) {
        // Fáze 2: Kotrmelec na zemi
        const t = (p - 0.25) / 0.47;
        rollSpeed = 11.2 - t * 3.7;
      } else {
        // Fáze 3: Dojezd a zvednutí se na nohy
        const t = (p - 0.72) / 0.28;
        rollSpeed = 7.5 - t * 2.5;
      }
      P.vx = rollDirX * rollSpeed;
      P.vz = rollDirZ * rollSpeed;
      face = Math.atan2(rollDirX, rollDirZ);
    }
  } else {
    const sprint = (keys.ShiftLeft || keys.ShiftRight) && (fx || fz) && G.st > 0 && !G.tired && !isPlayerBlocking;
    isSprinting = sprint;

    const maxSt = P.maxStamina || 100;
    if (sprint) {
      G.st = Math.max(0, G.st - 12 * dt);
      G.sd = 0;
      if (G.st <= 0) G.tired = 1;
    } else {
      G.sd += dt;
      if (G.sd > 0.7) G.st = Math.min(maxSt, G.st + 20 * dt);
      if (G.tired && G.st > 25) G.tired = 0;
    }

    // Rychlost: ve vodě plavecká rychlost + bonusy z výbavy, lektvaru hbitosti a úrovně
    const bonusSpd = (typeof getPlayerBonusSpeed === 'function') ? getPlayerBonusSpeed() : 0;
    const buffSpd = (typeof getActiveBuffMultiplier === 'function') ? getActiveBuffMultiplier('speed') : 0;
    const lvlSpdBonus = (P.baseStats && P.baseStats.moveSpeed) ? Math.max(0, (P.baseStats.moveSpeed - 6.0) * 0.05) : 0;
    const blockMult = isPlayerBlocking ? 0.70 : 1.0;
    const totalMult = (1 + bonusSpd + buffSpd + lvlSpdBonus) * blockMult;

    let sp;
    if (inW) {
      if (P.isRiding && typeof window !== 'undefined' && window.PetManager && typeof window.PetManager.dismountPet === 'function') {
        window.PetManager.dismountPet(true);
      }
      sp = (sprint ? 4.5 : 3.2) * totalMult; // Plavecká rychlost
    } else if (waterExitTimer > 0) {
      sp = 4.2 * totalMult; // Přechodová rychlost po opuštění vody
    } else if (P.isRiding) {
      const baseRideSpd = P.rideSpeed || 9.5;
      sp = (sprint ? baseRideSpd * 1.22 : baseRideSpd) * totalMult; // Rychlost jízdy na mazlíčkovi
    } else {
      sp = (sprint ? 9 : 5.5) * totalMult; // Běžná pozemní rychlost
    }

    const wx = (-Math.sin(yaw)) * fz + Math.cos(yaw) * fx;
    const wz = (-Math.cos(yaw)) * fz - Math.sin(yaw) * fx;
    const k = 1 - Math.exp(-(P.ground ? 14 : inW ? 6 : 4) * dt);
    P.vx += (wx * sp - P.vx) * k;
    P.vz += (wz * sp - P.vz) * k;

    if (fx || fz) face = Math.atan2(wx, wz);
  }

  if (inW) {
    if (waterJumpTimer > 0) {
      // Během výskoku z vody na břeh zachovat plný vertikální impuls bez vodního brzdění
      P.vy -= 22 * dt;
    } else {
      P.vy *= 1 - 3 * dt;

      if (waterTopY > -900) {
        // Výška hladiny je waterTopY. Cíl pro plavání u hladiny:
        const targetSurfaceY = waterTopY - 0.9;

        if (keys.Space) {
          if (P.y < targetSurfaceY - 0.25) {
            // Pod hladinou: plave vzhůru k hladině
            P.vy += 10.0 * dt;
            if (P.vy > 3.2) P.vy = 3.2;
          } else {
            // U hladiny a stisknut mezerník: VÝSKOK Z VODY NA BŘEH!
            P.vy = 7.8;
            waterJumpTimer = 0.4;
            autoJumpTimer = 0.35;
            if (typeof playJumpSound === 'function') playJumpSound();

            // Dopředný impuls směrem na břeh, pokud se hráč hýbe
            if (fx || fz) {
              const spd = Math.hypot(P.vx, P.vz) || 1;
              P.vx += (P.vx / spd) * 2.2;
              P.vz += (P.vz / spd) * 2.2;
            }
          }
        } else {
          // Nedrží mezerník: přirozený vztlak / držení se u hladiny
          const restingY = targetSurfaceY - 0.15;
          const diff = restingY - P.y;
          P.vy += diff * 4.5 * dt - 4.0 * dt;
        }
      } else {
        P.vy -= 12 * dt;
        if (keys.Space) {
          P.vy = 7.5;
          waterJumpTimer = 0.38;
        }
      }

      // Automatické vystoupení / vyhoupnutí z vody na břeh při plavání směrem do břehu
      if (fx || fz) {
        const spd = Math.hypot(P.vx, P.vz);
        if (spd > 0.12 && autoJumpTimer <= 0) {
          const dirX = P.vx / spd, dirZ = P.vz / spd;
          const testX = P.x + dirX * 0.42, testZ = P.z + dirZ * 0.42;

          // Je před námi pevný blok břehu?
          const hitsBank = hits(testX, P.y + 0.25, testZ, 0.5) || (waterTopY > -900 && hits(testX, waterTopY - 0.2, testZ, 0.5));
          // A je nad břehem volno k vystoupení?
          const clearAbove = (waterTopY > -900)
            ? (!hits(testX, waterTopY + 0.05, testZ, STANDING_HT) && !hits(P.x, waterTopY + 0.15, P.z, 0.7))
            : (!hits(testX, P.y + 0.8, testZ, STANDING_HT));

          if (hitsBank && clearAbove) {
            P.vy = 7.0; // Plynulé vyhoupnutí na břeh
            waterJumpTimer = 0.38;
            autoJumpTimer = 0.45;
            P.vx += dirX * 1.8;
            P.vz += dirZ * 1.8;
          }
        }
      }
    }
  } else if (P.isRiding && P.canFly) {
    // Volný 3D let na wyverně (Dragon Flight): Mezerník stoupání, Shift klesání, vznášení
    if (keys.Space) {
      P.vy = 8.5;
      if (typeof playDragonWingFlap === 'function' && Math.random() < 0.12) {
        playDragonWingFlap();
      }
    } else if (keys.ShiftLeft || keys.ShiftRight) {
      P.vy = -7.5;
    } else {
      P.vy = Math.sin(Date.now() * 0.003) * 0.35;
    }
  } else {
    P.vy -= 26 * dt;
    if (keys.Space && P.ground && !isRolling) {
      P.vy = P.isRiding ? (P.rideJumpBoost || 10.5) : 9.2; // Výskok (nebo skok s mazlíčkem)
    }
    if (P.vy < -30) P.vy = -30;
  }

  const wasG = P.ground;
  P.ground = false;

  // Plynulé vyběhnutí schodů/břehu (Step-assist):
  // Funguje na souši i při výstupu z vody na břeh, s vyšším prahem při jízdě na mazlíčkovi
  const stepLimit = P.isRiding ? 1.15 : 0.55;
  const canStep = (wasG || P.isRiding || (inW && (waterTopY > -900 ? P.y >= waterTopY - 1.25 : true))) && (fx || fz);

  // Pohyb po ose X
  const dx = P.vx * dt;
  if (dx !== 0) {
    if (!hits(P.x + dx, P.y, P.z)) {
      P.x += dx;
    } else if (canStep) {
      let stepped = false;
      const maxSteps = P.isRiding ? 2 : 1;
      for (let sIdx = 1; sIdx <= maxSteps; sIdx++) {
        const stepY = (Math.floor(P.y / S) + sIdx) * S;
        if (stepY > P.y && stepY - P.y <= stepLimit && !hits(P.x, P.y + stepLimit, P.z) && !hits(P.x + dx, stepY, P.z)) {
          P.x += dx;
          P.y = stepY;
          P.ground = true;
          stepped = true;
          break;
        }
      }
      if (!stepped) {
        P.vx *= 0.2;
      }
    } else {
      P.vx *= 0.2;
    }
  }

  // Pohyb po ose Z
  const dz = P.vz * dt;
  if (dz !== 0) {
    if (!hits(P.x, P.y, P.z + dz)) {
      P.z += dz;
    } else if (canStep) {
      let stepped = false;
      const maxSteps = P.isRiding ? 2 : 1;
      for (let sIdx = 1; sIdx <= maxSteps; sIdx++) {
        const stepY = (Math.floor(P.y / S) + sIdx) * S;
        if (stepY > P.y && stepY - P.y <= stepLimit && !hits(P.x, P.y + stepLimit, P.z) && !hits(P.x, stepY, P.z + dz)) {
          P.z += dz;
          P.y = stepY;
          P.ground = true;
          stepped = true;
          break;
        }
      }
      if (!stepped) {
        P.vz *= 0.2;
      }
    } else {
      P.vz *= 0.2;
    }
  }

  P.y += P.vy * dt;
  if (hits(P.x, P.y, P.z)) {
    P.y -= P.vy * dt;
    if (P.vy < 0) {
      P.ground = true;
      if (P.vy < -18 && !inW && !(P.isRiding && P.canFly)) hurt((-P.vy - 18) * 5);
    }
    P.vy = 0;
  }

  if (P.y < -20) {
    P.x = SPX; P.z = SPZ; P.y = SPY; P.vy = 0;
  }

  if (typeof ProjectileManager !== 'undefined' && typeof ProjectileManager.update === 'function') {
    ProjectileManager.update(dt);
  }
}
