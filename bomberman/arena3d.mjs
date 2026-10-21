import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createCharacter } from './characters3d.mjs';
// Rendering stays separate from continuous movement and shared game snapshots.
const palettes={factory:[0x9aa6ad,0x263e51,0xffffff],temple:[0xb6b99b,0x38554b,0xffffff],ice:[0xccedff,0x34596f,0xdcefff],lava:[0xb4978d,0x452c35,0xffe2c2]};
export function frameArena(camera,cols,rows,aspect){
  camera.aspect=aspect;camera.zoom=1;
  const target=new T.Vector3(cols/2,.35,rows/2),axis=new T.Vector3(0,15,14).normalize(),points=[];
  for(const x of [-.48,cols+.48])for(const z of [-.48,rows+.48])for(const y of [-.65,1.65])points.push(new T.Vector3(x,y,z));
  // Fit the actual rim and character envelope; the old framing wasted the short phone viewport.
  let lo=5,hi=90;
  for(let n=0;n<18;n++){const distance=(lo+hi)/2;camera.position.copy(target).addScaledVector(axis,distance);camera.lookAt(target);camera.updateMatrixWorld();camera.updateProjectionMatrix();if(points.every(p=>{const v=p.clone().project(camera);return Math.abs(v.x)<.965&&Math.abs(v.y)<.955;}))hi=distance;else lo=distance;}
  camera.position.copy(target).addScaledVector(axis,hi);camera.lookAt(target);camera.updateMatrixWorld();camera.updateProjectionMatrix();
  camera.userData.arenaOffset=camera.position.clone().sub(target);camera.userData.arenaFocus=target.clone();
  return points;
}
export function zoomArena(camera,cols,rows,zoom,actor,blend=1){
  const amount=Math.max(1,Math.min(2.4,Number(zoom)||1)),center=new T.Vector3(cols/2,.35,rows/2);
  const target=center.clone();
  if(actor&&amount>1){
    const x=(actor.rx??actor.x)+.5,z=(actor.rz??actor.z)+.5;
    // Zoom follows your character, while keeping the camera near the board at the edges.
    const mx=cols/(2*amount),mz=rows/(2*amount);
    target.x=T.MathUtils.clamp(x,mx,cols-mx);target.z=T.MathUtils.clamp(z,mz,rows-mz);
  }
  const focus=camera.userData.arenaFocus||center;
  // Zoom changes need a matching focus immediately; easing only the focus would clip
  // a corner player during pinch, and FIT would briefly leave half the arena outside view.
  const focusBlend=amount===1||Math.abs(camera.zoom-amount)>.0001?1:Math.max(0,Math.min(1,blend));
  focus.lerp(target,focusBlend);camera.userData.arenaFocus=focus;
  camera.zoom=amount;camera.position.copy(focus).add(camera.userData.arenaOffset);camera.lookAt(focus);camera.updateProjectionMatrix();camera.updateMatrixWorld();
}
function createRenderer(wrap){
  const renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.setClearColor(0x080f1b,0);renderer.outputColorSpace=T.SRGBColorSpace;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;
  const canvas=renderer.domElement;canvas.id='bmWebGL';canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none';wrap.prepend(canvas);
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(42,1,.1,150);
  scene.add(new T.HemisphereLight(0xc4e6ff,0x594338,2));
  const sun=new T.DirectionalLight(0xffe3b8,3);sun.position.set(-3,15,8);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-12,right:12,top:12,bottom:-12,near:1,far:45});sun.shadow.bias=-.001;sun.shadow.normalBias=.025;scene.add(sun);scene.add(sun.target);
  const fill=new T.DirectionalLight(0x67baff,1.7);fill.position.set(12,7,-8);scene.add(fill);
  const box=new T.BoxGeometry(1,1,1),beveled=new RoundedBoxGeometry(1,1,1,2,.05),sphere=new T.SphereGeometry(1,18,12),cyl=new T.CylinderGeometry(1,1,1,12),torus=new T.TorusGeometry(1,.14,5,24);
  const textures=new Map(),loader=new T.TextureLoader();function texture(name){if(!textures.has(name)){const t=loader.load('/bomberman/sprites/'+name+'.webp?v=2');t.colorSpace=T.SRGBColorSpace;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());textures.set(name,t);}return textures.get(name);}
  const materials=new Map();function mat(color,metalness=.1){const key=color+':'+metalness;if(!materials.has(key))materials.set(key,new T.MeshStandardMaterial({color,roughness:metalness>.4?.32:.6,metalness}));return materials.get(key);}
  function textured(name,color=0xffffff,metalness=.05){const key='texture:'+name+':'+color;if(!materials.has(key))materials.set(key,new T.MeshStandardMaterial({map:texture(name),color,roughness:metalness>.4?.42:.85,metalness}));return materials.get(key);}
  function glowing(color){const key='glow:'+color;if(!materials.has(key))materials.set(key,new T.MeshStandardMaterial({color,emissive:color,emissiveIntensity:1.2,roughness:.3}));return materials.get(key);}
  let board=new T.Group();scene.add(board);const actors=new Map(),dynamic=new T.Group();scene.add(dynamic);let boardKey='',sizeKey='',lastTime=0;
  function buildBoard(g){
    scene.remove(board);board.traverse(o=>{if(o.isInstancedMesh)o.dispose();});board=new T.Group();scene.add(board);
    const [floor,wall,wood]=palettes[g.mapId]||palettes.factory,batches=new Map(),dummy=new T.Object3D();
    // Batch repeated blocks and details. More artwork needn't mean hundreds more draw calls.
    function block(geo,material,x,y,z,sx,sy,sz,cast=true,ry=0){const key=geo.uuid+':'+(Array.isArray(material)?material.map(m=>m.uuid).join(','):material.uuid)+':'+cast;let b=batches.get(key);if(!b){b={geo,material,cast,transforms:[]};batches.set(key,b);}dummy.position.set(x,y,z);dummy.scale.set(sx,sy,sz);dummy.rotation.set(0,ry,0);dummy.updateMatrix();b.transforms.push(dummy.matrix.clone());}
    const stone=textured('tex_stone',floor),rim=mat(wall,.3),metalSide=textured('tex_metal_side',0xdbe6ee,.6),metalTop=textured('tex_metal',0xffffff,.6),crateSide=textured('tex_crate_side',wood),crateTop=textured('tex_crate',wood);
    const metalFaces=[metalSide,metalSide,metalTop,metalSide,metalSide,metalSide],crateFaces=[crateSide,crateSide,crateTop,crateSide,crateSide,crateSide];
    block(beveled,rim,g.cols/2,-.37,g.rows/2,g.cols+.8,.6,g.rows+.8);
    block(box,mat(0x0a1821),g.cols/2,-.66,g.rows/2,g.cols+.45,.1,g.rows+.45,false);
    for(let z=0;z<g.rows;z++)for(let x=0;x<g.cols;x++){
      const c=g.cells[z][x],special=c.special&&['lava','ice','water','conveyor','bush'].includes(c.special)?c.special:null;
      block(box,special?textured('tex_'+special):stone,x+.5,-.015,z+.5,.96,.15,.96,false);
      if(c.solid){const hard=c.solid==='hard';block(beveled,hard?metalFaces:crateFaces,x+.5,hard?.44:.38,z+.5,.9,hard?.88:.76,.9);
        if(!hard)for(const dx of [-.36,.36])block(box,mat(0x8d592e),x+.5+dx,.77,z+.5,.065,.035,.86,false);
      }
      if(special==='lava')block(box,glowing(0xff6015),x+.5,.063,z+.5,.76,.012,.035,false);
      if(special==='conveyor')for(let i=0;i<3;i++)block(box,mat(0x292f36,.6),x+.2+i*.3,.07,z+.5,.07,.02,.7,false);
    }
    for(const z of [-.2,g.rows+.2])block(beveled,rim,g.cols/2,.02,z,g.cols+.75,.19,.25,false);
    for(const x of [-.2,g.cols+.2])block(beveled,rim,x,.02,g.rows/2,.25,.19,g.rows+.75,false);
    const accent=g.mapId==='lava'?0xff8e3b:g.mapId==='temple'?0x80d6a9:0x70d7ff;
    for(const x of [-.2,g.cols+.2])for(const z of [-.2,g.rows+.2]){block(beveled,mat(0x526579,.7),x,.08,z,.35,.16,.35,false);block(box,glowing(accent),x,.17,z,.16,.025,.16,false);}
    for(const b of batches.values()){const batch=new T.InstancedMesh(b.geo,b.material,b.transforms.length);b.transforms.forEach((m,i)=>batch.setMatrixAt(i,m));batch.castShadow=b.cast;batch.receiveShadow=true;batch.instanceMatrix.needsUpdate=true;board.add(batch);}
    wrap.style.backgroundImage=`linear-gradient(180deg,rgba(5,12,22,.68),rgba(5,12,22,.38)),url('/bomberman/sprites/bg_${g.mapId in palettes?g.mapId:'factory'}.webp')`;wrap.style.backgroundSize='cover';wrap.style.backgroundPosition='center';
  }
  const pool=[];let used=0;function pooled(geo,color,x,y,z,sx,sy,sz,metal=.1){let m=pool[used++];if(!m){m=new T.Mesh(geo,mat(color,metal));dynamic.add(m);pool.push(m);}m.geometry=geo;m.material=mat(color,metal);m.visible=true;m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.rotation.set(0,0,0);m.castShadow=true;return m;}
  let lost=false;canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;canvas.style.display='none';document.getElementById('bmCanvas').style.visibility='visible';});canvas.addEventListener('webglcontextrestored',()=>{lost=false;canvas.style.display='';});
  return {draw(g){if(lost)return false;const rect=wrap.getBoundingClientRect(),portrait=rect.width<rect.height;
    const right=portrait?0:Math.min(175,rect.width*.21),bottom=portrait?Math.min(140,rect.height*.2):3,top=portrait?35:14;
    const width=Math.max(1,rect.width-right),height=Math.max(1,rect.height-bottom-top),key=[rect.width,rect.height,g.cols,g.rows].join(':');
    if(key!==sizeKey){sizeKey=key;renderer.setSize(rect.width,rect.height,false);frameArena(camera,g.cols,g.rows,width/height);sun.target.position.set(g.cols/2,0,g.rows/2);}
    const signature=g.mapId+g.cells.map(r=>r.map(c=>(c.solid||'.')+c.special).join('')).join('');if(signature!==boardKey){boardKey=signature;buildBoard(g);}
    const time=performance.now()/1000,dt=Math.min(.1,Math.max(0,time-lastTime));lastTime=time;
    const all=[g.player,...g.enemies],localSlot=window.__bmLocalSlot||0;
    zoomArena(camera,g.cols,g.rows,window.BombManZoom?.get()||1,all[localSlot]||g.player,1-Math.exp(-dt*8));
    for(const a of actors.values())a.group.visible=false;
    all.forEach((a,i)=>{if(!a.alive)return;const bot=i>0&&!a.human,key=i+':'+bot,color=[0x246fd7,0xdf4a40,0x26a86f,0x9958d1][i%4];let model=actors.get(key);if(!model){model=createCharacter({bot,color});actors.set(key,model);scene.add(model.group);}model.group.visible=true;model.group.position.set((a.rx??a.x)+.5,.08+(a.moving?Math.abs(Math.sin(time*16))*.018:Math.sin(time*2.8+i)*.008),(a.rz??a.z)+.5);model.group.rotation.y={down:0,up:Math.PI,left:-Math.PI/2,right:Math.PI/2}[a.facing]||0;model.limbs.forEach((l,j)=>l.rotation.x=a.moving?Math.sin(time*16+[0,Math.PI,Math.PI,0][j])*.48:0);model.ring.visible=i===localSlot;});
    used=0;
    for(const b of g.bombs){if(b.dead)continue;const pulse=1+Math.sin(time*(b.timer<.8?25:8))*.045,x=b.rx+.5,z=b.rz+.5;pooled(sphere,b.remote?0x674ca4:0x141e32,x,.38,z,.32*pulse,.32*pulse,.32*pulse,.65);
      pooled(cyl,0xd8b578,x,.7,z,.09,.06,.09,.65);const fuse=pooled(cyl,0xd9b867,x+.03,.8,z,.026,.2,.026);fuse.rotation.z=-.3;
      const spark=pooled(sphere,0xffae22,x+.055,.9,z,.05,.05,.05);spark.material=glowing(0xff9b28);
      pooled(sphere,0xffe3aa,x,.4,z+.3,.13,.13,.035);for(const s of [-1,1])pooled(sphere,0x10192a,x+s*.048,.42,z+.332,.033,.037,.016);pooled(box,0xffe3aa,x,.29,z+.31,.12,.075,.035);
    }
    const pickupColors={bomb:0x87afff,fire:0xff7046,speed:0x67e8c9,remote:0xa986ff,kick:0x56a7ff,punch:0xe88cdd,carry:0xf0bb70,line:0xffe77b,shield:0x67caff};
    for(let z=0;z<g.rows;z++)for(let x=0;x<g.cols;x++){const c=g.cells[z][x];if(c.pickup&&!c.solid){const color=pickupColors[c.pickup]||0xffffff;const ring=pooled(torus,color,x+.5,.12,z+.5,.28,.28,.28);ring.rotation.x=Math.PI/2;ring.material=glowing(color);ring.castShadow=false;
      const m=pooled(beveled,color,x+.5,.39+Math.sin(time*3+x)*.06,z+.5,.42,.42,.42);m.rotation.y=time*.6;m.material=textured('pu_'+c.pickup);}}
    for(const e of g.explosions){const s=.4+Math.max(0,e.t)*.65;const outer=pooled(sphere,0xff761c,e.x+.5,.32,e.z+.5,s,.3,s);outer.material=glowing(0xff6414);outer.castShadow=false;const inner=pooled(sphere,0xffeea8,e.x+.5,.43,e.z+.5,s*.6,.25,s*.6);inner.material=glowing(0xffdc79);inner.castShadow=false;}
    for(let i=used;i<pool.length;i++)pool[i].visible=false;
    renderer.setViewport(0,0,rect.width,rect.height);renderer.setScissorTest(false);renderer.clear();renderer.setViewport(0,bottom,width,height);renderer.setScissor(0,bottom,width,height);renderer.setScissorTest(true);renderer.render(scene,camera);renderer.setScissorTest(false);return true;
  }};
}
let instance,failed=false;
window.BombMan3D={draw(g){if(failed)return false;try{instance||=createRenderer(document.getElementById('bmBoardWrap'));return instance.draw(g);}catch(error){failed=true;console.error('3D renderer unavailable',error);document.getElementById('bmWebGL')?.remove();return false;}}};
