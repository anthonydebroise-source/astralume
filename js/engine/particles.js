// Système de particules en pool (étincelles, lueurs, anneaux, gouttes organiques, textes)
import { ctx, baseT, setRT, view } from './renderer.js';
import { glow } from './sprites.js';
import { TAU, rand } from './math.js';

const DOT = 0, SPARK = 1, RING = 2, FLASH = 3, GOO = 4, TEXT = 5, STAR = 6, DEBRIS = 7, SMOKE = 8;
const list = [];
const pool = [];
let cap = 700;
export function setParticleCap(n) { cap = n; }
export function particleCount() { return list.length; }
export function clearParticles() { while (list.length) pool.push(list.pop()); }

function P(type, x, y, vx, vy, life, size, color) {
  if (list.length >= cap && type !== TEXT && type !== RING && type !== FLASH) return null;
  const p = pool.pop() || {};
  p.type = type; p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.life = life; p.max = life;
  p.size = size; p.color = color; p.drag = 0.92; p.grav = 0; p.rot = 0; p.vr = 0;
  p.size2 = 0; p.text = null; p.w = 1; p.add = true;
  list.push(p);
  return p;
}

export const fx = {
  dot(x, y, vx, vy, life, size, color, drag = 0.93) { const p = P(DOT, x, y, vx, vy, life, size, color); if (p) p.drag = drag; return p; },
  spark(x, y, vx, vy, life, len, color, w = 1.6) { const p = P(SPARK, x, y, vx, vy, life, len, color); if (p) { p.w = w; p.drag = 0.9; } return p; },
  ring(x, y, r0, r1, life, color, w = 3) { const p = P(RING, x, y, 0, 0, life, r0, color); if (p) { p.size2 = r1; p.w = w; } return p; },
  flash(x, y, size, life, color) { return P(FLASH, x, y, 0, 0, life, size, color); },
  goo(x, y, vx, vy, life, size, color) { const p = P(GOO, x, y, vx, vy, life, size, color); if (p) { p.add = false; p.grav = 320; p.drag = 0.985; } return p; },
  text(x, y, str, color, size = 14, life = 0.9, vy = -38) { const p = P(TEXT, x, y, 0, vy, life, size, color); if (p) { p.add = false; p.text = str; p.drag = 0.96; } return p; },
  star(x, y, size, life, color, vx = 0, vy = 0) { const p = P(STAR, x, y, vx, vy, life, size, color); if (p) { p.rot = rand(TAU); p.vr = rand(-4, 4); p.drag = 0.94; } return p; },
  debris(x, y, vx, vy, life, size, color) { const p = P(DEBRIS, x, y, vx, vy, life, size, color); if (p) { p.add = false; p.grav = 260; p.vr = rand(-9, 9); p.drag = 0.985; p.rot = rand(TAU); } return p; },
  smoke(x, y, vx, vy, life, size, color) { const p = P(SMOKE, x, y, vx, vy, life, size, color); if (p) p.drag = 0.95; return p; },
};

export function updateParticles(dt) {
  const f60 = dt * 60;
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i];
    p.life -= dt;
    if (p.life <= 0) { list[i] = list[list.length - 1]; list.pop(); pool.push(p); continue; }
    const d = 1 - (1 - p.drag) * f60;
    p.vx *= d; p.vy *= d;
    p.vy += p.grav * dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.rot += p.vr * dt;
  }
}

// layer: true = additif, false = normal
export function drawParticles(additive) {
  baseT();
  for (let i = 0; i < list.length; i++) {
    const p = list[i];
    if (p.add !== additive) continue;
    const k = p.life / p.max;
    switch (p.type) {
      case DOT: {
        const s = glow(p.color, 16);
        const sz = p.size * (0.35 + 0.65 * k);
        ctx.globalAlpha = k;
        ctx.drawImage(s.c, p.x - sz, p.y - sz, sz * 2, sz * 2);
        break;
      }
      case SMOKE: {
        const s = glow(p.color, 32);
        const sz = p.size * (1.6 - 0.6 * k);
        ctx.globalAlpha = k * 0.35;
        ctx.drawImage(s.c, p.x - sz, p.y - sz, sz * 2, sz * 2);
        break;
      }
      case SPARK: {
        const sp = Math.hypot(p.vx, p.vy) + 0.001;
        const l = p.size * Math.min(1, sp / 300) * (0.4 + 0.6 * k);
        ctx.globalAlpha = Math.min(1, k * 1.5);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.w;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - (p.vx / sp) * l, p.y - (p.vy / sp) * l);
        ctx.stroke();
        break;
      }
      case RING: {
        const t = 1 - k;
        const r = p.size + (p.size2 - p.size) * (1 - (1 - t) * (1 - t));
        ctx.globalAlpha = k;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.w * (0.3 + 0.7 * k);
        ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0.1, r), 0, TAU); ctx.stroke();
        break;
      }
      case FLASH: {
        const s = glow(p.color, 32);
        const sz = p.size * (1 + (1 - k) * 0.4);
        ctx.globalAlpha = k * k;
        ctx.drawImage(s.c, p.x - sz, p.y - sz, sz * 2, sz * 2);
        break;
      }
      case STAR: {
        const sz = p.size * (k < 0.5 ? k * 2 : 1);
        ctx.globalAlpha = Math.min(1, k * 2);
        ctx.fillStyle = p.color;
        setRT(p.x, p.y, p.rot);
        ctx.beginPath();
        for (let j = 0; j < 8; j++) {
          const a = (j / 8) * TAU, r = j % 2 === 0 ? sz : sz * 0.22;
          if (j === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath(); ctx.fill();
        baseT();
        break;
      }
      case GOO: {
        ctx.globalAlpha = Math.min(1, k * 2);
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.4 + 0.6 * k), 0, TAU); ctx.fill();
        break;
      }
      case DEBRIS: {
        ctx.globalAlpha = Math.min(1, k * 2.5);
        ctx.fillStyle = p.color;
        setRT(p.x, p.y, p.rot);
        const s = p.size;
        ctx.beginPath(); ctx.moveTo(-s, -s * 0.6); ctx.lineTo(s * 0.8, -s); ctx.lineTo(s, s * 0.7); ctx.lineTo(-s * 0.5, s); ctx.closePath(); ctx.fill();
        baseT();
        break;
      }
      case TEXT: {
        const t = 1 - k;
        const pop = t < 0.12 ? 0.6 + (t / 0.12) * 0.55 : t < 0.22 ? 1.15 - ((t - 0.12) / 0.1) * 0.15 : 1;
        ctx.globalAlpha = Math.min(1, k * 3);
        ctx.font = `800 ${(p.size * pop).toFixed(1)}px "Avenir Next Condensed","Avenir Next",system-ui,sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = 3.2; ctx.strokeStyle = 'rgba(5,3,20,0.85)';
        ctx.strokeText(p.text, p.x, p.y);
        ctx.fillStyle = p.color;
        ctx.fillText(p.text, p.x, p.y);
        break;
      }
    }
  }
  ctx.globalAlpha = 1;
}
