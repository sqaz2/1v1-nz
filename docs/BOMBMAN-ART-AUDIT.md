# Bomb Man art audit

Route: `/bomberman/` (`bomberman/index.html`, Cloudflare Pages project `1v1-nz`, production branch `main`).
Build audited: `main` @ `1358597` "Restore live Nova Grid Bomb Man build". It matches byte-for-byte what https://1v1.nz/bomberman/ served on 2026-10-19.

## Engine

The game is **not three.js**. It's a hand-written **Canvas 2D software-3D renderer**: a perspective `project()` function, painter's-algorithm depth sort, and `drawCube()` polygons filled with flat colours. All of it is inlined in one 1.8 MB `index.html`, alongside the old "Namaste Hamster" side-scroller, which still ran its own 1280×720 render loop every frame behind the Bomb Man overlay. Multiplayer drop-in lives in `bomberman/live.js` (`/api/starmuff` Worker + WebSocket), and it drives the game only through `window.BombManLegacy` (snapshot / remoteAction / setHumanSlots).

## What the game drew before (placeholders)

| Object | Before | Now |
|---|---|---|
| Player (Bomb Man) | Orange rounded rectangle with a 🐹 emoji | `hero_front/back/left/right` (cut, right = mirrored left), picked by facing, with walk bob and squash |
| Drop-in human rivals (slots 1–3) | Green rectangle with a 🙂 emoji | `p2_*`, `p3_*`, `p4_*`: outfit-recoloured hero sets, all 4 directions |
| CPU bots | Red rectangle with 👾; blue rectangle with 🤖 for the remote bot | `bot_robot` (cut), `bot_robot_blue` (hue-shifted) |
| Bomb | Radial-gradient circle with a ☠ text glyph and a line for the fuse | `bomb` (cut), pulsing, fuse spark from `fx_end`, faster pulse when about to blow |
| Remote bomb | The same circle with a red dot | `bomb_remote` (cut) |
| Carried bomb | Black circle with a 💣 emoji | `bomb` / `bomb_remote` sprite held overhead |
| Explosion centre / arm / end | Orange gradient rounded rectangles | `fx_center`, `fx_segment` (horizontal arms), `fx_end` (ends and depth arms), plus additive floor glow |
| Crate destroyed | Vanished | `fx_dust` puff (cut) |
| Floor | Flat `map.floor` colour cubes | `tex_stone`, tinted per arena |
| Hard block | Flat `map.hard` / `map.side` colour cube | `tex_metal` top + `tex_metal_side` (Factory / Ice / Lava, tinted), `tex_stone` pillar (Temple) |
| Crate (soft block) | Flat `map.crate` colour cube | `tex_crate` top + `tex_crate_side` |
| Special tiles: ice / lava / water / conveyor / bush | Flat colours | `tex_ice`, `tex_lava`, `tex_conveyor`, `tex_bush` (cut); `tex_water` (derived from ice) |
| Board rim | Flat tan cubes | `tex_stone`, tinted per arena |
| Sky / backdrop | Two-colour gradient with faint stroke lines | `bg_factory` (arena art), `bg_temple` (garden scene art), `bg_ice` / `bg_lava` (graded arena art), blurred and vignetted |
| Power-ups ×9 (bomb, fire, speed, remote, kick, punch, carry, line, shield) | Coloured rounded rectangles with text labels ("BOMB+", "FIRE+"…) | `pu_*` icon tiles (8 cut, `pu_line` derived) |
| HUD icons | 🐹 💣 🔥 ⚡ 🛡️ 📡 ⏳ ⏱️ emoji | `ic_hero`, `bomb`, `ic_fire`, `pu_speed`, `pu_shield`, `bomb_remote`, `ic_timer` |
| Touch buttons BOMB / ACT / DET | Text only | Text + `bomb` / `pu_punch` / `pu_remote` icons |
| Map cards: Ice Cavern / Lava Forge | Wrong images: Ice showed the garden scene and Lava showed the raw sprite sheet | `map_ice`, `map_lava` (Factory arena art, colour graded) |

Unchanged (not gameplay placeholders): landing hero image, Factory/Temple map-card art, the D-pad arrow glyphs, the decorative menu chips (💀 Coins / 💎 Gems / ⭐ Level), and the text toasts.

## Source art

The only Bomb Man art in the repo or on the site is embedded in `index.html` as data URIs. Copies are kept in `scripts/bombman-art/sources/`:

| File | What | Used for |
|---|---|---|
| `00.jpeg` (720×405) | Landing-page sheet: BOMB MAN front 3/4, DOWN, LEFT, BOMB, REMOTE BOMB, EXPLOSION CENTER, FLAME SEGMENT, FLAME END, POWERUPS, SPECIAL ABILITIES, UI SAMPLE | hero, bombs, FX, 6 power-ups, fire icon |
| `24.jpeg` (720×405) | Second sheet (was wrongly used as the Lava map card): 3D ENVIRONMENT KIT, 3D POWER-UPS, FX KIT, ENEMIES | 9 tile textures, carry, shield, dust, robot |
| `21.jpeg` | Factory arena render | backdrop, Ice/Lava grades, stopwatch icon |
| `22.jpeg` / `23.jpeg` | Temple arena render / garden scene | Temple map card (unchanged) / Temple backdrop |

`00_x4.webp` / `24_x4.webp` are 2880×1620 **Real-ESRGAN 4× (realesrgan-x4plus-anime)** upscales of the two sprite sheets, made on the box with `realesrgan-ncnn-vulkan` (CPU / lavapipe). `slice.py` still computes every cut-out mask on the original sheet (its tolerances are tuned for it), then upsamples the alpha and applies it to the cleaner 4× pixels. Characters (hero, rival skins, robot) are now 384 px instead of 256 px; bombs, FX, power-ups and kit tiles come from the 4× sheets too, so nothing is stretched from a 40-px face any more.

There is no higher-resolution original anywhere in git history or on the site. Other bots on this machine (Grok Build / Grok, Helpoverload, Generative Download, Scribbles) and every other sqaz2 repo and branch were searched for a better bomber/hamster hero: none exists. The only other hamster art is the Namaste Hamster monk side-scroller cast (a different character), embedded in the same `index.html`. Both sheets are also **cropped** at the top: the UP and RIGHT poses and the top of the bomb fuse are cut off.

Pipeline: `python3 scripts/bombman-art/slice.py` (numpy, opencv-python-headless, pillow). It keys out the sheet background with a border flood-fill and soft edge, drops the text-label components, trims, and fits each sprite into a 256 px square grid (characters and bombs bottom-anchored, everything else centred) as WebP with alpha. Tiles are 256 px opaque faces. It also writes `bomberman/sprites/manifest.json` (source box, cut vs derived, upscale factor) and is deterministic: re-running it reproduces the committed files.

## Counts

* **29 cut** straight from the art: 20 sprites + 9 tile textures.
* **23 derived**: hero_right (mirror); 12 rival skins (hue-shifted outfits); bot_robot_blue; ic_hero (head crop); pu_line (recoloured Bomb Up frame + 3 bombs); tex_water; map_ice / map_lava; 4 backdrops.
* Per-arena block and floor tints are made at load time from the cut textures (multiply), so they add no extra files.
* Payload: **52 WebP files, 657 KB** (`bomberman/sprites/`). `index.html` got **166 KB smaller** because the two wrong map-card JPEGs were removed. Net added download is about **0.49 MB**, lazy-loaded once and cached.

## Renderer changes (render-only; game rules untouched)

* Textured faces: two affine triangles per quad. The static board (backdrop, floor, blocks, rim) is rendered **once** into an offscreen cache and rebuilt only when a crate breaks or the canvas resizes. Each frame blits the cache, then draws the sprites in depth order, re-stamping only the blocks that sit in front of a sprite (clip to block silhouette). The result keeps depth correct and the per-frame cost tiny.
* **Camera fix:** the old camera sat on the −z side, which mirrored the board in both axes, so ▲ walked the hamster *down* the screen and ▶ walked it *left*. The camera now sits on the +z side, so screen directions match the controls. It also auto-fits the arena to any canvas aspect and uses a higher angle (≈45° landscape, ≈60° portrait) so players behind blocks stay visible. Blocks are a little lower (hard 0.78, crate 0.70).
* The hidden Namaste canvas no longer updates or renders while Bomb Man is open, and the HUD only rewrites the DOM when its contents change.
* Explosion cells gain two **additive** fields: `axis` (flame orientation) and `crate` (dust puff). Old snapshots without them still render, because the axis is inferred from neighbours.

Perf (headless Chrome, 844×390 at DPR 3, 8 bombs + 11 flame cells + pickups + 4 players): **60 fps at 4× CPU throttle and 40 fps at 6×**. The old build managed **14 fps and 9 fps** under the same throttles.

## Guard

`tests/bombman-art.mjs` fails if the renderer:

* goes back to `drawCube` / `drawBillboard` / flat `map.*` colours or emoji;
* draws any text beyond the loading notice and the arena title;
* has a power-up kind, special tile, arena slot, skin/direction, bomb or FX without a sprite;
* references a sprite file that's missing, isn't WebP, or (for gameplay sprites) has no alpha;
* lets the manifest drift from the files, or pushes the sprite payload past 1.2 MB.

## Remaining gaps (need new art; generate these to close them)

1. **High-res character sheet.** The 4× Real-ESRGAN pass makes the hero clean at phone sizes, but it is still one drawn pose per direction (right = mirrored left; the sheet's UP/RIGHT poses are cut off at the top). The walk is procedural: the legs strip steps (alternate foot lift front/back, stride shear sideways), the body bobs and leans, and the sprite squashes on each footfall. Needed for a hand-drawn walk: Bomb Man on a transparent background, ≥1024 px, 4 directions × 4 walk frames (contact, pass, contact, pass) + idle, plus hurt/death and victory poses, same goggles/red scarf/blue suit design.
2. **Robot enemy:** back, left and right views plus a walk cycle. Only the front view exists.
3. **Line Bomb power-up tile** in the set style. Currently a recoloured Bomb Up frame with three bombs.
4. **Ice Cavern and Lava Forge arenas:** real backdrops and map-card art. Currently colour-graded Factory art.
5. **Temple stone pillar block and a water tile.** Currently tinted stone and a deepened ice texture.
6. **512 px tile textures** for stone, metal, crate, ice, lava, conveyor and bush. The kit faces are only about 45–50 px in the source.

Cut but not used, because there are no matching mechanics: heavy bomb, flame/bomb/wall pass, stun stars, alternate green bomber, BOMB MAN logo.
