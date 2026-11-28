// Art des boss : pièces sculptées (pré-rendues en relief) assemblées et animées en direct.
import { TAU, rgba, lighten, darken, mixHex, clamp } from '../engine/math.js';
import { Sculptor, drawSculpt, drawBloom } from '../engine/sculpt.js';
import { glow } from '../engine/sprites.js';
import { buildBoss3D } from './boss3d.js';

export function bossPalette(C) {
  return {
    armor: mixHex('#a9b1c2', C.dk, 0.1),
    armorD: mixHex('#3a404e', C.dk, 0.2),
    lacq: darken(C.c1, 0.18), lacqD: darken(C.c1, 0.55), lacqL: lighten(C.c1, 0.12),
    flesh: C.c2, fleshD: darken(C.c2, 0.45), fleshL: lighten(C.c2, 0.35),
    sec: darken(C.c2, 0.25), secD: darken(C.c2, 0.6), secL: lighten(C.c2, 0.1),
    gold: '#e9b04c', chrome: '#e2e8f2',
    glow: C.cg, glowL: lighten(C.cg, 0.6),
    dk: C.dk,
  };
}
export function mk(C, w, h, px, ox, oy, o = {}) {
  return new Sculptor(w, h, px, Object.assign({ ox, oy, rim: C.cg, env: ['#b4ccff', '#1c1a22', '#ffffff'], rimK: 0.65, depth: 40, bevel: 1.1 }, o));
}
export const vgrad = (y0, y1, stops) => (g) => { const gr = g.createLinearGradient(0, y0, 0, y1); stops.forEach(([u, c]) => gr.addColorStop(u, c)); return gr; };
export const circ = (x, y, r) => (g) => g.arc(x, y, r, 0, TAU);
export const poly = (pts) => (g) => { g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); };
export const mirror = (pts) => { const out = pts.slice(); for (let i = pts.length - 2; i >= 0; i -= 2) out.push(-pts[i], pts[i + 1]); return out; };

// ---------- Pièces communes ----------
// Tourelle : tête en dôme + canons jumeaux pointant vers +y
export function turret(C, P, px, r, n = 2) {
  const L = r + 15, S = mk(C, r * 2 + 8, r + L + 10, px, r + 4, r + 4);
  const bw = r * 0.34;
  for (let i = 0; i < n; i++) {
    const x = n === 1 ? 0 : (i / (n - 1) - 0.5) * r * 0.85;
    S.paint((g) => g.rect(x - bw / 2, 0, bw, L), { c: P.armor, mat: 'steel', h: (s) => s.hCyl(x - bw / 2, 0, x + bw / 2, 0, 0.55, 0.25) });
    S.paint((g) => g.rect(x - bw * 0.65, L - 5, bw * 1.3, 5), { c: P.chrome, mat: 'chrome', h: (s) => s.hCyl(x - bw * 0.65, 0, x + bw * 0.65, 0, 0.65, 0.3) });
    S.paint((g) => g.rect(x - bw * 0.62, r * 0.6, bw * 1.24, 3.5), { c: P.gold, mat: 'gold', h: (s) => s.hCyl(x - bw * 0.62, 0, x + bw * 0.62, 0, 0.62, 0.3) });
    S.light((g) => g.ellipse(x, L - 0.5, bw * 0.32, 1.2, 0, 0, TAU), P.glowL, 2);
  }
  S.paint(circ(0, 0, r), { c: P.armorD, mat: 'metal', h: (s) => s.hDome(0, 0, r, 0.8, 0.3) });
  S.paint((g) => { g.arc(0, 0, r * 0.9, -0.2, Math.PI + 0.2); g.closePath(); }, { c: vgrad(-r, r, [[0, P.lacqL], [1, P.lacqD]]), mat: 'gloss', h: (s) => s.hDome(0, -1, r * 0.95, 0.92, 0.35) });
  S.grooves([[-r * 0.85, -2, r * 0.85, -2]], 0.7, 0.1);
  S.paint(circ(0, r * 0.38, r * 0.28), { c: '#05040a', mat: 'glass', h: 0.4 });
  S.light(circ(0, r * 0.38, r * 0.16), P.glow, 3);
  S.rivets([[-r * 0.6, -r * 0.45], [r * 0.6, -r * 0.45]], 0.9, P.chrome);
  return S.bake();
}
// Bouclier hexagonal blindé : cadre doré, face d'armure, réseau d'énergie et cristal central
export function hexPlate(C, P, px, r, rot = 0.5) {
  const S = mk(C, r * 2 + 6, r * 2 + 6, px, r + 3, r + 3);
  const hex = (R, a = rot) => (g) => { for (let i = 0; i < 6; i++) { const an = a + (i / 6) * TAU; const x = Math.cos(an) * R, y = Math.sin(an) * R; if (i) g.lineTo(x, y); else g.moveTo(x, y); } g.closePath(); };
  S.paint(hex(r), { c: P.gold, mat: 'gold', h: (s) => s.hDome(0, 0, r * 1.15, 0.45, 0.2) });
  S.paint(hex(r * 0.84), { c: vgrad(-r, r, [[0, lighten(P.armor, 0.15)], [1, P.armorD]]), mat: 'steel', h: (s) => s.hDome(0, 0, r * 1.1, 0.5, 0.22) });
  // facettes
  for (let k = 0; k < 6; k++) {
    const a0 = rot + (k / 6) * TAU, a1 = rot + ((k + 1) / 6) * TAU, R0 = r * 0.8, R1 = r * 0.42;
    S.paint(poly([Math.cos(a0) * R0, Math.sin(a0) * R0, Math.cos(a1) * R0, Math.sin(a1) * R0, Math.cos(a1) * R1, Math.sin(a1) * R1, Math.cos(a0) * R1, Math.sin(a0) * R1]),
      { c: k % 2 ? P.lacq : P.lacqD, mat: 'gloss', h: 0.03 + (k % 3) * 0.008, hm: 'add' });
  }
  S.grooves([0, 1, 2, 3, 4, 5].map((k) => { const a = rot + (k / 6) * TAU; return [Math.cos(a) * r * 0.42, Math.sin(a) * r * 0.42, Math.cos(a) * r * 0.82, Math.sin(a) * r * 0.82]; }), 0.9, 0.06);
  S.stroke(hex(r * 0.82), { emi: rgba(C.cg, 0.9), ew: 0.8, h: -0.04, w: 1 });
  S.paint(hex(r * 0.4, rot + 0.52), { c: P.gold, mat: 'gold', h: 0.12, hm: 'add' });
  S.paint(hex(r * 0.3, rot + 0.52), { c: (g) => { const gr = g.createRadialGradient(-r * 0.1, -r * 0.1, 0, 0, 0, r * 0.3); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.4, P.glowL); gr.addColorStop(1, darken(C.cg, 0.4)); return gr; }, mat: 'glass', h: (s) => s.hDome(0, 0, r * 0.32, 0.75, 0.55) });
  S.light(hex(r * 0.2, rot + 0.52), rgba(C.cg, 0.6), 3);
  S.rivets([0, 1, 2, 3, 4, 5].map((k) => { const a = rot + (k / 6) * TAU; return [Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9]; }), 1.1, P.chrome);
  return S.bake();
}
// Patte articulée de carapace (effilée)
export function legSeg(C, P, px, L, w, tip) {
  const S = mk(C, L + w * 2, w * 2 + 4, px, w, w + 2);
  const h = w / 2;
  S.paint((g) => { g.moveTo(-h * 0.6, -h); g.quadraticCurveTo(L * 0.5, -h * 1.5, L, tip ? 0 : -h * 0.6); if (!tip) g.lineTo(L, h * 0.6); g.quadraticCurveTo(L * 0.5, h * 1.2, -h * 0.6, h); g.closePath(); }, { c: vgrad(-h, h, [[0, P.lacqL], [0.5, P.lacq], [1, P.lacqD]]), mat: 'gloss', h: (s) => s.hCyl(0, -h * 1.3, 0, h * 1.2, 0.5, 0.05) });
  S.grooves([[L * 0.35, -h * 1.1, L * 0.38, h * 0.9], [L * 0.7, -h * 0.9, L * 0.72, h * 0.6]], 0.7, 0.08);
  S.paint(circ(0, 0, h * 1.05), { c: P.armor, mat: 'steel', h: (s) => s.hDome(0, 0, h * 1.1, 0.6, 0.2) });
  if (tip) S.paint(poly([L - 7, -h * 0.5, L + 2, 0, L - 7, h * 0.4]), { c: P.gold, mat: 'gold', h: 0.4 });
  return S.bake();
}
// Segment de membre blindé (de 0 à L sur l'axe x)
export function limb(C, P, px, L, w, o = {}) {
  const S = mk(C, L + w * 1.4, w + 6, px, w * 0.7, w / 2 + 3);
  const h = w / 2;
  S.paint((g) => { g.moveTo(0, -h * 0.8); g.lineTo(L, -h * (o.taper ? 0.35 : 0.7)); g.lineTo(L, h * (o.taper ? 0.35 : 0.7)); g.lineTo(0, h * 0.8); g.closePath(); }, { c: P.armorD, mat: 'metal', h: (s) => s.hCyl(0, -h, 0, h, 0.6, 0.15) });
  const bands = o.bands ?? 2;
  for (let i = 0; i < bands; i++) {
    const x0 = L * (0.12 + i * (0.8 / bands)), x1 = x0 + L * (0.8 / bands) * 0.78;
    S.paint((g) => { g.moveTo(x0, -h); g.lineTo(x1, -h * 0.85); g.lineTo(x1 + 2, 0); g.lineTo(x1, h * 0.85); g.lineTo(x0, h); g.lineTo(x0 + 2, 0); g.closePath(); }, { c: vgrad(-h, h, [[0, P.lacqL], [0.5, P.lacq], [1, P.lacqD]]), mat: 'gloss', h: (s) => s.hCyl(0, -h, 0, h, 0.85, 0.3) });
    S.stroke((g) => { g.moveTo(x0, -h); g.lineTo(x0 + 2, 0); g.lineTo(x0, h); }, { c: P.gold, mat: 'gold', w: 1, h: 0.06 });
  }
  S.paint(circ(0, 0, h * 0.95), { c: P.chrome, mat: 'chrome', h: (s) => s.hDome(0, 0, h, 0.95, 0.3) });
  S.paint(circ(0, 0, h * 0.4), { c: P.armorD, mat: 'metal', h: 0.5 });
  if (o.glow) S.light((g) => g.rect(L * 0.2, -0.6, L * 0.6, 1.2), P.glow, 2, 0.9);
  return S.bake();
}
// Plaie : cratère de métal arraché, intérieur incandescent
export function woundArt(C, P, px, r) {
  const S = mk(C, r * 2.4, r * 2.4, px, r * 1.2, r * 1.2, { seed: Math.round(r * 13) });
  const n = 13, pts = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * TAU, k = 0.78 + S.rng.next() * 0.4; pts.push(Math.cos(a) * r * k, Math.sin(a) * r * k); }
  S.paint(poly(pts), { c: P.armorD, mat: 'metal', h: (s) => s.hDome(0, 0, r * 1.1, 0.25, 0.5), bump: 0.6 });
  const inner = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * TAU + 0.2, k = 0.5 + S.rng.next() * 0.22; inner.push(Math.cos(a) * r * k, Math.sin(a) * r * k); }
  S.paint(poly(inner), { c: '#1a0c08', mat: 'matte', h: 0.05, bump: 0.8 });
  S.light(poly(inner), rgba('#ff7a2a', 0.55), r * 0.25);
  S.light(circ(0, 0, r * 0.3), rgba(C.cg, 0.6), r * 0.3);
  for (let i = 0; i < 5; i++) {
    const a = S.rng.next() * TAU, l = r * (0.55 + S.rng.next() * 0.4);
    S.stroke((g) => { g.moveTo(Math.cos(a) * r * 0.45, Math.sin(a) * r * 0.45); g.lineTo(Math.cos(a + 0.15) * l, Math.sin(a + 0.15) * l); }, { c: '#2a1208', w: 0.9, h: -0.06, emi: rgba('#ffb04a', 0.7), ew: 0.6 });
  }
  return S.bake();
}
// Fragment de blindage arraché (récupérable)
export function chunkArt(C, P, px, r, seed) {
  const S = mk(C, r * 2.6, r * 2.6, px, r * 1.3, r * 1.3, { seed });
  const n = 7, pts = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * TAU + S.rng.next() * 0.4, k = 0.65 + S.rng.next() * 0.45; pts.push(Math.cos(a) * r * k, Math.sin(a) * r * k); }
  S.paint(poly(pts), { c: vgrad(-r, r, [[0, P.lacqL], [1, P.lacqD]]), mat: 'gloss', h: (s) => s.hDome(-r * 0.2, -r * 0.2, r * 1.2, 0.8, 0.25) });
  S.paint((g) => { g.moveTo(pts[0], pts[1]); g.lineTo(pts[2], pts[3]); g.lineTo(pts[4], pts[5]); g.lineTo(0, 0); g.closePath(); }, { c: P.armor, mat: 'steel', h: 0.08, hm: 'add' });
  S.stroke((g) => { g.moveTo(pts[0], pts[1]); g.lineTo(pts[2], pts[3]); g.lineTo(pts[4], pts[5]); }, { c: P.gold, mat: 'gold', w: 1.2, h: 0.04 });
  S.stroke((g) => { g.moveTo(pts[8], pts[9]); g.lineTo(pts[10], pts[11]); g.lineTo(pts[12], pts[13]); }, { c: '#2a1006', w: 1.4, emi: '#ffa040', ew: 1 });
  S.rivets([[pts[2] * 0.6, pts[3] * 0.6]], 1, P.chrome);
  return S.bake();
}
// Noyau : sphère de verre avec énergie interne
export function coreOrb(C, P, px, r) {
  const S = mk(C, r * 2 + 4, r * 2 + 4, px, r + 2, r + 2, { outline: 0.6 });
  S.paint(circ(0, 0, r), { c: (g) => { const gr = g.createRadialGradient(-r * 0.3, -r * 0.3, 0, 0, 0, r); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.35, P.glowL); gr.addColorStop(0.8, P.glow); gr.addColorStop(1, darken(P.glow, 0.5)); return gr; }, mat: 'glass', h: (s) => s.hDome(0, 0, r, 1, 0.2) });
  S.light(circ(0, 0, r * 0.45), rgba('#ffffff', 0.35), r * 0.3);
  return S.bake();
}

// Vertèbre de tentacule blindée (axe +x = direction)
export function bead(C, P, px, r, col, colD, tipGlow) {
  const S = mk(C, r * 2.6, r * 2.4, px, r * 1.3, r * 1.2);
  S.paint((g) => g.ellipse(0, 0, r * 1.15, r, 0, 0, TAU), { c: vgrad(-r, r, [[0, lighten(col, 0.2)], [0.5, col], [1, colD]]), mat: 'gloss', h: (s) => s.hDomeE(0, 0, r * 1.15, r, 0.8, 0.2), bump: 0.12 });
  S.paint((g) => { g.ellipse(-r * 0.35, 0, r * 0.3, r * 0.98, 0, 0, TAU); }, { c: P.armor, mat: 'steel', h: 0.06, hm: 'add' });
  S.stroke((g) => { g.moveTo(-r * 0.35, -r * 0.95); g.lineTo(-r * 0.35, r * 0.95); }, { c: P.gold, mat: 'gold', w: 0.9 });
  S.paint((g) => { g.moveTo(-r * 0.2, -r * 0.9); g.lineTo(r * 0.5, -r * 1.25); g.lineTo(r * 0.55, -r * 0.75); g.closePath(); g.moveTo(-r * 0.2, r * 0.9); g.lineTo(r * 0.5, r * 1.25); g.lineTo(r * 0.55, r * 0.75); g.closePath(); }, { c: P.chrome, mat: 'chrome', h: 0.35 });
  if (tipGlow) S.light(circ(r * 0.35, 0, r * 0.22), P.glow, 2, 0.9);
  return S.bake();
}
// Logement d'œil : anneau chromé, paupières blindées
export function eyePod(C, P, px, r, col = P.armor) {
  const S = mk(C, r * 2.6, r * 2.6, px, r * 1.3, r * 1.3);
  S.paint(circ(0, 0, r * 1.18), { c: vgrad(-r, r, [[0, lighten(col, 0.2)], [1, darken(col, 0.5)]]), mat: 'gloss', h: (s) => s.hDome(0, 0, r * 1.2, 0.7, 0.2), bump: 0.1 });
  for (let k = 0; k < 3; k++) { const a = -Math.PI / 2 + (k - 1) * 0.9; S.paint(poly([Math.cos(a - 0.2) * r * 1.1, Math.sin(a - 0.2) * r * 1.1, Math.cos(a) * r * 1.6, Math.sin(a) * r * 1.6, Math.cos(a + 0.2) * r * 1.1, Math.sin(a + 0.2) * r * 1.1]), { c: P.chrome, mat: 'chrome', h: 0.45 }); }
  S.paint(circ(0, 0, r * 0.92), { c: P.chrome, mat: 'chrome', h: (s) => s.hDome(0, 0, r * 0.95, 0.85, 0.55) });
  S.paint(circ(0, 0, r * 0.72), { c: '#05040a', mat: 'glass', h: 0.5 });
  return S.bake();
}

// ---------- Rendu direct ----------
// Tentacule en chaîne de vertèbres (même géométrie que tentacle() d'art.js)
export function tentChain(c, bd, br, x, y, ang, len, w, t, ph, amp, n, tipCol) {
  const pts = [];
  let px = x, py = y, a = ang;
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    pts.push(px, py, a, 1 - k * 0.72);
    a = ang + Math.sin(t * 3 + ph + k * 3.2) * amp * k * 1.6;
    px += Math.cos(a) * (len / n); py += Math.sin(a) * (len / n);
  }
  for (let i = pts.length - 4; i >= 0; i -= 4) {
    const sc = (w / br) * pts[i + 3];
    c.save(); c.translate(pts[i], pts[i + 1]); c.rotate(pts[i + 2]); c.scale(sc, sc); drawSculpt(c, bd); c.restore();
  }
  if (tipCol) { const i = pts.length - 4; c.globalCompositeOperation = 'lighter'; glowAt(c, tipCol, pts[i], pts[i + 1], w * 1.4, 0.7); c.globalCompositeOperation = 'source-over'; }
}
const tmpP = { x: 0, y: 0 };
export function drawLimb(c, s, x0, y0, x1, y1, L) {
  const a = Math.atan2(y1 - y0, x1 - x0), d = Math.hypot(x1 - x0, y1 - y0);
  c.save(); c.translate(x0, y0); c.rotate(a); c.scale(d / L, 1);
  drawSculpt(c, s); c.restore();
}
// œil cybernétique : lentille sombre, iris lumineux qui suit le joueur
export function cyberEye(c, x, y, r, lx, ly, col, t, open = 1) {
  c.save(); c.translate(x, y);
  c.fillStyle = '#04030a'; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
  const ix = lx * r * 0.32, iy = ly * r * 0.32;
  c.globalCompositeOperation = 'lighter';
  const s = glow(col, 16); c.globalAlpha = 0.8; c.drawImage(s.c, ix - r * 1.2, iy - r * 1.2, r * 2.4, r * 2.4); c.globalAlpha = 1;
  c.strokeStyle = col; c.lineWidth = r * 0.22; c.beginPath(); c.arc(ix, iy, r * 0.5, 0, TAU); c.stroke();
  c.fillStyle = '#ffffff'; c.beginPath(); c.ellipse(ix, iy, r * 0.16, r * 0.34 * open, 0, 0, TAU); c.fill();
  c.globalCompositeOperation = 'source-over';
  c.fillStyle = 'rgba(255,255,255,0.75)'; c.beginPath(); c.ellipse(-r * 0.38, -r * 0.42, r * 0.22, r * 0.12, -0.6, 0, TAU); c.fill();
  c.restore();
}
export function glowAt(c, col, x, y, r, a) {
  const s = glow(col, 16); c.globalAlpha = a; c.drawImage(s.c, x - r, y - r, r * 2, r * 2); c.globalAlpha = 1;
}
export function drawWound(c, b, p, t) {
  const A = b.art, w = A.wounds[p.r <= 18 ? 0 : p.r <= 28 ? 1 : 2], k = p.r / w.r;
  c.save(); c.translate(p.ox, p.oy); c.scale(k, k);
  drawSculpt(c, w.s);
  c.globalCompositeOperation = 'lighter';
  glowAt(c, '#ff8a3a', 0, 0, w.r * 0.9, 0.35 + 0.25 * Math.sin(t * 9 + p.ox));
  c.globalCompositeOperation = 'source-over';
  c.restore();
}
export function drawReactor(c, b, p, t) {
  const A = b.art, r = p.r, pul = 1 + 0.06 * Math.sin(t * 6) + b.beat * 0.08;
  c.globalCompositeOperation = 'lighter';
  glowAt(c, b.col.cg, 0, 0, r * 2.2 * pul, 0.4);
  c.globalCompositeOperation = 'source-over';
  c.save(); c.scale(pul * r / A.core.r, pul * r / A.core.r); drawSculpt(c, A.core.s); c.restore();
  c.globalCompositeOperation = 'lighter';
  c.lineWidth = 1.6;
  for (let i = 0; i < 3; i++) { c.strokeStyle = rgba(i ? b.col.cg : '#ffffff', 0.7); c.beginPath(); c.ellipse(0, 0, r * (1.25 + i * 0.18), r * 0.36, t * (1.2 + i * 0.5) + i, 0, TAU); c.stroke(); }
  c.globalCompositeOperation = 'source-over';
}

// ---------- Archétypes ----------
export const BOSS_ART = {
  crab: {
    build(C, P, px) {
      const A = {};
      const S = mk(C, 236, 176, px, 118, 94, { seed: 3 });
      // sous-blindage ventral
      S.paint((g) => { g.moveTo(-94, 0); g.quadraticCurveTo(-88, 70, 0, 78); g.quadraticCurveTo(88, 70, 94, 0); g.closePath(); }, { c: P.armorD, mat: 'metal', h: (s) => s.hDomeE(0, 20, 96, 60, 0.5, 0.15) });
      S.grooves([[-82, 34, -42, 56, 0, 60, 42, 56, 82, 34], [-66, 52, -34, 66, 0, 70, 34, 66, 66, 52]], 0.9, 0.1);
      // carapace laquée
      const shell = (g) => { g.moveTo(-100, 10); g.quadraticCurveTo(-96, -60, -40, -74); g.quadraticCurveTo(0, -84, 40, -74); g.quadraticCurveTo(96, -60, 100, 10); g.quadraticCurveTo(80, 62, 0, 66); g.quadraticCurveTo(-80, 62, -100, 10); g.closePath(); };
      S.paint(shell, { c: vgrad(-84, 66, [[0, P.lacqL], [0.45, P.lacq], [1, P.lacqD]]), mat: 'gloss', h: (s) => s.hDomeE(0, -12, 116, 84, 0.9, 0.25), bump: 0.1 });
      // segmentation
      for (let i = 1; i < 4; i++) S.stroke((g) => g.ellipse(0, -8, 98 - i * 21, 68 - i * 14, 0, Math.PI * 1.06, Math.PI * 1.94), { h: -0.05, w: 1.6, c: 'rgba(0,0,0,0.45)', emi: i === 1 ? rgba(C.cg, 0.85) : undefined, ew: 0.7 });
      // plaques latérales imbriquées
      for (const s of [-1, 1]) for (let k = 0; k < 3; k++) {
        const y0 = -40 + k * 22;
        S.paint(poly([s * 64, y0, s * 92, y0 + 5, s * 96, y0 + 21, s * 68, y0 + 19]), { c: vgrad(y0, y0 + 21, [[0, P.secL], [1, P.secD]]), mat: 'gloss', h: 0.12, hm: 'add' });
        S.stroke((g) => { g.moveTo(s * 64, y0); g.lineTo(s * 92, y0 + 5); }, { c: P.gold, mat: 'gold', w: 1.3, h: 0.04 });
        S.rivets([[s * 70, y0 + 5], [s * 86, y0 + 8]], 0.8, P.chrome);
      }
      // arête dorsale
      S.paint(poly(mirror([0, -84, 9, -72, 7, 18]).concat([0, 30])), { c: vgrad(-84, 30, [[0, lighten(P.armor, 0.3)], [1, P.armorD]]), mat: 'steel', h: 0.14, hm: 'add' });
      S.stroke((g) => { g.moveTo(0, -80); g.lineTo(0, 24); }, { c: P.gold, w: 1.8, mat: 'gold', h: 0.04 });
      // cornes frontales
      for (const s of [-1, 1]) for (const [x, y, d0] of [[30, -76, -1.75], [62, -64, -1.3], [86, -40, -0.85]]) {
        const d = s > 0 ? d0 : Math.PI - d0, px2 = Math.cos(d + Math.PI / 2) * 5, py2 = Math.sin(d + Math.PI / 2) * 5;
        S.paint(poly([s * x + px2, y + py2, s * x + Math.cos(d) * 15, y + Math.sin(d) * 15, s * x - px2, y - py2]), { c: P.chrome, mat: 'chrome', h: (s2) => s2.hDome(s * x, y, 12, 0.7, 0.35) });
      }
      // évents lumineux
      for (const s of [-1, 1]) for (let k = 0; k < 3; k++) {
        const x = s * (20 + k * 2), y = -58 + k * 9;
        S.paint((g) => g.rect(x - 7, y - 1.6, 14, 3.2), { c: '#06050b', mat: 'matte', h: 0.25 });
        S.light((g) => g.rect(x - 6, y - 1, 12, 2), P.glow, 3);
      }
      // supports des tourelles
      for (const [x, y] of [[-50, -48], [0, -62], [50, -48]]) {
        S.paint(circ(x, y, 16.5), { c: P.armor, mat: 'steel', h: (s) => s.hDome(x, y, 17, 0.95, 0.6) });
        S.paint(circ(x, y, 12), { c: '#0a0910', mat: 'metal', h: 0.45 });
      }
      // logements des boucliers
      for (const s of [-1, 1]) S.paint(circ(s * 44, -4, 31), { c: P.armorD, mat: 'metal', h: 0.42 });
      // orbites des yeux
      for (const s of [-1, 1]) { S.paint(circ(s * 24, 8, 12.5), { c: P.chrome, mat: 'chrome', h: (s2) => s2.hDome(s * 24, 8, 13, 0.85, 0.55) }); S.paint(circ(s * 24, 8, 9.5), { c: '#05040a', mat: 'glass', h: 0.5 }); }
      // logement du réacteur
      S.paint(circ(0, 42, 29), { c: P.gold, mat: 'gold', h: (s) => s.hDome(0, 42, 30, 0.75, 0.5) });
      S.paint(circ(0, 42, 24.5), { c: '#07060c', mat: 'metal', h: 0.25 });
      S.rivets(Array.from({ length: 8 }, (_, i) => [Math.cos((i / 8) * TAU) * 26.8, 42 + Math.sin((i / 8) * TAU) * 26.8]), 0.9, P.armorD);
      A.body = S.bake();
      // pince : mâchoire (vers +y, côté +x), paume, membres, pattes
      const J = mk(C, 50, 76, px, 14, 8, { seed: 5 });
      const jaw = (g) => { g.moveTo(-8, -2); g.quadraticCurveTo(34, 14, 14, 66); g.lineTo(9, 62); g.quadraticCurveTo(12, 26, -6, 12); g.closePath(); };
      J.paint(jaw, { c: vgrad(-2, 66, [[0, P.lacqL], [0.5, P.lacq], [1, P.lacqD]]), mat: 'gloss', h: (s) => s.hDome(10, 24, 40, 0.95, 0.2), bump: 0.1 });
      J.paint(poly([14, 66, 9, 62, 17, 50, 21, 52]), { c: P.gold, mat: 'gold', h: 0.55 });
      for (let k = 0; k < 5; k++) { const u = 0.12 + k * 0.17, v = 1 - u, x = v * v * 9 + 2 * v * u * 12 + u * u * -6, y = v * v * 62 + 2 * v * u * 26 + u * u * 12; J.paint(poly([x + 1, y - 2.6, x - 4.2, y + 0.4, x + 1, y + 2.6]), { c: P.chrome, mat: 'chrome', h: 0.5 }); }
      J.grooves([[2, 4, 20, 14], [8, 20, 22, 30]], 0.9, 0.09);
      A.jaw = J.bake();
      const Pm = mk(C, 52, 52, px, 26, 26, { seed: 6 });
      Pm.paint(circ(0, 0, 22), { c: P.armor, mat: 'steel', h: (s) => s.hDome(0, 0, 22, 0.9, 0.3) });
      Pm.paint((g) => { g.arc(0, 0, 20, Math.PI * 0.95, Math.PI * 2.05); g.closePath(); }, { c: vgrad(-20, 4, [[0, P.lacqL], [1, P.lacqD]]), mat: 'gloss', h: (s) => s.hDome(0, -2, 21, 1, 0.4) });
      Pm.paint((g) => g.rect(-12, 5, 24, 4), { c: '#06050b', h: 0.3 }); Pm.light((g) => g.rect(-11, 6, 22, 2), P.glow, 3);
      Pm.rivets([[-14, -6], [14, -6], [0, -15]], 1, P.chrome);
      A.palm = Pm.bake();
      A.arm = limb(C, P, px, 56, 15, { bands: 2 }); A.armL = 56;
      A.leg = legSeg(C, P, px, 50, 9, false); A.legT = legSeg(C, P, px, 48, 9, true); A.legL = 50;
      A.hex = hexPlate(C, P, px, 32);
      A.turret = turret(C, P, px, 13);
      return A;
    },
    draw(c, b, t) {
      const A = b.art, C = b.col;
      for (let i = 0; i < 3; i++) for (const s of [-1, 1]) {
        const k = Math.sin(t * 5 + i * 1.3 + (s > 0 ? 1 : 0)) * 6;
        const x0 = s * 70, y0 = -20 + i * 22, x1 = s * 118, y1 = -40 + i * 24 + k, x2 = s * 134, y2 = 8 + i * 26 + k;
        drawLimb(c, A.leg.cv ? A.leg : A.leg, x0, y0, x1, y1, A.legL);
        drawLimb(c, A.legT, x1, y1, x2, y2, 48);
      }
      for (const p of b.parts) if (p.kind === 'arm') {
        const s = p.ox < 0 ? -1 : 1, ex = s * 108, ey = 54 + (p.oy - 40) * 0.5;
        drawLimb(c, A.arm, s * 76, 14, ex, ey, A.armL);
        drawLimb(c, A.arm, ex, ey, p.ox, p.oy, A.armL);
        if (p.alive) {
          const op = 0.25 + 0.25 * Math.abs(Math.sin(t * 3 + p.i));
          c.save(); c.translate(p.ox, p.oy); c.rotate(s * 0.3);
          for (const k of [-1, 1]) { c.save(); c.rotate(k * op); c.scale(k, 1); drawSculpt(c, A.jaw); c.restore(); }
          drawSculpt(c, A.palm);
          c.restore();
        } else drawWound(c, b, p, t);
      }
      drawSculpt(c, A.body);
      c.globalCompositeOperation = 'lighter';
      const pv = 0.55 + 0.3 * Math.sin(t * 4) + b.beat * 0.4;
      drawBloom(c, A.body, pv);
      c.globalCompositeOperation = 'source-over';
      for (const p of b.parts) if (p.kind === 'shell') {
        if (p.alive) { c.save(); c.translate(p.ox, p.oy); drawSculpt(c, A.hex); c.globalCompositeOperation = 'lighter'; glowAt(c, C.cg, 0, 0, 12, 0.5 + 0.3 * Math.sin(t * 5 + p.ox)); c.globalCompositeOperation = 'source-over'; c.restore(); }
        else drawWound(c, b, p, t);
      }
      for (const p of b.parts) if (p.kind === 'cannon') {
        if (p.alive) {
          const a = Math.atan2(b.g.player.y - (b.y + p.oy * b.sc), b.g.player.x - (b.x + p.ox * b.sc));
          c.save(); c.translate(p.ox, p.oy); c.rotate(a - Math.PI / 2); drawSculpt(c, A.turret); c.restore();
        } else drawWound(c, b, p, t);
      }
      for (const s of [-1, 1]) { const [lx, ly] = b.lookFrom({ ox: s * 24, oy: 8 }); cyberEye(c, s * 24, 8, 8.5, lx, ly, '#ff3f6e', t); }
    },
  },
};

// Construction (avec cache) de toutes les pièces d'un archétype
const cache = new Map();
export function buildBossArt(arch, C, px) {
  const D = BOSS_ART[arch];
  if (!D) return null;
  const key = arch + '|' + C.c1 + C.c2 + C.cg + '|' + px.toFixed(2);
  let A = cache.get(key);
  if (A) return A;
  const P = bossPalette(C);
  // version 3D (WebGL) si possible, sinon pièces sculptées 2D
  A = buildBoss3D(arch, C, P, px);
  if (A) { if (cache.size > 3) cache.clear(); cache.set(key, A); return A; }
  A = D.build(C, P, px);
  A.wounds = [15, 26, 36].map((r) => ({ r, s: woundArt(C, P, px, r) }));
  A.core = { r: 24, s: coreOrb(C, P, px, 24) };
  A.chunks = [1, 2, 3].map((k) => chunkArt(C, P, px, 14, 70 + k));
  if (cache.size > 3) cache.clear();
  cache.set(key, A);
  return A;
}
