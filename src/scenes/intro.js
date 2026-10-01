(() => {
  const U = 20, WIN = WORLD.window, PG = WORLD.page, ROAD = WORLD.roadY, NOOK = SETS.nook, PORT_X = WORLD.house.x0 + 15;
  const ADDR = SETS.address, ICON = ADDR.icon, [TEXT_X, BAR_Y] = ADDR.text, URL = 'boltplush.shop';
  const caretX = n => TEXT_X + ADDR.width(URL.slice(0, n)) + 2;
  const frameTime = v => v / 24 - 10;
  const mix2 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
  const add2 = (a, b) => [a[0] + b[0], a[1] + b[1]];
  const bez3 = (a, b, c, d, k) => { const m = 1 - k; return [0, 1].map(i => m * m * m * a[i] + 3 * m * m * k * b[i] + 3 * m * k * k * c[i] + k * k * k * d[i]); };
  const zoomLerp = (a, b, k) => Math.exp(lerp(Math.log(a), Math.log(b), k));
  const bump = (t, a, b) => Math.sin(Math.PI * seg(t, a, b));

  const AT = {
    handIn: -9.62, hover: -9.12, click: -9.0, lift: -7.5, wind: -7.22, enter: -7.0,
    slipPop: -6.5, slipLand: -6.0, wake: -5.96, yawn: -5.72, yawnEnd: -5.36, turn: -5.3, crawl: -5.2, pullBack: -5.05, wideFrame: -4.4,
    whizz: -3.0, whizzEnd: -2.5, portFrame: -2.62, atPort: -2.6, stuck: -2.44, pop: -2.25, gone: -2.05,
    handOff: -2.0, pushIn: -2.0, paper0: -0.58, paper1: -0.25,
  };
  const LETTER_AT = [36, 37, 39, 40, 43, 44, 46, 47, 49, 52, 53, 55, 56, 58].map(frameTime);
  const TAP_AT = [36, 39, 43, 46, 49, 52, 55, 58].map(frameTime);
  const typedCount = t => LETTER_AT.filter(k => t >= k - 1e-4).length;

  const CAM_KEYS = [
    [-10.0, [5452, 508, 1.47]], [AT.click + .05, [5440, 503, 1.5]], [-8.5, [5292, 468, 2.7]], [AT.slipPop - .1, [5290, 466, 2.72]],
    [AT.slipLand + .05, [5098, 252, 2.9], { via: [[5230, 330], [5120, 255]], dip: .87 }], [AT.pullBack, [5092, 255, 2.84]],
    [AT.wideFrame, [5120, 478, 1.11]], [AT.whizz, [5116, 474, 1.12]], [AT.portFrame, [4660, 330, 1.55]], [AT.pushIn, [4655, 332, 1.57]],
    [-0.6, [5457, 612, 2.25]], [0, [5457, 614, 2.3]],
  ];
  function camAt(t) {
    let i = 0;
    while (i < CAM_KEYS.length - 2 && t >= CAM_KEYS[i + 1][0]) i++;
    const [ta, A] = CAM_KEYS[i], [tb, B, curve] = CAM_KEYS[i + 1], k = ease(seg(t, ta, tb));
    const [x, y] = curve ? bez3(A, ...curve.via, B, k) : mix2(A, B, k), dip = curve ? 1 - (1 - curve.dip) * Math.sin(Math.PI * k) : 1;
    return [x, y, zoomLerp(A[2], B[2], k) * dip];
  }

  function addressAt(t) {
    const n = typedCount(t), blinkOn = frac(bpOf(t)) < .5;
    const focus = ease(seg(t, AT.click, AT.click + .1)) * (1 - ease(seg(t, AT.enter + .05, AT.enter + .35)));
    const caret = t >= AT.enter ? 0 : t < AT.click ? (blinkOn ? 1 : 0) : 1;
    return { text: URL.slice(0, n), pop: n ? seg(t, LETTER_AT[n - 1], LETTER_AT[n - 1] + 3 / 24) : 1, caret, focus, icon: false };
  }

  function inching(u, steps) {
    const s = Math.min(u, .9999) * steps;
    return (Math.floor(s) + ease(clamp((frac(s) - .55) / .45))) / steps;
  }
  function progressAt(t) {
    if (t < AT.enter) return 0;
    return .05 * easeOut(seg(t, AT.enter, AT.enter + .3)) + .1 * inching(seg(t, AT.enter + .3, AT.whizz), 8)
      + .17 * ease(seg(t, AT.whizz, AT.whizzEnd)) + .03 * seg(t, AT.whizzEnd, 0);
  }
  function progressBar(t) {
    if (t < AT.enter) return;
    const x0 = WIN.x0 + 4, x1 = WIN.x1 - 4, y0 = PG.titleBar[1] + 1.5, h = 12 * easeOut(seg(t, AT.enter, AT.enter + .12));
    if (h < .5) return;
    boilSeed('intro progress track');
    paint(rectPts(x0, y0, x1 - x0, h), { wash: '#D3C6EA', ink: null });
    const w = Math.max(h, (x1 - x0) * progressAt(t));
    boilSeed('intro progress fill');
    paint(rrPts(x0, y0, w, h, h / 2), { wash: QWIK.blue, ink: PAL.ink, sw: .45 });
    paint(rrPts(x0 + 3, y0 + 1.2, Math.max(1, w - 8), h * .28, h * .14), { wash: '#BDEBFF', ink: null });
  }

  function spinner(t) {
    if (t < AT.enter) return;
    const r = 7 * backOut(seg(t, AT.enter, AT.enter + .16)), [x, y] = ICON;
    if (r < .5) return;
    const ang = t * TAU * 1.1 + TAU * 3 * ease(seg(t, AT.whizz, AT.whizzEnd)), arc = [];
    for (let i = 0; i <= 14; i++) { const a = ang + i / 14 * 4.3; arc.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); }
    boilSeed('intro spinner');
    paint(ellPts(x, y, r, r, 18), { ink: '#D8D0E4', sw: .7 });
    inkLine(arc, 1.15, QWIK.blue, 'ink', .4);
  }

  const TIP = 32, PRESS_Y = BAR_Y + .5, UP_Y = BAR_Y - 14;
  const CLICK = [caretX(0) + 26, PRESS_Y], HOVER = [CLICK[0] + 6, BAR_Y - 38], ENTER = [caretX(URL.length) + TIP + 8, PRESS_Y];
  const WIND = [ENTER[0] + 10, BAR_Y - 74], AWAY = [ENTER[0] + 30, BAR_Y - 46];
  const START = [WIN.x1 + 320, 80], DRUM = [WIN.x1 - 70, 600], EXIT = [WIN.x1 + 500, 420];
  function typingX(t) {
    const n = typedCount(t);
    if (!n) return CLICK[0];
    const from = n > 1 ? caretX(n - 1) + TIP : CLICK[0];
    return lerp(from, caretX(n) + TIP, ease(seg(t, LETTER_AT[n - 1], LETTER_AT[n - 1] + 2 / 24)));
  }
  function tapPress(t) {
    let p = 0;
    for (const at of TAP_AT) { const f = Math.round((t - at) * 24); p = Math.max(p, f === 0 ? .78 : f === 1 ? .42 : f === 2 ? .1 : f === -1 ? .18 : 0); }
    return p;
  }
  const drumPhase = t => bpOf(t) + .12 + 2 * ease(seg(t, AT.whizz, AT.whizzEnd));
  function handAt(t) {
    if (t < AT.hover) {
      const s = seg(t, AT.handIn, AT.hover), k = 1 - Math.pow(1 - s, 2.2);
      return { p: bez3(START, [5700, 30], [5230, 120], HOVER, k), rot: lerp(-.42, -.14, ease(seg(s, .3, 1))), press: 0, lift: 1 };
    }
    if (t < AT.click + .1) {
      const w = spring(t, AT.hover, 12, 28), up = bump(t, AT.hover, AT.click - .04), down = easeIn(seg(t, AT.click - .045, AT.click));
      const p = mix2(add2(HOVER, [-4 * w, 5 * w - 9 * up]), CLICK, down);
      return { p, rot: -.14 + .03 * w, press: t < AT.click ? down : 1 - seg(t, AT.click + .04, AT.click + .1), lift: 1 - down };
    }
    if (t < AT.lift) {
      const rise = ease(seg(t, AT.click + .06, AT.click + .3)), press = tapPress(t), y = lerp(PRESS_Y, UP_Y, rise);
      return { p: [typingX(t) + 2 * press, lerp(y, PRESS_Y - 2, press)], rot: -.17 - .02 * Math.sin(t * 9), press, lift: .3 * (1 - press) };
    }
    if (t < AT.enter) {
      const up = ease(seg(t, AT.lift, AT.wind)), slam = easeIn(seg(t, AT.enter - .08, AT.enter));
      const hover = 4 * Math.sin((t - AT.wind) * 18) * seg(t, AT.wind, AT.wind + .08) * (1 - slam), top = add2(mix2([ENTER[0], UP_Y], WIND, up), [0, hover]);
      return { p: mix2(top, ENTER, slam), rot: lerp(-.12, -.27, up) + .15 * slam, press: slam, lift: .6 * up * (1 - slam) };
    }
    if (t < AT.enter + .4) {
      const a = t - AT.enter, up = easeOut(seg(t, AT.enter + .05, AT.enter + .4));
      return { p: mix2(ENTER, AWAY, up), rot: -.12 - .1 * up, press: 1 - seg(t, AT.enter + .05, AT.enter + .12), lift: up, sq: .16 * Math.exp(-a * 18) * Math.cos(a * 30) };
    }
    if (t < AT.handOff) {
      const go = ease(seg(t, AT.enter + .4, -5.75)), p = bez3(AWAY, [AWAY[0] + 300, AWAY[1] - 60], [DRUM[0] + 40, DRUM[1] - 160], DRUM, go);
      const drumming = seg(t, -5.75, -5.6), phase = drumPhase(t), rolling = drumming * Math.sin(Math.PI * seg(frac(phase), 0, .62)), since = frac(phase - .62) / 2;
      return { p: add2(p, [2 * rolling, -8 * rolling]), rot: lerp(-.22, .06, go) + .05 * rolling, pose: drumming > .5 ? 'drum' : 'point', phase,
        sq: .08 * drumming * Math.exp(-since * 20) * Math.cos(since * 40), lift: 1 - .8 * drumming + .25 * rolling };
    }
    const lift = ease(seg(t, AT.handOff, AT.handOff + .25)), go = easeIn(seg(t, AT.handOff + .15, AT.handOff + .75));
    return { p: add2(mix2(DRUM, EXIT, go), [6 * lift, -14 * lift]), rot: .06 + .2 * lift, pose: 'point', from: 'drum', k: seg(t, AT.handOff, AT.handOff + .2), phase: drumPhase(t), lift: .2 + .8 * lift };
  }
  function drawHand(t) {
    if (t < AT.handIn || t > AT.handOff + .8) return;
    const h = handAt(t);
    if (cull(h.p[0] - 120, h.p[1] - 40, h.p[0] + 160, h.p[1] + 260)) return;
    const lift = h.lift ?? 1;
    cursorHand(h.p[0], h.p[1], 1.0, {
      pose: h.pose || (h.press > 0 ? 'press' : 'point'), press: h.press, rot: h.rot, sq: h.sq || 0, phase: h.phase, from: h.from, k: h.k,
      shadow: [8 + 26 * lift, 10 + 30 * lift, .85 - .3 * lift], boilKey: 'hand',
    });
  }

  function ticks(t, at, p, n, r0, len, key, life = .18, a0 = -Math.PI / 2, spread = TAU) {
    const a = t - at;
    if (a < 0 || a > life) return;
    const b = a / life;
    boilSeed('intro ticks ' + key);
    for (let i = 0; i < n; i++) {
      const ang = spread >= TAU ? i / n * TAU + .3 : a0 + (i / (n - 1) - .5) * spread, r1 = r0 + 26 * easeOut(b), r2 = r1 + len * (1 - .6 * b);
      inkLine([[p[0] + Math.cos(ang) * r1, p[1] + Math.sin(ang) * r1], [p[0] + Math.cos(ang) * r2, p[1] + Math.sin(ang) * r2]], 1.4 * (1 - .7 * b), PAL.ink, 'ink', 0);
    }
  }
  const RETURN_ARROW = [[4, -16], [12, -16], [12, 7], [-5, 7], [-5, 13], [-17, 4], [-5, -5], [-5, 1], [4, 1]];
  function returnArrow(t) {
    const a = t - AT.enter;
    if (a < 0 || a > .55) return;
    const k = backOut(seg(a, 0, .14)) * (1 - easeIn(seg(a, .38, .55)));
    if (k < .03) return;
    const c = [ENTER[0] + 58, ENTER[1] - 70 - 18 * easeOut(seg(a, 0, .55))], s = 1.7 * k, rot = -.12 + .1 * spring(t, AT.enter, 8, 22);
    boilSeed('intro return arrow');
    paint(RETURN_ARROW.map(([x, y]) => [c[0] + (x * Math.cos(rot) - y * Math.sin(rot)) * s, c[1] + (x * Math.sin(rot) + y * Math.cos(rot)) * s]), { wash: QWIK.blue, ink: PAL.ink, sw: .8 });
  }

  const SNAIL = { x: NOOK.x1 - 77, y: NOOK.y - 5, slipS: .72 }, QUILT_END = NOOK.x0 + 17;
  const X_PORT = PORT_X + 69, X_STUCK = PORT_X + 37, X_OUT = PORT_X - 480;
  const SCOOT = { px: 20, dur: .3, crawlFrom: .2 };
  function crawled(t) {
    const tau = Math.max(0, Math.min(t, AT.whizz) - AT.crawl - SCOOT.crawlFrom);
    return SCOOT.px * ease(seg(t, AT.crawl, AT.crawl + SCOOT.dur)) + 44 * (tau - .3 * (1 - Math.exp(-tau / .3)));
  }
  const X_WHIZZ = SNAIL.x - crawled(AT.whizz);
  function snailX(t) {
    if (t < AT.whizz) return SNAIL.x - crawled(t);
    if (t < AT.atPort) return lerp(X_WHIZZ, X_PORT, ease(seg(t, AT.whizz, AT.atPort)));
    if (t < AT.stuck) return lerp(X_PORT, X_STUCK, easeOut(seg(t, AT.atPort, AT.stuck)));
    if (t < AT.pop) return X_STUCK + 3 * Math.sin((t - AT.stuck) * 60);
    return lerp(X_STUCK, X_OUT, easeIn(seg(t, AT.pop, AT.gone)));
  }
  function snailState(t) {
    const x = snailX(t), y = lerp(ROAD, SNAIL.y, seg(x, QUILT_END - 20, QUILT_END));
    // seed ≥ 6 keeps cast.js blinks working below T = 0
    const o = { x, y, flip: false, crawl: (SNAIL.x - x) / 60, eyes: 'closed', droop: .6, hide: .42, mouth: null, lookX: .3, lookY: 0, sq: .03 * Math.sin(t * TAU * .5), emote: 'zzz', emoteK: 1, emoteAge: t + 11.3, seed: 6.3 };
    if (t < AT.slipLand) return o;
    o.sq = .34 * spring(t, AT.slipLand, 9, 26);
    o.emoteK = 1 - seg(t, AT.slipLand, AT.slipLand + .08);
    if (o.emoteK <= 0) o.emote = null;
    if (t < AT.wake) return o;
    const up = ease(seg(t, AT.wake, AT.wake + .16)), tk = take(t, AT.wake + .02, .7);
    Object.assign(o, { hide: .42 * (1 - up), droop: .6 * (1 - up), eyes: 'wide', lookX: -.8, lookY: -.9, sq: o.sq + tk.sq, dy: tk.dy,
      emote: '!', emoteK: seg(t, AT.wake, AT.wake + .06) * (1 - seg(t, AT.yawn - .08, AT.yawn)), emoteAge: t - AT.wake });
    if (t < AT.yawn) return o;
    const yawn = seg(t, AT.yawn, AT.yawnEnd), stretch = bump(t, AT.yawn, AT.yawnEnd);
    Object.assign(o, { emote: null, eyes: yawn < .85 ? 'squeeze' : 'sleepy', yawn: yawn < .9 ? Math.sin(Math.PI * yawn / .9) : 0, lookX: 0, lookY: -.2, droop: .25 * stretch, sq: -.16 * stretch, dy: -.4 * stretch });
    if (t < AT.turn) return o;
    const squash = bump(t, AT.turn, AT.turn + .1), settle = spring(t, AT.turn + .1, 9, 24), alert = t < AT.crawl + .25;
    const scoot = bump(t, AT.crawl, AT.crawl + SCOOT.dur * .8) - .4 * bump(t, AT.crawl + SCOOT.dur * .6, AT.crawl + SCOOT.dur * 1.4);
    Object.assign(o, { flip: t >= AT.turn + .05, eyes: t < AT.crawl ? 'squeeze' : alert ? 'normal' : 'sleepy', yawn: 0, droop: alert ? .1 : .4, lookX: .5, lookY: 0,
      sq: .28 * squash - .1 * settle + .22 * scoot, dy: 0, trail: Math.min(26, SNAIL.x - x) });
    if (t < AT.whizz) return o;
    const zip = bump(t, AT.whizz, AT.atPort);
    Object.assign(o, { eyes: zip > .2 ? 'squeeze' : 'normal', droop: .3 * (1 - zip), lookX: -.4 * zip, sq: -.12 * zip, trail: 26 * (1 - seg(t, AT.whizz, AT.whizz + .1)) });
    if (t < AT.atPort) return o;
    const push = easeOut(seg(t, AT.atPort, AT.stuck)), strain = seg(t, AT.stuck - .06, AT.pop);
    Object.assign(o, { eyes: 'squeeze', mouth: strain > 0 ? 'teeth' : 'flat', droop: 0, duck: .5 * push, sweat: strain, sq: -.42 * push + .08 * Math.sin((t - AT.stuck) * 55) * strain });
    if (t >= AT.pop) Object.assign(o, { sq: -.5 + .4 * seg(t, AT.pop, AT.gone), duck: .7, sweat: 0 });
    return o;
  }
  function yawnMouth(head, k, flip) {
    const c = [head[0] + (flip ? -10 : 10), head[1] + 6], rx = 2 + 5 * k, ry = 2 + 9 * k;
    boilSeed('intro snail yawn');
    paint(ellPts(c[0], c[1], rx, ry, 16), { wash: '#5A2B3C', ink: PAL.ink, sw: .7 });
    if (k > .3) paint(ellPts(c[0], c[1] + ry * .5, rx * .7, ry * .38, 12), { wash: '#E9869B', ink: null });
  }
  function slipOnShell(o) {
    const out = 1 - ease(seg(o.hide || 0, .15, .7)), sRot = .05 * Math.sin(o.crawl * TAU + .2) * out - .06 * (o.duck || 0);
    const at = snailCarry(o.x, o.y, U, { crawl: o.crawl, duck: o.duck, hide: o.hide, sq: o.sq, flip: o.flip, dy: o.dy });
    return { c: [at[0], at[1] - 5.5 * SNAIL.slipS], rot: (o.flip ? -1 : 1) * (sRot * .8 - .1), sx: 1 + (o.sq || 0) * .35, sy: 1 - (o.sq || 0) };
  }
  const SLIP_CURL = .45, SLIP_ROLL_Y = lerp(43 - 3.5, -24, SLIP_CURL);
  function drawSlip(roll, s, o = {}) {
    const rot = o.rot || 0, sy = o.sy ?? 1, d = SLIP_ROLL_Y * s * sy;
    slip(roll[0] + d * Math.sin(rot), roll[1] - d * Math.cos(rot), s, { curl: SLIP_CURL, rot, sx: o.sx ?? 1, sy, flutter: o.flutter || 0, key: 'req' });
  }

  const POP_FROM = [TEXT_X + 62, BAR_Y - 2];
  function slipFlight(t, land) {
    const s = seg(t, AT.slipPop, AT.slipLand), top = [POP_FROM[0] + 2, POP_FROM[1] - 34], u = seg(s, .12, 1);
    const sway = 16 * Math.sin(u * Math.PI * 2.2) * seg(u, .35, .6) * (1 - u);
    const c = s < .12 ? mix2(POP_FROM, top, easeOut(s / .12)) : add2(arcPt(top, land.c, 112, lerp(u, easeOut(u), .25)), [sway, 0]);
    const rot = -TAU * ease(seg(u, 0, .8)) + land.rot * ease(seg(u, .5, 1)) + .25 * Math.sin(u * 13) * seg(u, .45, .7) * (1 - u);
    return { c, s: SNAIL.slipS * lerp(.5, 1, backOut(seg(s, 0, .2))), rot, flutter: seg(u, .45, .85) * (1 - seg(u, .85, 1)) };
  }
  function drawSlipFlight(t) {
    if (t < AT.slipPop || t >= AT.slipLand) return;
    const F = slipFlight(t, slipOnShell(snailState(AT.slipLand)));
    drawSlip(F.c, F.s, { rot: F.rot, flutter: F.flutter });
    ticks(t, AT.slipPop, [POP_FROM[0], POP_FROM[1] - 12], 5, 22, 10, 'slip pop', .16, -Math.PI / 2, 2.0);
  }

  function portholePop(t, o) {
    if (t < AT.pop - .02) return;
    poof(PORT_X + 4, ROAD - 44, .8, t - AT.pop, { key: 'intro port pop', life: .55 });
    ticks(t, AT.pop, [PORT_X + 10, ROAD - 50], 7, 44, 22, 'port', .22);
    if (t < AT.gone) speedLines(o.x + 70, o.y - 34, 220, [-1, 0], 1, { key: 'intro port zip', spread: 44 });
  }
  function drawSnail(t) {
    const o = snailState(t);
    if (t > AT.gone + .02 || cull(o.x - 80, o.y - 160, o.x + 80, o.y + 20)) { portholePop(t, o); return; }
    const zip = bump(t, AT.whizz, AT.atPort);
    if (zip > 0) speedLines(o.x + 60, o.y - 30, 260 * zip, [-1, 0], zip, { key: 'intro snail zip', spread: 50 });
    const S = snail(o.x, o.y, U, { ...o, blush: .5, boilKey: 'snail-req' });
    if (o.yawn > .05) yawnMouth(S.head, o.yawn, o.flip);
    if (t >= AT.turn && t < AT.turn + .5) poof(o.x + 30, o.y - 6, .32, t - AT.turn - .04, { key: 'intro snail turn', life: .4 });
    if (t >= AT.slipLand) {
      const R = slipOnShell(o), land = spring(t, AT.slipLand, 10, 30);
      drawSlip(R.c, SNAIL.slipS, { rot: R.rot, sx: R.sx + .12 * land, sy: R.sy - .18 * land });
    }
    if (o.x < X_PORT + 80) SETS.portholeFront();
    portholePop(t, o);
  }

  function paperOutside(cx, cy, rx, ry) {
    if (rx < 4) { paperVoid(); return; }
    const n = 44, pts = [];
    boilSeed('intro paper hole');
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU, rag = 1 + .05 * Math.sin(a * 5 + 1.3) + .035 * Math.sin(a * 13 + 4) + .025 * (hash(i * 3.7) - .5) + jit(.006);
      pts.push([cx + Math.cos(a) * rx * rag, cy + Math.sin(a) * ry * rag]);
    }
    flushBrush();
    push(); resetMatrix(); translate(-W / 2, -H / 2);
    beginClip({ invert: true });
    beginShape(); for (const [x, y] of pts) vertex(x, y); endShape(CLOSE);
    endClip();
    image(paperG, 0, 0);
    pop();
    boilSeed('intro paper tips');
    for (let i = 0; i < n; i++) {
      const [x, y] = pts[i];
      if (x < -60 || x > W + 60 || y < -60 || y > H + 60) continue;
      const dx = cx - x, dy = cy - y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d, tx = -uy, ty = ux;
      const len = 8 + 20 * hash(i * 2.7 + 1), wid = 8 + 10 * hash(i * 5.3);
      paint([[x - tx * wid - ux * 3, y - ty * wid - uy * 3], [x + ux * len, y + uy * len], [x + tx * wid - ux * 3, y + ty * wid - uy * 3]], { wash: PAL.paper, ink: null });
    }
    const edge = pts.concat([pts[0]]).filter(([x, y]) => x > -200 && x < W + 200 && y > -200 && y < H + 200);
    if (edge.length > 2) inkLine(edge, .6, mixCol(PAL.paper, '#A8977A', .45), 'inkfine', .4);
  }
  function paperOver(k) {
    if (k <= 0) return;
    flushLetters(); flushBrush();
    push(); resetMatrix(); translate(-W / 2, -H / 2); tint(255, 255 * clamp(k)); image(paperG, 0, 0); noTint(); pop();
  }

  function intro(t) {
    camBegin(...camAt(t));
    houseSet(t, { page: { parts: {}, t }, address: addressAt(t), clockWhizz: ease(seg(t, AT.whizz, AT.whizzEnd)), clockTime: 9.1 });
    progressBar(t);
    spinner(t);
    drawSnail(t);
    drawSlipFlight(t);
    drawHand(t);
    ticks(t, AT.click, CLICK, 6, 22, 12, 'click');
    ticks(t, AT.enter, ENTER, 7, 26, 16, 'enter', .2);
    returnArrow(t);
    camEnd();
    const open = lerp(ease(seg(t, -9.98, -9.58)), easeOut(seg(t, -9.98, -9.58)), .5);
    if (open < 1) paperOutside(W / 2 + 20, H / 2 - 40, 1450 * open, 870 * open);
    paperOver(ease(seg(t, AT.paper0, AT.paper1)));
  }

  shots([[-10, intro], [-8.5, intro], [-7, intro], [-5, intro], [-2, intro]]);
})();
