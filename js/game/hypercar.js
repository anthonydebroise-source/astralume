// Vaisseaux « hypercar » : carrosserie laquée bicolore, carbone, entrées d'air, aileron,
// signature lumineuse LED et reflet mobile. La carrosserie est pré-rendue en haute
// résolution (une fois), puis animée chaque image (réacteurs, LED, reflet, effets).
import { TAU, rgba, lighten, darken, clamp, hslHex } from '../engine/math.js';
import { makeCanvas } from '../engine/sprites.js';

const FW = 56, FH = 66, OX = 28, OY = 32; // cadre du dessin (unités) : x ∈ [-28, 28], y ∈ [-32, 34]
const CARBON = '#15151d';

// ---------- Outils ----------
function half(g, pts, mirror = true) {
  g.beginPath();
  g.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
  if (mirror) for (let i = pts.length - 2; i >= 0; i -= 2) g.lineTo(-pts[i], pts[i + 1]);
  g.closePath();
}
function side(g, pts) { // forme d'un seul côté, dessinée des deux côtés
  for (const s of [1, -1]) { g.beginPath(); g.moveTo(pts[0] * s, pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i] * s, pts[i + 1]); g.closePath(); g.fill(); g.stroke(); }
}
function paintGrad(g, col, w, y0 = -30, y1 = 30) {
  const gr = g.createLinearGradient(-w, 0, w, 0);
  gr.addColorStop(0, darken(col, 0.72)); gr.addColorStop(0.2, darken(col, 0.3)); gr.addColorStop(0.42, lighten(col, 0.22));
  gr.addColorStop(0.5, lighten(col, 0.42)); gr.addColorStop(0.58, lighten(col, 0.12)); gr.addColorStop(0.8, darken(col, 0.35)); gr.addColorStop(1, darken(col, 0.78));
  return gr;
}
function carbonFill(g, path) {
  g.save(); path(); g.fillStyle = CARBON; g.fill(); g.clip();
  g.lineWidth = 0.45;
  for (let k = -70; k < 70; k += 1.3) { g.strokeStyle = k % 2.6 < 1.3 ? 'rgba(90,90,120,0.35)' : 'rgba(0,0,0,0.5)'; g.beginPath(); g.moveTo(k, -40); g.lineTo(k + 60, 40); g.stroke(); }
  for (let k = -70; k < 70; k += 2.6) { g.strokeStyle = 'rgba(140,140,180,0.12)'; g.beginPath(); g.moveTo(k, 40); g.lineTo(k + 60, -40); g.stroke(); }
  const gl = g.createLinearGradient(-20, -30, 20, 30); gl.addColorStop(0, 'rgba(255,255,255,0.18)'); gl.addColorStop(0.5, 'rgba(255,255,255,0)'); gl.addColorStop(1, 'rgba(255,255,255,0.06)');
  g.fillStyle = gl; g.fillRect(-40, -40, 80, 80);
  g.restore();
}
function rim(g, col, w = 0.9) { g.strokeStyle = 'rgba(0,0,0,0.85)'; g.lineWidth = w + 1.2; g.stroke(); g.strokeStyle = lighten(col, 0.55); g.lineWidth = w * 0.6; g.stroke(); }
function canopy(g, y, w, h, tint) {
  g.beginPath(); g.moveTo(0, y - h); g.bezierCurveTo(w, y - h * 0.55, w, y + h * 0.6, 0, y + h); g.bezierCurveTo(-w, y + h * 0.6, -w, y - h * 0.55, 0, y - h); g.closePath();
  const gr = g.createLinearGradient(0, y - h, 0, y + h);
  gr.addColorStop(0, '#d8f6ff'); gr.addColorStop(0.18, darken(tint, 0.45)); gr.addColorStop(0.7, '#05060c'); gr.addColorStop(1, darken(tint, 0.6));
  g.fillStyle = gr; g.fill();
  g.strokeStyle = '#0a0a12'; g.lineWidth = 1.1; g.stroke();
  g.strokeStyle = rgba('#ffffff', 0.5); g.lineWidth = 0.4; g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.75)';
  g.beginPath(); g.moveTo(-w * 0.55, y - h * 0.35); g.quadraticCurveTo(-w * 0.2, y - h * 0.8, w * 0.25, y - h * 0.7); g.quadraticCurveTo(-w * 0.1, y - h * 0.55, -w * 0.45, y - h * 0.05); g.closePath(); g.fill();
}
function intake(g, x, y, w, h, glowCol) {
  for (const s of [1, -1]) {
    g.save(); g.translate(x * s, y); g.scale(s, 1);
    g.beginPath(); g.moveTo(-w * 0.5, -h * 0.5); g.lineTo(w * 0.5, -h * 0.35); g.lineTo(w * 0.4, h * 0.5); g.lineTo(-w * 0.55, h * 0.35); g.closePath();
    g.fillStyle = '#030306'; g.fill();
    const gr = g.createLinearGradient(0, -h / 2, 0, h / 2); gr.addColorStop(0, rgba(glowCol, 0)); gr.addColorStop(1, rgba(glowCol, 0.55));
    g.fillStyle = gr; g.fill();
    g.strokeStyle = 'rgba(160,170,200,0.55)'; g.lineWidth = 0.35;
    for (let k = -h / 2 + 0.8; k < h / 2; k += 1.1) { g.beginPath(); g.moveTo(-w * 0.45, k); g.lineTo(w * 0.42, k + 0.3); g.stroke(); }
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 0.5; g.beginPath(); g.moveTo(-w * 0.5, -h * 0.5); g.lineTo(w * 0.5, -h * 0.35); g.stroke();
    g.restore();
  }
}
function stripes(g, y0, y1, col, gap = 1.4, w = 0.9) {
  g.fillStyle = col;
  for (const s of [1, -1]) g.fillRect(s * gap - (s < 0 ? w : 0), y0, w, y1 - y0);
}
function seam(g, segs, a = 0.6) {
  g.strokeStyle = `rgba(0,0,0,${a})`; g.lineWidth = 0.5; g.beginPath();
  for (const [x1, y1, x2, y2] of segs) { g.moveTo(x1, y1); g.lineTo(x2, y2); g.moveTo(-x1, y1); g.lineTo(-x2, y2); }
  g.stroke();
}
function shoulder(g, segs, col) {
  g.strokeStyle = rgba(lighten(col, 0.75), 0.75); g.lineWidth = 0.55; g.beginPath();
  for (const [x1, y1, cx, cy, x2, y2] of segs) { g.moveTo(x1, y1); g.quadraticCurveTo(cx, cy, x2, y2); g.moveTo(-x1, y1); g.quadraticCurveTo(-cx, cy, -x2, y2); }
  g.stroke();
}
function nozzleRing(g, x, y, r) {
  for (const s of x ? [1, -1] : [1]) {
    g.beginPath(); g.ellipse(x * s, y, r, r * 0.62, 0, 0, TAU);
    const gr = g.createLinearGradient(x * s - r, 0, x * s + r, 0); gr.addColorStop(0, '#3a3c48'); gr.addColorStop(0.5, '#c8ccd8'); gr.addColorStop(1, '#2a2c36');
    g.fillStyle = gr; g.fill();
    g.beginPath(); g.ellipse(x * s, y, r * 0.68, r * 0.42, 0, 0, TAU); g.fillStyle = '#050508'; g.fill();
  }
}
function rearWingBar(g, y, w, h, col) {
  g.beginPath(); g.moveTo(-w, y - h * 0.3); g.lineTo(w, y - h * 0.3); g.lineTo(w - 1, y + h * 0.7); g.lineTo(-w + 1, y + h * 0.7); g.closePath();
  carbonFill(g, () => { g.beginPath(); g.moveTo(-w, y - h * 0.3); g.lineTo(w, y - h * 0.3); g.lineTo(w - 1, y + h * 0.7); g.lineTo(-w + 1, y + h * 0.7); g.closePath(); });
  g.beginPath(); g.moveTo(-w, y - h * 0.3); g.lineTo(w, y - h * 0.3); g.lineTo(w - 1, y + h * 0.7); g.lineTo(-w + 1, y + h * 0.7); g.closePath();
  rim(g, col, 0.7);
  g.fillStyle = col; g.fillRect(-w, y - h * 0.3, 2.2, h); g.fillRect(w - 2.2, y - h * 0.3, 2.2, h);
}

// ---------- Fiches des vaisseaux ----------
const SPECS = {
  etincelle: {
    paint: '#22e6ff', accent: '#ffffff', led: '#c8fbff', tail: '#ff2a55',
    engines: [[4.2, 27, 2.6]],
    paintShapes(g) {
      half(g, [0, -31, 2.8, -25, 6, -13, 8, -2, 9.5, 8, 9, 16, 7, 22, 4, 27]); g.fill();
      side(g, [6.5, -6, 16, 6, 23.5, 14, 24.5, 19, 19, 20.5, 9, 18]);
    },
    bake(g, S) {
      carbonFill(g, () => half(g, [0, -31, 2.8, -25, 1.8, -23.5, 0, -24.5]));
      g.fillStyle = paintGrad(g, S.paint, 25); g.strokeStyle = 'rgba(0,0,0,0.85)'; g.lineWidth = 1;
      side(g, [6.5, -6, 16, 6, 23.5, 14, 24.5, 19, 19, 20.5, 9, 18]);
      carbonFill(g, () => { g.beginPath(); for (const s of [1, -1]) { g.moveTo(19 * s, 20.5); g.lineTo(24.5 * s, 19); g.lineTo(25.5 * s, 22); g.lineTo(18 * s, 23); g.closePath(); } });
      half(g, [0, -31, 2.8, -25, 6, -13, 8, -2, 9.5, 8, 9, 16, 7, 22, 4, 27]); g.fillStyle = paintGrad(g, S.paint, 10); g.fill(); rim(g, S.paint);
      shoulder(g, [[3.5, -22, 6.5, -10, 7.5, 2], [8.5, 6, 9.6, 12, 8, 20], [9, 1, 16, 8, 22, 15]], S.paint);
      intake(g, 9.6, 4, 3.2, 8, S.paint);
      carbonFill(g, () => half(g, [0, -18, 3.4, -14, 5.2, 0, 3.6, 12, 0, 13]));
      g.strokeStyle = S.paint; g.lineWidth = 0.5; half(g, [0, -18, 3.4, -14, 5.2, 0, 3.6, 12, 0, 13]); g.stroke();
      stripes(g, -29, -18, rgba('#ffffff', 0.9), 1.1, 0.7);
      seam(g, [[5.5, 14, 8.5, 14], [12, 12, 18, 18]]);
      canopy(g, -8, 4.3, 8.5, S.paint);
      rearWingBar(g, 22.5, 15, 3.6, S.paint);
      nozzleRing(g, 4.2, 27, 2.6);
    },
    leds: [[[2.2, -24, 4.5, -18], [4.5, -18, 6.5, -19]], 'Y'],
  },
  paon: {
    paint: '#14f5a0', accent: '#ffcf4a', led: '#fff1b0', tail: '#ffcf4a',
    engines: [[0, 26, 3.2]],
    paintShapes(g) {
      half(g, [0, -30, 3, -22, 6.5, -8, 7.5, 6, 6.5, 18, 3.5, 24]); g.fill();
      for (let i = 0; i < 4; i++) { const a = 0.55 + i * 0.3; for (const s of [1, -1]) { g.save(); g.translate(5 * s, 4 + i * 2); g.rotate(s * a); g.beginPath(); g.ellipse(0, -11, 3.2, 12 - i, 0, 0, TAU); g.restore(); g.fill(); } }
    },
    bake(g, S) {
      for (let i = 3; i >= 0; i--) {
        const a = 0.55 + i * 0.3;
        for (const s of [1, -1]) {
          g.save(); g.translate(5 * s, 4 + i * 2); g.rotate(s * a);
          g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(3.6, -6, 3.2, -18 + i, 0, -23 + i * 1.5); g.bezierCurveTo(-3.2, -18 + i, -3.6, -6, 0, 0); g.closePath();
          g.fillStyle = paintGrad(g, i % 2 ? darken(S.paint, 0.15) : S.paint, 4); g.fill(); rim(g, S.accent, 0.6);
          g.strokeStyle = rgba(S.accent, 0.9); g.lineWidth = 0.5; g.beginPath(); g.moveTo(0, -1); g.lineTo(0, -21 + i * 1.5); g.stroke();
          g.fillStyle = S.accent; g.beginPath(); g.ellipse(0, -17 + i, 1.5, 2.2, 0, 0, TAU); g.fill();
          g.fillStyle = '#06301f'; g.beginPath(); g.arc(0, -17 + i, 0.8, 0, TAU); g.fill();
          g.restore();
        }
      }
      half(g, [0, -30, 3, -22, 6.5, -8, 7.5, 6, 6.5, 18, 3.5, 24]); g.fillStyle = paintGrad(g, S.paint, 8); g.fill(); rim(g, S.accent);
      g.strokeStyle = S.accent; g.lineWidth = 0.9; g.beginPath(); g.moveTo(-5.5, -4); g.lineTo(0, -1); g.lineTo(5.5, -4); g.stroke();
      shoulder(g, [[3, -20, 6, -8, 6.6, 4]], S.paint);
      intake(g, 6.2, 8, 2.4, 6, S.accent);
      canopy(g, -11, 3.6, 7.5, S.paint);
      rearWingBar(g, 20.5, 10, 3, S.accent);
      nozzleRing(g, 0, 25.5, 3.2);
    },
    leds: [[[1.6, -26, 3.8, -21]], 'line'],
  },
  lance: {
    paint: '#ff36c8', accent: '#f4ecff', led: '#ffd6f4', tail: '#ff36c8',
    engines: [[3.4, 26, 2.4]],
    paintShapes(g) { side(g, [5, 5, 15, 13, 22, 21, 20, 24, 6, 20]); side(g, [3, -13, 10, -7, 10, -4.5, 3, -6]); half(g, [0, -26, 2.2, -18, 4.3, -4, 5.6, 8, 6, 18, 4, 26]); g.fill(); },
    bake(g, S) {
      g.fillStyle = paintGrad(g, S.paint, 22); g.strokeStyle = 'rgba(0,0,0,0.85)'; g.lineWidth = 1;
      side(g, [5, 5, 15, 13, 22, 21, 20, 24, 6, 20]);
      g.fillStyle = paintGrad(g, S.paint, 10); side(g, [3, -13, 10, -7, 10, -4.5, 3, -6]);
      half(g, [0, -26, 2.2, -18, 4.3, -4, 5.6, 8, 6, 18, 4, 26]); g.fillStyle = paintGrad(g, S.accent, 7); g.fill(); rim(g, S.paint);
      g.fillStyle = S.paint; half(g, [0.6, -18, 2.8, -8, 4.2, 6, 4.4, 14, 0.6, 14]); g.globalAlpha = 0.35; g.fill(); g.globalAlpha = 1;
      shoulder(g, [[2, -20, 4, -8, 5, 6], [8, 8, 14, 13, 19, 21]], S.accent);
      intake(g, 5.2, 12, 2.2, 6, S.paint);
      canopy(g, 2, 3, 6, S.paint);
      seam(g, [[1.5, -14, 3.8, -14], [3.5, 18, 5.6, 18]]);
      carbonFill(g, () => { g.beginPath(); for (const s of [1, -1]) { g.moveTo(20 * s, 24); g.lineTo(22 * s, 21); g.lineTo(23 * s, 25); g.lineTo(18 * s, 26); g.closePath(); } });
      nozzleRing(g, 3.4, 26, 2.4);
    },
    leds: [[[1.2, -22, 2.4, -16], [2.4, -16, 4, -15]], 'Y'],
    live(c, t, S) {
      c.save(); c.translate(0, -28);
      const r = 3.6, rot = t * 1.8;
      for (let i = 0; i < 3; i++) { const a0 = rot + (i / 3) * TAU, a1 = a0 + TAU / 3; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a0) * r, Math.sin(a0) * r * 1.2); c.lineTo(Math.cos(a1) * r, Math.sin(a1) * r * 1.2); c.closePath(); c.fillStyle = [lighten(S.paint, 0.6), S.paint, darken(S.paint, 0.3)][i]; c.fill(); }
      c.strokeStyle = '#fff'; c.lineWidth = 0.6; c.stroke();
      c.globalCompositeOperation = 'lighter'; const gr = c.createRadialGradient(0, 0, 0, 0, 0, 7); gr.addColorStop(0, rgba(S.paint, 0.9)); gr.addColorStop(1, rgba(S.paint, 0)); c.fillStyle = gr; c.beginPath(); c.arc(0, 0, 7, 0, TAU); c.fill(); c.globalCompositeOperation = 'source-over';
      c.restore();
    },
  },
  essaim: {
    paint: '#ff8a1f', accent: '#1c1c24', led: '#ffe2b8', tail: '#ff2a2a',
    engines: [[4.6, 27, 2.6], [0, 28, 2.2]],
    paintShapes(g) { half(g, [0, -30, 3, -28, 9, -17, 12.5, -6, 14, 4, 13.5, 14, 10.5, 21, 5.5, 26]); g.fill(); },
    bake(g, S) {
      for (const s of [1, -1]) {
        const pod = () => { g.beginPath(); g.moveTo(12.5 * s, -9); g.lineTo(19 * s, -5); g.lineTo(20 * s, 13); g.lineTo(13.5 * s, 17); g.closePath(); };
        carbonFill(g, pod); pod(); rim(g, S.paint, 0.6);
        for (let k = 0; k < 3; k++) { const x = (14.4 + k * 1.8) * s; g.fillStyle = '#e8e8f0'; g.fillRect(x - 0.65, -4 + k * 0.7, 1.3, 6); g.fillStyle = S.paint; g.beginPath(); g.moveTo(x - 0.65, -4 + k * 0.7); g.lineTo(x, -6 + k * 0.7); g.lineTo(x + 0.65, -4 + k * 0.7); g.fill(); }
      }
      half(g, [0, -30, 3, -28, 9, -17, 12.5, -6, 14, 4, 13.5, 14, 10.5, 21, 5.5, 26]); g.fillStyle = paintGrad(g, S.paint, 14); g.fill(); rim(g, S.paint);
      // capot noir en flèche (deux tons)
      carbonFill(g, () => half(g, [0, -30, 3, -28, 5.5, -19, 4.5, -4, 0, 2]));
      g.strokeStyle = S.paint; g.lineWidth = 0.6; half(g, [0, -30, 3, -28, 5.5, -19, 4.5, -4, 0, 2]); g.stroke();
      // arêtes vives
      g.strokeStyle = rgba('#fff2e0', 0.8); g.lineWidth = 0.55; g.beginPath();
      for (const s of [1, -1]) { g.moveTo(5.5 * s, -19); g.lineTo(11.5 * s, -6); g.lineTo(12.6 * s, 8); g.moveTo(9 * s, 14); g.lineTo(12.8 * s, 13); }
      g.stroke();
      g.fillStyle = 'rgba(10,10,16,0.92)'; for (const s of [1, -1]) { g.beginPath(); g.moveTo(9 * s, 15); g.lineTo(13.4 * s, 14); g.lineTo(10.4 * s, 20.5); g.lineTo(7 * s, 19); g.closePath(); g.fill(); }
      intake(g, 10.6, 4, 3.2, 8, S.paint);
      canopy(g, -6, 4.2, 7.5, S.paint);
      rearWingBar(g, 23.5, 19, 3.8, S.paint);
      nozzleRing(g, 4.6, 27, 2.6); nozzleRing(g, 0, 28, 2.2);
    },
    leds: [[[3.2, -27, 8, -18], [8, -18, 9.6, -19.5]], 'C'],
  },
  tonnerre: {
    paint: '#ffd40a', accent: '#17171f', led: '#ffffff', tail: '#a77bff',
    engines: [[5, 25, 2.8]],
    paintShapes(g) { half(g, [0, -22, 6.5, -19, 11.5, -9, 12.5, 3, 11.5, 15, 7.5, 23, 3, 25.5]); g.fill(); },
    bake(g, S) {
      for (const [x, y0, y1] of [[0, -32, -19], [8.5, -27, -15]]) for (const s of x ? [1, -1] : [1]) {
        g.beginPath(); g.moveTo(x * s - 1.6, y1); g.lineTo(x * s - 0.9, y0 + 2); g.lineTo(x * s, y0); g.lineTo(x * s + 0.9, y0 + 2); g.lineTo(x * s + 1.6, y1); g.closePath();
        carbonFill(g, () => { g.beginPath(); g.moveTo(x * s - 1.6, y1); g.lineTo(x * s - 0.9, y0 + 2); g.lineTo(x * s, y0); g.lineTo(x * s + 0.9, y0 + 2); g.lineTo(x * s + 1.6, y1); g.closePath(); });
        g.fillStyle = S.paint; g.beginPath(); g.moveTo(x * s - 0.9, y0 + 2); g.lineTo(x * s, y0); g.lineTo(x * s + 0.9, y0 + 2); g.fill();
      }
      half(g, [0, -22, 6.5, -19, 11.5, -9, 12.5, 3, 11.5, 15, 7.5, 23, 3, 25.5]); g.fillStyle = paintGrad(g, S.paint, 13); g.fill(); rim(g, S.paint);
      g.strokeStyle = rgba('#fffbe0', 0.85); g.lineWidth = 0.55; g.beginPath(); for (const s of [1, -1]) { g.moveTo(6.5 * s, -19); g.lineTo(10.5 * s, -8); g.lineTo(11.6 * s, 3); } g.stroke();
      g.fillStyle = S.accent; half(g, [0, -21, 2.5, -20, 3.2, -6, 0, -4]); g.fill();
      g.fillStyle = 'rgba(20,20,28,0.85)'; for (const s of [1, -1]) { g.beginPath(); g.moveTo(5 * s, -4); g.lineTo(10.6 * s, -2); g.lineTo(10.4 * s, 8); g.lineTo(6 * s, 4); g.closePath(); g.fill(); }
      shoulder(g, [[6, -16, 10, -8, 11, 2], [10.8, 8, 10.6, 14, 8, 21]], S.paint);
      intake(g, 8.3, 10, 3, 7, '#a77bff');
      canopy(g, -6, 4.4, 7.5, '#a77bff');
      rearWingBar(g, 21, 15, 3.4, S.paint);
      nozzleRing(g, 5, 25, 2.8);
    },
    leds: [[[2.6, -19, 5.4, -17.5], [5.4, -17.5, 6.6, -15]], 'Y'],
    live(c, t, S) {
      c.strokeStyle = 'rgba(230,220,255,0.95)'; c.lineWidth = 0.7; c.beginPath();
      const arc = (x1, y1, x2, y2) => { c.moveTo(x1, y1); for (let i = 1; i < 5; i++) c.lineTo(x1 + (x2 - x1) * i / 5 + Math.sin(t * 60 + i * 7) * 1.6, y1 + (y2 - y1) * i / 5 + Math.cos(t * 50 + i) * 1.2); c.lineTo(x2, y2); };
      arc(-8.5, -27, 0, -32); arc(8.5, -27, 0, -32); c.stroke();
      c.globalCompositeOperation = 'lighter'; c.fillStyle = 'rgba(180,140,255,0.5)'; c.beginPath(); c.arc(0, -32, 2.5 + Math.sin(t * 30), 0, TAU); c.fill(); c.globalCompositeOperation = 'source-over';
    },
  },
  diapason: {
    paint: '#9b5cff', accent: '#6ff4ff', led: '#d8fbff', tail: '#6ff4ff',
    engines: [[0, 27, 3]],
    paintShapes(g) { side(g, [5, -31, 9, -30, 10.5, -4, 8, 3]); half(g, [0, -6, 7.5, -1, 10, 10, 8, 20, 4, 26]); g.fill(); },
    bake(g, S) {
      g.fillStyle = paintGrad(g, S.paint, 11); g.strokeStyle = 'rgba(0,0,0,0.85)'; g.lineWidth = 1;
      side(g, [5, -31, 9, -30, 10.5, -4, 8, 3]);
      for (const s of [1, -1]) { g.fillStyle = S.accent; g.fillRect(s > 0 ? 7.2 : -8.2, -27, 1, 22); }
      carbonFill(g, () => { g.beginPath(); for (const s of [1, -1]) { g.moveTo(10 * s, 6); g.lineTo(20 * s, 16); g.lineTo(19 * s, 21); g.lineTo(9 * s, 18); g.closePath(); } });
      half(g, [0, -6, 7.5, -1, 10, 10, 8, 20, 4, 26]); g.fillStyle = paintGrad(g, S.paint, 11); g.fill(); rim(g, S.accent);
      shoulder(g, [[6, 0, 9.5, 6, 9, 16]], S.paint);
      intake(g, 8.8, 9, 2.6, 6, S.accent);
      canopy(g, 6, 4, 6.5, S.accent);
      rearWingBar(g, 22, 15, 3.2, S.accent);
      nozzleRing(g, 0, 26.5, 3);
    },
    leds: [[[6, -29, 8.5, -29]], 'line'],
    live(c, t, S) {
      for (let i = 0; i < 5; i++) { const y = -28 + i * 5 + ((t * 26) % 5); c.strokeStyle = rgba(S.accent, 0.7 * (1 - i / 5)); c.lineWidth = 0.8; c.beginPath(); c.moveTo(-5.5, y); c.quadraticCurveTo(0, y - 2.5, 5.5, y); c.stroke(); }
    },
  },
  singularite: {
    paint: '#8a4dff', accent: '#ffffff', led: '#e6dcff', tail: '#c8a2ff',
    engines: [],
    paintShapes(g) { half(g, [0, -28, 3.8, -21, 6, -9, 6.5, 2, 5, 7]); g.fill(); g.beginPath(); g.arc(0, 14, 14, 0, TAU); g.arc(0, 14, 8.5, 0, TAU, true); g.fill('evenodd'); },
    bake(g, S) {
      for (const s of [1, -1]) { carbonFill(g, () => { g.beginPath(); g.moveTo(3 * s, 2); g.lineTo(10 * s, 4); g.lineTo(9 * s, 8); g.lineTo(3 * s, 7); g.closePath(); }); }
      g.beginPath(); g.arc(0, 14, 14, 0, TAU); g.arc(0, 14, 8.5, 0, TAU, true);
      const gr = g.createRadialGradient(-4, 8, 2, 0, 14, 15); gr.addColorStop(0, lighten(S.paint, 0.6)); gr.addColorStop(0.55, S.paint); gr.addColorStop(1, darken(S.paint, 0.75));
      g.fillStyle = gr; g.fill('evenodd'); rim(g, S.paint, 0.9);
      g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 0.9; g.beginPath(); g.arc(0, 14, 12, -2.7, -1.2); g.stroke();
      for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(Math.cos(a) * 11.2 - 0.4, 14 + Math.sin(a) * 11.2 - 0.4, 0.8, 0.8); }
      g.fillStyle = '#000'; g.beginPath(); g.arc(0, 14, 8.3, 0, TAU); g.fill();
      half(g, [0, -28, 3.8, -21, 6, -9, 6.5, 2, 5, 7]); g.fillStyle = paintGrad(g, S.paint, 7); g.fill(); rim(g, S.accent);
      shoulder(g, [[3, -20, 5.6, -10, 6, 0]], S.paint);
      stripes(g, -26, 4, rgba('#ffffff', 0.8), 1, 0.6);
      canopy(g, -11, 3.4, 6.5, S.paint);
    },
    leds: [[[1.4, -25, 3.6, -19]], 'line'],
    live(c, t, S) {
      c.save(); c.translate(0, 14);
      for (let k = 0; k < 3; k++) { c.strokeStyle = k ? rgba(S.paint, 0.9) : '#ffffff'; c.lineWidth = 1 - k * 0.2; c.beginPath(); c.ellipse(0, 0, 7.5 - k * 1.8, 2.4 - k * 0.4, t * (2 + k) + k, 0, TAU); c.stroke(); }
      c.globalCompositeOperation = 'lighter'; const gr = c.createRadialGradient(0, 0, 0, 0, 0, 9); gr.addColorStop(0, rgba(S.paint, 0)); gr.addColorStop(0.75, rgba(S.paint, 0.4 + 0.2 * Math.sin(t * 8))); gr.addColorStop(1, rgba(S.paint, 0)); c.fillStyle = gr; c.beginPath(); c.arc(0, 0, 9, 0, TAU); c.fill(); c.globalCompositeOperation = 'source-over';
      c.restore();
    },
  },
  faucheuse: {
    paint: '#ffb21a', accent: '#ff2a3a', led: '#fff2c0', tail: '#ff2a3a',
    engines: [[3.8, 24, 2.3]],
    paintShapes(g) { half(g, [0, -27, 3, -19, 5.5, -5, 5.5, 10, 3.6, 23]); g.fill(); for (const s of [1, -1]) { g.beginPath(); g.moveTo(4 * s, 12); g.bezierCurveTo(15 * s, 12, 25 * s, 4, 22 * s, -16); g.bezierCurveTo(19 * s, -4, 13 * s, 4, 4 * s, 4); g.closePath(); g.fill(); } },
    bake(g, S) {
      for (const s of [1, -1]) {
        g.beginPath(); g.moveTo(4 * s, 12); g.bezierCurveTo(15 * s, 12, 25 * s, 4, 22 * s, -16); g.bezierCurveTo(19 * s, -4, 13 * s, 4, 4 * s, 4); g.closePath();
        g.fillStyle = paintGrad(g, S.paint, 24); g.fill(); rim(g, S.paint, 0.9);
        g.strokeStyle = '#ffffff'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(5 * s, 11); g.bezierCurveTo(15 * s, 11, 23.5 * s, 3, 22 * s, -15); g.stroke();
        g.fillStyle = S.accent; g.beginPath(); g.moveTo(22 * s, -16); g.lineTo(23.5 * s, -9); g.lineTo(21 * s, -10); g.fill();
      }
      half(g, [0, -27, 3, -19, 5.5, -5, 5.5, 10, 3.6, 23]); g.fillStyle = paintGrad(g, darken(S.accent, 0.15), 6); g.fill(); rim(g, S.paint);
      carbonFill(g, () => half(g, [0, -20, 2, -14, 2.8, -6, 0, -4]));
      intake(g, 4.8, 14, 2, 5, S.paint);
      canopy(g, -13, 2.8, 5.5, S.paint);
      nozzleRing(g, 3.8, 24, 2.3);
    },
    leds: [[[1.2, -24, 2.6, -19]], 'line'],
    live(c, t, S) {
      const p = 1 + 0.08 * Math.sin(t * 6);
      c.globalCompositeOperation = 'lighter';
      const sg = c.createRadialGradient(0, 3, 0, 0, 3, 7 * p); sg.addColorStop(0, '#ffffff'); sg.addColorStop(0.35, '#fff2a8'); sg.addColorStop(0.7, rgba(S.paint, 0.9)); sg.addColorStop(1, rgba(S.accent, 0));
      c.fillStyle = sg; c.beginPath(); c.arc(0, 3, 7 * p, 0, TAU); c.fill();
      c.globalCompositeOperation = 'source-over';
    },
  },
  kaleido: {
    paint: '#eef4ff', accent: '#7dfcff', led: '#ffffff', tail: '#ff7dfc',
    engines: [[0, 25, 2.8]],
    paintShapes(g) { half(g, [0, -30, 9.5, -6, 12, 2, 7, 20, 0, 24]); g.fill(); side(g, [9, 0, 21, 10, 19, 14, 8, 10]); },
    bake(g, S) {
      g.fillStyle = paintGrad(g, '#dfe8ff', 22); g.strokeStyle = 'rgba(0,0,0,0.85)'; g.lineWidth = 1;
      side(g, [9, 0, 21, 10, 19, 14, 8, 10]);
      const pts = [[0, -30], [9.5, -6], [12, 2], [7, 20], [0, 24], [-7, 20], [-12, 2], [-9.5, -6]];
      for (let i = 0; i < pts.length; i++) {
        const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length];
        g.beginPath(); g.moveTo(0, -4); g.lineTo(x1, y1); g.lineTo(x2, y2); g.closePath();
        const gr = g.createLinearGradient(x1, y1, x2, y2); gr.addColorStop(0, lighten('#dfe8ff', 0.4 - (i % 2) * 0.3)); gr.addColorStop(1, darken('#c8d4ff', 0.15 + (i % 3) * 0.15));
        g.fillStyle = gr; g.fill(); g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 0.4; g.stroke();
      }
      half(g, [0, -30, 9.5, -6, 12, 2, 7, 20, 0, 24]); rim(g, S.accent, 1);
      canopy(g, -6, 3, 6, S.accent);
      nozzleRing(g, 0, 24.5, 2.8);
    },
    leds: [[[2, -26, 5, -16]], 'line'],
    live(c, t, S) {
      // peinture irisée : reflets arc-en-ciel mouvants
      c.globalCompositeOperation = 'lighter'; c.globalAlpha *= 0.35;
      const pts = [[0, -30], [9.5, -6], [12, 2], [7, 20], [0, 24], [-7, 20], [-12, 2], [-9.5, -6]];
      for (let i = 0; i < pts.length; i++) { const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length]; c.beginPath(); c.moveTo(0, -4); c.lineTo(x1, y1); c.lineTo(x2, y2); c.closePath(); c.fillStyle = hslHex((t * 70 + i * 45) % 360, 100, 55); c.fill(); }
      c.globalAlpha /= 0.35; c.globalCompositeOperation = 'source-over';
    },
  },
  phenix: {
    paint: '#ff2b2b', accent: '#ffcf3a', led: '#fff0c0', tail: '#ffcf3a',
    engines: [[2.4, 21, 2.2]],
    paintShapes(g) { half(g, [0, -31, 3, -23, 5, -9, 5, 5, 3.4, 17, 1.5, 22]); g.fill(); for (const s of [1, -1]) { g.beginPath(); g.moveTo(3 * s, -6); g.quadraticCurveTo(15 * s, -16, 26 * s, -7); g.quadraticCurveTo(19 * s, -2, 24 * s, 5); g.quadraticCurveTo(15 * s, 5, 18 * s, 12); g.quadraticCurveTo(9 * s, 8, 3 * s, 9); g.closePath(); g.fill(); } },
    bake(g, S) {
      for (const s of [1, -1]) {
        g.beginPath(); g.moveTo(3 * s, -6); g.quadraticCurveTo(15 * s, -16, 26 * s, -7); g.quadraticCurveTo(19 * s, -2, 24 * s, 5); g.quadraticCurveTo(15 * s, 5, 18 * s, 12); g.quadraticCurveTo(9 * s, 8, 3 * s, 9); g.closePath();
        const gr = g.createLinearGradient(0, 0, 26 * s, 0); gr.addColorStop(0, darken(S.paint, 0.5)); gr.addColorStop(0.5, S.paint); gr.addColorStop(0.85, S.accent); gr.addColorStop(1, '#fff4c8');
        g.fillStyle = gr; g.fill(); rim(g, S.accent, 0.7);
        g.strokeStyle = rgba(S.accent, 0.8); g.lineWidth = 0.5; g.beginPath(); g.moveTo(5 * s, -3); g.lineTo(22 * s, -6); g.moveTo(5 * s, 3); g.lineTo(21 * s, 3); g.moveTo(5 * s, 7); g.lineTo(16 * s, 10); g.stroke();
      }
      half(g, [0, -31, 3, -23, 5, -9, 5, 5, 3.4, 17, 1.5, 22]); g.fillStyle = paintGrad(g, S.paint, 6); g.fill(); rim(g, S.accent);
      g.fillStyle = S.accent; g.beginPath(); g.moveTo(0, -31); g.lineTo(1.6, -26); g.lineTo(-1.6, -26); g.closePath(); g.fill();
      shoulder(g, [[2.5, -22, 4.6, -10, 4.8, 2]], S.paint);
      canopy(g, -12, 2.6, 5.5, S.accent);
      nozzleRing(g, 2.4, 21, 2.2);
    },
    leds: [[[1.4, -22, 2.6, -18]], 'line'],
    live(c, t, S) {
      for (const s of [1, -1]) for (let i = 0; i < 3; i++) {
        const f = 0.5 + 0.5 * Math.sin(t * 20 + i * 2 + s);
        c.globalCompositeOperation = 'lighter';
        c.fillStyle = rgba(i % 2 ? S.accent : '#ffffff', 0.55); c.beginPath(); c.ellipse((26 - i * 3) * s, -7 + i * 6, 1.4, 2.5 * f + 1, 0.4 * s, 0, TAU); c.fill();
        c.globalCompositeOperation = 'source-over';
      }
      for (let i = -1; i <= 1; i++) { c.strokeStyle = i ? S.paint : S.accent; c.lineWidth = 1.6; c.beginPath(); c.moveTo(i * 1.5, 22); c.quadraticCurveTo(i * 5, 28, i * 3 + Math.sin(t * 12 + i) * 2, 34); c.stroke(); }
    },
  },
};
export const SHIP_COLORS = Object.fromEntries(Object.entries(SPECS).map(([k, v]) => [k, [v.paint, v.accent]]));

// ---------- Pré-rendu ----------
const cache = new Map();
function bake(id, px) {
  const key = id + '|' + px;
  let b = cache.get(key);
  if (b) return b;
  const S = SPECS[id];
  const cv = makeCanvas(FW * px, FH * px), g = cv.getContext('2d');
  g.setTransform(px, 0, 0, px, OX * px, OY * px);
  g.lineJoin = 'round';
  // ombre portée (soulève le vaisseau du décor)
  g.save(); g.translate(2.2, 3); g.globalAlpha = 0.45; g.fillStyle = '#000';
  S.paintShapes(g); g.restore();
  g.globalAlpha = 1;
  S.bake(g, S);
  // vernis : lumière douce en haut à gauche
  const mk = makeCanvas(FW * px, FH * px), m = mk.getContext('2d');
  m.setTransform(px, 0, 0, px, OX * px, OY * px); m.fillStyle = '#fff'; S.paintShapes(m);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-atop';
  const cl = g.createRadialGradient(cv.width * 0.35, cv.height * 0.25, 0, cv.width * 0.35, cv.height * 0.25, cv.width * 0.6);
  cl.addColorStop(0, 'rgba(255,255,255,0.18)'); cl.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = cl; g.fillRect(0, 0, cv.width, cv.height); g.restore();
  b = { cv, mask: mk, px };
  if (cache.size > 40) cache.clear();
  cache.set(key, b);
  return b;
}

// Reflet mobile sur la peinture (sur un tampon, découpé par la silhouette)
const tmp = makeCanvas(8, 8), tg = tmp.getContext('2d');
function sheen(c, b, t, bank) {
  if (tmp.width !== b.cv.width || tmp.height !== b.cv.height) { tmp.width = b.cv.width; tmp.height = b.cv.height; }
  tg.setTransform(1, 0, 0, 1, 0, 0);
  tg.globalCompositeOperation = 'copy'; tg.drawImage(b.mask, 0, 0);
  tg.globalCompositeOperation = 'source-in';
  const W = tmp.width, H = tmp.height;
  const u = ((t * 0.28) % 1.7) - 0.35 - bank * 0.25;
  const x0 = W * u;
  const gr = tg.createLinearGradient(x0 - W * 0.25, 0, x0 + W * 0.25, H * 0.5);
  gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.0)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.55)'); gr.addColorStop(0.56, 'rgba(255,255,255,0.08)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  tg.fillStyle = gr; tg.fillRect(0, 0, W, H);
  c.globalCompositeOperation = 'lighter';
  c.drawImage(tmp, -OX, -OY, FW, FH);
  c.globalCompositeOperation = 'source-over';
}

function engines(c, S, t) {
  c.globalCompositeOperation = 'lighter';
  for (const [x, y, r] of S.engines) for (const s of x ? [1, -1] : [1]) {
    const f = 0.85 + 0.15 * Math.sin(t * 47 + x * 3 + s), L = r * 5.5 * f, X = x * s;
    const gr = c.createLinearGradient(0, y, 0, y + L);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.18, lighten(S.paint, 0.35)); gr.addColorStop(0.6, rgba(S.paint, 0.45)); gr.addColorStop(1, rgba(S.paint, 0));
    c.fillStyle = gr;
    c.beginPath(); c.moveTo(X - r * 0.75, y); c.quadraticCurveTo(X - r * 0.5, y + L * 0.5, X, y + L); c.quadraticCurveTo(X + r * 0.5, y + L * 0.5, X + r * 0.75, y); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.95)'; c.beginPath(); c.ellipse(X, y + 0.3, r * 0.45, r * 0.28, 0, 0, TAU); c.fill();
  }
  c.globalCompositeOperation = 'source-over';
}
function leds(c, S, t) {
  const [segs] = S.leds;
  const p = 0.75 + 0.25 * Math.sin(t * 3);
  c.globalCompositeOperation = 'lighter';
  for (const [w, col, a] of [[4.2, S.led, 0.3 * p], [2, S.led, 0.7], [0.9, '#ffffff', 1]]) {
    c.strokeStyle = rgba(col, a); c.lineWidth = w; c.lineCap = 'round'; c.beginPath();
    for (const [x1, y1, x2, y2] of segs) for (const s of [1, -1]) { c.moveTo(x1 * s, y1); c.lineTo(x2 * s, y2); }
    c.stroke();
  }
  c.lineCap = 'butt';
  c.globalCompositeOperation = 'source-over';
}

export function drawHypercar(c, id, t, bank = 0) {
  const S = SPECS[id];
  if (!S) return;
  let px = 4;
  try { const m = c.getTransform(); px = Math.hypot(m.a, m.b); } catch (_) { /* */ }
  px = clamp(Math.ceil(px * 1.05), 2, 14);
  const b = bake(id, px);
  engines(c, S, t);
  c.drawImage(b.cv, -OX, -OY, FW, FH);
  sheen(c, b, t, bank);
  leds(c, S, t);
  if (S.live) S.live(c, t, S);
}
export const HYPERCAR_IDS = Object.keys(SPECS);
