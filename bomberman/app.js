(()=>{
'use strict';
const canvas=document.getElementById('game');
const ctx=canvas.getContext('2d');
const COLS=13,ROWS=11,TILE=48,W=COLS*TILE,H=ROWS*TILE;
canvas.width=W;canvas.height=H;
const modeButtons=[...document.querySelectorAll('.mode')];
const onlineWrap=document.getElementById('onlineWrap');
const singleControls=document.getElementById('singleControls');
const dualControls=document.getElementById('dualControls');
const p1ScoreEl=document.getElementById('p1Score');
const p2ScoreEl=document.getElementById('p2Score');
const p1NameEl=document.getElementById('p1Name');
const p2NameEl=document.getElementById('p2Name');
const roundText=document.getElementById('roundText');
const statusText=document.getElementById('statusText');
const overlay=document.getElementById('roundOverlay');
const resultEl=document.getElementById('roundResult');
const subEl=document.getElementById('roundSub');
const rematchBtn=document.getElementById('rematchBtn');

let mode='cpu',seed=(Date.now()>>>0),round=1,roundOver=false,matchOver=false,nextRoundAt=0;
let crates=new Set(),pickups=new Map(),bombs=[],flames=[],players=[];
let shake=0,lastFrame=performance.now(),lastCpu=0,lastPublish=0;
let mp=null,onlineActive=false,onlineConnected=false,onlinePaused=false,onlineSlot=0,onlineSeed=0;

const key=(x,y)=>x+','+y;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rngFrom=s=>{let a=s>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}};
const isWall=(x,y)=>x<0||y<0||x>=COLS||y>=ROWS||x===0||y===0||x===COLS-1||y===ROWS-1||(x%2===0&&y%2===0);
const safeSpawn=(x,y)=>{
  const zones=[[1,1],[COLS-2,ROWS-2]];
  return zones.some(([sx,sy])=>Math.abs(x-sx)+Math.abs(y-sy)<=2);
};
function makePlayers(keepScore=false){
  const old=players;
  players=[
    {x:1,y:1,alive:true,score:keepScore?(old[0]?.score||0):0,bombMax:1,bombs:0,range:2,speed:1,name:'P1'},
    {x:COLS-2,y:ROWS-2,alive:true,score:keepScore?(old[1]?.score||0):0,bombMax:1,bombs:0,range:2,speed:1,name:'P2'}
  ];
}
function buildBoard(s){
  const rand=rngFrom(s);
  crates=new Set();pickups=new Map();bombs=[];flames=[];
  for(let y=1;y<ROWS-1;y++)for(let x=1;x<COLS-1;x++){
    if(isWall(x,y)||safeSpawn(x,y))continue;
    if(rand()<.69)crates.add(key(x,y));
  }
}
function resetRound(s=seed+round,keepScore=true){
  buildBoard(s>>>0);makePlayers(keepScore);roundOver=false;nextRoundAt=0;overlay.hidden=true;
  roundText.textContent='ROUND '+round;statusText.textContent='Fight.';syncHud();
}
function resetMatch(s=(Date.now()>>>0)){
  seed=s>>>0;round=1;makePlayers(false);buildBoard(seed);roundOver=false;matchOver=false;overlay.hidden=true;
  rematchBtn.hidden=true;syncHud();roundText.textContent='ROUND 1';statusText.textContent='Fight.';
}
function syncHud(){
  p1ScoreEl.textContent=players[0]?.score||0;p2ScoreEl.textContent=players[1]?.score||0;
  if(mode==='cpu'){p1NameEl.textContent='YOU';p2NameEl.textContent='CPU'}
  else if(mode==='local'){p1NameEl.textContent='P1';p2NameEl.textContent='P2'}
  else {p1NameEl.textContent=onlineSlot===0?'YOU':'RIVAL';p2NameEl.textContent=onlineSlot===1?'YOU':'RIVAL'}
}
function bombAt(x,y){return bombs.find(b=>b.x===x&&b.y===y)}
function blocked(x,y){return isWall(x,y)||crates.has(key(x,y))||!!bombAt(x,y)}
function collect(p){
  const k=key(p.x,p.y),type=pickups.get(k);if(!type)return;
  pickups.delete(k);
  if(type==='flame')p.range=Math.min(6,p.range+1);
  if(type==='bomb')p.bombMax=Math.min(5,p.bombMax+1);
  if(type==='speed')p.speed=Math.min(3,p.speed+1);
}
function movePlayer(i,dx,dy){
  if(roundOver||matchOver||onlinePaused)return;
  const p=players[i];if(!p||!p.alive)return;
  for(let n=0;n<p.speed;n++){
    const nx=p.x+dx,ny=p.y+dy;if(blocked(nx,ny))break;p.x=nx;p.y=ny;collect(p);
  }
}
function placeBomb(i){
  if(roundOver||matchOver||onlinePaused)return;
  const p=players[i];if(!p||!p.alive||p.bombs>=p.bombMax||bombAt(p.x,p.y))return;
  bombs.push({x:p.x,y:p.y,owner:i,range:p.range,fuseAt:performance.now()+1750});
  p.bombs++;
}
function addFlame(x,y,until){flames.push({x,y,until})}
function maybeDrop(x,y){
  const r=Math.random();if(r<.13)pickups.set(key(x,y),'flame');else if(r<.22)pickups.set(key(x,y),'bomb');else if(r<.29)pickups.set(key(x,y),'speed');
}
function explode(b,now){
  const idx=bombs.indexOf(b);if(idx>=0)bombs.splice(idx,1);
  if(players[b.owner])players[b.owner].bombs=Math.max(0,players[b.owner].bombs-1);
  const until=now+430;addFlame(b.x,b.y,until);shake=7;
  const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
  for(const [dx,dy] of dirs){
    for(let n=1;n<=b.range;n++){
      const x=b.x+dx*n,y=b.y+dy*n;if(isWall(x,y))break;
      addFlame(x,y,until);
      const chained=bombAt(x,y);if(chained)chained.fuseAt=now;
      const k=key(x,y);if(crates.has(k)){crates.delete(k);maybeDrop(x,y);break}
    }
  }
}
function dangerAt(x,y,now=performance.now()){
  if(flames.some(f=>f.x===x&&f.y===y&&f.until>now))return true;
  for(const b of bombs){
    if(b.fuseAt-now>700)continue;
    if(b.x===x&&Math.abs(b.y-y)<=b.range)return true;
    if(b.y===y&&Math.abs(b.x-x)<=b.range)return true;
  }
  return false;
}
function checkKills(now){
  for(const p of players){
    if(p.alive&&flames.some(f=>f.x===p.x&&f.y===p.y&&f.until>now))p.alive=false;
  }
  if(!players[0].alive||!players[1].alive)endRound();
}
function endRound(){
  if(roundOver)return;roundOver=true;
  const a=players[0].alive,b=players[1].alive;
  let winner=-1;if(a&&!b)winner=0;else if(!a&&b)winner=1;
  if(winner>=0)players[winner].score++;
  syncHud();overlay.hidden=false;
  resultEl.textContent=winner<0?'DOUBLE KO':(winner===0?(mode==='cpu'?'YOU WIN':'PLAYER 1 WINS'):(mode==='cpu'?'CPU WINS':'PLAYER 2 WINS'));
  if(mode==='online')resultEl.textContent=winner<0?'DOUBLE KO':(winner===onlineSlot?'YOU WIN':'RIVAL WINS');
  const champ=winner>=0&&players[winner].score>=3;
  if(champ){
    matchOver=true;subEl.textContent='Match over · first to 3';rematchBtn.hidden=false;
    if(mode==='online'&&mp?.active&&mp.isHost)try{mp.finish({winner,reason:'first-to-3'})}catch{}
  }else{
    subEl.textContent='Next round…';nextRoundAt=performance.now()+1400;
  }
  publish(true);
}
function cpuStep(now){
  if(mode!=='cpu'||roundOver||matchOver||now-lastCpu<240)return;lastCpu=now;
  const me=players[1],foe=players[0];if(!me.alive)return;
  const choices=[[1,0],[-1,0],[0,1],[0,-1]].filter(([dx,dy])=>!blocked(me.x+dx,me.y+dy));
  const safe=choices.filter(([dx,dy])=>!dangerAt(me.x+dx,me.y+dy,now));
  if(dangerAt(me.x,me.y,now)&&safe.length){const d=safe[Math.floor(Math.random()*safe.length)];movePlayer(1,...d);return}
  const distance=Math.abs(me.x-foe.x)+Math.abs(me.y-foe.y);
  if(distance<=3&&me.bombs<me.bombMax&&Math.random()<.48){placeBomb(1);return}
  const pool=safe.length?safe:choices;if(!pool.length){if(me.bombs<me.bombMax)placeBomb(1);return}
  pool.sort((a,b)=>(Math.abs(me.x+a[0]-foe.x)+Math.abs(me.y+a[1]-foe.y))-(Math.abs(me.x+b[0]-foe.x)+Math.abs(me.y+b[1]-foe.y)));
  const d=Math.random()<.7?pool[0]:pool[Math.floor(Math.random()*pool.length)];movePlayer(1,...d);
  if(Math.random()<.18&&me.bombs<me.bombMax)placeBomb(1);
}
function update(now){
  flames=flames.filter(f=>f.until>now);
  const due=bombs.filter(b=>b.fuseAt<=now);due.forEach(b=>explode(b,now));
  checkKills(now);cpuStep(now);
  if(roundOver&&!matchOver&&nextRoundAt&&now>=nextRoundAt){round++;resetRound((seed+round*7919)>>>0,true)}
}
function tileRect(x,y,pad=0){return[x*TILE+pad,y*TILE+pad,TILE-pad*2,TILE-pad*2]}
function roundRect(x,y,w,h,r,fill){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill()}
function draw(){
  ctx.save();
  if(shake){ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);shake*=.86;if(shake<.3)shake=0}
  ctx.fillStyle='#0a1d35';ctx.fillRect(0,0,W,H);
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
    const [px,py,w,h]=tileRect(x,y,2);
    if(isWall(x,y)){roundRect(px,py,w,h,8,'#315170');ctx.fillStyle='#45698d';ctx.fillRect(px+5,py+5,w-10,5)}
    else {ctx.fillStyle=(x+y)%2?'#102b46':'#0e2741';ctx.fillRect(x*TILE,y*TILE,TILE,TILE)}
  }
  for(const k of crates){const[x,y]=k.split(',').map(Number);const[px,py,w,h]=tileRect(x,y,5);roundRect(px,py,w,h,7,'#8a542c');ctx.strokeStyle='#d19654';ctx.lineWidth=2;ctx.strokeRect(px+5,py+5,w-10,h-10)}
  for(const [k,t] of pickups){const[x,y]=k.split(',').map(Number);ctx.font='24px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(t==='flame'?'🔥':t==='bomb'?'💣':'⚡',x*TILE+TILE/2,y*TILE+TILE/2)}
  for(const f of flames){const cx=f.x*TILE+TILE/2,cy=f.y*TILE+TILE/2;const g=ctx.createRadialGradient(cx,cy,3,cx,cy,25);g.addColorStop(0,'#fff6a5');g.addColorStop(.35,'#ffb21e');g.addColorStop(1,'#ff3b2400');ctx.fillStyle=g;ctx.fillRect(f.x*TILE,f.y*TILE,TILE,TILE)}
  for(const b of bombs){const cx=b.x*TILE+TILE/2,cy=b.y*TILE+TILE/2;ctx.beginPath();ctx.arc(cx,cy,15,0,Math.PI*2);ctx.fillStyle='#090b10';ctx.fill();ctx.beginPath();ctx.arc(cx+7,cy-11,5,0,Math.PI*2);ctx.fillStyle='#ffb42e';ctx.fill()}
  players.forEach((p,i)=>{if(!p.alive)return;const cx=p.x*TILE+24,cy=p.y*TILE+24;ctx.beginPath();ctx.arc(cx,cy,16,0,Math.PI*2);ctx.fillStyle=i===0?'#48bdff':'#ff6262';ctx.fill();ctx.lineWidth=4;ctx.strokeStyle='#eaf5ff';ctx.stroke();ctx.fillStyle='#06101d';ctx.font='900 14px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(i+1),cx,cy+1)});
  ctx.restore();
}
function serialize(now=performance.now()){
  return {seed,round,roundOver,matchOver,nextRoundIn:nextRoundAt?Math.max(0,nextRoundAt-now):0,crates:[...crates],pickups:[...pickups],players:players.map(p=>({...p})),bombs:bombs.map(b=>({...b,fuseIn:Math.max(0,b.fuseAt-now),fuseAt:undefined})),flames:flames.map(f=>({...f,life:Math.max(0,f.until-now),until:undefined}))};
}
function restore(s){
  if(!s)return;const now=performance.now();seed=s.seed>>>0;round=s.round;roundOver=!!s.roundOver;matchOver=!!s.matchOver;nextRoundAt=s.nextRoundIn?now+s.nextRoundIn:0;
  crates=new Set(s.crates||[]);pickups=new Map(s.pickups||[]);players=(s.players||[]).map(p=>({...p}));
  bombs=(s.bombs||[]).map(b=>({...b,fuseAt:now+(b.fuseIn||0)}));flames=(s.flames||[]).map(f=>({...f,until:now+(f.life||0)}));syncHud();roundText.textContent='ROUND '+round;
}
function publish(force=false){
  if(mode!=='online'||!mp?.active||!mp.isHost)return;const now=performance.now();if(!force&&now-lastPublish<100)return;lastPublish=now;try{mp.publish(serialize(now))}catch{}
}
function tick(now){
  const dt=now-lastFrame;lastFrame=now;
  if(mode!=='online'||!onlineActive||mp?.isHost){if(!onlinePaused)update(now);publish()}
  draw();requestAnimationFrame(tick);
}
function directAction(i,action){
  if(action==='bomb')placeBomb(i);else {const d={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[action];if(d)movePlayer(i,d[0],d[1])}
}
function act(playerRef,action){
  let i=playerRef==='local'?(mode==='online'?onlineSlot:0):Number(playerRef);
  if(mode==='cpu'&&i!==0)return;
  if(mode==='online'){
    if(!mp?.active||!onlineConnected)return;
    if(mp.isHost){if(i===0)directAction(0,action)}
    else {try{mp.send('action',{action})}catch{}}
    return;
  }
  directAction(i,action);
}
function setMode(next){
  mode=next;modeButtons.forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));
  onlineWrap.hidden=mode!=='online';dualControls.hidden=mode!=='local';singleControls.hidden=mode==='local';
  onlineActive=false;onlinePaused=false;onlineSlot=0;resetMatch();
  syncHud();
}
modeButtons.forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));
const held=new Map();
document.querySelectorAll('[data-action]').forEach(btn=>{
  const start=e=>{e.preventDefault();const p=btn.dataset.player,a=btn.dataset.action;act(p,a);if(a!=='bomb'){clearInterval(held.get(btn));held.set(btn,setInterval(()=>act(p,a),135))}};
  const stop=()=>{clearInterval(held.get(btn));held.delete(btn)};
  btn.addEventListener('pointerdown',start);btn.addEventListener('pointerup',stop);btn.addEventListener('pointercancel',stop);btn.addEventListener('pointerleave',stop);
});
addEventListener('keydown',e=>{
  if(e.repeat)return;
  const k=e.key.toLowerCase();
  if(mode==='local'){
    if(k==='w')act('0','up');if(k==='s')act('0','down');if(k==='a')act('0','left');if(k==='d')act('0','right');if(k===' ')act('0','bomb');
    if(e.key==='ArrowUp')act('1','up');if(e.key==='ArrowDown')act('1','down');if(e.key==='ArrowLeft')act('1','left');if(e.key==='ArrowRight')act('1','right');if(e.key==='Enter')act('1','bomb');
  }else{
    if(k==='w'||e.key==='ArrowUp')act('local','up');if(k==='s'||e.key==='ArrowDown')act('local','down');if(k==='a'||e.key==='ArrowLeft')act('local','left');if(k==='d'||e.key==='ArrowRight')act('local','right');if(k===' '||e.key==='Enter')act('local','bomb');
  }
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();
},{passive:false});
rematchBtn.addEventListener('click',()=>{if(mode==='online'&&mp?.active){mp.setReady(true);return}resetMatch()});

function mountOnline(){
  if(!window.StarMuffMultiplayer)return;
  mp=window.StarMuffMultiplayer.mount({
    game:'bomberman',container:'#onlineRoom',
    onStart({seed:s,slot,resumed,snapshot}){mode='online';onlineActive=true;onlinePaused=false;onlineSlot=slot??0;onlineSeed=s>>>0;if(resumed&&snapshot)restore(snapshot);else resetMatch(onlineSeed);syncHud();statusText.textContent='Online match';},
    onEvent({type,data,slot}){if(type!=='action'||!mp?.isHost||slot===0)return;const a=data?.action;if(['up','down','left','right','bomb'].includes(a))directAction(1,a)},
    onSnapshot({snapshot}){if(!mp?.isHost)restore(snapshot)},
    onPresence({connected}){onlineConnected=!!connected;onlinePaused=onlineActive&&!connected;statusText.textContent=connected?'Opponent connected':'Waiting for opponent…';},
    onFinish({result}){if(result&&Number.isInteger(result.winner)){matchOver=true;overlay.hidden=false;resultEl.textContent=result.winner===onlineSlot?'YOU WIN':'RIVAL WINS';subEl.textContent='Match over';rematchBtn.hidden=false}},
    onLeave(){onlineActive=false;onlineConnected=false;onlinePaused=false;statusText.textContent='Room closed';},
    onUnavailable({message}){statusText.textContent='Online unavailable';console.warn(message)}
  });
}
mountOnline();resetMatch();requestAnimationFrame(tick);
})();