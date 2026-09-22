// Derived from sqaz2/StarMuff client/src/components/SimonGame.tsx
// Source blob 2b4a6a04994f87df7eb72aa8dab9874ceb623428 (see upstream/).
// Original pads, colors, tones, score, playback timing and solo rules preserved.
// Additions: one-attempt adapter and cancellable timers/audio/input guards.
import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Trophy, Play, RotateCcw } from 'lucide-react';

export type ColorKey = 0 | 1 | 2 | 3;
interface SimonGameProps {
  onClose: () => void;
  challenge?: { id: string; sequence: ColorKey[]; resumeInputs?: ColorKey[];
    onProgress?: (inputs: ColorKey[]) => void; onComplete: (inputs: ColorKey[]) => void };
}
let unlockedAudio: AudioContext | null = null;
export function unlockSimonAudio() {
  try {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    if (!unlockedAudio || unlockedAudio.state === 'closed') unlockedAudio = new AC();
    if (unlockedAudio.state === 'suspended') void unlockedAudio.resume();
    return unlockedAudio;
  } catch { return null; }
}
const COLORS = [
  { bg: 'bg-cyan-600', active: 'bg-cyan-400', glow: 'shadow-cyan-400/50', name: 'Cyan' },
  { bg: 'bg-purple-600', active: 'bg-purple-400', glow: 'shadow-purple-400/50', name: 'Purple' },
  { bg: 'bg-pink-600', active: 'bg-pink-400', glow: 'shadow-pink-400/50', name: 'Magenta' },
  { bg: 'bg-green-600', active: 'bg-green-400', glow: 'shadow-green-400/50', name: 'Green' },
];
const FREQUENCIES = [261.63, 329.63, 392.00, 523.25];
const STORAGE_KEY = 'simonHighScore';
function readBest() {
  try { return Math.max(0, Number.parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10) || 0); }
  catch { return 0; }
}

export default function SimonGame({ onClose, challenge }: SimonGameProps) {
  const [isShowingSequence, setIsShowingSequence] = useState(false);
  const [activeColor, setActiveColor] = useState<ColorKey | null>(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(readBest);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover' | 'complete'>('idle');
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillators = useRef(new Set<OscillatorNode>());
  const timers = useRef(new Map<ReturnType<typeof setTimeout>, (ok: boolean) => void>());
  const generation = useRef(0);
  const inputs = useRef<ColorKey[]>([]);
  const pattern = useRef<ColorKey[]>([]);
  const inputEnabled = useRef(false);
  const mounted = useRef(false);
  const challengeRef = useRef(challenge);
  challengeRef.current = challenge;

  const cancel = useCallback(() => {
    generation.current++;
    inputEnabled.current = false;
    for (const [timer, resolve] of timers.current) { clearTimeout(timer); resolve(false); }
    timers.current.clear();
    for (const oscillator of oscillators.current) { try { oscillator.stop(); oscillator.disconnect(); } catch {} }
    oscillators.current.clear();
  }, []);
  const delay = useCallback((ms: number, epoch: number) => new Promise<boolean>(resolve => {
    if (epoch !== generation.current || !mounted.current) return resolve(false);
    const id = setTimeout(() => {
      timers.current.delete(id);
      resolve(epoch === generation.current && mounted.current);
    }, ms);
    timers.current.set(id, resolve);
  }), []);
  const audio = useCallback(() => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = unlockSimonAudio();
        if (!audioContextRef.current) return null;
      }
      if (audioContextRef.current.state === 'suspended') void audioContextRef.current.resume();
      return audioContextRef.current;
    } catch { return null; }
  }, []);
  const tone = useCallback((color: ColorKey, duration = 300, error = false) => {
    const ctx = audio();
    if (!ctx) return;
    try {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.connect(gain); gain.connect(ctx.destination);
      oscillator.type = error ? 'sawtooth' : 'sine';
      oscillator.frequency.setValueAtTime(error ? 150 : FREQUENCIES[color], ctx.currentTime);
      if (error) oscillator.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.5);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000);
      oscillators.current.add(oscillator);
      oscillator.onended = () => { oscillators.current.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
      oscillator.start(ctx.currentTime); oscillator.stop(ctx.currentTime + duration / 1000);
    } catch {}
  }, [audio]);
  const flash = useCallback(async (color: ColorKey, duration: number, epoch: number) => {
    if (epoch !== generation.current) return false;
    setActiveColor(color); tone(color, duration);
    if (!(await delay(duration, epoch))) return false;
    setActiveColor(null);
    return delay(100, epoch);
  }, [tone, delay]);
  const showSequence = useCallback(async (seq: ColorKey[], epoch: number, wait = 500) => {
    inputEnabled.current = false; inputs.current = []; pattern.current = seq;
    setIsShowingSequence(true);
    if (!(await delay(wait, epoch))) return;
    for (const color of seq) if (!(await flash(color, 400, epoch))) return;
    if (epoch !== generation.current) return;
    inputEnabled.current = true; setIsShowingSequence(false);
  }, [delay, flash]);
  const startGame = useCallback(() => {
    cancel(); audio(); setActiveColor(null); setScore(0); setGameState('playing');
    const first = [Math.floor(Math.random() * 4) as ColorKey];
    void showSequence(first, generation.current, 1000);
  }, [cancel, audio, showSequence]);

  const handleColorPress = useCallback((color: ColorKey) => {
    if (!inputEnabled.current) return;
    const epoch = generation.current;
    const index = inputs.current.length;
    inputs.current.push(color);
    challengeRef.current?.onProgress?.([...inputs.current]);
    void flash(color, 200, epoch);
    if (color !== pattern.current[index]) {
      inputEnabled.current = false; tone(color, 500, true); setGameState('gameover');
      if (challengeRef.current) {
        const result = [...inputs.current];
        void delay(550, epoch).then(ok => { if (ok) challengeRef.current?.onComplete(result); });
      }
      return;
    }
    if (inputs.current.length !== pattern.current.length) return;
    inputEnabled.current = false; setIsShowingSequence(true);
    const newScore = pattern.current.length;
    setScore(newScore);
    // Duel scores do not overwrite the original solo high-score record.
    if (!challengeRef.current) {
      setHighScore(previous => Math.max(previous, newScore));
      try { if (newScore > readBest()) localStorage.setItem(STORAGE_KEY, String(newScore)); } catch {}
    }
    if (challengeRef.current) {
      setGameState('complete');
      const result = [...inputs.current];
      void delay(300, epoch).then(ok => { if (ok) challengeRef.current?.onComplete(result); });
    } else {
      const next = [...pattern.current, Math.floor(Math.random() * 4) as ColorKey];
      void showSequence(next, epoch, 2000);
    }
  }, [flash, tone, showSequence, delay]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false; cancel();
      if (audioContextRef.current) void audioContextRef.current.close();
      audioContextRef.current = null;
    };
  }, [cancel]);
  useEffect(() => {
    if (!challenge) return;
    cancel(); setScore(0); setActiveColor(null); setGameState('playing');
    if (challenge.resumeInputs) {
      pattern.current = [...challenge.sequence]; inputs.current = [...challenge.resumeInputs];
      setIsShowingSequence(false); inputEnabled.current = true;
    } else void showSequence([...challenge.sequence], generation.current, 1000);
    return cancel;
  }, [challenge?.id, cancel, showSequence]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.repeat || !/^[1-4]$/.test(event.key) || /INPUT|TEXTAREA|SELECT/.test((event.target as HTMLElement)?.tagName)) return;
      event.preventDefault(); handleColorPress((Number(event.key) - 1) as ColorKey);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [handleColorPress]);

  return (
    <div className="flex flex-col h-full" data-testid="simon-game-container">
      <div className="flex items-center justify-between px-4 py-3 border-b border-purple-500/30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center"><span className="text-sm">🎮</span></div>
          <span className="text-white font-medium">Simon Protocol</span>
        </div>
        <button onClick={() => { cancel(); onClose(); }} aria-label="Close Simon" data-testid="button-close-simon" className="text-slate-400 hover:text-white transition-colors p-1"><X className="w-5 h-5" /></button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center p-4 space-y-4">
        <div className="flex items-center gap-6 text-center">
          <div><p className="text-xs text-slate-400 uppercase tracking-wider">{challenge ? 'Length' : 'Score'}</p><p className="text-2xl font-bold text-cyan-400" data-testid="text-score">{challenge ? challenge.sequence.length : score}</p></div>
          <div className="w-px h-8 bg-purple-500/30" />
          <div><p className="text-xs text-slate-400 uppercase tracking-wider flex items-center gap-1"><Trophy className="w-3 h-3 text-amber-400" /> Solo Best</p><p className="text-2xl font-bold text-amber-400" data-testid="text-high-score">{highScore}</p></div>
        </div>
        <div className="grid grid-cols-2 gap-3 w-full max-w-[280px]">
          {COLORS.map((color, index) => (
            <button key={index} data-testid={`button-simon-${index}`} disabled={isShowingSequence || gameState !== 'playing'} onClick={() => handleColorPress(index as ColorKey)}
              className={`aspect-square rounded-2xl transition-all duration-150 border-2 ${activeColor === index ? `${color.active} border-white shadow-lg ${color.glow}` : `${color.bg} border-slate-700/50 hover:border-slate-600`} ${(isShowingSequence || gameState !== 'playing') ? 'cursor-default' : 'cursor-pointer active:scale-95'} disabled:opacity-70`}
              aria-label={`${color.name} button, key ${index + 1}`} />
          ))}
        </div>
        {gameState === 'idle' && <button onClick={startGame} data-testid="button-start-simon" className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-medium rounded-xl transition-all shadow-lg shadow-purple-500/20"><Play className="w-5 h-5" />Start Game</button>}
        {gameState === 'playing' && <p className="text-sm text-slate-400" aria-live="polite" data-testid="text-game-status">{isShowingSequence ? 'Watch the sequence...' : 'Your turn - repeat the pattern!'}</p>}
        {gameState === 'complete' && <p className="text-green-400" role="status">Sequence complete!</p>}
        {gameState === 'gameover' && <div className="text-center space-y-3"><p className="text-red-400 font-medium" data-testid="text-game-over">{challenge ? 'Attempt complete' : 'Game Over!'}</p><p className="text-slate-400 text-sm">You remembered {score} {score === 1 ? 'pattern' : 'patterns'}</p>{!challenge && <button onClick={startGame} data-testid="button-restart-simon" className="flex items-center gap-2 px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors"><RotateCcw className="w-4 h-4" />Try Again</button>}</div>}
      </div>
      <div className="px-4 py-3 border-t border-purple-500/30 bg-slate-900/50"><p className="text-xs text-slate-500 text-center">Memory exercise initiated by A.R.I.A. • Tap the pads or use keys 1–4</p></div>
    </div>
  );
}
