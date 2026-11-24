// Utilitaires : maths, aléatoire déterministe, couleurs, formatage
export const TAU = Math.PI * 2;
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
export const randi = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
export const pick = (arr) => arr[(Math.random() * arr.length) | 0];
export const chance = (p) => Math.random() < p;
export const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
export const dist2 = (ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay; return dx * dx + dy * dy; };
export const angTo = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax);
export function angDiff(a, b) { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; else if (d < -Math.PI) d += TAU; return d; }
export const approach = (v, t, s) => (v < t ? Math.min(t, v + s) : Math.max(t, v - s));
export const damp = (a, b, k, dt) => b + (a - b) * Math.exp(-k * dt);

export const ease = {
  outCubic: (t) => 1 - (1 - t) ** 3,
  inCubic: (t) => t * t * t,
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  outBack: (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2; },
  outElastic: (t) => (t === 0 ? 0 : t === 1 ? 1 : 2 ** (-10 * t) * Math.sin((t * 10 - 0.75) * (TAU / 3)) + 1),
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
};

export function hash32(...args) {
  let h = 2166136261 >>> 0;
  for (const a of args) {
    let v = (a | 0) >>> 0;
    for (let i = 0; i < 4; i++) { h ^= v & 255; h = Math.imul(h, 16777619); v >>>= 8; }
  }
  h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15;
  return h >>> 0;
}

export class RNG {
  constructor(seed = 1) { this.s = (seed >>> 0) || 1; }
  next() {
    let t = (this.s = (this.s + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  range(a, b) { return a + this.next() * (b - a); }
  int(a, b) { return Math.floor(a + this.next() * (b - a + 1)); }
  pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
  chance(p) { return this.next() < p; }
  weighted(items, w) {
    let tot = 0; for (const it of items) tot += w(it);
    let r = this.next() * tot;
    for (const it of items) { r -= w(it); if (r <= 0) return it; }
    return items[items.length - 1];
  }
  shuffle(arr) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(this.next() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }
}

// ---------- Couleurs ----------
const rgbCache = new Map();
export function hexToRgb(hex) {
  let c = rgbCache.get(hex);
  if (c) return c;
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((x) => x + x).join('');
  const n = parseInt(h, 16);
  c = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  rgbCache.set(hex, c);
  return c;
}
const rgbaCache = new Map();
export function rgba(hex, a) {
  const k = hex + '|' + ((a * 100) | 0);
  let s = rgbaCache.get(k);
  if (s) return s;
  const [r, g, b] = hexToRgb(hex);
  s = `rgba(${r},${g},${b},${((a * 100) | 0) / 100})`;
  if (rgbaCache.size > 4000) rgbaCache.clear();
  rgbaCache.set(k, s);
  return s;
}
const toHex = (v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0');
export function rgbHex(r, g, b) { return '#' + toHex(r) + toHex(g) + toHex(b); }
export function hslHex(h, s, l) {
  h = ((h % 360) + 360) % 360; s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return rgbHex(f(0) * 255, f(8) * 255, f(4) * 255);
}
export function mixHex(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return rgbHex(lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t));
}
export const lighten = (hex, t) => mixHex(hex, '#ffffff', t);
export const darken = (hex, t) => mixHex(hex, '#000000', t);
export function hueOf(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  if (mx === mn) return 0;
  const d = mx - mn;
  let h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return h * 60;
}

// ---------- Formatage ----------
export function fmt(n) {
  n = Math.floor(n);
  if (n < 100000) return n.toLocaleString('fr-FR').replace(/ | /g, ' ');
  if (n < 10000000) return (n / 1000).toFixed(n < 1000000 ? 0 : 0).replace('.', ',') + ' k';
  return (n / 1e6).toFixed(1).replace('.', ',') + ' M';
}
export function dayNumber(d = new Date()) {
  // jour local (minuit local) depuis l'epoch
  return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000);
}
