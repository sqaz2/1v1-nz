import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TABLE_W, TABLE_L, GOAL_X0, GOAL_X1, ZONE_W, ZONE_D, MALLET_R, PUCK_R,
  MAX_SPEED, MIN_SPEED, DT, GOALS_TO_WIN,
  zoneRect, inZone, clampToZone, createMatch, applyInput, step,
  createCpu, cpuInput, snapshot, restoreSnapshot, predictX,
} from '../air-hockey/physics.mjs';
import { RoomCore } from '../multiplayer/room-core.mjs';

const playState = () => {
  const s = createMatch({ firstServer: 1, rng: () => 0.5 });
  s.phase = 'play';
  return s;
};

test('zone geometry matches the spec: 2x goal mouth wide, 25% deep, on the goal line', () => {
  const bottom = zoneRect(0), top = zoneRect(1);
  assert.equal(bottom.x1 - bottom.x0, ZONE_W);
  assert.equal(bottom.y1, TABLE_L);
  assert.equal(bottom.y1 - bottom.y0, ZONE_D);
  assert.equal(top.y0, 0);
  assert.equal(top.y1 - top.y0, ZONE_D);
  assert.equal((GOAL_X1 - GOAL_X0) * 2, ZONE_W);
});

test('paddle clamp holds the center inside the zone and flags the clamp', () => {
  const c = clampToZone(TABLE_W / 2, TABLE_L + 500, 0);
  assert.equal(c.y, TABLE_L);
  assert.equal(c.clamped, true);
  assert.equal(clampToZone(10, 100, 1).x, (TABLE_W - ZONE_W) / 2);
  assert.equal(inZone(TABLE_W / 2, TABLE_L - 100, 0), true);
  assert.equal(inZone(TABLE_W / 2, TABLE_L / 2, 0), false); // halfway up: never allowed
  assert.equal(inZone(TABLE_W / 2, TABLE_L / 2, 1), false);
});

test('goal counts only when the puck center crosses inside the mouth', () => {
  const s = playState();
  s.puck.x = (GOAL_X0 + GOAL_X1) / 2; s.puck.y = 2; s.puck.vx = 0; s.puck.vy = -500;
  step(s);
  assert.equal(s.scores[0], 1);
  assert.equal(s.phase, 'serve');
  assert.equal(s.serveTo, 1); // conceder strikes first
  assert.equal(s.puck.x, TABLE_W / 2);

  const t = playState();
  t.puck.x = 100; t.puck.y = 2; t.puck.vx = 0; t.puck.vy = -500; // outside the mouth
  step(t);
  assert.equal(t.scores[0], 0);
  assert.ok(t.puck.vy > 0, 'bounces off the goal line outside the mouth');
});

test('first to 7 wins and the match finishes', () => {
  const s = playState();
  s.scores = [GOALS_TO_WIN - 1, 0];
  s.puck.x = TABLE_W / 2; s.puck.y = 2; s.puck.vx = 0; s.puck.vy = -500;
  step(s);
  assert.equal(s.phase, 'finished');
  assert.equal(s.winner, 0);
});

test('serve launches toward the conceder after the ready beat', () => {
  const s = createMatch({ firstServer: 1, rng: () => 0.5 });
  assert.equal(s.phase, 'serve');
  for (let i = 0; i < 200 && s.phase === 'serve'; i++) step(s);
  assert.equal(s.phase, 'play');
  assert.ok(s.puck.vy < 0, 'first serve travels toward the top goal (side 1 strikes first)');
});

test('wall bounce retains ~98% then +2% speed-up', () => {
  const s = playState();
  s.puck.x = PUCK_R + 1; s.puck.y = 800; s.puck.vx = -1000; s.puck.vy = 0;
  step(s);
  const sp = Math.hypot(s.puck.vx, s.puck.vy);
  assert.ok(Math.abs(sp - 1000 * 0.98 * 1.02) < 30, `speed ${sp}`);
  assert.ok(s.puck.vx > 0);
});

test('a touching paddle reflects the puck; a lifted paddle does not exist', () => {
  const s = playState();
  s.puck.x = TABLE_W / 2; s.puck.y = TABLE_L - 200; s.puck.vx = 0; s.puck.vy = 800;
  applyInput(s, 0, { x: TABLE_W / 2, y: TABLE_L - 150, vx: 0, vy: 0, touching: true });
  step(s);
  assert.ok(s.puck.vy < 0, 'paddle sends the puck back up');

  const t = playState();
  t.puck.x = TABLE_W / 2; t.puck.y = TABLE_L - 200; t.puck.vx = 0; t.puck.vy = 800;
  applyInput(t, 0, { x: TABLE_W / 2, y: TABLE_L - 150, vx: 0, vy: 0, touching: false });
  const before = t.puck.vy;
  step(t);
  assert.ok(t.puck.vy > 0 && t.puck.y > TABLE_L - 200, 'lifted paddle lets the puck through');
  assert.equal(before, 800);
});

test('a flick adds paddle velocity: moving paddle hits harder than a still one', () => {
  const mk = (pv) => {
    const s = playState();
    s.puck.x = TABLE_W / 2; s.puck.y = TABLE_L - 200; s.puck.vx = 0; s.puck.vy = 500;
    applyInput(s, 0, { x: TABLE_W / 2, y: TABLE_L - 160, vx: 0, vy: pv, touching: true });
    step(s);
    return Math.hypot(s.puck.vx, s.puck.vy);
  };
  assert.ok(mk(-1200) > mk(0) + 100, 'flick out-powers a still paddle');
});

test('speed cap holds and the floor prevents a dead puck', () => {
  const s = playState();
  s.puck.x = TABLE_W / 2; s.puck.y = 800; s.puck.vx = 5000; s.puck.vy = 0;
  step(s);
  assert.ok(Math.hypot(s.puck.vx, s.puck.vy) <= MAX_SPEED + 1);

  const t = playState();
  t.puck.x = TABLE_W / 2; t.puck.y = 800; t.puck.vx = 10; t.puck.vy = 0;
  step(t);
  assert.ok(Math.hypot(t.puck.vx, t.puck.vy) >= MIN_SPEED - 1);
});

test('paddle spawn overlap resolves with positional correction', () => {
  const s = playState();
  s.puck.x = TABLE_W / 2; s.puck.y = TABLE_L - 300; s.puck.vx = 0; s.puck.vy = 0;
  applyInput(s, 0, { x: TABLE_W / 2, y: TABLE_L - 300, vx: 0, vy: 0, touching: true });
  step(s);
  const d = Math.hypot(s.puck.x - s.paddles[0].x, s.puck.y - s.paddles[0].y);
  assert.ok(d >= PUCK_R + MALLET_R - 0.01, `puck pushed out, distance ${d}`);
});

test('CPU input is always touching and always clamped to its zone', () => {
  for (const difficulty of ['easy', 'hard']) {
    const cpu = createCpu(difficulty);
    const s = playState();
    s.puck.x = TABLE_W / 2; s.puck.y = 800; s.puck.vx = 300; s.puck.vy = -600;
    let now = 0;
    for (let i = 0; i < 600; i++) {
      now += DT;
      const input = cpuInput(cpu, s, 1, now, DT);
      assert.equal(input.touching, true);
      assert.equal(inZone(input.x, input.y, 1), true, `${difficulty} left its zone`);
      applyInput(s, 1, input);
      step(s);
    }
  }
});

test('snapshot round-trips through JSON for the online exchange', () => {
  const s = playState();
  s.puck.x = 400; s.puck.y = 900; s.puck.vx = 300; s.puck.vy = -400;
  s.scores = [3, 2];
  applyInput(s, 0, { x: 500, y: 1400, vx: 0, vy: 0, touching: true });
  const snap = JSON.parse(JSON.stringify(snapshot(s)));
  const t = createMatch({});
  restoreSnapshot(t, snap);
  assert.equal(t.puck.x, 400);
  assert.deepEqual(t.scores, [3, 2]);
  assert.equal(t.paddles[0].touching, true);
});

test('trajectory prediction reflects off the side walls', () => {
  assert.equal(predictX(900, 400, 1), 700); // 900+400=1300 -> mirrored to 700
  assert.equal(predictX(100, -400, 1), 300);
});

test('online rooms accept air-hockey as a game', () => {
  const core = new RoomCore(null, { now: () => 1000, token: () => 't'.repeat(48), seed: () => 7 });
  const room = core.create('ABCDEFGH', 'air-hockey');
  assert.equal(room.game, 'air-hockey');
  assert.equal(room.slot, 0);
});
