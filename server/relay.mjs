// Relais multijoueur d'Astralume — serveur WebSocket minimal, sans dépendance (Node 18+).
// Lancement local :  node server/relay.mjs            (port 8787 par défaut, ou PORT=...)
// Puis ouvrir le jeu avec ?relay=ws://localhost:8787  (ou wss://… une fois déployé).
// Le serveur ne fait que relayer : chaque joueur calcule sa propre partie (même graine pour tous).
import http from 'node:http';
import crypto from 'node:crypto';

const PORT = +(process.env.PORT || 8787);
const MAX = 4;
const rooms = new Map(); // code -> { code, seed, started, members: Map(id -> client), host }
let nextId = 1;

const ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newCode = () => { let c; do { c = ''; for (let i = 0; i < 4; i++) c += ABC[crypto.randomInt(ABC.length)]; } while (rooms.has(c)); return c; };

// ---------- Trames WebSocket (RFC 6455, texte uniquement) ----------
function frame(str) {
  const p = Buffer.from(str), n = p.length;
  const h = n < 126 ? Buffer.from([0x81, n]) : n < 65536 ? Buffer.from([0x81, 126, n >> 8, n & 255]) : (() => { const b = Buffer.alloc(10); b[0] = 0x81; b[1] = 127; b.writeBigUInt64BE(BigInt(n), 2); return b; })();
  return Buffer.concat([h, p]);
}
function makeClient(sock) {
  const c = { id: nextId++, sock, buf: Buffer.alloc(0), room: null, name: 'Pilote', ship: 'etincelle', alive: true };
  c.send = (o) => { if (!sock.destroyed) sock.write(frame(JSON.stringify(o))); };
  sock.on('data', (d) => {
    c.buf = Buffer.concat([c.buf, d]);
    while (c.buf.length >= 2) {
      const b0 = c.buf[0], b1 = c.buf[1], op = b0 & 15, masked = b1 & 128;
      let len = b1 & 127, off = 2;
      if (len === 126) { if (c.buf.length < 4) return; len = c.buf.readUInt16BE(2); off = 4; }
      else if (len === 127) { if (c.buf.length < 10) return; len = Number(c.buf.readBigUInt64BE(2)); off = 10; }
      if (len > 64 * 1024) { sock.destroy(); return; }
      const mk = masked ? 4 : 0;
      if (c.buf.length < off + mk + len) return;
      const mask = masked ? c.buf.subarray(off, off + 4) : null;
      const data = Buffer.from(c.buf.subarray(off + mk, off + mk + len));
      if (mask) for (let i = 0; i < data.length; i++) data[i] ^= mask[i & 3];
      c.buf = c.buf.subarray(off + mk + len);
      if (op === 8) { sock.end(); return; }
      if (op === 9) { sock.write(Buffer.concat([Buffer.from([0x8a, data.length]), data])); continue; }
      if (op === 1) { let m; try { m = JSON.parse(data.toString('utf8')); } catch (e) { continue; } onMessage(c, m); }
    }
  });
  sock.on('close', () => leave(c));
  sock.on('error', () => leave(c));
  return c;
}

// ---------- Salons ----------
function broadcast(room, o, except) { for (const m of room.members.values()) if (m !== except) m.send(o); }
function onMessage(c, m) {
  if (m.t === 'join' && !c.room) {
    const want = String(m.room || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
    let room = want ? rooms.get(want) : null;
    if (want && !room) { c.send({ t: 'error', msg: 'Salon introuvable' }); return; }
    if (room && room.started) { c.send({ t: 'error', msg: 'La course a déjà commencé' }); return; }
    if (room && room.members.size >= MAX) { c.send({ t: 'error', msg: 'Salon complet (4 pilotes max)' }); return; }
    if (!room) { room = { code: newCode(), seed: crypto.randomInt(1, 2 ** 31), started: false, members: new Map(), host: c.id }; rooms.set(room.code, room); }
    c.name = String(m.name || 'Pilote').slice(0, 16); c.ship = String(m.ship || 'etincelle').slice(0, 20); c.room = room;
    const peers = [...room.members.values()].map((p) => ({ id: p.id, name: p.name, ship: p.ship }));
    room.members.set(c.id, c);
    c.send({ t: 'joined', id: c.id, room: room.code, host: room.host === c.id, seed: room.seed, peers });
    broadcast(room, { t: 'peer+', id: c.id, name: c.name, ship: c.ship }, c);
    return;
  }
  const room = c.room;
  if (!room) return;
  if (m.t === 'start' && room.host === c.id && !room.started) { room.started = true; broadcast(room, { t: 'start', seed: room.seed, at: Date.now() + 2500 }); }
  else if (m.t === 'st') broadcast(room, { t: 'st', id: c.id, x: +m.x || 0, y: +m.y || 0, s: +m.s || 0, a: m.a ? 1 : 0 }, c);
  else if (m.t === 'end') broadcast(room, { t: 'end', id: c.id, s: +m.s || 0, w: m.w ? 1 : 0 }, c);
}
function leave(c) {
  const room = c.room;
  if (!room) return;
  c.room = null;
  room.members.delete(c.id);
  if (!room.members.size) { rooms.delete(room.code); return; }
  broadcast(room, { t: 'peer-', id: c.id });
  if (room.host === c.id) { room.host = room.members.keys().next().value; broadcast(room, { t: 'host', id: room.host }); }
}

// ---------- Serveur HTTP + poignée de main WebSocket ----------
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8', 'access-control-allow-origin': '*' });
  res.end(`Relais Astralume en ligne — ${rooms.size} salon(s)\n`);
});
server.on('upgrade', (req, sock) => {
  const key = req.headers['sec-websocket-key'];
  if (!key || (req.headers.upgrade || '').toLowerCase() !== 'websocket') { sock.destroy(); return; }
  const acc = crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + acc + '\r\n\r\n');
  sock.setNoDelay(true);
  makeClient(sock);
});
// nettoyage : salons démarrés depuis plus de 30 min
setInterval(() => { for (const r of rooms.values()) if (!r.members.size) rooms.delete(r.code); }, 60000).unref();
server.listen(PORT, () => console.log(`Relais Astralume : ws://localhost:${PORT}`));
