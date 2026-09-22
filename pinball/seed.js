/* Runs before the original engine: stable initial state for both players. */
(function (root) {
  'use strict';
  function hashSeed(value) {
    let n = 2166136261;
    for (const c of String(value)) n = Math.imul(n ^ c.charCodeAt(0), 16777619);
    return n >>> 0;
  }
  function rng(seed) {
    let state = hashSeed(seed);
    const next = () => {
      state = (state + 0x6D2B79F5) >>> 0;
      let t = state;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
    next.getState = () => state;
    next.setState = value => { state = value >>> 0; };
    return next;
  }
  if (typeof module !== 'undefined') module.exports = {rng, hashSeed};
  if (!root.location) return;
  const params = new URLSearchParams(root.location.search);
  const duel = params.get('duel') === '1';
  const seed = params.get('seed') || 'solo';
  root.PinballConfig = {duel, seed, runId: params.get('run') || 'solo', slot: Number(params.get('slot') || 0)};
  if (!duel) return;
  const gameRandom = rng(seed), visualRandom = rng(seed + ':visual');
  Math.random = gameRandom;
  let last = null, accumulated = 0;
  root.PinballClock = {
    paused: false,
    rng: gameRandom,
    reset() { last = null; accumulated = 0; },
    frame(now, tick, draw) {
      if (!Number.isFinite(now)) now = performance.now();
      if (last == null) last = now;
      const elapsed = Math.min(100, Math.max(0, now - last));
      last = now;
      if (!this.paused) {
        accumulated += elapsed;
        while (accumulated >= 1000 / 60) { tick(); accumulated -= 1000 / 60; }
      }
      const previous = Math.random;
      Math.random = visualRandom;
      try { draw(); } finally { Math.random = previous; }
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
