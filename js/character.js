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
