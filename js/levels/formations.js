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
      const rows = n > 8 ? 2 : 1, per = Math.ceil(n / rows);
      for (let i = 0; i < n; i++) {
        const r = Math.floor(i / per), c = i % per, cnt = Math.min(per, n - r * per);
        const tx = W * (c + 1 + (r ? 0.5 : 0)) / (per + 1) + (r ? 0 : W * (per - cnt) / (per + 1) / 2);
        out.push({ d: c * 0.07 + r * 0.25, x: tx, y: -30 - r * 30, path: { k: 'hover', tx, ty: ty + (c % 2) * 12 + r * 40, inDur: 1.1, stay, exit, sway: 10 } });
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
      const km = Math.ceil((n - 1) / 2), dx = Math.min(34, (W * 0.42) / Math.max(1, km));
      const cx = W * 0.5 + rng.range(-1, 1) * Math.max(0, W * 0.44 - km * dx);
      const spd = rng.range(85, 120);
      for (let i = 0; i < n; i++) {
        const k = Math.ceil(i / 2) * (i % 2 ? -1 : 1);
        out.push({ d: 0, x: cx + k * dx, y: -30 - Math.abs(k) * 28, path: { k: 'dive', spd, amp: 18, f: 1.6, ph: 0 } });
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
      const cols = Math.min(n > 10 ? 6 : 5, Math.ceil(n / 2)), rows = Math.ceil(n / cols);
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
    case 'swarm': { // Nuée : amas compact en nid d'abeille qui ondule puis éclate
      const sp = 33, cells = [];
      for (let ring = 0; cells.length < n; ring++) {
        if (ring === 0) { cells.push([0, 0]); continue; }
        for (let sdir = 0; sdir < 6; sdir++) for (let j = 0; j < ring; j++) {
          const a0 = (sdir / 6) * Math.PI * 2, a1 = ((sdir + 2) / 6) * Math.PI * 2;
          cells.push([Math.cos(a0) * ring * sp + Math.cos(a1) * j * sp, Math.sin(a0) * ring * sp * 0.86 + Math.sin(a1) * j * sp * 0.86]);
        }
      }
      cells.length = n;
      const maxR = Math.max(...cells.map(([x]) => Math.abs(x))) + 22;
      const cx = W * rng.range(0.45, 0.55), cy = top + H * rng.range(0.2, 0.25) + 20;
      const amp = Math.max(8, W / 2 - maxR - Math.abs(cx - W / 2) - 6);
      const stay = ev.stay || rng.range(7, 9), dir = side ? 1 : -1;
      for (let i = 0; i < n; i++) {
        const [ox, oy] = cells[i], dl = Math.hypot(ox, oy) * 0.006 + i * 0.015;
        out.push({ d: dl, x: cx + ox * 1.6, y: -40 - Math.abs(oy) - (n - i) * 2, fm: 0.42, lm: 0.7,
          path: { k: 'flock', cx, cy, ox, oy, inDur: 1.6, stay, dd: dl, dir, amp } });
      }
      break;
    }
    case 'wall': { // Mur : rideau serré qui descend lentement — il faut s'y percer un passage
      const rows = ev.rows || 2, cols = ev.cols || 7;
      const spd = rng.range(34, 44);
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const odd = r % 2 ? 0.5 : 0;
        if (odd && c === cols - 1) continue;
        const x0 = W * (c + 1 + odd) / (cols + 1);
        out.push({ d: r * 1.1, x: x0, y: -30, fm: 0.5, lm: 0.75, type: (ev.types || [])[r], path: { k: 'dive', spd, amp: 9, f: 1.1, ph: 0, x0 } });
      }
      break;
    }
    case 'armada': {
      const rows = ev.rows || 3, cols = ev.cols || 5;
      const types = ev.types || [ev.type];
      const rowH = rows > 4 ? 40 : 44, top0 = top + 70, stay = ev.stay || 15;
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
    case 'parade': { // Chorégraphie : entrées en boucles/spirales, puis formation qui ondule (plongeons si dangereuse)
      const rows = ev.rows || 3, cols = ev.cols || 6, types = ev.types || [ev.type];
      const danger = !!ev.danger, rowH = 38, top0 = top + 64;
      const F = { cx: W / 2, diving: 0, maxDive: danger ? (rows >= 4 ? 3 : 2) : 0, rate: danger ? 0.035 + Math.min(0.03, (ev.prog || 0) / 4000) : 0 };
      const kinds = ev.choreo || ['loop', 'spiral', 'eight', 'snake', 'cascade', 'cross'];
      const stay = ev.stay || 12;
      const groups = rows;
      for (let gi = 0; gi < groups; gi++) {
        const r = gi, kind = kinds[(gi + rng.int(0, kinds.length - 1)) % kinds.length], mirror = (gi + side) % 2 ? -1 : 1;
        const { pts, dur } = choreo(kind, mirror, W, H, top, danger, rng);
        const per = r % 2 ? cols - 1 : cols;
        const g0 = gi * 1.55;
        for (let c = 0; c < per; c++) {
          const odd = r % 2 ? 0.5 : 0;
          const tx = W * (c + 1 + odd) / (cols + 1), ty = top0 + (rows - 1 - r) * rowH;
          const cr = kind === 'cross' && c % 2 ? choreo('cross', -mirror, W, H, top, danger, rng) : null;
          const P = cr ? cr.pts : pts;
          out.push({ d: g0 + c * 0.17, x: P[0], y: P[1], type: types[Math.min(r, types.length - 1)], fm: danger ? 0.85 : 0.55, lm: 0.8,
            path: { k: 'parade', pts: P, dur: cr ? cr.dur : dur, tx, ty, F, danger, stay: stay - gi * 0.5, ph: 0 } });
        }
      }
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

// Trajectoires d'entrée chorégraphiées (polylignes échantillonnées dans le temps)
function choreo(kind, m, W, H, top, danger, rng) {
  const N = 72, pts = [];
  const X = (x) => W * (0.5 + (x - 0.5) * m), Y = (y) => top + H * y;
  const low = danger ? 0.62 : 0.45; // les chorégraphies dangereuses descendent plus bas
  const bez = (u, a, b, c, d) => { const v = 1 - u; return v * v * v * a + 3 * v * v * u * b + 3 * v * u * u * c + u * u * u * d; };
  let dur = 3.6;
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    let x, y;
    switch (kind) {
      case 'loop': { // descente en courbe puis boucle complète
        if (u < 0.4) { const k = u / 0.4; x = bez(k, -0.12, 0.25, 0.3, 0.42); y = bez(k, 0.05, 0.0, low, low * 0.82); }
        else { const k = (u - 0.4) / 0.6, a = Math.PI * 0.5 + k * Math.PI * 2; x = 0.42 + Math.cos(a) * 0.16 - 0.0; y = low * 0.82 - 0.11 + Math.sin(a) * 0.11 + (1 - Math.sin(a)) * 0; }
        dur = 4.2; break;
      }
      case 'spiral': { // spirale qui se resserre
        const a = -Math.PI / 2 + u * Math.PI * 3.2, rr = 0.42 * (1 - u * 0.75);
        x = 0.5 + Math.cos(a) * rr; y = (low * 0.6) + Math.sin(a) * rr * 0.55 * H / H; if (u < 0.08) y -= (0.08 - u) * 3;
        dur = 4.6; break;
      }
      case 'eight': { // huit couché (lissajous) arrivant par le côté
        const a = u * Math.PI * 2;
        x = 0.5 + Math.sin(a + Math.PI * 0.5) * 0.4 * (u < 0.12 ? 1 + (0.12 - u) * 6 : 1); y = 0.2 + Math.sin(a * 2) * 0.12 + u * (low - 0.3);
        dur = 4.4; break;
      }
      case 'snake': { // serpentin qui descend puis remonte
        x = 0.5 + Math.sin(u * Math.PI * 3) * 0.38; y = -0.05 + Math.sin(u * Math.PI) * (low + 0.05);
        dur = 4.2; break;
      }
      case 'cascade': { // longe le bord puis remonte en crochet
        if (u < 0.55) { const k = u / 0.55; x = bez(k, 0.06, 0.02, 0.05, 0.22); y = bez(k, -0.06, 0.25, low, low); }
        else { const k = (u - 0.55) / 0.45; x = bez(k, 0.22, 0.45, 0.65, 0.5); y = bez(k, low, low, 0.2, 0.25); }
        dur = 3.8; break;
      }
      default: { // cross : deux flots qui se croisent au centre
        x = bez(u, -0.1, 0.4, 0.75, 0.35); y = bez(u, 0.12, low * 0.9, low * 0.4, 0.22);
        dur = 3.4;
      }
    }
    pts.push(X(x), Y(y));
  }
  void rng;
  return { pts, dur };
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
