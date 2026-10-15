// Deterministic shot simulation with Rapier's cross-platform deterministic build.
// A fresh world is built for every shot, so a shot is a pure function of (hole, start, shot, phase):
// host, guest, CPU and tests all compute bit-identical results with the same Rapier version.
import RAPIER from '@dimforge/rapier3d-deterministic-compat';
import { cells, cellAt, isFloor, cellTop, cupPos, moverPos, portalPads, loopPath, BALL_R, CUP_R, PORTAL_R, PLATEAU, JUMP_H } from './courses.mjs';

export const HZ = 120, MAX_TICKS = HZ * 14, VMAX = 9;
let ready = null;
export function initPhysics() { return ready ||= RAPIER.init().then(() => RAPIER); }

const FLOOR_BOTTOM = -0.2, RAIL_T = 0.1, RAIL_H = 0.32;

export function buildWorld(hole) {
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  world.timestep = 1 / HZ;
  const fixed = world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
  const add = desc => world.createCollider(desc.setFriction(0.7), fixed);
  // One seamless ground slab under the whole hole: per-cell tiles create internal edges that launch fast balls.
  // Void cells inside the bounds are unreachable because every floor edge facing void has a rail.
  const all = cells(hole), minX = Math.min(...all.map(c => c.col)), maxX = Math.max(...all.map(c => c.col)), minZ = Math.min(...all.map(c => c.row)), maxZ = Math.max(...all.map(c => c.row));
  add(RAPIER.ColliderDesc.cuboid((maxX - minX + 1) / 2 + 0.2, 0.1, (maxZ - minZ + 1) / 2 + 0.2).setTranslation((minX + maxX) / 2, FLOOR_BOTTOM / 2, (minZ + maxZ) / 2).setRestitution(0.2));
  for (const { col: x, row: z, ch } of all) {
    if (ch === 'j') {
      // Jump ramp: steep wedge to JUMP_H plus a small lip plate at the top edge kicked up toward
      // row 0 — the lip adds launch angle without height, so a firm putt leaves airborne while a
      // soft one stalls and drops into the trap in front.
      const b = FLOOR_BOTTOM, pts = new Float32Array([x - .5, b, z - .5, x + .5, b, z - .5, x - .5, b, z + .5, x + .5, b, z + .5,
        x - .5, JUMP_H, z - .5, x + .5, JUMP_H, z - .5, x - .5, 0, z + .5, x + .5, 0, z + .5]);
      add(RAPIER.ColliderDesc.convexHull(pts).setRestitution(0.2));
      // The plate sits sunk into the wedge (its lower corner well clear of the ball's riding
      // line on the slope) so only the top surface emerges past the wedge's top edge.
      const lipAng = 0.42, lip = RAPIER.ColliderDesc.cuboid(0.5, 0.02, 0.16).setTranslation(x, JUMP_H + 0.01, z - 0.60)
        .setRotation({ x: Math.sin(lipAng / 2), y: 0, z: 0, w: Math.cos(lipAng / 2) });
      world.createCollider(lip.setFriction(0.3).setRestitution(0.2), fixed);
    } else if (ch === '/') {
      const b = FLOOR_BOTTOM, pts = new Float32Array([x - .5, b, z - .5, x + .5, b, z - .5, x - .5, b, z + .5, x + .5, b, z + .5,
        x - .5, PLATEAU, z - .5, x + .5, PLATEAU, z - .5, x - .5, 0, z + .5, x + .5, 0, z + .5]);
      add(RAPIER.ColliderDesc.convexHull(pts).setRestitution(0.2));
    } else if (cellTop(ch) > 0) {
      const top = cellTop(ch), hy = (top - FLOOR_BOTTOM) / 2;
      add(RAPIER.ColliderDesc.cuboid(0.5, hy, 0.5).setTranslation(x, FLOOR_BOTTOM + hy, z).setRestitution(0.2));
    }
    if (ch === 'o') add(RAPIER.ColliderDesc.cylinder(0.2, 0.18).setTranslation(x, 0.2, z).setRestitution(1.15));
    const top = (ch === '/' ? PLATEAU : ch === 'j' ? JUMP_H : cellTop(ch)) + RAIL_H, hy = (top - FLOOR_BOTTOM) / 2, cy = FLOOR_BOTTOM + hy;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (isFloor(cellAt(hole, x + dc, z + dr))) continue;
      const hx = dc ? RAIL_T / 2 : 0.5 + RAIL_T, hz = dr ? RAIL_T / 2 : 0.5 + RAIL_T;
      add(RAPIER.ColliderDesc.cuboid(hx, hy, hz).setTranslation(x + dc * (0.5 + RAIL_T / 2), cy, z + dr * (0.5 + RAIL_T / 2)).setRestitution(0.78));
    }
  }
  const movers = (hole.movers || []).map(m => {
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(...moverPos(m, 0)));
    world.createCollider(RAPIER.ColliderDesc.cuboid(m.size / 2, m.size / 2, m.size / 2).setRestitution(0.6), body);
    return { m, body };
  });
  // Loop track structure: hull prisms between path cross-sections (coarse step — these are
  // only for stray balls that miss the lock; locked balls ride the path itself).
  const lp = loopPath(hole);
  if (lp) {
    const cross = i => { const p = lp[i], q = lp[Math.min(i + 1, lp.length - 1)];
      const yaw = Math.atan2(q.x - p.x, -(q.z - p.z));
      const lat = { x: Math.cos(yaw), z: -Math.sin(yaw) }, ny = Math.cos(p.phi), nz = Math.sin(p.phi);
      const A = [p.x + lat.x * 0.2, p.y, p.z + lat.z * 0.2], B = [p.x - lat.x * 0.2, p.y, p.z - lat.z * 0.2];
      return [A, B, [A[0], A[1] - ny * 0.35, A[2] - nz * 0.35], [B[0], B[1] - ny * 0.35, B[2] - nz * 0.35]]; };
    for (let i = 0; i < lp.length - 3; i += 3) {
      const hull = RAPIER.ColliderDesc.convexHull(new Float32Array([...cross(i), ...cross(i + 3)].flat()));
      if (hull) world.createCollider(hull.setFriction(0.08).setRestitution(0), fixed);
    }
  }
  return { world, movers };
}

export function shotVelocity(shot) {
  const len = Math.sqrt(shot.dx * shot.dx + shot.dz * shot.dz), speed = VMAX * Math.pow(shot.power / 1000, 1.15);
  return { x: shot.dx / len * speed, y: 0, z: shot.dz / len * speed };
}

function fnv(h, f32) { const u = new Uint32Array(f32.buffer, f32.byteOffset, f32.length); for (const v of u) { h ^= v; h = Math.imul(h, 16777619) >>> 0; } return h; }

// shot = { dx, dz, power, start:[x,y,z], phase }
export function simulateShot(hole, shot, { record = true } = {}) {
  if (!ready) throw new Error('initPhysics() first');
  const { world, movers } = buildWorld(hole);
  const ball = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(...shot.start)
    .setLinearDamping(0.55).setAngularDamping(1.2).setCcdEnabled(true).setCanSleep(false));
  world.createCollider(RAPIER.ColliderDesc.ball(BALL_R).setDensity(1).setFriction(0.4).setRestitution(0.45), ball);
  ball.setLinvel(shotVelocity(shot), true);
  const cup = cupPos(hole), frames = [], events = [];
  let still = 0, tick = 0, holed = false, out = false, prev = shotVelocity(shot), hash = 2166136261;
  const buf = new Float32Array(3);
  // Portals: crossing a pad teleports the ball to the paired pad, velocity kept. The pad must be
  // re-armed by leaving its area first, so a ball resting on a pad (or arriving still) never ping-pongs.
  const pads = portalPads(hole), nearPad = (x, z, r) => pads.some(pd => (x - pd[0]) ** 2 + (z - pd[2]) ** 2 < r * r);
  let portalCd = 0, portalArmed = !pads.length || !nearPad(shot.start[0], shot.start[2], PORTAL_R);
  // Loop track lock: a ball crossing the loop mouth fast and on-line is captured and rides
  // the path — tangent gravity decides whether it crests or rolls back out the mouth.
  // Pure arithmetic on the shared path samples, so host, guest, CPU and tests all agree.
  const lp = loopPath(hole), loopL = lp ? hole.loops[0] : null;
  const pathAt = s => { let i = 0; while (i < lp.length - 2 && lp[i + 1].s < s) i++;
    const a = lp[i], b = lp[i + 1], u = (s - a.s) / Math.max(1e-6, b.s - a.s);
    return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, z: a.z + (b.z - a.z) * u,
      sin: Math.sin(a.phi) + (Math.sin(b.phi) - Math.sin(a.phi)) * u, cos: Math.cos(a.phi) + (Math.cos(b.phi) - Math.cos(a.phi)) * u,
      dx: (b.x - a.x) / Math.max(1e-6, b.s - a.s) }; };
  const inMouth = (x, y, z) => !!lp && Math.abs(x - loopL.x) < 0.3 && z > loopL.z - 0.2 && z < loopL.z + 1.25 && y < lp[0].y + BALL_R + 0.35;
  let lock = null, loopArm = !inMouth(shot.start[0], shot.start[1], shot.start[2]);
  for (; tick < MAX_TICKS; tick++) {
    for (const { m, body } of movers) { const p = moverPos(m, shot.phase + tick + 1); body.setNextKinematicTranslation({ x: p[0], y: p[1], z: p[2] }); }
    if (lock) {
      lock.v += -9.81 * pathAt(lock.s).sin / HZ;
      lock.v *= 0.999;
      if (Math.abs(lock.v) < 0.08 && pathAt(lock.s).sin > -0.02) lock.v = -0.08; // never balance on the top
      lock.s += lock.v / HZ;
      const done = lock.s <= lp[0].s || lock.s >= lp[lp.length - 1].s;
      const c = pathAt(Math.max(lp[0].s, Math.min(lp[lp.length - 1].s, lock.s))), tl = Math.hypot(c.dx, c.sin, c.cos) || 1;
      ball.setTranslation({ x: c.x, y: c.y + c.cos * BALL_R, z: c.z + c.sin * BALL_R }, true);
      ball.setLinvel({ x: c.dx / tl * lock.v, y: c.sin / tl * lock.v, z: -c.cos / tl * lock.v }, true);
      if (done) { if (lock.s >= lp[lp.length - 1].s) events.push({ tick, type: 'hit', strength: 7 }); lock = null; }
    }
    world.step();
    let p = ball.translation(); const v = ball.linvel();
    if (lock) { const c = pathAt(lock.s); ball.setTranslation({ x: c.x, y: c.y + c.cos * BALL_R, z: c.z + c.sin * BALL_R }, true); p = ball.translation(); }
    const sp2 = v.x * v.x + v.y * v.y + v.z * v.z, pv2 = prev.x * prev.x + prev.y * prev.y + prev.z * prev.z;
    if (pv2 > 0.25 && sp2 < pv2 * 0.6) events.push({ tick, type: 'hit', strength: Math.sqrt(pv2) });
    prev = v;
    if (pads.length) {
      if (portalCd > 0) portalCd--;
      if (!portalArmed && !nearPad(p.x, p.z, PORTAL_R * 1.2)) portalArmed = true;
      if (portalArmed && portalCd === 0) for (let i = 0; i < 2; i++) { const pd = pads[i], dx = p.x - pd[0], dz = p.z - pd[2];
        if (dx * dx + dz * dz < PORTAL_R * PORTAL_R && p.y < pd[1] + 0.35) { const o = pads[1 - i];
          ball.setTranslation({ x: o[0], y: o[1] + BALL_R, z: o[2] }, true);
          events.push({ tick, type: 'portal', strength: 6 }); portalCd = 45; portalArmed = false; p = ball.translation(); break; } }
    }
    // Loop capture: crossing the mouth on-line with pace engages the ride. A ball that
    // starts the shot in the mouth zone must leave it before it can be captured (like portals).
    if (lp && !lock) {
      if (!loopArm && (Math.abs(p.x - loopL.x) > 0.6 || p.z < loopL.z - 0.6 || p.z > loopL.z + 1.7)) loopArm = true;
      if (loopArm && inMouth(p.x, p.y, p.z) && v.z < -1.2) {
        lock = { s: Math.max(lp[0].s, Math.min(0, -(p.z - loopL.z))), v: -v.z };
        events.push({ tick, type: 'portal', strength: 6 });
      }
    }
    // Sand: rolling over a sand cell bleeds speed fast. Pure function of ball position, so host,
    // guest, CPU and tests all stay in sync.
    if (cellAt(hole, Math.round(p.x), Math.round(p.z)) === 's' && p.y < BALL_R + 0.06) {
      const lv = ball.linvel(), av = ball.angvel(), k = 0.965;
      ball.setLinvel({ x: lv.x * k, y: lv.y, z: lv.z * k }, true);
      ball.setAngvel({ x: av.x * k, y: av.y, z: av.z * k }, true);
    }
    buf[0] = p.x; buf[1] = p.y; buf[2] = p.z; hash = fnv(hash, buf);
    if (record) frames.push(p.x, p.y, p.z);
    const ddx = p.x - cup[0], ddz = p.z - cup[2];
    // Cup capture is speed-gated: past ~1.9 u/s the ball lips out and skips over — real holes
    // shrink fast with pace (a 4.25" cup plays ~2.7" wide with 1 ft of extra speed).
    if (ddx * ddx + ddz * ddz < CUP_R * CUP_R && Math.abs(p.y - (cup[1] + BALL_R)) < 0.06 && v.x * v.x + v.z * v.z < 1.9 * 1.9) { holed = true; break; }
    if (p.y < -1.5) { out = true; break; }
    still = sp2 < 0.0016 ? still + 1 : 0;
    if (still >= 24) break;
  }
  const t = ball.translation(), end = holed ? [cup[0], cup[1] + BALL_R, cup[2]] : [t.x, t.y, t.z];
  world.free();
  return { end, holed, out, ticks: tick + 1, frames: record ? new Float32Array(frames) : null, events, hash };
}
