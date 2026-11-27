// Quête principale : « La Couronne d'Astralume »
// 32 étoiles à rallumer (une par monde, en abattant son colosse), 3 actes + une finale,
// de grosses récompenses à chaque étoile, des reliques aux bonus permanents, une fin,
// puis la Nouvelle Aube (Crépuscule en Difficile, Éclipse en Cauchemar).
import { S, saveSoon } from './save.js';
import { grant, ownsShip, ownsDrone, levelStars } from './economy.js';
import { SHIP_BY_ID, DRONE_BY_ID } from './data.js';

export const CYCLES = [
  { id: 0, name: 'Aube', diff: 0, color: '#ffd23f', desc: 'Rallume les 32 étoiles de la Couronne.' },
  { id: 1, name: 'Crépuscule', diff: 1, color: '#ff8a3c', desc: 'Nouvelle Aube : rallume-les en Difficile.' },
  { id: 2, name: 'Éclipse', diff: 2, color: '#c35cff', desc: 'Ultime épreuve : rallume-les en Cauchemar.' },
];

export const PROLOGUE = [
  { who: 'archive', t: 'Il y a longtemps, trente-deux soleils formaient la Couronne d’Astralume. Leur lumière gardait la galaxie du froid et du silence.' },
  { who: 'archive', t: 'Puis la Nuée est venue : un essaim vivant, affamé de lumière. Monde après monde, ses colosses ont avalé le cœur des étoiles, et la Couronne s’est éteinte.' },
  { who: 'lyra', t: 'Tu es le dernier Allumeur. Chaque colosse garde un cœur d’étoile volé : abats-le, et son soleil se rallume. Rallume les 32, reforge la Couronne… et découvrons ce qui se cache au centre de la Nuée.' },
  { who: 'lyra', t: 'Je serai ta voix dans le noir. Des récompenses t’attendent à chaque étoile, et des reliques anciennes rendront ton vaisseau plus fort pour toujours. On y va ?' },
];

export const ACTS = [
  { n: 1, name: 'L’Éveil', from: 1, to: 11, color: '#38f2ff',
    intro: [{ who: 'lyra', t: 'Acte I — L’Éveil. Les premiers mondes de la Nuée. Ses colosses y sont jeunes… mais affamés. Commence par la Nébuleuse Natale.' }],
    outro: [{ who: 'archive', t: 'Onze étoiles brillent de nouveau. Mais l’Archive a capté un signal : la Nuée ne détruit pas les étoiles. Elle emporte leur lumière vers un point unique, tout au fond de la galaxie.' }] },
  { n: 2, name: 'La Traversée des Ombres', from: 12, to: 22, color: '#ff4fd8',
    intro: [{ who: 'lyra', t: 'Acte II — La Traversée des Ombres. La Nuée a remarqué ta lumière. Ses mondes se transforment pour te barrer la route : ils sont plus sombres, plus rapides, plus cruels.' }],
    outro: [{ who: 'lyra', t: 'Vingt-deux étoiles ! Les colonies reprennent espoir. Mais j’entends quelque chose battre au centre de la Nuée… comme un cœur. Il bat plus fort à chaque étoile que tu rallumes.' }] },
  { n: 3, name: 'La Reconquête', from: 23, to: 31, color: '#ffb43a',
    intro: [{ who: 'archive', t: 'Acte III — La Reconquête. Les étoiles rallumées chantent à nouveau et leur chant te guide. Plus que neuf soleils avant le Cœur de la Nuée.' }],
    outro: [{ who: 'lyra', t: 'Trente et une étoiles. La Couronne est presque complète. Il ne reste que le Cœur de la Nuée… et la dernière étoile, celle qui manque au centre. Prépare-toi, Allumeur.' }] },
  { n: 4, name: 'L’Aube d’Astralume', from: 32, to: 32, color: '#ffffff',
    intro: [{ who: 'archive', t: 'Finale — Le Cœur de la Nuée. La source de l’essaim. C’est là que dort la lumière volée de la galaxie entière.' }],
    outro: [] },
];

export const ENDING = [
  { who: 'archive', t: 'Le Cœur se fend… et au lieu des ténèbres, une lumière blanche jaillit.' },
  { who: 'archive', t: 'La Nuée n’était pas un monstre. C’était Astralume elle-même, la toute première étoile, mourante, qui dévorait les autres pour ne pas s’éteindre.' },
  { who: 'lyra', t: 'Grâce aux trente et un soleils que tu as rallumés, elle n’a plus faim. Regarde… la Nuée se dissout en milliers de lucioles.' },
  { who: 'archive', t: 'La Couronne d’Astralume est reforgée. Trente-deux soleils gardent à nouveau la galaxie.' },
  { who: 'lyra', t: 'Tu l’as fait, Allumeur. La galaxie a de nouveau un ciel. Mais les étoiles ont une mémoire… La Nouvelle Aube t’attend : rallume la Couronne en Difficile, puis en Cauchemar, pour des récompenses encore plus grandes.' },
];

// Les 32 étoiles de la Couronne (une par monde)
export const STARS = [
  ['Aurore', 'La première étoile ! Regarde comme elle brille… Plus que trente et une.'],
  ['Vesper', 'Vesper se rallume. Les colonies du Récif captent de nouveau sa chaleur.'],
  ['Sélène', 'Sélène illumine la Ceinture d’Ambre. Les astéroïdes y redeviennent dorés.'],
  ['Altaïr', 'Altaïr renaît… et dans son cœur, une relique : l’Éclat de l’Aube.'],
  ['Mira', 'Mira chasse la brume des Marais. Les lucioles reviennent.'],
  ['Rigel', 'Rigel, la géante bleue, brille de nouveau sur les glaciers.'],
  ['Véga', 'Véga rallumée ! Son chant guide les navires perdus.'],
  ['Deneb', 'Deneb gardait un trésor : le Sceau d’Or, qui attire la fortune.'],
  ['Capella', 'Capella réchauffe les Dunes de Verre. Elles chantent à nouveau.'],
  ['Antarès', 'Antarès flamboie, rouge et fière, au-dessus des volcans.'],
  ['Sirius', 'Sirius, la plus brillante ! Le premier arc de la Couronne est complet.'],
  ['Bellatrix', 'Bellatrix, la guerrière, cachait la Plume de Vesper : un bouclier dès le départ.'],
  ['Alcyone', 'Alcyone rallumée. Les nébuleuses retrouvent leurs couleurs.'],
  ['Électre', 'Électre crépite d’énergie. Les drones en vibrent.'],
  ['Mérope', 'Mérope, la discrète, brille enfin. Plus de la moitié du chemin !'],
  ['Castor', 'Castor renaît… avec l’Œil d’Oracle : tes drones voleront plus longtemps.'],
  ['Pollux', 'Pollux rejoint son jumeau Castor dans le ciel.'],
  ['Régulus', 'Régulus, le cœur du lion, rugit de lumière.'],
  ['Spica', 'Spica rallumée. Les forêts de spores fleurissent sous elle.'],
  ['Arcturus', 'Arcturus libère le Cœur Ardent : ta coque gagne un cœur pour toujours.'],
  ['Aldébaran', 'Aldébaran, l’œil du taureau, s’ouvre de nouveau.'],
  ['Bételgeuse', 'Bételgeuse, l’immense ! Le deuxième arc de la Couronne est complet.'],
  ['Fomalhaut', 'Fomalhaut, la solitaire, retrouve sa place dans la Couronne.'],
  ['Achernar', 'Achernar gardait le Prisme Royal : ta spéciale se charge plus vite.'],
  ['Canopus', 'Canopus, la boussole des anciens, pointe vers le Cœur.'],
  ['Polaris', 'Polaris rallumée. Le ciel a de nouveau un nord.'],
  ['Thuban', 'Thuban, l’étoile du dragon, s’éveille d’un long sommeil.'],
  ['Shaula', 'Shaula cachait la Couronne Brisée, fragment de l’ancien pouvoir.'],
  ['Alnilam', 'Alnilam brille au centre de la Ceinture. Plus que trois.'],
  ['Mintaka', 'Mintaka rallumée. Le Cœur de la Nuée tremble.'],
  ['Alnitak', 'Alnitak complète le troisième arc. Il ne reste que le centre.'],
  ['Astralume', 'Astralume, la première étoile, renaît. La Couronne est reforgée.'],
].map(([name, text], i) => ({ k: i + 1, name, text }));

// Reliques : bonus permanents actifs une fois la récompense récupérée
export const RELICS = {
  4: { name: 'Éclat de l’Aube', desc: '+8 % de dégâts', b: { dmg: 0.08 } },
  8: { name: 'Sceau d’Or', desc: '+15 % de pièces', b: { coins: 0.15 } },
  12: { name: 'Plume de Vesper', desc: '+1 bouclier au décollage', b: { shield: 1 } },
  16: { name: 'Œil d’Oracle', desc: 'Drones : +25 % de durée', b: { drone: 0.25 } },
  20: { name: 'Cœur Ardent', desc: '+1 cœur de coque', b: { hull: 1 } },
  24: { name: 'Prisme Royal', desc: 'Spéciale chargée 20 % plus vite', b: { charge: 0.2 } },
  28: { name: 'Couronne Brisée', desc: '+10 % de dégâts et de pièces', b: { dmg: 0.1, coins: 0.1 } },
  32: { name: 'Couronne d’Astralume', desc: '+15 % de dégâts et de pièces', b: { dmg: 0.15, coins: 0.15 } },
};
const SHIP_GIFT = { 3: 'lance', 7: 'essaim', 11: 'tonnerre', 15: 'diapason', 19: 'singularite', 22: 'faucheuse', 26: 'kaleido', 31: 'phenix' };
const DRONE_GIFT = { 2: 'egide', 6: 'foreur', 9: 'echo', 14: 'lumen', 18: 'prisme' };
export const ACT_END = { 11: 1, 22: 2, 31: 3, 32: 4 };

export function actOf(k) { return ACTS.find((a) => k >= a.from && k <= a.to); }

function st() {
  if (!S.quest) S.quest = {};
  const q = S.quest;
  if (!q.claimed) q.claimed = { 0: [], 1: [], 2: [] };
  for (const c of [0, 1, 2]) if (!q.claimed[c]) q.claimed[c] = [];
  if (!q.seen) q.seen = { prologue: false, acts: {}, ending: false, cycles: {} };
  if (!q.seen.acts) q.seen.acts = {};
  if (!q.seen.cycles) q.seen.cycles = {};
  if (!q.told) q.told = { 0: [], 1: [], 2: [] };
  if (q.cycle === undefined) q.cycle = 0;
  return q;
}
export function questState() { return st(); }

// Une étoile k est rallumée dans un cycle si le colosse du monde k a été vaincu dans la difficulté du cycle (ou plus dure)
export function isLit(k, c = 0) { const a = levelStars(k * 10); for (let d = c; d < 3; d++) if (a[d] > 0) return true; return false; }
export function litCount(c = 0) { let n = 0; for (let k = 1; k <= 32; k++) if (isLit(k, c)) n++; return n; }
export function cycleUnlocked(c) { return c === 0 || litCount(c - 1) >= 32; }
export function isClaimed(k, c = 0) { return st().claimed[c].includes(k); }
export function claimable(c) { let n = 0; for (let k = 1; k <= 32; k++) if (isLit(k, c) && !isClaimed(k, c)) n++; return n; }
export function claimableAll() { return claimable(0) + (cycleUnlocked(1) ? claimable(1) : 0) + (cycleUnlocked(2) ? claimable(2) : 0); }

// Récompense d'une étoile (grosse, et de plus en plus généreuse)
export function starReward(k, c = 0) {
  let b;
  if (c === 0) {
    b = { coins: 1000 + 300 * k, crystals: 25 + 6 * k, gems: 5 + Math.round(k * 1.2), chest: k % 4 === 0 ? 'astral' : 'prism' };
    if (SHIP_GIFT[k]) { const id = SHIP_GIFT[k]; if (!ownsShip(id)) b.ship = id; else { b.shards = { [id]: 40 }; b.gems += 40; } }
    if (DRONE_GIFT[k]) { const id = DRONE_GIFT[k]; if (!ownsDrone(id)) b.drone = id; else b.gems += 25; }
    if (ACT_END[k]) { b.gems += 50; b.chest = [b.chest, 'astral', 'astral']; }
    if (k === 32) { b.gems = 300; b.coins = 50000; b.crystals = 800; b.chest = ['astral', 'astral', 'astral', 'astral', 'astral']; }
  } else if (c === 1) {
    b = { gems: 10 + k, crystals: 60 + 8 * k, parts: 4 + Math.round(k / 2), chest: k % 3 === 0 ? 'astral' : 'prism' };
    if (k === 32) { b.gems = 500; b.chest = ['astral', 'astral', 'astral', 'astral', 'astral']; }
  } else {
    b = { gems: 20 + 2 * k, parts: 10 + k, crystals: 100 + 10 * k, chest: 'astral' };
    if (k === 32) { b.gems = 1000; b.chest = ['astral', 'astral', 'astral', 'astral', 'astral', 'astral', 'astral', 'astral']; }
  }
  return b;
}
export function starExtra(k, c = 0) { // ce qui rend une étoile spéciale (affichage)
  const o = [];
  if (c === 0 && RELICS[k]) o.push({ type: 'relic', ...RELICS[k] });
  if (c === 0 && SHIP_GIFT[k]) o.push({ type: 'ship', id: SHIP_GIFT[k], name: SHIP_BY_ID[SHIP_GIFT[k]].name });
  if (c === 0 && DRONE_GIFT[k]) o.push({ type: 'drone', id: DRONE_GIFT[k], name: DRONE_BY_ID[DRONE_GIFT[k]].name });
  if (ACT_END[k]) o.push({ type: 'act', n: ACT_END[k] });
  return o;
}
export function claimStar(k, c = 0) {
  const q = st();
  if (!isLit(k, c) || isClaimed(k, c)) return null;
  const b = starReward(k, c);
  q.claimed[c].push(k);
  grant(b);
  saveSoon();
  return b;
}

// Bonus permanents des reliques récupérées
export function questBonus() {
  const q = st(), out = { dmg: 0, coins: 0, shield: 0, drone: 0, hull: 0, charge: 0 };
  for (const k of q.claimed[0]) { const r = RELICS[k]; if (r) for (const x in r.b) out[x] += r.b[x]; }
  return out;
}

// Prochain objectif : la première étoile éteinte du cycle en cours
export function currentCycle() { const q = st(); let c = q.cycle || 0; while (c > 0 && !cycleUnlocked(c)) c--; return c; }
export function nextStar(c = currentCycle()) { for (let k = 1; k <= 32; k++) if (!isLit(k, c)) return STARS[k - 1]; return null; }
export function objective(c = currentCycle()) {
  const s = nextStar(c);
  if (!s) return { done: true, c };
  const L = s.k * 10, reach = Math.min(S.maxLevel, L);
  return { done: false, c, star: s, act: actOf(s.k), world: s.k - 1, L, reach, atBoss: S.maxLevel >= L, lit: litCount(c) };
}
// Prochaine grosse récompense (relique, vaisseau, fin d'acte)
export function nextBig(c = currentCycle()) {
  for (let k = 1; k <= 32; k++) { if (isLit(k, c)) continue; const ex = starExtra(k, c); if (ex.length) return { k, ex }; }
  return null;
}
// Récits à raconter (étoiles nouvellement rallumées, nouveaux actes)
export function pendingTales() {
  const q = st(), out = [];
  for (const c of [0, 1, 2]) for (let k = 1; k <= 32; k++) if (isLit(k, c) && !q.told[c].includes(k)) out.push({ k, c });
  return out;
}
export function markTold(k, c) { const q = st(); if (!q.told[c].includes(k)) q.told[c].push(k); saveSoon(); }
export function markSeen(key, v = true) { const q = st(); if (key === 'prologue' || key === 'ending') q.seen[key] = v; else if (key.startsWith('act')) q.seen.acts[key.slice(3)] = v; else if (key.startsWith('cycle')) q.seen.cycles[key.slice(5)] = v; saveSoon(); }
export function setCycle(c) { const q = st(); if (cycleUnlocked(c)) { q.cycle = c; saveSoon(); } }
