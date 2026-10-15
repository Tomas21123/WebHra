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

  // Okamžitá synchronizace se sítí (P2P i Server)
  if (typeof networkManager !== 'undefined' && networkManager && typeof networkManager.sendPlayerTransform === 'function') {
    networkManager.sendPlayerTransform();
  } else if (window.networkManager && typeof window.networkManager.sendPlayerTransform === 'function') {
    window.networkManager.sendPlayerTransform();
  }
}

function cancelEmote() {
  if (currentEmote !== null) {
    currentEmote = null;
    emoteTimer = 0;
    if (typeof playerRig !== 'undefined' && typeof resetRigEmote === 'function') {
      resetRigEmote(playerRig);
    }
    // Okamžité odeslání zrušení do sítě
    if (typeof networkManager !== 'undefined' && networkManager && typeof networkManager.sendPlayerTransform === 'function') {
      networkManager.sendPlayerTransform();
    } else if (window.networkManager && typeof window.networkManager.sendPlayerTransform === 'function') {
      window.networkManager.sendPlayerTransform();
    }
  }
}

// Společný animátor emotů pro lokálního i vzdálené hráče
function applyEmoteAnimation(rig, emoteId, et, now) {
  if (!rig || !emoteId) return false;
  const { body, torso, head, arms, legs } = rig;
  if (!body || !torso || !head || !arms || !legs) return false;

  const VX_VAL = (typeof VX !== 'undefined') ? VX : 0.05;
  const t = (typeof et === 'number' && et > 0) ? et : ((typeof now === 'number' ? now : performance.now()) * 0.001);

  if (emoteId === 'dance67') {
    // Tanec 67 (divoké mávání rukama a tancující trup)
    const sp67 = 13;
    body.position.y = -Math.abs(Math.sin(t * sp67)) * 0.06;
    torso.rotation.z = Math.sin(t * sp67 * 0.5) * 0.16;
    torso.rotation.x = 0.08;
    torso.rotation.y = 0;

    head.rotation.z = Math.sin(t * sp67 * 0.5) * 0.25;
    head.rotation.x = -Math.abs(Math.sin(t * sp67)) * 0.2;
    head.rotation.y = 0;

    arms[0].rotation.x = -1.2 + Math.sin(t * sp67) * 0.95;
    arms[0].rotation.z = -0.3 + Math.cos(t * sp67) * 0.35;
    arms[0].rotation.y = 0.2;

    arms[1].rotation.x = -1.2 - Math.sin(t * sp67) * 0.95;
    arms[1].rotation.z = 0.3 - Math.cos(t * sp67) * 0.35;
    arms[1].rotation.y = -0.2;

    legs[0].rotation.x = Math.sin(t * sp67 * 0.5) * 0.15;
    legs[1].rotation.x = -Math.sin(t * sp67 * 0.5) * 0.15;
    legs[0].rotation.z = -0.04 + Math.sin(t * sp67 * 0.5) * 0.1;
    legs[1].rotation.z = 0.04 + Math.sin(t * sp67 * 0.5) * 0.1;
    return true;
  } else if (emoteId === 'wave') {
    // Pozdrav (přátelské zamávání pravou rukou)
    body.position.y = 0;
    torso.rotation.set(0, 0, 0);
    head.rotation.set(-0.08 + Math.sin(t * 5) * 0.05, 0, -0.12);

    arms[1].rotation.x = -2.25;
    arms[1].rotation.z = 0.55 + Math.sin(t * 10) * 0.35;
    arms[1].rotation.y = 0.18;
    arms[0].rotation.set(0, 0, -0.12);

    legs[0].rotation.set(0, 0, -0.04);
    legs[1].rotation.set(0, 0, 0.04);
    return true;
  } else if (emoteId === 'point') {
    // Ukázání rukou dopředu
    body.position.y = 0;
    torso.rotation.set(0.04, 0.08, 0);
    head.rotation.set(0, 0, 0);

    arms[1].rotation.set(-1.57, 0.04, 0.08);
    arms[0].rotation.set(-0.3, 0.2, -0.3);

    legs[0].rotation.set(0, 0, -0.04);
    legs[1].rotation.set(0, 0, 0.04);
    return true;
  } else if (emoteId === 'sit') {
    // Sed na zem na zadek
    body.position.set(0, -8 * VX_VAL, 0);
    body.rotation.set(0, 0, 0);

    legs[0].rotation.set(-1.57, -0.12, -0.04);
    legs[1].rotation.set(-1.57, 0.12, 0.04);

    torso.position.set(0, 8 * VX_VAL, 0);
    torso.rotation.set(0.06, 0, 0);

    head.position.set(0, 11 * VX_VAL, 0);
    head.rotation.set(0.04 + Math.sin(now * 0.002) * 0.03, 0, 0);

    arms[0].rotation.set(-0.95, 0.22, -0.12);
    arms[1].rotation.set(-0.95, -0.22, 0.12);
    return true;
  }
  return false;
}

function resetRigEmote(rig) {
  if (!rig) return;
  const { body, torso, head, arms, legs } = rig;
  const VX_VAL = (typeof VX !== 'undefined') ? VX : 0.05;
  if (body) { body.position.set(0, 0, 0); body.rotation.set(0, 0, 0); }
  if (torso) { torso.position.set(0, 8 * VX_VAL, 0); torso.rotation.set(0, 0, 0); }
  if (head) { head.position.set(0, 11 * VX_VAL, 0); head.rotation.set(0, 0, 0); }
  if (arms && arms[0] && arms[1]) {
    arms[0].position.set(-5.5 * VX_VAL, 8 * VX_VAL, 0.5 * VX_VAL); arms[0].rotation.set(0, 0, 0);
    arms[1].position.set(5.5 * VX_VAL, 8 * VX_VAL, 0.5 * VX_VAL); arms[1].rotation.set(0, 0, 0);
  }
  if (legs && legs[0] && legs[1]) {
    legs[0].position.set(-2.5 * VX_VAL, 8 * VX_VAL, 0); legs[0].rotation.set(0, 0, 0);
    legs[1].position.set(2.5 * VX_VAL, 8 * VX_VAL, 0); legs[1].rotation.set(0, 0, 0);
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
