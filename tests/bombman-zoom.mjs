import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../bomberman/zoom.js', import.meta.url), 'utf8');

// Small event/DOM harness: exercises capture takeover against a one-pointer joystick.
function fixture(saved = null, storageBlocked = false) {
  const ids = new Map();
  class Event {
    constructor(type, props = {}) { Object.assign(this, { type, cancelable: true, bubbles: true }, props); }
    preventDefault() { this.defaultPrevented = true; }
    stopPropagation() { this.stopped = true; }
    stopImmediatePropagation() { this.immediate = this.stopped = true; }
  }
  class Element {
    constructor(tag = 'div', id) {
      this.tagName = tag.toUpperCase(); this.listeners = new Map(); this.children = [];
      this.attributes = {}; this.classes = new Set(); this.captures = new Set(); this.clientHeight = 400;
      this.classList = { contains: c => this.classes.has(c), toggle: (c, on) => on ? this.classes.add(c) : this.classes.delete(c) };
      if (id) this.id = id;
    }
    set id(v) { this._id = v; ids.set(v, this); }
    get id() { return this._id; }
    set innerHTML(v) { for (const m of v.matchAll(/<(button|output)[^>]*id="([^"]+)"/g)) this.appendChild(new Element(m[1], m[2])); }
    appendChild(el) { el.parentElement = this; this.children.push(el); return el; }
    setAttribute(k, v) { this.attributes[k] = v; }
    querySelector(s) { return ids.get(s.slice(1)); }
    getBoundingClientRect() { return { left: 0, right: 800, top: 0, bottom: 400 }; }
    closest(selectors) {
      for (let el = this; el; el = el.parentElement) {
        if (selectors.split(',').some(s => s.startsWith('#') ? el.id === s.slice(1) : s.toUpperCase() === el.tagName)) return el;
      }
      return null;
    }
    addEventListener(type, fn, opts) {
      if (!this.listeners.has(type)) this.listeners.set(type, []);
      this.listeners.get(type).push({ fn, capture: opts === true || !!opts?.capture });
    }
    dispatchEvent(e) {
      e.target = this;
      const path = []; for (let el = this; el; el = el.parentElement) path.push(el);
      const call = (el, capture) => {
        for (const listener of el.listeners.get(e.type) || []) {
          if (listener.capture === capture) listener.fn(e);
          if (e.immediate) break;
        }
      };
      for (const el of [...path].reverse()) { call(el, true); if (e.stopped) return !e.defaultPrevented; }
      for (const el of path) { call(el, false); if (e.stopped || !e.bubbles) break; }
      return !e.defaultPrevented;
    }
    hasPointerCapture(id) { return this.captures.has(id); }
    setPointerCapture(id) { this.captures.add(id); }
    releasePointerCapture(id) { this.captures.delete(id); }
  }
  const document = new Element('document');
  document.readyState = 'complete'; document.hidden = false;
  document.getElementById = id => ids.get(id);
  document.createElement = tag => new Element(tag);
  document.head = document.appendChild(new Element('head'));
  const game = document.appendChild(new Element('section', 'bmGame'));
  const board = game.appendChild(new Element('div', 'bmBoardWrap'));
  const zone = game.appendChild(new Element('div', 'bmMoveZone'));
  const bomb = game.appendChild(new Element('button', 'bmBombBtn'));
  const guide = board.appendChild(new Element('div', 'bmZoomGuide'));
  const window = new Element('window');
  const state = { screen: 'game', stickDir: null, stickAlt: null, keyDir: null, dir: null };
  window.BombManLegacy = { getState: () => state };
  const stored = new Map([['bombman:zoom:v1', saved]]);
  const localStorage = {
    getItem(k) { if (storageBlocked) throw Error('disabled'); return stored.get(k); },
    setItem(k, v) { if (storageBlocked) throw Error('disabled'); stored.set(k, v); }
  };
  let joystickPointer = null, moves = 0, cancels = 0, stops = 0;
  zone.addEventListener('pointerdown', e => { if (joystickPointer !== null) return; joystickPointer = e.pointerId; zone.setPointerCapture(e.pointerId); });
  zone.addEventListener('pointermove', e => {
    if (e.pointerId !== joystickPointer) return;
    moves++; state.stickDir = state.dir = 'right';
  });
  for (const type of ['pointerup', 'pointercancel']) zone.addEventListener(type, e => {
    if (e.pointerId !== joystickPointer) return;
    if (type === 'pointercancel') cancels++;
    joystickPointer = null; state.stickDir = state.dir = null;
  });
  window.addEventListener('bm:stick', e => { if (e.detail?.dir === null) stops++; });
  const timers = new Map(); let timerId = 0, now = 0;
  vm.runInNewContext(source, {
    window, document, localStorage, CustomEvent: Event, PointerEvent: Event, console, performance: { now: () => now },
    setTimeout: fn => { timers.set(++timerId, fn); return timerId; }, clearTimeout: id => timers.delete(id)
  });
  const send = (target, type, id, x = 100, y = 200, extra = {}) => {
    const event = new Event(type, { pointerId: id, pointerType: 'touch', clientX: x, clientY: y, ...extra });
    target.dispatchEvent(event); return event;
  };
  return {
    window, document, game, board, zone, bomb, guide, state, ids, send, stored,
    api: window.BombManZoom,
    input: () => ({ joystickPointer, moves, cancels, stops }),
    flush: () => { for (const fn of [...timers.values()]) fn(); },
    advance: ms => { now += ms; }
  };
}

test('zoom controls clamp, publish changes, fit the arena, and persist without requiring storage', () => {
  const f = fixture('1.8');
  assert.equal(f.api.get(), 1.8);
  const events = [];
  const unsubscribe = f.api.subscribe((zoom, source) => events.push([zoom, source]));
  f.send(f.ids.get('bmZoomIn'), 'click');
  assert.equal(f.api.get(), 2);
  f.api.set(100);
  assert.equal(f.api.get(), 2.4);
  assert.equal(f.ids.get('bmZoomIn').disabled, true);
  f.api.set(NaN);
  assert.equal(f.api.get(), 2.4);
  f.api.fit();
  assert.equal(f.api.get(), 1);
  assert.equal(f.ids.get('bmZoomOut').disabled, true);
  assert.deepEqual(events, [[2, 'button'], [2.4, 'api'], [1, 'fit']]);
  unsubscribe(); f.api.set(1.4); assert.equal(events.length, 3);
  f.flush(); assert.equal(f.stored.get('bombman:zoom:v1'), '1.4');
  const blocked = fixture(null, true);
  blocked.api.set(1.8); assert.doesNotThrow(blocked.flush);
});

test('one finger and move plus bomb retain the existing joystick behavior', () => {
  const f = fixture();
  const down = f.send(f.zone, 'pointerdown', 1);
  f.send(f.zone, 'pointermove', 1, 130);
  const bomb = f.send(f.bomb, 'pointerdown', 2, 700, 300);
  f.send(f.zone, 'pointermove', 1, 160);
  assert.equal(down.defaultPrevented, undefined);
  assert.equal(bomb.defaultPrevented, undefined);
  assert.equal(f.api.get(), 1);
  assert.equal(f.state.dir, 'right');
  assert.deepEqual(f.input(), { joystickPointer: 1, moves: 2, cancels: 0, stops: 0 });
});

test('a board pinch cancels and releases the joystick, zooms, and holds the leftover finger neutral', () => {
  const f = fixture();
  f.send(f.zone, 'pointerdown', 1, 100);
  f.send(f.zone, 'pointermove', 1, 110);
  const second = f.send(f.board, 'pointerdown', 2, 310);
  assert.equal(second.defaultPrevented, true);
  assert.equal(f.input().cancels, 1);
  assert.equal(f.input().stops, 1);
  assert.equal(f.zone.hasPointerCapture(1), false);
  assert.equal(f.state.dir, null);
  const move = f.send(f.board, 'pointermove', 2, 510);
  assert.equal(move.defaultPrevented, true);
  assert.equal(f.api.get(), 2);
  f.send(f.board, 'pointerup', 2, 510);
  const leftover = f.send(f.zone, 'pointermove', 1, 170);
  assert.equal(leftover.defaultPrevented, true);
  assert.equal(f.input().moves, 1);
  f.send(f.zone, 'pointerup', 1, 170);
  f.send(f.zone, 'pointerdown', 3, 100);
  f.send(f.zone, 'pointermove', 3, 130);
  assert.equal(f.input().moves, 2);
  assert.equal(f.state.dir, 'right');
});

test('guide and toolbar touches cannot become the second pinch finger', () => {
  const f = fixture();
  f.send(f.zone, 'pointerdown', 1);
  f.send(f.guide, 'pointerdown', 2, 300);
  f.send(f.ids.get('bmZoomIn'), 'pointerdown', 3, 700);
  f.send(f.zone, 'pointermove', 1, 130);
  assert.equal(f.input().cancels, 0);
  assert.equal(f.state.dir, 'right');
});

test('cancel and blur release gestures so subsequent one-finger movement is clean', () => {
  const f = fixture();
  f.send(f.zone, 'pointerdown', 1, 100);
  f.send(f.board, 'pointerdown', 2, 300);
  f.send(f.zone, 'pointercancel', 1);
  f.send(f.board, 'pointercancel', 2);
  f.send(f.zone, 'pointerdown', 3);
  f.send(f.zone, 'pointermove', 3, 130);
  assert.equal(f.state.dir, 'right');
  f.send(f.window, 'blur');
  assert.equal(f.state.dir, null);
  f.send(f.zone, 'pointerdown', 4);
  f.send(f.zone, 'pointermove', 4, 150);
  assert.equal(f.input().moves, 2);
});

test('wheel zoom applies only to the playable board, with pixel and line delta support', () => {
  const f = fixture();
  f.send(f.board, 'wheel', null, 400, 200, { deltaY: -100, deltaMode: 0 });
  assert.ok(f.api.get() > 1);
  const previous = f.api.get();
  f.send(f.board, 'wheel', null, 400, 200, { deltaY: -2, deltaMode: 1 });
  assert.ok(f.api.get() > previous);
  const zoom = f.api.get();
  f.send(f.board, 'wheel', null, 900, 200, { deltaY: -200 });
  f.state.screen = 'menu';
  f.send(f.board, 'wheel', null, 400, 200, { deltaY: -200 });
  assert.equal(f.api.get(), zoom);
});

test('fallback zoom scales the finished canvas, follows the actor smoothly, and preserves its backing store', () => {
  const f = fixture();
  const canvas = { width: 1600, height: 800, clientWidth: 800, clientHeight: 400, style: {} };
  const viewport = { left: 0, top: 30, width: 600, height: 300, roundId: 'one' };
  f.api.set(2);
  f.api.applyFallback(canvas, { x: 300, y: 180 }, viewport);
  assert.equal(canvas.style.transform, 'translate(-300.00px,-180.00px) scale(2)');
  assert.equal(canvas.style.transformOrigin, '0 0');
  f.advance(16);
  f.api.applyFallback(canvas, { x: 450, y: 180 }, viewport);
  const x = Number(canvas.style.transform.match(/translate\(([-.\d]+)/)[1]);
  assert.ok(x < -300 && x > -600, 'camera interpolates toward the moved actor');
  assert.equal(canvas.width, 1600);
  assert.equal(canvas.height, 800);
  f.api.fit(); f.api.applyFallback(canvas, null, viewport);
  assert.equal(canvas.style.transform, '');
  assert.equal(canvas.style.transformOrigin, '');
});

test('fallback camera bounds avoid blank edges and WebGL recovery restores canvas styles', () => {
  const f = fixture();
  const canvas = { clientWidth: 800, clientHeight: 400, style: { transform: 'none', transformOrigin: '50% 50%' } };
  f.api.set(2.4);
  f.api.applyFallback(canvas, { x: -100, y: -100 }, { width: 600, height: 300, top: 30, roundId: 'one' });
  assert.equal(canvas.style.transform, 'translate(0.00px,-42.00px) scale(2.4)');
  f.api.applyFallback(canvas, { x: 9999, y: 9999 }, { width: 600, height: 300, top: 30, roundId: 'two' });
  assert.equal(canvas.style.transform, 'translate(-840.00px,-462.00px) scale(2.4)');
  f.api.resetFallback(canvas);
  assert.equal(canvas.style.transform, 'none');
  assert.equal(canvas.style.transformOrigin, '50% 50%');
  assert.doesNotThrow(() => f.api.resetFallback(canvas));
});

test('fallback zoom changes focus on the same frame so a corner player stays visible', () => {
  const f = fixture();
  const canvas = { clientWidth: 800, clientHeight: 400, style: {} };
  const viewport = { width: 600, height: 300, roundId: 'one' };
  f.api.set(1.2); f.api.applyFallback(canvas, { x: 30, y: 40 }, viewport);
  f.advance(16);
  f.api.set(2.4); f.api.applyFallback(canvas, { x: 30, y: 40 }, viewport);
  const [, x, y] = canvas.style.transform.match(/translate\(([-.\d]+)px,([-.\d]+)px\)/);
  assert.ok(20 * 2.4 + Number(x) >= 0 && 40 * 2.4 + Number(x) < 600);
  assert.ok(20 * 2.4 + Number(y) >= 0 && 60 * 2.4 + Number(y) < 300);
});
