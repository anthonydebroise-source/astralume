// Mini moteur 3D (WebGL 2) : on modélise en code (surfaces, révolutions, tubes, extrusions, gemmes),
// on éclaire comme en studio (or, chrome, laque, verre, chair translucide), puis on « cuit » une image
// compatible avec drawSculpt/drawBloom. Rendu fait une seule fois, puis simple image en jeu.
import { makeCanvas } from './sprites.js';

// ---------- Couleurs ----------
export function rgb(hex) {
  if (Array.isArray(hex)) return hex;
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  const s = (v) => Math.pow(v / 255, 2.2); // vers linéaire
  return [s((n >> 16) & 255), s((n >> 8) & 255), s(n & 255)];
}
export const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const mulc = (a, k) => [a[0] * k, a[1] * k, a[2] * k];

// ---------- Matériaux ----------
// col : couleur (hex, tableau linéaire ou fonction (p, u, v) => tableau)
const MATS = {
  gold: { metal: 1, rough: 0.22 }, chrome: { metal: 1, rough: 0.08 }, steel: { metal: 0.85, rough: 0.32 }, gunmetal: { metal: 0.7, rough: 0.42 },
  lacquer: { metal: 0, rough: 0.16, coat: 1 }, plastic: { metal: 0, rough: 0.4 }, matte: { metal: 0, rough: 0.85 },
  glass: { metal: 0.15, rough: 0.04, coat: 1 }, gem: { metal: 0.35, rough: 0.05, coat: 1 }, flesh: { metal: 0, rough: 0.5, sss: 0.65 },
  chitin: { metal: 0.1, rough: 0.28, coat: 0.6 }, jelly: { metal: 0, rough: 0.2, sss: 0.9, coat: 1 }, wood: { metal: 0, rough: 0.7 },
  emissive: { metal: 0, rough: 0.5, emi: 1.4 },
};
export function mat(kind, col, o = {}) {
  const b = MATS[kind] || MATS.plastic;
  return { col: typeof col === 'function' ? col : rgb(col), metal: o.metal ?? b.metal, rough: o.rough ?? b.rough, emi: o.emi ?? b.emi ?? 0, sss: o.sss ?? b.sss ?? 0, coat: o.coat ?? b.coat ?? 0, bump: o.bump ?? 0, freq: o.freq ?? 1, flat: !!o.flat };
}

// ---------- Maillage (triangles non indexés) ----------
export class Mesh {
  constructor() { this.P = []; this.N = []; this.C = []; this.A = []; this.X = []; this.n = 0; }
  v(p, nr, c, m) {
    this.P.push(p[0], p[1], p[2]); this.N.push(nr[0], nr[1], nr[2]); this.C.push(c[0], c[1], c[2]);
    this.A.push(m.metal, m.rough, m.emi, m.coat); this.X.push(m.bump, m.freq, m.sss, 0); this.n++;
  }
  tri(a, b, c, na, nb, nc, ca, cb, cc, m) {
    if (m.flat) { const fn = norm(cross(sub(b, a), sub(c, a))); na = nb = nc = fn; }
    this.v(a, na, ca, m); this.v(b, nb, cb, m); this.v(c, nc, cc, m);
  }
  add(src, xf) { // copie un sous-maillage avec transformation { t, r: [rx, ry, rz], s }
    const T = xform(xf);
    for (let i = 0; i < src.n; i++) {
      const p = T.p([src.P[i * 3], src.P[i * 3 + 1], src.P[i * 3 + 2]]), nn = T.n([src.N[i * 3], src.N[i * 3 + 1], src.N[i * 3 + 2]]);
      this.P.push(p[0], p[1], p[2]); this.N.push(nn[0], nn[1], nn[2]);
      for (let k = 0; k < 3; k++) this.C.push(src.C[i * 3 + k]);
      for (let k = 0; k < 4; k++) { this.A.push(src.A[i * 4 + k]); this.X.push(src.X[i * 4 + k]); }
      this.n++;
    }
    return this;
  }
}
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
function norm(a) { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
function rotM(r) {
  const [x, y, z] = r || [0, 0, 0], cx = Math.cos(x), sx = Math.sin(x), cy = Math.cos(y), sy = Math.sin(y), cz = Math.cos(z), sz = Math.sin(z);
  // R = Rz * Ry * Rx
  return [cz * cy, cz * sy * sx - sz * cx, cz * sy * cx + sz * sx, sz * cy, sz * sy * sx + cz * cx, sz * sy * cx - cz * sx, -sy, cy * sx, cy * cx];
}
const mv = (M, p) => [M[0] * p[0] + M[1] * p[1] + M[2] * p[2], M[3] * p[0] + M[4] * p[1] + M[5] * p[2], M[6] * p[0] + M[7] * p[1] + M[8] * p[2]];
function xform(xf = {}) {
  const t = xf.t || [0, 0, 0], s = typeof xf.s === 'number' ? [xf.s, xf.s, xf.s] : xf.s || [1, 1, 1], R = rotM(xf.r);
  return { p: (p) => { const q = mv(R, [p[0] * s[0], p[1] * s[1], p[2] * s[2]]); return [q[0] + t[0], q[1] + t[1], q[2] + t[2]]; }, n: (n) => norm(mv(R, [n[0] / s[0], n[1] / s[1], n[2] / s[2]])) };
}
const colAt = (m, p, u, v) => (typeof m.col === 'function' ? m.col(p, u, v) : m.col);

// Surface paramétrique fn(u, v) -> [x, y, z] (u, v dans [0, 1]) ; normales exactes par différences finies
export function surface(fn, nu, nv, m, o = {}) {
  const G = new Mesh(), e = 1e-3, P = [], Nn = [], Cc = [];
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
    const u = i / nu, v = j / nv, p = fn(u, v);
    const du = sub(fn(Math.min(1, u + e), v), fn(Math.max(0, u - e), v)), dv = sub(fn(u, Math.min(1, v + e)), fn(u, Math.max(0, v - e)));
    let n = norm(cross(du, dv)); if (o.flip) n = [-n[0], -n[1], -n[2]];
    if (!isFinite(n[0]) || (n[0] === 0 && n[1] === 0 && n[2] === 0)) n = [0, 0, 1];
    P.push(p); Nn.push(n); Cc.push(colAt(m, p, u, v));
  }
  const id = (i, j) => j * (nu + 1) + i;
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = id(i, j), b = id(i + 1, j), c = id(i + 1, j + 1), d = id(i, j + 1);
    G.tri(P[a], P[b], P[c], Nn[a], Nn[b], Nn[c], Cc[a], Cc[b], Cc[c], m);
    G.tri(P[a], P[c], P[d], Nn[a], Nn[c], Nn[d], Cc[a], Cc[c], Cc[d], m);
  }
  return G;
}
// Superquadrique (sphère e=1, boîte arrondie e≈0.2, cylindre e1≈0.2 e2=1)
export function superq(rx, ry, rz, e1, e2, m, o = {}) {
  const sp = (w, e) => Math.sign(w) * Math.pow(Math.abs(w), e);
  const f = o.f || ((p) => p);
  return surface((u, v) => {
    const th = -Math.PI / 2 + v * Math.PI, ph = -Math.PI + u * 2 * Math.PI;
    const cv = Math.cos(th), sv = Math.sin(th);
    return f([rx * sp(cv, e1) * sp(Math.cos(ph), e2), ry * sp(cv, e1) * sp(Math.sin(ph), e2), rz * sp(sv, e1)], u, v);
  }, o.nu || 40, o.nv || 24, m, { flip: true });
}
export const sphere = (r, m, o = {}) => superq(r, r, r, 1, 1, m, o);
export const rbox = (w, h, d, round, m, o = {}) => superq(w / 2, h / 2, d / 2, round, round, m, o);
// Révolution d'un profil [[rayon, z], ...] autour de l'axe z (vers la caméra)
export function lathe(prof, m, o = {}) {
  const seg = o.seg || 40, n = prof.length - 1;
  const at = (t) => { const f = t * n, i = Math.min(n - 1, Math.floor(f)), k = f - i, a = prof[i], b = prof[i + 1]; return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]; };
  const sx = o.sx || 1, sy = o.sy || 1;
  return surface((u, v) => { const [r, z] = at(v), a = u * Math.PI * 2 + (o.a0 || 0); return [Math.cos(a) * r * sx, Math.sin(a) * r * sy, z]; }, seg, o.nv || n * 6, m, { flip: o.flip });
}
// Tube le long d'un chemin path(t) -> [x, y, z], rayon rad(t)
export function tube(path, rad, m, o = {}) {
  const nA = o.nA || 40, nR = o.nR || 16, fr = [];
  let prevN = null;
  for (let i = 0; i <= nA; i++) {
    const t = i / nA, p = path(t), q = path(Math.min(1, t + 1e-3)), q0 = path(Math.max(0, t - 1e-3));
    const T = norm(sub(q, q0));
    let N = prevN ? sub(prevN, mulc(T, dot(prevN, T))) : Math.abs(T[2]) < 0.9 ? cross(T, [0, 0, 1]) : cross(T, [1, 0, 0]);
    N = norm(N); const B = norm(cross(T, N)); prevN = N;
    fr.push({ p, N, B });
  }
  const pt = (u, v) => { const i = Math.round(v * nA), F = fr[i], a = u * Math.PI * 2, r = rad(v, u); return [F.p[0] + (F.N[0] * Math.cos(a) + F.B[0] * Math.sin(a)) * r, F.p[1] + (F.N[1] * Math.cos(a) + F.B[1] * Math.sin(a)) * r, F.p[2] + (F.N[2] * Math.cos(a) + F.B[2] * Math.sin(a)) * r]; };
  return surface(pt, nR, nA, m, { flip: o.flip });
}
// Extrusion d'un contour 2D (x, y) entre z0 et z1, avec biseau arrondi
export function extrude(pts, z0, z1, m, o = {}) {
  const G = new Mesh(), bev = o.bevel ?? Math.min(1.2, (z1 - z0) * 0.35);
  let area = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; area += a[0] * b[1] - b[0] * a[1]; }
  const P = area < 0 ? pts.slice().reverse() : pts.slice();
  const n = P.length, edgeN = [];
  for (let i = 0; i < n; i++) { const a = P[(i - 1 + n) % n], b = P[i], c = P[(i + 1) % n]; const e1 = norm([b[1] - a[1], -(b[0] - a[0]), 0]), e2 = norm([c[1] - b[1], -(c[0] - b[0]), 0]); edgeN.push(o.sharp ? null : norm([e1[0] + e2[0], e1[1] + e2[1], 0])); }
  // flancs : bande biseautée (3 anneaux)
  const ring = [[z0, -1], [z0 + bev, 0], [z1 - bev, 0], [z1, 1]];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, a = P[i], b = P[j];
    const fn = norm([b[1] - a[1], -(b[0] - a[0]), 0]);
    const na = edgeN[i] || fn, nb = edgeN[j] || fn;
    for (let r = 0; r < 3; r++) {
      const [za, ka] = ring[r], [zb, kb] = ring[r + 1];
      const inset = (k) => (k === 0 ? 0 : bev * 0.6);
      const pa0 = [a[0] - na[0] * inset(ka), a[1] - na[1] * inset(ka), za], pb0 = [b[0] - nb[0] * inset(ka), b[1] - nb[1] * inset(ka), za];
      const pa1 = [a[0] - na[0] * inset(kb), a[1] - na[1] * inset(kb), zb], pb1 = [b[0] - nb[0] * inset(kb), b[1] - nb[1] * inset(kb), zb];
      const nn = (nv, k) => norm([nv[0] * (1 - Math.abs(k) * 0.7), nv[1] * (1 - Math.abs(k) * 0.7), k * 0.9]);
      const c0 = colAt(m, pa0, i / n, 0.5);
      G.tri(pa0, pb0, pb1, nn(na, ka), nn(nb, ka), nn(nb, kb), c0, c0, c0, m);
      G.tri(pa0, pb1, pa1, nn(na, ka), nn(nb, kb), nn(na, kb), c0, c0, c0, m);
    }
  }
  // faces avant/arrière (oreilles)
  const inP = P.map((p, i) => { const nv = edgeN[i] || [0, 0, 0]; return [p[0] - nv[0] * bev * 0.6, p[1] - nv[1] * bev * 0.6]; });
  const tris = earcut(inP);
  for (const [a, b, c] of tris) {
    const A = inP[a], B = inP[b], C = inP[c];
    const ca = colAt(m, [A[0], A[1], z1], 0, 0), cb = colAt(m, [B[0], B[1], z1], 0, 0), cc = colAt(m, [C[0], C[1], z1], 0, 0);
    G.tri([A[0], A[1], z1], [B[0], B[1], z1], [C[0], C[1], z1], [0, 0, 1], [0, 0, 1], [0, 0, 1], ca, cb, cc, m);
    if (!o.noBack) G.tri([A[0], A[1], z0], [C[0], C[1], z0], [B[0], B[1], z0], [0, 0, -1], [0, 0, -1], [0, 0, -1], ca, cc, cb, m);
  }
  return G;
}
function earcut(P) {
  const idx = P.map((_, i) => i), out = [];
  const ar = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const inside = (p, a, b, c) => ar(a, b, p) >= 0 && ar(b, c, p) >= 0 && ar(c, a, p) >= 0;
  let guard = 0;
  while (idx.length > 3 && guard++ < 5000) {
    let cut = false;
    for (let i = 0; i < idx.length; i++) {
      const i0 = idx[(i - 1 + idx.length) % idx.length], i1 = idx[i], i2 = idx[(i + 1) % idx.length];
      const a = P[i0], b = P[i1], c = P[i2];
      if (ar(a, b, c) <= 0) continue;
      let ok = true;
      for (const j of idx) { if (j === i0 || j === i1 || j === i2) continue; if (inside(P[j], a, b, c)) { ok = false; break; } }
      if (!ok) continue;
      out.push([i0, i1, i2]); idx.splice(i, 1); cut = true; break;
    }
    if (!cut) break;
  }
  if (idx.length === 3) out.push([idx[0], idx[1], idx[2]]);
  return out;
}
// Gemme taillée (facettes nettes) : couronne + pavillon
export function gem(r, h, n, m, o = {}) {
  const G = new Mesh(), mm = { ...m, flat: true }, top = h * 0.45, tab = r * 0.55, girdle = 0;
  const ring = (rr, z, off) => { const a = []; for (let i = 0; i < n; i++) { const t = (i / n) * Math.PI * 2 + off; a.push([Math.cos(t) * rr * (o.sx || 1), Math.sin(t) * rr * (o.sy || 1), z]); } return a; };
  const R0 = ring(r, girdle, 0), R1 = ring(tab, top, Math.PI / n), apex = [0, 0, -h * 0.7], tc = [0, 0, top];
  const c = colAt(m, [0, 0, 0], 0, 0), cl = mixc(c, [1, 1, 1], 0.35);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    G.tri(R0[i], R0[j], R1[i], null, null, null, cl, cl, cl, mm);
    G.tri(R1[i], R0[j], R1[j], null, null, null, c, c, c, mm);
    G.tri(R1[i], R1[j], tc, null, null, null, cl, cl, cl, mm);
    G.tri(R0[j], R0[i], apex, null, null, null, mulc(c, 0.6), mulc(c, 0.6), mulc(c, 0.6), mm);
  }
  return G;
}

// ---------- Rendu (WebGL 2) ----------
let GL = null, glFailed = false;
const VS = `#version 300 es
precision highp float;
in vec3 aP; in vec3 aN; in vec3 aC; in vec4 aA; in vec4 aX;
uniform mat3 uR; uniform vec4 uBox; uniform float uZ; uniform highp int uPass;
uniform vec3 uLU; uniform vec3 uLV; uniform vec3 uLD; uniform vec4 uLB; uniform vec2 uLZ;
out vec3 vN; out vec3 vC; out vec4 vA; out vec4 vX; out vec3 vO; out vec3 vV;
void main() {
  vec3 p = uR * aP; vV = p; vO = aP;
  vN = uR * aN; vC = aC; vA = aA; vX = aX;
  if (uPass == 2) { // carte d'ombre : vue depuis la lumière principale
    gl_Position = vec4((dot(p, uLU) - uLB.x) / uLB.z * 2.0 - 1.0, (dot(p, uLV) - uLB.y) / uLB.w * 2.0 - 1.0, 1.0 - 2.0 * (dot(p, uLD) - uLZ.x) / uLZ.y, 1.0);
    return;
  }
  gl_Position = vec4((p.x - uBox.x) / uBox.z * 2.0 - 1.0, 1.0 - (p.y - uBox.y) / uBox.w * 2.0, -p.z / uZ, 1.0);
}`;
const FS = `#version 300 es
precision highp float;
in vec3 vN; in vec3 vC; in vec4 vA; in vec4 vX; in vec3 vO; in vec3 vV;
uniform highp int uPass; uniform vec3 uKey; uniform vec3 uKeyC; uniform vec3 uFill; uniform vec3 uFillC; uniform vec3 uRimC; uniform vec3 uSky; uniform vec3 uGround; uniform vec3 uHor; uniform float uExp;
uniform sampler2D uSh; uniform sampler2D uDp; uniform vec3 uLU; uniform vec3 uLV; uniform vec3 uLD; uniform vec4 uLB; uniform vec2 uLZ; uniform vec2 uRes; uniform float uZ; uniform float uAOr; uniform float uShOn;
out vec4 o;
// ombre portée de la lumière principale (filtrée)
float shadowAt(vec3 p) {
  if (uShOn < 0.5) return 1.0;
  vec2 uv = (vec2(dot(p, uLU), dot(p, uLV)) - uLB.xy) / uLB.zw;
  float dz = 0.5 - (dot(p, uLD) - uLZ.x) / uLZ.y + 0.5, s = 0.0;
  vec2 tx = 1.0 / vec2(textureSize(uSh, 0));
  for (int i = -2; i <= 2; i++) for (int j = -2; j <= 2; j++) s += texture(uSh, uv + vec2(float(i), float(j)) * tx * 1.2).r + 0.0035 >= dz ? 1.0 : 0.0;
  return s / 25.0;
}
// occlusion ambiante en espace écran (creux, jonctions entre pièces)
float aoAt() {
  if (uAOr <= 0.0) return 1.0;
  vec2 uv = gl_FragCoord.xy / uRes;
  float z0 = -(texture(uDp, uv).r * 2.0 - 1.0) * uZ, occ = 0.0;
  for (int i = 0; i < 16; i++) {
    float a = float(i) * 2.39996, r = uAOr * (0.25 + 0.75 * fract(float(i) * 0.618));
    vec2 q = uv + vec2(cos(a), sin(a)) * r / uRes;
    float z = -(texture(uDp, q).r * 2.0 - 1.0) * uZ, dz = z - z0;
    occ += smoothstep(0.4, 5.0, dz) * (1.0 - smoothstep(18.0, 40.0, dz));
  }
  return clamp(1.0 - occ / 16.0 * 1.25, 0.0, 1.0);
}
float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float noise(vec3 x) { vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z); }
float fbm(vec3 p) { return noise(p) * 0.55 + noise(p * 2.1) * 0.3 + noise(p * 4.3) * 0.15; }
vec3 env(vec3 R, float rough) {
  float up = -R.y; // y vers le bas
  vec3 c = up > 0.0 ? mix(uHor, uSky, smoothstep(0.02, 0.85, up)) : mix(uHor * 0.5, uGround, smoothstep(0.0, 0.45, -up));
  c *= mix(1.0, 0.3, exp(-abs(up + 0.04) * 14.0) * (1.0 - rough)); // ligne d'horizon sombre : contraste du chrome
  float sh = mix(260.0, 5.0, rough), gain = mix(1.0, 0.18, rough);
  vec3 d1 = normalize(vec3(-0.55, -0.7, 0.45)), d2 = normalize(vec3(0.85, -0.25, 0.45)), d3 = normalize(vec3(-0.15, -0.25, 1.0));
  c += vec3(1.0, 0.96, 0.9) * pow(max(dot(R, d1), 0.0), sh) * 10.0 * gain;
  c += uFillC * pow(max(dot(R, d2), 0.0), sh * 0.5) * 4.0 * gain;
  c += vec3(1.0, 0.95, 0.85) * pow(max(dot(R, d3), 0.0), sh * 0.12 + 2.0) * mix(2.4, 0.8, rough); // grand panneau face caméra
  float strip = exp(-pow((R.x - 0.62) * 9.0, 2.0)) * smoothstep(-0.2, 0.5, up); // bande verticale (reflets longs)
  c += vec3(0.9, 0.95, 1.0) * strip * mix(2.2, 0.2, rough);
  return c;
}
void main() {
  float metal = vA.x, rough = clamp(vA.y, 0.03, 1.0), emi = vA.z, coat = vA.w, bump = vX.x, freq = vX.y, sss = vX.z;
  vec3 N = normalize(vN);
  if (bump > 0.0) { // micro-relief procédural (peau, métal martelé, roche)
    vec3 q = vO * freq; float e = 0.35;
    float n0 = fbm(q);
    vec3 g = vec3(fbm(q + vec3(e,0,0)) - n0, fbm(q + vec3(0,e,0)) - n0, fbm(q + vec3(0,0,e)) - n0) / e;
    N = normalize(N - bump * g);
  }
  if (N.z < 0.0) N = -N; // éclairage double face
  vec3 V = vec3(0.0, 0.0, 1.0);
  vec3 base = vC;
  if (uPass == 1) { o = vec4(base * emi, 1.0); return; }
  vec3 F0 = mix(vec3(0.04), base, metal);
  vec3 diff = base * (1.0 - metal);
  float ndv = max(dot(N, V), 0.001);
  vec3 col = vec3(0.0);
  float sh = shadowAt(vV), ao = aoAt();
  for (int i = 0; i < 2; i++) {
    vec3 L = i == 0 ? normalize(uKey) : normalize(uFill), Lc = i == 0 ? uKeyC * sh : uFillC * mix(1.0, ao, 0.6);
    float ndl = dot(N, L), w = max((ndl + sss) / (1.0 + sss), 0.0), nl = max(ndl, 0.0);
    vec3 H = normalize(L + V); float ndh = max(dot(N, H), 0.0);
    float a = rough * rough, a2 = a * a, dd = ndh * ndh * (a2 - 1.0) + 1.0, D = a2 / (3.14159 * dd * dd);
    vec3 F = F0 + (1.0 - F0) * pow(1.0 - max(dot(H, V), 0.0), 5.0);
    float k = (rough + 1.0) * (rough + 1.0) / 8.0, G = (nl / (nl * (1.0 - k) + k)) * (ndv / (ndv * (1.0 - k) + k));
    vec3 spec = D * F * G / max(4.0 * nl * ndv, 0.001);
    col += (diff * w + spec * nl) * Lc;
    if (sss > 0.0) col += base * pow(max(-ndl, 0.0), 2.0) * sss * 0.35 * Lc; // lumière qui traverse
  }
  vec3 amb = mix(uGround, uSky, 0.5 - 0.5 * N.y);
  col += diff * amb * 0.55 * ao;
  vec3 R = reflect(-V, N);
  vec3 Fe = F0 + (max(vec3(1.0 - rough), F0) - F0) * pow(1.0 - ndv, 5.0);
  col += env(R, rough) * Fe * (0.35 + 0.65 * metal) * mix(ao, 1.0, 0.25) * mix(0.55, 1.0, sh);
  if (coat > 0.0) { float fc = 0.04 + 0.96 * pow(1.0 - ndv, 5.0); col += env(R, 0.05) * fc * coat * 0.6 * ao; }
  col += uRimC * pow(1.0 - ndv, 3.0) * 0.55 * ao;
  col += base * emi * 1.6;
  col *= uExp;
  col = (col * (2.51 * col + 0.03)) / (col * (2.43 * col + 0.59) + 0.14); // ACES
  o = vec4(pow(clamp(col, 0.0, 1.0), vec3(1.0 / 2.2)), 1.0);
}`;
function initGL() {
  if (GL || glFailed) return GL;
  try {
    const cv = makeCanvas(16, 16);
    const gl = cv.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: true, preserveDrawingBuffer: true });
    if (!gl) { glFailed = true; return null; }
    const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
    const U = {}; for (const n of ['uR', 'uBox', 'uZ', 'uPass', 'uKey', 'uKeyC', 'uFill', 'uFillC', 'uRimC', 'uSky', 'uGround', 'uHor', 'uExp', 'uSh', 'uDp', 'uLU', 'uLV', 'uLD', 'uLB', 'uLZ', 'uRes', 'uAOr', 'uShOn']) U[n] = gl.getUniformLocation(pr, n);
    const Aloc = {}; for (const n of ['aP', 'aN', 'aC', 'aA', 'aX']) Aloc[n] = gl.getAttribLocation(pr, n);
    const bufs = {}; for (const n in Aloc) bufs[n] = gl.createBuffer();
    cv.addEventListener('webglcontextlost', () => { GL = null; glFailed = true; });
    GL = { cv, gl, pr, U, Aloc, bufs };
  } catch (e) { console.warn('3D indisponible', e); glFailed = true; GL = null; }
  return GL;
}
export function has3D() { return !!initGL(); }

const LOOKS = {
  studio: { key: [-0.55, -0.75, 0.7], keyC: [2.6, 2.45, 2.25], fill: [0.8, -0.1, 0.5], fillC: [0.55, 0.7, 1.1], rim: [0.6, 0.45, 1.0], sky: [0.75, 0.82, 1.0], ground: [0.16, 0.1, 0.08], hor: [0.55, 0.5, 0.6], exp: 1.0 },
};
// Cuisson : meshes -> { cv, bloom, w, h, ox, oy } (unités du jeu), vue { yaw, pitch, roll } en radians
export function bake3D(mesh, o) {
  const G = initGL();
  if (!G) return null;
  const { gl, U, Aloc, bufs } = G;
  const w = o.w, h = o.h, ox = o.ox, oy = o.oy, px = Math.max(1, Math.min(6, o.px || 2)), ss = o.ss || (px >= 2.5 ? 1.5 : 2);
  const W = Math.max(2, Math.ceil(w * px)), H = Math.max(2, Math.ceil(h * px)), RW = Math.min(4096, W * ss), RH = Math.min(4096, H * ss);
  G.cv.width = RW; G.cv.height = RH;
  gl.viewport(0, 0, RW, RH);
  gl.useProgram(G.pr);
  const up = (n, arr, size) => { gl.bindBuffer(gl.ARRAY_BUFFER, bufs[n]); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arr), gl.STATIC_DRAW); gl.enableVertexAttribArray(Aloc[n]); gl.vertexAttribPointer(Aloc[n], size, gl.FLOAT, false, 0, 0); };
  up('aP', mesh.P, 3); up('aN', mesh.N, 3); up('aC', mesh.C, 3); up('aA', mesh.A, 4); up('aX', mesh.X, 4);
  // vue : tangage (pitch) autour de x, lacet (yaw) autour de y, roulis autour de z
  const R = rotM([o.pitch || 0, o.yaw || 0, o.roll || 0]);
  gl.uniformMatrix3fv(U.uR, true, new Float32Array(R));
  gl.uniform4f(U.uBox, -ox, -oy, w, h);
  gl.uniform1f(U.uZ, o.zr || 400);
  const L = { ...LOOKS[o.look || 'studio'], ...(o.light || {}) };
  gl.uniform3fv(U.uKey, L.key); gl.uniform3fv(U.uKeyC, L.keyC); gl.uniform3fv(U.uFill, L.fill); gl.uniform3fv(U.uFillC, L.fillC);
  gl.uniform3fv(U.uRimC, L.rim); gl.uniform3fv(U.uSky, L.sky); gl.uniform3fv(U.uGround, L.ground); gl.uniform3fv(U.uHor, L.hor); gl.uniform1f(U.uExp, L.exp);
  gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.disable(gl.CULL_FACE);
  // --- carte d'ombre + profondeur caméra (ombres portées et occlusion ambiante) ---
  const fancy = o.shadows !== false;
  gl.uniform1f(U.uShOn, fancy ? 1 : 0); gl.uniform1f(U.uAOr, fancy ? (o.ao ?? 5) * px * ss : 0); gl.uniform2f(U.uRes, RW, RH);
  if (fancy) {
    const Ld = norm(L.key), up0 = Math.abs(Ld[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], LU = norm(cross(up0, Ld)), LV = cross(Ld, LU);
    let mu = 1e9, Mu = -1e9, mvv = 1e9, Mv = -1e9, md = 1e9, Md = -1e9;
    for (let i = 0; i < mesh.n; i += 3) { const q = mv(R, [mesh.P[i * 3], mesh.P[i * 3 + 1], mesh.P[i * 3 + 2]]); const u = dot(q, LU), v = dot(q, LV), d = dot(q, Ld); if (u < mu) mu = u; if (u > Mu) Mu = u; if (v < mvv) mvv = v; if (v > Mv) Mv = v; if (d < md) md = d; if (d > Md) Md = d; }
    const pad = 4; mu -= pad; mvv -= pad; Mu += pad; Mv += pad; md -= pad; Md += pad;
    gl.uniform3fv(U.uLU, LU); gl.uniform3fv(U.uLV, LV); gl.uniform3fv(U.uLD, Ld); gl.uniform4f(U.uLB, mu, mvv, Mu - mu, Mv - mvv); gl.uniform2f(U.uLZ, md, Md - md);
    const SM = Math.min(2048, Math.max(1024, Math.ceil(Math.max(RW, RH) * 1.2 / 256) * 256));
    for (const u of [1, 2]) { gl.activeTexture(gl.TEXTURE0 + u); gl.bindTexture(gl.TEXTURE_2D, null); } // pas de boucle texture/cible
    gl.activeTexture(gl.TEXTURE0);
    G.sm = depthTarget(gl, G.sm, SM, SM); G.dp = depthTarget(gl, G.dp, RW, RH);
    gl.bindFramebuffer(gl.FRAMEBUFFER, G.sm.fb); gl.viewport(0, 0, SM, SM); gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);
    gl.uniform1i(U.uPass, 2); gl.drawArrays(gl.TRIANGLES, 0, mesh.n);
    gl.bindFramebuffer(gl.FRAMEBUFFER, G.dp.fb); gl.viewport(0, 0, RW, RH); gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);
    gl.uniform1i(U.uPass, 3); gl.drawArrays(gl.TRIANGLES, 0, mesh.n);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, RW, RH);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, G.sm.tex); gl.uniform1i(U.uSh, 1);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, G.dp.tex); gl.uniform1i(U.uDp, 2);
    gl.activeTexture(gl.TEXTURE0);
  }
  const grab = () => { const c = makeCanvas(W, H), g = c.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(G.cv, 0, 0, W, H); return c; };
  gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.uniform1i(U.uPass, 0); gl.drawArrays(gl.TRIANGLES, 0, mesh.n);
  let cv = grab();
  let bloom = null;
  if (o.bloom !== false) {
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.uniform1i(U.uPass, 1); gl.drawArrays(gl.TRIANGLES, 0, mesh.n);
    bloom = blurred(grab(), px * (o.bloomR || 3));
  }
  for (const u of [1, 2]) { gl.activeTexture(gl.TEXTURE0 + u); gl.bindTexture(gl.TEXTURE_2D, null); }
  gl.activeTexture(gl.TEXTURE0);
  if (o.outline !== 0) cv = outlined(cv, Math.max(1, (o.outline ?? 0.9) * px), o.outlineC || 'rgba(8,4,18,0.95)');
  return { cv, bloom, w, h, ox, oy };
}
// cible de profondeur (texture lisible par le shader)
function depthTarget(gl, cur, w, h) {
  if (cur && cur.w === w && cur.h === h) return cur;
  if (cur) { gl.deleteFramebuffer(cur.fb); gl.deleteTexture(cur.tex); gl.deleteRenderbuffer(cur.rb); }
  const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, w, h, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
  for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
  const rb = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, rb); gl.renderbufferStorage(gl.RENDERBUFFER, gl.RGBA8, w, h);
  const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, rb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, tex, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.bindTexture(gl.TEXTURE_2D, null);
  return { fb, tex, rb, w, h };
}
// contour sombre (lisibilité arcade sur fond chargé)
function outlined(src, r, col) {
  const W = src.width, H = src.height, out = makeCanvas(W, H), g = out.getContext('2d');
  const sil = makeCanvas(W, H), s = sil.getContext('2d');
  s.drawImage(src, 0, 0); s.globalCompositeOperation = 'source-in'; s.fillStyle = col; s.fillRect(0, 0, W, H);
  const n = 12; for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; g.drawImage(sil, Math.cos(a) * r, Math.sin(a) * r); }
  g.drawImage(src, 0, 0);
  return out;
}
// flou rapide par réductions successives (halo des lumières)
function blurred(src, r) {
  const W = src.width, H = src.height, k = Math.max(2, Math.min(8, Math.round(r / 2)));
  const a = makeCanvas(Math.max(1, Math.ceil(W / k)), Math.max(1, Math.ceil(H / k))), ga = a.getContext('2d');
  ga.imageSmoothingEnabled = true; ga.drawImage(src, 0, 0, a.width, a.height);
  const b = makeCanvas(Math.max(1, Math.ceil(W / (k * 2))), Math.max(1, Math.ceil(H / (k * 2)))), gb = b.getContext('2d');
  gb.imageSmoothingEnabled = true; gb.drawImage(a, 0, 0, b.width, b.height);
  const out = makeCanvas(W, H), go = out.getContext('2d');
  go.imageSmoothingEnabled = true; go.globalCompositeOperation = 'lighter';
  go.drawImage(src, 0, 0); go.drawImage(a, 0, 0, W, H); go.drawImage(b, 0, 0, W, H); go.drawImage(b, 0, 0, W, H);
  return out;
}

// ---------- Outils de silhouette ----------
// échantillonnage de courbes (pour décrire des contours)
export function qb(a, c, b, n = 10) { const o = []; for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; o.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]); } return o; }
export function cb(a, c1, c2, b, n = 14) { const o = []; for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; o.push([u * u * u * a[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * b[0], u * u * u * a[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * b[1]]); } return o; }
export function ellPts(cx, cy, rx, ry, n = 48, a0 = 0, a1 = Math.PI * 2) { const o = []; for (let i = 0; i < n; i++) { const a = a0 + (i / n) * (a1 - a0); o.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return o; }
export const chain = (...parts) => { const o = []; for (const p of parts) for (const q of p) { const l = o[o.length - 1]; if (!l || Math.abs(l[0] - q[0]) > 1e-6 || Math.abs(l[1] - q[1]) > 1e-6) o.push(q); } return o; };
export const mirrorX = (half) => chain(half, half.slice().reverse().map(([x, y]) => [-x, y]));
function rayHit(c, a, P) {
  const dx = Math.cos(a), dy = Math.sin(a); let best = 0;
  for (let i = 0; i < P.length; i++) {
    const A = P[i], B = P[(i + 1) % P.length], ex = B[0] - A[0], ey = B[1] - A[1];
    const den = dx * ey - dy * ex; if (Math.abs(den) < 1e-9) continue;
    const ax = A[0] - c[0], ay = A[1] - c[1], t = (ax * ey - ay * ex) / den, s = (ax * dy - ay * dx) / den;
    if (t > 0 && s >= -1e-6 && s <= 1 + 1e-6 && t > best) best = t;
  }
  return best;
}
// Gonfle un contour 2D (en étoile autour du centre) en un relief bombé : z = 0 sur le contour, z = depth au sommet
export function inflate(outline, depth, m, o = {}) {
  let cx = 0, cy = 0; for (const p of outline) { cx += p[0]; cy += p[1]; }
  const c = o.c || [cx / outline.length, cy / outline.length];
  const nT = o.nT || 96, nS = o.nS || 18, p = o.p || 2.2, z0 = o.z0 || 0;
  const R = []; for (let i = 0; i <= nT; i++) R.push(rayHit(c, (i / nT) * Math.PI * 2, outline));
  const prof = o.prof || ((s) => Math.pow(Math.max(0, 1 - Math.pow(s, p)), 1 / p));
  return surface((u, v) => {
    const a = u * Math.PI * 2, f = u * nT, i = Math.min(nT - 1, Math.floor(f)), k = f - i, r = R[i] + (R[i + 1] - R[i]) * k, s = 1 - v;
    const x = c[0] + Math.cos(a) * r * s, y = c[1] + Math.sin(a) * r * s;
    return [x, y, z0 + depth * prof(s, x, y) * (o.zf ? o.zf(x, y) : 1)];
  }, nT, nS, m);
}
// hauteur d'un relief gonflé en un point (pour poser des détails dessus)
export function inflateH(outline, depth, x, y, o = {}) {
  let cx = 0, cy = 0; for (const p of outline) { cx += p[0]; cy += p[1]; }
  const c = o.c || [cx / outline.length, cy / outline.length], p = o.p || 2.2;
  const a = Math.atan2(y - c[1], x - c[0]), r = rayHit(c, a, outline), d = Math.hypot(x - c[0], y - c[1]), s = Math.min(1, d / (r || 1));
  return (o.z0 || 0) + depth * Math.pow(Math.max(0, 1 - Math.pow(s, p)), 1 / p) * (o.zf ? o.zf(x, y) : 1);
}

// Plaque « conforme » : épouse une surface de hauteur H(x, y) avec une épaisseur t et un biseau arrondi
export function conform(outline, H, t, m, o = {}) {
  let cx = 0, cy = 0; for (const p of outline) { cx += p[0]; cy += p[1]; }
  const c = o.c || [cx / outline.length, cy / outline.length], nT = o.nT || 48, nS = o.nS || 8, edge = o.edge ?? 0.22;
  const R = []; for (let i = 0; i <= nT; i++) R.push(rayHit(c, (i / nT) * Math.PI * 2, outline));
  const prof = (s) => (s < 1 - edge ? 1 : Math.cos(((s - (1 - edge)) / edge) * Math.PI * 0.5));
  return surface((u, v) => {
    const a = u * Math.PI * 2, f = u * nT, i = Math.min(nT - 1, Math.floor(f)), k = f - i, r = R[i] + (R[i + 1] - R[i]) * k, s = 1 - v;
    const x = c[0] + Math.cos(a) * r * s, y = c[1] + Math.sin(a) * r * s;
    return [x, y, H(x, y) + (o.base ?? -0.6) + t * prof(s)];
  }, nT, nS, m);
}
// Point dans un polygone
export function inPoly(x, y, P) { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a[1] > y) !== (b[1] > y) && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
// Petits détails mécaniques (aérations, boîtiers, tuyaux, rivets) posés sur une surface H(x, y)
export function greebles(M, region, H, n, seed, mats, o = {}) {
  let s = seed * 7919 + 17; const R = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const [x, y] of region) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const sc = o.scale || 1, sym = o.sym !== false;
  let placed = 0, guard = 0;
  while (placed < n && guard++ < n * 30) {
    const x = x0 + R() * (x1 - x0), y = y0 + R() * (y1 - y0);
    if (!inPoly(x, y, region) || (o.avoid && o.avoid(x, y))) continue;
    const kind = R(), z = H(x, y), w = (2 + R() * 5) * sc, hh = (1.5 + R() * 4) * sc;
    const pts = sym && Math.abs(x) > 3 ? [[x, y], [-x, y]] : [[x, y]];
    for (const [px, py] of pts) {
      if (kind < 0.35) M.add(rbox(w, hh, 1.6 * sc, 0.3, mats.box), { t: [px, py, z + 0.3] });
      else if (kind < 0.55) { M.add(rbox(w, hh * 0.6, 1.2 * sc, 0.4, mats.dark), { t: [px, py, z + 0.2] }); M.add(rbox(w * 0.8, 0.6 * sc, 0.6 * sc, 0.5, mats.glow), { t: [px, py, z + 1.1 * sc] }); }
      else if (kind < 0.75) { const L = 6 + R() * 10; M.add(tube((t) => [px - L / 2 + t * L, py, z + 1.1 * sc], () => 0.8 * sc, mats.pipe, { nA: 4, nR: 8 })); }
      else M.add(sphere(0.9 * sc, mats.rivet, { nu: 8, nv: 6 }), { t: [px, py, z + 0.4] });
    }
    placed++;
  }
}
