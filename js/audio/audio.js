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
  A.music.gain.setTargetAtTime(vol(s.music) * 1.5, t, 0.03);
  A.sfx.gain.setTargetAtTime(vol(s.sfx) * 0.9, t, 0.03);
}
export function audioRunning() { return !!(A.ctx && A.ctx.state === 'running'); }

// iPhone : par défaut, le son Web Audio est coupé par le bouton silencieux.
// On demande une session audio « lecture » (Safari 16.4+) et on lance en boucle
// un son HTML silencieux, ce qui bascule l'iPhone en mode lecteur multimédia.
let htmlAudio = null;
function silentWavURL() {
  const n = 4000, b = new ArrayBuffer(44 + n), v = new DataView(b);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + n, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, 8000, true); v.setUint32(28, 8000, true);
  v.setUint16(32, 1, true); v.setUint16(34, 8, true); w(36, 'data'); v.setUint32(40, n, true);
  for (let i = 0; i < n; i++) v.setUint8(44 + i, 128);
  let bin = ''; const u8 = new Uint8Array(b); for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
  return 'data:audio/wav;base64,' + btoa(bin);
}
function unlockMediaSession() {
  try { if (navigator.audioSession && navigator.audioSession.type !== 'playback') navigator.audioSession.type = 'playback'; } catch (_) { /* */ }
  if (htmlAudio) return;
  try {
    htmlAudio = new Audio(silentWavURL());
    htmlAudio.loop = true; htmlAudio.setAttribute('playsinline', ''); htmlAudio.setAttribute('x-webkit-airplay', 'deny');
    const p = htmlAudio.play();
    if (p && p.catch) p.catch(() => { htmlAudio = null; });
  } catch (_) { htmlAudio = null; }
}
export function initAudioUnlock() {
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (_) { /* */ }
  const h = () => { unlockMediaSession(); ensureAudio(); };
  ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'mousedown', 'click', 'keydown'].forEach((ev) => window.addEventListener(ev, h, { passive: true, capture: true }));
  document.addEventListener('visibilitychange', () => {
    if (!A.ctx) return;
    if (document.hidden) { A.ctx.suspend().catch(() => {}); if (htmlAudio) htmlAudio.pause(); }
    else { A.ctx.resume().catch(() => {}); if (htmlAudio) htmlAudio.play().catch(() => {}); }
  });
}
