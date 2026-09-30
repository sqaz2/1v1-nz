// Pure math for Asteroid Keno. No React, no DOM: safe to unit test.
//
// Game: 20 numbers drawn from a 40-number grid, player picks 1-10.
// Payout multipliers below are calibrated for THIS game (40 numbers),
// targeting ~90% return-to-player on every pick count (house edge ~10%).
// A previous table was built for 80-number keno and returned 150%-2457%.

export const KENO_GRID_SIZE = 40;
export const KENO_DRAWS = 20;
export const KENO_MAX_PICKS = 10;
export const KENO_MIN_PICKS = 1;

export const KENO_PAYOUT_TABLE: Record<number, Record<number, number>> = {
  1: { 0: 0, 1: 1.8 },
  2: { 0: 0, 1: 0.5, 2: 2.6 },
  3: { 0: 0, 1: 0, 2: 1, 3: 4.5 },
  4: { 0: 0, 1: 0, 2: 0.5, 3: 1.5, 4: 6 },
  5: { 0: 0, 1: 0, 2: 0, 3: 1, 4: 2, 5: 12 },
  6: { 0: 0, 1: 0, 2: 0, 3: 0.5, 4: 1, 5: 3, 6: 25 },
  7: { 0: 0, 1: 0, 2: 0, 3: 0.3, 4: 0.5, 5: 1.5, 6: 6, 7: 45 },
  8: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0.4, 5: 0.8, 6: 2.5, 7: 10, 8: 90 },
  9: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0.2, 5: 0.4, 6: 1, 7: 4, 8: 25, 9: 220 },
  10: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0.3, 6: 0.8, 7: 2, 8: 7, 9: 35, 10: 500 },
};

function combination(n: number, k: number): number {
  if (k > n || k < 0) return 0;
  if (k === 0 || k === n) return 1;
  // Multiplicative form to avoid factorial overflow.
  let result = 1;
  const kk = Math.min(k, n - k);
  for (let i = 1; i <= kk; i++) {
    result = (result * (n - kk + i)) / i;
  }
  return result;
}

/** Hypergeometric P(exactly `hits` matches | `picks` picks). */
export function kenoHitProbability(picks: number, hits: number): number {
  if (picks < 1 || hits < 0 || hits > picks) return 0;
  return (
    (combination(picks, hits) *
      combination(KENO_GRID_SIZE - picks, KENO_DRAWS - hits)) /
    combination(KENO_GRID_SIZE, KENO_DRAWS)
  );
}

/** Expected return per 1 chip bet for a given pick count. */
export function kenoRtp(picks: number): number {
  const payouts = KENO_PAYOUT_TABLE[picks];
  if (!payouts) return 0;
  let ev = 0;
  for (let hits = 0; hits <= picks; hits++) {
    ev += kenoHitProbability(picks, hits) * (payouts[hits] || 0);
  }
  return ev;
}

/** Whole-chip payout. Quantum Chip balances must stay integers. */
export function kenoPayoutChips(bet: number, picks: number, hits: number): number {
  const multiplier = KENO_PAYOUT_TABLE[picks]?.[hits] || 0;
  return Math.floor(bet * multiplier);
}

export function kenoMinMatchesToWin(pickCount: number): number {
  const payouts = KENO_PAYOUT_TABLE[pickCount];
  if (!payouts) return 1;
  for (let i = 0; i <= pickCount; i++) {
    if (payouts[i] > 0) return i;
  }
  return pickCount;
}

/** Human-readable odds for one payout cell, e.g. "12.5%" or "1 in 42". */
export function kenoCellOdds(picks: number, matches: number): string {
  if (picks === 0 || matches > picks) return '-';
  const probability = kenoHitProbability(picks, matches);
  if (probability === 0) return '0%';
  if (probability >= 0.01) return `${(probability * 100).toFixed(1)}%`;
  return `1 in ${Math.round(1 / probability).toLocaleString()}`;
}
