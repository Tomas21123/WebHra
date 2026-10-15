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
const P = { x: SPX, y: SPY, z: SPZ, vx: 0, vy: 0, vz: 0, ground: false, moveX: 0, moveZ: 0 };

let yaw = 0, pitch = 0.45, dist = 6, face = 0, phase = 0;
let isSprinting = false, airBlend = 0, landingSquash = 0, wasGround = true;
let attacking = false, attackTime = 0, attackDuration = 0.26, attackCombo = 0;
let autoJumpTimer = 0, waterExitTimer = 0;

// Elden Ring / Souls-like Dodge Roll (Kotrmelec)
let isRolling = false;
let rollTimer = 0;
const ROLL_DURATION = 0.62;
let rollDirX = 0, rollDirZ = 0;
let lastShiftTapTime = 0;

function triggerRoll() {
  if (isRolling || P.inWater || !P.ground || G.st < 5) return;
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

function checkPvPHit() {
  if (!window.networkManager || !window.networkManager.remotePlayers || window.networkManager.remotePlayers.size === 0) {
    return;
  }

  const reach = (typeof getPlayerAttackReach === 'function') ? getPlayerAttackReach() : 2.4;
  const atkInfo = (typeof getPlayerAttackDamage === 'function') ? getPlayerAttackDamage() : { damage: 12, isCrit: false, weaponName: 'Zbraň' };

  // Směr pohledu hráče
  const cp = Math.cos(pitch);
  const fwdX = -Math.sin(yaw) * cp;
  const fwdY = -Math.sin(pitch);
  const fwdZ = -Math.cos(yaw) * cp;

  const eyeX = P.x;
  const eyeY = (P.renderY ?? P.y) + 1.45;
  const eyeZ = P.z;

  let bestTarget = null;
  let bestScore = -Infinity;

  for (const [id, p] of window.networkManager.remotePlayers) {
    if (!p.group) continue;
    const targetX = p.group.position.x;
    const targetY = p.group.position.y + 0.9; // střed těla cíle
    const targetZ = p.group.position.z;

    const dx = targetX - eyeX;
    const dy = targetY - eyeY;
    const dz = targetZ - eyeZ;
    const dist = Math.hypot(dx, dy, dz);

    // Hitbox postavy: poloměr 0.75m, dosah zbraně
    if (dist <= reach + 0.75) {
      const dot = (dx * fwdX + dy * fwdY + dz * fwdZ) / (dist || 1);
      const minDot = dist < 1.2 ? 0.15 : 0.38;
      if (dot > minDot) {
        const score = dot * 10 - dist;
        if (score > bestScore) {
          bestScore = score;
          bestTarget = { id, p, dist, dx, dy, dz };
        }
      }
    }
  }

  if (bestTarget) {
    const kLen = Math.hypot(bestTarget.dx, bestTarget.dz) || 1;
    const knockback = {
      x: (bestTarget.dx / kLen) * (atkInfo.isCrit ? 1.5 : 1.0),
      z: (bestTarget.dz / kLen) * (atkInfo.isCrit ? 1.5 : 1.0)
    };

    window.networkManager.sendPlayerHit(bestTarget.id, atkInfo.damage, knockback, atkInfo.isCrit, atkInfo.weaponName);
    if (typeof toast === 'function') {
      const critText = atkInfo.isCrit ? ' 💥 KRITICKÝ ZÁSAH!' : '';
      toast(`Zásah do hráče ${bestTarget.p.nickname || 'Přítel'}: -${atkInfo.damage} HP${critText}`);
    }
  }
}

function triggerAttack() {
  if (escOpen || charOpen || invOpen || isRolling) return;
  attacking = true;
  attackTime = 0;
  attackCombo = (attackCombo + 1) % 2;

  if (!heldId) {
    attackDuration = 0.22; playAttackSound('punch');
  } else if (heldId === 'spear') {
    attackDuration = 0.28; playAttackSound('thrust');
  } else if (heldId === 'dagger') {
    attackDuration = 0.20; playAttackSound('slash');
  } else if (heldId === 'greatsword' || heldId === 'battleaxe' || heldId === 'hammer') {
    attackDuration = 0.38; playAttackSound('heavy');
  } else if (heldId === 'staff_fire') {
    attackDuration = 0.32; playAttackSound('staff');
  } else if (heldId === 'bow') {
    attackDuration = 0.30; playAttackSound('bow');
  } else {
    attackDuration = 0.26; playAttackSound('slash');
  }

  // Detekce zásahu do hitboxu protihráče synchronizovaná s animací úderu
  setTimeout(() => {
    checkPvPHit();
  }, Math.min(110, Math.round(attackDuration * 320)));
}

const keys = {};
let drag = false;

// Event listenery pro ovládání myší
function initPlayerControls(cv) {
  cv.addEventListener('mousedown', e => {
    if (typeof tryEnableFullscreen === 'function') tryEnableFullscreen();
    if (escOpen || charOpen || invOpen || (typeof emoteOpen !== 'undefined' && emoteOpen) || (typeof chatOpen !== 'undefined' && chatOpen)) return;
    if (e.button === 0) {
      triggerAttack();
      if (!document.pointerLockElement) {
        drag = true;
        try { cv.requestPointerLock(); } catch (err) {}
      }
    }
  });

  addEventListener('mouseup', () => drag = false);
  addEventListener('mousemove', e => {
    if ((document.pointerLockElement || drag) && !escOpen && !charOpen && !invOpen && !(typeof chatOpen !== 'undefined' && chatOpen)) {
      yaw -= e.movementX * 0.0025;
      pitch = Math.min(1.4, Math.max(-0.4, pitch + e.movementY * 0.0025));
    }
  });

  addEventListener('wheel', e => {
    if (escOpen || charOpen || (typeof chatOpen !== 'undefined' && chatOpen)) return;
    dist = Math.min(14, Math.max(0, dist + e.deltaY * 0.005));
  }, { passive: true });
}

// Kolize a fyzikální simulace
const HW = 0.3, HT = 1.8;

function hits(x, y, z) {
  for (let i = Math.floor((x - HW) / S); i <= Math.floor((x + HW) / S); i++) {
    for (let j = Math.floor(y / S); j <= Math.floor((y + HT - 0.01) / S); j++) {
      for (let k = Math.floor((z - HW) / S); k <= Math.floor((z + HW) / S); k++) {
        if (vs(i, j, k)) return true;
      }
    }
  }
  return false;
}

function physics(dt) {
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
    const sprint = (keys.ShiftLeft || keys.ShiftRight) && (fx || fz) && G.st > 0 && !G.tired;
    isSprinting = sprint;

    if (sprint) {
      G.st = Math.max(0, G.st - 12 * dt);
      G.sd = 0;
      if (G.st <= 0) G.tired = 1;
    } else {
      G.sd += dt;
      if (G.sd > 0.7) G.st = Math.min(100, G.st + 20 * dt);
      if (G.tired && G.st > 25) G.tired = 0;
    }

    // Rychlost: ve vodě (ani při skákání po hladině) nelze běhat rychlostí 9 m/s!
    const bonusSpd = (typeof getPlayerBonusSpeed === 'function') ? getPlayerBonusSpeed() : 0;
    let sp;
    if (inW) {
      sp = (sprint ? 4.2 : 3.0) * (1 + bonusSpd); // Plavecká rychlost
    } else if (waterExitTimer > 0) {
      sp = 4.0 * (1 + bonusSpd); // Přechodová rychlost po opuštění vody zabraňující bunny-hopu po vodě
    } else {
      sp = (sprint ? 9 : 5.5) * (1 + bonusSpd); // Běžná pozemní rychlost
    }

    const wx = (-Math.sin(yaw)) * fz + Math.cos(yaw) * fx;
    const wz = (-Math.cos(yaw)) * fz - Math.sin(yaw) * fx;
    const k = 1 - Math.exp(-(P.ground ? 14 : inW ? 6 : 4) * dt);
    P.vx += (wx * sp - P.vx) * k;
    P.vz += (wz * sp - P.vz) * k;

    if (fx || fz) face = Math.atan2(wx, wz);
  }

  if (inW) {
    P.vy *= 1 - 3 * dt;

    if (waterTopY > -900) {
      // Výška těla je HT = 1.8. Cíl je mít nad hladinou polovinu těla (od pasu nahoru):
      // Nohy (P.y) tedy mají být ve výšce waterTopY - 0.9.
      const targetSurfaceY = waterTopY - 0.9;

      if (keys.Space) {
        // Hráč drží mezerník ve vodě
        if (P.y < targetSurfaceY - 0.1) {
          // Pod hladinou: plave vzhůru k hladině
          P.vy += 8.0 * dt;
          if (P.vy > 2.8) P.vy = 2.8;
        } else {
          // U hladiny: aktivně se drží na hladině (do poloviny těla nad hladinou)
          // Žádné vystřelení nad hladinu ani stání na vodě!
          const diff = targetSurfaceY - P.y;
          P.vy += diff * 12.0 * dt;
          if (P.vy > 0.4) P.vy = 0.4;
          if (P.vy < -0.4) P.vy = -0.4;
        }
      } else {
        // Nedrží mezerník: přirozený vztlak / pomalé klesání k hrudníku
        const restingY = targetSurfaceY - 0.35;
        const diff = restingY - P.y;
        P.vy += diff * 4.0 * dt - 4.5 * dt;
      }
    } else {
      P.vy -= 9 * dt;
      if (keys.Space) P.vy = 3.0;
    }

    // Výstup z vody na břeh při pohybu do břehu (auto-step na břeh)
    if (fx || fz) {
      const spd = Math.hypot(P.vx, P.vz);
      if (spd > 0.18) {
        const dirX = P.vx / spd, dirZ = P.vz / spd;
        const testX = P.x + dirX * 0.36, testZ = P.z + dirZ * 0.36;
        if (hits(testX, P.y + 0.4, testZ) && !hits(testX, P.y + 1.1, testZ) && !hits(P.x, P.y + 1.2, P.z)) {
          if (keys.Space || autoJumpTimer <= 0) {
            P.vy = 5.6; // Vystoupení na břeh
            autoJumpTimer = 0.35;
          }
        }
      }
    }
  } else {
    P.vy -= 26 * dt;
    if (keys.Space && P.ground && !isRolling) P.vy = 9.2; // Normální výskok (o 1 blok méně než dříve)
    if (P.vy < -30) P.vy = -30;
  }

  const wasG = P.ground;
  P.ground = false;

  // Plynulé vyběhnutí kopce (Step-assist do výšky 1 bloku):
  // Namísto cloumavého vyskakování postava plynule vyběhne schody/kopec o 1 blok výš bez přerušení běhu.
  const stepLimit = 0.52;

  // Pohyb po ose X
  const dx = P.vx * dt;
  if (dx !== 0) {
    if (!hits(P.x + dx, P.y, P.z)) {
      P.x += dx;
    } else if (wasG && !inW && (fx || fz)) {
      const stepY = (Math.floor(P.y / S) + 1) * S;
      if (stepY > P.y && stepY - P.y <= stepLimit && !hits(P.x, P.y + stepLimit, P.z) && !hits(P.x + dx, stepY, P.z)) {
        P.x += dx;
        P.y = stepY;
        P.ground = true;
      } else {
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
    } else if (wasG && !inW && (fx || fz)) {
      const stepY = (Math.floor(P.y / S) + 1) * S;
      if (stepY > P.y && stepY - P.y <= stepLimit && !hits(P.x, P.y + stepLimit, P.z) && !hits(P.x, stepY, P.z + dz)) {
        P.z += dz;
        P.y = stepY;
        P.ground = true;
      } else {
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
      if (P.vy < -18 && !inW) hurt((-P.vy - 18) * 5);
    }
    P.vy = 0;
  }

  if (P.y < -20) {
    P.x = SPX; P.z = SPZ; P.y = SPY; P.vy = 0;
  }
}
