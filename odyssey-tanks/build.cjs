'use strict';
// Extract the original JS template, including its JS escapes. Never regex-unescape it.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const source = fs.readFileSync(path.join(__dirname, '../upstream/OdysseyTanks.tsx'), 'utf8');
// The import added one terminal blank line; normalize that only for blob proof.
const canonical = source.trimEnd() + '\n';
const blob = crypto.createHash('sha1').update(`blob ${Buffer.byteLength(canonical)}\0`).update(canonical).digest('hex');
if(blob !== '4b72c4bc1e85da1548f925728ebe279ca17e2b27') throw new Error('Odyssey source changed: re-audit provenance before rebuilding');
const marker = 'const GAME_HTML = ';
const literal = source.slice(source.indexOf(marker) + marker.length).trim().replace(/;$/, '');
if (!literal.startsWith('`<!DOCTYPE html>') || !literal.endsWith('`') || literal.includes('${')) throw new Error('Unexpected upstream template format');
const original = vm.runInNewContext(literal, Object.create(null), {timeout: 1000});
fs.writeFileSync(path.join(__dirname, 'original-source.html'), original);
// Keep an immutable exact extraction. Served solo only replaces the API boundary:
// the old StarMuff leaderboard endpoint does not exist on the 1v1 host.
const solo=original.replace('loadLeaderboard();\n\nfunction draw()', '/* Local leaderboard initialized by solo-integration.js. */\n\nfunction draw()')
  .replace('</body>', '<script src="./solo-integration.js"></script>\n</body>');
fs.writeFileSync(path.join(__dirname, 'original.html'), solo);
// The duel page adds an adapter to the same original game; it is not a redraw.
const scripts = '<script src="/multiplayer/config.js"></script>\n<script src="/multiplayer/client.js"></script>\n<script src="./duel-core.js"></script>\n<script src="./adapter.js"></script>\n';
const duel = original.replace('<title>Odyssey Tanks</title>', '<title>Odyssey Tanks 1v1 · StarMuff</title>')
  .replace('loadLeaderboard();\n\nfunction draw()', '/* Solo leaderboard belongs to the original game. */\n\nfunction draw()')
  .replace('</body>', scripts + '</body>');
fs.writeFileSync(path.join(__dirname, 'index.html'), duel);
console.log('Odyssey Tanks: exact source, local-score solo, and adapter-backed duel generated.');
