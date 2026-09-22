(function () {
  'use strict';
  if (window.StarMuffMultiplayer) return;
  var configPromise;
  function config() {
    if (window.STARMUFF_MULTIPLAYER_ENDPOINT) return Promise.resolve();
    if (!configPromise) configPromise = new Promise(function (resolve) {
      var script = document.createElement('script'); script.src = '/multiplayer/config.js';
      script.onload = script.onerror = resolve; document.head.appendChild(script);
    });
    return configPromise;
  }
  function el(tag, text, cls) { var node = document.createElement(tag); if (text) node.textContent = text; if (cls) node.className = cls; return node; }
  function mount(options) {
    options = options || {};
    if (!['tetris', 'pinball', 'simon', 'skirmish', 'odyssey-tanks'].includes(options.game)) throw new Error('Unknown StarMuff game.');
    if (!document.querySelector('link[data-starmuff-multiplayer]')) { var css = el('link'); css.rel = 'stylesheet'; css.href = '/multiplayer/client.css'; css.dataset.starmuffMultiplayer = 'true'; document.head.appendChild(css); }
    var host = typeof options.container === 'string' ? document.querySelector(options.container) : options.container;
    if (!host) { host = el('div'); document.body.prepend(host); }
    var root = el('section', '', 'sm-multiplayer'); root.setAttribute('aria-label', 'Online multiplayer room'); host.appendChild(root);
    root.appendChild(el('h2', 'Play a friend online'));
    root.appendChild(el('p', 'Two devices. One invite. Both players choose Ready to start.', 'sm-mp-hint'));
    var status = el('p', 'Checking online service…', 'sm-mp-status'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite'); root.appendChild(status);
    var lobbyControls = el('div', '', 'sm-mp-controls'), createButton = el('button', 'Create room'), input = el('input'), joinButton = el('button', 'Join room');
    input.placeholder = 'Room code'; input.maxLength = 8; input.setAttribute('aria-label', 'Eight-character room code'); input.autocomplete = 'off'; input.spellcheck = false;
    lobbyControls.append(createButton, input, joinButton); root.appendChild(lobbyControls);
    var roomPanel = el('div', '', 'sm-mp-hidden'), codeText = el('p', '', 'sm-mp-room'), seats = el('p', '', 'sm-mp-seats'), shareText = el('a', '', 'sm-mp-share-link'), roomControls = el('div', '', 'sm-mp-controls');
    var shareButton = el('button', 'Copy invite'), readyButton = el('button', 'Ready', 'sm-mp-ready'), leaveButton = el('button', 'Leave room');
    roomControls.append(shareButton, readyButton, leaveButton); roomPanel.append(codeText, seats, shareText, roomControls); root.appendChild(roomPanel);
    root.appendChild(el('p', 'Casual matches: the host runs the game. No ranked or cheat-proof results.', 'sm-mp-hint'));
    var endpoint, socket = null, heartbeat = null, retry = null, retryCount = 0, stopped = false, busy = false, available = false;
    var token = null, roomCode = null, slot = null, nextSeq = 1, lastMessageAt = 0, lastFinish = null, initializedMatch = null, appliedThrough = 0;
    var state = { phase: 'lobby', matchId: null, seed: null, connected: false, players: [] };
    function callback(name, value) { if (typeof options[name] === 'function') try { options[name](value); } catch (error) { console.error('[StarMuff multiplayer]', name, error); show('The game could not apply the online state. Leave and rejoin before continuing.', true); } }
    function show(message, error) { status.textContent = message; status.className = 'sm-mp-status' + (error ? ' sm-mp-error' : ''); }
    function storageKey(code) { return 'starmuff:seat:v1:' + options.game + ':' + code; }
    function remember() { try { sessionStorage.setItem(storageKey(roomCode), JSON.stringify({ token: token, slot: slot })); } catch (_) { /* still playable for this tab */ } }
    function remembered(code) { try { return JSON.parse(sessionStorage.getItem(storageKey(code)) || 'null'); } catch (_) { return null; } }
    function shareURL() { var url = new URL(location.href); url.searchParams.set('room', roomCode); return url.href; }
    function render() {
      lobbyControls.classList.toggle('sm-mp-hidden', !!roomCode); roomPanel.classList.toggle('sm-mp-hidden', !roomCode);
      createButton.disabled = joinButton.disabled = busy || !available;
      if (!roomCode) return;
      codeText.textContent = 'Room ' + roomCode + ' · You are Player ' + (slot + 1);
      seats.textContent = state.players.map(function (p) { return 'P' + (p.slot + 1) + ': ' + (!p.occupied ? 'waiting for friend' : !p.connected ? 'reconnecting' : p.ready ? 'ready' : 'connected'); }).join(' · ');
      shareText.textContent = shareURL(); shareText.href = shareURL();
      var mine = state.players[slot];
      readyButton.textContent = state.phase === 'active' ? 'Match in progress' : mine && mine.ready ? 'Cancel ready' : state.phase === 'finished' ? 'Request rematch' : 'Ready';
      readyButton.disabled = !socket || socket.readyState !== 1 || state.phase === 'active' || state.phase === 'closed';
    }
    function presence() { callback('onPresence', { connected: !!state.connected && !!socket && socket.readyState === 1, ready: !!state.players[slot]?.ready, players: state.players, phase: state.phase, matchId: state.matchId }); }
    function stateMessage(m) {
      ['phase', 'matchId', 'seed', 'connected', 'players', 'result'].forEach(function (key) { if (m[key] !== undefined) state[key] = m[key]; });
      render(); presence();
    }
    function describe() {
      if (!socket || socket.readyState !== 1) return;
      if (state.phase === 'closed') show('Room closed. Leave this room to create a new one.');
      else if (state.phase === 'active') show(state.connected ? 'Online match connected.' : 'Match paused — waiting for your opponent to reconnect.');
      else if (state.phase === 'finished') show('Match finished. Both players must request a rematch.');
      else show(state.connected ? 'Both players connected. Choose Ready when your game setup is selected.' : 'Invite your friend using the link below.');
    }
    function start(m, resumed) {
      initializedMatch = m.matchId; appliedThrough = m.snapshotSeq || 0;
      callback('onStart', { matchId: m.matchId, seed: m.seed, slot: slot, isHost: slot === 0, resumed: !!resumed, recovering: !!resumed, snapshot: m.snapshot ?? null });
      if (m.snapshot !== null && m.snapshot !== undefined) callback('onSnapshot', { snapshot: m.snapshot, slot: 0, matchId: m.matchId, resumed: true });
      // Reapply accepted peer events after the saved host snapshot, never our own commands.
      (m.events || []).forEach(function (event) { if (event.slot !== slot) { appliedThrough = Math.max(appliedThrough, event.serverSeq || 0); callback('onEvent', event); } });
    }
    function incoming(event) {
      lastMessageAt = Date.now(); if (event.data === 'pong') return;
      var m; try { m = JSON.parse(event.data); } catch (_) { return; }
      if (m.kind === 'welcome') {
        retryCount = 0; slot = m.slot; nextSeq = m.nextSeq; remember(); stateMessage(m);
        if (m.phase === 'active') start(m, true);
        if (m.phase === 'finished' && lastFinish !== m.matchId) { lastFinish = m.matchId; callback('onFinish', { result: m.result, matchId: m.matchId }); }
        describe(); return;
      }
      if (m.kind === 'presence') { stateMessage(m); describe(); return; }
      if (m.kind === 'start') { stateMessage(m); start(m, false); describe(); return; }
      if (m.kind === 'closed') { stateMessage(m); show(m.reason || 'Room closed.'); callback('onLeave', { reason: m.reason, opponent: true }); return; }
      if (m.kind === 'error') {
        show(m.message || 'Online command rejected.', true);
        callback('onError', m);
        if (m.code === 'sequence-gap' && socket?.readyState === 1) socket.send(JSON.stringify({ kind: 'sync' }));
        return;
      }
      if (m.kind === 'ack') return;
      if (m.matchId !== state.matchId) return;
      if (m.kind === 'event') { appliedThrough = Math.max(appliedThrough, m.serverSeq || 0); callback('onEvent', { type: m.type, data: m.data, slot: m.slot, seq: m.seq, matchId: m.matchId, serverSeq: m.serverSeq }); }
      else if (m.kind === 'snapshot') callback('onSnapshot', { snapshot: m.snapshot, slot: m.slot, matchId: m.matchId, serverSeq: m.serverSeq });
      else if (m.kind === 'finish') { stateMessage(m); if (lastFinish !== m.matchId) { lastFinish = m.matchId; callback('onFinish', { result: m.result, matchId: m.matchId }); } describe(); }
    }
    async function request(path, data) {
      var response = await fetch(endpoint + path, { method: data === undefined ? 'GET' : 'POST', headers: data === undefined ? {} : { 'content-type': 'application/json' }, body: data === undefined ? undefined : JSON.stringify(data), cache: 'no-store', signal: AbortSignal.timeout(10000) });
      if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('Online service is not connected to this deployment yet. Solo and local play still work.');
      var value = await response.json(); if (!response.ok) { var error = new Error(value.message || 'Online service unavailable.'); error.code = value.error; throw error; } return value;
    }
    function connect() {
      if (stopped || !token || !roomCode) return;
      clearTimeout(retry); clearInterval(heartbeat);
      var url = new URL(endpoint + '/rooms/' + roomCode + '/ws', location.href); url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      var current = new WebSocket(url, ['starmuff-v1', 'auth.' + token]); socket = current;
      show(retryCount ? 'Reconnecting your reserved seat…' : 'Connecting to room…');
      current.addEventListener('open', function () {
        if (socket !== current) return; lastMessageAt = Date.now(); render();
        heartbeat = setInterval(function () { if (current.readyState !== 1) return; if (Date.now() - lastMessageAt > 45000) { current.close(); return; } current.send('ping'); }, 20000);
      });
      current.addEventListener('message', function (e) { if (socket === current) incoming(e); });
      current.addEventListener('error', function () { /* close owns recovery */ });
      current.addEventListener('close', function (e) {
        if (socket !== current) return; clearInterval(heartbeat); state.connected = false; render(); presence();
        if (stopped || !roomCode) return;
        if (e.code === 4001) { stopped = true; show('This seat was opened in another tab. Leave the room here to avoid controlling it twice.', true); return; }
        if (e.code === 4004) { stopped = true; show('Room expired. Leave and create a new room.', true); return; }
        show('Connection lost. Match paused; reconnecting…', true);
        retryCount++;
        retry = setTimeout(async function () {
          try { await request('/rooms/' + roomCode + '/join', { game: options.game, token: token }); connect(); }
          catch (error) {
            show(error.message, true);
            if (['expired', 'closed', 'unauthorized', 'not-found'].includes(error.code)) { stopped = true; return; }
            if (!stopped) connect();
          }
        }, Math.min(10000, 500 * Math.pow(2, Math.min(retryCount, 5))));
      });
    }
    async function enter(create) {
      if (busy || roomCode) return; busy = true; render();
      try {
        var code = input.value.trim().toUpperCase().replace(/\s/g, '');
        if (!create && !/^[A-Z2-9]{8}$/.test(code)) throw new Error('Enter the eight-character room code from your friend.');
        var saved = !create && remembered(code), data = await request(create ? '/rooms' : '/rooms/' + code + '/join', { game: options.game, token: saved?.token });
        token = data.token; slot = data.slot; roomCode = data.code; stopped = false; state = { phase: 'lobby', matchId: null, seed: null, connected: false, players: [] };
        remember(); var url = new URL(location.href); url.searchParams.set('room', roomCode); history.replaceState(null, '', url); connect();
      } catch (error) { show(error.message, true); } finally { busy = false; render(); }
    }
    function transmit(value) {
      if (!socket || socket.readyState !== 1 || stopped || !roomCode) return false;
      var message = Object.assign({}, value, { seq: nextSeq++, matchId: state.matchId });
      var data = JSON.stringify(message);
      if (new TextEncoder().encode(data).byteLength > 100 * 1024) { nextSeq--; show('Online state is too large to send.', true); return false; }
      socket.send(data); return true;
    }
    function setReady(ready) {
      if (ready && options.canReady && !options.canReady()) { show('Choose your game setup first, then press Ready.'); return false; }
      return transmit({ kind: 'ready', ready: ready !== false });
    }
    function leave() {
      transmit({ kind: 'leave' }); stopped = true; clearTimeout(retry); clearInterval(heartbeat);
      if (roomCode) try { sessionStorage.removeItem(storageKey(roomCode)); } catch (_) {}
      if (socket) socket.close(1000, 'Left room'); socket = null; roomCode = null; token = null; slot = null; initializedMatch = null; nextSeq = 1;
      state = { phase: 'lobby', matchId: null, seed: null, connected: false, players: [] };
      var url = new URL(location.href); url.searchParams.delete('room'); history.replaceState(null, '', url);
      render(); presence(); show('You left the online room. Solo and local play are available.'); callback('onLeave', { opponent: false });
    }
    var api = {
      send: function (type, data) {
        if (!api.active || !api.connected) return false;
        if (type && typeof type === 'object') { var item = type; type = item.type; data = item.data === undefined ? Object.fromEntries(Object.entries(item).filter(function (entry) { return entry[0] !== 'type'; })) : item.data; }
        return transmit({ kind: 'event', type: type, data: data ?? null });
      },
      publish: function (snapshot) { return api.active && api.connected && api.isHost ? transmit({ kind: 'snapshot', snapshot: snapshot, appliedThrough: appliedThrough }) : false; },
      finish: function (result) { return api.active && api.connected && api.isHost ? transmit({ kind: 'finish', result: result }) : false; },
      setReady: setReady, leave: leave,
      create: function () { return enter(true); },
      join: function (code) { input.value = code; return enter(false); },
      destroy: function () { leave(); root.remove(); },
      get slot() { return slot; }, get isHost() { return slot === 0; }, get seed() { return state.seed; }, get matchId() { return state.matchId; },
      get active() { return state.phase === 'active'; }, get connected() { return state.connected && socket?.readyState === 1; },
      get roomCode() { return roomCode; }, get phase() { return state.phase; }, get available() { return available; }
    };
    createButton.addEventListener('click', function () { enter(true); }); joinButton.addEventListener('click', function () { enter(false); });
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') enter(false); });
    readyButton.addEventListener('click', function () { setReady(!state.players[slot]?.ready); }); leaveButton.addEventListener('click', leave);
    shareButton.addEventListener('click', async function () { try { await navigator.clipboard.writeText(shareURL()); show('Invite copied. Send it to your friend.'); } catch (_) { show('Copy the invite link shown below, or share room code ' + roomCode + '.'); } });
    api.ready = (async function () {
      if (!options.endpoint) await config();
      endpoint = String(options.endpoint || window.STARMUFF_MULTIPLAYER_ENDPOINT || '/api/starmuff').replace(/\/$/, '');
      try {
        var health = await request('/health');
        if (!health.ok || health.transport !== 'websocket' || health.version !== 1) throw new Error('Online service is not ready for these games yet. Solo and local modes still work.');
        available = true; show('Online service ready. Create a room or enter an invite code.'); render();
        var code = new URL(location.href).searchParams.get('room'); if (code) { input.value = code; await enter(false); }
      } catch (error) { show(error.message || 'Online service unavailable. Solo and local play still work.', true); render(); callback('onUnavailable', { message: error.message }); }
      return available;
    })();
    render(); return api;
  }
  window.StarMuffMultiplayer = Object.freeze({ mount: mount, version: 1 });
})();
