import test from 'node:test';
import assert from 'node:assert/strict';
import { RoomCore, LIMITS } from '../multiplayer/room-core.mjs';

function fixture(game = 'skirmish') {
  let ticks = 1000, tokenIndex = 0;
  const core = new RoomCore(null, { now: () => ticks, token: () => String(++tokenIndex).padStart(48, '0'), seed: () => 42 });
  const host = core.create('ABCDEFGH', game), guest = core.join(game);
  core.connect(host.token, 'host'); core.connect(guest.token, 'guest');
  const seq = [0, 0];
  const send = (slot, value) => core.receive(slot, slot ? 'guest' : 'host', JSON.stringify({ seq: ++seq[slot], matchId: core.state.matchId, ...value }));
  const start = () => { send(0, { kind: 'ready', ready: true }); send(1, { kind: 'ready', ready: true }); };
  return { core, host, guest, seq, send, start, advance: n => { ticks += n; } };
}

test('only two reserved seats; join validates game and resume token', () => {
  const f = fixture();
  assert.throws(() => f.core.join('skirmish'), { code: 'full' });
  assert.throws(() => f.core.join('simon', f.host.token), { code: 'wrong-game' });
  assert.throws(() => f.core.join('skirmish', 'fake'), { code: 'unauthorized' });
  assert.equal(f.core.join('skirmish', f.guest.token).slot, 1);
  assert.ok(!JSON.stringify(f.core.view()).includes(f.host.token), 'public view must never expose bearer tokens');
});

test('both connected ready seats required; rematch creates new epoch and clears previous world', () => {
  const f = fixture(); f.send(0, { kind: 'ready', ready: true }); assert.equal(f.core.state.phase, 'lobby');
  f.send(1, { kind: 'ready', ready: true }); const first = f.core.state.matchId;
  f.send(0, { kind: 'snapshot', snapshot: { health: [0, 100] } }); f.send(0, { kind: 'finish', result: { winner: 1 } });
  assert.equal(f.core.state.phase, 'finished'); assert.ok(f.core.state.players.every(p => !p.ready));
  f.send(0, { kind: 'ready', ready: true }); assert.equal(f.core.state.phase, 'finished');
  f.send(1, { kind: 'ready', ready: true });
  assert.notEqual(f.core.state.matchId, first); assert.equal(f.core.state.snapshot, null); assert.equal(f.core.state.result, null); assert.deepEqual(f.core.state.events, []);
});

test('host authority, stale match rejection, sequence dedupe and gap rejection', () => {
  const f = fixture(); f.start();
  assert.throws(() => f.send(1, { kind: 'snapshot', snapshot: {} }), { code: 'host-only' });
  assert.throws(() => f.send(1, { kind: 'finish', result: { winner: 1 } }), { code: 'host-only' });
  assert.throws(() => f.send(0, { kind: 'event', type: 'fire', data: {}, matchId: 'old' }), { code: 'stale-match' });
  const effects = f.send(1, { kind: 'event', type: 'input', data: { fire: true } });
  assert.equal(effects.at(-1).to, 0); assert.equal(effects.at(-1).message.slot, 1);
  const repeat = f.core.receive(1, 'guest', JSON.stringify({ seq: f.seq[1], kind: 'event' }));
  assert.equal(repeat[0].message.duplicate, true); assert.equal(f.core.state.events.length, 1);
  assert.throws(() => f.core.receive(1, 'guest', JSON.stringify({ seq: 500, kind: 'event' })), { code: 'sequence-gap' });
});

test('disconnect pauses commands; reconnect gets snapshot and later peer events; old socket cannot control seat', () => {
  const f = fixture(); f.start(); f.send(0, { kind: 'snapshot', snapshot: { turn: 4, health: [80, 50] } });
  f.send(1, { kind: 'event', type: 'aim', data: { angle: 45 } });
  f.core.disconnect(1, 'guest');
  assert.throws(() => f.send(0, { kind: 'event', type: 'fire', data: {} }), { code: 'paused' });
  const restored = f.core.connect(f.guest.token, 'new-guest');
  assert.equal(restored.welcome.matchId, f.core.state.matchId); assert.equal(restored.welcome.snapshot.turn, 4); assert.equal(restored.welcome.events.length, 1);
  assert.equal(restored.welcome.nextSeq, f.seq[1] + 1);
  assert.throws(() => f.send(1, { kind: 'event', type: 'aim', data: {} }), { code: 'connection' });
  f.core.disconnect(1, 'guest'); assert.equal(f.core.state.players[1].connected, true, 'late close on old socket must not evict resumed seat');
});

test('oversized payloads, malformed JSON, rate bursts and expired rooms are bounded', () => {
  const f = fixture(); f.start();
  assert.throws(() => f.send(1, { kind: 'event', type: 'input', data: 'a'.repeat(LIMITS.event + 1) }), { code: 'size' });
  assert.throws(() => f.core.receive(0, 'host', 'bad json'), { code: 'json' });
  for (let i = 0; i < LIMITS.rate - 2; i++) f.core.receive(0, 'host', JSON.stringify({ kind: 'sync' }));
  assert.throws(() => f.core.receive(0, 'host', JSON.stringify({ kind: 'sync' })), { code: 'rate' });
  f.advance(LIMITS.ttl + 1); assert.throws(() => f.core.join('skirmish', f.host.token), { code: 'expired' });
});

test('serialized checkpoint retains seeds, sequences and snapshots', () => {
  const f = fixture('tetris'); f.start(); f.send(0, { kind: 'snapshot', snapshot: { board: [[1, 0]], rng: 400 } });
  const restored = new RoomCore(JSON.parse(JSON.stringify(f.core.state)), { now: () => 2000 });
  const welcome = restored.connect(f.host.token, 'replacement').welcome;
  assert.equal(welcome.seed, 42); assert.equal(welcome.matchId, f.core.state.matchId); assert.deepEqual(welcome.snapshot, { board: [[1, 0]], rng: 400 });
  assert.equal(welcome.nextSeq, f.seq[0] + 1);
});

test('leaving closes rather than recycling an active seat into another match', () => {
  const f = fixture(); f.start(); const effects = f.send(1, { kind: 'leave' });
  assert.equal(effects.at(-1).message.kind, 'closed'); assert.throws(() => f.core.join('skirmish'), { code: 'closed' });
});

test('snapshot watermark preserves guest commands the host had not yet observed', () => {
  const f = fixture(); f.start();
  f.send(1, { kind: 'event', type: 'fire', data: { turnId: 1 } });
  f.send(0, { kind: 'snapshot', snapshot: { turnId: 1, fired: false }, appliedThrough: 0 });
  assert.equal(f.core.state.snapshotSeq, 0);
  assert.equal(f.core.state.events.length, 1, 'An older host snapshot cannot discard the in-flight guest fire.');
  f.send(1, { kind: 'event', type: 'aim', data: { turnId: 2, angle: 45 } });
  f.send(0, { kind: 'snapshot', snapshot: { turnId: 2, fired: true }, appliedThrough: 1 });
  assert.equal(f.core.state.snapshotSeq, 1);
  assert.deepEqual(f.core.state.events.map(event => event.serverSeq), [2], 'Only acknowledged/applied guest input may be retired.');
  const recovered = f.core.connect(f.host.token, 'recovered-host').welcome;
  assert.equal(recovered.snapshot.turnId, 2);
  assert.equal(recovered.events.length, 1);
  assert.equal(recovered.events[0].type, 'aim');
  assert.equal(recovered.events[0].data.angle, 45);
});

test('future and negative snapshot watermarks cannot erase retained recovery history', () => {
  const f = fixture(); f.start();
  f.send(1, { kind: 'event', type: 'input', data: { fire: true } });
  f.send(0, { kind: 'snapshot', snapshot: { frame: 10 }, appliedThrough: 0 });
  for (const appliedThrough of [-1, 2, 0.5]) {
    assert.throws(() => f.send(0, { kind: 'snapshot', snapshot: { forged: true }, appliedThrough }), { code: 'snapshot-sequence' });
    assert.deepEqual(f.core.state.snapshot, { frame: 10 });
    assert.equal(f.core.state.events.length, 1);
  }
});
