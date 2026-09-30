# How Qwik v2 JavaScript streaming works (research notes, 2026-09-30)

Paths are in the Qwik v2 monorepo (QwikDev/qwik, main).

I read the source for all six questions. The biggest finding: Qwik v2 does have real out-of-order streaming, but it's experimental. The usual "qwikloader tells the preloader to bump the clicked chunk" story is not what the code currently does.

**Files cited below** (short names used in citations):
- `/Users/maieul/dev/work/qwik-v2/.claude/worktrees/funny-leakey-618321/packages/qwik/src/qwikloader.ts`
- `/Users/maieul/dev/work/qwik-v2/.claude/worktrees/funny-leakey-618321/packages/qwik/src/out-of-order-executor-shared.ts`, `backpatch-executor-shared.ts`
- `/Users/maieul/dev/work/qwik-v2/.claude/worktrees/funny-leakey-618321/packages/qwik/src/server/` → `ssr-container.ts`, `ssr-render.ts`, `ssr-stream-handler.ts`, `preload-impl.ts`, `types.ts`, `preloading.md` (an internal design note)
- `/Users/maieul/dev/work/qwik-v2/.claude/worktrees/funny-leakey-618321/packages/qwik/src/core/ssr/` → `ssr-render-jsx.ts`, `ssr-events.ts`, `out-of-order-segment-swap.ts`
- `/Users/maieul/dev/work/qwik-v2/.claude/worktrees/funny-leakey-618321/packages/qwik/src/core/control-flow/` → `pending.tsx`, `reveal.tsx`, `pending-utils.ts`
- `/Users/maieul/dev/work/qwik-v2/.claude/worktrees/funny-leakey-618321/packages/qwik/src/core/preloader/` → `queue.ts`, `bundle-graph.ts` (called "core bundle-graph" below), `bridge.ts`, `constants.ts`, `index.ts`
- `/Users/maieul/dev/work/qwik-v2/.claude/worktrees/funny-leakey-618321/packages/qwik/src/core/shared/qrl/qrl-class.ts`, `.../core/shared/serdes/qrl-to-string.ts`, `.../core/client/run-qrl.ts`, `.../core/client/dom-container.ts`
- `/Users/maieul/dev/work/qwik-v2/.claude/worktrees/funny-leakey-618321/packages/qwik-vite/src/plugins/bundle-graph.ts` (called "vite bundle-graph"), `.../qwik-vite/src/manifest.ts`, `.../qwik-vite/src/plugins/plugin.ts`
- `/Users/maieul/dev/work/qwik-v2/.claude/worktrees/funny-leakey-618321/packages/qwik-router/src/runtime/src/create-renderer.ts`, `link-prefetch.ts`

---

## 1. SSR output, in stream order (full document, production, default options)

1. **Container open.** `<!DOCTYPE html><html q:container="paused" q:runtime="2" q:version q:render="ssr" q:base="/build/" q:locale q:manifest-hash q:instance="<6 random chars>">` (ssr-container.ts:637-661, 311, 2253-2255).
2. **Right after `<head>` opens** (ssr-render-jsx.ts:258-261):
   - **qwikloader.** Default mode is `module`: `<link rel="modulepreload">` plus `<script async type="module" src=qwikloader>` (ssr-container.ts:1519-1541; default at 370-387; types.ts:127-145). It falls back to an inline script if the build manifest has no qwikloader chunk.
   - **Preloader bootstrap, production only** (ssr-container.ts:1506-1510; preload-impl.ts:37-113):
     - `<link rel=modulepreload href=preloader>`
     - `<link rel=preload as=fetch crossorigin href=bundle-graph.json>`
     - an inline module script that, after the page paints, fetches the graph and calls `l(base, graph, {P: maxIdlePreloads})`
     - `<link rel=modulepreload href=core>`
   - Then the app's own `<head>` children, then injected styles. The renderer works through a last-in-first-out stack (ssr-render-jsx.ts:98-99, 256-274).
3. **Body HTML.**
   - Every element carries a bare `:` attribute (ssr-container.ts:736).
   - Event handlers become attributes like `q-e:click="<chunk>#<symbol>[#<captured ids>]"` (qrl-to-string.ts:94-98). Several handlers on one element are joined with `|` (ssr-events.ts:24).
   - Handlers that capture variables are wrapped as `<core chunk>#_run#<ids>`, because `_run` ships in the same chunk as core (ssr-events.ts:40-45; plugin.ts:1443-1447).
   - Other scopes follow the same pattern: `q-d:` (document), `q-w:` (window), passive `q-ep:`, plus `preventdefault:click`, `stoppropagation:click`, `capture:click` and `q-e:qvisible`.
4. **Before `</body>`** (`emitContainerData`, ssr-container.ts:1047-1078):
   1. **Flush the visible shell first**, so all HTML reaches the browser before state serialization starts (1048-1056).
   2. `<script type="qwik/state" q:instance>` with the state JSON (1342-1365).
   3. `<script type="qwik/vnode">` (1125-1139).
   4. `<script type="module" async q:type="preload">`: after paint, `import(preloader).then(({p}) => p([bundles of every event handler seen during SSR]))` (preload-impl.ts:115-196). By default no app-bundle `modulepreload` links are written into the HTML (`ssrPreloads: 0`, preload-impl.ts:220-223).
   5. `<script q:func="qwik/json">document["qFuncs_<hash>"]=[…]`, holding the `sync$` functions (1367-1395).
   6. Backpatch data and its executor, only if needed (1397-1451).
   7. Inline qwikloader, if not already emitted and the page isn't static. Then `(window._qwikEv||(window._qwikEv=[])).push("e:click",…,0,"<hash>")`, which registers event types and marks the container ready (1560-1599).
   8. The out-of-order tail, if used (see section 2).
5. **Inline-loader heuristic.** In `inline` mode, qwikloader is injected once about 30 KB of HTML has been written: "on slow connections the page is already partially visible" (ssr-container.ts:698-708).

**Flushing** (ssr-stream-handler.ts):
- `streaming.inOrder.strategy` is `'auto'` by default: buffer, flush once the buffer reaches 20,000 characters for the first chunk, then every 10,000 (32-36, 69-89). `'direct'` writes every chunk immediately; `'disabled'` buffers everything.
- Forced flushes happen:
  - before awaiting a Promise in JSX (ssr-render-jsx.ts:203-207)
  - before awaiting an async component (387-389)
  - after each chunk of an async generator (208-221)
  - around `SSRStream` / `SSRStreamBlock` (335-363)
  - before state serialization (ssr-container.ts:1055)
  - at the end (ssr-render.ts:95-96)
- The renderer waits for any pending network write after each node, which acts as backpressure (ssr-render-jsx.ts:155-159).
- `onBeforeFirstFlush` is the last point where response headers can still change (types.ts:216-223).

## 2. Out-of-order streaming: yes, but experimental

- **No `useAsync$`, no `q:ooo`, no Suspense.** The mechanism is `<Pending>` plus `<Reveal>`; code calls it "OOOS".
- **`q:template` is unrelated.** It's a hidden wrapper for slot content that no slot claimed (ssr-container.ts:893-931).
- **Enabling it.** It requires `experimental: ['pendingBoundary']`. Once enabled, `renderToStream` defaults `outOfOrder` to true (ssr-render.ts:48-56; ssr-container.ts:355-366). Qwik Router turns it off for SSG/static renders (create-renderer.ts:47-56).

How a slow part is sent later and slotted in:
1. **At the `<Pending>` position**, the server writes:
   - a fallback `<div style="display:contents">`
   - a content host `<div q:rp="N" style="display:none">` containing an empty `<template q:r="N">` placeholder
   - once per page, an inline executor script that defines `qO` (pending.tsx:136-197, 247-290; ssr-container.ts:1453-1467)
2. **The slow children render in parallel** into a separate segment container with its own string buffer (ssr-container.ts:485-576). Meanwhile the main stream keeps going (footer, other buttons).
3. **When the segment resolves**, the server writes, then flushes immediately (out-of-order-segment-swap.ts:6-29):
   - `<template q:r="N">resolved HTML</template>`
   - its scripts: a state patch `<script type="qwik/state" q:patch q:r="N">`, vnode data, `qFuncs`/`_qwikEv` pushes
   - `<script>qO(N)</script>`
4. **Timing depends on when it resolves:**
   - While the shell is still streaming: the template and `qO` go out right away, but its state is held until the root state is out (ssr-container.ts:432-445, 1969-1974, 1080-1091).
   - After the root state: segments go out in completion order.
   - The response stays open until every segment is done (1099-1104).
5. **In the browser, `qO(N)`**:
   - moves `template.content` in place of the placeholder and removes both templates
   - asks the Qwik runtime, if loaded, to process the segment's state
   - sets the fallback to `display:none` and the content host to `display:contents` (out-of-order-executor-shared.ts:93-120, 181-202)
   - the fallback stays in the DOM.
6. **`<Reveal order>`** coordinates groups through `qO.g(group, total, order)`: parallel, sequential, reverse or together (executor 122-179, 204-212; pending-utils.ts:36-69).
7. **`delay`.** The fallback is streamed hidden. If the timer wins, the server streams a backpatch script that reveals it (pending.tsx:350-366).
8. **Slow data.** `routeLoader$(…, {blockSSR: false})` (also experimental) lets SSR start before the loader finishes. Only reading `.value` suspends (docs route-loader/index.mdx:275-281).

Without the flag, streaming is in order with early flushes: the server flushes what it has, then waits at that spot.

## 3. The preloader

- **Bundle graph (build time).** A flat array format: a name, then dependency indexes; a negative number `-k` means "probability k/10 for the entries that follow" (core bundle-graph.ts:23-46).
  - Symbol hashes and route names are aliases pointing to real bundles (vite bundle-graph.ts:47-73). Aliases are never preloaded themselves (core bundle-graph.ts:11-21).
  - Only `$` segment edges are followed; a plain `import()` is a cut point (vite bundle-graph.ts:75).
  - Build-time probability (vite bundle-graph.ts:126-156): start at 0.5, add 0.08 per interactivity point, add 0.25 if both come from the same parent, add 0.15 if under 1,000 bytes, cap at 0.99.
  - Interactivity scoring (manifest.ts:267-291): click/key/scroll-type handlers get the most points; tasks get fewer.
- **Runtime probabilities.**

  | Source | Probability |
  |---|---|
  | SSR list of event-handler bundles | 0.6 (default) (queue.ts:270) |
  | QRL created in the browser | 0.8 (qrl-class.ts:133-136) |
  | QRL about to execute | 1.0 (qrl-class.ts:193-196) |
  | Visible `<Link>` | 0.8 (link-prefetch.ts:52-58) |

- **Propagation.**
  - A bundle at ≥0.99 lifts all its dependencies to at least 99% (queue.ts:116-118).
  - Otherwise, spread-out ("organic") probability is capped at 98% (119-127).
  - Changes under 0.01 are ignored (144-148).
  - The queue is sorted by urgency (36-41).
- **In-flight limit.** Anything at ≥0.99 is preloaded immediately with no limit. Everything else waits until fewer than `maxIdlePreloads` (default 25) links are in flight (queue.ts:65; constants.ts:12-15; types.ts:33-44).
  - The source explains why: Chrome doesn't raise priority for new modulepreloads, so a small window lets urgent bundles start soon (queue.ts:43-51).
  - **There is no connection-type or slow-network logic in the preloader.** The only network-aware check is the router `<Link>` skipping prefetch when `saveData` is on (link-prefetch.ts:36).
- **`modulepreload` vs `fetch`.** It uses `<link rel="modulepreload" as="script">`, falling back to `rel="preload"` when unsupported (constants.ts:17-21; queue.ts:216-234). `fetch` is used only for the bundle-graph JSON (preload-impl.ts:88).
- **Start trigger.** The browser `load` event, then two animation frames, then `requestIdleCallback` with a 1 s timeout (preload-impl.ts:27-35).
  - Hints that arrive before the preloader has loaded are held in a buffer and replayed (bridge.ts:7-25).
  - Nothing is queued until the graph's base URL is known (queue.ts:150-153; core bundle-graph.ts:86-121).
- **How it keeps buffering.** Each link's `onload`/`onerror` decrements the in-flight count, removes the link ("Keep the <head> clean") and schedules the next pass (queue.ts:223-232). Work is time-sliced in 10 ms chunks using MessageChannel tasks (constants.ts:25; queue.ts:58-79).

## 4. Click on a slow network, before the segment is preloaded

1. qwikloader has one capture-phase listener per event type on `document` (qwikloader.ts:543-581). With no registered list it defaults to `click` and `input` (630-631).
2. It walks from the event target up through ancestors: capture-handler elements first, then bubbling order (389-431). `preventdefault:`/`stoppropagation:` attributes are applied synchronously (266-273).
3. It reads `q-e:click`, finds the nearest container's `q:base`, splits on `|` and `#` (319-331), then does `import(new URL(chunk, base))` (218-219).
4. **If the page is still streaming** (`paused`, `readyState=loading`, container not ready yet), the handler waits for the container-ready marker (130-145, 355-361).
5. **Events aren't replayed.** The original `Event` object is kept and passed to the handler once the code arrives, only if the element is still connected (332-352, 362-364). User events are chained so they run in click order (98-107).
6. **Two paths:**
   - **Handler without captures:** qwikloader imports the segment directly. **The preloader is never told.**
   - **Handler with captures:** qwikloader imports the core chunk, which was already modulepreloaded in `<head>`. `_run` waits for state (run-qrl.ts:84-99), then the QRL's load calls `requestPreload(chunk, 1)`. That lifts the segment's dependencies to ≥99%, beyond the 25-link limit, and then it does `import()` itself (qrl-class.ts:193-205).
   - **Before `load`** (common on slow 3G), even that hint just sits in the buffer; the native `import()` does the fetching.
7. **Events qwikloader emits:** `qsymbol` after a successful import, with `{qBase, symbol, element, reqTime}` (192-197, 233-234); `qerror` on failures.
   - Insights listens to `qsymbol` for latency data.
   - The preloader also listens, but only acts when `detail.href` is present (queue.ts:290-298).
   - `href` was removed from qwikloader's payload in commit 98ec1f7fe (Feb 2 2026), and core's own `qsymbol` never includes it (qrl-class.ts:644-653). **So that listener currently never fires.** This looks like an unintended regression, not a design choice.

## 5. Official wording (packages/docs/src/...)

- components/home/streaming.tsx:8: "Qwik is like video streaming, but with JavaScript." The homepage writes "JavaScript Streaming" (line 22).
- routes/docs/(qwik)/concepts/think-qwik/index.mdx:
  - line 21: "a mechanism we call **javascript streaming**"; "buffer javascript code bit by bit"; "continuing to preload the rest of the code when idle"
  - lines 57-58: "Immediate user events registration (a.k.a. the qwikloader)"; "Buffered and on-demand module preloads (a.k.a. the preloader)"
  - line 178: "bypassing the idle queue and starting to preload them right away"
- routes/(blog)/blog/(articles)/qwik-1-14-preloader/index.mdx:
  - line 29: "execute a part of the code as soon as it is ready"
  - line 35: "lazy-executed" (contrasted with "lazy loaded")
  - line 101: "reprioritize" bundles on user interaction
- routes/docs/(qwik)/concepts/resumable/index.mdx:41: "pauses execution on the server, and resumes execution on the client"
- routes/docs/(qwikrouter)/advanced/speculative-module-fetching/index.mdx:21: page title "Speculative Module Fetching"
- routes/docs/(qwik)/advanced/modules-prefetching/index.mdx:55: "keeping only a few active at a time"
- routes/docs/labs/pending/index.mdx:151: "helps when one section of the page is slow"

**Where the docs disagree with the code:**
- think-qwik:153 shows `on:click=`; the code emits `q-e:click=`.
- advanced/qwikloader/index.mdx:21 says "about 1 kb minified". The local build (`packages/qwik/dist/qwikloader.js`) is about 5.3 KB raw, 2.4 KB gzip, 2.1 KB brotli. The code comment in types.ts:134-135 (about 3 kB, 1.6 kB gzip) is also stale.
- speculative-module-fetching:73 names a `_preload` function that no longer exists.

## 6. Visual metaphors and surprising, accurate details

- **One doorman at the front door:** a single document-level listener per event type, reading "addresses" written into attributes. A QRL string is literally `file.js#export#captures`.
- **Pause and resume, literally:** `q:container="paused"` flips to `"resumed"` and fires a `qresume` event (dom-container.ts:208-211). There's no hydration pass, and state is parsed lazily through a Proxy (dom-container.ts:201).
- **A sliding window of about 25 `<link>` tags** appearing in `<head>` and removing themselves when done. A click lifts its dependencies straight past the window.
- **A polite start:** preloading waits for `load` + 2 frames + idle, and early hints wait in a mailbox (`bridge.ts`).
- **Out-of-order as a sealed envelope:** a `<template>` arrives later, then a tiny courier `qO(N)` swaps it in using only `display:none` / `display:contents`. The executor is about 0.9 KB gzip.
- **The `:` tick mark on every element**, used to count elements (backpatch-executor-shared.ts:27-40).
- **Build-time guessing:** click handlers score highest, and probabilities are rounded to tenths.
- **Design-note numbers** (server/preloading.md:12-14): about 200 ms is noticeable, and the docs site has 2.3 MB of brotli-compressed JS.

## Uncertain or worth double-checking

- The inert `qsymbol` listener (section 4, point 7) is a probable bug, not confirmed intent.
- Browser behaviour is not Qwik code: reusing an in-flight modulepreload for `import()`, and the relative priority of `import()` vs `modulepreload`.
- `slowSize` in vite bundle-graph.ts:3-5 looks dimensionally wrong (seconds per byte), so nearly every dependency counts as "big". Minor impact.
- qwikloader's `resolveContainer` looks for `type="qwik/json"`, which v2 never emits (qwikloader.ts:114). It appears to be dead code.
- Bundle sizes come from the local `dist/` build (built today, after the last qwikloader change on Sep 18), not a published package.
- `preloading.md` is a design note, and several of its formulas differ from `queue.ts`. Treat the code as the truth.
- `<Pending>`, out-of-order streaming and `blockSSR: false` are all experimental.