// Coffres, roue de la fortune, raretés et garantie anti-malchance (aucun argent réel)
import { S, saveSoon } from './save.js';
import { SHIPS, DRONES, SHIP_BY_ID, DRONE_BY_ID, RARITY, CUR, BOOSTS } from './data.js';
import { pay, canPay, give, grant, unlockShip, unlockDrone, ownsShip, ownsDrone, emit, cleanCost, giveShards } from './economy.js';
import { dayNumber } from '../engine/math.js';

export const CHESTS = {
  neon: { id: 'neon', name: 'Coffre Néon', color: '#38f2ff', color2: '#1a6dff', odds: [70, 24, 5.2, 0.8],
    cost: () => cleanCost({ coins: 500 + 10 * Math.min(300, S.maxLevel) }) },
  prism: { id: 'prism', name: 'Coffre Prisme', color: '#c35cff', color2: '#ff3fa9', odds: [40, 41, 15, 4],
    cost: () => cleanCost({ crystals: 45 + Math.floor(Math.min(300, S.maxLevel) / 6) }) },
  astral: { id: 'astral', name: 'Coffre Astral', color: '#ffc23d', color2: '#ff6a2a', odds: [0, 50, 36, 14],
    cost: () => ({ gems: 18 }) },
  boss: { id: 'boss', name: 'Coffre de Colosse', color: '#ff4f6e', color2: '#ffb02f', odds: [25, 47, 22, 6], cost: () => null },
};
export const PITY = { r: 6, e: 20, l: 50 };
export function pityLeft() { return { r: PITY.r - S.gacha.r, e: PITY.e - S.gacha.e, l: PITY.l - S.gacha.l }; }

function rollRarity(chest) {
  const o = chest.odds;
  const tot = o.reduce((a, b) => a + b, 0);
  let r = Math.random() * tot, rar = 0;
  for (let i = 0; i < 4; i++) { r -= o[i]; if (r <= 0) { rar = i; break; } }
  if (S.gacha.l + 1 >= PITY.l) rar = 3;
  else if (S.gacha.e + 1 >= PITY.e) rar = Math.max(rar, 2);
  else if (S.gacha.r + 1 >= PITY.r) rar = Math.max(rar, 1);
  S.gacha.r = rar >= 1 ? 0 : S.gacha.r + 1;
  S.gacha.e = rar >= 2 ? 0 : S.gacha.e + 1;
  S.gacha.l = rar >= 3 ? 0 : S.gacha.l + 1;
  return rar;
}

const sc = () => 1 + Math.min(320, S.maxLevel) / 35;
const rnd = (a, b) => a + Math.random() * (b - a);
const STAT = { dmg: 'dégâts', rate: 'cadence', spec: 'puissance spéciale' };
const MOD = [0.03, 0.08, 0.15, 0.3];
const DMOD = [0.06, 0.12, 0.25, 0.5];
const CAP = 2.0;

function curItem(rar, cur, n) {
  n = Math.max(1, Math.round(n));
  return { rar, kind: 'cur', cur, n, title: `${n.toLocaleString('fr-FR')} ${CUR[cur].name}`, desc: 'Ajouté à votre réserve.', apply() { give(cur, n); } };
}
function ownedShips() { return SHIPS.filter((s) => ownsShip(s.id)); }
function shipModule(rar) {
  const owned = ownedShips();
  const ship = Math.random() < 0.6 && ownsShip(S.ship) ? SHIP_BY_ID[S.ship] : owned[Math.floor(Math.random() * owned.length)];
  const r = Math.random();
  const stat = r < 0.45 ? 'dmg' : r < 0.75 ? 'rate' : 'spec';
  const v = MOD[rar] * (stat === 'rate' ? 0.6 : 1);
  const m = S.ships[ship.id].m;
  if (m[stat] >= CAP) return curItem(rar, 'crystals', 20 * (rar + 1) * sc());
  const pct = Math.round(v * 100);
  return {
    rar, kind: 'module', ship: ship.id, stat, v,
    title: `Module ${['commun', 'rare', 'épique', 'légendaire'][rar]}`,
    desc: `${ship.name} : +${pct} % de ${STAT[stat]} (permanent)`,
    apply() { m[stat] = Math.min(CAP, m[stat] + v); },
  };
}
function droneModule(rar) {
  const owned = DRONES.filter((d) => ownsDrone(d.id));
  if (!owned.length) return shipModule(rar);
  const d = owned[Math.floor(Math.random() * owned.length)];
  const v = DMOD[rar];
  return {
    rar, kind: 'dmodule', drone: d.id, v,
    title: `Noyau de drone ${['commun', 'rare', 'épique', 'légendaire'][rar]}`,
    desc: `${d.name} : +${Math.round(v * 100)} % de puissance (permanent)`,
    apply() { S.drones[d.id].m = Math.min(CAP * 1.5, (S.drones[d.id].m || 0) + v); },
  };
}
function awaken(rar) {
  const cands = ownedShips().filter((s) => S.ships[s.id].aw < 3);
  if (!cands.length) return shipModule(rar);
  const ship = cands.find((s) => s.id === S.ship) || cands[Math.floor(Math.random() * cands.length)];
  const lv = S.ships[ship.id].aw + 1;
  return {
    rar, kind: 'awaken', ship: ship.id,
    title: `Éveil : ${ship.special}`,
    desc: `${ship.name} — Éveil ${lv}/3 : spéciale +25 % et plus spectaculaire.`,
    apply() { S.ships[ship.id].aw = Math.min(3, S.ships[ship.id].aw + 1); },
  };
}
function shipUnlockItem(rar) {
  const locked = SHIPS.filter((s) => !ownsShip(s.id));
  if (!locked.length) return awaken(rar);
  // les vaisseaux les moins chers sortent plus souvent
  const ship = locked[Math.floor(Math.pow(Math.random(), 1.6) * locked.length)];
  return { rar, kind: 'ship', ship: ship.id, title: `Vaisseau : ${ship.name}`, desc: ship.desc, apply() { unlockShip(ship.id, true); } };
}
function droneUnlockItem(rar) {
  const locked = DRONES.filter((d) => !ownsDrone(d.id));
  if (!locked.length) return droneModule(rar);
  const d = locked[Math.floor(Math.pow(Math.random(), 1.4) * locked.length)];
  return { rar, kind: 'drone', drone: d.id, title: `Drone : ${d.name}`, desc: d.desc, apply() { unlockDrone(d.id, true); } };
}
// Éclats d'étoile : surtout pour le vaisseau équipé, parfois pour un autre (même non débloqué)
function shardItem(rar) {
  const pool = Math.random() < 0.6 ? [SHIP_BY_ID[S.ship]] : SHIPS;
  const ship = pool[Math.floor(Math.random() * pool.length)];
  const n = Math.round([4, 10, 22, 45][rar] * rnd(0.85, 1.2));
  return { rar, kind: 'shard', ship: ship.id, n, title: `${n} Éclats ${ship.name}`, desc: `Cristaux du vaisseau ${ship.name} : ils servent à le faire évoluer (étoiles).`, apply() { giveShards(ship.id, n); } };
}
function boostItem(rar) {
  const keys = Object.keys(BOOSTS);
  const k = keys[Math.floor(Math.random() * keys.length)];
  const n = rar + 1;
  return { rar, kind: 'boost', boost: k, n, title: `${BOOSTS[k].name} ×${n}`, desc: BOOSTS[k].desc + ' (à activer avant un niveau).', apply() { S.boosts[k] = (S.boosts[k] || 0) + n; } };
}

export function rollItem(rar) {
  const s = sc(), r = Math.random();
  if (rar === 0) {
    if (r < 0.28) return curItem(0, 'coins', 300 * s * rnd(0.8, 1.3));
    if (r < 0.44) return curItem(0, 'crystals', 8 + 2 * s);
    if (r < 0.56) return curItem(0, 'parts', 2 + s * 0.6);
    if (r < 0.76) return shardItem(0);
    if (r < 0.9) return shipModule(0);
    return boostItem(0);
  }
  if (rar === 1) {
    if (r < 0.14) return curItem(1, 'crystals', 25 + 5 * s);
    if (r < 0.26) return curItem(1, 'parts', 6 + 2 * s);
    if (r < 0.36) return curItem(1, 'gems', 3 + s / 3);
    if (r < 0.58) return shardItem(1);
    if (r < 0.8) return shipModule(1);
    if (r < 0.92) return droneModule(1);
    return curItem(1, 'coins', 1500 * s);
  }
  if (rar === 2) {
    if (r < 0.14) return droneUnlockItem(2);
    if (r < 0.26) return curItem(2, 'gems', 10 + s);
    if (r < 0.36) return curItem(2, 'parts', 20 + 4 * s);
    if (r < 0.6) return shardItem(2);
    if (r < 0.82) return shipModule(2);
    return droneModule(2);
  }
  if (r < 0.28) return shipUnlockItem(3);
  if (r < 0.46) return awaken(3);
  if (r < 0.68) return shardItem(3);
  if (r < 0.86) return shipModule(3);
  return curItem(3, 'gems', 40 + 2 * s);
}

export function openChest(id, free = false) {
  const chest = CHESTS[id];
  if (!free) { const c = chest.cost(); if (!c || !pay(c)) return null; }
  else {
    const i = (S.freeChests || []).indexOf(id);
    if (i < 0) return null;
    S.freeChests.splice(i, 1);
  }
  const rar = rollRarity(chest);
  const item = rollItem(rar);
  item.apply();
  S.stats.chests++;
  if (rar === 3) S.stats.legend++;
  saveSoon();
  emit('cur', {});
  emit('opened', { id, rar });
  return { rar, item, chest };
}
export function canOpen(id) { const c = CHESTS[id].cost(); return c && canPay(c); }

// ---------- Roue de la fortune ----------
export const WHEEL = [
  { label: 'Pièces', color: '#ffd23f', w: 20, b: () => ({ coins: Math.round(250 * sc()) }) },
  { label: 'Cristaux', color: '#38f2ff', w: 15, b: () => ({ crystals: Math.round(12 + 2 * sc()) }) },
  { label: 'Composants', color: '#ff9d3c', w: 12, b: () => ({ parts: Math.round(4 + sc()) }) },
  { label: 'Pièces ×3', color: '#ffe27a', w: 12, b: () => ({ coins: Math.round(750 * sc()) }) },
  { label: 'Gemmes', color: '#ff4fd8', w: 8, b: () => ({ gems: 3 + Math.floor(sc() / 3) }) },
  { label: 'Boost', color: '#47ffa3', w: 9, b: () => { const k = ['nova', 'shield', 'power'][Math.floor(Math.random() * 3)]; return { boost: { [k]: 1 } }; } },
  { label: 'Coffre Néon', color: '#3dbdff', w: 9, b: () => ({ chest: 'neon' }) },
  { label: 'Cristaux ×3', color: '#7df9ff', w: 7, b: () => ({ crystals: Math.round(40 + 6 * sc()) }) },
  { label: 'Éclats', color: '#9fe8ff', w: 10, b: () => ({ shards: { [S.ship]: 4 + Math.floor(sc() / 2) } }) },
  { label: 'Coffre Prisme', color: '#c35cff', w: 6, b: () => ({ chest: 'prism' }) },
  { label: 'JACKPOT', color: '#ffffff', w: 2, b: () => ({ gems: 25, chest: 'astral' }) },
];
export function refreshWheel() {
  const d = dayNumber();
  if (S.wheel.day !== d) { S.wheel = { day: d, free: 1, paid: 0 }; saveSoon(); }
}
export function wheelCost() { refreshWheel(); if (S.wheel.free > 0) return null; if (S.wheel.paid >= 3) return false; return { coins: Math.round((300 + 6 * Math.min(300, S.maxLevel)) * (1 + S.wheel.paid)) }; }
export function spinWheel() {
  refreshWheel();
  const c = wheelCost();
  if (c === false) return null;
  if (c === null) S.wheel.free--; else { if (!pay(c)) return null; S.wheel.paid++; }
  const tot = WHEEL.reduce((a, s) => a + s.w, 0);
  let r = Math.random() * tot, idx = 0;
  for (let i = 0; i < WHEEL.length; i++) { r -= WHEEL[i].w; if (r <= 0) { idx = i; break; } }
  const bundle = WHEEL[idx].b();
  S.stats.spins++;
  saveSoon();
  return { idx, bundle, apply: () => grant(bundle) };
}
export { RARITY, BOOSTS, DRONE_BY_ID };
