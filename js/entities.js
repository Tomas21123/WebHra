// ---------- Voxelový svět — PvE Entity, AI & Bojový Systém (Milestone 2 - F6) ----------
(function () {
  'use strict';

  // Základní statistiky nestvůr
  const CREATURE_CONFIGS = {
    Wolf: {
      type: 'Wolf',
      aliases: ['wolf', 'creature_wolf'],
      name: 'Lesní vlk',
      baseHp: 60,
      baseDamage: 14,
      speedChase: 6.8,
      speedWander: 2.2,
      aggroRadius: 15.0,
      attackReach: 2.5,
      attackCooldown: 1.4,
      hitboxRadius: 0.65,
      height: 0.8,
      xpBase: 25,
      goldBase: 5,
      color: 0x64748b,
      drops: [
        { id: 'wood', min: 1, max: 2, chance: 0.8 },
        { id: 'ore_iron', min: 1, max: 1, chance: 0.3 }
      ]
    },
    Goblin: {
      type: 'Goblin',
      aliases: ['goblin', 'creature_goblin'],
      name: 'Skřet nájezdník',
      baseHp: 80,
      baseDamage: 18,
      speedChase: 5.4,
      speedWander: 2.0,
      aggroRadius: 15.0,
      attackReach: 2.5,
      attackCooldown: 1.2,
      hitboxRadius: 0.60,
      height: 1.3,
      xpBase: 25,
      goldBase: 5,
      color: 0x15803d,
      drops: [
        { id: 'ore_iron', min: 1, max: 2, chance: 0.8 },
        { id: 'wood', min: 2, max: 3, chance: 0.9 }
      ]
    },
    Skeleton: {
      type: 'Skeleton',
      aliases: ['skeleton', 'skeleton warrior', 'creature_skeleton_warrior'],
      name: 'Kostlivý válečník',
      baseHp: 100,
      baseDamage: 25,
      speedChase: 4.6,
      speedWander: 1.8,
      aggroRadius: 14.0,
      attackReach: 2.5,
      attackCooldown: 1.6,
      hitboxRadius: 0.70,
      height: 1.8,
      xpBase: 50,
      goldBase: 12,
      color: 0x94a3b8,
      drops: [
        { id: 'stone', min: 3, max: 5, chance: 0.95 },
        { id: 'ore_iron', min: 2, max: 3, chance: 0.75 },
        { id: 'wood', min: 2, max: 4, chance: 0.8 }
      ]
    },
    Golem: {
      type: 'Golem',
      aliases: ['golem', 'stone golem', 'creature_stone_golem'],
      name: 'Kamenný golem',
      baseHp: 220,
      baseDamage: 45,
      speedChase: 3.0,
      speedWander: 1.4,
      aggroRadius: 18.0,
      attackReach: 3.4,
      attackCooldown: 2.4,
      hitboxRadius: 1.20,
      height: 2.6,
      xpBase: 150,
      goldBase: 30,
      color: 0x475569,
      drops: [
        { id: 'stone', min: 6, max: 12, chance: 1.0 },
        { id: 'ore_iron', min: 3, max: 5, chance: 0.9 }
      ]
    }
  };

  function normalizeCreatureType(type) {
    if (!type) return 'Wolf';
    const s = String(type).trim().toLowerCase();
    for (const key in CREATURE_CONFIGS) {
      const cfg = CREATURE_CONFIGS[key];
      if (cfg.type.toLowerCase() === s) return cfg.type;
      if (cfg.aliases.some(a => a.toLowerCase() === s)) return cfg.type;
    }
    if (s.includes('wolf') || s.includes('vlk')) return 'Wolf';
    if (s.includes('goblin') || s.includes('skret') || s.includes('skřet')) return 'Goblin';
    if (s.includes('skel') || s.includes('kost')) return 'Skeleton';
    if (s.includes('golem')) return 'Golem';
    return 'Wolf';
  }

  let nextEntityId = 1;

  // ---------------------------------------------------------------------------
  // Třída CreatureInstance
  // ---------------------------------------------------------------------------
  class CreatureInstance {
    constructor(type, x, y, z, level = 1) {
      const normType = normalizeCreatureType(type);
      const cfg = CREATURE_CONFIGS[normType] || CREATURE_CONFIGS.Wolf;

      this.id = nextEntityId++;
      this.type = cfg.type;
      this.name = cfg.name;
      this.level = Math.max(1, Math.floor(level));

      // Pozice a fyzika
      this.x = Number(x) || 0;
      this.y = Number(y) || 50;
      this.z = Number(z) || 0;
      this.vx = 0;
      this.vy = 0;
      this.vz = 0;
      this.rotationY = 0;
      this.ground = true;

      // Zdraví & Škálování podle úrovně
      this.maxHp = cfg.baseHp + (this.level - 1) * 15;
      this.hp = this.maxHp;
      this.baseDamage = Math.floor(cfg.baseDamage * (1 + (this.level - 1) * 0.12));

      // Vzdálenosti & Rychlosti
      this.speedChase = cfg.speedChase;
      this.speedWander = cfg.speedWander;
      this.aggroRadius = cfg.aggroRadius;
      this.attackReach = cfg.attackReach;
      this.attackCooldown = cfg.attackCooldown;
      this.attackTimer = 0;
      this.hitboxRadius = cfg.hitboxRadius;
      this.height = cfg.height;

      // Kořist
      this.loot = {
        gold: cfg.goldBase * this.level,
        wood: 2,
        ore_iron: 1,
        xp: cfg.xpBase * this.level
      };
      this.dropTemplates = cfg.drops;

      // AI Stavový automat (6 stavů: Idle, Wander, Chase, Attack, Hurt, Dead)
      this.state = 'Idle';
      this.stateTimer = 2.0;
      this.hurtTimer = 0;
      this.spawnAnchor = { x: this.x, y: this.y, z: this.z };
      this.wanderTarget = { x: this.x, z: this.z };
      this.flashTimer = 0;
      this.deathTimer = 0;

      // Vizuální 3D reprezentace
      this.group = null;
      this.healthSprite = null;
      this.healthCanvas = null;
      this.healthTexture = null;
      this.limbMeshes = {};

      this._initVisuals();
    }

    _initVisuals() {
      if (typeof THREE === 'undefined') return;

      const grp = new THREE.Group();
      grp.position.set(this.x, this.y, this.z);
      this.group = grp;

      this._buildMesh();
      this._createHealthBar();

      if (typeof scene !== 'undefined' && scene && typeof scene.add === 'function') {
        scene.add(grp);
      }
    }

    _buildMesh() {
      if (typeof THREE === 'undefined') return;

      const cfg = CREATURE_CONFIGS[this.type] || CREATURE_CONFIGS.Wolf;
      const root = new THREE.Group();

      if (this.type === 'Wolf') {
        // Tělo vlka
        const bodyGeo = new THREE.BoxGeometry(0.5, 0.45, 0.9);
        const bodyMat = new THREE.MeshLambertMaterial({ color: 0x475569 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.45;
        root.add(body);

        // Hlava
        const headGeo = new THREE.BoxGeometry(0.35, 0.35, 0.45);
        const headMat = new THREE.MeshLambertMaterial({ color: 0x64748b });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.set(0, 0.65, 0.55);
        root.add(head);

        // Uši
        const earMat = new THREE.MeshBasicMaterial({ color: 0x334155 });
        const earL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.08), earMat);
        earL.position.set(-0.12, 0.88, 0.5);
        const earR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.08), earMat);
        earR.position.set(0.12, 0.88, 0.5);
        root.add(earL); root.add(earR);

        // 4 nohy
        const legMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
        const legPositions = [
          [-0.2, 0.18, 0.3], [0.2, 0.18, 0.3],
          [-0.2, 0.18, -0.3], [0.2, 0.18, -0.3]
        ];
        this.limbMeshes.legs = [];
        legPositions.forEach((pos, idx) => {
          const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.38, 0.12), legMat);
          leg.position.set(pos[0], pos[1], pos[2]);
          root.add(leg);
          this.limbMeshes.legs.push(leg);
        });

      } else if (this.type === 'Goblin') {
        // Tělo skřeta
        const bodyMat = new THREE.MeshLambertMaterial({ color: 0x16a34a });
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.55, 0.3), bodyMat);
        body.position.y = 0.55;
        root.add(body);

        // Hlava
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.38, 0.38), bodyMat);
        head.position.set(0, 0.95, 0.05);
        root.add(head);

        // Špičaté uši
        const earL = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.22, 4), bodyMat);
        earL.rotation.z = Math.PI / 3;
        earL.position.set(-0.28, 0.98, 0.05);
        const earR = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.22, 4), bodyMat);
        earR.rotation.z = -Math.PI / 3;
        earR.position.set(0.28, 0.98, 0.05);
        root.add(earL); root.add(earR);

        // Dýka
        const dagger = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.35, 0.08), new THREE.MeshLambertMaterial({ color: 0x94a3b8 }));
        dagger.position.set(0.32, 0.55, 0.2);
        root.add(dagger);

        // Nohy
        const legMat = new THREE.MeshLambertMaterial({ color: 0x78350f });
        const legL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.32, 0.14), legMat);
        legL.position.set(-0.16, 0.16, 0);
        const legR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.32, 0.14), legMat);
        legR.position.set(0.16, 0.16, 0);
        root.add(legL); root.add(legR);
        this.limbMeshes.legs = [legL, legR];

      } else if (this.type === 'Skeleton') {
        // Kostlivec
        const boneMat = new THREE.MeshLambertMaterial({ color: 0xe2e8f0 });
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.65, 0.22), boneMat);
        torso.position.y = 0.85;
        root.add(torso);

        // Lebka s planoucíma očima
        const skull = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.34), boneMat);
        skull.position.set(0, 1.35, 0);
        root.add(skull);

        // Oči
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
        const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.06), eyeMat);
        eyeL.position.set(-0.09, 1.35, 0.17);
        const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.06), eyeMat);
        eyeR.position.set(0.09, 1.35, 0.17);
        root.add(eyeL); root.add(eyeR);

        // Meč
        const sword = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.7, 0.12), new THREE.MeshLambertMaterial({ color: 0x94a3b8 }));
        sword.position.set(0.35, 0.9, 0.25);
        root.add(sword);

        // Nohy
        const legL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.55, 0.12), boneMat);
        legL.position.set(-0.15, 0.28, 0);
        const legR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.55, 0.12), boneMat);
        legR.position.set(0.15, 0.28, 0);
        root.add(legL); root.add(legR);
        this.limbMeshes.legs = [legL, legR];

      } else if (this.type === 'Golem') {
        // Obrovský kamenný golem
        const stoneMat = new THREE.MeshLambertMaterial({ color: 0x475569 });
        const mossMat = new THREE.MeshLambertMaterial({ color: 0x15803d });

        const torso = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.3, 0.8), stoneMat);
        torso.position.y = 1.4;
        root.add(torso);

        const head = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.55, 0.55), stoneMat);
        head.position.set(0, 2.2, 0.1);
        root.add(head);

        // Žhnoucí krystalové oči
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xa855f7 });
        const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.08), eyeMat);
        eyeL.position.set(-0.18, 2.2, 0.38);
        const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.08), eyeMat);
        eyeR.position.set(0.18, 2.2, 0.38);
        root.add(eyeL); root.add(eyeR);

        // Masivní paže
        const armL = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.1, 0.4), stoneMat);
        armL.position.set(-0.85, 1.3, 0);
        const armR = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.1, 0.4), stoneMat);
        armR.position.set(0.85, 1.3, 0);
        root.add(armL); root.add(armR);

        // Nohy
        const legL = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.8, 0.45), stoneMat);
        legL.position.set(-0.35, 0.4, 0);
        const legR = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.8, 0.45), stoneMat);
        legR.position.set(0.35, 0.4, 0);
        root.add(legL); root.add(legR);
        this.limbMeshes.legs = [legL, legR];
      }

      this.group.add(root);
      this.limbMeshes.root = root;
    }

    _createHealthBar() {
      if (typeof document === 'undefined' || typeof THREE === 'undefined') return;

      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 64;
      this.healthCanvas = canvas;

      const texture = new THREE.CanvasTexture(canvas);
      this.healthTexture = texture;

      const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.scale.set(1.8, 0.45, 1);
      sprite.position.set(0, this.height + 0.35, 0);

      this.healthSprite = sprite;
      this.group.add(sprite);

      this._updateHealthCanvas();
    }

    _updateHealthCanvas() {
      if (!this.healthCanvas) return;
      const ctx = this.healthCanvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, 256, 64);

      // Titulek: Level & Jméno
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 4;
      ctx.fillText(`[Lv.${this.level}] ${this.name}`, 128, 24);
      ctx.shadowBlur = 0;

      // Pozadí baru
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(20, 36, 216, 18);
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      ctx.strokeRect(20, 36, 216, 18);

      // Vyplnění zdraví
      const pct = Math.max(0, Math.min(1, this.hp / (this.maxHp || 1)));
      let barColor = '#22c55e';
      if (pct < 0.25) barColor = '#ef4444';
      else if (pct < 0.55) barColor = '#f59e0b';

      ctx.fillStyle = barColor;
      ctx.fillRect(22, 38, Math.floor(212 * pct), 14);

      if (this.healthTexture) this.healthTexture.needsUpdate = true;
    }

    takeDamage(dmg, knockback, isCrit = false, attacker = 'player') {
      if (this.state === 'Dead') return 0;

      const actualDmg = Math.max(1, Math.round(dmg || 1));
      this.hp = Math.max(0, this.hp - actualDmg);
      this._updateHealthCanvas();

      // Vizuální indikátor poškození
      if (window.EntityManager && typeof window.EntityManager.spawnDamageNumber === 'function') {
        window.EntityManager.spawnDamageNumber(this.x, this.y + this.height * 0.8, this.z, actualDmg, isCrit, false);
      }

      // Knockback impuls
      if (knockback && typeof knockback === 'object') {
        this.vx += (knockback.x || 0) * 4.5;
        this.vz += (knockback.z || 0) * 4.5;
        this.vy = Math.max(this.vy, 2.2);
        this.ground = false;
      }

      this.flashTimer = 0.2; // Červený záblesk po zásahu

      if (this.hp <= 0) {
        this.state = 'Dead';
        this.die();
      } else {
        // Zraněná nestvůra přejde do stavu Hurt (stagger / ochromení)
        this.state = 'Hurt';
        this.hurtTimer = 0.35; // Stagger duration
      }

      return this.hp;
    }

    die() {
      this.state = 'Dead';
      this.deathTimer = 1.2;

      // Zrušení zdravíčka
      if (this.healthSprite) {
        this.healthSprite.visible = false;
      }

      // Udělení zkušeností hráči
      if (typeof window !== 'undefined') {
        if (typeof window.addPlayerXP === 'function') {
          window.addPlayerXP(this.loot.xp, this.name);
        } else if (typeof P !== 'undefined' && P) {
          P.xp = (P.xp || 0) + this.loot.xp;
          if (typeof window.checkPlayerLevelUp === 'function') {
            window.checkPlayerLevelUp();
          }
        }
      }

      // Zlato přímo do inventáře
      if (typeof INV !== 'undefined' && Array.isArray(INV)) {
        const goldIt = INV.find(it => it.id === 'coin_gold' || it.id === 'gold');
        if (goldIt) goldIt.count = (goldIt.count || 0) + this.loot.gold;
      }

      // Fyzický loot drop v herním světě
      if (window.EntityManager && typeof window.EntityManager.spawnLootDrop === 'function') {
        // Drop dřeva & železa podle loot tabulky
        if (this.loot.wood > 0) {
          window.EntityManager.spawnLootDrop('wood', this.loot.wood, this.x + 0.3, this.y + 0.2, this.z);
        }
        if (this.loot.ore_iron > 0) {
          window.EntityManager.spawnLootDrop('ore_iron', this.loot.ore_iron, this.x - 0.3, this.y + 0.2, this.z);
        }
      }

      // Animace pádu / kolapsu
      if (this.limbMeshes.root) {
        this.limbMeshes.root.rotation.x = Math.PI / 2;
        this.limbMeshes.root.position.y = 0.2;
      }
    }

    // Aktualizace AI chování a pohybu v terénu
    update(playerPos, dt = 0.016) {
      if (this.state === 'Dead') {
        this.deathTimer -= dt;
        return;
      }

      const px = (playerPos && typeof playerPos.x === 'number') ? playerPos.x : (typeof P !== 'undefined' ? P.x : 0);
      const pz = (playerPos && typeof playerPos.z === 'number') ? playerPos.z : (typeof P !== 'undefined' ? P.z : 0);
      const dist = Math.hypot(this.x - px, this.z - pz);

      if (this.attackTimer > 0) this.attackTimer -= dt;

      // -----------------------------------------------------------------------
      // AI Stav Hurt (stagger / ochromení po zásahu)
      // -----------------------------------------------------------------------
      if (this.state === 'Hurt') {
        this.hurtTimer -= dt;
        if (this.hurtTimer <= 0) {
          this.state = (dist <= this.attackReach) ? 'Attack' : 'Chase';
        }
        return; // Creature reels/staggers, freezing movement & attack during hurtTimer
      }

      // -----------------------------------------------------------------------
      // AI Přechody mezi stavy
      // -----------------------------------------------------------------------
      if (dist <= this.attackReach) {
        this.state = 'Attack';
      } else if (dist <= this.aggroRadius) {
        this.state = 'Chase';
      } else {
        // Hráč je mimo dosah vidění
        if (this.state === 'Chase' && dist > this.aggroRadius * 1.5) {
          this.state = 'Wander';
          this.stateTimer = 4.0;
        } else if (this.state !== 'Wander' && this.state !== 'Idle') {
          this.state = 'Wander';
        }
      }

      // -----------------------------------------------------------------------
      // AI Provádění chování
      // -----------------------------------------------------------------------
      let moveDirX = 0;
      let moveDirZ = 0;
      let moveSpeed = 0;

      if (this.state === 'Idle') {
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.state = 'Wander';
          this.stateTimer = 3.0 + Math.random() * 3.0;
          const wanderAng = Math.random() * Math.PI * 2;
          const wanderR = 4.0 + Math.random() * 8.0;
          this.wanderTarget.x = this.spawnAnchor.x + Math.cos(wanderAng) * wanderR;
          this.wanderTarget.z = this.spawnAnchor.z + Math.sin(wanderAng) * wanderR;
        }
      } else if (this.state === 'Wander') {
        this.stateTimer -= dt;
        const toWanderX = this.wanderTarget.x - this.x;
        const toWanderZ = this.wanderTarget.z - this.z;
        const wanderDist = Math.hypot(toWanderX, toWanderZ);

        if (wanderDist > 0.8 && this.stateTimer > 0) {
          moveDirX = toWanderX / wanderDist;
          moveDirZ = toWanderZ / wanderDist;
          moveSpeed = this.speedWander;
          this.rotationY = Math.atan2(moveDirX, moveDirZ);
        } else {
          this.state = 'Idle';
          this.stateTimer = 2.0 + Math.random() * 2.0;
        }
      } else if (this.state === 'Chase') {
        const toPlayerX = px - this.x;
        const toPlayerZ = pz - this.z;
        const pDist = Math.hypot(toPlayerX, toPlayerZ);

        if (pDist > 0.5) {
          moveDirX = toPlayerX / pDist;
          moveDirZ = toPlayerZ / pDist;
          moveSpeed = this.speedChase;
          this.rotationY = Math.atan2(moveDirX, moveDirZ);
        }
      } else if (this.state === 'Attack') {
        const toPlayerX = px - this.x;
        const toPlayerZ = pz - this.z;
        this.rotationY = Math.atan2(toPlayerX, toPlayerZ);

        if (this.attackTimer <= 0) {
          this.attackTimer = this.attackCooldown;
          this._performAttack(dist);
        }
      }

      // -----------------------------------------------------------------------
      // Pohyb & Fyzika s asistencí schodů (Step-assist 0.55m)
      // -----------------------------------------------------------------------
      const targetVx = moveDirX * moveSpeed;
      const targetVz = moveDirZ * moveSpeed;
      this.vx += (targetVx - this.vx) * Math.min(1, dt * 10);
      this.vz += (targetVz - this.vz) * Math.min(1, dt * 10);

      const prevX = this.x;
      const prevZ = this.z;
      this.x += this.vx * dt;
      this.z += this.vz * dt;

      // Výpočet výšky terénu
      if (typeof height === 'function') {
        const s = (typeof S !== 'undefined') ? S : 0.5;
        const curBX = Math.floor(this.x / s);
        const curBZ = Math.floor(this.z / s);
        const terrainH = height(curBX, curBZ) * s;

        // Pokud je terén vyšší o blok (max 0.65m), nestvůra automaticky vystoupá
        if (terrainH > this.y && terrainH - this.y <= 0.65) {
          this.y = terrainH;
          this.vy = 0;
          this.ground = true;
        } else if (terrainH - this.y > 0.65) {
          // Nepřekročitelná stěna / svislý útes: zastavit horizontální rychlost a neskypovat na vrchol
          this.x = prevX;
          this.z = prevZ;
          this.vx = 0;
          this.vz = 0;
        } else if (this.y > terrainH) {
          this.vy -= 22 * dt; // Gravitace
          this.y += this.vy * dt;
          if (this.y <= terrainH) {
            this.y = terrainH;
            this.vy = 0;
            this.ground = true;
          }
        } else {
          this.y = terrainH;
          this.vy = 0;
          this.ground = true;
        }
      }

      // Animace nohou při chůzi
      if (this.limbMeshes.legs && moveSpeed > 0) {
        const animNow = (typeof performance !== 'undefined' && typeof performance.now === 'function') ? performance.now() : Date.now();
        const legSwing = Math.sin(animNow * 0.01 * moveSpeed) * 0.45;
        this.limbMeshes.legs.forEach((leg, i) => {
          leg.rotation.x = (i % 2 === 0) ? legSwing : -legSwing;
        });
      }

      // Synchronizace 3D scény
      if (this.group) {
        this.group.position.set(this.x, this.y, this.z);
        this.group.rotation.y = this.rotationY;
      }
    }

    _performAttack(dist) {
      if (dist > this.attackReach + 0.6) return;

      // Hráčský dodge roll i-frames check
      if (typeof P !== 'undefined' && P.isRolling) {
        return; // Zásah minut díky úskoku
      }

      // Hráčský shield block check
      if (typeof P !== 'undefined' && P.isBlocking) {
        const blockPower = 0.70;
        const mitigatedDmg = Math.max(1, Math.round(this.baseDamage * (1 - blockPower)));
        if (typeof P.hp === 'number') P.hp = Math.max(0, P.hp - mitigatedDmg);
        if (typeof G !== 'undefined' && typeof G.hp === 'number') G.hp = Math.max(0, G.hp - mitigatedDmg);
        if (typeof P.stamina === 'number') P.stamina = Math.max(0, P.stamina - 15);
        if (typeof playBlockSound === 'function') playBlockSound();
        if (typeof toast === 'function') toast(`🛡️ Útok nestvůry vykryt štítem (-${mitigatedDmg} HP)`);
        return;
      }

      // Přímý zásah hráče
      const dmg = this.baseDamage;
      if (typeof P !== 'undefined' && typeof P.hp === 'number') {
        P.hp = Math.max(0, P.hp - dmg);
      }
      if (typeof G !== 'undefined' && typeof G.hp === 'number') {
        G.hp = Math.max(0, G.hp - dmg);
      }

      if (typeof toast === 'function') {
        toast(`⚠️ ${this.name} tě zasáhl za -${dmg} HP!`);
      }

      // Červený záblesk obrazovky při zranění
      const flash = (typeof document !== 'undefined') ? document.getElementById('damageFlash') : null;
      if (flash) {
        flash.style.opacity = '0.55';
        setTimeout(() => { if (flash) flash.style.opacity = '0'; }, 160);
      }
    }

    dispose() {
      if (this.group && typeof scene !== 'undefined' && scene) {
        scene.remove(this.group);
      }
      if (this.healthTexture) this.healthTexture.dispose();
      this.group = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Globální Správce Entit (window.EntityManager)
  // ---------------------------------------------------------------------------
  const EntityManager = {
    creatures: [],
    projectiles: [],
    droppedLoot: [],
    damageNumbers: [],

    spawnCreature: function (type, x, y, z, level = 1) {
      const creature = new CreatureInstance(type, x, y, z, level);
      this.creatures.push(creature);
      return creature;
    },

    removeCreature: function (id) {
      const idx = this.creatures.findIndex(c => c.id === id);
      if (idx !== -1) {
        const c = this.creatures[idx];
        c.dispose();
        this.creatures.splice(idx, 1);
      }
    },

    getNearbyCreatures: function (x, z, radius = 20) {
      return this.creatures.filter(c => {
        if (!c || c.state === 'Dead') return false;
        return Math.hypot(c.x - x, c.z - z) <= radius;
      });
    },

    spawnDamageNumber: function (x, y, z, damage, isCrit = false, isHeal = false) {
      if (typeof document === 'undefined' || typeof THREE === 'undefined' || typeof scene === 'undefined' || !scene) return;

      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, 128, 64);
      ctx.textAlign = 'center';
      ctx.font = isCrit ? 'bold 36px sans-serif' : 'bold 28px sans-serif';
      ctx.fillStyle = isHeal ? '#22c55e' : (isCrit ? '#fbbf24' : '#ffffff');
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 4;

      const text = isHeal ? `+${damage}` : (isCrit ? `💥 -${damage}!` : `-${damage}`);
      ctx.strokeText(text, 64, 44);
      ctx.fillText(text, 64, 44);

      const texture = new THREE.CanvasTexture(canvas);
      const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.position.set(x + (Math.random() - 0.5) * 0.4, y + 0.6, z + (Math.random() - 0.5) * 0.4);
      sprite.scale.set(isCrit ? 1.6 : 1.2, isCrit ? 0.8 : 0.6, 1);

      scene.add(sprite);

      this.damageNumbers.push({
        sprite,
        texture,
        vy: 1.8,
        life: 0.75,
        maxLife: 0.75
      });
    },

    spawnLootDrop: function (itemId, count, x, y, z) {
      if (typeof THREE === 'undefined' || typeof scene === 'undefined' || !scene) return;

      const grp = new THREE.Group();
      grp.position.set(x, y + 0.25, z);

      // Zářící kostička reprezentující kořist
      const geo = new THREE.BoxGeometry(0.24, 0.24, 0.24);
      const mat = new THREE.MeshLambertMaterial({
        color: itemId.includes('iron') ? 0x94a3b8 : (itemId.includes('gold') ? 0xf59e0b : 0x78350f)
      });
      const mesh = new THREE.Mesh(geo, mat);
      grp.add(mesh);

      scene.add(grp);

      this.droppedLoot.push({
        itemId,
        count: count || 1,
        x, y, z,
        baseY: y,
        group: grp,
        mesh,
        age: 0
      });
    },

    update: function (dt = 0.016) {
      const playerPos = (typeof P !== 'undefined') ? P : { x: 0, z: 0 };

      // 1. Aktualizace všech nestvůr
      for (let i = this.creatures.length - 1; i >= 0; i--) {
        const c = this.creatures[i];
        c.update(playerPos, dt);

        if (c.state === 'Dead' && c.deathTimer <= 0) {
          c.dispose();
          this.creatures.splice(i, 1);
        }
      }

      // 2. Aktualizace poletujících čísel zranění
      for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
        const dn = this.damageNumbers[i];
        dn.life -= dt;
        dn.sprite.position.y += dn.vy * dt;
        dn.sprite.material.opacity = Math.max(0, dn.life / dn.maxLife);

        if (dn.life <= 0) {
          if (typeof scene !== 'undefined' && scene) scene.remove(dn.sprite);
          if (dn.texture) dn.texture.dispose();
          this.damageNumbers.splice(i, 1);
        }
      }

      // 3. Aktualizace a magnetismus fyzického lootu
      for (let i = this.droppedLoot.length - 1; i >= 0; i--) {
        const loot = this.droppedLoot[i];
        loot.age += dt;

        if (loot.mesh) {
          loot.mesh.rotation.y += dt * 2.2;
          loot.mesh.position.y = Math.sin(loot.age * 4.0) * 0.08;
        }

        // Magnetické přitahování k hráči
        if (typeof P !== 'undefined') {
          const dx = P.x - loot.x;
          const dz = P.z - loot.z;
          const d = Math.hypot(dx, dz);

          if (d <= 2.2) {
            // Sebrání do inventáře
            if (typeof INV !== 'undefined' && Array.isArray(INV)) {
              const item = INV.find(it => it.id === loot.itemId);
              if (item) {
                item.count = (item.count || 0) + loot.count;
              }
            }
            if (typeof toast === 'function') {
              toast(`📦 Sebráno: +${loot.count}x ${loot.itemId}`);
            }

            if (typeof scene !== 'undefined' && scene) scene.remove(loot.group);
            this.droppedLoot.splice(i, 1);
          }
        }
      }
    },

    clearAll: function () {
      this.creatures.forEach(c => c.dispose());
      this.creatures = [];
      this.damageNumbers.forEach(dn => {
        if (typeof scene !== 'undefined' && scene) scene.remove(dn.sprite);
        if (dn.texture) dn.texture.dispose();
      });
      this.damageNumbers = [];
      this.droppedLoot.forEach(l => {
        if (typeof scene !== 'undefined' && scene) scene.remove(l.group);
      });
      this.droppedLoot = [];
    }
  };

  // Export do globálního okna
  if (typeof window !== 'undefined') {
    window.EntityManager = EntityManager;
  }
})();
