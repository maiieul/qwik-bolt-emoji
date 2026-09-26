# Agent notes

Read [README.md](README.md) first. The bolt reuses Clawd's face parts, emotions and emotes, so
[ANIMATION_GUIDE.md](ANIMATION_GUIDE.md) covers most of the drawing API.

## Verify

- After any change meant to leave the art alone, `npm run check` must end with `dist/ matches out/svg (39 files)`. The
  SVG export is deterministic, so a byte difference means the drawing changed.
- After a change to the art, run `npm run build` and look at the frames before you report back: render an SVG to PNG
  with sharp (`sharp('dist/qwik_happy.svg', { density: 288 })`) or open it in Chrome.
- Judge each emoji on a dark (#313338) and a light (#FFFFFF) background.
- The watercolour output has no copy in `dist/`; judge it by eye in `out/emoji/preview.png`.
- `export_svg.mjs` prints each emoji's gaps to the frame edges, in px at 128. Keep the top and bottom gaps at 2–3 px
  and the sides at 0 or more; the laser beams leave the frame on purpose.
- `node check_face.mjs [name ...]` prints how far the eyes, brows, mouth and mustache stay inside the bolt's outline, in
  px at 128, at the worst frame. Keep them at 0 or more (-0.3 at worst); it leaves out the glasses, tears and blush.

## Design

- The body is the exact bolt path from the Qwik logo (`packages/docs/public/logos/qwik-logo.svg` in QwikDev/qwik),
  filled white (#FFFBF4). A purple (#AC7EF4) copy sits 0.8u up and right, and a blue (#18B6F6) one 0.8u down and left.
- No arms. The face sits on the widest part of the bolt, which floats on its bottom point.
- No boil: nothing moves unless the loop moves it.
- No light outline around the bolt: it looks wrong on Discord's dark theme.
- Every emoji must read on Discord's dark and light themes, down to 22 px.
- Each emoji fills the frame's height: its `scale` and `lift` put the loop's highest and lowest points 2–3 px from the
  edges. `scale` stops at 1.2 so the bolts stay close in size; emoji whose extras or motion need room (dance, sad) come out
  smaller.
- The eyes are as wide as the bolt allows: `EYE_FIT` in `src/bolt.js` sizes and places each eye kind, 2.1u either
  side of the middle (`EYE_X`). Eyes, brows and mouths stay inside the outline; glasses may hang past it.

| emoji | what it does |
|---|---|
| happy | the kit's happy mood |
| love | heart eyes that beat (a big thump, then a smaller one, once a second) with a slow bob and sway, hearts rising from low by its top corner; no spin |
| dance | the kit's jumpy excited motion with a party hat; keep it jumpy |
| think | the kit's thinking mood with three dots |
| sad | the kit's sad mood, sagging and swaying slowly under a rain cloud as wide as the bolt |
| rage | angry brows, the 😡 scowl, a red tint and a head shake |
| cool | big shades always on, never put on or taken off; a smirk, music notes, a small nod and sway |
| sleepy | the kit's sleepy mood, floating low and breathing |
| cry | the 😭 face: shut eyes, tear streams, a wide sobbing mouth; no jumping |
| wink | a slow wink while the head swings to the side and back |
| laser | laser eyes, with the whole bolt shaking every frame |
| thumbsup | Borat's "very nice": a mustache, a wide grin and two big floating thumbs, no forearms, pumping up and down in turn 2.5 times a second; the head moves away from the raised thumb |
| ko | the kit's ko mood, squashed and tilted |

## Invariants

- Loops must be seamless: every periodic term must fit whole cycles in the loop's length. Use `cycles(t, len,
  perSecond)` and `wave(t, len, perSecond, phase)` in `src/emoji.js`, and the `k` option to rescale the clock for kit
  effects with their own period (emotes, eye effects).
- Frames must be pure functions of time. For per-frame randomness, hash the frame number as `laser` does; never call
  `random()` for motion.
- `NO_BLINK` is a blink seed with no blink in the first 3 s. A loop longer than 3 s needs another seed.
- Each emoji's still time lives in `E` in `src/emoji.js` and in `STILL` in `encode_emoji.mjs`; change both.
- SVG ids start with the emoji's name, so one HTML page can inline all 13.
- Discord takes 128×128 files up to 256 KB; `svg_to_gif.mjs` prints each GIF's size.
- GIF alpha is on or off, so an emoji can't rely on glows or see-through colours.

## Add or change an emoji

1. Add or edit its entry in `E` in `src/emoji.js`:
   `name: [loop length in s, still time in s, t => emoji(t, len, mood, options, { k, lift, scale, body })]`.
   - `mood` is one of the kit's emotions (see `feel()` in ANIMATION_GUIDE.md); `options` are `bolt()` options.
   - `body(t)` returns pose changes in u: `dx`, `dy`, `rot` and `sq` (squash).
   - `scale` resizes the bolt (default 1.2) and `lift` moves it down in u (default -0.5; negative moves it up).
2. Set `scale` and `lift` so the gaps that `export_svg.mjs` prints match Verify.
3. Add the still time to `STILL` in `encode_emoji.mjs`, and a new name to `EMOJI` in `build_page.mjs`.
4. Run `npm run build` and check the result as in Verify.

## bolt() options

`bolt(x, y, u, options)` draws the bolt with `(x, y)` on the ground under the middle of its body. Local units are u,
with the origin at the bottom point and y growing down; face units put the eyes at y -6. It takes `clawd()`'s pose,
face, colour and extras options (not views, legs or lid), plus:

| option | effect |
|---|---|
| `hover` | gap in u between the bottom point and the ground (default 1.4) |
| `zap` | spark rate, 0..1 (default: the mood's entry in `ZAP`) |
| `noSpark` | no sparks and no star at the point |
| `emoji` | no ground shadow, bolder ink, bigger sparks 20% closer to the body |
| `tintFrom`, `tintTo`, `tintMix` | colour cross-fade between moods, as in `boltEmotions` |
| `turnX` | -1..1, a turn about the middle; the back has no face |
| `brows` | 0..1 for anger, or `'up'` |
| `mouthK`, `mouthDy`, `mouthSize` | how open the mouth is; how far down it sits, in u; `[w, h]` scale (default `[1, 1.3]`) |
| `sob` | 0..1, the 😭 face with tear streams |
| `shades` | `{ dy, rot }`: sunglasses |
| `hands`, `thumbs` | floating mittens or thumbs-up fists, `[{ x, y, rot, side, k }]` in face units; thumbs also take `arm` |
| `mustache` | true for a mustache |
| `lasers`, `laserFlick` | laser eyes, 0..1, and their shimmer, 0..1 |
| `wind` | 0..1, air streaks at both sides |
| `clock`, `loopLen` | the loop's time and length, so sparks fit whole cycles |
| `emoteAt`, `emoteSize` | `[dx, dy]` in u to move the emote; `[w, h]` to stretch it |
| `heartScale`, `squint` | the heart eyes' size; 0..1, or `[left, right]` for a wink (both read in `src/clawd.js`) |

## Changes to the kit

Reapply these when you update the kit from upstream:

- `src/core.js`: `SMOOTH` turns the boil off (`jit` returns 0); `drawScaled(sx, sy, draw, pivot)` scales the shapes
  drawn inside `draw` but not their stroke widths.
- `src/clawd.js`: `eyes()` takes `o.eyeFit(kind)`, returning `{ x, y, w, h }` to place and size each eye kind; a
  `[left, right]` squint, drawn shut as an arch; `heartScale`; the `beam`, `scowl` and `sob` mouths
  and `mouth()`'s `k`; cream-and-ochre `music` notes and cream `dots` with ink outlines, so they read on dark
  backgrounds.
- `render_bolt.mjs` is `render.mjs` plus `--page` and `--query`, and splits args on the first `=` only.
- `bolt.html` is `studio.html` loading the bolt scripts instead of the demo scene.
