// Musique procédurale : séquenceur Web Audio, morceaux générés, couches d'intensité, horloge de rythme
import { A } from './audio.js';
import { RNG } from '../engine/math.js';

const SCALES = {
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phryg: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  major: [0, 2, 4, 5, 7, 9, 11],
  harm: [0, 2, 3, 5, 7, 8, 11],
  mixo: [0, 2, 4, 5, 7, 9, 10],
};

// Définitions des morceaux (tonalité, tempo, progression, style)
const TRACKS = {
  title:    { bpm: 96,  root: 50, scale: 'dorian', prog: [0, 5, 3, 4], seed: 11, drums: 4, bass: 4, arp: 'up', arpW: 'triangle', lead: 'triangle', pad: 1 },
  menu:     { bpm: 104, root: 52, scale: 'lydian', prog: [0, 4, 5, 3], seed: 23, drums: 1, bass: 0, arp: 'updown', arpW: 'triangle', lead: 'sine', pad: 1 },
  nebula:   { bpm: 122, root: 45, scale: 'minor', prog: [0, 5, 2, 6], seed: 31, drums: 2, bass: 1, arp: 'up', arpW: 'square', lead: 'sawtooth' },
  coral:    { bpm: 118, root: 47, scale: 'dorian', prog: [0, 3, 6, 4], seed: 41, drums: 2, bass: 2, arp: 'rand', arpW: 'triangle', lead: 'square' },
  amber:    { bpm: 126, root: 44, scale: 'mixo', prog: [0, 6, 3, 0], seed: 53, drums: 3, bass: 3, arp: 'pulse', arpW: 'sawtooth', lead: 'square' },
  swamp:    { bpm: 112, root: 43, scale: 'phryg', prog: [0, 1, 0, 6], seed: 67, drums: 4, bass: 2, arp: 'down', arpW: 'triangle', lead: 'sawtooth' },
  glacier:  { bpm: 120, root: 49, scale: 'lydian', prog: [0, 1, 4, 5], seed: 71, drums: 2, bass: 1, arp: 'updown', arpW: 'sine', lead: 'triangle' },
  reef:     { bpm: 124, root: 46, scale: 'dorian', prog: [0, 6, 5, 4], seed: 83, drums: 2, bass: 1, arp: 'up', arpW: 'square', lead: 'triangle' },
  volcano:  { bpm: 134, root: 40, scale: 'harm', prog: [0, 5, 4, 4], seed: 97, drums: 3, bass: 3, arp: 'pulse', arpW: 'sawtooth', lead: 'sawtooth' },
  hive:     { bpm: 116, root: 42, scale: 'phryg', prog: [0, 1, 6, 1], seed: 101, drums: 4, bass: 3, arp: 'rand', arpW: 'square', lead: 'sawtooth' },
  dunes:    { bpm: 120, root: 45, scale: 'harm', prog: [0, 3, 4, 0], seed: 113, drums: 2, bass: 2, arp: 'down', arpW: 'triangle', lead: 'square' },
  quantum:  { bpm: 128, root: 48, scale: 'minor', prog: [0, 2, 5, 4], seed: 127, drums: 3, bass: 1, arp: 'rand', arpW: 'square', lead: 'sine' },
  spores:   { bpm: 114, root: 47, scale: 'dorian', prog: [0, 4, 3, 6], seed: 139, drums: 4, bass: 2, arp: 'updown', arpW: 'triangle', lead: 'triangle' },
  heart:    { bpm: 138, root: 41, scale: 'harm', prog: [0, 5, 1, 4], seed: 149, drums: 3, bass: 3, arp: 'pulse', arpW: 'sawtooth', lead: 'sawtooth' },
  boss:     { bpm: 146, root: 40, scale: 'phryg', prog: [0, 1, 0, 6], seed: 151, drums: 3, bass: 3, arp: 'pulse', arpW: 'sawtooth', lead: 'sawtooth', hard: 1 },
  boss2:    { bpm: 140, root: 43, scale: 'harm', prog: [0, 5, 6, 4], seed: 163, drums: 3, bass: 3, arp: 'rand', arpW: 'square', lead: 'sawtooth', hard: 1 },
  bonus:    { bpm: 132, root: 55, scale: 'major', prog: [0, 4, 5, 3], seed: 173, drums: 2, bass: 2, arp: 'up', arpW: 'square', lead: 'square' },
  challenge:{ bpm: 136, root: 46, scale: 'minor', prog: [0, 6, 5, 6], seed: 181, drums: 3, bass: 3, arp: 'down', arpW: 'square', lead: 'sawtooth' },
};

const BASS = [
  [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0],
  [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 3, 0],
  [1, 0, 0, 0, 3, 0, 0, 1, 0, 0, 1, 0, 2, 0, 0, 0],
  [1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 2, 3],
  [1, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 3, 0],
];
const DRUMS = [
  { k: [], s: [], h: [] },
  { k: [0, 8], s: [], h: [4, 12] },
  { k: [0, 4, 8, 12], s: [4, 12], h: [2, 6, 10, 14], g: [1, 3, 5, 7, 9, 11, 13, 15] },
  { k: [0, 3, 8, 10], s: [4, 12], h: [0, 2, 4, 6, 8, 10, 12, 14], g: [1, 3, 5, 7, 9, 11, 13, 15], x: [15] },
  { k: [0, 10], s: [8], h: [0, 2, 4, 6, 8, 10, 12, 14] },
];
const RHYTHMS = [
  [0, 3, 6, 8, 10, 12, 14, 16, 19, 22, 24, 28],
  [0, 4, 6, 8, 12, 16, 18, 20, 24, 26],
  [0, 2, 4, 7, 8, 12, 15, 16, 18, 20, 23, 24, 28],
  [0, 6, 8, 12, 14, 16, 22, 24, 30],
];

const N = (m) => 440 * Math.pow(2, (m - 69) / 12);

function semi(scale, deg) {
  const n = scale.length;
  const o = Math.floor(deg / n);
  return scale[((deg % n) + n) % n] + 12 * o;
}

function buildSong(def) {
  const rng = new RNG(def.seed);
  const sc = SCALES[def.scale];
  const arpPat = [];
  for (let v = 0; v < 2; v++) {
    const p = [];
    for (let i = 0; i < 16; i++) {
      let idx;
      if (def.arp === 'up') idx = i % 4;
      else if (def.arp === 'down') idx = 3 - (i % 4);
      else if (def.arp === 'updown') idx = [0, 1, 2, 3, 2, 1][i % 6];
      else if (def.arp === 'pulse') idx = i % 2 === 0 ? 0 : [1, 2, 3][(i >> 1) % 3];
      else idx = rng.int(0, 3);
      if (v === 1 && rng.chance(0.25)) idx = -1;
      p.push(idx);
    }
    arpPat.push(p);
  }
  const rhythm = rng.pick(RHYTHMS);
  const motif = [];
  let deg = rng.pick([0, 2, 4]);
  for (let i = 0; i < rhythm.length; i++) {
    const nextOn = i + 1 < rhythm.length ? rhythm[i + 1] : 32;
    deg += rng.pick([-2, -1, -1, 1, 1, 2, 0, 3, -3]);
    deg = Math.max(-2, Math.min(9, deg));
    if (i === rhythm.length - 1) deg = rng.pick([0, 2, 4]);
    motif.push({ at: rhythm[i], len: Math.max(1, nextOn - rhythm[i]), deg });
  }
  const motifB = motif.map((n, i) => (i >= motif.length - 3 ? { ...n, deg: n.deg + rng.pick([-1, 1, 2]) } : n));
  return { def, sc, arpPat, motif, motifB, bassPat: BASS[def.bass], drums: DRUMS[def.drums] };
}

const songs = {};
function song(name) { return songs[name] || (songs[name] = buildSong(TRACKS[name] || TRACKS.nebula)); }

export const music = {
  name: null, s: null, bpm: 120, sd: 0.125, step: 0, nextTime: 0, t0: 0, p0: 0,
  timer: null, layers: null, intensity: 0.6, loops: 0,

  play(name, force = false) {
    if (this.name === name && !force && this.s) return;
    this.stopLayers();
    this.name = name;
    this.s = song(name);
    this.bpm = this.s.def.bpm;
    this.sd = 60 / this.bpm / 4;
    this.step = 0; this.loops = 0;
    this.p0 = performance.now() / 1000 + 0.1;
    const c = A.ctx;
    if (c) {
      this.makeLayers();
      this.nextTime = c.currentTime + 0.1;
      this.t0 = this.nextTime;
    }
    if (!this.timer) this.timer = setInterval(() => this.tick(), 25);
  },
  makeLayers() {
    const c = A.ctx;
    const L = {};
    for (const k of ['pad', 'bass', 'drums', 'arp', 'lead']) { L[k] = c.createGain(); L[k].gain.value = 0; L[k].connect(A.music); }
    L.lead.connect(A.delayIn); L.arp.connect(A.delayIn);
    this.layers = L;
    this.applyIntensity(true);
  },
  stopLayers() {
    if (this.layers && A.ctx) {
      const L = this.layers, t = A.ctx.currentTime;
      for (const k in L) { L[k].gain.setTargetAtTime(0, t, 0.15); }
      setTimeout(() => { for (const k in L) { try { L[k].disconnect(); } catch (_) { /* */ } } }, 1200);
    }
    this.layers = null;
  },
  stop() { this.stopLayers(); this.name = null; this.s = null; },
  setIntensity(v) { if (Math.abs(v - this.intensity) > 0.02) { this.intensity = v; this.applyIntensity(); } },
  applyIntensity(now) {
    if (!this.layers || !A.ctx) return;
    const i = this.intensity, t = A.ctx.currentTime, tc = now ? 0.01 : 0.6;
    const hard = this.s && this.s.def.hard;
    const L = this.layers;
    L.pad.gain.setTargetAtTime(1, t, tc);
    L.bass.gain.setTargetAtTime(i > 0.12 || hard ? 1 : 0, t, tc);
    L.drums.gain.setTargetAtTime(i > 0.3 || hard ? 1 : 0, t, tc);
    L.arp.gain.setTargetAtTime(i > 0.48 || hard ? 1 : 0, t, tc);
    L.lead.gain.setTargetAtTime(i > 0.7 ? 1 : 0, t, tc);
  },
  // Position en temps (beats, flottant) — fonctionne même son coupé
  beatPos() {
    const c = A.ctx;
    if (c && c.state === 'running' && this.layers) {
      const lat = (c.outputLatency || 0) + (c.baseLatency || 0);
      return (c.currentTime - lat - this.t0) / (this.sd * 4);
    }
    return (performance.now() / 1000 - this.p0) / ((60 / (this.bpm || 120)));
  },
  tick() {
    const c = A.ctx;
    if (!c || !this.s) return;
    if (!this.layers) { this.makeLayers(); this.nextTime = c.currentTime + 0.05; this.t0 = this.nextTime - this.step * this.sd; }
    if (c.state !== 'running') return;
    if (this.nextTime < c.currentTime - 0.2) {
      this.nextTime = c.currentTime + 0.05;
      this.t0 = this.nextTime - this.step * this.sd;
    }
    const on = A.settings && A.settings.music.on && A.settings.master.on;
    while (this.nextTime < c.currentTime + 0.13) {
      if (on) this.playStep(this.step, this.nextTime);
      this.nextTime += this.sd;
      this.step++;
    }
  },
  playStep(step, t) {
    const s = this.s, d = s.def, sc = s.sc, L = this.layers;
    const st = step % 16;
    const bar = Math.floor(step / 16);
    const loop = Math.floor(bar / 8);
    const chordDeg = d.prog[bar % d.prog.length] + (bar % 8 >= 4 && d.prog.length === 4 && (bar % 8) === 7 && loop % 2 ? 1 : 0);
    const root = d.root;
    const chord = [0, 2, 4, 7].map((k) => root + semi(sc, chordDeg + k));
    const sd = this.sd;
    // Pad (accord) au début de chaque mesure
    if (st === 0) pad(t, chord.slice(0, 3).map((m) => m + 12), sd * 16, L.pad, d.pad ? 0.05 : 0.035);
    // Basse
    const bp = s.bassPat[st];
    if (bp) {
      const m = root - 12 + (bp === 2 ? semi(sc, chordDeg + 4) : semi(sc, chordDeg)) + (bp === 3 ? 12 : 0);
      bass(t, m, sd * 1.7, L.bass);
    }
    // Batterie
    const dr = s.drums;
    if (dr.k.includes(st)) kick(t, L.drums);
    if (dr.s.includes(st)) snare(t, L.drums, 0.22);
    if (dr.x && dr.x.includes(st) && bar % 2) snare(t, L.drums, 0.08);
    if (dr.h.includes(st)) hat(t, L.drums, 0.07);
    else if (dr.g && dr.g.includes(st) && this.intensity > 0.75) hat(t, L.drums, 0.03);
    // Arpège
    const ap = s.arpPat[loop % 2][st];
    if (ap >= 0 && (d.arp !== 'pulse' || st % 1 === 0)) pluck(t, chord[ap] + 24, sd * 0.9, L.arp, d.arpW);
    // Mélodie (2 mesures), jouée une boucle sur deux sauf en intensité max
    if (loop % 2 === 1 || this.intensity > 0.92) {
      const ms = (bar % 2) * 16 + st;
      const mot = bar % 4 >= 2 ? s.motifB : s.motif;
      for (const n of mot) if (n.at === ms) lead(t, root + 12 + semi(sc, chordDeg + n.deg), n.len * sd * 0.92, L.lead, d.lead);
    }
  },
};

// ---------- Voix ----------
function pad(t, notes, dur, dest, v) {
  const c = A.ctx;
  const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1300; f.Q.value = 0.6;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v, t + Math.min(0.6, dur * 0.3));
  g.gain.setValueAtTime(v, t + dur * 0.75);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur * 1.05);
  f.connect(g); g.connect(dest);
  for (const m of notes) {
    for (const det of [-9, 9]) {
      const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = N(m); o.detune.value = det;
      o.connect(f); o.start(t); o.stop(t + dur * 1.1);
    }
  }
  setTimeout(() => { try { g.disconnect(); } catch (_) { /* */ } }, (dur * 1.2 + (t - c.currentTime)) * 1000 + 200);
}
function bass(t, m, dur, dest) {
  const c = A.ctx;
  const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = N(m);
  const o2 = c.createOscillator(); o2.type = 'square'; o2.frequency.value = N(m - 12);
  const f = c.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 5;
  f.frequency.setValueAtTime(1500, t); f.frequency.exponentialRampToValueAtTime(220, t + dur);
  const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  const g2 = c.createGain(); g2.gain.value = 0.5;
  o.connect(f); o2.connect(g2); g2.connect(f); f.connect(g); g.connect(dest);
  o.start(t); o2.start(t); o.stop(t + dur + 0.02); o2.stop(t + dur + 0.02);
}
function kick(t, dest) {
  const c = A.ctx;
  const o = c.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
  const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.55, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
  o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.35);
}
function snare(t, dest, v) {
  const c = A.ctx;
  const n = c.createBufferSource(); n.buffer = A.noise;
  const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1900; f.Q.value = 0.7;
  const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.17);
  n.connect(f); f.connect(g); g.connect(dest); n.start(t, Math.random(), 0.2);
  const o = c.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(200, t); o.frequency.exponentialRampToValueAtTime(140, t + 0.08);
  const g2 = c.createGain(); g2.gain.setValueAtTime(0.0001, t); g2.gain.exponentialRampToValueAtTime(v * 0.6, t + 0.003); g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
  o.connect(g2); g2.connect(dest); o.start(t); o.stop(t + 0.12);
}
function hat(t, dest, v) {
  const c = A.ctx;
  const n = c.createBufferSource(); n.buffer = A.noise;
  const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7500;
  const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
  n.connect(f); f.connect(g); g.connect(dest); n.start(t, Math.random(), 0.06);
}
function pluck(t, m, dur, dest, type) {
  const c = A.ctx;
  const o = c.createOscillator(); o.type = type || 'square'; o.frequency.value = N(m);
  const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(3400, t); f.frequency.exponentialRampToValueAtTime(700, t + dur);
  const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(type === 'sine' ? 0.09 : 0.05, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(f); f.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.02);
}
function lead(t, m, dur, dest, type) {
  const c = A.ctx;
  const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 3000; f.Q.value = 1;
  const g = c.createGain();
  const v = type === 'sawtooth' ? 0.045 : type === 'square' ? 0.04 : 0.07;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.02);
  g.gain.setValueAtTime(v, t + Math.max(0.03, dur - 0.05)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.08);
  f.connect(g); g.connect(dest);
  for (const det of [-6, 6]) {
    const o = c.createOscillator(); o.type = type || 'triangle'; o.frequency.value = N(m); o.detune.value = det;
    o.connect(f); o.start(t); o.stop(t + dur + 0.1);
  }
}

export const TRACK_NAMES = Object.keys(TRACKS);
