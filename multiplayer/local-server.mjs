/** Development transport: real HTTP/WebSockets across separate browsers/devices, not BroadcastChannel. */
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { RoomCore, RoomError, GAMES, LIMITS } from './room-core.mjs';

const DEFAULT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.woff2': 'font/woff2' };
const code = () => { const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; return Array.from(crypto.getRandomValues(new Uint8Array(8)), n => alphabet[n & 31]).join(''); };

export function createLocalServer({ root = DEFAULT_ROOT } = {}) {
  const rooms = new Map(), creations = new Map();
  const wsServer = new WebSocketServer({ noServer: true, maxPayload: LIMITS.message, handleProtocols: protocols => protocols.has('starmuff-v1') ? 'starmuff-v1' : false });
  const respond = (res, value, status = 200) => { res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify(value)); };
  async function json(req) {
    let raw = ''; for await (const chunk of req) { raw += chunk; if (raw.length > 2048) throw new RoomError('size', 'Request too large.', 413); }
    try { return JSON.parse(raw); } catch { throw new RoomError('json', 'Invalid JSON.'); }
  }
  const room = id => { const r = rooms.get(id); if (!r) throw new RoomError('not-found', 'Room not found.', 404); return r; };
  const send = (r, effects) => {
    for (const effect of effects) for (const [socket, info] of r.sockets) if (effect.to === 'all' || effect.to === info.slot) {
      if (socket.readyState === 1) socket.send(JSON.stringify(effect.message));
    }
  };
  const originAllowed = req => !req.headers.origin || req.headers.origin === `http://${req.headers.host}` || /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(req.headers.origin);
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname.startsWith('/api/starmuff/')) {
        if (!originAllowed(req)) throw new RoomError('origin', 'Origin not allowed.', 403);
        if (req.headers.origin) res.setHeader('access-control-allow-origin', req.headers.origin);
        if (req.method === 'OPTIONS') { res.writeHead(204, { 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'Content-Type' }); res.end(); return; }
        if (url.pathname === '/api/starmuff/health') return respond(res, { ok: true, transport: 'websocket', version: 1, development: true, games: [...GAMES] });
        if (req.method === 'POST' && url.pathname === '/api/starmuff/rooms') {
          const now = Date.now(), ip = req.socket.remoteAddress, bucket = creations.get(ip);
          if (bucket && now - bucket.time < 60000) { if (++bucket.count > 12) throw new RoomError('rate', 'Too many new rooms. Please wait a minute.', 429); }
          else creations.set(ip, { time: now, count: 1 });
          for (const [id, r] of rooms) if (r.core.state.expiresAt < now) { for (const socket of r.sockets.keys()) socket.close(4004, 'Room expired'); rooms.delete(id); }
          if (rooms.size >= 100) throw new RoomError('capacity', 'Development room capacity reached.', 503);
          const data = await json(req), id = code(), core = new RoomCore(), result = core.create(id, data.game);
          rooms.set(id, { core, sockets: new Map() }); return respond(res, result, 201);
        }
        const match = url.pathname.match(/^\/api\/starmuff\/rooms\/([A-Z2-9]{8})\/join$/);
        if (match && req.method === 'POST') { const data = await json(req); return respond(res, room(match[1]).core.join(data.game, data.token)); }
        throw new RoomError('not-found', 'Multiplayer endpoint not found.', 404);
      }
      if (req.method !== 'GET' && req.method !== 'HEAD') throw new RoomError('method', 'Method not allowed.', 405);
      const decoded = decodeURIComponent(url.pathname);
      if (decoded.split('/').some(part => part.startsWith('.') || part === 'node_modules' || part === 'functions')) throw new RoomError('not-found', 'Not found.', 404);
      let file = path.resolve(root, '.' + decoded);
      if (file !== root && !file.startsWith(root + path.sep)) throw new RoomError('not-found', 'Not found.', 404);
      if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
      const content = await readFile(file); res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' }); res.end(req.method === 'HEAD' ? undefined : content);
    } catch (error) { respond(res, { error: error.code || 'server', message: error instanceof RoomError ? error.message : 'Not found.' }, error.status || 404); }
  });
  server.on('upgrade', (req, socket, head) => {
    try {
      if (!originAllowed(req)) throw new RoomError('origin', 'Origin not allowed.', 403);
      const match = new URL(req.url, 'http://localhost').pathname.match(/^\/api\/starmuff\/rooms\/([A-Z2-9]{8})\/ws$/);
      if (!match) throw new RoomError('not-found', 'Not found.', 404);
      const r = room(match[1]), token = (req.headers['sec-websocket-protocol'] || '').split(',').map(x => x.trim()).find(x => x.startsWith('auth.'))?.slice(5);
      r.core.authenticate(token);
      wsServer.handleUpgrade(req, socket, head, ws => {
        const id = crypto.randomUUID(), info = r.core.connect(token, id);
        for (const [old, oldInfo] of r.sockets) if (oldInfo.id === info.replaced) old.close(4001, 'Seat resumed in another connection');
        r.sockets.set(ws, { id, slot: info.slot });
        ws.send(JSON.stringify(info.welcome)); send(r, [{ to: 'all', message: { kind: 'presence', ...r.core.view() } }]);
        ws.on('message', (data, binary) => {
          if (!binary && data.toString() === 'ping') { ws.send('pong'); return; }
          try { send(r, r.core.receive(info.slot, id, binary ? data : data.toString())); }
          catch (error) { ws.send(JSON.stringify({ kind: 'error', code: error.code || 'server', message: error.message })); if (error.code === 'size' || error.code === 'rate') ws.close(1008, 'Message limit exceeded'); }
        });
        ws.on('close', () => { r.sockets.delete(ws); send(r, r.core.disconnect(info.slot, id)); });
        ws.on('error', () => { /* close callback owns cleanup */ });
      });
    } catch (error) { socket.write(`HTTP/1.1 ${error.status || 400} Rejected\r\nConnection: close\r\n\r\n`); socket.destroy(); }
  });
  return {
    server, rooms,
    async listen(port = 8787, host = '127.0.0.1') { await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, host, resolve); }); return server.address(); },
    async close() { for (const socket of wsServer.clients) socket.terminate(); await new Promise(resolve => server.close(resolve)); wsServer.close(); }
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const portIndex = process.argv.indexOf('--port'), hostIndex = process.argv.indexOf('--host');
  const port = portIndex >= 0 ? Number(process.argv[portIndex + 1]) : 8787, host = hostIndex >= 0 ? process.argv[hostIndex + 1] : '127.0.0.1';
  const app = createLocalServer(); await app.listen(port, host);
  console.log(`StarMuff real WebSocket development server: http://${host}:${port} (memory-only rooms; not production)`);
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => { await app.close(); process.exit(0); });
}
