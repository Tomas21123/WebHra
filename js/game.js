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
window.setFog = setFog;
window.cam = cam;
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
          navigator.keyboard.lock(['Escape']).catch(() => { });
        }
      }).catch(() => { });
    }
  } else {
    if (navigator.keyboard && navigator.keyboard.lock) {
      navigator.keyboard.lock(['Escape']).catch(() => { });
    }
  }
}

document.addEventListener('fullscreenchange', () => {
  if (document.fullscreenElement) {
    if (navigator.keyboard && navigator.keyboard.lock) {
      navigator.keyboard.lock(['Escape']).catch(() => { });
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
try { tryEnableFullscreen(); } catch (e) { }

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
  if (e.code === 'KeyE' && !escOpen && !charOpen && !invOpen) {
    if (window.POIManager && typeof window.POIManager.interactClosest === 'function') {
      const interacted = window.POIManager.interactClosest(P.x, P.y, P.z);
      if (interacted) {
        e.preventDefault();
        return;
      }
    }
  }

  if (e.code === 'KeyM') {
    const isP2POpen = document.getElementById('p2pModal') && !document.getElementById('p2pModal').hidden;
    if (typeof minimapOpen !== 'undefined' && minimapOpen) {
      if (typeof toggleMinimap === 'function') toggleMinimap(false);
      e.preventDefault();
      return;
    } else if (!escOpen && !charOpen && !invOpen && !(typeof chatOpen !== 'undefined' && chatOpen) && !isP2POpen) {
      if (typeof toggleMinimap === 'function') toggleMinimap(true);
      e.preventDefault();
      return;
    }
  }

  if (e.code === 'Escape') {
    e.preventDefault();
    e.stopPropagation();

    // Zajistit trvalý fullscreen (okno se nezmenší při stisku ESC)
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      tryEnableFullscreen();
    }
    if (navigator.keyboard && navigator.keyboard.lock) {
      navigator.keyboard.lock(['Escape']).catch(() => { });
    }

    if (typeof chatOpen !== 'undefined' && chatOpen) {
      if (typeof closeChat === 'function') closeChat();
    } else if (typeof emoteOpen !== 'undefined' && emoteOpen) {
      closeEmotes();
    } else if (typeof minimapOpen !== 'undefined' && minimapOpen) {
      toggleMinimap(false);
    } else if (document.getElementById('modalInGameSettings') && !document.getElementById('modalInGameSettings').hidden) {
      document.getElementById('modalInGameSettings').hidden = true;
      openEscMenu();
    } else if (document.getElementById('modalInGameControls') && !document.getElementById('modalInGameControls').hidden) {
      document.getElementById('modalInGameControls').hidden = true;
      openEscMenu();
    } else if (document.getElementById('p2pModal') && !document.getElementById('p2pModal').hidden) {
      document.getElementById('p2pModal').hidden = true;
      openEscMenu();
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
attachWeaponsToHand(hand, offhand);
updatePlayerAppearance();
renderHB();
applyHeld();

// ---------- Kontrola P2P Režimu a Čekání na Schválení Hostitelem ----------
const urlParams = new URLSearchParams(window.location.search);
const hasP2PUrl = !!urlParams.get('p2p');
const activeGameInfo = (typeof GameStorage !== 'undefined') ? GameStorage.getActiveGame() : null;
window.isP2PWaitingApproval = hasP2PUrl || !!(activeGameInfo && activeGameInfo.mode === 'p2p_client');

window.approveP2PJoin = function (hostSeed, hostDeltas, players) {
  window.isP2PWaitingApproval = false;

  // 1. Nastavit hostitelův seed světa
  if (typeof setWorldSeed === 'function' && hostSeed) {
    setWorldSeed(hostSeed);
    console.log('[P2P] Seed světa hostitele úspěšně nastaven na:', hostSeed);
  }

  // 2. Synchronizovat modifikované bloky hostitele (worldDeltas) ještě před generováním
  if (hostDeltas && window.networkManager) {
    window.networkManager.worldDeltas = Object.assign({}, hostDeltas);
  }

  // 3. Umístit hráče přímo vedle hostitele ještě před tím, než se začnou načítat chunky!
  if (Array.isArray(players) && typeof P !== 'undefined') {
    const host = players.find(p => p.id === 'host') || players[0];
    if (host && typeof host.x === 'number') {
      P.x = host.x + 1.5;
      P.z = host.z + 1.5;
      const pbx = Math.floor(P.x / S);
      const pbz = Math.floor(P.z / S);
      const th = (typeof height === 'function') ? height(pbx, pbz) : 45;
      P.y = Math.max(host.y + 0.2, (th + 1.5) * S);
      P.renderY = P.y;
      P.vx = 0; P.vy = 0; P.vz = 0;

      // Aktualizovat i spawn bod, aby případný respawn neházel na (0,0)
      if (typeof SPX !== 'undefined') {
        SPX = P.x; SPY = P.y; SPZ = P.z;
      }

      // Okamžitá aktualizace kamery a modelu
      if (typeof cam !== 'undefined') {
        cam.position.set(P.x, P.y + 1.55, P.z);
      }
      if (typeof model !== 'undefined') {
        model.position.set(P.x, P.y, P.z);
      }

      console.log(`[P2P] Hráč úspěšně umístěn k hostiteli na XYZ: ${P.x.toFixed(1)}, ${P.y.toFixed(1)}, ${P.z.toFixed(1)}`);
    }
  }

  // 4. Řádně smazat všechny předchozí 3D meshe z Three.js scény
  if (typeof chunks !== 'undefined') {
    for (const [k, c] of chunks) {
      if (typeof dispose === 'function') dispose(c);
    }
    chunks.clear();
  }
  if (typeof queue !== 'undefined') queue.length = 0;
  if (typeof lastC !== 'undefined') lastC = '';
  ready = false;

  const loadContent = document.getElementById('loadContent');
  if (loadContent) {
    loadContent.innerHTML = `<span style="color:#34d399;font-weight:700;margin-bottom:12px;font-size:16px;">Vstup schválen hostitelem! Generuji svět…</span><div id="bar"><i style="width:0%"></i></div>`;
    bar = document.querySelector('#bar i');
  }
};

// ---------- Herní Smyčka (Animation Loop) ----------
const hud = document.getElementById('hud'), load = document.getElementById('load');
let bar = document.querySelector('#bar i');
let last = performance.now(), acc = 0, frames = 0, fps = 0, bankLean = 0, narutoBlend = 0, swimBlend = 0, airPhase = 0;

function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  // Pokud se hráč připojuje k příteli (P2P klient), svět se NESMÍ začít generovat ani načítat,
  // dokud hostitel nepotvrdí žádost o připojení!
  if (window.isP2PWaitingApproval) {
    renderer.render(scene, cam);
    return;
  }

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
    if (!bar) bar = document.querySelector('#bar i');
    if (bar) bar.style.width = (ok / need * 100) + '%';
    if (ok >= need) {
      ready = true;
      if (load) {
        load.style.opacity = 0;
        setTimeout(() => load.remove(), 600);
      }
      // Ambientní divočina při startu hry
      const em = (typeof window !== 'undefined' && window.EntityManager) || (typeof EntityManager !== 'undefined' ? EntityManager : null);
      if (em && typeof em.spawnCreature === 'function' && em.creatures && em.creatures.length === 0) {
        const s = (typeof S !== 'undefined') ? S : 0.5;
        const spawnY = (typeof height === 'function') ? height(Math.floor((P.x + 12) / s), Math.floor((P.z + 12) / s)) * s : P.y;
        em.spawnCreature('Wolf', P.x + 12, spawnY, P.z + 12, 1);
        em.spawnCreature('Wolf', P.x - 14, spawnY, P.z + 10, 1);
      }
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

  // --- Synchronizovaná Animace Postavy ---
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

  // Pozice modelu
  model.position.set(P.x, P.renderY, P.z);

  // Přirozené pootočení těla k pohledu kamery, pokud hráč stojí na místě a otočí hlavu příliš daleko
  const camLookAngle = Math.atan2(-Math.sin(yaw), -Math.cos(yaw));
  let headYawDiff = camLookAngle - model.rotation.y;
  while (headYawDiff < -Math.PI) headYawDiff += Math.PI * 2;
  while (headYawDiff > Math.PI) headYawDiff -= Math.PI * 2;
  if (!isMoving && Math.abs(headYawDiff) > 1.25) {
    face = camLookAngle;
  }

  let da = face - model.rotation.y;
  da = Math.atan2(Math.sin(da), Math.cos(da));
  model.rotation.y += da * Math.min(1, dt * 12);

  const isForwardSprint = isSprinting && isMoving && (P.moveZ || 0) > 0.1 && P.ground;

  if (!playerRig.animState) {
    playerRig.animState = {
      phase: 0,
      airPhase: 0,
      airBlend: 0,
      swimBlend: 0,
      narutoBlend: 0,
      bankLean: 0,
      landingSquash: 0,
      wasGround: true,
      lastBodyYaw: model.rotation.y
    };
  }

  const anim = playerRig.animState;
  anim.x = P.x;
  anim.y = P.y;
  anim.z = P.z;
  anim.vx = P.vx;
  anim.vy = P.vy;
  anim.vz = P.vz;
  anim.mv = mv;
  anim.ground = P.ground;
  anim.inWater = P.inWater;
  anim.isSprinting = isSprinting;
  anim.isForwardSprint = isForwardSprint;
  anim.strafeX = P.moveX || 0;
  anim.moveZ = P.moveZ || 0;
  anim.bodyYaw = model.rotation.y;
  anim.lookYaw = yaw;
  anim.lookPitch = pitch;
  anim.heldId = heldId;
  anim.attacking = attacking;
  anim.attackTime = attackTime;
  anim.attackDuration = attackDuration;
  anim.attackCombo = attackCombo;
  anim.isRolling = isRolling;
  anim.rollTimer = rollTimer;
  if (typeof currentEmote !== 'undefined' && currentEmote !== null) {
    emoteTimer += dt;
  } else {
    emoteTimer = 0;
  }
  anim.emote = currentEmote;
  anim.emoteTimer = emoteTimer;
  anim.isJumpingInWater = !!keys.Space;

  if (attacking) {
    attackTime += dt;
    if (attackTime >= attackDuration) {
      attacking = false;
      hand.position.set(0, -8 * VX, 0);
      arms[0].rotation.set(0, 0, -0.12);
      arms[1].rotation.set(0, 0, 0.12);
    }
  }

  if (typeof animateFullCharacterRig === 'function') {
    animateFullCharacterRig(playerRig, anim, dt, now);
  }

  // Kamera
  const cp = Math.cos(pitch);
  const dir = [Math.sin(yaw) * cp, Math.sin(pitch), Math.cos(yaw) * cp];
  const targetHeadY = (P.isSwimming) ? 0.85 : 1.55;
  const hx = P.x, hy = (P.renderY ?? P.y) + targetHeadY, hz = P.z;
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

  // Aktualizace PvE entit & nestvůr (Milestone 2 - F6)
  if (window.EntityManager && typeof window.EntityManager.update === 'function') {
    window.EntityManager.update(dt);
  }

  // Aktualizace procedurálních POI struktur a interakcí (Milestone 2 - F4)
  if (window.POIManager && typeof window.POIManager.update === 'function') {
    window.POIManager.update(dt, now, P.x, P.y, P.z);
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
