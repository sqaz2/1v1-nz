const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const original=read('odyssey-tanks/original-source.html');
const script=[...original.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n');
const core=require('../odyssey-tanks/duel-core.js');
const config=vm.runInNewContext(script.slice(script.indexOf('const HULLS='),script.indexOf('const UPGRADES='))+';({hulls:HULLS,perks:PERKS})');
const loadout={hull:'destroyer',perks:['targeting','defense','mobility']};
const fresh=options=>core.create({...config,...options});

test('Odyssey original is exactly the evaluated pinned source template',()=>{
  const source=read('upstream/OdysseyTanks.tsx'), marker='const GAME_HTML = ';
  const expected=vm.runInNewContext(source.slice(source.indexOf(marker)+marker.length).trim().replace(/;$/,''));
  assert.equal(original,expected);
  assert.doesNotThrow(()=>new vm.Script(script));
  const page=read('odyssey-tanks/index.html');
  assert.ok(page.indexOf('/multiplayer/config.js')<page.indexOf('/multiplayer/client.js'));
  assert.match(page,/multiplayer\/client\.js/);assert.match(page,/duel-core\.js/);assert.match(page,/adapter\.js/);
});
test('Odyssey solo integration keeps scores on this device, without legacy API requests',()=>{
  const page=read('odyssey-tanks/original.html');
  assert.match(page,/solo-integration\.js/);assert.doesNotMatch(page,/loadLeaderboard\(\);\n\nfunction draw/);
  const integration=read('odyssey-tanks/solo-integration.js');
  assert.match(integration,/localStorage\.setItem/);assert.match(integration,/name\.textContent/);
  assert.doesNotMatch(integration,/fetch\(|XMLHttpRequest/);
});
test('Odyssey loadouts accept six original classes and reject invalid/duplicate perks',()=>{
  assert.equal(config.hulls.length,6);
  for(const hull of config.hulls)assert.ok(core.validLoadout({...loadout,hull:hull.id},config.hulls,config.perks));
  assert.equal(core.validLoadout({...loadout,hull:'fake'},config.hulls,config.perks),null);
  assert.equal(core.validLoadout({...loadout,perks:['defense','defense','targeting']},config.hulls,config.perks),null);
});
test('Odyssey input validation rejects movement/angle injection and expires held controls',()=>{
  assert.deepEqual(core.cleanInput({x:Infinity,y:20,angle:NaN,fire:1,ability:'yes'}),{x:0,y:1,angle:0,fire:false,ability:false});
  const sim=fresh();sim.start('a',5,[loadout,loadout],[]);sim.setInput(0,{x:1});
  for(let i=0;i<120;i++)sim.step();
  assert.ok(sim.world.tanks[0].x>1000);assert.ok(sim.world.tanks[0].x<1110);
  assert.ok(Math.abs(sim.world.tanks[0].vx)<.001);
});
test('Odyssey movement is world-space, not viewport-dependent; wall spawn exclusion',()=>{
  const a=fresh(),b=fresh();for(const sim of [a,b])sim.start('same',55,[loadout,loadout],[{x:990,y:1190,w:40,h:40,hp:100,maxHp:100}]);
  assert.equal(a.world.walls.length,0);
  for(let i=0;i<120;i++){a.setInput(0,{x:1,y:1});b.setInput(0,{x:1,y:1});a.step();b.step();}
  assert.deepEqual(a.snapshot(),b.snapshot());assert.ok(a.world.tanks[0].x<2400);
});
test('Odyssey damage, defense, invulnerability, and win are host-simulated',()=>{
  const sim=fresh();sim.start('a',4,[loadout,loadout],[]);
  const world=sim.world;world.tanks[1].hp=8;
  world.bullets.push({x:1391,y:1200,vx:9,vy:0,life:90,dmg:10,owner:0});sim.step();
  assert.equal(world.tanks[1].hp,0);assert.equal(world.tanks[0].damage,8);assert.equal(world.winner,0);assert.equal(world.phase,'finished');
  const tick=world.tick;sim.step();assert.equal(world.tick,tick);
});
test('Odyssey snapshots round-trip and rematch resets bullets, HP, inputs and seed',()=>{
  const host=fresh();host.start('one',1,[loadout,loadout],[]);host.setInput(0,{x:1});host.step();
  const guest=fresh();assert.equal(guest.restore(host.snapshot(),'one'),true);assert.deepEqual(guest.snapshot(),host.snapshot());
  assert.equal(guest.restore(host.snapshot(),'two'),false);
  const bad=host.snapshot();bad.tanks[0].x=Infinity;assert.equal(guest.restore(bad,'one'),false);
  host.world.tanks[0].hp=1;host.world.bullets.push({owner:0});host.start('two',2,[loadout,loadout],[]);
  assert.equal(host.world.tanks[0].hp,80);assert.equal(host.world.bullets.length,0);assert.equal(host.world.tick,0);assert.equal(host.world.seed,2);
});

function browser(){
  const nodes=new Map(),handlers={};let now=0,callbacks;
  const noop=()=>{};
  const context2d=new Proxy({createRadialGradient:()=>({addColorStop:noop}),createLinearGradient:()=>({addColorStop:noop}),measureText:()=>({width:50})},{get:(obj,key)=>key in obj?obj[key]:noop});
  function node(id=''){
    let ownId=id;const el={style:{},textContent:'',innerHTML:'',hidden:false,className:'',value:'',disabled:false,
      classList:{add:noop,remove:noop,toggle:noop},children:[],listeners:{},
      appendChild(child){this.children.push(child);},addEventListener(type,fn){this.listeners[type]=fn;},
      getContext:()=>context2d,getBoundingClientRect:()=>({left:0,top:0,width:400,height:800}),focus:noop,
      querySelector(){return node();},setAttribute:noop};
    Object.defineProperty(el,'id',{get:()=>ownId,set:value=>{ownId=value;nodes.set(value,el);}});
    Object.defineProperty(el,'parentElement',{get:()=>node()});Object.defineProperty(el,'previousElementSibling',{get:()=>node()});
    if(id)nodes.set(id,el);return el;
  }
  const get=id=>nodes.get(id)||node(id);
  const mp={slot:0,isHost:true,seed:123,connected:true,active:true,send:noop,publish:noop,finish:noop,setReady:noop,leave:noop};
  function Audio(){this.resume=noop;}
  const sandbox={console,Math,JSON,Date,Set,Map,Number,String,Array,Object,parseInt,parseFloat,
    document:{head:node(),body:node(),hidden:false,createElement:()=>node(),getElementById:get,querySelector:selector=>get(selector.slice(1)),addEventListener:noop},
    navigator:{maxTouchPoints:0},performance:{now:()=>now},innerWidth:400,innerHeight:800,devicePixelRatio:1,
    addEventListener:(type,fn)=>handlers[type]=fn,requestAnimationFrame:noop,setTimeout:noop,setInterval:noop,clearInterval:noop,
    AudioContext:Audio,XMLHttpRequest:function(){this.open=noop;this.send=noop;},
    StarMuffMultiplayer:{mount(options){callbacks=options;return mp;}}};
  sandbox.window=sandbox;const ctx=vm.createContext(sandbox);
  vm.runInContext(script,ctx);
  vm.runInContext(read('odyssey-tanks/duel-core.js'),ctx);
  vm.runInContext(read('odyssey-tanks/adapter.js'),ctx);
  return {ctx,mp,nodes,get callbacks(){return callbacks;},
    lock(hull='destroyer',perks=['targeting','defense','mobility']){vm.runInContext(`selHull=HULLS.find(h=>h.id===${JSON.stringify(hull)});selectedPerks=new Set(${JSON.stringify(perks)});document.getElementById('btn-start').onclick()`,ctx);},
    frame(ms=17){now+=ms;vm.runInContext('tick();draw()',ctx);},
    snapshot(){return JSON.parse(JSON.stringify(ctx.OdysseyOnline.snapshot));},
    run(code){return vm.runInContext(code,ctx);},
  };
}
function pair(hull='destroyer'){
  const host=browser(),guest=browser();host.lock(hull);guest.lock();
  guest.mp.slot=1;guest.mp.isHost=false;
  host.mp.publish=snapshot=>guest.callbacks.onSnapshot({snapshot,slot:0,matchId:snapshot.matchId});
  guest.mp.send=(type,data)=>host.callbacks.onEvent({type,data,slot:1,matchId:'match'});
  host.callbacks.onPresence({connected:true});guest.callbacks.onPresence({connected:true});
  host.callbacks.onStart({matchId:'match',slot:0,isHost:true,seed:123,resumed:false});
  guest.callbacks.onStart({matchId:'match',slot:1,isHost:false,seed:123,resumed:false});
  return {host,guest};
}
test('Odyssey original game + adapter boots two clients with original HUD and shared world',()=>{
  const {host,guest}=pair();assert.equal(host.callbacks.canReady(),true);
  assert.equal(host.snapshot().tanks.length,2);assert.deepEqual(host.snapshot(),guest.snapshot());
  guest.run('keys.d=true');for(let i=0;i<20;i++){guest.frame();host.frame();}
  assert.ok(host.snapshot().tanks[1].x>1400);
  host.callbacks.onPresence({connected:false});const frozen=host.snapshot().tick;
  for(let i=0;i<10;i++)host.frame();assert.equal(host.snapshot().tick,frozen);
  host.callbacks.onPresence({connected:true});host.frame();assert.ok(host.snapshot().tick>frozen);
});
test('Odyssey calls all six original abilities and preserves serialization',()=>{
  for(const hull of config.hulls){
    const {host}=pair(hull.id);host.run('useAbility()');for(let i=0;i<5;i++)host.frame();
    const state=host.snapshot(),tank=state.tanks[0];assert.equal(tank.energy,0,hull.id);
    const timers={destroyer:'furyT',dreadnought:'fortifyT',corvette:'overdriveT',wraith:'cloakT'};
    if(timers[hull.id])assert.ok(tank[timers[hull.id]]>0,hull.id);
    if(hull.id==='carrier')assert.equal(state.pickups.length,4);
    if(hull.id==='necromancer')assert.equal(tank.ghostTanks.length,3);
    const sim=fresh();assert.equal(sim.restore(state,'match'),true,hull.id);
  }
});
test('Odyssey stale match events cannot move tanks and solo APIs are not called in duel page',()=>{
  const {host}=pair();host.callbacks.onEvent({type:'input',slot:1,matchId:'OLD',data:{x:1,fire:true}});
  for(let i=0;i<10;i++)host.frame();assert.equal(host.snapshot().tanks[1].x,1400);
  assert.doesNotMatch(read('odyssey-tanks/index.html'),/loadLeaderboard\(\);\n\nfunction draw/);
});
test('Odyssey reconnect resumes the exact live host snapshot, then fresh rematch clears shots',()=>{
  const {host,guest}=pair();host.run('keys.d=true');for(let i=0;i<15;i++){host.frame();guest.frame();}
  const before=host.snapshot();host.mp.connected=false;guest.mp.connected=false;host.callbacks.onPresence({connected:false});guest.callbacks.onPresence({connected:false});
  host.callbacks.onStart({matchId:'match',slot:0,isHost:true,resumed:true,snapshot:before});
  guest.callbacks.onStart({matchId:'match',slot:1,isHost:false,resumed:true,snapshot:before});
  assert.deepEqual(host.snapshot(),before);assert.deepEqual(guest.snapshot(),before);
  host.frame();assert.deepEqual(host.snapshot(),before);
  host.mp.connected=true;guest.mp.connected=true;host.callbacks.onPresence({connected:true});guest.callbacks.onPresence({connected:true});
  guest.mp.send=(type,data)=>host.callbacks.onEvent({type,data,slot:1,matchId:'rematch'});
  host.callbacks.onStart({matchId:'rematch',slot:0,isHost:true,resumed:false});
  guest.callbacks.onStart({matchId:'rematch',slot:1,isHost:false,resumed:false});
  assert.equal(host.snapshot().matchId,'rematch');assert.equal(host.snapshot().tick,0);
  assert.equal(host.snapshot().tanks[0].x,1000);assert.equal(host.snapshot().bullets.length,0);
  assert.deepEqual(host.snapshot(),guest.snapshot());
});
