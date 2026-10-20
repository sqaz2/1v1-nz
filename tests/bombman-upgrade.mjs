import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as T from 'three';
import { summarizeActivity,handleActivityRoom } from '../multiplayer/activity.mjs';
globalThis.window={};const {frameArena}=await import('../bomberman/arena3d.mjs');
const ctx={};vm.runInNewContext(fs.readFileSync('bomberman/bot-ai.js','utf8'),ctx);const AI=ctx.BombManAI;
function game(rows){return {cells:rows.map(r=>[...r].map(c=>({solid:c==='#'?'hard':c==='C'?'crate':null,pickup:c==='P'?'speed':null}))),bombs:[],explosions:[],player:{x:9,z:9,alive:true},enemies:[]};}
function bot(g,x,z){const e={x,z,alive:true,bombCd:0,bombsMax:1,fire:2,botId:'bot:0'};g.enemies.push(e);return e;}
test('3D camera contains all board edges and heads at narrow, landscape and desktop ratios',()=>{for(const aspect of [.48,.7,1,1.6,2.6,3.5]){const c=new T.PerspectiveCamera(42,aspect,.1,150);for(const p of frameArena(c,11,9,aspect)){const v=p.project(c);assert.ok(Math.abs(v.x)<.9&&Math.abs(v.y)<.87,`clipped at ${aspect}`);}}});
test('bot refuses a suicidal bomb in a dead end',()=>{const g=game(['#####','#.C##','#####']),e=bot(g,1,1);assert.equal(AI.plan(g,e).drop,false);});
test('bot plants useful bomb only with a real route out of its cross',()=>{const g=game(['.......','.......','...C...','.......','.......']),e=bot(g,2,2);const p=AI.plan(g,e);assert.equal(p.drop,true);assert.ok(p.dir);});
test('bot seeks a visible pickup and avoids active flames',()=>{const g=game(['.....','.....','.....']),e=bot(g,2,1);e.bombCd=10;g.cells[1][4].pickup='speed';assert.equal(AI.plan(g,e).dir,'right');g.explosions.push({x:3,z:1,t:.46});assert.notEqual(AI.plan(g,e).dir,'right');});
test('chain reactions shorten danger times beyond the first bomb',()=>{const g=game(['.......','.......','.......']);g.bombs=[{x:1,z:1,range:2,timer:.2},{x:3,z:1,range:3,timer:2.6}];const danger=AI.danger(g);assert.equal(danger.get('6,1')[0][0],.2);});
test('activity excludes stale visitors and separates playing from looking',()=>{assert.deepEqual(summarizeActivity([{at:100,state:'playing',joinable:true},{at:100,state:'looking'},{at:-50000,state:'playing'}],200),{here:2,playing:1,looking:1,joinable:1});});
test('activity heartbeat deduplicates and departure removes visitor',async()=>{const data=new Map();let alarm=null;const ctx={storage:{get:async k=>data.get(k),put:async(k,v)=>data.set(k,v),delete:async k=>data.delete(k),list:async()=>new Map(data),getAlarm:async()=>alarm,setAlarm:async n=>alarm=n}};const req=d=>new Request('https://room/activity',{method:'POST',body:JSON.stringify(d)});const d={id:'12345678-1234-1234',state:'looking'};await handleActivityRoom(ctx,req(d));const count=await (await handleActivityRoom(ctx,req(d))).json();assert.equal(count.here,1);const left=await(await handleActivityRoom(ctx,req({...d,leave:true}))).json();assert.equal(left.here,0);});
test('all inline game scripts parse after integration',()=>{for(const file of ['bomberman/index.html','connect-4/index.html']){const html=fs.readFileSync(file,'utf8');for(const m of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)){if(m[1].includes('application/ld+json')||m[1].includes('type="module"'))continue;new vm.Script(m[2],{filename:file});}}});
