# Cargo Bay source and adaptation record

Original repository: `sqaz2/StarMuff`.
Original file: `client/src/components/CargoBayGame.tsx`.
Pinned source blob: `c1e015e6ccab91aa2f04f50d2b9630ef013c8ed0`.
Canonical imported copy: `../upstream/CargoBayGame.tsx` (unchanged).
Playable derivative: `CargoBayGame.tsx`; two-engine duel shell: `main.tsx`.

## Preserved original implementation

Solo retains the original React/canvas game rather than a reimplementation:
piece geometry and rotation, movement/collision/locking, scoring, glowing rounded
crate renderer, starfield, ghost, next preview, sector palette/progression, space
facts, timed maths bonus rounds, high scores, sound cues, swipe/tap controls and
held-button controls. The changes also clean up held-button timers on unmount
and cap background-frame time jumps. UI exit goes to this site's game modes.

## Explicit versus adaptations

- Two independent instances of the original component, using identical seeded
  seven-piece bags with independent RNG state.
- Sector advancement is continuous in duels: no per-pilot maths pause. All original
  maths remains available in Solo, and the mode difference is stated on screen.
- Double/triple/four-line clears send 1/2/4 garbage rows. Outgoing attack cancels
  queued incoming rows first; remaining incoming rows rise once at the next lock.
- CPU plans legal placements and operates original controls. Local P1 and P2 use
  separate keymaps. Online guest controls are relayed to host-owned engine state.
- Host snapshots retain both boards, active pieces, RNG/bags, queues, attack ID,
  processed input sequences and result. Reconnect remounts/hydrates those engines;
  early replay events are buffered and deduplicated.
- Both engines pause for disconnect or a hidden host tab. Rematch requires both
  online players ready, then starts a fresh match/seed/component tree.
- Mobile shows a full local bay with original next preview and touch controls,
  alongside a mini opponent bay using the same renderer. Local keyboard mode
  stacks the two bays on narrow screens.

## Validation and limitations

`tests/tetris.cjs`: 12 passing executable tests of the compiled component and
duel rules, including seeded stream independence, garbage cancellation/rise/loss,
guest forwarding/no simulation, pause/resume, snapshot continuation, keymaps and
rematch/timer cleanup, and finished-match messages arriving during React mount.
esbuild compilation and whitespace checks pass.

Preview browser QA at commit `0155706` verified original solo canvas/next/ghost,
hard drop and pause/resume, CPU play with sector progression and garbage, game-over
result, clean rematch scores, independent F/Space local controls, and the 390×844
CSS viewport fixture with visible original next preview and no horizontal overflow.
Phone-width button clicks work. This is layout/browser QA, not real phone touch/GPU
testing. No application console errors were seen; browser-extension noise excluded.
The visible online-unavailable state correctly disables create/join controls.
Actual two-device online/reconnect/rematch testing and real-phone gestures remain
unverified because the shared online backend is not connected to this preview.
Solo maths remains source-preserved and was not reached during this browser pass.
Online requires the shared rooms backend to be configured and deployed. It is
casual host-authoritative play: host disconnect pauses play, and a modified host
could cheat. There is no ranked matchmaking or server-authoritative Tetris
simulation. Browser audio still follows normal user-gesture/autoplay restrictions.

See `README.md` for controls, build commands and the browser verification checklist.
