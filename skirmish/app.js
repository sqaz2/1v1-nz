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
const windLabel = document.getElementById("windLabel");
const gravityLabel = document.getElementById("gravityLabel");
const modeLabel = document.getElementById("modeLabel");
const seriesLabel = document.getElementById("seriesLabel");
const pilotName = document.getElementById("pilotName");
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
  mode: null, // 'hotseat' | 'cpu'
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
};

const weaponConfig = {
  nova: { radius: 42, color: "#ff9d3d", trail: "#ffd199" },
  comet: { radius: 30, color: "#6ae4ff", trail: "#b3f4ff" },
  ion: { radius: 24, color: "#b27bff", trail: "#ecd4ff" },
};

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function createTerrain() {
  const points = [];
  const amplitude = randomBetween(60, 90);
  const base = canvas.height * 0.65;
  const steps = 12;
  for (let i = 0; i <= steps; i += 1) {
    const x = (canvas.width / steps) * i;
    const y = base + Math.sin(i * 0.6) * amplitude + randomBetween(-25, 25);
    points.push({ x, y });
  }
  state.terrain = points;
}

function createAsteroids() {
  state.asteroids = Array.from({ length: 4 }, () => ({
    x: randomBetween(canvas.width * 0.25, canvas.width * 0.75),
    y: randomBetween(canvas.height * 0.2, canvas.height * 0.5),
    r: randomBetween(18, 30),
  }));
}

function createPlayers() {
  const leftY = getTerrainHeight(canvas.width * 0.2) - 18;
  const rightY = getTerrainHeight(canvas.width * 0.8) - 18;
  state.players = [
    { name: "Solaris Vanguard", short: "Solaris", color: "#ffa94d", x: canvas.width * 0.2, y: leftY, health: 100 },
    {
      name: state.mode === "cpu" ? "Lunara CPU" : "Lunara Corsairs",
      short: state.mode === "cpu" ? "CPU" : "Lunara",
      color: "#6ae4ff",
      x: canvas.width * 0.8,
      y: rightY,
      health: 100,
    },
  ];
}

function getTerrainHeight(x) {
  const points = state.terrain;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p1 = points[i];
    const p2 = points[i + 1];
    if (x >= p1.x && x <= p2.x) {
      const t = (x - p1.x) / (p2.x - p1.x);
      return p1.y + (p2.y - p1.y) * t;
    }
  }
  return canvas.height * 0.7;
}

function resetMatch(keepSeries) {
  if (!keepSeries) state.series = [0, 0];
  createTerrain();
  createAsteroids();
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
  maybeCpuTurn();
}

function updateAtmosphere() {
  state.wind = parseFloat(randomBetween(-0.4, 0.4).toFixed(2));
  state.gravity = parseFloat(randomBetween(0.25, 0.5).toFixed(2));
}

function updateUI() {
  const current = state.players[state.turn];
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
  const enabled = on && humanTurn && !state.roundOver && !state.projectile;
  angleInput.disabled = !enabled;
  powerInput.disabled = !enabled;
  weaponSelect.disabled = !enabled;
  fireButton.disabled = !enabled;
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#0a1533");
  gradient.addColorStop(1, "#04060b");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  for (let i = 0; i < 60; i += 1) {
    ctx.beginPath();
    ctx.arc((i * 97) % canvas.width, (i * 53) % canvas.height, (i % 3) + 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawTerrain() {
  ctx.beginPath();
  ctx.moveTo(0, canvas.height);
  state.terrain.forEach((point) => ctx.lineTo(point.x, point.y));
  ctx.lineTo(canvas.width, canvas.height);
  ctx.closePath();
  ctx.fillStyle = "#1b2748";
  ctx.fill();
  ctx.strokeStyle = "rgba(114, 240, 255, 0.2)";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawAsteroids() {
  state.asteroids.forEach((rock) => {
    ctx.beginPath();
    ctx.fillStyle = "rgba(157, 140, 255, 0.6)";
    ctx.arc(rock.x, rock.y, rock.r, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawPlayers() {
  state.players.forEach((player, index) => {
    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.arc(player.x, player.y, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    const direction = index === 0 ? 1 : -1;
    const angle = (parseFloat(angleInput.value) * Math.PI) / 180;
    const barrelLength = 18;
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(player.x + Math.cos(angle) * barrelLength * direction, player.y - Math.sin(angle) * barrelLength);
    ctx.stroke();
  });
}

function drawProjectile() {
  if (!state.projectile) return;
  const { x, y, config } = state.projectile;
  ctx.fillStyle = config.color;
  ctx.beginPath();
  ctx.arc(x, y, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = config.trail;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 8, y + 4);
  ctx.lineTo(x - 18, y + 8);
  ctx.stroke();
}

function drawScene() {
  drawBackground();
  drawTerrain();
  drawAsteroids();
  drawPlayers();
  drawProjectile();
}

function checkCollision(x, y) {
  if (y > getTerrainHeight(x)) return "terrain";
  const hitAsteroid = state.asteroids.find((rock) => Math.hypot(rock.x - x, rock.y - y) <= rock.r);
  if (hitAsteroid) return "asteroid";
  const hitPlayer = state.players.find((player) => Math.hypot(player.x - x, player.y - y) <= 16);
  if (hitPlayer) return hitPlayer;
  return null;
}

function applyDamage(target, weapon) {
  const damage = weapon === "nova" ? 35 : weapon === "comet" ? 26 : 20;
  target.health = Math.max(0, target.health - damage);
}

function endRound(winnerIndex) {
  state.roundOver = true;
  state.projectile = null;
  state.series[winnerIndex] += 1;
  updateUI();
  setControlsEnabled(false);
  const name = state.players[winnerIndex].short;
  matchResult.textContent = `${name} wins the round!`;
  matchOverlay.hidden = false;
}

function finishTurn() {
  state.projectile = null;
  if (state.players[0].health <= 0) {
    endRound(1);
    return;
  }
  if (state.players[1].health <= 0) {
    endRound(0);
    return;
  }
  state.turn = state.turn === 0 ? 1 : 0;
  updateAtmosphere();
  updateUI();
  drawScene();
  setControlsEnabled(true);
  maybeCpuTurn();
}

function animateProjectile() {
  if (!state.projectile) return;
  const projectile = state.projectile;
  projectile.vx += state.wind * 0.02;
  projectile.vy += state.gravity;
  projectile.x += projectile.vx;
  projectile.y += projectile.vy;

  const impact = checkCollision(projectile.x, projectile.y);
  if (impact) {
    if (typeof impact === "object") applyDamage(impact, projectile.weapon);
    finishTurn();
    return;
  }
  if (projectile.x < -20 || projectile.x > canvas.width + 20 || projectile.y > canvas.height + 20) {
    finishTurn();
    return;
  }
  drawScene();
  requestAnimationFrame(animateProjectile);
}

function fire() {
  if (state.projectile || state.roundOver) return;
  if (state.mode === "cpu" && state.turn === 1) return;
  const current = state.players[state.turn];
  const angle = (parseFloat(angleInput.value) * Math.PI) / 180;
  const power = parseFloat(powerInput.value) / 10;
  const direction = state.turn === 0 ? 1 : -1;
  const config = weaponConfig[weaponSelect.value];
  state.projectile = {
    x: current.x,
    y: current.y,
    vx: Math.cos(angle) * power * direction,
    vy: -Math.sin(angle) * power,
    weapon: weaponSelect.value,
    config,
  };
  setControlsEnabled(false);
  animateProjectile();
}

/** Simulate shot landing X for CPU aiming */
function simulateLanding(angleDeg, powerPct, fromPlayer) {
  const direction = fromPlayer === 0 ? 1 : -1;
  const angle = (angleDeg * Math.PI) / 180;
  const power = powerPct / 10;
  let x = state.players[fromPlayer].x;
  let y = state.players[fromPlayer].y;
  let vx = Math.cos(angle) * power * direction;
  let vy = -Math.sin(angle) * power;
  for (let i = 0; i < 400; i += 1) {
    vx += state.wind * 0.02;
    vy += state.gravity;
    x += vx;
    y += vy;
    if (y > getTerrainHeight(x) || x < -40 || x > canvas.width + 40) return x;
  }
  return x;
}

function cpuChooseShot() {
  const target = state.players[0];
  let best = { angle: 45, power: 60, err: Infinity };
  for (let a = 20; a <= 75; a += 3) {
    for (let p = 30; p <= 95; p += 5) {
      const land = simulateLanding(a, p, 1);
      const err = Math.abs(land - target.x);
      if (err < best.err) best = { angle: a, power: p, err };
    }
  }
  // Add noise so CPU isn't perfect
  best.angle = Math.max(5, Math.min(85, best.angle + randomBetween(-6, 6)));
  best.power = Math.max(20, Math.min(100, best.power + randomBetween(-8, 8)));
  const weapons = ["nova", "comet", "ion"];
  weaponSelect.value = weapons[Math.floor(Math.random() * weapons.length)];
  angleInput.value = Math.round(best.angle);
  powerInput.value = Math.round(best.power);
  angleValue.textContent = `${angleInput.value}°`;
  powerValue.textContent = `${powerInput.value}%`;
}

function maybeCpuTurn() {
  if (state.mode !== "cpu" || state.turn !== 1 || state.roundOver || state.projectile) return;
  state.cpuThinking = true;
  updateUI();
  setControlsEnabled(false);
  setTimeout(() => {
    if (state.mode !== "cpu" || state.turn !== 1 || state.roundOver) return;
    cpuChooseShot();
    drawScene();
    state.cpuThinking = false;
    updateUI();
    setTimeout(() => {
      if (state.mode === "cpu" && state.turn === 1 && !state.roundOver) fireCpu();
    }, 350);
  }, 700 + Math.random() * 500);
}

function fireCpu() {
  if (state.projectile || state.roundOver || state.turn !== 1) return;
  const current = state.players[1];
  const angle = (parseFloat(angleInput.value) * Math.PI) / 180;
  const power = parseFloat(powerInput.value) / 10;
  const config = weaponConfig[weaponSelect.value];
  state.projectile = {
    x: current.x,
    y: current.y,
    vx: Math.cos(angle) * power * -1,
    vy: -Math.sin(angle) * power,
    weapon: weaponSelect.value,
    config,
  };
  animateProjectile();
}

function startMode(mode) {
  state.mode = mode;
  modePicker.hidden = true;
  gameLayout.hidden = false;
  setInitialCanvas();
  resetMatch(false);
}

document.querySelectorAll(".mode-btn[data-mode]").forEach((btn) => {
  btn.addEventListener("click", () => startMode(btn.dataset.mode));
});

angleInput.addEventListener("input", () => {
  angleValue.textContent = `${angleInput.value}°`;
  drawScene();
});
powerInput.addEventListener("input", () => {
  powerValue.textContent = `${powerInput.value}%`;
});
fireButton.addEventListener("click", fire);
resetButton.addEventListener("click", () => resetMatch(true));
remixButton.addEventListener("click", () => resetMatch(true));
playAgain.addEventListener("click", () => resetMatch(true));
changeMode.addEventListener("click", () => {
  modePicker.hidden = false;
  gameLayout.hidden = true;
  state.mode = null;
  matchOverlay.hidden = true;
});

window.addEventListener("resize", () => {
  if (!state.mode) return;
  const rect = canvas.getBoundingClientRect();
  const scale = window.devicePixelRatio || 1;
  canvas.width = rect.width * scale;
  canvas.height = rect.height * scale;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  resetMatch(true);
});

function setInitialCanvas() {
  const rect = canvas.getBoundingClientRect();
  const scale = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, rect.width * scale);
  canvas.height = Math.max(1, rect.height * scale);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
}
