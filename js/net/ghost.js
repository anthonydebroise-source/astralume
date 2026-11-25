// Multijoueur, partie 1 : rivaux affichés en jeu (fantôme d'un duel ou pilotes en direct)
// + enregistrement de la trajectoire et codage compact d'un défi à partager par lien.
import { ctx, view, baseT, setT } from '../engine/renderer.js';
import { TAU } from '../engine/math.js';
import { drawHypercar } from '../game/hypercar.js';
import { SHIP_SCALE } from '../game/shipart.js';

export const STEP = 0.25; // une position tous les quarts de seconde (temps du déroulé du niveau)
const RIVAL_COLORS = ['#ff4fd8', '#ffd23f', '#7dff9a', '#38f2ff'];

// ---------- Enregistrement ----------
export class Recorder {
  constructor() { this.xy = []; this.sc = []; this.next = 0; }
  tick(g) {
    while (g.dirT >= this.next) {
      const p = g.player, alive = p.alive && g.state !== 'dying' && g.state !== 'dead';
      this.xy.push(alive ? Math.max(0, Math.min(254, Math.round((p.x / view.w) * 254))) : 255, Math.max(0, Math.min(255, Math.round((p.y / view.h) * 255))));
      if ((this.xy.length / 2 - 1) % 4 === 0) this.sc.push(Math.round((g.stats.score || 0) / 10));
      this.next += STEP;
    }
  }
}

// ---------- Codage d'un défi (texte court, sûr dans une URL) ----------
const b64u = (bytes) => { let s = ''; for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const unb64u = (str) => { const s = atob(str.replace(/-/g, '+').replace(/_/g, '/')); const out = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i); return out; };
function varints(arr) { const out = []; for (let v of arr) { v = v >>> 0; while (v > 127) { out.push((v & 127) | 128); v >>>= 7; } out.push(v); } return out; }
function unvarints(bytes) { const out = []; let v = 0, sh = 0; for (const b of bytes) { v |= (b & 127) << sh; if (b & 128) sh += 7; else { out.push(v >>> 0); v = 0; sh = 0; } } return out; }
async function zip(bytes, inflate) {
  const CS = inflate ? globalThis.DecompressionStream : globalThis.CompressionStream;
  if (!CS) return null;
  try { const s = new Blob([bytes]).stream().pipeThrough(new CS('deflate-raw')); return new Uint8Array(await new Response(s).arrayBuffer()); } catch (e) { return null; }
}
export async function encodeDuel(o) {
  const head = new TextEncoder().encode(JSON.stringify({ v: 1, s: o.seed >>> 0, n: String(o.name || 'Pilote').slice(0, 16), sh: o.ship, sc: Math.round(o.score), w: o.win ? 1 : 0 }));
  // positions en écarts successifs (très compressibles), puis scores en entiers variables
  const xy = o.xy, d = new Uint8Array(xy.length);
  for (let i = 0; i < xy.length; i++) d[i] = (xy[i] - (i >= 2 ? xy[i - 2] : 0)) & 255;
  const sc = []; for (let i = 0; i < o.sc.length; i++) sc.push(Math.max(0, o.sc[i] - (i ? o.sc[i - 1] : 0)));
  const scB = varints(sc);
  const body = new Uint8Array(4 + head.length + 4 + d.length + scB.length);
  const dv = new DataView(body.buffer);
  dv.setUint32(0, head.length); body.set(head, 4);
  dv.setUint32(4 + head.length, d.length); body.set(d, 8 + head.length); body.set(scB, 8 + head.length + d.length);
  const z = await zip(body, false);
  return z && z.length < body.length ? 'z' + b64u(z) : 'r' + b64u(body);
}
export async function decodeDuel(code) {
  try {
    code = String(code || '').trim().replace(/^.*#duel=/, '').replace(/\s+/g, '');
    let body = unb64u(code.slice(1));
    if (code[0] === 'z') body = await zip(body, true);
    else if (code[0] !== 'r') return null;
    if (!body) return null;
    const dv = new DataView(body.buffer, body.byteOffset, body.byteLength);
    const hl = dv.getUint32(0), head = JSON.parse(new TextDecoder().decode(body.subarray(4, 4 + hl)));
    if (head.v !== 1) return null;
    const dl = dv.getUint32(4 + hl), d = body.subarray(8 + hl, 8 + hl + dl);
    const xy = new Uint8Array(dl); for (let i = 0; i < dl; i++) xy[i] = (d[i] + (i >= 2 ? xy[i - 2] : 0)) & 255;
    const sd = unvarints(body.subarray(8 + hl + dl)), sc = []; let acc = 0; for (const v of sd) { acc += v; sc.push(acc); }
    return { seed: head.s >>> 0, name: head.n, ship: head.sh, score: head.sc, win: !!head.w, xy, sc };
  } catch (e) { return null; }
}
export function duelLink(code) { return location.origin + location.pathname + '#duel=' + code; }

// ---------- Rivaux en jeu ----------
// Un rival = { name, ship, color, x, y, score, alive, done, src: 'ghost' | 'live', bank }
export class GhostTrack {
  constructor(d) { this.d = d; this.n = d.xy.length / 2; }
  sample(t, out) {
    const f = t / STEP, i = Math.min(this.n - 1, Math.floor(f)), j = Math.min(this.n - 1, i + 1), u = Math.min(1, f - i);
    const xy = this.d.xy, xi = xy[i * 2], xj = xy[j * 2];
    out.alive = xi !== 255 && i < this.n - 1;
    out.done = f >= this.n - 1;
    if (xi !== 255) {
      const x1 = xj === 255 ? xi : xj, nx = ((xi + (x1 - xi) * u) / 254) * view.w, ny = ((xy[i * 2 + 1] + ((xj === 255 ? xy[i * 2 + 1] : xy[j * 2 + 1]) - xy[i * 2 + 1]) * u) / 255) * view.h;
      out.bank = out.x !== undefined ? Math.max(-1, Math.min(1, (nx - out.x) * 0.25)) : 0;
      out.x = nx; out.y = ny;
    }
    const sc = this.d.sc, k = f / 4, a = Math.min(sc.length - 1, Math.floor(k)), b = Math.min(sc.length - 1, a + 1);
    out.score = out.done ? this.d.score : sc.length ? Math.round((sc[a] + (sc[b] - sc[a]) * Math.min(1, k - a)) * 10) : 0;
  }
}
export class Versus {
  constructor(o = {}) {
    this.rivals = [];
    this.rec = o.record ? new Recorder() : null;
    this.live = o.live || null;
    if (o.ghost) { this.track = new GhostTrack(o.ghost); this.rivals.push({ name: o.ghost.name, ship: o.ghost.ship, color: RIVAL_COLORS[0], src: 'ghost', score: 0, alive: true }); }
    this.sendT = 0;
  }
  update(g, dt) {
    if (this.rec && g.state === 'play') this.rec.tick(g);
    if (this.track) this.track.sample(g.dirT, this.rivals[0]);
    if (this.live) {
      this.sendT -= dt;
      if (this.sendT <= 0) { this.sendT = 0.12; this.live.sendState(g); }
      this.rivals = this.live.rivals(RIVAL_COLORS);
    }
  }
  draw(g) {
    const t = g.t;
    for (const r of this.rivals) {
      if (!r.alive || r.x === undefined) continue;
      setT(r.x, r.y, SHIP_SCALE * 0.92);
      ctx.globalAlpha = 0.4;
      drawHypercar(ctx, r.ship || 'etincelle', t, r.bank || 0, { tier: 0 });
      ctx.globalAlpha = 1;
      baseT();
      ctx.font = '800 10px "Avenir Next Condensed",system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,10,0.8)'; ctx.strokeText(r.name, r.x, r.y - 32); ctx.fillStyle = r.color; ctx.fillText(r.name, r.x, r.y - 32);
      ctx.strokeStyle = r.color; ctx.globalAlpha = 0.5; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(r.x, r.y, 26, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
    }
  }
  // Tableau des scores (en haut à droite, sous les monnaies)
  drawHud(g) {
    if (!this.rivals.length) return;
    baseT();
    const me = Math.round(g.stats.score || 0);
    const rows = [{ name: 'TOI', score: me, color: '#ffffff', me: true }, ...this.rivals.map((r) => ({ name: r.name, score: r.score || 0, color: r.color, out: !r.alive && !r.done }))].sort((a, b) => b.score - a.score);
    const x = view.w - 8, y0 = view.safeT + 92;
    ctx.textBaseline = 'middle';
    rows.forEach((r, i) => {
      const y = y0 + i * 17;
      ctx.globalAlpha = 0.55; ctx.fillStyle = r.me ? 'rgba(56,242,255,0.25)' : 'rgba(0,0,12,0.55)'; ctx.fillRect(x - 118, y - 8, 118, 16); ctx.globalAlpha = 1;
      ctx.font = '900 10px "Avenir Next Condensed",system-ui,sans-serif';
      ctx.textAlign = 'left'; ctx.fillStyle = r.color; ctx.fillText((i + 1) + '. ' + r.name.slice(0, 10) + (r.out ? ' ✖' : ''), x - 114, y);
      ctx.textAlign = 'right'; ctx.fillStyle = '#ffffff'; ctx.fillText(String(r.score).padStart(7, '0'), x - 4, y);
    });
  }
}
