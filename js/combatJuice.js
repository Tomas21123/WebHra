// =============================================================================
// CombatJuice & VFX System: Hitstop, Camera Shake, Weapon Trails & Impact VFX
// =============================================================================

const CombatJuice = {
  // Hitstop (Micro-freeze při drtivém dopadu)
  hitstopRemaining: 0,

  // Camera Shake (Otřes kamery)
  shakeIntensity: 0,
  shakeDuration: 0,
  shakeTimer: 0,
  shakeOffsetX: 0,
  shakeOffsetY: 0,
  shakeOffsetZ: 0,

  // Dynamické světelné a částicové stopy zbraní (Weapon Trails)
  trails: [],
  trailGeometry: null,
  trailMaterial: null,

  // Rázové vlny a prachové exploze na zemi (Shockwaves)
  shockwaves: [],

  // Bleskové částice zásahu (Sparks & Impacts)
  sparks: [],

  init() {
    // Inicializace objektů a poolingů
  },

  /**
   * Spustí hitstop (micro-freeze) na zadanou dobu (např. 0.04s pro běžný úder, 0.08s pro krit/těžký)
   */
  triggerHitstop(duration = 0.05) {
    this.hitstopRemaining = Math.max(this.hitstopRemaining, duration);
  },

  /**
   * Spustí otřes obrazovky (camera shake)
   * @param {number} intensity Intenzita v metrech (např. 0.08 pro běžný úder, 0.22 pro těžký/krit)
   * @param {number} duration Doba trvání v sekundách
   */
  triggerCameraShake(intensity = 0.12, duration = 0.20) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeDuration = Math.max(this.shakeDuration, duration);
    this.shakeTimer = this.shakeDuration;
  },

  /**
   * Spustí dynamickou světelnou stopu zbraně (Weapon Slash Arc Trail)
   * @param {Object} opts Nastavení trajektorie (střed, rádius, úhly, barva)
   */
  spawnWeaponTrail(opts = {}) {
    if (typeof THREE === 'undefined' || typeof scene === 'undefined' || !scene) return;

    const group = new THREE.Group();
    const color = opts.color !== undefined ? opts.color : (opts.isCrit ? 0xf59e0b : (opts.isHeavy ? 0xf97316 : 0x38bdf8));
    const radius = opts.radius || 1.4;
    const startAngle = opts.startAngle || -0.8;
    const endAngle = opts.endAngle || 1.2;
    const segments = 12;

    // Vytvoření zakřiveného srpkovitého proužku švihu čepele
    for (let i = 0; i < segments; i++) {
      const t0 = i / segments;
      const t1 = (i + 1) / segments;
      const a0 = startAngle + (endAngle - startAngle) * t0;
      const a1 = startAngle + (endAngle - startAngle) * t1;

      const rIn = radius * 0.45;
      const rOut = radius * (1.0 + Math.sin(t0 * Math.PI) * 0.25);
      const w = 0.12 * Math.sin(t0 * Math.PI);

      const geo = new THREE.BoxGeometry(0.12, w, (rOut - rIn) * 0.4);
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.85,
        depthWrite: false
      });
      const slice = new THREE.Mesh(geo, mat);
      const midA = (a0 + a1) * 0.5;
      slice.position.set(Math.sin(midA) * radius * 0.75, Math.cos(t0 * Math.PI) * 0.2, -Math.cos(midA) * radius * 0.75);
      slice.rotation.y = midA;
      slice.rotation.z = (opts.swingSign || 1) * 0.35;
      group.add(slice);
    }

    const eyeX = opts.x !== undefined ? opts.x : (typeof P !== 'undefined' ? P.x : 0);
    const eyeY = opts.y !== undefined ? opts.y : (typeof P !== 'undefined' ? (P.renderY ?? P.y) + 1.2 : 0);
    const eyeZ = opts.z !== undefined ? opts.z : (typeof P !== 'undefined' ? P.z : 0);
    const yawVal = opts.yaw !== undefined ? opts.yaw : (typeof yaw !== 'undefined' ? yaw : 0);
    const pitchVal = opts.pitch !== undefined ? opts.pitch : (typeof pitch !== 'undefined' ? pitch : 0);

    group.position.set(eyeX, eyeY, eyeZ);
    group.rotation.y = yawVal;
    group.rotation.x = -pitchVal * 0.6;

    scene.add(group);
    this.trails.push({
      group,
      life: 0.16,
      maxLife: 0.16
    });
    return group;
  },

  /**
   * Vizuální rázová vlna po dopadu na zem (Shockwave ring & dust)
   */
  spawnShockwave(x, y, z, opts = {}) {
    if (typeof THREE === 'undefined' || typeof scene === 'undefined' || !scene) return;

    const group = new THREE.Group();
    group.position.set(x, y + 0.08, z);

    const color = opts.color !== undefined ? opts.color : (opts.isCrit ? 0xf59e0b : 0xe2e8f0);
    const ringGeo = new THREE.TorusGeometry(0.5, 0.08, 4, 16);
    const ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);

    // Drobné prachové/kamenné částice rozstříknuté do kruhu
    const count = opts.particles || 10;
    const pGroup = [];
    for (let i = 0; i < count; i++) {
      const pGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
      const pMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 });
      const pMesh = new THREE.Mesh(pGeo, pMat);
      const ang = (i / count) * Math.PI * 2;
      const spd = 2.4 + Math.random() * 2.0;
      pGroup.push({
        mesh: pMesh,
        vx: Math.cos(ang) * spd,
        vy: 1.8 + Math.random() * 1.5,
        vz: Math.sin(ang) * spd
      });
      group.add(pMesh);
    }

    scene.add(group);
    this.shockwaves.push({
      group,
      ring,
      particles: pGroup,
      maxRadius: opts.maxRadius || 3.2,
      life: 0.35,
      maxLife: 0.35
    });
    return group;
  },

  /**
   * Jiskry a částice zásahu při úderu zbraní (Hit Impact Sparks)
   */
  spawnHitSparks(x, y, z, isCrit = false) {
    if (typeof THREE === 'undefined' || typeof scene === 'undefined' || !scene) return null;

    const group = new THREE.Group();
    group.position.set(x, y, z);
    const count = isCrit ? 14 : 7;
    const colors = isCrit ? [0xfacc15, 0xf97316, 0xffffff] : [0x38bdf8, 0xe2e8f0, 0xfde047];
    const sparkItems = [];

    for (let i = 0; i < count; i++) {
      const col = colors[i % colors.length];
      const geo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
      const mat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 1.0 });
      const mesh = new THREE.Mesh(geo, mat);
      const phi = Math.random() * Math.PI * 2;
      const theta = Math.random() * Math.PI;
      const spd = (isCrit ? 4.2 : 2.8) + Math.random() * 2.0;

      sparkItems.push({
        mesh,
        vx: Math.sin(theta) * Math.cos(phi) * spd,
        vy: Math.cos(theta) * spd * 0.8 + 1.2,
        vz: Math.sin(theta) * Math.sin(phi) * spd
      });
      group.add(mesh);
    }

    scene.add(group);
    this.sparks.push({
      group,
      particles: sparkItems,
      life: 0.28,
      maxLife: 0.28
    });
    return group;
  },

  /**
   * Vizuální telegrafování kouzel / dovedností (nabíjecí aura a runový kruh)
   */
  spawnSkillTelegraph(x, y, z, color = 0x38bdf8, duration = 0.4) {
    if (typeof THREE === 'undefined' || typeof scene === 'undefined' || !scene) return null;

    const group = new THREE.Group();
    group.position.set(x, y + 0.1, z);

    // Pozemní zářící kruh
    const ringGeo = new THREE.TorusGeometry(1.2, 0.06, 4, 16);
    const ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, depthWrite: false });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);

    // Vířící částice energie stoupající vzhůru k postavě
    const swirls = [];
    for (let i = 0; i < 8; i++) {
      const sGeo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
      const sMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 });
      const sMesh = new THREE.Mesh(sGeo, sMat);
      swirls.push({
        mesh: sMesh,
        angle: (i / 8) * Math.PI * 2,
        height: Math.random() * 0.4
      });
      group.add(sMesh);
    }

    scene.add(group);
    const item = {
      group,
      ring,
      swirls,
      life: duration,
      maxLife: duration
    };
    this.shockwaves.push(item);
    return group;
  },

  /**
   * Zánik nepřítele rozpadem na voxelové kostičky (Shatter / Death Burst)
   */
  spawnCreatureDeathShatter(x, y, z, color = 0x94a3b8) {
    if (typeof THREE === 'undefined' || typeof scene === 'undefined' || !scene) return null;

    const group = new THREE.Group();
    group.position.set(x, y, z);
    const count = 18;
    const pieces = [];

    for (let i = 0; i < count; i++) {
      const geo = new THREE.BoxGeometry(0.14, 0.14, 0.14);
      const mat = new THREE.MeshLambertMaterial({ color, transparent: true, opacity: 0.95 });
      const mesh = new THREE.Mesh(geo, mat);
      const ang = Math.random() * Math.PI * 2;
      const spd = 2.2 + Math.random() * 2.8;

      pieces.push({
        mesh,
        vx: Math.cos(ang) * spd,
        vy: 2.5 + Math.random() * 3.0,
        vz: Math.sin(ang) * spd,
        rotSpeedX: (Math.random() - 0.5) * 12,
        rotSpeedY: (Math.random() - 0.5) * 12
      });
      group.add(mesh);
    }

    scene.add(group);
    this.sparks.push({
      group,
      particles: pieces,
      gravity: -18,
      life: 0.65,
      maxLife: 0.65
    });
    return group;
  },

  /**
   * Hlavní update funkce volaná v herní smyčce (game.js)
   * @param {number} dt Časový krok
   * @returns {number} Skutečný dt s aplikací hitstopu
   */
  update(dt) {
    // 1. Zpracování hitstopu (micro-freeze)
    let effectiveDt = dt;
    if (this.hitstopRemaining > 0) {
      this.hitstopRemaining = Math.max(0, this.hitstopRemaining - dt);
      // Zpomalit nebo pozastavit fyziku na zlomek vteřiny
      effectiveDt = 0;
    }

    // 2. Zpracování camera shake
    if (this.shakeTimer > 0) {
      this.shakeTimer -= dt;
      const progress = Math.max(0, this.shakeTimer / this.shakeDuration);
      const currentAmp = this.shakeIntensity * progress;
      this.shakeOffsetX = (Math.random() - 0.5) * 2 * currentAmp;
      this.shakeOffsetY = (Math.random() - 0.5) * 2 * currentAmp;
      this.shakeOffsetZ = (Math.random() - 0.5) * 2 * currentAmp;
    } else {
      this.shakeIntensity = 0;
      this.shakeOffsetX = 0;
      this.shakeOffsetY = 0;
      this.shakeOffsetZ = 0;
    }

    // 3. Aktualizace stop zbraní (trails)
    for (let i = this.trails.length - 1; i >= 0; i--) {
      const tr = this.trails[i];
      tr.life -= dt;
      const alpha = Math.max(0, tr.life / tr.maxLife);
      if (tr.group && tr.group.children) {
        tr.group.children.forEach(c => {
          if (c.material) c.material.opacity = alpha * 0.85;
        });
      }
      if (tr.life <= 0) {
        if (typeof scene !== 'undefined' && scene && tr.group) {
          scene.remove(tr.group);
        }
        this.trails.splice(i, 1);
      }
    }

    // 4. Aktualizace rázových vln (shockwaves)
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.life -= dt;
      const progress = 1 - Math.max(0, sw.life / sw.maxLife);
      const alpha = Math.max(0, sw.life / sw.maxLife);

      if (sw.ring) {
        const scale = 1 + progress * (sw.maxRadius || 3.0);
        sw.ring.scale.set(scale, scale, 1);
        if (sw.ring.material) sw.ring.material.opacity = alpha * 0.9;
      }

      if (sw.particles) {
        sw.particles.forEach(p => {
          p.mesh.position.x += p.vx * dt;
          p.mesh.position.y += p.vy * dt;
          p.mesh.position.z += p.vz * dt;
          p.vy -= 14 * dt;
          if (p.mesh.material) p.mesh.material.opacity = alpha;
        });
      }

      if (sw.swirls) {
        sw.swirls.forEach(s => {
          s.angle += dt * 8;
          s.height += dt * 1.5;
          s.mesh.position.x = Math.cos(s.angle) * 0.8;
          s.mesh.position.z = Math.sin(s.angle) * 0.8;
          s.mesh.position.y = s.height;
          if (s.mesh.material) s.mesh.material.opacity = alpha;
        });
      }

      if (sw.life <= 0) {
        if (typeof scene !== 'undefined' && scene && sw.group) {
          scene.remove(sw.group);
        }
        this.shockwaves.splice(i, 1);
      }
    }

    // 5. Aktualizace jisker a úlomků (sparks & shatter)
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const sp = this.sparks[i];
      sp.life -= dt;
      const alpha = Math.max(0, sp.life / sp.maxLife);
      const grav = sp.gravity !== undefined ? sp.gravity : -12;

      if (sp.particles) {
        sp.particles.forEach(p => {
          p.mesh.position.x += p.vx * dt;
          p.mesh.position.y += p.vy * dt;
          p.mesh.position.z += p.vz * dt;
          p.vy += grav * dt;
          if (p.rotSpeedX) p.mesh.rotation.x += p.rotSpeedX * dt;
          if (p.rotSpeedY) p.mesh.rotation.y += p.rotSpeedY * dt;
          if (p.mesh.material) p.mesh.material.opacity = alpha;
        });
      }

      if (sp.life <= 0) {
        if (typeof scene !== 'undefined' && scene && sp.group) {
          scene.remove(sp.group);
        }
        this.sparks.splice(i, 1);
      }
    }

    return effectiveDt;
  }
};

if (typeof window !== 'undefined') {
  window.CombatJuice = CombatJuice;
}
