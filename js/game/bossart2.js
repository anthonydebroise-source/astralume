// Art des boss (suite) : Méduse, Fleur, Œil, Mante, Ver, Cœur
import { TAU, rgba, lighten, darken } from '../engine/math.js';
import { drawSculpt, drawBloom } from '../engine/sculpt.js';
import { heartPath } from './art.js';
import {
  BOSS_ART, mk, vgrad, circ, poly, mirror, turret, limb, bead, eyePod, coreOrb,
  tentChain, drawLimb, cyberEye, glowAt, drawWound,
} from './bossart.js';

const lit = (c, f) => { c.globalCompositeOperation = 'lighter'; f(); c.globalCompositeOperation = 'source-over'; };
const aimA = (b, p) => Math.atan2(b.g.player.y - (b.y + p.oy * b.sc), b.g.player.x - (b.x + p.ox * b.sc));

// ================= MÉDUSE =================
BOSS_ART.jelly = {
  build(C, P, px) {
    const A = {};
    const S = mk(C, 228, 186, px, 114, 116, { seed: 11 });
    const bell = (g) => { g.moveTo(-98, 30); g.bezierCurveTo(-104, -112, 104, -112, 98, 30); g.closePath(); };
    // jupe en festons (derrière la cloche)
    S.paint((g) => { g.moveTo(-100, 24); for (let i = 0; i <= 12; i++) { const x = -100 + (i / 12) * 200; g.quadraticCurveTo(x - 8, 62 + (i % 2) * 8, x, 40 + (i % 2 ? 10 : 0)); } g.lineTo(100, 24); g.closePath(); },
      { c: vgrad(24, 66, [[0, P.sec], [1, P.secD]]), mat: 'gloss', h: (s) => s.hLin(0, 24, 0, 66, 0.35, 0.1), a: 0.92, bump: 0.2 });
    // cloche translucide
    S.paint(bell, { c: vgrad(-86, 30, [[0, P.lacqL], [0.55, P.lacq], [1, P.lacqD]]), mat: 'glass', h: (s) => s.hDomeE(0, 24, 104, 108, 0.95, 0.15), bump: 0.08 });
    // organes lumineux à l'intérieur
    S.within(bell, () => {
      for (const [x, y, r] of [[0, -34, 22], [-30, -8, 13], [30, -8, 13], [0, 8, 10]]) {
        S.paint(circ(x, y, r), { c: lighten(C.cg, 0.2), mat: 'glass', h: 0.07, hm: 'add', a: 0.55 });
        S.light(circ(x, y, r * 0.7), rgba(C.cg, 0.6), r * 0.5);
      }
    });
    // nervures d'acier
    for (let i = -3; i <= 3; i++) S.stroke((g) => { g.moveTo(i * 10, -84); g.quadraticCurveTo(i * 26, -34, i * 28, 26); }, { c: P.armor, mat: 'steel', w: 2.4, h: 0.07 });
    // couronne blindée
    S.paint((g) => { g.moveTo(-100, 12); g.quadraticCurveTo(0, -4, 100, 12); g.lineTo(98, 32); g.quadraticCurveTo(0, 18, -98, 32); g.closePath(); }, { c: vgrad(0, 32, [[0, lighten(P.armor, 0.15)], [1, P.armorD]]), mat: 'steel', h: 0.16, hm: 'add' });
    S.stroke((g) => { g.moveTo(-100, 12); g.quadraticCurveTo(0, -4, 100, 12); }, { c: P.gold, mat: 'gold', w: 1.8, h: 0.04 });
    for (let i = 0; i < 9; i++) {
      const x = -80 + i * 20, y = 21 - 6 * (1 - (x / 100) ** 2);
      S.paint((g) => g.rect(x - 4, y - 2, 8, 4), { c: '#06050b', h: 0.2 });
      S.light((g) => g.rect(x - 3.2, y - 1.2, 6.4, 2.4), P.glow, 2.5);
    }
    // crête
    for (const [x, l] of [[-10, 14], [0, 20], [10, 14]]) S.paint(poly([x - 3.5, -76, x, -76 - l, x + 3.5, -76]), { c: P.chrome, mat: 'chrome', h: (s) => s.hDome(x, -80, 10, 0.95, 0.5) });
    // orbites des yeux-canons
    for (const s of [-1, 1]) { S.paint(circ(s * 26, -62, 16.5), { c: P.chrome, mat: 'chrome', h: (s2) => s2.hDome(s * 26, -62, 17, 0.98, 0.6) }); S.paint(circ(s * 26, -62, 12.5), { c: '#05040a', mat: 'glass', h: 0.55 }); }
    A.body = S.bake();
    // nageoire blindée (gauche ; miroir pour la droite)
    const F = mk(C, 90, 96, px, 50, 52, { seed: 12 });
    const fin = (g) => { g.moveTo(-30, 40); g.bezierCurveTo(-46, -10, -20, -48, 22, -40); g.quadraticCurveTo(6, 0, 18, 40); g.closePath(); };
    F.paint(fin, { c: vgrad(-44, 40, [[0, P.secL], [0.5, P.sec], [1, P.secD]]), mat: 'gloss', h: (s) => s.hDome(-8, -2, 50, 0.95, 0.2) });
    for (let k = 0; k < 3; k++) F.stroke((g) => { g.moveTo(-22 + k * 7, 34); g.quadraticCurveTo(-28 + k * 10, -8, 10 + k * 3, -34); }, { c: P.armor, mat: 'steel', w: 2, h: 0.08, emi: k === 1 ? rgba(C.cg, 0.7) : undefined, ew: 0.6 });
    F.stroke((g) => { g.moveTo(-30, 40); g.bezierCurveTo(-46, -10, -20, -48, 22, -40); }, { c: P.gold, mat: 'gold', w: 2.2, h: 0.06 });
    F.rivets([[-24, 26], [-28, 4], [-18, -22], [4, -34]], 1.1, P.chrome);
    A.fin = F.bake();
    A.bead = bead(C, P, px, 10, P.sec, P.secD, true);
    A.sock = eyePod(C, P, px, 12, P.lacq);
    return A;
  },
  draw(c, b, t) {
    const A = b.art, C = b.col;
    for (const p of b.parts) if (p.kind === 'arm') {
      tentChain(c, A.bead, 10, p.ox, p.oy - 8, Math.PI / 2 + p.ox / 200, p.alive ? 130 : 26, p.alive ? 10 : 8, t * 1.3, p.i * 1.7, 0.32, p.alive ? 11 : 3, p.alive ? C.cg : null);
      if (p.alive) { c.save(); c.translate(p.ox, p.oy); c.scale(1.1, 1.1); drawSculpt(c, A.sock); c.restore(); cyberEye(c, p.ox, p.oy, 8.5, ...b.lookFrom(p), C.cg, t); }
      else drawWound(c, b, p, t);
    }
    const pul = 1 + Math.sin(t * 2.4) * 0.025 + b.beat * 0.035;
    c.save(); c.scale(pul, pul); drawSculpt(c, A.body);
    lit(c, () => drawBloom(c, A.body, 0.6 + 0.35 * Math.sin(t * 3) + b.beat * 0.4));
    c.restore();
    for (const p of b.parts) if (p.kind === 'shell') {
      if (p.alive) { c.save(); c.translate(p.ox, p.oy); c.scale(p.ox < 0 ? 1 : -1, 1); drawSculpt(c, A.fin); lit(c, () => drawBloom(c, A.fin, 0.5 + 0.3 * Math.sin(t * 4 + p.ox))); c.restore(); }
      else drawWound(c, b, p, t);
    }
    for (const p of b.parts) if (p.kind === 'cannon') {
      if (p.alive) { const [lx, ly] = b.lookFrom(p); cyberEye(c, p.ox * pul, p.oy * pul, 11, lx, ly, C.cg, t); }
      else drawWound(c, b, p, t);
    }
  },
};

// ================= FLEUR =================
BOSS_ART.flower = {
  build(C, P, px) {
    const A = {};
    // pétale blindé (pointe vers +x, base à l'origine)
    const S = mk(C, 104, 60, px, 4, 30, { seed: 21 });
    const pet = (g) => { g.moveTo(4, 0); g.bezierCurveTo(24, -30, 76, -30, 98, 0); g.bezierCurveTo(76, 30, 24, 30, 4, 0); g.closePath(); };
    S.paint(pet, { c: (g) => { const gr = g.createLinearGradient(4, 0, 98, 0); gr.addColorStop(0, P.lacqD); gr.addColorStop(0.55, P.lacq); gr.addColorStop(1, P.lacqL); return gr; }, mat: 'gloss', h: (s) => s.hDomeE(54, 0, 52, 28, 0.85, 0.15), bump: 0.12 });
    S.paint((g) => { g.moveTo(10, 0); g.bezierCurveTo(30, -9, 70, -9, 92, 0); g.bezierCurveTo(70, 9, 30, 9, 10, 0); g.closePath(); }, { c: P.armor, mat: 'steel', h: 0.07, hm: 'add' });
    S.stroke((g) => { g.moveTo(10, 0); g.lineTo(94, 0); }, { c: P.gold, mat: 'gold', w: 1.8, h: 0.05, emi: rgba(C.cg, 0.5), ew: 0.5 });
    for (let k = 1; k < 5; k++) for (const s of [-1, 1]) S.stroke((g) => { g.moveTo(14 + k * 16, s * 3); g.quadraticCurveTo(22 + k * 16, s * 12, 26 + k * 16, s * (20 - k * 2.5)); }, { h: -0.06, w: 1, c: 'rgba(0,0,0,0.35)' });
    S.stroke((g) => { g.moveTo(4, 0); g.bezierCurveTo(24, -30, 76, -30, 98, 0); g.bezierCurveTo(76, 30, 24, 30, 4, 0); }, { c: P.chrome, mat: 'chrome', w: 1.3, h: 0.05 });
    S.light(circ(90, 0, 3), P.glowL, 3);
    A.petal = S.bake();
    // disque central : graines en spirale
    const D = mk(C, 100, 100, px, 50, 50, { seed: 22 });
    D.paint(circ(0, 0, 46), { c: P.gold, mat: 'gold', h: (s) => s.hDome(0, 0, 47, 0.7, 0.35) });
    D.paint(circ(0, 0, 40), { c: P.secD, mat: 'gloss', h: (s) => s.hDome(0, 0, 41, 0.75, 0.4) });
    for (let i = 8; i < 150; i++) {
      const a = i * 2.39996, r = 3.25 * Math.sqrt(i);
      if (r > 37 || r < 9) continue;
      const x = Math.cos(a) * r, y = Math.sin(a) * r, sr = 1.4 + r * 0.04;
      D.paint(circ(x, y, sr), { c: i % 5 ? P.sec : P.glowL, mat: 'gloss', h: (s) => s.hRad(x, y, sr, 0.14, 0.02), hm: 'add' });
      if (i % 5 === 0) D.light(circ(x, y, sr * 0.6), P.glow, 1.5, 0.8);
    }
    for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU; D.rivets([[Math.cos(a) * 43, Math.sin(a) * 43]], 1.1, P.chrome); }
    A.disk = D.bake();
    // lames du diaphragme (noyau)
    const B = mk(C, 40, 40, px, 4, 20, { seed: 23, outline: 0.6 });
    B.paint((g) => { g.moveTo(0, -4); g.quadraticCurveTo(18, -14, 30, -2); g.lineTo(26, 6); g.quadraticCurveTo(14, 0, 0, 6); g.closePath(); }, { c: vgrad(-12, 6, [[0, lighten(P.armor, 0.2)], [1, P.armorD]]), mat: 'steel', h: (s) => s.hLin(0, -12, 0, 6, 0.7, 0.3) });
    B.stroke((g) => { g.moveTo(1, -3); g.quadraticCurveTo(18, -13, 29, -2); }, { c: P.gold, mat: 'gold', w: 1, h: 0.04 });
    A.blade = B.bake();
    // tête d'étamine
    const T = mk(C, 30, 30, px, 15, 15, { seed: 24 });
    T.paint(circ(0, 0, 11), { c: P.armor, mat: 'steel', h: (s) => s.hDome(0, 0, 11, 0.8, 0.3) });
    T.paint(circ(0, 0, 8), { c: (g) => { const gr = g.createRadialGradient(-2, -2, 0, 0, 0, 8); gr.addColorStop(0, '#fffbe6'); gr.addColorStop(0.5, P.glowL); gr.addColorStop(1, C.cg); return gr; }, mat: 'glass', h: (s) => s.hDome(0, 0, 8, 1, 0.5) });
    T.light(circ(0, 0, 4), rgba('#ffffff', 0.5), 2);
    for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU; T.paint(poly([Math.cos(a - 0.25) * 10, Math.sin(a - 0.25) * 10, Math.cos(a) * 14, Math.sin(a) * 14, Math.cos(a + 0.25) * 10, Math.sin(a + 0.25) * 10]), { c: P.gold, mat: 'gold', h: 0.4 }); }
    A.stamen = T.bake();
    A.stalk = limb(C, P, px, 34, 6, { bands: 1, glow: true });
    A.vine = bead(C, P, px, 9, P.sec, P.secD, false);
    const Bu = mk(C, 40, 40, px, 20, 20, { seed: 25 });
    Bu.paint(circ(0, 0, 15), { c: vgrad(-15, 15, [[0, P.lacqL], [1, P.lacqD]]), mat: 'gloss', h: (s) => s.hDome(0, 0, 15, 0.9, 0.2), bump: 0.2 });
    for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU - Math.PI / 2; Bu.stroke((g) => { g.moveTo(Math.cos(a) * 4, Math.sin(a) * 4); g.lineTo(Math.cos(a) * 14, Math.sin(a) * 14); }, { c: P.gold, mat: 'gold', w: 1.6, h: 0.06 }); }
    Bu.paint(circ(0, 0, 5), { c: '#06050a', h: 0.5 }); Bu.light(circ(0, 0, 3.5), P.glow, 2);
    A.bulb = Bu.bake();
    return A;
  },
  draw(c, b, t) {
    const A = b.art, C = b.col;
    for (const p of b.parts) if (p.kind === 'arm') {
      const s = p.ox < 0 ? -1 : 1;
      // tige épineuse : vertèbres le long d'une courbe de Bézier
      const x0 = s * 30, y0 = 30, x1 = s * 70, y1 = 20, x2 = s * 40, y2 = 90, x3 = p.ox, y3 = p.oy;
      const n = p.alive ? 9 : 3;
      for (let i = n; i >= 0; i--) {
        const u = i / 9, v = 1 - u;
        const x = v * v * v * x0 + 3 * v * v * u * x1 + 3 * v * u * u * x2 + u * u * u * x3, y = v * v * v * y0 + 3 * v * v * u * y1 + 3 * v * u * u * y2 + u * u * u * y3;
        const dx = 3 * v * v * (x1 - x0) + 6 * v * u * (x2 - x1) + 3 * u * u * (x3 - x2), dy = 3 * v * v * (y1 - y0) + 6 * v * u * (y2 - y1) + 3 * u * u * (y3 - y2);
        c.save(); c.translate(x, y); c.rotate(Math.atan2(dy, dx)); c.scale(0.95 - u * 0.25, 0.95 - u * 0.25); drawSculpt(c, A.vine); c.restore();
      }
      if (p.alive) { c.save(); c.translate(p.ox, p.oy); c.rotate(t * 0.8 * s); drawSculpt(c, A.bulb); c.restore(); lit(c, () => glowAt(c, C.cg, p.ox, p.oy, 14, 0.5 + 0.3 * Math.sin(t * 5))); }
      else drawWound(c, b, p, t);
    }
    for (const p of b.parts) if (p.kind === 'shell') {
      const a = Math.atan2(p.oy, p.ox);
      if (p.alive) { c.save(); c.rotate(a); drawSculpt(c, A.petal); c.restore(); }
      else drawWound(c, b, p, t);
    }
    drawSculpt(c, A.disk);
    lit(c, () => drawBloom(c, A.disk, 0.5 + 0.4 * Math.sin(t * 2.5) + b.beat * 0.4));
    for (const p of b.parts) if (p.kind === 'cannon') {
      if (p.alive) {
        drawLimb(c, A.stalk, 0, 0, p.ox, p.oy, 34);
        c.save(); c.translate(p.ox, p.oy); c.rotate(t * 2); drawSculpt(c, A.stamen); c.restore();
        lit(c, () => glowAt(c, C.cg, p.ox, p.oy, 13, 0.6 + 0.3 * Math.sin(t * 6 + p.i)));
      } else drawWound(c, b, p, t);
    }
  },
  drawCore(c, b, p, t) {
    const A = b.art;
    b.irisO = (b.irisO || 0) + ((b.coreOpen ? 1 : 0) - (b.irisO || 0)) * 0.06;
    const open = b.irisO;
    if (open > 0.05) {
      c.save(); c.scale(0.75, 0.75); drawSculpt(c, A.core.s); c.restore();
      lit(c, () => glowAt(c, b.col.cg, 0, 0, 34 * open, 0.6 + b.beat * 0.3));
    }
    for (let i = 0; i < 8; i++) {
      c.save(); c.rotate((i / 8) * TAU + t * 0.25); c.translate(27, 0); c.rotate(Math.PI - 0.38 - open * 1.05); drawSculpt(c, A.blade); c.restore();
    }
  },
};

// ================= ŒIL =================
BOSS_ART.eye = {
  build(C, P, px) {
    const A = {};
    const S = mk(C, 212, 176, px, 106, 88, { seed: 31 });
    // supports latéraux
    for (const s of [-1, 1]) {
      S.paint(poly([s * 66, -22, s * 100, -12, s * 104, 12, s * 66, 22]), { c: vgrad(-22, 22, [[0, P.secL], [1, P.secD]]), mat: 'gloss', h: 0.35 });
      S.paint(circ(s * 98, 0, 11), { c: P.chrome, mat: 'chrome', h: (s2) => s2.hDome(s * 98, 0, 11, 0.8, 0.4) });
      S.rivets([[s * 76, -12], [s * 76, 12]], 1.1, P.chrome);
    }
    // anneau blindé
    S.paint(circ(0, 0, 84), { c: vgrad(-84, 84, [[0, lighten(P.armor, 0.15)], [1, P.armorD]]), mat: 'steel', h: (s) => s.hDome(0, 0, 86, 0.6, 0.25) });
    for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU; S.grooves([[Math.cos(a) * 75, Math.sin(a) * 75, Math.cos(a) * 84, Math.sin(a) * 84]], 0.9, 0.07); }
    for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU + 0.26; S.paint(circ(Math.cos(a) * 79.5, Math.sin(a) * 79.5, 2.6), { c: '#06050b', h: 0.4 }); S.light(circ(Math.cos(a) * 79.5, Math.sin(a) * 79.5, 1.8), P.glow, 2.5); }
    S.stroke(circ(0, 0, 76), { c: P.gold, mat: 'gold', w: 2.4, h: 0.06 });
    // globe oculaire
    S.paint(circ(0, 0, 74), { c: (g) => { const gr = g.createRadialGradient(-20, -25, 5, 0, 0, 76); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.6, '#ece4f2'); gr.addColorStop(1, mixDk(C)); return gr; }, mat: 'gloss', h: (s) => s.hDome(0, 0, 76, 1, 0.45), bump: 0.05 });
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * TAU + 0.2;
      S.stroke((g) => { g.moveTo(Math.cos(a) * 72, Math.sin(a) * 72); g.quadraticCurveTo(Math.cos(a + 0.2) * 58, Math.sin(a + 0.2) * 58, Math.cos(a - 0.1) * 44, Math.sin(a - 0.1) * 44); g.moveTo(Math.cos(a + 0.12) * 62, Math.sin(a + 0.12) * 62); g.lineTo(Math.cos(a + 0.3) * 52, Math.sin(a + 0.3) * 52); }, { c: rgba('#c41838', 0.65), w: 1.3, h: 0.025 });
    }
    A.body = S.bake();
    // iris
    const I = mk(C, 76, 76, px, 38, 38, { seed: 32, outline: 0 });
    I.paint(circ(0, 0, 35), { c: (g) => { const gr = g.createRadialGradient(0, 0, 6, 0, 0, 35); gr.addColorStop(0, lighten(C.cg, 0.6)); gr.addColorStop(0.45, C.cg); gr.addColorStop(0.9, darken(C.cg, 0.45)); gr.addColorStop(1, '#100818'); return gr; }, mat: 'glass', h: (s) => s.hDome(0, 0, 36, 0.55, 0.35) });
    for (let i = 0; i < 36; i++) { const a = (i / 36) * TAU; I.stroke((g) => { g.moveTo(Math.cos(a) * 12, Math.sin(a) * 12); g.lineTo(Math.cos(a + 0.08) * 33, Math.sin(a + 0.08) * 33); }, { c: rgba(i % 2 ? '#ffffff' : '#000000', 0.18), w: 0.9, h: i % 2 ? 0.03 : -0.03 }); }
    I.light(circ(0, 0, 20), rgba(C.cg, 0.35), 6);
    A.iris = I.bake();
    // paupières blindées (haut / bas)
    for (const top of [true, false]) {
      const k = top ? -1 : 1;
      const L = mk(C, 168, 104, px, 84, top ? 96 : 8, { seed: top ? 33 : 34 });
      const lid = (g) => { g.moveTo(-78, 0); g.bezierCurveTo(-72, 98 * k, 72, 98 * k, 78, 0); g.bezierCurveTo(40, 10 * k, -40, 10 * k, -78, 0); g.closePath(); };
      L.paint(lid, { c: vgrad(top ? -80 : 80, 0, [[0, P.lacqD], [0.6, P.lacq], [1, P.lacqL]]), mat: 'gloss', h: (s) => s.hDomeE(0, 0, 90, 80, 0.95, 0.35), bump: 0.06 });
      for (let j = 1; j < 4; j++) L.stroke((g) => { g.moveTo(-76 + j * 5, j * 15 * k); g.bezierCurveTo(-50, (24 + j * 22) * k, 50, (24 + j * 22) * k, 76 - j * 5, j * 15 * k); }, { h: -0.06, w: 1.3, c: 'rgba(0,0,0,0.4)', emi: j === 2 ? rgba(C.cg, 0.6) : undefined, ew: 0.6 });
      L.stroke((g) => { g.moveTo(-78, 0); g.bezierCurveTo(-40, 10 * k, 40, 10 * k, 78, 0); }, { c: P.gold, mat: 'gold', w: 3, h: 0.08 });
      for (let i = -3; i <= 3; i++) { const x = i * 18, y = 7.5 * k * (1 - (i / 4.3) ** 2); L.paint(poly([x - 3, y, x + i * 0.8, y - 9 * k, x + 3, y]), { c: P.chrome, mat: 'chrome', h: 0.5 }); }
      L.rivets([[-50, 40 * k], [0, 56 * k], [50, 40 * k]], 1.3, P.chrome);
      A[top ? 'lidT' : 'lidB'] = L.bake();
    }
    A.pod = eyePod(C, P, px, 13, P.lacq);
    A.bead = bead(C, P, px, 9, P.sec, P.secD, true);
    return A;
  },
  draw(c, b, t) {
    const A = b.art, C = b.col;
    for (const p of b.parts) if (p.kind === 'arm') {
      const s = p.ox < 0 ? -1 : 1;
      tentChain(c, A.bead, 9, s * 92, 0, s > 0 ? 0 : Math.PI, Math.max(10, Math.abs(p.ox) - 92) + 4, 9, t, p.i * 2, 0.25, 2, null);
      if (p.alive) tentChain(c, A.bead, 9, p.ox, p.oy, s > 0 ? 0.3 : Math.PI - 0.3, 66, 8, t * 1.4, p.i, 0.5, 8, C.cg);
      if (p.alive) { c.save(); c.translate(p.ox, p.oy); drawSculpt(c, A.pod); c.restore(); cyberEye(c, p.ox, p.oy, 8, ...b.lookFrom(p), C.cg, t); }
      else drawWound(c, b, p, t);
    }
    for (const p of b.parts) if (p.kind === 'cannon') {
      c.strokeStyle = 'rgba(10,8,18,0.9)'; c.lineWidth = 4; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(p.ox * 0.5, p.oy * 0.5 - 30, p.ox, p.oy); c.stroke();
      lit(c, () => { c.strokeStyle = rgba(C.cg, 0.55); c.lineWidth = 1.2; c.stroke(); });
    }
    drawSculpt(c, A.body);
    lit(c, () => drawBloom(c, A.body, 0.55 + 0.3 * Math.sin(t * 3) + b.beat * 0.3));
    for (const p of b.parts) if (p.kind === 'cannon') {
      if (p.alive) { c.save(); c.translate(p.ox, p.oy); drawSculpt(c, A.pod); c.restore(); cyberEye(c, p.ox, p.oy, 8.5, ...b.lookFrom(p), C.cg, t); }
      else drawWound(c, b, p, t);
    }
  },
  drawCore(c, b, p, t) {
    const A = b.art, [lx, ly] = b.lookFrom(p), ix = lx * 22, iy = ly * 22;
    drawSculpt(c, A.iris, ix, iy);
    const pw = 9 + (b.coreOpen ? 4 * Math.sin(t * 6) : 0);
    c.fillStyle = '#05020c'; c.beginPath(); c.ellipse(ix, iy, pw, 16, 0, 0, TAU); c.fill();
    lit(c, () => { c.strokeStyle = rgba(b.col.cg, 0.8); c.lineWidth = 1.5; c.beginPath(); c.ellipse(ix, iy, pw + 1.5, 17.5, 0, 0, TAU); c.stroke(); });
    c.fillStyle = 'rgba(255,255,255,0.9)'; c.beginPath(); c.ellipse(ix - 12, iy - 13, 6, 4, -0.6, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.5)'; c.beginPath(); c.arc(ix + 9, iy + 10, 2.2, 0, TAU); c.fill();
  },
  drawShell(c, b, p, t) {
    const A = b.art, k = 1 + 0.05 * Math.sin(t * 2);
    c.save(); c.scale(1, k); drawSculpt(c, p.top ? A.lidT : A.lidB); lit(c, () => drawBloom(c, p.top ? A.lidT : A.lidB, 0.6)); c.restore();
  },
};
function mixDk(C) { return darken(C.c1, 0.35); }

// ================= MANTE =================
BOSS_ART.mantis = {
  build(C, P, px) {
    const A = {};
    const S = mk(C, 80, 156, px, 40, 96, { seed: 41 });
    // abdomen + thorax segmentés
    S.paint((g) => g.ellipse(0, 22, 18, 30, 0, 0, TAU), { c: vgrad(-8, 52, [[0, P.lacqL], [1, P.lacqD]]), mat: 'gloss', h: (s) => s.hDomeE(0, 22, 20, 32, 0.9, 0.2), bump: 0.1 });
    for (let k = 0; k < 4; k++) S.stroke((g) => g.ellipse(0, 22, 17, 6 + k * 7, 0, 0.15, Math.PI - 0.15), { h: -0.06, w: 1.2, c: 'rgba(0,0,0,0.35)' });
    for (let i = 3; i >= 0; i--) {
      const y = -70 + i * 22, rx = 20 - i * 1.5;
      S.paint((g) => g.ellipse(0, y, rx, 16, 0, 0, TAU), { c: vgrad(y - 16, y + 16, [[0, P.lacqL], [0.5, P.lacq], [1, P.lacqD]]), mat: 'gloss', h: (s) => s.hDomeE(0, y, rx + 1, 17, 0.95, 0.3) });
      S.paint((g) => g.ellipse(0, y - 2, rx * 0.45, 12, 0, 0, TAU), { c: P.armor, mat: 'steel', h: 0.07, hm: 'add' });
      S.stroke((g) => g.ellipse(0, y, rx, 16, 0, 0.2, Math.PI - 0.2), { c: P.gold, mat: 'gold', w: 1.4, h: 0.04 });
      for (const s of [-1, 1]) { S.paint(circ(s * rx * 0.72, y + 4, 2.2), { c: '#06050b', h: 0.3 }); S.light(circ(s * rx * 0.72, y + 4, 1.5), P.glow, 2.5); }
    }
    S.stroke((g) => { g.moveTo(0, -84); g.lineTo(0, 0); }, { c: P.chrome, mat: 'chrome', w: 1.4, h: 0.05 });
    for (const s of [-1, 1]) { S.paint(circ(s * 22, -72, 14), { c: P.armor, mat: 'steel', h: (s2) => s2.hDome(s * 22, -72, 14, 0.9, 0.5) }); S.paint(circ(s * 22, -72, 10), { c: '#0a0910', h: 0.5 }); }
    A.body = S.bake();
    // ailes (membrane translucide)
    for (const s of [1, -1]) {
      const W = mk(C, 104, 100, px, s > 0 ? 6 : 98, 78, { seed: 42, outline: 0.6 });
      const wing = (g) => { g.moveTo(0, 0); g.quadraticCurveTo(s * 40, -70, s * 92, -42); g.quadraticCurveTo(s * 70, 10, 0, 20); g.closePath(); };
      W.paint(wing, { c: (g) => { const gr = g.createLinearGradient(0, 0, s * 92, -42); gr.addColorStop(0, rgba(P.sec, 0.85)); gr.addColorStop(1, rgba(lighten(P.secL, 0.3), 0.55)); return gr; }, mat: 'glass', h: 0.25 });
      for (let k = 1; k < 5; k++) W.stroke((g) => { g.moveTo(0, 8); g.quadraticCurveTo(s * (14 + k * 10), -10 - k * 6, s * (24 + k * 16), -28 - k * 4); }, { c: P.armorD, mat: 'steel', w: 1.4, h: 0.12, emi: k === 2 ? rgba(C.cg, 0.6) : undefined, ew: 0.5 });
      W.stroke((g) => { g.moveTo(0, 0); g.quadraticCurveTo(s * 40, -70, s * 92, -42); }, { c: P.chrome, mat: 'chrome', w: 3, h: 0.2 });
      for (const [x, y] of [[50, -34], [68, -30]]) W.light(circ(s * x, y, 2.4), P.glowL, 3);
      A[s > 0 ? 'wingR' : 'wingL'] = W.bake();
    }
    // lames de faux
    for (const s of [1, -1]) {
      const B = mk(C, 56, 80, px, s > 0 ? 6 : 50, 6, { seed: 43 });
      const blade = (g) => { g.moveTo(0, 0); g.quadraticCurveTo(s * 42, 18, s * 18, 72); g.quadraticCurveTo(s * 24, 30, 0, 9); g.closePath(); };
      B.paint(blade, { c: vgrad(0, 72, [[0, P.lacq], [1, P.lacqD]]), mat: 'gloss', h: (s2) => s2.hDome(s * 16, 26, 36, 0.9, 0.25) });
      B.stroke((g) => { g.moveTo(s * 1, 8); g.quadraticCurveTo(s * 24, 30, s * 18, 70); }, { c: P.chrome, mat: 'chrome', w: 3.2, h: 0.18, emi: rgba('#ffffff', 0.4), ew: 0.6 });
      for (let k = 0; k < 4; k++) { const y = 20 + k * 12, x = s * (20 + Math.sin(k) * 2); B.paint(poly([x, y, x - s * 6, y + 3, x, y + 5]), { c: P.chrome, mat: 'chrome', h: 0.4 }); }
      B.paint(circ(0, 3, 6), { c: P.gold, mat: 'gold', h: (s2) => s2.hDome(0, 3, 6, 0.8, 0.4) });
      A[s > 0 ? 'bladeR' : 'bladeL'] = B.bake();
    }
    A.arm = limb(C, P, px, 48, 9, { bands: 2 });
    A.turret = turret(C, P, px, 12, 1);
    // tête (noyau)
    const H = mk(C, 64, 52, px, 32, 16, { seed: 44 });
    H.paint((g) => { g.moveTo(-28, -10); g.quadraticCurveTo(0, -18, 28, -10); g.quadraticCurveTo(22, 14, 0, 32); g.quadraticCurveTo(-22, 14, -28, -10); g.closePath(); }, { c: vgrad(-14, 32, [[0, P.lacqL], [1, P.lacqD]]), mat: 'gloss', h: (s) => s.hDomeE(0, 2, 30, 30, 0.9, 0.2) });
    H.stroke((g) => { g.moveTo(0, -14); g.lineTo(0, 26); }, { c: P.gold, mat: 'gold', w: 1.4, h: 0.05 });
    for (const s of [-1, 1]) {
      H.paint((g) => g.ellipse(s * 13, -1, 10, 6.5, s * 0.5, 0, TAU), { c: (g) => { const gr = g.createRadialGradient(s * 11, -3, 0, s * 13, -1, 10); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.35, P.glowL); gr.addColorStop(1, darken(C.cg, 0.4)); return gr; }, mat: 'glass', h: (s2) => s2.hDomeE(s * 13, -1, 10, 7, 0.95, 0.5) });
      for (let k = 0; k < 4; k++) H.stroke((g) => { g.moveTo(s * (6 + k * 4), -6); g.lineTo(s * (8 + k * 4), 5); }, { c: 'rgba(0,0,0,0.25)', w: 0.5, h: -0.02 });
      H.light((g) => g.ellipse(s * 13, -1, 7, 4, s * 0.5, 0, TAU), rgba(C.cg, 0.45), 3);
      H.paint(poly([s * 6, 22, s * 14, 26, s * 4, 36]), { c: P.chrome, mat: 'chrome', h: 0.45 });
    }
    A.head = H.bake();
    return A;
  },
  draw(c, b, t) {
    const A = b.art, C = b.col;
    for (const p of b.parts) if (p.kind === 'shell') {
      if (p.alive) {
        const s = p.ox < 0 ? -1 : 1, f = Math.sin(t * 9) * 0.06;
        c.save(); c.translate(s * 20, -20); c.rotate(s * (-0.5 + f)); drawSculpt(c, s > 0 ? A.wingR : A.wingL); lit(c, () => drawBloom(c, s > 0 ? A.wingR : A.wingL, 0.6)); c.restore();
      } else drawWound(c, b, p, t);
    }
    for (const p of b.parts) if (p.kind === 'arm') { const s = p.ox < 0 ? -1 : 1; drawLimb(c, A.arm, s * 14, 10, p.ox, p.oy - 20, 48); }
    drawSculpt(c, A.body);
    lit(c, () => drawBloom(c, A.body, 0.5 + 0.35 * Math.sin(t * 4) + b.beat * 0.3));
    for (const p of b.parts) if (p.kind === 'cannon') {
      if (p.alive) { c.save(); c.translate(p.ox, p.oy); c.rotate(aimA(b, p) - Math.PI / 2); drawSculpt(c, A.turret); c.restore(); }
      else drawWound(c, b, p, t);
    }
    for (const p of b.parts) if (p.kind === 'arm') {
      const s = p.ox < 0 ? -1 : 1;
      if (p.alive) { c.save(); c.translate(p.ox, p.oy - 20); c.rotate(s * (0.4 + Math.sin(t * 2.5 + p.i) * 0.35) - s * 0.3); drawSculpt(c, s > 0 ? A.bladeR : A.bladeL); c.restore(); }
      else drawWound(c, b, p, t);
    }
  },
  drawCore(c, b, p, t) {
    const A = b.art;
    drawSculpt(c, A.head);
    lit(c, () => { drawBloom(c, A.head, 0.7 + 0.3 * Math.sin(t * 5)); for (const s of [-1, 1]) glowAt(c, b.col.cg, s * 13, -1, 12, 0.35 + b.beat * 0.3); });
  },
};

// ================= VER =================
BOSS_ART.worm = {
  build(C, P, px) {
    const A = {};
    const S = mk(C, 64, 52, px, 32, 26, { seed: 51 });
    for (const s of [-1, 1]) S.paint(poly([s * 12, -10, s * 30, -6, s * 26, 2, s * 13, 2]), { c: P.gold, mat: 'gold', h: (s2) => s2.hLin(s * 12, 0, s * 30, 0, 0.5, 0.2) });
    S.paint(circ(0, 0, 18), { c: vgrad(-18, 18, [[0, P.lacqL], [0.5, P.lacq], [1, P.lacqD]]), mat: 'gloss', h: (s) => s.hDome(0, 0, 18.5, 0.95, 0.25), bump: 0.1 });
    S.stroke(circ(0, 0, 13.5), { c: P.armor, mat: 'steel', w: 3.4, h: 0.08 });
    S.stroke(circ(0, 0, 15.5), { h: -0.05, w: 0.8, c: 'rgba(0,0,0,0.4)' });
    S.paint(circ(0, 0, 8), { c: '#07060c', mat: 'glass', h: 0.55 });
    S.light(circ(0, 0, 6), P.glow, 3);
    S.rivets([[0, -13.5], [0, 13.5], [-13.5, 0], [13.5, 0]], 1, P.chrome);
    A.seg = S.bake();
    const T = mk(C, 30, 46, px, 15, 8, { seed: 52 });
    T.paint(poly([-12, -6, 0, 36, 12, -6]), { c: vgrad(-6, 36, [[0, P.secL], [1, P.secD]]), mat: 'gloss', h: (s) => s.hCyl(-12, 0, 12, 0, 0.8, 0.2) });
    T.paint(poly([-4, 22, 0, 37, 4, 22]), { c: P.chrome, mat: 'chrome', h: 0.6 });
    T.grooves([[-9, 4, 9, 4], [-6, 14, 6, 14]], 0.9, 0.08);
    T.light(circ(0, 2, 2.5), P.glow, 2);
    A.tail = T.bake();
    // tête casquée
    const H = mk(C, 72, 80, px, 36, 34, { seed: 53 });
    H.paint((g) => g.ellipse(0, 4, 28, 30, 0, 0, TAU), { c: vgrad(-26, 34, [[0, P.lacqL], [0.5, P.lacq], [1, P.lacqD]]), mat: 'gloss', h: (s) => s.hDomeE(0, 2, 29, 31, 0.95, 0.25), bump: 0.08 });
    H.paint(poly(mirror([0, -30, 10, -24, 14, -6, 6, 0])), { c: P.armor, mat: 'steel', h: 0.1, hm: 'add' });
    H.stroke((g) => { g.moveTo(0, -30); g.lineTo(0, 0); }, { c: P.gold, mat: 'gold', w: 1.6, h: 0.04 });
    for (const s of [-1, 1]) {
      H.paint(poly([s * 20, -18, s * 34, -30, s * 26, -12]), { c: P.chrome, mat: 'chrome', h: 0.5 });
      H.paint(circ(s * 12, 10, 10), { c: P.chrome, mat: 'chrome', h: (s2) => s2.hDome(s * 12, 10, 10, 0.9, 0.5) });
      H.paint(circ(s * 12, 10, 7.5), { c: '#05040a', mat: 'glass', h: 0.5 });
    }
    H.grooves([[-24, -6, -10, 0], [24, -6, 10, 0], [-18, 24, 18, 24]], 0.9, 0.07);
    A.head = H.bake();
    const M = mk(C, 30, 40, px, 6, 6, { seed: 54 });
    M.paint((g) => { g.moveTo(0, 0); g.quadraticCurveTo(-14, 16, 2, 30); g.lineTo(5, 26); g.quadraticCurveTo(-4, 16, 6, 4); g.closePath(); }, { c: P.chrome, mat: 'chrome', h: 0.5 });
    M.paint(circ(1, 1, 4), { c: P.gold, mat: 'gold', h: (s) => s.hDome(1, 1, 4, 0.8, 0.4) });
    A.mand = M.bake();
    return A;
  },
  draw(c, b, t) {
    const A = b.art, C = b.col;
    const segs = b.parts.filter((p) => p.kind !== 'core' && (p.alive || p.tail));
    c.strokeStyle = 'rgba(12,10,20,0.95)'; c.lineWidth = 12; c.lineCap = 'round';
    c.beginPath(); c.moveTo(0, 0); for (const p of segs) c.lineTo(p.ox, p.oy); c.stroke();
    lit(c, () => { c.strokeStyle = rgba(C.cg, 0.35); c.lineWidth = 3; c.stroke(); });
    for (let k = segs.length - 1; k >= 0; k--) {
      const p = segs[k], prev = k > 0 ? segs[k - 1] : { ox: 0, oy: 0 };
      const a = Math.atan2(p.oy - prev.oy, p.ox - prev.ox) - Math.PI / 2;
      if (p.tail) {
        if (p.alive) { c.save(); c.translate(p.ox, p.oy); c.rotate(a); drawSculpt(c, A.tail); c.restore(); }
        else drawWound(c, b, p, t);
        continue;
      }
      c.save(); c.translate(p.ox, p.oy); c.rotate(a); drawSculpt(c, A.seg); c.restore();
      lit(c, () => glowAt(c, C.cg, p.ox, p.oy, 12, 0.45 + 0.35 * Math.sin(t * 5 + p.i)));
    }
  },
  drawCore(c, b, p, t) {
    const A = b.art, m = Math.sin(t * 7) * 0.25;
    for (const s of [-1, 1]) { c.save(); c.translate(s * 14, 20); c.scale(s, 1); c.rotate(-0.2 + m * s * s); drawSculpt(c, A.mand); c.restore(); }
    drawSculpt(c, A.head);
    for (const s of [-1, 1]) { const [lx, ly] = b.lookFrom(p); cyberEye(c, s * 12, 10, 7, lx, ly, '#ffd23f', t); }
  },
};

// ================= CŒUR =================
BOSS_ART.heart = {
  build(C, P, px) {
    const A = {};
    const S = mk(C, 220, 220, px, 110, 116, { seed: 61 });
    // artères chromées
    for (const s of [-1, 1]) for (const [x0, x1, w] of [[16, 34, 9], [40, 70, 7]]) {
      S.stroke((g) => { g.moveTo(s * x0, -40); g.quadraticCurveTo(s * x0, -86, s * x1, -100); }, { c: P.chrome, mat: 'chrome', w, h: 0.4 });
      S.stroke((g) => { g.moveTo(s * x0, -40); g.quadraticCurveTo(s * x0, -86, s * x1, -100); }, { h: 0.12, w: w * 0.4 });
      S.paint(circ(s * x1, -100, w * 0.75), { c: P.gold, mat: 'gold', h: 0.55 });
      S.paint(circ(s * x1, -100, w * 0.4), { c: '#06050a', h: 0.4 }); S.light(circ(s * x1, -100, w * 0.32), P.glow, 2);
    }
    const hp = (g) => { g.save(); g.translate(0, 8); g.moveTo(0, 92 * 0.35); g.bezierCurveTo(-92 * 1.1, -92 * 0.35, -92 * 0.5, -92 * 1.05, 0, -92 * 0.45); g.bezierCurveTo(92 * 0.5, -92 * 1.05, 92 * 1.1, -92 * 0.35, 0, 92 * 0.35); g.closePath(); g.restore(); };
    S.paint(hp, { c: vgrad(-90, 40, [[0, P.lacqL], [0.5, P.lacq], [1, P.lacqD]]), mat: 'flesh', h: (s) => s.hDomeE(0, -18, 96, 76, 0.95, 0.2), bump: 0.55 });
    S.within(hp, () => {
      for (let i = 0; i < 7; i++) S.stroke((g) => { g.moveTo(0, 10); g.bezierCurveTo(Math.cos(i) * 40, -40 + i * 8, Math.cos(i * 2) * 60, -10 + i * 10, Math.cos(i * 1.7) * 76, -50 + i * 14); }, { c: P.sec, mat: 'gloss', w: 3.2, h: 0.08, emi: i % 2 ? rgba(C.cg, 0.45) : undefined, ew: 1.2 });
      for (const y of [-34, 6]) {
        S.paint((g) => g.rect(-100, y - 6, 200, 12), { c: vgrad(y - 6, y + 6, [[0, lighten(P.armor, 0.2)], [1, P.armorD]]), mat: 'steel', h: 0.12, hm: 'add' });
        S.stroke((g) => { g.moveTo(-100, y - 6); g.lineTo(100, y - 6); }, { c: P.gold, mat: 'gold', w: 1.2 });
        S.rivets([-60, -30, 30, 60].map((x) => [x, y]), 1.2, P.chrome);
      }
      for (const [x, y] of [[-26, -52], [26, -52], [0, 24]]) { S.paint(circ(x, y, 7), { c: P.gold, mat: 'gold', h: 0.12, hm: 'add' }); S.paint(circ(x, y, 4.5), { c: '#06050a', h: 0.3 }); S.light(circ(x, y, 3.8), P.glowL, 3); }
    });
    for (const [x, y] of [[-48, -62], [48, -62], [-44, 66], [44, 66]]) { S.paint(circ(x, y, 17.5), { c: P.chrome, mat: 'chrome', h: (s) => s.hDome(x, y, 18, 0.95, 0.55) }); S.paint(circ(x, y, 13), { c: '#05040a', mat: 'glass', h: 0.5 }); }
    A.body = S.bake();
    // ventricule latéral
    const V = mk(C, 84, 104, px, 42, 52, { seed: 62 });
    V.paint((g) => g.ellipse(0, 0, 34, 44, 0, 0, TAU), { c: vgrad(-44, 44, [[0, P.secL], [0.5, P.sec], [1, P.secD]]), mat: 'flesh', h: (s) => s.hDomeE(0, -4, 36, 46, 0.95, 0.2), bump: 0.6 });
    for (const y of [-24, 0, 24]) V.stroke((g) => g.ellipse(0, y, 33 * Math.sqrt(1 - (y / 46) ** 2), 4, 0, 0, Math.PI), { c: P.armor, mat: 'steel', w: 2.6, h: 0.09 });
    V.light(circ(0, -4, 9), rgba(C.cg, 0.5), 8);
    A.vent = V.bake();
    // couveuse
    const Pd = mk(C, 48, 48, px, 24, 24, { seed: 63 });
    Pd.paint(circ(0, 0, 18), { c: (g) => { const gr = g.createRadialGradient(-5, -5, 0, 0, 0, 18); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.3, P.glowL); gr.addColorStop(1, darken(C.cg, 0.5)); return gr; }, mat: 'glass', h: (s) => s.hDome(0, 0, 18, 0.95, 0.3) });
    Pd.light(circ(1, 2, 6), rgba('#ffffff', 0.5), 4);
    for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU; Pd.stroke((g) => { g.arc(0, 0, 17, a - 0.5, a + 0.5); }, { c: P.armor, mat: 'steel', w: 2.6, h: 0.18 }); Pd.stroke((g) => { g.moveTo(Math.cos(a) * 6, Math.sin(a) * 6); g.lineTo(Math.cos(a) * 18, Math.sin(a) * 18); }, { c: P.armor, mat: 'steel', w: 1.6, h: 0.14 }); }
    Pd.paint(circ(0, 0, 4), { c: P.gold, mat: 'gold', h: 0.4 });
    A.pod = Pd.bake();
    A.bead = bead(C, P, px, 9, P.sec, P.secD, true);
    A.sock = eyePod(C, P, px, 13, P.lacq);
    return A;
  },
  draw(c, b, t) {
    const A = b.art, C = b.col;
    for (const p of b.parts) if (p.kind === 'arm' || p.kind === 'pod') {
      c.strokeStyle = rgba(darken(C.c2, 0.55), 0.95); c.lineWidth = p.kind === 'pod' ? 6 : 10; c.lineCap = 'round';
      c.beginPath(); c.moveTo(p.ox * 0.45, p.oy * 0.45); c.quadraticCurveTo(p.ox * 0.8, p.oy * 0.6 - 20, p.ox, p.oy); c.stroke();
      c.strokeStyle = rgba(C.c2, 0.6); c.lineWidth = p.kind === 'pod' ? 2 : 3.5; c.stroke();
      if (p.alive) {
        if (p.kind === 'arm') tentChain(c, A.bead, 9, p.ox, p.oy, p.ox < 0 ? Math.PI * 0.75 : Math.PI * 0.25, 70, 8, t, p.i, 0.45, 8, C.cg);
        c.save(); c.translate(p.ox, p.oy);
        if (p.kind === 'pod') { c.rotate(t * 0.6); drawSculpt(c, A.pod); c.restore(); lit(c, () => glowAt(c, C.cg, p.ox, p.oy, 20, 0.5 + 0.35 * Math.sin(t * 5))); }
        else { drawSculpt(c, A.sock); c.restore(); cyberEye(c, p.ox, p.oy, 8.5, ...b.lookFrom(p), C.cg, t); }
      } else drawWound(c, b, p, t);
    }
    const beat = 1 + b.beat * 0.06 + Math.sin(t * 3) * 0.015;
    c.save(); c.scale(beat, beat); drawSculpt(c, A.body); lit(c, () => drawBloom(c, A.body, 0.5 + b.beat * 0.6 + 0.2 * Math.sin(t * 3))); c.restore();
    for (const p of b.parts) if (p.kind === 'shell') {
      if (p.alive) { c.save(); c.translate(p.ox, p.oy); c.scale(1 + b.beat * 0.05, 1 - b.beat * 0.03); drawSculpt(c, A.vent); lit(c, () => drawBloom(c, A.vent, 0.6 + b.beat * 0.4)); c.restore(); }
      else drawWound(c, b, p, t);
    }
    for (const p of b.parts) if (p.kind === 'cannon') {
      if (p.alive) cyberEye(c, p.ox * beat, p.oy * beat, 11, ...b.lookFrom(p), '#ff2a4a', t);
      else drawWound(c, b, p, t);
    }
  },
};
