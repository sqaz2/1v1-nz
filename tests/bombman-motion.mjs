// Bomb Man continuous movement: glide through tiles, frame-rate independence, corner assist,
// buffered turns, bomb pass-through and kick. Runs the real bmMotion block from bomberman/index.html.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(path.join(root, 'bomberman/index.html'), 'utf8');
const live = readFileSync(path.join(root, 'bomberman/live.js'), 'utf8');
const src = html.slice(html.indexOf('/* bmMotion:start */'), html.indexOf('/* bmMotion:end */'));
assert.ok(src.includes('function bmMoveActor'), 'bmMotion block missing');
const M = new Function(`${src}; return {bmStep,bmMoveActor,bmSpeed,BM_MOTION};`)();

// '#' hard block, '.' floor. Classic pillars on odd/odd cells.
function world(rows, { bombs = [], kick = false } = {}) {
  const g = { rows: rows.map(r => r.split('')), bombs: bombs.map(([x, z]) => ({ x, z })), kicks: 0 };
  const solid = (x, z) => z < 0 || z >= g.rows.length || x < 0 || x >= g.rows[0].length || g.rows[z][x] === '#';
  g.env = a => ({
    open: (x, z) => { if (solid(x, z)) return false; const b = g.bombs.find(q => q.x === x && q.z === z); return !b || (Math.abs(a.fx - x) < .999 && Math.abs(a.fz - z) < .999); },
    push: kick ? (x, z, d) => { const b = g.bombs.find(q => q.x === x && q.z === z); if (!b) return false; const dx = d === 'right' ? 1 : d === 'left' ? -1 : 0, dz = d === 'down' ? 1 : d === 'up' ? -1 : 0; if (solid(b.x + dx, b.z + dz)) return false; b.x += dx; b.z += dz; g.kicks++; return true; } : null,
  });
  return g;
}
const actor = (fx, fz) => ({ x: Math.round(fx), z: Math.round(fz), fx, fz });
function run(g, a, input, seconds, fps = 60, speed = M.bmSpeed(1), onFrame) {
  const dt = 1 / fps, frames = Math.round(seconds * fps); const trace = [];
  for (let i = 0; i < frames; i++) { const inp = typeof input === 'function' ? input(i * dt, a) : input; M.bmMoveActor(a, inp, dt, speed, g.env(a)); trace.push([a.fx, a.fz]); onFrame?.(a, i); }
  return trace;
}
const OPEN_ROW = ['...........', '.#.#.#.#.#.', '...........'];

test('holding a direction glides across several tiles without stopping at tile centres', () => {
  const g = world(OPEN_ROW), a = actor(0, 0);
  const tr = run(g, a, { dir: 'right' }, 0.9);
  assert.ok(a.fx > 2.5, `expected > 2.5 tiles, got ${a.fx.toFixed(2)}`);
  for (let i = 1; i < tr.length; i++) {
    const d = tr[i][0] - tr[i - 1][0];
    assert.ok(d > 0.05, `frame ${i}: stalled at x=${tr[i][0].toFixed(3)} (step ${d.toFixed(4)})`);
    assert.ok(Math.abs(d - M.bmSpeed(1) / 60) < 1e-9, 'constant speed every frame');
    assert.equal(tr[i][1], 0, 'stays in its lane');
  }
  assert.equal(a.x, Math.round(a.fx), 'tile = nearest tile');
  assert.equal(a.facing, 'right'); assert.equal(a.moving, true);
});

test('movement is frame-rate independent and scales with the Speed Up level', () => {
  const ends = [30, 60, 144].map(fps => { const g = world(OPEN_ROW), a = actor(0, 0); run(g, a, { dir: 'right' }, 1, fps); return a.fx; });
  for (const e of ends) assert.ok(Math.abs(e - M.bmSpeed(1)) < 1e-6, `fps-independent distance (${ends.join(', ')})`);
  assert.ok(M.bmSpeed(4) > M.bmSpeed(1) * 1.5, 'Speed Up makes you clearly faster');
  const g = world(OPEN_ROW), a = actor(0, 0); run(g, a, { dir: 'right' }, 1, 60, M.bmSpeed(3));
  assert.ok(Math.abs(a.fx - M.bmSpeed(3)) < 1e-6);
});

test('stops flush at a wall and at the arena edge, and releases stop immediately', () => {
  const g = world(['..#..']), a = actor(0, 0);
  run(g, a, { dir: 'right' }, 1);
  assert.equal(a.fx, 1, 'stops at the centre of the last open tile');
  const b = actor(3, 0); run(g, b, { dir: 'right' }, 1); assert.equal(b.fx, 4, 'arena edge');
  const c = actor(0, 0); const g2 = world(OPEN_ROW);
  run(g2, c, t => ({ dir: t < 0.3 ? 'right' : null }), 0.6);
  const x = c.fx; run(g2, c, { dir: null }, 0.3); assert.equal(c.fx, x, 'no drift after release'); assert.equal(c.moving, false);
});

test('lane snapping: pressing along a row while slightly off it slides you onto the lane', () => {
  const g = world(OPEN_ROW), a = actor(0, 0.3); // a little below row 0, tile (0,1) is open floor
  const tr = run(g, a, { dir: 'right' }, 0.6);
  assert.equal(a.fz, 0, 'snapped onto row 0'); assert.ok(a.fx > 1, 'then glided right');
  assert.ok(tr.every(([, z], i) => i === 0 || z <= tr[i - 1][1]), 'cross-axis snap is monotonic');
});

test('corner assist: nudges around a block corner toward the open lane you lean into', () => {
  // Pillar under x=1. Standing at x=0.7 on row 0 and pressing down: tile below (1,1) is a pillar,
  // but you lean toward column 0 whose cell below is open -> slide to x=0 and walk down.
  const g = world(OPEN_ROW), a = actor(0.7, 0);
  run(g, a, { dir: 'down' }, 0.6);
  assert.equal(a.fx, 0, 'nudged onto column 0'); assert.ok(a.fz > 0.8, `then walked down (z=${a.fz.toFixed(2)})`);
  assert.equal(a.facing, 'down', 'faces the pressed direction while nudging');
  // Dead centre under the pillar: nothing to lean toward, so you just face the wall.
  const b = actor(1, 0); run(g, b, { dir: 'down' }, 0.4); assert.deepEqual([b.fx, b.fz], [1, 0]);
});

test('buffered turn: pressing down just before an intersection turns cleanly there', () => {
  // Gliding right on row 0; press down while still in front of pillar column 1 (x=0.95).
  const g = world(OPEN_ROW), a = actor(0, 0); let pressedAt = null, minX = 0;
  run(g, a, (t, s) => { if (pressedAt === null && s.fx >= 0.95) pressedAt = t; return { dir: pressedAt === null ? 'right' : 'down' }; }, 1.2, 60, M.bmSpeed(1),
    s => { if (s.fz === 0) minX = Math.max(minX, s.fx); assert.ok(s.fx >= minX - 1e-9 || s.fz > 0, 'never backtracks'); });
  assert.equal(a.fx, 2, 'turned at the next open column'); assert.ok(a.fz > 1, `went down (z=${a.fz.toFixed(2)})`);
  // Without a recent turn the same press against a pillar does not drag you sideways forever.
  const b = actor(0.95, 0); run(g, b, { dir: 'down' }, 0.8); assert.ok(b.fz === 0 && Math.abs(b.fx - 0.95) < 1e-9, 'no phantom slide from a standstill');
});

test('joystick minor axis (alt) slides along a wall when the main direction is blocked', () => {
  const g = world(OPEN_ROW), a = actor(1, 0); let slid = false;
  run(g, a, { dir: 'down', alt: 'right' }, 0.8, 60, M.bmSpeed(1), s => { if (s.fz === 0 && s.fx > 1.05) slid = true; });
  assert.ok(slid, 'blocked down -> follows the stick sideways');
  assert.ok(a.fx === 2 && a.fz > 0.5, 'and takes the next opening down');
});

test('bomb pass-through only while you still overlap it; kick pushes a bomb ahead', () => {
  const g = world(OPEN_ROW, { bombs: [[0, 0]] }), a = actor(0, 0);
  run(g, a, { dir: 'right' }, 0.15); assert.ok(a.fx > 0.4, 'walks off the bomb it stands on');
  run(g, a, { dir: 'left' }, 0.5); assert.equal(a.fx, 0, 'can step back while still overlapping');
  run(g, a, { dir: 'right' }, 0.5); run(g, a, { dir: 'left' }, 1); assert.equal(a.fx, 1, 'once off the bomb tile it is solid');
  const k = world(OPEN_ROW, { bombs: [[3, 0]], kick: true }), b = actor(1, 0);
  run(k, b, { dir: 'right' }, 0.4); assert.ok(k.kicks > 0 && k.bombs[0].x > 3, 'kick moved the bomb');
});

test('game wiring: no more step timers; bots, guests and replicas glide', () => {
  assert.ok(!/dirTimer=Math\.max\(\.08/.test(html), 'old step-repeat timer is gone');
  assert.ok(!/moveCd=Math\.max\(\.09/.test(html), 'old per-step cooldown is gone');
  assert.match(html, /movePlayer\(dt\)/, 'player moves every frame with dt');
  assert.match(html, /bmMoveActor\(e,\{dir:e\.holdT>0\?e\.holdDir:null\}/, 'online humans glide on their held direction');
  assert.match(html, /bmMoveActor\(e,\{dir:e\.gdir\}/, 'bots glide between tiles');
  assert.ok(html.includes('function bmInterpStep') && /__bmReplicaMode\)\{ if\(bm\.state\.game\) bmInterpStep/.test(html), 'replicas interpolate between snapshots');
  assert.ok(html.includes('if(!drop(p.x,p.z)) return;') && /nx=Math\.round\(a\.fx\), nz=Math\.round\(a\.fz\)/.test(html), 'bombs drop on the nearest tile');
  assert.ok(live.includes("sendAction('stop')"), 'guest release stops the host-side glide');
});

test('replica interpolation glides between snapshots without jumping, overshooting or stepping back', () => {
  const s = html.slice(html.indexOf('/* bmInterp:start */'), html.indexOf('/* bmInterp:end */'));
  const { bmInterpStep, bmCarryRender } = new Function(`${s}; return {bmInterpStep,bmCarryRender};`)();
  let prev = { player: { x: 0, z: 0, fx: 0, fz: 0, rx: 0, rz: 0 }, enemies: [], bombs: [] };
  const seen = [];
  // host moves 0.36 tiles per 100 ms snapshot, with jittery arrival times; guest renders at 60 fps
  for (let k = 1; k <= 8; k++) {
    const fx = Math.min(2, 0.36 * k), next = { player: { x: Math.round(fx), z: 0, fx, fz: 0, rx: fx, rz: 0 }, enemies: [], bombs: [] };
    bmCarryRender(prev, next); assert.equal(next.player.rx, prev.player.rx, 'keeps the on-screen position across a snapshot');
    const frames = k % 2 ? 5 : 8; for (let i = 1; i <= frames; i++) { bmInterpStep(next, 1 / 60, i / 60, 0.1); seen.push(next.player.rx); }
    prev = next;
  }
  for (let i = 1; i < seen.length; i++) {
    assert.ok(seen[i] >= seen[i - 1] - 1e-12, `never steps back (frame ${i})`);
    assert.ok(seen[i] - seen[i - 1] < 0.12, `no tile jumps (frame ${i}: ${(seen[i] - seen[i - 1]).toFixed(3)})`);
  }
  assert.ok(Math.max(...seen) <= 2 + 1e-12, 'never overshoots the host position');
  assert.ok(seen.at(-1) > 1.9, 'catches up to the host');
});
