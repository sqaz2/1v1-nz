// Bomb Man polish guards: no emoji / fake data anywhere in the Bomb Man screens, real result screens,
// compact phone layouts and a live pill that never clips.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(path.join(root, 'bomberman/index.html'), 'utf8');
const live = readFileSync(path.join(root, 'bomberman/live.js'), 'utf8');
const overlay = html.slice(html.indexOf('<div id="bombOverlay"'), html.indexOf('<div id="touchUI">'));
const bmScript = html.slice(html.indexOf('/* ===== Bomb Man true 3D built-in mode ===== */'), html.indexOf('function bombLoop('));

test('Bomb Man screens have no emoji and no fake currency/level chips', () => {
  assert.ok(overlay.length > 1000, 'overlay markup not found');
  assert.ok(!/\p{Extended_Pictographic}/u.test(overlay), 'emoji in the Bomb Man menu/game markup');
  assert.ok(!/Coins|Gems|Level <strong>24/.test(overlay), 'fake currency chips are back');
  assert.ok(!overlay.includes('data:image/jpeg;base64'), 'menu should use the key art, not the raw sprite sheet');
  assert.ok(overlay.includes('/bomberman/sprites/bg_menu.webp'), 'menu key art missing');
  for (const id of ['bmStatWins', 'bmStatRounds', 'bmStatBest']) assert.ok(overlay.includes(`id="${id}"`), `${id} stat missing`);
  const hud = bmScript.match(/const html = `([\s\S]*?)`;/);
  assert.ok(hud && !/\p{Extended_Pictographic}/u.test(hud[1]), 'emoji in the HUD');
  const msgs = [...bmScript.matchAll(/showBMMessage\(([^,)]+)/g)].map((m) => m[1]).join(' ');
  assert.ok(!/\p{Extended_Pictographic}/u.test(msgs), 'emoji in toasts');
});

test('rounds end on a real result card with retry/menu instead of bouncing to the menu', () => {
  for (const id of ['bmResult', 'bmResultTitle', 'bmRetryBtn', 'bmResultMenuBtn']) assert.ok(overlay.includes(`id="${id}"`), `${id} missing`);
  assert.match(bmScript, /showResult\(false,/, 'loss shows the result card');
  assert.match(bmScript, /showResult\(true,/, 'victory shows the result card');
  assert.ok(!/killPlayer[^\n]*setTimeout\(\(\)=>\{ if\(bm\.state\.active\) showMenu\(\); \},1500\)/.test(bmScript), 'old instant bounce to menu on death');
  assert.match(bmScript, /function sfxBoom\(\)/, 'explosions have a real noise-burst sound');
});

test('phone layouts: compact one-row HUD, board title on top in portrait, short live pill', () => {
  assert.match(html, /@media \(orientation:portrait\) and \(max-width:620px\)\{\s*#bmLiveStatus \.full\{display:none\}#bmLiveStatus \.short\{display:inline\}\s*#bmHud\{flex-wrap:nowrap/, 'portrait HUD collapses to one row');
  assert.match(html, /@media \(orientation:landscape\) and \(max-height:500px\)\{\s*#bmHud\{position:fixed/, 'landscape phones move the HUD into the top bar');
  assert.match(html, /function titleOnTop\(cv\)/, 'portrait draws the arena title above the board');
  const src = live.slice(live.indexOf('function shortStatus'), live.indexOf('function setStatus'));
  const shortStatus = new Function(`${src}; return shortStatus;`)();
  const cases = { 'SOLO · PREVIEW': 'SOLO', 'LIVE · HOST · 2/4': 'HOST 2/4', 'LIVE · P3 · 3/4': 'P3 3/4', 'LIVE · CONNECTING': 'LIVE…', 'LIVE OFFLINE · RETRYING': 'OFFLINE', 'LIVE FULL · RETRYING': 'FULL', 'LIVE LOST · SOLO · TAP TO REJOIN': 'REJOIN', 'SOLO · TAP TO JOIN LIVE': 'SOLO' };
  for (const [k, v] of Object.entries(cases)) { assert.equal(shortStatus(k), v, k); assert.ok(v.length <= 9, `${v} too long for the pill`); }
});

test('a guest waiting on an absent host rejoins instead of waiting forever', () => {
  assert.match(live, /function watchHost\(\)/);
  assert.match(live, /function refreshRole\(\)\{\s*const total=countHumans\(\);watchHost\(\);/);
  assert.match(live, /setTimeout\(\(\)=>\{hostWatch=null;[^}]*lostConnection\(\)\},17000\)/, 'guest drops and rejoins after the 15 s server grace');
});
