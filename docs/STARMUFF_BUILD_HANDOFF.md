# StarMuff multiplayer build — continuation and release gate

Updated 22 September 2026. This is an implementation handoff, not a claim that public multiplayer has been released.

## Current outcome

The original StarMuff games have been ported into `1v1-nz`, with their original engines/renderers and separate head-to-head adapters. The rejected simplified replacements are no longer the route entrypoints. Both existing tank games are included: **Artillery Defense** is angle-and-power terrain combat; **Odyssey Tanks** is the top-down drive/aim/shoot arena. Odyssey is the upstream name, not a newly invented game.

- Repository: `sqaz2/1v1-nz`
- Branch: `fix/1v1-audit-integrity`
- Draft PR: https://github.com/sqaz2/1v1-nz/pull/9
- Preview: https://fix-1v1-audit-integrity.1v1-nz.pages.dev/
- Initial full-port remote commit: `0155706084e6f2accdc119b379e0dfda0fec37c5`
- Production `main` has **not** been merged by this work.
- The frontend preview is deployed. The new room Worker is **not deployed/bound**. The preview correctly reports unavailable online rooms and disables room creation.

## Preserve this source-first design

Do not replace these games with freshly invented approximations, new generic art, or unrelated mechanics. Use the pinned sources in `upstream/`, game provenance notes, and original-derived components.

| Game | Source and integration | Implemented modes |
|---|---|---|
| Cargo Bay Tetris | `upstream/CargoBayGame.tsx` → `tetris/CargoBayGame.tsx`; React shell in `main.tsx` | Original solo; real CPU placement; shared keyboard; online dual-board garbage duel |
| Pinball | Exact embedded original HTML extracted by `pinball/extract.cjs`; external engine adapter and shell | Original solo; hotseat; simultaneous online score attack; no invented CPU scores |
| Simon Protocol | `upstream/SimonGame.tsx` → original-derived component; pure round rules in `simon/duel.mjs` | Original solo; CPU; hidden hotseat handoff; online paired rounds |
| Artillery Defense | Canonical `client/public/tanks.html` retained in `skirmish/index.html`; original draw routines reused by duel core | Original solo campaign; CPU; hotseat; online shared battlefield |
| Odyssey Tanks | Original embedded HTML evaluated/extracted by `odyssey-tanks/build.cjs`; separate original solo and duel adapter | Original solo; real-time online tank duel |

Details and intentional competitive adaptations are in `tetris/SOURCE.md`, `pinball/README.md`, `simon/SOURCE.md`, `skirmish/SOURCE.md`, and `odyssey-tanks/SOURCE.md`. The source blob tests allow only the known import's extra terminal newline; they do not normalize arbitrary source differences.

## Build and test

```sh
npm ci
npm run check
npm run check:worker
npm run dev:multiplayer
```

`check` regenerates source-based HTML and production React/CSS bundles, typechecks, and runs the Node regression suites. Commit the generated `app.js`/`app.css` and extracted HTML along with sources: the existing Pages project can serve the repository directly. There are no browser npm-CDN dependencies.

Current automated result: **97 tests passing**, zero failed/skipped. This includes the earlier Battleships/Connect Four regression fixes. `npm audit --omit=dev` reports zero vulnerabilities. Wrangler's deployment dry-run bundles the Worker successfully.

Test boundaries matter:

- Real WebSocket tests use two actual WebSocket clients and the shared production room state machine.
- `multiplayer-client.mjs` executes actual browser-client code with isolated VM/DOM fixtures, real network transport, room buttons, reload, and rematch. It is not a real-browser rendering test.
- `multiplayer-worker.mjs` executes actual Worker handlers with mocked Durable Object storage/sockets. It is not native Cloudflare runtime verification.
- `wrangler dev --local` could not start in this execution environment (`uv_interface_addresses` system error). Do not report native Worker tests as passed.
- The phone-width fixture is `tests/mobile-preview.html?game=...`, at 390×844 CSS pixels. It checks layout, not a physical phone's touch, audio, GPU, backgrounding or mobile network.

### Deployed browser smoke checks

The full-port preview was exercised through visible controls in Chrome, not by changing hidden game state. No application errors were observed in the tested flows; unrelated browser-extension errors were excluded. These are smoke checks, not exhaustive playthroughs.

| Game | Observed on preview |
|---|---|
| Cargo Bay | Original solo hard-drop scoring and pause/resume; CPU real play/attacks/loss; clean rematch; independent F/Space local controls; phone-width boards/next/controls without horizontal overflow |
| Simon | Solo scoring/failure/retry/close; CPU result and reset; opaque hotseat handoff and winner; phone-width original pads without horizontal overflow |
| Artillery | CPU selection/fire/actual returning damage; different hotseat hulls; targeting math/shield/energy and shot handoff; original Wave 1 solo; second-preview check confirms unobscured player cards, readable labels, visible Fire and no horizontal overflow |
| Odyssey | Original solo launch and autonomous original wave progression to score 500 / upgrade choice; original loadout workflow on desktop/phone width; online unavailable message with disabled create/join; no phone-width horizontal overflow |
| Pinball | Full original table launches and scores 1,100; menu pause and Return preserve score; cancel preserves a run; confirmed P1 forfeit leads to a fresh P2 table; second forfeit settles draw; rematch starts fresh P1 at 0 points/3 balls; original music and phone-width table without horizontal overflow |

Browser QA found and corrected: duel/CPU scores overwriting Cargo Bay's solo high score; duplicate Simon header/room controls during active phone patterns; an imported fixed Artillery home link overlaying the HUD; Pinball's active menu exposing a whole-match restart. Pinball's native confirmation was replaced with an explicit in-page confirm/cancel control after the browser's native-dialog API failed; that tool failure was not treated as a game physics failure.

Evidence screenshots are under `docs/evidence/`. Every public online panel correctly reports the missing backend. **No deployed two-device game has been claimed as tested.**

## Multiplayer architecture and difficult fixes already done

The shared adapter is `multiplayer/client.js`. The pure room state machine is `room-core.mjs`; `worker.mjs` provides SQLite Durable Objects, hibernating sockets and expiry; `local-server.mjs` provides the same protocol for development. The narrow Pages function forwards only `/api/starmuff/*`.

1. Two reserved seats with private 192-bit resume tokens in session storage. Invite URLs contain only public room codes, never the secret token. Reload recovers the same seat; clearing the tab session does not promise recovery.
2. Both players must consent to start/rematch. Every match has a fresh ID and seed; rematch clears old snapshots/events/results. Commands are tied to the current match, seat connection and sequence.
3. Only the host publishes world snapshots/results. Guests send validated intents. Disconnection pauses gameplay; adapters clear held controls and reject obsolete commands.
4. Snapshot event watermarks preserve guest commands the host has not yet observed. Replay occurs after state restoration. Tetris buffers events and terminal results until both React game bridges are mounted.
5. Simon host recovery cannot rehydrate an old snapshot over a recovered completed local attempt. Round resolution treats both players fairly rather than automatically rewarding whoever played first.
6. Artillery snapshots preserve RNG, terrain, projectiles, ammo, abilities and math. Necromancer projectiles are simulated, not guaranteed damage; Carrier's original support branches remain.
7. Pinball keeps original physics/table functions. Duel timing uses fixed simulation steps and separate cosmetic randomness. Original fruit-event scoring has a documented simulation-time limit so audio autoplay/duration cannot decide duel fairness. Missing physics checkpoints do not silently grant a replacement attempt.
8. Realtime Worker writes are batched at 1 Hz; lifecycle/disconnect changes flush immediately. If recovered socket sequences prove acknowledged state was lost, abort explicitly and require rematch. This is not transactionally exact ranked play.
9. Existing Battleships reset protection clears stale board markers and blocks callbacks from an obsolete game generation. Preserve those earlier fixes; do not restore discarded-clone tests as a substitute for the actual new engines.

## Deployment blocker — next authorized action

The task environment does not have configured Cloudflare deployment credentials. Do not extract account credentials from unrelated sources or put keys in chat, source files, browser configuration or frontend JavaScript.

In an already authorized Cloudflare environment:

1. Run `npm run deploy:multiplayer`. Confirm the target account and Worker `starmuff-1v1-multiplayer` in `multiplayer/wrangler.toml`. It has the `STARMUFF_ROOMS` SQLite Durable Object migration and an origin allowlist for 1v1.nz and this Pages project.
2. Add a **preview** Pages service binding named `STARMUFF_MULTIPLAYER`, targeting that Worker, then redeploy the preview. Alternatively configure `STARMUFF_MULTIPLAYER_URL` with its real HTTPS URL. Prefer a service binding; never invent a workers.dev address.
3. Verify preview `/api/starmuff/health` returns versioned JSON, not static HTML. Verify the existing Battleships/Connect Four backend still works; do not replace unrelated API routes.
4. Complete the two-device acceptance list below before merging PR #9.
5. Configure the production binding, merge the reviewed PR, and verify production independently. Frontend deployment success is not evidence that the room server is attached.

Full configuration and client callback contract: `multiplayer/README.md`.

## Required public two-device acceptance

Use two independent browser contexts, then two actual devices/networks. Run each game through start → gameplay → finish → both-ready rematch. Check different loadouts and different viewport sizes; do not test only identical desktop windows.

- Common: third seat rejected; wrong-game invite rejected; host and guest reload separately; disconnect mid-action; screen lock/background; explicit leave; stale old-tab inputs; fresh seed/state on rematch. Do not advertise finished-room board restoration unless tested—shared lobby rematch remains available after refresh.
- Cargo Bay: same piece sequence; independent boards; real line clears and attack cancellation; overflow loss; terminal result arriving during guest refresh; host-tab visibility pause; independent keyboard/touch controls.
- Pinball: both original tables launch; scores/lives update; full original drain/final-tally flow; forfeit; pending completion sent after reconnect; original audio assets; same seeded conditions; no duplicate attempt after losing a checkpoint.
- Simon: correct and incorrect sequences in both player orders; both-fail retry; both-pass length increase; hidden local handoff; offline completed host attempt; no replay of the memory sequence on refresh.
- Artillery: different original hulls/perks; special ammunition; destructible terrain; class ability; all math types; crate loot; disconnect mid-shot and mid-question; no stale projectiles on rematch.
- Odyssey: independent movement/aim/fire; original six abilities; damage and victory; snapshot smoothing; disconnect clears held fire; fixed-world collision at different screen sizes; same-match recovery and fresh rematch.

## Known scope and limitations

- Casual host-authoritative games, not anti-cheat/ranked/wagering infrastructure. Pinball scores originate in the player's client. Do not claim server-verified gameplay.
- No host migration, spectators, matchmaking or account system.
- Original solo progression and competitive rules are separated intentionally. Wave/campaign systems remain in solo where they do not map directly to a duel.
- Original StarMuff global leaderboard endpoints are not silently written. Solo scores are device-local and labeled accordingly.
- Pinball audio/video remain hosted at verified StarMuff asset URLs; availability depends on that host. No replacement image-generation brief is needed to restore these engines.
- Do not close the release gate merely because automated tests or a Pages deployment succeeded.
