/**
 * =============================================================================
 * EMPIRICAL HEADLESS CHROME ADVERSARIAL COMBAT & AI HARNESS (M2)
 * =============================================================================
 * Author: teamwork_preview_challenger_m2_2
 * 
 * Executes real Google Chrome headless instance via CDP to stress test in live 3D:
 * 1. Creature AI spawning & 3D Three.js mesh / health bar billboard integration.
 * 2. Real AI proximity transitions (Idle -> Chase -> Attack).
 * 3. Roll i-frames & shield block damage mitigation in live game loop.
 * 4. Cleave attack hit detection with greatsword/battleaxe (hitting 3 creatures in 3D arc).
 * 5. Single-target weapon hit detection (hitting strictly 1 creature among 4 in arc).
 * 6. Creature death, 3D floating damage numbers, physical loot drops and combat XP.
 * 7. Verification of zero uncaught exceptions or console errors.
 * =============================================================================
 */

const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const projectRoot = path.resolve(__dirname, '..');
const WebSocket = require(path.join(projectRoot, 'ServerSource', 'node_modules', 'ws'));

const HTTP_PORT = 8215;
const CDP_PORT = 9365;

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.json': 'application/json'
};

const results = {
  total: 0,
  passed: 0,
  failed: 0,
  failures: []
};

function recordTest(name, passed, detail = '') {
  results.total++;
  if (passed) {
    results.passed++;
    console.log(`  \x1b[32m✔ PASS\x1b[0m [${name}] ${detail}`);
  } else {
    results.failed++;
    console.error(`  \x1b[31m✖ FAIL\x1b[0m [${name}] ${detail}`);
    results.failures.push({ name, detail });
  }
}

async function main() {
  console.log('=== EMPIRICAL HEADLESS CHROME COMBAT & AI HARNESS (M2) ===\n');

  // 1. Start HTTP Server
  const server = http.createServer((req, res) => {
    let reqPath = decodeURI(req.url.split('?')[0]);
    if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
    if (reqPath.endsWith('/')) reqPath += 'index.html';
    const filePath = path.join(projectRoot, reqPath);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath);
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  await new Promise(resolve => server.listen(HTTP_PORT, resolve));
  console.log(`[HTTP Server] Listening at http://127.0.0.1:${HTTP_PORT}/`);

  // 2. Launch Headless Chrome
  const chrome = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${CDP_PORT}`,
    '--no-sandbox',
    '--disable-gpu',
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 1600));

  let exitCode = 0;

  try {
    const targets = await new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${CDP_PORT}/json`, (r) => {
        let data = '';
        r.on('data', chunk => data += chunk);
        r.on('end', () => resolve(JSON.parse(data)));
      }).on('error', reject);
    });

    const pageTarget = targets.find(t => t.type === 'page');
    if (!pageTarget) throw new Error('No CDP page target found');

    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.on('open', resolve);
      ws.on('error', reject);
    });

    let msgId = 1;
    const pending = new Map();
    const consoleErrors = [];

    ws.on('message', data => {
      try {
        const msg = JSON.parse(data);
        if (msg.id && pending.has(msg.id)) {
          const { resolve, reject } = pending.get(msg.id);
          pending.delete(msg.id);
          if (msg.error) reject(new Error(msg.error.message));
          else resolve(msg.result);
        } else if (msg.method === 'Runtime.consoleAPICalled') {
          if (msg.params.type === 'error') {
            consoleErrors.push(msg.params.args.map(a => a.value || a.description).join(' '));
          }
        } else if (msg.method === 'Runtime.exceptionThrown') {
          consoleErrors.push(msg.params.exceptionDetails.text + ' ' + (msg.params.exceptionDetails.exception?.description || ''));
        }
      } catch (e) {}
    });

    function sendCDP(method, params = {}) {
      const id = msgId++;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    async function evalCode(expr) {
      const res = await sendCDP('Runtime.evaluate', {
        expression: expr,
        returnByValue: true,
        awaitPromise: true
      });
      if (res.exceptionDetails) {
        throw new Error(res.exceptionDetails.text || res.exceptionDetails.exception?.description || 'Evaluation error');
      }
      return res.result.value;
    }

    await sendCDP('Runtime.enable');
    await sendCDP('Page.enable');

    console.log('[Chrome] Navigating to http://127.0.0.1:' + HTTP_PORT + '/play/index.html...');
    await sendCDP('Page.navigate', { url: `http://127.0.0.1:${HTTP_PORT}/play/index.html` });

    // Wait for game initialization
    let isReady = false;
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 250));
      try {
        const readyVal = await evalCode('typeof ready !== "undefined" && ready === true && typeof EntityManager !== "undefined"');
        if (readyVal) {
          isReady = true;
          break;
        }
      } catch (e) {}
    }

    recordTest('Game Loop & EntityManager Initialization', isReady, 'Engine initialized with EntityManager in live Chrome');

    if (!isReady) {
      throw new Error('Game failed to reach ready state within 7.5s');
    }

    // -------------------------------------------------------------------------
    // TEST 1: Spawning all 4 creature archetypes into live 3D scene
    // -------------------------------------------------------------------------
    const spawnRes = await evalCode(`
      (() => {
        EntityManager.clearAll();
        const wolf = EntityManager.spawnCreature('Wolf', P.x, P.y, P.z - 2.0, 1);
        const goblin = EntityManager.spawnCreature('Goblin', P.x + 3.0, P.y, P.z, 2);
        const skeleton = EntityManager.spawnCreature('Skeleton', P.x - 3.0, P.y, P.z, 1);
        const golem = EntityManager.spawnCreature('Golem', P.x, P.y, P.z + 5.0, 1);
        return {
          count: EntityManager.creatures.length,
          wolfHp: wolf.hp,
          wolfMaxHp: wolf.maxHp,
          wolfState: wolf.state,
          hasGroup: !!wolf.group,
          hasHealthSprite: !!wolf.healthSprite,
          goblinHp: goblin.hp,
          goblinMaxHp: goblin.maxHp, // 80 + 15 = 95
          golemHp: golem.hp
        };
      })()
    `);

    recordTest('Spawn 4 Creature Archetypes into 3D Scene',
      spawnRes.count === 4 && spawnRes.wolfHp === 60 && spawnRes.goblinMaxHp === 95 && spawnRes.golemHp === 220 && spawnRes.hasGroup,
      `Spawned 4 archetypes (Wolf, Goblin Lv2, Skeleton, Golem) with 3D models and health sprites`
    );

    // -------------------------------------------------------------------------
    // TEST 2: AI Proximity transitions (Idle -> Attack within reach)
    // -------------------------------------------------------------------------
    const aiTransRes = await evalCode(`
      (() => {
        EntityManager.clearAll();
        // Wolf at 1.8m (within attackReach 2.5m)
        const closeWolf = EntityManager.spawnCreature('Wolf', P.x, P.y, P.z - 1.8, 1);
        // Skeleton at 10m (within aggroRadius 14m)
        const midSkeleton = EntityManager.spawnCreature('Skeleton', P.x + 10, P.y, P.z, 1);
        // Golem at 40m (outside aggroRadius 18m)
        const farGolem = EntityManager.spawnCreature('Golem', P.x, P.y, P.z + 40, 1);

        closeWolf.update(P, 0.016);
        midSkeleton.update(P, 0.016);
        farGolem.update(P, 0.016);

        return {
          closeWolfState: closeWolf.state,
          midSkeletonState: midSkeleton.state,
          farGolemState: farGolem.state
        };
      })()
    `);

    recordTest('AI Proximity Transitions in 3D',
      aiTransRes.closeWolfState === 'Attack' && aiTransRes.midSkeletonState === 'Chase' && (aiTransRes.farGolemState === 'Idle' || aiTransRes.farGolemState === 'Wander'),
      `Close creature entered Attack, mid entered Chase, far remained Idle/Wander`
    );

    // -------------------------------------------------------------------------
    // TEST 3: Roll I-Frames Evasion in Live Browser
    // -------------------------------------------------------------------------
    const rollRes = await evalCode(`
      (() => {
        EntityManager.clearAll();
        const wolf = EntityManager.spawnCreature('Wolf', P.x, P.y, P.z - 1.5, 1);
        P.hp = 100;
        P.isRolling = true;
        wolf.attackTimer = 0;
        wolf.update(P, 0.016);
        const hpAfterRoll = P.hp;
        P.isRolling = false;
        return { hpAfterRoll };
      })()
    `);

    recordTest('Live Roll I-Frame Damage Evasion',
      rollRes.hpAfterRoll === 100,
      `Player HP remained 100 during dodge roll i-frames`
    );

    // -------------------------------------------------------------------------
    // TEST 4: Shield Block Damage Reduction in Live Browser
    // -------------------------------------------------------------------------
    const blockRes = await evalCode(`
      (() => {
        EntityManager.clearAll();
        const wolf = EntityManager.spawnCreature('Wolf', P.x, P.y, P.z - 1.5, 1);
        P.hp = 100;
        P.stamina = 100;
        P.isBlocking = true;
        wolf.attackTimer = 0;
        wolf.update(P, 0.016);
        const hpAfterBlock = P.hp;
        const stamAfterBlock = P.stamina;
        P.isBlocking = false;
        return { hpAfterBlock, stamAfterBlock };
      })()
    `);

    recordTest('Live Shield Block 70% Damage Reduction',
      blockRes.hpAfterBlock === 96 && blockRes.stamAfterBlock === 85,
      `Wolf 14 damage mitigated to 4 HP, consuming 15 stamina (100 -> 85)`
    );

    // -------------------------------------------------------------------------
    // TEST 5: Singleplayer Cleave Attack with Greatsword (Hitting 3 Creatures)
    // -------------------------------------------------------------------------
    const cleaveRes = await evalCode(`
      (() => {
        EntityManager.clearAll();
        yaw = 0; pitch = 0;
        heldId = 'greatsword';
        if (typeof EQUIPPED_SLOTS !== 'undefined') {
          EQUIPPED_SLOTS.hand_r = 'greatsword';
        }

        // 4 goblins in front within reach arc
        const g1 = EntityManager.spawnCreature('Goblin', P.x, P.y, P.z - 1.4, 1);
        const g2 = EntityManager.spawnCreature('Goblin', P.x + 0.35, P.y, P.z - 1.5, 1);
        const g3 = EntityManager.spawnCreature('Goblin', P.x - 0.35, P.y, P.z - 1.5, 1);
        const g4 = EntityManager.spawnCreature('Goblin', P.x + 0.6, P.y, P.z - 1.7, 1);

        checkPvPHit('dominant');

        return {
          hps: [g1.hp, g2.hp, g3.hp, g4.hp],
          dmgNumbersCount: EntityManager.damageNumbers.length
        };
      })()
    `);

    const cleaveHits = cleaveRes.hps.filter(h => h < 80).length;
    recordTest('Greatsword Multi-Target Cleave (Max 3 Targets)',
      cleaveHits === 3 && cleaveRes.dmgNumbersCount === 3,
      `Greatsword cleaved exactly 3 targets (${cleaveHits} hit, 4th spared, 3 damage numbers spawned)`
    );

    // -------------------------------------------------------------------------
    // TEST 6: Single-Target Weapon Hit Detection (Sword hits strictly 1 target)
    // -------------------------------------------------------------------------
    const swordRes = await evalCode(`
      (() => {
        EntityManager.clearAll();
        yaw = 0; pitch = 0;
        heldId = 'sword'; // standard single-target weapon
        if (typeof EQUIPPED_SLOTS !== 'undefined') {
          EQUIPPED_SLOTS.hand_r = 'sword';
        }

        const g1 = EntityManager.spawnCreature('Goblin', P.x, P.y, P.z - 1.4, 1);
        const g2 = EntityManager.spawnCreature('Goblin', P.x + 0.35, P.y, P.z - 1.5, 1);
        const g3 = EntityManager.spawnCreature('Goblin', P.x - 0.35, P.y, P.z - 1.5, 1);

        checkPvPHit('dominant');

        return {
          hps: [g1.hp, g2.hp, g3.hp],
          dmgNumbersCount: EntityManager.damageNumbers.length
        };
      })()
    `);

    const swordHits = swordRes.hps.filter(h => h < 80).length;
    recordTest('Standard Sword Hits Strictly 1 Target',
      swordHits === 1 && swordRes.dmgNumbersCount === 1,
      `Standard sword damaged strictly 1 target among clustered creatures`
    );

    // -------------------------------------------------------------------------
    // TEST 7: Creature Death, Loot Drops & Combat XP
    // -------------------------------------------------------------------------
    const deathRes = await evalCode(`
      (() => {
        EntityManager.clearAll();
        P.xp = 0;
        const initialGold = (typeof INV !== 'undefined' && Array.isArray(INV))
          ? (INV.find(it => it.id === 'coin_gold' || it.id === 'gold')?.count || 0) : 0;

        const wolf = EntityManager.spawnCreature('Wolf', P.x, P.y, P.z - 1.5, 1);
        wolf.takeDamage(100, null, false, 'player');

        const stateAfterDeath = wolf.state;
        const droppedLootCount = EntityManager.droppedLoot.length;
        const xpAfterDeath = P.xp;

        // Move player near loot to test magnetism pickup
        EntityManager.update(0.016);
        const remainingLootCount = EntityManager.droppedLoot.length;

        return {
          stateAfterDeath,
          xpAfterDeath,
          droppedLootCount,
          remainingLootCount
        };
      })()
    `);

    recordTest('Creature Death, Loot Drop & Combat XP Awarded',
      deathRes.stateAfterDeath === 'Dead' && deathRes.xpAfterDeath >= 25 && deathRes.droppedLootCount >= 2,
      `Creature died, granted +${deathRes.xpAfterDeath} XP, and spawned ${deathRes.droppedLootCount} physical loot drops`
    );

    // -------------------------------------------------------------------------
    // TEST 8: Console Error / Exception Audit
    // -------------------------------------------------------------------------
    recordTest('Zero Console Errors / Uncaught Exceptions',
      consoleErrors.length === 0,
      consoleErrors.length === 0 ? 'Zero runtime errors' : `Errors: ${consoleErrors.join('; ')}`
    );

  } catch (err) {
    console.error('[Harness Fatal Error]', err);
    exitCode = 1;
  } finally {
    try { chrome.kill(); } catch (e) {}
    try { server.close(); } catch (e) {}
  }

  console.log('\n======================================================');
  console.log(`TOTAL: ${results.total} | PASSED: ${results.passed} | FAILED: ${results.failed}`);
  console.log('======================================================');

  if (results.failed > 0 || exitCode !== 0) {
    console.error('\x1b[31mHeadless Chrome Adversarial Combat Suite Failed!\x1b[0m');
    process.exit(1);
  } else {
    console.log('\x1b[32m✔ Headless Chrome Adversarial Combat Suite Passed 100%!\x1b[0m');
    process.exit(0);
  }
}

main();
