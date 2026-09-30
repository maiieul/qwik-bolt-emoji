# JavaScript Streaming — storyboard (v2)

**Logline.** Bolt, the Qwik mascot, builds a web page on the server and streams it to the browser in pieces, the slow
part last and out of order. Then it streams the page's JavaScript in the background, over a slow network. A click on
code that's already here runs at once. A click on code that isn't here yet: Bolt holds on to the click, its rubber arm
shoots all the way back down the line, and that code leaves first. The click goes through, and the rest keeps
streaming.

**Length.** 66 s, 1920×1080, 24 fps, 120 BPM (beat 0.5 s, bar 2 s, offset 0). Hits land on beats.

**Audience.** Web developers who may not know Qwik, watching once, maybe with the sound off.

The world layout, props and every shared API are in [LIBRARY_SPEC.md](LIBRARY_SPEC.md). How Qwik really does it is in
[RESEARCH.md](RESEARCH.md).

## What each picture means

| picture | the real thing |
|---|---|
| Bolt working in a workshop inside a server tower | server-side rendering (SSR) |
| a paper slip from a small brass pipe, with a thumbnail of the page | the HTTP request |
| page parts (header, hero, product card, reviews, footer) snapped onto a page-shaped board | components rendered to HTML |
| the funnel sucking what's on the board into an orange `HTML` parcel, which slides off down the glass tube | the HTML is flushed in chunks while rendering goes on |
| Bolt sending what it has, right before waiting on the database | Qwik flushes before it waits on async work |
| the sleeping database; Bolt drops a grey skeleton card in the reviews slot and carries on with the footer | a `<Pending>` boundary: its fallback streams first and the rest of the page keeps streaming |
| later the database wakes and coughs a sealed envelope into the funnel; at the browser it swaps into the grey card's slot | out-of-order streaming: a `<template>` arrives later and a tiny script swaps it in |
| the glass tube over the hills from the server tower to the house | the network |
| the browser window filling up as parcels land | the browser showing HTML as it streams in |
| Bolt, arriving with the HTML and staying by the page | qwikloader: a tiny script at the top of the page that catches events from the first chunk on |
| yellow `JS` boxes, each with the icon of what it powers (☰ menu, ♥ like, ★ rate, ↗ share, ⚙ settings, 🛒 cart) | JavaScript segments, one per interaction |
| Bolt's whistle, then the boxes leaving the dock in line order, most likely first | after the page loads and goes idle, the preloader asks for the likeliest code first |
| snails carrying one box each on top of the tube, two at a time | background preloads, a few in flight at a time, on a slow network |
| Bolt shelving each box, shut, in its cubby; the cubby glows | the module is fetched and ready, but nothing runs and nothing on the page changes |
| the big white cursor hand | the user |
| a click popping out as a gold spark that Bolt catches | qwikloader catches the event |
| Bolt checks the cubby: full → flicks the spark into the button, it works at once | buffered code runs right away |
| Bolt checks the cubby: empty → keeps the spark in its fist | qwikloader holds on to the event until the code arrives |
| Bolt's arm stretching back down the whole line, pulling the cart box out from behind ⚙ and sending it now, past the two-at-a-time limit | the clicked code is requested right away, ahead of the idle queue |
| the cart snail crawls at the same pace as the others; the wall clock spins while Bolt waits | the network is no faster; the code just started sooner |
| Bolt shelves the cart box, lets the spark go into the button, the header badge ticks 0 → 1 | the handler runs with the original event |
| the other snails, which never stopped, bring the rest | preloading carries on |

Not in the video, on purpose: state serialization, vnode data, the bundle graph, numbers. Never the word "hydration".
Out-of-order streaming (`<Pending>`) is experimental in Qwik v2; the video shows it as the user asked, without a label.

## World and look

- **Handmade watercolour and ink** with the kit (`ANIMATION_GUIDE.md`), like a picture book.
- **One line through three places:** the server tower (left, night indigo, one warm lamp), the tube over rolling hills
  (middle, pale warm sky), the house with the desk and the browser (right, dusty-lilac wallpaper, warm wood desk).
  Everything flows left → right: server → tube → shelf → Bolt → page → the user's hand. Screen direction never flips.
- **Colours.** HTML parcels orange `#E8763A` with a cream `HTML` stamp. JS boxes yellow `#F7DF1E` with a big ink icon and
  a small `JS` stamp. The page: faint lavender with Qwik purple `#AC7EF4` and blue `#18B6F6` accents. The click spark:
  gold with an ink outline and two orbiting mini zaps.
- **Motif: the cart icon.** On the product card's button, on its JS box, on its cubby, on the header badge.
- **The stretch grows each time:** the limbs pop out in A1 (arms unroll to 2× and snap back), the yawn in D1 (3×), the
  lazy shelving reach in D3, then ~35× in E5. The long arm is also the last limb to pull in at the end.
- **Bolt's arc:** proud builder → cool buffer-keeper → caught out → heroic stretch → relieved and cool again. It ends as
  the logo it started as, and winks.

## Lettering

Painted in the kit's marker font through the shared caption overlay (`LIBRARY_SPEC.md`), never over a key read. Stamps
on props (`HTML`, `JS`), the badge digit and the review stars are the only other marks.

| when | text |
|---|---|
| 3.0 / 3.5 → 5.3 | small "Qwik", then **JavaScript Streaming** |
| 6.5 → 14.8 | 1 · The server renders the page |
| 15.5 → 25.5 | 2 · HTML arrives in pieces, slow parts last |
| 28.5 → 34.6 | 3 · JavaScript streams in the background |
| 42.0 → 53.6 | 4 · A click? Its code jumps the queue |
| 54.5 → 58.3 | 5 · …and the rest keeps streaming |
| 62.0 / 62.5 / 63.0 → 65.5 | **Qwik** · JavaScript Streaming · qwik.dev |

## Shots

Times are video seconds. Reads are what the viewer must understand, in order. Seams between scene files are listed in
LIBRARY_SPEC.md.

### A · Title (0.0–6.0) · paper void · `bookends.js`

- **A1 0.0–3.0 · The logo wakes up.** An ink line draws the bolt outline (0.0–0.8), the white fill rises from the tip
  (0.8–1.2), the purple copy slides in on 1.0 and the blue on 1.5. 1.5–2.0: a squint, the face opens happy. 2.0: *boing*,
  the legs spring out (`legLen` 0 → 1.25 → 1) and it pops up onto its feet; the arms unroll to 2× and snap back
  (2.0–3.0).
  - reads: 0.0–1.4 the Qwik logo · 1.5–2.0 it's alive · 2.0–3.0 long rubber limbs
- **A2 3.0–6.0 · Title.** "Qwik" pops at 3.0 and **JavaScript Streaming** at 3.5, to Bolt's right; Bolt presents them
  with a sweep of the arm (proud). Read until 5.0. Crouch 5.0, dash left 5.5; whip left 5.5–6.0, the title sliding out
  with the camera.

### B · The server renders the page (6.0–15.5) · the tower · `server.js`

- **B1 6.0–9.0 · The request.** Bolt skids in from the right to its mark (6.0–6.5). 6.5–8.0: the viewer takes in the
  workshop (the board, the shelves of parts, the database asleep in the corner, the funnel) while Bolt looks round;
  caption 1 at 6.5. The brass pipe rattles at 7.75 and the slip shoots out at 8.0. Bolt catches it and looks at it (it
  shows a thumbnail of the page), turns determined, pins it to the board's corner (8.0–9.0).
- **B2 9.0–11.5 · Build and stream.** Bolt's arms zip to the shelves: the header slaps onto the board at 9.0, the hero
  at 9.5. At 10.0 the funnel's hose sucks both off the board as one orange `HTML` parcel that slides off along the
  tube (the slots keep a faint ghost and a tick). Hold on the half-sent board until 10.75. The product card (a Qwik
  plush, a ♥ button, a purple 🛒 button) lands at 11.0.
  - reads: 9.0–10.0 Bolt builds the page from parts · 10.0–10.75 finished parts leave before the page is done
- **B3 11.5–15.0 · The slow part.** Bolt reaches toward the database for the reviews (11.5); it's asleep, snore bubble
  growing (11.5–12.5). Bolt pokes it: the bubble pops, it smacks its lips and rolls over (12.5–13.0). Bolt shrugs,
  sends what's on the board (the card, 13.0), slaps a grey skeleton card into the reviews slot (13.5), sends it, slaps
  the footer (14.25) and sends it (14.5). Bolt eyes the funnel (14.5–15.0).
  - reads: 11.5–13.0 the database is too slow · 13.0–14.0 Bolt sends what it has and a placeholder · 14.0–15.0 and
    carries on
- **B4 15.0–15.5** Bolt dives into the funnel, stretched thin (cut on action into C0).

### C · HTML arrives in pieces (15.5–26.0) · the tube, then the house

- **C0 15.5–17.0 · Travel** (`network.js`). Outside the tower wall, the camera pulls out to zoom ~0.55 so the tower,
  the hills and the house read together; the parcels slide along inside the tube at a steady pace, strung out, and
  Bolt slides behind them. Caption 2 at 15.5. Cut on action at the house porthole.
- **C1 17.0–20.5 · The page appears** (`browser.js`). Desk master. The parcels pop out of the nozzle on beats and
  unfold into the window: header + hero (17.0, the header's cart badge shows a readable **0**), card (17.5), skeleton
  (18.0), footer (18.5). Bolt squeezes out of the nozzle like toothpaste (19.0), springs back into shape and lands on
  the desk (19.5). Hold on the page with its grey card (19.5–20.5).
  - reads: 17.0–19.0 the page builds up as parcels land · 19.0–19.5 Bolt arrives too · 19.5–20.5 one part is still grey
- **C2 20.5–22.5 · Meanwhile** (`server.js`). An iris closes on the grey card and opens on the tower: an alarm clock
  rings and hops, the database jolts awake, slaps the clock, and coughs a sealed envelope (purple wax seal with the
  bolt) into the funnel.
  - reads: 20.6–21.4 the database wakes up · 21.4–22.4 the reviews leave, sealed
- **C3 22.5–26.0 · Out of order** (`browser.js`). Iris opens back on the desk. Bolt taps its foot by the page; the
  envelope pops out of the nozzle (22.75); Bolt catches it and slides it into the grey card's slot (23.25–23.75); a poof
  hides the swap and the reviews (★★★★★) appear with a sparkle (24.0). Hold on the complete page (24.5–26.0); Bolt
  proud.
  - reads: 22.7–23.2 the envelope arrives · 23.2–24.2 it swaps into the grey slot · 24.2–26.0 the page is complete

### D · JavaScript streams in the background (26.0–35.0)

- **D1 26.0–28.0 · Quiet** (`browser.js`). Bolt yawns and stretches its arms comically long (26.0–27.0), then blows a
  whistle toward the tube (27.0–27.75); painted sound rings fly off left. Cut on action as they leave the frame.
  - reads: 26.0–27.0 the page is done, Bolt is idle · 27.0–28.0 Bolt calls for the code
- **D2 28.0–32.0 · The line** (`network.js`). Dock close-up at the server end. The rings arrive; the yellow JS boxes in
  line perk up, hopping on offset beats: ☰ ♥ ★ ↗ ⚙ 🛒, front to back. Snails nap beside them and wake. Caption 3 at
  28.5; hold on the line (28.5–30.0). Two snails take ☰ and ♥ and crawl off right (30.0–30.5). The camera eases down
  the line and stops on 🛒, last, hopping (30.5–31.5). Cut on action as the ☰ snail leaves frame right (31.9).
  - reads: 28.5–30.0 a line of code boxes, one per icon · 30.0–30.5 snails carry them off · 30.5–31.5 the cart box is
    last in line
- **D3 32.0–35.0 · Shelving** (`browser.js`). Desk master; the wall clock's hands whizz round once (time passes). The
  ☰ snail and the ♥ snail crawl in to the stop (32.0–32.5). Bolt lifts ☰ into its cubby (32.5–33.0; the cubby glows),
  then ♥ with a lazy long reach, without looking (33.0–33.5). Nothing on the page changes. Bolt leans on the shelf,
  shades on, music notes (33.5–35.0). ★ ↗ ⚙ 🛒 cubbies are still empty.

### E · A click? (35.0–54.0)

- **E1 35.0–38.0 · The fast click** (`click.js`). The cursor hand glides in from the top right to the ♥ button
  (35.0–36.0) and clicks (36.0): a gold spark pops out; Bolt, shades still on, catches it (36.3), glances at the ♥
  cubby (full, it glows, 36.5) and flicks the spark into the button: the heart fills red at once (37.0). Hold
  (37.0–38.0).
  - reads: 35.0–36.0 the user goes for the like button · 36.0–36.5 click, caught · 36.5–37.0 its code is on the shelf ·
    37.0–38.0 it works at once
- **E2 38.0–40.0 · Next.** The hand moves on to the purple cart button and hovers (38.0–38.8); Bolt peeks over its
  shades at it (38.8–40.0).
- **E3 40.0–42.0 · Not here!** The finger presses (40.0), the button squashes, a spark pops out and Bolt catches it in
  its right fist (40.3). Push in as Bolt glances at the cart cubby: empty (40.5–41.3). Take, "!", the shades fly up onto
  its head (41.3–42.0).
  - reads: 40.0–40.4 click, caught · 40.5–41.3 the cart cubby is empty · 41.3–42.0 uh-oh
- **E4 42.0–44.0 · The thought.** Hold on the glowing fist, light leaking between the fingers, while Bolt looks from it
  up the tube (42.0–43.0); caption 4 at 42.0. Wind-up (43.0–43.5), determined; the free left arm shoots out of frame
  left (43.5–44.0), cut on action.
- **E5 44.0–48.0 · The stretch** (`network.js`). The camera races along the hand, pulling out to the poster frame
  (zoom ~0.5) that holds the whole arm, from Bolt braced at the right edge to the dock (44.0–45.5). The ★ and ↗ snails
  on the road duck as the arm whooshes over. Push in on the dock (45.5–46.0): the hand passes ⚙ and grabs 🛒 (46.0–46.5),
  yanks it out, ⚙ wobbles with a "!" (46.5–47.0), and plonks it on a fresh snail that sets off at once, ahead of ⚙
  (47.0–47.5). The arm snaps back out of frame right with a doorstop-spring wobble (47.5–48.0).
  - reads: 44.0–45.5 the arm goes all the way back · 46.0–46.5 it grabs the cart box · 46.5–47.5 the cart box leaves
    now, ahead of the line
- **E6 48.0–50.5 · The wait** (`payoff.js`). Desk: the wall clock whizzes (time passes). Bolt taps its foot, cheeks
  puffed, the spark wriggling in its fist; the user's finger drums on the button. The ★ snail arrives and Bolt shelves ★
  one-handed without looking (48.5–49.0). The cart snail crawls in, sweating (49.5–50.0).
  - reads: 48.0–49.0 Bolt waits, holding the click; the other code still arrives · 49.5–50.5 the cart code is here
- **E7 50.5–54.0 · It works.** Bolt lifts the cart box into its cubby (50.5–51.0): the cubby lights and the button's cart
  icon lights to match. The fist opens and the spark arcs into the cart button (51.0–51.5); a small plush thumbnail
  hops from the button to the header's cart and the badge ticks **0 → 1** with a pop (51.5), a few confetti from the
  badge; hold on "1" until 53.0. The hand gives a thumbs up (53.0–54.0).
  - reads: 50.5–51.0 the code arrives and is ready · 51.0–51.5 the click goes through · 51.5–53.0 the cart shows 1 ·
    53.0–54.0 the user is happy

### F · …and the rest keeps streaming (54.0–58.5) · `payoff.js`

- **F1** Bolt wipes its brow (54.0–54.5); caption 5 at 54.5. The hand waves and drifts off right (54.5–55.3). The ↗ and
  ⚙ snails arrive (55.5, 56.0), Bolt shelves them on 56.0 and 56.5; the shelf is full (57.0). Bolt leans on it, shades
  back down (57.0–58.5).

### G · End card (58.5–66.0) · `bookends.js`

- **G1 58.5–60.5 · The whole line.** The camera pulls back to the widest frame (zoom ~0.38): tower, tube over the hills,
  house. Hold 59.5–60.0; paper strokes close in from the edges around Bolt (60.0–60.5), the tube's line last.
- **G2 60.5–66.0 · The logo again.** On paper, Bolt jumps (60.5); mid-air its limbs spring in, the long arm last with a
  snap, and it lands as the logo bolt at 61.5, at A2's spot. "Qwik" 62.0, "JavaScript Streaming" 62.5, "qwik.dev" 63.0;
  read until 64.0. Wink 64.0–64.5. Hold; fade to paper 65.5–66.0.

## Sound (added last)

A light, bouncy 120 BPM track, with painted-cartoon sound effects on the hits, from the cue list in `src/cues.js`.
