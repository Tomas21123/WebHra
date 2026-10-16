/**
 * =============================================================================
 * Voxelový svět – Dedikovaný Multiplayer Herní Server
 * =============================================================================
 * Běží na Node.js + WebSockets.
 * Podporuje:
 *  - Běh na Windows, macOS, Linux i Raspberry Pi 4 (headless i desktop)
 *  - Správu operátorů (OPs) a herních příkazů (/op, /kick, /tp, /time atd.)
 *  - Ukládání změn světa (deltas) a stavu hráčů do JSON souboru
 *  - Vestavěný Web Admin Dashboard na http://localhost:3000/admin
 *  - REST API endpoint /api/status pro ping a zobrazení v seznamu serverů
 * =============================================================================
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Cesty k souborům
const CONFIG_PATH = path.join(__dirname, 'config.json');
const OPS_PATH = path.join(__dirname, 'ops.json');
const DATA_DIR = path.join(__dirname, 'data');
const WORLD_SAVE_PATH = path.join(DATA_DIR, 'world.json');

// Kontrola a vytvoření složky pro data
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Načtení konfigurace
let config = {
  serverName: "Voxelový Server",
  port: 3000,
  maxPlayers: 20,
  seed: 12345,
  motd: "Vítej ve Voxelovém RPG světě!",
  pvp: true,
  saveIntervalSeconds: 5,
  adminPassword: "admin",
  enableWebAdmin: true
};

try {
  if (fs.existsSync(CONFIG_PATH)) {
    config = Object.assign(config, JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')));
  } else {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
  }
} catch (e) {
  console.error('[Config] Chyba načítání config.json, použity výchozí hodnoty:', e.message);
}

// Načtení operátorů (OPs)
let ops = new Set(['Tomas', 'Admin']);
try {
  if (fs.existsSync(OPS_PATH)) {
    const rawOps = JSON.parse(fs.readFileSync(OPS_PATH, 'utf8'));
    if (Array.isArray(rawOps)) ops = new Set(rawOps.map(n => String(n).trim().toLowerCase()));
  } else {
    saveOps();
  }
} catch (e) {
  console.error('[OPs] Chyba načítání ops.json:', e.message);
}

function saveOps() {
  try {
    fs.writeFileSync(OPS_PATH, JSON.stringify(Array.from(ops), null, 2), 'utf8');
  } catch (e) {
    console.error('[OPs] Nepodařilo se uložit ops.json:', e.message);
  }
}

function isPlayerOp(nickname) {
  if (!nickname) return false;
  return ops.has(nickname.trim().toLowerCase());
}

// Světové změny (Deltas: [x,y,z] -> blockType)
// Ukládáme jen bloky, které hráči položili nebo rozbili!
let worldDeltas = {};
try {
  if (fs.existsSync(WORLD_SAVE_PATH)) {
    const saved = JSON.parse(fs.readFileSync(WORLD_SAVE_PATH, 'utf8'));
    if (saved && saved.worldDeltas) {
      worldDeltas = saved.worldDeltas;
      console.log(`[World] Načteno ${Object.keys(worldDeltas).length} uložených úprav terénu.`);
    }
  }
} catch (e) {
  console.error('[World] Chyba načítání uloženého světa:', e.message);
}

function saveWorld() {
  try {
    const payload = {
      savedAt: new Date().toISOString(),
      seed: config.seed,
      worldDeltas
    };
    fs.writeFileSync(WORLD_SAVE_PATH, JSON.stringify(payload, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('[World] Chyba ukládání světa:', e.message);
    return false;
  }
}

// Automatické ukládání
setInterval(() => {
  saveWorld();
}, Math.max(5, config.saveIntervalSeconds) * 1000);

// Kontrola instalace modulu 'ws' (WebSocket)
let WebSocket;
let WebSocketServer;
try {
  const wsPkg = require('ws');
  WebSocket = wsPkg;
  WebSocketServer = wsPkg.Server;
} catch (e) {
  console.error('\n' + '='.repeat(60));
  console.error('CHYBA: Modul "ws" není nainstalován v ServerSource!');
  console.error('Pro instalaci spusť v této složce příkaz:');
  console.error('   npm install');
  console.error('nebo:');
  console.error('   npm install ws');
  console.error('='.repeat(60) + '\n');
}

// Získání lokálních IP adres počítače pro nápovědu
function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      // Pouze IPv4 a ne interní loopback
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push({ iface: name, address: net.address });
      }
    }
  }
  return addresses;
}

// ---------- HTTP SERVER ----------
const startTime = Date.now();
const serverLogs = [];
function log(msg) {
  const time = new Date().toLocaleTimeString();
  const entry = `[${time}] ${msg}`;
  console.log(entry);
  serverLogs.push(entry);
  if (serverLogs.length > 200) serverLogs.shift();
}

const httpServer = http.createServer((req, res) => {
  // CORS pro přístup z webové hry
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  // 1. API: Informace o stavu serveru (pro multiplayer ping & list)
  if (url.pathname === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      status: 'online',
      serverName: config.serverName,
      motd: config.motd,
      playersOnline: clients.size,
      maxPlayers: config.maxPlayers,
      seed: config.seed,
      pvp: config.pvp,
      uptimeSeconds: Math.floor((Date.now() - startTime) / 1000)
    }));
    return;
  }

  // 2. API: Web Admin Dashboard operace
  if (url.pathname === '/api/admin/action' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body || '{}');
        const action = data.action;

        if (action === 'save') {
          saveWorld();
          log('Ruční uložení světa provedeno přes webový panel.');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, message: 'Svět byl úspěšně uložen.' }));
          return;
        }

        if (action === 'kick') {
          const targetNick = (data.nickname || '').trim().toLowerCase();
          let kicked = false;
          for (const [ws, p] of clients) {
            if (p.nickname.toLowerCase() === targetNick) {
              ws.send(JSON.stringify({ type: 'kicked', reason: data.reason || 'Byl jsi vyhozen administrátorem.' }));
              ws.close();
              kicked = true;
              log(`Hráč "${p.nickname}" byl vyhozen přes administraci.`);
              break;
            }
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: kicked, message: kicked ? 'Hráč byl vyhozen.' : 'Hráč nebyl nalezen.' }));
          return;
        }

        if (action === 'toggleOp') {
          const targetNick = (data.nickname || '').trim().toLowerCase();
          const targetPretty = data.nickname || '';
          if (ops.has(targetNick)) {
            ops.delete(targetNick);
            saveOps();
            log(`Operátor "${targetPretty}" byl odebrán.`);
          } else {
            ops.add(targetNick);
            saveOps();
            log(`Operátor "${targetPretty}" byl přidán.`);
          }
          // Aktualizace online hráčům
          for (const [ws, p] of clients) {
            if (p.nickname.toLowerCase() === targetNick) {
              p.isOp = isPlayerOp(p.nickname);
              ws.send(JSON.stringify({ type: 'opStatus', isOp: p.isOp }));
            }
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, isOp: ops.has(targetNick) }));
          return;
        }

        if (action === 'broadcast') {
          const msg = data.message || '';
          broadcast({ type: 'chat', sender: 'Server Admin', text: msg, isSystem: true });
          log(`[Oznámení] ${msg}`);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true }));
          return;
        }

        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Neznámá akce' }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // 3. Webový panel administrace (HTML dashboard)
  if (url.pathname === '/admin' || url.pathname === '/admin/') {
    if (!config.enableWebAdmin) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Webová administrace je v config.json zakázána.');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(renderAdminHtml());
    return;
  }

  // Výchozí odpověď
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`
    <!DOCTYPE html>
    <html lang="cs">
    <head>
      <meta charset="utf-8">
      <title>${config.serverName} – Online</title>
      <style>
        body { font-family: system-ui, sans-serif; background: #0b1120; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
        .card { background: #1e293b; padding: 32px; border-radius: 16px; border: 1px solid #334155; text-align: center; max-width: 480px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
        h1 { color: #10b981; margin-top: 0; font-size: 26px; }
        p { color: #94a3b8; line-height: 1.6; }
        .pill { display: inline-block; padding: 6px 14px; background: rgba(16,185,129,0.15); color: #34d399; border-radius: 99px; font-weight: bold; margin-bottom: 16px; }
        .btn { display: inline-block; margin-top: 16px; padding: 12px 24px; background: #38bdf8; color: #02131e; text-decoration: none; font-weight: bold; border-radius: 10px; transition: 0.2s; }
        .btn:hover { background: #7dd3fc; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="pill">● Server běží online</div>
        <h1>${config.serverName}</h1>
        <p>${config.motd}</p>
        <p>Hráčů online: <strong>${clients.size} / ${config.maxPlayers}</strong><br>Port: <strong>${config.port}</strong> · Seed: <strong>${config.seed}</strong></p>
        <a href="/admin" class="btn">Otevřít Administraci Serveru</a>
      </div>
    </body>
    </html>
  `);
});

// ---------- WEBSOCKET SERVER & HERNÍ PROTOKOL ----------
const clients = new Map(); // ws -> { id, nickname, isOp, x, y, z, yaw, pitch, heldItem, skin, hp, stamina, ping }
let nextPlayerId = 1;

function broadcast(msgObj, excludeWs = null) {
  const json = JSON.stringify(msgObj);
  for (const [ws] of clients) {
    if (ws !== excludeWs && ws.readyState === 1 /* OPEN */) {
      ws.send(json);
    }
  }
}

if (WebSocketServer) {
  const wss = new WebSocketServer({ server: httpServer });

  wss.on('connection', (ws, req) => {
    const ip = req.socket.remoteAddress;

    if (clients.size >= config.maxPlayers) {
      ws.send(JSON.stringify({ type: 'error', message: 'Server je plný.' }));
      ws.close();
      return;
    }

    const playerId = nextPlayerId++;
    const player = {
      id: playerId,
      nickname: `Hráč_${playerId}`,
      isOp: false,
      x: 0,
      y: 80,
      z: 0,
      yaw: 0,
      pitch: 0,
      heldItem: null,
      skin: {},
      isRolling: false,
      attacking: false,
      hp: 100,
      stamina: 100,
      ping: 0
    };

    clients.set(ws, player);

    ws.on('message', (messageRaw) => {
      try {
        const msg = JSON.parse(messageRaw);

        // 1. Handshake po připojení hráče
        if (msg.type === 'join') {
          player.nickname = (msg.nickname || player.nickname).trim().slice(0, 25);
          player.skin = msg.skin || {};
          player.isOp = isPlayerOp(player.nickname);

          log(`Hráč "${player.nickname}" (#${player.id}) se připojil [IP: ${ip}]. OP: ${player.isOp}`);

          // Odeslat hráči inicializační data světa a stávajících hráčů
          const existingPlayers = [];
          for (const [, p] of clients) {
            if (p.id !== player.id) existingPlayers.push(p);
          }

          ws.send(JSON.stringify({
            type: 'init',
            playerId: player.id,
            serverName: config.serverName,
            seed: config.seed,
            motd: config.motd,
            isOp: player.isOp,
            pvp: config.pvp,
            worldDeltas: worldDeltas,
            players: existingPlayers
          }));

          // Informovat ostatní hráče o novém hráči
          broadcast({
            type: 'playerJoin',
            player: player
          }, ws);

          broadcast({
            type: 'chat',
            sender: 'Systém',
            text: `Hráč ${player.nickname} vstoupil do světa.`,
            isSystem: true
          });

          return;
        }

        // 2. Pohyb a rotace hráče
        if (msg.type === 'move') {
          player.x = msg.x ?? player.x;
          player.y = msg.y ?? player.y;
          player.z = msg.z ?? player.z;
          player.vx = msg.vx ?? 0;
          player.vy = msg.vy ?? 0;
          player.vz = msg.vz ?? 0;
          player.ground = typeof msg.ground !== 'undefined' ? !!msg.ground : true;
          player.inWater = typeof msg.inWater !== 'undefined' ? !!msg.inWater : false;
          player.isSprinting = typeof msg.isSprinting !== 'undefined' ? !!msg.isSprinting : false;
          player.isForwardSprint = typeof msg.isForwardSprint !== 'undefined' ? !!msg.isForwardSprint : false;
          player.bodyYaw = msg.bodyYaw ?? player.bodyYaw;
          player.yaw = msg.yaw ?? player.yaw;
          player.pitch = msg.pitch ?? player.pitch;
          player.emote = msg.emote ?? null;
          player.heldItem = msg.heldItem ?? player.heldItem;
          player.isRolling = !!msg.isRolling;
          player.rollTimer = msg.rollTimer ?? 0;
          player.attacking = !!msg.attacking;
          player.attackTime = msg.attackTime ?? 0;
          player.attackDuration = msg.attackDuration ?? 0.26;
          player.attackCombo = msg.attackCombo ?? 0;
          player.isBlocking = !!msg.isBlocking;
          player.level = msg.level ?? player.level ?? 1;
          player.hp = msg.hp ?? player.hp ?? 100;
          player.maxHp = msg.maxHp ?? player.maxHp ?? 100;

          // Přeposlat ostatním hráčům
          broadcast({
            type: 'playerMove',
            id: player.id,
            x: player.x,
            y: player.y,
            z: player.z,
            vx: player.vx,
            vy: player.vy,
            vz: player.vz,
            ground: player.ground,
            inWater: player.inWater,
            isSprinting: player.isSprinting,
            isForwardSprint: player.isForwardSprint,
            bodyYaw: player.bodyYaw,
            yaw: player.yaw,
            pitch: player.pitch,
            emote: player.emote,
            heldItem: player.heldItem,
            isRolling: player.isRolling,
            rollTimer: player.rollTimer,
            attacking: player.attacking,
            attackTime: player.attackTime,
            attackDuration: player.attackDuration,
            attackCombo: player.attackCombo,
            isBlocking: player.isBlocking,
            level: player.level,
            hp: player.hp,
            maxHp: player.maxHp
          }, ws);
          return;
        }

        // 3. Položení nebo rozbití bloku (Block Edit) - Ignorováno pro Cube World RPG
        if (msg.type === 'blockChange') {
          // Block building and terrain destruction are disabled in Cube World mode.
          return;
        }

        // 3.5 Vystřelení projektilu (Luk / Magická hůl)
        if (msg.type === 'projectileSpawn') {
          broadcast(Object.assign({}, msg, { senderId: player.id }), ws);
          return;
        }

        // 4. Chat a Příkazy (/help, /tp, /op, /time atd.)
        if (msg.type === 'chat') {
          const text = (msg.text || '').trim();
          if (!text) return;

          // Zpracování příkazu začínajícího lomítkem
          if (text.startsWith('/')) {
            handlePlayerCommand(ws, player, text);
            return;
          }

          // Běžná chatová zpráva
          log(`[Chat] (${player.nickname}): ${text}`);
          broadcast({
            type: 'chat',
            sender: player.nickname,
            text: text,
            isOp: player.isOp
          }, ws); // Vyloučit odesílatele, protože si zprávu zobrazil lokálně
          return;
        }

        // 4.5 Změna výbavy a oblečení (Synchronizace v reálném čase)
        if (msg.type === 'equipmentChange') {
          player.equipment = msg.equipment || player.equipment;
          player.skin = msg.skin || player.skin;
          player.heldItem = msg.heldItem !== undefined ? msg.heldItem : player.heldItem;
          broadcast({
            type: 'equipmentChange',
            id: player.id,
            equipment: player.equipment,
            skin: player.skin,
            heldItem: player.heldItem
          }, ws);
          return;
        }

        // 4.6 Útok a PvP boj mezi hráči
        if (msg.type === 'playerHit') {
          broadcast({
            type: 'playerHit',
            attackerId: player.id,
            attackerNick: player.nickname,
            targetId: msg.targetId,
            damage: msg.damage,
            knockback: msg.knockback,
            isCrit: !!msg.isCrit,
            weaponName: msg.weaponName || 'Zbraň'
          });
          return;
        }

        // 5. Statistiky hráče (HP, Stamina)
        if (msg.type === 'stats') {
          player.hp = msg.hp ?? player.hp;
          player.stamina = msg.stamina ?? player.stamina;
          return;
        }

        // 6. Ping / Pong pro měření odezvy
        if (msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', time: msg.time }));
          return;
        }

      } catch (err) {
        console.error('[WS Message Error]', err);
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
      log(`Hráč "${player.nickname}" (#${player.id}) se odpojil.`);

      broadcast({
        type: 'playerLeave',
        id: player.id,
        nickname: player.nickname
      });

      broadcast({
        type: 'chat',
        sender: 'Systém',
        text: `Hráč ${player.nickname} opustil svět.`,
        isSystem: true
      });
    });

    ws.on('error', (err) => {
      console.error(`[WS Error - ${player.nickname}]`, err.message);
    });
  });
}

// Zpracování herních příkazů
function handlePlayerCommand(ws, player, cmdString) {
  const parts = cmdString.slice(1).split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1);

  const sendNotice = (txt) => {
    ws.send(JSON.stringify({ type: 'chat', sender: 'Systém', text: txt, isSystem: true }));
  };

  if (cmd === 'help') {
    sendNotice('Dostupné příkazy:');
    sendNotice('/list – Seznam online hráčů');
    sendNotice('/spawn – Teleport na výchozí pozici');
    if (player.isOp) {
      sendNotice('--- Operátorské příkazy ---');
      sendNotice('/kick <nick> – Vyhodit hráče');
      sendNotice('/tp <x> <y> <z> nebo /tp <nick> – Teleportace');
      sendNotice('/time <den|noc> – Změna denní doby');
      sendNotice('/op <nick> – Udělit práva operátora');
      sendNotice('/deop <nick> – Odebrat práva operátora');
      sendNotice('/save – Uložit svět na disk');
    }
    return;
  }

  if (cmd === 'list') {
    const list = Array.from(clients.values()).map(p => (p.isOp ? '👑 ' : '') + p.nickname).join(', ');
    sendNotice(`Hráči online (${clients.size}/${config.maxPlayers}): ${list}`);
    return;
  }

  if (cmd === 'spawn') {
    ws.send(JSON.stringify({ type: 'teleport', x: 0, y: 80, z: 0 }));
    sendNotice('Byl jsi teleportován na spawn.');
    return;
  }

  if (cmd === 'tp') {
    if (args.length === 1) {
      const targetNick = args[0].toLowerCase();
      for (const [, p] of clients) {
        if (p.nickname.toLowerCase() === targetNick) {
          ws.send(JSON.stringify({ type: 'teleport', x: p.x, y: p.y, z: p.z }));
          sendNotice(`Teleportován k hráči ${p.nickname}.`);
          return;
        }
      }
      sendNotice(`Hráč "${args[0]}" nebyl nalezen.`);
      return;
    }
    // Pro teleport na konkrétní souřadnice vyžadovat OP
    if (!player.isOp) {
      sendNotice('Pro teleportaci na zadané souřadnice musíš být operátor (OP).');
      return;
    }
    if (args.length === 3) {
      const x = parseFloat(args[0]), y = parseFloat(args[1]), z = parseFloat(args[2]);
      if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
        ws.send(JSON.stringify({ type: 'teleport', x, y, z }));
        sendNotice(`Teleportován na: [${x}, ${y}, ${z}].`);
        return;
      }
    }
    sendNotice('Použití: /tp <nick> nebo /tp <x> <y> <z>');
    return;
  }

  // Příkazy vyžadující OP práva
  if (!player.isOp) {
    sendNotice('Neznámý příkaz nebo nemáš práva operátora (OP).');
    return;
  }

  if (cmd === 'time') {
    const sub = (args[0] || '').toLowerCase();
    let timeVal = 0.5; // den
    if (sub === 'noc' || sub === 'night') timeVal = 0.0;
    else if (sub === 'den' || sub === 'day') timeVal = 0.5;
    else if (!isNaN(parseFloat(sub))) timeVal = parseFloat(sub);

    broadcast({ type: 'setTime', time: timeVal });
    broadcast({ type: 'chat', sender: 'Systém', text: `Čas světa byl změněn operátorem ${player.nickname}.`, isSystem: true });
    return;
  }

  if (cmd === 'save') {
    saveWorld();
    sendNotice('Svět byl úspěšně uložen na disk.');
    return;
  }

  sendNotice(`Neznámý příkaz: /${cmd}. Napiš /help pro nápovědu.`);
}

// Generování HTML administrace
function renderAdminHtml() {
  const ips = getLocalIpAddresses();
  const uptime = Math.floor((Date.now() - startTime) / 1000);
  const hours = Math.floor(uptime / 3600);
  const mins = Math.floor((uptime % 3600) / 60);
  const secs = uptime % 60;
  const mem = (process.memoryUsage().rss / 1024 / 1024).toFixed(1);

  return `
    <!DOCTYPE html>
    <html lang="cs">
    <head>
      <meta charset="utf-8">
      <title>Administrace – ${config.serverName}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
      <style>
        :root {
          --bg: #090d16;
          --card: #131b2e;
          --border: #23314e;
          --primary: #10b981;
          --accent: #38bdf8;
          --danger: #ef4444;
          --text: #f1f5f9;
          --muted: #94a3b8;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Outfit', sans-serif; background: var(--bg); color: var(--text); padding: 24px; }
        .container { max-width: 1200px; margin: 0 auto; }
        header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid var(--border); }
        h1 { font-size: 26px; font-weight: 800; color: #fff; display: flex; align-items: center; gap: 10px; }
        .badge { background: rgba(16,185,129,0.2); color: #34d399; padding: 5px 12px; border-radius: 99px; font-size: 13px; font-weight: 700; border: 1px solid rgba(16,185,129,0.3); }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 18px; margin-bottom: 24px; }
        .stat-card { background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 18px; }
        .stat-label { font-size: 13px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
        .stat-val { font-size: 24px; font-weight: 800; color: #fff; }
        .main-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        @media(max-width: 900px) { .main-layout { grid-template-columns: 1fr; } }
        .panel { background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 20px; }
        .panel-head { font-size: 18px; font-weight: 700; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }
        .btn { padding: 8px 16px; border-radius: 10px; font-family: inherit; font-weight: 600; cursor: pointer; border: 1px solid transparent; transition: 0.2s; font-size: 13px; }
        .btn-primary { background: var(--primary); color: #022315; }
        .btn-primary:hover { opacity: 0.9; }
        .btn-outline { background: transparent; border-color: var(--border); color: var(--text); }
        .btn-outline:hover { background: rgba(255,255,255,0.06); }
        .btn-danger { background: var(--danger); color: #fff; }
        .table { width: 100%; border-collapse: collapse; font-size: 14px; }
        .table th, .table td { padding: 10px 12px; text-align: left; border-bottom: 1px solid var(--border); }
        .table th { color: var(--muted); font-weight: 600; }
        .console-box { background: #060911; border: 1px solid var(--border); border-radius: 10px; padding: 14px; font-family: 'JetBrains Mono', monospace; font-size: 12.5px; height: 260px; overflow-y: auto; color: #94a3b8; }
        .console-line { margin-bottom: 4px; line-height: 1.4; }
        .ip-box { background: rgba(56,189,248,0.1); border: 1px dashed rgba(56,189,248,0.35); border-radius: 12px; padding: 16px; margin-top: 16px; font-size: 13.5px; }
        .ip-badge { display: inline-block; background: #0f2338; color: #38bdf8; padding: 4px 10px; border-radius: 6px; font-family: monospace; font-weight: bold; margin: 4px 0; }
        input[type="text"] { width: 100%; padding: 10px 14px; border-radius: 10px; background: #060911; border: 1px solid var(--border); color: #fff; font-family: inherit; font-size: 13.5px; outline: none; margin-bottom: 10px; }
        input[type="text"]:focus { border-color: var(--accent); }
      </style>
    </head>
    <body>
      <div class="container">
        <header>
          <h1><span>🎮</span> ${config.serverName} <span class="badge">Online</span></h1>
          <button class="btn btn-primary" onclick="action('save')">💾 Uložit svět na disk</button>
        </header>

        <div class="grid">
          <div class="stat-card">
            <div class="stat-label">Hráči Online</div>
            <div class="stat-val">${clients.size} <span style="font-size:16px;color:var(--muted)">/ ${config.maxPlayers}</span></div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Uptime Serveru</div>
            <div class="stat-val">${hours}h ${mins}m ${secs}s</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Využití RAM</div>
            <div class="stat-val">${mem} MB</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Seed Světa</div>
            <div class="stat-val">${config.seed}</div>
          </div>
        </div>

        <div class="main-layout">
          <!-- Hráči Panel -->
          <div class="panel">
            <div class="panel-head">
              <span>Hráči na serveru (${clients.size})</span>
              <button class="btn btn-outline" onclick="location.reload()">Obnovit</button>
            </div>
            ${clients.size === 0 ? '<p style="color:var(--muted)">Zatím není připojen žádný hráč.</p>' : `
              <table class="table">
                <thead>
                  <tr><th>Nick</th><th>Role</th><th>Souřadnice</th><th>Akce</th></tr>
                </thead>
                <tbody>
                  ${Array.from(clients.values()).map(p => `
                    <tr>
                      <td><strong>${escapeHtml(p.nickname)}</strong></td>
                      <td>${p.isOp ? '<span style="color:#fbbf24">👑 Operátor</span>' : '<span style="color:var(--muted)">Hráč</span>'}</td>
                      <td style="font-family:monospace;font-size:12px">[${p.x.toFixed(0)}, ${p.y.toFixed(0)}, ${p.z.toFixed(0)}]</td>
                      <td>
                        <button class="btn btn-outline" style="padding:4px 8px;font-size:11px" onclick="toggleOp('${escapeHtml(p.nickname)}')">${p.isOp ? 'DeOP' : 'OP'}</button>
                        <button class="btn btn-danger" style="padding:4px 8px;font-size:11px" onclick="kick('${escapeHtml(p.nickname)}')">Vyhodit</button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            `}

            <!-- Návod na připojení -->
            <div class="ip-box">
              <h4 style="color:#38bdf8;margin-bottom:6px">Jak se mohou hráči připojit:</h4>
              <p style="color:var(--muted);margin-bottom:8px">1. <strong>Na stejné síti / Wi-Fi (LAN):</strong> zadejte do hry adresu:</p>
              ${ips.length ? ips.map(i => `<div><span class="ip-badge">${i.address}:${config.port}</span> (${i.iface})</div>`).join('') : '<span class="ip-badge">localhost:' + config.port + '</span>'}
              <p style="color:var(--muted);margin-top:10px">2. <strong>Přes internet bez veřejné IP:</strong> Doporučujeme použít <strong>Playit.gg</strong> nebo <strong>ngrok</strong> (přesměrovat port ${config.port}).</p>
            </div>
          </div>

          <!-- Konzole a Oznámení -->
          <div class="panel">
            <div class="panel-head">
              <span>Živý Záznam Serveru</span>
              <button class="btn btn-outline" onclick="location.reload()">Obnovit log</button>
            </div>
            <div class="console-box" id="consoleBox">
              ${serverLogs.map(l => `<div class="console-line">${escapeHtml(l)}</div>`).join('')}
            </div>
            <div style="margin-top: 14px;">
              <input type="text" id="broadcastMsg" placeholder="Napiš zprávu / oznámení do hry pro všechny hráče…">
              <button class="btn btn-primary" style="width:100%" onclick="sendBroadcast()">Odeslat zprávu do hry</button>
            </div>
          </div>
        </div>
      </div>

      <script>
        const cBox = document.getElementById('consoleBox');
        cBox.scrollTop = cBox.scrollHeight;

        async function action(act, extra = {}) {
          try {
            const res = await fetch('/api/admin/action', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(Object.assign({ action: act }, extra))
            });
            const data = await res.json();
            if (data.ok) location.reload();
            else alert(data.message || data.error || 'Akce se nezdařila');
          } catch (e) {
            alert('Chyba komunikace se serverem.');
          }
        }

        function kick(nick) {
          if (confirm('Opravdu chceš vyhodit hráče "' + nick + '"?')) {
            action('kick', { nickname: nick });
          }
        }

        function toggleOp(nick) {
          action('toggleOp', { nickname: nick });
        }

        function sendBroadcast() {
          const input = document.getElementById('broadcastMsg');
          const msg = input.value.trim();
          if (!msg) return;
          action('broadcast', { message: msg });
          input.value = '';
        }
      </script>
    </body>
    </html>
  `;
}

function escapeHtml(str) {
  if (typeof str !== 'string') return String(str);
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Spuštění serveru
httpServer.listen(config.port, '0.0.0.0', () => {
  console.log('\n' + '='.repeat(64));
  console.log(`   VOXELOVÝ SVĚT – HERNÍ SERVER BĚŽÍ!`);
  console.log('='.repeat(64));
  console.log(` * Herní Port:            ${config.port}`);
  console.log(` * Web Administrace:      http://localhost:${config.port}/admin`);
  console.log(` * Lokální adresy v síti:`);
  const ips = getLocalIpAddresses();
  if (ips.length) {
    ips.forEach(i => console.log(`    -> ws://${i.address}:${config.port} (${i.iface})`));
  } else {
    console.log(`    -> ws://localhost:${config.port}`);
  }
  console.log(` * Seed světa:            ${config.seed}`);
  console.log(` * Max hráčů:             ${config.maxPlayers}`);
  console.log('='.repeat(64) + '\n');
});

// Bezpečné ukončení při vypnutí (Ctrl+C / kill)
function shutdown() {
  console.log('\n[Server] Ukládám svět a ukončuji server…');
  saveWorld();
  saveOps();
  for (const [ws] of clients) {
    ws.send(JSON.stringify({ type: 'serverShutdown', message: 'Server byl administrátorem ukončen.' }));
    ws.close();
  }
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
