// Service worker : met tout le jeu en cache pour jouer hors ligne
const VERSION = 'astralume-202611242333';
const ASSETS = [
  "./",
  "css/style.css",
  "icons/icon-180.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "index.html",
  "js/app.js",
  "js/audio/audio.js",
  "js/audio/music.js",
  "js/audio/sfx.js",
  "js/economy/achievements.js",
  "js/economy/daily.js",
  "js/economy/data.js",
  "js/economy/economy.js",
  "js/economy/gacha.js",
  "js/economy/save.js",
  "js/engine/input.js",
  "js/engine/math.js",
  "js/engine/particles.js",
  "js/engine/renderer.js",
  "js/engine/sprites.js",
  "js/game/art.js",
  "js/game/background.js",
  "js/game/boss.js",
  "js/game/combo.js",
  "js/game/drones.js",
  "js/game/enemies.js",
  "js/game/enemies2.js",
  "js/game/events.js",
  "js/game/fx.js",
  "js/game/game.js",
  "js/game/hud.js",
  "js/game/hypercar.js",
  "js/game/paths.js",
  "js/game/patterns.js",
  "js/game/pickups.js",
  "js/game/player.js",
  "js/game/radio.js",
  "js/game/shipart.js",
  "js/game/ships.js",
  "js/icon.js",
  "js/levels/formations.js",
  "js/levels/generator.js",
  "js/levels/worlds.js",
  "js/main.js",
  "js/ui/art-ui.js",
  "js/ui/icons.js",
  "js/ui/screens-main.js",
  "js/ui/screens-meta.js",
  "js/ui/ui.js",
  "manifest.webmanifest"
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request).then((res) => {
      if (res && res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
