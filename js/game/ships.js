// Vaisseaux : silhouettes, armes (6 niveaux) et attaques spéciales
import { TAU, rand, rgba, lighten, darken, dist2, angTo, angDiff, hslHex } from '../engine/math.js';
import { view, ctx, baseT, setT, addShake, flash } from '../engine/renderer.js';
import { fx } from '../engine/particles.js';
import { glow } from '../engine/sprites.js';
import { starPath, polyPath } from './art.js';
import { sfx } from '../audio/sfx.js';
import { SHIP_SCALE } from './shipart.js';
import { drawHypercar } from './hypercar.js';
const SHIP_ART = new Proxy({}, { get: (_, id) => (c, t, A, B, bank) => drawHypercar(c, id, t, bank) });
export { SHIP_SCALE };

const up = (a) => [Math.sin(a), -Math.cos(a)];
function bolt(g, s, x, y, a, spd, dmg, kind = 'bolt', o) {
  const [dx, dy] = up(a);
  return g.addPB(x, y, dx * spd, dy * spd, dmg * s.dmg, kind, s.ghost ? Object.assign({ ghost: true }, o) : o);
}

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
      const l = Math.min(6, p.wlvl);
      const dps = 32 * [1, 1.4, 1.8, 2.2, 2.6, 3.0][l - 1] * p.dmgMul * p.rateMul * (1 + 0.16 * Math.max(0, p.effLvl() - 6));
      const w = [6, 8, 10, 12, 14, 16][l - 1] * (p.super > 0 ? 1.5 : 1);
      p.beams.length = 0;
      p.beams.push(g.fireBeam(p.x, p.y - 38, w, dps, l >= 3 ? 1 : 0, p.col));
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
      const l = Math.min(6, p.wlvl), n = [2, 2, 3, 3, 4, 5][l - 1];
      const R = [48, 50, 54, 58, 62, 68][l - 1];
      p.bladeA = (p.bladeA || 0) + dt * 7;
      p.blades.length = 0;
      for (let i = 0; i < n; i++) {
        const a = p.bladeA + (i / n) * TAU;
        const b = { x: p.x + Math.cos(a) * R, y: p.y + Math.sin(a) * R, a };
        p.blades.push(b);
        g.bladeHit(b.x, b.y, 12, 4 * p.dmgMul * (1 + 0.16 * Math.max(0, p.effLvl() - 6)), i);
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
      g.fireBeam(p.x, p.y - 38, S.w, 150 * S.P, 99, p.col, true);
      g.cancelBullets({ x: p.x, y: p.y, rect: S.w * 0.7 }, true);
      addShake(0.02);
    },
    draw(g, p, S) { g.drawBeam(p.x, p.y - 38, -60, S.w, p.col, 1); },
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
for (const id of Object.keys(W)) SHIP_FX[id] = { draw: SHIP_ART[id], weapon: W[id], special: SP[id] };

export function drawShipAt(c, id, x, y, sc, t, col, col2, bank = 0) {
  // c doit être en repère monde (setT déjà appliqué hors de cette fonction si besoin)
  c.save();
  c.translate(x, y);
  c.rotate(bank * 0.12);
  c.scale(sc * (1 - Math.abs(bank) * 0.22), sc);
  SHIP_ART[id](c, t, col, col2, bank);
  c.restore();
}
