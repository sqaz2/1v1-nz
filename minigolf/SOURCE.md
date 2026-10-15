# StarMuff Mini Golf: sources and attribution

Original 3D mini golf game for 1v1.nz, built for StarMuff themes.

| Asset | Origin |
|---|---|
| `assets/anchorage-surface.webp`, `assets/anchorage-card.webp` | StarMuff `client/public/starmuff-planets/` (served at starmuff.com/starmuff-planets/) |
| `assets/smackzone-approach.webp`, `assets/smackzone-card.webp` | StarMuff `client/public/starmuff-planets/` |
| `assets/muffin-wrapper.glb`, `assets/null-cube.glb`, `assets/crown-of-six-stars.glb` | StarMuff `client/public/models/sixfold/<name>/model.glb` |

All StarMuff assets © StarMuff / Will Crowell, reused with the owner's permission.

Libraries bundled into `app.js` (no CDN at runtime):
- three.js (MIT), https://threejs.org
- Rapier deterministic compat build `@dimforge/rapier3d-deterministic-compat` (Apache-2.0), https://rapier.rs/docs/user_guides/javascript/determinism

Sound effects are synthesized at runtime with WebAudio (no audio files).

## Architecture
- `src/courses.mjs`: hole maps (ASCII grid), themes, trig-free mover paths, distance field, validation.
- `src/rules.mjs`: pure turn and score rules (farthest ball putts next, honour on the next tee, 6-stroke pickup, out of bounds = +1 and replay from the previous spot).
- `src/physics.mjs`: builds a fresh Rapier world per shot, so a shot is a pure function of hole, start, shot and mover phase. That makes it cross-platform deterministic.
- `src/cpu.mjs`: CPU searches real simulated shots.
- `src/main.mjs`: three.js renderer, input, modes, online adapter.

Online: guest sends `shot {turnId,dx,dz,power}`. The host validates, simulates, applies, and publishes `{kind:'minigolf-state', state}` with `lastShot`. The guest replays `lastShot` locally for animation; the host state wins.

Rebuild with `npm run build` (runs `minigolf/build.mjs`). `app.js` is committed like the other bundled routes.
