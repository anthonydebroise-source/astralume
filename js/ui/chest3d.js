// Coffres en vraie 3D (modélisés en code, éclairés en studio, cuits une fois)
// Repère du modèle : x largeur, y profondeur (+ = face avant), z hauteur (vers le haut / la caméra).
import { Mesh, mat, rgb, mixc, rbox, sphere, superq, lathe, tube, extrude, gem, surface, bake3D, has3D } from '../engine/gl3d.js';

const W = 64, Dp = 40, HB = 28, RL = 20; // largeur, profondeur, hauteur du corps, rayon du couvercle
const VIEW = { pitch: 1.02, yaw: -0.42 };
// studio : sol chaud et clair pour que l'or reste doré sur les faces tournées vers le bas
const LIGHT = { ground: [0.55, 0.42, 0.3], hor: [0.75, 0.68, 0.7], sky: [0.85, 0.9, 1.05] };
const STY = {
  neon: { body: mat('lacquer', '#141a2a', { rough: 0.3 }), trim: mat('chrome', '#d6dde8'), lid: mat('lacquer', '#0f2c78'), panel: mat('glass', '#071226'), glow: '#38f2ff', gem: '#38f2ff' },
  prism: { body: mat('lacquer', '#3a1660'), trim: mat('gold', '#e8b04a'), lid: mat('glass', '#7a2fd0', { rough: 0.06 }), panel: mat('glass', '#5a1890'), glow: '#ff5fd0', gem: '#ff6ae0' },
  astral: { body: mat('lacquer', '#ece3cf', { bump: 0.12, freq: 0.3 }), trim: mat('gold', '#f0bf55'), lid: mat('lacquer', '#1d2f8a'), panel: mat('glass', '#14206a'), glow: '#ffd86b', gem: '#ffe58a' },
  boss: { body: mat('gunmetal', '#2a1418', { rough: 0.35 }), trim: mat('gold', '#c98a34', { rough: 0.3 }), lid: mat('lacquer', '#5c0a1c'), panel: mat('lacquer', '#1a0408'), glow: '#ff4f6e', gem: '#ff2a4a' },
};
const emi = (col, k = 1.6) => mat('emissive', col, { emi: k });

function star2D(r0, r1, n = 5) { const p = []; for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + (i / (n * 2)) * Math.PI * 2, r = i % 2 ? r1 : r0; p.push([Math.cos(a) * r, Math.sin(a) * r]); } return p; }
// tourne un sous-maillage pour qu'une face « xy » regarde vers l'avant (+y)
const FRONT = [-Math.PI / 2, 0, 0];
const onLid = (f) => [f - Math.PI / 2, 0, 0]; // pose un élément plat sur la surface du couvercle

function buildBase(id) {
  const S = STY[id], M = new Mesh();
  // corps
  M.add(rbox(W, Dp, HB, 0.16, S.body), { t: [0, 0, HB / 2] });
  // intérieur sombre + trésor (visible quand le couvercle se lève)
  M.add(rbox(W - 8, Dp - 8, 2, 0.2, mat('matte', '#070308')), { t: [0, 0, HB + 0.2] });
  const coin = lathe([[0, -0.8], [4.4, -0.8], [4.6, 0], [4.4, 0.8], [0, 0.8]], mat('gold', '#f2c050'), { seg: 18 });
  let sd = 7;
  const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 26; i++) { const x = (rnd() - 0.5) * (W - 18), y = (rnd() - 0.5) * (Dp - 16), h = 4 * (1 - Math.hypot(x / 30, y / 18)) + rnd() * 2; M.add(coin, { t: [x, y, HB + 1 + Math.max(0, h)], r: [rnd() * 0.9 - 0.45, rnd() * 0.9 - 0.45, rnd() * 3] }); }
  for (let i = 0; i < 4; i++) M.add(gem(3.4, 4, 6, mat('gem', [S.gem, '#7dfcff', '#ff3a6a', '#7dff9a'][i])), { t: [-16 + i * 11, (i % 2 ? -4 : 5), HB + 5], r: [0.4, 0.3 * i, 0] });
  // soubassement, ceinture et arêtes en métal
  M.add(rbox(W + 3, Dp + 3, 4.5, 0.3, S.trim), { t: [0, 0, 2.2] });
  M.add(rbox(W + 1.6, Dp + 1.6, 3.4, 0.3, S.trim), { t: [0, 0, HB * 0.62] });
  M.add(rbox(W + 2, Dp + 2, 2.6, 0.3, S.trim), { t: [0, 0, HB - 0.6] });
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
    M.add(rbox(7, 7, HB + 1, 0.22, S.trim), { t: [sx * (W / 2 - 1.5), sy * (Dp / 2 - 1.5), HB / 2] });
    for (const z of [5, HB * 0.62, HB - 4]) M.add(sphere(1.1, S.trim, { nu: 10, nv: 8 }), { t: [sx * (W / 2 + 2), sy * (Dp / 2 - 1.5) + (sy > 0 ? 2 : -2), z] });
    // pieds griffus
    M.add(superq(4.2, 4.2, 3.2, 0.9, 1, S.trim), { t: [sx * (W / 2 - 2), sy * (Dp / 2 - 2), -1] });
  }
  // panneaux de façade
  for (const sx of [-1, 1]) {
    M.add(rbox(19, 2, 9, 0.25, S.panel), { t: [sx * 16, Dp / 2 + 0.3, 8.6] });
    if (id === 'neon') for (let i = 0; i < 3; i++) M.add(rbox(15, 0.8, 0.8, 0.5, emi(S.glow, 2)), { t: [sx * 16, Dp / 2 + 1.4, 5.8 + i * 2.8] });
    else if (id === 'prism') M.add(gem(3.2, 5, 6, mat('gem', '#ff9af0')), { t: [sx * 16, Dp / 2 + 1.6, 8.6], r: FRONT });
    else if (id === 'astral') M.add(extrude(star2D(4, 1.7), -0.6, 0.6, emi('#fff0b0', 1.2)), { t: [sx * 16, Dp / 2 + 1.5, 8.6], r: FRONT });
    else M.add(extrude([[-6, -3], [6, 3], [6, 4.4], [-6, -1.6]], -0.5, 0.5, emi(S.glow, 1.6)), { t: [sx * 16, Dp / 2 + 1.4, 8.6], r: FRONT });
  }
  // serrure : plaque en écusson + gemme (ou œil pour le colosse)
  const shield = [[-7, -9], [7, -9], [7, 2], [0, 9], [-7, 2]];
  M.add(extrude(shield, -1.4, 1.4, S.trim, { bevel: 0.9 }), { t: [0, Dp / 2 + 1.2, HB * 0.55], r: FRONT });
  if (id === 'boss') {
    M.add(sphere(4.2, mat('lacquer', '#f4ead8')), { t: [0, Dp / 2 + 2.2, HB * 0.55 + 0.6], s: [1.2, 0.6, 1] });
    M.add(sphere(2.4, mat('glass', '#ff1a30', { emi: 0.6 })), { t: [0, Dp / 2 + 4.4, HB * 0.55 + 0.6], s: [1, 0.4, 1] });
    M.add(superq(0.7, 0.5, 2.1, 1, 1, mat('matte', '#05000a')), { t: [0, Dp / 2 + 5.2, HB * 0.55 + 0.6] });
  } else {
    M.add(gem(4.6, 6, 8, mat('gem', S.gem)), { t: [0, Dp / 2 + 2.6, HB * 0.55 + 1], r: FRONT });
  }
  // poignée latérale (anneau)
  M.add(tube((t) => [W / 2 + 2.8, Math.cos(t * Math.PI * 2) * 4.2, HB * 0.5 + Math.sin(t * Math.PI * 2) * 4.2 - 3], () => 0.9, S.trim, { nA: 24, nR: 8 }));
  // ornements latéraux
  if (id === 'astral') {
    const wing = [[0, 0], [8, -10], [6, -20], [13, -12], [18, -2], [12, 2], [15, 9], [7, 6], [0, 10]];
    M.add(extrude(wing, -1, 1, S.trim, { bevel: 0.7 }), { t: [W / 2 + 2, 2, HB * 0.62], r: FRONT, s: [1.1, 1.1, 1] });
    M.add(extrude(wing.map(([x, y]) => [-x, y]), -1, 1, S.trim, { bevel: 0.7 }), { t: [-W / 2 - 2, 2, HB * 0.62], r: FRONT, s: [1.1, 1.1, 1] });
  } else if (id === 'boss') {
    for (const sx of [-1, 1]) for (const z of [8, 19]) M.add(lathe([[2.4, 0], [0, 7]], mat('chrome', '#ece4dc'), { seg: 12 }), { t: [sx * (W / 2 + 3), Dp / 2 - 6, z], r: [0, sx * Math.PI / 2, 0] });
  } else if (id === 'neon') {
    M.add(rbox(1, Dp - 12, 1, 0.5, emi(S.glow, 2)), { t: [W / 2 + 0.9, 0, HB * 0.35] });
  }
  return M;
}
function buildLid(id, open) {
  const S = STY[id], L = new Mesh();
  // couvercle en demi-cylindre, coordonnées relatives à la charnière (arrière : y = -Dp/2, z = HB)
  const P = (x, f, r = RL) => [x, Dp / 2 + Math.cos(f) * r, Math.sin(f) * r]; // f : 0 = avant, PI = arrière
  const lid = surface((u, v) => P(-W / 2 + u * W, v * Math.PI), 40, 30, S.lid);
  L.add(lid);
  for (const sx of [-1, 1]) L.add(surface((u, v) => { const r = u * RL, f = v * Math.PI; return [sx * W / 2, Dp / 2 + Math.cos(f) * r, Math.sin(f) * r]; }, 10, 24, S.lid));
  // sangles et bordures qui épousent la courbe
  const straps = id === 'prism' ? [-W / 2 + 3, W / 2 - 3] : [-W / 2 + 3, 0, W / 2 - 3];
  for (const x of straps) {
    L.add(tube((t) => P(x, t * Math.PI, RL + 0.6), () => 2.6, S.trim, { nA: 36, nR: 10 }));
    for (const f of [0.5, 1.2, 1.9, 2.6]) L.add(sphere(1.1, S.trim, { nu: 10, nv: 8 }), { t: P(x, f, RL + 3) });
    if (id === 'boss') L.add(lathe([[2.2, 0], [0, 9]], mat('chrome', '#efe6dc'), { seg: 12 }), { t: P(x, Math.PI / 2, RL + 2), r: [0, 0, 0] });
    if (id === 'neon') L.add(tube((t) => P(x, 0.15 + t * (Math.PI - 0.3), RL + 3.2), () => 0.55, emi(S.glow, 2.2), { nA: 30, nR: 6 }));
  }
  L.add(tube((t) => [-W / 2 - 1 + t * (W + 2), Dp / 2 + 0.4, 0.4], () => 1.8, S.trim, { nA: 10, nR: 10 }));
  for (const sx of [-1, 1]) L.add(tube((t) => P(sx * (W / 2 + 0.6), t * Math.PI, RL + 0.2), () => 1.6, S.trim, { nA: 30, nR: 8 }));
  // ornements propres
  const top = P(0, Math.PI / 2 - 0.15, RL);
  if (id === 'neon') {
    const hex = []; for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; hex.push([Math.cos(a) * 7, Math.sin(a) * 7]); }
    L.add(extrude(hex, -1.2, 1.2, S.trim), { t: P(0, 0.95, RL + 0.8), r: onLid(0.95) });
    L.add(sphere(3.2, emi(S.glow, 2.4)), { t: P(0, 0.95, RL + 2.2), r: onLid(0.95), s: [1, 1, 0.6] });
  } else if (id === 'prism') {
    for (const [x, f, h, lean] of [[-14, 1.55, 18, -0.3], [-2, 1.7, 26, 0.05], [10, 1.5, 15, 0.35], [3, 1.15, 11, 0.6], [-9, 1.25, 10, -0.5]]) {
      const b = P(x, f, RL - 1);
      L.add(lathe([[3.4, 0], [3.9, h * 0.22], [0, h]], mat('gem', '#c77dff', { emi: 0.35, flat: true }), { seg: 6, nv: 2 }), { t: b, r: [f - Math.PI / 2 + lean * 0.5, lean, 0] });
    }
  } else if (id === 'astral') {
    L.add(superq(9, 9, 1.6, 1, 1, mat('glass', '#5a8cff', { emi: 0.5 })), { t: P(0, 0.95, RL + 0.6), r: onLid(0.95) });
    L.add(tube((t) => [Math.cos(t * Math.PI * 2) * 9.6, Math.sin(t * Math.PI * 2) * 9.6, 0], () => 1.1, S.trim, { nA: 32, nR: 8 }), { t: P(0, 0.95, RL + 1), r: onLid(0.95) });
    L.add(extrude(star2D(11, 4.6), -1.6, 1.6, S.trim, { bevel: 1 }), { t: [top[0], top[1], top[2] + 10], r: FRONT });
    for (let i = 0; i < 7; i++) { const f = 0.4 + (i % 3) * 0.55; L.add(extrude(star2D(2, 0.8), -0.3, 0.3, emi('#fff6c8', 1.4)), { t: P(-26 + i * 9, f, RL + 0.4), r: onLid(f) }); }
  } else if (id === 'boss') {
    for (const sx of [-1, 1]) L.add(tube((t) => { const b = P(sx * (W / 2 - 6), 1.25, RL); return [b[0] + sx * (t * 14 + Math.sin(t * 2.6) * 2), b[1] - t * 4, b[2] + t * 20 - t * t * 6]; }, (t) => 3.6 * (1 - t) + 0.4, mat('lacquer', '#f2e8d8', { rough: 0.25 }), { nA: 26, nR: 10 }));
    L.add(sphere(3, emi('#ff2a3e', 2)), { t: P(0, 0.95, RL + 1.4), s: [1.4, 1, 0.5] });
  }
  const O = new Mesh();
  O.add(L, { t: [0, -Dp / 2, 0], r: [open || 0, 0, 0] });
  return O;
}
function place(m, z = HB) { const O = new Mesh(); O.add(m, { t: [0, 0, z] }); return O; }
// Socle hexagonal en métal avec anneau lumineux
function buildPad(id) {
  const S = STY[id], M = new Mesh();
  M.add(lathe([[0, -6], [50, -6], [52, -3], [52, 0], [0, 0]], mat('gunmetal', '#15122a', { rough: 0.55 }), { seg: 6 }));
  M.add(lathe([[0, 0.2], [38, 0.2], [0, 0.4]], mat('glass', '#0a0820', { rough: 0.1 }), { seg: 6 }));
  M.add(tube((t) => { const a = t * Math.PI * 2; return [Math.cos(a) * 42, Math.sin(a) * 42, 0.4]; }, () => 1.2, emi(S.glow, 2.2), { nA: 60, nR: 8 }));
  M.add(tube((t) => { const a = t * Math.PI * 2; return [Math.cos(a) * 52.5, Math.sin(a) * 52.5, -1.5]; }, () => 1.4, S.trim, { nA: 6, nR: 8 }));
  return M;
}

const cache = new Map();
const BOX = { w: 130, h: 130, ox: 65, oy: 90 };
export const LID_STEPS = [0, 0.25, 0.55, 0.9, 1.3, 1.75];
export function chest3D(id, px, step = 0) {
  if (!has3D()) return null;
  px = Math.max(1.5, Math.min(5, Math.ceil(px * 2) / 2));
  const k = id + '|' + px;
  let A = cache.get(k);
  if (!A) {
    const o = { ...BOX, px, ...VIEW, outline: 0.8, light: LIGHT };
    A = { base: bake3D(buildBase(id), o), pad: bake3D(buildPad(id), { ...o, outline: 0, pitch: 1.02, yaw: 0 }), lids: [] };
    if (cache.size > 12) cache.clear();
    cache.set(k, A);
  }
  if (!A.lids[step]) A.lids[step] = bake3D(place(buildLid(id, LID_STEPS[step])), { ...BOX, px, ...VIEW, outline: 0.8, light: LIGHT });
  return A;
}
// position écran (unités) d'un point du modèle, pour les effets dessinés par-dessus
export function chestProject(p) {
  const { pitch, yaw } = VIEW, cx = Math.cos(pitch), sx = Math.sin(pitch), cy = Math.cos(yaw), sy = Math.sin(yaw);
  const y1 = cx * p[1] - sx * p[2], z1 = sx * p[1] + cx * p[2];
  return [cy * p[0] + sy * z1, y1];
}
export const CHEST_DIM = { W, Dp, HB, RL };
