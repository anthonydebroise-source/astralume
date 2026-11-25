// Multijoueur, partie 2 : course en direct (2 à 4 pilotes) via un petit serveur relais WebSocket.
// Chaque pilote joue sur sa machine le même secteur (même graine) ; on échange seulement
// positions et scores, 8 fois par seconde. Le serveur est dans /server (à déployer plus tard).
import { view } from '../engine/renderer.js';

export const DEFAULT_RELAY = ''; // URL wss:// du relais une fois déployé (ex. 'wss://astralume-relay.example.org')

export function relayURL(S) {
  try { const q = new URLSearchParams(location.search).get('relay'); if (q) { S.settings.relay = q; } } catch (e) { /* hors navigateur */ }
  return (S.settings && S.settings.relay) || DEFAULT_RELAY;
}

export class LiveLink {
  constructor(url) {
    this.url = url; this.ws = null; this.id = null; this.room = null; this.host = false; this.seed = 0;
    this.peers = new Map(); this.handlers = {}; this.state = 'idle'; this.err = '';
  }
  on(ev, fn) { this.handlers[ev] = fn; return this; }
  emit(ev, a) { if (this.handlers[ev]) this.handlers[ev](a); }
  connect(room, name, ship) {
    return new Promise((res, rej) => {
      let ws;
      try { ws = new WebSocket(this.url); } catch (e) { this.err = 'Adresse du serveur invalide'; rej(e); return; }
      this.ws = ws; this.state = 'connecting';
      const to = setTimeout(() => { if (this.state === 'connecting') { this.err = 'Serveur injoignable'; try { ws.close(); } catch (e) { /* déjà fermé */ } rej(new Error('timeout')); } }, 6000);
      ws.onopen = () => ws.send(JSON.stringify({ t: 'join', room: room || '', name, ship }));
      ws.onerror = () => { this.err = 'Serveur injoignable'; };
      ws.onclose = () => { clearTimeout(to); const was = this.state; this.state = 'closed'; if (was === 'connecting') rej(new Error(this.err || 'fermé')); else this.emit('close'); };
      ws.onmessage = (m) => {
        let d; try { d = JSON.parse(m.data); } catch (e) { return; }
        if (d.t === 'joined') {
          clearTimeout(to); this.state = 'lobby'; this.id = d.id; this.room = d.room; this.host = d.host; this.seed = d.seed;
          for (const p of d.peers) this.peers.set(p.id, { ...p, score: 0, alive: true });
          res(this); this.emit('lobby');
        } else if (d.t === 'error') { this.err = d.msg; clearTimeout(to); this.state = 'closed'; rej(new Error(d.msg)); try { ws.close(); } catch (e) { /* ok */ } }
        else if (d.t === 'peer+') { this.peers.set(d.id, { id: d.id, name: d.name, ship: d.ship, score: 0, alive: true }); this.emit('lobby'); }
        else if (d.t === 'peer-') { const p = this.peers.get(d.id); if (p) { if (this.state === 'race') { p.alive = false; p.left = true; } else this.peers.delete(d.id); } this.emit('lobby'); }
        else if (d.t === 'host') { this.host = d.id === this.id; this.emit('lobby'); }
        else if (d.t === 'start') { this.state = 'race'; this.seed = d.seed; this.emit('start', d); }
        else if (d.t === 'st') { const p = this.peers.get(d.id); if (p) { if (p.x !== undefined) p.bank = Math.max(-1, Math.min(1, (d.x * view.w - p.x) * 0.2)); p.x = d.x * view.w; p.y = d.y * view.h; p.score = d.s; p.alive = !!d.a; } }
        else if (d.t === 'end') { const p = this.peers.get(d.id); if (p) { p.score = d.s; p.done = true; p.alive = false; p.win = !!d.w; } this.emit('end', d); }
      };
    });
  }
  send(o) { if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(o)); }
  start() { this.send({ t: 'start' }); }
  sendState(g) { const p = g.player; this.send({ t: 'st', x: +(p.x / view.w).toFixed(3), y: +(p.y / view.h).toFixed(3), s: Math.round(g.stats.score || 0), a: p.alive && g.state !== 'dying' ? 1 : 0 }); }
  sendEnd(score, win) { this.send({ t: 'end', s: Math.round(score), w: win ? 1 : 0 }); }
  rivals(colors) { let i = 0; const out = []; for (const p of this.peers.values()) out.push({ name: p.name, ship: p.ship, color: colors[(i++ + 1) % colors.length], x: p.x, y: p.y, score: p.score || 0, alive: p.alive && p.x !== undefined, done: p.done, bank: p.bank || 0, src: 'live' }); return out; }
  close() { this.state = 'closed'; try { this.ws && this.ws.close(); } catch (e) { /* ok */ } }
}
