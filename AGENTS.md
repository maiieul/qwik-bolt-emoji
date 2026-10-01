# Agent notes

Read `README.md`, then `STORYBOARD.md` before touching any scene. The animation rules and the review loop are in
`ANIMATION_GUIDE.md`; follow them.

## Invariants

- Every shot is a pure function of video time `t`: no state between frames, no `Math.random()`. Key moods, idles and
  beats on `t`, not `lt`, so motion carries across seams.
- Every character call passes a fixed `boilKey`; every prop and set piece calls `boilSeed('<unique name>')` first.
- Positions come from `WORLD` and `CAMS` (`src/lib/world.js`) and the box and snail schedule from `src/lib/schedule.js`.
  Scene files hard-code no anchors.
- Anything wider than ~700 px on screen is painted in chunks (`longLine`, `longRibbon`, the `'inkflat'` brush):
  p5.brush drops outlines on long shapes.
- Use `RIG.feel()` / `RIG.emotions()` for Bolt's moods; plain `boltFeel()` leaves the long arms in a T-pose.
- The meaning table in `STORYBOARD.md` is a contract: never show anything that reads as hydration, or the network
  getting faster for the clicked code.
- When a picture moves in time, move its sound cue in `audio/cues.json` and run `npm run audio`.

## Verify

- `node render.mjs --sheet=...` / `--strip=a:b` / `--crop=...` and look at the images: every changed shot, its first and
  last 0.5 s, and every seam it touches.
- Frames stay under ~600 ms (the render log prints ms per frame).
- `npm run audio` runs `audio/verify.mjs`: loudness, peaks, clipping, cue onsets.
