// Nouveaux colosses : Cuirassé (vaisseau amiral), Forteresse-anneau (station), Séraphin (ange mécanique)
import { TAU, rgba, lighten, darken } from '../engine/math.js';
import { drawSculpt, drawBloom } from '../engine/sculpt.js';
import { BOSS_ART, mk, vgrad, circ, poly, mirror, turret, hexPlate, limb, drawLimb, glowAt, drawWound, drawReactor, cyberEye } from './bossart.js';

const lit = (c, f) => { c.globalCompositeOperation = 'lighter'; f(); c.globalCompositeOperation = 'source-over'; };
const aimA = (b, p) => Math.atan2(b.g.player.y - (b.y + p.oy * b.sc), b.g.player.x - (b.x + p.ox * b.sc));
const hcyl = (w, hc = 0.9, he = 0.25) => (s) => s.hCyl(-w, 0, w, 0, hc, he);
function flame(c, x, y, r, len, col, t, up = true) {
  const f = 0.8 + 0.2 * Math.sin(t * 40 + x), L = len * f, d = up ? -1 : 1;
  const gr = c.createLinearGradient(0, y, 0, y + d * L);
  gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.2, lighten(col, 0.4)); gr.addColorStop(1, rgba(col, 0));
  c.fillStyle = gr; c.beginPath(); c.moveTo(x - r, y); c.quadraticCurveTo(x - r * 0.6, y + d * L * 0.5, x, y + d * L); c.quadraticCurveTo(x + r * 0.6, y + d * L * 0.5, x + r, y); c.closePath(); c.fill();
}

// ================= CUIRASSÉ =================
BOSS_ART.dread = {
  build(C, P, px) {
    const A = {};
    const S = mk(C, 128, 206, px, 64, 106, { seed: 81 });
    // quille sombre
    S.paint(poly(mirror([0, 94, 16, 82, 34, 42, 48, 0, 50, -40, 44, -76, 30, -94]).concat([0, -98])), { c: P.armorD, mat: 'metal', h: hcyl(50, 0.6, 0.15) });
    // coque laquée
    const hull = mirror([0, 86, 14, 72, 30, 36, 42, 0, 44, -36, 38, -70, 24, -88]).concat([0, -90]);
    S.paint(poly(hull), { c: vgrad(-90, 86, [[0, P.lacqD], [0.35, P.lacq], [0.7, P.lacqL], [1, P.lacqD]]), mat: 'gloss', h: hcyl(44, 0.95, 0.3), bump: 0.06 });
    // plaques de blindage latérales
    for (const s of [-1, 1]) for (const [y0, y1, x0, x1] of [[-74, -46, 18, 36], [-36, -6, 22, 41], [4, 30, 22, 39], [40, 62, 14, 28]]) {
      S.paint(poly([s * x0, y0, s * x1, y0 + 4, s * (x1 + 1), y1 - 2, s * (x0 - 2), y1]), { c: vgrad(y0, y1, [[0, P.secL], [1, P.secD]]), mat: 'gloss', h: 0.07, hm: 'add' });
      S.stroke((g) => { g.moveTo(s * x0, y0); g.lineTo(s * x1, y0 + 4); }, { c: P.gold, mat: 'gold', w: 1.1, h: 0.03 });
      S.rivets([[s * (x0 + 3), y0 + 4], [s * (x1 - 3), y1 - 5]], 0.8, P.chrome);
    }
    // pont central blindé
    S.paint(poly(mirror([0, 72, 7, 62, 11, -60]).concat([0, -80])), { c: vgrad(-80, 72, [[0, lighten(P.armor, 0.25)], [1, P.armorD]]), mat: 'steel', h: 0.08, hm: 'add' });
    S.stroke((g) => { g.moveTo(0, -76); g.lineTo(0, 68); }, { c: P.gold, mat: 'gold', w: 1.6, h: 0.04 });
    S.grooves([[-10, -30, 10, -30], [-10, 10, 10, 10], [-9, 46, 9, 46]], 0.8, 0.07);
    // baies du hangar lumineuses
    for (const s of [-1, 1]) for (let k = 0; k < 3; k++) { const y = 8 + k * 7; S.paint((g) => g.rect(s > 0 ? 15 : -29, y, 14, 3.4), { c: '#05050a', h: 0.35 }); S.light((g) => g.rect(s > 0 ? 16 : -28, y + 0.8, 12, 1.8), P.glow, 3); }
    // tour de commandement (logement du noyau)
    S.paint(circ(0, -18, 31), { c: P.gold, mat: 'gold', h: (s) => s.hDome(0, -18, 32, 0.8, 0.5) });
    S.paint(circ(0, -18, 26), { c: '#07060c', mat: 'metal', h: 0.3 });
    S.rivets(Array.from({ length: 10 }, (_, i) => [Math.cos((i / 10) * TAU) * 28.5, -18 + Math.sin((i / 10) * TAU) * 28.5]), 0.9, P.armorD);
    // supports des tourelles
    for (const [x, y] of [[-40, 34], [40, 34], [-28, -52], [28, -52]]) { S.paint(circ(x, y, 16), { c: P.armor, mat: 'steel', h: (s) => s.hDome(x, y, 16, 0.95, 0.55) }); S.paint(circ(x, y, 11.5), { c: '#0a0910', h: 0.45 }); }
    // éperon de proue
    S.paint(poly([0, 104, 7, 84, 0, 88, -7, 84]), { c: P.chrome, mat: 'chrome', h: 0.6 });
    // réacteurs de poupe
    for (const [x, y, r] of [[0, -92, 9], [-21, -84, 7], [21, -84, 7]]) { S.paint((g) => g.ellipse(x, y, r, r * 0.6, 0, 0, TAU), { c: P.chrome, mat: 'chrome', h: (s) => s.hDomeE(x, y, r, r * 0.6, 0.75, 0.4) }); S.paint((g) => g.ellipse(x, y, r * 0.65, r * 0.38, 0, 0, TAU), { c: '#05050a', h: 0.3 }); S.light((g) => g.ellipse(x, y, r * 0.5, r * 0.28, 0, 0, TAU), P.glowL, 3); }
    // feux de bord
    for (const [x, y] of [[40, -10], [42, -40], [32, 34], [20, 66]]) for (const s of [-1, 1]) S.light(circ(s * x, y, 1.2), s < 0 ? '#ff3a5a' : '#47ffa3', 1.5);
    A.body = S.bake();
    // batteries latérales (gauche / droite)
    for (const s of [-1, 1]) {
      const B = mk(C, 70, 64, px, 35, 32, { seed: 82 + s });
      for (let k = 0; k < 3; k++) {
        const y = -12 + k * 11, ang = 0.55;
        B.paint((g) => { g.save(); g.translate(s * 14, y); g.rotate(s > 0 ? ang : Math.PI - ang); g.rect(0, -2, 20, 4); g.restore(); }, { c: P.chrome, mat: 'chrome', h: 0.55 });
      }
      B.paint(poly([s * -24, -26, s * 18, -20, s * 22, 20, s * -20, 26]), { c: vgrad(-26, 26, [[0, lighten(P.armor, 0.2)], [1, P.armorD]]), mat: 'steel', h: hcyl(24, 0.85, 0.3) });
      B.paint(poly([s * -16, -18, s * 12, -14, s * 14, 12, s * -12, 18]), { c: vgrad(-18, 18, [[0, P.secL], [1, P.secD]]), mat: 'gloss', h: 0.08, hm: 'add' });
      B.stroke(poly([s * -24, -26, s * 18, -20, s * 22, 20, s * -20, 26]), { c: P.gold, mat: 'gold', w: 1.4, h: 0.04 });
      for (let k = 0; k < 3; k++) { B.paint((g) => g.rect(-8, -10 + k * 8, 16, 2.4), { c: '#05050a', h: 0.3 }); B.light((g) => g.rect(-7, -9.6 + k * 8, 14, 1.4), P.glow, 2); }
      B.rivets([[s * -18, -20], [s * 14, -16], [s * 16, 14], [s * -14, 20]], 1, P.chrome);
      A[s < 0 ? 'battL' : 'battR'] = B.bake();
    }
    // nacelle-hangar
    const H = mk(C, 46, 62, px, 23, 31, { seed: 84 });
    H.paint((g) => g.ellipse(0, 0, 17, 25, 0, 0, TAU), { c: vgrad(-25, 25, [[0, P.lacqL], [1, P.lacqD]]), mat: 'gloss', h: (s) => s.hDomeE(0, -2, 18, 26, 0.95, 0.25) });
    H.paint((g) => g.rect(-9, 6, 18, 12), { c: '#05050a', h: 0.35 }); H.light((g) => g.rect(-8, 8, 16, 2), P.glow, 3); H.light((g) => g.rect(-8, 13, 16, 2), P.glow, 3);
    for (const s of [-1, 1]) H.paint(poly([s * 14, -14, s * 22, -6, s * 15, 4]), { c: P.chrome, mat: 'chrome', h: 0.5 });
    H.stroke((g) => g.ellipse(0, 0, 17, 25, 0, 0, TAU), { c: P.gold, mat: 'gold', w: 1.2, h: 0.04 });
    A.pod = H.bake();
    // rampe de missiles
    const R = mk(C, 40, 40, px, 20, 18, { seed: 85 });
    R.paint((g) => g.rect(-15, -12, 30, 22), { c: vgrad(-12, 10, [[0, lighten(P.armor, 0.2)], [1, P.armorD]]), mat: 'steel', h: hcyl(15, 0.7, 0.3) });
    for (let k = 0; k < 4; k++) { const x = -10.5 + k * 7; R.paint((g) => g.rect(x - 2.4, -8, 4.8, 18), { c: '#f2f4fa', mat: 'gloss', h: 0.55 }); R.paint(poly([x - 2.4, 10, x, 16, x + 2.4, 10]), { c: C.c2, mat: 'gloss', h: 0.6 }); }
    R.stroke((g) => g.rect(-15, -12, 30, 22), { c: P.gold, mat: 'gold', w: 1, h: 0.04 });
    A.rack = R.bake();
    A.strut = limb(C, P, px, 50, 8, { bands: 1, glow: true });
    A.turret = turret(C, P, px, 13);
    return A;
  },
  draw(c, b, t) {
    const A = b.art, C = b.col;
    for (const p of b.parts) if (p.kind === 'pod') { const s = p.ox < 0 ? -1 : 1; drawLimb(c, A.strut, s * 40, -50, p.ox, p.oy, 50); }
    lit(c, () => { for (const [x, y, r] of [[0, -94, 6], [-21, -86, 4.5], [21, -86, 4.5]]) flame(c, x, y, r, 26 + r * 2, C.cg, t); });
    drawSculpt(c, A.body);
    lit(c, () => drawBloom(c, A.body, 0.6 + 0.3 * Math.sin(t * 3) + b.beat * 0.3));
    for (const p of b.parts) {
      if (p.kind === 'shell') { if (p.alive) { c.save(); c.translate(p.ox, p.oy); drawSculpt(c, p.ox < 0 ? A.battL : A.battR); lit(c, () => drawBloom(c, p.ox < 0 ? A.battL : A.battR, 0.7)); c.restore(); } else drawWound(c, b, p, t); }
      else if (p.kind === 'pod') { if (p.alive) { c.save(); c.translate(p.ox, p.oy); drawSculpt(c, A.pod); lit(c, () => drawBloom(c, A.pod, 0.6 + 0.4 * Math.sin(t * 4 + p.i))); c.restore(); } else drawWound(c, b, p, t); }
      else if (p.kind === 'arm') { if (p.alive) { c.save(); c.translate(p.ox, p.oy); drawSculpt(c, A.rack); c.restore(); } else drawWound(c, b, p, t); }
      else if (p.kind === 'cannon') { if (p.alive) { c.save(); c.translate(p.ox, p.oy); c.rotate(aimA(b, p) - Math.PI / 2); drawSculpt(c, A.turret); c.restore(); } else drawWound(c, b, p, t); }
    }
  },
};

// ================= FORTERESSE-ANNEAU =================
BOSS_ART.ring = {
  build(C, P, px) {
    const A = {};
    const S = mk(C, 214, 214, px, 107, 107, { seed: 91 });
    // rail extérieur (tore)
    const rail = (g) => { g.arc(0, 0, 94, 0, TAU); g.moveTo(80, 0); g.arc(0, 0, 80, 0, TAU, true); };
    S.paint(rail, { c: P.armorD, mat: 'metal', rule: 'evenodd', h: (s) => { const gr = s.hg.createRadialGradient(0, 0, 80, 0, 0, 94); gr.addColorStop(0, s.hv(0.15)); gr.addColorStop(0.5, s.hv(0.55)); gr.addColorStop(1, s.hv(0.15)); return gr; } });
    S.stroke(circ(0, 0, 87), { c: P.armor, mat: 'steel', w: 3, h: 0.06, emi: rgba(C.cg, 0.7), ew: 0.8 });
    for (let i = 0; i < 24; i++) { const a = (i / 24) * TAU; S.grooves([[Math.cos(a) * 81, Math.sin(a) * 81, Math.cos(a) * 93, Math.sin(a) * 93]], 0.7, 0.05); }
    // moyeu central
    S.paint(circ(0, 0, 40), { c: P.gold, mat: 'gold', h: (s) => s.hDome(0, 0, 41, 0.7, 0.4) });
    S.paint(circ(0, 0, 34), { c: vgrad(-34, 34, [[0, P.lacqL], [1, P.lacqD]]), mat: 'gloss', h: (s) => s.hDome(0, 0, 35, 0.75, 0.45) });
    for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU + 0.2; S.paint((g) => { g.moveTo(Math.cos(a - 0.12) * 31, Math.sin(a - 0.12) * 31); g.lineTo(Math.cos(a) * 39, Math.sin(a) * 39); g.lineTo(Math.cos(a + 0.12) * 31, Math.sin(a + 0.12) * 31); g.closePath(); }, { c: P.chrome, mat: 'chrome', h: 0.6 }); }
    S.paint(circ(0, 0, 30), { c: '#07060c', h: 0.35 });
    S.stroke(circ(0, 0, 32), { emi: rgba(C.cg, 0.8), ew: 1, w: 0.5 });
    A.body = S.bake();
    // module du rail (orienté vers +x)
    const M = mk(C, 44, 44, px, 22, 22, { seed: 92 });
    const wedge = (g) => { const r0 = -12, r1 = 12, a = 0.36; g.moveTo(r0 * 1, -16); g.lineTo(r1, -19); g.lineTo(r1 + 4, 0); g.lineTo(r1, 19); g.lineTo(r0, 16); g.quadraticCurveTo(r0 - 3, 0, r0, -16); g.closePath(); void a; };
    M.paint(wedge, { c: vgrad(-19, 19, [[0, P.secL], [0.5, P.sec], [1, P.secD]]), mat: 'gloss', h: (s) => s.hDome(0, 0, 22, 0.9, 0.3) });
    M.stroke(wedge, { c: P.gold, mat: 'gold', w: 1.2, h: 0.04 });
    M.paint((g) => g.rect(10, -2.2, 12, 4.4), { c: P.chrome, mat: 'chrome', h: 0.6 });
    M.paint((g) => g.rect(-6, -9, 10, 18), { c: '#06050b', h: 0.35 }); M.light((g) => g.rect(-5, -8, 8, 16), rgba(C.cg, 0.8), 2);
    M.rivets([[-8, -12], [-8, 12], [8, -14], [8, 14]], 0.9, P.chrome);
    A.seg = M.bake();
    A.spoke = limb(C, P, px, 50, 9, { bands: 2, glow: true });
    A.hex = hexPlate(C, P, px, 22);
    return A;
  },
  draw(c, b, t) {
    const A = b.art, C = b.col;
    drawSculpt(c, A.body);
    lit(c, () => drawBloom(c, A.body, 0.6 + 0.35 * Math.sin(t * 2.5) + b.beat * 0.3));
    for (const p of b.parts) if (p.kind === 'shell') { const a = Math.atan2(p.oy, p.ox); drawLimb(c, A.spoke, Math.cos(a) * 32, Math.sin(a) * 32, Math.cos(a) * 82, Math.sin(a) * 82, 50); }
    for (const p of b.parts) {
      if (p.kind === 'segment') { if (p.alive) { c.save(); c.translate(p.ox, p.oy); c.rotate(Math.atan2(p.oy, p.ox)); drawSculpt(c, A.seg); lit(c, () => drawBloom(c, A.seg, 0.6 + 0.4 * Math.sin(t * 5 + p.i))); c.restore(); } else drawWound(c, b, p, t); }
      else if (p.kind === 'shell') { if (p.alive) { c.save(); c.translate(p.ox, p.oy); c.rotate(-t * 0.6); drawSculpt(c, A.hex); c.restore(); } else drawWound(c, b, p, t); }
    }
  },
  drawCore(c, b, p, t) {
    drawReactor(c, b, p, t);
    lit(c, () => { c.lineWidth = 2; for (let k = 0; k < 3; k++) { c.strokeStyle = rgba(k % 2 ? '#ffffff' : b.col.cg, 0.7); c.beginPath(); c.arc(0, 0, p.r * 0.7, t * 3 + (k / 3) * TAU, t * 3 + (k / 3) * TAU + 1.2); c.stroke(); } });
  },
};

// ================= SÉRAPHIN =================
BOSS_ART.seraph = {
  build(C, P, px) {
    const A = {};
    const WH = '#eef2fa';
    const S = mk(C, 130, 196, px, 65, 104, { seed: 101 });
    // auréole (derrière la tête)
    const halo = (g) => { g.arc(0, -64, 42, 0, TAU); g.moveTo(34, -64); g.arc(0, -64, 34, 0, TAU, true); };
    S.paint(halo, { c: P.gold, mat: 'gold', rule: 'evenodd', h: (s) => { const gr = s.hg.createRadialGradient(0, -64, 34, 0, -64, 42); gr.addColorStop(0, s.hv(0.2)); gr.addColorStop(0.5, s.hv(0.6)); gr.addColorStop(1, s.hv(0.2)); return gr; } });
    S.stroke(circ(0, -64, 38), { emi: rgba(C.cg, 0.9), ew: 1, w: 0.5 });
    // queue effilée
    S.paint(poly([0, 92, 6, 60, 0, 66, -6, 60]), { c: P.gold, mat: 'gold', h: 0.55 });
    // torse
    const torso = mirror([0, 70, 10, 56, 18, 30, 26, 0, 24, -22, 16, -40, 10, -50]).concat([0, -54]);
    S.paint(poly(torso), { c: vgrad(-54, 70, [[0, '#ffffff'], [0.5, WH], [1, '#a8b2c8']]), mat: 'chrome', h: hcyl(26, 0.95, 0.35) });
    // plaques laquées
    for (const s of [-1, 1]) {
      S.paint(poly([s * 6, -36, s * 20, -22, s * 22, 0, s * 8, -8]), { c: vgrad(-36, 0, [[0, P.lacqL], [1, P.lacqD]]), mat: 'gloss', h: 0.07, hm: 'add' });
      S.paint(poly([s * 8, 20, s * 20, 22, s * 14, 50, s * 5, 44]), { c: vgrad(20, 50, [[0, P.lacqL], [1, P.lacqD]]), mat: 'gloss', h: 0.07, hm: 'add' });
      S.stroke((g) => { g.moveTo(s * 6, -36); g.lineTo(s * 20, -22); g.lineTo(s * 22, 0); }, { c: P.gold, mat: 'gold', w: 1.2, h: 0.04 });
    }
    S.stroke((g) => { g.moveTo(0, -50); g.lineTo(0, 64); }, { c: P.gold, mat: 'gold', w: 1.4, h: 0.05, emi: rgba(C.cg, 0.45), ew: 0.6 });
    // tête casquée + couronne
    S.paint((g) => g.ellipse(0, -48, 11, 13, 0, 0, TAU), { c: vgrad(-61, -35, [[0, '#ffffff'], [1, '#9aa4ba']]), mat: 'chrome', h: (s) => s.hDomeE(0, -49, 11, 13, 0.95, 0.5) });
    S.paint((g) => g.rect(-7, -48, 14, 3.4), { c: '#06050b', h: 0.4 }); S.light((g) => g.rect(-6, -47.4, 12, 2.2), P.glow, 3);
    for (const [x, l] of [[-8, 12], [-4, 16], [0, 20], [4, 16], [8, 12]]) S.paint(poly([x - 2, -58, x, -58 - l, x + 2, -58]), { c: P.gold, mat: 'gold', h: 0.6 });
    // logement du cœur
    S.paint(poly([0, -20, 18, 6, 0, 32, -18, 6]), { c: P.gold, mat: 'gold', h: 0.75 });
    S.paint(poly([0, -14, 13, 6, 0, 26, -13, 6]), { c: '#07060c', h: 0.4 });
    A.body = S.bake();
    // grandes ailes (plumes-lames)
    for (const s of [-1, 1]) {
      const Wg = mk(C, 110, 110, px, s < 0 ? 80 : 30, 66, { seed: 102 + s });
      for (let k = 3; k >= 0; k--) {
        const a = -0.95 + k * 0.38, L = 74 - k * 8;
        const fe = (g) => { g.save(); g.scale(s, 1); g.rotate(a); g.moveTo(0, -6); g.quadraticCurveTo(L * 0.55, -16, L, 0); g.quadraticCurveTo(L * 0.55, 10, 0, 6); g.closePath(); g.restore(); };
        Wg.paint(fe, { c: k % 2 ? WH : lighten(P.lacq, 0.35), mat: k % 2 ? 'chrome' : 'gloss', h: (q) => q.hDome(s * Math.cos(a) * L * 0.45, Math.sin(a) * L * 0.45, L * 0.55, 0.7, 0.2) });
        Wg.stroke((g) => { g.save(); g.scale(s, 1); g.rotate(a); g.moveTo(2, -5); g.quadraticCurveTo(L * 0.55, -15, L - 2, 0); g.restore(); }, { c: P.gold, mat: 'gold', w: 1.4, h: 0.05, emi: rgba(C.cg, 0.6), ew: 0.6 });
      }
      Wg.paint(circ(0, 0, 9), { c: P.gold, mat: 'gold', h: (q) => q.hDome(0, 0, 9, 0.9, 0.4) });
      Wg.light(circ(0, 0, 3.5), P.glowL, 3);
      A[s < 0 ? 'wingL' : 'wingR'] = Wg.bake();
      const Lw = mk(C, 70, 60, px, s < 0 ? 52 : 18, 22, { seed: 104 + s });
      for (let k = 2; k >= 0; k--) {
        const a = 0.35 + k * 0.32, L = 46 - k * 6;
        const fe = (g) => { g.save(); g.scale(s, 1); g.rotate(a); g.moveTo(0, -4); g.quadraticCurveTo(L * 0.55, -10, L, 0); g.quadraticCurveTo(L * 0.55, 7, 0, 4); g.closePath(); g.restore(); };
        Lw.paint(fe, { c: k % 2 ? lighten(P.lacq, 0.3) : WH, mat: k % 2 ? 'gloss' : 'chrome', h: (q) => q.hDome(s * Math.cos(a) * L * 0.45, Math.sin(a) * L * 0.45, L * 0.55, 0.7, 0.2) });
        Lw.stroke((g) => { g.save(); g.scale(s, 1); g.rotate(a); g.moveTo(2, -3); g.quadraticCurveTo(L * 0.55, -9, L - 2, 0); g.restore(); }, { c: P.gold, mat: 'gold', w: 1.1, h: 0.05, emi: rgba(C.cg, 0.5), ew: 0.5 });
      }
      Lw.paint(circ(0, 0, 6), { c: P.gold, mat: 'gold', h: 0.6 });
      A[s < 0 ? 'lwL' : 'lwR'] = Lw.bake();
    }
    return A;
  },
  draw(c, b, t) {
    const A = b.art, C = b.col;
    lit(c, () => { glowAt(c, C.cg, 0, -64, 70, 0.35 + 0.2 * Math.sin(t * 2)); });
    for (const p of b.parts) if (p.kind === 'shell') {
      const s = p.ox < 0 ? -1 : 1;
      if (p.alive) { const f = Math.sin(t * 2.2) * 0.08; c.save(); c.translate(s * 20, -20); c.rotate(s * f); drawSculpt(c, s < 0 ? A.wingL : A.wingR); lit(c, () => drawBloom(c, s < 0 ? A.wingL : A.wingR, 0.6 + 0.3 * Math.sin(t * 3))); c.restore(); }
      else drawWound(c, b, p, t);
    }
    for (const p of b.parts) if (p.kind === 'arm') {
      const s = p.ox < 0 ? -1 : 1;
      if (p.alive) { c.save(); c.translate(s * 16, 36); c.rotate(s * Math.sin(t * 2.6 + p.i) * 0.12); drawSculpt(c, s < 0 ? A.lwL : A.lwR); lit(c, () => drawBloom(c, s < 0 ? A.lwL : A.lwR, 0.5)); c.restore(); }
      else drawWound(c, b, p, t);
    }
    drawSculpt(c, A.body);
    lit(c, () => drawBloom(c, A.body, 0.6 + 0.3 * Math.sin(t * 2) + b.beat * 0.3));
    for (const p of b.parts) if (p.kind === 'cannon') {
      if (p.alive) { lit(c, () => glowAt(c, C.cg, p.ox, p.oy, p.r * 1.8, 0.7 + 0.3 * Math.sin(t * 6 + p.ox))); cyberEye(c, p.ox, p.oy, p.r * 0.62, ...b.lookFrom(p), C.cg, t); }
      else drawWound(c, b, p, t);
    }
  },
  drawCore(c, b, p, t) {
    const A = b.art;
    c.save(); c.rotate(Math.PI / 4 + Math.sin(t) * 0.1); c.scale(0.62, 0.62); drawSculpt(c, A.core.s); c.restore();
    lit(c, () => { glowAt(c, b.col.cg, 0, 0, 34, 0.55 + b.beat * 0.35); c.strokeStyle = rgba('#ffffff', 0.7); c.lineWidth = 1.2; c.beginPath(); c.moveTo(0, -24); c.lineTo(17, 0); c.lineTo(0, 24); c.lineTo(-17, 0); c.closePath(); c.stroke(); });
  },
};
