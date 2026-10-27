/** Air Hockey — pure simulation for 1v1.nz.
 *
 * Table units: width 1000, length 1600 (portrait). Canonical orientation:
 * side 0 defends the BOTTOM goal (y = L), side 1 defends the TOP goal (y = 0).
 * Online guests render flipped 180° so their own goal is at the bottom; the
 * simulation itself always runs in canonical coordinates.
 *
 * The two hard rules live here, not just in the UI:
 *  - a paddle only collides while its touch flag is true;
 *  - a paddle position is always clamped into its owner's net area (zone).
 * A modified client gains nothing: the host re-clamps every input.
 */

// ---- Table geometry (fractions from the spec, in table units) ----
export const TABLE_W = 1000;
export const TABLE_L = 1600;
export const GOAL_MOUTH = 350; // 35% of table width, centered
export const ZONE_W = 700; // 2x goal mouth
export const ZONE_D = 400; // 25% of table length
export const MALLET_R = 45; // ~4.5% of table width
export const PUCK_R = 28; // ~2.8% of table width
export const GOALS_TO_WIN = 7;

export const MAX_SPEED = 2300; // readable cap on phones
export const MIN_SPEED = 280; // floor so a dead puck never stalls a rally
export const WALL_KEEP = 0.98;
export const SPEED_UP = 1.02; // +2% per bounce
export const RESTITUTION = 0.9; // paddle bounce on the relative normal velocity
export const FLICK_GAIN = 0.35; // share of paddle velocity added along the normal
export const FRICTION = 0.10; // exponential damping per second (low glide loss)
export const SERVE_DELAY = 0.9; // short ready beat, no countdown timer
export const SERVE_SPEED = 760;
export const MAX_PADDLE_SPEED = 4000; // sanity cap on input velocity (anti-cheat)

export const DT = 1 / 120; // fixed timestep

export const GOAL_X0 = (TABLE_W - GOAL_MOUTH) / 2; // 325
export const GOAL_X1 = (TABLE_W + GOAL_MOUTH) / 2; // 675
const POST_R = 4;

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const hypot = (x, y) => Math.sqrt(x * x + y * y);

/** Net area (paddle zone) for a side: center-allowed rectangle. */
export function zoneRect(side) {
  const x0 = (TABLE_W - ZONE_W) / 2, x1 = (TABLE_W + ZONE_W) / 2;
  return side === 0
    ? { x0, x1, y0: TABLE_L - ZONE_D, y1: TABLE_L }
    : { x0, x1, y0: 0, y1: ZONE_D };
}

export function inZone(x, y, side) {
  const z = zoneRect(side);
  return x >= z.x0 && x <= z.x1 && y >= z.y0 && y <= z.y1;
}

/** Clamp a paddle center into its owner's zone. Returns {x, y, clamped}. */
export function clampToZone(x, y, side) {
  const z = zoneRect(side);
  const cx = clamp(x, z.x0, z.x1), cy = clamp(y, z.y0, z.y1);
  return { x: cx, y: cy, clamped: cx !== x || cy !== y };
}

function blankPaddle(side) {
  const z = zoneRect(side);
  return { x: TABLE_W / 2, y: side === 0 ? (z.y0 + z.y1) / 2 : (z.y0 + z.y1) / 2, vx: 0, vy: 0, touching: false };
}

export function createMatch({ firstServer = 1, rng = Math.random } = {}) {
  return {
    tick: 0, phase: 'serve', rng,
    puck: { x: TABLE_W / 2, y: TABLE_L / 2, vx: 0, vy: 0 },
    paddles: [blankPaddle(0), blankPaddle(1)],
    scores: [0, 0], winner: null,
    serveTimer: SERVE_DELAY, serveTo: firstServer,
    events: [],
  };
}

/** Apply one side's input. Positions are re-clamped and velocity capped here,
 *  so the host can trust nothing about a guest's numbers. */
export function applyInput(state, side, input) {
  const p = state.paddles[side];
  if (!input || !input.touching) { p.touching = false; p.vx = 0; p.vy = 0; return; }
  const c = clampToZone(input.x, input.y, side);
  p.x = c.x; p.y = c.y; p.touching = true;
  const sp = hypot(input.vx || 0, input.vy || 0);
  if (sp > MAX_PADDLE_SPEED) {
    p.vx = (input.vx / sp) * MAX_PADDLE_SPEED;
    p.vy = (input.vy / sp) * MAX_PADDLE_SPEED;
  } else { p.vx = input.vx || 0; p.vy = input.vy || 0; }
}

function launchServe(state) {
  // Puck travels toward the conceder's goal so the conceder strikes first.
  const angle = (state.rng() - 0.5) * 0.7; // ±~20° off the vertical
  const dir = state.serveTo === 0 ? 1 : -1; // side 0's goal is at the bottom (+y)
  state.puck.vx = Math.sin(angle) * SERVE_SPEED;
  state.puck.vy = dir * Math.cos(angle) * SERVE_SPEED;
  state.phase = 'play';
  state.events.push({ type: 'serve', to: state.serveTo });
}

function goal(state, scorer) {
  const conceder = 1 - scorer;
  state.scores[scorer]++;
  state.events.push({ type: 'goal', scorer, conceder });
  if (state.scores[scorer] >= GOALS_TO_WIN) {
    state.phase = 'finished'; state.winner = scorer;
    state.events.push({ type: 'match', winner: scorer });
    return;
  }
  state.phase = 'serve';
  state.serveTimer = SERVE_DELAY;
  state.serveTo = conceder;
  state.puck.x = TABLE_W / 2; state.puck.y = TABLE_L / 2;
  state.puck.vx = 0; state.puck.vy = 0;
}

function bounceSpeed(vx, vy, keep) {
  let sx = vx * keep, sy = vy * keep;
  const sp = hypot(sx, sy) * SPEED_UP;
  if (sp > MAX_SPEED) { sx = (sx / hypot(sx, sy)) * MAX_SPEED; sy = (sy / hypot(sx, sy)) * MAX_SPEED; }
  return [sx, sy];
}

/** Advance the simulation one fixed step. Returns the events of this step. */
export function step(state, dt = DT) {
  state.events.length = 0;
  if (state.phase === 'serve') {
    state.serveTimer -= dt;
    if (state.serveTimer <= 0) launchServe(state);
    return state.events;
  }
  if (state.phase !== 'play') return state.events;
  state.tick++;

  const puck = state.puck;
  const damp = Math.exp(-FRICTION * dt);
  puck.vx *= damp; puck.vy *= damp;
  puck.x += puck.vx * dt; puck.y += puck.vy * dt;

  // Side walls.
  if (puck.x < PUCK_R) { puck.x = PUCK_R; [puck.vx, puck.vy] = bounceSpeed(Math.abs(puck.vx), puck.vy, WALL_KEEP); state.events.push({ type: 'wall' }); }
  else if (puck.x > TABLE_W - PUCK_R) { puck.x = TABLE_W - PUCK_R; [puck.vx, puck.vy] = bounceSpeed(-Math.abs(puck.vx), puck.vy, WALL_KEEP); state.events.push({ type: 'wall' }); }

  // Goal posts (small circles at the mouth corners).
  const posts = [[GOAL_X0, 0], [GOAL_X1, 0], [GOAL_X0, TABLE_L], [GOAL_X1, TABLE_L]];
  for (const [px, py] of posts) {
    const dx = puck.x - px, dy = puck.y - py, d = hypot(dx, dy), min = PUCK_R + POST_R;
    if (d > 0 && d < min) {
      const nx = dx / d, ny = dy / d;
      puck.x = px + nx * min; puck.y = py + ny * min;
      const vn = puck.vx * nx + puck.vy * ny;
      if (vn < 0) {
        puck.vx -= 2 * vn * nx; puck.vy -= 2 * vn * ny;
        [puck.vx, puck.vy] = bounceSpeed(puck.vx, puck.vy, WALL_KEEP);
        state.events.push({ type: 'wall' });
      }
    }
  }

  // Goal lines: inside the mouth is a goal, outside it is a wall.
  if (puck.y <= 0) {
    if (puck.x >= GOAL_X0 && puck.x <= GOAL_X1) { goal(state, 0); return state.events; }
    puck.y = 0; [puck.vx, puck.vy] = bounceSpeed(puck.vx, Math.abs(puck.vy), WALL_KEEP); state.events.push({ type: 'wall' });
  } else if (puck.y >= TABLE_L) {
    if (puck.x >= GOAL_X0 && puck.x <= GOAL_X1) { goal(state, 1); return state.events; }
    puck.y = TABLE_L; [puck.vx, puck.vy] = bounceSpeed(puck.vx, -Math.abs(puck.vy), WALL_KEEP); state.events.push({ type: 'wall' });
  }

  // Paddles: only a touching paddle exists. Lift mid-rally and the goal stands open.
  for (let side = 0; side < 2; side++) {
    const p = state.paddles[side];
    if (!p.touching) continue;
    const dx = puck.x - p.x, dy = puck.y - p.y, d = hypot(dx, dy), min = PUCK_R + MALLET_R;
    if (d >= min) continue;
    const nx = d > 0 ? dx / d : 0, ny = d > 0 ? dy / d : (side === 0 ? -1 : 1);
    // Positional correction: puck pushed out along the contact normal.
    puck.x = p.x + nx * min; puck.y = p.y + ny * min;
    const rvx = puck.vx - p.vx, rvy = puck.vy - p.vy;
    const vn = rvx * nx + rvy * ny;
    if (vn < 0) {
      puck.vx -= (1 + RESTITUTION) * vn * nx;
      puck.vy -= (1 + RESTITUTION) * vn * ny;
      // Flick: a moving paddle adds power along the normal.
      const push = Math.max(0, p.vx * nx + p.vy * ny) * FLICK_GAIN;
      puck.vx += nx * push; puck.vy += ny * push;
      const sp = hypot(puck.vx, puck.vy) * SPEED_UP;
      if (sp > MAX_SPEED) { puck.vx = (puck.vx / hypot(puck.vx, puck.vy)) * MAX_SPEED; puck.vy = (puck.vy / hypot(puck.vx, puck.vy)) * MAX_SPEED; }
      state.events.push({ type: 'paddle', side });
    }
  }

  // Speed cap and minimum floor: a dead puck never stalls a rally (no re-serve needed).
  const sp = hypot(puck.vx, puck.vy);
  if (sp > MAX_SPEED) { puck.vx = (puck.vx / sp) * MAX_SPEED; puck.vy = (puck.vy / sp) * MAX_SPEED; }
  else if (sp > 0 && sp < MIN_SPEED) { puck.vx = (puck.vx / sp) * MIN_SPEED; puck.vy = (puck.vy / sp) * MIN_SPEED; }
  else if (sp === 0) { puck.vx = MIN_SPEED * 0.7; puck.vy = MIN_SPEED * 0.7; }
  return state.events;
}

/** Predict the x where a puck path crosses a horizontal line, with wall bounces. */
export function predictX(x, vx, seconds, width = TABLE_W) {
  const raw = x + vx * seconds;
  const period = 2 * width;
  let m = ((raw % period) + period) % period;
  return m > width ? period - m : m;
}

// ---- CPU opponent ----
// The CPU paddle is always visible (it has no thumb) but obeys the same zone
// clamp, with a human-like reaction delay. Stated honestly, not hidden.

export function createCpu(difficulty = 'hard') {
  const hard = difficulty === 'hard';
  return {
    difficulty,
    delay: hard ? 0.09 : 0.26,
    maxSpeed: hard ? 1500 : 850,
    error: hard ? 12 : 70,
    pos: { x: TABLE_W / 2, y: 200 },
    vel: { x: 0, y: 0 },
    history: [], // {t, x, y, vx, vy}
    seed: 0,
  };
}

export function cpuInput(cpu, state, side, now, dt) {
  const puck = state.puck;
  cpu.history.push({ t: now, x: puck.x, y: puck.y, vx: puck.vx, vy: puck.vy });
  while (cpu.history.length && now - cpu.history[0].t > cpu.delay + 0.2) cpu.history.shift();
  let delayed = cpu.history[0] || { x: puck.x, y: puck.y, vx: puck.vx, vy: puck.vy };
  for (const s of cpu.history) if (now - s.t <= cpu.delay) { delayed = s; break; }

  const z = zoneRect(side);
  const towardCpu = side === 1 ? delayed.vy < 0 : delayed.vy > 0;
  let tx, ty;
  if (towardCpu && state.phase === 'play') {
    // Anticipate: where the puck crosses the far edge of the CPU zone.
    const edgeY = side === 1 ? z.y1 : z.y0;
    const tHit = delayed.vy !== 0 ? Math.abs((edgeY - delayed.y) / delayed.vy) : 0;
    tx = predictX(delayed.x, delayed.vx, Math.min(tHit, 1.2));
    ty = side === 1 ? Math.min(edgeY - 40, z.y1 - 60) : Math.max(edgeY + 40, z.y0 + 60);
    // Flick: lunge through the puck when it is close and approaching.
    const d = hypot(puck.x - cpu.pos.x, puck.y - cpu.pos.y);
    if (cpu.difficulty === 'hard' && d < 190) {
      const nx = puck.x - cpu.pos.x, ny = puck.y - cpu.pos.y, nl = hypot(nx, ny) || 1;
      tx = puck.x + (nx / nl) * 70; ty = puck.y + (ny / nl) * 70;
    }
  } else {
    // Return home, shading slightly toward the puck.
    tx = TABLE_W / 2 + (puck.x - TABLE_W / 2) * 0.3;
    ty = side === 1 ? 170 : TABLE_L - 170;
  }
  // Human-like looseness (deterministic-ish wobble from tick, not pure noise).
  cpu.seed = (cpu.seed * 1103515245 + 12345) & 0x7fffffff;
  const wobble = ((cpu.seed / 0x7fffffff) - 0.5) * 2 * cpu.error;
  tx += wobble;

  const c = clampToZone(tx, ty, side);
  const dx = c.x - cpu.pos.x, dy = c.y - cpu.pos.y, dist = hypot(dx, dy);
  const maxStep = cpu.maxSpeed * dt;
  const stepLen = Math.min(dist, maxStep);
  const nx = dist > 0 ? dx / dist : 0, ny = dist > 0 ? dy / dist : 0;
  const newX = cpu.pos.x + nx * stepLen, newY = cpu.pos.y + ny * stepLen;
  cpu.vel = { x: dt > 0 ? (newX - cpu.pos.x) / dt : 0, y: dt > 0 ? (newY - cpu.pos.y) / dt : 0 };
  cpu.pos = { x: newX, y: newY };
  return { x: newX, y: newY, vx: cpu.vel.x, vy: cpu.vel.y, touching: true };
}

/** Small JSON snapshot for the online host/guest exchange. */
export function snapshot(state) {
  return {
    tick: state.tick, phase: state.phase,
    puck: { x: state.puck.x, y: state.puck.y, vx: state.puck.vx, vy: state.puck.vy },
    paddles: state.paddles.map(p => ({ x: p.x, y: p.y, touching: p.touching })),
    scores: [...state.scores], winner: state.winner,
    serveTimer: state.serveTimer, serveTo: state.serveTo,
  };
}

export function restoreSnapshot(state, snap) {
  state.tick = snap.tick; state.phase = snap.phase;
  state.puck.x = snap.puck.x; state.puck.y = snap.puck.y;
  state.puck.vx = snap.puck.vx; state.puck.vy = snap.puck.vy;
  snap.paddles.forEach((p, i) => {
    state.paddles[i].x = p.x; state.paddles[i].y = p.y; state.paddles[i].touching = p.touching;
  });
  state.scores = [...snap.scores]; state.winner = snap.winner;
  state.serveTimer = snap.serveTimer; state.serveTo = snap.serveTo;
}
