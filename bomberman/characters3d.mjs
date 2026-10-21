import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Original Bomb Man collection translated into articulated geometry. Nothing here
// is a billboard: the helmet, goggles, scarf, robot panels and faces have depth.
// Templates share GPU resources; each player's five rigid groups animate alone.
const templates = new Map(), materials = new Map();
const geometry = {
  round: new RoundedBoxGeometry(1, 1, 1, 1, .12),
  box: new T.BoxGeometry(1, 1, 1),
  sphere: new T.SphereGeometry(1, 16, 10),
  detail: new T.SphereGeometry(1, 10, 7),
  head: new T.SphereGeometry(1, 24, 16),
  helmetTop: new T.SphereGeometry(1, 24, 10, 0, Math.PI * 2, 0, Math.PI * .42),
  helmetBack: new T.SphereGeometry(1, 16, 12, Math.PI, Math.PI),
  cylinder: new T.CylinderGeometry(1, 1, 1, 12),
  torus: new T.TorusGeometry(1, .17, 6, 20),
  ring: new T.TorusGeometry(.38, .018, 6, 32),
};
function material(color, metalness = .05, roughness = .6, emissive = 0) {
  const key = [color, metalness, roughness, emissive].join(':');
  if (!materials.has(key)) materials.set(key, new T.MeshStandardMaterial({
    color, metalness, roughness, emissive, emissiveIntensity: emissive ? .9 : 0,
  }));
  return materials.get(key);
}
const M = {
  fur: material(0xeb973f), cream: material(0xffe4bc), pink: material(0xf29295),
  nose: material(0xec7884, .04, .3), eye: material(0x101520, .1, .18), white: material(0xfffaf0, 0, .25),
  leather: material(0x6b3420, .02, .68), leatherLight: material(0x9c542c, .03, .57),
  sole: material(0x291d1b, 0, .85), seam: material(0xd29656, 0, .75),
  gold: material(0xf5b23b, .65, .29), goldDark: material(0xb67724, .55, .45),
  lens: material(0x148bdb, .65, .17, 0x053a62), lensDark: material(0x0b366d, .5, .2),
  red: material(0xe53035, .02, .55), redShade: material(0x981c2a, 0, .7),
  steel: material(0xa7b8c7, .73, .35), steelBright: material(0xd7e2e8, .65, .27),
  steelDark: material(0x425363, .67, .46), joint: material(0x1c2835, .55, .42),
  glass: material(0x070b12, .3, .16), redGlow: material(0xff2b1b, .15, .24, 0xe91b09),
  hot: material(0xffd0a0, .05, .23, 0xff6030),
};
function polygon(points, depth = .035) {
  const shape = new T.Shape();
  points.forEach(([x, y], i) => i ? shape.lineTo(x, y) : shape.moveTo(x, y));
  shape.closePath();
  return new T.ExtrudeGeometry(shape, { depth, bevelEnabled: false, steps: 1 });
}
geometry.scarf = polygon([[-.21, .07], [.21, .07], [.15, -.06], [0, -.20], [-.12, -.08]]);
geometry.scarfTail = polygon([[.08, .04], [-.11, .105], [-.35, .08], [-.27, .02], [-.35, -.045], [-.12, -.01]]);
const starPoints = Array.from({ length: 10 }, (_, i) => {
  const angle = Math.PI / 2 + i * Math.PI / 5, radius = i % 2 ? .041 : .089;
  return [Math.cos(angle) * radius, Math.sin(angle) * radius];
});
geometry.star = polygon(starPoints, .027);

function rigid(name) {
  const group = new T.Group(); group.name = name;
  return { group, batches: new Map() };
}
function part(rigid, shape, mat, position, scale = [1, 1, 1], rotation = [0, 0, 0]) {
  let source = geometry[shape];
  const geo = source.index ? source.toNonIndexed() : source.clone();
  // No maps on these parts. Dropping UVs also makes all primitive layouts match.
  geo.deleteAttribute('uv');
  const matrix = new T.Matrix4().compose(new T.Vector3(...position),
    new T.Quaternion().setFromEuler(new T.Euler(...rotation)), new T.Vector3(...scale));
  geo.applyMatrix4(matrix);
  if (!rigid.batches.has(mat)) rigid.batches.set(mat, []);
  rigid.batches.get(mat).push(geo);
}
function finish(rigid) {
  for (const [mat, pieces] of rigid.batches) {
    const merged = mergeGeometries(pieces, false);
    merged.computeBoundingBox(); merged.computeBoundingSphere();
    const mesh = new T.Mesh(merged, mat); mesh.castShadow = true; mesh.receiveShadow = true;
    rigid.group.add(mesh);
    pieces.forEach(piece => piece.dispose());
  }
  return rigid.group;
}
function round(r, mat, p, s, rot) { part(r, 'round', mat, p, s, rot); }
function ball(r, mat, p, s, detail = true) { part(r, detail ? 'detail' : 'sphere', mat, p, s); }
function pin(r, mat, p, radius, length, rot = [0, 0, 0]) { part(r, 'cylinder', mat, p, [radius, length, radius], rot); }
function screw(r, p, size = .014) {
  ball(r, M.goldDark, p, [size, size, .008]);
  round(r, M.joint, [p[0], p[1], p[2] + .008], [size * 1.1, .004, .003], [0, 0, .6]);
}
function addLimb(root, limb, position, tilt = 0) {
  const group = finish(limb); group.position.set(...position); group.rotation.z = tilt; root.add(group);
}

function makeHero(root, color) {
  const body = rigid('body'), cloth = material(color, .02, .67);
  // Compact explorer's suit, leather belt, harness and little supply pack.
  round(body, cloth, [0, .47, 0], [.43, .37, .31]);
  ball(body, cloth, [0, .36, .005], [.235, .14, .18], false);
  round(body, M.leather, [0, .355, .012], [.47, .074, .355]);
  round(body, M.leather, [0, .535, -.205], [.285, .28, .15]);
  round(body, M.leatherLight, [0, .65, -.223], [.30, .09, .17]);
  for (const sign of [-1, 1]) {
    round(body, M.leatherLight, [sign * .155, .52, .166], [.043, .26, .035], [0, 0, sign * -.15]);
    round(body, M.gold, [sign * .165, .555, .19], [.06, .052, .018], [0, 0, sign * -.15]);
    round(body, M.leather, [sign * .165, .555, .201], [.033, .026, .008], [0, 0, sign * -.15]);
    round(body, M.leather, [sign * .185, .35, .16], [.095, .116, .09]);
    round(body, M.leatherLight, [sign * .185, .386, .196], [.10, .047, .025]);
    ball(body, M.gold, [sign * .185, .379, .213], [.012, .012, .008]);
  }
  part(body, 'star', M.gold, [0, .358, .2]);
  ball(body, M.fur, [0, .385, -.285], [.10, .115, .105], false);
  // Scarf folds and two sculpted tails remain visible from behind.
  ball(body, M.redShade, [0, .68, -.015], [.237, .077, .205]);
  part(body, 'scarf', M.red, [0, .644, .181], [1, 1, 1], [-.12, 0, 0]);
  part(body, 'scarfTail', M.red, [0, .665, -.22], [1, 1, 1], [.25, -.25, .03]);
  part(body, 'scarfTail', M.redShade, [0, .65, -.225], [.8, .8, 1], [-.25, .45, .4]);
  // Round orange face and soft cream cheeks; eyes look forward along +Z.
  part(body, 'head', M.fur, [0, .922, 0], [.31, .302, .265]);
  part(body, 'helmetBack', M.leather, [0, .945, -.025], [.32, .305, .27]);
  part(body, 'helmetTop', M.leather, [0, .938, -.025], [.325, .31, .277]);
  for (const sign of [-1, 1]) {
    ball(body, M.fur, [sign * .235, 1.208, -.012], [.118, .15, .072], false);
    ball(body, M.pink, [sign * .239, 1.213, .049], [.075, .106, .023]);
    round(body, M.leatherLight, [sign * .284, .966, -.012], [.077, .25, .16], [0, 0, sign * -.10]);
    ball(body, M.goldDark, [sign * .295, .948, .078], [.027, .03, .014]);
    ball(body, M.cream, [sign * .108, .83, .224], [.13, .105, .058], false);
    ball(body, M.white, [sign * .112, .979, .239], [.078, .104, .032], false);
    ball(body, M.eye, [sign * .105, .975, .27], [.049, .075, .023], false);
    ball(body, M.white, [sign * .105 - .014, 1.007, .289], [.018, .022, .008]);
    round(body, M.leather, [sign * .11, 1.067, .263], [.105, .028, .03], [0, 0, sign * -.22]);
    for (let j = 0; j < 2; j++) round(body, M.cream,
      [sign * .22, .844 + j * .025, .275], [.095, .006, .006], [0, 0, sign * (.08 + j * .12)]);
  }
  ball(body, M.cream, [0, .79, .227], [.18, .087, .064]);
  ball(body, M.eye, [0, .784, .289], [.052, .041, .013]);
  ball(body, M.pink, [0, .767, .30], [.028, .016, .006]);
  for (const x of [-.013, .013]) round(body, M.white, [x, .803, .305], [.023, .028, .01]);
  ball(body, M.nose, [0, .866, .296], [.043, .029, .025]);
  ball(body, M.white, [-.01, .877, .315], [.012, .006, .004]);
  // Leather goggle strap, brass rims, deep blue glass and specular glints.
  round(body, M.leatherLight, [0, 1.12, .214], [.54, .068, .051], [-.18, 0, 0]);
  round(body, M.goldDark, [0, 1.143, .278], [.09, .032, .027]);
  for (const sign of [-1, 1]) {
    const x = sign * .124;
    ball(body, M.goldDark, [x, 1.145, .249], [.111, .112, .044]);
    ball(body, M.lensDark, [x, 1.145, .289], [.087, .088, .018]);
    ball(body, M.lens, [x, 1.145, .3], [.078, .079, .022], false);
    part(body, 'torus', M.gold, [x, 1.145, .304], [.091, .092, .091]);
    ball(body, M.white, [x - .022, 1.174, .321], [.022, .015, .004]);
    ball(body, M.gold, [sign * .259, 1.12, .242], [.013, .016, .01]);
  }
  // Helmet seam follows the crown; tiny stitch dots are part of the same batch.
  for (let i = 0; i < 10; i++) {
    const a = -.85 + i * .18;
    ball(body, M.seam, [Math.sin(a) * .247, 1.136 + Math.cos(a) * .109, -.11], [.005, .006, .005]);
  }
  root.add(finish(body));
  for (const [side, sign] of [['left', -1], ['right', 1]]) {
    const leg = rigid(side + 'Leg');
    round(leg, cloth, [0, -.068, 0], [.185, .18, .235]);
    round(leg, M.leather, [0, -.205, .045], [.205, .15, .29]);
    round(leg, M.sole, [0, -.271, .051], [.215, .028, .305]);
    round(leg, M.gold, [0, -.142, .008], [.209, .04, .25]);
    round(leg, M.leatherLight, [0, -.198, .179], [.15, .055, .015]);
    addLimb(root, leg, [sign * .12, .31, 0]);
    const arm = rigid(side + 'Arm');
    ball(arm, cloth, [0, -.01, 0], [.118, .13, .118], false);
    pin(arm, M.gold, [0, -.105, 0], .101, .045);
    ball(arm, M.leather, [0, -.192, .012], [.1, .113, .107], false);
    ball(arm, M.leatherLight, [-sign * .067, -.16, .085], [.043, .058, .045]);
    for (let j = -1; j <= 1; j++) round(arm, M.leatherLight,
      [j * .035, -.222, .106], [.006, .041, .005], [0, 0, -.08]);
    addLimb(root, arm, [sign * .265, .58, 0], sign * .10);
  }
}

function makeRobot(root, color) {
  const body = rigid('body'), accent = material(color, .5, .34);
  round(body, M.joint, [0, .505, 0], [.34, .245, .265]);
  round(body, M.goldDark, [0, .492, 0], [.38, .075, .278]);
  round(body, M.steel, [0, .51, .155], [.335, .20, .055]);
  round(body, M.steel, [0, .51, -.15], [.30, .19, .035]);
  round(body, accent, [0, .577, .188], [.20, .023, .009]);
  pin(body, M.joint, [0, .657, 0], .074, .072);
  for (const x of [-.135, .135]) for (const y of [.445, .575]) screw(body, [x, y, .185], .011);
  // Beveled metal shell and inset black glass remain readable at map scale.
  round(body, M.steel, [0, .882, 0], [.583, .49, .418]);
  round(body, M.steelDark, [0, .876, .21], [.504, .359, .055]);
  round(body, M.glass, [0, .88, .244], [.454, .302, .035]);
  round(body, M.steelBright, [0, 1.095, .179], [.435, .023, .042]);
  for (const sign of [-1, 1]) {
    ball(body, M.redGlow, [sign * .104, .888, .27], [.057, .068, .021], false);
    ball(body, M.hot, [sign * .104 - .011, .905, .288], [.02, .026, .005]);
    pin(body, M.joint, [sign * .307, .883, 0], .109, .04, [0, 0, Math.PI / 2]);
    pin(body, M.steelBright, [sign * .335, .883, 0], .089, .038, [0, 0, Math.PI / 2]);
    pin(body, M.steelDark, [sign * .357, .883, 0], .06, .008, [0, 0, Math.PI / 2]);
    // Side-shell seam and small gold fasteners.
    round(body, M.steelDark, [sign * .292, .949, -.115], [.004, .23, .007]);
  }
  round(body, M.steelDark, [0, .886, -.211], [.418, .321, .016]);
  round(body, M.steel, [0, .886, -.224], [.392, .294, .016]);
  for (const x of [-.163, .163]) for (const y of [.77, 1.003]) {
    ball(body, M.goldDark, [x, y, -.236], [.016, .016, .008]);
    round(body, M.joint, [x, y, -.244], [.017, .004, .003], [0, 0, .6]);
  }
  for (let i = -1; i <= 1; i++) round(body, M.joint, [i * .052, .857, -.237], [.027, .075, .004]);
  pin(body, M.joint, [0, 1.137, 0], .082, .025);
  pin(body, M.steelBright, [0, 1.218, 0], .018, .15);
  for (const y of [1.166, 1.193, 1.22, 1.247]) pin(body, M.steelDark, [0, y, 0], .024, .012);
  ball(body, M.redGlow, [0, 1.335, 0], [.068, .073, .068], false);
  ball(body, M.hot, [-.02, 1.36, .053], [.016, .018, .006]);
  root.add(finish(body));
  for (const [side, sign] of [['left', -1], ['right', 1]]) {
    const leg = rigid(side + 'Leg');
    ball(leg, M.joint, [0, -.041, 0], [.076, .075, .074]);
    pin(leg, M.steel, [0, -.101, 0], .048, .12);
    ball(leg, M.joint, [0, -.153, .008], [.073, .067, .075]);
    round(leg, M.steel, [0, -.246, .043], [.205, .145, .278]);
    round(leg, M.joint, [0, -.316, .049], [.217, .032, .289]);
    round(leg, M.steelBright, [0, -.19, .079], [.151, .117, .055]);
    pin(leg, M.goldDark, [sign * .108, -.224, .025], .031, .012, [0, 0, Math.PI / 2]);
    round(leg, M.steelDark, [0, -.241, .184], [.006, .075, .004]);
    addLimb(root, leg, [sign * .125, .36, 0]);
    const arm = rigid(side + 'Arm');
    ball(arm, M.joint, [0, 0, 0], [.09, .092, .09]);
    screw(arm, [0, .008, .088], .032);
    pin(arm, M.steelDark, [0, -.10, 0], .042, .13);
    ball(arm, M.joint, [0, -.162, 0], [.059, .058, .06]);
    pin(arm, M.steelBright, [0, -.209, 0], .075, .065);
    round(arm, M.steelDark, [0, -.285, .014], [.133, .13, .13]);
    for (const x of [-.043, 0, .043]) {
      round(arm, M.steel, [x, -.337, .066], [.033, .075, .042], [-.24, 0, 0]);
      round(arm, M.joint, [x, -.307, .088], [.031, .009, .007]);
    }
    round(arm, M.steel, [-sign * .081, -.276, .061], [.043, .075, .048], [0, 0, sign * -.4]);
    addLimb(root, arm, [sign * .25, .584, 0], sign * .14);
  }
}

export function createCharacter({ bot = false, color = 0x367fea } = {}) {
  const key = `${bot}:${color}`;
  if (!templates.has(key)) {
    const root = new T.Group(); root.name = bot ? 'sentinelRobot' : 'aviatorHero';
    root.userData.characterKind = bot ? 'robot' : 'hero';
    (bot ? makeRobot : makeHero)(root, color);
    const ring = new T.Mesh(geometry.ring, material(color, .15, .4, color));
    ring.name = 'playerRing'; ring.rotation.x = Math.PI / 2; ring.position.y = .025;
    root.add(ring); templates.set(key, root);
  }
  const group = templates.get(key).clone(true);
  return {
    group,
    limbs: ['leftLeg', 'leftArm', 'rightLeg', 'rightArm'].map(name => group.getObjectByName(name)),
    ring: group.getObjectByName('playerRing'),
  };
}
