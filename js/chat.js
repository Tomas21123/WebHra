// ---------- Herní Chat a Příkazová Konzole (Minecraft Style) ----------
let chatOpen = false;
const chatHistory = [];
let chatHistoryIdx = -1;
let chatFadeTimeout = null;

// Autocomplete stav
let currentSuggestions = [];
let selectedSuggestionIdx = -1;

// Získání uživatelského jména přihlášeného hráče
function getPlayerNickname() {
  try {
    const raw = localStorage.getItem('voxel_auth_user');
    if (raw) {
      const u = JSON.parse(raw);
      if (u && (u.nickname || u.NickName)) {
        return (u.nickname || u.NickName).trim();
      }
    }
  } catch (e) {}
  return 'Hráč';
}

function escapeChatHtml(str) {
  if (typeof str !== 'string') return String(str);
  return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
}

// Získání přezdívek všech připojených online hráčů
function getOnlinePlayerNicknames() {
  const nicks = [];
  try {
    if (window.networkManager && window.networkManager.remotePlayers) {
      for (const [, p] of window.networkManager.remotePlayers) {
        if (p && p.nickname && !nicks.includes(p.nickname)) {
          nicks.push(p.nickname);
        }
      }
    }
  } catch (e) {}
  return nicks;
}

// Přidání zprávy do chatu
function addChatMessage(sender, text, type = 'user') {
  const box = $('chatBox');
  const msgs = $('chatMessages');
  if (!msgs) return;

  const row = document.createElement('div');
  row.className = `chat-msg ${type}`;

  if (type === 'user') {
    // Běžná zpráva hráče: viditelná pro odesílatele i všechny ostatní
    const nick = escapeChatHtml(sender || getPlayerNickname());
    const msg = escapeChatHtml(text);
    row.innerHTML = `<span class="chat-nick">(${nick})</span> <span class="chat-arrow">-&gt;</span> <span class="chat-body">${msg}</span>`;
  } else if (type === 'command') {
    // Příkaz zadaný hráčem: viditelný POUZE pro odesílatele, který ho zadal!
    const nick = escapeChatHtml(sender || getPlayerNickname());
    const msg = escapeChatHtml(text);
    row.innerHTML = `<span class="chat-nick">(${nick})</span> <span class="chat-arrow">-&gt;</span> <span class="chat-body chat-cmd-text">${msg}</span>`;
  } else if (type === 'system') {
    row.innerHTML = `<span class="chat-tag sys">[Systém]</span> <span class="chat-body">${text}</span>`;
  } else if (type === 'error') {
    row.innerHTML = `<span class="chat-tag err">[Chyba]</span> <span class="chat-body">${text}</span>`;
  } else if (type === 'info') {
    row.innerHTML = `<span class="chat-tag inf">[Info]</span> <span class="chat-body">${text}</span>`;
  }

  msgs.appendChild(row);

  // Omezení maximálního počtu zpráv v paměti DOM
  while (msgs.children.length > 100) {
    msgs.removeChild(msgs.firstChild);
  }

  msgs.scrollTop = msgs.scrollHeight;

  // Rozsvítit chat a obnovit časovač pro postupné mizení
  if (box) {
    box.classList.remove('chat-faded');
    if (chatFadeTimeout) clearTimeout(chatFadeTimeout);
    if (!chatOpen) {
      chatFadeTimeout = setTimeout(() => {
        if (!chatOpen && box) box.classList.add('chat-faded');
      }, 8500);
    }
  }
}

// =============================================================================
// NAŠEPTÁVAČ PŘÍKAZŮ (COMMAND AUTOCOMPLETE)
// =============================================================================

const COMMAND_DEFS = [
  {
    cmd: 'help',
    syntax: '/help',
    desc: 'Zobrazí přehled všech dostupných příkazů',
    getSuggestions: () => []
  },
  {
    cmd: 'tp',
    syntax: '/tp <hráč | x z | x y z>',
    desc: 'Teleportuje k hráči nebo na souřadnice',
    getSuggestions: (args) => {
      const suggestions = [];
      const onlinePlayers = getOnlinePlayerNicknames();

      if (args.length <= 1) {
        const prefix = (args[0] || '').toLowerCase();

        // 1. Nabídnout online hráče
        if (onlinePlayers.length > 0) {
          onlinePlayers
            .filter(n => !prefix || n.toLowerCase().startsWith(prefix))
            .forEach(n => {
              suggestions.push({
                insert: `/tp ${n}`,
                display: n,
                syntax: `/tp ${n}`,
                desc: `Teleport k hráči ${n}`
              });
            });
        } else {
          if (!prefix || '<hráč>'.startsWith(prefix)) {
            suggestions.push({
              insert: `/tp `,
              display: '<jméno_hráče>',
              syntax: `/tp <hráč>`,
              desc: 'Zadej jméno hráče pro teleport'
            });
          }
        }

        // 2. Nabídnout souřadnice
        if (!prefix || '~'.startsWith(prefix)) {
          suggestions.push({
            insert: '/tp ~ ~ ~',
            display: '~ ~ ~',
            syntax: '/tp ~ ~ ~',
            desc: 'Relativní souřadnice k tvé aktuální pozici'
          });
        }

        if (!prefix || '0'.startsWith(prefix)) {
          const curBX = typeof P !== 'undefined' ? Math.round(P.x / S) : 0;
          const curBZ = typeof P !== 'undefined' ? Math.round(P.z / S) : 0;
          suggestions.push({
            insert: `/tp ${curBX} ${curBZ}`,
            display: `${curBX} ${curBZ}`,
            syntax: '/tp <x> <z>',
            desc: 'Tvé aktuální souřadnice (povrch)'
          });
        }
      } else if (args.length === 2) {
        // Zadán X parametr, napovědět Z
        const x = args[0];
        const curBZ = typeof P !== 'undefined' ? Math.round(P.z / S) : 0;
        suggestions.push({
          insert: `/tp ${x} ${curBZ}`,
          display: `${x} ${curBZ}`,
          syntax: `/tp ${x} <z>`,
          desc: 'Cílová souřadnice Z (výška se dopočítá automaticky)'
        });
        suggestions.push({
          insert: `/tp ${x} 80 ${curBZ}`,
          display: `${x} 80 ${curBZ}`,
          syntax: `/tp ${x} <y> <z>`,
          desc: 'Zadání s přesnou výškou Y a souřadnicí Z'
        });
      } else if (args.length === 3) {
        const x = args[0];
        const y = args[1];
        const curBZ = typeof P !== 'undefined' ? Math.round(P.z / S) : 0;
        suggestions.push({
          insert: `/tp ${x} ${y} ${curBZ}`,
          display: `${x} ${y} ${curBZ}`,
          syntax: `/tp ${x} ${y} <z>`,
          desc: 'Cílová souřadnice Z'
        });
      }
      return suggestions;
    }
  },
  {
    cmd: 'spawn',
    syntax: '/spawn',
    desc: 'Teleportuje na výchozí bod (spawn) světa',
    getSuggestions: () => []
  },
  {
    cmd: 'locate',
    syntax: '/locate <biom>',
    desc: 'Vyhledá nejbližší biom a vypíše souřadnice',
    getSuggestions: (args) => {
      const biomes = [
        { name: 'les', desc: 'Horský les a zelené louky' },
        { name: 'poust', desc: 'Vyprahlá poušť a písečné duny' },
        { name: 'snih', desc: 'Sněžná tundra a ledové štíty' },
        { name: 'hory', desc: 'Skalnaté pohoří a vrcholky' },
        { name: 'plaz', desc: 'Písečné pobřeží a pláže' },
        { name: 'more', desc: 'Hluboké moře a oceány' },
        { name: 'prales', desc: 'Tropický deštný prales' }
      ];
      const prefix = (args[0] || '').toLowerCase();
      return biomes
        .filter(b => !prefix || b.name.startsWith(prefix))
        .map(b => ({
          insert: `/locate ${b.name}`,
          display: b.name,
          syntax: `/locate ${b.name}`,
          desc: b.desc
        }));
    }
  },
  {
    cmd: 'heal',
    syntax: '/heal',
    desc: 'Doplní životy (HP), staminu a kyslík na 100 %',
    getSuggestions: () => []
  },
  {
    cmd: 'time',
    syntax: '/time <den | noc | 0.0-1.0>',
    desc: 'Změní denní dobu herního světa',
    getSuggestions: (args) => {
      const times = [
        { name: 'den', desc: 'Nastaví slunečný den (poledne)' },
        { name: 'noc', desc: 'Nastaví noční hvězdnou oblohu' }
      ];
      const prefix = (args[0] || '').toLowerCase();
      return times
        .filter(t => !prefix || t.name.startsWith(prefix))
        .map(t => ({
          insert: `/time ${t.name}`,
          display: t.name,
          syntax: `/time ${t.name}`,
          desc: t.desc
        }));
    }
  },
  {
    cmd: 'give',
    syntax: '/give <předmět>',
    desc: 'Přidá vybraný voxelový předmět nebo zbraň',
    getSuggestions: (args) => {
      const prefix = (args[0] || '').toLowerCase();
      const items = (typeof INV !== 'undefined') ? INV : [
        { id: 'sword', name: 'Ocelový meč' },
        { id: 'wood', name: 'Dubové dřevo' },
        { id: 'stone', name: 'Kamenný blok' },
        { id: 'torch', name: 'Pochodeň' }
      ];
      return items
        .filter(it => !prefix || it.id.toLowerCase().startsWith(prefix) || it.name.toLowerCase().startsWith(prefix))
        .map(it => ({
          insert: `/give ${it.id}`,
          display: it.id,
          syntax: `/give ${it.id}`,
          desc: it.name
        }));
    }
  },
  {
    cmd: 'list',
    syntax: '/list',
    desc: 'Vypíše seznam všech připojených hráčů',
    getSuggestions: () => []
  },
  {
    cmd: 'clear',
    syntax: '/clear',
    desc: 'Vymaže historii zpráv v chatovacím okně',
    getSuggestions: () => []
  },
  {
    cmd: 'op',
    syntax: '/op <hráč>',
    desc: 'Udělit hráči práva operátora (OP)',
    getSuggestions: (args) => {
      const prefix = (args[0] || '').toLowerCase();
      return getOnlinePlayerNicknames()
        .filter(n => !prefix || n.toLowerCase().startsWith(prefix))
        .map(n => ({
          insert: `/op ${n}`,
          display: n,
          syntax: `/op ${n}`,
          desc: `Udělit OP práva hráči ${n}`
        }));
    }
  },
  {
    cmd: 'deop',
    syntax: '/deop <hráč>',
    desc: 'Odebrat práva operátora (OP)',
    getSuggestions: (args) => {
      const prefix = (args[0] || '').toLowerCase();
      return getOnlinePlayerNicknames()
        .filter(n => !prefix || n.toLowerCase().startsWith(prefix))
        .map(n => ({
          insert: `/deop ${n}`,
          display: n,
          syntax: `/deop ${n}`,
          desc: `Odebrat OP práva hráči ${n}`
        }));
    }
  },
  {
    cmd: 'kick',
    syntax: '/kick <hráč>',
    desc: 'Vyhodit hráče ze světa',
    getSuggestions: (args) => {
      const prefix = (args[0] || '').toLowerCase();
      return getOnlinePlayerNicknames()
        .filter(n => !prefix || n.toLowerCase().startsWith(prefix))
        .map(n => ({
          insert: `/kick ${n}`,
          display: n,
          syntax: `/kick ${n}`,
          desc: `Vyhodit hráče ${n}`
        }));
    }
  }
];

// Aktualizace našeptávače podle aktuálního textu v inputu
function updateChatAutocomplete() {
  const input = $('chatInput');
  const container = $('chatAutocomplete');
  if (!input || !container) return;

  const val = input.value;

  // Našeptávač se zobrazuje pouze při psaní příkazů začínajících lomítkem '/'
  if (!val.startsWith('/')) {
    hideChatAutocomplete();
    return;
  }

  const withoutSlash = val.slice(1);
  const parts = withoutSlash.split(/\s+/);
  const cmdQuery = (parts[0] || '').toLowerCase();
  const hasSpace = withoutSlash.includes(' ');

  if (!hasSpace) {
    // Uživatel píše název příkazu (např. /, /t, /tp, /h, /he)
    const matches = COMMAND_DEFS.filter(def => def.cmd.startsWith(cmdQuery));
    currentSuggestions = matches.map(def => ({
      insert: `/${def.cmd} `,
      display: `/${def.cmd}`,
      syntax: def.syntax,
      desc: def.desc
    }));
  } else {
    // Příkaz je zvolen, napovídáme jeho parametry (např. /tp [jméno], /locate [biom])
    const def = COMMAND_DEFS.find(d => d.cmd === cmdQuery);
    if (def && typeof def.getSuggestions === 'function') {
      const args = parts.slice(1);
      // Pokud vstup končí mezerou a poslední prvek není prázdný řetězec, přidáme prázdný parametr pro další argument
      if (val.endsWith(' ') && args[args.length - 1] !== '') {
        args.push('');
      }
      currentSuggestions = def.getSuggestions(args);
    } else {
      currentSuggestions = [];
    }
  }

  if (selectedSuggestionIdx >= currentSuggestions.length) {
    selectedSuggestionIdx = currentSuggestions.length > 0 ? 0 : -1;
  }

  renderChatAutocomplete();
}

// Vykreslení návrhů v okně našeptávače
function renderChatAutocomplete() {
  const container = $('chatAutocomplete');
  if (!container) return;

  if (currentSuggestions.length === 0) {
    hideChatAutocomplete();
    return;
  }

  container.hidden = false;
  let html = '';
  currentSuggestions.forEach((s, idx) => {
    const isSel = idx === selectedSuggestionIdx ? ' selected' : '';
    html += `
      <div class="chat-ac-item${isSel}" data-idx="${idx}">
        <span class="chat-ac-cmd">${escapeChatHtml(s.display)}</span>
        ${s.syntax ? `<span class="chat-ac-syntax">${escapeChatHtml(s.syntax)}</span>` : ''}
        <span class="chat-ac-desc">${escapeChatHtml(s.desc || '')}</span>
      </div>
    `;
  });
  container.innerHTML = html;

  // Interakce kliknutím myši
  container.querySelectorAll('.chat-ac-item').forEach(el => {
    el.addEventListener('mousedown', (e) => {
      e.preventDefault(); // Zabránit ztrátě fokusu z inputu
      const idx = parseInt(el.getAttribute('data-idx'), 10);
      applyAutocomplete(idx);
    });
  });

  // Odrolovat na vybraný prvek
  const selEl = container.querySelector('.chat-ac-item.selected');
  if (selEl) {
    selEl.scrollIntoView({ block: 'nearest' });
  }
}

// Aplikování vybraného návrhu do inputu
function applyAutocomplete(idx) {
  const input = $('chatInput');
  if (!input || idx < 0 || idx >= currentSuggestions.length) return;

  const s = currentSuggestions[idx];
  input.value = s.insert;
  input.focus();
  input.setSelectionRange(input.value.length, input.value.length);
  selectedSuggestionIdx = -1;
  updateChatAutocomplete();
}

function hideChatAutocomplete() {
  const container = $('chatAutocomplete');
  if (container) {
    container.innerHTML = '';
    container.hidden = true;
  }
  currentSuggestions = [];
  selectedSuggestionIdx = -1;
}

// =============================================================================
// OTEVŘENÍ, ZAVŘENÍ A ODESÍLÁNÍ CHATU
// =============================================================================

// Otevření konzole a chatu
function openChat(initialChar = '') {
  if (typeof escOpen !== 'undefined' && escOpen) return;
  if (typeof charOpen !== 'undefined' && charOpen) return;
  if (typeof invOpen !== 'undefined' && invOpen) return;

  if (typeof emoteOpen !== 'undefined' && emoteOpen && typeof closeEmotes === 'function') {
    closeEmotes();
  }

  chatOpen = true;
  chatHistoryIdx = -1;
  selectedSuggestionIdx = -1;

  try {
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
  } catch (e) {}

  if (typeof keys !== 'undefined') {
    for (const k in keys) keys[k] = 0;
  }
  if (typeof P !== 'undefined') {
    P.moveX = 0;
    P.moveZ = 0;
  }

  const box = $('chatBox');
  const inputRow = $('chatInputRow');
  const input = $('chatInput');
  const msgs = $('chatMessages');

  if (box) {
    box.classList.add('chat-active');
    box.classList.remove('chat-faded');
  }
  if (chatFadeTimeout) clearTimeout(chatFadeTimeout);

  if (inputRow) inputRow.hidden = false;

  if (input) {
    input.value = initialChar;
    input.focus();
    if (initialChar) {
      input.setSelectionRange(initialChar.length, initialChar.length);
    }
    // Okamžitě aktualizovat našeptávač (např. pokud byl chat otevřen lomítkem '/')
    updateChatAutocomplete();
  }

  if (msgs) msgs.scrollTop = msgs.scrollHeight;
}

// Uzavření konzole / chatu
function closeChat(focusGame = true) {
  chatOpen = false;
  chatHistoryIdx = -1;
  hideChatAutocomplete();

  const box = $('chatBox');
  const inputRow = $('chatInputRow');
  const input = $('chatInput');

  if (inputRow) inputRow.hidden = true;
  if (input) {
    input.value = '';
    input.blur();
  }
  if (box) {
    box.classList.remove('chat-active');
    if (chatFadeTimeout) clearTimeout(chatFadeTimeout);
    chatFadeTimeout = setTimeout(() => {
      if (!chatOpen && box) box.classList.add('chat-faded');
    }, 8500);
  }

  if (focusGame) {
    try {
      (window.cv || (window.renderer && renderer.domElement))?.focus?.();
    } catch (e) {}
  }
}

// Zpracování odeslání zprávy z konzole
function sendChatMessage() {
  const input = $('chatInput');
  if (!input) return;

  const raw = input.value.trim();
  if (!raw) {
    closeChat();
    return;
  }

  // Uložit do lokální historie odeslaných řádků
  if (chatHistory.length === 0 || chatHistory[chatHistory.length - 1] !== raw) {
    chatHistory.push(raw);
    if (chatHistory.length > 50) chatHistory.shift();
  }

  hideChatAutocomplete();

  if (raw.startsWith('/')) {
    // Ověření oprávnění používat příkazy (hostitel má povoleno, hosté v základu vypnuto)
    if (typeof canUseCommands === 'function' && !canUseCommands()) {
      addChatMessage('Systém', '⛔ Nemáš oprávnění používat herní příkazy. Hostitel ti musí povolit příkazy v menu [ESC] -> Otevřít pro přátele.', 'error');
      closeChat();
      return;
    }

    // -------------------------------------------------------------------------
    // PŘÍKAZ (začíná lomítkem):
    // Zobrazuje se v historii POUZE hráči, který jej zadal!
    // Ostatním hráčům se v chatu vůbec nezobrazí.
    // -------------------------------------------------------------------------
    addChatMessage(getPlayerNickname(), raw, 'command');

    if (window.networkManager && window.networkManager.socket && window.networkManager.socket.readyState === WebSocket.OPEN) {
      // Dedikovaný WebSocket multiplayer server
      window.networkManager.sendChatMessage(raw);
    } else {
      // Singleplayer nebo Peer-to-Peer klient/host
      executeCommand(raw);
    }
  } else {
    // -------------------------------------------------------------------------
    // BĚŽNÁ ZPRÁVA:
    // Zobrazuje se v historii odesílateli i VŠEM ostatním hráčům!
    // -------------------------------------------------------------------------
    addChatMessage(getPlayerNickname(), raw, 'user');

    if (window.networkManager && window.networkManager.connected) {
      window.networkManager.sendChatMessage(raw);
    }
  }

  closeChat();
}

// Vyhledávač biomů v herním světě pro příkaz /locate
function findNearestBiome(query) {
  const norm = (query || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  let matcher = null;
  let targetName = '';

  if (norm.includes('poust') || norm.includes('pisek') || norm.includes('desert') || norm.includes('dune')) {
    matcher = (x, z, h, b) => b === 1 && h > SEA + 2;
    targetName = 'Vyprahlá poušť';
  } else if (norm.includes('snih') || norm.includes('snez') || norm.includes('tundr') || norm.includes('snow') || norm.includes('led') || norm.includes('ice')) {
    matcher = (x, z, h, b) => (b === 2 || h >= 135) && h > SEA;
    targetName = 'Sněžná tundra a ledové štíty';
  } else if (norm.includes('hor') || norm.includes('skal') || norm.includes('mount') || norm.includes('vrchol')) {
    matcher = (x, z, h, b) => h >= 80;
    targetName = 'Skalnaté pohoří a štíty';
  } else if (norm.includes('mor') || norm.includes('ocean') || norm.includes('vod') || norm.includes('sea')) {
    matcher = (x, z, h, b) => h < SEA;
    targetName = 'Hluboké moře & oceán';
  } else if (norm.includes('plaz') || norm.includes('beach') || norm.includes('pobrez')) {
    matcher = (x, z, h, b) => h >= SEA && h <= SEA + 2;
    targetName = 'Písečná pláž';
  } else if (norm.includes('prales') || norm.includes('jungl') || norm.includes('dest')) {
    matcher = (x, z, h, b) => b === 3;
    targetName = 'Tropický prales & džungle';
  } else if (norm.includes('les') || norm.includes('louk') || norm.includes('forest') || norm.includes('plain')) {
    matcher = (x, z, h, b) => b === 0 && h > SEA + 2 && h < 80;
    targetName = 'Horský les a louky';
  } else {
    return {
      error: `Neznámý biom "${query}". Dostupné biomy: les, poust, snih, hory, plaz, more, prales.`
    };
  }

  const px = Math.floor(P.x / S);
  const pz = Math.floor(P.z / S);

  const curH = height(px, pz);
  const curB = biome(px, pz, curH);
  if (matcher(px, pz, curH, curB)) {
    return { x: px, y: curH, z: pz, dist: 0, name: targetName, alreadyHere: true };
  }

  const step = 16;
  const maxRadius = 3200;

  for (let r = step; r <= maxRadius; r += step) {
    for (let i = -r; i <= r; i += step) {
      const candidates = [
        [px + i, pz - r],
        [px + i, pz + r],
        [px - r, pz + i],
        [px + r, pz + i]
      ];
      for (const [x, z] of candidates) {
        const h = height(x, z);
        const b = biome(x, z, h);
        if (matcher(x, z, h, b)) {
          const dist = Math.round(Math.hypot(x - px, z - pz));
          return { x, y: h, z, dist, name: targetName };
        }
      }
    }
  }

  return { notFound: true, name: targetName };
}

// Pomocná funkce pro vyhodnocení relativních souřadnic (~, ~10, atd.)
function parseCoordinate(token, currentVal) {
  if (typeof token !== 'string') return NaN;
  token = token.trim();
  if (token === '~') return currentVal;
  if (token.startsWith('~')) {
    const diff = parseFloat(token.slice(1));
    return isNaN(diff) ? NaN : Math.round(currentVal + diff);
  }
  const val = parseFloat(token);
  return isNaN(val) ? NaN : Math.round(val);
}

// Kontrola oprávnění pro příkazy
function canUseCommands() {
  if (typeof window.networkManager !== 'undefined' && window.networkManager) {
    if (window.networkManager.isP2PClient) {
      return !!window.networkManager.commandsAllowed;
    }
    if (window.networkManager.isP2PHost) {
      return window.networkManager.hostCommandsAllowed !== false;
    }
  }
  return true;
}
window.canUseCommands = canUseCommands;

// Zpracování příkazů konzole
function executeCommand(cmdStr) {
  if (!canUseCommands()) {
    addChatMessage('Systém', '⛔ Nemáš oprávnění používat herní příkazy. Hostitel ti musí povolit příkazy v menu [ESC] -> Otevřít pro přátele.', 'error');
    return;
  }

  const parts = cmdStr.trim().slice(1).split(/\s+/);
  const cmd = (parts[0] || '').toLowerCase();
  const args = parts.slice(1);

  switch (cmd) {
    case 'locate': {
      if (args.length === 0) {
        addChatMessage(null, 'Použití: <code>/locate &lt;biom&gt;</code>.<br>Dostupné biomy: <strong>les</strong>, <strong>poust</strong>, <strong>snih</strong>, <strong>hory</strong>, <strong>plaz</strong>, <strong>more</strong>, <strong>prales</strong>.', 'info');
        return;
      }
      const query = args.join(' ');
      const res = findNearestBiome(query);
      if (res.error) {
        addChatMessage(null, res.error, 'error');
      } else if (res.alreadyHere) {
        addChatMessage(null, `Již se nacházíš v biomu <strong>${res.name}</strong> na souřadnicích X: ${res.x}, Y: ${res.y}, Z: ${res.z}.`, 'info');
      } else if (res.notFound) {
        addChatMessage(null, `Biom "${res.name}" nebyl v okruhu 3200 bloků nalezen.`, 'error');
      } else {
        const tpCmd = `/tp ${res.x} ${res.z}`;
        addChatMessage(
          null,
          `Nejbližší biom <strong>${res.name}</strong> nalezen na souřadnicích: <strong>X: ${res.x}, Y: ${res.y}, Z: ${res.z}</strong> (vzdálenost: ${res.dist} bloků / ${(res.dist * S).toFixed(0)} m).<br><span style="opacity:0.85">Pro rychlý teleport napiš: <span class="chat-clickable-cmd" onclick="openChat('${tpCmd}')">${tpCmd}</span></span>`,
          'system'
        );
      }
      break;
    }

    case 'tp':
    case 'teleport': {
      if (args.length < 1) {
        addChatMessage(null, 'Použití: <code>/tp &lt;jméno hráče&gt;</code> nebo <code>/tp &lt;X&gt; &lt;Z&gt;</code> nebo <code>/tp &lt;X&gt; &lt;Y&gt; &lt;Z&gt;</code>.', 'info');
        return;
      }

      // 1. /tp <jmenohrace> - Teleport k jinému hráči
      if (args.length === 1) {
        const targetQuery = args[0].trim().toLowerCase();
        let targetPlayer = null;

        // Prohledat připojené vzdálené hráče v síťovém manažeru
        if (window.networkManager && window.networkManager.remotePlayers) {
          for (const [, p] of window.networkManager.remotePlayers) {
            if (p && p.nickname && p.nickname.trim().toLowerCase() === targetQuery) {
              targetPlayer = p;
              break;
            }
          }
          if (!targetPlayer) {
            for (const [, p] of window.networkManager.remotePlayers) {
              if (p && p.nickname && p.nickname.trim().toLowerCase().includes(targetQuery)) {
                targetPlayer = p;
                break;
              }
            }
          }
        }

        if (targetPlayer) {
          const tx = targetPlayer.group ? targetPlayer.group.position.x : (targetPlayer.targetX || 0);
          const ty = targetPlayer.group ? targetPlayer.group.position.y : (targetPlayer.targetY || 80);
          const tz = targetPlayer.group ? targetPlayer.group.position.z : (targetPlayer.targetZ || 0);

          P.x = tx;
          P.y = ty + 0.15;
          P.z = tz;
          P.vx = 0;
          P.vy = 0;
          P.vz = 0;

          if (typeof lastC !== 'undefined') lastC = '';
          if (typeof markExploredAroundPlayer === 'function') markExploredAroundPlayer();
          if (typeof mmNeedsRebuild !== 'undefined') mmNeedsRebuild = true;

          const tbX = Math.round(P.x / S);
          const tbY = Math.round(P.y / S);
          const tbZ = Math.round(P.z / S);

          addChatMessage(null, `Úspěšně teleportován k hráči <strong>${escapeChatHtml(targetPlayer.nickname)}</strong> na pozici [${tbX}, ${tbY}, ${tbZ}].`, 'system');
          if (typeof toast === 'function') {
            toast(`Teleport k hráči: ${targetPlayer.nickname}`);
          }
          return;
        }

        addChatMessage(null, `Hráč "<strong>${escapeChatHtml(args[0])}</strong>" nebyl ve světě nalezen. Zadej správné jméno nebo souřadnice (např. <code>/tp 150 250</code>).`, 'error');
        return;
      }

      // 2. /tp <X> <Z> nebo /tp <X> <Y> <Z>
      const curBX = Math.floor(P.x / S);
      const curBY = Math.floor(P.y / S);
      const curBZ = Math.floor(P.z / S);

      let targetBX, targetBY, targetBZ;

      if (args.length === 2) {
        targetBX = parseCoordinate(args[0], curBX);
        targetBZ = parseCoordinate(args[1], curBZ);
        if (isNaN(targetBX) || isNaN(targetBZ)) {
          addChatMessage(null, 'Neplatné souřadnice. Zadej čísla, např. <code>/tp 150 250</code>.', 'error');
          return;
        }
        targetBY = Math.max(height(targetBX, targetBZ), SEA) + 2;
      } else {
        targetBX = parseCoordinate(args[0], curBX);
        targetBY = parseCoordinate(args[1], curBY);
        targetBZ = parseCoordinate(args[2], curBZ);
        if (isNaN(targetBX) || isNaN(targetBY) || isNaN(targetBZ)) {
          addChatMessage(null, 'Neplatné souřadnice. Zadej čísla, např. <code>/tp 150 70 250</code>.', 'error');
          return;
        }
      }

      targetBX = Math.max(-50000, Math.min(50000, targetBX));
      targetBZ = Math.max(-50000, Math.min(50000, targetBZ));
      targetBY = Math.max(2, Math.min(300, targetBY));

      P.x = targetBX * S + S / 2;
      P.y = targetBY * S + 0.1;
      P.z = targetBZ * S + S / 2;
      P.vx = 0;
      P.vy = 0;
      P.vz = 0;

      if (typeof lastC !== 'undefined') lastC = '';
      if (typeof markExploredAroundPlayer === 'function') markExploredAroundPlayer();
      if (typeof mmNeedsRebuild !== 'undefined') mmNeedsRebuild = true;

      addChatMessage(null, `Úspěšně teleportován na souřadnice <strong>X: ${targetBX}, Y: ${targetBY}, Z: ${targetBZ}</strong>.`, 'system');
      if (typeof toast === 'function') {
        toast(`Teleport: X: ${targetBX}, Y: ${targetBY}, Z: ${targetBZ}`);
      }
      break;
    }

    case 'spawn': {
      P.x = SPX;
      P.z = (typeof SPZ !== 'undefined') ? SPZ : 0.5;
      P.y = SPY;
      P.vx = 0; P.vy = 0; P.vz = 0;
      if (typeof lastC !== 'undefined') lastC = '';
      if (typeof markExploredAroundPlayer === 'function') markExploredAroundPlayer();
      if (typeof mmNeedsRebuild !== 'undefined') mmNeedsRebuild = true;

      const spXb = Math.round(SPX / S);
      const spYb = Math.round(SPY / S);
      const spZb = Math.round(P.z / S);
      addChatMessage(null, `Teleportován na výchozí spawn světa (X: ${spXb}, Y: ${spYb}, Z: ${spZb}).`, 'system');
      if (typeof toast === 'function') toast('Teleportován na spawn');
      break;
    }

    case 'heal': {
      G.hp = 100;
      G.st = 100;
      G.o2 = 100;
      G.tired = 0;
      if (typeof ui === 'function') ui();
      addChatMessage(null, 'Životy, stamina a kyslík byly obnoveny na 100 %.', 'system');
      if (typeof toast === 'function') toast('Životy a stamina doplněny');
      break;
    }

    case 'time': {
      if (args.length === 0) {
        addChatMessage(null, 'Použití: <code>/time &lt;den | noc | hodnota 0.0 - 1.0&gt;</code>.', 'info');
        return;
      }
      const sub = (args[0] || '').toLowerCase();
      let tVal = 0.5;
      if (sub === 'noc' || sub === 'night') tVal = 0.0;
      else if (sub === 'den' || sub === 'day') tVal = 0.5;
      else if (!isNaN(parseFloat(sub))) tVal = parseFloat(sub);

      if (typeof worldTime !== 'undefined') worldTime = tVal;
      addChatMessage(null, `Čas světa byl nastaven na <strong>${sub === 'noc' ? 'noc' : sub === 'den' ? 'den' : tVal}</strong>.`, 'system');
      if (typeof toast === 'function') toast(`Čas nastaven: ${sub}`);
      break;
    }

    case 'give': {
      if (args.length === 0) {
        addChatMessage(null, 'Použití: <code>/give &lt;id_předmětu&gt;</code> (např. <code>/give sword</code>, <code>/give wood</code>).', 'info');
        return;
      }
      const itemId = args[0].toLowerCase();
      const it = (typeof INV !== 'undefined') ? INV.find(x => x.id === itemId || x.id.includes(itemId)) : null;
      if (it) {
        if (typeof HB !== 'undefined') {
          let emptySlot = HB.indexOf(null);
          if (emptySlot === -1 && HB.length < (typeof MAXHB !== 'undefined' ? MAXHB : 9)) {
            HB.push(it.id);
            emptySlot = HB.length - 1;
          } else if (emptySlot !== -1) {
            HB[emptySlot] = it.id;
          } else {
            HB[0] = it.id;
            emptySlot = 0;
          }
          if (typeof renderHB === 'function') renderHB();
          if (typeof selSlot === 'function') selSlot(emptySlot);
          addChatMessage(null, `Předmět <strong>${escapeChatHtml(it.name)}</strong> byl přidán do tvé lišty.`, 'system');
          if (typeof toast === 'function') toast(`Získáno: ${it.name}`);
        }
      } else {
        addChatMessage(null, `Neznámý předmět "${escapeChatHtml(args[0])}".`, 'error');
      }
      break;
    }

    case 'list': {
      const players = getOnlinePlayerNicknames();
      const myNick = getPlayerNickname();
      const all = [myNick + ' (Ty)', ...players];
      addChatMessage(null, `<strong>Hráči ve světě (${all.length}):</strong> ${all.map(escapeChatHtml).join(', ')}`, 'info');
      break;
    }

    case 'clear': {
      const msgs = $('chatMessages');
      if (msgs) msgs.innerHTML = '';
      addChatMessage(null, 'Konzole byla vyčištěna.', 'info');
      break;
    }

    case 'help': {
      addChatMessage(
        null,
        `<strong>Dostupné příkazy konzole:</strong><br>` +
        `• <code>/tp &lt;jméno hráče&gt;</code> – Teleportuje přímo k vybranému hráči<br>` +
        `• <code>/tp &lt;X&gt; [Y] &lt;Z&gt;</code> – Teleportuje na dané souřadnice světa<br>` +
        `• <code>/locate &lt;biom&gt;</code> – Vyhledá biom (les, poust, snih, hory, plaz, more, prales)<br>` +
        `• <code>/spawn</code> – Teleportuje hráče zpět na výchozí spawn<br>` +
        `• <code>/heal</code> – Okamžitě doplní životy (HP), staminu a kyslík na 100 %<br>` +
        `• <code>/time &lt;den | noc&gt;</code> – Nastaví denní dobu světa<br>` +
        `• <code>/give &lt;předmět&gt;</code> – Přidá voxelový předmět do lišty<br>` +
        `• <code>/list</code> – Vypíše seznam připojených hráčů<br>` +
        `• <code>/clear</code> – Vymaže historii zpráv v konzoli<br>` +
        `• <code>/help</code> – Zobrazí tento přehled příkazů`,
        'info'
      );
      break;
    }

    default: {
      addChatMessage(null, `Neznámý příkaz "<strong>/${escapeChatHtml(cmd)}</strong>". Napiš <code>/help</code> pro seznam příkazů.`, 'error');
      break;
    }
  }
}

// Inicializace listenerů chatu
function initChatListeners() {
  const input = $('chatInput');
  const btnSend = $('chatSendBtn');

  if (input) {
    // Reaktivní našeptávač při každém stisku klávesy
    input.addEventListener('input', () => {
      updateChatAutocomplete();
    });

    input.addEventListener('keydown', e => {
      // Zamezit probublávání do hry (WASD, mezerník apod.)
      e.stopPropagation();

      const acContainer = $('chatAutocomplete');
      const isAcVisible = acContainer && !acContainer.hidden && currentSuggestions.length > 0;

      if (e.key === 'Tab') {
        // Klávesa TAB: doplní vybraný nebo první návrh našeptávače
        if (isAcVisible) {
          e.preventDefault();
          const targetIdx = selectedSuggestionIdx >= 0 ? selectedSuggestionIdx : 0;
          applyAutocomplete(targetIdx);
          return;
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (isAcVisible) {
          // Navigace dolů v nabídce našeptávače
          selectedSuggestionIdx = (selectedSuggestionIdx + 1) % currentSuggestions.length;
          renderChatAutocomplete();
          return;
        }

        // Navigace historií zpráv dolů
        if (chatHistoryIdx !== -1) {
          if (chatHistoryIdx < chatHistory.length - 1) {
            chatHistoryIdx++;
            input.value = chatHistory[chatHistoryIdx] || '';
          } else {
            chatHistoryIdx = -1;
            input.value = '';
          }
          setTimeout(() => input.setSelectionRange(input.value.length, input.value.length), 0);
          updateChatAutocomplete();
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (isAcVisible) {
          // Navigace nahoru v nabídce našeptávače
          if (selectedSuggestionIdx <= 0) {
            selectedSuggestionIdx = currentSuggestions.length - 1;
          } else {
            selectedSuggestionIdx--;
          }
          renderChatAutocomplete();
          return;
        }

        // Navigace historií zpráv nahoru
        if (chatHistory.length > 0) {
          if (chatHistoryIdx === -1) {
            chatHistoryIdx = chatHistory.length - 1;
          } else if (chatHistoryIdx > 0) {
            chatHistoryIdx--;
          }
          input.value = chatHistory[chatHistoryIdx] || '';
          setTimeout(() => input.setSelectionRange(input.value.length, input.value.length), 0);
          updateChatAutocomplete();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (isAcVisible) {
          hideChatAutocomplete();
        } else {
          closeChat();
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        sendChatMessage();
      }
    });

    input.addEventListener('keyup', e => e.stopPropagation());
    input.addEventListener('keypress', e => e.stopPropagation());
  }

  if (btnSend) {
    btnSend.addEventListener('click', e => {
      e.stopPropagation();
      sendChatMessage();
    });
  }
}

// Spustit uvítací zprávu v konzoli
window.addEventListener('DOMContentLoaded', () => {
  initChatListeners();
  setTimeout(() => {
    addChatMessage(
      null,
      `Vítej ve světě! Stiskni <strong>[T]</strong> pro otevření chatu nebo <strong>[/]</strong> pro zadání příkazů (např. <code>/help</code>, <code>/tp</code>, <code>/locate</code>).`,
      'info'
    );
  }, 1200);
});
