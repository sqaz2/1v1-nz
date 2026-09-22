import { RoomCore, RoomError, GAMES, LIMITS } from './room-core.mjs';

const CODE = /^[A-Z2-9]{8}$/;
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const fail = e => json({ error: e.code || 'server', message: e instanceof RoomError ? e.message : 'Multiplayer service unavailable.' }, e.status || 500);
const allowed = (origin, env) => !origin || (env.ALLOWED_ORIGINS || 'https://1v1.nz,https://www.1v1.nz').split(',').some(value => value.trim() === origin || (value.trim() === 'https://*.1v1-nz.pages.dev' && /^https:\/\/[a-z0-9-]+\.1v1-nz\.pages\.dev$/.test(origin)));
const makeCode = () => { const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; return Array.from(crypto.getRandomValues(new Uint8Array(8)), n => alphabet[n & 31]).join(''); };
async function body(request) {
  if (+request.headers.get('content-length') > 2048) throw new RoomError('size', 'Request too large.', 413);
  const raw = await request.text();
  if (raw.length > 2048) throw new RoomError('size', 'Request too large.', 413);
  try { return JSON.parse(raw); } catch { throw new RoomError('json', 'Invalid JSON.'); }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url), origin = request.headers.get('origin');
    if (!allowed(origin, env)) return json({ error: 'origin', message: 'Origin is not allowed.' }, 403);
    const cors = response => {
      if (response.status === 101) return response;
      const r = new Response(response.body, response);
      if (origin) r.headers.set('access-control-allow-origin', origin);
      r.headers.set('vary', 'Origin'); r.headers.set('access-control-allow-methods', 'GET, POST, OPTIONS');
      r.headers.set('access-control-allow-headers', 'Content-Type'); return r;
    };
    if (request.method === 'OPTIONS') return cors(new Response(null, { status: 204 }));
    try {
      const path = url.pathname.replace(/^\/api\/starmuff/, '').replace(/\/$/, '') || '/';
      if (path === '/health') return cors(json({ ok: true, transport: 'websocket', version: 1, games: [...GAMES] }));
      if (request.method === 'POST' && path === '/rooms') {
        if (env.ROOM_RATE_LIMIT) {
          const limited = await env.ROOM_RATE_LIMIT.limit({ key: `create:${request.headers.get('CF-Connecting-IP') || 'unknown'}` });
          if (!limited.success) throw new RoomError('rate', 'Too many new rooms. Please wait a minute.', 429);
        }
        const data = await body(request);
        if (!GAMES.has(data.game)) throw new RoomError('game', 'Unknown game.');
        const code = makeCode(), stub = env.STARMUFF_ROOMS.get(env.STARMUFF_ROOMS.idFromName(code));
        return cors(await stub.fetch(new Request('https://room.internal/create', { method: 'POST', body: JSON.stringify({ code, game: data.game }) })));
      }
      const match = path.match(/^\/rooms\/([A-Z2-9]{8})\/(join|ws)$/);
      if (!match || !CODE.test(match[1])) throw new RoomError('not-found', 'Unknown multiplayer endpoint.', 404);
      if ((match[2] === 'join' && request.method !== 'POST') || (match[2] === 'ws' && request.method !== 'GET')) throw new RoomError('method', 'Method not allowed.', 405);
      const stub = env.STARMUFF_ROOMS.get(env.STARMUFF_ROOMS.idFromName(match[1]));
      const internal = new URL(request.url); internal.pathname = `/${match[2]}`;
      return cors(await stub.fetch(new Request(internal, request)));
    } catch (e) { return cors(fail(e)); }
  }
};

export class StarMuffRoom {
  constructor(ctx, env) {
    this.ctx = ctx; this.env = env; this.core = null; this.checkpoint = null;
    ctx.blockConcurrencyWhile(async () => {
      const records = await ctx.storage.get(['meta', 'snapshot', 'events']);
      const meta = records.get('meta');
      this.core = new RoomCore(meta ? { ...meta, snapshot: records.get('snapshot') ?? null, events: records.get('events') || [] } : null);
      // Connected state is reconstructed from Cloudflare's hibernating sockets, not stale storage flags.
      if (this.core.state) {
        let lostCheckpoint = false;
        this.core.state.players.forEach(p => { if (p) { p.connected = false; p.connectionId = null; } });
        for (const socket of ctx.getWebSockets()) {
          const attachment = socket.deserializeAttachment(), p = this.core.state.players[attachment?.slot];
          if (p && socket.readyState === 1) {
            if ((attachment.lastSeq || 0) > p.lastSeq) lostCheckpoint = true;
            p.connected = true; p.connectionId = attachment.id; p.lastSeq = Math.max(p.lastSeq, attachment.lastSeq || 0);
          }
        }
        // Never silently continue a world that has forgotten acknowledged commands.
        if (lostCheckpoint && this.core.state.phase === 'active') {
          this.core.state.phase = 'finished'; this.core.state.result = { winner: null, aborted: true, reason: 'Server recovered incomplete game state. Please request a rematch.' };
          this.core.state.events = []; this.core.state.players.forEach(p => { if (p) p.ready = false; });
          await this.save(); this.send([{ to: 'all', message: { kind: 'finish', ...this.core.view() } }]);
        }
      }
    });
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }
  async save() {
    if (!this.core.state) return;
    const { snapshot, events, ...meta } = this.core.state;
    await this.ctx.storage.put({ meta, snapshot, events });
  }
  scheduleCheckpoint() {
    if (this.checkpoint) return;
    // A pending timer prevents hibernation until this checkpoint has been committed.
    // Realtime frames do not wait on storage. Lifecycle changes flush immediately.
    this.checkpoint = setTimeout(() => { this.checkpoint = null; this.ctx.waitUntil(this.save()); }, 1000);
  }
  async flush() { if (this.checkpoint) clearTimeout(this.checkpoint); this.checkpoint = null; await this.save(); }
  send(effects) {
    for (const { to, message } of effects) for (const socket of this.ctx.getWebSockets()) {
      const attachment = socket.deserializeAttachment();
      if (to === 'all' || attachment?.slot === to) try { socket.send(JSON.stringify(message)); } catch { /* close callback handles presence */ }
    }
  }
  async fetch(request) {
    try {
      const path = new URL(request.url).pathname;
      if (path === '/create') {
        const data = await body(request), result = this.core.create(data.code, data.game);
        await this.save(); await this.ctx.storage.setAlarm(this.core.state.expiresAt);
        return json(result, 201);
      }
      if (path === '/join') { const data = await body(request); const result = this.core.join(data.game, data.token); await this.save(); return json(result); }
      if (path === '/ws') {
        if (request.headers.get('upgrade')?.toLowerCase() !== 'websocket') return json({ error: 'upgrade', message: 'WebSocket required.' }, 426);
        const protocols = (request.headers.get('sec-websocket-protocol') || '').split(',').map(x => x.trim());
        const token = protocols.find(x => x.startsWith('auth.'))?.slice(5);
        this.core.authenticate(token);
        const id = crypto.randomUUID(), pair = new WebSocketPair(), [client, server] = Object.values(pair);
        const info = this.core.connect(token, id);
        for (const old of this.ctx.getWebSockets()) if (old.deserializeAttachment()?.id === info.replaced) old.close(4001, 'Seat resumed in another connection');
        server.serializeAttachment({ slot: info.slot, id }); this.ctx.acceptWebSocket(server);
        await this.flush(); server.send(JSON.stringify(info.welcome));
        this.send([{ to: 'all', message: { kind: 'presence', ...this.core.view() } }]);
        return new Response(null, { status: 101, webSocket: client, headers: { 'sec-websocket-protocol': 'starmuff-v1' } });
      }
      throw new RoomError('not-found', 'Not found.', 404);
    } catch (e) { return fail(e); }
  }
  async webSocketMessage(socket, message) {
    const attachment = socket.deserializeAttachment();
    try {
      const effects = this.core.receive(attachment.slot, attachment.id, message);
      socket.serializeAttachment({ ...attachment, lastSeq: this.core.state.players[attachment.slot].lastSeq });
      const kind = JSON.parse(message).kind;
      if (kind === 'event' || kind === 'snapshot') { this.send(effects); this.scheduleCheckpoint(); }
      else { await this.flush(); this.send(effects); }
    } catch (e) {
      await this.flush(); socket.send(JSON.stringify({ kind: 'error', code: e.code || 'server', message: e instanceof RoomError ? e.message : 'The room could not process that command.' }));
      if (e.code === 'size' || e.code === 'rate') socket.close(1008, 'Message limit exceeded');
    }
  }
  async webSocketClose(socket) {
    const attachment = socket.deserializeAttachment();
    const effects = this.core.disconnect(attachment.slot, attachment.id); await this.flush(); this.send(effects);
  }
  async webSocketError(socket) { await this.webSocketClose(socket); }
  async alarm() {
    if (this.checkpoint) clearTimeout(this.checkpoint); this.checkpoint = null;
    for (const socket of this.ctx.getWebSockets()) socket.close(4004, 'Room expired');
    await this.ctx.storage.deleteAll(); this.core = new RoomCore();
  }
}
