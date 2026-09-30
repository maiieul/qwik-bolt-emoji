# Rig brief: the Qwik bolt grows rubber-hose limbs

We are growing the Qwik bolt emoji (`src/bolt.js`, `bolt()`) into a full mascot for a ~60 s painted explainer video
about Qwik's JavaScript streaming. The body, face, colours and emotions stay exactly as they are. What's new: **long,
bendy, rubber-hose arms and legs** (1930s cartoon style: limbs are smooth curves with no elbows or knees, that stretch
like noodles when the gag needs it) that suit the bolt's slanted, pointy shape.

Read `ANIMATION_GUIDE.md` (the kit: painting API, animation principles, review loop) and `src/bolt.js` first. The bolt
emoji's design notes: the body is the exact bolt path from the Qwik logo, filled white (#FFFBF4), with a purple
(#AC7EF4) copy 0.8u up-right and a blue (#18B6F6) copy 0.8u down-left. It must read at small sizes. Faces come from
`feel()` / `emotions()` / `boltFeel()` exactly as in the emoji.

## Geometry you need

`bolt(x, y, u, o)` translates to `(x - BODY_CX*u + dx*u, y + (dy - hover)*u)` then rotates by `o.rot`, scales by
flip / sx / sy / squash (`sq`), and draws the bolt polygon `BOLT` (in u): A(1.112,-7.952) right corner, B(-7.475,-16.301)
top tip, C(-6.554,-9.952) inner left notch, D(-8.555,-7.952) left corner, E(0,0) bottom tip, F(-.488,-6.352) inner right
notch. Body centre (-3.72, -8.15), face centre (-3.72, -8.1). The widest points are D (left) and A (right), level with the
face. Read the transform code in `bolt()` carefully: your limbs must follow the body exactly through `rot`, `sq`, `dy`,
`flip` and `sx/sy`, so compute body-local attach points and map them to world space with the same transform.

## The contract (all variants implement the same API)

Write ONE file, `src/rig_<ID>.js`, wrapped in an IIFE that assigns globals only through `window.RIG_<ID> = { ... }`
and `LOOPS[...]`. Do not edit any shared file (`src/core.js`, `src/clawd.js`, `src/bolt.js`, `src/timeline.js`,
`render.mjs`). Make your own studio page `studio_<ID>.html` (copy `studio.html`, replace the scenes script with yours)
and render with `node render.mjs --page=studio_<ID>.html ...`.

`RIG_<ID>.qwik(x, y, u, o)` draws the whole mascot and returns world points for props and cameras:

- `(x, y)` = the ground point between the feet. `u` = the same unit as `bolt()` (the body is ~16u tall, ~10u wide).
  Standing height with legs ≈ 22–24u.
- Accepts everything `bolt()` accepts (spread `boltFeel(...)` / `boltEmotions(...)` output into it) plus:
  - `walk` (leg phase, like clawd's `walk`), `run` (bool: bigger stride, lean), `dy` (lift in u, for jumps; feet leave
    the ground), `sq` (squash; the legs compress too), `legSpread` (stance width multiplier), `lean` (radians, body
    leans from the hips).
  - Arms, each side independently (`L` = screen-left arm, `R` = screen-right arm):
    - `aL` / `aR`: angle in radians (0 = straight out sideways, + = up, − = down, like clawd), with `bendL` / `bendR`
      (−1..1, the rubber curve's sag direction and amount) and `lenL` / `lenR` (length multiplier, 1 = rest; up to 6+
      for rubber stretch gags).
    - or `handL` / `handR`: an absolute WORLD point `[x, y]` the hand reaches to. The arm stretches as a smooth rubber
      curve from the shoulder to that point, however far. This is the key gag of the video: the mascot's arm shoots
      across the screen to grab a box.
    - `gripL` / `gripR`: hand shape: `'open'` (relaxed), `'wave'` (open palm up), `'point'` (index finger), `'fist'`,
      `'grab'` (curled around something), `'thumb'` (thumbs up).
  - `holdL(u, sw)` / `holdR(u, sw)`: hooks called with the origin AT the hand, rotated along the forearm direction, so a
    held prop draws around (0, 0) and follows the hand.
  - `noLimbs`, `noShadow`.
- Returns `{ handL: [x, y], handR: [x, y], face: [x, y], top: [x, y], feet: [[x, y], [x, y]] }` in world space.
- Draw order: shadow → back limbs (behind the body) → body (call `bolt()` with `noShadow: true`, `hover: 0` or whatever
  you need, and the face options) → front limbs. An arm reaching across the body or toward the camera draws in front.
- Limbs must be painted with the kit (`paint()` with `ribbon()`/`through()`, `inkLine()`), ink outlined, flat `wash`,
  boiling like everything else, each limb seeded with its own `boilSeed()` key so a moving arm never re-boils the body.
- Feet stay planted on the ground line during idle and walks (no sliding, no floating), except in jumps.
- Everything is a pure function of the options (no state between frames, no `Math.random()`).

## What to deliver

1. `src/rig_<ID>.js` implementing the contract, and `studio_<ID>.html`.
2. A model sheet loop `LOOPS.rig<ID>` (len 2 s, painted on plain paper, 3 columns × 2 rows, each mascot at u ≈ 11, all
   animating, clearly spaced) showing: (1) idle, `boltFeel('happy', t)`, arms relaxed and swinging a little; (2) a walk
   cycle in place with arm swing (opposite arm to leg); (3) waving hello with the right hand; (4) pointing at something
   to the right with the right hand while looking at it; (5) the rubber reach: the right arm stretches ~4× its rest
   length to grab a small yellow box far to the right, with a `'grab'` grip, the left arm counterbalancing;
   (6) carrying a box overhead with both hands, mid-hop.
3. A hero loop `LOOPS.rig<ID>Hero` (len 2 s): one big mascot (u ≈ 26) in a confident, charming pose, gesturing with both
   hands, for judging the limbs up close.
4. Render and LOOK at them: `node render.mjs --page=studio_<ID>.html --loop=rig<ID> --sheet=0,.5,1,1.5 --cols=2 --w=960
   --out=out/rig_<ID>/sheet.jpg`, strips of the walk (`--strip`), crops of the hands and feet, the hero loop. Iterate on
   what you see until it looks like a professional cartoon mascot: appealing silhouettes, limbs that feel springy and
   alive (overlap, follow-through, arcs, no twinning), hands and feet that read at small sizes, limbs that attach to the
   body naturally (no gaps, no stickers glued on), feet planted.
5. Save your final images as `out/rig_<ID>/final_sheet.jpg`, `out/rig_<ID>/final_hero.jpg` and a walk strip
   `out/rig_<ID>/final_walk.jpg`.

Keep frames cheap: under ~400 ms each at 1920×1080 on this machine.
