// Armadas : aliens d'artillerie qui tiennent la position et tirent missiles, lasers et obus
import { TAU, rand, angTo, angDiff, dist2, rgba, lighten, darken } from '../engine/math.js';
import { view } from '../engine/renderer.js';
import { fx } from '../engine/particles.js';
import { ENEMIES } from './enemies.js';
import { blobPath, polyPath, starPath, eye, bodyGrad, tentacle } from './art.js';
import { aimed, ring, shoot } from './patterns.js';
import { sfx } from '../audio/sfx.js';

function def(id, o) { ENEMIES[id] = Object.assign({ id, hp: 10, r: 12, coins: 1, rate: 3, cls: 's' }, o); }

// Canonnier : lance des missiles à tête chercheuse (destructibles)
def('canonnier', {
  name: 'Canonnier', hp: 15, r: 13, coins: 1.6, rate: 4.6,
  draw(c, e, t) {
    const r = e.r;
    for (const s of [-1, 1]) {
      c.fillStyle = darken(e.c2, 0.4); c.fillRect(s * r * 0.95 - 3, -r * 0.2, 6, r * 1.1);
      c.fillStyle = e.cg; c.fillRect(s * r * 0.95 - 3, r * 0.75, 6, 2.5);
    }
    polyPath(c, 6, r, Math.PI / 6);
    c.fillStyle = bodyGrad(c, e.c1, r, 'cn'); c.fill();
    c.strokeStyle = e.cg; c.lineWidth = 1.6; c.stroke();
    polyPath(c, 6, r * 0.55, Math.PI / 6); c.fillStyle = darken(e.c1, 0.5); c.fill();
    const k = 0.5 + 0.5 * Math.sin(t * 6 + e.seed);
    c.fillStyle = rgba('#ff3f6e', 0.6 + 0.4 * k); c.beginPath(); c.arc(0, r * 0.1, r * 0.28, 0, TAU); c.fill();
    c.fillStyle = '#ffffff'; c.beginPath(); c.arc(-r * 0.08, 0, r * 0.1, 0, TAU); c.fill();
  },
  fire(e, g) {
    if (e.y > view.h * 0.6) return;
    const m = g.addEnemy('emissile', e.x + rand(-6, 6), e.y + e.r, { k: 'none' }, { child: true });
    if (m) { m.data.a = Math.PI / 2 + rand(-0.4, 0.4); m.hp = m.max = 2 + g.D.hp; }
    sfx.missile();
  },
});

// Missile ennemi : poursuit lentement le joueur, peut être abattu
def('emissile', {
  name: 'Missile', hp: 3, r: 6, coins: 0.2, rate: 99, cls: 'xs',
  init(e) { e.data.a = Math.PI / 2; e.noLoot = false; },
  update(e, g, dt) {
    const d = e.data;
    const life = e.t;
    if (life < 4.5 && g.player.alive) {
      const ta = angTo(e.x, e.y, g.player.x, g.player.y);
      d.a += Math.max(-1.7 * dt, Math.min(1.7 * dt, angDiff(d.a, ta)));
    }
    const sp = Math.min(170, 60 + life * 70) * g.D.bspd;
    e.x += Math.cos(d.a) * sp * dt; e.y += Math.sin(d.a) * sp * dt;
    e.face = d.a - Math.PI / 2;
    if (Math.random() < 0.8) fx.dot(e.x - Math.cos(d.a) * 7, e.y - Math.sin(d.a) * 7, rand(-15, 15), rand(-15, 15), 0.3, 6, '#ff8a3c');
    if (life > 7) e.gone = true;
  },
  draw(c, e, t) {
    c.fillStyle = '#e8e8f8'; c.beginPath(); c.moveTo(0, 8); c.lineTo(3, 2); c.lineTo(3, -6); c.lineTo(-3, -6); c.lineTo(-3, 2); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(30,0,20,0.9)'; c.lineWidth = 1.2; c.stroke();
    c.fillStyle = '#ff3f6e'; c.beginPath(); c.moveTo(0, 9); c.lineTo(3, 3); c.lineTo(-3, 3); c.closePath(); c.fill();
    c.fillStyle = darken('#ff3f6e', 0.3); c.fillRect(-5, -6, 2, 4); c.fillRect(3, -6, 2, 4);
    const f = 0.7 + 0.3 * Math.sin(t * 50);
    c.fillStyle = '#ffd28a'; c.beginPath(); c.ellipse(0, -8, 2, 3.5 * f, 0, 0, TAU); c.fill();
  },
});

// Lanceur : œil-cristal qui tire un laser télégraphié
def('lanceur', {
  name: 'Lanceur', hp: 32, r: 16, coins: 3.5, rate: 5.6, cls: 'm',
  draw(c, e, t) {
    const r = e.r;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + Math.PI / 4 + Math.sin(t * 1.5) * 0.1;
      c.save(); c.rotate(a);
      c.beginPath(); c.moveTo(r * 0.5, -r * 0.25); c.lineTo(r * 1.35, 0); c.lineTo(r * 0.5, r * 0.25); c.closePath();
      c.fillStyle = lighten(e.c2, 0.2); c.fill(); c.strokeStyle = lighten(e.c2, 0.7); c.lineWidth = 1; c.stroke();
      c.restore();
    }
    c.beginPath(); c.arc(0, 0, r * 0.78, 0, TAU);
    c.fillStyle = bodyGrad(c, e.c1, r * 0.8, 'la'); c.fill(); c.strokeStyle = e.cg; c.lineWidth = 1.8; c.stroke();
    const charging = e.data.charge > 0;
    eye(c, 0, r * 0.05, r * 0.48, 0, 0.8, charging ? '#ffffff' : '#ff2a6a', 1);
  },
  update(e, g, dt) { if (e.data.charge > 0) { e.data.charge -= dt; if (Math.random() < 0.6) fx.dot(e.x + rand(-6, 6), e.y + e.r, 0, 0, 0.2, 5, g.pal.bullet); } },
  fire(e, g) {
    if (e.y > view.h * 0.55) return;
    const a = g.diff >= 1 && Math.random() < 0.5 ? angTo(e.x, e.y, g.player.x, g.player.y) : Math.PI / 2;
    g.addLaser(e.x, e.y + e.r * 0.5, a, 1.0, 0.55, 11, g.pal.bullet);
    g.hazards[g.hazards.length - 1].src = e;
    e.data.charge = 1.0;
  },
});

// Mortier : lance des obus en cloche qui éclatent en anneau à l'impact
def('mortier', {
  name: 'Mortier', hp: 17, r: 13, coins: 1.8, rate: 4.2,
  draw(c, e, t) {
    const r = e.r;
    c.fillStyle = darken(e.c2, 0.3); c.beginPath(); c.ellipse(0, r * 0.35, r * 1.05, r * 0.6, 0, 0, TAU); c.fill();
    c.strokeStyle = e.cg; c.lineWidth = 1.4; c.stroke();
    const rec = e.data.rec || 0;
    c.fillStyle = '#2a2040'; c.fillRect(-r * 0.32, r * 0.1 - rec * 4, r * 0.64, r * 0.95);
    c.strokeStyle = e.cg; c.strokeRect(-r * 0.32, r * 0.1 - rec * 4, r * 0.64, r * 0.95);
    blobPath(c, r * 0.75, r * 0.62, t, 0.05, 8, e.seed);
    c.fillStyle = bodyGrad(c, e.c1, r * 0.8, 'mo'); c.fill(); c.strokeStyle = e.cg; c.lineWidth = 1.5; c.stroke();
    c.fillStyle = '#ffd23f'; c.beginPath(); c.arc(-r * 0.25, -r * 0.15, 2, 0, TAU); c.arc(r * 0.25, -r * 0.15, 2, 0, TAU); c.fill();
  },
  update(e, g, dt) { e.data.rec = Math.max(0, (e.data.rec || 0) - dt * 3); },
  fire(e, g) {
    if (e.y > view.h * 0.55) return;
    const b = g.addEnemy('obus', e.x, e.y + e.r, { k: 'none' }, { child: true });
    if (b) { b.data.sx = e.x; b.data.sy = e.y + e.r; b.data.tx = g.player.x + rand(-30, 30); b.data.ty = g.player.y + rand(-50, 0); b.data.dur = 1.3; }
    e.data.rec = 1; sfx.shot(1);
  },
});
def('obus', {
  name: 'Obus', hp: 3, r: 7, coins: 0.2, rate: 99, cls: 'xs',
  init(e) { e.noContact = false; },
  update(e, g, dt) {
    const d = e.data, u = Math.min(1, e.t / d.dur);
    e.x = d.sx + (d.tx - d.sx) * u;
    e.y = d.sy + (d.ty - d.sy) * u - Math.sin(u * Math.PI) * 120;
    e.scale = 1 + Math.sin(u * Math.PI) * 0.6;
    if (u >= 1) {
      e.dead = true;
      if (!g.def.noFire) ring(g, e.x, e.y, 8 + g.diff * 2, 110, rand(TAU), 'orb');
      fx.ring(e.x, e.y, 4, 50, 0.35, g.pal.bullet, 3); fx.flash(e.x, e.y, 30, 0.25, g.pal.bullet);
      sfx.explode(1);
    }
  },
  draw(c, e, t) {
    c.fillStyle = '#20102a'; c.beginPath(); c.arc(0, 0, e.r, 0, TAU); c.fill();
    c.strokeStyle = '#ff3f6e'; c.lineWidth = 2; c.stroke();
    c.fillStyle = Math.sin(t * 30) > 0 ? '#ffffff' : '#ff3f6e'; c.beginPath(); c.arc(0, 0, e.r * 0.4, 0, TAU); c.fill();
  },
});

// Marqueur de cible au sol pour les obus (dessiné par le jeu)
export const ARMADA_ROWS = [
  ['globule', 'tournoyeur', 'mortier'],
  ['canonnier', 'globule', 'mortier'],
  ['lanceur', 'canonnier', 'spore'],
];
