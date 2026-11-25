// Aliens sculptés : un sprite en relief par type (laque, chitine, chrome, glandes lumineuses),
// pré-rendu par couleur, puis animé en direct (yeux qui suivent le joueur, lueurs, ailes, respiration).
import { TAU, rgba, lighten, darken, mixHex } from '../engine/math.js';
import { Sculptor } from '../engine/sculpt.js';
import { ctx, setRTS, view } from '../engine/renderer.js';
import { glow } from '../engine/sprites.js';

const STEEL = '#c3cad8', GOLD = '#ecb44e';
const circ = (x, y, r) => (g) => g.arc(x, y, r, 0, TAU);
const ell = (x, y, rx, ry, a = 0) => (g) => g.ellipse(x, y, rx, ry, a, 0, TAU);
const poly = (p) => (g) => { g.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]); g.closePath(); };
const vg = (y0, y1, a, b) => (g) => { const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, a); gr.addColorStop(1, b); return gr; };
const rg = (x, y, r, a, b, c2) => (g) => { const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.4, 0, x, y, r); gr.addColorStop(0, a); gr.addColorStop(0.55, b); gr.addColorStop(1, c2); return gr; };
function lacq(S, path, col, x, y, r, h0 = 0.9, h1 = 0.25, bump = 0.12) { S.paint(path, { c: rg(x, y, r * 1.1, lighten(col, 0.3), col, darken(col, 0.55)), mat: 'gloss', h: (k) => k.hDome(x, y, r, h0, h1), bump }); }
function socket(S, x, y, r, rim) { S.paint(circ(x, y, r * 1.18), { c: rim, mat: rim === GOLD ? 'gold' : 'chrome', h: (k) => k.hDome(x, y, r * 1.2, 0.8, 0.5) }); S.paint(circ(x, y, r), { c: '#07040e', mat: 'glass', h: 0.45 }); }

// chaque design : build(S, C, r) dans un cadre de 3,6 r ; eyes : [x, y, rayon] (en r) dessinés en direct
const D = {
  globule: {
    build(S, C, r) {
      for (let i = 0; i < 3; i++) { const x = (i - 1) * r * 0.45; S.paint((g) => { g.moveTo(x - r * 0.12, r * 0.6); g.quadraticCurveTo(x + (i - 1) * r * 0.4, r * 1.1, x + (i - 1) * r * 0.5, r * 1.45); g.lineTo(x + r * 0.1, r * 0.62); g.closePath(); }, { c: C.c2, mat: 'gloss', h: 0.3 }); }
      for (let i = 0; i < 7; i++) { const a = -Math.PI + (i / 6) * Math.PI; S.paint(poly([Math.cos(a - 0.13) * r * 0.9, Math.sin(a - 0.13) * r * 0.9, Math.cos(a) * r * 1.38, Math.sin(a) * r * 1.38, Math.cos(a + 0.13) * r * 0.9, Math.sin(a + 0.13) * r * 0.9]), { c: i % 2 ? C.c2 : STEEL, mat: i % 2 ? 'gloss' : 'chrome', h: 0.45 }); }
      lacq(S, circ(0, 0, r), C.c1, 0, 0, r, 0.95, 0.25, 0.3);
      S.paint((g) => { g.ellipse(0, -r * 0.32, r * 0.86, r * 0.42, 0, Math.PI, 0); g.closePath(); }, { c: vg(-r * 0.8, -r * 0.2, darken(C.c1, 0.35), darken(C.c1, 0.75)), mat: 'gloss', h: 0.1, hm: 'add' });
      S.stroke((g) => g.ellipse(0, -r * 0.32, r * 0.86, r * 0.42, 0, Math.PI, 0), { c: GOLD, mat: 'gold', w: r * 0.08, h: 0.04 });
      for (const s of [-1, 1]) S.stroke((g) => { g.moveTo(s * r * 0.3, r * 0.5); g.quadraticCurveTo(s * r * 0.8, r * 0.45, s * r * 0.82, r * 0.02); }, { emi: rgba(C.cg, 0.8), ew: r * 0.06, w: r * 0.08, h: -0.03, c: darken(C.c1, 0.3) });
      socket(S, 0, -r * 0.08, r * 0.46, STEEL);
      S.paint((g) => { g.moveTo(-r * 0.3, r * 0.42); g.lineTo(-r * 0.2, r * 0.75); g.lineTo(-r * 0.1, r * 0.44); g.closePath(); g.moveTo(r * 0.1, r * 0.44); g.lineTo(r * 0.2, r * 0.75); g.lineTo(r * 0.3, r * 0.42); g.closePath(); }, { c: '#fff4e0', mat: 'gloss', h: 0.5 });
    },
    eyes: [[0, -0.08, 0.44]],
  },
  dardeur: {
    build(S, C, r) {
      for (let i = 0; i < 4; i++) { const x = (i - 1.5) * r * 0.28; S.stroke((g) => { g.moveTo(x, -r * 0.4); g.quadraticCurveTo(x + (i - 1.5) * r * 0.3, -r * 1.1, x + (i - 1.5) * r * 0.15, -r * 1.65); }, { c: C.c2, mat: 'gloss', w: r * 0.16, h: 0.25 }); }
      for (const s of [-1, 1]) { S.paint(poly([s * r * 0.6, -r * 0.1, s * r * 1.15, -r * 0.6, s * r * 0.45, -r * 0.6]), { c: lighten(C.cg, 0.1), mat: 'gloss', h: 0.3 }); S.stroke(poly([s * r * 0.6, -r * 0.1, s * r * 1.15, -r * 0.6, s * r * 0.45, -r * 0.6]), { c: GOLD, mat: 'gold', w: r * 0.07, h: 0.03 }); }
      lacq(S, ell(0, r * 0.15, r * 0.7, r * 1.08), C.c1, 0, r * 0.1, r * 1.05, 0.95, 0.25);
      S.paint(ell(0, -r * 0.15, r * 0.3, r * 0.75), { c: darken(C.c1, 0.5), mat: 'metal', h: 0.06, hm: 'add' });
      S.stroke((g) => { g.moveTo(0, -r * 0.85); g.lineTo(0, r * 0.6); }, { c: GOLD, mat: 'gold', w: r * 0.07, h: 0.03 });
      for (const s of [-1, 1]) socket(S, s * r * 0.28, r * 0.56, r * 0.17, STEEL);
    },
    live(c, e, t, r) { const aim = e.data.st === 'aim'; c.globalCompositeOperation = 'lighter'; const g = glow(aim ? '#ffffff' : e.cg, 16); for (const s of [-1, 1]) { c.globalAlpha = aim ? 1 : 0.7; c.drawImage(g.c, s * r * 0.28 - r * 0.3, r * 0.56 - r * 0.3, r * 0.6, r * 0.6); } c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; for (const s of [-1, 1]) { c.fillStyle = aim ? '#ffffff' : '#fff6c8'; c.beginPath(); c.arc(s * r * 0.28, r * 0.56, r * 0.1, 0, TAU); c.fill(); } },
  },
  tournoyeur: {
    build(S, C, r) {
      const p = (a, d) => [Math.cos(a) * d, Math.sin(a) * d];
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TAU;
        const blade = (g) => { g.moveTo(...p(a - 0.42, r * 0.5)); g.quadraticCurveTo(...p(a + 0.05, r * 1.0), ...p(a + 0.5, r * 1.36)); g.quadraticCurveTo(...p(a + 0.38, r * 0.72), ...p(a + 0.84, r * 0.5)); g.closePath(); };
        S.paint(blade, { c: rg(0, 0, r * 1.3, lighten(C.c1, 0.3), C.c1, darken(C.c1, 0.5)), mat: 'gloss', h: (k) => k.hDome(0, 0, r * 1.4, 0.7, 0.2) });
        S.stroke((g) => { g.moveTo(...p(a - 0.2, r * 0.75)); g.quadraticCurveTo(...p(a + 0.05, r * 1.0), ...p(a + 0.5, r * 1.34)); }, { c: STEEL, mat: 'chrome', w: r * 0.09, h: 0.06 });
        S.light(circ(...p(a + 0.5, r * 1.25), r * 0.09), '#ffffff', r * 0.15);
      }
      S.paint(circ(0, 0, r * 0.64), { c: darken(C.c1, 0.6), mat: 'metal', h: (k) => k.hDome(0, 0, r * 0.66, 0.75, 0.45) });
      S.stroke(circ(0, 0, r * 0.62), { c: GOLD, mat: 'gold', w: r * 0.08, h: 0.04 });
      for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU + TAU / 10; S.paint(circ(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5, r * 0.07), { c: C.c2, mat: 'glass', h: 0.15, hm: 'add' }); S.light(circ(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5, r * 0.05), C.cg, r * 0.1); }
      socket(S, 0, 0, r * 0.42, STEEL);
    },
    eyes: [[0, 0, 0.4, true]],
  },
  canonnier: {
    build(S, C, r) {
      for (const s of [-1, 1]) {
        S.paint((g) => g.rect(s * r * 0.95 - r * 0.24, -r * 0.3, r * 0.48, r * 1.2), { c: darken(C.c2, 0.3), mat: 'metal', h: (k) => k.hCyl(s * r * 0.95 - r * 0.24, 0, s * r * 0.95 + r * 0.24, 0, 0.6, 0.25) });
        S.paint(ell(s * r * 0.95, r * 0.92, r * 0.2, r * 0.1), { c: '#06050b', h: 0.3 }); S.light(ell(s * r * 0.95, r * 0.9, r * 0.15, r * 0.06), C.cg, r * 0.12);
        S.paint((g) => g.rect(s * r * 0.95 - r * 0.26, r * 0.05, r * 0.52, r * 0.12), { c: GOLD, mat: 'gold', h: 0.65 });
      }
      const hex = (R, a0 = Math.PI / 6) => (g) => { for (let i = 0; i < 6; i++) { const a = a0 + (i / 6) * TAU; if (i) g.lineTo(Math.cos(a) * R, Math.sin(a) * R); else g.moveTo(Math.cos(a) * R, Math.sin(a) * R); } g.closePath(); };
      S.paint(hex(r), { c: STEEL, mat: 'steel', h: (k) => k.hDome(0, 0, r * 1.1, 0.55, 0.3) });
      S.paint(hex(r * 0.86), { c: rg(0, 0, r, lighten(C.c1, 0.3), C.c1, darken(C.c1, 0.5)), mat: 'gloss', h: (k) => k.hDome(0, 0, r, 0.85, 0.4) });
      S.paint(hex(r * 0.55), { c: darken(C.c1, 0.55), mat: 'metal', h: 0.06, hm: 'add' });
      for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; S.rivets([[Math.cos(a) * r * 0.74, Math.sin(a) * r * 0.74]], r * 0.07, STEEL); }
      socket(S, 0, r * 0.08, r * 0.3, GOLD);
    },
    live(c, e, t, r) { const k = 0.5 + 0.5 * Math.sin(t * 6 + e.seed); c.globalCompositeOperation = 'lighter'; const g = glow('#ff3f6e', 16); c.globalAlpha = 0.6 + 0.4 * k; c.drawImage(g.c, -r * 0.5, r * 0.08 - r * 0.5, r, r); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.fillStyle = rgba('#ff3f6e', 0.8 + 0.2 * k); c.beginPath(); c.arc(0, r * 0.08, r * 0.24, 0, TAU); c.fill(); c.fillStyle = '#ffffff'; c.beginPath(); c.arc(-r * 0.07, 0, r * 0.08, 0, TAU); c.fill(); },
  },
  mortier: {
    build(S, C, r) {
      S.paint(ell(0, r * 0.38, r * 1.08, r * 0.62), { c: vg(0, r, darken(C.c2, 0.1), darken(C.c2, 0.55)), mat: 'metal', h: (k) => k.hDomeE(0, r * 0.38, r * 1.08, r * 0.62, 0.55, 0.2) });
      S.stroke(ell(0, r * 0.38, r * 1.0, r * 0.55), { c: GOLD, mat: 'gold', w: r * 0.08, h: 0.04 });
      S.paint((g) => g.rect(-r * 0.32, r * 0.1, r * 0.64, r * 0.98), { c: '#2a2a3a', mat: 'steel', h: (k) => k.hCyl(-r * 0.32, 0, r * 0.32, 0, 0.75, 0.3) });
      S.paint((g) => g.rect(-r * 0.38, r * 0.9, r * 0.76, r * 0.16), { c: STEEL, mat: 'chrome', h: 0.7 });
      lacq(S, ell(0, -r * 0.05, r * 0.78, r * 0.64), C.c1, 0, -r * 0.05, r * 0.8, 0.95, 0.4, 0.2);
      S.paint(ell(0, -r * 0.3, r * 0.5, r * 0.18), { c: darken(C.c1, 0.5), mat: 'metal', h: 0.05, hm: 'add' });
      for (const s of [-1, 1]) socket(S, s * r * 0.26, -r * 0.12, r * 0.13, GOLD);
    },
    live(c, e, t, r) { c.globalCompositeOperation = 'lighter'; const g = glow('#ffd23f', 16); for (const s of [-1, 1]) { c.globalAlpha = 0.8; c.drawImage(g.c, s * r * 0.26 - r * 0.22, -r * 0.12 - r * 0.22, r * 0.44, r * 0.44); } c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.fillStyle = '#ffe27a'; for (const s of [-1, 1]) { c.beginPath(); c.arc(s * r * 0.26, -r * 0.12, r * 0.08, 0, TAU); c.fill(); } },
  },
  lanceur: {
    build(S, C, r) {
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * TAU + Math.PI / 4, ca = Math.cos(a), sa = Math.sin(a), tf = (x, y) => [x * ca - y * sa, x * sa + y * ca];
        S.paint(poly([...tf(r * 0.5, -r * 0.28), ...tf(r * 1.4, 0), ...tf(r * 0.5, r * 0.28)]), { c: lighten(C.c2, 0.15), mat: 'gloss', h: 0.35 });
        S.stroke((g) => { g.moveTo(...tf(r * 0.55, 0)); g.lineTo(...tf(r * 1.3, 0)); }, { c: STEEL, mat: 'chrome', w: r * 0.07, h: 0.05 });
      }
      lacq(S, circ(0, 0, r * 0.8), C.c1, 0, 0, r * 0.82, 0.95, 0.3, 0.15);
      S.stroke(circ(0, 0, r * 0.78), { c: GOLD, mat: 'gold', w: r * 0.08, h: 0.05 });
      for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; S.rivets([[Math.cos(a) * r * 0.66, Math.sin(a) * r * 0.66]], r * 0.05, STEEL); }
      socket(S, 0, r * 0.05, r * 0.46, STEEL);
    },
    eyes: [[0, 0.05, 0.44]],
  },
  cuirasse: {
    build(S, C, r) {
      for (const s of [-1, 1]) for (let i = 0; i < 3; i++) S.stroke((g) => { g.moveTo(s * r * 0.5, -r * 0.2 + i * r * 0.35); g.lineTo(s * r * 1.15, -r * 0.4 + i * r * 0.42); g.lineTo(s * r * 1.25, -r * 0.1 + i * r * 0.45); }, { c: darken(C.c2, 0.3), mat: 'metal', w: r * 0.1, h: 0.2 });
      lacq(S, ell(0, r * 0.05, r * 0.85, r * 1.05), darken(C.c2, 0.25), 0, 0, r * 1.05, 0.7, 0.2);
      for (const s of [-1, 1]) {
        const wing = (g) => { g.moveTo(0, -r * 0.92); g.quadraticCurveTo(s * r * 1.0, -r * 0.7, s * r * 0.92, r * 0.4); g.quadraticCurveTo(s * r * 0.6, r * 0.95, 0, r * 1.02); g.closePath(); };
        S.paint(wing, { c: rg(s * r * 0.4, -r * 0.3, r * 1.1, lighten(C.c1, 0.35), C.c1, darken(C.c1, 0.5)), mat: 'gloss', h: (k) => k.hDome(s * r * 0.4, 0, r * 1.05, 0.95, 0.3), bump: 0.05 });
        S.stroke((g) => { g.moveTo(0, -r * 0.92); g.quadraticCurveTo(s * r * 1.0, -r * 0.7, s * r * 0.92, r * 0.4); }, { c: GOLD, mat: 'gold', w: r * 0.07, h: 0.04 });
        for (let i = 0; i < 3; i++) S.paint(circ(s * r * 0.45, -r * 0.4 + i * r * 0.45, r * 0.1), { c: STEEL, mat: 'chrome', h: 0.1, hm: 'add' });
      }
      S.stroke((g) => { g.moveTo(0, -r * 0.9); g.lineTo(0, r * 1.0); }, { c: '#06040c', w: r * 0.07, h: -0.05 });
      S.paint(ell(0, -r * 0.95, r * 0.45, r * 0.25), { c: darken(C.c1, 0.6), mat: 'metal', h: 0.55 });
      for (const s of [-1, 1]) { S.paint(circ(s * r * 0.2, -r * 0.98, r * 0.09), { c: C.cg, mat: 'glass', h: 0.6 }); S.light(circ(s * r * 0.2, -r * 0.98, r * 0.07), C.cg, r * 0.15); }
    },
  },
  raie: {
    build(S, C, r) {
      S.stroke((g) => { g.moveTo(0, -r * 0.5); g.quadraticCurveTo(r * 0.15, -r * 1.2, 0, -r * 1.75); }, { c: darken(C.c1, 0.3), mat: 'gloss', w: r * 0.12, h: 0.25 });
      // raie manta : tête vers le bas (sens de la nage), ailes en pointe rejetées vers l'arrière
      const wings = (g) => { g.moveTo(0, r * 0.75); g.quadraticCurveTo(r * 0.55, r * 0.55, r * 0.9, r * 0.05); g.quadraticCurveTo(r * 1.25, -r * 0.35, r * 1.7, -r * 0.75); g.quadraticCurveTo(r * 0.9, -r * 0.45, r * 0.3, -r * 0.6); g.quadraticCurveTo(0, -r * 0.7, -r * 0.3, -r * 0.6); g.quadraticCurveTo(-r * 0.9, -r * 0.45, -r * 1.7, -r * 0.75); g.quadraticCurveTo(-r * 1.25, -r * 0.35, -r * 0.9, r * 0.05); g.quadraticCurveTo(-r * 0.55, r * 0.55, 0, r * 0.75); g.closePath(); };
      for (const s of [-1, 1]) S.paint((g) => { g.moveTo(s * r * 0.12, r * 0.7); g.quadraticCurveTo(s * r * 0.3, r * 1.05, s * r * 0.18, r * 1.2); g.lineTo(s * r * 0.05, r * 0.78); g.closePath(); }, { c: darken(C.c1, 0.2), mat: 'gloss', h: 0.3 });
      S.paint(wings, { c: rg(0, -r * 0.2, r * 1.6, lighten(C.c1, 0.35), C.c1, darken(C.c1, 0.55)), mat: 'gloss', h: (k) => k.hDomeE(0, 0, r * 1.6, r * 0.7, 0.85, 0.15), bump: 0.1 });
      for (const s of [-1, 1]) for (let i = 1; i < 4; i++) S.stroke((g) => { g.moveTo(s * r * 0.3, r * 0.1); g.quadraticCurveTo(s * r * (0.5 + i * 0.25), -r * 0.05, s * r * (0.6 + i * 0.32), -r * 0.5); }, { c: 'rgba(0,0,0,0.3)', w: r * 0.05, h: -0.04, emi: i === 2 ? rgba(C.cg, 0.6) : undefined, ew: r * 0.04 });
      S.stroke(wings, { c: lighten(C.c2, 0.2), mat: 'gloss', w: r * 0.07, h: 0.03 });
      for (const s of [-1, 1]) socket(S, s * r * 0.24, r * 0.38, r * 0.14, GOLD);
    },
    live(c, e, t, r) { c.globalCompositeOperation = 'lighter'; const g = glow(e.cg, 16); for (const s of [-1, 1]) { c.globalAlpha = 0.75; c.drawImage(g.c, s * r * 0.24 - r * 0.25, r * 0.38 - r * 0.25, r * 0.5, r * 0.5); } c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.fillStyle = '#ffffff'; for (const s of [-1, 1]) { c.beginPath(); c.arc(s * r * 0.24, r * 0.38, r * 0.07, 0, TAU); c.fill(); } },
    flap: true,
  },
  mante: {
    build(S, C, r) {
      for (const s of [-1, 1]) {
        S.paint((g) => { g.moveTo(s * r * 0.3, -r * 0.1); g.quadraticCurveTo(s * r * 1.25, -r * 0.9, s * r * 1.35, -r * 0.1); g.quadraticCurveTo(s * r * 0.9, r * 0.15, s * r * 0.3, r * 0.2); g.closePath(); }, { c: rgba(lighten(C.c2, 0.25), 0.75), mat: 'glass', h: 0.2 });
        S.stroke((g) => { g.moveTo(s * r * 0.3, -r * 0.05); g.quadraticCurveTo(s * r * 1.2, -r * 0.85, s * r * 1.35, -r * 0.1); }, { c: STEEL, mat: 'chrome', w: r * 0.08, h: 0.1 });
        S.paint((g) => { g.moveTo(s * r * 0.35, r * 0.3); g.quadraticCurveTo(s * r * 1.1, r * 0.55, s * r * 0.75, r * 1.45); g.quadraticCurveTo(s * r * 0.8, r * 0.75, s * r * 0.3, r * 0.5); g.closePath(); }, { c: vg(r * 0.3, r * 1.4, lighten(C.c1, 0.3), darken(C.c1, 0.3)), mat: 'gloss', h: 0.4 });
        S.stroke((g) => { g.moveTo(s * r * 0.4, r * 0.45); g.quadraticCurveTo(s * r * 0.95, r * 0.75, s * r * 0.75, r * 1.4); }, { c: '#ffffff', mat: 'chrome', w: r * 0.07, h: 0.08 });
      }
      for (let i = 0; i < 3; i++) lacq(S, ell(0, -r * 0.7 + i * r * 0.55, r * (0.42 - i * 0.05), r * 0.32), C.c1, 0, -r * 0.7 + i * r * 0.55, r * 0.45, 0.95, 0.35, 0.05);
      S.paint(poly([-r * 0.5, r * 0.75, r * 0.5, r * 0.75, 0, r * 1.25]), { c: rg(0, r * 0.9, r * 0.5, lighten(C.c1, 0.3), C.c1, darken(C.c1, 0.5)), mat: 'gloss', h: (k) => k.hDome(0, r * 0.9, r * 0.5, 0.9, 0.4) });
      for (const s of [-1, 1]) { S.paint(ell(s * r * 0.24, r * 0.86, r * 0.16, r * 0.11, s * 0.5), { c: C.cg, mat: 'glass', h: 0.15, hm: 'add' }); S.light(ell(s * r * 0.24, r * 0.86, r * 0.12, r * 0.07, s * 0.5), lighten(C.cg, 0.4), r * 0.15); }
    },
  },
  meduse: {
    build(S, C, r) {
      lacq(S, (g) => { g.moveTo(-r, r * 0.3); g.bezierCurveTo(-r * 1.05, -r * 1.1, r * 1.05, -r * 1.1, r, r * 0.3); g.closePath(); }, C.c1, 0, 0, r * 1.05, 0.95, 0.2, 0.08);
      S.within((g) => { g.moveTo(-r, r * 0.3); g.bezierCurveTo(-r * 1.05, -r * 1.1, r * 1.05, -r * 1.1, r, r * 0.3); g.closePath(); }, () => { S.paint(circ(0, -r * 0.25, r * 0.4), { c: lighten(C.cg, 0.2), mat: 'glass', h: 0.06, hm: 'add', a: 0.6 }); S.light(circ(0, -r * 0.25, r * 0.28), rgba(C.cg, 0.7), r * 0.3); });
      for (let i = -2; i <= 2; i++) S.stroke((g) => { g.moveTo(i * r * 0.12, -r * 0.75); g.quadraticCurveTo(i * r * 0.3, -r * 0.2, i * r * 0.36, r * 0.28); }, { c: STEEL, mat: 'chrome', w: r * 0.06, h: 0.06 });
      S.paint((g) => { g.moveTo(-r * 1.02, r * 0.18); g.quadraticCurveTo(0, r * 0.05, r * 1.02, r * 0.18); g.lineTo(r * 0.98, r * 0.4); g.quadraticCurveTo(0, r * 0.3, -r * 0.98, r * 0.4); g.closePath(); }, { c: GOLD, mat: 'gold', h: 0.12, hm: 'add' });
      for (const s of [-1, 1]) socket(S, s * r * 0.36, -r * 0.05, r * 0.14, STEEL);
    },
    eyes: [[-0.36, -0.05, 0.13], [0.36, -0.05, 0.13]],
    tentacles: 5,
  },
  spore: {
    build(S, C, r) {
      for (let i = 0; i < 9; i++) { const a = (i / 9) * TAU; S.paint(circ(Math.cos(a) * r * 0.85, Math.sin(a) * r * 0.85, r * 0.26), { c: C.c2, mat: 'gloss', h: (k) => k.hDome(Math.cos(a) * r * 0.85, Math.sin(a) * r * 0.85, r * 0.26, 0.6, 0.2) }); }
      lacq(S, circ(0, 0, r * 0.88), C.c1, 0, 0, r * 0.9, 0.95, 0.3, 0.45);
      for (let i = 0; i < 7; i++) { const a = (i / 7) * TAU + 0.3, d = r * (0.3 + (i % 3) * 0.17); S.paint(circ(Math.cos(a) * d, Math.sin(a) * d, r * 0.1), { c: '#07040e', h: -0.05, hm: 'sub' }); S.light(circ(Math.cos(a) * d, Math.sin(a) * d, r * 0.07), C.cg, r * 0.12); }
    },
    pulse: true,
  },
  pollen: {
    build(S, C, r) {
      for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; S.paint(ell(Math.cos(a) * r * 0.72, Math.sin(a) * r * 0.72, r * 0.55, r * 0.28, a), { c: rg(Math.cos(a) * r * 0.72, Math.sin(a) * r * 0.72, r * 0.55, lighten(C.c2, 0.35), C.c2, darken(C.c2, 0.4)), mat: 'gloss', h: (k) => k.hDome(Math.cos(a) * r * 0.72, Math.sin(a) * r * 0.72, r * 0.55, 0.6, 0.2) }); }
      S.paint(circ(0, 0, r * 0.5), { c: GOLD, mat: 'gold', h: (k) => k.hDome(0, 0, r * 0.52, 0.9, 0.4) });
      for (let i = 0; i < 10; i++) { const a = i * 2.4, d = r * 0.12 * Math.sqrt(i + 1); S.paint(circ(Math.cos(a) * d, Math.sin(a) * d, r * 0.06), { c: '#fff3b0', mat: 'gloss', h: 0.08, hm: 'add' }); }
      S.light(circ(0, 0, r * 0.18), rgba('#fff3b0', 0.6), r * 0.25);
    },
    spin: 1.2,
  },
  glouton: {
    build(S, C, r) {
      lacq(S, ell(0, 0, r * 1.0, r * 0.92), C.c1, 0, -r * 0.1, r * 1.05, 0.95, 0.25, 0.35);
      S.paint(ell(0, r * 0.28, r * 0.68, r * 0.42), { c: '#1a0408', mat: 'gloss', h: 0.1 });
      S.light(ell(0, r * 0.32, r * 0.45, r * 0.22), rgba('#ff3a5a', 0.55), r * 0.2);
      for (let i = 0; i < 7; i++) { const x = (i - 3) * r * 0.18, top = i % 2 === 0; S.paint(poly([x - r * 0.08, r * (top ? 0.0 : 0.6), x, r * (top ? 0.22 : 0.4), x + r * 0.08, r * (top ? 0.0 : 0.6)]), { c: '#fff4e0', mat: 'gloss', h: 0.5 }); }
      for (const s of [-1, 1]) { S.paint(ell(s * r * 0.45, -r * 0.45, r * 0.28, r * 0.12, s * 0.3), { c: darken(C.c1, 0.6), mat: 'metal', h: 0.08, hm: 'add' }); }
      for (const s of [-1, 1]) socket(S, s * r * 0.4, -r * 0.28, r * 0.17, STEEL);
    },
    eyes: [[-0.4, -0.28, 0.16], [0.4, -0.28, 0.16]],
  },
  nautile: {
    build(S, C, r) {
      for (let i = 0; i < 5; i++) { const a = Math.PI * 0.35 + i * 0.18; S.stroke((g) => { g.moveTo(Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6); g.quadraticCurveTo(Math.cos(a) * r * 1.2, Math.sin(a) * r * 1.3, Math.cos(a + 0.2) * r * 1.45, Math.sin(a + 0.2) * r * 1.5); }, { c: C.c2, mat: 'gloss', w: r * 0.1, h: 0.25 }); }
      lacq(S, circ(0, 0, r), C.c1, 0, 0, r * 1.02, 0.85, 0.25, 0.05);
      let a = 0, d = r * 0.95;
      const spiral = (g) => { g.moveTo(Math.cos(0) * d, 0); for (let i = 0; i <= 60; i++) { a = (i / 60) * TAU * 2.2; const rr = r * 0.95 * Math.pow(0.86, a); g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } };
      S.stroke(spiral, { c: GOLD, mat: 'gold', w: r * 0.08, h: 0.08 });
      for (let i = 0; i < 9; i++) { const aa = (i / 9) * TAU; S.stroke((g) => { g.moveTo(Math.cos(aa) * r * 0.35, Math.sin(aa) * r * 0.35); g.lineTo(Math.cos(aa) * r * 0.95, Math.sin(aa) * r * 0.95); }, { c: 'rgba(0,0,0,0.3)', w: r * 0.04, h: -0.04 });
      }
      S.light(circ(0, 0, r * 0.15), rgba(C.cg, 0.8), r * 0.2);
    },
  },
};

// ---------- pré-rendu ----------
const cache = new Map();
function art(type, T, C, elite, px) {
  const d = D[type];
  if (!d) return null;
  px = Math.max(2, Math.min(10, Math.ceil(px)));
  const key = type + '|' + C.c1 + C.c2 + C.cg + '|' + (elite ? 1 : 0) + '|' + px;
  let A = cache.get(key);
  if (A) return A;
  const r = T.r, F = r * 3.8;
  const col = elite ? { c1: mixHex(C.c1, '#ffc23d', 0.45), c2: mixHex(C.c2, '#ffe27a', 0.35), cg: '#ffd23f' } : C;
  const S = new Sculptor(F, F, px, { ox: F / 2, oy: F / 2, depth: r * 0.55, bevel: 0.45, rim: elite ? '#ffe27a' : C.cg, rimK: 0.85, outline: 0.8, ao: 0.6, env: ['#b8d4ff', '#202430', '#ffffff'], amb: 0.36 });
  d.build(S, col, r);
  A = S.bake(); A.r = r; A.d = d;
  if (cache.size > 90) cache.clear();
  cache.set(key, A);
  return A;
}
export const hasAlienArt = (type) => !!D[type];

// œil vivant (pupille fendue qui suit le joueur, clignement)
function liveEye(c, x, y, r, e, open, ex) {
  const lx = e.data.lx ?? 0, ly = e.data.ly ?? 1;
  c.save();
  c.beginPath(); c.ellipse(x, y, r, r * open, 0, 0, TAU); c.fillStyle = '#fff8ea'; c.fill(); c.clip();
  const ix = x + lx * r * 0.32, iy = y + ly * r * 0.32;
  c.fillStyle = ex; c.beginPath(); c.arc(ix, iy, r * 0.7, 0, TAU); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.arc(ix, iy, r * 0.7, -2.6, -0.6); c.lineTo(ix, iy); c.fill();
  c.fillStyle = '#07020f'; c.beginPath(); c.ellipse(ix, iy, r * 0.15, r * 0.52, 0, 0, TAU); c.fill();
  c.fillStyle = '#ffffff'; c.beginPath(); c.arc(ix - r * 0.25, iy - r * 0.3, r * 0.16, 0, TAU); c.fill();
  c.restore();
}

// Dessin d'un alien sculpté ; renvoie false si le type n'a pas de design dédié
export function drawAlienSculpt(e, g) {
  const T = e.T, d = D[e.type];
  if (!d) return false;
  const k = (e.r / T.r) * e.scale;
  const A = art(e.type, T, e, e.elite, view.rs * k * 1.05);
  if (!A) return false;
  const t = e.t, r = T.r;
  // regard vers le joueur (pour les yeux vivants)
  if (g && g.player) { const dx = g.player.x - e.x, dy = g.player.y - e.y, l = Math.hypot(dx, dy) || 1; const a = -(e.face || 0), ca = Math.cos(a), sa = Math.sin(a); e.data.lx = (dx / l) * ca - (dy / l) * sa; e.data.ly = (dx / l) * sa + (dy / l) * ca; }
  const br = d.pulse ? 1 + 0.06 * Math.sin(t * 5 + e.seed) : 1 + 0.025 * Math.sin(t * 3 + e.seed);
  let sx = k * br, sy = k * (2 - br);
  if (d.flap) sx *= 0.82 + 0.18 * Math.abs(Math.sin(t * 5 + e.seed));
  const rot = (e.face || 0) + (d.spin ? t * d.spin : 0);
  setRTS(e.x, e.y, rot, sx, sy);
  const c = ctx;
  c.globalAlpha = e.alpha;
  if (d.tentacles) { // tentacules souples dessinés en direct sous la cloche
    c.strokeStyle = rgba(e.c2, 0.85); c.lineCap = 'round';
    for (let i = 0; i < d.tentacles; i++) { const x = (i - (d.tentacles - 1) / 2) * r * 0.38; c.lineWidth = r * 0.12; c.beginPath(); c.moveTo(x, r * 0.3); c.quadraticCurveTo(x + Math.sin(t * 3 + i) * r * 0.4, r * 0.9, x + Math.sin(t * 2.4 + i * 1.7) * r * 0.5, r * 1.5); c.stroke(); }
    c.lineCap = 'butt';
  }
  c.drawImage(A.cv, -A.ox, -A.oy, A.w, A.h);
  if (A.bloom) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = e.alpha * (0.6 + 0.35 * Math.sin(t * 4 + e.seed)); c.drawImage(A.bloom, -A.ox, -A.oy, A.w, A.h); c.globalCompositeOperation = 'source-over'; c.globalAlpha = e.alpha; }
  if (d.eyes) {
    const bl = (t + e.seed * 1.7) % 3.8, open = bl < 0.14 ? Math.max(0.08, Math.abs(bl - 0.07) / 0.07) : 1;
    for (const [x, y, rr, counter] of d.eyes) {
      if (counter) { c.save(); c.rotate(-rot); liveEye(c, x * r, y * r, rr * r, { data: { lx: (g ? Math.cos(Math.atan2(g.player.y - e.y, g.player.x - e.x)) : 0), ly: (g ? Math.sin(Math.atan2(g.player.y - e.y, g.player.x - e.x)) : 1) } }, open, e.elite ? '#ffd23f' : e.c2); c.restore(); }
      else liveEye(c, x * r, y * r, rr * r, e, open, e.elite ? '#ffd23f' : e.c2);
    }
  }
  if (d.live) d.live(c, e, t, r);
  if (e.flash > 0) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(0.85, e.flash * 8); c.drawImage(A.cv, -A.ox, -A.oy, A.w, A.h); c.globalCompositeOperation = 'source-over'; }
  c.globalAlpha = 1;
  return true;
}
