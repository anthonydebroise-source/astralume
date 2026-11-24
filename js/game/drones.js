// Drones d'accompagnement
import { TAU, rand, dist2, angTo, damp, rgba, lighten, darken } from '../engine/math.js';
import { ctx, setT, baseT, view } from '../engine/renderer.js';
import { fx } from '../engine/particles.js';
import { glow } from '../engine/sprites.js';
import { polyPath } from './art.js';
import { DRONE_BY_ID } from '../economy/data.js';

const DRAW = {
  sentinelle(c, t, col) { polyPath(c, 3, 8, -Math.PI / 2); c.fillStyle = darken(col, 0.5); c.fill(); c.strokeStyle = col; c.lineWidth = 1.5; c.stroke(); c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, 2.2, 0, TAU); c.fill(); },
  glaneur(c, t, col) { c.beginPath(); c.arc(0, 0, 7, 0, TAU); c.fillStyle = darken(col, 0.5); c.fill(); c.strokeStyle = col; c.lineWidth = 1.5; c.stroke(); c.strokeStyle = '#fff'; c.lineWidth = 1; c.beginPath(); c.arc(0, 0, 10, t * 3, t * 3 + 1.5); c.stroke(); c.beginPath(); c.arc(0, 0, 10, t * 3 + Math.PI, t * 3 + Math.PI + 1.5); c.stroke(); },
  egide(c, t, col) { polyPath(c, 6, 9, t); c.fillStyle = rgba(col, 0.35); c.fill(); c.strokeStyle = col; c.lineWidth = 2; c.stroke(); polyPath(c, 6, 4, -t); c.fillStyle = '#fff'; c.fill(); },
  foreur(c, t, col) { c.save(); c.rotate(t * 12); c.beginPath(); c.moveTo(0, -10); c.lineTo(5, 4); c.lineTo(-5, 4); c.closePath(); c.fillStyle = col; c.fill(); c.restore(); c.strokeStyle = '#fff'; c.lineWidth = 1.2; c.beginPath(); c.arc(0, 0, 6, 0, TAU); c.stroke(); },
  echo(c, t, col) { c.globalAlpha *= 0.55; c.beginPath(); c.moveTo(0, -11); c.lineTo(9, 7); c.lineTo(0, 3); c.lineTo(-9, 7); c.closePath(); c.fillStyle = col; c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 1; c.stroke(); },
  lumen(c, t, col) { const p = 1 + 0.15 * Math.sin(t * 6); c.beginPath(); c.arc(0, 0, 6 * p, 0, TAU); c.fillStyle = '#fffde0'; c.fill(); c.strokeStyle = col; c.lineWidth = 2; for (let i = 0; i < 4; i++) { const a = t * 2 + i * 1.57; c.beginPath(); c.moveTo(Math.cos(a) * 8, Math.sin(a) * 8); c.lineTo(Math.cos(a) * 12, Math.sin(a) * 12); c.stroke(); } },
  prisme(c, t, col) { c.save(); c.rotate(t); c.beginPath(); c.moveTo(0, -9); c.lineTo(8, 5); c.lineTo(-8, 5); c.closePath(); c.fillStyle = rgba(col, 0.7); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 1.2; c.stroke(); c.restore(); },
};
export function drawDroneIcon(c, id, t) { const d = DRONE_BY_ID[id]; DRAW[id](c, t, d.color); }

export class Drone {
  constructor(g, id, slot, power) {
    this.g = g; this.id = id; this.slot = slot; this.P = power;
    this.col = DRONE_BY_ID[id].color;
    const p = g.player;
    this.x = p.x; this.y = p.y + 20; this.t = rand(10); this.cd = 0.5;
    this.state = 'idle'; this.charges = 3; this.a = slot * Math.PI;
  }
  home() { const p = this.g.player; return [p.x + (this.slot ? 30 : -30), p.y + 16 + Math.sin(this.t * 2) * 3]; }
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
          if (t) { this.cd = 0.38; const a = angTo(this.x, this.y, t.x, t.y); g.addPB(this.x, this.y, Math.cos(a) * 640, Math.sin(a) * 640, 2.6 * this.P * p.dmgMul0, 'spark', { color: this.col, homing: 3 }); }
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
    ctx.globalAlpha = 0.6; ctx.drawImage(s.c, this.x - 16, this.y - 16, 32, 32); ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    setT(this.x, this.y);
    DRAW[this.id](ctx, this.t, this.col);
    ctx.globalAlpha = 1;
    if (this.id === 'egide') { for (let i = 0; i < this.charges; i++) { ctx.fillStyle = this.col; ctx.beginPath(); ctx.arc(-6 + i * 4, 13, 1.4, 0, TAU); ctx.fill(); } }
    baseT();
  }
}
