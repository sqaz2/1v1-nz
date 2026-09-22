import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { WebSocket } from 'ws';
import { createLocalServer } from '../multiplayer/local-server.mjs';
const clientSource = await readFile(new URL('../multiplayer/client.js', import.meta.url), 'utf8');

// DOM lifecycle harness, not a browser/visual test. Actual client.js uses real WebSockets.
class Element {
  constructor(tag) { this.tagName = tag; this.children = []; this.dataset = {}; this.attrs = {}; this.listeners = {}; this.className = ''; this.textContent = ''; this.value = ''; this.disabled = false; this.classList = { toggle: (name, yes) => { const names = new Set(this.className.split(' ').filter(Boolean)); yes ? names.add(name) : names.delete(name); this.className = [...names].join(' '); } }; }
  appendChild(child) { this.children.push(child); child.parent = this; return child; }
  append(...children) { children.forEach(child => this.appendChild(child)); }
  prepend(child) { this.children.unshift(child); child.parent = this; }
  setAttribute(key, value) { this.attrs[key] = value; }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  fire(type, data = {}) { return Promise.all((this.listeners[type] || []).map(fn => fn(data))); }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this); }
  all() { return [this, ...this.children.flatMap(child => child.all())]; }
}
function tab(base, { href = base + '/simon/', storage = new Map(), endpoint = base + '/api/starmuff', fetchImpl = fetch } = {}) {
  const head = new Element('head'), body = new Element('body'), host = new Element('div'), sockets = new Set(), timers = new Set(); body.appendChild(host);
  let disposed = false;
  class TrackedSocket extends WebSocket { constructor(...args) { super(...args); sockets.add(this); } }
  const document = { head, body, createElement: tag => new Element(tag), querySelector: selector => selector === '#room' ? host : selector.startsWith('link[') ? head.children.find(child => child.dataset.starmuffMultiplayer) : null };
  const sandbox = { document, console, URL, TextEncoder, AbortSignal, fetch: fetchImpl, WebSocket: TrackedSocket, location: { href }, navigator: { clipboard: { writeText: async value => { sandbox.clipboard = value; } } },
    sessionStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
    setTimeout: (fn, ms) => { if (disposed) return 0; const timer = setTimeout(fn, ms); timers.add(timer); return timer; }, clearTimeout,
    setInterval: (fn, ms) => { if (disposed) return 0; const timer = setInterval(fn, ms); timers.add(timer); return timer; }, clearInterval,
    starts: [], events: [], snapshots: [], finishes: [], presences: [] };
  sandbox.history = { replaceState: (_a, _b, url) => { sandbox.location.href = String(url); } }; sandbox.window = sandbox;
  vm.createContext(sandbox); vm.runInContext(clientSource, sandbox);
  const mp = sandbox.StarMuffMultiplayer.mount({ game: 'simon', endpoint, container: '#room', onStart: x => sandbox.starts.push(x), onEvent: x => sandbox.events.push(x), onSnapshot: x => sandbox.snapshots.push(x), onFinish: x => sandbox.finishes.push(x), onPresence: x => sandbox.presences.push(x) });
  return { mp, sandbox, storage, host, button: text => host.all().find(n => n.tagName === 'button' && n.textContent === text), async dispose() { disposed = true; for (const timer of timers) clearTimeout(timer); await Promise.all([...sockets].map(socket => new Promise(resolve => { if (socket.readyState === 3) return resolve(); socket.once('close', resolve); socket.close(); }))); } };
}
async function until(predicate) { const end = Date.now() + 3000; while (!predicate()) { if (Date.now() > end) throw new Error('Client condition timed out'); await new Promise(resolve => setTimeout(resolve, 5)); } }

test('client.js VM tabs use real WebSockets, room buttons, reload checkpoints and two-party rematch', async () => {
  const app = createLocalServer(), address = await app.listen(0), base = `http://127.0.0.1:${address.port}`;
  let a, b, resumed;
  try {
    a = tab(base); await a.mp.ready; await a.button('Create room').fire('click'); await until(() => a.mp.roomCode);
    b = tab(base, { href: base + '/simon/?room=' + a.mp.roomCode }); await b.mp.ready; await until(() => a.mp.connected && b.mp.connected);
    await a.button('Ready').fire('click'); await b.button('Ready').fire('click'); await until(() => a.sandbox.starts.length && b.sandbox.starts.length);
    const matchId = a.mp.matchId; assert.equal(b.mp.matchId, matchId); assert.equal(a.mp.slot, 0); assert.equal(b.mp.slot, 1);
    b.mp.send({ type: 'attempt', data: { round: 1, passed: true } }); await until(() => a.sandbox.events.length === 1);
    assert.equal(a.sandbox.events[0].data.passed, true); assert.equal(a.sandbox.events[0].slot, 1);
    a.mp.publish({ round: 2, scores: [1, 1] }); await until(() => b.sandbox.snapshots.length === 1);
    await b.dispose(); await until(() => !a.mp.connected);
    resumed = tab(base, { href: b.sandbox.location.href, storage: b.storage }); await resumed.mp.ready; await until(() => resumed.sandbox.starts.length === 1 && a.mp.connected);
    assert.equal(resumed.sandbox.starts[0].resumed, true); assert.equal(resumed.sandbox.starts[0].snapshot.round, 2); assert.equal(resumed.mp.slot, 1);
    a.mp.finish({ winner: 0 }); await until(() => resumed.sandbox.finishes.length === 1); assert.equal(resumed.sandbox.finishes[0].result.winner, 0);
    await a.button('Request rematch').fire('click'); await resumed.button('Request rematch').fire('click'); await until(() => a.mp.matchId !== matchId && resumed.mp.matchId !== matchId); assert.equal(a.mp.matchId, resumed.mp.matchId);
    await a.button('Leave room').fire('click'); await until(() => resumed.mp.phase === 'closed'); assert.equal(a.mp.active, false);
  } finally { await Promise.all([a?.dispose(), b?.dispose(), resumed?.dispose()]); await app.close(); }
});

test('client rejects static HTML fallback and keeps room creation disabled', async () => {
  const a = tab('http://localhost', { fetchImpl: async () => new Response('<html>fallback</html>', { headers: { 'content-type': 'text/html' } }) });
  try { await a.mp.ready; assert.equal(a.mp.available, false); assert.equal(a.button('Create room').disabled, true); assert.match(a.host.all().find(n => n.className.includes('sm-mp-status')).textContent, /not connected/); }
  finally { await a.dispose(); }
});
