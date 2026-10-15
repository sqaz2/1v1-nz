import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { HOLES, DEFAULT_COURSE, QUICK_COURSE, validateHole, teePos, cupPos, moverPos, holeById, cellAt, JUMP_H, MAX_STROKES } from '../minigolf/src/courses.mjs';
import { createMatch, validShot, shotOf, applyResult, totals, publicState, hole } from '../minigolf/src/rules.mjs';
import { initPhysics, simulateShot } from '../minigolf/src/physics.mjs';
import { chooseShotSync } from '../minigolf/src/cpu.mjs';
import { RoomCore, GAMES } from '../multiplayer/room-core.mjs';

await initPhysics();
const play = (s, slot, cmd) => { assert.ok(validShot(s, slot, cmd)); const shot = shotOf(s, slot, cmd); const res = simulateShot(hole(s), shot); assert.ok(applyResult(s, shot, res)); return res; };

test('Mini golf: every StarMuff hole validates, tee connects to cup, assets exist', () => {
  assert.equal(HOLES.length, 10);
  for (const h of HOLES) assert.deepEqual(validateHole(h), [], h.id);
  for (const f of ['anchorage-surface.webp', 'smackzone-approach.webp', 'muffin-wrapper.glb', 'null-cube.glb', 'crown-of-six-stars.glb']) assert.ok(existsSync(new URL('../minigolf/assets/' + f, import.meta.url)), f);
  for (const id of QUICK_COURSE) assert.ok(holeById(id));
});

test('Mini golf physics is deterministic: same shot gives identical trajectory hash', () => {
  for (const h of HOLES) {
    const shot = { dx: 137, dz: -990, power: 640, start: teePos(h), phase: 53 };
    const a = simulateShot(h, shot), b = simulateShot(h, shot);
    assert.equal(a.hash, b.hash, h.id); assert.deepEqual(a.end, b.end); assert.equal(a.ticks, b.ticks);
    assert.ok(a.ticks < 120 * 14, 'ball must come to rest');
  }
});

test('Mini golf ball stays on the course and rails contain full-power shots', () => {
  for (const h of HOLES) for (const [dx, dz] of [[1000, 0], [-1000, 0], [0, 1000], [0, -1000], [700, -700]]) {
    const r = simulateShot(h, { dx, dz, power: 1000, start: teePos(h), phase: 0 }, { record: false });
    assert.equal(r.out, false, `${h.id} ${dx},${dz} escaped`); assert.ok(r.end[1] > -0.01);
  }
});

test('Mini golf moving null-cube uses integer ticks only and changes outcomes by phase', () => {
  const h = holeById('null-cube-gate'), m = h.movers[0];
  assert.deepEqual(moverPos(m, 0), moverPos(m, m.period)); assert.equal(moverPos(m, m.period / 2)[0], m.x1);
  const ends = new Set([0, 60, 120, 180].map(phase => simulateShot(h, { dx: 0, dz: -1000, power: 900, start: teePos(h), phase }, { record: false }).end.join()));
  assert.ok(ends.size > 1, 'mover must interact with the ball');
});

test('Mini golf portals teleport the ball to the paired pad and stay deterministic', () => {
  const h = holeById('portal-panic'), start = teePos(h);
  const shot = { dx: -1000, dz: 0, power: 320, start, phase: 0 }; // tee is one cell east of a pad
  const a = simulateShot(h, shot), b = simulateShot(h, shot);
  assert.equal(a.hash, b.hash); assert.deepEqual(a.end, b.end);
  assert.ok(a.events.some(e => e.type === 'portal'), 'rolling over the near pad must warp');
  assert.ok(a.end[2] < 4, 'ball ends on the far side of the void wall');
  assert.equal(a.out, false);
});

test('Mini golf sand bleeds ball speed and stays deterministic', () => {
  const mk = sand => ({ id: 'sand-test', name: 'Sand Test', theme: 'anchorage', par: 3, decor: [],
    map: ['H..', '...', '...', '...', '...', '...', '...', '...', '...', sand ? '.s.' : '...', '...', '...', '.T.', '...'] });
  const path = res => { let d = 0; const f = res.frames; for (let i = 1; i < f.length / 3; i++) d += Math.hypot(f[i * 3] - f[(i - 1) * 3], f[i * 3 + 2] - f[(i - 1) * 3 + 2]); return d; };
  const hs = mk(true), shot = { dx: 0, dz: -1000, power: 700, start: teePos(hs), phase: 0 };
  const a = simulateShot(hs, shot), b = simulateShot(hs, shot), plain = simulateShot(mk(false), shot);
  assert.equal(a.hash, b.hash); assert.deepEqual(a.end, b.end);
  assert.ok(path(a) < path(plain) * 0.75, `sand path ${path(a).toFixed(1)} vs plain ${path(plain).toFixed(1)}`);
  assert.ok(a.end[2] > 8.4 && a.end[2] < 9.6, 'ball dies in the sand');
});

test('Mini golf jump ramp launches the ball airborne over the trap; too soft drops in the sand', () => {
  const hole = holeById('trap-jump'), tee = teePos(hole);
  const fly = simulateShot(hole, { dx: 0, dz: -1, power: 900, start: tee, phase: 0 });
  const again = simulateShot(hole, { dx: 0, dz: -1, power: 900, start: tee, phase: 0 });
  assert.equal(fly.hash, again.hash);
  let maxY = 0; for (let i = 1; i < fly.frames.length; i += 3) maxY = Math.max(maxY, fly.frames[i]);
  assert.ok(maxY > JUMP_H + 0.15, `ball gets airborne (apex ${maxY.toFixed(2)})`);
  assert.ok(fly.end[2] < 3.5, `firm putt clears the sand (ends z=${fly.end[2].toFixed(2)})`);
  const soft = simulateShot(hole, { dx: 0, dz: -1, power: 750, start: tee, phase: 0 });
  assert.equal(cellAt(hole, Math.round(soft.end[0]), Math.round(soft.end[2])), 's', `soft putt drops in the trap (ends z=${soft.end[2].toFixed(2)})`);
});

test('Mini golf rejects out-of-turn, stale, malformed and duplicate shots', () => {
  const s = createMatch({ seed: 2 }); assert.equal(s.turn, 0);
  const ok = { turnId: 1, dx: 0, dz: -1000, power: 300 };
  assert.equal(validShot(s, 1, ok), false);
  for (const bad of [{ ...ok, turnId: 2 }, { ...ok, dx: 0, dz: 0 }, { ...ok, power: 0 }, { ...ok, power: 1001 }, { ...ok, dx: 1.5 }, { ...ok, dz: 5000 }, null, { ...ok, power: '300' }]) assert.equal(validShot(s, 0, bad), false, JSON.stringify(bad));
  play(s, 0, ok); assert.equal(validShot(s, 0, ok), false, 'duplicate turnId is stale');
});

test('Mini golf turn order: farther ball putts next, honour on the next tee, pickup at max strokes', () => {
  const s = createMatch({ seed: 4, course: QUICK_COURSE }); const h = hole(s);
  play(s, 0, { turnId: 1, dx: 0, dz: -1000, power: 250 }); // short
  assert.equal(s.turn, 1, 'tee ball is farther');
  for (let i = 0; i < 20 && s.holeIdx === 0; i++) play(s, s.turn, { turnId: s.turnId, dx: 1000, dz: 0, power: 30 }); // tiny sideways taps never hole out
  assert.equal(s.holeIdx, 1); assert.deepEqual(s.strokes.map(r => r[0]), [MAX_STROKES, MAX_STROKES]);
  assert.deepEqual(s.pos, [teePos(hole(s)), teePos(hole(s))]); assert.notEqual(h, hole(s));
});

test('Mini golf CPU finds real holes-in-one or near-pin shots using the physics engine', () => {
  const h = holeById('anchorage-landing'), cmd = chooseShotSync(h, teePos(h), 0, 'hard', () => 0.5);
  const r = simulateShot(h, { ...cmd, start: teePos(h), phase: 0 }, { record: false }), c = cupPos(h);
  assert.ok(r.holed || Math.hypot(r.end[0] - c[0], r.end[2] - c[2]) < 1.2);
});

test('Mini golf full CPU-vs-CPU match finishes with a winner or draw and serializable state', () => {
  const s = createMatch({ seed: 9, course: QUICK_COURSE });
  for (let guard = 0; s.phase !== 'finished' && guard < 60; guard++) { const cmd = chooseShotSync(hole(s), s.pos[s.turn], 0, 'easy', () => 0.5); play(s, s.turn, { ...cmd, turnId: s.turnId }); }
  assert.equal(s.phase, 'finished'); assert.ok(s.winner === 0 || s.winner === 1 || s.winner === 'draw');
  const [a, b] = totals(s); assert.ok(a >= 3 && b >= 3); assert.ok(JSON.stringify(publicState(s)).length < 8 * 1024, 'snapshot fits room limits');
});

test('Mini golf guest replay of host lastShot reproduces the host result exactly', () => {
  const host = createMatch({ seed: 5 }); play(host, host.turn, { turnId: 1, dx: 90, dz: -1000, power: 520 });
  const snap = JSON.parse(JSON.stringify({ kind: 'minigolf-state', state: publicState(host) })), ls = snap.state.lastShot;
  const replay = simulateShot(holeById(snap.state.course[ls.hole]), ls); assert.deepEqual(replay.end, ls.end);
});

test('Mini golf solo practice tracks one player against par', () => {
  const s = createMatch({ solo: true, course: ['anchorage-landing'] });
  for (let i = 0; s.phase !== 'finished' && i < 10; i++) play(s, 0, { ...chooseShotSync(hole(s), s.pos[0], 0, 'hard', () => 0.5), turnId: s.turnId });
  assert.equal(s.phase, 'finished'); assert.equal(s.winner, null); assert.match(s.message, /strokes/);
});

test('Mini golf is registered with the StarMuff room server and homepage', () => {
  assert.ok(GAMES.has('minigolf'));
  const core = new RoomCore(null, { now: () => 1, token: () => 'x'.repeat(48), seed: () => 7 });
  assert.equal(core.create('ABCDEFGH', 'minigolf').game, 'minigolf');
  assert.match(readFileSync(new URL('../multiplayer/client.js', import.meta.url), 'utf8'), /'minigolf'/);
  assert.match(readFileSync(new URL('../index.html', import.meta.url), 'utf8'), /href="\/minigolf\/"/);
  const page = readFileSync(new URL('../minigolf/index.html', import.meta.url), 'utf8');
  assert.match(page, /\/multiplayer\/client\.js/); assert.match(page, /\.\/app\.js/); assert.doesNotMatch(page, /https?:\/\/(cdn|unpkg|esm\.sh)/);
});
