import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  KENO_GRID_SIZE,
  KENO_MAX_PICKS,
  KENO_MIN_PICKS,
  KENO_PAYOUT_TABLE,
  kenoPayoutChips,
  kenoMinMatchesToWin,
  kenoCellOdds,
} from '@/lib/keno-math';

interface AsteroidKenoProps {
  playerShards: number;
  disabled?: boolean;
  saveNotice?: React.ReactNode;
  onUpdateShards: (newShards: number) => void;
  onExit: () => void;
}

type GamePhase = 'picking' | 'drawing' | 'results';

interface GameHistoryEntry {
  picks: number[];
  drawn: number[];
  matches: number;
  bet: number;
  winnings: number;
  timestamp: number;
}

const ARIA_HISTORY_LESSONS = [
  {
    title: "📜 Ancient Origins",
    content: "Keno dates back over 2,000 years to ancient China! Legend says it was created to fund the Great Wall. Players picked characters from a poem, and results were sent to villages by carrier pigeons - that's why it was called the 'White Pigeon Game'."
  },
  {
    title: "🚂 Journey to America",
    content: "Chinese immigrants brought Keno to the US in the 1800s during the railroad construction era. The 120 Chinese characters were replaced with 80 numbers to make it accessible to English speakers."
  },
  {
    title: "🎰 Modern Casino Era",
    content: "Nevada legalized gambling in 1931, but 'lotteries' were illegal. Casinos renamed it 'Horse Race Keno' to get around the law! The horses were eventually dropped, giving us today's number-based Keno."
  },
];

const ARIA_MATH_LESSONS = [
  {
    title: "🎲 The Probability Math",
    content: "With 20 draws from 40 numbers, each spot has a 50% chance of being hit. But matching multiple picks is harder! The odds of hitting 5/5 are about 1 in 42 - that's why it pays 12x."
  },
  {
    title: "📊 Expected Value Explained",
    content: "Expected Value (EV) = (Win Amount × Win Probability) - Bet. If you bet 10 chips on 5 picks: your EV is about -0.9 chips per game. The house always has an edge, but entertainment has value too!"
  },
  {
    title: "🧮 Combination Formula",
    content: "The number of ways to pick k items from n is: C(n,k) = n! / (k! × (n-k)!). For picking 5 from 40: C(40,5) = 658,008 possible combinations. Math is everywhere in games of chance!"
  },
  {
    title: "📈 Variance vs Expected Value",
    content: "Low picks (1-3) = low variance, frequent small wins. High picks (7-10) = high variance, rare big wins. Same house edge, different experiences. Which suits your play style?"
  },
  {
    title: "🎯 Optimal Strategy?",
    content: "Mathematically, all pick counts have similar house edges (~10%). There's no 'best' strategy - but picking 4-6 numbers balances win frequency with payout size for most players."
  },
];

const ARIA_QUICK_TIPS = [
  "🎯 Tap numbers on the grid to select them, then set your bet and launch!",
  "💡 Green = match, Orange = asteroid hit (no match), Blue = your pick (missed)",
  "⚡ Quick Pick randomly selects 3-8 numbers if you want to play fast!",
];

export default function AsteroidKeno({ disabled = false, saveNotice, playerShards, onUpdateShards, onExit }: AsteroidKenoProps) {
  const [phase, setPhase] = useState<GamePhase>('picking');
  const [bet, setBet] = useState(10);
  const [picks, setPicks] = useState<number[]>([]);
  const [drawnNumbers, setDrawnNumbers] = useState<number[]>([]);
  const [revealedCount, setRevealedCount] = useState(0);
  const [matches, setMatches] = useState(0);
  const [winnings, setWinnings] = useState(0);
  const [showPayouts, setShowPayouts] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showLearn, setShowLearn] = useState(false);
  const [gameHistory, setGameHistory] = useState<GameHistoryEntry[]>([]);
  const [lessonIndex, setLessonIndex] = useState(0);
  const [lessonType, setLessonType] = useState<'history' | 'math'>('history');
  
  const revealIntervalRef = useRef<number | null>(null);
  const hasPaidRef = useRef(false);

  const allLessons = lessonType === 'history' ? ARIA_HISTORY_LESSONS : ARIA_MATH_LESSONS;
  const currentLesson = allLessons[lessonIndex % allLessons.length];

  const toggleNumber = useCallback((num: number) => {
    if (phase !== 'picking') return;
    
    setPicks(prev => {
      if (prev.includes(num)) {
        return prev.filter(n => n !== num);
      } else if (prev.length < KENO_MAX_PICKS) {
        return [...prev, num];
      }
      return prev;
    });
  }, [phase]);

  const startDraw = useCallback(() => {
    if (disabled || bet > playerShards || bet < 1 || picks.length < KENO_MIN_PICKS) return;
    
    onUpdateShards(playerShards - bet);
    
    const drawn: number[] = [];
    while (drawn.length < 20) {
      const num = Math.floor(Math.random() * KENO_GRID_SIZE) + 1;
      if (!drawn.includes(num)) {
        drawn.push(num);
      }
    }
    setDrawnNumbers(drawn);
    setPhase('drawing');
    setRevealedCount(0);
    hasPaidRef.current = false;
  }, [disabled, picks, bet, playerShards, onUpdateShards]);

  useEffect(() => {
    if (phase !== 'drawing') return;
    
    revealIntervalRef.current = window.setInterval(() => {
      setRevealedCount(prev => {
        if (prev >= 20) {
          if (revealIntervalRef.current) clearInterval(revealIntervalRef.current);
          return prev;
        }
        return prev + 1;
      });
    }, 200);

    return () => {
      if (revealIntervalRef.current) clearInterval(revealIntervalRef.current);
    };
  }, [phase]);

  useEffect(() => {
    if (phase === 'drawing' && revealedCount >= 20 && !hasPaidRef.current) {
      hasPaidRef.current = true;
      
      const hitCount = picks.filter(p => drawnNumbers.includes(p)).length;
      setMatches(hitCount);
      
      const payout = kenoPayoutChips(bet, picks.length, hitCount);
      setWinnings(payout);
      
      if (payout > 0) {
        onUpdateShards(playerShards + payout);
      }
      
      setGameHistory(prev => [{
        picks: [...picks],
        drawn: [...drawnNumbers],
        matches: hitCount,
        bet,
        winnings: payout,
        timestamp: Date.now()
      }, ...prev.slice(0, 9)]);
      
      setTimeout(() => setPhase('results'), 500);
    }
  }, [phase, revealedCount, picks, drawnNumbers, bet, playerShards, onUpdateShards]);

  const playAgain = useCallback(() => {
    setPhase('picking');
    setPicks([]);
    setDrawnNumbers([]);
    setRevealedCount(0);
    setMatches(0);
    setWinnings(0);
  }, []);

  const quickPick = useCallback(() => {
    const count = Math.floor(Math.random() * 6) + 3;
    const newPicks: number[] = [];
    while (newPicks.length < count) {
      const num = Math.floor(Math.random() * KENO_GRID_SIZE) + 1;
      if (!newPicks.includes(num)) {
        newPicks.push(num);
      }
    }
    setPicks(newPicks);
  }, []);

  const clearPicks = useCallback(() => {
    setPicks([]);
  }, []);

  const getNumberStyle = (num: number) => {
    const isPicked = picks.includes(num);
    const isDrawn = drawnNumbers.slice(0, revealedCount).includes(num);
    const isMatch = isPicked && isDrawn;
    
    if (isMatch) {
      return 'bg-gradient-to-br from-green-400 to-emerald-600 text-white shadow-lg shadow-green-500/50 scale-110 animate-pulse';
    } else if (isDrawn && !isPicked) {
      return 'bg-gradient-to-br from-orange-500 to-amber-600 text-white';
    } else if (isPicked) {
      return 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white border-2 border-cyan-300';
    } else {
      return 'bg-slate-700 text-slate-300 hover:bg-slate-600';
    }
  };

  const minToWin = picks.length > 0 ? kenoMinMatchesToWin(picks.length) : 0;

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-slate-900 via-purple-900/20 to-slate-900 p-4 overflow-y-auto">
      <div className="max-w-lg mx-auto pb-24">
        {saveNotice}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onExit}
            className="text-slate-400 hover:text-white transition-colors"
            data-testid="button-keno-exit"
          >
            ← Back
          </button>
          <div className="flex gap-1">
            <button
              onClick={() => { setShowLearn(!showLearn); setShowHistory(false); setShowPayouts(false); }}
              className={`px-2 py-1 rounded text-xs ${showLearn ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-slate-300'}`}
              data-testid="button-toggle-learn"
            >
              🎓 Learn
            </button>
            <button
              onClick={() => { setShowPayouts(!showPayouts); setShowHistory(false); setShowLearn(false); }}
              className={`px-2 py-1 rounded text-xs ${showPayouts ? 'bg-amber-600 text-white' : 'bg-slate-700 text-slate-300'}`}
              data-testid="button-toggle-payouts"
            >
              📊 Odds
            </button>
            <button
              onClick={() => { setShowHistory(!showHistory); setShowPayouts(false); setShowLearn(false); }}
              className={`px-2 py-1 rounded text-xs ${showHistory ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300'}`}
              data-testid="button-toggle-history"
            >
              📜
            </button>
          </div>
          <div className="text-cyan-400 font-bold">
            💎 {playerShards}
          </div>
        </div>

        <div className="text-center mb-4">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-500">
            ☄️ Asteroid Keno
          </h1>
          <p className="text-slate-400 text-sm">Tap numbers to pick, then launch asteroids!</p>
        </div>

        {showLearn && (
          <div className="bg-slate-800/90 rounded-xl p-4 mb-4 border border-cyan-500/30">
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => { setLessonType('history'); setLessonIndex(0); }}
                className={`flex-1 py-2 rounded-lg text-sm font-bold ${lessonType === 'history' ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-slate-300'}`}
              >
                📜 History
              </button>
              <button
                onClick={() => { setLessonType('math'); setLessonIndex(0); }}
                className={`flex-1 py-2 rounded-lg text-sm font-bold ${lessonType === 'math' ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-slate-300'}`}
              >
                🧮 Payout Math
              </button>
            </div>
            
            <div className="bg-slate-700/50 rounded-lg p-4 mb-3">
              <div className="flex items-start gap-2 mb-2">
                <span className="text-2xl">🤖</span>
                <div>
                  <div className="text-cyan-300 font-bold text-sm">A.R.I.A. teaches:</div>
                  <div className="text-amber-400 font-bold">{currentLesson.title}</div>
                </div>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed">{currentLesson.content}</p>
            </div>
            
            <div className="flex justify-between items-center">
              <button
                onClick={() => setLessonIndex(prev => Math.max(0, prev - 1))}
                disabled={lessonIndex === 0}
                className="px-3 py-1 bg-slate-700 rounded text-slate-300 disabled:opacity-50"
              >
                ← Prev
              </button>
              <span className="text-slate-500 text-xs">
                {lessonIndex + 1} / {allLessons.length}
              </span>
              <button
                onClick={() => setLessonIndex(prev => Math.min(allLessons.length - 1, prev + 1))}
                disabled={lessonIndex >= allLessons.length - 1}
                className="px-3 py-1 bg-slate-700 rounded text-slate-300 disabled:opacity-50"
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {showHistory && gameHistory.length > 0 && (
          <div className="bg-slate-800/90 rounded-xl p-4 mb-4 border border-purple-500/30">
            <h3 className="text-lg font-bold text-purple-400 mb-3">📜 Recent Games</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {gameHistory.map((game, idx) => (
                <div key={game.timestamp} className="bg-slate-700/50 rounded-lg p-2 text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-slate-400">Game #{gameHistory.length - idx}</span>
                    <span className={game.winnings > 0 ? 'text-green-400 font-bold' : 'text-slate-500'}>
                      {game.winnings > 0 ? `+💎${game.winnings}` : 'No win'}
                    </span>
                  </div>
                  <div className="text-slate-300">
                    <span className="text-cyan-400">Picks:</span> {game.picks.sort((a,b) => a-b).join(', ')}
                  </div>
                  <div className="text-slate-400">
                    Matched {game.matches}/{game.picks.length} • Bet: 💎{game.bet}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {showHistory && gameHistory.length === 0 && (
          <div className="bg-slate-800/60 rounded-xl p-4 mb-4 text-center text-slate-500">
            No games played yet. Play a round to see your history!
          </div>
        )}

        {showPayouts && (
          <div className="bg-slate-800/90 rounded-xl p-4 mb-4 border border-amber-500/30">
            <h3 className="text-lg font-bold text-amber-400 mb-3 text-center">📊 Payout Table & Odds</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-400">
                    <th className="p-1 text-left">Picks</th>
                    <th className="p-1">Min</th>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(m => (
                      <th key={m} className="p-1">{m}✓</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(pickCount => (
                    <tr key={pickCount} className={`text-slate-300 ${picks.length === pickCount ? 'bg-cyan-900/30' : ''}`}>
                      <td className="p-1 text-cyan-400 font-bold">{pickCount}</td>
                      <td className="p-1 text-center text-yellow-400">{kenoMinMatchesToWin(pickCount)}+</td>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(matchCount => (
                        <td key={matchCount} className="p-1 text-center">
                          {matchCount <= pickCount ? (
                            <span className={KENO_PAYOUT_TABLE[pickCount]?.[matchCount] > 0 ? 'text-green-400' : 'text-slate-600'}>
                              {KENO_PAYOUT_TABLE[pickCount]?.[matchCount] || 0}x
                            </span>
                          ) : (
                            <span className="text-slate-700">-</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {picks.length > 0 && (
              <div className="mt-4 bg-slate-700/50 rounded-lg p-3">
                <div className="text-sm text-cyan-400 font-bold mb-2">
                  Your {picks.length} pick{picks.length > 1 ? 's' : ''} odds:
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {Array.from({ length: picks.length + 1 }, (_, i) => i).map(m => (
                    <div key={m} className="flex justify-between">
                      <span className="text-slate-400">{m} match{m !== 1 ? 'es' : ''}:</span>
                      <span className={KENO_PAYOUT_TABLE[picks.length]?.[m] > 0 ? 'text-green-400' : 'text-slate-500'}>
                        {kenoCellOdds(picks.length, m)} → {KENO_PAYOUT_TABLE[picks.length]?.[m] || 0}x
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <p className="text-slate-500 text-xs text-center mt-3">
              20 asteroids drawn from 40 coordinates • House edge ~10%
            </p>
          </div>
        )}

        {phase === 'picking' && (
          <div className="bg-slate-800/80 rounded-xl p-4 mb-4">
            <div className="flex justify-between items-center mb-3">
              <div className="text-slate-400 text-sm">
                Picks: <span className="text-cyan-400 font-bold">{picks.length}/{KENO_MAX_PICKS}</span>
                {picks.length > 0 && (
                  <span className="text-yellow-400 ml-2">(need {minToWin}+ to win)</span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={quickPick}
                  className="px-3 py-1 bg-purple-600 rounded text-xs text-white hover:bg-purple-500"
                  data-testid="button-quick-pick"
                >
                  🎲 Quick
                </button>
                <button
                  onClick={clearPicks}
                  className="px-3 py-1 bg-slate-700 rounded text-xs text-slate-300 hover:bg-slate-600"
                  data-testid="button-clear-picks"
                >
                  Clear
                </button>
              </div>
            </div>
            {picks.length > 0 && (
              <div className="bg-slate-700/50 rounded-lg p-2 mb-3">
                <div className="text-xs text-slate-400 mb-1">Your picks:</div>
                <div className="flex flex-wrap gap-1">
                  {picks.sort((a, b) => a - b).map(num => (
                    <span key={num} className="px-2 py-1 bg-cyan-600 rounded text-white text-sm font-bold">
                      {num}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {picks.length === 0 && (
              <div className="text-center text-sm text-slate-500 bg-slate-700/30 rounded-lg p-3">
                👆 Tap numbers on the grid below to select your coordinates!
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-8 gap-1 mb-4">
          {Array.from({ length: KENO_GRID_SIZE }, (_, i) => i + 1).map(num => (
            <button
              key={num}
              onClick={() => toggleNumber(num)}
              disabled={phase === 'drawing' || phase === 'results'}
              className={`aspect-square rounded text-sm font-bold transition-all ${getNumberStyle(num)}`}
              data-testid={`keno-num-${num}`}
            >
              {num}
            </button>
          ))}
        </div>

        {phase === 'picking' && picks.length >= KENO_MIN_PICKS && (
          <div className="bg-slate-800/80 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-center gap-4 mb-4">
              <button
                onClick={() => setBet(Math.max(1, bet - 10))}
                className="w-10 h-10 bg-slate-700 rounded-lg text-white font-bold hover:bg-slate-600"
                data-testid="button-bet-decrease"
              >
                -
              </button>
              <div className="text-center">
                <div className="text-xs text-slate-400">Wager</div>
                <div className="text-2xl font-bold text-cyan-400">💎 {bet}</div>
              </div>
              <button
                onClick={() => setBet(Math.min(playerShards, bet + 10))}
                className="w-10 h-10 bg-slate-700 rounded-lg text-white font-bold hover:bg-slate-600"
                data-testid="button-bet-increase"
              >
                +
              </button>
            </div>
            <div className="flex justify-center gap-2 mb-4">
              {[10, 50, 100, 500].map(amount => (
                <button
                  key={amount}
                  onClick={() => setBet(Math.min(playerShards, amount))}
                  className={`px-3 py-1 rounded text-sm ${bet === amount ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                  data-testid={`button-bet-${amount}`}
                >
                  {amount}
                </button>
              ))}
            </div>
            <button
              onClick={startDraw}
              disabled={disabled || bet > playerShards || bet < 1}
              className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl text-white font-bold text-xl shadow-lg shadow-green-500/30 animate-pulse disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="button-draw"
            >
              ☄️ LAUNCH ASTEROIDS! (Bet 💎{bet})
            </button>
          </div>
        )}

        {phase === 'drawing' && (
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-400 animate-pulse mb-2">
              ☄️ Asteroids Falling... {revealedCount}/20
            </div>
            <div className="w-full bg-slate-700 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-orange-500 to-amber-500 h-3 rounded-full transition-all duration-200"
                style={{ width: `${(revealedCount / 20) * 100}%` }}
              />
            </div>
          </div>
        )}

        {phase === 'results' && (
          <div className="bg-slate-800/80 rounded-xl p-6">
            <div className="bg-slate-700/50 rounded-lg p-3 mb-4">
              <div className="text-xs text-slate-400 mb-1">Your picks were:</div>
              <div className="flex flex-wrap gap-1">
                {picks.sort((a, b) => a - b).map(num => {
                  const isMatch = drawnNumbers.includes(num);
                  return (
                    <span 
                      key={num} 
                      className={`px-2 py-1 rounded text-sm font-bold ${
                        isMatch 
                          ? 'bg-green-600 text-white' 
                          : 'bg-slate-600 text-slate-300'
                      }`}
                    >
                      {num} {isMatch && '✓'}
                    </span>
                  );
                })}
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-lg text-slate-400 mb-2">
                Matched <span className="text-cyan-400 font-bold">{matches}</span> of {picks.length}
                <span className="text-slate-500 text-sm ml-2">(needed {minToWin}+ to win)</span>
              </div>
              
              {winnings > 0 ? (
                <>
                  <div className="text-4xl font-bold text-green-400 mb-2 animate-bounce">
                    🎉 You won 💎{winnings}!
                  </div>
                  <div className="text-slate-400 text-sm mb-4">
                    {bet} × {KENO_PAYOUT_TABLE[picks.length]?.[matches] || 0}x = {winnings}
                  </div>
                </>
              ) : (
                <div className="mb-4">
                  <div className="text-2xl font-bold text-slate-400 mb-1">
                    {matches > 0 ? `${matches} match${matches > 1 ? 'es' : ''} - not enough to win` : 'No matches'}
                  </div>
                  <div className="text-slate-500 text-sm">
                    {matches > 0 
                      ? `You needed ${minToWin}+ matches for a payout with ${picks.length} picks`
                      : 'Better luck next time, Commander!'
                    }
                  </div>
                </div>
              )}
              
              <button
                onClick={playAgain}
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl text-white font-bold text-lg"
                data-testid="button-play-again"
              >
                🎮 Play Again
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 text-center">
          <div className="flex justify-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-gradient-to-br from-cyan-500 to-blue-600"></div>
              <span className="text-slate-400">Your Pick</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-gradient-to-br from-orange-500 to-amber-600"></div>
              <span className="text-slate-400">Asteroid Hit</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-gradient-to-br from-green-400 to-emerald-600"></div>
              <span className="text-slate-400">Match!</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
