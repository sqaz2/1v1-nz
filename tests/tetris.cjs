const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const vm = require('node:vm');
const { buildSync } = require('esbuild');
const root = path.resolve(__dirname, '..');
const compile = entry => buildSync({ entryPoints: [path.join(root, entry)], bundle: true, platform: 'node', format: 'cjs', jsx: 'automatic', external: ['react', 'react/jsx-runtime', 'lucide-react'], write: false }).outputFiles[0].text;
const rulesModule = { exports: {} };
vm.runInNewContext(compile('tetris/duel-rules.ts'), { module: rulesModule, exports: rulesModule.exports });
const rules = rulesModule.exports;
const engineSource = compile('tetris/CargoBayGame.tsx');

function engine(seed = 'test-seed', extra = {}) {
  let clock = 1000, nextId = 0, api;
  const effects = [], cleanup = [], raf = new Map(), timers = new Map(), listeners = new Map(), attacks = [], inputs = [], storageWrites = [];
  let over = 0;
  const context2d = new Proxy({}, { get: (obj, key) => obj[key] || (() => {}), set: (obj, key, value) => (obj[key] = value, true) });
  const element = () => ({ clientWidth: 300, clientHeight: 600, parentElement: { clientWidth: 60 }, style: {},
    getContext: () => context2d, getBoundingClientRect: () => ({ width: 240, height: 480 }),
    addEventListener() {}, removeEventListener() {} });
  const jsx = (type, props) => { if (props?.ref) props.ref.current = element(); return { type, props }; };
  const hooks = { useRef: current => ({ current }), useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}], useCallback: fn => fn, useEffect: fn => effects.push(fn) };
  const module = { exports: {} };
  const sandbox = { module, exports: module.exports, performance: { now: () => clock }, console,
    require(name) { if (name === 'react') return hooks; if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx }; if (name === 'lucide-react') return { X: () => null }; throw new Error(name); },
    localStorage: { getItem: () => '0', setItem(key, value) { storageWrites.push([key, value]); } },
    window: { addEventListener() {}, removeEventListener() {} },
    document: { addEventListener(type, fn) { listeners.set(type, fn); }, removeEventListener(type) { listeners.delete(type); } },
    requestAnimationFrame(fn) { const id = ++nextId; raf.set(id, fn); return id; }, cancelAnimationFrame(id) { raf.delete(id); },
    setTimeout(fn) { const id = ++nextId; timers.set(id, fn); return id; }, clearTimeout(id) { timers.delete(id); },
    setInterval(fn) { const id = ++nextId; timers.set(id, fn); return id; }, clearInterval(id) { timers.delete(id); },
  };
  vm.runInNewContext(engineSource, sandbox);
  module.exports.default({ onClose() {}, duel: { seed, remote: false, controlled: true, keys: 'arrows', label: 'TEST',
    onReady(value) { api = value; }, onInput(a) { inputs.push(a); }, onAttack(n) { attacks.push(n); }, onOver() { over++; }, ...extra } });
  effects.forEach(effect => { const fn = effect(); if (fn) cleanup.push(fn); });
  return { api, attacks, inputs, storageWrites, get over() { return over; },
    key(key) { listeners.get('keydown')?.({ key, preventDefault() {}, target: { closest: () => false } }); },
    tick(ms = 1000) { clock += ms; const frames = [...raf.values()]; raf.clear(); frames.forEach(fn => fn(clock)); },
    close() { cleanup.forEach(fn => fn()); }, get timers() { return timers.size; }, get frames() { return raf.size; } };
}
const cell = { c: '#3ea8ff', g: 'blue' };
function rowsFixture(game, count) {
  const state = game.api.snapshot();
  state.board = Array.from({ length: 20 }, (_, row) => Array.from({ length: 10 }, (_, col) => row >= 20 - count && col !== 9 ? cell : 0));
  state.cur = { type: 'I', b: Array.from({ length: 4 }, (_, i) => [0, i]), c: '#3ea8ff', g: 'blue', x: 9, y: 0 };
  game.api.hydrate(state);
}

test('Cargo Bay uses independent seeded bags: 7 unique pieces, repeatable over hundreds of pieces', () => {
  let a = rules.seedNumber('shared'), b = a;
  for (let i = 0; i < 100; i++) {
    const left = rules.seededBag(a), right = rules.seededBag(b);
    assert.deepEqual(left.bag, right.bag); assert.equal(new Set(left.bag).size, 7);
    a = left.state; b = right.state;
  }
  assert.notDeepEqual(rules.seededBag(a).bag, rules.seededBag(rules.seedNumber('different')).bag);
});

test('Cargo Bay original engines have identical streams without shared mutable boards', () => {
  const a = engine(), b = engine();
  for (let i = 0; i < 7; i++) {
    assert.equal(a.api.snapshot().cur.type, b.api.snapshot().cur.type);
    a.api.input(i % 2 ? 'left' : 'right'); a.api.input('hard'); b.api.input('hard');
  }
  assert.notEqual(JSON.stringify(a.api.snapshot().board), JSON.stringify(b.api.snapshot().board));
  a.close(); b.close();
});

test('Cargo Bay incoming garbage is deferred until locking and cleared lines cancel it once', () => {
  const game = engine(); rowsFixture(game, 4);
  const before = game.api.snapshot().board;
  game.api.garbage([2, 6]); assert.deepEqual(game.api.snapshot().board, before);
  game.api.input('hard');
  assert.deepEqual(game.attacks, [2]); assert.equal(game.api.snapshot().pending.length, 0);
  assert.equal(game.api.snapshot().lines, 4); assert.equal(game.api.snapshot().locks, 1);
  game.api.input('left'); assert.deepEqual(game.attacks, [2]); game.close();
});

test('Cargo Bay uncancelled garbage rises with exact hole positions after the lock', () => {
  const game = engine(); game.api.garbage([3, 8]); game.api.input('hard');
  const state = game.api.snapshot(); assert.equal(state.pending.length, 0);
  assert.equal(state.board[18][3], 0); assert.equal(state.board[19][8], 0);
  assert.equal(state.board[19].filter(Boolean).length, 9); game.close();
});

test('Cargo Bay garbage overflow declares a single loss and stops simulation', () => {
  const game = engine(), state = game.api.snapshot(); state.board[0][0] = cell; game.api.hydrate(state);
  game.api.garbage([4]); game.api.input('hard'); assert.equal(game.over, 1);
  game.api.input('hard'); game.tick(); assert.equal(game.over, 1); assert.equal(game.api.snapshot().running, false);
  assert.equal(game.storageWrites.length, 0, 'duel and CPU scores cannot overwrite the solo high score'); game.close();
});

test('Cargo Bay guests send input without predicting or advancing authoritative state', () => {
  const game = engine('test', { remote: true }); const before = game.api.snapshot();
  game.key('ArrowLeft'); assert.deepEqual(game.inputs, ['left']);
  game.tick(10000); const after = game.api.snapshot();
  assert.deepEqual(after.cur, before.cur); assert.equal(after.locks, before.locks); game.close();
});

test('Cargo Bay disconnect freeze blocks input and gravity, resume preserves state', () => {
  const game = engine(); game.api.freeze(true); const before = game.api.snapshot();
  game.key(' '); game.api.input('hard'); game.tick(5000);
  assert.deepEqual(game.api.snapshot().board, before.board); assert.deepEqual(game.api.snapshot().cur, before.cur);
  game.api.freeze(false); game.api.input('hard'); assert.equal(game.api.snapshot().locks, 1); game.close();
});

test('Cargo Bay restored snapshot resumes seeded bag and pending garbage exactly', () => {
  const first = engine('reconnect'); first.api.input('hard'); first.api.garbage([5, 2]);
  const saved = first.api.snapshot(), restored = engine('reconnect'); restored.api.hydrate(saved);
  first.api.input('hard'); restored.api.input('hard');
  assert.equal(JSON.stringify(restored.api.snapshot().board), JSON.stringify(first.api.snapshot().board));
  assert.equal(restored.api.snapshot().rng, first.api.snapshot().rng);
  assert.equal(restored.api.snapshot().cur.type, first.api.snapshot().cur.type);
  first.close(); restored.close();
});

test('Cargo Bay local controls are independent and rematch starts with no old timers or garbage', () => {
  const p1 = engine('local', { keys: 'wasd' }), p2 = engine('local', { keys: 'arrows' });
  p1.key('f'); p2.key('f'); assert.equal(p1.api.snapshot().locks, 1); assert.equal(p2.api.snapshot().locks, 0);
  p1.api.garbage([0, 1]); p1.close(); p2.close();
  assert.equal(p1.timers, 0); assert.equal(p1.frames, 0);
  const rematch = engine('new-match'); assert.equal(rematch.api.snapshot().pending.length, 0);
  assert.equal(rematch.api.snapshot().locks, 0); assert.equal(rematch.api.snapshot().sent, 0); rematch.close();
});

test('Cargo Bay garbage hole generation is match-specific and deterministic', () => {
  assert.deepEqual(rules.garbageHoles('seed', 5, 4), rules.garbageHoles('seed', 5, 4));
  assert.ok(rules.garbageHoles('seed', 5, 20).every(n => n >= 0 && n < 10));
});

test('Cargo Bay mount race restores final snapshot metadata and buffered finish before replay', () => {
  const order = [], applied = { result: null, attackId: 0, inputs: 0 };
  const inbox = { snapshot: { matchId: 'mounted-match', result: 1, attackId: 13 },
    finish: { matchId: 'mounted-match', result: { winner: 1 } },
    events: [{ matchId: 'mounted-match', type: 'cargo-input' }, { matchId: 'old-match', type: 'cargo-input' }] };
  const handlers = {
    snapshot(snapshot) { order.push('snapshot'); applied.result = snapshot.result; applied.attackId = snapshot.attackId; },
    finish(result) { order.push('finish'); applied.result = result.winner; },
    event() { order.push('event'); if (applied.result === null) applied.inputs++; },
  };
  rules.drainMatchInbox('mounted-match', inbox, handlers);
  assert.deepEqual(order, ['snapshot', 'finish', 'event']);
  assert.deepEqual(applied, { result: 1, attackId: 13, inputs: 0 });
  rules.drainMatchInbox('mounted-match', inbox, handlers);
  assert.equal(order.length, 3, 'already consumed finish or input must not replay twice');
});

test('Cargo Bay buffered snapshot alone can restore winner and stale finishes are discarded', () => {
  let result = null, finished = 0;
  rules.drainMatchInbox('new-match', { snapshot: { matchId: 'new-match', result: 0 },
    finish: { matchId: 'old-match', result: { winner: 1 } }, events: [] }, {
    snapshot(snapshot) { result = snapshot.result; }, finish() { finished++; }, event() {},
  });
  assert.equal(result, 0); assert.equal(finished, 0);
});
