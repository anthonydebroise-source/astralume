// Cœur audio Web Audio : contexte, bus (général / musique / bruitages), déverrouillage iOS
export const A = {
  ctx: null, master: null, music: null, sfx: null, comp: null, delayIn: null, noise: null,
  settings: null,
};

export function setAudioSettings(s) { A.settings = s; applyVolumes(); }

export function ensureAudio() {
  if (A.ctx) {
    if (A.ctx.state !== 'running' && !document.hidden) A.ctx.resume().catch(() => {});
    return A.ctx;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  let ctx;
  try { ctx = new AC({ latencyHint: 'interactive' }); } catch (_) { ctx = new AC(); }
  A.ctx = ctx;
  A.comp = ctx.createDynamicsCompressor();
  A.comp.threshold.value = -16; A.comp.knee.value = 14; A.comp.ratio.value = 4;
  A.comp.attack.value = 0.004; A.comp.release.value = 0.22;
  A.master = ctx.createGain();
  A.master.connect(A.comp); A.comp.connect(ctx.destination);
  A.music = ctx.createGain(); A.music.connect(A.master);
  A.sfx = ctx.createGain(); A.sfx.connect(A.master);
  // Écho spatial pour la musique
  A.delayIn = ctx.createGain(); A.delayIn.gain.value = 0.5;
  const d = ctx.createDelay(1.5); d.delayTime.value = 0.375;
  const fb = ctx.createGain(); fb.gain.value = 0.34;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600;
  A.delayIn.connect(d); d.connect(lp); lp.connect(fb); fb.connect(d); lp.connect(A.music);
  A.delayNode = d;
  // Bruit blanc partagé
  const len = Math.floor(ctx.sampleRate * 1.5);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  A.noise = buf;
  // Déverrouillage iOS : tampon silencieux
  try {
    const src = ctx.createBufferSource();
    src.buffer = ctx.createBuffer(1, 1, 22050);
    src.connect(ctx.destination); src.start(0);
  } catch (_) { /* ignore */ }
  ctx.resume && ctx.resume().catch(() => {});
  applyVolumes();
  return ctx;
}

const vol = (o) => (o && o.on ? o.vol * o.vol : 0);
export function applyVolumes() {
  if (!A.ctx || !A.settings) return;
  const s = A.settings, t = A.ctx.currentTime;
  A.master.gain.setTargetAtTime(vol(s.master), t, 0.03);
  A.music.gain.setTargetAtTime(vol(s.music) * 0.6, t, 0.03);
  A.sfx.gain.setTargetAtTime(vol(s.sfx) * 0.9, t, 0.03);
}
export function audioRunning() { return !!(A.ctx && A.ctx.state === 'running'); }

export function initAudioUnlock() {
  const h = () => ensureAudio();
  ['pointerdown', 'touchend', 'click', 'keydown'].forEach((ev) => window.addEventListener(ev, h, { passive: true, capture: true }));
  document.addEventListener('visibilitychange', () => {
    if (!A.ctx) return;
    if (document.hidden) A.ctx.suspend().catch(() => {});
    else A.ctx.resume().catch(() => {});
  });
}
