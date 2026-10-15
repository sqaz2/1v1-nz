// StarMuff Mini Golf course data. Pure data + pure helpers, shared by physics, renderer, CPU and tests.
// Grid: x = column, z = row (row 0 is the far end). One cell = 1 world unit.
// ' ' void · '.' floor · 'T' tee · 'H' cup · 'o' bumper · '/' ramp rising toward row 0 · '=' plateau · 'h' cup on plateau
// 'p' portal pad: exactly two per hole, they teleport the ball to each other (see physics.mjs).
// 's' sand: floor that bleeds ball speed fast while the ball rolls over it (see physics.mjs).
// 'j' jump ramp: steep wedge + lip rising toward row 0; launches the ball airborne over the trap
// in front of it (must have sand or void in front). Air is fast but scatters on landing.
export const PLATEAU = 0.5;
export const JUMP_H = 0.32;
export const BALL_R = 0.07;
export const CUP_R = 0.11;
export const PORTAL_R = 0.34;
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
    map: ['.......', '.....H.', '..ss...', '...', '...', '...', '.T.', '...'] },
  { id: 'ice-shelf', name: 'Ice Shelf Ramp', theme: 'anchorage', par: 3, decor: [],
    map: ['===', '=h=', '===', '///', '...', '...', '.T.', '...'] },
  { id: 'bumper-pit', name: 'Smackzone Bumper Pit', theme: 'smackzone', par: 3, decor: [{ model: 'muffin-wrapper', x: -1.6, z: 1.5, scale: 1.2 }],
    map: ['.....', '..H..', '.o.o.', '..s..', '..o..', '.o.o.', '.....', '..T..', '.....'] },
  { id: 'null-cube-gate', name: 'Null-Cube Gate', theme: 'smackzone', par: 3, decor: [],
    movers: [{ model: 'null-cube', z: 3.5, x0: 0.45, x1: 1.55, size: 0.9, period: 240 }],
    map: ['...', '.H.', '...', '...', '...', '...', '...', '.T.', '...'] },
  { id: 'crown-of-six-stars', name: 'Crown of Six Stars', theme: 'crown', par: 4, decor: [{ model: 'crown-of-six-stars', x: -1.4, z: 0.2, scale: 1.3 }],
    map: ['H.....', '.ss...', '....o.', '    ..', '    ..', '.....', '.....', '..', '.T', '..'] },
  { id: 'portal-panic', name: 'Portal Panic', theme: 'smackzone', par: 3, decor: [],
    map: ['..H....', '.......', '.p.....', '.......', '      .', '      .', '.......', '....pT.', '.......'] },
  { id: 'loop-the-loop', name: 'Loop-the-Loop', theme: 'crown', par: 3, decor: [{ model: 'crown-of-six-stars', x: -1.6, z: 4, scale: 1.1 }],
    loops: [{ x: 2, z: 5 }],
    map: ['...H.', '.....', 'o...o', '.....', '..ss.', '.....', '.s.s.', '..T..', '.....'] },
  { id: 'twin-gates', name: 'Twin Gates', theme: 'anchorage', par: 4, decor: [{ model: 'muffin-wrapper', x: 5.4, z: 4, scale: 1.3 }],
    movers: [{ model: 'null-cube', z: 4, x0: 0.4, x1: 3.6, size: 0.8, period: 200 },
             { model: 'muffin-wrapper', z: 6, x0: 3.6, x1: 0.4, size: 0.8, period: 260 }],
    map: ['=====', '==h==', '/////', '.s.s.', '.....', '.....', '.....', '..T..', '.....'] },
  { id: 'trap-jump', name: 'Trap Jump', theme: 'smackzone', par: 3, decor: [],
    map: ['.....', '..H..', '.....', '.....', 'sssss', '  j  ', '.....', '..T..', '.....'] },
];
export const DEFAULT_COURSE = HOLES.map(h => h.id);
export const QUICK_COURSE = ['anchorage-landing', 'bumper-pit', 'crown-of-six-stars'];
export const holeById = id => HOLES.find(h => h.id === id);

const FLOOR = new Set(['.', 'T', 'H', 'o', '/', '=', 'h', 'p', 's', 'j']);
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
// Portal pads come in exactly one pair; returns [[x, topY, z], [x, topY, z]] or [] when the hole has none.
export function portalPads(hole) { const ps = cells(hole).filter(c => c.ch === 'p'); return ps.length === 2 ? ps.map(c => [c.col, cellTop(c.ch), c.row]) : []; }

// Loop-the-loop track. The path is the track SURFACE centerline: a clothoid entry (curvature
// ramps 0 -> 1/R), a circular top, a clothoid exit, with a steady lateral drift of one column
// across the loop — a helix, like the real steel loops, so entry and exit strands never cross.
// A flat lead-in (s<0) covers the entry lane and a flat lead-out ends on the exit lane.
// Physics rides a fast ball along this path (see physics.mjs); the renderer sweeps it too.
const LOOP_R = 0.6, LOOP_L1 = 1.15, LOOP_DS = 0.05;
const LOOP_PHI1 = LOOP_L1 / (2 * LOOP_R), LOOP_L2 = (2 * Math.PI - 2 * LOOP_PHI1) * LOOP_R, LOOP_LTOT = 2 * LOOP_L1 + LOOP_L2;
function loopKappa(s) { if (s < LOOP_L1) return s / (LOOP_L1 * LOOP_R); if (s < LOOP_L1 + LOOP_L2) return 1 / LOOP_R; const u = (s - LOOP_L1 - LOOP_L2) / LOOP_L1; return (1 - u) / LOOP_R; }
export function loopPath(hole) {
  const L = (hole.loops || [])[0]; if (!L) return null;
  const top = cellTop(cellAt(hole, L.x, L.z)), pts = [];
  let y = top, z = L.z + 1, phi = 0, s = -1;
  const push = () => { const u = Math.min(1, Math.max(0, s) / LOOP_LTOT), sm = u * u * (3 - 2 * u); pts.push({ x: L.x + sm, y, z, phi, s }); };
  push();
  while (s < 0) { const ds = Math.min(LOOP_DS, -s); z -= ds; s += ds; push(); }
  while (s < LOOP_LTOT) { const ds = Math.min(LOOP_DS, LOOP_LTOT - s), km = loopKappa(s + ds / 2), pm = phi + km * ds / 2;
    y += Math.sin(pm) * ds; z -= Math.cos(pm) * ds; phi += km * ds; s += ds; push(); }
  for (let k = 0; k < 12; k++) { z -= LOOP_DS; s += LOOP_DS; pts.push({ x: L.x + 1, y: top, z, phi: 0, s }); }
  return pts;
}

// Deterministic, trig-free mover path (triangle wave on integer ticks).
export function moverPos(m, tick) {
  const t = ((tick % m.period) + m.period) % m.period, half = m.period / 2;
  const u = t < half ? t / half : 2 - t / half;
  return [m.x0 + (m.x1 - m.x0) * u, m.size / 2, m.z];
}

// Grid distance field from cup, used by CPU and validation.
export function distanceField(hole) {
  const cup = find(hole, 'Hh'), key = (c, r) => c + ',' + r, dist = new Map([[key(cup.col, cup.row), 0]]), q = [[cup.col, cup.row]];
  const pads = cells(hole).filter(c => c.ch === 'p'), pair = new Map();
  if (pads.length === 2) { pair.set(key(pads[0].col, pads[0].row), pads[1]); pair.set(key(pads[1].col, pads[1].row), pads[0]); }
  while (q.length) { const [c, r] = q.shift(), d = dist.get(key(c, r));
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nc = c + dc, nr = r + dr; if (isFloor(cellAt(hole, nc, nr)) && !dist.has(key(nc, nr))) { dist.set(key(nc, nr), d + 1); q.push([nc, nr]); } }
    const pr = pair.get(key(c, r)); if (pr && !dist.has(key(pr.col, pr.row))) { dist.set(key(pr.col, pr.row), d + 1); q.push([pr.col, pr.row]); } }
  return (x, z) => { const v = dist.get(key(Math.round(x), Math.round(z))); return v === undefined ? 99 : v; };
}

export function validateHole(hole) {
  const errors = [];
  try { teePos(hole); cupPos(hole); } catch (e) { errors.push(e.message); }
  if (!(hole.par >= 2 && hole.par <= 5)) errors.push('par');
  if (!THEMES[hole.theme]) errors.push('theme');
  if (!errors.length) { const d = distanceField(hole), t = teePos(hole); if (d(t[0], t[2]) === 99) errors.push('tee not connected to cup'); }
  for (const c of cells(hole)) if (c.ch === '/' && !isFloor(cellAt(hole, c.col, c.row - 1))) errors.push('ramp leads nowhere');
  for (const c of cells(hole)) if (c.ch === 'j') { const f = cellAt(hole, c.col, c.row - 1); if (f !== 's' && f !== ' ') errors.push('jump ramp needs a trap in front'); }
  const np = cells(hole).filter(c => c.ch === 'p').length; if (np !== 0 && np !== 2) errors.push('portals must come in pairs');
  for (const L of hole.loops || []) { if (!isFloor(cellAt(hole, L.x, L.z))) errors.push('loop entry must be on floor');
    if (!isFloor(cellAt(hole, L.x + 1, L.z - 2))) errors.push('loop exit lane must be floor'); }
  return errors;
}
