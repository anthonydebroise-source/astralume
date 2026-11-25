// Sculpteur : rendu « 3D » pré-calculé pour les gros sprites (boss, vaisseaux, logo).
// On peint des calques avec l'API Canvas 2D (couleur, relief, matière, émission), puis un
// éclairage par pixel (normales tirées du relief, lumière principale + reflets d'environnement
// pour le métal/chrome, liseré coloré, occlusion ambiante) produit une image finale.
import { makeCanvas } from './sprites.js';
import { hexToRgb, clamp, RNG } from './math.js';
import { Noise } from './noise.js';

// matières : [spéculaire, brillance, métal, enveloppe (lumière diffuse douce)]
export const MAT = {
  metal: [0.55, 30, 0.72, 0.1],     // acier canon de fusil
  steel: [0.7, 46, 0.85, 0.05],
  chrome: [1.0, 90, 1.0, 0],
  gold: [0.9, 54, 1.0, 0],
  gloss: [0.85, 70, 0.12, 0.2],     // laque / carapace vernie
  flesh: [0.55, 26, 0, 0.45],       // chair humide
  matte: [0.12, 8, 0, 0.3],
  glass: [1.0, 120, 0.35, 0.1],
  rubber: [0.25, 14, 0, 0.2],
};

// ---------- Bruit en tuile (relief organique) ----------
const NT = 256;
let tile = null;
function noiseTile() {
  if (tile) return tile;
  const N = new Noise(7331), T = NT, out = new Float32Array(T * T), F = 8 / T;
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    const s = x / T, t = y / T;
    const f = (a, b) => N.fbm(a * F, b * F, 4);
    out[y * T + x] = f(x, y) * (1 - s) * (1 - t) + f(x - T, y) * s * (1 - t) + f(x, y - T) * (1 - s) * t + f(x - T, y - T) * s * t;
  }
  return (tile = out);
}

// ---------- Environnement (reflets du métal) ----------
// Studio : ciel froid lumineux en haut, bande d'horizon très claire, sol sombre et chaud.
let envLUT = null, envKey = '';
function makeEnv(sky, ground, band) {
  const k = sky + ground + band;
  if (envLUT && envKey === k) return envLUT;
  const S = hexToRgb(sky), G = hexToRgb(ground), B = hexToRgb(band), n = 64, lut = new Float32Array(n * n * 3);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const rx = (i / (n - 1)) * 2 - 1, ry = (j / (n - 1)) * 2 - 1; // ry < 0 : vers le haut
    let r, g, b;
    if (ry < -0.08) { const u = clamp((-ry - 0.08) / 0.9, 0, 1); const k2 = 0.55 + 0.75 * (1 - u) * (1 - u); r = S[0] * k2; g = S[1] * k2; b = S[2] * k2; }
    else if (ry < 0.06) { const u = 1 - Math.abs(ry + 0.01) / 0.07; const k2 = 1.1 + u * 0.9; r = B[0] * k2; g = B[1] * k2; b = B[2] * k2; }
    else { const u = clamp((ry - 0.06) / 0.9, 0, 1); const k2 = 0.55 * (1 - u) + 0.2; r = G[0] * k2 + 70 * (1 - u) * 0.5; g = G[1] * k2 + 74 * (1 - u) * 0.5; b = G[2] * k2 + 84 * (1 - u) * 0.5; }
    // fenêtres de studio (deux softbox) pour des reflets francs
    const sb = Math.exp(-(((rx + 0.45) / 0.16) ** 2) - (((ry + 0.5) / 0.22) ** 2)) * 1.6 + Math.exp(-(((rx - 0.62) / 0.1) ** 2) - (((ry + 0.25) / 0.3) ** 2)) * 0.8
      + Math.exp(-(((rx - 0.2) / 0.5) ** 2) - (((ry - 0.62) / 0.12) ** 2)) * 0.45; // réflecteur bas
    const o = (j * n + i) * 3;
    lut[o] = r / 255 + sb; lut[o + 1] = g / 255 + sb; lut[o + 2] = b / 255 + sb;
  }
  envKey = k;
  return (envLUT = lut);
}

// ---------- Flou boîte séparable ----------
function boxBlur(src, W, H, r, tmp) {
  if (r < 1) return src.slice();
  const out = new Float32Array(W * H), inv = 1 / (2 * r + 1);
  for (let y = 0; y < H; y++) {
    const o = y * W; let acc = 0;
    for (let k = -r; k <= r; k++) acc += src[o + clamp(k, 0, W - 1)];
    for (let x = 0; x < W; x++) {
      tmp[o + x] = acc * inv;
      acc += src[o + Math.min(W - 1, x + r + 1)] - src[o + Math.max(0, x - r)];
    }
  }
  for (let x = 0; x < W; x++) {
    let acc = 0;
    for (let k = -r; k <= r; k++) acc += tmp[clamp(k, 0, H - 1) * W + x];
    for (let y = 0; y < H; y++) {
      out[y * W + x] = acc * inv;
      acc += tmp[Math.min(H - 1, y + r + 1) * W + x] - tmp[Math.max(0, y - r) * W + x];
    }
  }
  return out;
}
function blur2(src, W, H, r) { const tmp = new Float32Array(W * H); return boxBlur(boxBlur(src, W, H, r, tmp), W, H, Math.max(1, Math.round(r * 0.7)), tmp); }

// ---------- Sculpteur ----------
// w, h : taille en unités ; (ox, oy) : position de l'origine dans le cadre ; px : pixels par unité
export class Sculptor {
  constructor(w, h, px, o = {}) {
    this.w = w; this.h = h; this.px = px;
    this.ox = o.ox ?? w / 2; this.oy = o.oy ?? h / 2;
    this.depth = o.depth ?? 10;          // relief total (unités) pour h = 1
    this.bevel = o.bevel ?? 1.1;         // arrondi des arêtes (unités)
    this.rim = o.rim || '#7fd8ff';       // couleur du liseré
    this.rimK = o.rimK ?? 0.9;
    this.key = o.key || '#fff4e8';
    this.amb = o.amb ?? 0.3;
    this.env = o.env || ['#9fc4ff', '#2a1c18', '#ffffff'];
    this.outline = o.outline ?? 1;       // contour sombre (unités)
    this.ao = o.ao ?? 1;
    this.W = Math.max(2, Math.ceil(w * px)); this.H = Math.max(2, Math.ceil(h * px));
    const mk = () => { const c = makeCanvas(this.W, this.H); const g = c.getContext('2d'); g.setTransform(px, 0, 0, px, this.ox * px, this.oy * px); g.lineJoin = 'round'; g.lineCap = 'round'; return [c, g]; };
    [this.ac, this.a] = mk();   // couleur (alpha = couverture)
    [this.hc, this.hg] = mk();  // relief (R)
    [this.mc, this.m] = mk();   // matière : R = spéculaire, G = brillance/2, B = métal
    [this.xc, this.x] = mk();   // R = grain organique, G = enveloppe
    [this.ec, this.e] = mk();   // émission (ajoutée après éclairage)
    this.hg.fillStyle = '#000'; this.hg.fillRect(-this.ox, -this.oy, w, h);
    this.rng = new RNG(o.seed || 1);
  }
  // ----- couleurs de relief (niveaux de gris) -----
  hv(v) { const k = Math.round(clamp(v, 0, 1) * 255); return `rgb(${k},${k},${k})`; }
  hRad(cx, cy, r, h0, h1, r0 = 0) { const gr = this.hg.createRadialGradient(cx, cy, r0, cx, cy, r); gr.addColorStop(0, this.hv(h0)); gr.addColorStop(1, this.hv(h1)); return gr; }
  // dôme (profil arrondi) : plusieurs paliers pour une courbure réaliste
  hDome(cx, cy, r, h0, h1, sy = 1) {
    const g = this.hg, gr = g.createRadialGradient(cx, cy, 0, cx, cy, r);
    for (let i = 0; i <= 8; i++) { const u = i / 8; gr.addColorStop(u, this.hv(h1 + (h0 - h1) * Math.sqrt(Math.max(0, 1 - u * u)))); }
    return gr;
  }
  hDomeE(cx, cy, rx, ry, h0, h1) { const k = ry / rx; return { s: this.hDome(cx, cy, rx, h0, h1), t: [1, 0, 0, k, 0, cy * (1 - k)] }; }
  hLin(x0, y0, x1, y1, h0, h1) { const gr = this.hg.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, this.hv(h0)); gr.addColorStop(1, this.hv(h1)); return gr; }
  // profil cylindrique : bords à he, milieu à hc (de (x0,y0) à (x1,y1))
  hCyl(x0, y0, x1, y1, hc, he) {
    const gr = this.hg.createLinearGradient(x0, y0, x1, y1);
    for (let i = 0; i <= 10; i++) { const u = i / 10, d = Math.abs(u * 2 - 1); gr.addColorStop(u, this.hv(he + (hc - he) * Math.sqrt(Math.max(0, 1 - d * d)))); }
    return gr;
  }
  // ----- peinture d'une forme sur tous les calques -----
  // o : { c: couleur|dégradé|fn(g), h: nombre|fn(S)|dégradé, hm: 'set'|'add'|'sub', mat, bump, emi, ea, a }
  paint(path, o) {
    const { a, hg, m, x, e } = this;
    const run = (g, style, op = 'source-over', alpha = 1) => { g.save(); g.globalCompositeOperation = op; g.globalAlpha = alpha; g.fillStyle = style; g.beginPath(); path(g); g.fill(o.rule || 'nonzero'); g.restore(); };
    if (o.c !== undefined) run(a, typeof o.c === 'function' ? o.c(a) : o.c, 'source-over', o.a ?? 1);
    if (o.h !== undefined) {
      let hs = o.h;
      if (typeof hs === 'number') hs = this.hv(hs);
      else if (typeof hs === 'function') hs = hs(this);
      const op = o.hm === 'add' ? 'lighter' : o.hm === 'sub' ? 'difference' : 'source-over';
      if (hs && hs.t) { // dégradé déformé (dôme elliptique)
        hg.save(); hg.globalCompositeOperation = op; hg.globalAlpha = o.ha ?? 1; hg.beginPath(); path(hg); hg.transform(...hs.t); hg.fillStyle = hs.s; hg.fill(o.rule || 'nonzero'); hg.restore();
      } else run(hg, hs, op, o.ha ?? 1);
    }
    const mt = MAT[o.mat || 'metal'];
    if (o.c !== undefined || o.mat) run(m, `rgb(${Math.round(mt[0] * 255)},${Math.round(clamp(mt[1] / 2, 0, 255))},${Math.round(mt[2] * 255)})`);
    if (o.c !== undefined || o.mat || o.bump !== undefined) run(x, `rgb(${Math.round(clamp(o.bump ?? 0, 0, 1) * 255)},${Math.round(mt[3] * 255)},0)`);
    if (o.emi) run(e, o.emi, 'lighter', o.ea ?? 1);
    return this;
  }
  // trait (rainure, nervure, liseré)
  stroke(path, o) {
    const { a, hg, m, x, e } = this;
    const run = (g, style, w, op = 'source-over', alpha = 1) => { g.save(); g.globalCompositeOperation = op; g.globalAlpha = alpha; g.strokeStyle = style; g.lineWidth = w; g.beginPath(); path(g); g.stroke(); g.restore(); };
    const w = o.w || 1;
    if (o.c !== undefined) run(a, o.c, w, 'source-over', o.a ?? 1);
    if (o.h !== undefined) run(hg, this.hv(Math.abs(o.h)), w * (o.hw || 1), o.h < 0 ? 'difference' : o.hm === 'set' ? 'source-over' : 'lighter');
    if (o.mat) { const mt = MAT[o.mat]; run(m, `rgb(${Math.round(mt[0] * 255)},${Math.round(mt[1] / 2)},${Math.round(mt[2] * 255)})`, w); run(x, `rgb(0,${Math.round(mt[3] * 255)},0)`, w); }
    if (o.emi) run(e, o.emi, o.ew || w, 'lighter', o.ea ?? 1);
    return this;
  }
  // limite les dessins de fn à l'intérieur d'une forme (sur tous les calques)
  within(path, fn) {
    const gs = [this.a, this.hg, this.m, this.x, this.e];
    for (const g of gs) { g.save(); g.beginPath(); path(g); g.clip(); }
    fn(this);
    for (const g of gs) g.restore();
    return this;
  }
  // rainures de panneaux (dans le relief + légère ombre de couleur)
  grooves(segs, w = 0.6, d = 0.08) {
    this.stroke((g) => { for (const s of segs) { g.moveTo(s[0], s[1]); for (let i = 2; i < s.length; i += 2) g.lineTo(s[i], s[i + 1]); } }, { h: -d, w, c: 'rgba(0,0,0,0.35)' });
    return this;
  }
  rivets(pts, r = 0.7, col = '#c8ccd8') {
    for (const [px, py] of pts) this.paint((g) => g.arc(px, py, r, 0, Math.PI * 2), { c: col, h: (S) => S.hRad(px, py, r, 0.12, 0), hm: 'add', mat: 'steel' });
    return this;
  }
  // lumière (émission pure, avec halo)
  light(path, col, blur = 0, alpha = 1) {
    const g = this.e;
    g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = alpha; g.fillStyle = col;
    if (blur) { g.shadowColor = col; g.shadowBlur = blur * this.px; }
    g.beginPath(); path(g); g.fill(); g.restore();
    return this;
  }
  // ----- éclairage -----
  bake() {
    const { W, H, px } = this;
    const A = this.a.getImageData(0, 0, W, H).data;
    const Hd = this.hg.getImageData(0, 0, W, H).data;
    const M = this.m.getImageData(0, 0, W, H).data;
    const X = this.x.getImageData(0, 0, W, H).data;
    const E = this.e.getImageData(0, 0, W, H).data;
    const N = W * H;
    const T = noiseTile(), ns = 6.5 / px; // échelle : ~6,5 cases de tuile par unité
    const raw = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      let hv = Hd[i * 4] / 255;
      const bm = X[i * 4];
      if (bm) {
        const xx = (i % W) * ns, yy = ((i / W) | 0) * ns;
        const x0 = xx | 0, y0 = yy | 0, fx = xx - x0, fy = yy - y0;
        const a0 = (y0 & 255) * NT, a1 = ((y0 + 1) & 255) * NT, b0 = x0 & 255, b1 = (x0 + 1) & 255;
        const nv = (T[a0 + b0] * (1 - fx) + T[a0 + b1] * fx) * (1 - fy) + (T[a1 + b0] * (1 - fx) + T[a1 + b1] * fx) * fy;
        hv += nv * (bm / 255) * 0.09;
      }
      raw[i] = hv;
    }
    const Hn = blur2(raw, W, H, Math.max(1, Math.round(this.bevel * px * 0.6)));
    const Ha = this.ao ? blur2(raw, W, H, Math.max(2, Math.round(4.5 * px))) : null;
    const out = new ImageData(W, H), O = out.data;
    const K = (this.depth * px) / 2;
    let Lx = -0.42, Ly = -0.62, Lz = 0.66; { const l = Math.hypot(Lx, Ly, Lz); Lx /= l; Ly /= l; Lz /= l; }
    let Hx = Lx, Hy = Ly, Hz = Lz + 1; { const l = Math.hypot(Hx, Hy, Hz); Hx /= l; Hy /= l; Hz /= l; }
    const key = hexToRgb(this.key).map((v) => v / 255), rim = hexToRgb(this.rim).map((v) => v / 255);
    const env = makeEnv(...this.env), amb = this.amb, rimK = this.rimK;
    for (let y = 0; y < H; y++) {
      const ym = y > 0 ? -W : 0, yp = y < H - 1 ? W : 0;
      for (let x = 0; x < W; x++) {
        const i = y * W + x, o4 = i * 4;
        const al = A[o4 + 3], ea = E[o4 + 3];
        if (al === 0 && ea === 0) continue;
        let r = 0, g = 0, b = 0;
        if (al) {
          const xm = x > 0 ? -1 : 0, xp = x < W - 1 ? 1 : 0;
          let nx = (Hn[i + xm] - Hn[i + xp]) * K, ny = (Hn[i + ym] - Hn[i + yp]) * K, nz = 1;
          const il = 1 / Math.sqrt(nx * nx + ny * ny + 1); nx *= il; ny *= il; nz *= il;
          const cr = A[o4] / 255, cg = A[o4 + 1] / 255, cb = A[o4 + 2] / 255;
          const spI = M[o4] / 255, gl = Math.max(2, M[o4 + 1] * 2), mt = M[o4 + 2] / 255, wrap = X[o4 + 1] / 255;
          const ndl = nx * Lx + ny * Ly + nz * Lz;
          const dif = Math.max(0, (ndl + wrap) / (1 + wrap));
          const ndh = Math.max(0, nx * Hx + ny * Hy + nz * Hz);
          const sp = spI * Math.pow(ndh, gl) * (1 + gl * 0.012);
          let ao = 1;
          if (Ha) ao = clamp(1 - Math.max(0, Ha[i] - Hn[i]) * 3.2 * this.ao, 0.3, 1);
          // hémisphère : ciel en haut, sol en bas
          const hemi = amb * (0.75 - ny * 0.35);
          // reflet d'environnement
          const rx = 2 * nz * nx, ry = 2 * nz * ny;
          const ei = ((clamp(((ry + 1) * 31.5) | 0, 0, 63)) * 64 + clamp(((rx + 1) * 31.5) | 0, 0, 63)) * 3;
          const fres = 0.25 + 0.75 * Math.pow(1 - nz, 3);
          const df = (1 - mt);
          r = cr * ((hemi + dif * key[0]) * df + env[ei] * mt * 1.15) * ao;
          g = cg * ((hemi + dif * key[1]) * df + env[ei + 1] * mt * 1.15) * ao;
          b = cb * ((hemi + dif * key[2]) * df + env[ei + 2] * mt * 1.15) * ao;
          // vernis : reflet d'environnement non teinté sur les matières brillantes
          if (mt < 0.5 && spI > 0.5) { const k = fres * spI * 0.35 * (1 - mt); r += env[ei] * k; g += env[ei + 1] * k; b += env[ei + 2] * k; }
          // spéculaire (teinté pour le métal)
          const st = sp * (mt > 0.5 ? 0.6 : 1);
          r += st * (mt > 0.5 ? 0.5 + cr * 0.7 : 1) * key[0];
          g += st * (mt > 0.5 ? 0.5 + cg * 0.7 : 1) * key[1];
          b += st * (mt > 0.5 ? 0.5 + cb * 0.7 : 1) * key[2];
          // liseré coloré (contre-jour) en bas à droite + liseré froid en haut
          const edge = (1 - nz) * (1 - nz);
          const rk = edge * (Math.max(0, nx * 0.55 + ny * 0.8) * rimK * 1.6 + Math.max(0, -ny) * 0.25);
          r += rim[0] * rk; g += rim[1] * rk; b += rim[2] * rk;
        }
        // émission
        if (ea) { const k = ea / 255; r = r * (al / 255) + (E[o4] / 255) * k; g = g * (al / 255) + (E[o4 + 1] / 255) * k; b = b * (al / 255) + (E[o4 + 2] / 255) * k; }
        const aa = Math.max(al, ea);
        const inv = ea ? 255 / aa : 1; // repasser en non prémultiplié si émission
        // compression douce des hautes lumières
        r = r > 0.85 ? 0.85 + (r - 0.85) / (1 + (r - 0.85) * 2.2) : r;
        g = g > 0.85 ? 0.85 + (g - 0.85) / (1 + (g - 0.85) * 2.2) : g;
        b = b > 0.85 ? 0.85 + (b - 0.85) / (1 + (b - 0.85) * 2.2) : b;
        O[o4] = clamp(r * 255 * (ea ? inv : 1), 0, 255);
        O[o4 + 1] = clamp(g * 255 * (ea ? inv : 1), 0, 255);
        O[o4 + 2] = clamp(b * 255 * (ea ? inv : 1), 0, 255);
        O[o4 + 3] = aa;
      }
    }
    const cv = makeCanvas(W, H);
    const c = cv.getContext('2d');
    if (this.outline > 0) {
      // contour sombre : silhouette décalée dans 8 directions
      const sil = makeCanvas(W, H), s = sil.getContext('2d');
      s.drawImage(this.ac, 0, 0); s.globalCompositeOperation = 'source-in'; s.fillStyle = '#05040a'; s.fillRect(0, 0, W, H);
      const d = this.outline * px;
      for (let k = 0; k < 8; k++) { const an = (k / 8) * Math.PI * 2; c.drawImage(sil, Math.cos(an) * d, Math.sin(an) * d); }
    }
    const lit = makeCanvas(W, H); lit.getContext('2d').putImageData(out, 0, 0);
    c.drawImage(lit, 0, 0);
    // halo des lumières (flou par réduction) pour un « bloom » animable
    let bloom = null;
    if (this.bloom !== false) {
      let any = false; for (let i = 3; i < E.length; i += 16) if (E[i]) { any = true; break; }
      if (any) {
        const k = 4, bw = Math.max(2, Math.ceil(W / k)), bh = Math.max(2, Math.ceil(H / k));
        const sm = makeCanvas(bw, bh), sg = sm.getContext('2d');
        sg.imageSmoothingQuality = 'high'; sg.drawImage(this.ec, 0, 0, bw, bh);
        const sm2 = makeCanvas(bw, bh), s2 = sm2.getContext('2d');
        for (const [dx, dy, a] of [[0, 0, 0.5], [1.5, 0, 0.35], [-1.5, 0, 0.35], [0, 1.5, 0.35], [0, -1.5, 0.35], [3, 3, 0.2], [-3, -3, 0.2], [3, -3, 0.2], [-3, 3, 0.2]]) { s2.globalAlpha = a; s2.globalCompositeOperation = 'lighter'; s2.drawImage(sm, dx, dy); }
        bloom = sm2;
      }
    }
    return { cv, bloom, w: this.w, h: this.h, ox: this.ox, oy: this.oy, px };
  }
}

// dessine un sprite sculpté (origine au point (x, y) du repère courant)
export function drawSculpt(c, s, x = 0, y = 0, sc = 1) {
  c.drawImage(s.cv, x - s.ox * sc, y - s.oy * sc, s.w * sc, s.h * sc);
}
// halo additif des lumières (à appeler en mode 'lighter')
export function drawBloom(c, s, a = 1, x = 0, y = 0, sc = 1) {
  if (!s.bloom || a <= 0) return;
  const ga = c.globalAlpha; c.globalAlpha = ga * Math.min(1, a);
  c.drawImage(s.bloom, x - s.ox * sc, y - s.oy * sc, s.w * sc, s.h * sc);
  c.globalAlpha = ga;
}

// silhouette blanche (pour les flashs d'impact)
export function whiteOf(s) {
  if (s.white) return s.white;
  const cv = makeCanvas(s.cv.width, s.cv.height), g = cv.getContext('2d');
  g.drawImage(s.cv, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#ffffff'; g.fillRect(0, 0, cv.width, cv.height);
  s.white = cv;
  return cv;
}
