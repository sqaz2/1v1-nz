# Original Cargo Bay port

`CargoBayGame.tsx` is a derivative of `upstream/CargoBayGame.tsx`, from
`sqaz2/StarMuff/client/src/components/CargoBayGame.tsx`, blob
`c1e015e6ccab91aa2f04f50d2b9630ef013c8ed0`. The canonical upstream snapshot is not edited.

The original renderer, piece geometry/rotation, collision, score, sounds, starfield,
ghost, next preview, sectors, facts, touch gestures, button repeats and solo maths
rounds are preserved. `main.tsx` adds a shell that runs two independent instances
of that component; it does not replace the original falling-block engine.

## Modes

- Solo: original mission with timed maths bonus rounds and high score.
- CPU: same-seed duel. CPU scores legal placements and presses ordinary controls.
- Shared keyboard: P1 A/D/W/S/F (+Q reverse rotation), P2 arrows/Space (+Z reverse rotation).
- Online: host runs both original engines; guest sends actions for its own slot.
  Guest boards are rendered by the original component using host snapshots.
  This is casual host-authoritative play, not cheat-proof ranked play.

Competitive play keeps sectors continuous instead of pausing one pilot for a maths
challenge. This mode difference is stated on screen; original maths remains in Solo.
On phones the local bay retains original touch controls and next preview, with a
smaller live opponent bay alongside it. Shared-keyboard boards stack on narrow screens.

## Invariants

- Each engine owns its own seeded RNG, bag, board, active piece and garbage queue.
- Equal match seed means equal 7-bag stream regardless of player speed.
- Clearing 2/3/4 rows produces 1/2/4 attack rows. Attack first cancels incoming rows.
- Remaining incoming rows are applied once, at a piece lock, never mid-piece.
- Host alone calculates attacks, garbage holes and winner.
- Snapshots preserve both engines, RNG/bags, queues, attack ID, input sequences and result.
- Peer events are buffered until both component APIs mount and deduplicated by sequence.
- Each reconnect welcome remounts from its snapshot, even for the same match ID.
- Disconnect and hidden host tab pause both engines; recovery reconciles the pause.
- Rematch uses a new match ID/seed/component tree and clears old timers and queues.
- Unmount cancels original game/star/maths animation frames, audio and held-button timers.

## Build and test

Root `npm run build` bundles `main.tsx` to `app.js` and `app.css` with React's automatic
JSX runtime. `index.html` loads the shared `/multiplayer/client.js` first.

`node --test tests/tetris.cjs` runs the compiled original-derived component in a
deterministic hooks/canvas harness, covering independent bags/boards, garbage
cancellation/application/overflow, guest input forwarding, freeze/recovery,
snapshot continuation, separate keymaps and unmount/rematch cleanup.

Browser verification still matters: solo launch/math round, phone controls and
next preview, separate keyboard controls, both online slots, both disconnect paths,
reload recovery, game over, then both-ready rematch. The rooms backend must be
configured and reachable for online browser tests.
