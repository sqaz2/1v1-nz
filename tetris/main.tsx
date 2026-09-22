import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import CargoBayGame, { CargoAPI } from './CargoBayGame';
import { ACTIONS, Action, garbageHoles, drainMatchInbox, MatchInbox } from './duel-rules';
import './style.css';

declare global { interface Window { StarMuffMultiplayer: any; } }
type Mode = 'menu' | 'solo' | 'cpu' | 'local' | 'online';
type Match = { id: string; seed: string; slot: number; host: boolean; snapshot?: any; revision?: number };
const freshMatch = (): Match => ({ id: crypto.randomUUID(), seed: crypto.randomUUID(), slot: 0, host: true });

// CPU evaluates placements, then presses the original engine's controls. No board mutations.
function chooseCPU(state: any): Action[] {
  if (!state.cur || state.over || state.paused) return [];
  const board = state.board;
  let blocks = state.cur.b.map((p: number[]) => [...p]);
  let best = { score: -Infinity, x: state.cur.x, turns: 0 };
  const hit = (shape: number[][], x: number, y: number) => shape.some(([bx, by]) =>
    x + bx < 0 || x + bx >= 10 || y + by >= 20 || (y + by >= 0 && board[y + by][x + bx]));
  for (let turns = 0; turns < 4; turns++) {
    for (let x = -3; x < 10; x++) {
      if (hit(blocks, x, state.cur.y)) continue;
      let y = state.cur.y;
      while (!hit(blocks, x, y + 1)) y++;
      const grid = board.map((row: any[]) => row.map(Boolean));
      blocks.forEach(([bx, by]) => { if (y + by >= 0) grid[y + by][x + bx] = true; });
      const cleared = grid.filter((row: boolean[]) => row.every(Boolean)).length;
      const heights = Array.from({ length: 10 }, (_, c) => { const row = grid.findIndex((r: boolean[]) => r[c]); return row < 0 ? 0 : 20 - row; });
      let holes = 0;
      for (let c = 0; c < 10; c++) for (let r = 20 - heights[c]; r < 20; r++) if (!grid[r][c]) holes++;
      const rough = heights.slice(1).reduce((n, h, i) => n + Math.abs(h - heights[i]), 0);
      const score = cleared * 12 - heights.reduce((a, b) => a + b, 0) * .45 - holes * 8 - rough * .7;
      if (score > best.score) best = { score, x, turns };
    }
    const xs = blocks.map((p: number[]) => p[0]), ys = blocks.map((p: number[]) => p[1]);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    blocks = blocks.map(([x, y]: number[]) => [Math.round(cx - (y - cy)), Math.round(cy + (x - cx))]);
  }
  return [...Array(best.turns).fill('cw'), ...Array(Math.abs(best.x - state.cur.x)).fill(best.x < state.cur.x ? 'left' : 'right'), 'hard'];
}

function App() {
  const [mode, setMode] = useState<Mode>(() => new URL(location.href).searchParams.has('room') ? 'online' : 'menu');
  const [match, setMatch] = useState<Match | null>(null);
  const [presence, setPresence] = useState<any>(null);
  const mp = useRef<any>(null), duel = useRef<any>(null), lobby = useRef<HTMLDivElement>(null);
  const pending = useRef<MatchInbox>({ events: [], snapshot: null, finish: null });
  const revision = useRef(0);
  useEffect(() => {
    mp.current = window.StarMuffMultiplayer.mount({
      game: 'tetris', container: lobby.current,
      onStart(data: any) {
        duel.current = null; pending.current = { events: [], snapshot: data.snapshot, finish: null };
        setMode('online'); setMatch({ id: data.matchId, seed: String(data.seed), slot: data.slot, host: data.isHost, snapshot: data.snapshot, revision: ++revision.current });
      },
      onEvent(event: any) { if (duel.current) duel.current.event(event); else pending.current.events.push(event); },
      onSnapshot(event: any) { if (duel.current) duel.current.snapshot(event.snapshot); else pending.current.snapshot = event.snapshot; },
      onPresence(data: any) { setPresence(data); },
      onFinish(data: any) { if (duel.current) duel.current.finish(data.result); else pending.current.finish = data; },
      onLeave() { duel.current = null; setMatch(null); setMode('menu'); },
    });
    return () => mp.current?.destroy?.();
  }, []);
  const leave = () => { if (mode === 'online') mp.current?.leave(); duel.current = null; setMatch(null); setMode('menu'); };
  const start = (next: Mode) => { setMode(next); setMatch(next === 'online' || next === 'solo' ? null : freshMatch()); };
  return <main>
    <header className="page-header"><a href="/">← 1v1.nz</a><div><h1>CARGO BAY <span>1v1</span></h1><p>The original StarMuff cargo station. Two bays. One survivor.</p></div></header>
    {mode === 'menu' && <section className="mode-menu" aria-label="Choose game mode">
      <button onClick={() => start('online')}><strong>Play a friend online</strong><span>Create a room, share the link, then both ready up.</span></button>
      <button onClick={() => start('cpu')}><strong>Vs CPU</strong><span>The original engine on both sides, with garbage attacks.</span></button>
      <button onClick={() => start('local')}><strong>Shared keyboard</strong><span>P1: WASD + F drop · P2: arrows + Space drop.</span></button>
      <button onClick={() => start('solo')}><strong>Original solo mission</strong><span>All sectors, space facts, audio and maths bonus rounds.</span></button>
    </section>}
    <section className="online-lobby" hidden={mode !== 'online'}><div ref={lobby}/>{!match && <button className="secondary" onClick={leave}>Back to game modes</button>}</section>
    {mode === 'solo' && <section className="solo-stage"><CargoBayGame onClose={leave}/></section>}
    {match && <Duel key={`${match.id}:${match.revision || 0}`} mode={mode} match={match} mp={mp} bridge={duel} pending={pending} presence={presence} leave={leave}
      rematch={() => mode === 'online' ? mp.current?.setReady(true) : setMatch(freshMatch())}/>}
    {['cpu','local','online'].includes(mode) && <p className="rules">Clear 2 / 3 / 4 rows to send 1 / 2 / 4 garbage rows. Attacks cancel queued rows first. Both pilots receive the same seeded 7-bag sequence. Maths bonuses stay in Solo; versus sectors never interrupt combat.</p>}
  </main>;
}

function Duel({ mode, match, mp, bridge, pending, presence, leave, rematch }: any) {
  const apis = useRef<(CargoAPI | null)[]>([null, null]);
  const attackId = useRef(match.snapshot?.attackId || 0), resultRef = useRef<number | null>(match.snapshot?.result ?? null);
  const [result, setResult] = useState<number | null>(resultRef.current), [scores, setScores] = useState<any[]>([]);
  const [waiting, setWaiting] = useState(false), [rematchWaiting, setRematchWaiting] = useState(false);
  const online = mode === 'online', authoritative = !online || match.host;
  const latestSnapshot = useRef(match.snapshot), lastInput = useRef(0);
  const inputSeq = useRef<number[]>(match.snapshot?.inputSeq || [0, 0]);
  const disconnectedRef = useRef(online && presence?.connected === false), hiddenRef = useRef(document.hidden);
  const makeSnapshot = () => ({ version: 1, game: 'tetris', matchId: match.id, seed: match.seed,
    boards: apis.current.map(api => api?.snapshot()), attackId: attackId.current, inputSeq: inputSeq.current, result: resultRef.current });
  const syncPause = () => {
    if (authoritative) {
      const paused = disconnectedRef.current || hiddenRef.current;
      setWaiting(paused);
      apis.current.forEach(api => api?.freeze(resultRef.current !== null || paused));
    }
  };
  const finish = (loser: number) => {
    if (!authoritative || resultRef.current !== null) return;
    const winner = 1 - loser; resultRef.current = winner; setResult(winner);
    apis.current.forEach(api => api?.freeze(true));
    if (online) { mp.current.publish(makeSnapshot()); mp.current.finish({ winner, reason: 'cargo-bay-full' }); }
  };
  const acceptSnapshot = (snapshot: any) => {
    if (!snapshot || snapshot.game !== 'tetris' || snapshot.matchId !== match.id || !Array.isArray(snapshot.boards)) return;
    latestSnapshot.current = snapshot;
    snapshot.boards.forEach((state: any, slot: number) => { if (state && slot < 2) apis.current[slot]?.hydrate(state); });
    attackId.current = snapshot.attackId || 0;
    if (snapshot.inputSeq) inputSeq.current = snapshot.inputSeq;
    resultRef.current = snapshot.result ?? null; setResult(resultRef.current); setScores(snapshot.boards);
    setWaiting(snapshot.result == null && snapshot.boards.some((board: any) => board?.paused));
  };
  const handlers = {
    event(event: any) {
      if (!match.host || event.matchId !== match.id || event.type !== 'cargo-input' || event.slot === match.slot || resultRef.current !== null) return;
      if (![0, 1].includes(event.slot) || !ACTIONS.includes(event.data?.action) || event.seq <= inputSeq.current[event.slot]) return;
      inputSeq.current[event.slot] = event.seq;
      // Replay contains legitimate rapid historical inputs. Live callers are rate-limited by rooms.
      lastInput.current = performance.now(); apis.current[event.slot]?.input(event.data.action);
    },
    snapshot(snapshot: any) { if (!authoritative) acceptSnapshot(snapshot); },
    finish(value: any) {
      if (![0, 1].includes(value?.winner)) return;
      resultRef.current = value.winner; setResult(value.winner); apis.current.forEach(api => api?.freeze(true));
    },
  };
  const ready = (slot: number, api: CargoAPI) => {
    apis.current[slot] = api;
    if (pending.current.snapshot?.matchId === match.id) latestSnapshot.current = pending.current.snapshot;
    const state = latestSnapshot.current?.boards?.[slot]; if (state) api.hydrate(state);
    if (apis.current.every(Boolean)) {
      bridge.current = handlers;
      // Apply metadata as well as boards, including a result received during mount.
      if (!pending.current.snapshot && latestSnapshot.current) pending.current.snapshot = latestSnapshot.current;
      drainMatchInbox(match.id, pending.current, { ...handlers, snapshot(snapshot: any) {
        acceptSnapshot(snapshot);
        // A saved disconnect pause must be reconciled with current presence before
        // queued peer actions replay; finished snapshots remain frozen by resultRef.
        syncPause();
      } });
    }
    syncPause();
  };
  useEffect(() => {
    let queue: Action[] = [], pieceLock = -1;
    const timer = setInterval(() => {
      if (!apis.current.every(Boolean)) return;
      if (authoritative) { const snapshot = makeSnapshot(); setScores(snapshot.boards); if (online && mp.current?.active) mp.current.publish(snapshot); }
      if (mode === 'cpu' && resultRef.current === null) {
        const cpu = apis.current[1]!, state = cpu.snapshot();
        if (state.locks !== pieceLock || !queue.length) { queue = chooseCPU(state); pieceLock = state.locks; }
        const action = queue.shift(); if (action) cpu.input(action);
      }
    }, 120);
    return () => { clearInterval(timer); bridge.current = null; };
  }, []);
  useEffect(() => {
    if (!online || !presence) return;
    disconnectedRef.current = presence.connected === false;
    setWaiting(disconnectedRef.current); syncPause();
  }, [presence]);
  useEffect(() => {
    if (!authoritative) return;
    const onVisibility = () => { hiddenRef.current = document.hidden; syncPause(); if (online) mp.current?.publish(makeSnapshot()); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);
  const labels = mode === 'cpu' ? ['You', 'CPU'] : ['Pilot 1', 'Pilot 2'];
  const order = online && match.slot === 1 ? [1, 0] : [0, 1];
  return <section className="duel">
    <div className="duel-status" role="status">{result !== null ? `${labels[result]} wins the cargo duel!` : waiting ? 'Duel paused — keep the host game open and wait for both pilots to reconnect.' : 'Same cargo sequence. Clear lines. Survive.'}</div>
    <div className={`duel-grid ${mode === 'local' ? 'local-grid' : ''}`}>
      {order.map((slot, displayIndex) => {
        const controlled = mode === 'local' || slot === (online ? match.slot : 0);
        return <article className={`duel-card ${displayIndex ? 'opponent-card' : 'your-card'}`} key={slot}>
          <div className="pilot-score"><strong>{labels[slot]}{online && slot === match.slot ? ' (you)' : ''}</strong><span>Lines {scores[slot]?.lines || 0} · Sent {scores[slot]?.sent || 0}</span></div>
          <div className="duel-stage"><CargoBayGame onClose={leave} duel={{
            seed: match.seed, remote: !authoritative, controlled,
            keys: !controlled ? 'none' : mode === 'local' && slot === 0 ? 'wasd' : 'arrows', label: 'CARGO BAY',
            onReady: api => ready(slot, api), onInput: action => { if (online && resultRef.current === null) mp.current.send('cargo-input', { action }); },
            onAttack: count => { if (authoritative && resultRef.current === null) apis.current[1 - slot]?.garbage(garbageHoles(match.seed, ++attackId.current, count)); },
            onOver: () => finish(slot),
          }}/></div>
          {mode === 'local' && <p className="key-hint">{slot === 0 ? 'A/D move · W rotate · S soft · F drop' : '←/→ move · ↑ rotate · ↓ soft · Space drop'}</p>}
        </article>;
      })}
    </div>
    {result !== null && <div className="result-panel" role="alert"><h2>{labels[result]} wins!</h2><button disabled={rematchWaiting} onClick={() => { setRematchWaiting(online); rematch(); }}>{rematchWaiting ? 'Ready — waiting for your friend' : 'Rematch'}</button></div>}
    <button className="secondary" onClick={leave}>Leave duel</button>
  </section>;
}

createRoot(document.getElementById('app')!).render(<App/>);
