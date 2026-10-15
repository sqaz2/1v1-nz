// CPU opponent: searches real simulated shots, scores landing spots by grid distance to cup.
import { simulateShot } from './physics.mjs';
import { distanceField, cupPos } from './courses.mjs';

export const LEVELS = { easy: { angles: 16, powers: [260, 420, 600, 800], noise: 70 }, normal: { angles: 24, powers: [220, 340, 480, 640, 820, 1000], noise: 25 }, hard: { angles: 36, powers: [200, 300, 400, 520, 660, 820, 1000], noise: 0 } };

export function candidates(level = 'normal') {
  const L = LEVELS[level], out = [];
  for (let i = 0; i < L.angles; i++) { const a = (i / L.angles) * Math.PI * 2; for (const power of L.powers) out.push({ dx: Math.round(Math.cos(a) * 1000), dz: Math.round(Math.sin(a) * 1000), power }); }
  return out;
}
export function score(hole, res) {
  if (res.holed) return -100; if (res.out) return 50;
  const d = distanceField(hole), c = cupPos(hole), e = res.end;
  return d(e[0], e[2]) * 1.5 + Math.hypot(e[0] - c[0], e[2] - c[2]);
}
// Generator so the browser can spread work across frames.
export function* chooseShot(hole, start, phase, level = 'normal', rand = Math.random) {
  let best = null, bestScore = Infinity, n = 0;
  for (const c of candidates(level)) {
    const res = simulateShot(hole, { ...c, start, phase }, { record: false }), sc = score(hole, res);
    if (sc < bestScore) { bestScore = sc; best = c; }
    if (++n % 8 === 0) yield null;
  }
  const noise = LEVELS[level].noise, j = () => Math.round((rand() * 2 - 1) * noise);
  const dx = Math.max(-1000, Math.min(1000, best.dx + j())), dz = Math.max(-1000, Math.min(1000, best.dz + j()));
  return { dx: dx || 1, dz, power: Math.max(1, Math.min(1000, best.power + j())) };
}
export function chooseShotSync(...args) { const g = chooseShot(...args); let r; while (!(r = g.next()).done); return r.value; }
