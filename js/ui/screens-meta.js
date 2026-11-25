// Écrans de progression : hangar, atelier, coffres, roue, missions, succès, réglages
import { h, btn, iconBtn, register, go, back, refresh, widget, modal, curBar, curIcon, costEl, rewardRow, rewardPopup, flyRewards, toast, confirmBox, ui } from './ui.js';
import { SVG } from './icons.js';
import { drawChest, drawWheel } from './art-ui.js';
import { drawWheelLux } from './treasure-art.js';
import { S, saveSoon, resetSave } from '../economy/save.js';
import { SHIPS, SHIP_BY_ID, DRONES, DRONE_BY_ID, UPGRADES, RARITY, BOOSTS, CUR } from '../economy/data.js';
import * as E from '../economy/economy.js';
import { CHESTS, PITY, pityLeft, openChest, WHEEL, wheelCost, spinWheel, refreshWheel } from '../economy/gacha.js';
import { MISSIONS, missionReward, claimMission, claimMissionBonus, MISSION_BONUS, calendarIndex, missionsBadge } from '../economy/daily.js';
import { ACHIEVEMENTS, achValue, achClaimed, achReward, achClaimable, claimAch, achBadge } from '../economy/achievements.js';
import { SHIP_FX } from '../game/ships.js';
import { drawDroneIcon } from '../game/drones.js';
import { ctx, setT, baseT, view, setQuality, cam } from '../engine/renderer.js';
import { glow } from '../engine/sprites.js';
import { fx } from '../engine/particles.js';
import { iconURL, ICONS, drawShard } from '../game/art.js';
import { drawHypercar } from '../game/hypercar.js';
import { shipSkins } from '../game/skins.js';
import { fmt, TAU, rand, ease, hslHex } from '../engine/math.js';
import { sfx } from '../audio/sfx.js';
import { applyVolumes } from '../audio/audio.js';
import { addShake, flash } from '../engine/renderer.js';
import { dailyPopup } from './screens-main.js';

const topbar = (title, extra) => h('div', { class: 'topbar' }, iconBtn(SVG.back, back, 'Retour'), title ? h('div', { class: 'title' }, title) : null, extra || curBar());
function sectTabs(items, active) {
  return h('div', { class: 'tabs secttabs' }, ...items.map(([k, label, fn, n]) => h('button', { class: 'tab' + (k === active ? ' on' : ''), onclick: () => { if (k !== active) { sfx.ui(); fn(); } } }, label, n ? h('span', { class: 'badge', style: 'position:static;display:inline-flex;margin-left:4px;transform:scale(.8)' }, n) : null)));
}
const treasureTabs = (a) => sectTabs([['chests', 'Coffres', () => go('chests', {}, false), (S.freeChests || []).length], ['wheel', 'Roue', () => go('wheel', {}, false), wheelCost() === null ? 1 : 0]], a);
const deny = () => toast('Ressources insuffisantes', 'Jouez, ouvrez des coffres et réussissez des missions !', SVG.lock, '#ff4f6e');
function buyBtn(cost, label, onBuy, cls = 'gold small') {
  if (!cost) return h('span', { class: 'tag', style: 'color:#47ffa3' }, 'MAX');
  return btn(h('span', null, label ? label + ' ' : '', costEl(cost)), cls + (E.canPay(cost) ? '' : ' cant'), () => { onBuy(); }, { onDeny: deny });
}
function pips(n, max) { const p = h('div', { class: 'pips' }); for (let i = 0; i < max; i++) p.append(h('i', { class: i < n ? 'on' : '' })); return p; }
function celebrate(el) { sfx.upgrade(); const r = el.getBoundingClientRect(); const c = document.getElementById('game').getBoundingClientRect(); const x = (r.left + r.width / 2 - c.left) / view.unit, y = (r.top + r.height / 2 - c.top) / view.unit; for (let i = 0; i < 14; i++) { const a = rand(TAU); fx.spark(x, y, Math.cos(a) * 180, Math.sin(a) * 180, 0.45, 10, '#ffd23f', 2); } fx.ring(x, y, 4, 50, 0.4, '#ffffff', 3); }

// ================= HANGAR =================
let hangarIdx = -1, hangarTab = 'ships';
register('hangar', {
  build() {
    if (hangarIdx < 0) hangarIdx = Math.max(0, SHIPS.findIndex((s) => s.id === S.ship));
    const tabs = sectTabs([['ships', 'Vaisseaux', () => { hangarTab = 'ships'; refresh(); }], ['drones', 'Drones', () => { hangarTab = 'drones'; refresh(); }], ['shop', 'Améliorations', () => { hangarTab = 'shop'; refresh(); }]], hangarTab);
    const body = hangarTab === 'ships' ? shipsTab() : hangarTab === 'drones' ? dronesTab() : shopList();
    return h('div', null, topbar('', curBar(['coins', 'crystals', 'gems', 'parts'])), tabs, hangarTab === 'ships' ? h('div', { class: 'hship' }, body) : h('div', { class: 'scroll' }, body));
  },
});
let previewSkin = null, previewShip = null, shipSub = 'evo';
function evoPanel(sh) {
  const ev = E.evoLevel(sh.id), ec = E.evoCost(sh.id), have = E.shards(sh.id);
  const p = h('div', { class: 'hs-pane evo', style: `--c:${sh.color}` },
    h('div', { class: 'evo-head' }, h('img', { src: iconURL('shard_' + sh.id, 96), alt: '' }),
      h('div', { class: 'evo-t' }, h('b', null, 'Éclats ' + sh.name), h('small', null, 'Boss, coffres et roue en donnent')),
      h('div', { class: 'evo-have' }, h('b', null, fmt(have)))));
  if (ec) {
    const k = Math.min(1, have / ec.sh);
    p.append(h('div', { class: 'evo-bar' }, h('i', { style: `width:${Math.round(k * 100)}%` }), h('span', null, `${fmt(have)} / ${ec.sh} éclats pour ★${ev + 1}`)));
    const b = btn(h('span', { class: 'cont-btn' }, 'Évoluer ', h('img', { src: iconURL('shard_' + sh.id, 48), alt: '' }), h('b', null, String(ec.sh)), ' + ', costEl({ coins: ec.coins })), 'gold wide' + (E.canEvolve(sh.id) ? '' : ' cant'),
      () => { if (E.evolveShip(sh.id)) { flash(sh.color, 0.5); addShake(0.3); sfx.chestOpen(3); toast('Évolution ★' + E.evoLevel(sh.id) + ' !', E.EVO_PERKS[E.evoLevel(sh.id) - 1], SVG.star || SVG.ship, sh.color); refresh(); } },
      { onDeny: () => toast(have < ec.sh ? 'Pas assez d’éclats' : 'Pas assez de pièces', 'Les éclats tombent des boss, des coffres et de la roue.', SVG.lock, '#ff4f6e') });
    p.append(b);
  } else p.append(h('div', { class: 'evo-next center' }, 'Évolution maximale atteinte !'));
  const list = h('div', { class: 'evo-list' });
  E.EVO_PERKS.forEach((txt, i) => list.append(h('div', { class: i < ev ? 'ok' : i === ev ? 'next' : '' }, h('b', null, '★' + (i + 1)), txt)));
  p.append(list);
  return p;
}
function skinPanel(sh) {
  const list = shipSkins(sh.id), st = S.ships[sh.id];
  const grid = h('div', { class: 'skins' });
  list.forEach((sk, i) => {
    const owned = E.skinOwned(sh.id, i), cur = (st.skin || 0) === i, prev = previewSkin === i && previewShip === sh.id;
    const col = sk.paint || sh.color, col2 = sk.accent || sh.color2;
    grid.append(h('button', { class: 'skin' + (cur ? ' cur' : '') + (prev ? ' prev' : '') + (owned ? '' : ' locked'), style: `--a:${col};--b:${col2}`, onclick: () => {
      sfx.ui();
      if (owned) { E.setSkin(sh.id, i); previewSkin = null; refresh(); }
      else { previewSkin = i; previewShip = sh.id; refresh(); }
    } }, h('span', { class: 'sw' }), h('div', { class: 'sk-t' }, h('b', null, sk.name), h('small', null, E.SKIN_PERKS[i])),
      cur ? h('em', { class: 'on' }, 'ÉQUIPÉE') : owned ? h('em', null, 'Équiper') : h('em', null, h('img', { src: iconURL('gems', 32), alt: '' }), String(E.SKIN_COST[i].gems))));
  });
  const p = h('div', { class: 'hs-pane' }, grid);
  if (previewSkin !== null && previewShip === sh.id && !E.skinOwned(sh.id, previewSkin)) {
    const c = E.SKIN_COST[previewSkin];
    p.append(buyBtn(c, 'Acheter « ' + list[previewSkin].name + ' »', () => { if (E.buySkin(sh.id, previewSkin)) { previewSkin = null; flash(sh.color, 0.4); sfx.upgrade(); refresh(); } }, 'gold wide'));
  } else p.append(h('div', { class: 'muted small center', style: 'margin-top:6px' }, 'Chaque peinture change la couleur et donne un bonus à ce vaisseau.'));
  return p;
}
function modsPanel(sh) {
  const st = E.shipStats(sh.id), lv = S.ships[sh.id];
  const p = h('div', { class: 'hs-pane' });
  const rows = [['pw', 'Puissance', `Dégâts ×${st.dmg.toFixed(2)}`], ['rt', 'Cadence', `Cadence ×${st.rate.toFixed(2)}`], ['sp', 'Spéciale', `Spéciale ×${st.spec.toFixed(2)}`]];
  for (const [k, name, sub] of rows) {
    const c = E.shipUpCost(sh.id, k);
    const b = buyBtn(c, '', () => { if (E.upgradeShip(sh.id, k)) { celebrate(b); refresh(); } });
    p.append(h('div', { class: 'statline' }, h('div', { class: 'lab' }, name, h('small', null, sub)), pips(lv[k], E.SHIP_MAX[k]), b));
  }
  const m = lv.m;
  p.append(h('div', { class: 'muted small', style: 'margin-top:6px' }, `Modules de coffre : +${Math.round(m.dmg * 100)} % dégâts · +${Math.round(m.rate * 100)} % cadence · +${Math.round(m.spec * 100)} % spéciale` + (lv.aw ? ` · Éveil ${lv.aw}/3` : '')));
  return p;
}
function infoPanel(sh) {
  return h('div', { class: 'hs-pane' },
    h('p', { style: 'margin:0 0 8px;color:#d8dcff;font-size:13.5px' }, sh.desc),
    h('div', { class: 'rline' }, h('span', null, 'Arme'), h('b', null, sh.weapon)),
    h('div', { class: 'rline' }, h('span', null, 'Spéciale'), h('b', { style: `color:${sh.color}` }, sh.special)),
    h('div', { class: 'muted small', style: 'margin-top:4px' }, sh.sdesc),
    h('div', { class: 'drone-help', style: 'margin-top:10px' }, h('b', null, 'En partie'), sh.id === 'etincelle' ? 'Étincelle est ton vaisseau de départ : tu décolles toujours avec lui.' : 'Tu décolles avec Étincelle. Ce vaisseau arrive en capsule de renfort pendant le niveau : attrape-la pour le piloter. Le favori ★ tombe plus souvent.'));
}
function shipsTab() {
  const sh = SHIPS[hangarIdx];
  if (previewShip !== sh.id) previewSkin = null;
  const own = E.ownsShip(sh.id);
  const rar = RARITY[sh.rarity];
  const ev = own ? E.evoLevel(sh.id) : 0;
  const stars = h('div', { class: 'evo-stars small' });
  for (let i = 0; i < E.EVO_MAX; i++) stars.append(h('i', { class: i < ev ? 'on' : '' }, '★'));
  const fav = own ? h('button', { class: 'favbtn' + (S.ship === sh.id ? ' on' : ''), onclick: () => { sfx.upgrade(); S.ship = sh.id; saveSoon(); refresh(); } }, S.ship === sh.id ? '★ Favori' : '☆ Favori') : null;
  const stage = h('div', { class: 'ship-stage compact' },
    h('button', { class: 'iconbtn arrow l', html: SVG.left, onclick: () => { sfx.ui(); hangarIdx = (hangarIdx + SHIPS.length - 1) % SHIPS.length; refresh(); } }),
    h('button', { class: 'iconbtn arrow r', html: SVG.right, onclick: () => { sfx.ui(); hangarIdx = (hangarIdx + 1) % SHIPS.length; refresh(); } }),
    fav,
    h('div', { class: 'stage-id' }, h('div', { class: 'ship-name', style: `color:${sh.color}` }, sh.name),
      h('div', { class: 'stage-sub' }, h('span', { class: 'tag', style: `color:${rar.color}` }, rar.name), stars, h('span', { class: 'muted small' }, own ? `⚡ ${fmt(E.powerRating(sh.id))}` : `${hangarIdx + 1}/${SHIPS.length}`))));
  widget(stage, (r, t) => {
    const cx = r.x + r.w / 2, cy = r.y + r.h * 0.4;
    ctx.globalCompositeOperation = 'lighter';
    const g = glow(sh.color, 32); ctx.globalAlpha = own ? 0.6 : 0.25; ctx.drawImage(g.c, cx - 90, cy - 90, 180, 180); ctx.globalAlpha = 1;
    ctx.strokeStyle = sh.color; ctx.globalAlpha = 0.35; ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(cx, cy + 46, 54 + i * 13, 11 + i * 3, 0, 0, TAU); ctx.stroke(); }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    setT(cx, cy + Math.sin(t * 2) * 4, 2.35);
    if (!own) ctx.globalAlpha = 0.45;
    drawHypercar(ctx, sh.id, t, Math.sin(t * 0.9) * 0.25, previewSkin !== null ? { skin: previewSkin } : undefined);
    ctx.globalAlpha = 1; baseT();
    if (Math.random() < 0.4) fx.dot(cx + rand(-5, 5), cy + 40, rand(-8, 8), rand(70, 120), 0.35, 7, sh.color);
  });
  const out = [stage];
  if (own) {
    const subs = [['evo', 'Évolution'], ['skins', 'Peintures'], ['mods', 'Modules'], ['info', 'Infos']];
    out.push(h('div', { class: 'subtabs' }, ...subs.map(([k, l]) => h('button', { class: shipSub === k ? 'on' : '', onclick: () => { if (shipSub !== k) { sfx.ui(); shipSub = k; refresh(); } } }, l))));
    out.push(shipSub === 'evo' ? evoPanel(sh) : shipSub === 'skins' ? skinPanel(sh) : shipSub === 'mods' ? modsPanel(sh) : infoPanel(sh));
  } else {
    const can = S.maxLevel >= sh.req;
    out.push(infoPanel(sh), h('div', { class: 'center', style: 'margin-top:8px' },
      can ? buyBtn(sh.cost, 'Débloquer', () => { if (E.unlockShip(sh.id)) { flash(sh.color, 0.4); sfx.chestOpen(2); refresh(); } }, 'gold big wide')
        : h('p', { class: 'muted small' }, h('span', { html: SVG.lock, style: 'display:inline-block;width:16px;vertical-align:-3px' }), ` Niveau ${sh.req} requis (ou coffre légendaire).`)));
  }
  return out;
}
function dronesTab() {
  const out = [];
  const slots = h('div', { class: 'slots' });
  for (let i = 0; i < 2; i++) {
    const id = S.slots[i];
    const unlocked = i < E.slotCount();
    const sl = h('div', { class: 'slot' + (id && unlocked ? ' filled' : '') });
    if (!unlocked) sl.append(h('span', { html: SVG.lock, style: 'width:18px;display:inline-block' }), ' Verrouillé');
    else if (id) { const cv = h('canvas', { width: 88, height: 88 }); sl.append(cv, DRONE_BY_ID[id].name); drawDroneCanvas(cv, id); sl.onclick = () => { E.unequipDrone(i); sfx.back(); refresh(); }; }
    else sl.append('Favori libre');
    slots.append(sl);
  }
  out.push(h('div', { class: 'drone-help' }, h('b', null, 'Escorte'), 'Tu décolles sans drone. Pendant le niveau, tes drones arrivent en capsules : attrape-les et ils volent à gauche et à droite de ton vaisseau pendant un temps limité (jauge sous le drone). Améliore leur Autonomie ⏱ pour qu’ils restent plus longtemps.'),
    h('div', { class: 'subtitle' }, 'Favoris'), slots, h('div', { class: 'subtitle' }, 'Drones'));
  const cards = h('div', { class: 'cards' });
  for (const d of DRONES) {
    const own = E.ownsDrone(d.id);
    const cv = h('canvas', { width: 240, height: 140 });
    drawDroneCanvas(cv, d.id);
    const card = h('div', { class: 'card' + (own ? '' : ' locked') + (S.slots.includes(d.id) ? ' sel' : '') }, cv, h('div', { class: 'nm', style: `color:${d.color}` }, d.name), h('div', { class: 'ds' }, d.desc));
    if (own) {
      const lvl = S.drones[d.id].lvl;
      card.append(h('div', { class: 'small', style: 'margin:4px 0' }, `Puissance niv. ${lvl}/${E.DRONE_MAX} · ×${E.dronePower(d.id).toFixed(2)}`));
      const c = E.droneUpCost(d.id);
      const b = buyBtn(c, '▲', () => { if (E.upgradeDrone(d.id)) { celebrate(b); refresh(); } });
      const dc = E.droneDurCost(d.id);
      const bd = buyBtn(dc, '⏱', () => { if (E.upgradeDroneDur(d.id)) { celebrate(bd); refresh(); } });
      card.append(h('div', { class: 'small', style: 'margin:2px 0 4px;color:#9ff6ff' }, `Autonomie en vol : ${E.droneDuration(d.id)} s`), h('div', { class: 'row', style: 'gap:4px;margin-bottom:4px' }, bd));
      card.append(h('div', { class: 'row', style: 'flex-wrap:wrap;gap:4px' }, b,
        S.slots.slice(0, E.slotCount()).includes(d.id) ? null : btn('☆ Favori', 'small', () => { let slot = S.slots.slice(0, E.slotCount()).indexOf(null); if (slot < 0) slot = 0; E.equipDrone(d.id, slot); refresh(); })));
    } else {
      const can = S.maxLevel >= d.req;
      card.append(can ? buyBtn(d.cost, '', () => { if (E.unlockDrone(d.id)) { sfx.chestOpen(1); refresh(); } }) : h('div', { class: 'muted small' }, `Niveau ${d.req} requis`));
    }
    cards.append(card);
  }
  out.push(cards);
  return out;
}
function drawDroneCanvas(cv, id) {
  const g = cv.getContext('2d');
  g.clearRect(0, 0, cv.width, cv.height);
  const d = DRONE_BY_ID[id];
  const gr = g.createRadialGradient(cv.width / 2, cv.height / 2, 0, cv.width / 2, cv.height / 2, cv.height / 2);
  gr.addColorStop(0, d.color + '66'); gr.addColorStop(1, d.color + '00');
  g.fillStyle = gr; g.fillRect(0, 0, cv.width, cv.height);
  g.translate(cv.width / 2, cv.height / 2); g.scale(cv.height / 34, cv.height / 34);
  drawDroneIcon(g, id, 0.6);
}

// ================= ATELIER =================
function shopList() {
    const list = h('div');
    for (const u of UPGRADES) {
      const l = S.up[u.id] || 0;
      const locked = u.req && S.maxLevel < u.req;
      const c = E.upCost(u.id);
      const b = locked ? h('span', { class: 'muted small' }, `Niveau ${u.req}`) : buyBtn(c, '', () => { if (E.buyUpgrade(u.id)) { celebrate(b); refresh(); } });
      list.append(h('div', { class: 'item' + (l >= u.max ? ' done' : '') }, h('div', { class: 'ico', html: SVG[u.icon] || SVG.gear, style: 'color:#ff9d3c' }),
        h('div', { class: 'txt' }, h('b', null, u.name), h('span', null, u.desc), u.max > 1 ? pips(l, u.max) : null), b));
    }
    return [h('p', { class: 'muted center', style: 'margin:0 0 6px' }, 'Améliorations permanentes pour tous vos vaisseaux.'), list];
}
register('shop', { build() { hangarTab = 'shop'; setTimeout(() => go('hangar', {}, false), 0); return h('div'); } });

// ================= COFFRES =================
register('chests', {
  build() {
    const free = S.freeChests || [];
    const row = h('div', { class: 'chest-row' });
    for (const id of ['neon', 'prism', 'astral']) {
      const C = CHESTS[id];
      const cv = h('div', { class: 'cv' });
      widget(cv, (r, t) => drawChest(r.x + r.w / 2, r.y + r.h * 0.62, Math.min(1, r.w / 90), C, t + id.length));
      const cost = C.cost();
      row.append(h('div', { class: 'chest' }, cv, h('div', { class: 'cn', style: `color:${C.color}` }, C.name), btn(h('span', null, costEl(cost)), 'small ' + (E.canPay(cost) ? 'gold' : 'gold cant'), () => openFlow(id, false), { onDeny: deny })));
    }
    const pl = pityLeft();
    const freeBox = free.length ? h('div', { class: 'panel glow-gold', style: 'margin-bottom:10px' },
      h('div', { class: 'row' }, h('b', null, `Coffres gagnés : ${free.length}`), h('div', { class: 'spacer' }), btn('Ouvrir', 'gold', () => openFlow(free[0], true))),
      h('div', { class: 'row', style: 'gap:4px;margin-top:6px;flex-wrap:wrap' }, ...free.slice(0, 12).map((c) => h('img', { src: iconURL('chest_' + c, 48), style: 'width:30px' })))) : null;
    const odds = h('div', { class: 'odds' }, h('b', null, ''), ...['neon', 'prism', 'astral'].map((id) => h('b', { style: `color:${CHESTS[id].color}` }, CHESTS[id].name.replace('Coffre ', ''))));
    RARITY.forEach((r, i) => { odds.append(h('b', { style: `color:${r.color}` }, r.name)); for (const id of ['neon', 'prism', 'astral']) { const o = CHESTS[id].odds; odds.append(h('span', null, (o[i] / o.reduce((a, b) => a + b, 0) * 100).toFixed(1) + ' %')); } });
    return h('div', null, topbar('Trésors'), treasureTabs('chests'), h('div', { class: 'scroll' },
      freeBox, row,
      h('div', { class: 'panel', style: 'margin-top:10px' }, h('div', { class: 'subtitle', style: 'margin-top:0' }, 'Garantie anti-malchance'),
        h('div', { class: 'pity', html: `Objet <b style="color:${RARITY[1].color}">Rare ou mieux</b> garanti dans <b>${pl.r}</b> ouverture(s)<br>Objet <b style="color:${RARITY[2].color}">Épique ou mieux</b> garanti dans <b>${pl.e}</b><br>Objet <b style="color:${RARITY[3].color}">Légendaire</b> garanti dans <b>${pl.l}</b>` })),
      h('div', { class: 'panel' }, h('div', { class: 'subtitle', style: 'margin-top:0' }, 'Probabilités'), odds,
        h('p', { class: 'muted small' }, 'Les coffres s’achètent uniquement avec les ressources gagnées en jouant. Les objets rares renforcent fortement vos vaisseaux, drones et attaques spéciales.'))));
  },
});
function openFlow(id, free) {
  const res = openChest(id, free);
  if (!res) { deny(); return; }
  const { rar, item, chest } = res;
  const R = RARITY[rar];
  const scr = document.querySelector('#ui .screen');
  if (scr) scr.style.visibility = 'hidden';
  ui.widgets = [];
  const ov = h('div', { class: 'reveal' });
  const stage = h('div', { style: 'position:absolute;inset:0;pointer-events:none' });
  ov.append(stage);
  document.getElementById('ui').append(ov);
  const shakeT = [0.7, 1.2, 1.8, 2.6][rar];
  let opened = false, done = false;
  const tease = rar === 3 ? ['#3dbdff', '#c35cff', '#ffc23d'] : null;
  sfx.chestShake(0);
  let lastShake = 0;
  widget(stage, (r, t) => {
    const cx = r.x + r.w / 2, cy = r.y + r.h * 0.42;
    ctx.fillStyle = `rgba(3,2,14,${Math.min(0.85, t * 2)})`; ctx.fillRect(0, 0, view.w, view.h);
    let col = R.color;
    if (tease && t < shakeT) col = tease[Math.min(2, Math.floor((t / shakeT) * 3))];
    if (t < shakeT) {
      const k = t / shakeT;
      if (t - lastShake > 0.35 - k * 0.2) { lastShake = t; sfx.chestShake(Math.floor(k * 4)); }
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 6 + rar * 3; i++) { const a = t * (0.6 + i * 0.05) + i * 1.1; ctx.globalAlpha = 0.12 * k; ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a - 0.05) * 600, cy + Math.sin(a - 0.05) * 600); ctx.lineTo(cx + Math.cos(a + 0.05) * 600, cy + Math.sin(a + 0.05) * 600); ctx.fill(); }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      drawChest(cx, cy, 1.6 + k * 0.2, { ...chest, color: col }, t, 0.3 + k * (0.6 + rar * 0.3));
    } else {
      if (!opened) {
        opened = true;
        sfx.chestOpen(rar); flash(R.color, 0.5 + rar * 0.12); addShake(0.2 + rar * 0.15);
        for (let i = 0; i < 30 + rar * 25; i++) { const a = rand(TAU), sp = rand(100, 300 + rar * 100); fx.spark(cx, cy, Math.cos(a) * sp, Math.sin(a) * sp, rand(0.5, 1.2), 16, i % 3 ? R.color : '#ffffff', 2.5); }
        for (let i = 0; i <= rar; i++) fx.ring(cx, cy, 10, 150 + i * 80, 0.8 + i * 0.2, i % 2 ? '#ffffff' : R.color, 6 - i);
        if (rar === 3) for (let i = 0; i < 40; i++) fx.star(cx + rand(-150, 150), cy + rand(-200, 100), rand(4, 9), rand(0.8, 1.6), hslHex(rand(360), 100, 70), rand(-40, 40), rand(-80, 0));
        setTimeout(showCard, 350);
      }
      const k = Math.min(1, (t - shakeT) * 2);
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 10 + rar * 4; i++) { const a = t * 0.4 + (i / (10 + rar * 4)) * TAU; ctx.globalAlpha = 0.18; ctx.fillStyle = rar === 3 ? hslHex((t * 120 + i * 30) % 360, 100, 65) : R.color; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a - 0.06) * 700, cy + Math.sin(a - 0.06) * 700); ctx.lineTo(cx + Math.cos(a + 0.06) * 700, cy + Math.sin(a + 0.06) * 700); ctx.fill(); }
      const g = glow(R.color, 32); ctx.globalAlpha = 0.9; ctx.drawImage(g.c, cx - 120 * k, cy - 120 * k, 240 * k, 240 * k);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      drawChest(cx, cy + 50, 1.4, chest, t, 0, 1);
      setT(cx, cy - 20 + Math.sin(t * 2) * 5, 2.4 * ease.outBack(k));
      itemIcon(item, t);
      baseT();
    }
  });
  function showCard() {
    if (done) return;
    done = true;
    const card = h('div', { class: 'rcard panel rar' + rar, style: `--rc:${R.color}` },
      h('div', { class: 'rstars' }, '★'.repeat(rar + 1)),
      h('div', { class: 'rrar', style: `color:${R.color}` }, R.name),
      h('div', { class: 'rname', style: `color:${R.color}` }, item.title),
      h('div', { class: 'rdesc' }, item.desc),
      h('div', { class: 'tap-hint' }, 'Touchez pour continuer'));
    ov.append(card);
    ov.addEventListener('click', () => { ov.remove(); ui.widgets = ui.widgets.filter((w) => w.el !== stage); refresh(); }, { once: true });
  }
}
function itemIcon(item, t) {
  const c = ctx;
  if (item.kind === 'cur') ICONS[item.cur](c, 14);
  else if (item.kind === 'boost') ICONS['boost_' + item.boost](c, 14);
  else if (item.kind === 'ship') { c.scale(0.8, 0.8); SHIP_FX[item.ship].draw(c, t, SHIP_BY_ID[item.ship].color, SHIP_BY_ID[item.ship].color2); }
  else if (item.kind === 'drone' || item.kind === 'dmodule') { c.scale(1.4, 1.4); drawDroneIcon(c, item.drone, t); }
  else if (item.kind === 'awaken') ICONS.nova(c, 15);
  else if (item.kind === 'shard') drawShard(c, 15, SHIP_BY_ID[item.ship].color);
  else { c.rotate(t); c.fillStyle = '#ffffff'; c.strokeStyle = item.stat === 'dmg' ? '#ff4f6e' : item.stat === 'rate' ? '#38f2ff' : '#ffd23f'; c.lineWidth = 2.5; c.beginPath(); for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; c.lineTo(Math.cos(a) * 13, Math.sin(a) * 13); } c.closePath(); c.fill(); c.stroke(); c.fillStyle = c.strokeStyle; c.beginPath(); c.arc(0, 0, 5, 0, TAU); c.fill(); }
}

// ================= SALLE DES TROPHÉES =================
register('trophies', {
  build() {
    const shipsOwned = SHIPS.filter((x) => E.ownsShip(x.id)).length, dronesOwned = DRONES.filter((x) => E.ownsDrone(x.id)).length;
    const bosses = Object.entries(S.trophyBoss || {});
    const tot = SHIPS.length + DRONES.length, got = shipsOwned + dronesOwned;
    const head = h('div', { class: 'tro-head' },
      h('div', { class: 'tro-pct' }, h('b', null, Math.round((got / tot) * 100) + ' %'), h('small', null, 'COLLECTION')),
      h('div', { class: 'tro-stats' }, h('div', null, h('b', null, `${shipsOwned}/${SHIPS.length}`), ' vaisseaux'), h('div', null, h('b', null, `${dronesOwned}/${DRONES.length}`), ' drones'), h('div', null, h('b', null, String(bosses.reduce((a, [, n]) => a + n, 0))), ' colosses vaincus'), h('div', null, h('b', null, String(S.best || 0).padStart(8, '0')), ' meilleur score')));
    const shipGrid = h('div', { class: 'tro-grid' });
    for (const sh of SHIPS) {
      const own = E.ownsShip(sh.id), rar = RARITY[sh.rarity], ev = own ? E.evoLevel(sh.id) : 0;
      const cv = h('div', { class: 'tro-cv' });
      widget(cv, (r, t) => {
        const cx = r.x + r.w / 2, cy = r.y + r.h * 0.48;
        ctx.globalCompositeOperation = 'lighter';
        // projecteur + socle
        const gr = ctx.createLinearGradient(0, r.y, 0, cy + 30); gr.addColorStop(0, rgbaHex(own ? rar.color : '#5a6080', 0)); gr.addColorStop(1, rgbaHex(own ? rar.color : '#5a6080', 0.28));
        ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(cx - 10, r.y); ctx.lineTo(cx + 10, r.y); ctx.lineTo(cx + 40, cy + 30); ctx.lineTo(cx - 40, cy + 30); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = own ? rar.color : '#5a6080'; ctx.globalAlpha = 0.7; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(cx, cy + 30, 34, 7, 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        setT(cx, cy + Math.sin(t * 1.6 + sh.rarity) * 2, 1.15);
        if (own) drawHypercar(ctx, sh.id, t, Math.sin(t * 0.8) * 0.2);
        else { ctx.globalAlpha = 0.18; drawHypercar(ctx, sh.id, t, 0, { tier: 0, skin: 0 }); ctx.globalAlpha = 1; }
        baseT();
      });
      shipGrid.append(h('div', { class: 'tro-card' + (own ? '' : ' locked'), style: `--c:${own ? rar.color : '#5a6080'}`, onclick: () => { sfx.ui(); hangarIdx = SHIPS.indexOf(sh); hangarTab = 'ships'; go('hangar'); } },
        cv, h('b', { style: own ? `color:${sh.color}` : '' }, own ? sh.name : '???'),
        h('small', null, own ? `${'★'.repeat(ev)}${'☆'.repeat(6 - ev)}` : `Niveau ${sh.req} · ${rar.name}`)));
    }
    const droneGrid = h('div', { class: 'tro-grid d' });
    for (const d of DRONES) {
      const own = E.ownsDrone(d.id);
      const cv = h('div', { class: 'tro-cv' });
      widget(cv, (r, t) => {
        const cx = r.x + r.w / 2, cy = r.y + r.h * 0.5;
        setT(cx, cy + Math.sin(t * 2) * 2, 1.1);
        if (own) drawDroneIcon(ctx, d.id, t);
        else { ctx.globalAlpha = 0.18; drawDroneIcon(ctx, d.id, t); ctx.globalAlpha = 1; }
        baseT();
      });
      droneGrid.append(h('div', { class: 'tro-card' + (own ? '' : ' locked'), style: `--c:${own ? d.color : '#5a6080'}` }, cv, h('b', { style: own ? `color:${d.color}` : '' }, own ? d.name : '???'), h('small', null, own ? `Niv. ${S.drones[d.id].lvl} · ${E.droneDuration(d.id)} s` : `Niveau ${d.req}`)));
    }
    const bossRow = h('div', { class: 'tro-boss' });
    const BN = { jelly: 'Méduse', crab: 'Crabe', flower: 'Fleur', eye: 'Œil', mantis: 'Mante', worm: 'Ver', heart: 'Cœur', dread: 'Cuirassé', ring: 'Forteresse', seraph: 'Séraphin', hydra: 'Hydre', hive: 'Ruche' };
    for (const [k, nm] of Object.entries(BN)) { const n = (S.trophyBoss || {})[k] || 0; bossRow.append(h('div', { class: 'tb' + (n ? '' : ' locked') }, h('span', null, n ? '🏆' : '🔒'), h('b', null, nm), h('small', null, n ? '×' + n : '—'))); }
    return h('div', null, topbar('Trophées'), h('div', { class: 'scroll' }, head,
      h('div', { class: 'subtitle' }, 'Vaisseaux'), shipGrid,
      h('div', { class: 'subtitle' }, 'Drones'), droneGrid,
      h('div', { class: 'subtitle' }, 'Colosses vaincus'), bossRow));
  },
});
const rgbaHex = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };

// ================= ROUE =================
register('wheel', {
  build() {
    refreshWheel();
    const st = { ang: 0, vel: 0, spinning: false, target: 0, from: 0, t0: 0, dur: 4.2, last: 0 };
    const stage = h('div', { class: 'wheel-stage' });
    widget(stage, (r, t) => {
      if (st.spinning) {
        const k = Math.min(1, (performance.now() - st.t0) / 1000 / st.dur);
        st.ang = st.from + (st.target - st.from) * ease.outCubic(k);
        const seg = Math.floor(st.ang / (TAU / WHEEL.length));
        if (seg !== st.last) { st.last = seg; st.tick = 1; sfx.wheelTick(1 + (1 - k) * 0.3); }
        st.spin = 1 - k;
        if (k >= 1) { st.spinning = false; st.spin = 0; st.done && st.done(); }
      }
      st.tick = Math.max(0, (st.tick || 0) - 0.12);
      const R = Math.min(r.w, r.h) * 0.36;
      drawWheelLux(r.x + r.w / 2, r.y + r.h / 2 + R * 0.06, R, WHEEL, -st.ang, t, (i, c) => {
        const s = WHEEL[i];
        const k = s.label.startsWith('Pièces') ? 'coins' : s.label.startsWith('Cristaux') ? 'crystals' : s.label === 'Composants' ? 'parts' : s.label === 'Gemmes' ? 'gems' : s.label === 'Boost' ? 'boost_power' : s.label === 'Coffre Néon' ? 'chest_neon' : s.label === 'Coffre Prisme' ? 'chest_prism' : 'nova';
        c.save(); c.translate(0, -R * 0.12);
        if (s.label === 'Éclats') drawShard(c, R * 0.1, '#9fe8ff'); else ICONS[k](c, R * 0.1);
        c.restore();
        // libellé le long du rayon (lisible, sans chevauchement)
        c.save(); c.translate(0, R * 0.2); c.rotate(-Math.PI / 2);
        c.font = `900 ${R * 0.072}px "Avenir Next Condensed",system-ui,sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.lineWidth = R * 0.022; c.strokeStyle = 'rgba(0,0,0,0.75)'; c.strokeText(s.label.toUpperCase(), 0, 0);
        c.fillStyle = s.label === 'JACKPOT' ? '#fff3b0' : '#ffffff'; c.fillText(s.label.toUpperCase(), 0, 0);
        c.restore();
      }, st.spin || 0, st.tick || 0);
    });
    const cost = wheelCost();
    const label = cost === null ? 'Tourner (gratuit)' : cost === false ? 'Revenez demain' : h('span', null, 'Tourner  ', costEl(cost));
    const b = btn(label, 'primary big wide' + (cost === false ? ' off' : cost && !E.canPay(cost) ? ' cant' : ''), () => {
      if (st.spinning) return;
      const res = spinWheel();
      if (!res) { deny(); return; }
      b.classList.add('off');
      const n = WHEEL.length, segA = TAU / n;
      st.from = st.ang % TAU;
      st.target = st.from + TAU * 5 + (TAU - ((st.from % TAU) + 0)) + res.idx * segA + segA / 2 + rand(-segA * 0.3, segA * 0.3) - (st.from % TAU) + (st.from % TAU);
      st.target = Math.ceil(st.from / TAU) * TAU + TAU * 5 + res.idx * segA + segA / 2 + rand(-segA * 0.3, segA * 0.3);
      st.t0 = performance.now(); st.spinning = true; st.last = -1;
      st.done = () => { res.apply(); const jackpot = WHEEL[res.idx].label === 'JACKPOT'; if (jackpot) { flash('#ffffff', 0.7); sfx.chestOpen(3); } rewardPopup(jackpot ? 'JACKPOT !' : 'Gagné !', res.bundle, () => refresh()); };
    }, { onDeny: deny });
    return h('div', null, topbar('Trésors'), treasureTabs('wheel'), stage,
      h('p', { class: 'muted center small' }, `Un tour gratuit par jour, puis jusqu’à 3 tours payés en pièces. Tours payés aujourd’hui : ${S.wheel.paid}/3`), b);
  },
});

// ================= MISSIONS =================
let missionTab = 'daily';
register('missions', {
  build() {
    const tabs = sectTabs([['daily', 'Missions', () => { missionTab = 'daily'; refresh(); }, missionsBadge() + (S.daily.pending ? 1 : 0)], ['stars', 'Étoiles', () => { missionTab = 'stars'; refresh(); }, E.starRewardsAvailable()], ['ach', 'Succès', () => { missionTab = 'ach'; refresh(); }, achBadge()]], missionTab);
    const out = [];
    if (missionTab === 'ach') out.push(...achList());
    else if (missionTab === 'daily') {
      out.push(h('div', { class: 'panel glow-gold row' }, h('span', { html: SVG.gift, style: 'width:34px;color:#ffd23f' }), h('div', { style: 'flex:1' }, h('b', null, 'Cadeau de connexion'), h('div', { class: 'muted small' }, `Série : ${S.daily.streak} jour(s) · jour ${calendarIndex() + 1}/7`)), btn(S.daily.pending ? 'Récupérer' : 'Voir', S.daily.pending ? 'gold small pulse' : 'ghost small', () => dailyPopup())));
      out.push(h('div', { class: 'subtitle' }, 'Missions du jour'));
      S.missions.list.forEach((m, i) => {
        const M = MISSIONS[m.id];
        const rw = missionReward(m);
        const b = m.claimed ? h('span', { class: 'tag', style: 'color:#47ffa3' }, 'FAIT') : m.done ? btn('Récupérer', 'gold small pulse', () => { const r = claimMission(i); if (r) { flyRewards(b, r); sfx.levelUp(); refresh(); } }) : h('span', { class: 'muted small' }, `${fmt(m.p)}/${fmt(m.n)}`);
        out.push(h('div', { class: 'item' + (m.done && !m.claimed ? ' done' : '') + (m.claimed ? ' claimed' : '') }, h('div', { class: 'ico', html: SVG.target, style: 'color:#47ffa3' }),
          h('div', { class: 'txt' }, h('b', null, M.text(m.n)), rewardRow(rw), h('div', { class: 'bar green' }, h('i', { style: `width:${Math.round((m.p / m.n) * 100)}%` }))), b));
      });
      const allDone = S.missions.list.length && S.missions.list.every((m) => m.claimed);
      const bb = S.missions.bonus ? h('span', { class: 'tag', style: 'color:#47ffa3' }, 'FAIT') : btn('Bonus', 'gold small' + (allDone ? ' pulse' : ' off'), () => { const r = claimMissionBonus(); if (r) rewardPopup('Bonus quotidien !', r, () => refresh()); });
      out.push(h('div', { class: 'item' }, h('div', { class: 'ico', html: SVG.chest, style: 'color:#ffd23f' }), h('div', { class: 'txt' }, h('b', null, 'Les 3 missions accomplies'), rewardRow(MISSION_BONUS())), bb));
      out.push(h('p', { class: 'muted small center' }, 'Nouvelles missions chaque jour à minuit.'));
    } else {
      const total = E.totalStars();
      const avail = E.starRewardsAvailable();
      const nextAt = (S.starsClaimed + 1) * E.STAR_STEP;
      out.push(h('div', { class: 'panel center' }, h('div', { style: 'font-size:34px;font-weight:800;color:#ffd23f' }, `★ ${total}`), h('div', { class: 'muted' }, `Prochaine récompense à ${nextAt} étoiles`),
        h('div', { class: 'bar gold', style: 'margin:8px 0' }, h('i', { style: `width:${Math.min(100, ((total - S.starsClaimed * E.STAR_STEP) / E.STAR_STEP) * 100)}%` })),
        rewardRow(E.starMilestone(S.starsClaimed)), h('div', { style: 'height:10px' }),
        avail > 0 ? btn(`Récupérer (${avail})`, 'gold big pulse', () => { const r = E.claimStarReward(); if (r) rewardPopup('Récompense d’étoiles', r, () => refresh()); }) : h('div', { class: 'muted small' }, 'Gagnez des étoiles en réussissant les niveaux (3 par difficulté).')));
      out.push(h('div', { class: 'panel' }, h('div', { class: 'subtitle', style: 'margin-top:0' }, 'Comment gagner des étoiles'),
        h('p', { class: 'small' }, '★ Terminer le niveau · ★ Détruire au moins 80 % des ennemis (ou battre le boss vite) · ★ Ne pas perdre plus d’un cœur. Chaque difficulté a ses propres étoiles.')));
    }
    return h('div', null, topbar('Quêtes'), tabs, h('div', { class: 'scroll' }, out));
  },
});

// ================= SUCCÈS =================
function achList() {
    const list = h('div');
    const sorted = ACHIEVEMENTS.slice().sort((a, b) => (achClaimable(b) ? 1 : 0) - (achClaimable(a) ? 1 : 0));
    for (const a of sorted) {
      const t = achClaimed(a), max = a.tiers.length;
      const done = t >= max;
      const goal = a.tiers[Math.min(t, max - 1)];
      const v = achValue(a);
      const b = done ? h('span', { class: 'tag', style: 'color:#47ffa3' }, 'COMPLET') : achClaimable(a) ? btn('Récupérer', 'gold small pulse', () => { const r = claimAch(a); if (r) { flyRewards(b, r); sfx.levelUp(); refresh(); } }) : h('span', { class: 'muted small' }, `${fmt(Math.min(v, goal))}/${fmt(goal)}`);
      list.append(h('div', { class: 'item' + (achClaimable(a) ? ' done' : '') }, h('div', { class: 'ico', html: SVG.trophy, style: `color:${['#9aa0d8', '#5dffa0', '#3dbdff', '#c35cff', '#ffc23d', '#ffffff'][t]}` }),
        h('div', { class: 'txt' }, h('b', null, `${a.name} ${'★'.repeat(t)}`), h('span', null, a.text(goal)), done ? null : rewardRow(achReward(t)), done ? null : h('div', { class: 'bar gold' }, h('i', { style: `width:${Math.min(100, (v / goal) * 100)}%` }))), b));
    }
    return [list];
}
register('achievements', { build() { missionTab = 'ach'; setTimeout(() => go('missions', {}, false), 0); return h('div'); } });

// ================= RÉGLAGES =================
register('settings', {
  build() {
    const s = S.settings;
    const sw = (on, fn) => { const b = h('button', { class: 'switch' + (on ? ' on' : ''), onclick: () => { sfx.ui(); fn(); b.classList.toggle('on'); } }); return b; };
    const audioRow = (k, label) => {
      const r = h('input', { type: 'range', min: 0, max: 100, value: Math.round(s[k].vol * 100) });
      r.addEventListener('input', () => { s[k].vol = r.value / 100; applyVolumes(); saveSoon(); });
      r.addEventListener('change', () => sfx.coin(3));
      return h('div', { class: 'setting' }, h('div', { class: 'lab' }, label), r, sw(s[k].on, () => { s[k].on = !s[k].on; applyVolumes(); saveSoon(); }));
    };
    const seg = (opts, cur, fn) => h('div', { class: 'seg' }, ...opts.map(([v, l]) => h('button', { class: cur === v ? 'on' : '', onclick: () => { sfx.ui(); fn(v); refresh(); } }, l)));
    return h('div', null, topbar('Réglages', h('div', { class: 'spacer' })), h('div', { class: 'scroll' },
      h('div', { class: 'subtitle' }, 'Son'),
      h('div', { class: 'panel' }, audioRow('master', 'Son général'), audioRow('music', 'Musique'), audioRow('sfx', 'Bruitages'),
        h('p', { class: 'muted small' }, 'Pas de son sur iPhone ? Montez le volume avec les boutons latéraux après avoir touché l’écran une fois.')),
      h('div', { class: 'subtitle' }, 'Contrôles'),
      h('div', { class: 'panel' },
        h('div', { class: 'setting' }, h('div', { class: 'lab' }, 'Pilotage', h('small', null, 'Glisser : le vaisseau reste là où vous le touchez et suit votre doigt (recommandé). Au-dessus du doigt : il se place au-dessus du doigt.')), seg([['relative', 'Glisser'], ['direct', 'Au-dessus']], s.control, (v) => { s.control = v; saveSoon(); })),
        h('div', { class: 'setting' }, h('div', { class: 'lab' }, 'Décalage (mode Au-dessus)', h('small', null, 'Distance entre le doigt et le vaisseau')), seg([[0, '0'], [1, 'S'], [2, 'M'], [3, 'L']], s.offset, (v) => { s.offset = v; saveSoon(); })),
        h('div', { class: 'setting' }, h('div', { class: 'lab' }, 'Afficher le point d’impact', h('small', null, 'Le petit cœur blanc du vaisseau')), sw(s.hitbox, () => { s.hitbox = !s.hitbox; saveSoon(); })),
        h('div', { class: 'setting' }, h('div', { class: 'lab' }, 'Attaque spéciale', h('small', null, 'Bouton en bas à droite ou toucher avec un 2e doigt')))),
      h('div', { class: 'subtitle' }, 'Affichage'),
      h('div', { class: 'panel' },
        h('div', { class: 'setting' }, h('div', { class: 'lab' }, 'Qualité', h('small', null, 'Auto ajuste la résolution pour garder 60 i/s')), seg([['auto', 'Auto'], ['high', 'Haute'], ['med', 'Moy.'], ['low', 'Éco']], s.quality, (v) => { s.quality = v; setQuality(v); saveSoon(); })),
        h('div', { class: 'setting' }, h('div', { class: 'lab' }, 'Tremblements d’écran'), sw(s.shake, () => { s.shake = !s.shake; cam.shakeOn = s.shake; saveSoon(); }))),
      h('div', { class: 'subtitle' }, 'Progression'),
      h('div', { class: 'panel' }, h('p', { class: 'small' }, 'Votre progression est sauvegardée automatiquement sur cet appareil.'),
        btn('Réinitialiser la partie', 'ghost small', () => confirmBox('Tout effacer ?', 'Toute votre progression sera définitivement perdue.', 'Effacer', () => confirmBox('Vraiment ?', 'Dernière confirmation.', 'Oui, effacer', () => resetSave())))),
      h('p', { class: 'muted small center', style: 'margin-top:16px' }, 'Astralume — jeu original, graphismes et sons générés par le code. Aucune publicité, aucun achat.')));
  },
});
