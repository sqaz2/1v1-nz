/* StarMuff Artillery Defense duel adapter. The terrain generator, gravity,
 * projectile integrator, blast/crater and weapon values are ported from the
 * pinned original tanks.html, not the retired Skirmish replacement. */
(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;else root.ArtilleryDuelCore=api;})(typeof globalThis!=='undefined'?globalThis:this,()=>{
  'use strict';
  const W=720,H=346,GRAVITY=.25,TANK_W=24,TANK_H=12;
  const WEAPONS=['standard','cluster','mega','freeze','piercer','sandspray'];
  const PERKS=['targeting','defense','arsenal','crates','repair','mobility','ghost','accuracy'];
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const clone=o=>JSON.parse(JSON.stringify(o));
  function seedOf(seed){let n=2166136261;for(const c of String(seed))n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0||1;}
  function random(s){let n=s.rng;n^=n<<13;n^=n>>>17;n^=n<<5;s.rng=n>>>0;return (n>>>0)/4294967296;}
  const rand=(s,a,b)=>a+random(s)*(b-a);
  const has=(t,p)=>t.perks.includes(p);
  function validLoadout(v,hulls){return !!v&&hulls.some(h=>h.id===v.hull)&&Array.isArray(v.perks)&&v.perks.length===3&&new Set(v.perks).size===3&&v.perks.every(p=>PERKS.includes(p));}
  function seat(s){for(const t of s.tanks){t.y=s.terrain[clamp(Math.floor(t.x),0,W-1)]-TANK_H;for(const g of t.ghosts||[])g.y=s.terrain[clamp(Math.floor(g.x),0,W-1)]-14;}}
  function create(seed,loadouts,catalog){
    if(!Array.isArray(loadouts)||loadouts.length!==2||!loadouts.every(l=>validLoadout(l,catalog.hulls)))throw Error('Two valid three-perk loadouts required');
    const s={version:1,seed:String(seed),rng:seedOf(seed),width:W,height:H,terrain:[],biome:0,tanks:[],turn:0,turnId:1,round:1,phase:'aim',projectiles:[],wind:0,winner:null,challenge:null,message:'Player 1: aim and fire',fx:[],fxId:0,trail:[],lastTrail:[],lastImpact:null,shots:0,paused:false};
    s.biome=Math.floor(random(s)*catalog.terrains.length);const T=catalog.terrains[s.biome];
    const f1=rand(s,...T.f1),a1=rand(s,H*T.a1[0],H*T.a1[1]),p1=rand(s,0,6.28),f2=rand(s,...T.f2),a2=rand(s,H*T.a2[0],H*T.a2[1]),p2=rand(s,0,6.28),f3=rand(s,...T.f3),a3=rand(s,H*T.a3[0],H*T.a3[1]),p3=rand(s,0,6.28);
    for(let x=0;x<W;x++)s.terrain[x]=clamp(H*.68-Math.sin(x*f1+p1)*a1-Math.sin(x*f2+p2)*a2-Math.sin(x*f3+p3)*a3,H*.28,H-18);
    s.tanks=loadouts.map((l,i)=>{const h=catalog.hulls.find(h=>h.id===l.hull);return{slot:i,hull:h.id,hp:h.hp,maxHP:h.hp,dmgBonus:h.dmgBonus,moveMult:h.moveMult,perks:l.perks.slice(),x:W*(i?.82:.18),y:0,angle:45,power:65,energy:0,ammo:10+(h.ammoBonus||0),weapons:{standard:-1,cluster:has(l,'arsenal')?2:0,mega:has(l,'arsenal')?1:0,freeze:has(l,'arsenal')?1:0,piercer:has(l,'arsenal')?2:0,sandspray:has(l,'arsenal')?2:0},weapon:'standard',moves:0,fortify:0,cloak:0,cloakUsed:false,fury:false,quick:false,bonusShot:false,freeze:0,ghosts:[],freeSummon:h.id==='necromancer',solved:false,preview:false,shield:0,shieldType:'block',repairUsed:false,mathUsed:[],score:0,swaps:0,accuracyHits:0};});
    seat(s);s.wind=rand(s,-.08,.08);return s;
  }
  function crater(s,cx,r,mound=false){for(let x=Math.max(0,Math.floor(cx-r));x<=Math.min(W-1,Math.ceil(cx+r));x++){const v=r*r-(x-cx)**2;if(v>0)s.terrain[x]=mound?Math.max(H*.2,s.terrain[x]-Math.sqrt(v)*.6):Math.min(H+10,s.terrain[x]+Math.sqrt(v));}seat(s);}
  function fx(s,x,y,color){s.fx.push({id:++s.fxId,x,y,color});if(s.fx.length>20)s.fx.shift();}
  function finish(s){const dead=s.tanks.map(t=>t.hp<=0);if(dead.some(Boolean)){s.winner=dead.every(Boolean)?'draw':dead[0]?1:0;s.phase='finished';s.challenge=null;s.projectiles=[];s.message=s.winner==='draw'?'Draw — both tanks destroyed':`Player ${s.winner+1} wins!`;return true;}return false;}
  function hurt(s,slot,damage,source,freeze=false){const t=s.tanks[slot];if(t.hp<=0)return;if(t.cloak>0){s.message='Cloak absorbed the hit';return;}if(t.fortify>0){t.fortify--;s.message='Fortify absorbed the hit';return;}if(t.shield>0){t.shield--;if(t.shieldType==='reflect'){s.tanks[source].hp=Math.max(0,s.tanks[source].hp-1);return;}if(t.shieldType==='dr')damage=Math.floor(damage/2);else return;}t.hp=Math.max(0,t.hp-damage);if(freeze)t.freeze=1;fx(s,t.x,t.y,slot?'#f87171':'#4ade80');}
  function impact(s,p,x,y,hit){
    const t=s.tanks[p.owner],sand=p.wid==='sandspray',mega=p.wid==='mega',cluster=p.wid==='cluster';
    const br=p.child?12:sand?20:mega?44:20,sr=p.child?28:sand?48:mega?68:40;
    const damage=p.child?1:sand?.5:Math.max(1,Math.round((1+t.dmgBonus)*(mega?2:1)*(p.mult||1)));
    // Check splash against pre-crater coordinates, so terrain deformation cannot
    // make a tank teleport out of a blast that has already reached it.
    const affected=s.tanks.map((o,i)=>i===hit||Math.hypot(x-o.x,y-(o.y+TANK_H/2))<sr);
    const supportHits=s.tanks.flatMap(o=>o.ghosts.filter(g=>Math.hypot(x-g.x,y-(g.y+7))<sr).map(g=>({o,g})));
    crater(s,x,br,sand);fx(s,x,y,sand?'#d4a574':mega?'#a855f7':p.child?'#f87171':'#fde047');
    affected.forEach((yes,i)=>{if(yes){hurt(s,i,i===p.owner&&!sand?1:damage,p.owner,p.wid==='freeze');if(i!==p.owner){t.energy=clamp(t.energy+1,0,10);t.accuracyHits++;t.score+=has(t,'accuracy')?150:100;}}});
    for(const {o,g} of supportHits){g.hp-=damage;if(g.hp<=0){o.ghosts=o.ghosts.filter(other=>other!==g);fx(s,g.x,g.y,'#4ade80');}}
    s.lastImpact={x,y};s.message=affected[1-p.owner]?'Direct hit!':'Impact';
    if(cluster&&!p.child)for(let i=0;i<3;i++){const a=rand(s,-Math.PI*.7,-Math.PI*.2),speed=rand(s,3,5.5);s.projectiles.push({x,y:y-4,vx:Math.cos(a+(i-1)*.5)*speed*(random(s)<.5?1:-1),vy:-Math.abs(Math.sin(a)*speed)-rand(s,1,2.5),wid:'standard',owner:p.owner,child:true,age:0});}
  }
  function launch(s,slot,angle,power,weapon){const t=s.tanks[slot],a=angle*Math.PI/180,speed=power/100*13,dir=slot===0?1:-1;t.angle=angle;t.power=power;t.weapon=weapon;t.ammo--;if(weapon!=='standard')t.weapons[weapon]--;s.shots++;s.phase='shot';s.trail=[];s.projectiles=[{x:t.x,y:t.y-2,vx:Math.cos(a)*speed*dir,vy:-Math.sin(a)*speed,wid:weapon,mult:t.fury?3:1,owner:slot,age:0}];t.fury=false;s.message=`Player ${slot+1} fires`;
  }
  function nextTurn(s){if(finish(s))return;const old=s.tanks[s.turn];for(const g of old.ghosts){if(g.justSummoned)g.justSummoned=false;else g.turns--;}old.ghosts=old.ghosts.filter(g=>g.turns>0);s.supportFired=false;
    if(old.quick&&!old.bonusShot&&old.ammo>0){old.quick=false;old.bonusShot=true;s.message='Quick Draw: bonus shot';}else{old.bonusShot=false;s.turn=1-s.turn;s.message=`Player ${s.turn+1}: aim and fire`;}
    s.turnId++;s.round=Math.floor((s.turnId+1)/2);const t=s.tanks[s.turn];t.moves=0;t.solved=false;t.preview=false;t.mathUsed=[];t.repairUsed=false;t.energy=clamp(t.energy+1,0,10);t.cloak=Math.max(0,t.cloak-1);if(t.ammo<=0){t.ammo=5;s.message+=' — emergency shells loaded';}s.wind=rand(s,-.08,.08);s.phase='aim';s.challenge=null;
    if(t.freeze){t.freeze=0;t.moves=3;s.message+=' — frozen: movement unavailable';}
    // Original corvette Quick Draw, bounded to one extra shot per normal turn.
    if(t.hull==='corvette'&&!t.bonusShot&&random(s)<.4)t.quick=true;
  }
  function solveMath(q){const p=q.problem;return p.op==='mul'?p.a*p.b:p.op==='sub'?p.a-p.b:p.op==='div'?p.a/p.b:p.a+p.b;}
  function makeMath(s,kind){
    const int=(a,b)=>Math.floor(rand(s,a,b+1)),r=random(s),wave=s.round;
    const faction=wave<=2?r<.55?'addsub':r<.85?'mult':'frac':wave<=5?r<.45?'addsub':r<.75?'mult':r<.9?'frac':'alg':r<.35?'addsub':r<.65?'mult':r<.85?'frac':'alg';let q='',problem;
    if(faction==='addsub'){const max=clamp(20+wave*8,25,90);let a=int(4,max),b=int(2,max-2);if(random(s)<.5){q=`${a} + ${b}`;problem={op:'add',a,b};}else{if(b>a)[a,b]=[b,a];q=`${a} − ${b}`;problem={op:'sub',a,b};}}
    else if(faction==='mult'){const a=int(2,clamp(9+Math.floor(wave/2),9,12)),b=int(2,12);q=`${a} × ${b}`;problem={op:'mul',a,b};}
    else if(faction==='frac'){if(random(s)<.5){const perc=[10,20,25,50,75][int(0,4)],n=int(6,18)*(perc===25||perc===75?4:perc===20?5:10);q=`${perc}% of ${n}`;problem={op:'div',a:perc*n,b:100};}else{const b=int(2,6),a=int(1,b-1),n=int(6,18)*b;q=`${a}/${b} of ${n}`;problem={op:'div',a:a*n,b};}}
    else if(random(s)<.5){const x=int(2,clamp(8+wave,10,18)),a=int(3,16),b=x+a;q=`x + ${a} = ${b}. x`;problem={op:'sub',a:b,b:a};}
    else{const x=int(2,clamp(8+wave,10,16)),a=int(2,8),b=x*a;q=`${a}x = ${b}. x`;problem={op:'div',a:b,b:a};}
    const ans=solveMath({problem}),choices=[ans];while(choices.length<4){const c=Math.max(0,ans+(int(-10,10)||3));if(!choices.includes(c))choices.push(c);}for(let i=3;i>0;i--){const j=int(0,i);[choices[i],choices[j]]=[choices[j],choices[i]];}
    return{id:`${s.turnId}:${kind}`,kind,q:q+' = ?',ans,problem,choices,faction,remainingMs:10000};
  }
  function supportProjectile(s,owner,g,accuracy=.7){const target=s.tanks[1-owner],hit=random(s)<accuracy,aimX=hit?target.x:target.x+rand(s,-25,25),aimY=hit?target.y+6:target.y+rand(s,-20,20),dx=aimX-g.x,dy=aimY-(g.y+5),d=Math.hypot(dx,dy)||1;s.projectiles.push({x:g.x+(owner?-8:8),y:g.y+3,vx:dx/d*5,vy:dy/d*5,ghost:true,wid:'standard',owner,age:0});}
  function summon(s,slot,ally=false){const t=s.tanks[slot],dir=slot?-1:1,g={x:clamp(t.x+dir*rand(s,40,100),20,W-20),y:0,hp:1,turns:ally?3:4,justSummoned:true,isAlly:ally};g.y=s.terrain[Math.floor(g.x)]-14;t.ghosts.push(g);supportProjectile(s,slot,g,ally?.65:.7);s.phase='shot';s.afterSupport='aim';fx(s,g.x,g.y,ally?'#38bdf8':'#4ade80');}
  function carrier(s,slot){
    const t=s.tanks[slot],enemy=s.tanks[1-slot],units=[enemy,...enemy.ghosts],missing=t.maxHP-t.hp,count=units.length,allies=t.ghosts.filter(g=>g.isAlly).length;
    let choice='ammo';if(t.hp<=3&&missing>0)choice='heal';else{const heal=missing*3,combat=count*1.5-allies*3,ammo=(t.ammo<=3?5:t.ammo<=6?2:0)+(count>4?1:0);if(heal>=combat&&heal>=ammo&&missing>0)choice='heal';else if(combat>=ammo&&count>=2)choice=count>=3?'airstrike':'reinforce';}
    if(choice==='heal'){t.hp=Math.min(t.maxHP,t.hp+1);fx(s,t.x,t.y,'#4ade80');}
    if(choice==='ammo'){t.ammo+=4;if(has(t,'arsenal'))t.weapons[WEAPONS[1+Math.floor(random(s)*5)]]+=2;}
    if(choice==='reinforce')summon(s,slot,true);
    if(choice==='airstrike'){hurt(s,1-slot,1,slot);for(const g of enemy.ghosts)fx(s,g.x,g.y,'#f97316');enemy.ghosts=[];crater(s,enemy.x,18);fx(s,enemy.x,enemy.y,'#f97316');finish(s);}
    s.message=`Supply Drop: ${choice}`;
  }
  const LOOT=[['shells','🔹','+2 Shells',15],['hp','♥','+1 HP',15],['def','🛡','DEF Charge',12],['double','⚡','Double Shot',10],['speed','🚀','Speed Boost (2t)',8],['energy','💎','+3 Energy',7],['specammo','🔫','Spec Ammo ×2',10],['perk4','🌟','4th Perk Slot!',15],['airstrike','💣','Airstrike!',10],['sandspray','🫧','Sand Spray ×2',10]];
  function loot(s,correct){const t=s.tanks[s.turn],pool=LOOT.filter(x=>x[0]!=='perk4'||t.perks.length<4),weight=pool.reduce((sum,x)=>sum+x[3],0);s.loot=[];
    for(let n=0;n<(correct?3:2);n++){let value=random(s)*weight,item=pool[0];for(const candidate of pool){value-=candidate[3];if(value<=0){item=candidate;break;}}s.loot.push({id:item[0],icon:item[1],name:item[2]});
      switch(item[0]){case'shells':t.ammo+=2;break;case'hp':t.hp=Math.min(t.maxHP,t.hp+1);break;case'def':if(has(t,'defense')){t.shieldType='block';t.shield=Math.min(t.shield+1,3);}break;case'double':t.doubleShotReady=true;break;case'speed':t.speedBoost=(t.speedBoost||0)+2;break;case'energy':t.energy=clamp(t.energy+3,0,10);break;case'specammo':if(has(t,'arsenal'))t.weapons[WEAPONS[1+Math.floor(random(s)*5)]]+=2;break;case'airstrike':hurt(s,1-s.turn,1,s.turn);s.tanks[1-s.turn].ghosts=[];break;case'sandspray':t.weapons.sandspray+=2;break;}
    }s.phase='loot';s.message=`Crate: ${s.loot.length} items found`;finish(s);
  }
  function command(s,slot,c){
    if(!s||!c||s.paused||s.phase==='finished'||slot!==s.turn||c.turnId!==s.turnId)return false;
    const t=s.tanks[slot],p=c.payload||{};
    if(c.action==='collect'){if(s.phase!=='loot')return false;const extra=s.loot.some(x=>x.id==='perk4')&&t.perks.length<4;if(extra){if(!PERKS.includes(p.perk)||t.perks.includes(p.perk))return false;t.perks.push(p.perk);}s.loot=null;nextTurn(s);return true;}
    if(c.action==='answer'){if(s.phase!=='math'||!s.challenge||p.id!==s.challenge.id||!s.challenge.choices.includes(p.value))return false;const q=s.challenge,ok=p.value===solveMath(q);t.mathUsed.push(q.kind);if(q.kind==='targeting')t.solved=true;if(ok){t.energy=clamp(t.energy+2,0,10);if(q.kind==='targeting'){t.preview=true;if(has(t,'defense')){t.shield=q.faction==='alg'?2:1;t.shieldType=q.faction==='mult'?'reflect':q.faction==='frac'?'dr':'block';}}if(q.kind==='defense'){t.shield=q.faction==='alg'?2:1;t.shieldType=q.faction==='mult'?'reflect':q.faction==='frac'?'dr':'block';}if(q.kind==='repair')t.hp=Math.min(t.maxHP,t.hp+1);if(q.kind==='armory')t.weapons.cluster+=2;}s.challenge=null;s.phase='aim';s.message=ok?'Correct — protocol online':'Incorrect — aim and fire';if(q.kind==='crate')loot(s,ok);return true;}
    if(s.phase!=='aim')return false;
    if(c.action==='fire'){const a=Number(p.angle),v=Number(p.power),w=p.weapon||'standard';if(!Number.isFinite(a)||!Number.isFinite(v)||a<0||a>85||v<5||v>100||!WEAPONS.includes(w)||t.ammo<=0||has(t,'targeting')&&!t.solved||w!=='standard'&&(!has(t,'arsenal')||t.weapons[w]<=0))return false;launch(s,slot,a,v,w);return true;}
    if(c.action==='move'){if(!has(t,'mobility')||t.moves>=3||![1,-1].includes(p.dir))return false;const target=clamp(t.x+p.dir*Math.floor(W*.08)*(t.speedBoost>0?2:1),20,W-20),other=s.tanks[1-slot];let safe=Math.floor(t.x);for(let x=safe+p.dir;p.dir>0?x<=target:x>=target;x+=p.dir){const floor=s.terrain[x],base=Math.min(s.terrain[clamp(x-12,0,W-1)],s.terrain[clamp(x+12,0,W-1)]);if(floor-base>6||Math.abs(x-other.x)<30)break;safe=x;}if(safe===Math.floor(t.x))return false;t.x=safe;t.moves++;const toward=p.dir===(slot?-1:1);if(toward&&Math.abs(other.x-t.x)<104){const push=other.maxHP<=1?40:other.maxHP<=2?22:8;other.x=clamp(other.x+p.dir*push,20,W-20);}seat(s);return true;}
    if(c.action==='math'){const kinds={targeting:'targeting',defense:'defense',repair:'repair',armory:'arsenal'};if(!kinds[p.kind]||!has(t,kinds[p.kind])||t.mathUsed.includes(p.kind))return false;if(p.kind==='repair'&&(s.round<2||t.hp>=t.maxHP))return false;s.challenge=makeMath(s,p.kind);s.phase='math';return true;}
    if(c.action==='ammo'){if(!has(t,'arsenal')||t.energy<3||!WEAPONS.includes(p.weapon)||p.weapon==='standard')return false;t.energy-=3;t.weapons[p.weapon]+=1;return true;}
    if(c.action==='swap'){if(t.swaps>=2||!Array.isArray(p.perks)||p.perks.length!==t.perks.length||new Set(p.perks).size!==t.perks.length||!p.perks.every(x=>PERKS.includes(x)))return false;if(t.swaps)t.ammo=Math.floor(t.ammo*.3);t.perks=p.perks.slice();t.swaps++;return true;}
    if(c.action==='ability'||c.action==='cloak'){
      const free=t.hull==='necromancer'&&t.freeSummon;
      if(c.action==='cloak'&&(t.cloakUsed||t.hull!=='wraith'))return false;
      if(t.hull==='necromancer'&&t.ghosts.length>=3)return false;if(!free&&t.energy<4)return false;if(!free)t.energy-=4;
      if(t.hull==='destroyer')t.fury=true;
      if(t.hull==='dreadnought')t.fortify=2;
      if(t.hull==='corvette')t.quick=true;
      if(t.hull==='wraith'){t.cloak=2;t.cloakUsed=true;}
      if(t.hull==='carrier')carrier(s,slot);
      if(t.hull==='necromancer'){summon(s,slot);t.freeSummon=false;}
      if(t.hull!=='carrier')s.message=`Player ${slot+1}: class ability activated`;return true;
    }
    if(c.action==='pass'){nextTurn(s);return true;}return false;
  }
  function step(s,ms=1000/60){if(!s||s.paused||s.phase==='finished')return;
    if(s.phase==='math'){s.challenge.remainingMs-=ms;if(s.challenge.remainingMs<=0){const kind=s.challenge.kind;s.tanks[s.turn].mathUsed.push(kind);if(kind==='targeting')s.tanks[s.turn].solved=true;s.challenge=null;s.phase='aim';s.message='Math timed out — aim and fire';if(kind==='crate')loot(s,false);}return;}
    if(s.phase!=='shot')return;
    for(let i=s.projectiles.length-1;i>=0;i--){const p=s.projectiles[i];p.x+=p.vx;p.y+=p.vy;if(!p.ghost){p.vy+=GRAVITY*(p.child?1.1:1);p.vx+=s.wind*(p.child?.5:1);}p.age++;if(!p.child&&!p.ghost&&s.trail.length<600)s.trail.push({x:p.x,y:p.y});
      if(p.x<-30||p.x>W+30||p.y>H+30||p.age>720){s.projectiles.splice(i,1);continue;}
      if(!p.child&&!p.ghost&&!s.crateClaimed&&has(s.tanks[p.owner],'crates')&&Math.abs(p.x-W/2)<12&&Math.abs(p.y-(s.terrain[W/2]-12))<12){s.crateClaimed=true;s.projectiles=[];s.lastTrail=s.trail.slice();s.challenge=makeMath(s,'crate');s.phase='math';fx(s,p.x,p.y,'#38bdf8');return;}
      let hit=-1;for(const t of s.tanks){if(t.slot===p.owner&&p.age<6)continue;if(p.x>=t.x-TANK_W/2&&p.x<=t.x+TANK_W/2&&p.y>=t.y&&p.y<=t.y+TANK_H){hit=t.slot;break;}}
      if(p.ghost){if(hit>=0&&hit!==p.owner){s.projectiles.splice(i,1);hurt(s,hit,.6,p.owner);fx(s,p.x,p.y,'#4ade80');}continue;}
      const ground=p.y>=s.terrain[clamp(Math.floor(p.x),0,W-1)],supportHit=s.tanks.some(t=>t.ghosts.some(g=>p.x>=g.x-12&&p.x<=g.x+12&&p.y>=g.y&&p.y<=g.y+14));
      if(hit>=0||supportHit||ground&&p.wid!=='piercer'){s.projectiles.splice(i,1);impact(s,p,p.x,p.y,hit);}
    }
    if(finish(s))return;if(!s.projectiles.length){
      if(s.afterSupport==='aim'){s.afterSupport=null;s.phase='aim';return;}
      if(!s.supportFired){s.supportFired=true;for(const g of s.tanks[s.turn].ghosts)if(!g.justSummoned)supportProjectile(s,s.turn,g);if(s.projectiles.length)return;}
      if(s.tanks[s.turn].doubleShotReady){const t=s.tanks[s.turn],o=s.tanks[1-s.turn],dx=o.x-t.x,dy=o.y+6-t.y,a=Math.atan2(-dy,Math.abs(dx)),speed=10;t.doubleShotReady=false;s.projectiles.push({x:t.x,y:t.y-2,vx:Math.cos(a)*speed*(s.turn?-1:1),vy:-Math.sin(a)*speed*.5-2,wid:'standard',owner:s.turn,age:0});return;}
      s.lastTrail=s.trail.slice();nextTurn(s);
    }
  }
  function publicState(s){const v=clone(s);if(v.challenge)delete v.challenge.ans;return v;}
  function preview(s,slot,angle,power,weapon='standard'){const t=s.tanks[slot],a=angle*Math.PI/180,dir=slot? -1:1;let x=t.x,y=t.y-2,vx=Math.cos(a)*power/100*13*dir,vy=-Math.sin(a)*power/100*13;const trail=[];for(let n=0;n<720;n++){x+=vx;y+=vy;vy+=GRAVITY;vx+=s.wind;trail.push({x,y});if(x<-20||x>W+20||y>H+20)break;if(weapon!=='piercer'&&y>=s.terrain[clamp(Math.floor(x),0,W-1)])break;const o=s.tanks[1-slot];if(x>=o.x-12&&x<=o.x+12&&y>=o.y&&y<=o.y+12)break;}return trail;}
  function cpuAim(s,slot){const o=s.tanks[1-slot];let best={angle:45,power:65,weapon:'standard'},dist=Infinity;for(let a=15;a<=80;a+=2)for(let p=25;p<=100;p+=2){const tr=preview(s,slot,a,p);const end=tr[tr.length-1],d=Math.hypot(end.x-o.x,end.y-o.y);if(d<dist){dist=d;best={angle:a,power:p,weapon:'standard'};}}return best;}
  return {create,command,step,publicState,preview,cpuAim,validLoadout,seedOf,solveMath,W,H,GRAVITY,WEAPONS,PERKS};
});
