(function (root) {
  'use strict';
  const makePlayer = () => ({score: 0, lives: 3, ticks: 0, seq: -1, status: 'waiting'});
  function createMatch(id, seed) {
    return {version: 1, id: String(id), seed: String(seed), players: [makePlayer(), makePlayer()], result: null};
  }
  function update(match, slot, message) {
    if (!match || ![0, 1].includes(slot) || !message || message.matchId !== match.id || match.result) return false;
    const previous = match.players[slot];
    const {score, ticks, seq, status, lives} = message;
    if (!Number.isSafeInteger(score) || score < previous.score || score > 1e12 ||
        !Number.isSafeInteger(ticks) || ticks < previous.ticks ||
        !Number.isSafeInteger(seq) || seq <= previous.seq ||
        !Number.isInteger(lives) || lives < 0 || lives > 5 ||
        !['playing', 'done', 'forfeit'].includes(status) ||
        ['done', 'forfeit'].includes(previous.status)) return false;
    if (status === 'done' && lives !== 0) return false;
    match.players[slot] = {score, ticks, seq, status, lives};
    const [a, b] = match.players;
    if ([a, b].every(p => ['done', 'forfeit'].includes(p.status))) {
      const winner = a.status === 'forfeit' && b.status !== 'forfeit' ? 1
        : b.status === 'forfeit' && a.status !== 'forfeit' ? 0
        : a.status === 'forfeit' && b.status === 'forfeit' ? null
        : a.score === b.score ? null : a.score > b.score ? 0 : 1;
      match.result = {winner, scores: [a.score, b.score], draw: winner === null};
    }
    return true;
  }
  function validate(snapshot, id) {
    return !!snapshot && snapshot.version === 1 && snapshot.id === id && typeof snapshot.seed === 'string' &&
      Array.isArray(snapshot.players) && snapshot.players.length === 2 && snapshot.players.every(p =>
        p && Number.isSafeInteger(p.score) && p.score >= 0 && Number.isSafeInteger(p.seq) &&
        Number.isSafeInteger(p.ticks) && p.ticks >= 0 && ['waiting','playing','done','forfeit'].includes(p.status));
  }
  const api = {createMatch, update, validate};
  if (typeof module !== 'undefined') module.exports = api;
  root.PinballDuel = api;
})(typeof window !== 'undefined' ? window : globalThis);
