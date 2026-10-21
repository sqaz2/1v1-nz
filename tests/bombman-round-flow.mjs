import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync('bomberman/index.html', 'utf8');
const flow = html.slice(html.indexOf('/* bmRoundFlow:start */'), html.indexOf('/* bmRoundFlow:end */'));
const update = html.slice(html.indexOf('  function updateGame(dt)'), html.indexOf('  function hudIco'));
const remote = html.match(/  function remoteAction\(slot,action\)\{[^\n]+/)[0];

function simulation() {
  const game = { status: 'playing', zoomGuide: true, countdown: 3, goTime: 0, mode: 'classic', timer: 150, player: { x: 0, z: 0 }, enemies: [{ x: 2, z: 2, alive: true }], bombs: [{ x: 0, z: 0, rx: 0, rz: 0, timer: 2.3 }], explosions: [] };
  const moves = [], actions = [];
  const ctx = {
    bm: { state: { game, msgT: 0, bombQueued: true, actQueued: true, detQueued: true } }, window: {}, Math,
    ensureAudio() {}, hideBMMessage() {}, updateBMHud() {},
    movePlayer(dt) { moves.push(dt); }, updateEnemies() {}, actorsOf: g => [g.player, ...g.enemies],
    placeBomb() { actions.push('bomb'); }, tryCarryOrAction() { actions.push('act'); }, detonateRemote() { actions.push('det'); },
    remotePlace() { actions.push('remote bomb'); }, remoteAct() { actions.push('remote act'); }, remoteDet() { actions.push('remote det'); }, remoteMove() { actions.push('remote move'); }
  };
  vm.createContext(ctx);
  vm.runInContext(`${flow}\n${remote}\n${update}`, ctx);
  return { ctx, game, moves, actions };
}

test('first-play guide and all three countdown seconds freeze game time, movement, bombs and actions', () => {
  const { ctx, game, moves, actions } = simulation();
  for (let i = 0; i < 100; i++) ctx.updateGame(.05);
  assert.equal(game.countdown, 3);
  assert.equal(game.timer, 150);
  assert.equal(game.bombs[0].timer, 2.3);
  ctx.acknowledgeZoomGuide(game);
  assert.equal(game.zoomGuide, false);
  for (let i = 0; i < 60; i++) ctx.updateGame(.05);
  // Floating point subtraction may leave a tiny last fraction; the final countdown frame is frozen too.
  if (game.countdown > 0) ctx.updateGame(.05);
  assert.equal(game.countdown, 0);
  assert.equal(game.goTime, .7);
  assert.equal(game.timer, 150);
  assert.equal(game.bombs[0].timer, 2.3);
  assert.deepEqual(moves, []);
  assert.deepEqual(actions, []);
  ctx.updateGame(.05);
  assert.equal(game.timer, 149.95);
  assert.equal(game.bombs[0].timer, 2.25);
  assert.equal(moves.length, 1);
  assert.deepEqual(actions, [], 'no bomb/action pressed during countdown leaks into play');
});

test('remote players cannot move, bomb or detonate before GO', () => {
  const { ctx, game, actions } = simulation();
  for (const action of ['bomb', 'act', 'det', 'right']) ctx.remoteAction(1, action);
  game.zoomGuide = false;
  for (const action of ['bomb', 'act', 'det', 'right']) ctx.remoteAction(1, action);
  assert.deepEqual(actions, []);
  game.countdown = 0;
  ctx.remoteAction(1, 'bomb');
  assert.deepEqual(actions, ['remote bomb']);
});

test('guest acknowledgement never changes host countdown state', () => {
  const { ctx, game } = simulation();
  ctx.window.__bmReplicaMode = true;
  ctx.acknowledgeZoomGuide(game);
  assert.equal(game.zoomGuide, true);
  ctx.updateGame(.05);
  assert.equal(game.countdown, 3);
  assert.equal(game.timer, 150);
});

function presentation() {
  const nodes = new Map(), saved = new Map(), beats = [], ready = [], zooms = [];
  function node(id) {
    if (nodes.has(id)) return nodes.get(id);
    const n = { id, hidden: false, textContent: '', children: [], listeners: {}, classes: new Set(), offsetWidth: 10,
      classList: { add(...v) { v.forEach(x => n.classes.add(x)); }, remove(...v) { v.forEach(x => n.classes.delete(x)); }, toggle(k, on) { on ? n.classes.add(k) : n.classes.delete(k); } },
      appendChild(child) { this.children.push(child); nodes.set(child.id, child); }, setAttribute() {},
      addEventListener(k, fn) { this.listeners[k] = fn; }, querySelector(sel) { return node(this.id + sel); }, querySelectorAll() { return [0, 1, 2].map(i => node('dot' + i)); }, focus() {} };
    nodes.set(id, n); return n;
  }
  node('bmBoardWrap'); node('bmCanvas');
  const ctx = {
    window: { BombManZoom: { get: () => 1, set: (...x) => zooms.push(x), focusGuide() {} } },
    document: { getElementById: node, createElement: () => node('generated' + nodes.size) },
    localStorage: { getItem: k => saved.get(k), setItem: (k, v) => saved.set(k, v) },
    setTimeout: () => 0, clearTimeout() {}, String, Number, Math
  };
  vm.runInNewContext(fs.readFileSync('bomberman/round-ui.js', 'utf8'), ctx);
  return { ui: ctx.window.BombManRoundUI, nodes, saved, beats, ready, zooms, options: { active: true, replica: false, round: 1, total: 3, onBeat: b => beats.push(b), onReady: g => { ready.push(g); g.zoomGuide = false; } } };
}

test('round presentation announces 3, 2, 1, GO once per host beat despite repeated snapshots', () => {
  const { ui, options, beats } = presentation();
  const game = { status: 'playing', countdown: 3, goTime: 0, roundId: 'round-one', zoomGuide: false };
  for (const remaining of [3, 2.95, 2.1, 2, 1.8, 1, .8, 0, 0]) ui.sync({ ...game, countdown: remaining, goTime: remaining === 0 ? .5 : 0 }, options);
  assert.deepEqual(beats, ['3', '2', '1', 'GO!']);
});

test('zoom tutorial adjusts the real camera and host Ready starts countdown once', () => {
  const { ui, nodes, options, ready, zooms } = presentation();
  const game = { status: 'playing', countdown: 3, zoomGuide: true };
  ui.sync(game, options);
  assert.equal(nodes.get('bmZoomGuide').hidden, false);
  nodes.get('bmGuideZoom').listeners.click();
  assert.equal(zooms[0][0], 1.2);
  nodes.get('bmGuideReady').listeners.click();
  assert.equal(ready.length, 1);
  assert.equal(game.zoomGuide, false);
  assert.equal(ui.needsGuide(), false);
  assert.equal(nodes.get('bmZoomGuide').hidden, true);
});

test('guest tutorial is local and does not pause an in-progress live game', () => {
  const { ui, nodes, options, ready } = presentation();
  const game = { status: 'playing', countdown: 0, goTime: 0, zoomGuide: false };
  ui.sync(game, { ...options, replica: true });
  assert.equal(nodes.get('bmZoomGuide').hidden, false);
  nodes.get('bmGuideReady').listeners.click();
  assert.equal(ready.length, 0);
  assert.equal(game.zoomGuide, false);
  assert.equal(game.countdown, 0);
  assert.equal(nodes.get('bmZoomGuide').hidden, true);
});

test('muted game audio never creates countdown tones', () => {
  const source = html.match(/^function tone\([^\n]+/m)[0];
  const ctx = { soundOn: false, ensureAudio() { throw new Error('Muted tones must not create audio'); } };
  vm.createContext(ctx); vm.runInContext(source, ctx);
  for (const freq of [330, 440, 550, 880]) assert.doesNotThrow(() => ctx.tone(freq, .1, 'triangle', .04));
});

test('countdown haptics honor the disabled preference and background-page guard', () => {
  const source = html.match(/let lastBuzz=0; window\.bmHaptic=[^\n]+/)[0];
  const control = { checked: false }, vibrations = [];
  const ctx = { window: {}, $id: () => control, document: { hidden: false }, navigator: { vibrate: p => vibrations.push(p) }, performance: { now: () => 500 } };
  vm.runInNewContext(source, ctx);
  ctx.window.bmHaptic([18, 30, 30]);
  assert.equal(vibrations.length, 0);
  control.checked = true;
  ctx.document.hidden = true;
  ctx.window.bmHaptic(12);
  assert.equal(vibrations.length, 0);
  ctx.document.hidden = false;
  ctx.window.bmHaptic(12);
  assert.equal(vibrations.length, 1);
});
