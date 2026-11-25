// 32 mondes à thème (11 biomes × 3 cycles + le Cœur de la Nuée) — palettes, décors, ennemis, boss
import { hslHex } from '../engine/math.js';

export const THEMES = [
  { id: 'nebula', names: ['Nébuleuse Natale', 'Nébuleuse Écarlate', 'Nébuleuse Spectrale'], type: 'space', hues: [262, 335, 188], h2: 55, eoff: 25,
    deco: 'nebula', music: 'nebula', enemies: ['globule', 'dardeur', 'tournoyeur', 'meduse', 'spore'], boss: 'jelly', mini: 'eye',
    events: ['goldcomet', 'supernova', 'leviathan', 'meteors', 'swarm'], lore: 'Berceau de la Nuée, voilé de gaz roses.' },
  { id: 'coral', names: ['Jungle de Corail', 'Récif Sanglant', 'Corail Fantôme'], type: 'planet', hues: [172, 352, 215], h2: 140, eoff: -40,
    ground: 'coral', music: 'coral', enemies: ['globule', 'tournoyeur', 'mante', 'pollen', 'scindeur'], groundE: ['tourelle', 'fleurcanon', 'geode', 'fouisseur'], boss: 'flower', mini: 'crab',
    events: ['goldcomet', 'storm', 'crystalbubble', 'swarm'], lore: 'Une planète-océan où le corail chasse.' },
  { id: 'amber', names: ['Ceinture d’Ambre', 'Ceinture de Rouille', 'Ceinture d’Or Noir'], type: 'space', hues: [30, 12, 46], h2: -30, eoff: 160,
    deco: 'asteroids', music: 'amber', enemies: ['asteroide', 'dardeur', 'cuirasse', 'mante', 'glouton'], boss: 'dread', mini: 'mantis',
    events: ['meteors', 'goldcomet', 'gravity', 'supernova'], lore: 'Des astéroïdes fossilisés dans la résine stellaire.' },
  { id: 'swamp', names: ['Marais Phosphore', 'Marais des Brumes', 'Marais Toxique'], type: 'planet', hues: [105, 150, 78], h2: 170, eoff: 180,
    ground: 'swamp', music: 'swamp', enemies: ['glouton', 'globule', 'spore', 'pollen', 'scindeur'], groundE: ['fouisseur', 'nid', 'tourelle', 'geode'], boss: 'eye', mini: 'flower',
    events: ['goldcomet', 'storm', 'swarm', 'crystalbubble'], lore: 'Les gloutons y engraissent dans la vase lumineuse.' },
  { id: 'glacier', names: ['Glacier Cristallin', 'Glacier Boréal', 'Glacier d’Améthyste'], type: 'planet', hues: [195, 165, 270], h2: 40, eoff: 150,
    ground: 'ice', music: 'glacier', enemies: ['cristallier', 'tournoyeur', 'mante', 'spectre', 'raie'], groundE: ['tourelle', 'geode', 'canon', 'fouisseur'], boss: 'mantis', mini: 'jelly',
    events: ['meteors', 'crystalbubble', 'storm', 'supernova'], lore: 'Sous la glace, des cristaux vivants murmurent.' },
  { id: 'reef', names: ['Récif Stellaire', 'Récif d’Indigo', 'Récif Aurore'], type: 'space', hues: [222, 250, 160], h2: -60, eoff: 120,
    deco: 'reef', music: 'reef', enemies: ['raie', 'meduse', 'tournoyeur', 'nautile', 'globule'], boss: 'worm', mini: 'eye',
    events: ['leviathan', 'swarm', 'goldcomet', 'gravity'], lore: 'Des îles de corail flottent entre les étoiles.' },
  { id: 'volcano', names: ['Volcans de Néon', 'Forge Écarlate', 'Cratères de Soufre'], type: 'planet', hues: [10, 345, 52], h2: 25, eoff: 200,
    ground: 'lava', music: 'volcano', enemies: ['dardeur', 'mante', 'cuirasse', 'spore', 'scindeur'], groundE: ['rampeur', 'tourelle', 'canon', 'fouisseur'], boss: 'crab', mini: 'ring',
    events: ['meteors', 'storm', 'supernova', 'goldcomet'], lore: 'La lave y brille comme un néon fondu.' },
  { id: 'hive', names: ['Ventre de la Ruche', 'Entrailles Pourpres', 'Ruche Écarlate'], type: 'space', hues: [330, 290, 5], h2: -25, eoff: 30,
    deco: 'flesh', music: 'hive', enemies: ['pondeuse', 'globule', 'scindeur', 'glouton', 'pollen'], boss: 'eye', mini: 'flower',
    events: ['goldcomet', 'rift', 'swarm', 'gravity'], lore: 'Vous volez à l’intérieur d’une créature colossale.' },
  { id: 'dunes', names: ['Dunes de Verre', 'Désert d’Opale', 'Mer de Sable Noir'], type: 'planet', hues: [44, 190, 28], h2: 150, eoff: 180,
    ground: 'dunes', music: 'dunes', enemies: ['serpent', 'mante', 'raie', 'spectre', 'dardeur'], groundE: ['fouisseur', 'tourelle', 'geode', 'canon'], boss: 'worm', mini: 'mantis',
    events: ['storm', 'goldcomet', 'meteors', 'rift'], lore: 'Le vent sculpte des dunes de verre chantant.' },
  { id: 'quantum', names: ['Abysse Quantique', 'Abysse Miroir', 'Abysse Nul'], type: 'space', hues: [282, 158, 205], h2: 120, eoff: -80,
    deco: 'glitch', music: 'quantum', enemies: ['phasme', 'spectre', 'nautile', 'scindeur', 'mimique'], boss: 'ring', mini: 'jelly',
    events: ['rift', 'gravity', 'meteors', 'supernova'], lore: 'Ici, la réalité hésite entre deux états.' },
  { id: 'spores', names: ['Forêt des Spores', 'Bois Lunaire', 'Sylve Écarlate'], type: 'planet', hues: [290, 130, 345], h2: -150, eoff: 60,
    ground: 'mushroom', music: 'spores', enemies: ['spore', 'pollen', 'meduse', 'glouton', 'larve'], groundE: ['nid', 'fleurcanon', 'fouisseur', 'tourelle'], boss: 'seraph', mini: 'crab',
    events: ['swarm', 'goldcomet', 'crystalbubble', 'storm'], lore: 'Des champignons géants exhalent des nuages d’or.' },
  { id: 'heart', names: ['Cœur de la Nuée'], type: 'space', hues: [350], h2: -60, eoff: 20,
    deco: 'flesh', music: 'heart', enemies: ['globule', 'dardeur', 'nautile', 'spectre', 'glouton', 'meduse', 'mante', 'pondeuse', 'phasme', 'cuirasse', 'raie', 'cristallier'], boss: 'heart', mini: 'eye',
    events: ['goldcomet', 'rift', 'gravity', 'supernova', 'meteors', 'storm'], lore: 'La source de la Nuée. Le dernier soleil à rallumer.' },
];

const VETERANS = ['canonnier', 'lanceur', 'mortier', 'nautile', 'spectre', 'phasme', 'cuirasse', 'raie', 'mante', 'glouton', 'meduse', 'cristallier', 'mimique', 'pondeuse', 'scindeur', 'pollen'];

function bulletHue(h, h2) {
  const cands = [330, 350, 0, 305, 280, 318];
  let best = 330, bd = -1;
  const cd = (a, b) => { const d = Math.abs(((a - b) % 360 + 360) % 360); return Math.min(d, 360 - d); };
  for (const c of cands) { const d = Math.min(cd(c, h), cd(c, h2)); if (d > bd) { bd = d; best = c; } }
  return best;
}

export function makePalette(th, h) {
  const h2 = (h + th.h2 + 360) % 360, h3 = (h + 180) % 360, he = (h2 + th.eoff + 360) % 360;
  const bh = bulletHue(h, h2);
  return {
    hue: h,
    bg0: hslHex(h, 70, 3.5), bg1: hslHex(h2, 60, 9), bg2: hslHex(h, 55, 15),
    neb1: hslHex(h, 95, 50), neb2: hslHex(h2, 95, 55), neb3: hslHex(h3, 85, 55),
    g0: hslHex(h, 42, 10), g1: hslHex(h, 48, 17), g2: hslHex(h2, 55, 27), g3: hslHex(h, 35, 6),
    liquid: hslHex(h2, 100, 58), deco: hslHex(h2, 95, 62), deco2: hslHex(h3, 95, 64),
    enemy: hslHex(he, 82, 55), enemy2: hslHex((he + 150) % 360, 90, 62), eglow: hslHex(he, 100, 66), edark: hslHex(he, 70, 18),
    accent: hslHex(h3, 100, 62),
    bullet: hslHex(bh, 100, 60), bullet2: hslHex((bh + 340) % 360, 100, 68),
  };
}

export const WORLDS = [];
for (let w = 0; w < 32; w++) {
  const last = w === 31;
  const th = last ? THEMES[11] : THEMES[w % 11];
  const cyc = last ? 2 : Math.floor(w / 11);
  const hue = th.hues[last ? 0 : cyc];
  let enemies = th.enemies.slice();
  if (!last && cyc > 0) {
    const extra = VETERANS.filter((e) => !enemies.includes(e));
    for (let k = 0; k < cyc + 1 && extra.length; k++) enemies.push(extra.splice((w * 7 + k * 5) % extra.length, 1)[0]);
  }
  WORLDS.push({
    w, theme: th, cyc, name: th.names[last ? 0 : cyc], pal: makePalette(th, hue), hue, type: th.type,
    music: th.music, enemies, groundE: th.groundE || ['tourelle', 'geode', 'fouisseur'], boss: th.boss, mini: th.mini,
    lore: th.lore,
  });
}

export const LEVELS_PER_WORLD = 10;
export const TOTAL_LEVELS = WORLDS.length * LEVELS_PER_WORLD;
export const worldOf = (L) => WORLDS[Math.floor((L - 1) / 10)];
