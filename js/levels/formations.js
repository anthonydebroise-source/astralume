// Formations : transforme une description de vague en apparitions (position, délai, trajectoire)
import { RNG } from '../engine/math.js';
import { view } from '../engine/renderer.js';

// Courbes d'entrée (coordonnées normalisées : x∈[0,1] largeur, y∈[0,1] hauteur)
const CURVES = [
  [0.15, -0.06, 0.15, 0.5, 0.85, 0.2, 0.85, 1.12],
  [-0.08, 0.12, 0.65, 0.08, 0.65, 0.55, -0.12, 0.5],
  [0.2, -0.06, 0.2, 0.55, 0.95, 0.6, 1.12, 0.18],
  [-0.1, 0.08, 0.45, 0.3, 0.6, 0.5, 1.12, 0.72],
  [1.1, 0.14, 0.55, 0.65, 0.35, 0.62, -0.12, 0.12],
  [0.5, -0.06, 0.05, 0.35, 0.95, 0.45, 0.5, 1.12],
  [-0.1, 0.35, 0.5, -0.05, 0.9, 0.4, 0.3, 1.12],
];

export function formationSpawns(ev) {
  const rng = new RNG(ev.seed || 1);
  const W = view.w, H = view.h, top = view.safeT;
  const n = Math.max(1, ev.n || 1);
  const out = [];
  const side = rng.chance(0.5) ? 1 : 0;
  const mir = (x) => (side ? 1 - x : x);
  const hoverY = () => top + H * rng.range(0.12, 0.3);
  switch (ev.form) {
    case 'line': {
      const ty = hoverY();
      const stay = rng.range(3.5, 6);
      const exit = rng.pick(['down', 'up', 'down', side ? 'left' : 'right']);
      for (let i = 0; i < n; i++) {
        const tx = W * (i + 1) / (n + 1);
        out.push({ d: i * 0.09, x: tx, y: -30, path: { k: 'hover', tx, ty: ty + (i % 2) * 14, inDur: 1.1, stay, exit, sway: 10 } });
      }
      break;
    }
    case 'column': case 'pincer': case 'loop': {
      const c = CURVES[rng.int(0, CURVES.length - 1)];
      const dur = rng.range(4.2, 5.6);
      const pincer = ev.form === 'pincer';
      for (let i = 0; i < n; i++) {
        const s2 = pincer ? i % 2 : side;
        const m = (x) => (s2 ? 1 - x : x);
        const pts = [m(c[0]) * W, c[1] * H, m(c[2]) * W, c[3] * H, m(c[4]) * W, c[5] * H, m(c[6]) * W, c[7] * H];
        out.push({ d: (pincer ? Math.floor(i / 2) : i) * 0.34, x: pts[0], y: pts[1], path: { k: 'swoop', pts, dur, loop: ev.form === 'loop' } });
      }
      break;
    }
    case 'vee': {
      const cx = W * rng.range(0.3, 0.7);
      const spd = rng.range(85, 120);
      for (let i = 0; i < n; i++) {
        const k = Math.ceil(i / 2) * (i % 2 ? -1 : 1);
        out.push({ d: 0, x: cx + k * 34, y: -30 - Math.abs(k) * 30, path: { k: 'dive', spd, amp: 18, f: 1.6, ph: 0 } });
      }
      break;
    }
    case 'circle': {
      const cx = W / 2, cy = top + H * 0.3, r = rng.range(70, 105);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        out.push({ d: i * 0.12, x: cx + Math.cos(a) * r, y: -30, path: { k: 'orbit', cx, cy, r, a, w: (side ? 1 : -1) * rng.range(1.1, 1.5), inDur: 1.3, turns: rng.range(1.1, 1.8) } });
      }
      break;
    }
    case 'rain': {
      for (let i = 0; i < n; i++) out.push({ d: i * rng.range(0.25, 0.45), x: W * rng.range(0.08, 0.92), y: -30, path: { k: 'dive', spd: rng.range(90, 150), amp: rng.range(0, 25), f: rng.range(1, 2.5), ph: rng.range(0, 6) } });
      break;
    }
    case 'grid': {
      const cols = Math.min(4, Math.ceil(n / 2)), rows = Math.ceil(n / cols);
      const ty = top + H * 0.12, stay = rng.range(5, 7);
      let k = 0;
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols && k < n; c++, k++) {
        const tx = W * (c + 1) / (cols + 1);
        out.push({ d: r * 0.25, x: tx, y: -30 - r * 40, path: { k: 'hover', tx, ty: ty + r * 44, inDur: 1.2, stay, exit: 'down', sway: 26 } });
      }
      break;
    }
    case 'sides': {
      for (let i = 0; i < n; i++) {
        const s = (i + side) % 2;
        const y = top + H * rng.range(0.1, 0.4);
        out.push({ d: i * 0.55, x: s ? W + 30 : -30, y, path: { k: 'side', dir: s ? -1 : 1, spd: rng.range(110, 150), amp: rng.range(10, 35), f: 2, y0: y, drop: rng.range(10, 40) } });
      }
      break;
    }
    case 'zig': {
      const x0 = W * rng.range(0.25, 0.75);
      for (let i = 0; i < n; i++) out.push({ d: i * 0.4, x: x0, y: -30, path: { k: 'zig', spd: 95, x0, amp: rng.range(90, 140), f: 1.4 } });
      break;
    }
    case 'arc': {
      const cx = W / 2, cy = top + H * 0.06, r = W * 0.36;
      const stay = rng.range(4, 6);
      for (let i = 0; i < n; i++) {
        const a = Math.PI * (0.15 + 0.7 * (n === 1 ? 0.5 : i / (n - 1)));
        const tx = cx + Math.cos(a) * r, ty = cy + Math.sin(a) * r * 0.55;
        out.push({ d: i * 0.12, x: tx, y: -30, path: { k: 'hover', tx, ty, inDur: 1.2, stay, exit: 'down', sway: 8 } });
      }
      break;
    }
    case 'pair': {
      const ty = hoverY();
      for (let i = 0; i < 2; i++) {
        const tx = W * (i ? 0.72 : 0.28);
        out.push({ d: i * 0.2, x: tx, y: -50, path: { k: 'hover', tx, ty, inDur: 1.5, stay: rng.range(6, 9), exit: 'down', sway: 30 } });
      }
      break;
    }
    case 'single': {
      const tx = W * (ev.flee ? rng.range(0.25, 0.75) : 0.5);
      out.push({ d: 0, x: tx, y: -60, path: ev.flee
        ? { k: 'hover', tx, ty: top + H * 0.22, inDur: 1.2, stay: 6.5, exit: rng.pick(['left', 'right', 'up']), sway: 70 }
        : { k: 'hover', tx, ty: top + H * 0.2, inDur: 2, stay: rng.range(9, 12), exit: 'down', sway: 50 } });
      break;
    }
    case 'armada': {
      const rows = ev.rows || 3, cols = ev.cols || 5;
      const types = ev.types || [ev.type];
      const rowH = 44, top0 = top + 74, stay = ev.stay || 15;
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const odd = r % 2 ? 0.5 : 0;
        if (odd && c === cols - 1) continue;
        const tx = W * (c + 1 + odd) / (cols + 1);
        const ty = top0 + (rows - 1 - r) * rowH;
        out.push({ d: c * 0.06 + r * 0.3, x: tx, y: -30 - r * 36, type: types[Math.min(r, types.length - 1)],
          path: { k: 'hover', tx, ty, inDur: 1.8, stay: stay - r * 0.3, exit: 'up', sway: 14 } });
      }
      break;
    }
    case 'snake': {
      out.push({ d: 0, x: W * (side ? 0.8 : 0.2), y: -30, path: { k: 'snake', spd: 85, amp: W * 0.33, f: 0.9, x0: W / 2, side } });
      break;
    }
    // ---------- Sol ----------
    case 'gline': {
      const k = rng.int(2, 4);
      for (let i = 0; i < k; i++) out.push({ d: 0, x: W * (i + 1) / (k + 1), y: -30, ground: true });
      break;
    }
    case 'gpair': {
      const dx = rng.range(0.15, 0.3);
      out.push({ d: 0, x: W * dx, y: -30, ground: true }, { d: 0, x: W * (1 - dx), y: -30, ground: true });
      break;
    }
    case 'gcluster': {
      const cx = W * rng.range(0.25, 0.75);
      for (let i = 0; i < 3; i++) out.push({ d: 0, x: cx + (i - 1) * 46, y: -30 - (i % 2) * 40, ground: true });
      break;
    }
    default: {
      out.push({ d: 0, x: W * rng.range(0.2, 0.8), y: -30, ground: true });
    }
  }
  return out;
}

// Motifs de pièces pour la « pluie de pièces »
export function coinPattern(pat, seed) {
  const rng = new RNG(seed);
  const W = view.w;
  const pts = [];
  const cx = W * rng.range(0.3, 0.7);
  switch (pat) {
    case 'line': for (let i = 0; i < 9; i++) pts.push([W * (i + 1) / 10, -20]); break;
    case 'sine': for (let i = 0; i < 14; i++) pts.push([cx + Math.sin(i * 0.6) * 90, -20 - i * 22]); break;
    case 'spiral': for (let i = 0; i < 16; i++) { const a = i * 0.7, r = 10 + i * 6; pts.push([cx + Math.cos(a) * r, -120 + Math.sin(a) * r]); } break;
    case 'heart': for (let i = 0; i < 18; i++) { const t = (i / 18) * Math.PI * 2; pts.push([W / 2 + 7 * 16 * Math.sin(t) ** 3 * 0.55, -110 - 7 * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * 0.55]); } break;
    case 'diamond': for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; const r = 70 / (Math.abs(Math.cos(a)) + Math.abs(Math.sin(a))); pts.push([cx + Math.cos(a) * r, -90 + Math.sin(a) * r]); } break;
    case 'zigzag': for (let i = 0; i < 14; i++) pts.push([W * 0.15 + (i % 4 < 2 ? (i % 2) : 1 - (i % 2)) * W * 0.7 * ((i % 4) / 3), -20 - i * 20]); break;
    case 'star': for (let i = 0; i < 20; i++) { const a = (i / 20) * Math.PI * 2 - Math.PI / 2; const r = i % 2 ? 36 : 85; pts.push([W / 2 + Math.cos(a) * r, -100 + Math.sin(a) * r]); } break;
    default: for (let i = 0; i < 12; i++) { pts.push([W * 0.25 + Math.sin(i * 0.8) * 40, -20 - i * 24]); pts.push([W * 0.75 - Math.sin(i * 0.8) * 40, -20 - i * 24]); }
  }
  return pts;
}
