// État global partagé entre la boucle principale et l'interface
export const app = {
  game: null,          // partie en cours (Game) ou null
  startLevel: null,    // (L, diff, boosts) => void — défini dans main.js
  quitToMenu: null,    // () => void
  version: '1.0.0',
};
