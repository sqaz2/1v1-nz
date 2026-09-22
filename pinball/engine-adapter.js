/* This adapter surrounds the extracted ORIGINAL engine. All scoring, physics,
 * table art, controls and events still execute in the upstream game code. */
(function () {
  'use strict';
  const config = window.PinballConfig;
  // Keep the original leaderboard rendering, but do not advertise a public
  // scoreboard that this separate 1v1 deployment does not implement.
  const originalFillText = ctx.fillText.bind(ctx);
  ctx.fillText = (text, ...args) => originalFillText(
    text === '🌐 GLOBAL TOP 20' ? '1V1 DUEL SCORES · ABOVE TABLE'
      : text === 'No scores yet — be the first!' ? 'Public leaderboard is not enabled here.' : text, ...args);
  if (!config.duel) return;
  const origin = location.origin;
  const key = 'starmuff-pinball-run:' + config.runId + ':' + config.slot;
  let sequence = 0, completed = false, finalStatus = null, suspended = false;
  function send(type, data = {}) { parent.postMessage({channel: 'starmuff-pinball', type, runId: config.runId, ...data}, origin); }
  // Career benefits must not depend on which browser/device has played before.
  // They still unlock from this run's score, as in the original game.
  getCareerBest = () => 0;
  updateCareerBest = () => false;
  saveScore = () => {};
  cheersDismissed = false;
  PREFS.speed = 1;
  // Media buffering/muting must not decide how long a scoring mode lasts.
  // Solo retains track-ended timing; duels use a fixed 60-second game clock.
  const originalTick = tick;
  tick = () => {
    originalTick();
    if (fruitFrenzy.active) {
      fruitFrenzy.duelTicks = (fruitFrenzy.duelTicks || 0) + 1;
      if (fruitFrenzy.duelTicks >= 3600) finishFruitFrenzy();
    }
  };
  const originalStart = startGame;
  startGame = () => { if (!S || S.phase === 'menu') originalStart(); };
  // A fresh iframe is required for a new run, so no old timers, keys or objects
  // can survive a rematch or hotseat handoff.
  restart = () => send('restart-blocked');
  holdRestart = () => {};
  updRestartBtn = () => { document.getElementById('restart-btn').style.display = 'none'; };
  function report(status = finalStatus || 'playing') {
    const progress = {score: Math.floor(S.score || 0), lives: Math.max(0, S.lives), ticks: S.t || 0, seq: sequence++, status};
    send('progress', {progress});
    return progress;
  }
  showNameEntry = () => {
    if (completed) return;
    completed = true;
    finalStatus = 'done';
    keys = {L: false, R: false, SP: false};
    clearInterval(chargeIv); chargeIv = null;
    window.PinballClock.paused = true;
    report('done');
    checkpoint();
  };
  function capture() {
    return {version: 1, runId: config.runId, seed: config.seed, sequence, completed, finalStatus, S,
      randomState: window.PinballClock.rng.getState(),
      focusOrb, focusMode, acidMode, acidTab, lamboMode, lamboUnlocked, lamboCharges, lamboUsed,
      lamboRescue, holeInOneGolf, dogBallIdx, stableMode, horseshoe, fruitTrigger, fruitFrenzy,
      newUnlocks, tallyState, camY, camYTarget,
      math: mathActive ? {problem: window.PinballActiveMath, left: mathTimeLeft} : null};
  }
  function checkpoint() {
    // A resolved math answer has an in-flight original animation callback; keep
    // the preceding checkpoint until that callback has ejected the held ball.
    if (!mathActive && document.getElementById('math-overlay').style.display === 'flex') return;
    try { sessionStorage.setItem(key, JSON.stringify(capture())); } catch (_) {}
  }
  function restore(saved) {
    if (!saved || saved.version !== 1 || saved.runId !== config.runId || saved.seed !== config.seed ||
        !saved.S || !Number.isSafeInteger(saved.S.score) || saved.S.score < 0) return false;
    S = saved.S;
    sequence = saved.sequence || 0; completed = !!saved.completed; finalStatus = saved.finalStatus || (completed ? 'done' : null);
    ({focusOrb, focusMode, acidMode, acidTab, lamboMode, lamboUnlocked, lamboCharges, lamboUsed,
      lamboRescue, holeInOneGolf, dogBallIdx, stableMode, horseshoe, fruitTrigger, fruitFrenzy,
      newUnlocks, tallyState, camY, camYTarget} = saved);
    window.PinballClock.rng.setState(saved.randomState);
    if (saved.math) {
      window.PinballPendingMath = saved.math.problem;
      window.PinballMathTime = saved.math.left;
      showMathChallenge();
    }
    window.PinballClock.paused = completed;
    return true;
  }
  function pause(value) {
    suspended = value;
    window.PinballClock.paused = completed || suspended;
    window.PinballClock.reset();
    keys = {L: false, R: false, SP: false}; flipPow = {L: 0, R: 0};
    clearInterval(chargeIv); chargeIv = null;
    checkpoint();
  }
  window.addEventListener('message', e => {
    if (e.source !== parent || e.origin !== origin || e.data?.channel !== 'starmuff-pinball-control' || e.data.runId !== config.runId) return;
    if (e.data.type === 'pause') pause(!!e.data.paused);
    if (e.data.type === 'sync') report();
    if (e.data.type === 'forfeit' && !completed) {
      completed = true; finalStatus = 'forfeit'; pause(true); report('forfeit'); checkpoint();
    }
  });
  // Hidden pages release controls and pause the original simulation; returning
  // never turns a stale held flipper into an involuntary shot.
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(true); });
  window.addEventListener('pagehide', checkpoint);
  window.addEventListener('blur', () => { keys = {L:false,R:false,SP:false}; flipPow = {L:0,R:0}; });
  let restored = false;
  try { restored = restore(JSON.parse(sessionStorage.getItem(key) || 'null')); } catch (_) {}
  if (!restored) originalStart();
  updScore(); updLives(); updCombo(); updMode(); updBtn(); updFocusBtn(); updNovaBtn(); updLambo();
  report();
  setInterval(() => { if (!completed) report(); checkpoint(); }, 1000);
  send('ready', {restored, completed});
})();
