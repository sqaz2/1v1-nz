/* Add online duels to the imported Odyssey Tanks, retaining original drawing,
 * hull selection, controls, audio, projectiles and six class abilities. */
(function () {
  'use strict';
  const originalShoot = playerShoot, originalAbility = useAbility;
  const originalDraw = draw, originalExplosion = spawnExplosion;
  const local = {matchId: null, slot: 0, isHost: false, connected: false, started: false,
    loadout: null, loadouts: [null,null], fire: false, ability: false, lastInput: 0,
    lastPublish: 0, lastFrame: performance.now(), accumulator: 0, finished: false};
  let mp;
  let renderPositions=[null,null],previousHP=[null,null];
  const style = document.createElement('style');
  style.textContent = `
    #duel-nav{position:fixed;left:0;right:0;top:0;z-index:51;display:flex;gap:8px;align-items:center;padding:8px 10px;background:#100720;border-bottom:1px solid #663620;font:12px monospace;color:#ffd0a0}
    #duel-nav a,#duel-nav button{font:inherit;color:#ffc186;background:#20132a;border:1px solid #714224;border-radius:6px;padding:8px;text-decoration:none;min-height:36px}
    #duel-nav span{margin-left:auto}#duel-room{position:fixed;inset:52px 0 0;z-index:50;background:rgba(3,0,8,.97);overflow:auto;padding:20px 14px}
    #duel-room[hidden]{display:none}#duel-info{max-width:680px;margin:0 auto 14px;font:14px/1.5 monospace;color:#ffd1b0}
    #duel-status{position:fixed;left:0;right:0;top:52px;z-index:25;pointer-events:none;text-align:center;font:bold 12px/1.4 monospace;color:#ffe0a0;background:rgba(3,0,8,.75);padding:4px}
    #menu-screen{padding-top:72px;justify-content:flex-start}#menu-screen h1{font-size:24px;margin-top:8px}#hud{top:80px;padding:8px 12px}#energy-hud{top:135px}#ability-btn{min-height:40px;font-size:12px}
    #leaderboard-panel,#wz-toggle,#auto-toggle{display:none!important}#hud-cr{display:none}#game-over{padding:70px 16px 16px;text-align:center}#game-over h1{font-size:24px}
    #mobile-controls{height:45%}#joystick-zone{left:12px;bottom:24px}#fire-btn{right:16px;bottom:30px}#aim-indicator{bottom:152px;right:30px;width:70px;height:52px}
    @media(max-width:400px){#duel-nav{gap:4px;padding:6px}#duel-nav a,#duel-nav button{font-size:11px;padding:6px}#duel-nav span{font-size:10px}#joystick-zone{transform:scale(.85);transform-origin:left bottom}#fire-btn{width:92px;height:92px}}
  `;
  document.head.appendChild(style);
  const nav = document.createElement('nav'); nav.id='duel-nav';
  nav.innerHTML='<a href="/">← 1v1</a><a href="./original.html">Original solo</a><button id="duel-room-toggle" type="button">Room</button><span>ODYSSEY DUEL</span>';
  document.body.appendChild(nav);
  const room=document.createElement('section');room.id='duel-room';room.hidden=true;
  room.innerHTML='<div id="duel-info"><strong>Odyssey Tanks · online duel</strong><p>Choose your original StarMuff tank and three perks, then create or join a room. Both players press Ready. Last tank standing wins.</p><p>Six original classes and abilities. Energy recharges every 3 seconds. War-zone missions and waves are in Original solo.</p><button id="duel-edit-loadout" type="button">Edit tank / loadout</button></div><div id="duel-lobby"></div>';
  document.body.appendChild(room);
  const status=document.createElement('div');status.id='duel-status';status.textContent='Choose a tank and 3 perks';document.body.appendChild(status);
  $('duel-room-toggle').onclick=()=>{room.hidden=!room.hidden;clearHeld();};
  $('duel-edit-loadout').onclick=()=>{
    if(local.started&&!local.finished){status.textContent='Finish or leave this match before changing loadout';return;}
    room.hidden=true;$('menu-screen').style.display='flex';setMenuStep(1);local.loadout=null;mp?.setReady(false);
  };
  PERKS.find(p=>p.id==='repair').desc='+15 HP every 15 seconds';
  PERKS.find(p=>p.id==='crates').desc='55% supply-drop chance from destroyed walls';
  PERKS.find(p=>p.id==='accuracy').desc='+30% damage-score (no combat bonus)';
  PERKS.find(p=>p.id==='arsenal').desc='Bullets pierce 1 summoned ghost';
  $('controls-text').innerHTML='WASD / ARROWS — Move<br>MOUSE — Aim<br>CLICK / SPACE — Fire<br>E — Ability';
  $('controls-mobile').innerHTML='LEFT STICK — Move<br>AUTO-AIM — Opponent (unless cloaked)<br>HOLD FIRE — Rapid Shots';
  $('btn-start').textContent='LOCK LOADOUT';
  $('btn-start').onclick=()=>{
    const value=OdysseyDuel.validLoadout({hull:selHull.id,perks:[...selectedPerks]},HULLS,PERKS);
    if(!value)return;
    local.loadout=value;$('menu-screen').style.display='none';room.hidden=false;
    status.textContent=selHull.name+' loadout locked — create or join a room';
    actx.resume?.();
  };
  $('go-name').hidden=true;$('go-cr').hidden=true;$('btn-submit').textContent='REMATCH / ROOM';
  $('btn-submit').onclick=()=>{$('game-over').style.display='none';room.hidden=false;mp?.setReady(true);};
  document.querySelector('#hud-score').previousElementSibling.textContent='Damage score';
  document.querySelector('#hud-wave').previousElementSibling.textContent='Opponent HP';
  $('hud-cr').parentElement.style.display='none';

  function context(p,world,fn){
    const saved={player,selHull,selectedPerks,bullets,pickups,mouseX,mouseY,cam,wave};
    player=p;selHull=HULLS.find(h=>h.id===p.hull);selectedPerks=new Set(p.perks);
    bullets=world.bullets;pickups=world.pickups;cam={x:0,y:0};mouseX=p.x+Math.cos(p.angle)*500;mouseY=p.y+Math.sin(p.angle)*500;wave=1;
    try{fn();}finally{({player,selHull,selectedPerks,bullets,pickups,mouseX,mouseY,cam,wave}=saved);}
  }
  const core=OdysseyDuel.create({hulls:HULLS,perks:PERKS,
    shoot(p,world){
      const count=world.bullets.length;
      context(p,world,()=>originalShoot());
      for(let i=count;i<world.bullets.length;i++)world.bullets[i].owner=p.slot;
    },
    ability(p,world){
      const before=world.pickups.length;
      context(p,world,()=>originalAbility());
      // The original carrier can roll an all-enemy nuke. In a duel it is a
      // shield instead: an instant unavoidable opponent deletion is not fair.
      for(let i=before;i<world.pickups.length;i++){
        const item=world.pickups[i];if(item.type==='nuke')Object.assign(item,PICKUP_TYPES.find(t=>t.type==='shield'));
        delete item.effect;
      }
    },
    explode(x,y,size){originalExplosion(x,y,size);},
    wallDrop(p,wall,world){
      const before=world.pickups.length;
      context(p,world,()=>spawnPickup(wall.x+wall.w/2,wall.y+wall.h/2));
      for(let i=before;i<world.pickups.length;i++){
        const item=world.pickups[i];if(item.type==='nuke')Object.assign(item,PICKUP_TYPES.find(t=>t.type==='shield'));delete item.effect;
      }
    },
    pickup(p,item){const type=PICKUP_TYPES.find(t=>t.type===item.type&&t.type!=='nuke');if(type)type.effect(p);}
  });
  function seeded(seed,fn){
    const random=Math.random;let n=2166136261;
    for(const c of String(seed)){n^=c.charCodeAt(0);n=Math.imul(n,16777619);}
    Math.random=()=>{n+=0x6D2B79F5;let t=n;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};
    try{return fn();}finally{Math.random=random;}
  }
  function bootstrap(){
    if(!local.isHost||core.world?.matchId===local.matchId||local.loadouts.some(value=>!value))return;
    // Generate original arena obstacles from the room's seed, once on host.
    player.x=1200;player.y=1200;wave=1;seeded(mp.seed,()=>generateWalls());
    for(const wall of walls)wall.maxHp=wall.hp;
    core.start(local.matchId,mp.seed,local.loadouts,walls);startView();publish();
  }
  function clearHeld(){
    local.fire=false;local.ability=false;mouseDown=false;autoFireHeld=false;joyActive=false;joyVec={x:0,y:0};
    Object.keys(keys).forEach(key=>keys[key]=false);
    joyKnob.style.left='50px';joyKnob.style.top='50px';fireBtn.classList.remove('active');
    if(autoFireInterval){clearInterval(autoFireInterval);autoFireInterval=null;}
    core.clearInput();
  }
  window.addEventListener('blur',clearHeld);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)clearHeld();});
  joyZone.addEventListener('touchcancel',clearHeld);
  window.addEventListener('mouseup',()=>{mouseDown=false;});
  // Original control listeners call these names. Only intents leave a guest.
  playerShoot=()=>{if(local.started&&local.connected&&!local.finished)local.fire=true;};
  useAbility=()=>{if(local.started&&local.connected&&!local.finished)local.ability=true;};
  startGame=()=>{}; // Only the shared match lifecycle can launch online play.
  function input(){
    const mine=core.world?.tanks[local.slot],other=core.world?.tanks[1-local.slot];
    let x=0,y=0;
    if(keys.w||keys.arrowup)y=-1;if(keys.s||keys.arrowdown)y=1;
    if(keys.a||keys.arrowleft)x=-1;if(keys.d||keys.arrowright)x=1;
    if(joyActive){x=joyVec.x;y=joyVec.y;}
    const autoAim=isMobile&&other&&other.cloakT<=0;
    const angle=mine?(autoAim?Math.atan2(other.y-mine.y,other.x-mine.x):Math.atan2(mouseY+cam.y-mine.y,mouseX+cam.x-mine.x)):0;
    const packet={x,y,angle,fire:local.fire||mouseDown||autoFireHeld||keys[' ']===true,ability:local.ability};
    local.fire=false;local.ability=false;
    if(room.hidden===false||document.hidden)return{x:0,y:0,angle,fire:false,ability:false};
    return packet;
  }
  function syncView(){
    const world=core.world;if(!world)return;
    const displayed=world.tanks.map((tank,index)=>{
      const old=renderPositions[index];
      const point=!local.isHost&&old&&dist(old,tank)<150?{x:lerp(old.x,tank.x,.35),y:lerp(old.y,tank.y,.35)}:{x:tank.x,y:tank.y};
      renderPositions[index]=point;
      if(previousHP[index]!==null&&tank.hp<previousHP[index]){
        floatTexts.push({x:tank.x,y:tank.y-PLAYER_SIZE-5,text:'-'+Math.ceil(previousHP[index]-tank.hp),color:index===local.slot?'#ff2244':'#ffcc00',life:22,vy:-1.8,size:10});
        beep(index===local.slot?200:600,.03,.05);
      }
      previousHP[index]=tank.hp;
      return local.isHost?tank:{...tank,...point};
    });
    player=displayed[local.slot];selHull=HULLS.find(h=>h.id===player.hull);selectedPerks=new Set(player.perks);
    const other=displayed[1-local.slot];
    enemies=other.cloakT>0?[]:[{...other,size:PLAYER_SIZE,color:other.furyT>0?'#ff2244':other.overdriveT>0?'#ffcc00':'#00ccff',name:'P'+(other.slot+1)+' '+HULLS.find(h=>h.id===other.hull).name}];
    for(const ghost of other.ghostTanks)enemies.push({...ghost,size:14,color:'#8800ff',name:'GHOST'});
    bullets=world.bullets.filter(b=>b.owner===local.slot);
    enemyBullets=world.bullets.filter(b=>b.owner!==local.slot).map(b=>({...b,color:'#00ccff'}));
    walls=world.walls;pickups=world.pickups;gameTime=world.tick;
    cam.x=lerp(cam.x,player.x-W/2,.18);cam.y=lerp(cam.y,player.y-H/2,.18);
    cam.x=clamp(cam.x,0,Math.max(0,ARENA_W-W));cam.y=clamp(cam.y,0,Math.max(0,ARENA_H-H));
    $('hud-hp').textContent=Math.ceil(player.hp);$('hud-wave').textContent=player.perks.includes('targeting')||dist(player,other)<300?Math.ceil(other.hp):'?';
    $('hud-score').textContent=Math.round(player.damage*(player.perks.includes('accuracy')?1.3:1));
    updateEnergyHUD();
  }
  function startView(){
    local.started=true;state='play';room.hidden=true;$('menu-screen').style.display='none';$('game-over').style.display='none';$('energy-hud').style.display='block';
    clearHeld();syncView();cam.x=clamp(player.x-W/2,0,Math.max(0,ARENA_W-W));cam.y=clamp(player.y-H/2,0,Math.max(0,ARENA_H-H));
    status.textContent='P'+(local.slot+1)+' · Last tank standing · E / tap for ability';
  }
  function publish(){if(core.world&&local.isHost&&mp?.connected)mp.publish(core.snapshot());}
  function endView(){
    if(local.finished)return;local.finished=true;clearHeld();state='gameover';
    const world=core.world;const won=world.winner===local.slot;
    $('game-over').style.display='flex';$('game-over').querySelector('h1').textContent=world.winner===null?'DRAW':won?'VICTORY':'DESTROYED';
    $('go-score').textContent='P1 '+Math.ceil(world.tanks[0].hp)+' HP · P2 '+Math.ceil(world.tanks[1].hp)+' HP';
    $('go-wave').textContent='MATCH '+Math.floor(world.tick/60)+' SECONDS';$('go-kills').textContent='Ready again in the room for a fresh match.';
    status.textContent='Duel finished';
    if(local.isHost){publish();mp.finish({winner:world.winner,reason:'tank-destroyed'});}
  }
  tick=function(){
    const now=performance.now();const elapsed=Math.min(100,now-local.lastFrame);local.lastFrame=now;
    if(!local.started||!core.world||!local.connected||local.finished){local.accumulator=0;return;}
    if(now-local.lastInput>=50){
      const packet=input();local.lastInput=now;
      if(local.isHost)core.setInput(local.slot,packet);else mp.send('input',packet);
    }
    if(local.isHost){
      local.accumulator+=elapsed;
      while(local.accumulator>=1000/60){core.step();local.accumulator-=1000/60;}
      if(now-local.lastPublish>=1000/15){publish();local.lastPublish=now;}
    }
    // Original visual effects, aged locally; gameplay always comes from host.
    for(const p of particles){p.x+=p.vx;p.y+=p.vy;p.vx*=.94;p.vy*=.94;p.life--;}
    particles=particles.filter(p=>p.life>0).slice(-250);
    for(const p of explosions){p.life--;p.r=lerp(p.r,p.maxR,.2);}explosions=explosions.filter(p=>p.life>0);
    for(const p of floatTexts){p.life--;p.y+=p.vy;}floatTexts=floatTexts.filter(p=>p.life>0);
    for(const p of trails)p.life--;trails=trails.filter(p=>p.life>0).slice(-250);
    syncView();if(core.world.phase==='finished')endView();
  };
  draw=function(){
    originalDraw();
    const other=core.world?.tanks[1-local.slot];
    if(!local.started||!other||other.cloakT>0)return;
    // Reuse the original shield/fortify ring language for the second player.
    if(other.fortifyT>0||other.shieldT>0){
      X.save();X.translate(-cam.x,-cam.y);X.strokeStyle='rgba(0,204,255,.65)';X.lineWidth=other.fortifyT>0?3:2;
      X.beginPath();X.arc(other.x,other.y,PLAYER_SIZE+10,0,TAU);X.stroke();X.restore();
    }
  };
  if(!window.StarMuffMultiplayer){status.textContent='Online lobby could not load. Original solo is available above.';return;}
  mp=StarMuffMultiplayer.mount({game:'odyssey-tanks',container:$('duel-lobby'),
    canReady:()=>!!local.loadout,
    onStart(info){
      local.matchId=info.matchId;local.slot=info.slot;local.isHost=info.isHost;
      local.connected=mp.connected;local.started=false;local.finished=false;local.loadouts=[null,null];
      local.lastFrame=performance.now();local.accumulator=0;clearHeld();
      renderPositions=[null,null];previousHP=[null,null];
      particles=[];explosions=[];floatTexts=[];trails=[];enemyBullets=[];enemies=[];
      if(info.resumed&&info.snapshot&&core.restore(info.snapshot,info.matchId)){
        local.loadout={hull:core.world.tanks[info.slot].hull,perks:[...core.world.tanks[info.slot].perks]};
        startView();if(core.world.phase==='finished')endView();return;
      }
      if(info.resumed&&core.world?.matchId===info.matchId){startView();if(local.isHost)publish();return;}
      // Ready is blocked until this exists. A reconnect without a snapshot
      // waits for the host instead of creating a different local match.
      if(local.loadout){local.loadouts[local.slot]=local.loadout;mp.send('loadout',local.loadout);}
      status.textContent='Waiting for both locked loadouts…';room.hidden=true;
      bootstrap();
    },
    onEvent(event){
      if(event.matchId!==local.matchId)return;
      if(event.type==='loadout'&&local.isHost){
        const value=OdysseyDuel.validLoadout(event.data,HULLS,PERKS);
        if(value&&[0,1].includes(event.slot)&&!core.world?.tanks?.length){local.loadouts[event.slot]=value;bootstrap();}
        else if(value&&core.world?.matchId!==local.matchId){local.loadouts[event.slot]=value;bootstrap();}
      }else if(event.type==='input'&&local.isHost&&event.slot===1){core.setInput(event.slot,event.data);}
    },
    onSnapshot(event){
      if(local.isHost||event.slot!==0||event.matchId!==local.matchId)return;
      if(core.world?.matchId===local.matchId&&event.snapshot.tick<core.world.tick)return;
      if(core.restore(event.snapshot,local.matchId)){if(!local.started)startView();syncView();if(core.world.phase==='finished')endView();}
    },
    onPresence(info){
      local.connected=info.connected===true;
      if(!local.connected){clearHeld();if(local.started&&!local.finished)status.textContent='Paused — waiting for both players to reconnect';}
      else if(local.started&&!local.finished){status.textContent='P'+(local.slot+1)+' · Last tank standing';local.lastFrame=performance.now();local.accumulator=0;}
    },
    onFinish(info){
      if(local.matchId&&info.matchId!==local.matchId)return;
      if(core.world?.matchId===info.matchId&&core.world.phase==='finished'){endView();return;}
      clearHeld();local.slot=mp.slot;local.finished=true;local.started=false;state='gameover';
      $('menu-screen').style.display='none';$('game-over').style.display='flex';
      $('game-over').querySelector('h1').textContent=info.result?.winner===null?'DRAW':info.result?.winner===local.slot?'VICTORY':'MATCH FINISHED';
      $('go-score').textContent='The room has preserved the result.';$('go-wave').textContent='';$('go-kills').textContent='Choose your loadout and request a rematch in the room.';
    },
    onLeave(){
      clearHeld();local.started=false;local.finished=false;local.matchId=null;state='menu';
      $('menu-screen').style.display='flex';$('game-over').style.display='none';$('energy-hud').style.display='none';room.hidden=true;setMenuStep(1);
      status.textContent='Choose a tank and 3 perks';
    }
  });
  // Expose only read-only inspection for browser regression tests.
  window.OdysseyOnline={get snapshot(){return core.snapshot();},get status(){return{matchId:local.matchId,slot:local.slot,started:local.started,connected:local.connected};}};
})();
