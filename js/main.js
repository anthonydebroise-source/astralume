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
import { DIFFS, SHIPS } from './economy/data.js';
import { SHARD_COLORS } from './game/art.js';
for (const sh of SHIPS) SHARD_COLORS[sh.id] = sh.color;
import { buildLevel } from './levels/generator.js';
import { Game } from './game/game.js';
import { app } from './app.js';
import { ui, go, show, clearScreens, menuUpdate, menuDraw, initUINotifications } from './ui/ui.js';
import { pauseMenu, continueMenu } from './ui/screens-main.js';
import './ui/screens-meta.js';

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
  const drones = [];
  for (let i = 0; i < 2; i++) if (S.slots[i] && S.drones[S.slots[i]]) drones.push(S.slots[i]);
  const g = new Game(def, { ship: S.ship, drones, boosts });
  g.onEnd = (res) => endLevel(res);
  g.onDeath = (game) => continueMenu(game);
  g.onPause = () => pauseMenu(g);
  app.game = g;
  lastLevel = { L, diff };
};
app.restart = () => { if (lastLevel) { const g = app.game; if (g) g.quit(); app.startLevel(lastLevel.L, lastLevel.diff, {}); } };
app.quitToMenu = () => { if (app.game) app.game.quit(); app.game = null; clearParticles(); go('hub', {}, false); };

function endLevel(res) {
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
  // 3) Statistiques, missions, succès
  track('kills', st.kills); track('coins', got.coins); track('crystals', got.crystals); track('gems', got.gems); track('parts', got.parts);
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
  show('results', { victory, stars: res.stars, def, stats: st, got, bonus, first, chest, newStarCrystals, shardsN, shardShip: S.ship, xp, lvlFrom, xpFrom, xpTo, levelUps });
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
show('title');
requestAnimationFrame((t) => { last = t; frame(t); });
setTimeout(() => { if (boot) { boot.classList.add('hide'); setTimeout(() => boot.remove(), 600); } }, 250);
window.__astralume = { app, S };
