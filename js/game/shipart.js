// Vaisseaux détaillés : coques métalliques ombrées (effet 3D), verrières, réacteurs, feux de position
import { TAU, rgba, lighten, darken, clamp, hslHex } from '../engine/math.js';

// ---------- Outils de dessin ----------
// Dégradé de coque : lumière venant du haut-gauche, déplacée par l'inclinaison (bank)
function hull(c, col, w, bank = 0) {
  const hl = clamp(0.38 - bank * 0.22, 0.12, 0.8);
  const g = c.createLinearGradient(-w, 0, w, 0);
  g.addColorStop(0, darken(col, 0.86));
  g.addColorStop(Math.max(0.02, hl - 0.2), darken(col, 0.5));
  g.addColorStop(hl, lighten(col, 0.35));
  g.addColorStop(Math.min(0.98, hl + 0.16), darken(col, 0.25));
  g.addColorStop(1, darken(col, 0.9));
  return g;
}
function metal(c, y0, y1, col) {
  const g = c.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, lighten(col, 0.25)); g.addColorStop(0.5, darken(col, 0.35)); g.addColorStop(1, darken(col, 0.8));
  return g;
}
function poly(c, pts) { c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.closePath(); }
// Polygone symétrique à partir de la moitié droite (de haut en bas)
function sym(c, half) {
  c.beginPath();
  c.moveTo(half[0], half[1]);
  for (let i = 2; i < half.length; i += 2) c.lineTo(half[i], half[i + 1]);
  for (let i = half.length - 2; i >= 0; i -= 2) c.lineTo(-half[i], half[i + 1]);
  c.closePath();
}
function edge(c, col, w = 1.2) {
  c.strokeStyle = rgba(col, 0.28); c.lineWidth = w * 3; c.stroke();
  c.strokeStyle = lighten(col, 0.45); c.lineWidth = w; c.stroke();
}
function seams(c, col, segs, a = 0.5) {
  c.strokeStyle = rgba(darken(col, 0.85), a); c.lineWidth = 0.7; c.beginPath();
  for (const [x1, y1, x2, y2] of segs) { c.moveTo(x1, y1); c.lineTo(x2, y2); c.moveTo(-x1, y1); c.lineTo(-x2, y2); }
  c.stroke();
}
function glints(c, col, segs) {
  c.strokeStyle = rgba(lighten(col, 0.7), 0.7); c.lineWidth = 0.6; c.beginPath();
  for (const [x1, y1, x2, y2] of segs) { c.moveTo(x1, y1); c.lineTo(x2, y2); }
  c.stroke();
}
function glass(c, x, y, rx, ry, col) {
  const g = c.createLinearGradient(x, y - ry, x + rx * 0.3, y + ry);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.25, lighten(col, 0.55)); g.addColorStop(0.7, darken(col, 0.35)); g.addColorStop(1, darken(col, 0.8));
  c.fillStyle = g; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fill();
  c.strokeStyle = 'rgba(10,12,30,0.9)'; c.lineWidth = 0.9; c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.85)'; c.beginPath(); c.ellipse(x - rx * 0.35, y - ry * 0.3, rx * 0.22, ry * 0.42, -0.25, 0, TAU); c.fill();
}
function nozzle(c, x, y, r, t, col) {
  c.fillStyle = '#07070f'; c.beginPath(); c.ellipse(x, y, r, r * 0.6, 0, 0, TAU); c.fill();
  c.strokeStyle = metal(c, y - r, y + r, '#8a90b0'); c.lineWidth = 1.1; c.stroke();
  const f = 0.8 + 0.2 * Math.sin(t * 45 + x * 3);
  const g = c.createRadialGradient(x, y + r * 0.2, 0, x, y + r * 0.2, r * 1.3);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, lighten(col, 0.3)); g.addColorStop(1, rgba(col, 0));
  c.fillStyle = g; c.beginPath(); c.ellipse(x, y + r * 0.5 * f, r * 0.85, r * 1.2 * f, 0, 0, TAU); c.fill();
}
function nav(c, x, y, col, t, ph = 0) {
  const on = Math.sin(t * 5 + ph) > 0.2;
  c.fillStyle = on ? '#ffffff' : darken(col, 0.5);
  c.beginPath(); c.arc(x, y, 1.1, 0, TAU); c.fill();
  if (on) { c.fillStyle = rgba(col, 0.4); c.beginPath(); c.arc(x, y, 3.4, 0, TAU); c.fill(); }
}
function gun(c, x, y0, y1, col, t) {
  c.fillStyle = metal(c, y0, y1, '#9aa0c8'); c.fillRect(x - 1.3, y0, 2.6, y1 - y0);
  c.fillStyle = rgba(col, 0.6 + 0.4 * Math.sin(t * 20 + x)); c.fillRect(x - 1.3, y0 - 1.5, 2.6, 2);
}

// ---------- Les 10 vaisseaux (repère ≈ ±24, nez vers le haut) ----------
export const SHIP_ART = {
  etincelle(c, t, A, B, bank = 0) {
    // ailes en flèche
    sym(c, [7, -6, 23, 9, 24, 15, 18, 15, 8, 11]); c.fillStyle = hull(c, A, 24, bank); c.fill(); edge(c, A, 1);
    seams(c, A, [[10, -1, 19, 11], [8, 8, 21, 13]]);
    // dérives verticales
    sym(c, [20, 5, 22, -3, 24, 10, 22, 13]); c.fillStyle = darken(A, 0.4); c.fill(); edge(c, A, 0.8);
    // canons
    gun(c, 9, -13, 6, A, t); gun(c, -9, -13, 6, A, t);
    // réacteurs
    nozzle(c, 5, 16, 3.2, t, A); nozzle(c, -5, 16, 3.2, t, A);
    // fuselage
    sym(c, [0, -26, 3, -18, 6.5, -4, 7.5, 8, 6, 15, 2.5, 17]); c.fillStyle = hull(c, B, 8, bank); c.fill(); edge(c, A, 1.2);
    seams(c, A, [[3.5, -12, 6, 4], [2, 6, 5, 14]]);
    c.fillStyle = 'rgba(0,0,10,0.75)'; c.fillRect(4.3, -2, 2, 5); c.fillRect(-6.3, -2, 2, 5);
    glints(c, B, [[0, -24, 0, -14], [-2, 2, -2, 12]]);
    glass(c, 0, -9, 3.3, 6.5, A);
    nav(c, 23, 14, '#ff4f6e', t, 0); nav(c, -23, 14, '#47ffa3', t, 0);
    c.fillStyle = A; c.fillRect(-1, 9, 2, 6);
  },
  paon(c, t, A, B, bank = 0) {
    for (const s of [-1, 1]) for (let i = 0; i < 5; i++) {
      const a = s * (0.42 + i * 0.27 + Math.sin(t * 2 + i) * 0.03), l = 23 - i * 1.6;
      c.save(); c.rotate(a);
      c.beginPath(); c.moveTo(0, 4); c.quadraticCurveTo(4.8, -l * 0.5, 0, -l); c.quadraticCurveTo(-4.8, -l * 0.5, 0, 4);
      const g = c.createLinearGradient(-4, 0, 4, 0); g.addColorStop(0, darken(A, 0.75)); g.addColorStop(0.45, lighten(A, 0.2)); g.addColorStop(1, darken(A, 0.6));
      c.fillStyle = g; c.fill(); edge(c, A, 0.7);
      c.strokeStyle = rgba(B, 0.8); c.lineWidth = 0.6; c.beginPath(); c.moveTo(0, 2); c.lineTo(0, -l + 2); c.stroke();
      c.fillStyle = B; c.beginPath(); c.ellipse(0, -l + 5, 1.9, 2.6, 0, 0, TAU); c.fill();
      c.fillStyle = darken(A, 0.6); c.beginPath(); c.arc(0, -l + 5, 0.9, 0, TAU); c.fill();
      c.restore();
    }
    for (let i = -1; i <= 1; i++) { c.strokeStyle = rgba(i ? A : B, 0.8); c.lineWidth = 1.6; c.beginPath(); c.moveTo(i * 2, 12); c.quadraticCurveTo(i * 6 + Math.sin(t * 4 + i) * 3, 20, i * 3 + Math.sin(t * 3 + i) * 4, 26); c.stroke(); }
    nozzle(c, 0, 14, 3, t, A);
    sym(c, [0, -24, 3.2, -14, 5, 0, 4, 10, 2, 14]); c.fillStyle = hull(c, B, 6, bank); c.fill(); edge(c, B, 1.1);
    c.strokeStyle = B; c.lineWidth = 0.8; c.beginPath(); c.moveTo(-3, -6); c.lineTo(0, -3); c.lineTo(3, -6); c.stroke();
    glass(c, 0, -12, 2.6, 5, A);
  },
  lance(c, t, A, B, bank = 0) {
    sym(c, [4, 2, 19, 12, 20, 17, 13, 16, 4, 12]); c.fillStyle = hull(c, A, 20, bank); c.fill(); edge(c, A, 1);
    sym(c, [3, -12, 10, -5, 10, -2, 3, -4]); c.fillStyle = darken(A, 0.5); c.fill(); edge(c, A, 0.7);
    nozzle(c, 3.5, 17, 2.6, t, A); nozzle(c, -3.5, 17, 2.6, t, A);
    sym(c, [0, -18, 2.6, -10, 4.5, 6, 4, 15, 1.8, 19]); c.fillStyle = hull(c, '#c8c0e0', 5, bank); c.fill(); edge(c, A, 1);
    // conduits d'énergie pulsés
    for (let i = 0; i < 5; i++) { const y = -10 + i * 5, k = (Math.sin(t * 10 - i) + 1) / 2; c.fillStyle = rgba(A, 0.4 + 0.6 * k); c.fillRect(-0.8, y, 1.6, 3); }
    glass(c, 0, 4, 2.2, 4, A);
    // prisme facetté
    c.save(); c.translate(0, -21);
    const r = 4.6, rot = t * 1.6;
    for (let i = 0; i < 3; i++) {
      const a0 = rot + (i / 3) * TAU, a1 = a0 + TAU / 3;
      c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a0) * r, Math.sin(a0) * r * 1.25); c.lineTo(Math.cos(a1) * r, Math.sin(a1) * r * 1.25); c.closePath();
      c.fillStyle = [lighten(B, 0.5), A, darken(A, 0.3)][i]; c.globalAlpha *= 0.9; c.fill(); c.globalAlpha /= 0.9;
    }
    c.strokeStyle = '#ffffff'; c.lineWidth = 0.8; c.beginPath(); for (let i = 0; i < 3; i++) { const a = rot + (i / 3) * TAU; c.lineTo(Math.cos(a) * r, Math.sin(a) * r * 1.25); } c.closePath(); c.stroke();
    c.fillStyle = '#ffffff'; c.beginPath(); c.arc(0, 0, 1.6, 0, TAU); c.fill();
    c.restore();
    nav(c, 19.5, 16, '#ff4f6e', t); nav(c, -19.5, 16, '#47ffa3', t);
  },
  essaim(c, t, A, B, bank = 0) {
    for (const s of [-1, 1]) {
      c.save(); c.scale(s, 1);
      poly(c, [10, -6, 22, 2, 22, 14, 10, 12]); c.fillStyle = hull(c, A, 22, bank * s); c.fill(); edge(c, A, 0.9);
      for (let k = 0; k < 3; k++) { const x = 13 + k * 3.2; c.fillStyle = '#1a1008'; c.fillRect(x - 1.3, -1 + k * 1.5, 2.6, 11); c.fillStyle = lighten(A, 0.3); c.beginPath(); c.moveTo(x - 1.3, -1 + k * 1.5); c.lineTo(x, -3.5 + k * 1.5); c.lineTo(x + 1.3, -1 + k * 1.5); c.fill(); }
      c.restore();
    }
    nozzle(c, 0, 17, 3.3, t, A); nozzle(c, 6, 15, 2.4, t, A); nozzle(c, -6, 15, 2.4, t, A);
    c.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + (i / 6) * TAU; c.lineTo(Math.cos(a) * 14, Math.sin(a) * 15); } c.closePath();
    c.fillStyle = hull(c, A, 14, bank); c.fill(); edge(c, A, 1.2);
    for (const [x, y] of [[0, -6], [-5.5, -2.8], [5.5, -2.8], [-5.5, 3.6], [5.5, 3.6], [0, 7]]) {
      c.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + (i / 6) * TAU; c.lineTo(x + Math.cos(a) * 3.2, y + Math.sin(a) * 3.2); } c.closePath();
      c.fillStyle = metal(c, y - 3, y + 3, B); c.fill(); c.strokeStyle = rgba(darken(A, 0.8), 0.8); c.lineWidth = 0.6; c.stroke();
    }
    glass(c, 0, -12, 3, 4, B);
    nav(c, 22, 13, '#ff4f6e', t); nav(c, -22, 13, '#47ffa3', t);
  },
  tonnerre(c, t, A, B, bank = 0) {
    for (const x of [-12, 12]) { c.fillStyle = metal(c, -16, 8, '#a8a0c8'); c.fillRect(x - 1.6, -16, 3.2, 22); }
    c.fillStyle = metal(c, -24, 8, '#c8c0e8'); c.fillRect(-1.8, -24, 3.6, 30);
    for (const [x, y0] of [[-12, -14], [12, -14], [0, -22]]) for (let k = 0; k < 3; k++) {
      const y = y0 + 3 + k * 4.5, p = 0.5 + 0.5 * Math.sin(t * 22 + k + x);
      c.strokeStyle = rgba(A, 0.5 + 0.5 * p); c.lineWidth = 1.4; c.beginPath(); c.ellipse(x, y, 4, 1.6, 0, 0, TAU); c.stroke();
    }
    c.strokeStyle = rgba('#ffffff', 0.9); c.lineWidth = 0.8; c.beginPath();
    const arc = (x1, y1, x2, y2) => { c.moveTo(x1, y1); for (let i = 1; i < 5; i++) c.lineTo(x1 + (x2 - x1) * i / 5 + Math.sin(t * 60 + i * 7) * 2.2, y1 + (y2 - y1) * i / 5 + Math.cos(t * 50 + i) * 1.5); c.lineTo(x2, y2); };
    arc(-12, -16, 0, -24); arc(12, -16, 0, -24); c.stroke();
    nozzle(c, 6, 16, 3, t, A); nozzle(c, -6, 16, 3, t, A);
    sym(c, [4, 2, 16, 4, 17, 11, 9, 17, 3, 18]); c.fillStyle = hull(c, B, 17, bank); c.fill(); edge(c, B, 1.2);
    seams(c, B, [[6, 4, 9, 15], [12, 6, 13, 11]]);
    glass(c, 0, 8, 3.2, 4.2, A);
    nav(c, 16.5, 10, '#ff4f6e', t); nav(c, -16.5, 10, '#47ffa3', t);
  },
  diapason(c, t, A, B, bank = 0) {
    const v = Math.sin(t * 50) * 0.7;
    for (let i = 0; i < 4; i++) { const y = -20 + i * 6 + ((t * 30) % 6); c.strokeStyle = rgba(B, 0.6 * (1 - i / 4)); c.lineWidth = 1; c.beginPath(); c.moveTo(-6, y); c.quadraticCurveTo(0, y - 3, 6, y); c.stroke(); }
    for (const s of [-1, 1]) {
      c.save(); c.scale(s, 1);
      poly(c, [7.5 + v * s, -25, 11 + v * s, -24, 11, 2, 7, 4]); c.fillStyle = hull(c, A, 11, bank * s); c.fill(); edge(c, A, 1);
      c.fillStyle = rgba(B, 0.8); c.fillRect(8.6, -20, 1, 18);
      c.restore();
    }
    sym(c, [0, -2, 9, 3, 18, 12, 17, 17, 6, 15, 2, 19]); c.fillStyle = hull(c, A, 18, bank); c.fill(); edge(c, A, 1.1);
    seams(c, A, [[5, 5, 14, 13]]);
    nozzle(c, 0, 18, 3, t, B);
    glass(c, 0, 7, 3, 4, B);
    nav(c, 17.5, 15, '#ff4f6e', t); nav(c, -17.5, 15, '#47ffa3', t);
  },
  singularite(c, t, A, B, bank = 0) {
    c.fillStyle = metal(c, 6, 18, A); c.strokeStyle = A; c.lineWidth = 1;
    poly(c, [-14, 2, -21, 15, -11, 11]); c.fill(); c.stroke(); poly(c, [14, 2, 21, 15, 11, 11]); c.fill(); c.stroke();
    nozzle(c, 0, 19, 3, t, A);
    sym(c, [0, 6, 6, 9, 3, 18, 0, 19]); c.fillStyle = hull(c, A, 6, bank); c.fill(); edge(c, A, 0.9);
    // tore 3D
    c.beginPath(); c.arc(0, -6, 17, 0, TAU); c.arc(0, -6, 9, 0, TAU, true);
    const g = c.createRadialGradient(-4, -10, 3, 0, -6, 18);
    g.addColorStop(0, lighten(A, 0.6)); g.addColorStop(0.55, A); g.addColorStop(1, darken(A, 0.75));
    c.fillStyle = g; c.fill('evenodd'); edge(c, A, 1);
    c.strokeStyle = rgba('#ffffff', 0.5); c.lineWidth = 1.2; c.beginPath(); c.arc(0, -6, 14, -2.6, -1.3); c.stroke();
    for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; c.fillStyle = rgba(B, 0.8); c.beginPath(); c.arc(Math.cos(a) * 13, -6 + Math.sin(a) * 13, 0.9, 0, TAU); c.fill(); }
    c.fillStyle = '#000'; c.beginPath(); c.arc(0, -6, 8.5, 0, TAU); c.fill();
    c.save(); c.translate(0, -6);
    for (let k = 0; k < 3; k++) { c.strokeStyle = k ? rgba(A, 0.8) : '#ffffff'; c.lineWidth = 1.1 - k * 0.2; c.beginPath(); c.ellipse(0, 0, 7.5 - k * 1.8, 2.4 - k * 0.5, t * (2 + k) + k, 0, TAU); c.stroke(); }
    c.restore();
  },
  faucheuse(c, t, A, B, bank = 0) {
    c.beginPath(); c.moveTo(-25, 12); c.quadraticCurveTo(-22, -16, 0, -22); c.quadraticCurveTo(22, -16, 25, 12); c.quadraticCurveTo(14, -4, 0, -7); c.quadraticCurveTo(-14, -4, -25, 12); c.closePath();
    c.fillStyle = hull(c, A, 25, bank); c.fill(); edge(c, A, 1.3);
    c.strokeStyle = rgba('#ffffff', 0.7); c.lineWidth = 0.7; c.beginPath(); c.moveTo(-23, 9); c.quadraticCurveTo(-20, -14, 0, -20); c.quadraticCurveTo(20, -14, 23, 9); c.stroke();
    for (const s of [-1, 1]) { c.fillStyle = B; c.beginPath(); c.moveTo(s * 25, 12); c.lineTo(s * 27, 18); c.lineTo(s * 21, 13); c.fill(); }
    nozzle(c, 4, 15, 2.6, t, B); nozzle(c, -4, 15, 2.6, t, B);
    sym(c, [0, -8, 5, -4, 4.5, 10, 0, 17]); c.fillStyle = hull(c, darken(B, 0.2), 5, bank); c.fill(); edge(c, B, 0.9);
    const p = 1 + 0.08 * Math.sin(t * 6);
    const sg = c.createRadialGradient(0, -7, 0, 0, -7, 7.5 * p); sg.addColorStop(0, '#ffffff'); sg.addColorStop(0.4, '#fff2a8'); sg.addColorStop(0.7, A); sg.addColorStop(1, rgba(B, 0));
    c.fillStyle = sg; c.beginPath(); c.arc(0, -7, 7.5 * p, 0, TAU); c.fill();
    for (let i = 0; i < 8; i++) { const a = t + (i / 8) * TAU; c.strokeStyle = rgba('#fff2a8', 0.8); c.lineWidth = 0.8; c.beginPath(); c.moveTo(Math.cos(a) * 5, -7 + Math.sin(a) * 5); c.lineTo(Math.cos(a) * 8, -7 + Math.sin(a) * 8); c.stroke(); }
  },
  kaleido(c, t, A, B, bank = 0) {
    for (const s of [-1, 1]) { c.save(); c.scale(s, 1); poly(c, [11, -2, 22, 10, 18, 13, 9, 7]); c.fillStyle = rgba(hslHex((t * 90 + 120) % 360, 90, 60), 0.7); c.fill(); edge(c, '#ffffff', 0.7); c.restore(); }
    nozzle(c, 0, 17, 3, t, A);
    const pts = [[0, -25], [13, 0], [0, 17], [-13, 0]];
    for (let i = 0; i < 4; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % 4];
      c.beginPath(); c.moveTo(0, -3); c.lineTo(x1, y1); c.lineTo(x2, y2); c.closePath();
      const g = c.createLinearGradient(x1, y1, x2, y2);
      g.addColorStop(0, hslHex((t * 80 + i * 90) % 360, 95, 62)); g.addColorStop(1, hslHex((t * 80 + i * 90 + 60) % 360, 95, 38));
      c.fillStyle = g; c.fill();
    }
    poly(c, [0, -25, 13, 0, 0, 17, -13, 0]); edge(c, '#ffffff', 1.1);
    c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 0.6; c.beginPath(); for (const [x, y] of pts) { c.moveTo(0, -3); c.lineTo(x, y); } c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.8)'; c.beginPath(); c.moveTo(-2, -20); c.lineTo(3, -12); c.lineTo(-1, -10); c.closePath(); c.fill();
    glass(c, 0, -4, 2.6, 4.2, '#ffffff');
  },
  phenix(c, t, A, B, bank = 0) {
    for (const s of [-1, 1]) {
      c.save(); c.scale(s, 1);
      const f = Math.sin(t * 9) * 2;
      c.beginPath(); c.moveTo(3, -6); c.quadraticCurveTo(16, -16, 27 + f, -6); c.quadraticCurveTo(20, -2, 25 + f, 6); c.quadraticCurveTo(16, 6, 19 + f, 13); c.quadraticCurveTo(9, 9, 3, 9); c.closePath();
      const g = c.createLinearGradient(0, 0, 26, 0); g.addColorStop(0, darken(A, 0.6)); g.addColorStop(0.5, A); g.addColorStop(1, B);
      c.fillStyle = g; c.fill(); edge(c, B, 0.8);
      c.strokeStyle = rgba(B, 0.7); c.lineWidth = 0.6; c.beginPath(); c.moveTo(5, -2); c.lineTo(22 + f, -5); c.moveTo(5, 3); c.lineTo(21 + f, 4); c.stroke();
      for (let i = 0; i < 3; i++) { const fl = 0.5 + 0.5 * Math.sin(t * 20 + i * 2); c.fillStyle = rgba(i % 2 ? B : '#ffffff', 0.7); c.beginPath(); c.ellipse(26 + f - i * 3, -6 + i * 6, 1.5, 2.5 * fl + 1, 0.4, 0, TAU); c.fill(); }
      c.restore();
    }
    for (let i = -1; i <= 1; i++) { c.strokeStyle = i ? A : B; c.lineWidth = 2; c.beginPath(); c.moveTo(i * 2, 10); c.quadraticCurveTo(i * 7, 18, i * 4 + Math.sin(t * 12 + i) * 2.5, 27); c.stroke(); }
    sym(c, [0, -23, 3.5, -16, 5, -2, 4, 8, 0, 14]); c.fillStyle = hull(c, A, 6, bank); c.fill(); edge(c, B, 1);
    c.fillStyle = B; c.beginPath(); c.moveTo(0, -27); c.lineTo(2, -21); c.lineTo(-2, -21); c.closePath(); c.fill();
    c.fillStyle = '#ffffff'; c.beginPath(); c.arc(1.8, -15, 1, 0, TAU); c.arc(-1.8, -15, 1, 0, TAU); c.fill();
    glass(c, 0, -6, 2.4, 4, B);
  },
};
export const SHIP_SCALE = 1.42;
