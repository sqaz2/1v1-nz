/* Timed blast planning. No access to hidden pickups or future player input. */
(function(root){
const dirs=[['left',-1,0],['right',1,0],['up',0,-1],['down',0,1]];
const profiles={easy:{speed:2.1,delay:.32,hunt:1},normal:{speed:2.5,delay:.13,hunt:2},hard:{speed:3,delay:.04,hunt:4}};
function blast(g,b){const cells=[[b.x,b.z]];for(const[,dx,dz]of dirs)for(let n=1;n<=b.range;n++){const x=b.x+dx*n,z=b.z+dz*n,c=g.cells[z]?.[x];if(!c||c.solid==='hard')break;cells.push([x,z]);if(c.solid==='crate'||c.special==='water')break;}return cells;}
function danger(g,extra){const bombs=g.bombs.filter(b=>!b.dead).concat(extra?[extra]:[]),times=bombs.map(b=>b.remote?0:Math.max(0,b.timer)),rays=bombs.map(b=>blast(g,b)),map=new Map();
 for(let pass=0;pass<bombs.length;pass++)for(let i=0;i<bombs.length;i++)for(let j=0;j<bombs.length;j++)if(times[i]<times[j]&&rays[i].some(([x,z])=>x===bombs[j].x&&z===bombs[j].z))times[j]=times[i];
 const add=(x,z,start,end)=>{const k=x+','+z;if(!map.has(k))map.set(k,[]);map.get(k).push([start,end]);};
 rays.forEach((r,i)=>r.forEach(([x,z])=>add(x,z,times[i],bombs[i].remote?4:times[i]+.65)));
 for(const e of g.explosions)add(e.x,e.z,0,e.t+.18);return map;
}
function unsafe(map,x,z,t,margin=.16){return (map.get(x+','+z)||[]).some(([a,b])=>t+margin>=a&&t-margin<=b);}
function route(g,e,map,speed,escapeOnly=false,extra=null){const step=1/speed,queue=[{x:e.x,z:e.z,t:0,first:null}],seen=new Set([e.x+','+e.z]),nodes=[];
 for(let at=0;at<queue.length;at++){const n=queue[at];nodes.push(n);if(n.t>3.5)continue;
 for(const[d,dx,dz]of dirs){const x=n.x+dx,z=n.z+dz,c=g.cells[z]?.[x],t=n.t+step,k=x+','+z;
 if(!c||c.solid||c.special==='lava'||seen.has(k)||g.bombs.some(b=>!b.dead&&b.x===x&&b.z===z)||(extra&&extra.x===x&&extra.z===z))continue;
 if([g.player,...g.enemies].some(o=>o!==e&&o.alive&&o.x===x&&o.z===z))continue;
 // Movement enters the destination halfway through a tile; check the entire crossing.
 if(unsafe(map,n.x,n.z,n.t+step*.45)||unsafe(map,x,z,n.t+step*.5)||unsafe(map,x,z,t)||unsafe(map,x,z,t+.15))continue;
 seen.add(k);queue.push({x,z,t,first:n.first||d});}}
 if(escapeOnly)return nodes.find(n=>n.first&&!unsafe(map,n.x,n.z,n.t)&&!(map.get(n.x+','+n.z)||[]).some(([a,b])=>b>n.t&&a<3.5));return nodes;
}
function plan(g,e,difficulty='normal'){const profile=profiles[difficulty]||profiles.normal,map=danger(g),nodes=route(g,e,map,profile.speed),here=map.get(e.x+','+e.z),dangerous=here?.some(([a,b])=>b>0&&a<1.5);
 if(dangerous){const safe=route(g,e,map,profile.speed,true);if(safe)return {dir:safe.first,drop:false,...profile};}
 const hypothetical={x:e.x,z:e.z,range:e.fire||2,timer:2.6,remote:false};const rays=blast(g,hypothetical),useful=rays.some(([x,z])=>g.cells[z][x].solid==='crate'||[g.player,...g.enemies].some(o=>o!==e&&o.alive&&o.x===x&&o.z===z));
 const own=g.bombs.filter(b=>!b.dead&&b.owner===e.botId).length;
 if(!dangerous&&e.bombCd<=0&&own<(e.bombsMax||1)&&!g.bombs.some(b=>!b.dead&&b.x===e.x&&b.z===e.z)&&useful){const safe=route(g,e,danger(g,hypothetical),profile.speed,true,hypothetical);if(safe)return {dir:safe.first,drop:true,...profile};}
 let best=null,bestScore=-Infinity;for(const n of nodes){if(!n.first||unsafe(map,n.x,n.z,n.t+.5))continue;const c=g.cells[n.z][n.x],crates=dirs.filter(([,dx,dz])=>g.cells[n.z+dz]?.[n.x+dx]?.solid==='crate').length;
 const rivals=[g.player,...g.enemies].filter(o=>o!==e&&o.alive),dist=Math.min(20,...rivals.map(o=>Math.abs(o.x-n.x)+Math.abs(o.z-n.z)));
 const score=(c.pickup?30:0)+crates*5-dist*profile.hunt-n.t*2-(map.has(n.x+','+n.z)?15:0);if(score>bestScore){bestScore=score;best=n;}}
 return {dir:best?.first||null,drop:false,...profile};
}
root.BombManAI={plan,danger,blast,route,unsafe,profiles};
})(typeof window==='undefined'?globalThis:window);
