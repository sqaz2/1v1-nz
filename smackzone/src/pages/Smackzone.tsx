import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useLocation } from 'wouter';
import PlayerShipSprite from '@/components/PlayerShipSprite';
import AsteroidKeno from '@/components/AsteroidKeno';
import CompanionRacing from '@/components/CompanionRacing';
import { quantumChipSave, type CasinoWallet } from '@/lib/quantum-chips';
import QuantumChipRefill from '@/components/QuantumChipRefill';
import { casinoRoundCanExit, createCasinoBalanceSaver } from '@/lib/casino-balance';
import casinoShipSprite from '@assets/file_000000001f3871f89fdbf45dddd23cd1_1768111373998.png';
// Casino Music Tracks - Menu
import stellarPreludeMusic from '@assets/casino_StarMuff_2_(2)_1768645105886.mp3'; // "Stellar Prelude"
import deepSpaceChillMusic from '@assets/casino_StarMuff_2_1768645105937.mp3'; // "Deep Space Chill"
import astralHazeMusic from '@assets/casino_StarMuff_3_(4)_1768645472090.mp3'; // "Astral Haze"
import dockingBayBluesMusic from '@assets/casino_StarMuff_3_(3)_1768645472133.mp3'; // "Docking Bay Blues"
import twilightDriftMusic from '@assets/casino_StarMuff_3_(2)_1768645472154.mp3'; // "Twilight Drift"
import galacticLullMusic from '@assets/casino_StarMuff_3_1768645472186.mp3'; // "Galactic Lull"
// Casino Music Tracks - Lobby
import hyperspaceHoldMusic from '@assets/casino_StarMuff_4_1768645663148.mp3'; // "Hyperspace Hold"
import loungeOrbitMusic from '@assets/casino_StarMuff_5_(this_is_lounge_music)_1768645663198.mp3'; // "Lounge Orbit"
import waystationMusic from '@assets/casino_StarMuff_6_1768645663231.mp3'; // "Waystation"
import galacticGroveMusic from '@assets/Galactic_Grove_(StarMuff_casino)_1768645663245.mp3'; // "Galactic Grove"
// Casino Music Tracks - Gameplay
import gravityWellMusic from '@assets/casino_StarMuff_9_(winning)_(1)_1768642936579.mp3'; // "Gravity Well"
import zeroGMusic from '@assets/casino_StarMuff_9_(winning)_1768643043039.mp3'; // "Zero-G"
import pulsarDropMusic from '@assets/casino_StarMuff_10_(winning)_(1)_1768644004986.mp3'; // "Pulsar Drop"
import meteorBounceMusic from '@assets/casino_StarMuff_10_(winning)_1768644005040.mp3'; // "Meteor Bounce"
import cosmicGrindMusic from '@assets/Casino_StarMuff_12_(1)_1768644005070.mp3'; // "Cosmic Grind"
import darkMatterFlowMusic from '@assets/Casino_StarMuff_12__1768644005081.mp3'; // "Dark Matter Flow"
import orbitalBassMusic from '@assets/casino_StarMuff_12_1768644005094.mp3'; // "Orbital Bass"
import warpCorePulseMusic from '@assets/Casino_StarMuff_13_(1)_1768644694593.mp3'; // "Warp Core Pulse"
import quantumShuffleMusic from '@assets/Casino_StarMuff_13_1768644694625.mp3'; // "Quantum Shuffle"
import casinoFrequencyMusic from '@assets/Casino_StarMuff_14_tuning_song_2_1768644694641.mp3'; // "Casino Frequency"
import staticDriftMusic from '@assets/Casino_StarMuff_14_tuning_into_casino_frequency__1768644694656.mp3'; // "Static Drift"
// Casino Music Tracks - Double or Nothing
import nebulaJackpotMusic from '@assets/casino_StarMuff_11_(winning)_1768642334076.mp3'; // "Nebula Jackpot"
import riskyOrbitMusic from '@assets/Casino_StarMuff_11_(winning)_sounds_provocative,_almost_unmusi_1768644005056.mp3'; // "Risky Orbit"
// Casino Music Tracks - Bust/Lose
import solarFlareOutMusic from '@assets/casino_StarMuff_8_(with_weirdness)_1768642600221.mp3'; // "Solar Flare Out"

const GAMEPLAY_TRACKS = [
  { path: gravityWellMusic, name: 'Gravity Well' },
  { path: zeroGMusic, name: 'Zero-G' },
  { path: pulsarDropMusic, name: 'Pulsar Drop' },
  { path: meteorBounceMusic, name: 'Meteor Bounce' },
  { path: cosmicGrindMusic, name: 'Cosmic Grind' },
  { path: darkMatterFlowMusic, name: 'Dark Matter Flow' },
  { path: orbitalBassMusic, name: 'Orbital Bass' },
  { path: warpCorePulseMusic, name: 'Warp Core Pulse' },
  { path: casinoFrequencyMusic, name: 'Casino Frequency' },
  { path: staticDriftMusic, name: 'Static Drift' }
];

const DOUBLE_OR_NOTHING_TRACKS = [
  { path: nebulaJackpotMusic, name: 'Nebula Jackpot' },
  { path: riskyOrbitMusic, name: 'Risky Orbit' }
];

const MENU_TRACKS = [
  { path: stellarPreludeMusic, name: 'Stellar Prelude' },
  { path: deepSpaceChillMusic, name: 'Deep Space Chill' },
  { path: astralHazeMusic, name: 'Astral Haze' },
  { path: dockingBayBluesMusic, name: 'Docking Bay Blues' },
  { path: twilightDriftMusic, name: 'Twilight Drift' },
  { path: galacticLullMusic, name: 'Galactic Lull' }
];

const LOBBY_TRACKS = [
  { path: hyperspaceHoldMusic, name: 'Hyperspace Hold' },
  { path: loungeOrbitMusic, name: 'Lounge Orbit' },
  { path: waystationMusic, name: 'Waystation' },
  { path: galacticGroveMusic, name: 'Galactic Grove' },
  { path: quantumShuffleMusic, name: 'Quantum Shuffle' }
];

type Lane = 'left' | 'center' | 'right';
type QuestionType = 'add' | 'subtract' | 'multiply' | 'divide';
type GameState = 'menu' | 'casino_lobby' | 'countdown' | 'playing' | 'gameover' | 'double_or_nothing' | 'keno' | 'racing';
type GameMode = 'smashlane' | 'slamdrive' | 'slamwave' | 'smashshift' | 'smackstorm';
type Difficulty = 'easy' | 'normal' | 'hard';
type LuckySpinPrize = 'bonus_shards' | 'shield_restore' | 'multiplier_boost' | 'double_bet' | 'jackpot_key';

interface Question {
  prompt: string;
  correctAnswer: number;
  wrongAnswers: number[];
  allAnswers: { value: number; lane: Lane }[];
  correctLane: Lane;
  type: QuestionType;
}

interface Obstacle {
  id: number;
  question: Question;
  y: number;
  answered: boolean;
  correct: boolean | null;
}

interface ModeConfig {
  name: string;
  description: string;
  icon: string;
}

interface DifficultyConfig {
  name: string;
  speedMultiplier: number;
  spawnInterval: number;
  color: string;
  payoutMultiplier: number;
  minShards: number;
  entryFee: number;
  maxShields: number;
}

const LANES: Lane[] = ['left', 'center', 'right'];
const DANGER_LINE = 75;

const MODE_CONFIGS: Record<GameMode, ModeConfig> = {
  smashlane: { name: 'Smashlane', description: 'Classic mode - mixed questions, steady pace', icon: '🎯' },
  slamdrive: { name: 'Slamdrive', description: 'Speed ramps up with each correct answer!', icon: '⚡' },
  slamwave: { name: 'Slamwave', description: 'Survive waves of same-type questions', icon: '🌊' },
  smashshift: { name: 'Smashshift', description: 'Rules change every 15 seconds!', icon: '🔄' },
  smackstorm: { name: 'Smackstorm', description: 'Two obstacles at once - prioritize!', icon: '⛈️' },
};

const DIFFICULTY_CONFIGS: Record<Difficulty, DifficultyConfig> = {
  easy: { name: 'Easy', speedMultiplier: 0.5, spawnInterval: 4000, color: 'from-green-500 to-green-600', payoutMultiplier: 0.08, minShards: 600, entryFee: 150, maxShields: 5 },
  normal: { name: 'Normal', speedMultiplier: 1.0, spawnInterval: 2800, color: 'from-yellow-500 to-orange-500', payoutMultiplier: 0.6, minShards: 4000, entryFee: 1000, maxShields: 3 },
  hard: { name: 'Hard', speedMultiplier: 1.5, spawnInterval: 2000, color: 'from-red-500 to-red-600', payoutMultiplier: 1.0, minShards: 6000, entryFee: 1500, maxShields: 3 },
};

const WAGER_PERCENT = 0.25;

// Crossfade utility for smooth music transitions
const fadeOutAudio = (audio: HTMLAudioElement, duration: number = 1000): Promise<void> => {
  return new Promise((resolve) => {
    const startVol = audio.volume;
    const steps = 20;
    const stepTime = duration / steps;
    const volStep = startVol / steps;
    let currentStep = 0;
    
    const fadeInterval = setInterval(() => {
      currentStep++;
      const newVol = Math.max(0, startVol - (volStep * currentStep));
      audio.volume = newVol;
      
      if (currentStep >= steps) {
        clearInterval(fadeInterval);
        audio.pause();
        audio.volume = startVol; // Reset for potential reuse
        resolve();
      }
    }, stepTime);
  });
};

const fadeInAudio = (audio: HTMLAudioElement, targetVolume: number, duration: number = 1000): void => {
  audio.volume = 0;
  audio.play().catch(e => console.log('Audio play failed:', e));
  
  const steps = 20;
  const stepTime = duration / steps;
  const volStep = targetVolume / steps;
  let currentStep = 0;
  
  const fadeInterval = setInterval(() => {
    currentStep++;
    const newVol = Math.min(targetVolume, volStep * currentStep);
    audio.volume = newVol;
    
    if (currentStep >= steps) {
      clearInterval(fadeInterval);
    }
  }, stepTime);
};
const SURVIVAL_THRESHOLD_WAVE = 4;
const SURVIVAL_THRESHOLD_ANSWERS = 20;

const ALL_MODES: GameMode[] = ['smashlane', 'slamdrive', 'slamwave', 'smashshift', 'smackstorm'];
const QUESTION_TYPES: QuestionType[] = ['add', 'subtract', 'multiply', 'divide'];

const MAX_COMBO_TIER = 5;
const COMBO_PER_TIER = 5;
const LUCKY_SPIN_INTERVAL = 8;
const MAX_OBSTACLES_ON_SCREEN = 2;
const MAX_OBSTACLES_SMACKSTORM = 2;

const ARIA_CASINO_QUIPS = [
  "Statistically speaking, Commander, the house always wins. But who am I to judge?",
  "Your neural patterns suggest moderate risk tolerance. Fascinating.",
  "Remember: you can't lose what you don't bet. But you also can't win.",
  "The probability matrices are in my favor. Just saying.",
  "Fortune favors the bold. Also the mathematically inclined.",
  "I've calculated your odds. They're... interesting.",
  "In space, no one can hear you win... or lose spectacularly.",
  "May the math be ever in your favor, Commander.",
];

const SLOT_SYMBOLS = ['💎', '🛡️', '⚡', '🎰', '🔑', '💰', '🌟', '🎲'];

const GAME_RULES_CONTENT = {
  casinoBasics: {
    title: '🎰 Casino Basics',
    rules: [
      'Entry fee is 25% of your current chips',
      'Each difficulty has a minimum shard requirement to play',
      'You must get 20+ correct answers to earn a payout',
      'Mode is randomly selected via spinning roulette - no cherry-picking!',
    ]
  },
  payoutMath: {
    title: '📊 Payout Math',
    rules: [
      'YOUR EARNINGS = Performance + Bet Portion',
      '',
      '🎯 PERFORMANCE (skill-based):',
      '  • Score bonus: Your total score × 0.15',
      '  • Combo bonus: Points from combo chains × 0.5',
      '  • Streak bonus: Best streak × 10',
      '',
      '💰 BET PORTION (proportional):',
      '  • Wager × (Correct ÷ 20) = Base Return',
      '  • Example: 10k bet with 25 correct = 10k × 1.25 = 12.5k',
      '  • Skill Bonus: Extra reward for exceeding 20 correct',
      '',
      '⚙️ DIFFICULTY MULTIPLIER (applied to both):',
      '  • Easy: ×0.08 (low risk, low reward)',
      '  • Normal: ×0.6 (balanced)',
      '  • Hard: ×1.0 (full payout)',
      '',
      '🏦 HOUSE RAKE: 5% on winnings over 1,000 chips',
      '  • Half of rake goes to jackpot pool',
    ]
  },
  howToPlay: {
    title: '🎮 How to Play',
    rules: [
      'Obstacles fall from the top with math questions',
      'Move your ship to the lane with the CORRECT answer',
      'Use arrow keys (← →) or swipe left/right on mobile',
      'Wrong answers or missed obstacles = lose HP',
      'Game ends when HP reaches 0',
    ]
  },
  modes: {
    title: '🎯 Game Modes',
    items: [
      { name: 'Smashlane', icon: '🎯', desc: 'Classic mode with mixed question types at a steady pace. Good for warming up!' },
      { name: 'Slamdrive', icon: '⚡', desc: 'Speed increases with each correct answer. How fast can you handle the math?' },
      { name: 'Slamwave', icon: '🌊', desc: 'Questions come in waves by type (all addition, then all subtraction, etc.)' },
      { name: 'Smashshift', icon: '🔄', desc: 'Question type changes every 15 seconds! Shifts between addition, subtraction, multiplication, and division.' },
      { name: 'Smackstorm', icon: '⛈️', desc: 'Two obstacles fall at once! Prioritize and answer fast to survive the storm.' },
    ]
  },
  bonuses: {
    title: '✨ Bonus Features',
    rules: [
      'COMBO SYSTEM: Chain correct answers to build multiplier (up to 5 tiers)',
      'LUCKY SPIN: Every 8 correct answers triggers a slot machine for bonus rewards!',
      'DOUBLE OR NOTHING: After game over, risk your earnings on a coin flip',
      'Prizes include: Bonus Quantum Chips, Shield Restore, Combo Boost, Double Bet, Jackpot Key',
    ]
  },
  difficulty: {
    title: '⚙️ Difficulty Levels',
    items: [
      { name: 'Easy', color: 'text-green-400', desc: '600+ chips, 0.5x speed, 0.08x payout, 5 max shields!' },
      { name: 'Normal', color: 'text-yellow-400', desc: '4000+ chips, 1.0x speed, 0.6x payout, 3 max shields' },
      { name: 'Hard', color: 'text-red-400', desc: '6000+ chips, 1.5x speed, 1.0x payout, 3 max shields' },
    ]
  },
  tips: {
    title: '💡 Pro Tips',
    rules: [
      'Start with Easy to learn the patterns',
      'Save up chips to unlock higher difficulty tiers for better payouts',
      'In Smashshift, wait for the rule banner before moving',
      'In Smackstorm, prioritize the lower (closer) obstacle first',
      'Build combo streaks for massive payout multipliers',
      'Lucky Spin is free - always spin if you get one!',
    ]
  }
};

function generateQuestion(forceType?: QuestionType, excludeCorrectLane?: Lane): Question {
  const type = forceType || QUESTION_TYPES[Math.floor(Math.random() * QUESTION_TYPES.length)];
  
  let a: number, b: number, correctAnswer: number, prompt: string;
  
  switch (type) {
    case 'add':
      a = Math.floor(Math.random() * 9) + 1;
      b = Math.floor(Math.random() * 9) + 1;
      correctAnswer = a + b;
      prompt = `${a} + ${b}`;
      break;
    case 'subtract':
      a = Math.floor(Math.random() * 10) + 10;
      b = Math.floor(Math.random() * 9) + 1;
      correctAnswer = a - b;
      prompt = `${a} - ${b}`;
      break;
    case 'multiply':
      a = Math.floor(Math.random() * 9) + 2;
      b = Math.floor(Math.random() * 9) + 2;
      correctAnswer = a * b;
      prompt = `${a} × ${b}`;
      break;
    case 'divide':
      b = Math.floor(Math.random() * 9) + 2;
      correctAnswer = Math.floor(Math.random() * 9) + 2;
      a = b * correctAnswer;
      prompt = `${a} ÷ ${b}`;
      break;
    default:
      a = 1; b = 1; correctAnswer = 2; prompt = '1 + 1';
  }
  
  const wrongAnswers: number[] = [];
  const offsets = [-3, -2, -1, 1, 2, 3];
  while (wrongAnswers.length < 2) {
    const offset = offsets[Math.floor(Math.random() * offsets.length)];
    const wrong = correctAnswer + offset;
    if (wrong > 0 && wrong !== correctAnswer && !wrongAnswers.includes(wrong)) {
      wrongAnswers.push(wrong);
    }
  }
  
  const shuffledLanes = [...LANES].sort(() => Math.random() - 0.5);
  let correctLane: Lane;
  if (excludeCorrectLane) {
    const filteredLanes = shuffledLanes.filter(l => l !== excludeCorrectLane);
    correctLane = filteredLanes[0];
  } else {
    correctLane = shuffledLanes[0];
  }
  
  const otherLanes = LANES.filter(l => l !== correctLane).sort(() => Math.random() - 0.5);
  
  const allAnswers: { value: number; lane: Lane }[] = [
    { value: correctAnswer, lane: correctLane },
    { value: wrongAnswers[0], lane: otherLanes[0] },
    { value: wrongAnswers[1], lane: otherLanes[1] },
  ];
  
  return {
    prompt,
    correctAnswer,
    wrongAnswers,
    allAnswers,
    correctLane,
    type,
  };
}

function getLanePosition(lane: Lane): number {
  switch (lane) {
    case 'left': return 16.67;
    case 'center': return 50;
    case 'right': return 83.33;
  }
}

function getShipDirection(lane: Lane): 'N' | 'NW' | 'NE' {
  switch (lane) {
    case 'left': return 'NW';
    case 'center': return 'N';
    case 'right': return 'NE';
  }
}

function getHighScore(mode: GameMode): number {
  const saved = localStorage.getItem(`smackzone_highscore_${mode}`);
  return saved ? parseInt(saved, 10) : 0;
}

function setHighScore(mode: GameMode, score: number): void {
  localStorage.setItem(`smackzone_highscore_${mode}`, score.toString());
}

function getPreviousScore(mode: GameMode): number {
  const saved = localStorage.getItem(`smackzone_prevscore_${mode}`);
  return saved ? parseInt(saved, 10) : 0;
}

function setPreviousScore(mode: GameMode, score: number): void {
  localStorage.setItem(`smackzone_prevscore_${mode}`, score.toString());
}

function getHighStreak(mode: GameMode): number {
  const saved = localStorage.getItem(`smackzone_highstreak_${mode}`);
  return saved ? parseInt(saved, 10) : 0;
}

function setHighStreakStorage(mode: GameMode, streak: number): void {
  localStorage.setItem(`smackzone_highstreak_${mode}`, streak.toString());
}

function getPreviousStreak(mode: GameMode): number {
  const saved = localStorage.getItem(`smackzone_prevstreak_${mode}`);
  return saved ? parseInt(saved, 10) : 0;
}

function setPreviousStreak(mode: GameMode, streak: number): void {
  localStorage.setItem(`smackzone_prevstreak_${mode}`, streak.toString());
}

function getRuleLabel(type: QuestionType): string {
  switch (type) {
    case 'add': return 'ADD';
    case 'subtract': return 'SUBTRACT';
    case 'multiply': return 'MULTIPLY';
    case 'divide': return 'DIVIDE';
  }
}

function rollLuckySpinPrize(betAmount: number): { prize: LuckySpinPrize; value?: number } {
  const roll = Math.random() * 100;
  if (roll < 40) {
    // Bonus chips scale with bet using power scaling for rewarding high bets
    // At 1k bet: 1000^0.75 * 2 = 354 base + random = ~400-500 chips
    // At 10k bet: 10000^0.75 * 2 = 1122 base + random = ~1200-1400 chips  
    // At 100k bet: 100000^0.75 * 2 = 3548 base + random = ~3600-3800 chips
    const baseBonusShards = Math.floor(Math.pow(betAmount, 0.75) * 2);
    const randomBonus = Math.floor(Math.random() * 201) + 100; // 100-300 random bonus
    const totalBonus = Math.max(100, baseBonusShards + randomBonus); // Minimum 100 chips
    return { prize: 'bonus_shards', value: totalBonus };
  } else if (roll < 65) {
    return { prize: 'shield_restore' };
  } else if (roll < 85) {
    return { prize: 'multiplier_boost' };
  } else if (roll < 95) {
    return { prize: 'double_bet' };
  } else {
    return { prize: 'jackpot_key' };
  }
}

function getPrizeDisplay(prize: LuckySpinPrize, value?: number): { icon: string; text: string; color: string } {
  switch (prize) {
    case 'bonus_shards':
      return { icon: '💎', text: `+${value} CHIPS!`, color: 'text-cyan-400' };
    case 'shield_restore':
      return { icon: '🛡️', text: 'SHIELD RESTORED!', color: 'text-green-400' };
    case 'multiplier_boost':
      return { icon: '⚡', text: 'COMBO BOOST +2!', color: 'text-yellow-400' };
    case 'double_bet':
      return { icon: '🎰', text: 'BET DOUBLED!', color: 'text-purple-400' };
    case 'jackpot_key':
      return { icon: '🔑', text: 'JACKPOT KEY!', color: 'text-amber-400' };
  }
}

const WORLD_ID = 'galaxy_basics';

interface SmackzoneProps {
  wallet?: CasinoWallet;
  onLeave?: () => void;
  initialCurrency?: number;
  onCurrencyChange?: (newCurrency: number) => void;
  exitRequest?: number;
  onExitBlocked?: (reason: string) => void;
}

export default function Smackzone({ wallet, onLeave, initialCurrency, onCurrencyChange, exitRequest = 0, onExitBlocked }: SmackzoneProps = {}) {
  const [, setLocation] = useLocation();
  const [gameState, setGameState] = useState<GameState>('menu');
  const [currencyLoadError, setCurrencyLoadError] = useState(false);
  const [currencySaveError, setCurrencySaveError] = useState(false);
  const [currencyLoadAttempt, setCurrencyLoadAttempt] = useState(0);
  const [exitState, setExitState] = useState<'idle' | 'saving' | 'save-error' | 'round-active'>('idle');
  const exitInProgressRef = useRef(false);
  const exitDestinationRef = useRef('/game');
  const handledExitRequestRef = useRef(0);
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>(wallet ? 'easy' : 'normal');
  const [countdown, setCountdown] = useState(5);
  const [playerLane, setPlayerLane] = useState<Lane>('center');
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [comboTier, setComboTier] = useState(1);
  const [shields, setShields] = useState(3);
  const [hitFlash, setHitFlash] = useState(false);
  const [correctFlash, setCorrectFlash] = useState(false);
  
  const [baseEarnings, setBaseEarnings] = useState(0);
  const [comboBonus, setComboBonus] = useState(0);
  
  const [currentSpeed, setCurrentSpeed] = useState(2.5);
  const [waveNumber, setWaveNumber] = useState(1);
  const [waveActive, setWaveActive] = useState(true);
  const [waveQuestionType, setWaveQuestionType] = useState<QuestionType>('add');
  const [currentRule, setCurrentRule] = useState<QuestionType>('add');
  const [showRuleBanner, setShowRuleBanner] = useState(false);
  const [isPaused, setIsPausedState] = useState(false);
  
  // Wrapper to keep isPausedRef in sync with state (prevents stale closures in game loop)
  const setIsPaused = useCallback((value: boolean | ((prev: boolean) => boolean)) => {
    setIsPausedState(prev => {
      const newValue = typeof value === 'function' ? value(prev) : value;
      isPausedRef.current = newValue;
      return newValue;
    });
  }, []);
  
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [isLoadingCurrency, setIsLoadingCurrency] = useState(true);
  const balanceMutationEpochRef = useRef(0);
  const raffleRefreshEpochRef = useRef(0);
  const [playerShards, setPlayerShardsState] = useState(initialCurrency ?? 0);
  const [raffleTickets, setRaffleTicketsState] = useState(0);
  // Invalidate balance reads synchronously, before React commits a wager/payout.
  // Value equality is insufficient: a bet and payout may return to the same value.
  const setPlayerShards = useCallback((value: number | ((previous: number) => number)) => {
    balanceMutationEpochRef.current++;
    setPlayerShardsState(value);
  }, []);
  const setRaffleTickets = useCallback((value: number | ((previous: number) => number)) => {
    balanceMutationEpochRef.current++;
    setRaffleTicketsState(value);
  }, []);
  const [ticketsEarnedThisGame, setTicketsEarnedThisGame] = useState(0);
  const [raffleCountdown, setRaffleCountdown] = useState('');
  const [raffleDraws, setRaffleDraws] = useState<any[]>([]);
  const [showPastRaffles, setShowPastRaffles] = useState(false);
  const [raffleBanner, setRaffleBanner] = useState<{ type: 'winner' | 'drawn' | 'claim'; draw?: any } | null>(null);
  const [claimingPrize, setClaimingPrize] = useState(false);
  const [currentBet, setCurrentBet] = useState(0);
  const [survivedFirstWave, setSurvivedFirstWave] = useState(false);
  const [jackpot, setJackpot] = useState(() => {
    const saved = localStorage.getItem('smackzone_jackpot');
    return saved ? parseInt(saved, 10) : 1000;
  });
  const [showLuckySpin, setShowLuckySpin] = useState(false);
  const [luckySpinResult, setLuckySpinResult] = useState<{ prize: LuckySpinPrize; value?: number } | null>(null);
  const [spinningSymbols, setSpinningSymbols] = useState<string[]>(['💎', '💎', '💎']);
  const [hasUsedReroll, setHasUsedReroll] = useState(false);
  const [awaitingPrizeChoice, setAwaitingPrizeChoice] = useState(false);
  const [pendingPayout, setPendingPayout] = useState(0);
  const [correctAnswersThisRun, setCorrectAnswersThisRun] = useState(0);
  const [hasJackpotKey, setHasJackpotKey] = useState(false);
  const [betMultiplier, setBetMultiplier] = useState(1);
  const [doubleCount, setDoubleCount] = useState(0);
  const [coinFlipResult, setCoinFlipResult] = useState<'win' | 'lose' | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [jackpotWon, setJackpotWon] = useState(0);
  const [rawPayout, setRawPayout] = useState(0);
  const [showPayoutAnimation, setShowPayoutAnimation] = useState(false);
  const [animatedPayout, setAnimatedPayout] = useState(0);
  
  // Payout breakdown state for detailed display
  const [payoutBreakdown, setPayoutBreakdown] = useState<{
    scoreBonus: number;
    comboBonus: number;
    streakBonus: number;
    performanceTotal: number;
    performancePayout: number;
    betBase: number;
    betMultiplierValue: number;
    correctAnswerBonus: number;
    baseReturn: number;
    powerBonus: number;
    scaledBetContribution: number;
    difficultyMultiplier: number;
    grossPayout: number;
    houseCut: number;
    jackpotContribution: number;
    ticketsEarned: number;
    finalPayout: number;
  } | null>(null);
  const [ariaQuip, setAriaQuip] = useState(() => 
    ARIA_CASINO_QUIPS[Math.floor(Math.random() * ARIA_CASINO_QUIPS.length)]
  );
  const [isModeSpinning, setIsModeSpinning] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [highlightedModeIndex, setHighlightedModeIndex] = useState(0);
  const [revealedMode, setRevealedMode] = useState<GameMode | null>(null);
  const [displayHighScore, setDisplayHighScore] = useState(0);
  const [capturedCreatures, setCapturedCreatures] = useState<{ id: string }[]>([]);
  const [displayPreviousScore, setDisplayPreviousScore] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [displayHighStreak, setDisplayHighStreak] = useState(0);
  const [displayPreviousStreak, setDisplayPreviousStreak] = useState(0);
  
  const obstacleIdRef = useRef(0);
  const modeSpinIntervalRef = useRef<number | null>(null);
  const modeSpinTimeoutRef = useRef<number | null>(null);
  const modeRevealTimeoutRef = useRef<number | null>(null);
  const gameLoopRef = useRef<number | null>(null);
  const spawnIntervalRef = useRef<number | null>(null);
  const initialSpawnRef = useRef<number | null>(null);
  const waveTimerRef = useRef<number | null>(null);
  const ruleTimerRef = useRef<number | null>(null);
  const ruleUnpauseTimeoutRef = useRef<number | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const speedRef = useRef(2.5);
  const spawnIntervalMsRef = useRef(2800);
  const isPausedRef = useRef(false);
  const playerLaneRef = useRef<Lane>('center');
  const lastSpawnedCorrectLaneRef = useRef<Lane | null>(null);
  const spinIntervalRef = useRef<number | null>(null);
  const spinTimeoutRef = useRef<number | null>(null);
  const spinResultTimeoutRef = useRef<number | null>(null);
  const coinFlipTimeoutRef = useRef<number | null>(null);
  const loseTransitionTimeoutRef = useRef<number | null>(null);
  const doubleOrNothingAudioRef = useRef<HTMLAudioElement | null>(null);
  const bustAudioRef = useRef<HTMLAudioElement | null>(null);
  const gameplayAudioRef = useRef<HTMLAudioElement | null>(null);
  const menuAudioRef = useRef<HTMLAudioElement | null>(null);
  const lobbyAudioRef = useRef<HTMLAudioElement | null>(null);

  // Track currency save state with refs (accessible in cleanup)
  const playerShardsRef = useRef<number>(0);
  const raffleTicketsRef = useRef<number>(0);
  const playerIdRef = useRef<string | null>(null);
  const saveCurrencyTimeoutRef = useRef<number | null>(null);
  const hasFetchedRef = useRef<boolean>(false);
  const lastSavedShardsRef = useRef<number>(0);
  const lastSavedTicketsRef = useRef<number>(0);
  const currencyMountedRef = useRef(true);

  const balanceSaverRef = useRef<ReturnType<typeof createCasinoBalanceSaver> | null>(null);

  // All saves, including departure, share this queue. A stale bet cannot overwrite
  // a later payout, and failed writes are never marked as acknowledged.
  const saveCurrency = useCallback((pid: string): Promise<boolean> => {
    if (!balanceSaverRef.current) {
      balanceSaverRef.current = createCasinoBalanceSaver({
        ...(wallet ? { write: async (balance: { currency: number }) => wallet.save(quantumChipSave({ version: 1, chips: balance.currency })) } : {}),
        active: () => hasFetchedRef.current && currencyMountedRef.current,
        read: playerId => ({
          playerId,
          worldId: WORLD_ID,
          currency: playerShardsRef.current,
          casinoData: { raffleTickets: raffleTicketsRef.current },
        }),
        isAcknowledged: balance =>
          balance.currency === lastSavedShardsRef.current &&
          balance.casinoData.raffleTickets === lastSavedTicketsRef.current,
        acknowledge: balance => {
          lastSavedShardsRef.current = balance.currency;
          lastSavedTicketsRef.current = balance.casinoData.raffleTickets;
          if (currencyMountedRef.current) setCurrencySaveError(false);
        },
        onError: error => {
          console.error('Failed to save currency:', error);
          if (currencyMountedRef.current) setCurrencySaveError(true);
        },
      });
    }
    return balanceSaverRef.current.save(pid);
  }, [wallet]);

  // Fetch player currency from database on mount (or use initialCurrency if provided)
  useEffect(() => {
    if (wallet) {
      let cancelled = false;
      hasFetchedRef.current = false;
      setCurrencyLoadError(false);
      setIsLoadingCurrency(true);
      wallet.load().then(value => {
        if (cancelled) return;
        const state = quantumChipSave(value);
        setPlayerId('quantum-chips');
        playerIdRef.current = 'quantum-chips';
        setPlayerShards(state.chips);
        playerShardsRef.current = lastSavedShardsRef.current = state.chips;
        setRaffleTickets(0);
        raffleTicketsRef.current = lastSavedTicketsRef.current = 0;
        hasFetchedRef.current = true;
        setIsLoadingCurrency(false);
      }).catch(() => {
        if (!cancelled) { setCurrencyLoadError(true); setIsLoadingCurrency(false); }
      });
      return () => { cancelled = true; };
    }
    let currentPlayerId: string | null = null;
    try { currentPlayerId = localStorage.getItem('currentPlayerId'); } catch { /* No accessible pilot profile. */ }
    let cancelled = false;
    const request = new AbortController();
    const timeout = window.setTimeout(() => request.abort(), 12000);
    hasFetchedRef.current = false;
    setCurrencyLoadError(false);
    setIsLoadingCurrency(true);
    if (!currentPlayerId) {
      clearTimeout(timeout);
      setIsLoadingCurrency(false);
      setLocation('/select');
      return;
    }
    setPlayerId(currentPlayerId);
    playerIdRef.current = currentPlayerId;
    
    // If initialCurrency is provided from Game.tsx, use it directly (more up-to-date)
    if (initialCurrency !== undefined) {
      setPlayerShards(initialCurrency);
      playerShardsRef.current = initialCurrency;
      lastSavedShardsRef.current = initialCurrency;
    }
    
    Promise.all([
      fetch(`/api/casino/currency/${currentPlayerId}/${WORLD_ID}`, { signal: request.signal }).then(res => {
        if (!res.ok) throw new Error('Balance unavailable: ' + res.status);
        return res.json();
      }),
      fetch(`/api/saves/${currentPlayerId}/${WORLD_ID}`, { signal: request.signal }).then(res => res.ok ? res.json() : null).catch(() => null)
    ])
      .then(([currencyData, saveData]) => {
        if (cancelled) return;
        if (!currencyData || !Number.isFinite(currencyData.currency) || currencyData.currency < 0) {
          throw new Error('Balance response was invalid');
        }
        // Only use database value if no initialCurrency was provided
        if (initialCurrency === undefined && currencyData.currency !== undefined) {
          setPlayerShards(currencyData.currency);
          playerShardsRef.current = currencyData.currency;
          lastSavedShardsRef.current = currencyData.currency;
        }
        // Load raffle tickets from casinoData (always load these from DB)
        if (currencyData.casinoData?.raffleTickets !== undefined) {
          setRaffleTickets(currencyData.casinoData.raffleTickets);
          raffleTicketsRef.current = currencyData.casinoData.raffleTickets;
          lastSavedTicketsRef.current = currencyData.casinoData.raffleTickets;
        }
        if (saveData?.capturedCreatures && Array.isArray(saveData.capturedCreatures)) {
          setCapturedCreatures(saveData.capturedCreatures);
        }
        hasFetchedRef.current = true;
        setIsLoadingCurrency(false);
      })
      .catch(err => {
        if (cancelled) return;
        console.error('Failed to fetch player data:', err);
        // Unknown balances must never be replaced by the initial zero state.
        hasFetchedRef.current = false;
        setCurrencyLoadError(true);
        setIsLoadingCurrency(false);
      })
      .finally(() => clearTimeout(timeout));
    return () => { cancelled = true; clearTimeout(timeout); request.abort(); };
  }, [setLocation, initialCurrency, currencyLoadAttempt, wallet]);
  
  // Sync currency changes back to Game.tsx
  useEffect(() => {
    if (onCurrencyChange && hasFetchedRef.current) {
      onCurrencyChange(playerShards);
    }
  }, [playerShards, onCurrencyChange]);

  // Daily raffle belongs only to the legacy server-backed economy.
  useEffect(() => {
    if (wallet) return;
    const updateCountdown = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setUTCHours(24, 0, 0, 0);
      const diff = midnight.getTime() - now.getTime();
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setRaffleCountdown(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [wallet]);

  // DEFENSIVE RESET: Force unpause and clear any lingering game states on component mount
  // This fixes issues when navigating from star map where pause state was stuck
  useEffect(() => {
    isPausedRef.current = false;
    setIsPaused(false);
    setShowLuckySpin(false);
    setShowRuleBanner(false);
    
    // Clear any lingering timeouts from previous sessions
    if (spinIntervalRef.current) {
      clearInterval(spinIntervalRef.current);
      spinIntervalRef.current = null;
    }
    if (spinTimeoutRef.current) {
      clearTimeout(spinTimeoutRef.current);
      spinTimeoutRef.current = null;
    }
    if (spinResultTimeoutRef.current) {
      clearTimeout(spinResultTimeoutRef.current);
      spinResultTimeoutRef.current = null;
    }
    if (ruleTimerRef.current) {
      clearInterval(ruleTimerRef.current);
      ruleTimerRef.current = null;
    }
    if (ruleUnpauseTimeoutRef.current) {
      clearTimeout(ruleUnpauseTimeoutRef.current);
      ruleUnpauseTimeoutRef.current = null;
    }
  }, [setIsPaused]);

  // Keep refs in sync with state
  useEffect(() => {
    playerShardsRef.current = playerShards;
  }, [playerShards]);
  
  useEffect(() => {
    playerIdRef.current = playerId;
  }, [playerId]);

  // Save currency to database when it changes (debounced with dirty flag)
  useEffect(() => {
    if (!playerId || isLoadingCurrency || !hasFetchedRef.current) return;
    
    // Cancel any pending debounce and schedule new one
    if (saveCurrencyTimeoutRef.current) {
      clearTimeout(saveCurrencyTimeoutRef.current);
    }
    
    saveCurrencyTimeoutRef.current = window.setTimeout(() => {
      saveCurrency(playerId);
    }, 500);
    
    return () => {
      if (saveCurrencyTimeoutRef.current) {
        clearTimeout(saveCurrencyTimeoutRef.current);
      }
    };
  }, [playerShards, raffleTickets, playerId, isLoadingCurrency, saveCurrency]);

  useEffect(() => {
    localStorage.setItem('smackzone_jackpot', jackpot.toString());
  }, [jackpot]);

  useEffect(() => {
    currencyMountedRef.current = true;
    return () => {
      currencyMountedRef.current = false;
      // Flush pending currency save on unmount
      if (saveCurrencyTimeoutRef.current) {
        clearTimeout(saveCurrencyTimeoutRef.current);
      }
      
      // Do not send a second, unordered absolute-balance write on unmount.
      // Normal exits await the shared save queue before navigation.

      if (spinIntervalRef.current) clearInterval(spinIntervalRef.current);
      if (spinTimeoutRef.current) clearTimeout(spinTimeoutRef.current);
      if (spinResultTimeoutRef.current) clearTimeout(spinResultTimeoutRef.current);
      if (coinFlipTimeoutRef.current) clearTimeout(coinFlipTimeoutRef.current);
      if (loseTransitionTimeoutRef.current) clearTimeout(loseTransitionTimeoutRef.current);
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
      if (spawnIntervalRef.current) clearInterval(spawnIntervalRef.current);
      if (initialSpawnRef.current) clearTimeout(initialSpawnRef.current);
      if (waveTimerRef.current) clearInterval(waveTimerRef.current);
      if (ruleTimerRef.current) clearInterval(ruleTimerRef.current);
      if (modeSpinIntervalRef.current) clearInterval(modeSpinIntervalRef.current);
      if (modeSpinTimeoutRef.current) clearTimeout(modeSpinTimeoutRef.current);
      if (modeRevealTimeoutRef.current) clearTimeout(modeRevealTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (gameState === 'double_or_nothing' && pendingPayout > 0) {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = 'You have uncollected winnings! Are you sure you want to leave?';
        return e.returnValue;
      };

      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  }, [gameState, pendingPayout]);

  const enterCasino = useCallback(() => {
    const refreshEpoch = ++raffleRefreshEpochRef.current;
    const balanceEpoch = balanceMutationEpochRef.current;
    const refreshPlayerId = playerIdRef.current;
    const currentRefresh = () => currencyMountedRef.current &&
      refreshEpoch === raffleRefreshEpochRef.current && refreshPlayerId === playerIdRef.current;
    const balanceUnchanged = () => currentRefresh() && balanceEpoch === balanceMutationEpochRef.current &&
      playerShardsRef.current === lastSavedShardsRef.current && raffleTicketsRef.current === lastSavedTicketsRef.current;
    setAriaQuip(ARIA_CASINO_QUIPS[Math.floor(Math.random() * ARIA_CASINO_QUIPS.length)]);
    setGameState('casino_lobby');
    setObstacles([]); // Ensure clean state
    
    if (wallet) return;

    // Check for pending raffle draws and fetch past results
    fetch('/api/raffle/check', { method: 'POST', headers: { 'X-Requested-With': 'starmuff' } })
      .then(res => res.json())
      .then(data => {
        if (!currentRefresh()) return;
        if (data.drawn && data.draw) {
          const pid = playerIdRef.current;
          if (data.draw.winnerId === pid && !data.draw.claimed) {
            setRaffleBanner({ type: 'winner', draw: data.draw });
          } else if (data.draw.totalEntrants > 0) {
            setRaffleBanner({ type: 'drawn', draw: data.draw });
          }
          // A raffle read must never replace a wager, payout, or unconfirmed write.
          // Discard stale reads; the next currency load can reconcile raffle data.
          if (pid && balanceUnchanged()) {
            fetch(`/api/casino/currency/${pid}/${WORLD_ID}`)
              .then(r => { if (!r.ok) throw new Error('Raffle balance unavailable'); return r.json(); })
              .then(d => {
                if (!balanceUnchanged()) return;
                if (Number.isFinite(d.casinoData?.raffleTickets) && d.casinoData.raffleTickets >= 0) {
                  setRaffleTickets(d.casinoData.raffleTickets);
                  raffleTicketsRef.current = d.casinoData.raffleTickets;
                  lastSavedTicketsRef.current = d.casinoData.raffleTickets;
                }
                if (Number.isFinite(d.currency) && d.currency >= 0) {
                  setPlayerShards(d.currency);
                  playerShardsRef.current = d.currency;
                  lastSavedShardsRef.current = d.currency;
                }
              })
              .catch(() => {});
          }
        } else if (data.latestDraw && data.latestDraw.winnerId === playerIdRef.current && !data.latestDraw.claimed) {
          setRaffleBanner({ type: 'winner', draw: data.latestDraw });
        }
      })
      .catch(() => {});
    
    fetch('/api/raffle/draws')
      .then(res => res.json())
      .then(draws => { if (currentRefresh()) setRaffleDraws(draws); })
      .catch(() => {});
  }, [wallet]);

  const startGame = useCallback((mode: GameMode) => {
    const diffConfig = DIFFICULTY_CONFIGS[selectedDifficulty];
    // Check if player has enough for this difficulty (minimum threshold)
    if (playerShards < diffConfig.minShards || currencySaveError) return;
    
    // Entry fee is still 25% of current chips
    const wagerAmount = Math.floor(playerShards * WAGER_PERCENT);
    if (wagerAmount < 1) return;
    
    // Clear any lingering timers from previous games to prevent stale pause states
    if (ruleTimerRef.current) {
      clearInterval(ruleTimerRef.current);
      ruleTimerRef.current = null;
    }
    if (ruleUnpauseTimeoutRef.current) {
      clearTimeout(ruleUnpauseTimeoutRef.current);
      ruleUnpauseTimeoutRef.current = null;
    }
    if (waveTimerRef.current) {
      clearInterval(waveTimerRef.current);
      waveTimerRef.current = null;
    }
    
    setCurrentBet(wagerAmount);
    setPlayerShards(prev => prev - wagerAmount);
    setJackpot(prev => prev + Math.floor(wagerAmount * 0.05));
    
    setSelectedMode(mode);
    setGameState('countdown');
    setCountdown(5);
    setPlayerLane('center');
    playerLaneRef.current = 'center';
    setObstacles([]);
    setScore(0);
    setCombo(0);
    setMaxStreak(0);
    setComboTier(1);
    setShields(3);
    setIsPaused(false);
    isPausedRef.current = false;
    setShowRuleBanner(false);
    setBaseEarnings(0);
    setComboBonus(0);
    setCorrectAnswersThisRun(0);
    setTicketsEarnedThisGame(0);
    setSurvivedFirstWave(false);
    setHasJackpotKey(false);
    setBetMultiplier(1);
    setHasUsedReroll(false);
    setAwaitingPrizeChoice(false);
    setJackpotWon(0);
    obstacleIdRef.current = 0;
    lastSpawnedCorrectLaneRef.current = null;

    switch (mode) {
      case 'smashlane':
        speedRef.current = 2.5 * diffConfig.speedMultiplier;
        spawnIntervalMsRef.current = diffConfig.spawnInterval;
        break;
      case 'slamdrive':
        speedRef.current = 1.8 * diffConfig.speedMultiplier;
        setCurrentSpeed(1.8 * diffConfig.speedMultiplier);
        spawnIntervalMsRef.current = diffConfig.spawnInterval;
        break;
      case 'slamwave':
        speedRef.current = 2.5 * diffConfig.speedMultiplier;
        spawnIntervalMsRef.current = diffConfig.spawnInterval;
        setWaveNumber(1);
        setWaveActive(true);
        setWaveQuestionType(QUESTION_TYPES[Math.floor(Math.random() * QUESTION_TYPES.length)]);
        break;
      case 'smashshift':
        speedRef.current = 2.5 * diffConfig.speedMultiplier;
        spawnIntervalMsRef.current = diffConfig.spawnInterval;
        const initialRule = QUESTION_TYPES[Math.floor(Math.random() * QUESTION_TYPES.length)];
        setCurrentRule(initialRule);
        break;
      case 'smackstorm':
        speedRef.current = 2.0 * diffConfig.speedMultiplier;
        spawnIntervalMsRef.current = Math.round(diffConfig.spawnInterval * 1.3);
        break;
    }
  }, [selectedDifficulty, playerShards, currencySaveError]);

  const spinModeAndStart = useCallback(() => {
    const diffConfig = DIFFICULTY_CONFIGS[selectedDifficulty];
    const wagerAmount = Math.floor(playerShards * WAGER_PERCENT);
    // Check minimum threshold for difficulty AND minimum bet
    if (currencySaveError || playerShards < diffConfig.minShards || wagerAmount < 1 || isModeSpinning) return;
    
    setIsModeSpinning(true);
    setRevealedMode(null);
    
    const targetMode = ALL_MODES[Math.floor(Math.random() * ALL_MODES.length)];
    const targetIndex = ALL_MODES.indexOf(targetMode);
    
    let currentIndex = 0;
    let spinCount = 0;
    const totalSpins = 20 + targetIndex;
    
    modeSpinIntervalRef.current = window.setInterval(() => {
      currentIndex = (currentIndex + 1) % ALL_MODES.length;
      setHighlightedModeIndex(currentIndex);
      spinCount++;
      
      if (spinCount >= totalSpins) {
        if (modeSpinIntervalRef.current) clearInterval(modeSpinIntervalRef.current);
        setHighlightedModeIndex(targetIndex);
        setRevealedMode(targetMode);
        
        modeRevealTimeoutRef.current = window.setTimeout(() => {
          setIsModeSpinning(false);
          setRevealedMode(null);
          startGame(targetMode);
        }, 1200);
      }
    }, 100);
  }, [playerShards, isModeSpinning, startGame, selectedDifficulty, currencySaveError]);

  const goToModeSelect = useCallback(() => {
    setGameState('casino_lobby');
    setSelectedMode(null);
    setAriaQuip(ARIA_CASINO_QUIPS[Math.floor(Math.random() * ARIA_CASINO_QUIPS.length)]);
    if (waveTimerRef.current) clearInterval(waveTimerRef.current);
    if (ruleTimerRef.current) clearInterval(ruleTimerRef.current);
  }, []);

  const goToMenu = useCallback(async () => {
    if (exitInProgressRef.current) return;
    if (!casinoRoundCanExit(gameState, isModeSpinning)) {
      setExitState('round-active');
      onExitBlocked?.('round-active');
      return;
    }
    exitInProgressRef.current = true;
    setExitState('saving');
    if (saveCurrencyTimeoutRef.current) clearTimeout(saveCurrencyTimeoutRef.current);
    const pid = playerIdRef.current;
    // If loading failed, no wager was allowed and there is no known balance to write.
    const saved = !hasFetchedRef.current || !pid || await saveCurrency(pid);
    if (!currencyMountedRef.current) return;
    if (!saved) {
      exitInProgressRef.current = false;
      setExitState('save-error');
      onExitBlocked?.('balance-save-failed');
      return;
    }
    if (waveTimerRef.current) clearInterval(waveTimerRef.current);
    if (ruleTimerRef.current) clearInterval(ruleTimerRef.current);
    if (onLeave) {
      onLeave();
    } else {
      if (exitDestinationRef.current === '/game') {
        try { localStorage.setItem('returnFromCasino', 'true'); } catch { /* Optional navigation hint. */ }
      }
      setLocation(exitDestinationRef.current);
    }
  }, [gameState, isModeSpinning, onExitBlocked, onLeave, saveCurrency, setLocation]);

  useEffect(() => {
    if (!exitRequest || exitRequest === handledExitRequestRef.current) return;
    handledExitRequestRef.current = exitRequest;
    void goToMenu();
  }, [exitRequest, goToMenu]);

  const applyLuckySpinPrize = useCallback((result: { prize: LuckySpinPrize; value?: number }) => {
    switch (result.prize) {
      case 'bonus_shards':
        setPlayerShards(prev => prev + (result.value || 0));
        break;
      case 'shield_restore':
        const maxShields = DIFFICULTY_CONFIGS[selectedDifficulty].maxShields;
        setShields(prev => Math.min(prev + 1, maxShields));
        break;
      case 'multiplier_boost':
        setComboTier(prev => Math.min(prev + 2, MAX_COMBO_TIER));
        break;
      case 'double_bet':
        setBetMultiplier(prev => prev * 2);
        break;
      case 'jackpot_key':
        setHasJackpotKey(true);
        break;
    }
  }, []);

  const handleKeepPrize = useCallback(() => {
    if (luckySpinResult) {
      applyLuckySpinPrize(luckySpinResult);
    }
    setAwaitingPrizeChoice(false);
    
    spinResultTimeoutRef.current = window.setTimeout(() => {
      setShowLuckySpin(false);
      setLuckySpinResult(null);
      setIsPaused(false);
    }, 1000);
  }, [luckySpinResult, applyLuckySpinPrize]);

  const handleRerollPrize = useCallback(() => {
    setHasUsedReroll(true);
    setLuckySpinResult(null);
    setAwaitingPrizeChoice(false);
    
    spinIntervalRef.current = window.setInterval(() => {
      setSpinningSymbols([
        SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)],
        SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)],
        SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)],
      ]);
    }, 100);

    spinTimeoutRef.current = window.setTimeout(() => {
      if (spinIntervalRef.current) clearInterval(spinIntervalRef.current);
      const result = rollLuckySpinPrize(currentBet);
      setLuckySpinResult(result);
      
      const prizeIcon = getPrizeDisplay(result.prize).icon;
      setSpinningSymbols([prizeIcon, prizeIcon, prizeIcon]);
      
      applyLuckySpinPrize(result);
      
      spinResultTimeoutRef.current = window.setTimeout(() => {
        setShowLuckySpin(false);
        setLuckySpinResult(null);
        setIsPaused(false);
      }, 1500);
    }, 2000);
  }, [applyLuckySpinPrize]);

  const triggerLuckySpin = useCallback(() => {
    setIsPaused(true);
    setShowLuckySpin(true);
    setLuckySpinResult(null);
    setAwaitingPrizeChoice(false);
    
    spinIntervalRef.current = window.setInterval(() => {
      setSpinningSymbols([
        SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)],
        SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)],
        SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)],
      ]);
    }, 100);

    spinTimeoutRef.current = window.setTimeout(() => {
      if (spinIntervalRef.current) clearInterval(spinIntervalRef.current);
      const result = rollLuckySpinPrize(currentBet);
      setLuckySpinResult(result);
      
      const prizeIcon = getPrizeDisplay(result.prize).icon;
      setSpinningSymbols([prizeIcon, prizeIcon, prizeIcon]);
      
      if (selectedDifficulty === 'easy' && !hasUsedReroll) {
        setAwaitingPrizeChoice(true);
      } else {
        applyLuckySpinPrize(result);
        
        spinResultTimeoutRef.current = window.setTimeout(() => {
          setShowLuckySpin(false);
          setLuckySpinResult(null);
          setIsPaused(false);
        }, 1500);
      }
    }, 2000);
  }, [selectedDifficulty, hasUsedReroll, applyLuckySpinPrize]);

  const calculatePayout = useCallback(() => {
    if (!survivedFirstWave) return { raw: 0, final: 0, breakdown: null, jackpotContribution: 0, ticketsEarned: 0 };
    
    const diffConfig = DIFFICULTY_CONFIGS[selectedDifficulty];
    
    // === PERFORMANCE PORTION ===
    // Score bonus: based on total score achieved
    const scoreBonusCalc = Math.floor(score * 0.15);
    // Combo bonus: accumulated combo points during play
    const comboBonusCalc = Math.floor(comboBonus * 0.5);
    // Streak bonus: reward for best streak achieved
    const streakBonusCalc = Math.floor(maxStreak * 10);
    const performanceTotal = scoreBonusCalc + comboBonusCalc + streakBonusCalc;
    
    // Apply difficulty multiplier ONLY to performance (skill-based rewards)
    // Then multiply by 0.9
    const performancePayout = Math.floor(performanceTotal * diffConfig.payoutMultiplier * 0.9);
    
    // === BET PORTION (Proportional Return + Bonus) ===
    // GUARANTEED PROFIT SYSTEM: If you hit 25+ correct, you ALWAYS profit regardless of bet size
    // 
    // 1. BASE RETURN: bet × (correct/20) - proportional to bet, scales with performance
    //    - 20 correct = 1.0x your bet back (break even)
    //    - 25 correct = 1.25x your bet back (25% profit)
    //    - 30 correct = 1.5x your bet back (50% profit)
    //
    // 2. BONUS: Power-scaled extra reward for high performers
    //    - Rewards players who exceed the threshold
    //
    // Examples (Normal mode, 25 correct, no lucky spin):
    //    - 1k bet: 1k × 1.25 + bonus = 1,250 + ~500 = ~1,750 (75% profit!)
    //    - 10k bet: 10k × 1.25 + bonus = 12,500 + ~1,600 = ~14,100 (41% profit!)
    //    - 100k bet: 100k × 1.25 + bonus = 125,000 + ~5,000 = ~130,000 (30% profit!)
    const betBase = currentBet;
    const correctAnswerBonus = correctAnswersThisRun / 20; // 20 correct = 1.0x, 25 = 1.25x, etc.
    
    // Base return: proportional to bet, guaranteed profit if you beat 20 correct
    const baseReturn = Math.floor(betBase * correctAnswerBonus * betMultiplier);
    
    // Bonus: power-scaled extra reward (smaller % of bet, but still meaningful)
    const bonusMultiplier = Math.max(0, (correctAnswersThisRun - 20) / 10); // 0 at 20, 0.5 at 25, 1.0 at 30
    const powerBonus = Math.floor(Math.pow(betBase, 0.6) * 10 * bonusMultiplier);
    
    // Multiply bet portion by 0.9, then apply difficulty multiplier
    const scaledBetContribution = Math.floor((baseReturn + powerBonus) * 0.9 * diffConfig.payoutMultiplier);
    
    // === COMBINE: Performance + Bet (no 50/50 split, each stands alone) ===
    const grossPayout = performancePayout + scaledBetContribution;
    
    // === HOUSE CUT (5% rake on winnings over 1000) ===
    // Half of house cut (2.5%) goes to jackpot pool
    const HOUSE_CUT_RATE = 0.05; // 5% rake (typical poker rate)
    const HOUSE_CUT_THRESHOLD = 1000; // Only apply to winnings over 1000
    const JACKPOT_SHARE = 0.5; // Half of house cut goes to jackpot
    
    let houseCut = 0;
    let jackpotContribution = 0;
    let ticketsEarned = 0;
    if (grossPayout > HOUSE_CUT_THRESHOLD) {
      const taxableAmount = grossPayout - HOUSE_CUT_THRESHOLD;
      houseCut = Math.floor(taxableAmount * HOUSE_CUT_RATE);
      jackpotContribution = Math.floor(houseCut * JACKPOT_SHARE);
      // Award 1 raffle ticket per 50 chips of house cut
      ticketsEarned = wallet ? 0 : Math.floor(houseCut / 50);
    }
    
    const finalPayout = grossPayout - houseCut;
    
    const breakdown = {
      scoreBonus: scoreBonusCalc,
      comboBonus: comboBonusCalc,
      streakBonus: streakBonusCalc,
      performanceTotal,
      performancePayout,
      betBase,
      betMultiplierValue: betMultiplier,
      correctAnswerBonus,
      baseReturn,
      powerBonus,
      scaledBetContribution,
      difficultyMultiplier: diffConfig.payoutMultiplier,
      grossPayout,
      houseCut,
      jackpotContribution,
      ticketsEarned,
      finalPayout,
    };
    
    return { raw: grossPayout, final: finalPayout, breakdown, jackpotContribution, ticketsEarned };
  }, [currentBet, selectedDifficulty, betMultiplier, comboBonus, score, maxStreak, survivedFirstWave, correctAnswersThisRun]);

  const handleGameOver = useCallback(() => {
    const { raw, final, breakdown, jackpotContribution, ticketsEarned } = calculatePayout();
    setRawPayout(raw);
    setPayoutBreakdown(breakdown);
    
    // Track tickets earned this game
    if (ticketsEarned > 0) {
      setTicketsEarnedThisGame(ticketsEarned);
      setRaffleTickets(prev => {
        const newTotal = prev + ticketsEarned;
        raffleTicketsRef.current = newTotal;
        return newTotal;
      });
    }
    
    // Add jackpot contribution from house cut
    if (jackpotContribution && jackpotContribution > 0) {
      setJackpot(prev => {
        const newJackpot = prev + jackpotContribution;
        localStorage.setItem('smackzone_jackpot', String(newJackpot));
        return newJackpot;
      });
    }
    setAnimatedPayout(raw);
    setShowPayoutAnimation(true);
    setDoubleCount(0);
    setCoinFlipResult(null);
    
    // Animate the difficulty multiplier being applied
    const diffConfig = DIFFICULTY_CONFIGS[selectedDifficulty];
    const jackpotBonus = (hasJackpotKey && jackpot > 0) ? jackpot : 0;
    
    setTimeout(() => {
      // Animate countdown from raw to final over 1.5 seconds
      const steps = 30;
      const stepDuration = 50;
      const startValue = raw;
      const endValue = final;
      let currentStep = 0;
      
      const animateInterval = setInterval(() => {
        currentStep++;
        const progress = currentStep / steps;
        const currentValue = Math.floor(startValue + (endValue - startValue) * progress);
        setAnimatedPayout(currentValue);
        
        if (currentStep >= steps) {
          clearInterval(animateInterval);
          setAnimatedPayout(final);
          
          setTimeout(() => {
            setShowPayoutAnimation(false);
            const totalPayout = final + jackpotBonus;
            setPendingPayout(totalPayout);
            
            if (jackpotBonus > 0) {
              setJackpotWon(jackpot);
              setJackpot(500);
            }
            
            // Capture old scores and streaks for display BEFORE updating localStorage
            if (selectedMode) {
              const oldHighScore = getHighScore(selectedMode);
              const oldPreviousScore = getPreviousScore(selectedMode);
              const oldHighStreak = getHighStreak(selectedMode);
              const oldPreviousStreak = getPreviousStreak(selectedMode);
              
              // Set display values (these are what the user sees)
              setDisplayHighScore(score > oldHighScore ? score : oldHighScore);
              setDisplayPreviousScore(oldPreviousScore);
              setDisplayHighStreak(maxStreak > oldHighStreak ? maxStreak : oldHighStreak);
              setDisplayPreviousStreak(oldPreviousStreak);
              
              // Now update localStorage for next game
              setPreviousScore(selectedMode, score);
              setPreviousStreak(selectedMode, maxStreak);
              if (score > oldHighScore) {
                setHighScore(selectedMode, score);
              }
              if (maxStreak > oldHighStreak) {
                setHighStreakStorage(selectedMode, maxStreak);
              }
            }
            
            setGameState('double_or_nothing');
          }, 500);
        }
      }, stepDuration);
    }, 800);
  }, [calculatePayout, hasJackpotKey, jackpot, selectedDifficulty, selectedMode, score, maxStreak]);

  const collectPayout = useCallback(() => {
    const newTotal = playerShardsRef.current + pendingPayout;
    setPlayerShards(newTotal);
    playerShardsRef.current = newTotal;
    setPendingPayout(0);
    setGameState('gameover');
    
    // Serialize with any bet save that is still in flight.
    const pid = playerIdRef.current;
    if (pid) saveCurrency(pid);
  }, [pendingPayout, saveCurrency]);

  const handleBackOut = useCallback(() => {
    // Calculate refund: half the bet back + any bonus chips earned (jackpot key bonus)
    const halfBetRefund = Math.floor(currentBet * 0.5);
    const jackpotBonus = hasJackpotKey ? jackpot : 0;
    const totalRefund = halfBetRefund + jackpotBonus;
    
    // Apply refund
    const newTotal = playerShardsRef.current + totalRefund;
    setPlayerShards(newTotal);
    playerShardsRef.current = newTotal;
    
    // Reset jackpot if key was used
    if (hasJackpotKey && jackpot > 0) {
      setJackpotWon(jackpot);
      setJackpot(500);
    }
    
    // Clean up game state
    if (spawnIntervalRef.current) clearInterval(spawnIntervalRef.current);
    if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    if (waveTimerRef.current) clearInterval(waveTimerRef.current);
    if (ruleTimerRef.current) clearInterval(ruleTimerRef.current);
    
    setGameState('gameover');
    
    const pid = playerIdRef.current;
    if (pid) saveCurrency(pid);
  }, [currentBet, hasJackpotKey, jackpot, saveCurrency]);

  const attemptDoubleOrNothing = useCallback(() => {
    setIsFlipping(true);
    setCoinFlipResult(null);
    
    coinFlipTimeoutRef.current = window.setTimeout(() => {
      const win = Math.random() < 0.5;
      setCoinFlipResult(win ? 'win' : 'lose');
      setIsFlipping(false);
      
      if (win) {
        setPendingPayout(prev => prev * 2);
        setDoubleCount(prev => prev + 1);
      } else {
        setPendingPayout(0);
        loseTransitionTimeoutRef.current = window.setTimeout(() => {
          setGameState('gameover');
        }, 1500);
      }
    }, 1500);
  }, []);

  // Menu music control - plays ambient tracks when in menu
  useEffect(() => {
    if (gameState === 'menu') {
      if (!menuAudioRef.current) {
        const randomTrack = MENU_TRACKS[Math.floor(Math.random() * MENU_TRACKS.length)];
        console.log(`Playing menu track: ${randomTrack.name}`);
        const audio = new Audio(randomTrack.path);
        audio.loop = true;
        menuAudioRef.current = audio;
        fadeInAudio(audio, 0.3, 1500);
      }
    } else {
      if (menuAudioRef.current) {
        const audioToFade = menuAudioRef.current;
        menuAudioRef.current = null;
        fadeOutAudio(audioToFade, 1000);
      }
    }
    
    return () => {
      if (menuAudioRef.current) {
        menuAudioRef.current.pause();
        menuAudioRef.current = null;
      }
    };
  }, [gameState]);

  // Lobby music control - plays when in casino_lobby or countdown (keeps playing during countdown)
  useEffect(() => {
    if (gameState === 'casino_lobby') {
      if (!lobbyAudioRef.current) {
        const randomTrack = LOBBY_TRACKS[Math.floor(Math.random() * LOBBY_TRACKS.length)];
        console.log(`Playing lobby track: ${randomTrack.name}`);
        const audio = new Audio(randomTrack.path);
        audio.loop = true;
        lobbyAudioRef.current = audio;
        fadeInAudio(audio, 0.35, 1500);
      }
    } else if (gameState === 'countdown') {
      // During countdown, start a long crossfade from lobby to gameplay music
      if (lobbyAudioRef.current) {
        const audioToFade = lobbyAudioRef.current;
        lobbyAudioRef.current = null;
        // Extra long fade during countdown for smooth transition (3 seconds)
        fadeOutAudio(audioToFade, 3000);
      }
    } else {
      if (lobbyAudioRef.current) {
        const audioToFade = lobbyAudioRef.current;
        lobbyAudioRef.current = null;
        fadeOutAudio(audioToFade, 1000);
      }
    }
    
    return () => {
      if (lobbyAudioRef.current) {
        lobbyAudioRef.current.pause();
        lobbyAudioRef.current = null;
      }
    };
  }, [gameState]);

  // Gameplay music control - starts during countdown for smooth crossfade
  useEffect(() => {
    if (gameState === 'countdown') {
      // Pre-load and start fading in gameplay music during countdown
      if (!gameplayAudioRef.current) {
        const randomTrack = GAMEPLAY_TRACKS[Math.floor(Math.random() * GAMEPLAY_TRACKS.length)];
        console.log(`Preparing casino track: ${randomTrack.name}`);
        const audio = new Audio(randomTrack.path);
        audio.loop = true;
        gameplayAudioRef.current = audio;
        // Start with a slow fade in during countdown (3 seconds)
        fadeInAudio(audio, 0.4, 3000);
      }
    } else if (gameState === 'playing') {
      // Keep playing if already started during countdown - do nothing
      // Only start new track if somehow there's no audio playing
      if (!gameplayAudioRef.current) {
        const randomTrack = GAMEPLAY_TRACKS[Math.floor(Math.random() * GAMEPLAY_TRACKS.length)];
        console.log(`Playing casino track: ${randomTrack.name}`);
        const audio = new Audio(randomTrack.path);
        audio.loop = true;
        gameplayAudioRef.current = audio;
        fadeInAudio(audio, 0.4, 1000);
      }
    } else {
      // Stop gameplay music when not playing or countdown
      if (gameplayAudioRef.current) {
        const audioToFade = gameplayAudioRef.current;
        gameplayAudioRef.current = null;
        fadeOutAudio(audioToFade, 1000);
      }
    }
    
    // Only cleanup on actual unmount, not on state transitions
  }, [gameState]);
  
  // Separate cleanup effect for unmount only
  useEffect(() => {
    return () => {
      if (gameplayAudioRef.current) {
        gameplayAudioRef.current.pause();
        gameplayAudioRef.current = null;
      }
    };
  }, []);

  // Double or Nothing music control - crossfade from gameplay to double-or-nothing track
  useEffect(() => {
    if (gameState === 'double_or_nothing' && coinFlipResult !== 'lose') {
      // Start or continue playing the double or nothing music (random track)
      if (!doubleOrNothingAudioRef.current) {
        const randomTrack = DOUBLE_OR_NOTHING_TRACKS[Math.floor(Math.random() * DOUBLE_OR_NOTHING_TRACKS.length)];
        const audio = new Audio(randomTrack.path);
        audio.loop = true;
        doubleOrNothingAudioRef.current = audio;
        fadeInAudio(audio, 0.5, 1500);
      }
    } else {
      // Stop the winning music when leaving double_or_nothing or when busted
      if (doubleOrNothingAudioRef.current) {
        const audioToFade = doubleOrNothingAudioRef.current;
        doubleOrNothingAudioRef.current = null;
        fadeOutAudio(audioToFade, 800);
      }
    }
    
    // Play bust music when player loses the coin flip
    if (gameState === 'double_or_nothing' && coinFlipResult === 'lose') {
      if (!bustAudioRef.current) {
        const audio = new Audio(solarFlareOutMusic);
        audio.loop = false;
        bustAudioRef.current = audio;
        fadeInAudio(audio, 0.5, 500);
      }
    }
    
    return () => {
      // Cleanup on unmount
      if (doubleOrNothingAudioRef.current) {
        doubleOrNothingAudioRef.current.pause();
        doubleOrNothingAudioRef.current = null;
      }
    };
  }, [gameState, coinFlipResult]);
  
  // Bust music for regular game over (losing the game)
  useEffect(() => {
    if (gameState === 'gameover') {
      // Stop any existing bust audio before playing
      if (bustAudioRef.current) {
        bustAudioRef.current.pause();
        bustAudioRef.current = null;
      }
      const audio = new Audio(solarFlareOutMusic);
      audio.loop = false;
      bustAudioRef.current = audio;
      fadeInAudio(audio, 0.5, 500);
    }
    
    return () => {
      if (bustAudioRef.current) {
        bustAudioRef.current.pause();
        bustAudioRef.current = null;
      }
    };
  }, [gameState]);

  useEffect(() => {
    if (gameState === 'countdown') {
      if (countdown > 0) {
        const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        // Ensure pause state is reset before starting play
        setIsPaused(false);
        isPausedRef.current = false;
        setGameState('playing');
      }
    }
  }, [gameState, countdown, setIsPaused]);

  const getQuestionType = useCallback((): QuestionType | undefined => {
    if (!selectedMode) return undefined;
    switch (selectedMode) {
      case 'slamwave':
        return waveQuestionType;
      case 'smashshift':
        return currentRule;
      default:
        return undefined;
    }
  }, [selectedMode, waveQuestionType, currentRule]);

  const spawnObstacle = useCallback(() => {
    if (isPausedRef.current) return;
    
    setObstacles(prev => {
      const activeCount = prev.filter(o => !o.answered && o.y < 100).length;
      const maxAllowed = selectedMode === 'smackstorm' ? MAX_OBSTACLES_SMACKSTORM : MAX_OBSTACLES_ON_SCREEN;
      
      if (activeCount >= maxAllowed) {
        return prev;
      }
      
      const questionType = getQuestionType();
      const question = generateQuestion(questionType);
      lastSpawnedCorrectLaneRef.current = question.correctLane;
      
      const newObstacle: Obstacle = {
        id: obstacleIdRef.current++,
        question,
        y: -10,
        answered: false,
        correct: null,
      };
      
      if (selectedMode === 'smackstorm' && activeCount + 1 < maxAllowed) {
        const secondQuestion = generateQuestion(undefined, question.correctLane);
        const secondObstacle: Obstacle = {
          id: obstacleIdRef.current++,
          question: secondQuestion,
          y: -35,
          answered: false,
          correct: null,
        };
        return [...prev, newObstacle, secondObstacle];
      }
      
      return [...prev, newObstacle];
    });
  }, [selectedMode, getQuestionType]);

  const handleCorrectAnswer = useCallback(() => {
    const newCorrectCount = correctAnswersThisRun + 1;
    setCorrectAnswersThisRun(newCorrectCount);
    
    if (!survivedFirstWave) {
      // For all modes: 20+ correct answers triggers payout threshold
      // For slamwave: also triggers if you survive past wave 4
      if (newCorrectCount >= SURVIVAL_THRESHOLD_ANSWERS) {
        setSurvivedFirstWave(true);
      } else if (selectedMode === 'slamwave' && waveNumber > SURVIVAL_THRESHOLD_WAVE) {
        setSurvivedFirstWave(true);
      }
    }
    
    if (newCorrectCount % LUCKY_SPIN_INTERVAL === 0) {
      setIsPaused(true);
      setTimeout(() => triggerLuckySpin(), 300);
    }
    
    if (selectedMode === 'slamdrive') {
      const diffConfig = DIFFICULTY_CONFIGS[selectedDifficulty];
      setCurrentSpeed(prev => {
        const maxSpeed = 3.5 * diffConfig.speedMultiplier;
        const newSpeed = Math.min(prev + 0.2, maxSpeed);
        speedRef.current = newSpeed;
        return newSpeed;
      });
    }
  }, [selectedMode, selectedDifficulty, correctAnswersThisRun, survivedFirstWave, waveNumber, triggerLuckySpin]);

  const handleWrongAnswer = useCallback(() => {
    if (selectedMode === 'slamdrive') {
      const diffConfig = DIFFICULTY_CONFIGS[selectedDifficulty];
      setCurrentSpeed(prev => {
        const minSpeed = 1.8 * diffConfig.speedMultiplier;
        const newSpeed = Math.max(prev - 0.4, minSpeed);
        speedRef.current = newSpeed;
        return newSpeed;
      });
    }
  }, [selectedMode, selectedDifficulty]);

  const handleAnswer = useCallback((selectedLane: Lane) => {
    if (isPausedRef.current) return;
    
    setPlayerLane(selectedLane);
    playerLaneRef.current = selectedLane;
    
    setObstacles(prev => {
      const activeObstacle = prev.find(o => !o.answered && o.y > -5 && o.y < DANGER_LINE + 5);
      if (!activeObstacle) return prev;
      
      const isCorrect = activeObstacle.question.correctLane === selectedLane;
      
      if (isCorrect) {
        // Base points scale with bet: higher stakes = higher points per answer
        // At 1k bet: 100 + 50 = 150 base points
        // At 10k bet: 100 + 158 = 258 base points
        // At 100k bet: 100 + 500 = 600 base points
        const betBonus = Math.floor(Math.pow(currentBet, 0.5) * 0.5);
        const basePoints = 100 + betBonus;
        const tierBonus = basePoints * (comboTier - 1);
        const totalPoints = basePoints * comboTier;
        
        setScore(s => s + totalPoints);
        setBaseEarnings(e => e + basePoints);
        setComboBonus(b => b + tierBonus);
        
        const newCombo = combo + 1;
        setCombo(newCombo);
        setMaxStreak(prev => Math.max(prev, newCombo));
        
        if (newCombo % COMBO_PER_TIER === 0 && comboTier < MAX_COMBO_TIER) {
          setComboTier(t => Math.min(t + 1, MAX_COMBO_TIER));
        }
        
        setCorrectFlash(true);
        setTimeout(() => setCorrectFlash(false), 200);
        handleCorrectAnswer();
      } else {
        setShields(s => {
          const newShields = s - 1;
          if (newShields <= 0) {
            handleGameOver();
          }
          return newShields;
        });
        setCombo(0);
        setComboTier(t => Math.max(t - 2, 1));
        setHitFlash(true);
        setTimeout(() => setHitFlash(false), 300);
        handleWrongAnswer();
      }
      
      return prev.map(o => 
        o.id === activeObstacle.id 
          ? { ...o, answered: true, correct: isCorrect }
          : o
      );
    });
  }, [combo, comboTier, handleCorrectAnswer, handleWrongAnswer, handleGameOver]);

  useEffect(() => {
    if (gameState !== 'playing' || !selectedMode) return;

    const setupSpawning = () => {
      if (spawnIntervalRef.current) clearInterval(spawnIntervalRef.current);
      spawnIntervalRef.current = window.setInterval(spawnObstacle, spawnIntervalMsRef.current);
    };

    setupSpawning();
    initialSpawnRef.current = window.setTimeout(spawnObstacle, 500);

    return () => {
      if (spawnIntervalRef.current) clearInterval(spawnIntervalRef.current);
      if (initialSpawnRef.current) clearTimeout(initialSpawnRef.current);
    };
  }, [gameState, selectedMode, selectedDifficulty, spawnObstacle]);

  useEffect(() => {
    if (gameState !== 'playing' || selectedMode !== 'slamwave') return;

    const waveLoop = () => {
      if (waveActive) {
        setWaveActive(false);
        spawnIntervalMsRef.current = 4000;
        if (spawnIntervalRef.current) {
          clearInterval(spawnIntervalRef.current);
          spawnIntervalRef.current = window.setInterval(spawnObstacle, 4000);
        }
        
        setTimeout(() => {
          setWaveNumber(prev => prev + 1);
          setWaveQuestionType(QUESTION_TYPES[Math.floor(Math.random() * QUESTION_TYPES.length)]);
          setWaveActive(true);
          spawnIntervalMsRef.current = 2000;
          if (spawnIntervalRef.current) {
            clearInterval(spawnIntervalRef.current);
            spawnIntervalRef.current = window.setInterval(spawnObstacle, 2000);
          }
        }, 3000);
      }
    };

    waveTimerRef.current = window.setInterval(waveLoop, 15000);

    return () => {
      if (waveTimerRef.current) clearInterval(waveTimerRef.current);
    };
  }, [gameState, selectedMode, waveActive, spawnObstacle]);

  useEffect(() => {
    if (gameState !== 'playing' || selectedMode !== 'smashshift') return;

    const ruleLoop = () => {
      // Clear any pending unpause timeout before starting a new rule change
      if (ruleUnpauseTimeoutRef.current) {
        clearTimeout(ruleUnpauseTimeoutRef.current);
        ruleUnpauseTimeoutRef.current = null;
      }
      
      setIsPaused(true);
      isPausedRef.current = true;
      setShowRuleBanner(true);
      
      const newRule = QUESTION_TYPES[Math.floor(Math.random() * QUESTION_TYPES.length)];
      setCurrentRule(newRule);
      
      // Track the unpause timeout so it can be cleaned up
      ruleUnpauseTimeoutRef.current = window.setTimeout(() => {
        setShowRuleBanner(false);
        setIsPaused(false);
        isPausedRef.current = false;
        ruleUnpauseTimeoutRef.current = null;
      }, 2000);
    };

    ruleTimerRef.current = window.setInterval(ruleLoop, 15000);

    return () => {
      if (ruleTimerRef.current) {
        clearInterval(ruleTimerRef.current);
        ruleTimerRef.current = null;
      }
      // Clean up any pending unpause timeout
      if (ruleUnpauseTimeoutRef.current) {
        clearTimeout(ruleUnpauseTimeoutRef.current);
        ruleUnpauseTimeoutRef.current = null;
        // Ensure we don't leave the game paused if effect cleans up mid-rule-change
        setIsPaused(false);
        isPausedRef.current = false;
        setShowRuleBanner(false);
      }
    };
  }, [gameState, selectedMode, setIsPaused]);

  // Fail-safe: ensure game is unpaused when rule banner is not showing
  // This catches any edge cases where the unpause timeout was lost
  useEffect(() => {
    if (gameState === 'playing' && !showRuleBanner && isPausedRef.current) {
      // Banner is hidden but game is still paused - force unpause
      isPausedRef.current = false;
      setIsPaused(false);
    }
  }, [gameState, showRuleBanner, setIsPaused]);

  useEffect(() => {
    if (gameState !== 'playing') return;
    
    // Defensive reset: ensure game loop starts with unpaused state
    // This catches any lingering pause states from previous sessions/modes
    isPausedRef.current = false;
    
    let lastTime = 0;
    const TARGET_FPS = 60; // Full 60fps for smooth number visibility
    const FRAME_TIME = 1000 / TARGET_FPS;

    const gameLoop = (currentTime: number) => {
      // Use ref to avoid stale closure issues
      if (isPausedRef.current) {
        gameLoopRef.current = requestAnimationFrame(gameLoop);
        return;
      }
      
      // Throttle to target FPS for better performance
      const deltaTime = currentTime - lastTime;
      if (deltaTime < FRAME_TIME) {
        gameLoopRef.current = requestAnimationFrame(gameLoop);
        return;
      }
      lastTime = currentTime;
      
      // Scale movement by actual time passed to maintain consistent speed
      const timeScale = Math.min(deltaTime / 16.67, 3); // Cap at 3x to prevent huge jumps

      setObstacles(prev => {
        const updated = prev
          .map(o => ({ ...o, y: o.y + speedRef.current * 0.1 * timeScale }))
          .filter(o => o.y < 110);
        
        updated.forEach(o => {
          if (!o.answered && o.y >= DANGER_LINE && o.y < DANGER_LINE + 5) {
            if (o.question.correctLane !== playerLaneRef.current) {
              setShields(s => {
                const newShields = s - 1;
                if (newShields <= 0) {
                  handleGameOver();
                }
                return newShields;
              });
              setCombo(0);
              setComboTier(t => Math.max(t - 2, 1));
              setHitFlash(true);
              setTimeout(() => setHitFlash(false), 300);
              handleWrongAnswer();
              o.answered = true;
              o.correct = false;
            } else {
              o.answered = true;
              o.correct = true;
              handleCorrectAnswer();
            }
          }
        });
        
        return updated;
      });
      
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [gameState, selectedDifficulty, handleWrongAnswer, handleGameOver]);

  useEffect(() => {
    if (gameState === 'gameover' && selectedMode) {
      const currentHighScore = getHighScore(selectedMode);
      if (score > currentHighScore) {
        setHighScore(selectedMode, score);
      }
    }
  }, [gameState, score, selectedMode]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
    if (Math.abs(deltaX) > 50) {
      if (deltaX > 0 && playerLane !== 'right') {
        const newLane = playerLane === 'left' ? 'center' : 'right';
        handleAnswer(newLane);
      } else if (deltaX < 0 && playerLane !== 'left') {
        const newLane = playerLane === 'right' ? 'center' : 'left';
        handleAnswer(newLane);
      }
    }
    touchStartRef.current = null;
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'playing') return;
      if (e.key === 'ArrowLeft' || e.key === 'a') {
        handleAnswer('left');
      } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === ' ') {
        handleAnswer('center');
      } else if (e.key === 'ArrowRight' || e.key === 'd') {
        handleAnswer('right');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, handleAnswer]);

  const getRank = (score: number): { rank: string; color: string } => {
    if (score >= 2000) return { rank: '🥇 GOLD', color: 'text-yellow-400' };
    if (score >= 1000) return { rank: '🥈 SILVER', color: 'text-gray-300' };
    return { rank: '🥉 BRONZE', color: 'text-amber-600' };
  };

  const renderComboMeter = () => {
    const tierProgress = comboTier < MAX_COMBO_TIER 
      ? (combo % COMBO_PER_TIER) / COMBO_PER_TIER * 100 
      : 100;
    
    return (
      <div className="absolute top-36 left-4 right-4 z-10 pointer-events-none">
        <div className="flex items-center gap-2">
          <span className="text-purple-400 text-sm font-bold">🔥 x{comboTier}</span>
          <div className="flex-1 h-3 bg-slate-700 rounded-full overflow-hidden relative">
            <div 
              className={`h-full transition-all duration-200 ${
                comboTier >= MAX_COMBO_TIER 
                  ? 'bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 animate-pulse' 
                  : 'bg-gradient-to-r from-purple-500 to-pink-500'
              }`}
              style={{ width: `${tierProgress}%` }}
            />
            <div className="absolute inset-0 flex justify-around items-center">
              {[...Array(MAX_COMBO_TIER - 1)].map((_, i) => (
                <div 
                  key={i} 
                  className={`w-0.5 h-full ${i + 1 < comboTier ? 'bg-white/30' : 'bg-slate-600'}`}
                />
              ))}
            </div>
          </div>
          <span className="text-purple-400 text-xs">{combo}</span>
        </div>
        {comboTier >= MAX_COMBO_TIER && (
          <div className="text-center text-yellow-400 text-xs font-bold animate-pulse mt-1">
            MAX MULTIPLIER!
          </div>
        )}
      </div>
    );
  };

  const renderModeHUD = () => {
    if (!selectedMode) return null;
    
    switch (selectedMode) {
      case 'slamdrive':
        const diffConfig = DIFFICULTY_CONFIGS[selectedDifficulty];
        const minSpeed = 1.8 * diffConfig.speedMultiplier;
        const maxSpeed = 3.5 * diffConfig.speedMultiplier;
        const speedPercent = ((currentSpeed - minSpeed) / (maxSpeed - minSpeed)) * 100;
        return (
          <div className="absolute top-24 left-4 right-4 z-10 pointer-events-none">
            <div className="flex items-center gap-2">
              <span className="text-yellow-400 text-sm font-bold">⚡ SPEED</span>
              <div className="flex-1 h-3 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-yellow-400 to-red-500 transition-all duration-200"
                  style={{ width: `${speedPercent}%` }}
                />
              </div>
              <span className="text-yellow-400 text-sm font-bold">{currentSpeed.toFixed(1)}x</span>
            </div>
          </div>
        );
      case 'slamwave':
        return (
          <div className="absolute top-24 left-0 right-0 z-10 text-center pointer-events-none">
            <div className={`inline-block px-4 py-2 rounded-lg ${waveActive ? 'bg-blue-600' : 'bg-slate-700'}`}>
              <span className="text-white font-bold">
                🌊 WAVE {waveNumber} {!waveActive && '- BREAK'}
              </span>
            </div>
          </div>
        );
      case 'smashshift':
        return (
          <div className="absolute top-24 left-0 right-0 z-10 text-center pointer-events-none">
            <div className="inline-block px-4 py-2 bg-purple-600 rounded-lg">
              <span className="text-white font-bold">
                🔄 RULE: {getRuleLabel(currentRule)}
              </span>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const renderLuckySpinOverlay = () => {
    if (!showLuckySpin) return null;
    
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80">
        <div className="bg-gradient-to-b from-purple-900 to-indigo-900 rounded-2xl p-8 border-4 border-yellow-400 shadow-2xl">
          <h3 className="text-2xl font-bold text-yellow-400 text-center mb-6">🎰 LUCKY SPIN! 🎰</h3>
          
          <div className="flex gap-4 justify-center mb-6">
            {spinningSymbols.map((symbol, idx) => (
              <div 
                key={idx}
                className={`w-20 h-20 bg-slate-800 rounded-lg flex items-center justify-center text-4xl border-2 border-yellow-500 ${
                  !luckySpinResult ? 'animate-bounce' : ''
                }`}
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                {symbol}
              </div>
            ))}
          </div>
          
          {luckySpinResult && (
            <div className={`text-center text-2xl font-bold ${getPrizeDisplay(luckySpinResult.prize, luckySpinResult.value).color} animate-pulse`}>
              {getPrizeDisplay(luckySpinResult.prize, luckySpinResult.value).text}
            </div>
          )}
          
          {!luckySpinResult && (
            <div className="text-center text-slate-400 animate-pulse">
              Spinning...
            </div>
          )}
          
          {awaitingPrizeChoice && luckySpinResult && (
            <div className="mt-6 space-y-3">
              <div className="text-center text-sm text-green-400 mb-2">
                🎁 Easy Mode Bonus: Choose your fate!
              </div>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={handleKeepPrize}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-bold rounded-lg shadow-lg transition-all"
                  data-testid="button-keep-prize"
                >
                  ✓ KEEP
                </button>
                <button
                  onClick={handleRerollPrize}
                  className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-400 hover:to-pink-500 text-white font-bold rounded-lg shadow-lg transition-all"
                  data-testid="button-reroll-prize"
                >
                  🎲 REROLL
                </button>
              </div>
              <div className="text-center text-xs text-slate-500">
                One reroll per game
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const exitDialog = exitState === 'round-active' ? (
    <div role="status" className="relative z-[100] flex items-center gap-3 bg-slate-900 p-3 text-sm text-sky-100" data-testid="casino-round-active">
      <span>Finish or collect your current round, then return from the casino lobby.</span>
      <button type="button" className="shrink-0 rounded bg-sky-800 px-3 py-3" onClick={() => setExitState('idle')}>Got it</button>
    </div>
  ) : exitState !== 'idle' ? (
    <div role="dialog" aria-modal="true" aria-labelledby="casino-exit-title"
      className="fixed inset-0 z-[100] bg-slate-950/95 flex items-center justify-center p-5"
      data-testid="casino-safe-exit">
      <section className="max-w-md rounded-xl border border-sky-500/40 bg-slate-900 p-6 text-center">
        <h2 id="casino-exit-title" className="text-xl font-bold text-sky-100">
          {exitState === 'saving' ? 'Saving your casino balance…' : 'Your balance has not saved yet'}
        </h2>
        <p className="my-4 text-sm text-slate-300">
          {exitState === 'saving' ? (wallet ? 'Confirming your Quantum Chips save.' : 'Waiting for the server to confirm your chips and raffle tickets.') : 'You are still in the casino. Retry saving before returning to your ship.'}
        </p>
        {exitState === 'save-error' && <button type="button" className="rounded-lg bg-sky-700 px-5 py-3 font-bold" onClick={() => void goToMenu()}>Retry save and return</button>}
        {exitState !== 'saving' && <button type="button" className="block mx-auto mt-3 px-5 py-3 text-sky-200" onClick={() => { exitDestinationRef.current = '/game'; setExitState('idle'); }}>Stay in casino</button>}
      </section>
    </div>
  ) : null;

  const saveNotice = currencySaveError ? (
        <div role="alert" className="relative z-[70] bg-amber-950 text-amber-100 p-3 text-sm flex items-center justify-between gap-3">
          <span>Your latest balance has not saved yet.</span>
          <button className="shrink-0 px-4 py-3 rounded bg-amber-800" onClick={() => { const pid = playerIdRef.current; if (pid) saveCurrency(pid); }}>Retry save</button>
        </div>
  ) : null;

  if (currencyLoadError) {
    return (
      <main className="min-h-screen bg-slate-950 text-sky-100 flex items-center justify-center p-6" data-testid="casino-balance-unavailable">
        {exitDialog}
        <section className="max-w-md text-center">
          <h1 className="text-xl font-bold">Smackzone connection interrupted</h1>
          <p className="my-4 text-slate-300">Your balance could not be loaded. Reconnect before entering the casino.</p>
          <button className="px-5 py-3 rounded-lg bg-sky-700" onClick={() => setCurrencyLoadAttempt(attempt => attempt + 1)}>Retry connection</button>
          <button className="block mx-auto mt-4 px-5 py-3" onClick={goToMenu}>Return to flight</button>
        </section>
      </main>
    );
  }

  return (
    <div 
      className={`min-h-screen bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 select-none ${
        gameState === 'playing' ? 'overflow-hidden h-screen' : ''
      }`}
      style={gameState !== 'playing' ? { minHeight: '100vh' } : undefined}
      onTouchStart={gameState === 'playing' ? handleTouchStart : undefined}
      onTouchEnd={gameState === 'playing' ? handleTouchEnd : undefined}
    >
      {exitDialog}
      {!['keno', 'racing'].includes(gameState) && saveNotice}
      {wallet && !isLoadingCurrency && playerShards < 600 && ['menu', 'casino_lobby'].includes(gameState) && (
        <QuantumChipRefill disabled={currencySaveError} onEarn={() => {
          if (playerShardsRef.current >= 600) return;
          const next = playerShardsRef.current + 600;
          setPlayerShards(next); playerShardsRef.current = next;
          const pid = playerIdRef.current; if (pid) void saveCurrency(pid);
        }} />
      )}
      {gameState === 'menu' && (
        <div className="flex flex-col items-center min-h-screen p-4 pt-8 pb-16 overflow-y-auto">
          <div className="self-start mb-4">
            {onLeave ? <button type="button" onClick={() => void goToMenu()} data-testid="link-hub-smackzone" className="px-3 py-2 rounded-lg text-sm text-sky-200">← {wallet?.returnLabel || 'Return to flight'}</button> : <Link
              href="/hub"
              onClick={event => { event.preventDefault(); exitDestinationRef.current = '/hub'; void goToMenu(); }}
              data-testid="link-hub-smackzone"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
              style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)" }}
            >
              ← Hub
            </Link>}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 mb-4 text-center">
            SMACKZONE
          </h1>
          <p className="text-slate-400 text-sm mb-6 text-center">
            The Space Casino Math Challenge
          </p>
          {wallet && <p className="mb-4 text-center text-xs text-cyan-200">{wallet.description}</p>}
          
          <div className="bg-slate-800/60 rounded-xl p-4 mb-6 text-center">
            <div className="text-slate-400 text-sm">Your Quantum Chips</div>
            <div className="text-3xl font-bold text-cyan-400">
              {isLoadingCurrency ? (
                <span className="animate-pulse">Loading...</span>
              ) : (
                <>💎 {playerShards}</>
              )}
            </div>
          </div>
          
          <button
            onClick={enterCasino}
            disabled={isLoadingCurrency}
            className={`w-full max-w-md p-5 rounded-xl font-bold text-xl transition-all shadow-lg mb-6 ${
              isLoadingCurrency 
                ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 hover:from-amber-400 hover:via-yellow-400 hover:to-amber-400 text-black shadow-amber-500/30'
            }`}
            data-testid="button-enter-casino"
          >
            {isLoadingCurrency ? 'Loading...' : '🎰 ENTER THE CASINO 🎰'}
          </button>
          
          <button 
            onClick={goToMenu}
            className="text-slate-500 hover:text-slate-300 transition-colors"
            data-testid="button-leave-casino"
          >
            ← Leave Casino
          </button>
        </div>
      )}

      {gameState === 'casino_lobby' && (
        <div className="flex flex-col items-center p-4 pb-8 h-screen overflow-y-auto">
          <div className="w-full max-w-md">
            <div className="flex justify-between items-center mb-3">
              <button 
                onClick={goToMenu}
                className="text-slate-400 hover:text-white transition-colors"
                data-testid="button-leave-casino-lobby"
              >
                ← Leave Casino
              </button>
              <button
                onClick={() => setShowHelp(true)}
                className="px-3 py-1 bg-purple-600/30 hover:bg-purple-600/50 rounded-lg text-purple-300 hover:text-white transition-all border border-purple-500/30 text-sm font-bold"
                data-testid="button-help"
              >
                ❓ Rules
              </button>
              <div className="text-right">
                <div className="text-slate-400 text-xs">Your Quantum Chips</div>
                <div className="text-xl font-bold text-cyan-400">💎 {playerShards}</div>
              </div>
            </div>
            
            {!wallet && <>
            {raffleBanner && raffleBanner.type === 'winner' && raffleBanner.draw && (
              <div className="bg-gradient-to-r from-yellow-900/60 to-amber-900/60 rounded-lg p-3 mb-3 border-2 border-yellow-400/60 animate-pulse" data-testid="raffle-winner-banner">
                <div className="text-center">
                  <div className="text-yellow-400 text-lg font-bold">🎉 YOU WON THE RAFFLE! 🎉</div>
                  <div className="text-amber-200 text-sm mt-1">Prize: 💎 {raffleBanner.draw.prizeAmount} chips</div>
                  <button
                    onClick={() => {
                      if (claimingPrize) return;
                      setClaimingPrize(true);
                      fetch('/api/raffle/claim', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'starmuff' },
                        body: JSON.stringify({
                          drawId: raffleBanner.draw.id,
                          playerId: playerIdRef.current,
                          worldId: WORLD_ID
                        })
                      })
                        .then(res => res.json())
                        .then(data => {
                          if (data.success) {
                            setPlayerShards(prev => {
                              const newVal = prev + data.prizeAmount;
                              playerShardsRef.current = newVal;
                              return newVal;
                            });
                            setRaffleBanner({ type: 'claim', draw: { ...raffleBanner.draw, claimed: true } });
                            setTimeout(() => setRaffleBanner(null), 4000);
                          }
                        })
                        .catch(() => {})
                        .finally(() => setClaimingPrize(false));
                    }}
                    disabled={claimingPrize}
                    className="mt-2 px-6 py-2 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black font-bold rounded-lg transition-all"
                    data-testid="button-claim-raffle"
                  >
                    {claimingPrize ? 'Claiming...' : '💎 CLAIM PRIZE'}
                  </button>
                </div>
              </div>
            )}
            
            {raffleBanner && raffleBanner.type === 'claim' && (
              <div className="bg-gradient-to-r from-green-900/60 to-emerald-900/60 rounded-lg p-3 mb-3 border border-green-400/40" data-testid="raffle-claimed-banner">
                <div className="text-center text-green-400 font-bold">Prize claimed! 💎 +{raffleBanner.draw?.prizeAmount} chips added!</div>
              </div>
            )}
            
            {raffleBanner && raffleBanner.type === 'drawn' && raffleBanner.draw && raffleBanner.draw.winnerId !== playerIdRef.current && (
              <div className="bg-gradient-to-r from-slate-800/60 to-slate-700/60 rounded-lg p-2 mb-3 border border-slate-500/30" data-testid="raffle-drawn-banner">
                <div className="text-center">
                  <div className="text-slate-300 text-xs">Latest raffle winner: <span className="text-yellow-400 font-bold">{raffleBanner.draw.winnerName}</span></div>
                  <div className="text-slate-400 text-xs">Won 💎 {raffleBanner.draw.prizeAmount} with {raffleBanner.draw.winnerTickets} tickets</div>
                </div>
              </div>
            )}

            <div className="bg-gradient-to-r from-pink-900/40 to-purple-900/40 rounded-lg p-2 mb-3 border border-pink-500/30">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-pink-400 text-xs font-bold">🎟️ DAILY RAFFLE</div>
                  <div className="text-slate-300 text-xs">Next draw in: <span className="text-yellow-400 font-mono">{raffleCountdown}</span></div>
                </div>
                <div className="text-right">
                  <div className="text-slate-400 text-xs">Your Tickets</div>
                  <div className="text-lg font-bold text-pink-400">{raffleTickets}</div>
                </div>
              </div>
              <button
                onClick={() => setShowPastRaffles(!showPastRaffles)}
                className="w-full mt-2 text-xs text-pink-300 hover:text-pink-200 transition-colors"
                data-testid="button-toggle-past-raffles"
              >
                {showPastRaffles ? '▲ Hide Past Draws' : '▼ View Past Draws'}
              </button>
              
              {showPastRaffles && (
                <div className="mt-2 space-y-1 max-h-48 overflow-y-auto" data-testid="past-raffles-list">
                  {raffleDraws.length === 0 ? (
                    <div className="text-center text-slate-500 text-xs py-2">No past draws yet</div>
                  ) : (
                    raffleDraws.map((draw: any) => (
                      <div key={draw.id} className="bg-slate-900/60 rounded p-2 border border-slate-700/50">
                        <div className="flex justify-between items-center">
                          <div className="text-slate-400 text-xs">
                            {new Date(draw.drawDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                          <div className="text-xs">
                            {draw.totalEntrants > 0 ? (
                              <span className="text-yellow-400">💎 {draw.prizeAmount}</span>
                            ) : (
                              <span className="text-slate-600">No entries</span>
                            )}
                          </div>
                        </div>
                        {draw.totalEntrants > 0 && (
                          <div className="flex justify-between items-center mt-1">
                            <div className="text-xs">
                              <span className="text-slate-500">Winner: </span>
                              <span className={`font-bold ${draw.winnerId === playerIdRef.current ? 'text-yellow-400' : 'text-slate-300'}`}>
                                {draw.winnerId === playerIdRef.current ? 'YOU!' : draw.winnerName}
                              </span>
                            </div>
                            <div className="text-slate-500 text-xs">
                              {draw.winnerTickets}/{draw.totalTickets} tickets
                            </div>
                          </div>
                        )}
                        {draw.winnerId === playerIdRef.current && !draw.claimed && (
                          <button
                            onClick={() => {
                              setRaffleBanner({ type: 'winner', draw });
                            }}
                            className="w-full mt-1 py-1 bg-yellow-600 hover:bg-yellow-500 text-black text-xs font-bold rounded transition-all"
                            data-testid={`button-claim-past-raffle-${draw.id}`}
                          >
                            Claim Prize
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            
            </>}

            <div className="relative mb-3">
              <img 
                src={casinoShipSprite} 
                alt="Casino Ship" 
                className="w-32 h-auto mx-auto rounded-xl shadow-lg shadow-purple-500/20"
              />
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-yellow-500 px-3 py-0.5 rounded-full text-black font-bold text-xs animate-pulse">
                OPEN 24/7
              </div>
            </div>
            
            <div className="flex gap-2 mb-3">
              <div className="flex-1 bg-gradient-to-r from-amber-900/50 to-yellow-900/50 rounded-lg p-2 border border-amber-500/30">
                <div className="text-center">
                  <div className="text-amber-400 text-xs">🎰 JACKPOT</div>
                  <div className="text-xl font-bold text-yellow-400">💎 {jackpot}</div>
                </div>
              </div>
              <div className="flex-1 bg-slate-800/80 rounded-lg p-2 border border-purple-500/30">
                <div className="text-purple-400 text-xs font-bold">🤖 A.R.I.A.</div>
                <div className="text-slate-300 text-xs italic line-clamp-2">"{ariaQuip}"</div>
              </div>
            </div>
            
            <div className="bg-slate-800/60 rounded-lg p-3 mb-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Entry Fee (25%)</span>
                <span className="text-2xl font-bold text-cyan-400">💎 {Math.floor(playerShards * WAGER_PERCENT)}</span>
              </div>
              <div className="text-xs text-slate-500 mt-1 text-center">
                Survive Wave 4 (or {SURVIVAL_THRESHOLD_ANSWERS} answers) to earn!
              </div>
            </div>
            
            <div className="flex gap-2 mb-3">
              {(['easy', 'normal', 'hard'] as Difficulty[]).map(diff => {
                const config = DIFFICULTY_CONFIGS[diff];
                const isSelected = selectedDifficulty === diff;
                const canAfford = playerShards >= config.minShards;
                return (
                  <button
                    key={diff}
                    onClick={() => canAfford && setSelectedDifficulty(diff)}
                    disabled={!canAfford}
                    className={`flex-1 py-2 px-2 rounded-lg font-bold transition-all text-sm ${
                      !canAfford
                        ? 'bg-slate-900 text-slate-600 cursor-not-allowed opacity-50'
                        : isSelected 
                          ? `bg-gradient-to-r ${config.color} text-white scale-105 shadow-lg` 
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                    data-testid={`button-difficulty-${diff}`}
                  >
                    <div>{config.name}</div>
                    <div className="text-xs opacity-75">{config.payoutMultiplier}x</div>
                    {!canAfford && (
                      <div className="text-xs text-red-400">Need {config.minShards}</div>
                    )}
                  </button>
                );
              })}
            </div>
            
            <div className="grid grid-cols-1 gap-1.5 mb-3">
              {ALL_MODES.map((mode, index) => {
                const config = MODE_CONFIGS[mode];
                const isHighlighted = isModeSpinning && highlightedModeIndex === index;
                const isRevealed = revealedMode === mode;
                return (
                  <div
                    key={mode}
                    className={`flex items-center gap-2 p-2 rounded-lg transition-all text-left ${
                      isRevealed 
                        ? 'bg-gradient-to-r from-cyan-500 to-purple-600 scale-105 shadow-lg shadow-cyan-500/50 border-2 border-cyan-400'
                        : isHighlighted 
                          ? 'bg-gradient-to-r from-yellow-500/30 to-amber-500/30 border border-yellow-400'
                          : 'bg-slate-800/60 border border-slate-700'
                    }`}
                    data-testid={`mode-card-${mode}`}
                  >
                    <div className={`text-xl ${isRevealed ? 'animate-bounce' : ''}`}>{config.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className={`font-bold text-sm ${isRevealed ? 'text-white' : 'text-slate-300'}`}>{config.name}</div>
                      <div className={`text-xs truncate ${isRevealed ? 'text-cyan-100' : 'text-slate-500'}`}>{config.description}</div>
                    </div>
                    {isRevealed && (
                      <div className="text-white font-bold animate-pulse">▶</div>
                    )}
                  </div>
                );
              })}
            </div>
            
            <button
              onClick={spinModeAndStart}
              disabled={currencySaveError || playerShards < DIFFICULTY_CONFIGS[selectedDifficulty].minShards || Math.floor(playerShards * WAGER_PERCENT) < 1 || isModeSpinning}
              className={`w-full p-4 rounded-xl text-white text-xl font-bold transition-all mb-2 ${
                playerShards < DIFFICULTY_CONFIGS[selectedDifficulty].minShards || Math.floor(playerShards * WAGER_PERCENT) < 1 || isModeSpinning
                  ? 'bg-slate-700 opacity-50 cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 hover:from-amber-400 hover:via-yellow-400 hover:to-amber-400 shadow-lg shadow-amber-500/30 animate-pulse'
              }`}
              data-testid="button-spin-play"
            >
              {isModeSpinning ? '🎰 SPINNING...' : '🎰 SPIN TO PLAY'}
            </button>
            
            {playerShards < DIFFICULTY_CONFIGS[selectedDifficulty].minShards && (
              <div className="text-center text-red-400 text-xs mb-2">
                Need {DIFFICULTY_CONFIGS[selectedDifficulty].minShards} chips minimum for {DIFFICULTY_CONFIGS[selectedDifficulty].name}
              </div>
            )}
            
            <div className="border-t border-slate-700 pt-4 mt-4">
              <div className="text-center text-slate-400 text-sm mb-3">Or try other games:</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setGameState('keno')}
                  className="p-3 bg-gradient-to-r from-orange-600/80 to-amber-600/80 hover:from-orange-500 hover:to-amber-500 rounded-xl text-white font-bold transition-all border border-orange-400/30"
                  data-testid="button-play-keno"
                >
                  <div className="text-2xl mb-1">☄️</div>
                  <div className="text-sm">Asteroid Keno</div>
                  <div className="text-xs text-orange-200">Pick & Match</div>
                </button>
                <button
                  onClick={() => setGameState('racing')}
                  className="p-3 bg-gradient-to-r from-purple-600/80 to-pink-600/80 hover:from-purple-500 hover:to-pink-500 rounded-xl text-white font-bold transition-all border border-purple-400/30"
                  data-testid="button-play-racing"
                >
                  <div className="text-2xl mb-1">🏁</div>
                  <div className="text-sm">Companion Racing</div>
                  <div className="text-xs text-purple-200">Bet on Races</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {gameState === 'countdown' && (
        <div className="flex flex-col items-center justify-center min-h-screen">
          {selectedMode && (
            <div className="text-2xl text-cyan-400 mb-4 font-bold">
              {MODE_CONFIGS[selectedMode].icon} {MODE_CONFIGS[selectedMode].name}
            </div>
          )}
          <div className="text-lg text-slate-400 mb-2">
            {DIFFICULTY_CONFIGS[selectedDifficulty].name} Mode • Bet: 💎{currentBet}
          </div>
          <div className="text-9xl font-bold text-cyan-400 animate-pulse">
            {countdown || 'GO!'}
          </div>
        </div>
      )}

      {gameState === 'playing' && (
        <div className="relative h-screen">
          <div className={`absolute inset-0 transition-all duration-100 pointer-events-none ${hitFlash ? 'bg-red-900/50' : ''} ${correctFlash ? 'bg-green-900/30' : ''}`} />
          
          {renderLuckySpinOverlay()}
          
          {showRuleBanner && selectedMode === 'smashshift' && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70">
              <div className="text-center animate-pulse">
                <div className="text-6xl mb-4">🔄</div>
                <div className="text-4xl font-bold text-purple-400">
                  RULE: {getRuleLabel(currentRule)}
                </div>
              </div>
            </div>
          )}
          
          <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-10">
            <div className="text-white pointer-events-none">
              <div className="text-2xl font-bold">{score}</div>
              <div className="text-sm text-cyan-400">Combo: {combo}</div>
              {!survivedFirstWave && (
                <div className="text-xs text-amber-400 animate-pulse">
                  {selectedMode === 'slamwave' 
                    ? `Wave: ${waveNumber}/${SURVIVAL_THRESHOLD_WAVE}`
                    : `Survive: ${correctAnswersThisRun}/${SURVIVAL_THRESHOLD_ANSWERS}`
                  }
                </div>
              )}
              {survivedFirstWave && (
                <div className="text-xs text-green-400">✓ Earning!</div>
              )}
              {betMultiplier > 1 && (
                <div className="text-xs text-purple-400">Bet: x{betMultiplier}</div>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              {!survivedFirstWave && (
                <button
                  onClick={handleBackOut}
                  className="px-3 py-1 text-xs bg-amber-600/80 hover:bg-amber-500 text-white rounded-full font-semibold transition-colors shadow-md pointer-events-auto"
                  data-testid="button-back-out"
                >
                  🚪 Cash Out ({Math.floor(currentBet * 0.5)}{hasJackpotKey ? ` + 🎰${jackpot}` : ''})
                </button>
              )}
              <div className="text-right pointer-events-none">
                <div className="flex gap-1 mb-1 justify-end">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-8 h-8 rounded-full ${i < shields ? 'bg-cyan-400 shadow-lg shadow-cyan-400/50' : 'bg-slate-700'}`}
                      data-testid={`shield-${i}`}
                    />
                  ))}
                </div>
                <div className="text-xs text-amber-400">
                  🎰 {jackpot} {hasJackpotKey && '🔑'}
                </div>
              </div>
            </div>
          </div>

          {renderModeHUD()}
          {renderComboMeter()}

          <div className="absolute inset-0 flex z-20" style={{ top: '60px', bottom: '96px' }}>
            {LANES.map((lane) => (
              <button
                key={lane}
                onClick={() => handleAnswer(lane)}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  handleAnswer(lane);
                }}
                className={`flex-1 border-x border-slate-700/50 transition-colors active:bg-cyan-900/20 ${
                  playerLane === lane ? 'bg-cyan-900/10' : 'bg-transparent'
                }`}
                style={{ borderStyle: 'dashed', touchAction: 'manipulation' }}
                data-testid={`lane-zone-${lane}`}
              />
            ))}
          </div>

          <div 
            className="absolute left-0 right-0 h-1 bg-red-500/50"
            style={{ top: `${DANGER_LINE}%` }}
          />

          {obstacles.map(obstacle => (
            <React.Fragment key={`answers-${obstacle.id}`}>
              {obstacle.question.allAnswers.map((answer, idx) => (
                <div
                  key={`${obstacle.id}-${idx}`}
                  className={`absolute w-16 h-16 flex items-center justify-center rounded-lg font-bold text-xl z-20 ${
                    obstacle.answered
                      ? answer.lane === obstacle.question.correctLane
                        ? 'bg-green-500 text-white'
                        : 'bg-red-900/50 text-red-300 opacity-50'
                      : 'bg-purple-600 text-white'
                  }`}
                  style={{
                    transform: `translateY(${obstacle.y + 8}vh)`,
                    left: `calc(${getLanePosition(answer.lane)}% - 32px)`,
                    willChange: 'transform',
                    contain: 'layout style paint',
                  }}
                >
                  {answer.value}
                </div>
              ))}
            </React.Fragment>
          ))}

          {obstacles.map(obstacle => (
            <div
              key={obstacle.id}
              className="absolute left-0 right-0 flex justify-center pointer-events-none z-30"
              style={{ 
                transform: `translateY(${obstacle.y}vh)`,
                willChange: 'transform',
                contain: 'layout style paint',
              }}
            >
              <div className="flex w-full max-w-lg px-2">
                <div className="flex-1 text-center text-lg font-bold text-white bg-slate-800 rounded-lg py-2 border border-slate-600 mb-2">
                  {obstacle.question.prompt} = ?
                </div>
              </div>
            </div>
          ))}

          <div
            className="absolute transition-all duration-150 ease-out"
            style={{
              bottom: '10%',
              left: `calc(${getLanePosition(playerLane)}% - 40px)`,
            }}
          >
            <PlayerShipSprite direction={getShipDirection(playerLane)} size={80} animated />
          </div>

          <div className="absolute bottom-0 left-0 right-0 flex h-24">
            {LANES.map(lane => (
              <button
                key={lane}
                onClick={() => handleAnswer(lane)}
                className={`flex-1 flex items-center justify-center text-xl font-bold transition-all active:bg-slate-700/50 ${
                  playerLane === lane ? 'bg-cyan-900/30' : 'bg-transparent'
                }`}
                data-testid={`button-lane-${lane}`}
              >
                <span className="text-slate-500 uppercase">{lane}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {showPayoutAnimation && (
        <div className="fixed inset-0 bg-black/90 flex flex-col items-center justify-center z-50">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-400 mb-2">CALCULATING PAYOUT</h2>
            <div className="text-lg text-slate-500 mb-6">
              {DIFFICULTY_CONFIGS[selectedDifficulty].name} Mode: {DIFFICULTY_CONFIGS[selectedDifficulty].payoutMultiplier}x
            </div>
            
            <div className="bg-slate-800/80 rounded-xl p-8 mb-4">
              <div className="text-slate-500 text-sm mb-2">Raw Earnings</div>
              <div className="text-3xl font-bold text-slate-400 mb-4 line-through">
                💎 {rawPayout}
              </div>
              
              <div className="text-4xl mb-4 animate-bounce">
                ×{DIFFICULTY_CONFIGS[selectedDifficulty].payoutMultiplier}
              </div>
              
              <div className="text-slate-400 text-sm mb-2">Final Payout</div>
              <div className={`text-5xl font-bold transition-all duration-100 ${
                animatedPayout < rawPayout ? 'text-red-400' : 
                animatedPayout === rawPayout ? 'text-yellow-400' : 'text-cyan-400'
              }`}>
                💎 {animatedPayout}
              </div>
            </div>
            
            {selectedDifficulty === 'easy' && (
              <div className="text-amber-400 text-sm">
                💡 Play on Hard for full rewards!
              </div>
            )}
            {selectedDifficulty === 'normal' && (
              <div className="text-amber-400 text-sm">
                💡 Hard mode gives 100% payout!
              </div>
            )}
          </div>
        </div>
      )}

      {gameState === 'double_or_nothing' && selectedMode && (
        <div 
          className="flex flex-col items-center h-screen p-4 pb-24 overflow-y-scroll"
          style={{ 
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-y',
            overscrollBehavior: 'contain',
          }}
        >
          {coinFlipResult === 'lose' ? (
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">💥</div>
              <h2 className="text-4xl font-bold text-red-500 mb-2">BUSTED!</h2>
              <p className="text-slate-400">You lost it all...</p>
            </div>
          ) : (
            <>
              <h2 className="text-3xl font-bold text-amber-400 mb-2">DOUBLE OR NOTHING</h2>
              <div className="text-slate-400 mb-4">
                {MODE_CONFIGS[selectedMode].icon} {MODE_CONFIGS[selectedMode].name}
              </div>
              
              <div className="bg-slate-900/60 rounded-xl p-4 mb-4 w-full max-w-xs border border-slate-700">
                <div className="text-center mb-3">
                  <div className="text-xs text-slate-500 mb-1">CORRECT ANSWERS</div>
                  <div className={`text-2xl font-bold ${survivedFirstWave ? 'text-green-400' : 'text-red-400'}`} data-testid="text-correct-answers">
                    {correctAnswersThisRun} / {SURVIVAL_THRESHOLD_ANSWERS}
                  </div>
                  {!survivedFirstWave && (
                    <div className="text-xs text-red-400 mt-1">Didn't reach payout threshold</div>
                  )}
                  {survivedFirstWave && (
                    <div className="text-xs text-green-400 mt-1">Payout earned!</div>
                  )}
                </div>
                
                {/* Detailed Payout Breakdown */}
                {payoutBreakdown && (
                  <>
                    <div className="border-t border-cyan-500/30 pt-3 mt-3">
                      <div className="text-xs text-cyan-400 text-center mb-2 font-bold">PERFORMANCE (50%)</div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between text-slate-300">
                          <span>Score bonus:</span>
                          <span className="text-green-400">+{payoutBreakdown.scoreBonus}</span>
                        </div>
                        <div className="flex justify-between text-slate-300">
                          <span>Combo bonus:</span>
                          <span className="text-green-400">+{payoutBreakdown.comboBonus}</span>
                        </div>
                        <div className="flex justify-between text-slate-300">
                          <span>Streak bonus ({maxStreak}):</span>
                          <span className="text-green-400">+{payoutBreakdown.streakBonus}</span>
                        </div>
                        <div className="flex justify-between text-slate-400 text-xs pt-1 border-t border-slate-700">
                          <span>After ×{payoutBreakdown.difficultyMultiplier}:</span>
                          <span>{payoutBreakdown.performancePayout}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="border-t border-amber-500/30 pt-3 mt-3">
                      <div className="text-xs text-amber-400 text-center mb-2 font-bold">YOUR BET EARNINGS</div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between text-slate-300">
                          <span>💎 Your wager:</span>
                          <span>{payoutBreakdown.betBase.toLocaleString()}</span>
                        </div>
                        <div className="text-xs text-slate-500 -mt-1 ml-4">
                          The chips you risked
                        </div>
                        
                        <div className="flex justify-between text-slate-300">
                          <span>🎯 Performance multiplier:</span>
                          <span className="text-cyan-400">×{payoutBreakdown.correctAnswerBonus.toFixed(2)}</span>
                        </div>
                        <div className="text-xs text-slate-500 -mt-1 ml-4">
                          {correctAnswersThisRun} correct ÷ 20 = {payoutBreakdown.correctAnswerBonus.toFixed(2)}×
                        </div>
                        
                        <div className="flex justify-between text-slate-300">
                          <span>📈 Proportional return:</span>
                          <span className="text-green-400">+{payoutBreakdown.baseReturn.toLocaleString()}</span>
                        </div>
                        <div className="text-xs text-slate-500 -mt-1 ml-4">
                          Wager × {payoutBreakdown.correctAnswerBonus.toFixed(2)} = guaranteed return
                        </div>
                        
                        {payoutBreakdown.powerBonus > 0 && (
                          <>
                            <div className="flex justify-between text-slate-300">
                              <span>⚡ Skill bonus:</span>
                              <span className="text-green-400">+{payoutBreakdown.powerBonus.toLocaleString()}</span>
                            </div>
                            <div className="text-xs text-slate-500 -mt-1 ml-4">
                              Extra reward for exceeding 20 correct!
                            </div>
                          </>
                        )}
                        
                        {payoutBreakdown.betMultiplierValue > 1 && (
                          <div className="flex justify-between text-slate-300">
                            <span>🎰 Lucky Spin bonus:</span>
                            <span className="text-purple-400">×{payoutBreakdown.betMultiplierValue}</span>
                          </div>
                        )}
                        
                        <div className="flex justify-between text-slate-400 text-xs pt-2 border-t border-slate-700">
                          <span>After {selectedDifficulty} mode (×{payoutBreakdown.difficultyMultiplier}):</span>
                          <span className="text-amber-400 font-bold">{payoutBreakdown.scaledBetContribution.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="border-t border-purple-500/30 pt-3 mt-3">
                      <div className="text-xs text-purple-400 text-center mb-2 font-bold">TOTAL</div>
                      <div className="flex justify-between text-slate-400 text-xs pt-1 border-t border-slate-700 mt-2">
                        <span>Gross payout:</span>
                        <span>{payoutBreakdown.grossPayout}</span>
                      </div>
                    </div>
                    
                    {payoutBreakdown.houseCut > 0 && (
                      <div className="border-t border-red-500/30 pt-3 mt-3">
                        <div className="text-xs text-red-400 text-center mb-2 font-bold">HOUSE RAKE (5%)</div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between text-slate-300">
                            <span>House cut:</span>
                            <span className="text-red-400">-{payoutBreakdown.houseCut}</span>
                          </div>
                          <div className="flex justify-between text-slate-300">
                            <span>Added to jackpot:</span>
                            <span className="text-amber-400">+{payoutBreakdown.jackpotContribution} 🎰</span>
                          </div>
                          {payoutBreakdown.ticketsEarned > 0 && (
                            <div className="flex justify-between text-slate-300">
                              <span>Raffle tickets earned:</span>
                              <span className="text-pink-400">+{payoutBreakdown.ticketsEarned} 🎟️</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="border-t border-green-500/50 pt-3 mt-3">
                      <div className="flex justify-between text-lg font-bold">
                        <span className="text-white">NET PAYOUT:</span>
                        <span className="text-green-400">💎 {payoutBreakdown.finalPayout}</span>
                      </div>
                    </div>
                  </>
                )}
                
                <div className="border-t border-slate-700 pt-3 mt-3">
                  <div className="text-xs text-slate-500 text-center mb-2">SCORE</div>
                  <div className="grid grid-cols-3 gap-2 text-center mb-3">
                    <div>
                      <div className="text-xs text-yellow-400 mb-1">HIGH</div>
                      <div className="text-lg font-bold text-yellow-300" data-testid="text-high-score">
                        {displayHighScore}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 mb-1">PREVIOUS</div>
                      <div className="text-lg font-bold text-slate-300" data-testid="text-previous-score">
                        {displayPreviousScore}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-cyan-400 mb-1">THIS GAME</div>
                      <div className="text-lg font-bold text-cyan-300" data-testid="text-current-score">
                        {score}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="border-t border-slate-700 pt-3">
                  <div className="text-xs text-slate-500 text-center mb-2">BEST STREAK</div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-xs text-yellow-400 mb-1">HIGH</div>
                      <div className="text-lg font-bold text-yellow-300" data-testid="text-high-streak">
                        {displayHighStreak}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 mb-1">PREVIOUS</div>
                      <div className="text-lg font-bold text-slate-300" data-testid="text-previous-streak">
                        {displayPreviousStreak}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-cyan-400 mb-1">THIS GAME</div>
                      <div className="text-lg font-bold text-cyan-300" data-testid="text-current-streak">
                        {maxStreak}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-slate-800/80 rounded-xl p-6 mb-6 w-full max-w-xs text-center">
                {jackpotWon > 0 && (
                  <div className="mb-4 p-3 bg-gradient-to-r from-amber-900/50 to-yellow-900/50 rounded-lg border border-amber-500 animate-pulse">
                    <div className="text-amber-400 text-sm">🎰 JACKPOT WON! 🎰</div>
                    <div className="text-2xl font-bold text-yellow-400">+💎 {jackpotWon}</div>
                  </div>
                )}
                
                <div className="text-slate-400 mb-2">Pending Payout</div>
                <div className="text-5xl font-bold text-cyan-400 mb-4">
                  💎 {pendingPayout}
                </div>
                
                {doubleCount > 0 && (
                  <div className="text-green-400 text-sm mb-2">
                    Doubled {doubleCount}x successfully!
                  </div>
                )}
                
                {isFlipping && (
                  <div className="text-6xl animate-spin mb-4">🪙</div>
                )}
                
                {coinFlipResult === 'win' && !isFlipping && (
                  <div className="text-green-400 text-xl font-bold animate-pulse mb-4">
                    🎉 DOUBLED! 🎉
                  </div>
                )}
              </div>
              
              {!isFlipping && (
                <div className="flex flex-col gap-3 w-full max-w-xs">
                  <button
                    onClick={collectPayout}
                    className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl text-white text-xl font-bold hover:scale-105 transition-transform"
                    data-testid="button-collect"
                  >
                    💎 COLLECT {pendingPayout}
                  </button>
                  
                  <button
                    onClick={attemptDoubleOrNothing}
                    className="px-8 py-4 bg-gradient-to-r from-red-500 to-orange-600 rounded-xl text-white text-xl font-bold hover:scale-105 transition-transform"
                    data-testid="button-double"
                  >
                    🎲 DOUBLE OR NOTHING
                  </button>
                  
                  <p className="text-slate-500 text-xs text-center mt-2">
                    50/50 chance to double or lose everything!
                  </p>
                  
                  <div className="mt-4 p-3 bg-red-900/30 border border-red-500/50 rounded-lg">
                    <p className="text-red-400 text-xs text-center">
                      ⚠️ Leaving or refreshing this page will forfeit your winnings!
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
          
          {coinFlipResult === 'lose' && (
            <button
              onClick={goToModeSelect}
              className="mt-6 px-8 py-3 bg-slate-700 rounded-xl text-white font-bold hover:bg-slate-600 transition-colors"
              data-testid="button-continue-busted"
            >
              Continue
            </button>
          )}
        </div>
      )}

      {gameState === 'gameover' && selectedMode && (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 mb-2">
            RUN COMPLETE
          </h2>
          <div className="text-slate-400 mb-4">
            {MODE_CONFIGS[selectedMode].icon} {MODE_CONFIGS[selectedMode].name} ({DIFFICULTY_CONFIGS[selectedDifficulty].name})
          </div>
          
          <div className="bg-slate-800/80 rounded-xl p-6 mb-6 w-full max-w-xs">
            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-slate-300">
                <span>Base Score:</span>
                <span className="font-bold">{baseEarnings}</span>
              </div>
              <div className="flex justify-between text-purple-400">
                <span>Combo Bonus:</span>
                <span className="font-bold">+{comboBonus}</span>
              </div>
              <div className="border-t border-slate-600 pt-3">
                <div className="flex justify-between text-white text-xl">
                  <span>Final Score:</span>
                  <span className="font-bold text-cyan-400">{score}</span>
                </div>
              </div>
            </div>
            
            <div className="text-center mb-4">
              <div className={`text-2xl font-bold ${getRank(score).color}`}>
                {getRank(score).rank}
              </div>
              {score > 0 && score >= getHighScore(selectedMode) && (
                <div className="text-yellow-400 mt-2 animate-pulse">🎉 NEW HIGH SCORE!</div>
              )}
            </div>
            
            <div className="border-t border-slate-600 pt-3">
              <div className="flex justify-between text-cyan-400">
                <span>Current Quantum Chips:</span>
                <span className="font-bold">💎 {playerShards}</span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <button
              onClick={goToModeSelect}
              disabled={Math.floor(playerShards * WAGER_PERCENT) < 1}
              className={`px-8 py-4 rounded-xl text-white text-xl font-bold transition-transform ${
                Math.floor(playerShards * WAGER_PERCENT) < 1
                  ? 'bg-slate-600 cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:scale-105'
              }`}
              data-testid="button-play-again"
            >
              🎰 SPIN AGAIN (💎{Math.floor(playerShards * WAGER_PERCENT)})
            </button>
            
            <button
              onClick={goToMenu}
              className="px-8 py-4 bg-slate-700 rounded-xl text-white text-lg hover:bg-slate-600 transition-colors"
              data-testid="button-exit-casino"
            >
              Exit Casino
            </button>
          </div>
          
          <p className="text-slate-500 mt-6 text-sm">Best ({MODE_CONFIGS[selectedMode].name}): {getHighScore(selectedMode)}</p>
        </div>
      )}

      {showHelp && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setShowHelp(false)}
        >
          <div 
            className="bg-gradient-to-b from-slate-900 to-purple-950 rounded-2xl border border-purple-500/50 max-w-lg w-full max-h-[85vh] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b border-purple-500/30">
              <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
                📖 Smackzone Rules
              </h2>
              <button
                onClick={() => setShowHelp(false)}
                className="text-slate-400 hover:text-white transition-colors text-2xl"
                data-testid="button-close-help"
              >
                ✕
              </button>
            </div>
            
            <div className="overflow-y-auto p-4 space-y-4 max-h-[calc(85vh-60px)]">
              <section className="bg-slate-800/50 rounded-xl p-3 border border-amber-500/30">
                <h3 className="text-amber-400 font-bold mb-2">{GAME_RULES_CONTENT.casinoBasics.title}</h3>
                <ul className="space-y-1">
                  {GAME_RULES_CONTENT.casinoBasics.rules.map((rule, i) => (
                    <li key={i} className="text-slate-300 text-sm flex gap-2">
                      <span className="text-amber-400">•</span>
                      {rule}
                    </li>
                  ))}
                </ul>
              </section>

              <section className="bg-slate-800/50 rounded-xl p-3 border border-green-500/30">
                <h3 className="text-green-400 font-bold mb-2">{GAME_RULES_CONTENT.payoutMath.title}</h3>
                <ul className="space-y-0.5">
                  {GAME_RULES_CONTENT.payoutMath.rules.map((rule, i) => (
                    <li key={i} className={`text-sm ${rule === '' ? 'h-2' : rule.startsWith('  ') ? 'text-slate-400 ml-2' : 'text-slate-300 font-medium'}`}>
                      {rule}
                    </li>
                  ))}
                </ul>
              </section>

              <section className="bg-slate-800/50 rounded-xl p-3 border border-cyan-500/30">
                <h3 className="text-cyan-400 font-bold mb-2">{GAME_RULES_CONTENT.howToPlay.title}</h3>
                <ul className="space-y-1">
                  {GAME_RULES_CONTENT.howToPlay.rules.map((rule, i) => (
                    <li key={i} className="text-slate-300 text-sm flex gap-2">
                      <span className="text-cyan-400">•</span>
                      {rule}
                    </li>
                  ))}
                </ul>
              </section>

              <section className="bg-slate-800/50 rounded-xl p-3 border border-purple-500/30">
                <h3 className="text-purple-400 font-bold mb-2">{GAME_RULES_CONTENT.modes.title}</h3>
                <div className="space-y-2">
                  {GAME_RULES_CONTENT.modes.items.map((mode, i) => (
                    <div key={i} className="bg-slate-900/50 rounded-lg p-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{mode.icon}</span>
                        <span className="font-bold text-white text-sm">{mode.name}</span>
                      </div>
                      <p className="text-slate-400 text-xs">{mode.desc}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-slate-800/50 rounded-xl p-3 border border-pink-500/30">
                <h3 className="text-pink-400 font-bold mb-2">{GAME_RULES_CONTENT.bonuses.title}</h3>
                <ul className="space-y-1">
                  {GAME_RULES_CONTENT.bonuses.rules.map((rule, i) => (
                    <li key={i} className="text-slate-300 text-sm flex gap-2">
                      <span className="text-pink-400">•</span>
                      {rule}
                    </li>
                  ))}
                </ul>
              </section>

              <section className="bg-slate-800/50 rounded-xl p-3 border border-slate-500/30">
                <h3 className="text-slate-300 font-bold mb-2">{GAME_RULES_CONTENT.difficulty.title}</h3>
                <div className="space-y-1">
                  {GAME_RULES_CONTENT.difficulty.items.map((diff, i) => (
                    <div key={i} className="flex justify-between items-center text-sm">
                      <span className={`font-bold ${diff.color}`}>{diff.name}</span>
                      <span className="text-slate-400">{diff.desc}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-slate-800/50 rounded-xl p-3 border border-yellow-500/30">
                <h3 className="text-yellow-400 font-bold mb-2">{GAME_RULES_CONTENT.tips.title}</h3>
                <ul className="space-y-1">
                  {GAME_RULES_CONTENT.tips.rules.map((tip, i) => (
                    <li key={i} className="text-slate-300 text-sm flex gap-2">
                      <span className="text-yellow-400">💡</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </div>
        </div>
      )}

      {gameState === 'keno' && (
        <AsteroidKeno
          disabled={currencySaveError}
          saveNotice={saveNotice}
          playerShards={playerShards}
          onUpdateShards={(newShards) => {
            setPlayerShards(newShards);
            playerShardsRef.current = newShards;
            const pid = playerIdRef.current;
            if (pid) {
              saveCurrency(pid);
            }
          }}
          onExit={() => setGameState('casino_lobby')}
        />
      )}

      {gameState === 'racing' && (
        <CompanionRacing
          disabled={currencySaveError}
          saveNotice={saveNotice}
          playerShards={playerShards}
          capturedCreatures={capturedCreatures}
          onUpdateShards={(newShards) => {
            setPlayerShards(newShards);
            playerShardsRef.current = newShards;
            const pid = playerIdRef.current;
            if (pid) {
              saveCurrency(pid);
            }
          }}
          onExit={() => setGameState('casino_lobby')}
        />
      )}
    </div>
  );
}
