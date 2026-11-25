// Signatures des colosses : chaque boss a ses propres armes, ses propres déplacements
// et ses propres blessures. Aucune attaque n'est partagée d'un colosse à l'autre.
import { TAU, rand, angTo, clamp, dist2 } from '../engine/math.js';
import { view, addShake, flash } from '../engine/renderer.js';
import { fx } from '../engine/particles.js';
import { aimed, shoot } from './patterns.js';
import { sfx } from '../audio/sfx.js';

// Liens vers la table d'attaques et la gueule de l'hydre (fournis par boss.js)
export const LINK = { ATT: null, mouth: null };
const PL = (g) => g.player;
const ok = (b, p) => !b.dead && b.state === 'fight' && (!p || p.alive);
const smooth = (u) => u * u * (3 - 2 * u);
// Tir doté d'un comportement (zigzag, arrêt, éclatement…)
function mk(g, x, y, a, sp, kind, o) {
  const k = g.spawnEB(x, y, Math.cos(a) * sp, Math.sin(a) * sp, kind);
  if (k && o) { k.fx = true; Object.assign(k, o); }
  return k;
}
function contact(b, r) {
  const p = b.g.player;
  if (p.alive && p.inv <= 0 && b.g.state === 'play' && dist2(b.x, b.y + 10 * b.sc, p.x, p.y) < (r * b.sc) ** 2) p.hurt();
}
// Croissant de lames qui avance d'un bloc (le creux tourné vers le colosse)
function crescent(g, x, y, a, sp, R, n, o) {
  const cx = x - Math.cos(a) * R, cy = y - Math.sin(a) * R;
  for (let i = 0; i < n; i++) { const off = (i / (n - 1) - 0.5) * 1.25; mk(g, cx + Math.cos(a + off) * R, cy + Math.sin(a + off) * R, a, sp, 'blade', o ? { ...o } : null); }
}
// Tir lobé qui atterrit exactement sur (tx, ty) au bout de T secondes
function lob(g, x, y, tx, ty, T, G, kind, o) {
  const k = g.spawnEB(x, y, 0, 0, kind);
  if (!k) return null;
  k.fx = true; Object.assign(k, o);
  k.vx = (tx - x) / T; k.vy = (ty - y - 0.5 * G * T * T) / T; k.ay = G;
  return k;
}
const safeY = (g, y) => clamp(y, view.h * 0.32, view.h - 50);

export const SIG = {
  // ================= MÉDUSE : électricité, cloches dérivantes =================
  lightning(b, g, s, l) {
    const p = s.part, n = 2 + (l > 1.6 ? 1 : 0);
    for (let i = 0; i < n; i++) g.later(i * 0.2, () => {
      if (!ok(b, p)) return;
      mk(g, p.x, p.y + 8, angTo(p.x, p.y, PL(g).x, PL(g).y) + rand(-0.35, 0.35), 185, 'spark', { zig: 0.11, zamp: 0.8, zaim: true });
      fx.spark(p.x, p.y + 8, rand(-40, 40), 60, 0.25, 8, '#e8fbff', 1.6);
    });
  },
  bellDrift(b, g, s) {
    const p = s.part;
    for (let i = 0; i < 3; i++) mk(g, p.x + rand(-16, 16), p.y + 10, Math.PI / 2 + rand(-0.5, 0.5), 55, 'bell', { wob: { a: 70 + rand(0, 40), f: 2 + rand(0, 0.8), ph: rand(TAU) }, acc: 0.2, vmax: 150, life: 10 });
  },
  staticOrb(b, g, s) {
    const p = s.part;
    mk(g, p.x, p.y, angTo(p.x, p.y, PL(g).x, PL(g).y), 62, 'big', { emit: { every: 0.8, sp: 165, kind: 'spark', zig: 0.12 }, life: 4.6, split: { end: true, n: 6, sp: 120, kind: 'spark' } });
  },
  jellyNova(b, g) {
    for (let k = 0; k < 3; k++) g.later(k * 0.7, () => {
      if (b.dead) return;
      g.addShock(b.cx(), b.cy(), { v: 112 + k * 12, th: 9, gap: angTo(b.cx(), b.cy(), PL(g).x, PL(g).y) + (k - 1) * 0.55, gw: 0.5, style: 'elec' });
      fx.ring(b.cx(), b.cy(), 10, 70, 0.35, '#e8fbff', 3); sfx.ping && sfx.ping();
    });
  },
  bellStorm(b, g, s, l) {
    const n = 10 + Math.floor(l * 2);
    for (let i = 0; i < n; i++) { const a = (i / n) * TAU; mk(g, b.cx() + Math.cos(a) * 30, b.cy() + Math.sin(a) * 30, a, 95, 'bell', { ay: 55, acc: -0.45, vmin: 35, wob: { a: 45, f: 2.6, ph: i }, life: 11 }); }
  },
  stormCage(b, g) {
    const px = clamp(PL(g).x, 60, view.w - 60);
    for (const d of [-1, 1]) {
      const x0 = px + d * 160, x1 = px + d * 38;
      g.addLaser(x0, -10, Math.PI / 2, 0.9, 1.5, 12, g.pal.bullet, 0, { fol: (h) => [x0 + (x1 - x0) * smooth(clamp(h.t / (h.warm + h.dur * 0.6), 0, 1)), -10] });
    }
  },
  jellyFury(b, g, s, l) {
    SIG.jellyNova(b, g, s, l);
    g.later(0.9, () => { if (b.dead) return; for (let i = 0; i < 6; i++) mk(g, b.cx(), b.cy(), Math.PI / 2 + (i - 2.5) * 0.35, 175, 'spark', { zig: 0.12, zamp: 0.8, zaim: true }); });
  },
  sparkLeak(b, g, s) { for (let i = 0; i < 2; i++) mk(g, s.x, s.y, Math.PI / 2 + rand(-0.7, 0.7), 120, 'spark', { zig: 0.13, zamp: 0.7 }); },

  // ================= CRABE : pinces boomerang, bulles venues d'en bas, tenailles =================
  clawBoomerang(b, g, s) {
    const p = s.part, a = angTo(p.x, p.y, PL(g).x, PL(g).y);
    mk(g, p.x, p.y, a, 260, 'claw', { ax: -Math.cos(a) * 240, ay: -Math.sin(a) * 240, curve: (p.ox < 0 ? 1 : -1) * 0.55, life: 3.4 });
    p.data.thrown = 1.6;
    fx.ring(p.x, p.y, 6, 34, 0.3, '#ffffff', 2);
  },
  bubbleLob(b, g, s) {
    const x = s.x, y = s.y, tx = clamp(PL(g).x + rand(-45, 45), 24, view.w - 24), ty = safeY(g, PL(g).y - rand(30, 110)), T = 1.15;
    lob(g, x, y, tx, ty, T, 260, 'bubble', { split: { at: T, n: 6, sp: 95, kind: 'orb' } });
    g.addMark(tx, ty, { r: 26, warm: T });
  },
  pinchWall(b, g) {
    const y = safeY(g, PL(g).y - 10);
    g.addMark(view.w / 2, y, { shape: 'row', w: 170, warm: 0.75, fn: () => {
      for (const side of [-1, 1]) {
        const gap = Math.floor(rand(1, 5));
        for (let i = 0; i < 7; i++) {
          if (i === gap || i === gap + 1) continue;
          const q = g.spawnEB(side < 0 ? -8 : view.w + 8, y + (i - 3) * 26, -side * 112, 0, 'bubble');
          if (q) { q.fx = true; q.life = 6; }
        }
      }
    } });
  },
  bubbleColumns(b, g, s, l) {
    const n = 3 + (l > 1.6 ? 1 : 0), xs = [clamp(PL(g).x, 24, view.w - 24)];
    for (let tries = 0; xs.length < n && tries < 40; tries++) { const x = rand(24, view.w - 24); if (xs.every((v) => Math.abs(v - x) > 62)) xs.push(x); }
    xs.forEach((x, i) => g.addMark(x, view.h - 40, { shape: 'col', w: 36, warm: 1.0, delay: i * 0.22, fn: (h) => {
      for (let k = 0; k < 6; k++) g.later(k * 0.09, () => { const q = g.spawnEB(h.x + rand(-5, 5), view.h + 14, 0, -250, 'bubble'); if (q) { q.fx = true; q.rise = true; q.wob = { a: 40, f: 7, ph: k }; } });
    } }));
  },
  crabRush(b, g) { if (!b.rush) { b.rush = { t: 0, tx: clamp(PL(g).x, view.w * 0.2, view.w * 0.8), drop: 0 }; sfx.roar(); g.msg('LE CRABE CHARGE !', b.col.cg, 18, 1.2); } },
  tideRise(b, g) {
    for (let w = 0; w < 2; w++) g.later(w * 1.2, () => {
      if (b.dead) return;
      const gap = clamp(PL(g).x + rand(-80, 80), 45, view.w - 45);
      g.addMark(view.w / 2, view.h - 18, { shape: 'row', w: 26, warm: 0.6, fn: () => {
        for (let x = 14; x < view.w; x += 26) { if (Math.abs(x - gap) < 38) continue; const q = g.spawnEB(x, view.h + 12, 0, -105, 'bubble'); if (q) { q.fx = true; q.rise = true; } }
      } });
    });
  },
  crabFury(b, g, s, l) { SIG.bubbleColumns(b, g, s, l); g.later(1.4, () => !b.dead && SIG.pinchWall(b, g, s, l)); },
  bubbleLeak(b, g, s) { for (let i = 0; i < 2; i++) mk(g, s.x, s.y, Math.PI / 2 + rand(-0.8, 0.8), 70, 'bubble', { wob: { a: 50, f: 3, ph: i * 2 }, life: 7 }); },

  // ================= FLEUR : graines qui éclosent, lianes qui poussent, pollen =================
  petalGlide(b, g, s) {
    const p = s.part, a = Math.atan2(p.oy, p.ox);
    for (let i = 0; i < 2; i++) mk(g, p.x, p.y, a + (i ? 0.3 : -0.3), 125, 'petal', { curve: (i ? 1 : -1) * 0.9, wob: { a: 30, f: 4, ph: i * 2 }, acc: -0.18, vmin: 70 });
  },
  seedPlant(b, g, s) {
    const x = s.x, y = s.y, tx = clamp(PL(g).x + rand(-60, 60), 20, view.w - 20), ty = safeY(g, PL(g).y - rand(30, 110));
    const T = Math.hypot(tx - x, ty - y) / (170 * g.D.bspd);
    mk(g, x, y, angTo(x, y, tx, ty), 170, 'seed', { stop: { at: T, hold: 1.1, then: 'burst', n: 8, sp: 105, kind: 'petal' } });
    g.addMark(tx, ty, { r: 22, warm: T + 1.1 });
  },
  thornVine(b, g, s) {
    const p = s.part, a0 = angTo(p.x, p.y, PL(g).x, PL(g).y);
    for (let i = 0; i < 12; i++) g.later(i * 0.05, () => {
      if (!ok(b, p)) return;
      const d = 26 + i * 22, a = a0 + Math.sin(i * 0.7) * 0.22, x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d;
      mk(g, x, y, a + Math.PI / 2, 0.01, 'seed', { life: 1.5 - i * 0.02, split: { end: true, n: 2, sp: 125, kind: 'needle', off: a + Math.PI / 2 } });
    });
  },
  bloomField(b, g) {
    for (let i = 0; i < 5; i++) g.later(i * 0.12, () => {
      if (b.dead) return;
      const tx = i === 0 ? clamp(PL(g).x, 24, view.w - 24) : rand(28, view.w - 28), ty = i === 0 ? safeY(g, PL(g).y - 40) : rand(view.h * 0.34, view.h * 0.86);
      const T = Math.hypot(tx - b.cx(), ty - b.cy()) / (220 * g.D.bspd), hold = 1.4 - i * 0.12;
      mk(g, b.cx(), b.cy(), angTo(b.cx(), b.cy(), tx, ty), 220, 'seed', { stop: { at: T, hold, then: 'burst', n: 10, sp: 100, kind: 'petal' } });
      g.addMark(tx, ty, { r: 26, warm: T + hold });
    });
  },
  pollenStorm(b, g) {
    const dir = Math.random() < 0.5 ? -1 : 1, w0 = g.wind || 0;
    g.wind = dir * 85; g.msg(dir < 0 ? '◀ BOURRASQUE DE POLLEN' : 'BOURRASQUE DE POLLEN ▶', '#fff3a0', 16, 1.4);
    g.later(3.8, () => { g.wind = w0; });
    for (let i = 0; i < 26; i++) g.later(i * 0.12, () => {
      if (b.dead) return;
      const q = g.spawnEB(rand(0, view.w) - dir * 40, view.safeT - 6, 0, rand(80, 115), 'seed');
      if (q) { q.fx = true; q.wob = { a: 40, f: 3, ph: i }; }
      for (let k = 0; k < 2; k++) fx.dot(dir < 0 ? view.w + 5 : -5, rand(view.safeT, view.h), dir * rand(260, 420), 0, 0.9, 2, 'rgba(255,245,180,0.6)', 1);
    });
  },
  thornCross(b, g) {
    const a0 = rand(TAU);
    for (let k = 0; k < 6; k++) { const a = a0 + (k / 6) * TAU; for (let i = 0; i < 7; i++) g.later(i * 0.06, () => { if (b.dead) return; const d = 40 + i * 20; mk(g, b.cx() + Math.cos(a) * d, b.cy() + Math.sin(a) * d, a, 0.01, 'seed', { life: 1.2, split: { end: true, n: 1, sp: 150, kind: 'needle', off: a } }); }); }
  },
  flowerFury(b, g, s, l) { SIG.bloomField(b, g, s, l); g.later(0.6, () => !b.dead && SIG.pollenStorm(b, g, s, l)); },
  pollenPuff(b, g, s) { for (let i = 0; i < 3; i++) mk(g, s.x, s.y, Math.PI / 2 + rand(-1, 1), 60, 'seed', { wob: { a: 45, f: 2.5, ph: i * 2 }, life: 7 }); },

  // ================= ŒIL : regards qui suivent, tirs figés, encerclement =================
  gazeBeam(b, g, s) {
    const p = s.part;
    g.addLaser(p.x, p.y, angTo(p.x, p.y, PL(g).x, PL(g).y), 1.15, 0.45, 9, g.pal.bullet, 0, { track: 1.5, part: p, fol: () => [p.x, p.y] });
  },
  encircle(b, g, s, l) {
    const cx = PL(g).x, cy = PL(g).y, n = 9 + Math.floor(l * 2), off = rand(TAU);
    for (let i = 0; i < n; i++) {
      const a = off + (i / n) * TAU, x = cx + Math.cos(a) * 125, y = cy + Math.sin(a) * 125;
      if (y < view.safeT + 20 || x < 6 || x > view.w - 6) continue;
      g.later(i * 0.04, () => { if (b.dead) return; mk(g, x, y, 0, 0, 'orb', { stop: { at: 0, hold: 1.0 - i * 0.03, then: 'point', px: cx, py: cy, sp: 125 } }); fx.ring(x, y, 2, 16, 0.3, g.pal.bullet, 2); });
    }
    g.addMark(cx, cy, { r: 30, warm: 1.0 });
  },
  nerveWave(b, g, s) {
    const p = s.part;
    for (let i = 0; i < 5; i++) g.later(i * 0.11, () => { if (ok(b, p)) mk(g, p.x, p.y, Math.PI / 2 + (p.ox < 0 ? 0.25 : -0.25), 125, 'orb', { wob: { a: 170, f: 5 } }); });
  },
  eyeLaserCore(b, g, s, l) {
    g.addLaser(b.cx(), b.cy(), angTo(b.cx(), b.cy(), PL(g).x, PL(g).y), 0.85, 1.1, 24, g.pal.bullet);
    if (l > 1.4) g.later(1.2, () => !b.dead && g.addLaser(b.cx(), b.cy(), angTo(b.cx(), b.cy(), PL(g).x, PL(g).y), 0.7, 0.9, 20, g.pal.bullet));
  },
  hypnoSpiral(b, g) {
    let a = rand(TAU);
    for (let i = 0; i < 24; i++) g.later(i * 0.07, () => {
      if (b.dead) return;
      for (let k = 0; k < 2; k++) mk(g, b.cx(), b.cy(), a + k * Math.PI, 120, 'orb', { stop: { at: 0.55, hold: Math.max(0.1, 2.1 - i * 0.07 - 0.55), then: 'aim', sp: 150 } });
      a += 0.32;
    });
  },
  frozenStare(b, g) {
    flash('#c8a2ff', 0.25); sfx.roar(); g.msg('REGARD PÉTRIFIANT !', '#e2c8ff', 18, 1.2);
    let n = 0;
    for (const q of g.ebs) { if (q.dead || n > 70) continue; n++; q.fx = true; q.stop = { at: q.t, hold: 0.9 + rand(0, 0.3), then: 'aim', sp: 140 }; }
    for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; mk(g, b.cx() + Math.cos(a) * 46, b.cy() + Math.sin(a) * 46, a, 0.01, 'orb', { stop: { at: 0, hold: 1.1, then: 'resume', sp: 120 } }); }
  },
  eyeFury(b, g) { for (const o of [-0.55, 0, 0.55]) g.addLaser(b.cx(), b.cy(), angTo(b.cx(), b.cy(), PL(g).x, PL(g).y) + o, 1.2, 0.5, 12, g.pal.bullet, 0, { track: 0.9, fol: () => [b.cx(), b.cy()] }); },
  blinkShot(b, g, s) { const a = angTo(s.x, s.y, PL(g).x, PL(g).y); for (let i = 0; i < 5; i++) g.later(i * 0.06, () => !b.dead && shoot(g, s.x, s.y, a, 170, 'orb')); },
  tearDrop(b, g, s) { for (let i = 0; i < 2; i++) g.spawnEB(s.x, s.y, rand(-40, 40), rand(10, 40), 'drop'); },

  // ================= MANTE : croissants de lames, entailles en X, bond =================
  crescentSlash(b, g, s) { const p = s.part; crescent(g, p.x, p.y, angTo(p.x, p.y, PL(g).x, PL(g).y), 165, 78, 9); fx.ring(p.x, p.y, 8, 40, 0.25, '#ffffff', 2); },
  wingFlutter(b, g) {
    const from = b.x, to = clamp(from + (Math.random() < 0.5 ? -1 : 1) * rand(90, 140), view.w * 0.2, view.w * 0.8);
    b.dashM = { t: 0, from, to };
    for (let k = 0; k < 3; k++) { const x = from + (to - from) * (k / 2), y = b.y; g.later(0.3 + k * 0.1, () => { if (b.dead) return; fx.ring(x, y, 10, 40, 0.3, b.col.cg, 2); aimed(g, x, y, 215, 1, 0, 'blade'); }); }
  },
  mandibleFlick(b, g, s) { for (let i = 0; i < 2; i++) g.later(i * 0.1, () => { if (!b.dead) aimed(g, s.x, s.y, 250, 1, 0, 'spark'); }); },
  xSlash(b, g, s, l) {
    const cross = (rot) => { const px = PL(g).x, py = PL(g).y; for (const a of [Math.PI / 2 + 0.72 + rot, Math.PI / 2 - 0.72 + rot]) g.addLaser(px - Math.cos(a) * 800, py - Math.sin(a) * 800, a, 0.75, 0.3, 13, g.pal.bullet, 0, { len: 1700 }); };
    cross(0); if (l > 1.3) g.later(0.95, () => !b.dead && cross(0.72));
  },
  pounce(b, g) { if (!b.pounce) { b.pounce = { t: 0, x0: b.x, y0: b.y, tx: clamp(PL(g).x, 50, view.w - 50), ty: Math.min(PL(g).y - 70, view.h * 0.62), done: false }; sfx.roar(); g.msg('LA MANTE BONDIT !', b.col.cg, 18, 1); } },
  bladeDance(b, g) {
    for (let k = 0; k < 4; k++) g.later(k * 0.42, () => {
      if (b.dead) return;
      const x = k % 2 ? view.w * 0.14 : view.w * 0.86, y = b.y + 20;
      crescent(g, x, y, angTo(x, y, PL(g).x, PL(g).y), 150, 70, 8, { curve: (k % 2 ? -1 : 1) * 0.4 });
    });
  },
  mantisFury(b, g, s, l) { for (let k = 0; k < 3; k++) g.later(k * 0.55, () => !b.dead && SIG.xSlash(b, g, s, 1)); },
  bladeChip(b, g, s) { mk(g, s.x, s.y, Math.PI / 2 + rand(-0.5, 0.5), 80, 'blade', { curve: rand(-1.2, 1.2) }); },

  // ================= VER : acide en flaques, serpent de tirs, éboulements =================
  acidDrop(b, g, s) {
    for (let i = 0; i < 2; i++) { const ly = safeY(g, PL(g).y + rand(-90, 40)); const q = g.spawnEB(s.x + rand(-8, 8), s.y, rand(-50, 50), rand(20, 50), 'drop'); if (q) { q.fx = true; q.split = { y: ly, n: 0, zone: { r: 20, life: 2.2 } }; } }
  },
  tailSting(b, g, s) { const p = s.part, a = angTo(p.x, p.y, PL(g).x, PL(g).y); for (let i = 0; i < 5; i++) mk(g, p.x, p.y, a + (i - 2) * 0.22, 165, 'needle', { curve: -(i - 2) * 0.22 }); },
  sandSnake(b, g, s, l, side) {
    side = side || (Math.random() < 0.5 ? -1 : 1);
    const y0 = safeY(g, PL(g).y - 50);
    g.addMark(view.w / 2, y0, { shape: 'row', w: 150, warm: 0.9, fn: () => {
      for (let i = 0; i < 18; i++) g.later(i * 0.055, () => { if (b.dead) return; const q = g.spawnEB(side < 0 ? -10 : view.w + 10, y0, -side * 170, 0, i ? 'orb' : 'big'); if (q) { q.fx = true; q.wob = { a: 230, f: 3.6 }; } });
    } });
  },
  eruption(b, g) {
    const pts = [[PL(g).x, PL(g).y]]; for (let i = 0; i < 2; i++) pts.push([clamp(PL(g).x + rand(-130, 130), 30, view.w - 30), safeY(g, PL(g).y + rand(-130, 30))]);
    pts.forEach(([x, y], i) => g.addMark(x, y, { r: 32, warm: 1.1, delay: i * 0.2, fn: (h) => {
      addShake(3); g.addZone(h.x, h.y, 30, 2.4);
      for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU; g.spawnEB(h.x, h.y, Math.cos(a) * 105, Math.sin(a) * 105, 'orb'); }
      fx.ring(h.x, h.y, 10, 60, 0.4, b.col.cg, 3);
    } }));
  },
  quake(b, g) {
    addShake(8); sfx.roar(); g.msg('ÉBOULEMENT !', '#ffd6a0', 18, 1.2);
    const xs = []; for (let i = 0; i < 7; i++) xs.push(((i + 0.5) / 7) * view.w + rand(-14, 14));
    const skip = Math.floor(rand(0, 7));
    xs.forEach((x, i) => { if (i === skip) return; g.addMark(x, 40, { shape: 'col', w: 30, warm: 0.7, delay: i * 0.1, fn: () => { g.spawnEB(x, view.safeT - 10, rand(-15, 15), 60, 'rock'); } }); });
  },
  wormFury(b, g, s, l) { SIG.sandSnake(b, g, s, l, -1); g.later(0.5, () => !b.dead && SIG.sandSnake(b, g, s, l, 1)); g.later(2.0, () => !b.dead && SIG.quake(b, g, s, l)); },
  acidDrip(b, g, s) { const q = g.spawnEB(s.x, s.y, rand(-30, 30), 30, 'drop'); if (q) { q.fx = true; q.split = { y: safeY(g, s.y + rand(160, 320)), n: 0, zone: { r: 16, life: 1.8 } }; } },

  // ================= CŒUR : battements, artères, lunes de sang =================
  bloodPulse(b, g, s) { const n = 10, off = rand(TAU); for (let i = 0; i < n; i++) mk(g, s.x, s.y, off + (i / n) * TAU, 125, 'pulse', { pulse: { f: 5.2, lo: 0.12 } }); },
  veinShot(b, g, s) { const a = angTo(s.x, s.y, PL(g).x, PL(g).y); for (const o of [-0.12, 0.12]) mk(g, s.x, s.y, a + o, 150, 'pulse', { pulse: { f: 5.2, lo: 0.12 } }); },
  capillary(b, g, s) { const p = s.part, a = angTo(p.x, p.y, PL(g).x, PL(g).y); for (let i = 0; i < 5; i++) g.later(i * 0.07, () => { if (ok(b, p)) mk(g, p.x, p.y, a + (i - 2) * 0.2, 35, 'needle', { acc: 1.7, vmax: 240 }); }); },
  heartbeat(b, g) {
    for (const [k, d] of [[0, 0], [1, 0.3]]) g.later(d, () => {
      if (b.dead) return;
      const n = 18, off = k * (Math.PI / n);
      for (let i = 0; i < n; i++) mk(g, b.cx(), b.cy(), off + (i / n) * TAU, 135, 'pulse', { pulse: { f: 5.2, lo: 0.1 } });
      addShake(3); fx.ring(b.cx(), b.cy(), 20, 90, 0.35, b.col.cg, 4);
    });
  },
  arteries(b, g) {
    const py = PL(g).y, ys = [], top = view.safeT + 150, bot = view.h - 40;
    for (let y = top; y < bot; y += 70) if (Math.abs(y - py) > 38) ys.push(y + rand(-10, 10));
    ys.sort(() => Math.random() - 0.5).slice(0, 4).forEach((y, i) => {
      const dir = i % 2 ? 1 : -1;
      g.addLaser(dir < 0 ? -10 : view.w + 10, y, dir < 0 ? 0 : Math.PI, 1.05, 0.55, 13, g.pal.bullet, i * 0.12, { len: view.w + 30 });
    });
  },
  bloodMoon(b, g) { for (const d of [-1, 1]) mk(g, b.cx() + d * 40, b.cy() + 20, Math.PI / 2 + d * 0.3, 70, 'big', { split: { y: view.h * 0.58, n: 12, sp: 120, kind: 'pulse' } }); },
  heartFury(b, g, s, l) { SIG.arteries(b, g, s, l); g.later(1.3, () => !b.dead && SIG.heartbeat(b, g, s, l)); },
  bleed(b, g, s) { for (let i = 0; i < 2; i++) mk(g, s.x, s.y, Math.PI / 2 + rand(-0.6, 0.6), 80, 'pulse', { pulse: { f: 5, lo: 0.15 } }); },

  // ================= CUIRASSÉ : DCA, bombardement en tapis =================
  flak(b, g, s) {
    const tx = clamp(PL(g).x + rand(-40, 40), 20, view.w - 20), ty = safeY(g, PL(g).y - rand(50, 130));
    const T = Math.hypot(tx - s.x, ty - s.y) / (190 * g.D.bspd);
    mk(g, s.x, s.y, angTo(s.x, s.y, tx, ty), 190, 'big', { split: { at: T, n: 7, sp: 115, kind: 'shard' } });
    g.addMark(tx, ty, { r: 18, warm: T });
  },
  carpetBomb(b, g) {
    const y = safeY(g, PL(g).y - 20), dir = Math.random() < 0.5 ? 1 : -1;
    for (let i = 0; i < 6; i++) {
      const x = dir > 0 ? ((i + 0.5) / 6) * view.w : view.w - ((i + 0.5) / 6) * view.w;
      g.addMark(x, y + (i % 2 ? -26 : 26), { r: 30, warm: 0.8, delay: i * 0.14, fn: (h) => {
        addShake(2.5); fx.ring(h.x, h.y, 8, 60, 0.35, '#ffb070', 4);
        for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU + 0.3; g.spawnEB(h.x, h.y, Math.cos(a) * 120, Math.sin(a) * 120, 'needle'); }
      } });
    }
  },
  dreadFury(b, g, s, l) { SIG.carpetBomb(b, g, s, l); g.later(1.4, () => !b.dead && LINK.ATT.missileStorm(b, g, s, l)); },

  // ================= ANNEAU : géométrie qui tourne =================
  tangentShot(b, g, s) { const p = s.part, a = Math.atan2(p.oy, p.ox) + Math.PI / 2; for (const o of [0, 0.25]) mk(g, p.x, p.y, a + o, 140, 'needle', { curve: -0.35 }); },
  spokeBeam(b, g, s) {
    const p = s.part;
    g.addLaser(p.x, p.y, Math.atan2(p.oy, p.ox), 0.55, 1.2, 10, g.pal.bullet, 0, { len: 300, part: p, fol: (h) => { h.ang = Math.atan2(p.oy, p.ox); return [p.x, p.y]; } });
  },
  ringFury(b, g) { const a0 = rand(TAU), d = Math.random() < 0.5 ? 1 : -1; for (let k = 0; k < 4; k++) g.addLaser(b.cx(), b.cy(), a0 + (k * Math.PI) / 2, 0.9, 2.2, 12, g.pal.bullet, 0, { va: d * 0.65, fol: () => [b.cx(), b.cy()] }); },
  ringLight(b, g) { const off = rand(TAU); for (let i = 0; i < 6; i++) mk(g, b.cx(), b.cy(), off + (i / 6) * TAU, 110, 'needle', { curve: 0.5 }); },

  // ================= SÉRAPHIN : colonnes de lumière, auréoles tournoyantes =================
  lightPillar(b, g) {
    const x = clamp(PL(g).x, 24, view.w - 24);
    g.addMark(x, view.h * 0.5, { shape: 'col', w: 46, warm: 0.9, color: '#fff3c0', fn: () => { g.addLaser(x, -10, Math.PI / 2, 0.01, 0.45, 32, '#fff3c0', 0, { len: view.h + 40 }); fx.ring(x, PL(g).y, 6, 40, 0.3, '#fff3c0', 3); } });
  },
  haloSpin(b, g, s) { const off = rand(TAU), d = Math.random() < 0.5 ? 1 : -1; for (let i = 0; i < 8; i++) mk(g, s.x, s.y, off + (i / 8) * TAU, 95, 'petal', { curve: d * 1.3, acc: 0.12, vmax: 150 }); },
  holyRain(b, g) {
    const n = 6, skip = Math.floor(rand(0, n)), dir = Math.random() < 0.5 ? 1 : -1;
    for (let i = 0; i < n; i++) {
      if (i === skip) continue;
      const x = ((dir > 0 ? i : n - 1 - i) + 0.5) / n * view.w;
      g.addMark(x, view.h * 0.5, { shape: 'col', w: view.w / n - 6, warm: 0.85, delay: i * 0.22, color: '#fff3c0', fn: () => g.addLaser(x, -10, Math.PI / 2, 0.01, 0.4, view.w / n - 14, '#fff3c0', 0, { len: view.h + 40 }) });
    }
  },
  seraphFury(b, g, s, l) { SIG.holyRain(b, g, s, l); g.later(1.6, () => !b.dead && LINK.ATT.judgment(b, g, s, l)); },
  featherFall(b, g, s) { for (let i = 0; i < 2; i++) mk(g, s.x, s.y, Math.PI / 2 + rand(-0.8, 0.8), 70, 'shard', { wob: { a: 55, f: 3, ph: i * 2 } }); },

  // ================= HYDRE : jets qui balaient, harpons, maelström =================
  venomStream(b, g, s, l) {
    const p = s.part; p.data.lg = 1.0;
    const dir = p.ox < 0 ? 1 : p.ox > 0 ? -1 : (Math.random() < 0.5 ? 1 : -1), n = 16;
    for (let i = 0; i < n; i++) g.later(0.15 + i * 0.05, () => {
      if (!ok(b, p)) return;
      const [x, y] = LINK.mouth(b, p), a = angTo(x, y, PL(g).x, PL(g).y) + dir * (-0.75 + (i / (n - 1)) * 1.5);
      shoot(g, x, y, a, 150, 'orb');
    });
  },
  fireStream(b, g, s, l) {
    const p = s.part; p.data.lg = 1.1; const n = 14 + Math.floor(l * 2);
    for (let i = 0; i < n; i++) g.later(0.15 + i * 0.06, () => { if (!ok(b, p)) return; const [x, y] = LINK.mouth(b, p), a = angTo(x, y, PL(g).x, PL(g).y); shoot(g, x, y, a + Math.sin(i * 0.55) * 0.38, 150 + (i % 3) * 18, 'fire'); });
  },
  scaleCurve(b, g, s) { const dir = s.part.ox < 0 ? -1 : 1; for (let i = 0; i < 6; i++) mk(g, s.x, s.y, Math.PI / 2 + dir * (0.9 - i * 0.18), 140, 'shard', { curve: -dir * 0.7 }); },
  harpoon(b, g, s) { const a = angTo(s.x, s.y, PL(g).x, PL(g).y); for (const o of [-0.08, 0.08]) mk(g, s.x, s.y, a + o, 45, 'needle', { acc: 1.9, vmax: 330 }); fx.ring(s.x, s.y, 4, 20, 0.25, '#ffffff', 2); },
  crossBreath(b, g) {
    for (const p of b.parts) if (p.kind === 'arm' && p.alive) {
      p.data.lg = 1.3;
      for (let i = 0; i < 16; i++) g.later(0.2 + i * 0.06, () => { if (!ok(b, p)) return; const [x, y] = LINK.mouth(b, p), a = angTo(x, y, PL(g).x, PL(g).y) + (p.i - 1) * 0.5 * (1 - i / 15); shoot(g, x, y, a, 165, 'fire'); });
    }
  },
  maelstrom(b, g) {
    const cx = view.w / 2, cy = view.h * 0.56, n = 22, rx = view.w * 0.47, ry = view.h * 0.3;
    g.msg('MAELSTRÖM !', '#9ae8ff', 18, 1.2);
    for (let i = 0; i < n; i++) g.later(i * 0.05, () => {
      if (b.dead) return;
      const a = (i / n) * TAU, x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry;
      if (y < view.safeT + 10) return;
      mk(g, x, y, a + Math.PI + 0.95, 105, 'orb', { curve: 0.55, life: 7 }); fx.ring(x, y, 2, 14, 0.3, '#9ae8ff', 2);
    });
  },
  hydraFury(b, g, s, l) { SIG.crossBreath(b, g, s, l); g.later(1.2, () => { if (b.dead) return; for (const p of b.parts) if (p.kind === 'cannon' && p.alive) SIG.harpoon(b, g, { x: p.x, y: p.y, part: p }, l); }); },
  venomDrip(b, g, s) { for (let i = 0; i < 2; i++) mk(g, s.x, s.y, Math.PI / 2 + rand(-0.5, 0.5), 50, 'fire', { ay: 70 }); },

  // ================= RUCHE : (essaims, cage hexagonale…) =================
  hiveFury(b, g, s, l) { LINK.ATT.swarmWave(b, g, s, l); g.later(1.1, () => !b.dead && LINK.ATT.hexCage(b, g, s, l)); },
  honeyDrip(b, g, s) { for (let i = 0; i < 3; i++) g.spawnEB(s.x, s.y, rand(-60, 60), rand(-90, -40), 'drop'); },
};

// Noms affichés quand le colosse déclenche une grande attaque : le joueur apprend à les reconnaître
export const ATT_NAME = {
  jellyNova: 'ONDE ÉLECTRIQUE', bellStorm: 'PLUIE DE MÉDUSES', stormCage: 'CAGE D’ORAGE', jellyFury: 'TEMPÊTE IONIQUE',
  bubbleColumns: 'GEYSERS DE BULLES', crabRush: 'CHARGE DU CRABE', tideRise: 'MARÉE MONTANTE', crabFury: 'TENAILLES ABYSSALES',
  bloomField: 'CHAMP DE GRAINES', pollenStorm: 'BOURRASQUE', thornCross: 'ÉTOILE D’ÉPINES', flowerFury: 'FLORAISON FATALE',
  eyeLaserCore: 'RAYON DU NÉANT', hypnoSpiral: 'SPIRALE HYPNOTIQUE', frozenStare: 'REGARD PÉTRIFIANT', eyeFury: 'TRIPLE REGARD',
  xSlash: 'ENTAILLE EN X', pounce: 'BOND DE LA MANTE', bladeDance: 'DANSE DES LAMES', mantisFury: 'CARNAGE',
  sandSnake: 'SERPENT DES SABLES', eruption: 'ÉRUPTION ACIDE', quake: 'ÉBOULEMENT', wormFury: 'FRÉNÉSIE DU VER',
  heartbeat: 'BATTEMENT', arteries: 'ARTÈRES', bloodMoon: 'LUNES DE SANG', heartFury: 'ARRÊT CARDIAQUE',
  sweepLaser: 'BALAYAGE', missileStorm: 'SALVE DE MISSILES', carpetBomb: 'TAPIS DE BOMBES', dreadFury: 'FEU À VOLONTÉ',
  spokeLasers: 'RAYONS CROISÉS', ringWall: 'MUR CIRCULAIRE', orbitMines: 'MINES EN ORBITE', ringFury: 'MOULINET',
  featherStorm: 'TEMPÊTE DE PLUMES', mirrorDash: 'VOL MIROIR', judgment: 'JUGEMENT', holyRain: 'COLONNES SACRÉES', seraphFury: 'APOCALYPSE',
  crossBreath: 'SOUFFLE CROISÉ', maelstrom: 'MAELSTRÖM', hydraRoar: 'RUGISSEMENT', hydraFury: 'FUREUR DES TROIS TÊTES',
  honeyRain: 'FONTAINE DE MIEL', hexCage: 'CAGE HEXAGONALE', swarmWave: 'NUÉE', hiveFury: 'COLÈRE DE LA REINE',
};

// Pour chaque colosse : attaques du noyau, attaque légère avant ouverture, blessure et message de blessure
export const PLAN = {
  jelly: { core: ['jellyNova', 'bellStorm', 'stormCage', 'jellyFury'], light: 'lightning', wound: 'sparkLeak', woundMsg: 'La plaie crépite d’étincelles !' },
  crab: { core: ['bubbleColumns', 'crabRush', 'tideRise', 'crabFury'], light: 'bubbleLob', wound: 'bubbleLeak', woundMsg: 'Des bulles s’échappent de la brèche !' },
  flower: { core: ['bloomField', 'pollenStorm', 'thornCross', 'flowerFury'], light: 'seedPlant', wound: 'pollenPuff', woundMsg: 'Du pollen s’échappe de la tige !' },
  eye: { core: ['eyeLaserCore', 'hypnoSpiral', 'frozenStare', 'eyeFury'], light: 'blinkShot', wound: 'tearDrop', woundMsg: 'L’œil pleure des larmes acides !' },
  mantis: { core: ['xSlash', 'pounce', 'bladeDance', 'mantisFury'], light: 'mandibleFlick', wound: 'bladeChip', woundMsg: 'Des éclats de lame volent !' },
  worm: { core: ['sandSnake', 'eruption', 'quake', 'wormFury'], light: 'acidDrop', wound: 'acidDrip', woundMsg: 'L’acide suinte et fait des flaques !' },
  heart: { core: ['heartbeat', 'arteries', 'bloodMoon', 'heartFury'], light: 'veinShot', wound: 'bleed', woundMsg: 'La plaie bat au rythme du cœur !' },
  dread: { core: ['sweepLaser', 'carpetBomb', 'missileStorm', 'dreadFury'], light: 'flak', wound: 'geyser', woundMsg: 'La brèche crache du feu !' },
  ring: { core: ['spokeLasers', 'ringWall', 'orbitMines', 'ringFury'], light: 'ringLight', wound: 'segBurst', woundMsg: 'Le module éclate en étincelles !' },
  seraph: { core: ['featherStorm', 'holyRain', 'mirrorDash', 'judgment', 'seraphFury'], light: 'haloSpin', wound: 'featherFall', woundMsg: 'Des plumes de lumière tombent !' },
  hydra: { core: ['crossBreath', 'maelstrom', 'hydraRoar', 'hydraFury'], light: 'harpoon', wound: 'venomDrip', woundMsg: 'Le moignon crache du venin brûlant !' },
  hive: { core: ['honeyRain', 'hexCage', 'swarmWave', 'hiveFury'], light: 'cellSting', wound: 'honeyDrip', woundMsg: 'Du miel brûlant gicle !' },
};
// Armes des parties (remplacent les tirs génériques)
export const PART_ATT = {
  jelly: { arm: ['lightning', 3.0], shell: ['bellDrift', 3.8], cannon: ['staticOrb', 4.2] },
  crab: { arm: ['clawBoomerang', 3.2], shell: ['pinchWall', 5.2], cannon: ['bubbleLob', 3.0] },
  flower: { shell: ['petalGlide', 3.0], cannon: ['seedPlant', 3.4], arm: ['thornVine', 3.6] },
  eye: { cannon: ['gazeBeam', 4.6], shell: ['encircle', 5.0], arm: ['nerveWave', 3.0] },
  mantis: { arm: ['crescentSlash', 3.0], shell: ['wingFlutter', 4.4], cannon: ['mandibleFlick', 2.4] },
  worm: { segment: ['acidDrop', 3.8], arm: ['tailSting', 2.8] },
  heart: { shell: ['bloodPulse', 3.6], cannon: ['veinShot', 2.8], arm: ['capillary', 3.2] },
  dread: { cannon: ['flak', 3.4] },
  ring: { segment: ['tangentShot', 3.4], shell: ['spokeBeam', 4.0] },
  seraph: { arm: ['lightPillar', 3.6], cannon: ['haloSpin', 3.6] },
  hydra: { shell: ['scaleCurve', 3.4], cannon: ['harpoon', 2.8] },
};

// Déplacements propres à chaque colosse
export const MOVES = {
  // Méduse : propulsion par contractions (monte d'un coup, redescend en planant)
  jelly(b, dt) {
    b.mt = (b.mt || 0) + dt * (1 + b.rage * 0.05);
    const ph = (b.mt * 0.55) % 1, push = ph < 0.22 ? smooth(ph / 0.22) : 1 - smooth((ph - 0.22) / 0.78);
    b.x = view.w / 2 + Math.sin(b.mt * 0.33) * view.w * 0.22;
    b.y = b.ty + 16 - push * 30;
    if (ph < 0.05) b.beat = 1;
  },
  // Crabe : trottine de côté par à-coups, puis charge
  crab(b, dt) {
    const g = b.g, W = view.w;
    b.mt = (b.mt || 0) + dt;
    if (b.rush) {
      const R = b.rush; R.t += dt;
      if (R.t < 0.55) { b.x += Math.sin(b.t * 70) * 2; b.y = b.ty - smooth(R.t / 0.55) * 14; R.y0 = b.y; R.x0 = b.x; }
      else if (R.t < 1.05) { const u = smooth((R.t - 0.55) / 0.5); b.x = R.x0 + (R.tx - R.x0) * u; b.y = R.y0 + (Math.min(g.player.y - 90, view.h * 0.66) - R.y0) * u; contact(b, 70); }
      else if (R.t < 1.35) { contact(b, 70); if (!R.hit) { R.hit = true; addShake(6); for (let k = 0; k < 10; k++) { const a = (k / 10) * TAU; const q = g.spawnEB(b.x, b.y + 30, Math.cos(a) * 90, Math.sin(a) * 90 - 40, 'bubble'); if (q) { q.fx = true; q.life = 5; } } } }
      else if (R.t < 2.2) { const u = smooth((R.t - 1.35) / 0.85); b.y += (b.ty - b.y) * Math.min(1, u * 0.5 + dt * 4); }
      else { b.rush = null; b.sx = b.x; }
      return;
    }
    b.next = (b.next ?? 1.5) - dt;
    if (b.next <= 0) { b.next = rand(1.4, 2.6) - b.rage * 0.08; b.sx = W * [0.24, 0.5, 0.76][Math.floor(rand(0, 3))]; }
    b.x += ((b.sx ?? W / 2) - b.x) * Math.min(1, dt * 4.5);
    b.y = b.ty + Math.abs(Math.sin(b.mt * 7)) * 3;
  },
  // Fleur : enracinée au centre, elle se balance à peine
  flower(b, dt) { b.mt = (b.mt || 0) + dt; b.x = view.w / 2 + Math.sin(b.mt * 0.25) * view.w * 0.05; b.y = b.ty + Math.sin(b.mt * 0.9) * 6; },
  // Œil : flotte en huit, lentement
  eye(b, dt) { b.mt = (b.mt || 0) + dt * (1 + b.rage * 0.05); b.x = view.w / 2 + Math.sin(b.mt * 0.5) * view.w * 0.24; b.y = b.ty + Math.sin(b.mt * 1.0) * 20; },
  // Mante : immobile, puis se déplace d'un coup sec ; bondit sur le joueur
  mantis(b, dt) {
    const g = b.g, W = view.w;
    if (b.pounce) {
      const P = b.pounce; P.t += dt;
      if (P.t < 0.6) { b.y = P.y0 - smooth(P.t / 0.6) * 22; b.x = P.x0 + Math.sin(b.t * 60) * 1.5; }
      else if (P.t < 0.92) { const u = smooth((P.t - 0.6) / 0.32); b.x = P.x0 + (P.tx - P.x0) * u; b.y = P.y0 - 22 + (P.ty - P.y0 + 22) * u; contact(b, 62); }
      else if (P.t < 1.25) { contact(b, 62); if (!P.done) { P.done = true; addShake(7); for (let k = 0; k < 10; k++) { const a = (k / 10) * TAU; g.spawnEB(b.x, b.y, Math.cos(a) * 130, Math.sin(a) * 130, 'blade'); } } }
      else if (P.t < 2.1) { const u = smooth((P.t - 1.25) / 0.85); b.x = P.tx + (W / 2 - P.tx) * u; b.y = P.ty + (b.ty - P.ty) * u; }
      else { b.pounce = null; b.hx = b.x; }
      return;
    }
    if (b.dashM) { const D = b.dashM; D.t += dt; const u = smooth(Math.min(1, D.t / 0.28)); b.x = D.from + (D.to - D.from) * u; if (D.t > 0.28) { b.dashM = null; b.hx = b.x; } }
    else {
      b.next = (b.next ?? 2.4) - dt;
      if (b.next <= 0) { b.next = rand(2.2, 3.4); b.dashM = { t: 0, from: b.x, to: clamp(view.w * rand(0.25, 0.75), W * 0.2, W * 0.8) }; }
    }
    b.mt = (b.mt || 0) + dt;
    b.y = b.ty + Math.sin(b.mt * 1.6) * 5;
  },
  // Cœur : reste au centre et bat
  heart(b, dt) { b.mt = (b.mt || 0) + dt; b.x = view.w / 2 + Math.sin(b.mt * 0.3) * view.w * 0.08; b.y = b.ty + Math.sin(b.mt * 0.8) * 8 - b.beat * 5; },
  // Cuirassé : lourd, lent, majestueux
  dread(b, dt) { b.mt = (b.mt || 0) + dt; b.x = view.w / 2 + Math.sin(b.mt * 0.22) * view.w * 0.16; b.y = b.ty + Math.sin(b.mt * 0.5) * 6; },
};
