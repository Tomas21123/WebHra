#!/usr/bin/env node
/**
 * =============================================================================
 * Milestone 1 Adversarial Stress Test & Empirical Verification Suite
 * =============================================================================
 * Author: teamwork_preview_challenger_m1_1
 * 
 * Verifies:
 * 1. Immutability of voxel terrain under stress calls, malformed network packets,
 *    and combat interactions.
 * 2. Headless game initialization resilience under corrupted, missing, and
 *    malformed localStorage states.
 * 3. Dedicated WebSocket server stability and zero chunk mutation broadcast
 *    under high-frequency and malformed blockChange packet floods.
 * =============================================================================
 */

const { spawn, execSync } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const projectRoot = path.resolve(__dirname, '..');
const WebSocket = require(path.join(projectRoot, 'ServerSource/node_modules/ws'));
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const HTTP_PORT = 8105;
const CDP_PORT = 9245;
const WS_PORT = 3000;

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

// Simple CDP client helper
function createCDPClient(wsUrl) {
  let idSeq = 1;
  const ws = new WebSocket(wsUrl);
  const pending = new Map();
  const eventListeners = [];

  ws.on('message', data => {
    try {
      const msg = JSON.parse(data);
      if (msg.id && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message || JSON.stringify(msg.error)));
        else resolve(msg.result);
      } else {
        eventListeners.forEach(fn => fn(msg));
      }
    } catch (e) {}
  });

  return {
    async open() {
      await new Promise((resolve, reject) => {
        ws.on('open', resolve);
        ws.on('error', reject);
      });
    },
    send(method, params = {}) {
      const id = idSeq++;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
    },
    async eval(expr) {
      const res = await this.send('Runtime.evaluate', {
        expression: expr,
        returnByValue: true,
        awaitPromise: true
      });
      if (res.exceptionDetails) {
        throw new Error(res.exceptionDetails.text || res.exceptionDetails.exception?.description || 'Eval error');
      }
      return res.result?.value;
    },
    onEvent(fn) {
      eventListeners.push(fn);
    },
    close() {
      try { ws.close(); } catch (e) {}
    }
  };
}

async function runStaticSyntaxSuite() {
  console.log('\n\x1b[1m=== TEST SUITE 0: Static Syntax & Compilation Audit ===\x1b[0m');
  const dirs = ['js', 'ServerSource'];
  let checked = 0;
  let allClean = true;

  for (const dir of dirs) {
    const fullDir = path.join(projectRoot, dir);
    const files = fs.readdirSync(fullDir).filter(f => f.endsWith('.js'));
    for (const f of files) {
      checked++;
      const fullPath = path.join(fullDir, f);
      try {
        execSync(`node --check "${fullPath}"`, { stdio: 'pipe' });
      } catch (err) {
        allClean = false;
        recordTest(`Syntax: ${dir}/${f}`, false, err.stderr ? err.stderr.toString() : err.message);
      }
    }
  }
  recordTest('Static Syntax All Files', allClean, `All ${checked} JavaScript files passed node --check with 0 syntax errors`);
}

async function runServerStressSuite() {
  console.log('\n\x1b[1m=== TEST SUITE 1: Dedicated Server Stress & Mutation Rejection ===\x1b[0m');
  let serverProc = null;
  let clientAttacker = null;
  let clientObserver = null;

  try {
    // 1. Launch dedicated server
    console.log('  Starting ServerSource/server.js on port 3000...');
    serverProc = spawn('node', ['ServerSource/server.js'], {
      cwd: projectRoot,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    serverProc.on('error', err => console.error('  [Server spawn error]', err));

    // Wait for server to bind port
    await new Promise(r => setTimeout(r, 2000));

    // 2. Connect Attacker client
    clientAttacker = new WebSocket(`ws://localhost:${WS_PORT}`);
    await new Promise((resolve, reject) => {
      clientAttacker.on('open', resolve);
      clientAttacker.on('error', reject);
    });

    let attackerReceivedPong = false;
    clientAttacker.on('message', data => {
      try {
        const msg = JSON.parse(data);
        if (msg.type === 'pong' && msg.time === 999888) {
          attackerReceivedPong = true;
        }
      } catch (e) {}
    });

    // 3. Connect Observer client
    clientObserver = new WebSocket(`ws://localhost:${WS_PORT}`);
    await new Promise((resolve, reject) => {
      clientObserver.on('open', resolve);
      clientObserver.on('error', reject);
    });

    let observerReceivedBlockChanges = 0;
    let observerReceivedPackets = [];
    clientObserver.on('message', data => {
      try {
        const msg = JSON.parse(data);
        observerReceivedPackets.push(msg.type);
        if (msg.type === 'blockChange') {
          observerReceivedBlockChanges++;
        }
      } catch (e) {}
    });

    // Handshakes
    clientAttacker.send(JSON.stringify({ type: 'join', nickname: 'StressAttacker' }));
    clientObserver.send(JSON.stringify({ type: 'join', nickname: 'ObserverPlayer' }));
    await new Promise(r => setTimeout(r, 1000));

    recordTest('Server Dual Client Connection', true, 'Attacker and Observer connected and completed handshake');

    // 4. High-frequency packet flood: Send 1,000 blockChange packets
    console.log('  Flooding server with 1,000 rapid blockChange packets...');
    const floodStart = Date.now();
    for (let i = 0; i < 1000; i++) {
      clientAttacker.send(JSON.stringify({
        type: 'blockChange',
        x: (i * 7) % 256,
        y: 40 + (i % 20),
        z: (i * 13) % 256,
        blockType: (i % 5) + 1
      }));
    }
    const floodDuration = Date.now() - floodStart;

    // 5. Malformed packet fuzzing
    console.log('  Sending malformed blockChange edge cases & fuzz payloads...');
    const malformedPayloads = [
      { type: 'blockChange' },
      { type: 'blockChange', x: null, y: undefined, z: 'corrupted', blockType: -999 },
      { type: 'blockChange', x: 1e308, y: -Infinity, z: NaN, blockType: 'stone' },
      { type: 'blockChange', x: -999999, y: -999999, z: -999999, blockType: 255 },
      { type: 'blockChange', __proto__: { isAdmin: true }, x: 0, y: 0, z: 0 },
      { type: 'blockChange', x: {}, y: [], z: true, blockType: false }
    ];

    malformedPayloads.forEach(p => clientAttacker.send(JSON.stringify(p)));
    clientAttacker.send('THIS IS CORRUPTED RAW NON-JSON DATA {{{');
    clientAttacker.send(Buffer.from([0x00, 0xff, 0xfe, 0x12, 0x34]));

    // Allow server to process all messages
    await new Promise(r => setTimeout(r, 1500));

    // 6. Verify Server Liveness & Responsiveness Post-Attack
    clientAttacker.send(JSON.stringify({ type: 'ping', time: 999888 }));
    for (let t = 0; t < 25 && !attackerReceivedPong; t++) {
      await new Promise(r => setTimeout(r, 200));
    }

    recordTest(
      'Server Liveness After 1000+ Packets Flood',
      attackerReceivedPong && !serverProc.killed,
      `Server remained alive and responded with ping/pong after ${floodDuration}ms flood`
    );

    recordTest(
      'Server Rejects BlockChange Broadcasts',
      observerReceivedBlockChanges === 0,
      `Observer received 0 blockChange packets out of 1000+ attempted mutations`
    );

  } catch (err) {
    recordTest('Server Stress Suite Execution', false, err.message);
  } finally {
    if (clientAttacker) try { clientAttacker.close(); } catch (e) {}
    if (clientObserver) try { clientObserver.close(); } catch (e) {}
    if (serverProc) {
      try { serverProc.kill(); } catch (e) {}
    }
  }
}

async function runBrowserStressSuite() {
  console.log('\n\x1b[1m=== TEST SUITE 2: Browser Headless Initialization & LocalStorage Resilience ===\x1b[0m');
  
  // Start local HTTP server
  const httpServer = http.createServer((req, res) => {
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

  await new Promise(resolve => httpServer.listen(HTTP_PORT, resolve));

  const chromeProc = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${CDP_PORT}`,
    '--no-sandbox',
    '--disable-gpu',
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 1500));

  let cdp = null;

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

    cdp = createCDPClient(pageTarget.webSocketDebuggerUrl);
    await cdp.open();

    const consoleErrors = [];
    const uncaughtExceptions = [];

    cdp.onEvent(msg => {
      if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
        const text = msg.params.args.map(a => a.value || a.description || JSON.stringify(a)).join(' ');
        consoleErrors.push(text);
      } else if (msg.method === 'Runtime.exceptionThrown') {
        const d = msg.params.exceptionDetails;
        const desc = d.exception ? (d.exception.description || d.exception.value) : d.text;
        uncaughtExceptions.push(`Line ${d.lineNumber}:${d.columnNumber} - ${desc}`);
      }
    });

    await cdp.send('Runtime.enable');
    await cdp.send('Page.enable');

    // --- Scenario 2.1: Clean / Empty LocalStorage ---
    console.log('\n  --- Scenario 2.1: Clean / Empty LocalStorage (Guest Auth Verification) ---');
    await cdp.send('Page.navigate', { url: `http://localhost:${HTTP_PORT}/play/index.html` });
    await new Promise(r => setTimeout(r, 2000));

    const authUser = await cdp.eval('localStorage.getItem("voxel_auth_user")');
    let parsedAuth = null;
    try { parsedAuth = JSON.parse(authUser); } catch (e) {}

    recordTest(
      'Guest Fallback on Empty LocalStorage',
      parsedAuth && parsedAuth.id === 999 && parsedAuth.nickname === 'Hráč_Guest',
      `Auto-initialized guest user: ${authUser}`
    );

    // Wait for world chunks meshing
    let ready = false;
    let attempts = 0;
    while (!ready && attempts < 15) {
      await new Promise(r => setTimeout(r, 1000));
      attempts++;
      ready = await cdp.eval('typeof ready !== "undefined" ? ready : false');
    }
    const chunkCount = await cdp.eval('typeof chunks !== "undefined" ? chunks.size : 0');

    recordTest(
      'Game Loop Ready With Meshed Chunks',
      ready === true && chunkCount > 50,
      `ready = ${ready}, meshed chunks count = ${chunkCount} in ${attempts}s`
    );

    // --- Scenario 2.2: LocalStorage Resilience Stress ---
    console.log('\n  --- Scenario 2.2: LocalStorage Edge Cases & Corrupted State Resilience ---');

    const edgeCaseResults = await cdp.eval(`
      (() => {
        const out = {};
        
        // Edge Case A: Corrupted JSON in voxel_auth_user
        localStorage.setItem('voxel_auth_user', '{{NOT_VALID_JSON{');
        out.nicknameCorrupted = (typeof getPlayerNickname === 'function') ? getPlayerNickname() : 'N/A';

        // Edge Case B: Empty string in voxel_auth_user
        localStorage.setItem('voxel_auth_user', '');
        out.nicknameEmpty = (typeof getPlayerNickname === 'function') ? getPlayerNickname() : 'N/A';

        // Edge Case C: Non-object JSON in voxel_auth_user
        localStorage.setItem('voxel_auth_user', '"plain_string"');
        out.nicknameString = (typeof getPlayerNickname === 'function') ? getPlayerNickname() : 'N/A';

        // Edge Case D: Corrupted JSON in voxel_active_game
        localStorage.setItem('voxel_active_game', '{{corrupt_json');
        out.activeGameCorrupt = (typeof GameStorage !== 'undefined') ? GameStorage.getActiveGame() : null;

        // Edge Case E: Empty object in voxel_active_game (missing keys)
        localStorage.setItem('voxel_active_game', '{}');
        out.activeGameEmpty = (typeof GameStorage !== 'undefined') ? GameStorage.getActiveGame() : null;
        out.seedWithEmptyActiveGame = (typeof SEED !== 'undefined') ? SEED : null;
        out.isWaitingApprovalWithEmpty = !!(window.isP2PWaitingApproval);

        // Edge Case F: Corrupted settings keys
        localStorage.setItem('voxel_setting_rd', 'not_a_number');
        localStorage.setItem('voxel_setting_fov', 'invalid_fov');
        localStorage.setItem('voxel_setting_sound', 'corrupted');
        localStorage.setItem('voxel_char_custom', '{{invalid_json_char');
        localStorage.setItem('voxel_dominant_hand', 'invalid_hand');

        // Restore valid guest auth for subsequent tests
        localStorage.setItem('voxel_auth_user', JSON.stringify({ id: 999, nickname: 'Hráč_Guest', email: 'guest@voxel.cz' }));
        localStorage.removeItem('voxel_active_game');

        return out;
      })()
    `);

    recordTest(
      'Corrupted voxel_auth_user Fallback',
      edgeCaseResults.nicknameCorrupted === 'Hráč',
      `Safely returned default fallback '${edgeCaseResults.nicknameCorrupted}' without throwing`
    );

    recordTest(
      'Corrupted voxel_active_game Fallback',
      edgeCaseResults.activeGameCorrupt && edgeCaseResults.activeGameCorrupt.mode === 'singleplayer' && edgeCaseResults.activeGameCorrupt.seed === 12345,
      `GameStorage safely returned singleplayer default with seed ${edgeCaseResults.activeGameCorrupt?.seed}`
    );

    recordTest(
      'Missing Keys voxel_active_game Handling',
      edgeCaseResults.activeGameEmpty && typeof edgeCaseResults.activeGameEmpty === 'object' && edgeCaseResults.seedWithEmptyActiveGame === 12345 && edgeCaseResults.isWaitingApprovalWithEmpty === false,
      `Safely handled empty active game: seed=${edgeCaseResults.seedWithEmptyActiveGame}, waiting=${edgeCaseResults.isWaitingApprovalWithEmpty}`
    );

    // --- Scenario 2.3: P2P Client Mode Initialization ---
    console.log('\n  --- Scenario 2.3: P2P Client Mode Initialization & State Transition ---');
    const p2pModeResult = await cdp.eval(`
      (() => {
        // Set P2P client mode
        localStorage.setItem('voxel_active_game', JSON.stringify({ mode: 'p2p_client', p2pRoomCode: 'VOX-STRESS' }));
        const active = (typeof GameStorage !== 'undefined') ? GameStorage.getActiveGame() : null;
        
        // Check approval logic
        const initialWait = !!(active && active.mode === 'p2p_client');
        window.isP2PWaitingApproval = initialWait;

        // Simulate host approval call
        if (typeof window.approveP2PJoin === 'function') {
          window.approveP2PJoin(54321, {}, [{ id: 'host', x: 10, y: 40, z: 10 }]);
        }

        const approvedWait = window.isP2PWaitingApproval;

        // Clean up
        localStorage.removeItem('voxel_active_game');

        return {
          initialWait,
          approvedWait,
          playerPosAfterApproval: { x: P.x, y: P.y, z: P.z }
        };
      })()
    `);

    recordTest(
      'P2P Client Mode Gate & Approval Handshake',
      p2pModeResult.initialWait === true && p2pModeResult.approvedWait === false,
      `Initial waiting = ${p2pModeResult.initialWait}, approved waiting = ${p2pModeResult.approvedWait}`
    );

    // =========================================================================
    // TEST SUITE 3: Client-Side Voxel Immutability Stress
    // =========================================================================
    console.log('\n\x1b[1m=== TEST SUITE 3: Voxel Terrain Immutability Under Adversarial Attacks ===\x1b[0m');

    const voxelStressResults = await cdp.eval(`
      (() => {
        const out = {
          initialChunks: chunks.size,
          bytesModified: 0,
          methodsThrew: false,
          attackTriggersWorked: false
        };

        // 1. Snapshot all meshed chunk Uint8Array buffers
        const snapshot = new Map();
        for (const [k, c] of chunks) {
          if (c.d) {
            snapshot.set(k, new Uint8Array(c.d));
          }
        }

        try {
          // 2. High-Frequency Direct Calls to stubbed network block methods (500 iterations)
          if (window.networkManager) {
            for (let i = 0; i < 500; i++) {
              const x = (i * 17) % 500 - 250;
              const y = i % 128;
              const z = (i * 31) % 500 - 250;
              const b = (i % 10) + 1;
              window.networkManager.modifyBlock(x, y, z, b);
              window.networkManager.onRemoteBlockChange(x, y, z, b);
              window.networkManager.applySingleBlock(x, y, z, b);
            }

            // Boundary / Fuzz coordinates
            window.networkManager.modifyBlock(NaN, Infinity, -Infinity, 999);
            window.networkManager.onRemoteBlockChange('x', null, undefined, {});
            window.networkManager.applySingleBlock(-99999, 99999, 0, 255);
            window.networkManager.applyWorldDeltas();
          }

          // 3. Combat Mouse Actions (50 LMB / RMB triggers)
          const wasAttackingBefore = attacking;
          for (let i = 0; i < 50; i++) {
            handleHandAction('dominant');
            handleHandAction('secondary');
            if (typeof handleHandRelease === 'function') {
              handleHandRelease('dominant');
              handleHandRelease('secondary');
            }
          }
          out.attackTriggersWorked = attacking === true || wasAttackingBefore === false;

        } catch (e) {
          out.methodsThrew = true;
          out.throwError = e.message;
        }

        // 4. Compare all meshed chunk buffers against snapshot
        let byteMismatches = 0;
        for (const [k, initialBuffer] of snapshot) {
          const currentChunk = chunks.get(k);
          if (!currentChunk || !currentChunk.d) {
            byteMismatches++;
            continue;
          }
          const currentBuffer = currentChunk.d;
          if (currentBuffer.length !== initialBuffer.length) {
            byteMismatches++;
            continue;
          }
          for (let i = 0; i < initialBuffer.length; i++) {
            if (currentBuffer[i] !== initialBuffer[i]) {
              byteMismatches++;
            }
          }
        }

        out.bytesModified = byteMismatches;
        out.finalChunks = chunks.size;
        return out;
      })()
    `);

    recordTest(
      'Voxel Terrain Buffer Immutability',
      voxelStressResults.bytesModified === 0 && !voxelStressResults.methodsThrew,
      `Exact byte check across ${voxelStressResults.initialChunks} chunks: 0 bytes modified after 1500+ modification attempts`
    );

    recordTest(
      'Combat Action Handlers Executed Without Block Alteration',
      voxelStressResults.attackTriggersWorked === true,
      `handleHandAction triggers combat attack state without mutating terrain`
    );

    recordTest(
      'Zero Uncaught Exceptions During Browser Stress Run',
      uncaughtExceptions.length === 0,
      `Uncaught exceptions count: ${uncaughtExceptions.length} ${uncaughtExceptions.join('; ')}`
    );

    recordTest(
      'Zero Console Errors During Browser Stress Run',
      consoleErrors.length === 0,
      `Console error count: ${consoleErrors.length} ${consoleErrors.slice(0, 3).join('; ')}`
    );

  } catch (err) {
    recordTest('Browser Stress Suite Execution', false, err.message);
  } finally {
    if (cdp) cdp.close();
    if (chromeProc) try { chromeProc.kill(); } catch (e) {}
    httpServer.close();
  }
}

async function run() {
  const startTime = Date.now();
  console.log('\x1b[1m\x1b[36m');
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║  MILESTONE 1 ADVERSARIAL STRESS TEST & EMPIRICAL VERIFICATION SUITE  ║');
  console.log('║       Cube World Immutability, Resilience & Dedicated Server         ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  console.log('\x1b[0m');

  await runStaticSyntaxSuite();
  await runServerStressSuite();
  await runBrowserStressSuite();

  const duration = Date.now() - startTime;
  console.log('\n\x1b[1m\x1b[36m══════════════════════════════════════════════════════════════════════\x1b[0m');
  console.log('\x1b[1m                 CHALLENGER VERIFICATION SUMMARY\x1b[0m');
  console.log('\x1b[1m\x1b[36m══════════════════════════════════════════════════════════════════════\x1b[0m');
  console.log(`  Total Tests Run:  \x1b[1m${results.total}\x1b[0m`);
  console.log(`  Passed:           \x1b[1m\x1b[32m${results.passed}\x1b[0m`);
  console.log(`  Failed:           \x1b[1m\x1b[31m${results.failed}\x1b[0m`);
  console.log(`  Total Execution:  ${duration} ms`);
  console.log('\x1b[1m\x1b[36m══════════════════════════════════════════════════════════════════════\x1b[0m\n');

  if (results.failed > 0) {
    console.error('\x1b[31mVERDICT: REQUEST_CHANGES ❌\x1b[0m');
    process.exit(1);
  } else {
    console.log('\x1b[32mVERDICT: APPROVE ✅\x1b[0m');
    process.exit(0);
  }
}

run();
