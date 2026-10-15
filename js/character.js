// ---------- Model a Rig Postavy ----------
function createCharacterRig() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  const torso = new THREE.Group();
  const head = new THREE.Group();
  const legs = [new THREE.Group(), new THREE.Group()];
  const arms = [new THREE.Group(), new THREE.Group()];
  const hand = new THREE.Group();
  hand.position.set(0, -8 * VX, 0);
  arms[1].add(hand);

  // Plášť (Cape) - 4 kloubové segmenty pro simulaci vlající látky
  // Clasp na ramenou: y = 17 v absolutních voxelech -> v trupu (pivot v pase y = 8) je to 17 - 8 = 9 voxelů
  const capeRoot = new THREE.Group();
  capeRoot.position.set(0, 9 * VX, -2.1 * VX);
  torso.add(capeRoot);
  const capeSegs = [];
  let prev = capeRoot;
  for (let i = 0; i < 4; i++) {
    const seg = new THREE.Group();
    seg.position.set(0, i === 0 ? 0 : -3 * VX, 0);
    prev.add(seg);
    capeSegs.push(seg);
    prev = seg;
  }

  // HIERARCHIE KOSTRY:
  // root -> body (celé tělo: umožňuje naklápění do horizontály při plavání a snížení celého těla při sedu)
  root.add(body);
  // body -> nohy (kyčelní klouby)
  body.add(legs[0]);
  body.add(legs[1]);
  // body -> trup (kloub v pase)
  body.add(torso);
  // trup -> hlava (krk) & paže (ramena) - díky tomu hlava a paže NIKDY neodpadnou od těla při běhu, sprintu ani plavání!
  torso.add(head);
  torso.add(arms[0]);
  torso.add(arms[1]);

  return { root, body, torso, head, legs, arms, hand, capeRoot, capeSegs };
}

function generateCharacterVoxels(custom, eqMap) {
  const skinCol = toHex(custom.skinColor);
  const skinShadow = shade(skinCol, -0.14);
  const skinLight = shade(skinCol, 0.08);
  const hairCol = toHex(custom.hairColor);
  const hairDark = shade(hairCol, -0.18);
  const eyeCol = toHex(custom.eyeColor);
  const undCol = toHex(custom.underwearColor);
  const undBand = shade(undCol, 0.25);
  const undDark = shade(undCol, -0.16);

  const hasChest = !!eqMap.chest, chestCol = hasChest ? toHex(eqMap.chest.color || 0x4a7c59) : null;
  const hasPants = !!eqMap.legs, pantsCol = hasPants ? toHex(eqMap.legs.color || 0x6e4726) : null;
  const hasBoots = !!eqMap.feet, bootsCol = hasBoots ? toHex(eqMap.feet.color || 0x2e251e) : null;
  const hasHead = !!eqMap.head, headCol = hasHead ? toHex(eqMap.head.color || 0x3d5a45) : null;

  // TRUP
  const torso = [];
  bx(torso, -4, 8, -2, 4, 11, 2, undCol);
  bx(torso, -4, 11, -2, 4, 12, 2, undBand);
  if (hasChest) {
    bx(torso, -4, 10, -2, 4, 18, 2, chestCol);
    bx(torso, -4, 17, -2, 4, 18, 2, shade(chestCol, 0.22));
    bx(torso, -2, 16, 2, 2, 17, 3, shade(chestCol, 0.25));
  } else {
    bx(torso, -4, 12, -2, 4, 18, 2, skinCol);
    torso.push([-1, 15, 2, skinShadow], [0, 15, 2, skinShadow]);
    torso.push([-2, 15, 2, skinLight], [1, 15, 2, skinLight]);
    torso.push([-1, 13, 2, skinShadow], [0, 13, 2, skinShadow]);
  }
  bx(torso, -1, 18, -1, 1, 19, 1, skinCol);

  // NOHY
  const makeLeg = (x0, x1) => {
    const leg = [];
    if (hasPants) {
      bx(leg, x0, 1, -2, x1, 8, 2, pantsCol);
      bx(leg, x0, 4, 1, x1, 5, 2, shade(pantsCol, -0.15));
    } else {
      if (custom.underwearStyle === 'briefs') {
        bx(leg, x0, 7, -2, x1, 8, 2, undCol);
        bx(leg, x0, 1, -2, x1, 7, 2, skinCol);
      } else {
        bx(leg, x0, 5, -2, x1, 8, 2, undCol);
        bx(leg, x0, 5, -2, x1, 6, 2, undDark);
        bx(leg, x0, 1, -2, x1, 5, 2, skinCol);
      }
    }
    if (hasBoots) {
      bx(leg, x0, 0, -2, x1, 3, 2, bootsCol);
      bx(leg, x0, 0, 1, x1, 2, 3, bootsCol);
      bx(leg, x0, 2, -2, x1, 3, 2, shade(bootsCol, 0.25));
    } else {
      bx(leg, x0, 0, -2, x1, 1, 3, skinCol);
      leg.push([x0 + 1, 0, 2, skinShadow]);
    }
    return leg;
  };

  // RUCE
  const makeArm = (x0, x1) => {
    const arm = [];
    bx(arm, x0, 7, -1, x1, 17, 2, skinCol);
    if (hasChest) {
      bx(arm, x0, 12, -1, x1, 17, 2, chestCol);
      bx(arm, x0, 12, -1, x1, 13, 2, shade(chestCol, -0.18));
    }
    return arm;
  };

  // HLAVA
  const head = [];
  bx(head, -3, 19, -3, 3, 26, 3, skinCol);
  bx(head, -4, 21, -1, -3, 24, 1, skinCol);
  bx(head, 3, 21, -1, 4, 24, 1, skinCol);
  // oči
  head.push([-3, 22, 3, 0xffffff], [-3, 23, 3, 0xffffff]);
  head.push([-2, 22, 3, eyeCol], [-2, 23, 3, eyeCol]);
  head.push([-2, 23, 3, 0xffffff]);
  head.push([1, 22, 3, eyeCol], [1, 23, 3, eyeCol]);
  head.push([2, 22, 3, 0xffffff], [2, 23, 3, 0xffffff]);
  head.push([1, 23, 3, 0xffffff]);
  // obočí
  bx(head, -3, 24, 3, -1, 25, 4, hairDark);
  bx(head, 0, 24, 3, 2, 25, 4, hairDark);
  // nos & pusa
  head.push([-1, 21, 4, skinShadow], [0, 21, 4, skinShadow]);
  head.push([-1, 20, 3, shade(skinCol, -0.28)], [0, 20, 3, shade(skinCol, -0.28)]);

  // vousy
  if (custom.facialHair === 'stubble') {
    for (let x = -3; x < 3; x++) if ((x + 19) % 2 === 0) head.push([x, 19, 3, skinShadow], [x, 20, 3, skinShadow]);
  } else if (custom.facialHair === 'mustache') {
    bx(head, -2, 21, 4, 2, 22, 5, hairDark);
  } else if (custom.facialHair === 'beard') {
    bx(head, -3, 18, 3, 3, 20, 4, hairDark);
    bx(head, -2, 20, 3, -1, 21, 4, hairDark);
    bx(head, 0, 20, 3, 1, 21, 4, hairDark);
    bx(head, -2, 21, 4, 2, 22, 5, hairDark);
    head.push([-1, 18, 4, hairCol], [0, 18, 4, hairCol]);
  }

  // účesy
  const st = custom.hairStyle || 'short';
  if (st === 'bald') {
    bx(head, -3, 26, -3, 3, 27, 3, skinCol);
  } else if (st === 'short') {
    bx(head, -3, 26, -3, 3, 27, 3, hairCol);
    bx(head, -3, 20, -4, 3, 26, -3, hairDark);
    bx(head, -4, 23, -3, -3, 26, 2, hairDark);
    bx(head, 3, 23, -3, 4, 26, 2, hairDark);
    bx(head, -3, 25, 3, 3, 26, 4, hairCol);
    head.push([-1, 24, 3, hairCol], [1, 24, 3, hairCol]);
  } else if (st === 'long') {
    bx(head, -3, 26, -3, 3, 27, 3, hairCol);
    bx(head, -3, 16, -4, 3, 26, -3, hairDark);
    bx(head, -2, 16, -5, 2, 24, -4, hairDark);
    bx(head, -4, 17, -2, -3, 26, 2, hairCol);
    bx(head, 3, 17, -2, 4, 26, 2, hairCol);
    bx(head, -3, 25, 3, 3, 26, 4, hairCol);
  } else if (st === 'spiky') {
    bx(head, -3, 26, -3, 3, 27, 3, hairCol);
    bx(head, -3, 21, -4, 3, 26, -3, hairDark);
    bx(head, -4, 23, -3, -3, 26, 2, hairDark);
    bx(head, 3, 23, -3, 4, 26, 2, hairDark);
    bx(head, -2, 27, -2, -1, 29, -1, hairCol);
    bx(head, 0, 27, 0, 2, 29, 2, hairCol);
    bx(head, -1, 27, 1, 1, 29, 3, hairCol);
    bx(head, 1, 27, -2, 2, 28, -1, hairCol);
    bx(head, -3, 25, 3, 3, 26, 4, hairCol);
    head.push([-2, 24, 4, hairCol], [1, 24, 4, hairCol]);
  } else if (st === 'mohawk') {
    bx(head, -1, 26, -4, 1, 29, 3, hairCol);
    bx(head, -1, 28, -2, 1, 30, 2, hairCol);
  } else if (st === 'parted') {
    bx(head, -3, 26, -3, 3, 27, 3, hairCol);
    bx(head, -3, 27, -2, 1, 28, 2, hairCol);
    bx(head, -3, 20, -4, 3, 26, -3, hairDark);
    bx(head, -4, 23, -3, -3, 26, 2, hairDark);
    bx(head, 3, 23, -3, 4, 26, 2, hairDark);
    bx(head, -3, 25, 3, 2, 26, 4, hairCol);
    bx(head, -1, 24, 3, 3, 25, 4, hairCol);
  }

  if (hasHead) {
    bx(head, -4, 26, -4, 4, 28, 4, headCol);
    bx(head, -4, 21, -4, 4, 26, -3, shade(headCol, -0.15));
    bx(head, -4, 23, -3, -3, 26, 3, headCol);
    bx(head, 3, 23, -3, 4, 26, 3, headCol);
  }

  return {
    torso,
    head,
    leftLeg: makeLeg(-4, -1),
    rightLeg: makeLeg(1, 4),
    leftArm: makeArm(-7, -4),
    rightArm: makeArm(4, 7)
  };
}

function updateCharacterRig(rig, custom, eqMap) {
  const vox = generateCharacterVoxels(custom, eqMap);
  // Torso má pivot v pase: ox = 0, oy = 8, oz = 0. V těle je na výšce 8 * VX
  setVoxGroupMesh(rig.torso, vox.torso, 0, 8, 0);
  // Hlava má pivot na krku: ox = 0, oy = 19, oz = 0. V trupu je na výšce (19 - 8) * VX = 11 * VX
  setVoxGroupMesh(rig.head, vox.head, 0, 19, 0, true);
  rig.head.position.set(0, 11 * VX, 0);
  // Nohy mají pivot v kyčlích: oy = 8. V těle jsou na pozici (±2.5 * VX, 8 * VX, 0)
  setVoxGroupMesh(rig.legs[0], vox.leftLeg, -2.5, 8, 0);
  setVoxGroupMesh(rig.legs[1], vox.rightLeg, 2.5, 8, 0);
  // Paže mají pivot v ramenou: oy = 16. V trupu jsou na pozici (±5.5 * VX, 8 * VX, 0.5 * VX)
  setVoxGroupMesh(rig.arms[0], vox.leftArm, -5.5, 16, 0.5, true);
  rig.arms[0].position.set(-5.5 * VX, 8 * VX, 0.5 * VX);
  setVoxGroupMesh(rig.arms[1], vox.rightArm, 5.5, 16, 0.5, true);
  rig.arms[1].position.set(5.5 * VX, 8 * VX, 0.5 * VX);

  const hasCape = !!eqMap.cape;
  rig.capeRoot.visible = hasCape;
  if (hasCape) {
    const capeCol = toHex(eqMap.cape.color || 0x16171d);
    const capeTrim = eqMap.cape.id === 'cape_royal' ? 0xffd86b : shade(capeCol, 0.32);
    for (let i = 0; i < 4; i++) {
      const sVox = [];
      const isHem = (i === 3);
      const col = (isHem && eqMap.cape.id === 'cape_royal') ? capeTrim : capeCol;
      const wL = -4 - (i >= 2 ? 1 : 0);
      const wR = 4 + (i >= 2 ? 1 : 0);
      bx(sVox, wL, -3, -1, wR, 0, 0, col);
      for (let y = -3; y < 0; y++) {
        sVox.push([wL, y, -1, shade(col, -0.25)], [wR - 1, y, -1, shade(col, -0.25)]);
      }
      if (i === 0) {
        const claspCol = eqMap.cape.id === 'cape_royal' ? 0xffd86b : 0x526078;
        sVox.push([-4, 0, 0, claspCol], [-3, 0, 0, claspCol], [2, 0, 0, claspCol], [3, 0, 0, claspCol]);
        sVox.push([-4, 0, 1, claspCol], [3, 0, 1, claspCol]);
      }
      if (isHem) {
        for (let x = wL; x < wR; x++) {
          sVox.push([x, -3, -1, capeTrim]);
        }
      }
      setVoxGroupMesh(rig.capeSegs[i], sVox, 0, 0, 0, true);
      rig.capeSegs[i].position.set(0, i === 0 ? 0 : -3 * VX, 0);
    }
  }
}

function animateCape(rig, dt, now, speed, vy, isPreview) {
  if (!rig || !rig.capeRoot || !rig.capeRoot.visible) return;
  const segs = rig.capeSegs;
  const normSpd = Math.min(1.2, speed / 8.5);
  const lift = isPreview ? 0.08 : normSpd * 0.35;
  const fallLift = isPreview ? 0 : Math.max(-0.15, Math.min(0.28, -vy * 0.02));
  const windBase = Math.sin(now * 0.004) * 0.04;

  const wave1 = Math.sin(now * 0.009) * (0.08 + normSpd * 0.14);
  const wave2 = Math.sin(now * 0.009 - 0.8) * (0.11 + normSpd * 0.18);
  const wave3 = Math.sin(now * 0.009 - 1.6) * (0.15 + normSpd * 0.24);

  const t0 = 0.06 + lift * 0.7 + fallLift * 0.6 + windBase;
  const t1 = 0.04 + lift * 0.5 + fallLift * 0.4 + wave1;
  const t2 = 0.04 + lift * 0.4 + fallLift * 0.3 + wave2;
  const t3 = 0.03 + lift * 0.3 + fallLift * 0.2 + wave3;

  const sideSway = isPreview ? 0 : -Math.sin(phase) * Math.min(1, speed / 3.5) * 0.06;

  segs[0].rotation.x += (t0 - segs[0].rotation.x) * Math.min(1, dt * 12);
  segs[1].rotation.x += (t1 - segs[1].rotation.x) * Math.min(1, dt * 11);
  segs[2].rotation.x += (t2 - segs[2].rotation.x) * Math.min(1, dt * 10);
  segs[3].rotation.x += (t3 - segs[3].rotation.x) * Math.min(1, dt * 9);

  segs[0].rotation.z += (sideSway - segs[0].rotation.z) * Math.min(1, dt * 10);
  segs[1].rotation.z += (sideSway * 0.8 - segs[1].rotation.z) * Math.min(1, dt * 8);
  segs[2].rotation.z += (sideSway * 0.6 - segs[2].rotation.z) * Math.min(1, dt * 7);
  segs[3].rotation.z += (sideSway * 0.5 - segs[3].rotation.z) * Math.min(1, dt * 6);

  segs[3].rotation.y = Math.sin(now * 0.007) * 0.08 + sideSway * 0.5;
}

// Inicializace modelu hráče ve světě
const playerRig = createCharacterRig();
const model = playerRig.root;
const body = playerRig.body;
const torso = playerRig.torso;
const head = playerRig.head;
const legs = playerRig.legs;
const arms = playerRig.arms;
const hand = playerRig.hand;

function updatePlayerAppearance() {
  updateCharacterRig(playerRig, playerCustom, getEquippedMap());
}

// =============================================================================
// UNIVERZÁLNÍ ANIMÁTOR POSTAVY (PRO LOKÁLNÍHO I VŠECHNY VZDÁLENÉ HRÁČE)
// Zajišťuje, že všichni hráči vidí přesně stejné animace běhu, sprintu (Naruto),
// výskoku, pádu, plavání (kraul i šlapání vody), kotrmelce, útoků a pohledu hlavy.
// =============================================================================
function animateFullCharacterRig(rig, s, dt, now) {
  if (!rig) return;
  const { body, torso, head, legs, arms, hand } = rig;
  if (!body || !torso || !head || !legs || !arms || !hand) return;

  const VX_VAL = (typeof VX !== 'undefined') ? VX : 0.05;

  // 1. Gesta / Emoty (pokud hráč právě provádí emote, má přednost)
  if (s.emote && typeof applyEmoteAnimation === 'function') {
    applyEmoteAnimation(rig, s.emote, s.emoteTimer || 0, now);
    if (typeof animateCape === 'function') {
      animateCape(rig, dt, now, 0, 0, false);
    }
    return;
  }

  // 2. Stav skoku, vzduchu a dopadu
  const onGround = (typeof s.ground !== 'undefined') ? !!s.ground : true;
  if (!s.wasGround && onGround) {
    s.landingSquash = 0.14;
  }
  s.wasGround = onGround;
  s.landingSquash = Math.max(0, (s.landingSquash || 0) - dt * 1.6);

  const vy = s.vy || 0;
  if (!onGround) {
    s.airBlend = Math.min(1, (s.airBlend || 0) + dt * 9);
    s.airPhase = (s.airPhase || 0) + dt * (Math.abs(vy) > 2.5 ? 9.0 : 6.0);
  } else {
    s.airBlend = Math.max(0, (s.airBlend || 0) - dt * 11);
  }
  const airBlend = s.airBlend || 0;
  const airPhase = s.airPhase || 0;
  const landingSquash = s.landingSquash || 0;

  // 3. Rychlost pohybu, krok a sprint
  const mv = (typeof s.mv === 'number') ? s.mv : Math.hypot(s.vx || 0, s.vz || 0);
  const isMoving = mv > 0.15;
  const isSprinting = !!s.isSprinting;
  const isForwardSprint = (typeof s.isForwardSprint !== 'undefined')
    ? s.isForwardSprint
    : (isSprinting && isMoving && onGround);

  if (isForwardSprint) {
    s.narutoBlend = Math.min(1, (s.narutoBlend || 0) + dt * 8.0);
  } else {
    s.narutoBlend = Math.max(0, (s.narutoBlend || 0) - dt * 6.5);
  }
  const narutoBlend = s.narutoBlend || 0;

  // Kadence kroků
  if (isMoving && onGround) {
    s.phase = (s.phase || 0) + mv * dt * (isSprinting ? 2.3 : 1.4);
  } else if (!onGround) {
    s.phase = (s.phase || 0) + dt * 1.8;
  } else {
    s.phase = 0;
  }
  const phase = s.phase || 0;

  // 4. Náklon do zatáček a do stran (BankLean & Strafe)
  const curBodyYaw = (typeof s.bodyYaw === 'number') ? s.bodyYaw : 0;
  let daYaw = curBodyYaw - ((typeof s.lastBodyYaw === 'number') ? s.lastBodyYaw : curBodyYaw);
  while (daYaw < -Math.PI) daYaw += Math.PI * 2;
  while (daYaw > Math.PI) daYaw -= Math.PI * 2;
  s.lastBodyYaw = curBodyYaw;

  const turnBank = isMoving ? -daYaw * 0.42 : 0;
  const strafeBank = (s.strafeX || 0) * 0.18 * Math.min(1, mv / 2.2);
  const targetBank = turnBank + strafeBank;
  s.bankLean = (s.bankLean || 0) + (targetBank - (s.bankLean || 0)) * Math.min(1, dt * 9);
  const bankLean = s.bankLean || 0;

  // 5. Nohy (švih při chůzi/běhu, atletický skok, dynamické vlání v protivětru při pádu)
  const legSwingAmp = (isSprinting ? (1.3 + narutoBlend * 0.2) : 0.85);
  let legSwing = isMoving ? Math.sin(phase) * Math.min(1.2, mv / 3.0) * legSwingAmp : 0;

  let airLeg0 = 0, airLeg1 = 0, airLegZ0 = -0.14, airLegZ1 = 0.14;
  if (isMoving && mv > 0.3) {
    const stride = Math.sin(airPhase);
    airLeg0 = -0.42 + stride * 0.58;
    airLeg1 = -0.42 - stride * 0.58;
    airLegZ0 = -0.12; airLegZ1 = 0.12;
  } else if (vy > 1.2) {
    airLeg0 = -0.65 + Math.sin(airPhase * 1.2) * 0.22;
    airLeg1 = -0.45 - Math.sin(airPhase * 1.2) * 0.22;
  } else if (vy < -1.2) {
    airLeg0 = -0.2 + Math.sin(airPhase * 1.4) * 0.28;
    airLeg1 = -0.2 - Math.sin(airPhase * 1.4) * 0.28;
    airLegZ0 = -0.18 + Math.sin(airPhase * 0.8) * 0.05;
    airLegZ1 = 0.18 - Math.sin(airPhase * 0.8) * 0.05;
  } else {
    airLeg0 = -0.52 + Math.sin(airPhase) * 0.12;
    airLeg1 = -0.48 - Math.sin(airPhase) * 0.12;
  }

  legs[0].rotation.x = legSwing * (1 - airBlend) + airLeg0 * airBlend;
  legs[1].rotation.x = -legSwing * (1 - airBlend) + airLeg1 * airBlend;
  legs[0].rotation.z = -0.04 * (1 - airBlend) + airLegZ0 * airBlend;
  legs[1].rotation.z = 0.04 * (1 - airBlend) + airLegZ1 * airBlend;

  // 6. Trup a celé tělo (kolíbání, dýchání, dopadový squash, naruto sklon trupu)
  const walkBob = isMoving ? Math.abs(Math.sin(phase)) * Math.min(1, mv / 3.2) * (isSprinting ? 0.06 : 0.035) : 0;
  const idleBreathe = Math.sin(now * 0.003) * 0.006;
  const squashOffset = landingSquash * 0.16;
  const narutoCrouch = narutoBlend * 0.09;
  const airBob = Math.sin(airPhase) * 0.035 * airBlend;

  body.position.set(0, -walkBob + (isMoving ? 0 : idleBreathe) - squashOffset - narutoCrouch + airBob, 0);
  body.rotation.set(0, 0, (bankLean * 0.35) * (1 - airBlend));

  torso.position.set(0, 8 * VX_VAL, 0);
  head.position.set(0, 11 * VX_VAL, 0);
  legs[0].position.set(-2.5 * VX_VAL, 8 * VX_VAL, 0);
  legs[1].position.set(2.5 * VX_VAL, 8 * VX_VAL, 0);
  arms[0].position.set(-5.5 * VX_VAL, 8 * VX_VAL, 0.5 * VX_VAL);
  arms[1].position.set(5.5 * VX_VAL, 8 * VX_VAL, 0.5 * VX_VAL);

  const bodyRoll = isMoving ? Math.sin(phase) * Math.min(1, mv / 3.2) * (isSprinting ? 0.07 : 0.05) : 0;
  torso.rotation.z = (bodyRoll * 0.35) * (1 - airBlend);
  torso.rotation.y = isMoving ? Math.sin(phase) * Math.min(1, mv / 3.2) * (isSprinting ? 0.03 : 0.07) : 0;

  const backLean = (s.moveZ || 0) < -0.1 ? -0.12 * Math.min(1, mv / 2.5) : 0;
  const normForwardLean = isMoving ? 0.14 * Math.min(1, mv / 3.0) : 0;
  const narutoPitch = 0.65; // ~37° ninja předklon
  const forwardLean = (normForwardLean * (1 - narutoBlend) + narutoPitch * narutoBlend) + backLean;

  const airLeanPitch = vy > 1.0 ? (0.16 + Math.min(0.2, mv * 0.05)) : (-0.08 + Math.min(0.2, -vy * 0.012));
  torso.rotation.x = forwardLean * (1 - airBlend) + airLeanPitch * airBlend;

  // 7. HLAVA – DYNAMICKÝ POHLED (PITCH NAHORU/DOLŮ + YAW DO STRAN)
  // Stejný pro lokálního hráče i pro všechny vzdálené hráče v síti!
  const targetPitch = (typeof s.lookPitch === 'number') ? s.lookPitch : 0;
  const clampedPitch = Math.max(-0.6, Math.min(0.9, targetPitch));

  const targetLookYaw = (typeof s.lookYaw === 'number') ? s.lookYaw : 0;
  const camLookAngle = Math.atan2(-Math.sin(targetLookYaw), -Math.cos(targetLookYaw));
  let headYawRel = camLookAngle - curBodyYaw;
  while (headYawRel < -Math.PI) headYawRel += Math.PI * 2;
  while (headYawRel > Math.PI) headYawRel -= Math.PI * 2;
  const clampedHeadYaw = Math.max(-1.25, Math.min(1.25, headYawRel));

  head.rotation.x = -torso.rotation.x * 0.85 + (vy < -1 ? 0.18 : (vy > 1 ? -0.1 : 0)) * airBlend + clampedPitch;
  head.rotation.z = -bankLean * 0.25 - (bodyRoll * 0.25) * (1 - airBlend);
  head.rotation.y = clampedHeadYaw;

  // 8. Levá ruka (švih při chůzi, naruto ruka dozadu, mávání ve vzduchu)
  const armSwingL = isMoving ? -Math.sin(phase) * Math.min(1, mv / 3.2) * (isSprinting ? 1.15 : 0.75) : 0;
  const narutoArmX0 = 1.24 + Math.sin(phase * 1.4) * 0.06;
  const narutoArmZ0 = -0.26 - Math.sin(phase * 1.4) * 0.03;
  const narutoArmY0 = 0.14;

  let airArmX0 = 0, airArmZ0 = 0;
  if (vy > 1.0) {
    airArmX0 = -0.85 + Math.sin(airPhase) * 0.32;
    airArmZ0 = -0.38 - Math.sin(airPhase * 0.8) * 0.12;
  } else if (vy < -1.0) {
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

  // 9. Pravá ruka (útoky zbraní a pěstí nebo klidové držení zbraně / švih / naruto běh)
  const heldId = s.heldId || s.heldItem || null;
  const attacking = !!s.attacking;
  const attackDuration = s.attackDuration || 0.26;
  const attackTime = s.attackTime || 0;
  const attackCombo = s.attackCombo || 0;

  if (attacking) {
    const p = Math.min(1, attackTime / attackDuration);
    if (!heldId) {
      // Úder pěstmi
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
      hand.position.set(0, -8 * VX_VAL, 0);
    } else if (heldId === 'spear') {
      const thrust = Math.sin(p * Math.PI);
      arms[1].rotation.x = -1.35;
      arms[1].rotation.y = -0.12;
      arms[1].rotation.z = 0.15;
      arms[0].rotation.x = -1.25;
      arms[0].rotation.y = 0.28;
      arms[0].rotation.z = -0.1;
      hand.position.set(0, -8 * VX_VAL, -thrust * 0.42);
      torso.rotation.y += thrust * 0.18;
    } else if (heldId === 'greatsword' || heldId === 'battleaxe' || heldId === 'hammer') {
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
      hand.position.set(0, -8 * VX_VAL, 0);
    } else if (heldId === 'staff_fire') {
      const cast = Math.sin(p * Math.PI);
      arms[1].rotation.x = -1.95 + cast * 0.65;
      arms[1].rotation.y = -0.22;
      arms[1].rotation.z = 0.25;
      torso.rotation.x += cast * 0.12;
      hand.position.set(0, -8 * VX_VAL, -cast * 0.2);
    } else if (heldId === 'bow') {
      const draw = p < 0.5 ? p / 0.5 : 1 - (p - 0.5) / 0.5;
      arms[0].rotation.x = -1.5; arms[0].rotation.y = 0.45; arms[0].rotation.z = -0.1;
      arms[1].rotation.x = -1.45; arms[1].rotation.y = -0.5 * draw; arms[1].rotation.z = 0.3;
      hand.position.set(0, -8 * VX_VAL, draw * 0.15);
    } else {
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
      hand.position.set(0, -8 * VX_VAL, 0);
      torso.rotation.y += Math.sin(p * Math.PI) * 0.25 * (attackCombo === 0 ? 1 : -1);
    }
  } else {
    // Klidová nebo běžecká pozice pravé ruky
    const narutoArmX1 = 1.24 - Math.sin(phase * 1.4) * 0.06;
    const narutoArmZ1 = 0.26 + Math.sin(phase * 1.4) * 0.03;
    const narutoArmY1 = -0.14;

    let airArmX1 = 0, airArmZ1 = 0;
    if (vy > 1.0) {
      airArmX1 = -0.85 - Math.sin(airPhase) * 0.32;
      airArmZ1 = 0.38 + Math.sin(airPhase * 0.8) * 0.12;
    } else if (vy < -1.0) {
      airArmX1 = -0.32 - Math.sin(airPhase * 1.3) * 0.28;
      airArmZ1 = 0.52 + Math.cos(airPhase * 1.3) * 0.2;
    } else {
      airArmX1 = -0.6 - Math.sin(airPhase) * 0.15;
      airArmZ1 = 0.42;
    }

    if (heldId) {
      const idleWeaponX = -0.78 + (isMoving ? Math.sin(phase) * Math.min(1, mv / 3.2) * 0.18 : 0);
      const normalWeaponX = idleWeaponX * (1 - airBlend) + airArmX1 * 0.5 * airBlend;
      arms[1].rotation.x = normalWeaponX * (1 - narutoBlend) + narutoArmX1 * narutoBlend;
      arms[1].rotation.y = -0.18 * (1 - narutoBlend) + narutoArmY1 * narutoBlend;
      arms[1].rotation.z = (0.18 * (1 - airBlend) + airArmZ1 * 0.5 * airBlend) * (1 - narutoBlend) + narutoArmZ1 * narutoBlend;
    } else {
      const armSwingR = isMoving ? Math.sin(phase) * Math.min(1, mv / 3.2) * (isSprinting ? 1.15 : 0.75) : 0;
      const normalArmX1 = armSwingR * (1 - airBlend) + airArmX1 * airBlend;
      arms[1].rotation.x = normalArmX1 * (1 - narutoBlend) + narutoArmX1 * narutoBlend;
      arms[1].rotation.y = (0) * (1 - narutoBlend) + narutoArmY1 * narutoBlend;
      arms[1].rotation.z = (0.12 * (1 - airBlend) + airArmZ1 * airBlend) * (1 - narutoBlend) + narutoArmZ1 * narutoBlend;
    }
    hand.position.set(0, -8 * VX_VAL, 0);
  }

  // 10. ANIMACE PLAVÁNÍ VE VODĚ (KRAUL PŘI POHYBU / ŠLAPÁNÍ VODY NA MÍSTĚ)
  s.swimBlend = (s.swimBlend || 0) + (((s.inWater ? 1 : 0) - (s.swimBlend || 0))) * Math.min(1, dt * 7);
  const swimBlend = s.swimBlend || 0;
  if (swimBlend > 0.001) {
    let swimBodyPitch, swimBodyRoll, swimBob, swimBodyZ;
    let swimHeadPitch, swimHeadRoll;
    let swimLeg0, swimLeg1, swimLegZ0, swimLegZ1;
    let swimArm0X, swimArm0Y, swimArm0Z, swimArm1X, swimArm1Y, swimArm1Z;

    if (mv > 0.12) {
      // --- KRAUL PŘI POHYBU (Front crawl) ---
      swimBodyPitch = 1.34;
      swimBodyZ = 0.22;
      swimBob = -0.25 + Math.sin(phase * 2) * 0.035;

      swimBodyRoll = Math.sin(phase) * 0.28;
      swimHeadRoll = -Math.sin(phase) * 0.32;
      swimHeadPitch = -1.18;

      swimArm0X = Math.sin(phase) * 1.65 - 0.42;
      swimArm0Z = -0.42 + Math.cos(phase) * 0.35;
      swimArm0Y = Math.sin(phase) * 0.32;

      swimArm1X = -Math.sin(phase) * 1.65 - 0.42;
      swimArm1Z = 0.42 - Math.cos(phase) * 0.35;
      swimArm1Y = -Math.sin(phase) * 0.32;

      swimLeg0 = Math.sin(phase * 3.8) * 0.42;
      swimLeg1 = -Math.sin(phase * 3.8) * 0.42;
      swimLegZ0 = -0.06;
      swimLegZ1 = 0.06;
    } else {
      // --- DRŽENÍ SE NA HLADINĚ / ŠLAPÁNÍ VODY (Treading water) ---
      swimBodyPitch = 0.06;
      swimBodyZ = 0;
      swimBodyRoll = Math.sin(now * 0.005) * 0.05;
      swimHeadRoll = 0;
      swimHeadPitch = -0.06;

      const paddleFreq = s.isJumpingInWater ? 0.009 : 0.006;
      swimBob = -0.06 + Math.sin(now * paddleFreq) * 0.04;

      swimArm0X = -0.55 + Math.sin(now * paddleFreq) * 0.28;
      swimArm0Z = -0.52 - Math.cos(now * paddleFreq) * 0.26;
      swimArm0Y = Math.sin(now * paddleFreq) * 0.22;

      swimArm1X = -0.55 + Math.sin(now * paddleFreq + 0.6) * 0.28;
      swimArm1Z = 0.52 + Math.cos(now * paddleFreq + 0.6) * 0.26;
      swimArm1Y = -Math.sin(now * paddleFreq + 0.6) * 0.22;

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

    head.rotation.x = head.rotation.x * (1 - swimBlend) + (swimHeadPitch + clampedPitch) * swimBlend;
    head.rotation.y = head.rotation.y * (1 - swimBlend) + (swimHeadRoll + clampedHeadYaw) * swimBlend;

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

  // 11. KOTRMELEC / DODGE ROLL
  if (s.isRolling) {
    const rollDur = 0.55;
    const p = Math.min(1, (s.rollTimer || 0) / rollDur);
    hand.position.set(0, -8 * VX_VAL, 0);

    if (p < 0.25) {
      const u = p / 0.25;
      const easeU = Math.sin(u * Math.PI * 0.5);
      body.rotation.set(easeU * 1.26, 0, 0);
      body.position.set(0, Math.sin(u * Math.PI) * 0.12, 0);
      torso.rotation.set(-0.15 * (1 - u) + 0.3 * u, 0, 0);
      head.rotation.set(0.25 * u, 0, 0);
      arms[0].rotation.set(-1.65 * easeU, 0.1, -0.15 * easeU);
      arms[1].rotation.set(-1.65 * easeU, -0.1, 0.15 * easeU);
      legs[0].rotation.set(0.55 * easeU, 0, -0.05);
      legs[1].rotation.set(0.65 * easeU, 0, 0.05);
    } else if (p < 0.72) {
      const u = (p - 0.25) / 0.47;
      const rollRot = 1.26 + u * (Math.PI * 2 + 0.35 - 1.26);
      body.rotation.set(rollRot, 0, 0);
      const rollLiftY = 0.12 * (1 - u) + 0.28 * Math.sin(u * Math.PI) + 0.04 * u;
      body.position.set(0, rollLiftY, 0);
      const chinTuck = 0.25 + 0.65 * Math.sin(u * Math.PI);
      head.rotation.set(chinTuck, 0, 0);
      torso.rotation.set(0.3 + 0.35 * Math.sin(u * Math.PI) + 0.1 * u, 0, 0);
      const armX = -1.65 * (1 - u) + (-0.45) * u + 0.5 * Math.sin(u * Math.PI);
      const armZ = (-0.15 * (1 - u) + -0.12 * u) - 0.1 * Math.sin(u * Math.PI);
      arms[0].rotation.set(armX, 0.15 * Math.sin(u * Math.PI), armZ);
      arms[1].rotation.set(armX, -0.15 * Math.sin(u * Math.PI), -armZ);
      const leg0X = (0.55 * (1 - u) + -0.6 * u) - 1.65 * Math.sin(u * Math.PI);
      const leg1X = (0.65 * (1 - u) + 0.4 * u) - 1.95 * Math.sin(u * Math.PI);
      legs[0].rotation.set(leg0X, 0, -0.06);
      legs[1].rotation.set(leg1X, 0, 0.06);
    } else {
      const u = (p - 0.72) / 0.28;
      const easeOut = Math.sin(u * Math.PI * 0.5);
      body.rotation.set((1 - easeOut) * 0.35, 0, 0);
      body.position.set(0, 0.04 * (1 - easeOut), 0);
      torso.rotation.set(0.4 * (1 - easeOut), 0, 0);
      head.rotation.set(0.25 * (1 - easeOut), 0, 0);
      legs[0].rotation.set(-0.6 * (1 - easeOut), 0, -0.04 * (1 - easeOut));
      legs[1].rotation.set(0.4 * (1 - easeOut), 0, 0.04 * (1 - easeOut));
      arms[0].rotation.set(-0.45 * (1 - easeOut), 0, -0.12 * (1 - easeOut));
      arms[1].rotation.set(-0.45 * (1 - easeOut), 0, 0.12 * (1 - easeOut));
    }
  }

  // 12. Simulace vlajícího pláště
  if (typeof animateCape === 'function') {
    animateCape(rig, dt, now, mv, vy, false);
  }
}
