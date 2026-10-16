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

async function runVerification() {
  console.log('=== Milestone 1 Verification Run ===');
  
  // 1. Static Syntax Check
  console.log('\n--- 1. Static Syntax Check (node --check) ---');
  const dirs = ['js', 'ServerSource'];
  let syntaxPassed = true;
  let syntaxCount = 0;
  for (const dir of dirs) {
    const fullDir = path.join(projectRoot, dir);
    const files = fs.readdirSync(fullDir).filter(f => f.endsWith('.js'));
    for (const f of files) {
      syntaxCount++;
      const fullPath = path.join(fullDir, f);
      try {
        execSync(`node --check "${fullPath}"`, { stdio: 'pipe' });
        console.log(`  [OK] ${dir}/${f}`);
      } catch (err) {
        syntaxPassed = false;
        console.error(`  [FAIL] ${dir}/${f}: ${err.stderr ? err.stderr.toString() : err.message}`);
      }
    }
  }
  console.log(`Syntax check result: ${syntaxPassed ? 'ALL PASSED' : 'FAILURES DETECTED'} (${syntaxCount} files checked)`);
  if (!syntaxPassed) process.exit(1);

  // 2. Static HTTP Server for Real Project Files (no mocks)
  console.log('\n--- 2. Starting HTTP Server ---');
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

  const PORT = 8098;
  const DEBUG_PORT = 9235;

  await new Promise(resolve => server.listen(PORT, resolve));
  console.log(`Test server running at http://localhost:${PORT}/`);

  // 3. Launch Headless Chrome
  console.log('\n--- 3. Launching Headless Chrome ---');
  const chrome = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--no-sandbox',
    '--disable-gpu',
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 1500));

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

    console.log('\n--- 4. Navigating to /play/index.html with EMPTY localStorage (Testing Guest Fallback) ---');
    await sendCDP('Page.navigate', { url: `http://localhost:${PORT}/play/index.html` });

    // Wait for initial load and guest fallback
    await new Promise(r => setTimeout(r, 2000));

    // Check localStorage auth user
    const authUserEval = await sendCDP('Runtime.evaluate', {
      expression: 'localStorage.getItem("voxel_auth_user")',
      returnByValue: true
    });
    console.log('Guest fallback in localStorage:', authUserEval.result.value);

    // Wait for world chunks to generate and ready to become true
    console.log('\n--- 5. Waiting for Chunk Meshing & `ready === true` ---');
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
      console.error('FAILED: Game did not reach ready = true within timeout');
    } else {
      console.log('SUCCESS: Game reached ready === true with chunks generated!');
    }

    // 6. Test Combat Clicks & Verify No Block Placing / Destroying
    console.log('\n--- 6. Testing Combat & Block Modification Removal ---');
    const combatEval = await sendCDP('Runtime.evaluate', {
      expression: `
        (() => {
          try {
            // Verify initial state
            const initialAttacking = attacking;
            // Trigger LMB attack
            handleHandAction('dominant');
            const attacked = attacking;
            
            // Verify block modification stubs
            let chunkSampleBefore = null;
            let chunkSampleAfter = null;
            if (typeof chunks !== 'undefined' && chunks.size > 0) {
              const firstChunk = chunks.values().next().value;
              chunkSampleBefore = firstChunk.d[0];
              // Attempt to modify block through networkManager
              if (window.networkManager) {
                window.networkManager.modifyBlock(0, 40, 0, 99);
                window.networkManager.applySingleBlock(0, 40, 0, 99);
                window.networkManager.applyWorldDeltas();
              }
              chunkSampleAfter = firstChunk.d[0];
            }

            // Check item descriptions
            const woodItem = INV.find(i => i.id === 'wood');
            const stoneItem = INV.find(i => i.id === 'stone');

            return {
              initialAttacking,
              attacked,
              chunkModified: chunkSampleBefore !== chunkSampleAfter,
              woodDesc: woodItem ? woodItem.desc : null,
              woodStat: woodItem ? woodItem.statList : null,
              stoneDesc: stoneItem ? stoneItem.desc : null,
              stoneStat: stoneItem ? stoneItem.statList : null
            };
          } catch (e) {
            return { error: e.message, stack: e.stack };
          }
        })()
      `,
      returnByValue: true
    });

    console.log('Combat & Block Removal Test Results:', JSON.stringify(combatEval.result.value, null, 2));

    // Summary of exceptions & errors
    console.log('\n--- 7. Exceptions & Console Errors Audit ---');
    console.log(`Uncaught Exceptions Count: ${exceptions.length}`);
    exceptions.forEach(e => console.log('  ❌ Exception:', e));
    
    const severeConsoleErrors = consoleLogs.filter(l => l.startsWith('[error]'));
    console.log(`Console Errors Count: ${severeConsoleErrors.length}`);
    severeConsoleErrors.forEach(l => console.log('  ❌ Console Error:', l));

    console.log('\nSample logs (last 5):');
    consoleLogs.slice(-5).forEach(l => console.log('  ℹ️', l));

    const allGood = ready && exceptions.length === 0 && combatEval.result.value.attacked && !combatEval.result.value.chunkModified;
    console.log(`\nOverall Result: ${allGood ? 'ALL VERIFICATIONS PASSED ✅' : 'VERIFICATION FAILED ❌'}`);

    chrome.kill();
    server.close();
    process.exit(allGood ? 0 : 1);

  } catch (err) {
    console.error('Runtime verification error:', err);
    chrome.kill();
    server.close();
    process.exit(1);
  }
}

runVerification();
