// Public Bomb Man arena: a host seat that is reserved but never connected must not freeze the arena.
import test from 'node:test';
import assert from 'node:assert/strict';
import { StarMuffRoom } from '../multiplayer/worker.mjs';
globalThis.WebSocketRequestResponsePair ??= class { constructor(request, response) { this.request = request; this.response = response; } };

async function freshRoom() {
  const records = new Map(), sockets = [];
  const ctx = {
    storage: {
      async get(keys) { return new Map(keys.filter(k => records.has(k)).map(k => [k, structuredClone(records.get(k))])); },
      async put(values) { for (const [k, v] of Object.entries(structuredClone(values))) records.set(k, v); },
      async deleteAll() { records.clear(); },
      async setAlarm(v) { ctx.alarm = v; }
    },
    blockConcurrencyWhile(fn) { this.ready = fn(); },
    getWebSockets() { return sockets; },
    setWebSocketAutoResponse() {},
    waitUntil() {}
  };
  const room = new StarMuffRoom(ctx, {}); await ctx.ready;
  return { room, sockets };
}
const liveJoin = async (room, token) => (await room.fetch(new Request('https://do/live-join', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(token ? { token } : {}) }))).json();

test('a reserved-but-never-connected host seat is recycled after the grace window', async (t) => {
  let now = 1_800_000_000_000; t.mock.method(Date, 'now', () => now);
  const { room, sockets } = await freshRoom();
  const ghost = await liveJoin(room); assert.equal(ghost.slot, 0);
  const early = await liveJoin(room); assert.equal(early.slot, 1, 'inside the grace window a second visitor is still a guest');
  const stuck = { attachment: { slot: 1, id: 'g1' }, messages: [], closed: null, deserializeAttachment() { return this.attachment; }, send(m) { this.messages.push(JSON.parse(m)); }, close(code) { this.closed = code; } };
  sockets.push(stuck);
  now += 16_000;
  const next = await liveJoin(room);
  assert.equal(next.slot, 0, 'after the grace window the next visitor hosts a fresh arena');
  assert.notEqual(next.token, ghost.token);
  assert.equal(stuck.messages.at(-1)?.kind, 'closed', 'stuck guests are told to rejoin');
  assert.equal(stuck.closed, 4000);
});

test('a host that connected keeps the arena; guests keep joining it', async (t) => {
  let now = 1_800_000_000_000; t.mock.method(Date, 'now', () => now);
  const { room } = await freshRoom();
  const host = await liveJoin(room); assert.equal(host.slot, 0);
  room.core.connect(host.token, 'h'); room.core.state.hostSeen = true;
  now += 60_000;
  const guest = await liveJoin(room); assert.equal(guest.slot, 1, 'a live host is never replaced');
});
