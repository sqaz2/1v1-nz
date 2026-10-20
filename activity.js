(()=>{'use strict';
const names={bomberman:'Bomb Man','connect-4':'Connect 4',battleship:'Battleship',tetris:'Tetris',simon:'Simon',pinball:'Pinball',skirmish:'Skirmish','odyssey-tanks':'Tanks',minigolf:'Mini Golf',smackzone:'Smackzone','dots-and-boxes':'Dots & Boxes','pictures-party':'Pictures Party'};
const game=location.pathname.split('/')[1],production=['1v1.nz','www.1v1.nz'].includes(location.hostname),api='/api/starmuff/activity';
const id=crypto.randomUUID();let pending=false,first=true;
const style=document.createElement('style');style.textContent=`#activityStrip{position:fixed;top:0;left:0;right:0;z-index:500;height:32px;display:flex;align-items:center;gap:8px;padding:0 12px;background:#08121ff5;border-bottom:1px solid #29445a;color:#b6cbdc;font:600 11px/1.2 system-ui;overflow-x:auto;white-space:nowrap;box-sizing:border-box}#activityStrip a{color:#d8e8f4;text-decoration:none;padding:5px 9px;border-radius:20px;background:#182b3b}#activityStrip a.active{color:#9cffbd;background:#17392b}#activityStrip .activity-label{color:#73e8ae}body.has-activity{padding-top:32px!important}body.has-activity #bombOverlay{top:0}#activityStrip button{background:transparent;color:inherit;border:0;font:inherit;cursor:pointer}`;document.head.append(style);
const bar=document.createElement('nav');bar.id='activityStrip';bar.setAttribute('aria-label','People on 1v1.nz');document.body.prepend(bar);document.body.classList.add('has-activity');
function label(text){const s=document.createElement('span');s.className='activity-label';s.textContent=text;bar.append(s);}
function state(){try{return window.getGameActivity?.()||{state:'browsing',joinable:false}}catch{return {state:'browsing',joinable:false}}}
async function update(){if(pending||document.hidden)return;pending=true;try{
 if(!production){bar.textContent='Preview · live activity is shown on 1v1.nz';return;}
 if(names[game])await fetch(api+'/'+game,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id,...state()}),signal:AbortSignal.timeout(6000)});
 const r=await fetch(api,{cache:'no-store',signal:AbortSignal.timeout(6000)});if(!r.ok)throw Error('unavailable');const data=await r.json();bar.replaceChildren();label('● PEOPLE NOW');
 const sorted=data.games.sort((a,b)=>(b.looking+b.joinable)-(a.looking+a.joinable)||b.here-a.here);
 for(const g of sorted){const a=document.createElement('a');a.href='/'+g.id+'/'+(g.id==='connect-4'?'?online=1':'');a.className=g.here?'active':'';const activity=g.looking?`${g.looking} looking for a match`:g.joinable?`${g.here} here · join live`:g.playing?`${g.playing} playing`:g.here?`${g.here} here`:'0 here';a.textContent=`${names[g.id]} · ${activity}`;a.title='Active visitors in the last 45 seconds. Bots are excluded.';bar.append(a);}
 }catch{bar.replaceChildren();label('Live activity unavailable');const retry=document.createElement('button');retry.textContent='Retry';retry.onclick=update;bar.append(retry);}finally{pending=false;first=false;}}
function leave(){if(production&&names[game])navigator.sendBeacon?.(api+'/'+game,new Blob([JSON.stringify({id,leave:true})],{type:'application/json'}));}
addEventListener('pagehide',leave);document.addEventListener('visibilitychange',()=>document.hidden?leave():update());setInterval(update,15000);update();
})();
