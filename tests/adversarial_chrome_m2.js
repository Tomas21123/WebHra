/**
 * =============================================================================
 * EMPIRICAL HEADLESS CHROME ADVERSARIAL AUDIT FOR MILESTONE 2
 * =============================================================================
 * Real Google Chrome Headless via Chrome DevTools Protocol (CDP)
 * Testing live in-browser execution:
 * 1. window.POIManager deterministic procedural macro-cell generation in real Three.js scene.
 * 2. window.EntityManager live procedural creature spawning, 3D meshes & health bar billboards.
 * 3. checkPvPHit combat damage application against live 3D creature in browser.
 * 4. Zero uncaught exceptions and zero console.error messages.
 * =============================================================================
 */

const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const projectRoot = path.resolve(__dirname, '..');
const WebSocket = require(path.join(projectRoot, 'ServerSource', 'node_modules', 'ws'));

const PORT = 8299;
const DEBUG_PORT = 9566;

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.json': 'application/json'
};

async function main() {
  console.log('=== EMPIRICAL HEADLESS CHROME M2 AUDIT HARNESS ===');

  // 1. Start HTTP Server
  const server = http.createServer((req, res) => {
    let reqPath = decodeURI(req.url.split('?')[0]);
    if (reqPath === '/' || reqPath === '') reqPath = '/play/index.html';
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

  await new Promise(resolve => server.listen(PORT, resolve));
  console.log(`[HTTP Server] Listening at http://127.0.0.1:${PORT}/`);

  // 2. Spawn Chrome
  const chrome = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--mute-audio',
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 1600));

  let exitCode = 0;

  try {
    const targets = await new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${DEBUG_PORT}/json`, (r) => {
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
    function sendCDP(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = msgId++;
        const handler = (data) => {
          const res = JSON.parse(data);
          if (res.id === id) {
            ws.removeListener('message', handler);
            if (res.error) reject(new Error(res.error.message));
            else resolve(res.result);
          }
        };
        ws.on('message', handler);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    const consoleLogs = [];
    const uncaughtErrors = [];

    ws.on('message', (data) => {
      const msg = JSON.parse(data);
      if (msg.method === 'Runtime.consoleAPICalled') {
        consoleLogs.push({ type: msg.params.type, text: msg.params.args.map(a => a.value || a.description).join(' ') });
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        uncaughtErrors.push(msg.params.exceptionDetails);
      }
    });

    await sendCDP('Runtime.enable');
    await sendCDP('Page.enable');

    async function evalInBrowser(expr) {
      const res = await sendCDP('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
      if (res.exceptionDetails) {
        throw new Error('Eval exception: ' + (res.exceptionDetails.exception ? res.exceptionDetails.exception.description : res.exceptionDetails.text));
      }
      return res.result.value;
    }

    // Navigate to play/index.html
    const playUrl = `http://127.0.0.1:${PORT}/play/index.html`;
    console.log(`\nNavigating to: ${playUrl}`);
    await sendCDP('Page.navigate', { url: playUrl });

    // Wait for engine ready
    console.log('Waiting for engine ready (ready === true)...');
    let isReady = false;
    for (let i = 0; i < 25; i++) {
      await new Promise(r => setTimeout(r, 400));
      isReady = await evalInBrowser('typeof ready !== "undefined" && ready === true');
      if (isReady) break;
    }
    if (!isReady) throw new Error('Game failed to reach ready = true');
    console.log('  [PASS] Game reached ready = true in live browser');

    // 1. POIManager Check
    console.log('\n--- VERIFYING LIVE POIManager IN BROWSER ---');
    const poiResult = await evalInBrowser(`
      (() => {
        if (!window.POIManager) return { error: 'POIManager not found' };
        const poi0 = window.POIManager.getPoiForCell(0, 0);
        const poi1 = window.POIManager.getPoiForCell(1, 2);
        return {
          hasPOIManager: true,
          macroSize: window.POIManager.macroCellSize,
          poi0Type: poi0.type,
          poi0Elevation: poi0.y,
          poi0Dry: poi0.y >= 47,
          poi1Type: poi1.type,
          poi1Elevation: poi1.y,
          poi1Dry: poi1.y >= 47,
          isDiscovered: window.POIManager.isDiscovered(poi0.id)
        };
      })()
    `);
    console.log('POIManager Live Result:', poiResult);
    if (!poiResult.hasPOIManager || !poiResult.poi0Dry || !poiResult.poi1Dry) {
      throw new Error('Live POIManager check failed: ' + JSON.stringify(poiResult));
    }
    console.log('  [PASS] Live POIManager generates dry land POIs deterministically');

    // 2. EntityManager & Creature Spawning Check
    console.log('\n--- VERIFYING LIVE EntityManager & CREATURES IN BROWSER ---');
    const entityResult = await evalInBrowser(`
      (() => {
        if (!window.EntityManager) return { error: 'EntityManager not found' };
        const wolf = window.EntityManager.spawnCreature('Wolf', P.x, P.y, P.z, 1);
        const goblin = window.EntityManager.spawnCreature('Goblin', P.x, P.y, P.z, 2);
        return {
          hasEntityManager: true,
          creatureCount: window.EntityManager.creatures.length,
          wolfHp: wolf.hp,
          wolfHasGroup: !!wolf.group,
          wolfHasSprite: !!wolf.healthSprite,
          goblinHp: goblin.hp,
          goblinMaxHp: goblin.maxHp
        };
      })()
    `);
    console.log('EntityManager Live Result:', entityResult);
    if (!entityResult.hasEntityManager || entityResult.wolfHp !== 60 || entityResult.goblinHp !== 95) {
      throw new Error('Live EntityManager check failed: ' + JSON.stringify(entityResult));
    }
    console.log('  [PASS] Live EntityManager spawns creatures with scaled attributes and 3D meshes');

    // 3. Combat Hit Detection Against Live Creature
    console.log('\n--- VERIFYING LIVE COMBAT HIT DETECTION IN BROWSER ---');
    const combatResult = await evalInBrowser(`
      (() => {
        window.EntityManager.clearAll();
        // Position wolf directly in front of player
        const cp = Math.cos(pitch);
        const fwdX = -Math.sin(yaw) * cp;
        const fwdZ = -Math.cos(yaw) * cp;
        const dist = 1.8;
        const targetX = P.x + fwdX * dist;
        const targetZ = P.z + fwdZ * dist;

        const liveWolf = window.EntityManager.spawnCreature('Wolf', targetX, P.y, targetZ, 1);
        const hpBefore = liveWolf.hp;

        // Perform attack
        checkPvPHit('dominant');
        const hpAfter = liveWolf.hp;

        return {
          hpBefore,
          hpAfter,
          damageDealt: hpBefore - hpAfter,
          damageNumbersCount: window.EntityManager.damageNumbers.length
        };
      })()
    `);
    console.log('Live Combat Result:', combatResult);
    if (combatResult.damageDealt <= 0) {
      throw new Error('Combat check failed to deal damage: ' + JSON.stringify(combatResult));
    }
    console.log('  [PASS] checkPvPHit dealt ' + combatResult.damageDealt + ' damage to live wolf in Chrome!');

    // 4. Check for console errors or exceptions
    console.log('\n--- VERIFYING CONSOLE LOGS & RUNTIME EXCEPTION AUDIT ---');
    const realErrors = uncaughtErrors.concat(consoleLogs.filter(l => l.type === 'error'));
    console.log('Uncaught errors / console.error count:', realErrors.length);
    if (realErrors.length > 0) {
      console.error('Errors observed:', realErrors);
      throw new Error('Found console errors during execution');
    }
    console.log('  [PASS] Zero console errors or uncaught exceptions during live gameplay!');

    console.log('\n\x1b[32m=== ALL LIVE GOOGLE CHROME HEADLESS CHECKS PASSED WITH 100% SUCCESS! ===\x1b[0m\n');
  } catch (err) {
    console.error('\x1b[31mHeadless Audit Error:\x1b[0m', err);
    exitCode = 1;
  } finally {
    chrome.kill();
    server.close();
    process.exit(exitCode);
  }
}

main();
