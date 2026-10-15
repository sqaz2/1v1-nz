// Tiny synthesized SFX (no audio files). WebAudio is unlocked on first user gesture.
export function createAudio() {
  let ctx = null, muted = false;
  const tone = (f, d, type = 'sine', vol = 0.2, slide = 0) => { if (!ctx || muted) return; const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + d + 0.02); };
  return {
    unlock() { if (!ctx) { const A = window.AudioContext || window.webkitAudioContext; if (A) ctx = new A(); } ctx?.resume?.(); },
    toggle() { muted = !muted; return muted; },
    putt(p) { tone(180 + p * 220, 0.08, 'triangle', 0.25); },
    hit(s) { tone(120 + Math.min(s, 9) * 30, 0.06, 'square', Math.min(0.18, 0.03 + s * 0.02)); },
    cup() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.18, 'sine', 0.2), i * 90)); },
    out() { tone(400, 0.4, 'sawtooth', 0.12, -300); },
    win() { [392, 523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.25, 'triangle', 0.18), i * 120)); },
  };
}
