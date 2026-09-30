// Pure math for Companion Racing. No React, no DOM: safe to unit test.
//
// Finish times use competing exponentials: racer i gets
//   T_i = BASE + K * E_i   with   E_i ~ Exp(rate = baseSpeed_i).
// The argmin (the winner) then satisfies P(i wins) = baseSpeed_i / total
// EXACTLY, for any lineup, by the memoryless property of the exponential.
// That is precisely the probability model the posted odds assume
// (odds = 0.9 / p), so every bet now carries the advertised ~10% house
// edge. A per-tick random-walk simulation was used before; in a
// first-to-finish race a per-tick edge compounds, so the favorite was
// winning far more often than speed-share implied (player edge ~+5%).
//
// Why exponentials and not a Gumbel draw: T_i >= BASE always, so the
// lower clamp can never bind and distort the argmin. (A Gumbel form
// needs a probabilistic lower clamp that demonstrably biased results.)

export interface RaceEntrant {
  id: string;
  baseSpeed: number;
}

// Scale (ms) of the exponential draw. Sets the spread of finish times;
// the win probabilities do not depend on it.
const EXP_K_MS = 4000;
// Base offset (ms). Every finish time is >= BASE, so races last ~10-20s
// and the lower clamp below is purely a safety net.
const FINISH_BASE_MS = 14000;
const MIN_FINISH_MS = 3000;
const MAX_FINISH_MS = 30000;

/**
 * Draw one finish time per entrant (ms). The argmin wins with
 * probability exactly baseSpeed_i / totalSpeed. The upper clamp binds
 * for a racer ~2% of the time but can only change the argmin when EVERY
 * racer clamps (probability ~1e-7 for a 4-racer lineup); the lower clamp
 * never binds since T_i >= FINISH_BASE_MS > MIN_FINISH_MS always.
 */
export function drawFinishTimes(
  entrants: RaceEntrant[],
  random: () => number = Math.random,
): Map<string, number> {
  const times = new Map<string, number>();
  for (const e of entrants) {
    const w = Math.max(e.baseSpeed, 1e-6);
    const u = 1 - random(); // in (0, 1]
    const expSample = -Math.log(u) / w; // Exp(rate = w)
    const t = FINISH_BASE_MS + EXP_K_MS * expSample;
    times.set(e.id, Math.min(MAX_FINISH_MS, Math.max(MIN_FINISH_MS, t)));
  }
  return times;
}

/** Posted odds: 10% house edge under the speed-share probability model. */
export function raceOdds(entrants: RaceEntrant[]): Map<string, number> {
  const totalSpeed = entrants.reduce((sum, r) => sum + r.baseSpeed, 0);
  const odds = new Map<string, number>();
  for (const racer of entrants) {
    const winProbability = totalSpeed > 0 ? racer.baseSpeed / totalSpeed : 0;
    const calculated = Math.max(1.2, (1 / winProbability) * 0.9);
    odds.set(racer.id, Math.round(calculated * 10) / 10);
  }
  return odds;
}

/** Advertised win probability in percent (now exactly true). */
export function raceWinProbabilityPct(entrant: RaceEntrant, all: RaceEntrant[]): number {
  const totalSpeed = all.reduce((sum, r) => sum + r.baseSpeed, 0);
  if (totalSpeed <= 0) return 0;
  return (entrant.baseSpeed / totalSpeed) * 100;
}
