// Duel-only additions. The Cargo Bay renderer, movement and scoring remain upstream's.
export type Action = 'left' | 'right' | 'soft' | 'hard' | 'cw' | 'ccw';
export const ACTIONS: Action[] = ['left', 'right', 'soft', 'hard', 'cw', 'ccw'];
export function seedNumber(seed: string | number): number {
  let h = 2166136261;
  for (const c of String(seed)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0 || 1;
}
export function nextRandom(state: number): [number, number] {
  const next = (state + 0x6d2b79f5) >>> 0;
  let t = Math.imul(next ^ next >>> 15, next | 1);
  t ^= t + Math.imul(t ^ t >>> 7, t | 61);
  return [((t ^ t >>> 14) >>> 0) / 4294967296, next];
}
export function seededBag(state: number): { bag: string[]; state: number } {
  const bag = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
  for (let i = bag.length - 1; i > 0; i--) {
    const [value, next] = nextRandom(state); state = next;
    const j = Math.floor(value * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return { bag, state };
}
export function resolveAttack(lines: number, pending: number[]): { outgoing: number; remaining: number[] } {
  const attack = [0, 0, 1, 2, 4][Math.min(4, Math.max(0, lines))];
  const cancelled = Math.min(attack, pending.length);
  return { outgoing: attack - cancelled, remaining: pending.slice(cancelled) };
}
export function garbageHoles(seed: string | number, attackId: number, count: number): number[] {
  let state = seedNumber(`${seed}:garbage:${attackId}`);
  return Array.from({ length: Math.min(20, count) }, () => {
    const [value, next] = nextRandom(state); state = next; return Math.floor(value * 10);
  });
}

export type MatchInbox = { events: any[]; snapshot: any; finish: any };
// React mounting is asynchronous; a final snapshot/finish may arrive before either
// engine API exists. Restore complete match metadata before replaying any inputs.
export function drainMatchInbox(matchId: string, inbox: MatchInbox, handlers: {
  snapshot: (snapshot: any) => void; finish: (result: any) => void; event: (event: any) => void;
}) {
  if (inbox.snapshot?.matchId === matchId) handlers.snapshot(inbox.snapshot);
  if (inbox.finish?.matchId === matchId) handlers.finish(inbox.finish.result);
  const events = inbox.events.splice(0);
  inbox.snapshot = null; inbox.finish = null;
  events.forEach(event => { if (event.matchId === matchId) handlers.event(event); });
}
