// Dessins vectoriels réutilisables : formes organiques, icônes (monnaies, bonus), cache de dégradés
import { TAU, rgba, lighten, darken, mixHex } from '../engine/math.js';
import { makeCanvas } from '../engine/sprites.js';

const PX = new Float32Array(128), PY = new Float32Array(128);

export function smoothClosed(g, n) {
  g.beginPath();
  g.moveTo((PX[n - 1] + PX[0]) / 2, (PY[n - 1] + PY[0]) / 2);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    g.quadraticCurveTo(PX[i], PY[i], (PX[i] + PX[j]) / 2, (PY[i] + PY[j]) / 2);
  }
  g.closePath();
}
// Membrane ondulante
export function blobPath(g, rx, ry, t, wob = 0.08, n = 10, seed = 0) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const k = 1 + wob * Math.sin(a * 3 + t * 3.1 + seed) + wob * 0.6 * Math.sin(a * 5 - t * 2.2 + seed * 1.7);
    PX[i] = Math.cos(a) * rx * k; PY[i] = Math.sin(a) * ry * k;
  }
  smoothClosed(g, n);
}
// Polygone étoilé arrondi
export function starPath(g, n, r1, r2, rot = 0, smooth = true) {
  const m = n * 2;
  for (let i = 0; i < m; i++) {
    const a = rot + (i / m) * TAU - Math.PI / 2;
    const r = i % 2 ? r2 : r1;
    PX[i] = Math.cos(a) * r; PY[i] = Math.sin(a) * r;
  }
  if (smooth) smoothClosed(g, m);
  else { g.beginPath(); g.moveTo(PX[0], PY[0]); for (let i = 1; i < m; i++) g.lineTo(PX[i], PY[i]); g.closePath(); }
}
export function polyPath(g, n, r, rot = 0) {
  g.beginPath();
  for (let i = 0; i < n; i++) { const a = rot + (i / n) * TAU; const x = Math.cos(a) * r, y = Math.sin(a) * r; if (i) g.lineTo(x, y); else g.moveTo(x, y); }
  g.closePath();
}
// Tentacule effilé (remplit) ; renvoie la position de l'extrémité dans out
export function tentacle(g, x, y, ang, len, w, t, ph = 0, amp = 0.35, segs = 7, out = null) {
  const ca = [], cb = [];
  let px = x, py = y, a = ang;
  for (let i = 0; i <= segs; i++) {
    const k = i / segs;
    const ww = w * (1 - k * 0.92);
    const nx = -Math.sin(a), ny = Math.cos(a);
    ca.push(px + nx * ww, py + ny * ww); cb.push(px - nx * ww, py - ny * ww);
    a = ang + Math.sin(t * 3 + ph + k * 3.2) * amp * k * 1.6;
    px += Math.cos(a) * (len / segs); py += Math.sin(a) * (len / segs);
  }
  g.beginPath();
  g.moveTo(ca[0], ca[1]);
  for (let i = 2; i < ca.length; i += 2) g.lineTo(ca[i], ca[i + 1]);
  for (let i = cb.length - 2; i >= 0; i -= 2) g.lineTo(cb[i], cb[i + 1]);
  g.closePath();
  if (out) { out.x = px; out.y = py; }
}
// Œil : sclère, iris, pupille qui regarde (lx, ly normalisés)
export function eye(g, x, y, r, lx, ly, iris, open = 1) {
  if (open <= 0.05) { g.strokeStyle = darken(iris, 0.3); g.lineWidth = r * 0.25; g.beginPath(); g.moveTo(x - r, y); g.quadraticCurveTo(x, y + r * 0.4, x + r, y); g.stroke(); return; }
  g.save();
  g.beginPath(); g.ellipse(x, y, r, r * open, 0, 0, TAU);
  g.fillStyle = '#f6f2ff'; g.fill();
  g.clip();
  const ix = x + lx * r * 0.35, iy = y + ly * r * 0.35;
  g.fillStyle = iris; g.beginPath(); g.arc(ix, iy, r * 0.62, 0, TAU); g.fill();
  g.fillStyle = '#05020f'; g.beginPath(); g.arc(ix, iy, r * 0.3, 0, TAU); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.arc(ix - r * 0.2, iy - r * 0.22, r * 0.14, 0, TAU); g.fill();
  g.restore();
}
export function heartPath(g, s) {
  g.beginPath();
  g.moveTo(0, s * 0.35);
  g.bezierCurveTo(-s * 1.1, -s * 0.35, -s * 0.5, -s * 1.05, 0, -s * 0.45);
  g.bezierCurveTo(s * 0.5, -s * 1.05, s * 1.1, -s * 0.35, 0, s * 0.35);
  g.closePath();
}

// Dégradé radial « organique » mis en cache (centré en 0,0)
const gcache = new Map();
export function bodyGrad(ctx, color, r, key = '') {
  const k = color + '|' + r + '|' + key;
  let gr = gcache.get(k);
  if (gr) return gr;
  gr = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.05, 0, 0, r * 1.05);
  gr.addColorStop(0, lighten(color, 0.7));
  gr.addColorStop(0.35, lighten(color, 0.15));
  gr.addColorStop(0.75, color);
  gr.addColorStop(1, darken(color, 0.35));
  if (gcache.size > 600) gcache.clear();
  gcache.set(k, gr);
  return gr;
}
export function clearGradCache() { gcache.clear(); }

// ---------- Icônes ----------
export function drawCoin(g, r, tier = 1) {
  const base = ['#ffb347', '#ffd23f', '#fff1a0'][tier] || '#ffd23f';
  let gr = g.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.1, 0, 0, r);
  gr.addColorStop(0, lighten(base, 0.7)); gr.addColorStop(0.5, base); gr.addColorStop(1, darken(base, 0.45));
  polyPath(g, 8, r, Math.PI / 8);
  g.strokeStyle = 'rgba(40,20,0,0.9)'; g.lineWidth = r * 0.3; g.stroke();
  g.fillStyle = gr; g.fill();
  g.strokeStyle = lighten(base, 0.5); g.lineWidth = r * 0.1; g.stroke();
  polyPath(g, 8, r * 0.74, Math.PI / 8); g.strokeStyle = darken(base, 0.35); g.lineWidth = r * 0.07; g.stroke();
  g.fillStyle = lighten(base, 0.75);
  starPath(g, 4, r * 0.55, r * 0.18, 0, false); g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = r * 0.08;
  g.beginPath(); g.arc(0, 0, r * 0.78, -2.6, -1.5); g.stroke();
}
export function drawCrystal(g, r, color = '#38f2ff') {
  const c = color;
  g.beginPath(); g.moveTo(0, -r); g.lineTo(r * 0.55, -r * 0.35); g.lineTo(r * 0.55, r * 0.4); g.lineTo(0, r); g.lineTo(-r * 0.55, r * 0.4); g.lineTo(-r * 0.55, -r * 0.35); g.closePath();
  g.fillStyle = darken(c, 0.25); g.fill();
  g.fillStyle = lighten(c, 0.35);
  g.beginPath(); g.moveTo(0, -r); g.lineTo(r * 0.55, -r * 0.35); g.lineTo(r * 0.12, -r * 0.1); g.lineTo(0, r); g.lineTo(-r * 0.15, -r * 0.2); g.closePath(); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.85)';
  g.beginPath(); g.moveTo(-r * 0.1, -r * 0.75); g.lineTo(r * 0.25, -r * 0.35); g.lineTo(-r * 0.05, -r * 0.25); g.closePath(); g.fill();
  g.strokeStyle = lighten(c, 0.7); g.lineWidth = r * 0.08;
  g.beginPath(); g.moveTo(0, -r); g.lineTo(r * 0.55, -r * 0.35); g.lineTo(r * 0.55, r * 0.4); g.lineTo(0, r); g.lineTo(-r * 0.55, r * 0.4); g.lineTo(-r * 0.55, -r * 0.35); g.closePath(); g.stroke();
}
export function drawGem(g, r, color = '#ff4fd8') {
  const c = color;
  g.beginPath(); g.moveTo(-r, -r * 0.25); g.lineTo(-r * 0.55, -r * 0.75); g.lineTo(r * 0.55, -r * 0.75); g.lineTo(r, -r * 0.25); g.lineTo(0, r); g.closePath();
  g.fillStyle = darken(c, 0.3); g.fill();
  g.fillStyle = c;
  g.beginPath(); g.moveTo(-r, -r * 0.25); g.lineTo(r, -r * 0.25); g.lineTo(0, r); g.closePath(); g.fill();
  g.fillStyle = lighten(c, 0.45);
  g.beginPath(); g.moveTo(-r * 0.55, -r * 0.75); g.lineTo(r * 0.55, -r * 0.75); g.lineTo(r * 0.3, -r * 0.25); g.lineTo(-r * 0.3, -r * 0.25); g.closePath(); g.fill();
  g.fillStyle = lighten(c, 0.2);
  g.beginPath(); g.moveTo(-r * 0.3, -r * 0.25); g.lineTo(r * 0.3, -r * 0.25); g.lineTo(0, r); g.closePath(); g.fill();
  g.strokeStyle = lighten(c, 0.8); g.lineWidth = r * 0.07;
  g.beginPath(); g.moveTo(-r, -r * 0.25); g.lineTo(-r * 0.55, -r * 0.75); g.lineTo(r * 0.55, -r * 0.75); g.lineTo(r, -r * 0.25); g.lineTo(0, r); g.closePath(); g.stroke();
  g.fillStyle = '#fff'; starPath(g, 4, r * 0.32, r * 0.07, 0, false); g.save(); g.translate(-r * 0.35, -r * 0.5); g.fill(); g.restore();
}
export function drawPart(g, r, color = '#ff9d3c') {
  const teeth = 8;
  g.beginPath();
  for (let i = 0; i < teeth * 2; i++) {
    const a = (i / (teeth * 2)) * TAU;
    const rr = i % 2 ? r * 0.78 : r;
    const a1 = a - 0.12, a2 = a + 0.12;
    if (i === 0) g.moveTo(Math.cos(a1) * rr, Math.sin(a1) * rr); else g.lineTo(Math.cos(a1) * rr, Math.sin(a1) * rr);
    g.lineTo(Math.cos(a2) * rr, Math.sin(a2) * rr);
  }
  g.closePath();
  const gr = g.createRadialGradient(-r * 0.3, -r * 0.3, 0, 0, 0, r);
  gr.addColorStop(0, lighten(color, 0.5)); gr.addColorStop(1, darken(color, 0.35));
  g.fillStyle = gr; g.fill();
  g.strokeStyle = lighten(color, 0.6); g.lineWidth = r * 0.08; g.stroke();
  g.fillStyle = darken(color, 0.7); g.beginPath(); g.arc(0, 0, r * 0.32, 0, TAU); g.fill();
  g.strokeStyle = lighten(color, 0.4); g.lineWidth = r * 0.1; g.beginPath(); g.arc(0, 0, r * 0.5, 0, TAU); g.stroke();
}
export function drawHeart(g, r, color = '#ff4f8a') {
  heartPath(g, r);
  const gr = g.createRadialGradient(-r * 0.3, -r * 0.4, 0, 0, 0, r * 1.1);
  gr.addColorStop(0, lighten(color, 0.6)); gr.addColorStop(0.6, color); gr.addColorStop(1, darken(color, 0.4));
  g.fillStyle = gr; g.fill();
  g.strokeStyle = lighten(color, 0.6); g.lineWidth = r * 0.1; g.stroke();
}
export function drawShieldIco(g, r, color = '#38f2ff') {
  polyPath(g, 6, r, Math.PI / 6);
  g.fillStyle = rgba(color, 0.25); g.fill();
  g.strokeStyle = color; g.lineWidth = r * 0.16; g.stroke();
  polyPath(g, 6, r * 0.55, Math.PI / 6);
  g.fillStyle = lighten(color, 0.5); g.fill();
}
export function drawMagnet(g, r) {
  g.lineCap = 'butt';
  g.lineWidth = r * 0.42;
  g.strokeStyle = '#ff4f6e';
  g.beginPath(); g.arc(0, -r * 0.05, r * 0.6, Math.PI, 0); g.stroke();
  g.beginPath(); g.moveTo(-r * 0.6, -r * 0.05); g.lineTo(-r * 0.6, r * 0.35); g.moveTo(r * 0.6, -r * 0.05); g.lineTo(r * 0.6, r * 0.35); g.stroke();
  g.strokeStyle = '#e8f4ff';
  g.beginPath(); g.moveTo(-r * 0.6, r * 0.35); g.lineTo(-r * 0.6, r * 0.75); g.moveTo(r * 0.6, r * 0.35); g.lineTo(r * 0.6, r * 0.75); g.stroke();
}
export function drawBolt(g, r, color = '#ffe94a') {
  g.beginPath(); g.moveTo(r * 0.2, -r); g.lineTo(-r * 0.55, r * 0.12); g.lineTo(-r * 0.02, r * 0.12); g.lineTo(-r * 0.25, r); g.lineTo(r * 0.6, -r * 0.18); g.lineTo(r * 0.05, -r * 0.18); g.closePath();
  g.fillStyle = color; g.fill();
  g.strokeStyle = '#fff'; g.lineWidth = r * 0.09; g.stroke();
}
export function drawPowerIco(g, r, color = '#ff9d3c') {
  g.beginPath(); g.arc(0, 0, r, 0, TAU);
  g.fillStyle = rgba(color, 0.3); g.fill(); g.strokeStyle = color; g.lineWidth = r * 0.14; g.stroke();
  g.strokeStyle = '#fff'; g.lineWidth = r * 0.2; g.lineJoin = 'round'; g.lineCap = 'round';
  for (let k = 0; k < 2; k++) { const y = -r * 0.15 + k * r * 0.45; g.beginPath(); g.moveTo(-r * 0.45, y + r * 0.2); g.lineTo(0, y - r * 0.2); g.lineTo(r * 0.45, y + r * 0.2); g.stroke(); }
}
export function drawNovaStar(g, r, t = 0) {
  const cols = ['#ff4fd8', '#ffd23f', '#38f2ff', '#47ffa3', '#a259ff'];
  for (let i = 0; i < 5; i++) {
    g.fillStyle = cols[(i + Math.floor(t * 6)) % 5];
    starPath(g, 5, r * (1 - i * 0.17), r * (0.45 - i * 0.07), t + i * 0.3, false);
    g.fill();
  }
}
export function drawChestIco(g, r, color = '#38f2ff', color2 = '#1a6dff') {
  const w = r * 1.7, h = r * 1.2;
  g.fillStyle = darken(color2, 0.4);
  g.beginPath(); g.roundRect ? g.roundRect(-w / 2, -h * 0.25, w, h * 0.85, r * 0.15) : g.rect(-w / 2, -h * 0.25, w, h * 0.85); g.fill();
  const gr = g.createLinearGradient(0, -h * 0.7, 0, 0);
  gr.addColorStop(0, lighten(color, 0.3)); gr.addColorStop(1, color2);
  g.fillStyle = gr;
  g.beginPath(); g.moveTo(-w / 2, -h * 0.2); g.quadraticCurveTo(-w / 2, -h * 0.75, 0, -h * 0.78); g.quadraticCurveTo(w / 2, -h * 0.75, w / 2, -h * 0.2); g.closePath(); g.fill();
  g.strokeStyle = lighten(color, 0.6); g.lineWidth = r * 0.1;
  g.strokeRect(-w / 2, -h * 0.22, w, h * 0.82);
  g.fillStyle = '#fff'; g.beginPath(); g.arc(0, -h * 0.12, r * 0.18, 0, TAU); g.fill();
  g.fillStyle = color; g.fillRect(-w / 2, -h * 0.26, w, r * 0.14);
}

export const ICONS = {
  coins: (g, r) => drawCoin(g, r, 1),
  crystals: (g, r) => drawCrystal(g, r),
  gems: (g, r) => drawGem(g, r),
  parts: (g, r) => drawPart(g, r),
  heart: (g, r) => drawHeart(g, r),
  shield: (g, r) => drawShieldIco(g, r),
  magnet: (g, r) => drawMagnet(g, r),
  energy: (g, r) => drawBolt(g, r),
  power: (g, r) => drawPowerIco(g, r),
  nova: (g, r) => drawNovaStar(g, r, 0.3),
  chest_neon: (g, r) => drawChestIco(g, r, '#38f2ff', '#1a6dff'),
  chest_prism: (g, r) => drawChestIco(g, r, '#c35cff', '#ff3fa9'),
  chest_astral: (g, r) => drawChestIco(g, r, '#ffc23d', '#ff6a2a'),
  chest_boss: (g, r) => drawChestIco(g, r, '#ff4f6e', '#ffb02f'),
  boost_nova: (g, r) => drawNovaStar(g, r, 0.2),
  boost_shield: (g, r) => drawShieldIco(g, r),
  boost_power: (g, r) => drawPowerIco(g, r),
};

// Image (data URL) d'une icône pour le DOM
const urlCache = new Map();
export function iconURL(name, size = 64, glowColor = null) {
  const k = name + size + (glowColor || '');
  let u = urlCache.get(k);
  if (u) return u;
  const c = makeCanvas(size, size);
  const g = c.getContext('2d');
  g.translate(size / 2, size / 2);
  if (glowColor) {
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, size / 2);
    gr.addColorStop(0, rgba(glowColor, 0.55)); gr.addColorStop(1, rgba(glowColor, 0));
    g.fillStyle = gr; g.fillRect(-size / 2, -size / 2, size, size);
  }
  const f = ICONS[name];
  if (f) f(g, size * 0.38);
  u = c.toDataURL();
  urlCache.set(k, u);
  return u;
}
export { mixHex };
