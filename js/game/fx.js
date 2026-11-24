// Effets spectaculaires : explosions, étincelles, éclaboussures organiques
import { fx } from '../engine/particles.js';
import { addShake, flash, hitstop } from '../engine/renderer.js';
import { rand, TAU } from '../engine/math.js';
import { sfx } from '../audio/sfx.js';

export function explode(x, y, size, c1, c2 = '#ffffff', goo = true) {
  fx.flash(x, y, 14 + size * 14, 0.16 + size * 0.03, '#ffffff');
  fx.flash(x, y, 26 + size * 24, 0.32 + size * 0.05, c1);
  fx.ring(x, y, 3, 18 + size * 20, 0.28 + size * 0.06, c1, 1.5 + size);
  if (size >= 2) fx.ring(x, y, 6, 30 + size * 26, 0.45 + size * 0.05, '#ffffff', 1 + size * 0.5);
  const ns = 5 + size * 6;
  for (let i = 0; i < ns; i++) {
    const a = rand(TAU), sp = rand(80, 230 + size * 70);
    fx.spark(x, y, Math.cos(a) * sp, Math.sin(a) * sp, rand(0.22, 0.5 + size * 0.05), rand(7, 14) + size * 3, i % 3 ? c1 : '#ffffff', 1.3 + size * 0.25);
  }
  const nd = 2 + size * 3;
  for (let i = 0; i < nd; i++) {
    const a = rand(TAU), sp = rand(10, 60 + size * 20);
    fx.dot(x + rand(-4, 4) * size, y + rand(-4, 4) * size, Math.cos(a) * sp, Math.sin(a) * sp, rand(0.35, 0.7), 6 + size * 4, i % 2 ? c1 : c2, 0.9);
  }
  if (goo) {
    const ng = 3 + size * 3;
    for (let i = 0; i < ng; i++) fx.goo(x, y, rand(-130, 130) * (0.6 + size * 0.2), rand(-200, 30), rand(0.5, 1), rand(1.4, 3.2) + size * 0.4, c2);
  }
  if (size >= 3) {
    for (let i = 0; i < size * 2; i++) fx.debris(x, y, rand(-200, 200), rand(-260, 40), rand(0.8, 1.4), rand(3, 7), c2);
    for (let i = 0; i < size; i++) fx.smoke(x + rand(-20, 20), y + rand(-20, 20), rand(-20, 20), rand(-30, 0), rand(0.8, 1.4), 30 + size * 6, c1);
    addShake(0.12 + size * 0.05);
  } else addShake(size * 0.035);
  sfx.explode(size);
}

export function bossBoom(x, y, c1, c2) {
  explode(x, y, 5, c1, c2);
  flash('#ffffff', 0.5);
  hitstop(0.12);
  for (let i = 0; i < 3; i++) fx.ring(x, y, 10, 160 + i * 90, 0.7 + i * 0.25, i ? c1 : '#ffffff', 6 - i);
}

export function hitSpark(x, y, c) {
  for (let i = 0; i < 2; i++) {
    const a = -Math.PI / 2 + rand(-1.2, 1.2), sp = rand(60, 160);
    fx.spark(x, y, Math.cos(a) * sp, Math.sin(a) * sp, rand(0.1, 0.22), 6, i ? c : '#ffffff', 1.2);
  }
}
export function deflect(x, y) {
  fx.flash(x, y, 8, 0.12, '#cfe8ff');
  const a = rand(TAU);
  fx.spark(x, y, Math.cos(a) * 140, Math.sin(a) * 140, 0.15, 6, '#cfe8ff', 1);
}
export function sparkle(x, y, c, n = 5, spread = 14) {
  for (let i = 0; i < n; i++) fx.star(x + rand(-spread, spread), y + rand(-spread, spread), rand(3, 6), rand(0.3, 0.6), c, rand(-30, 30), rand(-60, -10));
}
export function cancelPop(x, y, c) {
  fx.dot(x, y, 0, -20, 0.3, 7, c, 0.9);
  fx.star(x, y, 4, 0.35, '#ffffff', 0, -30);
}
