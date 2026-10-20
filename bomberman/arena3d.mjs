import * as T from 'three';
// Separate renderer: simulation, continuous movement and network snapshots stay untouched.
const palettes={factory:[0x405468,0x182738,0xea9b39],temple:[0x758668,0x263b32,0xc29654],ice:[0xa1d9ec,0x28485e,0x719ac4],lava:[0x71504a,0x301c26,0xe58b36]};
export function frameArena(camera,cols,rows,aspect){
  camera.aspect=aspect; camera.position.set(cols/2,15,rows/2+14);camera.lookAt(cols/2,0,rows/2);camera.updateMatrixWorld();
  const points=[];for(const x of [-.8,cols+.8])for(const z of [-.8,rows+.8])for(const y of [-.6,1.65])points.push(new T.Vector3(x,y,z));
  const target=new T.Vector3(cols/2,0,rows/2),axis=camera.position.clone().sub(target).normalize();
  // Fit all eight bounding corners, including heads and board rim; reserve a generous margin.
  for(let distance=13;distance<85;distance+=.25){camera.position.copy(target).addScaledVector(axis,distance);camera.updateMatrixWorld();camera.updateProjectionMatrix();if(points.every(p=>{const v=p.clone().project(camera);return Math.abs(v.x)<.89&&Math.abs(v.y)<.86;}))break;}
  return points;
}
function createRenderer(wrap){
  const renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.6));renderer.setClearColor(0x080f1b);renderer.outputColorSpace=T.SRGBColorSpace;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  const canvas=renderer.domElement;canvas.id='bmWebGL';canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none';wrap.prepend(canvas);
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(42,1,.1,150);
  scene.add(new T.HemisphereLight(0xb9e5ff,0x423126,2.1));
  const sun=new T.DirectionalLight(0xffe5b5,3.2);sun.position.set(-3,15,8);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-12,right:12,top:12,bottom:-12,near:1,far:45});sun.shadow.bias=-.001;scene.add(sun);scene.add(sun.target);
  const fill=new T.DirectionalLight(0x5bafff,1.5);fill.position.set(12,7,-8);scene.add(fill);
  const box=new T.BoxGeometry(1,1,1),sphere=new T.SphereGeometry(1,16,12),cyl=new T.CylinderGeometry(1,1,1,12);
  const textures=new Map(),loader=new T.TextureLoader();function texture(name){if(!textures.has(name)){const t=loader.load('/bomberman/sprites/'+name+'.webp?v=2');t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;textures.set(name,t);}return textures.get(name);}
  const materials=new Map();function mat(color,metalness=.1){const key=color+':'+metalness;if(!materials.has(key))materials.set(key,new T.MeshStandardMaterial({color,roughness:.55,metalness}));return materials.get(key);}
  function mesh(group,geometry,color,x,y,z,sx,sy,sz,metal=.1){const m=new T.Mesh(geometry,mat(color,metal));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;group.add(m);return m;}
  let board=new T.Group();scene.add(board);const actors=new Map(),dynamic=new T.Group();scene.add(dynamic);let boardKey='',sizeKey='';
  function buildBoard(g){scene.remove(board);board=new T.Group();scene.add(board);const [floor,wall,wood]=palettes[g.mapId]||palettes.factory;
    mesh(board,box,wall,g.cols/2,-.35,g.rows/2,g.cols+1,.6,g.rows+1);
    for(let z=0;z<g.rows;z++)for(let x=0;x<g.cols;x++){const c=g.cells[z][x],special={lava:0xf36b1e,ice:0x9cdef1,water:0x168bab,conveyor:0xc49d35,bush:0x4e8b4e}[c.special];
      const tile=mesh(board,box,special||floor,x+.5,-.02,z+.5,.94,.15,.94);const texName=c.special&&['lava','ice','water','conveyor','bush'].includes(c.special)?'tex_'+c.special:'tex_stone';const mk='tile:'+texName+':'+g.mapId;if(!materials.has(mk))materials.set(mk,new T.MeshStandardMaterial({map:texture(texName),color:special?0xffffff:floor,roughness:.8}));tile.material=materials.get(mk);
      if(c.solid){const hard=c.solid==='hard';mesh(board,box,hard?wall:wood,x+.5,hard?.43:.36,z+.5,.88,hard?.85:.72,.88,hard?.6:.05);
        if(hard){mesh(board,box,0x8193a3,x+.5,.88,z+.5,.76,.035,.76,.7);}
        else {for(const a of [-1,1]){const beam=mesh(board,box,0x583c25,x+.5,.36,z+.948,.09,.85,.035);beam.rotation.z=a*.79;}mesh(board,box,0xf4bf68,x+.5,.73,z+.5,.86,.045,.09);}
      }
      if(c.special==='conveyor')for(let i=0;i<3;i++)mesh(board,box,0x292f36,x+.2+i*.3,.07,z+.5,.08,.02,.7);
    }
    // Low rail leaves corner characters fully visible.
    for(const z of [-.22,g.rows+.22])mesh(board,box,wall,g.cols/2,.06,z,g.cols+.8,.22,.28);
    for(const x of [-.22,g.cols+.22])mesh(board,box,wall,x,.06,g.rows/2,.28,.22,g.rows+.8);
  }
  function character(key,bot,color){const group=new T.Group();scene.add(group);const limbs=[];
    mesh(group,sphere,bot?0x637f94:0xe2a65f,0,.74,0,.33,.36,.28,.3);
    mesh(group,box,color,0,.42,0,.47,.46,.34);
    if(bot){mesh(group,box,0x102334,0,.84,.245,.44,.19,.1,.7);for(const x of [-.12,.12])mesh(group,sphere,0x6cffee,x,.85,.31,.055,.06,.025);mesh(group,cyl,0xf7c856,0,1.18,0,.025,.23,.025);mesh(group,sphere,0xff5a42,0,1.32,0,.065,.065,.065);}
    else {for(const x of [-.23,.23]){mesh(group,sphere,0xe1a366,x,1.05,0,.15,.17,.09);mesh(group,sphere,0xefbea6,x,1.05,.06,.085,.1,.04);}mesh(group,sphere,0xffdeb1,0,.68,.22,.25,.17,.11);for(const x of [-.12,.12])mesh(group,sphere,0x121d2b,x,.84,.25,.047,.065,.026);mesh(group,sphere,0x583221,0,.72,.34,.045,.035,.03);mesh(group,box,0x24477b,0,.99,.12,.5,.08,.34);}
    for(const x of [-.22,.22]){const leg=new T.Group();leg.position.set(x,.3,0);group.add(leg);mesh(leg,box,0x172a40,0,-.16,.055,.19,.24,.32);limbs.push(leg);const arm=new T.Group();arm.position.set(x*1.45,.58,0);group.add(arm);mesh(arm,sphere,bot?0x8198a7:0xe5ad65,0,-.09,0,.1,.19,.1);limbs.push(arm);}
    const ring=new T.Mesh(new T.TorusGeometry(.38,.025,6,28),mat(color));ring.rotation.x=Math.PI/2;ring.position.y=.09;group.add(ring);actors.set(key,{group,limbs,ring});return actors.get(key);
  }
  const pool=[];let used=0;function pooled(geo,color,x,y,z,sx,sy,sz){let m=pool[used++];if(!m){m=new T.Mesh(geo,mat(color));dynamic.add(m);pool.push(m);}m.geometry=geo;m.material=mat(color);m.visible=true;m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.rotation.set(0,0,0);m.castShadow=true;return m;}
  let lost=false;canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;canvas.style.display='none';document.getElementById('bmCanvas').style.visibility='visible';});canvas.addEventListener('webglcontextrestored',()=>{lost=false;canvas.style.display='';});
  return {draw(g){if(lost)return false;const rect=wrap.getBoundingClientRect(),portrait=rect.width<rect.height;
    // Right-side controls get their own space in landscape; bottom thumb area in portrait.
    const right=portrait?0:Math.min(190,rect.width*.23),bottom=portrait?Math.min(155,rect.height*.22):12,top=28;
    const width=Math.max(1,rect.width-right),height=Math.max(1,rect.height-bottom-top),key=[rect.width,rect.height,g.cols,g.rows].join(':');
    if(key!==sizeKey){sizeKey=key;renderer.setSize(rect.width,rect.height,false);frameArena(camera,g.cols,g.rows,width/height);sun.target.position.set(g.cols/2,0,g.rows/2);}
    const signature=g.mapId+g.cells.map(r=>r.map(c=>(c.solid||'.')+c.special).join('')).join('');if(signature!==boardKey){boardKey=signature;buildBoard(g);}
    const time=performance.now()/1000,all=[g.player,...g.enemies];for(const a of actors.values())a.group.visible=false;
    all.forEach((a,i)=>{if(!a.alive)return;const bot=i>0&&!a.human,key=i+':'+bot,color=[0x367fea,0xf3614a,0x46c58b,0xbc7be7][i%4];const model=actors.get(key)||character(key,bot,color);model.group.visible=true;model.group.position.set((a.rx??a.x)+.5,.08,(a.rz??a.z)+.5);model.group.rotation.y={down:0,up:Math.PI,left:-Math.PI/2,right:Math.PI/2}[a.facing]||0;model.limbs.forEach((l,j)=>l.rotation.x=a.moving?Math.sin(time*16+(j<2?0:Math.PI))*.6:0);model.ring.visible=i===(window.__bmLocalSlot||0);});
    used=0;for(const b of g.bombs){if(b.dead)continue;const pulse=1+Math.sin(time*(b.timer<.8?25:8))*.045;pooled(sphere,b.remote?0x674ca4:0x172334,b.rx+.5,.38,b.rz+.5,.31*pulse,.31*pulse,.31*pulse);pooled(cyl,0xd9b867,b.rx+.5,.76,b.rz+.5,.025,.18,.025);pooled(sphere,0xffae22,b.rx+.5,.86,b.rz+.5,.055,.055,.055);}
    const pickupColors={bomb:0x465984,fire:0xff7046,speed:0x67e8c9,remote:0xa986ff,kick:0x56a7ff,punch:0xe88cdd,carry:0xf0bb70,line:0xffe77b,shield:0x67caff};
    for(let z=0;z<g.rows;z++)for(let x=0;x<g.cols;x++){const c=g.cells[z][x];if(c.pickup&&!c.solid){const m=pooled(box,pickupColors[c.pickup]||0xffffff,x+.5,.38+Math.sin(time*3+x)*.06,z+.5,.36,.36,.36);m.rotation.y=time*.6;const iconKey='pickup:'+c.pickup;if(!materials.has(iconKey))materials.set(iconKey,new T.MeshStandardMaterial({map:texture('pu_'+c.pickup),color:0xffffff,roughness:.45}));m.material=materials.get(iconKey);}}
    for(const e of g.explosions){const s=.55+Math.max(0,e.t)*.65;pooled(sphere,0xffb42b,e.x+.5,.32,e.z+.5,s,.28,s);pooled(sphere,0xffeea8,e.x+.5,.45,e.z+.5,s*.65,.27,s*.65);}
    for(let i=used;i<pool.length;i++)pool[i].visible=false;
    renderer.setViewport(0,0,rect.width,rect.height);renderer.setScissorTest(false);renderer.clear();renderer.setViewport(0,bottom,width,height);renderer.setScissor(0,bottom,width,height);renderer.setScissorTest(true);renderer.render(scene,camera);renderer.setScissorTest(false);return true;
  }};
}
let instance,failed=false;
window.BombMan3D={draw(g){if(failed)return false;try{instance||=createRenderer(document.getElementById('bmBoardWrap'));return instance.draw(g);}catch(error){failed=true;console.error('3D renderer unavailable',error);document.getElementById('bmWebGL')?.remove();return false;}}};
