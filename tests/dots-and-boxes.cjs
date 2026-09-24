const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '../dots-and-boxes/index.html'), 'utf8');

// Exercise the actual game script with a small DOM and manually controlled timers.
// Browser layout, touch input and multiplayer transport are verified separately.
function loadGame() {
  const elements = new Map(), timers = [];
  function element(id = '') {
    if (id && elements.has(id)) return elements.get(id);
    const node = {
      id, children: [], listeners: {}, attrs: {}, style: {}, dataset: {},
      textContent: id === 'nameP1' ? 'You' : id === 'nameP2' ? 'Computer' : '',
      value: '', hidden: false, open: false,
      classList: { toggle() {}, add() {}, remove() {} },
      setAttribute(key, value) { this.attrs[key] = String(value); },
      getAttribute(key) { return this.attrs[key] ?? null; },
      removeAttribute(key) { delete this.attrs[key]; },
      addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); },
      appendChild(child) { this.children.push(child); return child; },
      append(...children) { this.children.push(...children); },
      focus() { document.activeElement = this; },
      showModal() { this.open = true; },
      close() { this.open = false; },
      contains(child) { return child === this || this.children.includes(child); },
      querySelectorAll() { return []; },
    };
    Object.defineProperty(node, 'innerHTML', { set() { this.children = []; }, get() { return ''; } });
    if (id) elements.set(id, node);
    return node;
  }
  const document = {
    getElementById: element,
    createElementNS: () => element(),
    createElement: () => element(),
    addEventListener() {}, querySelectorAll() { return []; },
    body: element(), documentElement: element(), activeElement: null,
  };
  const context = vm.createContext({
    console, document, URL, URLSearchParams,
    location: { host: 'localhost', protocol: 'http:', search: '', href: 'http://localhost/dots-and-boxes/' },
    navigator: {},
    setTimeout(fn, delay) { const timer = { fn, delay, canceled: false }; timers.push(timer); return timer; },
    clearTimeout(timer) { if (timer) timer.canceled = true; },
  });
  context.window = context;
  for (const match of html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)) {
    if (match[1].trim()) vm.runInContext(match[1], context, { filename: 'dots-and-boxes/index.html' });
  }
  return {
    run: source => vm.runInContext(source, context),
    state: () => JSON.parse(vm.runInContext('JSON.stringify({boxes:Game.boxes,h:Game.h,v:Game.v,claimed:Game.claimed,turn:Game.turn,scores:Game.scores,over:Game.over})', context)),
    elements, timers,
  };
}

test('Dots and Boxes complete 4×4, 5×5 and 6×6 games preserve scoring, ownership and extra turns', () => {
  const game = loadGame();
  game.run("Game.mode = 'local'");
  let seed = 12345;
  for (const size of [4, 5, 6]) for (let round = 0; round < 5; round++) {
    game.run(`newGrid(${size})`);
    let edges = 0;
    while (!game.state().over) {
      const available = game.run('allMoves()');
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const move = available[seed % available.length];
      const before = game.state();
      assert.equal(game.run(`playLine('${move.kind}', ${move.r}, ${move.c}, true)`), true);
      const after = game.state();
      const claimed = after.scores[1] + after.scores[2] - before.scores[1] - before.scores[2];
      assert.equal(after.turn, claimed ? before.turn : 3 - before.turn);
      const counts = [0, 0, 0];
      after.claimed.forEach((row, r) => row.forEach((owner, c) => {
        const closed = Boolean(after.h[r][c] && after.h[r + 1][c] && after.v[r][c] && after.v[r][c + 1]);
        assert.equal(Boolean(owner), closed);
        if (owner) counts[owner]++;
      }));
      assert.deepEqual(after.scores, counts);
      assert.equal(game.run(`playLine('${move.kind}', ${move.r}, ${move.c}, true)`), false);
      assert.deepEqual(game.state(), after);
      edges++;
    }
    assert.equal(edges, 2 * size * (size + 1));
    assert.equal(game.state().scores[1] + game.state().scores[2], size * size);
    assert.equal(game.elements.get('resultBanner').hidden, false);
  }
});

test('a shared fourth side claims both boxes and retains the same player', () => {
  const game = loadGame();
  game.run("newGrid(2); Game.mode = 'local'; Game.h[0] = [1, 1]; Game.h[1] = [1, 1]; Game.v[0] = [1, 0, 1]");
  assert.equal(game.run("playLine('v', 0, 1, true)"), true);
  const state = game.state();
  assert.deepEqual(state.claimed[0], [1, 1]);
  assert.deepEqual(state.scores, [0, 2, 0]);
  assert.equal(state.turn, 1);
});

test('duplicate, malformed, out-of-bounds and invalid-player moves cannot mutate a board', () => {
  const game = loadGame();
  game.run('newGrid(4)');
  assert.equal(game.run("applyLine('h', 0, 0, 1)"), 0);
  const before = game.state();
  for (const args of [
    "'h',0,0,2", "'bad',0,0,1", "null,0,0,1", "'v',-1,0,1",
    "'v',4,0,1", "'h',5,0,1", "'h',0,4,1", "'v',0,5,1",
    "'h',0.5,1,1", "'h','0',1,1", "'v',NaN,1,1", "'v',undefined,1,1",
    "'h',0,1,0", "'h',0,1,3", "'h',0,1,'1'", "'h',0,1,NaN",
  ]) {
    assert.equal(game.run(`applyLine(${args})`), -1, args);
    assert.deepEqual(game.state(), before, args);
  }
});

test('a final box can produce a draw and no subsequent move is accepted', () => {
  const game = loadGame();
  game.run(`
    newGrid(4); Game.mode = 'local'; Game.turn = 2;
    Game.h.forEach(row => row.fill(1)); Game.v.forEach(row => row.fill(1));
    Game.claimed.forEach((row,r) => row.fill(r < 2 ? 1 : 2));
    Game.h[4][3] = 0; Game.claimed[3][3] = 0; Game.scores = [0,8,7];
  `);
  assert.equal(game.run("playLine('h',4,3,true)"), true);
  assert.deepEqual(game.state().scores, [0, 8, 8]);
  assert.equal(game.state().over, true);
  assert.match(game.elements.get('resultBanner').textContent, /^Draw! 8–8$/);
  const finished = game.state();
  assert.equal(game.run("playLine('h',4,3,true)"), false);
  assert.deepEqual(game.state(), finished);
});

test('a queued computer callback from before reset cannot play in a replacement round', () => {
  const game = loadGame();
  game.run("newGrid(5); Game.mode = 'cpu'; playLine('h',0,0,true)");
  const oldTimer = game.timers.at(-1);
  assert.ok(oldTimer, 'the computer response was scheduled');
  game.run("startNew(); playLine('h',1,1,true)");
  const before = game.state();
  oldTimer.fn(); // A task may already have been queued before clearTimeout.
  assert.deepEqual(game.state(), before);
  const currentTimer = game.timers.at(-1);
  assert.notEqual(currentTimer, oldTimer);
  currentTimer.fn();
  assert.equal(game.run('allMoves().length'), 58);
});

test('New game clears the final claim announcement as well as the score and result', () => {
  const game = loadGame();
  game.run("newGrid(1); Game.mode = 'local'");
  for (const move of ["'h',0,0", "'v',0,0", "'h',1,0", "'v',0,1"]) {
    game.run(`playLine(${move},true)`);
  }
  assert.equal(game.state().over, true);
  game.run('startNew()');
  assert.equal(game.state().over, false);
  assert.deepEqual(game.state().scores, [0, 0, 0]);
  assert.equal(game.elements.get('resultBanner').hidden, true);
  assert.doesNotMatch(game.elements.get('turnNote').textContent, /claimed|go again/i);
  assert.match(game.elements.get('turnNote').textContent, /turn/i);
});

test('local rematches alternate starters independently of earlier computer games', () => {
  const direct = loadGame(), afterCpu = loadGame();
  afterCpu.run('startNew(); startNew(); startNew()');
  direct.run("setMode('local')");
  afterCpu.run("setMode('local')");
  assert.equal(afterCpu.state().turn, direct.state().turn);
  const first = direct.state().turn;
  for (const game of [direct, afterCpu]) {
    game.run('startNew()');
    assert.equal(game.state().turn, 3 - first);
    game.run('startNew()');
    assert.equal(game.state().turn, first);
  }
});

test('Hard sacrifices a one-box chain before a four-box chain without mutating its analysis position', () => {
  const game = loadGame();
  game.run(`
    newGrid(4); Game.mode = 'cpu'; Game.turn = 2;
    Game.h.forEach(row => row.fill(1)); Game.v.forEach(row => row.fill(1));
    Game.claimed.forEach(row => row.fill(1));
    Game.claimed[0][0] = 0; Game.claimed[3].fill(0);
    Game.h[0][0] = 0; Game.v[0][0] = 0; Game.v[3].fill(0);
    Game.scores = [0,11,0];
  `);
  const before = game.state();
  assert.equal(game.run('allMoves().length'), 7);
  assert.equal(game.run('allMoves().some(m => moveClaims(m.kind,m.r,m.c) || !moveGivesAway(m.kind,m.r,m.c))'), false);
  const move = game.run('chooseHardMove(allMoves())');
  assert.equal(move.r, 0);
  assert.equal(move.c, 0);
  assert.ok(move.kind === 'h' || move.kind === 'v');
  assert.deepEqual(game.state(), before);
});

test('Hard hands over two boxes to retain control of the remaining four-box chain', () => {
  const game = loadGame();
  game.run(`
    newGrid(4); Game.mode = 'cpu'; Game.turn = 2;
    Game.h.forEach(row => row.fill(1)); Game.v.forEach(row => row.fill(1));
    Game.claimed.forEach(row => row.fill(1));
    Game.claimed[0] = [2,2,0,0]; Game.claimed[3].fill(0);
    Game.v[0][3] = 0; Game.v[0][4] = 0; Game.v[3].fill(0);
    Game.scores = [0,8,2];
  `);
  assert.equal(game.run("moveClaims('v',0,3)"), 1, 'an immediate capture is available');
  const before = game.state();
  const move = game.run('chooseHardMove(allMoves())');
  assert.equal(move.kind, 'v');
  assert.equal(move.r, 0);
  assert.equal(move.c, 4, 'decline the capture and give away the two boxes');
  assert.deepEqual(game.state(), before);
});

test('Hard completes bounded games legally through actual scheduled callbacks on each supported board size', () => {
  const game = loadGame();
  game.run(`
    Game.mode = 'cpu'; Game.difficulty = 'hard';
    Math.random = (() => { let seed = 92741; return () => ((seed = (Math.imul(seed,1664525) + 1013904223) >>> 0) / 4294967296); })();
  `);
  let seed = 31415;
  for (const size of [4, 5, 6]) for (let round = 0; round < 2; round++) {
    game.run(`newGrid(${size})`);
    let moves = 0;
    const maximum = 2 * size * (size + 1);
    while (!game.state().over && moves <= maximum) {
      const before = game.state();
      const remaining = game.run('allMoves().length');
      if (before.turn === 1) {
        const available = game.run('allMoves()');
        seed = (Math.imul(seed,1664525) + 1013904223) >>> 0;
        const move = available[seed % available.length];
        assert.equal(game.run(`playLine('${move.kind}',${move.r},${move.c},true)`), true);
      } else {
        const timer = game.run('Game.cpuTimer');
        assert.ok(timer && !timer.canceled, 'every computer turn has a current callback');
        timer.fn();
      }
      const after = game.state();
      assert.equal(game.run('allMoves().length'), remaining - 1);
      let changed = 0;
      for (const kind of ['h', 'v']) {
        after[kind].forEach((row,r) => row.forEach((value,c) => {
          if (value !== before[kind][r][c]) {
            changed++;
            assert.equal(before[kind][r][c], 0);
            assert.equal(value, before.turn);
          }
        }));
      }
      assert.equal(changed, 1);
      const points = after.scores[1] + after.scores[2] - before.scores[1] - before.scores[2];
      assert.equal(after.turn, points ? before.turn : 3 - before.turn);
      for (const player of [1, 2]) {
        assert.equal(after.scores[player], after.claimed.flat().filter(owner => owner === player).length);
      }
      moves++;
    }
    assert.equal(moves, maximum);
    assert.equal(game.state().over, true);
    assert.equal(game.state().scores[1] + game.state().scores[2], size * size);
    assert.equal(game.run('Game.cpuTimer'), null);
  }
});
