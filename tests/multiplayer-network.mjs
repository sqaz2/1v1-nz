import test from 'node:test';
import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
import { createLocalServer } from '../multiplayer/local-server.mjs';

function peer(url, token) {
  const socket = new WebSocket(url, ['starmuff-v1', 'auth.' + token]), messages = [], listeners = new Set();
  socket.on('message', raw => { const text = raw.toString(); if (text === 'pong') return; const m = JSON.parse(text); messages.push(m); for (const wake of listeners) wake(); });
  return {
    socket, messages,
    wait(kind, predicate = () => true) { return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { listeners.delete(check); reject(new Error('Timed out waiting for ' + kind)); }, 3000);
      function check() { const index = messages.findIndex(m => m.kind === kind && predicate(m)); if (index >= 0) { clearTimeout(timer); listeners.delete(check); resolve(messages.splice(index, 1)[0]); } }
      listeners.add(check); check();
    }); },
    send(value) { socket.send(JSON.stringify(value)); },
    close() { return new Promise(resolve => { if (socket.readyState === 3) return resolve(); socket.once('close', resolve); socket.close(); }); }
  };
}

test('real WebSocket room: two devices, events, host snapshots, reload, stale command and rematch', async () => {
  const app = createLocalServer(), address = await app.listen(0), base = `http://127.0.0.1:${address.port}/api/starmuff`;
  const post = async (path, data) => { const response = await fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) }); return { status: response.status, data: await response.json() }; };
  let host, guest, resumed;
  try {
    assert.equal((await (await fetch(base + '/health')).json()).transport, 'websocket');
    const created = await post('/rooms', { game: 'skirmish' }); assert.equal(created.status, 201);
    const joined = await post('/rooms/' + created.data.code + '/join', { game: 'skirmish' }); assert.equal(joined.data.slot, 1);
    assert.equal((await post('/rooms/' + created.data.code + '/join', { game: 'skirmish' })).status, 409);
    const wsURL = base.replace('http:', 'ws:') + '/rooms/' + created.data.code + '/ws';
    host = peer(wsURL, created.data.token); guest = peer(wsURL, joined.data.token);
    await host.wait('welcome'); await guest.wait('welcome');
    host.send({ kind: 'ready', ready: true, seq: 1, matchId: null }); guest.send({ kind: 'ready', ready: true, seq: 1, matchId: null });
    const start = await host.wait('start'), second = await guest.wait('start'); assert.equal(start.matchId, second.matchId); assert.equal(start.seed, second.seed);
    host.send({ kind: 'snapshot', snapshot: { turn: 2, health: [100, 83] }, seq: 2, matchId: start.matchId });
    assert.equal((await guest.wait('snapshot')).snapshot.health[1], 83);
    guest.send({ kind: 'event', type: 'command', data: { action: 'fire', turnId: 2 }, seq: 2, matchId: start.matchId });
    const event = await host.wait('event'); assert.equal(event.slot, 1); assert.equal(event.data.action, 'fire');
    await guest.close(); await host.wait('presence', m => !m.connected);
    resumed = peer(wsURL, joined.data.token); const welcome = await resumed.wait('welcome');
    assert.equal(welcome.snapshot.turn, 2); assert.equal(welcome.matchId, start.matchId); assert.equal(welcome.nextSeq, 3);
    resumed.send({ kind: 'event', type: 'command', data: {}, seq: 3, matchId: 'stale' }); assert.equal((await resumed.wait('error')).code, 'stale-match');
    host.send({ kind: 'finish', result: { winner: 0 }, seq: 3, matchId: start.matchId });
    await host.wait('finish'); await resumed.wait('finish');
    host.send({ kind: 'ready', ready: true, seq: 4, matchId: start.matchId }); resumed.send({ kind: 'ready', ready: true, seq: 4, matchId: start.matchId });
    const rematch = await host.wait('start'); assert.notEqual(rematch.matchId, start.matchId); assert.equal(rematch.phase, 'active');
    resumed.send({ kind: 'snapshot', snapshot: { forged: true }, seq: 5, matchId: rematch.matchId }); assert.equal((await resumed.wait('error')).code, 'host-only');
  } finally { await Promise.all([host?.close(), guest?.close(), resumed?.close()]); await app.close(); }
});

test('WebSocket admission rejects invalid bearer token and foreign origin', async () => {
  const app = createLocalServer(), address = await app.listen(0), base = `http://127.0.0.1:${address.port}`;
  try {
    const denied = await fetch(base + '/api/starmuff/rooms', { method: 'POST', headers: { origin: 'https://evil.example', 'content-type': 'application/json' }, body: JSON.stringify({ game: 'simon' }) }); assert.equal(denied.status, 403);
    const created = await (await fetch(base + '/api/starmuff/rooms', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ game: 'simon' }) })).json();
    await new Promise((resolve, reject) => {
      const socket = new WebSocket(base.replace('http:', 'ws:') + '/api/starmuff/rooms/' + created.code + '/ws', ['starmuff-v1', 'auth.invalid']);
      socket.on('open', () => { socket.close(); reject(new Error('Invalid token was accepted')); }); socket.on('error', error => { assert.match(error.message, /401/); resolve(); });
    });
  } finally { await app.close(); }
});
