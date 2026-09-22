const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { transformSync } = require('esbuild');
const root = path.resolve(__dirname, '..');
const games = ['tetris', 'pinball', 'simon', 'skirmish', 'odyssey-tanks'];
const text = p => fs.readFileSync(path.join(root, p), 'utf8');
function gitHash(s) {
  const bytes = Buffer.from(s);
  return crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
}

test('canonical StarMuff source snapshots retain their pinned contents', () => {
  for (const [file, sha] of Object.entries({
    'CargoBayGame.tsx': 'c1e015e6ccab91aa2f04f50d2b9630ef013c8ed0',
    'SimonGame.tsx': '2b4a6a04994f87df7eb72aa8dab9874ceb623428',
    'Pinball.tsx': '4327231a041d6c8fee381c8726a8c711ef0cd503',
    'OdysseyTanks.tsx': '4b72c4bc1e85da1548f925728ebe279ca17e2b27',
  })) {
    const value = text(`upstream/${file}`);
    assert.ok([gitHash(value), gitHash(value.replace(/\n$/, ''))].includes(sha), `${file} changed beyond its import trailing newline`);
  }
});

test('every StarMuff game has its own linked route and multiplayer client', () => {
  const hub = text('index.html');
  for (const game of games) {
    const html = text(`${game}/index.html`);
    assert.ok(hub.includes(`href="/${game}/"`), `missing hub link: ${game}`);
    assert.match(html, /multiplayer\/client\.js/, `missing shared rooms: ${game}`);
    assert.ok(html.includes('<title>'), `missing title: ${game}`);
  }
});

test('restored-game inline scripts and referenced files are valid', () => {
  for (const game of games) {
    const dir = path.join(root, game);
    for (const file of fs.readdirSync(dir).filter(name => name.endsWith('.html'))) {
      const html = fs.readFileSync(path.join(dir, file), 'utf8');
      for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
        if (/application\/ld\+json/i.test(match[1]) || !match[2].trim()) continue;
        assert.doesNotThrow(() => transformSync(match[2], { loader: 'js' }), `${game}/${file} inline script`);
      }
      for (const match of html.matchAll(/\b(?:src|href)=["']([^"']+)["']/g)) {
        const ref = match[1].split(/[?#]/)[0];
        if (!ref || /^(?:https?:|data:|blob:|mailto:|javascript:)/.test(ref) || /\$\{|\{/.test(ref)) continue;
        const target = ref.startsWith('/') ? path.join(root, ref.slice(1)) : path.resolve(dir, ref);
        assert.ok(fs.existsSync(target), `${game}/${file}: missing ${ref}`);
      }
    }
  }
});

test('all five restored engines have specific regression suites', () => {
  const files = fs.readdirSync(__dirname);
  for (const prefix of ['tetris', 'pinball', 'simon', 'artillery', 'odyssey']) {
    assert.ok(files.some(file => file.startsWith(prefix) && /\.(?:cjs|mjs)$/.test(file)), `missing ${prefix} engine tests`);
  }
});
