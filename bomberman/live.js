(()=>{
'use strict';
const API='/api/starmuff';
const SEAT_KEY='bombman:public-seat:v1';
let ws=null,token='',slot=null,matchId=null,nextSeq=1,appliedThrough=0,players=[],retry=null,heartbeat=null,publishTimer=null,joining=false,stopped=false;
let heldTimer=null,heldAction=null,heldFromButton=false,localSolo=false;
// The live arena is one shared room on the production Worker. Only production (and local dev) joins
// it automatically; preview deployments stay solo unless opened with ?live=1, so a preview build can
// never fight production players for the host seat or have its local game overwritten.
const LIVE_HOSTS=['1v1.nz','www.1v1.nz','localhost','127.0.0.1'];
const liveParam=new URLSearchParams(location.search).get('live');
const liveEnabled=liveParam==='1'||(liveParam!=='0'&&LIVE_HOSTS.includes(location.hostname));
const bm=()=>window.BombManLegacy;

const style=document.createElement('style');
style.textContent=`
#bmLiveStatus{display:inline-flex;align-items:center;gap:7px;margin-left:auto;margin-right:8px;padding:9px 12px;border:1px solid #64e89c55;border-radius:999px;background:#071b15dc;color:#9affc1;font:900 11px/1 system-ui,sans-serif;letter-spacing:.06em;white-space:nowrap}
#bmLiveStatus i{width:8px;height:8px;border-radius:50%;background:#55ed8e;box-shadow:0 0 12px #55ed8e}
#bmLiveStatus.solo{cursor:pointer;border-color:#8fb4ff55;background:#0b1424;color:#cfe0ff}#bmLiveStatus.solo i{background:#8fb4ff;box-shadow:none}
#bmLiveStatus.full{border-color:#ffcf5766;background:#271d0b;color:#ffe19a}#bmLiveStatus.full i{background:#ffbd3e;box-shadow:0 0 12px #ffbd3e}
body.bm-live-guest #bmMenu{pointer-events:none}body.bm-live-guest #bmMenu:after{content:'JOINED LIVE ARENA · WAITING FOR HOST GAME';position:absolute;inset:auto 50% 30px auto;transform:translateX(50%);padding:12px 16px;border-radius:14px;background:#07131ee8;border:1px solid #55ed8e55;color:#baffd0;font:900 12px/1.25 system-ui,sans-serif;white-space:nowrap}
body.bm-live-waiting #bmMenu{pointer-events:none;filter:saturate(.65) brightness(.7)}
@media(max-width:720px){#bmLiveStatus{font-size:9px;padding:7px 9px;margin-right:4px}body.bm-live-guest #bmMenu:after{font-size:10px;white-space:normal;text-align:center;width:min(86vw,420px)}}
`;
document.head.appendChild(style);

function statusNode(){
  let el=document.getElementById('bmLiveStatus');
  if(el)return el;
  const top=document.getElementById('bmTopbar'); if(!top)return null;
  el=document.createElement('div');el.id='bmLiveStatus';el.innerHTML='<i></i><span class="full">LIVE · CONNECTING</span><span class="short">LIVE…</span>';
  const back=document.getElementById('bombBackBtn');top.insertBefore(el,back||null);return el;
}
// Narrow portrait phones show a short form of the status (CSS swaps .full/.short) so the pill never clips.
function shortStatus(t){const m=t.match(/HOST · (\d\/4)/)||t.match(/· (P\d) · (\d\/4)/);if(m)return m[2]?`${m[1]} ${m[2]}`:`HOST ${m[1]}`;
  if(/REJOIN/.test(t))return 'REJOIN';if(/TAP TO JOIN/.test(t))return 'SOLO';if(/PREVIEW/.test(t))return 'SOLO';if(/FULL/.test(t))return 'FULL';if(/OFFLINE/.test(t))return 'OFFLINE';if(/RECONNECT/.test(t))return 'RECONNECT';if(/FINISHED/.test(t))return 'DONE';if(/CONNECTING/.test(t))return 'LIVE…';return t.split(' · ')[0]}
function setStatus(text,full=false,solo=false){const el=statusNode();if(!el)return;el.classList.toggle('full',full);el.classList.toggle('solo',solo);const fs=el.querySelector('span');fs.textContent=text;let sh=el.querySelector('.short');if(!sh&&el.appendChild){sh=document.createElement('span');sh.className='short';el.appendChild(sh);}if(sh&&sh!==fs)sh.textContent=shortStatus(text);el.title=text;}
function stored(){try{return JSON.parse(sessionStorage.getItem(SEAT_KEY)||'null')}catch{return null}}
function remember(){try{sessionStorage.setItem(SEAT_KEY,JSON.stringify({token,slot}))}catch{}}
function forget(){try{sessionStorage.removeItem(SEAT_KEY)}catch{} token='';slot=null;}
function screen(){return bm()?.getState?.().screen}
// Drop to local solo play: no socket, no replica mode, nothing remote can touch the local game.
function goSolo(text){
  localSolo=true;clearTimeout(retry);stopHeld();clearInterval(heartbeat);clearInterval(publishTimer);
  if(ws){const old=ws;ws=null;try{old.close()}catch{}}
  forget();players=[];document.body.classList.remove('bm-live-guest','bm-live-waiting');
  bm()?.setReplica(false);bm()?.setLocalSlot(0);bm()?.setHumanSlots([]);setStatus(text,false,true);
}
function scheduleJoin(ms){clearTimeout(retry);if(localSolo||stopped)return;retry=setTimeout(join,ms)}
function countHumans(){return (players||[]).filter(p=>p?.connected).length}
function humanSlots(){return (players||[]).filter(p=>p?.slot>0&&p.connected).map(p=>p.slot)}
function refreshRole(){
  const total=countHumans();
  document.body.classList.toggle('bm-live-guest',slot>0);
  document.body.classList.remove('bm-live-waiting');
  bm()?.setLocalSlot(slot??0);bm()?.setReplica(slot>0);
  if(slot===0)setStatus(`LIVE · HOST · ${total}/4`);
  else if(slot>0)setStatus(`LIVE · P${slot+1} · ${total}/4`);
  else setStatus('LIVE · CONNECTING');
}
function wsURL(code){const u=new URL(`${API}/rooms/${code}/ws`,location.href);u.protocol=u.protocol==='https:'?'wss:':'ws:';return u.href}
async function requestJoin(useStored=true){
  const saved=useStored?stored():null;
  const response=await fetch(`${API}/bomberman-live/join`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({token:saved?.token||undefined}),cache:'no-store'});
  let data={};try{data=await response.json()}catch{}
  if(!response.ok){const err=new Error(data.message||'Live arena unavailable');err.code=data.error;err.status=response.status;throw err}
  return data;
}
async function join(){
  if(joining||stopped||localSolo)return;joining=true;clearTimeout(retry);setStatus('LIVE · CONNECTING');
  try{
    let data;
    try{data=await requestJoin(true)}catch(e){if(e.status===401||e.code==='unauthorized'){forget();data=await requestJoin(false)}else throw e}
    if(localSolo)return;token=data.token;slot=data.slot;remember();connect(data.code||'BOMBLIVE');
  }catch(e){
    if(e.status===409||e.code==='full'){
      slot=null;bm()?.setReplica(false);if(localSolo)return;setStatus('LIVE FULL · RETRYING',true);scheduleJoin(1800);
    }else{slot=null;bm()?.setReplica(false);if(localSolo)return;setStatus('LIVE OFFLINE · RETRYING',true);scheduleJoin(2500)}
  }finally{joining=false}
}
function connect(code){
  if(ws)try{ws.close()}catch{}
  clearInterval(heartbeat);const current=new WebSocket(wsURL(code),['starmuff-v1','auth.'+token]);ws=current;
  current.addEventListener('open',()=>{heartbeat=setInterval(()=>{if(current.readyState===1)current.send('ping')},20000)});
  current.addEventListener('message',e=>{if(current!==ws)return;incoming(e.data)});
  current.addEventListener('close',()=>{if(current!==ws||stopped)return;lostConnection()});
}
// Socket lost or the server told us to rejoin. Mid-game we keep playing solo rather than freeze as a
// replica or get overwritten by whoever hosts next; from the menu we quietly rejoin.
function lostConnection(){
  clearInterval(heartbeat);clearInterval(publishTimer);stopHeld();if(ws){const old=ws;ws=null;try{old.close()}catch{}}
  forget();bm()?.setReplica(false);document.body.classList.remove('bm-live-guest','bm-live-waiting');
  if(screen()==='game'){goSolo('LIVE LOST · SOLO · TAP TO REJOIN');return}
  setStatus('LIVE · RECONNECTING',true);scheduleJoin(850);
}
function stateMessage(m){players=m.players||players;matchId=m.matchId||matchId;if(Number.isSafeInteger(m.nextSeq))nextSeq=m.nextSeq;refreshRole();if(slot===0)bm()?.setHumanSlots(humanSlots())}
function incoming(raw){
  if(raw==='pong')return;let m;try{m=JSON.parse(raw)}catch{return}
  if(m.kind==='welcome'){
    if(localSolo)return;slot=m.slot;nextSeq=m.nextSeq||1;matchId=m.matchId;appliedThrough=m.snapshotSeq||0;players=m.players||[];remember();refreshRole();
    if(slot>0&&m.snapshot)bm()?.applySnapshot(m.snapshot);
    if(slot===0)bm()?.setHumanSlots(humanSlots());
    startPublishing();return;
  }
  if(m.kind==='presence'){stateMessage(m);return}
  if(m.kind==='closed'){
    lostConnection();return;
  }
  if(m.kind==='error'){
    if(['connection','unauthorized','closed','expired','not-found'].includes(m.code))lostConnection();
    return;
  }
  if(m.kind==='ack')return;
  if(m.matchId&&matchId&&m.matchId!==matchId)return;
  if(m.kind==='event'){
    if(slot===0&&m.slot>0&&m.type==='action'){appliedThrough=Math.max(appliedThrough,m.serverSeq||0);bm()?.remoteAction(m.slot,m.data?.action)}
    return;
  }
  if(m.kind==='snapshot'&&slot>0&&m.slot===0&&!localSolo){bm()?.applySnapshot(m.snapshot);return}
  if(m.kind==='finish'&&m.result){setStatus('LIVE · MATCH FINISHED',true)}
}
function send(kind,payload={}){
  if(!ws||ws.readyState!==1||!matchId)return false;
  const m={kind,seq:nextSeq++,matchId,...payload};try{ws.send(JSON.stringify(m));return true}catch{nextSeq--;return false}
}
function sendAction(action){if(slot>0)send('event',{type:'action',data:{action}})}
function startPublishing(){
  clearInterval(publishTimer);publishTimer=setInterval(()=>{
    if(slot!==0||!ws||ws.readyState!==1)return;
    const api=bm();if(!api)return;api.setHumanSlots(humanSlots());const snapshot=api.snapshot();
    if(snapshot?.game)send('snapshot',{snapshot,appliedThrough});
  },100);
}
function startHeld(action){stopHeld();heldAction=action;sendAction(action);heldTimer=setInterval(()=>sendAction(action),135)}
// Releasing a held direction tells the host to stop gliding right away (it also stops by itself ~0.3 s after the last refresh).
function stopHeld(){const was=heldAction;clearInterval(heldTimer);heldTimer=null;heldAction=null;if(slot>0&&['up','down','left','right'].includes(was))sendAction('stop')}

document.addEventListener('pointerdown',e=>{
  if(!(slot>0))return;const target=e.target.closest('#bmTouch button');if(!target)return;
  let action=target.dataset.dir||null;if(target.id==='bmBombBtn')action='bomb';if(target.id==='bmActBtn')action='act';if(target.id==='bmDetBtn')action='det';if(target.id==='bmMenuBtn')return;
  if(!action)return;e.preventDefault();e.stopImmediatePropagation();if(['up','down','left','right'].includes(action)){heldFromButton=true;startHeld(action)}else sendAction(action);
},true);
// A guest tapping MENU leaves the live arena so the menu stays open and is fully usable.
document.addEventListener('click',e=>{if(slot>0&&e.target.closest('#bmMenuBtn'))goSolo('SOLO · TAP TO JOIN LIVE')},true);
// Starting a game while not seated (offline, full, preview) is a solo game: stop trying to join mid-match.
document.addEventListener('click',e=>{if(typeof slot!=='number'&&e.target.closest('#bmPlayBtn'))goSolo(liveEnabled?'SOLO · TAP TO JOIN LIVE':'SOLO · PREVIEW')},true);
document.addEventListener('click',e=>{const pill=e.target.closest('#bmLiveStatus');if(!pill||!localSolo||!liveEnabled)return;e.preventDefault();localSolo=false;bm()?.open();join()});
// Only legacy direction buttons stop on any pointer release; the joystick reports its own release
// via bm:stick, so lifting the BOMB finger never cancels movement (multitouch).
['pointerup','pointercancel'].forEach(type=>document.addEventListener(type,()=>{if(slot>0&&heldFromButton){heldFromButton=false;stopHeld()}},true));
addEventListener('bm:stick',e=>{if(!(slot>0))return;const d=e.detail&&e.detail.dir;if(d){if(heldAction!==d)startHeld(d)}else if(['up','down','left','right'].includes(heldAction))stopHeld()});
document.addEventListener('keydown',e=>{
  if(!(slot>0))return;let a=null;const k=e.key.toLowerCase();if(k==='arrowup'||k==='w')a='up';if(k==='arrowdown'||k==='s')a='down';if(k==='arrowleft'||k==='a')a='left';if(k==='arrowright'||k==='d')a='right';if(k===' ')a='bomb';if(k==='j')a='act';if(k==='k')a='det';if(!a)return;e.preventDefault();e.stopImmediatePropagation();if(['up','down','left','right'].includes(a)){if(!e.repeat)startHeld(a)}else if(!e.repeat)sendAction(a);
},true);
document.addEventListener('keyup',e=>{if(slot>0){const k=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d'].includes(k))stopHeld();e.stopPropagation()}},true);

addEventListener('pagehide',()=>{stopped=true;clearTimeout(retry);clearInterval(heartbeat);clearInterval(publishTimer);try{ws?.close()}catch{}});
setTimeout(()=>{try{bm()?.open()}catch{}statusNode();if(liveEnabled)join();else goSolo('SOLO · PREVIEW')},80);
})();