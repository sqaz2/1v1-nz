(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const D = window.PinballDuel;
  let mode = 'solo', match = null, slot = 0, frame = null, mp = null, restoreExpected = null;
  let music = null, mood = null, queue = [], muted = false, isEgg = false;
  let pendingForfeit = null, resumeLocal = false;
  let audio = new Audio(), egg = new Audio();
  const localKey = 'starmuff-pinball-hotseat-v1';
  function id() { return crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-' + Math.random().toString(36).slice(2); }
  function setStatus(text) { $('status').textContent = text; }
  function cancelForfeit() {
    if (pendingForfeit) pendingForfeit.button.textContent = pendingForfeit.label;
    pendingForfeit = null;
    $('forfeit-prompt').hidden = true;
  }
  function confirmForfeit(button, action) {
    if (pendingForfeit?.matchId === match?.id && pendingForfeit.button === button && Date.now() < pendingForfeit.until) {
      cancelForfeit();
      action();
      return;
    }
    const pending = {matchId:match?.id, button, label:button.textContent, until:Date.now()+6000};
    pendingForfeit = pending;
    $('forfeit-prompt').hidden = false;
    button.textContent = 'Confirm forfeit — tap again';
    setStatus('Forfeit this run? Tap the button again within six seconds to confirm.');
    setTimeout(() => {
      if (pendingForfeit === pending) { cancelForfeit(); setStatus('Forfeit not confirmed. Your run remains saved.'); }
    }, 6000);
  }
  function control(type, data = {}) {
    if (frame?.contentWindow && match) frame.contentWindow.postMessage({channel: 'starmuff-pinball-control', type, runId: match.id, ...data}, location.origin);
  }
  function show(section) {
    for (const name of ['setup','play','result']) $(name).hidden = name !== section;
    $('resume').hidden = !frame || section !== 'setup';
    $('forfeit').hidden = !frame || mode === 'solo' || !match || !!match.result;
    $('start').hidden = mode === 'online' || (mode === 'local' && !!frame && !!match && !match.result);
    if (mode !== 'solo') control('pause', {paused: section !== 'play' || (mode === 'online' && !mp?.connected)});
  }
  function drawScores() {
    $('scoreboard').hidden = !match || mode === 'solo';
    if (!match) return;
    match.players.forEach((p, i) => {
      const el = $('score-' + i);
      const state = p.status === 'done' ? ' · finished' : p.status === 'forfeit' ? ' · forfeited' : p.status === 'waiting' ? ' · waiting' : '';
      el.replaceChildren(document.createTextNode((mode === 'online' ? (i === slot ? 'You' : 'Opponent') : 'Player ' + (i + 1)) + state));
      const b = document.createElement('b'); b.textContent = p.score.toLocaleString(); el.appendChild(b);
      el.classList.toggle('active', i === slot);
    });
  }
  function save() {
    if (mode === 'local' && match) try { sessionStorage.setItem(localKey, JSON.stringify({match, slot})); } catch (_) {}
  }
  function makeFrame(isDuel) {
    cancelForfeit();
    frame?.remove();
    frame = document.createElement('iframe');
    frame.title = 'Original StarMuff Pinball table';
    frame.setAttribute('allow', 'autoplay');
    const params = new URLSearchParams(isDuel ? {duel:'1', seed:match.seed, run:match.id, slot:String(slot)} : {});
    frame.src = './game.html?' + params;
    $('play').replaceChildren(frame);
    show('play');
    playNext();
  }
  function missingCheckpoint() {
    const previous = restoreExpected;
    restoreExpected = null;
    frame?.remove(); frame = null;
    show('result');
    $('result-title').textContent = 'Your run is on the original tab';
    $('result-detail').textContent = 'This browser has the shared score but not the saved pinball physics. Return to the tab where you started, or forfeit this run. Starting a replacement run would not be fair.';
    $('next').textContent = 'Forfeit missing run'; $('next').hidden = false;
    $('next').onclick = () => {
      confirmForfeit($('next'), () => {
        const progress = {...previous, seq:previous.seq + 1, status:'forfeit'};
        if (commit(slot,progress)) mp.send('pinball-progress',progress);
      });
    };
    setStatus('Saved table state is unavailable here; the existing score is preserved.');
  }
  function startLocal(resume = false) {
    if (!resume) { match = D.createMatch(id(), id()); slot = 0; }
    save(); drawScores();
    if (match.result) { showOutcome(); return; }
    if (['done','forfeit'].includes(match.players[slot].status)) { offerNext(); return; }
    setStatus('Player ' + (slot + 1) + ' · 3 starting balls + earned extra balls · normal speed');
    makeFrame(true);
  }
  function offerNext() {
    control('pause', {paused:true});
    show('result');
    if (mode === 'local' && slot === 0) {
      setStatus('Player 1’s run is locked. Pass the device to Player 2.');
      $('result-title').textContent = 'Player 1 finished';
      $('result-detail').textContent = match.players[0].score.toLocaleString() + ' points. Pass the device to Player 2. Same original table, same seed, fresh run.';
      $('next').textContent = 'Player 2 — ready'; $('next').hidden = false;
      $('next').onclick = () => { slot = 1; save(); drawScores(); makeFrame(true); setStatus('Player 2 · beat ' + match.players[0].score.toLocaleString() + ' points'); };
    } else {
      setStatus('Your run is locked. Waiting for the other player to finish.');
      $('result-title').textContent = 'Run complete';
      $('result-detail').textContent = 'Your score is locked at ' + match.players[slot].score.toLocaleString() + '. Waiting for the other player’s real run to finish.';
      $('next').hidden = true;
    }
  }
  function showOutcome() {
    if (!match?.result) return;
    control('pause', {paused:true});
    drawScores(); show('result');
    const result = match.result;
    $('result-title').textContent = result.draw ? 'It’s a draw!' : mode === 'online' ? (result.winner === slot ? 'You win!' : 'Opponent wins') : 'Player ' + (result.winner + 1) + ' wins!';
    $('result-detail').textContent = 'Player 1: ' + match.players[0].score.toLocaleString() + ' · Player 2: ' + match.players[1].score.toLocaleString() + '. Both scores came from the full original table.';
    $('next').hidden = false;
    $('next').textContent = mode === 'online' ? 'Rematch / room' : 'Play another duel';
    $('next').onclick = mode === 'online' ? () => show('setup') : () => startLocal();
    setStatus('Duel finished. A rematch creates a clean table and a fresh shared seed.');
  }
  function commit(slotIndex, progress) {
    if (!match || !D.update(match, slotIndex, {...progress, matchId: match.id})) return false;
    drawScores(); save();
    if (mode === 'online' && mp?.isHost) {
      mp.publish({pinball: match});
      if (match.result) mp.finish(match.result);
    }
    if (match.result) showOutcome();
    else if (['done','forfeit'].includes(match.players[slot].status)) offerNext();
    return true;
  }
  function applySnapshot(value) {
    const state = value?.pinball;
    if (!D.validate(state, match?.id)) return;
    for (let i = 0; i < 2; i++) if (state.players[i].seq > match.players[i].seq) match.players[i] = state.players[i];
    if (state.result) match.result = state.result;
    drawScores();
    if (match.result) showOutcome();
  }
  function selectMode(nextMode) {
    if (frame && !match?.result && mode !== 'solo' && mode !== nextMode) {
      setStatus('Finish or forfeit this duel before changing modes.'); return;
    }
    if (mode !== nextMode && frame && mode === 'solo') { frame.remove(); frame = null; }
    mode = nextMode;
    document.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('selected', b.dataset.mode === mode));
    $('online-lobby').hidden = mode !== 'online';
    $('start').hidden = mode === 'online' || (mode === 'local' && !!frame && !!match && !match.result);
    $('start').textContent = mode === 'solo' ? 'Play original Pinball' : resumeLocal && match ? 'Resume saved duel' : 'Start Player 1’s run';
    $('rules').textContent = mode === 'solo' ? 'The full original game, including your local high scores and unlocks.' : mode === 'local' ? 'Player 1 plays, then Player 2. Three starting balls plus the original earned extra balls. Same seed, normal speed, identical starting unlocks. Highest score wins.' : 'Create a room, share its link, and both ready up. Play the original table simultaneously: same seed, three starting balls plus earned extra balls, normal speed and identical starting unlocks. Highest score wins.';
    if (mode === 'online') mountOnline();
    drawScores();
  }
  function mountOnline() {
    if (mp) return;
    if (!window.StarMuffMultiplayer) { setStatus('Online connection could not load. Solo and pass-and-play are available.'); return; }
    mp = window.StarMuffMultiplayer.mount({game: 'pinball', container: '#online-lobby',
      onStart(info) {
        mode = 'online'; slot = info.slot;
        const sameRun = match?.id === info.matchId;
        if (!sameRun) match = D.createMatch(info.matchId, info.seed);
        applySnapshot(info.snapshot);
        drawScores();
        if (match.result) { showOutcome(); return; }
        if (['done','forfeit'].includes(match.players[slot].status)) { offerNext(); return; }
        restoreExpected = info.resumed && !sameRun && match.players[slot].ticks > 0 ? {...match.players[slot]} : null;
        if (!sameRun || !frame) makeFrame(true);
        else if (!match.result && frame) { show('play'); control('pause', {paused:false}); control('sync'); }
        setStatus('Online duel · same seed & rules · your original table runs locally');
      },
      onEvent(event) {
        if (event.matchId !== match?.id || event.type !== 'pinball-progress' || event.slot === slot) return;
        commit(event.slot, event.data);
      },
      onSnapshot(info) { if (info.matchId === match?.id) applySnapshot(info.snapshot); },
      onPresence(info) {
        if (mode !== 'online' || !frame) return;
        if (match?.result) {
          if (info.connected && mp?.isHost && mp.active) { mp.publish({pinball:match}); mp.finish(match.result); }
          return;
        }
        control('pause', {paused: !info.connected || $('play').hidden});
        if (info.connected) control('sync');
        setStatus(info.connected ? 'Opponent connected · your score is shared live' : 'Connection interrupted — your table is paused and saved. Reconnecting…');
      },
      onLeave() { control('pause', {paused:true}); frame?.remove(); frame = null; match = null; drawScores(); show('setup'); setStatus('Left online room.'); },
      onFinish(info) { if (info.matchId === match?.id) { match.result = info.result; showOutcome(); } },
    });
  }
  async function playNext() {
    if (!mood || !music || muted || isEgg) return;
    if (!queue.length) queue = [...mood.tracks].sort(() => Math.random() - .5);
    const track = queue.shift(); if (!track) return;
    audio.src = track.path; audio.volume = .4;
    try { await audio.play(); $('music-status').textContent = '♫ ' + track.name; }
    catch (_) { $('music-status').textContent = 'Tap ♫ to enable music; your game is ready.'; }
  }
  audio.onended = playNext;
  audio.onerror = () => { $('music-status').textContent = 'Original music asset could not load. Table sound effects still work.'; };
  async function selectMood(idValue) {
    mood = music?.moods.find(m => m.id === idValue) || null;
    queue = []; audio.pause();
    document.querySelectorAll('[data-mood]').forEach(b => b.classList.toggle('selected', b.dataset.mood === idValue));
    if (mood) await playNext();
    else $('music-status').textContent = 'Table sound effects only.';
  }
  function stopEgg() {
    egg.pause(); isEgg = false; if (mood && !muted) playNext();
  }
  window.addEventListener('message', e => {
    if (!frame || e.source !== frame.contentWindow || e.origin !== location.origin) return;
    const data = e.data;
    if (data?.channel === 'starmuff-pinball' && data.runId === match?.id) {
      if (data.type === 'ready') {
        if (restoreExpected && !data.restored) { missingCheckpoint(); return; }
        restoreExpected = null;
        control('pause', {paused: $('play').hidden || mode === 'online' && !mp?.connected});
      }
      if (data.type === 'progress') {
        const accepted = commit(slot, data.progress);
        // A terminal event may have happened while the socket was offline. Its
        // state stays terminal locally, but resending it on reconnect is safe.
        const terminalReplay = !match.result && ['done','forfeit'].includes(data.progress?.status) &&
          data.progress.status === match.players[slot].status && data.progress.score === match.players[slot].score;
        if (mode === 'online' && (accepted || terminalReplay)) mp.send('pinball-progress', data.progress);
      }
      if (data.type === 'restart-blocked') setStatus('A duel run cannot restart. Forfeit from Menu or finish your balls.');
      return;
    }
    if (data?.type === 'playEasterEgg') {
      const src = music?.easterEggs[data.song]; if (!src) return;
      audio.pause(); egg.pause(); egg.src = src; egg.volume = muted ? 0 : .5; isEgg = true;
      egg.onended = () => {
        if (data.song.startsWith('banana')) frame?.contentWindow.postMessage({type:'fruitFrenzyEnd'}, location.origin);
        stopEgg();
      };
      egg.play().catch(() => { $('music-status').textContent = 'Tap ♫ to enable the original Easter-egg song.'; });
    }
    if (data?.type === 'stopEasterEgg') stopEgg();
    if (data?.type === 'showStableVideo' && music) { $('stable-video').src = music.stableVideo; $('stable-video').hidden = false; $('stable-video').play().catch(() => {}); }
    if (data?.type === 'hideStableVideo') { $('stable-video').hidden = true; $('stable-video').pause(); }
  });
  document.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => selectMode(b.dataset.mode));
  $('moods').onclick = e => { const button = e.target.closest('[data-mood]'); if (button) selectMood(button.dataset.mood); };
  $('start').onclick = () => {
    if (mode === 'solo') { resumeLocal = false; match = null; drawScores(); makeFrame(false); setStatus('Solo · original table, settings, unlocks and local scores'); }
    else { startLocal(resumeLocal && !!match); resumeLocal = false; }
  };
  $('resume').onclick = () => { show('play'); playNext(); };
  $('menu-toggle').onclick = () => show($('setup').hidden ? 'setup' : frame ? 'play' : 'setup');
  $('forfeit').onclick = () => confirmForfeit($('forfeit'), () => control('forfeit'));
  $('cancel-forfeit').onclick = () => { cancelForfeit(); setStatus('Forfeit cancelled. Your run is still saved.'); };
  $('music-toggle').onclick = () => {
    muted = !muted; audio.volume = muted ? 0 : .4; egg.volume = muted ? 0 : .5;
    $('music-toggle').textContent = muted ? '♫×' : '♫';
    $('music-toggle').setAttribute('aria-label', muted ? 'Unmute music' : 'Mute music');
    if (!muted) { if (isEgg) egg.play().catch(() => {}); else if (audio.src) audio.play().catch(() => {}); else playNext(); }
  };
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { control('pause', {paused:true}); audio.pause(); egg.pause(); }
    else if (frame && mode !== 'solo') { show('setup'); setStatus('Your table is paused. Tap Return to your game to continue.'); }
  });
  fetch('./music.json').then(r => { if (!r.ok) throw Error('Music manifest'); return r.json(); }).then(value => {
    music = value;
    for (const item of music.moods) {
      const b = document.createElement('button'); b.className = 'mood'; b.dataset.mood = item.id;
      const icon = document.createElement('span'); icon.textContent = item.emoji;
      const description = document.createElement('div'), name = document.createElement('b'), sub = document.createElement('small');
      name.textContent = item.name; sub.textContent = item.subtitle + ' · ' + item.tracks.length + ' tracks';
      description.append(name,sub); b.append(icon,description); $('moods').appendChild(b);
    }
  }).catch(() => { $('music-status').textContent = 'Music manifest unavailable; table sound effects are still available.'; });
  const params = new URLSearchParams(location.search);
  if (params.has('room')) selectMode('online');
  else {
    try {
      const saved = JSON.parse(sessionStorage.getItem(localKey) || 'null');
      if (saved && D.validate(saved.match, saved.match.id) && !saved.match.result) {
        mode = 'local'; match = saved.match; slot = saved.slot; resumeLocal = true; selectMode('local'); drawScores();
        setStatus('Your unfinished pass-and-play duel is saved on this tab.');
      }
    } catch (_) {}
  }
})();
