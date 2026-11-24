// Anomalies : événements surprises qui changent le cours d'un niveau
import { TAU, rand, dist2, angTo, rgba, lighten, darken, chance } from '../engine/math.js';
import { view, ctx, baseT, setT, flash, addShake } from '../engine/renderer.js';
import { fx } from '../engine/particles.js';
import { glow, sprite } from '../engine/sprites.js';
import { ENEMIES } from './enemies.js';
import { ICONS, drawNovaStar, bodyGrad } from './art.js';
import { makePickup } from './pickups.js';
import { sfx } from '../audio/sfx.js';

// ---------- Ennemis spéciaux d'événements ----------
ENEMIES.meteore = {
  id: 'meteore', name: 'Météore', hp: 14, r: 12, coins: 1.5, rate: 99, cls: 's',
  update(e, g, dt) { e.face = (e.face || 0) + dt * 5; if (Math.random() < 0.8) fx.dot(e.x - e.fvx * 0.02, e.y - e.fvy * 0.02, rand(-20, 20), rand(-20, 20), 0.35, 9, '#ff9d3c'); },
  draw(c, e, t) {
    c.beginPath(); for (let i = 0; i < 7; i++) { const a = (i / 7) * TAU, k = 0.8 + ((i * 37) % 5) / 12; c.lineTo(Math.cos(a) * e.r * k, Math.sin(a) * e.r * k); } c.closePath();
    c.fillStyle = bodyGrad(c, '#6a3a20', e.r, 'met'); c.fill(); c.strokeStyle = '#ffb060'; c.lineWidth = 1.5; c.stroke();
  },
  death(e, g) { if (chance(0.6)) g.dropPickup('crystals', e.x, e.y); },
};
ENEMIES.comete = {
  id: 'comete', name: 'Comète dorée', hp: 70, r: 14, coins: 30, rate: 99, cls: 'm',
  init(e) { e.noContact = true; e.cg = '#ffd23f'; },
  update(e, g, dt) { for (let i = 0; i < 2; i++) fx.dot(e.x + rand(-4, 4), e.y + rand(-4, 4), -e.fvx * 0.6 + rand(-30, 30), rand(-30, 30), 0.6, 8, i ? '#ffd23f' : '#ffffff'); },
  onHit(e, g) { if (Math.random() < 0.45) { const k = makePickup('coin', e.x, e.y, Math.max(1, Math.round(2 * g.D.loot))); g.pickups.push(k); } },
  draw(c, e, t) { c.fillStyle = '#fff6c8'; c.beginPath(); c.arc(0, 0, e.r * 0.8, 0, TAU); c.fill(); c.strokeStyle = '#ffd23f'; c.lineWidth = 3; c.stroke(); },
  death(e, g) { g.dropCoins(e.x, e.y, 40 * g.D.loot); g.dropPickup('gems', e.x, e.y); fx.text(e.x, e.y - 20, 'COMÈTE DORÉE !', '#ffd23f', 16); sfx.gem(); },
};
ENEMIES.grossebulle = {
  id: 'grossebulle', name: 'Bulle de cristal', hp: 30, r: 26, coins: 4, rate: 99, cls: 'm',
  init(e) { e.noContact = true; e.data.item = e.data.item || 'shield'; },
  draw(c, e, t) {
    const r = e.r;
    c.save(); c.rotate(t);
    if (e.data.item === 'nova') drawNovaStar(c, 12, t); else ICONS[e.data.item](c, 11);
    c.restore();
    c.beginPath(); c.arc(0, 0, r, 0, TAU);
    c.fillStyle = 'rgba(160,240,255,0.1)'; c.fill();
    c.strokeStyle = `hsla(${(t * 120) % 360},100%,75%,0.9)`; c.lineWidth = 2; c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, r * 0.78, -2.6, -1.8); c.stroke();
  },
  death(e, g) { g.dropPickup(e.data.item, e.x, e.y); for (let i = 0; i < 3; i++) g.dropPickup('crystals', e.x + rand(-12, 12), e.y + rand(-12, 12)); fx.ring(e.x, e.y, 10, 60, 0.4, '#bdf6ff', 3); sfx.crystal(); },
};
for (const k of ['meteore', 'comete', 'grossebulle']) Object.assign(ENEMIES[k], { id: k });

// ---------- Définitions ----------
const EV = {
  meteors: {
    name: 'PLUIE DE MÉTÉORES', color: '#ff9d3c', dur: 9,
    start(g, ev) { ev.cd = 0.4; ev.warn = []; },
    update(g, ev, dt) {
      ev.cd -= dt;
      if (ev.cd <= 0 && ev.t < ev.dur - 1) {
        ev.cd = rand(0.45, 0.75);
        const x = Math.random() < 0.4 ? g.player.x + rand(-60, 60) : rand(20, view.w - 20);
        ev.warn.push({ x, a: Math.PI / 2 + rand(-0.35, 0.35), t: 0.85 });
      }
      for (let i = ev.warn.length - 1; i >= 0; i--) {
        const w = ev.warn[i]; w.t -= dt;
        if (w.t <= 0) {
          ev.warn.splice(i, 1);
          const sx = w.x - Math.cos(w.a) * 60, sy = view.safeT - 30 - Math.sin(w.a) * 60;
          const m = g.addEnemy('meteore', sx, sy, { k: 'free' }, { child: true });
          m.fvx = Math.cos(w.a) * 430; m.fvy = Math.sin(w.a) * 430; m.r = rand(10, 15);
        }
      }
    },
    drawFront(g, ev) {
      ctx.lineWidth = 2; ctx.setLineDash([10, 8]);
      for (const w of ev.warn) {
        ctx.strokeStyle = rgba('#ff4f3c', (Math.sin(w.t * 30) * 0.5 + 0.5) * 0.8);
        ctx.beginPath(); ctx.moveTo(w.x, view.safeT); ctx.lineTo(w.x + Math.cos(w.a) * 1400, view.safeT + Math.sin(w.a) * 1400); ctx.stroke();
      }
      ctx.setLineDash([]);
    },
  },
  goldcomet: {
    name: 'COMÈTE DORÉE', color: '#ffd23f', dur: 8,
    start(g, ev) {
      const s = Math.random() < 0.5 ? 1 : -1;
      const e = g.addEnemy('comete', s > 0 ? -30 : view.w + 30, view.safeT + view.h * rand(0.15, 0.3), { k: 'free' }, { child: true });
      e.fvx = s * 95; e.fvy = 8; e.hp = e.max = 70 * g.D.hp;
    },
  },
  eclipse: {
    name: 'ÉCLIPSE', color: '#b0a0ff', dur: 10, coinMul: 1.5,
    drawFront(g, ev) {
      const a = Math.min(1, ev.t / 1, (ev.dur - ev.t) / 1) * 0.9;
      if (a <= 0) return;
      const R = 170;
      const s = sprite('eclipse', R * 2, R * 2, (c) => {
        const gr = c.createRadialGradient(R, R, 0, R, R, R);
        gr.addColorStop(0, 'rgba(2,1,8,0)'); gr.addColorStop(0.5, 'rgba(2,1,8,0.35)'); gr.addColorStop(1, 'rgba(2,1,8,1)');
        c.fillStyle = gr; c.fillRect(0, 0, R * 2, R * 2);
      }, 0.3);
      const p = g.player, x = p.x, y = p.y;
      ctx.globalAlpha = a;
      ctx.drawImage(s.c, x - R, y - R, R * 2, R * 2);
      ctx.fillStyle = '#020108';
      ctx.fillRect(-20, -20, view.w + 40, y - R + 20);
      ctx.fillRect(-20, y + R, view.w + 40, view.h - y - R + 40);
      ctx.fillRect(-20, y - R - 1, x - R + 20, R * 2 + 2);
      ctx.fillRect(x + R, y - R - 1, view.w - x - R + 20, R * 2 + 2);
      ctx.globalAlpha = 1;
    },
  },
  gravity: {
    name: 'PUITS GRAVITATIONNEL', color: '#c8a2ff', dur: 9,
    start(g, ev) { ev.x = Math.random() < 0.5 ? 70 : view.w - 70; ev.y = view.safeT + view.h * rand(0.25, 0.4); ev.k = 0; },
    update(g, ev, dt) {
      ev.k = Math.min(1, ev.t / 1.2, (ev.dur - ev.t) / 0.8);
      g.well = { x: ev.x, y: ev.y, s: 6 * ev.k };
      const R = 14;
      for (const b of g.ebs) {
        if (b.dead) continue;
        const dx = ev.x - b.x, dy = ev.y - b.y, d = Math.hypot(dx, dy) + 1;
        const f = (14000 * ev.k) / (d + 40);
        b.vx += (dx / d) * f * dt; b.vy += (dy / d) * f * dt;
        if (d < R) { b.dead = true; const k = makePickup('coin', ev.x, ev.y, Math.max(1, Math.round(g.D.loot))); k.attract = true; g.pickups.push(k); }
      }
      if (ev.t >= ev.dur - dt) g.well = null;
    },
    end(g) { g.well = null; },
    drawBack(g, ev) {
      const k = ev.k || 0, x = ev.x, y = ev.y, t = ev.t;
      ctx.globalCompositeOperation = 'lighter';
      const s = glow('#c8a2ff', 32);
      ctx.globalAlpha = 0.6 * k; ctx.drawImage(s.c, x - 110, y - 110, 220, 220);
      ctx.globalAlpha = k;
      for (let i = 0; i < 3; i++) { ctx.strokeStyle = i ? '#ff9d3c' : '#ffffff'; ctx.lineWidth = 3 - i; ctx.beginPath(); ctx.ellipse(x, y, 60 - i * 12, 16 - i * 3, t * (1 + i * 0.4), 0, TAU); ctx.stroke(); }
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(x, y, 16 * k, 0, TAU); ctx.fill();
      ctx.strokeStyle = rgba('#ffffff', 0.7 * k); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, 18 * k, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 1;
    },
  },
  leviathan: {
    name: 'LÉVIATHAN EN VUE', color: '#7df9ff', dur: 16,
    start(g, ev) { ev.s = Math.random() < 0.5 ? 1 : -1; ev.cd = 2; },
    update(g, ev, dt) {
      const u = ev.t / ev.dur;
      ev.x = ev.s > 0 ? -320 + u * (view.w + 640) : view.w + 320 - u * (view.w + 640);
      ev.y = view.h * (0.62 - u * 0.35);
      ev.cd -= dt;
      if (ev.cd <= 0) { ev.cd = 2.2; if (ev.x > 20 && ev.x < view.w - 20) g.dropPickup('crystals', ev.x + rand(-60, 60), ev.y + rand(-10, 20)); }
    },
    drawBack(g, ev) {
      if (ev.x === undefined) return;
      const x = ev.x, y = ev.y, t = ev.t, s = ev.s;
      ctx.save(); ctx.translate(x, y); ctx.scale(s, 1); ctx.rotate(-0.25);
      ctx.globalAlpha = 0.5;
      const gr = ctx.createLinearGradient(0, -70, 0, 70);
      gr.addColorStop(0, rgba(g.pal.neb2, 0.9)); gr.addColorStop(1, rgba(darken(g.pal.neb1, 0.6), 0.9));
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.moveTo(220, 0); ctx.bezierCurveTo(180, -80, -120, -90, -220, -10); ctx.quadraticCurveTo(-290, -60 + Math.sin(t * 2) * 30, -320, -40 + Math.sin(t * 2) * 40); ctx.quadraticCurveTo(-280, 0, -320, 40 + Math.sin(t * 2) * 40); ctx.quadraticCurveTo(-260, 30, -220, 20); ctx.bezierCurveTo(-120, 90, 180, 70, 220, 0); ctx.fill();
      ctx.beginPath(); ctx.moveTo(40, 40); ctx.quadraticCurveTo(0, 110 + Math.sin(t * 1.5) * 15, -60, 100); ctx.quadraticCurveTo(-20, 60, -20, 40); ctx.fill();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.8;
      const sp = glow('#7df9ff', 16);
      for (let i = 0; i < 16; i++) { const px = 180 - i * 25, py = Math.sin(i * 0.9) * 22 + 10; const r = 5 + 3 * Math.sin(t * 3 + i); ctx.drawImage(sp.c, px - r, py - r, r * 2, r * 2); }
      ctx.drawImage(glow('#ffffff', 16).c, 165, -22, 18, 18);
      ctx.restore();
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    },
  },
  storm: {
    name: 'TEMPÊTE IONIQUE', color: '#9fe8ff', dur: 8.5,
    start(g, ev) { ev.cd = 0.6; ev.cols = []; ev.bolts = []; },
    update(g, ev, dt) {
      ev.cd -= dt;
      if (ev.cd <= 0 && ev.t < ev.dur - 1) { ev.cd = rand(0.7, 1.0); ev.cols.push({ x: Math.random() < 0.5 ? g.player.x + rand(-30, 30) : rand(20, view.w - 20), t: 0.9 }); }
      for (let i = ev.cols.length - 1; i >= 0; i--) {
        const c = ev.cols[i]; c.t -= dt;
        if (c.t <= 0) {
          ev.cols.splice(i, 1);
          g.strike(c.x, view.h, '#d8f6ff', true);
          flash('#d8f6ff', 0.25); addShake(0.25); sfx.thunder();
          if (g.player.alive && Math.abs(g.player.x - c.x) < 19) g.player.hurt();
          g.forTargets((t) => { if (!t.isPart && Math.abs(t.x - c.x) < 20 + t.r) g.hitTarget(t, 60 * g.D.hp, t.x, t.y); });
          g.cancelBullets({ x: c.x, rect: 20, all: true }, true);
        }
      }
    },
    drawFront(g, ev) {
      for (const c of ev.cols) {
        const a = (1 - c.t / 0.9) * 0.5 + 0.15 * Math.sin(c.t * 40);
        ctx.fillStyle = rgba('#9fe8ff', Math.max(0, a * 0.35));
        ctx.fillRect(c.x - 19, 0, 38, view.h);
        ctx.strokeStyle = rgba('#ffffff', Math.max(0, a)); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(c.x - 19, 0); ctx.lineTo(c.x - 19, view.h); ctx.moveTo(c.x + 19, 0); ctx.lineTo(c.x + 19, view.h); ctx.stroke();
      }
    },
  },
  rift: {
    name: 'FISSURE AUX TRÉSORS', color: '#ffd23f', dur: 6.5,
    start(g, ev) { ev.cd = 0.3; ev.n = 0; ev.x = view.w * rand(0.3, 0.7); ev.y = view.safeT + view.h * 0.12; },
    update(g, ev, dt) {
      ev.cd -= dt;
      if (ev.cd <= 0 && ev.t < ev.dur - 1) {
        ev.cd = 0.45; ev.n++;
        const type = ev.n % 4 === 0 ? 'mimique' : 'bulle';
        const e = g.addEnemy(type, ev.x, ev.y, { k: 'free' }, { child: true });
        if (type === 'bulle') { e.fvx = rand(-90, 90); e.fvy = rand(40, 90); } else { e.path = { k: 'none', t: 0 }; }
      }
    },
    drawBack(g, ev) {
      const k = Math.min(1, ev.t * 2, (ev.dur - ev.t) * 2);
      ctx.globalCompositeOperation = 'lighter';
      const s = glow('#ffd23f', 32);
      ctx.globalAlpha = 0.8 * k; ctx.drawImage(s.c, ev.x - 50, ev.y - 70, 100, 140);
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3 * k; ctx.beginPath();
      for (let i = 0; i <= 8; i++) { const y = ev.y - 50 + i * 12.5; const x = ev.x + Math.sin(i * 2.3 + ev.t * 8) * 6 * k; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    },
  },
  crystalbubble: {
    name: 'BULLE DE CRISTAL', color: '#bdf6ff', dur: 2,
    start(g) {
      const r = Math.random();
      const item = r < 0.22 ? 'nova' : r < 0.42 ? 'shield' : r < 0.6 ? 'magnet' : r < 0.78 ? 'heart' : 'power';
      const e = g.addEnemy('grossebulle', view.w * rand(0.25, 0.75), -30, { k: 'dive', spd: 45, amp: 30, f: 1, ph: 0 }, { data: { item }, child: true });
      e.hp = e.max = 30 * g.D.hp;
    },
  },
  supernova: {
    name: 'SUPERNOVA !', color: '#ffffff', dur: 3.5,
    start(g, ev) { ev.x = view.w * rand(0.2, 0.8); ev.y = view.safeT + view.h * rand(0.05, 0.2); ev.boom = false; },
    update(g, ev, dt) {
      if (!ev.boom && ev.t > 1.2) {
        ev.boom = true;
        flash('#ffffff', 0.7); addShake(0.5); sfx.explode(5);
        const n = g.cancelBullets(null, true);
        g.forTargets((t) => { if (!t.isPart) g.hitTarget(t, t.max * 0.25, t.x, t.y); });
        if (n > 5) g.msg(`${n} tirs pulvérisés !`, '#ffffff', 15, 1.2);
      }
    },
    drawBack(g, ev) {
      ctx.globalCompositeOperation = 'lighter';
      const s = glow('#ffffff', 32);
      const k = ev.t < 1.2 ? ev.t / 1.2 : Math.max(0, 1 - (ev.t - 1.2) / 2.3);
      const r = 20 + k * 120;
      ctx.globalAlpha = k; ctx.drawImage(s.c, ev.x - r, ev.y - r, r * 2, r * 2);
      ctx.drawImage(glow(g.pal.neb2, 32).c, ev.x - r * 2, ev.y - r * 2, r * 4, r * 4);
      if (ev.t > 1.2) { const R = (ev.t - 1.2) * 700; ctx.strokeStyle = '#ffffff'; ctx.globalAlpha = Math.max(0, 1 - (ev.t - 1.2) / 2); ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(ev.x, ev.y, R, 0, TAU); ctx.stroke(); }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    },
  },
  swarm: {
    name: 'BANC DE LUMIFLÈCHES', color: '#7dffcf', dur: 8,
    start(g, ev) {
      ev.s = Math.random() < 0.5 ? 1 : -1; ev.fish = []; ev.cd = 0.5;
      for (let i = 0; i < 30; i++) ev.fish.push({ ox: rand(-160, 0), oy: rand(-60, 60), ph: rand(TAU), sz: rand(0.7, 1.3) });
    },
    update(g, ev, dt) {
      ev.cx = ev.s > 0 ? -60 + ev.t * 70 : view.w + 60 - ev.t * 70;
      ev.cy = view.safeT + view.h * 0.4 + Math.sin(ev.t * 0.8) * 60;
      ev.cd -= dt;
      if (ev.cd <= 0) { ev.cd = 0.35; const f = ev.fish[Math.floor(Math.random() * ev.fish.length)]; const x = ev.cx + f.ox * ev.s, y = ev.cy + f.oy; if (x > 10 && x < view.w - 10) { const k = makePickup('coin', x, y, Math.max(1, Math.round(g.D.loot))); g.pickups.push(k); } }
    },
    drawBack(g, ev) {
      if (ev.cx === undefined) return;
      ctx.globalCompositeOperation = 'lighter';
      const s = glow('#7dffcf', 16);
      for (const f of ev.fish) {
        const x = ev.cx + f.ox * ev.s + Math.sin(ev.t * 3 + f.ph) * 8, y = ev.cy + f.oy + Math.cos(ev.t * 2 + f.ph) * 10;
        ctx.globalAlpha = 0.7; ctx.drawImage(s.c, x - 7 * f.sz, y - 7 * f.sz, 14 * f.sz, 14 * f.sz);
        ctx.fillStyle = '#e8fff8'; ctx.beginPath(); ctx.ellipse(x, y, 5 * f.sz, 2 * f.sz, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x - ev.s * 4 * f.sz, y); ctx.lineTo(x - ev.s * 9 * f.sz, y - 3 * f.sz); ctx.lineTo(x - ev.s * 9 * f.sz, y + 3 * f.sz); ctx.fill();
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    },
  },
};
export const EVENT_INFO = EV;

export class Events {
  constructor(g) { this.g = g; this.list = []; }
  start(id) {
    const E = EV[id];
    if (!E) return;
    const ev = { id, E, t: 0, dur: E.dur };
    this.list.push(ev);
    if (E.start) E.start(this.g, ev);
    this.g.msg(E.name, E.color, 22, 1.8, true);
    this.g.radio('ev_' + id);
    sfx.warning && id === 'storm' ? sfx.thunder() : sfx.power();
  }
  coinMul() { let m = 1; for (const ev of this.list) if (ev.E.coinMul) m *= ev.E.coinMul; return m; }
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const ev = this.list[i];
      ev.t += dt;
      if (ev.E.update) ev.E.update(this.g, ev, dt);
      if (ev.t >= ev.dur) { if (ev.E.end) ev.E.end(this.g, ev); this.list.splice(i, 1); }
    }
  }
  drawBack() { baseT(); for (const ev of this.list) if (ev.E.drawBack) ev.E.drawBack(this.g, ev); }
  drawFront() { baseT(); for (const ev of this.list) if (ev.E.drawFront) ev.E.drawFront(this.g, ev); }
}
