import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { createCharacter } from '../bomberman/characters3d.mjs';

globalThis.window = {};
const { frameArena, zoomArena } = await import('../bomberman/arena3d.mjs');
const cols = 11, rows = 9;
const corners = [{ x: 0, z: 0 }, { x: 10, z: 0 }, { x: 0, z: 8 }, { x: 10, z: 8 }];
const aspects = [.5, 3.5];
const zooms = [1, 1.2, 1.6, 2.4];
const models = [false, true].map(bot => ({ bot, ...createCharacter({ bot, color: 0x246fd7 }) }));

function checkVisible(camera, point, label, margin = .98) {
  const p = point.clone().project(camera);
  assert.ok(Math.abs(p.x) < margin && Math.abs(p.y) < margin && p.z > -1 && p.z < 1,
    `${label}; world ${point.toArray().map(n => n.toFixed(3))}; projection ${p.toArray().map(n => n.toFixed(4))}`);
}
function characterEnvelope(model, actor, angle = 0) {
  model.group.position.set(actor.x + .5, .1, actor.z + .5);
  model.group.rotation.y = angle;
  model.group.updateMatrixWorld(true);
  const box = new T.Box3().setFromObject(model.group);
  const points = [];
  for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) points.push(new T.Vector3(x, y, z));
  return points;
}
function cameraAt(aspect) {
  const camera = new T.PerspectiveCamera(42, aspect, .1, 150);
  const envelope = frameArena(camera, cols, rows, aspect);
  return { camera, envelope };
}

test('FIT keeps the complete rim and character-height arena envelope inside narrow and wide viewports', () => {
  for (const aspect of [.48, .5, .7, 1, 1.6, 2.6, 3.5]) {
    const { camera, envelope } = cameraAt(aspect);
    for (const point of envelope) checkVisible(camera, point, `fit aspect ${aspect}`);
  }
});

test('all four spawn characters remain fully visible at every supported zoom and facing', () => {
  for (const aspect of aspects) for (const zoom of zooms) for (const actor of corners) {
    const { camera } = cameraAt(aspect);
    zoomArena(camera, cols, rows, zoom, actor);
    for (const model of models) for (const angle of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
      const label = `aspect ${aspect}, zoom ${zoom}, spawn ${actor.x},${actor.z}, ${model.bot ? 'robot' : 'hero'}, facing ${angle}`;
      for (const point of characterEnvelope(model, actor, angle)) checkVisible(camera, point, label);
    }
  }
});

test('pinch and button zoom changes keep corner characters visible on their first rendered frame', () => {
  for (const aspect of aspects) for (const actor of corners) {
    const { camera } = cameraAt(aspect);
    for (const zoom of [2.4, 1.2, 1.6, 2.4]) {
      zoomArena(camera, cols, rows, zoom, actor, .125);
      for (const point of characterEnvelope(models[0], actor)) checkVisible(camera, point, `transition aspect ${aspect}, zoom ${zoom}, spawn ${actor.x},${actor.z}`);
    }
  }
});

test('FIT resets the camera immediately after following any corner at maximum zoom', () => {
  for (const aspect of aspects) for (const actor of corners) {
    const { camera, envelope } = cameraAt(aspect);
    const originalPosition = camera.position.clone();
    zoomArena(camera, cols, rows, 2.4, actor);
    zoomArena(camera, cols, rows, 1, actor, .125);
    assert.equal(camera.zoom, 1);
    assert.ok(camera.position.distanceTo(originalPosition) < 1e-9, 'FIT restores the fitted position on its first frame');
    for (const point of envelope) checkVisible(camera, point, `fit reset aspect ${aspect}, spawn ${actor.x},${actor.z}`);
  }
});

test('actor motion still uses camera smoothing while the zoom level stays unchanged', () => {
  const { camera } = cameraAt(.5);
  zoomArena(camera, cols, rows, 2, { x: 5, z: 4 });
  const oldFocus = camera.userData.arenaFocus.clone();
  zoomArena(camera, cols, rows, 2, { x: 6, z: 4 }, .125);
  const newFocus = camera.userData.arenaFocus;
  assert.ok(newFocus.x > oldFocus.x && newFocus.x < 6.5);
  assert.equal(newFocus.z, oldFocus.z);
});
