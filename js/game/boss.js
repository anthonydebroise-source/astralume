// Boss modulaires : chaque partie détruite tombe (récupérable) et révèle une nouvelle attaque
import { TAU, rand, angTo, clamp, rgba, lighten, darken, ease, dist2 } from '../engine/math.js';
import { view, ctx, setT, baseT, addShake, flash, hitstop } from '../engine/renderer.js';
import { fx } from '../engine/particles.js';
import { glow, sprite } from '../engine/sprites.js';
import { blobPath, starPath, polyPath, tentacle, eye, bodyGrad, heartPath } from './art.js';
import { aimed, ring, fan, shoot, flower } from './patterns.js';
import { explode, bossBoom, deflect } from './fx.js';
import { sfx } from '../audio/sfx.js';
import { BOSS_ART, buildBossArt, drawWound, drawReactor } from './bossart.js';
import './bossart2.js';

const PART_NAMES = { cannon: 'Canon', arm: 'Bras', shell: 'Carapace', pod: 'Couveuse', segment: 'Anneau', core: 'Noyau' };
const WOUND = { cannon: 'geyser', arm: 'acidRain', shell: 'organSpiral', pod: 'sporeMines', segment: 'segBurst' };
const WOUND_MSG = {
  geyser: 'La plaie crache un geyser !',
  acidRain: 'Une pluie d’acide jaillit du moignon !',
  organSpiral: 'Les organes à nu tirent en spirale !',
  sporeMines: 'Des spores mines s’échappent !',
  segBurst: 'Le ver se tord de rage !',
};

// ---------- Attaques ----------
const ATT = {
  aimedBurst(b, g, s, l) { aimed(g, s.x, s.y, 160 + l * 10, 3 + Math.floor(l), 0.15); },
  slowRing(b, g, s, l) { ring(g, s.x, s.y, 12 + b.tier * 2 + Math.floor(l * 2), 85, rand(TAU), b.t % 2 < 1 ? 'big' : 'orb'); },
  tentacleSweep(b, g, s, l) { const n = 8 + Math.floor(l * 2), base = Math.PI / 2 + rand(-0.3, 0.3); for (let i = 0; i < n; i++) g.later(i * 0.07, () => shoot(g, s.part ? s.part.x : s.x, s.part ? s.part.y : s.y, base - 0.9 + (i / n) * 1.8, 150, 'needle')); },
  clawSnap(b, g, s, l) {
    s.part.data.snaps = (s.part.data.snaps || 0) + 1;
    if (s.part.data.snaps % 3 === 0) g.addLaser(s.x, s.y, angTo(s.x, s.y, g.player.x, g.player.y), 0.9, 0.9, 16, g.pal.bullet);
    else aimed(g, s.x, s.y, 190, 5, 0.17, 'needle');
  },
  petalShot(b, g, s, l) { const a = Math.atan2(s.part.oy, s.part.ox); fan(g, s.x, s.y, a, 3, 0.4, 125, 'petal'); },
  stamenSpray(b, g, s, l) { aimed(g, s.x, s.y, 170, 3, 0.22); },
  vineWhip(b, g, s, l) { const base = angTo(s.x, s.y, g.player.x, g.player.y) - 0.5; for (let i = 0; i < 9; i++) g.later(i * 0.05, () => shoot(g, s.part.x, s.part.y, base + i * 0.12, 140 + i * 8, 'orb')); },
  lashSweep(b, g, s, l) { for (let i = 0; i < 7; i++) g.later(i * 0.08, () => g.spawnEB(s.part.x + rand(-6, 6), s.part.y, rand(-40, 40), 40, 'drop')); },
  wingShards(b, g, s, l) { fan(g, s.x, s.y, Math.PI / 2 + (s.part.ox < 0 ? 0.25 : -0.25), 5 + Math.floor(l), 1.1, 150, 'shard'); },
  scytheSlash(b, g, s, l) { const base = angTo(s.x, s.y, g.player.x, g.player.y), n = 11, dir = s.part.ox < 0 ? 1 : -1; for (let i = 0; i < n; i++) g.later(i * 0.035, () => shoot(g, s.part.x, s.part.y, base - dir * 0.8 + dir * (i / (n - 1)) * 1.6, 170, 'needle')); },
  segRing(b, g, s, l) { ring(g, s.x, s.y, 6, 100, rand(TAU)); },
  tailSpread(b, g, s, l) { aimed(g, s.x, s.y, 170, 7, 0.14, 'needle'); },
  summon(b, g, s, l) { for (let i = 0; i < 3; i++) { const k = g.addEnemy('larve', s.x + rand(-10, 10), s.y + rand(-10, 10), { k: 'none' }, { child: true }); } fx.ring(s.x, s.y, 4, 30, 0.35, g.pal.eglow, 2); },
  // Blessures
  geyser(b, g, s) { for (let i = 0; i < 6; i++) g.spawnEB(s.x, s.y, rand(-110, 110), rand(-210, -130), 'drop'); },
  acidRain(b, g, s) { for (let i = 0; i < 4; i++) g.later(i * 0.12, () => g.spawnEB(s.x + rand(-8, 8), s.y, rand(-60, 60), rand(20, 60), 'drop')); },
  organSpiral(b, g, s) { let a = rand(TAU); for (let i = 0; i < 14; i++) g.later(i * 0.07, () => { shoot(g, b.x + s.ox * b.sc, b.y + s.oy * b.sc, a, 120); a += 0.45; }); },
  sporeMines(b, g, s) { const k = g.addEnemy('spore', s.x, s.y, { k: 'free' }, { child: true }); k.fvx = rand(-60, 60); k.fvy = rand(40, 80); },
  segBurst(b, g, s) { ring(g, s.x, s.y, 10, 120, rand(TAU), 'needle'); },
  // Cœur / noyau
  spiral3(b, g, s, l) { let a = rand(TAU); const arms = 3 + (l > 1.5 ? 1 : 0); for (let i = 0; i < 22; i++) g.later(i * 0.1, () => { if (b.dead) return; for (let k = 0; k < arms; k++) shoot(g, b.cx(), b.cy(), a + (k / arms) * TAU, 125); a += 0.23; }); },
  flowerRing(b, g, s, l) { for (let i = 0; i < 3; i++) g.later(i * 0.45, () => { if (!b.dead) flower(g, b.cx(), b.cy(), 16 + b.tier * 2, 135, i * 0.2); }); },
  laserFan(b, g, s, l) { const a = angTo(b.cx(), b.cy(), g.player.x, g.player.y); for (const o of [-0.4, 0, 0.4]) g.addLaser(b.cx(), b.cy(), a + o, 1.0, 0.8, 14, g.pal.bullet); },
  bubbleSpray(b, g, s, l) { for (let i = 0; i < 18; i++) g.later(i * 0.06, () => { if (!b.dead) shoot(g, b.cx(), b.cy(), Math.PI / 2 + rand(-1, 1), rand(90, 170), i % 3 ? 'orb' : 'big'); }); },
  rain(b, g, s, l) { for (let i = 0; i < 12 + b.tier * 3; i++) g.later(i * 0.09, () => g.spawnEB(rand(20, view.w - 20), view.safeT - 10, 0, rand(120, 180), 'needle')); },
  crossLaser(b, g, s, l) { const a0 = rand(TAU); for (let k = 0; k < 4; k++) g.addLaser(b.cx(), b.cy(), a0 + (k * Math.PI) / 2, 1.1, 1.0, 14, g.pal.bullet, 0.6); },
  rage(b, g, s, l) { ATT.spiral3(b, g, s, 2); g.later(1.2, () => !b.dead && aimed(g, b.cx(), b.cy(), 200, 5, 0.12, 'needle')); },
  eyeLaser(b, g, s, l) { g.addLaser(s.x, s.y, angTo(s.x, s.y, g.player.x, g.player.y), 0.9, 1.0, 20, g.pal.bullet); },
};

// ---------- Archétypes ----------
function P(kind, ox, oy, r, hp, att, rate, extra) { return Object.assign({ kind, ox, oy, bx: ox, by: oy, r, hp, max: hp, att, rate, alive: true, flash: 0, cd: rand(0.8, 2.2) + (rate || 0) * 0.3, data: {}, isPart: true, x: 0, y: 0 }, extra || {}); }

const ARCH = {
  jelly: {
    build(b) {
      b.add(P('core', 0, -6, 26, 900, null));
      b.add(P('shell', -52, -26, 34, 420, 'slowRing', 3.6, { shield: true }));
      b.add(P('shell', 52, -26, 34, 420, 'slowRing', 3.6, { shield: true }));
      b.add(P('cannon', -26, -62, 15, 220, 'aimedBurst', 2.3));
      b.add(P('cannon', 26, -62, 15, 220, 'aimedBurst', 2.3));
      [-66, -24, 24, 66].forEach((x, i) => b.add(P('arm', x, 46, 15, 260, 'tentacleSweep', 3.2, { i })));
      b.coreAtt = ['spiral3', 'flowerRing', 'laserFan', 'rage'];
    },
    layout(b, t) { for (const p of b.parts) if (p.kind === 'arm') { p.ox = p.bx + Math.sin(t * 1.4 + p.i) * 7; p.oy = p.by + Math.sin(t * 2 + p.i) * 5; } },
    draw(c, b, t) {
      const C = b.col;
      for (const p of b.parts) if (p.kind === 'arm') {
        c.fillStyle = p.alive ? rgba(C.c2, 0.8) : rgba(C.c2, 0.5);
        tentacle(c, p.ox, p.oy - 10, Math.PI / 2 + (p.ox / 200), p.alive ? 130 : 24, p.alive ? 9 : 7, t * 1.3, p.i * 1.7, 0.32, 9); c.fill();
        if (p.alive) { c.fillStyle = bodyGrad(c, C.c2, 16, 'ja'); c.beginPath(); c.arc(p.ox, p.oy, 14, 0, TAU); c.fill(); }
      }
      const pul = 1 + Math.sin(t * 2.4) * 0.03 + b.beat * 0.04;
      c.save(); c.scale(pul, pul);
      c.beginPath(); c.moveTo(-98, 34);
      c.bezierCurveTo(-104, -112, 104, -112, 98, 34);
      for (let i = 0; i <= 12; i++) c.lineTo(98 - (i / 12) * 196, 34 + (i % 2 ? 14 : 0) + Math.sin(t * 3 + i) * 3);
      c.closePath();
      const gr = c.createRadialGradient(0, -40, 10, 0, -10, 120);
      gr.addColorStop(0, rgba(lighten(C.c1, 0.5), 0.95)); gr.addColorStop(0.6, rgba(C.c1, 0.8)); gr.addColorStop(1, rgba(darken(C.c1, 0.5), 0.9));
      c.fillStyle = gr; c.fill(); c.strokeStyle = C.cg; c.lineWidth = 3; c.stroke();
      c.strokeStyle = rgba(lighten(C.c1, 0.6), 0.35); c.lineWidth = 1.5;
      for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(i * 12, -88); c.quadraticCurveTo(i * 26, -30, i * 28, 34); c.stroke(); }
      c.restore();
      for (const p of b.parts) if (p.kind === 'shell') {
        if (p.alive) {
          c.save(); c.translate(p.ox, p.oy); c.scale(p.ox < 0 ? 1 : -1, 1);
          c.beginPath(); c.moveTo(-30, 40); c.bezierCurveTo(-46, -10, -20, -48, 22, -40); c.quadraticCurveTo(6, 0, 18, 40); c.closePath();
          c.fillStyle = bodyGrad(c, C.c2, 40, 'jsh'); c.fill(); c.strokeStyle = lighten(C.c2, 0.6); c.lineWidth = 2; c.stroke();
          c.strokeStyle = rgba('#ffffff', 0.35); for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(-24 + k * 6, 30); c.quadraticCurveTo(-30 + k * 10, -10, 10 + k * 3, -34); c.stroke(); }
          c.restore();
        } else b.wound(c, p, t);
      }
      for (const p of b.parts) if (p.kind === 'cannon') { if (p.alive) { const [lx, ly] = b.lookFrom(p); eye(c, p.ox, p.oy, 14, lx, ly, C.cg, 1); } else b.wound(c, p, t); }
    },
  },
  crab: {
    build(b) {
      b.add(P('core', 0, 42, 24, 950, null));
      b.add(P('shell', -44, -4, 32, 450, 'slowRing', 3.8, { shield: true }));
      b.add(P('shell', 44, -4, 32, 450, 'slowRing', 3.8, { shield: true }));
      b.add(P('cannon', -50, -48, 14, 200, 'aimedBurst', 2.2));
      b.add(P('cannon', 0, -62, 14, 200, 'aimedBurst', 2.6));
      b.add(P('cannon', 50, -48, 14, 200, 'aimedBurst', 2.2));
      b.add(P('arm', -112, 40, 26, 380, 'clawSnap', 2.8, { i: 0 }));
      b.add(P('arm', 112, 40, 26, 380, 'clawSnap', 2.8, { i: 1 }));
      b.coreAtt = ['bubbleSpray', 'flowerRing', 'rain', 'rage'];
    },
    layout(b, t) { for (const p of b.parts) if (p.kind === 'arm') { p.ox = p.bx + Math.sin(t * 1.2 + p.i * 2) * 8; p.oy = p.by + Math.cos(t * 1.6 + p.i) * 10; } },
    draw(c, b, t) {
      const C = b.col;
      c.strokeStyle = C.cg; c.lineWidth = 5; c.lineCap = 'round';
      for (let i = 0; i < 3; i++) for (const s of [-1, 1]) {
        const k = Math.sin(t * 5 + i * 1.3 + (s > 0 ? 1 : 0)) * 6;
        c.beginPath(); c.moveTo(s * 70, -20 + i * 22); c.lineTo(s * 118, -40 + i * 24 + k); c.lineTo(s * 132, 6 + i * 26 + k); c.stroke();
      }
      for (const p of b.parts) if (p.kind === 'arm') {
        const s = p.ox < 0 ? -1 : 1;
        c.strokeStyle = darken(C.c1, 0.2); c.lineWidth = 12;
        c.beginPath(); c.moveTo(s * 80, 18); c.quadraticCurveTo(s * 100, 60, p.ox, p.oy); c.stroke();
        if (p.alive) {
          const op = 0.3 + 0.25 * Math.abs(Math.sin(t * 3 + p.i));
          c.save(); c.translate(p.ox, p.oy); c.rotate(s * 0.3);
          for (const k of [-1, 1]) {
            c.save(); c.rotate(k * op);
            c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(k * 26, 18, k * 8, 50); c.quadraticCurveTo(k * 4, 22, 0, 0); c.closePath();
            c.fillStyle = bodyGrad(c, C.c1, 40, 'cl'); c.fill(); c.strokeStyle = C.cg; c.lineWidth = 2; c.stroke();
            c.restore();
          }
          c.beginPath(); c.arc(0, 0, 22, 0, TAU); c.fillStyle = bodyGrad(c, C.c1, 24, 'clb'); c.fill(); c.strokeStyle = C.cg; c.lineWidth = 2; c.stroke();
          c.restore();
        } else b.wound(c, p, t);
      }
      c.beginPath();
      c.moveTo(-100, 10); c.quadraticCurveTo(-96, -60, -40, -74); c.quadraticCurveTo(0, -84, 40, -74); c.quadraticCurveTo(96, -60, 100, 10); c.quadraticCurveTo(80, 62, 0, 66); c.quadraticCurveTo(-80, 62, -100, 10); c.closePath();
      c.fillStyle = bodyGrad(c, C.c1, 110, 'cb'); c.fill(); c.strokeStyle = C.cg; c.lineWidth = 3; c.stroke();
      c.strokeStyle = rgba('#ffffff', 0.18); c.lineWidth = 2;
      for (let i = 1; i < 4; i++) { c.beginPath(); c.ellipse(0, -10, 90 - i * 20, 60 - i * 12, 0, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); }
      for (const p of b.parts) if (p.kind === 'shell') {
        if (p.alive) { c.save(); c.translate(p.ox, p.oy); polyPath(c, 6, 32, 0.5); c.fillStyle = bodyGrad(c, C.c2, 34, 'csh'); c.fill(); c.strokeStyle = lighten(C.c2, 0.6); c.lineWidth = 2; c.stroke(); polyPath(c, 6, 18, 0.5); c.strokeStyle = rgba('#ffffff', 0.4); c.stroke(); c.restore(); }
        else b.wound(c, p, t);
      }
      for (const p of b.parts) if (p.kind === 'cannon') {
        if (p.alive) {
          const a = angTo(b.x + p.ox * b.sc, b.y + p.oy * b.sc, b.g.player.x, b.g.player.y);
          c.save(); c.translate(p.ox, p.oy); c.rotate(a - Math.PI / 2);
          c.fillStyle = C.c2; c.fillRect(-4, 0, 8, 22);
          c.beginPath(); c.arc(0, 0, 13, 0, TAU); c.fillStyle = bodyGrad(c, darken(C.c1, 0.2), 13, 'cc'); c.fill(); c.strokeStyle = C.cg; c.lineWidth = 2; c.stroke();
          c.restore();
        } else b.wound(c, p, t);
      }
      for (const s of [-1, 1]) { c.strokeStyle = C.cg; c.lineWidth = 3; c.beginPath(); c.moveTo(s * 18, 30); c.lineTo(s * 24, 10); c.stroke(); const [lx, ly] = b.lookFrom({ ox: s * 24, oy: 8 }); eye(c, s * 24, 8, 9, lx, ly, '#ff3f6e', 1); }
    },
  },
  flower: {
    build(b) {
      b.add(P('core', 0, 0, 26, 900, null));
      for (let i = 0; i < 6; i++) b.add(P('shell', 0, 0, 24, 220, 'petalShot', 2.8, { shield: true, i, ang: (i / 6) * TAU }));
      for (let i = 0; i < 3; i++) b.add(P('cannon', 0, 0, 11, 160, 'stamenSpray', 2.6, { i, ang: (i / 3) * TAU + 0.5 }));
      b.add(P('arm', -88, 62, 16, 260, 'vineWhip', 3.2, { i: 0 }));
      b.add(P('arm', 88, 62, 16, 260, 'vineWhip', 3.2, { i: 1 }));
      b.coreAtt = ['flowerRing', 'spiral3', 'rain', 'rage'];
    },
    layout(b, t) {
      for (const p of b.parts) {
        if (p.kind === 'shell') { const a = p.ang + t * 0.35; p.ox = Math.cos(a) * 64; p.oy = Math.sin(a) * 64; }
        else if (p.kind === 'cannon') { const a = p.ang - t * 0.6; p.ox = Math.cos(a) * 34; p.oy = Math.sin(a) * 34; }
        else if (p.kind === 'arm') { p.ox = p.bx + Math.sin(t * 1.5 + p.i * 3) * 14; p.oy = p.by + Math.cos(t * 1.1 + p.i) * 10; }
      }
    },
    draw(c, b, t) {
      const C = b.col;
      for (const p of b.parts) if (p.kind === 'arm') {
        const s = p.ox < 0 ? -1 : 1;
        c.strokeStyle = darken(C.c2, 0.25); c.lineWidth = p.alive ? 10 : 7;
        c.beginPath(); c.moveTo(s * 30, 30); c.bezierCurveTo(s * 70, 20, s * 40, 90, p.ox, p.oy); c.stroke();
        if (p.alive) {
          c.fillStyle = C.c2; for (let k = 0; k < 4; k++) { const u = 0.2 + k * 0.2; const x = s * 30 + (p.ox - s * 30) * u, y = 30 + (p.oy - 30) * u; c.beginPath(); c.moveTo(x, y); c.lineTo(x + s * 8, y - 8); c.lineTo(x + 3, y + 2); c.fill(); }
          c.beginPath(); c.arc(p.ox, p.oy, 15, 0, TAU); c.fillStyle = bodyGrad(c, C.c2, 16, 'fv'); c.fill(); c.strokeStyle = C.cg; c.lineWidth = 2; c.stroke();
        } else b.wound(c, p, t);
      }
      for (const p of b.parts) if (p.kind === 'shell') {
        const a = Math.atan2(p.oy, p.ox);
        if (p.alive) {
          c.save(); c.rotate(a);
          c.beginPath(); c.ellipse(52, 0, 46, 26, 0, 0, TAU);
          const gr = c.createLinearGradient(10, 0, 98, 0);
          gr.addColorStop(0, darken(C.c1, 0.3)); gr.addColorStop(0.6, C.c1); gr.addColorStop(1, lighten(C.c1, 0.5));
          c.fillStyle = gr; c.fill(); c.strokeStyle = C.cg; c.lineWidth = 2; c.stroke();
          c.strokeStyle = rgba('#ffffff', 0.3); c.lineWidth = 1.2; c.beginPath(); c.moveTo(14, 0); c.lineTo(92, 0); c.stroke();
          c.restore();
        } else b.wound(c, p, t);
      }
      c.beginPath(); c.arc(0, 0, 44, 0, TAU); c.fillStyle = bodyGrad(c, C.c2, 46, 'fd'); c.fill(); c.strokeStyle = C.cg; c.lineWidth = 3; c.stroke();
      for (const p of b.parts) if (p.kind === 'cannon') {
        if (p.alive) { c.strokeStyle = lighten(C.c2, 0.5); c.lineWidth = 3; c.beginPath(); c.moveTo(0, 0); c.lineTo(p.ox, p.oy); c.stroke(); c.beginPath(); c.arc(p.ox, p.oy, 10, 0, TAU); c.fillStyle = '#fff6c8'; c.fill(); c.strokeStyle = C.cg; c.lineWidth = 2; c.stroke(); }
        else b.wound(c, p, t);
      }
    },
    drawCore(c, b, p, t) {
      const open = b.coreOpen ? 0.5 + 0.5 * Math.abs(Math.sin(t * 4)) : 0.15;
      c.fillStyle = '#20000a'; c.beginPath(); c.arc(0, 0, 24 * (0.5 + open * 0.5), 0, TAU); c.fill();
      c.fillStyle = '#fff';
      for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU + t * 0.5; const r1 = 24, r2 = 24 * (1 - open * 0.5); c.beginPath(); c.moveTo(Math.cos(a - 0.15) * r1, Math.sin(a - 0.15) * r1); c.lineTo(Math.cos(a) * r2 * 0.6, Math.sin(a) * r2 * 0.6); c.lineTo(Math.cos(a + 0.15) * r1, Math.sin(a + 0.15) * r1); c.fill(); }
    },
  },
  eye: {
    build(b) {
      b.add(P('core', 0, 0, 30, 1000, null));
      b.add(P('shell', 0, -40, 32, 420, 'slowRing', 3.6, { shield: true, top: true }));
      b.add(P('shell', 0, 40, 32, 420, 'slowRing', 3.6, { shield: true, top: false }));
      for (let i = 0; i < 4; i++) b.add(P('cannon', 0, 0, 14, 200, 'aimedBurst', 2.6, { i, ang: (i / 4) * TAU }));
      b.add(P('arm', -96, 0, 16, 260, 'lashSweep', 2.8, { i: 0 }));
      b.add(P('arm', 96, 0, 16, 260, 'lashSweep', 2.8, { i: 1 }));
      b.coreAtt = ['eyeLaserCore', 'spiral3', 'crossLaser', 'rage'];
    },
    layout(b, t) {
      for (const p of b.parts) {
        if (p.kind === 'cannon') { const a = p.ang + t * 0.7; p.ox = Math.cos(a) * 118; p.oy = Math.sin(a) * 70; }
        else if (p.kind === 'arm') { p.ox = p.bx + Math.sin(t * 1.3 + p.i) * 8; p.oy = p.by + Math.sin(t * 2.1 + p.i * 2) * 26; }
      }
    },
    draw(c, b, t) {
      const C = b.col;
      for (const p of b.parts) if (p.kind === 'arm') {
        const s = p.ox < 0 ? -1 : 1;
        c.fillStyle = rgba(C.c2, 0.85);
        tentacle(c, s * 60, 0, s > 0 ? 0 : Math.PI, Math.abs(p.ox) - 50, 9, t, p.i * 2, 0.25, 6); c.fill();
        if (p.alive) { c.fillStyle = C.c2; tentacle(c, p.ox, p.oy, s > 0 ? 0.3 : Math.PI - 0.3, 60, 6, t * 1.4, p.i, 0.5, 6); c.fill(); c.beginPath(); c.arc(p.ox, p.oy, 14, 0, TAU); c.fillStyle = bodyGrad(c, C.c2, 15, 'el'); c.fill(); }
        else b.wound(c, p, t);
      }
      for (const p of b.parts) if (p.kind === 'cannon') {
        c.strokeStyle = rgba(C.cg, 0.5); c.lineWidth = 2; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(p.ox * 0.5, p.oy * 0.5 - 30, p.ox, p.oy); c.stroke();
        if (p.alive) { c.save(); c.translate(p.ox, p.oy); blobPath(c, 14, 14, t * 2 + p.i, 0.12, 8, p.i); c.fillStyle = bodyGrad(c, C.c1, 14, 'ep'); c.fill(); c.strokeStyle = C.cg; c.lineWidth = 1.5; c.stroke(); const [lx, ly] = b.lookFrom(p); eye(c, 0, 0, 7, lx, ly, C.cg, 1); c.restore(); }
        else b.wound(c, p, t);
      }
      c.beginPath(); c.arc(0, 0, 74, 0, TAU);
      const gr = c.createRadialGradient(-20, -25, 10, 0, 0, 78);
      gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.7, '#e8dcf0'); gr.addColorStop(1, darken(C.c1, 0.3));
      c.fillStyle = gr; c.fill();
      c.strokeStyle = rgba('#d02040', 0.55); c.lineWidth = 1.4;
      for (let i = 0; i < 9; i++) { const a = (i / 9) * TAU + 0.2; c.beginPath(); c.moveTo(Math.cos(a) * 72, Math.sin(a) * 72); c.quadraticCurveTo(Math.cos(a + 0.2) * 55, Math.sin(a + 0.2) * 55, Math.cos(a - 0.1) * 40, Math.sin(a - 0.1) * 40); c.stroke(); }
      c.strokeStyle = C.cg; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, 74, 0, TAU); c.stroke();
    },
    drawCore(c, b, p, t) {
      const [lx, ly] = b.lookFrom(p);
      const ix = lx * 22, iy = ly * 22;
      c.fillStyle = bodyGrad(c, b.col.cg, 34, 'eir'); c.beginPath(); c.arc(ix, iy, 34, 0, TAU); c.fill();
      c.strokeStyle = rgba('#000000', 0.35); c.lineWidth = 1;
      for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU; c.beginPath(); c.moveTo(ix + Math.cos(a) * 14, iy + Math.sin(a) * 14); c.lineTo(ix + Math.cos(a) * 32, iy + Math.sin(a) * 32); c.stroke(); }
      c.fillStyle = '#05020f'; c.beginPath(); c.ellipse(ix, iy, 9 + (b.coreOpen ? 4 * Math.sin(t * 6) : 0), 15, 0, 0, TAU); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(ix - 10, iy - 12, 5, 0, TAU); c.fill();
    },
    drawShell(c, b, p, t) {
      const top = p.top;
      c.beginPath();
      if (top) { c.moveTo(-76, 0); c.bezierCurveTo(-70, -96, 70, -96, 76, 0); c.bezierCurveTo(40, -8 - 10 * Math.sin(t * 2), -40, -8 - 10 * Math.sin(t * 2), -76, 0); }
      else { c.moveTo(-76, 0); c.bezierCurveTo(-70, 96, 70, 96, 76, 0); c.bezierCurveTo(40, 8 + 10 * Math.sin(t * 2), -40, 8 + 10 * Math.sin(t * 2), -76, 0); }
      c.closePath();
      c.fillStyle = bodyGrad(c, b.col.c1, 80, 'elid'); c.fill(); c.strokeStyle = b.col.cg; c.lineWidth = 2.5; c.stroke();
      c.strokeStyle = '#fff'; c.lineWidth = 2;
      for (let i = -3; i <= 3; i++) { const x = i * 18; c.beginPath(); c.moveTo(x, top ? -10 : 10); c.lineTo(x * 1.2, top ? -2 : 2); c.stroke(); }
    },
  },
  mantis: {
    build(b) {
      b.add(P('core', 0, 52, 22, 900, null));
      b.add(P('shell', -64, -30, 34, 380, 'wingShards', 3.2, { shield: true }));
      b.add(P('shell', 64, -30, 34, 380, 'wingShards', 3.2, { shield: true }));
      b.add(P('cannon', -22, -72, 13, 180, 'aimedBurst', 2.2));
      b.add(P('cannon', 22, -72, 13, 180, 'aimedBurst', 2.2));
      b.add(P('arm', -72, 38, 20, 320, 'scytheSlash', 2.9, { i: 0 }));
      b.add(P('arm', 72, 38, 20, 320, 'scytheSlash', 2.9, { i: 1 }));
      b.coreAtt = ['laserFan', 'spiral3', 'flowerRing', 'rage'];
    },
    layout(b, t) { for (const p of b.parts) if (p.kind === 'arm') { p.ox = p.bx + Math.sin(t * 2 + p.i * 3) * 6; p.oy = p.by + Math.sin(t * 2.5 + p.i) * 12; } },
    draw(c, b, t) {
      const C = b.col;
      for (const p of b.parts) if (p.kind === 'shell') {
        if (p.alive) {
          const s = p.ox < 0 ? -1 : 1, f = Math.sin(t * 9) * 0.06;
          c.save(); c.translate(s * 20, -20); c.rotate(s * (-0.5 + f));
          c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(s * 40, -70, s * 90, -40); c.quadraticCurveTo(s * 70, 10, 0, 20); c.closePath();
          c.fillStyle = rgba(lighten(C.c2, 0.3), 0.55); c.fill(); c.strokeStyle = lighten(C.c2, 0.6); c.lineWidth = 2; c.stroke();
          c.strokeStyle = rgba('#ffffff', 0.4); c.lineWidth = 1; for (let k = 1; k < 4; k++) { c.beginPath(); c.moveTo(0, 8); c.lineTo(s * (25 + k * 18), -30 - k * 6); c.stroke(); }
          c.restore();
        } else b.wound(c, p, t);
      }
      for (let i = 0; i < 4; i++) { c.beginPath(); c.ellipse(0, -70 + i * 22, 20 - i * 1.5, 16, 0, 0, TAU); c.fillStyle = bodyGrad(c, C.c1, 22, 'ma' + i); c.fill(); c.strokeStyle = C.cg; c.lineWidth = 2; c.stroke(); }
      c.beginPath(); c.ellipse(0, 22, 18, 30, 0, 0, TAU); c.fillStyle = bodyGrad(c, C.c1, 30, 'mt'); c.fill(); c.stroke();
      for (const p of b.parts) if (p.kind === 'cannon') { if (p.alive) { c.save(); c.translate(p.ox, p.oy); starPath(c, 3, 16, 6, p.ox < 0 ? -0.3 : 0.3, false); c.fillStyle = C.c2; c.fill(); c.strokeStyle = C.cg; c.lineWidth = 1.5; c.stroke(); c.restore(); } else b.wound(c, p, t); }
      for (const p of b.parts) if (p.kind === 'arm') {
        const s = p.ox < 0 ? -1 : 1;
        c.strokeStyle = C.c1; c.lineWidth = 9; c.lineCap = 'round';
        c.beginPath(); c.moveTo(s * 14, 10); c.lineTo(p.ox, p.oy - 20); c.stroke();
        if (p.alive) {
          c.save(); c.translate(p.ox, p.oy - 20); c.rotate(s * (0.4 + Math.sin(t * 2.5 + p.i) * 0.35));
          c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(s * 40, 20, s * 18, 70); c.quadraticCurveTo(s * 22, 30, 0, 8); c.closePath();
          c.fillStyle = lighten(C.c2, 0.4); c.fill(); c.strokeStyle = '#ffffff'; c.lineWidth = 2; c.stroke();
          c.restore();
        } else b.wound(c, p, t);
      }
    },
    drawCore(c, b, p, t) {
      const C = b.col;
      c.beginPath(); c.moveTo(-26, -10); c.lineTo(26, -10); c.lineTo(0, 30); c.closePath();
      c.fillStyle = bodyGrad(c, C.c1, 28, 'mh'); c.fill(); c.strokeStyle = C.cg; c.lineWidth = 2; c.stroke();
      c.fillStyle = C.cg; c.beginPath(); c.ellipse(-12, -2, 9, 6, 0.5, 0, TAU); c.ellipse(12, -2, 9, 6, -0.5, 0, TAU); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(-13, -4, 2, 0, TAU); c.arc(11, -4, 2, 0, TAU); c.fill();
    },
  },
  worm: {
    build(b) {
      b.add(P('core', 0, 0, 24, 950, null));
      const n = 7;
      for (let i = 1; i <= n; i++) b.add(P('segment', 0, -i * 30, 17, 210, 'segRing', 3.4, { i }));
      b.add(P('arm', 0, -(n + 1) * 30, 15, 280, 'tailSpread', 2.6, { i: n + 1, tail: true }));
      b.hist = [];
      b.coreAtt = ['spiral3', 'bubbleSpray', 'flowerRing', 'rage'];
      b.coreNeeds = 0.6;
    },
    move(b, dt, t) {
      const W = view.w;
      const sp = 1 + b.rage * 0.08;
      b.mt = (b.mt || 0) + dt * sp;
      b.x = W / 2 + Math.sin(b.mt * 0.75) * W * 0.3;
      b.y = b.ty + Math.sin(b.mt * 1.5) * 55 + 20;
      b.hist.push(b.x, b.y);
      if (b.hist.length > 2400) b.hist.splice(0, 2);
    },
    layout(b, t) {
      const h = b.hist;
      let idx = 0;
      for (const p of b.parts) {
        if (p.kind === 'core') continue;
        if (!p.alive && !p.tail) continue;
        idx++;
        let need = idx * 30, i = h.length - 2, px = b.x, py = b.y;
        while (i >= 2 && need > 0) { const dx = h[i] - px, dy = h[i + 1] - py; const l = Math.hypot(dx, dy); need -= l; px = h[i]; py = h[i + 1]; i -= 2; }
        if (need > 0) py -= need;
        p.ox = (px - b.x) / b.sc; p.oy = (py - b.y) / b.sc;
      }
    },
    draw(c, b, t) {
      const C = b.col;
      const segs = b.parts.filter((p) => p.kind !== 'core' && (p.alive || p.tail));
      c.strokeStyle = rgba(C.c2, 0.6); c.lineWidth = 16; c.lineCap = 'round';
      c.beginPath(); c.moveTo(0, 0); for (const p of segs) c.lineTo(p.ox, p.oy); c.stroke();
      for (let k = segs.length - 1; k >= 0; k--) {
        const p = segs[k];
        if (p.tail) {
          if (p.alive) { c.save(); c.translate(p.ox, p.oy); const prev = k > 0 ? segs[k - 1] : { ox: 0, oy: 0 }; c.rotate(Math.atan2(p.oy - prev.oy, p.ox - prev.ox) - Math.PI / 2); c.beginPath(); c.moveTo(-12, -6); c.lineTo(0, 34); c.lineTo(12, -6); c.closePath(); c.fillStyle = lighten(C.c2, 0.3); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 2; c.stroke(); c.restore(); }
          else b.wound(c, p, t);
          continue;
        }
        c.save(); c.translate(p.ox, p.oy);
        c.fillStyle = C.cg;
        c.beginPath(); c.moveTo(-14, 0); c.lineTo(-27, -6); c.lineTo(-12, -10); c.moveTo(14, 0); c.lineTo(27, -6); c.lineTo(12, -10); c.fill();
        c.beginPath(); c.arc(0, 0, 18, 0, TAU); c.fillStyle = bodyGrad(c, C.c1, 18, 'ws'); c.fill(); c.strokeStyle = C.cg; c.lineWidth = 2; c.stroke();
        c.fillStyle = rgba(C.c2, 0.7 + 0.3 * Math.sin(t * 5 + p.i)); c.beginPath(); c.arc(0, 0, 7, 0, TAU); c.fill();
        c.restore();
      }
    },
    drawCore(c, b, p, t) {
      const C = b.col, m = Math.sin(t * 7) * 0.25;
      c.strokeStyle = C.cg; c.lineWidth = 5; c.lineCap = 'round';
      c.beginPath(); c.moveTo(-14, 16); c.quadraticCurveTo(-30, 34, -12 + m * 10, 44); c.moveTo(14, 16); c.quadraticCurveTo(30, 34, 12 - m * 10, 44); c.stroke();
      c.beginPath(); c.ellipse(0, 4, 28, 30, 0, 0, TAU); c.fillStyle = bodyGrad(c, C.c1, 30, 'wh'); c.fill(); c.lineWidth = 2.5; c.stroke();
      const [lx, ly] = b.lookFrom(p);
      eye(c, -12, 10, 8, lx, ly, '#ffd23f', 1); eye(c, 12, 10, 8, lx, ly, '#ffd23f', 1);
    },
  },
  heart: {
    build(b) {
      b.add(P('core', 0, 4, 34, 1700, null));
      b.add(P('shell', -60, 0, 36, 540, 'slowRing', 3.4, { shield: true }));
      b.add(P('shell', 60, 0, 36, 540, 'slowRing', 3.4, { shield: true }));
      [[-48, -62], [48, -62], [-44, 66], [44, 66]].forEach(([x, y]) => b.add(P('cannon', x, y, 15, 240, 'aimedBurst', 2.4)));
      [[-112, -24], [112, -24], [-96, 50], [96, 50]].forEach(([x, y], i) => b.add(P('arm', x, y, 16, 300, i < 2 ? 'tentacleSweep' : 'lashSweep', 3.0, { i })));
      b.add(P('pod', -128, -66, 18, 280, 'summon', 6));
      b.add(P('pod', 128, -66, 18, 280, 'summon', 6));
      b.coreAtt = ['spiral3', 'flowerRing', 'crossLaser', 'rain', 'rage'];
    },
    layout(b, t) { for (const p of b.parts) if (p.kind === 'arm' || p.kind === 'pod') { p.ox = p.bx + Math.sin(t * 1.3 + (p.i || 0) * 2) * 8; p.oy = p.by + Math.cos(t * 1.7 + (p.i || 0)) * 8; } },
    draw(c, b, t) {
      const C = b.col;
      for (const p of b.parts) if (p.kind === 'arm' || p.kind === 'pod') {
        c.strokeStyle = rgba(C.c2, 0.75); c.lineWidth = p.kind === 'pod' ? 6 : 10; c.lineCap = 'round';
        c.beginPath(); c.moveTo(p.ox * 0.45, p.oy * 0.45); c.quadraticCurveTo(p.ox * 0.8, p.oy * 0.6 - 20, p.ox, p.oy); c.stroke();
        if (p.alive) {
          if (p.kind === 'arm') { c.fillStyle = rgba(C.c2, 0.85); tentacle(c, p.ox, p.oy, p.ox < 0 ? Math.PI * 0.75 : Math.PI * 0.25, 70, 7, t, p.i, 0.45, 7); c.fill(); }
          c.save(); c.translate(p.ox, p.oy); blobPath(c, p.r, p.r, t * 2, 0.1, 8, p.i || 0); c.fillStyle = bodyGrad(c, p.kind === 'pod' ? C.c1 : C.c2, p.r, 'hp' + p.kind); c.fill(); c.strokeStyle = C.cg; c.lineWidth = 2; c.stroke();
          if (p.kind === 'pod') { c.fillStyle = rgba('#ffffff', 0.4 + 0.4 * Math.sin(t * 5)); c.beginPath(); c.arc(0, 0, 6, 0, TAU); c.fill(); }
          c.restore();
        } else b.wound(c, p, t);
      }
      const beat = 1 + b.beat * 0.07 + Math.sin(t * 3) * 0.02;
      c.save(); c.scale(beat, beat); c.translate(0, 8);
      heartPath(c, 92);
      const gr = c.createRadialGradient(-20, -30, 10, 0, 0, 110);
      gr.addColorStop(0, lighten(C.c1, 0.4)); gr.addColorStop(0.6, C.c1); gr.addColorStop(1, darken(C.c1, 0.6));
      c.fillStyle = gr; c.fill(); c.strokeStyle = C.cg; c.lineWidth = 3; c.stroke();
      c.strokeStyle = rgba(C.c2, 0.6); c.lineWidth = 2.5;
      for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(0, 10); c.bezierCurveTo(Math.cos(i) * 40, -40 + i * 8, Math.cos(i * 2) * 60, -10 + i * 10, Math.cos(i * 1.7) * 70, -50 + i * 14); c.stroke(); }
      c.restore();
      for (const p of b.parts) if (p.kind === 'shell') { if (p.alive) { c.save(); c.translate(p.ox, p.oy); blobPath(c, 34, 44, t, 0.06, 10, p.ox); c.fillStyle = rgba(lighten(C.c2, 0.2), 0.75); c.fill(); c.strokeStyle = lighten(C.c2, 0.6); c.lineWidth = 2.5; c.stroke(); c.restore(); } else b.wound(c, p, t); }
      for (const p of b.parts) if (p.kind === 'cannon') { if (p.alive) { const [lx, ly] = b.lookFrom(p); eye(c, p.ox, p.oy, 14, lx, ly, '#ff2a4a', 1); c.strokeStyle = C.cg; c.lineWidth = 2; c.beginPath(); c.arc(p.ox, p.oy, 15, 0, TAU); c.stroke(); } else b.wound(c, p, t); }
    },
  },
};
ATT.eyeLaserCore = (b, g, s, l) => { const a = angTo(b.cx(), b.cy(), g.player.x, g.player.y); g.addLaser(b.cx(), b.cy(), a, 0.85, 1.1, 24, g.pal.bullet); if (l > 1.4) g.later(1.2, () => !b.dead && g.addLaser(b.cx(), b.cy(), angTo(b.cx(), b.cy(), g.player.x, g.player.y), 0.7, 0.9, 20, g.pal.bullet)); };

export function prebakeBoss(g, arch, mini) {
  if (!BOSS_ART[arch]) return;
  try { buildBossArt(arch, { c1: g.pal.enemy, c2: g.pal.enemy2, cg: g.pal.eglow, dk: g.pal.edark }, clamp(view.rs * (mini ? 0.7 : 1), 1, 3)); } catch (e) { console.error(e); }
}

export class Boss {
  constructor(g, arch, o) {
    this.g = g;
    this.archId = ARCH[arch] ? arch : 'jelly';
    this.A = ARCH[this.archId];
    this.mini = !!o.mini; this.tier = o.tier || 0; this.name = o.name || 'Colosse';
    this.sc = this.mini ? 0.7 : 1;
    this.x = view.w / 2; this.y = -170;
    this.ty = view.safeT + 92 + (this.archId === 'worm' ? 40 : 108 * this.sc);
    this.t = 0; this.state = 'enter'; this.st = 0;
    this.parts = []; this.wounds = []; this.phase = 0; this.rage = 0; this.beat = 0;
    this.col = { c1: g.pal.enemy, c2: g.pal.enemy2, cg: g.pal.eglow, dk: g.pal.edark };
    this.coreAtt = ['spiral3'];
    this.coreCd = 3; this.coreIdx = 0; this.coreOpen = false; this.coreNeeds = 0.5;
    this.A.build(this);
    this.AA = BOSS_ART[this.archId] || null;
    if (this.AA) this.art = buildBossArt(this.archId, this.col, clamp(view.rs * this.sc, 1, 3));
    const hs = g.D.hp * (this.mini ? 0.5 : 1) * (1 + this.tier * 0.15) * (g.def.L > 300 ? 1.2 : 1);
    for (const p of this.parts) { p.hp = p.max = p.max * hs; p.boss = this; if (p.rate) p.rate *= 1 - this.tier * 0.07; }
    if (this.mini) this.parts = this.parts.filter((p, i) => p.kind !== 'arm' || i % 2 === 0 || this.archId === 'worm');
    this.core = this.parts.find((p) => p.kind === 'core');
    this.total = this.parts.reduce((a, p) => a + p.max, 0);
    this.dead = false;
    this.layout(0);
  }
  add(p) { p.name = PART_NAMES[p.kind]; this.parts.push(p); }
  cx() { return this.core.x; }
  cy() { return this.core.y; }
  lookFrom(p) { const px = this.x + p.ox * this.sc, py = this.y + p.oy * this.sc; const dx = this.g.player.x - px, dy = this.g.player.y - py; const l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; }
  hpFrac() { let h = 0; for (const p of this.parts) if (p.alive) h += Math.max(0, p.hp); return h / this.total; }
  layout(t) {
    if (this.A.layout) this.A.layout(this, t);
    for (const p of this.parts) { p.x = this.x + p.ox * this.sc; p.y = this.y + p.oy * this.sc; }
  }
  targetable(p) { return p.alive && this.state === 'fight' && (p !== this.core || this.coreOpen); }
  updateCoreOpen() {
    const others = this.parts.filter((p) => p.kind !== 'core');
    const shells = others.filter((p) => p.shield && p.alive).length;
    const dead = others.filter((p) => !p.alive).length;
    const open = shells === 0 && dead >= Math.ceil(others.length * this.coreNeeds);
    if (open && !this.coreOpen) {
      this.coreOpen = true;
      this.g.msg('NOYAU EXPOSÉ !', '#ffffff', 26);
      this.g.radio('core');
      sfx.roar();
    }
  }
  update(dt) {
    const g = this.g;
    this.t += dt; this.st += dt;
    this.beat = Math.max(0, this.beat - dt * 4);
    if (g.onBeat) this.beat = 1;
    if (this.state === 'enter') {
      const u = Math.min(1, this.st / 2.8);
      this.y = -170 + (this.ty + 170) * ease.outCubic(u);
      if (this.A.move) { this.hist && this.hist.push(this.x, this.y); }
      if (u >= 1) { this.state = 'fight'; this.st = 0; }
    } else if (this.state === 'fight') {
      if (this.A.move) this.A.move(this, dt, this.t);
      else {
        const mob = this.mini ? 0.3 : 0.2;
        this.x = view.w / 2 + Math.sin(this.t * 0.45) * view.w * mob;
        this.y = this.ty + Math.sin(this.t * 0.8) * 14;
        if (this.charge) {
          this.charge.t += dt;
          const k = this.charge.t < 0.6 ? 0 : this.charge.t < 1.2 ? ease.inCubic((this.charge.t - 0.6) / 0.6) : this.charge.t < 2 ? 1 - ease.outCubic((this.charge.t - 1.2) / 0.8) : 0;
          if (this.charge.t < 0.6) this.x += Math.sin(this.t * 60) * 3;
          this.y += k * (g.player.y - 200 - this.ty) * 0.6;
          if (this.charge.t > 2) this.charge = null;
        } else if (this.rage >= 3 && !this.mini && Math.random() < dt * 0.06) { this.charge = { t: 0 }; sfx.roar(); }
      }
      this.fight(dt);
    } else if (this.state === 'dying') {
      this.x += Math.sin(this.t * 50) * 1.5;
      this.dieT -= dt;
      if (Math.random() < dt * 14) {
        const p = this.parts[Math.floor(Math.random() * this.parts.length)];
        explode(p.x + rand(-20, 20), p.y + rand(-20, 20), 2, this.col.cg, this.col.c2);
      }
      if (this.dieT <= 0) {
        this.state = 'dead'; this.dead = true;
        bossBoom(this.cx(), this.cy(), this.col.cg, this.col.c2);
        for (const p of this.parts) explode(p.x, p.y, 3, this.col.c1, this.col.c2);
        g.bossDefeated(this);
      }
    }
    for (const p of this.parts) p.flash = Math.max(0, p.flash - dt);
    this.layout(this.t);
  }
  fight(dt) {
    const g = this.g;
    const fm = Math.max(0.38, g.D.fire) * (0.72 + 0.28 * Math.min(1, g.D.prog / 60)) * (1 + this.rage * 0.08);
    const lvl = 1 + this.rage * 0.15 + this.tier * 0.2;
    for (const p of this.parts) {
      if (!p.alive || !p.att || p.kind === 'core') continue;
      p.cd -= dt * fm;
      if (p.cd <= 0 && (g.onHalf || p.cd < -0.5)) {
        p.cd = p.rate * rand(0.85, 1.2);
        ATT[p.att](this, g, { x: p.x, y: p.y, part: p }, lvl);
      }
    }
    for (const w of this.wounds) {
      if (!w.att) continue;
      w.cd -= dt * fm;
      if (w.cd <= 0 && g.onHalf) {
        w.cd = rand(1.8, 2.8);
        const wx = this.x + w.ox * this.sc, wy = this.y + w.oy * this.sc;
        ATT[w.att](this, g, { x: wx, y: wy, ox: w.ox, oy: w.oy }, lvl);
      }
    }
    this.coreCd -= dt * fm;
    if (this.coreCd <= 0 && g.onBeat) {
      if (this.coreOpen) {
        const a = this.coreAtt[Math.min(this.coreAtt.length - 1, this.coreIdx % this.coreAtt.length)];
        this.coreIdx++;
        ATT[a](this, g, { x: this.cx(), y: this.cy() }, lvl + 0.5);
        this.coreCd = 3.4 - Math.min(1.2, this.rage * 0.1);
      } else {
        const a = this.coreAtt[Math.min(this.phase, this.coreAtt.length - 2) % this.coreAtt.length];
        if (this.phase >= 2 || this.mini === false && this.t > 4) ATT[this.phase >= 3 ? a : 'aimedBurst'](this, g, { x: this.cx(), y: this.cy(), part: this.core }, lvl);
        this.coreCd = 5.5;
      }
    }
  }
  hit(p, dmg, hx, hy) {
    if (!this.targetable(p)) {
      if (p === this.core && this.state === 'fight') { deflect(hx, hy); if (Math.random() < 0.15) sfx.ping(); }
      return false;
    }
    p.hp -= dmg;
    p.flash = 0.07;
    if (p.hp <= 0) this.destroyPart(p);
    return true;
  }
  destroyPart(p) {
    const g = this.g;
    p.alive = false; p.hp = 0;
    if (p === this.core) {
      this.state = 'dying'; this.dieT = 2.2; this.st = 0;
      g.slowmo(2.2, 0.35);
      g.cancelBullets(null, true);
      sfx.roar();
      return;
    }
    this.phase++; this.rage++;
    explode(p.x, p.y, 4, this.col.cg, this.col.c2);
    flash(this.col.cg, 0.35); hitstop(0.06);
    sfx.partBreak();
    g.spawnSalvage(p.x, p.y, Math.max(16, p.r), this.col, this.art);
    const w = WOUND[p.kind];
    this.wounds.push({ ox: p.ox, oy: p.oy, att: w, cd: 1.2, r: p.r, part: p });
    g.msg({ cannon: 'Canon détruit !', arm: 'Bras arraché !', shell: 'Carapace brisée !', pod: 'Couveuse crevée !', segment: 'Anneau détruit !' }[p.kind] || 'Partie détruite !', this.col.cg, 22);
    if (w && WOUND_MSG[w]) g.later(0.6, () => g.msg(WOUND_MSG[w], '#ffffff', 15, 1.8));
    if (p.kind === 'pod') ATT.summon(this, g, { x: p.x, y: p.y });
    if (p.kind === 'segment') ATT.segBurst(this, g, { x: p.x, y: p.y });
    g.dropCoins(p.x, p.y, 25 * g.D.loot);
    if (Math.random() < 0.5) g.dropPickup('energy', p.x, p.y);
    this.updateCoreOpen();
  }
  wound(c, p, t) {
    if (this.art) { drawWound(c, this, p, t); return; }
    const pul = 0.6 + 0.4 * Math.sin(t * 6 + p.ox);
    c.fillStyle = rgba(darken(this.col.c1, 0.6), 0.9);
    c.beginPath(); c.arc(p.ox, p.oy, p.r * 0.75, 0, TAU); c.fill();
    c.fillStyle = rgba(this.col.c2, 0.5 + 0.4 * pul);
    c.save(); c.translate(p.ox, p.oy); blobPath(c, p.r * 0.55, p.r * 0.45, t * 2 + p.ox, 0.2, 8, p.oy); c.fill(); c.restore();
  }
  drawGlow() {
    const s = glow(this.col.cg, 32);
    const R = (this.archId === 'worm' ? 60 : 150) * this.sc * (1 + this.beat * 0.1);
    ctx.globalAlpha = 0.35;
    ctx.drawImage(s.c, this.x - R, this.y - R, R * 2, R * 2);
    if (this.coreOpen && this.state === 'fight') {
      const r = 50 * this.sc * (1 + 0.2 * Math.sin(this.t * 8));
      ctx.globalAlpha = 0.6; ctx.drawImage(glow('#ffffff', 32).c, this.cx() - r, this.cy() - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1;
  }
  draw() {
    const c = ctx, t = this.t;
    setT(this.x, this.y, this.sc);
    const AA = this.AA;
    if (AA) {
      AA.draw(c, this, t);
      if (AA.drawShell) for (const p of this.parts) if (p.kind === 'shell') { if (p.alive) { c.save(); c.translate(p.ox, p.oy); AA.drawShell(c, this, p, t); c.restore(); } else drawWound(c, this, p, t); }
    } else {
      this.A.draw(c, this, t);
      for (const p of this.parts) if (p.kind === 'shell' && this.A.drawShell) { if (p.alive) { c.save(); c.translate(p.ox, p.oy); this.A.drawShell(c, this, p, t); c.restore(); } else this.wound(c, p, t); }
    }
    const core = this.core;
    if (core.alive) {
      c.save(); c.translate(core.ox, core.oy);
      if (AA) { if (AA.drawCore) AA.drawCore(c, this, core, t); else drawReactor(c, this, core, t); }
      else if (this.A.drawCore) this.A.drawCore(c, this, core, t);
      else {
        const pul = 1 + 0.12 * Math.sin(t * 6) + this.beat * 0.1;
        c.beginPath(); c.arc(0, 0, core.r * pul, 0, TAU);
        c.fillStyle = bodyGrad(c, this.col.cg, core.r, 'core'); c.fill();
        c.strokeStyle = '#ffffff'; c.lineWidth = 2; c.stroke();
        c.strokeStyle = rgba('#ffffff', 0.6); c.lineWidth = 1.5;
        for (let i = 0; i < 3; i++) { c.beginPath(); c.ellipse(0, 0, core.r * (1.2 + i * 0.2), core.r * 0.4, t * (1 + i * 0.5) + i, 0, TAU); c.stroke(); }
      }
      if (!this.coreOpen) {
        // bulle d'énergie protectrice (le noyau n'est pas encore vulnérable)
        const R = core.r * 1.5, pv = 0.5 + 0.25 * Math.sin(t * 5);
        c.globalCompositeOperation = 'lighter';
        const bub = sprite('coreBubble', 64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 14, 32, 32, 32); gr.addColorStop(0, 'rgba(120,220,255,0)'); gr.addColorStop(0.75, 'rgba(120,220,255,0.12)'); gr.addColorStop(0.93, 'rgba(170,240,255,0.55)'); gr.addColorStop(1, 'rgba(170,240,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }, 0.8);
        c.globalAlpha = 0.7 + pv * 0.3; c.drawImage(bub.c, -R, -R, R * 2, R * 2); c.globalAlpha = 1;
        c.strokeStyle = rgba('#bff4ff', 0.35 + pv * 0.4); c.lineWidth = 1.4;
        polyPath(c, 6, R * 0.92, t * 0.5); c.stroke();
        c.strokeStyle = rgba('#bff4ff', 0.25); c.lineWidth = 0.8;
        polyPath(c, 6, R * 0.8, -t * 0.7); c.stroke();
        c.globalCompositeOperation = 'source-over';
      }
      c.restore();
    }
    baseT();
    // Flash d'impact
    c.globalCompositeOperation = 'lighter';
    for (const p of this.parts) if (p.alive && p.flash > 0) { const s = glow('#ffffff', 16); const r = p.r * 1.3; c.globalAlpha = 0.7; c.drawImage(s.c, p.x - r, p.y - r, r * 2, r * 2); }
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
  }
}
