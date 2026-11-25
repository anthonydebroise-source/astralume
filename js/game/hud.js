// Interface en jeu (dessinée sur le canvas) : cœurs, pièces, progression, jauge spéciale rythmée, boss, messages
import { TAU, clamp, rgba, fmt, hslHex, ease, lighten, darken } from '../engine/math.js';
import { view, ctx, baseT, setT } from '../engine/renderer.js';
import { sprite, glow } from '../engine/sprites.js';
import { drawHeart, drawCoin, drawCrystal, drawGem, drawPart, drawShieldIco, polyPath, starPath } from './art.js';
import { music } from '../audio/music.js';
import { CHALLENGES, TRAITS } from '../levels/generator.js';

const FONT = '"Avenir Next Condensed","Avenir Next","Roboto Condensed",system-ui,sans-serif';
function txt(s, x, y, size, color, align = 'left', weight = 800, stroke = true) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align; ctx.textBaseline = 'middle';
  if (stroke) { ctx.lineWidth = Math.max(2, size * 0.2); ctx.strokeStyle = 'rgba(4,2,16,0.85)'; ctx.strokeText(s, x, y); }
  ctx.fillStyle = color; ctx.fillText(s, x, y);
}
const ico = (name, r, fn) => sprite('hud' + name + r, r * 2 + 2, r * 2 + 2, (g, w) => { g.translate(w / 2, w / 2); fn(g, r); });

export class Hud {
  constructor(g) {
    this.g = g; this.msgs = []; this.radio = null; this.coinsShown = 0; this.bump = 0;
    this.banner = null; this.warn = 0; this.t = 0;
  }
  get top() { return view.safeT + 8; }
  specBtn() { return { x: view.w - 48, y: view.h - view.safeB - 52, r: 33 }; }
  pauseBtn() { return { x: 26, y: this.top + 17, r: 19 }; }
  hit(x, y) {
    const p = this.pauseBtn(); if ((x - p.x) ** 2 + (y - p.y) ** 2 < (p.r + 10) ** 2) return 'pause';
    const s = this.specBtn(); if ((x - s.x) ** 2 + (y - s.y) ** 2 < (s.r + 10) ** 2) return 'special';
    return null;
  }
  addMsg(text, color = '#ffffff', size = 20, dur = 1.4, big = false) {
    if (this.msgs.length > 3) this.msgs.shift();
    this.msgs.push({ text, color, size, dur, t: 0, big });
  }
  setRadio(text) { if (text) this.radio = { text, t: 0, dur: 4.8 }; }
  showBanner() { this.banner = { t: 0, dur: 3.2 }; }
  update(dt) {
    this.t += dt;
    const target = this.g.stats.coins;
    if (this.coinsShown < target) { this.coinsShown = Math.min(target, this.coinsShown + Math.max(1, (target - this.coinsShown) * dt * 8)); }
    this.bump = Math.max(0, this.bump - dt * 4);
    for (let i = this.msgs.length - 1; i >= 0; i--) { this.msgs[i].t += dt; if (this.msgs[i].t > this.msgs[i].dur) this.msgs.splice(i, 1); }
    if (this.radio) { this.radio.t += dt; if (this.radio.t > this.radio.dur) this.radio = null; }
    if (this.banner) { this.banner.t += dt; if (this.banner.t > this.banner.dur) this.banner = null; }
    this.warn = Math.max(0, this.warn - dt);
  }
  // Jauge de puissance (niveau d'arme) : 6 chevrons lumineux, éclat à chaque gain
  drawPower(p, top) {
    const lv = p.effLvl ? p.effLvl() : p.wlvl;
    if (this.lastLv === undefined) this.lastLv = lv;
    if (lv > this.lastLv) { this.pFlash = 1; this.pFlashI = lv - 1; }
    this.lastLv = lv;
    this.pFlash = Math.max(0, (this.pFlash || 0) - 0.025);
    const x0 = 50, y0 = top + 22, sw = 12.5, sh = 10.5, gap = 2.2, sk = 3.5;
    const COLS = ['#ffe94a', '#ffc23d', '#ff9d3c', '#ff6a4f', '#ff3f8e', '#d65cff'];
    const pul = 1 + this.pFlash * 0.12;
    ctx.save(); ctx.translate(x0, y0 + sh / 2); ctx.scale(pul, pul); ctx.translate(-x0, -(y0 + sh / 2));
    // socle
    ctx.fillStyle = 'rgba(8,4,24,0.72)';
    ctx.beginPath(); ctx.moveTo(x0 - 4 + sk, y0 - 3); ctx.lineTo(x0 + 6 * (sw + gap) + 30 + sk, y0 - 3); ctx.lineTo(x0 + 6 * (sw + gap) + 30, y0 + sh + 3); ctx.lineTo(x0 - 4, y0 + sh + 3); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,190,90,0.45)'; ctx.lineWidth = 1; ctx.stroke();
    for (let i = 0; i < 6; i++) {
      const x = x0 + i * (sw + gap);
      ctx.beginPath(); ctx.moveTo(x + sk, y0); ctx.lineTo(x + sw + sk, y0); ctx.lineTo(x + sw, y0 + sh); ctx.lineTo(x, y0 + sh); ctx.closePath();
      if (i < lv) {
        const over = p.super > 0 && i >= p.wlvl;
        const col = over ? hslHex((this.t * 300 + i * 50) % 360, 100, 62) : COLS[i];
        const gr = ctx.createLinearGradient(0, y0, 0, y0 + sh); gr.addColorStop(0, lighten(col, 0.55)); gr.addColorStop(0.5, col); gr.addColorStop(1, darken(col, 0.35));
        ctx.fillStyle = gr; ctx.fill();
        ctx.strokeStyle = lighten(col, 0.7); ctx.lineWidth = 0.8; ctx.stroke();
        if (this.pFlash > 0 && i === this.pFlashI) { ctx.fillStyle = `rgba(255,255,255,${this.pFlash})`; ctx.fill(); }
      } else { ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 0.8; ctx.stroke(); }
    }
    // halo des segments allumés
    ctx.globalCompositeOperation = 'lighter';
    const gl = glow(lv >= 6 ? '#ff7af0' : '#ffb347', 16);
    ctx.globalAlpha = 0.35 + 0.25 * Math.sin(this.t * 6) * (lv >= 6 ? 1 : 0.3) + this.pFlash * 0.6;
    const wl = lv * (sw + gap);
    ctx.drawImage(gl.c, x0 - 8, y0 - 10, wl + 16, sh + 20);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    const lx = x0 + 6 * (sw + gap) + 15;
    if (lv >= 6) txt('MAX', lx + 2, y0 + sh / 2 + 0.5, 10.5, hslHex((this.t * 200) % 360, 100, 72), 'center', 900);
    else txt('NV ' + lv, lx + 2, y0 + sh / 2 + 0.5, 10.5, '#ffe9a8', 'center', 900);
    ctx.restore();
    if (this.pFlash > 0.3) { ctx.globalCompositeOperation = 'lighter'; const g2 = glow('#ffffff', 16); const fx = x0 + this.pFlashI * (sw + gap) + sw / 2 + 2; ctx.globalAlpha = this.pFlash; ctx.drawImage(g2.c, fx - 26, y0 + sh / 2 - 26, 52, 52); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
  }
  draw() {
    const g = this.g, p = g.player, W = view.w, top = this.top;
    baseT();
    // Pause
    const pb = this.pauseBtn();
    ctx.fillStyle = 'rgba(10,6,30,0.6)'; ctx.beginPath(); ctx.arc(pb.x, pb.y, pb.r, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(180,170,255,0.5)'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.fillRect(pb.x - 6, pb.y - 7, 4, 14); ctx.fillRect(pb.x + 2, pb.y - 7, 4, 14);
    // Cœurs & boucliers
    const hs = ico('heart', 7, (c, r) => drawHeart(c, r));
    let x = 56;
    for (let i = 0; i < p.maxHp; i++) {
      const y = top + 10;
      if (i < p.hp) ctx.drawImage(hs.c, x - hs.hw, y - hs.hh, hs.w, hs.h);
      else { ctx.save(); ctx.translate(x, y); ctx.strokeStyle = 'rgba(255,120,160,0.5)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(0, 2.5); ctx.bezierCurveTo(-7.7, -2.5, -3.5, -7.3, 0, -3.2); ctx.bezierCurveTo(3.5, -7.3, 7.7, -2.5, 0, 2.5); ctx.stroke(); ctx.restore(); }
      x += 17;
    }
    const ss = ico('shield', 6.5, (c, r) => drawShieldIco(c, r));
    for (let i = 0; i < p.shield; i++) { ctx.drawImage(ss.c, x - ss.hw, top + 10 - ss.hh, ss.w, ss.h); x += 15; }
    // Niveau d'arme
    this.drawPower(p, top);
    // Progression
    const px = W / 2 - 60, pw = 120, py = top + 4;
    const prog = g.progress();
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(px, py, pw, 4);
    const pg = ctx.createLinearGradient(px, 0, px + pw, 0); pg.addColorStop(0, g.pal.neb2); pg.addColorStop(1, '#ffffff');
    ctx.fillStyle = pg; ctx.fillRect(px, py, pw * prog, 4);
    txt(g.def.code, W / 2, py + 14, 11, 'rgba(230,230,255,0.8)', 'center', 700);
    if (g.def.kind === 'boss' || g.def.kind === 'miniboss') { ctx.fillStyle = '#ff4f6e'; ctx.beginPath(); ctx.arc(px + pw + 6, py + 2, 3.5, 0, TAU); ctx.fill(); }
    // Pièces
    const cs = ico('coin', 7, (c, r) => drawCoin(c, r, 1));
    const sc = 1 + this.bump * 0.25;
    const ctext = fmt(this.coinsShown);
    txt(ctext, W - 14, top + 10, 15 * sc, '#ffe27a', 'right');
    ctx.font = `800 ${15 * sc}px ${FONT}`;
    const tw = ctx.measureText(ctext).width;
    ctx.drawImage(cs.c, W - 24 - tw - cs.hw, top + 10 - cs.hh, cs.w, cs.h);
    let ry = top + 28;
    const extras = [['crystals', g.stats.crystals, '#7df9ff', (c, r) => drawCrystal(c, r)], ['gems', g.stats.gems, '#ff8ae6', (c, r) => drawGem(c, r)], ['parts', g.stats.parts, '#ffbe7a', (c, r) => drawPart(c, r)]];
    for (const [k, n, col, fn] of extras) {
      if (!n) continue;
      const s = ico(k, 5.5, fn);
      txt(String(n), W - 14, ry, 12, col, 'right');
      ctx.font = `800 12px ${FONT}`;
      const w2 = ctx.measureText(String(n)).width;
      ctx.drawImage(s.c, W - 20 - w2 - s.hw, ry - s.hh, s.w, s.h);
      ry += 15;
    }
    // Super mode : anneau arc-en-ciel autour du vaisseau
    if (p.super > 0 && p.alive) {
      const k = p.super / p.superMax;
      ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      const segs = 24;
      for (let i = 0; i < segs * k; i++) {
        const a0 = -Math.PI / 2 + (i / segs) * TAU, a1 = a0 + TAU / segs * 0.8;
        ctx.strokeStyle = hslHex((this.t * 240 + i * 15) % 360, 100, 65);
        ctx.beginPath(); ctx.arc(p.x, p.y, 50, a0, a1); ctx.stroke();
      }
      ctx.lineCap = 'butt';
    }
    // Objectif des défis
    const goal = g.goalText();
    if (goal) txt(goal, W / 2, top + 40, 14, '#9ff6ff', 'center');
    // Barre du boss
    if (g.boss && g.boss.state !== 'dead') this.drawBoss(g.boss);
    // Radio
    if (this.radio) this.drawRadio();
    // Chaîne
    const ch = g.combo;
    if (ch.pts.length >= 2) {
      const cx = 24, cy = view.h - view.safeB - 110;
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = i < ch.pts.length ? '#bfe8ff' : 'rgba(255,255,255,0.15)';
        setT(cx, cy - i * 11); starPath(ctx, 4, i < ch.pts.length ? 4.5 : 3, 1.2, 0, false); ctx.fill();
      }
      baseT();
      txt('×' + ch.chain, cx, cy + 14, 11, '#bfe8ff', 'center');
    }
    // Bouton spécial
    this.drawSpecial();
    // Messages
    this.drawMsgs();
    if (this.banner) this.drawBanner();
    if (this.warn > 0) this.drawWarning();
  }
  drawSpecial() {
    const g = this.g, p = g.player, b = this.specBtn();
    if (g.def.noWeapons) return;
    const full = p.gauge >= 1 && !p.special;
    ctx.fillStyle = 'rgba(8,5,26,0.65)'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(b.x, b.y, b.r - 4, 0, TAU); ctx.stroke();
    ctx.strokeStyle = full ? '#ffffff' : p.col; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r - 4, -Math.PI / 2, -Math.PI / 2 + TAU * (p.special ? 1 - p.special.t / p.special.dur : p.gauge)); ctx.stroke();
    ctx.lineCap = 'butt';
    if (full) {
      const ph = ((music.beatPos() % 1) + 1) % 1;
      const rr = b.r + 26 * (1 - ph);
      ctx.strokeStyle = rgba('#ffffff', 0.15 + 0.6 * ph); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(b.x, b.y, rr, 0, TAU); ctx.stroke();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = rgba(p.col, 0.25 + 0.2 * Math.sin(this.t * 8)); ctx.beginPath(); ctx.arc(b.x, b.y, b.r - 6, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
    setT(b.x, b.y - 4); ctx.rotate(this.t * (full ? 2 : 0.3));
    ctx.fillStyle = full ? '#ffffff' : rgba(p.col, 0.6);
    starPath(ctx, 4, 11, 4, 0, false); ctx.fill();
    baseT();
    txt(full ? 'PRÊT' : 'SPÉCIALE', b.x, b.y + 15, full ? 10 : 8, full ? '#ffffff' : 'rgba(220,220,255,0.7)', 'center');
  }
  drawBoss(B) {
    const W = view.w, y = this.top + 50;
    const k = clamp(B.hpFrac(), 0, 1);
    txt(B.name.toUpperCase(), W / 2, y - 6, 12, '#ffd0dc', 'center');
    const bw = W - 80, bx = 40;
    ctx.fillStyle = 'rgba(20,0,10,0.7)'; ctx.fillRect(bx - 2, y + 2, bw + 4, 9);
    const gr = ctx.createLinearGradient(bx, 0, bx + bw, 0); gr.addColorStop(0, '#ff3f6e'); gr.addColorStop(1, '#ffb02f');
    ctx.fillStyle = gr; ctx.fillRect(bx, y + 4, bw * k, 5);
    const parts = B.parts.length;
    const alive = B.parts.filter((q) => q.alive).length;
    for (let i = 0; i < parts; i++) { ctx.fillStyle = i < alive ? '#ff8aa8' : 'rgba(255,255,255,0.15)'; ctx.fillRect(bx + (i / parts) * bw, y + 13, bw / parts - 2, 2); }
    if (!B.coreOpen && B.state === 'fight') txt('Détruisez ses parties pour exposer le noyau', W / 2, y + 23, 9.5, 'rgba(255,210,220,0.8)', 'center', 600);
  }
  drawRadio() {
    const r = this.radio;
    const n = Math.min(r.text.length, Math.floor(r.t * 45));
    const a = Math.min(1, r.t * 4, (r.dur - r.t) * 2);
    const x = 12, y = view.h - view.safeB - 28, w = view.w - 110;
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(6,4,22,0.72)'; ctx.fillRect(x, y - 15, w, 30);
    ctx.fillStyle = this.g.pal.neb2; ctx.fillRect(x, y - 15, 3, 30);
    txt('LYRA', x + 9, y, 9, this.g.pal.neb2, 'left', 800, false);
    ctx.font = `600 10px "Avenir Next",system-ui,sans-serif`;
    ctx.fillStyle = '#e6eaff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    const lines = [];
    let line = '';
    for (const wd of r.text.slice(0, n).split(' ')) {
      const test = line ? line + ' ' + wd : wd;
      if (ctx.measureText(test).width > w - 50 && line) { lines.push(line); line = wd; } else line = test;
    }
    lines.push(line);
    if (lines.length === 1) ctx.fillText(lines[0], x + 40, y);
    else { ctx.fillText(lines[0], x + 40, y - 6); ctx.fillText(lines.slice(1).join(' '), x + 40, y + 7); }
    ctx.globalAlpha = 1;
  }
  drawMsgs() {
    let y = view.h * 0.36;
    for (const m of this.msgs) {
      const u = m.t / m.dur;
      const pop = m.t < 0.15 ? ease.outBack(m.t / 0.15) : 1;
      const a = Math.min(1, (m.dur - m.t) * 3);
      ctx.globalAlpha = a;
      txt(m.text, view.w / 2, y - u * 10, m.size * pop, m.color, 'center');
      ctx.globalAlpha = 1;
      y += m.size + 8;
    }
  }
  drawBanner() {
    const g = this.g, b = this.banner, d = g.def;
    const a = Math.min(1, b.t * 3, (b.dur - b.t) * 2);
    const y = view.h * 0.42;
    ctx.globalAlpha = a * 0.75;
    const gr = ctx.createLinearGradient(0, 0, view.w, 0);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.5, 'rgba(6,3,20,0.85)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gr; ctx.fillRect(0, y - 46, view.w, 92);
    ctx.globalAlpha = a;
    const slide = (1 - ease.outCubic(Math.min(1, b.t * 2))) * 60;
    txt(`SECTEUR ${d.code}`, view.w / 2 - slide, y - 24, 13, d.pal.neb2, 'center');
    txt(d.name.toUpperCase(), view.w / 2 + slide, y, 26, '#ffffff', 'center');
    let sub = d.kindName;
    if (d.kind === 'challenge') sub = 'Défi : ' + CHALLENGES[d.challenge].name;
    if (d.trait) sub += ' · ' + TRAITS[d.trait].name;
    txt(sub.toUpperCase(), view.w / 2, y + 24, 12, '#ffd23f', 'center');
    if (d.kind === 'challenge') txt(CHALLENGES[d.challenge].desc, view.w / 2, y + 40, 10, '#d8dcff', 'center', 600);
    else if (d.trait) txt(TRAITS[d.trait].desc, view.w / 2, y + 40, 10, '#d8dcff', 'center', 600);
    ctx.globalAlpha = 1;
  }
  drawWarning() {
    const a = Math.min(1, this.warn) * (0.6 + 0.4 * Math.sin(this.t * 14));
    ctx.globalAlpha = a;
    for (const y of [view.h * 0.3, view.h * 0.3 + 64]) {
      ctx.fillStyle = 'rgba(255,30,70,0.25)'; ctx.fillRect(0, y - 12, view.w, 24);
      ctx.fillStyle = '#ff3f6e';
      const off = (this.t * 80) % 40;
      for (let x = -40 + (y > view.h * 0.31 ? off : -off); x < view.w + 40; x += 40) { ctx.beginPath(); ctx.moveTo(x, y - 12); ctx.lineTo(x + 18, y - 12); ctx.lineTo(x + 6, y + 12); ctx.lineTo(x - 12, y + 12); ctx.fill(); }
    }
    txt('ALERTE', view.w / 2, view.h * 0.3 + 32, 30, '#ffffff', 'center');
    ctx.globalAlpha = 1;
  }
}
