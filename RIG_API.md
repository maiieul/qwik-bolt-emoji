# Bolt's rig (`src/rig.js`)

`qwik(x, y, u, o)` draws Bolt with classic rubber-hose limbs (dark ink tubes, white four-finger gloves, Qwik-blue
shoes). `RIG` holds the helpers. Model sheets: `?loop=rigA`, `rigAHero`, `rigAMoves`, `rigAEmotions`, `rigAActing`,
`rigALab`.

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

`{ handL, handR, face, top, feet }` in world space (plus the additions below once they land).

## Being added now (by the rig owner, in place, backward compatible)

`legLen` (0 = legs tucked, body at the emoji's hover height; 1 = rest; > 1 = sprung), `lenL`/`lenR` down to 0 (arm
tucked in), `noFace` + `noSpark` (the plain logo, matching `bolt()` exactly), `viaL`/`viaR` (world via-points for very
long reaches, drawn in chunks with `longRibbon` and capped sag), returned `shoulderL`, `shoulderR`, `armPathL`, `armPathR`,
an optional `rim` (0..1) light rim on the limbs for the dark workshop, and `RIG.cool(t)` (the shared lean-on-the-shelf
pose with shades, used across the 35.0 seam). Check `RIG.features` (an array of these names) before relying on one.
