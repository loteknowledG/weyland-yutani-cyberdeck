// src/AudioEngine.js
let audioCtx = null;
let masterGain = null;
let lastPlayTime = 0;

export const setupAudio = () => {
  if (audioCtx && audioCtx.state !== 'closed') {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return;
  }
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const bufferSize = 2 * audioCtx.sampleRate;
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) output[i] = (Math.random() * 2 - 1) * 0.4;
    const noiseSource = audioCtx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;
    masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(0, audioCtx.currentTime);
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass'; filter.frequency.value = 1100;
    noiseSource.connect(filter);
    filter.connect(masterGain);
    masterGain.connect(audioCtx.destination);
    noiseSource.start();
  } catch (e) { console.error("AUDIO_ERR", e); }
};

export const playSystemSound = (type = 'click', vol = 0.08) => {
  if (!audioCtx) setupAudio();
  const now = audioCtx.currentTime;
  if (type === 'click' && masterGain) {
    if (now - lastPlayTime < 0.05) return;
    lastPlayTime = now;
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setTargetAtTime(vol, now, 0.001);
    masterGain.gain.setTargetAtTime(0, now + 0.015, 0.01);
  } else if (type === 'chirp') {
    const osc = audioCtx.createOscillator(); const g = audioCtx.createGain();
    osc.frequency.setValueAtTime(1400, now); osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
    g.gain.setValueAtTime(0.04, now); g.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
    osc.connect(g); g.connect(audioCtx.destination);
    osc.start(); osc.stop(now + 0.1);
  } else if (type === 'keypress') {
    const now = audioCtx.currentTime;

    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = 'square';
    osc1.frequency.setValueAtTime(1040, now);
    gain1.gain.setValueAtTime(0.05, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.start(); osc1.stop(now + 0.06);

    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(520, now);
    gain2.gain.setValueAtTime(0.04, now);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.start(); osc2.stop(now + 0.05);

    const osc3 = audioCtx.createOscillator();
    const gain3 = audioCtx.createGain();
    osc3.type = 'triangle';
    osc3.frequency.setValueAtTime(2080, now + 0.01);
    gain3.gain.setValueAtTime(0.025, now + 0.01);
    gain3.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
    osc3.connect(gain3);
    gain3.connect(audioCtx.destination);
    osc3.start(now + 0.01); osc3.stop(now + 0.07);
  }
};

export const playLock = () => {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();

  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = 'triangle';
  osc1.frequency.setValueAtTime(150, ctx.currentTime);
  osc1.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.1);

  gain1.gain.setValueAtTime(0.3, ctx.currentTime);
  gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'square';
  osc2.frequency.setValueAtTime(800, ctx.currentTime);

  gain2.gain.setValueAtTime(0.1, ctx.currentTime);
  gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);

  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc2.connect(gain2);
  gain2.connect(ctx.destination);

  osc1.start();
  osc2.start();
  osc1.stop(ctx.currentTime + 0.2);
  osc2.stop(ctx.currentTime + 0.2);
};

export const playSnapLock = () => {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const now = ctx.currentTime;

  const thud = ctx.createOscillator();
  const thudGain = ctx.createGain();
  thud.type = 'triangle';
  thud.frequency.setValueAtTime(220, now);
  thud.frequency.exponentialRampToValueAtTime(70, now + 0.08);
  thudGain.gain.setValueAtTime(0.12, now);
  thudGain.gain.exponentialRampToValueAtTime(0.01, now + 0.11);

  const latch = ctx.createOscillator();
  const latchGain = ctx.createGain();
  latch.type = 'square';
  latch.frequency.setValueAtTime(1200, now);
  latchGain.gain.setValueAtTime(0.03, now);
  latchGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

  thud.connect(thudGain);
  thudGain.connect(ctx.destination);
  latch.connect(latchGain);
  latchGain.connect(ctx.destination);

  thud.start();
  latch.start();
  thud.stop(now + 0.11);
  latch.stop(now + 0.04);
};

export const playThinking = () => {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const now = ctx.currentTime;

  for (let i = 0; i < 3; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(660, now + i * 0.18);
    gain.gain.setValueAtTime(0.06, now + i * 0.18);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.18 + 0.08);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + i * 0.18);
    osc.stop(now + i * 0.18 + 0.08);
  }
};

export const playResponseStart = () => {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(200, now);
  osc.frequency.exponentialRampToValueAtTime(600, now + 0.08);
  gain.gain.setValueAtTime(0.06, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(now + 0.1);
};

export const playResponseEnd = () => {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(900, now);
  osc.frequency.exponentialRampToValueAtTime(300, now + 0.15);
  gain.gain.setValueAtTime(0.08, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(now + 0.18);
};