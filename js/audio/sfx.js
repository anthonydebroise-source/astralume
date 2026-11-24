// Bruitages synthétisés (aucun fichier externe)
import { A } from './audio.js';

const last = {};
let voices = 0;
const MAXV = 28;

function ok(name, gap) {
  const c = A.ctx;
  if (!c || c.state !== 'running' || !A.settings || !A.settings.sfx.on || !A.settings.master.on) return false;
  const now = c.currentTime;
  if (last[name] !== undefined && now - last[name] < gap) return false;
  last[name] = now;
  return voices < MAXV;
}

function env(g, t0, a, peak, dur) {
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
}

function osc(type, f0, f1, dur, v, o = {}) {
  const c = A.ctx; const t = c.currentTime + (o.when || 0);
  const os = c.createOscillator(); os.type = type;
  os.frequency.setValueAtTime(f0, t);
  if (f1) os.frequency.exponentialRampToValueAtTime(f1, t + (o.glide || dur));
  if (o.detune) os.detune.value = o.detune;
  const g = c.createGain(); env(g, t, o.a || 0.004, v, dur);
  let n = os;
  if (o.filt) {
    const f = c.createBiquadFilter(); f.type = o.filt; f.frequency.value = o.ff || 2000; f.Q.value = o.q || 0.8;
    if (o.ff1) f.frequency.exponentialRampToValueAtTime(o.ff1, t + dur);
    os.connect(f); n = f;
  }
  n.connect(g); g.connect(o.dest || A.sfx);
  os.start(t); os.stop(t + dur + 0.05);
  voices++;
  os.onended = () => { voices--; try { g.disconnect(); } catch (_) { /* */ } };
}

function noise(dur, v, o = {}) {
  const c = A.ctx; const t = c.currentTime + (o.when || 0);
  const src = c.createBufferSource(); src.buffer = A.noise;
  const f = c.createBiquadFilter(); f.type = o.type || 'lowpass'; f.frequency.setValueAtTime(o.f || 1500, t); f.Q.value = o.q || 0.8;
  if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t + dur);
  const g = c.createGain(); env(g, t, o.a || 0.002, v, dur);
  src.connect(f); f.connect(g); g.connect(o.dest || A.sfx);
  const off = Math.random() * 1.2;
  src.start(t, off, dur + 0.05);
  voices++;
  src.onended = () => { voices--; try { g.disconnect(); } catch (_) { /* */ } };
}

const N = (m) => 440 * Math.pow(2, (m - 69) / 12);
function arp(notes, step, type, v, dur, o = {}) {
  notes.forEach((m, i) => osc(type, N(m), null, dur, v, { ...o, when: (o.when || 0) + i * step }));
}

// Laser continu (vaisseau Lance-Prisme)
let laser = null;
function setLaser(on) {
  const c = A.ctx;
  if (!c || c.state !== 'running') { laser = null; return; }
  const allowed = A.settings && A.settings.sfx.on && A.settings.master.on;
  if (on && allowed && !laser) {
    const g = c.createGain(); g.gain.value = 0.0001;
    const o1 = c.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = 92;
    const o2 = c.createOscillator(); o2.type = 'square'; o2.frequency.value = 184.6;
    const lfo = c.createOscillator(); lfo.frequency.value = 7;
    const lg = c.createGain(); lg.gain.value = 260;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900; f.Q.value = 6;
    lfo.connect(lg); lg.connect(f.frequency);
    o1.connect(f); o2.connect(f); f.connect(g); g.connect(A.sfx);
    o1.start(); o2.start(); lfo.start();
    g.gain.setTargetAtTime(0.045, c.currentTime, 0.05);
    laser = { g, o: [o1, o2, lfo] };
  } else if ((!on || !allowed) && laser) {
    const l = laser; laser = null;
    l.g.gain.setTargetAtTime(0.0001, c.currentTime, 0.04);
    l.o.forEach((o) => o.stop(c.currentTime + 0.2));
  }
}

export const sfx = {
  laser: setLaser,
  shot(kind = 0) {
    if (!ok('shot', 0.085)) return;
    if (kind === 1) osc('sine', 520, 260, 0.07, 0.035);
    else if (kind === 2) noise(0.05, 0.03, { type: 'bandpass', f: 2400, q: 2 });
    else osc('triangle', 1500, 640, 0.05, 0.028);
  },
  missile() { if (!ok('mis', 0.12)) return; noise(0.18, 0.05, { type: 'bandpass', f: 900, f1: 3000, q: 1.5 }); },
  zap() { if (!ok('zap', 0.09)) return; osc('sawtooth', 2200, 300, 0.09, 0.03, { filt: 'bandpass', ff: 2500, q: 3 }); noise(0.06, 0.04, { type: 'highpass', f: 4000 }); },
  hit() { if (!ok('hit', 0.05)) return; noise(0.035, 0.05, { type: 'highpass', f: 2800 }); },
  ping() { if (!ok('ping', 0.07)) return; osc('sine', 2400, 1800, 0.06, 0.04); },
  explode(size = 1) {
    const big = size >= 3;
    if (!ok(big ? 'expB' : 'expS', big ? 0.07 : 0.045)) return;
    noise(0.2 + 0.14 * size, Math.min(0.5, 0.14 + 0.07 * size), { f: 2600, f1: 90 });
    osc('sine', 150, 36, 0.2 + 0.1 * size, Math.min(0.5, 0.18 + 0.08 * size));
    if (big) osc('sawtooth', 80, 30, 0.6, 0.12, { filt: 'lowpass', ff: 400 });
  },
  squish() { if (!ok('squish', 0.06)) return; osc('sine', 600, 140, 0.12, 0.08, { filt: 'lowpass', ff: 1400 }); },
  coin(n = 0) {
    if (!ok('coin', 0.028)) return;
    const st = Math.min(n, 16);
    const f = 1046 * Math.pow(2, st / 24);
    osc('square', f, null, 0.07, 0.035, { filt: 'lowpass', ff: 4200 });
    osc('square', f * 1.335, null, 0.14, 0.03, { when: 0.045, filt: 'lowpass', ff: 4200 });
  },
  crystal() { if (!ok('cry', 0.05)) return; osc('sine', 1975, null, 0.5, 0.06); osc('sine', 2960, null, 0.35, 0.035, { when: 0.03 }); },
  gem() { if (!ok('gem', 0.08)) return; arp([88, 92, 95, 100], 0.05, 'triangle', 0.07, 0.4); },
  part() { if (!ok('part', 0.08)) return; osc('square', 340, 300, 0.12, 0.06, { filt: 'bandpass', ff: 1600, q: 4 }); noise(0.08, 0.06, { type: 'bandpass', f: 5000, q: 3 }); },
  power() { if (!ok('pow', 0.1)) return; arp([67, 71, 74, 79, 83], 0.045, 'square', 0.05, 0.16, { filt: 'lowpass', ff: 3000 }); },
  shieldUp() { if (!ok('shu', 0.1)) return; osc('sine', 400, 1200, 0.35, 0.08); osc('triangle', 800, 2400, 0.3, 0.04, { when: 0.05 }); },
  shieldBreak() { if (!ok('shb', 0.1)) return; noise(0.35, 0.18, { type: 'highpass', f: 1500, f1: 6000 }); osc('square', 900, 200, 0.25, 0.06); },
  hurt() { if (!ok('hurt', 0.15)) return; osc('sawtooth', 220, 60, 0.4, 0.2, { filt: 'lowpass', ff: 1200 }); noise(0.3, 0.16, { f: 1800, f1: 200 }); },
  heal() { if (!ok('heal', 0.15)) return; arp([72, 76, 79, 84], 0.06, 'sine', 0.08, 0.35); },
  magnet() { if (!ok('mag', 0.2)) return; osc('sine', 300, 900, 0.4, 0.07, { filt: 'lowpass', ff: 2000 }); },
  energy() { if (!ok('ene', 0.08)) return; osc('sawtooth', 600, 1800, 0.18, 0.04, { filt: 'lowpass', ff: 3000 }); },
  ready() { if (!ok('rdy', 0.5)) return; arp([84, 91], 0.07, 'triangle', 0.06, 0.25); },
  special() {
    if (!ok('spec', 0.3)) return;
    noise(0.8, 0.22, { f: 400, f1: 6000, type: 'bandpass', q: 1 });
    osc('sawtooth', 80, 640, 0.6, 0.14, { filt: 'lowpass', ff: 3000 });
    arp([60, 67, 72, 79], 0.06, 'square', 0.05, 0.4, { filt: 'lowpass', ff: 3500 });
  },
  perfect() { if (!ok('perf', 0.3)) return; arp([84, 88, 91, 96], 0.04, 'triangle', 0.09, 0.6); osc('sine', 2093, null, 0.8, 0.05, { when: 0.12 }); },
  constellation() {
    if (!ok('const', 0.3)) return;
    arp([76, 79, 83, 86, 88, 91, 95], 0.045, 'triangle', 0.07, 0.5);
    noise(0.9, 0.08, { type: 'highpass', f: 6000, a: 0.2 });
  },
  link(n) { if (!ok('link', 0.03)) return; osc('sine', 880 * Math.pow(2, Math.min(n, 12) / 12), null, 0.12, 0.035); },
  nova() {
    if (!ok('nova', 0.5)) return;
    arp([60, 64, 67, 72, 76, 79, 84], 0.05, 'sawtooth', 0.05, 0.6, { filt: 'lowpass', ff: 4000 });
    noise(1.2, 0.12, { type: 'bandpass', f: 300, f1: 8000, q: 1.2 });
  },
  warning() {
    if (!ok('warn', 1)) return;
    for (let i = 0; i < 4; i++) {
      osc('square', 440, 660, 0.3, 0.06, { when: i * 0.55, filt: 'lowpass', ff: 2000 });
      osc('square', 660, 440, 0.25, 0.06, { when: i * 0.55 + 0.28, filt: 'lowpass', ff: 2000 });
    }
  },
  roar() {
    if (!ok('roar', 1)) return;
    osc('sawtooth', 70, 45, 1.4, 0.22, { a: 0.15, filt: 'lowpass', ff: 600, ff1: 200 });
    osc('sawtooth', 73, 48, 1.4, 0.18, { a: 0.15, filt: 'lowpass', ff: 700 });
    noise(1.3, 0.16, { f: 500, f1: 150, a: 0.2 });
  },
  partBreak() { if (!ok('pbrk', 0.15)) return; noise(0.7, 0.35, { f: 3000, f1: 80 }); osc('sine', 120, 30, 0.8, 0.4); osc('square', 300, 90, 0.4, 0.08, { filt: 'lowpass', ff: 1000 }); },
  laserCharge() { if (!ok('lch', 0.3)) return; osc('sawtooth', 200, 1600, 0.8, 0.05, { filt: 'bandpass', ff: 1200, q: 3, ff1: 4000 }); },
  laserFire() { if (!ok('lfi', 0.3)) return; noise(0.9, 0.16, { type: 'bandpass', f: 800, q: 0.7 }); osc('sawtooth', 110, 90, 0.9, 0.1, { filt: 'lowpass', ff: 1500 }); },
  thunder() { if (!ok('thu', 0.12)) return; noise(0.5, 0.22, { f: 6000, f1: 200 }); osc('square', 180, 50, 0.3, 0.06); },
  ui() { if (!ok('ui', 0.04)) return; osc('triangle', 1320, 1760, 0.06, 0.06); },
  back() { if (!ok('uib', 0.04)) return; osc('triangle', 1100, 700, 0.07, 0.05); },
  open() { if (!ok('uio', 0.05)) return; arp([76, 83], 0.05, 'triangle', 0.05, 0.12); },
  deny() { if (!ok('deny', 0.1)) return; osc('square', 200, 150, 0.15, 0.05, { filt: 'lowpass', ff: 900 }); osc('square', 150, 120, 0.15, 0.05, { when: 0.1, filt: 'lowpass', ff: 900 }); },
  buy() { if (!ok('buy', 0.08)) return; arp([79, 84, 88, 91], 0.04, 'square', 0.045, 0.14, { filt: 'lowpass', ff: 4000 }); noise(0.2, 0.05, { type: 'highpass', f: 7000, when: 0.1 }); },
  upgrade() { if (!ok('upg', 0.1)) return; arp([67, 74, 79, 86], 0.05, 'sawtooth', 0.04, 0.2, { filt: 'lowpass', ff: 3200 }); osc('sine', 1568, null, 0.5, 0.05, { when: 0.2 }); },
  levelUp() { if (!ok('lvl', 0.3)) return; arp([72, 76, 79, 84, 88, 91, 96], 0.06, 'triangle', 0.08, 0.5); },
  star(i = 0) { if (!ok('star' + i, 0.05)) return; arp([84 + i * 4, 91 + i * 4], 0.06, 'triangle', 0.09, 0.5); osc('sine', N(96 + i * 4), null, 0.9, 0.04, { when: 0.1 }); },
  tick() { if (!ok('tick', 0.035)) return; osc('square', 1800, null, 0.025, 0.025, { filt: 'lowpass', ff: 5000 }); },
  wheelTick(p = 1) { if (!ok('wt', 0.02)) return; osc('square', 1400 * p, 900 * p, 0.03, 0.05, { filt: 'bandpass', ff: 2200, q: 2 }); },
  chestShake(i = 0) { if (!ok('csh', 0.08)) return; noise(0.12, 0.1, { type: 'bandpass', f: 600 + i * 300, q: 2 }); osc('square', 140 + i * 40, 100, 0.12, 0.05, { filt: 'lowpass', ff: 800 }); },
  chestOpen(r = 0) {
    if (!ok('cop', 0.3)) return;
    noise(0.5 + r * 0.3, 0.12 + r * 0.05, { type: 'bandpass', f: 600, f1: 9000, q: 1 });
    const sets = [[72, 76, 79], [72, 76, 79, 84], [72, 76, 79, 84, 88, 91], [60, 67, 72, 76, 79, 84, 88, 91, 96]];
    arp(sets[r], 0.07 - r * 0.008, r >= 2 ? 'sawtooth' : 'triangle', 0.06, 0.5 + r * 0.25, { filt: 'lowpass', ff: 5000 });
    if (r >= 2) osc('sine', 65, 40, 1.2, 0.3);
    if (r === 3) { arp([84, 88, 91, 96, 100, 103], 0.09, 'triangle', 0.05, 0.8, { when: 0.6 }); }
  },
  victory() {
    if (!ok('vic', 1)) return;
    arp([67, 72, 76, 79], 0.11, 'square', 0.05, 0.3, { filt: 'lowpass', ff: 3500 });
    [72, 76, 79, 84].forEach((m) => osc('sawtooth', N(m), null, 1.4, 0.035, { when: 0.48, a: 0.02, filt: 'lowpass', ff: 3000 }));
  },
  defeat() {
    if (!ok('def', 1)) return;
    arp([67, 63, 60, 55], 0.18, 'triangle', 0.08, 0.5);
    osc('sawtooth', N(43), null, 1.6, 0.06, { when: 0.7, filt: 'lowpass', ff: 800 });
  },
  revive() { if (!ok('rev', 0.5)) return; arp([60, 67, 72, 79, 84, 91], 0.05, 'triangle', 0.08, 0.6); },
};
