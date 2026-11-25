// Objets à ramasser : pièces, cristaux, gemmes, composants, bonus
import { TAU, rand, dist2, angTo, rgba } from '../engine/math.js';
import { view, ctx, setT, setRTS, baseT } from '../engine/renderer.js';
import { sprite, glow } from '../engine/sprites.js';
import { ICONS, drawCoin, drawNovaStar } from './art.js';
import { Sculptor } from '../engine/sculpt.js';
import { drawHypercar } from './hypercar.js';
import { drawDroneSculpt } from './droneart.js';
import { SHIP_BY_ID, DRONE_BY_ID } from '../economy/data.js';

// Capsule de verre à embouts chromés (contient un vaisseau ou un drone)
const capCache = new Map();
function capsule(px, col) {
  px = Math.max(2, Math.min(10, Math.ceil(px)));
  const k = px + col;
  let c = capCache.get(k);
  if (c) return c;
  const S = new Sculptor(40, 56, px, { ox: 20, oy: 28, depth: 10, bevel: 0.5, rim: col, outline: 0, ao: 0.4 });
  const pill = (g) => { g.moveTo(-13, -14); g.arc(0, -14, 13, Math.PI, 0); g.lineTo(13, 14); g.arc(0, 14, 13, 0, Math.PI); g.closePath(); };
  S.paint(pill, { c: 'rgba(170,220,255,0.22)', mat: 'glass', h: (q) => q.hCyl(-13, 0, 13, 0, 0.8, 0.2) });
  S.stroke(pill, { c: 'rgba(200,235,255,0.6)', mat: 'chrome', w: 0.9, h: 0.1 });
  for (const y of [-22, 22]) {
    S.paint((g) => g.ellipse(0, y, 13.5, 6, 0, 0, Math.PI * 2), { c: '#c3cad8', mat: 'chrome', h: (q) => q.hDomeE(0, y, 13.5, 6, 0.95, 0.5) });
    S.stroke((g) => g.ellipse(0, y, 10, 3.6, 0, 0, Math.PI * 2), { c: '#ecb44e', mat: 'gold', w: 1, h: 0.05 });
  }
  S.light((g) => { g.rect(-13.5, -17.5, 27, 1.2); g.rect(-13.5, 16.3, 27, 1.2); }, col, 2);
  S.light((g) => g.ellipse(-7, -4, 2, 9, 0.1, 0, Math.PI * 2), 'rgba(255,255,255,0.35)', 1);
  c = S.bake();
  capCache.set(k, c);
  return c;
}

export const PK = {
  coin: { r: 6, glow: '#ffcf3f' },
  crystals: { r: 12, glow: '#38f2ff' },
  gems: { r: 13, glow: '#ff4fd8' },
  parts: { r: 12, glow: '#ff9d3c' },
  power: { r: 15, glow: '#ff9d3c' },
  shield: { r: 15, glow: '#38f2ff' },
  magnet: { r: 15, glow: '#ff4f6e' },
  energy: { r: 14, glow: '#ffe94a' },
  heart: { r: 14, glow: '#ff4f8a' },
  nova: { r: 18, glow: '#ffffff' },
  shipcap: { r: 22, glow: '#ffffff' },
  dronecap: { r: 20, glow: '#38f2ff' },
};
const CAP = { shipcap: 1, dronecap: 1 };

function coinSprite(tier) {
  const r = [9.5, 11.5, 13.5][tier];
  return sprite('coin' + tier, r * 2 + 2, r * 2 + 2, (g, w) => { g.translate(w / 2, w / 2); drawCoin(g, r, tier); });
}
function iconSprite(kind, r) {
  return sprite('pk_' + kind + r, r * 2 + 4, r * 2 + 4, (g, w) => { g.translate(w / 2, w / 2); ICONS[kind](g, r); });
}

export function makePickup(kind, x, y, v = 1, loot = 1) {
  const a = rand(TAU), sp = kind === 'coin' ? rand(30, 90) : rand(20, 70);
  const rel = v / Math.max(1, loot);
  return { kind, x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, v, t: rand(10), attract: false, dead: false, age: 0, tier: rel >= 30 ? 2 : rel >= 8 ? 1 : 0 };
}

export function updatePickups(g, dt) {
  const p = g.player;
  const mag = p.magR * (g.drones.some((d) => d.id === 'glaneur') ? 1.4 : 1);
  const global = p.magnetT > 0 || g.lootRush > 0;
  const list = g.pickups;
  for (let i = list.length - 1; i >= 0; i--) {
    const k = list[i];
    k.t += dt; k.age += dt;
    if (k.opts && k.opts.length > 1 && !k.attract) { k.swapT -= dt; if (k.swapT <= 0) { k.swapT = 1.5; k.oi = (k.oi + 1) % k.opts.length; k.id = k.opts[k.oi]; k.pop = 1; } }
    if (k.pop) k.pop = Math.max(0, k.pop - dt * 4);
    if (k.dead) { list[i] = list[list.length - 1]; list.pop(); continue; }
    if (p.alive && !k.attract) {
      const d2 = dist2(k.x, k.y, p.x, p.y);
      const r = PK[k.kind].r > 9 ? mag * 0.75 : mag;
      if (CAP[k.kind]) { if (d2 < 70 * 70) k.attract = true; }
      else if (d2 < r * r || (global && k.kind !== 'nova' && k.age > 0.25) || (k.age > 2.5 && k.kind !== 'nova')) k.attract = true;
    }
    if (k.attract && p.alive) {
      const a = angTo(k.x, k.y, p.x, p.y);
      const sp = Math.min(1100, 260 + k.age * 400);
      k.vx += (Math.cos(a) * sp - k.vx) * Math.min(1, dt * 10);
      k.vy += (Math.sin(a) * sp - k.vy) * Math.min(1, dt * 10);
      k.age += dt;
    } else if (CAP[k.kind]) {
      // les capsules descendent lentement en ondulant : il faut aller les chercher
      k.vx = Math.cos(k.t * 1.3) * 38; k.vy = 34;
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
    if (CAP[k.kind]) continue;
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
    } else if (CAP[k.kind]) {
      const ship = k.kind === 'shipcap', D = ship ? SHIP_BY_ID[k.id] : DRONE_BY_ID[k.id], col = D.color;
      const bob = Math.sin(k.t * 3) * 2, sc = 1.3 * (1 + 0.05 * Math.sin(k.t * 6) + (k.pop || 0) * 0.15);
      setT(k.x, k.y + bob, sc);
      ctx.globalCompositeOperation = 'lighter';
      const gl = glow(col, 16); ctx.globalAlpha = 0.75; ctx.drawImage(gl.c, -32, -38, 64, 76); ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      // fond sombre teinté pour bien détacher le contenu
      const bg = ctx.createRadialGradient(0, 0, 2, 0, 0, 15); bg.addColorStop(0, rgba(col, 0.45)); bg.addColorStop(1, 'rgba(4,2,16,0.92)');
      ctx.fillStyle = bg; ctx.beginPath(); ctx.ellipse(0, 0, 13, 22, 0, 0, TAU); ctx.fill();
      if (ship) { ctx.save(); ctx.scale(0.62, 0.62); drawHypercar(ctx, k.id, k.t, 0); ctx.restore(); }
      else drawDroneSculpt(ctx, k.id, col, k.t, 0.68);
      const cs = capsule((ctx.getTransform().a || 2), col);
      ctx.drawImage(cs.cv, -cs.ox, -cs.oy, cs.w, cs.h);
      // anneau de compte à rebours avant le prochain changement de contenu
      ctx.strokeStyle = rgba(col, 0.9); ctx.lineWidth = 2;
      if (k.opts && k.opts.length > 1) { ctx.beginPath(); ctx.arc(0, 0, 32, -Math.PI / 2, -Math.PI / 2 + TAU * (k.swapT / 1.5)); ctx.stroke(); }
      else { ctx.beginPath(); ctx.arc(0, 0, 32, k.t * 3, k.t * 3 + 1.6); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 32, k.t * 3 + Math.PI, k.t * 3 + Math.PI + 1.6); ctx.stroke(); }
      // nom en clair (vaisseau / drone)
      ctx.font = '900 9px "Avenir Next Condensed","Arial Narrow",system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const lb = D.name.toUpperCase(), tw = ctx.measureText(lb).width + 10;
      ctx.fillStyle = 'rgba(4,2,16,0.85)'; ctx.fillRect(-tw / 2, -46, tw, 13);
      ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.strokeRect(-tw / 2, -46, tw, 13);
      ctx.fillStyle = '#ffffff'; ctx.fillText(lb, 0, -39.5);
      ctx.font = '800 6.5px "Avenir Next Condensed","Arial Narrow",system-ui,sans-serif'; ctx.fillStyle = col;
      ctx.fillText(ship ? 'VAISSEAU' : 'DRONE', 0, 39);
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
      if (P.r > 13) { ctx.strokeStyle = rgba(P.glow, 0.5 + 0.3 * Math.sin(k.t * 5)); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(0, 0, P.r + 4, 0, TAU); ctx.stroke(); }
    }
  }
  baseT();
}
