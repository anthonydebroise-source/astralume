// Vaisseaux : silhouettes, armes (6 niveaux) et attaques spéciales
import { TAU, rand, rgba, lighten, darken, dist2, angTo, angDiff, hslHex } from '../engine/math.js';
import { view, ctx, baseT, setT, addShake, flash } from '../engine/renderer.js';
import { fx } from '../engine/particles.js';
import { glow } from '../engine/sprites.js';
import { starPath, polyPath } from './art.js';
import { sfx } from '../audio/sfx.js';

const up = (a) => [Math.sin(a), -Math.cos(a)];
function bolt(g, s, x, y, a, spd, dmg, kind = 'bolt', o) {
  const [dx, dy] = up(a);
  return g.addPB(x, y, dx * spd, dy * spd, dmg * s.dmg, kind, s.ghost ? Object.assign({ ghost: true }, o) : o);
}

// ---------- Dessins des vaisseaux (orientés vers le haut) ----------
function hullGrad(c, col, w, h) {
  const g = c.createLinearGradient(-w, 0, w, 0);
  g.addColorStop(0, darken(col, 0.75)); g.addColorStop(0.5, darken(col, 0.35)); g.addColorStop(1, darken(col, 0.8));
  return g;
}
function cockpit(c, x, y, rx, ry, col) {
  const g = c.createRadialGradient(x - rx * 0.3, y - ry * 0.4, 0, x, y, ry);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.4, lighten(col, 0.4)); g.addColorStop(1, darken(col, 0.3));
  c.fillStyle = g; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fill();
}
const DRAW = {
  etincelle(c, t, A, B) {
    c.beginPath(); c.moveTo(0, -22); c.lineTo(6, -6); c.lineTo(18, 8); c.lineTo(17, 13); c.lineTo(6, 9); c.lineTo(0, 14); c.lineTo(-6, 9); c.lineTo(-17, 13); c.lineTo(-18, 8); c.lineTo(-6, -6); c.closePath();
    c.fillStyle = hullGrad(c, A, 18); c.fill(); c.strokeStyle = A; c.lineWidth = 1.6; c.stroke();
    c.strokeStyle = B; c.lineWidth = 1; c.beginPath(); c.moveTo(-6, -2); c.lineTo(-14, 9); c.moveTo(6, -2); c.lineTo(14, 9); c.stroke();
    c.fillStyle = A; c.fillRect(-7.5, -10, 2, 10); c.fillRect(5.5, -10, 2, 10);
    cockpit(c, 0, -5, 3.2, 6, A);
    c.fillStyle = B; c.beginPath(); c.arc(-17.5, 10.5, 1.6, 0, TAU); c.arc(17.5, 10.5, 1.6, 0, TAU); c.fill();
  },
  paon(c, t, A, B) {
    for (const s of [-1, 1]) for (let i = 0; i < 5; i++) {
      const a = s * (0.5 + i * 0.28), l = 20 - i * 1.5;
      c.save(); c.rotate(a); c.beginPath(); c.ellipse(0, -l * 0.55 + 4, 3.4, l * 0.6, 0, 0, TAU);
      c.fillStyle = i % 2 ? darken(A, 0.3) : darken(A, 0.5); c.fill(); c.strokeStyle = A; c.lineWidth = 1; c.stroke();
      c.fillStyle = B; c.beginPath(); c.arc(0, -l + 6, 1.8, 0, TAU); c.fill(); c.restore();
    }
    c.beginPath(); c.moveTo(0, -20); c.quadraticCurveTo(7, -4, 4, 12); c.lineTo(-4, 12); c.quadraticCurveTo(-7, -4, 0, -20); c.closePath();
    c.fillStyle = hullGrad(c, A, 7); c.fill(); c.strokeStyle = A; c.lineWidth = 1.5; c.stroke();
    cockpit(c, 0, -6, 2.6, 5, B);
  },
  lance(c, t, A, B) {
    c.beginPath(); c.moveTo(0, -16); c.lineTo(4, 14); c.lineTo(0, 18); c.lineTo(-4, 14); c.closePath();
    c.fillStyle = hullGrad(c, A, 5); c.fill(); c.strokeStyle = A; c.lineWidth = 1.4; c.stroke();
    c.beginPath(); c.moveTo(-3, 2); c.lineTo(-16, 12); c.lineTo(-14, 15); c.lineTo(-3, 10); c.moveTo(3, 2); c.lineTo(16, 12); c.lineTo(14, 15); c.lineTo(3, 10);
    c.fillStyle = darken(A, 0.5); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(-3, -10); c.lineTo(-9, -4); c.lineTo(-3, -4); c.moveTo(3, -10); c.lineTo(9, -4); c.lineTo(3, -4); c.fill(); c.stroke();
    const r = 6, rot = t * 2;
    c.save(); c.translate(0, -20);
    c.beginPath(); for (let i = 0; i < 3; i++) { const a = rot + (i / 3) * TAU; c.lineTo(Math.cos(a) * r, Math.sin(a) * r * 1.4); } c.closePath();
    c.fillStyle = rgba(B, 0.85); c.fill(); c.strokeStyle = '#ffffff'; c.lineWidth = 1; c.stroke();
    c.restore();
    cockpit(c, 0, 2, 2, 4, A);
  },
  essaim(c, t, A, B) {
    for (const s of [-1, 1]) { c.fillStyle = darken(A, 0.5); c.strokeStyle = A; c.lineWidth = 1.2; c.beginPath(); c.moveTo(s * 9, -4); c.lineTo(s * 20, 4); c.lineTo(s * 18, 12); c.lineTo(s * 8, 8); c.closePath(); c.fill(); c.stroke();
      for (const k of [0, 1]) { c.fillStyle = '#2a1a10'; c.fillRect(s * (12 + k * 5) - 2, -2 + k * 2, 4, 9); c.fillStyle = A; c.fillRect(s * (12 + k * 5) - 2, -4 + k * 2, 4, 3); } }
    polyPath(c, 6, 13, Math.PI / 6); c.fillStyle = hullGrad(c, A, 13); c.fill(); c.strokeStyle = A; c.lineWidth = 1.6; c.stroke();
    c.strokeStyle = rgba(B, 0.6); c.lineWidth = 0.8;
    for (const [x, y] of [[0, -5], [-4.5, 2.5], [4.5, 2.5]]) { c.save(); c.translate(x, y); polyPath(c, 6, 3.4, Math.PI / 6); c.stroke(); c.restore(); }
    cockpit(c, 0, -8, 2.4, 3.6, B);
  },
  tonnerre(c, t, A, B) {
    c.strokeStyle = A; c.lineWidth = 3; c.lineCap = 'round';
    c.beginPath(); c.moveTo(0, 10); c.lineTo(0, -22); c.moveTo(-11, 8); c.lineTo(-11, -14); c.moveTo(11, 8); c.lineTo(11, -14); c.stroke();
    c.beginPath(); c.moveTo(-15, 4); c.quadraticCurveTo(0, 18, 15, 4); c.lineTo(11, 12); c.quadraticCurveTo(0, 20, -11, 12); c.closePath();
    c.fillStyle = hullGrad(c, B, 15); c.fill(); c.strokeStyle = B; c.lineWidth = 1.5; c.stroke();
    for (const x of [-11, 0, 11]) for (let k = 0; k < 2; k++) { const y = -8 + k * 7 - (x === 0 ? 6 : 0); c.strokeStyle = rgba(A, 0.6 + 0.4 * Math.sin(t * 20 + k + x)); c.lineWidth = 1.4; c.beginPath(); c.ellipse(x, y, 3.6, 1.6, 0, 0, TAU); c.stroke(); }
    cockpit(c, 0, 8, 3, 3.5, A);
  },
  diapason(c, t, A, B) {
    const v = Math.sin(t * 50) * 0.6;
    c.strokeStyle = A; c.lineWidth = 4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-8 - v, -22); c.lineTo(-8, 0); c.quadraticCurveTo(-8, 7, 0, 7); c.quadraticCurveTo(8, 7, 8, 0); c.lineTo(8 + v, -22); c.stroke();
    c.strokeStyle = rgba(B, 0.4); c.lineWidth = 8; c.beginPath(); c.moveTo(0, -18); c.lineTo(0, 0); c.stroke();
    c.beginPath(); c.moveTo(-3, 6); c.lineTo(-14, 16); c.lineTo(14, 16); c.lineTo(3, 6); c.closePath(); c.fillStyle = hullGrad(c, A, 14); c.fill(); c.strokeStyle = A; c.lineWidth = 1.3; c.stroke();
    cockpit(c, 0, 11, 2.4, 3, B);
  },
  singularite(c, t, A, B) {
    c.beginPath(); c.arc(0, -4, 15, 0, TAU); c.arc(0, -4, 8, 0, TAU, true);
    const g = c.createRadialGradient(0, -4, 7, 0, -4, 16); g.addColorStop(0, '#ffffff'); g.addColorStop(0.3, A); g.addColorStop(1, darken(A, 0.6));
    c.fillStyle = g; c.fill('evenodd');
    c.fillStyle = '#000000'; c.beginPath(); c.arc(0, -4, 7.5, 0, TAU); c.fill();
    c.strokeStyle = rgba('#ffffff', 0.8); c.lineWidth = 1; c.beginPath(); c.ellipse(0, -4, 11, 3, t * 3, 0, TAU); c.stroke();
    c.fillStyle = darken(A, 0.4); c.strokeStyle = A; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(-6, 9); c.lineTo(0, 18); c.lineTo(6, 9); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(-13, 4); c.lineTo(-18, 14); c.lineTo(-10, 10); c.moveTo(13, 4); c.lineTo(18, 14); c.lineTo(10, 10); c.fill(); c.stroke();
  },
  faucheuse(c, t, A, B) {
    c.beginPath(); c.moveTo(-22, 10); c.quadraticCurveTo(-18, -16, 0, -20); c.quadraticCurveTo(18, -16, 22, 10); c.quadraticCurveTo(12, -6, 0, -8); c.quadraticCurveTo(-12, -6, -22, 10); c.closePath();
    c.fillStyle = hullGrad(c, A, 22); c.fill(); c.strokeStyle = A; c.lineWidth = 1.6; c.stroke();
    c.beginPath(); c.moveTo(-5, -6); c.lineTo(0, 14); c.lineTo(5, -6); c.closePath(); c.fillStyle = darken(B, 0.4); c.fill(); c.strokeStyle = B; c.lineWidth = 1.2; c.stroke();
    const g = c.createRadialGradient(0, -6, 0, 0, -6, 7); g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, A); g.addColorStop(1, rgba(B, 0));
    c.fillStyle = g; c.beginPath(); c.arc(0, -6, 7, 0, TAU); c.fill();
  },
  kaleido(c, t, A, B) {
    const pts = [[0, -22], [12, 0], [0, 16], [-12, 0]];
    for (let i = 0; i < 4; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % 4];
      c.beginPath(); c.moveTo(0, -2); c.lineTo(x1, y1); c.lineTo(x2, y2); c.closePath();
      c.fillStyle = hslHex((t * 90 + i * 90) % 360, 90, 45); c.fill();
    }
    c.beginPath(); c.moveTo(0, -22); c.lineTo(12, 0); c.lineTo(0, 16); c.lineTo(-12, 0); c.closePath();
    c.strokeStyle = '#ffffff'; c.lineWidth = 1.4; c.stroke();
    c.beginPath(); c.moveTo(-12, 0); c.lineTo(-19, 9); c.lineTo(-8, 6); c.moveTo(12, 0); c.lineTo(19, 9); c.lineTo(8, 6); c.strokeStyle = A; c.stroke();
    cockpit(c, 0, -3, 2.6, 4, '#ffffff');
  },
  phenix(c, t, A, B) {
    for (const s of [-1, 1]) {
      const f = Math.sin(t * 9 + s) * 2;
      c.beginPath(); c.moveTo(s * 3, -6); c.quadraticCurveTo(s * 16, -14, s * (24 + f), -4); c.quadraticCurveTo(s * 18, 0, s * (22 + f), 6); c.quadraticCurveTo(s * 14, 6, s * (16 + f), 13); c.quadraticCurveTo(s * 8, 8, s * 3, 8); c.closePath();
      const g = c.createLinearGradient(0, 0, s * 24, 0); g.addColorStop(0, darken(A, 0.4)); g.addColorStop(0.6, A); g.addColorStop(1, B);
      c.fillStyle = g; c.fill(); c.strokeStyle = B; c.lineWidth = 1; c.stroke();
    }
    c.beginPath(); c.moveTo(0, -20); c.quadraticCurveTo(5, -10, 4, 6); c.lineTo(0, 12); c.lineTo(-4, 6); c.quadraticCurveTo(-5, -10, 0, -20); c.closePath();
    c.fillStyle = hullGrad(c, A, 5); c.fill(); c.strokeStyle = B; c.lineWidth = 1.3; c.stroke();
    for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(i * 2, 10); c.quadraticCurveTo(i * 6, 18, i * 4 + Math.sin(t * 12 + i) * 2, 24); c.strokeStyle = i ? A : B; c.lineWidth = 2; c.stroke(); }
    c.fillStyle = B; c.beginPath(); c.arc(0, -12, 1.8, 0, TAU); c.fill();
  },
};

// ---------- Armes ----------
const W = {
  etincelle: {
    interval: (l) => 1 / 8.5,
    volley(g, s) {
      const l = s.lvl, d = 1.9, x = s.x, y = s.y - 14;
      const sets = [
        [[-6, 0], [6, 0]],
        [[-6, 0], [6, 0], [0, 0]],
        [[-5, -0.05], [5, 0.05], [-12, -0.12], [12, 0.12]],
        [[0, 0], [-6, -0.07], [6, 0.07], [-12, -0.15], [12, 0.15]],
        [[0, 0], [-6, -0.07], [6, 0.07], [-12, -0.15], [12, 0.15]],
        [[0, 0], [-6, -0.06], [6, 0.06], [-11, -0.13], [11, 0.13], [-16, -0.22], [16, 0.22]],
      ][l - 1];
      for (const [ox, a] of sets) bolt(g, s, x + ox, y, a, 720, d);
      if (l >= 5 && (s.n = (s.n || 0) + 1) % 2 === 0) for (const k of [-1, 1]) bolt(g, s, x + k * 14, y + 6, k * 0.6, 420, 2.2, 'spark', { homing: 7 });
    },
  },
  paon: {
    interval: () => 1 / 5.5,
    volley(g, s) {
      const l = s.lvl, n = [3, 5, 5, 7, 9, 11][l - 1], arc = [0.35, 0.55, 0.6, 0.8, 1.0, 1.15][l - 1];
      for (let i = 0; i < n; i++) { const a = (i / (n - 1) - 0.5) * arc; bolt(g, s, s.x + a * 18, s.y - 10, a, 560, 2.0, 'feather', { life: 1.1, rot: a }); }
    },
  },
  lance: {
    interval: () => 1 / 5,
    volley(g, s) { if (s.ghost) bolt(g, s, s.x, s.y - 16, 0, 800, 4, 'prism'); },
    update(g, p, dt) {
      const l = p.wlvl;
      const dps = 32 * [1, 1.4, 1.8, 2.2, 2.6, 3.0][l - 1] * p.dmgMul * p.rateMul;
      const w = [6, 8, 10, 12, 14, 16][l - 1] * (p.super > 0 ? 1.5 : 1);
      p.beams.length = 0;
      p.beams.push(g.fireBeam(p.x, p.y - 22, w, dps, l >= 3 ? 1 : 0, p.col));
      if (l >= 4) for (const k of [-1, 1]) p.beams.push(g.fireBeam(p.x + k * 15, p.y - 2, 4, dps * 0.25, 0, p.col2));
      sfx.laser(true);
    },
  },
  essaim: {
    interval: () => 1 / 6,
    volley(g, s) {
      const l = s.lvl;
      if (l >= 3) { bolt(g, s, s.x - 4, s.y - 14, 0, 700, 1.8); bolt(g, s, s.x + 4, s.y - 14, 0, 700, 1.8); }
      else bolt(g, s, s.x, s.y - 14, 0, 700, 1.8);
      s.mt = (s.mt || 0) + 1 / 6;
      const mi = [0.7, 0.6, 0.55, 0.5, 0.45, 0.4][l - 1];
      if (s.mt >= mi) {
        s.mt = 0;
        const n = [1, 2, 2, 3, 4, 4][l - 1];
        for (let i = 0; i < n; i++) { const k = i % 2 ? 1 : -1; bolt(g, s, s.x + k * 14, s.y, k * (0.5 + i * 0.15), 260, 9, 'missile', { homing: 5, life: 2.4, splash: 24, accel: 600 }); }
        sfx.missile();
      }
    },
  },
  tonnerre: {
    interval: (l) => 1 / [4.2, 4.6, 5, 5.5, 6, 6.6][l - 1],
    volley(g, s) {
      const l = s.lvl, d = 7.5 * [1, 1.1, 1.2, 1.3, 1.45, 1.6][l - 1] * s.dmg * (s.ghost ? 1 : 1);
      const ok = g.chainLightning(s.x, s.y - 18, d, [1, 2, 3, 3, 4, 5][l - 1], s.col || '#ffe94a', s.ghost);
      if (!ok) bolt(g, s, s.x, s.y - 18, 0, 760, 3, 'spark');
      else sfx.zap();
    },
  },
  diapason: {
    interval: (l) => 1 / [3, 3, 3.3, 3.3, 3.6, 3.6][l - 1],
    volley(g, s) {
      const l = s.lvl, n = [1, 1, 2, 2, 3, 3][l - 1], wd = [26, 30, 34, 38, 42, 46][l - 1];
      for (let i = 0; i < n; i++) { const o = (i - (n - 1) / 2); bolt(g, s, s.x + o * 10, s.y - 16 - Math.abs(o) * 8, o * 0.05, 420, 8, 'wave', { r: wd / 2, pierce: 99, life: 2 }); }
    },
  },
  singularite: {
    interval: (l) => 1 / [2.2, 2.4, 2.6, 2.8, 3, 3.2][l - 1],
    volley(g, s) {
      const l = s.lvl, n = [1, 1, 2, 2, 2, 3][l - 1];
      const vr = [28, 30, 34, 38, 42, 46][l - 1];
      for (let i = 0; i < n; i++) { const a = (i - (n - 1) / 2) * 0.22; bolt(g, s, s.x, s.y - 16, a, 380, 5, 'orb', { life: 0.55, vortex: vr, implode: true }); }
    },
  },
  faucheuse: {
    interval: () => 1 / 7,
    volley(g, s) {
      const l = s.lvl, n = [1, 1, 2, 2, 3, 3][l - 1];
      for (let i = 0; i < n; i++) bolt(g, s, s.x + (i - (n - 1) / 2) * 8, s.y - 16, 0, 650, 1.3, 'plasma');
    },
    update(g, p, dt) {
      const l = p.wlvl, n = [2, 2, 3, 3, 4, 5][l - 1];
      const R = [40, 42, 46, 50, 55, 60][l - 1];
      p.bladeA = (p.bladeA || 0) + dt * 7;
      p.blades.length = 0;
      for (let i = 0; i < n; i++) {
        const a = p.bladeA + (i / n) * TAU;
        const b = { x: p.x + Math.cos(a) * R, y: p.y + Math.sin(a) * R, a };
        p.blades.push(b);
        g.bladeHit(b.x, b.y, 12, 4 * p.dmgMul, i);
      }
    },
  },
  kaleido: {
    interval: (l) => 1 / [5, 5, 5.5, 5.5, 6, 6][l - 1],
    volley(g, s) {
      const l = s.lvl, n = [1, 2, 2, 3, 3, 4][l - 1];
      for (let i = 0; i < n; i++) { const a = (i - (n - 1) / 2) * 0.2 + rand(-0.03, 0.03); bolt(g, s, s.x, s.y - 16, a, 600, 3.2, 'shard', { bounce: 2, split: 1, rot: a }); }
    },
  },
  phenix: {
    interval: () => 1 / 22,
    volley(g, s) {
      const l = s.lvl, n = [1, 1, 2, 2, 2, 3][l - 1], spread = [0.12, 0.16, 0.2, 0.24, 0.28, 0.3][l - 1];
      for (let i = 0; i < n; i++) bolt(g, s, s.x + rand(-3, 3), s.y - 18, rand(-spread, spread), rand(480, 560), 1.4, 'flame', { pierce: 2, life: 0.48 });
    },
  },
};

// ---------- Attaques spéciales ----------
const SP = {
  etincelle: {
    dur: 1.2,
    start(g, p, S) { S.rings = []; S.k = 0; S.n = 3 + S.aw; },
    update(g, p, dt, S) {
      S.k += dt;
      while (S.rings.length < S.n && S.k >= S.rings.length * 0.22) { S.rings.push({ x: p.x, y: p.y, r: 10, hit: new Set() }); addShake(0.2); fx.flash(p.x, p.y, 80, 0.3, p.col); }
      for (const R of S.rings) {
        R.r += dt * 720;
        g.cancelBullets({ x: R.x, y: R.y, r: R.r, ring: 30 }, true);
        g.forTargets((t) => { if (R.hit.has(t)) return; const d = Math.sqrt(dist2(R.x, R.y, t.x, t.y)); if (Math.abs(d - R.r) < 30 + t.r) { R.hit.add(t); g.hitTarget(t, 32 * S.P, t.x, t.y); } });
      }
    },
    draw(g, p, S) {
      for (const R of S.rings) { const k = Math.max(0, 1 - R.r / 900); ctx.globalAlpha = k; ctx.strokeStyle = p.col; ctx.lineWidth = 14 * k + 2; ctx.beginPath(); ctx.arc(R.x, R.y, R.r, 0, TAU); ctx.stroke(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.stroke(); }
      ctx.globalAlpha = 1;
    },
  },
  paon: {
    dur: 2.2,
    start(g, p, S) { S.cd = 0; S.a = 0; },
    update(g, p, dt, S) {
      S.cd -= dt; S.a += dt * 4;
      if (S.cd <= 0) { S.cd = 0.07; const n = 8 + S.aw * 2; for (let i = 0; i < n; i++) { const a = S.a + (i / n) * TAU; g.addPB(p.x, p.y, Math.sin(a) * 520, -Math.cos(a) * 520, 3.2 * S.P, 'feather', { life: 1.2, rot: a, pierce: 1 }); } }
    },
  },
  lance: {
    dur: 3,
    start(g, p, S) { flash(p.col, 0.4); },
    update(g, p, dt, S) {
      S.w = Math.min(70 + S.aw * 12, (S.w || 10) + dt * 400);
      g.fireBeam(p.x, p.y - 22, S.w, 150 * S.P, 99, p.col, true);
      g.cancelBullets({ x: p.x, y: p.y, rect: S.w * 0.7 }, true);
      addShake(0.02);
    },
    draw(g, p, S) { g.drawBeam(p.x, p.y - 22, -60, S.w, p.col, 1); },
  },
  essaim: {
    dur: 1.3,
    start(g, p, S) { S.n = 0; S.cd = 0; S.max = 36 + S.aw * 10; },
    update(g, p, dt, S) {
      S.cd -= dt;
      while (S.cd <= 0 && S.n < S.max) { S.cd += 1.2 / S.max; S.n++; const a = rand(-1.4, 1.4); g.addPB(p.x + rand(-10, 10), p.y, Math.sin(a) * 300, -Math.cos(a) * 300, 7 * S.P, 'micro', { homing: 8, life: 2.5, accel: 500, splash: 16 }); if (S.n % 4 === 0) sfx.missile(); }
    },
  },
  tonnerre: {
    dur: 2.4,
    start(g, p, S) { S.cd = 0; },
    update(g, p, dt, S) {
      S.cd -= dt;
      if (S.cd <= 0) {
        S.cd = 0.12;
        const ts = [];
        g.forTargets((t) => { if (!t.shielded) ts.push(t); });
        for (let i = 0; i < 3 + S.aw && ts.length; i++) {
          const t = ts.splice(Math.floor(Math.random() * ts.length), 1)[0];
          g.strike(t.x, t.y, '#fff7a0');
          g.hitTarget(t, 10 * S.P, t.x, t.y);
          g.cancelBullets({ x: t.x, y: t.y, r: 40 }, true);
        }
        if (!ts.length && Math.random() < 0.5) g.strike(rand(30, view.w - 30), rand(view.safeT + 40, view.h * 0.6), '#fff7a0');
        sfx.thunder();
      }
    },
  },
  diapason: {
    dur: 1.2,
    start(g, p, S) { S.rings = []; S.k = 0; S.n = 4 + S.aw; },
    update(g, p, dt, S) {
      S.k += dt;
      while (S.rings.length < S.n && S.k >= S.rings.length * 0.2) { S.rings.push({ x: p.x, y: p.y, r: 10, hit: new Set() }); addShake(0.15); }
      for (const R of S.rings) {
        R.r += dt * 600;
        g.cancelBullets({ x: R.x, y: R.y, r: R.r, ring: 26 }, true);
        g.forTargets((t) => { if (R.hit.has(t)) return; const d = Math.sqrt(dist2(R.x, R.y, t.x, t.y)); if (Math.abs(d - R.r) < 26 + t.r) { R.hit.add(t); g.hitTarget(t, 22 * S.P, t.x, t.y); if (!t.isPart) t.stun = 1.6; } });
      }
    },
    draw(g, p, S) {
      for (const R of S.rings) { const k = Math.max(0, 1 - R.r / 800); ctx.globalAlpha = k * 0.9; ctx.strokeStyle = p.col2; ctx.lineWidth = 3; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(R.x, R.y, Math.max(1, R.r - i * 9), 0, TAU); ctx.stroke(); } }
      ctx.globalAlpha = 1;
    },
  },
  singularite: {
    dur: 4.2,
    start(g, p, S) { S.x = view.w / 2; S.y = view.safeT + view.h * 0.3; S.r = 0; S.R = 95 + S.aw * 15; },
    update(g, p, dt, S) {
      S.r = Math.min(S.R, S.r + dt * 200);
      g.gravityWell(S.x, S.y, S.r * 3, 260, dt, true);
      g.forTargets((t) => { if (dist2(S.x, S.y, t.x, t.y) < (S.r + t.r) ** 2) g.hitTarget(t, 48 * S.P * dt, t.x, t.y, true); });
      if (S.t > S.dur - 0.05 && !S.boom) {
        S.boom = true;
        g.forTargets((t) => { if (dist2(S.x, S.y, t.x, t.y) < 180 * 180) g.hitTarget(t, 70 * S.P, t.x, t.y); });
        fx.ring(S.x, S.y, 10, 220, 0.6, '#ffffff', 8); fx.flash(S.x, S.y, 200, 0.5, p.col); addShake(0.5); sfx.explode(4);
      }
    },
    draw(g, p, S) {
      const s = glow(p.col, 32);
      ctx.globalAlpha = 0.8; ctx.drawImage(s.c, S.x - S.r * 2, S.y - S.r * 2, S.r * 4, S.r * 4); ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(S.x, S.y, S.r * 0.55, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(S.x, S.y, S.r * 1.1, S.r * 0.3, S.t * 2, 0, TAU); ctx.stroke();
      ctx.strokeStyle = p.col; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(S.x, S.y, S.r * 0.9, S.r * 0.22, S.t * 2 + 0.3, 0, TAU); ctx.stroke();
      ctx.globalCompositeOperation = 'lighter';
    },
  },
  faucheuse: {
    dur: 4,
    start(g, p, S) { S.R = 95 + S.aw * 15; },
    update(g, p, dt, S) {
      p.inv = Math.max(p.inv, 0.2);
      g.cancelBullets({ x: p.x, y: p.y, r: S.R }, true);
      g.forTargets((t) => { if (dist2(p.x, p.y, t.x, t.y) < (S.R + t.r) ** 2) g.hitTarget(t, 75 * S.P * dt, t.x, t.y, true); });
      if (Math.random() < 0.6) { const a = rand(TAU); fx.spark(p.x + Math.cos(a) * S.R * 0.8, p.y + Math.sin(a) * S.R * 0.8, Math.cos(a) * 120, Math.sin(a) * 120, 0.4, 14, '#ffd23f', 2); }
    },
    draw(g, p, S) {
      const s = glow('#ffb02f', 32);
      const R = S.R * (1 + Math.sin(S.t * 10) * 0.04);
      ctx.globalAlpha = 0.9; ctx.drawImage(s.c, p.x - R * 1.6, p.y - R * 1.6, R * 3.2, R * 3.2);
      ctx.strokeStyle = '#fff2b0'; ctx.lineWidth = 3; ctx.globalAlpha = 0.8;
      for (let i = 0; i < 12; i++) { const a = S.t * 1.5 + (i / 12) * TAU; ctx.beginPath(); ctx.moveTo(p.x + Math.cos(a) * R * 0.6, p.y + Math.sin(a) * R * 0.6); ctx.lineTo(p.x + Math.cos(a + 0.1) * R * 1.05, p.y + Math.sin(a + 0.1) * R * 1.05); ctx.stroke(); }
      ctx.globalAlpha = 1;
    },
  },
  kaleido: {
    dur: 1,
    start(g, p, S) { S.waves = 0; S.k = 0; },
    update(g, p, dt, S) {
      S.k += dt;
      while (S.waves < 3 + S.aw && S.k >= S.waves * 0.25) {
        S.waves++;
        const n = 16;
        for (let i = 0; i < n; i++) { const a = (i / n) * TAU + S.waves * 0.2; g.addPB(p.x, p.y, Math.sin(a) * 480, -Math.cos(a) * 480, 5 * S.P, 'shard', { split: 2, bounce: 1, rot: a, life: 1.4 }); }
        fx.ring(p.x, p.y, 5, 60, 0.3, '#ffffff', 3);
      }
    },
  },
  phenix: {
    dur: 3,
    start(g, p, S) { S.cd = 0; },
    update(g, p, dt, S) {
      p.inv = Math.max(p.inv, 0.2);
      S.cd -= dt;
      if (S.cd <= 0) {
        S.cd = 0.045;
        for (let i = 0; i < 3; i++) { const x = rand(10, view.w - 10); g.addPB(x, p.y + 10, rand(-20, 20), -rand(380, 480), 3.4 * S.P, 'flame', { pierce: 99, life: 1.6, big: true }); }
      }
      g.cancelBullets({ x: p.x, y: p.y, r: 70 }, true);
    },
    draw(g, p, S) {
      const s = glow('#ff6a2a', 32);
      ctx.globalAlpha = 0.7;
      for (const k of [-1, 1]) ctx.drawImage(s.c, p.x + k * 50 - 70, p.y - 40, 140, 80);
      ctx.globalAlpha = 1;
    },
  },
};

export const SHIP_FX = {};
for (const id of Object.keys(W)) SHIP_FX[id] = { draw: DRAW[id], weapon: W[id], special: SP[id] };

export function drawShipAt(c, id, x, y, sc, t, col, col2, bank = 0) {
  // c doit être en repère monde (setT déjà appliqué hors de cette fonction si besoin)
  c.save();
  c.translate(x, y);
  c.rotate(bank * 0.12);
  c.scale(sc * (1 - Math.abs(bank) * 0.22), sc);
  DRAW[id](c, t, col, col2);
  c.restore();
}
