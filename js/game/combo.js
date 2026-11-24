// Constellations : les éliminations enchaînées tracent des lignes qui s'embrasent
import { TAU, rand, rgba, lighten } from '../engine/math.js';
import { ctx, baseT, flash, addShake } from '../engine/renderer.js';
import { fx } from '../engine/particles.js';
import { glow } from '../engine/sprites.js';
import { sfx } from '../audio/sfx.js';

const NAMES = ['du Héron', 'du Lynx', 'de la Chimère', 'du Phare', 'du Serpent d’Or', 'de la Lyre brisée', 'de la Comète rieuse', 'du Cerf-Volant', 'du Tisserand', 'du Gardien', 'de la Baleine', 'de la Licorne', 'du Navire perdu', 'de la Couronne', 'du Faucon', 'de l’Horloger', 'du Renard bleu', 'de la Harpe', 'du Dragon pâle', 'de l’Œil ouvert', 'des Jumeaux', 'du Colibri', 'de la Méduse', 'du Voyageur'];
export const CHAIN_N = 8;

function hull(pts) {
  const p = pts.slice().sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  up.pop(); lo.pop();
  return lo.concat(up);
}
function inside(h, x, y) {
  if (h.length < 3) return false;
  let sign = 0;
  for (let i = 0; i < h.length; i++) {
    const a = h[i], b = h[(i + 1) % h.length];
    const c = (b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x);
    if (c !== 0) { const s = c > 0 ? 1 : -1; if (sign && s !== sign) return false; sign = s; }
  }
  return true;
}
function area(h) { let a = 0; for (let i = 0; i < h.length; i++) { const p = h[i], q = h[(i + 1) % h.length]; a += p.x * q.y - q.x * p.y; } return Math.abs(a) / 2; }

export class Constellation {
  constructor(g) { this.g = g; this.pts = []; this.timer = 0; this.chain = 0; this.ignited = []; this.fading = []; }
  kill(x, y) {
    const g = this.g;
    if (this.timer <= 0) { if (this.pts.length) this.fading.push({ pts: this.pts, t: 0.5 }); this.pts = []; this.chain = 0; }
    this.timer = 1.3;
    this.chain++;
    g.stats.maxChain = Math.max(g.stats.maxChain, this.chain);
    this.pts.push({ x, y, t: 0 });
    sfx.link(this.pts.length);
    if (this.pts.length >= CHAIN_N) this.ignite();
    else if (this.chain >= 5 && this.chain % 5 === 0) fx.text(x, y - 20, 'CHAÎNE ×' + this.chain, '#ffffff', 13);
  }
  ignite() {
    const g = this.g;
    let h = hull(this.pts);
    let poly = h;
    let cx = 0, cy = 0;
    for (const p of this.pts) { cx += p.x; cy += p.y; }
    cx /= this.pts.length; cy /= this.pts.length;
    if (h.length < 3 || area(h) < 2500) {
      poly = [];
      for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; poly.push({ x: cx + Math.cos(a) * 70, y: cy + Math.sin(a) * 70 }); }
    }
    const name = 'Constellation ' + NAMES[Math.floor(Math.random() * NAMES.length)];
    this.ignited.push({ poly, pts: this.pts, t: 0, name, cx, cy });
    // Effets : dégâts à l'intérieur, tirs ennemis transformés en trésor
    const dmg = 45 * g.D.hp;
    g.forTargets((t) => { if (inside(poly, t.x, t.y)) g.hitTarget(t, t.isPart ? t.max * 0.035 : dmg, t.x, t.y); });
    g.cancelBullets({ poly, test: (x, y) => inside(poly, x, y) }, true);
    const nc = 1 + (Math.random() < 0.3 ? 1 : 0);
    for (let i = 0; i < nc; i++) g.dropPickup('crystals', cx + rand(-20, 20), cy + rand(-20, 20));
    g.dropCoins(cx, cy, 12 * g.D.loot);
    g.player.gauge = Math.min(1, g.player.gauge + 0.12);
    g.stats.constellations++;
    sfx.constellation();
    flash('#bfe8ff', 0.25); addShake(0.2);
    g.msg(name, '#bfe8ff', 17, 1.6);
    if (g.stats.constellations === 1) g.radio('constel');
    this.pts = [];
  }
  update(dt) {
    this.timer -= dt;
    if (this.timer <= 0 && this.pts.length) { this.fading.push({ pts: this.pts, t: 0.5 }); this.pts = []; this.chain = 0; }
    for (const p of this.pts) p.t += dt;
    for (let i = this.ignited.length - 1; i >= 0; i--) { this.ignited[i].t += dt; if (this.ignited[i].t > 1.6) this.ignited.splice(i, 1); }
    for (let i = this.fading.length - 1; i >= 0; i--) { this.fading[i].t -= dt; if (this.fading[i].t <= 0) this.fading.splice(i, 1); }
  }
  drawLine(pts, a, w) {
    if (pts.length < 2) return;
    ctx.globalAlpha = a;
    ctx.strokeStyle = '#bfe8ff'; ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
  }
  draw() {
    baseT();
    ctx.globalCompositeOperation = 'lighter';
    const k = Math.max(0, Math.min(1, this.timer / 1.3));
    this.drawLine(this.pts, 0.35 + 0.4 * k, 1.6);
    for (const f of this.fading) this.drawLine(f.pts, f.t, 1.2);
    const s = glow('#bfe8ff', 16);
    for (const p of this.pts) {
      const r = 7 + 3 * Math.sin(p.t * 10);
      ctx.globalAlpha = 0.9; ctx.drawImage(s.c, p.x - r, p.y - r, r * 2, r * 2);
    }
    for (const ig of this.ignited) {
      const u = ig.t / 1.6;
      ctx.globalAlpha = (1 - u) * 0.35;
      ctx.fillStyle = '#7fc8ff';
      ctx.beginPath(); ig.poly.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1 - u; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3 * (1 - u) + 1; ctx.stroke();
      this.drawLine(ig.pts, 1 - u, 2);
      for (const p of ig.pts) { const r = 14 * (1 - u) + 4; ctx.globalAlpha = 1 - u; ctx.drawImage(s.c, p.x - r, p.y - r, r * 2, r * 2); }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
}
