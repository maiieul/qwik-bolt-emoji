// schedule.js: the JS box queue and every snail, as pure functions of video time (see LIBRARY_SPEC.md).
(() => {
  const QUEUE = ['menu', 'heart', 'star', 'share', 'gear', 'cart'];
  const ROAD = WORLD.roadY, STOP = WORLD.snailStop, U = 20, GAP = 105;
  const RANK = { front: 2140, back: 2030 };
  const PACE = 128, RAMP_IN = .5, RAMP_OUT = .4, CRAWL_PX = 60;

  const SKIPS = [[32, 16.44], [48, 4.03]];
  const LAPSES = [[32, 32.25, 1.59, 'out'], [48.75, 49.45, 12.38, 'out']];
  function netTime(t) {
    let tau = t;
    for (const [at, d] of SKIPS) if (t >= at) tau += d;
    for (const [a, b, d, shape] of LAPSES) { const k = seg(t, a, b); tau += d * (shape === 'out' ? 1 - (1 - k) * (1 - k) : ease(k)); }
    return tau;
  }
  const WHIZZ = [[31.95, 32.5], [48.3, 49.4]];
  function clockWhizz(t) {
    const [a, b] = t < 40 ? WHIZZ[0] : WHIZZ[1];
    return ease(seg(t, a, b));
  }

  function travelled(dt, total) {
    if (dt <= 0) return 0;
    if (dt >= total) return 1;
    if (total <= RAMP_IN + RAMP_OUT) return ease(dt / total);
    const span = total - RAMP_IN / 2 - RAMP_OUT / 2;
    if (dt < RAMP_IN) return dt * dt / (2 * RAMP_IN) / span;
    if (dt < total - RAMP_OUT) return (dt - RAMP_IN / 2) / span;
    const r = total - dt;
    return clamp((span - r * r / (2 * RAMP_OUT)) / span);
  }
  function videoTimeOf(tau, lo, hi) {
    for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (netTime(m) < tau) lo = m; else hi = m; }
    return hi;
  }

  const NOOK = typeof SETS !== 'undefined' && SETS.nook ? SETS.nook : { x0: 4995, x1: 5175, y: ROAD };
  const BED = [[5150, 0], [5092, 0], [5034, 0], [5063, 1], [5121, 1], [5092, 2]];
  const bedXY = i => [BED[i][0], NOOK.y - BED[i][1] * 44];

  const SNAILS = {
    s1: { box: 'menu', shell: 'blue', rank: 'front', appear: -1, leave: 30.0, go: 30.4, arr: 32.25, stop: STOP, grab: 32.5, cubby: 33.0, bed: 0, wake: 28.1 },
    s2: { box: 'heart', shell: 'purple', rank: 'back', appear: -1, leave: 30.25, go: 30.65, arr: 32.5, stop: STOP - GAP, grab: 33.05, cubby: 33.5, bed: 1, wake: 28.35 },
    s3: { box: 'star', shell: 'teal', rank: 'front', appear: 32, leave: 32.25, go: 32.6, arr: 48.5, stop: STOP, grab: 48.55, cubby: 49.0, bed: 2, wake: 32.1, rest: 49.5 },
    s4: { box: 'share', shell: 'purple', rank: 'back', appear: 32, leave: 32.5, go: 32.85, arr: 55.5, stop: STOP, grab: 55.55, cubby: 56.0, bed: 4, wake: 32.3, slow: true, nap: [20, 6] },
    s5: { box: 'cart', shell: 'blue', rank: 'front', appear: 38, leave: 46.0, go: 47.0, arr: 49.75, stop: STOP - GAP, grab: 50.5, cubby: 51.0, bed: 3, wake: 45.75, plonk: true },
    s6: { box: 'gear', shell: 'teal', rank: 'back', appear: 38, leave: 48.5, go: 48.75, arr: 56.0, stop: STOP - GAP, grab: 56.05, cubby: 56.5, bed: 5, wake: 48.3 },
  };
  const IDS = Object.keys(SNAILS);
  const BY_BOX = {}; for (const id of IDS) BY_BOX[SNAILS[id].box] = id;
  for (const id of IDS) {
    const S = SNAILS[id];
    S.x0 = RANK[S.rank];
    S.dtau = netTime(S.arr) - netTime(S.go) - (S.nap ? S.nap[1] : 0);
    S.pace = (S.stop - S.x0) / (S.dtau - RAMP_IN / 2 - RAMP_OUT / 2);
    S.off = Math.max(S.grab + .15, S.rest || 0);
    S.bedAt = bedXY(S.bed);
    S.seed = IDS.indexOf(id) * 2.3 + 1;
    S.home = homeRun(S);
    S.abed = videoTimeOf(netTime(S.off) + S.home.total, S.off, S.off + 30);
  }

  function reachX(t) {
    if (t < 43.5 || t > 48) return null;
    if (t < 46) return t < 45.6 ? lerp(4820, 1560, ease(seg(t, 43.5, 45.6))) : lerp(1560, 1510, ease(seg(t, 45.6, 46)));
    if (t < 47.5) return lerp(1510, RANK.front, ease(seg(t, 46.5, 47)));
    return lerp(RANK.front, 4850, easeIn(seg(t, 47.5, 47.9)));
  }
  function passTime(xAt, from, to) {
    let prev = null;
    for (let t = from; t <= to + 1e-6; t += 1 / 48) {
      const h = reachX(t), d = h == null ? null : h - xAt(t);
      if (prev != null && d != null && Math.sign(d) !== Math.sign(prev)) return t;
      prev = d;
    }
    return null;
  }

  function travelPos(S, t) {
    let d = netTime(t) - netTime(S.go);
    if (S.nap) d -= clamp(d - S.nap[0], 0, S.nap[1]);
    return S.x0 + (S.stop - S.x0) * travelled(d, S.dtau);
  }
  function homeRun(S) {
    const [bx, by] = S.bedAt, road = Math.max(0, NOOK.x0 + 10 - S.stop);
    const run = road + Math.max(0, bx - (NOOK.x0 + 10)) + Math.abs(by - NOOK.y) * 1.6;
    return { road, run, total: run / PACE + RAMP_IN / 2 + RAMP_OUT / 2 };
  }
  function homeward(S, t) {
    const [bx, by] = S.bedAt, { road, run, total } = S.home, dist = travelled(netTime(t) - netTime(S.off), total) * run;
    if (dist <= road) return { x: S.stop + dist, y: ROAD, dist };
    const u = clamp((dist - road) / Math.max(1, run - road)), lift = by < NOOK.y ? Math.sin(Math.PI * Math.min(1, u * 1.3)) * 22 : 0;
    return { x: lerp(NOOK.x0 + 10, bx, u), y: lerp(NOOK.y, by, ease(u)) - lift, dist };
  }

  function snailAt(id, t) {
    const S = SNAILS[id];
    if (!S) return null;
    const base = { id, shell: S.shell, seed: S.seed, y: ROAD, carry: null, crawl: 0, visible: t >= S.appear, duck: 0, hide: 0, look: .3, lookY: 0, eyes: 'normal', mouth: null, sweat: 0, droop: S.slow ? .45 : 0, emote: null, sq: 0 };
    if (!base.visible) return { ...base, x: S.x0 };
    if (t < S.go) {
      const awake = seg(t, S.wake, S.wake + .35), dozing = 1 - awake;
      const o = { ...base, x: S.x0, hide: .38 * dozing, eyes: awake > .5 ? 'normal' : 'closed', droop: Math.max(base.droop, .6 * dozing), emote: dozing > .5 ? 'zzz' : null, look: awake > .5 ? .6 * Math.sin((t - S.wake) * 2.2) : 0, sq: .12 * spring(t, S.wake + .05, 7, 16) };
      if (t >= S.leave) o.lookY = -.6;
      const landed = t >= S.go - .02;
      if (landed) o.carry = S.box;
      return o;
    }
    if (t < S.off) {
      const x = t < S.arr ? travelPos(S, t) : S.stop;
      const o = { ...base, x, carry: t < S.grab + .1 ? S.box : null, crawl: (x - S.x0) / CRAWL_PX, look: .55 };
      if (S.plonk) o.sweat = seg(t, 48.9, 49.3) * (1 - seg(t, 50.8, 51.4));
      if (t >= S.arr) { o.sq = -.08 * spring(t, S.arr, 5, 13); o.look = t < S.grab ? -.2 : .8; o.lookY = t < S.grab + .3 ? -.7 : 0; }
      return withDuck(S, t, o);
    }
    const h = homeward(S, t), since = t - S.abed;
    const o = { ...base, x: h.x, y: h.y, crawl: (S.stop - S.x0 + h.dist) / CRAWL_PX, look: .5 };
    if (since >= 0) {
      o.nook = true;
      o.hide = .42 * ease(seg(since, 0, .6));
      o.eyes = since > .35 ? 'closed' : 'normal';
      o.droop = .6 * ease(seg(since, .2, .8));
      o.emote = since > 1.2 && (S.bed === 0 || S.bed === 3) ? 'zzz' : null;
    }
    return o;
  }
  const PASS = {};
  function withDuck(S, t, o) {
    if (t < 43.4 || t > 48.2) return o;
    const key = S.box;
    if (!(key in PASS)) {
      const xAt = tt => (tt < S.arr ? travelPos(S, tt) : S.stop);
      PASS[key] = [passTime(xAt, 43.5, 46.2), passTime(xAt, 47.45, 48)];
    }
    const [out, back] = PASS[key];
    let duck = 0, look = 0;
    if (out != null) {
      duck = Math.max(duck, ease(seg(t, out - .16, out)) * (1 - .62 * ease(seg(t, out + .3, out + 1))));
      look = seg(t, out + .3, out + .8);
    }
    if (back != null) duck = Math.max(duck, ease(seg(t, back - .12, back)) * (1 - ease(seg(t, back + .25, back + .6))));
    if (duck > .01) { o.duck = duck; o.lookY = -look; o.look = -.2 * look; }
    return o;
  }

  function carryPoint(id, t) {
    const s = snailAt(id, t);
    if (typeof snailCarry === 'function') return snailCarry(s.x, s.y, U, { crawl: s.crawl, duck: s.duck, hide: s.hide, sq: s.sq });
    return [s.x - 7.6, s.y - 56];
  }
  function cubbyBottom(kind) {
    const S = WORLD.shelf, ch = (S.y1 - S.y0) / 3, [cx, cy] = cubbyCentre(kind), row = WORLD.cubbies[kind][1];
    return [cx + (WORLD.cubbies[kind][0] ? -3 : 3), cy + ch / 2 - (row === 2 ? 12 : 6)];
  }
  function hopAmp(kind, t) {
    if (t < 28) return 0;
    const perk = seg(t, 28 + QUEUE.indexOf(kind) * .07, 28.35 + QUEUE.indexOf(kind) * .07);
    const eager = kind === 'cart' ? .35 * seg(t, 30.4, 30.8) * (1 - seg(t, 31.8, 32.2)) : 0;
    const calm = t > 32 ? .45 : .75;
    return perk * (calm + eager);
  }

  function box(kind, t) {
    const id = BY_BOX[kind], S = SNAILS[id], line = [WORLD.queueX[kind], ROAD];
    const out = { kind, where: 'line', x: line[0], y: line[1], snail: id, hop: hopAmp(kind, t), leap: 0, wobble: 0, rot: 0, squash: 0 };
    if (kind === 'gear' && t > 46.4 && t < 47.3) { out.wobble = 1 - seg(t, 47, 47.3); out.emote = '!'; out.emoteK = seg(t, 46.5, 46.65) * (1 - seg(t, 47.1, 47.3)); out.emoteAge = t - 46.5; }
    if (t < S.leave) { if (!S.plonk && t > S.leave - .12) { out.hop = 0; out.squash = .22 * ease(seg(t, S.leave - .12, S.leave)); } return out; }
    if (S.plonk && t < S.go) {
      const grab = seg(t, 46.2, 46.5), fly = seg(t, 46.5, 46.92), drop = seg(t, 46.92, 47);
      const to = carryPoint(id, S.go);
      if (fly <= 0) return { ...out, where: 'arm', hop: 0, y: line[1] - 6 * grab, squash: -.12 * grab };
      const lifted = [line[0], line[1] - 10], above = [to[0], to[1] - 26];
      const p = drop > 0 ? [lerp(above[0], to[0], drop), lerp(above[1], to[1], easeIn(drop))] : arcPt(lifted, above, 170, ease(fly));
      return { ...out, where: 'arm', hop: 0, x: p[0], y: p[1], rot: -.35 * Math.sin(Math.PI * fly) * (1 - drop), squash: drop > .6 ? .2 : -.1 * Math.sin(Math.PI * fly) };
    }
    if (!S.plonk && t < S.go) {
      const k = seg(t, S.leave, S.go), to = carryPoint(id, S.go), p = arcPt(line, to, 70 + (to[0] - line[0]) * .12, ease(k));
      return { ...out, x: p[0], y: p[1], hop: 0, leap: k, rot: -.3 * Math.sin(Math.PI * k), squash: -.14 * Math.sin(Math.PI * k) + .18 * Math.max(0, 1 - k * 6) };
    }
    if (t < S.grab + .1) { const [x, y] = carryPoint(id, t); return { ...out, where: 'snail', x, y, hop: 0 }; }
    if (t < S.cubby) {
      const k = seg(t, S.grab + .1, S.cubby), from = carryPoint(id, S.grab + .1), to = cubbyBottom(kind), p = arcPt(from, to, 60, ease(k));
      return { ...out, where: 'bolt', x: p[0], y: p[1], hop: 0, rot: .15 * Math.sin(Math.PI * k) };
    }
    const [x, y] = cubbyBottom(kind);
    return { ...out, where: 'cubby', x, y, hop: 0, squash: .12 * spring(t, S.cubby, 7, 18) };
  }

  function drawBox(b, key) {
    if (typeof jsBox === 'function') { jsBox(b.x, b.y, 1, b.kind, { hop: b.hop, wobble: b.wobble, rot: b.rot, squash: b.squash, emote: b.emote, emoteK: b.emoteK, emoteAge: b.emoteAge, key, noShadow: b.where !== 'line' && b.where !== 'cubby' || b.leap > 0 }); return; }
    boilSeed('sched box ' + key);
    paint(rrPts(b.x - 32, b.y - 56, 64, 56, 6), { wash: '#F7DF1E', ink: PAL.ink, sw: .9 });
  }
  function drawQueue(t, o = {}) {
    const where = o.where || ['line'];
    for (const kind of QUEUE.slice().reverse()) {
      const b = box(kind, t);
      if (!where.includes(b.where)) continue;
      if (b.where !== 'cubby' && typeof cull === 'function' && cull(b.x - 50, b.y - 80, b.x + 50, b.y + 10)) continue;
      drawBox(b, 'queue ' + kind);
    }
  }
  function placeholderSnail(s) {
    boilSeed('sched snail ' + s.id);
    const shell = { blue: '#18B6F6', purple: '#AC7EF4', teal: '#16B5A2' }[s.shell] || '#18B6F6';
    paint(rrPts(s.x - 45, s.y - 16, 95, 16, 8), { wash: '#F3C79E', ink: PAL.ink, sw: .8 });
    paint(ellPts(s.x - 8, s.y - 30 + 10 * s.duck, 27, 27, 18), { wash: shell, ink: PAL.ink, sw: .9 });
    if (s.carry) drawBox({ kind: s.carry, x: s.x - 8, y: s.y - 56, hop: 0 }, 'ride ' + s.id);
  }
  function drawSnails(t, filter) {
    for (const id of IDS) {
      if (Array.isArray(filter) && !filter.includes(id)) continue;
      const s = snailAt(id, t);
      if (!s.visible || (typeof filter === 'function' && !filter(id, s))) continue;
      if (typeof cull === 'function' && cull(s.x - 70, s.y - 140, s.x + 70, s.y + 20)) continue;
      if (typeof snail !== 'function') { placeholderSnail(s); continue; }
      snail(s.x, s.y, U, {
        shell: s.shell, crawl: s.crawl, carry: s.carry, duck: s.duck, hide: s.hide, sweat: s.sweat, droop: s.droop,
        eyes: s.eyes, mouth: s.mouth, lookX: s.look, lookY: s.lookY, seed: s.seed, sq: s.sq,
        emote: s.emote, emoteK: s.emote ? 1 : 0, emoteAge: t + s.seed, boilKey: 'snail-' + id,
      });
    }
  }

  const SHOTS_DBG = [
    ['D2', 28, 32, [1002, 2478]], ['D3', 32, 35, [4190, 6210]], ['E1-E4', 35, 44, [4190, 6210]], ['E5', 44, 48, [1330, 5170]],
    ['E6', 48, 50.5, [4190, 6210]], ['E7', 50.5, 54, [4190, 6210]], ['F1', 54, 58.5, [4190, 6210]],
  ];
  const CH = { x0: 70, x1: 1860, y0: 64, y1: 648, w0: 1400, w1: 5260, t0: 27.5, t1: 58.5 };
  const cx = wx => lerp(CH.x0, CH.x1, (wx - CH.w0) / (CH.w1 - CH.w0)), cy = t => lerp(CH.y0, CH.y1, (t - CH.t0) / (CH.t1 - CH.t0));
  const label = (txt, x, y, size = 15, col = PAL.ink, o = {}) => letter(txt, x, y, size, col, { ink: false, align: 'left', font: `${size}px system-ui, sans-serif`, ...o });
  const SHELL = { blue: '#18B6F6', purple: '#AC7EF4', teal: '#16B5A2' };
  function chart(t) {
    boilSeed('dbg chart');
    paint(rectPts(CH.x0 - 10, CH.y0 - 10, CH.x1 - CH.x0 + 20, CH.y1 - CH.y0 + 20), { wash: '#FBF7EF', ink: PAL.ink, sw: .5 });
    SHOTS_DBG.forEach(([name, a, b, [v0, v1]], i) => {
      paint(rectPts(cx(Math.max(CH.w0, v0)), cy(a), cx(Math.min(CH.w1, v1)) - cx(Math.max(CH.w0, v0)), cy(b) - cy(a)), { wash: i % 2 ? '#E7F1F8' : '#EEE8F7', ink: null });
      inkLine([[CH.x0, cy(a)], [CH.x1, cy(a)]], .3, '#9A90AE', 'inkfine', 0);
      label(name, CH.x0 + 4, cy(a) + 11, 13, '#6A6080');
    });
    for (const [at] of SKIPS) { inkLine([[CH.x0, cy(at)], [CH.x1, cy(at)]], .8, '#D8394E', 'inkfine', 0); label('time skip', CH.x1 - 70, cy(at) - 8, 12, '#D8394E'); }
    for (const [a, b] of WHIZZ) label('clock whizz', CH.x1 - 90, cy((a + b) / 2) + 4, 12, '#B07A2A');
    const marks = [[WORLD.dock.x0, 'dock'], [RANK.back, 'rank'], [4400, 'porthole'], [STOP, 'stop'], [NOOK.x0, 'nook']];
    for (const [wx, name] of marks) { inkLine([[cx(wx), CH.y0], [cx(wx), CH.y1]], .35, '#8C82A2', 'inkfine', 0); label(name, cx(wx) + 3, CH.y0 - 14, 12, '#6A6080'); }
    for (let tt = 28; tt <= 58; tt += 2) label(String(tt), CH.x0 - 34, cy(tt), 12, '#6A6080');
    for (const kind of QUEUE) label(kind, cx(WORLD.queueX[kind]) - 12, CH.y1 + 14, 11, '#6A6080');
    const R = []; for (let tt = 43.5; tt <= 48; tt += .05) { const h = reachX(tt); if (h != null) R.push([cx(h), cy(tt)]); }
    if (R.length > 1) inkLine(R, 1.6, '#7B55CF', 'inkfine', 0);
    for (const id of IDS) {
      const S = SNAILS[id], col = mixCol(SHELL[S.shell], PAL.ink, .15);
      let seg0 = [];
      const flush = () => { if (seg0.length > 1) inkLine(seg0, id === 's4' ? .9 : 1.2, col, 'inkfine', 0); seg0 = []; };
      let prevT = null;
      for (let tt = Math.max(CH.t0, S.appear); tt <= CH.t1; tt += .05) {
        const st = snailAt(id, tt);
        if (!st.visible) continue;
        if (prevT != null && SKIPS.some(([at]) => prevT < at && tt >= at)) flush();
        seg0.push([cx(st.x), cy(tt)]); prevT = tt;
      }
      flush();
      const ev = [[S.leave, '#E09612'], [S.arr, '#2E8B57'], [S.cubby, '#D8394E']];
      for (const [te, c] of ev) { const st = snailAt(id, te); paint(ellPts(cx(st.x), cy(te), 4, 4, 8), { wash: c, ink: null }); }
      const mid = snailAt(id, lerp(S.go, S.arr, .45)), tm = lerp(S.go, S.arr, .45);
      label(`${id} ${S.box} ${Math.round(S.pace)}px/s`, cx(mid.x) + 10, cy(tm) - 6, 12, col);
    }
    inkLine([[CH.x0, cy(t)], [CH.x1, cy(t)]], 1.2, '#1F7FC4', 'inkfine', 0);
    label(`t = ${t.toFixed(2)}  τ = ${netTime(t).toFixed(1)}`, CH.x0 + 60, cy(t) - 9, 13, '#1F7FC4');
  }
  function strip(t, x0, x1, sx, sy) {
    const zoom = 900 / (x1 - x0), wy = ROAD - 70;
    camBegin((x0 + x1) / 2 + (W / 2 - sx) / zoom, wy + (H / 2 - sy) / zoom, zoom);
    boilSeed('dbg road ' + x0);
    paint(rectPts(x0 - 20, ROAD - 230, x1 - x0 + 40, 330), { wash: '#F4EEE4', ink: null });
    paint(rectPts(x0 - 20, ROAD, x1 - x0 + 40, 88), { wash: '#D5EEF6', ink: PAL.ink, sw: .6 });
    if (x0 < WORLD.dock.x1) paint(rectPts(WORLD.dock.x0, ROAD, WORLD.dock.x1 - WORLD.dock.x0, 20), { wash: '#C99B67', ink: PAL.ink, sw: .6 });
    if (x1 > STOP) {
      paint(rectPts(STOP - 6, ROAD - 40, 12, 120), { wash: '#D5A44E', ink: PAL.ink, sw: .5 });
      paint(rectPts(NOOK.x0, NOOK.y, NOOK.x1 - NOOK.x0, 16), { wash: '#A26B42', ink: PAL.ink, sw: .6 });
      paint(rectPts(4396, ROAD - 150, 10, 300), { wash: '#B8A4C3', washOp: 160, ink: null });
    }
    drawQueue(t, { where: ['line', 'arm', 'bolt'] });
    drawSnails(t, (id, s) => s.x > x0 - 80 && s.x < x1 + 80);
    const h = reachX(t);
    if (h != null && h > x0 - 40 && h < x1 + 40) { boilSeed('dbg hand'); paint(ellPts(h, ROAD - 150, 16, 16, 12), { wash: '#FFFBF4', ink: PAL.ink, sw: .8 }); inkLine([[h, ROAD - 150], [h + (h < 3000 ? 300 : -300), ROAD - 175]], 1.4, '#7B55CF', 'inkfine', .3); }
    camEnd();
    label(`world x ${x0}–${x1}`, sx - 440, sy - 190, 13, '#6A6080', { screen: true });
  }
  LOOPS.scheduleDebug = t => {
    paint(rectPts(-50, -50, W + 100, H + 100), { wash: '#EFE9DE', ink: null });
    chart(t);
    if (t >= 43.5 && t < 48) { strip(t, 2500, 3500, 480, 930); strip(t, 3400, 4400, 1440, 930); }
    else { strip(t, 1450, 2450, 480, 930); strip(t, 4180, 5180, 1440, 930); }
  };
  LOOPS.scheduleDebug.len = 60;

  // p5's global mode rebinds window.box to its 3D primitive on start, so replace that primitive.
  if (typeof p5 === 'function' && p5.prototype) p5.prototype.box = box;
  Object.assign(window, { QUEUE, box, snailAt, drawQueue, drawSnails, netTime, clockWhizz, reachX });
})();
