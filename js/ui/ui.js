// Noyau de l'interface : écrans DOM, barre des monnaies, toasts, fenêtres, scène de fond animée
import { view, ctx, canvas, baseT, setT } from '../engine/renderer.js';
import { fx, updateParticles, drawParticles } from '../engine/particles.js';
import { glow } from '../engine/sprites.js';
import { TAU, rand, fmt, ease } from '../engine/math.js';
import { S } from '../economy/save.js';
import { CUR, CUR_KEYS, RARITY } from '../economy/data.js';
import { onEcon, bundleEntries } from '../economy/economy.js';
import { iconURL, ICONS } from '../game/art.js';
import { Background } from '../game/background.js';
import { WORLDS } from '../levels/worlds.js';
import { sfx } from '../audio/sfx.js';
import { SVG } from './icons.js';
import { SHIP_BY_ID, DRONE_BY_ID, BOOSTS } from '../economy/data.js';

// ---------- DOM ----------
export function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) for (const k in attrs) {
    const v = attrs[k];
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'style') el.style.cssText = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) { if (c === null || c === undefined || c === false) continue; el.append(c instanceof Node ? c : document.createTextNode(String(c))); }
  return el;
}
export const curIcon = (k, cls = '') => h('img', { src: iconURL(k, 64), class: cls, alt: '' });
export function costEl(cost) {
  const s = h('span', { class: 'cost' });
  for (const k of CUR_KEYS) if (cost && cost[k]) s.append(curIcon(k, 'ic'), ' ' + fmt(cost[k]) + ' ');
  return s;
}
export function btn(label, cls, onclick, opts = {}) {
  const b = h('button', { class: 'btn ' + (cls || ''), onclick: (e) => { if (b.classList.contains('cant')) { sfx.deny(); if (opts.onDeny) opts.onDeny(); return; } sfx.ui(); onclick && onclick(e); } });
  if (typeof label === 'string') b.innerHTML = label; else b.append(label);
  return b;
}
export function iconBtn(svg, onclick, title) { return h('button', { class: 'iconbtn', 'aria-label': title || '', html: svg, onclick: () => { sfx.back(); onclick(); } }); }

// ---------- Gestion des écrans ----------
const root = () => document.getElementById('ui');
export const ui = { current: null, params: null, screens: {}, stack: [], widgets: [], menuBG: null, flyers: [], bgWorld: -1 };

export function register(name, def) { ui.screens[name] = def; }
export function go(name, params = {}, push = true) {
  if (ui.current && push && ui.current !== name) ui.stack.push([ui.current, ui.params]);
  show(name, params);
}
export function back() {
  const prev = ui.stack.pop();
  if (prev) show(prev[0], prev[1]); else show('hub', {});
}
export function show(name, params = {}) {
  const def = ui.screens[name];
  if (ui.current && ui.screens[ui.current] && ui.screens[ui.current].exit) ui.screens[ui.current].exit();
  ui.current = name; ui.params = params;
  ui.widgets = [];
  const r = root();
  r.querySelectorAll('.screen').forEach((n) => n.remove());
  if (!def) return;
  const el = def.build(params);
  el.classList.add('screen');
  r.prepend(el);
  if (def.enter) def.enter(params, el);
}
export function clearScreens() {
  if (ui.current && ui.screens[ui.current] && ui.screens[ui.current].exit) ui.screens[ui.current].exit();
  ui.current = null; ui.widgets = []; ui.stack = [];
  root().querySelectorAll('.screen, .modal-back, .reveal').forEach((n) => n.remove());
}
export function refresh() { if (ui.current) show(ui.current, ui.params); }

// ---------- Widgets canvas (dessinés dans le canvas sous le DOM) ----------
export function widget(el, draw) { ui.widgets.push({ el, draw, t: 0 }); }
function rectOf(el) {
  const r = el.getBoundingClientRect(), c = canvas.getBoundingClientRect();
  return { x: (r.left - c.left) / view.unit, y: (r.top - c.top) / view.unit, w: r.width / view.unit, h: r.height / view.unit };
}

// ---------- Fenêtres ----------
export function modal(content, opts = {}) {
  const back = h('div', { class: 'modal-back' + (opts.bottom ? ' bottom' : '') });
  const box = h('div', { class: 'modal panel ' + (opts.cls || '') }, content);
  back.append(box);
  const close = () => { back.remove(); opts.onClose && opts.onClose(); };
  if (opts.dismiss !== false) back.addEventListener('click', (e) => { if (e.target === back) { sfx.back(); close(); } });
  root().append(back);
  return { el: back, box, close };
}
export function confirmBox(title, text, okLabel, onOk) {
  const m = modal([h('h2', { class: 'pink-t' }, title), h('p', { class: 'center' }, text),
    h('div', { class: 'row', style: 'margin-top:12px' }, btn('Annuler', 'ghost', () => m.close()), h('div', { class: 'spacer' }), btn(okLabel, 'primary', () => { m.close(); onOk(); }))]);
  return m;
}

// ---------- Monnaies ----------
const curEls = new Set();
export function curBar(keys = ['coins', 'crystals', 'gems']) {
  const bar = h('div', { class: 'curbar' });
  for (const k of keys) {
    const c = h('div', { class: 'cur', 'data-cur': k }, curIcon(k), h('b', null, fmt(S.cur[k])));
    c._shown = S.cur[k];
    bar.append(c);
    curEls.add(c);
  }
  return bar;
}
function tickCur() {
  for (const c of curEls) {
    if (!c.isConnected) { curEls.delete(c); continue; }
    const k = c.dataset.cur, target = S.cur[k];
    if (c._shown !== target) {
      const d = target - c._shown;
      c._shown = Math.abs(d) < 1 ? target : c._shown + d * 0.18 + Math.sign(d);
      if ((d > 0 && c._shown > target) || (d < 0 && c._shown < target)) c._shown = target;
      c.querySelector('b').textContent = fmt(c._shown);
    }
  }
}
function bumpCur(k) { for (const c of curEls) if (c.dataset.cur === k && c.isConnected) { c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); } }
export function curTarget(k) { for (const c of curEls) if (c.dataset.cur === k && c.isConnected) return c.querySelector('img'); return null; }

// Animation de gain : icônes qui volent vers la barre des monnaies
export function flyRewards(fromEl, bundle) {
  const from = fromEl ? rectOf(fromEl) : { x: view.w / 2 - 10, y: view.h / 2, w: 20, h: 20 };
  const fx0 = from.x + from.w / 2, fy0 = from.y + from.h / 2;
  let delay = 0;
  for (const e of bundleEntries(bundle)) {
    if (e.type !== 'cur') continue;
    const tgt = curTarget(e.id);
    const to = tgt ? rectOf(tgt) : { x: view.w - 40, y: view.safeT + 10, w: 16, h: 16 };
    const n = Math.min(12, 3 + Math.floor(Math.log2(e.n + 1)));
    for (let i = 0; i < n; i++) ui.flyers.push({ k: e.id, x: fx0 + rand(-20, 20), y: fy0 + rand(-20, 20), tx: to.x + to.w / 2, ty: to.y + to.h / 2, t: -delay - i * 0.05, d: 0.7 + rand(0, 0.2), cx: fx0 + rand(-120, 120), cy: fy0 - rand(60, 160) });
    delay += 0.15;
  }
  for (let i = 0; i < 18; i++) { const a = rand(TAU); fx.spark(fx0, fy0, Math.cos(a) * 200, Math.sin(a) * 200, 0.5, 12, '#ffd23f', 2); }
  fx.ring(fx0, fy0, 6, 70, 0.5, '#ffffff', 3);
}

// ---------- Toasts ----------
let toastBox = null;
export function toast(title, text, iconHtml = SVG.trophy, color) {
  if (!toastBox || !toastBox.isConnected) { toastBox = h('div', { class: 'toasts' }); root().append(toastBox); }
  const t = h('div', { class: 'toast', html: `<span style="color:${color || '#ffd23f'}">${iconHtml}</span><div><b>${title}</b>${text}</div>` });
  toastBox.append(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 400); }, 3200);
}

// Fenêtre de récompense (liste animée + bouton Récupérer)
export function rewardRow(bundle, big = false) {
  const row = h('div', { class: 'rewards' });
  // coffres identiques regroupés (« Coffre Astral ×5 »)
  const ents = [];
  for (const e of bundleEntries(bundle)) { const same = e.type === 'chest' && ents.find((x) => x.type === 'chest' && x.id === e.id); if (same) same.n++; else ents.push({ ...e }); }
  for (const e of ents) {
    let icon, label;
    if (e.type === 'cur') { icon = iconURL(e.id, 64); label = '+' + fmt(e.n); }
    else if (e.type === 'chest') { icon = iconURL('chest_' + e.id, 64); label = { neon: 'Coffre Néon', prism: 'Coffre Prisme', astral: 'Coffre Astral', boss: 'Coffre de Colosse' }[e.id] + (e.n > 1 ? ' ×' + e.n : ''); }
    else if (e.type === 'boost') { icon = iconURL('boost_' + e.id, 64); label = BOOSTS[e.id].name + (e.n > 1 ? ' ×' + e.n : ''); }
    else if (e.type === 'ship') { icon = iconURL('nova', 64); label = 'Vaisseau : ' + SHIP_BY_ID[e.id].name; }
    else if (e.type === 'drone') { icon = iconURL('energy', 64); label = 'Drone : ' + DRONE_BY_ID[e.id].name; }
    else if (e.type === 'shard') { icon = iconURL('shard_' + e.id, 64); label = '+' + fmt(e.n) + ' Éclats ' + (SHIP_BY_ID[e.id] ? SHIP_BY_ID[e.id].name : ''); }
    row.append(h('div', { class: 'rw' + (big ? ' big' : '') }, h('img', { src: icon, alt: '' }), label));
  }
  return row;
}
export function rewardPopup(title, bundle, onDone, sub) {
  sfx.levelUp();
  let m;
  const b = btn('Récupérer', 'gold big wide', () => { flyRewards(b, bundle); sfx.buy(); m.close(); onDone && onDone(); });
  m = modal([h('h2', { class: 'gold-t' }, title), sub ? h('p', { class: 'center muted' }, sub) : null, rewardRow(bundle, true), h('div', { style: 'height:14px' }), b], { dismiss: false });
  return m;
}

// ---------- Scène de menu (fond animé + widgets + effets) ----------
export function setMenuWorld(w) {
  w = Math.max(0, Math.min(WORLDS.length - 1, w));
  if (ui.bgWorld === w && ui.menuBG) return;
  ui.bgWorld = w;
  const W = WORLDS[w];
  ui.menuBG = new Background({ pal: W.pal, world: W, planet: false, seed: 1000 + w }, { menu: true });
}
export function menuUpdate(dt) {
  if (!ui.menuBG) setMenuWorld(Math.floor((Math.min(320, S.maxLevel) - 1) / 10));
  ui.menuBG.update(dt, 0.6);
  updateParticles(dt);
  for (const w of ui.widgets) w.t += dt;
  for (let i = ui.flyers.length - 1; i >= 0; i--) {
    const f = ui.flyers[i];
    f.t += dt;
    if (f.t >= f.d) { ui.flyers.splice(i, 1); bumpCur(f.k); sfx.coin(Math.floor(Math.random() * 6)); fx.flash(f.tx, f.ty, 16, 0.25, '#ffffff'); }
  }
  tickCur();
}
export function menuDraw() {
  ui.menuBG.draw();
  ctx.globalCompositeOperation = 'source-over';
  for (const w of ui.widgets) {
    if (!w.el.isConnected) continue;
    const r = rectOf(w.el);
    if (r.y + r.h < -50 || r.y > view.h + 50) continue;
    baseT();
    try { w.draw(r, w.t); } catch (e) { console.error(e); }
  }
  baseT();
  drawParticles(false);
  ctx.globalCompositeOperation = 'lighter';
  drawParticles(true);
  for (const f of ui.flyers) {
    if (f.t < 0) continue;
    const u = ease.inOutCubic(Math.min(1, f.t / f.d)), v = 1 - u;
    const x = v * v * f.x + 2 * v * u * f.cx + u * u * f.tx, y = v * v * f.y + 2 * v * u * f.cy + u * u * f.ty;
    const s = glow(CUR[f.k].color, 16);
    ctx.globalAlpha = 0.8; ctx.drawImage(s.c, x - 12, y - 12, 24, 24); ctx.globalAlpha = 1;
  }
  ctx.globalCompositeOperation = 'source-over';
  for (const f of ui.flyers) {
    if (f.t < 0) continue;
    const u = ease.inOutCubic(Math.min(1, f.t / f.d)), v = 1 - u;
    const x = v * v * f.x + 2 * v * u * f.cx + u * u * f.tx, y = v * v * f.y + 2 * v * u * f.cy + u * u * f.ty;
    setT(x, y, 1 - u * 0.4); ICONS[f.k](ctx, 7);
  }
  baseT();
  ui.menuBG.drawFront(false);
}

// ---------- Notifications d'économie → toasts ----------
export function initUINotifications() {
  onEcon((type, d) => {
    if (type === 'mission') { toast('Mission accomplie !', 'Réclamez votre récompense dans Missions.', SVG.target, '#47ffa3'); sfx.levelUp(); }
    else if (type === 'ach') { toast('Succès : ' + d.a.name, d.a.text(d.a.tiers[d.tier]), SVG.trophy, '#ffd23f'); }
    else if (type === 'unlock') { const nm = d.ship ? 'Vaisseau ' + SHIP_BY_ID[d.ship].name : 'Drone ' + DRONE_BY_ID[d.drone].name; toast('Nouveau !', nm + ' débloqué', SVG.ship, '#38f2ff'); }
  });
}
export { RARITY };
