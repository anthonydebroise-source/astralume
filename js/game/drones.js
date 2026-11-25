// Drones d'accompagnement
import { TAU, rand, dist2, angTo, damp, rgba, lighten, darken } from '../engine/math.js';
import { ctx, setT, baseT, view } from '../engine/renderer.js';
import { fx } from '../engine/particles.js';
import { glow } from '../engine/sprites.js';
import { polyPath } from './art.js';
import { DRONE_BY_ID } from '../economy/data.js';
import { Sculptor } from '../engine/sculpt.js';
import { drawDroneSculpt } from './droneart.js';

// ---------- Drones sculptés (petits chasseurs d'escorte) ----------
const half = (pts) => (g) => { g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); for (let i = pts.length - 2; i >= 0; i -= 2) g.lineTo(-pts[i], pts[i + 1]); g.closePath(); };
const circ = (x, y, r) => (g) => g.arc(x, y, r, 0, TAU);
const vg = (y0, y1, a, b) => (g) => { const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, a); gr.addColorStop(1, b); return gr; };
const STEEL = '#c3cad8', GOLD = '#ecb44e', CARB = '#1c1e28';
function gem(S, x, y, r, col) {
  S.paint(circ(x, y, r * 1.35), { c: STEEL, mat: 'chrome', h: 0.1, hm: 'add' });
  S.paint(circ(x, y, r), { c: (g) => { const gr = g.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.4, lighten(col, 0.4)); gr.addColorStop(1, darken(col, 0.3)); return gr; }, mat: 'glass', h: (k) => k.hDome(x, y, r, 0.95, 0.6) });
  S.light(circ(x, y, r * 0.7), rgba(col, 0.8), r);
}
const DART = {
  sentinelle(S, c) {
    S.paint(half([0, -11, 3, -6, 9, 2, 10, 7, 4, 6, 2.5, 9]), { c: vg(-11, 9, lighten(c, 0.15), darken(c, 0.5)), mat: 'gloss', h: (k) => k.hCyl(-10, 0, 10, 0, 0.7, 0.2) });
    for (const s of [1, -1]) { S.paint((g) => g.rect(s * 6.5 - 0.8, -6, 1.6, 8), { c: STEEL, mat: 'chrome', h: 0.6 }); S.light((g) => g.ellipse(s * 6.5, -6, 0.6, 0.5, 0, 0, TAU), '#ffffff', 0.5); }
    S.stroke(half([0, -11, 3, -6, 9, 2]), { c: GOLD, mat: 'gold', w: 0.6, h: 0.03 });
    gem(S, 0, 0, 2.6, c);
  },
  glaneur(S, c) {
    for (const s of [1, -1]) S.paint((g) => { g.moveTo(s * 3, -4); g.quadraticCurveTo(s * 12, -8, s * 9, 4); g.lineTo(s * 7, 3); g.quadraticCurveTo(s * 9, -4, s * 3, -1); g.closePath(); }, { c: GOLD, mat: 'gold', h: 0.45 });
    S.paint(circ(0, 1, 7), { c: vg(-6, 8, lighten(c, 0.2), darken(c, 0.5)), mat: 'gloss', h: (k) => k.hDome(0, 1, 7, 0.9, 0.3) });
    S.stroke(circ(0, 1, 5), { c: STEEL, mat: 'chrome', w: 1, h: 0.05 });
    gem(S, 0, 1, 2.4, '#fff3b0');
  },
  egide(S, c) {
    const hex = (R) => (g) => { for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + Math.PI / 6; if (i) g.lineTo(Math.cos(a) * R, Math.sin(a) * R); else g.moveTo(Math.cos(a) * R, Math.sin(a) * R); } g.closePath(); };
    S.paint(hex(9), { c: GOLD, mat: 'gold', h: (k) => k.hDome(0, 0, 10, 0.6, 0.3) });
    S.paint(hex(7.4), { c: vg(-7, 7, lighten(c, 0.2), darken(c, 0.5)), mat: 'gloss', h: (k) => k.hDome(0, 0, 8, 0.8, 0.4) });
    S.stroke(hex(7.4), { emi: rgba(c, 0.9), ew: 0.6, w: 0.5 });
    gem(S, 0, 0, 3, c);
  },
  foreur(S, c) {
    S.paint((g) => { g.moveTo(0, -12); g.lineTo(6, 4); g.lineTo(-6, 4); g.closePath(); }, { c: vg(-12, 4, STEEL, '#5a6070'), mat: 'chrome', h: (k) => k.hCyl(-6, 0, 6, 0, 0.8, 0.2) });
    for (let k = 0; k < 4; k++) S.stroke((g) => { g.moveTo(-5 + k * 1.5, 2 - k * 3.6); g.lineTo(3 + k * 0.3, 4 - k * 3.6 - 3); }, { c: '#3a3e4a', w: 0.6, h: -0.05 });
    S.paint((g) => g.ellipse(0, 6, 7, 4, 0, 0, TAU), { c: vg(2, 10, lighten(c, 0.2), darken(c, 0.5)), mat: 'gloss', h: 0.5 });
    gem(S, 0, 6, 1.8, '#ffd27a');
  },
  echo(S, c) {
    S.paint(half([0, -11, 2, -5, 9, 5, 2, 3, 0, 6]), { c: rgba(lighten(c, 0.2), 0.75), mat: 'glass', h: 0.5 });
    S.stroke(half([0, -11, 2, -5, 9, 5, 2, 3, 0, 6]), { c: '#ffffff', mat: 'chrome', w: 0.6, h: 0.04, emi: rgba(c, 0.6), ew: 0.6 });
    gem(S, 0, -1, 1.8, c);
  },
  lumen(S, c) {
    for (let k = 0; k < 4; k++) { const a = (k / 4) * TAU + Math.PI / 4; S.paint((g) => { g.moveTo(Math.cos(a - 0.25) * 6, Math.sin(a - 0.25) * 6); g.lineTo(Math.cos(a) * 11, Math.sin(a) * 11); g.lineTo(Math.cos(a + 0.25) * 6, Math.sin(a + 0.25) * 6); g.closePath(); }, { c: GOLD, mat: 'gold', h: 0.4 }); }
    S.paint(circ(0, 0, 6.5), { c: STEEL, mat: 'chrome', h: (k) => k.hDome(0, 0, 7, 0.7, 0.3) });
    gem(S, 0, 0, 4.2, c);
  },
  prisme(S, c) {
    S.paint((g) => { g.moveTo(0, -11); g.lineTo(9, 6); g.lineTo(-9, 6); g.closePath(); }, { c: vg(-11, 6, lighten(c, 0.5), darken(c, 0.3)), mat: 'glass', h: (k) => k.hDome(0, 0, 10, 0.9, 0.2) });
    S.stroke((g) => { g.moveTo(0, -11); g.lineTo(9, 6); g.lineTo(-9, 6); g.closePath(); }, { c: STEEL, mat: 'chrome', w: 0.9, h: 0.05 });
    S.stroke((g) => { g.moveTo(0, -11); g.lineTo(0, 6); }, { c: '#ffffff', w: 0.4, h: 0.03 });
    S.light(circ(0, 1, 2.5), '#ffffff', 2);
  },
};
const dcache = new Map();
export function droneArt(id, px) {
  px = Math.max(2, Math.min(12, Math.ceil(px)));
  const k = id + '|' + px;
  let s = dcache.get(k);
  if (s) return s;
  const col = DRONE_BY_ID[id].color;
  const S = new Sculptor(30, 30, px, { ox: 15, oy: 15, depth: 7, bevel: 0.45, rim: lighten(col, 0.3), outline: 0.7, ao: 0.6, env: ['#b8d4ff', '#202430', '#ffffff'] });
  DART[id](S, col);
  s = S.bake();
  if (dcache.size > 40) dcache.clear();
  dcache.set(k, s);
  return s;
}
function drawDroneArt(c, id, t, sc = 1) {
  let px = 4;
  try { const m = c.getTransform(); px = Math.hypot(m.a, m.b) * sc; } catch (_) { /* */ }
  const s = droneArt(id, px * 1.05);
  const col = DRONE_BY_ID[id].color;
  c.save(); c.scale(sc, sc);
  if (id === 'egide' || id === 'lumen') c.rotate(t * (id === 'egide' ? 1.2 : 0.6));
  c.drawImage(s.cv, -s.ox, -s.oy, s.w, s.h);
  c.globalCompositeOperation = 'lighter';
  if (s.bloom) { c.globalAlpha *= 0.7 + 0.3 * Math.sin(t * 5); c.drawImage(s.bloom, -s.ox, -s.oy, s.w, s.h); c.globalAlpha = 1; }
  c.globalCompositeOperation = 'source-over';
  c.restore();
  void col;
}

const DRAW = {
  sentinelle(c, t, col) { polyPath(c, 3, 8, -Math.PI / 2); c.fillStyle = darken(col, 0.5); c.fill(); c.strokeStyle = col; c.lineWidth = 1.5; c.stroke(); c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, 2.2, 0, TAU); c.fill(); },
  glaneur(c, t, col) { c.beginPath(); c.arc(0, 0, 7, 0, TAU); c.fillStyle = darken(col, 0.5); c.fill(); c.strokeStyle = col; c.lineWidth = 1.5; c.stroke(); c.strokeStyle = '#fff'; c.lineWidth = 1; c.beginPath(); c.arc(0, 0, 10, t * 3, t * 3 + 1.5); c.stroke(); c.beginPath(); c.arc(0, 0, 10, t * 3 + Math.PI, t * 3 + Math.PI + 1.5); c.stroke(); },
  egide(c, t, col) { polyPath(c, 6, 9, t); c.fillStyle = rgba(col, 0.35); c.fill(); c.strokeStyle = col; c.lineWidth = 2; c.stroke(); polyPath(c, 6, 4, -t); c.fillStyle = '#fff'; c.fill(); },
  foreur(c, t, col) { c.save(); c.rotate(t * 12); c.beginPath(); c.moveTo(0, -10); c.lineTo(5, 4); c.lineTo(-5, 4); c.closePath(); c.fillStyle = col; c.fill(); c.restore(); c.strokeStyle = '#fff'; c.lineWidth = 1.2; c.beginPath(); c.arc(0, 0, 6, 0, TAU); c.stroke(); },
  echo(c, t, col) { c.globalAlpha *= 0.55; c.beginPath(); c.moveTo(0, -11); c.lineTo(9, 7); c.lineTo(0, 3); c.lineTo(-9, 7); c.closePath(); c.fillStyle = col; c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 1; c.stroke(); },
  lumen(c, t, col) { const p = 1 + 0.15 * Math.sin(t * 6); c.beginPath(); c.arc(0, 0, 6 * p, 0, TAU); c.fillStyle = '#fffde0'; c.fill(); c.strokeStyle = col; c.lineWidth = 2; for (let i = 0; i < 4; i++) { const a = t * 2 + i * 1.57; c.beginPath(); c.moveTo(Math.cos(a) * 8, Math.sin(a) * 8); c.lineTo(Math.cos(a) * 12, Math.sin(a) * 12); c.stroke(); } },
  prisme(c, t, col) { c.save(); c.rotate(t); c.beginPath(); c.moveTo(0, -9); c.lineTo(8, 5); c.lineTo(-8, 5); c.closePath(); c.fillStyle = rgba(col, 0.7); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 1.2; c.stroke(); c.restore(); },
};
export function drawDroneIcon(c, id, t) { drawDroneSculpt(c, id, DRONE_BY_ID[id].color, t, 0.72); }

export class Drone {
  constructor(g, id, slot, power) {
    this.g = g; this.id = id; this.slot = slot; this.P = power;
    this.col = DRONE_BY_ID[id].color;
    const p = g.player;
    this.x = p.x; this.y = p.y + 20; this.t = rand(10); this.cd = 0.5;
    this.state = 'idle'; this.charges = 3; this.a = slot * Math.PI;
  }
  home() { const p = this.g.player; return [p.x + (this.slot ? 47 : -47), p.y + 12 + Math.sin(this.t * 2 + this.slot) * 3]; }
  update(dt) {
    const g = this.g, p = g.player;
    this.t += dt;
    if (!p.alive) return;
    const [hx, hy] = this.home();
    switch (this.id) {
      case 'sentinelle': {
        this.x = damp(this.x, hx, 10, dt); this.y = damp(this.y, hy, 10, dt);
        this.cd -= dt;
        if (this.cd <= 0 && !g.def.noWeapons) {
          const t = g.nearestTarget(this.x, this.y, 420);
          if (t) { this.cd = 0.38; const a = angTo(this.x, this.y, t.x, t.y); this.aim = a; g.addPB(this.x, this.y, Math.cos(a) * 640, Math.sin(a) * 640, 2.6 * this.P * p.dmgMul0, 'spark', { color: this.col, homing: 3 }); }
        }
        break;
      }
      case 'glaneur': {
        let best = null, bd = 260 * 260;
        if (this.state !== 'back') for (const k of g.pickups) { if (k.dead || k.taken) continue; const d = dist2(this.x, this.y, k.x, k.y); if (d < bd) { bd = d; best = k; } }
        if (best) {
          const a = angTo(this.x, this.y, best.x, best.y);
          this.x += Math.cos(a) * 420 * dt; this.y += Math.sin(a) * 420 * dt;
          if (bd < 14 * 14) { best.attract = true; best.x = p.x; best.y = p.y; }
        } else { this.x = damp(this.x, hx, 6, dt); this.y = damp(this.y, hy, 6, dt); }
        break;
      }
      case 'egide': {
        this.a += dt * 3.2;
        const R = 36;
        this.x = p.x + Math.cos(this.a) * R; this.y = p.y + Math.sin(this.a) * R;
        this.cd -= dt;
        if (this.cd <= 0 && this.charges < 3 + Math.floor(this.P)) { this.charges++; this.cd = 1.6 / this.P; }
        if (this.charges > 0) {
          const n = g.cancelBullets({ x: this.x, y: this.y, r: 13 }, true, 1);
          if (n) { this.charges -= n; fx.ring(this.x, this.y, 4, 16, 0.2, this.col, 2); }
        }
        break;
      }
      case 'foreur': {
        if (this.state === 'idle') {
          this.x = damp(this.x, hx, 8, dt); this.y = damp(this.y, hy, 8, dt);
          this.cd -= dt;
          if (this.cd <= 0 && !g.def.noWeapons) { const t = g.nearestTarget(this.x, this.y, 380); if (t) { this.state = 'dash'; this.tg = t; this.dt = 0; } else this.cd = 0.4; }
        } else if (this.state === 'dash') {
          const t = this.tg; this.dt += dt;
          if (!t || t.dead || (t.isPart && !t.alive) || this.dt > 1.2) { this.state = 'back'; break; }
          const a = angTo(this.x, this.y, t.x, t.y);
          this.x += Math.cos(a) * 640 * dt; this.y += Math.sin(a) * 640 * dt;
          fx.dot(this.x, this.y, 0, 0, 0.25, 5, this.col);
          if (dist2(this.x, this.y, t.x, t.y) < (t.r + 8) ** 2) { g.hitTarget(t, 15 * this.P * p.dmgMul0, this.x, this.y); for (let i = 0; i < 6; i++) fx.spark(this.x, this.y, rand(-200, 200), rand(-200, 200), 0.25, 8, this.col); this.state = 'back'; }
        } else {
          const a = angTo(this.x, this.y, hx, hy);
          this.x += Math.cos(a) * 520 * dt; this.y += Math.sin(a) * 520 * dt;
          if (dist2(this.x, this.y, hx, hy) < 15 * 15) { this.state = 'idle'; this.cd = 2.1 / Math.pow(this.P, 0.35); }
        }
        break;
      }
      case 'echo': {
        const h = p.hist, i = Math.max(0, h.length - 2 * 22);
        if (h.length >= 2) { this.x = h[i]; this.y = h[i + 1]; } else { this.x = hx; this.y = hy; }
        break;
      }
      case 'lumen': {
        this.x = damp(this.x, hx, 8, dt); this.y = damp(this.y, hy, 8, dt);
        p.gauge = Math.min(1, p.gauge + dt * 0.006 * this.P);
        this.cd -= dt;
        if (this.cd <= 0) { this.cd = 24 / Math.sqrt(this.P); if (p.shield === 0) { p.shield = 1; fx.ring(p.x, p.y, 10, 40, 0.4, this.col, 3); g.lineFx(this.x, this.y, p.x, p.y, this.col, 0.4, 3); } }
        break;
      }
      case 'prisme': {
        this.x = damp(this.x, hx, 8, dt); this.y = damp(this.y, hy, 8, dt);
        this.beam = null;
        if (g.def.noWeapons) break;
        let best = null, bh = 0;
        g.forTargets((t) => { if (t.shielded) return; const d = dist2(this.x, this.y, t.x, t.y); if (d < 320 * 320 && t.hp > bh) { bh = t.hp; best = t; } });
        if (best) { this.beam = best; g.hitTarget(best, 9 * this.P * p.dmgMul0 * dt, best.x, best.y, true); }
        break;
      }
    }
  }
  draw() {
    const g = this.g;
    if (this.beam) {
      ctx.globalCompositeOperation = 'lighter';
      baseT();
      ctx.strokeStyle = rgba(this.col, 0.5); ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(this.beam.x, this.beam.y); ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.4; ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    }
    const s = glow(this.col, 16);
    ctx.globalCompositeOperation = 'lighter'; baseT();
    ctx.globalAlpha = 0.4; ctx.drawImage(s.c, this.x - 24, this.y - 24, 48, 48); ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    setT(this.x, this.y);
    this.aimS = this.aimS === undefined ? -Math.PI / 2 : this.aimS + Math.atan2(Math.sin((this.aim ?? -Math.PI / 2) - this.aimS), Math.cos((this.aim ?? -Math.PI / 2) - this.aimS)) * 0.25;
    drawDroneSculpt(ctx, this.id, this.col, this.t, 1, this.aimS, this.id === 'echo');
    ctx.globalAlpha = 1;
    if (this.id === 'egide') { for (let i = 0; i < this.charges; i++) { ctx.fillStyle = this.col; ctx.beginPath(); ctx.arc(-6 + i * 4, 21, 1.5, 0, TAU); ctx.fill(); } }
    baseT();
  }
}
