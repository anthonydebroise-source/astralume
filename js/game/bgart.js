// Textures de décor générées pixel par pixel : nébuleuses, géantes gazeuses, lunes,
// astéroïdes ombrés, nuages, stations spatiales, et terrain planétaire en relief éclairé.
import { TAU, RNG, rgba, lighten, darken, mixHex, hexToRgb, clamp, hslHex } from '../engine/math.js';
import { makeCanvas } from '../engine/sprites.js';
import { Noise, makeRamp, smooth } from '../engine/noise.js';

const L = (() => { const v = [-0.55, -0.62, 0.56]; const l = Math.hypot(...v); return v.map((x) => x / l); })();

// ---------- Nébuleuse (tuile périodique verticalement) ----------
export function nebulaTexture(pal, seed, Wu, Hu, res) {
  const w = Math.ceil(Wu * res), h = Math.ceil(Hu * res);
  const cv = makeCanvas(w, h), g = cv.getContext('2d');
  const img = g.createImageData(w, h), D = img.data;
  const N = new Noise(seed), M = new Noise(seed * 7 + 3);
  const PY = 4, k = PY / h;
  const ramp = makeRamp([[0, darken(pal.neb1, 0.9)], [0.22, darken(pal.neb1, 0.6)], [0.48, pal.neb1], [0.7, mixHex(pal.neb1, pal.neb2, 0.7)], [0.88, lighten(pal.neb2, 0.45)], [1, '#ffffff']]);
  const t3 = hexToRgb(pal.neb3);
  for (let y = 0; y < h; y++) {
    const Y = y * k;
    for (let x = 0; x < w; x++) {
      const X = x * k;
      const qx = N.fbm(X + 5.2, Y + 1.3, 3, PY), qy = N.fbm(X + 1.7, Y + 9.2, 3, PY);
      const n = N.fbm(X + 1.7 * qx, Y + 1.7 * qy, 5, PY);
      let d = smooth(-0.2, 0.62, n);
      const dust = smooth(0.08, 0.55, M.fbm(X * 2 + 7, Y * 2, 4, PY * 2));
      d *= 1 - dust * 0.8;
      const fil = M.ridge(X * 2 + 1.7 * qx, Y * 2 + 1.7 * qy, 3, PY * 2);
      d = Math.min(1, d + Math.max(0, fil - 0.72) * 1.6 * d);
      const tint = smooth(0.15, 0.7, M.fbm(X + 13, Y, 3, PY)) * 0.45 * d;
      const ci = Math.min(255, (d * 255) | 0) * 3;
      const i = (y * w + x) * 4;
      D[i] = ramp[ci] + (t3[0] - ramp[ci]) * tint;
      D[i + 1] = ramp[ci + 1] + (t3[1] - ramp[ci + 1]) * tint;
      D[i + 2] = ramp[ci + 2] + (t3[2] - ramp[ci + 2]) * tint;
      D[i + 3] = Math.min(255, d * d * 1.5 * 255 + d * 60);
    }
  }
  g.putImageData(img, 0, 0);
  // étoiles naissantes dans les zones denses
  const r = new RNG(seed + 99);
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 110; i++) {
    const x = r.next() * w, y = r.next() * h, s = r.range(0.4, 1.6) * res * 2;
    const gr = g.createRadialGradient(x, y, 0, x, y, s * 3);
    gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.3, rgba(pal.neb2, 0.35)); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(x - s * 3, y - s * 3, s * 6, s * 6);
    for (const oy of [-h, h]) if (y + oy > -s * 3 && y + oy < h + s * 3) { g.fillStyle = gr; g.save(); g.translate(0, oy); g.fillRect(x - s * 3, y - s * 3, s * 6, s * 6); g.restore(); }
  }
  return cv;
}

// ---------- Corps célestes ----------
function sphereLoop(S, rr, cb) {
  const c = S / 2;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const nx = (x + 0.5 - c) / rr, ny = (y + 0.5 - c) / rr, q = nx * nx + ny * ny;
    if (q >= 1) continue;
    cb(x, y, nx, ny, Math.sqrt(1 - q));
  }
}
export function gasGiant(pal, seed, R, res, rings = true) {
  const S = Math.ceil(R * 2.9 * res), rr = R * res, c = S / 2;
  const body = makeCanvas(S, S), bg = body.getContext('2d');
  const img = bg.createImageData(S, S), D = img.data;
  const N = new Noise(seed);
  const n1 = pal.neb1, n2 = pal.neb2;
  const ramp = makeRamp([[0, darken(n1, 0.72)], [0.3, mixHex(darken(n1, 0.2), '#b8a890', 0.4)], [0.5, mixHex(lighten(n2, 0.1), '#e8d8c8', 0.45)], [0.7, mixHex(n1, n2, 0.5)], [0.86, lighten(n2, 0.3)], [1, '#fff4e8']]);
  const rim = hexToRgb(lighten(pal.neb2, 0.4));
  const tilt = -0.32, ct = Math.cos(tilt), st = Math.sin(tilt);
  sphereLoop(S, rr, (x, y, nx, ny, nz) => {
    const lat = nx * st + ny * ct;
    const lon = Math.atan2(nx * ct - ny * st, nz);
    const turb = N.fbm(lon * 1.6, lat * 9, 5);
    const v = clamp(0.5 + 0.5 * Math.sin(lat * 13 + turb * 2.4) * 0.62 + N.fbm(lon * 3, lat * 22, 3) * 0.22, 0, 1);
    const ci = (v * 255) | 0;
    let shade = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]);
    shade = 0.08 + shade * 1.0;
    const rimK = Math.pow(1 - nz, 2.5) * 0.9 * (0.3 + shade);
    const i = (y * S + x) * 4;
    D[i] = Math.min(255, ramp[ci * 3] * shade + rim[0] * rimK);
    D[i + 1] = Math.min(255, ramp[ci * 3 + 1] * shade + rim[1] * rimK);
    D[i + 2] = Math.min(255, ramp[ci * 3 + 2] * shade + rim[2] * rimK);
    D[i + 3] = 255;
  });
  bg.putImageData(img, 0, 0);
  const cv = makeCanvas(S, S), g = cv.getContext('2d');
  // halo atmosphérique
  const hg = g.createRadialGradient(c, c, rr * 0.95, c, c, rr * 1.35);
  hg.addColorStop(0, rgba(pal.neb2, 0.45)); hg.addColorStop(1, rgba(pal.neb2, 0));
  g.fillStyle = hg; g.fillRect(0, 0, S, S);
  const ring = (front) => {
    g.save(); g.translate(c, c); g.rotate(tilt); g.scale(1, 0.26);
    g.beginPath(); if (front) g.rect(-S, 0, S * 2, S); else g.rect(-S, -S, S * 2, S); g.clip();
    for (let i = 0; i < 14; i++) {
      const rad = rr * (1.35 + i * 0.045);
      g.strokeStyle = rgba(i % 3 === 0 ? lighten(pal.deco, 0.4) : pal.deco, 0.12 + ((i * 37) % 7) / 22);
      g.lineWidth = rr * 0.04; g.beginPath(); g.arc(0, 0, rad, 0, TAU); g.stroke();
    }
    g.restore();
  };
  if (rings) ring(false);
  g.drawImage(body, 0, 0);
  if (rings) {
    // ombre de la planète sur l'anneau avant + anneau avant
    ring(true);
  }
  return { cv, S, res };
}
export function rockyMoon(pal, seed, R, res) {
  const S = Math.ceil(R * 2.4 * res), rr = R * res;
  const cv = makeCanvas(S, S), g = cv.getContext('2d');
  const img = g.createImageData(S, S), D = img.data;
  const N = new Noise(seed), r = new RNG(seed);
  const craters = []; for (let i = 0; i < 14; i++) craters.push([r.range(-0.9, 0.9), r.range(-0.9, 0.9), r.range(0.06, 0.24)]);
  const tint = hexToRgb(mixHex('#9a948e', pal.neb1, 0.25)), rimc = hexToRgb(pal.neb2);
  const height = (nx, ny) => { let h = N.fbm(nx * 3, ny * 3, 5) * 0.5; for (const [cx, cy, cr] of craters) { const d = Math.hypot(nx - cx, ny - cy) / cr; if (d < 1.3) h += d < 1 ? -0.35 * (1 - d * d) : 0.25 * (1.3 - d) / 0.3 * (d - 1) / 0.3; } return h; };
  sphereLoop(S, rr, (x, y, nx, ny, nz) => {
    const e = 1.5 / rr;
    const h0 = height(nx, ny), hx = height(nx + e, ny) - h0, hy = height(nx, ny + e) - h0;
    let mx = nx - hx * 18, my = ny - hy * 18, mz = nz; const l = Math.hypot(mx, my, mz); mx /= l; my /= l; mz /= l;
    const shade = 0.06 + Math.max(0, mx * L[0] + my * L[1] + mz * L[2]) * 1.05;
    const v = 0.75 + h0 * 0.6, rk = Math.pow(1 - nz, 3) * 0.6;
    const i = (y * S + x) * 4;
    D[i] = Math.min(255, tint[0] * v * shade + rimc[0] * rk); D[i + 1] = Math.min(255, tint[1] * v * shade + rimc[1] * rk); D[i + 2] = Math.min(255, tint[2] * v * shade + rimc[2] * rk); D[i + 3] = 255;
  });
  g.putImageData(img, 0, 0);
  return { cv, S, res };
}

// ---------- Astéroïdes sculptés ----------
export function rockSprite(seed, R, res, tintHex, rimHex) {
  const S = Math.ceil(R * 2.3 * res), rr = R * res, c = S / 2;
  const cv = makeCanvas(S, S), g = cv.getContext('2d');
  const img = g.createImageData(S, S), D = img.data;
  const N = new Noise(seed);
  const tint = hexToRgb(tintHex), rim = hexToRgb(rimHex);
  const rad = (a) => 0.78 + 0.22 * N.fbm(Math.cos(a) * 1.3 + 4, Math.sin(a) * 1.3 + 4, 3);
  const h = (x, y) => N.fbm(x * 2.2 + 9, y * 2.2, 5);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const nx = (x + 0.5 - c) / rr, ny = (y + 0.5 - c) / rr;
    const d = Math.hypot(nx, ny), a = Math.atan2(ny, nx), R0 = rad(a);
    if (d >= R0) continue;
    const q = d / R0, nz0 = Math.sqrt(Math.max(0, 1 - q * q));
    const e = 1.2 / rr, h0 = h(nx, ny), hx = h(nx + e, ny) - h0, hy = h(nx, ny + e) - h0;
    let mx = nx / R0 - hx * 22, my = ny / R0 - hy * 22, mz = nz0 + 0.15; const l = Math.hypot(mx, my, mz); mx /= l; my /= l; mz /= l;
    const shade = 0.05 + Math.max(0, mx * L[0] + my * L[1] + mz * L[2]) * 1.1;
    const back = Math.max(0, -(mx * L[0] + my * L[1])) * Math.pow(1 - nz0, 2) * 1.4;
    const v = 0.7 + h0 * 0.5;
    const i = (y * S + x) * 4;
    D[i] = Math.min(255, tint[0] * v * shade + rim[0] * back); D[i + 1] = Math.min(255, tint[1] * v * shade + rim[1] * back); D[i + 2] = Math.min(255, tint[2] * v * shade + rim[2] * back);
    D[i + 3] = 255 * Math.min(1, (R0 - d) * rr * 0.8);
  }
  g.putImageData(img, 0, 0);
  return { cv, S, res };
}

// ---------- Nuages ----------
export function cloudSprite(seed, Wu, Hu, res, color = '#ffffff') {
  const w = Math.ceil(Wu * res), h = Math.ceil(Hu * res);
  const cv = makeCanvas(w, h), g = cv.getContext('2d');
  const img = g.createImageData(w, h), D = img.data;
  const N = new Noise(seed); const col = hexToRgb(color);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const u = x / w * 2 - 1, v = y / h * 2 - 1;
    const fall = Math.max(0, 1 - (u * u + v * v * 1.6));
    const n = N.fbm(x / w * 3, y / h * 2, 5);
    const a = smooth(0.0, 0.55, n + fall * 0.6 - 0.35) * fall;
    const i = (y * w + x) * 4;
    const sh = 0.75 + 0.25 * (1 - v);
    D[i] = col[0] * sh; D[i + 1] = col[1] * sh; D[i + 2] = col[2] * sh; D[i + 3] = a * 255;
  }
  g.putImageData(img, 0, 0);
  return cv;
}

// ---------- Mégastructures (vectoriel détaillé) ----------
function vec(Wu, Hu, px, fn) { const cv = makeCanvas(Wu * px, Hu * px), g = cv.getContext('2d'); g.scale(px, px); g.translate(Wu / 2, Hu / 2); fn(g); return cv; }
export function stationSprite(pal, seed, px) {
  const r = new RNG(seed);
  return vec(260, 260, px, (g) => {
    const metal = (r0, r1) => { const gr = g.createLinearGradient(-r1, -r1, r1, r1); gr.addColorStop(0, '#c9cfe0'); gr.addColorStop(0.45, '#5a6074'); gr.addColorStop(1, '#1a1c26'); return gr; };
    // panneaux solaires
    for (const a of [0.4, 0.4 + Math.PI]) {
      g.save(); g.rotate(a);
      g.fillStyle = '#2a2e3c'; g.fillRect(60, -4, 70, 8);
      for (let k = 0; k < 4; k++) { const x = 70 + k * 16; const gr = g.createLinearGradient(x, -26, x + 14, 26); gr.addColorStop(0, '#3a6ad8'); gr.addColorStop(0.5, '#123a8a'); gr.addColorStop(1, '#0a1a4a'); g.fillStyle = gr; g.fillRect(x, -26, 14, 52); g.strokeStyle = 'rgba(160,200,255,0.5)'; g.lineWidth = 0.6; for (let j = -24; j < 26; j += 6) { g.beginPath(); g.moveTo(x, j); g.lineTo(x + 14, j); g.stroke(); } g.strokeRect(x, -26, 14, 52); }
      g.restore();
    }
    // anneau habitable
    g.lineWidth = 22; g.strokeStyle = metal(70, 100); g.beginPath(); g.arc(0, 0, 88, 0, TAU); g.stroke();
    g.lineWidth = 2; g.strokeStyle = 'rgba(0,0,0,0.6)'; g.beginPath(); g.arc(0, 0, 77, 0, TAU); g.stroke(); g.beginPath(); g.arc(0, 0, 99, 0, TAU); g.stroke();
    for (let i = 0; i < 24; i++) { const a = (i / 24) * TAU; g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(Math.cos(a) * 78, Math.sin(a) * 78); g.lineTo(Math.cos(a) * 98, Math.sin(a) * 98); g.stroke(); }
    for (let i = 0; i < 90; i++) { const a = r.next() * TAU, rad = r.range(80, 96); g.fillStyle = r.chance(0.7) ? '#ffe9a8' : pal.accent; g.fillRect(Math.cos(a) * rad - 0.8, Math.sin(a) * rad - 0.8, 1.6, 1.6); }
    g.lineWidth = 2; g.strokeStyle = pal.accent; g.beginPath(); g.arc(0, 0, 100, 0, TAU); g.stroke();
    // rayons
    for (let i = 0; i < 4; i++) { g.save(); g.rotate(i * Math.PI / 2 + 0.2); g.fillStyle = metal(0, 80); g.fillRect(20, -5, 58, 10); g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(20, -1, 58, 2); g.restore(); }
    // moyeu
    g.beginPath(); g.arc(0, 0, 30, 0, TAU); g.fillStyle = metal(0, 30); g.fill(); g.strokeStyle = '#0a0a12'; g.lineWidth = 2; g.stroke();
    for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; g.fillStyle = '#1a1c26'; g.beginPath(); g.arc(Math.cos(a) * 20, Math.sin(a) * 20, 4, 0, TAU); g.fill(); g.fillStyle = pal.accent; g.beginPath(); g.arc(Math.cos(a) * 20, Math.sin(a) * 20, 1.4, 0, TAU); g.fill(); }
    g.beginPath(); g.arc(0, 0, 11, 0, TAU); const cg = g.createRadialGradient(-3, -3, 0, 0, 0, 11); cg.addColorStop(0, '#ffffff'); cg.addColorStop(0.4, pal.accent); cg.addColorStop(1, darken(pal.accent, 0.6)); g.fillStyle = cg; g.fill();
  });
}
export function hiveSprite(pal, seed, px) {
  const r = new RNG(seed);
  return vec(240, 240, px, (g) => {
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * TAU + r.range(-0.2, 0.2), l = r.range(70, 110);
      g.strokeStyle = darken(pal.neb1, 0.5); g.lineWidth = r.range(8, 14); g.lineCap = 'round';
      g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(Math.cos(a + 0.4) * l * 0.6, Math.sin(a + 0.4) * l * 0.6, Math.cos(a) * l, Math.sin(a) * l); g.stroke();
      g.strokeStyle = rgba(pal.neb2, 0.6); g.lineWidth = 2; g.stroke();
      g.fillStyle = rgba(pal.deco2, 0.9); g.beginPath(); g.arc(Math.cos(a) * l, Math.sin(a) * l, r.range(4, 8), 0, TAU); g.fill();
    }
    const gr = g.createRadialGradient(-12, -12, 4, 0, 0, 56); gr.addColorStop(0, lighten(pal.neb1, 0.3)); gr.addColorStop(0.6, darken(pal.neb1, 0.3)); gr.addColorStop(1, darken(pal.neb1, 0.8));
    g.fillStyle = gr; g.beginPath(); for (let i = 0; i <= 24; i++) { const a = (i / 24) * TAU, rr = 52 + Math.sin(a * 5) * 6; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.closePath(); g.fill();
    g.strokeStyle = rgba(pal.neb2, 0.8); g.lineWidth = 2; g.stroke();
    for (let i = 0; i < 16; i++) { const a = r.next() * TAU, d = r.range(8, 42); g.fillStyle = rgba(pal.deco2, r.range(0.5, 1)); g.beginPath(); g.arc(Math.cos(a) * d, Math.sin(a) * d, r.range(2, 5), 0, TAU); g.fill(); }
  });
}
export function monolithSprite(pal, seed, px) {
  const r = new RNG(seed);
  return vec(220, 260, px, (g) => {
    for (let i = 0; i < 7; i++) {
      const x = r.range(-70, 70), hgt = r.range(80, 220), w = r.range(14, 30);
      g.save(); g.translate(x, 60); g.rotate(r.range(-0.3, 0.3));
      g.beginPath(); g.moveTo(-w / 2, 0); g.lineTo(0, -hgt); g.lineTo(w / 2, 0); g.lineTo(0, w * 0.4); g.closePath();
      const gr = g.createLinearGradient(-w / 2, 0, w / 2, 0); gr.addColorStop(0, darken(pal.deco, 0.7)); gr.addColorStop(0.5, lighten(pal.deco, 0.2)); gr.addColorStop(1, darken(pal.deco, 0.8));
      g.fillStyle = gr; g.fill(); g.strokeStyle = lighten(pal.deco, 0.6); g.lineWidth = 1.4; g.stroke();
      g.strokeStyle = rgba('#ffffff', 0.6); g.lineWidth = 0.8; g.beginPath(); g.moveTo(0, -hgt); g.lineTo(0, w * 0.4); g.stroke();
      g.restore();
    }
  });
}

// ---------- Terrain planétaire en relief ----------
const TERRAIN = {
  coral: { water: 0.5, stops: [[0, '#031a2e'], [0.35, '#07405a'], [0.5, '#138fa0'], [0.53, '#d8cc9e'], [0.6, '#a8986e'], [0.7, '#b84a6a'], [0.82, '#2a6a48'], [1, '#a8dcc8']], wcol: ['#032a44', '#18c8d8'] },
  swamp: { water: 0.45, stops: [[0, '#03110a'], [0.45, '#0c3424'], [0.5, '#3a3a18'], [0.62, '#2f5a22'], [0.8, '#4f8a2e'], [1, '#b8e070']], wcol: ['#061a12', '#3cff9a'] },
  ice: { water: 0.34, stops: [[0, '#06204a'], [0.34, '#1a5aa8'], [0.42, '#6fb8ef'], [0.6, '#bfe6ff'], [0.8, '#e8f6ff'], [1, '#ffffff']], wcol: ['#041838', '#3fa8ff'] },
  lava: { water: 0.3, stops: [[0, '#1a0806'], [0.3, '#2a0f0a'], [0.36, '#3a2420'], [0.6, '#4a3a36'], [0.8, '#6a5c56'], [1, '#a89890']], wcol: ['#ff5a0a', '#fff2a0'], hot: true },
  dunes: { water: 0.3, stops: [[0, '#3a2210'], [0.3, '#5a3a18'], [0.45, '#a8743a'], [0.62, '#dca868'], [0.8, '#f2cc8a'], [1, '#fff0c8']], wcol: ['#0a2a3a', '#4adcff'] },
  mushroom: { water: 0.42, stops: [[0, '#0e0418'], [0.42, '#2a0c3a'], [0.5, '#3e1650'], [0.65, '#5a2a6a'], [0.82, '#7a4a8a'], [1, '#d8b8ff']], wcol: ['#1a0630', '#e86bff'] },
  rock: { water: 0.32, stops: [[0, '#120e0c'], [0.32, '#2a2220'], [0.45, '#4a3e38'], [0.62, '#7a6a5e'], [0.8, '#a8968a'], [1, '#d8cbbf']], wcol: ['#100a08', '#ff7a3a'] },
  flesh: { water: 0.4, stops: [[0, '#1a0208'], [0.4, '#4a0a1c'], [0.5, '#8a1a3a'], [0.66, '#c0405e'], [0.82, '#e07a94'], [1, '#ffd0dc']], wcol: ['#30020a', '#ff3a6a'] },
};

export class Terrain {
  constructor(kind, pal, seed, res, CH, fns) {
    this.kind = TERRAIN[kind] ? kind : 'rock';
    this.T = TERRAIN[this.kind];
    this.pal = pal; this.res = res; this.CH = CH; this.fns = fns;
    this.N = new Noise(seed); this.M = new Noise(seed * 3 + 11);
    const st = this.T.stops.map(([p, c]) => [p, c]);
    // teinte légère selon la palette du monde
    this.ramp = makeRamp(st.map(([p, c]) => [p, mixHex(c, p > this.T.water ? pal.g2 : pal.liquid, 0.12)]));
    this.wramp = makeRamp([[0, this.T.wcol[0]], [1, mixHex(this.T.wcol[1], pal.liquid, 0.25)]]);
    this.w = Math.ceil(400 * res); this.h = Math.ceil(CH * res);
    const r = new RNG(seed);
    this.craters = [];
    if (this.kind === 'rock') for (let i = 0; i < 400; i++) this.craters.push([r.range(0, 400), r.range(0, 40000), r.range(8, 34)]);
  }
  height(X, Y) {
    const N = this.N, s = 1 / 170;
    const wx = N.fbm(X * s * 0.7 + 3.1, Y * s * 0.7, 3), wy = N.fbm(X * s * 0.7 + 7.7, Y * s * 0.7 + 1.3, 3);
    let h = 0.5 + 0.55 * N.fbm(X * s + wx * 0.55, Y * s + wy * 0.55, 5);
    const k = this.kind;
    if (k === 'dunes') h = 0.42 + 0.3 * N.fbm(X * s * 0.6, Y * s * 0.6, 3) + 0.32 * Math.pow(1 - Math.abs(Math.sin(X * 0.045 + Y * 0.016 + wx * 5)), 3);
    else if (k === 'ice') h = 0.55 + 0.45 * (N.ridge(X * s * 1.2, Y * s * 1.2, 4) - 0.55) * 1.4 + 0.15 * wx;
    else if (k === 'lava') h = 0.5 + 0.5 * (N.ridge(X * s, Y * s, 5) - 0.5) * 1.5;
    else if (k === 'rock') { const Yc = ((Y % 40000) + 40000) % 40000; for (const [cx, cy, cr] of this.craters) { const dy = cy - Yc; if (dy > cr * 1.4 || dy < -cr * 1.4) continue; const d = Math.hypot(X - cx, dy) / cr; if (d < 1) h -= 0.22 * (1 - d * d); else if (d < 1.4) h += 0.12 * (1 - (d - 1) / 0.4); } }
    else if (k === 'flesh') h = 0.5 + 0.35 * N.fbm(X * s * 1.3, Y * s * 1.3, 4) + 0.18 * (N.ridge(X * s * 2.5, Y * s * 2.5, 3) - 0.5);
    // canyon : bords relevés
    const f = this.fns;
    const eL = X - f.cliff(Y, 0), eR = (400 - X) - f.cliff(Y, 1);
    h += smooth(12, -8, Math.min(eL, eR)) * 0.55;
    // rivière creusée
    const rd = (X - f.riverX(Y)) / (f.riverW(Y) * 1.25);
    h -= 0.4 * Math.exp(-rd * rd);
    return h;
  }
  makeChunk(k) {
    const cv = makeCanvas(this.w, this.h), g = cv.getContext('2d');
    return { k, cv, g, img: g.createImageData(this.w, this.h), H: new Float32Array((this.w + 1) * (this.h + 2)), hr: 0, row: 0, done: false, lights: [] };
  }
  // Avance la génération ; renvoie true quand le morceau est terminé
  step(ch, budgetMs) {
    const t0 = performance.now();
    const w = this.w, h = this.h, w1 = w + 1, res = this.res, CH = this.CH;
    const Y0 = ch.k * CH;
    while (ch.hr < h + 2) {
      const yy = ch.hr, Y = Y0 + CH - yy / res;
      for (let x = 0; x <= w; x++) ch.H[yy * w1 + x] = this.height(x / res, Y);
      ch.hr++;
      if (ch.hr >= 2) this.shadeRow(ch, ch.hr - 2);
      if (performance.now() - t0 > budgetMs) return false;
    }
    ch.g.putImageData(ch.img, 0, 0);
    ch.done = true;
    return true;
  }
  shadeRow(ch, y) {
    if (y >= this.h) return;
    const w = this.w, w1 = w + 1, D = ch.img.data, H = ch.H, ramp = this.ramp, wr = this.wramp, T = this.T;
    const water = T.water, ex = 22 * this.res * 2.2;
    const M = this.M, res = this.res, Y = ch.k * this.CH + this.CH - y / res;
    for (let x = 0; x < w; x++) {
      const h0 = H[y * w1 + x], hx = H[y * w1 + x + 1] - h0, hy = H[(y + 1) * w1 + x] - h0;
      const i = (y * w + x) * 4;
      if (h0 < water) {
        // liquide : lumineux, légèrement ondulé, sans ombrage
        const depth = clamp((water - h0) / 0.25, 0, 1);
        const shimmer = 0.5 + 0.5 * M.n(x * 0.15, Y * 0.04);
        const t = T.hot ? clamp(1 - depth * 0.7 + shimmer * 0.25, 0, 1) : clamp(0.35 - depth * 0.3 + shimmer * 0.25, 0, 1);
        const ci = ((t * 255) | 0) * 3;
        D[i] = wr[ci]; D[i + 1] = wr[ci + 1]; D[i + 2] = wr[ci + 2]; D[i + 3] = 255;
        continue;
      }
      let nx = -hx * ex, ny = -hy * ex; const l = Math.hypot(nx, ny, 1);
      const dot = (nx * L[0] + ny * L[1] + L[2]) / l;
      const shade = 0.32 + Math.max(0, dot) * 0.95;
      const ci = (clamp(h0, 0, 0.999) * 255 | 0) * 3;
      // liseré de rivage
      const shore = h0 < water + 0.025 ? 1.25 : 1;
      D[i] = Math.min(255, ramp[ci] * shade * shore); D[i + 1] = Math.min(255, ramp[ci + 1] * shade * shore); D[i + 2] = Math.min(255, ramp[ci + 2] * shade * shore); D[i + 3] = 255;
    }
  }
}
