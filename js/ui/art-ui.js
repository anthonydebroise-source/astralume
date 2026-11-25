// Visuels des menus dessinés au canvas : logo, planètes des mondes, coffres, roue
import { ctx, baseT, setT } from '../engine/renderer.js';
import { glow, makeCanvas } from '../engine/sprites.js';
import { TAU, rgba, lighten, darken, RNG, hslHex } from '../engine/math.js';
import { ICONS, starPath, polyPath, drawNovaStar } from '../game/art.js';

const FONT = '"Avenir Next Condensed","Avenir Next","Arial Narrow",system-ui,sans-serif';

export function drawLogo(r, t) {
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  const size = Math.min(52, r.w / 7.6);
  ctx.font = `800 ${size}px ${FONT}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const word = 'ASTRALUME';
  const total = ctx.measureText(word).width + 6 * (word.length - 1);
  let x = cx - total / 2;
  const pts = [];
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < word.length; i++) {
    const ch = word[i], w = ctx.measureText(ch).width;
    const lx = x + w / 2, ly = cy + Math.sin(t * 2 + i * 0.6) * 3;
    const on = Math.min(1, Math.max(0, t * 3 - i * 0.25));
    const hue = (t * 40 + i * 25) % 360;
    const col = hslHex(190 + Math.sin(i * 0.7 + t) * 60, 100, 60);
    if (on > 0) {
      ctx.globalAlpha = 0.35 * on; ctx.strokeStyle = col; ctx.lineWidth = 12; ctx.strokeText(ch, lx, ly);
      ctx.globalAlpha = 0.6 * on; ctx.lineWidth = 5; ctx.strokeText(ch, lx, ly);
      ctx.globalAlpha = on; ctx.lineWidth = 1.6; ctx.strokeStyle = '#ffffff'; ctx.strokeText(ch, lx, ly);
    }
    pts.push([lx, ly - size * 0.42]);
    x += w + 6;
  }
  ctx.globalAlpha = 0.5; ctx.strokeStyle = '#bfe8ff'; ctx.lineWidth = 1;
  ctx.beginPath(); pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.stroke();
  const s = glow('#bfe8ff', 16);
  for (const [px, py] of pts) { const rr = 5 + 2 * Math.sin(t * 4 + px); ctx.globalAlpha = 0.9; ctx.drawImage(s.c, px - rr, py - rr, rr * 2, rr * 2); }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.font = `700 ${size * 0.22}px ${FONT}`;
  ctx.fillStyle = 'rgba(220,230,255,0.85)';
  ctx.fillText('RALLUMEZ LES ÉTOILES', cx, cy + size * 0.75);
}

// Planète d'un monde (vignette statique, mise en cache)
const planetCache = new Map();
export function planetCanvas(W, size, lit) {
  const key = W.w + '|' + size + '|' + lit;
  let c = planetCache.get(key);
  if (c) return c;
  c = makeCanvas(size * 2, size * 2);
  const g = c.getContext('2d');
  g.scale(2, 2);
  const P = W.pal, R = size * 0.34, cx = size / 2, cy = size / 2;
  const rng = new RNG(W.w * 31 + 7);
  let gr = g.createRadialGradient(cx, cy, R * 0.6, cx, cy, size / 2);
  gr.addColorStop(0, rgba(P.neb2, lit ? 0.55 : 0.25)); gr.addColorStop(1, rgba(P.neb2, 0));
  g.fillStyle = gr; g.fillRect(0, 0, size, size);
  g.save(); g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.clip();
  gr = g.createRadialGradient(cx - R * 0.4, cy - R * 0.4, R * 0.1, cx, cy, R);
  const base = W.type === 'planet' ? P.g2 : P.neb1;
  gr.addColorStop(0, lighten(base, 0.45)); gr.addColorStop(0.7, base); gr.addColorStop(1, darken(base, 0.6));
  g.fillStyle = gr; g.fillRect(cx - R, cy - R, R * 2, R * 2);
  if (W.type === 'planet') {
    for (let i = 0; i < 6; i++) { g.fillStyle = rgba(i % 2 ? P.deco : darken(P.g1, 0.3), 0.35); g.beginPath(); g.ellipse(cx + rng.range(-R, R), cy + rng.range(-R, R), rng.range(R * 0.2, R * 0.6), rng.range(R * 0.1, R * 0.3), rng.range(0, 3), 0, TAU); g.fill(); }
    g.strokeStyle = rgba(P.liquid, 0.7); g.lineWidth = R * 0.08; g.beginPath(); g.moveTo(cx - R, cy + rng.range(-R, R) * 0.5); g.bezierCurveTo(cx - R * 0.3, cy - R, cx + R * 0.3, cy + R, cx + R, cy + rng.range(-R, R) * 0.4); g.stroke();
  } else {
    for (let i = 0; i < 5; i++) { g.fillStyle = rgba(i % 2 ? P.neb2 : darken(P.neb1, 0.4), 0.4); g.fillRect(cx - R, cy - R + i * R * 0.42 + rng.range(-4, 4), R * 2, R * rng.range(0.1, 0.22)); }
  }
  const sh = g.createLinearGradient(cx - R, cy - R, cx + R, cy + R); sh.addColorStop(0.5, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.7)');
  g.fillStyle = sh; g.fillRect(cx - R, cy - R, R * 2, R * 2);
  g.restore();
  g.strokeStyle = rgba(lighten(P.neb2, 0.4), 0.8); g.lineWidth = 1.2; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.stroke();
  if (W.w % 3 === 1 || W.w === 31) { g.strokeStyle = rgba(P.deco2, 0.75); g.lineWidth = 2.2; g.beginPath(); g.ellipse(cx, cy, R * 1.5, R * 0.35, -0.4, 0, TAU); g.stroke(); }
  if (lit) { g.fillStyle = '#fff6c8'; g.save(); g.translate(cx + R * 0.95, cy - R * 0.95); starPath(g, 4, R * 0.35, R * 0.08, 0, false); g.fill(); g.restore(); }
  planetCache.set(key, c);
  return c;
}

// Coffre animé
import { drawChestLux } from './treasure-art.js';
export function drawChest(x, y, s, C, t, shake = 0, open = 0) {
  if (C && C.id) { drawChestLux(x, y, s, C, t, shake, open); return; }
  const c = ctx;
  setT(x, y, s);
  const sh = shake ? Math.sin(t * 60) * 3 * shake : 0;
  c.translate(sh, 0); c.rotate(sh * 0.02);
  // halo
  c.globalCompositeOperation = 'lighter';
  const g1 = glow(C.color, 32);
  c.globalAlpha = Math.min(1, 0.75 + 0.2 * Math.sin(t * 3) + open * 0.5); c.drawImage(g1.c, -80, -80, 160, 160);
  c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  // corps
  const w = 64, hgt = 38;
  let gr = c.createLinearGradient(0, 0, 0, hgt);
  gr.addColorStop(0, lighten(C.color2, 0.15)); gr.addColorStop(1, darken(C.color2, 0.35));
  c.fillStyle = gr; c.beginPath(); c.roundRect ? c.roundRect(-w / 2, -6, w, hgt, 5) : c.rect(-w / 2, -6, w, hgt); c.fill();
  c.strokeStyle = lighten(C.color, 0.3); c.lineWidth = 2; c.stroke();
  c.fillStyle = C.color; c.fillRect(-w / 2, 8, w, 4); c.fillRect(-4, -6, 8, hgt);
  // couvercle
  c.save(); c.translate(-w / 2, -6); c.rotate(-open * 1.25); c.translate(w / 2, 6);
  gr = c.createLinearGradient(0, -30, 0, -4);
  gr.addColorStop(0, lighten(C.color, 0.6)); gr.addColorStop(1, C.color);
  c.fillStyle = gr;
  c.beginPath(); c.moveTo(-w / 2, -6); c.quadraticCurveTo(-w / 2, -32, 0, -34); c.quadraticCurveTo(w / 2, -32, w / 2, -6); c.closePath(); c.fill();
  c.strokeStyle = lighten(C.color, 0.6); c.lineWidth = 2; c.stroke();
  c.fillStyle = '#ffffff'; c.beginPath(); c.arc(0, -10, 5, 0, TAU); c.fill();
  c.restore();
  // gemmes décoratives
  c.fillStyle = '#ffffff';
  for (const sx of [-22, 22]) { c.save(); c.translate(sx, 18); c.rotate(t); starPath(c, 4, 4, 1.2, 0, false); c.fill(); c.restore(); }
  baseT();
}

// Roue de la fortune
export function drawWheel(cx, cy, R, segs, ang, t, iconFor) {
  const c = ctx, n = segs.length;
  c.globalCompositeOperation = 'lighter';
  const g1 = glow('#a259ff', 32); c.globalAlpha = 0.6; c.drawImage(g1.c, cx - R * 1.4, cy - R * 1.4, R * 2.8, R * 2.8); c.globalAlpha = 1;
  c.globalCompositeOperation = 'source-over';
  for (let i = 0; i < n; i++) {
    const a0 = ang + (i / n) * TAU - Math.PI / 2, a1 = a0 + TAU / n;
    c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, R, a0, a1); c.closePath();
    const gr = c.createRadialGradient(cx, cy, R * 0.2, cx, cy, R);
    gr.addColorStop(0, darken(segs[i].color, 0.75)); gr.addColorStop(1, darken(segs[i].color, i % 2 ? 0.35 : 0.5));
    c.fillStyle = gr; c.fill();
    c.strokeStyle = rgba(segs[i].color, 0.9); c.lineWidth = 1.5; c.stroke();
    const am = (a0 + a1) / 2;
    setT(cx + Math.cos(am) * R * 0.68, cy + Math.sin(am) * R * 0.68);
    c.rotate(am + Math.PI / 2);
    iconFor(i, c);
    baseT();
  }
  c.strokeStyle = '#ffffff'; c.lineWidth = 4; c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.stroke();
  for (let i = 0; i < n * 2; i++) {
    const a = ang + (i / (n * 2)) * TAU - Math.PI / 2;
    const on = Math.floor(t * 6 + i) % 2 === 0;
    c.fillStyle = on ? '#fff6c8' : '#ff9d3c';
    c.beginPath(); c.arc(cx + Math.cos(a) * (R + 7), cy + Math.sin(a) * (R + 7), 3, 0, TAU); c.fill();
  }
  c.beginPath(); c.arc(cx, cy, R * 0.18, 0, TAU);
  const gc = c.createRadialGradient(cx - 4, cy - 4, 0, cx, cy, R * 0.18); gc.addColorStop(0, '#ffffff'); gc.addColorStop(1, '#a259ff');
  c.fillStyle = gc; c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 2; c.stroke();
  // pointeur
  c.fillStyle = '#ffd23f'; c.strokeStyle = '#fff'; c.lineWidth = 2;
  c.beginPath(); c.moveTo(cx, cy - R + 14); c.lineTo(cx - 12, cy - R - 16); c.lineTo(cx + 12, cy - R - 16); c.closePath(); c.fill(); c.stroke();
}
export { ICONS, drawNovaStar, polyPath, starPath };
