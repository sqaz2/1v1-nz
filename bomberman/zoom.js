/* Map camera controls. Two board fingers take over; move + action stays a game gesture. */
(() => {
  'use strict';
  const MIN = 1, MAX = 2.4, STEP = 0.2, STORAGE = 'bombman:zoom:v1';
  const clamp = n => Math.max(MIN, Math.min(MAX, n));
  let zoom = MIN, toolbar, readout, minus, plus, persistTimer, coaching = false;
  const subscribers = new Set();
  const fallbackViews = new WeakMap();
  try {
    const saved = Number(localStorage.getItem(STORAGE));
    if (Number.isFinite(saved) && saved >= MIN) zoom = clamp(saved);
  } catch { /* Private browsing and storage quotas must not affect play. */ }

  function persist() {
    clearTimeout(persistTimer);
    try { localStorage.setItem(STORAGE, String(zoom)); } catch {}
  }
  function updateUI() {
    if (!toolbar) return;
    readout.textContent = zoom.toFixed(1) + '×';
    readout.setAttribute('aria-label', `Map zoom ${Math.round(zoom * 100)} percent`);
    minus.disabled = zoom <= MIN;
    plus.disabled = zoom >= MAX;
    toolbar.classList.toggle('is-coached', coaching);
  }
  function set(value, { source = 'api' } = {}) {
    if (!Number.isFinite(Number(value))) return zoom;
    const next = Math.round(clamp(Number(value)) * 1000) / 1000;
    if (next === zoom) return zoom;
    zoom = next;
    updateUI();
    clearTimeout(persistTimer);
    persistTimer = setTimeout(persist, 180);
    window.dispatchEvent(new CustomEvent('bm:zoom', { detail: { zoom, source } }));
    for (const fn of subscribers) {
      try { fn(zoom, source); } catch (error) { console.error('Zoom listener failed', error); }
    }
    return zoom;
  }
  function resetFallback(canvas) {
    if (!canvas || !fallbackViews.has(canvas)) return;
    const previous = fallbackViews.get(canvas);
    canvas.style.transform = previous.transform;
    canvas.style.transformOrigin = previous.origin;
    fallbackViews.delete(canvas);
  }
  function applyFallback(canvas, focus, viewport = {}) {
    if (!canvas) return;
    if (zoom === MIN) { resetFallback(canvas); return; }
    const width = Math.max(1, viewport.width || canvas.clientWidth || canvas.width);
    const height = Math.max(1, viewport.height || canvas.clientHeight || canvas.height);
    const left = viewport.left || 0, top = viewport.top || 0;
    const center = { x: left + width / 2, y: top + height / 2 };
    const following = Math.min(1, (zoom - MIN) / .45);
    const target = {
      x: center.x + ((Number.isFinite(focus?.x) ? focus.x : center.x) - center.x) * following,
      y: center.y + ((Number.isFinite(focus?.y) ? focus.y : center.y) - center.y) * following
    };
    const now = performance.now();
    const size = `${left}:${top}:${width}:${height}`;
    let view = fallbackViews.get(canvas);
    if (!view) {
      view = { x: target.x, y: target.y, at: now, size, zoom, roundId: viewport.roundId, transform: canvas.style.transform || '', origin: canvas.style.transformOrigin || '' };
      fallbackViews.set(canvas, view);
    }
    // Follow the actor without re-projecting/rebuilding the static Canvas2D board every frame.
    const blend = view.zoom !== zoom || view.roundId !== viewport.roundId || view.size !== size ? 1 : 1 - Math.exp(-Math.min(.1, Math.max(0, (now - view.at) / 1000)) * 10);
    view.x += (target.x - view.x) * blend;
    view.y += (target.y - view.y) * blend;
    view.at = now;
    view.size = size;
    view.zoom = zoom;
    view.roundId = viewport.roundId;
    const tx = Math.max((left + width) * (1 - zoom), Math.min(left * (1 - zoom), center.x - zoom * view.x));
    const ty = Math.max((top + height) * (1 - zoom), Math.min(top * (1 - zoom), center.y - zoom * view.y));
    const transform = `translate(${tx.toFixed(2)}px,${ty.toFixed(2)}px) scale(${zoom})`;
    if (canvas.style.transform !== transform) {
      canvas.style.transformOrigin = '0 0';
      canvas.style.transform = transform;
    }
  }
  window.BombManZoom = {
    get: () => zoom,
    set,
    fit: () => set(MIN, { source: 'fit' }),
    applyFallback,
    resetFallback,
    focusGuide(on) { coaching = !!on; updateUI(); },
    subscribe(fn) {
      if (typeof fn !== 'function') return () => {};
      subscribers.add(fn);
      return () => subscribers.delete(fn);
    }
  };

  function init() {
    const board = document.getElementById('bmBoardWrap');
    const game = document.getElementById('bmGame');
    const zone = document.getElementById('bmMoveZone');
    if (!board || !game || document.getElementById('bmZoomControls')) return;
    const style = document.createElement('style');
    style.textContent = `
      #bmZoomControls{position:absolute;top:8px;right:10px;z-index:10;display:flex;align-items:center;gap:3px;padding:3px;border:1px solid #7595ba55;border-radius:13px;background:#091424ec;box-shadow:0 5px 18px #0007;pointer-events:auto;touch-action:none;user-select:none;-webkit-user-select:none}
      #bmZoomControls button{display:grid;place-items:center;width:36px;height:36px;padding:0;border:1px solid #a2bdd425;border-radius:9px;color:#eff8ff;background:linear-gradient(180deg,#263b53,#152336);font:800 23px/1 system-ui,sans-serif;cursor:pointer;touch-action:none;-webkit-tap-highlight-color:transparent}
      #bmZoomControls button:active{transform:scale(.94)}
      #bmZoomControls button:focus-visible{outline:2px solid #fff;outline-offset:2px}
      #bmZoomControls button:disabled{opacity:.35;cursor:default}
      #bmZoomControls #bmZoomIn{color:#221903;background:linear-gradient(180deg,#ffdb74,#eeac2e);border-color:#ffde79}
      #bmZoomControls #bmZoomFit{width:39px;font-size:10px;letter-spacing:.05em}
      #bmZoomReadout{width:39px;text-align:center;color:#daedfa;font:800 12px/1 system-ui,sans-serif;font-variant-numeric:tabular-nums}
      #bmZoomControls.is-coached{border-color:#ffdb73;animation:bmZoomBeacon 1.5s ease-in-out infinite}
      #bmArenaLabel{max-width:calc(100% - 207px);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      @keyframes bmZoomBeacon{50%{box-shadow:0 0 0 5px #ffce5222,0 0 26px #ffbb4d55}}
      @media(orientation:landscape) and (max-height:500px){#bmZoomControls{top:6px;right:8px;border-radius:11px}#bmZoomControls button{width:32px;height:32px}#bmZoomControls #bmZoomFit{width:35px}#bmZoomReadout{width:35px}#bmArenaLabel{max-width:calc(100% - 186px)}}
      @media(prefers-reduced-motion:reduce){#bmZoomControls.is-coached{animation:none;box-shadow:0 0 0 3px #ffce5233}}
    `;
    document.head.appendChild(style);
    toolbar = document.createElement('div');
    toolbar.id = 'bmZoomControls';
    toolbar.setAttribute('role', 'group');
    toolbar.setAttribute('aria-label', 'Map zoom. Pinch the arena or use these controls.');
    toolbar.innerHTML = '<button type="button" id="bmZoomOut" aria-label="Zoom map out" title="Zoom out">−</button><output id="bmZoomReadout" aria-live="off"></output><button type="button" id="bmZoomIn" aria-label="Zoom map in" title="Zoom in">+</button><button type="button" id="bmZoomFit" aria-label="Fit the whole map" title="Show the whole map">FIT</button>';
    board.appendChild(toolbar);
    minus = toolbar.querySelector('#bmZoomOut');
    plus = toolbar.querySelector('#bmZoomIn');
    readout = toolbar.querySelector('#bmZoomReadout');
    minus.addEventListener('click', () => set(zoom - STEP, { source: 'button' }));
    plus.addEventListener('click', () => set(zoom + STEP, { source: 'button' }));
    toolbar.querySelector('#bmZoomFit').addEventListener('click', window.BombManZoom.fit);
    toolbar.addEventListener('pointerdown', e => e.stopPropagation());
    toolbar.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); });
    updateUI();

    const points = new Map();
    let pinching = false, gesture = null;
    const excluded = 'button,a,input,select,textarea,[role="button"],[data-bm-no-zoom],#bmZoomControls,#bmZoomGuide,#bmResult';
    const active = () => !game.classList.contains('hidden') && window.BombManLegacy?.getState()?.screen === 'game';
    const insideBoard = e => {
      const r = board.getBoundingClientRect();
      return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    };
    const consume = e => { if (e.cancelable) e.preventDefault(); e.stopImmediatePropagation(); };
    const distance = ids => {
      const a = points.get(ids[0]), b = points.get(ids[1]);
      return Math.hypot(a.x - b.x, a.y - b.y);
    };
    function rebase() {
      if (points.size < 2) { gesture = null; return; }
      const ids = [...points.keys()].slice(0, 2);
      gesture = { ids, distance: Math.max(8, distance(ids)), zoom };
    }
    function releaseMovement() {
      // Cancel through the joystick's normal end handler to clear its private pointer id.
      // Merely sending a neutral direction would let the next move start it again.
      if (zone) for (const id of points.keys()) {
        const cancel = new PointerEvent('pointercancel', { pointerId: id, pointerType: 'touch', bubbles: true });
        cancel.bmZoomCancellation = true;
        zone.dispatchEvent(cancel);
        try { if (zone.hasPointerCapture(id)) zone.releasePointerCapture(id); } catch {}
      }
      const state = window.BombManLegacy?.getState();
      if (state) {
        state.stickDir = null;
        state.stickAlt = null;
        state.dir = state.keyDir || null;
        state.dirTimer = 0;
      }
      // Online guests also need a stop packet when the pinch takes over.
      window.dispatchEvent(new CustomEvent('bm:stick', { detail: { dir: null, alt: null } }));
    }
    document.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'touch' || !active() || !insideBoard(e) || e.target.closest?.(excluded)) return;
      points.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (!pinching && points.size >= 2) {
        pinching = true;
        releaseMovement();
        rebase();
      } else if (pinching && !gesture) rebase();
      if (pinching) consume(e);
    }, { capture: true, passive: false });
    document.addEventListener('pointermove', e => {
      if (!points.has(e.pointerId)) return;
      points.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (!pinching) return;
      consume(e);
      if (gesture && gesture.ids.includes(e.pointerId)) {
        set(gesture.zoom * distance(gesture.ids) / gesture.distance, { source: 'pinch' });
      }
    }, { capture: true, passive: false });
    function end(e) {
      if (e.bmZoomCancellation || !points.has(e.pointerId)) return;
      const wasPinching = pinching;
      const wasPair = gesture?.ids.includes(e.pointerId);
      points.delete(e.pointerId);
      if (wasPair) rebase();
      if (!points.size) { pinching = false; gesture = null; }
      // The remaining finger stays neutral until lifted; it must not jump back into movement.
      if (wasPinching) consume(e);
    }
    document.addEventListener('pointerup', end, { capture: true, passive: false });
    document.addEventListener('pointercancel', end, { capture: true, passive: false });
    function resetPointers() {
      if (points.size) releaseMovement();
      points.clear();
      pinching = false;
      gesture = null;
    }
    window.addEventListener('blur', resetPointers);
    document.addEventListener('visibilitychange', () => { if (document.hidden) resetPointers(); });
    document.addEventListener('wheel', e => {
      if (!active() || !insideBoard(e) || e.target.closest?.(excluded) || !e.deltaY) return;
      const units = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? board.clientHeight : 1;
      set(zoom * Math.exp(-e.deltaY * units * 0.0015), { source: 'wheel' });
      consume(e);
    }, { capture: true, passive: false });
    window.addEventListener('pagehide', persist);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
