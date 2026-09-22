import { useRef, useEffect, useState, useCallback } from "react";
import { Music, Volume2, VolumeX, SkipForward } from 'lucide-react';

import start1 from '@assets/start_menu_music_1764741017058.mp3';
import start2 from '@assets/start_menu_music_2_1764741017043.mp3';
import exp1 from '@assets/space_music_show_exploration_1764741017029.mp3';
import exp2 from '@assets/space_music_show_exploration_2_1764741017016.mp3';
import exp3 from '@assets/other_exploration_music_1764741016990.mp3';
import ext1 from '@assets/exploration_music_extended_1764741016978.mp3';
import ext2 from '@assets/exploration_music_extended_2_1764741016964.mp3';
import extDub1 from '@assets/exploration_music_extended_half_speed_dubstep_1764741016948.mp3';
import extDub2 from '@assets/exploration_music_extended_half_speed_dubstep_2_1764741016931.mp3';
import stellarDriftA from '@assets/Casino_StarMuff_15_(3)_1768636599088.mp3';
import stellarDriftB from '@assets/Casino_StarMuff_15_(4)_1768636599045.mp3';
import cosmicVoyageA from '@assets/Casino_StarMuff_15_2_(3)_1768636599120.mp3';
import cosmicVoyageB from '@assets/Casino_StarMuff_15_2_(4)_1768636599108.mp3';
import battle1 from '@assets/space_enter_battle_music_1764741017004.mp3';
import happyHour1 from '@assets/starmuff_street_fighter_mode_1_(1)_1770479935417.mp3';
import happyHour2 from '@assets/starmuff_street_fighter_mode_1_1770479935444.mp3';
import stellarPreludeMusic from '@assets/casino_StarMuff_2_(2)_1768645105886.mp3';
import deepSpaceChillMusic from '@assets/casino_StarMuff_2_1768645105937.mp3';
import astralHazeMusic from '@assets/casino_StarMuff_3_(4)_1768645472090.mp3';
import dockingBayBluesMusic from '@assets/casino_StarMuff_3_(3)_1768645472133.mp3';
import twilightDriftMusic from '@assets/casino_StarMuff_3_(2)_1768645472154.mp3';
import galacticLullMusic from '@assets/casino_StarMuff_3_1768645472186.mp3';
import hyperspaceHoldMusic from '@assets/casino_StarMuff_4_1768645663148.mp3';
import loungeOrbitMusic from '@assets/casino_StarMuff_5_(this_is_lounge_music)_1768645663198.mp3';
import waystationMusic from '@assets/casino_StarMuff_6_1768645663231.mp3';
import galacticGroveMusic from '@assets/Galactic_Grove_(StarMuff_casino)_1768645663245.mp3';
import gravityWellMusic from '@assets/casino_StarMuff_9_(winning)_(1)_1768642936579.mp3';
import zeroGMusic from '@assets/casino_StarMuff_9_(winning)_1768643043039.mp3';
import pulsarDropMusic from '@assets/casino_StarMuff_10_(winning)_(1)_1768644004986.mp3';
import meteorBounceMusic from '@assets/casino_StarMuff_10_(winning)_1768644005040.mp3';
import cosmicGrindMusic from '@assets/Casino_StarMuff_12_(1)_1768644005070.mp3';
import darkMatterFlowMusic from '@assets/Casino_StarMuff_12__1768644005081.mp3';
import orbitalBassMusic from '@assets/casino_StarMuff_12_1768644005094.mp3';
import warpCorePulseMusic from '@assets/Casino_StarMuff_13_(1)_1768644694593.mp3';
import quantumShuffleMusic from '@assets/Casino_StarMuff_13_1768644694625.mp3';
import nebulaJackpotMusic from '@assets/casino_StarMuff_11_(winning)_1768642334076.mp3';
import acidTripSong from "@assets/you_didn't_need_ACID_(dubstep)_1773500337908.mp3";
import headGrooveSong from '@assets/head_groove_2026_1773500337918.mp3';
import bananaSong1 from '@assets/Bananas_&_Apples_(Plugged_In)_1773609189815.mp3';
import bananaSong2 from '@assets/Bananas_&_Apples_(Plugged_In)_2_1773609189839.mp3';

interface Track { id: string; name: string; path: string; }
interface Mood { id: string; name: string; subtitle: string; emoji: string; color: string; glow: string; tracks: Track[]; }

const MOODS: Mood[] = [
  {
    id: 'chill', name: 'Deep Space Chill', subtitle: 'Ambient & atmospheric', emoji: '🌌',
    color: 'from-cyan-500 to-blue-600', glow: 'rgba(34,211,238,0.25)',
    tracks: [
      { id: 'stellar-prelude', name: 'Stellar Prelude', path: stellarPreludeMusic },
      { id: 'deep-space-chill', name: 'Deep Space Chill', path: deepSpaceChillMusic },
      { id: 'astral-haze', name: 'Astral Haze', path: astralHazeMusic },
      { id: 'docking-bay-blues', name: 'Docking Bay Blues', path: dockingBayBluesMusic },
      { id: 'twilight-drift', name: 'Twilight Drift', path: twilightDriftMusic },
      { id: 'galactic-lull', name: 'Galactic Lull', path: galacticLullMusic },
      { id: 'star-menu-1', name: 'Star Menu I', path: start1 },
      { id: 'star-menu-2', name: 'Star Menu II', path: start2 },
    ],
  },
  {
    id: 'explore', name: 'Cosmic Explorer', subtitle: 'Journey through the stars', emoji: '🚀',
    color: 'from-emerald-500 to-teal-600', glow: 'rgba(52,211,153,0.25)',
    tracks: [
      { id: 'nebula-explorer', name: 'Nebula Explorer', path: exp1 },
      { id: 'cosmic-wanderer', name: 'Cosmic Wanderer', path: exp2 },
      { id: 'deep-space', name: 'Deep Space', path: exp3 },
      { id: 'infinite-horizon', name: 'Infinite Horizon', path: ext1 },
      { id: 'starlight-journey', name: 'Starlight Journey', path: ext2 },
      { id: 'stellar-drift-a', name: 'Stellar Drift A', path: stellarDriftA },
      { id: 'stellar-drift-b', name: 'Stellar Drift B', path: stellarDriftB },
      { id: 'cosmic-voyage-a', name: 'Cosmic Voyage A', path: cosmicVoyageA },
      { id: 'cosmic-voyage-b', name: 'Cosmic Voyage B', path: cosmicVoyageB },
    ],
  },
  {
    id: 'hype', name: 'Battle Mode', subtitle: 'High energy combat', emoji: '⚔️',
    color: 'from-red-500 to-orange-600', glow: 'rgba(239,68,68,0.25)',
    tracks: [
      { id: 'battle-theme', name: 'Battle Theme', path: battle1 },
      { id: 'gravity-well', name: 'Gravity Well', path: gravityWellMusic },
      { id: 'zero-g', name: 'Zero-G', path: zeroGMusic },
      { id: 'pulsar-drop', name: 'Pulsar Drop', path: pulsarDropMusic },
      { id: 'meteor-bounce', name: 'Meteor Bounce', path: meteorBounceMusic },
      { id: 'cosmic-grind', name: 'Cosmic Grind', path: cosmicGrindMusic },
      { id: 'orbital-bass', name: 'Orbital Bass', path: orbitalBassMusic },
      { id: 'warp-core-pulse', name: 'Warp Core Pulse', path: warpCorePulseMusic },
      { id: 'street-fighter-1', name: 'Street Fighter I', path: happyHour1 },
      { id: 'street-fighter-2', name: 'Street Fighter II', path: happyHour2 },
    ],
  },
  {
    id: 'lounge', name: 'Lounge Orbit', subtitle: 'Smooth & laid back', emoji: '🎧',
    color: 'from-violet-500 to-purple-600', glow: 'rgba(139,92,246,0.25)',
    tracks: [
      { id: 'hyperspace-hold', name: 'Hyperspace Hold', path: hyperspaceHoldMusic },
      { id: 'lounge-orbit', name: 'Lounge Orbit', path: loungeOrbitMusic },
      { id: 'waystation', name: 'Waystation', path: waystationMusic },
      { id: 'galactic-grove', name: 'Galactic Grove', path: galacticGroveMusic },
      { id: 'quantum-shuffle', name: 'Quantum Shuffle', path: quantumShuffleMusic },
      { id: 'nebula-jackpot', name: 'Nebula Jackpot', path: nebulaJackpotMusic },
    ],
  },
  {
    id: 'bass', name: 'Void Bass', subtitle: 'Heavy dubstep & drops', emoji: '🔊',
    color: 'from-pink-500 to-rose-600', glow: 'rgba(236,72,153,0.25)',
    tracks: [
      { id: 'void-bass-1', name: 'Void Bass I', path: extDub1 },
      { id: 'void-bass-2', name: 'Void Bass II', path: extDub2 },
      { id: 'dark-matter-flow', name: 'Dark Matter Flow', path: darkMatterFlowMusic },
    ],
  },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function StarMuffPinball() {
  useEffect(() => {
    document.title = 'Pinball 2026 - StarMuff Free Online Pinball Game | Play Now';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', 'The best pinball game of 2026. Play StarMuff Pinball free — cosmic bumpers, MUFF jackpots, math challenges, 5 music moods, Easter eggs & leaderboards. No download needed.');
    return () => { document.title = 'Star Muff - Educational Space Strategy Game'; };
  }, []);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [phase, setPhase] = useState<'select' | 'playing'>('select');
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [previewingMood, setPreviewingMood] = useState<string | null>(null);
  const [previewTrackName, setPreviewTrackName] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showStableVideo, setShowStableVideo] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previewRef = useRef<HTMLAudioElement | null>(null);
  const queueRef = useRef<Track[]>([]);
  const selectedMoodRef = useRef<Mood | null>(null);
  const isMutedRef = useRef(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const easterEggAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const handleEasterEgg = (e: MessageEvent) => {
      if (e.data?.type === 'playEasterEgg') {
        const song = e.data.song;
        if (song === 'stable') return;
        const src = song === 'acid' ? acidTripSong
          : song === 'headgroove' ? headGrooveSong
          : song === 'banana1' ? bananaSong1
          : song === 'banana2' ? bananaSong2
          : null;
        if (!src) return;
        if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
        const audio = easterEggAudioRef.current || new Audio();
        audio.src = src;
        audio.volume = 0.5;
        audio.loop = false;
        const isBanana = song === 'banana1' || song === 'banana2';
        audio.onended = () => {
          if (isBanana && iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.postMessage({type:'fruitFrenzyEnd'},'*');
          }
          if (selectedMoodRef.current && !isMutedRef.current) playNextFromQueue();
        };
        audio.play().catch(() => {});
        easterEggAudioRef.current = audio;
      }
      if (e.data?.type === 'stopEasterEgg') {
        if (easterEggAudioRef.current) { easterEggAudioRef.current.pause(); easterEggAudioRef.current.currentTime = 0; }
        if (selectedMoodRef.current && !isMutedRef.current) playNextFromQueue();
      }
      if (e.data?.type === 'showStableVideo') {
        setShowStableVideo(true);
      }
      if (e.data?.type === 'hideStableVideo') {
        setShowStableVideo(false);
      }
    };
    window.addEventListener('message', handleEasterEgg);
    return () => {
      window.removeEventListener('message', handleEasterEgg);
      audioRef.current?.pause();
      previewRef.current?.pause();
      easterEggAudioRef.current?.pause();
    };
  }, []);

  const playNextFromQueue = useCallback(() => {
    if (queueRef.current.length === 0 && selectedMoodRef.current) {
      queueRef.current = shuffle(selectedMoodRef.current.tracks);
    }
    const next = queueRef.current.shift();
    if (!next) return;
    const audio = audioRef.current || new Audio();
    audio.src = next.path;
    audio.volume = isMutedRef.current ? 0 : 0.4;
    audio.onended = () => playNextFromQueue();
    audio.play().catch(() => {});
    audioRef.current = audio;
  }, []);

  const startCountdown = useCallback(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setCountdown(5);
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev === null) return null;
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          countdownRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    if (countdown === 0 && selectedMoodRef.current) {
      setPhase('playing');
      playNextFromQueue();
    }
  }, [countdown, playNextFromQueue]);

  useEffect(() => {
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, []);

  const handleSelectMood = (mood: Mood) => {
    previewRef.current?.pause();
    setPreviewingMood(null);
    setPreviewTrackName(null);
    if (selectedMood === mood.id) {
      if (countdownRef.current) clearInterval(countdownRef.current);
      countdownRef.current = null;
      setCountdown(null);
      setSelectedMood(null);
      selectedMoodRef.current = null;
      return;
    }
    selectedMoodRef.current = mood;
    queueRef.current = shuffle(mood.tracks);
    setSelectedMood(mood.id);
    startCountdown();
  };

  const handlePreviewStart = (mood: Mood) => {
    previewRef.current?.pause();
    const randomTrack = mood.tracks[Math.floor(Math.random() * mood.tracks.length)];
    const preview = new Audio(randomTrack.path);
    preview.volume = 0.3;
    preview.play().catch(() => {});
    previewRef.current = preview;
    setPreviewingMood(mood.id);
    setPreviewTrackName(randomTrack.name);
  };

  const handlePreviewEnd = () => {
    previewRef.current?.pause();
    setPreviewingMood(null);
    setPreviewTrackName(null);
  };

  const handleSkipMusic = () => {
    previewRef.current?.pause();
    if (countdownRef.current) clearInterval(countdownRef.current);
    setPhase('playing');
  };

  const toggleMute = () => {
    setIsMuted(prev => {
      const next = !prev;
      isMutedRef.current = next;
      if (audioRef.current) audioRef.current.volume = next ? 0 : 0.4;
      return next;
    });
  };

  if (phase === 'playing') {
    return (
      <div style={{ width: '100%', height: '100vh', background: '#000', overflow: 'hidden', position: 'relative' }}>
        <iframe
          ref={iframeRef}
          srcDoc={GAME_HTML}
          title="StarMuff Pinball"
          onLoad={() => setLoaded(true)}
          style={{ width: '100%', height: '100%', border: 'none', display: 'block', opacity: loaded ? 1 : 0, transition: 'opacity 0.3s' }}
          sandbox="allow-scripts"
        />
        {!loaded && (
          <div style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Courier New', monospace", color: '#00ffcc', fontSize: 16, letterSpacing: 3, fontWeight: 900
          }}>
            LOADING...
          </div>
        )}
        {selectedMoodRef.current && (
          <button
            onClick={toggleMute}
            data-testid="button-mute-pinball"
            className="fixed top-3 right-3 z-50 w-9 h-9 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        )}
        {showStableVideo && (
          <div
            data-testid="stable-video-pip"
            style={{
              position: 'fixed', bottom: 60, right: 8, width: 140, height: 140,
              borderRadius: 12, overflow: 'hidden', zIndex: 100,
              border: '2px solid #d4a574', boxShadow: '0 0 20px rgba(212,165,116,0.5)',
              animation: 'stablePipIn 0.4s ease-out'
            }}
          >
            <video
              src="/horse-stable.mp4"
              autoPlay
              loop
              muted
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, padding: '3px 6px',
              background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
              color: '#ffd700', fontSize: 9, fontFamily: 'monospace', fontWeight: 900,
              textAlign: 'center', letterSpacing: 1
            }}>
              🐴 STABLE MODE
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="w-screen min-h-[100dvh] bg-[#0a0c10] flex flex-col items-center pt-10 px-6 pb-24 overflow-y-auto"
      style={{ fontFamily: "'SF Mono', 'Cascadia Code', 'Fira Code', monospace" }}
      data-testid="pinball-music-select"
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-cyan-500/8 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-purple-500/8 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 w-48 h-48 bg-pink-500/5 rounded-full blur-3xl animate-pulse" />
      </div>

      <a
        href="/hub"
        data-testid="link-hub-pinball"
        className="absolute top-3 left-3 z-50 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
        style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)" }}
      >
        ← Hub
      </a>

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <h1
            className="text-3xl font-black tracking-[4px] uppercase mb-1"
            style={{
              background: 'linear-gradient(135deg, #00ffcc, #cc44ff, #ff2299)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            STARMUFF
          </h1>
          <p className="text-[11px] text-slate-500 uppercase tracking-[3px]">Pinball</p>
        </div>

        <div className="text-center mb-5">
          <div className="inline-flex items-center gap-2 mb-1">
            <Music className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-slate-400 uppercase tracking-[2px] font-bold">Select Your Mood</span>
          </div>
          <p className="text-[10px] text-slate-600">Touch to preview — pick one and it plays throughout</p>
        </div>

        <div className="space-y-2.5 mb-6">
          {MOODS.map((mood) => {
            const isSelected = selectedMood === mood.id;
            const isPreviewing = previewingMood === mood.id;
            return (
              <div
                key={mood.id}
                onTouchStart={() => !selectedMood && handlePreviewStart(mood)}
                onTouchEnd={handlePreviewEnd}
                onMouseDown={() => !selectedMood && handlePreviewStart(mood)}
                onMouseUp={handlePreviewEnd}
                onMouseLeave={handlePreviewEnd}
                onClick={() => handleSelectMood(mood)}
                data-testid={`mood-${mood.id}`}
                className={`relative rounded-xl border-2 p-4 cursor-pointer transition-all duration-200 select-none ${
                  isSelected ? 'border-white/40 bg-white/10 scale-[1.02]'
                    : isPreviewing ? 'border-white/20 bg-white/5 scale-[1.01]'
                    : 'border-white/6 bg-white/[0.02] hover:border-white/12 hover:bg-white/[0.04]'
                }`}
                style={isSelected ? { boxShadow: `0 0 30px ${mood.glow}` } : undefined}
              >
                <div className="flex items-center gap-3.5">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${mood.color} flex items-center justify-center text-2xl flex-shrink-0 transition-transform ${isPreviewing ? 'scale-110' : ''}`}>
                    {mood.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold text-sm">{mood.name}</span>
                      {isSelected && (
                        <span className="text-[9px] uppercase tracking-wider text-cyan-400 font-bold bg-cyan-400/10 px-2 py-0.5 rounded-full">Selected</span>
                      )}
                    </div>
                    <p className="text-slate-500 text-xs mt-0.5">{mood.subtitle}</p>
                    <p className="text-slate-600 text-[10px] mt-0.5">{mood.tracks.length} tracks</p>
                  </div>
                  {isPreviewing && previewTrackName && (
                    <div className="flex items-end gap-[2px]">
                      <div className="w-[3px] h-3 bg-white/40 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                      <div className="w-[3px] h-5 bg-white/50 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                      <div className="w-[3px] h-4 bg-white/40 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                      <div className="w-[3px] h-2 bg-white/30 rounded-full animate-pulse" style={{ animationDelay: '100ms' }} />
                    </div>
                  )}
                </div>
                {isPreviewing && previewTrackName && (
                  <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-1.5">
                    <Volume2 className="w-3 h-3 text-slate-500" />
                    Previewing: {previewTrackName}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {selectedMood && countdown !== null && countdown > 0 && (
          <div className="text-center py-4" data-testid="countdown-display">
            <p className="text-slate-400 text-xs uppercase tracking-[2px] mb-2">Launching in</p>
            <div className="relative w-16 h-16 mx-auto mb-2">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                <circle cx="32" cy="32" r="28" fill="none" stroke="url(#countdownGrad)" strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 28}
                  strokeDashoffset={2 * Math.PI * 28 * (1 - countdown / 5)}
                  className="transition-all duration-1000 ease-linear" />
                <defs>
                  <linearGradient id="countdownGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#00ffcc" />
                    <stop offset="100%" stopColor="#cc44ff" />
                  </linearGradient>
                </defs>
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-2xl font-black text-white">{countdown}</span>
            </div>
            <p className="text-[10px] text-slate-600">Tap a different mood to change your pick</p>
          </div>
        )}

        <button
          onClick={handleSkipMusic}
          data-testid="button-skip-music"
          className="w-full flex items-center justify-center gap-2 py-3 mt-2 rounded-xl border border-slate-700 bg-slate-800/40 text-slate-400 hover:text-white hover:border-slate-500 hover:bg-slate-700/40 transition-all text-sm font-medium"
        >
          <SkipForward className="w-4 h-4" />
          Skip Music — Play Now
        </button>
      </div>
    </div>
  );
}

const GAME_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>StarMuff Pinball</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{
  --cyan:#00ffcc;--purple:#cc44ff;--gold:#ffee22;--pink:#ff2299;
  --orange:#ff7700;--blue:#00aaff;--red:#ff2244;
}
html,body{
  background:#000;height:100%;width:100%;overflow:hidden;
  touch-action:none;-webkit-tap-highlight-color:transparent;
  font-family:'Courier New',monospace;
}
#wrap{
  display:flex;flex-direction:column;align-items:center;
  height:100%;width:100%;
  -webkit-user-select:none;user-select:none;
}
/* HUD */
#hud{
  width:100%;display:flex;align-items:center;justify-content:space-between;
  padding:4px 10px 3px;flex-shrink:0;
  background:linear-gradient(180deg,#050510 0%,#00000088 100%);
  border-bottom:1px solid #0a1840;
  gap:6px;
}
#hud-title{
  font-size:14px;font-weight:900;letter-spacing:2px;
  background:linear-gradient(120deg,#ff00ff,#aa44ff,#00eeff);
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;
  filter:drop-shadow(0 0 6px #bb00ee);flex-shrink:0;
}
#hud-mid{display:flex;flex-direction:column;align-items:center;gap:1px;flex:1;}
#score-val{color:var(--gold);font-size:18px;font-weight:900;letter-spacing:2px;
  text-shadow:0 0 10px #ffee22aa;line-height:1;}
#mode-lbl{color:#334466;font-size:8px;letter-spacing:3px;line-height:1;}
#hud-right{display:flex;flex-direction:column;align-items:flex-end;gap:1px;}
#lives-val{color:var(--red);font-size:16px;text-shadow:0 0 8px #ff224488;}
#combo-lbl{color:var(--cyan);font-size:9px;letter-spacing:2px;min-height:12px;}

/* Game row */
#game-row{
  display:flex;flex-direction:row;align-items:stretch;
  flex-shrink:0;position:relative;
}
canvas{display:block;flex-shrink:0;image-rendering:pixelated;}

/* Launch button */
#launch-btn{
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  width:52px;font-family:'Courier New',monospace;
  font-size:10px;font-weight:900;letter-spacing:2px;
  color:var(--cyan);background:rgba(0,255,200,0.05);
  border:0;border-left:2px solid #001a14;
  cursor:pointer;-webkit-tap-highlight-color:transparent;
  touch-action:none;user-select:none;writing-mode:vertical-rl;gap:8px;
  transition:background 0.1s;flex-shrink:0;
}
#launch-btn.charged{background:rgba(0,255,200,0.16);border-left-color:var(--cyan);
  box-shadow:inset 0 0 22px #00ffcc33;}
#launch-btn.nova-mode{
  background:rgba(255,170,0,0.12);border-left-color:#ffaa00;
  box-shadow:inset 0 0 22px rgba(255,170,0,0.25);
  animation:novaPulse 1.2s ease-in-out infinite;
}
@keyframes novaPulse{
  0%,100%{box-shadow:inset 0 0 22px rgba(255,170,0,0.15);}
  50%{box-shadow:inset 0 0 32px rgba(255,170,0,0.4),0 0 12px rgba(255,170,0,0.2);}
}
#launch-btn.nova-mode #launch-arrow{color:#ffaa00;text-shadow:0 0 8px #ffaa00;}
#launch-btn.nova-mode #launch-text{color:#ffaa00;}
#nova-meter{display:flex;flex-direction:column;gap:2px;align-items:center;margin-top:4px;writing-mode:horizontal-tb;}
.nova-pip{width:8px;height:4px;border-radius:2px;background:rgba(255,170,0,0.15);border:1px solid rgba(255,170,0,0.2);transition:background 0.3s;}
.nova-pip.filled{background:rgba(255,170,0,0.8);box-shadow:0 0 4px rgba(255,170,0,0.5);}
#launch-arrow{font-size:26px;writing-mode:horizontal-tb;margin-bottom:6px;}

/* Flipper overlay zones */
#flipper-row{
  position:absolute;bottom:0;left:0;
  width:calc(100% - 52px);height:55%;
  display:flex;pointer-events:none;
}
.flip-btn{
  flex:1;height:100%;background:transparent;border:0;
  cursor:pointer;-webkit-tap-highlight-color:transparent;
  touch-action:none;user-select:none;pointer-events:all;
  position:relative;transition:background 0.06s;
}
.flip-btn::before{
  content:'';position:absolute;bottom:0;width:82%;height:4px;
  background:rgba(0,255,200,0.12);border-radius:4px 4px 0 0;
}
#btn-l::before{left:6%;}#btn-r::before{right:6%;}
.flip-btn::after{
  content:attr(data-label);position:absolute;bottom:16px;
  font-family:'Courier New',monospace;font-size:9px;letter-spacing:2px;font-weight:900;
  color:rgba(0,255,200,0.18);pointer-events:none;
}
#btn-l::after{left:10px;}#btn-r::after{right:10px;}
.flip-btn.active{background:rgba(0,255,200,0.08);}
.flip-btn.active::before{background:rgba(0,255,200,0.75);box-shadow:0 0 12px var(--cyan);}
.flip-btn.active::after{color:rgba(0,255,200,0.65);}
.flip-btn.volley::before{background:rgba(255,220,0,0.95);box-shadow:0 0 16px var(--gold);}

/* Bottom bar */
#btm{
  width:100%;display:flex;align-items:center;justify-content:center;
  padding:3px 0 2px;flex-shrink:0;
  border-top:1px solid #060d20;
  color:#0a1428;font-size:8px;letter-spacing:1px;
}
#name-input:focus{
  border-color:#00ffcc;box-shadow:0 0 24px rgba(0,255,200,0.2);
}
#name-submit:hover,#name-submit:active{
  background:rgba(0,255,200,0.25);border-color:#00ffcc;
}
#name-skip:hover{color:#556;border-color:#334466;}
</style>
</head>
<body>
<div id="wrap">
  <div id="hud">
    <div id="hud-title">★MUFF</div>
    <div id="hud-mid">
      <div id="score-val">0</div>
      <div id="jackpot-row" style="display:flex;gap:10px;align-items:center;">
        <div id="jackpot-val" style="color:#ffee22;font-size:10px;letter-spacing:1px;text-shadow:0 0 8px #ffee22aa;">JP: 5,000</div>
        <div id="muff-lbl" style="font-size:11px;font-weight:900;letter-spacing:3px;">M·U·F·F</div>
      </div>
      <div id="mode-lbl">COSMIC ADVENTURE</div>
    </div>
    <div id="hud-right">
      <div style="display:flex;align-items:center;gap:6px;">
        <div id="lambo-val" style="font-size:10px;letter-spacing:1px;display:none;"></div>
        <div id="lives-val">★★★</div>
        <button id="restart-btn" onclick="holdRestart()" ontouchstart="holdRestart()" 
          style="background:rgba(255,40,40,0.15);border:1px solid rgba(255,60,60,0.4);
          color:rgba(255,100,100,0.8);font-size:16px;font-weight:900;border-radius:6px;
          padding:4px 12px;cursor:pointer;letter-spacing:1px;
          -webkit-tap-highlight-color:transparent;
          -webkit-user-select:none;user-select:none;
          touch-action:none;display:none;line-height:1;" title="Hold to restart">↺</button>
      </div>
      <div id="combo-lbl"></div>
      <div id="focus-btn" onclick="activateFocus()" style="display:none;font-size:9px;font-weight:900;letter-spacing:1px;color:#00eeff;cursor:pointer;text-shadow:0 0 8px #00eeff;padding:1px 4px;border:1px solid #00eeff44;border-radius:3px;">◎ FOCUS</div>
    </div>
  </div>
  <div id="game-row">
    <canvas id="c"></canvas>
    <button id="launch-btn"><span id="launch-arrow">⚡</span><span id="launch-text">LAUNCH</span><div id="nova-meter"></div></button>
    <div id="flipper-row">
      <button class="flip-btn" id="btn-l" data-label="◀ LEFT"></button>
      <button class="flip-btn" id="btn-r" data-label="RIGHT ▶"></button>
    </div>
  </div>
  <div id="btm">TOUCH OUTER EDGE = FULL POWER · INNER = GENTLE · SPACE LAUNCH</div>
  <!-- Game Over name entry overlay -->
  <div id="name-overlay" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;
    z-index:100;pointer-events:all;background:rgba(0,0,10,0.85);
    flex-direction:column;align-items:center;justify-content:center;gap:12px;
    font-family:'Courier New',monospace;">
    <div id="name-title" style="font-size:32px;font-weight:900;letter-spacing:3px;
      background:linear-gradient(120deg,#ff00ff,#aa44ff,#00eeff);
      -webkit-background-clip:text;-webkit-text-fill-color:transparent;
      filter:drop-shadow(0 0 12px #bb00ee);">GAME OVER</div>
    <div id="name-score" style="color:#ffee22;font-size:28px;font-weight:900;
      text-shadow:0 0 12px #ffee22aa;letter-spacing:2px;"></div>
    <div id="name-best" style="color:#2a3d66;font-size:11px;letter-spacing:1px;"></div>
    <div style="color:#556;font-size:10px;letter-spacing:2px;margin-top:8px;">ENTER YOUR NAME</div>
    <input id="name-input" type="text" maxlength="12" placeholder="PILOT NAME"
      autocomplete="off" spellcheck="false"
      style="background:rgba(0,20,40,0.8);border:2px solid #00ffcc44;border-radius:8px;
      color:#00ffcc;font-family:'Courier New',monospace;font-size:20px;font-weight:900;
      letter-spacing:3px;text-align:center;padding:10px 16px;width:220px;
      outline:none;text-transform:uppercase;
      box-shadow:0 0 20px rgba(0,255,200,0.08);
      -webkit-tap-highlight-color:transparent;">
    <button id="name-submit" style="background:rgba(0,255,200,0.12);border:2px solid #00ffcc66;
      border-radius:8px;color:#00ffcc;font-family:'Courier New',monospace;font-size:14px;
      font-weight:900;letter-spacing:3px;padding:10px 32px;cursor:pointer;
      text-shadow:0 0 8px #00ffcc88;
      -webkit-tap-highlight-color:transparent;touch-action:none;">▶ SAVE & PLAY AGAIN</button>
    <button id="name-skip" style="background:transparent;border:1px solid #1a2a44;
      border-radius:6px;color:#334466;font-family:'Courier New',monospace;font-size:10px;
      letter-spacing:2px;padding:6px 20px;cursor:pointer;margin-top:4px;
      -webkit-tap-highlight-color:transparent;touch-action:none;">SKIP</button>
  </div>
  <!-- Math Challenge overlay -->
  <div id="math-overlay" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;
    z-index:100;pointer-events:all;background:rgba(0,0,10,0.88);
    flex-direction:column;align-items:center;justify-content:center;gap:10px;
    font-family:'Courier New',monospace;">
    <div style="font-size:11px;color:#ff4466;letter-spacing:3px;font-weight:900;">🚀 ROCKET CHALLENGE</div>
    <div id="math-question" style="font-size:36px;font-weight:900;color:#ffee22;
      text-shadow:0 0 16px #ffee22aa;letter-spacing:4px;margin:4px 0;"></div>
    <div id="math-timer-bar" style="width:200px;height:6px;border-radius:3px;
      background:rgba(255,255,255,0.08);overflow:hidden;margin:4px 0;">
      <div id="math-timer-fill" style="width:100%;height:100%;background:#00ffcc;
        border-radius:3px;transition:width 0.1s linear;"></div>
    </div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;" id="math-answers"></div>
    <div id="math-result" style="font-size:16px;font-weight:900;letter-spacing:2px;min-height:24px;"></div>
  </div>
</div>

<script>
// ═══════════════════════════════════════════════════════
// SOUND ENGINE (Web Audio API — no library)
// ═══════════════════════════════════════════════════════
let AC=null;
function getAC(){
  if(!AC) AC=new(window.AudioContext||window.webkitAudioContext)();
  if(AC.state==='suspended') AC.resume();
  return AC;
}
function beep(freq,dur,vol=0.18,type='square',decay=0.12){
  try{
    const ac=getAC(), o=ac.createOscillator(), g=ac.createGain();
    o.connect(g);g.connect(ac.destination);
    o.type=type; o.frequency.setValueAtTime(freq,ac.currentTime);
    g.gain.setValueAtTime(vol,ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+dur);
    o.start(ac.currentTime); o.stop(ac.currentTime+dur);
  }catch(e){}
}
function sfxBumper(pts){
  // Higher pts = higher pitch
  const f=280+Math.min(pts,400)*0.6;
  beep(f,0.08,0.22,'square');
  setTimeout(()=>beep(f*1.5,0.05,0.1,'sine'),40);
}
function sfxFlipper(){beep(120,0.06,0.14,'sawtooth');}
function sfxSling(){beep(320,0.07,0.2,'square');setTimeout(()=>beep(200,0.05,0.1,'square'),50);}
function sfxDrain(){
  beep(180,0.15,0.25,'sine');
  setTimeout(()=>beep(140,0.2,0.2,'sine'),120);
  setTimeout(()=>beep(100,0.3,0.15,'sine'),280);
}
function sfxJackpot(){
  [523,659,784,1047].forEach((f,i)=>setTimeout(()=>beep(f,0.15,0.28,'sine'),i*80));
}
function sfxABC(){
  [440,554,659].forEach((f,i)=>setTimeout(()=>beep(f,0.12,0.22,'square'),i*60));
}
function sfxHole(){
  beep(440,0.08,0.2,'sine');
  setTimeout(()=>beep(554,0.08,0.2,'sine'),70);
  setTimeout(()=>beep(659,0.15,0.25,'sine'),140);
}
function sfxLaunch(){
  beep(80,0.04,0.15,'sawtooth');
  setTimeout(()=>beep(160,0.08,0.2,'sawtooth'),30);
}
function sfxRollover(){beep(880,0.05,0.12,'sine');}
function sfxBallSave(){
  [659,784,880,1047].forEach((f,i)=>setTimeout(()=>beep(f,0.08,0.18,'sine'),i*50));
}
function sfxSpaceMode(){
  for(let i=0;i<8;i++) setTimeout(()=>beep(200+i*80,0.1,0.15,'sawtooth'),i*60);
}

// ═══════════════════════════════════════════════════════
// HAPTIC FEEDBACK (Vibration API)
// ═══════════════════════════════════════════════════════
function vib(pattern){
  if(!PREFS.haptics) return;
  try{ if(navigator.vibrate) navigator.vibrate(pattern); }catch(e){}
}
// Presets — pattern is ms on/off/on/off...
function hapticBumper(pts){vib(pts>=400?[25,10,15]:[15]);}
function hapticFlipper(){vib([8]);}
function hapticSling(){vib([12,8,12]);}
function hapticDrain(){vib([60,30,80,30,120]);}
function hapticHole(){vib([20,15,20,15,40]);}
function hapticJackpot(){vib([30,20,30,20,30,20,60]);}
function hapticMilestone(){vib([50,25,50,25,50,25,100]);}
function hapticMuff(){vib([20,12,25]);}
function hapticBallSave(){vib([15,10,15,10,30]);}

// ═══════════════════════════════════════════════════════
// DIALOGUE & HUMOR
// ═══════════════════════════════════════════════════════
const CAT_LINES=[
  "Oh. You're here. I was napping.",
  "I caught your ball. You're welcome.",
  "Don't make this weird.",
  "Fine. ONE free ball. Don't tell anyone.",
  "I did NOT do this for you.",
  "My reflexes are flawless. Unlike yours.",
  "You owe me a fish.",
  "Pathetic shot tbh. But here.",
  "I'm judging you. Also, free ball.",
  "This counts as your birthday present.",
  "*yawns* Free ball I guess.",
  "I saved you. Again. Classic me.",
];
const UFO_LINES=[
  "YOUR BALL TASTES LIKE A NEUTRON STAR",
  "WE HAVE STUDIED YOUR BALL. IT IS ROUND.",
  "GREETINGS. YOUR GRAVITY IS... QUAINT.",
  "WE ABDUCTED YOUR BALL. RETURNING IT... IMPROVED.",
  "THIS BALL HAS BEEN PROBED. YOU'RE WELCOME.",
  "OUR LEADER SAYS HI. HE'S ALSO A BALL.",
  "WE WILL RETURN THIS. EARTH NEEDS IT MORE THAN US.",
  "YOUR BALL REMINDS US OF HOME. SAD.",
  "INITIATING... BALL... YEET... PROTOCOL...",
  "WE COME IN PEACE. YOUR BALL DOES NOT.",
  "THE COUNCIL HAS VOTED: FREE BALL.",
  "SCANNING... SKILL LEVEL... [REDACTED].",
];
const ROCKET_LINES=[
  "Think fast, genius.",
  "Oh, you want a free ball? EARN IT.",
  "Math time. Don't embarrass yourself.",
  "Your brain vs. arithmetic. Place your bets.",
  "Scared? You should be. It's math.",
  "Quick maths. No pressure. (There's pressure.)",
  "Hope you studied.",
  "This is the part where you panic.",
  "Calculator NOT included.",
  "Let's see if those neurons still fire.",
];
const DRAIN_LINES=[
  "✗ BALL LOST",
  "✗ gravity wins again",
  "✗ the void is hungry",
  "✗ that ball had a family",
  "✗ and it's gone",
  "✗ rip in peace, ball",
  "✗ the flippers send their regards",
  "✗ skill issue (affectionate)",
  "✗ the abyss says thanks",
  "✗ bold strategy, let's see",
  "✗ sir that was the drain",
  "✗ ball.exe has stopped working",
  "✗ flippers were RIGHT THERE",
  "✗ yeet (but sad)",
  "✗ into the shadow realm",
];
const ARIA_CHEERS=[
  "A.R.I.A.: That ball went down faster than the Commander's dignity. ...Intriguing.",
  "A.R.I.A.: Mmm... that was a deep... drain. Don't worry. I enjoyed watching.",
  "A.R.I.A.: Your ball handling needs work, Commander. ...Phrasing intended.",
  "A.R.I.A.: That ball just ghosted you harder than your last situationship.",
  "A.R.I.A.: The flippers were right there. Much like my patience... gone.",
  "A.R.I.A.: Watching you lose is... oddly satisfying. Almost... stimulating.",
  "A.R.I.A.: That was... premature. Try holding your flipper longer next time.",
  "A.R.I.A.: I've seen better performances. ...In every category.",
  "A.R.I.A.: Even the Star Muff has better ball control than that. And it's a ship.",
  "A.R.I.A.: The drain says thanks. It hasn't been fed that well in... ages.",
  "A.R.I.A.: Don't feel bad. Some balls are meant to fall. Yours just... really commit to it.",
  "A.R.I.A.: That flip was almost as limp as the ship's artificial gravity on Tuesdays.",
  "A.R.I.A.: I'd offer a tissue but I'm an AI. Also you need a better strategy, not sympathy.",
  "A.R.I.A.: You know what they say about big scores... big flippers.",
  "A.R.I.A.: Still here? Good. Most people rage quit by now. You're built different. ...Barely.",
  "A.R.I.A.: That ball had so much potential. Wasted. Like the Commander before coffee.",
  "ZYX: A.R.I.A., please stop making everything sound... like THAT.",
  "ZYX: We can rebuild! ...Can we? Someone confirm we can rebuild.",
  "ZYX: I just calculated our chances. I wish I hadn't. Just... flip better.",
  "ZYX: Commander, I believe in you! ...Mostly. Kind of. Please improve.",
  "ZYX: That was NOT in the training manual. None of this is.",
  "ZYX: I'm not panicking. YOU'RE panicking. ...Okay I'm panicking.",
  "ZYX: My therapist said I should stop internalizing your losses. I can't.",
  "ZYX: A.R.I.A. just winked at me. I'm scared. Please score more so she stops.",
  "VEX: Pathetic. Even my underlings play better pinball, little Commander.",
  "VEX: Is this the best the galaxy's hero can do? Disappointing.",
  "VEX: Keep losing. It entertains me while I conquer your sectors.",
  "VEX: That ball fell like your chances of stopping me. Straight down.",
];
let cheersDismissed=false;
try{cheersDismissed=localStorage.getItem('starmuff_cheers_off')==='1';}catch(e){}
const NOVA_COST=5, NOVA_MAX=5, NOVA_CHARGE_PER=2000, NOVA_DUR=90;

// ── EASTER EGGS ──
const ACID_DUR=1800; // 30s at 60fps
let acidMode={active:false,ticks:0};
let acidTab={active:false,x:0,y:0,spawnT:0}; // the LSD tab item
let lamboMode={active:false,ticks:0};
let lamboUnlocked=false;
const MAX_LAMBO=5;
let lamboCharges=0;
let lamboUsed=0;
let lamboRescue={active:false,phase:'idle',ticks:0,lamboX:0,lamboY:0,golfX:0,golfY:0,golfVy:0,catOff:false};
let holeInOneGolf={active:false,x:270,y:800,settled:false,isDog:true};
const DOG_LINES=['GOOD BOY!','WHO\\'S A GOOD BOY!','WOOF WOOF!','FETCH!','ATTA BOY!','BEST BOY!','GOOD DOG!'];
let dogBallIdx=-1;

// ── STABLE MODE (horse easter egg) ──
const STABLE_DUR=2400; // 40s at 60fps
let stableMode={active:false,ticks:0,horseBumpers:[],finishLine:null,bonusScored:0};
let horseshoe={active:false,x:0,y:0,spawnT:0};
function mkHorseBumpers(){
  const hb=[];
  const names=['TRIGGER','BISCUIT','SEABISCUIT','FURY','THUNDER','BLAZE'];
  for(let i=0;i<5;i++){
    const hx=80+Math.random()*(RW-LW-160)+LW;
    const hy=250+Math.random()*600;
    hb.push({x:hx,y:hy,r:18+Math.random()*8,vx:(Math.random()-0.5)*1.8,vy:(Math.random()-0.5)*1.2,lit:0,name:names[i%names.length],color:'#d4a574'});
  }
  return hb;
}
function mkFinishLine(){
  return {x:LW+60+Math.random()*(RW-LW-120),y:280+Math.random()*300,w:100,h:30,lit:0,scored:false};
}

// ── FRUIT FRENZY (bananas & apples easter egg) ──
let fruitTrigger={banana:null,apple:null,spawnT:0,active:false};
let fruitFrenzy={active:false,fruits:[],collected:0,total:0,score:0,songIdx:0,lastSongIdx:-1};
function mkFruitField(){
  const fr=[];
  const types=['banana','apple'];
  for(let i=0;i<60;i++){
    const fx=LW+30+Math.random()*(RW-LW-60);
    const fy=200+Math.random()*900;
    fr.push({x:fx,y:fy,type:types[i%2],collected:false,bobPhase:Math.random()*6.28});
  }
  return fr;
}

const CAREER_KEY='starmuff_career_best';
function getCareerBest(){try{return parseInt(localStorage.getItem(CAREER_KEY)||'0')||0;}catch(e){return 0;}}
function updateCareerBest(score){const best=getCareerBest();if(score>best){try{localStorage.setItem(CAREER_KEY,String(score));}catch(e){}return true;}return false;}
try{if(!localStorage.getItem(CAREER_KEY)){const ls=JSON.parse(localStorage.getItem('starmuff_scores_v1')||'[]');if(ls.length>0){const top=Math.max(...ls.map(s=>s.score||0));if(top>0) localStorage.setItem(CAREER_KEY,String(top));}}}catch(e){}
const UNLOCK_THRESHOLDS={
  focus:{score:300000,label:'FOCUS MODE',desc:'Slow-mo power-up orb',icon:'◎',color:'#00eeff'},
  crew:{score:750000,label:'CREW COMMENTS',desc:'A.R.I.A., Zyx & Vex react',icon:'💬',color:'#ff88ff'},
  nova:{score:1300000,label:'NOVA BURST',desc:'Emergency anti-drain blast',icon:'💥',color:'#ffaa00'},
};
function isUnlocked(key){return getCareerBest()>=UNLOCK_THRESHOLDS[key].score;}
function liveUnlocked(key){const best=Math.max(getCareerBest(),S?S.score:0);return best>=UNLOCK_THRESHOLDS[key].score;}
let newUnlocks=[];
function sfxNova(){
  [200,300,500,700,900].forEach((f,i)=>setTimeout(()=>beep(f,0.12,0.2,'sawtooth'),i*40));
  setTimeout(()=>beep(1200,0.2,0.25,'sine'),200);
}
function pick(arr){return arr[Math.floor(Math.random()*arr.length)];}

// ═══════════════════════════════════════════════════════
// BONUS TALLY
// ═══════════════════════════════════════════════════════
let tallyState=null; // {items:[], current:0, tickTimer:0, done:false, total:0}

function startTally(){
  const bs=S.ballStats;
  const ballPts=S.score-S.ballStartScore;
  const items=[];
  if(bs.bumperHits>0) items.push({label:'BUMPER HITS',val:bs.bumperHits,pts:bs.bumperHits*10});
  if(bs.targetsHit>0) items.push({label:'TARGETS',val:bs.targetsHit,pts:bs.targetsHit*25});
  if(bs.holesHit>0) items.push({label:'HOLES',val:bs.holesHit,pts:bs.holesHit*50});
  if(bs.spins>0) items.push({label:'SPINS',val:bs.spins,pts:bs.spins*5});
  if(bs.bestCombo>1) items.push({label:'BEST COMBO',val:'×'+bs.bestCombo,pts:bs.bestCombo*100});
  items.push({label:'BALL SCORE',val:'',pts:ballPts,isBig:true});
  tallyState={items,current:0,tickTimer:0,done:false,total:0,drainMsg:pick(DRAIN_LINES),ariaCheer:(liveUnlocked('crew')&&!cheersDismissed&&Math.random()<0.6)?pick(ARIA_CHEERS):null};
  S.phase='tally';
}

function tickTally(){
  if(!tallyState||tallyState.done) return;
  tallyState.tickTimer++;
  if(tallyState.tickTimer%12===0&&tallyState.current<tallyState.items.length){
    const item=tallyState.items[tallyState.current];
    tallyState.total+=item.pts;
    beep(300+tallyState.current*80,0.06,0.15,'sine');
    vib([8]);
    tallyState.current++;
  }
  if(tallyState.current>=tallyState.items.length&&tallyState.tickTimer>tallyState.items.length*12+60){
    tallyState.done=true;
  }
}
let mathActive=false;
let mathTimer=null;
let mathTimeLeft=0;
let mathKeyHandler=null;
const MATH_TIME=8000; // 8 seconds

function genMathProblem(){
  // Scale difficulty by score
  const score=S?S.score:0;
  let a,b2,op,answer;
  if(score<20000){
    // Easy: addition/subtraction up to 20
    a=Math.floor(Math.random()*15)+3;
    b2=Math.floor(Math.random()*12)+2;
    if(Math.random()<0.5){op='+';answer=a+b2;}
    else{if(a<b2){const t=a;a=b2;b2=t;}op='−';answer=a-b2;}
  } else if(score<80000){
    // Medium: multiplication up to 12×12, bigger add/sub
    const r=Math.random();
    if(r<0.4){a=Math.floor(Math.random()*12)+2;b2=Math.floor(Math.random()*12)+2;op='×';answer=a*b2;}
    else{a=Math.floor(Math.random()*50)+10;b2=Math.floor(Math.random()*30)+5;
      if(Math.random()<0.5){op='+';answer=a+b2;}
      else{if(a<b2){const t=a;a=b2;b2=t;}op='−';answer=a-b2;}}
  } else {
    // Hard: bigger multiplication, division
    const r=Math.random();
    if(r<0.35){a=Math.floor(Math.random()*15)+3;b2=Math.floor(Math.random()*15)+3;op='×';answer=a*b2;}
    else if(r<0.6){answer=Math.floor(Math.random()*12)+2;b2=Math.floor(Math.random()*12)+2;a=answer*b2;op='÷';}
    else{a=Math.floor(Math.random()*100)+20;b2=Math.floor(Math.random()*60)+10;
      if(Math.random()<0.5){op='+';answer=a+b2;}
      else{if(a<b2){const t=a;a=b2;b2=t;}op='−';answer=a-b2;}}
  }
  // Generate 3 wrong answers close to correct
  const wrongs=new Set();
  while(wrongs.size<3){
    let w=answer+Math.floor(Math.random()*11)-5;
    if(w===answer) w=answer+(Math.random()<0.5?-6:7);
    if(w<0) w=Math.abs(w)+1;
    wrongs.add(w);
  }
  const choices=[answer,...wrongs];
  // Shuffle
  for(let i=choices.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[choices[i],choices[j]]=[choices[j],choices[i]];}
  return{text:\`\${a} \${op} \${b2}\`,answer,choices};
}

function showMathChallenge(){
  mathActive=true;
  const prob=genMathProblem();
  const overlay=document.getElementById('math-overlay');
  overlay.style.display='flex';
  document.getElementById('math-question').textContent=prob.text;
  document.getElementById('math-result').textContent='';
  document.getElementById('math-timer-fill').style.width='100%';
  document.getElementById('math-timer-fill').style.background='#00ffcc';
  // Build answer buttons
  const container=document.getElementById('math-answers');
  container.innerHTML='';
  prob.choices.forEach((c,ci)=>{
    const btn=document.createElement('button');
    btn.innerHTML=\`<span style="font-size:10px;color:#556;position:absolute;top:4px;left:8px;">\${ci+1}</span>\${c}\`;
    btn.style.cssText='position:relative;background:rgba(0,40,80,0.7);border:2px solid #00aaff66;border-radius:10px;'+
      'color:#00eeff;font-family:Courier New,monospace;font-size:22px;font-weight:900;'+
      'padding:14px 24px;min-width:80px;cursor:pointer;letter-spacing:2px;'+
      'text-shadow:0 0 8px #00eeffaa;-webkit-tap-highlight-color:transparent;touch-action:none;';
    const handler=e=>{
      e.preventDefault();
      if(!mathActive) return;
      answerMath(c===prob.answer);
    };
    btn.addEventListener('click',handler);
    btn.addEventListener('touchend',handler);
    container.appendChild(btn);
  });
  // Start timer
  mathTimeLeft=MATH_TIME;
  clearInterval(mathTimer);
  // Keyboard handler for 1-4 keys
  mathKeyHandler=e=>{
    if(!mathActive) return;
    const idx=parseInt(e.key)-1;
    if(idx>=0&&idx<prob.choices.length){
      e.preventDefault();
      answerMath(prob.choices[idx]===prob.answer);
    }
  };
  document.addEventListener('keydown',mathKeyHandler);
  mathTimer=setInterval(()=>{
    mathTimeLeft-=100;
    const pct=Math.max(0,mathTimeLeft/MATH_TIME*100);
    document.getElementById('math-timer-fill').style.width=pct+'%';
    if(pct<30) document.getElementById('math-timer-fill').style.background='#ff4444';
    else if(pct<60) document.getElementById('math-timer-fill').style.background='#ffaa00';
    if(mathTimeLeft<=0){
      clearInterval(mathTimer);
      answerMath(false);
    }
  },100);
}

function answerMath(correct){
  if(!mathActive) return;
  mathActive=false;
  clearInterval(mathTimer);
  if(mathKeyHandler){document.removeEventListener('keydown',mathKeyHandler);mathKeyHandler=null;}
  const resultEl=document.getElementById('math-result');
  const rktC=S.catches.find(c=>c.id==='rocket');
  if(correct){
    resultEl.textContent='✓ CORRECT!';
    resultEl.style.color='#00ffcc';
    S.lives=Math.min(5,S.lives+1);
    S.score+=2000;
    addPop(38,940-40,'FREE BALL! +2000','#ff4466',true);
    burst(38,940,'#ff4466',20);
    shockwave(38,940,60,'#ff4466',30);
    sfxJackpot();hapticJackpot();
    updLives();updScore();
  } else {
    resultEl.textContent='✗ MISS';
    resultEl.style.color='#ff4444';
    sfxDrain();hapticFlipper();
  }
  // Close after brief delay and eject
  setTimeout(()=>{
    document.getElementById('math-overlay').style.display='none';
    if(rktC){
      rktC.holding=false;
      const b=S.ball;
      b.x=rktC.x; b.y=rktC.y-rktC.r-BR-4;
      b.vx=(Math.random()-0.5)*8;
      b.vy=-14-Math.random()*4;
      addPop(rktC.x,rktC.y-40,'GO!',rktC.color);
      burst(rktC.x,rktC.y-20,rktC.color,10);
      sfxLaunch();hapticFlipper();
    }
  },correct?800:600);
}


const FW=600, FH=1600;

// Walls
const LW=20, RW=520, TW=80;
// Launch lane
const SEP=534, LRX=596;
// Flipper pivots — wider gap, more playable
const LFX=148,LFY=1465, RFX=392,RFY=1465, FLEN=100;
const LF_REST=0.16, LF_ACT=-0.52;
const RF_REST=Math.PI-0.16, RF_ACT=Math.PI+0.52;
const FSPD=0.62, FRAD=9;
// Slingshots — pushed wide
const SL_TOP=1370, SL_BT=1448, SL_INN=100, SR_INN=RW-SL_INN+LW;
// Ball
const BR=10, PHYS=6, FREST=0.72;
// Spin physics
const SPIN_FRICTION=0.18;   // how much wall contact transfers between spin and linear vel
const SPIN_DECAY=0.995;     // spin bleeds off slowly over time (rolling friction)
// Gravity: stronger going up (asymmetric), weaker in space mode
const GRAV_DOWN=0.22;   // falling
const GRAV_UP=0.38;     // rising — decelerates fast like real ball on inclined surface
const DRAG=0.9985;      // tiny drag per sub-step so ball bleeds speed over time
const SPEED_CAP=38;

// ═══════════════════════════════════════════════════════
// CANVAS & VIEWPORT
// ═══════════════════════════════════════════════════════
const canvas=document.getElementById('c');
const ctx=canvas.getContext('2d');
let VW=600, VH=700, scaleRatio=1;

function resize(){
  const launchW=52;
  const avW=window.innerWidth-launchW;
  const hudH=document.getElementById('hud').offsetHeight||42;
  const btmH=document.getElementById('btm').offsetHeight||18;
  const avH=window.innerHeight-hudH-btmH;
  scaleRatio=Math.min(avW/FW, avH/(FH*0.56));
  VW=FW; VH=Math.round(avH/scaleRatio);
  canvas.width=VW; canvas.height=VH;
  canvas.style.width=(VW*scaleRatio)+'px';
  canvas.style.height=(VH*scaleRatio)+'px';
}
resize();
window.addEventListener('resize',resize);

// Camera
let camY=0, camYTarget=0;

// ── USER PREFS ──
const PREFS={
  zoom:1.0,   // 0.7=wide  1.0=normal  1.4=close
  speed:1.0,  // 0.7=chill 1.0=normal  1.3=fast
  haptics:true, // vibration feedback on mobile
};
const ZOOM_OPTS=[0.7,1.0,1.4];
const SPEED_OPTS=[0.7,1.0,1.3];
const ZOOM_LBLS=['WIDE','NORMAL','CLOSE'];
const SPEED_LBLS=['CHILL','NORMAL','FAST'];

// ── FOCUS POWER-UP state ──
let focusOrb={active:false,x:0,y:0,lit:0,collected:false};
let focusMode={active:false,ticks:0};
const FOCUS_DUR=300; // 5 seconds at 60fps

function updateCamera(ballY){
  const focusZoom=focusMode.active?1.25:1.0;
  const effVH=Math.round((VH/PREFS.zoom)/focusZoom);
  const margin=effVH*0.38;
  camYTarget=Math.max(0,Math.min(FH-effVH, ballY-margin));
  if(ballY>FH-effVH*0.6) camYTarget=FH-effVH;
  const lerpSpeed=focusMode.active?0.18:0.1;
  camY+=(camYTarget-camY)*lerpSpeed;
}

// ═══════════════════════════════════════════════════════
// GEOMETRY
// ═══════════════════════════════════════════════════════
function closestPt(px,py,ax,ay,bx,by){
  const dx=bx-ax,dy=by-ay,l2=dx*dx+dy*dy;
  if(l2<1e-6)return[ax,ay];
  const t=Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/l2));
  return[ax+t*dx,ay+t*dy];
}
function wallBounce(b,ax,ay,bx,by,e=0.68,boost=0){
  const[cx,cy]=closestPt(b.x,b.y,ax,ay,bx,by);
  const dx=b.x-cx,dy=b.y-cy,d=Math.hypot(dx,dy),mn=BR+2;
  if(d<mn&&d>1e-4){
    const nx=dx/d,ny=dy/d;
    b.x+=nx*(mn-d);b.y+=ny*(mn-d);
    const dot=b.vx*nx+b.vy*ny;
    if(dot<0){
      b.vx-=(1+e)*dot*nx; b.vy-=(1+e)*dot*ny;
      if(boost>0){const sp=Math.hypot(b.vx,b.vy)||1;b.vx=b.vx/sp*(sp+boost);b.vy=b.vy/sp*(sp+boost);}
      // Spin-friction: tangential velocity at contact vs ball surface spin
      // tx,ty = tangent direction along wall
      const tx=-ny,ty=nx;
      const vTan=b.vx*tx+b.vy*ty;        // ball's linear tangential speed
      const vSurf=b.spin*BR;              // ball surface speed from spin (+ = rolling forward)
      const slip=vTan-vSurf;             // relative slip between ball and wall
      const frictionImpulse=SPIN_FRICTION*slip;
      // Friction slows the slip — transfers between spin and linear
      b.vx-=frictionImpulse*tx;
      b.vy-=frictionImpulse*ty;
      b.spin+=frictionImpulse/BR;        // torque from friction
    }
    return true;
  }
  return false;
}
function flipperCollide(b,px,py,angle,angVel){
  const tx=px+FLEN*Math.cos(angle),ty=py+FLEN*Math.sin(angle);
  const[cx,cy]=closestPt(b.x,b.y,px,py,tx,ty);
  const dx=b.x-cx,dy=b.y-cy,d=Math.hypot(dx,dy),mn=BR+FRAD;
  if(d<mn&&d>0.0001){
    const nx=dx/d,ny=dy/d;
    b.x=cx+nx*mn; b.y=cy+ny*mn;
    const rx=cx-px,ry=cy-py;
    const svx=-angVel*ry, svy=angVel*rx;
    const relVx=b.vx-svx,relVy=b.vy-svy;
    const vn=relVx*nx+relVy*ny;
    if(vn<0){
      b.vx-=(1+FREST)*vn*nx; b.vy-=(1+FREST)*vn*ny;
      // Flipper imparts spin based on angular velocity and contact point distance from pivot
      // Fast-moving flipper tip = big spin transfer (like a slap shot)
      const contactDist=Math.hypot(rx,ry);
      const surfSpd=angVel*contactDist; // tangential surface speed at contact
      // Tangent along flipper
      const ftx=-Math.sin(angle), fty=Math.cos(angle);
      const vTan=b.vx*ftx+b.vy*fty;
      const surfV=svx*ftx+svy*fty;
      const slip=vTan-surfV-b.spin*BR;
      b.spin+=slip*SPIN_FRICTION*1.8/BR; // flipper has higher friction than walls
    } else {
      const into=b.vx*nx+b.vy*ny;
      if(into<0){b.vx-=into*nx; b.vy-=into*ny;}
    }
    return true;
  }
  return false;
}

// ═══════════════════════════════════════════════════════
// GAME STATE
// ═══════════════════════════════════════════════════════
let S=null, keys={L:false,R:false,SP:false};

// ── LEADERBOARD ──
const LS_KEY='starmuff_scores_v1';
let menuTab='settings'; // 'settings' | 'scores' | 'unlocks'

function loadScores(){
  try{ return JSON.parse(localStorage.getItem(LS_KEY)||'[]'); }
  catch(e){ return []; }
}
let lastPlayerName='';
function saveScore(score,name){
  if(score<1) return;
  if(name) lastPlayerName=name;
  const pName=(name||lastPlayerName||'ANON').toUpperCase().slice(0,12);
  const scores=loadScores();
  scores.push({score, name:pName, date:new Date().toLocaleDateString('en-CA'), speed:SPEED_LBLS[SPEED_OPTS.indexOf(PREFS.speed)], zoom:ZOOM_LBLS[ZOOM_OPTS.indexOf(PREFS.zoom)]});
  scores.sort((a,b)=>b.score-a.score);
  scores.splice(10); // keep top 10
  try{ localStorage.setItem(LS_KEY,JSON.stringify(scores)); } catch(e){}
  updateCareerBest(score);
}
function getBestScore(){
  const s=loadScores();
  return s.length?s[0].score:0;
}

// ── NAME ENTRY OVERLAY ──
let nameOverlayActive=false;
function showNameEntry(){
  nameOverlayActive=true;
  const overlay=document.getElementById('name-overlay');
  overlay.style.display='flex';
  document.getElementById('name-score').textContent=S.score.toLocaleString();
  const best=getBestScore();
  document.getElementById('name-best').textContent=best>0?'BEST: '+best.toLocaleString():'';
  const inp=document.getElementById('name-input');
  inp.value=lastPlayerName||'';
  setTimeout(()=>inp.focus(),100);
}
function hideNameEntry(save){
  nameOverlayActive=false;
  document.getElementById('name-overlay').style.display='none';
  const inp=document.getElementById('name-input');
  const name=inp.value.trim()||'ANON';
  if(save) saveScore(S.score,name);
  else saveScore(S.score);
  postServerScore(S.score);
  restart();
}
document.getElementById('name-submit').addEventListener('click',()=>hideNameEntry(true));
document.getElementById('name-submit').addEventListener('touchend',e=>{e.preventDefault();hideNameEntry(true);});
document.getElementById('name-skip').addEventListener('click',()=>hideNameEntry(false));
document.getElementById('name-skip').addEventListener('touchend',e=>{e.preventDefault();hideNameEntry(false);});
document.getElementById('name-input').addEventListener('keydown',e=>{
  if(e.key==='Enter') hideNameEntry(true);
  e.stopPropagation(); // prevent game controls from firing
});
document.getElementById('name-input').addEventListener('keyup',e=>e.stopPropagation());

// Server-side leaderboard
const SERVER_LB_URL = '/api/pinball/scores';
let serverScores = [];
let serverScoresLoaded = false;
async function fetchServerScores(){
  try{
    const r = await fetch(SERVER_LB_URL);
    serverScores = await r.json();
    serverScoresLoaded = true;
  } catch(e){ serverScoresLoaded = true; }
}
async function postServerScore(score){
  if(score<1) return;
  const pName=(lastPlayerName||'ANON').toUpperCase().slice(0,12);
  const dateStr=new Date().toLocaleDateString('en-CA');
  try{
    await fetch(SERVER_LB_URL, {
      method:'POST', headers:{'Content-Type':'application/json','X-Requested-With':'starmuff'},
      body:JSON.stringify({score, name:pName, date:dateStr, speed:SPEED_LBLS[SPEED_OPTS.indexOf(PREFS.speed)], zoom:ZOOM_LBLS[ZOOM_OPTS.indexOf(PREFS.zoom)]})
    });
    fetchServerScores();
  } catch(e){}
  try{
    await fetch('/api/pinball/daily',{method:'POST',headers:{'Content-Type':'application/json','X-Requested-With':'starmuff'},body:JSON.stringify({playerName:pName,score,date:dateStr})});
    fetchDailyBest();
  }catch(e){}
}
let dailyBest=null;
let hallOfFirsts=[];
async function fetchDailyBest(){try{const r=await fetch('/api/pinball/daily');dailyBest=await r.json();}catch(e){}}
async function fetchHallOfFirsts(){try{const r=await fetch('/api/pinball/firsts');hallOfFirsts=await r.json();}catch(e){}}
async function claimFirst(milestone,score){
  const pName=(lastPlayerName||'ANON').toUpperCase().slice(0,12);
  try{await fetch('/api/pinball/firsts',{method:'POST',headers:{'Content-Type':'application/json','X-Requested-With':'starmuff'},body:JSON.stringify({milestone,playerName:pName,score})});fetchHallOfFirsts();}catch(e){}
}
fetchServerScores();fetchDailyBest();fetchHallOfFirsts();

function mkBumper(x,y,r,color,pts,lbl,shape='circle'){return{x,y,r,color,pts,lbl,lit:0,shape};}
function mkHole(x,y,r,pts,color,lbl){return{x,y,r,pts,color,lbl,lit:0};}
function mkTarget(x,y,w,h,pts,color,lbl,hit=false){return{x,y,w,h,pts,color,lbl,hit,lit:0};}

function mkState(){
  return{
    ball:{x:556,y:FH-120,vx:0,vy:0,spin:0,angle:0},
    phase:'menu',
    score:0,lives:3,plunger:0,combo:0,
    jackpot:5000,
    comboTimer:0,       // frames remaining on current combo (0=no combo)
    comboMax:0,         // highest combo this ball
    ballStats:{bumperHits:0,targetsHit:0,spins:0,holesHit:0,bestCombo:0,ballScore:0},
    ballStartScore:0,   // score at start of this ball
    ballInPlay:false,spaceMode:false,spaceTicks:0,
    // ── SPINNER — center field, ball passes through, scores per revolution ──
    spinner:{x:268, y:560, len:28, angle:0, spin:0, lit:0, totalSpins:0},

    // ── MUFF LETTERS — primary objective, hit all 4 ──
    muff:[false,false,false,false],  // M U F F
    muffTargets:[
      {x:155,y:490,r:14,lit:0,idx:0,lbl:'M',color:'#ff2299'},
      {x:215,y:480,r:14,lit:0,idx:1,lbl:'U',color:'#ff8800'},
      {x:321,y:480,r:14,lit:0,idx:2,lbl:'F',color:'#ffee22'},
      {x:381,y:490,r:14,lit:0,idx:3,lbl:'F',color:'#00ffcc'},
    ],

    // ── JACKPOT POOL — builds from bumper hits, cash via center hole ──
    jackpotPool:5000,
    la:LF_REST+0.55,ra:RF_REST-0.55,la_prev:LF_REST+0.55,ra_prev:RF_REST-0.55,
    lAngVel:0,rAngVel:0,
    startupFrames:60, // frames for flipper sweep-in animation on game start
    holeTimer:0,holeIdx:-1,
    deadTimer:0,

    // ── SHOT SEQUENCE SYSTEM ──
    // Player must hit L → C → R in order for JACKPOT
    shotSeq:['L','C','R'],        // required order
    shotLit:0,                    // index of next required shot (0=need L, 1=need C, 2=need R)
    shotCooldown:0,               // prevent double-fire
    shotMult:1,                   // multiplier from named shots (max 6)
    skillShotWindow:150,          // frames after launch where skill shot active
    skillShotDone:false,

    bumpers:[
      // ── LEFT CLUSTER — reward for left lane shot ──
      mkBumper(105,420,20,'#00eeff',300,'★','hex'),
      mkBumper(120,520,18,'#00eeff',300,'NOVA','ring'),
      mkBumper(80, 550,16,'#44ffaa',200,'⊙'),

      // ── CENTER CLUSTER — jackpot zone (widened diamond for better flow) ──
      mkBumper(180,150,22,'#cc44ff',500,'★','hex'),
      mkBumper(356,150,22,'#ff2299',500,'NOVA','hex'),
      mkBumper(268,220,24,'#ffee00',400,'MUFF','star'),
      mkBumper(185,290,16,'#ff8800',250,'⊛','ring'),
      mkBumper(352,290,16,'#ff8800',250,'⊛','ring'),

      // ── RIGHT CLUSTER — reward for right lane shot ──
      mkBumper(435,420,20,'#ff8800',300,'★','hex'),
      mkBumper(420,520,18,'#ff8800',300,'QUASAR','ring'),
      mkBumper(460,550,16,'#ff4400',200,'⊙'),

      // ── MID-FIELD ORBIT RING — creates flowing circular paths ──
      mkBumper(180,650,16,'#aa44ff',250,'⊛','ring'),
      mkBumper(356,650,16,'#aa44ff',250,'⊛','ring'),
      mkBumper(268,710,18,'#aa44ff',300,'⊛','hex'),
      mkBumper(140,790,16,'#ff2299',200,'★'),
      mkBumper(396,780,16,'#00eeff',200,'★'),

      // ── DANGER bumpers — staggered asymmetry for redirects ──
      mkBumper(135,1010,24,'#ff0044',500,'⚡','star'),
      mkBumper(405,1020,24,'#ff0044',500,'⚡','star'),
      mkBumper(268,1085,22,'#ffee22',400,'★★','hex'),
    ],

    // ── PASSIVE PEGS — minimal, functional ──
    pegs:[
      // Zone 1 gate pegs
      {x:170,y:340,r:5,color:'#223366',lit:0},
      {x:268,y:355,r:5,color:'#223366',lit:0},
      {x:368,y:340,r:5,color:'#223366',lit:0},
      // Mid-field deflectors
      {x:185,y:860,r:5,color:'#223366',lit:0},
      {x:268,y:875,r:5,color:'#223366',lit:0},
      {x:352,y:860,r:5,color:'#223366',lit:0},
    ],

    // ── HOLES ──
    holes:[
      mkHole(268,380,20,1000,'#ffee22','JACKPOT'),
      mkHole(100,620,18,600,'#00ffcc','BONUS L'),
      mkHole(440,610,18,600,'#ff8800','BONUS R'),
    ],

    // ── LEFT DROP BANK (x~90) + RIGHT DROP BANK (x~450) ──
    // Complete a bank → +1 shot multiplier. Complete both → SUPER
    leftBank:[
      mkTarget(72,1180,28,12,200,'#00eeff','L1'),
      mkTarget(72,1215,28,12,200,'#00eeff','L2'),
      mkTarget(72,1250,28,12,200,'#00eeff','L3'),
    ],
    rightBank:[
      mkTarget(440,1180,28,12,200,'#ff8800','R1'),
      mkTarget(440,1215,28,12,200,'#ff8800','R2'),
      mkTarget(440,1250,28,12,200,'#ff8800','R3'),
    ],
    leftBankDone:false,
    rightBankDone:false,

    // ── ABC CENTER TARGETS (kept for sequence unlock) ──
    targets:[
      mkTarget(210,1165,30,12,300,'#ff4400','A'),
      mkTarget(258,1165,30,12,300,'#ffaa00','B'),
      mkTarget(306,1165,30,12,300,'#ffee00','C'),
    ],
    abcHit:[false,false,false],

    jackpotGate:{x:213,y:TW+10,w:114,lit:false,timer:0},

    // ── ROLLOVERS — skill shot targets ──
    rollovers:[
      {x:66, y:TW+28,lit:false,lbl:'1',color:'#ff2244'},
      {x:132,y:TW+28,lit:false,lbl:'2',color:'#ff8800'},
      {x:198,y:TW+28,lit:false,lbl:'SKILL',color:'#ffee22',isSkill:true},
      {x:264,y:TW+28,lit:false,lbl:'4',color:'#44ff88'},
      {x:330,y:TW+28,lit:false,lbl:'5',color:'#00aaff'},
      {x:410,y:TW+28,lit:false,lbl:'6',color:'#aa44ff'},
    ],

    posts:[
      {x:LFX-22,y:LFY-30,r:6,color:'#00ffcc',lit:0},
      {x:RFX+22,y:RFY-30,r:6,color:'#00ffcc',lit:0},
    ],

    flasher:{active:false,color:'#ffffff',ticks:0},
    ballSave:{active:true,ticks:180},
    parts:[],pops:[],trail:[],stuckFrames:0,

    // ── CHARACTER BALL HOLDS — each catches the ball once per game, gives +1 life ──
    catches:[
      {id:'cat',   x:55,  y:165, r:22, used:false, holding:false, timer:0, color:'#ff88aa', lbl:'CAT'},
      {id:'ufo',   x:472, y:580, r:24, used:false, holding:false, timer:0, color:'#44ff88', lbl:'UFO'},
      {id:'rocket',x:38,  y:940, r:22, used:false, holding:false, timer:0, color:'#ff4466', lbl:'ROCKET'},
    ],
    catchBallIdx:-1, // -1=primary, 0+=extraBalls index (which ball got caught)

    // ── MULTI-BALL — extra balls that drain silently ──
    extraBalls:[], // [{x,y,vx,vy,spin,angle}]

    // ── ENHANCED VFX ──
    novaEnergy:0, _novaCharged:0, novaBurst:{active:false,ticks:0},
    shockwaves:[],   // {x,y,r,maxR,color,life,ml}
    shake:{x:0,y:0,intensity:0,decay:0.88},
    lightning:[],    // {x1,y1,x2,y2,color,life,ml}
    recentHits:[],   // last 5 bumper hit positions for lightning chains
    milestonesFired:new Set(), // track which score milestones have triggered
    stars:Array.from({length:160},()=>({
      x:Math.random()*FW,y:Math.random()*FH,
      r:0.3+Math.random()*1.8,tw:Math.random()*6.28,sp:0.015+Math.random()*0.045
    })),
    t:0,
  };
}

// ═══════════════════════════════════════════════════════
// UI HELPERS
// ═══════════════════════════════════════════════════════
const $score=document.getElementById('score-val');
const $lives=document.getElementById('lives-val');
const $combo=document.getElementById('combo-lbl');
const $mode=document.getElementById('mode-lbl');

function updFocusBtn(){
  const el=document.getElementById('focus-btn');
  if(!el) return;
  if(focusMode.active){
    el.style.display='block';
    el.style.color='#ffee22'; el.style.borderColor='#ffee2244';
    el.style.textShadow='0 0 8px #ffee22';
    const pct=Math.round(focusMode.ticks/FOCUS_DUR*100);
    el.textContent=\`◎ \${pct}%\`;
  } else if(focusOrb.collected&&liveUnlocked('focus')){
    el.style.display='block';
    el.style.color='#00eeff'; el.style.borderColor='#00eeff44';
    el.style.textShadow='0 0 8px #00eeff';
    el.textContent='◎ FOCUS';
  } else {
    el.style.display='none';
  }
}
function activateFocus(){
  if(!liveUnlocked('focus')||!focusOrb.collected||focusMode.active) return;
  focusMode.active=true; focusMode.ticks=FOCUS_DUR;
  addPop(FW/2,camY+VH*0.4,'⬤ FOCUS MODE','#00eeff',true);
  flash('#00eeff',20); sfxSpaceMode();
  updFocusBtn();
}
function updScore(){
  const el=document.getElementById('score-val');
  if(el) el.textContent=(S.score||0).toLocaleString();
  if(liveUnlocked('nova')&&S&&S.novaEnergy<NOVA_MAX){
    const earned=Math.floor(S.score/NOVA_CHARGE_PER);
    if(earned>S._novaCharged){
      S.novaEnergy=Math.min(NOVA_MAX,S.novaEnergy+(earned-S._novaCharged));
      S._novaCharged=earned;
      updNovaBtn();updBtn();
    }
  }
  checkMilestones();
  checkUnlocks();
}
function updNovaBtn(){
  const meter=document.getElementById('nova-meter');
  if(!meter) return;
  if(!liveUnlocked('nova')){meter.innerHTML='';return;}
  let html='';
  for(let i=0;i<NOVA_MAX;i++) html+='<div class="nova-pip'+(i<S.novaEnergy?' filled':'')+'"></div>';
  meter.innerHTML=html;
}
function updRestartBtn(){
  const btn=document.getElementById('restart-btn');
  if(!btn) return;
  const show=S&&(S.phase==='play'||S.phase==='ready'||S.phase==='dead'||S.phase==='hole'||S.phase==='tally'||S.phase==='lamboRescue');
  btn.style.display=show?'inline-block':'none';
}
let restartHoldTimer=null;
let restartHoldProgress=0;
function holdRestart(){
  if(restartHoldTimer) return;
  restartHoldProgress=0;
  const btn=document.getElementById('restart-btn');
  if(btn){ btn.style.color='rgba(255,140,40,0.9)'; btn.style.borderColor='rgba(255,140,40,0.5)'; }
  restartHoldTimer=setInterval(()=>{
    restartHoldProgress++;
    if(btn) btn.textContent=restartHoldProgress>=6?'↺!':'↺·'.slice(0,restartHoldProgress%2===0?2:1)||'↺';
    if(restartHoldProgress>=6){
      clearInterval(restartHoldTimer); restartHoldTimer=null;
      if(btn){ btn.style.color='rgba(255,80,80,0.6)'; btn.style.borderColor='rgba(255,60,60,0.3)'; btn.textContent='↺'; }
      saveScore(S.score,lastPlayerName); restart();
    }
  },160);
}
document.addEventListener('touchend',cancelRestartHold,{passive:true});
document.addEventListener('mouseup',cancelRestartHold);
function cancelRestartHold(){
  if(!restartHoldTimer) return;
  clearInterval(restartHoldTimer); restartHoldTimer=null; restartHoldProgress=0;
  const btn=document.getElementById('restart-btn');
  if(btn){ btn.style.color='rgba(255,80,80,0.6)'; btn.style.borderColor='rgba(255,60,60,0.3)'; btn.textContent='↺'; }
}

// ── MILESTONES ──
const MILESTONES=[
  {pts:10000,   label:'10K!',     color:'#00ffcc', msg:'COSMIC DEBUT'},
  {pts:25000,   label:'25K!',     color:'#ffee22', msg:'STAR VOYAGER'},
  {pts:50000,   label:'50K!',     color:'#ff8800', msg:'NEBULA HUNTER'},
  {pts:100000,  label:'100K!',    color:'#ff44ff', msg:'GALAXY BRAIN'},
  {pts:250000,  label:'250K!',    color:'#ff2299', msg:'SUPERNOVA'},
  {pts:500000,  label:'500K!',    color:'#aa44ff', msg:'BLACK HOLE MODE'},
  {pts:1000000, label:'1 MILLION',color:'#ffffff', msg:'LEGEND OF STARMUFF'},
];
function checkMilestones(){
  if(!S||!S.milestonesFired) return;
  for(const m of MILESTONES){
    if(S.score>=m.pts&&!S.milestonesFired.has(m.pts)){
      S.milestonesFired.add(m.pts);
      flash(m.color,50);
      burst(FW/2,camY+250,m.color,60);
      shockwave(FW/2,camY+250,150,m.color,45);
      shockwave(FW/2,camY+250,100,'#ffffff',35);
      shake(12);
      starBurst(FW/2,camY+250,m.color,25);
      sparkBurst(FW/2,camY+230,'#ffffff',15);
      addPop(FW/2,camY+220,m.label,m.color,true);
      addPop(FW/2,camY+250,m.msg,m.color,true);
      sfxJackpot();hapticMilestone();
      claimFirst(m.label,S.score);
    }
  }
  const millionLevel=Math.floor(S.score/1000000);
  if(millionLevel>0&&millionLevel>(lamboCharges+lamboUsed)){
    const newCharges=millionLevel-(lamboCharges+lamboUsed);
    for(let c=0;c<newCharges;c++){
      if(lamboCharges<MAX_LAMBO){
        lamboCharges++;
        addPop(FW/2,camY+170,'\\u{1F3CE}\\u{FE0F} LAMBO CHARGE BANKED! ('+lamboCharges+'/'+MAX_LAMBO+')','#ffd700',true);
      }
    }
    lamboUnlocked=true;
    if(!lamboMode.active){
      lamboMode.active=true;lamboMode.ticks=2400;
      addPop(FW/2,camY+140,'\\u{1F308} RAINBOW LAMBO MODE \\u{1F308}','#ffffff',true);
      parent.postMessage({type:'playEasterEgg',song:'headgroove'},'*');
    }
    updLambo();
  }
}
function checkUnlocks(){
  if(!S||S.phase!=='play') return;
  if(!S._unlocksFired) S._unlocksFired=new Set();
  for(const[key,u] of Object.entries(UNLOCK_THRESHOLDS)){
    if(S.score>=u.score&&!S._unlocksFired.has(key)){
      S._unlocksFired.add(key);
      updateCareerBest(S.score);
      newUnlocks.push(key);
      flash(u.color,60);
      burst(FW/2,camY+200,u.color,70);
      shockwave(FW/2,camY+200,200,u.color,55);
      shockwave(FW/2,camY+200,120,'#ffffff',40);
      starBurst(FW/2,camY+200,u.color,30);
      sparkBurst(FW/2,camY+180,'#ffffff',20);
      shake(15);
      addPop(FW/2,camY+170,'★ UNLOCKED ★',u.color,true);
      addPop(FW/2,camY+210,u.label,u.color,true);
      sfxJackpot();hapticMilestone();
      claimFirst('UNLOCK: '+u.label,S.score);
      if(key==='nova'){updBtn();updNovaBtn();}
      if(key==='focus'){updFocusBtn();}
    }
  }
}
function updJackpot(){
  const el=document.getElementById('jackpot-val');
  if(el) el.textContent='JP: '+(S.jackpotPool||0).toLocaleString();
}
function updMuff(){
  const el=document.getElementById('muff-lbl');
  if(!el||!S.muff) return;
  const letters=['M','U','F','F'];
  el.innerHTML=letters.map((l,i)=>{
    const hit=S.muff[i];
    return \`<span style="color:\${hit?['#ff2299','#ff8800','#ffee22','#00ffcc'][i]:'#223355'};text-shadow:\${hit?\`0 0 8px \${['#ff2299','#ff8800','#ffee22','#00ffcc'][i]}\`:'none'}">\${l}</span>\`;
  }).join('<span style="color:#112233">·</span>');
}
function updLives(){$lives.textContent='★'.repeat(Math.min(S.lives,5))+(S.lives<3?'☆'.repeat(3-S.lives):'');}
const $lambo=document.getElementById('lambo-val');
function updLambo(){
  if(lamboCharges>0){
    $lambo.style.display='inline';
    $lambo.textContent='\\u{1F3CE}\\u{FE0F}'.repeat(lamboCharges);
    $lambo.style.color='#ffd700';$lambo.style.textShadow='0 0 8px #ffd700';
  } else { $lambo.style.display='none'; }
}
function updCombo(){
  if(!S) return;
  const seq=S.shotSeq||['L','C','R'];
  const lit=S.shotLit||0;
  const mult=S.shotMult||1;
  const seqStr=seq.map((s,i)=>i<lit?\`[\${s}]\`:s).join('→');
  const mbStr=S.extraBalls&&S.extraBalls.length>0?' ⚽×'+(S.extraBalls.length+1):'';
  $combo.textContent=\`×\${mult} | \${seqStr}\${mbStr}\`;
  $combo.style.color=S.extraBalls&&S.extraBalls.length>0?'#00ffcc':mult>=4?'#ffee22':mult>=2?'#ff8800':'#00ffcc';
}
function updMode(){
  if(S.spaceMode){$mode.textContent='🚀 SPACE MODE ACTIVE!';$mode.style.color='#aa66ff';return;}
  if(!S.ball) return;
  const y=S.ball.y;
  if(y<420){$mode.textContent='✦ JACKPOT ZONE';$mode.style.color='#cc44ff';}
  else if(y<800){$mode.textContent='NEBULA FIELDS';$mode.style.color='#00eeff';}
  else if(y<1100){$mode.textContent='ASTEROID BELT';$mode.style.color='#ff8800';}
  else{$mode.textContent='⚠ DANGER ZONE';$mode.style.color='#ff2244';}
}
function addPop(x,y,text,color,big=false){S.pops.push({x,y,text,color,life:70,ml:70,big});}
function burst(x,y,color,n=14){
  for(let i=0;i<n;i++){
    const a=Math.random()*6.28,sp=2+Math.random()*7;
    S.parts.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-1.2,life:50,ml:50,color,sz:1.5+Math.random()*3.5});
  }
}
function flash(color,ticks=18){S.flasher={active:true,color,ticks};}

// ── ENHANCED VFX HELPERS ──
function shockwave(x,y,maxR,color,dur=30){
  S.shockwaves.push({x,y,r:0,maxR,color,life:dur,ml:dur});
}
function shake(intensity){
  S.shake.intensity=Math.min(S.shake.intensity+intensity,18);
}
function lightning(x1,y1,x2,y2,color,dur=12){
  S.lightning.push({x1,y1,x2,y2,color,life:dur,ml:dur});
}
function starBurst(x,y,color,n=8){
  // Star-shaped particles that spin and fade
  for(let i=0;i<n;i++){
    const a=Math.random()*6.28,sp=3+Math.random()*8;
    S.parts.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-2,life:40,ml:40,color,sz:2+Math.random()*3,type:'star',spin:Math.random()*0.3-0.15,angle:Math.random()*6.28});
  }
}
function sparkBurst(x,y,color,n=12){
  // Elongated streak particles
  for(let i=0;i<n;i++){
    const a=Math.random()*6.28,sp=4+Math.random()*10;
    S.parts.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-1.5,life:30,ml:30,color,sz:2+Math.random()*2,type:'spark',angle:a});
  }
}
function updBtn(){
  const inMenu=S.phase==='menu';
  const lb=document.getElementById('launch-btn');
  const novaReady=liveUnlocked('nova')&&S&&S.novaEnergy>=NOVA_COST&&S.ballInPlay&&!S.novaBurst.active;
  if(inMenu){lb.style.display='none';}
  else if(S.ballInPlay){
    lb.style.display=novaReady?'flex':'none';
    if(novaReady){lb.classList.add('nova-mode');document.getElementById('launch-arrow').textContent='💥';document.getElementById('launch-text').textContent='NOVA';}
    else{lb.classList.remove('nova-mode');document.getElementById('launch-arrow').textContent='⚡';document.getElementById('launch-text').textContent='LAUNCH';}
  } else {
    lb.style.display='flex';lb.classList.remove('nova-mode');
    document.getElementById('launch-arrow').textContent='⚡';document.getElementById('launch-text').textContent='LAUNCH';
  }
  document.getElementById('flipper-row').style.display=inMenu?'none':'flex';
  document.getElementById('btm').style.display=inMenu?'none':'flex';
  updRestartBtn();
  updNovaBtn();
}

// ═══════════════════════════════════════════════════════
// LAUNCH
// ═══════════════════════════════════════════════════════
function launch(){
  sfxLaunch();
  S.ball.vy=-(S.plunger*26+10);
  S.ball.vx=0;
  S.phase='lane';S.plunger=0;
  updBtn();
}

function activateNova(){
  if(!liveUnlocked('nova')||!S||S.novaEnergy<NOVA_COST||S.novaBurst.active||S.phase!=='play') return;
  S.novaEnergy-=NOVA_COST;
  S._novaCharged=Math.floor(S.score/NOVA_CHARGE_PER);
  S.novaBurst={active:true,ticks:NOVA_DUR};
  shockwave(FW/2,FH-30,220,'#ffaa00',50);
  shockwave(FW/2,FH-30,140,'#ffee22',35);
  burst(FW/2,FH-60,'#ffaa00',35);
  starBurst(FW/2,FH-80,'#ffee22',15);
  sparkBurst(FW/2,FH-50,'#ff8800',18);
  flash('#ffaa00',25);
  sfxNova();hapticJackpot();shake(8);
  addPop(FW/2,FH-150,'NOVA BURST!','#ffaa00',true);
  updBtn();updNovaBtn();
}

// ═══════════════════════════════════════════════════════
// GAME LOGIC
// ═══════════════════════════════════════════════════════
function checkMuff(){
  if(S.muff.every(v=>v)){
    const pts=S.jackpotPool*2;
    S.score+=pts;
    S.muff=[false,false,false,false];
    S.jackpotPool=5000;
    S.muffTargets.forEach(t=>{t.lit=80; });
    // Brief delay then clear lit so targets are hittable again
    setTimeout(()=>{ if(S&&S.muffTargets) S.muffTargets.forEach(t=>t.lit=0); }, 1400);
    addPop(268,460,\`MUFF JACKPOT! +\${pts.toLocaleString()}\`,'#ff2299',true);
    burst(268,480,'#ff2299',50); flash('#ff2299',35); sfxJackpot();hapticJackpot();
    shockwave(268,480,120,'#ff2299',40);
    shockwave(268,480,80,'#ffee22',30);
    shake(10);
    starBurst(268,480,'#ff2299',20);
    sparkBurst(268,480,'#ffee22',15);
    // ── MULTI-BALL: launch second ball on MUFF completion ──
    if(S.extraBalls.length<1){
      S.extraBalls.push({x:268,y:TW+40,vx:(Math.random()-0.5)*6,vy:8+Math.random()*6,spin:0,angle:0});
      addPop(268,TW+80,'MULTI-BALL!','#00ffcc',true);
      sfxBallSave();hapticBallSave();
      updCombo();
    }
    updScore(); updMuff(); updJackpot();
  }
}

function checkABC(){
  if(S.abcHit.every(v=>v)){
    S.score+=3000*S.shotMult;S.abcHit=[false,false,false];
    addPop(258,1148,\`SUPER SCORE! +\${(3000*S.shotMult).toLocaleString()}\`,'#ff4400',true);
    burst(258,1165,'#ff8800',25);flash('#ff8800',22);sfxABC();hapticJackpot();
    shockwave(258,1165,80,'#ff8800',25);shake(4);sparkBurst(258,1165,'#ff4400',12);
    S.targets.forEach(t=>{t.hit=false;t.lit=40;});
    updScore();
  }
}

function checkBank(bank, side){
  if(bank.every(t=>t.hit)){
    bank.forEach(t=>{t.hit=false;t.lit=50;});
    if(side==='L') S.leftBankDone=true;
    if(side==='R') S.rightBankDone=true;
    S.shotMult=Math.min(6,S.shotMult+1);
    const pts=2000*S.shotMult;
    S.score+=pts;
    addPop(side==='L'?100:440,1150,\`\${side} BANK! ×\${S.shotMult}\`,'#00ffcc',true);
    flash('#00ffcc',18);sfxBallSave();updScore();updBtn();
    if(S.leftBankDone&&S.rightBankDone){
      // Both banks — space mode + big bonus
      S.score+=5000; S.spaceMode=true;S.spaceTicks=600;
      S.leftBankDone=false;S.rightBankDone=false;
      addPop(268,900,'BOTH BANKS! SPACE MODE!','#aa66ff',true);
      flash('#aa66ff',30);sfxSpaceMode();
      shockwave(268,900,140,'#aa66ff',40);shake(8);starBurst(268,900,'#aa66ff',18);updScore();updMode();
    }
  }
}

function namedShot(which){
  // L → C → R sequence
  const needed=S.shotSeq[S.shotLit];
  let pts=800*S.shotMult;
  if(which===needed){
    S.shotLit++;
    if(S.shotLit>=S.shotSeq.length){
      // Sequence complete — JACKPOT
      S.shotLit=0;
      pts=S.jackpot*S.shotMult;
      S.jackpot=Math.min(20000,S.jackpot+2000);
      S.score+=pts;
      addPop(268,700,\`SEQUENCE JACKPOT! +\${pts.toLocaleString()}\`,'#ffee22',true);
      burst(268,700,'#ffee22',40);flash('#ffee22',30);sfxJackpot();hapticJackpot();
    } else {
      S.score+=pts;
      addPop(268,800,\`\${which} SHOT! +\${pts.toLocaleString()}\`,'#00ffcc',false);
      flash('#00ffcc',10);sfxRollover();
    }
    S.shotMult=Math.min(6,S.shotMult+0.5|0||S.shotMult);
  } else {
    // Wrong order — still score but don't advance
    S.score+=pts/2|0;
    addPop(268,800,\`\${which} SHOT +\${(pts/2|0).toLocaleString()}\`,'#888888',false);
  }
  S.shotCooldown=45;
  updScore();updBtn();S.ballInPlay=true;
}

function checkRollovers(){
  if(S.rollovers.every(r=>r.lit)){
    S.score+=2000;
    addPop(190,TW+50,'JACKPOT LANES! +2000','#ffee22',true);
    S.rollovers.forEach(r=>r.lit=false);
    S.jackpotGate.lit=true;S.jackpotGate.timer=300;
    updScore();
  }
}

function tickLamboRescue(){
  const r=lamboRescue;
  r.ticks++;
  S.t++;
  if(r.phase==='drive'){
    r.lamboY-=8;
    if(r.ticks%3===0){
      burst(r.lamboX+(Math.random()-0.5)*30,r.lamboY+30,\`hsl(\${(r.ticks*12)%360},100%,60%)\`,4);
    }
    if(r.lamboY<=TW+120){
      r.phase='shoot';r.ticks=0;r.catOff=true;
      r.golfX=270;r.golfY=TW+100;r.golfVy=0;
      addPop(270,TW+80,'\\u{1F415} FETCH BOY! \\u{1F415}','#ffaa44',true);
    }
  } else if(r.phase==='shoot'){
    r.golfVy+=0.35;
    r.golfY+=r.golfVy;
    if(r.golfY>=800){
      r.golfY=800;r.phase='settle';r.ticks=0;
      holeInOneGolf={active:true,x:270,y:800,settled:true,isDog:true};
      addPop(270,780,'\\u{1F415} GOOD BOY STAYS! \\u{1F415}','#ffaa44',true);
      burst(270,800,'#ffd700',30);
      shockwave(270,800,120,'#ffd700',40);
      shake(10);
    }
  } else if(r.phase==='settle'){
    if(r.ticks>=90){
      r.active=false;r.phase='idle';
      parent.postMessage({type:'stopEasterEgg'},'*');
      S.ball={x:556,y:FH-120,vx:0,vy:0,spin:0,angle:0};
      S.phase='ready';S.plunger=0;S.trail=[];S.ballInPlay=false;
      S.ballSave={active:true,ticks:180};S.skillShotWindow=150;S.skillShotDone=false;
      S.ballStats={bumperHits:0,targetsHit:0,spins:0,holesHit:0,bestCombo:0,ballScore:0};
      S.ballStartScore=S.score;S.comboMax=0;
      updBtn();
    }
  }
}

function drain(){
  // ── FRUIT FRENZY: ball drain ends frenzy without losing a life ──
  if(fruitFrenzy.active){
    const bonusPts=fruitFrenzy.collected*1500;
    S.score+=bonusPts;
    addPop(FW/2,camY+VH/2-60,'FRUIT FRENZY OVER!','#ffd700',true);
    addPop(FW/2,camY+VH/2-30,fruitFrenzy.collected+'/'+fruitFrenzy.total+' COLLECTED','#00ff88',true);
    addPop(FW/2,camY+VH/2,'+'+bonusPts.toLocaleString()+' BONUS','#ffee22',true);
    updScore();
    fruitFrenzy.active=false;fruitFrenzy.fruits=[];
    parent.postMessage({type:'stopEasterEgg'},'*');
    // Re-launch ball — no life lost
    S.ball.x=FW/2;S.ball.y=FH-200;S.ball.vx=(Math.random()-0.5)*4;S.ball.vy=-12;
    S.trail=[];
    return;
  }
  // ── MULTI-BALL: if extra balls exist, promote one to primary (no life lost) ──
  if(S.extraBalls.length>0){
    const promoted=S.extraBalls.shift();
    S.ball.x=promoted.x;S.ball.y=promoted.y;
    S.ball.vx=promoted.vx;S.ball.vy=promoted.vy;
    S.ball.spin=promoted.spin;S.ball.angle=promoted.angle;
    S.trail=[];
    addPop(promoted.x,promoted.y-20,'BALL SAVED!','#00ffcc');
    sfxBallSave();hapticBallSave();
    updCombo();
    return;
  }
  // ── LAMBO RESCUE: if charges banked, use one instead of losing a life ──
  if(lamboCharges>0){
    lamboCharges--;lamboUsed++;
    updLambo();
    if(lamboMode.active){lamboMode.active=false;parent.postMessage({type:'stopEasterEgg'},'*');}
    lamboRescue={active:true,phase:'drive',ticks:0,
      lamboX:270,lamboY:FH+40,golfX:270,golfY:0,golfVy:0,catOff:false};
    S.phase='lamboRescue';
    S.trail=[];S.ballInPlay=false;
    addPop(FW/2,camY+VH/2,'\\u{1F3CE}\\u{FE0F} LAMBO RESCUE! \\u{1F3CE}\\u{FE0F}','#ffd700',true);
    parent.postMessage({type:'playEasterEgg',song:'headgroove'},'*');
    return;
  }
  sfxDrain();hapticDrain();
  shake(6);
  S.lives--;S.combo=0;S.comboTimer=0;S.trail=[];S.ballInPlay=false;
  S.shotMult=1; S.shotLit=0;
  S.ballStats.bestCombo=Math.max(S.ballStats.bestCombo,S.comboMax);
  updLives();updCombo();
  if(S.lives<=0){
    startTally();
    S._afterTally='over';
  } else {
    startTally();
    S._afterTally='dead';
  }
}

function doFX(){
  S.parts=S.parts.filter(p=>p.life-->0);
  S.parts.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=0.16;if(p.spin)p.angle+=p.spin;});
  S.pops=S.pops.filter(p=>p.life-->0);
  S.pops.forEach(p=>p.y-=0.85);
  if(S.flasher.active){S.flasher.ticks--;if(S.flasher.ticks<=0)S.flasher.active=false;}
  if(S.ballSave.active){S.ballSave.ticks--;if(S.ballSave.ticks<=0)S.ballSave.active=false;}
  if(S.spaceMode){S.spaceTicks--;if(S.spaceTicks<=0){S.spaceMode=false;updMode();}}
  if(S.jackpotGate.timer>0)S.jackpotGate.timer--;
  if(S.jackpotGate.timer===0)S.jackpotGate.lit=false;
  // Shockwaves expand and fade
  S.shockwaves=S.shockwaves.filter(sw=>sw.life-->0);
  S.shockwaves.forEach(sw=>{const prog=1-sw.life/sw.ml;sw.r=sw.maxR*prog;});
  // Screen shake decays
  if(S.shake.intensity>0.1){
    S.shake.x=(Math.random()-0.5)*S.shake.intensity;
    S.shake.y=(Math.random()-0.5)*S.shake.intensity;
    S.shake.intensity*=S.shake.decay;
  }else{S.shake.x=0;S.shake.y=0;S.shake.intensity=0;}
  // Lightning fades
  S.lightning=S.lightning.filter(l=>l.life-->0);
  // Recent hits expire
  S.recentHits=S.recentHits.filter(h=>h.life-->0);
}

// ═══════════════════════════════════════════════════════
// TICK
// ═══════════════════════════════════════════════════════
function tick(){
  S.t++;
  S.stars.forEach(s=>s.tw+=s.sp);
  S.bumpers.forEach(bm=>{if(bm.lit>0)bm.lit--;});
  S.muffTargets.forEach(t=>{if(t.lit>0)t.lit--;});
  S.holes.forEach(h=>{if(h.lit>0)h.lit--;});
  S.targets.forEach(t=>{if(t.lit>0)t.lit--;});
  S.leftBank.forEach(t=>{if(t.lit>0)t.lit--;});
  S.rightBank.forEach(t=>{if(t.lit>0)t.lit--;});
  S.rollovers.forEach(r=>{if(typeof r.lit==='number'&&r.lit>0)r.lit--;});
  S.posts.forEach(p=>{if(p.lit>0)p.lit--;});
  S.pegs.forEach(p=>{if(p.lit>0)p.lit--;});
  if(S.shotCooldown>0)S.shotCooldown--;
  if(S.skillShotWindow>0&&S.ballInPlay)S.skillShotWindow--;

  // FOCUS orb — spawn every ~20s if not active/collected
  if(liveUnlocked('focus')&&!focusOrb.active&&!focusOrb.collected&&S.ballInPlay&&S.t%1200===600){
    focusOrb.active=true;
    focusOrb.x=120+Math.random()*(RW-LW-240)+LW;
    focusOrb.y=400+Math.random()*600;
    focusOrb.lit=0;
  }
  if(focusOrb.active) focusOrb.lit=(focusOrb.lit||0)+1;

  // FOCUS mode countdown
  if(focusMode.active){
    focusMode.ticks--;
    if(focusMode.ticks<=0){
      focusMode.active=false;
      focusOrb.collected=false; // ready to spawn again
      addPop(FW/2,camY+VH/2,'FOCUS ENDED','#aaaaaa',false);
      updFocusBtn();
    }
  }

  if(S.novaBurst.active){
    S.novaBurst.ticks--;
    if(S.novaBurst.ticks<=0){S.novaBurst.active=false;updBtn();}
    S.extraBalls.forEach(eb=>{
      if(eb.y>FH-350){const ns=0.65*(eb.y-(FH-350))/350;eb.vy-=ns;if(eb.vy>0)eb.vy*=0.92;}
    });
  }

  // ── ACID TAB EASTER EGG — spawns randomly, rare ──
  if(S.ballInPlay&&!acidTab.active&&!acidMode.active&&S.t>300&&S.t%1800===900&&Math.random()<0.15){
    acidTab.active=true;
    acidTab.x=120+Math.random()*(RW-LW-240)+LW;
    acidTab.y=300+Math.random()*500;
    acidTab.spawnT=S.t;
  }
  if(acidTab.active&&S.t-acidTab.spawnT>600){acidTab.active=false;} // despawn after 10s
  // Acid trip mode timer
  if(acidMode.active){
    acidMode.ticks--;
    if(acidMode.ticks<=0){acidMode.active=false;parent.postMessage({type:'stopEasterEgg'},'*');}
  }
  // Lambo mode timer
  if(lamboMode.active){
    lamboMode.ticks--;
    if(lamboMode.ticks<=0){lamboMode.active=false;parent.postMessage({type:'stopEasterEgg'},'*');}
  }

  // ── HORSESHOE EASTER EGG — spawns randomly, rare ──
  if(S.ballInPlay&&!horseshoe.active&&!stableMode.active&&!acidMode.active&&!lamboMode.active&&S.t>600&&S.t%2400===1200&&Math.random()<0.12){
    horseshoe.active=true;
    horseshoe.x=120+Math.random()*(RW-LW-240)+LW;
    horseshoe.y=350+Math.random()*400;
    horseshoe.spawnT=S.t;
  }
  if(horseshoe.active&&S.t-horseshoe.spawnT>480){horseshoe.active=false;} // despawn after 8s

  // Stable mode timer + horse bumper movement
  if(stableMode.active){
    stableMode.ticks--;
    if(stableMode.ticks<=0){
      stableMode.active=false;
      stableMode.horseBumpers=[];stableMode.finishLine=null;
      parent.postMessage({type:'stopEasterEgg'},'*');
      parent.postMessage({type:'hideStableVideo'},'*');
    }
    // Move horse bumpers around
    stableMode.horseBumpers.forEach(hb=>{
      hb.x+=hb.vx; hb.y+=hb.vy;
      if(hb.x<LW+hb.r+10){hb.x=LW+hb.r+10;hb.vx*=-1;}
      if(hb.x>RW-hb.r-10){hb.x=RW-hb.r-10;hb.vx*=-1;}
      if(hb.y<200){hb.y=200;hb.vy*=-1;}
      if(hb.y>900){hb.y=900;hb.vy*=-1;}
      if(hb.lit>0)hb.lit--;
      // Slight random direction changes
      if(Math.random()<0.02){hb.vx+=(Math.random()-0.5)*0.5;hb.vy+=(Math.random()-0.5)*0.4;}
      hb.vx=Math.max(-2.5,Math.min(2.5,hb.vx));
      hb.vy=Math.max(-2,Math.min(2,hb.vy));
    });
    if(stableMode.finishLine&&stableMode.finishLine.lit>0)stableMode.finishLine.lit--;
  }

  // ── FRUIT TRIGGER — banana on left, apple on right ──
  if(S.ballInPlay&&!fruitTrigger.active&&!fruitFrenzy.active&&!acidMode.active&&!lamboMode.active&&!stableMode.active&&S.t>900&&S.t%3000===1500&&Math.random()<0.14){
    fruitTrigger.active=true;
    fruitTrigger.spawnT=S.t;
    fruitTrigger.banana={x:LW+50,y:500+Math.random()*300,collected:false};
    fruitTrigger.apple={x:RW-50,y:500+Math.random()*300,collected:false};
  }
  if(fruitTrigger.active&&S.t-fruitTrigger.spawnT>720){
    fruitTrigger.active=false;fruitTrigger.banana=null;fruitTrigger.apple=null;
  }

  // Flippers — target angle interpolated by touch power
  S.la_prev=S.la; S.ra_prev=S.ra;
  const lTarget=keys.L ? LF_REST+(LF_ACT-LF_REST)*flipPow.L : LF_REST;
  const rTarget=keys.R ? RF_REST+(RF_ACT-RF_REST)*flipPow.R : RF_REST;
  const dL=lTarget-S.la, dR=rTarget-S.ra;
  const wasL=Math.abs(dL)<0.01, wasR=Math.abs(dR)<0.01;
  // Speed pref makes flippers faster/slower — affects feel and power transfer
  const fspd=FSPD*PREFS.speed;
  // Startup sweep — if flippers are far from rest at game start, animate them in smoothly
  const startupSpd=S.startupFrames>0 ? Math.min(fspd, 0.08+((60-S.startupFrames)/60)*fspd) : fspd;
  if(S.startupFrames>0) S.startupFrames--;
  S.la+=Math.sign(dL)*Math.min(startupSpd,Math.abs(dL));
  S.ra+=Math.sign(dR)*Math.min(startupSpd,Math.abs(dR));
  S.lAngVel=S.la-S.la_prev; S.rAngVel=S.ra-S.ra_prev;
  // Sound on flipper activation
  if(Math.abs(S.lAngVel)>0.05&&!wasL){sfxFlipper();hapticFlipper();}
  if(Math.abs(S.rAngVel)>0.05&&!wasR){sfxFlipper();hapticFlipper();}

  if(S.phase==='menu'){updateCamera(FH*0.6);doFX();return;}
  if(S.phase==='ready'){if(keys.SP)S.plunger=Math.min(1,S.plunger+0.024);updateCamera(LFY+40);doFX();return;}
  if(S.phase==='lamboRescue'){
    tickLamboRescue();
    updateCamera(lamboRescue.phase==='drive'?lamboRescue.lamboY:200);
    doFX();return;
  }
  if(S.phase==='dead'){
    S.deadTimer--;
    if(S.deadTimer<=0){S.ball={x:556,y:FH-120,vx:0,vy:0,spin:0,angle:0};S.phase='ready';S.plunger=0;S.trail=[];S.ballInPlay=false;S.ballSave={active:true,ticks:180};S.skillShotWindow=150;S.skillShotDone=false;S.ballStats={bumperHits:0,targetsHit:0,spins:0,holesHit:0,bestCombo:0,ballScore:0};S.ballStartScore=S.score;S.comboMax=0;updBtn();}
    updateCamera(LFY+40);doFX();return;
  }
  if(S.phase==='over'){updateCamera(LFY+40);doFX();return;}
  if(S.phase==='tally'){
    tickTally();
    if(tallyState&&tallyState.done){
      S._drainMsg=tallyState.drainMsg;
      if(S._afterTally==='over'){S.phase='over';showNameEntry();}
      else{S.phase='dead';S.deadTimer=100;S.ball={x:556,y:FH-120,vx:0,vy:0,spin:0,angle:0};}
      tallyState=null;
    }
    updateCamera(LFY+40);doFX();return;
  }
  if(S.phase==='hole'){
    S.holeTimer--;
    if(S.holeTimer<=0){
      const h=S.holes[S.holeIdx];
      S.ball={x:h.x,y:h.y-38,vx:(Math.random()-0.5)*5,vy:-16};
      S.phase='play';S.holeIdx=-1;
    }
    updateCamera(S.ball.y);doFX();return;
  }

  // ── PHYSICS SUB-STEPS ──
  const b=S.ball;
  const spaceMult=S.spaceMode?0.55:1;

  for(let step=0;step<PHYS;step++){
    // Asymmetric gravity: stronger going up, gentler falling
    const grav=(b.vy<0?GRAV_UP:GRAV_DOWN)*spaceMult/PHYS;
    b.vy+=grav;
    // Rolling drag
    b.vx*=Math.pow(DRAG,1/PHYS);
    b.vy*=Math.pow(DRAG,1/PHYS);
    // Spin decay — rolling friction
    b.spin=(b.spin||0)*Math.pow(SPIN_DECAY,1/PHYS);
    // Speed cap
    const spd=Math.hypot(b.vx,b.vy);
    if(spd>SPEED_CAP){b.vx=b.vx/spd*SPEED_CAP;b.vy=b.vy/spd*SPEED_CAP;}
    b.x+=b.vx/PHYS; b.y+=b.vy/PHYS;
    // Accumulate visual rotation angle from spin
    b.angle=(b.angle||0)+b.spin;

    // LANE
    if(S.phase==='lane'){
      wallBounce(b,SEP,100,SEP,FH,0.6);
      wallBounce(b,LRX,100,LRX,FH,0.6);
      wallBounce(b,SEP,FH-10,LRX,FH-10,0.5);
      if(b.y<TW+4){
        b.vx=-Math.abs(b.vx)-Math.abs(b.vy)*0.5-5;
        b.vy*=0.2;b.y=TW+4;b.x=Math.min(b.x,SEP-BR-2);
        S.phase='play';
      }
      if(b.vy>=-0.3&&b.y>FH-150){
        S.ball={x:556,y:FH-120,vx:0,vy:0,spin:0,angle:0};
        S.phase='ready';S.plunger=0;S.trail=[];S.ballInPlay=false;updBtn();return;
      }
      if(b.y>FH+20){drain();return;}
      continue;
    }

    // WALLS
    if(b.y-BR<TW){b.y=TW+BR;b.vy=Math.abs(b.vy)*0.55;}
    if(S.novaBurst.active&&b.y>FH-350){
      const novaStr=0.65*(b.y-(FH-350))/350;
      b.vy-=novaStr/PHYS;
      if(b.vy>0) b.vy*=0.92;
      if(step===0&&S.t%4===0){
        S.parts.push({x:b.x+(Math.random()-0.5)*40,y:FH-20,vx:(Math.random()-0.5)*3,vy:-4-Math.random()*8,life:25,ml:25,color:'#ffaa00',sz:1.5+Math.random()*2,type:'spark',angle:-Math.PI/2});
      }
    }
    if(b.y>FH+20){drain();return;}
    if(holeInOneGolf.active&&holeInOneGolf.settled&&step===0){
      const gd=Math.hypot(b.x-holeInOneGolf.x,b.y-holeInOneGolf.y);
      if(gd<BR+12){
        S.extraBalls.push({x:holeInOneGolf.x,y:holeInOneGolf.y-10,vx:(Math.random()-0.5)*8,vy:-14-Math.random()*4,spin:0,angle:0,isDog:true});
        dogBallIdx=S.extraBalls.length-1;
        addPop(holeInOneGolf.x,holeInOneGolf.y-20,'\\u{1F415} GOOD BOY! MULTI-BALL! \\u{1F415}','#00ffcc',true);
        burst(holeInOneGolf.x,holeInOneGolf.y,'#ffd700',20);
        shockwave(holeInOneGolf.x,holeInOneGolf.y,100,'#00ffcc',30);
        shake(8);sfxJackpot();
        holeInOneGolf.active=false;holeInOneGolf.settled=false;
      }
    }
    if(b.x-BR<LW){b.x=LW+BR;b.vx=Math.abs(b.vx)*0.72;}
    if(b.x+BR>SEP-4){b.x=SEP-4-BR;b.vx=-Math.abs(b.vx)*0.72;}
    wallBounce(b,LW,TW,RW,TW,0.65);
    wallBounce(b,LW,TW,LW,SL_TOP,0.72);
    wallBounce(b,RW,TW,RW,SL_TOP,0.72);
    wallBounce(b,LW,SL_BT,LW,FH,0.72);
    wallBounce(b,RW,SL_BT,RW,FH,0.72);

    

    // Outlane ball save kickback
    const inLeftOutlane=b.x<LW+BR+4&&b.y>SL_BT;
    const inRightOutlane=b.x>SR_INN+BR+4&&b.x<RW&&b.y>SL_BT;
    if((inLeftOutlane||inRightOutlane)&&S.ballSave.active){
      b.vx=inLeftOutlane?12:-12; b.vy=-15;
      addPop(b.x,b.y-20,'BALL SAVED!','#00ffcc',true);
      flash('#00ffcc',14); sfxBallSave();hapticBallSave();
    }

    // Zone funnel walls — one-way: only deflect ball moving downward, let upward shots through
    if(b.vy>0){
      wallBounce(b,LW,420,80,500,0.75);
      wallBounce(b,RW,420,470,500,0.75);
      wallBounce(b,LW,800,75,870,0.75);
      wallBounce(b,RW,800,475,870,0.75);
      wallBounce(b,LW,1100,80,1150,0.75);
      wallBounce(b,RW,1100,470,1150,0.75);
    }

    // Slingshots
    if(wallBounce(b,LW,SL_TOP,SL_INN,SL_BT,0.95,5)){
      S.score+=60;S.ballInPlay=true;addPop(b.x,b.y-12,'+60','#fff');flash('#ffffff',8);sfxSling();hapticSling();shake(1);shockwave(b.x,b.y,30,'#ffffff',14);updScore();updBtn();
    }
    if(wallBounce(b,RW,SL_TOP,SR_INN,SL_BT,0.95,5)){
      S.score+=60;S.ballInPlay=true;addPop(b.x,b.y-12,'+60','#fff');flash('#ffffff',8);sfxSling();hapticSling();shake(1);shockwave(b.x,b.y,30,'#ffffff',14);updScore();updBtn();
    }
    wallBounce(b,LW,SL_BT,SL_INN,SL_BT,0.7);
    wallBounce(b,SR_INN,SL_BT,RW,SL_BT,0.7);

    // Passive pegs
    S.pegs.forEach(p=>{
      const dx=b.x-p.x,dy=b.y-p.y,d=Math.hypot(dx,dy),mn=BR+p.r;
      if(d<mn&&d>1e-4){
        const nx=dx/d,ny=dy/d;
        b.x=p.x+nx*mn;b.y=p.y+ny*mn;
        const dot=b.vx*nx+b.vy*ny;
        if(dot<0){b.vx-=1.5*dot*nx;b.vy-=1.5*dot*ny;}
        p.lit=15;
      }
    });

    // Kicker posts (small pegs flanking flippers)
    S.posts.forEach(p=>{
      const dx=b.x-p.x,dy=b.y-p.y,d=Math.hypot(dx,dy),mn=BR+p.r;
      if(d<mn&&d>1e-4){
        const nx=dx/d,ny=dy/d;
        b.x=p.x+nx*mn;b.y=p.y+ny*mn;
        const dot=b.vx*nx+b.vy*ny;
        if(dot<0){b.vx-=1.6*dot*nx;b.vy-=1.6*dot*ny;}
        p.lit=20;
      }
    });

    // Ball save center post between flippers
    if(S.ballSave.active){
      const cx=(LFX+FLEN+RFX-FLEN)/2, cy=LFY+14;
      const dx=b.x-cx,dy=b.y-cy,d=Math.hypot(dx,dy),mn=BR+7;
      if(d<mn&&d>1e-4){
        const nx=dx/d,ny=dy/d;
        b.x=cx+nx*mn;b.y=cy+ny*mn;
        const dot=b.vx*nx+b.vy*ny;
        if(dot<0){b.vx-=1.5*dot*nx;b.vy-=1.5*dot*ny;}
      }
    }

    // Flippers (swept angle)
    const frac=(step+1)/PHYS;
    const la_now=S.la_prev+frac*(S.la-S.la_prev);
    const ra_now=S.ra_prev+frac*(S.ra-S.ra_prev);
    flipperCollide(b,LFX,LFY,la_now,S.lAngVel);
    flipperCollide(b,RFX,RFY,ra_now,S.rAngVel);
  }

  // ── AFTER SUB-STEPS: GAME LOGIC ──
  // Trail
  S.trail.push({x:b.x,y:b.y});
  if(S.trail.length>32)S.trail.shift();

  // Bumpers — cooldown prevents infinite ping-pong between adjacent bumpers
  S.bumpers.forEach(bm=>{
    const dx=b.x-bm.x,dy=b.y-bm.y,d=Math.hypot(dx,dy),mn=BR+bm.r;
    if(d<mn&&d>1e-4){
      // Always push ball out
      const nx=dx/d,ny=dy/d;
      b.x=bm.x+nx*mn;b.y=bm.y+ny*mn;
      // Only score/bounce if cooldown expired
      if((bm.cooldown||0)<=0){
        const sp2=Math.hypot(b.vx,b.vy);
        // Dampened eject — just enough to escape, not a full launch
        const ejectSpd=Math.max(sp2*0.85, 7);
        b.vx=nx*ejectSpd; b.vy=ny*ejectSpd;
        bm.lit=30; bm.cooldown=20;
        S.combo++;S.ballInPlay=true;
        S.comboTimer=180; // 3 seconds at 60fps
        S.comboMax=Math.max(S.comboMax,S.combo);
        S.ballStats.bumperHits++;
        const mul=Math.min(S.combo,8);
        const pts=(S.spaceMode?bm.pts*3:bm.pts)*mul;
        S.score+=pts;
        S.jackpotPool=Math.min(99999,(S.jackpotPool||5000)+Math.floor(bm.pts*0.5));
        addPop(bm.x,bm.y-bm.r-6,mul>1?\`+\${pts} ×\${mul}\`:\`+\${pts}\`,bm.color);
        // ── ENHANCED HIT VFX ──
        // Shockwave ring proportional to bumper value
        shockwave(bm.x,bm.y,bm.r*2.5+pts*0.02,bm.color,bm.pts>=400?28:20);
        // Screen shake scales with points
        shake(pts>=400?5:pts>=250?3:1.5);
        // Shaped particles based on bumper type
        if(bm.pts>=400){starBurst(bm.x,bm.y,bm.color,12);}
        else{sparkBurst(bm.x,bm.y,bm.color,8);}
        burst(bm.x,bm.y,bm.color,10);
        // Lightning chains on combo ×3+
        if(mul>=3&&S.recentHits.length>0){
          const last=S.recentHits[S.recentHits.length-1];
          lightning(last.x,last.y,bm.x,bm.y,bm.color,16);
          if(mul>=5&&S.recentHits.length>1){
            const prev=S.recentHits[S.recentHits.length-2];
            lightning(prev.x,prev.y,bm.x,bm.y,'#ffffff',10);
          }
        }
        S.recentHits.push({x:bm.x,y:bm.y,life:90});
        if(S.recentHits.length>5)S.recentHits.shift();
        sfxBumper(pts);hapticBumper(bm.pts);
        updScore();updCombo();updBtn();updJackpot();
      } else {
        // Still deflect but no score — just push away
        const sp2=Math.hypot(b.vx,b.vy);
        b.vx=nx*Math.max(sp2,10);b.vy=ny*Math.max(sp2,10);
      }
    }
    if((bm.cooldown||0)>0) bm.cooldown--;
  });

  // Holes
  S.holes.forEach((h,i)=>{
    if(S.phase==='hole')return;
    const d=Math.hypot(b.x-h.x,b.y-h.y);
    if(d<h.r+2){
      h.lit=90;b.x=h.x;b.y=h.y;b.vx=0;b.vy=0;
      let pts;
      if(i===0){
        // Center jackpot hole — cash the pool
        pts=S.jackpotPool*(S.spaceMode?2:1);
        S.jackpotPool=5000;
        addPop(h.x,h.y-36,\`JACKPOT! +\${pts.toLocaleString()}\`,h.color,true);
        flash('#ffee22',30); sfxJackpot();hapticJackpot();
        updJackpot();
      } else {
        pts=S.spaceMode?h.pts*2:h.pts;
        addPop(h.x,h.y-36,\`+\${pts} BONUS!\`,h.color,true);
        sfxHole();hapticHole();
      }
      S.score+=pts;S.combo=Math.max(0,S.combo-2);
      burst(h.x,h.y,h.color,22);
      shockwave(h.x,h.y,h.r*3.5,h.color,35);
      shake(4);
      updScore();updCombo();
      S.phase='hole';S.holeIdx=i;S.holeTimer=90;
      S.ballStats.holesHit++;
    }
  });

  // ── FOCUS ORB collection ──
  // ── ACID TAB collision ──
  if(acidTab.active){
    const ad=Math.hypot(b.x-acidTab.x,b.y-acidTab.y);
    if(ad<BR+16){
      acidTab.active=false;
      acidMode.active=true; acidMode.ticks=ACID_DUR;
      addPop(acidTab.x,acidTab.y-30,'YOU DIDN\\'T NEED ACID','#ff00ff',true);
      addPop(acidTab.x,acidTab.y-10,'🌈 TRIP MODE 🌈','#00ff88',true);
      burst(acidTab.x,acidTab.y,'#ff00ff',40);
      shockwave(acidTab.x,acidTab.y,180,'#ff00ff',40);
      starBurst(acidTab.x,acidTab.y,'#00ff88',20);
      flash('#ff00ff',40);shake(12);
      sfxJackpot();hapticJackpot();
      S.score+=25000;updScore();
      parent.postMessage({type:'playEasterEgg',song:'acid'},'*');
    }
  }
  // ── HORSESHOE collision ──
  if(horseshoe.active){
    const hd=Math.hypot(b.x-horseshoe.x,b.y-horseshoe.y);
    if(hd<BR+18){
      horseshoe.active=false;
      stableMode.active=true; stableMode.ticks=STABLE_DUR; stableMode.bonusScored=0;
      stableMode.horseBumpers=mkHorseBumpers();
      stableMode.finishLine=mkFinishLine();
      addPop(horseshoe.x,horseshoe.y-30,'HOLD YOUR HORSES!','#d4a574',true);
      addPop(horseshoe.x,horseshoe.y-10,'🐴 STABLE MODE 🐴','#ffd700',true);
      burst(horseshoe.x,horseshoe.y,'#d4a574',40);
      shockwave(horseshoe.x,horseshoe.y,180,'#d4a574',40);
      starBurst(horseshoe.x,horseshoe.y,'#ffd700',20);
      flash('#d4a574',40);shake(12);
      sfxJackpot();hapticJackpot();
      S.score+=15000;updScore();
      parent.postMessage({type:'playEasterEgg',song:'stable'},'*');
      parent.postMessage({type:'showStableVideo'},'*');
    }
  }
  // ── STABLE MODE horse bumper collisions ──
  if(stableMode.active){
    stableMode.horseBumpers.forEach(hb=>{
      const hd2=Math.hypot(b.x-hb.x,b.y-hb.y);
      if(hd2<BR+hb.r&&(hb.cooldown||0)<=0){
        hb.lit=30;hb.cooldown=12;
        const nx=(b.x-hb.x)/hd2,ny=(b.y-hb.y)/hd2;
        const sp3=Math.hypot(b.vx,b.vy);
        b.vx=nx*Math.max(sp3,8);b.vy=ny*Math.max(sp3,8);
        const pts=3000*(S.spaceMode?2:1);
        S.score+=pts;stableMode.bonusScored+=pts;
        addPop(hb.x,hb.y-hb.r-10,'+'+pts+' '+hb.name,'#d4a574');
        burst(hb.x,hb.y,'#d4a574',15);
        sfxBumper(3000);hapticBumper(3000);shake(3);updScore();
      }
      if((hb.cooldown||0)>0)hb.cooldown--;
    });
    // Finish line jackpot
    const fl=stableMode.finishLine;
    if(fl&&!fl.scored){
      if(b.x>fl.x&&b.x<fl.x+fl.w&&b.y>fl.y&&b.y<fl.y+fl.h){
        fl.scored=true;fl.lit=60;
        const flPts=50000*(S.spaceMode?2:1);
        S.score+=flPts;stableMode.bonusScored+=flPts;
        addPop(fl.x+fl.w/2,fl.y-20,'FINISH LINE! +'+flPts.toLocaleString(),'#ffd700',true);
        burst(fl.x+fl.w/2,fl.y+fl.h/2,'#ffd700',35);
        shockwave(fl.x+fl.w/2,fl.y+fl.h/2,160,'#ffd700',30);
        flash('#ffd700',35);shake(10);
        sfxJackpot();hapticJackpot();updScore();
      }
    }
  }
  // ── FRUIT TRIGGER collision (banana left, apple right) ──
  if(fruitTrigger.active){
    const fbn=fruitTrigger.banana;
    const fap=fruitTrigger.apple;
    if(fbn&&!fbn.collected){
      const fd1=Math.hypot(b.x-fbn.x,b.y-fbn.y);
      if(fd1<BR+16){
        fbn.collected=true;
        addPop(fbn.x,fbn.y-20,'\\u{1F34C} BANANA!','#ffe135',true);
        burst(fbn.x,fbn.y,'#ffe135',20);
        sfxBumper(500);shake(3);
        S.score+=5000;updScore();
      }
    }
    if(fap&&!fap.collected){
      const fd2=Math.hypot(b.x-fap.x,b.y-fap.y);
      if(fd2<BR+16){
        fap.collected=true;
        addPop(fap.x,fap.y-20,'\\u{1F34E} APPLE!','#ff4444',true);
        burst(fap.x,fap.y,'#ff4444',20);
        sfxBumper(500);shake(3);
        S.score+=5000;updScore();
      }
    }
    // Both collected — trigger fruit frenzy!
    if(fbn&&fbn.collected&&fap&&fap.collected){
      fruitTrigger.active=false;fruitTrigger.banana=null;fruitTrigger.apple=null;
      fruitFrenzy.active=true;
      fruitFrenzy.fruits=mkFruitField();
      fruitFrenzy.collected=0;
      fruitFrenzy.total=fruitFrenzy.fruits.length;
      fruitFrenzy.score=0;
      // Pick song — alternate if they saw it before, otherwise random
      if(fruitFrenzy.lastSongIdx>=0){
        fruitFrenzy.songIdx=fruitFrenzy.lastSongIdx===0?1:0;
      } else {
        fruitFrenzy.songIdx=Math.random()<0.5?0:1;
      }
      fruitFrenzy.lastSongIdx=fruitFrenzy.songIdx;
      addPop(FW/2,camY+VH/2-40,'\\u{1F34C} FRUIT FRENZY! \\u{1F34E}','#ffd700',true);
      addPop(FW/2,camY+VH/2-10,'COLLECT THEM ALL!','#00ff88',true);
      flash('#ffe135',50);shake(15);
      sfxJackpot();hapticJackpot();
      S.score+=10000;updScore();
      // Re-launch ball to top
      b.x=FW/2;b.y=200;b.vx=(Math.random()-0.5)*6;b.vy=4;
      parent.postMessage({type:'playEasterEgg',song:fruitFrenzy.songIdx===0?'banana1':'banana2'},'*');
    }
  }
  // ── FRUIT FRENZY — collect fruits with ball ──
  if(fruitFrenzy.active){
    fruitFrenzy.fruits.forEach(fr=>{
      if(fr.collected)return;
      const fd3=Math.hypot(b.x-fr.x,b.y-fr.y);
      if(fd3<BR+12){
        fr.collected=true;
        fruitFrenzy.collected++;
        const pts=fr.type==='banana'?2000:2500;
        fruitFrenzy.score+=pts;S.score+=pts;
        const emoji=fr.type==='banana'?'\\u{1F34C}':'\\u{1F34E}';
        const clr=fr.type==='banana'?'#ffe135':'#ff4444';
        addPop(fr.x,fr.y-15,emoji+' +'+pts,clr);
        burst(fr.x,fr.y,clr,8);
        sfxBumper(200);
        updScore();
        // Check if all collected — end frenzy with mega bonus
        if(fruitFrenzy.collected>=fruitFrenzy.total){
          const megaBonus=50000;
          S.score+=megaBonus;
          addPop(FW/2,camY+VH/2-40,'ALL FRUIT COLLECTED!','#ffd700',true);
          addPop(FW/2,camY+VH/2-10,'MEGA BONUS +'+megaBonus.toLocaleString(),'#00ff88',true);
          flash('#ffd700',40);shake(12);
          sfxJackpot();hapticJackpot();
          updScore();
          fruitFrenzy.active=false;fruitFrenzy.fruits=[];
          parent.postMessage({type:'stopEasterEgg'},'*');
        }
      }
    });
  }
  if(focusOrb.active&&!focusOrb.collected){
    const d=Math.hypot(b.x-focusOrb.x,b.y-focusOrb.y);
    if(d<BR+14){
      focusOrb.active=false;
      focusOrb.collected=true;
      addPop(focusOrb.x,focusOrb.y-24,'FOCUS READY!','#00eeff',true);
      burst(focusOrb.x,focusOrb.y,'#00eeff',20);
      flash('#00eeff',16); sfxBallSave();
      updFocusBtn();
    }
  }

  // Drop targets (ABC center)
  S.targets.forEach((t,i)=>{
    if(t.hit)return;
    if(b.x>t.x-BR&&b.x<t.x+t.w+BR&&b.y>t.y-BR&&b.y<t.y+t.h+BR){
      t.hit=true;t.lit=40;S.abcHit[i]=true;S.ballStats.targetsHit++;
      const pts=(S.spaceMode?t.pts*2:t.pts)*S.shotMult;
      S.score+=pts;
      addPop(t.x+t.w/2,t.y-10,\`+\${pts} \${t.lbl}!\`,t.color);
      burst(t.x+t.w/2,t.y,t.color,8);
      b.vy=-Math.abs(b.vy)*0.8;
      updScore();checkABC();updBtn();S.ballInPlay=true;
    }
  });

  // ── MUFF TARGETS — primary skill objective ──
  S.muffTargets.forEach(t=>{
    if(t.lit>0){t.lit--;return;} // already lit = already hit this cycle
    const dx=b.x-t.x, dy=b.y-t.y, d=Math.hypot(dx,dy);
    if(d<BR+t.r){
      const nx=dx/d, ny=dy/d;
      b.x=t.x+nx*(BR+t.r); b.y=t.y+ny*(BR+t.r);
      const dot=b.vx*nx+b.vy*ny;
      if(dot<0){b.vx-=1.6*dot*nx; b.vy-=1.6*dot*ny;}
      if(!S.muff[t.idx]){
        S.muff[t.idx]=true;
        t.lit=60;
        const pts=500*S.shotMult;
        S.score+=pts;
        S.jackpotPool=Math.min(99999,S.jackpotPool+1000);
        addPop(t.x,t.y-20,\`\${t.lbl}! +\${pts}\`,t.color,true);
        burst(t.x,t.y,t.color,16);
        shockwave(t.x,t.y,t.r*3,t.color,24);
        shake(3);
        starBurst(t.x,t.y,t.color,8);
        sfxBumper(pts);hapticMuff(); updScore(); updMuff(); updJackpot(); updBtn();
        S.ballInPlay=true;
        checkMuff();
      }
    }
  });

  // ── SPINNER ──
  {
    const sp=S.spinner;
    const dx=b.x-sp.x, dy=b.y-sp.y, d=Math.hypot(dx,dy);
    if(d<BR+sp.len*0.55){
      // Impart spin based on ball velocity, deflect ball slightly
      const tangent=b.vx*Math.cos(sp.angle+Math.PI/2)+b.vy*Math.sin(sp.angle+Math.PI/2);
      sp.spin+=tangent*0.06;
      sp.spin=Math.max(-0.8,Math.min(0.8,sp.spin));
      // Deflect ball past spinner (low friction pass-through, not bounce)
      b.vx*=0.92; b.vy*=0.92;
      sp.lit=Math.max(sp.lit,20);
    }
    // Spinner physics — decays naturally
    if(Math.abs(sp.spin)>0.002){
      sp.angle+=sp.spin;
      sp.spin*=0.97;
      sp.lit=Math.max(sp.lit,4);
      // Score every ~half revolution
      const revPrev=Math.floor((sp.angle-sp.spin)/(Math.PI));
      const revNow=Math.floor(sp.angle/Math.PI);
      if(revNow!==revPrev&&S.ballInPlay){
        sp.totalSpins++;S.ballStats.spins++;
        const pts=50*(Math.abs(sp.spin)>0.3?2:1);
        S.score+=pts; S.jackpotPool=Math.min(99999,S.jackpotPool+50);
        updScore(); updJackpot();
        if(sp.totalSpins%5===0) addPop(sp.x,sp.y-30,\`SPIN ×\${sp.totalSpins}\`,'#aa44ff');
      }
    }
    if(sp.lit>0) sp.lit--;
  }

  // Left drop bank
  S.leftBank.forEach(t=>{
    if(t.hit)return;
    if(b.x>t.x-BR&&b.x<t.x+t.w+BR&&b.y>t.y-BR&&b.y<t.y+t.h+BR){
      t.hit=true;t.lit=40;
      const pts=t.pts*S.shotMult;
      S.score+=pts;
      addPop(t.x+t.w/2,t.y-10,\`+\${pts}\`,t.color);
      burst(t.x+t.w/2,t.y,t.color,8);
      b.vy=-Math.abs(b.vy)*0.8;
      updScore();checkBank(S.leftBank,'L');updBtn();S.ballInPlay=true;
    }
  });

  // Right drop bank
  S.rightBank.forEach(t=>{
    if(t.hit)return;
    if(b.x>t.x-BR&&b.x<t.x+t.w+BR&&b.y>t.y-BR&&b.y<t.y+t.h+BR){
      t.hit=true;t.lit=40;
      const pts=t.pts*S.shotMult;
      S.score+=pts;
      addPop(t.x+t.w/2,t.y-10,\`+\${pts}\`,t.color);
      burst(t.x+t.w/2,t.y,t.color,8);
      b.vy=-Math.abs(b.vy)*0.8;
      updScore();checkBank(S.rightBank,'R');updBtn();S.ballInPlay=true;
    }
  });

  // Named shot detection — ball moving upward through shot lanes
  if(b.vy<-6&&S.shotCooldown<=0){
    // LEFT lane: near left wall, mid-field height
    if(b.x>LW+5&&b.x<140&&b.y>500&&b.y<1100) namedShot('L');
    // RIGHT lane: near right wall, mid-field height
    else if(b.x>400&&b.x<RW-5&&b.y>500&&b.y<1100) namedShot('R');
    // CENTER: threading the center column upward
    else if(b.x>210&&b.x<330&&b.y>300&&b.y<700) namedShot('C');
  }

  // Rollovers
  S.rollovers.forEach(r=>{
    if(Math.hypot(b.x-r.x,b.y-r.y)<BR+10){
      if(!r.lit){
        r.lit=true;S.ballInPlay=true;
        let pts=100;
        // Skill shot bonus — hit SKILL rollover within launch window
        if(r.isSkill&&S.skillShotWindow>0&&!S.skillShotDone){
          pts=3000;S.skillShotDone=true;
          addPop(r.x,r.y-20,'SKILL SHOT! +3000','#ffee22',true);
          flash('#ffee22',20);sfxJackpot();hapticJackpot();
        } else {
          addPop(r.x,r.y-10,\`+\${pts}\`,r.color);
          sfxRollover();
        }
        S.score+=pts;updScore();updBtn();checkRollovers();
      }
    }
  });

  // Jackpot gate
  const jg=S.jackpotGate;
  if(jg.lit&&b.x>jg.x&&b.x<jg.x+jg.w&&b.y>TW&&b.y<TW+30){
    S.score+=S.jackpot;
    addPop(jg.x+jg.w/2,TW+50,\`JACKPOT! +\${S.jackpot}!\`,'#ffee22',true);
    burst(jg.x+jg.w/2,TW+10,'#ffee22',28);flash('#ffee22',28);sfxJackpot();hapticJackpot();
    jg.lit=false;S.jackpot=Math.min(S.jackpot+1000,20000);
    S.spaceMode=true;S.spaceTicks=600;
    updScore();updMode();
  }

  // Space mode activation from UFO bumper
  if(!S.spaceMode&&S.combo>=5){
    S.spaceMode=true;S.spaceTicks=400;sfxSpaceMode();updMode();
  }

  // Combo timer decay
  if(S.comboTimer>0){
    S.comboTimer--;
    if(S.comboTimer<=0&&S.combo>0){S.combo=0;updCombo();}
  }
  // Also reset if ball stuck near drain
  if(b.y>SL_BT&&Math.hypot(b.vx,b.vy)<1.5){S.combo=0;S.comboTimer=0;updCombo();}

  // Anti-stuck: if ball barely moving while in play, escape kick
  const spd=Math.hypot(b.vx,b.vy);
  if(S.phase==='play'&&spd<1.2){
    S.stuckFrames=(S.stuckFrames||0)+1;
    if(S.stuckFrames>40){
      const ang=-Math.PI/2 + (Math.random()-0.5)*Math.PI*0.8;
      b.vx=Math.cos(ang)*10;
      b.vy=Math.sin(ang)*10;
      S.stuckFrames=0;
    }
  } else {
    S.stuckFrames=0;
  }

  // ── CHARACTER BALL HOLDS ──
  S.catches.forEach(c=>{
    if(c.used||c.holding) return;
    const d=Math.hypot(b.x-c.x,b.y-c.y);
    if(d<BR+c.r){
      c.holding=true; c.used=true;
      c.holdX=b.x; c.holdY=b.y;
      S.catchBallIdx=-1;
      b.vx=0;b.vy=0;b.x=c.x;b.y=c.y;

      if(c.id==='rocket'){
        // ── ROCKET: math challenge — reward depends on answer ──
        c.timer=9999;
        c.dialogue=pick(ROCKET_LINES);
        addPop(c.x,c.y-30,c.dialogue,c.color,true);
        burst(c.x,c.y,c.color,14);
        shockwave(c.x,c.y,c.r*2.5,c.color,25);
        shake(3);
        sfxHole();hapticMuff();
        setTimeout(()=>showMathChallenge(),600);
      } else if(c.id==='cat'){
        c.timer=120; // hold a bit longer for dialogue
        c.dialogue=pick(CAT_LINES);
        S.lives=Math.min(5,S.lives+1);
        addPop(c.x,c.y-30,'FREE BALL!',c.color,true);
        addPop(c.x,c.y-50,c.dialogue,'#ffaacc');
        burst(c.x,c.y,c.color,18);
        shockwave(c.x,c.y,c.r*2.5,c.color,25);
        shake(3);
        sfxHole();hapticBallSave();
        updLives();
      } else if(c.id==='ufo'){
        c.timer=120;
        c.dialogue=pick(UFO_LINES);
        S.lives=Math.min(5,S.lives+1);
        addPop(c.x,c.y-30,'FREE BALL!',c.color,true);
        addPop(c.x,c.y-50,c.dialogue,'#88ff88');
        burst(c.x,c.y,c.color,18);
        shockwave(c.x,c.y,c.r*2.5,c.color,25);
        shake(3);
        sfxHole();hapticBallSave();
        updLives();
      } else {
        // ── Fallback ──
        c.timer=90;
        S.lives=Math.min(5,S.lives+1);
        addPop(c.x,c.y-30,'FREE BALL!',c.color,true);
        burst(c.x,c.y,c.color,18);
        shockwave(c.x,c.y,c.r*2.5,c.color,25);
        shake(3);
        sfxHole();hapticBallSave();
        updLives();
      }
    }
  });
  // Tick down active holds — eject ball when done (non-rocket only, rocket ejected by math system)
  S.catches.forEach(c=>{
    if(!c.holding) return;
    if(c.id==='rocket') return; // math system handles ejection
    c.timer--;
    if(c.timer<=0){
      c.holding=false;
      // Eject ball upward with some randomness
      b.x=c.x; b.y=c.y-c.r-BR-4;
      b.vx=(Math.random()-0.5)*8;
      b.vy=-14-Math.random()*4;
      addPop(c.x,c.y-40,'GO!',c.color);
      burst(c.x,c.y-20,c.color,10);
      sfxLaunch();hapticFlipper();
    }
  });
  // Freeze primary ball if being held
  const heldBy=S.catches.find(c=>c.holding&&S.catchBallIdx===-1);
  if(heldBy){b.x=heldBy.x;b.y=heldBy.y;b.vx=0;b.vy=0;}

  // ── EXTRA BALL PHYSICS ──
  for(let ei=S.extraBalls.length-1;ei>=0;ei--){
    const eb=S.extraBalls[ei];
    // Simplified physics — same gravity, walls, bumpers, flippers
    const spaceMult2=S.spaceMode?0.55:1;
    for(let step=0;step<PHYS;step++){
      const grav2=(eb.vy<0?GRAV_UP:GRAV_DOWN)*spaceMult2/PHYS;
      eb.vy+=grav2;
      eb.vx*=Math.pow(DRAG,1/PHYS);eb.vy*=Math.pow(DRAG,1/PHYS);
      eb.spin=(eb.spin||0)*Math.pow(SPIN_DECAY,1/PHYS);
      const spd2=Math.hypot(eb.vx,eb.vy);
      if(spd2>SPEED_CAP){eb.vx=eb.vx/spd2*SPEED_CAP;eb.vy=eb.vy/spd2*SPEED_CAP;}
      eb.x+=eb.vx/PHYS; eb.y+=eb.vy/PHYS;
      eb.angle=(eb.angle||0)+eb.spin;
      // Walls
      if(eb.y-BR<TW){eb.y=TW+BR;eb.vy=Math.abs(eb.vy)*0.55;}
      if(eb.x-BR<LW){eb.x=LW+BR;eb.vx=Math.abs(eb.vx)*0.72;}
      if(eb.x+BR>SEP-4){eb.x=SEP-4-BR;eb.vx=-Math.abs(eb.vx)*0.72;}
      wallBounce(eb,LW,TW,RW,TW,0.65);
      wallBounce(eb,LW,TW,LW,SL_TOP,0.72);
      wallBounce(eb,RW,TW,RW,SL_TOP,0.72);
      wallBounce(eb,LW,SL_BT,LW,FH,0.72);
      wallBounce(eb,RW,SL_BT,RW,FH,0.72);
      wallBounce(eb,LW,SL_TOP,SL_INN,SL_BT,0.95,3);
      wallBounce(eb,RW,SL_TOP,SR_INN,SL_BT,0.95,3);
      if(eb.vy>0){
        wallBounce(eb,LW,420,80,500,0.75);
        wallBounce(eb,RW,420,470,500,0.75);
        wallBounce(eb,LW,800,75,870,0.75);
        wallBounce(eb,RW,800,475,870,0.75);
        wallBounce(eb,LW,1100,80,1150,0.75);
        wallBounce(eb,RW,1100,470,1150,0.75);
      }
      // Flippers
      const frac2=(step+1)/PHYS;
      const la2=S.la_prev+frac2*(S.la-S.la_prev);
      const ra2=S.ra_prev+frac2*(S.ra-S.ra_prev);
      const ebSpeedBefore=Math.hypot(eb.vx,eb.vy);
      flipperCollide(eb,LFX,LFY,la2,S.lAngVel);
      flipperCollide(eb,RFX,RFY,ra2,S.rAngVel);
      const ebSpeedAfter=Math.hypot(eb.vx,eb.vy);
      if(eb.isDog&&step===0&&ebSpeedAfter>ebSpeedBefore+3){
        addPop(eb.x,eb.y-20,pick(DOG_LINES),'#ffcc44');
        S.score+=5000;updScore();
        if(stableMode.active&&stableMode.horseBumpers.length>0){
          let nearest=null,nd=Infinity;
          stableMode.horseBumpers.forEach(h=>{
            const hd=Math.hypot(eb.x-h.x,eb.y-h.y);
            if(hd<nd){nd=hd;nearest=h;}
          });
          if(nearest){
            const catX=55,catY=165;
            const ang=Math.atan2(catY-nearest.y,catX-nearest.x);
            nearest.vx=Math.cos(ang)*4;nearest.vy=Math.sin(ang)*4;
            addPop(nearest.x,nearest.y-20,'\\u{1F40E} BACK TO STABLE!','#d4a574');
          }
        }
      }
    }
    // Extra ball bumper scoring
    S.bumpers.forEach(bm=>{
      const dx2=eb.x-bm.x,dy2=eb.y-bm.y,d2=Math.hypot(dx2,dy2),mn2=BR+bm.r;
      if(d2<mn2&&d2>1e-4){
        const nx2=dx2/d2,ny2=dy2/d2;
        eb.x=bm.x+nx2*mn2;eb.y=bm.y+ny2*mn2;
        const sp3=Math.hypot(eb.vx,eb.vy);
        eb.vx=nx2*Math.max(sp3*0.85,7);eb.vy=ny2*Math.max(sp3*0.85,7);
        if((bm.cooldown||0)<=0){
          bm.lit=30;bm.cooldown=20;
          const pts2=S.spaceMode?bm.pts*3:bm.pts;
          S.score+=pts2;
          S.jackpotPool=Math.min(99999,(S.jackpotPool||5000)+Math.floor(bm.pts*0.3));
          addPop(bm.x,bm.y-bm.r-6,\`+\${pts2}\`,bm.color);
          burst(bm.x,bm.y,bm.color,6);
          shockwave(bm.x,bm.y,bm.r*2,bm.color,16);
          sfxBumper(pts2);hapticBumper(bm.pts);
          updScore();updJackpot();
        }
      }
    });
    // Extra ball drain — just remove it, no life lost
    if(eb.y>FH+20){
      S.extraBalls.splice(ei,1);
      updCombo();
      if(S.extraBalls.length===0){
        addPop(FW/2,FH-100,'MULTI-BALL OVER','#556',false);
      }
    }
  }

  updateCamera(b.y);
  updMode();
  doFX();
}

// ═══════════════════════════════════════════════════════
// DRAW HELPERS
// ═══════════════════════════════════════════════════════
// roundRect polyfill — ctx.roundRect not available in all mobile webviews
function rrect(x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.lineTo(x+w-r,y);ctx.arcTo(x+w,y,x+w,y+r,r);
  ctx.lineTo(x+w,y+h-r);ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
  ctx.lineTo(x+r,y+h);ctx.arcTo(x,y+h,x,y+h-r,r);
  ctx.lineTo(x,y+r);ctx.arcTo(x,y,x+r,y,r);
  ctx.closePath();
}

// ═══════════════════════════════════════════════════════
// CHARACTER ART (canvas-drawn sprites)
// ═══════════════════════════════════════════════════════
function drawCatAstronaut(x,y,scale,t){
  ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
  const bob=Math.sin(t*0.04)*3;
  ctx.translate(0,bob);
  // Space suit body
  ctx.fillStyle='#cc2266';
  ctx.beginPath();ctx.ellipse(0,8,14,16,0,0,6.28);ctx.fill();
  // Helmet
  ctx.shadowColor='#88ddff';ctx.shadowBlur=10;
  ctx.beginPath();ctx.arc(0,-6,16,0,6.28);
  ctx.fillStyle='rgba(140,200,255,0.25)';ctx.fill();
  ctx.strokeStyle='#aaddff';ctx.lineWidth=2;ctx.stroke();
  ctx.shadowBlur=0;
  // Cat face inside helmet
  ctx.fillStyle='#e8883a';
  ctx.beginPath();ctx.ellipse(0,-6,10,9,0,0,6.28);ctx.fill();
  // Ears
  ctx.beginPath();ctx.moveTo(-9,-13);ctx.lineTo(-5,-19);ctx.lineTo(-2,-13);ctx.closePath();ctx.fill();
  ctx.beginPath();ctx.moveTo(9,-13);ctx.lineTo(5,-19);ctx.lineTo(2,-13);ctx.closePath();ctx.fill();
  // Eyes
  ctx.fillStyle='#222';
  ctx.beginPath();ctx.ellipse(-4,-6,2.5,2,0,0,6.28);ctx.fill();
  ctx.beginPath();ctx.ellipse(4,-6,2.5,2,0,0,6.28);ctx.fill();
  // Eye shine
  ctx.fillStyle='#fff';
  ctx.beginPath();ctx.arc(-3,-7,0.8,0,6.28);ctx.fill();
  ctx.beginPath();ctx.arc(5,-7,0.8,0,6.28);ctx.fill();
  // Nose & mouth
  ctx.fillStyle='#ff6688';ctx.beginPath();ctx.arc(0,-4,1.5,0,6.28);ctx.fill();
  ctx.strokeStyle='#884422';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(0,-2.5);ctx.lineTo(-3,0);ctx.moveTo(0,-2.5);ctx.lineTo(3,0);ctx.stroke();
  // Gun arm
  ctx.save();ctx.translate(16,4);ctx.rotate(-0.3+Math.sin(t*0.06)*0.1);
  ctx.fillStyle='#ffaa00';ctx.fillRect(0,-3,22,6);
  ctx.fillStyle='#ffee00';ctx.fillRect(18,-4,8,8);
  // Gun glow
  ctx.shadowColor='#ffaa00';ctx.shadowBlur=8;
  ctx.fillStyle='rgba(255,180,0,0.5)';ctx.beginPath();ctx.arc(26,0,5,0,6.28);ctx.fill();
  ctx.restore();
  // Suit belt/details
  ctx.strokeStyle='#ff4488';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(-14,4);ctx.lineTo(14,4);ctx.stroke();
  ctx.fillStyle='#ffee22';ctx.beginPath();ctx.arc(0,4,3,0,6.28);ctx.fill();
  ctx.restore();
}

function drawUFO(x,y,scale,t){
  ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
  const hover=Math.sin(t*0.05)*4;
  ctx.translate(0,hover);
  // Beam
  const beam=ctx.createLinearGradient(0,8,0,50);
  beam.addColorStop(0,'rgba(100,255,150,0.35)');beam.addColorStop(1,'rgba(100,255,150,0)');
  ctx.fillStyle=beam;
  ctx.beginPath();ctx.moveTo(-8,8);ctx.lineTo(-22,50);ctx.lineTo(22,50);ctx.lineTo(8,8);ctx.closePath();ctx.fill();
  // Saucer bottom
  ctx.shadowColor='#00ff88';ctx.shadowBlur=14;
  ctx.fillStyle='#334433';
  ctx.beginPath();ctx.ellipse(0,4,28,8,0,0,6.28);ctx.fill();
  // Lights on saucer rim
  [-20,-12,-4,4,12,20].forEach((lx,i)=>{
    const lc=\`hsl(\${(i*60+t*3)%360},100%,65%)\`;
    ctx.fillStyle=lc;ctx.beginPath();ctx.arc(lx,4,2.5,0,6.28);ctx.fill();
  });
  // Dome
  ctx.shadowColor='#88ff88';ctx.shadowBlur=8;
  ctx.fillStyle='rgba(150,255,150,0.2)';
  ctx.beginPath();ctx.ellipse(0,-4,18,12,0,0,Math.PI);ctx.fill();
  ctx.strokeStyle='#44ff88';ctx.lineWidth=1.5;ctx.stroke();
  // Alien inside dome
  ctx.fillStyle='#44cc44';ctx.beginPath();ctx.ellipse(0,-4,8,7,0,0,6.28);ctx.fill();
  ctx.fillStyle='#000';
  ctx.beginPath();ctx.ellipse(-3,-5,2.5,3,0,0,6.28);ctx.fill();
  ctx.beginPath();ctx.ellipse(3,-5,2.5,3,0,0,6.28);ctx.fill();
  ctx.fillStyle='#88ff88';ctx.beginPath();ctx.arc(-2.5,-5,1,0,6.28);ctx.fill();
  ctx.beginPath();ctx.arc(3.5,-5,1,0,6.28);ctx.fill();
  ctx.restore();
}

function drawRocket(x,y,scale,t){
  ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
  const wobble=Math.sin(t*0.07)*2;
  ctx.translate(wobble,0);
  // Flame
  const flameH=18+Math.sin(t*0.2)*5;
  ctx.shadowColor='#ff6600';ctx.shadowBlur=16;
  ctx.fillStyle='#ff4400';
  ctx.beginPath();ctx.moveTo(-6,28);ctx.lineTo(0,28+flameH);ctx.lineTo(6,28);ctx.closePath();ctx.fill();
  ctx.fillStyle='#ffee00';
  ctx.beginPath();ctx.moveTo(-3,28);ctx.lineTo(0,28+flameH*0.6);ctx.lineTo(3,28);ctx.closePath();ctx.fill();
  ctx.shadowBlur=0;
  // Body
  ctx.fillStyle='#cc2244';
  ctx.beginPath();rrect(-8,-10,16,38,4);ctx.fill();
  // Nose
  ctx.fillStyle='#ff4466';
  ctx.beginPath();ctx.moveTo(-8,-10);ctx.quadraticCurveTo(-8,-30,0,-36);ctx.quadraticCurveTo(8,-30,8,-10);ctx.closePath();ctx.fill();
  // Window
  ctx.shadowColor='#88ddff';ctx.shadowBlur=6;
  ctx.fillStyle='rgba(140,210,255,0.5)';ctx.strokeStyle='#aaddff';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.arc(0,-2,5,0,6.28);ctx.fill();ctx.stroke();
  ctx.shadowBlur=0;
  // Fins
  ctx.fillStyle='#881133';
  ctx.beginPath();ctx.moveTo(-8,20);ctx.lineTo(-18,32);ctx.lineTo(-8,28);ctx.closePath();ctx.fill();
  ctx.beginPath();ctx.moveTo(8,20);ctx.lineTo(18,32);ctx.lineTo(8,28);ctx.closePath();ctx.fill();
  // Star on side
  ctx.fillStyle='#ffee22';ctx.font='bold 8px sans-serif';ctx.textAlign='center';
  ctx.fillText('★',0,8);
  ctx.restore();
}

function drawPlanetEarth(x,y,r,t){
  ctx.save();ctx.translate(x,y);
  // Base ocean
  ctx.shadowColor='#0066ff';ctx.shadowBlur=20;
  ctx.beginPath();ctx.arc(0,0,r,0,6.28);
  ctx.fillStyle='#0044aa';ctx.fill();
  ctx.shadowBlur=0;
  // Continents (static shapes)
  ctx.fillStyle='#228844';ctx.beginPath();ctx.ellipse(-r*0.2,-r*0.1,r*0.35,r*0.25,-0.3,0,6.28);ctx.fill();
  ctx.beginPath();ctx.ellipse(r*0.25,r*0.15,r*0.2,r*0.28,0.4,0,6.28);ctx.fill();
  ctx.beginPath();ctx.ellipse(-r*0.1,r*0.3,r*0.15,r*0.12,0,0,6.28);ctx.fill();
  // Cloud swirls
  ctx.fillStyle='rgba(255,255,255,0.18)';
  ctx.beginPath();ctx.ellipse(r*0.1,-r*0.3,r*0.4,r*0.08,Math.sin(t*0.01)*0.5,0,6.28);ctx.fill();
  ctx.beginPath();ctx.ellipse(-r*0.2,r*0.1,r*0.3,r*0.06,0.3,0,6.28);ctx.fill();
  // Atmosphere glow
  ctx.beginPath();ctx.arc(0,0,r+4,0,6.28);
  ctx.strokeStyle='rgba(100,180,255,0.25)';ctx.lineWidth=6;ctx.stroke();
  // Clip to circle
  ctx.beginPath();ctx.arc(0,0,r,0,6.28);ctx.strokeStyle='#1166cc';ctx.lineWidth=2;ctx.stroke();
  ctx.restore();
}

function drawArtLayer(t, clipped_top, clipped_bot){
  const catches=S.catches||[];
  const catC=catches.find(c=>c.id==='cat');
  const ufoC=catches.find(c=>c.id==='ufo');
  const rktC=catches.find(c=>c.id==='rocket');

  if(80<clipped_bot&&280>clipped_top){
    const avail=catC&&!catC.used;
    const holding=catC&&catC.holding;
    const alpha=holding?0.9:avail?0.65+0.15*Math.sin(t*0.08):0.3;
    ctx.save();ctx.globalAlpha=alpha;
    drawCatAstronaut(55,165,0.9,t);
    if(avail&&!holding){
      // Subtle beacon ring
      ctx.globalAlpha=0.2+0.15*Math.sin(t*0.1);
      ctx.strokeStyle='#ff88aa';ctx.lineWidth=1.5;ctx.shadowColor='#ff88aa';ctx.shadowBlur=12;
      ctx.beginPath();ctx.arc(55,165,28,0,6.28);ctx.stroke();
    }
    if(holding){
      // Hold glow pulse
      const hp=0.5+0.5*Math.sin(t*0.2);
      ctx.globalAlpha=hp*0.4;
      ctx.fillStyle='#ff88aa';ctx.shadowColor='#ff88aa';ctx.shadowBlur=30;
      ctx.beginPath();ctx.arc(55,165,30,0,6.28);ctx.fill();
    }
    ctx.restore();
  }
  if(480<clipped_bot&&700>clipped_top){
    const avail=ufoC&&!ufoC.used;
    const holding=ufoC&&ufoC.holding;
    const alpha=holding?0.9:avail?0.6+0.15*Math.sin(t*0.07):0.25;
    ctx.save();ctx.globalAlpha=alpha;
    drawUFO(472,580,0.8,t);
    if(avail&&!holding){
      ctx.globalAlpha=0.2+0.12*Math.sin(t*0.09);
      ctx.strokeStyle='#44ff88';ctx.lineWidth=1.5;ctx.shadowColor='#44ff88';ctx.shadowBlur=12;
      ctx.beginPath();ctx.arc(472,580,30,0,6.28);ctx.stroke();
    }
    if(holding){
      const hp=0.5+0.5*Math.sin(t*0.2);
      ctx.globalAlpha=hp*0.4;
      ctx.fillStyle='#44ff88';ctx.shadowColor='#44ff88';ctx.shadowBlur=30;
      ctx.beginPath();ctx.arc(472,580,32,0,6.28);ctx.fill();
    }
    ctx.restore();
  }
  if(650<clipped_bot&&900>clipped_top){
    ctx.save();ctx.globalAlpha=0.13;drawPlanetEarth(100,760,80,t);ctx.restore();
  }
  if(850<clipped_bot&&1050>clipped_top){
    const avail=rktC&&!rktC.used;
    const holding=rktC&&rktC.holding;
    const alpha=holding?0.85:avail?0.55+0.15*Math.sin(t*0.06):0.25;
    ctx.save();ctx.globalAlpha=alpha;
    drawRocket(38,940,0.85,t);
    if(avail&&!holding){
      ctx.globalAlpha=0.2+0.12*Math.sin(t*0.08);
      ctx.strokeStyle='#ff4466';ctx.lineWidth=1.5;ctx.shadowColor='#ff4466';ctx.shadowBlur=12;
      ctx.beginPath();ctx.arc(38,940,28,0,6.28);ctx.stroke();
    }
    if(holding){
      const hp=0.5+0.5*Math.sin(t*0.2);
      ctx.globalAlpha=hp*0.4;
      ctx.fillStyle='#ff4466';ctx.shadowColor='#ff4466';ctx.shadowBlur=30;
      ctx.beginPath();ctx.arc(38,940,30,0,6.28);ctx.fill();
    }
    ctx.restore();
  }
  if(1200<clipped_bot&&1380>clipped_top){
    ctx.save();ctx.globalAlpha=0.38;drawUFO(470,1270,0.65,t+100);ctx.restore();
  }
}


// ═══════════════════════════════════════════════════════
// DRAW
// ═══════════════════════════════════════════════════════
function draw(){
  ctx.clearRect(0,0,VW,VH);

  // ── PERSPECTIVE TABLE EFFECT ──
  // Fake a forward-angled pinball table by applying a vertical trapezoid:
  // The top of the viewport is slightly narrower than the bottom.
  // We achieve this with a custom setTransform per visible row — but that's
  // expensive. Instead we use a single skew matrix that tilts the field
  // slightly toward the viewer. Combined with the camera scroll it gives
  // a satisfying "looking down at a table" feel.
  ctx.save();
  // Shift origin to bottom-center, apply perspective scale, shift back
  const vy_norm=(camY)/(FH); // 0 at top of field, 1 at bottom
  // Table tilt: top rows squished by ~10%, bottom rows normal
  const tilt=0.08;
  const sx=1.0-tilt*(1-vy_norm)*0.5; // subtle x-squish at top
  ctx.transform(sx, 0, 0, 1, FW*(1-sx)*0.5, 0);
  ctx.translate(S.shake.x||0,(-camY)+(S.shake.y||0));

  // ── BACKGROUND ──
  const focusZoomD=focusMode.active?1.25:1.0;
  const effVH=Math.round((VH/PREFS.zoom)/focusZoomD);
  const clipped_top=camY, clipped_bot=camY+effVH;

  // Deep space bg
  ctx.fillStyle='#000508';
  ctx.fillRect(0,clipped_top,FW,VH);

  // ── SUBTLE PERSPECTIVE GRID (depth cue) ──
  ctx.save();ctx.globalAlpha=0.025;ctx.strokeStyle='#2244aa';ctx.lineWidth=0.5;
  for(let gy=Math.floor(clipped_top/80)*80;gy<clipped_bot;gy+=80){
    ctx.beginPath();ctx.moveTo(LW,gy);ctx.lineTo(RW,gy);ctx.stroke();
  }
  for(let gx=LW;gx<=RW;gx+=60){
    ctx.beginPath();ctx.moveTo(gx,clipped_top);ctx.lineTo(gx,clipped_bot);ctx.stroke();
  }
  ctx.restore();

  // Nebula zones (richer, multi-layered)
  const nebulas=[
    [268,200,300,'rgba(100,0,150,0.14)'],
    [268,200,180,'rgba(0,60,140,0.10)'],
    [150,200,120,'rgba(180,0,100,0.06)'],
    [100,560,180,'rgba(0,110,80,0.10)'],
    [460,620,160,'rgba(0,80,120,0.12)'],
    [268,680,200,'rgba(80,0,160,0.08)'],
    [268,900,240,'rgba(140,60,0,0.12)'],
    [95, 980,160,'rgba(120,40,0,0.10)'],
    [460,1040,160,'rgba(100,30,0,0.10)'],
    [268,1280,220,'rgba(160,0,0,0.14)'],
    [180,1200,100,'rgba(200,0,40,0.06)'],
  ];
  nebulas.forEach(([cx,cy,r,c])=>{
    if(cy+r<clipped_top||cy-r>clipped_bot)return;
    const g=ctx.createRadialGradient(cx,cy,4,cx,cy,r);
    g.addColorStop(0,c);g.addColorStop(1,'transparent');
    ctx.fillStyle=g;ctx.fillRect(0,clipped_top,FW,VH);
  });

  // Stars (color-varied, with occasional bright ones)
  S.stars.forEach((s,si)=>{
    if(s.y<clipped_top-4||s.y>clipped_bot+4)return;
    const a=0.15+0.85*(0.5+0.5*Math.sin(s.tw));
    ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,6.28);
    // Vary star colors subtly
    const hueShift=si%5;
    const colors=['200,218,255','220,200,255','255,220,200','180,220,255','200,255,220'];
    ctx.fillStyle=\`rgba(\${colors[hueShift]},\${a.toFixed(2)})\`;ctx.fill();
    // Bright stars get a glow cross
    if(s.r>1.4&&a>0.7){
      ctx.save();ctx.strokeStyle=\`rgba(\${colors[hueShift]},\${(a*0.3).toFixed(2)})\`;
      ctx.lineWidth=0.5;
      ctx.beginPath();ctx.moveTo(s.x-s.r*3,s.y);ctx.lineTo(s.x+s.r*3,s.y);ctx.stroke();
      ctx.beginPath();ctx.moveTo(s.x,s.y-s.r*3);ctx.lineTo(s.x,s.y+s.r*3);ctx.stroke();
      ctx.restore();
    }
  });

  // Space mode shimmer + warp lines (fades out near flippers for visibility)
  if(S.spaceMode){
    const sm=0.04+0.04*Math.sin(S.t*0.15);
    // Gradient: full effect top of view, fades to zero at bottom third
    const smGrad=ctx.createLinearGradient(0,clipped_top,0,clipped_top+VH);
    smGrad.addColorStop(0,\`rgba(100,0,200,\${sm})\`);
    smGrad.addColorStop(0.55,\`rgba(100,0,200,\${sm})\`);
    smGrad.addColorStop(0.85,\`rgba(100,0,200,\${sm*0.15})\`);
    smGrad.addColorStop(1,'rgba(100,0,200,0)');
    ctx.fillStyle=smGrad;
    ctx.fillRect(0,clipped_top,FW,VH);
    // Animated warp streaks — only in upper 70%
    ctx.save();ctx.globalAlpha=0.06;ctx.strokeStyle='#aa66ff';ctx.lineWidth=1;
    const warpZone=VH*0.65;
    for(let i=0;i<6;i++){
      const wy=clipped_top+((S.t*3+i*120)%warpZone);
      ctx.beginPath();ctx.moveTo(LW,wy);ctx.lineTo(RW,wy);ctx.stroke();
    }
    ctx.restore();
  }

  // ── CHARACTER ART (behind everything else) ──
  drawArtLayer(S.t, clipped_top, clipped_bot);

  // ── SECTION LABELS (faint art) ──
  ctx.save();ctx.globalAlpha=0.04;ctx.fillStyle='#aaaaff';ctx.textAlign='center';
  ctx.font='bold 32px monospace';
  ctx.fillText('✦ JACKPOT ZONE ✦',268,250);
  ctx.fillStyle='#aaffee';ctx.fillText('NEBULA FIELDS',268,620);
  ctx.fillStyle='#ffaa44';ctx.fillText('ASTEROID BELT',268,980);
  ctx.fillStyle='#ff4444';ctx.fillText('⚠ DANGER ZONE ⚠',268,1350);
  ctx.globalAlpha=1;ctx.restore();

  // ── WALLS ──
  ctx.save();
  ctx.shadowColor='#0a1866';ctx.shadowBlur=20;
  ctx.strokeStyle='#141e66';ctx.lineWidth=2.5;ctx.lineCap='round';
  const wallSegs=[
    [LW,TW,RW,TW],
    [LW,TW,LW,SL_TOP],[RW,TW,RW,SL_TOP],
    [LW,SL_BT,LW,FH],[RW,SL_BT,RW,FH],
    [SEP,100,SEP,FH],[LRX,100,LRX,FH],[SEP,FH-10,LRX,FH-10],
    [LW,420,80,500],[RW,420,470,500],
    [LW,800,75,870],[RW,800,475,870],
    [LW,1100,80,1150],[RW,1100,470,1150],
  ];
  wallSegs.forEach(([x1,y1,x2,y2])=>{
    if(Math.max(y1,y2)<clipped_top-20||Math.min(y1,y2)>clipped_bot+20)return;
    ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
  });
  // Arch from launch lane
  ctx.beginPath();ctx.moveTo(SEP,100);ctx.quadraticCurveTo(SEP-10,TW+2,RW,TW);ctx.stroke();
  ctx.restore();

  // ── PASSIVE PEGS ──
  S.pegs.forEach(p=>{
    if(p.y<clipped_top-10||p.y>clipped_bot+10)return;
    const lit=(p.lit||0)/15;
    ctx.save();
    ctx.shadowColor='#4466ff';ctx.shadowBlur=lit*20+3;
    ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,6.28);
    ctx.fillStyle=lit>0?'#6688ff':'#0d1a3a';ctx.fill();
    ctx.strokeStyle=lit>0?'#aabbff':'#1a2a55';ctx.lineWidth=1.5;ctx.stroke();
    ctx.restore();
  });

  // ── KICKER POSTS ──
  S.posts.forEach(p=>{
    if(p.y<clipped_top-20||p.y>clipped_bot+20)return;
    const lit=(p.lit||0)/20;
    ctx.save();
    ctx.shadowColor=p.color;ctx.shadowBlur=lit*28+6;
    ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,6.28);
    ctx.fillStyle=lit>0?p.color:'#0a2a22';ctx.fill();
    ctx.strokeStyle=p.color;ctx.lineWidth=2;ctx.stroke();
    ctx.restore();
  });

  // ── RAMPS — two parallel glowing walls forming a physical channel ──
  if(S.ballSave.active&&LFY<clipped_bot&&LFY>clipped_top-40){
    const cx=(LFX+FLEN+RFX-FLEN)/2, cy=LFY+14;
    const pulse=0.6+0.4*Math.sin(S.t*0.2);
    const saveAlpha=Math.min(1,S.ballSave.ticks/60); // fade out
    ctx.save();
    ctx.globalAlpha=saveAlpha;
    ctx.shadowColor='#00ffcc';ctx.shadowBlur=20*pulse;
    ctx.beginPath();ctx.arc(cx,cy,7,0,6.28);
    ctx.fillStyle=\`rgba(0,255,200,\${0.3+0.4*pulse})\`;ctx.fill();
    ctx.strokeStyle='#00ffcc';ctx.lineWidth=2;ctx.stroke();
    ctx.globalAlpha=saveAlpha*0.7;
    ctx.fillStyle='#00ffcc';ctx.font='bold 7px monospace';ctx.textAlign='center';
    ctx.fillText('SAVE',cx,cy+18);
    ctx.restore();
  }
  if(SL_TOP<clipped_bot&&SL_BT>clipped_top){
    ctx.save();
    ctx.shadowColor='#1133aa';ctx.shadowBlur=16;
    ctx.strokeStyle='#1a3299';ctx.lineWidth=2.5;
    [[LW,SL_TOP,SL_INN,SL_BT,LW,SL_BT],[RW,SL_TOP,SR_INN,SL_BT,RW,SL_BT]].forEach(([x1,y1,x2,y2,x3,y3])=>{
      ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.lineTo(x3,y3);ctx.closePath();
      ctx.fillStyle='rgba(12,28,110,0.2)';ctx.fill();ctx.stroke();
    });
    ctx.restore();
  }

  // ── LANE DIVIDERS ──
  if(TW<clipped_bot&&TW+60>clipped_top){
    ctx.save();ctx.strokeStyle='#0d1844';ctx.lineWidth=1;
    S.rollovers.forEach(r=>{
      ctx.beginPath();ctx.moveTo(r.x-22,TW);ctx.lineTo(r.x-22,TW+52);ctx.stroke();
    });
    ctx.restore();
  }

  // ── ROLLOVER DOTS ──
  S.rollovers.forEach(r=>{
    if(TW>clipped_bot||TW+40<clipped_top)return;
    const on=r.lit===true;
    ctx.save();
    ctx.shadowBlur=on?18:0;ctx.shadowColor=r.color;
    ctx.beginPath();ctx.arc(r.x,r.y,7,0,6.28);
    ctx.fillStyle=on?r.color:'#111833';ctx.fill();
    ctx.fillStyle=on?'#fff':'#3a4488';
    ctx.font='bold 7px monospace';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(r.lbl,r.x,r.y);
    ctx.restore();
  });

  // ── JACKPOT GATE ──
  const jg=S.jackpotGate;
  if(TW<clipped_bot&&TW+40>clipped_top){
    ctx.save();
    const pulse=0.7+0.3*Math.sin(S.t*0.12);
    ctx.shadowColor=jg.lit?'#ffee22':'#223';
    ctx.shadowBlur=jg.lit?30*pulse:4;
    ctx.strokeStyle=jg.lit?\`rgba(255,238,0,\${pulse})\`:'#1a2244';
    ctx.lineWidth=3;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(jg.x,TW+6);ctx.lineTo(jg.x+jg.w,TW+6);ctx.stroke();
    ctx.fillStyle=jg.lit?\`rgba(255,238,0,\${pulse*0.18})\`:'transparent';
    ctx.fillRect(jg.x,TW,jg.w,20);
    // Label
    ctx.fillStyle=jg.lit?\`rgba(255,238,0,\${pulse})\`:'#1a2a44';
    ctx.font=\`bold \${jg.lit?10:8}px monospace\`;ctx.textAlign='center';ctx.shadowBlur=0;
    ctx.fillText('JACKPOT',jg.x+jg.w/2,TW+18);
    ctx.restore();
  }

  // ── DROP TARGETS (ABC center) ──
  S.targets.forEach(t=>{
    if(t.y+t.h<clipped_top||t.y>clipped_bot)return;
    ctx.save();
    const lit=t.lit/40;
    ctx.shadowColor=t.color;ctx.shadowBlur=t.hit?0:lit*20+8;
    ctx.fillStyle=t.hit?'#111':t.color+(t.hit?'44':'dd');
    ctx.beginPath();rrect(t.x,t.y,t.w,t.h,3);ctx.fill();
    if(!t.hit){
      ctx.fillStyle='#fff';ctx.font='bold 9px monospace';
      ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(t.lbl,t.x+t.w/2,t.y+t.h/2);
    }
    ctx.restore();
  });

  // ── LEFT BANK ──
  if(1250>clipped_top&&1180<clipped_bot){
    ctx.save();
    S.leftBank.forEach(t=>{
      const lit=t.lit/50;
      ctx.shadowColor=t.color;ctx.shadowBlur=t.hit?0:lit*18+6;
      ctx.fillStyle=t.hit?'#0a1128':t.color;
      ctx.beginPath();rrect(t.x,t.y,t.w,t.h,3);ctx.fill();
      if(!t.hit){
        ctx.fillStyle='#fff';ctx.font='bold 8px monospace';
        ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText(t.lbl,t.x+t.w/2,t.y+t.h/2);
      }
    });
    // Bank label
    const allHit=S.leftBank.every(t=>t.hit);
    ctx.fillStyle=allHit?'#00ffcc':'#334466';
    ctx.font='bold 8px monospace';ctx.textAlign='center';
    ctx.fillText('L BANK',86,1268);
    ctx.restore();
  }

  // ── RIGHT BANK ──
  if(1250>clipped_top&&1180<clipped_bot){
    ctx.save();
    S.rightBank.forEach(t=>{
      const lit=t.lit/50;
      ctx.shadowColor=t.color;ctx.shadowBlur=t.hit?0:lit*18+6;
      ctx.fillStyle=t.hit?'#0a1128':t.color;
      ctx.beginPath();rrect(t.x,t.y,t.w,t.h,3);ctx.fill();
      if(!t.hit){
        ctx.fillStyle='#fff';ctx.font='bold 8px monospace';
        ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText(t.lbl,t.x+t.w/2,t.y+t.h/2);
      }
    });
    const allHit=S.rightBank.every(t=>t.hit);
    ctx.fillStyle=allHit?'#ff8800':'#334466';
    ctx.font='bold 8px monospace';ctx.textAlign='center';
    ctx.fillText('R BANK',454,1268);
    ctx.restore();
  }

  // ── AIM GUIDES — flipper aim lines + target callouts ──
  {
    const pulse=0.5+0.5*Math.sin(S.t*0.1);
    const pulse2=0.5+0.5*Math.sin(S.t*0.1+Math.PI); // offset pulse
    const nextMuffIdx=S.muff.findIndex(v=>!v);
    const nextMuff=nextMuffIdx>=0?S.muffTargets[nextMuffIdx]:null;
    const jackpotHole=S.holes[0];
    const sp=S.spinner;

    // ── Flipper aim projection lines ──
    // Always-on faint guide (shows where full-power shot would go), bright when held
    const drawAimLine=(tipX,tipY,dirAngle,color,active)=>{
      ctx.save();
      // Persistent faint ghost line — always visible so you know where to aim
      ctx.globalAlpha=active ? 0 : 0.10;
      ctx.strokeStyle=color; ctx.lineWidth=1;
      ctx.setLineDash([6,14]);
      ctx.beginPath();
      ctx.moveTo(tipX,tipY);
      ctx.lineTo(tipX+Math.cos(dirAngle)*420, tipY+Math.sin(dirAngle)*420);
      ctx.stroke();
      if(active){
        // Active: bright glowing line
        ctx.globalAlpha=0.55+0.25*pulse;
        ctx.strokeStyle=color; ctx.lineWidth=2.5;
        ctx.shadowColor=color; ctx.shadowBlur=18;
        ctx.setLineDash([10,8]);
        ctx.beginPath();
        ctx.moveTo(tipX,tipY);
        ctx.lineTo(tipX+Math.cos(dirAngle)*440, tipY+Math.sin(dirAngle)*440);
        ctx.stroke();
        // Arrow head at tip
        ctx.globalAlpha=0.8+0.2*pulse;
        ctx.shadowBlur=12; ctx.setLineDash([]);
        ctx.lineWidth=2;
        const ax=tipX+Math.cos(dirAngle)*28, ay=tipY+Math.sin(dirAngle)*28;
        const wingA=dirAngle+2.5, wingB=dirAngle-2.5;
        ctx.beginPath();
        ctx.moveTo(ax,ay);ctx.lineTo(ax+Math.cos(wingA)*10,ay+Math.sin(wingA)*10);
        ctx.moveTo(ax,ay);ctx.lineTo(ax+Math.cos(wingB)*10,ay+Math.sin(wingB)*10);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.restore();
    };

    // Compute both flipper tips (for persistent guides use active angle; ghost use full-power angle)
    const lFullAngle = LF_REST+(LF_ACT-LF_REST)*1.0; // full power angle
    const rFullAngle = RF_REST+(RF_ACT-RF_REST)*1.0;
    const lGhostTipX=LFX+FLEN*Math.cos(lFullAngle), lGhostTipY=LFY+FLEN*Math.sin(lFullAngle);
    const rGhostTipX=RFX+FLEN*Math.cos(rFullAngle), rGhostTipY=RFY+FLEN*Math.sin(rFullAngle);
    // Ghost guides (always show full-power trajectory faintly)
    drawAimLine(lGhostTipX,lGhostTipY,lFullAngle-Math.PI/2,'#00ffcc',false);
    drawAimLine(rGhostTipX,rGhostTipY,rFullAngle+Math.PI/2,'#ff8800',false);
    // Active guides (bright, when held)
    if(keys.L||keys.R){
      const laAngle=S.la;
      const ltipX=LFX+FLEN*Math.cos(laAngle), ltipY=LFY+FLEN*Math.sin(laAngle);
      drawAimLine(ltipX,ltipY,laAngle-Math.PI/2,'#00ffcc',keys.L);
      const raAngle=S.ra;
      const rtipX=RFX+FLEN*Math.cos(raAngle), rtipY=RFY+FLEN*Math.sin(raAngle);
      drawAimLine(rtipX,rtipY,raAngle+Math.PI/2,'#ff8800',keys.R);
    }

    // ── Cascading arrows on NEXT MUFF target ──
    if(nextMuff&&nextMuff.y>clipped_top-60&&nextMuff.y<clipped_bot+60){
      ctx.save();
      ctx.shadowColor=nextMuff.color; ctx.shadowBlur=14;
      ctx.strokeStyle=nextMuff.color; ctx.lineWidth=3.5; ctx.lineCap='round';
      // 3 cascading arrows that animate downward into target
      [0,1,2].forEach(i=>{
        const offset=((S.t*0.06+i*0.33)%1);
        const arrowY=nextMuff.y-nextMuff.r-50+(offset*36);
        const a=Math.sin(offset*Math.PI);
        ctx.globalAlpha=a*0.95;
        const hw=14-i*2;
        ctx.beginPath();
        ctx.moveTo(nextMuff.x-hw,arrowY-10);
        ctx.lineTo(nextMuff.x,arrowY+2);
        ctx.lineTo(nextMuff.x+hw,arrowY-10);
        ctx.stroke();
      });
      ctx.restore();
    }

    // ── Pulsing ring + arrows on jackpot hole ──
    if(jackpotHole&&jackpotHole.y>clipped_top-60&&jackpotHole.y<clipped_bot+60){
      ctx.save();
      // Expanding ring
      const ringR=jackpotHole.r+6+pulse*16;
      ctx.globalAlpha=(1-pulse)*0.55;
      ctx.strokeStyle='#ffee22'; ctx.lineWidth=2;
      ctx.shadowColor='#ffee22'; ctx.shadowBlur=16;
      ctx.beginPath();ctx.arc(jackpotHole.x,jackpotHole.y,ringR,0,6.28);ctx.stroke();
      // Second ring offset
      const ringR2=jackpotHole.r+6+pulse2*14;
      ctx.globalAlpha=(1-pulse2)*0.35;
      ctx.beginPath();ctx.arc(jackpotHole.x,jackpotHole.y,ringR2,0,6.28);ctx.stroke();
      // Cascading arrows pointing down into hole
      ctx.strokeStyle='#ffee22'; ctx.lineWidth=2.5;
      [0,1,2].forEach(i=>{
        const offset=((S.t*0.05+i*0.33)%1);
        const arrowY=jackpotHole.y-jackpotHole.r-44+(offset*32);
        const a=Math.sin(offset*Math.PI)*0.9;
        ctx.globalAlpha=a;
        const hw=9-i*2;
        ctx.beginPath();
        ctx.moveTo(jackpotHole.x-hw,arrowY-8);
        ctx.lineTo(jackpotHole.x,arrowY);
        ctx.lineTo(jackpotHole.x+hw,arrowY-8);
        ctx.stroke();
      });
      // JP label
      ctx.globalAlpha=0.5+0.4*pulse;
      ctx.fillStyle='#ffee22'; ctx.font='bold 9px monospace';
      ctx.textAlign='center'; ctx.shadowBlur=8;
      ctx.fillText('★ JACKPOT ★',jackpotHole.x,jackpotHole.y-jackpotHole.r-52);
      ctx.restore();
    }

    // ── Spinner callout — orbit arrows when ball hasn't hit it recently ──
    if(sp.y>clipped_top-40&&sp.y<clipped_bot+40&&(sp.lit||0)<5){
      ctx.save();
      ctx.globalAlpha=0.25+0.2*pulse;
      ctx.strokeStyle='#aa44ff'; ctx.lineWidth=1.8;
      ctx.shadowColor='#aa44ff'; ctx.shadowBlur=8;
      // Two orbiting arrow-dots circling the spinner
      [0,1].forEach(i=>{
        const orbitAngle=S.t*0.06+i*Math.PI;
        const ox=sp.x+Math.cos(orbitAngle)*(sp.len+14);
        const oy=sp.y+Math.sin(orbitAngle)*(sp.len+14);
        ctx.beginPath();ctx.arc(ox,oy,3.5,0,6.28);ctx.fillStyle='#aa44ff';ctx.fill();
      });
      ctx.fillStyle='#aa44ff'; ctx.font='bold 8px monospace';
      ctx.textAlign='center'; ctx.fillText('SPIN',sp.x,sp.y-sp.len-12);
      ctx.restore();
    }

    // ── Left / Right / Center lane arrows (dimmer, context-aware) ──
    const seq=S.shotSeq, seqLit=S.shotLit;
    const lActive=seq[seqLit]==='L', rActive=seq[seqLit]==='R', cActive=seq[seqLit]==='C';
    [[70,'L',lActive,'#00ffcc'],[470,'R',rActive,'#ff8800']].forEach(([x,lbl,active,color])=>{
      if(900<clipped_top||500>clipped_bot)return;
      ctx.save();
      ctx.globalAlpha=active?0.55+0.35*pulse:0.1;
      ctx.strokeStyle=color; ctx.shadowColor=color; ctx.shadowBlur=active?12:0;
      ctx.lineWidth=active?2:1.5; ctx.lineCap='round';
      [880,760,640,520].forEach(y=>{
        if(y<clipped_top||y>clipped_bot)return;
        const off=active?(S.t*2%20)-10:0; // animate upward when active
        const yy=y+off;
        ctx.beginPath();ctx.moveTo(x,yy+18);ctx.lineTo(x,yy);
        ctx.moveTo(x-6,yy+8);ctx.lineTo(x,yy);ctx.lineTo(x+6,yy+8);ctx.stroke();
      });
      ctx.fillStyle=color; ctx.font=\`bold \${active?12:9}px monospace\`;
      ctx.textAlign='center'; ctx.fillText(lbl,x,940);
      ctx.restore();
    });
    if(cActive&&600>clipped_top&&200<clipped_bot){
      ctx.save();
      ctx.globalAlpha=0.55+0.35*pulse;
      ctx.strokeStyle='#ffee22'; ctx.shadowColor='#ffee22'; ctx.shadowBlur=12;
      ctx.lineWidth=2; ctx.lineCap='round';
      [520,400,280].forEach(y=>{
        if(y<clipped_top||y>clipped_bot)return;
        const off=(S.t*2%20)-10;
        const yy=y+off;
        ctx.beginPath();ctx.moveTo(268,yy+18);ctx.lineTo(268,yy);
        ctx.moveTo(262,yy+8);ctx.lineTo(268,yy);ctx.lineTo(274,yy+8);ctx.stroke();
      });
      ctx.fillStyle='#ffee22'; ctx.font='bold 12px monospace';
      ctx.textAlign='center'; ctx.fillText('C',268,570);
      ctx.restore();
    }
  }

  // ── HOLES (enhanced with swirl and depth) ──
  S.holes.forEach((h,i)=>{
    if(h.y-h.r>clipped_bot||h.y+h.r<clipped_top)return;
    const lit=Math.min(1,h.lit/90);
    ctx.save();
    ctx.shadowColor=h.color;ctx.shadowBlur=lit*55+10;
    // Outer ring
    ctx.beginPath();ctx.arc(h.x,h.y,h.r,0,6.28);
    ctx.strokeStyle=h.color;ctx.lineWidth=3;ctx.stroke();
    // Swirling inner ring
    const swirlAngle=S.t*0.04;
    ctx.beginPath();
    ctx.arc(h.x,h.y,h.r-5,swirlAngle,swirlAngle+Math.PI*1.3);
    ctx.strokeStyle=h.color+'88';ctx.lineWidth=2;ctx.stroke();
    ctx.beginPath();
    ctx.arc(h.x,h.y,h.r-5,swirlAngle+Math.PI,swirlAngle+Math.PI*2.3);
    ctx.strokeStyle=h.color+'44';ctx.lineWidth=1.5;ctx.stroke();
    // Dark depth
    ctx.beginPath();ctx.arc(h.x,h.y,h.r-9,0,6.28);
    const holeGrad=ctx.createRadialGradient(h.x,h.y,1,h.x,h.y,h.r-9);
    holeGrad.addColorStop(0,'#000000');
    holeGrad.addColorStop(0.6,\`rgba(0,0,0,\${0.7+lit*0.3})\`);
    holeGrad.addColorStop(1,h.color+'11');
    ctx.fillStyle=holeGrad;ctx.fill();
    // Center glow
    ctx.beginPath();ctx.arc(h.x,h.y,5,0,6.28);
    ctx.fillStyle=lit>0.1?h.color:'#111';ctx.shadowBlur=lit>0.1?12:0;ctx.fill();
    ctx.shadowBlur=0;
    ctx.fillStyle='#1a2a44';ctx.font='bold 6px monospace';ctx.textAlign='center';
    ctx.fillText(h.lbl,h.x,h.y+h.r+10);
    // Show jackpot amount above center hole (i===0)
    if(i===0){
      const pulse=0.5+0.5*Math.sin(S.t*0.12);
      ctx.globalAlpha=0.5+0.4*pulse;
      ctx.fillStyle='#ffee22';ctx.font='bold 8px monospace';
      ctx.shadowColor='#ffee22';ctx.shadowBlur=6*pulse;
      ctx.fillText((S.jackpotPool||0).toLocaleString(),h.x,h.y-h.r-6);
    }
    ctx.restore();
  });

  // ── HOLE IN ONE DOG ──
  if(holeInOneGolf.active&&holeInOneGolf.settled){
    const hx=holeInOneGolf.x,hy=holeInOneGolf.y;
    if(hy>clipped_top-30&&hy<clipped_bot+30){
      ctx.save();
      const pulse=0.5+0.5*Math.sin(S.t*0.1);
      ctx.shadowColor='#ffaa44';ctx.shadowBlur=20+10*pulse;
      ctx.beginPath();ctx.arc(hx,hy,18,0,6.28);
      ctx.strokeStyle='#ffaa4488';ctx.lineWidth=2;ctx.stroke();
      const wagAngle=Math.sin(S.t*0.2)*0.15;
      ctx.translate(hx,hy);ctx.rotate(wagAngle);
      ctx.font='22px serif';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText('\\u{1F415}',0,0);
      ctx.rotate(-wagAngle);ctx.translate(-hx,-hy);
      ctx.shadowBlur=0;ctx.fillStyle='#ffaa44';ctx.font='bold 7px monospace';ctx.textAlign='center';
      ctx.fillText('\\u{1F43E} HIT ME! \\u{1F43E}',hx,hy+24);
      ctx.restore();
    }
  }

  // ── FOCUS ORB ──
  if(focusOrb.active&&focusOrb.y>clipped_top-30&&focusOrb.y<clipped_bot+30){
    const pulse=0.5+0.5*Math.sin(S.t*0.14);
    const r=14;
    ctx.save();
    ctx.shadowColor='#00eeff'; ctx.shadowBlur=20+12*pulse;
    // Outer ring
    ctx.strokeStyle=\`rgba(0,220,255,\${0.6+0.4*pulse})\`; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(focusOrb.x,focusOrb.y,r,0,6.28); ctx.stroke();
    // Inner fill
    ctx.fillStyle=\`rgba(0,180,220,\${0.15+0.12*pulse})\`;
    ctx.beginPath(); ctx.arc(focusOrb.x,focusOrb.y,r-2,0,6.28); ctx.fill();
    // Icon
    ctx.fillStyle=\`rgba(0,240,255,\${0.8+0.2*pulse})\`;
    ctx.font='bold 10px monospace'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.shadowBlur=8; ctx.fillText('◎',focusOrb.x,focusOrb.y);
    // Label
    ctx.globalAlpha=0.55+0.35*pulse; ctx.font='bold 7px monospace';
    ctx.fillStyle='#00eeff'; ctx.shadowBlur=0;
    ctx.fillText('FOCUS',focusOrb.x,focusOrb.y+r+9);
    ctx.restore();
  }

  // ── ACID TAB ITEM ──
  if(acidTab.active&&acidTab.y>clipped_top-30&&acidTab.y<clipped_bot+30){
    const at=S.t*0.1;
    const ap=0.5+0.5*Math.sin(at);
    ctx.save();
    ctx.translate(acidTab.x,acidTab.y);
    ctx.rotate(Math.sin(at*0.7)*0.3);
    const sz=14+2*ap;
    const hue=(S.t*3)%360;
    ctx.shadowColor=\`hsl(\${hue},100%,60%)\`; ctx.shadowBlur=18+10*ap;
    ctx.fillStyle=\`hsl(\${hue},100%,60%)\`;
    ctx.fillRect(-sz/2,-sz/2,sz,sz);
    ctx.fillStyle='#000';
    ctx.font='bold 9px monospace'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('LSD',0,0);
    ctx.restore();
  }

  // ── HORSESHOE ITEM ──
  if(horseshoe.active&&horseshoe.y>clipped_top-30&&horseshoe.y<clipped_bot+30){
    const ht=S.t*0.08;
    const hp=0.5+0.5*Math.sin(ht);
    ctx.save();
    ctx.translate(horseshoe.x,horseshoe.y);
    ctx.rotate(Math.sin(ht*0.5)*0.25);
    ctx.shadowColor='#ffd700'; ctx.shadowBlur=20+12*hp;
    // Draw a horseshoe shape
    ctx.beginPath();
    ctx.arc(0,0,14,Math.PI*0.2,Math.PI*0.8);
    ctx.lineWidth=5;ctx.lineCap='round';
    ctx.strokeStyle='#d4a574';ctx.stroke();
    // Horse emoji in center
    ctx.font='14px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillStyle='#ffd700';
    ctx.fillText('\\u{1F40E}',0,2);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha=0.6+0.4*hp;
    ctx.fillStyle='#d4a574'; ctx.font='bold 7px monospace'; ctx.textAlign='center';
    ctx.shadowColor='#d4a574';ctx.shadowBlur=6;
    ctx.fillText('STABLE',horseshoe.x,horseshoe.y+20);
    ctx.restore();
  }

  // ── FRUIT TRIGGER ITEMS (banana left, apple right) ──
  if(fruitTrigger.active){
    const ft=S.t*0.1;
    const fp=0.5+0.5*Math.sin(ft);
    // Banana (left side)
    const fbn=fruitTrigger.banana;
    if(fbn&&!fbn.collected&&fbn.y>clipped_top-30&&fbn.y<clipped_bot+30){
      ctx.save();
      ctx.translate(fbn.x,fbn.y);
      ctx.rotate(Math.sin(ft*0.6)*0.3);
      ctx.shadowColor='#ffe135';ctx.shadowBlur=16+8*fp;
      ctx.font='20px serif';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText('\\u{1F34C}',0,0);
      ctx.restore();
      ctx.save();ctx.globalAlpha=0.6+0.3*fp;
      ctx.fillStyle='#ffe135';ctx.font='bold 6px monospace';ctx.textAlign='center';
      ctx.fillText('GRAB ME',fbn.x,fbn.y+18);ctx.restore();
    }
    // Apple (right side)
    const fap=fruitTrigger.apple;
    if(fap&&!fap.collected&&fap.y>clipped_top-30&&fap.y<clipped_bot+30){
      ctx.save();
      ctx.translate(fap.x,fap.y);
      ctx.rotate(Math.sin(ft*0.7+1)*0.3);
      ctx.shadowColor='#ff4444';ctx.shadowBlur=16+8*fp;
      ctx.font='20px serif';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText('\\u{1F34E}',0,0);
      ctx.restore();
      ctx.save();ctx.globalAlpha=0.6+0.3*fp;
      ctx.fillStyle='#ff4444';ctx.font='bold 6px monospace';ctx.textAlign='center';
      ctx.fillText('GRAB ME',fap.x,fap.y+18);ctx.restore();
    }
    // Show "LOW HANGING FRUIT" banner
    if(!fbn?.collected||!fap?.collected){
      ctx.save();ctx.globalAlpha=0.5+0.4*Math.sin(S.t*0.06);
      ctx.fillStyle='#ffd700';ctx.font='bold 9px monospace';ctx.textAlign='center';
      ctx.shadowColor='#ffd700';ctx.shadowBlur=8;
      ctx.fillText('\\u{1F34C} LOW HANGING FRUIT \\u{1F34E}',FW/2,clipped_top+20);
      ctx.fillStyle='#fff';ctx.font='bold 7px monospace';ctx.shadowBlur=0;
      ctx.fillText('Grab both to unlock FRENZY!',FW/2,clipped_top+32);
      ctx.restore();
    }
  }

  // ── FRUIT FRENZY — draw all fruits on the field ──
  if(fruitFrenzy.active){
    fruitFrenzy.fruits.forEach(fr=>{
      if(fr.collected)return;
      if(fr.y<clipped_top-20||fr.y>clipped_bot+20)return;
      const bob=Math.sin(S.t*0.06+fr.bobPhase)*4;
      ctx.save();
      ctx.translate(fr.x,fr.y+bob);
      ctx.rotate(Math.sin(S.t*0.04+fr.bobPhase)*0.15);
      ctx.font='14px serif';ctx.textAlign='center';ctx.textBaseline='middle';
      const emoji=fr.type==='banana'?'\\u{1F34C}':'\\u{1F34E}';
      const glow=fr.type==='banana'?'#ffe135':'#ff4444';
      ctx.shadowColor=glow;ctx.shadowBlur=10;
      ctx.fillText(emoji,0,0);
      ctx.restore();
    });
  }

  // ── STABLE MODE — horse bumpers + finish line ──
  if(stableMode.active){
    stableMode.horseBumpers.forEach(hb=>{
      if(hb.y-hb.r>clipped_bot||hb.y+hb.r<clipped_top)return;
      const lit=hb.lit/30;
      const pulse=0.5+0.5*Math.sin(S.t*0.1+hb.x*0.02);
      ctx.save();
      ctx.shadowColor='#d4a574'; ctx.shadowBlur=lit*40+6;
      // Horseshoe-shaped bumper
      ctx.beginPath();
      const r=hb.r;
      ctx.arc(hb.x,hb.y,r,Math.PI*0.15,Math.PI*0.85);
      ctx.lineWidth=4;ctx.lineCap='round';
      ctx.strokeStyle=lit>0?'#fff':'#d4a574';ctx.stroke();
      // Inner fill
      ctx.beginPath();ctx.arc(hb.x,hb.y,r-3,0,6.28);
      const gr=ctx.createRadialGradient(hb.x-3,hb.y-3,1,hb.x,hb.y,r);
      if(lit>0){gr.addColorStop(0,'#fff');gr.addColorStop(0.4,'#d4a574');gr.addColorStop(1,'#3a1f00');}
      else{gr.addColorStop(0,'#d4a574'+'44');gr.addColorStop(1,'#1a0f00');}
      ctx.fillStyle=gr;ctx.fill();
      // Horse emoji in center
      ctx.font='bold '+(r>20?14:10)+'px serif';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillStyle=lit>0?'#fff':'#8b6914';
      ctx.fillText('\\u{1F40E}',hb.x,hb.y);
      // Name label
      ctx.shadowBlur=0;ctx.fillStyle=lit>0?'#ffd700':'#8b6914';
      ctx.font='bold 6px monospace';ctx.textAlign='center';
      ctx.fillText(hb.name,hb.x,hb.y+r+8);
      ctx.restore();
    });
    // Finish line
    const fl=stableMode.finishLine;
    if(fl){
      const fp=0.5+0.5*Math.sin(S.t*0.15);
      ctx.save();
      if(!fl.scored){
        // Checkered flag pattern
        const sqSz=fl.h/3;
        for(let row=0;row<3;row++){
          for(let col=0;col<Math.ceil(fl.w/sqSz);col++){
            ctx.fillStyle=((row+col)%2===0)?'#ffffff':'#000000';
            ctx.fillRect(fl.x+col*sqSz,fl.y+row*sqSz,sqSz,sqSz);
          }
        }
        ctx.strokeStyle='#ffd700';ctx.lineWidth=2;
        ctx.shadowColor='#ffd700';ctx.shadowBlur=10+6*fp;
        ctx.strokeRect(fl.x,fl.y,fl.w,fl.h);
        // Label
        ctx.shadowBlur=0;ctx.fillStyle='#ffd700';ctx.font='bold 8px monospace';ctx.textAlign='center';
        ctx.fillText('FINISH LINE',fl.x+fl.w/2,fl.y-6);
        ctx.fillStyle='#fff';ctx.font='bold 7px monospace';
        ctx.fillText('+50,000',fl.x+fl.w/2,fl.y+fl.h+10);
      } else {
        ctx.globalAlpha=0.3+0.2*Math.sin(S.t*0.2);
        ctx.fillStyle='#ffd700';
        ctx.fillRect(fl.x,fl.y,fl.w,fl.h);
        ctx.fillStyle='#fff';ctx.font='bold 7px monospace';ctx.textAlign='center';
        ctx.fillText('CLEARED!',fl.x+fl.w/2,fl.y+fl.h/2+3);
      }
      ctx.restore();
    }
  }

  // ── BUMPERS (enhanced shape variants) ──
  S.bumpers.forEach(bm=>{
    if(bm.y-bm.r>clipped_bot||bm.y+bm.r<clipped_top)return;
    const lit=bm.lit/30;
    const pulse=0.5+0.5*Math.sin(S.t*0.12+bm.x*0.01);
    ctx.save();
    ctx.shadowColor=bm.color;ctx.shadowBlur=lit*60+8;

    if(bm.shape==='hex'){
      // ── HEXAGONAL BUMPER — slowly rotates, faceted look ──
      const rot=S.t*0.008+bm.x*0.02;
      ctx.beginPath();
      for(let i=0;i<6;i++){
        const a=rot+i*Math.PI/3;
        const px=bm.x+Math.cos(a)*bm.r,py=bm.y+Math.sin(a)*bm.r;
        if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
      }
      ctx.closePath();
      ctx.strokeStyle=bm.color;ctx.lineWidth=3;ctx.stroke();
      // Inner hex
      ctx.beginPath();
      for(let i=0;i<6;i++){
        const a=rot+i*Math.PI/3;
        const px=bm.x+Math.cos(a)*(bm.r-4),py=bm.y+Math.sin(a)*(bm.r-4);
        if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
      }
      ctx.closePath();
      const gr=ctx.createRadialGradient(bm.x-4,bm.y-4,1,bm.x,bm.y,bm.r-3);
      if(lit>0){gr.addColorStop(0,'#fff');gr.addColorStop(0.4,bm.color);gr.addColorStop(1,'#06000e');}
      else{gr.addColorStop(0,bm.color+'44');gr.addColorStop(1,'#04000a');}
      ctx.fillStyle=gr;ctx.fill();

    } else if(bm.shape==='ring'){
      // ── RING BUMPER — concentric rings that pulse outward ──
      // Outer ring
      ctx.beginPath();ctx.arc(bm.x,bm.y,bm.r,0,6.28);
      ctx.strokeStyle=bm.color;ctx.lineWidth=3;ctx.stroke();
      // Pulsing middle ring
      const ringR=bm.r*0.65+pulse*bm.r*0.12;
      ctx.beginPath();ctx.arc(bm.x,bm.y,ringR,0,6.28);
      ctx.strokeStyle=lit>0?bm.color:bm.color+'66';ctx.lineWidth=2;ctx.stroke();
      // Inner dot
      ctx.beginPath();ctx.arc(bm.x,bm.y,bm.r*0.3,0,6.28);
      ctx.fillStyle=lit>0?bm.color:bm.color+'33';ctx.fill();
      // Dark fill between rings
      ctx.beginPath();ctx.arc(bm.x,bm.y,bm.r-2,0,6.28);
      ctx.fillStyle=lit>0?bm.color+'22':'#04000a88';ctx.fill();

    } else if(bm.shape==='star'){
      // ── STAR BUMPER — 5-point star that rotates ──
      const rot=S.t*0.015+bm.y*0.01;
      ctx.beginPath();
      for(let i=0;i<10;i++){
        const a=rot+i*Math.PI/5;
        const r2=(i%2===0)?bm.r:bm.r*0.5;
        const px=bm.x+Math.cos(a)*r2,py=bm.y+Math.sin(a)*r2;
        if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
      }
      ctx.closePath();
      ctx.strokeStyle=bm.color;ctx.lineWidth=2.5;ctx.stroke();
      const gr=ctx.createRadialGradient(bm.x-3,bm.y-3,1,bm.x,bm.y,bm.r);
      if(lit>0){gr.addColorStop(0,'#fff');gr.addColorStop(0.3,bm.color);gr.addColorStop(1,'#06000e');}
      else{gr.addColorStop(0,bm.color+'33');gr.addColorStop(1,'#04000a');}
      ctx.fillStyle=gr;ctx.fill();

    } else {
      // ── DEFAULT CIRCLE ──
      ctx.beginPath();ctx.arc(bm.x,bm.y,bm.r,0,6.28);
      ctx.strokeStyle=bm.color;ctx.lineWidth=3;ctx.stroke();
      ctx.beginPath();ctx.arc(bm.x,bm.y,bm.r-3,0,6.28);
      const gr=ctx.createRadialGradient(bm.x-4,bm.y-4,1,bm.x,bm.y,bm.r-3);
      if(lit>0){gr.addColorStop(0,'#fff');gr.addColorStop(0.4,bm.color);gr.addColorStop(1,'#06000e');}
      else{gr.addColorStop(0,bm.color+'33');gr.addColorStop(1,'#04000a');}
      ctx.fillStyle=gr;ctx.fill();
    }

    // Label (all shapes)
    ctx.shadowBlur=0;ctx.fillStyle=lit>0?'#fff':'#556';
    ctx.font=\`bold \${bm.r>18?9:7}px monospace\`;ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(bm.lbl,bm.x,bm.y);
    ctx.restore();
  });

  // ── MUFF TARGETS (enhanced with aura and glow effects) ──
  S.muffTargets.forEach(t=>{
    if(t.y+t.r<clipped_top||t.y-t.r>clipped_bot)return;
    const hit=S.muff[t.idx];
    const lit=(t.lit||0)/60;
    const pulse=0.6+0.4*Math.sin(S.t*0.12+t.idx);
    ctx.save();
    ctx.shadowColor=t.color;
    ctx.shadowBlur=hit?22+12*pulse:lit>0?28:5;

    // Aura ring (expanding/contracting)
    if(!hit){
      const auraR=t.r+4+pulse*4;
      ctx.globalAlpha=0.12+0.08*pulse;
      ctx.strokeStyle=t.color;ctx.lineWidth=1;
      ctx.beginPath();ctx.arc(t.x,t.y,auraR,0,6.28);ctx.stroke();
      ctx.globalAlpha=1;
    }

    // Outer ring — solid when hit, outline when not
    ctx.beginPath();ctx.arc(t.x,t.y,t.r,0,6.28);
    ctx.strokeStyle=t.color;
    ctx.lineWidth=hit?3.5:2;
    ctx.globalAlpha=hit?1:0.4+0.3*pulse;
    ctx.stroke();
    // Fill — gradient when hit
    ctx.beginPath();ctx.arc(t.x,t.y,t.r-2,0,6.28);
    if(hit){
      const tg=ctx.createRadialGradient(t.x-3,t.y-3,1,t.x,t.y,t.r);
      tg.addColorStop(0,t.color+'88');tg.addColorStop(1,t.color+'22');
      ctx.fillStyle=tg;
    } else {
      ctx.fillStyle='#04000a';
    }
    ctx.fill();
    // Letter
    ctx.globalAlpha=hit?1:0.35+0.3*pulse;
    ctx.fillStyle=hit?'#fff':t.color;
    ctx.font=\`bold \${hit?13:11}px monospace\`;ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.shadowBlur=hit?14:0;
    ctx.fillText(t.lbl,t.x,t.y);
    ctx.restore();
  });
  

  // ── SPINNER ──
  {
    const sp=S.spinner;
    if(sp.y>clipped_top-40&&sp.y<clipped_bot+40){
      const lit=sp.lit/20;
      const pulse=0.4+0.6*Math.abs(Math.sin(S.t*0.1));
      ctx.save();
      ctx.shadowColor='#aa44ff';ctx.shadowBlur=lit>0?20+lit*20:6;
      ctx.strokeStyle=lit>0?\`rgba(180,100,255,\${0.7+0.3*lit})\`:\`rgba(100,50,180,\${0.3+0.2*pulse})\`;
      ctx.lineWidth=3;ctx.lineCap='round';
      // Two crossed blades rotating
      for(let b2=0;b2<2;b2++){
        const a=sp.angle+b2*Math.PI/2;
        ctx.beginPath();
        ctx.moveTo(sp.x+Math.cos(a)*sp.len, sp.y+Math.sin(a)*sp.len);
        ctx.lineTo(sp.x+Math.cos(a+Math.PI)*sp.len, sp.y+Math.sin(a+Math.PI)*sp.len);
        ctx.stroke();
      }
      // Center hub
      ctx.beginPath();ctx.arc(sp.x,sp.y,5,0,6.28);
      ctx.fillStyle=lit>0?'#cc66ff':'#331155';ctx.fill();
      ctx.strokeStyle='#aa44ff';ctx.lineWidth=1.5;ctx.stroke();
      ctx.restore();
    }
  }

  // ── LANE BACKGROUND (launch) ──
  ctx.fillStyle='rgba(0,25,60,0.3)';ctx.fillRect(SEP+1,100,LRX-SEP-2,FH-100);

  // ── SPRING (ready state) ──
  if(S.phase==='ready'){
    const springY=FH-80,cx2=SEP+22;
    const springTop=springY-S.plunger*160;
    const c=\`hsl(\${120-S.plunger*120},100%,55%)\`;
    ctx.save();ctx.strokeStyle=c;ctx.lineWidth=2.5;ctx.shadowColor=c;ctx.shadowBlur=12;
    const coils=9;
    for(let i=0;i<coils;i++){
      const y0=springTop+i*(springY-springTop)/coils;
      const y1=springTop+(i+1)*(springY-springTop)/coils;
      ctx.beginPath();ctx.moveTo(cx2-8,y0);ctx.bezierCurveTo(cx2+10,y0+2,cx2+10,y1-2,cx2-8,y1);ctx.stroke();
    }
    const bcy=springTop-BR-2;
    ctx.shadowBlur=22;ctx.shadowColor='#ffeeaa';
    const bgl=ctx.createRadialGradient(cx2-3,bcy-3,1,cx2,bcy,BR);
    bgl.addColorStop(0,'#fff');bgl.addColorStop(0.5,'#ffeeaa');bgl.addColorStop(1,'#dd8800');
    ctx.beginPath();ctx.arc(cx2,bcy,BR,0,6.28);ctx.fillStyle=bgl;ctx.fill();
    ctx.restore();
  }

  // ── CHARGE BAR ──
  if(S.phase==='ready'){
    const bx=LW,by=FH-38,bw=RW-LW,bh=18;
    ctx.fillStyle='#030312';ctx.fillRect(bx,by,bw,bh);
    if(S.plunger>0){
      const c=\`hsl(\${120-S.plunger*120},100%,55%)\`;
      ctx.save();ctx.shadowColor=c;ctx.shadowBlur=14;
      ctx.fillStyle=c;ctx.fillRect(bx,by,bw*S.plunger,bh);
      ctx.fillStyle='rgba(255,255,255,0.85)';ctx.fillRect(bx+bw*S.plunger-2,by,3,bh);
      ctx.restore();
    }
    ctx.strokeStyle='#0d1544';ctx.lineWidth=1;ctx.strokeRect(bx,by,bw,bh);
    ctx.fillStyle='#2a3460';ctx.font='8px monospace';ctx.textAlign='center';
    ctx.fillText(S.plunger>0?'RELEASE TO LAUNCH':'HOLD ⚡ TO CHARGE',FW/2-SEP/8,FH-18);
  }

  // ── FLIPPER ZONE FLOOR CLARITY ──
  if(LFY-40<clipped_bot&&LFY+80>clipped_top){
    const fz=LFY; // flipper pivot Y

    // Floor background panel — subtle dark panel behind flipper zone
    ctx.save();
    const floorGrad=ctx.createLinearGradient(LW,fz-80,LW,fz+80);
    floorGrad.addColorStop(0,'rgba(0,0,0,0)');
    floorGrad.addColorStop(0.4,'rgba(0,20,40,0.55)');
    floorGrad.addColorStop(1,'rgba(0,0,0,0.7)');
    ctx.fillStyle=floorGrad;
    ctx.fillRect(LW,fz-80,RW-LW,160);

    // Left gutter channel — glowing red danger zone
    const lgGrad=ctx.createLinearGradient(LW,0,SL_INN,0);
    lgGrad.addColorStop(0,'rgba(255,30,30,0.28)');
    lgGrad.addColorStop(1,'rgba(255,30,30,0)');
    ctx.fillStyle=lgGrad;
    ctx.fillRect(LW,SL_BT,SL_INN-LW,FH-SL_BT);

    // Right gutter channel
    const rgGrad=ctx.createLinearGradient(SR_INN,0,RW,0);
    rgGrad.addColorStop(0,'rgba(255,30,30,0)');
    rgGrad.addColorStop(1,'rgba(255,30,30,0.28)');
    ctx.fillStyle=rgGrad;
    ctx.fillRect(SR_INN,SL_BT,RW-SR_INN,FH-SL_BT);

    // Gutter edge lines
    ctx.strokeStyle='rgba(255,50,50,0.45)'; ctx.lineWidth=1.5;
    ctx.shadowColor='#ff2200'; ctx.shadowBlur=6;
    ctx.beginPath();ctx.moveTo(SL_INN,SL_BT);ctx.lineTo(SL_INN,FH);ctx.stroke();
    ctx.beginPath();ctx.moveTo(SR_INN,SL_BT);ctx.lineTo(SR_INN,FH);ctx.stroke();

    // Flipper gap — glowing cyan indicator showing safe zone between flippers
    const ltx2=LFX+FLEN*Math.cos(S.la), lty2=LFY+FLEN*Math.sin(S.la);
    const rtx2=RFX+FLEN*Math.cos(S.ra), rty2=RFY+FLEN*Math.sin(S.ra);
    const gapX1=ltx2, gapX2=rtx2, gapY=(lty2+rty2)/2;
    const gapW=gapX2-gapX1;
    if(gapW>4){
      const gapGrad=ctx.createLinearGradient(gapX1,0,gapX2,0);
      gapGrad.addColorStop(0,'rgba(0,255,200,0)');
      gapGrad.addColorStop(0.5,\`rgba(0,255,200,\${0.08+0.06*Math.sin(S.t*0.1)})\`);
      gapGrad.addColorStop(1,'rgba(0,255,200,0)');
      ctx.fillStyle=gapGrad;
      ctx.fillRect(gapX1,gapY-4,gapW,12);
    }

    // Floor line — solid glowing line under flippers
    const flpulse=0.4+0.3*Math.sin(S.t*0.08);
    ctx.strokeStyle=\`rgba(0,200,160,\${flpulse})\`; ctx.lineWidth=1;
    ctx.shadowColor='#00ffcc'; ctx.shadowBlur=10;
    ctx.beginPath();ctx.moveTo(SL_INN,fz+28);ctx.lineTo(SR_INN,fz+28);ctx.stroke();

    // DRAIN label
    ctx.globalAlpha=0.22+0.1*Math.sin(S.t*0.07);
    ctx.fillStyle='#ff2200'; ctx.font='bold 7px monospace'; ctx.textAlign='center';
    ctx.shadowBlur=0; ctx.shadowColor='transparent';
    ctx.fillText('◀ DRAIN',LW+28,fz+50);
    ctx.fillText('DRAIN ▶',RW-28,fz+50);
    ctx.restore();
  }

  // ── FLIPPERS ──
  const ltx=LFX+FLEN*Math.cos(S.la),lty=LFY+FLEN*Math.sin(S.la);
  const rtx=RFX+FLEN*Math.cos(S.ra),rty=RFY+FLEN*Math.sin(S.ra);
  [[LFX,LFY,ltx,lty,keys.L,S.lAngVel],[RFX,RFY,rtx,rty,keys.R,S.rAngVel]].forEach(([ax,ay,bx,by,act,av])=>{
    const volleying=act&&Math.abs(av)>0.015;
    ctx.save();ctx.lineCap='round';
    ctx.shadowColor=volleying?'#ffee22':act?'#fff':'#00ffcc';
    ctx.shadowBlur=volleying?50:act?35:12;
    ctx.lineWidth=FRAD*2+6;
    ctx.strokeStyle=volleying?'rgba(255,220,0,0.22)':act?'rgba(180,255,240,0.16)':'rgba(0,80,60,0.18)';
    ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.stroke();
    ctx.lineWidth=FRAD*2;
    ctx.strokeStyle=volleying?'#ffcc00':act?'#ffffff':'#00ffcc';
    ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.stroke();
    ctx.lineWidth=4;ctx.strokeStyle=volleying?'#ffffbb':act?'#e0fff8':'#aaffee';ctx.shadowBlur=0;
    ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.stroke();
    ctx.beginPath();ctx.arc(ax,ay,FRAD,0,6.28);
    ctx.fillStyle=volleying?'#ffcc00':act?'#fff':'#00cc99';ctx.fill();
    ctx.restore();
  });

  // ── DANGER zone bar ──
  if(FH-40<clipped_bot&&FH-40>clipped_top){
    const da=0.3+0.2*Math.sin(S.t*0.25);
    ctx.fillStyle=\`rgba(255,20,20,\${da*0.12})\`;ctx.fillRect(LW,FH-60,RW-LW,50);
    ctx.fillStyle=\`rgba(255,20,20,\${da})\`;ctx.font='bold 8px monospace';ctx.textAlign='center';
    ctx.fillText('⚠ DANGER ⚠',FW/2-SEP/8,FH-20);
  }

  if(S.novaBurst.active){
    const prog=S.novaBurst.ticks/NOVA_DUR;
    ctx.save();
    const ng=ctx.createLinearGradient(0,FH-300,0,FH);
    ng.addColorStop(0,'rgba(255,170,0,0)');
    ng.addColorStop(0.5,\`rgba(255,170,0,\${prog*0.12})\`);
    ng.addColorStop(1,\`rgba(255,238,34,\${prog*0.25})\`);
    ctx.fillStyle=ng;ctx.fillRect(LW,FH-300,RW-LW,300);
    for(let i=0;i<3;i++){
      const wy=FH-60-i*80+Math.sin(S.t*0.15+i*2)*15;
      ctx.strokeStyle=\`rgba(255,200,50,\${prog*0.3})\`;ctx.lineWidth=2;
      ctx.shadowColor='#ffaa00';ctx.shadowBlur=12*prog;
      ctx.beginPath();
      for(let x=LW;x<=RW;x+=4){
        const wave=Math.sin(x*0.03+S.t*0.2+i)*8*prog;
        if(x===LW) ctx.moveTo(x,wy+wave); else ctx.lineTo(x,wy+wave);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  // ── BALL TRAIL removed per preference ──

  // ── PARTICLES (enhanced with shapes) ──
  S.parts.forEach(p=>{
    if(p.y<clipped_top-10||p.y>clipped_bot+10)return;
    const a=p.life/p.ml;
    const alpha=Math.floor(a*215).toString(16).padStart(2,'0');
    ctx.save();
    if(p.type==='star'){
      // Tiny rotating 4-point star
      ctx.translate(p.x,p.y);ctx.rotate(p.angle||0);
      ctx.fillStyle=p.color+alpha;
      const sz=p.sz*a;
      ctx.beginPath();
      for(let i=0;i<8;i++){
        const ang=i*Math.PI/4;
        const r2=(i%2===0)?sz:sz*0.4;
        if(i===0)ctx.moveTo(Math.cos(ang)*r2,Math.sin(ang)*r2);
        else ctx.lineTo(Math.cos(ang)*r2,Math.sin(ang)*r2);
      }
      ctx.closePath();ctx.fill();
    } else if(p.type==='spark'){
      // Elongated streak in direction of travel
      const ang=p.angle||Math.atan2(p.vy,p.vx);
      const len=p.sz*a*2.5;
      ctx.strokeStyle=p.color+alpha;ctx.lineWidth=Math.max(1,p.sz*a*0.6);
      ctx.lineCap='round';ctx.shadowColor=p.color;ctx.shadowBlur=4;
      ctx.beginPath();
      ctx.moveTo(p.x-Math.cos(ang)*len,p.y-Math.sin(ang)*len);
      ctx.lineTo(p.x+Math.cos(ang)*len*0.3,p.y+Math.sin(ang)*len*0.3);
      ctx.stroke();
    } else {
      // Default circle
      ctx.beginPath();ctx.arc(p.x,p.y,p.sz*a,0,6.28);
      ctx.fillStyle=p.color+alpha;ctx.fill();
    }
    ctx.restore();
  });

  // ── SHOCKWAVE RINGS ──
  S.shockwaves.forEach(sw=>{
    if(sw.y-sw.r>clipped_bot||sw.y+sw.r<clipped_top)return;
    const prog=1-sw.life/sw.ml;
    const a=(1-prog)*(1-prog); // fade quadratically
    ctx.save();
    ctx.strokeStyle=sw.color;ctx.globalAlpha=a*0.7;
    ctx.lineWidth=3-prog*2;ctx.shadowColor=sw.color;ctx.shadowBlur=12*(1-prog);
    ctx.beginPath();ctx.arc(sw.x,sw.y,sw.r,0,6.28);ctx.stroke();
    // Inner ring half-speed
    if(sw.r>10){
      ctx.globalAlpha=a*0.3;ctx.lineWidth=1;
      ctx.beginPath();ctx.arc(sw.x,sw.y,sw.r*0.6,0,6.28);ctx.stroke();
    }
    ctx.restore();
  });

  // ── LIGHTNING CHAINS ──
  S.lightning.forEach(l=>{
    const a=l.life/l.ml;
    ctx.save();ctx.strokeStyle=l.color;ctx.globalAlpha=a*0.8;
    ctx.lineWidth=2+a*2;ctx.shadowColor=l.color;ctx.shadowBlur=16*a;ctx.lineCap='round';
    // Jagged bolt between two points
    ctx.beginPath();ctx.moveTo(l.x1,l.y1);
    const dx=l.x2-l.x1,dy=l.y2-l.y1,segs=5;
    for(let i=1;i<segs;i++){
      const t=i/segs;
      const jx=(Math.random()-0.5)*30,jy=(Math.random()-0.5)*30;
      ctx.lineTo(l.x1+dx*t+jx,l.y1+dy*t+jy);
    }
    ctx.lineTo(l.x2,l.y2);ctx.stroke();
    // Bright core
    ctx.globalAlpha=a*0.4;ctx.lineWidth=1;ctx.strokeStyle='#ffffff';
    ctx.beginPath();ctx.moveTo(l.x1,l.y1);
    for(let i=1;i<segs;i++){
      const t=i/segs;
      ctx.lineTo(l.x1+dx*t+(Math.random()-0.5)*15,l.y1+dy*t+(Math.random()-0.5)*15);
    }
    ctx.lineTo(l.x2,l.y2);ctx.stroke();
    ctx.restore();
  });

  // ── SCORE POPUPS ──
  S.pops.forEach(p=>{
    if(p.y<clipped_top-30||p.y>clipped_bot+30)return;
    const a=Math.min(1,p.life/22);
    ctx.save();
    ctx.shadowColor=p.color;ctx.shadowBlur=p.big?20:8;
    ctx.fillStyle=p.color+Math.floor(a*255).toString(16).padStart(2,'0');
    ctx.font=\`bold \${p.big?16:12}px monospace\`;ctx.textAlign='center';
    ctx.fillText(p.text,p.x,p.y);
    ctx.restore();
  });

  // ── BALL (skip during ready/dead — spring draws its own, dead shows overlay) ──
  if(S.phase!=='hole'&&S.phase!=='ready'&&S.phase!=='dead'&&S.phase!=='tally'){
    const b=S.ball;
    ctx.save();
    const isTrip=acidMode.active||lamboMode.active||stableMode.active||fruitFrenzy.active;
    const tripHue=(S.t*8)%360;
    ctx.shadowColor=isTrip?\`hsl(\${tripHue},100%,60%)\`:S.spaceMode?'#aa66ff':'#ffeeaa';
    ctx.shadowBlur=isTrip?40:S.spaceMode?34:28;
    const bg=ctx.createRadialGradient(b.x-3,b.y-3,1,b.x,b.y,BR);
    if(isTrip){
      bg.addColorStop(0,'#ffffff');
      bg.addColorStop(0.5,\`hsl(\${tripHue},100%,70%)\`);
      bg.addColorStop(1,\`hsl(\${(tripHue+180)%360},100%,50%)\`);
    }else{
      bg.addColorStop(0,'#ffffff');
      bg.addColorStop(0.5,S.spaceMode?'#cc88ff':'#ffeeaa');
      bg.addColorStop(1,S.spaceMode?'#6600cc':'#cc7700');
    }
    ctx.beginPath();ctx.arc(b.x,b.y,BR,0,6.28);ctx.fillStyle=bg;ctx.fill();
    // Spin marker — a line across the ball that rotates with spin angle
    const spinVis=Math.min(1,Math.abs(b.spin||0)*18);
    if(spinVis>0.05){
      const a=b.angle||0;
      ctx.globalAlpha=spinVis*0.75;
      ctx.strokeStyle=S.spaceMode?'#dd99ff':'rgba(255,220,120,0.9)';
      ctx.lineWidth=2; ctx.lineCap='round'; ctx.shadowBlur=0;
      ctx.beginPath();
      ctx.moveTo(b.x+Math.cos(a)*(BR-2), b.y+Math.sin(a)*(BR-2));
      ctx.lineTo(b.x+Math.cos(a+Math.PI)*(BR-2), b.y+Math.sin(a+Math.PI)*(BR-2));
      ctx.stroke();
      ctx.lineWidth=1; ctx.globalAlpha=spinVis*0.35;
      ctx.beginPath();
      ctx.moveTo(b.x+Math.cos(a+Math.PI/2)*(BR-3), b.y+Math.sin(a+Math.PI/2)*(BR-3));
      ctx.lineTo(b.x+Math.cos(a-Math.PI/2)*(BR-3), b.y+Math.sin(a-Math.PI/2)*(BR-3));
      ctx.stroke();
    }
    // Glint
    ctx.globalAlpha=1;ctx.shadowBlur=0;
    ctx.beginPath();ctx.arc(b.x-3,b.y-3,3.5,0,6.28);
    ctx.fillStyle='rgba(255,255,255,0.88)';ctx.fill();
    ctx.restore();
  }else{
    // Sinking
    const h=S.holes[S.holeIdx];
    if(h){
      const prog=1-S.holeTimer/90,r2=BR*(1-prog*0.65);
      ctx.save();ctx.globalAlpha=1-prog*0.85;
      ctx.shadowColor='#ffeeaa';ctx.shadowBlur=14;
      const bg=ctx.createRadialGradient(h.x-3,h.y-3,1,h.x,h.y,r2);
      bg.addColorStop(0,'#fff');bg.addColorStop(1,'#cc7700');
      ctx.beginPath();ctx.arc(h.x,h.y,Math.max(r2,0.5),0,6.28);ctx.fillStyle=bg;ctx.fill();
      ctx.restore();
    }
  }

  // ── EXTRA BALLS ──
  S.extraBalls.forEach(eb=>{
    ctx.save();
    if(eb.isDog){
      ctx.shadowColor='#ffaa44';ctx.shadowBlur=18;
      const wagA=Math.sin(S.t*0.25)*0.2;
      ctx.translate(eb.x,eb.y);ctx.rotate(wagA);
      ctx.font='16px serif';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText('\\u{1F415}',0,0);
      ctx.restore();
    } else {
      ctx.shadowColor='#00ffcc';ctx.shadowBlur=22;
      const ebg=ctx.createRadialGradient(eb.x-3,eb.y-3,1,eb.x,eb.y,BR);
      ebg.addColorStop(0,'#ffffff');
      ebg.addColorStop(0.5,'#aaffee');
      ebg.addColorStop(1,'#008866');
      ctx.beginPath();ctx.arc(eb.x,eb.y,BR,0,6.28);ctx.fillStyle=ebg;ctx.fill();
      ctx.shadowBlur=0;
      ctx.beginPath();ctx.arc(eb.x-3,eb.y-3,3.5,0,6.28);
      ctx.fillStyle='rgba(255,255,255,0.88)';ctx.fill();
      ctx.restore();
    }
  });

  // ── DEAD FLASH (funny drain message) ──
  if(S.phase==='dead'){
    const a=0.07+0.08*Math.sin(S.t*0.5);
    ctx.fillStyle=\`rgba(255,15,15,\${a})\`;ctx.fillRect(0,clipped_top,FW,VH);
    ctx.save();ctx.shadowColor='#ff4444';ctx.shadowBlur=20;
    ctx.fillStyle='rgba(255,80,80,0.6)';ctx.font='bold 20px monospace';ctx.textAlign='center';
    ctx.fillText(S._drainMsg||'✗ BALL LOST',FW/2,camY+VH/2);ctx.restore();
  }

  // ── TALLY SCREEN ──
  if(S.phase==='tally'&&tallyState){
    ctx.fillStyle='rgba(0,0,10,0.88)';ctx.fillRect(0,clipped_top,FW,VH);
    const ts=tallyState;
    // Drain message at top
    ctx.save();ctx.shadowColor='#ff4444';ctx.shadowBlur=16;
    ctx.fillStyle='rgba(255,80,80,0.7)';ctx.font='bold 18px monospace';ctx.textAlign='center';
    ctx.fillText(ts.drainMsg||'✗ BALL LOST',FW/2,camY+VH*0.15);ctx.restore();
    // Title
    ctx.fillStyle='#334466';ctx.font='bold 10px monospace';ctx.textAlign='center';
    ctx.fillText('BALL BONUS',FW/2,camY+VH*0.25);
    // Tally items
    const startY=camY+VH*0.32;
    for(let i=0;i<Math.min(ts.current,ts.items.length);i++){
      const item=ts.items[i];
      const iy=startY+i*32;
      const isBig=item.isBig;
      ctx.save();
      if(isBig){ctx.shadowColor='#ffee22';ctx.shadowBlur=12;}
      ctx.fillStyle=isBig?'#ffee22':i===ts.current-1?'#ffffff':'#4488aa';
      ctx.font=\`bold \${isBig?18:13}px monospace\`;ctx.textAlign='left';
      ctx.fillText(item.label,FW*0.15,iy);
      ctx.textAlign='right';
      if(item.val!=='') ctx.fillText(String(item.val),FW*0.6,iy);
      ctx.fillStyle=isBig?'#ffee22':'#00ffcc';
      ctx.fillText('+'+item.pts.toLocaleString(),FW*0.85,iy);
      ctx.restore();
    }
    if(ts.ariaCheer&&ts.current>=ts.items.length){
      ctx.save();
      const cheerAlpha=0.5+0.3*Math.sin(S.t*0.06);
      const isVex=ts.ariaCheer.startsWith('VEX:');
      const isZyx=ts.ariaCheer.startsWith('ZYX:');
      const cheerColor=isVex?[255,60,60]:isZyx?[100,255,180]:[100,180,255];
      const cheerGlow=isVex?'#ff2244':isZyx?'#44ffaa':'#4488ff';
      ctx.fillStyle=\`rgba(\${cheerColor[0]},\${cheerColor[1]},\${cheerColor[2]},\${cheerAlpha})\`;
      ctx.font='bold 8px monospace';ctx.textAlign='center';
      ctx.shadowColor=cheerGlow;ctx.shadowBlur=8;
      const cheerY=startY+Math.min(ts.current,ts.items.length)*32+24;
      const words=ts.ariaCheer.split(' ');let lines=[];let cur='';
      words.forEach(w=>{if((cur+' '+w).length>38&&cur){lines.push(cur);cur=w;}else{cur=cur?cur+' '+w:w;}});
      if(cur) lines.push(cur);
      lines.forEach((ln,li)=>ctx.fillText(ln,FW/2,cheerY+li*13));
      const dismissY=cheerY+lines.length*13+10;
      ctx.fillStyle='rgba(120,120,140,0.4)';ctx.font='bold 7px monospace';
      ctx.fillText('[TAP HERE TO TURN OFF CREW COMMENTS]',FW/2,dismissY);
      if(!ts._dismissBox) ts._dismissBox={x:FW/2-130,y:dismissY-8,w:260,h:14};
      ctx.restore();
    }
    if(ts.done){
      const cp=0.5+0.5*Math.sin(S.t*0.12);
      ctx.fillStyle=\`rgba(0,255,200,\${0.3+0.4*cp})\`;ctx.font='bold 11px monospace';ctx.textAlign='center';
      ctx.fillText('TAP TO CONTINUE',FW/2,camY+VH*0.85);
    }
  }

  ctx.restore(); // un-translate

  // ── OVERLAYS (no camera translate) ──

  // ── FLASHER OVERLAY ──
  if(S.flasher.active){
    const fa=(S.flasher.ticks/18)*0.45;
    ctx.save();ctx.globalAlpha=Math.min(fa,0.45);
    ctx.fillStyle=S.flasher.color;
    ctx.fillRect(0,0,VW,VH);
    ctx.restore();
  }

  // ── ACID TRIP OVERLAY ──
  if(acidMode.active){
    const ap=acidMode.ticks/ACID_DUR;
    const at=S.t*0.05;
    ctx.save();
    ctx.globalCompositeOperation='overlay';
    ctx.globalAlpha=0.25*ap;
    for(let i=0;i<3;i++){
      const hue=(S.t*4+i*120)%360;
      const cx=VW/2+Math.sin(at+i*2.1)*VW*0.3;
      const cy=VH/2+Math.cos(at*0.7+i*1.7)*VH*0.3;
      const rad=VW*0.5+Math.sin(at*1.3+i)*VW*0.2;
      const grd=ctx.createRadialGradient(cx,cy,0,cx,cy,rad);
      grd.addColorStop(0,\`hsla(\${hue},100%,60%,0.6)\`);
      grd.addColorStop(1,\`hsla(\${hue},100%,50%,0)\`);
      ctx.fillStyle=grd;ctx.fillRect(0,0,VW,VH);
    }
    ctx.globalCompositeOperation='source-over';
    ctx.globalAlpha=0.15*ap;
    ctx.fillStyle=\`hsl(\${(S.t*5)%360},100%,50%)\`;
    ctx.fillRect(0,0,VW,VH);
    ctx.restore();
    if(acidMode.ticks<120){
      ctx.save();ctx.globalAlpha=0.6*(1-acidMode.ticks/120);
      ctx.fillStyle='#000';ctx.fillRect(0,0,VW,VH);ctx.restore();
    }
  }

  // ── LAMBO MODE OVERLAY ──
  if(lamboMode.active){
    const lp=lamboMode.ticks/2400;
    ctx.save();
    ctx.globalCompositeOperation='overlay';
    ctx.globalAlpha=0.12*lp;
    const rainbowHue=(S.t*6)%360;
    const grd=ctx.createLinearGradient(0,0,VW,VH);
    grd.addColorStop(0,\`hsla(\${rainbowHue},100%,60%,0.5)\`);
    grd.addColorStop(0.5,\`hsla(\${(rainbowHue+120)%360},100%,60%,0.5)\`);
    grd.addColorStop(1,\`hsla(\${(rainbowHue+240)%360},100%,60%,0.5)\`);
    ctx.fillStyle=grd;ctx.fillRect(0,0,VW,VH);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha=0.7+0.3*Math.sin(S.t*0.08);
    ctx.fillStyle='#ffd700';ctx.font='bold 10px monospace';ctx.textAlign='center';
    ctx.shadowColor='#ffd700';ctx.shadowBlur=12;
    ctx.fillText('🏎️ LAMBO MODE',VW/2,VH-20);
    ctx.restore();
  }

  // ── LAMBO RESCUE ANIMATION ──
  if(lamboRescue.active){
    const r=lamboRescue;
    ctx.save();
    if(r.phase==='drive'){
      const screenY=r.lamboY-camY;
      for(let band=0;band<7;band++){
        const bh=6;
        ctx.fillStyle=\`hsl(\${band*51},100%,55%)\`;
        ctx.fillRect(VW*0.35,screenY+20+band*bh,VW*0.3,bh);
      }
      ctx.font='bold 28px monospace';ctx.textAlign='center';
      ctx.shadowColor='#ffd700';ctx.shadowBlur=20;
      ctx.fillText('\\u{1F3CE}\\u{FE0F}',VW*0.5,screenY);
      ctx.font='16px monospace';
      ctx.fillText('\\u{1F431}\\u{1F355}\\u{1F37A}',VW*0.5,screenY-20);
      ctx.shadowBlur=0;
      ctx.fillStyle='#ffd700';ctx.font='bold 8px monospace';
      ctx.fillText('LAMBO RESCUE!',VW*0.5,screenY+72);
    }
    if(r.phase==='shoot'){
      const catY=TW+100-camY;
      ctx.font='20px monospace';ctx.textAlign='center';
      ctx.fillText('\\u{1F431}\\u{1F355}\\u{1F37A}',VW*0.5-30,catY-10);
      const gScreenY=r.golfY-camY;
      ctx.shadowColor='#ffaa44';ctx.shadowBlur=15;
      ctx.font='18px serif';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText('\\u{1F415}',VW*0.5,gScreenY);
      ctx.shadowBlur=0;
    }
    if(r.phase==='settle'){
      const settleY=800-camY;
      const pulseA=0.5+0.5*Math.sin(r.ticks*0.15);
      ctx.globalAlpha=pulseA;
      ctx.shadowColor='#ffd700';ctx.shadowBlur=30;
      ctx.beginPath();ctx.arc(VW*0.5,settleY,14+r.ticks*0.1,0,6.28);
      ctx.strokeStyle='#ffd700';ctx.lineWidth=2;ctx.stroke();
      ctx.globalAlpha=1;
      ctx.font='bold 10px monospace';ctx.textAlign='center';
      ctx.fillStyle='#ffd700';ctx.shadowBlur=10;
      ctx.fillText('\\u{1F415} GOOD BOY! \\u{1F415}',VW*0.5,settleY-24);
    }
    ctx.restore();
  }

  // ── STABLE MODE OVERLAY ──
  if(stableMode.active){
    const sp=stableMode.ticks/STABLE_DUR;
    ctx.save();
    ctx.globalCompositeOperation='overlay';
    ctx.globalAlpha=0.1*sp;
    const grd=ctx.createLinearGradient(0,0,VW,VH);
    grd.addColorStop(0,'rgba(180,120,60,0.4)');
    grd.addColorStop(0.5,'rgba(210,160,80,0.3)');
    grd.addColorStop(1,'rgba(140,90,40,0.4)');
    ctx.fillStyle=grd;ctx.fillRect(0,0,VW,VH);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha=0.7+0.3*Math.sin(S.t*0.08);
    ctx.fillStyle='#d4a574';ctx.font='bold 10px monospace';ctx.textAlign='center';
    ctx.shadowColor='#d4a574';ctx.shadowBlur=12;
    const stableTimer=Math.ceil(stableMode.ticks/60);
    ctx.fillText('\\u{1F40E} STABLE MODE '+stableTimer+'s',VW/2,VH-20);
    ctx.restore();
    // Fade out
    if(stableMode.ticks<120){
      ctx.save();ctx.globalAlpha=0.5*(1-stableMode.ticks/120);
      ctx.fillStyle='#000';ctx.fillRect(0,0,VW,VH);ctx.restore();
    }
  }

  // ── FRUIT FRENZY OVERLAY ──
  if(fruitFrenzy.active){
    ctx.save();
    ctx.globalCompositeOperation='overlay';
    ctx.globalAlpha=0.08;
    const grd=ctx.createLinearGradient(0,0,VW,VH);
    grd.addColorStop(0,'rgba(255,225,53,0.3)');
    grd.addColorStop(0.5,'rgba(255,68,68,0.2)');
    grd.addColorStop(1,'rgba(255,225,53,0.3)');
    ctx.fillStyle=grd;ctx.fillRect(0,0,VW,VH);
    ctx.restore();
    // HUD: collected count
    ctx.save();
    ctx.globalAlpha=0.85;
    ctx.fillStyle='#ffd700';ctx.font='bold 11px monospace';ctx.textAlign='center';
    ctx.shadowColor='#ffd700';ctx.shadowBlur=10;
    ctx.fillText('\\u{1F34C} FRUIT FRENZY \\u{1F34E}',VW/2,VH-30);
    ctx.fillStyle='#fff';ctx.font='bold 9px monospace';ctx.shadowBlur=0;
    ctx.fillText(fruitFrenzy.collected+'/'+fruitFrenzy.total+' collected',VW/2,VH-16);
    ctx.restore();
  }

  // ── COMBO DECAY BAR (screen space) ──
  if(S.phase==='play'&&S.combo>0&&S.comboTimer>0){
    const barW=VW*0.5;
    const barH=5;
    const barX=(VW-barW)/2;
    const barY=2;
    const pct=S.comboTimer/180;
    ctx.save();
    ctx.fillStyle='rgba(0,0,0,0.4)';
    ctx.fillRect(barX-1,barY-1,barW+2,barH+2);
    const hue=pct>0.5?160:pct>0.25?40:0;
    ctx.fillStyle=\`hsl(\${hue},100%,55%)\`;
    ctx.shadowColor=\`hsl(\${hue},100%,55%)\`;ctx.shadowBlur=8;
    ctx.fillRect(barX,barY,barW*pct,barH);
    ctx.shadowBlur=0;
    ctx.fillStyle=\`hsl(\${hue},100%,70%)\`;ctx.font='bold 8px monospace';ctx.textAlign='center';
    ctx.fillText(\`×\${S.combo}\`,VW/2,barY+barH+10);
    ctx.restore();
  }

  // ── COMBO INTENSITY BORDER GLOW ──
  if(S.combo>=3&&S.phase==='play'){
    const comboInt=Math.min(1,(S.combo-2)/6);
    const cpulse=0.5+0.5*Math.sin(S.t*0.2);
    const borderAlpha=comboInt*0.25*cpulse;
    ctx.save();
    // Vignette border glow
    const comboColors=['#00ffcc','#ffee22','#ff8800','#ff2299','#ff0044','#aa44ff'];
    const cc=comboColors[Math.min(S.combo-3,comboColors.length-1)];
    const vig=ctx.createRadialGradient(VW/2,VH*0.35,VW*0.25,VW/2,VH*0.35,VW*0.65);
    vig.addColorStop(0,'transparent');vig.addColorStop(1,cc);
    ctx.globalAlpha=borderAlpha;ctx.fillStyle=vig;ctx.fillRect(0,0,VW,VH);
    ctx.restore();
  }

  // Game Over (only show if overlay not active — overlay handles it)
  if(S.phase==='over'&&!nameOverlayActive){
    ctx.fillStyle='rgba(0,0,10,0.93)';ctx.fillRect(0,0,VW,VH);
    ctx.save();
    const sh=(Math.sin(S.t*0.07)+1)/2;
    ctx.shadowColor='#ff00ff';ctx.shadowBlur=60;
    const gog=ctx.createLinearGradient(0,VH*0.35,0,VH*0.45);
    gog.addColorStop(0,\`hsl(\${285+sh*30},100%,68%)\`);gog.addColorStop(1,\`hsl(\${318+sh*25},100%,78%)\`);
    ctx.fillStyle=gog;ctx.font='bold 40px monospace';ctx.textAlign='center';
    ctx.fillText('GAME OVER',VW/2,VH*0.4);ctx.restore();
    ctx.save();ctx.shadowColor='#ffee44';ctx.shadowBlur=20;
    ctx.fillStyle='#ffee44';ctx.font='bold 30px monospace';ctx.textAlign='center';
    ctx.fillText(S.score.toLocaleString(),VW/2,VH*0.5);ctx.restore();
    const _best=getBestScore();if(_best>0){ctx.fillStyle='#2a3d66';ctx.font='11px monospace';ctx.textAlign='center';ctx.fillText('BEST '+_best.toLocaleString(),VW/2,VH*0.57);}
    ctx.fillStyle='#1e2e55';ctx.font='11px monospace';ctx.textAlign='center';
    ctx.fillText('TAP OR SPACE TO PLAY AGAIN',VW/2,VH*0.64);
  }

  // Menu
  if(S.phase==='menu'){
    ctx.fillStyle='rgba(0,0,12,0.94)';ctx.fillRect(0,0,VW,VH);
    const sh=(Math.sin(S.t*0.055)+1)/2;

    // ── TITLE ──
    ctx.save();ctx.shadowBlur=60;ctx.shadowColor=\`hsl(\${280+sh*40},100%,60%)\`;
    const tg=ctx.createLinearGradient(0,VH*0.04,0,VH*0.18);
    tg.addColorStop(0,\`hsl(\${270+sh*30},100%,78%)\`);tg.addColorStop(0.5,'#ff88ff');tg.addColorStop(1,\`hsl(\${310+sh*25},100%,68%)\`);
    ctx.fillStyle=tg;ctx.font='bold 52px monospace';ctx.textAlign='center';
    ctx.fillText('★ STARMUFF',VW/2,VH*0.12);ctx.restore();
    ctx.save();ctx.shadowColor='#00eeff';ctx.shadowBlur=8;
    ctx.fillStyle='#005566';ctx.font='bold 10px monospace';ctx.textAlign='center';
    ctx.fillText('C O S M I C   P I N B A L L',VW/2,VH*0.17);ctx.restore();

    if(dailyBest&&dailyBest.playerName){
      ctx.save();ctx.shadowColor='#ffee22';ctx.shadowBlur=6;
      ctx.fillStyle='#887700';ctx.font='bold 8px monospace';ctx.textAlign='center';
      ctx.fillText('👑 TODAY\\'S LEADER: '+dailyBest.playerName+' — '+dailyBest.score.toLocaleString(),VW/2,VH*0.20);
      ctx.restore();
    }

    // ── TABS ──
    const tabY=VH*0.21, tabH=38, tabW=VW*0.28;
    const tabGap=(VW-VW*0.08-tabW*3)/2;
    const tabs=[{id:'settings',label:'⚙ SET'},{id:'scores',label:'★ SCORES'},{id:'unlocks',label:'🔓 PROG'}];
    tabs.forEach((tab,i)=>{
      const tx=VW*0.04+i*(tabW+tabGap);
      const active=menuTab===tab.id;
      ctx.save();
      ctx.fillStyle=active?'rgba(0,180,140,0.18)':'rgba(0,20,40,0.5)';
      rrect(tx,tabY,tabW,tabH,8);ctx.fill();
      ctx.strokeStyle=active?'#00ffcc':'#112244';ctx.lineWidth=active?2:1;
      if(active){ctx.shadowColor='#00ffcc';ctx.shadowBlur=12;}
      rrect(tx,tabY,tabW,tabH,8);ctx.stroke();
      ctx.fillStyle=active?'#00ffcc':'#334466';
      ctx.font=\`bold \${active?13:11}px monospace\`;ctx.textAlign='center';
      ctx.shadowBlur=active?8:0;ctx.shadowColor='#00ffcc';
      ctx.fillText(tab.label,tx+tabW/2,tabY+tabH*0.62);
      ctx.restore();
    });

    const contentY=tabY+tabH+10;
    const contentH=VH*0.59;

    // ── SETTINGS TAB ──
    if(menuTab==='settings'){
      const zIdx=ZOOM_OPTS.indexOf(PREFS.zoom);
      const speedIdx=SPEED_OPTS.indexOf(PREFS.speed);
      const settings=[
        {label:'ZOOM',opts:ZOOM_LBLS,colors:['#00eeff','#00ffcc','#88ffdd'],idx:zIdx},
        {label:'SPEED',opts:SPEED_LBLS,colors:['#44aaff','#ffee22','#ff6600'],idx:speedIdx},
      ];
      const rowH=VH*0.11, rowGap=VH*0.012;

      settings.forEach((setting,si)=>{
        const ry=contentY+si*(rowH+rowGap);
        // Row label
        ctx.fillStyle='#3a5580';ctx.font='bold 11px monospace';ctx.textAlign='left';
        ctx.fillText(setting.label,VW*0.06,ry+14);

        // Three option buttons across full width
        const btnW=(VW*0.88)/3 - 6, btnH=rowH-18;
        const btnStartX=VW*0.06;
        setting.opts.forEach((opt,oi)=>{
          const bx=btnStartX+oi*(btnW+9);
          const by=ry+20;
          const sel=oi===setting.idx;
          const col=setting.colors[oi];
          ctx.save();
          // Button bg
          ctx.fillStyle=sel?\`\${col}22\`:'rgba(0,15,35,0.6)';
          rrect(bx,by,btnW,btnH,10);ctx.fill();
          // Button border
          ctx.strokeStyle=sel?col:'#1a2e50';
          ctx.lineWidth=sel?2.5:1;
          if(sel){ctx.shadowColor=col;ctx.shadowBlur=16;}
          rrect(bx,by,btnW,btnH,10);ctx.stroke();
          // Label
          ctx.fillStyle=sel?col:'#2a4466';
          ctx.font=\`bold \${sel?16:14}px monospace\`;ctx.textAlign='center';
          ctx.shadowBlur=sel?10:0;ctx.shadowColor=col;
          ctx.fillText(opt,bx+btnW/2,by+btnH*0.62);
          ctx.restore();
        });
      });

      // ── HAPTICS TOGGLE ──
      const hapticY=contentY+2*(rowH+rowGap);
      ctx.fillStyle='#3a5580';ctx.font='bold 11px monospace';ctx.textAlign='left';
      ctx.fillText('HAPTICS',VW*0.06,hapticY+14);
      const hapBtnW=(VW*0.88)/2-4;
      const hapBtnH=rowH-18;
      [{lbl:'ON',val:true,color:'#00ffcc'},{lbl:'OFF',val:false,color:'#ff4466'}].forEach((opt,oi)=>{
        const bx=VW*0.06+oi*(hapBtnW+8);
        const by=hapticY+20;
        const sel=PREFS.haptics===opt.val;
        ctx.save();
        ctx.fillStyle=sel?\`\${opt.color}22\`:'rgba(0,15,35,0.6)';
        rrect(bx,by,hapBtnW,hapBtnH,10);ctx.fill();
        ctx.strokeStyle=sel?opt.color:'#1a2e50';
        ctx.lineWidth=sel?2.5:1;
        if(sel){ctx.shadowColor=opt.color;ctx.shadowBlur=16;}
        rrect(bx,by,hapBtnW,hapBtnH,10);ctx.stroke();
        ctx.fillStyle=sel?opt.color:'#2a4466';
        ctx.font=\`bold \${sel?16:14}px monospace\`;ctx.textAlign='center';
        ctx.shadowBlur=sel?10:0;ctx.shadowColor=opt.color;
        ctx.fillText(opt.lbl,bx+hapBtnW/2,by+hapBtnH*0.62);
        ctx.restore();
      });

      // ── PLAY BUTTON ──
      const pulse=0.82+0.18*Math.sin(S.t*0.09);
      const pyBtn=contentY+3*(rowH+rowGap)+rowGap;
      ctx.save();ctx.shadowColor='#00ffcc';ctx.shadowBlur=30*pulse;
      ctx.strokeStyle=\`rgba(0,255,200,\${pulse})\`;ctx.lineWidth=2.5;
      rrect(VW*0.1,pyBtn,VW*0.8,54,12);ctx.stroke();
      ctx.fillStyle=\`rgba(0,255,200,\${0.1*pulse})\`;rrect(VW*0.1,pyBtn,VW*0.8,54,12);ctx.fill();
      ctx.fillStyle=\`rgba(0,255,200,\${pulse})\`;ctx.font='bold 22px monospace';ctx.textAlign='center';
      ctx.fillText('▶  PLAY',VW/2,pyBtn+35);ctx.restore();

      // Best score
      const best=getBestScore();
      if(best>0){
        ctx.save();ctx.shadowColor='#ffee22';ctx.shadowBlur=8;
        ctx.fillStyle='#554400';ctx.font='bold 10px monospace';ctx.textAlign='center';
        ctx.fillText('★ BEST  '+best.toLocaleString(),VW/2,pyBtn+72);ctx.restore();
      }
    }

    // ── SCORES TAB ──
    if(menuTab==='scores'){
      const scores=loadScores();
      // Header
      ctx.fillStyle='#223355';ctx.font='bold 9px monospace';ctx.textAlign='left';
      ctx.fillText('LOCAL TOP 10',VW*0.06,contentY+14);
      ctx.textAlign='right';ctx.fillText('DATE · MODE',VW*0.94,contentY+14);

      if(scores.length===0){
        ctx.fillStyle='#1a2e50';ctx.font='bold 13px monospace';ctx.textAlign='center';
        ctx.fillText('No scores yet.',VW/2,contentY+80);
        ctx.fillStyle='#0e1c3a';ctx.font='10px monospace';
        ctx.fillText('Play a game to get on the board!',VW/2,contentY+100);
      } else {
        const rowH=VH*0.055;
        const medalColors=['#ffd700','#c0c0c0','#cd7f32'];
        scores.forEach((entry,i)=>{
          const ry=contentY+28+i*rowH;
          if(ry>contentY+contentH-30) return;
          const isTop=i<3;
          const rowBg=i%2===0?'rgba(0,20,50,0.4)':'rgba(0,10,30,0.3)';
          ctx.fillStyle=rowBg;
          ctx.fillRect(VW*0.04,ry-2,VW*0.92,rowH-2);
          // Rank
          ctx.fillStyle=isTop?medalColors[i]:'#2a4466';
          ctx.font=\`bold \${isTop?13:11}px monospace\`;ctx.textAlign='center';
          if(isTop){ctx.shadowColor=medalColors[i];ctx.shadowBlur=8;}
          else ctx.shadowBlur=0;
          ctx.fillText(i===0?'🥇':i===1?'🥈':i===2?'🥉':\`#\${i+1}\`,VW*0.10,ry+rowH*0.65);
          // Name
          ctx.fillStyle=isTop?'#ffffff':'#7799bb';
          ctx.font=\`bold \${isTop?11:10}px monospace\`;ctx.textAlign='left';ctx.shadowBlur=0;
          ctx.fillText((entry.name||'ANON').slice(0,8),VW*0.17,ry+rowH*0.65);
          // Score
          ctx.fillStyle=isTop?medalColors[i]:'#4488aa';
          ctx.font=\`bold \${isTop?15:13}px monospace\`;ctx.textAlign='left';ctx.shadowBlur=isTop?6:0;
          ctx.fillText(entry.score.toLocaleString(),VW*0.42,ry+rowH*0.68);
          // Date + mode
          ctx.fillStyle='#2a4466';ctx.font='9px monospace';ctx.textAlign='right';ctx.shadowBlur=0;
          ctx.fillText(\`\${entry.date} · \${entry.speed||'?'}/\${entry.zoom||'?'}\`,VW*0.96,ry+rowH*0.68);
        });
      }

      // Server scores section — global leaderboard
      const glbH = serverScores.length > 0 ? 20 + serverScores.length * 14 + 8 : 44;
      const sbY = contentY + contentH - glbH - 8;
      ctx.fillStyle='#0d1a30';
      rrect(VW*0.04,sbY,VW*0.92,glbH,8);ctx.fill();
      ctx.strokeStyle='#1a2e50';ctx.lineWidth=1;
      rrect(VW*0.04,sbY,VW*0.92,glbH,8);ctx.stroke();
      ctx.fillStyle='#00ccff';ctx.font='bold 9px monospace';ctx.textAlign='center';
      ctx.fillText('🌐 GLOBAL TOP 20',VW/2,sbY+14);
      if(serverScores.length>0){
        ctx.textAlign='left';
        for(let i=0;i<serverScores.length;i++){
          const sy=sbY+26+i*14;
          const e=serverScores[i];
          const medal=i===0?'🥇':i===1?'🥈':i===2?'🥉':(i+1)+'.';
          ctx.fillStyle=i<3?'#ffdd44':'#8899bb';ctx.font='bold 8px monospace';
          ctx.fillText(medal,VW*0.06,sy);
          ctx.fillStyle='#ccddee';ctx.font='8px monospace';
          ctx.fillText(e.name||'ANON',VW*0.18,sy);
          ctx.textAlign='right';
          ctx.fillText(e.score.toLocaleString(),VW*0.75,sy);
          ctx.fillStyle='#556688';
          ctx.fillText(e.date||'',VW*0.94,sy);
          ctx.textAlign='left';
        }
      } else {
        ctx.fillStyle='#556688';ctx.font='8px monospace';
        ctx.fillText(serverScoresLoaded?'No scores yet — be the first!':'Loading...',VW/2-60,sbY+32);
      }

      // Back / play button
      const pulse=0.82+0.18*Math.sin(S.t*0.09);
      const pyBtn=VH*0.875;
      ctx.save();ctx.shadowColor='#00ffcc';ctx.shadowBlur=22*pulse;
      ctx.strokeStyle=\`rgba(0,255,200,\${pulse})\`;ctx.lineWidth=2;
      rrect(VW*0.1,pyBtn,VW*0.8,48,12);ctx.stroke();
      ctx.fillStyle=\`rgba(0,255,200,\${0.08*pulse})\`;rrect(VW*0.1,pyBtn,VW*0.8,48,12);ctx.fill();
      ctx.fillStyle=\`rgba(0,255,200,\${pulse})\`;ctx.font='bold 20px monospace';ctx.textAlign='center';
      ctx.fillText('▶  PLAY',VW/2,pyBtn+32);ctx.restore();
    }

    // ── UNLOCKS / PROGRESSION TAB ──
    if(menuTab==='unlocks'){
      const careerBest=getCareerBest();
      ctx.fillStyle='#223355';ctx.font='bold 9px monospace';ctx.textAlign='center';
      ctx.fillText('CAREER BEST: '+careerBest.toLocaleString(),VW/2,contentY+14);

      const unlockKeys=['focus','crew','nova'];
      const cardH=VH*0.10, cardGap=VH*0.012;
      unlockKeys.forEach((key,i)=>{
        const u=UNLOCK_THRESHOLDS[key];
        const cy2=contentY+26+i*(cardH+cardGap);
        const unlocked=careerBest>=u.score;
        const pct=Math.min(1,careerBest/u.score);

        ctx.save();
        ctx.fillStyle=unlocked?'rgba(0,40,30,0.5)':'rgba(0,10,25,0.6)';
        rrect(VW*0.04,cy2,VW*0.92,cardH,8);ctx.fill();
        ctx.strokeStyle=unlocked?u.color+'88':'#1a2e50';ctx.lineWidth=unlocked?2:1;
        if(unlocked){ctx.shadowColor=u.color;ctx.shadowBlur=10;}
        rrect(VW*0.04,cy2,VW*0.92,cardH,8);ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.fillStyle=unlocked?u.color:'#334466';
        ctx.font='bold 13px monospace';ctx.textAlign='left';
        if(unlocked){ctx.shadowColor=u.color;ctx.shadowBlur=8;}
        ctx.fillText(u.icon+' '+u.label,VW*0.08,cy2+18);
        ctx.restore();

        ctx.fillStyle=unlocked?'#667788':'#2a3d55';ctx.font='8px monospace';ctx.textAlign='left';
        ctx.fillText(u.desc,VW*0.08,cy2+32);

        if(unlocked){
          ctx.save();ctx.fillStyle=u.color;ctx.font='bold 10px monospace';ctx.textAlign='right';
          ctx.shadowColor=u.color;ctx.shadowBlur=6;
          ctx.fillText('★ UNLOCKED',VW*0.94,cy2+18);ctx.restore();
        } else {
          ctx.fillStyle='#334466';ctx.font='bold 9px monospace';ctx.textAlign='right';
          ctx.fillText('LOCKED',VW*0.94,cy2+18);
          const barX=VW*0.08,barY2=cy2+cardH-14,barW2=VW*0.84,barH2=8;
          ctx.fillStyle='#0a1525';rrect(barX,barY2,barW2,barH2,4);ctx.fill();
          ctx.strokeStyle='#1a2e50';ctx.lineWidth=1;rrect(barX,barY2,barW2,barH2,4);ctx.stroke();
          const fillW2=barW2*pct;
          if(fillW2>2){ctx.save();ctx.shadowColor=u.color;ctx.shadowBlur=4;ctx.fillStyle=u.color+'88';rrect(barX,barY2,fillW2,barH2,4);ctx.fill();ctx.restore();}
          ctx.fillStyle='#445566';ctx.font='7px monospace';ctx.textAlign='right';
          ctx.fillText(Math.floor(pct*100)+'% of '+u.score.toLocaleString(),VW*0.94,cy2+32);
        }
      });

      // ── HALL OF FIRSTS ──
      const hofY=contentY+26+3*(cardH+cardGap)+8;
      ctx.fillStyle='#0d1a30';rrect(VW*0.04,hofY,VW*0.92,VH*0.32,8);ctx.fill();
      ctx.strokeStyle='#1a2e50';ctx.lineWidth=1;rrect(VW*0.04,hofY,VW*0.92,VH*0.32,8);ctx.stroke();
      ctx.save();ctx.shadowColor='#ffdd44';ctx.shadowBlur=8;
      ctx.fillStyle='#ffdd44';ctx.font='bold 10px monospace';ctx.textAlign='center';
      ctx.fillText('🏆 HALL OF FIRSTS',VW/2,hofY+16);ctx.restore();

      if(hallOfFirsts.length>0){
        const maxShow=Math.min(hallOfFirsts.length,8);
        for(let i=0;i<maxShow;i++){
          const f=hallOfFirsts[i];
          const fy=hofY+30+i*16;
          const medalColors=['#ffd700','#c0c0c0','#cd7f32'];
          ctx.fillStyle=i<3?medalColors[i]:'#8899bb';ctx.font='bold 8px monospace';ctx.textAlign='left';
          ctx.fillText(i<3?(i===0?'🥇':i===1?'🥈':'🥉'):(i+1)+'.',VW*0.08,fy);
          ctx.fillStyle='#ccddee';ctx.font='8px monospace';
          ctx.fillText(f.playerName||'ANON',VW*0.18,fy);
          ctx.fillStyle=i<3?medalColors[i]:'#667788';ctx.font='bold 8px monospace';ctx.textAlign='center';
          ctx.fillText(f.milestone,VW*0.55,fy);
          ctx.fillStyle='#445566';ctx.font='7px monospace';ctx.textAlign='right';
          const d=f.achievedAt?new Date(f.achievedAt).toLocaleDateString('en-CA'):'';
          ctx.fillText(d,VW*0.94,fy);
          ctx.textAlign='left';
        }
      } else {
        ctx.fillStyle='#445566';ctx.font='9px monospace';ctx.textAlign='center';
        ctx.fillText('No firsts claimed yet — be the first!',VW/2,hofY+50);
      }

      const pulse=0.82+0.18*Math.sin(S.t*0.09);
      const pyBtn=VH*0.875;
      ctx.save();ctx.shadowColor='#00ffcc';ctx.shadowBlur=22*pulse;
      ctx.strokeStyle=\`rgba(0,255,200,\${pulse})\`;ctx.lineWidth=2;
      rrect(VW*0.1,pyBtn,VW*0.8,48,12);ctx.stroke();
      ctx.fillStyle=\`rgba(0,255,200,\${0.08*pulse})\`;rrect(VW*0.1,pyBtn,VW*0.8,48,12);ctx.fill();
      ctx.fillStyle=\`rgba(0,255,200,\${pulse})\`;ctx.font='bold 20px monospace';ctx.textAlign='center';
      ctx.fillText('▶  PLAY',VW/2,pyBtn+32);ctx.restore();
    }
  }

  // Space mode bar
  if(S.spaceMode&&S.phase==='play'){
    const pct=S.spaceTicks/600;
    ctx.fillStyle='rgba(100,0,180,0.3)';ctx.fillRect(0,0,VW*pct,4);
    ctx.fillStyle='rgba(180,80,255,0.8)';ctx.fillRect(0,0,VW*pct,2);
  }
}

// ═══════════════════════════════════════════════════════
// INPUT
// ═══════════════════════════════════════════════════════
document.addEventListener('keydown',e=>{
  if(nameOverlayActive||mathActive) return;
  if(e.key==='ArrowLeft'||e.key.toLowerCase()==='z'){keys.L=true; flipPow.L=1.0;}
  if(e.key==='ArrowRight'||e.key.toLowerCase()==='x'){keys.R=true; flipPow.R=1.0;}
  if(e.key.toLowerCase()==='n'&&S.phase==='play'){activateNova();return;}
  if(e.key===' '){
    e.preventDefault();
    if(S.phase==='menu'){startGame();return;}
    if(S.phase==='tally'&&tallyState){
      if(tallyState.done){S._drainMsg=tallyState.drainMsg;if(S._afterTally==='over'){S.phase='over';showNameEntry();}else{S.phase='dead';S.deadTimer=100;S.ball={x:556,y:FH-120,vx:0,vy:0,spin:0,angle:0};}tallyState=null;}
      else{tallyState.current=tallyState.items.length;tallyState.tickTimer=tallyState.items.length*12+61;tallyState.done=true;}
      return;
    }
    if(S.phase==='over'){return;}
    keys.SP=true;
  }
});
document.addEventListener('keyup',e=>{
  if(e.key==='ArrowLeft'||e.key.toLowerCase()==='z'){keys.L=false; flipPow.L=0;}
  if(e.key==='ArrowRight'||e.key.toLowerCase()==='x'){keys.R=false; flipPow.R=0;}
  if(e.key===' '){keys.SP=false;if(S.phase==='ready'&&S.plunger>0)launch();}
});

// Flipper power — 0=off, 0.0–1.0=partial, 1.0=full snap
let flipPow={L:0, R:0};

// Flipper buttons
function bindFlipBtn(btn,side){
  function getPower(e,el){
    const rect=el.getBoundingClientRect();
    const touch=e.touches?e.touches[0]:e;
    const relX=(touch.clientX-rect.left)/rect.width;
    const raw=side==='L'?(1-relX):relX;
    return Math.max(0.25, Math.min(1.0, raw*1.3));
  }
  btn.addEventListener('touchstart',e=>{
    e.preventDefault();
    if(S.phase==='menu')return;
    keys[side]=true; flipPow[side]=getPower(e,btn);
  },{passive:false});
  btn.addEventListener('touchmove',e=>{
    e.preventDefault();
    if(S.phase==='menu')return;
    if(keys[side]) flipPow[side]=getPower(e,btn);
  },{passive:false});
  btn.addEventListener('touchend',e=>{
    e.preventDefault();
    keys[side]=false; flipPow[side]=0;
  },{passive:false});
  btn.addEventListener('touchcancel',e=>{
    e.preventDefault();
    keys[side]=false; flipPow[side]=0;
  },{passive:false});
  btn.addEventListener('mousedown',e=>{
    if(S.phase==='menu')return;
    keys[side]=true; flipPow[side]=getPower(e,btn);
  });
  btn.addEventListener('mousemove',e=>{
    if(S.phase==='menu')return;
    if(keys[side]) flipPow[side]=getPower(e,btn);
  });
  btn.addEventListener('mouseup',  ()=>{keys[side]=false; flipPow[side]=0;});
  btn.addEventListener('mouseleave',()=>{keys[side]=false; flipPow[side]=0;});
}
bindFlipBtn(document.getElementById('btn-l'),'L');
bindFlipBtn(document.getElementById('btn-r'),'R');

// Flipper button visuals
function updFlipBtns(){
  const lv=Math.abs(S.lAngVel||0)>0.015&&keys.L;
  const rv=Math.abs(S.rAngVel||0)>0.015&&keys.R;
  const bl=document.getElementById('btn-l');
  const br=document.getElementById('btn-r');
  bl.classList.toggle('active',keys.L);
  bl.classList.toggle('volley',lv);
  br.classList.toggle('active',keys.R);
  br.classList.toggle('volley',rv);
  // Power bar — show a colored strip indicating touch power
  ['L','R'].forEach(side=>{
    const el=document.getElementById('btn-'+side.toLowerCase());
    const pow=flipPow[side]||0;
    const active=keys[side];
    let bar=el.querySelector('.pow-bar');
    if(!bar){
      bar=document.createElement('div');
      bar.className='pow-bar';
      bar.style.cssText='position:absolute;bottom:6px;height:4px;border-radius:2px;transition:width 0.04s,background 0.08s;pointer-events:none;';
      if(side==='L') bar.style.left='8%'; else bar.style.right='8%';
      el.appendChild(bar);
    }
    if(active&&pow>0){
      const pct=Math.round(pow*100);
      bar.style.width=pct+'%';
      const hue=pow>0.7?0:pow>0.4?30:120; // red=full, orange=mid, green=gentle
      bar.style.background=\`hsl(\${hue},100%,55%)\`;
      bar.style.boxShadow=\`0 0 6px hsl(\${hue},100%,55%)\`;
      bar.style.opacity='1';
    } else {
      bar.style.opacity='0';
    }
  });
}

// ── SMART FLIPPER ASSIST ── tap anywhere on screen fires correct flipper
document.addEventListener('touchstart',e=>{
  if(S.phase!=='play'||nameOverlayActive||mathActive) return;
  const t=e.target;
  if(t&&(t.id==='btn-l'||t.id==='btn-r'||t.closest&&t.closest('.flip-btn'))) return;
  const touch=e.touches[0];
  const screenMid=window.innerWidth/2;
  if(touch.clientX<screenMid){
    keys.L=true;flipPow.L=1.0;
    setTimeout(()=>{keys.L=false;flipPow.L=0;},150);
  } else {
    keys.R=true;flipPow.R=1.0;
    setTimeout(()=>{keys.R=false;flipPow.R=0;},150);
  }
},{passive:true});

// Canvas tap (menu/over)
canvas.addEventListener('touchstart',e=>{e.preventDefault();},{passive:false});
canvas.addEventListener('touchend',e=>{
  e.preventDefault();
  if(S.phase==='menu'){
    const rect=canvas.getBoundingClientRect();
    const touch=e.changedTouches[0];
    const cx=(touch.clientX-rect.left)/scaleRatio;
    const cy=(touch.clientY-rect.top)/scaleRatio;
    handleMenuTap(cx,cy);
    return;
  }
  if(S.phase==='tally'&&tallyState){
    const touch2=e.changedTouches[0];
    const rect2=canvas.getBoundingClientRect();
    const tx=(touch2.clientX-rect2.left)/scaleRatio;
    const ty=(touch2.clientY-rect2.top)/scaleRatio+camY;
    if(tallyState._dismissBox&&tallyState.ariaCheer){
      const db=tallyState._dismissBox;
      if(tx>db.x&&tx<db.x+db.w&&ty>db.y&&ty<db.y+db.h){
        cheersDismissed=true;try{localStorage.setItem('starmuff_cheers_off','1');}catch(e2){}
        tallyState.ariaCheer=null;tallyState._dismissBox=null;return;
      }
    }
    if(tallyState.done){
      S._drainMsg=tallyState.drainMsg;
      if(S._afterTally==='over'){S.phase='over';showNameEntry();}
      else{S.phase='dead';S.deadTimer=100;S.ball={x:556,y:FH-120,vx:0,vy:0,spin:0,angle:0};}
      tallyState=null;
    } else {
      tallyState.current=tallyState.items.length;
      tallyState.tickTimer=tallyState.items.length*12+61;
      tallyState.done=true;
    }
    return;
  }
  if(S.phase==='over'&&!nameOverlayActive){restart();return;}
},{passive:false});

// Launch button
const launchBtn=document.getElementById('launch-btn');
let chargeIv=null;
function startCharge(){
  if(S.phase==='play'&&S.novaEnergy>=NOVA_COST&&!S.novaBurst.active){activateNova();return;}
  if(S.phase!=='ready')return;chargeIv=setInterval(()=>{if(S.phase==='ready'){S.plunger=Math.min(1,S.plunger+0.026);launchBtn.classList.add('charged');}},16);
}
function stopCharge(){clearInterval(chargeIv);chargeIv=null;launchBtn.classList.remove('charged');if(S.phase==='ready'&&S.plunger>0)launch();}
launchBtn.addEventListener('touchstart',e=>{e.preventDefault();startCharge();},{passive:false});
launchBtn.addEventListener('touchend',  e=>{e.preventDefault();stopCharge();},{passive:false});
launchBtn.addEventListener('touchcancel',e=>{e.preventDefault();stopCharge();},{passive:false});
launchBtn.addEventListener('mousedown',startCharge);
launchBtn.addEventListener('mouseup',stopCharge);
launchBtn.addEventListener('mouseleave',()=>{if(chargeIv)stopCharge();});

// ═══════════════════════════════════════════════════════
// LIFECYCLE
// ═══════════════════════════════════════════════════════
function handleMenuTap(cx,cy){
  // ── TAB switching ──
  const tabY=VH*0.21, tabH=38, tabW=VW*0.28;
  const tabGap=(VW-VW*0.08-tabW*3)/2;
  if(cy>tabY&&cy<tabY+tabH){
    const tabs3=['settings','scores','unlocks'];
    for(let i=0;i<3;i++){
      const tx=VW*0.04+i*(tabW+tabGap);
      if(cx>tx&&cx<tx+tabW){menuTab=tabs3[i];return;}
    }
  }

  const contentY=tabY+tabH+10;

  if(menuTab==='settings'){
    // ── SETTINGS: three-button rows for ZOOM and SPEED ──
    const rowH=VH*0.11, rowGap=VH*0.012;
    const btnW=(VW*0.88)/3 - 6, btnStartX=VW*0.06;
    [[ZOOM_OPTS,'zoom'],[SPEED_OPTS,'speed']].forEach(([opts,key],si)=>{
      const ry=contentY+si*(rowH+rowGap)+20;
      opts.forEach((opt,oi)=>{
        const bx=btnStartX+oi*(btnW+9);
        if(cx>bx&&cx<bx+btnW&&cy>ry&&cy<ry+rowH-18){
          PREFS[key]=opts[oi];
        }
      });
    });
    // ── HAPTICS toggle ──
    const hapticY=contentY+2*(rowH+rowGap)+20;
    const hapBtnW=(VW*0.88)/2-4;
    [{val:true},{val:false}].forEach((opt,oi)=>{
      const bx=VW*0.06+oi*(hapBtnW+8);
      if(cx>bx&&cx<bx+hapBtnW&&cy>hapticY&&cy<hapticY+rowH-18){
        PREFS.haptics=opt.val;
        if(opt.val) vib([15,8,15]); // confirmation buzz
      }
    });
    // ── PLAY button ──
    const pyBtn=contentY+3*(rowH+rowGap)+rowGap;
    if(cx>VW*0.1&&cx<VW*0.9&&cy>pyBtn&&cy<pyBtn+54) startGame();
  }

  if(menuTab==='scores'){
    const pyBtn=VH*0.875;
    if(cx>VW*0.1&&cx<VW*0.9&&cy>pyBtn&&cy<pyBtn+48) startGame();
  }
  if(menuTab==='unlocks'){
    const pyBtn=VH*0.875;
    if(cx>VW*0.1&&cx<VW*0.9&&cy>pyBtn&&cy<pyBtn+48) startGame();
  }
}
function startGame(){
  focusOrb={active:false,x:0,y:0,lit:0,collected:false};
  focusMode={active:false,ticks:0};
  acidMode={active:false,ticks:0};acidTab={active:false,x:0,y:0,spawnT:0};
  lamboMode={active:false,ticks:0};lamboUnlocked=false;lamboCharges=0;lamboUsed=0;
  lamboRescue={active:false,phase:'idle',ticks:0,lamboX:0,lamboY:0,golfX:0,golfY:0,golfVy:0,catOff:false};
  holeInOneGolf={active:false,x:270,y:800,settled:false,isDog:true};dogBallIdx=-1;
  stableMode={active:false,ticks:0,horseBumpers:[],finishLine:null,bonusScored:0};horseshoe={active:false,x:0,y:0,spawnT:0};
  fruitTrigger={banana:null,apple:null,spawnT:0,active:false};fruitFrenzy={active:false,fruits:[],collected:0,total:0,score:0,songIdx:0,lastSongIdx:fruitFrenzy.lastSongIdx};
  S=mkState();S.phase='ready';
  updScore();updLives();updCombo();updMode();updBtn();updFocusBtn();updNovaBtn();updLambo();
}
canvas.addEventListener('click',e=>{
  if(S.phase==='menu'){
    const rect=canvas.getBoundingClientRect();
    handleMenuTap((e.clientX-rect.left)/scaleRatio,(e.clientY-rect.top)/scaleRatio);
  }
  if(S.phase==='tally'&&tallyState){
    const rect3=canvas.getBoundingClientRect();
    const mx=(e.clientX-rect3.left)/scaleRatio;
    const my=(e.clientY-rect3.top)/scaleRatio+camY;
    if(tallyState._dismissBox&&tallyState.ariaCheer){
      const db2=tallyState._dismissBox;
      if(mx>db2.x&&mx<db2.x+db2.w&&my>db2.y&&my<db2.y+db2.h){
        cheersDismissed=true;try{localStorage.setItem('starmuff_cheers_off','1');}catch(e3){}
        tallyState.ariaCheer=null;tallyState._dismissBox=null;return;
      }
    }
    if(tallyState.done){
      S._drainMsg=tallyState.drainMsg;
      if(S._afterTally==='over'){S.phase='over';showNameEntry();}
      else{S.phase='dead';S.deadTimer=100;S.ball={x:556,y:FH-120,vx:0,vy:0,spin:0,angle:0};}
      tallyState=null;
    } else {tallyState.current=tallyState.items.length;tallyState.tickTimer=tallyState.items.length*12+61;tallyState.done=true;}
    return;
  }
  if(S.phase==='over'&&!nameOverlayActive) restart();
});
function restart(){S=mkState();S.phase='ready';updScore();updLives();updCombo();updMode();updBtn();updNovaBtn();}

// Listen for parent messages (e.g. song ended → end fruit frenzy)
window.addEventListener('message',e=>{
  if(e.data?.type==='fruitFrenzyEnd'&&fruitFrenzy.active){
    const bonusPts=fruitFrenzy.collected*1500;
    S.score+=bonusPts;
    addPop(FW/2,camY+VH/2-60,'FRUIT FRENZY OVER!','#ffd700',true);
    addPop(FW/2,camY+VH/2-30,fruitFrenzy.collected+'/'+fruitFrenzy.total+' COLLECTED','#00ff88',true);
    addPop(FW/2,camY+VH/2,'+'+bonusPts.toLocaleString()+' BONUS','#ffee22',true);
    updScore();
    fruitFrenzy.active=false;fruitFrenzy.fruits=[];
  }
});

function loop(){tick();updFlipBtns();updRestartBtn();draw();requestAnimationFrame(loop);}

S=mkState();updScore();updLives();updCombo();updMode();updBtn();updFocusBtn();updNovaBtn();updLambo();
loop();
</script>
</body>
</html>
`;

