// Peintures (skins) des vaisseaux : variantes de couleur à débloquer
const SK = {
  etincelle: [{ name: 'Origine' }, { name: 'Braise', paint: '#ff5a2a', accent: '#ffd23f', tail: '#ffd23f', led: '#fff0c0' }, { name: 'Spectre', paint: '#b8c4dc', accent: '#38f2ff', tail: '#38f2ff', led: '#c8fbff' }, { name: 'Néon', paint: '#ff2bd6', accent: '#7dfcff', tail: '#7dfcff', led: '#ffd6f4' }],
  paon: [{ name: 'Origine' }, { name: 'Améthyste', paint: '#a05cff', accent: '#ffcf4a' }, { name: 'Corail', paint: '#ff6a5a', accent: '#fff1b0' }, { name: 'Glacier', paint: '#6fd8ff', accent: '#ffffff' }],
  lance: [{ name: 'Origine' }, { name: 'Laser vert', paint: '#2bff8a', accent: '#eafff2' }, { name: 'Or blanc', paint: '#ffd36a', accent: '#fffdf0' }, { name: 'Abysse', paint: '#3a6bff', accent: '#e6ecff' }],
  essaim: [{ name: 'Origine' }, { name: 'Frelon', paint: '#ffd21a', accent: '#1c1c24' }, { name: 'Toxique', paint: '#7dff3a', accent: '#1c1c24' }, { name: 'Sang', paint: '#ff2a4a', accent: '#1c1c24' }],
  tonnerre: [{ name: 'Origine' }, { name: 'Orage bleu', paint: '#4ab8ff', tail: '#ffe94a' }, { name: 'Plasma', paint: '#ff4fd8', tail: '#7dfcff' }, { name: 'Éclair noir', paint: '#3a3a52', tail: '#ffd40a' }],
  diapason: [{ name: 'Origine' }, { name: 'Écho rose', paint: '#ff5ab8', accent: '#fff1b0' }, { name: 'Résonance', paint: '#1fd6a8', accent: '#e8fffa' }, { name: 'Sourdine', paint: '#5a6278', accent: '#ff9d3c' }],
  singularite: [{ name: 'Origine' }, { name: 'Horizon d’or', paint: '#e8a83a' }, { name: 'Trou blanc', paint: '#dfe6ff', accent: '#8a4dff' }, { name: 'Nova', paint: '#ff3a6a' }],
  faucheuse: [{ name: 'Origine' }, { name: 'Lune', paint: '#cfd8ea', accent: '#5ab8ff', tail: '#5ab8ff' }, { name: 'Venin', paint: '#7dff4a', accent: '#a259ff', tail: '#a259ff' }, { name: 'Éclipse', paint: '#3a2a52', accent: '#ffb21a', tail: '#ffb21a' }],
  kaleido: [{ name: 'Origine' }, { name: 'Rubis', paint: '#ffd6e0', accent: '#ff3a6a', tail: '#ffd23f' }, { name: 'Émeraude', paint: '#d6ffe8', accent: '#2bff8a', tail: '#7dfcff' }, { name: 'Onyx', paint: '#2a2a3a', accent: '#ffffff', tail: '#ff7dfc' }],
  phenix: [{ name: 'Origine' }, { name: 'Flamme bleue', paint: '#2b7bff', accent: '#9ff6ff', tail: '#9ff6ff' }, { name: 'Flamme verte', paint: '#1fd66a', accent: '#f4ff8a', tail: '#f4ff8a' }, { name: 'Flamme noire', paint: '#2a1a2e', accent: '#ff4a2a', tail: '#ff4a2a' }],
};
export function shipSkins(id) { return SK[id] || [{ name: 'Origine' }]; }
export function shipSkin(id, i) { const l = SK[id]; return l && i > 0 ? l[i] : null; }
