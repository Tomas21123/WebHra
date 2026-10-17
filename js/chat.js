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
    syntax: '/help [detail]',
    desc: 'Zobrazí přehled příkazů (/help detail otevře podrobné okno)',
    getSuggestions: (args) => {
      const prefix = (args[0] || '').toLowerCase();
      const opts = [
        { name: 'detail', desc: 'Otevře interaktivní okno se všemi příkazy a jejich podrobným popisem' }
      ];
      return opts
        .filter(o => !prefix || o.name.startsWith(prefix))
        .map(o => ({
          insert: `/help ${o.name}`,
          display: o.name,
          syntax: `/help ${o.name}`,
          desc: o.desc
        }));
    }
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
    syntax: '/spawn <název moba>',
    desc: 'Spawne vybrané zvíře nebo moba před tebou (bez názvu teleportuje na spawn)',
    getSuggestions: (args) => {
      const mobs = [
        { name: 'ovcak', desc: '🐕 Německý ovčák (Ochočení [E]: Morková kost)' },
        { name: 'husky', desc: '🐕 Sibiřský husky (Ochočení [E]: Morková kost)' },
        { name: 'jezevcik', desc: '🐕 Jezevčík (Ochočení [E]: Morková kost)' },
        { name: 'kocka', desc: '🐈 Kočka domácí (Ochočení [E]: Čerstvý losos)' },
        { name: 'krava', desc: '🐄 Strakatá kráva (Ochočení [E]: Zlatá pšenice)' },
        { name: 'ovce', desc: '🐑 Chundelatá ovce (Ochočení [E]: Sladký jetel)' },
        { name: 'kozel', desc: '🐐 Horský kozel (Ochočení [E]: Horské jablko)' },
        { name: 'veverka', desc: '🐿️ Zrzavá veverka (Ochočení [E]: Dubový žalud)' },
        { name: 'vlk', desc: '🐺 Lesní vlk (Nepřátelská šelma)' },
        { name: 'goblin', desc: '👺 Skřet nájezdník (Nepřátelský mob)' },
        { name: 'skeleton', desc: '💀 Kostlivý válečník (Nepřátelský mob)' },
        { name: 'golem', desc: '🗿 Kamenný golem (Elitní boss mob)' }
      ];
      const prefix = (args.join(' ') || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return mobs
        .filter(m => !prefix || m.name.startsWith(prefix) || m.desc.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(prefix))
        .map(m => ({
          insert: `/spawn ${m.name}`,
          display: m.name,
          syntax: `/spawn ${m.name}`,
          desc: m.desc
        }));
    }
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
    syntax: '/give <item | xp | gold | all | id> [kategorie] [název]',
    desc: 'Přidá předměty, zkušenosti (XP), zlato nebo vše',
    getSuggestions: (args) => {
      const suggestions = [];
      const sub = (args[0] || '').toLowerCase();

      // Pokud ještě nebyl vybrán typ nebo se píše první argument
      if (args.length <= 1) {
        const topOptions = [
          { name: 'item', syntax: '/give item <kategorie> <předmět>', desc: 'Přidá konkrétní předmět dle kategorie nebo názvu' },
          { name: 'all', syntax: '/give all', desc: 'Přidá do inventáře všechny herní předměty a vybavení' },
          { name: 'xp', syntax: '/give xp <počet>', desc: 'Přidá XP hráči (přebytek plynule přeteče do dalších levelů)' },
          { name: 'gold', syntax: '/give gold <počet>', desc: 'Přidá zlaté mince do inventáře' },
          { name: 'pet', syntax: '/give pet <druh>', desc: 'Přidá ochočeného mazlíčka do inventáře' }
        ];

        topOptions
          .filter(o => !sub || o.name.startsWith(sub))
          .forEach(o => {
            suggestions.push({
              insert: `/give ${o.name} `,
              display: o.name,
              syntax: o.syntax,
              desc: o.desc
            });
          });

        // Také umožnit přímé psaní ID předmětu pro zpětnou kompatibilitu
        const items = (typeof INV !== 'undefined') ? INV : [];
        items
          .filter(it => !sub || it.id.toLowerCase().startsWith(sub) || it.name.toLowerCase().startsWith(sub))
          .slice(0, 15)
          .forEach(it => {
            suggestions.push({
              insert: `/give ${it.id}`,
              display: it.id,
              syntax: `/give ${it.id}`,
              desc: it.name
            });
          });

        return suggestions;
      }

      // 2. argument: např. /give item ...
      if (sub === 'item') {
        const catArg = (args[1] || '').toLowerCase();
        if (args.length === 2) {
          // Nabídnout kategorie nebo 'all'
          const catOptions = [
            { id: 'all', name: 'všechny kategorie (/give item all)' },
            { id: 'weapon', name: 'Zbraně (meče, sekery, kopí, hole, luky, dýky)' },
            { id: 'armor', name: 'Brnění a oděvy' },
            { id: 'shield', name: 'Štíty' },
            { id: 'ring', name: 'Prsteny a šperky' },
            { id: 'pets', name: 'Mazlíčci' },
            { id: 'taming', name: 'Předměty pro ochočení' },
            { id: 'material', name: 'Suroviny a rudy' },
            { id: 'consumable', name: 'Lektvary a jídlo' }
          ];

          catOptions
            .filter(c => !catArg || c.id.startsWith(catArg))
            .forEach(c => {
              suggestions.push({
                insert: `/give item ${c.id} `,
                display: c.id,
                syntax: `/give item ${c.id} <předmět>`,
                desc: c.name
              });
            });

          // Také přímo předměty
          const items = (typeof INV !== 'undefined') ? INV : [];
          items
            .filter(it => !catArg || it.id.toLowerCase().startsWith(catArg) || it.name.toLowerCase().startsWith(catArg))
            .slice(0, 15)
            .forEach(it => {
              suggestions.push({
                insert: `/give item ${it.id}`,
                display: it.id,
                syntax: `/give item ${it.id}`,
                desc: it.name
              });
            });

          return suggestions;
        } else if (args.length >= 3) {
          // Zadává se konkrétní předmět v dané kategorii
          const itemArg = (args[2] || '').toLowerCase();
          const items = (typeof INV !== 'undefined') ? INV : [];
          return items
            .filter(it => {
              const matchCat = (catArg === 'all') || it.cat === catArg || it.subcat === catArg || (catArg === 'armor' && (it.cat === 'armor' || it.subcat === 'cloth' || it.subcat === 'cape'));
              const matchName = !itemArg || it.id.toLowerCase().startsWith(itemArg) || it.name.toLowerCase().startsWith(itemArg);
              return matchCat && matchName;
            })
            .slice(0, 15)
            .map(it => ({
              insert: `/give item ${args[1]} ${it.id}`,
              display: it.id,
              syntax: `/give item ${args[1]} ${it.id}`,
              desc: it.name
            }));
        }
      }

      if (sub === 'xp') {
        const xpCounts = ['50', '100', '250', '500', '1000', '5000'];
        const xpArg = (args[1] || '').toLowerCase();
        return xpCounts
          .filter(x => !xpArg || x.startsWith(xpArg))
          .map(x => ({
            insert: `/give xp ${x}`,
            display: x,
            syntax: `/give xp ${x}`,
            desc: `Přidat ${x} XP`
          }));
      }

      if (sub === 'gold') {
        const goldCounts = ['10', '50', '100', '500', '1000'];
        const gArg = (args[1] || '').toLowerCase();
        return goldCounts
          .filter(g => !gArg || g.startsWith(gArg))
          .map(g => ({
            insert: `/give gold ${g}`,
            display: g,
            syntax: `/give gold ${g}`,
            desc: `Přidat ${g} zlaťáků`
          }));
      }

      if (sub === 'pet') {
        const petArg = (args[1] || '').toLowerCase();
        const items = (typeof INV !== 'undefined') ? INV.filter(it => it.cat === 'pets' || it.slot === 'pet') : [];
        return items
          .filter(p => !petArg || p.id.toLowerCase().startsWith(petArg) || p.name.toLowerCase().startsWith(petArg))
          .map(p => ({
            insert: `/give pet ${p.id}`,
            display: p.id,
            syntax: `/give pet ${p.id}`,
            desc: p.name
          }));
      }

      return suggestions;
    }
  },
  {
    cmd: 'clearinv',
    syntax: '/clearinv',
    desc: 'Vyprázdní tvůj inventář i nasazenou výstroj',
    getSuggestions: () => []
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
      // Pokud je zadán argument (/spawn <název moba>), spawne dané zvíře nebo nestvůru přímo před hráčem!
      if (args.length > 0) {
        const mobQuery = args.join(' ').trim();
        if (window.EntityManager && typeof window.EntityManager.spawnCreatureInFrontOfPlayer === 'function') {
          const res = window.EntityManager.spawnCreatureInFrontOfPlayer(mobQuery, (typeof P !== 'undefined' && P.level) ? P.level : 1);
          if (res && !res.error && res.creature) {
            const cfg = res.config || {};
            const tameHint = cfg.tameItemName
              ? ` <span style="color:#fde047;">(Ochočení klávesou <b>[E]</b> pomocí: <b>${escapeChatHtml(cfg.tameItemName)}</b>)</span>`
              : '';
            addChatMessage(
              null,
              `🐾 Před tebou byl spawnut: <strong>${escapeChatHtml(res.creature.name)}</strong>!${tameHint}`,
              'system'
            );
            if (typeof toast === 'function') {
              toast(`🐾 Spawnuto: ${res.creature.name}${cfg.tameItemName ? ` (Ochočit [E]: ${cfg.tameItemName})` : ''}`);
            }
            return true;
          } else {
            addChatMessage(
              null,
              `Neznámý mob nebo zvíře "<strong>${escapeChatHtml(mobQuery)}</strong>".<br>Dostupná zvířata a mobové: <code>ovcak</code>, <code>husky</code>, <code>jezevcik</code>, <code>kocka</code>, <code>krava</code>, <code>ovce</code>, <code>kozel</code>, <code>veverka</code>, <code>vlk</code>, <code>goblin</code>, <code>skeleton</code>, <code>golem</code>.`,
              'error'
            );
            return false;
          }
        } else {
          addChatMessage(null, 'Správce entit (EntityManager) není připraven.', 'error');
          return false;
        }
      }

      // Bez argumentu (/spawn): teleport na výchozí spawn světa + nápověda pro /spawn <mob>
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
      addChatMessage(
        null,
        `Teleportován na výchozí spawn světa (X: ${spXb}, Y: ${spYb}, Z: ${spZb}).<br><span style="opacity:0.85">Tip: Pro spawnutí moba před tebou zadej <code>/spawn &lt;název moba&gt;</code> (např. <code>/spawn ovcak</code>, <code>/spawn husky</code>, <code>/spawn kocka</code>, <code>/spawn kozel</code>, <code>/spawn veverka</code>).</span>`,
        'system'
      );
      if (typeof toast === 'function') toast('Teleportován na spawn');
      break;
    }

    case 'heal': {
      const fullHp = (typeof P !== 'undefined' && P && typeof P.maxHp === 'number') ? P.maxHp : 100;
      const fullSt = (typeof P !== 'undefined' && P && typeof P.maxStamina === 'number') ? P.maxStamina : 100;
      G.hp = fullHp;
      G.st = fullSt;
      G.o2 = 100;
      G.tired = 0;
      if (typeof P !== 'undefined' && P) {
        P.hp = fullHp;
        P.stamina = fullSt;
      }
      if (typeof ui === 'function') ui();
      addChatMessage(null, `Životy (${fullHp} HP), stamina a kyslík byly obnoveny na 100 %.`, 'system');
      if (typeof toast === 'function') toast(`Životy (${fullHp} HP) a stamina doplněny`);
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
        addChatMessage(
          null,
          'Použití příkazu <code>/give</code>:<br>' +
          '• <code>/give item &lt;kategorie&gt; &lt;název_itemu&gt;</code> – Přidá konkrétní předmět<br>' +
          '• <code>/give item all</code> nebo <code>/give all</code> – Přidá všechny předměty do inventáře<br>' +
          '• <code>/give xp &lt;počet&gt;</code> – Přidá zkušenostní body (přebytek přeteče do dalších levelů)<br>' +
          '• <code>/give gold &lt;počet&gt;</code> – Přidá zlaté mince do inventáře<br>' +
          '• <code>/give pet &lt;typ&gt;</code> – Přidá ochočeného mazlíčka do inventáře<br>' +
          '• <code>/give &lt;id_itemu&gt; [počet]</code> – Rychlé přidání předmětu dle ID (např. <code>/give sword</code>)',
          'info'
        );
        return;
      }

      const sub1 = (args[0] || '').toLowerCase().trim();

      // 1. /give all
      if (sub1 === 'all') {
        if (typeof INV !== 'undefined' && Array.isArray(INV)) {
          let countAdded = 0;
          INV.forEach(it => {
            if (it.cat === 'weapon' || it.cat === 'armor' || it.subcat === 'shield' || it.subcat === 'cloth' || it.subcat === 'cape' || it.slot === 'ring' || it.cat === 'pets' || it.slot === 'pet') {
              it.count = Math.max(1, it.count || 0);
            } else {
              it.count = Math.max(30, (it.count || 0) + 30);
            }
            countAdded++;
          });
          if (typeof renderInv === 'function') renderInv();
          if (typeof renderHB === 'function') renderHB();
          if (typeof updateEquipmentUI === 'function') updateEquipmentUI();
          addChatMessage(null, `✨ Do inventáře byly přidány <strong>všechny herní předměty</strong> (${countAdded} položek: zbraně, zbroje, suroviny, lektvary a mazlíčci)!`, 'system');
          if (typeof toast === 'function') toast('🎒 Všechny itemy přidány do inventáře!');
        }
        return;
      }

      // 2. /give xp <počet>
      if (sub1 === 'xp' || sub1 === 'exp') {
        const amount = parseInt(args[1], 10);
        if (isNaN(amount) || amount <= 0) {
          addChatMessage(null, 'Zadej platný kladný počet XP, např. <code>/give xp 250</code>.', 'error');
          return;
        }

        const pObj = (typeof window !== 'undefined' && window.P) ? window.P : (typeof P !== 'undefined' ? P : null);
        const oldLevel = pObj ? (pObj.level || 1) : 1;
        const oldXp = pObj ? (pObj.xp || 0) : 0;

        if (typeof addPlayerXP === 'function') {
          addPlayerXP(amount, 'command');
        } else if (pObj) {
          pObj.xp = (pObj.xp || 0) + amount;
          if (typeof checkPlayerLevelUp === 'function') checkPlayerLevelUp();
        }

        const newLevel = pObj ? (pObj.level || 1) : oldLevel;
        const newXp = pObj ? (pObj.xp || 0) : oldXp;
        const newNext = pObj ? (pObj.xpNext || 100) : 100;
        const levelsGained = newLevel - oldLevel;

        let msg = `✨ Hráč získal <strong>+${amount} XP</strong>!`;
        if (levelsGained > 0) {
          msg += ` 🎉 <strong>Level Up!</strong> Dosáhl jsi <strong>úrovně ${newLevel}</strong> (+${levelsGained} levelů, zbývá ${newNext - newXp} XP do dalšího levelu, volné body: ${pObj.skillPoints || 0}).`;
        } else {
          msg += ` Aktuální postup: <strong>${newXp} / ${newNext} XP</strong> (do další úrovně zbývá ${newNext - newXp} XP).`;
        }
        addChatMessage(null, msg, 'system');
        if (typeof toast === 'function') toast(`+${amount} XP ${levelsGained > 0 ? `(Úroveň ${newLevel}!)` : ''}`);
        return;
      }

      // 3. /give gold <počet>
      if (sub1 === 'gold' || sub1 === 'penize' || sub1 === 'zlato') {
        const amount = parseInt(args[1], 10) || 50;
        if (typeof INV !== 'undefined') {
          let goldIt = INV.find(it => it.id === 'coin_gold' || it.id === 'gold');
          if (!goldIt) {
            goldIt = INV.find(it => it.id === 'ore_gold');
          }
          if (goldIt) {
            goldIt.count = (goldIt.count || 0) + amount;
            if (typeof renderInv === 'function') renderInv();
            addChatMessage(null, `💰 Do inventáře bylo přidáno <strong>${amount}× ${escapeChatHtml(goldIt.name)}</strong>. Celkem máš: ${goldIt.count}.`, 'system');
            if (typeof toast === 'function') toast(`+${amount} Zlata`);
            return;
          }
        }
        addChatMessage(null, `Položka pro zlato nebyla v inventáři nalezena.`, 'error');
        return;
      }

      // 4. /give pet <druh>
      if (sub1 === 'pet' || sub1 === 'mazlicek') {
        const query = (args.slice(1).join(' ') || '').toLowerCase().trim();
        if (!query) {
          addChatMessage(null, 'Použití: <code>/give pet &lt;druh&gt;</code> (např. <code>husky</code>, <code>ovcak</code>, <code>kocka</code>, <code>krava</code>, <code>kozel</code>, <code>veverka</code>).', 'info');
          return;
        }
        const petIt = (typeof INV !== 'undefined') ? INV.find(it => {
          if (it.cat !== 'pets' && it.slot !== 'pet') return false;
          const id = it.id.toLowerCase();
          const name = it.name.toLowerCase();
          return id.includes(query) || name.includes(query);
        }) : null;

        if (petIt) {
          petIt.count = (petIt.count || 0) + 1;
          if (typeof renderInv === 'function') renderInv();
          addChatMessage(null, `🐾 Mazlíček <strong>${escapeChatHtml(petIt.name)}</strong> byl přidán do tvého inventáře! Nasaď si ho v záložce Mazlíčci nebo stiskni [R].`, 'system');
          if (typeof toast === 'function') toast(`Získán mazlíček: ${petIt.name}`);
        } else {
          addChatMessage(null, `Mazlíček odpovídající "<strong>${escapeChatHtml(query)}</strong>" nebyl nalezen. Dostupné druhy: <code>husky</code>, <code>ovcak</code>, <code>jezevcik</code>, <code>kocka</code>, <code>krava</code>, <code>ovce</code>, <code>kozel</code>, <code>veverka</code>.`, 'error');
        }
        return;
      }

      // 5. /give item ...
      if (sub1 === 'item') {
        const sub2 = (args[1] || '').toLowerCase().trim();
        if (!sub2) {
          addChatMessage(null, 'Použití: <code>/give item &lt;kategorie&gt; &lt;název_itemu&gt;</code> nebo <code>/give item all</code>.', 'info');
          return;
        }

        // /give item all
        if (sub2 === 'all') {
          if (typeof INV !== 'undefined' && Array.isArray(INV)) {
            let countAdded = 0;
            INV.forEach(it => {
              if (it.cat === 'weapon' || it.cat === 'armor' || it.subcat === 'shield' || it.subcat === 'cloth' || it.subcat === 'cape' || it.slot === 'ring' || it.cat === 'pets' || it.slot === 'pet') {
                it.count = Math.max(1, it.count || 0);
              } else {
                it.count = Math.max(30, (it.count || 0) + 30);
              }
              countAdded++;
            });
            if (typeof renderInv === 'function') renderInv();
            if (typeof renderHB === 'function') renderHB();
            if (typeof updateEquipmentUI === 'function') updateEquipmentUI();
            addChatMessage(null, `✨ Do inventáře byly přidány <strong>všechny herní předměty</strong> (${countAdded} položek)!`, 'system');
            if (typeof toast === 'function') toast('🎒 Všechny itemy přidány do inventáře!');
          }
          return;
        }

        // /give item <kategorie> <název_itemu> NEBO /give item <název_itemu>
        let targetCat = null;
        let itemQuery = '';
        let amount = 1;

        if (args.length >= 3) {
          targetCat = sub2;
          // Zkontrolovat, zda poslední argument není počet
          const lastArg = args[args.length - 1];
          const parsedCount = parseInt(lastArg, 10);
          if (!isNaN(parsedCount) && parsedCount > 0 && args.length >= 4) {
            amount = parsedCount;
            itemQuery = args.slice(2, -1).join(' ').toLowerCase().trim();
          } else {
            itemQuery = args.slice(2).join(' ').toLowerCase().trim();
          }
        } else {
          // Jen 2 argumenty: /give item <něco> -> vyhledat napříč všemi itemy
          itemQuery = sub2;
        }

        const items = (typeof INV !== 'undefined') ? INV : [];
        let matched = items.find(it => {
          if (targetCat && targetCat !== 'all') {
            const inCat = it.cat === targetCat || it.subcat === targetCat || (targetCat === 'armor' && (it.cat === 'armor' || it.subcat === 'cloth' || it.subcat === 'cape'));
            if (!inCat) return false;
          }
          const id = it.id.toLowerCase();
          const name = it.name.toLowerCase();
          return id === itemQuery || name === itemQuery;
        });

        if (!matched) {
          matched = items.find(it => {
            if (targetCat && targetCat !== 'all') {
              const inCat = it.cat === targetCat || it.subcat === targetCat || (targetCat === 'armor' && (it.cat === 'armor' || it.subcat === 'cloth' || it.subcat === 'cape'));
              if (!inCat) return false;
            }
            const id = it.id.toLowerCase();
            const name = it.name.toLowerCase();
            return id.includes(itemQuery) || name.includes(itemQuery);
          });
        }

        if (matched) {
          matched.count = (matched.count || 0) + amount;
          if (typeof HB !== 'undefined' && matched.cat === 'weapon') {
            let emptySlot = HB.indexOf(null);
            if (emptySlot === -1 && HB.length < (typeof MAXHB !== 'undefined' ? MAXHB : 9)) {
              HB.push(matched.id);
              emptySlot = HB.length - 1;
            } else if (emptySlot !== -1) {
              HB[emptySlot] = matched.id;
            } else {
              HB[0] = matched.id;
              emptySlot = 0;
            }
            if (typeof renderHB === 'function') renderHB();
            if (typeof selSlot === 'function') selSlot(emptySlot);
          }
          if (typeof renderInv === 'function') renderInv();
          addChatMessage(null, `Předmět <strong>${escapeChatHtml(matched.name)}</strong> (+${amount} ks) byl přidán do inventáře.`, 'system');
          if (typeof toast === 'function') toast(`Získáno: ${matched.name} (+${amount})`);
        } else {
          addChatMessage(null, `Předmět "${escapeChatHtml(itemQuery)}"${targetCat ? ` v kategorii "${targetCat}"` : ''} nebyl nalezen.`, 'error');
        }
        return;
      }

      // 6. Výchozí /give <id/název> [počet] (zpětná kompatibilita)
      const itemQuery = sub1;
      const count = parseInt(args[1], 10) || 1;
      const it = (typeof INV !== 'undefined') ? INV.find(x => x.id === itemQuery || x.id.toLowerCase().includes(itemQuery) || x.name.toLowerCase().includes(itemQuery)) : null;
      if (it) {
        it.count = (it.count || 0) + count;
        if (typeof HB !== 'undefined' && it.cat === 'weapon') {
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
        }
        if (typeof renderInv === 'function') renderInv();
        addChatMessage(null, `Předmět <strong>${escapeChatHtml(it.name)}</strong> (+${count} ks) byl přidán do tvého inventáře.`, 'system');
        if (typeof toast === 'function') toast(`Získáno: ${it.name} (+${count})`);
      } else {
        addChatMessage(null, `Neznámý předmět "${escapeChatHtml(args[0])}". Napiš <code>/give item &lt;kategorie&gt; &lt;předmět&gt;</code> nebo <code>/help detail</code>.`, 'error');
      }
      break;
    }

    case 'clearinv': {
      if (typeof INV !== 'undefined' && Array.isArray(INV)) {
        INV.forEach(it => { it.count = 0; if (it.upgradeLevel) it.upgradeLevel = 0; });
      }
      if (typeof EQUIPPED_SLOTS !== 'undefined') {
        for (const k in EQUIPPED_SLOTS) EQUIPPED_SLOTS[k] = null;
      }
      if (typeof HB !== 'undefined' && Array.isArray(HB)) {
        HB.fill(null);
      }
      if (typeof heldId !== 'undefined') heldId = null;
      if (typeof hbSel !== 'undefined') hbSel = -1;
      if (typeof PetManager !== 'undefined' && PetManager && typeof PetManager.despawnPet === 'function') {
        PetManager.despawnPet(true);
      }
      if (typeof syncEQArray === 'function') syncEQArray();
      if (typeof renderHB === 'function') renderHB();
      if (typeof renderInv === 'function') renderInv();
      if (typeof updateEquipmentUI === 'function') updateEquipmentUI();
      if (typeof applyHeld === 'function') applyHeld();
      if (typeof updatePlayerAppearance === 'function') updatePlayerAppearance();
      addChatMessage(null, '🧹 Tvůj inventář a veškerá výstroj byly kompletně vyprázdněny.', 'system');
      if (typeof toast === 'function') toast('Inventář byl vyčištěn');
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
      const isDetail = args.length > 0 && args[0].toLowerCase().trim() === 'detail';
      if (isDetail) {
        if (typeof openHelpDetailModal === 'function') {
          openHelpDetailModal();
          addChatMessage(null, '📖 Otevřeno podrobné okno nápovědy se všemi příkazy a jejich popisem.', 'info');
        } else {
          const modal = $('modalHelpDetail');
          if (modal) {
            modal.hidden = false;
            addChatMessage(null, '📖 Otevřeno podrobné okno nápovědy se všemi příkazy a jejich popisem.', 'info');
          } else {
            addChatMessage(null, 'Okno podrobné nápovědy se připravuje.', 'info');
          }
        }
        return;
      }

      addChatMessage(
        null,
        `<strong>🎮 Přehled příkazů konzole:</strong><br>` +
        `• <code>/give item &lt;kategorie&gt; &lt;item&gt;</code> – Přidá konkrétní předmět<br>` +
        `• <code>/give item all</code> – Přidá do inventáře všechny herní itemy a vybavení<br>` +
        `• <code>/give xp &lt;počet&gt;</code> – Přidá zkušenosti s plynulým přetečením do levelů<br>` +
        `• <code>/give gold &lt;počet&gt;</code> – Přidá zlaté mince do inventáře<br>` +
        `• <code>/give pet &lt;druh&gt;</code> – Přidá ochočeného mazlíčka (např. husky, kocka, krava)<br>` +
        `• <code>/clearinv</code> – Kompletně vyprázdní inventář i nasazenou výstroj<br>` +
        `• <code>/heal</code> – Obnoví HP, staminu i kyslík na maximum<br>` +
        `• <code>/spawn &lt;mob&gt;</code> – Spawne zvíře nebo nestvůru před hráčem<br>` +
        `• <code>/tp &lt;hráč | X Z | X Y Z&gt;</code> – Teleportuje na pozici nebo k hráči<br>` +
        `• <code>/locate &lt;biom&gt;</code> – Vyhledá nejbližší biom (les, poust, snih, hory, plaz, more, prales)<br>` +
        `• <code>/time &lt;den | noc&gt;</code> – Změní denní dobu světa<br>` +
        `• <code>/clear</code> – Vymaže text zpráv v chatu<br>` +
        `👉 <strong>Tip:</strong> Napiš <span class="chat-clickable-cmd" onclick="openHelpDetailModal()">/help detail</span> pro otevření přehledného interaktivního okna s podrobným popisem všech příkazů a parametrů!`,
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

// =============================================================================
// MODAL PODROBNÉ NÁPOVĚDY PŘÍKAZŮ (/help detail)
// =============================================================================

const DETAILED_COMMANDS_DATA = [
  {
    category: 'items',
    badge: 'Předměty & XP',
    badgeClass: 'badge-items',
    cmd: '/give item <kategorie> <předmět> [počet]',
    desc: 'Přidá vybraný předmět z konkrétní kategorie do tvého inventáře. Lze zadat kategorii i ID nebo název předmětu. Pokud jde o zbraň, automaticky se umístí do akční lišty.',
    examples: [
      { code: '/give item weapon sword', note: 'přidá ocelový meč' },
      { code: '/give item material ore_iron 10', note: 'přidá 10 kusů železné rudy' },
      { code: '/give item consumable potion_health 5', note: 'přidá 5 léčivých lektvarů' }
    ]
  },
  {
    category: 'items',
    badge: 'Předměty & XP',
    badgeClass: 'badge-items',
    cmd: '/give item all  nebo  /give all',
    desc: 'Bleskově naplní inventář všemi existujícími zbraněmi, brněními, štíty, prsteny, surovinami, lektvary a ochočenými mazlíčky ve hře. Vynikající pro okamžité testování kompletní výstroje.',
    examples: [
      { code: '/give item all', note: 'přidá všechny dostupné položky hry do inventáře' },
      { code: '/give all', note: 'zkrácená verze příkazu' }
    ]
  },
  {
    category: 'items',
    badge: 'Předměty & XP',
    badgeClass: 'badge-items',
    cmd: '/give xp <počet>',
    desc: 'Přidá tvé postavě zadaný počet zkušeností (XP). Pokud přidané XP přesáhnou hranici potřebnou pro postup, plynule přetečou do další úrovně (lze získat i více levelů naráz). Každý nový level přidá +1 volný atributový bod.',
    examples: [
      { code: '/give xp 100', note: 'přidá 100 XP' },
      { code: '/give xp 1500', note: 'přidá 1500 XP a okamžitě posune postavu o několik úrovní výše' }
    ]
  },
  {
    category: 'items',
    badge: 'Předměty & XP',
    badgeClass: 'badge-items',
    cmd: '/give gold <počet>',
    desc: 'Přidá do inventáře zadaný počet zlatých mincí nebo valounů ryzího zlata k vylepšování zbraní a brnění.',
    examples: [
      { code: '/give gold 50', note: 'přidá 50 zlatých mincí' },
      { code: '/give gold 500', note: 'přidá 500 zlaťáků na nákupy a kovářství' }
    ]
  },
  {
    category: 'items',
    badge: 'Předměty & XP',
    badgeClass: 'badge-items',
    cmd: '/give pet <druh>',
    desc: 'Přímo přidá vybraného ochočeného mazlíčka do inventáře v záložce Mazlíčci. Mazlíčka si poté můžeš vybavit do slotu a přivolat na ježdění a boj klávesou [R].',
    examples: [
      { code: '/give pet husky', note: 'získá severského huskyho' },
      { code: '/give pet kocka', note: 'získá mrštnou kočku domácí' },
      { code: '/give pet krava', note: 'získá strakatou krávu na ježdění' }
    ]
  },
  {
    category: 'items',
    badge: 'Předměty & XP',
    badgeClass: 'badge-items',
    cmd: '/clearinv',
    desc: 'Kompletně vyprázdní tvůj batoh, akční lištu i veškerou nasazenou výstroj (zbraně, brnění, štíty i mazlíčky). Výborné pro začátek od nuly.',
    examples: [
      { code: '/clearinv', note: 'vyčistí celý inventář a sundá výbavu' }
    ]
  },
  {
    category: 'player',
    badge: 'Postava & Boj',
    badgeClass: 'badge-player',
    cmd: '/heal',
    desc: 'Okamžitě doplní aktuální životy (HP), staminu a zásobu kyslíku na 100 % plné maximální hodnoty (včetně všech RPG bonusů z brnění a atributů). Odstraní únavu.',
    examples: [
      { code: '/heal', note: 'vyléčí všechny HP a staminu na plné maximum' }
    ]
  },
  {
    category: 'player',
    badge: 'Postava & Boj',
    badgeClass: 'badge-player',
    cmd: '/spawn <mob>',
    desc: 'Přímo před tebou spawne zvíře nebo nepřátelského moba s příslušným levelem. Zvířata můžeš ochočit klávesou [E] s příslušným pamlskem v ruce.',
    examples: [
      { code: '/spawn ovcak', note: 'spawne německého ovčáka (ochočení: Morková kost)' },
      { code: '/spawn skeleton', note: 'spawne kostlivého válečníka odpovídajícího levelu' },
      { code: '/spawn golem', note: 'spawne elitního kamenného golema' }
    ]
  },
  {
    category: 'teleport',
    badge: 'Pohyb & Svět',
    badgeClass: 'badge-teleport',
    cmd: '/tp <hráč | x z | x y z>',
    desc: 'Okamžitě teleportuje tvou postavu k vybranému spoluhráči nebo na zadané souřadnice světa. Výška Y je volitelná – pokud ji vynecháš, dopočítá se bezpečně podle povrchu.',
    examples: [
      { code: '/tp 0 0', note: 'teleport na souřadnice X: 0, Z: 0' },
      { code: '/tp ~50 ~ ~50', note: 'relativní posun o 50 bloků dále' },
      { code: '/tp Petr', note: 'teleport přímo ke spoluhráči Petr' }
    ]
  },
  {
    category: 'teleport',
    badge: 'Pohyb & Svět',
    badgeClass: 'badge-teleport',
    cmd: '/spawn',
    desc: 'Teleportuje tě zpět na výchozí spawn bod tvého světa.',
    examples: [
      { code: '/spawn', note: 'okamžitý návrat na startovní souřadnice' }
    ]
  },
  {
    category: 'teleport',
    badge: 'Pohyb & Svět',
    badgeClass: 'badge-teleport',
    cmd: '/locate <biom>',
    desc: 'Vyhledá nejbližší výskyt zvoleného biomu (les, poust, snih, hory, plaz, more, prales) a zobrazí souřadnice i přímý klikatelný odkaz pro teleportaci.',
    examples: [
      { code: '/locate poust', note: 'vyhledá nejbližší písečnou poušť' },
      { code: '/locate snih', note: 'vyhledá zasněženou tundru a ledovce' },
      { code: '/locate prales', note: 'vyhledá tropický deštný prales' }
    ]
  },
  {
    category: 'utility',
    badge: 'Ostatní',
    badgeClass: 'badge-utility',
    cmd: '/time <den | noc | hodnota>',
    desc: 'Změní aktuální denní dobu světa. Lze zadat slovně "den", "noc", nebo přesné číslo v rozsahu 0.0 až 1.0.',
    examples: [
      { code: '/time den', note: 'nastaví slunečné poledne' },
      { code: '/time noc', note: 'nastaví hvězdnou noc' }
    ]
  },
  {
    category: 'utility',
    badge: 'Ostatní',
    badgeClass: 'badge-utility',
    cmd: '/help  /  /help detail',
    desc: 'Základní příkaz /help vypíše rychlý souhrn do chatu. Příkaz /help detail otevře toto interaktivní grafické okno se všemi podrobnostmi a filtry.',
    examples: [
      { code: '/help', note: 'rychlý přehled do chatu' },
      { code: '/help detail', note: 'otevře toto přehledné okno' }
    ]
  },
  {
    category: 'utility',
    badge: 'Ostatní',
    badgeClass: 'badge-utility',
    cmd: '/clear',
    desc: 'Vyčistí celou historii zpráv v chatovacím okně.',
    examples: [
      { code: '/clear', note: 'promaže chat' }
    ]
  }
];

let activeHelpCategory = 'all';
let activeHelpSearch = '';

function openHelpDetailModal() {
  const modal = $('modalHelpDetail');
  if (!modal) return;

  // Zavřít chat, pokud je otevřen
  if (typeof closeChat === 'function') closeChat();

  modal.hidden = false;
  activeHelpCategory = 'all';
  activeHelpSearch = '';

  const searchInput = $('helpDetailSearch');
  if (searchInput) {
    searchInput.value = '';
    searchInput.focus();
  }

  // Nastavit záložku Všechny jako aktivní
  document.querySelectorAll('.help-tab-btn').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-cat') === 'all');
  });

  renderHelpDetailList();
}
window.openHelpDetailModal = openHelpDetailModal;

function closeHelpDetailModal() {
  const modal = $('modalHelpDetail');
  if (modal) modal.hidden = true;
  try {
    (window.cv || (window.renderer && renderer.domElement))?.focus?.();
  } catch (e) {}
}
window.closeHelpDetailModal = closeHelpDetailModal;

function renderHelpDetailList() {
  const container = $('helpDetailList');
  if (!container) return;

  const q = activeHelpSearch.toLowerCase().trim();
  const filtered = DETAILED_COMMANDS_DATA.filter(item => {
    const matchCat = (activeHelpCategory === 'all') || item.category === activeHelpCategory;
    if (!matchCat) return false;
    if (!q) return true;
    const inCmd = item.cmd.toLowerCase().includes(q);
    const inDesc = item.desc.toLowerCase().includes(q);
    const inExamples = item.examples.some(ex => ex.code.toLowerCase().includes(q) || ex.note.toLowerCase().includes(q));
    return inCmd || inDesc || inExamples;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:36px 12px;color:#94a3b8;">
        <div style="font-size:36px;margin-bottom:8px;">🔍</div>
        <div style="font-size:15px;font-weight:600;color:#cbd5e1;">Žádný příkaz neodpovídá hledanému výrazu "${escapeChatHtml(activeHelpSearch)}"</div>
        <div style="font-size:12.5px;margin-top:4px;">Zkus zadat jiný výraz nebo přepnout kategorii nahoře.</div>
      </div>
    `;
    return;
  }

  let html = '';
  filtered.forEach(item => {
    html += `
      <div class="help-detail-card">
        <div class="help-card-header">
          <span class="help-card-cmd" title="Klikni pro vložení do chatu" onclick="insertCmdFromHelp('${escapeChatHtml(item.cmd.split(/\s+/)[0])}')">${escapeChatHtml(item.cmd)}</span>
          <span class="help-card-badge ${item.badgeClass}">${escapeChatHtml(item.badge)}</span>
        </div>
        <div class="help-card-desc">${escapeChatHtml(item.desc)}</div>
        <div class="help-card-examples">
          <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Ukázky použití (klikni pro spuštění):</div>
          ${item.examples.map(ex => `
            <div class="help-card-example-item">
              <code onclick="insertCmdFromHelp('${escapeChatHtml(ex.code)}')">${escapeChatHtml(ex.code)}</code>
              <span style="opacity:0.8;">— ${escapeChatHtml(ex.note)}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function insertCmdFromHelp(cmdText) {
  closeHelpDetailModal();
  if (typeof openChat === 'function') {
    openChat(cmdText.startsWith('/') ? cmdText : `/${cmdText}`);
  }
}
window.insertCmdFromHelp = insertCmdFromHelp;

// Inicializace listenerů modalu nápovědy
function initHelpDetailModalListeners() {
  const closeBtn = $('closeHelpDetailBtn');
  const closeBtnBottom = $('closeHelpDetailBtnBottom');
  const modal = $('modalHelpDetail');
  const searchInput = $('helpDetailSearch');

  if (closeBtn) closeBtn.onclick = closeHelpDetailModal;
  if (closeBtnBottom) closeBtnBottom.onclick = closeHelpDetailModal;

  if (modal) {
    modal.addEventListener('mousedown', e => {
      if (e.target === modal) closeHelpDetailModal();
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      activeHelpSearch = searchInput.value;
      renderHelpDetailList();
    });
    searchInput.addEventListener('keydown', e => {
      e.stopPropagation();
      if (e.key === 'Escape') closeHelpDetailModal();
    });
  }

  document.querySelectorAll('.help-tab-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.help-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeHelpCategory = btn.getAttribute('data-cat') || 'all';
      renderHelpDetailList();
    };
  });

  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal && !modal.hidden) {
      closeHelpDetailModal();
    }
  });
}

// Spustit uvítací zprávu v konzoli
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('DOMContentLoaded', () => {
    initChatListeners();
    initHelpDetailModalListeners();
    setTimeout(() => {
      addChatMessage(
        null,
        `Vítej ve světě! Stiskni <strong>[T]</strong> pro otevření chatu nebo <strong>[/]</strong> pro zadání příkazů (např. <code>/help</code>, <code>/help detail</code>, <code>/tp</code>, <code>/locate</code>).`,
        'info'
      );
    }, 1200);
  });
}
