// Données statiques : vaisseaux, drones, améliorations, raretés, monnaies
export const CUR = {
  coins: { name: 'Pièces', one: 'pièce', color: '#ffd23f' },
  crystals: { name: 'Cristaux', one: 'cristal', color: '#38f2ff' },
  gems: { name: 'Gemmes', one: 'gemme', color: '#ff4fd8' },
  parts: { name: 'Composants', one: 'composant', color: '#ff9d3c' },
};
export const CUR_KEYS = ['coins', 'crystals', 'gems', 'parts'];

export const RARITY = [
  { id: 0, name: 'Commun', color: '#5dffa0' },
  { id: 1, name: 'Rare', color: '#3dbdff' },
  { id: 2, name: 'Épique', color: '#c35cff' },
  { id: 3, name: 'Légendaire', color: '#ffc23d' },
];

export const SHIPS = [
  { id: 'etincelle', name: 'Étincelle', rarity: 0, color: '#38f2ff', color2: '#c8fbff',
    desc: 'Chasseur agile et polyvalent. Ses tirs jumelés s’ouvrent en éventail.',
    weapon: 'Tirs jumelés en éventail', special: 'Nova', sdesc: 'Trois anneaux de choc balaient l’écran et changent les tirs ennemis en pièces.',
    cost: null, req: 1 },
  { id: 'paon', name: 'Paon', rarity: 0, color: '#3dffc0', color2: '#ffe27a',
    desc: 'Ailes déployées en plumes de lumière : couvre tout l’écran.',
    weapon: 'Large éventail de plumes', special: 'Roue de plumes', sdesc: 'Une roue de plumes tourbillonnante tire dans toutes les directions.',
    cost: { coins: 2500 }, req: 6 },
  { id: 'lance', name: 'Lance-Prisme', rarity: 1, color: '#ff4fd8', color2: '#ffd1f4',
    desc: 'Un prisme concentre la lumière en un laser continu dévastateur.',
    weapon: 'Laser continu perçant', special: 'Rayon absolu', sdesc: 'Un rayon colossal qui pulvérise tout sur sa colonne.',
    cost: { crystals: 120 }, req: 11 },
  { id: 'essaim', name: 'Essaim', rarity: 1, color: '#ff9d3c', color2: '#ffe0a8',
    desc: 'Une ruche volante qui lâche des missiles à tête chercheuse.',
    weapon: 'Missiles à tête chercheuse', special: 'Ruche', sdesc: 'Quarante micro-missiles traquent chaque cible.',
    cost: { crystals: 180, coins: 4000 }, req: 21 },
  { id: 'tonnerre', name: 'Tonnerre', rarity: 2, color: '#ffe94a', color2: '#b98cff',
    desc: 'Ses bobines libèrent des éclairs qui sautent d’ennemi en ennemi.',
    weapon: 'Éclairs en chaîne', special: 'Tempête', sdesc: 'La foudre frappe chaque ennemi à l’écran, encore et encore.',
    cost: { crystals: 260, gems: 15 }, req: 31 },
  { id: 'diapason', name: 'Diapason', rarity: 2, color: '#a77bff', color2: '#7fe9ff',
    desc: 'Deux branches résonantes émettent des ondes qui traversent tout.',
    weapon: 'Ondes perçantes', special: 'Onde de choc', sdesc: 'Des ondes géantes figent les ennemis et effacent leurs tirs.',
    cost: { crystals: 340, gems: 25 }, req: 41 },
  { id: 'singularite', name: 'Singularité', rarity: 2, color: '#b06bff', color2: '#ffffff',
    desc: 'Un anneau qui tire des orbes implosant en mini trous noirs.',
    weapon: 'Orbes gravitationnels', special: 'Horizon', sdesc: 'Un trou noir avale ennemis et projectiles avant d’exploser.',
    cost: { gems: 45, parts: 40 }, req: 61 },
  { id: 'faucheuse', name: 'Faucheuse solaire', rarity: 3, color: '#ffb02f', color2: '#ff4f3c',
    desc: 'Des lames solaires tournoient autour de la coque et tranchent les tirs.',
    weapon: 'Lames orbitales + plasma', special: 'Éclipse', sdesc: 'Le vaisseau devient un soleil invulnérable qui brûle tout autour.',
    cost: { gems: 70, parts: 60 }, req: 81 },
  { id: 'kaleido', name: 'Kaléido', rarity: 3, color: '#7dfcff', color2: '#ff7dfc',
    desc: 'Des éclats de prisme rebondissent sur les bords et se divisent à l’impact.',
    weapon: 'Éclats ricochets', special: 'Fractale', sdesc: 'Une explosion fractale d’éclats qui se divisent sans fin.',
    cost: { gems: 100, parts: 90 }, req: 111 },
  { id: 'phenix', name: 'Phénix', rarity: 3, color: '#ff5a2a', color2: '#ffd23f',
    desc: 'Légendaire. Crache un torrent de flammes et renaît une fois par niveau.',
    weapon: 'Torrent de flammes', special: 'Brasier', sdesc: 'Des ailes de feu géantes déferlent sur tout l’écran.',
    cost: { gems: 160, parts: 140 }, req: 151 },
];
export const SHIP_BY_ID = Object.fromEntries(SHIPS.map((s) => [s.id, s]));

export const DRONES = [
  { id: 'sentinelle', name: 'Sentinelle', color: '#38f2ff', desc: 'Tire automatiquement sur l’ennemi le plus proche.', cost: { crystals: 60 }, req: 4 },
  { id: 'glaneur', name: 'Glaneur', color: '#ffd23f', desc: 'Va chercher pièces et bonus, et étend votre aimant.', cost: { coins: 3000 }, req: 8 },
  { id: 'egide', name: 'Égide', color: '#7dffcf', desc: 'Orbite autour du vaisseau et absorbe les tirs ennemis.', cost: { crystals: 120 }, req: 14 },
  { id: 'foreur', name: 'Foreur', color: '#ff6a4f', desc: 'Fonce sur les ennemis comme une vrille puis revient.', cost: { crystals: 200, gems: 10 }, req: 25 },
  { id: 'echo', name: 'Écho', color: '#c8a2ff', desc: 'Votre double fantôme : il rejoue vos tirs avec un léger retard.', cost: { gems: 30 }, req: 35 },
  { id: 'lumen', name: 'Lumen', color: '#fffb8f', desc: 'Recharge la spéciale et régénère un bouclier de temps en temps.', cost: { gems: 40, parts: 20 }, req: 50 },
  { id: 'prisme', name: 'Prisme', color: '#ff4fd8', desc: 'Verrouille l’ennemi le plus coriace avec un fin rayon continu.', cost: { gems: 60, parts: 40 }, req: 70 },
];
export const DRONE_BY_ID = Object.fromEntries(DRONES.map((d) => [d.id, d]));

export const UPGRADES = [
  { id: 'hull', name: 'Coque renforcée', desc: '+1 cœur de coque', icon: 'heart', max: 5,
    cost: (l) => ({ coins: [800, 2200, 6000, 14000, 30000][l], parts: [0, 5, 15, 30, 60][l] }) },
  { id: 'shield', name: 'Bouclier de départ', desc: 'Commencer chaque niveau avec +1 bouclier', icon: 'shield', max: 3,
    cost: (l) => ({ coins: [1500, 7000, 22000][l], crystals: [0, 40, 120][l] }) },
  { id: 'arsenal', name: 'Arsenal', desc: 'Commencer avec +1 niveau d’arme', icon: 'power', max: 3,
    cost: (l) => ({ coins: [2500, 10000, 32000][l], parts: [5, 20, 50][l] }) },
  { id: 'magnet', name: 'Champ magnétique', desc: '+20 % de portée d’attraction', icon: 'magnet', max: 8,
    cost: (l) => ({ coins: Math.round(300 * Math.pow(1.65, l) / 10) * 10 }) },
  { id: 'fortune', name: 'Fortune', desc: '+7 % de pièces ramassées', icon: 'coin', max: 10,
    cost: (l) => ({ coins: Math.round(500 * Math.pow(1.6, l) / 10) * 10 }) },
  { id: 'crit', name: 'Point faible', desc: '+3 % de chance de coup critique (×2)', icon: 'crit', max: 8,
    cost: (l) => ({ coins: Math.round(700 * Math.pow(1.6, l) / 10) * 10, parts: l * 3 }) },
  { id: 'luck', name: 'Flair', desc: '+10 % de bonus lâchés par les ennemis', icon: 'clover', max: 6,
    cost: (l) => ({ coins: Math.round(450 * Math.pow(1.75, l) / 10) * 10 }) },
  { id: 'charge', name: 'Accumulateur', desc: 'La spéciale se charge 8 % plus vite', icon: 'bolt', max: 8,
    cost: (l) => ({ crystals: Math.round(20 * Math.pow(1.55, l)) }) },
  { id: 'nova', name: 'Hypernova+', desc: '+1 s de super mode', icon: 'nova', max: 5,
    cost: (l) => ({ crystals: Math.round(30 * Math.pow(1.8, l)) }) },
  { id: 'slot2', name: 'Second drone', desc: 'Débloque un second emplacement de drone', icon: 'drone', max: 1,
    cost: () => ({ crystals: 250 }), req: 15 },
];

export const DIFFS = [
  { id: 0, name: 'Normal', color: '#47ffa3', mul: 1 },
  { id: 1, name: 'Difficile', color: '#ff9d3c', mul: 1.7 },
  { id: 2, name: 'Cauchemar', color: '#ff3f6e', mul: 2.6 },
];

export const BOOSTS = {
  nova: { name: 'Départ Hypernova', desc: 'Commencer le niveau en super mode', color: '#ff4fd8' },
  shield: { name: 'Bouclier bonus', desc: '+1 bouclier au départ', color: '#38f2ff' },
  power: { name: 'Surcharge', desc: '+2 niveaux d’arme au départ', color: '#ff9d3c' },
};
