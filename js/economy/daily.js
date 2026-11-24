// Cadeau de connexion quotidien (série), missions du jour et suivi des statistiques
import { S, saveSoon } from './save.js';
import { grant, emit, ownsShip, ownsDrone } from './economy.js';
import { SHIPS, DRONES } from './data.js';
import { dayNumber, RNG, hash32 } from '../engine/math.js';
import { refreshWheel } from './gacha.js';

// ---------- Connexion ----------
export function checkDaily() {
  const today = dayNumber();
  const d = S.daily;
  if (d.last !== today) {
    if (d.last === today - 1) d.streak++;
    else {
      const weeks = Math.floor(Math.max(0, d.streak - 1) / 7) + (d.carry || 0);
      d.carry = Math.max(0, weeks - 1);
      d.streak = 1;
    }
    d.last = today;
    d.pending = true;
    d.best = Math.max(d.best || 0, d.streak);
    saveSoon();
  }
  refreshMissions();
  refreshWheel();
}
export function calendarIndex() { return (S.daily.streak - 1) % 7; }
export function weekBonus() { return Math.min(4, Math.floor((S.daily.streak - 1) / 7) + (S.daily.carry || 0)); }

function specialUnlock() {
  const wk = Math.floor((S.daily.streak - 1) / 7);
  const ship = SHIPS.find((s) => !ownsShip(s.id));
  const drone = DRONES.find((x) => !ownsDrone(x.id));
  if (wk % 2 === 0 && drone) return { drone: drone.id };
  if (ship) return { ship: ship.id };
  if (drone) return { drone: drone.id };
  return null;
}
export function calendarReward(idx, forPreview = false) {
  const m = 1 + 0.25 * weekBonus();
  const s = 1 + Math.min(300, S.maxLevel) / 40;
  const R = Math.round;
  switch (idx) {
    case 0: return { coins: R(300 * s * m) };
    case 1: return { crystals: R(20 * m) };
    case 2: return { parts: R(8 * m) };
    case 3: return { coins: R(800 * s * m), boost: { shield: 1 } };
    case 4: return { gems: R(5 * m) };
    case 5: return { chest: 'prism', crystals: R(15 * m) };
    default: {
      const b = { chest: 'astral' };
      if (forPreview) { b.mystery = true; return b; }
      const sp = specialUnlock();
      if (sp) Object.assign(b, sp); else b.gems = R(25 * m);
      return b;
    }
  }
}
export function claimDaily() {
  if (!S.daily.pending) return null;
  const b = calendarReward(calendarIndex());
  S.daily.pending = false;
  grant(b);
  saveSoon();
  return b;
}

// ---------- Missions ----------
export const MISSIONS = {
  kill: { stat: 'kills', ns: [60, 120, 220], text: (n) => `Détruire ${n} aliens` },
  coins: { stat: 'coins', ns: [500, 1500, 4000], text: (n) => `Ramasser ${n} pièces en vol`, scale: true },
  levels: { stat: 'levels', ns: [2, 3, 5], text: (n) => `Terminer ${n} niveaux` },
  boss: { stat: 'bosses', ns: [1], text: () => 'Vaincre un boss ou un gardien' },
  hard: { stat: 'hard', ns: [1, 2], text: (n) => `Terminer ${n} niveau(x) en Difficile ou Cauchemar` },
  special: { stat: 'specials', ns: [3, 5, 8], text: (n) => `Déclencher ${n} attaques spéciales` },
  perfect: { stat: 'perfects', ns: [1, 2, 3], text: (n) => `Réussir ${n} spéciale(s) PARFAITE(S) en rythme` },
  constel: { stat: 'constel', ns: [2, 4, 6], text: (n) => `Former ${n} constellations` },
  stars: { stat: 'stars', ns: [3, 5, 8], text: (n) => `Gagner ${n} nouvelles étoiles` },
  nohit: { stat: 'nohit', ns: [1, 2], text: (n) => `Terminer ${n} niveau(x) sans perdre de cœur` },
  salvage: { stat: 'salvage', ns: [1, 2, 3], text: (n) => `Récupérer ${n} débris de boss` },
  novas: { stat: 'novas', ns: [1, 2, 3], text: (n) => `Activer ${n} fois l’Hypernova` },
  chest: { stat: 'chests', ns: [1, 2], text: (n) => `Ouvrir ${n} coffre(s)` },
  elites: { stat: 'elites', ns: [1, 2, 3], text: (n) => `Abattre ${n} élite(s) dorée(s)` },
  crystals: { stat: 'crystals', ns: [20, 40, 70], text: (n) => `Ramasser ${n} cristaux` },
};

export function refreshMissions() {
  const today = dayNumber();
  if (S.missions.day === today && S.missions.list.length) return;
  const rng = new RNG(hash32(today, 4242));
  let keys = Object.keys(MISSIONS);
  if (S.maxLevel < 6) keys = keys.filter((k) => !['boss', 'hard', 'salvage', 'nohit', 'perfect'].includes(k));
  if (S.maxLevel < 11) keys = keys.filter((k) => k !== 'hard');
  rng.shuffle(keys);
  const list = keys.slice(0, 3).map((id, i) => {
    const M = MISSIONS[id];
    let n = M.ns[Math.min(M.ns.length - 1, rng.int(0, Math.min(M.ns.length - 1, i)))];
    if (M.scale) n = Math.round(n * (1 + Math.min(300, S.maxLevel) / 50) / 50) * 50;
    return { id, n, p: 0, done: false, claimed: false, tier: i };
  });
  S.missions = { day: today, list, bonus: false };
  saveSoon();
}
export function missionReward(m) {
  const s = 1 + Math.min(300, S.maxLevel) / 40;
  return [
    { coins: Math.round(400 * s), crystals: 5 },
    { coins: Math.round(600 * s), crystals: 12 },
    { crystals: 20, gems: 3 },
  ][m.tier];
}
export const MISSION_BONUS = () => ({ chest: 'prism', gems: 5 });
export function claimMission(i) {
  const m = S.missions.list[i];
  if (!m || !m.done || m.claimed) return null;
  m.claimed = true;
  const b = missionReward(m);
  grant(b);
  saveSoon();
  return b;
}
export function claimMissionBonus() {
  if (S.missions.bonus || !S.missions.list.every((m) => m.claimed)) return null;
  S.missions.bonus = true;
  const b = MISSION_BONUS();
  grant(b);
  saveSoon();
  return b;
}
export function missionsBadge() {
  let n = S.missions.list.filter((m) => m.done && !m.claimed).length;
  if (!S.missions.bonus && S.missions.list.length && S.missions.list.every((m) => m.claimed)) n++;
  return n;
}

// ---------- Suivi ----------
export function track(stat, n = 1) {
  if (!n) return;
  S.stats[stat] = (S.stats[stat] || 0) + n;
  for (const m of S.missions.list) {
    if (m.done || MISSIONS[m.id].stat !== stat) continue;
    m.p = Math.min(m.n, m.p + n);
    if (m.p >= m.n) { m.done = true; emit('mission', m); }
  }
  saveSoon();
}
