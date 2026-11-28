// Rendu : canvas, résolution adaptative, zones de sécurité, caméra (tremblements, flashs)
import { clamp } from './math.js';

export const view = {
  w: 400, h: 800,          // unités logiques (largeur fixe)
  unit: 1,                 // pixels CSS par unité
  dpr: 1,                  // pixels écran par pixel CSS (plafonné)
  rs: 1,                   // pixels écran par unité
  cssW: 400, cssH: 800,
  safeT: 0, safeB: 0,      // zones de sécurité (unités)
  quality: 'auto',
  adapt: 1,                // facteur adaptatif (auto)
  left: 0,                 // décalage du stage (px CSS)
};
export const cam = { ox: 0, oy: 0, shake: 0, flash: 0, flashColor: '#ffffff', hitstop: 0, shakeOn: true };
export let canvas = null;
export let ctx = null;
const resizeCbs = [];
export function onResize(cb) { resizeCbs.push(cb); }

export function initRenderer() {
  canvas = document.getElementById('game');
  ctx = canvas.getContext('2d', { alpha: true }); // transparent : le décor 3D (WebGL) est dessous
  resize();
  window.addEventListener('resize', () => resize());
  window.addEventListener('orientationchange', () => setTimeout(resize, 250));
  if (window.visualViewport) window.visualViewport.addEventListener('resize', () => resize());
}

function dprCap() {
  const q = view.quality;
  if (q === 'high') return 2.6;
  if (q === 'med') return 1.6;
  if (q === 'low') return 1.1;
  return 2.2 * view.adapt; // auto
}

let lastKey = '';
export function resize(force = false) {
  const ww = window.innerWidth, wh = window.innerHeight;
  const gw = Math.min(ww, Math.round(wh / 1.42));
  const dpr = clamp(Math.min(window.devicePixelRatio || 1, dprCap()), 1, 3);
  const key = ww + 'x' + wh + '@' + dpr.toFixed(2);
  if (key === lastKey && !force) return;
  lastKey = key;
  const stage = document.getElementById('stage');
  stage.style.width = gw + 'px';
  view.cssW = gw; view.cssH = wh;
  view.unit = gw / view.w;
  view.h = wh / view.unit;
  view.dpr = dpr;
  canvas.width = Math.round(gw * dpr);
  canvas.height = Math.round(wh * dpr);
  canvas.style.width = gw + 'px';
  canvas.style.height = wh + 'px';
  view.rs = canvas.width / view.w;
  const probe = document.getElementById('safe-probe');
  const cs = getComputedStyle(probe);
  view.safeT = (parseFloat(cs.paddingTop) || 0) / view.unit;
  view.safeB = (parseFloat(cs.paddingBottom) || 0) / view.unit;
  for (const cb of resizeCbs) cb();
}

export function setQuality(q) { view.quality = q; view.adapt = 1; resize(true); }

// Transformations rapides (sans save/restore)
export function baseT() { ctx.setTransform(view.rs, 0, 0, view.rs, cam.ox, cam.oy); }
export function setT(x, y, sc = 1) { const r = view.rs * sc; ctx.setTransform(r, 0, 0, r, cam.ox + x * view.rs, cam.oy + y * view.rs); }
export function setRT(x, y, rot, sc = 1) {
  const r = view.rs * sc, c = Math.cos(rot) * r, s = Math.sin(rot) * r;
  ctx.setTransform(c, s, -s, c, cam.ox + x * view.rs, cam.oy + y * view.rs);
}
export function setRTS(x, y, rot, sx, sy) {
  const r = view.rs, c = Math.cos(rot), s = Math.sin(rot);
  ctx.setTransform(c * sx * r, s * sx * r, -s * sy * r, c * sy * r, cam.ox + x * view.rs, cam.oy + y * view.rs);
}

// Caméra
export function addShake(v) { cam.shake = Math.min(1.1, cam.shake + v * (cam.shakeOn ? 1 : 0.15)); }
export function flash(color, a) { if (a >= cam.flash || color === cam.flashColor) { cam.flashColor = color; cam.flash = Math.max(cam.flash, a); } }
export function hitstop(t) { cam.hitstop = Math.max(cam.hitstop, t); }
export function updateCam(dt) {
  cam.shake = Math.max(0, cam.shake - dt * 1.5);
  const s = cam.shake * cam.shake * 13 * view.rs;
  cam.ox = (Math.random() * 2 - 1) * s;
  cam.oy = (Math.random() * 2 - 1) * s;
  cam.flash = Math.max(0, cam.flash - dt * 2.6);
}
export function drawFlash() {
  if (cam.flash > 0.01) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = Math.min(0.85, cam.flash);
    ctx.fillStyle = cam.flashColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;
  }
}

// Qualité adaptative : surveille le temps de frame
let acc = 0, n = 0, slow = 0, fast = 0;
export function trackFrame(dt) {
  if (view.quality !== 'auto') return;
  acc += dt; n++;
  if (acc >= 1) {
    const avg = acc / n; acc = 0; n = 0;
    if (avg > 1 / 50) { slow++; fast = 0; } else if (avg < 1 / 58) { fast++; slow = 0; } else { slow = 0; fast = 0; }
    if (slow >= 2 && view.adapt > 0.55) { view.adapt = Math.max(0.55, view.adapt - 0.15); slow = 0; resize(true); }
    else if (fast >= 8 && view.adapt < 1) { view.adapt = Math.min(1, view.adapt + 0.1); fast = 0; resize(true); }
  }
}
