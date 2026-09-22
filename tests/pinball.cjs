const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const D = require('../pinball/duel.js');
const {rng} = require('../pinball/seed.js');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const message = (id, score, seq, status = 'playing', lives = 3) => ({matchId:id, score, seq, status, lives, ticks:seq * 60});

function engine({saved = new Map(), run = 'test-run', seed = 'same-seed', slot = 0} = {}) {
  const elements = new Map(), sent = [], events = {}, intervals = [];
  const noop = () => {};
  const ctx = new Proxy({}, {get(_, name) {
    if (name === 'measureText') return text => ({width:String(text).length * 10});
    if (/^create.*Gradient$/.test(name)) return () => ({addColorStop:noop});
    return noop;
  }, set: () => true});
  function element(id) {
    if (!elements.has(id)) elements.set(id, {id, style:{}, classList:{add:noop,remove:noop,toggle:noop},
      textContent:'',innerHTML:'',value:'',offsetHeight:id==='hud'?42:18,
      addEventListener:noop,removeEventListener:noop,appendChild:noop,focus:noop,setAttribute:noop,
      querySelector:()=>null,querySelectorAll:()=>[],getBoundingClientRect:()=>({left:0,top:0,width:390,height:700}),getContext:()=>ctx});
    return elements.get(id);
  }
  const context = vm.createContext({
    console,URLSearchParams,performance:{now:()=>0},
    location:{origin:'https://test.example',search:`?duel=1&run=${run}&seed=${seed}&slot=${slot}`},
    parent:{postMessage:value=>sent.push(value)},
    navigator:{vibrate:noop},innerWidth:390,innerHeight:700,
    localStorage:{getItem:()=>null,setItem:noop},
    sessionStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)},
    setTimeout:noop,clearTimeout:noop,setInterval:fn=>{intervals.push(fn);return intervals.length;},clearInterval:noop,
    requestAnimationFrame:noop,
    document:{getElementById:element,createElement:element,querySelector:()=>null,querySelectorAll:()=>[],
      addEventListener:(name, fn)=>{(events['document:'+name] ||= []).push(fn);},removeEventListener:noop},
    addEventListener:(name,fn)=>{(events[name] ||= []).push(fn);},
    fetch:()=>Promise.reject(Error('Unexpected network access in extracted engine')),
  });
  context.window = context;
  vm.runInContext(read('pinball/seed.js'), context);
  for (const match of read('pinball/game.html').matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) if (match[1].trim()) vm.runInContext(match[1], context);
  vm.runInContext(read('pinball/engine-adapter.js'), context);
  return {context,sent,saved,events,intervals,eval:code=>vm.runInContext(code,context),
    control(data, source=context.parent, origin='https://test.example') {for(const fn of events.message || []) fn({source,origin,data:{channel:'starmuff-pinball-control',runId:run,...data}});}};
}

test('Pinball extracted source is pinned and the complete original physics/table are retained', () => {
  const provenance = JSON.parse(read('pinball/source-provenance.json'));
  assert.equal(provenance.blob, '4327231a041d6c8fee381c8726a8c711ef0cd503');
  assert.equal(crypto.createHash('sha256').update(read('upstream/Pinball.tsx')).digest('hex'), provenance.sourceSha256);
  const html = read('pinball/game.html');
  const source = read('upstream/Pinball.tsx');
  const template = source.slice(source.indexOf('const GAME_HTML = ') + 18).trim().replace(/;$/, '');
  const original = vm.runInNewContext(template);
  assert.equal(crypto.createHash('sha256').update(original).digest('hex'), provenance.templateSha256);
  // Byte-for-byte function parity, not an approximation based on file size.
  for (const name of ['flipperCollide', 'wallBounce', 'mkState', 'tick', 'draw', 'drawArtLayer', 'drain', 'launch', 'startGame', 'startTally']) {
    const expression = new RegExp('^function ' + name + '\\([^]*?^}', 'm');
    assert.ok(original.match(expression), 'missing original ' + name);
    assert.equal(html.match(expression)?.[0], original.match(expression)[0], name + ' must remain original code');
  }
  for (const feature of ['SPIN_FRICTION', 'function mkState', 'function drawCatAstronaut', 'function drawUFO', 'function drawRocket', 'function showMathChallenge', 'function startTally', 'function tickLamboRescue', 'function mkHorseBumpers', 'function mkFruitField', 'MUFF']) assert.ok(html.includes(feature), feature);
});

test('Pinball original music moods, songs and video are all present', () => {
  const music = JSON.parse(read('pinball/music.json'));
  assert.deepEqual(music.moods.map(m=>m.id), ['chill','explore','hype','lounge','bass']);
  assert.equal(music.moods.flatMap(m=>m.tracks).length, 36);
  assert.equal(Object.keys(music.easterEggs).length, 4);
  for (const url of [...music.moods.flatMap(m=>m.tracks.map(t=>t.path)), ...Object.values(music.easterEggs)]) assert.match(url,/^https:\/\/starmuff\.com\/assets\/.+\.mp3$/);
  assert.equal(music.stableVideo,'https://starmuff.com/horse-stable.mp4');
});

test('Pinball duel settles once, rejects stale rounds, backwards scores and synthetic early finishes', () => {
  const match = D.createMatch('one','seed');
  assert.equal(D.update(match,0,message('one',500,1)),true);
  assert.equal(D.update(match,0,message('old',600,2)),false);
  assert.equal(D.update(match,0,message('one',400,2)),false);
  assert.equal(D.update(match,0,message('one',600,2,'done',3)),false);
  assert.equal(D.update(match,0,message('one',1200,2,'done',0)),true);
  assert.equal(match.result,null);
  assert.equal(D.update(match,0,message('one',9999,3,'done',0)),false);
  assert.equal(D.update(match,1,message('one',1400,2,'done',0)),true);
  assert.deepEqual(match.result,{winner:1,scores:[1200,1400],draw:false});
  assert.equal(D.update(match,1,message('one',9000,3,'done',0)),false);
  const rematch=D.createMatch('two','new-seed');
  assert.equal(D.update(rematch,0,message('one',1400,4,'done',0)),false);
  assert.equal(rematch.players[0].score,0);
});

test('Pinball forfeits are terminal and ties are explicit', () => {
  const match=D.createMatch('forfeit','seed');
  assert.equal(D.update(match,0,message('forfeit',100,1,'forfeit')),true);
  assert.equal(D.update(match,0,message('forfeit',900,2,'done',0)),false);
  D.update(match,1,message('forfeit',0,1,'done',0));
  assert.equal(match.result.winner,1);
  const tie=D.createMatch('tie','seed');
  D.update(tie,0,message('tie',100,1,'done',0));D.update(tie,1,message('tie',100,1,'done',0));
  assert.equal(tie.result.draw,true);
});

test('Pinball same-seed generator restores its exact next value', () => {
  const a=rng('seed'),b=rng('seed');
  for(let i=0;i<100;i++) assert.equal(a(),b());
  const state=a.getState(),next=a();a.setState(state);assert.equal(a(),next);
  assert.notEqual(rng('seed')(),rng('other')());
});

test('Pinball fixed-step clock gives equal ticks at 60Hz and 120Hz and rendering does not consume game RNG', () => {
  function run(hz) {
    const context=vm.createContext({URLSearchParams,location:{search:'?duel=1&seed=fair'},performance:{now:()=>0}});
    context.window=context;
    vm.runInContext(read('pinball/seed.js'),context);
    return vm.runInContext(`let ticks=0;PinballClock.frame(0,()=>ticks++,()=>Math.random());for(let i=1;i<=${hz};i++)PinballClock.frame(i*1000/${hz},()=>ticks++,()=>{for(let j=0;j<20;j++)Math.random();});({ticks,state:PinballClock.rng.getState()})`,context);
  }
  const a=run(60),b=run(120);
  assert.equal(a.ticks,b.ticks);assert.ok(a.ticks>=59&&a.ticks<=60);assert.equal(a.state,b.state);
});

test('Pinball original engine loads, launches, scores and preserves original multiball/table structures', () => {
  const e=engine();
  assert.equal(e.eval('S.phase'),'ready');
  assert.equal(e.eval('S.lives'),3);
  assert.ok(e.eval('S.bumpers.length')>0);
  assert.equal(e.eval('PREFS.speed'),1);
  e.eval('S.plunger=1;launch();for(let i=0;i<500;i++)tick();');
  assert.ok(e.eval('S.t')>=500);
  assert.ok(e.eval('S.score')>=0);
  assert.equal(e.eval('getCareerBest()'),0);
});

test('Pinball engine snapshot preserves score, physics, RNG and resets controls after reload', () => {
  const e=engine();
  e.eval('S.score=2345;S.ball.x=123;keys.L=true;lamboCharges=2;focusMode.active=true;focusMode.ticks=200;');
  e.control({type:'pause',paused:true});
  const next=e.eval('Math.random()');
  const restored=engine({saved:e.saved});
  assert.equal(restored.eval('S.score'),2345);
  assert.equal(restored.eval('S.ball.x'),123);
  assert.equal(restored.eval('lamboCharges'),2);
  assert.equal(restored.eval('focusMode.ticks'),200);
  assert.equal(restored.eval('keys.L'),false);
  assert.equal(restored.eval('Math.random()'),next);
  const fresh=engine({saved:e.saved,run:'rematch'});
  assert.equal(fresh.eval('S.score'),0);assert.equal(fresh.eval('lamboCharges'),0);assert.equal(fresh.eval('S.lives'),3);
});

test('Pinball engine rejects stale control origins and preserves forfeit status across reload', () => {
  const e=engine();
  e.control({type:'forfeit'},{},'https://attacker.example');
  assert.equal(e.sent.filter(m=>m.progress?.status==='forfeit').length,0);
  e.control({type:'pause',paused:true});assert.equal(e.eval('PinballClock.paused'),true);
  e.control({type:'pause',paused:false});assert.equal(e.eval('PinballClock.paused'),false);
  e.control({type:'forfeit'});e.control({type:'forfeit'});
  assert.equal(e.sent.filter(m=>m.progress?.status==='forfeit').length,1);
  const restored=engine({saved:e.saved});
  assert.equal(restored.sent.find(m=>m.type==='progress').progress.status,'forfeit');
  assert.equal(restored.eval('PinballClock.paused'),true);
});

test('Pinball three actual original drains settle through the original final tally once', () => {
  const e=engine();
  for(let i=0;i<3;i++) {
    e.eval('S.ballSave.active=false;S.phase="play";drain();for(let i=0;i<200;i++)tickTally();');
    assert.equal(e.eval('S.lives'),2-i);
    assert.equal(e.eval('tallyState.done'),true);
    for(const fn of e.events['document:keydown'] || []) fn({key:' ',preventDefault(){}});
  }
  const final=e.sent.filter(m=>m.progress?.status==='done');
  assert.equal(final.length,1);assert.equal(final[0].progress.lives,0);
  assert.equal(e.eval('PinballClock.paused'),true);
  e.eval('showNameEntry();restart();');
  assert.equal(e.sent.filter(m=>m.progress?.status==='done').length,1);
  assert.equal(e.eval('S.lives'),0);
});

test('Pinball math challenge restores its exact question and remaining timer', () => {
  const e=engine();
  e.eval('showMathChallenge();mathTimeLeft=3200;');
  const question=e.eval('window.PinballActiveMath.text');
  e.control({type:'pause',paused:true});
  const restored=engine({saved:e.saved});
  assert.equal(restored.eval('mathActive'),true);
  assert.equal(restored.eval('mathTimeLeft'),3200);
  assert.equal(restored.eval('window.PinballActiveMath.text'),question);
});

test('Pinball duel fruit scoring expires on simulation time, not soundtrack playback', () => {
  const e=engine();
  e.eval('fruitFrenzy.active=true;fruitFrenzy.collected=2;fruitFrenzy.total=60;fruitFrenzy.duelTicks=3599;tick();');
  assert.equal(e.eval('fruitFrenzy.active'),false);
  assert.equal(e.eval('S.score'),3000);
});

test('Pinball shell ignores previous iframe messages and checks the current match epoch', () => {
  const shell=read('pinball/shell.js');
  assert.match(shell,/e\.source !== frame\.contentWindow \|\| e\.origin !== location\.origin/);
  assert.match(shell,/data\.runId === match\?\.id/);
  assert.match(shell,/event\.matchId !== match\?\.id/);
});
