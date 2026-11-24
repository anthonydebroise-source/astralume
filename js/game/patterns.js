// Motifs de tir ennemis
import { TAU, angTo } from '../engine/math.js';

export function shoot(g, x, y, a, spd, kind = 'orb', o) {
  return g.spawnEB(x, y, Math.cos(a) * spd, Math.sin(a) * spd, kind, o);
}
export function aimed(g, x, y, spd, n = 1, spread = 0.18, kind = 'orb', o) {
  const a = angTo(x, y, g.player.x, g.player.y);
  for (let i = 0; i < n; i++) shoot(g, x, y, a + (i - (n - 1) / 2) * spread, spd, kind, o);
  return a;
}
export function ring(g, x, y, n, spd, off = 0, kind = 'orb', o) {
  for (let i = 0; i < n; i++) shoot(g, x, y, off + (i / n) * TAU, spd, kind, o);
}
export function fan(g, x, y, a, n, arc, spd, kind = 'orb', o) {
  for (let i = 0; i < n; i++) shoot(g, x, y, a + (n === 1 ? 0 : (i / (n - 1) - 0.5) * arc), spd, kind, o);
}
// Rafale espacée dans le temps
export function burst(g, e, count, interval, fn) {
  for (let i = 0; i < count; i++) g.later(i * interval, () => { if (!e.dead) fn(i); });
}
// Fleur : anneau à vitesses alternées
export function flower(g, x, y, n, spd, off, kind = 'orb') {
  for (let i = 0; i < n; i++) shoot(g, x, y, off + (i / n) * TAU, spd * (i % 2 ? 0.7 : 1), kind);
}
// Mur avec brèche
export function wall(g, y, gapX, gapW, spd, kind = 'orb', W = 400) {
  for (let x = 12; x < W; x += 24) if (Math.abs(x - gapX) > gapW / 2) g.spawnEB(x, y, 0, spd, kind);
}
