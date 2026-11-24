// Cache de sprites pré-rendus (lueurs, balles, icônes) — clé de la fluidité sur mobile
import { view, ctx } from './renderer.js';
import { rgba } from './math.js';

const cache = new Map();
let cacheRs = 0;

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

// w,h en unités ; draw(g, w, h) dessine dans un repère en unités
export function sprite(key, w, h, draw, res = 1) {
  if (cacheRs !== view.rs) { cache.clear(); cacheRs = view.rs; }
  let s = cache.get(key);
  if (s) return s;
  const sc = Math.max(0.25, view.rs * res);
  const c = makeCanvas(w * sc, h * sc);
  const g = c.getContext('2d');
  g.scale(c.width / w, c.height / h);
  draw(g, w, h);
  s = { c, w, h, hw: w / 2, hh: h / 2 };
  cache.set(key, s);
  return s;
}
export function clearSprites() { cache.clear(); }

// Lueur radiale (pour le mode additif)
export function glow(color, r = 16) {
  return sprite('glow|' + color + '|' + r, r * 2, r * 2, (g) => {
    const gr = g.createRadialGradient(r, r, 0, r, r, r);
    gr.addColorStop(0, rgba(color, 1));
    gr.addColorStop(0.16, rgba(color, 0.62));
    gr.addColorStop(0.42, rgba(color, 0.2));
    gr.addColorStop(0.7, rgba(color, 0.06));
    gr.addColorStop(1, rgba(color, 0));
    g.fillStyle = gr;
    g.fillRect(0, 0, r * 2, r * 2);
  }, r > 30 ? 0.35 : 0.6);
}

// Point lumineux à cœur blanc
export function orb(color, r = 6) {
  const R = r * 2.6;
  return sprite('orb|' + color + '|' + r, R * 2, R * 2, (g) => {
    let gr = g.createRadialGradient(R, R, 0, R, R, R);
    gr.addColorStop(0, rgba(color, 0.9));
    gr.addColorStop(0.35, rgba(color, 0.35));
    gr.addColorStop(1, rgba(color, 0));
    g.fillStyle = gr; g.fillRect(0, 0, R * 2, R * 2);
    gr = g.createRadialGradient(R, R, 0, R, R, r);
    gr.addColorStop(0, '#ffffff');
    gr.addColorStop(0.55, '#ffffff');
    gr.addColorStop(0.8, rgba(color, 1));
    gr.addColorStop(1, rgba(color, 0.0));
    g.fillStyle = gr;
    g.beginPath(); g.arc(R, R, r, 0, Math.PI * 2); g.fill();
  });
}

// Dessins rapides
export function drawS(s, x, y, sc = 1) {
  ctx.drawImage(s.c, x - s.hw * sc, y - s.hh * sc, s.w * sc, s.h * sc);
}
export function drawSA(s, x, y, sc, a) {
  ctx.globalAlpha = a;
  ctx.drawImage(s.c, x - s.hw * sc, y - s.hh * sc, s.w * sc, s.h * sc);
  ctx.globalAlpha = 1;
}
