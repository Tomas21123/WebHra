const P = { x: 0.5, y: 0, z: 0.5, vx: 0, vy: 0, vz: 0, ground: false, moveX: 0, moveZ: 0 };
let sx = 0;
for (; sx < 3000; sx += 6) {
  const hh = height(sx, 0);
  if (hh >= SEA + 4 && biome(sx, 0, hh) === 0) break;
}
const SPX = sx * S + 0.5, SPY = Math.max(height(sx, 0), SEA) * S + 3;
P.x = SPX; P.y = SPY;

let yaw = 0, pitch = 0.45, dist = 6, face = 0, phase = 0;
let isSprinting = false, airBlend = 0, landingSquash = 0, wasGround = true;
let attacking = false, attackTime = 0, attackDuration = 0.26, attackCombo = 0;
let autoJumpTimer = 0, waterExitTimer = 0;

function triggerAttack() {
  if (escOpen || charOpen || invOpen) return;
  attacking = true;
  attackTime = 0;
  attackCombo = (attackCombo + 1) % 2;

  if (!heldId) {
    attackDuration = 0.22; playAttackSound('punch');
  } else if (heldId === 'spear') {
    attackDuration = 0.26; playAttackSound('thrust');
  } else if (heldId === 'dagger') {
    attackDuration = 0.20; playAttackSound('slash');
  } else if (heldId === 'greatsword' || heldId === 'battleaxe' || heldId === 'hammer') {
    attackDuration = 0.36; playAttackSound('heavy');
  } else if (heldId === 'staff_fire') {
    attackDuration = 0.32; playAttackSound('staff');
  } else if (heldId === 'bow') {
    attackDuration = 0.30; playAttackSound('bow');
  } else {
    attackDuration = 0.26; playAttackSound('slash');
  }
}

const keys = {};
let drag = false;

// Event listenery pro ovládání myší
function initPlayerControls(cv) {
  cv.addEventListener('mousedown', e => {
    if (typeof tryEnableFullscreen === 'function') tryEnableFullscreen();
    if (escOpen || charOpen || invOpen || (typeof emoteOpen !== 'undefined' && emoteOpen)) return;
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
    if ((document.pointerLockElement || drag) && !escOpen && !charOpen && !invOpen) {
      yaw -= e.movementX * 0.0025;
      pitch = Math.min(1.4, Math.max(-0.4, pitch + e.movementY * 0.0025));
    }
  });

  addEventListener('wheel', e => {
    if (escOpen || charOpen) return;
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
    P.x = SPX; P.z = 0.5; P.y = SPY; P.vx = P.vy = P.vz = 0;
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
  let sp;
  if (inW) {
    sp = sprint ? 4.2 : 3.0; // Plavecká rychlost
  } else if (waterExitTimer > 0) {
    sp = 4.0; // Přechodová rychlost po opuštění vody zabraňující bunny-hopu po vodě
  } else {
    sp = sprint ? 9 : 5.5; // Běžná pozemní rychlost
  }

  const wx = (-Math.sin(yaw)) * fz + Math.cos(yaw) * fx;
  const wz = (-Math.cos(yaw)) * fz - Math.sin(yaw) * fx;
  const k = 1 - Math.exp(-(P.ground ? 14 : inW ? 6 : 4) * dt);
  P.vx += (wx * sp - P.vx) * k;
  P.vz += (wz * sp - P.vz) * k;

  // Odpor vody (viskozita)
  if (inW) {
    P.vx *= 1 - 2.5 * dt;
    P.vz *= 1 - 2.5 * dt;
  }

  if (fx || fz) face = Math.atan2(wx, wz);

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
    if (keys.Space && P.ground) P.vy = 9.2; // Normální výskok (o 1 blok méně než dříve)
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
    P.x = SPX; P.z = 0.5; P.y = SPY; P.vy = 0;
  }
}
