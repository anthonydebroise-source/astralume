// Vaisseau du joueur : contrôle au doigt (décalage), tir auto, bouclier, super mode, spéciale
import { TAU, clamp, rand, damp, rgba, hslHex } from '../engine/math.js';
import { view, ctx, setT, baseT, addShake, flash, hitstop } from '../engine/renderer.js';
import { input } from '../engine/input.js';
import { fx } from '../engine/particles.js';
import { glow } from '../engine/sprites.js';
import { polyPath } from './art.js';
import { SHIP_FX, SHIP_SCALE } from './ships.js';
import { SHIP_BY_ID } from '../economy/data.js';
import { shipStats } from '../economy/economy.js';
import { S } from '../economy/save.js';
import { questBonus } from '../economy/quest.js';
import { sfx } from '../audio/sfx.js';
import { music } from '../audio/music.js';
import { explode } from './fx.js';

const OFFSETS = [0, 40, 70, 100];
export const MAXW = 10; // niveaux de puissance (au-delà de 6 : même motif, dégâts et cadence accrus)

export class Player {
  constructor(g, o) {
    this.g = g;
    this.id = o.ship; this.startId = o.ship;
    this.meta = SHIP_BY_ID[this.id];
    this.F = SHIP_FX[this.id];
    this.col = this.meta.color; this.col2 = this.meta.color2;
    const st = shipStats(this.id);
    this.dmgMul0 = st.dmg; this.rateMul0 = st.rate; this.specMul = st.spec; this.chargeMul = st.charge; this.aw = st.aw; this.ev = st.ev || 0; this.escT = 0; this.aura = st.aura; this.auraT = 3;
    this.crit = S.up.crit * 0.03;
    // reliques de la Couronne (quête) : bonus permanents
    const qb = this.qb = g.def.mode === 'duel' || g.def.mode === 'race' ? { dmg: 0, coins: 0, shield: 0, drone: 0, hull: 0, charge: 0 } : questBonus();
    this.maxHp = g.def.glass ? 1 : 3 + S.up.hull + qb.hull;
    this.hp = this.maxHp;
    this.shield = g.def.glass ? 0 : S.up.shield + qb.shield + (o.boosts.shield ? 1 : 0);
    this.dmgMul0 *= 1 + qb.dmg; this.chargeMul *= 1 + qb.charge;
    this.wlvl = clamp(1 + S.up.arsenal + (o.boosts.power ? 2 : 0), 1, MAXW);
    this.gauge = 0.3;
    this.superMax = 8 + S.up.nova;
    this.super = o.boosts.nova ? 6 : 0;
    this.magnetT = 0;
    this.magR = 120 * (1 + 0.2 * S.up.magnet);
    this.x = view.w / 2; this.y = view.h + 60;
    this.tx = this.x; this.ty = view.h - view.safeB - 150;
    this.inv = 2.5; this.alive = true; this.r = 6;
    this.bank = 0; this.t = 0;
    this.beams = []; this.blades = []; this.hist = []; this.ghosts = [];
    this.wcd = 0.4;
    this.vol = { x: 0, y: 0, lvl: 1, dmg: 1, col: this.col };
    this.special = null;
    this.phoenix = this.id === 'phenix' ? 1 : 0;
    this.entering = 1.1;
    this.anchorX = 0; this.anchorY = 0;
    this.readyPlayed = false;
  }
  // Changement de vaisseau en vol (capsule de renfort) : garde le niveau d'arme
  switchShip(id) {
    if (!SHIP_BY_ID[id]) return;
    if (this.id === 'lance') sfx.laser(false);
    this.id = id; this.meta = SHIP_BY_ID[id]; this.F = SHIP_FX[id];
    this.col = this.meta.color; this.col2 = this.meta.color2;
    const st = shipStats(id);
    this.dmgMul0 = st.dmg * (1 + this.qb.dmg); this.rateMul0 = st.rate; this.specMul = st.spec; this.chargeMul = st.charge * (1 + this.qb.charge); this.aw = st.aw; this.ev = st.ev || 0; this.aura = st.aura; this.auraT = 2;
    this.beams.length = 0; this.blades.length = 0; this.special = null;
    this.phoenix = id === 'phenix' ? 1 : 0;
    this.wcd = 0.15; this.inv = Math.max(this.inv, 1.2);
    this.vol.col = this.col;
  }
  get dmgMul() { return this.dmgMul0 * (this.super > 0 ? 1.8 : 1); }
  get rateMul() { return this.rateMul0 * (this.super > 0 ? 1.35 : 1); }
  effLvl() { return Math.min(MAXW, this.wlvl + (this.super > 0 ? 2 : 0)); }

  update(dt) {
    const g = this.g;
    this.t += dt;
    if (!this.alive) return;
    // ----- Déplacement -----
    if (this.entering > 0) {
      this.entering -= dt;
      this.y = damp(this.y, this.ty, 5, dt);
      this.x = damp(this.x, this.tx, 5, dt);
    } else {
      const set = S.settings;
      if (input.down) {
        if (set.control === 'relative') {
          if (input.justDown) { this.anchorX = this.x - input.x; this.anchorY = this.y - input.y; }
          this.tx = input.x + this.anchorX; this.ty = input.y + this.anchorY;
        } else {
          this.tx = input.x; this.ty = input.y - OFFSETS[set.offset ?? 2];
        }
      }
      const k = input.keys;
      const kv = 330 * dt;
      if (k.ArrowLeft || k.KeyA) this.tx -= kv; if (k.ArrowRight || k.KeyD) this.tx += kv;
      if (k.ArrowUp || k.KeyW) this.ty -= kv; if (k.ArrowDown || k.KeyS) this.ty += kv;
      this.tx = clamp(this.tx, 22, view.w - 22);
      this.ty = clamp(this.ty, view.safeT + 70, view.h - view.safeB - 44);
      const ox = this.x;
      this.x = damp(this.x, this.tx, 40, dt);
      this.y = damp(this.y, this.ty, 40, dt);
      const vx = dt > 0 ? (this.x - ox) / dt : 0;
      this.bank = damp(this.bank, clamp(vx / 520, -1, 1), 12, dt);
    }
    this.hist.push(this.x, this.y);
    if (this.hist.length > 120) this.hist.splice(0, 2);
    // ----- Tir -----
    if (!g.def.noWeapons && this.entering <= 0.6) this.fire(dt);
    else sfx.laser(false);
    // ----- Spéciale -----
    if (this.special) {
      const Sp = this.special;
      Sp.t += dt;
      this.F.special.update(g, this, dt, Sp);
      if (Sp.t >= Sp.dur) this.special = null;
    } else {
      this.gauge = Math.min(1, this.gauge + dt / 40 * this.chargeMul);
      if (this.gauge >= 1 && !this.readyPlayed) { this.readyPlayed = true; sfx.ready(); }
    }
    // ----- Minuteries -----
    this.inv = Math.max(0, this.inv - dt);
    if (this.super > 0) {
      this.super -= dt;
      music.setIntensity(1);
      if (this.super <= 0) { g.msg('Hypernova épuisée', '#c8c8ff', 14, 1); }
      this.ghosts.push({ x: this.x, y: this.y, t: 0.35, h: (this.t * 360) % 360 });
    }
    for (let i = this.ghosts.length - 1; i >= 0; i--) { this.ghosts[i].t -= dt; if (this.ghosts[i].t <= 0) this.ghosts.splice(i, 1); }
    this.magnetT = Math.max(0, this.magnetT - dt);
    // Traînée du réacteur
    const ec = this.super > 0 ? hslHex((this.t * 400) % 360, 100, 65) : this.col;
    fx.dot(this.x + rand(-5, 5), this.y + 42, rand(-10, 10) - this.bank * 40, rand(160, 230), 0.26, this.super > 0 ? 13 : 9, ec, 0.9);
    if (Math.random() < 0.5) fx.dot(this.x + rand(-3, 3), this.y + 40, 0, 180, 0.16, 6, '#ffffff', 0.9);
  }

  fire(dt) {
    const g = this.g, W = this.F.weapon;
    const lvl = this.effLvl();
    // Peinture « Aura de foudre » : décharge périodique autour du vaisseau
    if (this.aura) {
      this.auraT -= dt;
      if (this.auraT <= 0) {
        this.auraT = 5;
        const n = g.cancelBullets({ x: this.x, y: this.y, r: 85 }, true);
        g.forTargets((t) => { if (!t.shielded && (t.x - this.x) ** 2 + (t.y - this.y) ** 2 < 110 * 110) { g.hitTarget(t, 14 * this.dmgMul, t.x, t.y, true); g.lineFx(this.x, this.y, t.x, t.y, '#bfe8ff', 0.25, 2); } });
        fx.ring(this.x, this.y, 10, 95, 0.35, '#bfe8ff', 3); fx.ring(this.x, this.y, 6, 70, 0.25, this.col, 2);
        if (n) sfx.zap();
      }
    }
    // Évolution ★3 : salve d'escorte (deux traits à tête chercheuse depuis les canons d'aile)
    if (this.ev >= 3 && !g.def.noWeapons) {
      this.escT -= dt * this.rateMul;
      if (this.escT <= 0) {
        this.escT = this.ev >= 6 ? 0.55 : 0.8;
        for (const k of [-1, 1]) g.addPB(this.x + k * 22, this.y - 6, k * 90, -520, 2.4 * this.dmgMul, 'spark', { homing: 6, color: this.col, life: 1.6 });
      }
    }
    if (W.update) W.update(g, this, dt);
    this.wlvlEff = lvl;
    this.wcd -= dt * this.rateMul;
    if (this.wcd <= 0) {
      this.wcd += W.interval(Math.min(6, lvl)) / (1 + 0.05 * Math.max(0, lvl - 6));
      if (this.wcd < -0.2) this.wcd = 0;
      const v = this.vol, over = 1 + 0.16 * Math.max(0, lvl - 6);
      v.x = this.x; v.y = this.y - 18; v.lvl = Math.min(6, lvl); v.dmg = this.dmgMul * over; v.ghost = false; v.col = this.col;
      W.volley(g, v);
      if (this.id !== 'lance' && this.id !== 'phenix') sfx.shot(this.id === 'paon' ? 1 : this.id === 'diapason' ? 1 : 0);
      else if (this.id === 'phenix') sfx.shot(2);
      for (const d of g.drones) if (d.id === 'echo') {
        const e = d.echoVol || (d.echoVol = { x: 0, y: 0, lvl: 1, dmg: 1, ghost: true, col: '#c8a2ff' });
        e.x = d.x; e.y = d.y; e.lvl = Math.max(1, Math.min(6, lvl) - 1); e.dmg = this.dmgMul * 0.32 * d.P;
        W.volley(g, e);
      }
    }
  }

  trySpecial() {
    const g = this.g;
    if (!this.alive || this.special || this.gauge < 1 || this.entering > 0 || g.def.noWeapons) return false;
    const ph = music.beatPos() % 1;
    const off = Math.min(ph, 1 - ph) * (60 / music.bpm);
    const perfect = off < 0.11;
    const P = this.specMul * (perfect ? 1.35 : 1) * (this.super > 0 ? 1.3 : 1);
    this.special = { t: 0, dur: this.F.special.dur, P, aw: this.aw, perfect };
    this.F.special.start(g, this, this.special);
    this.gauge = 0; this.readyPlayed = false;
    this.inv = Math.max(this.inv, 0.8);
    g.stats.specials++;
    sfx.special();
    flash(this.col, 0.35); addShake(0.25);
    fx.ring(this.x, this.y, 10, 120, 0.5, this.col, 5);
    g.msg(this.meta.special.toUpperCase() + ' !', this.col, 24, 1.1);
    if (perfect) {
      g.stats.perfects++;
      sfx.perfect();
      fx.text(this.x, this.y - 40, 'PARFAIT !', '#ffffff', 22, 1.1, -50);
      fx.ring(this.x, this.y, 20, 160, 0.6, '#ffffff', 3);
    }
    return true;
  }

  hurt() {
    const g = this.g;
    if (!this.alive || this.inv > 0 || this.entering > 0) return;
    if (this.shield > 0) {
      this.shield--;
      this.inv = 1.2;
      sfx.shieldBreak();
      fx.ring(this.x, this.y, 18, 90, 0.4, '#38f2ff', 4);
      for (let i = 0; i < 12; i++) { const a = rand(TAU); fx.spark(this.x, this.y, Math.cos(a) * 240, Math.sin(a) * 240, 0.35, 10, '#9ff6ff', 1.6); }
      g.cancelBullets({ x: this.x, y: this.y, r: 95 }, true);
      addShake(0.2);
      return;
    }
    this.hp--;
    g.stats.hullHits++;
    this.wlvl = Math.max(1, this.wlvl - 1);
    // un vaisseau légendaire attrapé en capsule est perdu au premier coup (les autres restent)
    if (this.meta.rarity >= 3 && this.id !== this.startId && this.hp > 0) {
      g.msg(this.meta.name.toUpperCase() + ' PERDU !', '#ff8aa8', 18, 1.6);
      this.switchShip(this.startId || 'etincelle');
    }
    this.inv = 2.2;
    sfx.hurt();
    flash('#ff2040', 0.4); addShake(0.45); hitstop(0.08);
    explode(this.x, this.y, 2, '#ff4f6e', '#ffffff', false);
    g.cancelBullets({ x: this.x, y: this.y, r: 110 }, false);
    if (this.hp <= 0) {
      if (this.phoenix > 0) {
        this.phoenix--; this.hp = this.maxHp; this.inv = 3.5;
        g.msg('RENAISSANCE !', '#ffb02f', 28, 1.6);
        sfx.revive();
        for (let i = 0; i < 30; i++) { const a = rand(TAU); fx.spark(this.x, this.y, Math.cos(a) * 300, Math.sin(a) * 300, 0.6, 16, i % 2 ? '#ff5a2a' : '#ffd23f', 2.2); }
        fx.ring(this.x, this.y, 10, 200, 0.7, '#ffb02f', 6);
        g.cancelBullets(null, true);
        return;
      }
      this.die();
    } else g.radio('hurt');
  }
  die() {
    const g = this.g;
    this.alive = false;
    sfx.laser(false);
    explode(this.x, this.y, 4, this.col, '#ffffff', false);
    flash('#ffffff', 0.6);
    g.playerDied();
  }
  revive() {
    this.alive = true; this.hp = this.maxHp; this.inv = 3.5; this.shield = Math.max(this.shield, 1);
    this.gauge = 1; this.wlvl = Math.max(this.wlvl, 2);
    this.x = view.w / 2; this.y = view.h + 40; this.entering = 0.8;
    this.ty = view.h - view.safeB - 150; this.tx = view.w / 2;
    sfx.revive();
  }

  drawBelow() {
    // halo + rayons du super mode (additif)
    if (!this.alive) return;
    const g = glow(this.super > 0 ? hslHex((this.t * 300) % 360, 100, 60) : this.col, 32);
    ctx.globalAlpha = 0.55;
    ctx.drawImage(g.c, this.x - 48, this.y - 44, 96, 96);
    if (this.super > 0) {
      baseT();
      ctx.globalAlpha = 0.13;
      for (let i = 0; i < 8; i++) {
        const a = this.t * 1.5 + (i / 8) * TAU;
        ctx.fillStyle = hslHex((i * 45 + this.t * 200) % 360, 100, 60);
        ctx.beginPath(); ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x + Math.cos(a - 0.08) * 150, this.y + Math.sin(a - 0.08) * 150);
        ctx.lineTo(this.x + Math.cos(a + 0.08) * 150, this.y + Math.sin(a + 0.08) * 150);
        ctx.closePath(); ctx.fill();
      }
      for (const gh of this.ghosts) {
        ctx.globalAlpha = gh.t * 0.8;
        const s = glow(hslHex(gh.h, 100, 60), 16);
        ctx.drawImage(s.c, gh.x - 24, gh.y - 24, 48, 48);
      }
    }
    ctx.globalAlpha = 1;
  }
  draw() {
    if (!this.alive) return;
    const blink = this.inv > 0 && this.entering <= 0 && Math.floor(this.t * 18) % 2 === 0;
    ctx.globalAlpha = blink ? 0.45 : 1;
    // Lames de la Faucheuse
    if (this.blades.length) {
      for (const b of this.blades) {
        setT(b.x, b.y);
        ctx.rotate(b.a + Math.PI / 2);
        ctx.fillStyle = '#ffe9a0'; ctx.strokeStyle = this.col; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(0, -11); ctx.quadraticCurveTo(7, 0, 0, 11); ctx.quadraticCurveTo(3, 0, 0, -11); ctx.fill(); ctx.stroke();
      }
    }
    setT(this.x, this.y);
    ctx.rotate(this.bank * 0.1);
    ctx.scale((1 - Math.abs(this.bank) * 0.25) * SHIP_SCALE, SHIP_SCALE);
    this.F.draw(ctx, this.t, this.col, this.col2, this.bank);
    baseT();
    ctx.globalAlpha = 1;
    if (this.inv > 0 && this.entering <= 0 && this.alive) {
      setT(this.x, this.y);
      const k = Math.min(1, this.inv);
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = rgba('#bff6ff', 0.25 + 0.3 * k * (0.5 + 0.5 * Math.sin(this.t * 14)));
      ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, 0, 37, 0, TAU); ctx.stroke();
      ctx.fillStyle = rgba('#bff6ff', 0.025 * k); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      baseT();
    }
    if (this.shield > 0) {
      setT(this.x, this.y);
      const p = 1 + 0.05 * Math.sin(this.t * 6);
      ctx.strokeStyle = rgba('#38f2ff', 0.75); ctx.lineWidth = 1.6;
      polyPath(ctx, 6, 38 * p, this.t * 0.6); ctx.stroke();
      ctx.fillStyle = rgba('#38f2ff', 0.07); ctx.fill();
      if (this.shield > 1) { ctx.strokeStyle = rgba('#a0f8ff', 0.5); polyPath(ctx, 6, 42 * p, -this.t * 0.6); ctx.stroke(); }
      if (this.shield > 2) { polyPath(ctx, 6, 46 * p, this.t); ctx.stroke(); }
      baseT();
    }
    if (S.settings.hitbox && this.entering <= 0) {
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(this.x, this.y, 3, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#ff3f6e'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(this.x, this.y, 5.2, 0, TAU); ctx.stroke();
    }
  }
}
