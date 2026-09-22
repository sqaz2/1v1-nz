import { useState, useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';
import { Action, seedNumber, seededBag, resolveAttack } from './duel-rules';

// Derived from sqaz2/StarMuff CargoBayGame.tsx blob c1e015e6ccab91aa2f04f50d2b9630ef013c8ed0.
// Original solo renderer/audio/controls/sectors/facts/math remain intact below.
export interface CargoAPI {
  input: (action: Action) => void;
  snapshot: () => any;
  hydrate: (snapshot: any) => void;
  garbage: (holes: number[]) => void;
  freeze: (paused: boolean) => void;
}
interface DuelOptions {
  seed: string | number;
  remote: boolean;
  controlled: boolean;
  keys: 'wasd' | 'arrows' | 'none';
  label: string;
  onReady: (api: CargoAPI) => void;
  onInput: (action: Action) => void;
  onAttack: (count: number) => void;
  onOver: () => void;
}

const COLS = 10;
const ROWS = 20;
const STORAGE_KEY = 'cargoBayHighScore';
const MATH_ROUND_SECONDS = 20;
const PTS = [0, 100, 300, 500, 800];

interface Piece {
  type: string;
  b: number[][];
  c: string;
  g: string;
  x: number;
  y: number;
}

const SHAPES: Record<string, { b: number[][]; c: string; g: string }> = {
  I: { b: [[0,0],[1,0],[2,0],[3,0]], c: '#3ea8ff', g: 'rgba(62,168,255,0.5)' },
  O: { b: [[0,0],[1,0],[0,1],[1,1]], c: '#ffd84d', g: 'rgba(255,216,77,0.5)' },
  T: { b: [[1,0],[0,1],[1,1],[2,1]], c: '#c46df7', g: 'rgba(196,109,247,0.5)' },
  S: { b: [[1,0],[2,0],[0,1],[1,1]], c: '#4dff91', g: 'rgba(77,255,145,0.5)' },
  Z: { b: [[0,0],[1,0],[1,1],[2,1]], c: '#ff4d6a', g: 'rgba(255,77,106,0.5)' },
  J: { b: [[0,0],[0,1],[1,1],[2,1]], c: '#5a7dff', g: 'rgba(90,125,255,0.5)' },
  L: { b: [[2,0],[0,1],[1,1],[2,1]], c: '#ff9f3e', g: 'rgba(255,159,62,0.5)' },
};

const SECTORS = [
  { name: 'Earth Orbit', hue: 210 },
  { name: 'Lunar Station', hue: 220 },
  { name: 'Mars Relay', hue: 15 },
  { name: 'Asteroid Belt', hue: 40 },
  { name: 'Jupiter Hub', hue: 30 },
  { name: 'Saturn Ring', hue: 45 },
  { name: 'Titan Base', hue: 190 },
  { name: 'Uranus Gate', hue: 170 },
  { name: 'Neptune Deep', hue: 240 },
  { name: 'Pluto Outpost', hue: 280 },
  { name: 'Kuiper Edge', hue: 260 },
  { name: 'Oort Cloud', hue: 300 },
  { name: 'Proxima Centauri', hue: 0 },
  { name: 'Andromeda Gate', hue: 270 },
  { name: 'Void Beyond', hue: 330 },
];

const FACTS = [
  "The Sun makes up 99.86% of the mass in our solar system!",
  "A day on Venus is longer than its year.",
  "Neutron stars can spin at 600 rotations per second!",
  "There are more stars in space than grains of sand on Earth.",
  "Jupiter's Great Red Spot has been raging for over 350 years.",
  "Saturn could float in water — it's less dense!",
  "The footprints on the Moon will last for 100 million years.",
  "Space is completely silent — no medium for sound.",
  "One million Earths could fit inside the Sun.",
  "A spacesuit costs approximately $12 million.",
  "Light takes 8 minutes to travel from the Sun to Earth.",
  "Mars has the tallest volcano in the solar system: Olympus Mons.",
  "Uranus rotates on its side, rolling around the Sun!",
  "The ISS travels at about 28,000 km/h.",
  "There could be 2 trillion galaxies in the observable universe.",
  "Mercury has no atmosphere, so no wind or weather.",
  "A year on Neptune is 165 Earth years long.",
  "The Milky Way is on a collision course with Andromeda.",
  "Black holes can bend time and light around them.",
  "Astronauts grow up to 2 inches taller in space!",
];

function getSector(lvl: number) {
  return SECTORS[Math.min(lvl - 1, SECTORS.length - 1)];
}

function shuffleBag(): string[] {
  const k = Object.keys(SHAPES);
  for (let i = k.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [k[i], k[j]] = [k[j], k[i]];
  }
  return k;
}

function rotateBlocks(blocks: number[][], dir: number): number[][] {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  blocks.forEach(([x, y]) => {
    x0 = Math.min(x0, x); y0 = Math.min(y0, y);
    x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  });
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  return blocks.map(([x, y]) => {
    const dx = x - cx, dy = y - cy;
    return dir === 1
      ? [Math.round(cx - dy), Math.round(cy + dx)]
      : [Math.round(cx + dy), Math.round(cy - dx)];
  });
}

function genMathQ(lvl: number) {
  const diff = Math.min(lvl, 10);
  let a: number, b: number, answer: number, qText: string;
  if (diff <= 3) {
    a = Math.floor(Math.random() * 20) + 5;
    b = Math.floor(Math.random() * 15) + 3;
    if (Math.random() > 0.5) {
      answer = a + b; qText = `${a} + ${b}`;
    } else {
      if (a < b) [a, b] = [b, a];
      answer = a - b; qText = `${a} - ${b}`;
    }
  } else if (diff <= 6) {
    a = Math.floor(Math.random() * 12) + 2;
    b = Math.floor(Math.random() * 12) + 2;
    answer = a * b; qText = `${a} × ${b}`;
  } else {
    a = Math.floor(Math.random() * 12) + 2;
    b = Math.floor(Math.random() * 12) + 2;
    const p = a * b;
    answer = a; qText = `${p} ÷ ${b}`;
  }
  const opts = new Set([answer]);
  while (opts.size < 4) {
    const off = Math.floor(Math.random() * 10) - 5;
    const w = answer + (off === 0 ? (Math.random() > 0.5 ? 1 : -1) : off);
    if (w > 0) opts.add(w);
  }
  return { qText, answer, options: Array.from(opts).sort(() => Math.random() - 0.5) };
}

interface CargoBayGameProps {
  onClose: () => void;
  duel?: DuelOptions;
}

type GamePhase = 'idle' | 'playing' | 'paused' | 'gameover' | 'levelup' | 'math' | 'mathresults';

type CellData = 0 | { c: string; g: string };

const ctrlBtnStyle: React.CSSProperties = {
  appearance: 'none',
  border: '1.5px solid rgba(50,70,120,0.35)',
  background: 'rgba(12,18,38,0.85)',
  color: '#5a6488',
  borderRadius: 12,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  width: 48,
  height: 48,
  fontSize: '1.2rem',
  touchAction: 'none',
  userSelect: 'none',
};

const overlayBase: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  background: 'rgba(4,6,14,0.94)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 50,
  backdropFilter: 'blur(8px)',
};

const sidePanelBox: React.CSSProperties = {
  background: 'rgba(12,18,38,0.85)',
  border: '1px solid rgba(50,70,120,0.35)',
  borderRadius: 6,
  padding: 5,
  textAlign: 'center',
};

const sidePanelLabel: React.CSSProperties = {
  fontSize: '0.42rem',
  color: '#5a6488',
  letterSpacing: 1.5,
  textTransform: 'uppercase',
  marginBottom: 2,
};

const sidePanelValue: React.CSSProperties = {
  fontWeight: 700,
  fontSize: '0.75rem',
  color: '#ffd84d',
  textShadow: '0 0 8px rgba(255,216,77,0.4)',
};

const actionBtnStyle: React.CSSProperties = {
  appearance: 'none',
  border: '2px solid #3ea8ff',
  background: 'transparent',
  color: '#3ea8ff',
  fontWeight: 700,
  fontSize: '0.85rem',
  letterSpacing: 3,
  padding: '12px 32px',
  borderRadius: 8,
  cursor: 'pointer',
};

export default function CargoBayGame({ onClose, duel }: CargoBayGameProps) {
  const duelRef = useRef(duel); duelRef.current = duel;
  const applyingInput = useRef(false);
  const frozenRef = useRef(false);
  const acceptInput = (action: Action) => {
    if (!duelRef.current || applyingInput.current) return true;
    if (frozenRef.current || !duelRef.current.controlled) return false;
    if (duelRef.current.remote) {
      duelRef.current.onInput(action);
      if (action === 'hard') sndDrop();
      else if (action === 'cw' || action === 'ccw') sndRotate();
      else sndMove();
      return false;
    }
    return true;
  };
  const [gamePhase, setGamePhase] = useState<GamePhase>('idle');
  const [displayScore, setDisplayScore] = useState(0);
  const [displayLevel, setDisplayLevel] = useState(1);
  const [displayLines, setDisplayLines] = useState(0);
  const [highScore, setHighScore] = useState(() => parseInt(localStorage.getItem(STORAGE_KEY) || '0'));
  const [muted, setMuted] = useState(false);
  const [sectorName, setSectorName] = useState('Earth Orbit');
  const [factVisible, setFactVisible] = useState(false);
  const [factText, setFactText] = useState('');
  const [levelUpText, setLevelUpText] = useState({ sector: '', num: '' });
  const [hiMessage, setHiMessage] = useState('');

  const [mathQ, setMathQ] = useState('');
  const [mathOpts, setMathOpts] = useState<number[]>([]);
  const [mathScoreText, setMathScoreText] = useState('0 / 0');
  const [mathFb, setMathFb] = useState({ text: '\u00a0', type: '' as string });
  const [mathSelIdx, setMathSelIdx] = useState<number | null>(null);
  const [mathResData, setMathResData] = useState({ correct: 0, total: 0, bonus: 0 });

  const phaseRef = useRef<GamePhase>('idle');
  const gameCanvasRef = useRef<HTMLCanvasElement>(null);
  const nextCanvasRef = useRef<HTMLCanvasElement>(null);
  const starCanvasRef = useRef<HTMLCanvasElement>(null);
  const boardFrameRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mathTimerBarRef = useRef<HTMLDivElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const mountedRef = useRef(true);
  const mutedRef = useRef(false);
  const timersRef = useRef(new Set<ReturnType<typeof setTimeout>>());
  const starRafRef = useRef(0);
  const gameRafRef = useRef(0);
  const mathRafRef = useRef(0);
  const starsRef = useRef<{ x: number; y: number; r: number; sp: number; a: number; tw: number }[]>([]);
  const btnStateRef = useRef<Record<string, { timeout: ReturnType<typeof setTimeout> | null; interval: ReturnType<typeof setInterval> | null; active: boolean }>>({});

  const gRef = useRef({
    board: Array(ROWS).fill(null).map(() => Array(COLS).fill(0)) as CellData[][],
    cur: null as Piece | null,
    nxtT: '' as string,
    bag: [] as string[],
    score: 0,
    level: 1,
    lines: 0,
    dropInt: 1000,
    lastDrop: 0,
    lockTm: 0,
    paused: false,
    over: false,
    running: false,
    cs: 0,
    starHue: 210,
    factIdx: 0,
    prev2: 0,
    hiScore: parseInt(localStorage.getItem(STORAGE_KEY) || '0'),
    rng: seedNumber(duel?.seed ?? Date.now()),
    pending: [] as number[],
    sent: 0,
    locks: 0,
  });

  const mathDataRef = useRef({
    answered: false,
    endTime: 0,
    correctAnswer: 0,
    correct: 0,
    total: 0,
  });

  const safeTimeout = useCallback((fn: () => void, delay: number) => {
    const id = setTimeout(() => {
      timersRef.current.delete(id);
      if (mountedRef.current) fn();
    }, delay);
    timersRef.current.add(id);
    return id;
  }, []);

  const playTone = useCallback((freq: number, dur: number, type: OscillatorType = 'square', vol = 0.08) => {
    if (mutedRef.current) return;
    if (duelRef.current && !duelRef.current.controlled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const a = audioCtxRef.current;
      const o = a.createOscillator();
      const gn = a.createGain();
      o.type = type;
      o.frequency.value = freq;
      gn.gain.value = vol;
      gn.gain.exponentialRampToValueAtTime(0.001, a.currentTime + dur);
      o.connect(gn);
      gn.connect(a.destination);
      o.start();
      o.stop(a.currentTime + dur);
    } catch (_e) { /* ignore */ }
  }, []);

  const sndMove = useCallback(() => playTone(280, 0.06, 'square', 0.04), [playTone]);
  const sndRotate = useCallback(() => playTone(440, 0.08, 'sine', 0.06), [playTone]);
  const sndDrop = useCallback(() => playTone(120, 0.15, 'triangle', 0.1), [playTone]);
  const sndClear = useCallback(() => {
    playTone(523, 0.1, 'square', 0.08);
    safeTimeout(() => playTone(659, 0.1, 'square', 0.08), 80);
    safeTimeout(() => playTone(784, 0.15, 'square', 0.08), 160);
  }, [playTone, safeTimeout]);
  const sndTetris = useCallback(() => {
    playTone(523, 0.08, 'square', 0.1);
    safeTimeout(() => playTone(659, 0.08, 'square', 0.1), 70);
    safeTimeout(() => playTone(784, 0.08, 'square', 0.1), 140);
    safeTimeout(() => playTone(1047, 0.2, 'square', 0.1), 210);
  }, [playTone, safeTimeout]);
  const sndLevelUp = useCallback(() => {
    [523, 659, 784, 1047, 1319].forEach((f, i) =>
      safeTimeout(() => playTone(f, 0.12, 'sine', 0.08), i * 80)
    );
  }, [playTone, safeTimeout]);
  const sndGameOver = useCallback(() => {
    [400, 350, 300, 250].forEach((f, i) =>
      safeTimeout(() => playTone(f, 0.2, 'sawtooth', 0.06), i * 150)
    );
  }, [playTone, safeTimeout]);
  const sndCorrect = useCallback(() => {
    playTone(880, 0.08, 'sine', 0.07);
    safeTimeout(() => playTone(1100, 0.1, 'sine', 0.07), 80);
  }, [playTone, safeTimeout]);
  const sndWrong = useCallback(() => playTone(200, 0.2, 'sawtooth', 0.05), [playTone]);

  const pull = (): string => {
    const d = gRef.current;
    if (!d.bag || d.bag.length === 0) {
      if (duelRef.current) { const next = seededBag(d.rng); d.bag = next.bag; d.rng = next.state; }
      else d.bag = shuffleBag();
    }
    return d.bag.pop()!;
  };

  const makePiece = (type: string): Piece => {
    const s = SHAPES[type];
    return { type, b: s.b.map(p => [...p]), c: s.c, g: s.g, x: Math.floor(COLS / 2) - 2, y: 0 };
  };

  const hit = (blocks: number[][], px: number, py: number): boolean => {
    return blocks.some(([bx, by]) => {
      const x = px + bx, y = py + by;
      return x < 0 || x >= COLS || y >= ROWS || (y >= 0 && gRef.current.board[y][x] !== 0);
    });
  };

  const merge = () => {
    const d = gRef.current;
    if (!d.cur) return;
    d.cur.b.forEach(([bx, by]) => {
      const r = d.cur!.y + by, c = d.cur!.x + bx;
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
        d.board[r][c] = { c: d.cur!.c, g: d.cur!.g };
      }
    });
  };

  const drawCell = (ctx: CanvasRenderingContext2D, col: number, row: number, color: string, glow: string, sz: number) => {
    const x = col * sz, y = row * sz, r = Math.max(2, sz * 0.12);
    ctx.shadowColor = glow || color;
    ctx.shadowBlur = sz * 0.3;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x + 1, y + 1, sz - 2, sz - 2, r);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.roundRect(x + 2, y + 2, sz - 4, sz * 0.28, [r, r, 0, 0]);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x + 1.5, y + 1.5, sz - 3, sz - 3, r);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    const dot = Math.max(1.5, sz * 0.06);
    ctx.beginPath(); ctx.arc(x + 4, y + 4, dot, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + sz - 4, y + 4, dot, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 4, y + sz - 4, dot, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + sz - 4, y + sz - 4, dot, 0, Math.PI * 2); ctx.fill();
  };

  const renderNext = (nx: CanvasRenderingContext2D, size: number) => {
    const d = gRef.current;
    if (!d.nxtT) return;
    nx.fillStyle = 'rgba(0,0,0,0.4)';
    nx.fillRect(0, 0, size, size);
    const shape = SHAPES[d.nxtT];
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    shape.b.forEach(([x, y]) => {
      x0 = Math.min(x0, x); y0 = Math.min(y0, y);
      x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    });
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
    const sz2 = size / 5;
    const ox = (size - bw * sz2) / 2, oy = (size - bh * sz2) / 2;
    shape.b.forEach(([bx, by]) => {
      const x = ox + (bx - x0) * sz2, y = oy + (by - y0) * sz2;
      nx.shadowColor = shape.g;
      nx.shadowBlur = sz2 * 0.4;
      nx.fillStyle = shape.c;
      nx.beginPath();
      nx.roundRect(x + 1, y + 1, sz2 - 2, sz2 - 2, 2);
      nx.fill();
      nx.shadowBlur = 0;
      nx.fillStyle = 'rgba(255,255,255,0.15)';
      nx.fillRect(x + 2, y + 2, sz2 - 4, sz2 * 0.25);
    });
  };

  const renderGame = () => {
    const cv = gameCanvasRef.current;
    const nv = nextCanvasRef.current;
    if (!cv || !nv) return;
    const cx = cv.getContext('2d');
    const nx = nv.getContext('2d');
    if (!cx || !nx) return;
    const d = gRef.current;
    const cs = d.cs;
    if (!cs) return;
    const sec = getSector(d.level);
    cx.fillStyle = `hsl(${sec.hue}, 20%, 4%)`;
    cx.fillRect(0, 0, cv.width, cv.height);
    cx.strokeStyle = `hsla(${sec.hue}, 30%, 30%, 0.08)`;
    cx.lineWidth = 1;
    for (let c = 1; c < COLS; c++) {
      cx.beginPath(); cx.moveTo(c * cs, 0); cx.lineTo(c * cs, cv.height); cx.stroke();
    }
    for (let r = 1; r < ROWS; r++) {
      cx.beginPath(); cx.moveTo(0, r * cs); cx.lineTo(cv.width, r * cs); cx.stroke();
    }
    cx.fillStyle = 'rgba(255,77,106,0.04)';
    cx.fillRect(0, 0, cv.width, cs * 4);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = d.board[r][c];
        if (cell !== 0) drawCell(cx, c, r, cell.c, cell.g, cs);
      }
    }
    if (d.cur) {
      let gy = d.cur.y;
      while (!hit(d.cur.b, d.cur.x, gy + 1)) gy++;
      if (gy !== d.cur.y) {
        cx.globalAlpha = 0.15;
        d.cur.b.forEach(([bx, by]) => {
          cx.strokeStyle = d.cur!.c;
          cx.lineWidth = 2;
          cx.setLineDash([4, 3]);
          cx.beginPath();
          cx.roundRect((d.cur!.x + bx) * cs + 2, (gy + by) * cs + 2, cs - 4, cs - 4, 2);
          cx.stroke();
          cx.setLineDash([]);
        });
        cx.globalAlpha = 1;
      }
    }
    if (d.cur) {
      d.cur.b.forEach(([bx, by]) => {
        if (d.cur!.y + by >= 0) drawCell(cx, d.cur!.x + bx, d.cur!.y + by, d.cur!.c, d.cur!.g, cs);
      });
    }
    renderNext(nx, nv.width);
  };

  const updateDisplay = () => {
    const d = gRef.current;
    setDisplayScore(d.score);
    setDisplayLevel(d.level);
    setDisplayLines(d.lines);
    setSectorName(getSector(d.level).name);
    d.starHue = getSector(d.level).hue;
  };

  const showSpaceFact = () => {
    if (phaseRef.current === 'math') return;
    const d = gRef.current;
    const text = FACTS[d.factIdx % FACTS.length];
    d.factIdx++;
    setFactText(text);
    setFactVisible(true);
    safeTimeout(() => setFactVisible(false), 3500);
  };

  const moveLeft = () => {
    if (!acceptInput('left')) return;
    const d = gRef.current;
    if (!d.cur || d.paused || d.over) return;
    if (!hit(d.cur.b, d.cur.x - 1, d.cur.y)) {
      d.cur.x--;
      if (d.lockTm > 0) d.lockTm = 0;
      sndMove();
      renderGame();
    }
  };

  const moveRight = () => {
    if (!acceptInput('right')) return;
    const d = gRef.current;
    if (!d.cur || d.paused || d.over) return;
    if (!hit(d.cur.b, d.cur.x + 1, d.cur.y)) {
      d.cur.x++;
      if (d.lockTm > 0) d.lockTm = 0;
      sndMove();
      renderGame();
    }
  };

  const rotate = (dir = 1) => {
    if (!acceptInput(dir === 1 ? 'cw' : 'ccw')) return;
    const d = gRef.current;
    if (!d.cur || d.paused || d.over || d.cur.type === 'O') return;
    const nb = rotateBlocks(d.cur.b, dir);
    for (const k of [0, 1, -1, 2, -2]) {
      if (!hit(nb, d.cur.x + k, d.cur.y)) {
        d.cur.b = nb;
        d.cur.x += k;
        if (d.lockTm > 0) d.lockTm = 0;
        sndRotate();
        renderGame();
        return;
      }
    }
  };

  const doSoftDrop = () => {
    if (!acceptInput('soft')) return;
    const d = gRef.current;
    if (!d.cur || d.paused || d.over) return;
    if (!hit(d.cur.b, d.cur.x, d.cur.y + 1)) {
      d.cur.y++;
      d.score += 1;
      d.lastDrop = performance.now();
      updateDisplay();
      renderGame();
    }
  };

  const endGame = () => {
    const d = gRef.current;
    d.over = true;
    d.running = false;
    sndGameOver();
    const score = d.score;
    const hi = d.hiScore;
    if (duelRef.current) {
      // A CPU/opponent score must never overwrite the original player's solo record.
      setHiMessage('Duel complete.');
    } else if (score > hi && hi > 0) {
      d.hiScore = score;
      localStorage.setItem(STORAGE_KEY, String(score));
      setHiMessage('🎉 NEW HIGH SCORE!');
    } else if (hi === 0) {
      d.hiScore = score;
      localStorage.setItem(STORAGE_KEY, String(score));
      setHiMessage('First run! Score saved.');
    } else {
      setHiMessage(`Best: ${hi.toLocaleString()}`);
    }
    setHighScore(d.hiScore);
    setDisplayScore(d.score);
    setGamePhase('gameover');
    phaseRef.current = 'gameover';
    duelRef.current?.onOver();
  };

  const spawn = () => {
    const d = gRef.current;
    const t = d.nxtT || pull();
    d.cur = makePiece(t);
    d.nxtT = pull();
    d.lockTm = 0;
    if (hit(d.cur.b, d.cur.x, d.cur.y)) {
      endGame();
    }
  };

  const finishMath = () => {
    cancelAnimationFrame(mathRafRef.current);
    const m = mathDataRef.current;
    const d = gRef.current;
    const bonus = m.correct * 250 * d.level;
    d.score += bonus;
    updateDisplay();
    setMathResData({ correct: m.correct, total: m.total, bonus });
    setGamePhase('mathresults');
    phaseRef.current = 'mathresults';
    safeTimeout(() => {
      d.paused = false;
      d.lastDrop = performance.now();
      d.prev2 = performance.now();
      setGamePhase('playing');
      phaseRef.current = 'playing';
    }, 2000);
  };

  const nextMathQuestion = () => {
    const m = mathDataRef.current;
    const d = gRef.current;
    m.answered = false;
    const q = genMathQ(d.level);
    m.correctAnswer = q.answer;
    setMathQ(q.qText + ' = ?');
    setMathOpts(q.options);
    setMathFb({ text: '\u00a0', type: '' });
    setMathSelIdx(null);
  };

  const startMathChallenge = () => {
    const m = mathDataRef.current;
    m.correct = 0;
    m.total = 0;
    m.answered = false;
    m.endTime = performance.now() + MATH_ROUND_SECONDS * 1000;
    setMathScoreText('0 / 0');
    if (mathTimerBarRef.current) {
      mathTimerBarRef.current.style.width = '100%';
      mathTimerBarRef.current.style.background = 'linear-gradient(90deg, #3ea8ff, #ffd84d)';
    }
    nextMathQuestion();
    const updateBar = () => {
      const now = performance.now();
      const remaining = Math.max(0, (m.endTime - now) / (MATH_ROUND_SECONDS * 1000));
      if (mathTimerBarRef.current) {
        mathTimerBarRef.current.style.width = `${remaining * 100}%`;
        mathTimerBarRef.current.style.background = remaining <= 0.3
          ? 'linear-gradient(90deg, #ff4d6a, #ffd84d)'
          : 'linear-gradient(90deg, #3ea8ff, #ffd84d)';
      }
      if (now < m.endTime) {
        mathRafRef.current = requestAnimationFrame(updateBar);
      } else {
        finishMath();
      }
    };
    mathRafRef.current = requestAnimationFrame(updateBar);
  };

  const handleMathAnswer = (idx: number, value: number) => {
    const m = mathDataRef.current;
    if (m.answered) return;
    m.answered = true;
    m.total++;
    if (value === m.correctAnswer) {
      m.correct++;
      sndCorrect();
      setMathFb({ text: '✓ Correct!', type: 'correct' });
    } else {
      sndWrong();
      setMathFb({ text: '✗ Nope!', type: 'wrong' });
    }
    setMathSelIdx(idx);
    setMathScoreText(`${m.correct} / ${m.total}`);
    safeTimeout(() => {
      if (performance.now() < m.endTime && phaseRef.current === 'math') {
        nextMathQuestion();
      }
    }, 600);
  };

  const triggerLevelUp = () => {
    const d = gRef.current;
    const sec = getSector(d.level);
    sndLevelUp();
    // Competitive rounds stay continuous; the complete bonus-maths mode is retained in Solo.
    if (duelRef.current) { showSpaceFact(); return; }
    setLevelUpText({ sector: sec.name.toUpperCase(), num: `SECTOR ${d.level}` });
    d.paused = true;
    setGamePhase('levelup');
    phaseRef.current = 'levelup';
    safeTimeout(() => {
      setGamePhase('math');
      phaseRef.current = 'math';
      startMathChallenge();
    }, 1500);
  };

  const clearLines = () => {
    const d = gRef.current;
    const fullRows: number[] = [];
    for (let r = ROWS - 1; r >= 0; r--) {
      if (d.board[r].every(c => c !== 0)) fullRows.push(r);
    }
    if (fullRows.length === 0) return 0;
    let cl = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (d.board[r].every(c => c !== 0)) {
        d.board.splice(r, 1);
        d.board.unshift(Array(COLS).fill(0));
        cl++;
        r++;
      }
    }
    const prevLines = d.lines;
    d.lines += cl;
    d.score += PTS[cl] * d.level;
    const newLevel = Math.floor(d.lines / 10) + 1;
    d.dropInt = Math.max(80, 1000 - (newLevel - 1) * 90);
    if (cl >= 4) sndTetris(); else sndClear();
    if (Math.floor(prevLines / 5) < Math.floor(d.lines / 5)) {
      safeTimeout(showSpaceFact, 500);
    }
    if (newLevel > d.level) {
      d.level = newLevel;
      updateDisplay();
      triggerLevelUp();
    } else {
      updateDisplay();
    }
    return cl;
  };

  const lockPiece = () => {
    const d = gRef.current;
    merge();
    const cleared = clearLines();
    d.locks++;
    if (duelRef.current) {
      const { outgoing, remaining } = resolveAttack(cleared, d.pending);
      d.pending = [];
      if (outgoing) { d.sent += outgoing; duelRef.current.onAttack(outgoing); }
      for (const hole of remaining) {
        if (d.board[0].some(Boolean)) { endGame(); return; }
        d.board.shift();
        d.board.push(Array.from({ length: COLS }, (_, c) => c === hole ? 0 : { c: '#738497', g: 'rgba(170,195,220,.3)' }));
      }
    }
    spawn();
  };

  const doHardDrop = () => {
    if (!acceptInput('hard')) return;
    const d = gRef.current;
    if (!d.cur || d.paused || d.over) return;
    let dist = 0;
    while (!hit(d.cur.b, d.cur.x, d.cur.y + 1)) {
      d.cur.y++;
      dist++;
    }
    d.score += dist * 2;
    updateDisplay();
    sndDrop();
    lockPiece();
    d.lastDrop = performance.now();
    renderGame();
  };

  const togglePause = () => {
    if (duelRef.current) return;
    const d = gRef.current;
    if (d.over || !d.running) return;
    if (phaseRef.current !== 'playing' && phaseRef.current !== 'paused') return;
    d.paused = !d.paused;
    if (d.paused) {
      setGamePhase('paused');
      phaseRef.current = 'paused';
    } else {
      d.lastDrop = performance.now();
      d.prev2 = performance.now();
      setGamePhase('playing');
      phaseRef.current = 'playing';
    }
  };

  const startGame = () => {
    cancelAnimationFrame(gameRafRef.current);
    timersRef.current.forEach(id => clearTimeout(id)); timersRef.current.clear();
    cancelAnimationFrame(mathRafRef.current);
    const d = gRef.current;
    d.board = Array(ROWS).fill(null).map(() => Array(COLS).fill(0));
    d.rng = seedNumber(duelRef.current?.seed ?? Date.now());
    d.bag = duelRef.current ? [] : shuffleBag();
    d.pending = []; d.sent = 0; d.locks = 0;
    d.score = 0;
    d.level = 1;
    d.lines = 0;
    d.dropInt = 1000;
    d.paused = false;
    d.over = false;
    d.running = true;
    d.lockTm = 0;
    d.factIdx = 0;
    d.nxtT = pull();
    spawn();
    updateDisplay();
    d.lastDrop = performance.now();
    d.prev2 = performance.now();
    setGamePhase('playing');
    phaseRef.current = 'playing';
    renderGame();
    const tick = (now: number) => {
      if (!gRef.current.running) return;
      if (gRef.current.paused || gRef.current.over) {
        gameRafRef.current = requestAnimationFrame(tick);
        return;
      }
      const dt = Math.min(100, now - gRef.current.prev2);
      gRef.current.prev2 = now;
      if (gRef.current.cur) {
        if (hit(gRef.current.cur.b, gRef.current.cur.x, gRef.current.cur.y + 1)) {
          gRef.current.lockTm += dt;
          if (gRef.current.lockTm > 500) {
            lockPiece();
            gRef.current.lastDrop = now;
            renderGame();
          }
        } else if (now - gRef.current.lastDrop >= gRef.current.dropInt) {
          gRef.current.cur.y++;
          gRef.current.lastDrop = now;
          gRef.current.lockTm = 0;
          renderGame();
        }
      }
      gameRafRef.current = requestAnimationFrame(tick);
    };
    if (!duelRef.current?.remote) gameRafRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    if (!duelRef.current) return;
    startGame();
    duelRef.current.onReady({
      input(action) {
        if (frozenRef.current || gRef.current.over) return;
        applyingInput.current = true;
        try { ({ left: moveLeft, right: moveRight, soft: doSoftDrop, hard: doHardDrop,
          cw: () => rotate(1), ccw: () => rotate(-1) })[action]?.(); }
        finally { applyingInput.current = false; }
      },
      snapshot() { return JSON.parse(JSON.stringify(gRef.current)); },
      hydrate(snapshot) {
        if (!snapshot?.board || snapshot.board.length !== ROWS || !snapshot.board.every((r: any) => Array.isArray(r) && r.length === COLS)) return;
        const cs = gRef.current.cs;
        const previous = { lines: gRef.current.lines, level: gRef.current.level, over: gRef.current.over };
        Object.assign(gRef.current, snapshot, { cs, lastDrop: performance.now(), prev2: performance.now() });
        if (duelRef.current?.remote && duelRef.current.controlled) {
          if (snapshot.over && !previous.over) sndGameOver();
          else if (snapshot.level > previous.level) sndLevelUp();
          else if (snapshot.lines > previous.lines) { if (snapshot.lines - previous.lines >= 4) sndTetris(); else sndClear(); }
        }
        frozenRef.current = !!snapshot.paused;
        updateDisplay(); renderGame();
        const phase = snapshot.over ? 'gameover' : snapshot.paused ? 'paused' : 'playing';
        setGamePhase(phase); phaseRef.current = phase;
      },
      garbage(holes) { gRef.current.pending.push(...holes.slice(0, 20)); },
      freeze(paused) {
        frozenRef.current = paused; gRef.current.paused = paused;
        gRef.current.lastDrop = performance.now(); gRef.current.prev2 = performance.now();
      },
    });
  }, []);

  const resize = useCallback(() => {
    const cv = gameCanvasRef.current;
    const nv = nextCanvasRef.current;
    const sf = starCanvasRef.current;
    const container = containerRef.current;
    const bf = boardFrameRef.current;
    if (!cv || !nv || !container || !bf) return;
    if (sf) {
      sf.width = container.clientWidth;
      sf.height = container.clientHeight;
    }
    const frameRect = bf.getBoundingClientRect();
    const cs = frameRect.width / COLS;
    gRef.current.cs = cs;
    cv.width = Math.floor(COLS * cs);
    cv.height = Math.floor(ROWS * cs);
    const parentEl = nv.parentElement;
    const np = parentEl ? Math.max(parentEl.clientWidth - 10, 30) : 48;
    nv.width = np;
    nv.height = np;
    renderGame();
  }, []);

  useEffect(() => {
    const sf = starCanvasRef.current;
    const container = containerRef.current;
    if (!sf || !container) return;
    const ctx = sf.getContext('2d');
    if (!ctx) return;
    const initStars = () => {
      sf.width = container.clientWidth;
      sf.height = container.clientHeight;
      const stars: typeof starsRef.current = [];
      for (let i = 0; i < 120; i++) {
        stars.push({
          x: Math.random() * sf.width,
          y: Math.random() * sf.height,
          r: Math.random() * 1.5 + 0.3,
          sp: Math.random() * 0.3 + 0.05,
          a: Math.random() * 0.6 + 0.4,
          tw: Math.random() * Math.PI * 2,
        });
      }
      starsRef.current = stars;
    };
    const drawStars = () => {
      if (!mountedRef.current) return;
      ctx.fillStyle = '#04060e';
      ctx.fillRect(0, 0, sf.width, sf.height);
      const hue = gRef.current.starHue;
      starsRef.current.forEach(s => {
        s.y += s.sp;
        s.tw += 0.02;
        if (s.y > sf.height) {
          s.y = 0;
          s.x = Math.random() * sf.width;
        }
        const fl = 0.7 + 0.3 * Math.sin(s.tw);
        ctx.globalAlpha = s.a * fl;
        ctx.fillStyle = `hsl(${hue + Math.random() * 30}, 60%, 85%)`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      starRafRef.current = requestAnimationFrame(drawStars);
    };
    initStars();
    starRafRef.current = requestAnimationFrame(drawStars);
    const handleResize = () => initStars();
    window.addEventListener('resize', handleResize);
    return () => {
      cancelAnimationFrame(starRafRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    const raf = requestAnimationFrame(() => resize());
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [resize]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const d = gRef.current;
      if (!d.running || d.over) return;
      if ((e.target as HTMLElement)?.closest('input,textarea,select')) return;
      if (duelRef.current) {
        const cfg = duelRef.current;
        if (!cfg.controlled || cfg.keys === 'none') return;
        const keys: Record<string, Action> = cfg.keys === 'wasd'
          ? { a: 'left', d: 'right', s: 'soft', w: 'cw', q: 'ccw', f: 'hard' }
          : { ArrowLeft: 'left', ArrowRight: 'right', ArrowDown: 'soft', ArrowUp: 'cw', z: 'ccw', ' ': 'hard' };
        const action = keys[e.key] || keys[e.key.toLowerCase()];
        if (action) { e.preventDefault(); ({ left: moveLeft, right: moveRight, soft: doSoftDrop, hard: doHardDrop,
          cw: () => rotate(1), ccw: () => rotate(-1) })[action](); }
        return;
      }
      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        e.preventDefault();
        togglePause();
        return;
      }
      if (d.paused) return;
      switch (e.key) {
        case 'ArrowLeft': e.preventDefault(); moveLeft(); break;
        case 'ArrowRight': e.preventDefault(); moveRight(); break;
        case 'ArrowDown': e.preventDefault(); doSoftDrop(); break;
        case 'ArrowUp': e.preventDefault(); rotate(1); break;
        case 'z': case 'Z': rotate(-1); break;
        case ' ': e.preventDefault(); doHardDrop(); break;
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const boardEl = boardFrameRef.current;
    if (!boardEl) return;
    let tId: number | null = null;
    let tx0 = 0, ty0 = 0, tx1 = 0, ty1 = 0;
    let tTime0 = 0;
    let gest: string | null = null;
    let dragAcc = 0, lastDragX = 0;
    let softDrp = false;
    const TAP_TH = 12, SWIPE_TH = 25;
    const handleStart = (e: TouchEvent) => {
      const d = gRef.current;
      if (d.paused || d.over || !d.running) return;
      e.preventDefault();
      const t = e.changedTouches[0];
      tId = t.identifier;
      tx0 = tx1 = t.clientX;
      ty0 = ty1 = t.clientY;
      tTime0 = performance.now();
      gest = null;
      dragAcc = 0;
      lastDragX = t.clientX;
      softDrp = false;
    };
    const handleMove = (e: TouchEvent) => {
      const d = gRef.current;
      if (d.paused || d.over || !d.running) return;
      e.preventDefault();
      const t = Array.from(e.changedTouches).find(tt => tt.identifier === tId);
      if (!t) return;
      tx1 = t.clientX;
      ty1 = t.clientY;
      const dx = tx1 - tx0, dy = ty1 - ty0;
      const adx = Math.abs(dx), ady = Math.abs(dy);
      if (gest === null && (adx > TAP_TH || ady > TAP_TH)) {
        gest = adx > ady ? 'h' : 'v';
        if (gest === 'h') lastDragX = tx0;
        if (gest === 'v' && dy > 0) softDrp = true;
      }
      if (gest === 'h') {
        const cellPx = d.cs || 30;
        const moved = tx1 - lastDragX;
        if (Math.abs(moved) >= cellPx) {
          const cells = Math.floor(Math.abs(moved) / cellPx);
          const dir = moved > 0 ? 1 : -1;
          for (let i = 0; i < cells; i++) {
            if (dir > 0) moveRight(); else moveLeft();
          }
          lastDragX += dir * cells * cellPx;
        }
      }
      if (gest === 'v' && softDrp) {
        const cellPy = d.cs || 30;
        const moved = ty1 - ty0 - dragAcc;
        if (moved >= cellPy) {
          const cells = Math.floor(moved / cellPy);
          for (let i = 0; i < cells; i++) doSoftDrop();
          dragAcc += cells * cellPy;
        }
      }
    };
    const handleEnd = (e: TouchEvent) => {
      const d = gRef.current;
      if (d.paused || d.over || !d.running) return;
      e.preventDefault();
      const t = Array.from(e.changedTouches).find(tt => tt.identifier === tId);
      if (!t) return;
      tx1 = t.clientX;
      ty1 = t.clientY;
      const dy = ty1 - ty0;
      const adx = Math.abs(tx1 - tx0), ady = Math.abs(dy);
      const elapsed = performance.now() - tTime0;
      if (gest === null && adx < TAP_TH && ady < TAP_TH) {
        rotate(1);
      } else if (gest === 'v' && dy < -SWIPE_TH) {
        rotate(1);
      } else if (gest === 'v' && dy > SWIPE_TH && elapsed < 300) {
        doHardDrop();
      }
      tId = null;
      gest = null;
    };
    const handleCancel = () => { tId = null; gest = null; };
    boardEl.addEventListener('touchstart', handleStart, { passive: false });
    boardEl.addEventListener('touchmove', handleMove, { passive: false });
    boardEl.addEventListener('touchend', handleEnd, { passive: false });
    boardEl.addEventListener('touchcancel', handleCancel, { passive: false });
    return () => {
      boardEl.removeEventListener('touchstart', handleStart);
      boardEl.removeEventListener('touchmove', handleMove);
      boardEl.removeEventListener('touchend', handleEnd);
      boardEl.removeEventListener('touchcancel', handleCancel);
    };
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cancelAnimationFrame(starRafRef.current);
      cancelAnimationFrame(gameRafRef.current);
      cancelAnimationFrame(mathRafRef.current);
      timersRef.current.forEach(id => clearTimeout(id));
      timersRef.current.clear();
      Object.values(btnStateRef.current).forEach(b => { if (b.timeout) clearTimeout(b.timeout); if (b.interval) clearInterval(b.interval); });
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  const startBtn = (key: string, action: () => void, repeat: boolean) => {
    if (!btnStateRef.current[key]) btnStateRef.current[key] = { timeout: null, interval: null, active: false };
    const b = btnStateRef.current[key];
    if (b.active) return;
    b.active = true;
    action();
    if (repeat) {
      b.timeout = setTimeout(() => {
        b.interval = setInterval(action, 60);
      }, 180);
    }
  };

  const endBtn = (key: string) => {
    if (!btnStateRef.current[key]) return;
    const b = btnStateRef.current[key];
    b.active = false;
    if (b.timeout) { clearTimeout(b.timeout); b.timeout = null; }
    if (b.interval) { clearInterval(b.interval); b.interval = null; }
  };

  const btnHandlers = (key: string, action: () => void, repeat: boolean) => ({
    onMouseDown: (e: React.MouseEvent) => { e.preventDefault(); startBtn(key, action, repeat); },
    onMouseUp: (e: React.MouseEvent) => { e.preventDefault(); endBtn(key); },
    onMouseLeave: () => endBtn(key),
    onTouchStart: (e: React.TouchEvent) => { e.preventDefault(); startBtn(key, action, repeat); },
    onTouchEnd: (e: React.TouchEvent) => { e.preventDefault(); endBtn(key); },
    onTouchCancel: () => endBtn(key),
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  });

  return (
    <div
      ref={containerRef}
      className={duel ? 'cargo-engine cargo-duel-engine' : 'cargo-engine'}
      data-testid="cargo-bay-game-container"
      data-vaul-no-drag
      style={{
        display: 'flex', flexDirection: 'column', height: '100%', position: 'relative',
        overflow: 'hidden', background: '#04060e', color: '#d8dce8', userSelect: 'none',
        touchAction: 'none',
      }}
    >
      <canvas ref={starCanvasRef} style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }} />

      <div className="cargo-top" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '6px 12px', zIndex: 2, flexShrink: 0,
        background: 'linear-gradient(180deg, rgba(4,6,14,0.9) 0%, transparent 100%)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '1rem' }}>🎮</span>
          <span style={{
            fontWeight: 900, fontSize: '1rem', letterSpacing: 3,
            background: 'linear-gradient(135deg, #3ea8ff, #ffd84d)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            {duel ? duel.label : 'CARGO BAY'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', gap: 10, fontSize: '0.65rem', color: '#5a6488', fontWeight: 600 }}>
            <span>LVL <span style={{ color: '#ffd84d', fontWeight: 700 }}>{displayLevel}</span></span>
            <span>PTS <span style={{ color: '#ffd84d', fontWeight: 700 }}>{displayScore}</span></span>
          </div>
          <button
            data-testid="button-mute-cargo-bay"
            onClick={() => setMuted(!muted)}
            style={{
              appearance: 'none',
              border: `1px solid ${muted ? 'rgba(255,77,106,0.3)' : 'rgba(50,70,120,0.35)'}`,
              background: 'rgba(8,14,28,0.92)',
              color: muted ? '#ff4d6a' : '#5a6488',
              width: 28, height: 28, borderRadius: 6, fontSize: '0.85rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
          >
            {muted ? '🔇' : '🔊'}
          </button>
          <button
            data-testid="button-close-cargo-bay"
            onClick={onClose}
            style={{ color: '#5a6488', background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="cargo-play-area" style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '100%', minHeight: 0, padding: '2px 4px', position: 'relative', zIndex: 2,
      }}>
        <div className="cargo-board-row" style={{ display: 'flex', gap: 8, alignItems: 'stretch', height: '100%' }}>
          <div
            ref={boardFrameRef}
            className="cargo-board-frame"
            style={{
              position: 'relative',
              border: '2px solid rgba(50,70,120,0.35)',
              borderRadius: 8, overflow: 'hidden',
              background: 'rgba(8,14,28,0.92)',
              aspectRatio: '1/2', height: '100%', maxWidth: duel ? 'calc(100vw - 100px)' : undefined,
              boxShadow: '0 0 30px rgba(62,168,255,0.12), inset 0 0 40px rgba(0,0,0,0.4)',
            }}
          >
            <canvas ref={gameCanvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
          </div>

          <div className="cargo-sidebar" style={{ display: 'flex', flexDirection: 'column', gap: 5, width: 65, flexShrink: 0 }}>
            <div style={sidePanelBox}>
              <div style={sidePanelLabel}>NEXT</div>
              <canvas
                ref={nextCanvasRef}
                style={{ display: 'block', width: '100%', aspectRatio: '1', borderRadius: 4, background: 'rgba(0,0,0,0.4)' }}
              />
            </div>
            <div style={{
              background: 'linear-gradient(135deg, rgba(62,168,255,0.1), rgba(255,77,106,0.1))',
              border: '1px solid rgba(50,70,120,0.35)', borderRadius: 6, padding: 5, textAlign: 'center',
            }}>
              <div style={{ fontSize: '0.4rem', color: '#3ea8ff', letterSpacing: 1.5 }}>SECTOR</div>
              <div style={{ fontWeight: 700, fontSize: '0.55rem', color: '#d8dce8', lineHeight: 1.2, marginTop: 2 }}>
                {sectorName}
              </div>
            </div>
            <div style={sidePanelBox}>
              <div style={sidePanelLabel}>SCORE</div>
              <div data-testid="text-cargo-score" style={sidePanelValue}>{displayScore}</div>
            </div>
            <div style={sidePanelBox}>
              <div style={sidePanelLabel}>LEVEL</div>
              <div data-testid="text-cargo-level" style={sidePanelValue}>{displayLevel}</div>
            </div>
            <div style={sidePanelBox}>
              <div style={sidePanelLabel}>LINES</div>
              <div data-testid="text-cargo-lines" style={sidePanelValue}>{displayLines}</div>
            </div>
            <div style={sidePanelBox}>
              <div style={sidePanelLabel}>BEST</div>
              <div
                data-testid="text-cargo-high-score"
                style={{ ...sidePanelValue, color: '#ff4d6a', textShadow: '0 0 8px rgba(255,77,106,0.45)' }}
              >
                {highScore}
              </div>
            </div>
          </div>
        </div>

        {gamePhase === 'idle' && (
          <div style={overlayBase}>
            <div style={{
              fontWeight: 900, fontSize: '1.8rem', letterSpacing: 5, marginBottom: 4,
              background: 'linear-gradient(135deg, #3ea8ff, #ffd84d)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              CARGO BAY
            </div>
            <div style={{ color: '#5a6488', fontSize: '0.75rem', marginBottom: 16, textAlign: 'center', lineHeight: 1.5 }}>
              Stack cargo crates in the station bay.<br />Clear lines to advance through sectors!
            </div>
            <button data-testid="button-launch-cargo-bay" onClick={startGame} style={actionBtnStyle}>
              LAUNCH
            </button>
          </div>
        )}

        {gamePhase === 'gameover' && (
          <div style={overlayBase}>
            <div style={{ fontWeight: 900, fontSize: '1.8rem', letterSpacing: 5, marginBottom: 4, color: '#ff4d6a' }}>
              STATION FULL
            </div>
            <div style={{ color: '#5a6488', fontSize: '0.75rem', marginBottom: 16 }}>
              Cargo bay overflow!
            </div>
            <div style={{
              fontWeight: 700, fontSize: '2.2rem', color: '#ffd84d',
              textShadow: '0 0 20px rgba(255,216,77,0.4)', marginBottom: 4,
            }}>
              {displayScore.toLocaleString()}
            </div>
            <div style={{
              fontSize: '0.55rem', color: '#5a6488', letterSpacing: 3,
              textTransform: 'uppercase', marginBottom: 20,
            }}>
              TOTAL CARGO POINTS
            </div>
            <div style={{ fontSize: '0.7rem', color: '#ff4d6a', marginBottom: 20, fontWeight: 600 }}>
              {hiMessage}
            </div>
            {!duel && <button
              data-testid="button-relaunch-cargo-bay"
              onClick={startGame}
              style={{ ...actionBtnStyle, borderColor: '#ffd84d', color: '#ffd84d' }}
            >
              RELAUNCH
            </button>}
          </div>
        )}

        {gamePhase === 'paused' && !duel && (
          <div style={overlayBase}>
            <div style={{ fontWeight: 900, fontSize: '1.8rem', letterSpacing: 5, marginBottom: 4, color: '#5a6488' }}>
              DOCKED
            </div>
            <button
              data-testid="button-resume-cargo-bay"
              onClick={togglePause}
              style={{ ...actionBtnStyle, marginTop: 16 }}
            >
              RESUME
            </button>
          </div>
        )}

        {gamePhase === 'levelup' && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 60,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(4,6,14,0.88)', backdropFilter: 'blur(4px)',
          }}>
            <div style={{ fontSize: '0.65rem', color: '#5a6488', letterSpacing: 2 }}>ENTERING</div>
            <div style={{
              fontWeight: 900, fontSize: '1.4rem', letterSpacing: 4, color: '#3ea8ff',
              textShadow: '0 0 30px rgba(62,168,255,0.35)', marginBottom: 4,
            }}>
              {levelUpText.sector}
            </div>
            <div style={{ fontSize: '0.65rem', color: '#5a6488', letterSpacing: 2 }}>
              {levelUpText.num}
            </div>
          </div>
        )}

        {gamePhase === 'math' && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 70,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(4,6,14,0.96)', backdropFilter: 'blur(8px)',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              width: 260, marginBottom: 12,
            }}>
              <div style={{ fontSize: '0.5rem', color: '#3ea8ff', letterSpacing: 2, textTransform: 'uppercase' }}>
                ⚡ CARGO BONUS ROUND
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#4dff91' }}>{mathScoreText}</div>
            </div>
            <div style={{
              width: 260, height: 6, background: 'rgba(255,255,255,0.08)',
              borderRadius: 3, marginBottom: 16, overflow: 'hidden',
            }}>
              <div
                ref={mathTimerBarRef}
                style={{
                  height: '100%', background: 'linear-gradient(90deg, #3ea8ff, #ffd84d)',
                  borderRadius: 3, transition: 'width 0.1s linear', width: '100%',
                }}
              />
            </div>
            <div style={{
              fontWeight: 700, fontSize: '1.8rem', color: '#d8dce8', marginBottom: 16,
              textShadow: '0 0 10px rgba(255,255,255,0.1)', minHeight: '2.2rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {mathQ}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, width: 240, marginBottom: 8 }}>
              {mathOpts.map((opt, idx) => {
                let btnBorder = 'rgba(50,70,120,0.35)';
                let btnBg = 'rgba(12,18,38,0.85)';
                let btnColor = '#d8dce8';
                let opacity = 1;
                const disabled = mathSelIdx !== null;
                if (disabled) {
                  const correctAnswer = mathDataRef.current.correctAnswer;
                  if (idx === mathSelIdx) {
                    if (opt === correctAnswer) {
                      btnBorder = '#4dff91'; btnBg = 'rgba(77,255,145,0.15)'; btnColor = '#4dff91';
                    } else {
                      btnBorder = '#ff4d6a'; btnBg = 'rgba(255,77,106,0.15)'; btnColor = '#ff4d6a';
                    }
                  } else if (opt === correctAnswer) {
                    btnBorder = '#4dff91'; btnBg = 'rgba(77,255,145,0.15)'; btnColor = '#4dff91';
                  } else {
                    opacity = 0.5;
                  }
                }
                return (
                  <button
                    key={idx}
                    disabled={disabled}
                    onClick={() => handleMathAnswer(idx, opt)}
                    style={{
                      appearance: 'none', border: `2px solid ${btnBorder}`, background: btnBg,
                      color: btnColor, fontWeight: 700, fontSize: '1.2rem', padding: 14,
                      borderRadius: 10, cursor: disabled ? 'default' : 'pointer', opacity,
                      touchAction: 'manipulation',
                    }}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
            <div style={{
              fontSize: '0.7rem', fontWeight: 600, minHeight: '1.2rem',
              color: mathFb.type === 'correct' ? '#4dff91' : mathFb.type === 'wrong' ? '#ff4d6a' : 'transparent',
            }}>
              {mathFb.text}
            </div>
          </div>
        )}

        {gamePhase === 'mathresults' && (
          <div style={overlayBase}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.5rem', color: '#3ea8ff', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>
                BONUS ROUND COMPLETE
              </div>
              <div style={{ fontSize: '0.65rem', color: '#5a6488', marginBottom: 4 }}>
                {mathResData.correct} / {mathResData.total} correct
              </div>
              <div style={{
                fontWeight: 900, fontSize: '1.6rem', color: '#ffd84d',
                textShadow: '0 0 20px rgba(255,216,77,0.4)', margin: '8px 0',
              }}>
                {mathResData.bonus > 0 ? `+${mathResData.bonus.toLocaleString()}` : 'No bonus'}
              </div>
              <div style={{ fontSize: '0.65rem', color: '#5a6488' }}>CARGO BONUS POINTS</div>
            </div>
          </div>
        )}

        <div style={{
          position: 'absolute', bottom: '20%', left: '50%',
          transform: `translateX(-50%) translateY(${factVisible ? '-10px' : '0'})`,
          opacity: factVisible ? 1 : 0,
          transition: 'opacity 0.4s, transform 0.4s',
          background: 'rgba(12,18,38,0.85)', border: '1px solid rgba(50,70,120,0.35)',
          borderRadius: 10, padding: '10px 16px', maxWidth: 280, textAlign: 'center',
          zIndex: 40, pointerEvents: 'none',
        }}>
          <div style={{ fontSize: '1.2rem', marginBottom: 4 }}>🪐</div>
          <div style={{ fontSize: '0.6rem', color: '#d8dce8', lineHeight: 1.4 }}>{factText}</div>
        </div>
      </div>

      <div className="cargo-controls" style={{
        flexShrink: 0, width: '100%', padding: '6px 10px 10px',
        display: duel && !duel.controlled ? 'none' : 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 2,
      }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <button aria-label="Move left" style={ctrlBtnStyle} {...btnHandlers('L', moveLeft, true)}>◀</button>
          <button aria-label="Soft drop" style={ctrlBtnStyle} {...btnHandlers('D', doSoftDrop, true)}>▼</button>
          <button aria-label="Move right" style={ctrlBtnStyle} {...btnHandlers('R', moveRight, true)}>▶</button>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            style={{ ...ctrlBtnStyle, borderColor: 'rgba(62,168,255,0.3)', color: '#3ea8ff' }}
            {...btnHandlers('Rot', () => rotate(1), false)}
            aria-label="Rotate clockwise"
          >
            ↻
          </button>
          <button
            style={{ ...ctrlBtnStyle, borderColor: 'rgba(255,77,106,0.3)', color: '#ff4d6a' }}
            {...btnHandlers('Drp', doHardDrop, false)}
            aria-label="Hard drop"
          >
            ⤓
          </button>
          {!duel && <button
            style={{ ...ctrlBtnStyle, width: 36, height: 36, fontSize: '0.8rem' }}
            {...btnHandlers('Pau', togglePause, false)}
          >
            ⏸
          </button>}
        </div>
      </div>

      <div style={{ padding: '4px 12px 6px', zIndex: 2, flexShrink: 0 }}>
        <p style={{ fontSize: '0.65rem', color: '#5a6488', textAlign: 'center' }}>
          {duel ? `Pending garbage: ${gRef.current.pending.length} · Sent: ${gRef.current.sent}` : 'Original StarMuff Cargo Bay · Solo with maths and sector progression'}
        </p>
      </div>
    </div>
  );
}
