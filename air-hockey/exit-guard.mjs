/** Air Hockey exit hardening — pure helpers (node-testable, no DOM).
 *
 * Problem: on Android, a left-edge swipe is the system back gesture, which no
 * web page can disable. So the game hardens two ways:
 *  1. a history guard: while a match is live, a back press is swallowed and
 *     turned into a pause + "leave?" confirm instead of an exit;
 *  2. a match snapshot in sessionStorage: if the page is actually destroyed,
 *     the menu offers to resume a CPU/local match (online already resumes
 *     through its room).
 */

export const RESUME_KEY = 'ah-resume-v1';
export const RESUME_TTL_MS = 2 * 60 * 60 * 1000;

const isInt = n => Number.isInteger(n) && n >= 0;

function validSnap(snap) {
  if (!snap || typeof snap !== 'object') return false;
  // Only a live match is resumable — a finished match must never offer resume.
  if (snap.phase !== 'serve' && snap.phase !== 'play') return false;
  if (!snap.puck || typeof snap.puck.x !== 'number' || typeof snap.puck.y !== 'number') return false;
  if (!Array.isArray(snap.scores) || snap.scores.length !== 2 || !snap.scores.every(isInt)) return false;
  if (!Array.isArray(snap.paddles) || snap.paddles.length !== 2) return false;
  return true;
}

/** Encode a resume payload. Returns a JSON string, or null when the shape is invalid. */
export function encodeResume(data) {
  if (!data || typeof data !== 'object') return null;
  const { mode, difficulty, scores, series, matchCount, snap, savedAt } = data;
  if (mode !== 'cpu' && mode !== 'local') return null;
  if (difficulty !== 'easy' && difficulty !== 'hard') return null;
  if (!Array.isArray(scores) || scores.length !== 2 || !scores.every(isInt)) return null;
  if (!series || !isInt(series.me) || !isInt(series.opp)) return null;
  if (!isInt(matchCount)) return null;
  if (!validSnap(snap)) return null;
  if (!isInt(savedAt)) return null;
  return JSON.stringify({ mode, difficulty, scores, series, matchCount, snap, savedAt });
}

/** Decode a stored resume payload. Returns the normalized object, or null when invalid or stale. */
export function decodeResume(str, nowMs = Date.now()) {
  if (typeof str !== 'string' || !str) return null;
  let data;
  try { data = JSON.parse(str); } catch (_) { return null; }
  const round = encodeResume(data);
  if (round === null) return null;
  if (data.savedAt > nowMs) return null;
  if (nowMs - data.savedAt > RESUME_TTL_MS) return null;
  return JSON.parse(round);
}

/** Pure back-press decision for the popstate handler. */
export function shouldTrapBack({ screen, guardArmed, leaving }) {
  return screen === 'play' && guardArmed === true && leaving !== true;
}
