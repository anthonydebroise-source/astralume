// Vaisseaux sculptés : mêmes silhouettes « hypercar », rendues en vrai relief (laque, chrome,
// carbone, verrière, cœur d'énergie lumineux). Le niveau d'évolution ajoute des pièces.
import { TAU, rgba, lighten, darken, mixHex } from '../engine/math.js';
import { Sculptor } from '../engine/sculpt.js';

export const SFW = 64, SFH = 72, SOX = 32, SOY = 35; // cadre : x ∈ [-32, 32], y ∈ [-35, 37]

export const half = (pts) => (g) => { g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); for (let i = pts.length - 2; i >= 0; i -= 2) g.lineTo(-pts[i], pts[i + 1]); g.closePath(); };
export const sides = (pts, only) => (g) => { for (const s of only ? [only] : [1, -1]) { g.moveTo(pts[0] * s, pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i] * s, pts[i + 1]); g.closePath(); } };
export const circ = (x, y, r) => (g) => g.arc(x, y, r, 0, TAU);
export const both = (x, y, r) => (g) => { g.moveTo(x + r, y); g.arc(x, y, r, 0, TAU); g.moveTo(-x + r, y); g.arc(-x, y, r, 0, TAU); };
export const hgrad = (col, w) => (g) => { const gr = g.createLinearGradient(-w, 0, w, 0); gr.addColorStop(0, darken(col, 0.45)); gr.addColorStop(0.3, col); gr.addColorStop(0.5, lighten(col, 0.25)); gr.addColorStop(0.7, col); gr.addColorStop(1, darken(col, 0.45)); return gr; };
export const vg = (y0, y1, a, b) => (g) => { const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, a); gr.addColorStop(1, b); return gr; };
export const CARBON = '#1c1e28', STEEL = '#c3cad8', GOLD = '#ecb44e';

// ---------- éléments communs ----------
export function hullPaint(S, pts, col, w, hc = 0.85, he = 0.3) { S.paint(half(pts), { c: hgrad(col, w), mat: 'gloss', h: (s) => s.hCyl(-w, 0, w, 0, hc, he) }); }
export function wingPaint(S, pts, col, x0, x1, h0 = 0.5, h1 = 0.18, mat = 'gloss', c) { for (const k of [1, -1]) S.paint(sides(pts, k), { c: c || vg(-20, 26, lighten(col, 0.12), darken(col, 0.35)), mat, h: (s) => s.hLin(x0 * k, 0, x1 * k, 0, h0, h1) }); }
export function carbon(S, path, h = 0.04, hm = 'add') { S.paint(path, { c: CARBON, mat: 'rubber', h, hm, bump: 0.25 }); }
export function trim(S, path, col = GOLD, w = 0.8, mat = 'gold') { S.stroke(path, { c: col, mat, w, h: 0.03 }); }
export function canopy(S, x, y, w, h, tint) {
  const p = (g) => { g.moveTo(x, y - h); g.bezierCurveTo(x + w, y - h * 0.55, x + w, y + h * 0.6, x, y + h); g.bezierCurveTo(x - w, y + h * 0.6, x - w, y - h * 0.55, x, y - h); g.closePath(); };
  S.paint(p, { c: vg(y - h, y + h, lighten(tint, 0.35), '#06070e'), mat: 'glass', h: (s) => s.hDomeE(x, y - h * 0.15, w * 1.05, h * 1.05, 0.95, 0.55) });
  S.stroke(p, { c: STEEL, mat: 'chrome', w: 0.7, h: 0.04 });
  S.light((g) => g.ellipse(x - w * 0.25, y - h * 0.45, w * 0.18, h * 0.22, -0.3, 0, TAU), rgba('#ffffff', 0.55), 0.4);
}
// cœur d'énergie : gemme facettée et lumineuse dans un sertissage chromé
export function core(S, x, y, r, col, n = 6) {
  const gem = (R, a0 = -Math.PI / 2) => (g) => { for (let i = 0; i < n; i++) { const a = a0 + (i / n) * TAU; const px = x + Math.cos(a) * R, py = y + Math.sin(a) * R * 1.15; if (i) g.lineTo(px, py); else g.moveTo(px, py); } g.closePath(); };
  S.paint(gem(r * 1.35), { c: STEEL, mat: 'chrome', h: 0.1, hm: 'add' });
  S.paint(gem(r), { c: (g) => { const gr = g.createRadialGradient(x - r * 0.3, y - r * 0.4, 0, x, y, r * 1.2); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.35, lighten(col, 0.5)); gr.addColorStop(1, darken(col, 0.3)); return gr; }, mat: 'glass', h: (s) => s.hDome(x, y, r * 1.1, 0.95, 0.55) });
  for (let i = 0; i < n; i += 2) { const a = -Math.PI / 2 + (i / n) * TAU; S.stroke((g) => { g.moveTo(x, y); g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r * 1.15); }, { c: 'rgba(255,255,255,0.5)', w: 0.35, h: 0.02 }); }
  S.light(gem(r * 0.7), rgba(col, 0.75), r * 0.8);
  S.light(circ(x, y, r * 0.3), rgba('#ffffff', 0.8), r * 0.3);
}
export function intake(S, x, y, w, h, col) {
  for (const s of [1, -1]) {
    const p = (g) => { g.moveTo(s * (x - w * 0.5), y - h * 0.5); g.lineTo(s * (x + w * 0.5), y - h * 0.35); g.lineTo(s * (x + w * 0.4), y + h * 0.5); g.lineTo(s * (x - w * 0.55), y + h * 0.35); g.closePath(); };
    S.paint(p, { c: '#05050a', mat: 'matte', h: 0.12 });
    S.light(p, rgba(col, 0.35), 0.5);
    for (let k = -h / 2 + 1; k < h / 2; k += 1.4) S.stroke((g) => { g.moveTo(s * (x - w * 0.42), y + k); g.lineTo(s * (x + w * 0.38), y + k + 0.3); }, { c: '#4a5064', w: 0.35, h: 0.06 });
  }
}
export function nozzle(S, x, y, r) {
  for (const s of x ? [1, -1] : [1]) {
    S.paint((g) => g.ellipse(x * s, y, r, r * 0.7, 0, 0, TAU), { c: STEEL, mat: 'chrome', h: (sc) => sc.hDomeE(x * s, y, r, r * 0.7, 0.6, 0.3) });
    S.paint((g) => g.ellipse(x * s, y, r * 0.66, r * 0.44, 0, 0, TAU), { c: '#04040a', mat: 'matte', h: 0.25 });
  }
}
export function cannon(S, x, y, len, w = 1.6, col = STEEL) {
  for (const s of [1, -1]) {
    S.paint((g) => g.rect(s * x - w / 2, y - len, w, len), { c: col, mat: 'chrome', h: (sc) => sc.hCyl(s * x - w / 2, 0, s * x + w / 2, 0, 0.6, 0.3) });
    S.paint((g) => g.rect(s * x - w * 0.8, y - len * 0.45, w * 1.6, 2.2), { c: GOLD, mat: 'gold', h: (sc) => sc.hCyl(s * x - w * 0.8, 0, s * x + w * 0.8, 0, 0.65, 0.35) });
    S.light((g) => g.ellipse(s * x, y - len + 0.4, w * 0.35, 0.6, 0, 0, TAU), '#ffffff', 0.6);
  }
}
export function leds(S, segs, col) { S.stroke((g) => { for (const [x1, y1, x2, y2] of segs) for (const s of [1, -1]) { g.moveTo(x1 * s, y1); g.lineTo(x2 * s, y2); } }, { c: lighten(col, 0.5), w: 0.9, emi: col, ew: 1.1, h: 0.03 }); }
export function grooves(S, segs) { S.grooves(segs.flatMap(([a, b, c, d]) => [[a, b, c, d], [-a, b, -c, d]]), 0.45, 0.05); }

// ---------- fiches ----------
const DESIGNS = {
  etincelle(S, P, T) {
    if (T >= 2) wingPaint(S, [10, 10, 26, 22, 27, 27, 14, 24], darken(P.paint, 0.2), 10, 27, 0.35, 0.12);
    wingPaint(S, [6.5, -6, 16, 6, 23.5, 14, 24.5, 19, 19, 20.5, 9, 18], P.paint, 6.5, 24.5);
    S.paint(sides([10, 2, 18, 10, 20, 15, 11, 13]), { c: STEEL, mat: 'steel', h: 0.05, hm: 'add' });
    trim(S, sides([6.5, -6, 16, 6, 23.5, 14]));
    carbon(S, sides([19, 20.5, 24.5, 19, 25.5, 22, 18, 23]), 0.2, 'set');
    S.light(both(24.6, 20.5, 0.9), P.tail, 1.2);
    if (T >= 1) cannon(S, 17, 9, 11, 1.7);
    hullPaint(S, [0, -31, 2.8, -25, 6, -13, 8, -2, 9.5, 8, 9, 16, 7, 22, 4, 27], P.paint, 10);
    carbon(S, half([0, -31, 2.8, -25, 1.8, -23.5, 0, -24.5]));
    carbon(S, half([0, -18, 3.4, -14, 5.2, 0, 3.6, 12, 0, 13]), 0.05);
    trim(S, half([0, -18, 3.4, -14, 5.2, 0, 3.6, 12, 0, 13]), P.paint, 0.5, 'gloss');
    intake(S, 9.6, 4, 3.2, 8, P.paint);
    grooves(S, [[5.5, 14, 8.5, 14], [3, -22, 6, -12]]);
    canopy(S, 0, -8, 4.3, 8.5, P.paint);
    core(S, 0, 6.5, 2.6, P.paint);
    S.paint((g) => g.rect(-15, 21, 30, 3.6), { c: CARBON, mat: 'rubber', h: 0.35 }); S.paint((g) => { g.rect(-15, 21, 2.4, 3.6); g.rect(12.6, 21, 2.4, 3.6); }, { c: P.paint, mat: 'gloss', h: 0.4 });
    nozzle(S, 4.2, 27, 2.6);
    leds(S, [[2.2, -24, 4.5, -18], [4.5, -18, 6.5, -19]], P.led);
    if (T >= 3) { trim(S, half([0, -31, 2.8, -25, 6, -13, 8, -2, 9.5, 8, 9, 16, 7, 22, 4, 27])); core(S, 0, -18, 1.4, P.accent === '#ffffff' ? P.paint : P.accent, 4); }
  },
  paon(S, P, T) {
    const n = T >= 2 ? 5 : 4;
    for (let i = n - 1; i >= 0; i--) {
      const a = 0.55 + i * 0.3;
      for (const s of [1, -1]) {
        const tx = 5 * s, ty = 4 + i * 2, ca = Math.cos(s * a), sa = Math.sin(s * a);
        const tf = (x, y) => [tx + x * ca - y * sa, ty + x * sa + y * ca];
        const fe = (g) => { const p0 = tf(0, 0), c1 = tf(3.6, -6), c2 = tf(3.2, -18 + i), p1 = tf(0, -23 + i * 1.5), c3 = tf(-3.2, -18 + i), c4 = tf(-3.6, -6); g.moveTo(...p0); g.bezierCurveTo(...c1, ...c2, ...p1); g.bezierCurveTo(...c3, ...c4, ...p0); g.closePath(); };
        const col = i % 2 ? darken(P.paint, 0.18) : P.paint;
        const m = tf(0, -11);
        S.paint(fe, { c: col, mat: 'gloss', h: (sc) => sc.hDome(m[0], m[1], 13, 0.55, 0.15) });
        S.stroke(fe, { c: P.accent, mat: 'gold', w: 0.6, h: 0.03 });
        const e0 = tf(0, -1), e1 = tf(0, -21 + i * 1.5);
        S.stroke((g) => { g.moveTo(...e0); g.lineTo(...e1); }, { c: P.accent, mat: 'gold', w: 0.6, h: 0.05 });
        const ey = tf(0, -17 + i);
        S.paint((g) => g.ellipse(ey[0], ey[1], 1.6, 2.3, s * a, 0, TAU), { c: P.accent, mat: 'gold', h: 0.08, hm: 'add' });
        S.light(circ(ey[0], ey[1], 0.85), '#0a4030', 0);
        S.light(circ(ey[0], ey[1], 0.7), rgba(P.paint, 0.9), 0.8);
      }
    }
    hullPaint(S, [0, -30, 3, -22, 6.5, -8, 7.5, 6, 6.5, 18, 3.5, 24], P.paint, 8);
    S.paint(half([0, -26, 2.2, -20, 4.5, -8, 3, -2, 0, -1]), { c: STEEL, mat: 'chrome', h: 0.05, hm: 'add' });
    trim(S, (g) => { g.moveTo(-5.5, -4); g.lineTo(0, -1); g.lineTo(5.5, -4); }, P.accent, 0.9);
    intake(S, 6.2, 8, 2.4, 6, P.accent);
    canopy(S, 0, -11, 3.6, 7.5, P.paint);
    core(S, 0, 6, 2.4, P.accent);
    if (T >= 1) cannon(S, 4.5, -14, 9, 1.4, P.accent);
    S.paint((g) => g.rect(-10, 19, 20, 3), { c: CARBON, mat: 'rubber', h: 0.35 }); S.paint((g) => { g.rect(-10, 19, 2, 3); g.rect(8, 19, 2, 3); }, { c: P.accent, mat: 'gold', h: 0.4 });
    nozzle(S, 0, 25.5, 3.2);
    leds(S, [[1.6, -26, 3.8, -21]], P.led);
  },
  lance(S, P, T) {
    if (T >= 2) { S.paint(sides([7, 10, 25, 26, 21, 29, 8, 24]), { c: darken(P.paint, 0.25), mat: 'gloss', h: 0.2 }); }
    wingPaint(S, [5, 5, 15, 13, 22, 21, 20, 24, 6, 20], P.paint, 5, 22);
    wingPaint(S, [3, -13, 10, -7, 10, -4.5, 3, -6], P.paint, 3, 10, 0.55, 0.3);
    trim(S, sides([5, 5, 15, 13, 22, 21]));
    carbon(S, sides([20, 24, 22, 21, 23, 25, 18, 26]), 0.2, 'set');
    S.light(both(22.5, 24, 0.9), P.tail, 1.2);
    if (T >= 1) cannon(S, 14, 13, 10, 1.6);
    hullPaint(S, [0, -26, 2.2, -18, 4.3, -4, 5.6, 8, 6, 18, 4, 26], P.accent, 7);
    S.paint(half([0.6, -18, 2.8, -8, 4.2, 6, 4.4, 14, 0.6, 14]), { c: P.paint, mat: 'gloss', h: 0.04, hm: 'add', a: 0.8 });
    intake(S, 5.2, 12, 2.2, 6, P.paint);
    canopy(S, 0, 2, 3, 6, P.paint);
    core(S, 0, 15, 2.2, P.paint);
    grooves(S, [[1.5, -14, 3.8, -14], [3.5, 18, 5.6, 18]]);
    nozzle(S, 3.4, 26, 2.4);
    leds(S, [[1.2, -22, 2.4, -16], [2.4, -16, 4, -15]], P.led);
  },
  essaim(S, P, T) {
    for (const s of [1, -1]) {
      const pod = (g) => { g.moveTo(12.5 * s, -9); g.lineTo(19.5 * s, -5); g.lineTo(20.5 * s, 13); g.lineTo(13.5 * s, 17); g.closePath(); };
      S.paint(pod, { c: CARBON, mat: 'rubber', h: (sc) => sc.hCyl(12.5 * s, 0, 20.5 * s, 0, 0.5, 0.2), bump: 0.25 });
      S.stroke(pod, { c: P.paint, mat: 'gloss', w: 0.8, h: 0.04 });
      const nm = T >= 2 ? 4 : 3;
      for (let k = 0; k < nm; k++) {
        const x = (14.2 + k * (5.4 / nm)) * s;
        S.paint((g) => g.rect(x - 0.65, -4 + k * 0.7, 1.3, 6), { c: STEEL, mat: 'chrome', h: 0.55 });
        S.paint((g) => { g.moveTo(x - 0.65, -4 + k * 0.7); g.lineTo(x, -6.2 + k * 0.7); g.lineTo(x + 0.65, -4 + k * 0.7); g.closePath(); }, { c: P.paint, mat: 'gloss', h: 0.6 });
      }
      if (T >= 1) S.paint((g) => g.rect(16.5 * s - 1.2, 8, 2.4, 6), { c: GOLD, mat: 'gold', h: 0.5 });
    }
    hullPaint(S, [0, -30, 3, -28, 9, -17, 12.5, -6, 14, 4, 13.5, 14, 10.5, 21, 5.5, 26], P.paint, 14);
    carbon(S, half([0, -30, 3, -28, 5.5, -19, 4.5, -4, 0, 2]), 0.05);
    trim(S, half([0, -30, 3, -28, 5.5, -19, 4.5, -4, 0, 2]), P.paint, 0.6, 'gloss');
    S.stroke((g) => { for (const s of [1, -1]) { g.moveTo(5.5 * s, -19); g.lineTo(11.5 * s, -6); g.lineTo(12.6 * s, 8); } }, { c: lighten(P.paint, 0.6), mat: 'chrome', w: 0.6, h: 0.04 });
    carbon(S, sides([9, 15, 13.4, 14, 10.4, 20.5, 7, 19]), 0.03);
    intake(S, 10.6, 4, 3.2, 8, P.paint);
    canopy(S, 0, -6, 4.2, 7.5, P.paint);
    core(S, 0, 9, 2.6, P.tail);
    S.paint((g) => g.rect(-19, 22.5, 38, 3.8), { c: CARBON, mat: 'rubber', h: 0.35 }); S.paint((g) => { g.rect(-19, 22.5, 2.4, 3.8); g.rect(16.6, 22.5, 2.4, 3.8); }, { c: P.paint, mat: 'gloss', h: 0.4 });
    nozzle(S, 4.6, 27, 2.6); nozzle(S, 0, 28, 2.2);
    leds(S, [[3.2, -27, 8, -18], [8, -18, 9.6, -19.5]], P.led);
  },
  tonnerre(S, P, T) {
    for (const [x, y0, y1] of [[0, -33, -19], [8.5, -27, -15]].concat(T >= 2 ? [[14, -20, -8]] : [])) for (const s of x ? [1, -1] : [1]) {
      const rod = (g) => { g.moveTo(x * s - 1.6, y1); g.lineTo(x * s - 0.9, y0 + 2); g.lineTo(x * s, y0); g.lineTo(x * s + 0.9, y0 + 2); g.lineTo(x * s + 1.6, y1); g.closePath(); };
      S.paint(rod, { c: CARBON, mat: 'rubber', h: (sc) => sc.hCyl(x * s - 1.6, 0, x * s + 1.6, 0, 0.55, 0.25) });
      for (let k = y1 - 2; k > y0 + 3; k -= 2.2) S.paint((g) => g.rect(x * s - 1.9, k, 3.8, 0.9), { c: '#d08a3a', mat: 'gold', h: 0.62 });
      S.paint((g) => { g.moveTo(x * s - 0.9, y0 + 2); g.lineTo(x * s, y0); g.lineTo(x * s + 0.9, y0 + 2); g.closePath(); }, { c: P.paint, mat: 'gloss', h: 0.6 });
    }
    hullPaint(S, [0, -22, 6.5, -19, 11.5, -9, 12.5, 3, 11.5, 15, 7.5, 23, 3, 25.5], P.paint, 13);
    S.stroke((g) => { for (const s of [1, -1]) { g.moveTo(6.5 * s, -19); g.lineTo(10.5 * s, -8); g.lineTo(11.6 * s, 3); } }, { c: '#fffbe0', mat: 'chrome', w: 0.55, h: 0.04 });
    carbon(S, half([0, -21, 2.5, -20, 3.2, -6, 0, -4]), 0.05);
    carbon(S, sides([5, -4, 10.6, -2, 10.4, 8, 6, 4]), 0.03);
    if (T >= 1) { S.paint(sides([12, -2, 17, 2, 17, 12, 12, 13]), { c: STEEL, mat: 'steel', h: 0.3 }); S.light(both(14.5, 7, 1.2), P.tail, 1.5); }
    intake(S, 8.3, 10, 3, 7, P.tail);
    canopy(S, 0, -6, 4.4, 7.5, P.tail);
    core(S, 0, 9, 2.8, P.tail);
    S.paint((g) => g.rect(-15, 19.5, 30, 3.4), { c: CARBON, mat: 'rubber', h: 0.35 }); S.paint((g) => { g.rect(-15, 19.5, 2.2, 3.4); g.rect(12.8, 19.5, 2.2, 3.4); }, { c: P.paint, mat: 'gloss', h: 0.4 });
    nozzle(S, 5, 25, 2.8);
    leds(S, [[2.6, -19, 5.4, -17.5], [5.4, -17.5, 6.6, -15]], P.led);
  },
  diapason(S, P, T) {
    wingPaint(S, [5, -31, 9, -30, 10.5, -4, 8, 3], P.paint, 5, 10.5, 0.6, 0.35);
    for (const s of [1, -1]) S.light((g) => g.rect(s > 0 ? 7.2 : -8.2, -27, 1, 22), P.accent, 1.2);
    S.paint(sides([10, 6, 20, 16, 19, 21, 9, 18]), { c: CARBON, mat: 'rubber', h: 0.25, bump: 0.25 });
    trim(S, sides([10, 6, 20, 16]));
    if (T >= 1) cannon(S, 15, 12, 9, 1.5, P.accent);
    if (T >= 2) { S.paint(sides([11, -14, 16, -10, 15, -2, 11, -3]), { c: P.paint, mat: 'gloss', h: 0.3 }); }
    hullPaint(S, [0, -6, 7.5, -1, 10, 10, 8, 20, 4, 26], P.paint, 11);
    intake(S, 8.8, 9, 2.6, 6, P.accent);
    canopy(S, 0, 6, 4, 6.5, P.accent);
    core(S, 0, -2, 2.4, P.accent);
    S.paint((g) => g.rect(-15, 20.5, 30, 3.2), { c: CARBON, mat: 'rubber', h: 0.35 }); S.paint((g) => { g.rect(-15, 20.5, 2.2, 3.2); g.rect(12.8, 20.5, 2.2, 3.2); }, { c: P.accent, mat: 'gloss', h: 0.4 });
    nozzle(S, 0, 26.5, 3);
    leds(S, [[6, -29, 8.5, -29]], P.led);
  },
  singularite(S, P, T) {
    S.paint(sides([3, 2, 10, 4, 9, 8, 3, 7]), { c: CARBON, mat: 'rubber', h: 0.3 });
    const ring = (g) => { g.arc(0, 14, 14, 0, TAU); g.moveTo(8.5, 14); g.arc(0, 14, 8.5, 0, TAU, true); };
    S.paint(ring, { c: (g) => { const gr = g.createRadialGradient(-4, 8, 2, 0, 14, 15); gr.addColorStop(0, lighten(P.paint, 0.5)); gr.addColorStop(0.55, P.paint); gr.addColorStop(1, darken(P.paint, 0.6)); return gr; }, mat: 'gloss', h: (sc) => { const gr = sc.hg.createRadialGradient(0, 14, 8.5, 0, 14, 14); gr.addColorStop(0, sc.hv(0.2)); gr.addColorStop(0.5, sc.hv(0.7)); gr.addColorStop(1, sc.hv(0.2)); return gr; }, rule: 'evenodd' });
    for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; S.paint(circ(Math.cos(a) * 11.2, 14 + Math.sin(a) * 11.2, 0.6), { c: STEEL, mat: 'chrome', h: 0.1, hm: 'add' }); }
    S.stroke((g) => g.arc(0, 14, 14, 0, TAU), { c: GOLD, mat: 'gold', w: 0.8, h: 0.03 });
    if (T >= 1) for (const a of [0.6, 2.54]) for (const s of [1, -1]) S.paint(circ(Math.cos(a) * 15 * s, 14 + Math.sin(a) * 15, 1.8), { c: STEEL, mat: 'chrome', h: 0.6 });
    S.paint(circ(0, 14, 8.3), { c: '#000000', mat: 'matte', h: 0 });
    hullPaint(S, [0, -28, 3.8, -21, 6, -9, 6.5, 2, 5, 7], P.paint, 7);
    S.stroke((g) => { g.moveTo(-1, -26); g.lineTo(-1, 4); g.moveTo(1, -26); g.lineTo(1, 4); }, { c: '#ffffff', mat: 'chrome', w: 0.6, h: 0.03 });
    if (T >= 2) { S.paint(sides([5, -14, 11, -18, 10, -8, 6, -6]), { c: P.paint, mat: 'gloss', h: 0.3 }); }
    canopy(S, 0, -11, 3.4, 6.5, P.paint);
    core(S, 0, 1, 2, P.accent === '#ffffff' ? lighten(P.paint, 0.4) : P.accent);
    leds(S, [[1.4, -25, 3.6, -19]], P.led);
  },
  faucheuse(S, P, T) {
    for (const s of [1, -1]) {
      const sc = (g) => { g.moveTo(4 * s, 12); g.bezierCurveTo(15 * s, 12, 25 * s, 4, 22 * s, -16); g.bezierCurveTo(19 * s, -4, 13 * s, 4, 4 * s, 4); g.closePath(); };
      S.paint(sc, { c: hgrad(P.paint, 24), mat: 'gloss', h: (k) => k.hDome(14 * s, 4, 14, 0.55, 0.15) });
      S.stroke((g) => { g.moveTo(5 * s, 11); g.bezierCurveTo(15 * s, 11, 23.5 * s, 3, 22 * s, -15); }, { c: '#ffffff', mat: 'chrome', w: 0.9, h: 0.06 });
      S.paint((g) => { g.moveTo(22 * s, -16); g.lineTo(23.5 * s, -9); g.lineTo(21 * s, -10); g.closePath(); }, { c: P.accent, mat: 'gloss', h: 0.5 });
      if (T >= 2) { const sc2 = (g) => { g.moveTo(5 * s, 16); g.bezierCurveTo(14 * s, 18, 22 * s, 14, 24 * s, 2); g.bezierCurveTo(19 * s, 10, 13 * s, 13, 5 * s, 13); g.closePath(); }; S.paint(sc2, { c: darken(P.paint, 0.25), mat: 'gloss', h: 0.3 }); }
    }
    if (T >= 1) cannon(S, 9, 8, 8, 1.4, P.paint);
    hullPaint(S, [0, -27, 3, -19, 5.5, -5, 5.5, 10, 3.6, 23], darken(P.accent, 0.15), 6);
    carbon(S, half([0, -20, 2, -14, 2.8, -6, 0, -4]), 0.05);
    intake(S, 4.8, 14, 2, 5, P.paint);
    canopy(S, 0, -13, 2.8, 5.5, P.paint);
    S.paint(circ(0, 3, 4), { c: STEEL, mat: 'chrome', h: 0.15, hm: 'add' });
    S.paint(circ(0, 3, 3), { c: (g) => { const gr = g.createRadialGradient(-1, 2, 0, 0, 3, 3); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.5, '#fff2a8'); gr.addColorStop(1, P.paint); return gr; }, mat: 'glass', h: (k) => k.hDome(0, 3, 3, 0.95, 0.6) });
    S.light(circ(0, 3, 2.4), rgba('#fff2a8', 0.8), 2);
    nozzle(S, 3.8, 24, 2.3);
    leds(S, [[1.2, -24, 2.6, -19]], P.led);
  },
  kaleido(S, P, T) {
    wingPaint(S, [9, 0, 21, 10, 19, 14, 8, 10], '#dfe6ff', 9, 21, 0.45, 0.2, 'chrome', vg(0, 14, '#ffffff', '#b8c6f0'));
   
    if (T >= 1) { S.paint(sides([15, 6, 24, 2, 23, 6, 17, 9]), { c: P.accent, mat: 'glass', h: 0.4 }); S.light(both(23, 4, 1), P.tail, 1.2); }
    const pts = [[0, -30], [9.5, -6], [12, 2], [7, 20], [0, 24], [-7, 20], [-12, 2], [-9.5, -6]];
    for (let i = 0; i < pts.length; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length];
      const hv = 0.45 + (i % 3) * 0.12;
      S.paint((g) => { g.moveTo(0, -4); g.lineTo(x1, y1); g.lineTo(x2, y2); g.closePath(); }, { c: lighten('#c8d4ff', 0.3 - (i % 2) * 0.3), mat: 'glass', h: (k) => k.hLin(0, -4, (x1 + x2) / 2, (y1 + y2) / 2, 0.8, hv - 0.2) });
      S.stroke((g) => { g.moveTo(0, -4); g.lineTo(x1, y1); }, { c: '#ffffff', mat: 'chrome', w: 0.4, h: 0.03 });
    }
    S.stroke((g) => { g.moveTo(0, -30); for (const [x, y] of pts.slice(1)) g.lineTo(x, y); g.closePath(); }, { c: P.accent, mat: 'chrome', w: 0.9, h: 0.04 });
    if (T >= 2) for (const s of [1, -1]) S.paint((g) => { g.moveTo(10 * s, -8); g.lineTo(16 * s, -16); g.lineTo(13 * s, -4); g.closePath(); }, { c: P.tail, mat: 'glass', h: 0.45 });
    canopy(S, 0, -6, 3, 6, P.accent);
    core(S, 0, 8, 2.6, P.tail);
    nozzle(S, 0, 24.5, 2.8);
    leds(S, [[2, -26, 5, -16]], P.led);
  },
  phenix(S, P, T) {
    for (const s of [1, -1]) {
      const w = (g) => { g.moveTo(3 * s, -6); g.quadraticCurveTo(15 * s, -16, 26 * s, -7); g.quadraticCurveTo(19 * s, -2, 24 * s, 5); g.quadraticCurveTo(15 * s, 5, 18 * s, 12); g.quadraticCurveTo(9 * s, 8, 3 * s, 9); g.closePath(); };
      S.paint(w, { c: (g) => { const gr = g.createLinearGradient(0, 0, 26 * s, 0); gr.addColorStop(0, darken(P.paint, 0.5)); gr.addColorStop(0.5, P.paint); gr.addColorStop(0.85, P.accent); gr.addColorStop(1, '#fff4c8'); return gr; }, mat: 'gloss', h: (k) => k.hLin(3 * s, 0, 26 * s, 0, 0.5, 0.15) });
      for (const [a, b, c2, d] of [[5, -3, 22, -6], [5, 3, 21, 3], [5, 7, 16, 10]]) S.stroke((g) => { g.moveTo(a * s, b); g.lineTo(c2 * s, d); }, { c: P.accent, mat: 'gold', w: 0.6, h: 0.05 });
      if (T >= 2) { const w2 = (g) => { g.moveTo(4 * s, 10); g.quadraticCurveTo(14 * s, 12, 22 * s, 18); g.quadraticCurveTo(13 * s, 18, 4 * s, 15); g.closePath(); }; S.paint(w2, { c: darken(P.accent, 0.1), mat: 'gloss', h: 0.25 }); }
    }
    if (T >= 1) cannon(S, 11, -4, 8, 1.4, P.accent);
    hullPaint(S, [0, -31, 3, -23, 5, -9, 5, 5, 3.4, 17, 1.5, 22], P.paint, 6);
    S.paint((g) => { g.moveTo(0, -31); g.lineTo(1.6, -26); g.lineTo(-1.6, -26); g.closePath(); }, { c: P.accent, mat: 'gold', h: 0.5 });
    trim(S, half([0, -26, 2.6, -20, 4.4, -9]), P.accent, 0.6);
    canopy(S, 0, -12, 2.6, 5.5, P.accent);
    core(S, 0, 4, 2.2, P.accent);
    nozzle(S, 2.4, 21, 2.2);
    leds(S, [[1.4, -22, 2.6, -18]], P.led);
  },
};

// ---------- pré-rendu ----------
const cache = new Map();
export function sculptShip(id, S0, px, tier = 0) {
  const D = DESIGNS[id];
  if (!D) return null;
  const key = id + '|' + px + '|' + tier + '|' + S0.paint + S0.accent;
  let b = cache.get(key);
  if (b) return b;
  const S = new Sculptor(SFW, SFH, px, { ox: SOX, oy: SOY, depth: 9, bevel: 0.5, rim: mixHex(S0.paint, '#ffffff', 0.3), rimK: 0.8, outline: 0.75, ao: 0.7, env: ['#b8d4ff', '#202430', '#ffffff'], amb: 0.34 });
  D(S, S0, tier);
  b = S.bake();
  b.mask = b.cv;
  if (cache.size > 48) cache.clear();
  cache.set(key, b);
  return b;
}
export const SCULPT_IDS = Object.keys(DESIGNS);
