// The duel adapter surrounds StarMuff's original Simon Protocol; it does not
// replace its renderer, audio, or pattern playback.
export function hashSeed(value) {
  let n = 2166136261;
  for (const c of String(value)) n = Math.imul(n ^ c.charCodeAt(0), 16777619);
  return n >>> 0;
}

export function sequenceFor(seed, round, length, slot) {
  let state = hashSeed(`${seed}:simon:${round}`);
  const random = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const base = Array.from({ length }, () => Math.floor(random() * 4));
  if (slot === 0) return base;
  // Independent random draws, with a guaranteed different first pad. A player
  // watching the other screen never receives their own pattern as a preview.
  const other = Array.from({ length }, () => Math.floor(random() * 4));
  if (other[0] === base[0]) other[0] = (base[0] + 1 + Math.floor(random() * 3)) % 4;
  return other;
}

export function createDuel(seed) {
  return { kind: 'simon-v1', seed: String(seed), round: 1, length: 1,
    attempts: [null, null], started: [false, false], status: 'playing', winner: null, last: null };
}

export function startAttempt(state, slot, round) {
  if (state.status !== 'playing' || state.round !== round || (slot !== 0 && slot !== 1)
    || state.started[slot] || state.attempts[slot]) return state;
  const started = [...state.started]; started[slot] = true;
  return { ...state, started };
}

export function validateInputs(sequence, inputs) {
  if (!Array.isArray(inputs) || !inputs.length || inputs.length > sequence.length
    || inputs.some(i => !Number.isInteger(i) || i < 0 || i > 3)) return null;
  const wrong = inputs.findIndex((value, index) => value !== sequence[index]);
  // A completed attempt ends at its FIRST wrong press, or at the final correct
  // press. Incomplete/correct prefixes and forged success booleans are ignored.
  if (wrong === -1) return inputs.length === sequence.length ? true : null;
  return wrong === inputs.length - 1 ? false : null;
}

export function submitAttempt(state, slot, payload) {
  if (!state || state.status !== 'playing' || (slot !== 0 && slot !== 1)
    || payload?.round !== state.round || state.attempts[slot] !== null) return state;
  const passed = validateInputs(sequenceFor(state.seed, state.round, state.length, slot), payload.inputs);
  if (passed === null) return state;
  const attempts = [...state.attempts];
  attempts[slot] = { passed, inputs: [...payload.inputs] };
  const started = [...state.started]; started[slot] = true;
  if (attempts.some(attempt => attempt === null)) return { ...state, attempts, started };
  const [a, b] = attempts;
  if (a.passed !== b.passed) {
    return { ...state, attempts, started, status: 'finished', winner: a.passed ? 0 : 1,
      last: { round: state.round, length: state.length, outcomes: attempts.map(attempt => attempt.passed) } };
  }
  return { ...state, round: state.round + 1, length: state.length + (a.passed ? 1 : 0),
    attempts: [null, null], started: [false, false],
    last: { round: state.round, length: state.length, outcomes: attempts.map(attempt => attempt.passed) } };
}

export function validSnapshot(value, seed) {
  if (!value || value.kind !== 'simon-v1' || value.seed !== String(seed)
    || !Number.isSafeInteger(value.round) || value.round < 1
    || !Number.isSafeInteger(value.length) || value.length < 1 || value.length > value.round
    || !Array.isArray(value.attempts) || value.attempts.length !== 2
    || !Array.isArray(value.started) || value.started.length !== 2 || value.started.some(v => typeof v !== 'boolean')
    || !['playing', 'finished'].includes(value.status)) return false;
  if (!value.attempts.every((a, slot) => a === null || (typeof a.passed === 'boolean'
    && validateInputs(sequenceFor(seed, value.round, value.length, slot), a.inputs) === a.passed))) return false;
  if (value.status === 'finished') {
    const [a, b] = value.attempts;
    return !!a && !!b && a.passed !== b.passed && value.winner === (a.passed ? 0 : 1);
  }
  return value.winner === null && value.attempts.some(a => a === null);
}

export function cpuInputs(seed, round, length) {
  const sequence = sequenceFor(seed, round, length, 1);
  const accuracy = Math.max(0.50, 0.995 - length * 0.012);
  return sequence.reduce((inputs, color, index) => {
    if (inputs.some((value, i) => value !== sequence[i])) return inputs;
    const roll = hashSeed(`${seed}:cpu:${round}:${index}`) / 4294967296;
    return [...inputs, roll < accuracy ? color : (color + 1) % 4];
  }, []);
}
