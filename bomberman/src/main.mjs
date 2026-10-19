import * as THREE from 'three';

const COLS=13, ROWS=11;
const mount=document.getElementById('game3d');
const overlay=document.getElementById('roundOverlay');
const resultEl=document.getElementById('roundResult');
const subEl=document.getElementById('roundSub');
const rematchBtn=document.getElementById('rematchBtn');
const p1ScoreEl=document.getElementById('p1Score');
const p2ScoreEl=document.getElementById('p2Score');
const p1NameEl=document.getElementById('p1Name');
const p2NameEl=document.getElementById('p2Name');
const roundText=document.getElementById('roundText');
const statusText=document.getElementById('statusText');
const onlineWrap=document.getElementById('onlineWrap');
const singleControls=document.getElementById('singleControls');
const dualControls=document.getElementById('dualControls');
const specialBtn=document.getElementById('specialBtn');
const modeButtons=[...document.querySelectorAll('.mode')];

let mode='cpu', seed=(Date.now()>>>0), round=1, roundOver=false, matchOver=false, nextRoundAt=0;
let crates=new Set(), pickups=new Map(), bombs=[], flames=[], players=[];
let nextBombId=1, shake=0, lastCpu=0, lastPublish=0;
let mp=null, liveStarting=false, onlineHuman=false, onlineSlot=0, onlineActive=false;

const key=(x,y)=>x+','+y;
const inBounds=(x,y)=>x>=0&&y>=0&&x<COLS&&y<ROWS;
const isWall=(x,y)=>!inBounds(x,y)||x===0||y===0||x===COLS-1||y===ROWS-1||(x%2===0&&y%2===0);
const rngFrom=s=>{let a=s>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}};
const safeSpawn=(x,y)=>[[1,1],[COLS-2,ROWS-2]].some(([sx,sy])=>Math.abs(x-sx)+Math.abs(y-sy)<=2);
const bombAt=(x,y)=>bombs.find(b=>b.x===x&&b.y===y);
const openForBomb=(x,y)=>inBounds(x,y)&&!isWall(x,y)&&!crates.has(key(x,y))&&!bombAt(x,y);
const blocked=(x,y)=>isWall(x,y)||crates.has(key(x,y))||!!bombAt(x,y);

function makePlayers(keepScore=false){
  const old=players;
  players=[
    {x:1,y:1,vx:1,vy:1,alive:true,score:keepScore?(old[0]?.score||0):0,bombMax:1,bombs:0,range:2,speed:1,kick:false,punch:false,line:false,face:[1,0]},
    {x:COLS-2,y:ROWS-2,vx:COLS-2,vy:ROWS-2,alive:true,score:keepScore?(old[1]?.score||0):0,bombMax:1,bombs:0,range:2,speed:1,kick:false,punch:false,line:false,face:[-1,0]}
  ];
}
function buildBoard(s){
  const rand=rngFrom(s);
  crates=new Set();pickups=new Map();bombs=[];flames=[];nextBombId=1;
  for(let y=1;y<ROWS-1;y++)for(let x=1;x<COLS-1;x++){
    if(isWall(x,y)||safeSpawn(x,y))continue;
    if(rand()<.68)crates.add(key(x,y));
  }
}
function resetRound(s=(seed+round*7919)>>>0,keepScore=true){
  buildBoard(s);makePlayers(keepScore);roundOver=false;nextRoundAt=0;overlay.hidden=true;
  roundText.textContent='ROUND '+round;statusText.textContent=mode==='live'?(onlineHuman?'LIVE · HUMAN RIVAL':'LIVE · CPU HOLDING P2'):'Fight.';
  syncHud();refreshSpecial();
}
function resetMatch(s=(Date.now()>>>0)){
  seed=s>>>0;round=1;makePlayers(false);buildBoard(seed);roundOver=false;matchOver=false;overlay.hidden=true;rematchBtn.hidden=true;
  roundText.textContent='ROUND 1';syncHud();refreshSpecial();
}
function syncHud(){
  p1ScoreEl.textContent=players[0]?.score||0;p2ScoreEl.textContent=players[1]?.score||0;
  if(mode==='cpu'){p1NameEl.textContent='YOU';p2NameEl.textContent='CPU'}
  else if(mode==='local'){p1NameEl.textContent='P1';p2NameEl.textContent='P2'}
  else {p1NameEl.textContent=onlineSlot===0?'YOU':'HOST';p2NameEl.textContent=onlineSlot===1?'YOU':onlineHuman?'RIVAL':'CPU'}
}
function collect(p){
  const k=key(p.x,p.y),type=pickups.get(k);if(!type)return;
  pickups.delete(k);
  if(type==='flame')p.range=Math.min(7,p.range+1);
  else if(type==='bomb')p.bombMax=Math.min(7,p.bombMax+1);
  else if(type==='speed')p.speed=Math.min(3,p.speed+1);
  else if(type==='kick')p.kick=true;
  else if(type==='punch')p.punch=true;
  else if(type==='line')p.line=true;
  refreshSpecial();
}
function kickBomb(b,dx,dy,now=performance.now()){
  const nx=b.x+dx,ny=b.y+dy;if(!openForBomb(nx,ny))return false;
  b.x=nx;b.y=ny;b.move={dx,dy,nextAt:now+85};shake=Math.max(shake,1.4);return true;
}
function movePlayer(i,dx,dy){
  if(roundOver||matchOver)return;
  const p=players[i];if(!p?.alive)return;p.face=[dx,dy];
  for(let n=0;n<p.speed;n++){
    const nx=p.x+dx,ny=p.y+dy;
    const b=bombAt(nx,ny);
    if(b&&p.kick){
      if(!kickBomb(b,dx,dy))break;
      p.x=nx;p.y=ny;collect(p);continue;
    }
    if(blocked(nx,ny))break;
    p.x=nx;p.y=ny;collect(p);
  }
}
function addBomb(i,x,y){
  const p=players[i];if(!p||p.bombs>=p.bombMax||bombAt(x,y)||crates.has(key(x,y))||isWall(x,y))return false;
  bombs.push({id:nextBombId++,x,y,owner:i,range:p.range,fuseAt:performance.now()+1900,move:null,airUntil:0});
  p.bombs++;return true;
}
function placeBomb(i){
  if(roundOver||matchOver)return;
  const p=players[i];if(!p?.alive)return;
  addBomb(i,p.x,p.y);
  if(p.line){
    const [dx,dy]=p.face;
    for(let n=1;n<=6&&p.bombs<p.bombMax;n++){
      const x=p.x+dx*n,y=p.y+dy*n;
      if(isWall(x,y)||crates.has(key(x,y)))break;
      if(!bombAt(x,y))addBomb(i,x,y);
    }
  }
}
function punchBomb(i){
  const p=players[i];if(!p?.alive||!p.punch)return;
  const [dx,dy]=p.face,b=bombAt(p.x+dx,p.y+dy);if(!b)return;
  let landing=null;
  for(let n=4;n>=2;n--){
    const x=p.x+dx*n,y=p.y+dy*n;
    if(openForBomb(x,y)){landing={x,y};break}
  }
  if(!landing)return;
  b.x=landing.x;b.y=landing.y;b.move=null;b.airUntil=performance.now()+420;shake=Math.max(shake,2.2);
}
function advanceMovingBombs(now){
  for(const b of bombs){
    if(!b.move||now<b.move.nextAt)continue;
    const nx=b.x+b.move.dx,ny=b.y+b.move.dy;
    if(!openForBomb(nx,ny)){b.move=null;continue}
    b.x=nx;b.y=ny;b.move.nextAt=now+85;
  }
}
function maybeDrop(x,y){
  const r=Math.random();
  const type=r<.11?'flame':r<.19?'bomb':r<.25?'speed':r<.30?'kick':r<.34?'punch':r<.38?'line':null;
  if(type)pickups.set(key(x,y),type);
}
function addFlame(x,y,until){flames.push({x,y,until})}
function explode(b,now){
  const idx=bombs.indexOf(b);if(idx>=0)bombs.splice(idx,1);
  if(players[b.owner])players[b.owner].bombs=Math.max(0,players[b.owner].bombs-1);
  const until=now+440;addFlame(b.x,b.y,until);shake=6;
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
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
    if(b.fuseAt-now>750)continue;
    if(b.x===x&&Math.abs(b.y-y)<=b.range)return true;
    if(b.y===y&&Math.abs(b.x-x)<=b.range)return true;
  }
  return false;
}
function endRound(){
  if(roundOver)return;roundOver=true;
  const a=players[0].alive,b=players[1].alive;let winner=-1;if(a&&!b)winner=0;else if(!a&&b)winner=1;
  if(winner>=0)players[winner].score++;
  syncHud();overlay.hidden=false;
  resultEl.textContent=winner<0?'DOUBLE KO':mode==='live'?(winner===onlineSlot?'YOU WIN':onlineHuman?'RIVAL WINS':'CPU WINS'):(winner===0?(mode==='cpu'?'YOU WIN':'PLAYER 1 WINS'):(mode==='cpu'?'CPU WINS':'PLAYER 2 WINS'));
  const champ=winner>=0&&players[winner].score>=3;
  if(champ){
    matchOver=true;subEl.textContent='MATCH OVER · FIRST TO 3';rematchBtn.hidden=false;
    if(mode==='live'&&mp?.isHost)try{mp.finish({winner,reason:'first-to-3'})}catch{}
  }else{subEl.textContent='NEXT ROUND…';nextRoundAt=performance.now()+1450}
  publish(true);
}
function checkKills(now){
  for(const p of players)if(p.alive&&flames.some(f=>f.x===p.x&&f.y===p.y&&f.until>now))p.alive=false;
  if(!players[0].alive||!players[1].alive)endRound();
}
function cpuShouldPlay(){return mode==='cpu'||(mode==='live'&&mp?.isHost&&!onlineHuman)}
function cpuStep(now){
  if(!cpuShouldPlay()||roundOver||matchOver||now-lastCpu<175)return;lastCpu=now;
  const me=players[1],foe=players[0];if(!me?.alive)return;
  const options=[[1,0],[-1,0],[0,1],[0,-1]].filter(([dx,dy])=>!isWall(me.x+dx,me.y+dy)&&!crates.has(key(me.x+dx,me.y+dy)));
  const safe=options.filter(([dx,dy])=>!dangerAt(me.x+dx,me.y+dy,now));
  if(dangerAt(me.x,me.y,now)&&safe.length){const d=safe[Math.floor(Math.random()*safe.length)];movePlayer(1,...d);return}
  const dist=Math.abs(me.x-foe.x)+Math.abs(me.y-foe.y);
  if(dist<=3&&me.bombs<me.bombMax&&Math.random()<.55){placeBomb(1);return}
  const pool=safe.length?safe:options;if(!pool.length){if(me.bombs<me.bombMax)placeBomb(1);return}
  pool.sort((a,b)=>(Math.abs(me.x+a[0]-foe.x)+Math.abs(me.y+a[1]-foe.y))-(Math.abs(me.x+b[0]-foe.x)+Math.abs(me.y+b[1]-foe.y)));
  movePlayer(1,...(Math.random()<.72?pool[0]:pool[Math.floor(Math.random()*pool.length)]));
  if(Math.random()<.16&&me.bombs<me.bombMax)placeBomb(1);
}
function update(now){
  advanceMovingBombs(now);
  flames=flames.filter(f=>f.until>now);
  bombs.filter(b=>b.fuseAt<=now).slice().forEach(b=>explode(b,now));
  checkKills(now);cpuStep(now);
  if(roundOver&&!matchOver&&nextRoundAt&&now>=nextRoundAt){round++;resetRound()}
}

// ----- THREE.JS VIEW -----
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x06101d);
scene.fog=new THREE.FogExp2(0x06101d,0.025);
const camera=new THREE.PerspectiveCamera(38,1,.1,100);
const center=new THREE.Vector3((COLS-1)/2,0,(ROWS-1)/2);
camera.position.set(center.x+11,13.5,center.z+14);
camera.lookAt(center.x,0,center.z);
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.8));
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
mount.appendChild(renderer.domElement);
const hemi=new THREE.HemisphereLight(0x8bc8ff,0x07111d,1.6);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffffff,2.8);sun.position.set(4,15,7);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-12;sun.shadow.camera.right=12;sun.shadow.camera.top=12;sun.shadow.camera.bottom=-12;scene.add(sun);
const rim=new THREE.PointLight(0xff485f,18,18,2);rim.position.set(COLS-1,5,ROWS-1);scene.add(rim);

const floor=new THREE.Mesh(new THREE.BoxGeometry(COLS+.8,.5,ROWS+.8),new THREE.MeshStandardMaterial({color:0x0d2740,roughness:.72,metalness:.1}));
floor.position.set(center.x,-.32,center.z);floor.receiveShadow=true;scene.add(floor);
const grid=new THREE.GridHelper(Math.max(COLS,ROWS),Math.max(COLS,ROWS),0x2c6b91,0x173852);grid.position.set(center.x,-.04,center.z);grid.scale.x=COLS/Math.max(COLS,ROWS);grid.scale.z=ROWS/Math.max(COLS,ROWS);scene.add(grid);

const staticGroup=new THREE.Group(),crateGroup=new THREE.Group(),bombGroup=new THREE.Group(),pickupGroup=new THREE.Group(),flameGroup=new THREE.Group(),playerGroup=new THREE.Group();
scene.add(staticGroup,crateGroup,bombGroup,pickupGroup,flameGroup,playerGroup);
const hardGeo=new THREE.BoxGeometry(.92,1.4,.92),hardMat=new THREE.MeshStandardMaterial({color:0x355879,roughness:.52,metalness:.32});
for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++)if(isWall(x,y)){
  const m=new THREE.Mesh(hardGeo,hardMat);m.position.set(x,.7,y);m.castShadow=m.receiveShadow=true;staticGroup.add(m);
}
const edgeMat=new THREE.MeshStandardMaterial({color:0x102943,metalness:.65,roughness:.35});
for(const [x,z,sx,sz] of [[center.x,-.65,COLS+.6,.22],[center.x,ROWS-.35,COLS+.6,.22],[-.65,center.z,.22,ROWS+.6],[COLS-.35,center.z,.22,ROWS+.6]]){
  const m=new THREE.Mesh(new THREE.BoxGeometry(sx,.75,sz),edgeMat);m.position.set(x,.25,z);scene.add(m);
}

function makeBomber(color){
  const g=new THREE.Group();
  const suit=new THREE.MeshStandardMaterial({color,roughness:.38,metalness:.12});
  const dark=new THREE.MeshStandardMaterial({color:0x111724,roughness:.45,metalness:.35});
  const white=new THREE.MeshStandardMaterial({color:0xf4f8ff,roughness:.38});
  const body=new THREE.Mesh(new THREE.SphereGeometry(.28,18,14),suit);body.scale.set(1,1.12,.9);body.position.y=.5;
  const head=new THREE.Mesh(new THREE.SphereGeometry(.25,18,14),white);head.position.y=.91;
  const visor=new THREE.Mesh(new THREE.BoxGeometry(.28,.08,.08),dark);visor.position.set(0,.94,-.225);
  const antenna=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,.2,8),dark);antenna.position.y=1.18;
  const ball=new THREE.Mesh(new THREE.SphereGeometry(.06,10,8),suit);ball.position.y=1.3;
  const footGeo=new THREE.BoxGeometry(.18,.11,.28);
  const l=new THREE.Mesh(footGeo,dark),r=new THREE.Mesh(footGeo,dark);l.position.set(-.16,.14,-.04);r.position.set(.16,.14,-.04);
  for(const m of [body,head,visor,antenna,ball,l,r]){m.castShadow=true;g.add(m)}
  return g;
}
const playerMeshes=[makeBomber(0x37b9ff),makeBomber(0xff5269)];playerMeshes.forEach(m=>playerGroup.add(m));
const crateGeo=new THREE.BoxGeometry(.82,.82,.82),crateMat=new THREE.MeshStandardMaterial({color:0x9b5d31,roughness:.7,metalness:.04});
const bombGeo=new THREE.SphereGeometry(.27,18,14),bombMat=new THREE.MeshStandardMaterial({color:0x11141b,roughness:.26,metalness:.72});
const flameGeo=new THREE.BoxGeometry(.86,.16,.86),flameMat=new THREE.MeshStandardMaterial({color:0xffb31e,emissive:0xff4a00,emissiveIntensity:4,transparent:true,opacity:.82});
const crateMeshes=new Map(),bombMeshes=new Map(),pickupMeshes=new Map(),flameMeshes=new Map();

function labelTexture(letter,bg){
  const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');
  x.fillStyle=bg;x.beginPath();x.roundRect(8,8,112,112,24);x.fill();x.strokeStyle='#ffffff';x.lineWidth=7;x.stroke();
  x.fillStyle='#fff';x.font='900 72px system-ui';x.textAlign='center';x.textBaseline='middle';x.fillText(letter,64,68);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
const powerVisuals={
  flame:['F','#ff8a22'],bomb:['B','#353d55'],speed:['S','#e7c53d'],kick:['K','#34c28c'],punch:['P','#a76cff'],line:['L','#ef5178']
};
function powerMesh(type){
  const [letter,bg]=powerVisuals[type];const g=new THREE.Group();
  const cube=new THREE.Mesh(new THREE.BoxGeometry(.5,.22,.5),new THREE.MeshStandardMaterial({map:labelTexture(letter,bg),roughness:.42,metalness:.08}));
  cube.castShadow=true;g.add(cube);return g;
}
function syncMap(current,desired,group,createFn){
  for(const [k,m] of current)if(!desired.has(k)){group.remove(m);current.delete(k)}
  for(const k of desired)if(!current.has(k)){const m=createFn(k);current.set(k,m);group.add(m)}
}
function syncWorld(now){
  syncMap(crateMeshes,crates,crateGroup,k=>{const [x,y]=k.split(',').map(Number);const m=new THREE.Mesh(crateGeo,crateMat);m.position.set(x,.42,y);m.castShadow=m.receiveShadow=true;return m});
  const bombKeys=new Set(bombs.map(b=>String(b.id)));
  syncMap(bombMeshes,bombKeys,bombGroup,k=>{const m=new THREE.Mesh(bombGeo,bombMat);m.castShadow=true;return m});
  for(const b of bombs){const m=bombMeshes.get(String(b.id));if(!m)continue;const air=b.airUntil>now?Math.sin((1-(b.airUntil-now)/420)*Math.PI)*1.25:0;m.position.set(b.x,.32+air,b.y);const pulse=1+Math.sin(now*.012+b.id)*.06;m.scale.setScalar(pulse)}
  const pickupKeys=new Set(pickups.keys());
  syncMap(pickupMeshes,pickupKeys,pickupGroup,k=>{const m=powerMesh(pickups.get(k));return m});
  let pi=0;for(const [k,m] of pickupMeshes){const [x,y]=k.split(',').map(Number);m.position.set(x,.28+Math.sin(now*.004+pi++)*.08,y);m.rotation.y=now*.0015}
  const flameKeys=new Set(flames.map(f=>key(f.x,f.y)));
  syncMap(flameMeshes,flameKeys,flameGroup,k=>{const[x,y]=k.split(',').map(Number);const m=new THREE.Mesh(flameGeo,flameMat.clone());m.position.set(x,.14,y);return m});
  for(const [k,m] of flameMeshes){m.material.opacity=.64+Math.sin(now*.03)*.18;m.scale.setScalar(.92+Math.sin(now*.025)*.12)}
}
function resize(){
  const r=mount.getBoundingClientRect();renderer.setSize(Math.max(1,r.width),Math.max(1,r.height),false);camera.aspect=r.width/Math.max(1,r.height);camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(mount);resize();

function render(now){
  syncWorld(now);
  players.forEach((p,i)=>{
    const m=playerMeshes[i];m.visible=!!p?.alive;if(!p)return;
    p.vx+=(p.x-p.vx)*.22;p.vy+=(p.y-p.vy)*.22;m.position.set(p.vx,0,p.vy);
    const [fx,fy]=p.face||[0,1];m.rotation.y=Math.atan2(fx,fy);
    m.position.y=Math.sin(now*.008+i)*.025;
  });
  const base=new THREE.Vector3(center.x+11,13.5,center.z+14);
  if(innerWidth<650)base.set(center.x+13.5,16.5,center.z+17);
  if(shake>0){base.x+=(Math.random()-.5)*shake*.04;base.y+=(Math.random()-.5)*shake*.025;shake*=.88;if(shake<.2)shake=0}
  camera.position.lerp(base,.08);camera.lookAt(center.x,.2,center.z);
  renderer.render(scene,camera);
}

function serialize(now=performance.now()){
  return {seed,round,roundOver,matchOver,nextRoundIn:nextRoundAt?Math.max(0,nextRoundAt-now):0,crates:[...crates],pickups:[...pickups],players:players.map(p=>({...p})),bombs:bombs.map(b=>({...b,fuseIn:Math.max(0,b.fuseAt-now),fuseAt:undefined,move:b.move?{...b.move,nextIn:Math.max(0,b.move.nextAt-now),nextAt:undefined}:null})),flames:flames.map(f=>({...f,life:Math.max(0,f.until-now),until:undefined}))};
}
function restore(s){
  if(!s)return;const now=performance.now();seed=s.seed>>>0;round=s.round;roundOver=!!s.roundOver;matchOver=!!s.matchOver;nextRoundAt=s.nextRoundIn?now+s.nextRoundIn:0;
  crates=new Set(s.crates||[]);pickups=new Map(s.pickups||[]);players=(s.players||[]).map(p=>({...p,vx:p.vx??p.x,vy:p.vy??p.y}));
  bombs=(s.bombs||[]).map(b=>({...b,fuseAt:now+(b.fuseIn||0),move:b.move?{...b.move,nextAt:now+(b.move.nextIn||0)}:null}));
  flames=(s.flames||[]).map(f=>({...f,until:now+(f.life||0)}));nextBombId=Math.max(1,...bombs.map(b=>b.id+1));
  syncHud();roundText.textContent='ROUND '+round;overlay.hidden=!roundOver;
  if(roundOver){const a=players[0]?.alive,b=players[1]?.alive;let winner=-1;if(a&&!b)winner=0;else if(!a&&b)winner=1;resultEl.textContent=winner<0?'DOUBLE KO':winner===onlineSlot?'YOU WIN':onlineHuman?'RIVAL WINS':'CPU WINS';subEl.textContent=matchOver?'MATCH OVER · FIRST TO 3':'NEXT ROUND…';rematchBtn.hidden=!matchOver}
  refreshSpecial();
}
function publish(force=false){
  if(mode!=='live'||!mp?.isHost||!onlineActive)return;const now=performance.now();if(!force&&now-lastPublish<100)return;lastPublish=now;try{mp.publish(serialize(now))}catch{}
}
function refreshSpecial(){
  const i=mode==='live'?onlineSlot:0,p=players[i];
  specialBtn.disabled=!p?.punch;specialBtn.classList.toggle('ready',!!p?.punch);specialBtn.innerHTML=p?.punch?'<span>👊</span>PUNCH':'<span>👊</span>LOCKED';
}
function directAction(i,action){
  if(action==='bomb')placeBomb(i);else if(action==='special')punchBomb(i);else {const d={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[action];if(d)movePlayer(i,d[0],d[1])}
}
function act(ref,action){
  const i=ref==='local'?(mode==='live'?onlineSlot:0):Number(ref);
  if(mode==='cpu'&&i!==0)return;
  if(mode==='live'){
    if(!mp?.roomCode||!onlineActive)return;
    if(mp.isHost){if(i===0)directAction(0,action)}
    else {try{mp.send('action',{action})}catch{}}
    return;
  }
  directAction(i,action);
}
function setMode(next){
  mode=next;modeButtons.forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));
  onlineWrap.hidden=mode!=='live';dualControls.hidden=mode!=='local';singleControls.hidden=mode==='local';
  if(mode!=='live'){onlineActive=false;onlineHuman=false;resetMatch()}
  syncHud();refreshSpecial();
}
async function enterLive(){
  setMode('live');statusText.textContent='Opening live arena…';
  try{await mp?.ready;if(mp?.available&&!mp.roomCode)await mp.create()}catch(e){statusText.textContent='Online unavailable · CPU/local still work'}
}
modeButtons.forEach(b=>b.addEventListener('click',()=>b.dataset.mode==='live'?enterLive():setMode(b.dataset.mode)));

const held=new Map();
document.querySelectorAll('[data-action]').forEach(btn=>{
  const start=e=>{e.preventDefault();const p=btn.dataset.player,a=btn.dataset.action;act(p,a);if(!['bomb','special'].includes(a)){clearInterval(held.get(btn));held.set(btn,setInterval(()=>act(p,a),125))}};
  const stop=()=>{clearInterval(held.get(btn));held.delete(btn)};
  btn.addEventListener('pointerdown',start);['pointerup','pointercancel','pointerleave'].forEach(ev=>btn.addEventListener(ev,stop));
});
addEventListener('keydown',e=>{
  if(e.repeat)return;const k=e.key.toLowerCase();
  if(mode==='local'){
    if(k==='w')act('0','up');if(k==='s')act('0','down');if(k==='a')act('0','left');if(k==='d')act('0','right');if(k===' ')act('0','bomb');if(k==='q'||k==='shift')act('0','special');
    if(e.key==='ArrowUp')act('1','up');if(e.key==='ArrowDown')act('1','down');if(e.key==='ArrowLeft')act('1','left');if(e.key==='ArrowRight')act('1','right');if(e.key==='Enter')act('1','bomb');if(e.key==='/')act('1','special');
  }else{
    if(k==='w'||e.key==='ArrowUp')act('local','up');if(k==='s'||e.key==='ArrowDown')act('local','down');if(k==='a'||e.key==='ArrowLeft')act('local','left');if(k==='d'||e.key==='ArrowRight')act('local','right');if(k===' '||e.key==='Enter')act('local','bomb');if(k==='q'||k==='shift')act('local','special');
  }
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();
},{passive:false});
rematchBtn.addEventListener('click',()=>{if(mode==='live'&&mp?.roomCode){mp.setReady(true);return}resetMatch()});

function mountOnline(){
  if(!window.StarMuffMultiplayer){statusText.textContent='Multiplayer client unavailable';return}
  mp=window.StarMuffMultiplayer.mount({
    game:'bomberman',container:'#onlineRoom',
    onStart({seed:s,slot,isHost,resumed,snapshot}){mode='live';onlineSlot=slot??0;onlineActive=true;liveStarting=false;if(resumed&&snapshot)restore(snapshot);else resetMatch(s>>>0);syncHud();statusText.textContent=isHost?(onlineHuman?'LIVE · HUMAN RIVAL':'LIVE · CPU HOLDING P2'):'LIVE · YOU TOOK P2';},
    onEvent({type,data,slot}){if(type!=='action'||!mp?.isHost||slot!==1)return;const a=data?.action;if(['up','down','left','right','bomb','special'].includes(a))directAction(1,a)},
    onSnapshot({snapshot}){if(!mp?.isHost)restore(snapshot)},
    onPresence({players:seats,phase}){
      onlineHuman=!!seats?.[1]?.connected;syncHud();
      if(mp?.slot===0&&phase==='lobby'&&seats?.[0]?.connected&&!seats?.[1]?.occupied&&!liveStarting){liveStarting=true;setTimeout(()=>mp?.setReady(true),60)}
      if(phase==='active')statusText.textContent=mp?.slot===0?(onlineHuman?'LIVE · PLAYER JOINED — CPU OUT':'LIVE · OPEN — CPU HOLDING P2'):'LIVE · YOU REPLACED THE CPU';
    },
    onFinish({result}){matchOver=true;overlay.hidden=false;if(result&&Number.isInteger(result.winner))resultEl.textContent=result.winner===onlineSlot?'YOU WIN':'RIVAL WINS';subEl.textContent='MATCH OVER';rematchBtn.hidden=false},
    onLeave(){onlineActive=false;onlineHuman=false;statusText.textContent='Live room closed';},
    onUnavailable(){statusText.textContent='Online unavailable · CPU/local still work'}
  });
}

let prev=performance.now();
function frame(now){
  const dt=now-prev;prev=now;
  if(mode!=='live'||mp?.isHost)update(now);
  publish();render(now);requestAnimationFrame(frame);
}
const invited=(()=>{try{return new URLSearchParams(location.search).has('room')}catch{return false}})();
if(invited)setMode('live');else resetMatch();
mountOnline();requestAnimationFrame(frame);
