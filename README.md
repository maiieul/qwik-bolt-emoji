# JavaScript Streaming, starring Bolt

A 66-second painted cartoon that explains Qwik's JavaScript streaming. Bolt, the Qwik logo with rubber-hose arms and
legs, renders a page on the server and streams the HTML to the browser in pieces, the slow part last. It then streams
the page's JavaScript in the background over a slow network. When a click needs code that hasn't arrived yet, Bolt's
arm stretches all the way back down the line and sends that code first.

Everything is made from code: the pictures with [p5.js](https://p5js.org) and
[p5.brush](https://github.com/acamposuribe/p5.brush), the music and sound effects with plain Node. The animation kit
comes from John Heibel's [ClaudeAnimationBase](https://github.com/JohnHeibel/ClaudeAnimationBase) (MIT), by way of
the [qwik-bolt-emoji](https://github.com/maiieul/qwik-bolt-emoji) set.

## Make the video

You need Node.js and Google Chrome. ffmpeg comes from the `ffmpeg-static` package.

```bash
npm install
npm run video
```

`npm run video` builds the soundtrack, renders all 1,584 frames in headless Chrome (about 5 minutes on an M4 Pro) and
writes `out/qwik-javascript-streaming-1080p.mp4` and `out/qwik-javascript-streaming-720p.mp4`.

| command | what it does |
|---|---|
| `npm run audio` | builds `assets/soundtrack.wav` from `audio/` and checks it |
| `npm run frames` | renders every frame into `out/frames/` (resumable) |
| `npm run export` | encodes the frames and the soundtrack into the two MP4 files |
| `node render.mjs --sheet=12,12.5,13 --out=out/check/a.jpg` | a contact sheet of chosen times (see the top of `render.mjs` for strips, crops and stills) |

To scrub the film, open `studio.html` in Chrome (`studio.html?t=40` jumps to 40 s).

## What's here

| path | what it is |
|---|---|
| `STORYBOARD.md` | the film shot by shot, and what each picture means in Qwik terms |
| `RESEARCH.md` | how Qwik v2's streaming really works, with source references |
| `LIBRARY_SPEC.md`, `LIBRARY_API.md` | the world layout and the shared sets, props and cast |
| `RIG_API.md` | Bolt's rig: `qwik()` and its options |
| `src/scenes/` | the six scene files |
| `src/lib/` | the shared library |
| `src/rig.js` | Bolt with rubber-hose limbs |
| `src/core.js`, `src/clawd.js`, `src/bolt.js`, `src/timeline.js` | the animation kit and the bolt |
| `audio/` | the procedural soundtrack (see `audio/README.md`) |
| `render.mjs`, `tools/` | the renderer and the export |
