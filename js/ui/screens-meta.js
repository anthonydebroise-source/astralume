// Écrans de progression : hangar, atelier, coffres, roue, missions, succès, réglages
import { h, btn, iconBtn, register, go, back, refresh, widget, modal, curBar, curIcon, costEl, rewardRow, rewardPopup, flyRewards, toast, confirmBox, ui } from './ui.js';
import { SVG } from './icons.js';
import { drawChest, drawWheel } from './art-ui.js';
import { S, saveSoon, resetSave } from '../economy/save.js';
import { SHIPS, SHIP_BY_ID, DRONES, DRONE_BY_ID, UPGRADES, RARITY, BOOSTS, CUR } from '../economy/data.js';
import * as E from '../economy/economy.js';
import { CHESTS, PITY, pityLeft, openChest, WHEEL, wheelCost, spinWheel, refreshWheel } from '../economy/gacha.js';
import { MISSIONS, missionReward, claimMission, claimMissionBonus, MISSION_BONUS, calendarIndex } from '../economy/daily.js';
import { ACHIEVEMENTS, achValue, achClaimed, achReward, achClaimable, claimAch } from '../economy/achievements.js';
import { SHIP_FX } from '../game/ships.js';
import { drawDroneIcon } from '../game/drones.js';
import { ctx, setT, baseT, view, setQuality, cam } from '../engine/renderer.js';
import { glow } from '../engine/sprites.js';
import { fx } from '../engine/particles.js';
import { iconURL, ICONS } from '../game/art.js';
import { fmt, TAU, rand, ease, hslHex } from '../engine/math.js';
import { sfx } from '../audio/sfx.js';
import { applyVolumes } from '../audio/audio.js';
import { addShake, flash } from '../engine/renderer.js';
import { dailyPopup } from './screens-main.js';

const topbar = (title, extra) => h('div', { class: 'topbar' }, iconBtn(SVG.back, back, 'Retour'), h('div', { class: 'title' }, title), extra || curBar());
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
    const tabs = h('div', { class: 'tabs', style: 'margin:4px 0 8px' },
      h('button', { class: 'tab' + (hangarTab === 'ships' ? ' on' : ''), onclick: () => { hangarTab = 'ships'; sfx.ui(); refresh(); } }, 'Vaisseaux'),
      h('button', { class: 'tab' + (hangarTab === 'drones' ? ' on' : ''), onclick: () => { hangarTab = 'drones'; sfx.ui(); refresh(); } }, 'Drones'));
    const body = hangarTab === 'ships' ? shipsTab() : dronesTab();
    return h('div', null, topbar('Hangar'), tabs, h('div', { class: 'scroll' }, body));
  },
});
function shipsTab() {
  const sh = SHIPS[hangarIdx];
  const own = E.ownsShip(sh.id);
  const rar = RARITY[sh.rarity];
  const stage = h('div', { class: 'ship-stage' },
    h('button', { class: 'iconbtn arrow l', html: SVG.left, onclick: () => { sfx.ui(); hangarIdx = (hangarIdx + SHIPS.length - 1) % SHIPS.length; refresh(); } }),
    h('button', { class: 'iconbtn arrow r', html: SVG.right, onclick: () => { sfx.ui(); hangarIdx = (hangarIdx + 1) % SHIPS.length; refresh(); } }));
  widget(stage, (r, t) => {
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    ctx.globalCompositeOperation = 'lighter';
    const g = glow(sh.color, 32); ctx.globalAlpha = own ? 0.7 : 0.3; ctx.drawImage(g.c, cx - 110, cy - 110, 220, 220); ctx.globalAlpha = 1;
    ctx.strokeStyle = sh.color; ctx.globalAlpha = 0.35; ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(cx, cy + 60, 70 + i * 16, 14 + i * 4, 0, 0, TAU); ctx.stroke(); }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    setT(cx, cy + Math.sin(t * 2) * 5, 3.2);
    if (!own) ctx.globalAlpha = 0.45;
    SHIP_FX[sh.id].draw(ctx, t, sh.color, sh.color2);
    ctx.globalAlpha = 1; baseT();
    if (Math.random() < 0.5) fx.dot(cx + rand(-6, 6), cy + 48, rand(-10, 10), rand(80, 140), 0.4, 8, sh.color);
  });
  const st = E.shipStats(sh.id);
  const lv = S.ships[sh.id];
  const out = [stage,
    h('div', { class: 'ship-name', style: `color:${sh.color}` }, sh.name),
    h('div', { class: 'center' }, h('span', { class: 'tag', style: `color:${rar.color}` }, rar.name), ' ', h('span', { class: 'muted small' }, `${hangarIdx + 1}/${SHIPS.length}`)),
    h('p', { class: 'center', style: 'margin:8px 0;color:#d8dcff;font-size:14px' }, sh.desc),
    h('div', { class: 'panel' },
      h('div', { class: 'rline' }, h('span', null, 'Arme'), h('b', null, sh.weapon)),
      h('div', { class: 'rline' }, h('span', null, 'Spéciale'), h('b', { style: `color:${sh.color}` }, sh.special)),
      h('div', { class: 'muted small', style: 'margin-top:4px' }, sh.sdesc)),
  ];
  if (own) {
    const up = h('div', { class: 'panel', style: 'margin-top:10px' });
    const rows = [['pw', 'Puissance', `Dégâts ×${st.dmg.toFixed(2)}`], ['rt', 'Cadence', `Cadence ×${st.rate.toFixed(2)}`], ['sp', 'Spéciale', `Spéciale ×${st.spec.toFixed(2)}`]];
    for (const [k, name, sub] of rows) {
      const c = E.shipUpCost(sh.id, k);
      const b = buyBtn(c, '', () => { if (E.upgradeShip(sh.id, k)) { celebrate(b); refresh(); } });
      up.append(h('div', { class: 'statline' }, h('div', { class: 'lab' }, name, h('small', null, sub)), pips(lv[k], E.SHIP_MAX[k]), b));
    }
    const m = lv.m;
    if (m.dmg + m.rate + m.spec > 0 || lv.aw) up.append(h('div', { class: 'muted small', style: 'margin-top:6px' }, `Modules : +${Math.round(m.dmg * 100)} % dégâts · +${Math.round(m.rate * 100)} % cadence · +${Math.round(m.spec * 100)} % spéciale` + (lv.aw ? ` · Éveil ${lv.aw}/3` : '')));
    out.push(up);
    out.push(h('div', { style: 'margin-top:12px' }, S.ship === sh.id ? btn('✓ Vaisseau équipé', 'green wide off', null) : btn('Équiper', 'primary big wide', () => { S.ship = sh.id; saveSoon(); sfx.upgrade(); refresh(); })));
  } else {
    const can = S.maxLevel >= sh.req;
    out.push(h('div', { class: 'panel center', style: 'margin-top:10px' },
      can ? h('div', null, h('p', null, 'Débloquer ce vaisseau :'), buyBtn(sh.cost, 'Débloquer', () => { if (E.unlockShip(sh.id)) { flash(sh.color, 0.4); sfx.chestOpen(2); refresh(); } }, 'gold big'))
        : h('p', null, h('span', { html: SVG.lock, style: 'display:inline-block;width:18px;vertical-align:-3px' }), ` Atteignez le niveau ${sh.req} pour le débloquer (ou trouvez-le dans un coffre légendaire).`)));
  }
  out.push(h('div', { class: 'muted small center', style: 'margin-top:10px' }, `Puissance actuelle : ${fmt(E.powerRating())}`));
  return out;
}
function dronesTab() {
  const out = [];
  const slots = h('div', { class: 'slots' });
  for (let i = 0; i < 2; i++) {
    const id = S.slots[i];
    const unlocked = i < E.slotCount();
    const sl = h('div', { class: 'slot' + (id && unlocked ? ' filled' : '') });
    if (!unlocked) sl.append(h('span', { html: SVG.lock, style: 'width:18px;display:inline-block' }), ' Atelier');
    else if (id) { const cv = h('canvas', { width: 88, height: 88 }); sl.append(cv, DRONE_BY_ID[id].name); drawDroneCanvas(cv, id); sl.onclick = () => { E.unequipDrone(i); sfx.back(); refresh(); }; }
    else sl.append('Emplacement libre');
    slots.append(sl);
  }
  out.push(h('div', { class: 'subtitle' }, 'Emplacements'), slots, h('div', { class: 'subtitle' }, 'Drones'));
  const cards = h('div', { class: 'cards' });
  for (const d of DRONES) {
    const own = E.ownsDrone(d.id);
    const cv = h('canvas', { width: 240, height: 140 });
    drawDroneCanvas(cv, d.id);
    const card = h('div', { class: 'card' + (own ? '' : ' locked') + (S.slots.includes(d.id) ? ' sel' : '') }, cv, h('div', { class: 'nm', style: `color:${d.color}` }, d.name), h('div', { class: 'ds' }, d.desc));
    if (own) {
      const lvl = S.drones[d.id].lvl;
      card.append(h('div', { class: 'small', style: 'margin:4px 0' }, `Niveau ${lvl}/${E.DRONE_MAX} · ×${E.dronePower(d.id).toFixed(2)}`));
      const c = E.droneUpCost(d.id);
      const b = buyBtn(c, '▲', () => { if (E.upgradeDrone(d.id)) { celebrate(b); refresh(); } });
      card.append(h('div', { class: 'row', style: 'flex-wrap:wrap;gap:4px' }, b,
        S.slots.slice(0, E.slotCount()).includes(d.id) ? null : btn('Équiper', 'small', () => { let slot = S.slots.slice(0, E.slotCount()).indexOf(null); if (slot < 0) slot = 0; E.equipDrone(d.id, slot); refresh(); })));
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
register('shop', {
  build() {
    const list = h('div');
    for (const u of UPGRADES) {
      const l = S.up[u.id] || 0;
      const locked = u.req && S.maxLevel < u.req;
      const c = E.upCost(u.id);
      const b = locked ? h('span', { class: 'muted small' }, `Niveau ${u.req}`) : buyBtn(c, '', () => { if (E.buyUpgrade(u.id)) { celebrate(b); refresh(); } });
      list.append(h('div', { class: 'item' + (l >= u.max ? ' done' : '') }, h('div', { class: 'ico', html: SVG[u.icon] || SVG.gear, style: 'color:#ff9d3c' }),
        h('div', { class: 'txt' }, h('b', null, u.name), h('span', null, u.desc), u.max > 1 ? pips(l, u.max) : null), b));
    }
    return h('div', null, topbar('Atelier'), h('p', { class: 'muted center', style: 'margin:0 0 6px' }, 'Améliorations permanentes pour tous vos vaisseaux.'), h('div', { class: 'scroll' }, list));
  },
});

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
    return h('div', null, topbar('Coffres'), h('div', { class: 'scroll' },
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
    const card = h('div', { class: 'rcard panel', style: `border-color:${R.color};box-shadow:0 0 30px ${R.color}55` },
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
  else if (item.kind === 'ship') { c.scale(0.9, 0.9); SHIP_FX[item.ship].draw(c, t, SHIP_BY_ID[item.ship].color, SHIP_BY_ID[item.ship].color2); }
  else if (item.kind === 'drone' || item.kind === 'dmodule') { c.scale(1.4, 1.4); drawDroneIcon(c, item.drone, t); }
  else if (item.kind === 'awaken') ICONS.nova(c, 15);
  else { c.rotate(t); c.fillStyle = '#ffffff'; c.strokeStyle = item.stat === 'dmg' ? '#ff4f6e' : item.stat === 'rate' ? '#38f2ff' : '#ffd23f'; c.lineWidth = 2.5; c.beginPath(); for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; c.lineTo(Math.cos(a) * 13, Math.sin(a) * 13); } c.closePath(); c.fill(); c.stroke(); c.fillStyle = c.strokeStyle; c.beginPath(); c.arc(0, 0, 5, 0, TAU); c.fill(); }
}

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
        if (seg !== st.last) { st.last = seg; sfx.wheelTick(1 + (1 - k) * 0.3); }
        if (k >= 1) { st.spinning = false; st.done && st.done(); }
      }
      const R = Math.min(r.w, r.h) * 0.4;
      drawWheel(r.x + r.w / 2, r.y + r.h / 2, R, WHEEL, -st.ang, t, (i, c) => {
        const s = WHEEL[i];
        const k = s.label.startsWith('Pièces') ? 'coins' : s.label.startsWith('Cristaux') ? 'crystals' : s.label === 'Composants' ? 'parts' : s.label === 'Gemmes' ? 'gems' : s.label === 'Boost' ? 'boost_power' : s.label === 'Coffre Néon' ? 'chest_neon' : s.label === 'Coffre Prisme' ? 'chest_prism' : 'nova';
        ICONS[k](c, R * 0.085);
        c.font = `800 ${R * 0.07}px "Avenir Next Condensed",system-ui,sans-serif`; c.textAlign = 'center'; c.fillStyle = '#ffffff';
        c.fillText(s.label, 0, R * 0.17);
      });
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
    return h('div', null, topbar('Roue de la fortune'), stage,
      h('p', { class: 'muted center small' }, `Un tour gratuit par jour, puis jusqu’à 3 tours payés en pièces. Tours payés aujourd’hui : ${S.wheel.paid}/3`), b);
  },
});

// ================= MISSIONS =================
let missionTab = 'daily';
register('missions', {
  build() {
    const tabs = h('div', { class: 'tabs', style: 'margin:4px 0 8px' },
      ...[['daily', 'Missions'], ['stars', 'Étoiles']].map(([k, l]) => h('button', { class: 'tab' + (missionTab === k ? ' on' : ''), onclick: () => { missionTab = k; sfx.ui(); refresh(); } }, l)));
    const out = [];
    if (missionTab === 'daily') {
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
    return h('div', null, topbar('Missions'), tabs, h('div', { class: 'scroll' }, out));
  },
});

// ================= SUCCÈS =================
register('achievements', {
  build() {
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
    return h('div', null, topbar('Succès'), h('div', { class: 'scroll' }, list));
  },
});

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
        h('p', { class: 'muted small' }, 'Sur iPhone, le bouton silencieux peut couper le son du jeu.')),
      h('div', { class: 'subtitle' }, 'Contrôles'),
      h('div', { class: 'panel' },
        h('div', { class: 'setting' }, h('div', { class: 'lab' }, 'Mode', h('small', null, 'Direct : le vaisseau suit le doigt. Relatif : il reproduit le glissement.')), seg([['direct', 'Direct'], ['relative', 'Relatif']], s.control, (v) => { s.control = v; saveSoon(); })),
        h('div', { class: 'setting' }, h('div', { class: 'lab' }, 'Décalage du doigt', h('small', null, 'Distance entre le doigt et le vaisseau')), seg([[0, '0'], [1, 'S'], [2, 'M'], [3, 'L']], s.offset, (v) => { s.offset = v; saveSoon(); })),
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
