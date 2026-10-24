import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { createCharacter } from '../bomberman/characters3d.mjs';

function meshes(group) {
  const result = []; group.traverse(object => { if (object.isMesh) result.push(object); });
  return result;
}

test('detailed characters fit one arena tile and stay within mobile geometry budgets', () => {
  for (const bot of [false, true]) {
    const { group, limbs } = createCharacter({ bot });
    const draws = meshes(group);
    const triangles = draws.reduce((sum, mesh) => sum +
      (mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count) / 3, 0);
    assert.ok(draws.length <= 40, `${bot ? 'robot' : 'hero'} has ${draws.length} draw calls`);
    assert.ok(triangles <= 18000, `${bot ? 'robot' : 'hero'} has ${triangles} triangles`);
    group.traverse(object => assert.ok(!object.isLight, 'characters must not multiply scene lights'));
    for (const phase of [0, .6, -.6]) {
      limbs.forEach((limb, i) => { limb.rotation.x = phase * ([1, -1, -1, 1][i]); });
      const box = new T.Box3().setFromObject(group);
      assert.ok(box.max.y <= 1.5 && box.min.y >= -.06, 'head/feet leave reserved arena bounds');
      assert.ok(Math.max(Math.abs(box.min.x), Math.abs(box.max.x)) < .5, 'model spills into adjacent tile');
      assert.ok(Math.max(Math.abs(box.min.z), Math.abs(box.max.z)) < .5, 'walk animation spills into adjacent tile');
    }
    for (const mesh of draws) {
      for (const value of mesh.geometry.attributes.position.array) assert.ok(Number.isFinite(value));
    }
  }
});

test('characters share GPU geometry and materials but animate independently', () => {
  for (const bot of [false, true]) {
    const a = createCharacter({ bot, color: 0x367fea });
    const b = createCharacter({ bot, color: 0x367fea });
    const left = meshes(a.group), right = meshes(b.group);
    assert.equal(left.length, right.length);
    left.forEach((mesh, i) => {
      assert.notEqual(mesh, right[i]);
      assert.equal(mesh.geometry, right[i].geometry);
      assert.equal(mesh.material, right[i].material);
    });
    assert.deepEqual(a.limbs.map(limb => limb.name), ['leftLeg', 'leftArm', 'rightLeg', 'rightArm']);
    a.limbs[0].rotation.x = .6;
    assert.ok(Math.abs(b.limbs[0].rotation.x) < 1e-12);
    a.ring.visible = false;
    assert.equal(b.ring.visible, true);
  }
});
