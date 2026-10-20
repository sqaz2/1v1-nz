// Bomb Man live arena must never clobber local play: preview isolation, guest MENU, offline/flapping sockets,
// and no per-snapshot canvas resets (the cause of the "screen keeps flickering" bug on PR #14).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const liveSrc = readFileSync(path.join(root, 'bomberman/live.js'), 'utf8');
const html = readFileSync(path.join(root, 'bomberman/index.html'), 'utf8');

function el(id) {
  const node = { id, children: [], classList: { set: new Set(), add(...c) { c.forEach(x => this.set.add(x)); }, remove(...c) { c.forEach(x => this.set.delete(x)); }, toggle(c, on) { on ? this.set.add(c) : this.set.delete(c); }, contains(c) { return this.set.has(c); } },
    textContent: '', style: {}, set innerHTML(v) { node.span = { textContent: 'LIVE · CONNECTING' }; }, querySelector() { return node.span; },
    insertBefore(child) { node.children.push(child); dom[child.id] = child; }, appendChild() {},
    closest(sel) { return sel.split(',').map(s => s.trim().replace(/^#/, '')).includes(id) ? node : null; } };
  return node;
}
let dom;
function setup({ hostname = '1v1.nz', search = '', join = { ok: true, status: 200, body: { token: 't'.repeat(48), slot: 1, code: 'BOMBLIVE' } } } = {}) {
  dom = { bmTopbar: el('bmTopbar'), bombBackBtn: el('bombBackBtn') };
  const docListeners = {}, winListeners = {}, timers = [], sockets = [], fetches = [];
  const api = { replica: false, applied: 0, screen: 'menu', opened: 0,
    getState: () => ({ screen: api.screen }), setReplica: on => { api.replica = !!on; }, setLocalSlot() {}, setHumanSlots() {},
    applySnapshot: () => { api.applied++; api.screen = 'game'; }, snapshot: () => ({ game: {} }), remoteAction() {}, open: () => { api.opened++; api.screen = 'menu'; } };
  class FakeWS { constructor(url, protocols) { this.url = url; this.readyState = 0; this.l = {}; this.sent = []; sockets.push(this); }
    addEventListener(t, f) { (this.l[t] ||= []).push(f); } emit(t, e = {}) { (this.l[t] || []).forEach(f => f(e)); }
    open() { this.readyState = 1; this.emit('open'); } msg(m) { this.emit('message', { data: JSON.stringify(m) }); }
    send(d) { this.sent.push(d); } close() { if (this.readyState === 3) return; this.readyState = 3; this.emit('close'); } }
  const ctx = {
    window: null, location: { hostname, search, href: `https://${hostname}/bomberman/${search}` }, URL, URLSearchParams, JSON, Math, Number, Promise,
    document: { head: { appendChild() {} }, body: { classList: el('body').classList }, createElement: () => el('bmLiveStatus'), getElementById: id => dom[id] || null,
      addEventListener: (t, f) => (docListeners[t] ||= []).push(f) },
    sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    fetch: async (u, o) => { fetches.push(u); if (join === 'throw') throw new TypeError('Failed to fetch'); return { ok: join.ok, status: join.status, json: async () => join.body }; },
    WebSocket: FakeWS, setTimeout: (f, ms) => { timers.push({ f, ms }); return timers.length; }, clearTimeout: id => { if (timers[id - 1]) timers[id - 1].f = null; },
    setInterval: () => 1, clearInterval() {}, addEventListener: (t, f) => (winListeners[t] ||= []).push(f), console,
  };
  ctx.window = ctx; ctx.window.BombManLegacy = api; ctx.globalThis = ctx;
  vm.runInNewContext(liveSrc, ctx);
  const runTimers = async () => { for (let n = 0; n < 20; n++) { const t = timers.find(x => x.f); if (!t) break; const f = t.f; t.f = null; f(); await new Promise(r => setImmediate(r)); } };
  const click = id => (docListeners.click || []).forEach(f => f({ target: dom[id] || el(id), preventDefault() {} }));
  return { api, sockets, fetches, runTimers, click, status: () => dom.bmLiveStatus?.span?.textContent };
}

test('preview deployments never auto-join the shared production arena', async () => {
  const s = setup({ hostname: 'art-bombman-sprites.1v1-nz.pages.dev' });
  await s.runTimers();
  assert.equal(s.fetches.length, 0, 'preview must not call /bomberman-live/join');
  assert.equal(s.api.replica, false);
  assert.match(s.status(), /SOLO/);
});

test('production (and ?live=1 previews) still join the live arena', async () => {
  for (const opt of [{ hostname: '1v1.nz' }, { hostname: 'x.1v1-nz.pages.dev', search: '?live=1' }]) {
    const s = setup(opt); await s.runTimers();
    assert.equal(s.fetches.length, 1, `${opt.hostname} should join`); assert.equal(s.sockets.length, 1);
  }
});

test('a guest tapping MENU leaves the arena; later snapshots cannot close the menu', async () => {
  const s = setup(); await s.runTimers();
  const ws = s.sockets[0]; ws.open(); ws.msg({ kind: 'welcome', slot: 1, nextSeq: 1, matchId: 'm', players: [{ slot: 0, connected: true }, { slot: 1, connected: true }] });
  assert.equal(s.api.replica, true);
  ws.msg({ kind: 'snapshot', slot: 0, matchId: 'm', snapshot: { game: {} } }); assert.equal(s.api.applied, 1);
  s.click('bmMenuBtn'); s.api.screen = 'menu';
  assert.equal(s.api.replica, false, 'local play after leaving'); assert.equal(ws.readyState, 3, 'socket closed');
  ws.msg({ kind: 'snapshot', slot: 0, matchId: 'm', snapshot: { game: {} } });
  assert.equal(s.api.applied, 1, 'no snapshot applied after MENU'); assert.equal(s.api.screen, 'menu');
  await s.runTimers(); assert.equal(s.fetches.length, 1, 'no automatic rejoin');
});

test('offline or full arena keeps local play; starting a game stops join retries', async () => {
  for (const join of ['throw', { ok: false, status: 503, body: {} }, { ok: false, status: 409, body: { error: 'full' } }]) {
    const s = setup({ join }); await s.runTimers();
    assert.equal(s.api.replica, false, 'never replica while not seated');
    const before = s.fetches.length; s.click('bmPlayBtn'); s.api.screen = 'game'; await s.runTimers();
    assert.equal(s.fetches.length, before, 'no join attempts during a solo game');
  }
});

test('socket drop mid-game goes solo instead of freezing or being overwritten', async () => {
  const s = setup(); await s.runTimers();
  const ws = s.sockets[0]; ws.open(); ws.msg({ kind: 'welcome', slot: 1, nextSeq: 1, matchId: 'm', players: [] });
  s.api.screen = 'game'; ws.close();
  assert.equal(s.api.replica, false); await s.runTimers();
  assert.equal(s.sockets.length, 1, 'no reconnect into someone else\'s game'); assert.match(s.status(), /SOLO/);
  s.click('bmLiveStatus'); for (let i = 0; i < 5; i++) await new Promise(r => setImmediate(r)); assert.equal(s.sockets.length, 2, 'tapping the pill rejoins');
});

test('renderer does not reset the canvas or relayout on every snapshot', () => {
  const resize = html.slice(html.indexOf('function resizeBMCanvas'), html.indexOf('function resizeBMCanvas') + 900);
  assert.match(resize, /if\(bm\.el\.canvas\.width!==w\|\|bm\.el\.canvas\.height!==h\)/, 'canvas size must only be assigned when it changes');
  const apply = html.slice(html.indexOf('function bmApplySnapshot'), html.indexOf('window.BombManLegacy='));
  assert.match(apply, /if\(bm\.state\.screen!=='game'\)showGame\(\)/, 'showGame only on a screen change');
  assert.match(apply, /else if\(bm\.state\.screen!=='menu'\)showMenu\(\)/, 'showMenu only on a screen change');
});
