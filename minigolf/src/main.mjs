// StarMuff Mini Golf: three.js renderer, input, modes (solo, hotseat, CPU, online room).
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { THEMES, HOLES, DEFAULT_COURSE, QUICK_COURSE, holeById, cells, cellAt, isFloor, cellTop, cupPos, teePos, moverPos, portalPads, loopPath, BALL_R, CUP_R, PORTAL_R, PLATEAU, JUMP_H } from './courses.mjs';
import { createMatch, validShot, shotOf, applyResult, hole as holeOf, totals, publicState, moverPhase } from './rules.mjs';
import { initPhysics, simulateShot, HZ } from './physics.mjs';
import { chooseShot } from './cpu.mjs';
import { createAudio } from './audio.mjs';

const $ = id => document.getElementById(id);
const ASSET = new URL('./assets/', document.baseURI.replace(/[^/]*$/, '')).href;
const audio = createAudio();

// ---------- renderer ----------
const canvas = $('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, 1, 0.05, 200);
scene.add(new THREE.HemisphereLight(0xcfe8ff, 0x251433, 1.4));
const sun = new THREE.DirectionalLight(0xffffff, 2.2); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 0.5, far: 40 }); scene.add(sun, sun.target);
const texLoader = new THREE.TextureLoader(), gltf = new GLTFLoader(), models = {}, skies = {};
function sky(file) { return skies[file] ||= texLoader.load(ASSET + file, t => { t.colorSpace = THREE.SRGBColorSpace; }); }
function loadModel(name) { return models[name] ||= gltf.loadAsync(ASSET + name + '.glb').then(g => g.scene).catch(() => null); }
function fitModel(obj, size) { const box = new THREE.Box3().setFromObject(obj), s = box.getSize(new THREE.Vector3()), k = size / Math.max(s.x, s.y, s.z); obj.scale.setScalar(k); const b2 = new THREE.Box3().setFromObject(obj), c = b2.getCenter(new THREE.Vector3()); obj.position.sub(new THREE.Vector3(c.x, b2.min.y, c.z)); const wrap = new THREE.Group(); wrap.add(obj); return wrap; }

// Ball texture: soft dimples + one dark marker dot, mostly white so the chosen ball
// colour tints it and the roll reads clearly as the ball moves.
const ballTex = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 256, 128); g.fillStyle = 'rgba(0,0,0,0.15)';
  for (let y = 8; y < 128; y += 16) for (let x = ((y / 16) % 2) * 8; x < 256; x += 16) { g.beginPath(); g.arc(x + 8, y, 3.2, 0, 7); g.fill(); }
  g.fillStyle = 'rgba(15,15,25,0.9)'; g.beginPath(); g.arc(64, 64, 7, 0, 7); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const ballGeo = new THREE.SphereGeometry(BALL_R, 24, 16);
const balls = [0xffffff, 0xffc93c].map(color => { const m = new THREE.Mesh(ballGeo, new THREE.MeshStandardMaterial({ color, map: ballTex, roughness: 0.35, emissive: color, emissiveIntensity: 0.08 })); m.castShadow = true; scene.add(m); return m; });
// True rolling: rotate each ball by the distance it travelled, around the ground axis.
const ballPrev = [new THREE.Vector3(), new THREE.Vector3()];
function rollBall(i) { const b = balls[i], dx = b.position.x - ballPrev[i].x, dz = b.position.z - ballPrev[i].z, dist = Math.hypot(dx, dz);
  if (dist > 1e-5 && dist < 0.5) { const axis = new THREE.Vector3(dz / dist, 0, -dx / dist); b.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(axis, dist / BALL_R)); }
  ballPrev[i].copy(b.position); }
// Shot trail: a fading streak behind the moving ball.
const TRAIL_N = 30, trailPos = new Float32Array(TRAIL_N * 3);
const trailGeo = new THREE.BufferGeometry(); trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
const trail = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 })); trail.frustumCulled = false; trail.visible = false; scene.add(trail);
let trailPts = [], trailTtl = 0;
function pushTrail(p) { trailPts.push(p.x, p.y, p.z); if (trailPts.length > TRAIL_N * 3) trailPts.splice(0, trailPts.length - TRAIL_N * 3);
  trailPos.set(trailPts); trailGeo.attributes.position.needsUpdate = true; trailGeo.setDrawRange(0, trailPts.length / 3); trail.visible = trailPts.length > 3; }
const aimArrow = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 12), new THREE.MeshBasicMaterial({ color: 0xffffff }));
const aimLine = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.01, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 }));
aimArrow.rotation.x = -Math.PI / 2; const aimGroup = new THREE.Group(); aimGroup.add(aimLine, aimArrow); aimGroup.visible = false; scene.add(aimGroup);

// ---------- confetti ----------
const bursts = [];
function burst(pos, colors, n = 80) {
  for (const color of colors) {
    const geo = new THREE.BufferGeometry(), p0 = new Float32Array(n * 3), vel = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { p0[i * 3] = pos[0]; p0[i * 3 + 1] = pos[1] + 0.05; p0[i * 3 + 2] = pos[2];
      const a = Math.random() * Math.PI * 2, r = Math.random() * 1.6; vel[i * 3] = Math.cos(a) * r; vel[i * 3 + 1] = 1.6 + Math.random() * 2.2; vel[i * 3 + 2] = Math.sin(a) * r; }
    geo.setAttribute('position', new THREE.BufferAttribute(p0, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size: 0.055, transparent: true, opacity: 1, depthWrite: false }));
    scene.add(pts); bursts.push({ pts, vel, life: 0 });
  }
}
function stepBursts(dt) {
  for (let i = bursts.length - 1; i >= 0; i--) { const b = bursts[i]; b.life += dt; const attr = b.pts.geometry.attributes.position, arr = attr.array;
    for (let j = 0; j < attr.count; j++) { b.vel[j * 3 + 1] -= 4.2 * dt; arr[j * 3] += b.vel[j * 3] * dt; arr[j * 3 + 1] = Math.max(0.02, arr[j * 3 + 1] + b.vel[j * 3 + 1] * dt); arr[j * 3 + 2] += b.vel[j * 3 + 2] * dt; }
    attr.needsUpdate = true; b.pts.material.opacity = Math.max(0, 1 - b.life / 1.5);
    if (b.life > 1.5) { scene.remove(b.pts); b.pts.geometry.dispose(); b.pts.material.dispose(); bursts.splice(i, 1); } }
}

// Procedural grain for felt/sand: a tiny noise texture used as a bump map, so flat colour
// reads as fabric/sand under the light instead of plastic. Visual only, built once.
const grainTex = (() => { const s = 128, data = new Uint8Array(s * s * 4);
  for (let i = 0; i < s * s; i++) { const v = 185 + Math.floor(Math.random() * 70); data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = v; data[i * 4 + 3] = 255; }
  const t = new THREE.DataTexture(data, s, s); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2); t.needsUpdate = true; return t; })();

let course = null; // { group, movers:[{m, mesh}], hole }
function wedge(x, z, h = PLATEAU) { const b = -0.2, v = [[x - .5, b, z - .5], [x + .5, b, z - .5], [x - .5, b, z + .5], [x + .5, b, z + .5], [x - .5, h, z - .5], [x + .5, h, z - .5], [x - .5, 0, z + .5], [x + .5, 0, z + .5]];
  const f = [[4, 6, 7], [4, 7, 5], [0, 1, 3], [0, 3, 2], [0, 4, 5], [0, 5, 1], [2, 3, 7], [2, 7, 6], [0, 2, 6], [0, 6, 4], [1, 5, 7], [1, 7, 3]], pos = [];
  for (const t of f) for (const i of t) pos.push(...v[i]); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  // mergeGeometries() refuses mixed attribute sets: the wedge must carry uv like the box/cylinder geometries it merges with.
  g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(pos.length / 3 * 2), 2)); g.computeVertexNormals(); return g; }
function buildCourse(hole) {
  if (course) { scene.remove(course.group); course.group.traverse(o => { o.geometry?.dispose?.(); }); }
  const th = THEMES[hole.theme], group = new THREE.Group(), feltA = [], feltB = [], rails = [], bumps = [], sand = [], jump = [];
  for (const { col: x, row: z, ch } of cells(hole)) {
    if (ch === '/') feltA.push(wedge(x, z));
    else if (ch === 'j') { jump.push(wedge(x, z, JUMP_H));
      const lip = new THREE.BoxGeometry(1, 0.04, 0.32); lip.rotateX(0.42); lip.translate(x, JUMP_H + 0.01, z - 0.60); jump.push(lip); }
    else { const top = cellTop(ch), g = new THREE.BoxGeometry(1, top + 0.2, 1); g.translate(x, (top - 0.2) / 2, z); if (ch === 's') sand.push(g); else ((x + z) % 2 ? feltA : feltB).push(g); }
    if (ch === 'o') { const g = new THREE.CylinderGeometry(0.18, 0.18, 0.4, 24); g.translate(x, 0.2, z); bumps.push(g); }
    const surfTop = ch === '/' ? PLATEAU : ch === 'j' ? JUMP_H : cellTop(ch);
    const top = surfTop + 0.32 + (surfTop >= PLATEAU ? 0.3 : 0); // matches physics: plateau rails stand taller
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { if (isFloor(cellAt(hole, x + dc, z + dr))) continue;
      const g = new THREE.BoxGeometry(dc ? 0.1 : 1.2, top + 0.2, dr ? 0.1 : 1.2); g.translate(x + dc * 0.55, (top - 0.2) / 2, z + dr * 0.55); rails.push(g); }
  }
  // Merge defensively: normalize to non-indexed first, and if a merge ever fails, add the parts
  // as separate meshes. A null-geometry mesh in the scene makes renderer.render throw every frame.
  const mesh = (geos, mat) => { if (!geos.length) return null; const norm = geos.map(g => g.index ? g.toNonIndexed() : g), merged = mergeGeometries(norm);
    const add = g => { const m = new THREE.Mesh(g, mat); m.receiveShadow = true; m.castShadow = true; group.add(m); return m; };
    if (merged) return add(merged); for (const g of norm) add(g); return null; };
  mesh(feltA, new THREE.MeshStandardMaterial({ color: th.felt, roughness: 0.92, bumpMap: grainTex, bumpScale: 0.2 }));
  mesh(feltB, new THREE.MeshStandardMaterial({ color: th.felt2, roughness: 0.92, bumpMap: grainTex, bumpScale: 0.2 }));
  mesh(rails, new THREE.MeshStandardMaterial({ color: th.rail, roughness: 0.35, metalness: 0.4 }));
  const bumpMat = new THREE.MeshStandardMaterial({ color: th.accent, emissive: th.accent, emissiveIntensity: 0.6, roughness: 0.3 });
  mesh(bumps, bumpMat);
  mesh(sand, new THREE.MeshStandardMaterial({ color: 0xd9b36a, roughness: 1, bumpMap: grainTex, bumpScale: 0.6 }));
  // The board: a base slab + accent trim under the whole layout, so the course sits on a
  // table instead of floating over the backdrop.
  { const all = cells(hole), cxs = all.map(c => c.col), czs = all.map(c => c.row);
    const w = Math.max(...cxs) - Math.min(...cxs) + 1, d = Math.max(...czs) - Math.min(...czs) + 1;
    const cxm = (Math.min(...cxs) + Math.max(...cxs)) / 2, czm = (Math.min(...czs) + Math.max(...czs)) / 2;
    const slab = new THREE.Mesh(new THREE.BoxGeometry(w + 1.5, 0.52, d + 1.5), new THREE.MeshStandardMaterial({ color: 0x0a0d15, roughness: 0.75, metalness: 0.15 }));
    slab.position.set(cxm, -0.46, czm); slab.receiveShadow = true; group.add(slab);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(w + 1.62, 0.055, d + 1.62), new THREE.MeshStandardMaterial({ color: th.rail, roughness: 0.35, metalness: 0.45 }));
    trim.position.set(cxm, -0.215, czm); group.add(trim);
    // Corner posts with glowing tips frame the board like a table.
    const postMat = new THREE.MeshStandardMaterial({ color: 0x1a2130, roughness: 0.5, metalness: 0.4 });
    const tipMat = new THREE.MeshStandardMaterial({ color: th.accent, emissive: th.accent, emissiveIntensity: 0.9, roughness: 0.4 });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const px = cxm + sx * ((w + 1.5) / 2 - 0.16), pz = czm + sz * ((d + 1.5) / 2 - 0.16);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.52, 10), postMat); post.position.set(px, -0.2, pz); post.castShadow = true; group.add(post);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), tipMat); tip.position.set(px, 0.08, pz); group.add(tip); } }
  // Obstacle color code (real courses do the same): jump ramps are always orange.
  mesh(jump, new THREE.MeshStandardMaterial({ color: 0xff6a00, emissive: 0xff6a00, emissiveIntensity: 0.18, roughness: 0.55 }));
  const cup = cupPos(hole);
  const hole3 = new THREE.Mesh(new THREE.CircleGeometry(CUP_R, 32), new THREE.MeshBasicMaterial({ color: 0x050505 })); hole3.rotation.x = -Math.PI / 2; hole3.position.set(cup[0], cup[1] + 0.002, cup[2]); group.add(hole3);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(CUP_R + 0.02, 0.014, 10, 32), new THREE.MeshStandardMaterial({ color: th.accent, emissive: th.accent, emissiveIntensity: 0.35, roughness: 0.4 }));
  rim.rotation.x = Math.PI / 2; rim.position.set(cup[0], cup[1] + 0.006, cup[2]); group.add(rim);
  const cupGlow = new THREE.PointLight(th.accent, 2.4, 5, 1.8); cupGlow.position.set(cup[0], cup[1] + 0.55, cup[2]); group.add(cupGlow);
  // Crater cups (on a plateau) get a lava ring; it pulses with the idle animation.
  const lavaMeshes = [];
  if (cellAt(hole, Math.round(cup[0]), Math.round(cup[2])) === 'h') { const lava = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.04, 10, 36), new THREE.MeshStandardMaterial({ color: 0x3a0d00, emissive: 0xff4400, emissiveIntensity: 1.1, roughness: 0.6 }));
    lava.rotation.x = Math.PI / 2; lava.position.set(cup[0], cup[1] + 0.012, cup[2]); group.add(lava); lavaMeshes.push(lava); }
  const tee = teePos(hole);
  const teeRing = new THREE.Mesh(new THREE.RingGeometry(0.13, 0.185, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, side: THREE.DoubleSide }));
  teeRing.rotation.x = -Math.PI / 2; teeRing.position.set(tee[0], tee[1] - BALL_R + 0.004, tee[2]); group.add(teeRing);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.8, 8), new THREE.MeshStandardMaterial({ color: 0xeeeeee })); pole.position.set(cup[0], cup[1] + 0.4, cup[2]); group.add(pole);
  const flagGeo = new THREE.PlaneGeometry(0.28, 0.18); flagGeo.translate(0.14, 0, 0); // pivot on the pole edge so the flag can wave
  const flag = new THREE.Mesh(flagGeo, new THREE.MeshStandardMaterial({ color: th.accent, emissive: th.accent, emissiveIntensity: 0.5, side: THREE.DoubleSide })); flag.position.set(cup[0], cup[1] + 0.7, cup[2]); group.add(flag);
  const portalMeshes = portalPads(hole).map(p => {
    const disc = new THREE.Mesh(new THREE.CircleGeometry(PORTAL_R, 28), new THREE.MeshBasicMaterial({ color: th.accent, transparent: true, opacity: 0.35 }));
    disc.rotation.x = -Math.PI / 2; disc.position.set(p[0], p[1] + 0.006, p[2]); group.add(disc);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.035, 10, 28), new THREE.MeshStandardMaterial({ color: 0x111122, emissive: th.accent, emissiveIntensity: 0.9, roughness: 0.3 }));
    ring.position.set(p[0], p[1] + 0.32, p[2]); group.add(ring); return { ring, disc }; });
  // Loop track: a U-channel swept along the shared loop path (blue — the obstacle color code,
  // same convention as real courses). Struts hold it up where it leaves the ground.
  const loopMeshes = [], lp = loopPath(hole);
  if (lp) {
    const prof = [[-0.235, 0.10], [-0.205, 0.02], [-0.17, 0], [0.17, 0], [0.205, 0.02], [0.235, 0.10]], pos = [], idx = [];
    lp.forEach((p, i) => { const q = lp[Math.min(i + 1, lp.length - 1)], yaw = Math.atan2(q.x - p.x, -(q.z - p.z));
      const lx = Math.cos(yaw), lz = -Math.sin(yaw), ny = Math.cos(p.phi), nz = Math.sin(p.phi);
      for (const [u, v] of prof) pos.push(p.x + lx * u, p.y + ny * v, p.z + lz * u + nz * v);
      if (i) { const a = (i - 1) * 6, b = i * 6; for (let k = 0; k < 5; k++) idx.push(a + k, b + k, a + k + 1, b + k, b + k + 1, a + k + 1); } });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(pos.length / 3 * 2), 2));
    g.setIndex(idx); g.computeVertexNormals();
    const track = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x2456d6, emissive: 0x2456d6, emissiveIntensity: 0.22, roughness: 0.4, metalness: 0.25, side: THREE.DoubleSide }));
    track.castShadow = true; track.receiveShadow = true; group.add(track); loopMeshes.push(track);
    const struts = [];
    for (let i = 6; i < lp.length - 12; i += 6) { const p = lp[i]; if (p.y < 0.35) continue;
      const s = new THREE.BoxGeometry(0.06, p.y, 0.06); s.translate(p.x, p.y / 2, p.z); struts.push(s); }
    mesh(struts, new THREE.MeshStandardMaterial({ color: 0x8a93a6, roughness: 0.6, metalness: 0.4 }));
  }
  const movers = (hole.movers || []).map(m => { const box = new THREE.Mesh(new THREE.BoxGeometry(m.size, m.size, m.size), new THREE.MeshStandardMaterial({ color: 0x111122, emissive: th.accent, emissiveIntensity: 0.25, transparent: true, opacity: 0.55 })); box.castShadow = true; group.add(box);
    loadModel(m.model).then(src => { if (src && box.parent) { const o = fitModel(src.clone(), m.size * 0.95); o.position.y = -m.size / 2; box.add(o); } }); return { m, mesh: box, mat: box.material }; });
  for (const d of hole.decor) loadModel(d.model).then(src => { if (!src || course?.group !== group) return; const o = fitModel(src.clone(), d.scale); o.position.set(d.x, 0, d.z); group.add(o); });
  scene.add(group); scene.background = sky(th.sky); scene.fog = new THREE.Fog(th.fog, 18, 60);
  const xs = cells(hole).map(c => c.col), zs = cells(hole).map(c => c.row), cx = (Math.min(...xs) + Math.max(...xs)) / 2, cz = (Math.min(...zs) + Math.max(...zs)) / 2;
  sun.position.set(cx + 4, 10, cz + 3); sun.target.position.set(cx, 0, cz);
  aimArrow.material.color.set(th.accent); aimLine.material.color.set(th.accent);
  course = { group, movers, hole, flag, bumpMat, portalMeshes, loopMeshes, lavaMeshes };
}

// ---------- camera ----------
const cam = { yaw: 0, dist: 3.4, height: 2.0, target: new THREE.Vector3(), want: new THREE.Vector3() };
function faceCup(pos, hole) { const c = cupPos(hole); cam.yaw = Math.atan2(pos[0] - c[0], pos[2] - c[2]); }
function forward() { return new THREE.Vector3(-Math.sin(cam.yaw), 0, -Math.cos(cam.yaw)); }
function updateCamera(dt) { cam.target.lerp(cam.want, 1 - Math.exp(-dt * 6)); const t = cam.target;
  camera.position.set(t.x + Math.sin(cam.yaw) * cam.dist, t.y + cam.height, t.z + Math.cos(cam.yaw) * cam.dist); camera.lookAt(t.x, t.y + 0.1, t.z); }
function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w < h ? 68 : 52; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();

// ---------- match state ----------
let mode = null, state = null, shown = null, queue = [], anim = null, mp = null, presence = true, cpuJob = null, level = 'normal', handoff = false, finishSent = false, lastAnimated = 0, holeShown = -1, courseIds = DEFAULT_COURSE, fly = null, celebrated = false;
const human = slot => mode === 'online' ? slot === mp?.slot : mode === 'cpu' ? slot === 0 : true;
const label = slot => mode === 'online' ? (slot === mp?.slot ? 'You' : 'Opponent') : mode === 'cpu' ? (slot === 0 ? 'You' : 'StarMuff CPU') : `Player ${slot + 1}`;
const idle = () => !anim && !queue.length;
const canShoot = () => shown && idle() && shown.phase === 'aim' && human(shown.turn) && !handoff && (mode !== 'online' || presence) && !$('menu').classList.contains('show');

function start(newMode, seed = (Math.random() * 2 ** 32) >>> 0, snapshot = null) {
  mode = newMode; queue = []; anim = null; cpuJob = null; finishSent = false; handoff = false; holeShown = -1; fly = null; celebrated = false;
  state = snapshot ? snapshot : createMatch({ seed, course: courseIds, solo: mode === 'solo', names: [0, 1].map(label) });
  shown = publicState(state); lastAnimated = state.turnId - 1; applyBallColor();
  hideOverlays(); show(); audio.unlock();
}
function hideOverlays() { for (const id of ['menu', 'overlay', 'scorecard']) $(id).classList.remove('show'); }

function takeShot(slot, cmd) {
  if (!validShot(state, slot, cmd)) return false;
  const shot = shotOf(state, slot, cmd), res = simulateShot(holeOf(state), shot);
  applyResult(state, shot, res); lastAnimated = shot.turnId;
  queue.push({ shot, res, after: publicState(state) });
  if (mode === 'online' && mp?.isHost) publish();
  return true;
}
function publish() { mp.publish({ kind: 'minigolf-state', state: publicState(state) }); if (state.phase === 'finished' && !finishSent) { finishSent = true; mp.finish({ winner: state.winner, totals: totals(state), reason: 'course-complete' }); } }
function adoptSnapshot(snap, resumed) {
  if (!snap || snap.kind !== 'minigolf-state' || snap.state?.version !== 1) return;
  const st = snap.state, ls = st.lastShot;
  if (!resumed && ls && ls.turnId > lastAnimated && state) {
    const hole = holeById(st.course[ls.hole]), res = simulateShot(hole, ls);
    if (Math.abs(res.end[0] - ls.end[0]) > 1e-4 || Math.abs(res.end[2] - ls.end[2]) > 1e-4) console.warn('minigolf: local replay differs from host; host result wins');
    res.end = ls.end; res.holed = ls.holed; lastAnimated = ls.turnId; state = st; queue.push({ shot: ls, res, after: publicState(st) });
  } else { state = st; lastAnimated = st.turnId - 1; if (idle()) { shown = publicState(st); show(); } else queue.push({ after: publicState(st) }); }
}

// ---------- input ----------
let drag = null; const MAXDRAG = () => Math.min(innerWidth, innerHeight) * 0.38;
function aimFromDrag(d) { const f = forward(), r = new THREE.Vector3(Math.cos(cam.yaw), 0, -Math.sin(cam.yaw)), dir = f.multiplyScalar(d.dy).add(r.multiplyScalar(-d.dx));
  const len = Math.hypot(d.dx, d.dy); return { dir: len > 1 ? dir.normalize() : forward(), power: Math.min(1, len / MAXDRAG()) }; }
let keyPower = 0.5, keyAim = false;
canvas.addEventListener('pointerdown', e => { audio.unlock(); fly = null; if (e.button === 2 || !canShoot()) { drag = { rotate: true, x: e.clientX }; } else drag = { x0: e.clientX, y0: e.clientY, dx: 0, dy: 0 }; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', e => { if (!drag) return; if (drag.rotate) { cam.yaw -= (e.clientX - drag.x) * 0.008; drag.x = e.clientX; return; } drag.dx = e.clientX - drag.x0; drag.dy = e.clientY - drag.y0; });
canvas.addEventListener('pointerup', () => { const d = drag; drag = null; if (!d || d.rotate || !canShoot()) return; const a = aimFromDrag(d); if (a.power < 0.04) return; fire(a.dir, a.power); });
canvas.addEventListener('pointercancel', () => { drag = null; });
canvas.addEventListener('contextmenu', e => e.preventDefault());
addEventListener('keydown', e => { if (e.target.closest?.('input,textarea')) return; fly = null;
  if (e.key === 'ArrowLeft' || e.key === 'a') cam.yaw += 0.05; else if (e.key === 'ArrowRight' || e.key === 'd') cam.yaw -= 0.05;
  else if (e.key === 'ArrowUp' || e.key === 'w') { keyAim = true; keyPower = Math.min(1, keyPower + 0.04); } else if (e.key === 'ArrowDown' || e.key === 's') { keyAim = true; keyPower = Math.max(0.05, keyPower - 0.04); }
  else if (e.key === ' ' && canShoot()) { e.preventDefault(); fire(forward(), keyPower); keyAim = false; } else return; e.preventDefault(); });
$('rotL').onclick = () => { cam.yaw += Math.PI / 8; }; $('rotR').onclick = () => { cam.yaw -= Math.PI / 8; };
function fire(dir, power) {
  const cmd = { turnId: shown.turnId, dx: Math.round(dir.x * 1000), dz: Math.round(dir.z * 1000), power: Math.max(1, Math.round(power * 1000)) };
  audio.putt(power);
  if (mode === 'online' && !mp.isHost) { if (validShot(state, mp.slot, cmd)) { mp.send('shot', cmd); shown.phase = 'sent'; show(); } return; }
  takeShot(shown.turn, cmd);
}

// ---------- HUD ----------
function show() {
  if (!shown) return; const hole = holeOf(shown);
  if (holeShown !== shown.holeIdx || course?.hole !== hole) { holeShown = shown.holeIdx; buildCourse(hole); faceCup(shown.pos[shown.turn], hole); banner(`Hole ${shown.holeIdx + 1} · ${hole.name}`, `${THEMES[hole.theme].name} · Par ${hole.par}`); cpuHoleIntro(hole);
    const tp = teePos(hole), cp = cupPos(hole); fly = { t: 0, from: new THREE.Vector3(tp[0], tp[1], tp[2]), to: new THREE.Vector3(cp[0], cp[1], cp[2]) }; }
  $('holeName').textContent = `${shown.holeIdx + 1}/${shown.course.length} · ${hole.name}`; $('holePar').textContent = `Par ${hole.par}`;
  const t = totals(shown), players = shown.solo ? [0] : [0, 1];
  $('players').replaceChildren(...players.map(i => { const el = document.createElement('div'); el.className = 'chip p' + i + (i === shown.turn && shown.phase !== 'finished' ? ' on' : '');
    el.textContent = `${label(i)} · ${shown.strokes[i][shown.holeIdx]} this hole · ${t[i]} total${shown.holed[i] && !shown.solo ? ' ✓' : ''}`; return el; }));
  const waiting = shown.phase === 'sent' ? 'Shot sent…' : shown.phase === 'finished' ? shown.message : !presence && mode === 'online' ? 'Opponent disconnected: paused' : canShoot() ? 'Drag back from anywhere and release to putt' : idle() ? `${label(shown.turn)} to putt…` : '';
  $('status').textContent = (shown.message && shown.phase !== 'finished' ? shown.message + ' ' : '') + waiting;
  balls[1].visible = !shown.solo;
  if (shown.phase === 'finished' && idle()) scorecard(true);
  if (idle() && shown.phase === 'aim') { if (mode === 'hotseat' && shown.turnId > 1 && turnSeen !== shown.turnId && turnSeenSlot !== shown.turn) { handoff = true; overlay(`Pass to ${label(shown.turn)}`, 'Hand over the device when ready.', 'Ready', () => { handoff = false; show(); }); }
    if (turnSeen !== shown.turnId) { turnSeen = shown.turnId; turnSeenSlot = shown.turn; faceCup(shown.pos[shown.turn], hole); } maybeCpu(); }
}
let turnSeen = 0, turnSeenSlot = 0;
function banner(title, sub) { const b = $('banner'); b.querySelector('b').textContent = title; b.querySelector('span').textContent = sub; b.classList.remove('show'); void b.offsetWidth; b.classList.add('show'); }
function overlay(title, text, button, cb) { $('ovTitle').textContent = title; $('ovText').textContent = text; $('ovBtn').textContent = button; $('ovBtn').onclick = () => { $('overlay').classList.remove('show'); cb?.(); }; $('overlay').classList.add('show'); }

// ---------- CPU dialogue (presentation only — never touches the sim) ----------
const CPU_LINES = {
  intro: ['This one? I have played it ten thousand times. In simulation.', 'Watch the slopes here. Or do not. Your funeral.', 'I like this hole. It humbles people.', 'Ten holes, one winner. A hint: it is usually me.'],
  cpuHoled: ['Calculated. Obviously.', 'That is how it is done.', 'I make this look easy because, for me, it is.', 'File that under: inevitable.'],
  cpuNear: ['Close enough to scare you.', 'Tap-in. Watch and learn.', 'A whisker away. The cup is nervous.'],
  cpuBad: ['That was a deliberate test of the physics. It passed.', 'Recalibrating… ignore that one.', 'The wind. Definitely the wind. In space.', 'I meant to do that. Probably.'],
  youHoled: ['...Fine. That was decent.', 'Lucky bounce. I have the replay.', 'Enjoy it. I learn from every mistake you survive.', 'One good putt does not make a comeback. Usually.'],
  youBad: ['Ouch. Even my sympathy subroutine felt that.', 'The cup is the round part, if that helps.', 'Bold strategy. Shame about the result.', 'I will pretend I did not see that. You should too.'],
  cpuWins: ['Good game. The rematch button is right there — I insist.', 'Victory logged. Your improvement is noted. And encouraged. Barely.'],
  cpuLoses: ['...Recount requested. Denied by myself. Fine — good game.', 'You beat the machine. Do not let it go to your head. Rematch?'],
  draw: ['A draw. Statistically rude.'],
};
const CPU_HOLE_LINES = {
  'loop-the-loop': 'The loop? Full send or go home. I always send it.',
  'trap-jump': 'Mind the sand. It is hungrier than it looks.',
  'portal-panic': 'Portals. Try not to think about the physics.',
  'ice-shelf': 'Everything here slides. Everything.',
  'null-cube-gate': 'The gate moves. So should you. Eventually.',
  'volcano': 'Aim for the crater. Mind the ash on the way up.',
  'gauntlet': 'Two gates. No mercy. Time it.',
  'ice-bridge': 'One bridge. Sand everywhere else. Choose wisely.',
  'downhill': 'Downhill. Everything runs hot here — including your putts.',
  'grand-finale': 'The finale. A gate, a portal, and a guarded green. Good luck.',
};
let cpuLineTimer = null, lastCpuLine = '';
function cpuSay(pool) { if (mode !== 'cpu' || !pool?.length) return; const el = $('cpuBubble'); if (!el) return;
  let line; do { line = pool[Math.floor(Math.random() * pool.length)]; } while (pool.length > 1 && line === lastCpuLine);
  lastCpuLine = line; $('cpuText').textContent = line; el.hidden = false; el.classList.add('show');
  clearTimeout(cpuLineTimer); cpuLineTimer = setTimeout(() => { el.classList.remove('show'); el.hidden = true; }, 4200); }
function cpuHoleIntro(hole) { if (mode !== 'cpu') return;
  if (CPU_HOLE_LINES[hole.id]) return cpuSay([CPU_HOLE_LINES[hole.id]]);
  if (Math.random() < 0.3) cpuSay(CPU_LINES.intro); }
function reactCpu(done) {
  if (mode !== 'cpu' || !done?.res || !shown) return;
  const res = done.res, hole = holeById(shown.course[done.shot.hole]), c = cupPos(hole);
  const dist = Math.hypot(res.end[0] - c[0], res.end[2] - c[2]);
  if (done.shot.slot === 1) {
    if (res.holed) cpuSay(CPU_LINES.cpuHoled);
    else if (res.out || dist > 2.2) { if (Math.random() < 0.8) cpuSay(CPU_LINES.cpuBad); }
    else if (dist < 0.8 && Math.random() < 0.7) cpuSay(CPU_LINES.cpuNear);
  } else {
    if (res.holed) { if (Math.random() < 0.8) cpuSay(CPU_LINES.youHoled); }
    else if (res.out || shown.strokes[0][shown.holeIdx] >= 5) { if (Math.random() < 0.75) cpuSay(CPU_LINES.youBad); }
  }
}
// ---------- best scores (this device only) ----------
const BEST_KEY = 'minigolf-best-v1';
const loadBest = () => { try { return JSON.parse(localStorage.getItem(BEST_KEY)) || {}; } catch { return {}; } };
function recordBest() { // 'new' when the human's total beats the saved best for this course (solo / vs CPU only)
  if ((mode !== 'solo' && mode !== 'cpu') || !shown) return null;
  const t = totals(shown)[0], best = loadBest(), k = shown.course.join(',');
  if (best[k] !== undefined && t >= best[k]) return 'same';
  best[k] = t; try { localStorage.setItem(BEST_KEY, JSON.stringify(best)); } catch { /* private mode */ } return 'new';
}
function bestLine() { const best = loadBest(), parts = [];
  for (const [k, v] of Object.entries(best)) parts.push(`${k === DEFAULT_COURSE.join(',') ? 'Tour' : k === QUICK_COURSE.join(',') ? 'Quick 3' : 'Course'} best: ${v}`);
  return parts.length ? '🏆 ' + parts.join(' · ') : ''; }

function scorecard(final) {
  const s = shown, rows = s.course.map((id, i) => `<tr><td>${i + 1}</td><td>${holeById(id).name}</td><td>${holeById(id).par}</td>${(s.solo ? [0] : [0, 1]).map(p => `<td>${i <= s.holeIdx || s.phase === 'finished' ? s.strokes[p][i] : '–'}</td>`).join('')}</tr>`).join('');
  const t = totals(s), par = s.course.reduce((a, id) => a + holeById(id).par, 0);
  $('scoreTable').innerHTML = `<thead><tr><th>#</th><th>Hole</th><th>Par</th>${(s.solo ? [0] : [0, 1]).map(p => `<th>${label(p)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody><tfoot><tr><td></td><td>Total</td><td>${par}</td>${(s.solo ? [0] : [0, 1]).map(p => `<td>${t[p]}</td>`).join('')}</tr></tfoot>`;
  $('scoreTitle').textContent = final ? (s.solo ? 'Round complete' : s.winner === 'draw' ? 'Draw!' : `${label(s.winner)} ${mode === 'online' || mode === 'cpu' ? (label(s.winner) === 'You' ? 'win!' : 'wins') : 'wins!'}`) : 'Scorecard';
  $('scoreMsg').textContent = final ? s.message : '';
  if (final && !celebrated) { celebrated = true; // once per match: confetti at the last cup + best-score bookkeeping
    const lh = holeById(s.course[s.course.length - 1]), cp = cupPos(lh);
    burst([cp[0], cp[1] + 0.1, cp[2]], [0xffc93c, 0x7dd3fc, 0xff4fd8], 110);
    if (recordBest() === 'new') $('scoreMsg').textContent = (s.message ? s.message + ' ' : '') + '🏆 New best round!'; }
  $('scoreAgain').hidden = !final; $('scoreAgain').textContent = mode === 'online' ? 'Rematch (both players ready up in the room)' : 'Play again';
  $('scoreAgain').onclick = () => { if (mode === 'online') { mp.setReady(true); $('scorecard').classList.remove('show'); } else start(mode); };
  if (final && mode === 'cpu' && !s.solo) cpuSay(s.winner === 1 ? CPU_LINES.cpuWins : s.winner === 0 ? CPU_LINES.cpuLoses : CPU_LINES.draw);
  if (final && !$('scorecard').classList.contains('show')) audio.win(); $('scorecard').classList.add('show');
}
$('scoreBtn').onclick = () => shown && scorecard(false); $('scoreClose').onclick = () => $('scorecard').classList.remove('show');
$('menuBtn').onclick = () => openMenu(); $('muteBtn').onclick = () => { $('muteBtn').textContent = audio.toggle() ? '🔇' : '🔊'; };

// ---------- ball colour (your ball, this device; cosmetic and local) ----------
const BALL_CHOICES = [0xffffff, 0x38bdf8, 0xff4fd8, 0x7dff6a, 0xff7a1a, 0xa78bfa];
let ballColor = BALL_CHOICES[0];
try { const v = parseInt(localStorage.getItem('minigolf-ball') || '', 16); if (BALL_CHOICES.includes(v)) ballColor = v; } catch { /* private mode */ }
function applyBallColor() { const defs = [0xffffff, 0xffc93c];
  balls.forEach((b, i) => { b.material.color.setHex(defs[i]); b.material.emissive.setHex(defs[i]); });
  const slot = mode === 'online' ? (mp?.slot ?? 0) : 0;
  balls[slot].material.color.setHex(ballColor); balls[slot].material.emissive.setHex(ballColor);
  document.documentElement.style.setProperty('--p0', '#' + ballColor.toString(16).padStart(6, '0')); }
{ const wrap = $('ballSwatches');
  for (const c of BALL_CHOICES) { const b = document.createElement('button'); b.className = 'sw' + (c === ballColor ? ' on' : '');
    b.style.setProperty('--c', '#' + c.toString(16).padStart(6, '0')); b.setAttribute('aria-label', 'Ball colour');
    b.onclick = () => { ballColor = c; try { localStorage.setItem('minigolf-ball', c.toString(16)); } catch { /* ignore */ }
      wrap.querySelectorAll('.sw').forEach(x => x.classList.remove('on')); b.classList.add('on'); applyBallColor(); };
    wrap.appendChild(b); } }

// ---------- CPU ----------
function maybeCpu() { if (mode !== 'cpu' || cpuJob || shown.turn !== 1 || shown.phase !== 'aim' || !idle()) return;
  const turnId = state.turnId, gen = chooseShot(holeOf(state), state.pos[1], moverPhase(state), level); cpuJob = { gen, turnId, wait: 0.6 }; }
function stepCpu(dt) { if (!cpuJob) return; if ((cpuJob.wait -= dt) > 0) return; const t0 = performance.now(); let r;
  while (performance.now() - t0 < 8) { r = cpuJob.gen.next(); if (r.done) break; }
  if (r?.done) { const job = cpuJob; cpuJob = null; if (state.turnId === job.turnId && mode === 'cpu') { audio.putt(r.value.power / 1000); takeShot(1, { ...r.value, turnId: job.turnId }); } } }

// ---------- loop ----------
let last = performance.now(), simTick = 0;
function frame(now) {
  requestAnimationFrame(frame); // schedule first: a render error must never kill the loop outright
  const dt = Math.min(0.1, (now - last) / 1000); last = now; stepCpu(dt);
  if (!anim && queue.length) { const item = queue.shift(); if (item.res) { anim = { ...item, t: 0 }; trailPts = []; } else { shown = item.after; show(); } }
  if (shown) {
    for (let i = 0; i < 2; i++) balls[i].position.set(...shown.pos[i]);
    if (anim) { anim.t += dt * HZ; const f = anim.res.frames, n = f.length / 3, i = Math.min(n - 1, Math.floor(anim.t)), b = balls[anim.shot.slot];
      b.position.set(f[i * 3], f[i * 3 + 1], f[i * 3 + 2]); simTick = anim.shot.phase + i;
      pushTrail(b.position); trail.material.color.copy(b.material.color); trailTtl = 0.4; trail.material.opacity = 0.38;
      while (anim.res.events.length && anim.res.events[0].tick <= anim.t) { const ev = anim.res.events.shift(); if (ev.type === 'portal') audio.warp(); else audio.hit(ev.strength); }
      cam.want.copy(b.position);
      if (anim.t >= n + 20) { const done = anim; anim = null;
        if (done.res.holed) { audio.cup(); const hh = holeById(shown.course[done.shot.hole]), cp = cupPos(hh); burst([cp[0], cp[1] + 0.1, cp[2]], [0xffc93c, 0xffffff, THEMES[hh.theme].accent], 70); }
        else if (done.res.out) audio.out(); shown = done.after; show(); reactCpu(done); } }
    else { cam.want.set(...shown.pos[shown.turn]); simTick += dt * HZ; }
    rollBall(0); rollBall(1);
    if (trailTtl > 0 && !anim) { trailTtl -= dt; trail.material.opacity = Math.max(0, 0.38 * (trailTtl / 0.4)); if (trailTtl <= 0) { trail.visible = false; trailPts = []; } }
    if (course) for (const { m, mesh } of course.movers) mesh.position.set(...moverPos(m, Math.floor(simTick)));
    if (course) { const t = now / 1000; // idle life: waving flag, pulsing bumpers/portals, bobbing loop ring, breathing movers
      if (course.flag) { course.flag.rotation.y = Math.sin(t * 3.2) * 0.35; course.flag.scale.x = 1 + Math.sin(t * 6.4) * 0.08; }
      if (course.bumpMat) course.bumpMat.emissiveIntensity = 0.5 + 0.3 * Math.sin(t * 2.6);
      for (const pm of course.portalMeshes) { pm.ring.rotation.y += dt * 1.4; pm.ring.rotation.x = Math.sin(t * 1.7) * 0.15; pm.disc.material.opacity = 0.28 + 0.14 * Math.sin(t * 3.1); }
      course.loopMeshes.forEach(m => { m.material.emissiveIntensity = 0.22 + 0.09 * Math.sin(t * 2.2); });
      course.lavaMeshes.forEach(m => { m.material.emissiveIntensity = 1.1 + 0.35 * Math.sin(t * 2.7); });
      course.movers.forEach((mv, i) => { mv.mat.emissiveIntensity = 0.25 + 0.13 * Math.sin(t * 3 + i * 1.7); }); }
    const aiming = canShoot() && (drag && !drag.rotate || keyAim);
    aimGroup.visible = aiming;
    if (aiming) { const a = drag && !drag.rotate ? aimFromDrag(drag) : { dir: forward(), power: keyPower }, len = 0.25 + a.power * 1.6, p = balls[shown.turn].position;
      aimGroup.position.copy(p); aimGroup.rotation.y = Math.atan2(a.dir.x, a.dir.z); aimLine.scale.z = len; aimLine.position.set(0, 0, len / 2); aimArrow.position.set(0, 0, len + 0.08); aimArrow.rotation.set(Math.PI / 2, 0, 0);
      $('power').style.setProperty('--p', a.power); $('powerWrap').classList.add('show'); } else $('powerWrap').classList.remove('show');
  }
  stepBursts(dt);
  if (fly && shown) { fly.t += dt / 1.9; // hole intro: dolly from tee to cup, any input cancels
    if (fly.t >= 1) fly = null;
    else { const e = fly.t * fly.t * (3 - 2 * fly.t); cam.target.lerpVectors(fly.from, fly.to, e);
      camera.position.set(cam.target.x + Math.sin(cam.yaw) * 4.4, cam.target.y + 2.8, cam.target.z + Math.cos(cam.yaw) * 4.4);
      camera.lookAt(cam.target.x, cam.target.y, cam.target.z); } }
  if (!fly) updateCamera(dt);
  renderer.render(scene, camera);
}

// ---------- menu & online ----------
function openMenu() { $('bestLine').textContent = bestLine(); $('menu').classList.add('show'); }
document.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { audio.unlock(); const cs = $('courseSel').value;
  courseIds = cs === 'quick' ? QUICK_COURSE : cs.startsWith('hole:') ? [cs.slice(5)] : DEFAULT_COURSE; level = $('levelSel').value;
  const m = b.dataset.mode; if (m === 'online') { $('room').hidden = false; $('menu').classList.remove('show'); mode = 'online-lobby'; overlay('Online 1v1', mp ? 'Create a room and share the invite link, or join with a code. The match starts when both players are ready.' : 'Online rooms are unavailable right now. Solo, hotseat and CPU still work.', 'OK', () => {}); return; }
  if (mp?.roomCode) mp.leave(); $('room').hidden = true; start(m); });
function mountOnline() {
  if (!window.StarMuffMultiplayer) return;
  mp = window.StarMuffMultiplayer.mount({ game: 'minigolf', container: $('room'),
    onStart(info) { courseIds = DEFAULT_COURSE; mode = 'online'; presence = true; if (info.resumed && info.snapshot?.state) { start('online', info.seed, info.snapshot.state); lastAnimated = state.turnId - 1; } else { start('online', info.seed); if (mp.isHost) publish(); } $('room').hidden = false; },
    onEvent(ev) { if (!mp.isHost || mode !== 'online' || !presence) return; if (ev.type === 'shot' || ev.type === 'command') { if (!takeShot(ev.slot, ev.data)) publish(); } },
    onSnapshot({ snapshot }) { if (mode === 'online' && !mp.isHost) adoptSnapshot(snapshot, false); },
    onPresence(info) { presence = !!info.connected; if (mode === 'online') { drag = null; show(); } },
    onFinish({ result }) { if (state && result && mode === 'online' && state.phase !== 'finished') { state.phase = 'finished'; state.winner = result.winner; } },
    onLeave() { if (mode === 'online') { mode = null; shown = null; openMenu(); } },
    onUnavailable() { /* solo/hotseat/CPU remain available */ },
  });
}
mountOnline();
const params = new URLSearchParams(location.search);
if (params.has('room')) { $('room').hidden = false; $('menu').classList.remove('show'); } else openMenu();
// Attract mode behind the menu: show hole 1.
buildCourse(HOLES[0]); { const c = cupPos(HOLES[0]); cam.want.set(c[0], 0, c[2] + 3); cam.target.copy(cam.want); faceCup([c[0], 0, c[2] + 6], HOLES[0]); }
initPhysics().then(() => { document.body.classList.add('ready'); $('status').textContent = 'Pick a mode to start'; window.minigolf = { get mp() { return mp; }, get presence() { return presence; }, get state() { return state; }, get shown() { return shown; }, get mode() { return mode; }, start, takeShot }; if (params.get('autostart')) start(params.get('autostart')); });
requestAnimationFrame(frame);
