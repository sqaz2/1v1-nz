/* Hosting boundary only: original Odyssey gameplay is unchanged. Never send
 * scores from 1v1.nz to the unrelated StarMuff leaderboard. */
(function(){
  'use strict';
  const key='1v1:odyssey-tanks:solo-scores:v1';
  const read=()=>{try{const value=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(value)?value.filter(row=>typeof row.name==='string'&&Number.isFinite(row.score)).slice(0,20):[];}catch{return[];}};
  let transient=[];
  loadLeaderboard=function(){
    const rows=read().concat(transient).sort((a,b)=>b.score-a.score).slice(0,8),list=$('lb-entries');list.textContent='';
    $('leaderboard-panel').querySelector('h3').textContent='This device · solo scores';
    if(!rows.length){const item=document.createElement('div');item.className='entry';item.textContent='No local scores yet';list.appendChild(item);}
    rows.forEach((row,i)=>{const item=document.createElement('div');item.className='entry';const name=document.createElement('span'),value=document.createElement('span');name.className='name';value.className='score';name.textContent=(i+1)+'. '+row.name;value.textContent=row.score.toLocaleString();item.append(name,value);list.appendChild(item);});
  };
  submitScore=function(){
    const row={name:($('go-name').value||'ANON').trim().toUpperCase().slice(0,16)||'ANON',score:Math.max(0,score),wave,date:new Date().toISOString()};
    const rows=read().concat(row).sort((a,b)=>b.score-a.score).slice(0,20);
    try{localStorage.setItem(key,JSON.stringify(rows));}catch{transient.push(row);}
    loadLeaderboard();state='menu';$('game-over').style.display='none';$('energy-hud').style.display='none';$('menu-screen').style.display='flex';setMenuStep(1);
  };
  $('btn-submit').onclick=submitScore;$('btn-submit').textContent='SAVE LOCALLY & RETRY';
  const nav=document.createElement('nav');nav.style.cssText='position:fixed;top:0;left:0;right:0;z-index:50;background:#100720;padding:10px;font:12px monospace;color:#ffc080;display:flex;gap:16px';
  nav.innerHTML='<a href="/" style="color:inherit">← 1v1</a><a href="./" style="color:inherit">Online duel</a><span>Original solo · device scores</span>';
  document.body.appendChild(nav);$('hud').style.top='40px';$('energy-hud').style.top='105px';$('menu-screen').style.paddingTop='65px';
  loadLeaderboard();
})();
