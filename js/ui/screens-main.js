// Écrans principaux : titre, accueil, carte, monde, fiche de niveau, résultats, pause, seconde chance, cadeau du jour
import { h, btn, iconBtn, register, go, back, show, refresh, widget, modal, curBar, curIcon, costEl, rewardRow, rewardPopup, flyRewards, toast, setMenuWorld, ui, clearScreens } from './ui.js';
import { SVG } from './icons.js';
import { drawLogo, planetCanvas } from './art-ui.js';
import { drawTitleScene, drawHangar, buildLogo } from './title.js';
import { app } from '../app.js';
import { S, saveSoon } from '../economy/save.js';
import { DIFFS, BOOSTS, SHIP_BY_ID, CUR } from '../economy/data.js';
import { levelStars, worldStars, diffUnlocked, powerRating, recommendedPower, xpNeeded, starRewardsAvailable, canPay, pay, bundleEntries } from '../economy/economy.js';
import { calendarIndex, calendarReward, claimDaily, missionsBadge, weekBonus } from '../economy/daily.js';
import { achBadge } from '../economy/achievements.js';
import { wheelCost } from '../economy/gacha.js';
import { WORLDS } from '../levels/worlds.js';
import { levelInfo, KIND_NAMES, TRAITS, CHALLENGES, WEEKLY, weekIndex } from '../levels/generator.js';
import { dayNumber } from '../engine/math.js';
import { TICKER } from '../game/radio.js';
import { SHIP_FX } from '../game/ships.js';
import { ctx, setT, baseT, view } from '../engine/renderer.js';
import { glow } from '../engine/sprites.js';
import { iconURL } from '../game/art.js';
import { fmt, TAU } from '../engine/math.js';
import { sfx } from '../audio/sfx.js';
import { music } from '../audio/music.js';
import { ensureAudio } from '../audio/audio.js';

const curWorld = () => Math.floor((Math.min(320, S.maxLevel) - 1) / 10);
function starsHtml(n, max = 3) { let s = ''; for (let i = 0; i < max; i++) s += i < n ? '★' : '<i>★</i>'; return s; }
function topbar(title, extra) {
  return h('div', { class: 'topbar' }, iconBtn(SVG.back, back, 'Retour'), h('div', { class: 'title' }, title), extra || curBar());
}
function ticker() {
  const el = h('div', { class: 'ticker' });
  const sp = h('span', { html: TICKER.slice().sort(() => Math.random() - 0.5).join('   ✦   ') });
  el.append(sp);
  let x = 380;
  const step = () => { if (!el.isConnected) return; x -= 0.6; if (x < -sp.offsetWidth) x = el.offsetWidth; sp.style.transform = `translateX(${x}px)`; requestAnimationFrame(step); };
  requestAnimationFrame(step);
  return el;
}

// ================= TITRE =================
register('title', {
  build() {
    const el = h('div', { class: 'title-screen' });
    const scene = h('div', { style: 'position:absolute;inset:0;pointer-events:none' });
    el.append(scene,
      h('div', { class: 'title-top' }, h('div', null, '1UP', h('b', null, String(S.best || 0).padStart(8, '0'))), h('div', { class: 'r' }, 'HI-SCORE', h('b', null, String(Math.max(S.best || 0, 100000)).padStart(8, '0')))),
      h('div', { class: 'freeplay' }, 'FREE PLAY · CRÉDITS ∞'),
      h('div', { class: 'tap arcade-tap' }, h('span', { class: 'chev' }, '▶'), 'Touche pour jouer', h('span', { class: 'chev r' }, '◀')),
      h('div', { class: 'title-feats' }, '320 niveaux', h('i', null, '✦'), '10 vaisseaux', h('i', null, '✦'), '7 colosses'),
      h('div', { class: 'ver' }, 'v' + app.version + ' · sans pub · sans achat'));
    drawTitleScene.slammed = false;
    widget(scene, (r, t) => drawTitleScene(r, t, S.ship));
    el.addEventListener('click', () => { ensureAudio(); sfx.open(); music.play('menu'); go('hub', {}, false); });
    return el;
  },
  enter() { music.play('title'); setMenuWorld(0); },
});

// ================= ACCUEIL =================
register('hub', {
  build() {
    setMenuWorld(curWorld());
    const W = WORLDS[curWorld()];
    const xpk = S.pilot.xp / xpNeeded(S.pilot.lvl);
    const pilot = h('div', { class: 'pilot' }, h('div', { class: 'lvl' }, h('b', null, S.pilot.lvl), h('small', null, 'PILOTE')),
      h('div', { style: 'width:70px' }, h('div', { class: 'bar' }, h('i', { style: `width:${Math.round(xpk * 100)}%` }))));
    const top = h('div', { class: 'topbar' }, pilot, curBar(['coins', 'crystals', 'gems']), iconBtn(SVG.gear, () => go('settings'), 'Réglages'));
    const hero = h('div', { class: 'hero' });
    const planet = h('div', { style: 'position:absolute;left:0;right:0;top:0;bottom:40%;pointer-events:none' });
    widget(planet, (r, t) => drawHangar(r, t, S.ship, W));
    const SD = SHIP_BY_ID[S.ship];
    const showcase = h('button', { class: 'showcase', onclick: () => { sfx.ui(); go('hangar'); } },
      h('b', { style: `color:${SD.color}` }, SD.name), h('span', { class: 'pw' }, h('i', { html: SVG.bolt || '⚡' }), 'Puissance ', h('strong', null, fmt(powerRating()))));
    const L = Math.min(320, S.maxLevel);
    const info = levelInfo(L);
    hero.append(planet, showcase,
      h('div', { class: 'wname' }, `Monde ${W.w + 1} · ${info.code}`),
      h('div', { class: 'wtitle', style: `color:${W.pal.neb2}` }, W.name),
      btn(SVG.play.replace('<svg', '<svg style="width:22px;height:22px"') + ` JOUER ${info.code}`, 'primary big pulse', () => levelSheet(L)),
      h('div', { class: 'row', style: 'gap:8px;margin-top:10px;justify-content:center' },
        h('button', { class: 'btn ghost small', onclick: () => { sfx.ui(); go('map'); } }, h('span', { html: SVG.map, style: 'width:16px;display:inline-flex' }), 'Carte', starRewardsAvailable() ? h('span', { class: 'badge', style: 'position:static;margin-left:4px' }, '★') : null),
        h('button', { class: 'btn ghost small', onclick: () => { sfx.ui(); go('modes'); } }, '🎮 Modes'),
        h('button', { class: 'btn ghost small', onclick: () => { sfx.ui(); go('trophies'); } }, '🏆 Trophées')));
    const badge = (n) => (n > 0 ? h('div', { class: 'badge' }, n) : null);
    const wc = wheelCost();
    const big = [
      ['ship', 'Hangar', 'Vaisseaux · Drones · Améliorations', '#ff4fd8', () => go('hangar'), 0],
      ['chest', 'Trésors', 'Coffres · Roue de la fortune', '#ffd23f', () => go('chests'), (S.freeChests || []).length + (wc === null ? 1 : 0)],
      ['target', 'Quêtes', 'Cadeau · Missions · Succès', '#47ffa3', () => go('missions'), missionsBadge() + (S.daily.pending ? 1 : 0) + achBadge() + starRewardsAvailable()],
    ].map(([ic, label, sub, col, fn, n]) => h('button', { class: 'bigtile', style: `--c:${col}`, onclick: () => { sfx.ui(); fn(); } }, h('span', { class: 'bi', html: SVG[ic] }), h('b', null, label), h('small', null, sub), badge(n)));
    const el = h('div', null, top, hero, h('div', { class: 'bigtiles' }, big), ticker());
    return el;
  },
  enter() {
    music.play('menu');
    if (S.daily.pending) setTimeout(() => { if (ui.current === 'hub' && S.daily.pending) dailyPopup(); }, 450);
  },
});

// ================= CADEAU DU JOUR =================
export function dailyPopup() {
  const idx = calendarIndex();
  const grid = h('div', { class: 'calendar' });
  for (let i = 0; i < 7; i++) {
    const b = calendarReward(i, true);
    const e = bundleEntries(b)[0];
    let icon = e.type === 'cur' ? iconURL(e.id, 64) : e.type === 'chest' ? iconURL('chest_' + e.id, 64) : iconURL('nova', 64);
    let amt = e.type === 'cur' ? fmt(e.n) : e.type === 'chest' ? 'Coffre' : '';
    if (i === 6) amt = 'Coffre + surprise';
    const st = i < idx || (i === idx && !S.daily.pending) ? ' got' : i === idx ? ' today' : '';
    grid.append(h('div', { class: 'day' + st + (i === 6 ? ' big' : '') }, h('div', { class: 'dn' }, 'JOUR ' + (i + 1)), h('img', { src: icon }), h('div', { class: 'amt' }, amt)));
  }
  let m;
  const claim = btn(S.daily.pending ? 'Récupérer' : 'Déjà récupéré', 'gold big wide' + (S.daily.pending ? '' : ' off'), () => {
    const b = claimDaily();
    if (!b) return;
    flyRewards(claim, b);
    sfx.levelUp();
    m.close();
    rewardPopup('Cadeau du jour', b, () => refresh(), `Série : ${S.daily.streak} jour(s) de suite`);
  });
  const wb = weekBonus();
  m = modal([h('h2', { class: 'gold-t' }, 'Cadeau du jour'),
    h('p', { class: 'center muted' }, `Série de connexion : ${S.daily.streak} jour(s)` + (wb ? ` · bonus de fidélité +${wb * 25} %` : '') + '. Revenez demain pour de meilleurs cadeaux !'),
    grid, h('div', { style: 'height:12px' }), claim]);
}

// ================= CARTE =================
register('map', {
  build() {
    const list = h('div', { class: 'worlds' });
    const cw = curWorld();
    for (const W of WORLDS) {
      const locked = W.w * 10 + 1 > S.maxLevel;
      const stars = worldStars(W.w);
      const lit = levelStars(W.w * 10 + 10).some((x) => x > 0);
      const cv = planetCanvas(W, 84, lit);
      const img = h('canvas', { width: cv.width, height: cv.height });
      img.getContext('2d').drawImage(cv, 0, 0);
      const card = h('div', { class: 'wcard' + (locked ? ' locked' : '') + (W.w === cw ? ' current' : ''), onclick: () => { if (locked) { sfx.deny(); toast('Monde verrouillé', `Terminez le monde ${W.w} pour l’atteindre.`, SVG.lock, '#9aa0d8'); return; } sfx.open(); go('world', { w: W.w }); } },
        img, h('div', { class: 'info' }, h('div', { class: 'wn' }, `Monde ${W.w + 1} · ${W.type === 'planet' ? 'Planète' : 'Espace'}`), h('div', { class: 'wt', style: `color:${W.pal.neb2}` }, W.name),
          h('div', { class: 'ws' }, `★ ${stars} / 90`), lit ? h('div', { class: 'relit' }, '✦ Étoile rallumée') : h('div', { class: 'muted small' }, W.lore)),
        locked ? h('div', { class: 'lockico', html: SVG.lock, style: 'width:22px;height:22px' }) : null);
      list.append(card);
    }
    const n = starRewardsAvailable();
    const el = h('div', null, topbar('Carte stellaire'), h('div', { class: 'scroll' }, list));
    return el;
  },
  enter(p, el) {
    const cur = el.querySelector('.wcard.current');
    if (cur) setTimeout(() => cur.scrollIntoView({ block: 'center' }), 30);
  },
});

// ================= MONDE (niveaux) =================
register('world', {
  build({ w }) {
    const W = WORLDS[w];
    setMenuWorld(w);
    const wrap = h('div', { class: 'lvlmap' });
    const pts = [];
    const H = 10 * 86 + 60;
    wrap.style.height = H + 'px';
    for (let i = 0; i < 10; i++) {
      const L = w * 10 + i + 1;
      const info = levelInfo(L);
      const y = H - 60 - i * 86;
      const xp = 50 + Math.sin(i * 1.1 + w) * 28;
      pts.push([xp, y]);
      const st = levelStars(L);
      const locked = L > S.maxLevel;
      const kindCls = { boss: 'boss', miniboss: 'mini', coins: 'bonus', bonus: 'bonus', challenge: 'challenge' }[info.kind] || '';
      const node = h('button', { class: `node ${kindCls}${locked ? ' locked' : ''}${L === S.maxLevel ? ' next' : ''}`, style: `left:${xp}%;top:${y}px`, onclick: () => { if (locked) { sfx.deny(); return; } sfx.open(); levelSheet(L); } },
        info.kind === 'boss' ? '☠' : i + 1,
        info.kind !== 'normal' ? h('div', { class: 'kind' }, info.kind === 'boss' ? 'COLOSSE' : info.kind === 'miniboss' ? 'GARDIEN' : info.kind === 'challenge' ? 'DÉFI' : 'BONUS') : null,
        h('div', { class: 'st', html: starsHtml(Math.max(...st)) }),
        h('div', { class: 'crowns' }, ...[0, 1, 2].filter((d) => st[d] > 0 && d > 0).map((d) => h('b', { style: `background:${DIFFS[d].color};color:${DIFFS[d].color}` }))));
      wrap.append(node);
    }
    const pathC = h('canvas', { class: 'path' });
    wrap.prepend(pathC);
    requestAnimationFrame(() => {
      const wd = wrap.clientWidth;
      pathC.width = wd * 2; pathC.height = H * 2; pathC.style.width = wd + 'px'; pathC.style.height = H + 'px';
      const g = pathC.getContext('2d'); g.scale(2, 2);
      g.lineCap = 'round';
      for (const [lw, col] of [[14, 'rgba(120,90,255,0.15)'], [4, W.pal.neb2], [1.5, '#ffffff']]) {
        g.strokeStyle = col; g.lineWidth = lw; g.setLineDash(lw < 3 ? [2, 10] : []);
        g.beginPath(); pts.forEach(([x, y], i) => { const X = (x / 100) * wd; if (i) { const [px, py] = pts[i - 1]; g.quadraticCurveTo((px / 100) * wd, (py + y) / 2, X, y); } else g.moveTo(X, y); }); g.stroke();
      }
    });
    const el = h('div', null, topbar(W.name), h('div', { class: 'muted center', style: 'margin:2px 0 4px' }, `Monde ${w + 1} · ★ ${worldStars(w)} / 90 · ${W.lore}`), h('div', { class: 'scroll' }, wrap));
    return el;
  },
  enter(p, el) {
    const sc = el.querySelector('.scroll');
    const nx = el.querySelector('.node.next');
    setTimeout(() => { if (nx) nx.scrollIntoView({ block: 'center' }); else sc.scrollTop = sc.scrollHeight; }, 30);
  },
});

// ================= FICHE DE NIVEAU =================
export function levelSheet(L) {
  const info = levelInfo(L);
  const st = levelStars(L);
  let diff = Math.min(S.lastDiff || 0, 2);
  while (diff > 0 && !diffUnlocked(L, diff)) diff--;
  const boosts = { nova: false, shield: false, power: false };
  let m;
  const body = h('div');
  const render = () => {
    body.innerHTML = '';
    const tabs = h('div', { class: 'tabs' }, ...DIFFS.map((d) => {
      const ok = diffUnlocked(L, d.id);
      return h('button', { class: `tab d${d.id}${diff === d.id ? ' on' : ''}${ok ? '' : ' locked'}`, onclick: () => { if (!ok) { sfx.deny(); toast('Difficulté verrouillée', `Terminez d’abord ce niveau en ${DIFFS[d.id - 1].name}.`, SVG.lock, '#9aa0d8'); return; } sfx.ui(); diff = d.id; render(); } },
        (ok ? '' : '🔒 ') + d.name, h('div', { style: 'font-size:10px;color:#ffd23f;letter-spacing:0', html: starsHtml(st[d.id]) }));
    }));
    let desc = { normal: 'Repoussez les vagues de la Nuée.', coins: 'Aucun danger : ramassez un maximum de pièces !', bonus: 'Faites éclater les astéroïdes riches en cristaux.', miniboss: `Un gardien de la Nuée : ${info.boss}.`, boss: `Le colosse du monde : ${info.boss}. Détruisez ses parties une à une.`, challenge: '' }[info.kind];
    if (info.kind === 'challenge') desc = CHALLENGES[info.challenge].name + ' — ' + CHALLENGES[info.challenge].desc;
    const trait = info.trait ? h('p', { class: 'center', style: 'color:#ffd23f' }, `Trait : ${TRAITS[info.trait].name} — ${TRAITS[info.trait].desc}`) : null;
    const pw = powerRating('etincelle'), rec = recommendedPower(L, diff);
    const pcol = pw >= rec ? '#47ffa3' : pw >= rec * 0.75 ? '#ffd23f' : '#ff4f6e';
    const dm = DIFFS[diff].mul;
    const first = st[diff] === 0;
    const rw = { coins: Math.round((50 + 4 * L) * dm * (first ? 2 : 1) + 60 + 6 * L), crystals: Math.round((2 + L / 30) * [1, 2.5, 5][diff]) + (first ? [3, 6, 12][diff] : 0) };
    const gemsN = info.kind === 'boss' ? (first ? [3, 6, 12][diff] : [0, 1, 2][diff]) : info.kind === 'miniboss' ? (first ? [1, 3, 6][diff] : 0) : first ? [0, 1, 3][diff] : 0;
    if (gemsN) rw.gems = gemsN;
    const partsN = info.kind === 'boss' ? [3, 6, 10][diff] : info.kind === 'miniboss' ? [1, 3, 5][diff] : diff === 2 ? 2 : 0;
    if (partsN) rw.parts = partsN;
    if ((info.kind === 'boss' || info.kind === 'miniboss') && first) rw.chest = 'boss';
    const boostRow = h('div', { class: 'boostgrid' });
    // boosts de départ : utilisables s'ils sont en stock, sinon achetables (pièces / cristaux)
    const BCOST = { power: { coins: 400 + 15 * L }, shield: { coins: 300 + 10 * L }, nova: { crystals: 15 + Math.floor(L / 8) } };
    for (const k of Object.keys(BOOSTS)) {
      const n = S.boosts[k] || 0;
      const on = !!boosts[k];
      const b = h('button', { class: 'boostcard' + (on ? ' on' : ''), style: `--c:${BOOSTS[k].color}`, onclick: () => {
        sfx.ui();
        if (on) { boosts[k] = false; render(); return; }
        if (n > 0) { boosts[k] = true; render(); return; }
        if (pay(BCOST[k])) { S.boosts[k] = (S.boosts[k] || 0) + 1; boosts[k] = true; sfx.buy(); saveSoon(); render(); }
        else toast('Ressources insuffisantes', 'Gagne des pièces et des cristaux en jouant !', SVG.lock, '#ff4f6e');
      } }, h('img', { src: iconURL('boost_' + k, 64) }), h('b', null, BOOSTS[k].name), h('small', null, BOOSTS[k].desc),
        on ? h('em', { class: 'on' }, '✓ ACTIVÉ') : n > 0 ? h('em', null, `En stock : ${n}`) : h('em', null, costEl(BCOST[k])));
      boostRow.append(b);
    }
    const ship = SHIP_BY_ID[S.ship];
    body.append(...[
      h('div', { class: 'muted center', style: 'letter-spacing:.2em;font-weight:800;font-size:12px' }, `SECTEUR ${info.code} · ${info.kindName.toUpperCase()}`),
      h('h2', { style: `color:${info.world.pal.neb2}` }, info.name),
      h('p', { class: 'center' }, desc), trait,
      tabs,
      h('div', { class: 'subtitle' }, first ? 'Récompenses (premier passage ×2)' : 'Récompenses'),
      rewardRow(rw),
      h('div', { class: 'row', style: 'justify-content:center;margin:12px 0 4px;font-weight:800' }, h('span', null, 'Puissance '), h('span', { style: `color:${pcol}` }, fmt(pw)), h('span', { class: 'muted', style: 'margin-left:6px' }, `/ recommandée ${fmt(rec)}`)),
      pw < rec * 0.75 ? h('p', { class: 'center small', style: 'color:#ffb0c0' }, 'Conseil : améliorez votre vaisseau au Hangar ou à l’Atelier.') : null,
      h('div', null, h('div', { class: 'subtitle' }, 'Boosts de départ'), boostRow),
      h('div', { class: 'row', style: 'margin-top:14px' },
        btn('Hangar', 'ghost', () => { m.close(); go('hangar'); }),
        h('div', { class: 'spacer' }),
        btn('DÉCOLLER', 'primary big', () => {
          S.lastDiff = diff;
          for (const k in boosts) if (boosts[k]) S.boosts[k]--;
          saveSoon();
          m.close();
          app.startLevel(L, diff, boosts);
        })),
    ].filter(Boolean));
  };
  render();
  m = modal(body, { bottom: true });
}

// ================= PAUSE =================
export function pauseMenu(game) {
  const s = S.settings;
  const tog = (k, label) => h('button', { class: 'btn ghost', onclick: (e) => { s[k].on = !s[k].on; saveSoon(); import('../audio/audio.js').then((A) => A.applyVolumes()); e.currentTarget.textContent = `${label} : ${s[k].on ? 'oui' : 'non'}`; } }, `${label} : ${s[k].on ? 'oui' : 'non'}`);
  let m;
  m = modal([h('h2', { class: 'cyan-t' }, 'Pause'),
    h('p', { class: 'center muted' }, `Secteur ${game.def.code} · ${game.def.name}`),
    h('div', { class: 'pause-menu', style: 'margin:10px auto 0' },
      btn('Reprendre', 'primary big', () => { m.close(); game.resume(); }),
      btn('Recommencer', '', () => { m.close(); app.restart(); }),
      tog('music', 'Musique'), tog('sfx', 'Bruitages'),
      btn('Quitter le niveau', 'ghost', () => { m.close(); game.paused = false; game.finish(false); }))], { dismiss: false });
}

// ================= MODES DE JEU =================
register('modes', {
  build() {
    const B = S.modeBest || {}, Lm = S.maxLevel;
    const wk = weekIndex(dayNumber()), ev = WEEKLY[wk % WEEKLY.length];
    const daysLeft = 7 - ((dayNumber() + 3) % 7);
    const card = (id, title, sub, desc, rec, req, art, col, extra) => {
      const locked = Lm < req;
      const cv = h('div', { class: 'mode-art' });
      widget(cv, (r, t) => art(r, t));
      return h('div', { class: 'mode-card' + (locked ? ' locked' : ''), style: `--c:${col}` },
        cv, h('div', { class: 'mode-body' }, h('b', null, title), h('small', null, sub), h('p', null, desc), rec ? h('div', { class: 'mode-rec' }, rec) : null, extra || null,
          locked ? h('div', { class: 'muted small' }, `Débloqué au niveau ${req}`) : btn('JOUER', 'primary', () => { sfx.open(); app.startMode(id); })));
    };
    const warp = (r, t) => {
      const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 40; i++) { const a = i * 2.39996, z = ((t * 0.35 + i / 40) % 1), d = z * z * r.w * 0.7; ctx.strokeStyle = i % 3 ? '#38f2ff' : '#ff4fd8'; ctx.globalAlpha = z; ctx.lineWidth = 0.5 + z * 1.5; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * d * 0.7, cy + Math.sin(a) * d * 0.7); ctx.lineTo(cx + Math.cos(a) * d, cy + Math.sin(a) * d); ctx.stroke(); }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.beginPath();
      for (let i = 0; i <= 60; i++) { const u = (i / 60) * TAU, s2 = 1 + Math.sin(u) ** 2; const x = cx + (Math.cos(u) / s2) * r.w * 0.28, y = cy + (Math.sin(u) * Math.cos(u) / s2) * r.w * 0.28; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
      ctx.stroke(); ctx.strokeStyle = '#38f2ff'; ctx.lineWidth = 7; ctx.globalAlpha = 0.35 + 0.2 * Math.sin(t * 3); ctx.stroke(); ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    };
    const rush = (r, t) => {
      const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
      ctx.globalCompositeOperation = 'lighter';
      const g = glow('#ff3f6e', 32); ctx.globalAlpha = 0.6; ctx.drawImage(g.c, cx - 70, cy - 60, 140, 120); ctx.globalAlpha = 1;
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i / 5) * TAU + t * 0.4, x = cx + Math.cos(a) * 34, y = cy + Math.sin(a) * 26;
        const on = Math.floor(t * 2) % 5 === i;
        ctx.fillStyle = on ? '#ffd23f' : '#ff3f6e'; ctx.globalAlpha = on ? 1 : 0.7;
        ctx.beginPath(); ctx.arc(x, y, on ? 11 : 9, 0, TAU); ctx.fill();
        ctx.fillStyle = '#1a0006'; ctx.globalAlpha = 1; ctx.beginPath(); ctx.ellipse(x - 3, y - 1, 2, 3, 0, 0, TAU); ctx.ellipse(x + 3, y - 1, 2, 3, 0, 0, TAU); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.font = '900 13px "Avenir Next Condensed",system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ffffff'; ctx.fillText('×5', cx, cy);
    };
    const weekly = (r, t) => {
      const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU + t * 0.3; ctx.fillStyle = 'rgba(255,210,63,0.16)'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r.w * 0.6, a - 0.09, a + 0.09); ctx.closePath(); ctx.fill(); }
      ctx.globalCompositeOperation = 'source-over';
      ctx.font = '40px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(ev.icon, cx, cy + Math.sin(t * 2) * 3);
    };
    const weeklyDone = S.weekly && S.weekly.wk === wk;
    return h('div', null, topbar('Modes de jeu'), h('div', { class: 'scroll' },
      card('weekly', 'ÉVÉNEMENT : ' + ev.name.toUpperCase(), `Se termine dans ${daysLeft} j`, ev.desc, weeklyDone ? '✓ Récompense de la semaine obtenue' : 'Récompense : Coffre Astral + 10 gemmes', 4, weekly, '#ffd23f'),
      card('endless', 'SURVIE INFINIE', 'Vagues sans fin', 'Les vagues ne s’arrêtent jamais et deviennent de plus en plus coriaces. Pas de seconde chance : tiens le plus longtemps possible !', B.endless ? `Record : vague ${B.endless.n} · ${String(B.endless.score).padStart(8, '0')}` : 'Aucun record', 6, warp, '#38f2ff'),
      card('rush', 'RUÉE DES COLOSSES', '5 boss à la suite', 'Cinq colosses s’enchaînent, du plus faible au plus terrible. Bats-les tous pour un coffre astral.', B.rush ? `Record : ${B.rush.n} / 5 colosses` : 'Aucun record', 11, rush, '#ff3f6e')));
  },
  enter() { music.play('menu'); },
});

// ================= BRIEFING DES DÉFIS (le jeu attend que le joueur ait lu) =================
export function briefingMenu(game) {
  const d = game.def;
  if (d.kind !== 'challenge') return;
  const C = CHALLENGES[d.challenge];
  game.paused = true;
  const icon = { survive: '⚡', glass: '💎', hunt: '🎯', time: '⏱' }[d.challenge] || '★';
  let m;
  m = modal([
    h('div', { class: 'brief-ico' }, icon),
    h('h2', { class: 'gold-t', style: 'margin:4px 0' }, 'DÉFI : ' + C.name.toUpperCase()),
    h('p', { class: 'center', style: 'font-size:15px;line-height:1.4;margin:6px 0 10px' }, C.desc),
    d.noWeapons ? h('div', { class: 'brief-warn' }, 'Ce n’est pas un bug : dans ce niveau, ton vaisseau ne tire pas.') : null,
    btn('C’est parti !', 'primary big wide', () => { m.close(); game.paused = false; }),
  ].filter(Boolean), { dismiss: false });
}

// ================= SECONDE CHANCE =================
export function continueMenu(game) {
  const n = game.revives;
  const cost = n === 0 ? { crystals: 10 + Math.floor(game.def.L / 10) } : n === 1 ? { gems: 5 } : null;
  let m;
  const items = [h('h2', { class: 'pink-t cont-title' }, 'Continuer ?'), h('p', { class: 'center muted', style: 'margin:0 0 6px' }, 'Coque détruite ! Tes trouvailles sont conservées.')];
  if (cost) {
    const k = cost.crystals ? 'crystals' : 'gems', amount = cost[k], C = CUR[k], have = S.cur[k] || 0, ok = canPay(cost);
    // prix en très grand : icône de la monnaie + montant + nom
    items.push(h('div', { class: 'cont-price', style: `--c:${C.color}` },
      h('img', { src: iconURL(k, 128), alt: C.name }),
      h('div', null, h('b', null, '× ' + amount), h('span', null, amount > 1 ? C.name : C.one)),
    ));
    items.push(h('div', { class: 'cont-have' + (ok ? '' : ' low') }, `Tu as ${fmt(have)} ${have > 1 ? C.name.toLowerCase() : C.one}`));
    const ring = h('div', { class: 'cont-ring' }, h('b', null, '10'));
    items.splice(1, 0, ring);
    let left = 10;
    const tick = setInterval(() => { if (!ring.isConnected) { clearInterval(tick); return; } left--; ring.firstChild.textContent = String(Math.max(0, left)); ring.classList.remove('beat'); void ring.offsetWidth; ring.classList.add('beat'); if (left <= 0) clearInterval(tick); }, 1000);
    const b = btn(h('span', { class: 'cont-btn' }, 'Repartir pour ', h('img', { src: iconURL(k, 64), alt: '' }), h('b', null, String(amount))), 'green big wide' + (ok ? '' : ' cant'),
      () => { if (!pay(cost)) return; clearInterval(tick); m.close(); game.revive(); }, { onDeny: () => toast('Pas assez de ' + C.name.toLowerCase(), 'Gagnes-en en jouant !', SVG.lock, '#ff4f6e') });
    items.push(b);
  } else items.push(h('p', { class: 'center' }, 'Plus de seconde chance pour ce niveau.'));
  items.push(h('div', { style: 'height:8px' }), btn('Abandonner', 'ghost wide', () => { m.close(); game.finish(false); }));
  m = modal(items, { dismiss: false, cls: 'cont-modal' });
}

// ================= RÉSULTATS =================
register('results', {
  build(R) {
    const win = R.victory;
    const el = h('div', { class: 'results', style: 'justify-content:flex-start;overflow-y:auto;padding-top:10px' });
    const stars = h('div', { class: 'stars' }, ...[0, 1, 2].map((i) => h('div', { class: 'star' + (i === 1 ? ' s2' : ''), html: SVG.star })));
    const lines = h('div', { class: 'panel' });
    const add = (label, cur, n, cls = '') => {
      if (!n) return;
      const v = h('span', { class: 'v ' + cls }, cur ? curIcon(cur) : null, h('b', null, '0'));
      lines.append(h('div', { class: 'rline' }, h('span', null, label), v));
      R.anims.push({ el: v.querySelector('b'), n });
    };
    R.anims = [];
    add('Pièces ramassées', 'coins', R.got.coins);
    add('Prime de victoire', 'coins', R.bonus.coins);
    add('Cristaux', 'crystals', R.got.crystals + (R.bonus.crystals || 0));
    add('Gemmes', 'gems', R.got.gems + (R.bonus.gems || 0));
    add('Composants', 'parts', R.got.parts + (R.bonus.parts || 0));
    if (R.newStarCrystals) add('Nouvelles étoiles', 'crystals', R.newStarCrystals);
    if (R.shardsN) {
      const v = h('span', { class: 'v' }, h('img', { src: iconURL('shard_' + R.shardShip, 48), class: 'ic', style: 'width:20px;height:20px;vertical-align:-5px' }), h('b', null, '0'));
      lines.append(h('div', { class: 'rline' }, h('span', null, 'Éclats ' + SHIP_BY_ID[R.shardShip].name), v));
      R.anims.push({ el: v.querySelector('b'), n: R.shardsN });
    }
    const xpb = h('div', { class: 'bar' }, h('i', { style: `width:${Math.round(R.xpFrom * 100)}%` }));
    const statsLine = h('div', { class: 'muted small center', style: 'margin-top:8px' }, `${R.stats.kills} aliens · chaîne max ${R.stats.maxChain} · ${R.stats.constellations} constellation(s)` + (R.stats.perfects ? ` · ${R.stats.perfects} PARFAIT` : ''));
    const next = Math.min(320, R.def.L + 1);
    const scoreB = h('b', null, '00000000');
    const scoreBox = h('div', { class: 'arc-score' }, h('div', { class: 'arc-lab' }, 'SCORE'), scoreB,
      h('div', { class: 'arc-hi' }, R.record ? h('span', { class: 'newrec-badge' }, 'NEW RECORD !') : `RECORD ${String(R.prevHi || 0).padStart(8, '0')}`),
      R.rank ? h('div', { class: 'rank rank-' + R.rank }, R.rank) : null);
    R.scoreEl = scoreB;
    el.append(...[
      h('h1', { class: 'arc-title ' + (win ? 'win' : 'lose') }, R.def.mode === 'endless' ? 'GAME OVER' : win ? 'STAGE CLEAR' : 'GAME OVER'),
      h('div', { class: 'center', style: 'font-weight:800;margin-top:-4px' }, R.modeLine || (win ? (R.def.kind === 'boss' ? 'Étoile rallumée !' : 'Secteur nettoyé !') : 'Coque détruite')),
      h('div', { class: 'center muted' }, `Secteur ${R.def.code} · ${R.def.name} · ${DIFFS[R.def.diff].name}`),
      scoreBox,
      win ? stars : null,
      R.first && win ? h('div', { class: 'newrec' }, 'Premier passage — récompenses doublées !') : null,
      lines,
      R.chest ? h('div', { class: 'panel glow-gold center', style: 'margin-top:8px' }, h('img', { src: iconURL('chest_' + R.chest, 64), style: 'width:44px;vertical-align:middle' }), ' ', h('b', null, 'Coffre gagné ! '), h('span', { class: 'muted' }, 'À ouvrir dans Coffres')) : null,
      h('div', { class: 'panel', style: 'margin-top:8px' }, h('div', { class: 'row' }, h('b', null, `Pilote niv. ${R.lvlFrom}`), h('div', { class: 'spacer' }), h('span', { class: 'muted small' }, `+${R.xp} XP`)), xpb),
      statsLine,
      h('div', { class: 'row', style: 'margin-top:14px' },
        R.def.mode ? btn('Modes', 'ghost', () => go('modes', {}, false)) : btn('Carte', 'ghost', () => go('world', { w: R.def.w }, false)),
        btn('Rejouer', '', () => (R.def.mode ? app.startMode(R.def.mode) : app.startLevel(R.def.L, R.def.diff, {}))),
        h('div', { class: 'spacer' }),
        win && !R.def.mode && R.def.L < 320 ? btn('Suivant ▸', 'primary', () => { go('hub', {}, false); levelSheet(next); }) : btn('Accueil', 'primary', () => go('hub', {}, false))),
    ].filter(Boolean));
    R.starsEl = stars; R.xpEl = xpb.querySelector('i');
    return el;
  },
  enter(R) {
    music.play('menu');
    let t = 0;
    { const t0 = performance.now(); const step = (now) => { const k = Math.min(1, (now - t0) / 1400), v = Math.round(R.score * (1 - (1 - k) ** 3)); if (R.scoreEl) R.scoreEl.textContent = String(v).padStart(8, '0'); if (Math.random() < 0.6) sfx.tick(); if (k < 1 && R.scoreEl && R.scoreEl.isConnected) requestAnimationFrame(step); }; setTimeout(() => requestAnimationFrame(step), 200); }
    if (R.rank) setTimeout(() => { const r = document.querySelector('.rank'); if (r) { r.classList.add('on'); sfx.perfect ? sfx.perfect() : sfx.star(2); } }, 1700);
    R.anims.forEach((a, i) => setTimeout(() => {
      const t0 = performance.now();
      const step = (now) => { const k = Math.min(1, (now - t0) / 700); a.el.textContent = fmt(a.n * k); if (Math.random() < 0.5) sfx.tick(); if (k < 1 && a.el.isConnected) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    }, 300 + i * 260));
    if (R.victory) for (let i = 0; i < R.stars; i++) setTimeout(() => { const s = R.starsEl.children[i]; if (s) { s.classList.add('on'); sfx.star(i); } }, 500 + i * 380);
    setTimeout(() => { if (R.xpEl) R.xpEl.style.width = Math.round(R.xpTo * 100) + '%'; }, 900);
    let delay = 1600;
    for (const up of R.levelUps) { setTimeout(() => rewardPopup(`Pilote niveau ${up.lvl} !`, up.reward, null, 'Votre expérience paie !'), delay); delay += 400; }
  },
});

export { curWorld };
