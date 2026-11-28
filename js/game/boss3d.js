// Colosses en vraie 3D : chaque pièce (corps, pinces, ailes, tourelles…) est modélisée en code,
// éclairée en studio puis cuite avec EXACTEMENT les dimensions et ancres des pièces 2D d'origine,
// pour que toutes les animations des boss restent identiques.
import { Mesh, mat, rgb, mixc, mulc, surface, superq, sphere, rbox, lathe, tube, extrude, gem, inflate, inflateH, qb, cb, ellPts, chain, mirrorX, bake3D, has3D, conform, greebles, inPoly } from '../engine/gl3d.js';
import { lighten, darken, mixHex } from '../engine/math.js';

const TAU = Math.PI * 2;
let LIGHT = null;
// cuisson d'une pièce : même boîte (w, h, ox, oy) que la version 2D
function bake(M, w, h, ox, oy, px, o = {}) { return bake3D(M, { w, h, ox, oy, px: Math.min(4, px), pitch: o.pitch ?? 0.12, yaw: o.yaw || 0, outline: o.outline ?? 1, light: LIGHT, bloomR: o.bloomR || 3 }); }
const M3 = () => new Mesh();
const put = (M, part, xf) => M.add(part, xf || {});
const emiM = (col, k = 1.8) => mat('emissive', col, { emi: k });
const polyN = (n, r, rot = 0, sx = 1, sy = 1) => { const o = []; for (let i = 0; i < n; i++) { const a = rot + (i / n) * TAU; o.push([Math.cos(a) * r * sx, Math.sin(a) * r * sy]); } return o; };
// petit cône (épine, corne) orienté selon un angle dans le plan de l'écran
function spike(len, r, m, seg = 10) { return lathe([[r, 0], [r * 0.55, len * 0.6], [0, len]], m, { seg }); }
const toward = (ang) => [-Math.PI / 2, 0, ang - Math.PI / 2]; // un cône (axe +z) pointant dans la direction ang du plan
function rivetRow(M, pts, r, m, z) { for (const [x, y, zz] of pts) put(M, sphere(r, m, { nu: 10, nv: 8 }), { t: [x, y, zz ?? z] }); }

// ---------- Palette 3D (matières réalistes à partir des couleurs du monde) ----------
function pal(C, P) {
  return {
    armor: mat('steel', '#9aa2b4', { rough: 0.34 }),
    armorD: mat('gunmetal', '#363b48', { rough: 0.4 }),
    hull: mat('gunmetal', '#2a2e38', { rough: 0.38, bump: 0.08, freq: 0.6 }),
    hullL: mat('steel', '#5a6070', { rough: 0.3 }),
    // peinture profonde (couleur du monde assombrie et désaturée vers l'acier) : rendu haut de gamme
    paint: mat('lacquer', C.c1, { bump: 0.03, freq: 0.5 }),
    paint2: mat('lacquer', C.c2),
    pipe: mat('steel', '#8a8f9c', { rough: 0.3 }),
    // laques plus profondes que la palette brute (rendu « carrosserie »)
    lacq: mat('lacquer', P.lacq, { bump: 0.04, freq: 0.4 }), lacqD: mat('lacquer', P.lacqD), lacqL: mat('lacquer', P.lacqL),
    sec: mat('lacquer', P.sec, { bump: 0.04, freq: 0.4 }), secD: mat('lacquer', P.secD),
    flesh: mat('flesh', P.flesh, { bump: 0.5, freq: 0.35 }), fleshD: mat('flesh', P.fleshD, { bump: 0.5, freq: 0.35 }),
    gold: mat('gold', '#e9b04c'), chrome: mat('chrome', '#e2e8f2'), dark: mat('glass', '#05040a', { rough: 0.08 }),
    glow: emiM(C.cg, 2), glowL: emiM(lighten(C.cg, 0.5), 2.2), hot: emiM('#ff8a3a', 2),
    glass: (hex, emi = 0.4) => mat('glass', hex, { emi }), lac: (hex, o) => mat('lacquer', hex, o),
    cg: C.cg, c1: C.c1, c2: C.c2,
  };
}

// ---------- Pièces communes ----------
export function turret3D(Q, px, r, n = 2) {
  const L = r + 15, M = M3(), bw = r * 0.34;
  for (let i = 0; i < n; i++) {
    const x = n === 1 ? 0 : (i / (n - 1) - 0.5) * r * 0.85;
    put(M, tube((t) => [x, t * L, r * 0.45], () => bw * 0.5, Q.armor, { nA: 8, nR: 14 }));
    put(M, tube((t) => [x, L - 4 + t * 4, r * 0.45], () => bw * 0.72, Q.chrome, { nA: 3, nR: 14 }));
    put(M, tube((t) => [x, r * 0.6 + t * 3.5, r * 0.45], () => bw * 0.66, Q.gold, { nA: 3, nR: 14 }));
    put(M, sphere(bw * 0.3, Q.glowL, { nu: 10, nv: 6 }), { t: [x, L, r * 0.45] });
  }
  put(M, superq(r, r, r * 0.55, 1, 1, Q.armorD));
  put(M, inflate(chain(ellPts(0, 0, r * 0.9, r * 0.9, 40, Math.PI - 0.2, TAU + 0.2)), r * 0.62, Q.lacqL, { z0: r * 0.2 }));
  put(M, superq(r * 0.28, r * 0.28, r * 0.12, 1, 1, Q.dark), { t: [0, r * 0.38, r * 0.48] });
  put(M, sphere(r * 0.15, Q.glow, { nu: 10, nv: 8 }), { t: [0, r * 0.38, r * 0.55] });
  rivetRow(M, [[-r * 0.6, -r * 0.45, r * 0.45], [r * 0.6, -r * 0.45, r * 0.45]], 0.9, Q.chrome);
  return bake(M, r * 2 + 8, r + L + 10, r + 4, r + 4, px);
}
export function hexPlate3D(Q, px, r, rot = 0.5) {
  const M = M3();
  put(M, extrude(polyN(6, r, rot), 0, r * 0.22, Q.gold, { bevel: r * 0.08 }));
  put(M, inflate(polyN(6, r * 0.84, rot), r * 0.34, Q.armor, { z0: r * 0.2, p: 3 }));
  for (let k = 0; k < 6; k++) {
    const a0 = rot + (k / 6) * TAU, a1 = rot + ((k + 1) / 6) * TAU, R0 = r * 0.76, R1 = r * 0.44;
    const q = [[Math.cos(a0) * R0, Math.sin(a0) * R0], [Math.cos(a1) * R0, Math.sin(a1) * R0], [Math.cos(a1) * R1, Math.sin(a1) * R1], [Math.cos(a0) * R1, Math.sin(a0) * R1]];
    put(M, extrude(q, 0, r * 0.12, k % 2 ? Q.lacq : Q.lacqD, { bevel: r * 0.05 }), { t: [0, 0, r * 0.38] });
  }
  put(M, extrude(polyN(6, r * 0.42, rot + 0.52), 0, r * 0.16, Q.gold, { bevel: r * 0.05 }), { t: [0, 0, r * 0.44] });
  put(M, gem(r * 0.32, r * 0.4, 6, Q.glass(mixHex('#ffffff', Q.cg, 0.6), 0.8)), { t: [0, 0, r * 0.62] });
  rivetRow(M, polyN(6, r * 0.9, rot).map(([x, y]) => [x, y, r * 0.24]), r * 0.05, Q.chrome);
  return bake(M, r * 2 + 6, r * 2 + 6, r + 3, r + 3, px);
}
export function legSeg3D(Q, px, L, w, tip) {
  const M = M3(), h = w / 2;
  put(M, tube((t) => [t * L, 0, h * 0.6], (t) => h * (1.0 - 0.35 * t) * (1 + 0.25 * Math.sin(t * Math.PI)), Q.lacq, { nA: 18, nR: 14 }));
  for (const u of [0.35, 0.7]) put(M, tube((t) => [L * u - 1 + t * 2, 0, h * 0.6], () => h * (1.08 - 0.35 * u), Q.armorD, { nA: 2, nR: 14 }));
  put(M, sphere(h * 1.05, Q.armor, { nu: 16, nv: 12 }), { t: [0, 0, h * 0.6] });
  if (tip) put(M, spike(9, h * 0.5, Q.gold), { t: [L - 2, 0, h * 0.6], r: toward(0) });
  return bake(M, L + w * 2, w * 2 + 4, w, w + 2, px);
}
export function limb3D(Q, px, L, w, o = {}) {
  const M = M3(), h = w / 2;
  put(M, tube((t) => [t * L, 0, h * 0.5], (t) => h * 0.78 * (1 - (o.taper ? 0.5 * t : 0.12 * t)), Q.armorD, { nA: 16, nR: 14 }));
  const bands = o.bands ?? 2;
  for (let i = 0; i < bands; i++) {
    const x0 = L * (0.12 + i * (0.8 / bands)), x1 = x0 + L * (0.8 / bands) * 0.78;
    put(M, tube((t) => [x0 + t * (x1 - x0), 0, h * 0.5], (t) => h * (0.98 - 0.08 * t) * (1 + 0.08 * Math.sin(t * Math.PI)), Q.lacq, { nA: 10, nR: 16 }));
    put(M, tube((t) => [x0 - 0.6 + t * 1.2, 0, h * 0.5], () => h * 1.02, Q.gold, { nA: 2, nR: 16 }));
  }
  if (o.glow) put(M, tube((t) => [L * 0.2 + t * L * 0.6, 0, h * 1.32], () => 0.6, Q.glowL, { nA: 6, nR: 6 }));
  put(M, sphere(h * 0.95, Q.chrome, { nu: 16, nv: 12 }), { t: [0, 0, h * 0.5] });
  put(M, sphere(h * 0.42, Q.armorD, { nu: 12, nv: 8 }), { t: [0, 0, h * 1.2] });
  return bake(M, L + w * 1.4, w + 6, w * 0.7, w / 2 + 3, px);
}
function noisyPoly(n, r, k0, k1, seed, rot = 0) { let s = seed * 9301 + 49297; const R = () => ((s = (s * 16807) % 2147483647) / 2147483647); const o = []; for (let i = 0; i < n; i++) { const a = rot + (i / n) * TAU, k = k0 + R() * (k1 - k0); o.push([Math.cos(a) * r * k, Math.sin(a) * r * k]); } return o; }
export function wound3D(Q, px, r) {
  const M = M3();
  put(M, inflate(noisyPoly(15, r, 0.82, 1.15, Math.round(r * 13)), r * 0.45, mat('gunmetal', '#3a3438', { bump: 0.9, freq: 0.5, rough: 0.55 }), { p: 1.4, prof: (s) => (s > 0.62 ? Math.sin(((1 - s) / 0.38) * Math.PI * 0.5) : 0.25 + s * 0.6) }));
  put(M, inflate(noisyPoly(13, r * 0.6, 0.85, 1.1, Math.round(r * 7) + 3, 0.2), r * 0.12, emiM('#ff6a1a', 1.6), { z0: r * 0.08, p: 1.5 }));
  put(M, sphere(r * 0.28, emiM(Q.cg, 2.4), { nu: 14, nv: 10 }), { t: [0, 0, r * 0.12], s: [1, 1, 0.5] });
  return bake(M, r * 2.4, r * 2.4, r * 1.2, r * 1.2, px, { bloomR: 4 });
}
export function chunk3D(Q, px, r, seed) {
  const M = M3(), pts = noisyPoly(7, r, 0.62, 1.1, seed, 0.3);
  put(M, inflate(pts, r * 0.55, Q.lacq, { p: 1.6 }));
  put(M, extrude([pts[0], pts[1], pts[2], [0, 0]].map(([x, y]) => [x * 0.9, y * 0.9]), 0, r * 0.25, Q.armor, { bevel: 0.6 }), { t: [0, 0, r * 0.25] });
  put(M, tube((t) => { const a = pts[4], b = pts[5]; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, r * 0.2]; }, () => 0.9, Q.hot, { nA: 6, nR: 6 }));
  return bake(M, r * 2.6, r * 2.6, r * 1.3, r * 1.3, px);
}
export function coreOrb3D(Q, px, r) {
  const M = M3();
  const col = (p) => { const k = Math.min(1, Math.hypot(p[0] + r * 0.3, p[1] + r * 0.3) / (r * 1.4)); return mixc(rgb('#ffffff'), rgb(Q.cg), Math.min(1, k * 1.4)); };
  put(M, sphere(r, mat('glass', col, { emi: 0.9 })));
  return bake(M, r * 2 + 4, r * 2 + 4, r + 2, r + 2, px, { outline: 0.6 });
}
export function bead3D(Q, px, r, colHex, colDHex, tipGlow) {
  const M = M3(), m = mat('lacquer', (p) => mixc(rgb(lighten(colHex, 0.15)), rgb(colDHex), Math.max(0, Math.min(1, (p[1] / r + 1) / 2))), { bump: 0.1, freq: 0.5 });
  put(M, superq(r * 1.15, r, r * 0.8, 1, 1, m));
  put(M, tube((t) => [-r * 0.35, Math.cos(t * TAU) * r * 0.98, r * 0.15 + Math.sin(t * TAU) * r * 0.78], () => r * 0.13, Q.armor, { nA: 24, nR: 8 }));
  for (const s of [-1, 1]) put(M, spike(r * 0.9, r * 0.22, Q.chrome), { t: [r * 0.1, s * r * 0.85, r * 0.3], r: toward(s > 0 ? Math.PI / 2 - 0.5 : -Math.PI / 2 + 0.5) });
  if (tipGlow) put(M, sphere(r * 0.22, Q.glowL, { nu: 10, nv: 8 }), { t: [r * 0.35, 0, r * 0.72] });
  return bake(M, r * 2.6, r * 2.4, r * 1.3, r * 1.2, px);
}
export function eyePod3D(Q, px, r, m) {
  const M = M3();
  put(M, superq(r * 1.18, r * 1.18, r * 0.55, 1, 1, m || Q.armor));
  for (let k = 0; k < 3; k++) { const a = -Math.PI / 2 + (k - 1) * 0.9; put(M, spike(r * 0.65, r * 0.2, Q.chrome), { t: [Math.cos(a) * r * 1.05, Math.sin(a) * r * 1.05, r * 0.25], r: toward(a) }); }
  put(M, tube((t) => [Math.cos(t * TAU) * r * 0.86, Math.sin(t * TAU) * r * 0.86, r * 0.5], () => r * 0.14, Q.chrome, { nA: 32, nR: 10 }));
  put(M, superq(r * 0.74, r * 0.74, r * 0.18, 1, 1, Q.dark), { t: [0, 0, r * 0.42] });
  return bake(M, r * 2.6, r * 2.6, r * 1.3, r * 1.3, px);
}

// ---------- Colosses ----------
export const BOSS3D = {};

BOSS3D.crab = (C, P, Q, px) => {
  const A = {};
  const M = M3();
  // sous-blindage ventral
  const belly = chain(qb([-94, 0], [-88, 70], [0, 78], 12), qb([0, 78], [88, 70], [94, 0], 12));
  put(M, inflate(belly, 16, Q.armorD, { p: 1.8 }));
  for (const [w0, y0] of [[82, 34], [66, 52]]) put(M, tube((t) => { const x = -w0 + t * w0 * 2; return [x, y0 + 22 * (1 - (x / w0) ** 2) * 0.9, 13]; }, () => 0.9, mat('matte', '#06050a'), { nA: 24, nR: 6 }));
  // carapace : coque en métal sombre + plaques d'armure peintes qui épousent la courbe
  const shell = chain(qb([-100, 10], [-96, -60], [-40, -74], 12), qb([-40, -74], [0, -84], [40, -74], 10), qb([40, -74], [96, -60], [100, 10], 12), qb([100, 10], [80, 62], [0, 66], 12), qb([0, 66], [-80, 62], [-100, 10], 12));
  const SH = { p: 2.4, c: [0, -10] }, Hs = (x, y) => inflateH(shell, 34, x, y, { ...SH, z0: 8 });
  put(M, inflate(shell, 34, Q.hull, { ...SH, z0: 8 }));
  // plaque dorsale centrale (autour des tourelles)
  const dorsal = chain(qb([-74, -40], [-60, -76], [0, -80], 10), qb([0, -80], [60, -76], [74, -40], 10), qb([74, -40], [40, -24], [0, -26], 8), qb([0, -26], [-40, -24], [-74, -40], 8));
  put(M, conform(dorsal, Hs, 2.6, Q.paint, { c: [0, -50] }));
  // bandeau frontal peint
  const rim = chain(qb([-92, 18], [-70, 52], [0, 58], 12), qb([0, 58], [70, 52], [92, 18], 12), qb([92, 18], [70, 40], [0, 44], 10), qb([0, 44], [-70, 40], [-92, 18], 10));
  put(M, conform(rim, Hs, 2.2, Q.paint, { c: [0, 44] }));
  // plaques latérales imbriquées
  for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) {
    const y0 = -40 + k * 22, q = [[sd * 62, y0], [sd * 92, y0 + 5], [sd * 97, y0 + 21], [sd * 66, y0 + 19]];
    put(M, conform(q, Hs, 3.4, Q.paint2, { c: [sd * 80, y0 + 11], edge: 0.3 }));
    put(M, tube((t) => { const x = sd * (62 + 30 * t), y = y0 + 5 * t; return [x, y, Hs(x, y) + 3.2]; }, () => 0.8, Q.gold, { nA: 8, nR: 6 }));
  }
  // rainures lumineuses / sombres
  for (let i = 1; i < 4; i++) put(M, tube((t) => { const a = Math.PI * 1.06 + t * Math.PI * 0.88, x = Math.cos(a) * (98 - i * 21), y = -8 + Math.sin(a) * (68 - i * 14); return [x, y, Hs(x, y) + (i === 1 ? 2.8 : 0.5)]; }, () => (i === 1 ? 1.1 : 0.7), i === 1 ? Q.glow : mat('matte', '#08060c'), { nA: 40, nR: 6 }));
  // détails mécaniques sur la coque nue
  const avoid = (x, y) => inPoly(x, y, dorsal) || inPoly(x, y, rim) || Math.hypot(x - 44 * Math.sign(x), y + 4) < 36 || Math.hypot(x, y - 42) < 32 || Math.hypot(Math.abs(x) - 24, y - 8) < 16;
  greebles(M, shell.map(([x, y]) => [x * 0.9, y * 0.9 - 2]), Hs, 26, 3, { box: Q.hullL, dark: mat('gunmetal', '#101218'), glow: Q.glow, pipe: Q.pipe, rivet: Q.chrome }, { avoid });
  // arête dorsale
  put(M, extrude([[0, -84], [9, -72], [7, 18], [0, 30], [-7, 18], [-9, -72]], 0, 6, Q.armor, { bevel: 2 }), { t: [0, 0, Hs(0, -20)] });
  put(M, tube((t) => [0, -80 + t * 104, Hs(0, -20) + 6.4], () => 0.9, Q.gold, { nA: 10, nR: 6 }));
  // cornes frontales
  for (const sd of [-1, 1]) for (const [x, y, d0] of [[30, -76, -1.75], [62, -64, -1.3], [86, -40, -0.85]]) {
    const d = sd > 0 ? d0 : Math.PI - d0;
    put(M, spike(17, 5, Q.chrome), { t: [sd * x, y, Hs(sd * x * 0.95, y * 0.95) * 0.7], r: toward(d) });
  }
  // évents lumineux
  for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) { const x = sd * (20 + k * 2), y = -58 + k * 9; put(M, rbox(14, 3.2, 2, 0.3, Q.glow), { t: [x, y, Hs(x, y) + 3.2] }); }
  // supports des tourelles, logements des boucliers, orbites, réacteur
  for (const [x, y] of [[-50, -48], [0, -62], [50, -48]]) { const z = Hs(x, y) + 2.6; put(M, superq(16.5, 16.5, 6, 1, 1, Q.armor), { t: [x, y, z - 2] }); put(M, superq(12, 12, 2, 1, 1, mat('gunmetal', '#0a0910')), { t: [x, y, z + 2.5] }); }
  for (const sd of [-1, 1]) { put(M, superq(31, 31, 4, 1, 1, Q.armorD), { t: [sd * 44, -4, Hs(sd * 44, -4) - 3] }); put(M, tube((t) => [sd * 44 + Math.cos(t * TAU) * 31, -4 + Math.sin(t * TAU) * 31, Hs(sd * 44, -4)], () => 1.2, Q.gold, { nA: 40, nR: 6 })); }
  for (const sd of [-1, 1]) { const z = Hs(sd * 24, 8); put(M, tube((t) => [sd * 24 + Math.cos(t * TAU) * 11, 8 + Math.sin(t * TAU) * 11, z + 1.5], () => 2, Q.chrome, { nA: 28, nR: 10 })); put(M, superq(9.5, 9.5, 2, 1, 1, Q.dark), { t: [sd * 24, 8, z] }); }
  { const z = Hs(0, 42) + 2.2; put(M, tube((t) => [Math.cos(t * TAU) * 26.6, 42 + Math.sin(t * TAU) * 26.6, z + 1], () => 2.6, Q.gold, { nA: 40, nR: 10 })); put(M, superq(24.5, 24.5, 2, 1, 1, mat('gunmetal', '#07060c')), { t: [0, 42, z - 1] }); }
  A.body = bake(M, 236, 176, 118, 94, px);
  // pince (mâchoire vers +y côté +x)
  const J = M3();
  const jaw = chain(qb([-8, -2], [34, 14], [14, 66], 14), [[9, 62]], qb([9, 62], [12, 26], [-6, 12], 12));
  put(J, inflate(jaw, 10, Q.lacq, { p: 1.8 }));
  put(J, extrude([[14, 66], [9, 62], [17, 50], [21, 52]], 0, 7, Q.gold, { bevel: 1 }));
  for (let k = 0; k < 5; k++) { const u = 0.12 + k * 0.17, v = 1 - u, x = v * v * 9 + 2 * v * u * 12 + u * u * -6, y = v * v * 62 + 2 * v * u * 26 + u * u * 12; put(J, spike(5, 1.8, Q.chrome, 8), { t: [x, y, 4], r: toward(Math.PI) }); }
  A.jaw = bake(J, 50, 76, 14, 8, px);
  const Pm = M3();
  put(Pm, superq(22, 22, 11, 1, 1, Q.armor));
  put(Pm, inflate(ellPts(0, -6, 20, 15, 40, Math.PI * 0.95, Math.PI * 2.05), 9, Q.lacqL, { z0: 6 }));
  put(Pm, rbox(22, 2.4, 2, 0.3, Q.glow), { t: [0, 7, 10] });
  rivetRow(Pm, [[-14, -6, 11], [14, -6, 11], [0, -15, 12]], 1, Q.chrome);
  A.palm = bake(Pm, 52, 52, 26, 26, px);
  A.arm = limb3D(Q, px, 56, 15, { bands: 2 }); A.armL = 56;
  A.leg = legSeg3D(Q, px, 50, 9, false); A.legT = legSeg3D(Q, px, 48, 9, true); A.legL = 50;
  A.hex = hexPlate3D(Q, px, 32);
  A.turret = turret3D(Q, px, 13);
  return A;
};

BOSS3D.jelly = (C, P, Q, px) => {
  const A = {}, M = M3();
  // jupe en festons
  const skirt = [[-100, 24]]; for (let i = 0; i <= 12; i++) { const x = -100 + (i / 12) * 200; skirt.push([x - 4, 58 + (i % 2) * 8], [x, 40 + (i % 2 ? 10 : 0)]); } skirt.push([100, 24]);
  put(M, inflate(skirt, 9, Q.sec, { p: 1.6, c: [0, 34] }));
  // cloche : gelée translucide lumineuse
  const bell = chain(cb([-98, 30], [-104, -112], [104, -112], [98, 30], 28), [[0, 30]]);
  const jel = mat('jelly', (p) => { const k = Math.max(0, Math.min(1, (p[1] + 86) / 116)); return mixc(rgb(lighten(C.c1, 0.1)), rgb(darken(C.c1, 0.55)), k); }, { emi: 0.18, sss: 0.7, rough: 0.3, coat: 0.5 });
  const BH = { p: 2.1, c: [0, -10] }, Hb = (x, y) => inflateH(bell, 46, x, y, { ...BH, z0: 4 });
  put(M, inflate(bell, 46, jel, { ...BH, z0: 4 }));
  // organes lumineux (sous la surface)
  for (const [x, y, r] of [[0, -34, 22], [-30, -8, 13], [30, -8, 13], [0, 8, 10]]) put(M, sphere(r, emiM(lighten(C.cg, 0.2), 1.1), { nu: 20, nv: 14 }), { t: [x, y, Hb(x, y) - r * 0.85], s: [1, 1, 0.6] });
  // nervures d'acier
  for (let i = -3; i <= 3; i++) put(M, tube((t) => { const u = 1 - t; const x = u * u * i * 10 + 2 * u * t * i * 26 + t * t * i * 28, y = u * u * -84 + 2 * u * t * -34 + t * t * 26; return [x, y, Hb(x, y) + 0.6]; }, () => 1.3, Q.armor, { nA: 30, nR: 8 }));
  // couronne blindée
  const crown = chain(qb([-100, 12], [0, -4], [100, 12], 16), [[98, 32]], qb([98, 32], [0, 18], [-98, 32], 16));
  put(M, extrude(crown, 0, 7, Q.armor, { bevel: 2.2 }), { t: [0, 0, Hb(0, 14) - 6] });
  put(M, tube((t) => { const x = -100 + t * 200, y = 12 - 16 * (1 - (x / 100) ** 2) * 0.5; return [x, y, Hb(0, 14) + 1.4]; }, () => 1.1, Q.gold, { nA: 40, nR: 6 }));
  for (let i = 0; i < 9; i++) { const x = -80 + i * 20, y = 21 - 6 * (1 - (x / 100) ** 2); put(M, rbox(7, 3, 2, 0.3, Q.glow), { t: [x, y, Hb(0, 14) + 1.5] }); }
  // crête
  for (const [x, l] of [[-10, 14], [0, 20], [10, 14]]) put(M, spike(l, 3.6, Q.chrome), { t: [x, -76, Hb(x, -76)], r: toward(-Math.PI / 2) });
  // orbites des yeux-canons
  for (const s of [-1, 1]) { const z = Hb(s * 26, -62); put(M, tube((t) => [s * 26 + Math.cos(t * TAU) * 14.5, -62 + Math.sin(t * TAU) * 14.5, z + 1], () => 2.4, Q.chrome, { nA: 30, nR: 10 })); put(M, superq(12.5, 12.5, 2, 1, 1, Q.dark), { t: [s * 26, -62, z] }); }
  A.body = bake(M, 228, 186, 114, 116, px, { bloomR: 5 });
  // nageoire blindée
  const F = M3();
  const fin = chain(cb([-30, 40], [-46, -10], [-20, -48], [22, -40], 18), qb([22, -40], [6, 0], [18, 40], 12));
  const FH = (x, y) => inflateH(fin, 14, x, y, { p: 1.9 });
  put(F, inflate(fin, 14, Q.sec, { p: 1.9 }));
  for (let k = 0; k < 3; k++) put(F, tube((t) => { const u = 1 - t, x = u * u * (-22 + k * 7) + 2 * u * t * (-28 + k * 10) + t * t * (10 + k * 3), y = u * u * 34 + 2 * u * t * -8 + t * t * -34; return [x, y, FH(x, y) + 0.6]; }, () => 1.1, k === 1 ? Q.glow : Q.armor, { nA: 24, nR: 6 }));
  put(F, tube((t) => { const u = 1 - t; const x = u * u * u * -30 + 3 * u * u * t * -46 + 3 * u * t * t * -20 + t * t * t * 22, y = u * u * u * 40 + 3 * u * u * t * -10 + 3 * u * t * t * -48 + t * t * t * -40; return [x, y, 1.5]; }, () => 1.4, Q.gold, { nA: 30, nR: 6 }));
  A.fin = bake(F, 90, 96, 50, 52, px);
  A.bead = bead3D(Q, px, 10, P.sec, P.secD, true);
  A.sock = eyePod3D(Q, px, 12, Q.lacq);
  return A;
};

BOSS3D.flower = (C, P, Q, px) => {
  const A = {};
  // pétale blindé (pointe vers +x)
  const Pt = M3(), pet = chain(cb([4, 0], [24, -30], [76, -30], [98, 0], 18), cb([98, 0], [76, 30], [24, 30], [4, 0], 18));
  const HP = (x, y) => inflateH(pet, 12, x, y, { p: 2, c: [54, 0] });
  put(Pt, inflate(pet, 12, mat('lacquer', (p) => mixc(rgb(darken(C.c1, 0.45)), rgb(lighten(C.c1, 0.15)), Math.max(0, Math.min(1, (p[0] - 4) / 94))), { bump: 0.05, freq: 0.5 }), { p: 2, c: [54, 0] }));
  put(Pt, conform(chain(cb([10, 0], [30, -9], [70, -9], [92, 0], 12), cb([92, 0], [70, 9], [30, 9], [10, 0], 12)), HP, 1.6, Q.armor, { c: [50, 0] }));
  put(Pt, tube((t) => { const x = 10 + t * 84; return [x, 0, HP(x, 0) + 2]; }, () => 0.9, Q.gold, { nA: 20, nR: 6 }));
  for (let k = 1; k < 5; k++) for (const sd of [-1, 1]) put(Pt, tube((t) => { const u = 1 - t, x = u * u * (14 + k * 16) + 2 * u * t * (22 + k * 16) + t * t * (26 + k * 16), y = sd * (u * u * 3 + 2 * u * t * 12 + t * t * (20 - k * 2.5)); return [x, y, HP(x, y) + 0.4]; }, () => 0.5, mat('matte', '#100810'), { nA: 10, nR: 5 }));
  put(Pt, tube((t) => { const pp = pet[Math.min(pet.length - 1, Math.floor(t * (pet.length - 1)))]; return [pp[0], pp[1], 1]; }, () => 0.9, Q.chrome, { nA: 60, nR: 6 }));
  put(Pt, sphere(3, Q.glowL, { nu: 10, nv: 8 }), { t: [90, 0, HP(90, 0) + 1] });
  A.petal = bake(Pt, 104, 60, 4, 30, px);
  // disque central : graines en spirale
  const D = M3();
  put(D, superq(46, 46, 7, 1, 1, Q.gold));
  put(D, inflate(ellPts(0, 0, 40, 40, 48), 10, Q.secD, { z0: 6, p: 2.4 }));
  for (let i = 8; i < 150; i++) { const a = i * 2.39996, r = 3.25 * Math.sqrt(i); if (r > 37 || r < 9) continue; const x = Math.cos(a) * r, y = Math.sin(a) * r, sr = 1.5 + r * 0.045; put(D, sphere(sr, i % 5 ? Q.sec : Q.glowL, { nu: 8, nv: 6 }), { t: [x, y, inflateH(ellPts(0, 0, 40, 40, 48), 10, x, y, { z0: 6, p: 2.4 }) + sr * 0.3] }); }
  for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU; put(D, sphere(1.3, Q.chrome, { nu: 8, nv: 6 }), { t: [Math.cos(a) * 43, Math.sin(a) * 43, 7] }); }
  A.disk = bake(D, 100, 100, 50, 50, px);
  // lame du diaphragme
  const B = M3(), bl = chain(qb([0, -4], [18, -14], [30, -2], 10), [[26, 6]], qb([26, 6], [14, 0], [0, 6], 8));
  put(B, inflate(bl, 4, Q.armor, { p: 1.6 }));
  put(B, tube((t) => { const u = 1 - t, x = u * u * 1 + 2 * u * t * 18 + t * t * 29, y = u * u * -3 + 2 * u * t * -13 + t * t * -2; return [x, y, 2.5]; }, () => 0.6, Q.gold, { nA: 12, nR: 5 }));
  A.blade = bake(B, 40, 40, 4, 20, px, { outline: 0.6 });
  // tête d'étamine
  const T = M3();
  put(T, superq(11, 11, 6, 1, 1, Q.armor));
  put(T, sphere(8, mat('glass', (p) => mixc(rgb('#fffbe6'), rgb(C.cg), Math.min(1, Math.hypot(p[0] + 2, p[1] + 2) / 9)), { emi: 0.9 })), { t: [0, 0, 4], s: [1, 1, 0.75] });
  for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU; put(T, spike(5, 2.4, Q.gold, 8), { t: [Math.cos(a) * 9.5, Math.sin(a) * 9.5, 2.5], r: toward(a) }); }
  A.stamen = bake(T, 30, 30, 15, 15, px);
  A.stalk = limb3D(Q, px, 34, 6, { bands: 1, glow: true });
  A.vine = bead3D(Q, px, 9, P.sec, P.secD, false);
  const Bu = M3();
  put(Bu, superq(15, 15, 11, 1, 1, Q.lacq));
  for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU - Math.PI / 2; put(Bu, tube((t) => { const r = 4 + t * 10; return [Math.cos(a) * r, Math.sin(a) * r, 11 * Math.sqrt(Math.max(0, 1 - (r / 15) ** 2)) + 0.6]; }, () => 0.9, Q.gold, { nA: 10, nR: 5 })); }
  put(Bu, sphere(4, Q.glow, { nu: 10, nv: 8 }), { t: [0, 0, 10], s: [1, 1, 0.5] });
  A.bulb = bake(Bu, 40, 40, 20, 20, px);
  return A;
};

BOSS3D.eye = (C, P, Q, px) => {
  const A = {}, M = M3();
  for (const sd of [-1, 1]) {
    put(M, conform([[sd * 66, -22], [sd * 100, -12], [sd * 104, 12], [sd * 66, 22]], () => 6, 6, Q.sec, { c: [sd * 84, 0], edge: 0.3 }));
    put(M, superq(11, 11, 9, 1, 1, Q.chrome), { t: [sd * 98, 0, 8] });
    rivetRow(M, [[sd * 76, -12], [sd * 76, 12]], 1.2, Q.chrome, 12.5);
  }
  // anneau blindé
  put(M, lathe([[74, 0], [86, 2], [86, 9], [80, 16], [74, 18]], Q.armor, { seg: 72 }));
  for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU; put(M, rbox(10, 1.2, 1, 0.4, mat('matte', '#08060c')), { t: [Math.cos(a) * 80, Math.sin(a) * 80, 16.4], r: [0, 0, a] }); }
  for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU + 0.26; put(M, sphere(2.4, Q.glow, { nu: 10, nv: 8 }), { t: [Math.cos(a) * 80, Math.sin(a) * 80, 15.5] }); }
  put(M, tube((t) => [Math.cos(t * TAU) * 76, Math.sin(t * TAU) * 76, 17.5], () => 1.6, Q.gold, { nA: 72, nR: 8 }));
  // globe oculaire
  const sclera = mat('lacquer', (p) => { const d = Math.hypot(p[0], p[1]) / 74; return mixc(rgb('#f4eef8'), rgb(darken(C.c1, 0.2)), Math.max(0, (d - 0.55) / 0.45) ** 1.4); }, { rough: 0.22, coat: 0.8 });
  put(M, superq(74, 74, 40, 1, 1, sclera), { t: [0, 0, 2] });
  for (let i = 0; i < 11; i++) { const a = (i / 11) * TAU + 0.2; put(M, tube((t) => { const r = 72 - t * 28, aa = a + Math.sin(t * 2.2) * 0.2, x = Math.cos(aa) * r, y = Math.sin(aa) * r; return [x, y, 2 + 40 * Math.sqrt(Math.max(0, 1 - (r / 74) ** 2)) + 0.4]; }, () => 0.55, mat('flesh', '#c8304a', { emi: 0.1 }), { nA: 16, nR: 5 })); }
  A.body = bake(M, 212, 176, 106, 88, px);
  // iris
  const I = M3();
  put(I, superq(35, 35, 10, 1, 1, mat('glass', (p) => { const d = Math.hypot(p[0], p[1]) / 35; return d < 0.2 ? rgb(lighten(C.cg, 0.6)) : mixc(rgb(C.cg), rgb('#100818'), Math.max(0, (d - 0.45) / 0.55)); }, { emi: 0.7 })));
  for (let i = 0; i < 24; i++) { const a = (i / 24) * TAU; put(I, tube((t) => { const r = 12 + t * 21; return [Math.cos(a + t * 0.1) * r, Math.sin(a + t * 0.1) * r, 10 * Math.sqrt(Math.max(0, 1 - (r / 35) ** 2)) + 0.3]; }, () => 0.35, i % 2 ? emiM(lighten(C.cg, 0.5), 1.4) : mat('matte', '#140a1c'), { nA: 8, nR: 4 })); }
  A.iris = bake(I, 76, 76, 38, 38, px, { outline: 0 });
  // paupières blindées
  for (const top of [true, false]) {
    const k = top ? -1 : 1, L = M3();
    const lid = chain(cb([-78, 0], [-72, 98 * k], [72, 98 * k], [78, 0], 24), cb([78, 0], [40, 10 * k], [-40, 10 * k], [-78, 0], 16));
    const HL = (x, y) => inflateH(lid, 22, x, y, { p: 2.2, c: [0, 34 * k] });
    put(L, inflate(lid, 22, Q.lacq, { p: 2.2, c: [0, 34 * k] }));
    for (let j = 1; j < 4; j++) put(L, tube((t) => { const u = 1 - t, x = u * u * u * (-76 + j * 5) + 3 * u * u * t * -50 + 3 * u * t * t * 50 + t * t * t * (76 - j * 5), y = k * (u * u * u * j * 15 + 3 * u * u * t * (24 + j * 22) + 3 * u * t * t * (24 + j * 22) + t * t * t * j * 15); return [x, y, HL(x, y) + 0.5]; }, () => (j === 2 ? 1 : 0.7), j === 2 ? Q.glow : mat('matte', '#08060c'), { nA: 30, nR: 5 }));
    put(L, tube((t) => { const u = 1 - t, x = u * u * u * -78 + 3 * u * u * t * -40 + 3 * u * t * t * 40 + t * t * t * 78, y = k * (3 * u * u * t * 10 + 3 * u * t * t * 10); return [x, y, 2.5]; }, () => 2.2, Q.gold, { nA: 40, nR: 8 }));
    for (let i = -3; i <= 3; i++) { const x = i * 18, y = 7.5 * k * (1 - (i / 4.3) ** 2); put(L, spike(9, 2.6, Q.chrome, 8), { t: [x, y, 4], r: toward(top ? -Math.PI / 2 : Math.PI / 2) }); }
    rivetRow(L, [[-50, 40 * k], [0, 56 * k], [50, 40 * k]].map(([x, y]) => [x, y, HL(x, y) + 0.6]), 1.4, Q.chrome);
    A[top ? 'lidT' : 'lidB'] = bake(L, 168, 104, 84, top ? 96 : 8, px);
  }
  A.pod = eyePod3D(Q, px, 13, Q.lacq);
  A.bead = bead3D(Q, px, 9, P.sec, P.secD, true);
  return A;
};

BOSS3D.mantis = (C, P, Q, px) => {
  const A = {}, M = M3();
  // abdomen
  put(M, superq(18, 30, 15, 1, 1, Q.lacq), { t: [0, 22, 2] });
  for (let k = 0; k < 4; k++) put(M, tube((t) => { const a = 0.15 + t * (Math.PI - 0.3), x = Math.cos(a) * 17.4, y = 22 + Math.sin(a) * (6 + k * 7); return [x, y, 2 + 15 * Math.sqrt(Math.max(0, 1 - (x / 18) ** 2 - ((y - 22) / 30) ** 2)) + 0.2]; }, () => 0.6, mat('matte', '#081008'), { nA: 16, nR: 5 }));
  // thorax en segments
  for (let i = 3; i >= 0; i--) {
    const y = -70 + i * 22, rx = 20 - i * 1.5;
    put(M, superq(rx, 16, 12, 0.9, 1, Q.lacq), { t: [0, y, 4 + i] });
    put(M, superq(rx * 0.45, 12, 4, 1, 1, Q.armor), { t: [0, y - 2, 14 + i] });
    put(M, tube((t) => { const a = 0.2 + t * (Math.PI - 0.4); return [Math.cos(a) * rx, y + Math.sin(a) * 16, 5 + i]; }, () => 0.9, Q.gold, { nA: 14, nR: 5 }));
    for (const sd of [-1, 1]) put(M, sphere(2, Q.glow, { nu: 8, nv: 6 }), { t: [sd * rx * 0.72, y + 4, 13 + i] });
  }
  put(M, tube((t) => [0, -84 + t * 84, 18], () => 0.8, Q.chrome, { nA: 20, nR: 5 }));
  for (const sd of [-1, 1]) { put(M, superq(14, 14, 7, 1, 1, Q.armor), { t: [sd * 22, -72, 6] }); put(M, superq(10, 10, 2, 1, 1, mat('gunmetal', '#0a0910')), { t: [sd * 22, -72, 12] }); }
  A.body = bake(M, 80, 156, 40, 96, px);
  // ailes membraneuses
  for (const sd of [1, -1]) {
    const W = M3(), wing = chain(qb([0, 0], [sd * 40, -70], [sd * 92, -42], 16), qb([sd * 92, -42], [sd * 70, 10], [0, 20], 16));
    put(W, inflate(wing, 3, mat('glass', (p) => mixc(rgb(C.c2), rgb(lighten(C.c2, 0.4)), Math.min(1, Math.hypot(p[0], p[1]) / 90)), { emi: 0.25, rough: 0.12 }), { p: 1.4 }));
    for (let k = 1; k < 5; k++) put(W, tube((t) => { const u = 1 - t, x = sd * (2 * u * t * (14 + k * 10) + t * t * (24 + k * 16)), y = u * u * 8 + 2 * u * t * (-10 - k * 6) + t * t * (-28 - k * 4); return [x, y, 3.2]; }, () => 0.75, k === 2 ? Q.glow : Q.armorD, { nA: 14, nR: 5 }));
    put(W, tube((t) => { const u = 1 - t, x = sd * (2 * u * t * 40 + t * t * 92), y = 2 * u * t * -70 + t * t * -42; return [x, y, 2.5]; }, () => 1.6, Q.chrome, { nA: 24, nR: 6 }));
    for (const [x, y] of [[50, -34], [68, -30]]) put(W, sphere(2.2, Q.glowL, { nu: 8, nv: 6 }), { t: [sd * x, y, 3.5] });
    A[sd > 0 ? 'wingR' : 'wingL'] = bake(W, 104, 100, sd > 0 ? 6 : 98, 78, px, { outline: 0.6 });
  }
  // lames de faux
  for (const sd of [1, -1]) {
    const B = M3(), blade = chain(qb([0, 0], [sd * 42, 18], [sd * 18, 72], 14), qb([sd * 18, 72], [sd * 24, 30], [0, 9], 12));
    put(B, inflate(blade, 7, Q.lacq, { p: 1.7 }));
    put(B, tube((t) => { const u = 1 - t, x = sd * (u * u * 1 + 2 * u * t * 24 + t * t * 18), y = u * u * 8 + 2 * u * t * 30 + t * t * 70; return [x, y, 3]; }, () => 1.6, Q.chrome, { nA: 20, nR: 6 }));
    for (let k = 0; k < 4; k++) { const y = 20 + k * 12, x = sd * (20 + Math.sin(k) * 2); put(B, spike(6, 2, Q.chrome, 8), { t: [x, y + 2, 3], r: toward(sd > 0 ? Math.PI : 0) }); }
    put(B, superq(6, 6, 4, 1, 1, Q.gold), { t: [0, 3, 2] });
    A[sd > 0 ? 'bladeR' : 'bladeL'] = bake(B, 56, 80, sd > 0 ? 6 : 50, 6, px);
  }
  A.arm = limb3D(Q, px, 48, 9, { bands: 2 });
  A.turret = turret3D(Q, px, 12, 1);
  // tête
  const H = M3(), hd = chain(qb([-28, -10], [0, -18], [28, -10], 10), qb([28, -10], [22, 14], [0, 32], 10), qb([0, 32], [-22, 14], [-28, -10], 10));
  put(H, inflate(hd, 14, Q.lacq, { p: 2 }));
  put(H, tube((t) => [0, -14 + t * 40, inflateH(hd, 14, 0, -14 + t * 40, { p: 2 }) + 0.4], () => 0.7, Q.gold, { nA: 14, nR: 5 }));
  for (const sd of [-1, 1]) {
    put(H, superq(10, 6.5, 5, 1, 1, mat('glass', (p) => mixc(rgb('#ffffff'), rgb(C.cg), Math.min(1, Math.hypot(p[0] - sd * 11, p[1] + 3) / 9)), { emi: 0.9 })), { t: [sd * 13, -1, inflateH(hd, 14, sd * 13, -1, { p: 2 }) - 1.5], r: [0, 0, sd * 0.5] });
    put(H, spike(10, 2.2, Q.chrome, 8), { t: [sd * 6, 24, 3], r: toward(Math.PI / 2 + sd * 0.6) });
  }
  A.head = bake(H, 64, 52, 32, 16, px);
  return A;
};

BOSS3D.worm = (C, P, Q, px) => {
  const A = {};
  const S = M3();
  for (const sd of [-1, 1]) put(S, extrude([[sd * 12, -10], [sd * 30, -6], [sd * 26, 2], [sd * 13, 2]], 0, 5, Q.gold, { bevel: 1.2 }));
  put(S, superq(18, 18, 13, 1, 1, Q.lacq), { t: [0, 0, 2] });
  greebles(S, ellPts(0, 0, 14, 14, 16), (x, y) => 2 + 13 * Math.sqrt(Math.max(0, 1 - (x * x + y * y) / 324)), 5, 51, { box: Q.hullL, dark: mat('gunmetal', '#101218'), glow: Q.glow, pipe: Q.pipe, rivet: Q.chrome }, { scale: 0.6, avoid: (x, y) => Math.hypot(x, y) < 9 });
  put(S, tube((t) => [Math.cos(t * TAU) * 13.5, Math.sin(t * TAU) * 13.5, 2 + 13 * Math.sqrt(1 - 0.5625) + 0.6], () => 1.7, Q.armor, { nA: 40, nR: 8 }));
  put(S, superq(8, 8, 3, 1, 1, Q.dark), { t: [0, 0, 14] });
  put(S, sphere(5, Q.glow, { nu: 12, nv: 8 }), { t: [0, 0, 14.5], s: [1, 1, 0.4] });
  rivetRow(S, [[0, -13.5], [0, 13.5], [-13.5, 0], [13.5, 0]].map(([x, y]) => [x, y, 11.5]), 1.1, Q.chrome);
  A.seg = bake(S, 64, 52, 32, 26, px);
  const T = M3();
  put(T, inflate([[-12, -6], [0, 36], [12, -6]], 6, Q.sec, { p: 1.6 }));
  put(T, lathe([[3.6, 0], [0, 14]], Q.chrome, { seg: 10 }), { t: [0, 22, 1.5], r: toward(Math.PI / 2) });
  put(T, sphere(2.4, Q.glow, { nu: 8, nv: 6 }), { t: [0, 2, 5] });
  A.tail = bake(T, 30, 46, 15, 8, px);
  const H = M3();
  put(H, superq(28, 30, 18, 1, 1, Q.lacq), { t: [0, 4, 2] });
  const HH = (x, y) => 2 + 18 * Math.sqrt(Math.max(0, 1 - (x / 28) ** 2 - ((y - 4) / 30) ** 2));
  put(H, conform([[0, -30], [10, -24], [14, -6], [6, 0], [-6, 0], [-14, -6], [-10, -24]], HH, 2, Q.armor, { c: [0, -14] }));
  put(H, tube((t) => [0, -30 + t * 30, HH(0, -30 + t * 30) + 2.3], () => 0.8, Q.gold, { nA: 12, nR: 5 }));
  for (const sd of [-1, 1]) {
    put(H, spike(18, 4, Q.chrome), { t: [sd * 22, -16, HH(sd * 22, -16) * 0.7], r: toward(sd > 0 ? -0.7 : Math.PI + 0.7) });
    const z = HH(sd * 12, 10); put(H, tube((t) => [sd * 12 + Math.cos(t * TAU) * 8.8, 10 + Math.sin(t * TAU) * 8.8, z + 0.6], () => 1.6, Q.chrome, { nA: 24, nR: 8 })); put(H, superq(7.5, 7.5, 2, 1, 1, Q.dark), { t: [sd * 12, 10, z] });
  }
  A.head = bake(H, 72, 80, 36, 34, px);
  const Md = M3();
  put(Md, inflate(chain(qb([0, 0], [-14, 16], [2, 30], 10), [[5, 26]], qb([5, 26], [-4, 16], [6, 4], 8)), 5, Q.chrome, { p: 1.6 }));
  put(Md, superq(4, 4, 3, 1, 1, Q.gold), { t: [1, 1, 2] });
  A.mand = bake(Md, 30, 40, 6, 6, px);
  return A;
};

BOSS3D.heart = (C, P, Q, px) => {
  const A = {}, M = M3();
  // artères chromées
  for (const sd of [-1, 1]) for (const [x0, x1, w] of [[16, 34, 9], [40, 70, 7]]) {
    put(M, tube((t) => { const u = 1 - t, x = sd * (u * u * x0 + 2 * u * t * x0 + t * t * x1), y = u * u * -40 + 2 * u * t * -86 + t * t * -100; return [x, y, 10 + 8 * Math.sin(t * Math.PI)]; }, (t) => w * 0.5 * (1 - 0.2 * t), Q.chrome, { nA: 24, nR: 12 }));
    put(M, tube((t) => [sd * x1 + Math.cos(t * TAU) * w * 0.6, -100 + Math.sin(t * TAU) * w * 0.6, 12], () => w * 0.22, Q.gold, { nA: 20, nR: 8 }));
    put(M, sphere(w * 0.35, Q.glow, { nu: 10, nv: 8 }), { t: [sd * x1, -100, 12] });
  }
  // cœur de chair
  const H0 = cb([0, 92 * 0.35 + 8], [-92 * 1.1, -92 * 0.35 + 8], [-92 * 0.5, -92 * 1.05 + 8], [0, -92 * 0.45 + 8], 22);
  const heart = chain(H0, H0.slice().reverse().map(([x, y]) => [-x, y]));
  const HO = { p: 2.1, c: [0, -12] }, Hh = (x, y) => inflateH(heart, 44, x, y, HO);
  put(M, inflate(heart, 44, mat('flesh', (p) => mixc(rgb(lighten(C.c1, 0.15)), rgb(darken(C.c1, 0.5)), Math.max(0, Math.min(1, (p[1] + 90) / 130))), { bump: 0.7, freq: 0.3, sss: 0.7 }), HO));
  for (let i = 0; i < 7; i++) put(M, tube((t) => { const u = 1 - t, x = u * u * u * 0 + 3 * u * u * t * Math.cos(i) * 40 + 3 * u * t * t * Math.cos(i * 2) * 60 + t * t * t * Math.cos(i * 1.7) * 76, y = u * u * u * 10 + 3 * u * u * t * (-40 + i * 8) + 3 * u * t * t * (-10 + i * 10) + t * t * t * (-50 + i * 14); return [x, y, Hh(x, y) + 0.8]; }, (t) => 1.8 * (1 - t * 0.6), i % 2 ? emiM(C.cg, 1.3) : mat('flesh', C.c2, { bump: 0.3 }), { nA: 26, nR: 6 }));
  // cerclages d'acier
  for (const y of [-34, 6]) {
    const band = [[-100, y - 6], [100, y - 6], [100, y + 6], [-100, y + 6]].map(([x, yy]) => [x, yy]);
    const clip = (x, yy) => Hh(x, yy);
    put(M, surface((u, v) => { const x = -98 + u * 196, yy = y - 6 + v * 12; const h = clip(x, yy); return [x, yy, h > 0.5 ? h + 1.8 : -50]; }, 60, 3, Q.armor));
    put(M, tube((t) => { const x = -98 + t * 196, h = Hh(x, y - 6); return [x, y - 6, h > 0.5 ? h + 2.3 : -50]; }, () => 0.7, Q.gold, { nA: 60, nR: 5 }));
    for (const x of [-60, -30, 30, 60]) put(M, sphere(1.4, Q.chrome, { nu: 8, nv: 6 }), { t: [x, y, Hh(x, y) + 2.6] });
  }
  for (const [x, y] of [[-26, -52], [26, -52], [0, 24]]) { const z = Hh(x, y); put(M, tube((t) => [x + Math.cos(t * TAU) * 6, y + Math.sin(t * TAU) * 6, z + 0.8], () => 1.3, Q.gold, { nA: 20, nR: 6 })); put(M, sphere(4, Q.glowL, { nu: 10, nv: 8 }), { t: [x, y, z - 1], s: [1, 1, 0.5] }); }
  for (const [x, y] of [[-48, -62], [48, -62], [-44, 66], [44, 66]]) { put(M, tube((t) => [x + Math.cos(t * TAU) * 15.5, y + Math.sin(t * TAU) * 15.5, 6], () => 2.6, Q.chrome, { nA: 30, nR: 10 })); put(M, superq(13, 13, 2, 1, 1, Q.dark), { t: [x, y, 4] }); }
  A.body = bake(M, 220, 220, 110, 116, px, { bloomR: 5 });
  // ventricule latéral
  const V = M3();
  put(V, superq(34, 44, 20, 1, 1, mat('flesh', C.c2, { bump: 0.7, freq: 0.32, sss: 0.7 })));
  for (const y of [-24, 0, 24]) { const rx = 33 * Math.sqrt(1 - (y / 46) ** 2); put(V, tube((t) => { const a = t * Math.PI, x = Math.cos(a) * rx, yy = y + Math.sin(a) * 4; return [x, yy, 20 * Math.sqrt(Math.max(0, 1 - (x / 34) ** 2 - (yy / 44) ** 2)) + 0.8]; }, () => 1.4, Q.armor, { nA: 20, nR: 6 })); }
  put(V, sphere(9, emiM(C.cg, 1.2), { nu: 14, nv: 10 }), { t: [0, -4, 14], s: [1, 1, 0.5] });
  A.vent = bake(V, 84, 104, 42, 52, px);
  // couveuse
  const Pd = M3();
  put(Pd, sphere(18, mat('glass', (p) => mixc(rgb('#ffffff'), rgb(C.cg), Math.min(1, Math.hypot(p[0] + 5, p[1] + 5) / 18)), { emi: 0.8 })));
  for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU; put(Pd, tube((t) => { const r = 6 + t * 12; return [Math.cos(a) * r, Math.sin(a) * r, 18 * Math.sqrt(Math.max(0, 1 - (r / 18) ** 2)) + 0.6]; }, () => 1.2, Q.armor, { nA: 12, nR: 6 })); }
  put(Pd, tube((t) => [Math.cos(t * TAU) * 17.5, Math.sin(t * TAU) * 17.5, 2], () => 1.8, Q.armor, { nA: 36, nR: 8 }));
  put(Pd, superq(4, 4, 2, 1, 1, Q.gold), { t: [0, 0, 18.5] });
  A.pod = bake(Pd, 48, 48, 24, 24, px);
  A.bead = bead3D(Q, px, 9, P.sec, P.secD, true);
  A.sock = eyePod3D(Q, px, 13, Q.lacq);
  return A;
};

const mirrorPts = (half) => { const o = []; for (let i = 0; i < half.length; i += 2) o.push([half[i], half[i + 1]]); for (let i = half.length - 2; i >= 0; i -= 2) if (half[i] !== 0) o.push([-half[i], half[i + 1]]); return o; };
BOSS3D.dread = (C, P, Q, px) => {
  const A = {}, M = M3();
  // quille sombre + coque laquée (profil de navire : bombée sur la largeur)
  const keel = mirrorPts([0, 94, 16, 82, 34, 42, 48, 0, 50, -40, 44, -76, 30, -94, 0, -98]);
  put(M, inflate(keel, 16, Q.hull, { p: 3, c: [0, 0] }));
  const hull = mirrorPts([0, 86, 14, 72, 30, 36, 42, 0, 44, -36, 38, -70, 24, -88, 0, -90]);
  const HO = { p: 3.2, c: [0, 0], z0: 6 }, Hh = (x, y) => inflateH(hull, 24, x, y, HO);
  put(M, inflate(hull, 24, Q.paint, HO));
  // plaques de blindage latérales
  for (const sd of [-1, 1]) for (const [y0, y1, x0, x1] of [[-74, -46, 18, 36], [-36, -6, 22, 41], [4, 30, 22, 39], [40, 62, 14, 28]]) {
    put(M, conform([[sd * x0, y0], [sd * x1, y0 + 4], [sd * (x1 + 1), y1 - 2], [sd * (x0 - 2), y1]], Hh, 2.6, Q.paint2, { c: [sd * (x0 + x1) / 2, (y0 + y1) / 2], edge: 0.3 }));
    put(M, tube((t) => { const x = sd * (x0 + (x1 - x0) * t), y = y0 + 4 * t; return [x, y, Hh(x, y) + 2.4]; }, () => 0.7, Q.gold, { nA: 6, nR: 5 }));
  }
  // pont central blindé + superstructures
  const deck = mirrorPts([0, 72, 7, 62, 11, -60, 0, -80]);
  put(M, conform(deck, Hh, 3, Q.armor, { c: [0, 0], edge: 0.15 }));
  put(M, tube((t) => [0, -76 + t * 144, Hh(0, -76 + t * 144) + 3.2], () => 0.8, Q.gold, { nA: 24, nR: 5 }));
  greebles(M, mirrorPts([0, 80, 20, 60, 30, 0, 30, -70, 0, -86]), (x, y) => Hh(x, y) + 0.2, 34, 81, { box: Q.hullL, dark: mat('gunmetal', '#101218'), glow: Q.glow, pipe: Q.pipe, rivet: Q.chrome }, { avoid: (x, y) => Math.hypot(x, y + 18) < 34 || [[-40, 34], [40, 34], [-28, -52], [28, -52]].some(([a, b]) => Math.hypot(x - a, y - b) < 18) || Math.abs(x) < 12 });
  // baies du hangar
  for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) { const y = 8 + k * 7, x = sd * 22; put(M, rbox(14, 3.4, 2, 0.3, Q.dark), { t: [x, y + 1.7, Hh(x, y) + 0.8] }); put(M, rbox(12, 1.6, 1, 0.4, Q.glow), { t: [x, y + 1.7, Hh(x, y) + 1.7] }); }
  // tour de commandement (logement du noyau)
  { const z = Hh(0, -18) + 3; put(M, lathe([[31, 0], [31, 4], [27, 6], [26, 3]], Q.gold, { seg: 48 }), { t: [0, -18, z - 4] }); put(M, superq(26, 26, 2, 1, 1, mat('gunmetal', '#07060c')), { t: [0, -18, z - 2] }); }
  for (const [x, y] of [[-40, 34], [40, 34], [-28, -52], [28, -52]]) { const z = Hh(x, y); put(M, superq(16, 16, 6, 1, 1, Q.armor), { t: [x, y, z] }); put(M, superq(11.5, 11.5, 2, 1, 1, mat('gunmetal', '#0a0910')), { t: [x, y, z + 4.5] }); }
  put(M, lathe([[7, 0], [0, 20]], Q.chrome, { seg: 8 }), { t: [0, 84, 10], r: toward(Math.PI / 2) });
  // réacteurs de poupe
  for (const [x, y, r] of [[0, -92, 9], [-21, -84, 7], [21, -84, 7]]) { put(M, lathe([[r * 0.6, 0], [r, 2], [r, 7], [r * 0.7, 9]], Q.chrome, { seg: 24 }), { t: [x, y, 10], r: [Math.PI / 2, 0, 0], s: [1, 1, 0.8] }); put(M, sphere(r * 0.55, Q.glowL, { nu: 12, nv: 8 }), { t: [x, y - 2, 10], s: [1, 0.4, 0.8] }); }
  for (const [x, y] of [[40, -10], [42, -40], [32, 34], [20, 66]]) for (const sd of [-1, 1]) put(M, sphere(1.3, emiM(sd < 0 ? '#ff3a5a' : '#47ffa3', 2.4), { nu: 8, nv: 6 }), { t: [sd * x, y, Hh(sd * x, y) + 1] });
  A.body = bake(M, 128, 206, 64, 106, px);
  // batteries latérales
  for (const sd of [-1, 1]) {
    const B = M3();
    for (let k = 0; k < 3; k++) { const y = -12 + k * 11, ang = sd > 0 ? 0.55 : Math.PI - 0.55; put(B, tube((t) => [sd * 14 + Math.cos(ang) * t * 22, y + Math.sin(ang) * t * 22, 9], () => 2, Q.chrome, { nA: 4, nR: 10 })); }
    const plate = [[sd * -24, -26], [sd * 18, -20], [sd * 22, 20], [sd * -20, 26]];
    put(B, inflate(plate, 10, Q.armor, { p: 3 }));
    put(B, conform([[sd * -16, -18], [sd * 12, -14], [sd * 14, 12], [sd * -12, 18]], (x, y) => inflateH(plate, 10, x, y, { p: 3 }), 2, Q.paint2, { c: [0, 0] }));
    for (let k = 0; k < 3; k++) { put(B, rbox(16, 2.4, 1.6, 0.3, Q.dark), { t: [0, -9 + k * 8, 12.4] }); put(B, rbox(14, 1.2, 0.8, 0.4, Q.glow), { t: [0, -9 + k * 8, 13.4] }); }
    rivetRow(B, [[sd * -18, -20], [sd * 14, -16], [sd * 16, 14], [sd * -14, 20]].map(([x, y]) => [x, y, 8]), 1.1, Q.chrome);
    A[sd < 0 ? 'battL' : 'battR'] = bake(B, 70, 64, 35, 32, px);
  }
  // nacelle-hangar
  const H = M3();
  put(H, superq(17, 25, 12, 1, 1, Q.paint));
  put(H, rbox(18, 12, 2, 0.3, Q.dark), { t: [0, 12, 8] });
  for (const y of [9, 14]) put(H, rbox(16, 1.4, 1, 0.4, Q.glow), { t: [0, y, 9.5] });
  for (const sd of [-1, 1]) put(H, spike(10, 3.4, Q.chrome), { t: [sd * 14, -6, 5], r: toward(sd > 0 ? -0.7 : Math.PI + 0.7) });
  put(H, tube((t) => [Math.cos(t * TAU) * 17, Math.sin(t * TAU) * 25, 1.5], () => 0.8, Q.gold, { nA: 40, nR: 5 }));
  A.pod = bake(H, 46, 62, 23, 31, px);
  // rampe de missiles
  const R = M3();
  put(R, rbox(30, 22, 8, 0.25, Q.armor), { t: [0, -1, 4] });
  for (let k = 0; k < 4; k++) { const x = -10.5 + k * 7; put(R, tube((t) => [x, -8 + t * 18, 9.5], () => 2.3, mat('lacquer', '#f2f4fa'), { nA: 4, nR: 10 })); put(R, lathe([[2.3, 0], [0, 6]], mat('lacquer', C.c2), { seg: 10 }), { t: [x, 10, 9.5], r: toward(Math.PI / 2) }); }
  A.rack = bake(R, 40, 40, 20, 18, px);
  A.strut = limb3D(Q, px, 50, 8, { bands: 1, glow: true });
  A.turret = turret3D(Q, px, 13);
  return A;
};

BOSS3D.ring = (C, P, Q, px) => {
  const A = {}, M = M3();
  // rail extérieur (tore) + rainures
  put(M, tube((t) => [Math.cos(t * TAU) * 87, Math.sin(t * TAU) * 87, 6], () => 7.2, Q.hull, { nA: 120, nR: 18 }));
  put(M, tube((t) => [Math.cos(t * TAU) * 87, Math.sin(t * TAU) * 87, 13.4], () => 1.3, Q.glow, { nA: 120, nR: 6 }));
  for (let i = 0; i < 24; i++) { const a = (i / 24) * TAU; put(M, rbox(3, 12, 3, 0.4, i % 2 ? Q.paint : Q.hullL), { t: [Math.cos(a) * 87, Math.sin(a) * 87, 11.5], r: [0, 0, a] }); }
  // moyeu central
  put(M, lathe([[40, 0], [40, 5], [35, 9], [34, 7]], Q.gold, { seg: 64 }));
  put(M, superq(34, 34, 14, 1, 1, Q.paint), { t: [0, 0, 2] });
  for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU + 0.2; put(M, spike(9, 3, Q.chrome, 8), { t: [Math.cos(a) * 31, Math.sin(a) * 31, 10], r: toward(a) }); }
  put(M, superq(30, 30, 2, 1, 1, mat('gunmetal', '#07060c')), { t: [0, 0, 15] });
  put(M, tube((t) => [Math.cos(t * TAU) * 32, Math.sin(t * TAU) * 32, 15.5], () => 0.7, Q.glow, { nA: 60, nR: 5 }));
  A.body = bake(M, 214, 214, 107, 107, px);
  // module du rail (orienté vers +x)
  const Sm = M3(), wedge = chain([[-12, -16], [12, -19], [16, 0], [12, 19], [-12, 16]], qb([-12, 16], [-15, 0], [-12, -16], 6));
  put(Sm, inflate(wedge, 13, Q.paint2, { p: 2.4 }));
  put(Sm, tube((t) => [10 + t * 12, 0, 8], () => 2.2, Q.chrome, { nA: 4, nR: 10 }));
  put(Sm, rbox(10, 18, 2, 0.3, Q.dark), { t: [-1, 0, 12] }); put(Sm, rbox(8, 16, 1, 0.4, Q.glow), { t: [-1, 0, 13] });
  rivetRow(Sm, [[-8, -12], [-8, 12], [8, -14], [8, 14]].map(([x, y]) => [x, y, 9]), 1, Q.chrome);
  A.seg = bake(Sm, 44, 44, 22, 22, px);
  A.spoke = limb3D(Q, px, 50, 9, { bands: 2, glow: true });
  A.hex = hexPlate3D(Q, px, 22);
  return A;
};

BOSS3D.seraph = (C, P, Q, px) => {
  const A = {}, M = M3(), WH = mat('chrome', '#eef2fa', { rough: 0.12 }), ivory = mat('lacquer', '#f0ead8', { rough: 0.2 });
  // auréole
  put(M, tube((t) => [Math.cos(t * TAU) * 38, -64 + Math.sin(t * TAU) * 38, 2], () => 4.2, Q.gold, { nA: 80, nR: 14 }));
  put(M, tube((t) => [Math.cos(t * TAU) * 38, -64 + Math.sin(t * TAU) * 38, 6.4], () => 0.8, Q.glowL, { nA: 80, nR: 5 }));
  put(M, lathe([[3, 0], [0, 26]], Q.gold, { seg: 8 }), { t: [0, 66, 6], r: toward(Math.PI / 2) });
  // torse d'ivoire et de chrome
  const torso = mirrorPts([0, 70, 10, 56, 18, 30, 26, 0, 24, -22, 16, -40, 10, -50, 0, -54]);
  const HO = { p: 2.6, c: [0, 6], z0: 2 }, Ht = (x, y) => inflateH(torso, 20, x, y, HO);
  put(M, inflate(torso, 20, ivory, HO));
  for (const sd of [-1, 1]) {
    put(M, conform([[sd * 6, -36], [sd * 20, -22], [sd * 22, 0], [sd * 8, -8]], Ht, 2.2, Q.paint, { c: [sd * 14, -18] }));
    put(M, conform([[sd * 8, 20], [sd * 20, 22], [sd * 14, 50], [sd * 5, 44]], Ht, 2.2, Q.paint, { c: [sd * 12, 34] }));
    put(M, tube((t) => { const x = sd * (6 + 14 * Math.min(1, t * 2) + 2 * Math.max(0, t * 2 - 1)), y = -36 + 14 * Math.min(1, t * 2) + 22 * Math.max(0, t * 2 - 1); return [x, y, Ht(x, y) + 2.3]; }, () => 0.7, Q.gold, { nA: 12, nR: 5 }));
  }
  put(M, tube((t) => [0, -50 + t * 114, Ht(0, -50 + t * 114) + 0.6], () => 0.8, Q.glow, { nA: 30, nR: 5 }));
  // tête casquée + couronne
  put(M, superq(11, 13, 10, 1, 1, WH), { t: [0, -48, Ht(0, -48) - 3] });
  put(M, rbox(14, 3.4, 2, 0.3, Q.dark), { t: [0, -46.5, Ht(0, -48) + 6.5] }); put(M, rbox(12, 2, 1, 0.4, Q.glow), { t: [0, -46.5, Ht(0, -48) + 7.6] });
  for (const [x, l] of [[-8, 12], [-4, 16], [0, 20], [4, 16], [8, 12]]) put(M, spike(l, 2.2, Q.gold, 8), { t: [x, -58, Ht(0, -48) + 2], r: toward(-Math.PI / 2 + x * 0.04) });
  // logement du cœur
  put(M, extrude([[0, -20], [18, 6], [0, 32], [-18, 6]], 0, 4, Q.gold, { bevel: 1.4 }), { t: [0, 0, Ht(0, 6) - 1] });
  put(M, extrude([[0, -14], [13, 6], [0, 26], [-13, 6]], 0, 1, mat('gunmetal', '#07060c')), { t: [0, 0, Ht(0, 6) + 2.6] });
  A.body = bake(M, 130, 196, 65, 104, px);
  // ailes : plumes-lames
  for (const sd of [-1, 1]) {
    const Wg = M3();
    for (let k = 3; k >= 0; k--) {
      const a = -0.95 + k * 0.38, L = 74 - k * 8, ca = Math.cos(a), sa = Math.sin(a);
      const fe = chain(qb([0, -6], [L * 0.55, -16], [L, 0], 12), qb([L, 0], [L * 0.55, 10], [0, 6], 12)).map(([x, y]) => [sd * (x * ca - y * sa), x * sa + y * ca]);
      put(Wg, inflate(fe, 5 + k, k % 2 ? WH : Q.paint, { p: 1.8, z0: (3 - k) * 2.5 }));
      put(Wg, tube((t) => { const u = 1 - t, x = 2 * u * t * L * 0.55 + t * t * (L - 2) + u * u * 2, y = u * u * -5 + 2 * u * t * -15; return [sd * (x * ca - y * sa), x * sa + y * ca, (3 - k) * 2.5 + 4 + k]; }, () => 0.7, Q.gold, { nA: 16, nR: 5 }));
    }
    put(Wg, superq(9, 9, 7, 1, 1, Q.gold), { t: [0, 0, 10] });
    put(Wg, sphere(3.5, Q.glowL, { nu: 10, nv: 8 }), { t: [0, 0, 16] });
    A[sd < 0 ? 'wingL' : 'wingR'] = bake(Wg, 110, 110, sd < 0 ? 80 : 30, 66, px);
    const Lw = M3();
    for (let k = 2; k >= 0; k--) {
      const a = 0.35 + k * 0.32, L = 46 - k * 6, ca = Math.cos(a), sa = Math.sin(a);
      const fe = chain(qb([0, -4], [L * 0.55, -10], [L, 0], 10), qb([L, 0], [L * 0.55, 7], [0, 4], 10)).map(([x, y]) => [sd * (x * ca - y * sa), x * sa + y * ca]);
      put(Lw, inflate(fe, 4 + k, k % 2 ? Q.paint : WH, { p: 1.8, z0: (2 - k) * 2 }));
    }
    put(Lw, superq(6, 6, 5, 1, 1, Q.gold), { t: [0, 0, 7] });
    A[sd < 0 ? 'lwL' : 'lwR'] = bake(Lw, 70, 60, sd < 0 ? 52 : 18, 22, px);
  }
  return A;
};

const HROOTS = [[-30, 36], [0, 46], [30, 36]];
BOSS3D.hydra = (C, P, Q, px) => {
  const A = {}, M = M3();
  const shellO = mirrorPts([0, -76, 24, -72, 46, -58, 60, -34, 64, -6, 58, 22, 46, 42, 26, 56, 0, 60]);
  const shell = mirrorPts([0, -70, 22, -66, 42, -53, 55, -31, 58, -6, 53, 19, 42, 37, 24, 50, 0, 54]);
  put(M, inflate(shellO, 14, Q.hull, { p: 2.4, c: [0, -8] }));
  const HO = { p: 2.2, c: [0, -10], z0: 6 }, Hs = (x, y) => inflateH(shell, 30, x, y, HO);
  put(M, inflate(shell, 30, Q.paint, HO));
  // écailles imbriquées en relief
  for (let j = 0; j < 7; j++) {
    const y = -64 + j * 17, off = (j % 2) * 8;
    for (let x = -56 + off; x <= 56; x += 16) {
      if (Math.abs(x) < 9 && y > -30 && y < 40) continue;
      if (!inPoly(x, y + 7, shell) || Math.hypot(x, y - 6) < 34) continue;
      const sc = chain(qb([x - 8, y], [x - 8, y + 13], [x, y + 15], 6), qb([x, y + 15], [x + 8, y + 13], [x + 8, y], 6));
      put(M, conform(sc, Hs, 1.8, mat('lacquer', lighten(C.c1, 0.08), { rough: 0.18 }), { c: [x, y + 8], edge: 0.45, base: -0.4 }));
    }
  }
  put(M, tube((t) => { const pp = shell[Math.min(shell.length - 1, Math.floor(t * shell.length))]; return [pp[0], pp[1], 6.5]; }, () => 1.1, Q.gold, { nA: 80, nR: 6 }));
  for (const y of [-66, -52, -38]) put(M, spike(16, 5, Q.gold), { t: [0, y + 8, Hs(0, y)], r: toward(-Math.PI / 2) });
  put(M, tube((t) => [0, -70 + t * 44, Hs(0, -70 + t * 44) + 1.2], () => 1.1, Q.glow, { nA: 16, nR: 5 }));
  for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) put(M, tube((t) => { const u = 1 - t, x = sd * (u * u * (40 + k * 4) + 2 * u * t * (48 + k * 4) + t * t * (44 + k * 4)), y = u * u * (-20 + k * 10) + 2 * u * t * (-12 + k * 10) + t * t * (-2 + k * 10); return [x, y, Hs(x, y) + 0.5]; }, () => 1.2, Q.glow, { nA: 12, nR: 5 }));
  // logement du cœur, supports, colliers des cous
  { const z = Hs(0, 6); put(M, lathe([[31, 0], [31, 3], [27, 5], [26.5, 3]], Q.gold, { seg: 48 }), { t: [0, 6, z - 2] }); put(M, superq(26.5, 26.5, 2, 1, 1, Q.dark), { t: [0, 6, z] }); }
  for (const sd of [-1, 1]) { const z = Hs(sd * 30, -56); put(M, superq(15, 15, 5, 1, 1, Q.gold), { t: [sd * 30, -56, z - 1] }); put(M, superq(12, 12, 2, 1, 1, Q.armorD), { t: [sd * 30, -56, z + 3] }); }
  for (const [x, y] of HROOTS) { const z = Hs(x, y); put(M, superq(13, 13, 6, 1, 1, Q.gold), { t: [x, y, z - 1] }); put(M, superq(9.5, 9.5, 2, 1, 1, mat('gunmetal', '#08060d')), { t: [x, y, z + 4] }); put(M, sphere(5, Q.glow, { nu: 10, nv: 8 }), { t: [x, y, z + 4], s: [1, 1, 0.4] }); }
  A.body = bake(M, 160, 150, 80, 80, px);
  // épaulières
  for (const sd of [-1, 1]) {
    const Sh = M3();
    const pl = chain(qb([-26, -24], [10, -40], [32, -16], 10), qb([32, -16], [38, 10], [20, 30], 10), qb([20, 30], [-6, 36], [-24, 18], 10), qb([-24, 18], [-34, -4], [-26, -24], 10)).map(([x, y]) => [x * sd, y]);
    for (const [x0, y0, x1, y1] of [[18, -26, 40, -40], [30, -6, 46, -12], [26, 16, 42, 22]]) put(Sh, spike(Math.hypot(x1 - x0, y1 - y0) + 4, 5, Q.chrome), { t: [sd * x0, y0, 6], r: toward(Math.atan2(y1 - y0, sd * (x1 - x0))) });
    put(Sh, inflate(pl, 12, Q.hull, { p: 2 }));
    const Hp = (x, y) => inflateH(pl, 12, x, y, { p: 2 });
    put(Sh, conform(ellPts(sd * 2, -3, 26, 26, 40), Hp, 3, Q.paint, { c: [sd * 2, -3] }));
    for (let k = 0; k < 3; k++) put(Sh, tube((t) => { const a = -2.6 + t * 3.2, r = 14 + k * 7, x = sd * (2 + Math.cos(a) * r), y = -3 + Math.sin(a) * r; return [x, y, Hp(x, y) + 3.2]; }, () => 0.5, mat('matte', '#081018'), { nA: 16, nR: 5 }));
    put(Sh, gem(6, 6, 4, mat('gem', lighten(C0cg(C), 0.3), { emi: 0.7 })), { t: [sd * 2, -2, Hp(sd * 2, -2) + 3] });
    rivetRow(Sh, [[sd * -18, -14], [sd * 20, 20], [sd * -16, 14]].map(([x, y]) => [x, y, Hp(x, y) + 3]), 1.1, Q.chrome);
    A[sd < 0 ? 'shL' : 'shR'] = bake(Sh, 84, 84, 42, 42, px);
  }
  // vertèbre du cou
  const Vt = M3();
  for (const sd of [-1, 1]) put(Vt, spike(8, 3, Q.gold, 8), { t: [0, sd * 6, 4], r: toward(sd > 0 ? Math.PI / 2 : -Math.PI / 2) });
  put(Vt, superq(9, 9, 6, 1, 1, Q.hull));
  put(Vt, superq(7.4, 7.4, 5, 1, 1, Q.paint), { t: [0, -0.6, 2.4] });
  put(Vt, tube((t) => [Math.cos(t * TAU) * 8.2, Math.sin(t * TAU) * 8.2, 3], () => 0.6, Q.gold, { nA: 24, nR: 5 }));
  A.vert = bake(Vt, 30, 30, 15, 15, px);
  // tête de dragon (museau vers +y)
  const H = M3();
  for (const sd of [-1, 1]) {
    put(H, tube((t) => { const u = 1 - t, x = sd * (u * u * 7 + 2 * u * t * 18 + t * t * 27), y = u * u * -2 + 2 * u * t * -14 + t * t * -27; return [x, y, 6 + t * 3]; }, (t) => 3.4 * (1 - t) + 0.3, Q.chrome, { nA: 16, nR: 8 }));
    put(H, inflate(chain(qb([sd * 12, 8], [sd * 22, 4], [sd * 25, -6], 8), qb([sd * 25, -6], [sd * 20, 10], [sd * 14, 16], 8)), 4, Q.gold, { p: 1.6 }));
  }
  put(H, superq(15, 14, 8, 1, 1, Q.hull), { t: [0, 6, 0] });
  const skull = mirrorPts([0, -8, 11, -4, 15, 8, 14, 22, 10, 34, 6, 44, 0, 47]);
  const Hk = (x, y) => inflateH(skull, 14, x, y, { p: 2.2, c: [0, 18], z0: 3 });
  put(H, inflate(skull, 14, Q.paint, { p: 2.2, c: [0, 18], z0: 3 }));
  for (const sd of [-1, 1]) for (let k = 0; k < 4; k++) { const y = 28 + k * 4.4, x = sd * (11.6 - k * 1.5); put(H, spike(4, 1.4, mat('lacquer', '#fff6e8'), 6), { t: [x, y + 1, Hk(x, y) * 0.4], r: toward(sd > 0 ? 0.4 : Math.PI - 0.4) }); }
  put(H, conform([[0, -7], [3, 4], [2, 30], [0, 36], [-2, 30], [-3, 4]], Hk, 2.4, Q.gold, { c: [0, 14] }));
  for (const sd of [-1, 1]) { put(H, superq(4.6, 2.6, 2, 1, 1, Q.dark), { t: [sd * 8.5, 16, Hk(sd * 8.5, 16)], r: [0, 0, sd * 0.5] }); put(H, superq(3.4, 1.4, 1, 1, 1, Q.glowL), { t: [sd * 8.5, 16, Hk(sd * 8.5, 16) + 1.2], r: [0, 0, sd * 0.5] }); put(H, sphere(1.4, Q.glow, { nu: 8, nv: 6 }), { t: [sd * 3.4, 40, Hk(sd * 3.4, 40) + 0.5] }); }
  A.head = bake(H, 66, 84, 33, 30, px);
  A.turret = turret3D(Q, px, 12);
  return A;
};
const C0cg = (C) => C.cg;

BOSS3D.hive = (C, P, Q, px) => {
  const A = {}, M = M3(), honey = mat('lacquer', '#ffb43a', { rough: 0.2, emi: 0.12 }), honeyD = mat('lacquer', '#5a2a06'), black = mat('lacquer', '#1a1410', { rough: 0.22 });
  // pattes
  for (const sd of [-1, 1]) for (const [y0, y1, y2] of [[10, 34, 74], [36, 66, 104]]) {
    put(M, tube((t) => t < 0.5 ? [sd * (50 + 68 * t), y0 + (y1 - y0) * t * 2, 4] : [sd * (84 + 16 * (t - 0.5)), y1 + (y2 - y1) * (t - 0.5) * 2, 4], (t) => 2.4 * (1 - t * 0.5), Q.armorD, { nA: 24, nR: 8 }));
    put(M, sphere(3.2, Q.gold, { nu: 10, nv: 8 }), { t: [sd * 84, y1, 4] });
  }
  // abdomen rayé
  put(M, superq(46, 50, 30, 1, 1, mat('lacquer', (p) => (Math.floor((p[1] + 128) / 7.5) % 2 ? rgb('#ffb43a') : rgb('#1a1208')), { rough: 0.2, coat: 0.8 })), { t: [0, -84, 0] });
  put(M, tube((t) => [Math.cos(t * TAU) * 46, -84 + Math.sin(t * TAU) * 50, 1], () => 1.2, Q.gold, { nA: 60, nR: 6 }));
  for (const sd of [-1, 1]) { put(M, superq(14, 14, 6, 1, 1, Q.gold), { t: [sd * 38, -92, 24] }); put(M, superq(10.5, 10.5, 2, 1, 1, Q.armorD), { t: [sd * 38, -92, 29] }); }
  // plaque alvéolaire
  const hexP = (x, y, r, a = 0) => polyN(6, r, a).map(([u, v]) => [x + u, y + v]);
  const plate = hexP(0, 0, 84);
  const Hp = (x, y) => inflateH(plate, 18, x, y, { p: 3, z0: 4 });
  put(M, inflate(plate, 18, Q.hull, { p: 3, z0: 4 }));
  const Rr = 8.6, dx = Rr * 1.5, dy = Rr * Math.sqrt(3);
  for (let i = -7; i <= 7; i++) for (let j = -6; j <= 6; j++) {
    const x = i * dx, y = j * dy + (i % 2 ? dy / 2 : 0);
    if (Math.hypot(x, y) > 76 || Math.hypot(x, y) < 36 || HIVE_C.some(([a, b]) => Math.hypot(x - a, y - b) < 20)) continue;
    const lv = ((i * 7 + j * 13) % 5 + 5) % 5;
    put(M, extrude(hexP(0, 0, Rr * 0.8), 0, 2.2, lv === 0 ? emiM('#ffb43a', 1.3) : honeyD, { bevel: 0.7 }), { t: [x, y, Hp(x, y) - 1] });
  }
  put(M, tube((t) => { const a = t * TAU, r = 84 / Math.cos(((a % (TAU / 6)) - TAU / 12)) * Math.cos(TAU / 12); return [Math.cos(a) * r * 0.99, Math.sin(a) * r * 0.99, 5]; }, () => 1.8, Q.gold, { nA: 72, nR: 6 }));
  put(M, extrude(hexP(0, 0, 32, Math.PI / 6), 0, 4, Q.gold, { bevel: 1.2 }), { t: [0, 0, Hp(0, 0) - 1] });
  put(M, extrude(hexP(0, 0, 27, Math.PI / 6), 0, 1, Q.dark), { t: [0, 0, Hp(0, 0) + 2.6] });
  for (const [x, y] of HIVE_C) put(M, extrude(hexP(0, 0, 21, Math.PI / 6), 0, 3, Q.armorD, { bevel: 1 }), { t: [x, y, Hp(x, y) - 1.5] });
  // tête de la reine
  put(M, rbox(52, 10, 8, 0.3, Q.gold), { t: [0, 75, 6] });
  for (let i = -3; i <= 3; i++) put(M, spike(10 - Math.abs(i) * 1.5, 2.6, Q.gold, 8), { t: [i * 7, 72, 8], r: toward(-Math.PI / 2) });
  put(M, superq(32, 24, 18, 1, 1, black), { t: [0, 96, 2] });
  for (const sd of [-1, 1]) {
    put(M, superq(11, 15, 8, 1, 1, mat('glass', (p) => { const k = (Math.floor(p[0] * 0.6) + Math.floor(p[1] * 0.55)) % 2; return k ? rgb('#140820') : mixc(rgb(C.cg), rgb('#140820'), 0.55); }, { emi: 0.25, rough: 0.05 })), { t: [sd * 17, 96, 12], r: [0, 0, sd * 0.35] });
    put(M, tube((t) => { const u = 1 - t, x = sd * (u * u * 8 + 2 * u * t * 18 + t * t * 40), y = u * u * 112 + 2 * u * t * 128 + t * t * 126; return [x, y, 8 + 6 * t]; }, () => 1, Q.chrome, { nA: 16, nR: 5 }));
    put(M, sphere(3, emiM(C.cg, 2), { nu: 10, nv: 8 }), { t: [sd * 40, 126, 14] });
  }
  A.body = bake(M, 220, 270, 110, 135, px);
  // alvéole
  const Cl = M3();
  put(Cl, extrude(hexP(0, 0, 19, Math.PI / 6), 0, 7, Q.gold, { bevel: 1.5 }));
  put(Cl, inflate(hexP(0, 0, 15.5, Math.PI / 6), 6, mat('glass', (p) => mixc(rgb('#ffe39a'), rgb('#a8520c'), Math.min(1, Math.hypot(p[0] + 4, p[1] + 5) / 18)), { emi: 0.55 }), { z0: 6.5, p: 2.4 }));
  put(Cl, superq(6.5, 9, 3, 1, 1, mat('lacquer', '#5a2a06')), { t: [0, 1, 9], r: [0, 0, 0.3] });
  rivetRow(Cl, polyN(6, 17.2, Math.PI / 6).map(([x, y]) => [x, y, 7.4]), 1, Q.chrome);
  A.cell = bake(Cl, 46, 46, 23, 23, px);
  // ailes translucides
  for (const sd of [-1, 1]) {
    const Wg = M3();
    for (const [L, a, w] of [[86, 0.32, 15], [118, -0.18, 22]]) {
      const ca = Math.cos(a), sa = Math.sin(a);
      const lobe = chain(cb([0, -3], [L * 0.35, -w], [L * 0.85, -w * 0.9], [L, 0], 18), cb([L, 0], [L * 0.8, w * 0.7], [L * 0.3, w * 0.6], [0, 3], 18)).map(([x, y]) => [sd * (x * ca - y * sa), x * sa + y * ca]);
      put(Wg, inflate(lobe, 2, mat('glass', '#cfe8ff', { emi: 0.2, rough: 0.06 }), { p: 1.3 }));
      for (let k = 1; k <= 4; k++) put(Wg, tube((t) => { const u = 1 - t, x = u * u * L * 0.08 + 2 * u * t * L * (0.2 + k * 0.17) + t * t * L * (0.3 + k * 0.16), y = 2 * u * t * (k % 2 ? -1 : 1) * w * 0.3 + t * t * (k - 2.5) * w * 0.22; return [sd * (x * ca - y * sa), x * sa + y * ca, 2.2]; }, () => 0.45, k === 2 ? Q.glow : Q.armorD, { nA: 14, nR: 4 }));
      put(Wg, tube((t) => { const pp = lobe[Math.min(lobe.length - 1, Math.floor(t * lobe.length))]; return [pp[0], pp[1], 1]; }, () => 0.8, Q.gold, { nA: 60, nR: 5 }));
    }
    put(Wg, superq(7, 7, 5, 1, 1, Q.gold));
    A[sd < 0 ? 'wingL' : 'wingR'] = bake(Wg, 136, 92, sd < 0 ? 126 : 10, 46, px, { outline: 0 });
  }
  // mandibule
  const Md = M3();
  put(Md, inflate(chain(qb([-5, -4], [10, 6], [7, 30], 10), qb([7, 30], [4, 36], [-2, 38], 6), qb([-2, 38], [2, 22], [-7, 6], 10)), 6, Q.chrome, { p: 1.6 }));
  for (let k = 0; k < 4; k++) put(Md, spike(4, 1.4, mat('lacquer', '#fff4e0'), 6), { t: [-1.5 - k * 0.4, 14 + k * 6, 2.5], r: toward(Math.PI) });
  put(Md, superq(5.5, 5.5, 4, 1, 1, Q.gold));
  A.mand = bake(Md, 34, 46, 17, 8, px);
  // dard
  const St = M3();
  put(St, lathe([[2.6, 0], [0, 34]], Q.chrome, { seg: 10 }), { t: [0, 8, 5], r: toward(Math.PI / 2) });
  put(St, superq(11, 11, 7, 1, 1, Q.armorD));
  put(St, superq(8.6, 8.6, 6, 1, 1, mat('lacquer', (p) => (Math.floor((p[1] + 9) / 4) % 2 ? rgb('#ffb43a') : rgb('#1a1208')))), { t: [0, 1, 2] });
  put(St, sphere(2, Q.glowL, { nu: 8, nv: 6 }), { t: [0, 9, 7] });
  A.sting = bake(St, 28, 56, 14, 13, px);
  return A;
};
const HIVE_C = [0, 1, 2, 3, 4, 5].map((k) => { const a = (k / 6) * TAU; return [Math.cos(a) * 58, Math.sin(a) * 58]; });

// Palette propre à chaque colosse (peinture principale, secondaire), légèrement teintée par le monde
const ARCH_COL = {
  crab: ['#8a1622', '#3c4250'], jelly: ['#1a3c9a', '#4a1e7a'], flower: ['#a8164f', '#1e6a3a'], eye: ['#3a1650', '#6a1a2a'],
  mantis: ['#17603c', '#c8a040'], worm: ['#6a3e18', '#2a2f38'], heart: ['#7e0c22', '#3a0a14'], dread: ['#2c3444', '#8a1a22'],
  ring: ['#b8c2d4', '#2a6a9a'], seraph: ['#e6ddc8', '#c8a050'], hydra: ['#0f5260', '#1c2a40'], hive: ['#c88418', '#1a1410'],
};
export function buildBoss3D(arch, C0, P0, px) {
  if (!has3D() || !BOSS3D[arch]) return null;
  const ac = ARCH_COL[arch] || [C0.c1, C0.c2];
  const C = { ...C0, c1: ac[0], c2: ac[1] }; // la couleur du monde reste sur les lueurs (C.cg)
  const P = { ...P0, lacq: darken(C.c1, 0.1), lacqD: darken(C.c1, 0.5), lacqL: lighten(C.c1, 0.15), sec: darken(C.c2, 0.1), secD: darken(C.c2, 0.5), secL: lighten(C.c2, 0.15), flesh: C.c2, fleshD: darken(C.c2, 0.45) };
  const Q = pal(C, P);
  LIGHT = { keyC: [3.1, 2.85, 2.5], fillC: [0.3, 0.42, 0.85], rim: mulc(rgb(C0.cg), 0.75), sky: [0.32, 0.38, 0.6], ground: [0.05, 0.04, 0.07], hor: [0.22, 0.2, 0.3], exp: 1.05 };
  try {
    const A = BOSS3D[arch](C, P, Q, px);
    A.wounds = [15, 26, 36].map((r) => ({ r, s: wound3D(Q, px, r) }));
    A.core = { r: 24, s: coreOrb3D(Q, px, 24) };
    A.chunks = [1, 2, 3].map((k) => chunk3D(Q, px, 14, 70 + k));
    A.is3D = true;
    return A;
  } catch (e) { console.warn('boss 3D', arch, e); return null; }
}
