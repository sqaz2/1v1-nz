// Bomb Man touch controls: floating joystick → 4-way grid mapping, layout guards.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(path.join(root, 'bomberman/index.html'), 'utf8');
const live = readFileSync(path.join(root, 'bomberman/live.js'), 'utf8');
const src = html.slice(html.indexOf('/* bmStickDir:start */'), html.indexOf('/* bmStickDir:end */'));
assert.ok(src.includes('function bmStickDir'), 'bmStickDir source block missing');
const bmStickDir = new Function(`${src}; return bmStickDir;`)();

test('deadzone ignores small drags', () => {
  assert.deepEqual(bmStickDir(0, 0, null), { dir: null, alt: null });
  assert.equal(bmStickDir(0.15, -0.1, null).dir, null);
  assert.equal(bmStickDir(0.2, 0.15, 'right').dir, null, 'deadzone applies even while holding');
});

test('dominant axis picks one of four grid directions (+y is down the screen)', () => {
  assert.equal(bmStickDir(1, 0, null).dir, 'right');
  assert.equal(bmStickDir(-1, 0.2, null).dir, 'left');
  assert.equal(bmStickDir(0.1, -0.9, null).dir, 'up');
  assert.equal(bmStickDir(-0.2, 0.8, null).dir, 'down');
});

test('hysteresis keeps the current axis near the diagonal and switches when clearly past it', () => {
  assert.equal(bmStickDir(0.6, 0.66, 'right').dir, 'right', 'slightly vertical-dominant keeps right');
  assert.equal(bmStickDir(0.66, 0.6, 'down').dir, 'down', 'slightly horizontal-dominant keeps down');
  assert.equal(bmStickDir(0.4, 0.8, 'right').dir, 'down', 'clearly vertical switches');
  assert.equal(bmStickDir(-0.8, 0.4, 'down').dir, 'left', 'clearly horizontal switches');
  assert.equal(bmStickDir(0.6, 0.66, null).dir, 'down', 'fresh touch uses plain dominant axis');
});

test('minor axis is reported for corner-sliding only when meaningful', () => {
  assert.deepEqual(bmStickDir(0.9, -0.5, null), { dir: 'right', alt: 'up' });
  assert.equal(bmStickDir(0.9, 0.1, null).alt, null);
  assert.deepEqual(bmStickDir(-0.45, 0.85, null), { dir: 'down', alt: 'left' });
});

test('D-pad is gone; floating joystick zone and thumb-arc buttons are in place', () => {
  assert.ok(!/data-dir=/.test(html), 'D-pad buttons should be removed');
  assert.ok(html.includes('id="bmMoveZone"') && html.includes('id="bmJoy"'), 'joystick zone missing');
  assert.match(html, /#bmMoveZone\{[^}]*width:\d+%[^}]*touch-action:none/, 'move zone must be % sized and block scroll/zoom');
  assert.match(html, /#bmJoy\.on\{opacity:1/, 'joystick should only show while touching');
  const b = html.match(/--b:clamp\((\d+)px,[^,]+,(\d+)px\)/), s = html.match(/--s:clamp\((\d+)px,[^,]+,(\d+)px\)/);
  assert.ok(b && +b[1] >= 88 && +b[2] <= 100, 'BOMB button should be 88-100px');
  assert.ok(s && +s[1] >= 64 && +s[2] <= 72, 'ACT/DET buttons should be 64-72px');
  assert.match(html, /\.bmActions\{[^}]*right:max\(10px,env\(safe-area-inset-right\)\);bottom:max\(10px,env\(safe-area-inset-bottom\)\)/, 'button arc must respect safe areas');
  for (const id of ['bmBombBtn', 'bmActBtn', 'bmDetBtn', 'bmMenuBtn']) assert.ok(html.includes(`id="${id}"`), `${id} missing`);
});

test('keyboard controls and online guests still drive movement', () => {
  for (const k of ["'ArrowUp','w','W'", "'ArrowDown','s','S'", "'ArrowLeft','a','A'", "'ArrowRight','d','D'"]) assert.ok(html.includes(k), `keyboard binding ${k} missing`);
  assert.ok(live.includes("addEventListener('bm:stick'"), 'live.js must forward joystick moves for guests');
  assert.ok(!/pointercancel'\]\.forEach\(type=>document\.addEventListener\(type,e=>\{if\(slot>0\)\{stopHeld\(\);e\.stopPropagation\(\)/.test(live), 'a global pointerup must not cancel joystick movement (multitouch)');
});
