export const ACTIVITY_GAMES={bomberman:'Bomb Man','connect-4':'Connect 4',battleship:'Battleship',tetris:'Tetris',simon:'Simon',pinball:'Pinball',skirmish:'Skirmish','odyssey-tanks':'Tanks',minigolf:'Mini Golf',smackzone:'Smackzone','dots-and-boxes':'Dots & Boxes','pictures-party':'Pictures Party'};
export const ACTIVITY_TTL=45000;
export function summarizeActivity(entries,now=Date.now()){
 const current=entries.filter(e=>e&&now-e.at<ACTIVITY_TTL);
 return {here:current.length,playing:current.filter(e=>e.state==='playing').length,looking:current.filter(e=>e.state==='looking').length,joinable:current.filter(e=>e.joinable).length};
}
export async function handleActivityRoom(ctx,request){
 const now=Date.now();if(request.method==='POST'){
  const raw=await request.text();if(raw.length>512)return Response.json({error:'size'},{status:413});let data;try{data=JSON.parse(raw)}catch{return Response.json({error:'json'},{status:400})}
  if(!/^[a-zA-Z0-9-]{16,64}$/.test(data.id||''))return Response.json({error:'id'},{status:400});
  const key='visitor:'+data.id;
  if(data.leave)await ctx.storage.delete(key);
  else {const old=await ctx.storage.get(key);if(!old||now-old.at>=5000){const count=(await ctx.storage.list({prefix:'visitor:',limit:1000})).size;if(!old&&count>=1000)return Response.json({error:'busy'},{status:429});await ctx.storage.put(key,{at:now,state:['playing','looking'].includes(data.state)?data.state:'browsing',joinable:data.joinable===true});}}
  if(!await ctx.storage.getAlarm())await ctx.storage.setAlarm(now+ACTIVITY_TTL);
 }
 const entries=await ctx.storage.list({prefix:'visitor:'});return Response.json(summarizeActivity([...entries.values()],now),{headers:{'cache-control':'no-store'}});
}
