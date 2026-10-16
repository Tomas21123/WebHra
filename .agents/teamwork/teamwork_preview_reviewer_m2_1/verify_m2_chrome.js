const { spawn, execSync } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');
const WebSocket = require(path.resolve(__dirname, '../../../ServerSource/node_modules/ws'));

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const projectRoot = path.resolve(__dirname, '../../..');

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.json': 'application/json'
};

async function runM2ChromeVerification() {
  console.log('=== Milestone 2 Reviewer Headless Chrome Audit ===');

  // 1. Static HTTP Server
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

  const PORT = 8112;
  const DEBUG_PORT = 9255;

  await new Promise(resolve => server.listen(PORT, resolve));
  console.log(`Test server running at http://localhost:${PORT}/`);

  // 2. Launch Headless Chrome
  console.log('Launching Headless Chrome on CDP port ' + DEBUG_PORT + '...');
  const chrome = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--no-sandbox',
    '--disable-gpu',
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 1600));

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

    console.log('Connected to Chrome DevTools Protocol');

    let msgId = 1;
    function sendCDP(method, params = {}) {
      const id = msgId++;
      return new Promise((resolve) => {
        const handler = (data) => {
          const msg = JSON.parse(data);
          if (msg.id === id) {
            ws.off('message', handler);
            resolve(msg.result);
          }
        };
        ws.on('message', handler);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    const consoleLogs = [];
    const exceptions = [];

    ws.on('message', data => {
      const msg = JSON.parse(data);
      if (msg.method === 'Runtime.consoleAPICalled') {
        const text = msg.params.args.map(a => a.value || a.description || JSON.stringify(a)).join(' ');
        consoleLogs.push(`[${msg.params.type}] ${text}`);
      } else if (msg.method === 'Runtime.exceptionThrown') {
        const detail = msg.params.exceptionDetails;
        const desc = detail.exception ? (detail.exception.description || detail.exception.value) : detail.text;
        exceptions.push(`Line ${detail.lineNumber}:${detail.columnNumber} - ${desc}`);
      }
    });

    await sendCDP('Runtime.enable');
    await sendCDP('Page.enable');

    console.log('Navigating to http://localhost:' + PORT + '/play/index.html...');
    await sendCDP('Page.navigate', { url: `http://localhost:${PORT}/play/index.html` });

    // Wait for world chunks to generate and ready === true
    console.log('Waiting for game loop and chunk meshing...');
    let ready = false;
    let attempts = 0;
    while (!ready && attempts < 15) {
      await new Promise(r => setTimeout(r, 1000));
      attempts++;
      const readyEval = await sendCDP('Runtime.evaluate', {
        expression: 'typeof ready !== "undefined" ? ready : false',
        returnByValue: true
      });
      ready = readyEval.result.value === true;
      const chunksCountEval = await sendCDP('Runtime.evaluate', {
        expression: 'typeof chunks !== "undefined" ? chunks.size : 0',
        returnByValue: true
      });
      console.log(`  [Attempt ${attempts}] ready = ${ready}, chunks.size = ${chunksCountEval.result.value}`);
    }

    if (!ready) {
      throw new Error('Game did not reach ready = true within timeout');
    }

    console.log('\n--- Evaluating Milestone 2 Systems in Live Chrome ---');
    const evalResult = await sendCDP('Runtime.evaluate', {
      expression: `
        (() => {
          try {
            // 1. POIManager Verification
            const hasPOIManager = typeof window.POIManager !== 'undefined';
            const macroSize = hasPOIManager ? window.POIManager.macroCellSize : null;
            const poi00 = hasPOIManager ? window.POIManager.getPoiForCell(0, 0) : null;
            const poisCount = hasPOIManager ? window.POIManager.pois.length : 0;

            // Probe multiple cells for dry land elevation y >= 47
            let dryCells = 0;
            const types = new Set();
            if (hasPOIManager) {
              for (let cx = -2; cx <= 2; cx++) {
                for (let cz = -2; cz <= 2; cz++) {
                  const p = window.POIManager.getPoiForCell(cx, cz);
                  if (p.y >= 47) dryCells++;
                  types.add(p.type);
                }
              }
            }

            // 2. EntityManager & Live Mob Verification
            const hasEntityManager = typeof window.EntityManager !== 'undefined';
            let liveMob = null;
            if (hasEntityManager) {
              liveMob = window.EntityManager.spawnCreature('Wolf', P.x + 2, P.y, P.z, 1);
            }

            // 3. Minimap & Radar Verification
            const hasProjectToRadar = typeof window.projectToRadar === 'function';
            const radarTest = hasProjectToRadar ? window.projectToRadar(0, 0, 100, 0, 50) : null;
            const hasIsChunkRevealed = typeof window.isChunkRevealed === 'function';

            // 4. Audio & HUD Banner
            const hasDiscoveryChime = typeof window.playDiscoveryChime === 'function';
            const bannerEl = document.getElementById('discoveryBanner');
            const hasBanner = !!bannerEl;

            // Trigger discovery on distant undiscovered cell (5, 5)
            const poi55 = window.POIManager.getPoiForCell(5, 5);
            const poi00DiscoveredInitially = window.POIManager.isDiscovered(poi00.id);
            const poi55DiscoveredInitially = window.POIManager.isDiscovered(poi55.id);

            const initialXP = P.xp || 0;
            const discovery55Triggered = window.POIManager.discoverPOI(poi55.id);
            const bannerActiveAfter = bannerEl ? bannerEl.classList.contains('active') : false;
            const postDiscoveryXP = P.xp || 0;

            return {
              ready: typeof ready !== 'undefined' ? ready : false,
              hasPOIManager,
              macroSize,
              poi00: poi00 ? { id: poi00.id, type: poi00.type, y: poi00.y, dry: poi00.y >= 47 } : null,
              poisCount,
              dryCellsChecked: dryCells,
              typesObserved: Array.from(types),
              hasEntityManager,
              liveMob: liveMob ? { id: liveMob.id, name: liveMob.name, hp: liveMob.hp, state: liveMob.state } : null,
              hasProjectToRadar,
              radarTest,
              hasIsChunkRevealed,
              hasDiscoveryChime,
              hasBanner,
              poi00DiscoveredInitially,
              poi55DiscoveredInitially,
              discovery55Triggered,
              bannerActiveAfter,
              xpDelta: postDiscoveryXP - initialXP
            };
          } catch (e) {
            return { error: e.message, stack: e.stack };
          }
        })()
      `,
      returnByValue: true
    });

    console.log('Browser Evaluation Output:\n', JSON.stringify(evalResult.result.value, null, 2));

    console.log('\n--- Console & Exception Audit ---');
    console.log('Uncaught Exceptions Count:', exceptions.length);
    exceptions.forEach(e => console.log('  ❌ Exception:', e));
    const consoleErrors = consoleLogs.filter(l => l.startsWith('[error]'));
    console.log('Console Errors Count:', consoleErrors.length);
    consoleErrors.forEach(e => console.log('  ❌ Console Error:', e));

    const data = evalResult.result.value;
    const allPassed = (
      data.ready === true &&
      data.hasPOIManager === true &&
      data.macroSize === 160 &&
      data.dryCellsChecked === 25 &&
      data.hasEntityManager === true &&
      data.liveMob && data.liveMob.hp === 60 &&
      data.hasProjectToRadar === true &&
      data.hasDiscoveryChime === true &&
      data.hasBanner === true &&
      data.discovery55Triggered === true &&
      data.bannerActiveAfter === true &&
      data.xpDelta === 50 &&
      exceptions.length === 0 &&
      consoleErrors.length === 0
    );

    console.log(`\nOverall Headless Chrome Audit: ${allPassed ? 'ALL CRITERIA PASSED ✅' : 'FAILURES DETECTED ❌'}`);

    chrome.kill();
    server.close();
    process.exit(allPassed ? 0 : 1);

  } catch (err) {
    console.error('Audit Error:', err);
    chrome.kill();
    server.close();
    process.exit(1);
  }
}

runM2ChromeVerification();
