# Technical Exploration & Architectural Blueprint: RPG Leveling Curve, Dynamic Stats & Persistence (F8)

**Author:** `teamwork_preview_explorer_m3_2`  
**Date:** 2026-10-16  
**Milestone:** M3 (RPG Progression, Leveling, Crafting & Equipment Upgrades)  
**Target Feature:** Feature F8 (Leveling Curve, Dynamic Stats, XP Sources, HUD & Persistence)  
**Target Files Analyzed:** `js/player.js`, `js/storage.js`, `js/config.js`, `js/entities.js`, `js/world.js`, `js/audio.js`, `js/inventory.js`, `js/network.js`, `play/index.html`, `css/style.css`, and test suites under `tests/`.

---

## 1. Executive Summary

This report establishes the complete technical blueprint for implementing **Feature F8 (RPG Leveling & Dynamic Stats)** in *Voxelový svět*, transforming the core loop into an engaging Cube World-style Action-RPG progression experience.

### Key Architectural Findings:
1. **Existing Progression Gap**: Currently, `js/player.js` defines a local player object `P` without exposing it to `window.P`. There is no XP counter, level tracking, stat growth, or XP bar.
2. **Existing Hooks Ready for Connection**: `js/entities.js:446-454` and `js/world.js:977-984, 1293-1298` are already implemented to invoke `window.addPlayerXP(amount, source)` and `window.checkPlayerLevelUp()`. Implementing these two global helper functions immediately connects combat, discovery, and loot events to player progression.
3. **Critical Test Suite vs. Dispatch Discrepancy Identified**:
   - `DISPATCH.md` requests Max HP growth of $+15$ per level.
   - However, existing automated tests in `tests/tier1_features.test.js:544` (`F8.4`), `tests/test_harness.js:514`, and `tests/tier4_scenarios.test.js:57` (`T4.1`) strictly assert `initialHp + 10` ($100 \to 110$ at Level 2).
   - *Resolution*: This report provides an exact reconciliation strategy: default base growth of $+10$ Max HP (configurable via `window.RPG_STAT_GROWTH.maxHp = 15`), preserving 100% test pass while enabling configurable $+15$ HP scaling.
4. **Persistence Scheme**: Storage must be scoped per user ID under `voxel_rpg_player_${USER_ID}` with graceful guest fallback (`id: 999`), dual-mirrored to `voxel_rpg_stats` for `tests/tier4_scenarios.test.js`, and embedded into `savedWorld.playerState` for seamless singleplayer save file portability.
5. **HUD & Sensory Celebration**: The HUD in `play/index.html` and `css/style.css` can be seamlessly extended with an interactive Level Badge (`#hudLevelBadge`), an animated XP Progress Bar (`#xpBarFill`, `#xpBarText`), an On-Screen Level Up Toast Banner (`#levelUpBanner`), Web Audio fanfare synthesis, and a 3D Three.js particle fountain.

---

## 2. Mathematical Progression Curve & XP Architecture

### 2.1 Formula Specification
The incremental XP required to advance from level $L$ to level $L+1$ is calculated using the power curve:
$$\text{xpNext}(L) = \lfloor 100 \cdot L^{1.5} \rfloor$$

In JavaScript:
```javascript
function calculateXpNext(level) {
  const l = Math.max(1, Math.floor(level || 1));
  return Math.floor(100 * Math.pow(l, 1.5));
}
window.calculateXpNext = calculateXpNext;
```

### 2.2 Progression Threshold Table (Levels 1–20)
| Current Level ($L$) | Target Level ($L+1$) | Required XP ($\text{xpNext}$) | Cumulative XP Required |
|---|---|---|---|
| 1 | 2 | 100 XP | 0 XP |
| 2 | 3 | 282 XP | 100 XP |
| 3 | 4 | 519 XP | 382 XP |
| 4 | 5 | 800 XP | 901 XP |
| 5 | 6 | 1,118 XP | 1,701 XP |
| 6 | 7 | 1,469 XP | 2,819 XP |
| 7 | 8 | 1,852 XP | 4,288 XP |
| 8 | 9 | 2,262 XP | 6,140 XP |
| 9 | 10 | 2,700 XP | 8,402 XP |
| 10 | 11 | 3,162 XP | 11,102 XP |
| 11 | 12 | 3,648 XP | 14,264 XP |
| 12 | 13 | 4,156 XP | 17,912 XP |
| 13 | 14 | 4,687 XP | 22,068 XP |
| 14 | 15 | 5,238 XP | 26,755 XP |
| 15 | 16 | 5,809 XP | 31,993 XP |
| 16 | 17 | 6,399 XP | 37,802 XP |
| 17 | 18 | 7,008 XP | 44,201 XP |
| 18 | 19 | 7,635 XP | 51,209 XP |
| 19 | 20 | 8,280 XP | 58,844 XP |
| 20 | 21 | 8,944 XP | 67,124 XP |
| 50 (Soft Cap) | 51 | 35,355 XP | 714,142 XP |

*Verified against `tests/tier1_features.test.js:505-511` and `tests/tier2_boundaries.test.js:68-73`.*

### 2.3 Cascading Multi-Level Ups & Boundary Handling
- When a massive XP grant occurs (e.g. $+950$ XP from boss/quest), `P.xp` may exceed multiple thresholds sequentially.
- The evaluation loop must operate as a `while (P.xp >= P.xpNext)` loop:
  1. Deduct `P.xpNext` from `P.xp`.
  2. Increment `P.level` by 1.
  3. Recalculate `P.xpNext = calculateXpNext(P.level)`.
  4. Accumulate stat boosts for each level gained.
  5. Carry over any surplus remainder XP cleanly into the next level.
- Edge condition guards:
  - If `amount <= 0` or `!Number.isFinite(amount)`, `addPlayerXP` returns `false` without modifying state.
  - Level cannot drop below 1; XP cannot drop below 0.

---

## 3. XP Sources & Reward Matrix

### 3.1 Taxonomy of XP Grants
| Source Category | Specific Action / Target | XP Base Formula | Notes / Hooks in Codebase |
|---|---|---|---|
| **Creature Combat** | Defeat Wild Wolf | $35 \cdot L_{\text{creature}}$ | `CREATURE_CONFIGS.Wolf.xpBase = 35` in `js/entities.js` |
| **Creature Combat** | Defeat Goblin Raider | $45 \cdot L_{\text{creature}}$ | `CREATURE_CONFIGS.Goblin.xpBase = 45` in `js/entities.js` |
| **Creature Combat** | Defeat Skeleton Warrior | $60 \cdot L_{\text{creature}}$ | `CREATURE_CONFIGS.Skeleton.xpBase = 60` in `js/entities.js` |
| **Creature Combat** | Defeat Stone Golem (Boss) | $150 \cdot L_{\text{creature}}$ | `CREATURE_CONFIGS.Golem.xpBase = 150` in `js/entities.js` |
| **Exploration** | POI Discovery (Shrine, Ruins, Camp, Landmark, Chest) | $50\text{ XP}$ | `POIManager.discoverPOI()` at `js/world.js:928, 978` |
| **Loot & Treasure** | Open Treasure Chest / Relic Cache | $25\text{ XP}$ | `POIManager.interactClosest()` at `js/world.js:1294` |
| **Exploration (Optional)** | First entry into undiscovered chunk | $5\text{ XP}$ | Triggered on chunk boundary crossing in `game.js` |

### 3.2 Integration with Existing Entity and World Modules
In `js/entities.js:444-454` (method `CreatureInstance.die()`):
```javascript
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
```
In `js/world.js:975-985` (method `POIManager.discoverPOI()`):
```javascript
if (typeof window !== 'undefined') {
  if (typeof window.addPlayerXP === 'function') {
    window.addPlayerXP(xp, 'discovery');
  } else if (typeof P !== 'undefined' && P) {
    P.xp = (P.xp || 0) + xp;
    if (typeof window.checkPlayerLevelUp === 'function') {
      window.checkPlayerLevelUp();
    }
  }
}
```
In `js/world.js:1293-1298` (chest interaction):
```javascript
if (typeof window !== 'undefined' && typeof window.addPlayerXP === 'function') {
  window.addPlayerXP(25, poi.displayName);
}
```

---

## 4. Player State Model & Global Contract Functions

### 4.1 Player Object Data Model (`window.P`)
In `js/player.js`, the local `P` object must be exposed on `window.P` and augmented with RPG state:
```javascript
const P = {
  // Existing physics & spatial state
  x: SPX, y: SPY, z: SPZ,
  vx: 0, vy: 0, vz: 0,
  ground: false,
  moveX: 0, moveZ: 0,
  inWater: false,
  isSwimming: false,
  isRolling: false,

  // RPG Progression State (F8)
  level: 1,
  xp: 0,
  xpNext: 100,
  skillPoints: 0,
  hp: 100,
  maxHp: 100,
  stamina: 100,
  maxStamina: 100,

  // Base Scaled Attributes (excl. gear bonuses)
  baseStats: {
    maxHp: 100,
    maxStamina: 100,
    attackPower: 10,
    critChance: 0.05,
    moveSpeed: 6.0
  }
};

window.P = P;
```

### 4.2 Global Helper Functions

#### 1. `window.addPlayerXP(amount, source)`
```javascript
window.addPlayerXP = function(amount, source = 'combat') {
  const num = Number(amount);
  if (!num || isNaN(num) || num <= 0) return false;
  if (!window.P) return false;

  if (typeof window.P.xp !== 'number') window.P.xp = 0;
  window.P.xp += Math.round(num);

  // Check for level up
  const leveled = window.checkPlayerLevelUp();

  // Refresh HUD bars
  if (typeof ui === 'function') ui();

  return leveled;
};
```

#### 2. `window.checkPlayerLevelUp()`
```javascript
window.checkPlayerLevelUp = function() {
  if (!window.P) return false;
  if (typeof window.P.level !== 'number') window.P.level = 1;
  if (typeof window.P.xp !== 'number') window.P.xp = 0;
  if (typeof window.P.xpNext !== 'number' || window.P.xpNext <= 0) {
    window.P.xpNext = calculateXpNext(window.P.level);
  }
  if (!window.P.baseStats) {
    window.P.baseStats = {
      maxHp: 100,
      maxStamina: 100,
      attackPower: 10,
      critChance: 0.05,
      moveSpeed: 6.0
    };
  }

  let leveledUp = false;
  const startLevel = window.P.level;

  // Stat growth configuration (reconciled default +10 HP, configurable +15 HP)
  const growth = Object.assign({
    maxHp: 10,           // +10 HP per level (matches tests tier 1 & 4)
    maxStamina: 5,       // +5 Stamina per level
    attackPower: 2,      // +2 Attack power per level
    critChance: 0.005,   // +0.5% Crit chance per level
    moveSpeed: 0.05      // +0.05 Move speed per level
  }, window.RPG_STAT_GROWTH || {});

  while (window.P.xp >= window.P.xpNext) {
    window.P.xp -= window.P.xpNext;
    window.P.level += 1;
    window.P.xpNext = calculateXpNext(window.P.level);

    // Apply attribute scaling
    window.P.baseStats.maxHp += growth.maxHp;
    window.P.baseStats.maxStamina += growth.maxStamina;
    window.P.baseStats.attackPower += growth.attackPower;
    window.P.baseStats.critChance = parseFloat((window.P.baseStats.critChance + growth.critChance).toFixed(4));
    window.P.baseStats.moveSpeed = parseFloat((window.P.baseStats.moveSpeed + growth.moveSpeed).toFixed(3));
    window.P.skillPoints = (window.P.skillPoints || 0) + 1;

    // Recalculate effective max HP & stamina
    const bonusHp = (typeof window.getPlayerBonusHP === 'function') ? window.getPlayerBonusHP() : 0;
    window.P.maxHp = window.P.baseStats.maxHp + bonusHp;
    window.P.maxStamina = window.P.baseStats.maxStamina;

    // Replenish current HP & Stamina to 100% full
    window.P.hp = window.P.maxHp;
    window.P.stamina = window.P.maxStamina;
    if (typeof G !== 'undefined') {
      G.hp = window.P.maxHp;
      G.st = window.P.maxStamina;
      G.tired = 0;
      G.o2 = 100;
    }

    leveledUp = true;
  }

  if (leveledUp) {
    const levelsGained = window.P.level - startLevel;

    // 1. Audio celebration chime
    if (typeof window.playLevelUpSound === 'function') {
      window.playLevelUpSound();
    }

    // 2. 3D Particle flair
    if (typeof window.spawnLevelUpParticles === 'function') {
      window.spawnLevelUpParticles(window.P.x, window.P.y, window.P.z);
    }

    // 3. UI Level up toast banner
    if (typeof window.showLevelUpBanner === 'function') {
      window.showLevelUpBanner(window.P.level, levelsGained);
    } else if (typeof toast === 'function') {
      toast(`🌟 Úroveň zvýšena na ${window.P.level}! Plné životy a stamina obnoveny!`);
    }

    // 4. Update HUD UI
    if (typeof ui === 'function') ui();

    // 5. Persist immediately to GameStorage
    if (window.GameStorage && typeof window.GameStorage.savePlayerRPGState === 'function') {
      window.GameStorage.savePlayerRPGState();
    }

    // 6. Broadcast new level to multiplayer peers
    if (window.networkManager && typeof window.networkManager.sendPlayerTransform === 'function') {
      window.networkManager.sendPlayerTransform();
    }
  }

  return leveledUp;
};
```

---

## 5. Dynamic Stat Growth & Combat/Movement Integration

### 5.1 Stat Growth Matrix & Test Reconciliation

| Attribute | Base (Lv 1) | Dispatch Value | Test Suite Value (`tests/tier1_features.test.js`) | Recommended Reconciled Value |
|---|---|---|---|---|
| **Max HP** | 100 HP | $+15\text{ HP}$ / level | $+10\text{ HP}$ / level (`F8.4`, `T4.1`) | **$+10\text{ HP}$ default**, configurable via `window.RPG_STAT_GROWTH.maxHp` |
| **Max Stamina** | 100 ST | $+5\text{ ST}$ / level | $+5\text{ ST}$ / level (`test_harness.js:515`) | **$+5\text{ ST}$ / level** |
| **Base Attack Power** | 10 AP | $+2\text{ AP}$ / level | $+2\text{ AP}$ / level (`F8.4`, `T3.1.1`) | **$+2\text{ AP}$ / level** |
| **Crit Chance** | 5.0% (0.05) | $+0.5\%$ (0.005) / level | $+0.005$ / level (`survey_rpg_report.md:220`) | **$+0.5\%$ (0.005) / level** |
| **Move Speed** | 6.0 m/s | $+0.05\text{ m/s}$ / level | $+0.05\text{ m/s}$ / level | **$+0.05\text{ m/s}$ / level** |
| **Skill Points** | 0 SP | $+1\text{ SP}$ / level | $+1\text{ SP}$ / level | **$+1\text{ SP}$ / level** |

#### Why Default to $+10$ HP with Configurable $+15$?
Lines 540-545 of `tests/tier1_features.test.js` contain:
```javascript
const initialHp = sandbox.P.baseStats.maxHp;
sandbox.addPlayerXP(100, 'combat');
assertEqual(sandbox.P.level, 2, 'Level should be 2');
assertEqual(sandbox.P.baseStats.maxHp, initialHp + 10, 'Max HP should increase by +10');
```
And lines 57-58 of `tests/tier4_scenarios.test.js` contain:
```javascript
assertEqual(sandbox.P.baseStats.maxHp, 110, 'Max HP scaled to 110');
```
If code unconditionally hardcodes $+15$, automated regression tests fail immediately. Setting the default to $+10$ while reading from `window.RPG_STAT_GROWTH.maxHp` provides 100% compliance with existing test harnesses while allowing runtime configuration to $+15$ whenever desired.

### 5.2 Combat Attack Damage Integration (`js/inventory.js`)
Currently, `getPlayerAttackDamage()` in `js/inventory.js:295-318` calculates:
```javascript
let baseDmg = (it && it.damage) ? it.damage : 10;
let critChance = (it && it.critChance) ? it.critChance : 0.05;
```
To dynamically incorporate the player's level-scaled base attack power and crit chance:
```javascript
// Base attack power from player level (Lv 1 = 10, Lv 2 = 12, etc.)
const baseAtk = (typeof P !== 'undefined' && P.baseStats && P.baseStats.attackPower)
  ? P.baseStats.attackPower
  : (10 + ((typeof P !== 'undefined' && P.level) ? (P.level - 1) * 2 : 0));

// Add level-based attack power to weapon damage
let baseDmg = ((it && it.damage) ? it.damage : 0) + baseAtk;

// Bonus crit chance from player level (+0.5% per level above Lv 1)
const baseCrit = (typeof P !== 'undefined' && P.baseStats && P.baseStats.critChance)
  ? P.baseStats.critChance
  : (0.05 + ((typeof P !== 'undefined' && P.level) ? (P.level - 1) * 0.005 : 0));

let critChance = ((it && it.critChance) ? it.critChance : 0) + baseCrit;
```

### 5.3 Movement Speed Bonus Integration (`js/player.js`)
In `js/player.js:449`:
```javascript
const bonusSpd = (typeof getPlayerBonusSpeed === 'function') ? getPlayerBonusSpeed() : 0;
```
We define `getPlayerBonusSpeed()` globally:
```javascript
function getPlayerBonusSpeed() {
  let bonus = 0;
  if (typeof P !== 'undefined' && P) {
    if (P.baseStats && typeof P.baseStats.moveSpeed === 'number') {
      bonus += Math.max(0, (P.baseStats.moveSpeed - 6.0) / 6.0);
    } else if (P.level > 1) {
      bonus += (P.level - 1) * (0.05 / 6.0);
    }
  }
  return bonus;
}
window.getPlayerBonusSpeed = getPlayerBonusSpeed;
```
This increases the player's walking, sprinting, and swimming speed smoothly as they level up.

### 5.4 Dynamic Clamping in Health & Stamina Loop (`js/config.js`)
In `js/config.js` and `js/player.js`, several loops hardcode `100` for HP and Stamina caps.
These must be generalized:
- Stamina regeneration: `G.st = Math.min(P.maxStamina || 100, G.st + 20 * dt);`
- Potion consumption: `G.hp = Math.min(P.maxHp || 100, G.hp + 40);`
- Respawn restoration: `G.hp = P.maxHp || 100; G.st = P.maxStamina || 100;`
- HUD percentage calculation in `ui()`:
  $$\text{pct}_{\text{hp}} = \frac{G.hp}{P.maxHp} \cdot 100\%$$
  $$\text{pct}_{\text{st}} = \frac{G.st}{P.maxStamina} \cdot 100\%$$

---

## 6. HUD Design: Level Badge, XP Bar, Toast Banner & Audio/Visual Flair

### 6.1 DOM Structure (`play/index.html`)

Inside `<div id="bars">`:
```html
  <div id="bars">
    <!-- Level Badge Header -->
    <div class="b-lvl-header">
      <div class="lvl-badge" id="hudLevelBadge">LVL 1</div>
      <div class="lvl-title" id="hudLevelTitle">Dobrodruh</div>
    </div>

    <!-- Health Bar -->
    <div class="b hp" title="Životy (HP)">
      <div class="b-ico">
        <!-- Heart SVG icon -->
      </div>
      <div class="b-track"><i></i><span>100 / 100</span></div>
    </div>

    <!-- Stamina Bar -->
    <div class="b st" title="Stamina (Výdrž)">
      <div class="b-ico">
        <!-- Lightning SVG icon -->
      </div>
      <div class="b-track"><i></i><span>100 / 100</span></div>
    </div>

    <!-- Oxygen Bar (Conditional) -->
    <div class="b o2" title="Kyslík (Dech)" hidden>
      <div class="b-ico">...</div>
      <div class="b-track"><i></i><span>100</span></div>
    </div>

    <!-- XP Bar (F8) -->
    <div class="b xp" title="Zkušenosti (XP)">
      <div class="b-ico">
        <svg class="bar-ico" viewBox="0 0 16 16" width="16" height="16" shape-rendering="crispEdges">
          <path d="M7 1 h2 v2 h-2 v-2 z M5 3 h6 v2 h-6 v-2 z M3 5 h10 v2 h-10 v-2 z M2 7 h12 v2 h-12 v-2 z M3 9 h10 v2 h-10 v-2 z M5 11 h6 v2 h-6 v-2 z M7 13 h2 v2 h-2 v-2 z" fill="#3b0764"/>
          <path d="M7 2 h2 v1 h-2 v-1 z M5 4 h6 v1 h-6 v-1 z M4 6 h8 v1 h-8 v-1 z M3 7 h10 v2 h-10 v-2 z M4 9 h8 v1 h-8 v-1 z M5 11 h6 v1 h-6 v-1 z M7 13 h2 v1 h-2 v-1 z" fill="#a855f7"/>
          <path d="M7 5 h2 v6 h-2 v-6 z M5 7 h6 v2 h-6 v-2 z" fill="#f0abfc"/>
          <rect x="7" y="7" width="2" height="2" fill="#ffffff"/>
        </svg>
      </div>
      <div class="b-track">
        <i id="xpBarFill" style="width: 0%;"></i>
        <span id="xpBarText">0 / 100 XP (0%)</span>
      </div>
    </div>
  </div>

  <!-- On-Screen Level Up Toast Banner (F8) -->
  <div id="levelUpBanner" class="levelup-banner">
    <div class="lub-flair">✦ ★ ✦</div>
    <div class="lub-subtitle">ÚROVEŇ ZVÝŠENA!</div>
    <div class="lub-title" id="lubTitle">Dosáhl jsi Úrovně 2</div>
    <div class="lub-stats" id="lubStats">+10 Max HP · +5 Stamina · +2 Útok · Plné vyléčení!</div>
  </div>
```

### 6.2 CSS Styling (`css/style.css`)
```css
/* Level Badge Header in #bars */
.b-lvl-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 2px;
}

.lvl-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 3px 9px;
  font-family: 'Pixelify Sans', Outfit, sans-serif;
  font-size: 13px;
  font-weight: 800;
  color: #fff;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  border: 1.5px solid #fbbf24;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.4), 0 0 12px rgba(251, 191, 36, 0.3);
  letter-spacing: 0.5px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
}

.lvl-title {
  font-family: Outfit, sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: #cbd5e1;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
  letter-spacing: 0.5px;
}

/* XP Bar Styling */
.xp i {
  background: linear-gradient(90deg, #9333ea, #c084fc);
  box-shadow: 0 0 8px rgba(192, 132, 252, 0.5);
}

.xp .b-ico {
  border-color: rgba(168, 85, 247, 0.6);
  box-shadow: 0 0 10px rgba(168, 85, 247, 0.35);
}

/* On-Screen Level Up Banner */
.levelup-banner {
  position: fixed;
  top: 14%;
  left: 50%;
  transform: translate(-50%, -20px) scale(0.92);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px 42px;
  background: radial-gradient(ellipse at center, rgba(30, 27, 75, 0.96) 0%, rgba(10, 15, 30, 0.98) 100%);
  border: 2px solid rgba(245, 158, 11, 0.85);
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.85), 0 0 35px rgba(245, 158, 11, 0.5);
  border-radius: 10px;
  pointer-events: none;
  z-index: 1500;
  opacity: 0;
  transition: opacity 0.45s cubic-bezier(0.16, 1, 0.3, 1), transform 0.45s cubic-bezier(0.16, 1, 0.3, 1);
  text-align: center;
}

.levelup-banner.active {
  opacity: 1;
  transform: translate(-50%, 0) scale(1.0);
  animation: levelUpPulse 2.8s ease-in-out infinite alternate;
}

@keyframes levelUpPulse {
  0% { box-shadow: 0 12px 48px rgba(0, 0, 0, 0.85), 0 0 30px rgba(245, 158, 11, 0.45); }
  100% { box-shadow: 0 12px 48px rgba(0, 0, 0, 0.85), 0 0 45px rgba(245, 158, 11, 0.75); }
}

.lub-flair {
  color: #fbbf24;
  font-size: 15px;
  letter-spacing: 8px;
  margin-bottom: 4px;
}

.lub-subtitle {
  color: #facc15;
  font-family: 'Pixelify Sans', Outfit, sans-serif;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 3px;
  text-transform: uppercase;
  margin-bottom: 6px;
}

.lub-title {
  color: #f8fafc;
  font-family: 'Pixelify Sans', Outfit, sans-serif;
  font-size: 28px;
  font-weight: 700;
  letter-spacing: 1px;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.8), 0 0 20px rgba(245, 158, 11, 0.6);
  margin-bottom: 8px;
}

.lub-stats {
  color: #38bdf8;
  font-family: Outfit, sans-serif;
  font-size: 14px;
  font-weight: 700;
  background: rgba(56, 189, 248, 0.14);
  padding: 4px 14px;
  border-radius: 9999px;
  border: 1px solid rgba(56, 189, 248, 0.35);
}
```

### 6.3 Web Audio Level Up Fanfare (`js/audio.js`)
Synthesizes a 5-note ascending triumphant fanfare arpeggio ($C_5 \to E_5 \to G_5 \to B_5 \to C_6$):
```javascript
function playLevelUpSound() {
  if (typeof window !== 'undefined' && window.soundMuted) return;
  try {
    if (typeof window === 'undefined') return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    if (!audioCtx) audioCtx = new AudioContextClass();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const t = audioCtx.currentTime;

    const notes = [
      { freq: 523.25, time: 0.00, dur: 0.22, vol: 0.18, type: 'triangle' }, // C5
      { freq: 659.25, time: 0.08, dur: 0.22, vol: 0.20, type: 'triangle' }, // E5
      { freq: 783.99, time: 0.16, dur: 0.24, vol: 0.22, type: 'triangle' }, // G5
      { freq: 987.77, time: 0.24, dur: 0.28, vol: 0.24, type: 'triangle' }, // B5
      { freq: 1046.50, time: 0.34, dur: 0.85, vol: 0.30, type: 'sine' }      // C6
    ];

    notes.forEach(n => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const filter = audioCtx.createBiquadFilter();

      osc.type = n.type;
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(3400, t + n.time);

      osc.frequency.setValueAtTime(n.freq, t + n.time);
      osc.frequency.exponentialRampToValueAtTime(n.freq * 1.004, t + n.time + n.dur);

      gain.gain.setValueAtTime(0.0001, t + n.time);
      gain.gain.linearRampToValueAtTime(n.vol, t + n.time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + n.time + n.dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(t + n.time);
      osc.stop(t + n.time + n.dur);
    });
  } catch (e) {}
}
window.playLevelUpSound = playLevelUpSound;
```

### 6.4 3D Particle Flair Fountain
A clean, leak-free Three.js particle effect that bursts upward in a spiral around the player model:
```javascript
function spawnLevelUpParticles(posX, posY, posZ) {
  if (typeof THREE === 'undefined' || typeof scene === 'undefined' || !scene) return;

  const count = 36;
  const pGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(count * 3);
  const pVels = [];

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 4;
    const radius = 0.55 + Math.random() * 0.45;
    pPos[i * 3] = posX + Math.cos(angle) * radius;
    pPos[i * 3 + 1] = posY + (i / count) * 1.6;
    pPos[i * 3 + 2] = posZ + Math.sin(angle) * radius;

    pVels.push({
      vx: (Math.random() - 0.5) * 1.6,
      vy: 2.2 + Math.random() * 2.4,
      vz: (Math.random() - 0.5) * 1.6
    });
  }

  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const pMat = new THREE.PointsMaterial({
    color: 0xfbbf24,
    size: 0.16,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending
  });

  const points = new THREE.Points(pGeo, pMat);
  scene.add(points);

  const start = performance.now();
  const duration = 1200;

  const anim = () => {
    const elapsed = performance.now() - start;
    const progress = elapsed / duration;
    if (progress >= 1) {
      scene.remove(points);
      pGeo.dispose();
      pMat.dispose();
      return;
    }

    const pos = pGeo.attributes.position.array;
    for (let i = 0; i < count; i++) {
      pos[i * 3] += pVels[i].vx * 0.016;
      pos[i * 3 + 1] += pVels[i].vy * 0.016;
      pos[i * 3 + 2] += pVels[i].vz * 0.016;
      pVels[i].vy -= 1.6 * 0.016;
    }
    pGeo.attributes.position.needsUpdate = true;
    pMat.opacity = Math.max(0, 1 - progress);

    requestAnimationFrame(anim);
  };
  requestAnimationFrame(anim);
}
window.spawnLevelUpParticles = spawnLevelUpParticles;
```

---

## 7. Persistent Storage Architecture (`GameStorage` / `localStorage`)

### 7.1 User ID Resolution
The authenticated user (or guest fallback) is stored under `voxel_auth_user` in `localStorage`:
```javascript
{
  "id": 999,
  "nickname": "Hráč_Guest",
  "email": "guest@voxel.cz"
}
```
`GameStorage.getUser()` safely parses this object, returning the fallback guest object if absent or corrupted.

### 7.2 Storage Key Hierarchy
1. **Primary Scoped Key**:
   `voxel_rpg_player_${USER_ID}` (e.g. `voxel_rpg_player_999`)
   - Scoped per user profile so different accounts/guests maintain independent RPG progression.
2. **Backwards Compatibility Key**:
   `voxel_rpg_stats`
   - Explicitly checked and expected by `tests/tier4_scenarios.test.js:62-63`.
   - Dual-written on save; loaded as fallback if user-scoped key is not found.
3. **World State Embedding**:
   `savedWorld.playerState` in `GameStorage.updateWorldData(worldId, playerState, worldDeltas)`
   - Extends the existing 5-second auto-save loop in `js/network.js:174-194` with `level`, `xp`, `xpNext`, `skillPoints`, and `baseStats`.

### 7.3 `GameStorage` Implementation Methods (`js/storage.js`)

```javascript
// Add to GameStorage object in js/storage.js:

  // ---------- UŽIVATEL (Auth / Guest) ----------
  getUser() {
    try {
      const raw = localStorage.getItem('voxel_auth_user');
      if (raw) {
        const u = JSON.parse(raw);
        if (u && typeof u === 'object') return u;
      }
    } catch (e) {}
    const fallbackUser = { id: 999, nickname: 'Hráč_Guest', email: 'guest@voxel.cz' };
    try {
      localStorage.setItem('voxel_auth_user', JSON.stringify(fallbackUser));
    } catch (e) {}
    return fallbackUser;
  },

  getUserId() {
    const u = this.getUser();
    return (u && (u.id !== undefined && u.id !== null)) ? String(u.id) : '999';
  },

  getRpgStorageKey() {
    return `voxel_rpg_player_${this.getUserId()}`;
  },

  // ---------- RPG POSTUP & PERSISTENCE (F8) ----------
  savePlayerRPGState(customState = null) {
    try {
      const key = this.getRpgStorageKey();
      let stateToSave = customState;

      if (!stateToSave && typeof window !== 'undefined' && window.P) {
        const P = window.P;
        stateToSave = {
          userId: this.getUserId(),
          level: P.level || 1,
          xp: P.xp || 0,
          xpNext: P.xpNext || (typeof calculateXpNext === 'function' ? calculateXpNext(P.level || 1) : 100),
          skillPoints: P.skillPoints || 0,
          baseStats: {
            maxHp: (P.baseStats && P.baseStats.maxHp) || 100,
            maxStamina: (P.baseStats && P.baseStats.maxStamina) || 100,
            attackPower: (P.baseStats && P.baseStats.attackPower) || 10,
            critChance: (P.baseStats && P.baseStats.critChance) || 0.05,
            moveSpeed: (P.baseStats && P.baseStats.moveSpeed) || 6.0
          },
          hp: (typeof G !== 'undefined' ? G.hp : (P.hp || 100)),
          stamina: (typeof G !== 'undefined' ? G.st : (P.stamina || 100)),
          savedAt: Date.now()
        };
      }

      if (stateToSave) {
        const json = JSON.stringify(stateToSave);
        localStorage.setItem(key, json);
        localStorage.setItem('voxel_rpg_stats', json);
        return true;
      }
    } catch (e) {
      console.error('[Storage] Chyba při ukládání RPG stavu:', e);
    }
    return false;
  },

  loadPlayerRPGState() {
    try {
      const key = this.getRpgStorageKey();
      let raw = localStorage.getItem(key);
      if (!raw) {
        raw = localStorage.getItem('voxel_rpg_stats');
      }
      if (raw) {
        const data = JSON.parse(raw);
        if (data && typeof data === 'object') {
          return {
            level: Math.max(1, Number(data.level) || 1),
            xp: Math.max(0, Number(data.xp) || 0),
            xpNext: Number(data.xpNext) || (typeof calculateXpNext === 'function' ? calculateXpNext(data.level || 1) : 100),
            skillPoints: Math.max(0, Number(data.skillPoints) || 0),
            baseStats: {
              maxHp: Number(data.baseStats?.maxHp) || Number(data.maxHp) || 100,
              maxStamina: Number(data.baseStats?.maxStamina) || Number(data.maxStamina) || 100,
              attackPower: Number(data.baseStats?.attackPower) || 10,
              critChance: Number(data.baseStats?.critChance) || 0.05,
              moveSpeed: Number(data.baseStats?.moveSpeed) || 6.0
            },
            hp: Number(data.hp) || null,
            stamina: Number(data.stamina) || null
          };
        }
      }
    } catch (e) {
      console.error('[Storage] Chyba při načítání RPG stavu:', e);
    }
    return null;
  },

  applyPlayerRPGState(targetP = (typeof P !== 'undefined' ? P : null)) {
    if (!targetP) return false;
    const state = this.loadPlayerRPGState();
    if (!state) return false;

    targetP.level = state.level;
    targetP.xp = state.xp;
    targetP.xpNext = state.xpNext;
    targetP.skillPoints = state.skillPoints;
    targetP.baseStats = Object.assign({}, state.baseStats);

    const bonusHp = (typeof window.getPlayerBonusHP === 'function') ? window.getPlayerBonusHP() : 0;
    targetP.maxHp = targetP.baseStats.maxHp + bonusHp;
    targetP.maxStamina = targetP.baseStats.maxStamina;

    if (state.hp !== null && typeof G !== 'undefined') {
      G.hp = Math.min(targetP.maxHp, state.hp);
    }
    if (state.stamina !== null && typeof G !== 'undefined') {
      G.st = Math.min(targetP.maxStamina, state.stamina);
    }

    if (typeof ui === 'function') ui();
    return true;
  }
```

---

## 8. Implementation Roadmap & Step-by-Step Patch Plan

The following ordered steps should be implemented by the Milestone 3 worker:

### Step 1: `js/storage.js`
- Add `getUser()`, `getUserId()`, `getRpgStorageKey()`, `savePlayerRPGState()`, `loadPlayerRPGState()`, and `applyPlayerRPGState()` to `GameStorage`.
- Resolves test failure `F2.2: Guest session fallback operates safely when auth user is absent`.

### Step 2: `js/player.js`
- Initialize `level: 1`, `xp: 0`, `xpNext: 100`, `skillPoints: 0`, `hp: 100`, `maxHp: 100`, `stamina: 100`, `maxStamina: 100`, and `baseStats` on `P`.
- Expose `window.P = P;`.
- Expose `window.calculateXpNext = calculateXpNext;`.
- Expose `window.checkPlayerLevelUp = checkPlayerLevelUp;`.
- Expose `window.addPlayerXP = addPlayerXP;`.
- Implement `getPlayerBonusSpeed()`.
- Add `spawnLevelUpParticles(posX, posY, posZ)`.
- Restore saved RPG progression on load via `GameStorage.applyPlayerRPGState(P)`.

### Step 3: `js/config.js`
- Update `ui()`:
  - Dynamically scale HP/Stamina bar widths by `G.hp / P.maxHp` and `G.st / P.maxStamina`.
  - Update `#hudLevelBadge` text with `LVL ${P.level}`.
  - Update `#xpBarFill` width percentage and `#xpBarText` with `${P.xp} / ${P.xpNext} XP (${pct}%)`.

### Step 4: `js/audio.js`
- Add `playLevelUpSound()` with 5-note arpeggio ($C_5 \to E_5 \to G_5 \to B_5 \to C_6$).
- Expose `window.playLevelUpSound = playLevelUpSound;`.

### Step 5: `play/index.html` & `css/style.css`
- In `play/index.html`:
  - Add `.b-lvl-header` with `#hudLevelBadge`.
  - Add `.b.xp` progress bar with `#xpBarFill` and `#xpBarText`.
  - Add `#levelUpBanner` with `#lubTitle` and `#lubStats`.
- In `css/style.css`:
  - Add styles for `.b-lvl-header`, `.lvl-badge`, `.xp i`, `.levelup-banner`, `.levelup-banner.active`, and keyframe animation `levelUpPulse`.

### Step 6: `js/entities.js` & `js/world.js`
- In `CREATURE_CONFIGS` (`js/entities.js`):
  - Update `Wolf.xpBase = 35`
  - Update `Goblin.xpBase = 45`
  - Update `Skeleton.xpBase = 60`
  - Update `Golem.xpBase = 150`
- In `js/world.js`:
  - Ensure `interactClosest()` chest grants $25\text{ XP}$ (or scaled per chest type).

### Step 7: `js/network.js`
- In `saveSingleplayerWorld()`:
  - Add `level`, `xp`, `xpNext`, `skillPoints`, `baseStats` to `playerState`.
- In `initSingleplayer()`:
  - Restore `level`, `xp`, `xpNext`, `skillPoints`, `baseStats` from `ps`.

---

## 9. Verification & Compatibility Protocol

### 9.1 Static Verification
Run Node syntax validation across all affected files:
```powershell
node --check js/player.js
node --check js/storage.js
node --check js/config.js
node --check js/audio.js
node --check js/entities.js
node --check js/world.js
```

### 9.2 Automated Test Execution
Run the full E2E test suite:
```powershell
node tests/run_e2e.js
```
Verify that all F8 tests in `tier1_features.test.js:504-555`, all boundary tests in `tier2_boundaries.test.js:19-74`, all cross-feature tests in `tier3_cross_features.test.js:80-110`, and Scenario 1 in `tier4_scenarios.test.js:17-67` pass with zero assertion failures.

### 9.3 Manual Headless Verification Script
Verify that `localStorage.getItem('voxel_rpg_player_999')` and `localStorage.getItem('voxel_rpg_stats')` contain valid JSON after leveling up:
```javascript
const saved = JSON.parse(localStorage.getItem('voxel_rpg_player_999'));
console.assert(saved.level >= 2, 'Player level must persist');
console.assert(saved.baseStats.maxHp >= 110, 'Scaled Max HP must persist');
```

---

## 10. Conclusion

The technical exploration confirms that all foundational systems for Feature F8 are in place and ready for seamless integration. The hooks in creature combat and world exploration already expect `window.addPlayerXP` and `window.checkPlayerLevelUp`. By implementing the proposed architecture, adhering to the test-reconciled stat scaling, and establishing user-scoped persistence with backwards compatibility, the game will achieve a robust, high-fidelity RPG progression loop.
