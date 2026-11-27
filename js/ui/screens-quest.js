// Quête principale : écran « La Couronne », cartes de récit (Lyra / l'Archive), étoile rallumée, fin du jeu
import { h, btn, register, go, refresh, widget, modal, rewardRow, flyRewards, toast, ui } from './ui.js';
import { SVG } from './icons.js';
import { S, saveSoon } from '../economy/save.js';
import { WORLDS } from '../levels/worlds.js';
import { iconURL } from '../game/art.js';
import { ctx, baseT, view } from '../engine/renderer.js';
import { glow, makeCanvas } from '../engine/sprites.js';
import { TAU, rgba, fmt } from '../engine/math.js';
import { sfx } from '../audio/sfx.js';
import { music } from '../audio/music.js';
import { levelSheet } from './screens-main.js';
import { SHIP_BY_ID, DRONE_BY_ID } from '../economy/data.js';
import {
  STARS, ACTS, CYCLES, PROLOGUE, ENDING, RELICS, actOf, isLit, litCount, isClaimed, claimable, claimStar, starReward, starExtra,
  questState, objective, nextBig, pendingTales, markTold, markSeen, cycleUnlocked, currentCycle, setCycle, questBonus,
} from '../economy/quest.js';
import { bundleEntries } from '../economy/economy.js';

// ---------- Portraits ----------
const porCache = {};
function portrait(who) {
  if (porCache[who]) return porCache[who];
  const S2 = 128, c = makeCanvas(S2, S2), g = c.getContext('2d');
  g.translate(64, 64);
  const col = who === 'lyra' ? '#38f2ff' : '#ffd23f', col2 = who === 'lyra' ? '#ff4fd8' : '#ff8a3c';
  let gr = g.createRadialGradient(0, 0, 10, 0, 0, 62); gr.addColorStop(0, rgba(col, 0.35)); gr.addColorStop(1, 'rgba(4,2,16,0.95)');
  g.fillStyle = gr; g.beginPath(); for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + Math.PI / 6; g.lineTo(Math.cos(a) * 60, Math.sin(a) * 60); } g.closePath(); g.fill();
  g.strokeStyle = col; g.lineWidth = 3; g.stroke();
  g.lineWidth = 1; g.strokeStyle = rgba(col, 0.4); g.beginPath(); for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + Math.PI / 6; g.lineTo(Math.cos(a) * 52, Math.sin(a) * 52); } g.closePath(); g.stroke();
  if (who === 'lyra') {
    // opératrice : casque, visière lumineuse, micro
    g.fillStyle = '#16203a'; g.beginPath(); g.ellipse(0, 4, 30, 34, 0, 0, TAU); g.fill();
    gr = g.createLinearGradient(0, -30, 0, 38); gr.addColorStop(0, '#dfe8ff'); gr.addColorStop(0.5, '#8a9cc8'); gr.addColorStop(1, '#2a3458');
    g.fillStyle = gr; g.beginPath(); g.moveTo(-31, 10); g.bezierCurveTo(-34, -40, 34, -40, 31, 10); g.lineTo(26, 30); g.quadraticCurveTo(0, 42, -26, 30); g.closePath(); g.fill();
    g.fillStyle = '#05060f'; g.beginPath(); g.moveTo(-24, -6); g.quadraticCurveTo(0, -16, 24, -6); g.lineTo(22, 10); g.quadraticCurveTo(0, 18, -22, 10); g.closePath(); g.fill();
    g.shadowColor = col; g.shadowBlur = 12; g.strokeStyle = col; g.lineWidth = 3; g.beginPath(); g.moveTo(-18, 2); g.quadraticCurveTo(0, -4, 18, 2); g.stroke(); g.shadowBlur = 0;
    g.fillStyle = col2; g.beginPath(); g.arc(-31, 4, 6, 0, TAU); g.fill();
    g.strokeStyle = '#c8d2f0'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(-31, 8); g.quadraticCurveTo(-30, 26, -10, 28); g.stroke();
    g.fillStyle = col2; g.beginPath(); g.arc(-9, 28, 3, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.ellipse(-12, -24, 9, 4, -0.4, 0, TAU); g.fill();
  } else {
    // l'Archive : cristal ancien et œil d'or
    gr = g.createLinearGradient(0, -44, 0, 44); gr.addColorStop(0, '#fff6c8'); gr.addColorStop(0.5, '#ecb44e'); gr.addColorStop(1, '#6a4210');
    g.fillStyle = gr; g.beginPath(); g.moveTo(0, -44); g.lineTo(26, 0); g.lineTo(0, 44); g.lineTo(-26, 0); g.closePath(); g.fill();
    g.strokeStyle = '#fff1c0'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, -44); g.lineTo(0, 44); g.moveTo(-26, 0); g.lineTo(26, 0); g.stroke();
    g.fillStyle = '#100a04'; g.beginPath(); g.ellipse(0, 0, 14, 9, 0, 0, TAU); g.fill();
    g.shadowColor = col2; g.shadowBlur = 14; g.fillStyle = col2; g.beginPath(); g.arc(0, 0, 5.5, 0, TAU); g.fill(); g.shadowBlur = 0;
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(-2, -2, 1.8, 0, TAU); g.fill();
    g.strokeStyle = rgba(col, 0.6); g.lineWidth = 1; for (const r of [34, 42]) { g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke(); }
  }
  return (porCache[who] = c.toDataURL());
}
const WHO = { lyra: 'LYRA · opératrice', archive: 'L’ARCHIVE' };

// ---------- Cartes de récit (texte qui s'écrit) ----------
export function storyCards(cards, opts = {}) {
  return new Promise((resolve) => {
    if (!cards || !cards.length) { resolve(); return; }
    let i = 0, m, timer = null, full = false;
    const por = h('img', { class: 'st-por', alt: '' }), who = h('div', { class: 'st-who' }), txt = h('p', { class: 'st-txt' });
    const dots = h('div', { class: 'st-dots' });
    const next = btn('Suivant ▸', 'primary', () => step());
    const title = opts.title ? h('h2', { class: 'st-title', style: `color:${opts.color || '#ffd23f'}` }, opts.title) : null;
    const box = h('div', { class: 'story' }, title, h('div', { class: 'st-row' }, por, h('div', { class: 'st-body' }, who, txt)), h('div', { class: 'row', style: 'margin-top:10px;align-items:center' }, dots, h('div', { class: 'spacer' }), next));
    const write = () => {
      const c = cards[i], s = c.t;
      por.src = portrait(c.who); who.textContent = WHO[c.who] || ''; who.style.color = c.who === 'lyra' ? '#38f2ff' : '#ffd23f';
      dots.innerHTML = cards.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('');
      next.textContent = i === cards.length - 1 ? (opts.last || 'Continuer') : 'Suivant ▸';
      let n = 0; full = false; txt.textContent = '';
      clearInterval(timer);
      timer = setInterval(() => { n += 2; txt.textContent = s.slice(0, n); if (n % 6 === 0) sfx.tick(); if (n >= s.length) { clearInterval(timer); full = true; } }, 22);
    };
    const step = () => {
      if (!full) { clearInterval(timer); txt.textContent = cards[i].t; full = true; return; }
      sfx.ui();
      if (++i >= cards.length) { clearInterval(timer); m.close(); resolve(); return; }
      write();
    };
    txt.addEventListener('click', () => { if (!full) { clearInterval(timer); txt.textContent = cards[i].t; full = true; } });
    m = modal(box, { dismiss: false, cls: 'story-modal' });
    write();
  });
}

// ---------- Couronne (dessin) ----------
// 31 étoiles réparties sur le contour d'une couronne, Astralume au centre
const CROWN = [[0.07, 0.9], [0.03, 0.36], [0.2, 0.6], [0.29, 0.16], [0.41, 0.52], [0.5, 0.04], [0.59, 0.52], [0.71, 0.16], [0.8, 0.6], [0.97, 0.36], [0.93, 0.9]];
const crownPts = (() => {
  const segs = []; let L = 0;
  for (let i = 0; i < CROWN.length - 1; i++) { const a = CROWN[i], b = CROWN[i + 1], l = Math.hypot(b[0] - a[0], (b[1] - a[1]) * 0.6); segs.push([a, b, l]); L += l; }
  const out = [];
  for (let k = 0; k < 31; k++) {
    let d = (k / 30) * L;
    for (const [a, b, l] of segs) { if (d <= l + 1e-9) { const u = d / l; out.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]); break; } d -= l; }
  }
  out.push([0.5, 0.66]);
  return out;
})();
export function drawCrown(r, t, c, opt = {}) {
  const g = ctx, W = r.w, H = r.h, x0 = r.x, y0 = r.y;
  const P = (k) => [x0 + crownPts[k - 1][0] * W, y0 + crownPts[k - 1][1] * H];
  const n = litCount(c), cyc = CYCLES[c];
  baseT();
  // bandeau doré de la couronne
  g.strokeStyle = 'rgba(255,210,90,0.25)'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(x0 + 0.07 * W, y0 + 0.9 * H); g.quadraticCurveTo(x0 + 0.5 * W, y0 + 1.04 * H, x0 + 0.93 * W, y0 + 0.9 * H); g.stroke();
  g.beginPath(); CROWN.forEach(([a, b], i) => (i ? g.lineTo(x0 + a * W, y0 + b * H) : g.moveTo(x0 + a * W, y0 + b * H))); g.strokeStyle = 'rgba(160,150,255,0.18)'; g.lineWidth = 1; g.stroke();
  // liens entre étoiles rallumées
  g.globalCompositeOperation = 'lighter';
  for (let k = 1; k < 31; k++) {
    if (!isLit(k, c) || !isLit(k + 1, c)) continue;
    const [ax, ay] = P(k), [bx, by] = P(k + 1);
    g.strokeStyle = rgba(cyc.color, 0.55); g.lineWidth = 2; g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke();
  }
  // cœur : Astralume, qui s'éveille avec la progression
  const [cx, cy] = P(32), lit32 = isLit(32, c), k = n / 32;
  const sp = glow(lit32 ? '#ffffff' : cyc.color, 32), R = 26 + k * 30 + Math.sin(t * 2) * 3;
  g.globalAlpha = 0.25 + k * 0.6; g.drawImage(sp.c, cx - R, cy - R, R * 2, R * 2); g.globalAlpha = 1;
  g.globalCompositeOperation = 'source-over';
  starGlyph(g, cx, cy, 11 + k * 6, lit32 ? '#ffffff' : k > 0.95 ? '#ffe9a8' : '#3a3460', t, lit32, true);
  // étoiles
  const ob = objective(c);
  for (let s = 1; s <= 31; s++) {
    const [px, py] = P(s), on = isLit(s, c), A = actOf(s);
    if (on) { g.globalCompositeOperation = 'lighter'; const gl = glow(cyc.color, 16), rr = 13 + Math.sin(t * 3 + s) * 1.5; g.globalAlpha = 0.8; g.drawImage(gl.c, px - rr, py - rr, rr * 2, rr * 2); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
    starGlyph(g, px, py, on ? 6 : 4, on ? '#fff6d0' : 'rgba(120,110,190,0.55)', t + s, on, false);
    if (!on && ob.star && ob.star.k === s) { const pr = 9 + (t * 14) % 10; g.strokeStyle = rgba(A.color, 1 - (pr - 9) / 10); g.lineWidth = 2; g.beginPath(); g.arc(px, py, pr, 0, TAU); g.stroke(); }
    if (RELICS[s] && c === 0) { g.fillStyle = isClaimed(s, c) ? '#ffd23f' : 'rgba(255,210,63,0.55)'; g.beginPath(); g.moveTo(px, py - 12); g.lineTo(px + 3, py - 9); g.lineTo(px, py - 6); g.lineTo(px - 3, py - 9); g.closePath(); g.fill(); }
  }
  if (opt.label !== false) {
    g.font = '900 13px "Avenir Next Condensed",system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#ffffff'; g.fillText(`${n} / 32`, cx, cy + 30);
    g.font = '800 9px "Avenir Next Condensed",system-ui,sans-serif'; g.fillStyle = rgba(cyc.color, 0.9); g.fillText('ÉTOILES RALLUMÉES', cx, cy + 43);
  }
}
function starGlyph(g, x, y, r, col, t, on, big) {
  g.save(); g.translate(x, y); g.rotate(big ? t * 0.2 : 0);
  g.fillStyle = col; g.beginPath();
  const n = big ? 8 : 4;
  for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * TAU - Math.PI / 2, rr = i % 2 ? r * 0.38 : r; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  g.closePath(); g.fill();
  if (on) { g.fillStyle = '#ffffff'; g.beginPath(); g.arc(0, 0, r * 0.3, 0, TAU); g.fill(); }
  g.restore();
}

// ---------- Récompense d'étoile : rangée d'icônes ----------
function extraChips(k, c) {
  return starExtra(k, c).map((e) => {
    if (e.type === 'relic') return h('span', { class: 'qchip relic' }, '✦ ', h('b', null, e.name), ' · ' + e.desc);
    if (e.type === 'ship') return h('span', { class: 'qchip ship' }, '🚀 Vaisseau ', h('b', null, e.name));
    if (e.type === 'drone') return h('span', { class: 'qchip drone' }, '◈ Drone ', h('b', null, e.name));
    return h('span', { class: 'qchip act' }, e.n === 4 ? '★ Fin du jeu' : `★ Fin de l’acte ${['I', 'II', 'III'][e.n - 1]}`);
  });
}
function miniReward(b) {
  const row = h('div', { class: 'qrw' });
  for (const e of bundleEntries(b)) {
    if (e.type === 'cur') row.append(h('span', null, h('img', { src: iconURL(e.id, 48) }), fmt(e.n)));
    else if (e.type === 'chest') row.append(h('span', null, h('img', { src: iconURL('chest_' + e.id, 48) })));
  }
  return row;
}

// ---------- Étoile rallumée (après la victoire sur un colosse) ----------
export function starPopup(k, c) {
  return new Promise((resolve) => {
    const s = STARS[k - 1], A = actOf(k), cyc = CYCLES[c];
    // dessin local (au-dessus du voile de la fenêtre)
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const art = h('canvas', { class: 'sp-art', width: Math.round(300 * dpr), height: Math.round(120 * dpr) });
    const g = art.getContext('2d'), t0 = performance.now();
    const loop = () => {
      if (!art.isConnected && performance.now() - t0 > 500) return;
      const t = (performance.now() - t0) / 1000, cx = 150, cy = 60;
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, 300, 120);
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 14; i++) { const a = (i / 14) * TAU + t * 0.3; g.fillStyle = rgba(cyc.color, 0.14); g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, 170, a - 0.07, a + 0.07); g.closePath(); g.fill(); }
      const gl = glow(cyc.color, 32), R = 54 + Math.sin(t * 3) * 5; g.globalAlpha = 0.95; g.drawImage(gl.c, cx - R, cy - R, R * 2, R * 2); g.globalAlpha = 1;
      for (let i = 0; i < 16; i++) { const a = i * 2.39 + t * 0.6, d = 26 + ((t * 30 + i * 13) % 50); g.fillStyle = rgba('#fff6d0', 0.8 * (1 - (d - 26) / 50)); g.beginPath(); g.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.8, 1.4, 0, TAU); g.fill(); }
      g.globalCompositeOperation = 'source-over';
      starGlyph(g, cx, cy, 22 + Math.min(1, t * 3) * 6 + Math.sin(t * 4) * 1.5, '#fff6d0', t, true, true);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    const b = starReward(k, c);
    let m;
    const claim = btn('Récupérer', 'gold big wide', async () => {
      const got = claimStar(k, c);
      markTold(k, c);
      if (got) { flyRewards(claim, got); sfx.buy(); }
      m.close();
      if (RELICS[k] && c === 0) toast('Relique obtenue', `${RELICS[k].name} : ${RELICS[k].desc} (permanent)`, SVG.star, '#ffd23f');
      resolve(true);
    });
    const later = btn('Plus tard', 'ghost', () => { markTold(k, c); m.close(); resolve(false); });
    sfx.levelUp();
    m = modal([
      h('div', { class: 'sp-kicker', style: `color:${cyc.color}` }, c ? `NOUVELLE AUBE · ${cyc.name.toUpperCase()}` : `ACTE ${['I', 'II', 'III', 'FINAL'][A.n - 1]} · ${A.name.toUpperCase()}`),
      h('h2', { class: 'sp-title' }, '✦ ÉTOILE RALLUMÉE ✦'),
      art,
      h('div', { class: 'sp-name' }, s.name, h('small', null, ` · ${litCount(c)} / 32`)),
      h('p', { class: 'center sp-txt' }, '« ' + s.text + ' »'),
      h('div', { class: 'qchips center' }, ...extraChips(k, c)),
      h('div', { class: 'subtitle' }, 'Récompense de la Couronne'),
      rewardRow(b, true),
      h('div', { class: 'row', style: 'margin-top:12px' }, later, h('div', { class: 'spacer' }), claim),
    ], { dismiss: false, cls: 'star-modal' });
  });
}

// ---------- Fin du jeu ----------
export function endingScene() {
  return new Promise((resolve) => {
    music.play('menu');
    const ov = h('div', { class: 'ending' });
    const stage = h('div', { style: 'position:absolute;inset:0' });
    const credits = h('div', { class: 'credits' },
      h('h1', null, 'ASTRALUME'), h('p', null, 'La Couronne est reforgée.'),
      h('p', { class: 'muted' }, '32 étoiles rallumées · ' + fmt(S.stats.kills) + ' aliens vaincus · ' + fmt(S.stats.bosses) + ' colosses abattus'),
      h('p', { class: 'muted' }, 'Merci d’avoir joué, Gardien de l’Aube.'));
    ov.append(stage, credits);
    const scr = document.querySelector('#ui .screen'); if (scr) scr.style.visibility = 'hidden';
    document.getElementById('ui').append(ov);
    let T0 = null;
    widget(stage, (r, t) => {
      if (T0 === null) T0 = t;
      const tt = t - T0, g = ctx;
      g.fillStyle = `rgba(2,1,8,${Math.min(0.92, tt * 0.6)})`; g.fillRect(r.x, r.y, r.w, r.h);
      const cw = Math.min(r.w * 0.9, 360), cr = { x: r.x + (r.w - cw) / 2, y: r.y + r.h * 0.18, w: cw, h: cw * 0.62 };
      drawCrown(cr, t, 0, { label: false });
      if (tt > 1.2) { // éclosion d'Astralume
        const k = Math.min(1, (tt - 1.2) / 2), cx = cr.x + cr.w / 2, cy = cr.y + 0.66 * cr.h;
        g.globalCompositeOperation = 'lighter';
        const gl = glow('#ffffff', 32), R = 40 + k * Math.max(r.w, r.h) * 0.6; g.globalAlpha = 0.5 * (1 - k * 0.6); g.drawImage(gl.c, cx - R, cy - R, R * 2, R * 2); g.globalAlpha = 1;
        for (let i = 0; i < 40; i++) { const a = i * 2.4 + tt * 0.2, d = (tt * 60 + i * 37) % (r.h * 0.8); g.fillStyle = `rgba(255,${200 + (i % 50)},120,${0.7 * (1 - d / (r.h * 0.8))})`; g.beginPath(); g.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 1.5, 0, TAU); g.fill(); }
        g.globalCompositeOperation = 'source-over';
      }
    });
    sfx.nova && sfx.nova();
    setTimeout(async () => {
      await storyCards(ENDING, { title: 'L’Aube d’Astralume', color: '#ffffff', last: 'Voir le générique' });
      credits.classList.add('on');
      markSeen('ending');
      const done = btn('Continuer', 'gold big', async () => { ov.remove(); ui.widgets = ui.widgets.filter((w) => w.el !== stage); if (scr) scr.style.visibility = ''; refresh(); await storyCards([{ who: 'lyra', t: 'La Nouvelle Aube est ouverte : dans « La Couronne », choisis Crépuscule pour rallumer les étoiles en Difficile. De nouvelles récompenses t’y attendent.' }], { last: 'Compris' }); resolve(); });
      credits.append(done);
    }, 2600);
  });
}

// ---------- Enchaînement des récits en attente ----------
let running = false;
export async function runTales() {
  if (running) return;
  running = true;
  try {
    const q = questState();
    if (!q.init) { // ancienne sauvegarde : les étoiles déjà rallumées restent à récupérer dans la Couronne, sans avalanche de fenêtres
      q.init = 1;
      for (const { k, c } of pendingTales()) markTold(k, c);
      saveSoon();
    }
    if (!q.seen.prologue) {
      await storyCards(PROLOGUE, { title: 'La Couronne d’Astralume', color: '#ffd23f', last: 'Commencer' });
      markSeen('prologue');
      const n = litCount(0);
      if (n > 0) await storyCards([{ who: 'lyra', t: `Bonne nouvelle : tu as déjà rallumé ${n} étoile${n > 1 ? 's' : ''}. Leurs récompenses t’attendent dans « La Couronne » !` }], { last: 'Voir la Couronne' }).then(() => go('quest'));
      else if (!q.seen.acts[1]) { await storyCards(ACTS[0].intro, { title: 'Acte I — L’Éveil', color: ACTS[0].color }); markSeen('act1'); }
    }
    for (const { k, c } of pendingTales()) {
      await starPopup(k, c);
      if (c === 0) {
        const A = actOf(k);
        if (k === A.to && A.outro.length) await storyCards(A.outro, { title: `Fin de l’acte ${['I', 'II', 'III'][A.n - 1]}`, color: A.color });
        if (k === 32) { await endingScene(); continue; }
        const N = ACTS[A.n] && k === A.to ? ACTS[A.n] : null;
        if (N && !q.seen.acts[N.n]) { await storyCards(N.intro, { title: N.n === 4 ? 'Finale' : `Acte ${['I', 'II', 'III'][N.n - 1]} — ${N.name}`, color: N.color }); markSeen('act' + N.n); }
      } else if (k === 32 && !q.seen.cycles[c]) {
        markSeen('cycle' + c);
        await storyCards([{ who: 'archive', t: c === 1 ? 'Le Crépuscule est vaincu. Seule l’Éclipse reste à affronter : rallume la Couronne en Cauchemar.' : 'L’Éclipse elle-même s’incline. Tu es entré dans la légende des Allumeurs.' }], { title: CYCLES[c].name + ' accompli', color: CYCLES[c].color });
      }
    }
    if (ui.current === 'quest') refresh();
  } finally { running = false; }
}

// ---------- Écran « La Couronne » ----------
register('quest', {
  build() {
    const c = currentCycle(), cyc = CYCLES[c];
    const tabs = cycleUnlocked(1) ? h('div', { class: 'tabs qtabs' }, ...CYCLES.map((C) => h('button', { class: 'tab' + (C.id === c ? ' on' : '') + (cycleUnlocked(C.id) ? '' : ' locked'), style: `--c:${C.color}`, onclick: () => { if (!cycleUnlocked(C.id)) { sfx.deny(); toast('Verrouillé', `Termine d’abord le ${CYCLES[C.id - 1].name}.`, SVG.lock, '#9aa0d8'); return; } sfx.ui(); setCycle(C.id); refresh(); } }, (cycleUnlocked(C.id) ? '' : '🔒 ') + C.name, h('div', { style: 'font-size:10px;opacity:.8' }, `${litCount(C.id)} / 32`)))) : null;
    const crown = h('div', { class: 'qcrown' });
    widget(crown, (r, t) => drawCrown({ x: r.x + 8, y: r.y + 10, w: r.w - 16, h: r.h - 24 }, t, c));
    const ob = objective(c);
    let objCard;
    if (ob.done) objCard = h('div', { class: 'panel qobj done' }, h('b', null, `${cyc.name} accompli !`), h('p', { class: 'muted small' }, c < 2 ? 'Passe au cycle suivant de la Nouvelle Aube.' : 'Tu as tout rallumé. Légende vivante !'));
    else {
      const W = WORLDS[ob.world], nb = nextBig(c);
      objCard = h('div', { class: 'panel qobj', style: `--c:${ob.act.color}` },
        h('div', { class: 'qk' }, c ? `NOUVELLE AUBE · ${cyc.name.toUpperCase()}` : `ACTE ${['I', 'II', 'III', 'FINAL'][ob.act.n - 1]} · ${ob.act.name.toUpperCase()}`),
        h('div', { class: 'qn' }, 'Rallume ', h('b', null, ob.star.name)),
        h('div', { class: 'muted small' }, `Monde ${ob.world + 1} · ${W.name} — abats le colosse du secteur ${ob.world + 1}-10` + (c ? ` en ${['Normal', 'Difficile', 'Cauchemar'][cyc.diff]}` : '')),
        nb ? h('div', { class: 'qchips' }, h('span', { class: 'muted small' }, `Étoile ${nb.k} : `), ...extraChips(nb.k, c)) : null,
        h('div', { class: 'row', style: 'margin-top:8px' }, h('div', { class: 'qprog' }, h('i', { style: `width:${Math.round((ob.lit / 32) * 100)}%;background:${cyc.color}` })), h('div', { class: 'spacer' }),
          btn(ob.atBoss ? 'AFFRONTER' : 'CONTINUER', 'primary', () => levelSheet(ob.atBoss ? ob.L : ob.reach))));
    }
    // liste des 32 étoiles et de leurs récompenses
    const list = h('div', { class: 'qlist' });
    for (const A of ACTS) {
      let got = 0; for (let k = A.from; k <= A.to; k++) if (isLit(k, c)) got++;
      list.append(h('div', { class: 'qact', style: `--c:${A.color}` }, h('b', null, A.n === 4 ? 'Finale' : `Acte ${['I', 'II', 'III'][A.n - 1]}`), ' · ' + A.name, h('span', null, `${got} / ${A.to - A.from + 1}`)));
      for (let k = A.from; k <= A.to; k++) {
        const s = STARS[k - 1], on = isLit(k, c), cl = isClaimed(k, c);
        const right = on && !cl ? btn('Récupérer', 'gold small', async (e) => { const got2 = claimStar(k, c); markTold(k, c); if (got2) { flyRewards(e.currentTarget || null, got2); sfx.buy(); if (RELICS[k] && c === 0) toast('Relique obtenue', `${RELICS[k].name} : ${RELICS[k].desc}`, SVG.star, '#ffd23f'); } refresh(); })
          : cl ? h('span', { class: 'qok' }, '✓') : h('span', { class: 'qlock', html: SVG.lock });
        list.append(h('div', { class: 'qrow' + (on ? ' on' : '') + (starExtra(k, c).length ? ' big' : '') },
          h('div', { class: 'qst' }, h('b', null, k), h('small', null, on ? '✦' : '')),
          h('div', { class: 'qmid' }, h('div', { class: 'qname' }, s.name, h('small', null, ` · Monde ${k} · ${WORLDS[k - 1].name}`)), miniReward(starReward(k, c)), h('div', { class: 'qchips' }, ...extraChips(k, c))),
          right));
      }
    }
    const qb = questBonus(), relicsN = Object.keys(RELICS).filter((k) => isClaimed(+k, 0)).length;
    const relicBox = h('div', { class: 'panel qrelics' }, h('div', { class: 'subtitle', style: 'margin-top:0' }, `Reliques · ${relicsN} / ${Object.keys(RELICS).length}`),
      h('div', { class: 'muted small' }, `Bonus permanents : +${Math.round(qb.dmg * 100)} % dégâts · +${Math.round(qb.coins * 100)} % pièces · +${qb.shield} bouclier · +${qb.hull} cœur · drones +${Math.round(qb.drone * 100)} % · spéciale +${Math.round(qb.charge * 100)} %`));
    const journal = btn('📖 Récit', 'ghost small', async () => {
      const q = questState(), cards = [...PROLOGUE];
      for (const A of ACTS) { if (A.n === 1 || q.seen.acts[A.n]) cards.push(...A.intro); if (isLit(A.to, 0)) cards.push(...A.outro); }
      if (q.seen.ending) cards.push(...ENDING);
      await storyCards(cards, { title: 'Journal de l’Allumeur', color: '#ffd23f', last: 'Fermer' });
    });
    return h('div', null, h('div', { class: 'topbar' }, h('button', { class: 'iconbtn', html: SVG.back, onclick: () => { sfx.back(); go('hub', {}, false); } }), h('div', { class: 'title' }, 'La Couronne'), h('div', { class: 'spacer' }), journal),
      h('div', { class: 'scroll' }, tabs, crown, objCard, relicBox, list));
  },
  enter() { music.play('menu'); setTimeout(() => runTales(), 400); },
});
