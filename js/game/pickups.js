// Objets à ramasser : pièces, cristaux, gemmes, composants, bonus
import { TAU, rand, dist2, angTo, rgba } from '../engine/math.js';
import { view, ctx, setT, setRTS, baseT } from '../engine/renderer.js';
import { sprite, glow } from '../engine/sprites.js';
import { ICONS, drawCoin, drawNovaStar } from './art.js';

export const PK = {
  coin: { r: 6, glow: '#ffcf3f' },
  crystals: { r: 8.5, glow: '#38f2ff' },
  gems: { r: 9.5, glow: '#ff4fd8' },
  parts: { r: 9, glow: '#ff9d3c' },
  power: { r: 11, glow: '#ff9d3c' },
  shield: { r: 11, glow: '#38f2ff' },
  magnet: { r: 11, glow: '#ff4f6e' },
  energy: { r: 10, glow: '#ffe94a' },
  heart: { r: 10, glow: '#ff4f8a' },
  nova: { r: 14, glow: '#ffffff' },
};

function coinSprite(tier) {
  const r = [6.6, 8.2, 10.2][tier];
  return sprite('coin' + tier, r * 2 + 2, r * 2 + 2, (g, w) => { g.translate(w / 2, w / 2); drawCoin(g, r, tier); });
}
function iconSprite(kind, r) {
  return sprite('pk_' + kind + r, r * 2 + 4, r * 2 + 4, (g, w) => { g.translate(w / 2, w / 2); ICONS[kind](g, r); });
}

export function makePickup(kind, x, y, v = 1) {
  const a = rand(TAU), sp = kind === 'coin' ? rand(40, 150) : rand(20, 80);
  return { kind, x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, v, t: rand(10), attract: false, dead: false, age: 0, tier: v >= 25 ? 2 : v >= 5 ? 1 : 0 };
}

export function updatePickups(g, dt) {
  const p = g.player;
  const mag = p.magR * (g.drones.some((d) => d.id === 'glaneur') ? 1.4 : 1);
  const global = p.magnetT > 0 || g.lootRush > 0;
  const list = g.pickups;
  for (let i = list.length - 1; i >= 0; i--) {
    const k = list[i];
    k.t += dt; k.age += dt;
    if (k.dead) { list[i] = list[list.length - 1]; list.pop(); continue; }
    if (p.alive && !k.attract) {
      const d2 = dist2(k.x, k.y, p.x, p.y);
      const r = PK[k.kind].r > 9 ? mag * 0.75 : mag;
      if (d2 < r * r || (global && k.kind !== 'nova' && k.age > 0.25) || (k.age > 2.5 && k.kind !== 'nova')) k.attract = true;
    }
    if (k.attract && p.alive) {
      const a = angTo(k.x, k.y, p.x, p.y);
      const sp = Math.min(1100, 260 + k.age * 400);
      k.vx += (Math.cos(a) * sp - k.vx) * Math.min(1, dt * 10);
      k.vy += (Math.sin(a) * sp - k.vy) * Math.min(1, dt * 10);
      k.age += dt;
    } else {
      k.vx *= 1 - dt * 2.5;
      k.vy += (55 - k.vy) * Math.min(1, dt * 2);
    }
    if (g.well) { const w = g.well; const a = angTo(k.x, k.y, w.x, w.y); const d = Math.sqrt(dist2(k.x, k.y, w.x, w.y)) + 20; const f = w.s * 40 / d; k.vx += Math.cos(a) * f * dt * 10; k.vy += Math.sin(a) * f * dt * 10; }
    k.x += k.vx * dt; k.y += k.vy * dt;
    if (p.alive && dist2(k.x, k.y, p.x, p.y) < 30 * 30) { k.dead = true; g.collect(k); continue; }
    if (k.y > view.h + 30 || k.x < -40 || k.x > view.w + 40) k.dead = true;
  }
}

export function drawPickups(g) {
  // Lueurs (additif)
  ctx.globalCompositeOperation = 'lighter';
  baseT();
  for (const k of g.pickups) {
    const P = PK[k.kind];
    const s = glow(P.glow, 16);
    const r = (k.kind === 'coin' ? 13 + k.tier * 4 : P.r * 1.9) * (1 + 0.15 * Math.sin(k.t * 6));
    ctx.globalAlpha = k.kind === 'coin' ? 0.55 : 0.7;
    ctx.drawImage(s.c, k.x - r, k.y - r, r * 2, r * 2);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  for (const k of g.pickups) {
    if (k.kind === 'coin') {
      const s = coinSprite(k.tier);
      const sx = Math.max(0.18, Math.abs(Math.cos(k.t * 5)));
      setRTS(k.x, k.y, 0, sx, 1);
      ctx.drawImage(s.c, -s.hw, -s.hh, s.w, s.h);
    } else if (k.kind === 'nova') {
      setT(k.x, k.y);
      ctx.rotate(k.t);
      drawNovaStar(ctx, 13 * (1 + 0.1 * Math.sin(k.t * 8)), k.t);
    } else {
      const P = PK[k.kind];
      const s = iconSprite(k.kind, P.r);
      const bob = Math.sin(k.t * 4) * 2;
      const rot = k.kind === 'crystals' ? Math.sin(k.t * 2) * 0.4 : k.kind === 'parts' ? k.t * 2 : 0;
      setRTS(k.x, k.y + bob, rot, 1, 1);
      ctx.drawImage(s.c, -s.hw, -s.hh, s.w, s.h);
      if (P.r > 9) { ctx.strokeStyle = rgba(P.glow, 0.5 + 0.3 * Math.sin(k.t * 5)); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(0, 0, P.r + 4, 0, TAU); ctx.stroke(); }
    }
  }
  baseT();
}
