# Soundtrack

The music and sound effects for the 76 s JavaScript streaming video (a 10 s intro, then the 66 s film), made from code
in plain Node. There are no samples and no new dependencies: `ffmpeg-static` and `sharp` are only used by the checks.
Every random choice comes from a fixed seed, so two builds give the same bytes.

## Build

```sh
node audio/make.mjs            # the film, about 6 s
node audio/make.mjs --report   # also prints each cue's level against the music, and the duck
node audio/intro.mjs           # the intro and the 76 s file, about 2 s; reads assets/soundtrack.wav
node audio/verify.mjs          # checks the files, writes pictures to out/audio/
```

`npm run audio` runs all three.

`make.mjs` writes three 44.1 kHz, 24-bit stereo WAV files, each exactly 66.0 s (2,910,600 frames):

| file | what it holds |
|---|---|
| `assets/soundtrack.wav` | the mix: −16 LUFS integrated, true peak −2 dBTP |
| `assets/music_only.wav` | the music as it sits in the mix: ducked under the effects, mastered |
| `assets/sfx_only.wav` | the effects as they sit in the mix |

The two stems add up to the mix (to within the dither), so you can rebalance them in an editor and keep the master.
`intro.mjs` then writes `assets/intro.wav` (10.0 s) and `assets/soundtrack_full.wav` (76.0 s, the intro then the film);
see [Intro](#intro).

The video uses `assets/soundtrack_full.wav`: `PROJECT.audio` in `src/config.js` points at it, so `render.mjs --clip` and
`npm run export` pick it up. `node render.mjs --encode` needs `--audio=assets/soundtrack_full.wav`.

## Files

| file | role |
|---|---|
| `dsp.mjs` | additive oscillators (partials fade out between 6 and 8.5 kHz, so nothing aliases), Karplus-Strong pluck with fractional-delay tuning, noise, state-variable and biquad filters, stereo reverb (Freeverb), compressor, 4× oversampled true-peak limiter, BS.1770 loudness meter, a moving delay and a resampler, WAV reader and writer |
| `instruments.mjs` | ukulele string, pizzicato, glockenspiel, music box, marimba, round bass, pad, kick, finger snap, brushes, shaker, woodblock |
| `score.mjs` | the chord chart (`CHART`), the sections, the parts, and the music mix (`BUSES`) |
| `sfx.mjs` | the 75 effects (`EFFECTS`) and their levels |
| `mix.mjs` | places the cues (and expands repeating ones), ducks the music, masters the files |
| `cues.json` | the cue list |
| `intro_score.mjs` | the intro's chord chart (`INTRO_CHART`), sections, hold music, droop and room tone |
| `intro_sfx.mjs` | the intro's 20 effects (`INTRO_EFFECTS`), which also holds every film effect |
| `intro_cues.json` | the intro's cue list |
| `make.mjs`, `intro.mjs`, `verify.mjs` | build the film, build the intro and join it to the film, check both |

## Retiming cues

`cues.json` is a list of `{ "t": seconds, "name": effect, "gain": number }`, sorted by time.

- `t` is when the effect hits the picture. Some effects lead in before their hit: `snapBack` (the arm's zip starts
  0.483 s before it hits Bolt), `zipInSnap` (0.2 s), `zipSlap` (0.17 s), `armsBoing` (0.1 s), `armSnap` and
  `cubbyClunk` (0.07 s). The others start at `t`, long ones (whooshes, the snore, the hum) included.
- `gain` scales the effect's built-in level: 1 is as designed, 0.5 is 6 dB down.
- `name` is a key of `EFFECTS` in `sfx.mjs`. An unknown name stops the build and lists the known ones.
- Pitched effects tune themselves to the chord playing at `t`, so a moved cue stays in tune: the pops, dings, sparkles,
  bells, the boing, the whistle, the hum and the box hops. The pops step up in pitch: `popLow`, `popMid`, `popHigh`,
  `popTop`.
- Each effect has a fixed length (table below). To lengthen one, change its `dur` and its envelopes in `sfx.mjs`. The
  build fails if an effect runs past its `dur`.
- The music ducks by up to 4 dB under `medium` and `big` effects, a little under `small` ones, and not at all under
  `tiny` ones.
- After an edit, run `make.mjs`, then `verify.mjs`. It checks that every hit has an onset within 25 ms of its `t` and
  that no sharp sound falls outside a cue.

The box hops (28.3–31.9) follow `src/lib/schedule.js` and `PROPS.beatOff`: a box lands at `n + 0.5 − beatOff / 2`
seconds, and its cue gain is its hop height at mid-flight (`hopAmp`), so the first hops are soft and the cart box's eager
last hop (which `network.js` raises from 30.45) is the loudest. If the queue's timing changes, move those cues with it.

### Effects

Levels are the loudest 100 ms of each effect (K-weighted LUFS) before mastering, against music at −20 LUFS: big −16,
medium −19, small −24, tiny −28. Each effect's peak is also capped at −9 dBFS before mastering.

| effect | length (s) | lead-in (s) | level | cues (s) |
|---|---|---|---|---|
| `paintSwish` | 1.3 |  | medium | 0 |
| `slideIn` | 0.35 |  | tiny | 1, 1.5 |
| `boing` | 0.75 |  | big | 2 |
| `armUnroll` | 0.55 |  | small | 2.05 |
| `armSnap` | 0.45 | 0.07 | medium | 2.56 |
| `popLow` | 0.3 |  | medium | 3, 17 |
| `popMid` | 0.3 |  | medium | 3.5, 17.5 |
| `popHigh` | 0.3 |  | medium | 3.75, 18, 62, 63 |
| `underlineSwish` | 0.4 |  | tiny | 4.05, 63.3 |
| `scramble` | 0.32 |  | small | 5.25 |
| `whip` | 0.8 |  | big | 5.5 |
| `skid` | 0.6 |  | medium | 6 |
| `pipeRattle` | 0.32 |  | medium | 7.75 |
| `tubeThunk` | 0.45 |  | medium | 8 |
| `zipSlap` | 0.42 | 0.17 | medium | 9, 9.5, 11, 13.5, 14.25 |
| `fwoomp` | 0.65 |  | medium | 10.02, 13.26, 13.82, 14.52, 22.22 |
| `snore` | 1.05 |  | medium | 11.45 |
| `knock` | 0.25 |  | small | 11.54, 11.68 |
| `pokePop` | 0.35 |  | medium | 12.5 |
| `lipSmack` | 0.5 |  | small | 12.56 |
| `dive` | 0.62 |  | big | 15 |
| `tubeTravel` | 1.6 |  | small | 15.5 |
| `unfold` | 0.3 |  | small | 17, 17.5, 18, 18.5, 23.12 |
| `popTop` | 0.3 |  | medium | 18.5, 62.5 |
| `squeeze` | 0.5 |  | medium | 18.9 |
| `land` | 0.4 |  | medium | 19.5 |
| `iris` | 0.55 |  | tiny | 20.25, 22.25 |
| `alarm` | 0.72 |  | medium | 20.6 |
| `slap` | 0.25 |  | medium | 21.27 |
| `cough` | 0.65 |  | medium | 21.46 |
| `envelopePop` | 0.35 |  | medium | 22.75 |
| `paperSlide` | 0.35 |  | small | 23.44 |
| `poofSparkle` | 1 |  | medium | 23.72 (one ping per review star) |
| `yawn` | 0.85 |  | medium | 26.08 |
| `armsBoing` | 0.6 | 0.1 | medium | 26.76 |
| `catch` | 0.15 |  | small | 27.04, 36.3, 40.3 |
| `whistle` | 0.42 |  | medium | 27.24 |
| `hopMenu`, `hopHeart`, `hopStar`, `hopShare`, `hopGear`, `hopCart` | 0.15 |  | tiny | 18 landings, 28.33–31.83 |
| `leapOnSnail` | 0.52 |  | small | 30, 30.25 |
| `snailSetOff` | 0.7 |  | tiny | 30.4, 30.65, 47 |
| `clockWhizz` | 0.6 |  | small | 31.95 |
| `snailArrive` | 0.7 |  | tiny | 32.25, 32.5, 48.5, 49.75, 55.5, 56 |
| `cubbyClunk` | 0.7 | 0.07 | medium | 33, 33.5, 49, 51, 56, 56.5 |
| `shadesClick` | 0.15 |  | tiny | 34, 57.5 |
| `click` | 0.15 |  | medium | 36, 40 |
| `sparkSparkle` | 0.55 |  | medium | 36, 40 |
| `heartPop` | 0.6 |  | medium | 37 |
| `sting` | 0.9 |  | big | 41.3 |
| `sparkHum` | 2 |  | −26 | 42 |
| `windUp` | 0.55 |  | small | 43 |
| `stretchZip` | 2.1 |  | big | 43.47 |
| `grab` | 0.3 |  | medium | 46 |
| `yank` | 0.6 |  | medium | 46.5 (with the gear's wobble and "!") |
| `plonk` | 0.35 |  | medium | 47 |
| `pat` | 0.15 |  | tiny | 47.18, 47.34 |
| `snapBack` | 1.25 | 0.483 | big | 48.083 (the zip starts as the arm leaves at 47.6) |
| `clockWhizzLong` | 1.15 |  | small | 48.3 |
| `puffOut` | 0.4 |  | small | 49.76 |
| `sparkWhoosh` | 0.6 |  | medium | 51.1 |
| `cartDing` | 1.4 |  | big | 51.54 (the badge turns 0 → 1) |
| `confetti` | 1.3 |  | medium | 51.68 |
| `thumbsUp` | 0.55 |  | medium | 53 |
| `wipeBrow` | 0.4 |  | small | 54 |
| `whooshBack` | 1.4 |  | medium | 58.5 |
| `paperClose` | 0.55 |  | small | 60 |
| `jump` | 0.25 |  | small | 60.5 |
| `zipIn` | 0.2 |  | small | 60.62, 60.74 |
| `zipInSnap` | 0.42 | 0.2 | medium | 61.15 |
| `landSoft` | 0.6 |  | small | 61.5 |
| `winkTwinkle` | 1.6 |  | medium | 64.04 |

### Where the times come from

The cues follow the storyboard, refined by the scene files where those already key the moment:

- `server.js`: the funnel sends at 10.02, 13.26, 13.82 and 14.52, Bolt's two knocks on the database (11.54, 11.68), the
  lip smack (12.56), the clock slap (21.27) and the cough that spits the envelope out at 21.82.
- `browser.js`: Bolt stuck in the nozzle (18.9), the envelope caught (23.12) and posted (23.44–23.7), the swap poof
  (23.72), the yawn (26.08, arms back at 26.76) and the whistle (27.24–27.62).
- `network.js`, `payoff.js` and `schedule.js`: the arm shooting out (43.47), the pats on the cart box (47.18, 47.34),
  the arm's impact at Bolt (48.083), the clock whizzes (31.95, 48.3), the cheeks deflating (49.76), the spark thrown
  (51.1), the badge (51.54), the confetti (51.68), and each box reaching its cubby (33.0, 33.5, 49.0, 51.0, 56.0, 56.5).
- `bookends.js`: the arm snaps (2.56, 2.60), the scramble before the dash (5.25), the limbs pulling in (60.62, 60.74,
  the long arm at 61.15) and the wink's sparkle (64.04).

If a scene moves a moment, move its cue; `verify.mjs` then checks the new time.

## Music

120 BPM in 4/4, beat 0.5 s, bar 2 s, offset 0, in C major. The band: ukulele (plucked strings, strummed), pizzicato,
glockenspiel and marimba on the tune, a round bass, a soft pad, kick, finger snaps, brushes, shaker and woodblocks. The
tune goes C E G, A G E (do mi sol, la sol mi) and answers F E D, E D C.

| time (s) | chords | what the music does |
|---|---|---|
| 0–2 | C | a pad fades in under the paint swish; plucks for the purple (1.0) and blue (1.5) copies |
| 2–6 | C, G7 | the band comes in on the boing and plays the tune; a marimba run up into 6.0 |
| 6–11.5 | C, G7–C, Am | busy workshop groove: strums on every eighth, bouncing bass, the tune on marimba, shaker, woodblocks |
| 11.5–13 | F | drops out for the snore: one soft strum |
| 13–15.5 | G, C | the groove comes back for the sends; the band stops on 15.0 for the dive; a C7 pickup at 15.5 |
| 15.5–17 | F | travel: chugging strums, rolling bass |
| 17–20.5 | F, G | lighter while the parcels land; a glockenspiel ta-da as Bolt lands (19.5) |
| 20.5–22.5 | Am | dark and thin at the server, under the alarm and the cough |
| 22.5–26 | Dm7, G7, C | climbs to the complete page at 24.0, the tune again |
| 26–28 | F, G | almost still for the yawn and the whistle |
| 28–32 | C, Am | calm: long strums, a slow glockenspiel line; the box hops add the movement |
| 32–35 | F, C, F | a lazy shuffle while Bolt leans on the shelf |
| 35–38 | G7, C | tiptoe pizzicato for the cursor; C on the click (36.0); ta-da on the heart (37.0) |
| 38–40 | Am, Dm | suspicious tiptoe |
| 40–44 | G | the band drops out on the click: a held G and a ticking woodblock that grow, then a drum roll and a run into 44.0 |
| 44–48 | C, Dm, Em, F, G, Am | the rising stretch: a new chord every beat, galloping strums, rising arpeggios; stops at 47.5 while the arm zips back |
| 48–50.5 | Dm7, G7 | waiting vamp: tick-tock woodblocks, staccato bass, muted strums |
| 50.5–51.5 | G7 | lift: tremolo strums, a marimba roll and a bass walk-up, all growing |
| 51.5–54 | C | the big hit on the badge (0 → 1), then the tune over the full groove |
| 54–58.5 | F, G, Em, Am | relaxed groove |
| 58.5–64 | F, G, Am, G, C, F, G | warm ending; glockenspiel notes on the end-card words (A, C, B) |
| 64–66 | C | the final chord on the wink; fades out from 65.0 to 66.0 |

To change the music, edit `CHART` and the section functions in `score.mjs`. Each instrument bus is set to a loudness in
`BUSES`, so note velocities only shape the dynamics inside a part.

## Mix and master

- Music: each bus set to its own loudness, a shared reverb, a gentle 3:1 bus compressor, then −20 LUFS.
- Effects: set one by one to their level, with their own small reverb.
- Ducking: the music dips by up to 4 dB under the effects, 15 ms ahead of them, and recovers over 250 ms. It sits
  more than 2 dB down for about 23 s of the film.
- Master: cut below 30 Hz, 3 dB off above 8 kHz, roll-off above 12 kHz, then a look-ahead true-peak limiter (4×
  oversampled, ceiling −2 dBTP) inside a gain search that lands on −16 LUFS. The limiter acts on about 1.2 s of the film,
  by 2 dB at most.

## Intro

A first visit on a very slow network, before the title (`STORYBOARD.md`, "0 · Intro"). Story times run from −10 to 0;
video time is story time + 10. `intro.mjs` renders the intro 1 s past the join, masters it like the film, and writes:

| file | what it holds |
|---|---|
| `assets/intro.wav` | the intro alone, exactly 10.0 s (441,000 frames), in the film's format |
| `assets/soundtrack_full.wav` | 76.0 s: `intro.wav`, then `soundtrack.wav` byte for byte, except in the film's first second, where `intro.mjs` adds the intro's tail (the last chord's release and reverb) |

`intro.mjs` only reads `soundtrack.wav`, so the film stays exactly as `make.mjs` wrote it. Run `make.mjs` first.

### Retiming the intro

`intro_cues.json` works like `cues.json`, with negative story times. A cue can also repeat:
`{ "t": -5, "name": "clockTick", "gain": [0.9, 0.75], "every": 0.5, "until": -3 }` plays at −5, −4.5, −4 and −3.5
(`until` itself is left out), and a `gain` list cycles over the repeats. Each repeat gets its number `k`: the clock
alternates tick (D6) and tock (G5), and the spinner alternates two pitches.

- Each cue sits on its event in the picture (`AT`, `LETTER_AT` and the camera keys in `src/scenes/intro.js`), within a
  frame.
- `fingerDrum` starts 0.16 s before `t` and taps pinky, ring, then middle on `t`, as the hand does. `crawlSquish`
  starts 0.2 s before `t`, so it swells on the snail's stride. The other intro effects start at `t`.
- The key clacks sit on the frames where their letters appear; the second letter of each pair is softer.
- The music keeps to the bar grid and does not follow the cues, with one exception: the droop snaps back on the
  `clockWhizz` cue.
- Intro cues can name any film effect too (`click` and `clockWhizz` do).
- After an edit, run `npm run audio`.

| effect | length (s) | lead-in (s) | level | cues (s) |
|---|---|---|---|---|
| `handGlide` | 0.6 |  | small | −9.62, the hand sets off; it settles at −9.12 |
| `click` (the film's) | 0.15 |  | medium | −9 |
| `barGlow` | 0.6 |  | tiny | −9, the focus ring |
| `keyClack` | 0.12 |  | small | 14 cues, −8.5 to −7.583, one per letter |
| `enterKey` | 0.45 |  | medium | −7 |
| `spinnerTick` | 0.05 |  | tiny | every 0.25 from −7 to −0.75, louder off the beat; a soft last one at −0.5, as the page turns to paper |
| `slipPop` | 0.35 |  | medium | −6.5, the slip pops out of the address |
| `slipFlutter` | 0.5 |  | small | −6.44, the tumble; the slip lands at −6 |
| `shellTap` | 0.2 |  | tiny | −6, the landing on the shell |
| `snailWake` | 0.2 |  | small | −5.96, the "!": two eye-stalk boinks |
| `snailYawn` | 0.42 |  | small | −5.72, the film's yawn 1.35× higher and faster, loudest with the widest mouth (−5.56), cut as the mouth closes |
| `snailTurn` | 0.45 |  | tiny | −5.3: squash, flip (−5.25), dust puff |
| `snailScoot` | 0.36 |  | small | −5.2, a squish at double speed, loudest on the stretch (−5.1) |
| `clockTick` | 0.2 |  | small, no duck | −5, −4.5, −4, −3.5 |
| `fingerDrum` | 0.25 | 0.16 | small | −4.25, −3.75, −3.25, the rolls the hand plays on screen, between the clock's ticks |
| `crawlSquish` | 0.7 | 0.2 | tiny | −4.15, −3.45 |
| `clockWhizz` (the film's) | 0.6 |  | small | −3 |
| `snailDash` | 0.45 |  | small | −3, the dash and the camera's pan, loudest at −2.8 |
| `portholeSqueeze` | 0.36 |  | medium | −2.6, the snail pushes in; it wobbles with the snail from −2.44 and stops on the pop |
| `portholePop` | 0.55 |  | medium | −2.25: a pop, a poof and a zip off to the left |
| `pushIn` | 1.45 |  | medium, ducks a quarter | −2, loudest with the camera (−1.2), gone by −0.6 |
| `paperFade` | 0.5 |  | tiny | −0.58, the page turns to paper |

### Intro music

The same grid (120 BPM, bars at −10, −8, −6, −4 and −2) and C major. A music box plays the film's tune at half speed
over a soft pad: sleepy hold music. A round bass joins at −8, and a soft room tone runs under it all until the page
turns to paper (it fades from −0.58 to −0.25).

| time (s) | chords | what the music does |
|---|---|---|
| −10 to −6 | C, Am | the music box plays C E G, A G E (do mi sol, la sol mi) at half speed |
| −6 to −5 | F | the answer starts: F E D |
| −5 to −3 | G | the droop: the music sags like a tape running down (110 cents flat by −3, with a slow wobble) and gets 4 dB quieter; E D, and the closing C never comes |
| −3 to −2 | Dm7 | on the clock whizz the music whoops back up to pitch and fades out in 0.4 s; a soft Dm pad from −2.75 under the squeeze |
| −2 to 0 | G | the rise: with the push-in, a G pad swells and the bass and a music-box G come in; a G arpeggio climbs in sixteenths from −1 and reaches its top as the page turns to paper (−0.25); the G chord rings on into the film's C pad |

To change the music, edit `composeIntro` and `INTRO_CHART` in `intro_score.mjs`; `DROOP` sets the droop's depth,
wobble, quietening and fade.

### Intro mix and master

- As in the film: each effect at its level, the music ducking under the effects, the same master EQ and true-peak
  limiter (ceiling −2 dBTP).
- The gain search aims the intro's 11 s render at −17.5 LUFS (`INTRO_LUFS` in `intro.mjs`); `intro.wav` measures
  −17.4 LUFS, with a master gain of 5.6 dB (the film's is 4.2 dB). The limiter acts on 0.03 s of the intro, by 0.6 dB
  at most.
- The rise lands near the film's level: −17.0 LUFS momentary over the intro's last second, −15.9 LUFS over the film's
  first, and the short-term loudness runs on with no step.
- The tail mixed into the film's first second stays at least 10 LU under the film.

## What verify.mjs checks

On the last build:

| check | result |
|---|---|
| format | 44.1 kHz, 24-bit stereo, 66.0000 s, all three files |
| stems | music + effects = mix, within −126 dBFS |
| ffmpeg `ebur128` | −16.0 LUFS integrated, true peak −2.0 dBTP, loudness range 4.7 LU |
| ffmpeg `loudnorm` | input −16.11 LUFS, true peak −2.00 dBTP |
| ffmpeg `astats` | DC offset under 0.00001, no clipped runs; sample peak −2.0 dBFS on the mix, −1.8 dBFS on the stems |
| ffmpeg `silencedetect` | no gap below −50 dBFS longer than 0.25 s |
| high end | energy above 8 kHz is 39.8 dB below the whole; the loudest 33 ms frame there is −39 dBFS |
| effect timing | all 91 hit cues have an onset within 25 ms; no onset above −40 dBFS outside a cue and its reverb tail |
| clicks | every sharp high-band transient lines up with a scheduled note or cue |
| beat | all 148 music onsets sit on the 120 BPM grid (sixteenths, triplets or rolls) within 20 ms |
| harmony | 98% of spectral peak energy within 15 cents of a semitone, 99% on C major scale tones |
| intro files | `intro.wav` 10.0000 s and `soundtrack_full.wav` 76.0000 s, both 44.1 kHz, 24-bit stereo |
| join | `soundtrack_full.wav` is `intro.wav` then `soundtrack.wav`, byte for byte past the film's first 1.000 s; the tail there peaks at −15.9 dBFS, at least 10.4 LU under the film |
| ffmpeg `ebur128`, intro | `soundtrack_full.wav` −16.2 LUFS, true peak −2.0 dBTP, LRA 4.5 LU; `intro.wav` −17.4 LUFS, true peak −2.0 dBTP |
| loudness across the join | −17.0 LUFS momentary over the intro's last second, −15.9 LUFS over the film's first; it prints the 400 ms values from −2 to +2 s |
| ffmpeg `astats`, intro | DC offset under 0.00001, no clipped runs, peak −2.0 dBFS in both files |
| clicks at the join | no sharp high-band transient within 30 ms of the join; the sample step there is smaller than the largest within 10 ms |
| intro timing | all 28 intro hits have an onset within 25 ms (the intro's effects rendered alone); no onset above −40 dBFS outside a cue |
| intro harmony | outside the droop (−5 to −2.6), 99% of the intro music's spectral peak energy within 15 cents of a semitone, 99.7% on C major scale tones |
| intro tone | prints the band shares and spectral centroid against the film's first 6 s; energy above 8 kHz is 41.4 dB below the whole |

It also prints each section's mean loudness, onset rate and brightness, and writes these pictures to `out/audio/`:
`spectrum_linear.png`, `spectrum_log.png` (ffmpeg `showspectrumpic`), `waves_soundtrack.png`, `waves_music.png`,
`waves_sfx.png` (`showwavespic`), and `annotated.png`: a spectrogram with the cue times on top, the section lines, and
the music and effect loudness over time.
For the intro it writes `intro_spectrum.png`, `intro_waves.png`, `intro_join_spectrum.png` (−4 to +4 s),
`intro_join_waves.png` (−1 to +1 s), `intro_full_waves.png` (all 76 s) and `intro_annotated.png` (−10 to +4 s: the
spectrogram, cue ticks, and the momentary loudness of `soundtrack_full.wav` and of the film alone).
