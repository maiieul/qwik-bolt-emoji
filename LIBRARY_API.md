# Shared library: as built

## sets

Files: src/lib/sets.js, src/lib/test_sets.js, studio_lib_sets.html

### API
Globals published by src/lib/sets.js: towerSet, landSet, houseSet, tubeContents, tubeGlass, paperVoid, SETS (one constant object), plus LOOPS.setTower/setLand/setHouse/setWorld. All world anchors from LIBRARY_SPEC.md are unchanged.

towerSet(t, o): cutaway tower (x 40–1460, roof -420): roof parapet, antenna with a slow red beacon, satellite dish, two upper rack floors (y -380..-150, -120..140) with dim slow LEDs and a ladder, the workshop (night-indigo rack wall with dim slow LEDs, drive slots and cables), a hanging pendant lamp at WORLD.lamp with the warm pool (3 glows + bulb glow; the rooftop beacon is a 5th glow only in wide shots), parts shelves (130–430 × 330–660) with page parts drawn by pagePart() and a brush jar, the empty db corner under them, brass request pipe from the ceiling to a trumpet mouth with a hinged flap at WORLD.requestPipe, the board via drawBoard(o.board) (page.js draws its own easel; sets.js draws a placeholder board + easel only if drawBoard is missing), a red toolbox, the funnel = brass horn whose bell faces the board (rim x 1215, y 600, ±104) with a glass riser at x 1300 up to an elbow into the straight run, a brass strap, wall sections, floor, stone plinth, a big tree outside on the left. Options: o.shelfParts (array of kinds or {kind: truthy}; default ['header','hero','card','skeleton','footer']; a missing part leaves a faint dust line), o.board (drawBoard state), o.pipeRattle 0..1 (pipe shakes, flap bounces, motion ticks), o.funnelGulp 0..1 (bell swells, cream air streaks flow into the mouth), o.land (options for the auto land; false disables it).

landSet(t, o): graded pale sky bands (near-white blue to cream horizon), a pale sun, drifting clouds (d .22, 3 per cell incl. low small ones), 4 gliding birds, far hills (d .35) and mid hills (d .7) with low-bleed watercolour texture, a turning windmill on the mid layer (layer x 4140: near the house in wide shots, hidden behind the house for every house camera), near ground = groundY (d 1) with texture, a winding sandy path from the tower base to the house base, grass tufts and flowers, bushes, a tree (x 2660), a fence (3060–3340), wooden trestles with X braces under couplers 1940–3860, the dock (posts, X braces, knee braces and a wall lantern behind the tube; the deck front at roadY..roadY+26 in front of the tube, planks), the outdoor glass runs 1460→4448 and brass couplers, and a foreground meadow band (d 1.3, top ~1168, tufts/flowers/bushes only within world x 1610–4250 so they never cover a building). Runs once per frame and camera (key = frameCount + camera); later calls in the same frame/camera are no-ops. Options: o.meadow (false skips the foreground).

houseSet(t, o): house shell with a tiled roof and chimney smoke (chimney at x 5030), dusty-lilac striped wallpaper with sprigs, crown moulding, skirting, a real window (5990–6200 × 150–610) with daylight, cloud, hill, curtain and a faint sunbeam, a wall clock via wallClock(4600, 430, 1, { whizz }) under a nail, the porthole = round brass ring around a dark hole in the left wall (centre 4415, 218; opening y ≈ 105–331, big enough for a snail carrying a box), the house glass run 4448→elbow with ceiling straps and a thin brass snail-stop band at 4640, the brass faucet spout (elbow + tapered nozzle, mouth at WORLD.nozzle), a snail nook ledge (x 4995–5175 at road height, quilt + pillow), the 2×3 shelf with dark cubbies and faint icon() ghosts (58 px), a warm mid-wood desk with drawers, the browser window frame (three dots, URL bar with a tiny Qwik bolt, stand, soft drop shadow) with drawPage(o.page) inside and the title-bar rule redrawn on top, a mug with a bolt and steam, a potted plant, floor planks and plinth. Options: o.page (drawPage state), o.cubbyLit { kind: 0..1 } (warm inside + one glow each), o.clockWhizz, o.clockTime (hours shown before the whizz, default 10.1), o.nozzleBulge 0..1, o.land, o.address { text (default 'boltplush.shop', in Nunito 600), pop 0..1 (the last letter pops in), caret 0..1, focus 0..1 (Qwik-blue ring), icon (false hides the tiny bolt) }. The address is lettering flushed into the paint layer right after the URL bar, so anything painted later covers it.

Auto land: towerSet and houseSet call landSet(t, o.land || {}) first when the view shows outdoors and landSet has not run for this frame and camera, so a scene may call a building set alone. Calling landSet first is only needed to pass it options.

tubeContents(t, items): draws things inside the tube; culled. Item forms: { kind: 'parcel' | 'envelope' | 'box', x (world x on the straight run) or s (arc length along the whole path from the funnel mouth, see SETS.tubeAt), scale, o (passed to props: parcel/jsBox anchored bottom-centre on the tube floor, envelope centred on it), box (jsBox kind), key, rot }, or { draw(x, floorY, p) } called in a local upright frame at the tube centre (floorY = tube floor on level runs, centred in the riser), or a function(SETS) for custom painting. Placeholders if props are missing.

tubeGlass(t, o): redraws every opaque front piece over the contents: glass fronts (edges, highlight streaks, rims), couplers, the dock deck, the tower's right wall section (hides things inside the wall) and its inner collar, the porthole's front ring, the stop band, the funnel horn (o.funnelGulp) and the spout (o.nozzleBulge). Call right after tubeContents, before snails/boxes/arms on the road, with the same gulp/bulge values as the set.

paperVoid(t): repaints the plain paper texture over the whole frame, inside or outside a camera.

SETS (added): K (palette), tubeAt(s) → { x, y, a } (point + tangent angle along funnel mouth → horn → riser → straight → elbow → nozzle mouth; extrapolates past both ends, so s > tubeLen continues out of the nozzle), tubeS(x) (arc length at world x on the straight run), tubeLen, path (sampled centre line), shelfSlot(kind) → [x0, y0, x1, y1] of a part on the parts shelves, nook { x0: 4995, x1: 5175, y: 226 }, horn { mouth: [1215, 600], r: 104 }, address { icon, text: [x, y], width(txt) } (the URL bar layout in world px), portholeFront() (redraws the porthole's front ring over a snail passing through), funnelFront(t, o) and nozzleFront(t, o) (redraw the horn / spout alone, to cover Bolt diving in or squeezing out).

Conventions kept: pure functions of t; every piece calls boilSeed('set <name>') and culls with cull(); lines boil gently (~1 screen px low-frequency wobble); LOD < .5 skips LEDs, icon ghosts, rivets, grain, some braces; line weights × zoom^-.5 at all zooms; long lines are chunked at ≤ 288 world px with the flat-pressure brush; the one big outlined shape (roof) is inked in chunks; wide fills use bleed .02, tex ≤ .5; sibling calls are typeof-guarded and try/caught with a one-time console warning and a placeholder.

Model-sheet loops in sets.js (Bolt at u 20 for scale via qwik() if loaded, else bolt()): setTower (serverMaster, 4 s: pipe rattle 1–1.85, header+hero go from the shelves onto the board at 2, funnel gulp 3.1–3.7), setLand (4 s: dockClose, travel zoom 1 pan, travel .55 pan, poster), setHouse (deskMaster, 4 s: page parts appear 0.2–1.7, clock whizz 1–2, heart cubby lights 2–2.4, spout bulge 3–3.6), setWorld (2 s: widest then poster). Test loops in test_sets.js: setsTubeZoom (.38→1.6 sweep), setsTubeGlass (contents + glass at 4 cameras), setsCast (sets with db, jsBox queue, snails, Bolt), setsCloseUps (zoom 1.6 spots), setsPaper, setsPerf.

### Requests
1. world.js longLine (shared): its last chunk can have exactly 2 points, and inkLine() with 2 points and curvature > 0 draws nothing (verified in a probe). Long lines lose their last ~20 px whenever the length is not a multiple of the chunk size; longRibbon edges inherit this. Fix: fold a short tail into the previous chunk, or pass curvature 0 when c.length === 2 (sets.js's own ink() helper does both).
2. page.js: drawBoard's easel top (mast and fitting at the board's top centre, about y 294) sits right under the lamp anchor WORLD.lamp [870, 250] (bulb bottom about y 272), so the pendant lamp reads as standing on the easel. Please end the mast at the board top or move the fitting off-centre, leaving ~50 px clear under the bulb. Also: drawBoard already draws the easel, so sets.js no longer does (only in its placeholder path).
3. studio.html (lead): load src/lib/props.js, page.js, cast.js, sets.js, schedule.js, fx.js after world.js, as in the spec.
4. Scene authors / schedule.js:
   - Call order: landSet (only if passing options) → building sets → tubeContents → tubeGlass (same funnelGulp/nozzleBulge as the set) → snails, boxes, arms and characters. tubeGlass repaints the tube's top edge, so anything already drawn on the road gets covered.
   - Road clearance: the dock deck face covers roadY..roadY+26 in front of the tube, and boxes stand at roadY. Couplers stick 5 px above the road. The big tower collar at x 1460 sticks 26 px up, but it is at the wall, just before the cart box.
   - House entry: snails enter through the porthole, whose opening spans y ≈ 105–331 at x 4380–4455. A snail carrying a box must stay below y ≈ 110 there. SETS.nook gives the napping ledge after delivery.
   - Funnel and nozzle: the funnel rim is at x 1215 (WORLD.funnel 1230 lands 15 px inside the bell). For B4, draw Bolt diving in, then SETS.funnelFront(t, o); for C1 squeezes, draw the thing, then SETS.nozzleFront(t, o).

### Perf
Measured with render.mjs on this machine (Apple M4 Pro, ANGLE Metal), full 1920×1080 frames, sets only unless noted (other artists were rendering at the same time, so ±30%):
- serverMaster: 150–200 ms (about 190 with the db and Bolt)
- deskMaster: 125–180 ms (up to about 310 with the full page, two snails, a box and Bolt)
- dockClose: 85–135 ms (up to about 290 with the six-box queue and two snails)
- travel zoom 1: 80–115 ms
- travel zoom .55: 165–320 ms (worst case; the land alone ≈ 130)
- poster: 185–245 ms
- widest: 190–210 ms
- close-ups at zoom 1.6: 50–140 ms

Why it stays cheap: big areas are washes (canvas fills, nearly free); only ~5 watercolour fills are visible at once (2–6 ms each); ink strokes cost ~0.2–1.5 ms each and are chunked and culled per piece; below zoom .5 the detail pieces are skipped.

### Known issues
- The watercolour texture on the wide bands (far/mid hills, near ground, meadow) is rebuilt from the visible area each frame, so its faint grain re-randomizes while the camera moves. It is low opacity and did not show in a pan strip, but it could shimmer on a very slow wide pan.
- Details pop on or off at the zoom-.5 LOD switch (LEDs, icon ghosts, rivets, braces, tuft density) during pull-backs, as the spec asks.
- Workshop glass: any cyan tint turns royal blue over the indigo wall (p5.brush mixes colours like pigment), so the riser uses a neutral lavender veil with light rims. It reads as a pale glassy tube, not clear glass.
- The foreground meadow band spans the full width, with tufts only between the buildings. At deskMaster its top shows as a thin green strip below the house plinth.
- tubeContents items stay upright (no rotation along the riser or elbows unless it.rot is given). A parcel wider than the nozzle mouth pokes out of the brass cone unless nozzleBulge is used.
- The outdoor and house glass runs join at x 4448, hidden under the porthole's front ring. The tube inside the tower's right wall (1380–1460) is hidden by the wall, so contents disappear there.
- Bolt in the model sheets is the plain emoji bolt() (no rig.js yet); scale was checked against it at u 20.
- page.js and props.js were still changing while I worked. The sets call drawBoard/drawPage/pagePart/icon/wallClock and have placeholders for when they are missing.

Sheets: out/lib_sets/final_setTower.jpg, out/lib_sets/final_setLand.jpg, out/lib_sets/final_setHouse.jpg, out/lib_sets/final_setWorld.jpg, out/lib_sets/final_widest.jpg, out/lib_sets/final_poster.jpg, out/lib_sets/final_serverMaster_cast.jpg, out/lib_sets/final_deskMaster_cast.jpg, out/lib_sets/final_dockClose_cast.jpg, out/lib_sets/final_tube_zoom.jpg, out/lib_sets/final_tube_contents.jpg, out/lib_sets/final_closeups.jpg

## props

Files: src/lib/props.js, src/lib/cast.js, src/lib/props_test.js, studio_lib_props.html

### API
GLOBALS published. props.js: PROPS, icon, jsBox, parcel, envelope, slip, clickSpark, alarmClock, wallClock, whistle, soundRings, poof, sparkle, confetti, speedLines. cast.js: CAST, snail, snailCarry (extra, see requests), db, cursorHand. Loops: LOOPS.propsSheet (in props.js), LOOPS.castSnail, LOOPS.castDb, LOOPS.castHand (in cast.js), all len 4. Every prop calls boilSeed('<name> <o.key>') per part and reseeds at the end, so culling never shifts another piece's boil. Pass o.key when one prop appears several times. Below lod() 0.5: no icons, stamps, labels, bows, LEDs, thumbnails, clock ticks or knuckle lines, and line weight is scaled by zoom^-0.5.

PROPS (constant object): colours (js #F7DF1E, jsDk, jsLid, html #E8763A, htmlDk, twine, cream, gold, goldLt, wax, waxDk, waxLt, brass, confetti[]), kinds ['menu','heart','star','share','gear','cart'], beatOff {kind: hop beat offset}, nominal sizes (box, parcel, envelope, slip). PROPS.util: {frame, at, thick, crescent, blobPts, puffPts, closeMid, glyphs, glyphWidth, dirVec, lineK, detailed, boltMark, tone, softShadow, texOK}. PROPS.sheet: {cell, floor, dark} (model-sheet helpers).

icon(kind, x, y, s, col = ink, o): centre (x, y), fits an s × s square, reads at 20 px. o.fill (fill colour plus an ink outline in col), o.hollow (outline only; heart and star only, the line icons stay solid), o.op, o.sw, o.rot, o.sx, o.sy, o.key.

jsBox(x, y, s, kind, o) → {top, mid}: bottom-centre, 65 × 57 at s = 1, lid, big ink icon, painted 'JS' stamp bottom-right. o.hop 0..1 (idle hop on the beat with a per-kind offset from PROPS.beatOff; o.beat overrides), o.wobble 0..1, o.lit 0..1 (warm glow() and lighter paint), o.squash (+ squash, − stretch), o.rot, o.noShadow, o.emote/emoteK/emoteAge (e.g. '!' popping by the lid), o.key.

parcel(x, y, s, o) → {top, mid, content: [x0, y0, x1, y1]}: bottom-centre, 84 × 52, string with bow, cream painted 'HTML' label. o.stretch 0..1 (stretches and skews with speed, o.dir ±1), o.unfold 0..1 (0–.3 the string snaps, .24–.62 the flaps open, .55–1 the paper falls away while the carried page part grows from the parcel into o.to), o.part (a pagePart kind or a list, drawn with page.js pagePart, with a painted placeholder fallback), o.to (world rect; defaults to the union of pageSlot() of the parts), o.squash, o.rot, o.noShadow, o.key.

envelope(x, y, s, o) → {seal}: centre, 80 × 52, cream with a purple wax seal stamped with the bolt. o.rot, o.squash, o.sx, o.sy (2D squash for the swap), o.flutter 0..1, o.lit 0..1, o.key.

slip(x, y, s, o) → {top, bottom}: centre, 62 × 86, curled request slip with a page-layout thumbnail (uses pagePart when the slip is big enough on screen; otherwise, or with o.thumb: 'simple', a painted thumbnail). o.curl 0..1 (rolled up from the bottom), o.pin (red pushpin), o.rot, o.flutter, o.sx, o.sy, o.key.

clickSpark(x, y, s, o): centre; gold 4-point star, ink outline, two orbiting mini zaps (bolt.js spark()), glow(). o.state: 'idle' (default), 'born' (backOut pop plus ink burst ticks over o.age s), 'held' (light only: two glows and five gold rays leaking out, starting at o.r0 px, default 18s; draw it over a closed fist), 'fly' (comet trail behind, o.dir ±1 or [dx, dy], o.trail px). o.age, o.k (strength 0..1), o.key.

alarmClock(x, y, s, o) → {top, face}: bottom-centre between the feet, red body, twin brass bells, hammer, face, legs. o.ring 0..1 (hops on the beat, shakes on 24 fps flips, the hammer rattles, ink ring marks), o.squash 0..0.9 (slapped flat), o.time (hours, default 7), o.rot, o.key.

wallClock(x, y, s, o): centre, wooden rim, r ≈ 58. o.whizz: hours of time passing (0→1 = the minute hand goes round once); motion-blur fan automatically for 0 < whizz < 1, or set o.blur; o.time (hours, default 10.1), o.key.

whistle(x, y, s, o) → {hole, tip}: (x, y) = the mouthpiece tip (put it at Bolt's mouth); about 1.5× the old size, brass with a purple cord. o.dir −1 (default: barrel points left) / 1, o.rot, o.blow 0..1 (buzz and puffs), o.key.

soundRings(x, y, k, dir = −1, o): a packet of three cream painted crescents; (x, y) = the lead ring's front; k 0..1 grows the rings in one by one (scale k back down to fade); dir ±1 or [dx, dy]. o.s (size), o.key.

poof(x, y, s, age, o): life o.life (default .7): burst ticks, then the puffs spread, shrink and fade. o.key.
sparkle(x, y, s, age, o): life .85: a central flash star plus six gold and white twinkle stars. o.key.
confetti(x, y, s, age, seed, o): life 1.8: burst of paper bits that flutter down with drag (Qwik palette, some curls). o.n (count, default 16).
speedLines(x, y, len, dir = 1, k = 1, o): dry-brush plus fine ink motion lines trailing behind (x, y); dir is the direction of motion. o.spread (px across, default 40), o.col, o.key.

snail(x, y, u, o) → {carry, head, eyes: [far, near], top}: (x, y) = foot on the road, faces right (o.flip faces left), about 94 px long at u = 20. o.shell 'blue' | 'purple' | 'teal' | hex (saturated, dark ink spiral and highlight), o.crawl (phase in cycles: foot ripple, body reach and tail lag, shell bob), o.carry (jsBox kind riding on the shell; o.box = extra jsBox options, o.carryS = scale, default u/20), o.duck 0..1 (stalks pull in, eyes squeeze, it squashes), o.hide 0..1 (body retracts, then the eyes peek from the shell mouth), o.sweat 0..1 (sweat emote plus drip), o.droop 0..1 (tired stalks; default .6 with sleepy/closed eyes), o.eyes (kit eye names inside round eyeballs; normal/look/wide get custom pupils), o.lookX, o.lookY, o.squint, o.mouth (kit mouths), o.blush, o.seed (blinks), o.emote/emoteK/emoteAge, o.trail (px of slime trail), o.sq, o.dy, o.rot (feel() bounce is damped ×.3 and ×.5), o.noShadow, o.boilKey.
snailCarry(x, y, u, o) → [x, y]: where a box sits on the shell for the same {crawl, duck, hide, sq, flip, dy, rot}, without drawing.

db(x, y, u, o) → {mouth, top, hand, envelope, bubble: [x, y, r] | null}: bottom-centre on the floor, 220 × 240 at u = 20 including the nightcap. Squat cylinder with three seam stripes, three LEDs and vents, stubby mitten arms, a floppy striped nightcap with a pom-pom. Accepts feel()/emotions() output (eyes, mouth, lookX, squint, blush, emote, sq, rot, dx, dy, aL, aR). o.snore 0..1 (bubble size), o.pop 0..1 (bursts it: flash ring, shreds, droplets; aim a poke at the returned bubble), o.smack 0..1 (lip smacking: mouth cycles, small squash), o.roll 0..1 (turns away through drawn views front→q→side→qback→back with a body rock; the nightcap flips over; o.rollDir −1 left / 1 right), o.cough 0..1 (0–.34 inhale: stretches tall and trembles; .34–.5 blast: big squash; the envelope pops out of the mouth and arcs to o.coughTo (world point), with a puff and the cap jumping; o.coughEnvelope: false = draw it yourself from the returned envelope point; o.envS = envelope scale), o.slap 0..1 (o.slapDir ±1: wind-up, stretched swat with whoosh lines and an impact star; returns hand), o.dim 0..1 (body darkens toward night, LEDs off), o.capUp 0..1 (the cap stands up: takes), o.cap 0 (no cap), o.boilKey.

cursorHand(x, y, s, o) → {tip, palm, thumb}: (x, y) = the index fingertip, about 220 px tall at s = 1, classic white glove with back stitches, cuff and ink outline. o.pose 'point' | 'press' | 'thumb' | 'wave' | 'drum'; o.press 0..1 (for 'press', default 1: the finger squashes and widens, the hand pushes toward the tip, tick marks); o.phase (drum taps / wave sway in cycles, default T·2); o.from + o.k 0..1 morph from another pose through drawn in-betweens (all poses share one finger model, so point→thumb, point→wave and press work); o.shadow: [dx, dy, k] (soft shadow on the page, textured when big on screen); o.rot (about the fingertip), o.flip, o.sq, o.key / o.boilKey.

Extras: CAST (shell colours, snail/db/glove palettes, CAST.snailCarry).

### Requests
1) LIBRARY_SPEC.md: schedule.js calls a global snailCarry(x, y, U, {crawl, duck, hide, sq}), so cast.js publishes `snailCarry` as a global in addition to the spec's names (also on CAST.snailCarry). Please add it to the spec's name list, or have schedule.js call CAST.snailCarry. 2) Load order matters: cast.js reads PROPS.util when it loads, so it must load after props.js. The spec order (props, page, cast) already does this. Keep it. 3) Rig owner: clickSpark({state: 'held'}) only paints the light leaking out. Draw the closed fist first, then the held spark at the fist centre with o.r0 ≈ the fist's radius. 4) Scenes: for whistle(), put (x, y) at Bolt's mouth; soundRings(x, y, k, dir) moves only by its (x, y), so animate x for the flight. For db's cough into the funnel, pass coughTo: WORLD.funnel; tubeGlass() draws the horn over the envelope. To poke the bubble, aim at the returned db().bubble. 5) No changes needed in shared files.

### Perf
Measured on this machine, at full 1920×1080. Model sheets: propsSheet 70–300 ms/frame (300 only during the confetti burst), castSnail 120–176 ms, castDb 140–260 ms, castHand 85–140 ms. Real context (towerSet/landSet/houseSet + tubeGlass + schedule + my cast at the spec cameras): 65–333 ms/frame. Per element: snail ≈ 2–4 ms (4–5 with a box), jsBox ≈ 1–2 ms, parcel ≈ 2–3 ms, cursorHand ≈ 6–8 ms, db ≈ 20–35 ms (the striped nightcap and glows; there is only one db), glow ≈ 1 ms. The big win: p5.brush textured fill() costs about 3 ms per shape whatever its size, so every small shading patch now uses flat washes through PROPS.util.tone(), with texture only when a shape is large on screen (texOK). That took the props sheet from 512 to ~110 ms with no visible loss. One code comment marks this trap.

### Known issues
- No camera-zoom compensation above zoom 1. At zoom ≥ 2 outlines get heavy (the kit's sw is in world units), which matches how Bolt behaves. At 1.3–1.6 they look right.
- cursorHand: a slow point→thumb morph shows a 'V' in-between frame (index and thumb both up). Keep o.k transitions short (≤ .3 s).
- db: at roll ≈ 1 it shows its back (no face), so the snore bubble and the cough envelope are skipped in that view by design. The bubble sits beside the mouth and moves with the face during the roll.
- Parcel unfold and slip thumbnails draw page parts through page.js pagePart(kind, x, y, w, h, o) with (x, y) = top-left. If that signature changes, they fall back to painted placeholders, with no error.
- Hollow icons apply only to heart and star; the line icons (menu, share, gear, cart) stay solid in hollow mode because outlines clog at small sizes.
- The castDb sheet uses cursorHand as a stand-in for Bolt's poking finger, and every sheet shows plain bolt() (falling back from qwik()), because src/rig.js does not exist yet; I tested the held spark on rig A's fist.
- Effects (poof, sparkle, confetti) return nothing and draw nothing outside 0..life. The scene owns their timing.

Sheets: out/lib_props/propsSheet.jpg, out/lib_props/propsSheet_motion.jpg, out/lib_props/castSnail.jpg, out/lib_props/castSnail_motion.jpg, out/lib_props/castDb.jpg, out/lib_props/castDb_motion.jpg, out/lib_props/castHand.jpg, out/lib_props/castHand_motion.jpg, out/lib_props/strip_snail_crawl.jpg, out/lib_props/strip_db_poke_pop.jpg, out/lib_props/strip_db_roll.jpg, out/lib_props/strip_db_alarm_slap.jpg, out/lib_props/strip_db_cough.jpg, out/lib_props/strip_hand_press.jpg, out/lib_props/strip_hand_press_loop.jpg, out/lib_props/strip_hand_thumb.jpg, out/lib_props/context_in_sets.jpg, out/lib_props/context_dock_zoom1.3.jpg, out/lib_props/context_click_desk.jpg, out/lib_props/context_in_tube.jpg, out/lib_props/context_whistle.jpg, out/lib_props/context_duck_poster0.5.jpg, out/lib_props/icons_at_20px_x3.jpg, out/lib_props/sizes_u20.jpg, out/lib_props/close_zoom2.5.jpg

## page

Files: src/lib/page.js, src/lib/schedule.js, src/lib/fx.js, src/lib/lib_page_test.js, studio_lib_page.html, out/lib_page/tools/finals.sh

### API
PAGE.JS (globals: PAGE, pagePart, drawPage, drawBoard, pageSlot, boardSlot, qwikPlush)
- PAGE: page palette, PAGE.kinds, PAGE.h = reference part heights {header 50, hero 110, card 120, skeleton 70, reviews 70, footer 40}.
- pagePart(kind, x, y, w, h, o): (x, y) is the top-left corner. Kinds:
  - header: ☰, Qwik logo, name bars, nav bars, cart with a red badge.
  - hero: a painted landscape banner with a Qwik-bolt kite and a headline panel.
  - card: Qwik-plush thumbnail, text bars, price, round ♥ button, purple 🛒 pill.
  - skeleton: a grey card with a sweeping shimmer.
  - reviews: two avatars, ★★★★★ and text bars.
  - footer: a dark purple strip.
  Any size or aspect works; it simplifies by on-screen height (mini/mid/full) and follows lod(). Buttons are anchored from the right edge in page px, so on the page they land exactly on likeBtn [5620,690] r22, cartBtn [5790,690] 170×46 and headerCart [5850,445].
  o.k 0..1: appear. Wide bands unfold (height bounce, no spill past the window); square-ish parts pop.
  o.badge (header): a number. A fractional value ticks n→n+1: squash, digit swap at .4, overshoot and rays. The digit is painted, so it sits in the paint layer and follows transforms. Example: badge: seg(t, 51.4, 51.8).
  o.liked 0..1: the red heart grows in with burst ticks. o.press 0..1: squash. o.lit 0..1: the cart icon turns gold with a glow.
  o.pop 0..1 (reviews): the stars pop one by one. o.ghost 0..1: faded tones. Also o.detail (LOD multiplier), o.t and o.key.
- drawPage(state) = { parts:{header,hero,card,skeleton,reviews,footer: 0..1}, badge (default 0), liked, cartPress, cartLit, swap, handShadow:[x,y,k], t }.
  - It paints the lavender page below the title bar (y 410–858) inside WORLD.window; houseSet draws the frame and title bar.
  - swap 0..1: a slot-wide cartoon cloud bursts from the centre and fully covers the slot by .4; skeleton→reviews happens at .45; the stars pop .5–.95; sparkles after .78.
  - handShadow: [x, y] is the fingertip; the soft shadow falls down-right.
- drawBoard(state) = { parts, ghost:{kind:0..1}, tick:{kind:0..1}, leave:{kind:0..1}, leaveTo, slip 0..1, easel, t }.
  - Draws the whole easel in the sets' wood colours: back legs, board with a browser strip and dashed empty slots, ledge, top clamp. towerSet now delegates to it. easel:false draws the board only.
  - leave: the part lifts, stretches and shrinks into WORLD.funnel (or leaveTo). tick: a green check that draws on. slip: props' slip pinned at the top-right corner.
- pageSlot(kind) / boardSlot(kind) → [x0,y0,x1,y1]. The skeleton uses the reviews band. The board maps the window rect linearly onto WORLD.board.
- qwikPlush(x, y, s, o{rot, key}): the product plush (centre; s = height in px), for E7's plush hop to the header cart.
- LOOPS.pageSheet (len 11) and LOOPS.boardSheet (len 8) use houseSet/towerSet when present.

SCHEDULE.JS (globals: QUEUE, box, snailAt, drawQueue, drawSnails, plus helpers netTime, clockWhizz, reachX)
- box(kind, t) → { kind, where, x, y, snail, hop, leap, wobble, rot, squash, emote, emoteK, emoteAge }.
  - x, y is jsBox's bottom centre. hop is a 0..1 amplitude for jsBox's own beat hop.
  - where = 'line': on the dock deck at queueX/roadY; boxes wake and perk up front→back from 28.0. It also covers the arc leap onto the snail (leave → go), with an anticipation squash.
  - where = 'snail': the snailCarry() point (snail() draws the carried box).
  - where = 'arm': cart only, 46.0–47.0. Held at the line, yanked 46.5 on an arc over ⚙, plonked on s5 at 47.0. ⚙ wobbles with a "!" 46.5–47.1.
  - where = 'bolt': a default arc from the shell to the cubby between grab+.1 and cubby. Bolt's hand should follow or override it.
  - where = 'cubby': the bottom centre inside its cubby.
  Table times match exactly: leaves the line 30.0 / 30.25 / 32.25 / 32.5 / 46.0 / 48.5; cubbies 33.0 / 33.5 / 49.0 / 56.0 / 51.0 / 56.5.
- snailAt(id, t) → { x, y, visible, carry, crawl (cycles, ∝ distance), duck, hide, look (lookX), lookY, eyes, mouth, sweat, droop, emote, sq, shell, seed, nook }.
  - Rank: front 2140 / back 2030. s1 and s2 nap there from 0 and wake at 28.1 / 28.35; s3 and s4 appear at 32.0; s5 and s6 at 38.0 (both off screen).
  - Arrivals: s1 at 4640 at 32.25, s2 at 4535 (queued behind) at 32.5, s3 at 48.5, s5 at 4535 at 49.75 (behind ★, which rests at the stop until 49.5), s4 at 55.5, s6 at 4535 at 56.0.
  - Pace: 128 px/s for all but the slowpoke s4 (80 px/s; it naps 6 s of network time off screen). E5 x: ★ 3571→4071, ↗ 2902→3215.
  - After unloading, each snail crawls to SETS.nook and settles asleep in a 3-2-1 pile on the ledge.
  - At 31.9 s1 is at x 2301 (tail ≈ 2255), leaving D2; at 32.0 it enters D3 at 4429 through the porthole.
- drawQueue(t, {where}) (default ['line']; add 'cubby', 'arm', 'bolt'); drawSnails(t, filter) (ids array or (id, state) → bool). Both cull off-screen, draw through jsBox/snail, and have placeholders.
- netTime(t): network time. Skips at 32.0 and 48.0; clock-whizz lapses 32.0–32.25 and 48.75–49.45.
- clockWhizz(t): 0..1, one hand revolution per whizz (31.95–32.5 and 48.3–49.4). Pass it to houseSet({clockWhizz}).
- reachX(t): the stretched hand's world x in E5 (43.5–48, otherwise null). Ducks are timed to it: ★ ~44.3, ↗ ~44.8, then ~47.6–47.8 on the snap back.
- LOOPS.scheduleDebug: loop time = video time, len 60. Chart of world x across and time down, with shot bands, camera ranges, skips, whizzes, the reach and px/s labels, plus two live road strips painted with the real snails and boxes.

FX.JS (globals: CAPTIONS, drawOverlay, titleCard, endCard, whip, paperOver, irisTo)
- CAPTIONS: [{n, t0, t1, text}], texts and times from STORYBOARD.md. n: null draws the caption without a step badge (the intro's).
- drawOverlay(t): bottom-left (badge at 82,990; 48 px text). On the beat, a dark painted swash is laid left→right. A purple step badge pops. Cream Permanent Marker letters with ink outline and shadow pop in just behind the brush head, with a slight per-letter boil. Everything wipes out left→right over the last .42 s.
- titleCard(t, x, y, k): (x, y) = the block's left edge, vertical centre. "Qwik" 3.0 (small, purple), "JavaScript" 3.5 (blue), "Streaming" 3.75 (purple), underline 4.05. Draw it under A2's camera to ride the whip. k fades.
- endCard(t, x, y, k): "Qwik" 62.0 (big, purple), "JavaScript Streaming" 62.5 (blue), "qwik.dev" 63.0 (deep purple) plus underline. Use k = 1 - seg(t, 65.5, 66) for the fade.
- whip(p, dir = -1, cols = [paper, indigo]): dir = the camera's pan direction; the streaks travel opposite. Textured bands with ragged brush ends; full cover at .5.
- paperOver(p, cx, cy, {hole = 150}): paper closes from top and bottom first (the tube band last), then from the sides, to a ragged hole of radius `hole` (screen px) with brush tips.
- irisTo(p, cx, cy, col = ink): closes 0→.5, opens .5→1.
- All three transitions call flushLetters() first, so earlier lettering sits under them. LOOPS.fxSheet has len 12.

TEST FILE src/lib/lib_page_test.js: LOOPS.pageParts (labelled parts sheet), schedWorld (the schedule inside the real sets and cameras), capProbe, schedCheck (prints continuity, arrival and E5 numbers through console.warn), pageZoom (LOD at 0.55 / 0.5 / 0.38).

### Requests
1. Tell the lead: p5's global mode binds its own 3D `box()` over `window.box` when the instance starts, which silently breaks the spec's `box(kind, t)` (it returns the p5 instance). schedule.js fixes this by setting `p5.prototype.box = box` at load, so p5 binds ours; p5's 3D box is gone, which the no-3D kit rule allows. If the lead prefers a clean namespace, rename it to `boxAt` in LIBRARY_SPEC.
2. Scene animators D3, E1–E7 and F1 (browser.js, click.js, payoff.js):
   - After houseSet, call drawQueue(t, { where: ['cubby'] }) for the shelved boxes (houseSet only draws the empty or lit cubbies) and drawSnails(t) for the road and the nook pile.
   - Derive houseSet's cubbyLit from box(kind, t).where === 'cubby' (with whatever glow fade they want), and pass clockWhizz: clockWhizz(t).
   - During each 'bolt' phase, drive Bolt's hand from box(kind, t).x/y, or override it.
3. network.js (E5): drive the stretched arm's tip x with reachX(t), or send me their arm timing so the ★/↗ ducks line up. For D2, the camera's right edge must be left of about x 2255 at 31.9 for the ☰ snail to have left the frame at the cut.
4. bookends.js (G1): at zoom 0.38, call paperOver(p, bx, by, { hole: ~90 }) with Bolt's screen point. Use titleCard/endCard k for fades.
5. sets.js: nothing required. schedule.js reads SETS.nook, so please keep that field. drawBoard owns the whole easel now, which matches the current towerSet (it delegates to drawBoard when present).

### Perf
Measured ms per 1920×1080 frame on this machine, all with the real sets:
- pageSheet (houseSet + drawPage + Bolt): 103–229 ms, including the swap cloud and glow frames.
- boardSheet (towerSet + drawBoard): 128–314 ms.
- schedWorld (land, tower and house sets + drawQueue + drawSnails; the poster frame draws all three sets): 79–260 ms.
- scheduleDebug (chart + two strips): 31–68 ms.
- fxSheet: 13–59 ms. The caption overlay alone is under 10 ms; whip, paperOver and iris add 15–45 ms.
- pageParts model sheet (about 25 parts at four sizes plus three plushes): 238 ms.
Every frame is well under the ~600 ms budget.

### Known issues
- Time-lapse zips on screen, which the table forces (★ and the cart snail share one pace, so network time must jump during the clock whizzes):
  - D3 32.0–32.25: s1 and s2 come in through the porthole at up to 68 px/frame, decelerating.
  - E6 about 49.17–49.5: the cart snail enters at up to 87 px/frame and winds down to a crawl before 49.75.
  Every other on-screen snail motion is ≤ 6 px/frame, and all overtaking (the cart snail past the slowpoke) happens off screen.
- s3/s4 appear at the rank at 32.0 and s5/s6 at 38.0, both off screen.
- s4 and s6 are still crawling to the nook at 58.5; they settle around 60.4 and 62, tiny in G1.
- 'bolt'-phase boxes follow a default arc until Bolt's hand drives them.
- There is no src/rig.js yet, so the sheets use the bolt() emoji as the u = 20 stand-in; they switch to qwik() automatically.
- The board's header shows the same "0" badge as the page.
- The caption band covers roughly the bottom-left 1100×70 px while a caption is up.
- The E5 duck timing assumes reachX; if network.js uses a different arm timing, the ducks will be off until it is synced.
- Iteration images are kept in out/lib_page/iterations/. out/lib_page/tools/finals.sh regenerates every final sheet.

Sheets: out/lib_page/page_sheet.jpg, out/lib_page/page_detail.jpg, out/lib_page/page_full.jpg, out/lib_page/page_parts.jpg, out/lib_page/page_zoom.jpg, out/lib_page/board_sheet.jpg, out/lib_page/board_detail.jpg, out/lib_page/fx_sheet.jpg, out/lib_page/fx_caption_strip.jpg, out/lib_page/fx_cards_detail.jpg, out/lib_page/schedule_debug.jpg, out/lib_page/schedule_chart.jpg, out/lib_page/schedule_world.jpg
