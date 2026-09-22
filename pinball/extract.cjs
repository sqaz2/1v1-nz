/* Reproducible port: evaluate ONLY the pinned upstream GAME_HTML template.
 * The original physics/rendering remain upstream code, not a new imitation. */
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'upstream/Pinball.tsx'), 'utf8');
const marker = 'const GAME_HTML = ';
const template = source.slice(source.indexOf(marker) + marker.length).trim().replace(/;$/, '');
if (!template.startsWith('`') || !template.endsWith('`')) throw Error('Pinned GAME_HTML template changed');
const original = vm.runInNewContext(template, Object.create(null), {timeout: 1000});
if (!original.startsWith('<!DOCTYPE html>') || !original.endsWith('</html>\n')) throw Error('Unexpected game document');
const replaceOnce = (text, from, to) => {
  if (text.split(from).length !== 2) throw Error('Upstream integration anchor changed: ' + from.slice(0, 90));
  return text.replace(from, to);
};
let port = original;
port = replaceOnce(port, '<script>', '<script src="./seed.js"></script>\n<script>');
// Original RAF physics ran faster on 120Hz devices. Duel adapter supplies a fixed
// simulation step, and separates rendering randomness from gameplay randomness.
port = replaceOnce(port,
  'function loop(){tick();updFlipBtns();updRestartBtn();draw();requestAnimationFrame(loop);}',
  'function loop(now){if(window.PinballClock){window.PinballClock.frame(now,()=>{tick();updFlipBtns();updRestartBtn();},draw);}else{tick();updFlipBtns();updRestartBtn();draw();}requestAnimationFrame(loop);}');
// Keep original local solo leaderboards. The StarMuff server leaderboard is not
// deployed on 1v1 and must not receive duel results or fail noisily with HTML.
port = replaceOnce(port, 'fetchServerScores();fetchDailyBest();fetchHallOfFirsts();',
  'serverScoresLoaded=true; // This port uses the local leaderboard, not StarMuff API writes.');
port = replaceOnce(port, "const SERVER_LB_URL = '/api/pinball/scores';", "const SERVER_LB_URL = null;");
port = replaceOnce(port, 'async function postServerScore(score){', 'async function postServerScore(score){return; // original local leaderboard remains\n');
port = replaceOnce(port, 'async function claimFirst(milestone,score){', 'async function claimFirst(milestone,score){return; // no unrelated StarMuff leaderboard mutation\n');
port = replaceOnce(port, 'const prob=genMathProblem();', 'const prob=window.PinballPendingMath||genMathProblem();window.PinballPendingMath=null;window.PinballActiveMath=prob;');
port = replaceOnce(port, 'mathTimeLeft=MATH_TIME;', 'mathTimeLeft=window.PinballMathTime||MATH_TIME;window.PinballMathTime=null;');
port = replaceOnce(port, '    mathTimeLeft-=100;', '    if(window.PinballClock?.paused)return;\n    mathTimeLeft-=100;');
port = replaceOnce(port, "window.addEventListener('message',e=>{\n  if(e.data?.type==='fruitFrenzyEnd'&&fruitFrenzy.active){", "function finishFruitFrenzy(){\n  if(fruitFrenzy.active){");
port = replaceOnce(port, "});\n\nfunction loop(now)", "}\nwindow.addEventListener('message',e=>{if(!window.PinballConfig.duel&&e.source===parent&&e.origin===location.origin&&e.data?.type==='fruitFrenzyEnd')finishFruitFrenzy();});\n\nfunction loop(now)");
// The adapter loads after original declarations, before its first animation frame.
port = replaceOnce(port, '</body>', '<script src="./engine-adapter.js"></script>\n</body>');
fs.writeFileSync(path.join(__dirname, 'game.html'), port);
fs.writeFileSync(path.join(__dirname, 'source-provenance.json'), JSON.stringify({
  source: 'sqaz2/StarMuff:client/src/pages/Pinball.tsx',
  blob: '4327231a041d6c8fee381c8726a8c711ef0cd503',
  sourceSha256: crypto.createHash('sha256').update(source).digest('hex'),
  templateSha256: crypto.createHash('sha256').update(original).digest('hex'),
  generatedBy: 'node pinball/extract.cjs',
  preserved: 'Original table, physics, artwork, flippers, math, music, multiball, progression, events and Easter eggs',
  integration: 'Seed, fixed-step timing, lifecycle/snapshot adapter; local-only solo leaderboard',
}, null, 2) + '\n');
// Asset manifest is generated once against an inspected live bundle. Rebuilding
// the game thereafter does not depend on the live site or change asset URLs.
if (process.argv[2]) {
  const bundle = fs.readFileSync(process.argv[2], 'utf8');
  const assets = [...new Set(bundle.match(/\/assets\/[^"`<>\n]+?\.mp3/g) || [])];
  const imports = [...source.matchAll(/import (\w+) from ['"]@assets\/(.+\.mp3)['"]/g)];
  const names = Object.fromEntries(imports.map(([, id, file]) => {
    const base = file.slice(0, -4);
    const found = assets.find(a => a.startsWith('/assets/' + base.replace(/&/g, '_') + '-'));
    if (!found) throw Error('Original audio not found: ' + file);
    return [id, 'https://starmuff.com' + found];
  }));
  const moodsText = source.slice(source.indexOf('const MOODS: Mood[] = ') + 22, source.indexOf('\nfunction shuffle'));
  const moods = vm.runInNewContext(moodsText.replace(/;\s*$/, ''), names, {timeout: 1000});
  fs.writeFileSync(path.join(__dirname, 'music.json'), JSON.stringify({moods, easterEggs: {
    acid: names.acidTripSong, headgroove: names.headGrooveSong, banana1: names.bananaSong1, banana2: names.bananaSong2,
  }, stableVideo: 'https://starmuff.com/horse-stable.mp4', source: 'Original StarMuff deployed music; no replacement soundtrack'}, null, 2) + '\n');
}
console.log('Extracted original StarMuff Pinball with minimal 1v1 hooks.');
