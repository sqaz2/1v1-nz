/* Multiplayer orchestration around the original StarMuff Artillery game.
   The solo campaign remains available and the original canvas renderer is reused. */
window.installArtilleryDuel=function(original){
  'use strict';
  const Core=window.ArtilleryDuelCore,$=id=>document.getElementById(id);
  const catalog=original.catalog;
  const bar=document.createElement('section');bar.id='duelHub';bar.innerHTML=`<a href="/">← 1v1.nz</a><h1>StarMuff Artillery</h1><p>The original tanks, terrain, special ammunition and ship loadouts. Now head to head.</p><div class="duel-modes"><button data-mode="cpu" aria-pressed="true">Vs CPU</button><button data-mode="hotseat">Local 2P</button><button data-mode="online">Online 1v1</button><button data-mode="solo">Solo campaign</button></div><div id="duelRoom"></div><p id="duelSetupStatus" role="status">Choose your ship and three perks. CPU chooses its own loadout.</p></section>`;
  document.body.prepend(bar);
  const status=document.createElement('section');status.id='duelStatus';status.hidden=true;status.innerHTML='<div id="duelScore"></div><p id="duelTurn" role="status"></p><div class="duel-protocols"><button data-protocol="defense">Solve shield</button><button data-protocol="repair">Solve repair</button><button data-protocol="armory">Solve ammo</button><button id="duelPass">Pass turn</button><button id="duelPause">Pause</button><button id="duelExit">New game</button></div>';
  $('ui').prepend(status);
  const overlay=document.createElement('div');overlay.id='duelOverlay';overlay.className='overlay';overlay.innerHTML='<div class="panel"><h3 id="duelOverlayTitle"></h3><p id="duelOverlayText"></p><button class="tut-close" id="duelContinue">Continue</button></div>';document.body.append(overlay);
  let mode='cpu',active=false,state=null,loadouts=[null,null],setupSlot=0,network=null,presence=true,paused=false,lastTime=0,accum=0,lastPublish=0,selectionWeapon='standard',turnSeen=0,phaseSeen='',challengeSeen='',lootSeen=0,lastFx=0,cpuWait=0,finishSent=false,awaitingHandoff=false,epoch=0;
  const label=slot=>mode==='cpu'&&slot===1?'CPU':`Player ${slot+1}`;
  const localSlot=()=>mode==='online'?network.slot:mode==='cpu'?0:state?.turn||0;
  const authority=()=>mode!=='online'||network?.isHost;
  const canAct=()=>active&&state&&state.phase!=='finished'&&!paused&&!awaitingHandoff&&(mode!=='online'||presence)&&localSlot()===state.turn;
  function message(t){$('duelSetupStatus').textContent=t;}
  function switchMode(m){if(active)return;mode=m;setupSlot=0;loadouts=[null,null];bar.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));$('duelRoom').hidden=mode!=='online';message(mode==='solo'?'Original wave-based single-player campaign.':mode==='online'?'Create or join a room, ready up, then choose your ship and loadout.':mode==='hotseat'?'Player 1 chooses a ship and three perks. Player 2 chooses next.':'Choose your ship and three perks. CPU chooses its own loadout.');if(mode!=='online'&&network?.roomCode)network.leave();}
  bar.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>switchMode(b.dataset.mode)));
  function publish(){if(mode==='online'&&network?.isHost&&network.active){network.publish(state?{kind:'artillery-state',state:Core.publicState(state)}:{kind:'artillery-config',loadouts});lastPublish=performance.now();}}
  function launch(seed){epoch++;state=Core.create(seed,loadouts,catalog);begin();publish();}
  function begin(){active=true;paused=false;awaitingHandoff=false;finishSent=false;lastTime=0;accum=0;turnSeen=0;phaseSeen='';challengeSeen='';lastFx=0;cpuWait=0;bar.hidden=true;status.hidden=false;$('menuScreen').classList.add('hide');$('ui').classList.add('show');$('duelOverlay').classList.remove('show');original.startLoop();render();}
  function acceptLoadout(slot,value){if(state||slot!==0&&slot!==1||!Core.validLoadout(value,catalog.hulls))return;loadouts[slot]={hull:value.hull,perks:value.perks.slice()};if(loadouts.every(Boolean))launch(network.seed);else publish();}
  function confirmSetup(e){if(mode==='solo')return;e.preventDefault();e.stopImmediatePropagation();const choice=original.getLoadout();if(!Core.validLoadout(choice,catalog.hulls)){message('Choose a ship and exactly three perks.');return;}
    if(mode==='online'){if(!network?.active){message('Create/join a room and both press Ready first.');return;}message('Loadout locked. Waiting for the other player…');$('menuPlay').disabled=true;if(network.isHost)acceptLoadout(0,choice);else network.send('loadout',choice);return;}
    loadouts[setupSlot]=choice;
    if(mode==='hotseat'&&setupSlot===0){setupSlot=1;message('Player 2: choose your own ship and three perks.');original.resetSetup();return;}
    if(mode==='cpu')loadouts[1]={hull:'dreadnought',perks:['arsenal','mobility','defense']};
    launch(String(Date.now()));
  }
  $('menuPlay').addEventListener('click',confirmSetup,true);
  function send(action,payload={}){if(!canAct())return false;const c={action,payload,turnId:state.turnId};if(mode==='online'&&!network.isHost){network.send('command',c);return true;}const accepted=Core.command(state,localSlot(),c);if(accepted){render();publish();}return accepted;}
  function intercept(id,fn){$(id).addEventListener('click',e=>{if(!active)return;e.preventDefault();e.stopImmediatePropagation();fn();},true);}
  intercept('fire',()=>{if(!canAct())return;const t=state.tanks[state.turn];if(t.perks.includes('targeting')&&!t.solved&&!t.mathUsed.includes('targeting'))send('math',{kind:'targeting'});else send('fire',{angle:Number($('angle').value),power:Number($('power').value),weapon:selectionWeapon});});
  intercept('moveL',()=>send('move',{dir:-1}));intercept('moveR',()=>send('move',{dir:1}));intercept('abilityBtn',()=>send('ability'));intercept('cloakBtn',()=>send('cloak'));
  intercept('buyAmmoBtn',()=>{if(!canAct())return;const chosen=selectionWeapon==='standard'?'cluster':selectionWeapon;send('ammo',{weapon:chosen});});
  intercept('swapBtn',()=>{
    if(!canAct()||state.phase!=='aim')return;const t=state.tanks[state.turn],chosen=new Set(t.perks),oldTurn=state.turnId;
    $('swapSub').textContent=t.swaps===0?'One free match loadout swap; second costs 70% of shells.':'Second swap costs 70% of remaining shells.';
    original.buildPerks($('swapGrid'),chosen,t.perks.length);$('swapOverlay').classList.add('show');
    $('swapConfirm').onclick=()=>{if(state.turnId!==oldTurn){$('swapOverlay').classList.remove('show');return;}if(chosen.size===t.perks.length&&send('swap',{perks:[...chosen]}))$('swapOverlay').classList.remove('show');};
  });
  intercept('reset',()=>pause());
  $('duelPass').onclick=()=>send('pass');$('duelPause').onclick=()=>pause();$('duelExit').onclick=()=>exit();
  status.querySelectorAll('[data-protocol]').forEach(b=>b.onclick=()=>send('math',{kind:b.dataset.protocol}));
  function cover(title,text,button,cb){$('duelOverlayTitle').textContent=title;$('duelOverlayText').textContent=text;$('duelContinue').textContent=button;$('duelContinue').onclick=cb;$('duelOverlay').classList.add('show');}
  function pause(){if(!active)return;if(mode==='online'){cover('Online match','The match continues while this menu is open. Leaving ends your participation.','Return to match',()=>overlay.classList.remove('show'));return;}paused=true;cover('Paused','Your projectiles and math timer are paused.','Resume',()=>{paused=false;lastTime=0;overlay.classList.remove('show');});}
  function exit(keepRoom=false){epoch++;active=false;state=null;paused=false;awaitingHandoff=false;loadouts=[null,null];setupSlot=0;lastTime=0;finishSent=false;bar.hidden=false;status.hidden=true;overlay.classList.remove('show');$('menuPlay').disabled=false;original.returnToMenu();if(mode==='online'&&network?.roomCode&&!keepRoom)network.leave();message(mode==='online'&&keepRoom?'Both players press Request rematch in the room.':mode==='hotseat'?'Player 1: choose your ship and three perks.':'Choose your ship and three perks.');}
  function applySnapshot(snapshot){if(!snapshot)return;if(snapshot.kind==='artillery-config'){loadouts=snapshot.loadouts||[null,null];return;}if(snapshot.kind!=='artillery-state'||!snapshot.state||snapshot.state.version!==1)return;
    state=snapshot.state;
    // Reconnecting authority resumes the canonical PRNG and hidden answer.
    if(authority()&&state.challenge)state.challenge.ans=Core.solveMath(state.challenge);
    if(!active)begin();else render();
  }
  if(window.StarMuffMultiplayer){network=window.StarMuffMultiplayer.mount({game:'skirmish',container:$('duelRoom'),
    onStart(info){mode='online';presence=true;loadouts=[null,null];$('menuPlay').disabled=false;if(info.snapshot){applySnapshot(info.snapshot);return;}state=null;active=false;bar.hidden=false;status.hidden=true;original.returnToMenu();message(`You are Player ${info.slot+1}. Choose your ship and three perks, then Launch.`);},
    onEvent(event){if(!network.isHost)return;if(event.type==='loadout'){acceptLoadout(event.slot,event.data);return;}if(event.type==='command'&&state&&presence){if(Core.command(state,event.slot,event.data)){render();publish();}}},
    onSnapshot({snapshot}){applySnapshot(snapshot);},
    onPresence(info){presence=info.connected;if(active){if(!presence)cover('Opponent disconnected','The match and math timers are paused until both players reconnect.','Waiting…',()=>{});else if(!paused&&!awaitingHandoff&&state?.phase!=='finished')overlay.classList.remove('show');lastTime=0;}},
    onLeave(){if(active)exit();},
    onFinish({result}){if(state&&state.phase!=='finished'&&result){state.phase='finished';state.winner=result.winner;render();}}
  });}else message('Online room service unavailable. Local and CPU modes still work.');
  switchMode(new URLSearchParams(location.search).has('room')?'online':'cpu');
  function renderMath(){const q=state.challenge;if(!q){$('mathOverlay').classList.remove('show');challengeSeen='';return;}
    if(!canAct()){$('mathOverlay').classList.remove('show');return;}
    if(challengeSeen!==q.id){challengeSeen=q.id;$('mathTitle').textContent='StarMuff Math';$('mathModeChip').textContent=q.kind;$('mathFactionChip').textContent=q.faction==='mult'?'Multiply':'Add/Sub';$('mathSub').textContent='Solve for your selected protocol. Ten seconds.';$('mathQ').textContent=q.q;$('mathStatus').textContent='';$('mathOpts').replaceChildren();for(const value of q.choices){const b=document.createElement('button');b.className='math-btn';b.textContent=value;b.onclick=()=>send('answer',{id:q.id,value});$('mathOpts').append(b);}$('mathSkip').classList.remove('show');$('armRew').classList.remove('show');}
    $('mathBar').style.transform=`scaleX(${Math.max(0,q.remainingMs/10000)})`;$('mathOverlay').classList.add('show');
  }
  function renderLoot(){if(state.phase!=='loot'||!canAct()){$('lootOverlay').classList.remove('show');lootSeen=0;return;}if(lootSeen===state.turnId)return;lootSeen=state.turnId;$('lootSub').textContent=`${state.loot.length} items found!`;$('lootItems').replaceChildren();for(const item of state.loot){const el=document.createElement('div');el.className='loot-card';el.textContent=`${item.icon} ${item.name}`;$('lootItems').append(el);}let extra;
    const t=state.tanks[state.turn];if(state.loot.some(x=>x.id==='perk4')&&t.perks.length<4){$('lootSub').textContent+=' Choose your fourth perk:';for(const perk of catalog.perks.filter(x=>!t.perks.includes(x.id))){const b=document.createElement('button');b.className='perk-item';b.textContent=`${perk.icon} ${perk.name}`;b.onclick=()=>{extra=perk.id;$('lootItems').querySelectorAll('button').forEach(el=>el.classList.toggle('on',el===b));};$('lootItems').append(b);}}
    $('lootOk').textContent='Collect & end turn';$('lootOk').onclick=()=>send('collect',{perk:extra});$('lootOverlay').classList.add('show');
  }
  function render(){if(!active||!state)return;phaseSeen=state.phase;const t=state.tanks[state.turn],h=catalog.hulls.find(x=>x.id===t.hull),action=canAct()&&state.phase==='aim';
    if(turnSeen!==state.turnId){const previous=turnSeen;turnSeen=state.turnId;selectionWeapon='standard';$('angle').value=t.angle;$('power').value=t.power;cpuWait=0;if(previous&&mode==='hotseat'&&state.phase!=='finished'){awaitingHandoff=true;cover(`Pass to ${label(state.turn)}`,'Your opponent’s shot has finished. Take the phone when you are ready.','Ready — my turn',()=>{awaitingHandoff=false;lastTime=0;overlay.classList.remove('show');render();});}}
    $('duelScore').replaceChildren(...state.tanks.map((p,i)=>{const el=document.createElement('div');el.className='duel-player'+(i===state.turn?' current':'');el.textContent=`${label(i)} · ${catalog.hulls.find(h=>h.id===p.hull).name} · ${p.hp}/${p.maxHP} HP`;return el;}));
    $('duelTurn').textContent=`Turn ${state.turnId} · ${label(state.turn)} · ${state.phase==='shot'?'shot in flight':state.phase==='math'?'solving math':state.phase==='finished'?state.message:state.message}`;
    $('titleHull').textContent=`${label(state.turn)} · ${h.icon} ${h.name}`;$('hpLabel').textContent=t.hp;$('waveLabel').textContent=state.round;$('scoreLabel').textContent=t.score;$('ammoLabel').textContent=t.ammo;
    $('energyName').textContent=h.resName;$('energyFill').style.width=`${t.energy*10}%`;$('energyVal').textContent=`${t.energy}/10`;$('defHud').style.display=t.shield?'':'none';$('defLabel').textContent=t.shieldType+' ×'+t.shield;
    $('abilityBtn').textContent=t.freeSummon?'Summon (free)':h.resName+' (4)';$('abilityBtn').disabled=!action||t.energy<4&&!t.freeSummon;
    $('buyAmmoBtn').style.display=t.perks.includes('arsenal')?'':'none';$('buyAmmoBtn').textContent='Ammo (3)';$('buyAmmoBtn').disabled=!action||t.energy<3;
    for(const id of ['moveL','moveR']){$(id).style.display=t.perks.includes('mobility')?'':'none';$(id).disabled=!action||t.moves>=3;}
    $('cloakBtn').style.display=t.hull==='wraith'?'':'none';$('cloakBtn').disabled=!action||t.cloakUsed||t.energy<4;$('cloakBtn').textContent=t.cloakUsed?'Cloak used':'Cloak (4)';$('swapBtn').disabled=!action||t.swaps>=2;$('swapCost').textContent=t.swaps?' 70% shells':' free';
    $('windArrow').textContent=Math.abs(state.wind)<.006?'—':state.wind>0?'→':'←';$('windLabel').textContent=(Math.abs(state.wind)*125).toFixed(1);$('terrainChip').textContent=catalog.terrains[state.biome].name;
    $('fire').disabled=!action;$('fire').textContent=t.perks.includes('targeting')&&!t.solved?'SOLVE → FIRE':'FIRE';$('msg').textContent=state.message;
    ['angle','power','angleMinus','anglePlus','powerMinus','powerPlus'].forEach(id=>$(id).disabled=!action);
    $('duelPass').disabled=!action;status.querySelectorAll('[data-protocol]').forEach(b=>{const k=b.dataset.protocol,p=k==='armory'?'arsenal':k;b.hidden=!t.perks.includes(p);b.disabled=!action||t.mathUsed.includes(k)||k==='repair'&&(state.round<2||t.hp>=t.maxHP);});
    $('wbar').replaceChildren();$('wbar').style.display=t.perks.includes('arsenal')?'flex':'none';if(t.perks.includes('arsenal'))for(const wid of Core.WEAPONS){const w=catalog.weapons[wid],b=document.createElement('button');b.className='wb'+(selectionWeapon===wid?' sel':'');b.textContent=`${w.icon} ${w.name} ×${wid==='standard'?'∞':t.weapons[wid]}`;b.disabled=!action;b.onclick=()=>{selectionWeapon=wid;render();};$('wbar').append(b);}
    renderMath();renderLoot();
    if(state.phase==='finished'&&!finishSent){finishSent=true;cover(state.winner==='draw'?'Draw':`${label(state.winner)} wins!`,'The original StarMuff tanks fought on one shared battlefield.',mode==='online'?'Back to room':'New match',()=>exit(mode==='online'));if(mode==='online'&&network.isHost){publish();network.finish({winner:state.winner,reason:'tank-destroyed'});}}
  }
  function cpu(dt){if(mode!=='cpu'||state.turn!==1||state.phase!=='aim')return;cpuWait+=dt;if(cpuWait<1000)return;cpuWait=0;const t=state.tanks[1];if(t.energy>=4)Core.command(state,1,{action:'ability',turnId:state.turnId});const aim=Core.cpuAim(state,1);Core.command(state,1,{action:'fire',payload:aim,turnId:state.turnId});render();}
  function frame(now){if(!active||!state)return;const dt=lastTime?Math.min(100,now-lastTime):0;lastTime=now;
    if(authority()&&!paused&&!awaitingHandoff&&(mode!=='online'||presence)){accum+=dt;while(accum>=1000/60){Core.step(state,1000/60);accum-=1000/60;}cpu(dt);if(state.turnId!==turnSeen||state.phase!==phaseSeen||state.phase==='math')render();if(mode==='online'&&now-lastPublish>150)publish();}
    $('angleVal').textContent=$('angle').value+'°';$('powerVal').textContent=$('power').value+'%';
    for(const effect of state.fx){if(effect.id>lastFx){original.explode(effect);lastFx=effect.id;}}
    const t=state.tanks[state.turn],preview=canAct()&&t.preview?Core.preview(state,state.turn,Number($('angle').value),Number($('power').value),selectionWeapon):[];
    original.draw(state,{angle:Number($('angle').value),power:Number($('power').value),preview});
  }
  document.addEventListener('visibilitychange',()=>{if(active&&document.hidden&&mode!=='online')pause();lastTime=0;});
  const api={get active(){return active;},get state(){return state;},get mode(){return mode;},frame,resize:()=>{if(active)original.resize(Core.W,Core.H);}};
  // Read-only runtime inspection is useful for deterministic browser regression tests.
  window.artilleryDuel=api;return api;
};
