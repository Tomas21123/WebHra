const { spawn } = require('child_process');
const path = require('path');
const WebSocket = require(path.resolve(__dirname, '../../../ServerSource/node_modules/ws'));

async function testServer() {
  console.log('--- Testing ServerSource/server.js ---');
  const serverProc = spawn('node', ['ServerSource/server.js'], {
    cwd: path.resolve(__dirname, '../../..'),
    env: { ...process.env, PORT: '3005' },
    stdio: 'pipe'
  });

  serverProc.stdout.on('data', d => console.log('[Server stdout]', d.toString().trim()));
  serverProc.stderr.on('data', d => console.error('[Server stderr]', d.toString().trim()));

  await new Promise(r => setTimeout(r, 2000));

  try {
    const ws = new WebSocket('ws://localhost:3000');
    await new Promise((resolve, reject) => {
      ws.on('open', resolve);
      ws.on('error', reject);
    });

    console.log('Connected to WebSocket server');
    let receivedInit = false;
    let receivedBlockChange = false;

    ws.on('message', data => {
      const msg = JSON.parse(data);
      console.log('Received packet from server:', msg.type);
      if (msg.type === 'init') {
        receivedInit = true;
      }
      if (msg.type === 'blockChange') {
        receivedBlockChange = true;
      }
    });

    // Send join
    ws.send(JSON.stringify({
      type: 'join',
      nickname: 'Tester',
      x: 0, y: 50, z: 0,
      yaw: 0, pitch: 0
    }));

    await new Promise(r => setTimeout(r, 1000));

    // Send blockChange
    console.log('Sending blockChange packet to server...');
    ws.send(JSON.stringify({
      type: 'blockChange',
      x: 10, y: 20, z: 30,
      blockType: 1
    }));

    await new Promise(r => setTimeout(r, 1500));

    console.log(`Server test results:
      receivedInit: ${receivedInit}
      receivedBlockChange (should be false, as it must be ignored): ${receivedBlockChange}
    `);

    ws.close();
    serverProc.kill();

    if (receivedInit && !receivedBlockChange) {
      console.log('SERVER VERIFICATION PASSED ✅');
      process.exit(0);
    } else {
      console.error('SERVER VERIFICATION FAILED ❌');
      process.exit(1);
    }
  } catch (e) {
    console.error('Server test error:', e);
    serverProc.kill();
    process.exit(1);
  }
}

testServer();
