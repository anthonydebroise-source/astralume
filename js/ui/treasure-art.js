// Coffres sculptés (corps + couvercle articulé) et roue de la fortune « casino »
import { ctx, setT, baseT, view } from '../engine/renderer.js';
import { glow, makeCanvas } from '../engine/sprites.js';
import { TAU, rgba, lighten, darken } from '../engine/math.js';
import { Sculptor, drawSculpt, drawBloom } from '../engine/sculpt.js';

const STEEL = '#c3cad8', GOLD = '#ecb44e', DARK = '#1a1c28';
const circ = (x, y, r) => (g) => g.arc(x, y, r, 0, TAU);
const vg = (y0, y1, a, b) => (g) => { const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, a); gr.addColorStop(1, b); return gr; };
const rr = (x, y, w, h, r) => (g) => { g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
const mk = (w, h, px, ox, oy, rim) => new Sculptor(w, h, px, { ox, oy, depth: 10, bevel: 0.6, rim, rimK: 0.8, outline: 0.9, ao: 0.6, env: ['#b8d4ff', '#202430', '#ffffff'], amb: 0.36 });

// ---------- Coffres ----------
const STYLE = {
  neon: { panel: '#1a6dff', accent: '#38f2ff', trim: STEEL, trimMat: 'chrome', gem: '#38f2ff', body: '#22283a' },
  prism: { panel: '#8a2bd6', accent: '#ff3fa9', trim: GOLD, trimMat: 'gold', gem: '#ff7ae6', body: '#2a1838' },
  astral: { panel: '#f2ead8', accent: '#ffc23d', trim: GOLD, trimMat: 'gold', gem: '#ffd23f', body: '#c89a3a' },
  boss: { panel: '#a81830', accent: '#ffb02f', trim: GOLD, trimMat: 'gold', gem: '#ff2a4a', body: '#2a0e14' },
};
const chestCache = new Map();
function chestArt(id, px) {
  px = Math.max(2, Math.min(12, Math.ceil(px)));
  const k = id + '|' + px;
  let A = chestCache.get(k);
  if (A) return A;
  const St = STYLE[id] || STYLE.neon, W = 70;
  // corps
  const B = mk(84, 52, px, 42, 8, St.accent);
  B.paint(rr(-W / 2, -6, W, 42, 5), { c: vg(-6, 36, lighten(St.body, 0.2), darken(St.body, 0.35)), mat: 'metal', h: (s) => s.hCyl(-W / 2, 0, W / 2, 0, 0.55, 0.3) });
  for (const sx of [-1, 1]) B.paint(rr(sx > 0 ? 6 : -W / 2 + 6, 2, W / 2 - 12, 28, 3), { c: vg(2, 30, lighten(St.panel, 0.2), darken(St.panel, 0.4)), mat: id === 'prism' ? 'glass' : 'gloss', h: 0.07, hm: 'add' });
  if (id === 'prism') for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) B.stroke((g) => { const x0 = sx * (8 + i * 8); g.moveTo(x0, 4); g.lineTo(x0 + sx * 6, 28); }, { c: 'rgba(255,255,255,0.45)', w: 0.6, h: 0.04 });
  if (id === 'neon') for (let i = 0; i < 3; i++) B.light((g) => { g.rect(-W / 2 + 9, 8 + i * 8, W / 2 - 18, 1.2); g.rect(9, 8 + i * 8, W / 2 - 18, 1.2); }, rgba(St.accent, 0.8), 1.5);
  B.paint((g) => g.rect(-W / 2, 12, W, 5), { c: St.trim, mat: St.trimMat, h: 0.12, hm: 'add' });
  for (const sx of [-1, 1]) {
    B.paint(rr(sx > 0 ? W / 2 - 10 : -W / 2, -6, 10, 42, 3), { c: St.trim, mat: St.trimMat, h: (s) => s.hCyl(sx > 0 ? W / 2 - 10 : -W / 2, 0, sx > 0 ? W / 2 : -W / 2 + 10, 0, 0.75, 0.45) });
    B.rivets([[sx * (W / 2 - 5), 0], [sx * (W / 2 - 5), 30]], 1.2, St.trimMat === 'gold' ? '#fff1c0' : '#ffffff');
  }
  // serrure + gemme
  B.paint(rr(-9, -4, 18, 22, 4), { c: St.trim, mat: St.trimMat, h: 0.6 });
  B.paint((g) => { g.moveTo(0, 0); g.lineTo(6, 6); g.lineTo(0, 14); g.lineTo(-6, 6); g.closePath(); }, { c: (g) => { const gr = g.createRadialGradient(-2, 4, 0, 0, 7, 8); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.4, lighten(St.gem, 0.3)); gr.addColorStop(1, darken(St.gem, 0.4)); return gr; }, mat: 'glass', h: (s) => s.hDome(0, 7, 8, 0.95, 0.65) });
  B.light(circ(0, 7, 2.5), rgba(St.gem, 0.8), 3);
  // pieds
  for (const sx of [-1, 1]) B.paint(rr(sx * 24 - 6, 34, 12, 6, 2), { c: St.trim, mat: St.trimMat, h: 0.4 });
  // fente lumineuse (lueur du trésor)
  B.light((g) => g.rect(-W / 2 + 2, -6.5, W - 4, 1.6), rgba(St.accent, 0.95), 2.5);
  // couvercle (charnière à gauche, y = -6)
  const L = mk(84, 50, px, 42, 44, St.accent);
  const lid = (g) => { g.moveTo(-W / 2, -6); g.quadraticCurveTo(-W / 2, -34, 0, -36); g.quadraticCurveTo(W / 2, -34, W / 2, -6); g.closePath(); };
  L.paint(lid, { c: vg(-36, -6, lighten(St.panel, 0.35), darken(St.panel, 0.25)), mat: id === 'astral' ? 'gloss' : 'gloss', h: (s) => s.hDomeE(0, -6, W / 2 + 2, 32, 0.9, 0.25) });
  L.stroke(lid, { c: St.trim, mat: St.trimMat, w: 3, h: 0.08 });
  for (const sx of [-1, 1]) L.stroke((g) => { g.moveTo(sx * (W / 2 - 5), -6); g.quadraticCurveTo(sx * (W / 2 - 6), -26, sx * 14, -33); }, { c: St.trim, mat: St.trimMat, w: 4, h: 0.1 });
  L.paint((g) => g.rect(-7, -36, 14, 30), { c: St.trim, mat: St.trimMat, h: 0.1, hm: 'add' });
  if (id === 'astral') { L.paint((g) => { for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i / 10) * TAU, r = i % 2 ? 4 : 9; const x = Math.cos(a) * r, y = -20 + Math.sin(a) * r; if (i) g.lineTo(x, y); else g.moveTo(x, y); } g.closePath(); }, { c: '#ffffff', mat: 'gold', h: 0.15, hm: 'add' }); L.light(circ(0, -20, 3), '#fff3b0', 3); }
  else if (id === 'boss') { for (const sx of [-1, 1]) L.paint((g) => { g.moveTo(sx * 22, -28); g.lineTo(sx * 34, -46); g.lineTo(sx * 28, -24); g.closePath(); }, { c: STEEL, mat: 'chrome', h: 0.5 }); L.paint(circ(0, -20, 6), { c: '#ff2a4a', mat: 'glass', h: 0.3, hm: 'add' }); L.light(circ(0, -20, 3), '#ff6a7a', 3); }
  else L.paint(circ(0, -20, 5), { c: St.gem, mat: 'glass', h: 0.25, hm: 'add' });
  L.light((g) => g.rect(-W / 2 + 2, -7.5, W - 4, 1.4), rgba(St.accent, 0.9), 2);
  A = { base: B.bake(), lid: L.bake() };
  if (chestCache.size > 24) chestCache.clear();
  chestCache.set(k, A);
  return A;
}

export function drawChestLux(x, y, s, C, t, shake = 0, open = 0) {
  const c = ctx, id = C.id || 'neon';
  setT(x, y, s);
  const px = view.rs * s;
  const A = chestArt(id, px * 1.05);
  const sh = shake ? Math.sin(t * 60) * 3 * shake : 0;
  c.translate(sh, 0); c.rotate(sh * 0.02);
  // socle lumineux + halo
  c.globalCompositeOperation = 'lighter';
  const g1 = glow(C.color, 32);
  c.globalAlpha = Math.min(1, 0.6 + 0.2 * Math.sin(t * 3) + open * 0.6 + shake * 0.3); c.drawImage(g1.c, -70, -70, 140, 140);
  c.globalAlpha = 0.55; c.strokeStyle = C.color; c.lineWidth = 1.5; c.beginPath(); c.ellipse(0, 42, 44, 8, 0, 0, TAU); c.stroke();
  c.globalAlpha = 0.25; c.fillStyle = C.color; c.fill();
  c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  // rayons qui s'échappent des fentes pendant les secousses
  if (shake > 0.2) {
    c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * 0.32 + Math.sin(t * 5 + i) * 0.05; c.globalAlpha = 0.18 * shake; c.fillStyle = C.color; c.beginPath(); c.moveTo(-30 + i * 10, -6); c.lineTo(-30 + i * 10 + Math.cos(a - 0.08) * 120, -6 + Math.sin(a - 0.08) * 120); c.lineTo(-30 + i * 10 + Math.cos(a + 0.08) * 120, -6 + Math.sin(a + 0.08) * 120); c.fill(); }
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  }
  drawSculpt(c, A.base);
  c.globalCompositeOperation = 'lighter'; drawBloom(c, A.base, 0.6 + 0.3 * Math.sin(t * 4) + shake * 0.6 + open); c.globalCompositeOperation = 'source-over';
  // couvercle qui bascule
  c.save(); c.translate(-35, -6 - open * 10); c.rotate(-open * 1.15); c.translate(35, 6);
  drawSculpt(c, A.lid);
  c.globalCompositeOperation = 'lighter'; drawBloom(c, A.lid, 0.6 + shake * 0.6); c.globalCompositeOperation = 'source-over';
  c.restore();
  if (open > 0.3) { // colonne de lumière qui jaillit
    c.globalCompositeOperation = 'lighter';
    const gr = c.createLinearGradient(0, -6, 0, -170); gr.addColorStop(0, rgba('#ffffff', 0.85 * open)); gr.addColorStop(0.3, rgba(C.color, 0.5 * open)); gr.addColorStop(1, rgba(C.color, 0));
    c.fillStyle = gr; c.beginPath(); c.moveTo(-30, -6); c.lineTo(30, -6); c.lineTo(48, -170); c.lineTo(-48, -170); c.closePath(); c.fill();
    c.globalCompositeOperation = 'source-over';
  }
  baseT();
}

// ---------- Roue de la fortune ----------
const wheelCache = new Map();
function wheelDisk(R, segs, iconFor) {
  const px = Math.max(1.5, Math.min(3.2, view.rs));
  const k = R.toFixed(1) + '|' + px + '|' + segs.length;
  let w = wheelCache.get(k);
  if (w) return w;
  const n = segs.length, S = Math.ceil(R * 2 * px) + 4;
  const cv = makeCanvas(S, S), g = cv.getContext('2d');
  g.setTransform(px, 0, 0, px, S / 2, S / 2);
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * TAU - Math.PI / 2, a1 = a0 + TAU / n, col = segs[i].label === 'JACKPOT' ? '#ffd23f' : segs[i].color;
    g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, R, a0, a1); g.closePath();
    const gr = g.createRadialGradient(0, 0, R * 0.15, 0, 0, R);
    gr.addColorStop(0, darken(col, 0.82)); gr.addColorStop(0.55, darken(col, i % 2 ? 0.45 : 0.58)); gr.addColorStop(0.92, darken(col, i % 2 ? 0.2 : 0.32)); gr.addColorStop(1, darken(col, 0.6));
    g.fillStyle = gr; g.fill();
    if (segs[i].label === 'JACKPOT') { g.save(); g.clip(); for (let j = 0; j < 8; j++) { g.fillStyle = `hsla(${j * 45},100%,60%,0.35)`; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, R, a0 + (j / 8) * (a1 - a0), a0 + ((j + 1) / 8) * (a1 - a0)); g.closePath(); g.fill(); } g.restore(); }
    // liseré intérieur coloré
    g.strokeStyle = rgba(col, 0.8); g.lineWidth = 1; g.beginPath(); g.arc(0, 0, R * 0.96, a0 + 0.02, a1 - 0.02); g.stroke();
    const am = (a0 + a1) / 2;
    g.save(); g.translate(Math.cos(am) * R * 0.66, Math.sin(am) * R * 0.66); g.rotate(am + Math.PI / 2);
    iconFor(i, g);
    g.restore();
  }
  // rayons dorés entre les cases
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU - Math.PI / 2;
    g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 3.4; g.beginPath(); g.moveTo(Math.cos(a) * R * 0.2, Math.sin(a) * R * 0.2); g.lineTo(Math.cos(a) * R, Math.sin(a) * R); g.stroke();
    const gg = g.createLinearGradient(Math.cos(a) * R * 0.2, Math.sin(a) * R * 0.2, Math.cos(a) * R, Math.sin(a) * R); gg.addColorStop(0, '#8a5a12'); gg.addColorStop(0.5, '#fff1b0'); gg.addColorStop(1, '#b8801e');
    g.strokeStyle = gg; g.lineWidth = 1.8; g.stroke();
  }
  w = { cv, S, px };
  if (wheelCache.size > 6) wheelCache.clear();
  wheelCache.set(k, w);
  return w;
}
const rimCache = new Map();
function wheelRim(R, nb) {
  const px = Math.max(1.5, Math.min(3.2, view.rs));
  const k = R.toFixed(1) + '|' + px;
  let A = rimCache.get(k);
  if (A) return A;
  const R2 = R * 1.17;
  const S = mk(R2 * 2 + 8, R2 * 2 + 8, px, R2 + 4, R2 + 4, '#ffd23f');
  const ring = (g) => { g.arc(0, 0, R2, 0, TAU); g.moveTo(R * 0.99, 0); g.arc(0, 0, R * 0.99, 0, TAU, true); };
  S.paint(ring, { c: (g) => { const gr = g.createLinearGradient(0, -R2, 0, R2); gr.addColorStop(0, '#fff1b0'); gr.addColorStop(0.5, GOLD); gr.addColorStop(1, '#8a5a12'); return gr; }, mat: 'gold', rule: 'evenodd', h: (s) => { const gr = s.hg.createRadialGradient(0, 0, R, 0, 0, R2); gr.addColorStop(0, s.hv(0.3)); gr.addColorStop(0.5, s.hv(0.85)); gr.addColorStop(1, s.hv(0.3)); return gr; } });
  for (let i = 0; i < nb; i++) { const a = (i / nb) * TAU, x = Math.cos(a) * R * 1.085, y = Math.sin(a) * R * 1.085; S.paint(circ(x, y, R * 0.04), { c: '#1a1208', mat: 'metal', h: 0.2 }); }
  // moyeu
  S.paint(circ(0, 0, R * 0.22), { c: GOLD, mat: 'gold', h: (s) => s.hDome(0, 0, R * 0.22, 0.95, 0.4) });
  S.paint(circ(0, 0, R * 0.15), { c: (g) => { const gr = g.createRadialGradient(-R * 0.04, -R * 0.04, 0, 0, 0, R * 0.15); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.4, '#e6a8ff'); gr.addColorStop(1, '#6a2bd6'); return gr; }, mat: 'glass', h: (s) => s.hDome(0, 0, R * 0.15, 1, 0.7) });
  S.light(circ(0, 0, R * 0.07), 'rgba(255,255,255,0.6)', 3);
  const rim = S.bake();
  // pointeur
  const P = mk(40, 52, px, 20, 14, '#ff4f6e');
  const ptr = (g) => { g.moveTo(0, 34); g.lineTo(-13, -4); g.quadraticCurveTo(0, -14, 13, -4); g.closePath(); };
  P.paint(ptr, { c: vg(-14, 34, '#fff1b0', '#b8801e'), mat: 'gold', h: (s) => s.hCyl(-13, 0, 13, 0, 0.9, 0.3) });
  P.paint(circ(0, 2, 5.5), { c: '#ff2a4a', mat: 'glass', h: (s) => s.hDome(0, 2, 5.5, 1, 0.6) });
  P.light(circ(0, 2, 2.4), '#ff8a9a', 2);
  A = { rim, ptr: P.bake(), R2 };
  rimCache.set(k, A);
  return A;
}

export function drawWheelLux(cx, cy, R, segs, ang, t, iconFor, spin = 0, tick = 0) {
  const c = ctx;
  // rayons tournants derrière la roue
  c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * TAU + t * 0.15, w = 0.08;
    const gr = c.createRadialGradient(cx, cy, R * 0.8, cx, cy, R * 2.3); gr.addColorStop(0, 'rgba(255,200,90,0.2)'); gr.addColorStop(1, 'rgba(255,200,90,0)');
    c.fillStyle = gr; c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, R * 2.3, a - w, a + w); c.closePath(); c.fill();
  }
  const g1 = glow('#a259ff', 32); c.globalAlpha = 0.55 + spin * 0.3; c.drawImage(g1.c, cx - R * 1.5, cy - R * 1.5, R * 3, R * 3); c.globalAlpha = 1;
  c.globalCompositeOperation = 'source-over';
  // disque (tourne)
  const D = wheelDisk(R, segs, iconFor);
  c.save(); c.translate(cx, cy); c.rotate(ang); c.drawImage(D.cv, -D.S / 2 / D.px, -D.S / 2 / D.px, D.S / D.px, D.S / D.px); c.restore();
  // reflet fixe (vitre bombée)
  c.globalCompositeOperation = 'lighter';
  const gl = c.createRadialGradient(cx - R * 0.35, cy - R * 0.45, 0, cx - R * 0.35, cy - R * 0.45, R * 0.9);
  gl.addColorStop(0, 'rgba(255,255,255,0.22)'); gl.addColorStop(0.5, 'rgba(255,255,255,0.05)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = gl; c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.fill();
  c.globalCompositeOperation = 'source-over';
  // jante dorée + ampoules qui chassent
  const A = wheelRim(R, 24);
  c.save(); c.translate(cx, cy); drawSculpt(c, A.rim); c.restore();
  c.globalCompositeOperation = 'lighter';
  const bulb = glow('#fff3b0', 16), sp = spin > 0.05 ? 18 : 5;
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * TAU, x = cx + Math.cos(a) * R * 1.085, y = cy + Math.sin(a) * R * 1.085;
    const on = spin > 0.05 ? Math.floor(t * sp + i) % 3 === 0 : Math.floor(t * sp + i) % 2 === 0;
    c.globalAlpha = on ? 1 : 0.25;
    c.drawImage(bulb.c, x - R * 0.09, y - R * 0.09, R * 0.18, R * 0.18);
    c.fillStyle = on ? '#ffffff' : '#ffb347'; c.beginPath(); c.arc(x, y, R * 0.025, 0, TAU); c.fill();
  }
  c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  // pointeur (sursaute à chaque case)
  c.save(); c.translate(cx, cy - R * 1.12); c.rotate(-tick * 0.35); drawSculpt(c, A.ptr); c.restore();
}
