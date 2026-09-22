# Original StarMuff Pinball port

This replaces the toy Pinball clone with the **actual original StarMuff table**.
`game.html` is generated from `upstream/Pinball.tsx`'s evaluated `GAME_HTML`
template. Do not hand-edit the generated table; run `node pinball/extract.cjs`.
`source-provenance.json` pins the original blob and hashes. Tests compare the
original physics, table state, tick, renderer, drain and launch functions exactly.

## Preserved

Original table art and physics; spin and variable flipper power; touch/keyboard
controls; MUFF jackpots; combos; original math challenges; earned extra balls;
multiball; Focus/Nova unlocks; Lambo rescue; cat/dog/horse events; Fruit Frenzy;
sound effects; haptics; original settings; local solo high scores; all five music
moods (36 tracks), four Easter-egg songs and the original horse video.

The original React wrapper is replaced with a static mode/music shell. No React
runtime is needed, and no game engine was reimplemented. The 40 original audio
files and video reference exact deployed URLs on `starmuff.com` in `music.json`.
These are remote assets, so audio still depends on that host. Offline failures
are shown rather than silently replacing the soundtrack. Mirror those exact
files later if independently hosted audio is required.

## Duel rules

- Solo: original menus, progression, local leaderboard and game rules.
- Pass-and-play: Player 1 plays their run, explicit handoff, then Player 2 on a
  fresh iframe/table with the same seed. Both start with three balls; the original
  earned extra-ball rewards remain. Highest final score wins; equal scores draw.
- Online: both play real runs simultaneously, exchange progress through shared
  room infrastructure, and the host aggregates completed scores. No fake CPU or
  random scores. This is explicitly **casual client-scored play, not anti-cheat
  ranked play**. A compromised client can forge its own score.
- Both duel seats use normal speed and a neutral career baseline. Unlocks still
  become available from this run's score. Duel results do not alter solo career.
- Physics advances at 60 fixed steps/sec on 60/90/120Hz screens. Rendering has its
  own random stream so extra render frames do not consume gameplay randomness.
- Fruit Frenzy has a fixed 60-second simulation clock in duels, also ending on
  the original drain/all-fruit conditions. Solo still follows the song ending.
  This avoids media buffering or autoplay blocking changing the score rules.

## Integrity and lifecycle

Each run has a match epoch and seat. Old iframe sources/origins and old match
events are ignored. Scores and event sequences are monotonic. Results require
the original final life/tally or an explicit forfeit. Internal restart is disabled
during a duel; rematches create new iframes, seeds and state rather than resetting
one object beneath old timers. Forfeit is terminal and remains a forfeit on reload.

Every second the iframe checkpoints its original physics state, RNG, power-ups,
event state, tally and exact active math question/timer to sessionStorage. A reload
in the same tab restores that run. Backgrounding, opening Menu or disconnecting
pauses the table and releases held controls; Return to your game resumes it.
Math time pauses with the game. A resolved math-answer animation keeps the prior
checkpoint until the original ejection callback has completed.

Snapshots are local to that browser tab: resuming from a new device does not
reconstruct an active Pinball physics run. Online rooms share scores/results, not
every frame. The online backend must be deployed and bound as documented by the
shared multiplayer service before internet matches are available.

## Leaderboard boundary

Original `/api/pinball/scores`, `/daily`, `/firsts` StarMuff service requests are
disabled in this port. Solo uses its existing local high-score table; duels use
their shared room score. No 1v1 game writes into the separate StarMuff leaderboard.
The original leaderboard UI labels must be interpreted as local in this port.

## Verification

Run `node --test tests/pinball.cjs`. Tests execute the full extracted engine with
a stubbed canvas and original input handlers, including launch, three-life
completion, exact source parity, seeded frame-rate fairness, forfeit/reload,
physics/RNG/math checkpoint restoration and stale-message checks. Browser/mobile
and two-real-client network testing remain necessary before production promotion.

### Preview browser smoke check — 22 September 2026

The original table launched through its real drag control and earned 1,100 points.
Menu/Return preserved the run. In-page forfeit confirmation could be cancelled;
confirmation then produced the P2 handoff, a fresh P2 table, a final draw when
both forfeited, and a clean P1 rematch at zero points with three balls. The active
menu no longer exposes a whole-match Start P1 reset. At 390×844 CSS pixels, the
original table and controls fit without horizontal overflow. Original music
loaded; no game-origin console errors were observed in those flows.

This does not verify a full natural browser run or public online play. Full
three-drain settlement is covered by the engine test, and internet play remains
gated on deploying the shared room backend and conducting two-device QA.
