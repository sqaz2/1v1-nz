# Simon Protocol: source-first port

Canonical source: `sqaz2/StarMuff/client/src/components/SimonGame.tsx`, blob
`2b4a6a04994f87df7eb72aa8dab9874ceb623428`; unmodified copy at
`../upstream/SimonGame.tsx`.

## Preserved from the original

- Four original cyan/purple/magenta/green pads and rounded grid, Tailwind classes,
  glow treatments, gradient start button, lucide icons, A.R.I.A. footer.
- Sine tones at 261.63 / 329.63 / 392 / 523.25 Hz and the falling sawtooth error.
- 400 ms sequence illumination plus 100 ms gaps; 200 ms input flashes.
- Original Solo mode: random growing pattern, remembered-pattern score, restart,
  device-local `simonHighScore` record. An existing record on this origin is retained;
  browsers cannot automatically transfer storage from the StarMuff origin.

## Deliberate adapter changes

`SimonGame.tsx` is derived from the original component, not the previous substitute
clone. Its `challenge` prop exposes a single pattern attempt without changing pad
rendering. The route shell and `duel.mjs` own competition separately.

- CPU, hotseat and online use independently generated equal-length patterns.
  P2's first pad is guaranteed different so the first player's pattern is not a
  reusable preview. Both pass: length +1. Both miss: new patterns at the same length.
  Exactly one passes: that player wins. Completion order never decides the winner.
- Hotseat hides the pads during an opaque Ready handoff. Prior-attempt outcomes
  remain hidden until both attempts are submitted. Closing an active local attempt
  exits the match rather than permitting replay of its pattern.
- CPU generates a real valid input attempt with seeded, length-dependent mistakes.
  It does not receive invented scores or a separate/easier pattern length.
- Online uses the shared real HTTP/WebSocket room client. Host verifies submitted
  input arrays against deterministic patterns; claimed pass/fail values are ignored.
  Wrong round, duplicate and incomplete/corrupted attempts are ignored.
- Online reset/rematch gets a new match ID and seed from the room service; two Ready
  acknowledgements are required. Seat reconnect restores host snapshots and queued
  completed attempts. A started pattern is never replayed on reload: local input
  progress is retained in session storage and the player continues from memory.
  Refreshing in the middle of playback may therefore lose the unseen portion; the
  user can leave/request a new match rather than gain a repeat viewing.
- This is casual, host-authoritative multiplayer, not ranked anti-cheat. Deterministic
  seeds and browser code are inspectable. Do not advertise cheat-proof competition.
- Every timeout belongs to an attempt generation and is cancelled on restart/unmount.
  Pending promises resolve as cancelled; active oscillators stop/disconnect. Input
  locks synchronously so rapid clicks cannot pass into the next sequence.
- Audio is unlocked in the Ready gesture, keyboard 1–4 works, and blocked storage
  or absent Web Audio does not stop gameplay. Duel records do not overwrite Solo Best.

## Build and verification

Entry: `main.tsx` imports `style.css`. Root build emits `app.js` and `app.css` with
esbuild + Tailwind; `index.html` loads `/multiplayer/client.js` first.

`node --test tests/simon-duel.mjs`: deterministic sequences, equal-length fairness,
delayed outcome, tie rules, duplicate/stale/forged commands, CPU valid attempts,
snapshot validation, original visual/audio anchors, and lifecycle cancellation.
Root `npx tsc --noEmit` validates the React adapter.

Browser/device acceptance: solo through two rounds and restart; hotseat both-fail
and one-pass/one-fail; two-device online create/invite/Ready, different patterns,
same result, disconnect during input, reload after submission, rematch with a new
seed, leave room, and 360 px layout. Production online requires the shared backend
deployment and binding; no local-only channel is represented as online.
