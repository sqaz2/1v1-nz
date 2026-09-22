const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = file => fs.readFileSync(path.join(root, file), 'utf8');
function functionSource(file, name) {
  const text = source(file);
  const match = new RegExp('(?:async\\s+)?function\\s+' + name + '\\s*\\(').exec(text);
  assert.ok(match, `missing ${name} in ${file}`);
  let i = text.indexOf('{', match.index), depth = 0, quote = null, line = false, block = false;
  for (; i < text.length; i++) {
    const c = text[i], n = text[i + 1];
    if (line) { if (c === '\n') line = false; continue; }
    if (block) { if (c === '*' && n === '/') { block = false; i++; } continue; }
    if (quote) { if (c === '\\') { i++; continue; } if (c === quote) quote = null; continue; }
    if (c === '/' && n === '/') { line = true; i++; continue; }
    if (c === '/' && n === '*') { block = true; i++; continue; }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '{') depth++;
    if (c === '}' && --depth === 0) return text.slice(match.index, i + 1);
  }
  throw new Error(`unclosed ${name}`);
}
function load(file, names, values = {}) {
  const context = vm.createContext(values);
  vm.runInContext(names.map(name => functionSource(file, name)).join('\n'), context);
  return context;
}
function cell(className = 'bcell') {
  const element = { className, attrs: {}, style: { setProperty() {} }, setAttribute(k, v) { this.attrs[k] = v; } };
  element.classList = {
    add(...names) { element.className += ' ' + names.join(' '); },
    remove(name) { element.className = element.className.split(' ').filter(x => x !== name).join(' '); },
    toggle() {},
  };
  return element;
}
const grid10 = () => Array.from({ length: 10 }, () => Array(10).fill(0));
const cells10 = () => Array.from({ length: 10 }, () => Array.from({ length: 10 }, () => cell()));
const noop = () => {};

test('all executable inline scripts parse', () => {
  for (const file of ['battleship/index.html', 'connect-4/index.html', 'tetris/index.html', 'pinball/index.html', 'simon/index.html']) {
    const scripts = [...source(file).matchAll(/<script(?![^>]*application\/ld\+json)[^>]*>([\s\S]*?)<\/script>/g)];
    for (const match of scripts) if (match[1].trim()) assert.doesNotThrow(() => new vm.Script(match[1], { filename: file }));
  }
  assert.doesNotThrow(() => new vm.Script(source('skirmish/app.js'), { filename: 'skirmish/app.js' }));
});

test('Battleships repaint clears every stale own-board marker and label', () => {
  const own = cells10();
  own[8][4].className = 'bcell miss';
  own[0][0].className = 'bcell shipsunk';
  const c = load('battleship/index.html', ['renderCpuBattle'], {
    cpu: { myShots: grid10(), cpuShots: grid10(), mySunk: new Set(), myFleet: [], last: null },
    cpuEnemyCells: cells10(), cpuOwnCells: own, cpuOwnGrid: {}, syncShipSprites: noop,
  });
  c.renderCpuBattle();
  assert.equal(own[8][4].className, 'bcell');
  assert.equal(own[0][0].className, 'bcell');
  assert.match(own[8][4].attrs['aria-label'], /water$/);
});

test('Battleships old animation cannot mutate a replacement generation', async () => {
  let finish;
  const c = load('battleship/index.html', ['cpuPlayerFire'], {
    cpuGeneration: 4, cpuMoveTimer: 0,
    cpu: { phase: 'battle', turn: 'you', busy: false, myShots: grid10(), cpuFleet: [], mySunk: new Set() },
    cpuEnemyGrid: {}, animateTorpedo: () => new Promise(resolve => { finish = resolve; }),
    applyShotToFleet: () => ({ hit: false, sunk: false }), sound: noop, renderCpuBattle: noop,
    fleetSunk: () => false, cpuEnd: noop, cpuMove: noop, cpuStatus: {}, setTimeout: noop,
  });
  c.cpuPlayerFire(2, 3);
  c.cpuGeneration++;
  c.cpu = { phase: 'battle', turn: 'you', busy: false, myShots: grid10(), cpuFleet: [], mySunk: new Set() };
  finish();
  await Promise.resolve();
  assert.equal(c.cpu.myShots[2][3], 0);
  assert.equal(c.cpu.turn, 'you');
});

test('Connect Four delayed CPU move is invalid after reset', () => {
  const timers = [];
  const c = load('connect-4/index.html', ['drop', 'reset'], {
    ROWS: 6, COLS: 7, localGeneration: 0, cpuMoveTimer: 0,
    grid: Array.from({ length: 6 }, () => Array(7).fill(0)), turn: 1, moveHistory: [],
    mode: 'cpu', scores: [0, 0], locked: false, ended: false,
    boardEl: { querySelector: () => cell('cell') }, document: { querySelectorAll: () => [] },
    sound: noop, burstAt: noop, winningLine: () => null, setStatus: noop, clearMarker: noop,
    cpuMove: () => 3, setTimeout: fn => { timers.push(fn); return timers.length; }, clearTimeout: noop,
  });
  c.drop(0);
  assert.equal(timers.length, 1);
  c.reset();
  timers[0]();
  assert.deepEqual(JSON.parse(JSON.stringify(c.grid)), Array.from({ length: 6 }, () => Array(7).fill(0)));
});

test('action timeout forces the affected Battleships session to reconnect', () => {
  let closed = 0, connected = 0;
  const session = { shotInFlight: true, shotCell: { r: 0, c: 0 }, timers: {}, dropped: false, superseded: false };
  const c = load('battleship/index.html', ['forceSessionReconnect', 'onShotAckTimeout'], {
    activeSession: session, mode: 'online', onlineStatus: {},
    closeSessionSocket: () => { closed++; }, connectSession: () => { connected++; },
  });
  c.onShotAckTimeout(session);
  assert.equal(closed, 1);
  assert.equal(connected, 1);
  assert.deepEqual(session.pendingShot, { r: 0, c: 0 });
});

test('unchanged Battleships snapshot does not acknowledge a pending shot', () => {
  const zero = grid10();
  const session = { state: { status: 'playing', turn: 1 }, color: 1, sunkEnemy: new Set(), shotInFlight: true, shotCell: { r: 0, c: 0 }, timers: {} };
  const c = load('battleship/index.html', ['applyState'], {
    mmPendingCode: '', cleanCode: x => x, mode: 'cpu', activeSession: null,
    renderLobby: noop, flushPendingOnlineAction: noop, closeMmSocket: noop,
  });
  c.applyState(session, { status: 'playing', turn: 1, code: 'ABC123', myShots: zero });
  assert.equal(session.shotInFlight, true);
});

test('unchanged Connect Four snapshot does not acknowledge a pending move', () => {
  const board = Array.from({ length: 6 }, () => Array(7).fill(0));
  const session = {
    state: { status: 'playing', turn: 1 }, color: 1, moveInFlight: true,
    moveBoardBefore: JSON.stringify(board), timers: {}, chat: [],
  };
  const c = load('connect-4/index.html', ['applyState'], {
    mmPendingCode: '', cleanCode: x => x, mode: 'cpu', activeSession: null,
    renderLobby: noop, flushPendingOnlineAction: noop, closeMmSocket: noop,
  });
  c.applyState(session, { status: 'playing', turn: 1, code: 'ABC123', board });
  assert.equal(session.moveInFlight, true);
});

test('Battleships consumes exact sunk cells and does not flood-fill neighbors', () => {
  const shots = grid10(); shots[0][0] = shots[0][1] = shots[1][1] = 2;
  const session = { state: { status: 'playing', turn: 2 }, color: 1, sunkEnemy: new Set(), timers: {} };
  const c = load('battleship/index.html', ['applyState'], {
    mmPendingCode: '', cleanCode: x => x, mode: 'cpu', activeSession: null,
    renderLobby: noop, flushPendingOnlineAction: noop, closeMmSocket: noop,
  });
  c.applyState(session, { status: 'playing', turn: 2, code: 'ABC123', myShots: shots, sunkEnemyShips: [{ cells: [[0, 0], [0, 1]] }] });
  assert.deepEqual([...session.sunkEnemy].sort(), ['0,0', '0,1']);
});

test('Tetris garbage overflow is detected before the top row is discarded', () => {
  let winner = null;
  const c = load('tetris/index.html', ['applyGarbage'], {
    COLS: 10, ROWS: 20, players: [], endMatch: value => { winner = value; }, Math,
  });
  const board = Array.from({ length: 20 }, () => Array(10).fill(null)); board[0][0] = '#fff';
  const p = { board, pendingGarbage: 1, over: false }; c.players = [p, {}];
  assert.equal(c.applyGarbage(p), false);
  assert.equal(p.over, true);
  assert.equal(winner, 1);
});

test('Tetris garbage on a low stack no longer collides with a retired piece', () => {
  const math = Object.create(Math); math.random = () => 0;
  const c = load('tetris/index.html', ['applyGarbage'], { COLS: 10, ROWS: 20, players: [], endMatch: noop, Math: math });
  const board = Array.from({ length: 20 }, () => Array(10).fill(null));
  for (const [x, y] of [[4, 18], [5, 18], [4, 19], [5, 19]]) board[y][x] = '#ffd84d';
  const p = { board, pendingGarbage: 1, cur: null, over: false }; c.players = [p, {}];
  assert.equal(c.applyGarbage(p), true);
  assert.equal(p.over, false);
});

test('Skirmish projectile starts outside its shooter and circle sweep detects contact', () => {
  const state = { players: [{ x: 192, y: 400 }, { x: 768, y: 400 }] };
  const config = { nova: { speed: 1 } };
  const c = load('skirmish/app.js', ['makeProjectile', 'segmentCircle'], {
    state, weaponConfig: config, TANK_R: 14, SHOT_R: 6,
  });
  const p = c.makeProjectile(0, 45, 62, 'nova');
  assert.ok(Math.hypot(p.x - 192, p.y - 400) > 20);
  assert.equal(c.segmentCircle(0, 0, 20, 0, 10, 0, 3), 0.35);
  assert.equal(c.segmentCircle(0, 0, 5, 0, 10, 0, 3), null);
});

test('Skirmish resize only changes its renderer', () => {
  const text = source('skirmish/app.js');
  assert.match(text, /window\.addEventListener\("resize", \(\) => \{ if \(state\.mode\) resizeRenderer\(\); \}\)/);
  assert.doesNotMatch(text, /addEventListener\("resize"[\s\S]{0,180}resetMatch/);
});

test('Pinball flipper geometry responds to an approaching ball', () => {
  const c = load('pinball/index.html', ['capSpeed', 'flipper', 'reflectPaddle'], {
    PADDLE_LEN: 90, PADDLE_Y: 660, LEFT_PIVOT: 100, RIGHT_PIVOT: 300,
    PADDLE_REST: 0.35, PADDLE_FIRED: -0.45, PADDLE_HALF: 7, BALL_R: 11,
    leftFired: false, rightFired: false,
  });
  const pad = c.flipper('left');
  const mid = { x: (pad.x1 + pad.x2) / 2, y: (pad.y1 + pad.y2) / 2 };
  const ball = { x: mid.x + 6, y: mid.y - 16, vx: 0, vy: 300 };
  assert.equal(c.reflectPaddle(ball, pad), true);
  assert.ok(ball.vy < 0);
});

test('Simon creates equal-length independent challenges', () => {
  const c = load('simon/index.html', ['makeSequence', 'buildChallenges'], { Array, Math, level: 7, sequences: [[], []] });
  c.buildChallenges();
  assert.equal(c.sequences[0].length, 7);
  assert.equal(c.sequences[1].length, 7);
  assert.notEqual(c.sequences[0], c.sequences[1]);
});

test('remote Battleships name is rendered with textContent', () => {
  const text = source('battleship/index.html');
  assert.doesNotMatch(text, /onlineStatus\.innerHTML\s*=\s*'<span class="turn-them">'/);
  assert.match(text, /turnLine\.textContent/);
});

test('all local HTML asset references exist', () => {
  for (const file of ['index.html','battleship/index.html','connect-4/index.html','tetris/index.html','pinball/index.html','simon/index.html','skirmish/index.html']) {
    const html = source(file), dir = path.dirname(path.join(root, file));
    for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
      const ref = match[1];
      if (/^(?:https?:|data:|#|\/)/.test(ref)) continue;
      assert.ok(fs.existsSync(path.resolve(dir, ref)), `${file}: missing ${ref}`);
    }
  }
});
