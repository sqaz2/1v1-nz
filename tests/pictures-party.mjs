import test from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32, gridDims, generateEdges, scatterOrder, scatterPositions, pieceHome } from '../pictures-party/engine.mjs';

test('mulberry32 is deterministic per seed and varies across seeds', () => {
  const a = mulberry32(12345), b = mulberry32(12345), c = mulberry32(99999);
  const seqA = Array.from({ length: 8 }, () => a());
  const seqB = Array.from({ length: 8 }, () => b());
  const seqC = Array.from({ length: 8 }, () => c());
  assert.deepEqual(seqA, seqB);
  assert.ok(seqA.every(v => v >= 0 && v < 1), 'values in [0,1)');
  assert.notDeepEqual(seqA, seqC);
});

test('gridDims respects aspect ratio and stays within bounds', () => {
  const land = gridDims(1600, 900, 30);
  assert.ok(land.cols > land.rows, `landscape ${land.cols}x${land.rows}`);
  const port = gridDims(900, 1600, 30);
  assert.ok(port.rows > port.cols, `portrait ${port.cols}x${port.rows}`);
  const sq = gridDims(1000, 1000, 30);
  assert.ok(Math.abs(sq.cols - sq.rows) <= 1, `square ${sq.cols}x${sq.rows}`);
  for (const [w, h, t] of [[1600, 900, 30], [900, 1600, 30], [100, 100, 30], [4000, 100, 30], [100, 4000, 200]]) {
    const g = gridDims(w, h, t);
    const total = g.cols * g.rows;
    assert.ok(total >= 12 && total <= 64, `${w}x${h} t=${t} -> ${g.cols}x${g.rows} = ${total}`);
    assert.ok(g.cols >= 3 && g.rows >= 3, 'min 3 per side');
  }
  assert.deepEqual(gridDims(1600, 900, 30), gridDims(1600, 900, 30));
});

test('generateEdges is deterministic, complementary, and border-safe', () => {
  const cols = 5, rows = 4, seed = 777;
  const a = generateEdges(seed, cols, rows);
  const b = generateEdges(seed, cols, rows);
  assert.deepEqual(a, b);
  const c = generateEdges(seed + 1, cols, rows);
  assert.notDeepEqual(a, c);
  for (let r = 0; r < rows; r++) {
    for (let cI = 0; cI < cols; cI++) {
      const e = a[r][cI];
      for (const k of ['t', 'r', 'b', 'l']) assert.ok([-1, 0, 1].includes(e[k]), `edge ${k}=${e[k]}`);
      if (r === 0) assert.equal(e.t, 0);
      if (r === rows - 1) assert.equal(e.b, 0);
      if (cI === 0) assert.equal(e.l, 0);
      if (cI === cols - 1) assert.equal(e.r, 0);
      if (cI < cols - 1) assert.equal(e.r, -a[r][cI + 1].l, `h-pair r${r}c${cI}`);
      if (r < rows - 1) assert.equal(e.b, -a[r + 1][cI].t, `v-pair r${r}c${cI}`);
    }
  }
  // interior edges are never straight: every interior edge has a knob
  let interior = 0, knobbed = 0;
  for (let r = 0; r < rows; r++) for (let cI = 0; cI < cols; cI++) {
    for (const [k, isBorder] of [['t', r === 0], ['b', r === rows - 1], ['l', cI === 0], ['r', cI === cols - 1]]) {
      if (isBorder) continue;
      interior++;
      if (a[r][cI][k] !== 0) knobbed++;
    }
  }
  assert.equal(knobbed, interior);
});

test('scatterOrder is a deterministic permutation', () => {
  const n = 30;
  const a = scatterOrder(4242, n), b = scatterOrder(4242, n), c = scatterOrder(4243, n);
  assert.deepEqual(a, b);
  assert.deepEqual([...a].sort((x, y) => x - y), Array.from({ length: n }, (_, i) => i));
  assert.notDeepEqual(a, c);
  assert.deepEqual(scatterOrder(1, 0), []);
  assert.deepEqual(scatterOrder(1, 1), [0]);
});

test('scatterPositions is deterministic, bounded, and seed-sensitive', () => {
  const n = 24;
  const a = scatterPositions(31337, n), b = scatterPositions(31337, n), c = scatterPositions(31338, n);
  assert.deepEqual(a, b);
  assert.ok(a.every(p => p.x >= 0.06 && p.x <= 0.94 && p.y >= 0.06 && p.y <= 0.94), 'within bounds');
  assert.notDeepEqual(a, c);
  assert.deepEqual(scatterPositions(5, 0), []);
});

test('pieceHome maps grid cells to board pixels', () => {
  assert.deepEqual(pieceHome(2, 3, 100, 80, 10, 20), { x: 210, y: 260 });
  assert.deepEqual(pieceHome(0, 0, 50, 50, 0, 0), { x: 0, y: 0 });
});
