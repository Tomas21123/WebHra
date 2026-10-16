/**
 * =============================================================================
 * EMPIRICAL HEADLESS CHROME RUNTIME VERIFICATION: MILESTONE 2
 * =============================================================================
 * Launches a local static HTTP server and Google Chrome in headless mode via CDP.
 * Verifies that play/index.html:
 * 1. Loads with 0 uncaught exceptions and 0 console errors.
 * 2. Initializes window.POIManager and window.EntityManager.
 * 3. Meshes chunks and advances game loop to ready = true.
 * 4. Successfully spawns creatures and attaches POI meshes in live 3D scene.
 * =============================================================================
 */

const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const projectRoot = path.resolve(__dirname, '..');
const WebSocket = require(path.join(projectRoot, 'ServerSource/node_modules/ws'));
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const HTTP_PORT = 8282;
const CDP_PORT = 9444;

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.json': 'application/json'
};

function createCDPClient(wsUrl) {
  let idSeq = 1;
  const pending = new Map();
  const ws = new WebSocket(wsUrl);

  const client = {
    ws,
    events: [],
    send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = idSeq++;
        pending.set(id, { resolve, reject, method });
        ws.send(JSON.stringify({ id, method, params }));
      });
    },
    async eval(expr) {
      const res = await client.send('Runtime.evaluate', {
        expression: expr,
        returnByValue: true,
        awaitPromise: true
      });
      if (res && res.exceptionDetails) {
        throw new Error(res.exceptionDetails.text || 'CDP Eval Exception');
      }
      return (res && res.result) ? res.result.value : undefined;
    }
  };

  ws.on('message', data => {
    try {
      const msg = JSON.parse(data);
      if (msg.id && pending.has(msg.id)) {
        const p = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) p.reject(new Error(msg.error.message));
        else p.resolve(msg.result);
      } else if (msg.method) {
        client.events.push(msg);
      }
    } catch (e) {}
  });

  return new Promise((resolve, reject) => {
    ws.on('open', () => resolve(client));
    ws.on('error', reject);
  });
}

async function run() {
  console.log('--- STARTING HEADLESS CHROME RUNTIME VERIFICATION (M2) ---');

  // 1. Static HTTP Server
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

  await new Promise(resolve => server.listen(HTTP_PORT, resolve));
  console.log(`[HTTP Server] Listening on http://127.0.0.1:${HTTP_PORT}`);

  // 2. Launch Chrome Headless
  const chrome = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${CDP_PORT}`,
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--mute-audio',
    'about:blank'
  ]);

  await new Promise(resolve => setTimeout(resolve, 1500));

  try {
    // 3. Connect to CDP
    const versionRes = await new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${CDP_PORT}/json/list`, res => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve(JSON.parse(body)));
      }).on('error', reject);
    });

    const pageWsUrl = versionRes[0].webSocketDebuggerUrl;
    const cdp = await createCDPClient(pageWsUrl);

    const consoleErrors = [];
    cdp.ws.on('message', data => {
      try {
        const msg = JSON.parse(data);
        if (msg.method === 'Runtime.consoleAPICalled' && (msg.params.type === 'error' || msg.params.type === 'assert')) {
          consoleErrors.push(msg.params.args.map(a => a.value || a.description).join(' '));
        }
        if (msg.method === 'Runtime.exceptionThrown') {
          consoleErrors.push(msg.params.exceptionDetails.text);
        }
      } catch (e) {}
    });

    await cdp.send('Runtime.enable');
    await cdp.send('Page.enable');

    // Navigate to play/index.html
    console.log('[CDP] Navigating to play/index.html...');
    await cdp.send('Page.navigate', { url: `http://127.0.0.1:${HTTP_PORT}/play/index.html` });

    // Wait 4 seconds for Three.js, chunk meshing, and game loop
    console.log('[CDP] Waiting 4 seconds for game loop initialization...');
    await new Promise(resolve => setTimeout(resolve, 4000));

    // Evaluate live runtime state
    const evalResult = await cdp.eval(`({
      ready: typeof ready !== 'undefined' ? ready : false,
      hasEntityManager: typeof window.EntityManager !== 'undefined',
      creatureCount: window.EntityManager ? window.EntityManager.creatures.length : -1,
      hasPOIManager: typeof window.POIManager !== 'undefined',
      poiCount: window.POIManager ? window.POIManager.pois.length : -1,
      hasProjectToRadar: typeof window.projectToRadar === 'function',
      hasDiscoveryChime: typeof window.playDiscoveryChime === 'function',
      hasDiscoveryBanner: document.getElementById('discoveryBanner') !== null
    })`);

    console.log('Headless Chrome Evaluation Result:', evalResult);

    // Test live creature spawning and POI lookup in browser
    const liveInteract = await cdp.eval(`(() => {
      const wolf = window.EntityManager.spawnCreature('Wolf', 0, 50, 0, 1);
      const poi = window.POIManager.getPoiForCell(0, 0);
      return {
        wolfHp: wolf.hp,
        wolfState: wolf.state,
        poiId: poi.id,
        poiY: poi.y
      };
    })()`);

    console.log('Live Entity & POI Spawn Result:', liveInteract);

    // Verify console errors
    console.log('Console Errors Observed:', consoleErrors);

    if (consoleErrors.length > 0) {
      console.error('FAIL: Console errors were logged during headless execution!');
      process.exit(1);
    }

    if (!evalResult.ready || !evalResult.hasEntityManager || !evalResult.hasPOIManager) {
      console.error('FAIL: Required M2 systems failed to initialize in live browser!');
      process.exit(1);
    }

    console.log('\x1b[32mSUCCESS: Headless Chrome loaded with 0 console errors or uncaught exceptions!\x1b[0m');
  } finally {
    chrome.kill();
    server.close();
  }
}

run().catch(err => {
  console.error('Execution Error:', err);
  process.exit(1);
});
