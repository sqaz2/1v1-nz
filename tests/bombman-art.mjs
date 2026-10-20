// Bomb Man art guard: every gameplay object must be drawn from real sprite/texture files,
// never from flat-colour boxes, emoji or text placeholders. See docs/BOMBMAN-ART-AUDIT.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(path.join(root, 'bomberman/index.html'), 'utf8');
const spriteDir = path.join(root, 'bomberman/sprites');
const start = html.indexOf('Bomb Man sprite renderer');
const end = html.indexOf('function bombLoop(', start);
const renderer = html.slice(start, end);
const listOf = (name) => {
  const m = renderer.match(new RegExp(`const ${name}=\\[([^\\]]*)\\]`));
  assert.ok(m, `${name} list missing`);
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
};
const objOf = (name) => {
  const m = renderer.match(new RegExp(`const ${name}=\\{([^}]*)\\}`));
  assert.ok(m, `${name} map missing`);
  return Object.fromEntries([...m[1].matchAll(/(\w+):'([^']+)'/g)].map((x) => [x[1], x[2]]));
};
const sprites = listOf('ART_SPRITES');

function webpInfo(file) {
  const b = readFileSync(file);
  assert.equal(b.toString('ascii', 0, 4), 'RIFF', `${file} is not RIFF`);
  assert.equal(b.toString('ascii', 8, 12), 'WEBP', `${file} is not WebP`);
  const chunk = b.toString('ascii', 12, 16);
  let alpha = false;
  if (chunk === 'VP8X') alpha = (b[20] & 0x10) !== 0;
  else if (chunk === 'VP8L') alpha = ((b[24] >> 4) & 1) === 1;
  return { alpha, bytes: b.length };
}

test('renderer section exists and draws no placeholder geometry', () => {
  assert.ok(start > 0 && end > start, 'sprite renderer block not found');
  for (const banned of ['drawCube(', 'drawBillboard(', 'roundRect2(', 'fillStyle=colors[', 'map.crate', 'map.hard', 'map.floor', 'map.special', 'map.sky']) {
    assert.ok(!renderer.includes(banned), `placeholder drawing call still present: ${banned}`);
  }
  assert.ok(!/\p{Extended_Pictographic}/u.test(renderer), 'emoji used in the game renderer');
  // Only two text draws are allowed in the board renderer: the art-loading notice and the arena title bar.
  const texts = renderer.match(/fillText\(/g) || [];
  assert.equal(texts.length, 2, `unexpected text drawing in renderer (${texts.length})`);
});

test('every gameplay object type maps to a sprite', () => {
  const pickups = objOf('PICKUP_ART');
  const pool = html.match(/const powerPool=\[([^\]]*)\]/);
  assert.ok(pool, 'powerPool not found');
  for (const kind of [...pool[1].matchAll(/'(\w+)'/g)].map((x) => x[1])) {
    assert.ok(pickups[kind] && sprites.includes(pickups[kind]), `power-up "${kind}" has no sprite`);
  }
  const specials = objOf('SPECIAL_ART');
  for (const sp of ['ice', 'lava', 'water', 'conveyor', 'bush']) assert.ok(sprites.includes(specials[sp]), `special tile ${sp} has no texture`);
  for (const id of ['factory', 'temple', 'ice', 'lava']) {
    const block = renderer.match(new RegExp(`${id}:\\{([^}]*)\\}`));
    assert.ok(block, `MAP_ART.${id} missing`);
    for (const slot of ['floor', 'hard', 'hardSide', 'crate', 'crateSide', 'rim']) {
      const m = block[1].match(new RegExp(`${slot}:\\['([^']+)'`));
      assert.ok(m && sprites.includes(m[1]), `MAP_ART.${id}.${slot} must use a cut texture`);
    }
  }
  for (const skin of ['hero', 'p2', 'p3', 'p4']) for (const d of ['front', 'back', 'left', 'right']) assert.ok(sprites.includes(`${skin}_${d}`), `${skin}_${d} missing`);
  for (const n of ['bot_robot', 'bot_robot_blue', 'bomb', 'bomb_remote', 'fx_center', 'fx_segment', 'fx_end', 'fx_dust']) assert.ok(sprites.includes(n), `${n} missing`);
});

test('every referenced sprite file exists, is WebP, and gameplay sprites are transparent', () => {
  const referenced = new Set(sprites);
  for (const m of html.matchAll(/\/bomberman\/sprites\/([\w-]+)\.webp/g)) referenced.add(m[1]);
  for (const m of html.matchAll(/hudIco\('([\w-]+)'\)/g)) referenced.add(m[1]);
  for (const name of referenced) {
    const file = path.join(spriteDir, `${name}.webp`);
    assert.ok(existsSync(file), `missing sprite file ${name}.webp`);
    const info = webpInfo(file);
    const opaqueKind = /^(tex|bg|map)_/.test(name);
    if (!opaqueKind) assert.ok(info.alpha, `${name}.webp must have a transparent background`);
  }
});

test('Ice and Lava map cards no longer reuse the garden scene / raw sprite sheet', () => {
  for (const title of ['Ice Cavern Arena', 'Lava Forge Arena']) {
    const m = html.match(new RegExp(`title:'${title}', desc:'[^']*', img:'([^']{0,80})`));
    assert.ok(m && m[1].startsWith('/bomberman/sprites/map_'), `${title} thumbnail should use derived arena art`);
  }
});

test('sprite manifest is complete and the art budget stays small', () => {
  const manifest = JSON.parse(readFileSync(path.join(spriteDir, 'manifest.json'), 'utf8')).sprites;
  const files = readdirSync(spriteDir).filter((f) => f.endsWith('.webp'));
  const listed = new Set(Object.values(manifest).map((m) => m.file));
  for (const f of files) assert.ok(listed.has(f), `${f} not described in manifest.json`);
  for (const f of listed) assert.ok(files.includes(f), `manifest lists missing file ${f}`);
  const total = files.reduce((n, f) => n + statSync(path.join(spriteDir, f)).size, 0);
  assert.ok(total < 1.2 * 1024 * 1024, `sprite payload too large: ${(total / 1048576).toFixed(2)} MB`);
});
