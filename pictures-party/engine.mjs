/**
 * Pictures Party — deterministic jigsaw piece engine.
 *
 * Pure logic only (no DOM): shared by the browser client and the node tests.
 * Given the same (seed, image dimensions), every client generates the
 * byte-identical puzzle: same grid, same knob shapes, same scatter order.
 * The server hands both players the seed; each client renders locally.
 */

/** Seeded PRNG (mulberry32). Returns a function yielding [0, 1). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Grid dimensions for a target piece count and image aspect ratio.
 * Returns { cols, rows }. Deterministic; total stays within [12, 64].
 */
export function gridDims(imgW, imgH, target = 30) {
  const w = Math.max(1, Math.floor(Number(imgW) || 0));
  const h = Math.max(1, Math.floor(Number(imgH) || 0));
  const t = Math.min(64, Math.max(12, Math.floor(Number(target) || 30)));
  const aspect = w / h;
  let cols = Math.max(3, Math.round(Math.sqrt(t * aspect)));
  let rows = Math.max(3, Math.round(t / cols));
  // Clamp total into [12, 64] by trimming the longer side first.
  let guard = 0;
  while (cols * rows > 64 && guard++ < 32) {
    if (cols >= rows && cols > 3) cols--;
    else if (rows > 3) rows--;
    else break;
  }
  guard = 0;
  while (cols * rows < 12 && guard++ < 32) {
    if (cols <= rows) cols++;
    else rows++;
  }
  return { cols, rows };
}

/**
 * Generate piece edge knobs deterministically.
 * Returns edges[r][c] = { t, r, b, l }, each -1 (indent), 0 (border/straight),
 * or 1 (knob out). Interior edges are complementary:
 * right(r,c) === -left(r,c+1) and bottom(r,c) === -top(r+1,c).
 */
export function generateEdges(seed, cols, rows) {
  const rand = mulberry32(seed);
  const edges = [];
  for (let r = 0; r < rows; r++) {
    edges[r] = [];
    for (let c = 0; c < cols; c++) {
      const top = r === 0 ? 0 : -edges[r - 1][c].b;
      const left = c === 0 ? 0 : -edges[r][c - 1].r;
      const right = c === cols - 1 ? 0 : (rand() < 0.5 ? -1 : 1);
      const bottom = r === rows - 1 ? 0 : (rand() < 0.5 ? -1 : 1);
      edges[r][c] = { t: top, r: right, b: bottom, l: left };
    }
  }
  return edges;
}

/**
 * Deterministic scatter order: a permutation of [0, count) produced by a
 * Fisher-Yates shuffle driven by the seed. Piece i starts at the position
 * scatterOrder[slot] -> piece, i.e. slot s shows piece order[s].
 */
export function scatterOrder(seed, count) {
  const n = Math.max(0, Math.floor(Number(count) || 0));
  const rand = mulberry32((seed ^ 0x9e3779b9) >>> 0);
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = order[i];
    order[i] = order[j];
    order[j] = tmp;
  }
  return order;
}

/**
 * Deterministic scatter positions: for each piece index, a normalized {x, y}
 * in [0.06, 0.94] of the play area. Both clients lay out identical starting
 * boards from the same seed; each client scales by its own canvas size.
 */
export function scatterPositions(seed, count) {
  const n = Math.max(0, Math.floor(Number(count) || 0));
  const rand = mulberry32((seed ^ 0x51ab3c9d) >>> 0);
  const pts = [];
  for (let i = 0; i < n; i++) {
    pts.push({ x: 0.06 + rand() * 0.88, y: 0.06 + rand() * 0.88 });
  }
  return pts;
}

/**
 * Home position (top-left of the piece's cell, in board pixels) for a piece.
 */
export function pieceHome(col, row, cellW, cellH, boardX, boardY) {
  return { x: boardX + col * cellW, y: boardY + row * cellH };
}
