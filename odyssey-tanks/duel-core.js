/* Odyssey Tanks duel adapter. Movement constants/equations and collision model
 * come from upstream/OdysseyTanks.tsx. Original shooting/abilities/rendering are
 * supplied by adapter.js, not replaced with a second implementation. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.OdysseyDuel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const WIDTH = 2400, HEIGHT = 2400, SIZE = 16;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const finite = (n, fallback = 0) => typeof n === 'number' && Number.isFinite(n) ? n : fallback;
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const cleanInput = input => ({
    x: clamp(finite(input?.x), -1, 1), y: clamp(finite(input?.y), -1, 1),
    angle: clamp(finite(input?.angle), -Math.PI, Math.PI), fire: input?.fire === true,
    ability: input?.ability === true,
  });
  function validLoadout(value, hulls, perks) {
    if (!value || !hulls.some(h => h.id === value.hull) || !Array.isArray(value.perks)) return null;
    const ids = [...new Set(value.perks)];
    if (ids.length !== 3 || !ids.every(id => perks.some(p => p.id === id))) return null;
    return {hull: value.hull, perks: ids};
  }
  function tank(loadout, slot, hulls) {
    const h = hulls.find(item => item.id === loadout.hull);
    return {slot, hull: h.id, perks: [...loadout.perks], x: slot === 0 ? 1000 : 1400, y: 1200,
      angle: slot === 0 ? 0 : Math.PI, hp: h.hp, maxHp: h.hp, speed: 0, vx: 0, vy: 0,
      fireCD: 0, invT: 0, rapidT: 0, shieldT: 0, upgDmg: h.dmgBonus,
      upgFireRate: h.fireRateMult, upgSpeed: h.speedMult, shieldBonus: 0,
      maxEnergy: 10, energy: h.abilityCost, blastRadius: 0, furyT: 0,
      fortifyT: 0, overdriveT: 0, cloakT: 0, ghostTanks: [], damage: 0};
  }
  function circleRect(p, radius, wall) {
    return Math.hypot(p.x - clamp(p.x, wall.x, wall.x + wall.w), p.y - clamp(p.y, wall.y, wall.y + wall.h)) < radius;
  }
  function pushOut(p, wall) {
    const cx = clamp(p.x, wall.x, wall.x + wall.w), cy = clamp(p.y, wall.y, wall.y + wall.h);
    const dx = p.x - cx, dy = p.y - cy, d = Math.hypot(dx, dy);
    if (d > 0.01 && d < SIZE) {p.x = cx + dx / d * SIZE; p.y = cy + dy / d * SIZE;}
    else if (d <= 0.01) {
      const sides = [[p.x - wall.x, 'x', wall.x - SIZE], [wall.x + wall.w - p.x, 'x', wall.x + wall.w + SIZE], [p.y - wall.y, 'y', wall.y - SIZE], [wall.y + wall.h - p.y, 'y', wall.y + wall.h + SIZE]];
      sides.sort((a, b) => a[0] - b[0]); p[sides[0][1]] = sides[0][2];
    }
  }
  function create(options) {
    const {hulls, perks, shoot, ability, explode = () => {}, pickup = () => {}, wallDrop = () => {}} = options;
    let world = null;
    let inputs = [cleanInput({}), cleanInput({})], inputTicks = [-999, -999];
    function start(matchId, seed, loadouts, walls) {
      if (!loadouts.every(value => validLoadout(value, hulls, perks))) throw new Error('Invalid duel loadout');
      world = {version: 1, matchId, seed, tick: 0, phase: 'play', winner: null,
        tanks: loadouts.map((value, slot) => tank(value, slot, hulls)), bullets: [], pickups: [], walls: JSON.parse(JSON.stringify(walls || []))};
      world.walls = world.walls.filter(w => world.tanks.every(p => !circleRect(p, 80, w)));
      clearInput();
      return world;
    }
    function clearInput() {inputs = [cleanInput({}), cleanInput({})]; inputTicks = [-999, -999];}
    function setInput(slot, value) {
      if (!world || ![0, 1].includes(slot)) return;
      inputs[slot] = cleanInput(value); inputTicks[slot] = world.tick;
    }
    function hit(target, dmg, attacker) {
      if (target.invT > 0 || target.shieldT > 0 || target.fortifyT > 0) return false;
      const amount = target.perks.includes('defense') ? Math.max(1, Math.round(dmg * .8)) : dmg;
      const inflicted = Math.min(target.hp, amount);
      target.hp = Math.max(0, target.hp - amount); target.invT = 15;
      if (attacker) {attacker.damage += inflicted; attacker.energy = Math.min(attacker.maxEnergy, attacker.energy + 1);}
      return true;
    }
    function step() {
      if (!world || world.phase !== 'play') return world;
      world.tick++;
      for (const p of world.tanks) {
        const input = world.tick - inputTicks[p.slot] <= 30 ? inputs[p.slot] : cleanInput({angle:p.angle});
        for (const key of ['fireCD','invT','rapidT','shieldT','furyT','fortifyT','overdriveT','cloakT']) if (p[key] > 0) p[key]--;
        let ax = input.x, ay = input.y;
        const mag = Math.hypot(ax, ay);
        if (mag > 1) {ax /= mag; ay /= mag;}
        const mult = p.upgSpeed * (p.overdriveT > 0 ? 2 : 1) * (p.perks.includes('mobility') ? 1.2 : 1);
        p.vx = (p.vx + ax * .35 * mult) * .88; p.vy = (p.vy + ay * .35 * mult) * .88;
        const speed = Math.hypot(p.vx, p.vy), maxSpeed = 3.8 * mult;
        if (speed > maxSpeed) {p.vx = p.vx / speed * maxSpeed; p.vy = p.vy / speed * maxSpeed;}
        p.x = clamp(p.x + p.vx, SIZE, WIDTH - SIZE); p.y = clamp(p.y + p.vy, SIZE, HEIGHT - SIZE);
        p.angle = input.angle;
        for (const wall of world.walls) pushOut(p, wall);
        if (input.ability) {ability?.(p, world); input.ability = false;}
        if (input.fire && p.fireCD <= 0) shoot?.(p, world);
        // PvP has no waves/kills to replenish energy: a visible 3-second recharge.
        if (world.tick % 180 === 0) p.energy = Math.min(p.maxEnergy, p.energy + 1);
        if (world.tick % 900 === 0 && p.perks.includes('repair')) p.hp = Math.min(p.maxHp, p.hp + 15);
      }
      const [a,b] = world.tanks, separation = distance(a,b);
      if (separation < SIZE * 2) {
        const angle = separation > .01 ? Math.atan2(b.y-a.y,b.x-a.x) : 0, push = (SIZE*2-separation)/2;
        a.x = clamp(a.x-Math.cos(angle)*push,SIZE,WIDTH-SIZE); a.y = clamp(a.y-Math.sin(angle)*push,SIZE,HEIGHT-SIZE);
        b.x = clamp(b.x+Math.cos(angle)*push,SIZE,WIDTH-SIZE); b.y = clamp(b.y+Math.sin(angle)*push,SIZE,HEIGHT-SIZE);
      }
      for (let i = world.bullets.length - 1; i >= 0; i--) {
        const shot = world.bullets[i]; shot.x += shot.vx; shot.y += shot.vy; shot.life--;
        let remove = shot.life <= 0 || shot.x < 0 || shot.x > WIDTH || shot.y < 0 || shot.y > HEIGHT;
        const owner = world.tanks[shot.owner], target = world.tanks[1-shot.owner];
        if (!remove && distance(shot,target) < SIZE + 4) {hit(target,shot.dmg,owner); remove = true;}
        if (!remove) for (const ghost of target.ghostTanks) {
          if (distance(shot,ghost) < 18 && ghost.hp > 0) {ghost.hp -= shot.dmg; if (shot.pierce > 0) {shot.pierce--;shot.dmg *= .7;} else remove = true; break;}
        }
        if (!remove) for (let w = world.walls.length - 1; w >= 0; w--) {
          const wall = world.walls[w];
          if (circleRect(shot,4,wall)) {
            wall.hp -= shot.dmg; remove = true;
            if (wall.hp <= 0) {explode(wall.x+wall.w/2,wall.y+wall.h/2,25);wallDrop(owner,wall,world);world.walls.splice(w,1);}
            break;
          }
        }
        if (remove) world.bullets.splice(i,1);
      }
      for (const p of world.tanks) for (let i = p.ghostTanks.length - 1; i >= 0; i--) {
        const ghost=p.ghostTanks[i], other=world.tanks[1-p.slot]; ghost.life--;ghost.fireCD--;
        if (ghost.life <= 0 || ghost.hp <= 0) {p.ghostTanks.splice(i,1);continue;}
        const angle=Math.atan2(other.y-ghost.y,other.x-ghost.x);ghost.angle=angle;
        const follow=Math.atan2(p.y-ghost.y,p.x-ghost.x), d=distance(p,ghost);
        if(d>120){ghost.x+=Math.cos(follow)*1.5;ghost.y+=Math.sin(follow)*1.5;}
        else if(d<50){ghost.x-=Math.cos(follow)*.5;ghost.y-=Math.sin(follow)*.5;}
        if (ghost.fireCD <= 0 && other.cloakT <= 0) {
          ghost.fireCD=25;
          world.bullets.push({x:ghost.x+Math.cos(angle)*18,y:ghost.y+Math.sin(angle)*18,vx:Math.cos(angle)*7.2,vy:Math.sin(angle)*7.2,life:60,dmg:6,pierce:0,owner:p.slot});
        }
      }
      for(let i=world.pickups.length-1;i>=0;i--){
        const item=world.pickups[i];item.life--;
        if(item.life<=0){world.pickups.splice(i,1);continue;}
        for(const p of world.tanks)if(distance(item,p)<SIZE+14){pickup(p,item,world);world.pickups.splice(i,1);break;}
      }
      if (world.tanks.some(p=>p.hp<=0)) {
        world.phase='finished';world.winner=world.tanks.every(p=>p.hp<=0)?null:world.tanks.find(p=>p.hp>0).slot;
        world.tanks.filter(p=>p.hp<=0).forEach(p=>explode(p.x,p.y,35));clearInput();
      }
      return world;
    }
    function snapshot(){return world ? JSON.parse(JSON.stringify(world)) : null;}
    function restore(value, matchId) {
      if (!value || value.version!==1 || value.matchId!==matchId || !Number.isSafeInteger(value.tick) || value.tick<0 || !['play','finished'].includes(value.phase)) return false;
      if(!Array.isArray(value.tanks)||value.tanks.length!==2||!Array.isArray(value.bullets)||value.bullets.length>256||!Array.isArray(value.walls)||value.walls.length>64||!Array.isArray(value.pickups)||value.pickups.length>64)return false;
      if(!value.tanks.every((p,i)=>p.slot===i&&validLoadout(p,hulls,perks)&&['x','y','hp','maxHp','angle','vx','vy','energy'].every(k=>Number.isFinite(p[k]))&&p.hp>=0&&p.hp<=p.maxHp&&p.x>=0&&p.x<=WIDTH&&p.y>=0&&p.y<=HEIGHT&&Array.isArray(p.ghostTanks)&&p.ghostTanks.length<=30))return false;
      if(!value.bullets.every(b=>[0,1].includes(b.owner)&&['x','y','vx','vy','dmg','life'].every(k=>Number.isFinite(b[k]))))return false;
      world=JSON.parse(JSON.stringify(value));clearInput();return true;
    }
    return {start,step,setInput,clearInput,snapshot,restore,get world(){return world;}};
  }
  return {create,validLoadout,cleanInput,WIDTH,HEIGHT};
});
