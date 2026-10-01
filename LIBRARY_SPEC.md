# Shared library spec

The contract between the rig, the shared library and the six scene files. Scene files hard-code no positions: every
anchor below is a named constant in `src/lib/world.js`. Read `STORYBOARD.md` and `ANIMATION_GUIDE.md` first.

## Files and load order (studio.html)

```
src/config.js  src/core.js  src/clawd.js  src/timeline.js  src/bolt.js
src/rig.js                      qwik(): Bolt with rubber-hose limbs
src/lib/world.js                WORLD, groundY, CAMS, camKeys, par, lod, cull, longLine, longRibbon
src/lib/props.js                icons, boxes, parcels, sparks, small props
src/lib/page.js                 page parts, drawPage(state), board
src/lib/cast.js                 snail, db, cursorHand
src/lib/sets.js                 towerSet, landSet, houseSet (uses props, page, world)
src/lib/schedule.js             the queue and every snail, as pure functions of t
src/lib/fx.js                   captions overlay, title/end-card lettering, whip, paperOver
src/scenes/intro.js  bookends.js  server.js  network.js  browser.js  click.js  payoff.js
```

Each library file is an IIFE that publishes its API as globals (plain functions and one constant object per file, all
names listed here, nothing else leaks). Scene files are IIFEs that only call `shots([...])`.

## Conventions (everyone)

- **Pure functions of video time `t`.** Key emotions, idles, bobs and beats on `t`, not `lt`, so motion carries across
  seams. No state between frames, no `Math.random()`.
- **Boil seeds.** Every character call passes a fixed `boilKey` (`'bolt'`, `'snail-s1'`, `'db'`, `'hand'`). Every prop
  and set piece calls `boilSeed('<unique name>')` first. Culling a piece must never shift another piece's boil.
- **Long things.** Nothing wider than ~700 px on screen is painted as one shape or one stroke: p5.brush drops the ink
  outline and saw-tooths the fill. Use `longLine(pts, sw, col)` and `longRibbon(pts, w, o)` from world.js: they chunk
  the path into ≤ 600 px pieces and ink them with the flat-pressure `'inkflat'` brush, so the joints don't show. Fills
  wider than the canvas use `bleed ≤ .03` and `tex ≤ .5`.
- **LOD.** `lod()` is the current camera zoom (1 with no camera). Below 0.5, skip icons, stamps, LEDs and small
  details, and scale line weight by `zoom ** -.5`. Sets cull pieces outside the camera view (`cull(x0, y0, x1, y1)`
  returns true when a world box is off screen).
- **Scale.** Bolt is drawn at `u = 20` on every set (about 480 px standing). Props are sized for that.
- **Text.** Only through `fx.js` (captions, title, end card) and prop stamps (`HTML`, `JS`, the badge digit, stars).
- **Performance.** Aim for ≤ 600 ms per frame at 1920×1080; never over 1.5 s.

## World layout (world px, y down)

```
WORLD = {
  tubeY: 270, tubeR: 44, roadY: 226,          // the glass tube's centre line; snails crawl on its top (roadY)
  tubeX0: 1300, tubeX1: 5000,                 // the straight run; at tubeX1 an elbow turns down into the nozzle
  nozzle: [5075, 345],                        // nozzle mouth, pointing down-right, above the browser window's top-left
  couplers: [1460, 1940, 2420, 2900, 3380, 3860, 4340],   // brass couplers hide segment joints; trestles under 1940..3860

  tower: { x0: 40, x1: 1460, roof: -420 },    // cutaway server tower
  shop: { x0: 120, x1: 1380, y0: 180, floor: 940 },       // the workshop room inside it
  boltServer: [560, 940],                     // Bolt's mark in the workshop
  shelvesParts: { x0: 130, x1: 430, y0: 330, y1: 660 },   // shelves of page parts
  db: [260, 940],                             // the database, sitting on the floor under the parts shelves
  requestPipe: [500, 470],                    // brass request pipe mouth
  board: { x0: 640, y0: 330, x1: 1100, y1: 830 },         // page-shaped board on an easel (same layout as the page)
  lamp: [870, 250],
  funnel: [1230, 600],                        // funnel mouth; its riser climbs at x 1300 to the tube

  dock: { x0: 1470, x1: 1960 },               // a small deck on the road just outside the tower wall
  queueX: { menu: 1910, heart: 1830, star: 1750, share: 1670, gear: 1590, cart: 1510 },   // front → back
  snailStart: 2000,

  land: { x0: 1460, x1: 4400 },               // groundY(x) rolls between 640 and 900 here
  house: { x0: 4400, x1: 6300, floor: 1000 }, // cutaway house; the tube enters through a porthole at x 4400
  snailStop: 4640,                            // where snails stop on the road to be unloaded
  wallClock: [4600, 430],
  desk: { x0: 4420, x1: 6250, top: 900 },
  shelf: { x0: 4440, x1: 4760, y0: 560, y1: 900 },         // 2 × 3 cubbies, dark insides
  cubbies: { heart: [0, 0], cart: [1, 0], menu: [0, 1], star: [1, 1], share: [0, 2], gear: [1, 2] },   // [col, row]
  boltDesk: [4880, 900],                      // Bolt's mark at the desk
  window: { x0: 5020, x1: 5920, y0: 370, y1: 860 },       // browser window; a stand below it down to the desk
  page: {                                     // bands inside the window (x 5040–5900)
    titleBar: [370, 410], header: [420, 470], hero: [480, 590], card: [600, 720], reviews: [730, 800], footer: [810, 850],
    headerCart: [5850, 445],                  // the cart icon and its badge
    likeBtn: [5620, 690], likeR: 22,          // round ♥ button on the product card
    cartBtn: [5790, 690], cartBtnWH: [170, 46],   // purple "add to cart" button with a cart icon
  },
  handIn: [6500, 250],                        // where the user's cursor hand enters from
}
```

`cubbyCentre(kind)` returns a cubby's world centre. `groundY(x)` is the hills' ground line (and the floors inside the
tower and the house).

**Camera presets** `CAMS.<name> = [cx, cy, zoom]`, and `camKeys(t, [[t0, 'name' | [cx, cy, zoom]], ...], ease)` eases
between them:

| name | [cx, cy, zoom] | frames |
|---|---|---|
| serverMaster | [740, 600, 1.1] | the workshop: board, shelves, db, funnel, Bolt |
| deskMaster | [5200, 580, 0.95] | porthole and tube at the left, snail stop, shelf, Bolt, window, room for the hand |
| dockClose | [1740, 200, 1.3] | the queue on the dock, boxes ~95 px |
| poster | [3250, 380, 0.5] | from the dock to Bolt: the whole stretched arm |
| widest | [3150, 300, 0.38] | tower, hills, house in one picture |
| travel | [~, 380, 0.55–1] | following along the tube |

`par(depth)` returns the offset to apply for a parallax layer (depth 1 = world, < 1 far, > 1 foreground).

## The rig (`src/rig.js`)

`qwik(x, y, u, o)`: Bolt with rubber-hose limbs, from the chosen design in `RIG_BRIEF.md` (contract there), plus:

- `legLen`: 0 = legs tucked in (the body floats at the emoji's hover height, as in the emoji), 1 = rest, > 1 = sprung.
- `lenL` / `lenR` can go to 0 (arm tucked in).
- `noFace` (and `noSpark`): the plain logo, for A1 and G2. It must match `bolt()`'s body exactly.
- `viaL` / `viaR`: world via-points for very long reaches, e.g. shoulder → up past the shelf → along above the tube →
  down to the box. Long arms (> ~3× rest) draw in chunks with `longRibbon`; sag is capped.
- Returns `{ handL, handR, shoulderL, shoulderR, face, top, feet, armPathL, armPathR }` in world space (arm paths are
  sampled point lists, so a camera can follow a hand).
- Poses shared across seams live here: `boltCool(t)` (leaning on the shelf, shades on, music notes).

## Props (`src/lib/props.js`)

| function | spec |
|---|---|
| `icon(kind, x, y, s, col)` | ink pictograms, one drawing reused everywhere: `menu` ☰, `heart` ♥, `star` ★, `share` ↗, `gear` ⚙, `cart` 🛒 |
| `jsBox(x, y, s, kind, o)` | yellow `#F7DF1E` box, ~64×56 at s = 1, big ink `icon(kind)` on the front, small `JS` stamp in a corner, ink outline; `o.hop` (0..1 idle hop, give each box its own beat offset), `o.wobble`, `o.lit` (warm glow), `o.squash`; (x, y) = bottom centre |
| `parcel(x, y, s, o)` | orange `#E8763A` paper parcel with string and a cream `HTML` stamp; `o.stretch` (with speed), `o.unfold` 0..1 (it opens into the page part it carries) |
| `envelope(x, y, s, o)` | cream envelope with a purple wax seal stamped with the bolt |
| `slip(x, y, s, o)` | the request slip: curled paper with a tiny thumbnail of the page layout |
| `clickSpark(x, y, s, o)` | gold 4-point star with an ink outline, two orbiting mini zaps (`spark()` from bolt.js), `glow()`; `o.state`: `'born'` (pops), `'held'` (only light leaking, for drawing between fist fingers), `'fly'` |
| `alarmClock(x, y, s, o)` | twin bells, face, legs; `o.ring` 0..1 makes it hop and shake |
| `wallClock(x, y, s, o)` | round clock; `o.whizz` 0..1 spins the hands (time passes) |
| `whistle(x, y, s)`, `soundRings(x, y, k, dir)` | the whistle and painted sound rings flying off in `dir` |
| `poof(x, y, s, age)`, `sparkle(x, y, s, age)`, `confetti(x, y, s, age, seed)` | effects that are pure functions of their age |
| `speedLines(x, y, len, dir, k)` | dry-brush motion lines |

## Page (`src/lib/page.js`)

- `pagePart(kind, x, y, w, h, o)`: `header` (bolt logo, ☰, cart icon with a badge `o.badge` digit), `hero` (a painted
  landscape picture), `card` (Qwik-plush thumbnail, two grey text bars, the ♥ button (`o.liked` 0..1 fills it red),
  the purple 🛒 button (`o.press` 0..1 squashes it, `o.lit` 0..1)), `skeleton` (grey bars with a moving shimmer),
  `reviews` (★★★★★ and grey text bars), `footer`. Each part draws at any size with the same layout (board, slip
  thumbnail, parcel content, browser).
- `drawPage(state)`: the page inside `WORLD.window`, from a state object: `{ parts: { header: k, hero: k, card: k,
  skeleton: k, reviews: k, footer: k } }` where k is 0..1 appear progress (pop and settle), plus `badge`, `liked`,
  `cartPress`, `cartLit`, `swap` (0..1 poof from skeleton to reviews), `handShadow: [x, y, k]`.
- `drawBoard(state)`: the board on its easel in the workshop, with the same parts plus `ghost` and `tick` per slot.
- `pageSlot(kind)`: the world rect `[x0, y0, x1, y1]` of a part on the browser page; `boardSlot(kind)` the same on the
  board.

## Cast (`src/lib/cast.js`)

- `snail(x, y, u, o)`: (x, y) = where its foot touches the road. Spiral shell in `o.shell` (Qwik blue, purple or teal,
  saturated with a dark ink spiral), big eyes on stalks using the kit's eyes (`o.eyes`, `o.lookX`), `o.crawl` phase (a
  foot ripple and a shell bob; always looks slow), `o.carry` (a jsBox kind riding on the shell), `o.duck` 0..1 (eye stalks
  pull in, it squashes), `o.hide` 0..1 (retreats into its shell), `o.sweat`, `o.mouth`. About 90 px long at u = 20.
- `db(x, y, u, o)`: the database: a squat cylinder with three stripes and a nightcap, stubby arms; the face from
  `emotions()`/`feel()` (`o.eyes`, `o.mouth`); `o.snore` 0..1 grows a snore bubble (`o.pop` bursts it), `o.roll`
  (rolls over), `o.cough` 0..1 (spits the envelope up and out), `o.dim` (dimmer while asleep). About 220×240 at u = 20.
- `cursorHand(x, y, s, o)`: the classic pointer hand (white glove, cuff, ink outline), (x, y) = the index fingertip;
  `o.pose`: `'point'`, `'press'` (the finger squashes), `'thumb'`, `'wave'`, `'drum'` (finger taps, with `o.phase`);
  `o.shadow: [dx, dy, k]` draws its soft shadow on the page. About 220 px tall at s = 1.

## Sets (`src/lib/sets.js`)

All take `(t, o)`, paint their whole area (cull what's off screen, respect `lod()`), and never draw characters:

- `towerSet(t, o)`: the cutaway tower and the workshop: dark indigo room, one warm lamp pool on the board and Bolt's
  mark (≤ 5 `glow()` calls), dim slow LEDs on rack walls, the parts shelves (`o.shelfParts`: which parts are still on
  the shelves), the request pipe (`o.pipeRattle`), the board via `drawBoard(o.board)`, the funnel and riser
  (`o.funnelGulp` 0..1), the tube's workshop section, upper rack floors for wide shots.
- `landSet(t, o)`: pale warm sky (near-white blue, cream at the horizon), drifting clouds, three low-bleed hill bands
  (parallax), trestles, the tube from the tower wall to the house porthole (chunked, couplers), a foreground meadow
  layer for fast moves, a few landmarks (a tree, a fence, a windmill) so travel reads. Also the dock deck.
- `houseSet(t, o)`: the cutaway house: dusty-lilac wallpaper, porthole, the tube's end, elbow and nozzle
  (`o.nozzleBulge` 0..1), the wall clock (`o.clockWhizz`), the shelf with its six cubbies (dark insides, faint icon
  ghosts; `o.cubbyLit: { kind: 0..1 }`), a warm mid-wood desk, the browser window frame (three dots, URL bar with a tiny
  bolt, stand) with `drawPage(o.page)` inside, a mug and a plant, a real window with daylight.
- `tubeContents(t, items)`: draws things inside the glass tube (parcels, Bolt sliding) so the glass sits over them:
  call `tubeGlass()` after.
- `paperVoid(t)`: the plain paper for A and G.

## Schedule (`src/lib/schedule.js`)

One source of truth for the JS boxes and snails, used by D2, D3, E3 (the empty cubby), E5, E6, E7 and F1:

```
QUEUE = ['menu', 'heart', 'star', 'share', 'gear', 'cart']   // front → back
box(kind, t)   → { where: 'line' | 'snail' | 'arm' | 'bolt' | 'cubby', x, y, snail, hop }
snailAt(id, t) → { x, y, carry, crawl, visible, duck, hide, look }   // ids s1..s6
drawQueue(t) / drawSnails(t, filter)   // convenience painters for the scenes
```

| box | leaves the line | on snail | arrives at the stop | into its cubby |
|---|---|---|---|---|
| menu | 30.0 | s1 | 32.25 | 33.0 |
| heart | 30.25 | s2 | 32.5 | 33.5 |
| star | 32.25 (off screen) | s3 | 48.5 | 49.0 (one-handed) |
| share | 32.5 (off screen) | s4, the slowpoke | 55.5 | 56.0 |
| cart | 46.0 (Bolt's hand), rides from 47.0 | s5 | 49.75 | 51.0 |
| gear | 48.5 (off screen) | s6 | 56.0 | 56.5 |

Snails crawl on the road at y = `roadY`. The time skips (31.9 → 32.0 and 47.9 → 48.0) are where positions jump; within
a shot every position is continuous. During E5 (44–48) the star snail is around x 3900 and the share snail around x
3100. After delivering, a snail crawls on past the stop and tucks into a snug nook behind the nozzle, out of the way,
so the desk never fills up with snails.

## Effects and lettering (`src/lib/fx.js`)

- `drawOverlay(t)`: called by the timeline after every shot, on top of everything: the step captions (bottom-left,
  cream Permanent Marker with the ink shadow, popping in on a beat, wiping out before the next), from `CAPTIONS`
  (times in STORYBOARD.md).
- `titleCard(t, x, y, k)` and `endCard(t, x, y, k)`: the "Qwik / JavaScript Streaming" and "Qwik · JavaScript
  Streaming · qwik.dev" lettering, each word popping on its beat.
- `whip(p, dir, cols)`: a whip-pan overlay, horizontal dry-brush streaks across the frame, full cover at p = .5 (cut
  there), like `brushWipe`.
- `paperOver(p, cx, cy)`: paper-coloured strokes closing in from the edges toward (cx, cy), leaving a hole there.
- `irisTo(p, cx, cy)`: iris close (p 0 → .5) and open (p .5 → 1) around a screen point.

## Scene files and seams

| file | shots | range |
|---|---|---|
| `intro.js` | I1–I5 | −10–0 |
| `bookends.js` | A1, A2, G1, G2 | 0–6, 58.5–66 |
| `server.js` | B1–B4, C2 | 6–15.5, 20.5–22.5 |
| `network.js` | C0, D2, E5 | 15.5–17, 28–32, 44–48 |
| `browser.js` | C1, C3, D1, D3 | 17–20.5, 22.5–28, 32–35 |
| `click.js` | E1–E4 | 35–44 |
| `payoff.js` | E6, E7, F1 | 48–58.5 |

Both owners of a seam strip-check it (`--strip` across the cut).

| at | seam | handoff |
|---|---|---|
| 0.0 | I5 → A1 | the camera pushes into the blank page, which dissolves to paper (−0.58 → −0.25); from −0.25 the intro draws plain paper, the same pixels as A1 at 0.0 |
| 6.0 | A2 → B1 | whip left: A2 draws `whip(0 → .5)` over 5.75–6.0, B1 draws `whip(.5 → 1)` over 6.0–6.25. Bolt leaves frame left at ~5.7 in A2 and enters from frame right in B1, skidding to `boltServer` by 6.5 |
| 15.5 | B4 → C0 | cut on action: Bolt dives into the funnel stretched thin (sx ~.35, sy ~1.8); C0 opens outside the tower wall with Bolt sliding in the tube |
| 17.0 | C0 → C1 | cut on action at the porthole |
| 20.5 | C1 → C2 | `irisTo`: close on the grey card 20.25–20.5, open on the ringing clock 20.5–20.75 |
| 22.5 | C2 → C3 | `irisTo`: close on the funnel 22.25–22.5, open on the nozzle 22.5–22.75 |
| 28.0 | D1 → D2 | cut on action: the sound rings leave frame left at ~27.9 and arrive at the dock in D2 |
| 32.0 | D2 → D3 | cut on action and a time skip: the menu snail leaves frame right at 31.9; D3 opens with it entering from the left, clock whizzing |
| 35.0 | D3 → E1 | held pose on deskMaster with `boltCool(t)`: both owners render 34.5–35.5 identically |
| 44.0 | E4 → E5 | cut on action: Bolt's left arm shoots out of frame left |
| 48.0 | E5 → E6 | the arm snaps back out of frame right at 47.9; E6 opens with it arriving and recoiling (48.0–48.3) |
| 58.5 | F1 → G1 | held pose on deskMaster; G1 starts the pull-back from rest |

**Bolt's continuity.** No hat. Shades on at 34.0 (D3), peeks over them at 38.8, knocked up onto its head at 41.3,
back down at 57.5. The spark: in Bolt's right fist 40.3–51.0. Emotions: A happy 1.5, excited 2.0, proud 3.0,
determined 5.0 · B thinking 6.5, determined 8.5, confused 12.0, smug 13.0 (the shrug), determined 13.5, excited 14.8 ·
C proud 19.5, bored 22.5, surprised 22.75, proud 24.2 · D sleepy 26.0, happy 27.0, cool 34.0 · E cool, suspicious 38.8,
surprised 40.5, scared 41.3, determined 43.0 · E6 nervous 48.0, excited 50.0, proud 51.5 · F relieved 54.0, cool 57.5
· G playful, wink 64.0.
