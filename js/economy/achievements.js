// Succès à paliers, avec récompenses croissantes
import { S, saveSoon } from './save.js';
import { grant, emit, totalStars, ownsShip, ownsDrone } from './economy.js';
import { SHIPS, DRONES } from './data.js';

export const ACHIEVEMENTS = [
  { id: 'kills', name: 'Exterminateur', stat: 'kills', tiers: [100, 1000, 5000, 20000, 75000], text: (n) => `Détruire ${n} aliens` },
  { id: 'bosses', name: 'Tueur de colosses', stat: 'bosses', tiers: [1, 5, 15, 40, 64], text: (n) => `Vaincre ${n} boss ou gardiens` },
  { id: 'stars', name: 'Cartographe stellaire', stat: '$stars', tiers: [10, 60, 180, 450, 960], text: (n) => `Réunir ${n} étoiles` },
  { id: 'world', name: 'Explorateur', stat: '$world', tiers: [2, 5, 10, 20, 32], text: (n) => `Atteindre le monde ${n}` },
  { id: 'constel', name: 'Astronome', stat: 'constel', tiers: [5, 50, 200, 600], text: (n) => `Former ${n} constellations` },
  { id: 'coins', name: 'Trésorier', stat: 'coins', tiers: [5000, 50000, 300000, 1500000], text: (n) => `Ramasser ${n.toLocaleString('fr-FR')} pièces` },
  { id: 'ships', name: 'Collectionneur', stat: '$ships', tiers: [2, 4, 7, 10], text: (n) => `Posséder ${n} vaisseaux` },
  { id: 'drones', name: 'Maître des drones', stat: '$drones', tiers: [1, 3, 5, 7], text: (n) => `Posséder ${n} drone(s)` },
  { id: 'hard', name: 'Téméraire', stat: 'hard', tiers: [1, 10, 50, 150], text: (n) => `Terminer ${n} niveau(x) en Difficile+` },
  { id: 'night', name: 'Cauchemar éveillé', stat: 'night', tiers: [1, 10, 50, 150], text: (n) => `Terminer ${n} niveau(x) en Cauchemar` },
  { id: 'perfect', name: 'Au rythme des étoiles', stat: 'perfects', tiers: [1, 10, 50, 200], text: (n) => `${n} spéciale(s) parfaite(s)` },
  { id: 'salvage', name: 'Ferrailleur', stat: 'salvage', tiers: [1, 10, 40, 120], text: (n) => `Récupérer ${n} débris de boss` },
  { id: 'novas', name: 'Supernova', stat: 'novas', tiers: [1, 20, 100], text: (n) => `Activer ${n} Hypernova` },
  { id: 'chests', name: 'Chasseur de trésors', stat: 'chests', tiers: [1, 10, 50, 150], text: (n) => `Ouvrir ${n} coffre(s)` },
  { id: 'legend', name: 'Légende vivante', stat: 'legend', tiers: [1, 5, 15], text: (n) => `Obtenir ${n} objet(s) légendaire(s)` },
  { id: 'pilot', name: 'Vétéran', stat: '$pilot', tiers: [5, 15, 30, 50, 80], text: (n) => `Pilote niveau ${n}` },
  { id: 'nohit', name: 'Intouchable', stat: 'nohit', tiers: [1, 10, 50], text: (n) => `${n} niveau(x) sans perdre de cœur` },
  { id: 'streak', name: 'Fidèle au poste', stat: '$streak', tiers: [3, 7, 14, 30], text: (n) => `Se connecter ${n} jours de suite` },
  { id: 'elites', name: 'Chasseur d’or', stat: 'elites', tiers: [1, 15, 60], text: (n) => `Abattre ${n} élite(s) dorée(s)` },
  { id: 'spins', name: 'Fortune cosmique', stat: 'spins', tiers: [1, 15, 60], text: (n) => `Tourner ${n} fois la roue` },
];
const REWARDS = [
  { crystals: 15, coins: 500 },
  { crystals: 40, coins: 1500 },
  { gems: 10, parts: 10 },
  { gems: 25, parts: 25 },
  { gems: 50, chest: 'astral' },
];

export function achValue(a) {
  switch (a.stat) {
    case '$stars': return totalStars();
    case '$world': return Math.floor((Math.min(320, S.maxLevel) - 1) / 10) + 1;
    case '$ships': return SHIPS.filter((s) => ownsShip(s.id)).length;
    case '$drones': return DRONES.filter((d) => ownsDrone(d.id)).length;
    case '$pilot': return S.pilot.lvl;
    case '$streak': return S.daily.best || S.daily.streak || 0;
    default: return S.stats[a.stat] || 0;
  }
}
export const achClaimed = (a) => S.ach[a.id] || 0;
export const achReward = (tier) => REWARDS[Math.min(tier, REWARDS.length - 1)];
export function achClaimable(a) { const t = achClaimed(a); return t < a.tiers.length && achValue(a) >= a.tiers[t]; }
export function claimAch(a) {
  if (!achClaimable(a)) return null;
  const t = achClaimed(a);
  S.ach[a.id] = t + 1;
  const b = achReward(t);
  grant(b);
  saveSoon();
  return b;
}
export function achBadge() { return ACHIEVEMENTS.filter(achClaimable).length; }
// Notifie les nouveaux paliers atteints (une seule fois)
export function checkAchievements() {
  for (const a of ACHIEVEMENTS) {
    let reached = 0;
    const v = achValue(a);
    while (reached < a.tiers.length && v >= a.tiers[reached]) reached++;
    const seen = S.achN[a.id] || 0;
    if (reached > seen) { S.achN[a.id] = reached; emit('ach', { a, tier: reached - 1 }); }
  }
  saveSoon();
}
