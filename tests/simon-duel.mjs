import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createDuel, sequenceFor, submitAttempt, startAttempt, validSnapshot, validateInputs, cpuInputs } from '../simon/duel.mjs';

const good = (state, slot) => ({ round: state.round, inputs: sequenceFor(state.seed, state.round, state.length, slot) });
const bad = (state, slot) => ({ round: state.round, inputs: [(sequenceFor(state.seed, state.round, state.length, slot)[0] + 1) % 4] });

test('Simon preserves the original component pads, tone frequencies and high-score key', () => {
  const source = fs.readFileSync(new URL('../simon/SimonGame.tsx', import.meta.url), 'utf8');
  const original = fs.readFileSync(new URL('../upstream/SimonGame.tsx', import.meta.url), 'utf8');
  for (const value of ['bg-cyan-600', 'bg-purple-600', 'bg-pink-600', 'bg-green-600', '261.63, 329.63, 392.00, 523.25', "'simonHighScore'", 'max-w-[280px]', 'Simon Protocol']) {
    assert.ok(source.includes(value), value); assert.ok(original.includes(value), `upstream: ${value}`);
  }
  assert.match(source, /flash\(color, 400, epoch\)/);
  assert.match(source, /delay\(100, epoch\)/);
});

test('Simon patterns are deterministic, different for players, equal length and valid pads', () => {
  for (let seed = 0; seed < 80; seed++) {
    for (const length of [1, 2, 9, 24]) {
      const a = sequenceFor(seed, 4, length, 0);
      const b = sequenceFor(seed, 4, length, 1);
      assert.deepEqual(a, sequenceFor(seed, 4, length, 0));
      assert.equal(a.length, length); assert.equal(b.length, length);
      assert.notDeepEqual(a, b);
      assert.ok([...a, ...b].every(i => Number.isInteger(i) && i >= 0 && i < 4));
    }
  }
});

test('Simon does not award a win when only the first player fails', () => {
  const initial = createDuel('fair');
  const one = submitAttempt(initial, 0, bad(initial, 0));
  assert.equal(one.status, 'playing'); assert.equal(one.winner, null);
  assert.equal(one.round, 1); assert.equal(one.length, 1);
  assert.equal(one.attempts[0].passed, false); assert.equal(one.attempts[1], null);
});

test('Simon both pass increases length exactly once and clears old attempts', () => {
  const s = createDuel('pass');
  const one = submitAttempt(s, 1, good(s, 1));
  const two = submitAttempt(one, 0, good(one, 0));
  assert.equal(two.round, 2); assert.equal(two.length, 2); assert.equal(two.status, 'playing');
  assert.deepEqual(two.attempts, [null, null]); assert.deepEqual(two.started, [false, false]);
  assert.deepEqual(two.last.outcomes, [true, true]);
  assert.equal(submitAttempt(two, 0, good(s, 0)), two, 'late previous-round attempt ignored');
});

test('Simon both fail starts fresh same-length patterns with no winner', () => {
  const initial = createDuel('tie');
  const one = submitAttempt(initial, 0, bad(initial, 0));
  const two = submitAttempt(one, 1, bad(one, 1));
  assert.equal(two.round, 2); assert.equal(two.length, 1); assert.equal(two.winner, null);
  assert.deepEqual(two.attempts, [null, null]); assert.deepEqual(two.last.outcomes, [false, false]);
});

test('Simon win resolution is independent of which player finishes first', () => {
  for (const winner of [0, 1]) for (const first of [0, 1]) {
    let state = createDuel('order');
    const attempt = slot => slot === winner ? good(state, slot) : bad(state, slot);
    state = submitAttempt(state, first, attempt(first));
    state = submitAttempt(state, 1 - first, attempt(1 - first));
    assert.equal(state.status, 'finished'); assert.equal(state.winner, winner);
    assert.ok(validSnapshot(state, 'order'));
  }
});

test('Simon does not trust forged pass values or accept invalid/incomplete attempts', () => {
  const s = { ...createDuel('validation'), length: 3, round: 3 };
  const pattern = sequenceFor(s.seed, s.round, s.length, 0);
  for (const inputs of [null, [], [pattern[0]], [-1], [4], ['1'], [NaN], [...pattern, 0]]) {
    assert.equal(submitAttempt(s, 0, { round: 3, passed: true, inputs }), s);
  }
  assert.equal(validateInputs(pattern, [(pattern[0] + 1) % 4, pattern[1]]), null);
  const result = submitAttempt(s, 0, { ...bad(s, 0), passed: true });
  assert.equal(result.attempts[0].passed, false);
});

test('Simon duplicate, wrong-slot, old-round and post-match submissions cannot mutate state', () => {
  const s = createDuel('duplicate');
  const one = submitAttempt(s, 0, good(s, 0));
  assert.equal(submitAttempt(one, 0, bad(s, 0)), one);
  assert.equal(submitAttempt(one, 3, good(s, 1)), one);
  assert.equal(submitAttempt(one, 1, { ...good(s, 1), round: 9 }), one);
  const done = submitAttempt(one, 1, bad(s, 1));
  assert.equal(submitAttempt(done, 1, good(done, 1)), done);
});

test('Simon restart seed does not retain old results or attempt starts', () => {
  let old = createDuel('old'); old = startAttempt(old, 0, 1); old = submitAttempt(old, 0, bad(old, 0));
  const fresh = createDuel('new');
  assert.deepEqual(fresh.attempts, [null, null]); assert.deepEqual(fresh.started, [false, false]);
  assert.equal(fresh.length, 1); assert.equal(fresh.last, null); assert.equal(fresh.status, 'playing');
  assert.equal(validSnapshot(old, fresh.seed), false);
});

test('Simon started attempt flag is idempotent, serialized and rejects stale round', () => {
  const s = createDuel('resume'); const started = startAttempt(s, 1, 1);
  assert.deepEqual(started.started, [false, true]);
  assert.equal(startAttempt(started, 1, 1), started);
  assert.equal(startAttempt(started, 0, 0), started);
  assert.ok(validSnapshot(JSON.parse(JSON.stringify(started)), 'resume'));
});

test('Simon snapshots reject corrupted state and false winners', () => {
  const s = createDuel('snapshot');
  for (const value of [null, {}, { ...s, round: 0 }, { ...s, length: 2 }, { ...s, attempts: [] },
    { ...s, started: ['false', false] }, { ...s, winner: 1 }, { ...s, status: 'finished', winner: 0 },
    { ...s, attempts: [{ passed: true, inputs: bad(s, 0).inputs }, null] }]) {
    assert.equal(validSnapshot(value, 'snapshot'), false);
  }
});

test('Simon CPU produces actual valid pattern attempts and eventually makes mistakes', () => {
  let failures = 0;
  for (let round = 1; round <= 40; round++) {
    const seq = sequenceFor('cpu-test', round, round, 1);
    const inputs = cpuInputs('cpu-test', round, round);
    assert.deepEqual(inputs, cpuInputs('cpu-test', round, round));
    const outcome = validateInputs(seq, inputs);
    assert.notEqual(outcome, null);
    if (!outcome) failures++;
  }
  assert.ok(failures > 15);
});

test('Simon round resolution never mutates a previous serialized snapshot', () => {
  const s = createDuel('immutable'); const before = JSON.stringify(s);
  submitAttempt(s, 0, good(s, 0)); startAttempt(s, 0, 1);
  assert.equal(JSON.stringify(s), before);
});

test('Simon component reset cancels timers, resolves pending waits and stops audio', () => {
  const source = fs.readFileSync(new URL('../simon/SimonGame.tsx', import.meta.url), 'utf8');
  assert.match(source, /generation\.current\+\+/);
  assert.match(source, /clearTimeout\(timer\); resolve\(false\)/);
  assert.match(source, /oscillator\.stop\(\); oscillator\.disconnect\(\)/);
  assert.match(source, /if \(!inputEnabled\.current\) return/);
  assert.match(source, /void audioContextRef\.current\.close\(\)/);
});

test('Simon host resume does not rehydrate an old snapshot over its recovered offline attempt', () => {
  const checkpoint = createDuel('offline-host');
  const guestFinished = submitAttempt(checkpoint, 1, good(checkpoint, 1));
  const completedOffline = good(guestFinished, 0);
  // onStart hydrates saved checkpoint then reapplies the persisted host attempt.
  const recovered = submitAttempt(JSON.parse(JSON.stringify(guestFinished)), 0, completedOffline);
  assert.equal(recovered.round, 2); assert.equal(recovered.length, 2);
  // Shared client then invokes onSnapshot with the pre-recovery checkpoint.
  // The adapter must ignore host snapshots: onStart already handled hydration.
  const source = fs.readFileSync(new URL('../simon/main.tsx', import.meta.url), 'utf8');
  const callbackSource = source.slice(source.indexOf('onSnapshot:'), source.indexOf('onPresence:'))
    .replace(/^onSnapshot:\s*/, '').trim().replace(/,\s*$/, '').replace(': any', '');
  const current = { current: recovered }, mp = { current: { isHost: true } };
  const callback = vm.runInNewContext(`(${callbackSource})`, {
    mp, state: current, currentMatch: { current: 'match' }, validSnapshot,
    accept: next => { current.current = next; }, localSlot: { current: 0 },
    progress: { current: null }, queuedAttempt: { current: null },
  });
  callback({ snapshot: guestFinished, slot: 0, matchId: 'match' });
  assert.equal(current.current, recovered);
  assert.equal(current.current.round, 2);
  // The identical production callback still accepts valid host state on a guest.
  mp.current.isHost = false; current.current = checkpoint;
  callback({ snapshot: recovered, slot: 0, matchId: 'match' });
  assert.equal(current.current, recovered);
});
