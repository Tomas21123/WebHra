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

