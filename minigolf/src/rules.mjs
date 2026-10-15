// Pure match rules: turns, strokes, scoring, command validation. No physics, no DOM.
import { holeById, teePos, cupPos, MAX_STROKES, DEFAULT_COURSE } from './courses.mjs';

export const VERSION = 1;
export function createMatch({ seed = 1, course = DEFAULT_COURSE, names = ['Player 1', 'Player 2'], solo = false } = {}) {
  course.forEach(id => { if (!holeById(id)) throw new Error('Unknown hole ' + id); });
  const first = solo ? 0 : (seed >>> 0) & 1, tee = teePos(holeById(course[0]));
  return { version: VERSION, seed: seed >>> 0, course: [...course], names: [...names], holeIdx: 0, turn: first, turnId: 1,
    strokes: [course.map(() => 0), course.map(() => 0)], pos: [[...tee], [...tee]], holed: [false, !!solo], picked: [false, false], solo: !!solo,
    phase: 'aim', winner: null, lastShot: null, message: '' };
}
export const hole = s => holeById(s.course[s.holeIdx]);
export const totals = s => s.strokes.map(row => row.reduce((a, b) => a + b, 0));
export const moverPhase = s => (s.turnId * 37 + s.holeIdx * 11) % 240;

export function validShot(s, slot, cmd) {
  if (!s || s.phase !== 'aim' || slot !== s.turn || !cmd || typeof cmd !== 'object') return false;
  const ints = ['turnId', 'dx', 'dz', 'power'].every(k => Number.isInteger(cmd[k]));
  if (!ints || cmd.turnId !== s.turnId) return false;
  if (Math.abs(cmd.dx) > 1000 || Math.abs(cmd.dz) > 1000 || (cmd.dx === 0 && cmd.dz === 0)) return false;
  return cmd.power >= 1 && cmd.power <= 1000;
}
export const shotOf = (s, slot, cmd) => ({ slot, turnId: cmd.turnId, dx: cmd.dx, dz: cmd.dz, power: cmd.power, start: [...s.pos[slot]], hole: s.holeIdx, phase: moverPhase(s) });

function dist2(p, c) { const dx = p[0] - c[0], dz = p[2] - c[2]; return dx * dx + dz * dz; }

// Apply a simulated result. result = { end:[x,y,z], holed:bool, out:bool }
export function applyResult(s, shot, result) {
  if (s.phase !== 'aim' || shot.turnId !== s.turnId || shot.slot !== s.turn) return false;
  const p = shot.slot, h = s.holeIdx;
  s.strokes[p][h] += 1 + (result.out ? 1 : 0);
  if (!result.out) s.pos[p] = [...result.end];
  s.lastShot = { ...shot, end: [...s.pos[p]], holed: !!result.holed, out: !!result.out };
  if (result.holed) { s.holed[p] = true; s.message = `${s.names[p]} holed out in ${s.strokes[p][h]}!`; }
  else if (s.strokes[p][h] >= MAX_STROKES) { s.strokes[p][h] = MAX_STROKES; s.holed[p] = true; s.picked[p] = true; s.message = `${s.names[p]} picks up at ${MAX_STROKES}.`; }
  else s.message = result.out ? `${s.names[p]} went out of bounds: +1 penalty.` : '';
  s.turnId += 1;
  if (s.holed[0] && s.holed[1]) return nextHole(s), true;
  const open = [0, 1].filter(i => !s.holed[i]);
  if (open.length === 1) s.turn = open[0];
  else { const cup = cupPos(hole(s)), d0 = dist2(s.pos[0], cup), d1 = dist2(s.pos[1], cup); s.turn = d0 === d1 ? 1 - p : d0 > d1 ? 0 : 1; }
  return true;
}
function nextHole(s) {
  const h = s.holeIdx, a = s.strokes[0][h], b = s.strokes[1][h];
  if (s.holeIdx + 1 >= s.course.length) {
    const [t0, t1] = totals(s); s.phase = 'finished';
    if (s.solo) { const par = s.course.reduce((a, id) => a + holeById(id).par, 0), d = t0 - par; s.winner = null; s.message = `Round complete: ${t0} strokes (${d === 0 ? 'even par' : d > 0 ? '+' + d : d}).`; return; } s.winner = t0 === t1 ? 'draw' : t0 < t1 ? 0 : 1;
    s.message = s.winner === 'draw' ? `Draw at ${t0} strokes.` : `${s.names[s.winner]} wins ${Math.min(t0, t1)} to ${Math.max(t0, t1)}.`; return;
  }
  s.holeIdx += 1; const tee = teePos(hole(s));
  s.pos = [[...tee], [...tee]]; s.holed = [false, s.solo]; s.picked = [false, false];
  s.turn = s.solo ? 0 : a === b ? s.turn : a < b ? 0 : 1; // honour
}
export const publicState = s => JSON.parse(JSON.stringify(s));
