// Trajectoires des ennemis
import { view } from '../engine/renderer.js';
import { ease, clamp } from '../engine/math.js';

function bez(p, u, i) { // composante i (0 = x, 1 = y)
  const a = p[i], b = p[i + 2], c = p[i + 4], d = p[i + 6], v = 1 - u;
  return v * v * v * a + 3 * v * v * u * b + 3 * v * u * u * c + u * u * u * d;
}
function bezD(p, u, i) {
  const a = p[i], b = p[i + 2], c = p[i + 4], d = p[i + 6], v = 1 - u;
  return 3 * v * v * (b - a) + 6 * v * u * (c - b) + 3 * u * u * (d - c);
}

export function initPath(e) {
  const p = e.path;
  if (!p) return;
  p.t = 0; p.x0s = e.x; p.y0s = e.y;
  if (p.x0 === undefined) p.x0 = e.x;
  p.phase = 0;
}

// Renvoie true si l'ennemi a quitté l'écran pour de bon
export function updatePath(e, dt, g) {
  const p = e.path;
  if (!p) return false;
  const W = view.w, H = view.h;
  const ox = e.x, oy = e.y;
  p.t += dt;
  switch (p.k) {
    case 'dive':
      e.y += p.spd * dt;
      e.x = p.x0 + Math.sin(p.t * p.f + p.ph) * p.amp;
      break;
    case 'swoop': {
      if (p.loop && !p.looped && p.t / p.dur >= 0.45) {
        if (!p.lp) {
          const u = 0.45, dx = bezD(p.pts, u, 0), dy = bezD(p.pts, u, 1), l = Math.hypot(dx, dy) || 1;
          const R = 42, s = p.pts[0] < W / 2 ? 1 : -1;
          p.lp = { cx: e.x - (dy / l) * R * s, cy: e.y + (dx / l) * R * s, a0: Math.atan2(e.y - (e.y + (dx / l) * R * s), e.x - (e.x - (dy / l) * R * s)), s, R, t: 0 };
        }
        const L = p.lp; L.t += dt;
        const a = L.a0 + L.s * (L.t / 1.2) * Math.PI * 2;
        e.x = L.cx + Math.cos(a) * L.R; e.y = L.cy + Math.sin(a) * L.R;
        p.t -= dt;
        if (L.t >= 1.2) { p.looped = true; }
        break;
      }
      const u = p.t / p.dur;
      if (u < 1) { const ue = u; e.x = bez(p.pts, ue, 0); e.y = bez(p.pts, ue, 1); }
      else {
        if (!p.ex) { const dx = bezD(p.pts, 1, 0), dy = bezD(p.pts, 1, 1); const l = Math.hypot(dx, dy) || 1; const sp = l / p.dur; p.ex = (dx / l) * Math.max(120, sp); p.ey = (dy / l) * Math.max(120, sp); }
        e.x += p.ex * dt; e.y += p.ey * dt;
      }
      break;
    }
    case 'hover': {
      if (p.t < p.inDur) {
        const u = ease.outCubic(p.t / p.inDur);
        e.x = p.x0s + (p.tx - p.x0s) * u; e.y = p.y0s + (p.ty - p.y0s) * u;
      } else if (p.t < p.inDur + p.stay) {
        const s = p.t - p.inDur;
        e.x = p.tx + Math.sin(s * 1.3) * p.sway; e.y = p.ty + Math.sin(s * 0.9) * p.sway * 0.25;
        p.hovering = true;
      } else {
        p.hovering = false;
        const s = p.t - p.inDur - p.stay;
        const acc = Math.min(260, 40 + s * 260);
        if (p.exit === 'up') e.y -= acc * dt;
        else if (p.exit === 'left') e.x -= acc * dt * 1.2;
        else if (p.exit === 'right') e.x += acc * dt * 1.2;
        else e.y += acc * dt;
      }
      break;
    }
    case 'flock': { // amas solidaire : dérive, respiration, rotation, puis éclatement
      const T = p.t + p.dd;
      const brk = p.t >= p.inDur + p.stay;
      if (!brk) {
        const ph = Math.min(1, T / 2.5);
        const bx = p.cx + Math.sin(T * 0.55) * p.amp * p.dir * ph, by = p.cy + Math.sin(T * 0.8) * 16 * ph;
        const k = 1 + 0.09 * Math.sin(T * 2.4), rot = 0.22 * Math.sin(T * 0.45);
        const cr = Math.cos(rot), sr = Math.sin(rot);
        const tx = bx + (p.ox * cr - p.oy * sr) * k, ty = by + (p.ox * sr + p.oy * cr) * k;
        if (p.t < p.inDur) { const u = ease.outCubic(p.t / p.inDur); e.x = p.x0s + (tx - p.x0s) * u; e.y = p.y0s + (ty - p.y0s) * u; }
        else { e.x = tx; e.y = ty; p.hovering = true; }
      } else {
        p.hovering = false;
        if (p.vx === undefined) { const l = Math.hypot(p.ox, p.oy) || 1; p.vx = (p.ox / l) * 60; p.vy = 30 + (p.oy / l) * 40; }
        const s = p.t - p.inDur - p.stay, acc = 1 + s * 2.2;
        e.x += p.vx * acc * dt; e.y += (p.vy + s * 160) * dt;
      }
      break;
    }
    case 'parade': {
      const F = p.F, T = g ? g.t : p.t;
      // position de l'emplacement dans la formation (ondulation + respiration communes)
      const k = 1 + 0.06 * Math.sin(T * 1.5);
      const sx = F.cx + (p.tx - F.cx) * k + Math.sin(T * 0.7) * 14, sy = p.ty + Math.sin(T * 1.1 + p.tx * 0.02) * 4;
      if (p.ph === 0) { // entrée chorégraphiée
        p.calm = !p.danger;
        const n = p.pts.length / 2 - 1, u = Math.min(1, p.t / p.dur) * n, i = Math.min(n - 1, Math.floor(u)), f = u - i;
        e.x = p.pts[i * 2] + (p.pts[i * 2 + 2] - p.pts[i * 2]) * f; e.y = p.pts[i * 2 + 1] + (p.pts[i * 2 + 3] - p.pts[i * 2 + 1]) * f;
        if (p.t >= p.dur) { p.ph = 1; p.t0 = p.t; p.ex = e.x; p.ey = e.y; }
      } else if (p.ph === 1) { // rejoint son emplacement
        const u = ease.inOutCubic(Math.min(1, (p.t - p.t0) / 0.9));
        e.x = p.ex + (sx - p.ex) * u; e.y = p.ey + (sy - p.ey) * u;
        if (u >= 1) { p.ph = 2; p.t0 = p.t; }
      } else if (p.ph === 2) { // en formation
        e.x = sx; e.y = sy; p.hovering = true; p.calm = false;
        if (p.t - p.t0 > p.stay) { p.ph = 4; p.t0 = p.t; p.hovering = false; }
        else if (F.rate && p.t - p.t0 > 1.5 && Math.random() < dt * F.rate * 3) {
          F.divers = (F.divers || []).filter((x) => !x.dead && x.path.ph === 3);
          if (F.divers.length < F.maxDive) { F.divers.push(e); p.ph = 3; p.t0 = p.t; p.dx = g ? g.player.x : W / 2; p.hovering = false; p.dsx = e.x; p.dsy = e.y; p.side = e.x < W / 2 ? 1 : -1; }
        }
      } else if (p.ph === 3) { // plongeon sur le joueur, sortie par le bas puis retour par le haut
        const s = p.t - p.t0, D = 3.2;
        if (s < D * 0.62) {
          const u = s / (D * 0.62);
          e.x = p.dsx + (p.dx - p.dsx) * ease.inOutCubic(u) + Math.sin(u * Math.PI * 2) * 34 * p.side; e.y = p.dsy + (H + 60 - p.dsy) * u * u;
        } else {
          const u = Math.min(1, (s - D * 0.62) / (D * 0.38));
          e.x = sx + (1 - u) * 40 * p.side; e.y = -40 + (sy + 40) * ease.outCubic(u);
          if (u >= 1) { p.ph = 2; p.t0 = p.t - 1.5; }
        }
      } else { // départ : la formation s'envole
        const s = p.t - p.t0;
        e.x = sx + Math.sin(s * 3 + p.tx) * 10; e.y = sy - s * s * 160;
      }
      break;
    }
    case 'orbit': {
      const sx = p.cx + Math.cos(p.a) * p.r, sy = p.cy + Math.sin(p.a) * p.r;
      if (p.t < p.inDur) {
        const u = ease.outCubic(p.t / p.inDur);
        e.x = p.x0s + (sx - p.x0s) * u; e.y = p.y0s + (sy - p.y0s) * u;
      } else if (p.t < p.inDur + (p.turns * Math.PI * 2) / Math.abs(p.w)) {
        const a = p.a + (p.t - p.inDur) * p.w;
        e.x = p.cx + Math.cos(a) * p.r; e.y = p.cy + Math.sin(a) * p.r;
      } else {
        p.vy = (p.vy || 30) + 300 * dt;
        e.y += p.vy * dt;
      }
      break;
    }
    case 'side':
      e.x += p.dir * p.spd * dt;
      e.y = p.y0 + Math.sin(p.t * p.f) * p.amp + p.drop * p.t * 0.6;
      break;
    case 'zig': {
      e.y += p.spd * dt;
      const ph = (p.t * p.f) % 2;
      e.x = clamp(p.x0 + (ph < 1 ? ph * 2 - 1 : 3 - ph * 2) * p.amp * 0.5, 16, W - 16);
      break;
    }
    case 'snake':
      e.y = -30 + p.spd * p.t * 0.55;
      e.x = p.x0 + Math.sin(p.t * p.f + (p.side ? Math.PI : 0)) * p.amp;
      break;
    case 'chase': {
      const tx = g.player.x;
      e.vxs = (e.vxs || 0) + Math.sign(tx - e.x) * 160 * dt;
      e.vxs *= 0.97;
      e.x += e.vxs * dt;
      e.y += p.spd * dt;
      break;
    }
    case 'ground':
      e.y += g.scroll * dt;
      break;
    case 'free':
      e.x += (e.fvx || 0) * dt; e.y += (e.fvy || 0) * dt;
      break;
    case 'none':
      break;
  }
  if (dt > 0) { e.vx = (e.x - ox) / dt; e.vy = (e.y - oy) / dt; }
  if (e.y > -10) e.entered = true;
  return e.entered && (e.y > H + 70 || e.y < -140 || e.x < -90 || e.x > W + 90);
}
