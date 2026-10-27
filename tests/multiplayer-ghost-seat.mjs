import test from 'node:test';
import assert from 'node:assert/strict';
import { RoomCore, SEAT_GRACE_MS } from '../multiplayer/room-core.mjs';

// William's report (2026-10-26): create a room, leave, come back minutes
// later, and the client connects as Player 2 while the old Player 1 seat
// still says "reconnecting". Two root causes, both in the shared room code:
//  (1) the client keeps the seat token in sessionStorage, which dies with
//      the tab, so a return cannot reclaim the seat;
//  (2) a disconnected seat is held until the 6h room TTL — there is no
//      grace expiry at all, so the ghost lingers for hours.
// These tests pin the fixed behavior. Tests 1, 2 and 7 also pass on the old
// code; they guard the intended grace semantics against over-correction.

function fixture(game = 'air-hockey') {
  let ticks = 1000, tokenIndex = 0;
  const core = new RoomCore(null, { now: () => ticks, token: () => String(++tokenIndex).padStart(48, '0'), seed: () => 42 });
  const host = core.create('ABCDEFGH', game), guest = core.join(game);
  core.connect(host.token, 'host'); core.connect(guest.token, 'guest');
  const seq = [0, 0];
  const send = (slot, value) => core.receive(slot, slot ? 'guest' : 'host', JSON.stringify({ seq: ++seq[slot], matchId: core.state.matchId, ...value }));
  const start = () => { send(0, { kind: 'ready', ready: true }); send(1, { kind: 'ready', ready: true }); };
  return { core, host, guest, seq, send, start, advance: ms => { ticks += ms; } };
}

test('token rejoin reclaims a disconnected seat within grace', () => {
  const f = fixture();
  f.core.disconnect(0, 'host');
  f.advance(2 * 60 * 1000);
  const restored = f.core.connect(f.host.token, 'host2');
  assert.equal(restored.slot, 0);
  assert.equal(f.core.state.players[0].connected, true);
});

test('within grace, a fresh joiner still sees the ghost (grace is intentional)', () => {
  // William's exact shape: alone in the room, no guest ever joined.
  let ticks = 1000, tokenIndex = 0;
  const core = new RoomCore(null, { now: () => ticks, token: () => String(++tokenIndex).padStart(48, '0'), seed: () => 42 });
  const host = core.create('ABCDEFGH', 'air-hockey');
  core.connect(host.token, 'host');
  core.disconnect(0, 'host');
  ticks += 2 * 60 * 1000;
  const fresh = core.join('air-hockey');
  assert.equal(fresh.slot, 1);
  const view = core.view();
  assert.equal(view.players[0].occupied, true);
  assert.equal(view.players[0].connected, false);
});

test('host seat expires after grace: room closes instead of ghosting', () => {
  const f = fixture();
  f.core.disconnect(0, 'host');
  f.advance(SEAT_GRACE_MS + 1);
  const effects = f.send(1, { kind: 'ready', ready: true });
  assert.equal(effects.at(-1).message.kind, 'closed');
  assert.equal(f.core.state.phase, 'closed');
  assert.throws(() => f.core.join('air-hockey'), { code: 'closed' });
});

test('disconnected guest seat frees after grace and the lobby refills', () => {
  const f = fixture();
  f.core.disconnect(1, 'guest');
  f.advance(SEAT_GRACE_MS + 1);
  const effects = f.send(0, { kind: 'ready', ready: true });
  const presence = effects.find(e => e.message.kind === 'presence');
  assert.equal(presence.message.players[1].occupied, false);
  assert.equal(f.core.state.phase, 'lobby');
  const fresh = f.core.join('air-hockey');
  assert.equal(fresh.slot, 1);
});

test('guest leave in lobby frees the seat instead of closing the room', () => {
  const f = fixture();
  const effects = f.send(1, { kind: 'leave' });
  assert.equal(effects.at(-1).message.kind, 'presence');
  assert.equal(f.core.state.players[1], null);
  assert.equal(f.core.state.phase, 'lobby');
  assert.equal(f.core.join('air-hockey').slot, 1);
});

test('mid-match abandonment closes the room instead of pausing forever', () => {
  const f = fixture(); f.start();
  f.core.disconnect(0, 'host');
  f.advance(SEAT_GRACE_MS + 1);
  const effects = f.send(1, { kind: 'event', type: 'poke', data: {} });
  assert.equal(effects.at(-1).message.kind, 'closed');
  assert.equal(f.core.state.phase, 'closed');
});

test('a waiting host is not swept', () => {
  let ticks = 1000, tokenIndex = 0;
  const core = new RoomCore(null, { now: () => ticks, token: () => String(++tokenIndex).padStart(48, '0'), seed: () => 42 });
  const host = core.create('ABCDEFGH', 'air-hockey');
  core.connect(host.token, 'host');
  ticks += SEAT_GRACE_MS + 1;
  core.receive(0, 'host', JSON.stringify({ seq: 1, matchId: null, kind: 'ready', ready: true }));
  assert.equal(core.state.phase, 'lobby');
  assert.equal(core.state.players[0].connected, true);
});

test('disconnect stamps disconnectedAt; reconnect clears it', () => {
  const f = fixture();
  f.core.disconnect(0, 'host');
  assert.equal(f.core.state.players[0].disconnectedAt, 1000);
  f.core.connect(f.host.token, 'host2');
  assert.equal(f.core.state.players[0].disconnectedAt, null);
});
