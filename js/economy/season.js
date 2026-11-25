// Saison : un parcours de 30 rangs (gratuit) renouvelé toutes les 4 semaines.
// Chaque partie rapporte des points de saison ; chaque rang atteint débloque une récompense.
import { S, saveSoon } from './save.js';
import { grant } from './economy.js';
import { dayNumber } from '../engine/math.js';

export const SEASON_DAYS = 28, RANKS = 30, PER_RANK = 250;
const SEASON_BASE = 742; // saison 1 = lancement (novembre 2026)
const NAMES = ['Éclipse Néon', 'Aube Stellaire', 'Marée Quantique', 'Nuée Écarlate', 'Forge d’Ambre', 'Givre Boréal', 'Ruche d’Or', 'Abysse Miroir'];

function state() {
  const id = Math.floor(dayNumber() / SEASON_DAYS);
  if (!S.season || S.season.id !== id) S.season = { id, pts: 0, claimed: 0 };
  return S.season;
}
export function seasonReward(r) {
  if (r === RANKS) return { chest: 'astral', gems: 30 };
  if (r % 10 === 0) return { chest: 'astral', gems: 10 };
  if (r % 5 === 0) return { chest: 'prism', gems: 4 };
  if (r % 3 === 0) return { gems: 3, crystals: 10 + r };
  if (r % 2 === 0) return { crystals: 12 + r * 2 };
  return { coins: 250 + r * 40 };
}
export function seasonInfo() {
  const st = state();
  const id = st.id, day = dayNumber() % SEASON_DAYS;
  const rank = Math.min(RANKS, Math.floor(st.pts / PER_RANK));
  return { id, n: Math.max(1, id - SEASON_BASE + 1), name: NAMES[Math.max(0, id - SEASON_BASE) % NAMES.length], daysLeft: SEASON_DAYS - day, pts: st.pts, rank, inRank: rank >= RANKS ? PER_RANK : st.pts % PER_RANK, need: PER_RANK, claimed: st.claimed, claimable: Math.max(0, rank - st.claimed) };
}
// Points gagnés en fin de partie
export function seasonGain(o) {
  const st = state();
  const n = Math.round(30 + (o.kills || 0) * 0.6 + (o.victory ? 50 : 0) + (o.boss ? 60 : 0) + Math.min(120, (o.score || 0) / 2500));
  st.pts += n; saveSoon();
  return n;
}
export function claimSeason() {
  const st = state(), info = seasonInfo();
  if (!info.claimable) return null;
  const total = {};
  for (let r = st.claimed + 1; r <= info.rank; r++) {
    const b = seasonReward(r);
    for (const k in b) {
      if (k === 'chest') total.chest = (total.chest || []).concat(b.chest);
      else total[k] = (total[k] || 0) + b[k];
    }
  }
  st.claimed = info.rank;
  grant(total); saveSoon();
  return total;
}
