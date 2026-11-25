// Partie en cours : orchestre vagues, collisions, butin, boss, événements, fin de niveau
import { TAU, rand, dist2, angTo, angDiff, rgba, lighten, mixHex, clamp, chance } from '../engine/math.js';
import { view, ctx, cam, baseT, setT, setRT, setRTS, addShake, flash, hitstop, drawFlash } from '../engine/renderer.js';
import { input } from '../engine/input.js';
import { fx, updateParticles, drawParticles, clearParticles } from '../engine/particles.js';
import { sprite, glow, orb, makeCanvas } from '../engine/sprites.js';
import { ENEMIES } from './enemies.js';
import './enemies2.js';
import { initPath, updatePath } from './paths.js';
import { Player } from './player.js';
import { Drone } from './drones.js';
import { Boss, prebakeBoss } from './boss.js';
import { Background } from './background.js';
import { Events } from './events.js';
import { Constellation } from './combo.js';
import { Hud } from './hud.js';
import { makePickup, updatePickups, drawPickups, PK } from './pickups.js';
import { explode, hitSpark, deflect, sparkle, cancelPop } from './fx.js';
import { formationSpawns, coinPattern } from '../levels/formations.js';
import { endlessChunk } from '../levels/generator.js';
import { radioLine } from './radio.js';
import { S } from '../economy/save.js';
import { dronePower, ownsShip, ownsDrone } from '../economy/economy.js';
import { SHIPS, DRONES, SHIP_BY_ID, DRONE_BY_ID } from '../economy/data.js';
import { sfx } from '../audio/sfx.js';
import { music } from '../audio/music.js';
import { drawPart } from './art.js';
import { drawAlienSculpt, hasAlienArt } from './alienart.js';

// ---------- Sprites de projectiles ----------
const BK = {
  orb: { r: 4.5 }, big: { r: 8 }, needle: { r: 3, orient: 1 }, petal: { r: 4, orient: 1 }, shard: { r: 3.4, orient: 1 }, drop: { r: 4, orient: 1, grav: 150 },
  emis: { r: 5, orient: 1 },
  // signatures de colosses
  bubble: { r: 9 }, bell: { r: 7 }, seed: { r: 5.5 }, blade: { r: 6, orient: 1 }, spark: { r: 3.6, orient: 1 },
  fire: { r: 6 }, rock: { r: 8, grav: 260 }, claw: { r: 12, orient: 1 }, pulse: { r: 6 },
};
// Projectile ennemi « danger » : halo coloré, anneau sombre, cœur blanc (jamais confondu avec une pièce)
function dangerOrb(color, r) {
  const R = r * 2.4;
  return sprite('dorb' + color + r, R * 2, R * 2, (g) => {
    g.translate(R, R);
    let gr = g.createRadialGradient(0, 0, r * 0.5, 0, 0, R);
    gr.addColorStop(0, rgba(color, 0.75)); gr.addColorStop(0.45, rgba(color, 0.25)); gr.addColorStop(1, rgba(color, 0));
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill();
    g.fillStyle = color; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(25,0,18,0.95)'; g.lineWidth = r * 0.28; g.beginPath(); g.arc(0, 0, r * 0.98, 0, TAU); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = Math.max(0.8, r * 0.14); g.beginPath(); g.arc(0, 0, r * 1.22, 0, TAU); g.stroke();
    gr = g.createRadialGradient(-r * 0.15, -r * 0.15, 0, 0, 0, r * 0.62);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.7, '#ffffff'); gr.addColorStop(1, rgba(color, 1));
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r * 0.6, 0, TAU); g.fill();
  });
}
// Projectiles propres aux colosses : formes distinctes, même code « danger » (contour sombre, cœur blanc)
const BOSS_EB = {
  bubble: (color) => sprite('ebbub' + color, 30, 30, (g) => {
    g.translate(15, 15);
    let gr = g.createRadialGradient(0, 0, 4, 0, 0, 14); gr.addColorStop(0, rgba(color, 0)); gr.addColorStop(0.7, rgba(color, 0.35)); gr.addColorStop(1, rgba(color, 0)); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 14, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(25,0,18,0.9)'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 9.5, 0, TAU); g.stroke();
    g.strokeStyle = '#ffffff'; g.lineWidth = 1.8; g.beginPath(); g.arc(0, 0, 9, 0, TAU); g.stroke();
    g.fillStyle = rgba(color, 0.45); g.beginPath(); g.arc(0, 0, 7.6, 0, TAU); g.fill();
    g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(-3.2, -3.4, 2.6, 1.7, -0.7, 0, TAU); g.fill();
  }),
  bell: (color) => sprite('ebbell' + color, 30, 30, (g) => {
    g.translate(15, 14);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, 14); gr.addColorStop(0, rgba(color, 0.7)); gr.addColorStop(1, rgba(color, 0)); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 14, 0, TAU); g.fill();
    g.beginPath(); g.moveTo(-8, 3); g.bezierCurveTo(-8, -10, 8, -10, 8, 3); g.quadraticCurveTo(4, 1, 2.5, 4); g.quadraticCurveTo(0, 2, -2.5, 4); g.quadraticCurveTo(-4, 1, -8, 3); g.closePath();
    g.strokeStyle = 'rgba(25,0,18,0.95)'; g.lineWidth = 2.6; g.stroke(); g.fillStyle = '#ffffff'; g.fill();
    g.fillStyle = color; g.beginPath(); g.ellipse(0, -2, 4.5, 3, 0, 0, TAU); g.fill();
    g.strokeStyle = color; g.lineWidth = 1.2; for (const x of [-4, 0, 4]) { g.beginPath(); g.moveTo(x, 4); g.quadraticCurveTo(x + 1.5, 8, x, 11); g.stroke(); }
  }),
  seed: (color) => sprite('ebseed' + color, 26, 26, (g) => {
    g.translate(13, 13);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, 12); gr.addColorStop(0, rgba(color, 0.7)); gr.addColorStop(1, rgba(color, 0)); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 12, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(25,0,18,0.95)'; g.lineWidth = 2.4;
    g.beginPath(); for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU, r = i % 2 ? 3.4 : 6.6; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.stroke(); g.fillStyle = '#ffffff'; g.fill();
    g.fillStyle = color; g.beginPath(); g.arc(0, 0, 2.4, 0, TAU); g.fill();
  }),
  blade: (color) => sprite('ebblade' + color, 30, 30, (g) => {
    g.translate(15, 15);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, 14); gr.addColorStop(0, rgba(color, 0.65)); gr.addColorStop(1, rgba(color, 0)); g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, 13, 9, 0, 0, TAU); g.fill();
    g.beginPath(); g.moveTo(-11, 3); g.quadraticCurveTo(0, -11, 11, 3); g.quadraticCurveTo(0, -4, -11, 3); g.closePath();
    g.strokeStyle = 'rgba(25,0,18,0.95)'; g.lineWidth = 2.6; g.stroke(); g.fillStyle = '#ffffff'; g.fill(); g.strokeStyle = color; g.lineWidth = 1.1; g.stroke();
  }),
  spark: (color) => sprite('ebspark' + color, 24, 30, (g) => {
    g.translate(12, 15);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, 12); gr.addColorStop(0, rgba(color, 0.8)); gr.addColorStop(1, rgba(color, 0)); g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, 8, 13, 0, 0, TAU); g.fill();
    g.beginPath(); g.moveTo(1, -10); g.lineTo(-3, -1); g.lineTo(1.5, -1); g.lineTo(-1, 10); g.lineTo(4, -2.5); g.lineTo(-0.5, -2.5); g.closePath();
    g.strokeStyle = 'rgba(25,0,18,0.95)'; g.lineWidth = 2.2; g.stroke(); g.fillStyle = '#ffffff'; g.fill();
  }),
  fire: (color) => sprite('ebfire' + color, 30, 30, (g) => {
    g.translate(15, 15);
    let gr = g.createRadialGradient(0, 0, 0, 0, 0, 14); gr.addColorStop(0, rgba('#ffd27a', 0.9)); gr.addColorStop(0.5, rgba(color, 0.5)); gr.addColorStop(1, rgba(color, 0)); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 14, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(25,0,18,0.9)'; g.lineWidth = 2.4; g.beginPath(); g.arc(0, 0, 6.4, 0, TAU); g.stroke();
    gr = g.createRadialGradient(-1, -1, 0, 0, 0, 6.4); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.55, '#fff0b0'); gr.addColorStop(1, color); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 6.2, 0, TAU); g.fill();
  }),
  rock: (color) => sprite('ebrock' + color, 32, 32, (g) => {
    g.translate(16, 16);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, 15); gr.addColorStop(0, rgba(color, 0.55)); gr.addColorStop(1, rgba(color, 0)); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 15, 0, TAU); g.fill();
    g.beginPath(); for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU, r = 8.5 + ((i * 7) % 3) * 1.1; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath();
    g.strokeStyle = 'rgba(25,0,18,0.95)'; g.lineWidth = 2.6; g.stroke(); g.fillStyle = '#d9d2e8'; g.fill();
    g.strokeStyle = color; g.lineWidth = 1.6; g.stroke(); g.fillStyle = 'rgba(255,255,255,0.85)'; g.beginPath(); g.arc(-2.5, -2.5, 2.4, 0, TAU); g.fill();
  }),
  claw: (color) => sprite('ebclaw' + color, 40, 40, (g) => {
    g.translate(20, 20);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, 19); gr.addColorStop(0, rgba(color, 0.6)); gr.addColorStop(1, rgba(color, 0)); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 19, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(25,0,18,0.95)'; g.lineWidth = 2.8; g.fillStyle = '#ffffff';
    for (const k of [-1, 1]) { g.beginPath(); g.moveTo(0, 6); g.quadraticCurveTo(k * 15, -2, k * 4, -14); g.quadraticCurveTo(k * 5, -3, 0, 6); g.closePath(); g.stroke(); g.fill(); }
    g.beginPath(); g.arc(0, 7, 6, 0, TAU); g.stroke(); g.fill(); g.fillStyle = color; g.beginPath(); g.arc(0, 7, 3, 0, TAU); g.fill();
  }),
};
function ebSprite(kind, color) {
  if (kind === 'emis') return sprite('ebemis' + color, 30, 30, (g) => { // missile ennemi à tête chercheuse
    g.translate(15, 15);
    const gr = g.createRadialGradient(0, 6, 0, 0, 6, 12); gr.addColorStop(0, rgba(color, 0.8)); gr.addColorStop(1, rgba(color, 0));
    g.fillStyle = gr; g.beginPath(); g.ellipse(0, 6, 7, 12, 0, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(25,0,18,0.95)'; g.lineWidth = 2.4;
    g.beginPath(); g.moveTo(0, -10); g.quadraticCurveTo(3.4, -6, 3, 4); g.lineTo(5.5, 8); g.lineTo(-5.5, 8); g.lineTo(-3, 4); g.quadraticCurveTo(-3.4, -6, 0, -10); g.closePath();
    g.stroke(); g.fillStyle = '#ffffff'; g.fill();
    g.fillStyle = color; g.beginPath(); g.moveTo(0, -10); g.quadraticCurveTo(2.6, -7, 2.8, -4); g.lineTo(-2.8, -4); g.quadraticCurveTo(-2.6, -7, 0, -10); g.fill();
    g.fillRect(-5.5, 5.5, 11, 2.5);
  });
  if (kind === 'orb') return dangerOrb(color, 4.8);
  if (kind === 'pulse') return dangerOrb(color, 6);
  if (BOSS_EB[kind]) return BOSS_EB[kind](color);
  if (kind === 'big') return dangerOrb(color, 8);
  return sprite('eb' + kind + color, 30, 30, (g) => {
    g.translate(15, 15);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, 14);
    gr.addColorStop(0, rgba(color, 0.7)); gr.addColorStop(1, rgba(color, 0));
    g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, 8, 14, 0, 0, TAU); g.fill();
    g.fillStyle = '#ffffff'; g.strokeStyle = 'rgba(25,0,18,0.95)'; g.lineWidth = 2.6;
    g.beginPath();
    if (kind === 'needle') g.ellipse(0, 0, 2.4, 8, 0, 0, TAU);
    else if (kind === 'petal') { g.moveTo(0, -8); g.quadraticCurveTo(6, 0, 0, 8); g.quadraticCurveTo(-6, 0, 0, -8); }
    else if (kind === 'shard') { g.moveTo(0, -8); g.lineTo(3.4, 0); g.lineTo(0, 8); g.lineTo(-3.4, 0); g.closePath(); }
    else { g.arc(0, 2, 4, 0, Math.PI); g.lineTo(0, -8); g.closePath(); }
    g.stroke(); g.fill(); g.strokeStyle = color; g.lineWidth = 1.2; g.stroke();
  });
}
function pbSprite(kind, color) {
  return sprite('pb' + kind + color, 32, 32, (g) => {
    g.translate(16, 16);
    const halo = (rx, ry) => { const gr = g.createRadialGradient(0, 0, 0, 0, 0, Math.max(rx, ry)); gr.addColorStop(0, rgba(color, 0.9)); gr.addColorStop(1, rgba(color, 0)); g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU); g.fill(); };
    switch (kind) {
      case 'feather': halo(7, 13); g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(0, -10); g.quadraticCurveTo(4, 0, 0, 9); g.quadraticCurveTo(-4, 0, 0, -10); g.fill(); g.strokeStyle = color; g.lineWidth = 0.8; g.beginPath(); g.moveTo(0, -9); g.lineTo(0, 9); g.stroke(); break;
      case 'missile': case 'micro': halo(6, 10); g.fillStyle = '#ffffff'; g.fillRect(-1.8, -7, 3.6, 12); g.fillStyle = color; g.beginPath(); g.moveTo(-1.8, -7); g.lineTo(0, -10); g.lineTo(1.8, -7); g.fill(); break;
      case 'spark': halo(7, 7); g.fillStyle = '#ffffff'; g.beginPath(); g.arc(0, 0, 2.2, 0, TAU); g.fill(); break;
      case 'plasma': halo(6, 11); g.fillStyle = '#fff5d0'; g.beginPath(); g.ellipse(0, 0, 2.2, 6, 0, 0, TAU); g.fill(); break;
      case 'shard': halo(7, 11); g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(0, -9); g.lineTo(3, 0); g.lineTo(0, 9); g.lineTo(-3, 0); g.closePath(); g.fill(); break;
      case 'prism': halo(7, 13); g.fillStyle = '#ffffff'; g.fillRect(-1.5, -10, 3, 20); break;
      default: halo(5, 12); g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(0, 0, 1.8, 8, 0, 0, TAU); g.fill();
    }
  });
}
const CLS_SIZE = { xs: 1, s: 1, m: 2, l: 3, g: 2, snake: 3 };
// Rendu « pro » des aliens : contour sombre net + liseré lumineux, via un tampon hors écran
const EB = makeCanvas(64, 64), EBg = EB.getContext('2d');
const SB = makeCanvas(64, 64), SBg = SB.getContext('2d');
const TB = makeCanvas(64, 64), TBg = TB.getContext('2d');
let SHADE_ON = true;
const OUT8 = [[1.5, 0], [-1.5, 0], [0, 1.5], [0, -1.5], [1.05, 1.05], [-1.05, 1.05], [1.05, -1.05], [-1.05, -1.05]];
const OUT4 = [[1.3, 1.3], [-1.3, 1.3], [1.3, -1.3], [-1.3, -1.3]];
let OUT = OUT8;
function drawEnemyPro(e) {
  const r = e.r * e.scale;
  const U = r * 3.4 + 8, px = Math.min(512, Math.ceil(U * view.rs));
  if (EB.width < px) { EB.width = EB.height = SB.width = SB.height = px; }
  EBg.setTransform(1, 0, 0, 1, 0, 0); EBg.clearRect(0, 0, px, px);
  const k = view.rs * e.scale, a = e.face || 0, c = Math.cos(a) * k, s = Math.sin(a) * k;
  EBg.setTransform(c, s, -s, c, px / 2, px / 2);
  EBg.globalAlpha = 1;
  e.T.draw(EBg, e, e.t);
  EBg.globalAlpha = 1;
  EBg.setTransform(1, 0, 0, 1, 0, 0);
  // modelé 3D : biseau d'ombre (bas-droite), biseau de lumière (haut-gauche), reflet vernis
  const d = Math.max(1, Math.round(view.rs * 1.1 * Math.min(1.6, e.scale)));
  if (SHADE_ON) {
    if (TB.width < px) { TB.width = TB.height = px; }
    for (const [dx, dy, col, al, op] of [[-d, -d, '#000010', 0.5, 'source-atop'], [d, d, '#ffffff', 0.28, 'lighter']]) {
      TBg.setTransform(1, 0, 0, 1, 0, 0); TBg.globalCompositeOperation = 'copy'; TBg.drawImage(EB, 0, 0, px, px, 0, 0, px, px);
      TBg.globalCompositeOperation = 'destination-out'; TBg.drawImage(EB, 0, 0, px, px, dx, dy, px, px);
      TBg.globalCompositeOperation = 'source-in'; TBg.fillStyle = col; TBg.fillRect(0, 0, px, px);
      EBg.globalCompositeOperation = op; EBg.globalAlpha = al; EBg.drawImage(TB, 0, 0, px, px, 0, 0, px, px);
    }
    EBg.globalAlpha = 1;
  }
  const rr = r * view.rs;
  const gl = EBg.createRadialGradient(px / 2 - rr * 0.38, px / 2 - rr * 0.42, 0, px / 2 - rr * 0.38, px / 2 - rr * 0.42, rr * 0.55);
  gl.addColorStop(0, 'rgba(255,255,255,0.42)'); gl.addColorStop(0.5, 'rgba(255,255,255,0.1)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
  EBg.globalCompositeOperation = 'source-atop'; EBg.fillStyle = gl; EBg.fillRect(0, 0, px, px);
  EBg.globalCompositeOperation = 'source-over';
  SBg.setTransform(1, 0, 0, 1, 0, 0);
  SBg.globalCompositeOperation = 'copy'; SBg.drawImage(EB, 0, 0, px, px, 0, 0, px, px);
  SBg.globalCompositeOperation = 'source-in'; SBg.fillStyle = '#04020c'; SBg.fillRect(0, 0, px, px);
  SBg.globalCompositeOperation = 'source-over';
  const x0 = e.x - U / 2, y0 = e.y - U / 2;
  baseT();
  ctx.globalAlpha = e.alpha;
  for (const [ox, oy] of OUT) ctx.drawImage(SB, 0, 0, px, px, x0 + ox, y0 + oy, U, U);
  // liseré lumineux (lumière venant du haut à gauche)
  SBg.globalCompositeOperation = 'source-in'; SBg.fillStyle = e.elite ? '#ffe27a' : e.cg; SBg.fillRect(0, 0, px, px); SBg.globalCompositeOperation = 'source-over';
  ctx.drawImage(SB, 0, 0, px, px, x0 - 1.1, y0 - 1.3, U, U);
  ctx.drawImage(EB, 0, 0, px, px, x0, y0, U, U);
  ctx.globalAlpha = 1;
}
const RAINBOW = ['#ff4fd8', '#ffd23f', '#38f2ff', '#47ffa3', '#a259ff', '#ff7a3c'];
const TYPE_TINT = {};

export class Game {
  constructor(def, o) {
    this.def = def; this.diff = def.diff; this.D = def.D; this.pal = def.pal;
    this.t = 0; this.dt = 0;
    this.enemies = []; this.ebs = []; this.pbs = []; this.pickups = []; this.hazards = []; this.debris = [];
    this.lines = []; this.bolts = []; this.timers = []; this.targets = []; this.beamsDraw = [];
    this.stats = { score: 0, kills: 0, spawned: 0, primaryKills: 0, coins: 0, crystals: 0, gems: 0, parts: 0, hullHits: 0, specials: 0, perfects: 0, constellations: 0, salvage: 0, novas: 0, maxChain: 0, elites: 0, eliteSpawned: 0, time: 0, coinSpawned: 0, crySpawned: 0 };
    this.player = new Player(this, o);
    this.drones = (o.drones || []).map((id, i) => new Drone(this, id, i, dronePower(id)));
    this.bg = new Background(def);
    this.events = new Events(this);
    this.combo = new Constellation(this);
    this.hud = new Hud(this);
    this.tl = def.timeline; this.ti = 0; this.dirT = 0; this.spawnQ = [];
    this.state = 'play'; this.endT = 0; this.boss = null; this.timelineDone = false;
    this.scroll = def.planet ? 42 : 0;
    this.lastBeat = -1; this.lastHalf = -1; this.onBeat = false; this.onHalf = false;
    this.slowT = 0; this.slowK = 1;
    this.coinStreak = 0; this.coinStreakT = 0;
    this.revives = 0; this.well = null; this.lootRush = 0; this.idc = 0;
    this.paused = false; this.ignoreTouch = false;
    this.onEnd = null; this.onDeath = null; this.onPause = null;
    this.goalKills = 0; this.bossT = 0;
    this.wind = def.trait === 'vent' ? (Math.random() < 0.5 ? -1 : 1) * 55 : 0;
    clearParticles();
    this.capPlan = o.noCapsules ? [] : this.makeCapPlan();
    this.waveN = 0; this.rushKills = 0;
    if (def.mode === 'rush') { this.rushQ = def.rush.slice(); this.rushN = 0; this.rushWait = false; for (const b of this.rushQ) prebakeBoss(this, b.arch, false); }
    // pré-rendu des pièces du boss (évite un à-coup à son arrivée)
    for (const ev of this.tl) if (ev.kind === 'boss') prebakeBoss(this, ev.arch, ev.mini);
    music.play(def.music, true);
    music.setIntensity(0.5);
  }

  // ================= API pour les entités =================
  later(d, fn) { this.timers.push({ t: d, fn }); }
  msg(text, color, size, dur, big) { this.hud.addMsg(text, color, size, dur, big); }
  radio(key) { const l = radioLine(key); if (l) this.hud.setRadio(l); }
  slowmo(t, k) { this.slowT = t; this.slowK = k; }
  lineFx(x1, y1, x2, y2, c, life, w) { this.lines.push({ x1, y1, x2, y2, c, life, max: life, w }); }
  coinMul() { return this.events.coinMul(); }
  progress() {
    if (this.boss) return 1;
    const last = this.tl.length ? this.tl[this.tl.length - 1].t : 1;
    return clamp(this.dirT / last, 0, 1);
  }
  flyerCount() { let n = 0; for (const e of this.enemies) if (!e.dead && !e.ground && !e.T.harmless) n++; return n; }

  addEnemy(type, x, y, path, o = {}) {
    const T = ENEMIES[type];
    if (!T) { console.warn('ennemi inconnu', type); return null; }
    if (TYPE_TINT[type] === undefined) TYPE_TINT[type] = Object.keys(TYPE_TINT).length % 3;
    const P = this.pal, tint = TYPE_TINT[type];
    const e = {
      id: ++this.idc, type, T, x, y, vx: 0, vy: 0, r: T.r, hpMul: this.D.hp,
      hp: T.hp * this.D.hp, max: 0, t: 0, face: 0, scale: 1, flash: 0, alpha: 1, dead: false, gone: false,
      ground: !!T.ground, data: o.data ? { ...o.data } : {}, seed: Math.random() * 10, primary: !!o.primary,
      elite: !!o.elite, fcd: T.rate * rand(0.4, 1), lootMul: 1, stun: 0, entered: false, hidden: false,
      c1: tint === 1 ? P.enemy2 : tint === 2 ? mixHex(P.enemy, P.accent, 0.45) : P.enemy,
      c2: tint === 1 ? P.enemy : P.enemy2, cg: tint === 1 ? lighten(P.enemy2, 0.25) : P.eglow,
      path: path ? { ...path } : { k: 'dive', spd: 80, amp: 0, f: 0, ph: 0 },
    };
    if (e.ground) e.path = { k: 'ground' };
    initPath(e);
    if (T.init) T.init(e, this, o);
    if (!e.max) e.max = e.hp;
    if (T.cls !== 'xs' && !e.ground) e.scale = 1.2;
    if (e.elite) { e.hp *= 4; e.max = e.hp; e.scale *= 1.25; e.lootMul = 5; this.stats.eliteSpawned++; }
    if (o.carrier) e.carrier = o.carrier;
    if (o.nova) e.nova = true;
    if (o.primary) this.stats.spawned++;
    this.enemies.push(e);
    return e;
  }
  spawnEB(x, y, vx, vy, kind = 'orb', o) {
    if (this.ebs.length > 650 || this.def.noFireAll) return null;
    const K = BK[kind] || BK.orb;
    const color = (o && o.color) || (kind === 'needle' || kind === 'shard' ? this.pal.bullet2 : this.pal.bullet);
    const m = this.D.bspd;
    const b = { x, y, vx: vx * m, vy: vy * m, kind, r: K.r, grav: K.grav || 0, t: 0, dead: false, orient: K.orient, spr: ebSprite(kind, color), color };
    this.ebs.push(b);
    return b;
  }
  addPB(x, y, vx, vy, dmg, kind, o) {
    if (this.pbs.length > 420) return null;
    const p = this.player;
    const color = (o && o.color) || (p.super > 0 ? RAINBOW[Math.floor(this.t * 12) % 6] : o && o.ghost ? '#c8a2ff' : p.col);
    const b = { x, y, vx, vy, dmg, kind, r: 5, life: 1.4, t: 0, pierce: 0, hits: null, dead: false, color, homing: 0, bounce: 0, split: 0, accel: 0, splash: 0 };
    if (o) Object.assign(b, o);
    if (kind === 'flame') { b.r = b.big ? 12 : 7; }
    if (kind === 'wave') b.x0 = x;
    if (b.pierce) b.hits = [];
    b.spr = kind === 'flame' || kind === 'wave' || kind === 'orb' || kind === 'vortex' ? null : pbSprite(kind, color);
    this.pbs.push(b);
    return b;
  }
  // Capsules : les vaisseaux et drones possédés arrivent en renfort pendant le niveau
  makeCapPlan() {
    // peu de capsules, bien espacées : 1 vaisseau et 2 drones au plus par niveau
    const plan = [], boss = this.def.kind === 'boss' || this.def.kind === 'miniboss';
    const ships = SHIPS.filter((s) => s.id !== 'etincelle' && ownsShip(s.id));
    const drones = DRONES.filter((d) => ownsDrone(d.id));
    if (drones.length) { plan.push({ at: boss ? 0.08 : 0.15, kind: 'dronecap' }); if (!boss) plan.push({ at: 0.62, kind: 'dronecap' }); }
    if (ships.length) plan.push({ at: boss ? 0.22 : 0.36, kind: 'shipcap' });
    return plan.sort((a, b) => a.at - b.at);
  }
  // liste des choix d'une capsule : le contenu défile, on l'attrape quand on voit celui qu'on veut
  capOptions(kind) {
    let list;
    if (kind === 'shipcap') list = SHIPS.filter((s) => s.id !== 'etincelle' && s.id !== this.player.id && ownsShip(s.id)).map((s) => s.id).sort((a, b) => (b === S.ship) - (a === S.ship));
    else list = DRONES.filter((d) => ownsDrone(d.id) && !this.drones.some((x) => x.id === d.id)).map((d) => d.id).sort((a, b) => S.slots.includes(b) - S.slots.includes(a));
    return list;
  }
  pickCapsule(kind) { const l = this.capOptions(kind); return l.length ? l[0] : null; }
  updateCapsules() {
    const P = this.capPlan;
    if (!P.length || this.state !== 'play') return;
    if (this.pickups.some((k) => !k.dead && (k.kind === 'shipcap' || k.kind === 'dronecap'))) return; // une seule à la fois
    const pr = this.boss ? 1 : this.progress();
    if (pr < P[0].at) return;
    const c = P.shift(), opts = this.capOptions(c.kind);
    if (!opts.length) return;
    const k = makePickup(c.kind, rand(110, view.w - 110), view.safeT - 30, 1);
    k.opts = opts; k.oi = 0; k.id = opts[0]; k.swapT = 1.5; k.vx = 0; k.vy = 34;
    this.pickups.push(k);
    sfx.energy();
    this.msg(c.kind === 'shipcap' ? 'CAPSULE DE RENFORT !' : 'CAPSULE DE DRONE !', c.kind === 'shipcap' ? '#ffffff' : '#38f2ff', 18, 1.6);
    if (opts.length > 1) this.later(1.2, () => this.msg('Son contenu change : attrape-la au bon moment !', '#d8dcff', 12, 2));
  }
  // Modes spéciaux : survie infinie (vagues ajoutées sans fin) et ruée des colosses
  updateModes() {
    const d = this.def;
    if (this.state !== 'play') return;
    if (d.mode === 'endless' && this.ti >= this.tl.length - 2) {
      const last = this.tl.length ? this.tl[this.tl.length - 1].t : this.dirT;
      d.endlessK++;
      this.tl.push(...endlessChunk(d, Math.max(last, this.dirT) + 4, d.endlessK));
      this.D = Object.assign({}, this.D, { hp: this.D.hp * 1.14, fire: this.D.fire * 1.05, loot: this.D.loot * 1.05 });
      this.later(2, () => this.msg('MENACE NIVEAU ' + (d.endlessK + 1) + ' !', '#ff8aa8', 20, 1.6));
    }
    if (d.mode === 'rush' && !this.boss && !this.rushWait && this.dirT > 3) {
      if (this.rushQ.length) {
        this.rushWait = true; this.rushN++;
        this.msg('COLOSSE ' + this.rushN + ' / ' + d.rush.length, '#ffd23f', 24, 2);
        d.code = this.rushN + '/' + d.rush.length;
        this.startBoss(this.rushQ.shift());
      } else if (!this.timelineDone && this.bossDead) this.timelineDone = true;
    }
  }
  addDrone(id) {
    const same = this.drones.find((d) => d.id === id);
    if (same) { same.life = same.max; return; } // même drone : batterie rechargée
    const used = this.drones.map((d) => d.slot);
    let slot = [0, 1].find((x) => !used.includes(x));
    if (slot === undefined) { const old = this.drones.shift(); slot = old.slot; }
    const d = new Drone(this, id, slot, dronePower(id));
    d.x = this.player.x; d.y = this.player.y;
    this.drones.push(d);
  }
  dropPickup(kind, x, y, v = 1) {
    const k = makePickup(kind, x, y, v);
    if (kind === 'crystals') this.stats.crySpawned += v;
    this.pickups.push(k);
    return k;
  }
  // Butin regroupé : les petites valeurs s'accumulent et tombent en une seule grosse pièce
  dropCoins(x, y, v, immediate = false) {
    this.coinBank = (this.coinBank || 0) + v;
    const minDrop = Math.max(3, 2.5 * this.D.loot);
    if (!immediate && this.coinBank < minDrop) return;
    let V = Math.floor(this.coinBank);
    if (V <= 0) return;
    this.coinBank -= V;
    this.stats.coinSpawned += V;
    const n = V < 40 * this.D.loot ? 1 : V < 150 * this.D.loot ? 2 : Math.min(5, 3 + Math.floor(V / (400 * this.D.loot)));
    const each = Math.floor(V / n);
    let rest = V - each * n;
    for (let i = 0; i < n; i++) { const val = each + (rest-- > 0 ? 1 : 0); this.pickups.push(makePickup('coin', x + rand(-8, 8), y + rand(-8, 8), val, this.D.loot)); }
  }
  forTargets(cb) { for (let i = 0; i < this.targets.length; i++) cb(this.targets[i]); }
  nearestTarget(x, y, maxD, above = false) {
    let best = null, bd = maxD * maxD;
    for (const t of this.targets) { if (t.shielded) continue; if (above && t.y > y + 30) continue; const d = dist2(x, y, t.x, t.y); if (d < bd) { bd = d; best = t; } }
    return best;
  }
  buildTargets() {
    const T = this.targets; T.length = 0;
    for (const e of this.enemies) {
      if (e.dead || e.hidden) continue;
      e.rr = e.r * e.scale;
      if (e.y < -e.rr || e.y > view.h + e.rr || e.x < -e.rr || e.x > view.w + e.rr) continue;
      e.shielded = !!e.T.invul;
      T.push(e);
    }
    if (this.boss && this.boss.state === 'fight') for (const p of this.boss.parts) { if (!p.alive) continue; p.rr = p.r * this.boss.sc; p.shielded = !this.boss.targetable(p); T.push(p); }
  }

  hitTarget(t, dmg, x, y, silent = false) {
    if (t.isPart) {
      let d = dmg;
      if (!silent && Math.random() < this.player.crit) d *= 2;
      const ok = t.boss.hit(t, d, x, y);
      if (ok && !silent && Math.random() < 0.5) hitSpark(x, y, '#ffd27a');
      if (ok) this.bossDamageSound();
      return ok;
    }
    return this.hitEnemy(t, dmg, x, y, silent);
  }
  bossDamageSound() { if (Math.random() < 0.3) sfx.hit(); }
  hitEnemy(e, dmg, x = e.x, y = e.y, silent = false) {
    if (e.dead || e.hidden) return false;
    if (e.T.invul) { if (!silent) deflect(x, y); return false; }
    let d = dmg * (e.armorMul ?? 1);
    if (e.armorMul !== undefined && e.armorMul < 1 && !silent && Math.random() < 0.2) { deflect(x, y); }
    if (!silent && Math.random() < this.player.crit) { d *= 2; if (Math.random() < 0.3) fx.text(x, y - 8, 'CRIT', '#ffd23f', 10, 0.5); }
    if (e.armor > 0) {
      e.armor -= d * 0.6; d *= 0.15;
      if (e.armor <= 0) {
        for (let i = 0; i < 6; i++) fx.debris(e.x, e.y, rand(-150, 150), rand(-200, 0), 1, rand(3, 6), e.c2);
        sfx.part();
        if (Math.random() < 0.3) this.dropPickup('parts', e.x, e.y);
      }
    }
    e.hp -= d;
    e.flash = 0.07;
    if (e.T.onHit) e.T.onHit(e, this, d);
    if (!silent && Math.random() < 0.6) { hitSpark(x, y, e.cg); sfx.hit(); }
    if (e.hp <= 0) this.killEnemy(e);
    return true;
  }
  // Score arcade : multiplicateur selon la chaîne d'éliminations
  scoreMul() { return 1 + Math.min(4, Math.floor(this.combo.chain / 5) * 0.5); }
  addScore(v, x, y, show) {
    const pts = Math.round(v * this.scoreMul() / 10) * 10;
    this.stats.score += pts;
    if (show && x !== undefined) fx.text(x, y - 34, pts.toLocaleString('fr-FR').replace(/\u202f|\u00a0/g, ' '), '#fff3b0', 11 + Math.min(6, pts / 2000), 0.8, -40);
    return pts;
  }
  killEnemy(e, silent = false) {
    if (e.dead) return;
    e.dead = true;
    const T = e.T;
    const size = (CLS_SIZE[T.cls] || 1) + (e.elite ? 1 : 0);
    if (!silent || e.data.pop) explode(e.x, e.y, size, e.cg, e.c2, !e.ground);
    if (T.death) T.death(e, this);
    if (silent && !e.data.pop) return;
    if (e.data.pop) return;
    const v = T.coins * this.D.loot * e.lootMul * this.coinMul() * (1 + S.up.fortune * 0.07);
    this.dropCoins(e.x, e.y, v);
    const luck = 1 + S.up.luck * 0.1;
    if (Math.random() < 0.012 * luck * (T.cls === 'm' || T.cls === 'l' ? 2 : 1)) {
      const r = Math.random();
      this.dropPickup(r < 0.4 ? 'energy' : r < 0.6 ? 'shield' : r < 0.75 ? 'magnet' : r < 0.85 ? 'heart' : 'power', e.x, e.y);
    }
    if (Math.random() < 0.006 + this.diff * 0.008) this.dropPickup('crystals', e.x, e.y, 2 + this.diff);
    if (this.diff === 2 && Math.random() < 0.004) this.dropPickup('gems', e.x, e.y);
    if (e.carrier) this.dropPickup(e.carrier, e.x, e.y);
    if (e.nova) this.dropPickup('nova', e.x, e.y);
    if (e.elite) {
      this.stats.elites++;
      this.dropPickup('crystals', e.x, e.y, 3);
      if (Math.random() < 0.35 + this.diff * 0.15) this.dropPickup('gems', e.x, e.y);
      if (Math.random() < 0.5) this.dropPickup('power', e.x, e.y + 10);
      fx.text(e.x, e.y - 24, 'ÉLITE !', '#ffd23f', 16);
      sfx.gem();
    }
    this.stats.kills++;
    if (e.primary) this.stats.primaryKills++;
    this.goalKills++;
    this.combo.kill(e.x, e.y);
    { const base = { xs: 50, s: 100, m: 300, l: 1000, snake: 800 }[T.cls] || 100; this.addScore(base * (e.elite ? 5 : 1) * (1 + this.diff * 0.5), e.x, e.y, base >= 300 || e.elite); }
    this.player.gauge = Math.min(1, this.player.gauge + 0.004);
  }
  eat(glu, prey) {
    if (prey.dead) return;
    prey.dead = true; prey.eaten = true;
    if (prey.primary) this.stats.spawned--;
    for (let i = 0; i < 6; i++) fx.goo(prey.x, prey.y, rand(-120, 120), rand(-150, 50), 0.4, rand(1.2, 2.2), 'rgba(60,40,80,0.55)');
    fx.text(glu.x, glu.y - glu.r - 8, 'CROC !', '#ffffff', 14);
    glu.r = Math.min(34, glu.r + 2.5);
    glu.hp += prey.max * 1.2; glu.max += prey.max * 1.2;
    glu.lootMul += 0.6; glu.data.ate = (glu.data.ate || 0) + 1;
    sfx.squish();
    if (!this.def.noFire) this.later(0.5, () => { if (!glu.dead) for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + rand(1); this.spawnEB(glu.x, glu.y, Math.cos(a) * 80, Math.sin(a) * 80, 'big'); } });
  }
  collect(k) {
    const p = this.player;
    switch (k.kind) {
      case 'coin':
        this.stats.coins += k.v; this.stats.score += 10;
        this.coinStreak = this.coinStreakT > 0 ? this.coinStreak + 1 : 0; this.coinStreakT = 0.5;
        sfx.coin(this.coinStreak);
        this.hud.bump = 1;
        fx.text(k.x, k.y - 14, '+' + k.v, '#ffe27a', 13, 0.6);
        break;
      case 'crystals': this.stats.crystals += k.v || 1; sfx.crystal(); fx.text(k.x, k.y - 12, '+' + (k.v || 1), '#7df9ff', 13, 0.7); break;
      case 'gems': this.stats.gems += k.v || 1; sfx.gem(); fx.text(k.x, k.y - 12, '+' + (k.v || 1) + ' GEMME' + ((k.v || 1) > 1 ? 'S' : ''), '#ff8ae6', 14, 0.8); break;
      case 'parts': this.stats.parts += k.v || 1; sfx.part(); fx.text(k.x, k.y - 10, '+' + (k.v || 1), '#ffbe7a', 11, 0.6); break;
      case 'power':
        if (p.wlvl < 10) { p.wlvl++; this.msg(p.wlvl === 10 ? 'PUISSANCE MAXIMUM !' : p.wlvl > 6 ? `SURPUISSANCE ${p.wlvl} !` : `PUISSANCE ${p.wlvl}`, p.wlvl > 6 ? '#ff6af0' : '#ff9d3c', 18, 1); }
        else { this.stats.coins += Math.round(10 * this.D.loot); p.gauge = Math.min(1, p.gauge + 0.15); }
        sfx.power(); fx.ring(p.x, p.y, 8, 50, 0.35, '#ff9d3c', 3);
        break;
      case 'shield': p.shield = Math.min(3, p.shield + 1); sfx.shieldUp(); fx.ring(p.x, p.y, 8, 40, 0.35, '#38f2ff', 3); break;
      case 'magnet': p.magnetT = 10; sfx.magnet(); this.msg('AIMANT !', '#ff6a8a', 16, 0.9); break;
      case 'energy': p.gauge = Math.min(1, p.gauge + 0.34); sfx.energy(); fx.text(k.x, k.y - 10, '+SPÉCIALE', '#ffe94a', 11, 0.6); break;
      case 'heart':
        if (p.hp < p.maxHp) { p.hp++; this.msg('COQUE RÉPARÉE', '#ff8aa8', 15, 0.9); } else this.stats.coins += Math.round(15 * this.D.loot);
        sfx.heal(); break;
      case 'shipcap': {
        if (!ownsShip(k.id)) { this.stats.coins += Math.round(30 * this.D.loot); break; } // sécurité : jamais un vaisseau non possédé
        const D = SHIP_BY_ID[k.id]; this.addScore(2000, p.x, p.y, true);
        p.switchShip(k.id);
        sfx.nova(); flash(D.color, 0.45); addShake(0.25);
        this.msg(D.name.toUpperCase() + ' !', D.color, 28, 1.5, true);
        for (let i = 0; i < 3; i++) fx.ring(p.x, p.y, 10, 90 + i * 50, 0.5 + i * 0.12, i ? D.color : '#ffffff', 4 - i);
        break;
      }
      case 'dronecap': {
        if (!ownsDrone(k.id)) { this.stats.coins += Math.round(20 * this.D.loot); break; }
        const D = DRONE_BY_ID[k.id];
        this.addDrone(k.id);
        sfx.power(); flash(D.color, 0.25);
        this.msg('DRONE ' + D.name.toUpperCase() + ' !', D.color, 20, 1.2);
        fx.ring(p.x, p.y, 10, 70, 0.4, D.color, 3);
        break;
      }
      case 'nova':
        p.super = p.superMax; this.stats.novas++;
        sfx.nova(); flash('#ffffff', 0.5); addShake(0.3);
        this.msg('HYPERNOVA !', '#ffffff', 30, 1.4, true);
        this.cancelBullets(null, true);
        for (let i = 0; i < 3; i++) fx.ring(p.x, p.y, 10, 120 + i * 60, 0.6 + i * 0.15, ['#ff4fd8', '#ffd23f', '#38f2ff'][i], 4);
        break;
    }
    sparkle(k.x, k.y, PK[k.kind].glow, k.kind === 'coin' ? 1 : 4);
  }
  cancelBullets(area, reward = true, max = Infinity) {
    let n = 0;
    for (const b of this.ebs) {
      if (b.dead) continue;
      let ins = false;
      if (!area) ins = true;
      else if (area.test) ins = area.test(b.x, b.y);
      else if (area.rect !== undefined) ins = Math.abs(b.x - area.x) < area.rect && (area.all || area.y === undefined || b.y < area.y);
      else if (area.ring) { const d = Math.sqrt(dist2(area.x, area.y, b.x, b.y)); ins = Math.abs(d - area.r) < area.ring; }
      else ins = dist2(area.x, area.y, b.x, b.y) < area.r * area.r;
      if (!ins) continue;
      b.dead = true; n++;
      if (n < 40) cancelPop(b.x, b.y, b.color);
      if (reward) this.cancelBank = (this.cancelBank || 0) + 1;
      if (n >= max) break;
    }
    if (reward && this.cancelBank >= 6) { const v = Math.round(this.cancelBank * 0.5 * this.D.loot); this.cancelBank = 0; const k = makePickup('coin', this.player.x + rand(-30, 30), this.player.y - 80, v, this.D.loot); k.attract = true; k.age = 0.3; this.pickups.push(k); }
    return n;
  }
  fireBeam(x, y, w, dps, pierce, color, big = false) {
    const cands = [];
    for (const t of this.targets) if (t.y < y + 10 && Math.abs(t.x - x) < t.rr + w / 2) cands.push(t);
    cands.sort((a, b) => b.y - a.y);
    let y1 = -30, n = 0;
    for (const t of cands) {
      const ok = this.hitTarget(t, dps * this.dt * (n ? 0.5 : 1), x, t.y + t.rr * 0.5, true);
      if (Math.random() < 0.25) hitSpark(x + rand(-w / 3, w / 3), t.y + t.rr * 0.6, t.shielded ? '#cfe8ff' : color);
      if (!ok || n >= pierce) { y1 = t.y + t.rr * 0.5; break; }
      n++;
    }
    const b = { x, y, y1, w, color, big };
    this.beamsDraw.push(b);
    return b;
  }
  drawBeam(x, y0, y1, w, color, k = 1) {
    const flick = 0.85 + 0.15 * Math.sin(this.t * 60);
    const gr = ctx.createLinearGradient(x - w, 0, x + w, 0);
    gr.addColorStop(0, rgba(color, 0)); gr.addColorStop(0.3, rgba(color, 0.35 * k)); gr.addColorStop(0.5, rgba('#ffffff', 0.95 * k)); gr.addColorStop(0.7, rgba(color, 0.35 * k)); gr.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = gr;
    ctx.fillRect(x - w * flick, y1, w * 2 * flick, y0 - y1);
    const s = glow(color, 32);
    ctx.drawImage(s.c, x - w * 1.5, y0 - w * 1.5, w * 3, w * 3);
    if (y1 > 0) ctx.drawImage(s.c, x - w * 1.8, y1 - w * 1.8, w * 3.6, w * 3.6);
  }
  chainLightning(x, y, dmg, jumps, color, ghost) {
    let t = this.nearestTarget(x, y, 300, true);
    if (!t) return false;
    const pts = [x, y];
    const hit = new Set();
    let d = dmg, cx = x, cy = y;
    for (let j = 0; j <= jumps && t; j++) {
      hit.add(t);
      pts.push(t.x, t.y);
      this.hitTarget(t, d, t.x, t.y, j > 0);
      d *= 0.8; cx = t.x; cy = t.y;
      let nb = null, nd = 150 * 150;
      for (const o of this.targets) { if (hit.has(o) || o.shielded) continue; const dd = dist2(cx, cy, o.x, o.y); if (dd < nd) { nd = dd; nb = o; } }
      t = nb;
    }
    this.bolts.push({ pts, t: 0.09, color: ghost ? '#c8a2ff' : color, w: ghost ? 1.2 : 2 });
    return true;
  }
  strike(x, y, color, full = false) {
    const pts = [x + rand(-20, 20), -10];
    let cx = pts[0];
    const steps = 9;
    for (let i = 1; i <= steps; i++) { cx += rand(-16, 16); pts.push(i === steps ? x : cx, (y + 10) * (i / steps) - 10); }
    this.bolts.push({ pts, t: 0.22, color, w: full ? 4 : 3 });
    fx.flash(x, y, 40, 0.3, color);
  }
  bladeHit(x, y, r, dmg, idx) {
    for (const t of this.targets) {
      if (dist2(x, y, t.x, t.y) > (r + t.rr) ** 2) continue;
      const k = '_bl' + idx;
      if (t[k] && this.t - t[k] < 0.12) continue;
      t[k] = this.t;
      this.hitTarget(t, dmg, x, y, Math.random() < 0.6);
    }
    this.cancelBullets({ x, y, r: r * 0.9 }, true, 2);
  }
  gravityWell(x, y, R, strength, dt, eat) {
    for (const e of this.enemies) {
      if (e.dead || e.ground || e.type === 'serpentSeg') continue;
      const d = Math.sqrt(dist2(x, y, e.x, e.y));
      if (d < R && d > 5) { const f = strength * (1 - d / R) * dt; e.x += ((x - e.x) / d) * f; e.y += ((y - e.y) / d) * f; if (e.path) { e.path.x0 = (e.path.x0 ?? e.x) + ((x - e.x) / d) * f; } }
    }
    for (const b of this.ebs) {
      if (b.dead) continue;
      const d = Math.sqrt(dist2(x, y, b.x, b.y)) + 1;
      if (d < R) { b.vx += ((x - b.x) / d) * strength * 2 * dt; b.vy += ((y - b.y) / d) * strength * 2 * dt; }
      if (eat && d < 40) { b.dead = true; this.cancelBank = (this.cancelBank || 0) + 1; }
    }
  }
  addLaser(x, y, ang, warm, dur, w, color, delay = 0, o) {
    const h = { kind: 'laser', x, y, ang, warm, dur, w, color, t: -delay, fired: false };
    if (o) Object.assign(h, o);
    this.hazards.push(h);
    sfx.laserCharge();
    return h;
  }
  // Éclatement d'un tir (graine qui éclot, obus de DCA, bulle qui crève, goutte qui fait une flaque)
  splitEB(b, o) {
    o = o || b.split || {};
    if (o.zone) this.addZone(b.x, b.y, o.zone.r || 22, o.zone.life || 2.2, o.zone.color || b.color);
    const n = o.n || 0, sp = o.sp || 110, kind = o.kind || 'orb';
    const base = o.aim ? angTo(b.x, b.y, this.player.x, this.player.y) : (o.off ?? Math.random() * TAU);
    for (let i = 0; i < n; i++) {
      const a = o.arc ? base + (n === 1 ? 0 : (i / (n - 1) - 0.5) * o.arc) : base + (i / n) * TAU;
      this.spawnEB(b.x, b.y, Math.cos(a) * sp, Math.sin(a) * sp, kind);
    }
    if (n) fx.ring(b.x, b.y, 3, 22, 0.25, b.color, 2);
  }
  // Onde de choc qui s'élargit (avec une brèche pour passer)
  addShock(x, y, o = {}) { const h = { kind: 'shock', x, y, r: o.r0 || 12, v: o.v || 120, th: o.th || 9, gap: o.gap ?? null, gw: o.gw || 0.42, gv: o.gv || 0, color: o.color || this.pal.bullet, t: -(o.delay || 0), life: o.life || 6, style: o.style || 'elec' }; this.hazards.push(h); return h; }
  // Repère d'impact annoncé (cercle, colonne ou rangée), puis déclenchement
  addMark(x, y, o = {}) { const h = { kind: 'mark', x, y, r: o.r || 34, shape: o.shape || 'circle', w: o.w || 40, warm: o.warm || 1, fn: o.fn, color: o.color || this.pal.bullet, t: -(o.delay || 0) }; this.hazards.push(h); if (h.t >= 0) sfx.laserCharge(); return h; }
  // Flaque dangereuse qui persiste un court instant
  addZone(x, y, r, life, color) { const h = { kind: 'zone', x, y, r, life, color: color || this.pal.bullet, t: 0 }; this.hazards.push(h); return h; }
  clearHazards() { this.hazards.length = 0; }
  spawnSalvage(x, y, r, col, art) {
    this.debris.push({ x, y, vx: rand(-50, 50), vy: rand(-90, -40), rot: rand(TAU), vr: rand(-3, 3), r: Math.min(26, r), col, t: 0, spr: art && art.chunks ? art.chunks[(Math.random() * art.chunks.length) | 0] : null });
  }

  // ================= Directeur de niveau =================
  director(dt) {
    if (this.state !== 'play') return;
    this.dirT += dt;
    const next = this.tl[this.ti];
    if (next && this.spawnQ.length === 0 && this.flyerCount() === 0 && !this.boss && next.t - this.dirT > 1.6 && this.dirT > 2) this.dirT = next.t - 1.6;
    while (this.ti < this.tl.length && this.tl[this.ti].t <= this.dirT) this.exec(this.tl[this.ti++]);
    for (let i = this.spawnQ.length - 1; i >= 0; i--) {
      const s = this.spawnQ[i];
      s.d -= dt;
      if (s.d <= 0) { this.spawnQ.splice(i, 1); this.spawnSpec(s); }
    }
  }
  exec(ev) {
    switch (ev.kind) {
      case 'banner': this.hud.showBanner(); break;
      case 'radio': this.radio(ev.key); break;
      case 'wave': case 'ground': {
        if (this.def.mode === 'endless' && ev.kind === 'wave' && ev.type !== 'asteroide') { this.waveN++; this.def.code = 'V' + this.waveN; }
        const specs = formationSpawns(ev);
        const luckCarrier = ['power', 'power', 'shield', 'energy', 'magnet'][Math.floor(Math.random() * 5)];
        specs.forEach((s, i) => {
          s.ev = ev; s.first = i === 0; s.last = i === specs.length - 1;
          if (ev.carrier && s.last) s.carrier = this.player.wlvl < 3 ? 'power' : luckCarrier;
          this.spawnQ.push(s);
        });
        break;
      }
      case 'event': this.events.start(ev.id); break;
      case 'boss': this.startBoss(ev); break;
      case 'coinpat': {
        const pts = coinPattern(ev.pat, ev.seed);
        const v = Math.max(1, Math.round(1.5 * this.D.loot));
        for (const [x, y] of pts) { const k = makePickup('coin', x, y, v); k.vx = 0; k.vy = 70; this.pickups.push(k); this.stats.coinSpawned += v; }
        break;
      }
      case 'storm': {
        const n = 1 + (ev.k > 3 ? 1 : 0) + (this.diff > 0 && ev.k > 5 ? 1 : 0);
        for (let i = 0; i < n; i++) {
          const tx = view.w * (n === 1 ? 0.5 : 0.25 + (i / (n - 1)) * 0.5);
          this.addEnemy('emetteur', tx, -30, { k: 'hover', tx, ty: view.safeT + view.h * 0.2 + i * 30, inDur: 1, stay: 3.2, exit: 'up', sway: 30 }, { data: { k: ev.k + i } });
        }
        break;
      }
      case 'end': this.timelineDone = true; break;
    }
  }
  spawnSpec(s) {
    const ev = s.ev;
    const e = this.addEnemy(s.type || ev.type, s.x, s.y, s.ground ? { k: 'ground' } : s.path, {
      primary: true, elite: ev.elite && s.first, carrier: s.carrier, nova: ev.nova && s.last, rich: ev.rich, giant: ev.giant,
    });
    if (e && ev.flee) e.flee = true;
    // grosses vagues : chaque alien tire un peu moins et rapporte un peu moins (le total reste généreux)
    const big = (ev.n || 0) >= 10;
    if (e) e.fm = s.fm || (big ? 0.8 : 1);
    if (e && !e.elite) e.lootMul *= s.lm || (big ? 0.8 : 1);
  }
  startBoss(ev) {
    this.hud.warn = 3.2;
    sfx.warning();
    music.setIntensity(0.2);
    this.later(1.8, () => { if (this.def.bossMusic || !ev.mini) music.play(this.def.bossMusic || 'boss', true); music.setIntensity(1); });
    this.later(2.2, () => {
      this.boss = new Boss(this, ev.arch, { mini: ev.mini, tier: ev.tier, name: ev.name || 'Colosse' });
      this.bossT = 0; this.rushWait = false; this.bossDead = false;
      sfx.roar(); addShake(0.4);
      this.msg(this.boss.name, '#ff8aa8', 24, 2.2, true);
    });
  }
  bossDefeated(b) {
    const x = b.cx(), y = b.cy();
    this.dropCoins(x, y, (b.mini ? 90 : 200) * this.D.loot, true);
    this.dropPickup('crystals', x - 30, y, b.mini ? 4 : 8);
    if ((b.mini ? 0 : 1) + this.diff > 0) this.dropPickup('gems', x + 30, y, (b.mini ? 0 : 1) + this.diff);
    { const k = this.dropPickup('parts', x, y + 30); k.v = (b.mini ? 1 : 3) * (1 + this.diff); }
    this.lootRush = 3.5;
    this.msg(b.mini ? 'GARDIEN VAINCU !' : 'COLOSSE VAINCU !', '#ffd23f', 30, 2.4, true);
    this.addScore((b.mini ? 20000 : 50000) * (1 + b.tier * 0.5) * (1 + this.diff * 0.5), x, y, true);
    this.radio('constel');
    this.bossDead = true;
    this.rushKills++;
    this.later(3.2, () => { this.boss = null; if (this.def.mode !== 'rush') this.timelineDone = true; else this.dirT = 0.5; });
  }
  playerDied() {
    this.state = 'dying'; this.endT = 0;
    this.slowmo(1.4, 0.35);
    sfx.defeat();
    music.setIntensity(0.1);
  }
  revive() {
    this.revives++;
    this.player.revive();
    this.cancelBullets(null, false);
    this.clearHazards();
    for (const e of this.enemies) if (!e.dead && e.y > view.h * 0.55 && !e.ground) this.hitEnemy(e, 9999, e.x, e.y, true);
    this.state = 'play';
    music.setIntensity(0.6);
  }
  goalText() {
    const g = this.def.goal;
    if (!g) return null;
    if (g.kind === 'time') return `${Math.min(g.n, this.goalKills)} / ${g.n} ALIENS · ${Math.max(0, g.limit - this.stats.time).toFixed(1)} s`;
    if (g.kind === 'hunt') return `ÉLITES ABATTUES : ${this.stats.elites} / ${g.n}`;
    if (g.kind === 'survive') return `SURVIVRE : ${Math.max(0, g.limit - this.dirT).toFixed(1)} s`;
    return null;
  }
  checkEnd(dt) {
    if (this.state === 'play') {
      const g = this.def.goal;
      let clear = false, fail = false;
      if (g && g.kind === 'time') { if (this.goalKills >= g.n) clear = true; else if (this.stats.time > g.limit || this.timelineDone) { if (this.goalKills >= g.n * 0.6) clear = true; else fail = true; } }
      else if (g && g.kind === 'survive') { if (this.dirT >= g.limit) clear = true; }
      else if (this.timelineDone && !this.boss && this.spawnQ.length === 0) {
        let live = 0; for (const e of this.enemies) if (!e.dead && !e.ground && e.y > -40) live++;
        if (live === 0 || (this.def.goal && this.def.goal.kind === 'hunt')) {
          if (g && g.kind === 'hunt' && this.stats.elites < 3) fail = true; else clear = true;
        }
      }
      if (clear) {
        this.state = 'clear'; this.endT = 0; this.lootRush = 4; sfx.victory(); music.setIntensity(0.4);
        // primes de fin façon borne d'arcade
        const st = this.stats, bon = [];
        if (st.hullHits === 0) bon.push(['SANS DÉGÂT', 10000]);
        if (st.maxChain >= 10) bon.push(['CHAÎNE MAX ×' + st.maxChain, st.maxChain * 200]);
        if (this.revives === 0) bon.push(['SANS CONTINUER', 5000]);
        for (const b of bon) { b[1] *= 1 + this.diff * 0.5; st.score += b[1]; }
        this.hud.stageClear(this.def.kind === 'boss' ? 'ÉTOILE RALLUMÉE' : 'SECTEUR NETTOYÉ', bon);
      }
      if (fail) { this.state = 'failed'; this.endT = 0; sfx.defeat(); this.msg('ÉCHEC DU DÉFI', '#ff8aa8', 26, 2, true); }
    } else if (this.state === 'clear') {
      this.endT += dt;
      if (this.endT > 1.6) { this.bg.warp = Math.min(1, this.bg.warp + dt * 0.8); this.player.ty = -200; this.player.entering = 1; this.player.inv = 9; }
      if (this.endT > 3.2) this.finish(true);
    } else if (this.state === 'failed') {
      this.endT += dt;
      if (this.endT > 2) this.finish(false);
    } else if (this.state === 'dying') {
      this.endT += dt;
      if (this.endT > 1.5 && this.onDeath) { this.state = 'dead'; this.onDeath(this); }
    }
  }
  computeStars(victory) {
    if (!victory) return 0;
    const d = this.def, st = this.stats, g = d.goal;
    if (d.kind === 'coins') { const r = st.coins / Math.max(1, st.coinSpawned); return 1 + (r >= 0.5 ? 1 : 0) + (r >= 0.8 ? 1 : 0); }
    if (d.kind === 'bonus') { const r = st.crystals / Math.max(1, st.crySpawned); return 1 + (r >= 0.5 ? 1 : 0) + (r >= 0.8 ? 1 : 0); }
    if (g && g.kind === 'survive') return Math.max(1, 3 - st.hullHits);
    if (g && g.kind === 'time') { if (this.goalKills < g.n) return 1; return this.stats.time <= 30 ? 3 : this.stats.time <= 40 ? 2 : 1; }
    if (g && g.kind === 'hunt') return st.elites >= 5 ? 3 : st.elites >= 4 ? 2 : 1;
    if (d.kind === 'boss' || d.kind === 'miniboss') return 1 + (this.bossT < (d.kind === 'boss' ? 100 : 60) ? 1 : 0) + (st.hullHits <= 1 ? 1 : 0);
    const kr = st.primaryKills / Math.max(1, st.spawned);
    return 1 + (kr >= 0.8 ? 1 : 0) + (st.hullHits <= 1 ? 1 : 0);
  }
  finish(victory) {
    if (this.finished) return;
    this.finished = true;
    sfx.laser(false);
    // ramasse automatiquement ce qui reste à l'écran
    for (const k of this.pickups) if (!k.dead && k.y > 0) { k.dead = true; this.collect(k); }
    const res = { victory, stars: this.computeStars(victory), stats: this.stats, def: this.def, revives: this.revives };
    if (this.onEnd) this.onEnd(res);
  }
  quit() { this.finished = true; sfx.laser(false); }

  // ================= Mise à jour =================
  update(rawDt) {
    if (this.paused || this.state === 'dead' || this.finished) { if (this.state === 'dead' || this.paused) { this.bg.update(rawDt * 0.2); } return; }
    let dt = rawDt;
    if (cam.hitstop > 0) { cam.hitstop -= rawDt; dt *= 0.1; }
    if (this.slowT > 0) { this.slowT -= rawDt; dt *= this.slowK; }
    this.dt = dt; this.t += dt;
    if (this.vs) this.vs.update(this, dt);
    if (this.state === 'play') this.stats.time += dt;
    if (this.boss) this.bossT += dt;
    // Rythme
    const bp = music.beatPos();
    const bi = Math.floor(bp), hi = Math.floor(bp * 2);
    this.onBeat = bi !== this.lastBeat; this.onHalf = hi !== this.lastHalf;
    this.lastBeat = bi; this.lastHalf = hi;
    if (this.onBeat) this.bg.beat = 1;
    // Entrées HUD
    if (input.justDown) { const a = this.hud.hit(input.x, input.y); this.ignoreTouch = !!a; if (a === 'pause') this.pause(); else if (a) this.player.trySpecial(); }
    if (input.justUp) this.ignoreTouch = false;
    if (input.second) this.player.trySpecial();
    if (input.keys.Space) { input.keys.Space = false; this.player.trySpecial(); }
    if (this.ignoreTouch && input.down) { const d = input.down; input.down = false; this.updateWorld(dt); input.down = d; }
    else this.updateWorld(dt);
  }
  updateWorld(dt) {
    this.bg.update(dt);
    this.director(dt);
    this.updateModes();
    this.updateCapsules();
    this.events.update(dt);
    this.buildTargets();
    this.beamsDraw.length = 0;
    this.player.update(dt);
    for (const d of this.drones) d.update(dt);
    if (this.drones.some((d) => d.dead)) this.drones = this.drones.filter((d) => !d.dead);
    this.updatePB(dt);
    this.updateEnemies(dt);
    if (this.boss) this.boss.update(dt);
    this.updateEB(dt);
    this.updateHazards(dt);
    this.lootRush = Math.max(0, this.lootRush - dt);
    updatePickups(this, dt);
    this.updateDebris(dt);
    for (let i = this.timers.length - 1; i >= 0; i--) { const tm = this.timers[i]; tm.t -= dt; if (tm.t <= 0) { this.timers.splice(i, 1); try { tm.fn(); } catch (e) { console.error(e); } } }
    this.combo.update(dt);
    for (let i = this.lines.length - 1; i >= 0; i--) { this.lines[i].life -= dt; if (this.lines[i].life <= 0) this.lines.splice(i, 1); }
    for (let i = this.bolts.length - 1; i >= 0; i--) { this.bolts[i].t -= dt; if (this.bolts[i].t <= 0) this.bolts.splice(i, 1); }
    this.coinStreakT -= dt;
    updateParticles(dt);
    this.hud.update(dt);
    this.checkEnd(dt);
    if (this.player.id === 'lance' && (this.state !== 'play' || this.def.noWeapons)) sfx.laser(false);
    if (!this.boss && this.player.super <= 0) { const n = this.flyerCount(); music.setIntensity(clamp(0.35 + n * 0.045, 0.35, 0.85)); }
  }
  updatePB(dt) {
    const W = view.w, H = view.h;
    for (const b of this.pbs) {
      if (b.dead) continue;
      b.t += dt;
      if (b.t > b.life) { if (b.implode) this.vortex(b); b.dead = true; continue; }
      if (b.kind === 'vortex') { this.updateVortex(b, dt); continue; }
      if (b.homing) {
        if (!b.target || b.target.dead || (b.target.isPart && !b.target.alive) || b.target.shielded) b.target = this.nearestTarget(b.x, b.y, 500);
        if (b.target) {
          const cur = Math.atan2(b.vy, b.vx), ta = angTo(b.x, b.y, b.target.x, b.target.y);
          const na = cur + clamp(angDiff(cur, ta), -b.homing * dt, b.homing * dt);
          const sp = Math.hypot(b.vx, b.vy);
          b.vx = Math.cos(na) * sp; b.vy = Math.sin(na) * sp;
        }
      }
      if (b.accel) { const sp = Math.hypot(b.vx, b.vy), ns = Math.min(900, sp + b.accel * dt); b.vx *= ns / sp; b.vy *= ns / sp; }
      if (b.kind === 'missile' || b.kind === 'micro') { if (Math.random() < 0.7) fx.dot(b.x, b.y, -b.vx * 0.1, -b.vy * 0.1, 0.25, b.kind === 'micro' ? 4 : 6, b.color); }
      if (b.kind === 'flame') { b.r += dt * (b.big ? 20 : 26); b.vx *= 1 - dt * 1.2; b.vy *= 1 - dt * 1.2; }
      if (this.well) { const w = this.well, d = Math.sqrt(dist2(b.x, b.y, w.x, w.y)) + 30; b.vx += ((w.x - b.x) / d) * w.s * 60 * dt; b.vy += ((w.y - b.y) / d) * w.s * 60 * dt; }
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.kind === 'wave') b.x = b.x0 + Math.sin(b.t * 14) * 5 + b.vx * b.t;
      if (b.bounce > 0 && (b.x < 6 || b.x > W - 6)) { b.vx *= -1; b.bounce--; b.x = clamp(b.x, 6, W - 6); }
      if (b.y < -40 || b.y > H + 40 || b.x < -40 || b.x > W + 40) { b.dead = true; continue; }
      for (const t of this.targets) {
        if (b.hits && b.hits.includes(t)) continue;
        const rr = b.r + t.rr;
        if (dist2(b.x, b.y, t.x, t.y) > rr * rr) continue;
        const ok = this.hitTarget(t, b.dmg, b.x, b.y);
        if (b.splash && ok) { for (const o of this.targets) if (o !== t && dist2(b.x, b.y, o.x, o.y) < (b.splash + o.rr) ** 2) this.hitTarget(o, b.dmg * 0.4, o.x, o.y, true); fx.flash(b.x, b.y, b.splash, 0.2, b.color); }
        if (b.split > 0 && ok) { const a = Math.atan2(b.vy, b.vx), sp = Math.hypot(b.vx, b.vy); for (const s of [-0.6, 0.6]) { const nb = this.addPB(b.x, b.y, Math.cos(a + s) * sp, Math.sin(a + s) * sp, b.dmg * 0.5, 'shard', { split: b.split - 1, bounce: 1, life: 0.8, color: b.color }); if (nb) { nb.hits = [t]; } } }
        if (b.implode) { this.vortex(b); b.dead = true; break; }
        if (b.pierce > 0 && ok) { b.pierce--; b.hits.push(t); continue; }
        b.dead = true; break;
      }
    }
    let j = 0; for (const b of this.pbs) if (!b.dead) this.pbs[j++] = b; this.pbs.length = j;
  }
  vortex(b) {
    if (!b.vortex) return;
    this.pbs.push({ x: b.x, y: b.y, vx: 0, vy: 0, kind: 'vortex', r: b.vortex, dmg: 14 * (b.dmg / 5), life: 0.9, t: 0, dead: false, color: b.color, hits: null });
    fx.ring(b.x, b.y, b.vortex, 4, 0.4, b.color, 2);
  }
  updateVortex(b, dt) {
    for (const t of this.targets) if (dist2(b.x, b.y, t.x, t.y) < (b.r + t.rr) ** 2) this.hitTarget(t, b.dmg * dt, t.x, t.y, true);
    this.cancelBullets({ x: b.x, y: b.y, r: b.r * 0.6 }, true, 3);
    b.y -= 20 * dt;
  }
  updateEnemies(dt) {
    const p = this.player, top = view.safeT;
    for (const e of this.enemies) {
      if (e.dead) continue;
      e.t += dt; e.flash -= dt;
      if (e.stun > 0) { e.stun -= dt; continue; }
      const T = e.T;
      if (T.update) T.update(e, this, dt);
      if (e.dead) continue;
      const out = updatePath(e, dt, this) || e.gone;
      if (out) { e.dead = true; e.escaped = true; if (e.elite && e.primary && !e.ground) this.msg('L’élite s’est enfuie…', '#ffd23f', 14, 1.2); continue; }
      if (T.fire && !this.def.noFire && e.entered && !e.hidden && !e.path.calm && e.y > top + 12 && e.y < view.h * 0.72 && p.alive && this.state === 'play') {
        e.fcd -= dt * this.D.fire * (e.elite ? 1.4 : 1) * (e.fm || 1);
        if (e.fcd <= 0 && (this.onHalf || e.fcd < -0.8)) {
          if (dist2(e.x, e.y, p.x, p.y) > 80 * 80) T.fire(e, this);
          e.fcd = T.rate * rand(0.85, 1.25);
        }
      }
      if (!e.ground && !e.noContact && !T.harmless && !e.hidden && p.alive && p.inv <= 0) {
        const rr = e.r * e.scale * 0.8 + p.r;
        if (dist2(e.x, e.y, p.x, p.y) < rr * rr) { p.hurt(); if (!T.invul) this.hitEnemy(e, 25 * this.D.hp, e.x, e.y, true); }
      }
    }
    let j = 0; for (const e of this.enemies) if (!e.dead) this.enemies[j++] = e; this.enemies.length = j;
  }
  updateEB(dt) {
    const p = this.player, W = view.w, H = view.h;
    const pr = p.r;
    for (const b of this.ebs) {
      if (b.dead) continue;
      b.t += dt;
      if (b.orb) { // mine en orbite autour du point de lancement, puis éjectée
        const o = b.orb; o.t += dt;
        if (o.t < o.rel) { o.a += o.w * dt; o.r += 34 * dt; b.x = o.cx + Math.cos(o.a) * o.r; b.y = o.cy + Math.sin(o.a) * o.r; continue; }
        const sp = 130 * this.D.bspd; b.vx = Math.cos(o.a) * sp; b.vy = Math.sin(o.a) * sp; b.orb = null;
      }
      if (b.home > 0) { // missile à tête chercheuse (vire progressivement vers le joueur)
        b.home -= dt;
        const cur = Math.atan2(b.vy, b.vx), ta = angTo(b.x, b.y, p.x, p.y), sp = Math.min(b.hs * this.D.bspd, Math.hypot(b.vx, b.vy) + 220 * dt);
        const na = cur + clamp(angDiff(cur, ta), -2.4 * dt, 2.4 * dt);
        b.vx = Math.cos(na) * sp; b.vy = Math.sin(na) * sp;
        if (Math.random() < 0.5) fx.dot(b.x, b.y, -b.vx * 0.2, -b.vy * 0.2, 0.25, 4, '#ffb070', 0.9);
      }
      let mv = 1;
      if (b.fx) { // comportements des tirs de colosses
        if (b.life && b.t > b.life) { b.dead = true; if (b.split && b.split.end) this.splitEB(b); continue; }
        const st = b.stop;
        if (st && b.t >= st.at) {
          if (!st.held) { st.held = true; st.vx = b.vx; st.vy = b.vy; b.vx = 0; b.vy = 0; }
          if (b.t < st.at + st.hold) mv = 0;
          else {
            b.stop = null;
            const sp = (st.sp || Math.hypot(st.vx, st.vy) / this.D.bspd || 120) * this.D.bspd;
            if (st.then === 'burst') { this.splitEB(b, st); b.dead = true; continue; }
            const a = st.then === 'aim' ? angTo(b.x, b.y, p.x, p.y) : st.then === 'point' ? angTo(b.x, b.y, st.px, st.py) : st.then === 'rev' ? Math.atan2(-st.vy, -st.vx) : Math.atan2(st.vy, st.vx);
            b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp;
          }
        }
        if (b.curve) { const c = Math.cos(b.curve * dt), sn = Math.sin(b.curve * dt), vx = b.vx; b.vx = vx * c - b.vy * sn; b.vy = vx * sn + b.vy * c; }
        if (b.acc) { const k = 1 + b.acc * dt, sp0 = Math.hypot(b.vx, b.vy), sp1 = clamp(sp0 * k, (b.vmin || 0) * this.D.bspd, (b.vmax || 9999) * this.D.bspd); if (sp0 > 0.01) { b.vx *= sp1 / sp0; b.vy *= sp1 / sp0; } }
        if (b.ax) b.vx += b.ax * dt;
        if (b.ay) b.vy += b.ay * dt;
        if (b.zig && (b.zk = (b.zk || 0) + dt) >= b.zig) { b.zk = 0; b.zs = -(b.zs || 1); const a = Math.atan2(b.vy, b.vx) + b.zs * (b.zamp || 0.6) * (b.zaim ? 0.5 : 1), sp = Math.hypot(b.vx, b.vy); const ta = b.zaim ? a + clamp(angDiff(a, angTo(b.x, b.y, p.x, p.y)), -0.25, 0.25) : a; b.vx = Math.cos(ta) * sp; b.vy = Math.sin(ta) * sp; }
        if (b.wob) { const sp = Math.hypot(b.vx, b.vy) || 1, w = Math.cos(b.t * b.wob.f + (b.wob.ph || 0)) * b.wob.a * dt; b.x += (-b.vy / sp) * w; b.y += (b.vx / sp) * w; }
        if (b.pulse) mv *= b.pulse.lo + (1 - b.pulse.lo) * Math.abs(Math.sin(b.t * b.pulse.f));
        if (b.split && ((b.split.at !== undefined && b.t >= b.split.at) || (b.split.y !== undefined && b.y >= b.split.y))) { this.splitEB(b, b.split); b.dead = true; continue; }
        if (b.emit && (b.ek = (b.ek || 0) + dt) >= b.emit.every) { b.ek = 0; const a = angTo(b.x, b.y, p.x, p.y); const k = this.spawnEB(b.x, b.y, Math.cos(a) * b.emit.sp, Math.sin(a) * b.emit.sp, b.emit.kind || 'spark'); if (k && b.emit.zig) { k.fx = true; k.zig = b.emit.zig; k.zamp = 0.7; k.zaim = true; } }
        if (b.bounce && ((b.x < 10 && b.vx < 0) || (b.x > W - 10 && b.vx > 0))) { b.vx = -b.vx; b.bounce--; }
      }
      if (b.grav) b.vy += b.grav * dt;
      if (this.wind) b.vx += this.wind * dt * 0.6;
      b.x += b.vx * dt * mv; b.y += b.vy * dt * mv;
      if (b.fx && b.rise) { if (b.y < -40) { b.dead = true; continue; } }
      if (b.y < -40 || (b.y > H + 30 && !(b.rise && b.vy < 0)) || b.x < -30 || b.x > W + 30) { b.dead = true; continue; }
      if (p.alive && this.state === 'play') {
        const d2 = dist2(b.x, b.y, p.x, p.y);
        const rr = b.r * 0.72 + pr;
        if (p.inv <= 0 && d2 < rr * rr) { b.dead = true; p.hurt(); }
        else if (!b.grazed && d2 < 34 * 34) {
          b.grazed = true;
          if (p.inv > 0) { b.dead = true; fx.ring(b.x, b.y, 2, 12, 0.2, '#bff6ff', 2); continue; }
          p.gauge = Math.min(1, p.gauge + 0.006);
          fx.spark(b.x, b.y, (b.x - p.x) * 6, (b.y - p.y) * 6, 0.2, 8, '#ffffff', 1.4);
          if ((this.grazeN = (this.grazeN || 0) + 1) % 6 === 0) fx.text(p.x + 30, p.y - 30, 'FRÔLÉ !', '#bff6ff', 12, 0.6);
        }
      }
    }
    let j = 0; for (const b of this.ebs) if (!b.dead) this.ebs[j++] = b; this.ebs.length = j;
  }
  updateHazards(dt) {
    const p = this.player;
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const h = this.hazards[i];
      h.t += dt;
      if (h.kind === 'laser') {
        if (h.src && h.src.dead) { this.hazards.splice(i, 1); continue; }
        if (h.part && !h.part.alive) { this.hazards.splice(i, 1); continue; }
        if (h.fol) { const o = h.fol(h); if (o) { h.x = o[0]; h.y = o[1]; } }
        if (h.track && h.t < h.warm * 0.85) h.ang += clamp(angDiff(h.ang, angTo(h.x, h.y, p.x, p.y)), -h.track * dt, h.track * dt);
        if (h.va && h.t >= h.warm) h.ang += h.va * dt;
        if (h.t >= h.warm && !h.fired) { h.fired = true; sfx.laserFire(); addShake(0.15); }
        if (h.t >= h.warm && h.t < h.warm + h.dur && p.alive && p.inv <= 0 && this.state === 'play') {
          const dx = p.x - h.x, dy = p.y - h.y, c = Math.cos(h.ang), s = Math.sin(h.ang);
          const along = dx * c + dy * s, perp = Math.abs(dx * s - dy * c);
          if (along > 0 && perp < h.w * 0.42 + p.r) p.hurt();
        }
        if (h.t >= h.warm + h.dur) this.hazards.splice(i, 1);
      } else if (h.kind === 'shock') {
        if (h.t < 0) continue;
        h.r += h.v * dt; if (h.gap !== null) h.gap += h.gv * dt;
        if (p.alive && p.inv <= 0 && this.state === 'play') {
          const d = Math.sqrt(dist2(p.x, p.y, h.x, h.y));
          if (Math.abs(d - h.r) < h.th * 0.5 + p.r * 0.7 && (h.gap === null || Math.abs(angDiff(Math.atan2(p.y - h.y, p.x - h.x), h.gap)) > h.gw * Math.min(1, 60 / Math.max(60, h.r)) + 0.06)) p.hurt();
        }
        if (h.r > Math.hypot(view.w, view.h) + 40 || h.t > h.life) this.hazards.splice(i, 1);
      } else if (h.kind === 'mark') {
        if (h.t < 0) continue;
        if (h.fol) { const o = h.fol(h); if (o) { h.x = o[0]; h.y = o[1]; } }
        if (h.t >= h.warm) { this.hazards.splice(i, 1); if (h.fn) h.fn(h); }
      } else if (h.kind === 'zone') {
        if (h.t > 0.35 && h.t < h.life - 0.2 && p.alive && p.inv <= 0 && this.state === 'play' && dist2(p.x, p.y, h.x, h.y) < (h.r * 0.75 + p.r * 0.6) ** 2) p.hurt();
        if (h.t >= h.life) this.hazards.splice(i, 1);
      }
    }
  }
  updateDebris(dt) {
    const p = this.player;
    for (let i = this.debris.length - 1; i >= 0; i--) {
      const d = this.debris[i];
      d.t += dt; d.vy += 110 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.rot += d.vr * dt;
      if (d.x < 20 || d.x > view.w - 20) d.vx *= -1;
      if (Math.random() < 0.3) fx.spark(d.x + rand(-d.r, d.r) * 0.5, d.y, rand(-15, 15), -60, 0.35, 5, '#ffbe7a', 1);
      if (p.alive && dist2(d.x, d.y, p.x, p.y) < (d.r + 18) ** 2) {
        this.debris.splice(i, 1);
        const n = 2 + (this.boss ? this.boss.tier : 0) + this.diff * 2;
        this.stats.parts += n; this.stats.salvage++;
        this.dropCoins(d.x, d.y, 15 * this.D.loot);
        fx.text(d.x, d.y - 20, `RÉCUPÉRÉ ! +${n}`, '#ffbe7a', 16, 1.1);
        fx.ring(d.x, d.y, 10, 60, 0.4, '#ff9d3c', 3);
        sfx.part(); sfx.gem();
        continue;
      }
      if (d.y > view.h + 50) this.debris.splice(i, 1);
    }
  }

  // ================= Rendu =================
  draw() {
    const g = this;
    this.bg.draw();
    this.events.drawBack();
    this.drawEnemies(true);
    this.bg.drawClouds();
    if (this.def.planet) {
      baseT(); ctx.fillStyle = 'rgba(0,0,0,0.22)';
      for (const e of this.enemies) if (!e.ground && !e.dead) { ctx.beginPath(); ctx.ellipse(e.x + 16, e.y + 34, e.r * e.scale * 0.9, e.r * e.scale * 0.6, 0, 0, TAU); ctx.fill(); }
      if (this.player.alive) { ctx.beginPath(); ctx.ellipse(this.player.x + 16, this.player.y + 34, 12, 8, 0, 0, TAU); ctx.fill(); }
    }
    this.drawDebris();
    drawPickups(this);
    if (this.boss) {
      const B = this.boss;
      const sh = sprite('eshadow2', 64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(0,0,8,0.7)'); gr.addColorStop(1, 'rgba(0,0,8,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }, 0.4);
      baseT(); ctx.globalAlpha = 0.6; ctx.drawImage(sh.c, B.x - 150 * B.sc + 30, B.y - 90 * B.sc + 60, 300 * B.sc, 200 * B.sc); ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'lighter'; baseT(); B.drawGlow(); ctx.globalCompositeOperation = 'source-over'; B.draw();
      const spec = sprite('espec', 32, 32, (g) => { const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); }, 0.6);
      if (B.archId !== 'worm') { ctx.globalCompositeOperation = 'lighter'; baseT(); ctx.globalAlpha = 0.35; ctx.drawImage(spec.c, B.x - 70 * B.sc, B.y - 85 * B.sc, 70 * B.sc, 50 * B.sc); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
    }
    this.drawEnemies(false);
    // Tirs du joueur et effets lumineux
    ctx.globalCompositeOperation = 'lighter';
    baseT();
    this.drawPB();
    for (const b of this.beamsDraw) this.drawBeam(b.x, b.y, b.y1, b.w, b.color, 1);
    this.player.drawBelow();
    const sp = this.player.special;
    if (sp && this.player.F.special.draw) { baseT(); this.player.F.special.draw(this, this.player, sp); }
    ctx.globalCompositeOperation = 'source-over';
    if (this.vs) this.vs.draw(this);
    for (const d of this.drones) d.draw();
    this.player.draw();
    drawParticles(false);
    ctx.globalCompositeOperation = 'lighter';
    drawParticles(true);
    this.drawBolts();
    ctx.globalCompositeOperation = 'source-over';
    this.events.drawFront();
    if (this.events.list.some((e) => e.id === 'eclipse')) { ctx.globalCompositeOperation = 'lighter'; this.drawGlows(false, 1.4); ctx.globalCompositeOperation = 'source-over'; }
    this.drawHazards();
    this.drawEB();
    this.combo.draw();
    this.bg.drawFront(this.player.super > 0);
    // vignette (profondeur cinéma, bords assombris)
    { const vg = sprite('vignette', 64, 96, (gg) => { const gr = gg.createRadialGradient(32, 48, 22, 32, 48, 62); gr.addColorStop(0, 'rgba(0,0,6,0)'); gr.addColorStop(1, 'rgba(0,0,6,0.55)'); gg.fillStyle = gr; gg.fillRect(0, 0, 64, 96); }, 0.3); baseT(); ctx.drawImage(vg.c, 0, 0, view.w, view.h); }
    this.hud.draw();
    if (this.vs) this.vs.drawHud(this);
    drawFlash();
  }
  drawGlows(ground, k = 1) {
    baseT();
    for (const e of this.enemies) {
      if (e.dead || e.ground !== ground) continue;
      const s = glow(e.elite ? '#ffd23f' : e.cg, 16);
      const r = e.r * e.scale * (e.elite ? 3.2 : 2.5);
      ctx.globalAlpha = Math.min(1, 0.6 * e.alpha * k);
      ctx.drawImage(s.c, e.x - r, e.y - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1;
  }
  drawEnemies(ground) {
    // ombre portée + fond sombre (volume et lisibilité)
    if (!ground) {
      const sh = sprite('eshadow', 64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(0,0,8,0.75)'); gr.addColorStop(0.55, 'rgba(0,0,8,0.4)'); gr.addColorStop(1, 'rgba(0,0,8,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }, 0.4);
      baseT();
      for (const e of this.enemies) {
        if (e.dead || e.ground || e.alpha < 0.5) continue;
        const r = e.r * e.scale * 1.25;
        ctx.globalAlpha = 0.55; ctx.drawImage(sh.c, e.x - r + r * 0.35, e.y - r + r * 0.6, r * 2, r * 2);
      }
      ctx.globalAlpha = 1;
    }
    ctx.globalCompositeOperation = 'lighter';
    this.drawGlows(ground);
    ctx.globalCompositeOperation = 'source-over';
    {
      const dk = sprite('edark', 64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(4,2,14,0.85)'); gr.addColorStop(0.7, 'rgba(4,2,14,0.5)'); gr.addColorStop(1, 'rgba(4,2,14,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }, 0.4);
      baseT();
      for (const e of this.enemies) {
        if (e.dead || e.ground !== ground || e.alpha < 0.5 || e.T.cls === 'xs') continue;
        const r = e.r * e.scale * 1.18;
        ctx.globalAlpha = 0.35 * e.alpha; ctx.drawImage(dk.c, e.x - r, e.y - r, r * 2, r * 2);
      }
      ctx.globalAlpha = 1;
    }
    const pro = view.adapt >= 0.7 && view.quality !== 'low';
    OUT = this.enemies.length > 16 ? OUT4 : OUT8;
    SHADE_ON = this.enemies.length <= 18 && view.adapt > 0.7;
    for (const e of this.enemies) {
      if (e.dead || e.ground !== ground) continue;
      if (e.y < -80 || e.y > view.h + 80) continue;
      if (e.alpha > 0.05 && hasAlienArt(e.type) && drawAlienSculpt(e, this)) continue;
      if (pro && e.alpha > 0.05) { drawEnemyPro(e); continue; }
      setRTS(e.x, e.y, e.face || 0, e.scale, e.scale);
      ctx.globalAlpha = e.alpha;
      e.T.draw(ctx, e, e.t);
      ctx.globalAlpha = 1;
    }
    baseT();
    ctx.globalCompositeOperation = 'lighter';
    const spec = sprite('espec', 32, 32, (g) => { const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); }, 0.6);
    for (const e of this.enemies) {
      if (e.dead || e.ground !== ground || e.alpha < 0.5 || e.T.cls === 'xs' || e.type === 'mimique' || e.type === 'bulle') continue;
      const r = e.r * e.scale, s2 = r * 0.42;
      ctx.globalAlpha = 0.5 * e.alpha;
      ctx.drawImage(spec.c, e.x - r * 0.34 - s2, e.y - r * 0.42 - s2, s2 * 2, s2 * 2);
    }
    ctx.globalAlpha = 1;
    for (const e of this.enemies) {
      if (e.type === 'obus' && !e.dead) { const p = 0.5 + 0.5 * Math.sin(this.t * 14); ctx.strokeStyle = rgba(this.pal.bullet, 0.5 + 0.4 * p); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(e.data.tx, e.data.ty, 14 + p * 4, 0, TAU); ctx.moveTo(e.data.tx - 20, e.data.ty); ctx.lineTo(e.data.tx + 20, e.data.ty); ctx.moveTo(e.data.tx, e.data.ty - 20); ctx.lineTo(e.data.tx, e.data.ty + 20); ctx.stroke(); }
    }
    for (const e of this.enemies) {
      if (e.dead || e.ground !== ground) continue;
      if (e.flash > 0) { const s = glow('#ffffff', 16); const r = e.r * e.scale * 1.4; ctx.globalAlpha = 0.75; ctx.drawImage(s.c, e.x - r, e.y - r, r * 2, r * 2); }
      if (e.elite || e.carrier || e.nova) {
        const r = e.r * e.scale + 7;
        ctx.globalAlpha = 0.9;
        ctx.strokeStyle = e.nova ? `hsl(${(this.t * 300) % 360},100%,65%)` : e.elite ? '#ffd23f' : '#ff9d3c';
        ctx.lineWidth = 2; ctx.setLineDash([6, 5]); ctx.lineDashOffset = -this.t * 30;
        ctx.beginPath(); ctx.arc(e.x, e.y, r, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      }
      if (e.stun > 0) { ctx.globalAlpha = 0.6; ctx.strokeStyle = '#9fe8ff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(e.x, e.y, e.r * e.scale + 4, 0, TAU); ctx.stroke(); }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    for (const e of this.enemies) {
      if (e.dead || e.ground !== ground || e.hp >= e.max || e.max < 60 * this.D.hp && !e.elite) continue;
      const w = Math.max(24, e.r * e.scale * 1.6), y = e.y - e.r * e.scale - 9;
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(e.x - w / 2 - 1, y - 1, w + 2, 4);
      ctx.fillStyle = e.elite ? '#ffd23f' : '#ff6a8a'; ctx.fillRect(e.x - w / 2, y, w * Math.max(0, e.hp / e.max), 2);
    }
  }
  drawPB() {
    for (const b of this.pbs) {
      if (b.kind === 'flame') {
        const k = 1 - b.t / b.life;
        const s = glow(k > 0.5 ? '#ffd23f' : b.big ? '#ff6a2a' : '#ff5a2a', 16);
        ctx.globalAlpha = Math.min(1, k * 1.5);
        ctx.drawImage(s.c, b.x - b.r * 1.6, b.y - b.r * 1.6, b.r * 3.2, b.r * 3.2);
        continue;
      }
      if (b.kind === 'wave') {
        ctx.globalAlpha = 0.9;
        ctx.strokeStyle = b.color; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(b.x, b.y + b.r * 0.9, b.r, -Math.PI * 0.82, -Math.PI * 0.18); ctx.stroke();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.2; ctx.stroke();
        ctx.globalAlpha = 0.25; ctx.strokeStyle = b.color; ctx.lineWidth = 8; ctx.stroke();
        continue;
      }
      if (b.kind === 'orb') {
        const s = glow(b.color, 16);
        ctx.globalAlpha = 1; ctx.drawImage(s.c, b.x - 12, b.y - 12, 24, 24);
        ctx.drawImage(glow('#ffffff', 16).c, b.x - 5, b.y - 5, 10, 10);
        continue;
      }
      if (b.kind === 'vortex') {
        const k = 1 - b.t / b.life;
        const s = glow(b.color, 32);
        ctx.globalAlpha = k * 0.7; ctx.drawImage(s.c, b.x - b.r * 1.3, b.y - b.r * 1.3, b.r * 2.6, b.r * 2.6);
        ctx.globalAlpha = k; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5;
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(b.x, b.y, b.r * (0.3 + i * 0.25), this.t * 8 + i * 2, this.t * 8 + i * 2 + 2.2); ctx.stroke(); }
        continue;
      }
      if (!b.spr) continue;
      ctx.globalAlpha = b.ghost ? 0.7 : 1;
      const a = Math.atan2(b.vy, b.vx) + Math.PI / 2;
      setRT(b.x, b.y, a);
      ctx.drawImage(b.spr.c, -16, -16, 32, 32);
    }
    baseT();
    ctx.globalAlpha = 1;
  }
  drawBolts() {
    baseT();
    for (const L of this.lines) { const k = L.life / L.max; ctx.globalAlpha = k; ctx.strokeStyle = L.c; ctx.lineWidth = L.w; ctx.beginPath(); ctx.moveTo(L.x1, L.y1); ctx.lineTo(L.x2, L.y2); ctx.stroke(); }
    for (const B of this.bolts) {
      const pts = B.pts;
      ctx.globalAlpha = 0.9;
      for (let pass = 0; pass < 2; pass++) {
        ctx.strokeStyle = pass ? '#ffffff' : B.color; ctx.lineWidth = pass ? B.w * 0.5 : B.w * 2.2;
        ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
        for (let i = 2; i < pts.length; i += 2) {
          const mx = (pts[i - 2] + pts[i]) / 2 + rand(-8, 8), my = (pts[i - 1] + pts[i + 1]) / 2 + rand(-8, 8);
          ctx.lineTo(mx, my); ctx.lineTo(pts[i], pts[i + 1]);
        }
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }
  drawHazards() {
    baseT();
    for (const h of this.hazards) {
      if (h.t < 0) continue;
      if (h.kind !== 'laser') { this.drawHazard(h); continue; }
      const L = h.len || 1500, c = Math.cos(h.ang), s = Math.sin(h.ang);
      const x2 = h.x + c * L, y2 = h.y + s * L;
      if (h.t < h.warm) {
        const k = h.t / h.warm;
        ctx.strokeStyle = rgba(h.color, 0.3 + 0.5 * Math.abs(Math.sin(h.t * 25)));
        ctx.lineWidth = 1 + k * 2; ctx.setLineDash([12, 8]);
        ctx.beginPath(); ctx.moveTo(h.x, h.y); ctx.lineTo(x2, y2); ctx.stroke(); ctx.setLineDash([]);
        ctx.globalCompositeOperation = 'lighter';
        const sp = glow(h.color, 16); const r = 8 + k * 18;
        ctx.drawImage(sp.c, h.x - r, h.y - r, r * 2, r * 2);
        ctx.globalCompositeOperation = 'source-over';
      } else {
        const k = Math.min(1, (h.warm + h.dur - h.t) * 6);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = k;
        for (const [w, col] of [[h.w * 1.8, rgba(h.color, 0.3)], [h.w, h.color], [h.w * 0.4, '#ffffff']]) {
          ctx.strokeStyle = col; ctx.lineWidth = w * (0.9 + 0.1 * Math.sin(this.t * 50));
          ctx.beginPath(); ctx.moveTo(h.x, h.y); ctx.lineTo(x2, y2); ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }
    }
  }
  drawHazard(h) {
    const t = this.t;
    ctx.globalCompositeOperation = 'lighter';
    if (h.kind === 'shock') {
      const k = Math.min(1, h.t * 4) * Math.min(1, (h.life - h.t) * 3);
      const gw = h.gap === null ? 0 : h.gw * Math.min(1, 60 / Math.max(60, h.r)) + 0.06;
      const a0 = h.gap === null ? 0 : h.gap + gw, a1 = h.gap === null ? TAU : h.gap - gw + TAU;
      ctx.globalAlpha = k;
      if (h.style === 'elec') {
        // anneau électrique crépitant
        for (const [w, col] of [[h.th * 2.2, rgba(h.color, 0.22)], [h.th * 0.9, rgba(h.color, 0.85)]]) { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.arc(h.x, h.y, h.r, a0, a1); ctx.stroke(); }
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.6; ctx.beginPath();
        const n = Math.max(24, Math.floor(h.r / 5));
        for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * (i / n), rr = h.r + (i % 2 ? 1 : -1) * (2 + 2 * Math.sin(t * 40 + i)); i ? ctx.lineTo(h.x + Math.cos(a) * rr, h.y + Math.sin(a) * rr) : ctx.moveTo(h.x + Math.cos(a) * rr, h.y + Math.sin(a) * rr); }
        ctx.stroke();
      } else {
        for (const [w, col] of [[h.th * 2.4, rgba(h.color, 0.2)], [h.th, rgba(h.color, 0.8)], [h.th * 0.35, '#ffffff']]) { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.arc(h.x, h.y, h.r, a0, a1); ctx.stroke(); }
      }
      if (h.gap !== null) { // repère de la brèche
        ctx.fillStyle = 'rgba(190,255,210,0.85)';
        for (const a of [h.gap - gw, h.gap + gw]) { ctx.beginPath(); ctx.arc(h.x + Math.cos(a) * h.r, h.y + Math.sin(a) * h.r, 3, 0, TAU); ctx.fill(); }
      }
    } else if (h.kind === 'mark') {
      const k = h.t / h.warm, bl = 0.45 + 0.55 * Math.abs(Math.sin(h.t * (8 + k * 14)));
      ctx.strokeStyle = rgba(h.color, 0.35 + 0.5 * bl); ctx.fillStyle = rgba(h.color, 0.08 + 0.16 * k);
      ctx.lineWidth = 2;
      if (h.shape === 'circle') {
        ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(h.x, h.y, h.r * (1 - k) + 3, 0, TAU); ctx.stroke();
        ctx.beginPath(); for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + 0.785; ctx.moveTo(h.x + Math.cos(a) * h.r * 0.45, h.y + Math.sin(a) * h.r * 0.45); ctx.lineTo(h.x + Math.cos(a) * h.r * 1.15, h.y + Math.sin(a) * h.r * 1.15); } ctx.stroke();
      } else if (h.shape === 'col') {
        ctx.fillRect(h.x - h.w / 2, 0, h.w, view.h);
        ctx.setLineDash([10, 8]); ctx.lineDashOffset = -t * 60;
        ctx.beginPath(); ctx.moveTo(h.x - h.w / 2, 0); ctx.lineTo(h.x - h.w / 2, view.h); ctx.moveTo(h.x + h.w / 2, 0); ctx.lineTo(h.x + h.w / 2, view.h); ctx.stroke(); ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(h.x - 9, h.y - 10); ctx.lineTo(h.x, h.y); ctx.lineTo(h.x + 9, h.y - 10); ctx.stroke();
      } else {
        ctx.fillRect(0, h.y - h.w / 2, view.w, h.w);
        ctx.setLineDash([10, 8]); ctx.lineDashOffset = -t * 60;
        ctx.beginPath(); ctx.moveTo(0, h.y - h.w / 2); ctx.lineTo(view.w, h.y - h.w / 2); ctx.moveTo(0, h.y + h.w / 2); ctx.lineTo(view.w, h.y + h.w / 2); ctx.stroke(); ctx.setLineDash([]);
      }
    } else if (h.kind === 'zone') {
      const k = Math.min(1, h.t * 3) * Math.min(1, (h.life - h.t) * 3), pul = 1 + 0.06 * Math.sin(t * 9 + h.x);
      const sp = glow(h.color, 24); const R = h.r * 1.5 * pul;
      ctx.globalAlpha = 0.55 * k; ctx.drawImage(sp.c, h.x - R, h.y - R * 0.75, R * 2, R * 1.5);
      ctx.globalAlpha = 0.9 * k; ctx.strokeStyle = h.color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(h.x, h.y, h.r * pul, h.r * 0.72 * pul, 0, 0, TAU); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      for (let i = 0; i < 4; i++) { const a = t * 2 + i * 1.7 + h.x, rr = h.r * 0.5 * ((t * 0.7 + i * 0.25) % 1); ctx.beginPath(); ctx.arc(h.x + Math.cos(a) * rr, h.y + Math.sin(a) * rr * 0.7, 1.6, 0, TAU); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
  drawEB() {
    for (const b of this.ebs) {
      const s = b.spr;
      if (b.orient) { setRT(b.x, b.y, Math.atan2(b.vy, b.vx) + Math.PI / 2); ctx.drawImage(s.c, -s.hw, -s.hh, s.w, s.h); }
      else ctx.drawImage(s.c, b.x - s.hw, b.y - s.hh, s.w, s.h);
    }
    baseT();
  }
  drawDebris() {
    baseT();
    for (const d of this.debris) {
      setRT(d.x, d.y, d.rot);
      if (d.spr) { const k = d.r / 14; ctx.drawImage(d.spr.cv, -d.spr.ox * k, -d.spr.oy * k, d.spr.w * k, d.spr.h * k); }
      else {
        ctx.fillStyle = d.col.c1; ctx.strokeStyle = d.col.cg; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-d.r, -d.r * 0.5); ctx.lineTo(d.r * 0.4, -d.r); ctx.lineTo(d.r, d.r * 0.3); ctx.lineTo(-d.r * 0.2, d.r); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      baseT();
      const p = 0.5 + 0.5 * Math.sin(this.t * 10);
      ctx.strokeStyle = rgba('#ffbe7a', 0.5 + 0.5 * p); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(d.x, d.y, d.r + 8 + p * 4, 0, TAU); ctx.stroke();
      setT(d.x, d.y - d.r - 14); drawPart(ctx, 6); baseT();
    }
  }
  pause() { if (this.state !== 'play' && this.state !== 'clear') return; this.paused = true; sfx.laser(false); if (this.onPause) this.onPause(); }
  resume() { this.paused = false; this.ignoreTouch = false; }
}
