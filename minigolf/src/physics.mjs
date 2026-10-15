// Deterministic shot simulation with Rapier's cross-platform deterministic build.
// A fresh world is built for every shot, so a shot is a pure function of (hole, start, shot, phase):
// host, guest, CPU and tests all compute bit-identical results with the same Rapier version.
import RAPIER from '@dimforge/rapier3d-deterministic-compat';
import { cells, cellAt, isFloor, cellTop, cupPos, moverPos, portalPads, BALL_R, CUP_R, PORTAL_R, PLATEAU } from './courses.mjs';

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
    if (ch === '/') {
      const b = FLOOR_BOTTOM, pts = new Float32Array([x - .5, b, z - .5, x + .5, b, z - .5, x - .5, b, z + .5, x + .5, b, z + .5,
        x - .5, PLATEAU, z - .5, x + .5, PLATEAU, z - .5, x - .5, 0, z + .5, x + .5, 0, z + .5]);
      add(RAPIER.ColliderDesc.convexHull(pts).setRestitution(0.2));
    } else if (cellTop(ch) > 0) {
      const top = cellTop(ch), hy = (top - FLOOR_BOTTOM) / 2;
      add(RAPIER.ColliderDesc.cuboid(0.5, hy, 0.5).setTranslation(x, FLOOR_BOTTOM + hy, z).setRestitution(0.2));
    }
    if (ch === 'o') add(RAPIER.ColliderDesc.cylinder(0.2, 0.18).setTranslation(x, 0.2, z).setRestitution(1.15));
    const top = (ch === '/' ? PLATEAU : cellTop(ch)) + RAIL_H, hy = (top - FLOOR_BOTTOM) / 2, cy = FLOOR_BOTTOM + hy;
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
  for (; tick < MAX_TICKS; tick++) {
    for (const { m, body } of movers) { const p = moverPos(m, shot.phase + tick + 1); body.setNextKinematicTranslation({ x: p[0], y: p[1], z: p[2] }); }
    world.step();
    let p = ball.translation(); const v = ball.linvel();
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
    buf[0] = p.x; buf[1] = p.y; buf[2] = p.z; hash = fnv(hash, buf);
    if (record) frames.push(p.x, p.y, p.z);
    const ddx = p.x - cup[0], ddz = p.z - cup[2];
    if (ddx * ddx + ddz * ddz < CUP_R * CUP_R && Math.abs(p.y - (cup[1] + BALL_R)) < 0.06 && v.x * v.x + v.z * v.z < 2.6 * 2.6) { holed = true; break; }
    if (p.y < -1.5) { out = true; break; }
    still = sp2 < 0.0016 ? still + 1 : 0;
    if (still >= 24) break;
  }
  const t = ball.translation(), end = holed ? [cup[0], cup[1] + BALL_R, cup[2]] : [t.x, t.y, t.z];
  world.free();
  return { end, holed, out, ticks: tick + 1, frames: record ? new Float32Array(frames) : null, events, hash };
}
