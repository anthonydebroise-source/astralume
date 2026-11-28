// Coffres sculptés (corps + couvercle articulé) et roue de la fortune « casino »
import { ctx, setT, baseT, view } from '../engine/renderer.js';
import { glow, makeCanvas } from '../engine/sprites.js';
import { TAU, rgba, lighten, darken } from '../engine/math.js';
import { Sculptor, drawSculpt, drawBloom } from '../engine/sculpt.js';
import { ICONS } from '../game/art.js';
import { chest3D, LID_STEPS } from './chest3d.js';

const STEEL = '#c3cad8', GOLD = '#ecb44e', DARK = '#1a1c28';
const circ = (x, y, r) => (g) => g.arc(x, y, r, 0, TAU);
const vg = (y0, y1, a, b) => (g) => { const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, a); gr.addColorStop(1, b); return gr; };
const rr = (x, y, w, h, r) => (g) => { g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
const mk = (w, h, px, ox, oy, rim) => new Sculptor(w, h, px, { ox, oy, depth: 10, bevel: 0.6, rim, rimK: 0.8, outline: 0.9, ao: 0.6, env: ['#b8d4ff', '#202430', '#ffffff'], amb: 0.36 });

// ---------- Coffres ----------
// Vue de trois quarts : façade, flanc droit, couvercle bombé en vrai volume (demi-cylindre),
// sangles qui épousent la courbe, socle lumineux, ornements propres à chaque coffre.
const STYLE = {
  neon: { body: '#1c2232', bodyMat: 'gloss', lid: '#1a3c8a', lidMat: 'gloss', panel: '#0a1630', panelMat: 'glass', accent: '#38f2ff', trim: STEEL, trimMat: 'chrome', gem: '#38f2ff', glow: '#38f2ff' },
  prism: { body: '#3a1d5c', bodyMat: 'gloss', lid: '#a24cff', lidMat: 'glass', panel: '#6a1fa8', panelMat: 'glass', accent: '#ff5fd0', trim: GOLD, trimMat: 'gold', gem: '#ff7ae6', glow: '#d07bff' },
  astral: { body: '#efe6d2', bodyMat: 'gloss', lid: '#2a3f9a', lidMat: 'gloss', panel: '#1b2466', panelMat: 'glass', accent: '#ffd23f', trim: GOLD, trimMat: 'gold', gem: '#ffe58a', glow: '#ffd86b' },
  boss: { body: '#1d1418', bodyMat: 'gloss', lid: '#6e0f22', lidMat: 'gloss', panel: '#2a0a10', panelMat: 'gloss', accent: '#ff3a4e', trim: '#d49a3a', trimMat: 'gold', gem: '#ff2a4a', glow: '#ff4f6e' },
};
const D = [12, -9], RV = 21, X0 = -34, X1 = 28, YB = -2, YF = 34;
// point du couvercle : abscisse x, angle t (0 = bord avant, PI = bord arrière)
const LP = (x, t) => [x + D[0] * (0.5 - 0.5 * Math.cos(t)), YB + D[1] * (0.5 - 0.5 * Math.cos(t)) - RV * Math.sin(t)];
const poly = (pts) => (g) => { g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); };
const line = (pts) => (g) => { g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); };
const TT = Math.PI - Math.atan(RV / (-0.5 * D[1])); // angle du sommet visible du couvercle
const arcPts = (x, n = 20, t1 = Math.PI, t0 = 0) => { const a = []; for (let i = 0; i <= n; i++) a.push(LP(x, t0 + (i / n) * (t1 - t0))); return a; };
const shade = (col, k) => (k >= 0.5 ? lighten(col, (k - 0.5) * 0.9) : darken(col, (0.5 - k) * 1.1));
const chestCache = new Map();
function chestArt(id, px) {
  px = Math.max(1.5, Math.min(10, Math.ceil(px * 2) / 2));
  const k = id + '|' + px;
  let A = chestCache.get(k);
  if (A) return A;
  const St = STYLE[id] || STYLE.neon, T = St.trim, TM = St.trimMat, light = TM === 'gold' ? '#fff1c0' : '#ffffff';
  // ===== Corps =====
  const B = mk(100, 66, px, 46, 20, St.accent);
  const side = poly([[X1, YB], [X1 + D[0], YB + D[1]], [X1 + D[0], YF + D[1]], [X1, YF]]);
  B.paint(side, { c: vg(-11, 34, shade(St.body, 0.36), shade(St.body, 0.12)), mat: St.bodyMat, h: (s) => s.hLin(X1, 0, X1 + D[0], 0, 0.5, 0.2) });
  B.paint(rr(X0, YB, X1 - X0, YF - YB, 2.5), { c: vg(YB, YF, shade(St.body, 0.62), shade(St.body, 0.28)), mat: St.bodyMat, h: (s) => s.hCyl(X0, 0, X1, 0, 0.55, 0.32) });
  // panneaux de façade
  const pw = (X1 - X0 - 26) / 2;
  for (const px0 of [X0 + 7, X1 - 7 - pw]) {
    B.paint(rr(px0, YB + 16, pw, 13, 2), { c: vg(YB + 16, YB + 29, lighten(St.panel, 0.25), darken(St.panel, 0.35)), mat: St.panelMat, h: 0.06, hm: 'add' });
    if (id === 'neon') for (let i = 0; i < 3; i++) B.light((g) => g.rect(px0 + 2, YB + 18.5 + i * 3.6, pw - 4, 0.9), rgba(St.accent, 0.9), 1.5);
    else if (id === 'prism') { B.stroke((g) => { g.moveTo(px0 + 2, YB + 28); g.lineTo(px0 + pw * 0.4, YB + 17); g.lineTo(px0 + pw * 0.7, YB + 28); g.moveTo(px0 + pw * 0.55, YB + 17); g.lineTo(px0 + pw - 2, YB + 26); }, { c: 'rgba(255,220,255,0.55)', w: 0.6, h: 0.04 }); B.light((g) => g.arc(px0 + pw * 0.4, YB + 20, 1.2, 0, TAU), '#ffd6ff', 2); }
    else if (id === 'astral') for (let i = 0; i < 5; i++) B.light((g) => { const x = px0 + 3 + ((i * 7) % (pw - 5)), y = YB + 18 + ((i * 5) % 9); g.arc(x, y, i % 2 ? 0.6 : 0.9, 0, TAU); }, '#fff6c8', 2);
    if (id === 'boss') B.stroke((g) => { g.moveTo(px0 + 3, YB + 19); g.lineTo(px0 + pw - 3, YB + 27); g.moveTo(px0 + pw - 3, YB + 19); g.lineTo(px0 + 3, YB + 27); }, { c: '#ff3a4e', w: 0.8, emi: 'rgba(255,60,80,0.9)', ew: 1.4 });
  }
  // bandeau, arêtes et soubassement en métal
  B.paint((g) => g.rect(X0, YB + 8, X1 - X0, 4.5), { c: vg(YB + 8, YB + 12.5, light, T), mat: TM, h: (s) => s.hLin(0, YB + 8, 0, YB + 12.5, 0.5, 0.2), hm: 'add' });
  B.paint(poly([[X1, YB + 8], [X1 + D[0], YB + 8 + D[1]], [X1 + D[0], YB + 12.5 + D[1]], [X1, YB + 12.5]]), { c: darken(T, 0.35), mat: TM, h: 0.1, hm: 'add' });
  B.paint((g) => g.rect(X0, YF - 5, X1 - X0, 5), { c: vg(YF - 5, YF, T, darken(T, 0.45)), mat: TM, h: 0.12, hm: 'add' });
  B.paint(poly([[X1, YF - 5], [X1 + D[0], YF - 5 + D[1]], [X1 + D[0], YF + D[1]], [X1, YF]]), { c: darken(T, 0.5), mat: TM, h: 0.08, hm: 'add' });
  for (const [xa, xb] of [[X0, X0 + 6], [X1 - 6, X1]]) {
    B.paint(rr(xa, YB, xb - xa, YF - YB, 1.5), { c: vg(YB, YF, light, darken(T, 0.3)), mat: TM, h: (s) => s.hCyl(xa, 0, xb, 0, 0.7, 0.4), hm: 'add' });
    B.rivets([[(xa + xb) / 2, YB + 4], [(xa + xb) / 2, YB + 18], [(xa + xb) / 2, YF - 8]], 1.1, light);
  }
  B.stroke(line([[X1 + D[0], YB + D[1]], [X1 + D[0], YF + D[1]]]), { c: darken(T, 0.2), mat: TM, w: 2.2, h: 0.2 });
  // poignée sur le flanc
  B.stroke((g) => g.ellipse(X1 + D[0] / 2, YB + 18 + D[1] / 2, 3.2, 5, -0.6, 0, TAU), { c: T, mat: TM, w: 1.6, h: 0.35 });
  // pieds griffus
  for (const [fx, fy] of [[X0 + 3, YF], [X1 - 3, YF], [X1 + D[0] - 2, YF + D[1]]]) B.paint((g) => { g.moveTo(fx - 4, fy - 1); g.lineTo(fx + 4, fy - 1); g.quadraticCurveTo(fx + 5, fy + 5, fx, fy + 6); g.quadraticCurveTo(fx - 5, fy + 5, fx - 4, fy - 1); g.closePath(); }, { c: vg(fy, fy + 6, light, darken(T, 0.4)), mat: TM, h: (s) => s.hRad(fx, fy + 2, 5, 0.6, 0.2) });
  // serrure
  const LX = (X0 + X1) / 2;
  const plate = (g) => { g.moveTo(LX - 8, YB + 1); g.lineTo(LX + 8, YB + 1); g.lineTo(LX + 8, YB + 15); g.quadraticCurveTo(LX + 8, YB + 22, LX, YB + 25); g.quadraticCurveTo(LX - 8, YB + 22, LX - 8, YB + 15); g.closePath(); };
  B.paint(plate, { c: vg(YB, YB + 25, light, darken(T, 0.35)), mat: TM, h: (s) => s.hRad(LX, YB + 10, 14, 0.85, 0.35) });
  B.stroke(plate, { c: darken(T, 0.5), w: 0.7, h: -0.05 });
  if (id === 'boss') {
    B.paint((g) => g.ellipse(LX, YB + 12, 6, 4.2, 0, 0, TAU), { c: '#fff4d8', mat: 'gloss', h: (s) => s.hDome(LX, YB + 12, 6, 0.9, 0.5) });
  } else {
    const gem = (g) => { g.moveTo(LX, YB + 5); g.lineTo(LX + 5.5, YB + 11); g.lineTo(LX, YB + 19); g.lineTo(LX - 5.5, YB + 11); g.closePath(); };
    B.paint(gem, { c: (g) => { const gr = g.createRadialGradient(LX - 2, YB + 9, 0, LX, YB + 12, 8); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.35, St.gem); gr.addColorStop(1, darken(St.gem, 0.55)); return gr; }, mat: 'glass', h: (s) => s.hRad(LX, YB + 11, 7, 0.9, 0.4) });
    B.stroke((g) => { g.moveTo(LX - 5.5, YB + 11); g.lineTo(LX + 5.5, YB + 11); g.moveTo(LX, YB + 5); g.lineTo(LX, YB + 19); }, { c: 'rgba(255,255,255,0.5)', w: 0.4, h: 0.03 });
    B.light((g) => g.arc(LX - 1.5, YB + 9, 1.4, 0, TAU), '#ffffff', 2);
  }
  // ailes dorées (astral) / épines (colosse) sur le flanc
  if (id === 'astral') {
    const wing = (g) => { const bx = X1 + D[0] + 1, by = YB + 14 + D[1]; g.moveTo(bx, by); g.quadraticCurveTo(bx + 12, by - 16, bx + 4, by - 26); g.quadraticCurveTo(bx + 14, by - 18, bx + 18, by - 8); g.quadraticCurveTo(bx + 10, by - 2, bx + 14, by + 6); g.quadraticCurveTo(bx + 6, by + 4, bx, by + 10); g.closePath(); };
    B.paint(wing, { c: vg(-30, 20, '#fff8e0', GOLD), mat: 'gold', h: (s) => s.hLin(X1 + D[0], 0, X1 + D[0] + 18, 0, 0.6, 0.2) });
    for (let i = 0; i < 3; i++) B.stroke((g) => { const bx = X1 + D[0] + 2, by = YB + 14 + D[1]; g.moveTo(bx + 2, by - 2 + i * 4); g.quadraticCurveTo(bx + 8, by - 10 + i * 5, bx + 14, by - 9 + i * 7); }, { c: 'rgba(140,90,20,0.6)', w: 0.5, h: -0.04 });
  } else if (id === 'boss') {
    for (const [sx, sy] of [[X0 - 1, YB + 6], [X0 - 1, YB + 22]]) B.paint((g) => { g.moveTo(sx, sy - 3); g.lineTo(sx - 7, sy); g.lineTo(sx, sy + 3); g.closePath(); }, { c: '#e8e0d8', mat: 'chrome', h: 0.4 });
  }
  // lueur du trésor dans la fente
  B.stroke(line([[X0 + 1, YB], [X1, YB], [X1 + D[0], YB + D[1]]]), { emi: rgba(St.accent, 0.9), ew: 1.4, w: 0.01 });
  // ===== Couvercle (demi-cylindre) =====
  const L = mk(104, 70, px, 46, 56, St.accent);
  // surface bombée d'un seul tenant (pas de bandes) : relief cylindrique de haut en bas
  const YT = LP(0, TT)[1];
  const lidBody = poly([...arcPts(X0, 18, TT), ...arcPts(X1, 18, TT).reverse()]);
  const lidCol = id === 'astral' ? ['#5a74e0', St.lid, darken(St.lid, 0.45)] : [lighten(St.lid, 0.45), St.lid, darken(St.lid, 0.5)];
  L.paint(lidBody, { c: (g) => { const gr = g.createLinearGradient(0, YT, 0, YB); gr.addColorStop(0, lidCol[0]); gr.addColorStop(0.45, lidCol[1]); gr.addColorStop(1, lidCol[2]); return gr; }, mat: St.lidMat, h: (s) => s.hCyl(0, YT - 1, 0, YB + 1, 0.85, 0.2) });
  if (id === 'prism') { // facettes de cristal
    for (let i = 0; i < 7; i++) { const x0 = X0 + 4 + i * 9; L.paint(poly([LP(x0, 0.1), LP(x0 + 6, 0.1), LP(x0 + 10, TT * 0.55), LP(x0 + 3, TT * 0.9)]), { c: i % 2 ? 'rgba(255,220,255,0.22)' : 'rgba(60,0,110,0.25)', h: 0.05, hm: 'add' }); }
  } else if (id === 'neon') { // lignes de carénage
    for (const t of [0.55, 1.15]) L.stroke(line([LP(X0 + 2, t), LP(X1 - 2, t)]), { c: 'rgba(0,0,0,0.35)', w: 0.6, h: -0.05 });
  } else if (id === 'astral') { // constellation peinte sur le couvercle
    for (let i = 0; i < 9; i++) { const [sx, sy] = LP(X0 + 5 + ((i * 13) % 56), 0.3 + ((i * 7) % 10) / 10 * (TT - 0.5)); L.light((g) => g.arc(sx, sy, i % 3 ? 0.55 : 0.9, 0, TAU), '#fff6c8', 1.6); }
  }
  // flanc du couvercle (demi-disque)
  const cap = poly(arcPts(X1, 22));
  L.paint(cap, { c: vg(YB - RV - 9, YB, shade(St.lid, 0.42), shade(St.lid, 0.16)), mat: St.lidMat, h: (s) => s.hLin(X1, 0, X1 + D[0], 0, 0.5, 0.25) });
  L.stroke(line(arcPts(X1, 22)), { c: T, mat: TM, w: 2.6, h: 0.25 });
  // sangles qui suivent la courbe
  const straps = id === 'prism' ? [X0 + 3, X1 - 3] : [X0 + 3, (X0 + X1) / 2, X1 - 3];
  for (const sx of straps) {
    L.stroke(line(arcPts(sx, 16, TT + 0.05)), { c: darken(T, 0.45), w: 6.2, h: 0.2, mat: TM });
    L.stroke(line(arcPts(sx, 16, TT + 0.05)), { c: T, w: 4.6, h: 0.35, mat: TM });
    L.stroke(line(arcPts(sx - 1.2, 10, TT * 0.85, TT * 0.25)), { c: light, w: 1, h: 0.05, a: 0.8 });
    for (const t of [0.35, 0.95, 1.5]) { const [rx, ry] = LP(sx, t); L.rivets([[rx, ry]], 0.9, light); }
    if (id === 'boss') { const [tx, ty] = LP(sx, Math.PI / 2); L.paint((g) => { g.moveTo(tx - 2.5, ty + 1); g.lineTo(tx, ty - 8); g.lineTo(tx + 2.5, ty + 1); g.closePath(); }, { c: '#efe6dc', mat: 'chrome', h: 0.6 }); }
  }
  // bord avant du couvercle
  L.stroke(line([LP(X0, 0), LP(X1, 0)]), { c: T, mat: TM, w: 2.6, h: 0.3 });
  L.stroke(line([LP(X0, 0.02), LP(X1, 0.02)]), { emi: rgba(St.accent, 0.6), ew: 1.2, w: 0.01 });
  // ornements propres
  const [cx, cy] = LP((X0 + X1) / 2, 1.05);
  if (id === 'neon') {
    for (const x of [X0 + 12, X1 - 12]) L.stroke(line(arcPts(x, 14, TT, 0.15)), { c: '#0b1a33', w: 1.6, emi: rgba(St.accent, 0.95), ew: 1.6, h: -0.05 });
    L.paint((g) => { for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + Math.PI / 6; i ? g.lineTo(cx + Math.cos(a) * 6, cy + Math.sin(a) * 4.4) : g.moveTo(cx + Math.cos(a) * 6, cy + Math.sin(a) * 4.4); } g.closePath(); }, { c: '#0c1426', mat: 'glass', h: 0.3, hm: 'add', emi: rgba(St.accent, 0.35) });
    L.light((g) => g.arc(cx, cy, 2.2, 0, TAU), St.accent, 3);
  } else if (id === 'prism') {
    // éclats de cristal qui percent le couvercle
    for (const [x, t, hgt, lean] of [[-14, 1.5, 20, -0.25], [-2, 1.7, 27, 0.05], [10, 1.5, 17, 0.3], [4, 1.2, 12, 0.5]]) {
      const [bx, by] = LP(x, t), tip = [bx + lean * hgt, by - hgt];
      L.paint(poly([[bx - 4.5, by + 1], tip, [bx + 4.5, by + 1]]), { c: vg(by - hgt, by, '#ffe6ff', '#b04cff'), mat: 'glass', h: (s) => s.hLin(bx - 4, 0, bx + 4, 0, 0.8, 0.4) });
      L.stroke(line([[bx, by + 1], tip]), { c: 'rgba(255,255,255,0.7)', w: 0.5, h: 0.05 });
      L.light((g) => g.arc(tip[0], tip[1] + 3, 1.4, 0, TAU), '#ffd6ff', 3);
    }
  } else if (id === 'astral') {
    // fenêtre céleste + étoile d'or
    L.paint((g) => g.ellipse(cx, cy, 9, 6.5, 0, 0, TAU), { c: (g) => { const gr = g.createRadialGradient(cx - 2, cy - 2, 0, cx, cy, 10); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.3, '#9ad6ff'); gr.addColorStop(0.7, '#5a3cc8'); gr.addColorStop(1, '#141640'); return gr; }, mat: 'glass', h: (s) => s.hDome(cx, cy, 9, 0.9, 0.5) });
    for (let i = 0; i < 6; i++) L.light((g) => g.arc(cx - 6 + ((i * 5) % 12), cy - 3 + ((i * 3) % 6), 0.5, 0, TAU), '#ffffff', 1.5);
    L.stroke((g) => g.ellipse(cx, cy, 9.5, 7, 0, 0, TAU), { c: GOLD, mat: 'gold', w: 1.8, h: 0.3 });
    const star = (g) => { for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i / 10) * TAU, r = i % 2 ? 4.2 : 10; const x = cx + Math.cos(a) * r, y = cy - 16 + Math.sin(a) * r; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.closePath(); };
    L.paint(star, { c: vg(cy - 26, cy - 6, '#fff8d8', GOLD), mat: 'gold', h: (s) => s.hRad(cx, cy - 16, 10, 0.95, 0.3) });
    L.light((g) => g.arc(cx, cy - 16, 2, 0, TAU), '#fff6c8', 4);
  } else if (id === 'boss') {
    // cornes recourbées
    for (const sgn of [-1, 1]) {
      const [bx, by] = LP(sgn < 0 ? X0 + 6 : X1 - 2, 1.4);
      const horn = (g) => { g.moveTo(bx - 4, by + 2); g.quadraticCurveTo(bx + sgn * 14, by - 4, bx + sgn * 12, by - 22); g.quadraticCurveTo(bx + sgn * 6, by - 8, bx + 4, by + 2); g.closePath(); };
      L.paint(horn, { c: vg(by - 22, by + 2, '#fff4e4', '#8a6a4a'), mat: 'gloss', h: (s) => s.hLin(bx - 4, 0, bx + 4, 0, 0.7, 0.3) });
    }
    L.light((g) => g.arc(cx, cy + 2, 2.5, 0, TAU), '#ff3a4e', 5);
  }
  A = { base: B.bake(), lid: L.bake() };
  if (chestCache.size > 24) chestCache.clear();
  chestCache.set(k, A);
  return A;
}
function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
// Socle lumineux hexagonal
const padCache = new Map();
function padArt(id, px) {
  px = Math.max(1.5, Math.min(10, Math.ceil(px * 2) / 2));
  const k = id + '|' + px;
  let A = padCache.get(k);
  if (A) return A;
  const St = STYLE[id] || STYLE.neon;
  const P = mk(110, 30, px, 55, 12, St.glow);
  const hex = (r, ry, oy = 0) => (g) => { for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; i ? g.lineTo(Math.cos(a) * r, oy + Math.sin(a) * ry) : g.moveTo(Math.cos(a) * r, oy + Math.sin(a) * ry); } g.closePath(); };
  P.paint(hex(50, 11, 5), { c: '#0d0a1e', mat: 'metal', h: 0.1 });
  P.paint(hex(50, 11, 0), { c: vg(-11, 11, '#3a3360', '#141028'), mat: 'metal', h: (s) => s.hDomeE(0, 0, 50, 11, 0.6, 0.3) });
  P.stroke(hex(50, 11, 0), { c: St.trim === STEEL ? '#dfe6f2' : '#f5c96a', mat: St.trimMat, w: 1.4, h: 0.2 });
  P.stroke(hex(40, 8.6, 0), { emi: rgba(St.glow, 0.95), ew: 1.6, c: rgba(St.glow, 0.6), w: 0.8 });
  P.light((g) => g.ellipse(0, 0, 30, 6, 0, 0, TAU), rgba(St.glow, 0.25), 6);
  A = P.bake();
  padCache.set(k, A);
  return A;
}

// Version 3D (WebGL) : socle, corps et couvercle cuits en vraie 3D
function drawChest3D(A, x, y, s, id, St, t, shake, open) {
  const c = ctx;
  setT(x, y, s);
  const sh = shake ? Math.sin(t * 60) * 3 * shake : 0, bob = open > 0 || shake > 0 ? 0 : Math.sin(t * 2.2) * 1.6;
  c.globalCompositeOperation = 'lighter';
  const g1 = glow(St.glow, 32);
  c.globalAlpha = Math.min(1, 0.5 + 0.15 * Math.sin(t * 3) + open * 0.6 + shake * 0.3); c.drawImage(g1.c, -78, -86, 156, 150);
  if (id !== 'neon') for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU + t * 0.25; c.globalAlpha = (id === 'astral' ? 0.16 : 0.1) * (1 + shake + open); c.fillStyle = St.glow; c.beginPath(); c.moveTo(0, -6); c.arc(0, -6, 86, a - 0.07, a + 0.07); c.closePath(); c.fill(); }
  c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  const Y0 = 26; // le pied du coffre
  c.save(); c.translate(0, Y0); drawSculpt(c, A.pad); c.globalCompositeOperation = 'lighter'; drawBloom(c, A.pad, 0.7 + 0.3 * Math.sin(t * 3)); c.restore();
  c.globalCompositeOperation = 'source-over';
  c.save(); c.translate(sh, Y0 + bob); c.rotate(sh * 0.02);
  if (shake > 0.2) { // lumière qui fuit par la fente
    c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 8; i++) { const a = -Math.PI / 2 + (i - 3.5) * 0.3 + Math.sin(t * 5 + i) * 0.05; c.globalAlpha = 0.2 * shake; c.fillStyle = St.glow; c.beginPath(); c.moveTo(-28 + i * 8, -26); c.lineTo(-28 + i * 8 + Math.cos(a) * 150, -26 + Math.sin(a) * 150); c.lineTo(-22 + i * 8 + Math.cos(a) * 150, -26 + Math.sin(a) * 150); c.closePath(); c.fill(); }
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  }
  drawSculpt(c, A.base);
  c.globalCompositeOperation = 'lighter'; drawBloom(c, A.base, 0.6 + 0.3 * Math.sin(t * 4) + shake * 0.6 + open); c.globalCompositeOperation = 'source-over';
  const step = Math.min(LID_STEPS.length - 1, Math.round(open * (LID_STEPS.length - 1)));
  const L = A.lids[step] || A.lids[0];
  drawSculpt(c, L); c.globalCompositeOperation = 'lighter'; drawBloom(c, L, 0.6 + shake * 0.6 + open * 0.5); c.globalCompositeOperation = 'source-over';
  if (open > 0.3) { // colonne de lumière qui jaillit du trésor
    c.globalCompositeOperation = 'lighter';
    const gr = c.createLinearGradient(0, -26, 0, -200); gr.addColorStop(0, rgba('#ffffff', 0.85 * open)); gr.addColorStop(0.3, rgba(St.glow, 0.5 * open)); gr.addColorStop(1, rgba(St.glow, 0));
    c.fillStyle = gr; c.beginPath(); c.moveTo(-30, -24); c.lineTo(28, -28); c.lineTo(52, -200); c.lineTo(-56, -200); c.closePath(); c.fill();
    c.globalCompositeOperation = 'source-over';
  }
  c.restore();
  // étincelles en orbite
  c.globalCompositeOperation = 'lighter';
  const sp = glow('#ffffff', 16);
  for (let i = 0; i < (id === 'neon' ? 3 : 5); i++) {
    const a = t * (0.9 + i * 0.13) + i * 1.9, sx = Math.cos(a) * (50 + (i % 2) * 8), sy = Y0 - 18 + Math.sin(a) * (16 + (i % 3) * 4), front = Math.sin(a) > 0;
    c.globalAlpha = (front ? 0.95 : 0.4) * (0.6 + 0.4 * Math.sin(t * 7 + i));
    const r = front ? 5 : 3; c.drawImage(sp.c, sx - r, sy - r, r * 2, r * 2);
    c.fillStyle = St.glow; c.fillRect(sx - 0.4, sy - r * 0.9, 0.8, r * 1.8); c.fillRect(sx - r * 0.9, sy - 0.4, r * 1.8, 0.8);
  }
  c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  baseT();
}
export function drawChestLux(x, y, s, C, t, shake = 0, open = 0) {
  const c = ctx, id = C.id || 'neon', St = STYLE[id] || STYLE.neon;
  { const step = Math.min(LID_STEPS.length - 1, Math.round(open * (LID_STEPS.length - 1))); const A3 = chest3D(id, view.rs * s * 1.05, step); if (A3 && A3.base) { drawChest3D(A3, x, y, s, id, St, t, shake, open); return; } }
  setT(x, y, s);
  const px = view.rs * s;
  const A = chestArt(id, px * 1.05), Pd = padArt(id, px);
  const sh = shake ? Math.sin(t * 60) * 3 * shake : 0;
  const bob = open > 0 || shake > 0 ? 0 : Math.sin(t * 2.2) * 1.6;
  // halo + rayons tournants (plus intenses pour les coffres rares)
  c.globalCompositeOperation = 'lighter';
  const g1 = glow(St.glow, 32);
  c.globalAlpha = Math.min(1, 0.5 + 0.15 * Math.sin(t * 3) + open * 0.6 + shake * 0.3); c.drawImage(g1.c, -72, -78, 144, 140);
  if (id !== 'neon') {
    for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU + t * 0.25; c.globalAlpha = (id === 'astral' ? 0.16 : 0.1) * (1 + shake + open); c.fillStyle = St.glow; c.beginPath(); c.moveTo(0, -4); c.arc(0, -4, 78, a - 0.07, a + 0.07); c.closePath(); c.fill(); }
  }
  c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  // socle
  c.save(); c.translate(0, 40); drawSculpt(c, Pd); c.globalCompositeOperation = 'lighter'; drawBloom(c, Pd, 0.7 + 0.3 * Math.sin(t * 3)); c.globalCompositeOperation = 'source-over'; c.restore();
  // ombre portée
  c.fillStyle = 'rgba(0,0,10,0.45)'; c.beginPath(); c.ellipse(4, 38, 40, 6, 0, 0, TAU); c.fill();
  c.translate(sh - 3, bob); c.rotate(sh * 0.02);
  // rayons qui s'échappent de la fente pendant les secousses
  if (shake > 0.2) {
    c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 8; i++) { const a = -Math.PI / 2 + (i - 3.5) * 0.3 + Math.sin(t * 5 + i) * 0.05; c.globalAlpha = 0.2 * shake; c.fillStyle = St.glow; c.beginPath(); c.moveTo(-26 + i * 8, -2); c.lineTo(-26 + i * 8 + Math.cos(a) * 140, -2 + Math.sin(a) * 140); c.lineTo(-20 + i * 8 + Math.cos(a) * 140, -2 + Math.sin(a) * 140); c.closePath(); c.fill(); }
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  }
  drawSculpt(c, A.base);
  c.globalCompositeOperation = 'lighter'; drawBloom(c, A.base, 0.55 + 0.3 * Math.sin(t * 4) + shake * 0.6 + open); c.globalCompositeOperation = 'source-over';
  // œil du coffre de colosse : il suit le temps
  if (id === 'boss') { const LX = (X0 + X1) / 2, ex = Math.sin(t * 1.3) * 2.2, ey = Math.cos(t * 0.9) * 1; c.fillStyle = '#ff2a3e'; c.beginPath(); c.ellipse(LX + ex, YB + 12 + ey, 2.6, 2.6, 0, 0, TAU); c.fill(); c.fillStyle = '#100006'; c.beginPath(); c.ellipse(LX + ex, YB + 12 + ey, 0.9, 2.2, 0, 0, TAU); c.fill(); }
  // couvercle : se soulève et bascule vers l'arrière
  c.save();
  const hx = X0 + D[0], hy = YB + D[1];
  c.translate(hx, hy - open * 16); c.rotate(-open * 0.55); c.scale(1, 1 - open * 0.28); c.translate(-hx, -hy);
  drawSculpt(c, A.lid);
  c.globalCompositeOperation = 'lighter'; drawBloom(c, A.lid, 0.6 + shake * 0.6 + open * 0.5); c.globalCompositeOperation = 'source-over';
  c.restore();
  if (open > 0.3) { // colonne de lumière qui jaillit
    c.globalCompositeOperation = 'lighter';
    const gr = c.createLinearGradient(0, -2, 0, -180); gr.addColorStop(0, rgba('#ffffff', 0.9 * open)); gr.addColorStop(0.3, rgba(St.glow, 0.55 * open)); gr.addColorStop(1, rgba(St.glow, 0));
    c.fillStyle = gr; c.beginPath(); c.moveTo(-30, -2); c.lineTo(36, -6); c.lineTo(56, -180); c.lineTo(-50, -180); c.closePath(); c.fill();
    c.globalCompositeOperation = 'source-over';
  }
  // étincelles qui tournent autour
  c.globalCompositeOperation = 'lighter';
  const sp = glow('#ffffff', 16);
  for (let i = 0; i < (id === 'neon' ? 3 : 5); i++) {
    const a = t * (0.9 + i * 0.13) + i * 1.9, rx = 46 + (i % 2) * 8, ry = 16 + (i % 3) * 4;
    const sx = Math.cos(a) * rx + 3, sy = -4 + Math.sin(a) * ry, front = Math.sin(a) > 0;
    c.globalAlpha = (front ? 0.95 : 0.4) * (0.6 + 0.4 * Math.sin(t * 7 + i));
    const r = front ? 5 : 3; c.drawImage(sp.c, sx - r, sy - r, r * 2, r * 2);
    c.fillStyle = St.glow; c.fillRect(sx - 0.4, sy - r * 0.9, 0.8, r * 1.8); c.fillRect(sx - r * 0.9, sy - 0.4, r * 1.8, 0.8);
  }
  c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  baseT();
}
// Icône de coffre (DOM) : même rendu sculpté, figé
export function drawChestIcon(g, r, id) {
  const A3 = chest3D(id, 2.5, 0);
  if (A3 && A3.base) {
    const St3 = STYLE[id] || STYLE.neon, k = r / 52;
    g.save(); g.scale(k, k); g.translate(0, 22);
    const gl = glow(St3.glow, 32); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.5; g.drawImage(gl.c, -62, -80, 124, 120); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    for (const S of [A3.base, A3.lids[0]]) { drawSculpt(g, S); g.globalCompositeOperation = 'lighter'; drawBloom(g, S, 0.8); g.globalCompositeOperation = 'source-over'; }
    g.restore();
    return;
  }
  const A = chestArt(id, 2.5), St = STYLE[id] || STYLE.neon;
  const k = r / 46;
  g.save(); g.scale(k, k); g.translate(-3, 4);
  const gl = glow(St.glow, 32); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.55; g.drawImage(gl.c, -56, -60, 112, 112); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  drawSculpt(g, A.base); g.globalCompositeOperation = 'lighter'; drawBloom(g, A.base, 0.8); g.globalCompositeOperation = 'source-over';
  drawSculpt(g, A.lid); g.globalCompositeOperation = 'lighter'; drawBloom(g, A.lid, 0.8); g.globalCompositeOperation = 'source-over';
  g.restore();
}

// ---------- Roue de la fortune ----------
const wheelCache = new Map();
function wheelDisk(R, segs, iconFor) {
  const px = Math.max(1.5, Math.min(3.2, view.rs));
  const k = R.toFixed(1) + '|' + px + '|' + segs.length;
  let w = wheelCache.get(k);
  if (w) return w;
  const n = segs.length, S = Math.ceil(R * 2 * px) + 4;
  const cv = makeCanvas(S, S), g = cv.getContext('2d');
  g.setTransform(px, 0, 0, px, S / 2, S / 2);
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * TAU - Math.PI / 2, a1 = a0 + TAU / n, col = segs[i].label === 'JACKPOT' ? '#ffd23f' : segs[i].color;
    g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, R, a0, a1); g.closePath();
    const gr = g.createRadialGradient(0, 0, R * 0.15, 0, 0, R);
    gr.addColorStop(0, darken(col, 0.82)); gr.addColorStop(0.55, darken(col, i % 2 ? 0.45 : 0.58)); gr.addColorStop(0.92, darken(col, i % 2 ? 0.2 : 0.32)); gr.addColorStop(1, darken(col, 0.6));
    g.fillStyle = gr; g.fill();
    if (segs[i].label === 'JACKPOT') { g.save(); g.clip(); for (let j = 0; j < 8; j++) { g.fillStyle = `hsla(${j * 45},100%,60%,0.35)`; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, R, a0 + (j / 8) * (a1 - a0), a0 + ((j + 1) / 8) * (a1 - a0)); g.closePath(); g.fill(); } g.restore(); }
    // liseré intérieur coloré
    g.strokeStyle = rgba(col, 0.8); g.lineWidth = 1; g.beginPath(); g.arc(0, 0, R * 0.96, a0 + 0.02, a1 - 0.02); g.stroke();
    const am = (a0 + a1) / 2;
    g.save(); g.translate(Math.cos(am) * R * 0.66, Math.sin(am) * R * 0.66); g.rotate(am + Math.PI / 2);
    iconFor(i, g);
    g.restore();
  }
  // rayons dorés entre les cases
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU - Math.PI / 2;
    g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 3.4; g.beginPath(); g.moveTo(Math.cos(a) * R * 0.2, Math.sin(a) * R * 0.2); g.lineTo(Math.cos(a) * R, Math.sin(a) * R); g.stroke();
    const gg = g.createLinearGradient(Math.cos(a) * R * 0.2, Math.sin(a) * R * 0.2, Math.cos(a) * R, Math.sin(a) * R); gg.addColorStop(0, '#8a5a12'); gg.addColorStop(0.5, '#fff1b0'); gg.addColorStop(1, '#b8801e');
    g.strokeStyle = gg; g.lineWidth = 1.8; g.stroke();
  }
  w = { cv, S, px };
  if (wheelCache.size > 6) wheelCache.clear();
  wheelCache.set(k, w);
  return w;
}
const rimCache = new Map();
function wheelRim(R, nb) {
  const px = Math.max(1.5, Math.min(3.2, view.rs));
  const k = R.toFixed(1) + '|' + px;
  let A = rimCache.get(k);
  if (A) return A;
  const R2 = R * 1.17;
  const S = mk(R2 * 2 + 8, R2 * 2 + 8, px, R2 + 4, R2 + 4, '#ffd23f');
  const ring = (g) => { g.arc(0, 0, R2, 0, TAU); g.moveTo(R * 0.99, 0); g.arc(0, 0, R * 0.99, 0, TAU, true); };
  S.paint(ring, { c: (g) => { const gr = g.createLinearGradient(0, -R2, 0, R2); gr.addColorStop(0, '#fff1b0'); gr.addColorStop(0.5, GOLD); gr.addColorStop(1, '#8a5a12'); return gr; }, mat: 'gold', rule: 'evenodd', h: (s) => { const gr = s.hg.createRadialGradient(0, 0, R, 0, 0, R2); gr.addColorStop(0, s.hv(0.3)); gr.addColorStop(0.5, s.hv(0.85)); gr.addColorStop(1, s.hv(0.3)); return gr; } });
  for (let i = 0; i < nb; i++) { const a = (i / nb) * TAU, x = Math.cos(a) * R * 1.085, y = Math.sin(a) * R * 1.085; S.paint(circ(x, y, R * 0.04), { c: '#1a1208', mat: 'metal', h: 0.2 }); }
  // moyeu
  S.paint(circ(0, 0, R * 0.22), { c: GOLD, mat: 'gold', h: (s) => s.hDome(0, 0, R * 0.22, 0.95, 0.4) });
  S.paint(circ(0, 0, R * 0.15), { c: (g) => { const gr = g.createRadialGradient(-R * 0.04, -R * 0.04, 0, 0, 0, R * 0.15); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.4, '#e6a8ff'); gr.addColorStop(1, '#6a2bd6'); return gr; }, mat: 'glass', h: (s) => s.hDome(0, 0, R * 0.15, 1, 0.7) });
  S.light(circ(0, 0, R * 0.07), 'rgba(255,255,255,0.6)', 3);
  const rim = S.bake();
  // pointeur
  const P = mk(40, 52, px, 20, 14, '#ff4f6e');
  const ptr = (g) => { g.moveTo(0, 34); g.lineTo(-13, -4); g.quadraticCurveTo(0, -14, 13, -4); g.closePath(); };
  P.paint(ptr, { c: vg(-14, 34, '#fff1b0', '#b8801e'), mat: 'gold', h: (s) => s.hCyl(-13, 0, 13, 0, 0.9, 0.3) });
  P.paint(circ(0, 2, 5.5), { c: '#ff2a4a', mat: 'glass', h: (s) => s.hDome(0, 2, 5.5, 1, 0.6) });
  P.light(circ(0, 2, 2.4), '#ff8a9a', 2);
  A = { rim, ptr: P.bake(), R2 };
  rimCache.set(k, A);
  return A;
}

export function drawWheelLux(cx, cy, R, segs, ang, t, iconFor, spin = 0, tick = 0) {
  const c = ctx;
  // rayons tournants derrière la roue
  c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * TAU + t * 0.15, w = 0.08;
    const gr = c.createRadialGradient(cx, cy, R * 0.8, cx, cy, R * 2.3); gr.addColorStop(0, 'rgba(255,200,90,0.2)'); gr.addColorStop(1, 'rgba(255,200,90,0)');
    c.fillStyle = gr; c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, R * 2.3, a - w, a + w); c.closePath(); c.fill();
  }
  const g1 = glow('#a259ff', 32); c.globalAlpha = 0.55 + spin * 0.3; c.drawImage(g1.c, cx - R * 1.5, cy - R * 1.5, R * 3, R * 3); c.globalAlpha = 1;
  c.globalCompositeOperation = 'source-over';
  // disque (tourne)
  const D = wheelDisk(R, segs, iconFor);
  c.save(); c.translate(cx, cy); c.rotate(ang); c.drawImage(D.cv, -D.S / 2 / D.px, -D.S / 2 / D.px, D.S / D.px, D.S / D.px); c.restore();
  // reflet fixe (vitre bombée)
  c.globalCompositeOperation = 'lighter';
  const gl = c.createRadialGradient(cx - R * 0.35, cy - R * 0.45, 0, cx - R * 0.35, cy - R * 0.45, R * 0.9);
  gl.addColorStop(0, 'rgba(255,255,255,0.22)'); gl.addColorStop(0.5, 'rgba(255,255,255,0.05)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = gl; c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.fill();
  c.globalCompositeOperation = 'source-over';
  // jante dorée + ampoules qui chassent
  const A = wheelRim(R, 24);
  c.save(); c.translate(cx, cy); drawSculpt(c, A.rim); c.restore();
  c.globalCompositeOperation = 'lighter';
  const bulb = glow('#fff3b0', 16), sp = spin > 0.05 ? 18 : 5;
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * TAU, x = cx + Math.cos(a) * R * 1.085, y = cy + Math.sin(a) * R * 1.085;
    const on = spin > 0.05 ? Math.floor(t * sp + i) % 3 === 0 : Math.floor(t * sp + i) % 2 === 0;
    c.globalAlpha = on ? 1 : 0.25;
    c.drawImage(bulb.c, x - R * 0.09, y - R * 0.09, R * 0.18, R * 0.18);
    c.fillStyle = on ? '#ffffff' : '#ffb347'; c.beginPath(); c.arc(x, y, R * 0.025, 0, TAU); c.fill();
  }
  c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  // pointeur (sursaute à chaque case)
  c.save(); c.translate(cx, cy - R * 1.12); c.rotate(-tick * 0.35); drawSculpt(c, A.ptr); c.restore();
}

// Les icônes de coffre (résultats, récompenses, liste des coffres gagnés) utilisent le même rendu sculpté
for (const id of ['neon', 'prism', 'astral', 'boss']) ICONS['chest_' + id] = (g, r) => drawChestIcon(g, r, id);
