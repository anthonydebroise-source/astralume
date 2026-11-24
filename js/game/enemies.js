// Bestiaire de la Nuée : aliens organiques volants et créatures au sol
import { TAU, rand, angTo, angDiff, dist2, rgba, lighten, darken, chance } from '../engine/math.js';
import { view } from '../engine/renderer.js';
import { fx } from '../engine/particles.js';
import { blobPath, starPath, polyPath, tentacle, eye, bodyGrad, drawCoin } from './art.js';
import { aimed, ring, fan, shoot, burst, flower } from './patterns.js';
import { sfx } from '../audio/sfx.js';

export const ENEMIES = {};
function def(id, o) { ENEMIES[id] = Object.assign({ id, hp: 10, r: 12, coins: 1, rate: 3, cls: 's' }, o); }

const look = (e, g) => { const dx = g.player.x - e.x, dy = g.player.y - e.y; const l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; };
const TMP = { x: 0, y: 0 };
const nfire = (g) => (g.def.noFire ? 0 : 1);

// ============ VOLANTS ============
def('globule', {
  name: 'Globule', hp: 10, r: 13, coins: 1.2, rate: 2.8,
  draw(c, e, t) {
    const r = e.r;
    blobPath(c, r, r * 0.92, t + e.seed, 0.09, 10, e.seed);
    c.fillStyle = bodyGrad(c, e.c1, r); c.fill();
    c.lineWidth = 1.6; c.strokeStyle = e.cg; c.stroke();
    c.strokeStyle = rgba(e.cg, 0.6); c.lineWidth = 1.1; c.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + t * 0.6, k = 1.12 + 0.12 * Math.sin(t * 6 + i);
      c.moveTo(Math.cos(a) * r * 0.98, Math.sin(a) * r * 0.98); c.lineTo(Math.cos(a) * r * k, Math.sin(a) * r * k);
    }
    c.stroke();
    const nx = Math.sin(t * 1.7 + e.seed) * r * 0.16, ny = Math.cos(t * 1.3) * r * 0.14;
    c.fillStyle = e.c2; c.beginPath(); c.arc(nx, ny, r * 0.38, 0, TAU); c.fill();
    c.fillStyle = '#ffffff'; c.beginPath(); c.arc(nx - r * 0.1, ny - r * 0.1, r * 0.13, 0, TAU); c.fill();
  },
  fire(e, g) { aimed(g, e.x, e.y + 6, 150, 1); },
});

def('dardeur', {
  name: 'Dardeur', hp: 9, r: 11, coins: 1.3, rate: 9,
  update(e, g, dt) {
    const d = e.data;
    if (!d.st) { d.st = 'path'; d.trig = rand(1.0, 2.2); }
    if (d.st === 'path') {
      if (e.path.t > d.trig && e.y > view.safeT + 50 && e.y < view.h * 0.5) { d.st = 'aim'; d.at = 0; d.px = e.x; d.py = e.y; e.path = { k: 'none', t: 0 }; sfx.ping(); }
      if (Math.hypot(e.vx, e.vy) > 5) e.face = Math.atan2(e.vy, e.vx) - Math.PI / 2;
    } else if (d.st === 'aim') {
      d.at += dt;
      e.x = d.px + rand(-1.4, 1.4); e.y = d.py - d.at * 12;
      const ta = angTo(e.x, e.y, g.player.x, g.player.y) - Math.PI / 2;
      e.face += angDiff(e.face, ta) * Math.min(1, dt * 10);
      if (d.at > 0.6) {
        d.st = 'dash';
        const a = e.face + Math.PI / 2;
        e.fvx = Math.cos(a) * 430; e.fvy = Math.sin(a) * 430;
        e.path = { k: 'free', t: 0 };
      }
    } else {
      if (chance(0.6)) fx.dot(e.x - e.fvx * 0.03, e.y - e.fvy * 0.03, 0, 0, 0.3, 6, e.cg);
    }
  },
  draw(c, e, t) {
    const r = e.r, aim = e.data.st === 'aim';
    c.fillStyle = e.c2;
    for (let i = 0; i < 4; i++) { tentacle(c, (i - 1.5) * 3.2, -r * 0.4, -Math.PI / 2 + (i - 1.5) * 0.18, r * 1.5, 2.4, t * 2, i * 1.3, 0.4, 5); c.fill(); }
    c.beginPath(); c.ellipse(0, r * 0.15, r * 0.68, r * 1.05, 0, 0, TAU);
    c.fillStyle = bodyGrad(c, e.c1, r, 'd'); c.fill();
    c.strokeStyle = aim ? '#ffffff' : e.cg; c.lineWidth = aim ? 2.2 : 1.5; c.stroke();
    c.beginPath(); c.moveTo(-r * 0.68, -r * 0.2); c.lineTo(-r * 1.1, -r * 0.55); c.lineTo(-r * 0.5, -r * 0.55); c.closePath();
    c.moveTo(r * 0.68, -r * 0.2); c.lineTo(r * 1.1, -r * 0.55); c.lineTo(r * 0.5, -r * 0.55); c.closePath();
    c.fillStyle = e.cg; c.fill();
    c.fillStyle = aim ? '#ffffff' : '#fff6c8';
    c.beginPath(); c.arc(-r * 0.28, r * 0.55, r * 0.16, 0, TAU); c.arc(r * 0.28, r * 0.55, r * 0.16, 0, TAU); c.fill();
  },
});

def('tournoyeur', {
  name: 'Tournoyeur', hp: 11, r: 12, coins: 1.2, rate: 3.3,
  init(e) { e.data.dir = chance(0.5) ? 1 : -1; },
  update(e, g, dt) { e.face = (e.face || 0) + 2.6 * dt * e.data.dir; },
  draw(c, e, t) {
    const r = e.r;
    starPath(c, 5, r * 1.15, r * 0.48, 0, true);
    c.fillStyle = bodyGrad(c, e.c1, r * 1.1, 't'); c.fill();
    c.strokeStyle = e.cg; c.lineWidth = 1.5; c.stroke();
    c.fillStyle = rgba(e.c2, 0.9);
    for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU - Math.PI / 2; c.beginPath(); c.arc(Math.cos(a) * r * 0.72, Math.sin(a) * r * 0.72, r * 0.13, 0, TAU); c.fill(); }
    c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, r * 0.3, 0, TAU); c.fill();
    c.fillStyle = e.c2; c.beginPath(); c.arc(0, 0, r * 0.18, 0, TAU); c.fill();
  },
  fire(e, g) { ring(g, e.x, e.y, 5, 120, e.face - Math.PI / 2, 'needle'); },
});

const SPLIT = [{ r: 20, hp: 26 }, { r: 14, hp: 10 }, { r: 9, hp: 4 }];
def('scindeur', {
  name: 'Scindeur', hp: 26, r: 20, coins: 1.5, rate: 3.6, cls: 'm',
  init(e) { const gen = e.data.gen || 0; e.r = SPLIT[gen].r; e.hp = e.max = SPLIT[gen].hp * e.hpMul; },
  draw(c, e, t) {
    const r = e.r, gen = e.data.gen || 0;
    blobPath(c, r * 1.05, r * 0.95, t * 1.4 + e.seed, 0.13, 9, e.seed);
    c.fillStyle = rgba(e.c1, 0.55); c.fill();
    c.strokeStyle = e.cg; c.lineWidth = 2; c.stroke();
    blobPath(c, r * 0.8, r * 0.72, t * 1.1 + e.seed + 2, 0.1, 8, e.seed + 3);
    c.fillStyle = bodyGrad(c, e.c1, r, 's'); c.fill();
    const n = 3 - gen;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + t * 0.8, d = n > 1 ? r * 0.32 : 0;
      c.fillStyle = e.c2; c.beginPath(); c.arc(Math.cos(a) * d, Math.sin(a) * d, r * 0.2, 0, TAU); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(Math.cos(a) * d - 1, Math.sin(a) * d - 1, r * 0.07, 0, TAU); c.fill();
    }
    if (gen < 2) { c.strokeStyle = rgba('#ffffff', 0.35 + 0.25 * Math.sin(t * 5)); c.lineWidth = 1; c.beginPath(); c.moveTo(0, -r * 0.8); c.lineTo(0, r * 0.8); c.stroke(); }
  },
  fire(e, g) { if ((e.data.gen || 0) === 0) aimed(g, e.x, e.y, 120, 1, 0, 'big'); },
  death(e, g) {
    const gen = e.data.gen || 0;
    if (gen >= 2) return;
    for (let s = -1; s <= 1; s += 2) {
      const k = g.addEnemy('scindeur', e.x + s * e.r * 0.5, e.y, { k: 'free' }, { data: { gen: gen + 1 }, child: true });
      k.fvx = s * rand(70, 110); k.fvy = rand(40, 90);
    }
  },
});

def('nautile', {
  name: 'Nautile', hp: 40, r: 19, coins: 3.5, rate: 99, cls: 'm',
  update(e, g, dt) {
    e.face = (e.face || 0) + dt * 0.5;
    if (!nfire(g) || !e.path.hovering) return;
    const d = e.data;
    d.cd = (d.cd || 0.4) - dt;
    if (d.cd <= 0) {
      d.cd = 0.17 / Math.max(0.35, g.D.fire);
      d.a = (d.a || 0) + 0.43;
      shoot(g, e.x, e.y, d.a, 115, 'orb');
      shoot(g, e.x, e.y, d.a + Math.PI, 115, 'orb');
    }
  },
  draw(c, e, t) {
    const r = e.r;
    c.fillStyle = e.c2;
    for (let i = 0; i < 5; i++) { tentacle(c, -r * 0.2 + i * 2, r * 0.55, Math.PI / 2 + (i - 2) * 0.35, r * 0.9, 2.2, t * 2.4, i, 0.5, 5); c.fill(); }
    c.beginPath(); c.arc(0, 0, r, 0, TAU);
    c.fillStyle = bodyGrad(c, e.c1, r, 'n'); c.fill();
    c.strokeStyle = e.cg; c.lineWidth = 1.8; c.stroke();
    c.strokeStyle = rgba(lighten(e.c1, 0.6), 0.8); c.lineWidth = 1.4;
    c.beginPath();
    for (let a = 0; a < TAU * 2.2; a += 0.25) { const rr = r * 0.08 * Math.exp(0.19 * a); const x = Math.cos(a + e.face * 2) * rr, y = Math.sin(a + e.face * 2) * rr; if (a === 0) c.moveTo(x, y); else c.lineTo(x, y); }
    c.stroke();
    for (let k = 0; k < 6; k++) { const a = k * 1.05 + e.face * 2; const rr = r * 0.08 * Math.exp(0.19 * (a - e.face * 2 + TAU)); c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); c.stroke(); }
    c.fillStyle = '#fff6c8'; c.beginPath(); c.arc(0, r * 0.45, r * 0.16, 0, TAU); c.fill();
  },
});

def('spectre', {
  name: 'Spectre', hp: 30, r: 17, coins: 3.5, rate: 99, cls: 'm',
  update(e, g, dt) {
    const d = e.data;
    const ph = (e.t + e.seed) % 3.4;
    if (ph < 1.8) { e.alpha = Math.min(1, e.alpha + dt * 5); e.hidden = false; }
    else if (ph < 2.1) { e.alpha = Math.max(0.1, e.alpha - dt * 4); }
    else if (ph < 3.1) { e.alpha = 0.1; e.hidden = true; e.x += Math.sin(e.t * 2 + e.seed) * 50 * dt; }
    else { e.alpha = Math.min(1, e.alpha + dt * 4); e.hidden = false; if (!d.fired) { d.fired = true; if (nfire(g) && e.y > view.safeT + 20) aimed(g, e.x, e.y, 160, 3, 0.22, 'needle'); } }
    if (ph < 1) d.fired = false;
  },
  draw(c, e, t) {
    const r = e.r;
    c.beginPath();
    c.moveTo(-r, 0);
    c.bezierCurveTo(-r, -r * 1.3, r, -r * 1.3, r, 0);
    for (let i = 0; i <= 6; i++) { const x = r - (i / 6) * r * 2; const y = r * 0.9 + Math.sin(t * 5 + i * 1.4) * r * 0.25 + (i % 2) * r * 0.2; c.lineTo(x, y); }
    c.closePath();
    c.fillStyle = rgba(e.c1, 0.7); c.fill();
    c.strokeStyle = e.cg; c.lineWidth = 1.6; c.stroke();
    c.fillStyle = '#05020f';
    c.beginPath(); c.ellipse(-r * 0.35, -r * 0.2, r * 0.2, r * 0.3, 0, 0, TAU); c.ellipse(r * 0.35, -r * 0.2, r * 0.2, r * 0.3, 0, 0, TAU); c.fill();
    c.fillStyle = e.c2;
    c.beginPath(); c.arc(-r * 0.35, -r * 0.15, r * 0.09, 0, TAU); c.arc(r * 0.35, -r * 0.15, r * 0.09, 0, TAU); c.fill();
  },
});

def('glouton', {
  name: 'Glouton', hp: 34, r: 18, coins: 4, rate: 99, cls: 'm',
  init(e) { e.path = { k: 'none', t: 0 }; e.data.vx = 0; e.data.vy = 70; },
  update(e, g, dt) {
    const d = e.data;
    d.scan = (d.scan || 0) - dt;
    if (d.scan <= 0) {
      d.scan = 0.35; d.prey = null;
      let best = 240 * 240;
      for (const o of g.enemies) {
        if (o === e || o.dead || o.ground || o.elite || o.boss || o.type === 'glouton' || o.r > e.r || o.type === 'serpentSeg') continue;
        const dd = dist2(e.x, e.y, o.x, o.y);
        if (dd < best) { best = dd; d.prey = o; }
      }
    }
    let tx, ty, spd;
    if (d.prey && !d.prey.dead) { tx = d.prey.x; ty = d.prey.y; spd = 120; }
    else { tx = g.player.x; ty = e.y + 200; spd = e.y < view.safeT + view.h * 0.15 ? 80 : 38; }
    const a = angTo(e.x, e.y, tx, ty);
    d.vx += (Math.cos(a) * spd - d.vx) * Math.min(1, dt * 2);
    d.vy += (Math.sin(a) * spd - d.vy) * Math.min(1, dt * 2);
    e.x += d.vx * dt; e.y += d.vy * dt;
    d.chomp = (d.chomp || 0) + dt * (d.prey ? 9 : 3);
    if (d.prey && !d.prey.dead && dist2(e.x, e.y, d.prey.x, d.prey.y) < (e.r + d.prey.r * 0.4) ** 2) g.eat(e, d.prey);
  },
  draw(c, e, t) {
    const r = e.r, open = 0.25 + 0.3 * Math.abs(Math.sin(e.data.chomp || 0));
    c.beginPath(); c.arc(0, 0, r, Math.PI / 2 + open, Math.PI / 2 - open + TAU); c.lineTo(0, 0); c.closePath();
    c.fillStyle = bodyGrad(c, e.c1, r, 'g'); c.fill();
    c.strokeStyle = e.cg; c.lineWidth = 1.8; c.stroke();
    c.fillStyle = '#fff4e0';
    for (let s = -1; s <= 1; s += 2) for (let i = 0; i < 3; i++) {
      const a = Math.PI / 2 + s * (open - 0.05) - s * i * 0.02;
      const bx = Math.cos(a) * r * (0.92 - i * 0.28), by = Math.sin(a) * r * (0.92 - i * 0.28);
      c.beginPath(); c.moveTo(bx, by); c.lineTo(bx + Math.cos(a - s * 1.6) * 4, by + Math.sin(a - s * 1.6) * 4); c.lineTo(bx - Math.cos(a) * 3, by - Math.sin(a) * 3); c.fill();
    }
    c.fillStyle = rgba(e.c2, 0.8);
    for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(Math.cos(i * 2.1 + 3.6) * r * 0.55, Math.sin(i * 2.1 + 3.6) * r * 0.55 - r * 0.15, r * 0.09, 0, TAU); c.fill(); }
    eye(c, -r * 0.35, -r * 0.45, r * 0.22, 0, 0.5, e.c2, 1);
    eye(c, r * 0.35, -r * 0.45, r * 0.22, 0, 0.5, e.c2, 1);
  },
});

def('meduse', {
  name: 'Méduse', hp: 32, r: 18, coins: 3.5, rate: 3.8, cls: 'm',
  draw(c, e, t) {
    const r = e.r;
    c.fillStyle = rgba(e.c2, 0.75);
    for (let i = 0; i < 6; i++) { tentacle(c, (i - 2.5) * r * 0.28, r * 0.15, Math.PI / 2, r * 1.6, 1.8, t * 1.6, i * 0.9, 0.35, 7); c.fill(); }
    const pul = 1 + 0.06 * Math.sin(t * 4 + e.seed);
    c.beginPath();
    c.moveTo(-r * pul, r * 0.2);
    c.bezierCurveTo(-r * pul, -r * 1.25, r * pul, -r * 1.25, r * pul, r * 0.2);
    for (let i = 0; i <= 8; i++) { const x = r * pul - (i / 8) * 2 * r * pul; c.lineTo(x, r * 0.2 + (i % 2 ? r * 0.22 : 0)); }
    c.closePath();
    c.fillStyle = rgba(e.c1, 0.78); c.fill();
    c.strokeStyle = e.cg; c.lineWidth = 1.6; c.stroke();
    c.fillStyle = rgba(lighten(e.c1, 0.6), 0.9);
    c.beginPath(); c.ellipse(0, -r * 0.35, r * 0.45, r * 0.3, 0, 0, TAU); c.fill();
    c.fillStyle = e.c2;
    for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(Math.cos(i * 1.57 + t) * r * 0.25, -r * 0.35 + Math.sin(i * 1.57 + t) * r * 0.14, r * 0.08, 0, TAU); c.fill(); }
  },
  fire(e, g) { ring(g, e.x, e.y, 10 + Math.round(g.D.fire * 2), 105, rand(TAU)); },
});

def('mante', {
  name: 'Mante', hp: 28, r: 16, coins: 3.5, rate: 2.6, cls: 'm',
  draw(c, e, t) {
    const r = e.r;
    c.fillStyle = rgba(e.c2, 0.35);
    c.beginPath(); c.ellipse(-r * 0.6, -r * 0.5, r * 0.9, r * 0.35, -0.5 + Math.sin(t * 20) * 0.1, 0, TAU); c.ellipse(r * 0.6, -r * 0.5, r * 0.9, r * 0.35, 0.5 - Math.sin(t * 20) * 0.1, 0, TAU); c.fill();
    c.beginPath(); c.ellipse(0, -r * 0.35, r * 0.4, r * 0.85, 0, 0, TAU);
    c.fillStyle = bodyGrad(c, e.c1, r, 'm'); c.fill(); c.strokeStyle = e.cg; c.lineWidth = 1.4; c.stroke();
    c.strokeStyle = e.cg; c.lineWidth = 3; c.lineCap = 'round';
    const sw = Math.sin(t * 3 + e.seed) * 0.25;
    for (let s = -1; s <= 1; s += 2) {
      c.beginPath(); c.moveTo(s * r * 0.3, r * 0.1); c.lineTo(s * r * 0.95, r * 0.35 + sw * r); c.quadraticCurveTo(s * r * 1.15, r * 1.1, s * r * 0.5, r * 1.05); c.stroke();
    }
    c.beginPath(); c.moveTo(-r * 0.55, r * 0.25); c.lineTo(r * 0.55, r * 0.25); c.lineTo(0, r * 0.95); c.closePath();
    c.fillStyle = bodyGrad(c, e.c1, r * 0.8, 'mh'); c.fill(); c.lineWidth = 1.4; c.stroke();
    c.fillStyle = e.c2;
    c.beginPath(); c.ellipse(-r * 0.3, r * 0.4, r * 0.18, r * 0.12, 0.6, 0, TAU); c.ellipse(r * 0.3, r * 0.4, r * 0.18, r * 0.12, -0.6, 0, TAU); c.fill();
  },
  fire(e, g) { burst(g, e, 3, 0.1, () => aimed(g, e.x, e.y + e.r * 0.8, 235, 1, 0, 'needle')); },
});

def('pondeuse', {
  name: 'Pondeuse', hp: 110, r: 30, coins: 10, rate: 4.5, cls: 'l',
  update(e, g, dt) {
    const d = e.data;
    d.cd = (d.cd ?? 1.5) - dt;
    if (d.cd <= 0 && e.y > view.safeT && (d.kids || 0) < 6) {
      d.cd = 2.4;
      const k = g.addEnemy('larve', e.x + rand(-10, 10), e.y + e.r * 0.6, { k: 'none' }, { child: true });
      k.data.mom = e; d.kids = (d.kids || 0) + 1;
      fx.ring(e.x, e.y + e.r * 0.6, 2, 18, 0.3, e.cg, 2); sfx.squish();
    }
  },
  draw(c, e, t) {
    const r = e.r;
    c.strokeStyle = e.cg; c.lineWidth = 2;
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + 0.3; c.beginPath(); c.moveTo(Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8); c.quadraticCurveTo(Math.cos(a + 0.3) * r * 1.3, Math.sin(a + 0.3) * r * 1.3, Math.cos(a + Math.sin(t * 3 + i) * 0.3) * r * 1.35, Math.sin(a) * r * 1.35); c.stroke(); }
    blobPath(c, r, r * 0.9, t * 0.8 + e.seed, 0.06, 12, e.seed);
    c.fillStyle = rgba(e.c1, 0.85); c.fill(); c.lineWidth = 2.2; c.stroke();
    c.strokeStyle = rgba(darken(e.c1, 0.5), 0.7); c.lineWidth = 1.2;
    for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(Math.cos(i * 1.3) * r * 0.6, Math.sin(i * 1.3) * r * 0.2, Math.cos(i * 1.3 + 0.4) * r * 0.85, Math.sin(i * 1.3 + 0.4) * r * 0.8); c.stroke(); }
    for (let i = 0; i < 7; i++) {
      const a = i * 0.9 + 0.5, d = r * (0.3 + (i % 3) * 0.17);
      const p = 0.5 + 0.5 * Math.sin(t * 4 + i);
      c.fillStyle = rgba(e.c2, 0.6 + 0.4 * p);
      c.beginPath(); c.arc(Math.cos(a) * d, Math.sin(a) * d, r * (0.11 + 0.03 * p), 0, TAU); c.fill();
    }
  },
  fire(e, g) { ring(g, e.x, e.y, 8, 90, rand(TAU), 'big'); },
});

def('larve', {
  name: 'Larve', hp: 3, r: 7, coins: 0.3, rate: 99, cls: 'xs',
  init(e) { e.face = 0; e.data.a = Math.PI / 2; },
  update(e, g, dt) {
    const d = e.data;
    const ta = angTo(e.x, e.y, g.player.x, g.player.y);
    d.a += Math.max(-2.2 * dt, Math.min(2.2 * dt, angDiff(d.a, ta)));
    const sp = 105 + Math.sin(e.t * 9) * 25;
    e.x += Math.cos(d.a) * sp * dt; e.y += Math.sin(d.a) * sp * dt;
    e.face = d.a - Math.PI / 2;
    if (e.t > 9) e.y += 200 * dt;
  },
  death(e) { if (e.data.mom) e.data.mom.data.kids = Math.max(0, (e.data.mom.data.kids || 1) - 1); },
  draw(c, e, t) {
    const r = e.r;
    for (let i = 3; i >= 0; i--) {
      const y = -i * r * 0.7, x = Math.sin(t * 12 - i) * 2;
      c.fillStyle = i === 0 ? e.c1 : rgba(e.c1, 0.85 - i * 0.12);
      c.beginPath(); c.arc(x, y, r * (1 - i * 0.18), 0, TAU); c.fill();
    }
    c.strokeStyle = e.cg; c.lineWidth = 1.2; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.stroke();
    c.beginPath(); c.moveTo(-r * 0.5, r * 0.6); c.lineTo(-r * 0.2, r * 1.2); c.moveTo(r * 0.5, r * 0.6); c.lineTo(r * 0.2, r * 1.2); c.stroke();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(-r * 0.35, r * 0.2, 1.6, 0, TAU); c.arc(r * 0.35, r * 0.2, 1.6, 0, TAU); c.fill();
  },
});

def('mimique', {
  name: 'Faux-Trésor', hp: 14, r: 11, coins: 8, rate: 99,
  init(e) { e.path = { k: 'none', t: 0 }; e.data.st = 'hide'; e.noContact = true; },
  update(e, g, dt) {
    const d = e.data;
    if (d.st === 'hide') {
      e.y += 55 * dt; e.x += Math.sin(e.t * 2 + e.seed) * 20 * dt;
      if (e.t > 3.8 || dist2(e.x, e.y, g.player.x, g.player.y) < 120 * 120) { d.st = 'reveal'; d.rt = 0; fx.text(e.x, e.y - 18, 'PIÈGE !', '#ff4f6e', 13); sfx.squish(); }
    } else if (d.st === 'reveal') {
      d.rt += dt; if (d.rt > 0.35) { d.st = 'chase'; e.noContact = false; }
    } else {
      const a = angTo(e.x, e.y, g.player.x, g.player.y);
      e.x += Math.cos(a) * 135 * dt; e.y += Math.sin(a) * 135 * dt;
      if (e.t > 12) e.y += 250 * dt;
    }
  },
  draw(c, e, t) {
    const r = e.r, d = e.data;
    if (d.st === 'hide') { c.save(); c.scale(Math.max(0.15, Math.abs(Math.cos(t * 5))), 1); drawCoin(c, r * 0.95, 1); c.restore(); return; }
    const o = d.st === 'reveal' ? d.rt / 0.35 : 0.6 + 0.4 * Math.abs(Math.sin(t * 10));
    const gap = o * r * 0.55;
    c.fillStyle = '#3a0010'; c.beginPath(); c.ellipse(0, 0, r * 0.95, gap + 1, 0, 0, TAU); c.fill();
    c.fillStyle = '#fff';
    for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(i * r * 0.32 - 3, -gap); c.lineTo(i * r * 0.32 + 3, -gap); c.lineTo(i * r * 0.32, -gap + 5); c.fill(); c.beginPath(); c.moveTo(i * r * 0.32 - 3, gap); c.lineTo(i * r * 0.32 + 3, gap); c.lineTo(i * r * 0.32, gap - 5); c.fill(); }
    for (const s of [-1, 1]) { c.save(); c.translate(0, s * gap); c.scale(1, 0.55); c.beginPath(); c.arc(0, s * r * 0.5, r, s > 0 ? 0 : Math.PI, s > 0 ? Math.PI : TAU); c.fillStyle = '#ffd23f'; c.fill(); c.strokeStyle = '#a85a00'; c.lineWidth = 2; c.stroke(); c.restore(); }
    eye(c, 0, -gap - r * 0.55, r * 0.3, 0, 1, '#ff2a4a', 1);
  },
});

def('pollen', {
  name: 'Pollinisateur', hp: 12, r: 10, coins: 2, rate: 99,
  update(e, g, dt) {
    const d = e.data;
    d.cd = (d.cd ?? 1) - dt;
    if (d.cd <= 0 && e.y > 0) {
      d.cd = 1.6;
      let best = null, bd = 150 * 150;
      for (const o of g.enemies) { if (o === e || o.dead || o.hp >= o.max || o.boss) continue; const dd = dist2(e.x, e.y, o.x, o.y); if (dd < bd) { bd = dd; best = o; } }
      if (best) { best.hp = Math.min(best.max, best.hp + best.max * 0.3); g.lineFx(e.x, e.y, best.x, best.y, '#7dff9a', 0.4, 3); fx.text(best.x, best.y - best.r - 6, '+', '#7dff9a', 16); for (let i = 0; i < 4; i++) fx.star(best.x + rand(-10, 10), best.y + rand(-10, 10), 4, 0.5, '#7dff9a'); }
    }
  },
  draw(c, e, t) {
    const r = e.r, f = Math.abs(Math.sin(t * 16));
    c.fillStyle = rgba(e.c2, 0.75);
    for (const s of [-1, 1]) {
      c.save(); c.scale(s * (0.4 + 0.6 * f), 1);
      c.beginPath(); c.ellipse(r * 0.9, -r * 0.35, r * 0.95, r * 0.6, -0.4, 0, TAU); c.fill();
      c.beginPath(); c.ellipse(r * 0.7, r * 0.45, r * 0.6, r * 0.42, 0.5, 0, TAU); c.fill();
      c.fillStyle = '#7dff9a'; c.beginPath(); c.arc(r * 1.05, -r * 0.4, r * 0.22, 0, TAU); c.fill(); c.fillStyle = rgba(e.c2, 0.75);
      c.restore();
    }
    c.beginPath(); c.ellipse(0, 0, r * 0.32, r * 0.95, 0, 0, TAU); c.fillStyle = bodyGrad(c, e.c1, r, 'p'); c.fill();
    c.strokeStyle = e.cg; c.lineWidth = 1.2; c.stroke();
    c.beginPath(); c.moveTo(-2, r * 0.8); c.quadraticCurveTo(-r * 0.6, r * 1.3, -r * 0.7, r * 1.5); c.moveTo(2, r * 0.8); c.quadraticCurveTo(r * 0.6, r * 1.3, r * 0.7, r * 1.5); c.stroke();
  },
});

def('serpent', {
  name: 'Ver serpent', hp: 70, r: 16, coins: 8, rate: 3.2, cls: 'l',
  init(e, g) {
    e.data.hist = [];
    e.data.segs = [];
    for (let i = 1; i <= 9; i++) {
      const s = g.addEnemy('serpentSeg', e.x, e.y - i * 15, { k: 'none' }, { primary: true });
      s.data.head = e; s.data.idx = i; e.data.segs.push(s);
    }
  },
  update(e, g, dt) {
    const h = e.data.hist;
    h.push(e.x, e.y);
    if (h.length > 900) h.splice(0, 2);
    if (Math.hypot(e.vx, e.vy) > 2) e.face = Math.atan2(e.vy, e.vx) - Math.PI / 2;
  },
  death(e, g) { e.data.segs.forEach((s, i) => g.later(0.07 * (i + 1), () => { if (!s.dead) g.killEnemy(s); })); },
  draw(c, e, t) {
    const r = e.r;
    c.strokeStyle = e.cg; c.lineWidth = 3; c.lineCap = 'round';
    const m = Math.sin(t * 8) * 0.3;
    c.beginPath(); c.moveTo(-r * 0.5, r * 0.6); c.quadraticCurveTo(-r * 1.1, r * 1.2, -r * 0.4 + m * 6, r * 1.6); c.moveTo(r * 0.5, r * 0.6); c.quadraticCurveTo(r * 1.1, r * 1.2, r * 0.4 - m * 6, r * 1.6); c.stroke();
    c.beginPath(); c.ellipse(0, 0, r * 0.9, r * 1.1, 0, 0, TAU);
    c.fillStyle = bodyGrad(c, e.c1, r * 1.1, 'sh'); c.fill(); c.lineWidth = 1.8; c.stroke();
    c.fillStyle = e.c2; c.beginPath(); c.moveTo(0, -r * 0.9); c.lineTo(r * 0.3, -r * 0.2); c.lineTo(0, 0); c.lineTo(-r * 0.3, -r * 0.2); c.closePath(); c.fill();
    eye(c, -r * 0.42, r * 0.35, r * 0.24, 0, 1, '#ffd23f', 1);
    eye(c, r * 0.42, r * 0.35, r * 0.24, 0, 1, '#ffd23f', 1);
  },
  fire(e, g) { fan(g, e.x, e.y + e.r, Math.PI / 2, 3, 0.5, 150, 'needle'); },
});
def('serpentSeg', {
  name: 'Anneau', hp: 14, r: 11, coins: 1, rate: 5,
  init(e) { e.noLootDrop = false; },
  update(e, g, dt) {
    const hd = e.data.head;
    if (!hd || hd.dead) { e.y += 80 * dt; return; }
    const h = hd.data.hist;
    let need = e.data.idx * 16, i = h.length - 2, px = hd.x, py = hd.y;
    while (i >= 2 && need > 0) { const dx = h[i] - px, dy = h[i + 1] - py; const l = Math.hypot(dx, dy); need -= l; px = h[i]; py = h[i + 1]; i -= 2; }
    if (need > 0) { py -= need; }
    const ox = e.x, oy = e.y;
    e.x = px; e.y = py;
    if (Math.abs(e.x - ox) + Math.abs(e.y - oy) > 0.1) e.face = Math.atan2(e.y - oy, e.x - ox) - Math.PI / 2;
    e.entered = hd.entered;
    if (hd.y > view.h + 300) e.gone = true;
  },
  draw(c, e, t) {
    const r = e.r;
    c.fillStyle = e.cg;
    c.beginPath(); c.moveTo(-r * 0.8, 0); c.lineTo(-r * 1.45, -r * 0.3); c.lineTo(-r * 0.7, -r * 0.5); c.moveTo(r * 0.8, 0); c.lineTo(r * 1.45, -r * 0.3); c.lineTo(r * 0.7, -r * 0.5); c.fill();
    c.beginPath(); c.ellipse(0, 0, r, r * 0.8, 0, 0, TAU);
    c.fillStyle = bodyGrad(c, e.c1, r, 'ss'); c.fill();
    c.strokeStyle = e.cg; c.lineWidth = 1.5; c.stroke();
    c.fillStyle = rgba(e.c2, 0.6 + 0.4 * Math.sin(t * 6 + e.data.idx));
    c.beginPath(); c.arc(0, 0, r * 0.32, 0, TAU); c.fill();
  },
  fire(e, g) { if (e.data.idx % 3 === 0) aimed(g, e.x, e.y, 130, 1); },
});

def('spore', {
  name: 'Spore', hp: 8, r: 10, coins: 1, rate: 99,
  update(e, g, dt) {
    if (!g.def.noFire && dist2(e.x, e.y, g.player.x, g.player.y) < 46 * 46 && g.player.alive) { e.data.pop = true; g.killEnemy(e, true); }
  },
  death(e, g) {
    if (g.def.noFire) return;
    const n = [6, 8, 10][g.diff];
    ring(g, e.x, e.y, n, 95, rand(TAU), 'orb');
    fx.ring(e.x, e.y, 4, 40, 0.3, e.c2, 2);
  },
  draw(c, e, t) {
    const r = e.r, p = 1 + 0.08 * Math.sin(t * 7 + e.seed);
    starPath(c, 10, r * 1.25 * p, r * 0.78, t * 0.5, false);
    c.fillStyle = bodyGrad(c, e.c2, r * 1.2, 'sp'); c.fill();
    c.strokeStyle = e.cg; c.lineWidth = 1.2; c.stroke();
    c.fillStyle = rgba('#ffffff', 0.5 + 0.5 * Math.sin(t * 9 + e.seed)); c.beginPath(); c.arc(0, 0, r * 0.35, 0, TAU); c.fill();
  },
});

def('cuirasse', {
  name: 'Cuirassé', hp: 30, r: 18, coins: 4.5, rate: 2.5, cls: 'm',
  init(e) { e.armor = 36 * e.hpMul; e.armorMax = e.armor; },
  draw(c, e, t) {
    const r = e.r;
    c.strokeStyle = e.cg; c.lineWidth = 2;
    for (let i = 0; i < 3; i++) for (const s of [-1, 1]) { const y = -r * 0.4 + i * r * 0.4; c.beginPath(); c.moveTo(s * r * 0.5, y); c.lineTo(s * r * 1.1, y + Math.sin(t * 10 + i + s) * 4); c.stroke(); }
    c.beginPath(); c.ellipse(0, 0, r * 0.72, r, 0, 0, TAU); c.fillStyle = bodyGrad(c, e.c1, r, 'c'); c.fill(); c.lineWidth = 1.5; c.stroke();
    c.fillStyle = darken(e.c1, 0.4); c.beginPath(); c.ellipse(0, r * 0.85, r * 0.42, r * 0.32, 0, 0, TAU); c.fill();
    c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.moveTo(-r * 0.25, r * 1.05); c.lineTo(-r * 0.12, r * 1.35); c.moveTo(r * 0.25, r * 1.05); c.lineTo(r * 0.12, r * 1.35); c.stroke();
    if (e.armor > 0) {
      const k = e.armor / e.armorMax;
      for (const s of [-1, 1]) {
        c.beginPath(); c.moveTo(0, -r * 0.95); c.quadraticCurveTo(s * r * 1.05, -r * 0.6, s * r * 0.8, r * 0.55); c.quadraticCurveTo(s * r * 0.3, r * 0.75, 0, r * 0.5); c.closePath();
        const gr = c.createLinearGradient(s * r, -r, 0, r);
        gr.addColorStop(0, lighten(e.c2, 0.5)); gr.addColorStop(0.5, e.c2); gr.addColorStop(1, darken(e.c2, 0.5));
        c.fillStyle = gr; c.globalAlpha *= 0.55 + 0.45 * k; c.fill(); c.globalAlpha = e.alpha;
        c.strokeStyle = lighten(e.c2, 0.6); c.lineWidth = 1.2; c.stroke();
      }
      c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 1; c.beginPath(); c.moveTo(0, -r * 0.95); c.lineTo(0, r * 0.5); c.stroke();
    }
  },
  fire(e, g) { shoot(g, e.x - 7, e.y + e.r, Math.PI / 2, 210, 'needle'); shoot(g, e.x + 7, e.y + e.r, Math.PI / 2, 210, 'needle'); },
});

def('raie', {
  name: 'Raie', hp: 26, r: 18, coins: 3.5, rate: 1.3, cls: 'm',
  draw(c, e, t) {
    const r = e.r, f = Math.sin(t * 5 + e.seed);
    c.strokeStyle = e.cg; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(0, -r * 0.5); c.quadraticCurveTo(Math.sin(t * 4) * 8, -r * 1.4, Math.sin(t * 3) * 6, -r * 2.1); c.stroke();
    c.beginPath(); c.moveTo(0, r * 0.9);
    c.quadraticCurveTo(r * 0.8, r * 0.4, r * 1.6, -r * 0.1 + f * r * 0.35);
    c.quadraticCurveTo(r * 0.6, -r * 0.2, 0, -r * 0.6);
    c.quadraticCurveTo(-r * 0.6, -r * 0.2, -r * 1.6, -r * 0.1 + f * r * 0.35);
    c.quadraticCurveTo(-r * 0.8, r * 0.4, 0, r * 0.9);
    c.fillStyle = bodyGrad(c, e.c1, r * 1.4, 'r'); c.fill(); c.stroke();
    c.fillStyle = rgba(e.c2, 0.85);
    for (let i = 0; i < 3; i++) for (const s of [-1, 1]) { c.beginPath(); c.arc(s * r * (0.45 + i * 0.32), -r * 0.05 + f * r * 0.1 * i, 2, 0, TAU); c.fill(); }
    c.fillStyle = '#fff'; c.beginPath(); c.arc(-r * 0.25, r * 0.5, 1.8, 0, TAU); c.arc(r * 0.25, r * 0.5, 1.8, 0, TAU); c.fill();
  },
  fire(e, g) { g.spawnEB(e.x, e.y + 8, 0, 50, 'drop'); },
});

def('phasme', {
  name: 'Phasme', hp: 30, r: 15, coins: 4, rate: 99, cls: 'm',
  init(e) { e.data.ph = rand(0, 1); },
  update(e, g, dt) {
    const d = e.data;
    if (!d.parked) { if (e.path.t > 1.5 || (e.path.hovering)) { d.parked = true; e.path = { k: 'none', t: 0 }; } return; }
    d.ph += dt;
    if (d.ph > 2.0 && d.ph < 2.3) { e.alpha = Math.max(0, 1 - (d.ph - 2) / 0.3); e.hidden = true; }
    else if (d.ph >= 2.3 && !d.jumped) {
      d.jumped = true;
      fx.ring(e.x, e.y, 2, 30, 0.3, e.cg, 2);
      e.x = rand(40, view.w - 40); e.y = view.safeT + rand(60, view.h * 0.42);
      fx.ring(e.x, e.y, 30, 2, 0.3, e.cg, 2);
    } else if (d.ph >= 2.3 && d.ph < 2.6) { e.alpha = (d.ph - 2.3) / 0.3; }
    else if (d.ph >= 2.6) {
      e.alpha = 1; e.hidden = false; d.ph = 0; d.jumped = false;
      if (nfire(g)) ring(g, e.x, e.y, 6 + Math.round(g.D.fire * 3), 120, rand(TAU), 'needle');
      d.jumps = (d.jumps || 0) + 1;
      if (d.jumps > 4) { e.path = { k: 'hover', t: 0, tx: e.x, ty: e.y, inDur: 0.01, stay: 0, exit: 'up', sway: 0 }; e.path.x0s = e.x; e.path.y0s = e.y; }
    }
  },
  draw(c, e, t) {
    const r = e.r, glitch = e.alpha < 1;
    for (let pass = glitch ? 0 : 1; pass < 2; pass++) {
      const off = pass === 0 ? Math.sin(t * 40) * 4 : 0;
      c.strokeStyle = pass === 0 ? rgba('#ff4fd8', 0.6) : e.cg; c.lineWidth = 1.6;
      c.beginPath();
      for (let i = 0; i < 3; i++) for (const s of [-1, 1]) {
        const y = -r * 0.5 + i * r * 0.5;
        c.moveTo(off + s * r * 0.2, y); c.lineTo(off + s * r * 1.0, y - r * 0.3 + Math.sin(t * 4 + i) * 3); c.lineTo(off + s * r * 1.35, y + r * 0.5);
      }
      c.stroke();
      c.beginPath(); c.moveTo(off, -r * 1.2); c.lineTo(off + r * 0.25, 0); c.lineTo(off, r * 1.2); c.lineTo(off - r * 0.25, 0); c.closePath();
      c.fillStyle = pass === 0 ? rgba('#38f2ff', 0.5) : bodyGrad(c, e.c1, r, 'ph'); c.fill();
    }
    c.fillStyle = e.c2;
    for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(0, -r * 0.5 + i * r * 0.5, 2.4, 0, TAU); c.fill(); }
  },
});

def('asteroide', {
  name: 'Astéroïde', hp: 22, r: 18, coins: 1.5, rate: 99, cls: 'm',
  init(e, g, o) {
    const d = e.data;
    if (o && o.giant) { d.giant = true; e.r = 62; e.hp = e.max = 650 * e.hpMul; e.path = { k: 'hover', t: 0, tx: view.w / 2, ty: view.safeT + view.h * 0.25, inDur: 3, stay: 14, exit: 'down', sway: 20 }; e.path.x0s = e.x; e.path.y0s = e.y; }
    else if (!d.small) { e.r = rand(14, 24); e.hp = e.max = 22 * (e.r / 18) ** 2 * e.hpMul; }
    d.rich = (o && o.rich) || d.giant;
    d.vr = rand(-1.2, 1.2);
    d.pts = []; const n = 9;
    for (let i = 0; i < n; i++) d.pts.push(0.78 + Math.random() * 0.3);
    d.cr = [[rand(-0.4, 0.4), rand(-0.4, 0.4), rand(0.12, 0.25)], [rand(-0.4, 0.4), rand(-0.4, 0.4), rand(0.1, 0.2)]];
    e.cg = d.rich ? '#38f2ff' : e.cg;
  },
  update(e, g, dt) { e.face = (e.face || 0) + e.data.vr * dt; },
  draw(c, e, t) {
    const r = e.r, d = e.data, n = d.pts.length;
    c.beginPath();
    for (let i = 0; i < n; i++) { const a = (i / n) * TAU, k = d.pts[i]; const x = Math.cos(a) * r * k, y = Math.sin(a) * r * k; if (i) c.lineTo(x, y); else c.moveTo(x, y); }
    c.closePath();
    c.fillStyle = bodyGrad(c, d.rich ? '#3a4a6a' : '#5a4a3a', r, 'a'); c.fill();
    c.strokeStyle = rgba(e.cg, 0.8); c.lineWidth = 1.4; c.stroke();
    c.fillStyle = 'rgba(0,0,0,0.3)';
    for (const [x, y, s] of d.cr) { c.beginPath(); c.arc(x * r, y * r, s * r, 0, TAU); c.fill(); }
    c.strokeStyle = e.cg; c.lineWidth = d.giant ? 3 : 1.6;
    c.beginPath(); c.moveTo(-r * 0.5, -r * 0.2); c.lineTo(-r * 0.1, r * 0.1); c.lineTo(r * 0.35, -r * 0.05); c.lineTo(r * 0.55, r * 0.3); c.stroke();
    if (d.rich) { c.fillStyle = '#bffaff'; for (let i = 0; i < (d.giant ? 7 : 2); i++) { const a = i * 2.3, rr = r * (0.3 + (i % 3) * 0.18); c.save(); c.translate(Math.cos(a) * rr, Math.sin(a) * rr); c.rotate(a); c.beginPath(); c.moveTo(0, -r * 0.14); c.lineTo(r * 0.06, 0); c.lineTo(0, r * 0.14); c.lineTo(-r * 0.06, 0); c.fill(); c.restore(); } }
  },
  death(e, g) {
    const d = e.data;
    if (d.giant) { g.dropPickup('crystals', e.x - 20, e.y, 14); g.dropPickup('gems', e.x + 20, e.y, 3); return; }
    if (e.r > 16 && !d.small) for (const s of [-1, 1]) {
      const k = g.addEnemy('asteroide', e.x + s * 8, e.y, { k: 'free' }, { data: { small: true, rich: d.rich }, child: true });
      k.r = 10; k.hp = k.max = 6 * e.hpMul; k.fvx = s * rand(50, 100); k.fvy = rand(50, 100); k.data.rich = d.rich;
    }
    if (d.rich) g.dropPickup('crystals', e.x, e.y, d.small ? 1 : 2);
    else if (chance(0.08)) g.dropPickup('crystals', e.x, e.y, 2);
  },
});

def('cristallier', {
  name: 'Cristallier', hp: 28, r: 16, coins: 3, rate: 2.8, cls: 'm',
  update(e, g, dt) { e.face = (e.face || 0) + dt * 0.8; },
  draw(c, e, t) {
    const r = e.r;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU, l = r * (0.9 + 0.35 * ((i * 7) % 3) / 2);
      c.save(); c.rotate(a);
      c.beginPath(); c.moveTo(-r * 0.22, 0); c.lineTo(0, -l * 1.1); c.lineTo(r * 0.22, 0); c.closePath();
      c.fillStyle = i % 2 ? lighten(e.c2, 0.3) : e.c2; c.fill();
      c.strokeStyle = lighten(e.c2, 0.7); c.lineWidth = 1; c.stroke();
      c.restore();
    }
    c.beginPath(); c.arc(0, 0, r * 0.45, 0, TAU); c.fillStyle = bodyGrad(c, e.c1, r * 0.5, 'cr'); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, r * 0.18 * (1 + 0.3 * Math.sin(t * 6)), 0, TAU); c.fill();
  },
  fire(e, g) { aimed(g, e.x, e.y, 170, 3, 0.25, 'shard'); },
  death(e, g) { if (!g.def.noFire) ring(g, e.x, e.y, 6, 140, e.face, 'shard'); g.dropPickup('crystals', e.x, e.y, 2); },
});

def('bulle', {
  name: 'Bulle à pièces', hp: 4, r: 14, coins: 7, rate: 99, harmless: true,
  init(e) { e.noContact = true; },
  draw(c, e, t) {
    const r = e.r;
    c.save(); c.rotate(t);
    for (let i = 0; i < 3; i++) { c.save(); c.translate(Math.cos(i * 2.1) * r * 0.4, Math.sin(i * 2.1) * r * 0.4); c.scale(Math.abs(Math.cos(t * 4 + i)), 1); drawCoin(c, r * 0.3, 1); c.restore(); }
    c.restore();
    c.beginPath(); c.arc(0, 0, r, 0, TAU);
    c.fillStyle = 'rgba(160,230,255,0.12)'; c.fill();
    c.strokeStyle = rgba('#bdf6ff', 0.8); c.lineWidth = 1.4; c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, r * 0.75, -2.5, -1.7); c.stroke();
  },
  death(e) { fx.ring(e.x, e.y, 6, 28, 0.3, '#bdf6ff', 2); sfx.squish(); },
});

def('emetteur', {
  name: 'Émetteur IEM', hp: 9999, r: 16, coins: 0, rate: 99, invul: true,
  update(e, g, dt) {
    const d = e.data;
    if (!e.path.hovering) return;
    d.cd = (d.cd || 0) - dt;
    d.a = (d.a || 0) + dt * (d.k % 2 ? 1.6 : -1.3);
    const k = d.k % 5;
    if (d.cd <= 0) {
      if (k === 0) { d.cd = 0.11; shoot(g, e.x, e.y, d.a * 2, 120); shoot(g, e.x, e.y, d.a * 2 + Math.PI, 120); }
      else if (k === 1) { d.cd = 0.75; ring(g, e.x, e.y, 14, 100, d.a); }
      else if (k === 2) { d.cd = 0.5; aimed(g, e.x, e.y, 170, 3, 0.3, 'needle'); }
      else if (k === 3) { d.cd = 0.16; shoot(g, e.x, e.y, Math.PI / 2 + Math.sin(e.t * 2.5) * 1.1, 150, 'needle'); }
      else { d.cd = 1; flower(g, e.x, e.y, 16, 130, d.a); }
    }
  },
  draw(c, e, t) {
    const r = e.r;
    c.strokeStyle = e.cg; c.lineWidth = 2;
    for (let i = 0; i < 3; i++) { c.beginPath(); c.ellipse(0, 0, r * (1.2 + i * 0.3), r * 0.35, t * (1 + i) + i, 0, TAU); c.stroke(); }
    c.beginPath(); c.arc(0, 0, r * 0.8, 0, TAU); c.fillStyle = '#1a1030'; c.fill(); c.stroke();
    eye(c, 0, 0, r * 0.6, Math.sin(t), Math.cos(t * 1.3), '#ff3f6e', 1);
  },
});

// ============ SOL ============
function socket(c, e) {
  c.fillStyle = 'rgba(0,0,0,0.45)'; c.beginPath(); c.ellipse(0, 3, e.r * 1.35, e.r * 1.15, 0, 0, TAU); c.fill();
  c.strokeStyle = rgba(e.cg, 0.45); c.lineWidth = 1.5; c.beginPath(); c.ellipse(0, 2, e.r * 1.25, e.r * 1.05, 0, 0, TAU); c.stroke();
}
function gdef(id, o) { def(id, Object.assign({ ground: true, cls: 'g' }, o)); }

gdef('tourelle', {
  name: 'Tourelle-bulbe', hp: 22, r: 15, coins: 2.5, rate: 2.4,
  update(e, g, dt) { const ta = angTo(e.x, e.y, g.player.x, g.player.y); e.data.aim = (e.data.aim ?? Math.PI / 2) + angDiff(e.data.aim ?? Math.PI / 2, ta) * Math.min(1, dt * 3); },
  draw(c, e, t) {
    const r = e.r;
    socket(c, e);
    polyPath(c, 8, r * 1.05, t * 0.2); c.fillStyle = darken(e.c1, 0.45); c.fill(); c.strokeStyle = e.cg; c.lineWidth = 1.4; c.stroke();
    c.save(); c.rotate((e.data.aim ?? Math.PI / 2) - Math.PI / 2);
    c.fillStyle = e.c2; c.fillRect(-3, 0, 6, r * 1.15);
    c.beginPath(); c.arc(0, 0, r * 0.62, 0, TAU); c.fillStyle = bodyGrad(c, e.c1, r * 0.62, 'tu'); c.fill(); c.stroke();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(0, r * 0.25, r * 0.16, 0, TAU); c.fill();
    c.restore();
  },
  fire(e, g) { const a = e.data.aim ?? Math.PI / 2; const x = e.x + Math.cos(a) * e.r, y = e.y + Math.sin(a) * e.r; aimed(g, x, y, 150, g.diff >= 1 ? 2 : 1, 0.12); },
});

gdef('fleurcanon', {
  name: 'Fleur-canon', hp: 30, r: 16, coins: 3, rate: 99,
  update(e, g, dt) {
    const d = e.data;
    d.ph = ((d.ph ?? rand(0, 3)) + dt) % 3.6;
    const open = d.ph < 2.2 ? 0 : d.ph < 2.6 ? (d.ph - 2.2) / 0.4 : d.ph < 3.3 ? 1 : 1 - (d.ph - 3.3) / 0.3;
    d.open = open;
    e.armorMul = open > 0.5 ? 1 : 0.15;
    if (d.ph >= 2.6 && !d.fired) { d.fired = true; if (nfire(g) && e.y > 0 && e.y < view.h * 0.8) flower(g, e.x, e.y, 8 + g.diff * 2, 115, rand(TAU), 'petal'); }
    if (d.ph < 2.6) d.fired = false;
  },
  draw(c, e, t) {
    const r = e.r, o = e.data.open || 0;
    socket(c, e);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + t * 0.2;
      c.save(); c.rotate(a);
      c.translate(0, -r * (0.25 + 0.45 * o));
      c.beginPath(); c.ellipse(0, -r * 0.3, r * 0.32, r * (0.55 + 0.2 * o), 0, 0, TAU);
      c.fillStyle = i % 2 ? e.c1 : lighten(e.c1, 0.2); c.fill(); c.strokeStyle = e.cg; c.lineWidth = 1.2; c.stroke();
      c.restore();
    }
    c.fillStyle = o > 0.3 ? '#ffffff' : e.c2; c.beginPath(); c.arc(0, 0, r * (0.25 + 0.15 * o), 0, TAU); c.fill();
  },
});

gdef('fouisseur', {
  name: 'Fouisseur', hp: 18, r: 13, coins: 2.5, rate: 99,
  update(e, g, dt) {
    const d = e.data;
    d.ph = ((d.ph ?? rand(0, 2)) + dt) % 3;
    const p = d.ph < 1.4 ? 0 : d.ph < 1.65 ? (d.ph - 1.4) / 0.25 : d.ph < 2.75 ? 1 : 1 - (d.ph - 2.75) / 0.25;
    d.pop = p;
    e.hidden = p < 0.35;
    if (d.ph >= 1.65 && !d.fired) { d.fired = true; if (nfire(g) && e.y > 0 && e.y < view.h * 0.8) aimed(g, e.x, e.y, 155, 3, 0.25); }
    if (d.ph < 1.4) d.fired = false;
  },
  draw(c, e, t) {
    const r = e.r, p = e.data.pop || 0;
    c.fillStyle = '#05020c'; c.beginPath(); c.ellipse(0, 2, r * 1.1, r * 0.75, 0, 0, TAU); c.fill();
    c.strokeStyle = rgba(e.cg, 0.6); c.lineWidth = 2; c.stroke();
    if (p <= 0.02) return;
    c.save(); c.scale(p, p);
    c.beginPath(); c.ellipse(0, -r * 0.2, r * 0.8, r * 0.95, 0, 0, TAU); c.fillStyle = bodyGrad(c, e.c1, r, 'fo'); c.fill(); c.strokeStyle = e.cg; c.lineWidth = 1.4; c.stroke();
    eye(c, -r * 0.3, -r * 0.35, r * 0.22, 0, 1, e.c2, 1); eye(c, r * 0.3, -r * 0.35, r * 0.22, 0, 1, e.c2, 1);
    c.fillStyle = '#fff'; c.beginPath(); c.moveTo(-r * 0.25, r * 0.2); c.lineTo(0, r * 0.45); c.lineTo(r * 0.25, r * 0.2); c.fill();
    c.restore();
  },
});

gdef('nid', {
  name: 'Nid', hp: 40, r: 20, coins: 4, rate: 99,
  update(e, g, dt) {
    const d = e.data;
    d.cd = (d.cd ?? 1.2) - dt;
    if (d.cd <= 0 && e.y > 20 && e.y < view.h * 0.75 && (d.kids || 0) < 3) {
      d.cd = 2.6;
      const k = g.addEnemy('larve', e.x, e.y, { k: 'none' }, { child: true });
      k.data.mom = e; d.kids = (d.kids || 0) + 1;
      fx.ring(e.x, e.y, 2, 20, 0.3, e.cg, 2);
    }
  },
  draw(c, e, t) {
    const r = e.r;
    socket(c, e);
    blobPath(c, r, r * 0.9, t * 0.5, 0.05, 9, e.seed); c.fillStyle = bodyGrad(c, darken(e.c1, 0.2), r, 'ni'); c.fill(); c.strokeStyle = e.cg; c.lineWidth = 1.5; c.stroke();
    for (let i = 0; i < 4; i++) {
      const a = i * 1.6 + 0.4, d = r * 0.5, p = 0.5 + 0.5 * Math.sin(t * 3 + i);
      c.fillStyle = '#0a0412'; c.beginPath(); c.arc(Math.cos(a) * d, Math.sin(a) * d, r * 0.2, 0, TAU); c.fill();
      c.fillStyle = rgba(e.c2, 0.4 + 0.6 * p); c.beginPath(); c.arc(Math.cos(a) * d, Math.sin(a) * d, r * 0.1, 0, TAU); c.fill();
    }
  },
  death(e, g) { g.dropPickup('crystals', e.x, e.y); },
});

gdef('rampeur', {
  name: 'Rampeur', hp: 20, r: 13, coins: 2.5, rate: 2.4,
  init(e) { e.data.vx = chance(0.5) ? 45 : -45; },
  update(e, g, dt) { const d = e.data; e.x += d.vx * dt; if (e.x < 30 || e.x > view.w - 30) d.vx *= -1; e.face = d.vx > 0 ? -Math.PI / 2 : Math.PI / 2; },
  draw(c, e, t) {
    const r = e.r;
    c.strokeStyle = e.cg; c.lineWidth = 2;
    for (let i = 0; i < 3; i++) for (const s of [-1, 1]) { const y = -r * 0.5 + i * r * 0.5; const k = Math.sin(t * 14 + i * 2 + (s > 0 ? Math.PI : 0)) * 4; c.beginPath(); c.moveTo(s * r * 0.5, y); c.lineTo(s * r * 1.15, y + k); c.stroke(); }
    c.beginPath(); c.ellipse(0, 0, r * 0.7, r, 0, 0, TAU); c.fillStyle = bodyGrad(c, e.c1, r, 'ra'); c.fill(); c.lineWidth = 1.5; c.stroke();
    c.fillStyle = e.c2; for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(0, -r * 0.5 + i * r * 0.45, r * 0.15, 0, TAU); c.fill(); }
  },
  fire(e, g) { aimed(g, e.x, e.y, 170, 2, 0.15, 'needle'); },
});

gdef('geode', {
  name: 'Géode', hp: 25, r: 16, coins: 1, rate: 99,
  init(e) { e.cg = '#7df9ff'; },
  draw(c, e, t) {
    const r = e.r;
    socket(c, e);
    polyPath(c, 7, r, 0.3); c.fillStyle = '#2a2440'; c.fill(); c.strokeStyle = '#6a6090'; c.lineWidth = 1.2; c.stroke();
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i - 2) * 0.5, l = r * (0.8 + (i % 2) * 0.4);
      c.save(); c.rotate(a + Math.PI / 2); c.beginPath(); c.moveTo(-4, 0); c.lineTo(0, -l); c.lineTo(4, 0); c.closePath();
      c.fillStyle = i % 2 ? '#7df9ff' : '#38c8ff'; c.fill(); c.strokeStyle = '#e0ffff'; c.lineWidth = 0.8; c.stroke(); c.restore();
    }
    c.fillStyle = rgba('#ffffff', 0.5 + 0.5 * Math.sin(t * 4 + e.seed)); c.beginPath(); c.arc(-3, -r * 0.4, 1.8, 0, TAU); c.fill();
  },
  death(e, g) { g.dropPickup('crystals', e.x, e.y, 3); if (chance(0.12)) g.dropPickup('gems', e.x, e.y); },
});

gdef('canon', {
  name: 'Canon lourd', hp: 55, r: 20, coins: 5, rate: 3.2,
  update(e, g, dt) { const ta = angTo(e.x, e.y, g.player.x, g.player.y); e.data.aim = (e.data.aim ?? Math.PI / 2) + angDiff(e.data.aim ?? Math.PI / 2, ta) * Math.min(1, dt * 2); },
  draw(c, e, t) {
    const r = e.r;
    socket(c, e);
    polyPath(c, 6, r * 1.1, 0); c.fillStyle = darken(e.c1, 0.5); c.fill(); c.strokeStyle = e.cg; c.lineWidth = 1.5; c.stroke();
    c.save(); c.rotate((e.data.aim ?? Math.PI / 2) - Math.PI / 2);
    c.fillStyle = e.c2; c.fillRect(-8, 0, 5, r * 1.3); c.fillRect(3, 0, 5, r * 1.3);
    c.beginPath(); c.arc(0, 0, r * 0.7, 0, TAU); c.fillStyle = bodyGrad(c, e.c1, r * 0.7, 'ca'); c.fill(); c.stroke();
    c.fillStyle = '#ff3f6e'; c.beginPath(); c.arc(0, 0, r * 0.22, 0, TAU); c.fill();
    c.restore();
  },
  fire(e, g) {
    burst(g, e, 3, 0.12, () => { const a = e.data.aim ?? Math.PI / 2; for (const s of [-5, 5]) shoot(g, e.x + Math.cos(a + Math.PI / 2) * s + Math.cos(a) * e.r, e.y + Math.sin(a + Math.PI / 2) * s + Math.sin(a) * e.r, a, 175, 'orb'); });
  },
});

export { TMP };
