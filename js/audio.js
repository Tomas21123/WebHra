// ---------- Web Audio API Syntetizér pro Útoky ----------
let audioCtx = null;
window.soundMuted = false;
try {
  if (localStorage.getItem('voxel_setting_sound') === '0') window.soundMuted = true;
} catch(e) {}

function playAttackSound(type) {
  if (window.soundMuted) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === 'thrust' || type === 'punch') {
      osc.type = 'triangle';
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, t);
      osc.frequency.setValueAtTime(150, t);
      osc.frequency.exponentialRampToValueAtTime(50, t + 0.1);
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      osc.start(t);
      osc.stop(t + 0.1);
    } else if (type === 'heavy') {
      osc.type = 'sawtooth';
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, t);
      filter.frequency.exponentialRampToValueAtTime(80, t + 0.22);
      gain.gain.setValueAtTime(0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.start(t);
      osc.stop(t + 0.22);
    } else if (type === 'staff') {
      osc.type = 'sine';
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(520, t);
      osc.frequency.setValueAtTime(600, t);
      osc.frequency.exponentialRampToValueAtTime(180, t + 0.2);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.start(t);
      osc.stop(t + 0.2);
    } else if (type === 'bow') {
      osc.type = 'triangle';
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(200, t);
      osc.frequency.setValueAtTime(220, t);
      osc.frequency.exponentialRampToValueAtTime(450, t + 0.08);
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.start(t);
      osc.stop(t + 0.12);
    } else {
      osc.type = 'sine';
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600, t);
      osc.frequency.setValueAtTime(340, t);
      osc.frequency.exponentialRampToValueAtTime(90, t + 0.15);
      gain.gain.setValueAtTime(0.16, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      osc.start(t);
      osc.stop(t + 0.15);
    }
  } catch (e) {}
}

function playBlockSound() {
  if (window.soundMuted) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'triangle';
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, t);
    osc.frequency.setValueAtTime(420, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.2);
    gain.gain.setValueAtTime(0.32, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.start(t);
    osc.stop(t + 0.2);
  } catch (e) {}
}
window.playBlockSound = playBlockSound;

function playRollSound() {
  if (window.soundMuted) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const t = audioCtx.currentTime;

    // Vzdušný svist při skoku střemhlav
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'triangle';
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, t);
    filter.frequency.exponentialRampToValueAtTime(100, t + 0.28);
    osc.frequency.setValueAtTime(260, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.28);
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    osc.start(t);
    osc.stop(t + 0.28);

    // Ztlumený dopad na zem při přetočení
    setTimeout(() => {
      try {
        if (!audioCtx) return;
        const t2 = audioCtx.currentTime;
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(90, t2);
        osc2.frequency.exponentialRampToValueAtTime(35, t2 + 0.12);
        gain2.gain.setValueAtTime(0.14, t2);
        gain2.gain.exponentialRampToValueAtTime(0.001, t2 + 0.12);
        osc2.start(t2);
        osc2.stop(t2 + 0.12);
      } catch (e) {}
    }, 180);
  } catch (e) {}
}

function playDiscoveryChime() {
  if (typeof window !== 'undefined' && window.soundMuted) return;
  try {
    if (typeof window === 'undefined') return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    if (!audioCtx) audioCtx = new AudioContextClass();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const t = audioCtx.currentTime;

    const notes = [
      { freq: 523.25, time: 0.00, dur: 0.35, vol: 0.16 }, // C5
      { freq: 659.25, time: 0.09, dur: 0.38, vol: 0.18 }, // E5
      { freq: 783.99, time: 0.18, dur: 0.45, vol: 0.20 }, // G5
      { freq: 1046.50, time: 0.28, dur: 0.75, vol: 0.24 } // C6
    ];

    notes.forEach(n => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const filter = audioCtx.createBiquadFilter();

      osc.type = 'sine';
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2800, t + n.time);

      osc.frequency.setValueAtTime(n.freq, t + n.time);
      osc.frequency.exponentialRampToValueAtTime(n.freq * 1.008, t + n.time + n.dur);

      gain.gain.setValueAtTime(0.0001, t + n.time);
      gain.gain.linearRampToValueAtTime(n.vol, t + n.time + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + n.time + n.dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(t + n.time);
      osc.stop(t + n.time + n.dur);
    });
  } catch (e) {}
}
if (typeof window !== 'undefined') {
  window.playDiscoveryChime = playDiscoveryChime;
}

// ---------- Zvukové Efekty Draků a Wyvern (Ice and Fire) ----------
function playDragonRoar(isIce = false) {
  if (typeof window !== 'undefined' && window.soundMuted) return;
  try {
    if (typeof window === 'undefined') return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    if (!audioCtx) audioCtx = new AudioContextClass();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const t = audioCtx.currentTime;

    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();

    osc1.type = 'sawtooth';
    osc2.type = 'triangle';

    const baseFreq = isIce ? 85 : 70;
    osc1.frequency.setValueAtTime(baseFreq, t);
    osc1.frequency.exponentialRampToValueAtTime(baseFreq * 2.2, t + 0.25);
    osc1.frequency.exponentialRampToValueAtTime(baseFreq * 0.7, t + 0.85);

    osc2.frequency.setValueAtTime(baseFreq * 1.5, t);
    osc2.frequency.exponentialRampToValueAtTime(baseFreq * 2.8, t + 0.28);
    osc2.frequency.exponentialRampToValueAtTime(baseFreq * 0.8, t + 0.85);

    filter.type = isIce ? 'bandpass' : 'lowpass';
    filter.frequency.setValueAtTime(isIce ? 650 : 380, t);
    filter.frequency.exponentialRampToValueAtTime(isIce ? 1400 : 750, t + 0.3);
    filter.frequency.exponentialRampToValueAtTime(isIce ? 400 : 150, t + 0.85);
    filter.Q.setValueAtTime(isIce ? 4.5 : 2.5, t);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.32, t + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.9);
    osc2.stop(t + 0.9);
  } catch (e) {}
}

function playDragonBreath(isIce = false) {
  if (typeof window !== 'undefined' && window.soundMuted) return;
  try {
    if (typeof window === 'undefined') return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    if (!audioCtx) audioCtx = new AudioContextClass();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const t = audioCtx.currentTime;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();

    osc.type = isIce ? 'triangle' : 'sawtooth';
    osc.frequency.setValueAtTime(isIce ? 280 : 180, t);
    osc.frequency.linearRampToValueAtTime(isIce ? 540 : 260, t + 0.3);
    osc.frequency.linearRampToValueAtTime(isIce ? 120 : 80, t + 0.65);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isIce ? 850 : 450, t);
    filter.frequency.linearRampToValueAtTime(isIce ? 1600 : 700, t + 0.25);
    filter.frequency.linearRampToValueAtTime(isIce ? 300 : 120, t + 0.65);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.24, t + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.65);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(t);
    osc.stop(t + 0.65);
  } catch (e) {}
}

function playDragonWingFlap() {
  if (typeof window !== 'undefined' && window.soundMuted) return;
  try {
    if (typeof window === 'undefined') return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    if (!audioCtx) audioCtx = new AudioContextClass();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const t = audioCtx.currentTime;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(90, t);
    osc.frequency.exponentialRampToValueAtTime(42, t + 0.24);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(220, t);
    filter.frequency.exponentialRampToValueAtTime(70, t + 0.24);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.18, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.26);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(t);
    osc.stop(t + 0.26);
  } catch (e) {}
}

function playDragonHatch() {
  if (typeof window !== 'undefined' && window.soundMuted) return;
  try {
    if (typeof window === 'undefined') return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    if (!audioCtx) audioCtx = new AudioContextClass();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const t = audioCtx.currentTime;

    const notes = [
      { f: 220, time: 0, dur: 0.08, vol: 0.15 },
      { f: 330, time: 0.07, dur: 0.09, vol: 0.18 },
      { f: 440, time: 0.16, dur: 0.12, vol: 0.22 },
      { f: 660, time: 0.25, dur: 0.35, vol: 0.26 }
    ];
    notes.forEach(n => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(n.f, t + n.time);
      gain.gain.setValueAtTime(0.001, t + n.time);
      gain.gain.linearRampToValueAtTime(n.vol, t + n.time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + n.time + n.dur);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(t + n.time);
      osc.stop(t + n.time + n.dur);
    });
  } catch (e) {}
}

if (typeof window !== 'undefined') {
  window.playDragonRoar = playDragonRoar;
  window.playDragonBreath = playDragonBreath;
  window.playDragonWingFlap = playDragonWingFlap;
  window.playDragonHatch = playDragonHatch;
}

