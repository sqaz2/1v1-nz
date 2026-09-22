# 1v1.nz

Original StarMuff games with multiplayer adapters, alongside Battleships and Connect Four.

## Games

| Route | Original engine | Modes in this build |
|---|---|---|
| `/battleship/` | Existing 1v1.nz Battleships | CPU and existing online rooms |
| `/connect-4/` | Existing 1v1.nz Connect Four | CPU, local and existing online rooms |
| `/tetris/` | StarMuff Cargo Bay | Original solo, CPU, shared keyboard, online dual-board garbage duel |
| `/pinball/` | Full StarMuff Pinball table | Original solo, hotseat and online score attack; no fabricated CPU score |
| `/simon/` | StarMuff Simon Protocol | Original solo, CPU, hotseat and online paired rounds |
| `/skirmish/` | StarMuff Artillery Defense | Original solo, CPU, hotseat and online tank duel |
| `/odyssey-tanks/` | StarMuff Odyssey Tanks | Original solo and real-time online tank duel |

**Deployment gate:** New StarMuff internet rooms need the separate multiplayer Worker deployed and connected. Committing these frontend files alone does not make online rooms live. The UI checks a typed health response and explains when the backend is unavailable. Classic game APIs are unchanged.

For the implementation map, verification boundaries and exact remaining release steps, see [the StarMuff build handoff](docs/STARMUFF_BUILD_HANDOFF.md).

## Source preservation

`upstream/` contains pinned original StarMuff React sources (only the import's trailing newline is normalized). Game provenance manifests, extraction scripts and adapter notes live in each route. Cargo Bay and Simon bundle their original-derived React components. Pinball and Odyssey evaluate and extract their original embedded game HTML; Artillery retains the original renderer and solo campaign.

Solo gameplay is separate from duel rules. Progression, campaign content and presentation are retained in solo, while PvP-specific rules are documented by each game. Do not revive the discarded simplified replacements.

## Build and verify

```sh
npm ci
npm run build
npm run typecheck
npm test
```

The build regenerates the extracted original games and the Cargo Bay/Simon browser bundles. Generated route files are committed because the existing Pages setup can serve the repository directly. No browser runtime dependency on an npm CDN is required.

For local cross-browser network testing:

```sh
npm run dev:multiplayer
```

Open the printed URL in two separate browser contexts/devices. This development server uses real WebSockets and the same room state machine as the Worker; it is not a BroadcastChannel or local-storage imitation of online play.

## Hosting and deployment

Frontend: existing Cloudflare Pages project `1v1-nz`; production branch `main`. The current work stays on draft PR #9 / `fix/1v1-audit-integrity` until validation and backend deployment are complete.

Backend: see `multiplayer/README.md` and `multiplayer/wrangler.toml`. Use an authorized Cloudflare environment to deploy the Worker, then bind the Pages service as `STARMUFF_MULTIPLAYER`, or configure the documented HTTPS endpoint. Do not put API tokens in this repository or frontend configuration.

Rooms are casual host-authoritative games. Seat tokens, limits, match epochs and command deduplication protect transport/lifecycle, but client-hosted simulations and client-reported pinball scores are not anti-cheat guarantees. Do not advertise ranked or wagered competition.

Original Pinball music is referenced from verified StarMuff asset URLs. Shared StarMuff leaderboards are not silently written by this port; see the game-specific notes for local solo score storage.
