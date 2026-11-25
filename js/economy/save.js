// Sauvegarde automatique de toute la progression (localStorage)
const KEY = 'astralume.save.v1';

export function defaults() {
  return {
    v: 1,
    created: Date.now(),
    cur: { coins: 150, crystals: 10, gems: 0, parts: 0 },
    pilot: { lvl: 1, xp: 0 },
    maxLevel: 1,
    lv: {},                 // niveau -> [étoiles normal, difficile, cauchemar]
    ship: 'etincelle',
    ships: { etincelle: { own: 1, pw: 0, rt: 0, sp: 0, m: { dmg: 0, rate: 0, spec: 0 }, aw: 0 } },
    drones: { sentinelle: { own: 1, lvl: 1, m: 0 } }, // id -> { own:1, lvl:1, m:0 }
    slots: ['sentinelle', null],
    shards: {},             // éclats d'étoile par vaisseau
    up: { hull: 0, shield: 0, magnet: 0, fortune: 0, nova: 0, arsenal: 0, luck: 0, crit: 0, charge: 0, slot2: 0 },
    gacha: { r: 0, e: 0, l: 0 },
    wheel: { day: -1, free: 1, paid: 0 },
    daily: { last: -1, streak: 0, week: 0, pending: false, best: 0 },
    missions: { day: -1, list: [], bonus: false },
    ach: {},
    stats: {
      kills: 0, bosses: 0, coins: 0, crystals: 0, gems: 0, parts: 0, levels: 0, hard: 0, night: 0,
      constel: 0, perfects: 0, salvage: 0, novas: 0, chests: 0, legend: 0, spins: 0, nohit: 0,
      specials: 0, time: 0, deaths: 0, elites: 0, stars: 0,
    },
    starsClaimed: 0,
    freeChests: [],
    achN: {},
    boosts: { nova: 0, shield: 0, power: 0 },
    settings: {
      master: { on: true, vol: 0.9 }, music: { on: true, vol: 0.7 }, sfx: { on: true, vol: 0.85 },
      control: 'relative', offset: 1, quality: 'auto', shake: true, hitbox: true,
    },
    seenIntro: false,
    lastDiff: 0,
  };
}

function merge(def, obj) {
  if (obj === null || typeof obj !== 'object' || Array.isArray(def)) return obj === undefined ? def : obj;
  const out = { ...def };
  for (const k of Object.keys(obj)) {
    const dv = def[k], ov = obj[k];
    if (dv && typeof dv === 'object' && !Array.isArray(dv) && ov && typeof ov === 'object' && !Array.isArray(ov)) out[k] = merge(dv, ov);
    else out[k] = ov;
  }
  return out;
}

export let S = defaults();

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) S = merge(defaults(), JSON.parse(raw));
  } catch (e) { S = defaults(); }
  // Garanties d'intégrité
  if (!S.ships.etincelle) S.ships.etincelle = defaults().ships.etincelle;
  if (!S.ships[S.ship] || !S.ships[S.ship].own) S.ship = 'etincelle';
  for (const id in S.ships) { const sh = S.ships[id]; sh.m = merge({ dmg: 0, rate: 0, spec: 0 }, sh.m || {}); }
  // Migration v2 : contrôle « relatif » par défaut (le vaisseau reste sous le doigt)
  if (!S.mig2) { S.mig2 = 1; S.settings.control = 'relative'; S.settings.offset = 1; }
  // Migration v3 : un drone d'escorte offert et équipé (les drones volent à gauche et à droite)
  if (!S.mig3) {
    S.mig3 = 1;
    if (!S.drones.sentinelle) S.drones.sentinelle = { own: 1, lvl: 1, m: 0 };
    if (!S.slots.includes('sentinelle')) { const i = S.slots[0] ? (S.slots[1] ? -1 : 1) : 0; if (i >= 0) S.slots[i] = 'sentinelle'; }
  }
  return S;
}

let pending = 0;
export function save() {
  pending = 0;
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* stockage plein ou privé */ }
}
export function saveSoon() {
  if (pending) return;
  pending = setTimeout(save, 350);
}
export function resetSave() {
  S = defaults();
  save();
  location.reload();
}
export function exportSave() { return btoa(unescape(encodeURIComponent(JSON.stringify(S)))); }

window.addEventListener('pagehide', save);
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
