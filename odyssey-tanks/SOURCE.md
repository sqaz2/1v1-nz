# Odyssey Tanks source-first port

Source: `sqaz2/StarMuff`, `client/src/pages/OdysseyTanks.tsx`.
Pinned source blob: `4b72c4bc1e85da1548f925728ebe279ca17e2b27`.
Imported source is preserved at `upstream/OdysseyTanks.tsx`.
The import has one extra final blank line. The build verifies the reported Git
blob after normalizing only terminal whitespace to one newline; no game content
is changed. The extracted template parity test uses the actual local source.

`node odyssey-tanks/build.cjs` evaluates only the original static `GAME_HTML`
template and produces:

- `original-source.html`: byte-identical evaluated original template, parity fixture.
- `original.html`: the same original solo game, with its unavailable leaderboard
  API replaced by clearly labeled device-local scores and navigation links.
- `index.html`: same original game plus `duel-core.js` and `adapter.js`.

The original tank selection, six hull definitions, loadout UI, arena/tank/pickup/
projectile renderer, audio, joystick/fire controls, shooting function, and class
ability function are reused. The duel does not substitute a new visual game.

## Online mode

Two devices, shared lobby, room invite, ready gate, 60 Hz host simulation,
15 Hz full authoritative snapshots and 20 Hz guest input. World coordinates
are always 2400 × 2400 and are independent of each device's screen. The host
generates the original arena walls from the room seed. Both original hulls
spawn centrally on opposite sides. Last living tank wins; simultaneous deaths
draw. Readiness is gated on locking a valid original tank and three perks.

Input packets contain direction, aim angle, fire and ability only. A guest
cannot supply HP, location, damage, or the result. Inputs expire after 500 ms.
Blur, touch cancellation, disconnect and leave clear held input. Both players
freeze while disconnected. Reconnection restores the host snapshot (including
projectiles, pickups, hulls, buffs, ghosts, and destroyed walls). Rematch creates
fresh state and seed; old match events and snapshots are ignored.

This is casual, client-hosted authority, not an anti-cheat/ranked game. Guest
positions ease toward authoritative snapshots and cameras ease smoothly;
there is no client-side prediction or rollback.

## Explicit PvP mappings

Original solo mechanics remain in `original.html`. Duel rules necessarily differ:

| Original feature | Duel mapping |
| --- | --- |
| Six hull abilities | Original Fury, Fortify, Overdrive, Cloak, Supply and Raise implementations. Start with one activation worth of energy. |
| Energy from PvE kills | +1 per 3 seconds and per damaging hit, capped at original 10. |
| Repair Protocol at wave clear | +15 HP every 15 seconds. |
| Supply Crates enemy drops | Original 55% drop chance from destroyed walls, versus 30% normally. |
| Accuracy Bonus kill score | +30% damage score; scoring does not override last-tank-standing victory. |
| Arsenal pierces an enemy | Pierces one summoned enemy ghost; direct hull hits consume a bullet. |
| Targeting / Defense / Mobility / Ghost Trail | Original effects: long-range HP, −20% damage, +20% speed, projectile trails. |
| Cloak vs AI | Opponent tank hidden and mobile auto-aim disabled; projectiles can still hit a cloaked tank. |
| Carrier nuke pickup | Converted to shield so it cannot instantly erase the sole opponent. |
| Necro ghosts | Original ghost lifetime/speed/cadence/projectiles; target the opposing tank and can be shot down. |
| Waves, upgrades, math, war zones, contraband, leaderboard | Preserved in solo. Not mixed into competitive duel. |
| Auto-play | Not enabled in PvP; both players control their tanks. |

Run `node --test tests/odyssey.cjs`. Tests check exact provenance extraction,
six hulls, loadout/input validation, world-space movement, damage/defense/win,
snapshot restore, stale events, disconnect freeze, all six real original
ability functions, and two running adapter contexts.

Real remote browser/two-device testing is still required on the deployed
multiplayer service. These Node tests do not establish internet latency or
touch ergonomics on physical phones.
