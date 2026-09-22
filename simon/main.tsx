import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import SimonGame, { unlockSimonAudio, type ColorKey } from './SimonGame';
import { createDuel, sequenceFor, submitAttempt, startAttempt, validSnapshot, validateInputs, cpuInputs } from './duel.mjs';
import './style.css';

declare global { interface Window { StarMuffMultiplayer: any; } }
type Mode = 'solo' | 'cpu' | 'hotseat' | 'online' | null;
type Progress = { round: number; inputs: number[]; complete?: boolean };

function App() {
  const [mode, setMode] = useState<Mode>(() => new URL(location.href).searchParams.has('room') ? 'online' : null);
  const [duel, setDuel] = useState<any>(null);
  const state = useRef<any>(null);
  const modeRef = useRef<Mode>(null);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [attemptSerial, setAttemptSerial] = useState(0);
  const [resumeInputs, setResumeInputs] = useState<any>(undefined);
  const [connected, setConnected] = useState(false);
  const [notice, setNotice] = useState('');
  const [onlineError, setOnlineError] = useState('');
  const onlineContainer = useRef<HTMLDivElement>(null);
  const mp = useRef<any>(null);
  const localSlot = useRef(0);
  const currentMatch = useRef('');
  const queuedAttempt = useRef<any>(null);
  const progress = useRef<Progress | null>(null);
  modeRef.current = mode;

  function readProgress(): Progress | null {
    try { return JSON.parse(sessionStorage.getItem(`simon:${currentMatch.current}:${localSlot.current}`) || 'null'); }
    catch { return null; }
  }
  function saveProgress(value: Progress | null) {
    progress.current = value;
    try {
      const key = `simon:${currentMatch.current}:${localSlot.current}`;
      if (value) sessionStorage.setItem(key, JSON.stringify(value));
      else sessionStorage.removeItem(key);
    } catch {}
  }
  function accept(next: any) {
    if (!next) return;
    if (state.current?.round !== next.round || state.current?.seed !== next.seed || next.status === 'finished') {
      setActiveSlot(null); setResumeInputs(undefined);
      if (progress.current?.round !== next.round) saveProgress(null);
      setNotice('');
    }
    state.current = next; setDuel(next);
  }
  function publish(next: any) {
    accept(next);
    if (mp.current?.isHost && modeRef.current === 'online') {
      mp.current.publish(next);
      if (next.status === 'finished') mp.current.finish({ winner: next.winner, reason: 'memory-duel', length: next.length });
    }
  }
  function submit(slot: number, payload: any) {
    const next = submitAttempt(state.current, slot, payload);
    if (next !== state.current) publish(next);
  }
  function localGame(selected: 'cpu' | 'hotseat') {
    if (mp.current?.active) mp.current.leave();
    modeRef.current = selected; setMode(selected);
    currentMatch.current = ''; progress.current = null; queuedAttempt.current = null;
    setActiveSlot(null); setResumeInputs(undefined); setNotice('');
    accept(createDuel(crypto.randomUUID()));
  }
  function menu() {
    if (modeRef.current === 'online') mp.current?.leave();
    modeRef.current = null; setMode(null); state.current = null; setDuel(null);
    setActiveSlot(null); setResumeInputs(undefined); setNotice(''); queuedAttempt.current = null;
  }
  function start(slot: number, resume = false) {
    if (!state.current || state.current.status !== 'playing') return;
    unlockSimonAudio(); setNotice('');
    let previous: Progress | null = null;
    if (modeRef.current === 'online') {
      previous = progress.current?.round === state.current.round ? progress.current : null;
      if (!previous) saveProgress({ round: state.current.round, inputs: [] });
      mp.current?.send('simon-start', { round: state.current.round });
      if (mp.current?.isHost) publish(startAttempt(state.current, slot, state.current.round));
    }
    setResumeInputs(resume ? previous?.inputs || [] : undefined);
    setAttemptSerial(n => n + 1); setActiveSlot(slot);
  }
  function complete(slot: number, inputs: number[]) {
    const payload = { round: state.current.round, inputs };
    setActiveSlot(null); setResumeInputs(undefined);
    if (modeRef.current === 'online') {
      saveProgress({ ...payload, complete: true }); queuedAttempt.current = payload;
      mp.current?.send('simon-attempt', payload);
      if (mp.current?.isHost) submit(slot, payload);
      if (state.current?.round === payload.round && state.current?.status === 'playing') setNotice('Attempt submitted. Waiting for the other player.');
    } else submit(slot, payload);
  }

  useEffect(() => {
    if (!window.StarMuffMultiplayer) { setOnlineError('Online client could not load. Reload the page to retry.'); return; }
    mp.current = window.StarMuffMultiplayer.mount({
      game: 'simon', container: onlineContainer.current,
      onStart: ({ matchId, seed, slot, isHost, resumed, snapshot }: any) => {
        modeRef.current = 'online'; setMode('online'); localSlot.current = slot;
        currentMatch.current = matchId; setNotice(''); setActiveSlot(null); setResumeInputs(undefined);
        const next = validSnapshot(snapshot, seed) ? snapshot : createDuel(seed);
        state.current = next; setDuel(next);
        progress.current = readProgress();
        if (progress.current?.round !== next.round) saveProgress(null);
        queuedAttempt.current = progress.current?.complete ? progress.current : null;
        if (isHost) mp.current?.publish(next);
        if (resumed) setNotice('Reconnected. Completed attempts are kept; a started pattern cannot be replayed.');
        if (queuedAttempt.current && next.attempts[slot] === null) {
          mp.current?.send('simon-attempt', queuedAttempt.current);
          if (isHost) submit(slot, queuedAttempt.current);
        }
      },
      onEvent: ({ type, data, slot, matchId }: any) => {
        if (matchId !== currentMatch.current || !mp.current?.isHost || !state.current) return;
        if (type === 'simon-attempt') submit(slot, data);
        if (type === 'simon-start') {
          const next = startAttempt(state.current, slot, data?.round);
          if (next !== state.current) publish(next);
        }
      },
      onSnapshot: ({ snapshot, slot, matchId }: any) => {
        // onStart has already restored the host snapshot and re-applied its
        // locally completed attempt. The client's following hydration callback
        // contains the OLD checkpoint and must not roll that recovery back.
        if (mp.current?.isHost || matchId !== currentMatch.current || !state.current || slot !== 0
          || !validSnapshot(snapshot, state.current.seed) || snapshot.round < state.current.round) return;
        accept(snapshot);
        if (snapshot.attempts[localSlot.current] || progress.current?.round !== snapshot.round) queuedAttempt.current = null;
      },
      onPresence: ({ connected: bothConnected }: any) => {
        setConnected(!!bothConnected);
        if (bothConnected && queuedAttempt.current && state.current?.round === queuedAttempt.current.round) mp.current?.send('simon-attempt', queuedAttempt.current);
        if (bothConnected && mp.current?.isHost && state.current && mp.current.matchId === currentMatch.current
          && state.current.seed === String(mp.current.seed)) publish(state.current);
      },
      onFinish: ({ result, matchId }: any) => {
        if (matchId !== currentMatch.current || !state.current || state.current.status === 'finished') return;
        if (result?.reason === 'left' || result?.reason === 'forfeit') {
          setActiveSlot(null); setNotice('The other player left the match. Start a new room or return to modes.');
        }
      },
      onLeave: () => {
        if (modeRef.current === 'online') {
          modeRef.current = null; setMode(null); state.current = null; setDuel(null); setActiveSlot(null);
          if (mp.current?.roomCode) mp.current.leave();
        }
      },
    });
    return () => mp.current?.destroy?.();
  }, []);

  useEffect(() => {
    if (mode !== 'cpu' || !duel || duel.status !== 'playing' || duel.attempts[1]) return;
    const timer = setTimeout(() => submit(1, {
      round: duel.round, inputs: cpuInputs(duel.seed, duel.round, duel.length),
    }), 1100 + duel.length * 600);
    return () => clearTimeout(timer);
  }, [mode, duel?.round, duel?.seed, duel?.status]);

  const online = mode === 'online';
  const slot = online ? localSlot.current : mode === 'hotseat' && duel?.attempts[0] ? 1 : 0;
  const submitted = !!duel?.attempts[slot] || (online && progress.current?.round === duel?.round && progress.current?.complete);
  const alreadyStarted = online && (duel?.started[slot] || progress.current?.round === duel?.round);
  const names = mode === 'cpu' ? ['You', 'A.R.I.A.'] : ['Player 1', 'Player 2'];
  const roundMessage = !duel?.last ? 'Both players face a different pattern of the same length.'
    : duel.last.outcomes.every(Boolean) ? 'Both passed. The next pattern is one pad longer.'
    : duel.last.outcomes.every((p: boolean) => !p) ? 'Both missed. Try new patterns at the same length.' : '';

  return <main className="simon-page">
    <nav><a href="/">← 1v1.nz</a><span>StarMuff original · memory duel</span></nav>
    <div className="simon-shell">
      {mode !== 'solo' && <header><p className="eyebrow">A.R.I.A. MEMORY CORE</p><h1>Simon Protocol</h1><p>The original StarMuff pads, sounds and patterns. Now with a real opponent.</p></header>}
      {mode === null && <section className="simon-modes" aria-label="Game modes">
        <button onClick={() => setMode('solo')}><strong>Original Solo</strong><span>The original growing pattern and your saved high score.</span></button>
        <button onClick={() => localGame('cpu')}><strong>vs A.R.I.A.</strong><span>Equal-length memory challenges against the CPU.</span></button>
        <button onClick={() => localGame('hotseat')}><strong>Pass the phone</strong><span>Two players. Private patterns and a clear handoff.</span></button>
        <button onClick={() => setMode('online')}><strong>Online 1v1</strong><span>Create a room, send the link, and both tap Ready.</span></button>
      </section>}
      <div hidden={!online} ref={onlineContainer} className="simon-online" />
      {online && onlineError && <p role="alert">{onlineError}</p>}
      {mode === 'solo' && <SimonGame onClose={menu} />}
      {mode && mode !== 'solo' && duel && <>
        <div className="duel-score" aria-label="Duel status"><span>Round {duel.round}</span><strong>{duel.length} {duel.length === 1 ? 'pad' : 'pads'}</strong><span>{online ? `You are P${slot + 1}` : mode === 'cpu' ? 'vs A.R.I.A.' : 'Local 1v1'}</span></div>
        {online && !connected && <p className="connection-note" role="status">Connection paused. Your attempt is kept; submissions wait for reconnection.</p>}
        {duel.status === 'finished' ? <section className="simon-handoff" aria-live="polite"><h2>{names[duel.winner]} won!</h2><p>One player remembered the {duel.length}-pad pattern and the other missed. Both attempts were compared.</p><button className="primary" onClick={() => online ? mp.current?.setReady(true) : localGame(mode as 'cpu' | 'hotseat')}>{online ? 'Ready for rematch' : 'Play again'}</button></section>
          : activeSlot !== null ? <SimonGame key={`${duel.seed}:${duel.round}:${activeSlot}:${attemptSerial}`} onClose={() => { if (!online) { menu(); return; } setActiveSlot(null); if (progress.current?.complete) complete(activeSlot, progress.current.inputs); else setNotice('Attempt paused. Continue from memory when ready.'); }} challenge={{
            id: `${duel.seed}:${duel.round}:${activeSlot}:${attemptSerial}`,
            sequence: sequenceFor(duel.seed, duel.round, duel.length, activeSlot) as ColorKey[],
            resumeInputs,
            onProgress: (inputs) => { if (online) saveProgress({ round: duel.round, inputs, complete: validateInputs(sequenceFor(duel.seed, duel.round, duel.length, activeSlot), inputs) !== null }); },
            onComplete: (inputs) => complete(activeSlot, inputs),
          }} />
          : <section className="simon-handoff" aria-live="polite">
            <h2>{submitted ? 'Attempt locked in' : mode === 'hotseat' ? `Pass to ${names[slot]}` : alreadyStarted ? 'Continue your attempt' : 'Ready for your pattern?'}</h2>
            <p>{submitted ? 'Waiting for the other attempt. Results stay hidden until both players finish.' : mode === 'hotseat' ? 'The other player should look away. Tap Ready only when you have the phone.' : alreadyStarted ? 'Your pattern will not replay. Continue entering it from memory.' : roundMessage}</p>
            {mode === 'hotseat' && duel.last && !duel.attempts[0] && <p>{roundMessage}</p>}
            {!submitted && <button className="primary" disabled={online && !connected} onClick={() => start(slot, !!alreadyStarted)}>{alreadyStarted ? 'Continue from memory' : `Ready${mode === 'hotseat' ? ` — ${names[slot]}` : ''}`}</button>}
            {mode === 'hotseat' && !submitted && <small>Different patterns. Same length. A miss only loses if the other player passes.</small>}
          </section>}
        {notice && <p className="notice" role="status">{notice}</p>}
      </>}
      {mode && mode !== 'solo' && <div className="simon-actions"><button onClick={menu}>{online ? 'Leave room / modes' : 'Back to modes'}</button></div>}
      {mode !== 'solo' && <footer>Both pass → longer pattern. Both miss → new patterns at the same length.<br />No speed advantage; the result waits for both attempts.</footer>}
    </div>
  </main>;
}

createRoot(document.getElementById('root')!).render(<App />);
