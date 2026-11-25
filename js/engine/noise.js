// Bruit de gradient 2D (type Perlin), fBm, bruit « crêtes » — périodique en Y si besoin.
// Sert à générer les textures de décor (nébuleuses, planètes, relief) pixel par pixel.
import { RNG, hexToRgb, clamp } from './math.js';

export class Noise {
  constructor(seed) {
    const r = new RNG((seed >>> 0) || 1);
    const perm = new Uint8Array(256);
    for (let i = 0; i < 256; i++) perm[i] = i;
    for (let i = 255; i > 0; i--) { const j = Math.floor(r.next() * (i + 1)); const t = perm[i]; perm[i] = perm[j]; perm[j] = t; }
    this.p = new Uint16Array(512);
    for (let i = 0; i < 512; i++) this.p[i] = perm[i & 255];
    this.gx = new Float32Array(256); this.gy = new Float32Array(256);
    for (let i = 0; i < 256; i++) { const a = r.next() * Math.PI * 2; this.gx[i] = Math.cos(a); this.gy[i] = Math.sin(a); }
  }
  n(x, y, py) {
    const p = this.p, gx = this.gx, gy = this.gy;
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    let y0 = yi, y1 = yi + 1;
    if (py) { y0 = ((y0 % py) + py) % py; y1 = y0 + 1 >= py ? 0 : y0 + 1; }
    const X0 = xi & 255, X1 = (xi + 1) & 255, Y0 = y0 & 255, Y1 = y1 & 255;
    const a = p[p[X0] + Y0], b = p[p[X1] + Y0], c = p[p[X0] + Y1], d = p[p[X1] + Y1];
    const va = gx[a] * xf + gy[a] * yf;
    const vb = gx[b] * (xf - 1) + gy[b] * yf;
    const vc = gx[c] * xf + gy[c] * (yf - 1);
    const vd = gx[d] * (xf - 1) + gy[d] * (yf - 1);
    const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10), v = yf * yf * yf * (yf * (yf * 6 - 15) + 10);
    const top = va + (vb - va) * u, bot = vc + (vd - vc) * u;
    return (top + (bot - top) * v) * 1.41;
  }
  fbm(x, y, oct = 5, py = 0) {
    let s = 0, a = 0.5, f = 1, nrm = 0;
    for (let o = 0; o < oct; o++) { s += a * this.n(x * f, y * f, py ? py * f : 0); nrm += a; a *= 0.5; f *= 2; }
    return s / nrm;
  }
  ridge(x, y, oct = 4, py = 0) {
    let s = 0, a = 0.5, f = 1, nrm = 0;
    for (let o = 0; o < oct; o++) { const v = 1 - Math.abs(this.n(x * f, y * f, py ? py * f : 0)); s += a * v * v; nrm += a; a *= 0.5; f *= 2; }
    return s / nrm;
  }
}

// Table de couleurs (256 entrées RGB) à partir de paliers [[pos, '#hex'], ...]
export function makeRamp(stops) {
  const out = new Uint8Array(256 * 3);
  const st = stops.map(([p, c]) => [p, hexToRgb(c)]);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let k = 0;
    while (k < st.length - 2 && t > st[k + 1][0]) k++;
    const [p0, c0] = st[k], [p1, c1] = st[Math.min(k + 1, st.length - 1)];
    const u = p1 > p0 ? clamp((t - p0) / (p1 - p0), 0, 1) : 0;
    out[i * 3] = c0[0] + (c1[0] - c0[0]) * u;
    out[i * 3 + 1] = c0[1] + (c1[1] - c0[1]) * u;
    out[i * 3 + 2] = c0[2] + (c1[2] - c0[2]) * u;
  }
  return out;
}
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
