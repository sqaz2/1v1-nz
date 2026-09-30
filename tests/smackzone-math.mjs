// Smackzone casino math regression tests.
// Guards the two real-money-math fixes:
//  - Asteroid Keno payouts must give the house ~10% edge on a 40-number game
//    (a previous 80-number-keno table returned 150%-2457% to the player).
//  - Companion Racing win probabilities must match the posted speed-share
//    odds (the old per-tick random-walk sim let the favorite win far more
//    often than advertised: a ~5% player edge).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  KENO_PAYOUT_TABLE,
  kenoHitProbability,
  kenoRtp,
  kenoPayoutChips,
} from '../smackzone/src/lib/keno-math.ts';
import {
  drawFinishTimes,
  raceOdds,
} from '../smackzone/src/lib/racing-math.ts';

test('keno: hit probabilities sum to 1 for every pick count', () => {
  for (let picks = 1; picks <= 10; picks++) {
    let total = 0;
    for (let hits = 0; hits <= picks; hits++) total += kenoHitProbability(picks, hits);
    assert.ok(Math.abs(total - 1) < 1e-9, `picks=${picks} sums to ${total}`);
  }
});

test('keno: every pick count returns ~90% (house edge ~10%)', () => {
  for (let picks = 1; picks <= 10; picks++) {
    const rtp = kenoRtp(picks);
    assert.ok(rtp > 0.87 && rtp < 0.93, `picks=${picks} RTP=${rtp.toFixed(4)}`);
  }
});

test('keno: payouts are whole chips (wallet requires integers)', () => {
  for (let picks = 1; picks <= 10; picks++) {
    for (const bet of [1, 3, 7, 10, 15, 50, 100, 500]) {
      for (let hits = 0; hits <= picks; hits++) {
        const payout = kenoPayoutChips(bet, picks, hits);
        assert.ok(Number.isInteger(payout), `bet=${bet} picks=${picks} hits=${hits}`);
        assert.ok(payout >= 0, 'payout never negative');
        assert.ok(payout <= bet * (KENO_PAYOUT_TABLE[picks][hits] || 0), 'payout <= bet*multiplier');
      }
    }
  }
});

test('racing: drawn winners match speed-share probabilities', () => {
  const lineups = [
    // House lineup (the common case).
    [
      { id: 'a', baseSpeed: 1.2 },
      { id: 'b', baseSpeed: 1.1 },
      { id: 'c', baseSpeed: 1.3 },
      { id: 'd', baseSpeed: 1.0 },
    ],
    // Player creatures can join with bondDifficulty 1-5 -> speeds 1.1-1.5.
    [
      { id: 'a', baseSpeed: 1.5 },
      { id: 'b', baseSpeed: 1.1 },
      { id: 'c', baseSpeed: 1.3 },
      { id: 'd', baseSpeed: 1.0 },
    ],
    [
      { id: 'a', baseSpeed: 1.4 },
      { id: 'b', baseSpeed: 1.5 },
      { id: 'c', baseSpeed: 1.2 },
      { id: 'd', baseSpeed: 1.3 },
    ],
  ];
  for (const lineup of lineups) {
    const total = lineup.reduce((s, r) => s + r.baseSpeed, 0);
    const wins = new Map(lineup.map((r) => [r.id, 0]));
    const N = 120000;
    for (let i = 0; i < N; i++) {
      const times = drawFinishTimes(lineup);
      let winner = lineup[0].id;
      let best = Infinity;
      for (const r of lineup) {
        const t = times.get(r.id);
        assert.ok(t >= 3000 && t <= 30000, `finish time ${t} in sane bounds`);
        if (t < best) {
          best = t;
          winner = r.id;
        }
      }
      wins.set(winner, wins.get(winner) + 1);
    }
    for (const r of lineup) {
      const expected = r.baseSpeed / total;
      const observed = wins.get(r.id) / N;
      assert.ok(
        Math.abs(observed - expected) < 0.006,
        `${r.id}: observed ${observed.toFixed(4)} vs expected ${expected.toFixed(4)}`,
      );
    }
  }
});

test('racing: posted odds give the house ~10% edge on every entrant', () => {
  const lineup = [
    { id: 'a', baseSpeed: 1.2 },
    { id: 'b', baseSpeed: 1.1 },
    { id: 'c', baseSpeed: 1.3 },
    { id: 'd', baseSpeed: 1.0 },
  ];
  const odds = raceOdds(lineup);
  const total = lineup.reduce((s, r) => s + r.baseSpeed, 0);
  const wins = new Map(lineup.map((r) => [r.id, 0]));
  const N = 120000;
  for (let i = 0; i < N; i++) {
    const times = drawFinishTimes(lineup);
    let winner = lineup[0].id;
    let best = Infinity;
    for (const r of lineup) {
      const t = times.get(r.id);
      if (t < best) {
        best = t;
        winner = r.id;
      }
    }
    wins.set(winner, wins.get(winner) + 1);
  }
  for (const r of lineup) {
    const p = r.baseSpeed / total;
    const o = odds.get(r.id);
    const rtp = (wins.get(r.id) / N) * o;
    // Expected RTP is p*o (odds are rounded to 1dp, so ~0.9 not exactly).
    assert.ok(Math.abs(rtp - p * o) < 0.02, `${r.id}: RTP=${rtp.toFixed(4)}`);
    assert.ok(rtp < 1.0, `${r.id}: house edge must be positive, got RTP=${rtp.toFixed(4)}`);
    assert.ok(rtp > 0.85, `${r.id}: edge must stay near 10%, got RTP=${rtp.toFixed(4)}`);
  }
});
