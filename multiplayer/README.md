# StarMuff online rooms

This is a real, two-device WebSocket implementation. It is not BroadcastChannel, localStorage messaging, or a bot labelled as a remote player. **Code being present does not mean the public backend is deployed.** The client requires a successful JSON health check and reports deployment unavailable when a static host returns HTML or when the service binding is missing.

## Run locally

From the repository root, after `npm install`:

```sh
node multiplayer/local-server.mjs --port 8787
node --test tests/multiplayer-core.mjs tests/multiplayer-network.mjs
node --test tests/multiplayer-client.mjs
```

The client tests run the actual browser script in isolated VM/DOM harnesses over real WebSockets; they are not visual browser QA and require no browser installation. The local server serves the existing game routes and `/api/starmuff` on one origin. Use two browser profiles, not two tabs that share a reserved seat. To test a phone on your own trusted LAN, use `--host 0.0.0.0` and open the computer's LAN address on the phone. Do not expose this development server to the public Internet. Its rooms are memory-only and disappear when the process stops.

## Production deployment

The deployable Cloudflare Worker is `multiplayer/worker.mjs`; its configuration and SQLite Durable Object migration are `multiplayer/wrangler.toml`. The Worker owns only StarMuff rooms. It does not replace the site's existing Battleships/Connect-4 API.

1. With the owner's normal Cloudflare deployment credentials configured, run `npx wrangler deploy --config multiplayer/wrangler.toml`. Do not invent/extract credentials or deploy to another account.
2. In the existing **1v1-nz Pages project**, add a service binding named `STARMUFF_MULTIPLAYER` targeting Worker `starmuff-1v1-multiplayer`, in both preview and production environments as appropriate. Re-deploy Pages after adding the binding. `functions/api/starmuff/[[path]].js` forwards only `/api/starmuff/*`.
3. Alternatively, set the Pages variable `STARMUFF_MULTIPLAYER_URL` to the actual deployed Worker HTTPS URL. Or set `window.STARMUFF_MULTIPLAYER_ENDPOINT` in `multiplayer/config.js` to that URL for direct cross-origin WebSockets. Service binding is preferred. Never put an API token in frontend configuration.
4. Preserve existing classic-game backend routes and any Cloudflare route configuration. Do not replace a pre-existing advanced-mode `_worker.js` blindly; merge this narrow route if the production project uses one outside this repository.
5. Verify `https://1v1.nz/api/starmuff/health` returns JSON `{ "ok": true, "transport": "websocket", "version": 1, ... }`, **not HTML**. Verify preview independently. Then complete a match and rematch from two physically separate devices/networks. Test reconnect on both seats before claiming it is live.

The origin allowlist accepts the production domain and this project's Pages previews, not arbitrary websites. If changing domain/project, update `ALLOWED_ORIGINS` in Wrangler. The optional Workers rate-limit binding restricts new rooms to 12/minute per IP per Cloudflare location. Choose a different numeric rate-limit namespace if `1001` is already used for a different policy on the account.

No keep-warm service is required. Idle sockets use Cloudflare's hibernation API, with ping auto-response and a six-hour room-expiry alarm. Active game traffic legitimately keeps its room awake. This follows Cloudflare's [WebSocket hibernation guidance](https://developers.cloudflare.com/durable-objects/best-practices/websockets/) and [lifecycle requirements](https://developers.cloudflare.com/durable-objects/concepts/durable-object-lifecycle/).

## Browser adapter contract

Load `/multiplayer/client.js` before the game's adapter. It loads CSS and `/multiplayer/config.js` itself. Mount only once per game instance.

```js
const mp = StarMuffMultiplayer.mount({
  game: 'skirmish', // tetris, pinball, simon, skirmish, odyssey-tanks
  container: '#online-room', // element or selector; defaults to a new body child
  canReady: () => loadoutIsValid(), // optional; block readiness until original setup is complete
  onStart({ matchId, seed, slot, isHost, resumed, snapshot }) {
    // New match: reset the ORIGINAL engine completely using the shared uint32 seed.
    // Resumed match: restore the snapshot; do not reset to a new match.
  },
  onEvent({ type, data, slot, seq, matchId, serverSeq }) {
    // Peer event only, no sender echo. Validate ownership/rules/turn before applying.
  },
  onSnapshot({ snapshot, slot, matchId }) {
    // slot is always 0. Authoritative host world or paired-score checkpoint.
  },
  onPresence({ connected, ready, players, phase, matchId }) {
    // connected means BOTH seats connected; clear held inputs and pause when false.
    // players = [{slot:0, occupied, connected, ready}, {slot:1,...}]
  },
  onFinish({ result, matchId }) { /* display verified-by-host result */ },
  onLeave({ opponent, reason }) { /* restore solo/local menu; clear simulation/input */ },
  onUnavailable({ message }) { /* keep solo/local available */ },
  onError({ code, message }) { /* optional protocol/game diagnostics */ }
});

mp.send('command', { action: 'fire', turnId: 3 });
mp.send({ type: 'command', data: { action: 'fire', turnId: 3 } }); // equivalent
mp.send({ type: 'command', action: 'fire', turnId: 3 }); // also equivalent
mp.publish(fullSerializableSnapshot); // host only
mp.finish({ winner: 0, reason: 'ships-destroyed' }); // host only
mp.setReady(true); // lobby or finished match; both must agree
mp.leave();
```

Read-only properties: `slot` (0/1/null), `isHost`, `seed`, `matchId`, `active`, `connected`, `roomCode`, `phase`, `available`. `await mp.ready` resolves the initial health check. `mp.create()` and `mp.join(code)` expose the same actions as the room UI. `.destroy()` leaves and removes the room UI.

The online UI must be visible when the URL has `?room=CODE`, otherwise autojoining an invite can put players in an invisible lobby. Room links contain only the public invite code. The secret 192-bit resume token is saved in **sessionStorage**, not in a URL or share link, and passed in a WebSocket subprotocol. Reloading the same tab can recover its seat. Clearing the browser session loses that seat; the host can create a new room. Opening the same seat token elsewhere replaces its prior socket and tells the old tab to stop.

## Protocol and recovery invariants

- Server owns two-seat membership, readiness, seed, epoch/match ID, monotonic command sequences, finish lifecycle, and room expiry. Every accepted gameplay frame is bound to the current match ID and seat connection.
- Each seat's sequence is monotonic across rematches. Duplicate commands are acknowledged but not replayed. Gaps trigger resynchronization. Rejected commands consume their sequence so malformed gameplay cannot permanently deadlock the seat.
- Both players must consent to every new match/rematch. A new epoch clears the old snapshot, result, event history and readiness. Late input/ready commands from an earlier epoch are rejected.
- No inputs are queued while disconnected. The room pauses gameplay when either seat is absent. Games must clear any held fire/move buttons on `connected:false`.
- Reconnect emits `onStart({resumed:true,snapshot})`, then `onSnapshot`, then peer events not yet included in the host snapshot. The host snapshot includes an applied-event watermark, so a guest command in flight is not accidentally erased by an older host snapshot.
- Same-match restoration must be idempotent. Game-specific commands also need turn/round IDs. Replay is bounded: 128 events / 96 KiB. Host adapters should publish checkpoints periodically and after significant actions, not rely on a whole-match event log.
- Worker metadata, seeds, results and snapshots persist in a SQLite-backed Durable Object. Realtime frames are relayed immediately and checkpointed at most once per second; membership, start, finish, rematch and disconnect flush immediately. A pending checkpoint timer prevents normal hibernation before persistence. Socket attachments retain the last acknowledged sequence. If restored socket sequences exceed the saved world after abrupt isolate failure, the match is explicitly aborted with a rematch explanation, rather than silently dropping acknowledged commands. If all sockets are lost too, recovery can use a checkpoint up to one second old; this is not a transactionally exact ranked-game server. Normal connection/reload resumes use the latest in-memory snapshot and flush on disconnect.
- A host must remain the host. There is **no host migration**, spectator slot or matchmaking. If the host does not reconnect, the guest leaves and makes a new room. Explicit leave closes the room rather than silently recycling a seat during an active match.

## Bounds and trust model

Each frame is at most 100 KiB, each full snapshot 96 KiB, each game event 8 KiB, each result 4 KiB; each seat is limited to 120 frames/second. Typical adapters should use 10–15 Hz snapshots and 20–30 Hz changing input, not full frames at display refresh rate. Host snapshots of 20 KiB at 15 Hz are about 300 KiB/s outbound before transport overhead, so mobile bandwidth needs consideration.

This is **casual host-authoritative multiplayer**, not server-validated anti-cheat. The server rejects guest world snapshots/results, invalid rooms/seats, stale matches and transport abuse. It cannot prove a host's physics or a pinball player's reported score without moving original game simulation into a trusted server. Hosts must validate game-specific commands: legal turn owner, loadouts, ranges, rounds, sequence answers, weapon cooldowns and score bounds. Do not advertise ranked, tamper-proof, or wagering support.

Production checks still required after deployment: real mobile networks, reconnect from background/screen lock, simultaneous rematch clicks, leave mid-shot, full-match results for all five source-based games, and asset/audio loads over the actual deployment domain.

Native Cloudflare runtime QA is pending: a Wrangler deployment dry-run built the Worker successfully, but `wrangler dev --local` could not start in this workspace (`uv_interface_addresses: Unknown system error 1`). Core state, real Node WebSocket networking and browser-client lifecycle tests are executable here; they do not substitute for a deployed Durable Object/WebSocket smoke test.
