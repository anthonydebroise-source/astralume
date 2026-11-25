// Nouveaux colosses : Hydre abyssale (trois têtes qui repoussent) et Ruche-mère (alvéoles d'où sortent les essaims)
import { TAU, rgba, lighten, darken, clamp, angDiff } from '../engine/math.js';
import { drawSculpt, drawBloom } from '../engine/sculpt.js';
import { BOSS_ART, mk, vgrad, circ, poly, mirror, turret, glowAt, drawWound, drawReactor } from './bossart.js';

const lit = (c, f) => { c.globalCompositeOperation = 'lighter'; f(); c.globalCompositeOperation = 'source-over'; };
const aimA = (b, p) => Math.atan2(b.g.player.y - (b.y + p.oy * b.sc), b.g.player.x - (b.x + p.ox * b.sc));
const hexPath = (x, y, r, a = Math.PI / 6) => (g) => { for (let i = 0; i < 6; i++) { const an = a + (i / 6) * TAU; const px = x + Math.cos(an) * r, py = y + Math.sin(an) * r; if (i) g.lineTo(px, py); else g.moveTo(px, py); } g.closePath(); };
const HONEY = '#ffb43a', HONEYD = '#a8520c', HONEYL = '#ffe39a';

// Orientation d'une tête d'hydre : regarde le joueur, mais garde le museau vers le bas
export function headAngle(b, p) { const a = aimA(b, p); return Math.PI / 2 + clamp(angDiff(a, Math.PI / 2), -0.85, 0.85); }
export const HYDRA_ROOTS = [[-30, 36], [0, 46], [30, 36]];

// ================= HYDRE ABYSSALE =================
BOSS_ART.hydra = {
  build(C, P, px) {
    const A = {};
    const S = mk(C, 160, 150, px, 80, 80, { seed: 121 });
    const shellO = mirror([0, -76, 24, -72, 46, -58, 60, -34, 64, -6, 58, 22, 46, 42, 26, 56]).concat([0, 60]);
    const shell = mirror([0, -70, 22, -66, 42, -53, 55, -31, 58, -6, 53, 19, 42, 37, 24, 50]).concat([0, 54]);
    S.paint(poly(shellO), { c: P.armorD, mat: 'metal', h: (s) => s.hDome(0, -8, 66, 0.55, 0.12) });
    S.paint(poly(shell), { c: vgrad(-70, 54, [[0, P.lacqL], [0.45, P.lacq], [1, P.lacqD]]), mat: 'gloss', h: (s) => s.hDome(0, -10, 62, 0.95, 0.3), bump: 0.05 });
    // écailles imbriquées
    S.within(poly(shell), () => {
      for (let j = 0; j < 7; j++) {
        const y = -64 + j * 17, off = (j % 2) * 8;
        for (let x = -56 + off; x <= 56; x += 16) {
          if (Math.abs(x) < 9 && y > -30 && y < 40) continue;
          S.paint((g) => { g.moveTo(x - 8, y); g.quadraticCurveTo(x - 8, y + 13, x, y + 15); g.quadraticCurveTo(x + 8, y + 13, x + 8, y); g.closePath(); },
            { c: vgrad(y, y + 15, [[0, lighten(P.lacq, 0.25)], [1, darken(P.lacq, 0.35)]]), mat: 'gloss', h: (s) => s.hLin(0, y, 0, y + 15, 0.02, 0.09), hm: 'add' });
          S.stroke((g) => { g.moveTo(x - 7.5, y + 2); g.quadraticCurveTo(x - 7.5, y + 13, x, y + 14.5); g.quadraticCurveTo(x + 7.5, y + 13, x + 7.5, y + 2); }, { c: darken(P.lacq, 0.6), w: 0.8, h: -0.02 });
        }
      }
    });
    S.stroke(poly(shell), { c: P.gold, mat: 'gold', w: 2, h: 0.05 });
    // crête dorsale à épines
    for (const y of [-66, -52, -38]) S.paint(poly([-6, y + 10, 0, y - 9, 6, y + 10]), { c: P.gold, mat: 'gold', h: (s) => s.hLin(-6, 0, 6, 0, 0.35, 0.35) });
    S.stroke((g) => { g.moveTo(0, -70); g.lineTo(0, -26); }, { c: P.chrome, mat: 'chrome', w: 2, h: 0.08, emi: rgba(C.cg, 0.5), ew: 0.8 });
    // ouïes lumineuses
    for (const s of [-1, 1]) for (let k = 0; k < 3; k++) S.stroke((g) => { g.moveTo(s * (40 + k * 4), -20 + k * 10); g.quadraticCurveTo(s * (48 + k * 4), -12 + k * 10, s * (44 + k * 4), -2 + k * 10); }, { c: '#07050c', w: 2.2, h: -0.08, emi: rgba(C.cg, 0.85), ew: 1.1 });
    // logement du cœur
    S.paint(circ(0, 6, 31), { c: P.gold, mat: 'gold', h: (s) => s.hDome(0, 6, 32, 0.7, 0.35) });
    S.paint(circ(0, 6, 26.5), { c: '#06050b', mat: 'glass', h: 0.3 });
    for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; S.paint(circ(Math.cos(a) * 28.6, 6 + Math.sin(a) * 28.6, 1.4), { c: P.chrome, mat: 'chrome', h: 0.08, hm: 'add' }); }
    // supports des tourelles dorsales
    for (const s of [-1, 1]) { S.paint(circ(s * 30, -56, 15), { c: P.gold, mat: 'gold', h: (q) => q.hDome(s * 30, -56, 15, 0.5, 0.3) }); S.paint(circ(s * 30, -56, 12), { c: P.armorD, mat: 'metal', h: 0.35 }); }
    // colliers des cous
    for (const [x, y] of HYDRA_ROOTS) {
      S.paint(circ(x, y, 13), { c: P.gold, mat: 'gold', h: (s) => s.hDome(x, y, 13, 0.75, 0.4) });
      S.paint(circ(x, y, 9.5), { c: '#08060d', h: 0.3 });
      S.light(circ(x, y, 6), rgba(C.cg, 0.5), 3);
    }
    A.body = S.bake();
    // épaulières (carapaces latérales)
    for (const s of [-1, 1]) {
      const Sh = mk(C, 84, 84, px, 42, 42, { seed: 122 + s });
      const pl = (g) => { g.save(); g.scale(s, 1); g.moveTo(-26, -24); g.quadraticCurveTo(10, -40, 32, -16); g.quadraticCurveTo(38, 10, 20, 30); g.quadraticCurveTo(-6, 36, -24, 18); g.quadraticCurveTo(-34, -4, -26, -24); g.closePath(); g.restore(); };
      // pointes
      for (const [x0, y0, x1, y1] of [[18, -26, 40, -40], [30, -6, 46, -12], [26, 16, 42, 22]]) Sh.paint(poly([s * x0, y0 - 5, s * x1, y1, s * x0, y0 + 5]), { c: P.chrome, mat: 'chrome', h: (q) => q.hLin(s * x0, y0, s * x1, y1, 0.6, 0.25) });
      Sh.paint(pl, { c: P.armorD, mat: 'metal', h: (q) => q.hDome(s * 2, 0, 38, 0.8, 0.2) });
      Sh.within(pl, () => {
        Sh.paint(circ(s * 2, -3, 30), { c: vgrad(-30, 30, [[0, P.lacqL], [0.5, P.lacq], [1, P.lacqD]]), mat: 'gloss', h: (q) => q.hDome(s * 2, -3, 30, 0.9, 0.35), hm: 'add' });
        for (let k = 0; k < 3; k++) Sh.stroke((g) => { g.arc(s * 2, -3, 14 + k * 7, -2.6, 0.6); }, { c: darken(P.lacq, 0.55), w: 1, h: -0.03 });
      });
      Sh.stroke(pl, { c: P.gold, mat: 'gold', w: 2.2, h: 0.06 });
      Sh.paint(poly([s * 2, -12, s * 9, -2, s * 2, 8, s * -5, -2]), { c: P.gold, mat: 'gold', h: 0.5 });
      Sh.paint(poly([s * 2, -8, s * 6, -2, s * 2, 4, s * -2, -2]), { c: '#ffffff', mat: 'glass', h: 0.55, emi: rgba(C.cg, 0.9) });
      Sh.rivets([[s * -18, -14], [s * 20, 20], [s * -16, 14]], 1, P.chrome);
      A[s < 0 ? 'shL' : 'shR'] = Sh.bake();
    }
    // vertèbre du cou
    const V = mk(C, 30, 30, px, 15, 15, { seed: 125, depth: 18 });
    for (const s of [-1, 1]) V.paint(poly([-4, s * 6, 0, s * 13, 4, s * 6]), { c: P.gold, mat: 'gold', h: 0.45 });
    V.paint(circ(0, 0, 9), { c: P.armorD, mat: 'metal', h: (q) => q.hDome(0, 0, 9, 0.8, 0.3) });
    V.paint(circ(0, 0, 7.4), { c: vgrad(-7, 7, [[0, P.lacqL], [1, P.lacqD]]), mat: 'gloss', h: (q) => q.hDome(0, -1, 7.5, 0.9, 0.4) });
    V.stroke(circ(0, 0, 8.2), { c: P.gold, mat: 'gold', w: 1, h: 0.05 });
    A.vert = V.bake();
    // tête de dragon (museau vers +y)
    const H = mk(C, 66, 84, px, 33, 30, { seed: 126 });
    for (const s of [-1, 1]) {
      H.paint((g) => { g.moveTo(s * 7, -2); g.quadraticCurveTo(s * 18, -14, s * 27, -27); g.quadraticCurveTo(s * 20, -10, s * 12, 4); g.closePath(); }, { c: P.chrome, mat: 'chrome', h: (q) => q.hLin(s * 7, 0, s * 27, -27, 0.55, 0.2) });
      H.paint((g) => { g.moveTo(s * 12, 8); g.quadraticCurveTo(s * 22, 4, s * 25, -6); g.quadraticCurveTo(s * 20, 10, s * 14, 16); g.closePath(); }, { c: P.gold, mat: 'gold', h: 0.4 });
    }
    H.paint((g) => g.ellipse(0, 6, 15, 14, 0, 0, TAU), { c: P.armorD, mat: 'metal', h: (q) => q.hDome(0, 6, 15, 0.7, 0.25) });
    const skull = mirror([0, -8, 11, -4, 15, 8, 14, 22, 10, 34, 6, 44]).concat([0, 47]);
    H.paint(poly(skull), { c: vgrad(-8, 47, [[0, P.lacqL], [0.55, P.lacq], [1, P.lacqD]]), mat: 'gloss', h: (q) => q.hCyl(-15, 0, 15, 0, 0.95, 0.3), bump: 0.05 });
    // dents
    for (const s of [-1, 1]) for (let k = 0; k < 4; k++) { const y = 28 + k * 4.4, x = s * (11.6 - k * 1.5); H.paint(poly([x, y, x + s * 3, y + 2, x, y + 3.4]), { c: '#fff6e8', mat: 'gloss', h: 0.25 }); }
    // crête
    H.paint(poly([0, -7, 3, 4, 2, 30, 0, 36, -2, 30, -3, 4]), { c: P.gold, mat: 'gold', h: (q) => q.hLin(-3, 0, 3, 0, 0.12, 0.12), hm: 'add' });
    // yeux
    for (const s of [-1, 1]) {
      H.paint((g) => g.ellipse(s * 8.5, 16, 4.6, 2.6, s * 0.5, 0, TAU), { c: '#05030a', mat: 'glass', h: 0.15 });
      H.light((g) => g.ellipse(s * 8.5, 16, 3.4, 1.4, s * 0.5, 0, TAU), P.glowL, 3);
    }
    for (const s of [-1, 1]) H.light(circ(s * 3.4, 40, 1.4), P.glow, 2.5);
    H.stroke(poly(skull), { c: darken(P.lacq, 0.6), w: 0.9, h: 0.02 });
    A.head = H.bake();
    A.turret = turret(C, P, px, 12);
    return A;
  },
  draw(c, b, t) {
    const A = b.art, C = b.col;
    for (const p of b.parts) if (p.kind === 'shell') {
      const s = p.ox < 0 ? -1 : 1;
      if (p.alive) { c.save(); c.translate(p.ox, p.oy + Math.sin(t * 1.6) * 1.5); c.rotate(s * Math.sin(t * 1.6) * 0.04); drawSculpt(c, s < 0 ? A.shL : A.shR); lit(c, () => drawBloom(c, s < 0 ? A.shL : A.shR, 0.6 + 0.3 * Math.sin(t * 3))); c.restore(); }
      else drawWound(c, b, p, t);
    }
    drawSculpt(c, A.body);
    lit(c, () => drawBloom(c, A.body, 0.55 + 0.35 * Math.sin(t * 2.2) + b.beat * 0.3));
    for (const p of b.parts) if (p.kind === 'cannon') {
      if (p.alive) { c.save(); c.translate(p.ox, p.oy); c.rotate(aimA(b, p) - Math.PI / 2); drawSculpt(c, A.turret); c.restore(); }
      else drawWound(c, b, p, t);
    }
    // cous et têtes
    for (const p of b.parts) if (p.kind === 'arm') {
      const [rx, ry] = HYDRA_ROOTS[p.i] || HYDRA_ROOTS[1];
      const gr = p.alive ? (p.data.grow ?? 1) : 0;
      if (!p.alive) { drawWound(c, b, { ox: rx, oy: ry + 4, r: 15 }, t); continue; }
      const hx = rx + (p.ox - rx) * gr, hy = ry + (p.oy - ry) * gr;
      const mx = rx + (hx - rx) * 0.15 + Math.sin(t * 1.9 + p.i * 2) * 14, my = ry + (hy - ry) * 0.75;
      const n = 9;
      for (let k = 1; k <= n; k++) {
        const u = k / (n + 1), iu = 1 - u;
        const x = iu * iu * rx + 2 * iu * u * mx + u * u * hx, y = iu * iu * ry + 2 * iu * u * my + u * u * hy;
        const tx = 2 * iu * (mx - rx) + 2 * u * (hx - mx), ty = 2 * iu * (my - ry) + 2 * u * (hy - my);
        const sc = (1.05 - u * 0.25) * (0.4 + 0.6 * gr);
        c.save(); c.translate(x, y); c.rotate(Math.atan2(ty, tx)); c.scale(sc, sc); drawSculpt(c, A.vert); c.restore();
      }
      const ha = headAngle(b, p) - Math.PI / 2, ch = p.cd < 0.7 ? 1 - p.cd / 0.7 : 0;
      c.save(); c.translate(hx, hy); c.rotate(ha); const hs = 0.45 + 0.55 * gr; c.scale(hs, hs);
      drawSculpt(c, A.head);
      lit(c, () => { drawBloom(c, A.head, 0.7 + 0.3 * Math.sin(t * 5 + p.i)); glowAt(c, C.cg, 0, 46, 10 + ch * 16, 0.25 + ch * 0.75); if (ch > 0.5) glowAt(c, '#ffffff', 0, 46, 6 + ch * 6, ch * 0.8); });
      c.restore();
    }
  },
};

// ================= RUCHE-MÈRE =================
export const HIVE_CELLS = [0, 1, 2, 3, 4, 5].map((k) => { const a = (k / 6) * TAU; return [Math.cos(a) * 58, Math.sin(a) * 58]; });
BOSS_ART.hive = {
  build(C, P, px) {
    const A = {};
    const S = mk(C, 220, 270, px, 110, 135, { seed: 131 });
    // pattes fines (sous les ailes)
    for (const s of [-1, 1]) for (const [y0, y1, y2] of [[10, 34, 74], [36, 66, 104]]) {
      S.stroke((g) => { g.moveTo(s * 50, y0); g.lineTo(s * 84, y1); g.lineTo(s * 92, y2); }, { c: P.armorD, mat: 'metal', w: 4.4, h: 0.3 });
      S.stroke((g) => { g.moveTo(s * 50, y0); g.lineTo(s * 84, y1); g.lineTo(s * 92, y2); }, { c: P.chrome, mat: 'chrome', w: 1.6, h: 0.08, hm: 'add' });
      S.paint(circ(s * 84, y1, 3.2), { c: P.gold, mat: 'gold', h: 0.4 });
    }
    // abdomen rayé (vers le haut)
    const abd = (g) => g.ellipse(0, -84, 46, 50, 0, 0, TAU);
    S.paint(abd, { c: darken(P.lacq, 0.35), mat: 'gloss', h: (q) => q.hDomeE(0, -84, 46, 50, 0.95, 0.2) });
    S.within(abd, () => {
      for (let k = 0; k < 6; k++) {
        const y = -128 + k * 15;
        S.paint((g) => g.rect(-50, y, 100, 7.5), { c: vgrad(y, y + 7.5, [[0, HONEYL], [0.5, HONEY], [1, HONEYD]]), mat: 'gold', h: (q) => q.hLin(0, y, 0, y + 7.5, 0.02, 0.06), hm: 'add' });
      }
      S.paint((g) => g.ellipse(-14, -104, 14, 18, -0.4, 0, TAU), { c: 'rgba(255,255,255,0.08)', mat: 'gloss', h: 0.02, hm: 'add' });
    });
    S.stroke(abd, { c: P.gold, mat: 'gold', w: 1.6, h: 0.04 });
    for (const s of [-1, 1]) { S.paint(circ(s * 38, -92, 14), { c: P.gold, mat: 'gold', h: (q) => q.hDome(s * 38, -92, 14, 0.55, 0.3) }); S.paint(circ(s * 38, -92, 10.5), { c: P.armorD, mat: 'metal', h: 0.32 }); }
    // plaque alvéolaire (thorax)
    const plate = hexPath(0, 0, 84, 0);
    S.paint(plate, { c: P.armorD, mat: 'metal', h: (q) => q.hDome(0, 0, 90, 0.65, 0.2) });
    S.within(hexPath(0, 0, 79, 0), () => {
      S.paint(hexPath(0, 0, 80, 0), { c: vgrad(-80, 80, [[0, lighten(P.lacq, 0.1)], [1, P.lacqD]]), mat: 'gloss', h: (q) => q.hDome(0, 0, 84, 0.8, 0.3), hm: 'add' });
      const R = 8.6, dx = R * 1.5, dy = R * Math.sqrt(3);
      for (let i = -7; i <= 7; i++) for (let j = -6; j <= 6; j++) {
        const x = i * dx, y = j * dy + (i % 2 ? dy / 2 : 0);
        if (Math.hypot(x, y) > 84) continue;
        const lv = ((i * 7 + j * 13) % 5 + 5) % 5;
        S.paint(hexPath(x, y, R * 0.84, 0), { c: lv === 0 ? HONEY : darken(HONEYD, 0.35), mat: lv === 0 ? 'glass' : 'gloss', h: (q) => q.hDome(x, y, R, lv === 0 ? 0.2 : -0.05, 0.02), hm: 'add', emi: lv === 0 ? rgba(HONEY, 0.55) : undefined });
      }
    });
    S.stroke(plate, { c: P.gold, mat: 'gold', w: 3, h: 0.08 });
    S.stroke(hexPath(0, 0, 77, 0), { emi: rgba(C.cg, 0.7), ew: 1, w: 0.6 });
    // logement du cœur
    S.paint(hexPath(0, 0, 32), { c: P.gold, mat: 'gold', h: (q) => q.hDome(0, 0, 33, 0.7, 0.35) });
    S.paint(hexPath(0, 0, 27), { c: '#07050b', mat: 'glass', h: 0.3 });
    // supports des alvéoles
    for (const [x, y] of HIVE_CELLS) S.paint(hexPath(x, y, 21), { c: P.armorD, mat: 'metal', h: (q) => q.hDome(x, y, 21, 0.45, 0.2) });
    // tête de la reine (vers le joueur)
    S.paint((g) => g.rect(-26, 70, 52, 10), { c: P.gold, mat: 'gold', h: (q) => q.hCyl(-26, 0, 26, 0, 0.6, 0.3) });
    for (let i = -3; i <= 3; i++) S.paint(poly([i * 7 - 3, 72, i * 7, 62 - (3 - Math.abs(i)) * 3, i * 7 + 3, 72]), { c: P.gold, mat: 'gold', h: 0.5 });
    const head = (g) => g.ellipse(0, 96, 32, 24, 0, 0, TAU);
    S.paint(head, { c: vgrad(72, 120, [[0, P.lacqL], [0.5, P.lacq], [1, P.lacqD]]), mat: 'gloss', h: (q) => q.hDomeE(0, 96, 32, 24, 0.95, 0.3) });
    for (const s of [-1, 1]) {
      const eye = (g) => g.ellipse(s * 17, 96, 11, 15, s * 0.35, 0, TAU);
      S.paint(eye, { c: '#07040d', mat: 'glass', h: (q) => q.hDomeE(s * 17, 96, 11, 15, 0.6, 0.3) });
      S.within(eye, () => { for (let i = -3; i <= 3; i++) for (let j = -4; j <= 4; j++) { const x = s * 17 + i * 4.2, y = 96 + j * 3.7 + (i % 2 ? 1.85 : 0); S.stroke(hexPath(x, y, 2.1, 0), { w: 0.5, emi: rgba(C.cg, 0.22 + 0.1 * ((i + j + 9) % 3)), ew: 0.4 }); } });
      S.light((g) => g.ellipse(s * 15, 90, 4, 5, 0, 0, TAU), rgba(C.cg, 0.7), 4);
    }
    // antennes
    for (const s of [-1, 1]) { S.stroke((g) => { g.moveTo(s * 8, 112); g.quadraticCurveTo(s * 18, 128, s * 40, 126); }, { c: P.chrome, mat: 'chrome', w: 1.8, h: 0.2 }); S.paint(circ(s * 40, 126, 3), { c: '#ffffff', mat: 'glass', h: 0.3, emi: C.cg }); }
    A.body = S.bake();
    // alvéole (partie destructible)
    const Cl = mk(C, 46, 46, px, 23, 23, { seed: 132, depth: 22 });
    Cl.paint(hexPath(0, 0, 19), { c: P.gold, mat: 'gold', h: (q) => q.hDome(0, 0, 20, 0.55, 0.35) });
    Cl.paint(hexPath(0, 0, 15.5), { c: (g) => { const gr = g.createRadialGradient(-4, -5, 0, 0, 0, 16); gr.addColorStop(0, HONEYL); gr.addColorStop(0.45, HONEY); gr.addColorStop(1, HONEYD); return gr; }, mat: 'glass', h: (q) => q.hDome(0, 0, 16, 0.6, 0.25), emi: rgba(HONEY, 0.35) });
    Cl.paint((g) => { g.ellipse(0, 1, 6.5, 9, 0.3, 0, TAU); }, { c: rgba(darken(HONEYD, 0.4), 0.8), mat: 'gloss', h: 0.06, hm: 'add' });
    for (let k = 0; k < 4; k++) Cl.stroke((g) => { g.moveTo(-6 + k * 0.6, -5 + k * 3.6); g.lineTo(6 + k * 0.4, -3 + k * 3.6); }, { c: rgba(HONEYD, 0.9), w: 0.7, h: -0.02 });
    Cl.light(circ(1, -3, 3), rgba(lighten(C.cg, 0.3), 0.8), 3);
    Cl.rivets([0, 1, 2, 3, 4, 5].map((k) => { const a = Math.PI / 6 + (k / 6) * TAU; return [Math.cos(a) * 17.2, Math.sin(a) * 17.2]; }), 0.9, P.chrome);
    A.cell = Cl.bake();
    // ailes translucides (une paire par côté)
    for (const s of [-1, 1]) {
      const Wg = mk(C, 136, 92, px, s < 0 ? 126 : 10, 46, { seed: 133 + s, outline: 0, depth: 10 });
      const lobe = (L, a, w) => (g) => { g.save(); g.scale(s, 1); g.rotate(a); g.moveTo(0, -3); g.bezierCurveTo(L * 0.35, -w, L * 0.85, -w * 0.9, L, 0); g.bezierCurveTo(L * 0.8, w * 0.7, L * 0.3, w * 0.6, 0, 3); g.closePath(); g.restore(); };
      for (const [L, a, w] of [[86, 0.32, 15], [118, -0.18, 22]]) {
        Wg.paint(lobe(L, a, w), { c: 'rgba(205,235,255,0.34)', mat: 'glass', h: 0.08 });
        Wg.stroke(lobe(L, a, w), { c: P.gold, mat: 'gold', w: 1.4, h: 0.05, emi: rgba(C.cg, 0.5), ew: 0.6 });
        for (let k = 1; k <= 4; k++) Wg.stroke((g) => { g.save(); g.scale(s, 1); g.rotate(a); g.moveTo(L * 0.08, 0); g.quadraticCurveTo(L * (0.2 + k * 0.17), (k % 2 ? -1 : 1) * w * 0.3, L * (0.3 + k * 0.16), (k - 2.5) * w * 0.22); g.restore(); }, { c: rgba(P.gold, 0.8), w: 0.8, h: 0.03, emi: rgba(C.cg, 0.35), ew: 0.4 });
      }
      Wg.paint(circ(0, 0, 7), { c: P.gold, mat: 'gold', h: 0.5 });
      A[s < 0 ? 'wingL' : 'wingR'] = Wg.bake();
    }
    // mandibule (pointe vers +y)
    const Md = mk(C, 34, 46, px, 17, 8, { seed: 136 });
    const md = (g) => { g.moveTo(-5, -4); g.quadraticCurveTo(10, 6, 7, 30); g.quadraticCurveTo(4, 36, -2, 38); g.quadraticCurveTo(2, 22, -7, 6); g.closePath(); };
    Md.paint(md, { c: vgrad(-4, 38, [[0, P.chrome], [0.6, P.armor], [1, P.gold]]), mat: 'chrome', h: (q) => q.hLin(-7, 0, 9, 0, 0.3, 0.7) });
    for (let k = 0; k < 4; k++) Md.paint(poly([-1 - k * 0.4, 12 + k * 6, -5 - k * 0.3, 14 + k * 6, -1.5 - k * 0.4, 16 + k * 6]), { c: '#fff4e0', mat: 'gloss', h: 0.25 });
    Md.paint(circ(0, 0, 5.5), { c: P.gold, mat: 'gold', h: 0.5 });
    A.mand = Md.bake();
    // dard (tourelle d'aiguillon, pointe vers +y)
    const St = mk(C, 28, 56, px, 14, 13, { seed: 137 });
    St.paint(poly([-2.4, 8, 0, 42, 2.4, 8]), { c: P.chrome, mat: 'chrome', h: (q) => q.hLin(-2.4, 0, 2.4, 0, 0.3, 0.3) });
    St.paint(circ(0, 0, 11), { c: P.armorD, mat: 'metal', h: (q) => q.hDome(0, 0, 11, 0.8, 0.3) });
    St.paint(circ(0, 1, 8.6), { c: vgrad(-8, 9, [[0, HONEYL], [0.5, HONEY], [1, HONEYD]]), mat: 'gloss', h: (q) => q.hDome(0, 0, 9, 0.85, 0.4) });
    for (let k = 0; k < 3; k++) St.stroke((g) => { g.moveTo(-8, -3 + k * 4); g.lineTo(8, -3 + k * 4); }, { c: darken(P.lacq, 0.4), w: 1.6, h: -0.03 });
    St.light(circ(0, 9, 2), P.glowL, 3);
    A.sting = St.bake();
    return A;
  },
  draw(c, b, t) {
    const A = b.art, C = b.col;
    // ailes : bourdonnement rapide + traînée
    for (const p of b.parts) if (p.kind === 'shell') {
      const s = p.ox < 0 ? -1 : 1, W = s < 0 ? A.wingL : A.wingR;
      if (!p.alive) { drawWound(c, b, { ox: s * 46, oy: -30, r: 18 }, t); continue; }
      const f = Math.sin(t * 46 + s) * 0.16;
      c.save(); c.translate(s * 42, -34);
      c.globalAlpha = 0.28; c.save(); c.rotate(s * (-0.38 - 0.16)); drawSculpt(c, W); c.restore();
      c.save(); c.rotate(s * (-0.38 + 0.16)); drawSculpt(c, W); c.restore();
      c.globalAlpha = 0.9; c.rotate(s * (-0.38 + f)); drawSculpt(c, W); lit(c, () => drawBloom(c, W, 0.5 + 0.3 * Math.sin(t * 6)));
      c.globalAlpha = 1; c.restore();
    }
    drawSculpt(c, A.body);
    lit(c, () => drawBloom(c, A.body, 0.5 + 0.35 * Math.sin(t * 2.6) + b.beat * 0.3));
    for (const p of b.parts) {
      if (p.kind === 'pod') {
        if (!p.alive) { drawWound(c, b, p, t); continue; }
        const pul = 1 + 0.04 * Math.sin(t * 5 + p.i * 1.3), ch = p.cd < 0.8 ? 1 - p.cd / 0.8 : 0;
        c.save(); c.translate(p.ox, p.oy); c.scale(pul, pul); drawSculpt(c, A.cell);
        lit(c, () => { drawBloom(c, A.cell, 0.5 + 0.4 * Math.sin(t * 4 + p.i)); glowAt(c, HONEY, 0, 0, 14 + ch * 10, 0.2 + ch * 0.6); });
        c.restore();
      } else if (p.kind === 'arm') {
        if (!p.alive) { drawWound(c, b, p, t); continue; }
        const s = p.ox < 0 ? -1 : 1, sn = Math.max(0, Math.sin(t * 3 + p.i)) ** 4 * 0.4 + (p.cd < 0.5 ? (0.5 - p.cd) * 0.8 : 0);
        c.save(); c.translate(p.ox, p.oy - 8); c.scale(s, 1); c.rotate(-0.25 + sn); drawSculpt(c, A.mand); c.restore();
      } else if (p.kind === 'cannon') {
        if (!p.alive) { drawWound(c, b, p, t); continue; }
        c.save(); c.translate(p.ox, p.oy); c.rotate(aimA(b, p) - Math.PI / 2); drawSculpt(c, A.sting); c.restore();
      }
    }
  },
  drawCore(c, b, p, t) {
    drawReactor(c, b, p, t);
    lit(c, () => {
      c.strokeStyle = rgba(HONEYL, 0.75); c.lineWidth = 1.3;
      for (let k = 0; k < 2; k++) { c.save(); c.rotate(t * (k ? -0.8 : 0.6)); c.beginPath(); hexPath(0, 0, p.r * (0.7 + k * 0.32))(c); c.stroke(); c.restore(); }
    });
  },
};
