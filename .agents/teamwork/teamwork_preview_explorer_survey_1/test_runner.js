const { spawn } = require('child_process');
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

const server = http.createServer((req, res) => {
  let reqPath = decodeURI(req.url.split('?')[0]);
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  if (reqPath.endsWith('/')) reqPath += 'index.html';
  const filePath = path.join(projectRoot, reqPath);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    if (filePath.endsWith('player.js')) {
      let code = fs.readFileSync(filePath, 'utf8');
      code = code.slice(0, code.lastIndexOf('}')); // Strip the extra closing brace for testing simulation
      res.end(code);
    } else {
      fs.createReadStream(filePath).pipe(res);
    }
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(8092, async () => {
  console.log('[Server] Static test server running on port 8092 (simulating player.js fix)');
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9229',
    '--no-sandbox',
    '--disable-gpu',
    'about:blank'
  ]);

  setTimeout(async () => {
    try {
      const targets = await new Promise((resolve, reject) => {
        http.get('http://127.0.0.1:9229/json', (r) => {
          let data = '';
          r.on('data', chunk => data += chunk);
          r.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
      });
      const pageTarget = targets.find(t => t.type === 'page');
      if (!pageTarget) throw new Error('No page target found');
      const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

      const logs = [];
      const errors = [];

      ws.on('open', () => {
        ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
        ws.send(JSON.stringify({ id: 2, method: 'Page.enable' }));
        const initScript = `
          localStorage.setItem('voxel_auth_user', JSON.stringify({ id: 1, nickname: 'Tester' }));
          localStorage.setItem('voxel_active_game', JSON.stringify({ mode: 'singleplayer', worldId: 'world_default', seed: 12345 }));
        `;
        ws.send(JSON.stringify({
          id: 3,
          method: 'Page.addScriptToEvaluateOnNewDocument',
          params: { source: initScript }
        }));
        ws.send(JSON.stringify({
          id: 4,
          method: 'Page.navigate',
          params: { url: 'http://localhost:8092/play/index.html' }
        }));
      });

      ws.on('message', data => {
        const msg = JSON.parse(data);
        if (msg.method === 'Runtime.consoleAPICalled') {
          const text = msg.params.args.map(a => a.value || a.description || '').join(' ');
          logs.push(`[${msg.params.type}] ${text}`);
        } else if (msg.method === 'Runtime.exceptionThrown') {
          const detail = msg.params.exceptionDetails;
          const desc = detail.exception ? detail.exception.description : detail.text;
          errors.push(`Line ${detail.lineNumber}:${detail.columnNumber} - ${desc}`);
        }
      });

      // Poll ready state after 4 seconds
      setTimeout(() => {
        ws.send(JSON.stringify({
          id: 10,
          method: 'Runtime.evaluate',
          params: { expression: 'typeof ready !== "undefined" ? ready : "undefined"' }
        }));
      }, 3500);

      ws.on('message', data => {
        const msg = JSON.parse(data);
        if (msg.id === 10) {
          console.log('Value of `ready` in game:', msg.result.result.value);
        }
      });

      setTimeout(() => {
        console.log('--- Simulation Results with player.js fix ---');
        console.log('Errors (' + errors.length + '):');
        errors.forEach(e => console.log('  ❌', e));
        console.log('Logs count:', logs.length);
        logs.forEach(l => console.log('  ℹ️', l));
        chrome.kill();
        server.close();
      }, 5000);

    } catch (e) {
      console.error('Test error:', e);
      chrome.kill();
      server.close();
    }
  }, 1000);
});
