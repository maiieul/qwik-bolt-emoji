# Bolt's rig (`src/rig.js`)

`qwik(x, y, u, o)` draws Bolt with classic rubber-hose limbs (dark ink tubes, white four-finger gloves, Qwik-blue
shoes). `RIG` holds the helpers. Model sheets: `?loop=rigA`, `rigAHero`, `rigAMoves`, `rigAEmotions`, `rigAActing`,
`rigALab`, and `rigFeatures` for the additions.

- `(x, y)` = ground point between the feet; `u` = the bolt unit (use 20 on every set). Standing height ≈ 22.6u.
- Accepts every `bolt()` option (face, mood, tint, shades, hat, emote...). **Use `RIG.feel(name, t, over)` and
  `RIG.emotions(t, keys, o)`**, not `boltFeel`/`boltEmotions`: they add rubber-hose arm acting for all 31 moods (proud =
  fists on hips, thinking = fist on chin, confused = scratches head, playful = finger guns) and blend arm poses across
  mood changes. Plain `boltFeel` puts the long arms in a T-pose.
- Always pass `boilKey: 'bolt'`.

## Arms (`L` = screen-left arm, `R` = screen-right arm)

- `aL` / `aR`: angle (0 = straight out, + up, − down); `bendL` / `bendR` (−1..1, which way the rubber bows; + sags
  down for horizontal arms / elbows out for raised arms; negative bows hanging arms outward); `lenL` / `lenR` (1 = rest,
  works up to 6+); `wristL` / `wristR` (glove rotation).
- `handL` / `handR`: a world point `[x, y]` the palm centre lands on exactly, however far; or a body spot name:
  `'hip' | 'chin' | 'chest' | 'head'`. `handMixL` / `handMixR` (0..1) blend from the angle pose to the target, swinging
  round the shoulder.
- `gripL` / `gripR`: `'open' | 'wave' | 'point' | 'fist' | 'grab' | 'thumb'`.
- `holdL(u, sw)` / `holdR(u, sw)`: called at the palm centre, rotated along the glove (the L frame is mirrored so up stays
  up). For `fist`/`grab` the hook draws between palm and curled fingers, so the fingers wrap in front of the prop.
- `frontL` / `frontR`: force an arm in front of / behind the body (default: in front when the hand is near the body).

## Legs and body

- `walk` (phase; one cycle = 2 steps), `run`, `walkK` (idle↔walk blend), `walkDir` (±1: walk left without mirroring the
  logo; `flip` mirrors the logo like `bolt()` does), `stride`, `legSpread`, `heelL`/`heelR`, `liftL`/`liftR`.
- `dy` (up to 1.2u is absorbed by the legs so bobs keep the feet planted; beyond that the feet leave the ground and the
  legs tuck), `sq` (squash; the legs compress and bow), `lean` and `rot` (about the pelvis), `dx` (shifts the pelvis,
  feet stay put), `sx`/`sy`.
- `RIG.stroll(t, t0, t1, x0, x1, u, run)` → `{ x, walk, stride, walkK, walkDir, run }`: a planted walk between two
  points (spread it, and pass its `x` as the first argument).
- `RIG.points(x, y, u, o)`: the same world points without drawing (draw props before Bolt).

## Returns

`{ handL, handR, face, top, feet, shoulderL, shoulderR, armPathL, armPathR }` in world space. `armPathL` / `armPathR`
sample each arm from the shoulder to the palm centre (the last point is the hand): about every 12 px on a via arm, 18
points on a normal one. A camera or an effect can follow them.

## Additions

All backward compatible: without these options every pose draws exactly as before (the six older model sheets render
byte-identical). `RIG.features` lists them: `legLen`, `lenL`, `lenR`, `noFace`, `noSpark`, `viaL`, `viaR`, `reachL`,
`reachR`, `sagL`, `sagR`, `shoulderL`, `shoulderR`, `armPathL`, `armPathR`, `rim`, `cool`, `litFist`.

### Legs: `legLen`

- `legLen` (default 1). 1 = rest. Above 1 the legs spring longer, lift the body (1.25 adds 1.9u) and thin a little.
  Below 1 they shorten and the body sinks.
- 0 = legs tucked away. The body hovers at the emoji's height, and `qwik(x, y, u, o)` draws the same pixels as
  `bolt(x, y, u, o)`: body, shadow and hover spark (checked with a face, `rot`, `sq`, `sx`/`sy`, `dy` and `take`). You
  can swap the two at the same `(x, y, u)` from one frame to the next. One exception: with `flip`, `qwik` mirrors about
  `x`, while `bolt()` mirrors about its bottom tip, 7.4u to the right.
- From 0 to about .35 the body keeps hovering and the legs dangle, the shoes shrinking into the body bottom. From about
  .35 the feet touch the ground and the legs push the body up. As `legLen` goes 0 → 1 the body centre slides from `x` to
  its standing spot 1.3u to the left, and the pivot of `rot`, `sq`, `sx` and `sy` moves from the bottom tip (as in
  `bolt()`) to the pelvis.
- The hover spark shows while `legLen` < .12, unless `noSpark`.
- A1's boing: `legLen` 0 → 1.25 → 1 in about .5 s (page 1 of `rigFeatures`).

### Arms: `lenL` / `lenR` down to 0

- Below .3 the glove shrinks and the arm pulls into its shoulder, behind the body; 0 hides it. A held prop shrinks with
  the glove. Lengths of .3 and up draw as before.
- A1's unroll: `lenL` / `lenR` 0 → 2 → 1 with the arms out (`aL`, `aR` near 0).

### The plain logo: `noFace`, `noSpark`

- `noFace` drops the eyes, mouth, blush, gloom, brows, moustache, shades and painted hands. With `noSpark` and
  `legLen: 0, lenL: 0, lenR: 0` you get the plain logo, the same pixels as a face-less `bolt()`. `noFace` also works
  on legs.

### Long reaches: `viaL` / `viaR`, `reachL` / `reachR`, `sagL` / `sagR`

- `viaL: [[x, y], ...]` in world space. The arm runs shoulder → via points → `handL` (when `handL` is a world point;
  otherwise it ends at the last via point) on a smooth curve through every point. Segments longer than 6u sag down by
  up to 1.6u; `sagL` scales the sag (0 = taut, default 1).
- `reachL` (0..1, default 1) slides the hand along that path: 0 = the arm's own length out of the shoulder, 1 = exactly
  on `handL`. Animate this one number for the shoot-out and the snap-back.
- `handMixL` below 1 with `viaL` sweeps the arm round the shoulder from its angle pose (`aL`, `bendL`, `lenL`) to the
  path. Ramp it 0 → 1 over about .1 s to go from a wind-up into the shoot-out, and 1 → 0 with a spring for the recoil
  once `reachL` is back at 0.
- Any arm longer than 540 px on screen is painted in pieces of about 290 px with the flat `inkflat` brush, each piece
  with its own boil seed, skipping pieces off screen. It reads as one hose of even width at every zoom from .45 to 1.6,
  and the glove at the end is the usual one. It thins with stretch to half width, never below 4.4 px on screen.
  Stretched arms without via points also cap their sag at 1.6u.
- The E5 reach on the model sheet: `qwik(...WORLD.boltDesk, 20, { viaL: [[4808, 470], [4760, 250], [4560, 182],
  [4415, 172], [1610, 158]], handL: [WORLD.queueX.cart, WORLD.roadY - 29], gripL: 'grab', reachL })`: up past the shelf,
  through the porthole above the tube, along the road to the dock and down onto the cart box, 3650 px of arm.
- To put the hand at a given world x (for example `reachX(t)` from schedule.js, which times the snails' ducks), search
  `reachL`; x falls as `reachL` grows along the long run:

```js
const reachFor = (o, x) => {
  let lo = 0, hi = 1;
  for (let i = 0; i < 20; i++) { const m = (lo + hi) / 2; if (RIG.points(...WORLD.boltDesk, 20, { ...o, reachL: m }).handL[0] > x) lo = m; else hi = m; }
  return (lo + hi) / 2;
};
```

### Rim light: `rim` (0..1)

- A thin lavender line along the limb outlines, brighter on the upper edge, so the dark limbs stand out on the
  night-indigo workshop wall. `rim: 1` at `CAMS.serverMaster` is the tested look. Gloves and shoes are light already.

### A light held in a fist (`litFist`)

- With `gripR: 'fist'` and a `holdR` hook that calls `glow()`, such as `clickSpark(x, y, s, { state: 'held' })`, the
  rig treats the fist as lit: the hook's frame turns a quarter turn, so the light fans out through the knuckles, and the
  gaps between the fingers glow. A fist holding a prop that draws no light keeps the old frame. The rig finds the light
  by running the hook once with painting switched off, so keep hooks free of side effects.

### Squeezes (B4 funnel dive, C1 toothpaste)

- Pass `legLen: 0, lenL: 0, lenR: 0` with `sx`, `sy` and `rot`: the body pivots on its bottom tip (as in `bolt()`) and
  the tucked limbs stay hidden inside it. Limbs that are out attach to the squeezed body and follow it.
- To aim the long axis of a thin body (`sx: .35, sy: 1.8`) along a direction `[dx, dy]`, use
  `rot: Math.atan2(dy, dx) + Math.PI / 2 + .089`; the bottom tip trails. The funnel mouth is `SETS.horn.mouth` facing
  `+x`; the nozzle (`WORLD.nozzle`) points down-right at 45°. Draw `SETS.funnelFront` / `SETS.nozzleFront` after Bolt.

### `RIG.cool(t)`

- The shared held pose for the 35.0 seam: `qwik(...WORLD.boltDesk, 20, { ...RIG.cool(t), boilKey: 'bolt' })`. Bolt
  leans left against the shelf's right side, left hand flat on the shelf top, right fist on the hip, ankles crossed,
  shades on with `feel('cool')`'s smirk and music notes, a small nod on every beat and a toe tap on every other. It
  depends on `t` alone, so both owners of the seam draw the same frame.
- It sets `handL`, `lenL: .45`, `bendL: -1`, `wristL: .5`, and `handR: 'hip'`, `lenR: .62`, `bendR: -.55`. When you
  move a hand off its spot, set that arm's `len`, `bend` and `wrist` too.

### Model sheet `?loop=rigFeatures`

16 s in eight 2 s pages: legLen, len and noFace on paper; the long reach at zoom .5, then at 1.3 (grab, yank, snap
back); the shoot-out with `handMixL` and the recoil; rim 0 and rim 1 in the workshop; `RIG.cool` in the house; the
held spark close up; the funnel dive and the nozzle squeeze. Frames take 60 to 630 ms.
