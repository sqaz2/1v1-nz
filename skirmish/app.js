const WORLD_W = 960;
const WORLD_H = 540;
const STEP = 1 / 120;
const TANK_R = 14;
const SHOT_R = 6;

const canvas = document.getElementById("battlefield");
const ctx = canvas.getContext("2d");
const angleInput = document.getElementById("angle");
const powerInput = document.getElementById("power");
const weaponSelect = document.getElementById("weapon");
const angleValue = document.getElementById("angleValue");
const powerValue = document.getElementById("powerValue");
const fireButton = document.getElementById("fire");
const resetButton = document.getElementById("reset");
const remixButton = document.getElementById("remix");
const turnLabel = document.getElementById("turnLabel");
const pilotName = document.getElementById("pilotName");
const windLabel = document.getElementById("windLabel");
const gravityLabel = document.getElementById("gravityLabel");
const modeLabel = document.getElementById("modeLabel");
const seriesLabel = document.getElementById("seriesLabel");
const solarisHealth = document.getElementById("solarisHealth");
const lunaraHealth = document.getElementById("lunaraHealth");
const solarisBar = document.getElementById("solarisBar");
const modePicker = document.getElementById("modePicker");
const gameLayout = document.getElementById("gameLayout");
const matchOverlay = document.getElementById("matchOverlay");
const matchResult = document.getElementById("matchResult");
const playAgain = document.getElementById("playAgain");
const changeMode = document.getElementById("changeMode");
const lunaPill = document.getElementById("lunaPill");

const state = {
  mode: null,
  terrain: [],
  asteroids: [],
  players: [],
  projectile: null,
  turn: 0,
  wind: 0,
  gravity: 0.35,
  series: [0, 0],
  roundOver: false,
  cpuThinking: false,
  seed: 1,
};

const weaponConfig = {
  nova: { damage: 35, blast: 46, speed: 0.9, color: "#ff9d3d", trail: "#ffd199" },
  comet: { damage: 28, blast: 30, speed: 1.08, color: "#6ae4ff", trail: "#b3f4ff" },
  ion: { damage: 20, blast: 68, speed: 1.2, color: "#b27bff", trail: "#ecd4ff" },
};

let generation = 0;
let frameId = 0;
let lastFrame = 0;
let accumulator = 0;
let timers = new Set();
let view = { scale: 1, x: 0, y: 0 };

function seeded(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function between(rand, min, max) { return rand() * (max - min) + min; }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

function invalidateRuntime() {
  generation += 1;
  for (const timer of timers) clearTimeout(timer);
  timers.clear();
  cancelAnimationFrame(frameId);
  frameId = 0;
  lastFrame = 0;
  accumulator = 0;
}
function schedule(delay, fn) {
  const captured = generation;
  const timer = setTimeout(() => {
    timers.delete(timer);
    if (captured === generation) fn();
  }, delay);
  timers.add(timer);
  return timer;
}

function createTerrain(rand) {
  const points = [];
  const amplitude = between(rand, 42, 68);
  const base = WORLD_H * 0.7;
  const steps = 16;
  for (let i = 0; i <= steps; i += 1) {
    const x = (WORLD_W / steps) * i;
    let y = base + Math.sin(i * 0.62) * amplitude + between(rand, -18, 18);
    if (i === 0 || i === steps) y = WORLD_H * 0.72;
    points.push({ x, y: clamp(y, WORLD_H * 0.5, WORLD_H * 0.82) });
  }
  state.terrain = points;
}
function createAsteroids(rand) {
  state.asteroids = Array.from({ length: 4 }, () => ({
    x: between(rand, WORLD_W * 0.3, WORLD_W * 0.7),
    y: between(rand, WORLD_H * 0.18, WORLD_H * 0.48),
    r: between(rand, 18, 30),
  }));
}
function getTerrainHeight(x) {
  const bounded = clamp(x, 0, WORLD_W);
  for (let i = 0; i < state.terrain.length - 1; i += 1) {
    const p1 = state.terrain[i], p2 = state.terrain[i + 1];
    if (bounded >= p1.x && bounded <= p2.x) {
      const t = (bounded - p1.x) / (p2.x - p1.x);
      return p1.y + (p2.y - p1.y) * t;
    }
  }
  return WORLD_H * 0.72;
}
function createPlayers() {
  const leftX = WORLD_W * 0.2, rightX = WORLD_W * 0.8;
  state.players = [
    { name: "Solaris Vanguard", short: "Solaris", color: "#ffa94d", x: leftX, y: getTerrainHeight(leftX) - TANK_R, health: 100 },
    { name: state.mode === "cpu" ? "Lunara CPU" : "Lunara Corsairs", short: state.mode === "cpu" ? "CPU" : "Lunara", color: "#6ae4ff", x: rightX, y: getTerrainHeight(rightX) - TANK_R, health: 100 },
  ];
}
function updateAtmosphere() {
  state.wind = Number((Math.random() * 0.8 - 0.4).toFixed(2));
  state.gravity = Number((Math.random() * 0.25 + 0.25).toFixed(2));
}

function resetMatch(keepSeries, remix = false) {
  invalidateRuntime();
  if (!keepSeries) state.series = [0, 0];
  if (remix || !state.seed) state.seed = (Math.random() * 0xffffffff) >>> 0;
  const rand = seeded(state.seed);
  createTerrain(rand);
  createAsteroids(rand);
  createPlayers();
  state.turn = 0;
  state.projectile = null;
  state.roundOver = false;
  state.cpuThinking = false;
  matchOverlay.hidden = true;
  updateAtmosphere();
  updateUI();
  setControlsEnabled(true);
  drawScene();
}

function updateUI() {
  const current = state.players[state.turn];
  if (!current) return;
  turnLabel.textContent = current.short;
  pilotName.textContent = current.name + (state.cpuThinking ? " (aiming…)" : "");
  windLabel.textContent = state.wind.toFixed(2);
  gravityLabel.textContent = state.gravity.toFixed(2);
  modeLabel.textContent = state.mode === "cpu" ? "vs CPU" : "Hotseat";
  seriesLabel.textContent = `${state.series[0]}–${state.series[1]}`;
  solarisHealth.textContent = state.players[0].health;
  lunaraHealth.textContent = state.players[1].health;
  solarisBar.style.width = `${state.players[0].health}%`;
  lunaPill.textContent = state.mode === "cpu" ? "Lunara (CPU)" : "Lunara (P2)";
}
function setControlsEnabled(on) {
  const humanTurn = state.mode === "hotseat" || state.turn === 0;
  const enabled = Boolean(state.mode && on && humanTurn && !state.roundOver && !state.projectile);
  angleInput.disabled = !enabled;
  powerInput.disabled = !enabled;
  weaponSelect.disabled = !enabled;
  fireButton.disabled = !enabled;
}

function beginWorldDraw() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
}
function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, WORLD_H);
  gradient.addColorStop(0, "#0a1533");
  gradient.addColorStop(1, "#04060b");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  for (let i = 0; i < 60; i += 1) {
    ctx.beginPath();
    ctx.arc((i * 97) % WORLD_W, (i * 53) % WORLD_H, (i % 3) + 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
}
function drawTerrain() {
  ctx.beginPath();
  ctx.moveTo(0, WORLD_H);
  state.terrain.forEach(point => ctx.lineTo(point.x, point.y));
  ctx.lineTo(WORLD_W, WORLD_H);
  ctx.closePath();
  ctx.fillStyle = "#1b2748";
  ctx.fill();
  ctx.strokeStyle = "rgba(114,240,255,.2)";
  ctx.lineWidth = 2;
  ctx.stroke();
}
function drawAsteroids() {
  for (const rock of state.asteroids) {
    ctx.beginPath();
    ctx.fillStyle = "rgba(157,140,255,.6)";
    ctx.arc(rock.x, rock.y, rock.r, 0, Math.PI * 2);
    ctx.fill();
  }
}
function drawPlayers() {
  state.players.forEach((player, index) => {
    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.arc(player.x, player.y, TANK_R, 0, Math.PI * 2);
    ctx.fill();
    const direction = index === 0 ? 1 : -1;
    const angle = Number(angleInput.value) * Math.PI / 180;
    ctx.strokeStyle = "rgba(255,255,255,.7)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(player.x + Math.cos(angle) * 24 * direction, player.y - Math.sin(angle) * 24);
    ctx.stroke();
  });
}
function drawProjectile() {
  const p = state.projectile;
  if (!p) return;
  ctx.fillStyle = p.config.color;
  ctx.beginPath();
  ctx.arc(p.x, p.y, SHOT_R, 0, Math.PI * 2);
  ctx.fill();
  const speed = Math.hypot(p.vx, p.vy) || 1;
  ctx.strokeStyle = p.config.trail;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x - p.vx / speed * 18, p.y - p.vy / speed * 18);
  ctx.stroke();
}
function drawScene() {
  beginWorldDraw();
  drawBackground();
  drawTerrain();
  drawAsteroids();
  drawPlayers();
  drawProjectile();
}

function segmentCircle(x1, y1, x2, y2, cx, cy, radius) {
  const dx = x2 - x1, dy = y2 - y1;
  const fx = x1 - cx, fy = y1 - cy;
  const a = dx * dx + dy * dy;
  if (!a) return Math.hypot(fx, fy) <= radius ? 0 : null;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - radius * radius;
  const disc = b * b - 4 * a * c;
  if (disc < 0) return null;
  const root = Math.sqrt(disc);
  const t1 = (-b - root) / (2 * a), t2 = (-b + root) / (2 * a);
  if (t1 >= 0 && t1 <= 1) return t1;
  if (t2 >= 0 && t2 <= 1) return t2;
  return null;
}
function findImpact(p, nx, ny) {
  let best = null;
  const consider = (t, type, target = null) => {
    if (t != null && (!best || t < best.t)) best = { t, type, target, x: p.x + (nx - p.x) * t, y: p.y + (ny - p.y) * t };
  };
  for (const rock of state.asteroids) consider(segmentCircle(p.x, p.y, nx, ny, rock.x, rock.y, rock.r + SHOT_R), "asteroid", rock);
  state.players.forEach((player, index) => {
    if (index === p.owner && !p.ownerExited) return;
    consider(segmentCircle(p.x, p.y, nx, ny, player.x, player.y, TANK_R + SHOT_R), "player", player);
  });
  const distance = Math.hypot(nx - p.x, ny - p.y);
  const samples = Math.max(1, Math.ceil(distance / 4));
  for (let i = 1; i <= samples; i += 1) {
    const t = i / samples;
    const x = p.x + (nx - p.x) * t, y = p.y + (ny - p.y) * t;
    if (x >= 0 && x <= WORLD_W && y + SHOT_R >= getTerrainHeight(x)) {
      consider(t, "terrain");
      break;
    }
  }
  return best;
}
function makeProjectile(owner, angleDeg, powerPct, weapon) {
  const player = state.players[owner];
  const direction = owner === 0 ? 1 : -1;
  const angle = angleDeg * Math.PI / 180;
  const config = weaponConfig[weapon];
  const muzzle = TANK_R + SHOT_R + 5;
  const speed = powerPct * 6 * config.speed;
  return {
    owner, ownerExited: false, weapon, config,
    x: player.x + Math.cos(angle) * muzzle * direction,
    y: player.y - Math.sin(angle) * muzzle,
    vx: Math.cos(angle) * speed * direction,
    vy: -Math.sin(angle) * speed,
  };
}
function advanceProjectile(p, dt) {
  p.vx += state.wind * 72 * dt;
  p.vy += state.gravity * 3600 * dt;
  const nx = p.x + p.vx * dt, ny = p.y + p.vy * dt;
  const owner = state.players[p.owner];
  if (!p.ownerExited && Math.hypot(nx - owner.x, ny - owner.y) > TANK_R + SHOT_R + 1) p.ownerExited = true;
  const impact = findImpact(p, nx, ny);
  if (impact) return impact;
  p.x = nx; p.y = ny;
  if (p.x < -30 || p.x > WORLD_W + 30 || p.y < -80 || p.y > WORLD_H + 30) return { type: "outside", x: p.x, y: p.y };
  return null;
}
function applyBlast(impact, p) {
  for (const player of state.players) {
    const distance = Math.hypot(player.x - impact.x, player.y - impact.y);
    if (distance > p.config.blast + TANK_R) continue;
    const scale = clamp(1 - distance / (p.config.blast + TANK_R), 0.35, 1);
    player.health = Math.max(0, player.health - Math.round(p.config.damage * scale));
  }
}
function endRound(winnerIndex) {
  state.roundOver = true;
  state.projectile = null;
  state.series[winnerIndex] += 1;
  updateUI();
  setControlsEnabled(false);
  matchResult.textContent = `${state.players[winnerIndex].short} wins the round!`;
  matchOverlay.hidden = false;
  drawScene();
}
function finishTurn() {
  state.projectile = null;
  if (state.players[0].health <= 0 || state.players[1].health <= 0) {
    const winner = state.players[0].health <= 0 ? 1 : 0;
    endRound(winner);
    return;
  }
  state.turn = state.turn === 0 ? 1 : 0;
  updateAtmosphere();
  updateUI();
  setControlsEnabled(true);
  drawScene();
  maybeCpuTurn();
}
function stepProjectile() {
  const p = state.projectile;
  if (!p) return;
  const impact = advanceProjectile(p, STEP);
  if (!impact) return;
  if (impact.type !== "outside") applyBlast(impact, p);
  finishTurn();
}
function frame(ts) {
  if (!state.projectile) { frameId = 0; return; }
  if (!lastFrame) lastFrame = ts;
  accumulator += Math.min(0.05, (ts - lastFrame) / 1000);
  lastFrame = ts;
  while (accumulator >= STEP && state.projectile) {
    stepProjectile();
    accumulator -= STEP;
  }
  drawScene();
  if (state.projectile) frameId = requestAnimationFrame(frame);
  else { frameId = 0; lastFrame = 0; accumulator = 0; }
}
function launch(owner) {
  if (!state.mode || state.projectile || state.roundOver || owner !== state.turn) return;
  state.projectile = makeProjectile(owner, Number(angleInput.value), Number(powerInput.value), weaponSelect.value);
  setControlsEnabled(false);
  lastFrame = 0; accumulator = 0;
  cancelAnimationFrame(frameId);
  frameId = requestAnimationFrame(frame);
}
function fire() {
  if (state.mode === "cpu" && state.turn === 1) return;
  launch(state.turn);
}
function simulateShot(angle, power, weapon, owner) {
  const p = makeProjectile(owner, angle, power, weapon);
  const target = state.players[owner === 0 ? 1 : 0];
  let closest = Infinity;
  for (let i = 0; i < 1200; i += 1) {
    closest = Math.min(closest, Math.hypot(p.x - target.x, p.y - target.y));
    const impact = advanceProjectile(p, STEP);
    if (impact) {
      const hitDistance = Math.hypot(impact.x - target.x, impact.y - target.y);
      return Math.min(closest, hitDistance);
    }
  }
  return closest;
}
function cpuChooseShot() {
  let best = { angle: 45, power: 60, weapon: "comet", error: Infinity };
  for (const weapon of Object.keys(weaponConfig)) {
    for (let angle = 20; angle <= 75; angle += 4) {
      for (let power = 30; power <= 100; power += 5) {
        const error = simulateShot(angle, power, weapon, 1);
        if (error < best.error) best = { angle, power, weapon, error };
      }
    }
  }
  angleInput.value = Math.round(clamp(best.angle + (Math.random() * 8 - 4), 5, 85));
  powerInput.value = Math.round(clamp(best.power + (Math.random() * 8 - 4), 20, 100));
  weaponSelect.value = best.weapon;
  angleValue.textContent = `${angleInput.value}°`;
  powerValue.textContent = `${powerInput.value}%`;
}
function maybeCpuTurn() {
  if (state.mode !== "cpu" || state.turn !== 1 || state.roundOver || state.projectile) return;
  state.cpuThinking = true;
  updateUI();
  setControlsEnabled(false);
  schedule(650, () => {
    if (state.mode !== "cpu" || state.turn !== 1 || state.roundOver) return;
    cpuChooseShot();
    state.cpuThinking = false;
    updateUI();
    drawScene();
    schedule(300, () => launch(1));
  });
}

function resizeRenderer() {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.round(rect.width * dpr));
  canvas.height = Math.max(1, Math.round(rect.height * dpr));
  view.scale = Math.min(canvas.width / WORLD_W, canvas.height / WORLD_H);
  view.x = (canvas.width - WORLD_W * view.scale) / 2;
  view.y = (canvas.height - WORLD_H * view.scale) / 2;
  drawScene();
}
function startMode(mode) {
  state.mode = mode;
  state.seed = (Math.random() * 0xffffffff) >>> 0 || 1;
  modePicker.hidden = true;
  gameLayout.hidden = false;
  resizeRenderer();
  resetMatch(false, false);
}

document.querySelectorAll(".mode-btn[data-mode]").forEach(btn => btn.addEventListener("click", () => startMode(btn.dataset.mode)));
angleInput.addEventListener("input", () => { angleValue.textContent = `${angleInput.value}°`; drawScene(); });
powerInput.addEventListener("input", () => { powerValue.textContent = `${powerInput.value}%`; });
fireButton.addEventListener("click", fire);
resetButton.addEventListener("click", () => resetMatch(true, false));
remixButton.addEventListener("click", () => resetMatch(true, true));
playAgain.addEventListener("click", () => resetMatch(true, false));
changeMode.addEventListener("click", () => {
  invalidateRuntime();
  state.mode = null;
  state.projectile = null;
  modePicker.hidden = false;
  gameLayout.hidden = true;
  matchOverlay.hidden = true;
});
window.addEventListener("resize", () => { if (state.mode) resizeRenderer(); });
