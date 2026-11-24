// Partie en cours : orchestre vagues, collisions, butin, boss, événements, fin de niveau
import { TAU, rand, dist2, angTo, angDiff, rgba, lighten, mixHex, clamp, chance } from '../engine/math.js';
import { view, ctx, cam, baseT, setT, setRT, setRTS, addShake, flash, hitstop, drawFlash } from '../engine/renderer.js';
import { input } from '../engine/input.js';
import { fx, updateParticles, drawParticles, clearParticles } from '../engine/particles.js';
import { sprite, glow, orb } from '../engine/sprites.js';
import { ENEMIES } from './enemies.js';
import { initPath, updatePath } from './paths.js';
import { Player } from './player.js';
import { Drone } from './drones.js';
import { Boss } from './boss.js';
import { Background } from './background.js';
import { Events } from './events.js';
import { Constellation } from './combo.js';
import { Hud } from './hud.js';
import { makePickup, updatePickups, drawPickups, PK } from './pickups.js';
import { explode, hitSpark, deflect, sparkle, cancelPop } from './fx.js';
import { formationSpawns, coinPattern } from '../levels/formations.js';
import { radioLine } from './radio.js';
import { S } from '../economy/save.js';
import { dronePower } from '../economy/economy.js';
import { sfx } from '../audio/sfx.js';
import { music } from '../audio/music.js';
import { drawPart } from './art.js';

// ---------- Sprites de projectiles ----------
const BK = {
  orb: { r: 4.5 }, big: { r: 8 }, needle: { r: 3, orient: 1 }, petal: { r: 4, orient: 1 }, shard: { r: 3.4, orient: 1 }, drop: { r: 4, orient: 1, grav: 150 },
};
function ebSprite(kind, color) {
  if (kind === 'orb') return orb(color, 4.6);
  if (kind === 'big') return orb(color, 8);
  return sprite('eb' + kind + color, 30, 30, (g) => {
    g.translate(15, 15);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, 14);
    gr.addColorStop(0, rgba(color, 0.7)); gr.addColorStop(1, rgba(color, 0));
    g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, 8, 14, 0, 0, TAU); g.fill();
    g.fillStyle = '#ffffff'; g.strokeStyle = color; g.lineWidth = 1.4;
    g.beginPath();
    if (kind === 'needle') g.ellipse(0, 0, 2.4, 8, 0, 0, TAU);
    else if (kind === 'petal') { g.moveTo(0, -8); g.quadraticCurveTo(6, 0, 0, 8); g.quadraticCurveTo(-6, 0, 0, -8); }
    else if (kind === 'shard') { g.moveTo(0, -8); g.lineTo(3.4, 0); g.lineTo(0, 8); g.lineTo(-3.4, 0); g.closePath(); }
    else { g.arc(0, 2, 4, 0, Math.PI); g.lineTo(0, -8); g.closePath(); }
    g.fill(); g.stroke();
  });
}
function pbSprite(kind, color) {
  return sprite('pb' + kind + color, 32, 32, (g) => {
    g.translate(16, 16);
    const halo = (rx, ry) => { const gr = g.createRadialGradient(0, 0, 0, 0, 0, Math.max(rx, ry)); gr.addColorStop(0, rgba(color, 0.9)); gr.addColorStop(1, rgba(color, 0)); g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU); g.fill(); };
    switch (kind) {
      case 'feather': halo(7, 13); g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(0, -10); g.quadraticCurveTo(4, 0, 0, 9); g.quadraticCurveTo(-4, 0, 0, -10); g.fill(); g.strokeStyle = color; g.lineWidth = 0.8; g.beginPath(); g.moveTo(0, -9); g.lineTo(0, 9); g.stroke(); break;
      case 'missile': case 'micro': halo(6, 10); g.fillStyle = '#ffffff'; g.fillRect(-1.8, -7, 3.6, 12); g.fillStyle = color; g.beginPath(); g.moveTo(-1.8, -7); g.lineTo(0, -10); g.lineTo(1.8, -7); g.fill(); break;
      case 'spark': halo(7, 7); g.fillStyle = '#ffffff'; g.beginPath(); g.arc(0, 0, 2.2, 0, TAU); g.fill(); break;
      case 'plasma': halo(6, 11); g.fillStyle = '#fff5d0'; g.beginPath(); g.ellipse(0, 0, 2.2, 6, 0, 0, TAU); g.fill(); break;
      case 'shard': halo(7, 11); g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(0, -9); g.lineTo(3, 0); g.lineTo(0, 9); g.lineTo(-3, 0); g.closePath(); g.fill(); break;
      case 'prism': halo(7, 13); g.fillStyle = '#ffffff'; g.fillRect(-1.5, -10, 3, 20); break;
      default: halo(5, 12); g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(0, 0, 1.8, 8, 0, 0, TAU); g.fill();
    }
  });
}
const CLS_SIZE = { xs: 1, s: 1, m: 2, l: 3, g: 2, snake: 3 };
const RAINBOW = ['#ff4fd8', '#ffd23f', '#38f2ff', '#47ffa3', '#a259ff', '#ff7a3c'];
const TYPE_TINT = {};

export class Game {
  constructor(def, o) {
    this.def = def; this.diff = def.diff; this.D = def.D; this.pal = def.pal;
    this.t = 0; this.dt = 0;
    this.enemies = []; this.ebs = []; this.pbs = []; this.pickups = []; this.hazards = []; this.debris = [];
    this.lines = []; this.bolts = []; this.timers = []; this.targets = []; this.beamsDraw = [];
    this.stats = { kills: 0, spawned: 0, primaryKills: 0, coins: 0, crystals: 0, gems: 0, parts: 0, hullHits: 0, specials: 0, perfects: 0, constellations: 0, salvage: 0, novas: 0, maxChain: 0, elites: 0, eliteSpawned: 0, time: 0, coinSpawned: 0, crySpawned: 0 };
    this.player = new Player(this, o);
    this.drones = (o.drones || []).map((id, i) => new Drone(this, id, i, dronePower(id)));
    this.bg = new Background(def);
    this.events = new Events(this);
    this.combo = new Constellation(this);
    this.hud = new Hud(this);
    this.tl = def.timeline; this.ti = 0; this.dirT = 0; this.spawnQ = [];
    this.state = 'play'; this.endT = 0; this.boss = null; this.timelineDone = false;
    this.scroll = def.planet ? 42 : 0;
    this.lastBeat = -1; this.lastHalf = -1; this.onBeat = false; this.onHalf = false;
    this.slowT = 0; this.slowK = 1;
    this.coinStreak = 0; this.coinStreakT = 0;
    this.revives = 0; this.well = null; this.lootRush = 0; this.idc = 0;
    this.paused = false; this.ignoreTouch = false;
    this.onEnd = null; this.onDeath = null; this.onPause = null;
    this.goalKills = 0; this.bossT = 0;
    this.wind = def.trait === 'vent' ? (Math.random() < 0.5 ? -1 : 1) * 55 : 0;
    clearParticles();
    music.play(def.music, true);
    music.setIntensity(0.5);
  }

  // ================= API pour les entités =================
  later(d, fn) { this.timers.push({ t: d, fn }); }
  msg(text, color, size, dur, big) { this.hud.addMsg(text, color, size, dur, big); }
  radio(key) { const l = radioLine(key); if (l) this.hud.setRadio(l); }
  slowmo(t, k) { this.slowT = t; this.slowK = k; }
  lineFx(x1, y1, x2, y2, c, life, w) { this.lines.push({ x1, y1, x2, y2, c, life, max: life, w }); }
  coinMul() { return this.events.coinMul(); }
  progress() {
    if (this.boss) return 1;
    const last = this.tl.length ? this.tl[this.tl.length - 1].t : 1;
    return clamp(this.dirT / last, 0, 1);
  }
  flyerCount() { let n = 0; for (const e of this.enemies) if (!e.dead && !e.ground && !e.T.harmless) n++; return n; }

  addEnemy(type, x, y, path, o = {}) {
    const T = ENEMIES[type];
    if (!T) { console.warn('ennemi inconnu', type); return null; }
    if (TYPE_TINT[type] === undefined) TYPE_TINT[type] = Object.keys(TYPE_TINT).length % 3;
    const P = this.pal, tint = TYPE_TINT[type];
    const e = {
      id: ++this.idc, type, T, x, y, vx: 0, vy: 0, r: T.r, hpMul: this.D.hp,
      hp: T.hp * this.D.hp, max: 0, t: 0, face: 0, scale: 1, flash: 0, alpha: 1, dead: false, gone: false,
      ground: !!T.ground, data: o.data ? { ...o.data } : {}, seed: Math.random() * 10, primary: !!o.primary,
      elite: !!o.elite, fcd: T.rate * rand(0.4, 1), lootMul: 1, stun: 0, entered: false, hidden: false,
      c1: tint === 1 ? P.enemy2 : tint === 2 ? mixHex(P.enemy, P.accent, 0.45) : P.enemy,
      c2: tint === 1 ? P.enemy : P.enemy2, cg: tint === 1 ? lighten(P.enemy2, 0.25) : P.eglow,
      path: path ? { ...path } : { k: 'dive', spd: 80, amp: 0, f: 0, ph: 0 },
    };
    if (e.ground) e.path = { k: 'ground' };
    initPath(e);
    if (T.init) T.init(e, this, o);
    if (!e.max) e.max = e.hp;
    if (e.elite) { e.hp *= 4; e.max = e.hp; e.scale = 1.25; e.lootMul = 5; this.stats.eliteSpawned++; }
    if (o.carrier) e.carrier = o.carrier;
    if (o.nova) e.nova = true;
    if (o.primary) this.stats.spawned++;
    this.enemies.push(e);
    return e;
  }
  spawnEB(x, y, vx, vy, kind = 'orb', o) {
    if (this.ebs.length > 650 || this.def.noFireAll) return null;
    const K = BK[kind] || BK.orb;
    const color = (o && o.color) || (kind === 'needle' || kind === 'shard' ? this.pal.bullet2 : this.pal.bullet);
    const m = this.D.bspd;
    const b = { x, y, vx: vx * m, vy: vy * m, kind, r: K.r, grav: K.grav || 0, t: 0, dead: false, orient: K.orient, spr: ebSprite(kind, color), color };
    this.ebs.push(b);
    return b;
  }
  addPB(x, y, vx, vy, dmg, kind, o) {
    if (this.pbs.length > 420) return null;
    const p = this.player;
    const color = (o && o.color) || (p.super > 0 ? RAINBOW[Math.floor(this.t * 12) % 6] : o && o.ghost ? '#c8a2ff' : p.col);
    const b = { x, y, vx, vy, dmg, kind, r: 5, life: 1.4, t: 0, pierce: 0, hits: null, dead: false, color, homing: 0, bounce: 0, split: 0, accel: 0, splash: 0 };
    if (o) Object.assign(b, o);
    if (kind === 'flame') { b.r = b.big ? 12 : 7; }
    if (kind === 'wave') b.x0 = x;
    if (b.pierce) b.hits = [];
    b.spr = kind === 'flame' || kind === 'wave' || kind === 'orb' || kind === 'vortex' ? null : pbSprite(kind, color);
    this.pbs.push(b);
    return b;
  }
  dropPickup(kind, x, y, v = 1) {
    const k = makePickup(kind, x, y, v);
    if (kind === 'crystals') this.stats.crySpawned++;
    this.pickups.push(k);
    return k;
  }
  dropCoins(x, y, v) {
    let V = Math.floor(v) + (Math.random() < v - Math.floor(v) ? 1 : 0);
    if (V <= 0) return;
    this.stats.coinSpawned += V;
    if (V <= 5) { for (let i = 0; i < V; i++) this.pickups.push(makePickup('coin', x, y, 1)); return; }
    const n = Math.min(8, 2 + Math.floor(Math.log2(V)));
    const each = Math.floor(V / n);
    let rest = V - each * n;
    for (let i = 0; i < n; i++) { const val = each + (rest-- > 0 ? 1 : 0); this.pickups.push(makePickup('coin', x + rand(-6, 6), y + rand(-6, 6), val)); }
  }
  forTargets(cb) { for (let i = 0; i < this.targets.length; i++) cb(this.targets[i]); }
  nearestTarget(x, y, maxD, above = false) {
    let best = null, bd = maxD * maxD;
    for (const t of this.targets) { if (t.shielded) continue; if (above && t.y > y + 30) continue; const d = dist2(x, y, t.x, t.y); if (d < bd) { bd = d; best = t; } }
    return best;
  }
  buildTargets() {
    const T = this.targets; T.length = 0;
    for (const e of this.enemies) {
      if (e.dead || e.hidden) continue;
      e.rr = e.r * e.scale;
      if (e.y < -e.rr || e.y > view.h + e.rr || e.x < -e.rr || e.x > view.w + e.rr) continue;
      e.shielded = !!e.T.invul;
      T.push(e);
    }
    if (this.boss && this.boss.state === 'fight') for (const p of this.boss.parts) { if (!p.alive) continue; p.rr = p.r * this.boss.sc; p.shielded = !this.boss.targetable(p); T.push(p); }
  }

  hitTarget(t, dmg, x, y, silent = false) {
    if (t.isPart) {
      let d = dmg;
      if (!silent && Math.random() < this.player.crit) d *= 2;
      const ok = t.boss.hit(t, d, x, y);
      if (ok && !silent && Math.random() < 0.5) hitSpark(x, y, this.pal.eglow);
      if (ok) this.bossDamageSound();
      return ok;
    }
    return this.hitEnemy(t, dmg, x, y, silent);
  }
  bossDamageSound() { if (Math.random() < 0.3) sfx.hit(); }
  hitEnemy(e, dmg, x = e.x, y = e.y, silent = false) {
    if (e.dead || e.hidden) return false;
    if (e.T.invul) { if (!silent) deflect(x, y); return false; }
    let d = dmg * (e.armorMul ?? 1);
    if (e.armorMul !== undefined && e.armorMul < 1 && !silent && Math.random() < 0.2) { deflect(x, y); }
    if (!silent && Math.random() < this.player.crit) { d *= 2; if (Math.random() < 0.3) fx.text(x, y - 8, 'CRIT', '#ffd23f', 10, 0.5); }
    if (e.armor > 0) {
      e.armor -= d * 0.6; d *= 0.15;
      if (e.armor <= 0) {
        for (let i = 0; i < 6; i++) fx.debris(e.x, e.y, rand(-150, 150), rand(-200, 0), 1, rand(3, 6), e.c2);
        sfx.part();
        if (Math.random() < 0.3) this.dropPickup('parts', e.x, e.y);
      }
    }
    e.hp -= d;
    e.flash = 0.07;
    if (e.T.onHit) e.T.onHit(e, this, d);
    if (!silent && Math.random() < 0.6) { hitSpark(x, y, e.cg); sfx.hit(); }
    if (e.hp <= 0) this.killEnemy(e);
    return true;
  }
  killEnemy(e, silent = false) {
    if (e.dead) return;
    e.dead = true;
    const T = e.T;
    const size = (CLS_SIZE[T.cls] || 1) + (e.elite ? 1 : 0);
    if (!silent || e.data.pop) explode(e.x, e.y, size, e.cg, e.c2, !e.ground);
    if (T.death) T.death(e, this);
    if (silent && !e.data.pop) return;
    if (e.data.pop) return;
    const v = T.coins * this.D.loot * e.lootMul * this.coinMul() * (1 + S.up.fortune * 0.07);
    this.dropCoins(e.x, e.y, v);
    const luck = 1 + S.up.luck * 0.1;
    if (Math.random() < 0.012 * luck * (T.cls === 'm' || T.cls === 'l' ? 2 : 1)) {
      const r = Math.random();
      this.dropPickup(r < 0.4 ? 'energy' : r < 0.6 ? 'shield' : r < 0.75 ? 'magnet' : r < 0.85 ? 'heart' : 'power', e.x, e.y);
    }
    if (Math.random() < 0.025 + this.diff * 0.02) this.dropPickup('crystals', e.x, e.y);
    if (this.diff === 2 && Math.random() < 0.004) this.dropPickup('gems', e.x, e.y);
    if (e.carrier) this.dropPickup(e.carrier, e.x, e.y);
    if (e.nova) this.dropPickup('nova', e.x, e.y);
    if (e.elite) {
      this.stats.elites++;
      this.dropPickup('crystals', e.x - 8, e.y); this.dropPickup('crystals', e.x + 8, e.y);
      if (Math.random() < 0.35 + this.diff * 0.15) this.dropPickup('gems', e.x, e.y);
      if (Math.random() < 0.5) this.dropPickup('power', e.x, e.y + 10);
      fx.text(e.x, e.y - 24, 'ÉLITE !', '#ffd23f', 16);
      sfx.gem();
    }
    this.stats.kills++;
    if (e.primary) this.stats.primaryKills++;
    this.goalKills++;
    this.combo.kill(e.x, e.y);
    this.player.gauge = Math.min(1, this.player.gauge + 0.004);
  }
  eat(glu, prey) {
    if (prey.dead) return;
    prey.dead = true; prey.eaten = true;
    if (prey.primary) this.stats.spawned--;
    for (let i = 0; i < 8; i++) fx.goo(prey.x, prey.y, rand(-120, 120), rand(-150, 50), 0.8, rand(1.5, 3), prey.c2);
    fx.text(glu.x, glu.y - glu.r - 8, 'CROC !', '#ffffff', 14);
    glu.r = Math.min(34, glu.r + 2.5);
    glu.hp += prey.max * 1.2; glu.max += prey.max * 1.2;
    glu.lootMul += 0.6; glu.data.ate = (glu.data.ate || 0) + 1;
    sfx.squish();
    if (!this.def.noFire) this.later(0.5, () => { if (!glu.dead) for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + rand(1); this.spawnEB(glu.x, glu.y, Math.cos(a) * 80, Math.sin(a) * 80, 'big'); } });
  }
  collect(k) {
    const p = this.player;
    switch (k.kind) {
      case 'coin':
        this.stats.coins += k.v;
        this.coinStreak = this.coinStreakT > 0 ? this.coinStreak + 1 : 0; this.coinStreakT = 0.5;
        sfx.coin(this.coinStreak);
        this.hud.bump = 1;
        if (k.v >= 5) fx.text(k.x, k.y - 10, '+' + k.v, '#ffe27a', 11, 0.6);
        break;
      case 'crystals': this.stats.crystals++; sfx.crystal(); fx.text(k.x, k.y - 10, '+1', '#7df9ff', 11, 0.6); break;
      case 'gems': this.stats.gems++; sfx.gem(); fx.text(k.x, k.y - 12, '+1 GEMME', '#ff8ae6', 13, 0.8); break;
      case 'parts': this.stats.parts += k.v || 1; sfx.part(); fx.text(k.x, k.y - 10, '+' + (k.v || 1), '#ffbe7a', 11, 0.6); break;
      case 'power':
        if (p.wlvl < 6) { p.wlvl++; this.msg(p.wlvl === 6 ? 'ARME AU MAXIMUM !' : `ARME NIVEAU ${p.wlvl}`, '#ff9d3c', 18, 1); }
        else { this.stats.coins += Math.round(10 * this.D.loot); p.gauge = Math.min(1, p.gauge + 0.15); }
        sfx.power(); fx.ring(p.x, p.y, 8, 50, 0.35, '#ff9d3c', 3);
        break;
      case 'shield': p.shield = Math.min(3, p.shield + 1); sfx.shieldUp(); fx.ring(p.x, p.y, 8, 40, 0.35, '#38f2ff', 3); break;
      case 'magnet': p.magnetT = 10; sfx.magnet(); this.msg('AIMANT !', '#ff6a8a', 16, 0.9); break;
      case 'energy': p.gauge = Math.min(1, p.gauge + 0.34); sfx.energy(); fx.text(k.x, k.y - 10, '+SPÉCIALE', '#ffe94a', 11, 0.6); break;
      case 'heart':
        if (p.hp < p.maxHp) { p.hp++; this.msg('COQUE RÉPARÉE', '#ff8aa8', 15, 0.9); } else this.stats.coins += Math.round(15 * this.D.loot);
        sfx.heal(); break;
      case 'nova':
        p.super = p.superMax; this.stats.novas++;
        sfx.nova(); flash('#ffffff', 0.5); addShake(0.3);
        this.msg('HYPERNOVA !', '#ffffff', 30, 1.4, true);
        this.cancelBullets(null, true);
        for (let i = 0; i < 3; i++) fx.ring(p.x, p.y, 10, 120 + i * 60, 0.6 + i * 0.15, ['#ff4fd8', '#ffd23f', '#38f2ff'][i], 4);
        break;
    }
    sparkle(k.x, k.y, PK[k.kind].glow, k.kind === 'coin' ? 1 : 4);
  }
  cancelBullets(area, reward = true, max = Infinity) {
    let n = 0;
    for (const b of this.ebs) {
      if (b.dead) continue;
      let ins = false;
      if (!area) ins = true;
      else if (area.test) ins = area.test(b.x, b.y);
      else if (area.rect !== undefined) ins = Math.abs(b.x - area.x) < area.rect && (area.all || area.y === undefined || b.y < area.y);
      else if (area.ring) { const d = Math.sqrt(dist2(area.x, area.y, b.x, b.y)); ins = Math.abs(d - area.r) < area.ring; }
      else ins = dist2(area.x, area.y, b.x, b.y) < area.r * area.r;
      if (!ins) continue;
      b.dead = true; n++;
      if (n < 40) cancelPop(b.x, b.y, b.color);
      if (reward && Math.random() < 0.3) { const k = makePickup('coin', b.x, b.y, 1); k.attract = true; k.age = 0.3; this.pickups.push(k); }
      if (n >= max) break;
    }
    return n;
  }
  fireBeam(x, y, w, dps, pierce, color, big = false) {
    const cands = [];
    for (const t of this.targets) if (t.y < y + 10 && Math.abs(t.x - x) < t.rr + w / 2) cands.push(t);
    cands.sort((a, b) => b.y - a.y);
    let y1 = -30, n = 0;
    for (const t of cands) {
      const ok = this.hitTarget(t, dps * this.dt * (n ? 0.5 : 1), x, t.y + t.rr * 0.5, true);
      if (Math.random() < 0.25) hitSpark(x + rand(-w / 3, w / 3), t.y + t.rr * 0.6, t.shielded ? '#cfe8ff' : color);
      if (!ok || n >= pierce) { y1 = t.y + t.rr * 0.5; break; }
      n++;
    }
    const b = { x, y, y1, w, color, big };
    this.beamsDraw.push(b);
    return b;
  }
  drawBeam(x, y0, y1, w, color, k = 1) {
    const flick = 0.85 + 0.15 * Math.sin(this.t * 60);
    const gr = ctx.createLinearGradient(x - w, 0, x + w, 0);
    gr.addColorStop(0, rgba(color, 0)); gr.addColorStop(0.3, rgba(color, 0.35 * k)); gr.addColorStop(0.5, rgba('#ffffff', 0.95 * k)); gr.addColorStop(0.7, rgba(color, 0.35 * k)); gr.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = gr;
    ctx.fillRect(x - w * flick, y1, w * 2 * flick, y0 - y1);
    const s = glow(color, 32);
    ctx.drawImage(s.c, x - w * 1.5, y0 - w * 1.5, w * 3, w * 3);
    if (y1 > 0) ctx.drawImage(s.c, x - w * 1.8, y1 - w * 1.8, w * 3.6, w * 3.6);
  }
  chainLightning(x, y, dmg, jumps, color, ghost) {
    let t = this.nearestTarget(x, y, 300, true);
    if (!t) return false;
    const pts = [x, y];
    const hit = new Set();
    let d = dmg, cx = x, cy = y;
    for (let j = 0; j <= jumps && t; j++) {
      hit.add(t);
      pts.push(t.x, t.y);
      this.hitTarget(t, d, t.x, t.y, j > 0);
      d *= 0.8; cx = t.x; cy = t.y;
      let nb = null, nd = 150 * 150;
      for (const o of this.targets) { if (hit.has(o) || o.shielded) continue; const dd = dist2(cx, cy, o.x, o.y); if (dd < nd) { nd = dd; nb = o; } }
      t = nb;
    }
    this.bolts.push({ pts, t: 0.09, color: ghost ? '#c8a2ff' : color, w: ghost ? 1.2 : 2 });
    return true;
  }
  strike(x, y, color, full = false) {
    const pts = [x + rand(-20, 20), -10];
    let cx = pts[0];
    const steps = 9;
    for (let i = 1; i <= steps; i++) { cx += rand(-16, 16); pts.push(i === steps ? x : cx, (y + 10) * (i / steps) - 10); }
    this.bolts.push({ pts, t: 0.22, color, w: full ? 4 : 3 });
    fx.flash(x, y, 40, 0.3, color);
  }
  bladeHit(x, y, r, dmg, idx) {
    for (const t of this.targets) {
      if (dist2(x, y, t.x, t.y) > (r + t.rr) ** 2) continue;
      const k = '_bl' + idx;
      if (t[k] && this.t - t[k] < 0.12) continue;
      t[k] = this.t;
      this.hitTarget(t, dmg, x, y, Math.random() < 0.6);
    }
    this.cancelBullets({ x, y, r: r * 0.9 }, true, 2);
  }
  gravityWell(x, y, R, strength, dt, eat) {
    for (const e of this.enemies) {
      if (e.dead || e.ground || e.type === 'serpentSeg') continue;
      const d = Math.sqrt(dist2(x, y, e.x, e.y));
      if (d < R && d > 5) { const f = strength * (1 - d / R) * dt; e.x += ((x - e.x) / d) * f; e.y += ((y - e.y) / d) * f; if (e.path) { e.path.x0 = (e.path.x0 ?? e.x) + ((x - e.x) / d) * f; } }
    }
    for (const b of this.ebs) {
      if (b.dead) continue;
      const d = Math.sqrt(dist2(x, y, b.x, b.y)) + 1;
      if (d < R) { b.vx += ((x - b.x) / d) * strength * 2 * dt; b.vy += ((y - b.y) / d) * strength * 2 * dt; }
      if (eat && d < 40) { b.dead = true; if (Math.random() < 0.3) { const k = makePickup('coin', x, y, 1); k.attract = true; this.pickups.push(k); } }
    }
  }
  addLaser(x, y, ang, warm, dur, w, color, delay = 0) {
    this.hazards.push({ kind: 'laser', x, y, ang, warm, dur, w, color, t: -delay, fired: false });
    sfx.laserCharge();
  }
  spawnSalvage(x, y, r, col) {
    this.debris.push({ x, y, vx: rand(-50, 50), vy: rand(-90, -40), rot: rand(TAU), vr: rand(-3, 3), r: Math.min(26, r), col, t: 0 });
  }

  // ================= Directeur de niveau =================
  director(dt) {
    if (this.state !== 'play') return;
    this.dirT += dt;
    const next = this.tl[this.ti];
    if (next && this.spawnQ.length === 0 && this.flyerCount() === 0 && !this.boss && next.t - this.dirT > 1.0 && this.dirT > 2) this.dirT = next.t - 1.0;
    while (this.ti < this.tl.length && this.tl[this.ti].t <= this.dirT) this.exec(this.tl[this.ti++]);
    for (let i = this.spawnQ.length - 1; i >= 0; i--) {
      const s = this.spawnQ[i];
      s.d -= dt;
      if (s.d <= 0) { this.spawnQ.splice(i, 1); this.spawnSpec(s); }
    }
  }
  exec(ev) {
    switch (ev.kind) {
      case 'banner': this.hud.showBanner(); break;
      case 'radio': this.radio(ev.key); break;
      case 'wave': case 'ground': {
        const specs = formationSpawns(ev);
        const luckCarrier = ['power', 'power', 'shield', 'energy', 'magnet'][Math.floor(Math.random() * 5)];
        specs.forEach((s, i) => {
          s.ev = ev; s.first = i === 0; s.last = i === specs.length - 1;
          if (ev.carrier && s.last) s.carrier = this.player.wlvl < 3 ? 'power' : luckCarrier;
          this.spawnQ.push(s);
        });
        break;
      }
      case 'event': this.events.start(ev.id); break;
      case 'boss': this.startBoss(ev); break;
      case 'coinpat': {
        const pts = coinPattern(ev.pat, ev.seed);
        const v = Math.max(1, Math.round(1.5 * this.D.loot));
        for (const [x, y] of pts) { const k = makePickup('coin', x, y, v); k.vx = 0; k.vy = 70; this.pickups.push(k); this.stats.coinSpawned += v; }
        break;
      }
      case 'storm': {
        const n = 1 + (ev.k > 3 ? 1 : 0) + (this.diff > 0 && ev.k > 5 ? 1 : 0);
        for (let i = 0; i < n; i++) {
          const tx = view.w * (n === 1 ? 0.5 : 0.25 + (i / (n - 1)) * 0.5);
          this.addEnemy('emetteur', tx, -30, { k: 'hover', tx, ty: view.safeT + view.h * 0.2 + i * 30, inDur: 1, stay: 3.2, exit: 'up', sway: 30 }, { data: { k: ev.k + i } });
        }
        break;
      }
      case 'end': this.timelineDone = true; break;
    }
  }
  spawnSpec(s) {
    const ev = s.ev;
    const e = this.addEnemy(ev.type, s.x, s.y, s.ground ? { k: 'ground' } : s.path, {
      primary: true, elite: ev.elite && s.first, carrier: s.carrier, nova: ev.nova && s.last, rich: ev.rich, giant: ev.giant,
    });
    if (e && ev.flee) e.flee = true;
  }
  startBoss(ev) {
    this.hud.warn = 2.6;
    sfx.warning();
    music.setIntensity(0.2);
    this.later(1.8, () => { if (this.def.bossMusic || !ev.mini) music.play(this.def.bossMusic || 'boss', true); music.setIntensity(1); });
    this.later(2.2, () => {
      this.boss = new Boss(this, ev.arch, { mini: ev.mini, tier: ev.tier, name: ev.name || 'Colosse' });
      this.bossT = 0;
      sfx.roar(); addShake(0.4);
      this.msg(this.boss.name, '#ff8aa8', 24, 2.2, true);
    });
  }
  bossDefeated(b) {
    const x = b.cx(), y = b.cy();
    this.dropCoins(x, y, (b.mini ? 90 : 200) * this.D.loot);
    for (let i = 0; i < (b.mini ? 4 : 8); i++) this.dropPickup('crystals', x + rand(-50, 50), y + rand(-40, 40));
    for (let i = 0; i < (b.mini ? 0 : 1) + this.diff; i++) this.dropPickup('gems', x + rand(-30, 30), y + rand(-30, 30));
    for (let i = 0; i < (b.mini ? 1 : 3); i++) { const k = this.dropPickup('parts', x + rand(-40, 40), y + rand(-30, 30)); k.v = 1 + this.diff; }
    this.lootRush = 3.5;
    this.msg(b.mini ? 'GARDIEN VAINCU !' : 'COLOSSE VAINCU !', '#ffd23f', 30, 2.4, true);
    this.radio('constel');
    this.bossDead = true;
    this.later(3.2, () => { this.boss = null; this.timelineDone = true; });
  }
  playerDied() {
    this.state = 'dying'; this.endT = 0;
    this.slowmo(1.4, 0.35);
    sfx.defeat();
    music.setIntensity(0.1);
  }
  revive() {
    this.revives++;
    this.player.revive();
    this.cancelBullets(null, false);
    for (const e of this.enemies) if (!e.dead && e.y > view.h * 0.55 && !e.ground) this.hitEnemy(e, 9999, e.x, e.y, true);
    this.state = 'play';
    music.setIntensity(0.6);
  }
  goalText() {
    const g = this.def.goal;
    if (!g) return null;
    if (g.kind === 'time') return `${Math.min(g.n, this.goalKills)} / ${g.n} ALIENS · ${Math.max(0, g.limit - this.stats.time).toFixed(1)} s`;
    if (g.kind === 'hunt') return `ÉLITES ABATTUES : ${this.stats.elites} / ${g.n}`;
    if (g.kind === 'survive') return `SURVIVRE : ${Math.max(0, g.limit - this.dirT).toFixed(1)} s`;
    return null;
  }
  checkEnd(dt) {
    if (this.state === 'play') {
      const g = this.def.goal;
      let clear = false, fail = false;
      if (g && g.kind === 'time') { if (this.goalKills >= g.n) clear = true; else if (this.stats.time > g.limit || this.timelineDone) { if (this.goalKills >= g.n * 0.6) clear = true; else fail = true; } }
      else if (g && g.kind === 'survive') { if (this.dirT >= g.limit) clear = true; }
      else if (this.timelineDone && !this.boss && this.spawnQ.length === 0) {
        let live = 0; for (const e of this.enemies) if (!e.dead && !e.ground && e.y > -40) live++;
        if (live === 0 || (this.def.goal && this.def.goal.kind === 'hunt')) {
          if (g && g.kind === 'hunt' && this.stats.elites < 3) fail = true; else clear = true;
        }
      }
      if (clear) { this.state = 'clear'; this.endT = 0; this.lootRush = 4; sfx.victory(); this.msg(this.def.kind === 'boss' ? 'ÉTOILE RALLUMÉE !' : 'SECTEUR NETTOYÉ !', '#ffffff', 28, 2, true); music.setIntensity(0.4); }
      if (fail) { this.state = 'failed'; this.endT = 0; sfx.defeat(); this.msg('ÉCHEC DU DÉFI', '#ff8aa8', 26, 2, true); }
    } else if (this.state === 'clear') {
      this.endT += dt;
      if (this.endT > 1.6) { this.bg.warp = Math.min(1, this.bg.warp + dt * 0.8); this.player.ty = -200; this.player.entering = 1; this.player.inv = 9; }
      if (this.endT > 3.2) this.finish(true);
    } else if (this.state === 'failed') {
      this.endT += dt;
      if (this.endT > 2) this.finish(false);
    } else if (this.state === 'dying') {
      this.endT += dt;
      if (this.endT > 1.5 && this.onDeath) { this.state = 'dead'; this.onDeath(this); }
    }
  }
  computeStars(victory) {
    if (!victory) return 0;
    const d = this.def, st = this.stats, g = d.goal;
    if (d.kind === 'coins') { const r = st.coins / Math.max(1, st.coinSpawned); return 1 + (r >= 0.5 ? 1 : 0) + (r >= 0.8 ? 1 : 0); }
    if (d.kind === 'bonus') { const r = st.crystals / Math.max(1, st.crySpawned); return 1 + (r >= 0.5 ? 1 : 0) + (r >= 0.8 ? 1 : 0); }
    if (g && g.kind === 'survive') return Math.max(1, 3 - st.hullHits);
    if (g && g.kind === 'time') { if (this.goalKills < g.n) return 1; return this.stats.time <= 30 ? 3 : this.stats.time <= 40 ? 2 : 1; }
    if (g && g.kind === 'hunt') return st.elites >= 5 ? 3 : st.elites >= 4 ? 2 : 1;
    if (d.kind === 'boss' || d.kind === 'miniboss') return 1 + (this.bossT < (d.kind === 'boss' ? 100 : 60) ? 1 : 0) + (st.hullHits <= 1 ? 1 : 0);
    const kr = st.primaryKills / Math.max(1, st.spawned);
    return 1 + (kr >= 0.8 ? 1 : 0) + (st.hullHits <= 1 ? 1 : 0);
  }
  finish(victory) {
    if (this.finished) return;
    this.finished = true;
    sfx.laser(false);
    // ramasse automatiquement ce qui reste à l'écran
    for (const k of this.pickups) if (!k.dead && k.y > 0) { k.dead = true; this.collect(k); }
    const res = { victory, stars: this.computeStars(victory), stats: this.stats, def: this.def, revives: this.revives };
    if (this.onEnd) this.onEnd(res);
  }
  quit() { this.finished = true; sfx.laser(false); }

  // ================= Mise à jour =================
  update(rawDt) {
    if (this.paused || this.state === 'dead' || this.finished) { if (this.state === 'dead' || this.paused) { this.bg.update(rawDt * 0.2); } return; }
    let dt = rawDt;
    if (cam.hitstop > 0) { cam.hitstop -= rawDt; dt *= 0.1; }
    if (this.slowT > 0) { this.slowT -= rawDt; dt *= this.slowK; }
    this.dt = dt; this.t += dt;
    if (this.state === 'play') this.stats.time += dt;
    if (this.boss) this.bossT += dt;
    // Rythme
    const bp = music.beatPos();
    const bi = Math.floor(bp), hi = Math.floor(bp * 2);
    this.onBeat = bi !== this.lastBeat; this.onHalf = hi !== this.lastHalf;
    this.lastBeat = bi; this.lastHalf = hi;
    if (this.onBeat) this.bg.beat = 1;
    // Entrées HUD
    if (input.justDown) { const a = this.hud.hit(input.x, input.y); this.ignoreTouch = !!a; if (a === 'pause') this.pause(); else if (a) this.player.trySpecial(); }
    if (input.justUp) this.ignoreTouch = false;
    if (input.second) this.player.trySpecial();
    if (input.keys.Space) { input.keys.Space = false; this.player.trySpecial(); }
    if (this.ignoreTouch && input.down) { const d = input.down; input.down = false; this.updateWorld(dt); input.down = d; }
    else this.updateWorld(dt);
  }
  updateWorld(dt) {
    this.bg.update(dt);
    this.director(dt);
    this.events.update(dt);
    this.buildTargets();
    this.beamsDraw.length = 0;
    this.player.update(dt);
    for (const d of this.drones) d.update(dt);
    this.updatePB(dt);
    this.updateEnemies(dt);
    if (this.boss) this.boss.update(dt);
    this.updateEB(dt);
    this.updateHazards(dt);
    this.lootRush = Math.max(0, this.lootRush - dt);
    updatePickups(this, dt);
    this.updateDebris(dt);
    for (let i = this.timers.length - 1; i >= 0; i--) { const tm = this.timers[i]; tm.t -= dt; if (tm.t <= 0) { this.timers.splice(i, 1); try { tm.fn(); } catch (e) { console.error(e); } } }
    this.combo.update(dt);
    for (let i = this.lines.length - 1; i >= 0; i--) { this.lines[i].life -= dt; if (this.lines[i].life <= 0) this.lines.splice(i, 1); }
    for (let i = this.bolts.length - 1; i >= 0; i--) { this.bolts[i].t -= dt; if (this.bolts[i].t <= 0) this.bolts.splice(i, 1); }
    this.coinStreakT -= dt;
    updateParticles(dt);
    this.hud.update(dt);
    this.checkEnd(dt);
    if (this.player.id === 'lance' && (this.state !== 'play' || this.def.noWeapons)) sfx.laser(false);
    if (!this.boss && this.player.super <= 0) { const n = this.flyerCount(); music.setIntensity(clamp(0.35 + n * 0.045, 0.35, 0.85)); }
  }
  updatePB(dt) {
    const W = view.w, H = view.h;
    for (const b of this.pbs) {
      if (b.dead) continue;
      b.t += dt;
      if (b.t > b.life) { if (b.implode) this.vortex(b); b.dead = true; continue; }
      if (b.kind === 'vortex') { this.updateVortex(b, dt); continue; }
      if (b.homing) {
        if (!b.target || b.target.dead || (b.target.isPart && !b.target.alive) || b.target.shielded) b.target = this.nearestTarget(b.x, b.y, 500);
        if (b.target) {
          const cur = Math.atan2(b.vy, b.vx), ta = angTo(b.x, b.y, b.target.x, b.target.y);
          const na = cur + clamp(angDiff(cur, ta), -b.homing * dt, b.homing * dt);
          const sp = Math.hypot(b.vx, b.vy);
          b.vx = Math.cos(na) * sp; b.vy = Math.sin(na) * sp;
        }
      }
      if (b.accel) { const sp = Math.hypot(b.vx, b.vy), ns = Math.min(900, sp + b.accel * dt); b.vx *= ns / sp; b.vy *= ns / sp; }
      if (b.kind === 'missile' || b.kind === 'micro') { if (Math.random() < 0.7) fx.dot(b.x, b.y, -b.vx * 0.1, -b.vy * 0.1, 0.25, b.kind === 'micro' ? 4 : 6, b.color); }
      if (b.kind === 'flame') { b.r += dt * (b.big ? 20 : 26); b.vx *= 1 - dt * 1.2; b.vy *= 1 - dt * 1.2; }
      if (this.well) { const w = this.well, d = Math.sqrt(dist2(b.x, b.y, w.x, w.y)) + 30; b.vx += ((w.x - b.x) / d) * w.s * 60 * dt; b.vy += ((w.y - b.y) / d) * w.s * 60 * dt; }
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.kind === 'wave') b.x = b.x0 + Math.sin(b.t * 14) * 5 + b.vx * b.t;
      if (b.bounce > 0 && (b.x < 6 || b.x > W - 6)) { b.vx *= -1; b.bounce--; b.x = clamp(b.x, 6, W - 6); }
      if (b.y < -40 || b.y > H + 40 || b.x < -40 || b.x > W + 40) { b.dead = true; continue; }
      for (const t of this.targets) {
        if (b.hits && b.hits.includes(t)) continue;
        const rr = b.r + t.rr;
        if (dist2(b.x, b.y, t.x, t.y) > rr * rr) continue;
        const ok = this.hitTarget(t, b.dmg, b.x, b.y);
        if (b.splash && ok) { for (const o of this.targets) if (o !== t && dist2(b.x, b.y, o.x, o.y) < (b.splash + o.rr) ** 2) this.hitTarget(o, b.dmg * 0.4, o.x, o.y, true); fx.flash(b.x, b.y, b.splash, 0.2, b.color); }
        if (b.split > 0 && ok) { const a = Math.atan2(b.vy, b.vx), sp = Math.hypot(b.vx, b.vy); for (const s of [-0.6, 0.6]) { const nb = this.addPB(b.x, b.y, Math.cos(a + s) * sp, Math.sin(a + s) * sp, b.dmg * 0.5, 'shard', { split: b.split - 1, bounce: 1, life: 0.8, color: b.color }); if (nb) { nb.hits = [t]; } } }
        if (b.implode) { this.vortex(b); b.dead = true; break; }
        if (b.pierce > 0 && ok) { b.pierce--; b.hits.push(t); continue; }
        b.dead = true; break;
      }
    }
    let j = 0; for (const b of this.pbs) if (!b.dead) this.pbs[j++] = b; this.pbs.length = j;
  }
  vortex(b) {
    if (!b.vortex) return;
    this.pbs.push({ x: b.x, y: b.y, vx: 0, vy: 0, kind: 'vortex', r: b.vortex, dmg: 14 * (b.dmg / 5), life: 0.9, t: 0, dead: false, color: b.color, hits: null });
    fx.ring(b.x, b.y, b.vortex, 4, 0.4, b.color, 2);
  }
  updateVortex(b, dt) {
    for (const t of this.targets) if (dist2(b.x, b.y, t.x, t.y) < (b.r + t.rr) ** 2) this.hitTarget(t, b.dmg * dt, t.x, t.y, true);
    this.cancelBullets({ x: b.x, y: b.y, r: b.r * 0.6 }, true, 3);
    b.y -= 20 * dt;
  }
  updateEnemies(dt) {
    const p = this.player, top = view.safeT;
    for (const e of this.enemies) {
      if (e.dead) continue;
      e.t += dt; e.flash -= dt;
      if (e.stun > 0) { e.stun -= dt; continue; }
      const T = e.T;
      if (T.update) T.update(e, this, dt);
      if (e.dead) continue;
      const out = updatePath(e, dt, this) || e.gone;
      if (out) { e.dead = true; e.escaped = true; if (e.elite && e.primary && !e.ground) this.msg('L’élite s’est enfuie…', '#ffd23f', 14, 1.2); continue; }
      if (T.fire && !this.def.noFire && e.entered && !e.hidden && e.y > top + 12 && e.y < view.h * 0.72 && p.alive && this.state === 'play') {
        e.fcd -= dt * this.D.fire * (e.elite ? 1.4 : 1);
        if (e.fcd <= 0 && (this.onHalf || e.fcd < -0.8)) {
          if (dist2(e.x, e.y, p.x, p.y) > 80 * 80) T.fire(e, this);
          e.fcd = T.rate * rand(0.85, 1.25);
        }
      }
      if (!e.ground && !e.noContact && !T.harmless && !e.hidden && p.alive && p.inv <= 0) {
        const rr = e.r * e.scale * 0.8 + p.r;
        if (dist2(e.x, e.y, p.x, p.y) < rr * rr) { p.hurt(); if (!T.invul) this.hitEnemy(e, 25 * this.D.hp, e.x, e.y, true); }
      }
    }
    let j = 0; for (const e of this.enemies) if (!e.dead) this.enemies[j++] = e; this.enemies.length = j;
  }
  updateEB(dt) {
    const p = this.player, W = view.w, H = view.h;
    const pr = p.r;
    for (const b of this.ebs) {
      if (b.dead) continue;
      b.t += dt;
      if (b.grav) b.vy += b.grav * dt;
      if (this.wind) b.vx += this.wind * dt * 0.6;
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.y < -40 || b.y > H + 30 || b.x < -30 || b.x > W + 30) { b.dead = true; continue; }
      if (p.alive && p.inv <= 0 && this.state === 'play') {
        const rr = b.r * 0.72 + pr;
        if (dist2(b.x, b.y, p.x, p.y) < rr * rr) { b.dead = true; p.hurt(); }
      }
    }
    let j = 0; for (const b of this.ebs) if (!b.dead) this.ebs[j++] = b; this.ebs.length = j;
  }
  updateHazards(dt) {
    const p = this.player;
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const h = this.hazards[i];
      h.t += dt;
      if (h.kind === 'laser') {
        if (h.src && h.src.dead) { this.hazards.splice(i, 1); continue; }
        if (h.t >= h.warm && !h.fired) { h.fired = true; sfx.laserFire(); addShake(0.15); }
        if (h.t >= h.warm && h.t < h.warm + h.dur && p.alive && p.inv <= 0 && this.state === 'play') {
          const dx = p.x - h.x, dy = p.y - h.y, c = Math.cos(h.ang), s = Math.sin(h.ang);
          const along = dx * c + dy * s, perp = Math.abs(dx * s - dy * c);
          if (along > 0 && perp < h.w * 0.42 + p.r) p.hurt();
        }
        if (h.t >= h.warm + h.dur) this.hazards.splice(i, 1);
      }
    }
  }
  updateDebris(dt) {
    const p = this.player;
    for (let i = this.debris.length - 1; i >= 0; i--) {
      const d = this.debris[i];
      d.t += dt; d.vy += 110 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.rot += d.vr * dt;
      if (d.x < 20 || d.x > view.w - 20) d.vx *= -1;
      if (Math.random() < 0.3) fx.dot(d.x + rand(-d.r, d.r) * 0.5, d.y, 0, -20, 0.4, 5, d.col.cg);
      if (p.alive && dist2(d.x, d.y, p.x, p.y) < (d.r + 18) ** 2) {
        this.debris.splice(i, 1);
        const n = 2 + (this.boss ? this.boss.tier : 0) + this.diff * 2;
        this.stats.parts += n; this.stats.salvage++;
        this.dropCoins(d.x, d.y, 15 * this.D.loot);
        fx.text(d.x, d.y - 20, `RÉCUPÉRÉ ! +${n}`, '#ffbe7a', 16, 1.1);
        fx.ring(d.x, d.y, 10, 60, 0.4, '#ff9d3c', 3);
        sfx.part(); sfx.gem();
        continue;
      }
      if (d.y > view.h + 50) this.debris.splice(i, 1);
    }
  }

  // ================= Rendu =================
  draw() {
    const g = this;
    this.bg.draw();
    this.events.drawBack();
    this.drawEnemies(true);
    this.bg.drawClouds();
    if (this.def.planet) {
      baseT(); ctx.fillStyle = 'rgba(0,0,0,0.22)';
      for (const e of this.enemies) if (!e.ground && !e.dead) { ctx.beginPath(); ctx.ellipse(e.x + 16, e.y + 34, e.r * e.scale * 0.9, e.r * e.scale * 0.6, 0, 0, TAU); ctx.fill(); }
      if (this.player.alive) { ctx.beginPath(); ctx.ellipse(this.player.x + 16, this.player.y + 34, 12, 8, 0, 0, TAU); ctx.fill(); }
    }
    this.drawDebris();
    drawPickups(this);
    if (this.boss) { ctx.globalCompositeOperation = 'lighter'; baseT(); this.boss.drawGlow(); ctx.globalCompositeOperation = 'source-over'; this.boss.draw(); }
    this.drawEnemies(false);
    // Tirs du joueur et effets lumineux
    ctx.globalCompositeOperation = 'lighter';
    baseT();
    this.drawPB();
    for (const b of this.beamsDraw) this.drawBeam(b.x, b.y, b.y1, b.w, b.color, 1);
    this.player.drawBelow();
    const sp = this.player.special;
    if (sp && this.player.F.special.draw) { baseT(); this.player.F.special.draw(this, this.player, sp); }
    ctx.globalCompositeOperation = 'source-over';
    for (const d of this.drones) d.draw();
    this.player.draw();
    drawParticles(false);
    ctx.globalCompositeOperation = 'lighter';
    drawParticles(true);
    this.drawBolts();
    ctx.globalCompositeOperation = 'source-over';
    this.events.drawFront();
    if (this.events.list.some((e) => e.id === 'eclipse')) { ctx.globalCompositeOperation = 'lighter'; this.drawGlows(false, 1.4); ctx.globalCompositeOperation = 'source-over'; }
    this.drawHazards();
    this.drawEB();
    this.combo.draw();
    this.bg.drawFront(this.player.super > 0);
    this.hud.draw();
    drawFlash();
  }
  drawGlows(ground, k = 1) {
    baseT();
    for (const e of this.enemies) {
      if (e.dead || e.ground !== ground) continue;
      const s = glow(e.elite ? '#ffd23f' : e.cg, 16);
      const r = e.r * e.scale * (e.elite ? 3.2 : 2.5);
      ctx.globalAlpha = Math.min(1, 0.6 * e.alpha * k);
      ctx.drawImage(s.c, e.x - r, e.y - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1;
  }
  drawEnemies(ground) {
    ctx.globalCompositeOperation = 'lighter';
    this.drawGlows(ground);
    ctx.globalCompositeOperation = 'source-over';
    for (const e of this.enemies) {
      if (e.dead || e.ground !== ground) continue;
      if (e.y < -80 || e.y > view.h + 80) continue;
      setRTS(e.x, e.y, e.face || 0, e.scale, e.scale);
      ctx.globalAlpha = e.alpha;
      e.T.draw(ctx, e, e.t);
      ctx.globalAlpha = 1;
    }
    baseT();
    ctx.globalCompositeOperation = 'lighter';
    for (const e of this.enemies) {
      if (e.dead || e.ground !== ground) continue;
      if (e.flash > 0) { const s = glow('#ffffff', 16); const r = e.r * e.scale * 1.4; ctx.globalAlpha = 0.75; ctx.drawImage(s.c, e.x - r, e.y - r, r * 2, r * 2); }
      if (e.elite || e.carrier || e.nova) {
        const r = e.r * e.scale + 7;
        ctx.globalAlpha = 0.9;
        ctx.strokeStyle = e.nova ? `hsl(${(this.t * 300) % 360},100%,65%)` : e.elite ? '#ffd23f' : '#ff9d3c';
        ctx.lineWidth = 2; ctx.setLineDash([6, 5]); ctx.lineDashOffset = -this.t * 30;
        ctx.beginPath(); ctx.arc(e.x, e.y, r, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      }
      if (e.stun > 0) { ctx.globalAlpha = 0.6; ctx.strokeStyle = '#9fe8ff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(e.x, e.y, e.r * e.scale + 4, 0, TAU); ctx.stroke(); }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    for (const e of this.enemies) {
      if (e.dead || e.ground !== ground || e.hp >= e.max || e.max < 60 * this.D.hp && !e.elite) continue;
      const w = Math.max(24, e.r * e.scale * 1.6), y = e.y - e.r * e.scale - 9;
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(e.x - w / 2 - 1, y - 1, w + 2, 4);
      ctx.fillStyle = e.elite ? '#ffd23f' : '#ff6a8a'; ctx.fillRect(e.x - w / 2, y, w * Math.max(0, e.hp / e.max), 2);
    }
  }
  drawPB() {
    for (const b of this.pbs) {
      if (b.kind === 'flame') {
        const k = 1 - b.t / b.life;
        const s = glow(k > 0.5 ? '#ffd23f' : b.big ? '#ff6a2a' : '#ff5a2a', 16);
        ctx.globalAlpha = Math.min(1, k * 1.5);
        ctx.drawImage(s.c, b.x - b.r * 1.6, b.y - b.r * 1.6, b.r * 3.2, b.r * 3.2);
        continue;
      }
      if (b.kind === 'wave') {
        ctx.globalAlpha = 0.9;
        ctx.strokeStyle = b.color; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(b.x, b.y + b.r * 0.9, b.r, -Math.PI * 0.82, -Math.PI * 0.18); ctx.stroke();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.2; ctx.stroke();
        ctx.globalAlpha = 0.25; ctx.strokeStyle = b.color; ctx.lineWidth = 8; ctx.stroke();
        continue;
      }
      if (b.kind === 'orb') {
        const s = glow(b.color, 16);
        ctx.globalAlpha = 1; ctx.drawImage(s.c, b.x - 12, b.y - 12, 24, 24);
        ctx.drawImage(glow('#ffffff', 16).c, b.x - 5, b.y - 5, 10, 10);
        continue;
      }
      if (b.kind === 'vortex') {
        const k = 1 - b.t / b.life;
        const s = glow(b.color, 32);
        ctx.globalAlpha = k * 0.7; ctx.drawImage(s.c, b.x - b.r * 1.3, b.y - b.r * 1.3, b.r * 2.6, b.r * 2.6);
        ctx.globalAlpha = k; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5;
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(b.x, b.y, b.r * (0.3 + i * 0.25), this.t * 8 + i * 2, this.t * 8 + i * 2 + 2.2); ctx.stroke(); }
        continue;
      }
      if (!b.spr) continue;
      ctx.globalAlpha = b.ghost ? 0.7 : 1;
      const a = Math.atan2(b.vy, b.vx) + Math.PI / 2;
      setRT(b.x, b.y, a);
      ctx.drawImage(b.spr.c, -16, -16, 32, 32);
    }
    baseT();
    ctx.globalAlpha = 1;
  }
  drawBolts() {
    baseT();
    for (const L of this.lines) { const k = L.life / L.max; ctx.globalAlpha = k; ctx.strokeStyle = L.c; ctx.lineWidth = L.w; ctx.beginPath(); ctx.moveTo(L.x1, L.y1); ctx.lineTo(L.x2, L.y2); ctx.stroke(); }
    for (const B of this.bolts) {
      const pts = B.pts;
      ctx.globalAlpha = 0.9;
      for (let pass = 0; pass < 2; pass++) {
        ctx.strokeStyle = pass ? '#ffffff' : B.color; ctx.lineWidth = pass ? B.w * 0.5 : B.w * 2.2;
        ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
        for (let i = 2; i < pts.length; i += 2) {
          const mx = (pts[i - 2] + pts[i]) / 2 + rand(-8, 8), my = (pts[i - 1] + pts[i + 1]) / 2 + rand(-8, 8);
          ctx.lineTo(mx, my); ctx.lineTo(pts[i], pts[i + 1]);
        }
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }
  drawHazards() {
    baseT();
    for (const h of this.hazards) {
      if (h.kind !== 'laser' || h.t < 0) continue;
      const L = 1500, c = Math.cos(h.ang), s = Math.sin(h.ang);
      const x2 = h.x + c * L, y2 = h.y + s * L;
      if (h.t < h.warm) {
        const k = h.t / h.warm;
        ctx.strokeStyle = rgba(h.color, 0.3 + 0.5 * Math.abs(Math.sin(h.t * 25)));
        ctx.lineWidth = 1 + k * 2; ctx.setLineDash([12, 8]);
        ctx.beginPath(); ctx.moveTo(h.x, h.y); ctx.lineTo(x2, y2); ctx.stroke(); ctx.setLineDash([]);
        ctx.globalCompositeOperation = 'lighter';
        const sp = glow(h.color, 16); const r = 8 + k * 18;
        ctx.drawImage(sp.c, h.x - r, h.y - r, r * 2, r * 2);
        ctx.globalCompositeOperation = 'source-over';
      } else {
        const k = Math.min(1, (h.warm + h.dur - h.t) * 6);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = k;
        for (const [w, col] of [[h.w * 1.8, rgba(h.color, 0.3)], [h.w, h.color], [h.w * 0.4, '#ffffff']]) {
          ctx.strokeStyle = col; ctx.lineWidth = w * (0.9 + 0.1 * Math.sin(this.t * 50));
          ctx.beginPath(); ctx.moveTo(h.x, h.y); ctx.lineTo(x2, y2); ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }
    }
  }
  drawEB() {
    for (const b of this.ebs) {
      const s = b.spr;
      if (b.orient) { setRT(b.x, b.y, Math.atan2(b.vy, b.vx) + Math.PI / 2); ctx.drawImage(s.c, -s.hw, -s.hh, s.w, s.h); }
      else ctx.drawImage(s.c, b.x - s.hw, b.y - s.hh, s.w, s.h);
    }
    baseT();
  }
  drawDebris() {
    baseT();
    for (const d of this.debris) {
      setRT(d.x, d.y, d.rot);
      ctx.fillStyle = d.col.c1; ctx.strokeStyle = d.col.cg; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-d.r, -d.r * 0.5); ctx.lineTo(d.r * 0.4, -d.r); ctx.lineTo(d.r, d.r * 0.3); ctx.lineTo(-d.r * 0.2, d.r); ctx.closePath(); ctx.fill(); ctx.stroke();
      baseT();
      const p = 0.5 + 0.5 * Math.sin(this.t * 10);
      ctx.strokeStyle = rgba('#ffbe7a', 0.5 + 0.5 * p); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(d.x, d.y, d.r + 8 + p * 4, 0, TAU); ctx.stroke();
      setT(d.x, d.y - d.r - 14); drawPart(ctx, 6); baseT();
    }
  }
  pause() { if (this.state !== 'play' && this.state !== 'clear') return; this.paused = true; sfx.laser(false); if (this.onPause) this.onPause(); }
  resume() { this.paused = false; this.ignoreTouch = false; }
}
