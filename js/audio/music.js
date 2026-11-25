// Musique composée : mélodies écrites à la main, arrangement en sections, mixage « pro »
// (réverbération à convolution, écho stéréo, compression, pompe sur la grosse caisse).
import { A } from './audio.js';

// ---------- Notation : "pas.longueur:demi-tons" (16 pas par mesure) ----------
function mel(bars) {
  const out = [];
  bars.forEach((b, bi) => {
    if (!b) return;
    for (const tok of b.trim().split(/\s+/)) {
      const [sl, semi] = tok.split(':');
      const [st, len] = sl.split('.').map(Number);
      out.push([bi * 16 + st, len, Number(semi)]);
    }
  });
  return out;
}

// ---------- Compositions ----------
const SONGS = {
  hero: { bpm: 128, root: 57, drums: 'four', bass: 'pump', arp: 'up16', lead: 'saw',
    chords: [[0, 3, 7], [-4, 0, 3], [3, 7, 10], [-2, 2, 5], [0, 3, 7], [-4, 0, 3], [-2, 2, 5], [-5, -1, 2]],
    melody: mel(['0.3:7 3.1:5 4.4:7 8.2:12 10.2:10 12.4:7', '0.4:8 4.2:7 6.2:5 8.6:3 14.2:5', '0.3:7 3.1:5 4.4:3 8.2:-2 10.2:3 12.4:7', '0.6:5 6.2:2 8.8:-2',
      '0.3:7 3.1:5 4.4:7 8.2:12 10.2:14 12.4:15', '0.4:15 4.2:14 6.2:12 8.6:8 14.2:10', '0.4:10 4.4:8 8.4:5 12.4:2', '0.8:11 8.4:7 12.4:2']) },
  groove: { bpm: 118, root: 52, drums: 'break', bass: 'groove', arp: 'gate16', lead: 'square',
    chords: [[0, 3, 7, 10], [5, 9, 12], [0, 3, 7, 10], [-2, 2, 5], [-4, 0, 3, 7], [-2, 2, 5], [0, 3, 7, 10], [-5, -1, 2, 5]],
    melody: mel(['0.2:7 2.2:10 4.1:12 6.2:10 8.2:7 11.1:5 12.4:7', '0.3:9 3.3:7 6.2:5 8.6:2 14.2:5', '0.2:7 2.2:10 4.1:12 6.2:14 8.2:12 11.1:10 12.4:7', '0.3:5 3.3:2 6.2:5 8.8:-2',
      '0.2:7 2.2:7 4.2:12 6.2:14 8.6:15 14.2:14', '0.4:14 4.2:12 6.2:10 8.8:9', '0.2:7 2.2:10 4.4:12 8.2:15 10.2:14 12.4:12', '0.4:11 4.4:14 8.8:7']) },
  dark: { bpm: 134, root: 48, drums: 'four', bass: 'drive', arp: 'up16', lead: 'saw',
    chords: [[0, 3, 7], [1, 5, 8], [0, 3, 7], [-2, 2, 5], [-4, 0, 3], [1, 5, 8], [0, 3, 7], [-5, -1, 2]],
    melody: mel(['0.2:12 2.2:12 4.2:15 6.2:12 8.4:19 12.2:17 14.2:15', '0.4:13 4.2:12 6.2:10 8.8:8', '0.2:12 2.2:12 4.2:15 6.2:12 8.2:20 10.2:19 12.4:15', '0.4:14 4.2:10 6.2:14 8.8:10',
      '0.4:15 4.2:12 6.2:8 8.4:12 12.4:15', '0.4:17 4.2:13 6.2:17 8.8:20', '0.2:19 2.2:17 4.2:15 6.2:14 8.8:12', '0.4:11 4.4:14 8.8:7']) },
  bright: { bpm: 126, root: 50, drums: 'four', bass: 'pump', arp: 'updown8', lead: 'square',
    chords: [[0, 4, 7], [7, 11, 14], [-3, 0, 4], [5, 9, 12], [0, 4, 7], [7, 11, 14], [5, 9, 12], [7, 11, 14]],
    melody: mel(['0.3:12 3.1:14 4.4:16 8.2:19 10.2:16 12.4:14', '0.4:9 4.2:11 6.2:12 8.8:14', '0.3:14 3.1:12 4.4:11 8.2:9 10.2:11 12.4:14', '0.6:12 6.2:9 8.8:7',
      '0.3:12 3.1:14 4.4:16 8.2:19 10.2:21 12.4:24', '0.4:23 4.2:21 6.2:19 8.8:16', '0.4:17 4.4:16 8.4:14 12.4:11', '0.8:14 8.8:11']) },
  boss: { bpm: 148, root: 40, drums: 'boss', bass: 'drive', arp: 'gate16', lead: 'saw', hard: true, bassOct: 0,
    chords: [[0, 7, 12], [1, 8, 13], [0, 7, 12], [-2, 5, 10], [0, 7, 12], [1, 8, 13], [3, 10, 15], [1, 8, 13]],
    melody: mel(['0.1:12 2.1:12 3.1:13 4.2:12 6.1:10 7.1:12 8.4:15 12.2:13 14.2:12', '0.4:13 4.2:17 6.2:13 8.8:12', '0.1:12 2.1:12 3.1:13 4.2:15 6.1:13 7.1:12 8.4:19 12.4:17', '0.4:15 4.4:14 8.8:10',
      '0.1:24 2.1:24 3.1:25 4.2:24 6.1:22 7.1:24 8.4:27 12.2:25 14.2:24', '0.4:25 4.2:29 6.2:25 8.8:24', '0.2:27 2.2:25 4.2:24 6.2:22 8.4:20 12.4:19', '0.8:17 8.8:13']) },
  anthem: { bpm: 104, root: 50, drums: 'half', bass: 'long', arp: 'updown8', lead: 'saw',
    chords: [[0, 3, 7], [-4, 0, 3], [3, 7, 10], [-2, 2, 5], [0, 3, 7], [-4, 0, 3], [-2, 2, 5], [-5, -1, 2]],
    melody: mel(['0.6:7 6.2:5 8.8:12', '0.6:10 6.2:8 8.8:3', '0.6:5 6.2:7 8.4:10 12.4:12', '0.12:14 12.4:12',
      '0.6:15 6.2:14 8.8:12', '0.6:10 6.2:12 8.8:15', '0.6:14 6.2:12 8.8:10', '0.16:13']) },
  chill: { bpm: 94, root: 50, drums: 'half', bass: 'long', arp: 'chill8', lead: 'bell',
    chords: [[0, 3, 7, 10], [-4, 0, 3, 7], [3, 7, 10, 14], [-2, 2, 5], [0, 3, 7, 10], [-4, 0, 3, 7], [5, 8, 12, 15], [7, 10, 14]],
    melody: mel(['0.6:12 6.2:10 8.8:7', '0.4:5 4.4:7 8.6:8 14.2:7', '0.6:3 6.2:5 8.4:7 12.4:10', '0.12:12 12.4:10',
      '0.6:15 6.2:14 8.8:12', '0.4:10 4.4:12 8.8:8', '0.6:7 6.2:5 8.8:3', '0.8:2 8.8:5']) },
};
// Morceau par nom de piste (monde) avec transposition et tempo propres
const TRACKS = {
  title: ['anthem', 0, 0], menu: ['chill', 0, 0],
  nebula: ['hero', 0, 0], coral: ['groove', 0, 0], amber: ['dark', 2, 0], swamp: ['dark', -1, -4], glacier: ['bright', 0, 0],
  reef: ['hero', 3, -2], volcano: ['dark', 0, 4], hive: ['dark', 5, -2], dunes: ['groove', 2, 4], quantum: ['hero', -2, 4],
  spores: ['bright', -3, -4], heart: ['boss', 3, -6], boss: ['boss', 0, 0], boss2: ['boss', 3, -6], bonus: ['bright', 5, 6], challenge: ['dark', 3, 6],
};

const N = (m) => 440 * Math.pow(2, (m - 69) / 12);

// ---------- Chaîne de mixage ----------
let bus = null;
function makeBus() {
  const c = A.ctx;
  const comp = c.createDynamicsCompressor();
  comp.threshold.value = -18; comp.knee.value = 10; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.25;
  const master = c.createGain(); master.gain.value = 0.9;
  const tone = c.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 18000; tone.Q.value = 0.5;
  master.connect(tone); tone.connect(comp); comp.connect(A.music);
  // Réverbération (réponse impulsionnelle générée)
  const len = Math.floor(c.sampleRate * 1.8);
  const ir = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
  const verb = c.createConvolver(); verb.buffer = ir;
  const verbIn = c.createGain(); verbIn.gain.value = 0.32;
  verbIn.connect(verb); verb.connect(master);
  // Écho stéréo (ping-pong)
  const dIn = c.createGain(); dIn.gain.value = 0.28;
  const dl = c.createDelay(1.5), dr = c.createDelay(1.5), fb = c.createGain(); fb.gain.value = 0.38;
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200;
  const merger = c.createChannelMerger(2);
  dIn.connect(dl); dl.connect(lp); lp.connect(dr); dr.connect(fb); fb.connect(dl);
  lp.connect(merger, 0, 0); dr.connect(merger, 0, 1); merger.connect(master);
  bus = { master, tone, verbIn, dIn, dl, dr };
}

function layersFor(c) {
  const L = {};
  for (const k of ['pad', 'bass', 'drums', 'arp', 'lead']) { L[k] = c.createGain(); L[k].gain.value = 0; }
  L.duck = c.createGain(); L.duck.gain.value = 1;
  L.pad.connect(L.duck); L.bass.connect(L.duck); L.arp.connect(L.duck);
  L.duck.connect(bus.master); L.drums.connect(bus.master); L.lead.connect(bus.master);
  L.pad.connect(bus.verbIn); L.lead.connect(bus.verbIn); L.arp.connect(bus.dIn); L.lead.connect(bus.dIn); L.drums.connect(bus.verbIn);
  return L;
}

export const music = {
  name: null, s: null, bpm: 120, sd: 0.125, step: 0, nextTime: 0, t0: 0, p0: 0, tr: 0,
  timer: null, layers: null, intensity: 0.6,

  play(name, force = false) {
    if (this.name === name && !force && this.s) return;
    this.stopLayers();
    const T = TRACKS[name] || TRACKS.nebula;
    this.name = name;
    this.s = SONGS[T[0]];
    this.tr = T[1];
    this.bpm = this.s.bpm + T[2];
    this.sd = 60 / this.bpm / 4;
    this.step = 0;
    this.p0 = performance.now() / 1000 + 0.1;
    if (A.ctx) this.begin();
    if (!this.timer) this.timer = setInterval(() => this.tick(), 25);
  },
  begin() {
    const c = A.ctx;
    if (!bus) makeBus();
    this.layers = layersFor(c);
    this.nextTime = c.currentTime + 0.1;
    this.t0 = this.nextTime - this.step * this.sd;
    // ouverture progressive du filtre (intro « produite »)
    const t = c.currentTime;
    bus.tone.frequency.cancelScheduledValues(t);
    bus.tone.frequency.setValueAtTime(500, t);
    bus.tone.frequency.exponentialRampToValueAtTime(18000, t + this.sd * 16 * 2);
    bus.dl.delayTime.setValueAtTime(this.sd * 3, t);
    bus.dr.delayTime.setValueAtTime(this.sd * 3, t);
    this.applyIntensity(true);
  },
  stopLayers() {
    if (this.layers && A.ctx) {
      const L = this.layers, t = A.ctx.currentTime;
      for (const k in L) L[k].gain.setTargetAtTime(0, t, 0.12);
      setTimeout(() => { for (const k in L) { try { L[k].disconnect(); } catch (_) { /* */ } } }, 1500);
    }
    this.layers = null;
  },
  stop() { this.stopLayers(); this.name = null; this.s = null; },
  setIntensity(v) { if (Math.abs(v - this.intensity) > 0.02) { this.intensity = v; this.applyIntensity(); } },
  applyIntensity(now) {
    if (!this.layers || !A.ctx) return;
    const i = this.intensity, t = A.ctx.currentTime, tc = now ? 0.01 : 0.5, hard = this.s && this.s.hard;
    const L = this.layers;
    L.pad.gain.setTargetAtTime(1, t, tc);
    L.arp.gain.setTargetAtTime(1, t, tc);
    L.bass.gain.setTargetAtTime(i > 0.1 || hard ? 1 : 0.4, t, tc);
    L.drums.gain.setTargetAtTime(i > 0.25 || hard ? 1 : 0.35, t, tc);
    L.lead.gain.setTargetAtTime(i > 0.3 || hard ? 1 : 0.5, t, tc);
  },
  beatPos() {
    const c = A.ctx;
    if (c && c.state === 'running' && this.layers) {
      const lat = (c.outputLatency || 0) + (c.baseLatency || 0);
      return (c.currentTime - lat - this.t0) / (this.sd * 4);
    }
    return (performance.now() / 1000 - this.p0) / (60 / (this.bpm || 120));
  },
  tick() {
    const c = A.ctx;
    if (!c || !this.s) return;
    if (!this.layers) this.begin();
    if (c.state !== 'running') return;
    if (this.nextTime < c.currentTime - 0.2) { this.nextTime = c.currentTime + 0.05; this.t0 = this.nextTime - this.step * this.sd; }
    const on = A.settings && A.settings.music.on && A.settings.master.on;
    while (this.nextTime < c.currentTime + 0.14) {
      if (on) this.playStep(this.step, this.nextTime);
      this.nextTime += this.sd;
      this.step++;
    }
  },
  playStep(step, t) {
    const S = this.s, L = this.layers, sd = this.sd, tr = this.tr;
    const st = step % 16, bar = Math.floor(step / 16), b8 = bar % 8, sec = Math.floor(bar / 8);
    const intro = bar < 2;
    const root = S.root + tr;
    const chord = S.chords[b8].map((x) => root + x);
    // Nappe : un accord par mesure
    if (st === 0) { pad(t, chord.map((m) => m + 12), sd * 16, L.pad, S.lead === 'bell' ? 0.05 : 0.04); if (b8 === 0 && sec > 0) crash(t, L.drums); }
    // Pont : toutes les 4 sections, 4 mesures sans grosse caisse ni basse, avec montée
    const brk = sec % 4 === 2 && b8 < 4 && !S.hard;
    if (brk && b8 === 3 && st === 0) riser(t, sd * 16, L.drums);
    // Basse
    if (!intro && !brk) bassLine(S.bass, st, t, chord[0] + (S.bassOct ?? -12), chord, sd, L.bass, b8);
    // Batterie (+ pompe sur la grosse caisse)
    if (brk) { if (st % 2 === 0) hat(t, L.drums, 0.03); if (b8 === 3 && st >= 8) snare(t, L.drums, 0.05 + (st - 8) * 0.025); }
    else if (!intro || S.drums === 'half') drums(S.drums, st, t, L, b8, this.intensity, sd);
    // Arpège
    arp(S.arp, st, t, chord, sd, L.arp, step);
    // Mélodie : sections alternées (B = refrain avec le thème), A = thème une octave plus bas, plus doux
    if (bar >= 2) {
      const ms = b8 * 16 + st;
      const chorus = sec % 2 === 1 || this.intensity > 0.9;
      for (const [s0, len, semi] of S.melody) {
        if (s0 !== ms) continue;
        if (chorus) lead(S.lead, t, root + 12 + semi, len * sd * 0.95, L.lead, 1);
        else if (sec % 2 === 0 && b8 >= 4) lead(S.lead === 'saw' ? 'pluck' : S.lead, t, root + semi, len * sd * 0.9, L.lead, 0.6);
      }
    }
  },
};

// ---------- Instruments ----------
function env(g, t, a, peak, hold, rel) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  if (hold > a) g.gain.setValueAtTime(peak, t + hold);
  g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(hold, a) + rel);
}
function osc(type, f, t, dur, dest, det = 0) { const o = A.ctx.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = det; o.connect(dest); o.start(t); o.stop(t + dur + 0.05); return o; }
function noiseSrc(t, dur, dest) { const n = A.ctx.createBufferSource(); n.buffer = A.noise; n.loop = true; n.connect(dest); n.start(t, Math.random() * 0.8); n.stop(t + dur + 0.05); return n; }

function pad(t, notes, dur, dest, v) {
  const c = A.ctx;
  const f = c.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 0.6;
  f.frequency.setValueAtTime(900, t); f.frequency.linearRampToValueAtTime(2000, t + dur * 0.5); f.frequency.linearRampToValueAtTime(1100, t + dur);
  const g = c.createGain(); env(g, t, Math.min(0.5, dur * 0.25), v, dur * 0.8, dur * 0.45);
  f.connect(g); g.connect(dest);
  for (const m of notes) for (const d of [-10, 10]) osc('sawtooth', N(m), t, dur * 1.25, f, d);
}
function bassNote(t, m, dur, dest, soft) {
  const c = A.ctx;
  const f = c.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = soft ? 1 : 6;
  f.frequency.setValueAtTime(soft ? 700 : 1400, t); f.frequency.exponentialRampToValueAtTime(soft ? 300 : 190, t + Math.min(dur, 0.3));
  const g = c.createGain(); env(g, t, 0.006, soft ? 0.2 : 0.22, dur * 0.7, 0.08);
  osc(soft ? 'triangle' : 'sawtooth', N(m), t, dur + 0.1, f);
  const sub = c.createGain(); sub.gain.value = 0.7; osc('sine', N(m - 12 + 12), t, dur + 0.1, sub); sub.connect(f);
  f.connect(g); g.connect(dest);
}
function bassLine(style, st, t, r, chord, sd, dest, b8) {
  if (style === 'pump') { if (st % 2 === 0) bassNote(t, r + (st % 4 === 2 ? 12 : 0), sd * 1.6, dest); }
  else if (style === 'groove') { const pat = { 0: 0, 3: 0, 6: 12, 8: 7, 10: 0, 11: 10, 14: 12 }; if (pat[st] !== undefined) bassNote(t, r + pat[st], sd * (st === 0 ? 2.5 : 1.4), dest); }
  else if (style === 'drive') { bassNote(t, r + (st === 14 && b8 % 2 ? 12 : 0), sd * 0.9, dest); }
  else if (style === 'long') { if (st === 0) bassNote(t, r, sd * 12, dest, true); if (st === 12) bassNote(t, r + 7, sd * 4, dest, true); }
}
function arp(style, st, t, chord, sd, dest, step) {
  const tones = [chord[0], chord[1], chord[2], chord[0] + 12, chord[1] + 12, chord[2] + 12, chord[0] + 24];
  let m = null;
  if (style === 'up16') m = tones[step % 6] + 12;
  else if (style === 'updown8') { if (st % 2 === 0) m = tones[[0, 1, 2, 3, 4, 3, 2, 1][(st / 2) % 8]] + 12; }
  else if (style === 'gate16') m = (st % 4 === 3 ? chord[1] : chord[0]) + 24 + (st % 8 === 6 ? 7 : 0);
  else if (style === 'chill8') { if (st % 2 === 0) m = tones[[0, 2, 4, 1, 3, 5, 2, 4][(st / 2) % 8]] + 12; }
  if (m === null) return;
  const c = A.ctx;
  const f = c.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 3;
  f.frequency.setValueAtTime(style === 'chill8' ? 2200 : 3600, t); f.frequency.exponentialRampToValueAtTime(500, t + sd * 1.4);
  const g = c.createGain(); env(g, t, 0.004, style === 'gate16' ? 0.045 : 0.055, 0.01, sd * 1.3);
  osc(style === 'chill8' ? 'triangle' : 'sawtooth', N(m), t, sd * 1.5, f);
  f.connect(g); g.connect(dest);
}
function lead(kind, t, m, dur, dest, vel) {
  const c = A.ctx;
  const g = c.createGain();
  const f = c.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 1.2;
  f.connect(g); g.connect(dest);
  if (kind === 'bell') {
    env(g, t, 0.005, 0.11 * vel, 0.02, Math.max(0.6, dur));
    f.frequency.value = 6000;
    osc('sine', N(m), t, dur + 1, f); const h = c.createGain(); h.gain.value = 0.35; h.connect(f); osc('sine', N(m) * 3.01, t, 0.6, h);
    return;
  }
  if (kind === 'pluck') {
    env(g, t, 0.004, 0.07 * vel, 0.02, Math.min(0.5, dur));
    f.frequency.setValueAtTime(3000, t); f.frequency.exponentialRampToValueAtTime(600, t + 0.3);
    osc('sawtooth', N(m), t, dur + 0.5, f); osc('sawtooth', N(m), t, dur + 0.5, f, 9);
    return;
  }
  const v = (kind === 'square' ? 0.055 : 0.05) * vel;
  env(g, t, 0.012, v, Math.max(0.04, dur - 0.05), 0.16);
  f.frequency.setValueAtTime(kind === 'square' ? 3800 : 4800, t);
  // vibrato qui arrive après l'attaque
  const lfo = c.createOscillator(), lg = c.createGain();
  lfo.frequency.value = 5.6; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(dur > 0.3 ? 14 : 0, t + Math.min(0.35, dur));
  lfo.connect(lg); lfo.start(t); lfo.stop(t + dur + 0.3);
  const dets = kind === 'square' ? [-6, 6] : [-13, 13];
  for (const d of dets) { const o = osc(kind === 'square' ? 'square' : 'sawtooth', N(m), t, dur + 0.25, f, d); lg.connect(o.detune); }
  if (kind === 'saw') { const s2 = c.createGain(); s2.gain.value = 0.35; s2.connect(f); osc('square', N(m - 12), t, dur + 0.2, s2); }
}
function kick(t, L) {
  const c = A.ctx;
  const g = c.createGain(); env(g, t, 0.003, 0.9, 0.02, 0.32);
  const o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(165, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.11);
  o.connect(g); g.connect(L.drums); o.start(t); o.stop(t + 0.42);
  const ck = c.createBiquadFilter(); ck.type = 'highpass'; ck.frequency.value = 3000;
  const cg = c.createGain(); env(cg, t, 0.001, 0.25, 0.002, 0.015); ck.connect(cg); cg.connect(L.drums); noiseSrc(t, 0.03, ck);
  // pompe (sidechain)
  L.duck.gain.cancelScheduledValues(t); L.duck.gain.setValueAtTime(0.35, t); L.duck.gain.linearRampToValueAtTime(1, t + 0.22);
}
function snare(t, dest, v) {
  const c = A.ctx;
  const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1900; f.Q.value = 0.7;
  const g = c.createGain(); env(g, t, 0.002, v, 0.01, 0.17); f.connect(g); g.connect(dest); noiseSrc(t, 0.25, f);
  const g2 = c.createGain(); env(g2, t, 0.002, v * 0.55, 0.01, 0.08); g2.connect(dest);
  const o = c.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(205, t); o.frequency.exponentialRampToValueAtTime(150, t + 0.07); o.connect(g2); o.start(t); o.stop(t + 0.12);
}
function clap(t, dest) {
  const c = A.ctx;
  const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1400; f.Q.value = 1.2; f.connect(dest);
  const g = c.createGain(); g.connect(f);
  g.gain.setValueAtTime(0.0001, t);
  for (let i = 0; i < 3; i++) { const u = t + i * 0.011; g.gain.setValueAtTime(0.17, u); g.gain.exponentialRampToValueAtTime(0.02, u + 0.009); }
  g.gain.setValueAtTime(0.16, t + 0.033); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
  noiseSrc(t, 0.2, g);
}
function hat(t, dest, v, open) {
  const c = A.ctx;
  const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 8200;
  const g = c.createGain(); env(g, t, 0.001, v, 0.002, open ? 0.22 : 0.035); f.connect(g); g.connect(dest); noiseSrc(t, open ? 0.3 : 0.06, f);
}
function crash(t, dest) {
  const c = A.ctx;
  const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 4500;
  const g = c.createGain(); env(g, t, 0.003, 0.08, 0.01, 1.6); f.connect(g); g.connect(dest); noiseSrc(t, 1.7, f);
}
function riser(t, dur, dest) {
  const c = A.ctx;
  const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 2;
  f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(9000, t + dur);
  const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + dur); g.gain.linearRampToValueAtTime(0, t + dur + 0.02);
  f.connect(g); g.connect(dest); noiseSrc(t, dur, f);
}
function drums(style, st, t, L, b8, inten, sd) {
  const D = L.drums;
  const fill = b8 === 7 && st >= 12;
  if (style === 'four') {
    if (st % 4 === 0) kick(t, L);
    if (st === 4 || st === 12) { snare(t, D, 0.24); clap(t, D); }
    if (st % 4 === 2) hat(t, D, 0.07, st === 14 && b8 % 2 === 1);
    else if (inten > 0.6 && st % 2 === 1) hat(t, D, 0.03);
    if (fill && st % 1 === 0 && st !== 12) snare(t, D, 0.1 + (st - 12) * 0.04);
  } else if (style === 'break') {
    if (st === 0 || st === 7 || st === 10) kick(t, L);
    if (st === 4 || st === 12) snare(t, D, 0.26);
    hat(t, D, st % 2 ? 0.03 : 0.06, st === 6);
    if (fill && st > 12) snare(t, D, 0.12);
  } else if (style === 'half') {
    if (st === 0 || st === 10) kick(t, L);
    if (st === 8) { snare(t, D, 0.16); clap(t, D); }
    if (st % 2 === 0) hat(t, D, 0.035);
  } else if (style === 'boss') {
    if ([0, 3, 6, 8, 11, 14].includes(st)) kick(t, L);
    if (st === 4 || st === 12) { snare(t, D, 0.28); clap(t, D); }
    hat(t, D, st % 2 ? 0.035 : 0.065);
    if (fill) snare(t, D, 0.14);
  }
}

export const TRACK_NAMES = Object.keys(TRACKS);
