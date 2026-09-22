import test from 'node:test';
import assert from 'node:assert/strict';
import { RoomCore } from '../multiplayer/room-core.mjs';
import worker, { StarMuffRoom } from '../multiplayer/worker.mjs';

// This exercises the actual Worker class against an explicit Durable Object API mock.
// It does not claim to validate native workerd scheduling, sockets or Cloudflare deployment.
globalThis.WebSocketRequestResponsePair = class {
  constructor(request, response) { this.request = request; this.response = response; }
};

function checkpoint() {
  const core = new RoomCore();
  const host = core.create('ABCDEFGH', 'skirmish'), guest = core.join('skirmish');
  core.connect(host.token, 'socket-0'); core.connect(guest.token, 'socket-1');
  core.receive(0, 'socket-0', JSON.stringify({ kind: 'ready', ready: true, seq: 1, matchId: null }));
  core.receive(1, 'socket-1', JSON.stringify({ kind: 'ready', ready: true, seq: 1, matchId: null }));
  core.receive(0, 'socket-0', JSON.stringify({ kind: 'snapshot', snapshot: { turnId: 3, health: [90, 80] }, appliedThrough: 0, seq: 2, matchId: core.state.matchId }));
  return structuredClone(core.state);
}

async function restore(saved, { sockets = [0, 1], advances = {}, behind = {} } = {}) {
  const { snapshot, events, ...meta } = structuredClone(saved);
  const records = new Map(Object.entries({ meta, snapshot, events })), writes = [], socketList = sockets.map(slot => ({
    readyState: 1,
    attachment: { slot, id: 'socket-' + slot, lastSeq: saved.players[slot].lastSeq + (advances[slot] || 0) - (behind[slot] || 0) },
    messages: [], closed: null,
    deserializeAttachment() { return structuredClone(this.attachment); },
    serializeAttachment(value) { this.attachment = structuredClone(value); },
    send(raw) { this.messages.push(JSON.parse(raw)); },
    close(code, reason) { this.closed = { code, reason }; this.readyState = 3; }
  }));
  const ctx = {
    storage: {
      async get(keys) { return new Map(keys.filter(key => records.has(key)).map(key => [key, structuredClone(records.get(key))])); },
      async put(values) { const copy = structuredClone(values); writes.push(copy); for (const [key, value] of Object.entries(copy)) records.set(key, value); },
      async deleteAll() { records.clear(); },
      async setAlarm(value) { ctx.alarm = value; }
    },
    blockConcurrencyWhile(fn) { this.ready = fn(); },
    getWebSockets() { return socketList; },
    setWebSocketAutoResponse(pair) { this.autoResponse = pair; },
    waitUntil(promise) { this.pending = promise; }
  };
  const room = new StarMuffRoom(ctx, {}); await ctx.ready;
  return { room, ctx, records, writes, sockets: socketList };
}

test('Worker rehydrates only live socket presence and preserves a healthy canonical checkpoint', async () => {
  const saved = checkpoint(), f = await restore(saved, { sockets: [0] });
  assert.equal(f.room.core.state.phase, 'active');
  assert.equal(f.room.core.state.matchId, saved.matchId); assert.equal(f.room.core.state.seed, saved.seed);
  assert.deepEqual(f.room.core.state.snapshot, { turnId: 3, health: [90, 80] });
  assert.equal(f.room.core.state.players[0].connected, true);
  assert.equal(f.room.core.state.players[1].connected, false, 'Persisted connected:true cannot invent an absent socket.');
  assert.equal(f.room.core.state.players[1].connectionId, null);
  assert.equal(f.room.core.view().connected, false);
  assert.equal(f.writes.length, 0); assert.equal(f.sockets[0].messages.length, 0);
  assert.equal(f.ctx.autoResponse.request, 'ping'); assert.equal(f.ctx.autoResponse.response, 'pong');
});

test('Worker explicitly aborts uncheckpointed acknowledged state and permits a fresh two-party rematch', async () => {
  const saved = checkpoint(); saved.events = [{ kind: 'event', type: 'old-input', serverSeq: 1 }];
  const f = await restore(saved, { advances: { 1: 3 } }), state = f.room.core.state;
  assert.equal(state.phase, 'finished'); assert.equal(state.result.aborted, true); assert.equal(state.result.winner, null);
  assert.match(state.result.reason, /incomplete game state/); assert.deepEqual(state.events, []);
  assert.equal(state.players[1].lastSeq, saved.players[1].lastSeq + 3);
  assert.ok(state.players.every(player => !player.ready));
  assert.equal(f.records.get('meta').phase, 'finished', 'Abort must be durable before notifying clients.');
  assert.equal(f.records.get('meta').result.aborted, true);
  for (const socket of f.sockets) {
    assert.equal(socket.messages.length, 1); assert.equal(socket.messages[0].kind, 'finish');
    assert.equal(socket.messages[0].matchId, saved.matchId); assert.equal(socket.messages[0].result.aborted, true);
    assert.ok(!JSON.stringify(socket.messages).includes(saved.players[0].token), 'Recovery notices cannot leak resume tokens.');
  }
  for (const slot of [0, 1]) {
    await f.room.webSocketMessage(f.sockets[slot], JSON.stringify({ kind: 'ready', ready: true, seq: state.players[slot].lastSeq + 1, matchId: saved.matchId }));
  }
  assert.equal(state.phase, 'active'); assert.notEqual(state.matchId, saved.matchId);
  assert.equal(state.snapshot, null); assert.equal(state.result, null);
});

test('Worker does not regress persisted deduplication when a socket attachment is older', async () => {
  const saved = checkpoint(), f = await restore(saved, { behind: { 0: 1 } });
  assert.equal(f.room.core.state.phase, 'active'); assert.equal(f.room.core.state.players[0].lastSeq, saved.players[0].lastSeq);
  const socket = f.sockets[0];
  await f.room.webSocketMessage(socket, JSON.stringify({ kind: 'event', type: 'fire', data: {}, seq: saved.players[0].lastSeq, matchId: saved.matchId }));
  assert.equal(socket.messages.at(-1).kind, 'ack'); assert.equal(socket.messages.at(-1).duplicate, true);
  assert.equal(f.room.core.state.events.length, 0);
  await f.room.flush(); // cancel the bounded checkpoint timer created by the duplicate event path
});

test('Worker relays realtime frames before checkpointing and flushes on disconnect', async () => {
  const saved = checkpoint(), f = await restore(saved), guest = f.sockets[1];
  await f.room.webSocketMessage(guest, JSON.stringify({ kind: 'event', type: 'aim', data: { turnId: 3, angle: 41 }, seq: 2, matchId: saved.matchId }));
  assert.equal(f.writes.length, 0, 'Realtime delivery must not perform a storage write per input.');
  assert.equal(guest.attachment.lastSeq, 2); assert.ok(f.room.checkpoint);
  assert.equal(f.sockets[0].messages.at(-1).kind, 'event'); assert.equal(f.sockets[0].messages.at(-1).data.angle, 41);
  await f.room.webSocketClose(guest);
  assert.equal(f.room.checkpoint, null); assert.equal(f.writes.length, 1);
  assert.equal(f.records.get('events')[0].type, 'aim'); assert.equal(f.records.get('meta').players[1].connected, false);
  assert.equal(f.sockets[0].messages.at(-1).connected, false);
});

test('Worker expiry alarm closes surviving sockets and erases the exact room storage', async () => {
  const f = await restore(checkpoint()); await f.room.alarm();
  assert.equal(f.records.size, 0); assert.equal(f.room.core.state, null);
  for (const socket of f.sockets) { assert.equal(socket.closed.code, 4004); assert.match(socket.closed.reason, /expired/); }
});

test('Worker public routing applies the configured origin allowlist and returns versioned JSON health', async () => {
  const env = { ALLOWED_ORIGINS: 'https://1v1.nz,https://*.1v1-nz.pages.dev' };
  const response = await worker.fetch(new Request('https://worker.example/api/starmuff/health', { headers: { origin: 'https://fix-originals.1v1-nz.pages.dev' } }), env);
  assert.equal(response.status, 200); assert.equal(response.headers.get('access-control-allow-origin'), 'https://fix-originals.1v1-nz.pages.dev');
  const health = await response.json(); assert.equal(health.version, 1); assert.equal(health.transport, 'websocket'); assert.equal(health.games.length, 5);
  const denied = await worker.fetch(new Request('https://worker.example/api/starmuff/health', { headers: { origin: 'https://evil.example' } }), env);
  assert.equal(denied.status, 403); assert.equal((await denied.json()).error, 'origin');
});
