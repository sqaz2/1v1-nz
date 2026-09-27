import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CREATURE_DEFINITIONS, type CreatureDefinition } from '@/lib/creatures';

interface Racer {
  id: string;
  name: string;
  emoji: string;
  position: number;
  speed: number;
  baseSpeed: number;
  lane: number;
  boosted: boolean;
  finished: boolean;
  finishTime: number | null;
}

interface CompanionRacingProps {
  playerShards: number;
  disabled?: boolean;
  saveNotice?: React.ReactNode;
  capturedCreatures: { id: string }[];
  onUpdateShards: (newShards: number) => void;
  onExit: () => void;
}

type GamePhase = 'betting' | 'racing' | 'results';

const TRACK_LENGTH = 100;
const RACE_DURATION_MS = 15000;
const UPDATE_INTERVAL_MS = 50;

const HOUSE_RACERS: Racer[] = [
  { id: 'nebula_runner', name: 'Nebula Runner', emoji: '🌀', position: 0, speed: 0, baseSpeed: 1.2, lane: 0, boosted: false, finished: false, finishTime: null },
  { id: 'cosmic_dash', name: 'Cosmic Dash', emoji: '💫', position: 0, speed: 0, baseSpeed: 1.1, lane: 1, boosted: false, finished: false, finishTime: null },
  { id: 'void_streak', name: 'Void Streak', emoji: '🕳️', position: 0, speed: 0, baseSpeed: 1.3, lane: 2, boosted: false, finished: false, finishTime: null },
  { id: 'star_bolt', name: 'Star Bolt', emoji: '⚡', position: 0, speed: 0, baseSpeed: 1.0, lane: 3, boosted: false, finished: false, finishTime: null },
];

const ARIA_HISTORY_LESSONS = [
  {
    title: "📜 Ancient Horse Racing",
    content: "Betting on races dates back over 4,000 years! Ancient Greeks, Romans, and Egyptians all wagered on chariot and horse races. It was one of the first organized forms of gambling."
  },
  {
    title: "🏇 The Birth of Odds",
    content: "Modern betting odds were invented in 18th century England. Bookmakers would calculate each horse's chance of winning and set payouts accordingly - the less likely to win, the higher the payout!"
  },
  {
    title: "🚀 Space Age Racing",
    content: "In the Star Muff universe, companion racing evolved from ancient traditions. Instead of horses, star creatures bond with pilots and race through cosmic obstacle courses!"
  },
];

const ARIA_MATH_LESSONS = [
  {
    title: "🎲 Understanding Odds",
    content: "Odds of 3.0x mean you get 3× your bet if you win. If a racer has 25% chance to win, fair odds would be 4.0x. The house edge comes from paying slightly less than fair odds."
  },
  {
    title: "📊 Expected Value",
    content: "EV = (Probability × Payout) - Bet. Example: 3.0x odds with 30% win chance → EV = (0.30 × 30) - 10 = -1 chip per 10 bet. Negative EV means the house has an edge."
  },
  {
    title: "🧮 Probability From Speed",
    content: "We calculate win probability from base speeds. A racer with speed 1.3 vs others at 1.0, 1.1, 1.2 has probability: 1.3 ÷ (1.0+1.1+1.2+1.3) = 28.3% chance to win."
  },
  {
    title: "📈 Variance in Racing",
    content: "Unlike Keno where outcomes are fixed, racing adds random speed variance each tick. This means even slow racers can win with lucky boosts - that's why underdogs sometimes pull ahead!"
  },
  {
    title: "💰 Payout Calculation",
    content: "Your winnings = Bet × Odds. If you bet 50 chips on a racer at 2.5x odds and they win, you get 125 chips back (50 × 2.5). You profit 75 chips!"
  },
];

function creatureToRacer(creature: CreatureDefinition, lane: number): Racer {
  const baseSpeed = 1.0 + (creature.bondDifficulty * 0.1);
  return {
    id: creature.id,
    name: creature.name,
    emoji: creature.emoji,
    position: 0,
    speed: 0,
    baseSpeed,
    lane,
    boosted: false,
    finished: false,
    finishTime: null,
  };
}

function calculateOdds(racers: Racer[]): Map<string, number> {
  const totalSpeed = racers.reduce((sum, r) => sum + r.baseSpeed, 0);
  const odds = new Map<string, number>();
  
  racers.forEach(racer => {
    const winProbability = racer.baseSpeed / totalSpeed;
    const calculatedOdds = Math.max(1.2, (1 / winProbability) * 0.9);
    odds.set(racer.id, Math.round(calculatedOdds * 10) / 10);
  });
  
  return odds;
}

function calculateWinProbability(racer: Racer, allRacers: Racer[]): number {
  const totalSpeed = allRacers.reduce((sum, r) => sum + r.baseSpeed, 0);
  return (racer.baseSpeed / totalSpeed) * 100;
}

export default function CompanionRacing({ disabled = false, saveNotice, playerShards, capturedCreatures, onUpdateShards, onExit }: CompanionRacingProps) {
  const [phase, setPhase] = useState<GamePhase>('betting');
  const [bet, setBet] = useState(10);
  const [selectedRacer, setSelectedRacer] = useState<string | null>(null);
  const [racers, setRacers] = useState<Racer[]>([]);
  const [raceTime, setRaceTime] = useState(0);
  const [finishOrder, setFinishOrder] = useState<string[]>([]);
  const [winnings, setWinnings] = useState(0);
  const [odds, setOdds] = useState<Map<string, number>>(new Map());
  const [showLearn, setShowLearn] = useState(false);
  const [showOdds, setShowOdds] = useState(false);
  const [lessonIndex, setLessonIndex] = useState(0);
  const [lessonType, setLessonType] = useState<'history' | 'math'>('history');
  
  const raceIntervalRef = useRef<number | null>(null);
  const boostTimeoutRef = useRef<number | null>(null);
  const raceStartTimeRef = useRef<number>(0);

  const allLessons = lessonType === 'history' ? ARIA_HISTORY_LESSONS : ARIA_MATH_LESSONS;
  const currentLesson = allLessons[lessonIndex % allLessons.length];

  useEffect(() => {
    const playerRacers: Racer[] = capturedCreatures
      .slice(0, 2)
      .map((c, idx) => {
        const def = CREATURE_DEFINITIONS.find(d => d.id === c.id);
        if (def) {
          return creatureToRacer(def, idx);
        }
        return null;
      })
      .filter((r): r is Racer => r !== null);
    
    const houseRacersNeeded = 4 - playerRacers.length;
    const houseSelection = [...HOUSE_RACERS]
      .sort(() => Math.random() - 0.5)
      .slice(0, houseRacersNeeded)
      .map((r, idx) => ({ ...r, lane: playerRacers.length + idx }));
    
    const allRacers = [...playerRacers, ...houseSelection];
    setRacers(allRacers);
    setOdds(calculateOdds(allRacers));
  }, [capturedCreatures]);

  const startRace = useCallback(() => {
    if (disabled || !selectedRacer || bet > playerShards || bet < 1) return;
    
    onUpdateShards(playerShards - bet);
    
    setRacers(prev => prev.map(r => ({
      ...r,
      position: 0,
      speed: r.baseSpeed * (0.8 + Math.random() * 0.4),
      boosted: false,
      finished: false,
      finishTime: null,
    })));
    setFinishOrder([]);
    setRaceTime(0);
    setPhase('racing');
    
    boostTimeoutRef.current = window.setTimeout(() => {
      setRacers(prev => prev.map(r => {
        if (Math.random() < 0.3) {
          return { ...r, boosted: true, speed: r.speed * 1.3 };
        }
        return r;
      }));
    }, 5000 + Math.random() * 3000);
  }, [disabled, selectedRacer, bet, playerShards, onUpdateShards]);

  useEffect(() => {
    if (phase !== 'racing') return;
    
    // Store start time in ref so it persists across re-renders
    raceStartTimeRef.current = Date.now();
    
    raceIntervalRef.current = window.setInterval(() => {
      const elapsed = Date.now() - raceStartTimeRef.current;
      setRaceTime(elapsed);
      
      setRacers(prev => {
        const updated = prev.map(racer => {
          if (racer.finished) return racer;
          
          const variance = (Math.random() - 0.5) * 0.3;
          const newSpeed = racer.speed + variance;
          const actualSpeed = Math.max(0.5, Math.min(2.5, newSpeed));
          
          const moveAmount = actualSpeed * (UPDATE_INTERVAL_MS / 1000) * (TRACK_LENGTH / (RACE_DURATION_MS / 1000));
          const newPosition = Math.min(TRACK_LENGTH, racer.position + moveAmount);
          
          const justFinished = newPosition >= TRACK_LENGTH && !racer.finished;
          
          return {
            ...racer,
            speed: newSpeed,
            position: newPosition,
            finished: newPosition >= TRACK_LENGTH,
            finishTime: justFinished ? elapsed : racer.finishTime,
          };
        });
        
        const newFinishers = updated
          .filter(r => r.finished && r.finishTime !== null)
          .sort((a, b) => (a.finishTime || 0) - (b.finishTime || 0))
          .map(r => r.id);
        
        setFinishOrder(prev => {
          if (newFinishers.length > prev.length) {
            return newFinishers;
          }
          return prev;
        });
        
        if (updated.every(r => r.finished)) {
          if (raceIntervalRef.current) clearInterval(raceIntervalRef.current);
          
          setTimeout(() => {
            const winner = updated
              .filter(r => r.finished)
              .sort((a, b) => (a.finishTime || 0) - (b.finishTime || 0))[0];
            
            if (winner && winner.id === selectedRacer) {
              const multiplier = odds.get(selectedRacer) || 1;
              const payout = Math.floor(bet * multiplier);
              setWinnings(payout);
              onUpdateShards(playerShards + payout);
            } else {
              setWinnings(0);
            }
            
            setPhase('results');
          }, 500);
        }
        
        return updated;
      });
    }, UPDATE_INTERVAL_MS);

    return () => {
      if (raceIntervalRef.current) clearInterval(raceIntervalRef.current);
      if (boostTimeoutRef.current) clearTimeout(boostTimeoutRef.current);
    };
    // Note: Only depend on phase to prevent re-running and resetting race timer
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const playAgain = useCallback(() => {
    setPhase('betting');
    setSelectedRacer(null);
    setFinishOrder([]);
    setWinnings(0);
    setRaceTime(0);
    
    setRacers(prev => prev.map(r => ({
      ...r,
      position: 0,
      speed: 0,
      boosted: false,
      finished: false,
      finishTime: null,
    })));
  }, []);

  const getPlaceEmoji = (place: number) => {
    switch (place) {
      case 0: return '🥇';
      case 1: return '🥈';
      case 2: return '🥉';
      default: return '🏅';
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-slate-900 via-indigo-900/20 to-slate-900 p-4 overflow-y-auto">
      <div className="max-w-lg mx-auto pb-24">
        {saveNotice}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onExit}
            className="text-slate-400 hover:text-white transition-colors"
            data-testid="button-racing-exit"
          >
            ← Back
          </button>
          <div className="flex gap-1">
            <button
              onClick={() => { setShowLearn(!showLearn); setShowOdds(false); }}
              className={`px-2 py-1 rounded text-xs ${showLearn ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-slate-300'}`}
              data-testid="button-toggle-learn"
            >
              🎓 Learn
            </button>
            <button
              onClick={() => { setShowOdds(!showOdds); setShowLearn(false); }}
              className={`px-2 py-1 rounded text-xs ${showOdds ? 'bg-amber-600 text-white' : 'bg-slate-700 text-slate-300'}`}
              data-testid="button-toggle-odds"
            >
              📊 Odds
            </button>
          </div>
          <div className="text-cyan-400 font-bold">
            💎 {playerShards}
          </div>
        </div>

        <div className="text-center mb-4">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
            🏁 Companion Racing
          </h1>
          <p className="text-slate-400 text-sm">Pick your champion, watch them race!</p>
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
                🧮 Betting Math
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

        {showOdds && (
          <div className="bg-slate-800/90 rounded-xl p-4 mb-4 border border-amber-500/30">
            <h3 className="text-lg font-bold text-amber-400 mb-3 text-center">📊 Race Odds & Probabilities</h3>
            
            <div className="space-y-2 mb-4">
              {racers.map(racer => {
                const racerOdds = odds.get(racer.id) || 1;
                const winProb = calculateWinProbability(racer, racers);
                const isSelected = racer.id === selectedRacer;
                
                return (
                  <div 
                    key={racer.id} 
                    className={`bg-slate-700/50 rounded-lg p-3 ${isSelected ? 'ring-2 ring-purple-500' : ''}`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{racer.emoji}</span>
                        <span className="text-slate-300 font-medium">{racer.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-amber-400 font-bold">{racerOdds}x</div>
                        <div className="text-slate-500 text-xs">{winProb.toFixed(1)}% chance</div>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-slate-400">
                      Base speed: {racer.baseSpeed.toFixed(1)} • 
                      Bet 10 → Win {Math.floor(10 * racerOdds)} chips
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="bg-slate-900/50 rounded-lg p-3 text-xs text-slate-400">
              <div className="font-bold text-slate-300 mb-1">How odds work:</div>
              <p>Higher odds = lower chance to win, but bigger payout. The house takes ~10% edge on all bets.</p>
            </div>
          </div>
        )}

        {phase === 'betting' && (
          <div className="bg-slate-800/80 rounded-xl p-4 mb-4">
            <div className="text-center text-slate-400 text-sm mb-3">
              Select a racer to bet on:
            </div>
            
            <div className="space-y-2 mb-4">
              {racers.map(racer => {
                const racerOdds = odds.get(racer.id) || 1;
                const isOwned = capturedCreatures.some(c => c.id === racer.id);
                const isSelected = racer.id === selectedRacer;
                
                return (
                  <button
                    key={racer.id}
                    onClick={() => setSelectedRacer(racer.id)}
                    className={`w-full p-3 rounded-lg flex items-center justify-between transition-all ${
                      isSelected 
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white ring-2 ring-purple-400'
                        : 'bg-slate-700/80 text-slate-300 hover:bg-slate-700'
                    }`}
                    data-testid={`button-select-racer-${racer.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{racer.emoji}</span>
                      <div className="text-left">
                        <div className="font-medium">{racer.name}</div>
                        {isOwned && <div className="text-xs text-cyan-400">Your companion</div>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold ${isSelected ? 'text-yellow-300' : 'text-amber-400'}`}>
                        {racerOdds}x
                      </div>
                      <div className="text-xs opacity-75">odds</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedRacer && (
              <div className="border-t border-slate-700 pt-4">
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
                      className={`px-3 py-1 rounded text-sm ${bet === amount ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-slate-300'}`}
                      data-testid={`button-bet-${amount}`}
                    >
                      {amount}
                    </button>
                  ))}
                </div>

                <div className="text-center text-sm text-slate-400 mb-3">
                  Potential win: <span className="text-green-400 font-bold">💎 {Math.floor(bet * (odds.get(selectedRacer) || 1))}</span>
                </div>
                
                <button
                  onClick={startRace}
                  disabled={disabled || bet > playerShards || bet < 1}
                  className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl text-white font-bold text-xl shadow-lg shadow-green-500/30 animate-pulse disabled:opacity-50"
                  data-testid="button-start-race"
                >
                  🏁 START RACE!
                </button>
              </div>
            )}
          </div>
        )}

        {phase === 'racing' && (
          <div className="bg-slate-800/80 rounded-xl p-4">
            <div className="flex justify-between items-center mb-4">
              <div className="text-lg font-bold text-amber-400">
                {racers.every(r => r.finished) ? '🏁 RACE COMPLETE' : '🏁 RACE IN PROGRESS'}
              </div>
              <div className="text-slate-400 text-sm">
                {(raceTime / 1000).toFixed(1)}s
              </div>
            </div>

            {selectedRacer && (
              <div className="text-center text-sm text-purple-400 mb-4">
                Your pick: {racers.find(r => r.id === selectedRacer)?.emoji} {racers.find(r => r.id === selectedRacer)?.name} @ {odds.get(selectedRacer)}x
              </div>
            )}

            <div className="space-y-4">
              {racers
                .sort((a, b) => a.lane - b.lane)
                .map((racer) => {
                  const isPlayerPick = racer.id === selectedRacer;
                  const finishPlace = finishOrder.indexOf(racer.id);
                  
                  return (
                    <div key={racer.id} className="relative">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{racer.emoji}</span>
                          <span className={`text-sm ${isPlayerPick ? 'text-purple-400 font-bold' : 'text-slate-400'}`}>
                            {racer.name}
                          </span>
                          {racer.boosted && <span className="text-yellow-400 animate-pulse text-xs">⚡BOOST!</span>}
                        </div>
                        {finishPlace >= 0 && (
                          <div className="flex items-center gap-1">
                            <span className="text-lg">{getPlaceEmoji(finishPlace)}</span>
                            <span className="text-xs text-slate-500">
                              {((racer.finishTime || 0) / 1000).toFixed(2)}s
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <div className="relative h-10 bg-slate-700 rounded-full overflow-hidden border-2 border-slate-600">
                        <div 
                          className={`absolute left-0 top-0 h-full transition-all duration-100 ${
                            isPlayerPick 
                              ? 'bg-gradient-to-r from-purple-500 to-pink-500'
                              : 'bg-gradient-to-r from-cyan-500 to-blue-500'
                          } ${racer.boosted ? 'shadow-lg shadow-yellow-400/50' : ''}`}
                          style={{ width: `${racer.position}%` }}
                        />
                        
                        <div 
                          className="absolute top-1/2 -translate-y-1/2 flex items-center gap-1 transition-all duration-100 bg-slate-800/80 px-2 py-0.5 rounded-full"
                          style={{ left: `max(4px, calc(${Math.min(racer.position, 85)}% - 40px))` }}
                        >
                          <span className="text-lg">{racer.emoji}</span>
                          <span className="text-xs text-white font-bold hidden sm:inline">
                            {racer.name.split(' ')[0]}
                          </span>
                        </div>
                        
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xl">
                          🏁
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {phase === 'results' && (
          <div className="bg-slate-800/80 rounded-xl p-6 text-center">
            {winnings > 0 ? (
              <>
                <div className="text-4xl font-bold text-green-400 mb-2 animate-bounce">
                  🎉 You won 💎{winnings}!
                </div>
                <div className="text-slate-400 text-sm mb-4">
                  Your racer {racers.find(r => r.id === selectedRacer)?.emoji} {racers.find(r => r.id === selectedRacer)?.name} came in 1st!
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-red-400 mb-2">
                  Better luck next time!
                </div>
                <div className="text-slate-400 text-sm mb-4">
                  Winner: {racers.find(r => finishOrder[0] === r.id)?.emoji} {racers.find(r => finishOrder[0] === r.id)?.name}
                </div>
              </>
            )}
            
            <div className="bg-slate-900/50 rounded-lg p-3 mb-4">
              <div className="text-slate-400 text-sm mb-2">Final Standings</div>
              <div className="space-y-1">
                {finishOrder.map((id, idx) => {
                  const racer = racers.find(r => r.id === id);
                  if (!racer) return null;
                  const isPlayerPick = racer.id === selectedRacer;
                  return (
                    <div 
                      key={id}
                      className={`flex items-center justify-between p-2 rounded ${
                        isPlayerPick ? 'bg-purple-900/30' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{getPlaceEmoji(idx)}</span>
                        <span className="text-lg">{racer.emoji}</span>
                        <span className={isPlayerPick ? 'text-purple-400 font-bold' : 'text-slate-300'}>
                          {racer.name}
                        </span>
                      </div>
                      <span className="text-slate-500 text-sm">
                        {((racer.finishTime || 0) / 1000).toFixed(2)}s
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <button
              onClick={playAgain}
              className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl text-white font-bold text-lg"
              data-testid="button-play-again"
            >
              🏁 Race Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
