// Économie : monnaies, progression des vaisseaux/drones, améliorations, XP pilote, étoiles
import { S, saveSoon } from './save.js';
import { SHIPS, SHIP_BY_ID, DRONES, DRONE_BY_ID, UPGRADES, CUR_KEYS } from './data.js';

// ---------- Bus d'événements (UI, toasts, sons) ----------
const listeners = new Set();
export function onEcon(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function emit(type, data) { for (const f of listeners) { try { f(type, data); } catch (e) { console.error(e); } } }

const r10 = (v) => Math.max(10, Math.round(v / 10) * 10);

// ---------- Monnaies ----------
export function give(cur, n) {
  n = Math.round(n);
  if (!n || !(cur in S.cur)) return;
  S.cur[cur] = Math.max(0, S.cur[cur] + n);
  saveSoon();
  emit('cur', { cur, n });
}
export function canPay(cost) {
  if (!cost) return true;
  for (const k in cost) if (cost[k] > 0 && (S.cur[k] || 0) < cost[k]) return false;
  return true;
}
export function pay(cost) {
  if (!canPay(cost)) return false;
  for (const k in cost) if (cost[k] > 0) S.cur[k] -= cost[k];
  saveSoon();
  emit('cur', { spent: true });
  return true;
}
export function cleanCost(c) { const o = {}; for (const k in c) if (c[k] > 0) o[k] = Math.round(c[k]); return o; }

// Accorde un « paquet » de récompenses : monnaies, coffres, boosts, vaisseau/drone
export function grant(b) {
  if (!b) return;
  for (const k of CUR_KEYS) if (b[k]) give(k, b[k]);
  if (b.chest) { const arr = Array.isArray(b.chest) ? b.chest : [b.chest]; S.freeChests = (S.freeChests || []).concat(arr); emit('chest', arr); }
  if (b.boost) for (const k in b.boost) S.boosts[k] = (S.boosts[k] || 0) + b.boost[k];
  if (b.ship && !ownsShip(b.ship)) unlockShip(b.ship, true);
  if (b.drone && !ownsDrone(b.drone)) unlockDrone(b.drone, true);
  if (b.shards) for (const k in b.shards) giveShards(k, b.shards[k]);
  saveSoon();
}

// ---------- Vaisseaux ----------
export const SHIP_MAX = { pw: 30, rt: 15, sp: 15 };
export const ownsShip = (id) => !!(S.ships[id] && S.ships[id].own);
export function shipUpCost(id, stat) {
  const s = S.ships[id]; if (!s) return null;
  const l = s[stat];
  if (l >= SHIP_MAX[stat]) return null;
  if (stat === 'pw') return cleanCost({ coins: r10(120 * Math.pow(1.16, l)), parts: (l + 1) % 5 === 0 ? 3 + l : 0 });
  if (stat === 'rt') return cleanCost({ coins: r10(220 * Math.pow(1.26, l)), parts: (l + 1) % 5 === 0 ? 5 + l : 0 });
  return cleanCost({ coins: r10(180 * Math.pow(1.25, l)), crystals: 4 + l * 3 });
}
export function upgradeShip(id, stat) {
  const c = shipUpCost(id, stat);
  if (!c || !pay(c)) return false;
  S.ships[id][stat]++;
  saveSoon(); emit('ship', id);
  return true;
}
export function canUnlockShip(id) { const d = SHIP_BY_ID[id]; return !ownsShip(id) && S.maxLevel >= d.req; }
export function unlockShip(id, free = false) {
  if (ownsShip(id)) return false;
  if (!free && (!canUnlockShip(id) || !pay(SHIP_BY_ID[id].cost))) return false;
  S.ships[id] = { own: 1, pw: 0, rt: 0, sp: 0, m: { dmg: 0, rate: 0, spec: 0 }, aw: 0 };
  saveSoon(); emit('unlock', { ship: id });
  return true;
}
// ---------- Éclats d'étoile : un cristal par vaisseau, pour le faire évoluer ----------
export const EVO_MAX = 6;
export const EVO_COST = [{ sh: 8, coins: 1500 }, { sh: 15, coins: 4000 }, { sh: 25, coins: 9000 }, { sh: 40, coins: 18000 }, { sh: 60, coins: 32000 }, { sh: 90, coins: 55000 }];
export const EVO_PERKS = [
  '+10 % de dégâts',
  'Canons d’aile (nouvelle silhouette) · +10 % de dégâts',
  'Nouvelle attaque : salve d’escorte à tête chercheuse',
  'Ailes de combat (nouvelle silhouette) · +10 % de dégâts',
  'Spéciale +30 %',
  'Livrée dorée et cœur d’énergie double · +15 % de dégâts',
];
export const shards = (id) => (S.shards && S.shards[id]) || 0;
export function giveShards(id, n) { if (!S.shards) S.shards = {}; S.shards[id] = (S.shards[id] || 0) + Math.round(n); emit('cur', {}); }
export function evoLevel(id) { return (S.ships[id] && S.ships[id].ev) || 0; }
export function evoCost(id) { const s = S.ships[id]; if (!s || (s.ev || 0) >= EVO_MAX) return null; return EVO_COST[s.ev || 0]; }
export function canEvolve(id) { const c = evoCost(id); return !!c && shards(id) >= c.sh && canPay({ coins: c.coins }); }
export function evolveShip(id) {
  const c = evoCost(id);
  if (!c || shards(id) < c.sh || !pay({ coins: c.coins })) return false;
  S.shards[id] -= c.sh;
  S.ships[id].ev = (S.ships[id].ev || 0) + 1;
  saveSoon(); emit('ship', id);
  return true;
}
function evoDmg(ev) { return 1 + [0, 0.1, 0.2, 0.2, 0.3, 0.3, 0.45][ev || 0]; }
// ---------- Peintures ----------
export const SKIN_COST = [null, { gems: 120 }, { gems: 240 }, { gems: 400 }];
export const SKIN_PERKS = ['Peinture d’origine', 'Puissance +15 %', 'Surchauffe : cadence +15 %, spéciale +20 %', 'Aura de foudre : décharge qui efface les tirs proches et frappe les aliens'];
export function skinOwned(id, i) { const s = S.ships[id]; return i === 0 || !!(s && s.skins && s.skins.includes(i)); }
export function buySkin(id, i) {
  const s = S.ships[id];
  if (!s || skinOwned(id, i) || !pay(SKIN_COST[i])) return false;
  s.skins = (s.skins || []).concat(i); s.skin = i;
  saveSoon(); emit('ship', id);
  return true;
}
export function setSkin(id, i) { const s = S.ships[id]; if (s && skinOwned(id, i)) { s.skin = i; saveSoon(); emit('ship', id); } }

export function shipStats(id) {
  const s = S.ships[id] || { pw: 0, rt: 0, sp: 0, m: { dmg: 0, rate: 0, spec: 0 }, aw: 0 };
  return {
    dmg: (1 + 0.12 * s.pw) * (1 + s.m.dmg) * evoDmg(s.ev) * (s.skin === 1 ? 1.15 : 1),
    rate: (1 + 0.045 * s.rt) * (1 + s.m.rate) * (s.skin === 2 ? 1.15 : 1),
    spec: (1 + 0.1 * s.sp) * (1 + s.m.spec) * (1 + 0.25 * s.aw) * ((s.ev || 0) >= 5 ? 1.3 : 1) * (s.skin === 2 ? 1.2 : 1),
    ev: s.ev || 0,
    aura: s.skin === 3,
    charge: (1 + 0.03 * s.sp) * (1 + 0.08 * S.up.charge),
    aw: s.aw,
    lv: s,
  };
}

// ---------- Drones ----------
export const DRONE_MAX = 15;
export const ownsDrone = (id) => !!(S.drones[id] && S.drones[id].own);
export function slotCount() { return 2; }
export function canUnlockDrone(id) { return !ownsDrone(id) && S.maxLevel >= DRONE_BY_ID[id].req; }
export function unlockDrone(id, free = false) {
  if (ownsDrone(id)) return false;
  if (!free && (!canUnlockDrone(id) || !pay(DRONE_BY_ID[id].cost))) return false;
  S.drones[id] = { own: 1, lvl: 1, m: 0 };
  for (let i = 0; i < slotCount(); i++) if (!S.slots[i]) { S.slots[i] = id; break; }
  saveSoon(); emit('unlock', { drone: id });
  return true;
}
export function droneUpCost(id) {
  const d = S.drones[id]; if (!d || d.lvl >= DRONE_MAX) return null;
  return cleanCost({ coins: r10(300 * Math.pow(1.28, d.lvl - 1)), parts: d.lvl % 3 === 0 ? 2 + d.lvl : 0 });
}
export function upgradeDrone(id) {
  const c = droneUpCost(id);
  if (!c || !pay(c)) return false;
  S.drones[id].lvl++;
  saveSoon(); emit('drone', id);
  return true;
}
// Autonomie : durée de présence d'un drone en vol (achetable)
export const DUR_MAX = 8;
export const droneDuration = (id) => 18 + 4 * ((S.drones[id] && S.drones[id].du) || 0);
export function droneDurCost(id) {
  const d = S.drones[id]; if (!d || (d.du || 0) >= DUR_MAX) return null;
  const l = d.du || 0;
  return cleanCost({ coins: r10(600 * Math.pow(1.45, l)), crystals: l >= 2 ? 6 + l * 4 : 0 });
}
export function upgradeDroneDur(id) {
  const c = droneDurCost(id);
  if (!c || !pay(c)) return false;
  S.drones[id].du = (S.drones[id].du || 0) + 1;
  saveSoon(); emit('drone', id);
  return true;
}
export function dronePower(id) { const d = S.drones[id]; return d ? (1 + 0.16 * (d.lvl - 1)) * (1 + (d.m || 0)) : 0; }
export function equipDrone(id, slot) {
  if (slot >= slotCount()) return;
  const other = S.slots.indexOf(id);
  if (other >= 0) S.slots[other] = S.slots[slot] && other < slotCount() ? S.slots[slot] : null;
  S.slots[slot] = id;
  saveSoon(); emit('drone', id);
}
export function unequipDrone(slot) { S.slots[slot] = null; saveSoon(); emit('drone', null); }
export function equippedDrones() { const out = []; for (let i = 0; i < slotCount(); i++) if (S.slots[i] && ownsDrone(S.slots[i])) out.push(S.slots[i]); return out; }

// ---------- Améliorations globales ----------
export function upCost(id) {
  const u = UPGRADES.find((x) => x.id === id);
  const l = S.up[id] || 0;
  if (l >= u.max) return null;
  return cleanCost(u.cost(l));
}
export function buyUpgrade(id) {
  const u = UPGRADES.find((x) => x.id === id);
  if (u.req && S.maxLevel < u.req) return false;
  const c = upCost(id);
  if (!c || !pay(c)) return false;
  S.up[id] = (S.up[id] || 0) + 1;
  saveSoon(); emit('upgrade', id);
  return true;
}

// ---------- Puissance ----------
export function powerRating(shipId = S.ship) {
  const st = shipStats(shipId);
  let drones = 0;
  for (const d of equippedDrones()) drones += dronePower(d);
  const p = st.dmg * st.rate * (1 + S.up.crit * 0.03) * (1 + S.up.arsenal * 0.12) * (1 + S.up.hull * 0.05 + S.up.shield * 0.04) * (1 + drones * 0.07);
  return Math.round(100 * p);
}
export function recommendedPower(L, diff) {
  const p = 100 * (1 + 0.036 * (L - 1)) * [1, 1.45, 2.1][diff] * 0.72;
  return Math.max(60, Math.round(p / 5) * 5);
}

// ---------- Pilote ----------
export function xpNeeded(lvl) { return Math.round(100 + 45 * lvl + 4 * lvl * lvl); }
export function pilotReward(lvl) {
  const b = { coins: 150 + 60 * lvl, crystals: 5 + Math.floor(lvl / 2) };
  if (lvl % 5 === 0) b.chest = 'prism';
  if (lvl % 10 === 0) b.gems = 15;
  return b;
}
export function addXP(n) {
  const ups = [];
  S.pilot.xp += Math.round(n);
  while (S.pilot.xp >= xpNeeded(S.pilot.lvl)) {
    S.pilot.xp -= xpNeeded(S.pilot.lvl);
    S.pilot.lvl++;
    const rw = pilotReward(S.pilot.lvl);
    grant(rw);
    ups.push({ lvl: S.pilot.lvl, reward: rw });
  }
  saveSoon();
  return ups;
}

// ---------- Niveaux & étoiles ----------
export function levelStars(L) { return S.lv[L] || [0, 0, 0]; }
export function bestStars(L) { const a = levelStars(L); return Math.max(a[0], a[1], a[2]); }
export function totalStars() { let t = 0; for (const k in S.lv) { const a = S.lv[k]; t += a[0] + a[1] + a[2]; } return t; }
export function worldStars(w) { let t = 0; for (let i = 1; i <= 10; i++) { const a = levelStars(w * 10 + i); t += a[0] + a[1] + a[2]; } return t; }
export function diffUnlocked(L, diff) {
  if (L > S.maxLevel) return false;
  if (diff === 0) return true;
  return levelStars(L)[diff - 1] > 0;
}
export function recordLevel(L, diff, stars) {
  const a = (S.lv[L] = S.lv[L] ? S.lv[L].slice() : [0, 0, 0]);
  const first = a[diff] === 0;
  const newStars = Math.max(0, stars - a[diff]);
  a[diff] = Math.max(a[diff], stars);
  S.lv[L] = a;
  let unlocked = false;
  if (L === S.maxLevel && L < 320) { S.maxLevel = L + 1; unlocked = true; }
  saveSoon();
  return { first, newStars, unlocked };
}

// ---------- Récompenses d'étoiles ----------
export const STAR_STEP = 20;
export function starMilestone(i) {
  const sc = 1 + i * 0.35;
  const b = { coins: Math.round(800 * sc), crystals: Math.round(20 * sc) };
  if (i % 3 === 2) b.chest = 'astral'; else b.chest = i % 2 ? 'prism' : 'neon';
  if (i % 5 === 4) b.gems = 15;
  return b;
}
export function starRewardsAvailable() { return Math.floor(totalStars() / STAR_STEP) - S.starsClaimed; }
export function claimStarReward() {
  if (starRewardsAvailable() <= 0) return null;
  const b = starMilestone(S.starsClaimed);
  S.starsClaimed++;
  grant(b);
  return b;
}

// ---------- Paquets : liste pour l'affichage ----------
export function bundleEntries(b) {
  const out = [];
  if (!b) return out;
  for (const k of CUR_KEYS) if (b[k]) out.push({ type: 'cur', id: k, n: Math.round(b[k]) });
  if (b.chest) for (const c of Array.isArray(b.chest) ? b.chest : [b.chest]) out.push({ type: 'chest', id: c, n: 1 });
  if (b.boost) for (const k in b.boost) out.push({ type: 'boost', id: k, n: b.boost[k] });
  if (b.ship) out.push({ type: 'ship', id: b.ship, n: 1 });
  if (b.drone) out.push({ type: 'drone', id: b.drone, n: 1 });
  if (b.shards) for (const k in b.shards) out.push({ type: 'shard', id: k, n: b.shards[k] });
  return out;
}
export { SHIPS, DRONES, UPGRADES };
