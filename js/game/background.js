// Arrière-plans animés en parallaxe : espace (nébuleuses, étoiles, décors latéraux) et survols de planètes
import { RNG, TAU, rgba, lighten, darken, mixHex, hash32 } from '../engine/math.js';
import { view, ctx, baseT } from '../engine/renderer.js';
import { makeCanvas, glow } from '../engine/sprites.js';

const GROUND_FOR_SPACE = { nebula: 'rock', amber: 'rock', reef: 'coral', hive: 'flesh', quantum: 'grid', heart: 'flesh' };
const SIDE_FOR = { nebula: 'gas', amber: 'rocks', reef: 'coral', hive: 'flesh', quantum: 'glitch', heart: 'flesh', coral: 'coral', swamp: 'gas', glacier: 'rocks', volcano: 'rocks', dunes: 'rocks', spores: 'gas' };
const CH = 640;

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
    for (let i = 0; i < 4; i++) radial(b.g, rng.range(0, view.w), rng.range(0, view.h), rng.range(150, 300), i % 2 ? P.bg2 : P.neb1, 0.25);
    this.base = b;
    // Nébuleuse
    const NH = 1200;
    const n = mk(view.w, NH, 0.28);
    n.g.globalCompositeOperation = 'lighter';
    const cols = [P.neb1, P.neb2, P.neb1, P.neb2, P.neb3];
    const blobs = this.planet ? 8 : 26;
    for (let i = 0; i < blobs; i++) {
      const x = rng.range(-40, view.w + 40), y = rng.range(0, NH), r = rng.range(60, 230), c = rng.pick(cols), a = rng.range(0.06, this.planet ? 0.1 : 0.22);
      for (const oy of [0, -NH, NH]) if (y + oy + r > 0 && y + oy - r < NH) radial(n.g, x, y + oy, r, c, a);
    }
    n.g.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 8; i++) {
      const x = rng.range(0, view.w), y = rng.range(0, NH);
      for (const oy of [0, -NH, NH]) { n.g.fillStyle = rgba(P.bg0, 0.25); n.g.beginPath(); n.g.ellipse(x, y + oy, rng.range(60, 160), rng.range(10, 30), rng.range(-1, 1), 0, TAU); n.g.fill(); }
    }
    this.neb = n; this.NH = NH;
    // Étoiles (3 couches)
    this.stars = [];
    const SH = 900;
    const defs = [{ n: 150, s: [0.4, 0.9], a: [0.3, 0.7], v: 12, res: 0.6 }, { n: 60, s: [0.8, 1.4], a: [0.5, 0.9], v: 32, res: 0.8 }, { n: 22, s: [1.2, 2], a: [0.8, 1], v: 80, res: 1 }];
    for (const d of defs) {
      const L = mk(view.w, SH, d.res);
      for (let i = 0; i < (this.planet ? d.n * 0.3 : d.n); i++) {
        const x = rng.range(0, view.w), y = rng.range(0, SH), s = rng.range(d.s[0], d.s[1]);
        const c = rng.chance(0.2) ? lighten(P.neb2, 0.5) : rng.chance(0.2) ? lighten(P.neb1, 0.6) : '#ffffff';
        L.g.fillStyle = rgba(c, rng.range(d.a[0], d.a[1]));
        L.g.beginPath(); L.g.arc(x, y, s, 0, TAU); L.g.fill();
        if (d.v > 50) { L.g.strokeStyle = rgba(c, 0.35); L.g.lineWidth = 0.6; L.g.beginPath(); L.g.moveTo(x - s * 3, y); L.g.lineTo(x + s * 3, y); L.g.moveTo(x, y - s * 3); L.g.lineTo(x, y + s * 3); L.g.stroke(); }
      }
      this.stars.push({ L, v: d.v, h: SH, off: rng.range(0, SH) });
    }
    this.twinkles = [];
    for (let i = 0; i < 18; i++) this.twinkles.push({ x: rng.range(0, view.w), y: rng.range(0, view.h), p: rng.range(0, TAU), s: rng.range(4, 9), c: rng.pick(['#ffffff', P.neb2, P.deco2]) });
    // Décor latéral
    this.sideKind = SIDE_FOR[this.th.id] || 'gas';
    this.side = this.buildSide(rng);
    this.sideOff = 0;
    // Objet lointain
    this.far = this.buildFar(rng);
    // Sol
    this.chunks = new Map();
    if (this.planet) {
      this.clouds = [];
      this.cloudSpr = [0, 1, 2].map((k) => this.buildCloud(new RNG(this.seed + k * 77)));
      for (let i = 0; i < 5; i++) this.clouds.push({ x: rng.range(-40, view.w + 40), y: rng.range(-100, view.h), k: i % 3, s: rng.range(0.8, 1.4) });
    }
    // Premier plan (profondeur) : silhouettes proches qui défilent vite sur les côtés
    this.fgSpr = [0, 1, 2].map((k) => this.buildFg(new RNG(this.seed * 7 + k)));
    this.fg = [];
    for (let i = 0; i < 3; i++) this.fg.push(this.newFg(rng, rng.range(-view.h, view.h)));
    // Vignette
    const v = mk(view.w, view.h, 0.15);
    const vg = v.g.createRadialGradient(view.w / 2, view.h * 0.5, view.h * 0.25, view.w / 2, view.h * 0.5, view.h * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)');
    v.g.fillStyle = vg; v.g.fillRect(0, 0, view.w, view.h);
    this.vig = v;
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
    const kind = this.planet ? 'none' : rng.pick(['planet', 'planet', 'galaxy', 'planet', 'moons']);
    if (kind === 'none') return null;
    const R = kind === 'galaxy' ? 110 : rng.range(40, 85);
    const S = mk(R * 3, R * 3, 0.4);
    const g = S.g, c = R * 1.5;
    if (kind === 'galaxy') {
      g.globalCompositeOperation = 'lighter';
      radial(g, c, c, R * 0.5, '#ffffff', 0.35);
      for (let i = 0; i < 400; i++) { const arm = i % 2, d = Math.pow(rng.next(), 0.7) * R, a = d * 0.045 + arm * Math.PI + rng.range(-0.35, 0.35); g.fillStyle = rgba(rng.pick([P.neb2, '#ffffff', P.neb1]), rng.range(0.2, 0.7)); g.beginPath(); g.arc(c + Math.cos(a) * d, c + Math.sin(a) * d * 0.45, rng.range(0.6, 1.6), 0, TAU); g.fill(); }
    } else if (kind === 'moons') {
      for (let i = 0; i < 3; i++) { const r = R * (0.25 + i * 0.12), x = c + (i - 1) * R * 0.8, y = c + Math.sin(i * 2) * R * 0.4; const gr = g.createRadialGradient(x - r * 0.4, y - r * 0.4, 0, x, y, r); gr.addColorStop(0, lighten(P.neb2, 0.4)); gr.addColorStop(1, darken(P.neb1, 0.7)); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
    } else {
      radial(g, c, c, R * 1.4, P.neb2, 0.3);
      const gr = g.createRadialGradient(c - R * 0.4, c - R * 0.4, R * 0.1, c, c, R);
      gr.addColorStop(0, lighten(P.deco2, 0.3)); gr.addColorStop(0.6, darken(P.deco2, 0.3)); gr.addColorStop(1, darken(P.bg1, 0.4));
      g.fillStyle = gr; g.beginPath(); g.arc(c, c, R, 0, TAU); g.fill();
      g.save(); g.beginPath(); g.arc(c, c, R, 0, TAU); g.clip();
      for (let i = 0; i < 7; i++) { g.fillStyle = rgba(i % 2 ? lighten(P.deco2, 0.2) : darken(P.deco2, 0.4), 0.3); g.fillRect(c - R, c - R + i * R * 0.3 + rng.range(-5, 5), R * 2, R * rng.range(0.08, 0.18)); }
      const sh = g.createLinearGradient(c - R, c - R, c + R, c + R); sh.addColorStop(0.45, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.75)');
      g.fillStyle = sh; g.fillRect(c - R, c - R, R * 2, R * 2);
      g.restore();
      if (rng.chance(0.55)) { g.strokeStyle = rgba(lighten(P.deco, 0.3), 0.6); g.lineWidth = R * 0.08; g.beginPath(); g.ellipse(c, c, R * 1.45, R * 0.32, -0.35, 0, TAU); g.stroke(); }
    }
    return { S, x: rng.range(R * 0.5, view.w - R * 0.5), y: rng.range(view.h * 0.1, view.h * 0.5), R: R * 1.5, v: rng.range(3, 7) };
  }
  buildFg(rng) {
    const P = this.pal, R = 70;
    const S = mk(R * 2, R * 2, 0.3);
    const g = S.g;
    if (this.planet) {
      for (let i = 0; i < 7; i++) radial(g, rng.range(30, 110), rng.range(30, 110), rng.range(25, 45), '#ffffff', 0.35);
      return S;
    }
    const n = 9, pts = [];
    for (let i = 0; i < n; i++) pts.push(rng.range(0.6, 1));
    g.beginPath();
    for (let i = 0; i < n; i++) { const a = (i / n) * TAU; g.lineTo(R + Math.cos(a) * R * 0.9 * pts[i], R + Math.sin(a) * R * 0.9 * pts[i]); }
    g.closePath();
    const gr = g.createRadialGradient(R * 0.6, R * 0.5, R * 0.1, R, R, R);
    gr.addColorStop(0, darken(P.bg2, 0.2)); gr.addColorStop(1, darken(P.bg0, 0.5));
    g.fillStyle = gr; g.fill();
    g.strokeStyle = rgba(lighten(P.neb2, 0.3), 0.55); g.lineWidth = 3; g.stroke();
    return S;
  }
  newFg(rng, y) {
    const left = Math.random() < 0.5;
    return { x: left ? Math.random() * 40 - 70 : view.w + 30 + Math.random() * 40, y, s: 0.9 + Math.random() * 0.9, k: Math.floor(Math.random() * 3), rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.6 };
  }
  buildCloud(rng) {
    const S = mk(180, 120, 0.25);
    for (let i = 0; i < 9; i++) radial(S.g, rng.range(40, 140), rng.range(35, 85), rng.range(25, 50), '#ffffff', 0.5);
    return S;
  }

  // ---------- Sol ----------
  riverX(Y) { const s = this.seed % 1000; return view.w / 2 + Math.sin(Y * 0.0034 + s) * 120 + Math.sin(Y * 0.0093 + s * 2) * 38; }
  riverW(Y) { return 26 + 12 * Math.sin(Y * 0.011 + 1); }
  cliff(Y, side) { const s = (this.seed % 97) + side * 13; return 22 + 14 * Math.sin(Y * 0.0105 + s) + 7 * Math.sin(Y * 0.031 + s * 3); }
  chunk(k) {
    let ch = this.chunks.get(k);
    if (ch) return ch;
    const S = mk(view.w, CH, 0.45);
    const g = S.g, P = this.pal, kind = this.groundKind;
    const Y0 = k * CH; // y global au bas du morceau
    const toY = (y) => Y0 + CH - y; // local -> global
    const lights = [];
    // Base
    // dégradé uniquement horizontal : aucune couture entre deux morceaux de terrain
    const gr = g.createLinearGradient(0, 0, view.w, 0);
    const base = kind === 'ice' ? mixHex(P.g1, '#a8c8e8', 0.25) : kind === 'dunes' ? mixHex(P.g1, '#8a6a3a', 0.35) : kind === 'rock' ? mixHex(P.g1, P.g2, 0.3) : P.g0;
    gr.addColorStop(0, darken(base, 0.3)); gr.addColorStop(0.5, base); gr.addColorStop(1, darken(base, 0.3));
    g.fillStyle = gr; g.fillRect(0, 0, view.w, CH);
    // Détails par morceau (et voisins pour la continuité)
    for (let kk = k - 1; kk <= k + 1; kk++) {
      const r = new RNG(hash32(this.seed, kk, 991));
      const oy = (k - kk) * CH; // décalage local
      this.paintFeatures(g, r, oy, kind, P, kk === k ? lights : null);
    }
    // Rivière / fissure lumineuse
    if (kind !== 'grid') {
      g.beginPath();
      for (let y = -10; y <= CH + 10; y += 16) { const Y = toY(y); g.lineTo(this.riverX(Y) - this.riverW(Y), y); }
      for (let y = CH + 10; y >= -10; y -= 16) { const Y = toY(y); g.lineTo(this.riverX(Y) + this.riverW(Y), y); }
      g.closePath();
      const liq = kind === 'lava' ? '#ff6a1f' : P.liquid;
      g.fillStyle = kind === 'lava' ? darken(liq, 0.1) : darken(liq, 0.72); g.fill();
      g.globalCompositeOperation = 'lighter';
      g.strokeStyle = rgba(liq, kind === 'lava' ? 0.9 : 0.55); g.lineWidth = kind === 'lava' ? 4 : 2.5; g.stroke();
      g.strokeStyle = rgba(liq, 0.15); g.lineWidth = 12; g.stroke();
      g.globalCompositeOperation = 'source-over';
      for (let y = 40; y < CH; y += 140) lights.push({ x: this.riverX(toY(y)), y, r: 40, c: liq });
    }
    // Falaises latérales
    for (const side of [0, 1]) {
      g.beginPath();
      const x0 = side ? view.w + 5 : -5;
      g.moveTo(x0, -10);
      for (let y = -10; y <= CH + 10; y += 12) { const w = this.cliff(toY(y), side); g.lineTo(side ? view.w - w : w, y); }
      g.lineTo(x0, CH + 10); g.closePath();
      g.fillStyle = darken(P.g3 || P.g0, 0.2); g.fill();
      g.strokeStyle = rgba(lighten(P.g2, 0.2), 0.9); g.lineWidth = 2; g.stroke();
    }
    ch = { S, lights };
    this.chunks.set(k, ch);
    return ch;
  }
  paintFeatures(g, r, oy, kind, P, lights) {
    const W = view.w;
    const L = (x, y, rad, c) => { if (lights && y > 0 && y < CH) lights.push({ x, y, r: rad, c }); };
    switch (kind) {
      case 'coral': {
        for (let i = 0; i < 26; i++) { g.strokeStyle = rgba(lighten(P.g1, 0.25), 0.35); g.lineWidth = 1; const y = r.range(0, CH) + oy, x = r.range(0, W); g.beginPath(); g.moveTo(x - 30, y); g.quadraticCurveTo(x, y - 6, x + 30, y); g.stroke(); }
        const br = (x, y, a, l, w, d, col) => { if (d <= 0) return; const x2 = x + Math.cos(a) * l, y2 = y + Math.sin(a) * l; g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke(); br(x2, y2, a - r.range(0.3, 0.7), l * 0.72, w * 0.7, d - 1, col); br(x2, y2, a + r.range(0.3, 0.7), l * 0.72, w * 0.7, d - 1, col); };
        for (let i = 0; i < 7; i++) { const x = r.range(40, W - 40), y = r.range(0, CH) + oy, col = r.chance(0.5) ? P.deco : P.deco2; br(x, y, r.range(0, TAU), r.range(10, 16), 4, 4, rgba(col, 0.85)); L(x, y, 30, col); }
        for (let i = 0; i < 6; i++) { const x = r.range(30, W - 30), y = r.range(0, CH) + oy, rr = r.range(6, 12), col = P.deco2; g.strokeStyle = rgba(col, 0.8); g.lineWidth = 1.5; for (let j = 0; j < 10; j++) { const a = (j / 10) * TAU; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * rr * 1.6, y + Math.sin(a) * rr * 1.6); g.stroke(); } g.fillStyle = lighten(col, 0.4); g.beginPath(); g.arc(x, y, rr * 0.5, 0, TAU); g.fill(); }
        break;
      }
      case 'swamp': {
        for (let i = 0; i < 6; i++) { const x = r.range(40, W - 40), y = r.range(0, CH) + oy; g.fillStyle = rgba(darken(P.liquid, 0.75), 0.9); g.beginPath(); g.ellipse(x, y, r.range(30, 60), r.range(18, 34), r.range(0, 3), 0, TAU); g.fill(); g.strokeStyle = rgba(P.liquid, 0.5); g.lineWidth = 1.5; g.stroke(); L(x, y, 36, P.liquid); }
        for (let i = 0; i < 14; i++) { const x = r.range(30, W - 30), y = r.range(0, CH) + oy, rr = r.range(5, 11); g.fillStyle = rgba(lighten(P.g2, 0.15), 0.9); g.beginPath(); g.arc(x, y, rr, 0.4, TAU - 0.1); g.lineTo(x, y); g.fill(); }
        g.strokeStyle = rgba(lighten(P.g2, 0.3), 0.6); g.lineWidth = 1.2;
        for (let i = 0; i < 10; i++) { const x = r.range(30, W - 30), y = r.range(0, CH) + oy; for (let j = 0; j < 5; j++) { g.beginPath(); g.moveTo(x + j * 3, y); g.lineTo(x + j * 3 + r.range(-6, 6), y - r.range(8, 18)); g.stroke(); } }
        g.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 30; i++) { g.fillStyle = rgba(P.deco, r.range(0.3, 0.8)); g.beginPath(); g.arc(r.range(0, W), r.range(0, CH) + oy, r.range(0.8, 2), 0, TAU); g.fill(); }
        g.globalCompositeOperation = 'source-over';
        break;
      }
      case 'ice': {
        for (let i = 0; i < 18; i++) {
          const x = r.range(0, W), y = r.range(0, CH) + oy, rr = r.range(25, 60), n = r.int(5, 7);
          g.beginPath(); for (let j = 0; j < n; j++) { const a = (j / n) * TAU + r.range(-0.2, 0.2); g.lineTo(x + Math.cos(a) * rr * r.range(0.7, 1), y + Math.sin(a) * rr * r.range(0.7, 1)); } g.closePath();
          g.fillStyle = rgba(lighten(P.g1, r.range(0.1, 0.35)), 0.55); g.fill(); g.strokeStyle = rgba('#e8f8ff', 0.45); g.lineWidth = 1; g.stroke();
        }
        g.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 5; i++) { let x = r.range(40, W - 40), y = r.range(0, CH) + oy; g.strokeStyle = rgba(P.deco, 0.7); g.lineWidth = 1.6; g.beginPath(); g.moveTo(x, y); for (let j = 0; j < 6; j++) { x += r.range(-22, 22); y += r.range(-26, 26); g.lineTo(x, y); } g.stroke(); L(x, y, 26, P.deco); }
        g.globalCompositeOperation = 'source-over';
        for (let i = 0; i < 10; i++) radial(g, r.range(0, W), r.range(0, CH) + oy, r.range(20, 50), '#ffffff', 0.12);
        break;
      }
      case 'lava': {
        for (let i = 0; i < 20; i++) { const x = r.range(0, W), y = r.range(0, CH) + oy; g.fillStyle = rgba(darken(P.g0, 0.4), 0.8); g.beginPath(); g.ellipse(x, y, r.range(10, 34), r.range(8, 22), r.range(0, 3), 0, TAU); g.fill(); }
        g.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 9; i++) { let x = r.range(30, W - 30), y = r.range(0, CH) + oy; g.strokeStyle = rgba('#ff7a2a', 0.75); g.lineWidth = r.range(1, 2.4); g.beginPath(); g.moveTo(x, y); for (let j = 0; j < 5; j++) { x += r.range(-20, 20); y += r.range(-20, 20); g.lineTo(x, y); } g.stroke(); }
        for (let i = 0; i < 4; i++) { const x = r.range(40, W - 40), y = r.range(0, CH) + oy; radial(g, x, y, 26, '#ff8a2a', 0.6); L(x, y, 30, '#ff7a2a'); }
        g.globalCompositeOperation = 'source-over';
        for (let i = 0; i < 4; i++) { const x = r.range(40, W - 40), y = r.range(0, CH) + oy; g.fillStyle = '#1a0806'; g.beginPath(); g.arc(x, y, 8, 0, TAU); g.fill(); g.strokeStyle = '#ffb060'; g.lineWidth = 2; g.stroke(); }
        break;
      }
      case 'dunes': {
        for (let i = 0; i < 9; i++) {
          const y = r.range(0, CH) + oy, amp = r.range(10, 26), ph = r.range(0, TAU);
          g.beginPath(); g.moveTo(0, y);
          for (let x = 0; x <= W; x += 20) g.lineTo(x, y + Math.sin(x * 0.02 + ph) * amp);
          g.lineTo(W, y + 40); g.lineTo(0, y + 40); g.closePath();
          const gr = g.createLinearGradient(0, y - amp, 0, y + 40); gr.addColorStop(0, rgba(lighten(P.g1, 0.35), 0.6)); gr.addColorStop(1, rgba(darken(P.g1, 0.3), 0));
          g.fillStyle = gr; g.fill();
        }
        g.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 14; i++) { const x = r.range(0, W), y = r.range(0, CH) + oy; g.fillStyle = rgba(P.deco, 0.8); g.beginPath(); g.moveTo(x, y - 4); g.lineTo(x + 2, y); g.lineTo(x, y + 4); g.lineTo(x - 2, y); g.fill(); if (i % 4 === 0) L(x, y, 14, P.deco); }
        g.globalCompositeOperation = 'source-over';
        g.strokeStyle = rgba(lighten(P.g2, 0.3), 0.5); g.lineWidth = 2;
        for (let i = 0; i < 2; i++) { const x = r.range(50, W - 90), y = r.range(0, CH) + oy; g.strokeRect(x, y, r.range(30, 60), r.range(20, 40)); g.strokeRect(x + 8, y + 8, 12, 12); }
        break;
      }
      case 'mushroom': {
        for (let i = 0; i < 10; i++) { const x = r.range(0, W), y = r.range(0, CH) + oy; g.strokeStyle = rgba(lighten(P.g2, 0.1), 0.5); g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + 20, y + 30, x - 20, y + 50, x + r.range(-40, 40), y + 80); g.stroke(); }
        for (let i = 0; i < 9; i++) {
          const x = r.range(30, W - 30), y = r.range(0, CH) + oy, rr = r.range(12, 30), col = r.chance(0.5) ? P.deco : P.deco2;
          const gr = g.createRadialGradient(x - rr * 0.3, y - rr * 0.3, 0, x, y, rr); gr.addColorStop(0, lighten(col, 0.3)); gr.addColorStop(1, darken(col, 0.5));
          g.fillStyle = gr; g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill();
          g.fillStyle = rgba('#ffffff', 0.7); for (let j = 0; j < 5; j++) { g.beginPath(); g.arc(x + r.range(-rr, rr) * 0.6, y + r.range(-rr, rr) * 0.6, r.range(1.5, 3.5), 0, TAU); g.fill(); }
          L(x, y, rr * 1.6, col);
        }
        g.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 40; i++) { g.fillStyle = rgba(P.deco2, r.range(0.3, 0.8)); g.beginPath(); g.arc(r.range(0, W), r.range(0, CH) + oy, r.range(0.6, 1.8), 0, TAU); g.fill(); }
        g.globalCompositeOperation = 'source-over';
        break;
      }
      case 'flesh': {
        g.strokeStyle = rgba(P.neb2, 0.45); g.lineWidth = 2.5;
        for (let i = 0; i < 9; i++) { let x = r.range(0, W), y = r.range(0, CH) + oy; g.beginPath(); g.moveTo(x, y); for (let j = 0; j < 4; j++) { const x2 = x + r.range(-50, 50), y2 = y + r.range(-50, 50); g.quadraticCurveTo((x + x2) / 2 + r.range(-20, 20), (y + y2) / 2, x2, y2); x = x2; y = y2; } g.stroke(); }
        for (let i = 0; i < 10; i++) { const x = r.range(30, W - 30), y = r.range(0, CH) + oy, rr = r.range(6, 16); g.fillStyle = rgba(darken(P.neb1, 0.3), 0.9); g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill(); g.fillStyle = rgba(P.deco2, 0.9); g.beginPath(); g.arc(x, y, rr * 0.35, 0, TAU); g.fill(); L(x, y, rr * 2, P.deco2); }
        break;
      }
      case 'grid': {
        g.strokeStyle = rgba(P.deco, 0.25); g.lineWidth = 1;
        for (let x = 0; x <= W; x += 40) { g.beginPath(); g.moveTo(x, oy); g.lineTo(x, CH + oy); g.stroke(); }
        for (let y = 0; y <= CH; y += 40) { g.beginPath(); g.moveTo(0, y + oy); g.lineTo(W, y + oy); g.stroke(); }
        for (let i = 0; i < 12; i++) { const x = Math.floor(r.range(0, 10)) * 40, y = Math.floor(r.range(0, 16)) * 40 + oy; g.fillStyle = rgba(r.pick([P.deco, P.deco2]), r.range(0.15, 0.45)); g.fillRect(x, y, 40, 40); if (i % 3 === 0) L(x + 20, y + 20, 30, P.deco); }
        break;
      }
      default: {
        // plaques rocheuses
        for (let i = 0; i < 10; i++) {
          const x = r.range(0, W), y = r.range(0, CH) + oy, rr = r.range(30, 70), n = r.int(6, 8);
          g.beginPath(); for (let j = 0; j < n; j++) { const a = (j / n) * TAU; g.lineTo(x + Math.cos(a) * rr * r.range(0.7, 1), y + Math.sin(a) * rr * r.range(0.6, 0.9)); } g.closePath();
          g.fillStyle = rgba(lighten(P.g1, r.range(0, 0.18)), 0.55); g.fill(); g.strokeStyle = rgba(lighten(P.g2, 0.3), 0.35); g.lineWidth = 1; g.stroke();
        }
        // cratères en relief (bord éclairé en haut à gauche, ombre en bas à droite)
        for (let i = 0; i < 12; i++) {
          const x = r.range(0, W), y = r.range(0, CH) + oy, rr = r.range(8, 34);
          const gr = g.createRadialGradient(x + rr * 0.25, y + rr * 0.25, rr * 0.1, x, y, rr);
          gr.addColorStop(0, rgba(darken(P.g0, 0.7), 0.95)); gr.addColorStop(0.8, rgba(darken(P.g0, 0.4), 0.8)); gr.addColorStop(1, rgba(P.g0, 0));
          g.fillStyle = gr; g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill();
          g.strokeStyle = rgba(lighten(P.g2, 0.45), 0.6); g.lineWidth = 1.6; g.beginPath(); g.arc(x, y, rr * 0.92, Math.PI * 0.85, Math.PI * 1.75); g.stroke();
          g.strokeStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.arc(x, y, rr * 0.92, Math.PI * 1.85, Math.PI * 2.7); g.stroke();
        }
        // veines minérales lumineuses et éclats de cristal
        g.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 4; i++) { let x = r.range(20, W - 20), y = r.range(0, CH) + oy; g.strokeStyle = rgba(P.deco, 0.5); g.lineWidth = 1.4; g.beginPath(); g.moveTo(x, y); for (let j = 0; j < 7; j++) { x += r.range(-18, 18); y += r.range(-18, 18); g.lineTo(x, y); } g.stroke(); }
        for (let i = 0; i < 8; i++) {
          const x = r.range(0, W), y = r.range(0, CH) + oy, h = r.range(5, 11);
          g.fillStyle = rgba(r.chance(0.5) ? P.deco : P.deco2, 0.85);
          g.beginPath(); g.moveTo(x, y - h); g.lineTo(x + h * 0.35, y); g.lineTo(x, y + h * 0.4); g.lineTo(x - h * 0.35, y); g.closePath(); g.fill();
          L(x, y, 18, P.deco);
        }
        g.globalCompositeOperation = 'source-over';
      }
    }
  }

  update(dt, speed = 1) {
    if (this.rs !== view.rs || this.vh !== view.h) { this.chunks.clear(); this.build(); }
    this.t += dt;
    this.beat = Math.max(0, this.beat - dt * 3);
    const sp = speed * (1 + this.warp * 6);
    this.scroll += dt * 42 * sp;
    for (const s of this.stars) s.off = (s.off + dt * s.v * sp) % s.h;
    this.sideOff = (this.sideOff + dt * 70 * sp) % this.side.H;
    this.nebOff = ((this.nebOff || 0) + dt * 7 * sp) % this.NH;
    if (this.far) { this.far.y += dt * this.far.v * sp; if (this.far.y - this.far.R > view.h) { this.far.y = -this.far.R; this.far.x = Math.random() * view.w; } }
    if (this.fg) for (let i = 0; i < this.fg.length; i++) { const f = this.fg[i]; f.y += dt * 190 * sp * f.s; f.rot += f.vr * dt; if (f.y > view.h + 160) this.fg[i] = this.newFg(null, -160 - Math.random() * 400); }
    if (this.clouds) for (const c of this.clouds) { c.y += dt * 62 * sp * c.s; if (c.y > view.h + 80) { c.y = -140; c.x = Math.random() * (view.w + 80) - 40; } }
  }
  drawTile(L, off, H, x = 0, w = view.w, alpha = 1) {
    // dessine une texture verticale répétée qui défile vers le bas
    ctx.globalAlpha = alpha;
    let y = off - H;
    while (y < view.h) { ctx.drawImage(L.c, x, y, w, H); y += H; }
    ctx.globalAlpha = 1;
  }
  draw() {
    baseT();
    ctx.drawImage(this.base.c, 0, 0, view.w, view.h);
    if (!this.planet) {
      ctx.globalCompositeOperation = 'lighter';
      this.drawTile(this.neb, this.nebOff || 0, this.NH, 0, view.w, 0.85 + this.beat * 0.25);
      ctx.globalCompositeOperation = 'source-over';
      for (let i = 0; i < 2; i++) this.drawTile(this.stars[i].L, this.stars[i].off, this.stars[i].h);
      if (this.far) { ctx.globalAlpha = 0.6; ctx.drawImage(this.far.S.c, this.far.x - this.far.R, this.far.y - this.far.R, this.far.R * 2, this.far.R * 2); ctx.globalAlpha = 1; }
      this.drawTile(this.stars[2].L, this.stars[2].off, this.stars[2].h);
      this.drawTwinkles();
      this.drawSides();
    } else {
      const k0 = Math.floor(this.scroll / CH), k1 = Math.floor((view.h + this.scroll) / CH);
      for (let k = k0; k <= k1; k++) {
        const ch = this.chunk(k);
        const y = view.h - (k + 1) * CH + this.scroll;
        ctx.drawImage(ch.S.c, 0, y, view.w, CH);
      }
      for (const k of this.chunks.keys()) if (k < k0 - 1) this.chunks.delete(k);
      // Lumières pulsantes du sol
      ctx.globalCompositeOperation = 'lighter';
      for (let k = k0; k <= k1; k++) {
        const ch = this.chunks.get(k); if (!ch) continue;
        const y0 = view.h - (k + 1) * CH + this.scroll;
        for (const L of ch.lights) {
          const s = glow(L.c, 32);
          const r = L.r * (1 + 0.2 * Math.sin(this.t * 2 + L.x) + this.beat * 0.25);
          ctx.globalAlpha = 0.35 + this.beat * 0.2;
          ctx.drawImage(s.c, L.x - r, y0 + L.y - r, r * 2, r * 2);
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      // Ombres des nuages
      for (const c of this.clouds) { const s = this.cloudSpr[c.k]; ctx.globalAlpha = 0.22; ctx.drawImage(s.c, c.x + 26, c.y + 40, 180 * c.s, 120 * c.s); }
      ctx.globalAlpha = 1;
    }
  }
  drawClouds() {
    if (!this.clouds) return;
    baseT();
    ctx.globalCompositeOperation = 'lighter';
    for (const c of this.clouds) { const s = this.cloudSpr[c.k]; ctx.globalAlpha = 0.16; ctx.drawImage(s.c, c.x, c.y, 180 * c.s, 120 * c.s); }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
  drawTwinkles() {
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
  }
  drawSides() {
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
    if (this.fg && !this.menu) {
      for (const f of this.fg) {
        const S = this.fgSpr[f.k], sz = 140 * f.s;
        ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.rot);
        ctx.globalAlpha = this.planet ? 0.13 : 0.85;
        if (this.planet) ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(S.c, -sz / 2, -sz / 2, sz, sz);
        ctx.restore();
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
      baseT();
    }
    if (this.planet) {
      const gr = ctx.createLinearGradient(0, 0, 0, view.h * 0.3);
      gr.addColorStop(0, rgba(this.pal.deco, 0.16)); gr.addColorStop(1, rgba(this.pal.deco, 0));
      ctx.fillStyle = gr; ctx.fillRect(0, 0, view.w, view.h * 0.3);
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
