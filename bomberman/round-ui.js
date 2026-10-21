/* Round presentation is local; only the host advances the countdown in the game snapshot. */
(() => {
  'use strict';
  const GUIDE_KEY = 'bombman:zoom-guide:v1';
  let seenGuide = false, guide = null, countdown = null, previousBeat = '', notificationTimer = 0;
  let current = null, context = null, guideVisible = false;
  try { seenGuide = localStorage.getItem(GUIDE_KEY) === 'done'; } catch {}

  function mount() {
    const wrap = document.getElementById('bmBoardWrap');
    if (!wrap || countdown) return !!countdown;
    countdown = document.createElement('div');
    countdown.id = 'bmCountdown';
    countdown.hidden = true;
    countdown.setAttribute('role', 'status');
    countdown.setAttribute('aria-live', 'polite');
    countdown.setAttribute('aria-atomic', 'true');
    countdown.innerHTML = '<span class="bmRoundKicker"></span><strong class="bmRoundNumber"></strong><span class="bmRoundCaption"></span><span class="bmRoundDots" aria-hidden="true"><i></i><i></i><i></i></span>';
    wrap.appendChild(countdown);
    guide = document.createElement('section');
    guide.id = 'bmZoomGuide';
    guide.hidden = true;
    guide.setAttribute('aria-labelledby', 'bmZoomGuideTitle');
    guide.innerHTML = '<div class="bmGuideCopy"><span class="bmGuideKicker">BEFORE YOUR FIRST BLAST</span><h2 id="bmZoomGuideTitle">Zoom in. Get ready.</h2><p>Pinch the map or tap <b>+</b> to zoom in. Tap <b>FIT</b> to see every lane.</p><span class="bmGuideHint"></span></div><div class="bmGuideButtons"><button type="button" id="bmGuideZoom">ZOOM IN <span aria-hidden="true">+</span></button><button type="button" id="bmGuideReady">READY</button></div>';
    wrap.appendChild(guide);
    document.getElementById('bmGuideZoom').addEventListener('click', () => {
      const zoom = window.BombManZoom;
      if (zoom) zoom.set(zoom.get() + .2, { source: 'onboarding' });
    });
    document.getElementById('bmGuideReady').addEventListener('click', () => {
      seenGuide = true;
      try { localStorage.setItem(GUIDE_KEY, 'done'); } catch {}
      const game = current;
      if (!context?.replica && game?.zoomGuide) context?.onReady?.(game);
      setGuide(false);
      document.getElementById('bmCanvas')?.focus({ preventScroll: true });
      if (game && context) sync(game, context);
    });
    return true;
  }

  function setGuide(visible) {
    if (!guide) return;
    guide.hidden = !visible;
    if (visible !== guideVisible) {
      window.BombManZoom?.focusGuide(visible);
      guideVisible = visible;
    }
  }

  function sync(game, options) {
    current = game;
    context = options;
    if (!mount()) return;
    if (!game || !options.active || game.status !== 'playing') {
      setGuide(false);
      countdown.hidden = true;
      previousBeat = '';
      return;
    }
    // A guest can adjust their view and dismiss this tip without pausing anybody else.
    const showGuide = options.replica ? !seenGuide : !!game.zoomGuide;
    setGuide(showGuide);
    if (showGuide) {
      guide.querySelector('.bmGuideHint').textContent = options.replica ? 'Your view only. The live round keeps moving.' : 'Paused until you tap READY.';
      document.getElementById('bmGuideReady').textContent = options.replica ? 'GOT IT' : 'READY';
    }
    const waiting = !!game.zoomGuide;
    const beat = waiting ? '' : game.countdown > 0 ? String(Math.ceil(game.countdown)) : game.goTime > 0 ? 'GO!' : '';
    const showWaiting = waiting && options.replica && !showGuide;
    countdown.hidden = !beat && !showWaiting;
    if (!beat && !showWaiting) { previousBeat = ''; return; }
    const key = `${game.roundId || options.round}:${beat || 'wait'}`;
    if (key !== previousBeat) {
      previousBeat = key;
      // Update the live region only when the beat changes, never on every animation frame.
      countdown.classList.toggle('bmGo', beat === 'GO!');
      countdown.classList.toggle('bmWaiting', showWaiting);
      countdown.querySelector('.bmRoundKicker').textContent = `ROUND ${options.round}/${options.total}`;
      countdown.querySelector('.bmRoundNumber').textContent = showWaiting ? 'GET READY' : beat;
      countdown.querySelector('.bmRoundCaption').textContent = showWaiting ? 'Host is setting their view' : beat === 'GO!' ? 'MAKE YOUR MOVE' : 'FIND YOUR FIRST ESCAPE';
      countdown.querySelectorAll('.bmRoundDots i').forEach((dot, i) => dot.classList.toggle('lit', beat === 'GO!' || (Number(beat) > 0 && i >= Number(beat) - 1)));
      countdown.classList.remove('bmBeat');
      void countdown.offsetWidth;
      countdown.classList.add('bmBeat');
      if (beat) options.onBeat?.(beat);
    }
  }

  const powerUps = {
    'BOMB+': ['bomb', 'Carry another bomb'], 'FIRE+': ['ic_fire', 'Longer blast reach'],
    SPEED: ['pu_speed', 'Move faster'], REMOTE: ['bomb_remote', 'Tap DET to detonate'],
    KICK: ['pu_kick', 'Walk into bombs to kick'], PUNCH: ['pu_punch', 'Tap ACT to launch bombs'],
    CARRY: ['pu_carry', 'Tap ACT to pick up a bomb'], LINE: ['pu_line', 'Drop a row of bombs'],
    SHIELD: ['pu_shield', 'One blast protected']
  };
  function notify(node, message, seconds) {
    if (!node) return;
    clearTimeout(notificationTimer);
    const text = String(message);
    const name = text.endsWith(' acquired') ? text.slice(0, -9) : '';
    const power = powerUps[name];
    const warning = /lava|blast|hit|Boom|out\./i.test(text) && !power;
    node.replaceChildren();
    node.setAttribute('role', 'status');
    node.setAttribute('aria-live', 'polite');
    node.setAttribute('aria-atomic', 'true');
    node.classList.toggle('bmNoticeWarning', warning);
    node.style.setProperty('--notice-time', `${seconds}s`);
    const icon = document.createElement('img');
    icon.src = `/bomberman/sprites/${power?.[0] || (warning ? 'pu_shield' : 'bomb')}.webp?v=2`;
    icon.alt = '';
    const copy = document.createElement('span');
    copy.className = 'bmNoticeCopy';
    const kicker = document.createElement('small');
    kicker.textContent = power ? 'POWER UP!' : warning ? 'HEADS UP' : 'ARENA UPDATE';
    const title = document.createElement('strong');
    title.textContent = power ? name : text;
    copy.append(kicker, title);
    if (power) {
      const detail = document.createElement('span');
      detail.textContent = power[1];
      copy.append(detail);
    }
    node.append(icon, copy);
    node.classList.remove('hidden', 'bmNoticeIn');
    void node.offsetWidth;
    node.classList.add('bmNoticeIn');
    notificationTimer = setTimeout(() => hideNotice(node), seconds * 1000);
  }
  function hideNotice(node) {
    clearTimeout(notificationTimer);
    node?.classList.add('hidden');
  }
  window.BombManRoundUI = {
    needsGuide: () => !seenGuide,
    sync, notify, hideNotice,
    hide() { current = null; setGuide(false); if (countdown) countdown.hidden = true; previousBeat = ''; }
  };
})();
