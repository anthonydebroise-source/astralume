// Arrière-plans « pro » : textures procédurales calculées pixel par pixel (nébuleuses en volutes,
// planètes ombrées, astéroïdes sculptés, stations), relief planétaire éclairé, nuages, parallaxe profonde.
import { RNG, TAU, rgba, lighten, darken, mixHex, hash32 } from '../engine/math.js';
import { view, ctx, baseT } from '../engine/renderer.js';
import { makeCanvas, glow } from '../engine/sprites.js';
import { nebulaTexture, gasGiant, rockyMoon, rockSprite, cloudSprite, stationSprite, hiveSprite, monolithSprite, Terrain } from './bgart.js';

const GROUND_FOR_SPACE = { nebula: 'rock', amber: 'rock', reef: 'coral', hive: 'flesh', quantum: 'grid', heart: 'flesh' };
const SIDE_FOR = { reef: 'coral', hive: 'flesh', heart: 'flesh', quantum: 'glitch' };
const MEGA_FOR = { hive: 'hive', heart: 'hive', quantum: 'monolith' };
const CH = 640;
const TEX = new Map();
function cached(key, fn) {
  let v = TEX.get(key);
  if (!v) { v = fn(); TEX.set(key, v); if (TEX.size > 48) TEX.delete(TEX.keys().next().value); }
  return v;
}
function mk(wu, hu, res) {
  const sc = Math.max(0.2, view.rs * res);
  const c = makeCanvas(wu * sc, hu * sc);
  const g = c.getContext('2d');
  g.scale(c.width / wu, c.height / hu);
  return { c, g, w: wu, h: hu };
}
function radial(g, x, y, r, col, a) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, rgba(col, a)); gr.addColorStop(0.5, rgba(col, a * 0.4)); gr.addColorStop(1, rgba(col, 0));
  g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
}

export class Background {
  constructor(def, opts = {}) {
    this.def = def; this.pal = def.pal; this.th = def.world.theme; this.planet = !!def.planet;
    this.seed = def.seed || 1; this.t = 0; this.scroll = 0; this.warp = 0; this.beat = 0;
    this.groundKind = this.planet ? (this.th.ground || GROUND_FOR_SPACE[this.th.id] || 'rock') : null;
    this.menu = !!opts.menu;
    this.build();
  }
  build() {
    const P = this.pal, rng = new RNG(this.seed);
    this.rs = view.rs; this.vh = view.h;
    // Fond dégradé
    const b = mk(view.w, view.h, 0.2);
    const gr = b.g.createLinearGradient(0, 0, 0, view.h);
    gr.addColorStop(0, P.bg0); gr.addColorStop(0.55, P.bg1); gr.addColorStop(1, P.bg0);
    b.g.fillStyle = gr; b.g.fillRect(0, 0, view.w, view.h);
    this.base = b;
    // Nébuleuse procédurale (volutes, filaments, poussières)
    this.NH = 1200;
    if (!this.planet) {
      const ns = hash32(this.seed, 17);
      this.neb = cached('neb|' + ns + '|' + P.hue, () => nebulaTexture(P, ns, view.w, this.NH, 0.42));
      this.nebOff = rng.range(0, this.NH);
      // seconde nébuleuse, plus proche : grandes volutes translucides qui défilent nettement plus vite (parallaxe)
      const ns2 = hash32(this.seed, 29);
      this.neb2 = cached('neb2|' + ns2 + '|' + P.hue, () => nebulaTexture(P, ns2, view.w, this.NH, 0.24));
      this.neb2Off = rng.range(0, this.NH);
    }
    // Poussière en perspective : surgit d'un point de fuite au-dessus de l'écran et grossit en approchant
    this.dust = [];
    for (let i = 0; i < (this.planet ? 0 : 46); i++) this.dust.push(this.newDust(rng.next()));
    // Traînées de vitesse sur les bords
    this.streaks = [];
    for (let i = 0; i < (this.planet ? 6 : 10); i++) this.streaks.push(this.newStreak(rng.range(-view.h, view.h)));
    // Étoiles (3 couches)
    this.stars = [];
    const SH = 900;
    const defs = [{ n: 150, s: [0.4, 0.9], a: [0.3, 0.7], v: 12, res: 0.6 }, { n: 60, s: [0.8, 1.4], a: [0.5, 0.9], v: 32, res: 0.8 }, { n: 22, s: [1.2, 2], a: [0.8, 1], v: 80, res: 1 }];
    for (const d of defs) {
      const Ls = mk(view.w, SH, d.res);
      for (let i = 0; i < (this.planet ? d.n * 0.25 : d.n); i++) {
        const x = rng.range(0, view.w), y = rng.range(0, SH), s = rng.range(d.s[0], d.s[1]);
        const c = rng.chance(0.2) ? lighten(P.neb2, 0.5) : rng.chance(0.15) ? '#ffd8a8' : rng.chance(0.15) ? '#a8c8ff' : '#ffffff';
        Ls.g.fillStyle = rgba(c, rng.range(d.a[0], d.a[1]));
        Ls.g.beginPath(); Ls.g.arc(x, y, s, 0, TAU); Ls.g.fill();
        if (d.v > 50) { Ls.g.strokeStyle = rgba(c, 0.35); Ls.g.lineWidth = 0.6; Ls.g.beginPath(); Ls.g.moveTo(x - s * 4, y); Ls.g.lineTo(x + s * 4, y); Ls.g.moveTo(x, y - s * 4); Ls.g.lineTo(x, y + s * 4); Ls.g.stroke(); }
      }
      this.stars.push({ L: Ls, v: d.v, h: SH, off: rng.range(0, SH) });
    }
    this.twinkles = [];
    for (let i = 0; i < 18; i++) this.twinkles.push({ x: rng.range(0, view.w), y: rng.range(0, view.h), p: rng.range(0, TAU), s: rng.range(4, 9), c: rng.pick(['#ffffff', P.neb2, P.deco2]) });
    // Astéroïdes sculptés (sprites ombrés)
    const tint = mixHex('#8a7f76', P.neb1, 0.22), rs7 = this.seed % 7;
    this.rocks = [0, 1, 2, 3].map((k) => cached('rock|' + rs7 + '|' + k + '|' + P.hue, () => rockSprite(hash32(rs7, k, 3), 40, 1.3, tint, P.neb2)));
    // Décor latéral
    this.sideKind = this.planet ? null : (SIDE_FOR[this.th.id] || 'rocks');
    if (this.sideKind && this.sideKind !== 'rocks') { this.side = this.buildSide(rng); this.sideOff = 0; }
    this.sideRocks = [];
    if (this.sideKind === 'rocks') for (let i = 0; i < 5; i++) this.sideRocks.push(this.newSideRock(rng.range(-150, view.h)));
    // Corps céleste lointain
    this.far = this.planet ? null : this.buildFar(rng);
    // Mégastructure (station, ruche, monolithes)
    this.mega = null; this.megaT = this.menu ? 1e9 : rng.range(5, 14);
    this.megaKind = MEGA_FOR[this.th.id] || 'station';
    // Sol en relief
    this.chunks = new Map();
    if (this.planet) {
      if (this.groundKind !== 'grid') this.terrain = new Terrain(this.groundKind, P, hash32(this.seed, 5), 0.55, CH, { cliff: (Y, s) => this.cliff(Y, s), riverX: (Y) => this.riverX(Y), riverW: (Y) => this.riverW(Y) });
      const cs = this.seed % 5;
      this.cloudSpr = [0, 1, 2].map((k) => cached('cloud|' + cs + '|' + k, () => cloudSprite(hash32(cs, k), 180, 110, 0.5)));
      this.shadowSpr = [0, 1, 2].map((k) => cached('cshadow|' + cs + '|' + k, () => cloudSprite(hash32(cs, k), 180, 110, 0.35, '#000000')));
      this.clouds = [];
      for (let i = 0; i < 5; i++) this.clouds.push({ x: rng.range(-40, view.w + 40), y: rng.range(-100, view.h), k: i % 3, s: rng.range(0.9, 1.5) });
      for (let k = 0; k <= Math.ceil(view.h / CH) + 1; k++) this.ensureChunk(k, true);
    }
    // Premier plan
    this.fg = [];
    for (let i = 0; i < 3; i++) this.fg.push(this.newFg(rng.range(-view.h, view.h)));
    // Vignette
    const v = mk(view.w, view.h, 0.15);
    const vg = v.g.createRadialGradient(view.w / 2, view.h * 0.5, view.h * 0.25, view.w / 2, view.h * 0.5, view.h * 0.78);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.6)');
    v.g.fillStyle = vg; v.g.fillRect(0, 0, view.w, view.h);
    const tg = v.g.createLinearGradient(0, 0, 0, view.h * 0.35);
    tg.addColorStop(0, rgba(P.neb2, 0.12)); tg.addColorStop(1, rgba(P.neb2, 0));
    v.g.fillStyle = tg; v.g.fillRect(0, 0, view.w, view.h * 0.35);
    this.vig = v;
  }
  newDust(d = 0) {
    const u = (Math.random() * 2 - 1);
    return { u: Math.sign(u) * Math.pow(Math.abs(u), 0.7), d, sp: 0.14 + Math.random() * 0.12, c: Math.random() < 0.25 ? this.pal.neb2 : Math.random() < 0.2 ? this.pal.deco2 : '#ffffff' };
  }
  newStreak(y) {
    const edge = Math.random() < 0.7;
    const x = edge ? (Math.random() < 0.5 ? Math.random() * view.w * 0.18 : view.w * (0.82 + Math.random() * 0.18)) : Math.random() * view.w;
    return { x, y, len: 60 + Math.random() * 140, v: 520 + Math.random() * 520, a: 0.08 + Math.random() * 0.14, c: Math.random() < 0.5 ? '#ffffff' : this.pal.neb2 };
  }
  newSideRock(y) {
    const left = Math.random() < 0.5, s = 0.5 + Math.random() * 0.9;
    return { k: Math.floor(Math.random() * 4), x: left ? -10 + Math.random() * 40 : view.w + 10 - Math.random() * 40, y, s, rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 0.5, v: 55 + s * 30 };
  }
  newFg(y) {
    const left = Math.random() < 0.5;
    return { x: left ? -30 - Math.random() * 30 : view.w + 30 + Math.random() * 30, y, s: 1.4 + Math.random() * 1.2, k: Math.floor(Math.random() * 4), rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 0.7 };
  }
  buildSide(rng) {
    const P = this.pal, W = 92, H = 1000;
    const s = mk(W, H, 0.45);
    const g = s.g;
    const k = this.sideKind;
    const wrap = (fn) => { for (const oy of [0, -H, H]) fn(oy); };
    if (k === 'gas') {
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 14; i++) { const y = rng.range(0, H), r = rng.range(30, 80), c = rng.pick([P.neb1, P.neb2]); wrap((oy) => radial(g, rng.range(-10, 30), y + oy, r, c, 0.18)); }
      g.globalCompositeOperation = 'source-over';
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 70; i++) { const y = rng.range(0, H), x = rng.range(0, 60) * rng.next(); wrap((oy) => { g.fillStyle = rgba(rng.chance(0.5) ? '#ffffff' : P.neb2, rng.range(0.3, 0.9)); g.beginPath(); g.arc(x, y + oy, rng.range(0.5, 1.6), 0, TAU); g.fill(); }); }
      for (let i = 0; i < 6; i++) { const y = rng.range(0, H); wrap((oy) => { g.strokeStyle = rgba(P.neb2, 0.25); g.lineWidth = rng.range(2, 6); g.beginPath(); g.moveTo(-5, y + oy); g.bezierCurveTo(30, y + oy + 40, 10, y + oy + 90, 40, y + oy + 160); g.stroke(); }); }
      g.globalCompositeOperation = 'source-over';
    } else if (k === 'rocks') {
      for (let i = 0; i < 16; i++) {
        const y = rng.range(0, H), r = rng.range(14, 44), x = rng.range(-10, 30), n = 8, pts = [];
        for (let j = 0; j < n; j++) pts.push(rng.range(0.7, 1.1));
        wrap((oy) => {
          g.beginPath(); for (let j = 0; j < n; j++) { const a = (j / n) * TAU; g.lineTo(x + Math.cos(a) * r * pts[j], y + oy + Math.sin(a) * r * pts[j]); } g.closePath();
          g.fillStyle = darken(P.g0 || P.bg1, 0.3); g.fill(); g.strokeStyle = rgba(P.deco, 0.5); g.lineWidth = 1.2; g.stroke();
        });
      }
    } else if (k === 'coral') {
      const branch = (x, y, a, l, w, d) => {
        if (d <= 0 || l < 4) return;
        const x2 = x + Math.cos(a) * l, y2 = y + Math.sin(a) * l;
        g.strokeStyle = d > 2 ? darken(P.deco, 0.4) : P.deco; g.lineWidth = w; g.lineCap = 'round';
        g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke();
        if (d === 1) { g.fillStyle = lighten(P.deco2, 0.3); g.beginPath(); g.arc(x2, y2, 2.4, 0, TAU); g.fill(); }
        branch(x2, y2, a - rng.range(0.2, 0.6), l * 0.75, w * 0.7, d - 1);
        branch(x2, y2, a + rng.range(0.2, 0.6), l * 0.75, w * 0.7, d - 1);
      };
      for (let i = 0; i < 9; i++) { const y = rng.range(60, H - 60); branch(-6, y, rng.range(-0.5, 0.5), rng.range(22, 34), 5, 5); }
    } else if (k === 'flesh') {
      for (const oy of [0, -H, H]) {
        g.beginPath(); g.moveTo(-5, oy);
        for (let y = 0; y <= H; y += 20) g.lineTo(34 + Math.sin((y / H) * TAU * 3) * 12 + Math.sin((y / H) * TAU * 7) * 5, y + oy);
        g.lineTo(-5, H + oy); g.closePath();
        const gr = g.createLinearGradient(0, 0, 50, 0);
        gr.addColorStop(0, darken(P.neb1, 0.7)); gr.addColorStop(1, darken(P.neb1, 0.35));
        g.fillStyle = gr; g.fill(); g.strokeStyle = rgba(P.neb2, 0.7); g.lineWidth = 2; g.stroke();
      }
      g.strokeStyle = rgba(P.neb2, 0.5); g.lineWidth = 1.5;
      for (let i = 0; i < 18; i++) { const y = rng.range(0, H); wrap((oy) => { g.beginPath(); g.moveTo(0, y + oy); g.quadraticCurveTo(14, y + oy + 12, rng.range(18, 34), y + oy + rng.range(-20, 20)); g.stroke(); }); }
      for (let i = 0; i < 10; i++) { const y = rng.range(0, H); wrap((oy) => { g.fillStyle = rgba(P.deco2, 0.8); g.beginPath(); g.arc(rng.range(8, 24), y + oy, rng.range(2, 5), 0, TAU); g.fill(); }); }
    } else {
      g.strokeStyle = rgba(P.deco, 0.6); g.lineWidth = 1;
      for (let i = 0; i < 26; i++) { const y = rng.range(0, H), w = rng.range(8, 50), h = rng.range(4, 30); wrap((oy) => { g.strokeRect(rng.range(-10, 20), y + oy, w, h); if (rng.chance(0.4)) { g.fillStyle = rgba(rng.pick([P.deco, P.deco2]), 0.35); g.fillRect(rng.range(-10, 20), y + oy, w * 0.5, h * 0.5); } }); }
    }
    return { s, W, H };
  }
  buildFar(rng) {
    const P = this.pal;
    const r = rng.next();
    const fs = hash32(this.seed, 23);
    let obj;
    if (r < 0.55) { const R = rng.range(60, 95); const gg = cached('giant|' + fs + '|' + P.hue, () => gasGiant(P, fs, R, 1.1, rng.chance(0.6))); obj = { cv: gg.cv, size: gg.S / gg.res }; }
    else if (r < 0.85) { const R = rng.range(40, 60); const m = cached('moon|' + fs + '|' + P.hue, () => rockyMoon(P, fs, R, 1.2)); obj = { cv: m.cv, size: m.S / m.res }; }
    else {
      const R = 110, S = mk(R * 3, R * 3, 0.4), g = S.g, c = R * 1.5;
      g.globalCompositeOperation = 'lighter';
      radial(g, c, c, R * 0.5, '#ffffff', 0.35);
      for (let i = 0; i < 500; i++) { const arm = i % 2, d = Math.pow(rng.next(), 0.7) * R, a = d * 0.045 + arm * Math.PI + rng.range(-0.35, 0.35); g.fillStyle = rgba(rng.pick([P.neb2, '#ffffff', P.neb1]), rng.range(0.2, 0.7)); g.beginPath(); g.arc(c + Math.cos(a) * d, c + Math.sin(a) * d * 0.45, rng.range(0.6, 1.6), 0, TAU); g.fill(); }
      obj = { cv: S.c, size: R * 3 };
    }
    const left = rng.chance(0.5);
    obj.x = left ? rng.range(obj.size * 0.15, view.w * 0.35) : rng.range(view.w * 0.65, view.w - obj.size * 0.15);
    obj.y = rng.range(view.h * 0.12, view.h * 0.45);
    obj.v = rng.range(9, 14); // assez lent pour paraître lointain, assez rapide pour sentir l’avancée
    return obj;
  }
  spawnMega() {
    const P = this.pal, k = this.megaKind, px = Math.min(3, view.rs * 0.9), ms = hash32(this.seed, 41);
    const cv = cached(k + '|' + ms + '|' + P.hue + '|' + px.toFixed(1), () => (k === 'hive' ? hiveSprite(P, ms, px) : k === 'monolith' ? monolithSprite(P, ms, px) : stationSprite(P, ms, px)));
    const wU = k === 'monolith' ? 220 : k === 'hive' ? 240 : 260, hU = k === 'monolith' ? 260 : wU;
    const left = Math.random() < 0.5;
    const sc = k === 'station' ? 0.75 : 0.85;
    this.mega = { cv, w: wU * sc, h: hU * sc, x: left ? view.w * 0.12 : view.w * 0.88, y: -hU * sc * 0.6, v: 16, rot: Math.random() * TAU, vr: k === 'station' ? 0.06 : 0, kind: k };
  }

  // ---------- Sol ----------
  riverX(Y) { const s = this.seed % 1000; return view.w / 2 + Math.sin(Y * 0.0034 + s) * 120 + Math.sin(Y * 0.0093 + s * 2) * 38; }
  riverW(Y) { return 26 + 12 * Math.sin(Y * 0.011 + 1); }
  cliff(Y, side) { const s = (this.seed % 97) + side * 13; return 22 + 14 * Math.sin(Y * 0.0105 + s) + 7 * Math.sin(Y * 0.031 + s * 3); }
  gridChunk(k) {
    const res = 0.55, w = Math.ceil(400 * res), h = Math.ceil(CH * res);
    const cv = makeCanvas(w, h), g = cv.getContext('2d'), P = this.pal;
    g.scale(res, res);
    const gr = g.createLinearGradient(0, 0, 400, 0); gr.addColorStop(0, '#05030c'); gr.addColorStop(0.5, darken(P.g1, 0.4)); gr.addColorStop(1, '#05030c');
    g.fillStyle = gr; g.fillRect(0, 0, 400, CH);
    const ch = { k, cv, g, done: true, feat: false, lights: [], res };
    return ch;
  }
  ensureChunk(k, sync) {
    let ch = this.chunks.get(k);
    if (!ch) {
      ch = this.terrain ? this.terrain.makeChunk(k) : this.gridChunk(k);
      ch.feat = false; ch.res = this.terrain ? this.terrain.res : 0.55;
      this.chunks.set(k, ch);
    }
    if (!ch.done && sync) while (!this.terrain.step(ch, 1e9));
    if (ch.done && !ch.feat) { this.decorate(ch); ch.feat = true; }
    return ch;
  }
  decorate(ch) {
    const g = ch.g;
    g.save(); g.setTransform(ch.res, 0, 0, ch.res, 0, 0);
    for (let kk = ch.k - 1; kk <= ch.k + 1; kk++) {
      const r = new RNG(hash32(this.seed, kk, 991));
      this.paintFeatures(g, r, (ch.k - kk) * CH, this.groundKind, this.pal, kk === ch.k ? ch.lights : null);
    }
    const liq = this.groundKind === 'lava' ? '#ff6a1f' : this.pal.liquid;
    for (let y = 40; y < CH; y += 140) ch.lights.push({ x: this.riverX(ch.k * CH + CH - y), y, r: 44, c: liq });
    g.restore();
  }
  paintFeatures(g, r, oy, kind, P, lights) {
    const W = view.w;
    const L = (x, y, rad, c) => { if (lights && y > 0 && y < CH) lights.push({ x, y, r: rad, c }); };
    switch (kind) {
      case 'coral': {
        const br = (x, y, a, l, w, d, col) => { if (d <= 0) return; const x2 = x + Math.cos(a) * l, y2 = y + Math.sin(a) * l; g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke(); br(x2, y2, a - r.range(0.3, 0.7), l * 0.72, w * 0.7, d - 1, col); br(x2, y2, a + r.range(0.3, 0.7), l * 0.72, w * 0.7, d - 1, col); };
        for (let i = 0; i < 6; i++) { const x = r.range(50, W - 50), y = r.range(0, CH) + oy, col = r.chance(0.5) ? P.deco : P.deco2; g.globalAlpha = 0.85; br(x, y, r.range(0, TAU), r.range(10, 15), 3.5, 4, col); g.globalAlpha = 1; L(x, y, 30, col); }
        for (let i = 0; i < 5; i++) { const x = r.range(40, W - 40), y = r.range(0, CH) + oy, rr = r.range(5, 10); g.strokeStyle = rgba(P.deco2, 0.85); g.lineWidth = 1.4; for (let j = 0; j < 10; j++) { const a = (j / 10) * TAU; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * rr * 1.6, y + Math.sin(a) * rr * 1.6); g.stroke(); } g.fillStyle = lighten(P.deco2, 0.4); g.beginPath(); g.arc(x, y, rr * 0.5, 0, TAU); g.fill(); }
        break;
      }
      case 'swamp': {
        for (let i = 0; i < 12; i++) { const x = r.range(40, W - 40), y = r.range(0, CH) + oy, rr = r.range(4, 9); g.fillStyle = rgba(lighten(P.g2, 0.2), 0.95); g.beginPath(); g.arc(x, y, rr, 0.4, TAU - 0.1); g.lineTo(x, y); g.fill(); g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 0.8; g.stroke(); }
        g.strokeStyle = rgba(lighten(P.g2, 0.35), 0.7); g.lineWidth = 1.2;
        for (let i = 0; i < 10; i++) { const x = r.range(40, W - 40), y = r.range(0, CH) + oy; for (let j = 0; j < 5; j++) { g.beginPath(); g.moveTo(x + j * 3, y); g.lineTo(x + j * 3 + r.range(-6, 6), y - r.range(8, 18)); g.stroke(); } }
        g.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 26; i++) { const x = r.range(30, W - 30), y = r.range(0, CH) + oy; g.fillStyle = rgba(P.deco, r.range(0.3, 0.8)); g.beginPath(); g.arc(x, y, r.range(0.8, 2), 0, TAU); g.fill(); if (i % 6 === 0) L(x, y, 22, P.deco); }
        g.globalCompositeOperation = 'source-over';
        break;
      }
      case 'ice': {
        g.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 4; i++) { let x = r.range(50, W - 50), y = r.range(0, CH) + oy; g.strokeStyle = rgba(P.deco, 0.6); g.lineWidth = 1.4; g.beginPath(); g.moveTo(x, y); for (let j = 0; j < 6; j++) { x += r.range(-22, 22); y += r.range(-26, 26); g.lineTo(x, y); } g.stroke(); L(x, y, 26, P.deco); }
        g.globalCompositeOperation = 'source-over';
        for (let i = 0; i < 7; i++) { const x = r.range(50, W - 50), y = r.range(0, CH) + oy, hh = r.range(8, 16); g.fillStyle = 'rgba(0,20,60,0.35)'; g.beginPath(); g.ellipse(x + hh * 0.4, y + 2, hh * 0.5, hh * 0.2, 0.4, 0, TAU); g.fill(); g.beginPath(); g.moveTo(x, y - hh); g.lineTo(x + hh * 0.3, y); g.lineTo(x - hh * 0.3, y); g.closePath(); const gr = g.createLinearGradient(x - hh * 0.3, 0, x + hh * 0.3, 0); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#5aa8e8'); g.fillStyle = gr; g.fill(); }
        break;
      }
      case 'lava': {
        g.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 8; i++) { let x = r.range(40, W - 40), y = r.range(0, CH) + oy; g.strokeStyle = rgba('#ff7a2a', 0.7); g.lineWidth = r.range(1, 2.2); g.beginPath(); g.moveTo(x, y); for (let j = 0; j < 5; j++) { x += r.range(-20, 20); y += r.range(-20, 20); g.lineTo(x, y); } g.stroke(); }
        for (let i = 0; i < 4; i++) { const x = r.range(50, W - 50), y = r.range(0, CH) + oy; radial(g, x, y, 24, '#ff8a2a', 0.55); L(x, y, 30, '#ff7a2a'); }
        g.globalCompositeOperation = 'source-over';
        for (let i = 0; i < 4; i++) { const x = r.range(50, W - 50), y = r.range(0, CH) + oy; g.fillStyle = '#1a0806'; g.beginPath(); g.arc(x, y, 7, 0, TAU); g.fill(); g.strokeStyle = '#ffb060'; g.lineWidth = 2; g.stroke(); }
        break;
      }
      case 'dunes': {
        g.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 14; i++) { const x = r.range(30, W - 30), y = r.range(0, CH) + oy; g.fillStyle = rgba(P.deco, 0.85); g.beginPath(); g.moveTo(x, y - 4); g.lineTo(x + 2, y); g.lineTo(x, y + 4); g.lineTo(x - 2, y); g.fill(); if (i % 4 === 0) L(x, y, 14, P.deco); }
        g.globalCompositeOperation = 'source-over';
        for (let i = 0; i < 2; i++) { const x = r.range(60, W - 110), y = r.range(0, CH) + oy, w = r.range(30, 60), hh = r.range(20, 40); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x + 5, y + 5, w, hh); g.strokeStyle = rgba(lighten(P.g2, 0.4), 0.75); g.lineWidth = 2; g.strokeRect(x, y, w, hh); g.strokeRect(x + 8, y + 8, 12, 12); }
        break;
      }
      case 'mushroom': {
        for (let i = 0; i < 9; i++) {
          const x = r.range(40, W - 40), y = r.range(0, CH) + oy, rr = r.range(12, 28), col = r.chance(0.5) ? P.deco : P.deco2;
          g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(x + rr * 0.35, y + rr * 0.4, rr, rr * 0.9, 0, 0, TAU); g.fill();
          const gr = g.createRadialGradient(x - rr * 0.35, y - rr * 0.35, 0, x, y, rr); gr.addColorStop(0, lighten(col, 0.4)); gr.addColorStop(0.7, col); gr.addColorStop(1, darken(col, 0.55));
          g.fillStyle = gr; g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill();
          g.fillStyle = rgba('#ffffff', 0.75); for (let j = 0; j < 5; j++) { g.beginPath(); g.arc(x + r.range(-rr, rr) * 0.6, y + r.range(-rr, rr) * 0.6, r.range(1.5, 3.5), 0, TAU); g.fill(); }
          L(x, y, rr * 1.6, col);
        }
        g.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 36; i++) { g.fillStyle = rgba(P.deco2, r.range(0.3, 0.8)); g.beginPath(); g.arc(r.range(30, W - 30), r.range(0, CH) + oy, r.range(0.6, 1.8), 0, TAU); g.fill(); }
        g.globalCompositeOperation = 'source-over';
        break;
      }
      case 'flesh': {
        for (let i = 0; i < 10; i++) { const x = r.range(40, W - 40), y = r.range(0, CH) + oy, rr = r.range(6, 15); g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.arc(x + 3, y + 4, rr, 0, TAU); g.fill(); g.fillStyle = rgba(darken(P.neb1, 0.2), 0.95); g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill(); g.fillStyle = rgba(P.deco2, 0.9); g.beginPath(); g.arc(x, y, rr * 0.38, 0, TAU); g.fill(); L(x, y, rr * 2, P.deco2); }
        break;
      }
      case 'grid': {
        g.strokeStyle = rgba(P.deco, 0.28); g.lineWidth = 1;
        for (let x = 0; x <= W; x += 40) { g.beginPath(); g.moveTo(x, oy); g.lineTo(x, CH + oy); g.stroke(); }
        for (let y = 0; y <= CH; y += 40) { g.beginPath(); g.moveTo(0, y + oy); g.lineTo(W, y + oy); g.stroke(); }
        for (let i = 0; i < 12; i++) { const x = Math.floor(r.range(0, 10)) * 40, y = Math.floor(r.range(0, 16)) * 40 + oy; g.fillStyle = rgba(r.pick([P.deco, P.deco2]), r.range(0.15, 0.45)); g.fillRect(x, y, 40, 40); if (i % 3 === 0) L(x + 20, y + 20, 30, P.deco); }
        break;
      }
      default: {
        g.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 8; i++) { const x = r.range(40, W - 40), y = r.range(0, CH) + oy, h = r.range(5, 11); g.fillStyle = rgba(r.chance(0.5) ? P.deco : P.deco2, 0.9); g.beginPath(); g.moveTo(x, y - h); g.lineTo(x + h * 0.35, y); g.lineTo(x, y + h * 0.4); g.lineTo(x - h * 0.35, y); g.closePath(); g.fill(); L(x, y, 18, P.deco); }
        g.globalCompositeOperation = 'source-over';
      }
    }
  }

  update(dt, speed = 1) {
    if (this.rs !== view.rs || this.vh !== view.h) { this.chunks.clear(); this.build(); }
    this.t += dt;
    this.beat = Math.max(0, this.beat - dt * 3);
    const sp = speed * (1 + this.warp * 6);
    this.scroll += dt * 58 * sp;
    for (const s of this.stars) s.off = (s.off + dt * s.v * 1.6 * sp) % s.h;
    if (this.side) this.sideOff = (this.sideOff + dt * 90 * sp) % this.side.H;
    if (this.neb) this.nebOff = ((this.nebOff || 0) + dt * 16 * sp) % this.NH;
    if (this.neb2) this.neb2Off = ((this.neb2Off || 0) + dt * 62 * sp) % (this.NH * 1.5);
    for (let i = 0; i < this.dust.length; i++) {
      const m = this.dust[i];
      m.d += dt * sp * m.sp * (0.35 + 2.2 * m.d * m.d);
      if (m.d >= 1) this.dust[i] = this.newDust(0);
    }
    for (let i = 0; i < this.streaks.length; i++) { const k = this.streaks[i]; k.y += dt * k.v * sp; if (k.y - k.len > view.h) this.streaks[i] = this.newStreak(-k.len - Math.random() * 600); }
    if (this.far) { this.far.y += dt * this.far.v * sp; if (this.far.y - this.far.size / 2 > view.h) { this.far.y = -this.far.size / 2; } }
    for (let i = 0; i < this.sideRocks.length; i++) { const r = this.sideRocks[i]; r.y += dt * r.v * 1.35 * sp; r.rot += r.vr * dt; if (r.y > view.h + 80) this.sideRocks[i] = this.newSideRock(-80 - Math.random() * 200); }
    if (!this.planet && !this.menu) {
      this.megaT -= dt;
      if (this.megaT <= 0 && !this.mega) this.spawnMega();
      if (this.mega) { const m = this.mega; m.y += dt * m.v * sp; m.rot += m.vr * dt; if (m.y - m.h > view.h) { this.mega = null; this.megaT = 40 + Math.random() * 20; } }
    }
    for (let i = 0; i < this.fg.length; i++) { const f = this.fg[i]; f.y += dt * 210 * sp * (f.s / 2); f.rot += f.vr * dt; if (f.y > view.h + 220) this.fg[i] = this.newFg(-220 - Math.random() * 500); }
    if (this.clouds) for (const c of this.clouds) { c.y += dt * 84 * sp * c.s; if (c.y > view.h + 80) { c.y = -160; c.x = Math.random() * (view.w + 80) - 40; } }
    if (this.planet) {
      const k0 = Math.floor(this.scroll / CH), k1 = Math.floor((view.h + this.scroll) / CH);
      for (let k = k0; k <= k1 + 1; k++) {
        const ch = this.ensureChunk(k, k <= k1);
        if (!ch.done) { this.terrain.step(ch, 3); break; }
      }
      for (const k of this.chunks.keys()) if (k < k0 - 1) this.chunks.delete(k);
    }
  }
  drawTile(L, off, H, x = 0, w = view.w, alpha = 1) {
    // dessine une texture verticale répétée qui défile vers le bas
    ctx.globalAlpha = alpha;
    let y = off - H;
    while (y < view.h) { ctx.drawImage(L.c, x, y, w, H); y += H; }
    ctx.globalAlpha = 1;
  }
  // Volutes proches : agrandies (plus près = plus gros) et nettement plus rapides
  drawNeb2() {
    const n = this.neb2; if (!n) return;
    const H = this.NH * 1.5, W = view.w * 1.5, x = -view.w * 0.25 + Math.sin(this.t * 0.05) * view.w * 0.08;
    ctx.globalAlpha = 0.42 + this.beat * 0.06;
    let y = (this.neb2Off || 0) - H;
    while (y < view.h) { ctx.drawImage(n, x, y, W, H); y += H; }
    ctx.globalAlpha = 1;
  }
  // Poussière en perspective + traînées de vitesse : la sensation d'avancer
  drawDust() {
    const cx = view.w / 2, top = -view.h * 0.12, H = view.h * 1.18, W = view.w;
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (const m of this.dust) {
      const d = m.d;
      if (d < 0.05) continue;
      const x = cx + m.u * (0.08 + 0.92 * d) * W * 0.7, y = top + d * d * H;
      const k = Math.min(1, d * 1.6), sz = 0.4 + 2.2 * d * d;
      const dx = x - cx, dy = y - top, L = Math.hypot(dx, dy) || 1, tl = 2 + d * d * 34;
      ctx.strokeStyle = rgba(m.c, 0.55 * k); ctx.lineWidth = sz;
      ctx.beginPath(); ctx.moveTo(x - (dx / L) * tl, y - (dy / L) * tl); ctx.lineTo(x, y); ctx.stroke();
    }
    for (const k of this.streaks) {
      const gr = ctx.createLinearGradient(0, k.y - k.len, 0, k.y);
      gr.addColorStop(0, rgba(k.c, 0)); gr.addColorStop(1, rgba(k.c, k.a));
      ctx.strokeStyle = gr; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(k.x, k.y - k.len); ctx.lineTo(k.x, k.y); ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  drawNeb() {
    const n = this.neb, H = this.NH;
    let y = (this.nebOff || 0) - H;
    while (y < view.h) { ctx.drawImage(n, 0, y, view.w, H); y += H; }
  }
  draw() {
    baseT();
    ctx.drawImage(this.base.c, 0, 0, view.w, view.h);
    if (!this.planet) {
      ctx.globalAlpha = 0.95 + this.beat * 0.05;
      this.drawNeb();
      ctx.globalAlpha = 1;
      this.drawTile(this.stars[0].L, this.stars[0].off, this.stars[0].h);
      if (this.far) { // l'astre grossit doucement en approchant (profondeur)
        const F = this.far, u = Math.max(0, Math.min(1, (F.y + F.size / 2) / (view.h + F.size))), sz = F.size * (0.82 + 0.42 * u);
        ctx.drawImage(F.cv, F.x - sz / 2, F.y - sz / 2, sz, sz);
      }
      this.drawTile(this.stars[1].L, this.stars[1].off, this.stars[1].h);
      if (this.mega) this.drawMega();
      this.drawSun();
      this.drawNeb2();
      this.drawTile(this.stars[2].L, this.stars[2].off, this.stars[2].h);
      this.drawDust();
      this.drawTwinkles();
      if (this.side) this.drawSides();
      for (const r of this.sideRocks) this.drawRock(r, r.s, 1);
    } else {
      const k0 = Math.floor(this.scroll / CH), k1 = Math.floor((view.h + this.scroll) / CH);
      for (let k = k0; k <= k1; k++) {
        const ch = this.chunks.get(k); if (!ch || !ch.done) continue;
        const y = view.h - (k + 1) * CH + this.scroll;
        ctx.drawImage(ch.cv, 0, y - 0.5, view.w, CH + 1);
      }
      ctx.globalCompositeOperation = 'lighter';
      for (let k = k0; k <= k1; k++) {
        const ch = this.chunks.get(k); if (!ch || !ch.done) continue;
        const y0 = view.h - (k + 1) * CH + this.scroll;
        for (const Lt of ch.lights) {
          const s = glow(Lt.c, 32);
          const r = Lt.r * (1 + 0.2 * Math.sin(this.t * 2 + Lt.x) + this.beat * 0.25);
          ctx.globalAlpha = 0.3 + this.beat * 0.2;
          ctx.drawImage(s.c, Lt.x - r, y0 + Lt.y - r, r * 2, r * 2);
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      // étalonnage : le sol reste en retrait pour que l'action ressorte
      ctx.fillStyle = rgba(this.pal.bg0, 0.34); ctx.fillRect(0, 0, view.w, view.h);
      for (const c of this.clouds) { const s = this.shadowSpr[c.k]; ctx.globalAlpha = 0.35; ctx.drawImage(s, c.x + 30, c.y + 46, 180 * c.s, 110 * c.s); }
      ctx.globalAlpha = 1;
    }
  }
  drawRock(r, s, a) {
    const R = this.rocks[r.k], size = (R.S / R.res) * s;
    ctx.save(); ctx.translate(r.x, r.y); ctx.rotate(r.rot); ctx.globalAlpha = a;
    ctx.drawImage(R.cv, -size / 2, -size / 2, size, size);
    ctx.restore(); ctx.globalAlpha = 1;
    baseT();
  }
  drawMega() {
    const m = this.mega;
    ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(m.rot);
    ctx.globalAlpha = 0.92;
    ctx.drawImage(m.cv, -m.w / 2, -m.h / 2, m.w, m.h);
    ctx.globalAlpha = 1;
    // feux clignotants
    ctx.globalCompositeOperation = 'lighter';
    const s = glow(m.kind === 'station' ? '#ff4f6e' : this.pal.deco2, 16);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU, on = Math.sin(this.t * 4 + i * 1.7) > 0.6;
      if (!on) continue;
      const rr = m.w * 0.4;
      ctx.drawImage(s.c, Math.cos(a) * rr - 8, Math.sin(a) * rr - 8, 16, 16);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
    baseT();
  }
  drawClouds() {
    if (!this.clouds) return;
    baseT();
    for (const c of this.clouds) { const s = this.cloudSpr[c.k]; ctx.globalAlpha = 0.42; ctx.drawImage(s, c.x, c.y, 180 * c.s, 110 * c.s); }
    ctx.globalAlpha = 1;
  }
  drawSun() {
    if (!this.sun) {
      const right = (this.seed % 2) === 0;
      this.sun = { x: right ? view.w * 0.82 : view.w * 0.18, y: view.h * 0.08, c: this.pal.neb2 };
    }
    const S = this.sun, t = this.t;
    ctx.globalCompositeOperation = 'lighter';
    const g1 = glow(S.c, 32), g2 = glow('#ffffff', 32);
    const p = 1 + 0.04 * Math.sin(t * 0.8) + this.beat * 0.05;
    ctx.globalAlpha = 0.4; ctx.drawImage(g1.c, S.x - 190 * p, S.y - 190 * p, 380 * p, 380 * p);
    ctx.globalAlpha = 0.9; ctx.drawImage(g2.c, S.x - 34 * p, S.y - 34 * p, 68 * p, 68 * p);
    // rayons divins qui tournent lentement
    ctx.globalAlpha = 0.045;
    for (let i = 0; i < 9; i++) {
      const a = t * 0.05 + (i / 9) * TAU;
      ctx.fillStyle = i % 2 ? S.c : '#ffffff';
      ctx.beginPath(); ctx.moveTo(S.x, S.y); ctx.lineTo(S.x + Math.cos(a - 0.05) * 520, S.y + Math.sin(a - 0.05) * 520); ctx.lineTo(S.x + Math.cos(a + 0.05) * 520, S.y + Math.sin(a + 0.05) * 520); ctx.closePath(); ctx.fill();
    }
    // reflets d'objectif alignés vers le centre de l'écran
    const dx = view.w / 2 - S.x, dy = view.h * 0.6 - S.y;
    for (const [k, r, a] of [[0.35, 14, 0.18], [0.6, 26, 0.1], [0.85, 9, 0.22], [1.25, 40, 0.07]]) {
      ctx.globalAlpha = a; ctx.drawImage(g1.c, S.x + dx * k - r, S.y + dy * k - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }  drawTwinkles() {
    ctx.globalCompositeOperation = 'lighter';
    for (const s of this.twinkles) {
      const a = 0.5 + 0.5 * Math.sin(this.t * 2.2 + s.p);
      const sp = glow(s.c, 16);
      ctx.globalAlpha = a * 0.8;
      const r = s.s * (0.6 + a * 0.5 + this.beat * 0.3);
      ctx.drawImage(sp.c, s.x - r, s.y - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }  drawSides() {
    const S = this.side;
    let y = this.sideOff - S.H;
    while (y < view.h) {
      ctx.drawImage(S.s.c, 0, y, S.W, S.H);
      ctx.save(); ctx.translate(view.w, 0); ctx.scale(-1, 1); ctx.drawImage(S.s.c, 0, y + S.H * 0.37, S.W, S.H); ctx.drawImage(S.s.c, 0, y + S.H * 0.37 - S.H, S.W, S.H); ctx.restore();
      y += S.H;
    }
    baseT();
  }
  drawFront(superOn) {
    baseT();
    if (!this.menu) {
      if (this.planet) { for (const f of this.fg) { const s = this.cloudSpr[f.k % 3], w = 260 * f.s; ctx.globalAlpha = 0.16; ctx.drawImage(s, f.x - w / 2, f.y - w * 0.3, w, w * 0.6); } ctx.globalAlpha = 1; }
      else for (const f of this.fg) this.drawRock(f, f.s, 1);
    }
    if (this.warp > 0.02 || superOn) {
      ctx.globalCompositeOperation = 'lighter';
      const n = superOn ? 10 : Math.floor(this.warp * 30);
      for (let i = 0; i < n; i++) {
        const x = Math.random() * view.w, y = Math.random() * view.h, l = 40 + Math.random() * 120 * (this.warp + 0.3);
        ctx.strokeStyle = superOn ? `hsla(${(this.t * 300 + i * 40) % 360},100%,70%,0.35)` : 'rgba(200,230,255,0.4)';
        ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + l); ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.drawImage(this.vig.c, 0, 0, view.w, view.h);
  }
}
