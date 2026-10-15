// ---------- Inicializace Scény, Kamery & Herní Smyčky ----------
const SKY = 0xd4ecff;
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

const cv = renderer.domElement;
window.renderer = renderer;
window.cv = cv;
const scene = new THREE.Scene();
scene.background = new THREE.Color(SKY);
scene.fog = new THREE.Fog(SKY, 60, 100);

const cam = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 600);
const matSolid = new THREE.MeshBasicMaterial({ map: atlas, vertexColors: true, alphaTest: 0.25, side: THREE.DoubleSide });
const matWater = new THREE.MeshBasicMaterial({ map: atlas, vertexColors: true, transparent: true, opacity: 0.72, depthWrite: false });

scene.add(new THREE.AmbientLight(0xffffff, 0.7));
const sun = new THREE.DirectionalLight(0xffffff, 0.6);
sun.position.set(0.5, 1, 0.3);
scene.add(sun);

// Obloha (Sky Dome)
const dome = (() => {
  const g = new THREE.SphereGeometry(1, 16, 12), p = g.attributes.position, col = [];
  const a = new THREE.Color(SKY), b = new THREE.Color(0x4f9be0), t = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    t.copy(a).lerp(b, Math.pow(Math.max(0, p.getY(i)), 0.6));
    col.push(t.r, t.g, t.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
  m.renderOrder = -1;
  m.frustumCulled = false;
  scene.add(m);
  return m;
})();

// Mraky
const clouds = new THREE.Group();
const cm = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false, transparent: true, opacity: 0.92 });
for (let i = 0; i < 28; i++) {
  const g = new THREE.Group();
  for (let j = 0; j < 4; j++) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(8 + Math.random() * 10, 3, 6 + Math.random() * 6), cm);
    b.position.set(j * 7 - 10, Math.random() * 2, Math.random() * 5);
    g.add(b);
  }
  g.position.set((Math.random() - 0.5) * 500, 75 + Math.random() * 35, (Math.random() - 0.5) * 500);
  clouds.add(g);
}
scene.add(clouds);

function setFog() {
  const f = RD * CS * S;
  scene.fog.near = f * 0.55;
  scene.fog.far = f - 6;
  cam.far = Math.max(f + 60, 450);
  cam.updateProjectionMatrix();
  dome.scale.setScalar(cam.far * 0.9);
}
setFog();

addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  cam.aspect = innerWidth / innerHeight;
  cam.updateProjectionMatrix();
});

// Přidání modelu hráče do scény
scene.add(model);

// Inicializace ovládání myší
initPlayerControls(cv);

// Automatická maximalizace / Fullscreen (F11 styl bez zmenšování klávesou ESC)
function tryEnableFullscreen() {
  const doc = document.documentElement;
  if (!document.fullscreenElement && !document.webkitFullscreenElement) {
    const req = doc.requestFullscreen || doc.webkitRequestFullscreen || doc.msRequestFullscreen;
    if (req) {
      req.call(doc).then(() => {
        // Uzamčení klávesy ESC, aby prohlížeč nezmenšoval okno, ale předal ESC do hry
        if (navigator.keyboard && navigator.keyboard.lock) {
          navigator.keyboard.lock(['Escape']).catch(() => {});
        }
      }).catch(() => {});
    }
  } else {
    if (navigator.keyboard && navigator.keyboard.lock) {
      navigator.keyboard.lock(['Escape']).catch(() => {});
    }
  }
}

document.addEventListener('fullscreenchange', () => {
  if (document.fullscreenElement) {
    if (navigator.keyboard && navigator.keyboard.lock) {
      navigator.keyboard.lock(['Escape']).catch(() => {});
    }
  }
});

window.addEventListener('click', tryEnableFullscreen, { once: true });
window.addEventListener('keydown', tryEnableFullscreen, { once: true });
window.addEventListener('DOMContentLoaded', () => {
  const btnFs = $('escFullscreen');
  if (btnFs) {
    btnFs.onclick = () => {
      tryEnableFullscreen();
      closeEscMenu();
    };
  }
});
try { tryEnableFullscreen(); } catch (e) {}

// Klávesové vstupy
addEventListener('keydown', e => {
  if (typeof chatOpen !== 'undefined' && chatOpen) {
    if (e.code === 'Escape') {
      if (typeof closeChat === 'function') closeChat();
      e.preventDefault();
      return;
    }
    return;
  }

  // Otevření konzole a chatu klávesou T nebo / (Minecraft styl)
  if (e.code === 'KeyT' && !escOpen && !charOpen && !invOpen) {
    if (typeof openChat === 'function') openChat();
    e.preventDefault();
    return;
  }
  if ((e.code === 'Slash' || e.key === '/') && !escOpen && !charOpen && !invOpen) {
    if (typeof openChat === 'function') openChat('/');
    e.preventDefault();
    return;
  }

  if (e.code === 'KeyV') {
    if (typeof toggleEmotes === 'function') toggleEmotes();
    e.preventDefault();
    return;
  }
  if (typeof emoteOpen !== 'undefined' && emoteOpen) {
    if (e.code === 'Digit1' || e.code === 'Numpad1') { playEmote('dance67'); e.preventDefault(); return; }
    if (e.code === 'Digit2' || e.code === 'Numpad2') { playEmote('wave'); e.preventDefault(); return; }
    if (e.code === 'Digit3' || e.code === 'Numpad3') { playEmote('point'); e.preventDefault(); return; }
    if (e.code === 'Digit4' || e.code === 'Numpad4') { playEmote('sit'); e.preventDefault(); return; }
    if (e.code === 'Escape') { closeEmotes(); e.preventDefault(); return; }
  }
  if (e.code === 'KeyM') {
    if (typeof toggleMinimap === 'function') toggleMinimap();
    e.preventDefault();
    return;
  }
  if (e.code === 'Escape') {
    e.preventDefault();
    e.stopPropagation();

    // Zajistit trvalý fullscreen (okno se nezmenší při stisku ESC)
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      tryEnableFullscreen();
    }
    if (navigator.keyboard && navigator.keyboard.lock) {
      navigator.keyboard.lock(['Escape']).catch(() => {});
    }

    if (typeof chatOpen !== 'undefined' && chatOpen) {
      if (typeof closeChat === 'function') closeChat();
    } else if (typeof emoteOpen !== 'undefined' && emoteOpen) {
      closeEmotes();
    } else if (typeof minimapOpen !== 'undefined' && minimapOpen) {
      toggleMinimap(false);
    } else if (charOpen) {
      closeCharEditor(); openEscMenu();
    } else if (invOpen) {
      toggleInv();
    } else if (escOpen) {
      closeEscMenu();
    } else {
      openEscMenu();
    }
    return;
  }
  if (invKey(e)) return;
  if (escOpen || charOpen || (typeof emoteOpen !== 'undefined' && emoteOpen) || (typeof chatOpen !== 'undefined' && chatOpen)) return;

  // Detekce dvojitého stisku Shift (Double-Shift) pro kotrmelec dopředu
  // Časové okno nastaveno na 1000 ms (2 stisky za sekundu) a spotřeba staminy jen 5
  if ((e.code === 'ShiftLeft' || e.code === 'ShiftRight') && !e.repeat) {
    const curTime = performance.now();
    if (curTime - lastShiftTapTime < 1000 && !P.inWater && P.ground && !isRolling && G.st >= 5 && !escOpen && !charOpen && !invOpen) {
      if (typeof triggerRoll === 'function') triggerRoll();
      lastShiftTapTime = 0;
    } else {
      lastShiftTapTime = curTime;
    }
  }

  keys[e.code] = 1;
  if (e.code === 'BracketRight') { RD = Math.min(14, RD + 1); setFog(); lastC = ''; }
  if (e.code === 'BracketLeft') { RD = Math.max(3, RD - 1); setFog(); lastC = ''; }
  if (e.code === 'Space') e.preventDefault();
});
addEventListener('keyup', e => keys[e.code] = 0);

// Aplikace vzhledu a výbavy
attachWeaponsToHand(hand);
updatePlayerAppearance();
renderHB();
applyHeld();

// ---------- Herní Smyčka (Animation Loop) ----------
const hud = document.getElementById('hud'), bar = document.querySelector('#bar i'), load = document.getElementById('load');
let last = performance.now(), acc = 0, frames = 0, fps = 0, bankLean = 0, narutoBlend = 0, swimBlend = 0, airPhase = 0;

function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  manage();

  if (!ready) {
    const need = (2 * 3 + 1) ** 2;
    pump(30);
    let ok = 0;
    for (let a = -3; a <= 3; a++) {
      for (let b = -3; b <= 3; b++) {
        const c = chunks.get(key(Math.floor(P.x / (CS * S)) + a, Math.floor(P.z / (CS * S)) + b));
        if (c && c.meshed) ok++;
      }
    }
    bar.style.width = (ok / need * 100) + '%';
    if (ok >= need) {
      ready = true;
      load.style.opacity = 0;
      setTimeout(() => load.remove(), 600);
    }
    renderer.render(scene, cam);
    return;
  }

  pump(6);

  if (!escOpen && !charOpen) {
    for (let i = 0; i < 3; i++) physics(dt / 3);
    G.rg += dt;
    if (G.rg > 4) G.hp = Math.min(100, G.hp + 3 * dt);
    ui();
  }

  // --- Pokročilá Animace Postavy ---
  if (!wasGround && P.ground) { landingSquash = 0.14; }
  wasGround = P.ground;

  if (!P.ground) {
    airBlend = Math.min(1, airBlend + dt * 9);
    airPhase += dt * (Math.abs(P.vy) > 2.5 ? 9.0 : 6.0);
  } else {
    airBlend = Math.max(0, airBlend - dt * 11);
  }
  landingSquash = Math.max(0, landingSquash - dt * 1.6);

  const mv = Math.hypot(P.vx, P.vz);
  const isMoving = mv > 0.15;

  // Zrušení emotu při jakémkoli pohybu, stisku kláves nebo výskoku
  if (typeof currentEmote !== 'undefined' && currentEmote !== null) {
    const isMovingKeys = keys.KeyW || keys.KeyA || keys.KeyS || keys.KeyD ||
      keys.ArrowUp || keys.ArrowDown || keys.ArrowLeft || keys.ArrowRight || keys.Space;
    if (isMovingKeys || mv > 0.12 || Math.abs(P.vy) > 0.25 || !P.ground || P.inWater) {
      cancelEmote();
    }
  }

  // Plynulé vertikální vyhlazení modelu a kamery při vyběhnutí schodů/kopce
  if (typeof P.renderY === 'undefined') P.renderY = P.y;
  const dy = P.y - P.renderY;
  if (Math.abs(dy) < 0.75 && P.ground) {
    P.renderY += dy * Math.min(1, dt * 26);
  } else {
    P.renderY = P.y;
  }

  // Pozice a rotace modelu
  model.position.set(P.x, P.renderY, P.z);
  let da = face - model.rotation.y;
  da = Math.atan2(Math.sin(da), Math.cos(da));
  model.rotation.y += da * Math.min(1, dt * 12);

  // --- NÁKLON DO SMĚRU POHYBU (BANKING & STRAFE) ---
  // Postava se naklání do zatáček (da) a při úkroku do stran (A/D = P.moveX)
  const turnBank = isMoving ? -da * 0.42 : 0;
  const strafeBank = (P.moveX || 0) * 0.18 * Math.min(1, mv / 2.2);
  const targetBank = turnBank + strafeBank;
  bankLean += (targetBank - bankLean) * Math.min(1, dt * 9);

  // --- NARUTO RUN (SPRINT DOPŘEDU) ---
  // Při sprintu dopředu (Shift + W) se postava přikrčí, hluboce nakloní o ~37° a natáhne obě ruce za záda
  const isForwardSprint = isSprinting && isMoving && (P.moveZ || 0) > 0.1 && P.ground;
  if (isForwardSprint) {
    narutoBlend = Math.min(1, narutoBlend + dt * 8.0);
  } else {
    narutoBlend = Math.max(0, narutoBlend - dt * 6.5);
  }

  // Zvýšení kadence kroků při sprintu
  if (isMoving && P.ground) {
    phase += mv * dt * (isSprinting ? 2.3 : 1.4);
  } else if (!P.ground) {
    phase += dt * 1.8;
  }

  // 1. Nohy (při chůzi/běhu švih, při výskoku a letu živá dynamická animace)
  const legSwingAmp = (isSprinting ? (1.3 + narutoBlend * 0.2) : 0.85);
  const legSwing = Math.sin(phase) * Math.min(1.2, mv / 3.0) * legSwingAmp;

  // Dynamický pohyb nohou ve vzduchu (při stoupání skokový krok / pedálování, při pádu kmitání v protivětru)
  let airLeg0, airLeg1, airLegZ0 = -0.14, airLegZ1 = 0.14;
  if (isMoving && mv > 0.3) {
    // Skok v pohybu: cyklický atletický krok v letu
    const stride = Math.sin(airPhase);
    airLeg0 = -0.42 + stride * 0.58;
    airLeg1 = -0.42 - stride * 0.58;
    airLegZ0 = -0.12; airLegZ1 = 0.12;
  } else if (P.vy > 1.2) {
    // Výskok vzhůru: přikrčení s dynamickým nožním pedálováním
    airLeg0 = -0.65 + Math.sin(airPhase * 1.2) * 0.22;
    airLeg1 = -0.45 - Math.sin(airPhase * 1.2) * 0.22;
  } else if (P.vy < -1.2) {
    // Volný pád dolů: nohy kmitají v protivětru a chystají se na dopad
    airLeg0 = -0.2 + Math.sin(airPhase * 1.4) * 0.28;
    airLeg1 = -0.2 - Math.sin(airPhase * 1.4) * 0.28;
    airLegZ0 = -0.18 + Math.sin(airPhase * 0.8) * 0.05;
    airLegZ1 = 0.18 - Math.sin(airPhase * 0.8) * 0.05;
  } else {
    // Vrchol skoku (apex)
    airLeg0 = -0.52 + Math.sin(airPhase) * 0.12;
    airLeg1 = -0.48 - Math.sin(airPhase) * 0.12;
  }

  legs[0].rotation.x = legSwing * (1 - airBlend) + airLeg0 * airBlend;
  legs[1].rotation.x = -legSwing * (1 - airBlend) + airLeg1 * airBlend;
  legs[0].rotation.z = -0.04 * (1 - airBlend) + airLegZ0 * airBlend;
  legs[1].rotation.z = 0.04 * (1 - airBlend) + airLegZ1 * airBlend;

  // 2. Trup & hlava (kolíbání, vertikální pružení, předklon, boční náklon, aerodynamický náklon ve vzduchu)
  const walkBob = Math.abs(Math.sin(phase)) * Math.min(1, mv / 3.2) * (isSprinting ? 0.06 : 0.035);
  const idleBreathe = Math.sin(now * 0.003) * 0.006;
  const squashOffset = landingSquash * 0.16;
  const narutoCrouch = narutoBlend * 0.09;
  const airBob = Math.sin(airPhase) * 0.035 * airBlend;

  body.position.set(0, -walkBob + (isMoving ? 0 : idleBreathe) - squashOffset - narutoCrouch + airBob, 0);
  body.rotation.set(0, 0, (bankLean * 0.35) * (1 - airBlend));

  torso.position.set(0, 8 * VX, 0);
  head.position.set(0, 11 * VX, 0);
  legs[0].position.set(-2.5 * VX, 8 * VX, 0);
  legs[1].position.set(2.5 * VX, 8 * VX, 0);
  arms[0].position.set(-5.5 * VX, 8 * VX, 0.5 * VX);
  arms[1].position.set(5.5 * VX, 8 * VX, 0.5 * VX);

  // Boční náklon těla do pohybu (bankLean) + jemné kolíbání
  const bodyRoll = Math.sin(phase) * Math.min(1, mv / 3.2) * (isSprinting ? 0.07 : 0.05);
  torso.rotation.z = (bodyRoll * 0.35) * (1 - airBlend);
  torso.rotation.y = Math.sin(phase) * Math.min(1, mv / 3.2) * (isSprinting ? 0.03 : 0.07);

  // Předozadní náklon: chůze/běh vs. dynamický náklon ve skoku / pádu
  const backLean = (P.moveZ || 0) < -0.1 ? -0.12 * Math.min(1, mv / 2.5) : 0;
  const normForwardLean = 0.14 * Math.min(1, mv / 3.0);
  const narutoPitch = 0.65; // ~37° ninja předklon
  const forwardLean = (normForwardLean * (1 - narutoBlend) + narutoPitch * narutoBlend) + backLean;

  const airLeanPitch = P.vy > 1.0 ? (0.16 + Math.min(0.2, mv * 0.05)) : (-0.08 + Math.min(0.2, -P.vy * 0.012));
  torso.rotation.x = forwardLean * (1 - airBlend) + airLeanPitch * airBlend;
  // Hlava sedí na trupu, takže rotace kompenzuje předklon a dívá se vpřed podél cesty
  head.rotation.x = -torso.rotation.x * 0.85 + (P.vy < -1 ? 0.18 : (P.vy > 1 ? -0.1 : 0)) * airBlend;
  head.rotation.z = -bankLean * 0.25 - (bodyRoll * 0.25) * (1 - airBlend);
  head.rotation.y = 0;

  // 3. Ruce – Levá ruka (dynamické balancování a mávání ve vzduchu)
  const armSwingL = -Math.sin(phase) * Math.min(1, mv / 3.2) * (isSprinting ? 1.15 : 0.75);
  const narutoArmX0 = 1.24 + Math.sin(phase * 1.4) * 0.06;
  const narutoArmZ0 = -0.26 - Math.sin(phase * 1.4) * 0.03;
  const narutoArmY0 = 0.14;

  let airArmX0, airArmZ0;
  if (P.vy > 1.0) {
    // Výskok vzhůru: paže se dynamicky zvedají pro získání výšky
    airArmX0 = -0.85 + Math.sin(airPhase) * 0.32;
    airArmZ0 = -0.38 - Math.sin(airPhase * 0.8) * 0.12;
  } else if (P.vy < -1.0) {
    // Pád: mávání / balancování pažemi ve větru
    airArmX0 = -0.32 + Math.sin(airPhase * 1.3) * 0.28;
    airArmZ0 = -0.52 - Math.cos(airPhase * 1.3) * 0.2;
  } else {
    airArmX0 = -0.6 + Math.sin(airPhase) * 0.15;
    airArmZ0 = -0.42;
  }

  const normalArmX0 = armSwingL * (1 - airBlend) + airArmX0 * airBlend;
  const normalArmZ0 = -0.12 * (1 - airBlend) + airArmZ0 * airBlend;

  arms[0].rotation.x = normalArmX0 * (1 - narutoBlend) + narutoArmX0 * narutoBlend;
  arms[0].rotation.z = normalArmZ0 * (1 - narutoBlend) + narutoArmZ0 * narutoBlend;
  arms[0].rotation.y = (0) * (1 - narutoBlend) + narutoArmY0 * narutoBlend;
  arms[0].rotation.y = (0) * (1 - narutoBlend) + narutoArmY0 * narutoBlend;

  if (attacking) {
    attackTime += dt;
    const p = Math.min(1, attackTime / attackDuration);
    if (p >= 1) {
      attacking = false;
      hand.position.set(0, -8 * VX, 0);
      arms[0].rotation.set(0, 0, -0.12);
      arms[1].rotation.set(0, 0, 0.12);
    } else {
      if (!heldId) {
        // --- ÚTOK PĚSTMI (STŘÍDAVÉ ÚDERY) ---
        const isLeft = (attackCombo === 1);
        const punchReach = Math.sin(p * Math.PI);
        if (isLeft) {
          arms[0].rotation.x = -1.55 + punchReach * 0.25;
          arms[0].rotation.y = 0.25 * punchReach;
          arms[0].rotation.z = -0.05;
          arms[1].rotation.x = -1.1;
          arms[1].rotation.y = 0.35;
          arms[1].rotation.z = -0.25;
          torso.rotation.y += 0.22 * punchReach;
        } else {
          arms[1].rotation.x = -1.55 + punchReach * 0.25;
          arms[1].rotation.y = -0.25 * punchReach;
          arms[1].rotation.z = 0.05;
          arms[0].rotation.x = -1.1;
          arms[0].rotation.y = -0.35;
          arms[0].rotation.z = 0.25;
          torso.rotation.y -= 0.22 * punchReach;
        }
        hand.position.set(0, -8 * VX, 0);
      } else if (heldId === 'spear') {
        // --- KOPÍ (VÝPAD DOPŘEDU) ---
        const thrust = Math.sin(p * Math.PI);
        arms[1].rotation.x = -1.35;
        arms[1].rotation.y = -0.12;
        arms[1].rotation.z = 0.15;
        arms[0].rotation.x = -1.25;
        arms[0].rotation.y = 0.28;
        arms[0].rotation.z = -0.1;
        hand.position.set(0, -8 * VX, -thrust * 0.42);
        torso.rotation.y += thrust * 0.18;
      } else if (heldId === 'greatsword' || heldId === 'battleaxe' || heldId === 'hammer') {
        // --- TĚŽKÉ ZBRANĚ (MOHUTNÝ ŠVIH SHORA DOLŮ A OBLOUKEM) ---
        const swingSign = attackCombo === 0 ? 1 : -1;
        if (p < 0.3) {
          const t = p / 0.3;
          arms[1].rotation.x = -0.8 - t * 1.3;
          arms[1].rotation.y = swingSign * t * 0.6;
          arms[1].rotation.z = 0.2 + swingSign * t * 0.4;
          arms[0].rotation.x = -0.5 - t * 1.0;
          arms[0].rotation.y = -swingSign * t * 0.4;
          torso.rotation.y -= swingSign * t * 0.25;
        } else if (p < 0.7) {
          const t = (p - 0.3) / 0.4;
          arms[1].rotation.x = -2.1 + t * 2.4;
          arms[1].rotation.y = swingSign * (0.6 - t * 1.2);
          arms[1].rotation.z = 0.6 - t * 0.8;
          arms[0].rotation.x = -1.5 + t * 1.6;
          torso.rotation.y += swingSign * (-0.25 + t * 0.6);
        } else {
          const t = (p - 0.7) / 0.3;
          arms[1].rotation.x = 0.3 * (1 - t) + (-0.78) * t;
          arms[1].rotation.y = -0.6 * swingSign * (1 - t) + (-0.18) * t;
          arms[1].rotation.z = 0.18;
          arms[0].rotation.x = 0.1 * (1 - t) + armSwingL * t;
        }
        hand.position.set(0, -8 * VX, 0);
      } else if (heldId === 'staff_fire') {
        // --- OHNIVÁ HŮL (VYZVEDNUTÍ A MAGICKÝ ÚDER) ---
        const cast = Math.sin(p * Math.PI);
        arms[1].rotation.x = -1.95 + cast * 0.65;
        arms[1].rotation.y = -0.22;
        arms[1].rotation.z = 0.25;
        torso.rotation.x += cast * 0.12;
        hand.position.set(0, -8 * VX, -cast * 0.2);
      } else if (heldId === 'bow') {
        // --- LUK (NÁTAH A VÝSTŘEL) ---
        const draw = p < 0.5 ? p / 0.5 : 1 - (p - 0.5) / 0.5;
        arms[0].rotation.x = -1.5; arms[0].rotation.y = 0.45; arms[0].rotation.z = -0.1;
        arms[1].rotation.x = -1.45; arms[1].rotation.y = -0.5 * draw; arms[1].rotation.z = 0.3;
        hand.position.set(0, -8 * VX, draw * 0.15);
      } else {
        // --- MEČ, DÝKA, KATANA, PALCÁT (RYCHLÉ SEKACÍ KOMBO) ---
        const swingSign = attackCombo === 0 ? 1 : -1;
        if (p < 0.25) {
          const t = p / 0.25;
          arms[1].rotation.x = -0.7 - t * 0.9;
          arms[1].rotation.y = swingSign * t * 0.5;
          arms[1].rotation.z = 0.15 + swingSign * t * 0.35;
        } else if (p < 0.65) {
          const t = (p - 0.25) / 0.4;
          arms[1].rotation.x = -1.6 + t * 1.9;
          arms[1].rotation.y = swingSign * (0.5 - t * 1.05);
          arms[1].rotation.z = 0.5 - t * 0.75;
        } else {
          const t = (p - 0.65) / 0.35;
          const targetX = -0.78;
          arms[1].rotation.x = 0.3 * (1 - t) + targetX * t;
          arms[1].rotation.y = (-0.55 * swingSign) * (1 - t) + (-0.18) * t;
          arms[1].rotation.z = 0.18;
        }
        hand.position.set(0, -8 * VX, 0);
        torso.rotation.y += Math.sin(p * Math.PI) * 0.25 * (attackCombo === 0 ? 1 : -1);
      }
    }
  } else {
    // Pravá ruka (zbraň nebo prázdná – při letu dynamické vyvažování, při Naruto runu aerodynamicky za tělem)
    const narutoArmX1 = 1.24 - Math.sin(phase * 1.4) * 0.06;
    const narutoArmZ1 = 0.26 + Math.sin(phase * 1.4) * 0.03;
    const narutoArmY1 = -0.14;

    let airArmX1, airArmZ1;
    if (P.vy > 1.0) {
      airArmX1 = -0.85 - Math.sin(airPhase) * 0.32;
      airArmZ1 = 0.38 + Math.sin(airPhase * 0.8) * 0.12;
    } else if (P.vy < -1.0) {
      airArmX1 = -0.32 - Math.sin(airPhase * 1.3) * 0.28;
      airArmZ1 = 0.52 + Math.cos(airPhase * 1.3) * 0.2;
    } else {
      airArmX1 = -0.6 - Math.sin(airPhase) * 0.15;
      airArmZ1 = 0.42;
    }

    if (heldId) {
      const idleWeaponX = -0.78 + Math.sin(phase) * Math.min(1, mv / 3.2) * 0.18;
      const normalWeaponX = idleWeaponX * (1 - airBlend) + airArmX1 * 0.5 * airBlend;
      arms[1].rotation.x = normalWeaponX * (1 - narutoBlend) + narutoArmX1 * narutoBlend;
      arms[1].rotation.y = -0.18 * (1 - narutoBlend) + narutoArmY1 * narutoBlend;
      arms[1].rotation.z = (0.18 * (1 - airBlend) + airArmZ1 * 0.5 * airBlend) * (1 - narutoBlend) + narutoArmZ1 * narutoBlend;
    } else {
      const armSwingR = Math.sin(phase) * Math.min(1, mv / 3.2) * (isSprinting ? 1.15 : 0.75);
      const normalArmX1 = armSwingR * (1 - airBlend) + airArmX1 * airBlend;
      arms[1].rotation.x = normalArmX1 * (1 - narutoBlend) + narutoArmX1 * narutoBlend;
      arms[1].rotation.y = (0) * (1 - narutoBlend) + narutoArmY1 * narutoBlend;
      arms[1].rotation.z = (0.12 * (1 - airBlend) + airArmZ1 * airBlend) * (1 - narutoBlend) + narutoArmZ1 * narutoBlend;
    }
  }

  // --- ANIMACE PLAVÁNÍ VE VODĚ ---
  swimBlend += ((P.inWater ? 1 : 0) - swimBlend) * Math.min(1, dt * 7);
  if (swimBlend > 0.001) {
    let swimBodyPitch, swimBodyRoll, swimBob, swimBodyZ;
    let swimHeadPitch, swimHeadRoll;
    let swimLeg0, swimLeg1, swimLegZ0, swimLegZ1;
    let swimArm0X, swimArm0Y, swimArm0Z, swimArm1X, swimArm1Y, swimArm1Z;

    if (mv > 0.12) {
      // --- KRAUL PŘI POHYBU (Front crawl) ---
      // Celé tělo leží vodorovně na hladině
      swimBodyPitch = 1.34; // ~77° náklon celého těla do horizontály
      swimBodyZ = 0.22; // vyrovnání těžiště
      swimBob = -0.25 + Math.sin(phase * 2) * 0.035;

      // Přirozený valivý pohyb těla (body roll) z boku na bok s každým kraulovým záběrem
      swimBodyRoll = Math.sin(phase) * 0.28;
      swimHeadRoll = -Math.sin(phase) * 0.32; // hlava se natáčí k nadechnutí
      swimHeadPitch = -1.18; // zvednutí hlavy nad hladinu pro pohled dopředu

      // Kraulový záběr paží v lokálním prostoru trupu (oblouk nad vodou, ponor a záběr)
      swimArm0X = Math.sin(phase) * 1.65 - 0.42;
      swimArm0Z = -0.42 + Math.cos(phase) * 0.35;
      swimArm0Y = Math.sin(phase) * 0.32;

      swimArm1X = -Math.sin(phase) * 1.65 - 0.42;
      swimArm1Z = 0.42 - Math.cos(phase) * 0.35;
      swimArm1Y = -Math.sin(phase) * 0.32;

      // Rychlý kmit nohou (flutter kicks) – nohy jsou vodorovně za tělem
      swimLeg0 = Math.sin(phase * 3.8) * 0.42;
      swimLeg1 = -Math.sin(phase * 3.8) * 0.42;
      swimLegZ0 = -0.06;
      swimLegZ1 = 0.06;
    } else {
      // --- DRŽENÍ SE NA HLADINĚ / ŠLAPÁNÍ VODY (Treading water) ---
      // Postava je vzpřímená, do poloviny těla nad hladinou
      swimBodyPitch = 0.06;
      swimBodyZ = 0;
      swimBodyRoll = Math.sin(now * 0.005) * 0.05;
      swimHeadRoll = 0;
      swimHeadPitch = -0.06;

      // Rychlost a intenzita mávání: pokud drží mezerník, mává usilovněji pro udržení vztlaku
      const paddleFreq = keys.Space ? 0.009 : 0.006;
      swimBob = -0.06 + Math.sin(now * paddleFreq) * 0.04;

      // Mávání rukama (kruhové pádlování dlaněmi do stran a dolů pro udržení vztlaku)
      swimArm0X = -0.55 + Math.sin(now * paddleFreq) * 0.28;
      swimArm0Z = -0.52 - Math.cos(now * paddleFreq) * 0.26;
      swimArm0Y = Math.sin(now * paddleFreq) * 0.22;

      swimArm1X = -0.55 + Math.sin(now * paddleFreq + 0.6) * 0.28;
      swimArm1Z = 0.52 + Math.cos(now * paddleFreq + 0.6) * 0.26;
      swimArm1Y = -Math.sin(now * paddleFreq + 0.6) * 0.22;

      // Mávání nohama (střídavé šlapání / nůžkový kmit nohama jako při šlapání vody)
      swimLeg0 = Math.sin(now * paddleFreq) * 0.48;
      swimLeg1 = -Math.sin(now * paddleFreq) * 0.48;
      swimLegZ0 = -0.14 + Math.cos(now * paddleFreq) * 0.08;
      swimLegZ1 = 0.14 - Math.cos(now * paddleFreq) * 0.08;
    }

    body.rotation.x = body.rotation.x * (1 - swimBlend) + swimBodyPitch * swimBlend;
    body.rotation.y = body.rotation.y * (1 - swimBlend) + (swimBodyRoll * 0.4) * swimBlend;
    body.rotation.z = body.rotation.z * (1 - swimBlend) + swimBodyRoll * swimBlend;

    body.position.y = body.position.y * (1 - swimBlend) + swimBob * swimBlend;
    body.position.z = body.position.z * (1 - swimBlend) + swimBodyZ * swimBlend;

    torso.rotation.x = torso.rotation.x * (1 - swimBlend) + (mv > 0.12 ? -0.06 : 0.04) * swimBlend;
    torso.rotation.y = torso.rotation.y * (1 - swimBlend) + 0;
    torso.rotation.z = torso.rotation.z * (1 - swimBlend) + 0;

    head.rotation.x = head.rotation.x * (1 - swimBlend) + swimHeadPitch * swimBlend;
    head.rotation.y = head.rotation.y * (1 - swimBlend) + swimHeadRoll * swimBlend;

    legs[0].rotation.x = legs[0].rotation.x * (1 - swimBlend) + swimLeg0 * swimBlend;
    legs[1].rotation.x = legs[1].rotation.x * (1 - swimBlend) + swimLeg1 * swimBlend;
    legs[0].rotation.z = legs[0].rotation.z * (1 - swimBlend) + swimLegZ0 * swimBlend;
    legs[1].rotation.z = legs[1].rotation.z * (1 - swimBlend) + swimLegZ1 * swimBlend;

    arms[0].rotation.x = arms[0].rotation.x * (1 - swimBlend) + swimArm0X * swimBlend;
    arms[0].rotation.y = arms[0].rotation.y * (1 - swimBlend) + swimArm0Y * swimBlend;
    arms[0].rotation.z = arms[0].rotation.z * (1 - swimBlend) + swimArm0Z * swimBlend;

    if (!attacking) {
      arms[1].rotation.x = arms[1].rotation.x * (1 - swimBlend) + swimArm1X * swimBlend;
      arms[1].rotation.y = arms[1].rotation.y * (1 - swimBlend) + swimArm1Y * swimBlend;
      arms[1].rotation.z = arms[1].rotation.z * (1 - swimBlend) + swimArm1Z * swimBlend;
    }
  }

  // --- ANIMACE EMOTŮ (Gesta, Tance, Sed na zadek) ---
  if (typeof currentEmote !== 'undefined' && currentEmote !== null) {
    emoteTimer += dt;
    const et = emoteTimer;

    if (currentEmote === 'dance67') {
      // Mávání rukama 67 (TikTok meme tanec - divoké mávání paží a groovující trup a hlava)
      const sp67 = 13;
      body.position.y = -Math.abs(Math.sin(et * sp67)) * 0.06;
      torso.rotation.z = Math.sin(et * sp67 * 0.5) * 0.16;
      torso.rotation.x = 0.08;
      torso.rotation.y = 0;

      head.rotation.z = Math.sin(et * sp67 * 0.5) * 0.25;
      head.rotation.x = -Math.abs(Math.sin(et * sp67)) * 0.2;
      head.rotation.y = 0;

      arms[0].rotation.x = -1.2 + Math.sin(et * sp67) * 0.95;
      arms[0].rotation.z = -0.3 + Math.cos(et * sp67) * 0.35;
      arms[0].rotation.y = 0.2;

      arms[1].rotation.x = -1.2 - Math.sin(et * sp67) * 0.95;
      arms[1].rotation.z = 0.3 - Math.cos(et * sp67) * 0.35;
      arms[1].rotation.y = -0.2;

      legs[0].rotation.x = Math.sin(et * sp67 * 0.5) * 0.15;
      legs[1].rotation.x = -Math.sin(et * sp67 * 0.5) * 0.15;
      legs[0].rotation.z = -0.04 + Math.sin(et * sp67 * 0.5) * 0.1;
      legs[1].rotation.z = 0.04 + Math.sin(et * sp67 * 0.5) * 0.1;
    } else if (currentEmote === 'wave') {
      // Zamávání rukou jako pozdrav (pravá ruka nahoře, kývání do stran, přátelský náklon)
      body.position.y = 0;
      torso.rotation.set(0, 0, 0);
      head.rotation.set(-0.08 + Math.sin(et * 5) * 0.05, 0, -0.12);

      arms[1].rotation.x = -2.25;
      arms[1].rotation.z = 0.55 + Math.sin(et * 10) * 0.35;
      arms[1].rotation.y = 0.18;
      arms[0].rotation.set(0, 0, -0.12);

      legs[0].rotation.set(0, 0, -0.04);
      legs[1].rotation.set(0, 0, 0.04);
    } else if (currentEmote === 'point') {
      // Ukázání rukou dopředu
      body.position.y = 0;
      torso.rotation.set(0.04, 0.08, 0);
      head.rotation.set(0, 0, 0);

      arms[1].rotation.set(-1.57, 0.04, 0.08);
      arms[0].rotation.set(-0.3, 0.2, -0.3);

      legs[0].rotation.set(0, 0, -0.04);
      legs[1].rotation.set(0, 0, 0.04);
    } else if (currentEmote === 'sit') {
      // Sed na zem na zadek:
      // Spustíme celé tělo tak, aby hýždě (kyčle v 8*VX = 0.4m) dosedly přímo na zem (y = 0)
      body.position.set(0, -8 * VX, 0);
      body.rotation.set(0, 0, 0);

      // Nohy směřují vodorovně dopředu po zemi
      legs[0].rotation.set(-1.57, -0.12, -0.04);
      legs[1].rotation.set(-1.57, 0.12, 0.04);

      // Trup sedí vzpřímeně na kyčlích s mírným přirozeným uvolněným náklonem
      torso.position.set(0, 8 * VX, 0);
      torso.rotation.set(0.06, 0, 0);

      // Hlava sedí na krku
      head.position.set(0, 11 * VX, 0);
      head.rotation.set(0.04 + Math.sin(now * 0.002) * 0.03, 0, 0);

      // Ruce spočívají přirozeně položené dlaněmi na stehnech / kolenou
      arms[0].rotation.set(-0.95, 0.22, -0.12);
      arms[1].rotation.set(-0.95, -0.22, 0.12);
    }
  }

  // --- ANIMACE KOTRMELCE / DODGE ROLL (Elden Ring styl – reálný na povrchu země) ---
  if (typeof isRolling !== 'undefined' && isRolling) {
    const p = Math.min(1, rollTimer / ROLL_DURATION);
    hand.position.set(0, -8 * VX, 0);

    if (p < 0.25) {
      // Fáze 1: Skok střemhlav dopředu (Dive Leap po hlavě)
      const u = p / 0.25;
      const easeU = Math.sin(u * Math.PI * 0.5);

      // Celé tělo se nakloní střemhlav dopředu o ~72° (1.26 rad)
      body.rotation.set(easeU * 1.26, 0, 0);
      // Mírné nadlehčení při skoku (zůstává na povrchu)
      body.position.set(0, Math.sin(u * Math.PI) * 0.12, 0);

      torso.rotation.set(-0.15 * (1 - u) + 0.3 * u, 0, 0);
      head.rotation.set(0.25 * u, 0, 0);

      // Ruce se natahují dopředu a dolů ke ztlumení dopadu a kontaktu se zemí
      arms[0].rotation.set(-1.65 * easeU, 0.1, -0.15 * easeU);
      arms[1].rotation.set(-1.65 * easeU, -0.1, 0.15 * easeU);

      // Nohy se natahují vzad za tělo v letu
      legs[0].rotation.set(0.55 * easeU, 0, -0.05);
      legs[1].rotation.set(0.65 * easeU, 0, 0.05);

    } else if (p < 0.72) {
      // Fáze 2: Dopad na ruce/ramena a plné přetočení o 360° (Somersault na zemi)
      const u = (p - 0.25) / 0.47;
      // Rotace plynule přetočí postavu přes ramena a záda o plných 360 stupňů (2*PI + 0.35 rad)
      const rollRot = 1.26 + u * (Math.PI * 2 + 0.35 - 1.26);
      body.rotation.set(rollRot, 0, 0);

      // DŮLEŽITÉ: Těžiště / kyčle se při kotrmelci NESMÍ zanořit pod zem!
      // Protože se postava točí kolem pasu a ramena/hlava dosahují cca 0.9m od středu,
      // kyčle se zvednou (+0.25m až +0.32m), aby záda a ramena klouzaly po povrchu země a nezalézaly pod terén!
      const rollLiftY = 0.12 * (1 - u) + 0.28 * Math.sin(u * Math.PI) + 0.04 * u;
      body.position.set(0, rollLiftY, 0);

      // Hlava pevně přitisknutá k hrudi (brada na prsa jako v gymnastice)
      const chinTuck = 0.25 + 0.65 * Math.sin(u * Math.PI);
      head.rotation.set(chinTuck, 0, 0);
      torso.rotation.set(0.3 + 0.35 * Math.sin(u * Math.PI) + 0.1 * u, 0, 0);

      // Sbalení paží do těsného klubíčka (tuck) s plynulým navázáním na Fázi 1 i Fázi 3
      const armX = -1.65 * (1 - u) + (-0.45) * u + 0.5 * Math.sin(u * Math.PI);
      const armZ = (-0.15 * (1 - u) + -0.12 * u) - 0.1 * Math.sin(u * Math.PI);
      arms[0].rotation.set(armX, 0.15 * Math.sin(u * Math.PI), armZ);
      arms[1].rotation.set(armX, -0.15 * Math.sin(u * Math.PI), -armZ);

      // Sbalení nohou a příprava na došlap
      const leg0X = (0.55 * (1 - u) + -0.6 * u) - 1.65 * Math.sin(u * Math.PI);
      const leg1X = (0.65 * (1 - u) + 0.4 * u) - 1.95 * Math.sin(u * Math.PI);
      legs[0].rotation.set(leg0X, 0, -0.06);
      legs[1].rotation.set(leg1X, 0, 0.06);

    } else {
      // Fáze 3: Dojezd na nohy, rozbalení a plynulý přechod do běhu (Recovery)
      const u = (p - 0.72) / 0.28;
      const easeOut = Math.sin(u * Math.PI * 0.5);

      // Dokončení rotace do vzpřímeného postoje
      body.rotation.set((1 - easeOut) * 0.35, 0, 0);
      body.position.set(0, 0.04 * (1 - easeOut), 0);

      torso.rotation.set(0.4 * (1 - easeOut), 0, 0);
      head.rotation.set(0.25 * (1 - easeOut), 0, 0);

      // Nohy dosedají na zem a přecházejí do běžeckého kroku
      legs[0].rotation.set(-0.6 * (1 - easeOut), 0, -0.04 * (1 - easeOut));
      legs[1].rotation.set(0.4 * (1 - easeOut), 0, 0.04 * (1 - easeOut));

      // Ruce se vracejí do rovnovážné polohy pro běh
      arms[0].rotation.set(-0.45 * (1 - easeOut), 0, -0.12 * (1 - easeOut));
      arms[1].rotation.set(-0.45 * (1 - easeOut), 0, 0.12 * (1 - easeOut));
    }
  }

  // 4. Simulace pláště
  animateCape(playerRig, dt, now, mv, P.vy, false);

  // Kamera
  const cp = Math.cos(pitch);
  const dir = [Math.sin(yaw) * cp, Math.sin(pitch), Math.cos(yaw) * cp];
  const hx = P.x, hy = (P.renderY ?? P.y) + 1.55, hz = P.z;
  let dd = dist;
  for (let t = 0.3; t <= dist; t += 0.25) {
    if (solid(hx + dir[0] * t, hy + dir[1] * t, hz + dir[2] * t)) {
      dd = Math.max(0, t - 0.35);
      break;
    }
  }
  cam.position.set(hx + dir[0] * dd, hy + dir[1] * dd, hz + dir[2] * dd);
  cam.lookAt(cam.position.x - dir[0], cam.position.y - dir[1], cam.position.z - dir[2]);
  model.visible = dd > 0.8;
  dome.position.copy(cam.position);

  for (const g of clouds.children) {
    g.position.x += dt * 2;
    const dx = g.position.x - P.x, dz = g.position.z - P.z;
    if (dx > 200) g.position.x -= 400;
    if (dz > 200) g.position.z -= 400;
    if (dz < -200) g.position.z += 400;
  }

  // Aktualizace polohy a animací ostatních hráčů v síti (Multiplayer)
  if (window.networkManager && typeof window.networkManager.updateAllRemotePlayers === 'function') {
    window.networkManager.updateAllRemotePlayers(dt);
  }

  renderer.render(scene, cam);

  // 3D Minimapa (Cube World Style)
  if (typeof updateMinimap === 'function') {
    updateMinimap(dt, now);
  }
  if (typeof markExploredAroundPlayer === 'function' && frames % 45 === 0) {
    markExploredAroundPlayer();
  }

  // 3D Preview v editoru postavy
  if (charOpen && previewRenderer) {
    if (!isPreviewDragging) previewRotY += dt * 0.45;
    updatePreviewCam();
    animateCape(previewRig, dt, now, 0, 0, true);
    previewRenderer.render(previewScene, previewCam);
  }

  frames++;
  acc += dt;
  if (acc > 0.4) {
    fps = Math.round(frames / acc);
    frames = 0; acc = 0;
    hud.textContent = `FPS ${fps}\nXYZ ${P.x.toFixed(1)} ${P.y.toFixed(1)} ${P.z.toFixed(1)}\nChunky ${chunks.size} · dohled ${RD}`;
  }
}

// Spuštění smyčky
requestAnimationFrame(loop);
