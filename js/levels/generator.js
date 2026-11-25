// Générateur de niveaux : 320 niveaux uniques (vagues, formations, événements, traits, boss)
import { WORLDS, worldOf } from './worlds.js';
import { RNG, hash32 } from '../engine/math.js';

export const CLS = {
  globule: 's', dardeur: 's', tournoyeur: 's', larve: 'xs', scindeur: 'm', nautile: 'm', spectre: 'm', glouton: 'm',
  meduse: 'm', mante: 'm', pondeuse: 'l', mimique: 's', pollen: 's', serpent: 'snake', spore: 's', cuirasse: 'm',
  raie: 'm', phasme: 'm', asteroide: 'm', cristallier: 'm', bulle: 's',
  canonnier: 's', mortier: 's', lanceur: 'm', emissile: 'xs', obus: 'xs',
};
const FORMS = {
  s: ['line', 'column', 'vee', 'pincer', 'circle', 'rain', 'grid', 'sides', 'zig', 'arc', 'column', 'loop'],
  m: ['line', 'column', 'pair', 'arc', 'sides', 'rain', 'single', 'pincer'],
  l: ['single', 'pair'],
  snake: ['snake'],
};
const COUNT = {
  line: [7, 11], column: [7, 11], vee: [7, 11], pincer: [10, 14], circle: [8, 12], rain: [10, 15], grid: [9, 14], sides: [6, 9], zig: [5, 8],
  arc: [7, 10], loop: [7, 10], pair: [2, 2], single: [1, 1], snake: [1, 1],
};
const M_COUNT = { line: [3, 5], column: [3, 5], pair: [2, 2], arc: [3, 5], sides: [3, 5], rain: [4, 6], single: [1, 1], pincer: [4, 6] };

export const TRAITS = {
  essaim: { name: 'Essaim', desc: 'Plus d’ennemis, mais plus fragiles' },
  blindes: { name: 'Blindés', desc: 'Ennemis coriaces, butin +25 %' },
  ruee: { name: 'Ruée', desc: 'Les vagues s’enchaînent sans répit' },
  vent: { name: 'Vent solaire', desc: 'Les tirs ennemis dérivent' },
  nuit: { name: 'Nuit noire', desc: 'Visibilité réduite, pièces +30 %' },
  elites: { name: 'Élites', desc: 'Deux élites dorées rôdent' },
  tresor: { name: 'Trésor', desc: 'Pièces abondantes… et des imposteurs' },
};
export const KIND_NAMES = {
  normal: 'Mission', coins: 'Pluie de pièces', bonus: 'Mine de cristaux', challenge: 'Défi', miniboss: 'Gardien', boss: 'Colosse',
};
export const CHALLENGES = {
  glass: { name: 'Coque de verre', desc: 'Un seul cœur, aucun bouclier. Récompenses ×1,5.' },
  survive: { name: 'Tempête IEM', desc: 'Armes hors service : esquivez pendant 30 secondes.' },
  hunt: { name: 'Chasse à l’or', desc: 'Abattez les élites dorées avant qu’elles ne fuient.' },
  time: { name: 'Contre-la-montre', desc: 'Détruisez 40 aliens le plus vite possible.' },
};
const ARCH_NAMES = {
  jelly: 'Méduse Matriarche', flower: 'Fleur Dévorante', crab: 'Crabe-Citadelle', eye: 'Œil de la Nuée',
  mantis: 'Mante Prismatique', worm: 'Grand Ver Astral', heart: 'Cœur de la Nuée',
};
const MINI_NAMES = {
  jelly: 'Méduse sentinelle', flower: 'Bourgeon carnivore', crab: 'Crabe gardien', eye: 'Œil veilleur',
  mantis: 'Mante éclaireuse', worm: 'Ver gardien', heart: 'Cœur gardien',
};
const EPITHETS = ['d’Opale', 'Aux Mille Lueurs', 'l’Insatiable', 'du Vide', 'la Dévoreuse', 'Écarlate', 'des Abysses', 'l’Ancienne', 'Prismatique', 'du Crépuscule', 'Sans Repos', 'la Vorace'];

export const DIFF_P = [
  { hp: 1, fire: 0.55, bspd: 0.85, dens: 1, loot: 1 },
  { hp: 1.45, fire: 0.95, bspd: 1.02, dens: 1.15, loot: 1.4 },
  { hp: 2.1, fire: 1.4, bspd: 1.18, dens: 1.3, loot: 1.9 },
];

export function levelKind(L) {
  const i = (L - 1) % 10;
  if (i === 9) return 'boss';
  if (i === 4) return 'miniboss';
  if (i === 2) return Math.floor((L - 1) / 10) % 2 === 0 ? 'coins' : 'bonus';
  if (i === 7) return 'challenge';
  return 'normal';
}
export function challengeOf(L) { return ['glass', 'hunt', 'time', 'survive'][Math.floor((L - 1) / 10) % 4]; }
export function traitOf(L) {
  if (L < 6 || levelKind(L) !== 'normal') return null;
  const r = new RNG(hash32(L, 31337));
  if (!r.chance(0.5)) return null;
  return r.pick(Object.keys(TRAITS));
}
export function isPlanetLevel(L) {
  const W = worldOf(L), i = (L - 1) % 10;
  if (W.type === 'planet') return !(i === 0 || i === 6);   // approche orbitale
  return i === 5 || i === 8;                               // survol d'un astéroïde-planète
}
export function bossName(L) {
  const W = worldOf(L), k = levelKind(L);
  if (k === 'boss') return W.w === 31 ? ARCH_NAMES.heart : `${ARCH_NAMES[W.boss]} ${EPITHETS[W.w % EPITHETS.length]}`;
  if (k === 'miniboss') return MINI_NAMES[W.mini];
  return null;
}

export function levelInfo(L) {
  const W = worldOf(L), i = (L - 1) % 10;
  const kind = levelKind(L);
  const info = {
    L, w: W.w, i, world: W, kind, planet: isPlanetLevel(L), trait: traitOf(L),
    code: `${W.w + 1}-${i + 1}`, name: W.name, kindName: KIND_NAMES[kind],
  };
  if (kind === 'challenge') info.challenge = challengeOf(L);
  if (kind === 'boss' || kind === 'miniboss') info.boss = bossName(L);
  if (kind === 'coins' || kind === 'bonus') info.planet = false;
  return info;
}

export function buildLevel(L, diff) {
  const info = levelInfo(L);
  const rng = new RNG(hash32(L, 9137));
  const P = DIFF_P[diff];
  const prog = L - 1;
  const W = info.world;
  const def = {
    ...info, diff, pal: W.pal, seed: hash32(L, 7),
    D: {
      hp: (1 + 0.038 * prog) * P.hp * (info.trait === 'blindes' ? 1.35 : 1) * (info.trait === 'essaim' ? 0.7 : 1),
      fire: P.fire * (0.45 + 0.55 * Math.min(1, prog / 45)) * (L <= 2 ? 0.4 : 1),
      bspd: P.bspd * (1 + Math.min(0.3, prog * 0.0012)),
      dens: P.dens * (info.trait === 'essaim' ? 1.45 : 1),
      loot: P.loot * (1 + 0.025 * prog) * (info.trait === 'blindes' ? 1.25 : 1) * (info.trait === 'tresor' ? 1.5 : 1) * (info.trait === 'nuit' ? 1.3 : 1),
      prog,
    },
    timeline: [],
    music: W.music,
  };
  const tl = def.timeline;
  switch (info.kind) {
    case 'coins': buildCoins(def, rng); def.music = 'bonus'; break;
    case 'bonus': buildBonus(def, rng); def.music = 'bonus'; break;
    case 'challenge': buildChallenge(def, rng); def.music = 'challenge'; break;
    case 'miniboss': buildWaves(def, rng, 3, false); addBoss(def, rng, true); break;
    case 'boss': buildWaves(def, rng, 3 + (prog > 100 ? 1 : 0), false); addBoss(def, rng, false); def.bossMusic = W.w % 2 ? 'boss2' : 'boss'; break;
    default: buildWaves(def, rng, 0, true);
  }
  tl.sort((a, b) => a.t - b.t);
  def.duration = tl.length ? tl[tl.length - 1].t + 6 : 30;
  return def;
}

// ---------- Vagues ----------
function pickType(pool, last, rng, small) {
  let cands = pool.filter((t) => !last.includes(t));
  if (small) cands = cands.filter((t) => CLS[t] === 's') ;
  if (!cands.length) cands = pool;
  return rng.pick(cands);
}
function pickForm(cls, last, rng) {
  let c = FORMS[cls].filter((f) => !last.includes(f));
  if (!c.length) c = FORMS[cls];
  return rng.pick(c);
}
function countFor(type, form, rng, D, intensity) {
  const cls = CLS[type];
  if (cls === 'm') { const r = M_COUNT[form] || [2, 3]; return rng.int(r[0], r[1]) + (D.dens > 1.2 && rng.chance(0.4) ? 1 : 0); }
  if (cls === 'l' || cls === 'snake') return 1;
  const r = COUNT[form] || [5, 7];
  return Math.round(rng.int(r[0], r[1]) * D.dens * (0.85 + intensity * 0.3));
}

function buildWaves(def, rng, forced, full) {
  const tl = def.timeline, D = def.D, W = def.world;
  const prog = D.prog;
  let pool = W.enemies.slice();
  if (def.L <= 2) pool = ['globule', 'dardeur', 'tournoyeur'];
  else if (def.L <= 6) pool = pool.filter((t) => !['pondeuse', 'serpent', 'phasme', 'cuirasse'].includes(t)).concat(['globule']);
  if (def.trait === 'tresor') pool.push('mimique');
  const nW = forced || (12 + Math.min(5, Math.floor(prog / 40)) + rng.int(0, 2) + (def.trait === 'ruee' ? 2 : 0));
  const gap = def.trait === 'ruee' ? 0.7 : 1;
  let t = 2.6;
  const lastT = [], lastF = [];
  const eventAt = full ? rng.int(2, Math.max(3, nW - 3)) : -1;
  const event2At = full && prog > 60 && rng.chance(0.35) ? Math.min(nW - 2, eventAt + 3) : -1;
  const novaAt = full ? rng.int(2, nW - 2) : 1;
  const eliteWaves = [];
  if (full && (prog > 8 && rng.chance(0.55))) eliteWaves.push(rng.int(3, nW - 2));
  if (def.trait === 'elites') eliteWaves.push(rng.int(1, 3), nW - 2);
  const carriers = new Set([0, 2, 4, 6, 8, 10].filter((x) => x < nW));
  const events = W.theme.events;
  tl.push({ t: 0.3, kind: 'banner' });
  tl.push({ t: 1.4, kind: 'radio', key: def.trait ? 'trait' : 'start' });
  const armadas = [], swarms = [], walls = [];
  if (full && def.L >= 3) armadas.push(Math.floor(nW * 0.42));
  if (full && def.L >= 12) armadas.push(Math.floor(nW * 0.8));
  if (full && prog > 120 && rng.chance(0.5)) armadas.push(Math.floor(nW * 0.2));
  if (full && def.L >= 5) swarms.push(Math.floor(nW * 0.62));
  if (full && prog > 50 && rng.chance(0.5)) swarms.push(Math.floor(nW * 0.3));
  if (full && def.L >= 8 && rng.chance(0.55)) walls.push(Math.floor(nW * 0.55) === swarms[0] ? Math.floor(nW * 0.7) : Math.floor(nW * 0.55));
  const smalls = pool.filter((x) => CLS[x] === 's' && x !== 'mimique');
  // Chorégraphies (parades) : les aliens entrent en figures puis se rangent en formation
  const parades = [];
  if (full) { parades.push(1); if (def.L >= 4) parades.push(Math.floor(nW * 0.5)); if (def.L >= 10) parades.push(nW - 2); }
  else parades.push(0);
  let paradeN = 0;
  for (let w = 0; w < nW; w++) {
    const intensity = nW > 1 ? w / (nW - 1) : 1;
    if (parades.includes(w) && !armadas.includes(w) && !swarms.includes(w)) {
      const danger = def.L > 3 && (paradeN > 0 || rng.chance(0.3)) && rng.chance(0.45 + Math.min(0.35, prog / 300));
      const rows = def.L < 6 ? 3 : prog > 80 ? 4 : rng.int(3, 4), cols = prog > 60 ? 7 : 6;
      const calmTypes = ['globule', 'tournoyeur'];
      const types = [];
      for (let r = 0; r < rows; r++) types.push(danger && r >= rows - 2 && prog > 10 ? rng.pick(['canonnier', 'mortier', 'globule']) : calmTypes[(r + paradeN) % 2]);
      const kinds = rng.shuffle(['loop', 'spiral', 'eight', 'snake', 'cascade', 'cross']);
      tl.push({ t, kind: 'wave', form: 'parade', type: types[0], types, rows, cols, n: rows * cols - Math.floor(rows / 2), danger, choreo: kinds, prog, stay: 11 + rows, seed: rng.int(1, 1e9), carrier: true });
      tl.push({ t: t + 0.3, kind: 'radio', key: danger ? 'paradeD' : 'parade' });
      paradeN++;
      t += 12 + rows * 2;
      if (!full) continue;
    }
    if (armadas.includes(w)) {
      const front = smalls.length ? rng.pick(smalls) : 'globule';
      const front2 = smalls.length > 1 ? rng.pick(smalls.filter((x) => x !== front)) : front;
      const rows = def.L < 12 ? 3 : prog > 140 ? 5 : 4;
      const cols = prog > 100 ? 7 : 6;
      const types = [front, front2, rng.pick(['canonnier', 'mortier']), rng.pick(['lanceur', 'canonnier']), rng.pick(['mortier', 'lanceur'])].slice(0, rows);
      tl.push({ t, kind: 'wave', form: 'armada', type: front, types, rows, cols, n: rows * cols, stay: 14 + rows, seed: rng.int(1, 1e9), carrier: true });
      tl.push({ t: t + 0.2, kind: 'radio', key: 'armada' });
      t += 9.5;
      continue;
    }
    if (swarms.includes(w) || walls.includes(w)) {
      const sw = swarms.includes(w);
      const type = rng.pick(['globule', 'globule', 'tournoyeur']);
      const n = sw ? Math.round(rng.int(19, 25) * D.dens + Math.min(10, prog / 25)) : 0;
      if (sw) tl.push({ t, kind: 'wave', type, form: 'swarm', n, seed: rng.int(1, 1e9), carrier: true });
      else {
        const rows = prog > 60 ? 3 : 2, types = rng.chance(0.5) ? ['globule', 'tournoyeur', 'globule'] : ['tournoyeur', 'globule', 'tournoyeur'];
        tl.push({ t, kind: 'wave', type: types[0], types, form: 'wall', rows, cols: 7, n: rows * 7, seed: rng.int(1, 1e9), carrier: true });
      }
      tl.push({ t: t + 0.2, kind: 'radio', key: sw ? 'swarm' : 'armada' });
      t += sw ? 10 : 8;
      continue;
    }
    const type = pickType(pool, lastT, rng, w === 0 && full);
    const cls = CLS[type];
    const form = pickForm(cls === 'xs' ? 's' : cls, lastF, rng);
    const n = countFor(type, form, rng, D, intensity);
    tl.push({ t, kind: 'wave', type, form, n, seed: rng.int(1, 1e9), elite: eliteWaves.includes(w), carrier: carriers.has(w), nova: w === novaAt });
    lastT.push(type); if (lastT.length > 2) lastT.shift();
    lastF.push(form); if (lastF.length > 2) lastF.shift();
    // Vague d'appui (montée en tension)
    if (full && (w === nW - 1 || (intensity > 0.5 && rng.chance(0.3 + prog / 600)))) {
      const t2 = pickType(pool, [type], rng, false);
      const c2 = CLS[t2];
      const f2 = pickForm(c2 === 'xs' ? 's' : c2, [form], rng);
      tl.push({ t: t + rng.range(1.2, 2.4), kind: 'wave', type: t2, form: f2, n: countFor(t2, f2, rng, D, intensity), seed: rng.int(1, 1e9) });
    }
    if (w === eventAt || w === event2At) tl.push({ t: t + 2.2, kind: 'event', id: rng.pick(events) });
    if (def.planet) {
      const gn = rng.int(1, 2) + (intensity > 0.5 ? 1 : 0);
      for (let k = 0; k < gn; k++) {
        tl.push({ t: t + 1 + k * rng.range(1.5, 2.8), kind: 'ground', type: rng.pick(W.groundE), form: rng.pick(['gline', 'gpair', 'gcluster', 'gsingle', 'gpair']), seed: rng.int(1, 1e9) });
      }
    } else if (W.theme.deco === 'asteroids' && rng.chance(0.4)) {
      tl.push({ t: t + 2, kind: 'wave', type: 'asteroide', form: 'rain', n: rng.int(2, 4), seed: rng.int(1, 1e9) });
    }
    if (rng.chance(0.28) && w > 0 && w < nW - 1) tl.push({ t: t + 2.5, kind: 'radio', key: 'chatter' });
    t += (rng.range(4.4, 6.4) - intensity * 0.9) * gap;
  }
  if (full) tl.push({ t: t + 0.5, kind: 'end' });
}

function addBoss(def, rng, mini) {
  const tl = def.timeline;
  const t = tl.reduce((m, e) => Math.max(m, e.t), 0) + 5;
  const W = def.world;
  const arch = mini ? W.mini : W.boss;
  tl.push({ t: t - 1.5, kind: 'radio', key: 'boss' });
  tl.push({ t, kind: 'boss', arch, mini, tier: Math.min(3, W.cyc + (W.w % 11 >= 6 ? 1 : 0)), name: def.boss });
}

// ---------- Niveaux spéciaux ----------
function buildCoins(def, rng) {
  const tl = def.timeline;
  tl.push({ t: 0.3, kind: 'banner' });
  tl.push({ t: 1.2, kind: 'radio', key: 'coins' });
  const pats = ['line', 'sine', 'spiral', 'heart', 'diamond', 'zigzag', 'star', 'wave2'];
  let t = 2.5;
  for (let k = 0; k < 12; k++) {
    tl.push({ t, kind: 'coinpat', pat: pats[(k + rng.int(0, 7)) % pats.length], seed: rng.int(1, 1e9) });
    if (k % 3 === 1) tl.push({ t: t + 1, kind: 'wave', type: 'bulle', form: rng.pick(['rain', 'line', 'arc']), n: rng.int(4, 7), seed: rng.int(1, 1e9) });
    if (k === 4 || k === 9) tl.push({ t: t + 0.5, kind: 'event', id: 'goldcomet' });
    if (k === 6) tl.push({ t: t + 1.2, kind: 'wave', type: 'mimique', form: 'line', n: 3, seed: rng.int(1, 1e9) });
    t += 2.6;
  }
  tl.push({ t: t + 1, kind: 'end' });
  def.noFire = true;
}
function buildBonus(def, rng) {
  const tl = def.timeline;
  tl.push({ t: 0.3, kind: 'banner' });
  tl.push({ t: 1.2, kind: 'radio', key: 'bonus' });
  let t = 2.4;
  for (let k = 0; k < 9; k++) {
    tl.push({ t, kind: 'wave', type: 'asteroide', form: rng.pick(['rain', 'line', 'sides']), n: rng.int(4, 7), seed: rng.int(1, 1e9), rich: true });
    if (k % 3 === 2) tl.push({ t: t + 1.5, kind: 'event', id: 'crystalbubble' });
    if (k === 4) tl.push({ t: t + 1, kind: 'wave', type: 'globule', form: 'vee', n: 6, seed: rng.int(1, 1e9) });
    t += 3.4;
  }
  tl.push({ t: t + 1, kind: 'wave', type: 'asteroide', form: 'single', n: 1, seed: 1, giant: true });
  tl.push({ t: t + 6, kind: 'end' });
  def.D.fire *= 0.35;
}
function buildChallenge(def, rng) {
  const c = def.challenge;
  const tl = def.timeline;
  if (c === 'glass') { buildWaves(def, rng, 0, true); def.glass = true; return; }
  tl.push({ t: 0.3, kind: 'banner' });
  tl.push({ t: 1.2, kind: 'radio', key: 'challenge' });
  const pool = def.world.enemies.filter((x) => CLS[x] === 's' || CLS[x] === 'm');
  if (c === 'hunt') {
    let t = 3;
    for (let k = 0; k < 5; k++) {
      tl.push({ t, kind: 'wave', type: rng.pick(pool), form: 'single', n: 1, seed: rng.int(1, 1e9), elite: true, flee: true });
      tl.push({ t: t + 1.5, kind: 'wave', type: rng.pick(pool), form: rng.pick(['vee', 'line', 'rain', 'column']), n: 6, seed: rng.int(1, 1e9) });
      t += 8.5;
    }
    tl.push({ t: t + 1, kind: 'end' });
    def.goal = { kind: 'hunt', n: 5 };
  } else if (c === 'time') {
    let t = 2.2;
    for (let k = 0; k < 14; k++) { tl.push({ t, kind: 'wave', type: rng.pick(pool.filter((x) => CLS[x] === 's').concat(['globule'])), form: rng.pick(['rain', 'line', 'vee', 'grid', 'column']), n: 6, seed: rng.int(1, 1e9) }); t += 2.6; }
    tl.push({ t: t + 1, kind: 'end' });
    def.goal = { kind: 'time', n: 40, limit: 45 };
  } else {
    let t = 2.5;
    for (let k = 0; k < 9; k++) { tl.push({ t, kind: 'storm', seed: rng.int(1, 1e9), k }); t += 3.4; }
    tl.push({ t: 32.5, kind: 'end' });
    def.goal = { kind: 'survive', limit: 32 };
    def.noWeapons = true;
  }
}

export { WORLDS };
