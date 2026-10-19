import test from 'node:test';
import assert from 'node:assert/strict';
import { RoomCore } from '../multiplayer/room-core.mjs';

test('Bomberman live room starts with CPU seat open and permits hot takeover', () => {
  let tick=1000, tokenIndex=0;
  const core=new RoomCore(null,{
    now:()=>tick,
    token:()=>String(++tokenIndex).padStart(48,'0'),
    seed:()=>123456
  });
  const host=core.create('ABCDEFGH','bomberman');
  core.connect(host.token,'host');

  let out=core.receive(0,'host',JSON.stringify({seq:1,matchId:null,kind:'ready',ready:true}));
  assert.equal(core.state.phase,'active');
  assert.equal(core.state.seed,123456);
  assert.equal(core.state.players[1],null);
  assert.ok(out.some(x=>x.message.kind==='start'));

  core.receive(0,'host',JSON.stringify({
    seq:2,matchId:core.state.matchId,kind:'snapshot',
    snapshot:{round:1,players:[{x:1,y:1},{x:11,y:9}]}
  }));

  const guest=core.join('bomberman');
  assert.equal(guest.slot,1);
  const welcome=core.connect(guest.token,'guest').welcome;
  assert.equal(welcome.phase,'active');
  assert.deepEqual(welcome.snapshot,{round:1,players:[{x:1,y:1},{x:11,y:9}]});
  assert.equal(welcome.connected,true);

  out=core.receive(1,'guest',JSON.stringify({
    seq:1,matchId:core.state.matchId,kind:'event',type:'action',data:{action:'left'}
  }));
  assert.ok(out.some(x=>x.to===0&&x.message.kind==='event'));

  core.disconnect(1,'guest');
  assert.equal(core.state.players[1],null);

  assert.doesNotThrow(()=>core.receive(0,'host',JSON.stringify({
    seq:3,matchId:core.state.matchId,kind:'snapshot',snapshot:{round:1,cpu:true}
  })));

  const replacement=core.join('bomberman');
  assert.equal(replacement.slot,1);
});
