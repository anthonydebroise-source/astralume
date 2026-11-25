// Écran titre façon borne d'arcade et vitrine du hangar (accueil)
import { ctx, baseT, setT, view, addShake } from '../engine/renderer.js';
import { glow, makeCanvas } from '../engine/sprites.js';
import { TAU, rgba, clamp, ease, RNG } from '../engine/math.js';
import { Sculptor, drawSculpt, drawBloom } from '../engine/sculpt.js';
import { buildBossArt, BOSS_ART, drawReactor } from '../game/bossart.js';
import '../game/bossart2.js';
import { SHIP_FX } from '../game/ships.js';
import { SHIP_BY_ID } from '../economy/data.js';
import { WORLDS } from '../levels/worlds.js';
import { planetCanvas } from './art-ui.js';

const FONT = '"Avenir Next Condensed","Avenir Next","Arial Narrow",system-ui,sans-serif';

// ---------- Logo chromé en relief ----------
let logoC = null;
export function buildLogo() {
  const px = clamp(view.rs * 1.05, 1.5, 3.2);
  if (logoC && logoC.px === px) return logoC;
  const W = 390, H = 150;
  const S = new Sculptor(W, H, px, { ox: W / 2, oy: 66, depth: 22, bevel: 0.8, rim: '#ff4fd8', rimK: 0.9, env: ['#8fc0ff', '#2a1030', '#ffffff'], outline: 1.4, ao: 0.5, amb: 0.35 });
  const word = 'ASTRALUME';
  const fs = 78;
  S.a.font = `italic 900 ${fs}px ${FONT}`;
  const tw = S.a.measureText(word).width, k = Math.min(1, 352 / tw), wa = S.a.measureText('A').width;
  const txt = (g, fn) => { g.save(); g.scale(k, k); g.transform(1, 0, -0.12, 1, 0, 0); g.font = `italic 900 ${fs}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.lineJoin = 'round'; fn(g); g.restore(); };
  const Y = 26;
  const mat = (g, m) => { const v = { chrome: '255,45,255', gloss: '217,35,30', gold: '230,27,255' }[m]; g.fillStyle = g.strokeStyle = `rgb(${v})`; };
  // 1. bordure colorée (laque)
  txt(S.a, (g) => { const gr = g.createLinearGradient(0, Y - fs * 0.8, 0, Y + 6); gr.addColorStop(0, '#ff6ae6'); gr.addColorStop(0.5, '#9b3cff'); gr.addColorStop(1, '#3a1aa8'); g.strokeStyle = gr; g.lineWidth = 15; g.strokeText(word, 0, Y); });
  txt(S.hg, (g) => { g.strokeStyle = S.hv(0.22); g.lineWidth = 15; g.strokeText(word, 0, Y); });
  txt(S.m, (g) => { mat(g, 'gloss'); g.lineWidth = 15; g.strokeText(word, 0, Y); });
  txt(S.x, (g) => { g.strokeStyle = 'rgb(0,40,0)'; g.lineWidth = 15; g.strokeText(word, 0, Y); });
  // 2. biseau chromé
  txt(S.a, (g) => { g.strokeStyle = '#eef3ff'; g.lineWidth = 6; g.strokeText(word, 0, Y); });
  txt(S.hg, (g) => { g.strokeStyle = S.hv(0.5); g.lineWidth = 6; g.strokeText(word, 0, Y); });
  txt(S.m, (g) => { mat(g, 'chrome'); g.lineWidth = 6; g.strokeText(word, 0, Y); });
  // 3. face : dégradé « coucher de soleil chromé »
  txt(S.a, (g) => { const gr = g.createLinearGradient(0, Y - fs * 0.74, 0, Y); gr.addColorStop(0, '#dff4ff'); gr.addColorStop(0.42, '#7fd0ff'); gr.addColorStop(0.5, '#ffffff'); gr.addColorStop(0.53, '#4a2a7a'); gr.addColorStop(0.75, '#ff4fa8'); gr.addColorStop(1, '#ffd27a'); g.fillStyle = gr; g.fillText(word, 0, Y); });
  txt(S.hg, (g) => { g.fillStyle = S.hv(0.62); g.fillText(word, 0, Y); });
  txt(S.m, (g) => { mat(g, 'gloss'); g.fillText(word, 0, Y); });
  // liseré néon externe
  txt(S.e, (g) => { g.strokeStyle = 'rgba(120,230,255,0.9)'; g.lineWidth = 17; g.strokeText(word, 0, Y); g.globalCompositeOperation = 'destination-out'; g.lineWidth = 14.5; g.strokeText(word, 0, Y); });
  // bandeau « RALLUMEZ LES ÉTOILES »
  const bw = 236, by = 44, bh = 22;
  const band = (g) => { g.moveTo(-bw / 2 + 10, by); g.lineTo(bw / 2 + 4, by); g.lineTo(bw / 2 - 6, by + bh); g.lineTo(-bw / 2 - 4, by + bh); g.closePath(); };
  S.paint(band, { c: (g) => { const gr = g.createLinearGradient(0, by, 0, by + bh); gr.addColorStop(0, '#2a2f44'); gr.addColorStop(1, '#0c0d18'); return gr; }, mat: 'steel', h: 0.3 });
  S.stroke(band, { c: '#e9b04c', mat: 'gold', w: 1.6, h: 0.1 });
  const sub = (g, style) => { g.save(); g.font = `italic 800 13px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; if ('letterSpacing' in g) g.letterSpacing = '3px'; g.fillStyle = style; g.fillText('RALLUMEZ LES ÉTOILES', 0, by + bh / 2 + 0.5); g.restore(); };
  sub(S.a, '#ffd98a'); sub(S.hg, S.hv(0.42)); sub(S.m, 'rgb(230,27,255)'); sub(S.e, 'rgba(255,190,90,0.35)');
  logoC = S.bake(); logoC.px = px; logoC.k = k; logoC.ax = (-tw / 2 + wa * 0.62) * k; logoC.ay = (Y - fs * 0.66) * k;
  return logoC;
}
// tampon pour le reflet balayant
const sw = makeCanvas(8, 8), swg = sw.getContext('2d');
function drawLogoAt(L, x, y, sc, t, alpha) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.scale(sc, sc);
  ctx.globalCompositeOperation = 'lighter';
  const g = glow('#a259ff', 32); ctx.globalAlpha = alpha * 0.55; ctx.drawImage(g.c, -230, -110, 460, 200);
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = 'source-over';
  drawSculpt(ctx, L);
  ctx.globalCompositeOperation = 'lighter';
  drawBloom(ctx, L, 0.8 + 0.2 * Math.sin(t * 3));
  // reflet qui balaie les lettres
  const u = ((t * 0.38) % 1.6) - 0.3;
  if (u > -0.2 && u < 1.2) {
    if (sw.width !== L.cv.width || sw.height !== L.cv.height) { sw.width = L.cv.width; sw.height = L.cv.height; }
    swg.globalCompositeOperation = 'copy'; swg.drawImage(L.cv, 0, 0);
    swg.globalCompositeOperation = 'source-in';
    const X = sw.width * u, gr = swg.createLinearGradient(X - 60, 0, X + 60, sw.height);
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.05)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.85)'); gr.addColorStop(0.56, 'rgba(255,255,255,0.1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    swg.fillStyle = gr; swg.fillRect(0, 0, sw.width, sw.height);
    ctx.drawImage(sw, -L.ox, -L.oy, L.w, L.h);
  }
  // étincelle sur le « A »
  const fl = Math.max(0, Math.sin(t * 1.3)) ** 6;
  if (fl > 0.02) {
    const fx = L.ax, fy = L.ay;
    ctx.globalAlpha = alpha * fl;
    const s2 = glow('#ffffff', 16); ctx.drawImage(s2.c, fx - 16, fy - 16, 32, 32);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.moveTo(fx - 26, fy); ctx.lineTo(fx, fy - 1.2); ctx.lineTo(fx + 26, fy); ctx.lineTo(fx, fy + 1.2); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(fx, fy - 16); ctx.lineTo(fx - 1, fy); ctx.lineTo(fx, fy + 16); ctx.lineTo(fx + 1, fy); ctx.closePath(); ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();
}

// ---------- Champ d'étoiles en hyperespace ----------
const STARS = [];
{ const r = new RNG(77); for (let i = 0; i < 140; i++) STARS.push({ a: r.next() * TAU, z: r.next(), s: 0.4 + r.next() * 0.8, c: r.pick(['#ffffff', '#bfe8ff', '#ffd6f4', '#c8b8ff']) }); }
function warp(cx, cy, R, t, speed, alpha) {
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  for (const s of STARS) {
    const z = (s.z + t * speed * s.s * 0.18) % 1, d = z * z * R, d0 = Math.max(0, d - (8 + z * 70) * speed);
    const ca = Math.cos(s.a), sa = Math.sin(s.a);
    ctx.globalAlpha = alpha * Math.min(1, z * 2.5);
    ctx.strokeStyle = s.c; ctx.lineWidth = 0.5 + z * 1.6;
    ctx.beginPath(); ctx.moveTo(cx + ca * d0, cy + sa * d0); ctx.lineTo(cx + ca * d, cy + sa * d); ctx.stroke();
  }
  ctx.globalAlpha = 1; ctx.lineCap = 'butt';
  ctx.globalCompositeOperation = 'source-over';
}
function rays(cx, cy, R, t, col, alpha) {
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU + t * 0.08, w = 0.07 + 0.04 * Math.sin(i * 3.1 + t);
    const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    gr.addColorStop(0, rgba(col, 0.22 * alpha)); gr.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, a - w, a + w); ctx.closePath(); ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
}

// ---------- Boss menaçant en arrière-plan ----------
let bossArt = null, bossPending = false;
function titleBoss() {
  if (bossArt || bossPending) return bossArt;
  bossPending = true;
  setTimeout(() => {
    const P = WORLDS[0].pal;
    try { bossArt = buildBossArt('crab', { c1: P.enemy, c2: P.enemy2, cg: P.eglow, dk: P.edark }, clamp(view.rs * 1.25, 1, 3)); bossArt.born = performance.now(); } catch (e) { console.error(e); }
  }, 350);
  return null;
}
const TB = { parts: [], beat: 0, sc: 1, x: 0, y: 0 };
function drawBossSil(x, y, sc, t, alpha) {
  const A = titleBoss();
  if (!A) return;
  const a = alpha * Math.min(1, (performance.now() - A.born) / 900);
  if (!TB.parts.length) {
    const P = WORLDS[0].pal;
    TB.col = { c1: P.enemy, c2: P.enemy2, cg: P.eglow, dk: P.edark };
    TB.art = A;
    for (const [kind, ox, oy, r, i] of [['shell', -44, -4, 32], ['shell', 44, -4, 32], ['cannon', -50, -48, 14], ['cannon', 0, -62, 14], ['cannon', 50, -48, 14], ['arm', -112, 40, 26, 0], ['arm', 112, 40, 26, 1]])
      TB.parts.push({ kind, ox, oy, bx: ox, by: oy, r, i, alive: true });
    TB.lookFrom = () => [0, 0.9];
  }
  TB.x = x; TB.y = y; TB.sc = sc; TB.g = { player: { x, y: y + 500 } };
  for (const p of TB.parts) if (p.kind === 'arm') { p.ox = p.bx + Math.sin(t * 1.2 + p.i * 2) * 8; p.oy = p.by + Math.cos(t * 1.6 + p.i) * 10; }
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); ctx.globalAlpha = a;
  BOSS_ART.crab.draw(ctx, TB, t);
  ctx.save(); ctx.translate(0, 42); drawReactor(ctx, TB, { r: 24 }, t); ctx.restore();
  ctx.restore();
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}

// ---------- Vaisseau héros ----------
function drawHero(id, x, y, sc, t, bank, thrust) {
  const F = SHIP_FX[id], D = SHIP_BY_ID[id];
  if (!F) return;
  ctx.globalCompositeOperation = 'lighter';
  const g = glow(D.color, 32);
  ctx.globalAlpha = 0.45; ctx.drawImage(g.c, x - 60 * sc / 2.6, y - 50 * sc / 2.6, 120 * sc / 2.6, 120 * sc / 2.6);
  // traînée de réacteur
  const L = (40 + 30 * thrust) * sc / 2.6;
  const gr = ctx.createLinearGradient(x, y + 20 * sc / 2.6, x, y + 20 * sc / 2.6 + L);
  gr.addColorStop(0, rgba('#ffffff', 0.9)); gr.addColorStop(0.2, rgba(D.color, 0.7)); gr.addColorStop(1, rgba(D.color, 0));
  ctx.fillStyle = gr; ctx.globalAlpha = 0.8;
  ctx.beginPath(); ctx.ellipse(x, y + 20 * sc / 2.6 + L * 0.45, 7 * sc / 2.6, L * 0.55, 0, 0, TAU); ctx.fill();
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  const m = ctx.getTransform();
  ctx.translate(x, y); ctx.rotate(bank * 0.12); ctx.scale(sc * (1 - Math.abs(bank) * 0.2), sc);
  F.draw(ctx, t, D.color, D.color2, bank);
  ctx.setTransform(m);
}

// ---------- Scène du titre ----------
export function drawTitleScene(r, t, shipId) {
  const cx = r.x + r.w / 2, H = r.h;
  const L = buildLogo();
  // intro : hyperespace qui ralentit
  const sp = 3.2 - 2.4 * ease.outCubic(clamp(t / 2.2, 0, 1));
  const vy = r.y + H * 0.3;
  rays(cx, vy, H * 0.9, t, '#a259ff', clamp(t - 0.4, 0, 1));
  warp(cx, vy, Math.hypot(r.w, H) * 0.75, t, sp, 0.9);
  // boss qui surgit derrière le logo
  const bu = ease.outCubic(clamp((t - 1.2) / 1.6, 0, 1));
  drawBossSil(cx, r.y + H * 0.13 - (1 - bu) * 80 + Math.sin(t * 0.7) * 4, 1.15, t, bu);
  // voile sombre pour détacher le logo
  { const gr = ctx.createLinearGradient(0, r.y + H * 0.2, 0, r.y + H * 0.5); gr.addColorStop(0, 'rgba(6,3,16,0)'); gr.addColorStop(0.5, 'rgba(6,3,16,0.55)'); gr.addColorStop(1, 'rgba(6,3,16,0)'); ctx.fillStyle = gr; ctx.fillRect(r.x, r.y + H * 0.2, r.w, H * 0.3); }
  // logo qui claque
  const lu = clamp((t - 0.45) / 0.45, 0, 1);
  if (lu > 0) {
    const sc = (lu < 1 ? 2.6 - 1.6 * ease.outCubic(lu) : 1 + 0.012 * Math.sin(t * 2.2)) * Math.min(1, r.w / 400);
    drawLogoAt(L, cx, r.y + H * 0.38, sc, t, Math.min(1, lu * 1.6));
    if (lu >= 1 && !drawTitleScene.slammed) { drawTitleScene.slammed = true; addShake(0.35); drawTitleScene.flash = 1; }
  }
  if (drawTitleScene.flash > 0) {
    ctx.globalCompositeOperation = 'lighter';
    const fr = 40 + (1 - drawTitleScene.flash) * 260;
    ctx.strokeStyle = rgba('#ffffff', drawTitleScene.flash * 0.8); ctx.lineWidth = 6 * drawTitleScene.flash;
    ctx.beginPath(); ctx.ellipse(cx, r.y + H * 0.38, fr, fr * 0.45, 0, 0, TAU); ctx.stroke();
    const g = glow('#ffffff', 32); ctx.globalAlpha = drawTitleScene.flash * 0.7; ctx.drawImage(g.c, cx - 220, r.y + H * 0.38 - 120, 440, 240); ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    drawTitleScene.flash = Math.max(0, drawTitleScene.flash - 0.03);
  }
  // vaisseau héros qui monte
  const su = ease.outCubic(clamp((t - 1.0) / 1.2, 0, 1));
  if (su > 0) {
    const bank = Math.sin(t * 0.9) * 0.6;
    drawHero(shipId, cx + Math.sin(t * 0.9) * 26, r.y + H * (0.95 - 0.29 * su) + Math.sin(t * 1.7) * 5, 2.6, t, bank, 0.6 + 0.4 * Math.sin(t * 9));
  }
}
drawTitleScene.slammed = false; drawTitleScene.flash = 0;

// ---------- Vitrine du hangar (accueil) ----------
export function drawHangar(r, t, shipId, W) {
  const cx = r.x + r.w / 2, cy = r.y + r.h * 0.58;
  // planète du monde en fond
  const pc = planetCanvas(W, 160, false), ps = Math.min(r.w, r.h) * 1.25;
  ctx.globalAlpha = 0.9; ctx.drawImage(pc, cx + r.w * 0.18 - ps / 2, r.y + r.h * 0.32 - ps / 2, ps, ps); ctx.globalAlpha = 1;
  // plateforme holographique
  ctx.globalCompositeOperation = 'lighter';
  const D = SHIP_BY_ID[shipId], col = D ? D.color : '#38f2ff';
  for (let i = 0; i < 4; i++) {
    const u = ((t * 0.5 + i / 4) % 1), rr = 30 + u * 70;
    ctx.strokeStyle = rgba(col, (1 - u) * 0.55); ctx.lineWidth = 2 - u;
    ctx.beginPath(); ctx.ellipse(cx, cy + 46, rr, rr * 0.28, 0, 0, TAU); ctx.stroke();
  }
  ctx.strokeStyle = rgba(col, 0.9); ctx.lineWidth = 2.2; ctx.beginPath(); ctx.ellipse(cx, cy + 46, 66, 18, 0, 0, TAU); ctx.stroke();
  ctx.strokeStyle = rgba('#ffffff', 0.6); ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(cx, cy + 46, 52, 14, 0, 0, TAU); ctx.stroke();
  const gb = ctx.createLinearGradient(0, cy + 46, 0, cy - 90);
  gb.addColorStop(0, rgba(col, 0.28)); gb.addColorStop(1, rgba(col, 0));
  ctx.fillStyle = gb; ctx.beginPath(); ctx.moveTo(cx - 62, cy + 46); ctx.lineTo(cx - 40, cy - 90); ctx.lineTo(cx + 40, cy - 90); ctx.lineTo(cx + 62, cy + 46); ctx.closePath(); ctx.fill();
  // lignes de balayage
  for (let i = 0; i < 3; i++) { const y = cy + 40 - ((t * 40 + i * 45) % 135); ctx.strokeStyle = rgba(col, 0.25 * (1 - (cy + 40 - y) / 135)); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx - 50, y); ctx.lineTo(cx + 50, y); ctx.stroke(); }
  ctx.globalCompositeOperation = 'source-over';
  drawHero(shipId, cx + Math.sin(t * 0.8) * 6, cy - 8 + Math.sin(t * 1.6) * 5, 2.5, t, Math.sin(t * 0.8) * 0.35, 0.5 + 0.5 * Math.sin(t * 8));
}
