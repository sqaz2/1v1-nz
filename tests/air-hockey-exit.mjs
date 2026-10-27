import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeResume, decodeResume, shouldTrapBack, RESUME_TTL_MS } from '../air-hockey/exit-guard.mjs';

const snap = {
  phase: 'play', tick: 42,
  puck: { x: 500, y: 800, vx: 100, vy: -200 },
  paddles: [{ x: 500, y: 1400, touching: false }, { x: 500, y: 200, touching: false }],
  scores: [3, 2], winner: null, serveTimer: 0, serveTo: 0,
};
const base = {
  mode: 'cpu', difficulty: 'hard', scores: [3, 2],
  series: { me: 1, opp: 0 }, matchCount: 2, snap, savedAt: 1_000_000,
};

test('resume round-trips through encode/decode', () => {
  const out = decodeResume(encodeResume(base), 1_000_000 + 1000);
  assert.deepEqual(out, base);
});

test('decode rejects garbage, empty, and non-JSON input', () => {
  assert.equal(decodeResume(''), null);
  assert.equal(decodeResume('not json'), null);
  assert.equal(decodeResume(null), null);
});

test('decode rejects wrong mode, wrong difficulty, and finished-phase snaps', () => {
  assert.equal(decodeResume(encodeResume({ ...base, mode: 'online' })), null);
  assert.equal(decodeResume(encodeResume({ ...base, difficulty: 'insane' })), null);
  assert.equal(decodeResume(encodeResume({ ...base, snap: { ...snap, phase: 'finished' } })), null);
  assert.equal(decodeResume(encodeResume({ ...base, snap: null })), null);
});

test('decode rejects stale and future-dated payloads, accepts the TTL boundary', () => {
  const str = encodeResume(base);
  assert.equal(decodeResume(str, 1_000_000 + RESUME_TTL_MS + 1), null);
  assert.equal(decodeResume(str, 1_000_000 - 1), null);
  assert.notEqual(decodeResume(str, 1_000_000 + RESUME_TTL_MS), null);
});

test('shouldTrapBack: only a live, guarded match with no exit in progress', () => {
  assert.equal(shouldTrapBack({ screen: 'play', guardArmed: true, leaving: false }), true);
  assert.equal(shouldTrapBack({ screen: 'menu', guardArmed: true, leaving: false }), false);
  assert.equal(shouldTrapBack({ screen: 'end', guardArmed: true, leaving: false }), false);
  assert.equal(shouldTrapBack({ screen: 'play', guardArmed: false, leaving: false }), false);
  assert.equal(shouldTrapBack({ screen: 'play', guardArmed: true, leaving: true }), false);
});
