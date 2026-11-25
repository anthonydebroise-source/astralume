// Point d'entrée : démarrage, boucle principale, enchaînement menus ⇄ niveaux, récompenses
import { initRenderer, ctx, view, cam, updateCam, trackFrame, setQuality, drawFlash } from './engine/renderer.js';
import { initInput, endFrameInput, resetInput } from './engine/input.js';
import { clearParticles, setParticleCap } from './engine/particles.js';
import { initAudioUnlock, setAudioSettings, ensureAudio } from './audio/audio.js';
import { sfx } from './audio/sfx.js';
import { music } from './audio/music.js';
import { load, S, save, saveSoon } from './economy/save.js';
import { give, grant, addXP, recordLevel, xpNeeded } from './economy/economy.js';
import { checkDaily, track } from './economy/daily.js';
import { checkAchievements } from './economy/achievements.js';
import { seasonGain } from './economy/season.js';
import { DIFFS, SHIPS } from './economy/data.js';
import { SHARD_COLORS } from './game/art.js';
for (const sh of SHIPS) SHARD_COLORS[sh.id] = sh.color;
import { buildLevel, buildEndless, buildBossRush, buildWeekly, buildDuel, weekIndex, WEEKLY } from './levels/generator.js';
import { Versus, encodeDuel, decodeDuel } from './net/ghost.js';
import { dayNumber } from './engine/math.js';
import { Game } from './game/game.js';
import { app } from './app.js';
import { ui, go, show, clearScreens, menuUpdate, menuDraw, initUINotifications } from './ui/ui.js';
import { pauseMenu, continueMenu, briefingMenu } from './ui/screens-main.js';
import './ui/screens-meta.js';
import './ui/screens-versus.js';

// ---------- Démarrage ----------
load();
initRenderer();
view.quality = S.settings.quality || 'auto';
cam.shakeOn = S.settings.shake !== false;
initInput();
initAudioUnlock();
setAudioSettings(S.settings);
initUINotifications();
checkDaily();
checkAchievements();

let last = performance.now();
let lastLevel = null;

app.startLevel = (L, diff, boosts = {}) => {
  ensureAudio();
  clearScreens();
  resetInput();
  clearParticles();
  const def = buildLevel(L, diff);
  // On décolle toujours avec Étincelle et sans drone : les autres arrivent en capsules
  const g = new Game(def, { ship: 'etincelle', drones: [], boosts });
  g.onEnd = (res) => endLevel(res);
  g.onDeath = (game) => continueMenu(game);
  g.onPause = () => pauseMenu(g);
  app.game = g;
  lastLevel = { L, diff };
  if (def.kind === 'challenge') setTimeout(() => { if (app.game === g) briefingMenu(g); }, 350);
};
// Modes spéciaux (survie infinie, ruée des colosses, événement de la semaine)
app.startMode = (mode) => {
  ensureAudio(); clearScreens(); resetInput(); clearParticles();
  const Lb = Math.min(320, S.maxLevel);
  const def = mode === 'endless' ? buildEndless(Lb) : mode === 'rush' ? buildBossRush(Lb) : buildWeekly(Lb, weekIndex(dayNumber()));
  const g = new Game(def, { ship: 'etincelle', drones: [], boosts: {} });
  g.onEnd = (res) => endLevel(res);
  g.onDeath = (game) => { if (def.mode === 'endless') setTimeout(() => game.finish(false), 900); else continueMenu(game); };
  g.onPause = () => pauseMenu(g);
  app.game = g;
  lastLevel = { mode };
};
// Multijoueur : duel fantôme (o.ghost = défi reçu) ou course en direct (o.live = liaison au relais)
app.startDuel = (o = {}) => {
  ensureAudio(); clearScreens(); resetInput(); clearParticles();
  const seed = (o.ghost && o.ghost.seed) || o.seed || ((Math.random() * 2147483646) >>> 0) + 1;
  const def = buildDuel(seed, o.live ? 'race' : 'duel');
  def.ghost = o.ghost || null;
  const g = new Game(def, { ship: 'etincelle', drones: [], boosts: {} });
  g.vs = new Versus({ record: !o.live, ghost: o.ghost, live: o.live });
  g.onEnd = (res) => endLevel(res);
  g.onDeath = (game) => setTimeout(() => game.finish(false), 900); // pas de seconde chance en duel
  g.onPause = () => pauseMenu(g);
  app.game = g;
  lastLevel = o.live ? { race: true } : { duel: { seed, ghost: o.ghost || null } };
};
app.pseudo = () => { if (!S.pseudo) { S.pseudo = 'Pilote' + (100 + Math.floor(Math.random() * 900)); saveSoon(); } return S.pseudo; };
app.restart = () => {
  if (!lastLevel) return;
  const g = app.game; if (g) g.quit();
  if (lastLevel.race) { app.game = null; clearParticles(); if (app.live) app.live.close(); go('versus', {}, false); return; }
  if (lastLevel.duel) app.startDuel(lastLevel.duel);
  else if (lastLevel.mode) app.startMode(lastLevel.mode); else app.startLevel(lastLevel.L, lastLevel.diff, {});
};
app.quitToMenu = () => { if (app.game) app.game.quit(); app.game = null; clearParticles(); go('hub', {}, false); };

function endMode(res) {
  const g = app.game, def = res.def, st = res.stats, victory = res.victory;
  const got = { coins: Math.round(st.coins), crystals: st.crystals, gems: st.gems, parts: st.parts };
  const bonus = { coins: 0, crystals: 0, gems: 0, parts: 0 };
  let chest = null, shardsN = 0, line = '';
  if (!S.modeBest) S.modeBest = {};
  const best = S.modeBest[def.mode] || { score: 0, n: 0 };
  let versus = null;
  if (def.mode === 'duel' || def.mode === 'race') {
    const score = Math.round(st.score || 0), me = { name: app.pseudo(), score, color: '#38f2ff', me: true };
    if (!S.duel) S.duel = { w: 0, l: 0, sent: 0 };
    if (def.mode === 'duel') {
      const gh = def.ghost;
      const rec = g.vs && g.vs.rec;
      const code = rec ? encodeDuel({ seed: def.duelSeed, name: me.name, ship: g.player.id, score, win: victory, xy: rec.xy, sc: rec.sc }) : null;
      if (gh) {
        const win = score > gh.score;
        if (win) { S.duel.w++; bonus.coins = 400; if (score >= 5000) bonus.gems = 2; } else { S.duel.l++; bonus.coins = 120; }
        line = win ? `VICTOIRE contre ${gh.name} !` : `${gh.name} garde l’avantage…`;
        versus = { kind: 'duel', win, rows: [me, { name: gh.name, score: gh.score, color: '#ff4fd8' }].sort((a, b) => b.score - a.score), code, rival: gh.name };
      } else {
        bonus.coins = 150;
        line = 'Ton défi est prêt : envoie-le à un ami !';
        versus = { kind: 'duel', win: null, rows: [me], code, rival: null };
      }
    } else {
      const L = app.live;
      if (L) L.sendEnd(score, victory);
      const rows = [me, ...(L ? [...L.peers.values()].map((p, i) => ({ name: p.name, score: p.score || 0, color: ['#ff4fd8', '#ffd23f', '#7dff9a'][i % 3], live: !p.done })) : [])].sort((a, b) => b.score - a.score);
      const rank = 1 + rows.filter((r) => !r.me && r.score > score).length;
      const tie = rows.some((r) => !r.me && r.score === score);
      const win = rows.length > 1 && rank === 1 && !tie;
      bonus.coins = score < 500 ? 50 : [0, 500, 300, 200, 150][rank] || 100;
      if (win && score >= 5000) bonus.gems = 3;
      line = rows.length > 1 ? `Classement : ${rank}${rank === 1 ? 'er' : 'e'}${tie ? ' ex æquo' : ''} sur ${rows.length}` : 'Course terminée';
      versus = { kind: 'race', win: rows.length > 1 ? win : null, rows, code: null };
    }
  } else if (def.mode === 'endless') {
    const w = g.waveN;
    bonus.coins = w * 40; bonus.crystals = Math.floor(w / 3) * 2; bonus.gems = Math.floor(w / 15); shardsN = Math.floor(w / 5) * 2;
    if (w >= 30) chest = 'prism';
    line = `Vague atteinte : ${w}` + (w > best.n ? ' · NOUVEAU RECORD !' : ` · record ${best.n}`);
    best.n = Math.max(best.n, w);
  } else if (def.mode === 'rush') {
    const k = g.rushKills;
    bonus.crystals = 12 * k; bonus.gems = 2 * k; shardsN = 4 * k; bonus.coins = 300 * k;
    if (k >= def.rush.length) chest = 'astral';
    line = `Colosses vaincus : ${k} / ${def.rush.length}`;
    best.n = Math.max(best.n, k);
  } else {
    const wk = weekIndex(dayNumber());
    if (!S.weekly) S.weekly = {};
    if (victory && S.weekly.wk !== wk) { S.weekly.wk = wk; chest = 'astral'; bonus.gems = 10; line = 'Événement terminé : coffre astral gagné !'; }
    else line = victory ? 'Événement déjà gagné cette semaine' : 'Retente ta chance !';
    bonus.coins = victory ? 500 : 0;
  }
  const score = Math.round(st.score || 0), prevHi = best.score, record = score > prevHi;
  best.score = Math.max(best.score, score);
  S.modeBest[def.mode] = best;
  S.best = Math.max(S.best || 0, score);
  const total = {};
  for (const k of ['coins', 'crystals', 'gems', 'parts']) total[k] = got[k] + bonus[k];
  if (chest) total.chest = chest;
  if (shardsN) total.shards = { [S.ship]: shardsN };
  grant(total);
  track('kills', st.kills); track('coins', got.coins);
  const seasonPts = seasonGain({ kills: st.kills, victory, score: st.score, boss: def.mode === 'rush' && g.rushKills > 0 });
  const xp = Math.round(20 + st.kills * 0.4);
  const lvlFrom = S.pilot.lvl, xpFrom = S.pilot.xp / xpNeeded(S.pilot.lvl);
  const levelUps = addXP(xp);
  const xpTo = S.pilot.lvl > lvlFrom ? 1 : S.pilot.xp / xpNeeded(S.pilot.lvl);
  checkAchievements(); save();
  app.game = null; clearParticles();
  show('results', { victory: def.mode === 'endless' ? true : victory, stars: 0, def, stats: st, got, bonus, first: false, chest, newStarCrystals: 0, shardsN, shardShip: S.ship, score, prevHi, record, rank: null, modeLine: line, versus, seasonPts, xp, lvlFrom, xpFrom, xpTo, levelUps });
}
function endLevel(res) {
  if (res.def.mode) { endMode(res); return; }
  const g = app.game;
  const def = res.def, st = res.stats, d = def.diff, L = def.L;
  const victory = res.victory;
  // 1) Ce qui a été ramassé est toujours conservé
  const got = { coins: Math.round(st.coins), crystals: st.crystals, gems: st.gems, parts: st.parts };
  // 2) Prime de victoire
  const bonus = { coins: 0, crystals: 0, gems: 0, parts: 0 };
  let first = false, chest = null, newStarCrystals = 0, rec = null;
  if (victory) {
    rec = recordLevel(L, d, res.stars);
    first = rec.first;
    const dm = DIFFS[d].mul;
    bonus.coins = Math.round((50 + 4 * L) * dm * (first ? 2 : 1) * (def.glass ? 1.5 : 1));
    bonus.crystals = Math.round((2 + L / 30) * [1, 2.5, 5][d]) + (first ? [3, 6, 12][d] : 0);
    if (def.kind === 'boss') bonus.gems = first ? [3, 6, 12][d] : [0, 1, 2][d];
    else if (def.kind === 'miniboss') bonus.gems = first ? [1, 3, 6][d] : 0;
    else bonus.gems = first ? [0, 1, 3][d] : d === 2 && Math.random() < 0.25 ? 1 : 0;
    bonus.parts = def.kind === 'boss' ? [3, 6, 10][d] : def.kind === 'miniboss' ? [1, 3, 5][d] : d === 2 ? 2 : d === 1 && Math.random() < 0.5 ? 1 : 0;
    if (def.kind === 'boss' || def.kind === 'miniboss') chest = first ? 'boss' : Math.random() < 0.3 ? 'neon' : null;
    newStarCrystals = rec.newStars * 10;
  }
  // éclats d'étoile du vaisseau utilisé (boss surtout)
  let shardsN = 0;
  if (victory) {
    if (def.kind === 'boss') shardsN = [6, 10, 16][d] * (first ? 2 : 1);
    else if (def.kind === 'miniboss') shardsN = [3, 5, 8][d] * (first ? 2 : 1);
    else if (first) shardsN = 2 + d;
    else if (Math.random() < 0.25 + 0.15 * d) shardsN = 1 + d;
  }
  const total = {};
  for (const k of ['coins', 'crystals', 'gems', 'parts']) total[k] = got[k] + bonus[k];
  if (shardsN) total.shards = { [S.ship]: shardsN };
  total.crystals += newStarCrystals;
  if (chest) total.chest = chest;
  grant(total);
  // Salle des trophées : colosses vaincus
  if (victory && (def.kind === 'boss' || def.kind === 'miniboss')) { if (!S.trophyBoss) S.trophyBoss = {}; const a = def.kind === 'boss' ? def.world.boss : def.world.mini; S.trophyBoss[a] = (S.trophyBoss[a] || 0) + 1; }
  // Score arcade : record du secteur, meilleur score, rang
  if (!S.hi) S.hi = {};
  const score = Math.round(st.score || 0), prevHi = S.hi[L] || 0;
  const record = score > prevHi && score > 0;
  if (record) S.hi[L] = score;
  S.best = Math.max(S.best || 0, score);
  const rank = victory ? (res.stars >= 3 && st.hullHits === 0 ? 'S' : res.stars >= 3 ? 'A' : res.stars >= 2 ? 'B' : 'C') : null;
  // 3) Statistiques, missions, succès
  track('kills', st.kills); track('coins', got.coins); track('crystals', got.crystals); track('gems', got.gems); track('parts', got.parts);
  const seasonPts = seasonGain({ kills: st.kills, victory, score: st.score, boss: victory && def.kind === 'boss' });
  track('specials', st.specials); track('perfects', st.perfects); track('constel', st.constellations);
  track('salvage', st.salvage); track('novas', st.novas); track('elites', st.elites);
  S.stats.time += Math.round(st.time);
  if (victory) {
    track('levels', 1);
    if (def.kind === 'boss' || def.kind === 'miniboss') track('bosses', 1);
    if (d >= 1) track('hard', 1);
    if (d === 2) track('night', 1);
    if (st.hullHits === 0) track('nohit', 1);
    if (rec && rec.newStars) track('stars', rec.newStars);
  } else S.stats.deaths++;
  // 4) Expérience du pilote
  const xp = Math.round((25 + 1.5 * L) * DIFFS[d].mul * (victory ? 1 : 0.4));
  const lvlFrom = S.pilot.lvl, xpFrom = S.pilot.xp / xpNeeded(S.pilot.lvl);
  const levelUps = addXP(xp);
  const xpTo = S.pilot.lvl > lvlFrom ? 1 : S.pilot.xp / xpNeeded(S.pilot.lvl);
  checkAchievements();
  save();
  app.game = null;
  clearParticles();
  show('results', { victory, stars: res.stars, def, stats: st, got, bonus, first, chest, newStarCrystals, shardsN, shardShip: S.ship, score, prevHi, record, rank, seasonPts, xp, lvlFrom, xpFrom, xpTo, levelUps });
}

// ---------- Boucle ----------
function frame(now) {
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.1) dt = 0.1;
  const step = Math.min(dt, 1 / 30);
  try {
    if (app.game) {
      app.game.update(step);
      updateCam(dt);
      app.game.draw();
    } else {
      menuUpdate(step);
      updateCam(dt);
      menuDraw();
      drawFlash();
    }
  } catch (e) { console.error(e); }
  trackFrame(dt);
  endFrameInput();
  requestAnimationFrame(frame);
}

// Pause automatique quand l'app passe en arrière-plan
document.addEventListener('visibilitychange', () => {
  if (document.hidden && app.game && !app.game.paused && app.game.state === 'play') app.game.pause();
  if (document.hidden) save();
});

// Service worker (hors ligne)
if ('serviceWorker' in navigator && !location.search.includes('nosw')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

// Lancement
const boot = document.getElementById('boot');
// Lien de défi reçu (…#duel=CODE) : on propose directement le duel
if (location.hash.startsWith('#duel=')) {
  const code = location.hash.slice(6);
  try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* ignoré */ }
  decodeDuel(code).then((d) => { if (d) go('duelInvite', { duel: d }, false); });
}
show('title');
requestAnimationFrame((t) => { last = t; frame(t); });
setTimeout(() => { if (boot) { boot.classList.add('hide'); setTimeout(() => boot.remove(), 600); } }, 250);
window.__astralume = { app, S, go };
