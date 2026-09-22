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

test('classic-game executable inline scripts parse', () => {
  for (const file of ['battleship/index.html', 'connect-4/index.html']) {
    const scripts = [...source(file).matchAll(/<script(?![^>]*application\/ld\+json)[^>]*>([\s\S]*?)<\/script>/g)];
    for (const match of scripts) if (match[1].trim()) assert.doesNotThrow(() => new vm.Script(match[1], { filename: file }));
  }
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

// Discarded-clone tests were replaced by tests/tetris*, tests/pinball*,
// tests/simon*, tests/artillery* and tests/odyssey*: they exercise the ports.

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
