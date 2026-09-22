import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Trophy, Play, RotateCcw } from 'lucide-react';

interface SimonGameProps {
  onClose: () => void;
}

type ColorKey = 0 | 1 | 2 | 3;

const COLORS: { bg: string; active: string; glow: string; name: string }[] = [
  { bg: 'bg-cyan-600', active: 'bg-cyan-400', glow: 'shadow-cyan-400/50', name: 'Cyan' },
  { bg: 'bg-purple-600', active: 'bg-purple-400', glow: 'shadow-purple-400/50', name: 'Purple' },
  { bg: 'bg-pink-600', active: 'bg-pink-400', glow: 'shadow-pink-400/50', name: 'Magenta' },
  { bg: 'bg-green-600', active: 'bg-green-400', glow: 'shadow-green-400/50', name: 'Green' },
];

const FREQUENCIES = [261.63, 329.63, 392.00, 523.25];

const STORAGE_KEY = 'simonHighScore';

export default function SimonGame({ onClose }: SimonGameProps) {
  const [sequence, setSequence] = useState<ColorKey[]>([]);
  const [playerIndex, setPlayerIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isShowingSequence, setIsShowingSequence] = useState(false);
  const [activeColor, setActiveColor] = useState<ColorKey | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? parseInt(saved, 10) : 0;
  });
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover'>('idle');
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const isMountedRef = useRef(true);
  const timeoutIdsRef = useRef<NodeJS.Timeout[]>([]);

  const playTone = useCallback((colorIndex: ColorKey, duration = 300) => {
    try {
      if (!audioContextRef.current) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;
        audioContextRef.current = new AudioContextClass();
      }
      
      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(FREQUENCIES[colorIndex], ctx.currentTime);
      
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration / 1000);
    } catch (e) {
      console.log('Audio playback failed:', e);
    }
  }, []);

  const playErrorSound = useCallback(() => {
    try {
      if (!audioContextRef.current) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;
        audioContextRef.current = new AudioContextClass();
      }
      
      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(150, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.5);
      
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.log('Audio playback failed:', e);
    }
  }, []);

  const flashColor = useCallback((colorIndex: ColorKey, duration = 400): Promise<void> => {
    return new Promise((resolve) => {
      setActiveColor(colorIndex);
      playTone(colorIndex, duration);
      setTimeout(() => {
        setActiveColor(null);
        setTimeout(resolve, 100);
      }, duration);
    });
  }, [playTone]);

  const showSequence = useCallback(async (seq: ColorKey[]) => {
    setIsShowingSequence(true);
    setPlayerIndex(0);
    
    await new Promise(r => setTimeout(r, 500));
    
    for (const colorIndex of seq) {
      await flashColor(colorIndex, 400);
    }
    
    setIsShowingSequence(false);
  }, [flashColor]);

  const addToSequence = useCallback(() => {
    const newColor = Math.floor(Math.random() * 4) as ColorKey;
    const newSequence = [...sequence, newColor];
    setSequence(newSequence);
    return newSequence;
  }, [sequence]);

  const startGame = useCallback(() => {
    setSequence([]);
    setPlayerIndex(0);
    setGameOver(false);
    setScore(0);
    setGameState('playing');
    setIsPlaying(true);
    
    const firstColor = Math.floor(Math.random() * 4) as ColorKey;
    const initialSequence = [firstColor];
    setSequence(initialSequence);
    
    setTimeout(() => {
      showSequence(initialSequence);
    }, 500);
  }, [showSequence]);

  const handleColorPress = useCallback((colorIndex: ColorKey) => {
    if (isShowingSequence || gameOver || gameState !== 'playing') return;
    
    flashColor(colorIndex, 200);
    
    if (colorIndex === sequence[playerIndex]) {
      const nextIndex = playerIndex + 1;
      
      if (nextIndex === sequence.length) {
        const newScore = sequence.length;
        setScore(newScore);
        
        if (newScore > highScore) {
          setHighScore(newScore);
          localStorage.setItem(STORAGE_KEY, newScore.toString());
        }
        
        setPlayerIndex(0);
        
        setTimeout(() => {
          const newSequence = addToSequence();
          setTimeout(() => {
            showSequence(newSequence);
          }, 500);
        }, 1000);
      } else {
        setPlayerIndex(nextIndex);
      }
    } else {
      playErrorSound();
      setGameOver(true);
      setGameState('gameover');
      setIsPlaying(false);
    }
  }, [isShowingSequence, gameOver, gameState, sequence, playerIndex, highScore, addToSequence, showSequence, flashColor, playErrorSound]);

  const safeSetTimeout = useCallback((fn: () => void, delay: number) => {
    const id = setTimeout(() => {
      if (isMountedRef.current) fn();
    }, delay);
    timeoutIdsRef.current.push(id);
    return id;
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      timeoutIdsRef.current.forEach(id => clearTimeout(id));
      timeoutIdsRef.current = [];
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return (
    <div className="flex flex-col h-full" data-testid="simon-game-container">
      <div className="flex items-center justify-between px-4 py-3 border-b border-purple-500/30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
            <span className="text-sm">🎮</span>
          </div>
          <span className="text-white font-medium">Simon Protocol</span>
        </div>
        <button
          onClick={onClose}
          data-testid="button-close-simon"
          className="text-slate-400 hover:text-white transition-colors p-1"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4 space-y-4">
        <div className="flex items-center gap-6 text-center">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider">Score</p>
            <p className="text-2xl font-bold text-cyan-400" data-testid="text-score">{score}</p>
          </div>
          <div className="w-px h-8 bg-purple-500/30" />
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Trophy className="w-3 h-3 text-amber-400" /> Best
            </p>
            <p className="text-2xl font-bold text-amber-400" data-testid="text-high-score">{highScore}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 w-full max-w-[280px]">
          {COLORS.map((color, index) => (
            <button
              key={index}
              data-testid={`button-simon-${index}`}
              disabled={isShowingSequence || gameState !== 'playing'}
              onClick={() => handleColorPress(index as ColorKey)}
              className={`
                aspect-square rounded-2xl transition-all duration-150 border-2
                ${activeColor === index 
                  ? `${color.active} border-white shadow-lg ${color.glow}` 
                  : `${color.bg} border-slate-700/50 hover:border-slate-600`
                }
                ${(isShowingSequence || gameState !== 'playing') ? 'cursor-default' : 'cursor-pointer active:scale-95'}
                disabled:opacity-70
              `}
              aria-label={`${color.name} button`}
            />
          ))}
        </div>

        {gameState === 'idle' && (
          <button
            onClick={startGame}
            data-testid="button-start-simon"
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-medium rounded-xl transition-all shadow-lg shadow-purple-500/20"
          >
            <Play className="w-5 h-5" />
            Start Game
          </button>
        )}

        {gameState === 'playing' && (
          <p className="text-sm text-slate-400" data-testid="text-game-status">
            {isShowingSequence ? 'Watch the sequence...' : 'Your turn - repeat the pattern!'}
          </p>
        )}

        {gameState === 'gameover' && (
          <div className="text-center space-y-3">
            <p className="text-red-400 font-medium" data-testid="text-game-over">Game Over!</p>
            <p className="text-slate-400 text-sm">You remembered {score} {score === 1 ? 'pattern' : 'patterns'}</p>
            <button
              onClick={startGame}
              data-testid="button-restart-simon"
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        )}
      </div>

      <div className="px-4 py-3 border-t border-purple-500/30 bg-slate-900/50">
        <p className="text-xs text-slate-500 text-center">
          Memory exercise initiated by A.R.I.A. • Say "back to chat" to return
        </p>
      </div>
    </div>
  );
}

