// ---------- Herní Chat a Příkazová Konzole (Minecraft Style) ----------
let chatOpen = false;
const chatHistory = [];
let chatHistoryIdx = -1;
let chatFadeTimeout = null;

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

// Přidání zprávy do chatu
function addChatMessage(sender, text, type = 'user') {
  const box = $('chatBox');
  const msgs = $('chatMessages');
  if (!msgs) return;

  const row = document.createElement('div');
  row.className = `chat-msg ${type}`;

  if (type === 'user') {
    // Přesný formát podle zadání: "(Hracuv NickName) -> (zpráva kterou hráč napsal)"
    const nick = escapeChatHtml(sender || getPlayerNickname());
    const msg = escapeChatHtml(text);
    row.innerHTML = `<span class="chat-nick">(${nick})</span> <span class="chat-arrow">-&gt;</span> <span class="chat-body">${msg}</span>`;
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

// Otevření konzole a chatu
function openChat(initialChar = '') {
  if (typeof escOpen !== 'undefined' && escOpen) return;
  if (typeof charOpen !== 'undefined' && charOpen) return;
  if (typeof invOpen !== 'undefined' && invOpen) return;

  // Pokud je otevřená minimapa nebo emoty, zavřít je pro psaní do konzole
  if (typeof emoteOpen !== 'undefined' && emoteOpen && typeof closeEmotes === 'function') {
    closeEmotes();
  }

  chatOpen = true;
  chatHistoryIdx = -1;

  // Uvolnit kurzor ze 3D pohledu
  try {
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
  } catch (e) {}

  // Zastavit aktuální pohyb postavy, aby hráč neodjel při psaní
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
  }

  if (msgs) msgs.scrollTop = msgs.scrollHeight;
}

// Uzavření konzole / chatu
function closeChat(focusGame = true) {
  chatOpen = false;
  chatHistoryIdx = -1;

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
    // Nastavit odpočet pro vyblednutí zpráv
    if (chatFadeTimeout) clearTimeout(chatFadeTimeout);
    chatFadeTimeout = setTimeout(() => {
      if (!chatOpen && box) box.classList.add('chat-faded');
    }, 8500);
  }

  // Vrátit focus zpět do hry
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

  // Uložit do historie příkazů
  if (chatHistory.length === 0 || chatHistory[chatHistory.length - 1] !== raw) {
    chatHistory.push(raw);
    if (chatHistory.length > 50) chatHistory.shift();
  }

  if (raw.startsWith('/')) {
    // Příkaz
    executeCommand(raw);
  } else {
    // Běžná zpráva hráče
    addChatMessage(getPlayerNickname(), raw, 'user');
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

  // Zda je hráč již uvnitř daného biomu
  const curH = height(px, pz);
  const curB = biome(px, pz, curH);
  if (matcher(px, pz, curH, curB)) {
    return { x: px, y: curH, z: pz, dist: 0, name: targetName, alreadyHere: true };
  }

  // Spirálové vyhledávání po 16 blocích (1 chunk) do okruhu 3200 bloků
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

// Zpracování příkazů konzole
function executeCommand(cmdStr) {
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
        addChatMessage(null, 'Použití: <code>/tp &lt;X&gt; &lt;Z&gt;</code> nebo <code>/tp &lt;X&gt; &lt;Y&gt; &lt;Z&gt;</code> (lze použít i ~ pro relativní pozici).', 'info');
        return;
      }

      const curBX = Math.floor(P.x / S);
      const curBY = Math.floor(P.y / S);
      const curBZ = Math.floor(P.z / S);

      let targetBX, targetBY, targetBZ;

      if (args.length === 1) {
        // Jedna hodnota: neplatné
        addChatMessage(null, 'Musíš zadat alespoň dvě souřadnice X a Z (např. <code>/tp 100 200</code>).', 'error');
        return;
      } else if (args.length === 2) {
        // /tp X Z -> automatická bezpečná výška povrchu
        targetBX = parseCoordinate(args[0], curBX);
        targetBZ = parseCoordinate(args[1], curBZ);
        if (isNaN(targetBX) || isNaN(targetBZ)) {
          addChatMessage(null, 'Neplatné souřadnice. Zadej čísla, např. <code>/tp 150 250</code>.', 'error');
          return;
        }
        targetBY = Math.max(height(targetBX, targetBZ), SEA) + 2;
      } else {
        // /tp X Y Z
        targetBX = parseCoordinate(args[0], curBX);
        targetBY = parseCoordinate(args[1], curBY);
        targetBZ = parseCoordinate(args[2], curBZ);
        if (isNaN(targetBX) || isNaN(targetBY) || isNaN(targetBZ)) {
          addChatMessage(null, 'Neplatné souřadnice. Zadej čísla, např. <code>/tp 150 70 250</code>.', 'error');
          return;
        }
      }

      // Bezpečné meze světa
      targetBX = Math.max(-50000, Math.min(50000, targetBX));
      targetBZ = Math.max(-50000, Math.min(50000, targetBZ));
      targetBY = Math.max(2, Math.min(300, targetBY));

      // Teleportace hráče ve Three.js světě
      P.x = targetBX * S + S / 2;
      P.y = targetBY * S + 0.1;
      P.z = targetBZ * S + S / 2;
      P.vx = 0;
      P.vy = 0;
      P.vz = 0;

      // Resetovat chunk tracker, aby se okamžitě vygeneroval nový terén v cíli
      if (typeof lastC !== 'undefined') {
        lastC = '';
      }

      // Zaznamenat do mapy
      if (typeof markExploredAroundPlayer === 'function') {
        markExploredAroundPlayer();
      }
      if (typeof mmNeedsRebuild !== 'undefined') {
        mmNeedsRebuild = true;
      }

      addChatMessage(null, `Úspěšně teleportován na souřadnice <strong>X: ${targetBX}, Y: ${targetBY}, Z: ${targetBZ}</strong>.`, 'system');
      if (typeof toast === 'function') {
        toast(`Teleport: X: ${targetBX}, Y: ${targetBY}, Z: ${targetBZ}`);
      }
      break;
    }

    case 'spawn': {
      P.x = SPX;
      P.z = 0.5;
      P.y = SPY;
      P.vx = 0; P.vy = 0; P.vz = 0;
      if (typeof lastC !== 'undefined') lastC = '';
      if (typeof markExploredAroundPlayer === 'function') markExploredAroundPlayer();
      if (typeof mmNeedsRebuild !== 'undefined') mmNeedsRebuild = true;

      const spXb = Math.round(SPX / S);
      const spYb = Math.round(SPY / S);
      addChatMessage(null, `Teleportován na počáteční spawn svět (X: ${spXb}, Y: ${spYb}, Z: 1).`, 'system');
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
        `• <code>/locate &lt;biom&gt;</code> – Vyhledá biom (les, poust, snih, hory, plaz, more, prales) a vypíše souřadnice<br>` +
        `• <code>/tp &lt;X&gt; [Y] &lt;Z&gt;</code> – Teleportuje na dané souřadnice (např. /tp 200 400)<br>` +
        `• <code>/spawn</code> – Teleportuje hráče zpět na spawn<br>` +
        `• <code>/heal</code> – Okamžitě doplní životy (HP) a staminu na 100 %<br>` +
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
    input.addEventListener('keydown', e => {
      // Zamezit probublávání do hry (WASD, mezerník apod.)
      e.stopPropagation();

      if (e.key === 'Enter') {
        e.preventDefault();
        sendChatMessage();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeChat();
      } else if (e.key === 'ArrowUp') {
        // Navigace historií nahoru
        e.preventDefault();
        if (chatHistory.length > 0) {
          if (chatHistoryIdx === -1) {
            chatHistoryIdx = chatHistory.length - 1;
          } else if (chatHistoryIdx > 0) {
            chatHistoryIdx--;
          }
          input.value = chatHistory[chatHistoryIdx] || '';
          setTimeout(() => input.setSelectionRange(input.value.length, input.value.length), 0);
        }
      } else if (e.key === 'ArrowDown') {
        // Navigace historií dolů
        e.preventDefault();
        if (chatHistoryIdx !== -1) {
          if (chatHistoryIdx < chatHistory.length - 1) {
            chatHistoryIdx++;
            input.value = chatHistory[chatHistoryIdx] || '';
          } else {
            chatHistoryIdx = -1;
            input.value = '';
          }
          setTimeout(() => input.setSelectionRange(input.value.length, input.value.length), 0);
        }
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
      `Vítej ve světě! Stiskni <strong>[T]</strong> pro otevření chatu nebo <strong>[/]</strong> pro zadání příkazů (např. <code>/help</code>, <code>/locate</code>, <code>/tp</code>).`,
      'info'
    );
  }, 1200);
});
