// ---------- Správce Emotů (Gesta, Tance a Pozice) ----------
let emoteOpen = false;
let currentEmote = null;
let emoteTimer = 0;

const EMOTE_NAMES = {
  dance67: 'Tanec 67 (Mávání rukama)',
  wave: 'Pozdrav (Zamávání rukou)',
  point: 'Ukázání rukou dopředu',
  sit: 'Sed na zem na zadek'
};

function openEmotes() {
  if (typeof escOpen !== 'undefined' && escOpen) return;
  if (typeof charOpen !== 'undefined' && charOpen) return;
  if (typeof invOpen !== 'undefined' && invOpen) return;

  if (document.pointerLockElement) {
    try { document.exitPointerLock(); } catch (e) {}
  }

  const modal = $('emoteModal');
  if (modal) {
    modal.hidden = false;
    emoteOpen = true;
  }
}

function closeEmotes() {
  const modal = $('emoteModal');
  if (modal) {
    modal.hidden = true;
    emoteOpen = false;
  }
}

function toggleEmotes() {
  if (emoteOpen) {
    closeEmotes();
  } else {
    openEmotes();
  }
}

function playEmote(id) {
  currentEmote = id;
  emoteTimer = 0;
  closeEmotes();

  const name = EMOTE_NAMES[id] || id;
  toast(`${name} · [WASD] pro přerušení`);
}

function cancelEmote() {
  if (currentEmote !== null) {
    currentEmote = null;
    emoteTimer = 0;
  }
}

function initEmotes() {
  const closeBtn = $('emoteClose');
  if (closeBtn) closeBtn.onclick = closeEmotes;

  const modal = $('emoteModal');
  if (modal) {
    modal.addEventListener('click', e => {
      if (e.target === modal) closeEmotes();
    });
  }

  document.querySelectorAll('.emote-btn').forEach(btn => {
    btn.onclick = () => {
      const em = btn.dataset.emote;
      if (em) playEmote(em);
    };
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initEmotes);
} else {
  initEmotes();
}
