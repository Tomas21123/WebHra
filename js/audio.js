// ---------- Web Audio API Syntetizér pro Útoky ----------
let audioCtx = null;

function playAttackSound(type) {
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
