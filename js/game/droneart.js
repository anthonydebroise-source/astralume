// Drones d'escorte sculptés : mini-chasseurs détaillés + pièces animées (tourelle, pinces,
// plaques de bouclier, foret, anneaux), réacteurs et feux de navigation.
import { TAU, rgba, lighten, darken } from '../engine/math.js';
import { Sculptor } from '../engine/sculpt.js';
import { glow } from '../engine/sprites.js';
import { half, sides, circ, both, hgrad, vg, CARBON, STEEL, GOLD, hullPaint, wingPaint, carbon, trim, canopy, core, nozzle, leds, grooves } from './shipsculpt.js';

const FR = 46, O = 23; // cadre 46 × 46 unités, origine au centre
const mk = (px, col, w = FR, h = FR, ox = O, oy = O) => new Sculptor(w, h, px, { ox, oy, depth: 7, bevel: 0.4, rim: lighten(col, 0.3), rimK: 0.8, outline: 0.6, ao: 0.7, env: ['#b8d4ff', '#202430', '#ffffff'], amb: 0.34 });
const hexP = (x, y, R, a0 = Math.PI / 6) => (g) => { for (let i = 0; i < 6; i++) { const a = a0 + (i / 6) * TAU; if (i) g.lineTo(x + Math.cos(a) * R, y + Math.sin(a) * R); else g.moveTo(x + Math.cos(a) * R, y + Math.sin(a) * R); } g.closePath(); };

// ---------- corps (pré-rendus) ----------
const BODY = {
  sentinelle(S, c) {
    // poutres jumelles + ailes + fuselage en flèche
    wingPaint(S, [4, -2, 13, 1, 16, 9, 6, 8], c, 4, 16, 0.4, 0.15);
    for (const s of [1, -1]) {
      const boom = (g) => { g.moveTo(s * 9, -10); g.lineTo(s * 13, -8); g.lineTo(s * 13.5, 12); g.lineTo(s * 8.5, 12); g.closePath(); };
      S.paint(boom, { c: CARBON, mat: 'rubber', h: (k) => k.hCyl(s * 8.5, 0, s * 13.5, 0, 0.55, 0.2), bump: 0.25 });
      S.paint((g) => g.rect(s * 11 - 0.6, -9, 1.2, 19), { c, mat: 'gloss', h: 0.6 });
      S.paint((g) => g.rect(s * 11 - 0.9, -14, 1.8, 6), { c: STEEL, mat: 'chrome', h: (k) => k.hCyl(s * 11 - 0.9, 0, s * 11 + 0.9, 0, 0.7, 0.35) });
    }
    hullPaint(S, [0, -15, 2.6, -10, 5, -3, 5.6, 6, 4, 12, 0, 13], c, 6);
    trim(S, half([0, -15, 2.6, -10, 5, -3]));
    grooves(S, [[2, -6, 5, -6], [2, 6, 5, 6]]);
    S.paint(circ(0, 1, 5), { c: STEEL, mat: 'chrome', h: (k) => k.hDome(0, 1, 5, 0.75, 0.45) });
    S.paint(circ(0, 1, 3.4), { c: '#08090f', mat: 'metal', h: 0.5 });
    nozzle(S, 11, 12.5, 1.9); nozzle(S, 0, 13.5, 1.6);
    leds(S, [[1.4, -12, 2.4, -8]], lighten(c, 0.5));
    S.light(both(13.6, 9, 0.7), '#ff3a5a', 1);
  },
  glaneur(S, c) {
    S.paint(circ(0, 0, 14), { c: (g) => { const gr = g.createRadialGradient(-4, -4, 2, 0, 0, 14); gr.addColorStop(0, lighten(c, 0.3)); gr.addColorStop(0.7, c); gr.addColorStop(1, darken(c, 0.5)); return gr; }, mat: 'gold', h: (k) => k.hDome(0, 0, 14.5, 0.55, 0.2) });
    // bandes de sécurité sur le rebord
    S.within(circ(0, 0, 14), () => { for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU; S.paint((g) => { g.moveTo(Math.cos(a) * 10.5, Math.sin(a) * 10.5); g.lineTo(Math.cos(a + 0.18) * 10.5, Math.sin(a + 0.18) * 10.5); g.lineTo(Math.cos(a + 0.3) * 14.5, Math.sin(a + 0.3) * 14.5); g.lineTo(Math.cos(a + 0.12) * 14.5, Math.sin(a + 0.12) * 14.5); g.closePath(); }, { c: '#15151c', mat: 'rubber', h: 0.02, hm: 'add' }); } });
    S.stroke(circ(0, 0, 10.2), { c: STEEL, mat: 'chrome', w: 1.4, h: 0.08 });
    S.paint(circ(0, 0, 9), { c: CARBON, mat: 'rubber', h: 0.5, bump: 0.2 });
    S.paint(circ(0, -0.5, 6), { c: vg(-6, 6, '#fff6d0', darken(c, 0.4)), mat: 'glass', h: (k) => k.hDome(0, -0.5, 6.2, 1, 0.55) });
    S.light(circ(0, 0, 3), rgba('#fff3b0', 0.7), 3);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + 0.26; S.paint(circ(Math.cos(a) * 12.2, Math.sin(a) * 12.2, 0.9), { c: '#06060a', h: 0.4 }); S.light(circ(Math.cos(a) * 12.2, Math.sin(a) * 12.2, 0.6), i % 2 ? '#ff3a5a' : '#fff3b0', 0.8); }
    nozzle(S, 6, 13, 1.6);
  },
  egide(S, c) {
    for (let k = 0; k < 3; k++) {
      const a = -Math.PI / 2 + (k / 3) * TAU, ca = Math.cos(a), sa = Math.sin(a);
      S.paint((g) => { g.moveTo(ca * 4 - sa * 2.2, sa * 4 + ca * 2.2); g.lineTo(ca * 13 - sa * 1.4, sa * 13 + ca * 1.4); g.lineTo(ca * 13 + sa * 1.4, sa * 13 - ca * 1.4); g.lineTo(ca * 4 + sa * 2.2, sa * 4 - ca * 2.2); g.closePath(); }, { c: STEEL, mat: 'chrome', h: 0.4 });
      S.paint(circ(ca * 13.5, sa * 13.5, 2.6), { c: GOLD, mat: 'gold', h: (q) => q.hDome(ca * 13.5, sa * 13.5, 2.6, 0.75, 0.4) });
      S.light(circ(ca * 13.5, sa * 13.5, 1.3), c, 2);
    }
    S.paint(hexP(0, 0, 8.5), { c: vg(-8, 8, lighten(c, 0.2), darken(c, 0.5)), mat: 'gloss', h: (k) => k.hDome(0, 0, 9, 0.75, 0.35) });
    S.stroke(hexP(0, 0, 8.5), { c: GOLD, mat: 'gold', w: 1, h: 0.04 });
    S.paint(hexP(0, 0, 4.6, 0), { c: '#ffffff', mat: 'glass', h: (k) => k.hDome(0, 0, 4.6, 0.9, 0.6) });
    S.light(hexP(0, 0, 3.6, 0), rgba(c, 0.85), 3);
  },
  foreur(S, c) {
    wingPaint(S, [4, 4, 12, 10, 13, 15, 5, 12], c, 4, 13, 0.4, 0.15);
    hullPaint(S, [0, -4, 4.5, -2, 6, 6, 5, 13, 2.5, 16, 0, 16], c, 6.5);
    carbon(S, half([0, 0, 3, 1, 3.6, 10, 0, 11]), 0.05);
    trim(S, half([0, -4, 4.5, -2, 6, 6]));
    S.paint((g) => g.ellipse(0, -3, 6.2, 2.4, 0, 0, TAU), { c: STEEL, mat: 'chrome', h: (k) => k.hDomeE(0, -3, 6.2, 2.4, 0.7, 0.4) });
    core(S, 0, 5.5, 1.8, '#ffd27a');
    nozzle(S, 2.5, 16, 1.6);
    S.light(both(12.8, 14, 0.7), '#ffd23f', 1);
  },
  echo(S, c) {
    wingPaint(S, [5, -3, 14, 7, 15, 11, 6, 9], lighten(c, 0.2), 5, 15, 0.4, 0.15, 'glass');
    hullPaint(S, [0, -16, 2.4, -11, 4.6, -3, 5.2, 6, 3.6, 12, 0, 13], lighten(c, 0.15), 6);
    canopy(S, 0, -4, 2.8, 5.5, c);
    core(S, 0, 6, 1.8, c);
    nozzle(S, 2.4, 13, 1.5);
  },
  lumen(S, c) {
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * TAU + Math.PI / 4;
      S.paint((g) => { g.moveTo(Math.cos(a - 0.22) * 8, Math.sin(a - 0.22) * 8); g.lineTo(Math.cos(a) * 15, Math.sin(a) * 15); g.lineTo(Math.cos(a + 0.22) * 8, Math.sin(a + 0.22) * 8); g.closePath(); }, { c: GOLD, mat: 'gold', h: (q) => q.hLin(Math.cos(a) * 8, Math.sin(a) * 8, Math.cos(a) * 15, Math.sin(a) * 15, 0.5, 0.2) });
    }
    S.paint(circ(0, 0, 9.5), { c: STEEL, mat: 'chrome', h: (k) => k.hDome(0, 0, 10, 0.6, 0.3) });
    S.paint(circ(0, 0, 7.6), { c: (g) => { const gr = g.createRadialGradient(-2, -2, 0, 0, 0, 7.6); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.4, lighten(c, 0.3)); gr.addColorStop(1, darken(c, 0.35)); return gr; }, mat: 'glass', h: (k) => k.hDome(0, 0, 7.8, 0.95, 0.55) });
    for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU; S.stroke((g) => { g.moveTo(Math.cos(a) * 5, Math.sin(a) * 5); g.lineTo(Math.cos(a) * 9.2, Math.sin(a) * 9.2); }, { c: STEEL, mat: 'chrome', w: 1.1, h: 0.12 }); }
    S.light(circ(0, 0, 4), rgba('#ffffff', 0.6), 4);
  },
  prisme(S, c) {
    for (const s of [1, -1]) S.paint((g) => { g.moveTo(s * 4, 6); g.lineTo(s * 14, 12); g.lineTo(s * 12, 15); g.lineTo(s * 3, 11); g.closePath(); }, { c: STEEL, mat: 'chrome', h: (k) => k.hLin(s * 3, 0, s * 14, 0, 0.45, 0.2) });
    S.paint((g) => g.ellipse(0, 10, 7.5, 4.5, 0, 0, TAU), { c: vg(6, 15, lighten(c, 0.1), darken(c, 0.55)), mat: 'gloss', h: (k) => k.hDomeE(0, 10, 7.5, 4.5, 0.7, 0.3) });
    S.stroke((g) => g.ellipse(0, 10, 7.5, 4.5, 0, 0, TAU), { c: GOLD, mat: 'gold', w: 0.9, h: 0.04 });
    nozzle(S, 0, 15, 1.6);
  },
};

// ---------- pièces animées ----------
const PARTS = {
  sentinelle: (px, c) => { const S = mk(px, c, 16, 22, 8, 8); S.paint((g) => { g.rect(-3.2, 0, 1.6, 12); g.rect(1.6, 0, 1.6, 12); }, { c: STEEL, mat: 'chrome', h: 0.55 }); S.paint((g) => { g.rect(-3.6, 9.5, 2.4, 2.2); g.rect(1.2, 9.5, 2.4, 2.2); }, { c: GOLD, mat: 'gold', h: 0.65 }); S.paint(circ(0, 0, 5), { c: vg(-5, 5, lighten(c, 0.2), darken(c, 0.5)), mat: 'gloss', h: (k) => k.hDome(0, 0, 5, 0.9, 0.4) }); S.paint(circ(0, 1.5, 1.6), { c: '#06060a', h: 0.6 }); S.light(circ(0, 1.5, 1.1), '#ff3a5a', 1.2); return S.bake(); },
  glaneur: (px, c) => { const S = mk(px, c, 14, 16, 7, 3); S.paint((g) => { g.moveTo(-2, 0); g.quadraticCurveTo(-5, 6, -1, 11); g.lineTo(1, 10); g.quadraticCurveTo(-1.5, 6, 2, 0); g.closePath(); }, { c: STEEL, mat: 'chrome', h: 0.55 }); S.paint(circ(0, 0.5, 2), { c: GOLD, mat: 'gold', h: 0.6 }); S.light(circ(-0.2, 10.4, 0.9), '#fff3b0', 1); return S.bake(); },
  egide: (px, c) => { const S = mk(px, c, 14, 14, 7, 7); S.paint(hexP(0, 0, 5.5), { c: vg(-5, 5, lighten(c, 0.35), darken(c, 0.3)), mat: 'glass', h: (k) => k.hDome(0, 0, 5.6, 0.8, 0.35) }); S.stroke(hexP(0, 0, 5.5), { c: STEEL, mat: 'chrome', w: 0.9, h: 0.05 }); S.light(hexP(0, 0, 2.4), rgba('#ffffff', 0.7), 1.5); return S.bake(); },
  foreur: (px, c) => { const S = mk(px, c, 16, 20, 8, 14); S.paint((g) => { g.moveTo(0, -13); g.lineTo(6, 0); g.lineTo(-6, 0); g.closePath(); }, { c: vg(-13, 0, '#ffffff', '#6a7080'), mat: 'chrome', h: (k) => k.hCyl(-6, 0, 6, 0, 0.9, 0.25) }); S.paint((g) => g.rect(-6.5, -0.5, 13, 2.6), { c: GOLD, mat: 'gold', h: 0.5 }); return S.bake(); },
  lumen: null, prisme: (px, c) => { const S = mk(px, c, 20, 24, 10, 14); const pr = (g) => { g.moveTo(0, -13); g.lineTo(7, 3); g.lineTo(0, 8); g.lineTo(-7, 3); g.closePath(); }; S.paint(pr, { c: vg(-13, 8, lighten(c, 0.6), darken(c, 0.25)), mat: 'glass', h: (k) => k.hDome(0, -1, 9, 0.95, 0.3) }); S.stroke((g) => { g.moveTo(0, -13); g.lineTo(0, 8); g.moveTo(-7, 3); g.lineTo(7, 3); }, { c: '#ffffff', w: 0.5, h: 0.04 }); S.stroke(pr, { c: STEEL, mat: 'chrome', w: 0.9, h: 0.05 }); S.light(circ(0, 0, 2.2), '#ffffff', 2); return S.bake(); },
  echo: null,
};

const cache = new Map();
function art(id, px, col) {
  px = Math.max(2, Math.min(14, Math.ceil(px)));
  const k = id + '|' + px;
  let a = cache.get(k);
  if (a) return a;
  const S = mk(px, col);
  BODY[id](S, col);
  a = { body: S.bake(), part: PARTS[id] ? PARTS[id](px, col) : null };
  if (cache.size > 30) cache.clear();
  cache.set(k, a);
  return a;
}
const ds = (c, s, x = 0, y = 0) => c.drawImage(s.cv, x - s.ox, y - s.oy, s.w, s.h);
const bloom = (c, s, a) => { if (!s.bloom) return; c.globalCompositeOperation = 'lighter'; const ga = c.globalAlpha; c.globalAlpha = ga * a; c.drawImage(s.bloom, -s.ox, -s.oy, s.w, s.h); c.globalAlpha = ga; c.globalCompositeOperation = 'source-over'; };

// Dessin d'un drone au point courant (repère en unités). aim : angle de visée (tourelle).
export function drawDroneSculpt(c, id, col, t, sc = 1, aim = -Math.PI / 2, ghost = false) {
  let px = 4;
  try { const m = c.getTransform(); px = Math.hypot(m.a, m.b) * sc; } catch (_) { /* */ }
  const A = art(id, px * 1.05, col);
  c.save(); c.scale(sc, sc);
  // réacteur(s)
  const fl = 0.8 + 0.2 * Math.sin(t * 43);
  const flames = { sentinelle: [[11, 13, 1.7], [-11, 13, 1.7], [0, 14, 1.4]], foreur: [[2.5, 16.5, 1.4], [-2.5, 16.5, 1.4]], echo: [[2.4, 13.5, 1.3], [-2.4, 13.5, 1.3]], prisme: [[0, 15.5, 1.4]], glaneur: [[6, 13.5, 1.4], [-6, 13.5, 1.4]] }[id];
  if (flames) {
    c.globalCompositeOperation = 'lighter';
    for (const [x, y, r] of flames) {
      const L = r * 6 * fl, gr = c.createLinearGradient(0, y, 0, y + L);
      gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.25, lighten(col, 0.3)); gr.addColorStop(1, rgba(col, 0));
      c.fillStyle = gr; c.beginPath(); c.moveTo(x - r * 0.8, y); c.quadraticCurveTo(x - r * 0.5, y + L * 0.5, x, y + L); c.quadraticCurveTo(x + r * 0.5, y + L * 0.5, x + r * 0.8, y); c.closePath(); c.fill();
    }
    c.globalCompositeOperation = 'source-over';
  }
  if (ghost) c.globalAlpha *= 0.72;
  if (id === 'egide') {
    // bulle d'énergie + plaques en orbite
    c.globalCompositeOperation = 'lighter';
    const g = glow(col, 16); c.globalAlpha *= 0.5; c.drawImage(g.c, -20, -20, 40, 40); c.globalAlpha /= 0.5;
    c.strokeStyle = rgba(col, 0.45 + 0.2 * Math.sin(t * 5)); c.lineWidth = 0.9; c.beginPath(); c.arc(0, 0, 17, 0, TAU); c.stroke();
    c.globalCompositeOperation = 'source-over';
    c.save(); c.rotate(t * 0.6); ds(c, A.body); bloom(c, A.body, 0.8); c.restore();
    for (let i = 0; i < 3; i++) { const a = t * 2.2 + (i / 3) * TAU; c.save(); c.translate(Math.cos(a) * 18, Math.sin(a) * 18); c.rotate(a); ds(c, A.part); c.restore(); }
  } else if (id === 'lumen') {
    c.save(); c.rotate(t * 0.8); ds(c, A.body); c.restore();
    bloom(c, A.body, 0.7 + 0.3 * Math.sin(t * 6));
    c.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 2; k++) { c.strokeStyle = rgba(k ? '#ffffff' : col, 0.8); c.lineWidth = 0.9; c.beginPath(); c.ellipse(0, 0, 14, 4.5, t * (1.5 + k) + k * 1.4, 0, TAU); c.stroke(); }
    c.globalCompositeOperation = 'source-over';
  } else if (id === 'glaneur') {
    c.save(); c.rotate(t * 1.6); ds(c, A.body); c.restore();
    bloom(c, A.body, 0.8);
    const op = 0.25 + 0.2 * Math.sin(t * 4);
    for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU + Math.PI / 2; c.save(); c.rotate(a); c.translate(0, 12); c.rotate(-op); ds(c, A.part); c.restore(); }
  } else if (id === 'foreur') {
    ds(c, A.body); bloom(c, A.body, 0.8);
    c.save(); c.translate(0, -3); ds(c, A.part);
    // rainures hélicoïdales qui défilent
    c.strokeStyle = 'rgba(40,40,60,0.55)'; c.lineWidth = 0.7;
    for (let k = 0; k < 4; k++) { const u = ((t * 3 + k / 4) % 1); const y = -u * 12, w = 6 * (1 - u); c.beginPath(); c.moveTo(-w, y + 1.5); c.lineTo(w, y - 1.5); c.stroke(); }
    c.restore();
  } else if (id === 'prisme') {
    ds(c, A.body); bloom(c, A.body, 0.8);
    c.save(); c.translate(0, -1); c.scale(0.75 + 0.25 * Math.cos(t * 1.5), 1); ds(c, A.part); c.restore();
    c.globalCompositeOperation = 'lighter'; const g = glow(col, 16); c.globalAlpha *= 0.6; c.drawImage(g.c, -9, -11, 18, 18); c.globalAlpha /= 0.6; c.globalCompositeOperation = 'source-over';
  } else if (id === 'sentinelle') {
    ds(c, A.body); bloom(c, A.body, 0.8);
    c.save(); c.translate(0, 1); c.rotate(aim - Math.PI / 2); ds(c, A.part); c.restore();
  } else {
    ds(c, A.body); bloom(c, A.body, 0.9);
    if (ghost) { c.globalCompositeOperation = 'lighter'; c.strokeStyle = rgba(col, 0.35); c.lineWidth = 0.6; for (let y = -16 + ((t * 20) % 3); y < 14; y += 3) { c.beginPath(); c.moveTo(-14, y); c.lineTo(14, y); c.stroke(); } c.globalCompositeOperation = 'source-over'; }
  }
  // feux de navigation clignotants
  if (Math.sin(t * 5) > 0.4) { c.globalCompositeOperation = 'lighter'; const g = glow('#ffffff', 16); c.globalAlpha *= 0.8; c.drawImage(g.c, -2.5, -O * 0.62 - 2.5, 5, 5); c.globalAlpha /= 0.8; c.globalCompositeOperation = 'source-over'; }
  c.restore();
}
export function prebakeDrone(id, px, col) { art(id, px, col); }
