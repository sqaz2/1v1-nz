# StarMuff Artillery Defense provenance

- Canonical repository: `sqaz2/StarMuff`
- Canonical path: `client/public/tanks.html`
- Imported blob SHA: `628d88c81b3c02b1c57a24fa9c02e3d13609a7d0`
- Original commit: `0c21832d21aab4531616101fdf60a1a519249cef`
- 1v1.nz route: `/skirmish/`

The route contains the original StarMuff Artillery Defense source, with a multiplayer adapter. The original `startGame` campaign remains selectable as **Solo campaign**. This is not the rejected circle-based Skirmish game.

`app.js` and `style.css` belong to the rejected replacement implementation. They are retained temporarily for diff/reference only and are not loaded by the restored route.

## Multiplayer implementation

- `duel-core.js`: seeded canonical two-player battlefield and validated actions. Terrain sine layers, gravity (`0.25`), launch speed (`13`), crater/mound formulas, original six weapons, ship HP/damage/abilities, math factions, ghost bullet aiming and original weighted loot are ported from the canonical source. This separation permits authoritative snapshots and deterministic unit tests without creating two unrelated wave-defense games.
- `duel.js`: CPU/hotseat/online mode selection; original ship/loadout wizard for each player; hotseat handoff; original math/loot/swap panels; host simulation; presence pause; resume; two-way command validation; rematch flow.
- The final block of `index.html` explicitly calls the original `drawSky`, `drawTerrain`, `drawPlayer`, `drawGhostTanks`, `drawProjectiles`, `drawGhostProjs`, `drawGhostTrail`, `drawCrates`, and particle routines. P2 uses a reflected original tank renderer. Solo campaign logic is retained; a run-generation guard prevents its old delayed callbacks reaching a new game.
- `duel.css`: readable touch-sized controls around the original art and setup.

## Deliberate competitive adaptations

These are additive duel rules, not silent changes to the solo campaign:

1. One shared fixed 720×346 world; each side starts at 18%/82% of its width. Viewport changes scale the canvas instead of changing physics or tank locations. Players select any original hull and exactly three original perks independently.
2. Alternating shots replace enemy waves. Both players control actual tanks in that world. HP and base damage retain original hull values; the CPU calculates a real ballistic shot through the same integrator. There is no score-attack proxy.
3. Specialty-ammo duel starter kit lets Arsenal participate immediately. Standard shells begin at ten (Carrier gets original +4). Five emergency standard shells replenish an exhausted turn so an opponent cannot force an endless ammunition soft-lock.
4. One energy per incoming turn supplements the original math +2 and hit energy. Carrier still adaptively chooses heal/ammo/reinforce/airstrike against the enemy tank plus its supports. Necromancer's free initial summon and four-turn, aimed, simulated ghost projectiles remain; they are not guaranteed damage.
5. Defense/Repair/Armory math are explicit optional per-turn buttons; Targeting retains solve-then-fire. All four original question families and shields remain. Math has a ten-second accessible timer in the duel. No client may submit the same protocol twice in a turn. Repair unlocks after round one.
6. Mobility permits three crater-aware moves per turn, original 8%-width step and proximity shove. Freeze prevents movement on the target's next turn, rather than making a human miss their entire turn. Wraith cloak still costs four energy.
7. The center supply crate invokes the original math-and-loot model: two items on failure or three on success, original weighted loot effects and a fourth-perk picker. Combat upgrades tied to clearing endless waves remain in the original campaign; the head-to-head match ends when a tank is destroyed.
8. Free first loadout swap and 70%-shell-cost second swap are per match, replacing “per wave.” Ghost and reinforcement tanks can themselves be hit and destroyed. RNG is part of the resumable host snapshot. Published math answers are omitted, but the host reconstructs them from the question's numeric operation after reconnect.

## Online contract and scope

Loads `/multiplayer/client.js`, game key **skirmish**. Both players join/ready; then choose their hull/perks. Host accepts validated `loadout` events until both are locked, creates the seeded world, accepts slot-validated `command` events carrying `turnId`, and publishes `artillery-state` snapshots. Disconnect pauses physics and math. Reconnect restores terrain, both fleets, RNG, in-flight projectiles, current question, inventory, turn, and abilities. Finish is host-reported through the shared service. New online matches require both players to request a rematch; local games reset immediately.

This is casual host-authoritative multiplayer, not a cheat-proof ranked server. Production online availability depends on the shared room worker and its endpoint being deployed.

## Verification

`node --test tests/artillery-duel.cjs`

Tests cover seeded maps, original catalogs, illegal/out-of-turn/stale/duplicate commands, real CPU damage, exact snapshot continuation, four math factions across host reconnect, pause/timeouts, inventories, movement, class abilities, crate math/loot, support projectiles, Carrier branches, win locks, reset cleanliness, and original rendering/campaign retention.

Browser acceptance still requires two connected browser sessions on a deployed room service, one phone-sized viewport, hotseat handoff, a full CPU victory, a class ability, a specialty weapon, mid-shot disconnect/reconnect, and rematch. Engine tests alone are not evidence those deployed integrations have passed.

### Deployed browser evidence (2026-09-22, preview `0155706`)

Checked through visible UI controls on `https://fix-1v1-audit-integrity.1v1-nz.pages.dev/skirmish/`:

- CPU: selected original Dreadnought and Arsenal/Mobility/Defense perks, launched, fired. CPU replied with a real shot and Player 1's HP changed from **6/6 to 5/6** on turn 3. Pause/resume and New game worked.
- Hotseat: Player 1 Dreadnought and Player 2 Destroyer selected independently. Both pass-turn and completed-shot transitions displayed the correct explicit handoff. P2 solved the visible **5 + 26** targeting question, received a block shield and +2 energy, then fired. Control returned to P1 only after handoff.
- Solo: original Destroyer campaign launched with **Wave 1**, Hills, and six shells; original SOLVE/fire and original wave HUD were present.
- Phone fixture: `/tests/mobile-preview.html?game=skirmish`, 390×844 iframe. Game content measured **375px clientWidth and 375px scrollWidth**, so no horizontal overflow. Canvas and all firing controls fit the narrow layout; Fire was reachable at y777–819 before the home-link fix.
- Online: the room explicitly stated **“Online multiplayer is not connected to this deployment yet. Solo and local modes still work.”** Create/Join were disabled. No live online match, reconnect or rematch is claimed verified.
- Found and fixed after the first deployed pass: imported fixed home link obscured Player 1's card; it is now in normal flow. Tank text now has an 11px minimum rendered size. Solo hides the multiplayer mode hub during gameplay. Root rechecked the second preview on 22 September: both player cards and tank labels are unobscured, Fire is visible, and body client/scroll widths are both 375px inside the phone-width fixture. Final evidence: `../docs/evidence/artillery-mobile.jpg`.

Browser-side evidence screenshots were saved as `artillery-mobile-qa.jpg` (shows the pre-fix home-link overlap) and `artillery-hotseat-qa.jpg` (completed-shot handoff), but the shared-file synchronization did not make them available in scratch during this pass. Do not publish broken file links. The rendered screenshot was visually inspected during QA. These are debugging evidence, not final polished screenshots. All 13 engine tests still pass after the layout corrections.
