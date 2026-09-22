/** Shared room state machine: used unchanged by the Worker and local WebSocket server. */
export const GAMES = new Set(['tetris', 'pinball', 'simon', 'skirmish', 'odyssey-tanks']);
export const LIMITS = Object.freeze({ message: 100 * 1024, snapshot: 96 * 1024, event: 8 * 1024, result: 4096, replay: 96 * 1024, rate: 120, ttl: 6 * 60 * 60 * 1000 });
const bytes = value => new TextEncoder().encode(JSON.stringify(value)).byteLength;
const randomToken = () => Array.from(crypto.getRandomValues(new Uint8Array(24)), x => x.toString(16).padStart(2, '0')).join('');
const randomSeed = () => crypto.getRandomValues(new Uint32Array(1))[0];
export class RoomError extends Error {
  constructor(code, message, status = 400) { super(message); this.code = code; this.status = status; }
}
const assert = (condition, code, message, status) => { if (!condition) throw new RoomError(code, message, status); };

export class RoomCore {
  constructor(saved = null, { now = Date.now, token = randomToken, seed = randomSeed } = {}) {
    this.now = now; this.newToken = token; this.newSeed = seed; this.state = saved; this.buckets = new Map();
  }
  create(code, game) {
    assert(!this.state, 'exists', 'Room already exists.', 409);
    assert(GAMES.has(game), 'game', 'Unknown game.');
    const token = this.newToken();
    this.state = { code, game, createdAt: this.now(), expiresAt: this.now() + LIMITS.ttl, phase: 'lobby', players: [this.player(token), null], matchId: null, seed: null, epoch: 0, serverSeq: 0, snapshot: null, snapshotSeq: 0, events: [], result: null };
    return { code, game, token, slot: 0 };
  }
  player(token) { return { token, ready: false, connected: false, connectionId: null, lastSeq: 0 }; }
  valid() {
    assert(this.state, 'not-found', 'Room not found. Check the invite code.', 404);
    assert(this.now() < this.state.expiresAt, 'expired', 'This room expired. Create a new room.', 410);
    assert(this.state.phase !== 'closed', 'closed', 'This room has closed. Create a new room.', 410);
    return this.state;
  }
  join(game, token) {
    const s = this.valid();
    assert(game === s.game, 'wrong-game', `This room is for ${s.game}.`, 409);
    if (token) {
      const slot = this.authenticate(token);
      return { code: s.code, game: s.game, token, slot };
    }
    assert(s.phase === 'lobby' && !s.players[1], 'full', 'Room is full. Rejoin using the same browser that reserved your seat.', 409);
    const fresh = this.newToken(); s.players[1] = this.player(fresh);
    return { code: s.code, game: s.game, token: fresh, slot: 1 };
  }
  authenticate(token) {
    const s = this.valid();
    const slot = typeof token === 'string' ? s.players.findIndex(p => p && p.token === token) : -1;
    assert(slot >= 0, 'unauthorized', 'Invalid seat token.', 401);
    return slot;
  }
  connect(token, connectionId) {
    const slot = this.authenticate(token), p = this.state.players[slot], replaced = p.connectionId;
    p.connected = true; p.connectionId = connectionId;
    return { slot, replaced, welcome: { kind: 'welcome', ...this.view(), slot, nextSeq: p.lastSeq + 1, snapshot: this.state.snapshot, snapshotSeq: this.state.snapshotSeq, events: this.state.events } };
  }
  disconnect(slot, connectionId) {
    const p = this.state?.players[slot];
    if (!p || p.connectionId !== connectionId) return [];
    p.connected = false; p.connectionId = null;
    if (this.state.phase !== 'active') p.ready = false;
    return [{ to: 'all', message: { kind: 'presence', ...this.view() } }];
  }
  view() {
    const s = this.state;
    return { code: s.code, game: s.game, phase: s.phase, matchId: s.matchId, seed: s.seed, expiresAt: s.expiresAt, result: s.result, connected: s.players.every(p => p?.connected), players: s.players.map((p, slot) => ({ slot, occupied: !!p, connected: !!p?.connected, ready: !!p?.ready })) };
  }
  receive(slot, connectionId, raw) {
    const s = this.valid(), p = s.players[slot];
    assert(p?.connected && p.connectionId === connectionId, 'connection', 'This connection is no longer the active seat.', 401);
    assert(typeof raw === 'string' && new TextEncoder().encode(raw).byteLength <= LIMITS.message, 'size', 'Message is too large.');
    const time = this.now(), bucket = this.buckets.get(slot);
    if (!bucket || time - bucket.start >= 1000) this.buckets.set(slot, { start: time, count: 1 });
    else { bucket.count++; assert(bucket.count <= LIMITS.rate, 'rate', 'Too many messages. Slow down.', 429); }
    let m; try { m = JSON.parse(raw); } catch { throw new RoomError('json', 'Invalid JSON.'); }
    assert(m && typeof m === 'object' && !Array.isArray(m), 'message', 'Invalid message.');
    if (m.kind === 'sync') return [{ to: slot, message: { kind: 'welcome', ...this.view(), slot, nextSeq: p.lastSeq + 1, snapshot: s.snapshot, snapshotSeq: s.snapshotSeq, events: s.events } }];
    assert(Number.isSafeInteger(m.seq) && m.seq > 0, 'sequence', 'A positive sequence number is required.');
    if (m.seq <= p.lastSeq) return [{ to: slot, message: { kind: 'ack', seq: m.seq, duplicate: true } }];
    assert(m.seq === p.lastSeq + 1, 'sequence-gap', 'A command was missed. Reconnect to resynchronize.', 409);
    // Consume rejected commands too, so a bad command cannot deadlock the seat sequence.
    p.lastSeq = m.seq;
    const out = [{ to: slot, message: { kind: 'ack', seq: m.seq } }];
    if (m.kind === 'ready') {
      assert(s.phase === 'lobby' || s.phase === 'finished', 'phase', 'A match is already in progress.', 409);
      assert((m.matchId ?? null) === s.matchId, 'stale-match', 'That readiness belongs to an old match.', 409);
      p.ready = m.ready === true;
      if (s.players.every(player => player?.connected && player.ready)) {
        s.epoch++; s.matchId = `${s.code}:${s.epoch}:${this.newToken().slice(0, 12)}`; s.seed = this.newSeed();
        s.phase = 'active'; s.snapshot = null; s.snapshotSeq = 0; s.events = []; s.serverSeq = 0; s.result = null;
        s.players.forEach(player => { player.ready = false; });
        out.push({ to: 'all', message: { kind: 'start', ...this.view() } });
      } else out.push({ to: 'all', message: { kind: 'presence', ...this.view() } });
      return out;
    }
    if (m.kind === 'leave') {
      s.phase = 'closed'; s.players.forEach(player => { if (player) player.ready = false; });
      return [...out, { to: 'all', message: { kind: 'closed', reason: `Player ${slot + 1} left the room.`, ...this.view() } }];
    }
    assert(m.matchId && m.matchId === s.matchId, 'stale-match', 'That command belongs to an old match.', 409);
    assert(s.phase === 'active', 'phase', 'No active match.', 409);
    assert(s.players.every(player => player?.connected), 'paused', 'Match paused while the other player reconnects.', 409);
    if (m.kind === 'event') {
      assert(typeof m.type === 'string' && /^[a-zA-Z0-9_.:-]{1,64}$/.test(m.type), 'event-type', 'Invalid event type.');
      assert(bytes(m.data ?? null) <= LIMITS.event, 'size', 'Event payload is too large.');
      const event = { kind: 'event', type: m.type, data: m.data ?? null, slot, seq: m.seq, serverSeq: ++s.serverSeq, matchId: s.matchId };
      s.events.push(event);
      // Snapshots should be frequent; retain bounded recovery history if a game omits them.
      while (s.events.length > 128 || bytes(s.events) > LIMITS.replay) s.events.shift();
      out.push({ to: 1 - slot, message: event });
    } else if (m.kind === 'snapshot') {
      assert(slot === 0, 'host-only', 'Only the host can publish world state.', 403);
      assert(m.snapshot !== undefined && bytes(m.snapshot) <= LIMITS.snapshot, 'size', 'Snapshot is too large.');
      const appliedThrough = m.appliedThrough ?? s.serverSeq;
      assert(Number.isSafeInteger(appliedThrough) && appliedThrough >= 0 && appliedThrough <= s.serverSeq, 'snapshot-sequence', 'Invalid snapshot event watermark.');
      s.snapshot = m.snapshot; s.snapshotSeq = appliedThrough;
      // A guest command may arrive at the server before a host snapshot that has not seen it yet.
      // Keep such in-flight commands; never acknowledge them merely because a snapshot arrived.
      s.events = s.events.filter(event => event.slot !== 0 && event.serverSeq > appliedThrough);
      out.push({ to: 1, message: { kind: 'snapshot', snapshot: s.snapshot, slot, matchId: s.matchId, serverSeq: s.snapshotSeq } });
    } else if (m.kind === 'finish') {
      assert(slot === 0, 'host-only', 'Only the host can adjudicate the match.', 403);
      assert(bytes(m.result ?? null) <= LIMITS.result, 'size', 'Result is too large.');
      s.phase = 'finished'; s.result = m.result ?? null; s.players.forEach(player => { player.ready = false; });
      out.push({ to: 'all', message: { kind: 'finish', result: s.result, ...this.view() } });
    } else throw new RoomError('kind', 'Unknown message kind.');
    return out;
  }
}
