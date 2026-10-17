const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');
const assert = require('assert');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const projectRoot = path.resolve(__dirname, '..');
const WebSocket = require(path.join(projectRoot, 'ServerSource', 'node_modules', 'ws'));

const PORT = 8499;
const DEBUG_PORT = 9588;

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.json': 'application/json'
};

async function main() {
  console.log('=== PET & INVENTORY PERSISTENCE AUDIT ===');
  const server = http.createServer((req, res) => {
    let reqPath = req.url.split('?')[0];
    if (reqPath === '/') reqPath = '/play/index.html';
    const filePath = path.join(projectRoot, reqPath);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath);
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  await new Promise(r => server.listen(PORT, r));

  const chrome = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--mute-audio',
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
    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
    await new Promise(r => ws.on('open', r));

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

    // 1. Initial navigation to play/index.html
    await sendCDP('Page.navigate', { url: `http://127.0.0.1:${PORT}/play/index.html` });

    console.log('Waiting for engine ready on initial load...');
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 300));
      const ready = await evalInBrowser('typeof ready !== "undefined" && ready === true');
      if (ready) break;
    }

    // 2. Add two pets to inventory and equip one in pet slot
    console.log('Step 1: Adding pets to inventory and equipping in slot...');
    const setupResult = await evalInBrowser(`
      (() => {
        const dog = INV.find(it => it.id === 'pet_dog_husky');
        const cat = INV.find(it => it.id === 'pet_cat');
        if (dog) dog.count = 1;
        if (cat) cat.count = 2;

        equipToSlot('pet_dog_husky', 'pet');
        window.PetManager.summonPet('pet_dog_husky');

        // Trigger manual world save
        window.networkManager.saveSingleplayerWorld();

        const activeGame = GameStorage.getActiveGame();
        const worldData = GameStorage.getWorld(activeGame.worldId);

        return {
          dogCount: dog ? dog.count : 0,
          catCount: cat ? cat.count : 0,
          equippedPet: EQUIPPED_SLOTS.pet,
          activePetName: window.PetManager.activePet ? window.PetManager.activePet.name : null,
          hasSavedInventory: !!(worldData && worldData.playerState && worldData.playerState.inventory),
          hasSavedEquippedSlots: !!(worldData && worldData.playerState && worldData.playerState.equippedSlots)
        };
      })()
    `);

    console.log('Setup result:', setupResult);
    assert(setupResult.dogCount === 1, 'Dog count should be 1');
    assert(setupResult.catCount === 2, 'Cat count should be 2');
    assert(setupResult.equippedPet === 'pet_dog_husky', 'Equipped pet slot should be pet_dog_husky');
    assert(setupResult.hasSavedInventory === true, 'World data must have saved inventory');
    assert(setupResult.hasSavedEquippedSlots === true, 'World data must have saved equippedSlots');
    console.log('✔ Pets successfully added and saved to world storage!');

    // 3. Simulate closing world / restarting world by re-navigating to play/index.html
    console.log('\nStep 2: Reloading world / restarting session...');
    await sendCDP('Page.navigate', { url: `http://127.0.0.1:${PORT}/play/index.html` });

    console.log('Waiting for engine ready on second load...');
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 300));
      const ready = await evalInBrowser('typeof ready !== "undefined" && ready === true');
      if (ready) break;
    }

    // Wait a moment for playerState to apply
    await new Promise(r => setTimeout(r, 800));

    // 4. Verify pets and equipped slot were restored!
    console.log('Step 3: Checking if pets and equipped slot were preserved after restart...');
    const reloadResult = await evalInBrowser(`
      (() => {
        const dog = INV.find(it => it.id === 'pet_dog_husky');
        const cat = INV.find(it => it.id === 'pet_cat');

        return {
          dogCount: dog ? dog.count : 0,
          catCount: cat ? cat.count : 0,
          equippedPet: (typeof EQUIPPED_SLOTS !== 'undefined') ? EQUIPPED_SLOTS.pet : null,
          activePetName: (window.PetManager && window.PetManager.activePet) ? window.PetManager.activePet.name : null
        };
      })()
    `);

    console.log('Reload result:', reloadResult);
    assert(reloadResult.dogCount === 1, `Expected dogCount 1, got ${reloadResult.dogCount}`);
    assert(reloadResult.catCount === 2, `Expected catCount 2, got ${reloadResult.catCount}`);
    assert(reloadResult.equippedPet === 'pet_dog_husky', `Expected equippedPet 'pet_dog_husky', got ${reloadResult.equippedPet}`);
    assert(reloadResult.activePetName === 'Sibiřský husky', `Expected active pet 'Sibiřský husky', got ${reloadResult.activePetName}`);

    if (uncaughtErrors.length > 0) {
      console.error('FAIL: Uncaught errors found:', uncaughtErrors);
      process.exit(1);
    }

    console.log('\n✔ SUCCESS: All pets and equipment persisted perfectly across world restart!');

  } catch (err) {
    console.error('FAIL:', err);
    process.exit(1);
  } finally {
    chrome.kill();
    server.close();
    process.exit(0);
  }
}

main();
