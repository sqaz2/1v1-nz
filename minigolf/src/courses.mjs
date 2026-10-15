// StarMuff Mini Golf course data. Pure data + pure helpers, shared by physics, renderer, CPU and tests.
// Grid: x = column, z = row (row 0 is the far end). One cell = 1 world unit.
// ' ' void · '.' floor · 'T' tee · 'H' cup · 'o' bumper · '/' ramp rising toward row 0 · '=' plateau · 'h' cup on plateau
export const PLATEAU = 0.5;
export const BALL_R = 0.07;
export const CUP_R = 0.11;
export const MAX_STROKES = 6;

export const THEMES = {
  anchorage: { name: 'Anchorage', sky: 'anchorage-surface.webp', card: 'anchorage-card.webp', felt: 0x2f9fb4, felt2: 0x2788a0, rail: 0xdfeff6, accent: 0x7dd3fc, fog: 0x0d2233 },
  smackzone: { name: 'Smackzone', sky: 'smackzone-approach.webp', card: 'smackzone-card.webp', felt: 0xb0367d, felt2: 0x962c6b, rail: 0xffb347, accent: 0xff4fd8, fog: 0x1b0a1f },
  crown: { name: 'Crown of Six Stars', sky: 'smackzone-approach.webp', card: 'anchorage-card.webp', felt: 0x5b3fb8, felt2: 0x4d34a0, rail: 0xffd54a, accent: 0xffe27a, fog: 0x120a26 },
};

export const HOLES = [
  { id: 'anchorage-landing', name: 'Anchorage Landing', theme: 'anchorage', par: 2, decor: [],
    map: ['...', '.H.', '...', '...', '...', '...', '.T.', '...'] },
  { id: 'dockyard-dogleg', name: 'Dockyard Dogleg', theme: 'anchorage', par: 3, decor: [{ model: 'muffin-wrapper', x: 5, z: 4.5, scale: 1.4 }],
    map: ['.......', '.....H.', '.......', '...', '...', '...', '.T.', '...'] },
  { id: 'ice-shelf', name: 'Ice Shelf Ramp', theme: 'anchorage', par: 3, decor: [],
    map: ['===', '=h=', '===', '///', '...', '...', '.T.', '...'] },
  { id: 'bumper-pit', name: 'Smackzone Bumper Pit', theme: 'smackzone', par: 3, decor: [{ model: 'muffin-wrapper', x: -1.6, z: 1.5, scale: 1.2 }],
    map: ['.....', '..H..', '.o.o.', '.....', '..o..', '.o.o.', '.....', '..T..', '.....'] },
  { id: 'null-cube-gate', name: 'Null-Cube Gate', theme: 'smackzone', par: 3, decor: [],
    movers: [{ model: 'null-cube', z: 3.5, x0: 0.45, x1: 1.55, size: 0.9, period: 240 }],
    map: ['...', '.H.', '...', '...', '...', '...', '...', '.T.', '...'] },
  { id: 'crown-of-six-stars', name: 'Crown of Six Stars', theme: 'crown', par: 4, decor: [{ model: 'crown-of-six-stars', x: -1.4, z: 0.2, scale: 1.3 }],
    map: ['H.....', '......', '....o.', '    ..', '    ..', '.....', '.....', '..', '.T', '..'] },
];
export const DEFAULT_COURSE = HOLES.map(h => h.id);
export const QUICK_COURSE = ['anchorage-landing', 'bumper-pit', 'crown-of-six-stars'];
export const holeById = id => HOLES.find(h => h.id === id);

const FLOOR = new Set(['.', 'T', 'H', 'o', '/', '=', 'h']);
export function cellAt(hole, col, row) { const r = hole.map[row]; if (!r || col < 0) return ' '; return r[col] || ' '; }
export const isFloor = ch => FLOOR.has(ch);
export const cellTop = ch => (ch === '=' || ch === 'h') ? PLATEAU : 0;

export function cells(hole) {
  const out = [];
  hole.map.forEach((line, row) => { for (let col = 0; col < line.length; col++) if (isFloor(line[col])) out.push({ col, row, ch: line[col] }); });
  return out;
}
export function find(hole, chars) { const c = cells(hole).find(c => chars.includes(c.ch)); if (!c) throw new Error(`Hole ${hole.id} missing ${chars}`); return c; }
export function teePos(hole) { const c = find(hole, 'T'); return [c.col, cellTop(c.ch) + BALL_R, c.row]; }
export function cupPos(hole) { const c = find(hole, 'Hh'); return [c.col, cellTop(c.ch), c.row]; }

// Deterministic, trig-free mover path (triangle wave on integer ticks).
export function moverPos(m, tick) {
  const t = ((tick % m.period) + m.period) % m.period, half = m.period / 2;
  const u = t < half ? t / half : 2 - t / half;
  return [m.x0 + (m.x1 - m.x0) * u, m.size / 2, m.z];
}

// Grid distance field from cup, used by CPU and validation.
export function distanceField(hole) {
  const cup = find(hole, 'Hh'), key = (c, r) => c + ',' + r, dist = new Map([[key(cup.col, cup.row), 0]]), q = [[cup.col, cup.row]];
  while (q.length) { const [c, r] = q.shift(), d = dist.get(key(c, r));
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nc = c + dc, nr = r + dr; if (isFloor(cellAt(hole, nc, nr)) && !dist.has(key(nc, nr))) { dist.set(key(nc, nr), d + 1); q.push([nc, nr]); } } }
  return (x, z) => { const v = dist.get(key(Math.round(x), Math.round(z))); return v === undefined ? 99 : v; };
}

export function validateHole(hole) {
  const errors = [];
  try { teePos(hole); cupPos(hole); } catch (e) { errors.push(e.message); }
  if (!(hole.par >= 2 && hole.par <= 5)) errors.push('par');
  if (!THEMES[hole.theme]) errors.push('theme');
  if (!errors.length) { const d = distanceField(hole), t = teePos(hole); if (d(t[0], t[2]) === 99) errors.push('tee not connected to cup'); }
  for (const c of cells(hole)) if (c.ch === '/' && !isFloor(cellAt(hole, c.col, c.row - 1))) errors.push('ramp leads nowhere');
  return errors;
}
