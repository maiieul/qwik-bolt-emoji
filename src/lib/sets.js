(() => {
  const Wd = WORLD, TY = Wd.tubeY, TR = Wd.tubeR, ROAD = Wd.roadY;
  const REF = [3150, 380];
  const K = {
    sky: ['#D3E6F1', '#DDEBF1', '#E8F0EE', '#F2F1E6', '#F9EEDA'],
    cloud: '#FFFBF4', cloudSh: '#DCE4EE', cloudInk: '#9FB1C8',
    far: '#BCD2CE', farTex: '#A6C2BC', mid: '#A4C495', midTex: '#8EB282',
    near: '#98C272', nearDk: '#86B363', nearInk: '#4F7A3E', soil: '#79A65C',
    meadow: '#6C9C4C', meadowDk: '#58873F', blade: '#44703A',
    leaf: '#7FAE5C', leafDk: '#5F8E46', leafLt: '#A6CA7C', leafInk: '#3D5C33',
    bark: '#8A6244', barkDk: '#654731',
    wood: '#BE8E5C', woodDk: '#8C6442', woodLt: '#DDB482',
    deck: '#C99B67', deckDk: '#9C7049', fence: '#F1E7D3',
    mill: '#EEE2CB', millDk: '#D5C6AC', millRoof: '#C2604D', sail: '#FAF3E4',
    flower: ['#E9869B', '#F4CC52', '#FFF6E6', '#B99AE0'],
    glass: '#CDEEF8', glassSh: '#86C1D6', glassHi: '#FFFDF6', glassRim: '#E4F7FC',
    brass: '#D5A44E', brassDk: '#9C6B2B', brassLt: '#F6DC96',
    towerWall: '#4A4A80', towerWallDk: '#3A3A6C', slab: '#3E3F74', towerInk: '#1E1A33',
    room: '#212858', rack: '#191E4B', rackFace: '#222A5D', rackLine: '#333E7E',
    led: ['#61DEC7', '#83E28F', '#F5C04F', '#63C9F8'],
    shopWall: '#13173C', floor: '#5E3F35', floorDk: '#402B2A', plinth: '#4B4B70', plinthDk: '#3B3B5E',
    shelf: '#6C4C3B', shelfDk: '#4A3329', easel: '#7E5842', easelDk: '#5A3D2D',
    shade: '#E2A43E', shadeDk: '#B87A2A', bulb: '#FFEAA8', warm: '#FFC766',
    paper: '#B8A4C3', paperDk: '#AA95B7', trim: '#F2E8D8', trimDk: '#D9CAB2',
    plaster: '#EBDCC6', plasterDk: '#D2BFA3', roof: '#C9674F', roofDk: '#A24E3B', roofLt: '#DC8468',
    desk: '#BA8552', deskDk: '#94653F', deskLt: '#D39E68', deskInk: '#4A3024',
    shelfH: '#A26B42', shelfHDk: '#7E5132', cubby: '#2F2639', cubbyGhost: '#4A3D5A', cubbyLit: '#7A5A3E',
    frame: '#F4EFF9', frameBar: '#DDD4EB', pageBg: '#F6F1FC', url: '#FFFBF4', stand: '#CFC6DE', standDk: '#ABA1C0',
    mug: '#F7EFE2', pot: '#C8704A', potDk: '#A2553A', potLt: '#E08E66',
    daySky: '#CFE8F5', dayLow: '#F7EFD9', dayHill: '#A9CC8C', curtain: '#D9A3B0', curtainDk: '#BF8594',
  };

  const BRASS_SH = mixCol(K.brass, K.brassDk, .62);
  const seed = k => boilSeed('set ' + k);
  const FINE = () => lod() >= .5;
  const SW = s => s * Math.pow(lod(), -.5);
  const vis = (x0, y0, x1, y1) => !cull(x0, y0, x1, y1);
  const J = () => clamp(.9 / lod(), .5, 2.2);
  const R4 = (x0, y0, x1, y1) => { const j = J(); return [[x0 + jit(j), y0 + jit(j)], [x1 + jit(j), y0 + jit(j)], [x1 + jit(j), y1 + jit(j)], [x0 + jit(j), y1 + jit(j)]]; };
  const warned = {};
  function sibling(name, args, fallback) {
    const f = window[name];
    if (typeof f === 'function') {
      try { return f(...args); } catch (e) { if (!warned[name]) { warned[name] = 1; console.warn(`sets: ${name}() threw: ${e.message}`); } }
    }
    return fallback ? fallback() : undefined;
  }

  function wobble(R, j) {
    const step = 6, ctrl = [];
    for (let i = 0; i <= Math.ceil((R.length - 1) / step); i++) ctrl.push([jit(j), jit(j)]);
    return R.map(([x, y], i) => { const a = Math.floor(i / step), f = i / step - a, c0 = ctrl[a], c1 = ctrl[Math.min(ctrl.length - 1, a + 1)]; return [x + lerp(c0[0], c1[0], f), y + lerp(c0[1], c1[1], f)]; });
  }
  function ink(P, sw, col = PAL.ink, curv = .3, br = 'inkflat') {
    if (P.length < 2) return;
    const R = wobble(resample(P, 16), J()), per = 18;
    for (let i = 0; i < R.length - 1; i += per) {
      let j = Math.min(R.length, i + per + 1);
      if (R.length - j > 0 && R.length - j < 4) j = R.length;
      const c = R.slice(i, j);
      inkLine(c, sw, col, br, c.length > 2 ? curv : 0);
      if (j === R.length) break;
    }
  }
  const box = (x0, y0, x1, y1, sw, col = PAL.ink) => ink([[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]], sw, col, 0);

  function layer(d) {
    const [ox, oy] = par(d, REF), [x0, y0, x1, y1] = viewRect(60);
    return { ox, oy, x0: x0 - ox, x1: x1 - ox, y0: y0 - oy, y1: y1 - oy };
  }
  function blobPts(circles, n = 40) {
    let cx = 0, cy = 0; for (const [x, y] of circles) { cx += x; cy += y; } cx /= circles.length; cy /= circles.length;
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU, ux = Math.cos(a), uy = Math.sin(a);
      let best = 0;
      for (const [bx, by, r] of circles) {
        const dx = bx - cx, dy = by - cy, p = dx * ux + dy * uy, q = r * r - (dx * dx + dy * dy) + p * p;
        if (q >= 0) best = Math.max(best, p + Math.sqrt(q));
      }
      pts.push([cx + ux * best, cy + uy * best]);
    }
    return pts;
  }
  function offsets(C, w) {
    const n = C.length, L = [], R = [];
    for (let i = 0; i < n; i++) {
      const a = C[Math.max(0, i - 1)], b = C[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
      const ww = typeof w === 'function' ? w(i / (n - 1)) : w;
      L.push([C[i][0] + dy / d * ww, C[i][1] - dx / d * ww]); R.push([C[i][0] - dy / d * ww, C[i][1] + dx / d * ww]);
    }
    return { L, R };
  }

  let landKey = '';
  const frameKey = () => `${typeof frameCount === 'number' ? frameCount : 0}:${CAM ? [CAM.cx, CAM.cy, CAM.zoom, CAM.rot].map(v => v.toFixed(3)).join(',') : '-'}`;
  function outdoorsShows(x0, y0, x1, y1) {
    const [a, b, c, d] = viewRect(0);
    return a < x0 || c > x1 || b < y0 || d > y1;
  }

  const PORT = { c: [4415, 218], ro: [40, 128], ri: [26, 113] }, PORT_JOIN = 4448;
  const HORN = { c: [1250, 550], r: 50, rim: 1215 }, RISE = { x: 1300, y0: 550, y1: 330 }, EL1 = { c: [1360, 330], r: 60 };
  const EL2 = { c: [4958.6, 370], r: 100, turn: Math.PI / 4 }, NOZ = { from: [4958.6 + 100 * Math.sin(Math.PI / 4), 370 - 100 * Math.cos(Math.PI / 4)], to: Wd.nozzle };
  const PATH = (() => {
    const P = [], marks = {};
    const add = p => { const q = P[P.length - 1]; if (!q || Math.hypot(p[0] - q[0], p[1] - q[1]) > .5) P.push(p); };
    const line = (a, b, n) => { for (let i = 0; i <= n; i++) add([lerp(a[0], b[0], i / n), lerp(a[1], b[1], i / n)]); };
    const arc = ([cx, cy], r, a0, a1, n) => { for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n); add([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } };
    line([HORN.rim, 600], [1250, 600], 3);
    arc(HORN.c, HORN.r, Math.PI / 2, 0, 8);
    marks.riser = P.length - 1;
    line([RISE.x, RISE.y0], [RISE.x, RISE.y1], 11);
    arc(EL1.c, EL1.r, Math.PI, 1.5 * Math.PI, 10);
    marks.straight = P.length - 1;
    line([1360, TY], [EL2.c[0], TY], 180);
    marks.elbow = P.length - 1;
    arc(EL2.c, EL2.r, 1.5 * Math.PI, 1.5 * Math.PI + EL2.turn, 8);
    marks.nozzle = P.length - 1;
    line(NOZ.from, NOZ.to, 4);
    const S = [0]; for (let i = 1; i < P.length; i++) S.push(S[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
    return { P, S, len: S[S.length - 1], sRiser: S[marks.riser], sStraight: S[marks.straight], sElbow: S[marks.elbow], sNozzle: S[marks.nozzle] };
  })();
  const S_STRAIGHT = PATH.sStraight;
  function tubeAt(s) {
    const { P, S, len } = PATH;
    if (s <= 0 || s >= len) {
      const [a, b] = s <= 0 ? [P[0], P[1]] : [P[P.length - 2], P[P.length - 1]], d = Math.hypot(b[0] - a[0], b[1] - a[1]), over = s <= 0 ? s : s - len, base = s <= 0 ? a : b;
      return { x: base[0] + (b[0] - a[0]) / d * over, y: base[1] + (b[1] - a[1]) / d * over, a: Math.atan2(b[1] - a[1], b[0] - a[0]) };
    }
    let lo = 0, hi = S.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (S[m] <= s) lo = m; else hi = m; }
    const k = (s - S[lo]) / (S[hi] - S[lo] || 1), a = P[lo], b = P[hi];
    return { x: lerp(a[0], b[0], k), y: lerp(a[1], b[1], k), a: Math.atan2(b[1] - a[1], b[0] - a[0]) };
  }
  const tubeS = x => S_STRAIGHT + (x - 1360);
  function pathPart(s0, s1, step = 14) {
    const out = [];
    for (let s = s0; s < s1; s += step) { const p = tubeAt(s); out.push([p.x, p.y]); }
    const e = tubeAt(s1); out.push([e.x, e.y]);
    return out;
  }
  const RUNS = (() => {
    const cut = [1460, ...Wd.couplers.slice(1), PORT_JOIN];
    const runs = [{ key: 'riser', s0: PATH.sRiser, s1: tubeS(1382), box: [1250, 220, 1390, 560] }];
    for (let i = 0; i < cut.length - 1; i++) runs.push({ key: 'run' + cut[i], s0: tubeS(cut[i]), s1: tubeS(cut[i + 1]), box: [cut[i], TY - TR - 20, cut[i + 1], TY + TR + 20] });
    runs.push({ key: 'house', s0: tubeS(PORT_JOIN), s1: PATH.sElbow, box: [PORT_JOIN - 10, TY - TR - 20, 4970, TY + TR + 20] });
    return runs;
  })();

  function streak(P, w, col) {
    if (P.length < 2) return;
    const C = resample(P, 8), n = C.length;
    if (n < 3) return;
    const o = offsets(C, u => w / 2 * Math.pow(Math.sin(Math.PI * clamp(u, .04, .96)), .55));
    paint(o.L.concat(o.R.slice().reverse()), { wash: col, ink: null });
  }
  function glassBack(run) {
    const C = pathPart(run.s0, run.s1), dark = run.key === 'riser', { L, R } = offsets(C, TR);
    seed('glass back ' + run.key);
    paint(L.concat(R.slice().reverse()), { wash: dark ? '#E6E1F4' : K.glass, washOp: dark ? 62 : 112, ink: null });
    const o1 = offsets(C, TR * .98), o2 = offsets(C, TR * .72), o3 = offsets(C, TR * .86), edge = dark ? '#F2EEFA' : K.glassSh;
    paint(o1.R.concat(o2.R.slice().reverse()), { wash: edge, washOp: dark ? 70 : 85, ink: null });
    paint(o1.L.concat(o3.L.slice().reverse()), { wash: edge, washOp: dark ? 56 : 50, ink: null });
  }
  // tubeGlass() redraws every front piece, so keep them opaque.
  function glassFront(run) {
    const C = pathPart(run.s0, run.s1), n = C.length, dark = run.key === 'riser', { L, R } = offsets(C, TR);
    seed('glass front ' + run.key);
    const a = Math.max(1, Math.round(n * .05)), b = Math.max(a + 3, Math.round(n * .76));
    streak(offsets(C.slice(a, b), TR * .56).L, SW(7), K.glassHi);
    if (n > 14) streak(offsets(C.slice(b + 2, Math.min(n - 1, b + 6)), TR * .56).L, SW(5.5), K.glassHi);
    const c0 = Math.round(n * .2), c1 = Math.max(c0 + 3, Math.round(n * .66));
    streak(offsets(C.slice(c0, c1), TR * .79).R, SW(2.6), K.glassRim);
    if (dark || FINE()) {
      const rim = offsets(C, TR - SW(3.2));
      ink(rim.L, SW(.5), K.glassRim, .3);
      if (dark) ink(rim.R, SW(.5), K.glassRim, .3);
    }
    ink(L, SW(1.05)); ink(R, SW(1.05));
  }
  function coupler(x, big) {
    const h = big ? 70 : TR + 5, w = big ? 20 : 16;
    if (!vis(x - w - 4, TY - h - 4, x + w + 4, TY + h + 4)) return;
    seed('coupler ' + x);
    paint(rrPts(x - w, TY - h, 2 * w, 2 * h, 7), { wash: K.brass, ink: PAL.ink, sw: SW(.95) });
    paint(rrPts(x + w * .2, TY - h + 4, w * .62, 2 * h - 8, 4), { wash: BRASS_SH, ink: null });
    inkLine([[x - w * .5, TY - h + 9], [x - w * .55, TY], [x - w * .5, TY + h - 9]], SW(.8), K.brassLt, 'inkfine', .4);
    if (FINE()) {
      for (const y of [TY - h + 13, TY + h - 13]) paint(ellPts(x + w * .05, y, 3.4, 3.4, 8), { wash: K.brassDk, ink: null });
      inkLine([[x - w, TY - h * .55], [x, TY - h * .56], [x + w, TY - h * .55]], SW(.45), K.brassDk, 'inkfine', .3);
      inkLine([[x - w, TY + h * .55], [x, TY + h * .56], [x + w, TY + h * .55]], SW(.45), K.brassDk, 'inkfine', .3);
    }
  }
  function collar(x, y0, y1, w, key) {
    if (!vis(x - w, y0, x + w, y1)) return;
    seed('collar ' + key);
    paint(rrPts(x - w / 2, y0, w, y1 - y0, 6), { wash: K.brass, ink: PAL.ink, sw: SW(.9) });
    paint(rrPts(x, y0 + 4, w * .35, y1 - y0 - 8, 3), { wash: BRASS_SH, ink: null });
    if (FINE()) for (let y = y0 + 14; y < y1 - 8; y += 36) paint(ellPts(x - w * .18, y, 3, 3, 8), { wash: K.brassDk, ink: null });
  }
  const runVisible = r => vis(...r.box);
  function tubeRuns(which, part) {
    for (const r of RUNS) if (which(r) && runVisible(r)) (part === 'back' ? glassBack : glassFront)(r);
  }

  function horn(t, gulp = 0) {
    const g = 1 + .16 * gulp, cx = HORN.c[0], cy = HORN.c[1], r = HORN.r;
    const outer = [], inner = [];
    for (let i = 0; i <= 10; i++) { const a = i / 10 * Math.PI / 2; outer.push([cx + (r + TR * (1 + .08 * gulp)) * Math.cos(a), cy + (r + TR * (1 + .08 * gulp)) * Math.sin(a)]); inner.push([cx + (r - TR) * Math.cos(a), cy + (r - TR) * Math.sin(a)]); }
    const bellTop = [], bellBot = [], rimX = HORN.rim - 6 * gulp;
    for (let i = 0; i <= 8; i++) { const u = i / 8, x = lerp(1250, rimX, u), hw = (TR + 62 * Math.pow(u, 2.3)) * (i ? g : 1); bellTop.push([x, 600 - hw]); bellBot.push([x, 600 + hw]); }
    const body = [...outer, ...bellBot.slice(1), ...bellTop.slice().reverse().slice(0, -1), ...inner.slice().reverse()];
    seed('horn body');
    paint(body, { wash: K.brass, ink: PAL.ink, sw: SW(1.1) });
    paint([...outer.slice(2, 9).map(([x, y]) => [x - 14, y - 10]), ...outer.slice(2, 9).reverse()], { wash: BRASS_SH, ink: null });
    inkLine([[1262, 600 - TR - 6 - 10 * gulp], [1240, 600 - TR - 20 - 16 * gulp], [rimX + 12, 600 - TR - 50 - 20 * gulp]], SW(1.2), K.brassLt, 'inkfine', .5);
    const ry = (TR + 62) * g;
    seed('horn rim');
    paint(ellPts(rimX, 600, 30 * g, ry, 30), { wash: K.brass, ink: PAL.ink, sw: SW(1.1) });
    paint(ellPts(rimX - 3, 600, 21 * g, ry - 10, 26), { wash: '#2A1E1C', ink: null });
    paint(ellPts(rimX + 4, 600 + ry * .12, 13 * g, ry * .72, 20), { wash: '#3F2C24', ink: null });
    if (gulp > .05 && FINE()) {
      seed('horn suck');
      for (let i = 0; i < 4; i++) {
        const k = frac(t * 2.2 + i / 4), side = [-1.1, -.4, .35, 1][i], reach = 170 * (1 - k) + 40;
        const P0 = [rimX - 20 - reach, 600 + side * (40 + reach * .55)], P1 = [rimX - 20 - reach * .45, 600 + side * (26 + reach * .2)], P2 = [rimX - 26, 600 + side * 22];
        const a = Math.sin(Math.PI * k) * gulp;
        if (a > .08) streak([P0, P1, P2], SW(7) * a, PAL.cream);
      }
    }
    seed('riser collar');
    paint(rrPts(RISE.x - TR - 8, RISE.y0 - 16, 2 * TR + 16, 20, 6), { wash: K.brass, ink: PAL.ink, sw: SW(.9) });
  }

  function nozzle(t, bulge = 0) {
    const [bx, by] = NOZ.to;
    if (!vis(EL2.c[0] - 40, TY - TR - 40, bx + 90, by + 90)) return;
    seed('nozzle');
    const s0 = PATH.sElbow, s1 = PATH.len, n = 20, C = [];
    for (let i = 0; i <= n; i++) { const p = tubeAt(lerp(s0, s1, i / n)); C.push([p.x, p.y]); }
    const k0 = .52;
    const prof = u => {
      if (u < k0) return TR + 1;
      const v = (u - k0) / (1 - k0);
      return lerp(TR + 1, 22, Math.pow(v, .85)) * (1 + bulge * .8 * Math.sin(Math.PI * clamp(v * 1.08)));
    };
    const { L, R } = offsets(C, u => prof(u));
    paint(L.concat(R.slice().reverse()), { wash: K.brass, ink: PAL.ink, sw: SW(1.05) });
    const S = offsets(C, u => prof(u) * .98), S2 = offsets(C, u => prof(u) * .3);
    paint(S.R.slice(1, -1).concat(S2.R.slice(1, -1).reverse()), { wash: BRASS_SH, ink: null });
    inkLine(offsets(C.slice(2, n - 2), u => prof(lerp(.1, .9, u)) * .55).L, SW(1.1), K.brassLt, 'inkfine', .5);
    const [ex, ey] = C[0];
    seed('nozzle ring');
    paint(rrPts(ex - 9, ey - TR - 9, 18, 2 * TR + 18, 6), { wash: K.brass, ink: PAL.ink, sw: SW(.95) });
    paint(rrPts(ex + 1, ey - TR - 6, 7, 2 * TR + 12, 3), { wash: BRASS_SH, ink: null });
    const a = Math.atan2(by - C[n - 1][1], bx - C[n - 1][0]), mr = 26 * (1 + bulge * .3);
    push(); translate(bx, by); rotate(a);
    paint(ellPts(0, 0, 8, mr, 18), { wash: K.brass, ink: PAL.ink, sw: SW(.95) });
    paint(ellPts(2, 0, 4.5, mr - 7, 16), { wash: '#2A1E1C', ink: null });
    pop();
  }
  function tubeContents(t, items = []) {
    items.forEach((it, i) => {
      if (!it) return;
      if (typeof it === 'function') { it(SETS); return; }
      const p = it.s != null ? tubeAt(it.s) : tubeAt(tubeS(it.x)), sc = it.scale ?? 1, r = 80 * sc;
      if (cull(p.x - r, p.y - r, p.x + r, p.y + r)) return;
      seed('tube item ' + (it.key ?? i));
      const level = clamp(Math.abs(Math.cos(p.a)) * 1.6 - .6), floor = lerp(26 * sc, TR - 5, level), o = it.o || {};
      push(); translate(p.x, p.y); if (it.rot) rotate(it.rot);
      if (it.draw) it.draw(0, floor, p);
      else if (it.kind === 'parcel') sibling('parcel', [0, floor, sc, o], () => placeholderParcel(sc));
      else if (it.kind === 'envelope') sibling('envelope', [0, floor - 26 * sc, sc, o], () => placeholderEnvelope(sc));
      else if (it.kind === 'box') sibling('jsBox', [0, floor, sc, it.box || 'menu', o], () => placeholderBox(sc));
      pop();
    });
  }
  function placeholderParcel(s) { paint(rrPts(-34 * s, -58 * s, 68 * s, 52 * s, 6 * s), { wash: '#E8763A', ink: PAL.ink, sw: .9 }); inkLine([[0, -58 * s], [0, -32 * s], [0, -6 * s]], .8, PAL.cream, 'inkfine', 0); }
  function placeholderEnvelope(s) { paint(rrPts(-36 * s, -50 * s, 72 * s, 44 * s, 4 * s), { wash: PAL.cream, ink: PAL.ink, sw: .9 }); paint(ellPts(0, -28 * s, 8 * s, 8 * s, 12), { wash: QWIK.purple, ink: PAL.ink, sw: .6 }); }
  function placeholderBox(s) { paint(rrPts(-32 * s, -56 * s, 64 * s, 56 * s, 6 * s), { wash: '#F7DF1E', ink: PAL.ink, sw: .9 }); }

  function tubeGlass(t, o = {}) {
    towerWallSection();
    tubeRuns(() => true, 'front');
    for (const x of Wd.couplers) coupler(x, x === 1460);
    dockFront();
    collar(1382, TY - 64, TY + 64, 18, 'tower in');
    portholeFront();
    stopBand();
    if (vis(1150, 380, 1400, 760)) horn(t, o.funnelGulp || 0);
    nozzle(t, o.nozzleBulge || 0);
  }

  function sky() {
    const L = layer(.08), ys = [-1e5, -760, -260, 190, 470];
    push(); translate(L.ox, L.oy);
    for (let i = 0; i < ys.length; i++) {
      const y = ys[i];
      if (i && y > L.y1) break;
      const pts = [];
      for (let k = 0; k <= 12; k++) { const x = lerp(L.x0 - 60, L.x1 + 60, k / 12); pts.push([x, i ? y + 28 * Math.sin(x * .0021 + i * 1.7) + 12 * Math.sin(x * .0061 + i) : L.y0 - 60]); }
      pts.push([L.x1 + 60, L.y1 + 60], [L.x0 - 60, L.y1 + 60]);
      seed('sky ' + i);
      paint(pts, { wash: K.sky[i], ink: null });
    }
    pop();
  }
  function cloudShape(x, y, w, hv) {
    const n = 3 + Math.floor(hv * 2.99), bumps = [];
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1), r = w * (.17 + .12 * Math.sin(u * Math.PI) + .05 * hash(hv * 17 + i));
      bumps.push([x + (u - .5) * w * .7, y - r * .3 * Math.sin(u * Math.PI), r]);
    }
    const pts = [], m = 26, base = y + w * .07, x0 = x - w / 2, x1 = x + w / 2;
    for (let j = 0; j <= m; j++) {
      const px = lerp(x0, x1, j / m); let top = base;
      for (const [bx, by, r] of bumps) { const dx = px - bx; if (Math.abs(dx) < r) top = Math.min(top, by - Math.sqrt(r * r - dx * dx)); }
      pts.push([px, top]);
    }
    for (let j = m - 3; j >= 3; j -= 5) pts.push([lerp(x0, x1, j / m), base + 5 * Math.sin(j * 1.7)]);
    return { pts, base, x0, x1 };
  }
  function clouds(t) {
    const L = layer(.22), P = 1500;
    push(); translate(L.ox, L.oy);
    const puff = (x, y, w, hv) => {
      const { pts, base, x0, x1 } = cloudShape(x, y, w, hv);
      paint(pts, { wash: K.cloud, washOp: 235, ink: K.cloudInk, sw: SW(.5), curv: .2 });
      paint([[x0 + w * .1, base - w * .06], [x1 - w * .08, base - w * .05], [x1 - w * .14, base - 2], [x0 + w * .14, base - 2]], { wash: K.cloudSh, washOp: 170, ink: null, curv: .5 });
    };
    for (let c = Math.floor((L.x0 - 800) / P); c <= Math.floor((L.x1 + 800) / P); c++) {
      for (let k = 0; k < 3; k++) {
        const h1 = hash(c * 13.1 + k * 5.7 + 1), h2 = hash(c * 7.3 + k * 2.9 + 4), h3 = hash(c * 3.1 + k * 8.3 + 9), low = k === 2;
        if (low && h2 > .5) continue;
        const w = low ? 130 + 150 * h1 : 200 + 360 * h2, x = c * P + k * P * .37 + h1 * P * .3 + t * (5 + 6 * h3), y = low ? -70 + 130 * h3 : -860 + 700 * h3;
        if (x + w < L.x0 || x - w / 2 > L.x1 || y + 60 < L.y0 || y - w * .45 > L.y1) continue;
        seed(`cloud ${c} ${k}`);
        if (!low && h3 > .55) puff(x + w * .52, y + w * .1, w * .42, h2);
        puff(x, y, w, h1);
      }
    }
    pop();
  }
  const farTop = x => 560 + 46 * Math.sin(x * .0013 + 1) + 30 * Math.sin(x * .0031 + 2.2) + 12 * Math.sin(x * .0087 + .4);
  const midTop = x => 668 + 52 * Math.sin(x * .0017 + 3) + 30 * Math.sin(x * .0043 + .5) + 10 * Math.sin(x * .011 + 1.3);
  function hillBand(d, f, col, key, texCol) {
    const L = layer(d), step = Math.max(30, 34 / lod());
    const pts = [];
    for (let x = L.x0 - step; x <= L.x1 + step; x += step) pts.push([x, f(x)]);
    if (Math.min(...pts.map(p => p[1])) > L.y1) return L;
    pts.push([L.x1 + step, L.y1 + 80], [L.x0 - step, L.y1 + 80]);
    push(); translate(L.ox, L.oy);
    seed(key);
    paint(pts, { wash: col, ink: null });
    if (texCol) {
      seed(key + ' tex');
      paint(pts.map(([x, y], i) => i < pts.length - 2 ? [x, y + 34] : [x, y]), { wash: texCol, washOp: 110, ink: null });
      paint(pts, { fill: texCol, fillOp: 45, bleed: .02, tex: .45, border: .3, ink: null });
    }
    pop();
    return L;
  }
  function windmill(t, x, y, s) {
    seed('windmill');
    const body = [[x - 34 * s, y + 6], [x + 34 * s, y + 6], [x + 22 * s, y - 150 * s], [x - 22 * s, y - 150 * s]];
    paint(body, { wash: K.mill, ink: PAL.ink, sw: SW(.7) });
    paint([[x + 8 * s, y + 4], [x + 32 * s, y + 4], [x + 21 * s, y - 146 * s], [x + 8 * s, y - 146 * s]], { wash: K.millDk, washOp: 160, ink: null });
    paint([[x - 30 * s, y - 146 * s], [x + 30 * s, y - 146 * s], [x + 6 * s, y - 186 * s], [x - 6 * s, y - 186 * s]], { wash: K.millRoof, ink: PAL.ink, sw: SW(.7), curv: .3 });
    if (FINE()) paint(rrPts(x - 9 * s, y - 34 * s, 18 * s, 36 * s, 8 * s), { wash: K.woodDk, ink: PAL.ink, sw: SW(.5) });
    const hx = x, hy = y - 160 * s, a0 = t * .9;
    for (let i = 0; i < 4; i++) {
      const a = a0 + i * TAU / 4, c = Math.cos(a), sn = Math.sin(a), px = -sn, py = c, L1 = 16 * s, L2 = 118 * s, w = 20 * s;
      const q = (l, off) => [hx + c * l + px * off, hy + sn * l + py * off];
      paint([q(L1, 3 * s), q(L2, 3 * s), q(L2, w), q(L1 + 10 * s, w)], { wash: K.sail, ink: PAL.ink, sw: SW(.55) });
      if (FINE()) inkLine([q(L1, 0), q((L1 + L2) / 2, 0), q(L2 + 4 * s, 0)], SW(.6), K.woodDk, 'inkfine', 0);
    }
    paint(ellPts(hx, hy, 7 * s, 7 * s, 10), { wash: K.woodDk, ink: PAL.ink, sw: SW(.5) });
  }
  function board(a, b, w, col, sw = .8) {
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / d * w / 2, ny = (b[0] - a[0]) / d * w / 2;
    const P = [[a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny], [b[0] - nx, b[1] - ny], [a[0] - nx, a[1] - ny]];
    paint(P, { wash: col, ink: null });
    ink([P[0], P[1]], SW(sw)); ink([P[3], P[2]], SW(sw));
    inkLine([P[0], P[3]], SW(sw * .8), PAL.ink, 'inkflat', 0); inkLine([P[1], P[2]], SW(sw * .8), PAL.ink, 'inkflat', 0);
  }
  function nearGround() {
    const [x0, , x1, y1] = viewRect(60), step = Math.max(24, 30 / lod());
    const top = [];
    for (let x = x0 - step; x <= x1 + step; x += step) top.push([x, groundY(x)]);
    seed('ground');
    paint([...top, [x1 + step, y1 + 80], [x0 - step, y1 + 80]], { wash: K.near, ink: null });
    paint([...top.map(([x, y]) => [x, y + 26 + 10 * Math.sin(x * .01)]), [x1 + step, y1 + 80], [x0 - step, y1 + 80]], { wash: K.nearDk, washOp: 90, ink: null });
    paint([...top.map(([x, y]) => [x, y + 130 + 30 * Math.sin(x * .004)]), [x1 + step, y1 + 80], [x0 - step, y1 + 80]], { wash: K.soil, washOp: 110, ink: null });
    seed('ground wc');
    paint([...top, [x1 + step, y1 + 80], [x0 - step, y1 + 80]], { fill: K.nearDk, fillOp: 55, bleed: .02, tex: .5, border: .3, ink: null });
    ink(top.filter(([x]) => x > Wd.land.x0 - 40 && x < Wd.land.x1 + 40), SW(.85), K.nearInk, .4);
  }
  function tree(x, y, s, key) {
    if (!vis(x - 160 * s, y - 420 * s, x + 160 * s, y + 20)) return;
    seed('tree ' + key);
    paint(ellPts(x + 10 * s, y + 4, 110 * s, 12 * s, 16), { wash: K.nearInk, washOp: 60, ink: null });
    paint([[x - 16 * s, y + 4], [x - 11 * s, y - 120 * s], [x - 40 * s, y - 180 * s], [x - 30 * s, y - 186 * s], [x - 2 * s, y - 150 * s], [x + 22 * s, y - 196 * s], [x + 32 * s, y - 190 * s], [x + 12 * s, y - 118 * s], [x + 18 * s, y + 4]], { wash: K.bark, ink: PAL.ink, sw: SW(.8) });
    const crown = blobPts([[x - 70 * s, y - 230 * s, 80 * s], [x + 62 * s, y - 240 * s, 86 * s], [x, y - 300 * s, 100 * s], [x - 20 * s, y - 206 * s, 70 * s], [x + 30 * s, y - 330 * s, 60 * s]], 44);
    paint(crown, { wash: K.leaf, ink: K.leafInk, sw: SW(.9), curv: .3 });
    paint(blobPts([[x + 40 * s, y - 214 * s, 64 * s], [x - 36 * s, y - 206 * s, 56 * s], [x + 4 * s, y - 196 * s, 60 * s]], 24), { wash: K.leafDk, washOp: 170, ink: null });
    paint(blobPts([[x - 30 * s, y - 318 * s, 44 * s], [x + 6 * s, y - 336 * s, 36 * s]], 18), { wash: K.leafLt, washOp: 190, ink: null });
  }
  function fence(xa, xb) {
    if (!vis(xa - 20, 560, xb + 20, 960)) return;
    seed('fence');
    const posts = [];
    for (let x = xa; x <= xb; x += 46) posts.push([x, groundY(x)]);
    for (const [x, g] of posts) paint(R4(x - 5, g - 64, x + 5, g + 6), { wash: K.fence, ink: PAL.ink, sw: SW(.6) });
    for (const h of [22, 46]) {
      const rail = posts.map(([x, g]) => [x, g - h]);
      paint(ribbon(rail, 8, 8), { wash: K.fence, ink: null });
      ink(offsets(rail, 4).L, SW(.55)); ink(offsets(rail, 4).R, SW(.55));
    }
  }
  function bush(x, y, s, key) {
    if (!vis(x - 90 * s, y - 90 * s, x + 90 * s, y + 10)) return;
    seed('bush ' + key);
    const c = [[x - 44 * s, y - 26 * s, 34 * s], [x, y - 44 * s, 42 * s], [x + 42 * s, y - 24 * s, 32 * s], [x - 10 * s, y - 16 * s, 30 * s]];
    const P = blobPts(c, 30).map(([px, py]) => [px, Math.min(py, y + 2)]);
    paint(P, { wash: K.leafDk, ink: K.leafInk, sw: SW(.8), curv: .3 });
    paint(blobPts([[x - 14 * s, y - 52 * s, 22 * s], [x + 16 * s, y - 50 * s, 18 * s]], 16), { wash: K.leaf, ink: null });
  }
  function trestle(x) {
    const top = TY + TR + 4, gl = groundY(x - 72), gr = groundY(x + 72);
    if (!vis(x - 110, top - 12, x + 110, Math.max(gl, gr) + 24)) return;
    seed('trestle ' + x);
    const A0 = [x - 20, top], A1 = [x - 72, gl + 8], B0 = [x + 20, top], B1 = [x + 72, gr + 8];
    const on = (P, Q, y) => [lerp(P[0], Q[0], (y - P[1]) / (Q[1] - P[1])), y];
    const low = Math.min(gl, gr), y1 = lerp(top, low, .26), y2 = lerp(top, low, .7);
    if (lod() > .45) { board(on(A0, A1, y1), on(B0, B1, y2), 7, K.woodDk, .6); board(on(B0, B1, y1), on(A0, A1, y2), 7, K.woodDk, .6); }
    board(on(A0, A1, y2 + 26), on(B0, B1, y2 + 26), 9, K.woodDk, .6);
    board(A0, A1, 17, K.wood); board(B0, B1, 17, K.wood);
    if (lod() > .45) for (const [P, Q] of [[A0, A1], [B0, B1]]) inkLine([on(P, Q, top + 30), on(P, Q, (top + low) / 2), on(P, Q, low - 20)].map(([px, py]) => [px + 3, py]), SW(.5), K.woodLt, 'inkfine', 0);
    paint(rrPts(x - 40, top - 10, 80, 20, 6), { wash: K.woodDk, ink: PAL.ink, sw: SW(.8) });
    for (const [fx, fy] of [A1, B1]) paint(ellPts(fx, fy + 2, 20, 9, 12), { wash: '#A9A39A', ink: PAL.ink, sw: SW(.6) });
  }
  function dockBack(t) {
    const { x0, x1 } = Wd.dock, bot = ROAD + 26;
    if (!vis(x0 - 40, 40, x1 + 40, 960)) return;
    seed('dock posts');
    const posts = [1575, 1805];
    const gA = groundY(posts[0]), gB = groundY(posts[1]), yA = TY + TR + 36, yB = Math.min(gA, gB) - 50;
    if (yB > yA + 80 && lod() > .45) { board([posts[0], yA], [posts[1], yB], 8, K.deckDk, .6); board([posts[0], yB], [posts[1], yA], 8, K.deckDk, .6); }
    for (const [x, g] of [[posts[0], gA], [posts[1], gB]]) {
      board([x, bot - 4], [x, g + 8], 20, K.deck);
      paint(ellPts(x, g + 8, 22, 9, 12), { wash: '#A9A39A', ink: PAL.ink, sw: SW(.6) });
    }
    seed('dock knees');
    for (const x of posts) for (const s of [-1, 1]) board([x + s * 64, bot - 3], [x + s * 6, bot + 62], 9, K.deckDk, .6);
    paint([[1460, bot - 2], [1512, bot - 2], [1460, bot + 56]], { wash: K.deckDk, ink: PAL.ink, sw: SW(.8) });
    if (FINE()) {
      seed('dock lantern');
      const lx = 1502, ly = 70;
      inkLine([[1458, ly - 22], [1482, ly - 26], [lx, ly - 24]], SW(1.6), K.towerInk, 'inkflat', .3);
      inkLine([[1458, ly + 6], [1472, ly - 10], [1484, ly - 24]], SW(1.1), K.towerInk, 'inkflat', .3);
      inkLine([[lx, ly - 24], [lx, ly - 14]], SW(1), K.towerInk, 'inkflat', 0);
      paint([[lx - 17, ly - 12], [lx + 17, ly - 12], [lx, ly - 26]], { wash: K.brassDk, ink: PAL.ink, sw: SW(.7) });
      paint(rrPts(lx - 13, ly - 12, 26, 32, 6), { wash: '#FFE9B0', ink: PAL.ink, sw: SW(.8) });
      paint(R4(lx - 11, ly + 18, lx + 11, ly + 23), { wash: K.brassDk, ink: null });
      glow(lx, ly + 4, 80, '#FFD27A', .55 + .08 * Math.sin(t * 3));
    }
  }
  function dockFront() {
    const { x0, x1 } = Wd.dock, top = ROAD, bot = ROAD + 26;
    if (!vis(x0 - 10, top - 10, x1 + 10, bot + 10)) return;
    seed('dock deck');
    paint(R4(x0 - 8, top, x1 + 6, bot), { wash: K.deck, ink: null });
    paint(R4(x0 - 8, bot - 8, x1 + 6, bot), { wash: mixCol(K.deck, K.deckDk, .55), ink: null });
    box(x0 - 8, top, x1 + 6, bot, SW(1));
    if (!FINE()) return;
    seed('dock planks');
    for (let x = x0 + 36; x < x1; x += 52) {
      inkLine([[x, top + 2], [x + 1, bot - 2]], SW(.55), K.deckDk, 'inkfine', 0);
      paint(ellPts(x - 7, top + 7, 1.8, 1.8, 6), { wash: K.deckDk, ink: null });
    }
  }
  const meadowTop = x => 1168 + 26 * Math.sin(x * .0037 + 1) + 14 * Math.sin(x * .011 + 2);
  function bushMeadow(x, y, s) {
    const c = [[x - 40 * s, y - 20 * s, 30 * s], [x, y - 40 * s, 40 * s], [x + 40 * s, y - 22 * s, 30 * s]];
    paint(blobPts(c, 26).map(([px, py]) => [px, Math.min(py, y + 4)]), { wash: K.meadowDk, ink: K.blade, sw: SW(.7), curv: .3 });
    paint(blobPts([[x - 12 * s, y - 50 * s, 18 * s], [x + 14 * s, y - 46 * s, 14 * s]], 14), { wash: K.meadow, ink: null });
  }
  function meadow(t) {
    const L = layer(1.3), step = Math.max(28, 40 / lod());
    const edge = [];
    for (let x = L.x0 - step; x <= L.x1 + step; x += step) edge.push([x, meadowTop(x)]);
    if (Math.min(...edge.map(p => p[1])) - 120 > L.y1) return;
    push(); translate(L.ox, L.oy);
    seed('meadow');
    paint([...edge, [L.x1 + step, L.y1 + 80], [L.x0 - step, L.y1 + 80]], { wash: K.meadow, ink: null });
    paint([...edge.map(([x, y]) => [x, y + 60 + 16 * Math.sin(x * .006)]), [L.x1 + step, L.y1 + 80], [L.x0 - step, L.y1 + 80]], { wash: K.meadowDk, washOp: 120, ink: null });
    seed('meadow wc');
    paint([...edge, [L.x1 + step, L.y1 + 80], [L.x0 - step, L.y1 + 80]], { fill: K.meadowDk, fillOp: 60, bleed: .02, tex: .5, border: .35, ink: null });
    ink(edge, SW(.85), K.blade, .4);
    const P = lod() >= .5 ? 64 : 120, wx0 = Wd.land.x0 + 150 - L.ox, wx1 = Wd.land.x1 - 150 - L.ox;
    const Q = lod() >= .5 ? 80 : 130;
    for (let i = Math.floor(Math.max(L.x0, wx0) / Q); i <= Math.floor(Math.min(L.x1, wx1) / Q); i++) {
      const x = i * Q + hash(i * 4.7 + 1) * Q, y = meadowTop(x) + 80 + 380 * hash(i * 2.3 + 8);
      if (y > L.y1 + 30 || x < wx0 || x > wx1) continue;
      seed('meadow speck ' + i);
      if (hash(i * 6.1) < .5) {
        inkLine([[x - 6, y + 4], [x - 9, y - 12], [x - 13, y - 20]], SW(.8), K.blade, 'inkfine', .5);
        inkLine([[x + 2, y + 4], [x + 4, y - 14], [x + 8, y - 22]], SW(.8), K.blade, 'inkfine', .5);
      } else paint(ellPts(x, y, SW(5.5), SW(5.5), 8), { wash: K.flower[Math.floor(hash(i * 3.9) * 4)], ink: null });
    }
    for (let i = Math.floor((Math.max(L.x0, wx0) - 60) / P); i <= Math.floor((Math.min(L.x1, wx1) + 60) / P); i++) {
      const h = hash(i * 3.3 + .7), x = i * P + h * P * .6, y = meadowTop(x) + 5;
      if (x < wx0 || x > wx1) continue;
      const tall = 34 + 70 * hash(i * 1.9 + 5), sway = 5 * Math.sin(t * 1.4 + i * .7);
      seed('tuft ' + i);
      if (hash(i * 8.3 + 2) > .86) { bushMeadow(x, y, 1 + .4 * hash(i)); continue; }
      const blades = [], nb = 5;
      for (let b = 0; b < nb; b++) {
        const u = b / (nb - 1) - .5, bh = tall * (1 - Math.abs(u) * .6) * (.75 + .45 * hash(i * 7 + b));
        blades.push([x + u * 30 - 5, y], [x + u * 52 + sway * (1 - Math.abs(u)), y - bh], [x + u * 30 + 5, y]);
      }
      paint(blades, { wash: K.meadowDk, ink: K.blade, sw: SW(.6) });
      if (hash(i * 5.1) > .5) {
        const fx = x + 24 * (hash(i * 9.1) - .3), fy = y - tall * .9, col = K.flower[Math.floor(hash(i * 2.7) * 4)];
        inkLine([[fx, y], [fx + 2, (y + fy) / 2], [fx + sway * .6, fy]], SW(.7), K.blade, 'inkfine', .4);
        const r = lod() >= .5 ? 8 : 11;
        paint(ellPts(fx + sway * .6, fy, r, r, 10), { wash: col, ink: PAL.ink, sw: SW(.45) });
        if (lod() >= .5) paint(ellPts(fx + sway * .6, fy, r * .38, r * .38, 8), { wash: '#F4B942', ink: null });
      }
    }
    pop();
  }
  function groundDetails(t) {
    if (!FINE()) return;
    const [vx0, , vx1] = viewRect(40);
    const P = 150;
    for (let i = Math.floor(Math.max(vx0, Wd.land.x0 + 40) / P); i <= Math.floor(Math.min(vx1, Wd.land.x1 - 40) / P); i++) {
      const x = i * P + hash(i * 1.3) * P * .7, g = groundY(x);
      if (!vis(x - 20, g - 40, x + 20, g + 10)) continue;
      seed('gtuft ' + i);
      const col = K.flower[Math.floor(hash(i * 4.1) * 4)];
      inkLine([[x - 9, g + 2], [x - 12, g - 14], [x - 16, g - 22]], SW(.6), K.nearInk, 'inkfine', .5);
      inkLine([[x - 2, g + 2], [x, g - 16], [x + 3, g - 28]], SW(.6), K.nearInk, 'inkfine', .5);
      inkLine([[x + 6, g + 2], [x + 10, g - 12], [x + 15, g - 19]], SW(.6), K.nearInk, 'inkfine', .5);
      if (hash(i * 6.7) > .5) paint(ellPts(x + 3, g - 30, 5, 5, 8), { wash: col, ink: PAL.ink, sw: SW(.35) });
    }
  }

  function sun(t) {
    const L = layer(.06), x = 4300, y = -660, r = 64;
    if (x + 160 < L.x0 || x - 160 > L.x1 || y + 160 < L.y0 || y - 160 > L.y1) return;
    push(); translate(L.ox, L.oy);
    seed('sun');
    paint(ellPts(x, y, r * 1.75, r * 1.75, 36), { wash: '#FFF6DF', washOp: 150, ink: null });
    paint(ellPts(x, y, r * 1.3, r * 1.3, 32), { wash: '#FFF0CC', washOp: 170, ink: null });
    paint(ellPts(x, y, r, r, 30), { wash: '#FFE7A8', ink: '#E9C07A', sw: SW(.6) });
    glow(x, y, r * 3, '#FFF1C2', .35);
    pop();
  }
  function birds(t) {
    const L = layer(.3);
    push(); translate(L.ox, L.oy);
    for (let i = 0; i < 4; i++) {
      const bx = 2350 + i * 170 + 70 * hash(i * 3.1) + t * 22, by = -230 + 70 * hash(i * 7.7) + 8 * Math.sin(t * 1.3 + i * 2);
      if (bx + 30 < L.x0 || bx - 30 > L.x1 || by + 30 < L.y0 || by - 30 > L.y1) continue;
      const flap = Math.sin(t * 7 + i * 1.9), s = .8 + .4 * hash(i * 5.3), w = 16 * s, h = (7 + 7 * flap) * s;
      seed('bird ' + i);
      inkLine([[bx - w, by - h], [bx - w * .45, by - h * .35 - 2], [bx, by + 2], [bx + w * .45, by - h * .35 - 2], [bx + w, by - h]], SW(1.1), '#5A5870', 'inkfine', .5);
    }
    pop();
  }
  function path() {
    const P = [[1470, 996], [1720, 1052], [2100, 1018], [2480, 1074], [2880, 1030], [3280, 1086], [3680, 1040], [4060, 1072], [4396, 1032]];
    if (!vis(1440, 960, 4420, 1130)) return;
    const C = through(P, 8), w = u => 26 + 12 * Math.sin(u * 17) + 6 * Math.sin(u * 41);
    const { L, R } = offsets(C, w);
    seed('path');
    paint(L.concat(R.slice().reverse()), { wash: '#E3CD9C', ink: null });
    paint(offsets(C, u => w(u) * .5).R.concat(R.slice().reverse()), { wash: '#D2B784', washOp: 150, ink: null });
    ink(L, SW(.6), '#A8895A', .4); ink(R, SW(.6), '#A8895A', .4);
    if (FINE()) for (let i = 2; i < C.length - 2; i += 5) {
      const [px, py] = C[i];
      if (!vis(px - 10, py - 10, px + 10, py + 10)) continue;
      paint(ellPts(px + 8 * Math.sin(i), py + 6 * Math.cos(i * 1.3), 5, 3.5, 8), { wash: '#B9A27A', ink: null });
    }
  }
  function landSet(t, o = {}) {
    const key = frameKey();
    if (landKey === key) return;
    landKey = key;
    sky();
    sun(t);
    clouds(t);
    birds(t);
    hillBand(.35, farTop, K.far, 'far hills', K.farTex);
    const M = hillBand(.7, midTop, K.mid, 'mid hills', K.midTex);
    const mx = 4140;
    if (mx + 140 > M.x0 && mx - 140 < M.x1) { push(); translate(M.ox, M.oy); windmill(t, mx, midTop(mx) + 4, .9); pop(); }
    nearGround();
    path();
    groundDetails(t);
    tree(2660, groundY(2660), 1, 'land');
    fence(3060, 3340);
    for (const [bx, bs] of [[2230, .9], [3170, .7], [3560, 1.1], [4130, .8], [1990, .7]]) bush(bx, groundY(bx) + 6, bs, bx);
    for (const x of Wd.couplers.slice(1, 6)) trestle(x);
    dockBack(t);
    tubeRuns(r => r.key.startsWith('run'), 'back');
    tubeRuns(r => r.key.startsWith('run'), 'front');
    for (const x of Wd.couplers) coupler(x, x === 1460);
    dockFront();
    if (o.meadow !== false) meadow(t);
  }
  function ensureLand(t, o, box4) {
    if (o.land === false || !outdoorsShows(...box4)) return;
    landSet(t, o.land || {});
  }

  const TW = Wd.tower, SH = Wd.shop;
  const FLOORS = [{ y0: -380, y1: -150 }, { y0: -120, y1: 140 }];
  const SHELF_SLOTS = {
    header: [150, 400, 276, 438], hero: [290, 370, 414, 438],
    card: [150, 478, 276, 548], skeleton: [290, 500, 414, 548],
    footer: [150, 622, 276, 658],
  };

  function towerTree(t) {
    if (!vis(-420, 300, 100, 960)) return;
    tree(-80, SH.floor, 1.45, 'tower');
  }
  function rack(x, y1, w, h, i, t, dim = 1) {
    seed('rack ' + i);
    paint(R4(x, y1 - h, x + w, y1), { wash: K.rack, ink: null });
    if (!FINE()) return;
    paint(R4(x + 6, y1 - h + 6, x + w - 6, y1 - 4), { wash: K.rackFace, ink: null });
    for (let u = 1; u < 5; u++) { const y = y1 - h + u * h / 5; inkLine([[x + 8, y], [x + w - 8, y]], .5, K.rackLine, 'inkfine', 0); }
    for (let u = 0; u < 5; u++) {
      const y = y1 - h + (u + .5) * h / 5, f = .08 + .1 * hash(i * 9 + u), ph = hash(i * 3.3 + u * 1.7);
      const b = Math.pow(.5 + .5 * Math.sin((t * f + ph) * TAU), 3) * dim, col = K.led[Math.floor(hash(i * 5 + u) * 4)];
      paint(ellPts(x + w - 16, y, 3.2, 3.2, 8), { wash: mixCol(K.rackLine, col, .35 + .65 * b), ink: null });
      if (hash(i * 7 + u) > .5) paint(ellPts(x + w - 28, y, 2.6, 2.6, 8), { wash: mixCol(K.rackLine, K.led[(u + i) % 4], .3 + .5 * (1 - b)), ink: null });
    }
  }
  function towerShell(t) {
    seed('tower rooms');
    paint(R4(TW.x0, TW.roof, TW.x1, SH.floor), { wash: K.room, ink: null });
    if (vis(SH.x0, -400, SH.x1, 150)) {
      FLOORS.forEach((f, j) => {
        if (!vis(SH.x0, f.y0, SH.x1, f.y1)) return;
        for (let i = 0; i < 8; i++) {
          const x = 150 + i * 150 + (j ? 40 : 0);
          if (x + 118 > (j ? 1300 : SH.x1 - 20) || !vis(x, f.y0, x + 118, f.y1)) continue;
          rack(x, f.y1, 118, f.y1 - f.y0 - 34, j * 10 + i, t, .8);
        }
        if (FINE()) {
          seed('ladder ' + j);
          const lx = j ? 1320 : 175, ly0 = f.y0 - 30, ly1 = f.y1;
          if (j) {
            inkLine([[lx, ly0], [lx, (ly0 + ly1) / 2], [lx, ly1]], 1.4, K.woodDk, 'inkflat', 0);
            inkLine([[lx + 34, ly0], [lx + 34, (ly0 + ly1) / 2], [lx + 34, ly1]], 1.4, K.woodDk, 'inkflat', 0);
            for (let y = ly0 + 20; y < ly1; y += 34) inkLine([[lx, y], [lx + 34, y]], 1, K.woodDk, 'inkflat', 0);
          }
        }
      });
    }
  }
  function towerWallSection() {
    if (!vis(1370, TY - 90, 1470, TY + 90)) return;
    seed('tower right wall');
    paint(R4(SH.x1, TW.roof, TW.x1, 972), { wash: K.towerWall, ink: null });
    if (FINE()) for (let y = TW.roof + 50; y < 972; y += 64) inkLine([[SH.x1 + 6, y], [TW.x1 - 6, y + 2]], .5, K.towerWallDk, 'inkfine', 0);
    ink([[SH.x1, TW.roof + 40], [SH.x1, SH.floor]], SW(1.1), K.towerInk, 0); ink([[TW.x1, TW.roof], [TW.x1, 972]], SW(1.3), K.towerInk, 0);
  }
  function towerSections(t) {
    seed('tower walls');
    const wall = K.towerWall;
    paint(R4(TW.x0, TW.roof, SH.x0, 972), { wash: wall, ink: null });
    paint(R4(TW.x0, TW.roof, TW.x1, FLOORS[0].y0), { wash: wall, ink: null });
    paint(R4(TW.x0, FLOORS[0].y1, TW.x1, FLOORS[1].y0), { wash: wall, ink: null });
    paint(R4(TW.x0, FLOORS[1].y1, TW.x1, SH.y0), { wash: wall, ink: null });
    if (FINE()) {
      for (let y = TW.roof + 50; y < 972; y += 64) inkLine([[TW.x0 + 6, y], [SH.x0 - 6, y + 2]], .5, K.towerWallDk, 'inkfine', 0);
      for (const [y0, y1] of [[FLOORS[0].y1, FLOORS[1].y0], [FLOORS[1].y1, SH.y0]]) inkLine([[SH.x0, (y0 + y1) / 2], [(SH.x0 + SH.x1) / 2, (y0 + y1) / 2 + 2], [SH.x1, (y0 + y1) / 2]], .5, K.towerWallDk, 'inkfine', .2);
    }
    towerWallSection();
    const sw = SW(1.1), c = K.towerInk;
    for (const f of FLOORS) if (vis(SH.x0, f.y0, SH.x1, f.y1)) box(SH.x0, f.y0, SH.x1, f.y1, sw, c);
    box(SH.x0, SH.y0, SH.x1, SH.floor, sw, c);
    ink([[TW.x0, 972], [TW.x0, TW.roof], [TW.x1, TW.roof]], SW(1.3), c, 0);
    seed('tower floor');
    paint(R4(TW.x0, SH.floor, TW.x1, 972), { wash: K.floor, ink: null });
    if (FINE()) for (let x = SH.x0 + 70; x < SH.x1; x += 120) inkLine([[x, SH.floor + 3], [x + 1, 969]], .6, K.floorDk, 'inkfine', 0);
    box(TW.x0, SH.floor, TW.x1, 972, SW(1.1), c);
    seed('tower plinth');
    paint(R4(TW.x0 - 24, 972, TW.x1 + 24, 1052), { wash: K.plinth, ink: null });
    if (FINE()) for (let x = TW.x0 + 60; x < TW.x1; x += 150) { inkLine([[x, 974], [x + 2, 1010]], .6, K.plinthDk, 'inkfine', 0); inkLine([[x + 75, 1012], [x + 76, 1050]], .6, K.plinthDk, 'inkfine', 0); }
    if (FINE()) inkLine([[TW.x0 - 20, 1011], [(TW.x0 + TW.x1) / 2, 1012], [TW.x1 + 20, 1011]], .6, K.plinthDk, 'inkfine', .2);
    box(TW.x0 - 24, 972, TW.x1 + 24, 1052, SW(1.1), c);
  }
  function rooftop(t) {
    if (!vis(TW.x0, TW.roof - 360, TW.x1, TW.roof)) return;
    seed('roof parapet');
    paint(R4(TW.x0 - 12, TW.roof - 28, TW.x1 + 12, TW.roof + 6), { wash: K.towerWallDk, ink: PAL.ink, sw: SW(1) });
    seed('antenna');
    const ax = 980, ay = TW.roof - 28;
    ink([[ax, ay], [ax, ay - 250]], SW(2.2), K.towerInk, 0);
    ink([[ax - 40, ay], [ax, ay - 150], [ax + 40, ay]], SW(1.1), K.towerInk, 0);
    ink([[ax - 26, ay - 70], [ax + 26, ay - 70]], SW(.9), K.towerInk, 0);
    const blink = Math.pow(.5 + .5 * Math.sin(t * TAU * .5), 4);
    paint(ellPts(ax, ay - 258, 9, 9, 12), { wash: mixCol('#8A3A3A', '#FF7A6A', blink), ink: PAL.ink, sw: SW(.7) });
    if (blink > .05) glow(ax, ay - 258, 60, '#FF8A70', .7 * blink);
    seed('dish');
    const dx = 1260, dy = TW.roof - 28;
    ink([[dx, dy], [dx + 6, dy - 60]], SW(2), K.towerInk, 0);
    push(); translate(dx + 8, dy - 70); rotate(-.55);
    paint([[-58, -6], [-40, 18], [0, 30], [40, 18], [58, -6], [0, 6]], { wash: '#D9DDEA', ink: PAL.ink, sw: SW(.9), curv: .4 });
    inkLine([[0, 8], [0, -34], [2, -50]], SW(.9), PAL.ink, 'inkfine', 0);
    paint(ellPts(2, -54, 6, 6, 10), { wash: '#D9DDEA', ink: PAL.ink, sw: SW(.6) });
    pop();
  }

  function shopWall(t) {
    seed('shop wall');
    paint(R4(SH.x0, SH.y0, SH.x1, SH.floor), { wash: K.shopWall, ink: null });
    if (!vis(SH.x0, SH.y0, SH.x1, SH.floor)) return;
    const w = 160, top = 244;
    for (let i = 0; i < 7; i++) {
      const x = 134 + i * 176;
      if (!vis(x, top, x + w, SH.floor)) continue;
      seed('shop rack ' + i);
      paint(R4(x, top, x + w, SH.floor), { wash: K.rack, ink: null });
      paint(R4(x + 9, top + 12, x + w - 9, SH.floor - 8), { wash: K.rackFace, ink: null });
      if (!FINE()) continue;
      for (let u = 1; u < 11; u++) { const y = top + 12 + u * 62; inkLine([[x + 14, y], [x + w - 14, y]], .55, K.rackLine, 'inkfine', 0); }
      for (let u = 0; u < 11; u++) { const y = top + 12 + (u + .5) * 62; inkLine([[x + 18, y], [x + 30 + 30 * hash(i * 23 + u), y]], 1.7, '#2B3470', 'inkflat', 0); }
      for (let v = 0; v < 4; v++) inkLine([[x + 22 + v * 9, top + 24], [x + 22 + v * 9, top + 50]], .5, K.rackLine, 'inkfine', 0);
      for (let u = 0; u < 11; u++) {
        if (hash(i * 11 + u) < .3) continue;
        const y = top + 12 + (u + .5) * 62, f = .05 + .08 * hash(i * 13 + u), ph = hash(i * 2.1 + u * 3.9);
        const b = Math.pow(.5 + .5 * Math.sin((t * f + ph) * TAU), 4), col = K.led[Math.floor(hash(i * 17 + u) * 4)];
        paint(ellPts(x + w - 22, y, 3.6, 3.6, 8), { wash: mixCol(K.rackLine, col, .3 + .7 * b), ink: null });
        if (hash(i * 19 + u) > .45) paint(ellPts(x + w - 35, y, 2.8, 2.8, 8), { wash: mixCol(K.rackLine, K.led[(i + u) % 4], .25 + .5 * (1 - b)), ink: null });
      }
    }
    if (FINE()) {
      seed('shop cables');
      for (const [a, b, sag, col] of [[300, 480, 36, '#394489'], [470, 650, 28, '#5B3F6E'], [1120, 1300, 40, '#394489']]) inkLine([[a, top + 6], [(a + b) / 2, top + 6 + sag], [b, top + 8]], 1.6, col, 'inkflat', .5);
    }
  }
  function lampPool() {
    glow(870, 520, 540, K.warm, .6);
    glow(620, 800, 320, K.warm, .42);
    push(); translate(760, SH.floor + 2); scale(1, .18); glow(0, 0, 580, K.warm, .85); pop();
  }
  function lampFixture(t) {
    const [lx, ly] = Wd.lamp;
    if (!vis(lx - 90, SH.y0, lx + 90, ly + 40)) return;
    seed('lamp');
    const sway = .018 * Math.sin(t * 1.1), h = ly - SH.y0;
    push(); translate(lx, SH.y0); rotate(sway);
    paint(rrPts(-15, -2, 30, 10, 4), { wash: K.brassDk, ink: PAL.ink, sw: SW(.7) });
    ink([[0, 7], [0, h - 34]], SW(.9), PAL.ink, 0);
    paint(rrPts(-7, h - 38, 14, 12, 3), { wash: K.brassDk, ink: PAL.ink, sw: SW(.6) });
    paint([[-10, h - 28], [10, h - 28], [30, h - 14], [52, h + 6], [-52, h + 6], [-30, h - 14]], { wash: K.shade, ink: PAL.ink, sw: SW(1), curv: .35 });
    paint([[8, h - 27], [10, h - 28], [30, h - 14], [52, h + 6], [24, h + 6]], { wash: K.shadeDk, ink: null, curv: .3 });
    paint(ellPts(0, h + 6, 52, 6, 20), { wash: '#FFE7A6', ink: PAL.ink, sw: SW(.7) });
    paint(ellPts(0, h + 13, 13, 10, 14), { wash: K.bulb, ink: PAL.ink, sw: SW(.6) });
    pop();
    glow(lx - Math.sin(sway) * h, ly + 12, 115, '#FFE3A0', .95);
  }
  function shelvesParts(t, o) {
    const S = Wd.shelvesParts;
    if (!vis(S.x0 - 10, S.y0 - 10, S.x1 + 10, S.y1 + 50)) return;
    seed('parts shelves');
    const boards = [S.y0, 440, 550, S.y1];
    paint(R4(S.x0 + 10, S.y0, S.x1 - 10, S.y1), { wash: '#262B58', ink: null });
    for (const x of [S.x0, S.x1 - 12]) paint(R4(x, S.y0 - 6, x + 12, S.y1 + 12), { wash: K.shelf, ink: PAL.ink, sw: SW(.8) });
    for (const y of boards) paint(R4(S.x0 - 4, y, S.x1 + 4, y + 12), { wash: K.shelf, ink: PAL.ink, sw: SW(.8) });
    for (const x of [S.x0 + 30, S.x1 - 30]) paint([[x - 8, S.y1 + 12], [x + 8, S.y1 + 12], [x, S.y1 + 40]], { wash: K.shelfDk, ink: PAL.ink, sw: SW(.7) });
    const on = o.shelfParts ?? Object.keys(SHELF_SLOTS);
    const has = k => Array.isArray(on) ? on.includes(k) : !!on[k];
    for (const kind of Object.keys(SHELF_SLOTS)) {
      const [x0, y0, x1, y1] = SHELF_SLOTS[kind];
      seed('shelf part ' + kind);
      if (!has(kind)) { if (FINE()) inkLine([[x0 + 6, y1 - 1], [(x0 + x1) / 2, y1 - 2], [x1 - 6, y1 - 1]], .6, '#3A4078', 'inkfine', .2); continue; }
      push(); translate((x0 + x1) / 2, y1); rotate(kind === 'hero' ? -.03 : kind === 'skeleton' ? .025 : 0); translate(-(x0 + x1) / 2, -y1);
      sibling('pagePart', [kind, x0, y0, x1 - x0, y1 - y0, {}], () => placeholderPart(kind, x0, y0, x1, y1));
      pop();
    }
    if (FINE()) {
      seed('shelf jar');
      const jx = 352, jy = S.y1;
      paint(rrPts(jx - 26, jy - 56, 52, 56, 10), { wash: '#6F8FB0', washOp: 200, ink: PAL.ink, sw: SW(.8) });
      for (let i = 0; i < 3; i++) inkLine([[jx - 12 + i * 12, jy - 50], [jx - 16 + i * 14, jy - 84], [jx - 20 + i * 16, jy - 96]], SW(1.3), [K.easel, QWIK.purple, QWIK.blue][i], 'inkflat', .4);
    }
  }
  function placeholderPart(kind, x0, y0, x1, y1) {
    const w = x1 - x0, h = y1 - y0;
    paint(rrPts(x0, y0, w, h, 5), { wash: kind === 'skeleton' ? '#D5D1DC' : '#F6F1FC', ink: PAL.ink, sw: .8 });
    if (kind === 'header') { paint(rrPts(x0 + 6, y0 + h * .3, 18, h * .4, 3), { wash: QWIK.purple, ink: null }); return; }
    if (kind === 'hero') { paint([[x0 + 4, y1 - 4], [x0 + w * .35, y0 + h * .35], [x0 + w * .6, y1 - h * .3], [x0 + w * .78, y0 + h * .45], [x1 - 4, y1 - 4]], { wash: '#9FCB86', ink: null }); return; }
    for (let i = 0; i < 2; i++) paint(rrPts(x0 + w * .38, y0 + h * (.25 + i * .3), w * .5, h * .14, 3), { wash: '#C9C3D3', ink: null });
    if (kind === 'card') paint(rrPts(x0 + 6, y0 + 6, w * .28, h - 12, 4), { wash: QWIK.blueLt, ink: null });
  }
  function requestPipe(t, rattle = 0) {
    const [mx, my] = Wd.requestPipe;
    if (!vis(mx - 90, SH.y0, mx + 70, my + 70)) return;
    seed('request pipe');
    const sx = rattle * 5 * Math.sin(t * 71), sy = rattle * 2.5 * Math.cos(t * 53);
    const P = [[mx - 38, SH.y0], [mx - 38, my - 92], [mx - 35 + sx * .3, my - 62 + sy * .3], [mx - 22 + sx * .7, my - 36 + sy * .6]];
    const C = through(P, 5), { L, R } = offsets(C, 10);
    paint(L.concat(R.slice().reverse()), { wash: K.brass, ink: null });
    ink(L, SW(.9)); ink(R, SW(.9));
    inkLine(offsets(C, 4.5).L.slice(1, -2), SW(.8), K.brassLt, 'inkfine', .4);
    for (const y of [SH.y0 + 70, my - 130]) paint(rrPts(mx - 55, y, 34, 12, 4), { wash: BRASS_SH, ink: PAL.ink, sw: SW(.6) });
    const end = C[C.length - 1], prev = C[C.length - 3], a = Math.atan2(end[1] - prev[1], end[0] - prev[0]), Lb = 40;
    push(); translate(end[0], end[1]); rotate(a);
    paint([[0, -10], [Lb * .45, -12], [Lb * .8, -19], [Lb, -27], [Lb, 27], [Lb * .8, 19], [Lb * .45, 12], [0, 10]], { wash: K.brass, ink: PAL.ink, sw: SW(.95), curv: .3 });
    paint([[Lb * .3, 5], [Lb * .8, 11], [Lb, 20], [Lb, 26], [Lb * .8, 18], [Lb * .45, 11], [0, 9], [0, 5]], { wash: BRASS_SH, ink: null, curv: .3 });
    paint(ellPts(Lb, 0, 7, 27, 16), { wash: K.brass, ink: PAL.ink, sw: SW(.8) });
    paint(ellPts(Lb + 1, 1, 4, 21, 14), { wash: '#2A1E1C', ink: null });
    const flap = .18 + rattle * .9 * Math.abs(Math.sin(t * 23));
    push(); translate(Lb + 3, -27); rotate(-flap);
    paint(ellPts(3, 26, 5, 26, 14), { wash: K.brassLt, ink: PAL.ink, sw: SW(.7) });
    pop();
    pop();
    if (rattle > .05 && FINE()) {
      seed('pipe rattle');
      for (const s of [-1, 1]) inkLine([[mx - 38 + s * 22, my - 110], [mx - 38 + s * 29, my - 88], [mx - 38 + s * 22, my - 66]], SW(1) * clamp(rattle * 2), PAL.cream, 'inkfine', .5);
    }
  }
  function toolbox(t) {
    const x = 1150, y = SH.floor;
    if (!FINE() || !vis(x - 60, y - 70, x + 60, y)) return;
    seed('toolbox');
    inkLine([[x - 20, y - 44], [x - 16, y - 58], [x + 16, y - 58], [x + 20, y - 44]], SW(2.2), '#3A3346', 'inkflat', .4);
    paint(rrPts(x - 44, y - 46, 88, 46, 6), { wash: '#C4574A', ink: PAL.ink, sw: SW(.9) });
    paint(R4(x - 44, y - 30, x + 44, y - 25), { wash: '#8E3B34', ink: null });
    paint(rrPts(x - 7, y - 34, 14, 12, 3), { wash: K.brass, ink: PAL.ink, sw: SW(.5) });
    inkLine([[x + 30, y - 46], [x + 50, y - 72], [x + 58, y - 80]], SW(2.4), '#9AA3B5', 'inkflat', .3);
  }
  function easel(t, o) {
    const B = Wd.board;
    if (!vis(B.x0 - 80, B.y0 - 60, B.x1 + 80, SH.floor)) return;
    seed('board');
    if (typeof window.drawBoard === 'function') { sibling('drawBoard', [o.board || {}]); return; }
    const cx = (B.x0 + B.x1) / 2;
    board([cx - 20, B.y0 - 30], [B.x0 + 40, SH.floor], 18, K.easel);
    board([cx + 20, B.y0 - 30], [B.x1 - 40, SH.floor], 18, K.easel);
    placeholderBoard();
    paint(rrPts(B.x0 - 26, B.y1 - 6, B.x1 - B.x0 + 52, 24, 6), { wash: K.easel, ink: PAL.ink, sw: SW(.9) });
  }
  function placeholderBoard() {
    const B = Wd.board;
    paint(rrPts(B.x0, B.y0, B.x1 - B.x0, B.y1 - B.y0, 10), { wash: '#F3EDF7', ink: PAL.ink, sw: 1 });
    for (const [a, b] of [[.03, .13], [.15, .37], [.39, .63], [.65, .8], [.82, .96]]) {
      const y0 = lerp(B.y0, B.y1, a), y1 = lerp(B.y0, B.y1, b);
      box(B.x0 + 16, y0, B.x1 - 16, y1, .5, '#C8BEDA');
    }
  }
  function riserAndShopTube(t, o) {
    const riser = RUNS[0];
    if (runVisible(riser)) { glassBack(riser); glassFront(riser); }
    if (vis(1330, SH.y0, 1360, TY)) {
      seed('shop tube strap');
      ink([[1346, SH.y0], [1346, TY - TR + 2]], SW(1.4), K.brassDk, 0);
    }
    if (vis(1150, 380, 1400, 760)) horn(t, o.funnelGulp || 0);
  }

  function towerSet(t, o = {}) {
    ensureLand(t, o, [TW.x0 - 30, TW.roof - 320, TW.x1 + 10, 1052]);
    if (!vis(-420, TW.roof - 320, TW.x1 + 30, 1060)) return;
    towerTree(t);
    rooftop(t);
    towerShell(t);
    shopWall(t);
    lampPool();
    shelvesParts(t, o);
    requestPipe(t, o.pipeRattle || 0);
    easel(t, o);
    toolbox(t);
    riserAndShopTube(t, o);
    lampFixture(t);
    towerSections(t);
    collar(1382, TY - 64, TY + 64, 18, 'tower in');
    coupler(1460, true);
  }

  const HO = Wd.house, CEIL = 80, WALL_L = 4430, WALL_R = 6264;
  function houseShell(t) {
    seed('house roof');
    if (vis(HO.x0 - 80, -340, HO.x1 + 80, CEIL)) {
      const cx0 = 5030, cy0 = -330;
      if (vis(cx0 - 10, cy0 - 120, cx0 + 110, -150)) {
        paint(R4(cx0, cy0, cx0 + 86, -120), { wash: K.roofDk, ink: PAL.ink, sw: SW(1) });
        paint(R4(cx0 - 8, cy0 - 18, cx0 + 94, cy0), { wash: K.plasterDk, ink: PAL.ink, sw: SW(.9) });
        const drift = frac(t * .18);
        for (let i = 0; i < 3; i++) {
          const k = frac(drift + i / 3), sx = cx0 + 43 + 40 * k + 10 * Math.sin((t + i) * 1.3), sy = cy0 - 40 - 170 * k, r = 18 + 26 * k;
          seed('smoke ' + i);
          paint(ellPts(sx, sy, r, r * .8, 14), { wash: '#F4F1EE', washOp: 200 * (1 - k), ink: null });
        }
      }
      seed('house roof');
      const roof = [[HO.x0 - 70, CEIL - 34], [4760, -250], [5940, -250], [HO.x1 + 70, CEIL - 34]];
      paint(roof, { wash: K.roof, ink: null });
      ink(roof, SW(1.2), PAL.ink, 0);
      if (FINE()) for (let k = 1; k < 5; k++) { const y = lerp(-250, CEIL - 34, k / 5), xa = lerp(4760, HO.x0 - 70, k / 5), xb = lerp(5940, HO.x1 + 70, k / 5); ink([[xa + 10, y], [xb - 10, y]], SW(.6), K.roofDk, 0); }
      paint(R4(HO.x0 - 78, CEIL - 38, HO.x1 + 78, CEIL - 22), { wash: K.roofDk, ink: null });
      box(HO.x0 - 78, CEIL - 38, HO.x1 + 78, CEIL - 22, SW(.9));
    }
    seed('house walls');
    paint(R4(HO.x0, CEIL - 22, HO.x1, 1030), { wash: K.plaster, ink: null });
  }
  function wallpaper() {
    if (!vis(WALL_L, CEIL, WALL_R, HO.floor)) return;
    seed('wallpaper');
    paint(R4(WALL_L, CEIL, WALL_R, HO.floor), { wash: K.paper, ink: null });
    const [vx0, , vx1] = viewRect(20);
    for (let x = WALL_L + 40; x < WALL_R; x += 96) {
      if (x + 34 < vx0 || x > vx1) continue;
      seed('stripe ' + x);
      paint(R4(x, CEIL, x + 34, HO.floor), { wash: K.paperDk, washOp: 150, ink: null });
    }
    if (FINE()) {
      seed('wallpaper sprigs');
      for (let x = WALL_L + 88; x < WALL_R; x += 96) for (let y = CEIL + 60; y < 900; y += 110) {
        if (!vis(x - 8, y - 8, x + 8, y + 8)) continue;
        const yy = y + (Math.round((x - WALL_L) / 96) % 2) * 55;
        paint(starPts(x, yy, 7, .4, 4), { wash: '#CDBBD6', ink: null });
      }
    }
    seed('crown');
    paint(R4(WALL_L, CEIL, WALL_R, CEIL + 16), { wash: K.trim, ink: null });
    ink([[WALL_L, CEIL + 16], [WALL_R, CEIL + 16]], SW(.8), PAL.ink, 0);
    seed('skirting');
    paint(R4(WALL_L, 972, WALL_R, HO.floor), { wash: K.trim, ink: null });
    ink([[WALL_L, 972], [WALL_R, 972]], SW(.8), PAL.ink, 0);
  }
  function houseWallSection() {
    if (!vis(HO.x0 - 10, CEIL - 30, WALL_L + 10, 1040)) return;
    seed('house left wall');
    const h0 = PORT.c[1] - PORT.ri[1] + 4, h1 = PORT.c[1] + PORT.ri[1] - 4;
    paint(R4(HO.x0, CEIL - 22, WALL_L, h0), { wash: K.plaster, ink: null });
    paint(R4(HO.x0, h1, WALL_L, 1030), { wash: K.plaster, ink: null });
    if (FINE()) for (let y = h1 + 40; y < 1000; y += 70) inkLine([[HO.x0 + 5, y], [WALL_L - 5, y + 1]], .5, K.plasterDk, 'inkfine', 0);
    ink([[HO.x0, CEIL - 22], [HO.x0, h0]], SW(1.2), PAL.ink, 0); ink([[HO.x0, h1], [HO.x0, 1030]], SW(1.2), PAL.ink, 0);
    ink([[WALL_L, CEIL], [WALL_L, h0]], SW(1), PAL.ink, 0); ink([[WALL_L, h1], [WALL_L, HO.floor]], SW(1), PAL.ink, 0);
  }
  function ringHalf(front) {
    const [cx, cy] = PORT.c, n = 18, a0 = front ? -Math.PI / 2 : Math.PI / 2, out = [], inn = [];
    for (let i = 0; i <= n; i++) {
      const a = a0 + Math.PI * i / n;
      out.push([cx + PORT.ro[0] * Math.cos(a), cy + PORT.ro[1] * Math.sin(a)]);
      inn.push([cx + PORT.ri[0] * Math.cos(a), cy + PORT.ri[1] * Math.sin(a)]);
    }
    return out.concat(inn.reverse());
  }
  function portholeBack() {
    if (!vis(PORT.c[0] - 50, PORT.c[1] - 140, PORT.c[0] + 50, PORT.c[1] + 140)) return;
    seed('porthole back');
    const [cx, cy] = PORT.c;
    paint(ellPts(cx, cy, PORT.ri[0] + 3, PORT.ri[1] + 3, 36), { wash: '#4A3B52', ink: null });
    paint(ellPts(cx + 7, cy + 5, PORT.ri[0] - 8, PORT.ri[1] - 12, 30), { wash: '#65546C', ink: null });
    paint(ringHalf(false), { wash: BRASS_SH, ink: PAL.ink, sw: SW(.9) });
  }
  function portholeFront() {
    if (!vis(PORT.c[0] - 50, PORT.c[1] - 140, PORT.c[0] + 50, PORT.c[1] + 140)) return;
    seed('porthole front');
    const [cx, cy] = PORT.c;
    paint(ringHalf(true), { wash: K.brass, ink: PAL.ink, sw: SW(1) });
    const hl = [];
    for (let i = 2; i <= 10; i++) { const a = -Math.PI / 2 + Math.PI * i / 18; hl.push([cx + (PORT.ro[0] - 5) * Math.cos(a), cy + (PORT.ro[1] - 5) * Math.sin(a)]); }
    inkLine(hl, SW(.9), K.brassLt, 'inkfine', .4);
    if (FINE()) for (let i = 1; i < 6; i++) { const a = -Math.PI / 2 + Math.PI * i / 6; paint(ellPts(cx + (PORT.ro[0] + PORT.ri[0]) / 2 * Math.cos(a), cy + (PORT.ro[1] + PORT.ri[1]) / 2 * Math.sin(a), 3.2, 3.2, 8), { wash: K.brassDk, ink: null }); }
  }
  function houseSections() {
    houseWallSection();
    if (vis(WALL_R - 10, CEIL, HO.x1 + 10, 1040)) {
      seed('house right wall');
      paint(R4(WALL_R, CEIL - 22, HO.x1, 1030), { wash: K.plaster, ink: null });
      ink([[HO.x1, CEIL - 22], [HO.x1, 1030]], SW(1.2), PAL.ink, 0);
      ink([[WALL_R, CEIL], [WALL_R, HO.floor]], SW(1), PAL.ink, 0);
    }
    seed('house ceiling');
    paint(R4(HO.x0, CEIL - 22, HO.x1, CEIL), { wash: K.plaster, ink: null });
    ink([[HO.x0, CEIL - 22], [HO.x1, CEIL - 22]], SW(1.1), PAL.ink, 0);
    ink([[WALL_L, CEIL], [WALL_R, CEIL]], SW(1), PAL.ink, 0);
    seed('house floor');
    paint(R4(HO.x0, HO.floor, HO.x1, 1030), { wash: K.deskDk, ink: null });
    if (FINE()) for (let x = HO.x0 + 90; x < HO.x1; x += 130) inkLine([[x, HO.floor + 3], [x + 1, 1027]], .6, K.deskInk, 'inkfine', 0);
    box(HO.x0, HO.floor, HO.x1, 1030, SW(1.1));
    seed('house plinth');
    paint(R4(HO.x0 - 20, 1030, HO.x1 + 20, 1100), { wash: K.plasterDk, ink: null });
    if (FINE()) for (let x = HO.x0 + 50; x < HO.x1; x += 160) inkLine([[x, 1032], [x + 1, 1098]], .6, '#B8A284', 'inkfine', 0);
    box(HO.x0 - 20, 1030, HO.x1 + 20, 1100, SW(1.1));
  }
  function stopBand() {
    const x = Wd.snailStop;
    if (!vis(x - 20, TY - 60, x + 20, TY + 60)) return;
    seed('stop band');
    paint(rrPts(x - 7, TY - 50, 14, 100, 5), { wash: K.brass, ink: PAL.ink, sw: SW(.8) });
  }
  function houseTube(t, o) {
    const run = RUNS[RUNS.length - 1];
    if (runVisible(run)) {
      for (const x of [4560, 4870]) if (vis(x - 10, CEIL, x + 10, ROAD)) { seed('strap ' + x); ink([[x, CEIL], [x, ROAD]], SW(1.4), K.brassDk, 0); }
      glassBack(run); glassFront(run);
    }
    stopBand();
    nook();
    nozzle(t, o.nozzleBulge || 0);
  }
  function nook() {
    if (!vis(4980, ROAD - 10, 5190, ROAD + 90)) return;
    seed('snail nook');
    paint([[5010, ROAD + 18], [5150, ROAD + 18], [5150, ROAD + 70]], { wash: K.shelfHDk, ink: PAL.ink, sw: SW(.8) });
    paint(rrPts(4990, ROAD, 190, 18, 5), { wash: K.shelfH, ink: PAL.ink, sw: SW(.9) });
    if (FINE()) {
      paint([[5006, ROAD + 1], [5010, ROAD - 6], [5040, ROAD - 8], [5100, ROAD - 7], [5150, ROAD - 8], [5168, ROAD - 5], [5170, ROAD + 1]], { wash: '#D98FA0', ink: PAL.ink, sw: SW(.6), curv: .4 });
      for (let x = 5024; x < 5160; x += 22) paint(ellPts(x, ROAD - 3, 2.6, 2.2, 8), { wash: PAL.cream, ink: null });
      paint(rrPts(5134, ROAD - 22, 40, 20, 9), { wash: PAL.cream, ink: PAL.ink, sw: SW(.6) });
      inkLine([[5144, ROAD - 12], [5154, ROAD - 14], [5164, ROAD - 12]], SW(.4), '#C9B79A', 'inkfine', .5);
    }
  }
  function clockSlot(t, o) {
    const [x, y] = Wd.wallClock;
    if (!vis(x - 90, y - 110, x + 90, y + 90)) return;
    seed('clock nail');
    paint(ellPts(x, y - 86, 4, 4, 8), { wash: K.brassDk, ink: PAL.ink, sw: SW(.5) });
    seed('wall clock');
    sibling('wallClock', [x, y, 1, { whizz: o.clockWhizz || 0, time: o.clockTime }], () => placeholderClock(t, x, y, o.clockWhizz || 0));
  }
  function placeholderClock(t, x, y, whizz) {
    paint(ellPts(x, y, 62, 62, 30), { wash: K.trim, ink: PAL.ink, sw: SW(1.1) });
    paint(ellPts(x, y, 52, 52, 28), { wash: '#FFFBF4', ink: null });
    const spin = whizz * TAU * 3, a1 = -Math.PI / 2 + spin, a2 = -Math.PI / 2 + spin * 12 + 1.2;
    inkLine([[x, y], [x + Math.cos(a1) * 30, y + Math.sin(a1) * 30]], SW(1.4), PAL.ink, 'inkflat', 0);
    inkLine([[x, y], [x + Math.cos(a2) * 42, y + Math.sin(a2) * 42]], SW(1), PAL.ink, 'inkflat', 0);
  }
  function shelf(t, o) {
    const S = Wd.shelf;
    if (!vis(S.x0 - 20, S.y0 - 20, S.x1 + 20, S.y1)) return;
    const cw = (S.x1 - S.x0) / 2, ch = (S.y1 - S.y0) / 3, lit = o.cubbyLit || {};
    seed('shelf frame');
    paint(R4(S.x0, S.y0, S.x1, S.y1), { wash: K.shelfH, ink: PAL.ink, sw: SW(1) });
    for (const kind of Object.keys(Wd.cubbies)) {
      const [c, r] = Wd.cubbies[kind], x0 = S.x0 + c * cw + (c ? 5 : 12), x1 = S.x0 + (c + 1) * cw - (c ? 12 : 5), y0 = S.y0 + r * ch + (r ? 6 : 12), y1 = S.y0 + (r + 1) * ch - (r === 2 ? 12 : 6);
      const k = clamp(lit[kind] || 0);
      seed('cubby ' + kind);
      paint(R4(x0, y0, x1, y1), { wash: k > 0 ? mixCol(K.cubby, K.cubbyLit, k) : K.cubby, ink: PAL.ink, sw: SW(.7) });
      paint(R4(x0, y0, x1, y0 + 14), { wash: '#1E1826', washOp: 180 * (1 - .6 * k), ink: null });
      if (k > .01) glow((x0 + x1) / 2, (y0 + y1) / 2 + 6, 120, K.warm, .8 * k);
      if (FINE()) sibling('icon', [kind, (x0 + x1) / 2, (y0 + y1) / 2 + 6, 58, mixCol(K.cubbyGhost, '#B08A60', k), { key: 'cubby ' + kind }], () => paint(ellPts((x0 + x1) / 2, (y0 + y1) / 2 + 6, 20, 20, 12), { wash: K.cubbyGhost, ink: null }));
    }
    if (FINE()) {
      seed('shelf grain');
      inkLine([[S.x0 + 4, S.y0 + 4], [S.x1 - 4, S.y0 + 5]], .5, K.shelfHDk, 'inkfine', 0);
    }
  }
  function desk(t) {
    const D = Wd.desk;
    if (!vis(D.x0 - 10, D.top - 10, D.x1 + 10, HO.floor)) return;
    seed('desk legs');
    for (const x of [D.x0 + 14, 5540]) paint(R4(x, D.top + 40, x + 24, HO.floor), { wash: K.deskDk, ink: PAL.ink, sw: SW(.8) });
    seed('desk drawers');
    paint(R4(5990, D.top + 26, D.x1 - 10, HO.floor - 2), { wash: K.desk, ink: PAL.ink, sw: SW(.9) });
    inkLine([[5996, D.top + 60], [6120, D.top + 61], [D.x1 - 16, D.top + 60]], SW(.7), K.deskInk, 'inkfine', .2);
    for (const y of [D.top + 44, D.top + 80]) paint(ellPts(6120, y, 6, 5, 10), { wash: K.brass, ink: PAL.ink, sw: SW(.5) });
    seed('desk top');
    paint(R4(D.x0, D.top, D.x1, D.top + 26), { wash: K.desk, ink: null });
    paint(R4(D.x0, D.top + 26, D.x1, D.top + 40), { wash: K.deskDk, ink: null });
    ink([[D.x0, D.top], [D.x1, D.top]], SW(1.1)); ink([[D.x0, D.top + 40], [D.x1, D.top + 40]], SW(1));
    ink([[D.x0, D.top], [D.x0, D.top + 40]], SW(1), PAL.ink, 0); ink([[D.x1, D.top], [D.x1, D.top + 40]], SW(1), PAL.ink, 0);
    if (FINE()) {
      seed('desk grain');
      for (let i = 0; i < 6; i++) { const x = D.x0 + 120 + i * 300; seed('desk grain ' + i); if (vis(x, D.top, x + 200, D.top + 26)) inkLine([[x, D.top + 9 + (i % 2) * 7], [x + 90, D.top + 10 + (i % 2) * 7], [x + 180, D.top + 9 + (i % 2) * 7]], .5, K.deskLt, 'inkfine', .3); }
      inkLine([[D.x0 + 6, D.top + 3], [(D.x0 + D.x1) / 2, D.top + 3], [D.x1 - 6, D.top + 3]], .6, K.deskLt, 'inkfine', 0);
    }
  }
  function tinyBolt(x, y, s) {
    const P = roundedPts(BOLT, BOLT_R, 2).map(([px, py]) => [x + (px - BODY_CX) * s, y + (py - BODY_CY) * s]);
    const off = (dx, dy) => P.map(([px, py]) => [px + dx, py + dy]);
    paint(off(-.8 * s, .8 * s), { wash: QWIK.blue, ink: null });
    paint(off(.8 * s, -.8 * s), { wash: QWIK.purple, ink: null });
    paint(P, { wash: QWIK.white, ink: PAL.ink, sw: SW(.45) });
  }
  const ADDRESS = { text: 'boltplush.shop', pop: 1, caret: 0, focus: 0, icon: true };
  const URL_Y = (Wd.page.titleBar[0] + Wd.page.titleBar[1]) / 2, URL_ICON = [Wd.window.x0 + 142, URL_Y + 1], URL_TEXT = [Wd.window.x0 + 164, URL_Y + .5];
  const URL_PX = 15, urlFont = px => `600 ${px}px "Nunito", system-ui, sans-serif`;
  let urlMeter = null;
  function urlWidth(txt) {
    if (!urlMeter) urlMeter = document.createElement('canvas').getContext('2d');
    urlMeter.font = urlFont(100);
    return urlMeter.measureText(txt).width * URL_PX / 100;
  }
  function addressText(x, y, A) {
    const text = A.text || '', pop = clamp(A.pop), settled = pop < 1 ? text.slice(0, -1) : text, font = urlFont(URL_PX);
    if (settled) letter(settled, x, y, URL_PX, PAL.ink, { font, align: 'left', ink: false });
    if (pop < 1 && text) {
      const x0 = x + urlWidth(settled), w = urlWidth(text) - urlWidth(settled);
      letter(text.slice(-1), x0 + w / 2, y, URL_PX, PAL.ink, { font, align: 'center', ink: false, pop: .35 + .65 * pop });
    }
    flushLetters();
    if (A.caret > .5) {
      seed('url caret');
      const cx = x + urlWidth(text) + 2;
      inkLine([[cx, y - 8.5], [cx, y + 8.5]], SW(.75), PAL.ink, 'inkfine', 0);
    }
  }
  function browserFrame(t, o) {
    const B = Wd.window, pg = Wd.page;
    if (!vis(B.x0 - 20, B.y0 - 20, B.x1 + 20, Wd.desk.top)) return;
    seed('monitor stand');
    const sx = (B.x0 + B.x1) / 2;
    paint([[sx - 26, B.y1 - 4], [sx + 26, B.y1 - 4], [sx + 20, Wd.desk.top - 8], [sx - 20, Wd.desk.top - 8]], { wash: K.stand, ink: PAL.ink, sw: SW(.9) });
    paint(rrPts(sx - 90, Wd.desk.top - 12, 180, 14, 6), { wash: K.stand, ink: PAL.ink, sw: SW(.9) });
    seed('window frame');
    paint(rrPts(B.x0 + 8, B.y0 + 12, B.x1 - B.x0, B.y1 - B.y0, 18), { wash: '#6D5E80', washOp: 90, ink: null });
    paint(rrPts(B.x0, B.y0, B.x1 - B.x0, B.y1 - B.y0, 18), { wash: K.frame, ink: PAL.ink, sw: SW(1.2) });
    paint([[B.x0 + 3, pg.titleBar[1]], [B.x0 + 3, B.y0 + 16], [B.x0 + 12, B.y0 + 5], [B.x0 + 24, B.y0 + 3], [B.x1 - 24, B.y0 + 3], [B.x1 - 12, B.y0 + 5], [B.x1 - 3, B.y0 + 16], [B.x1 - 3, pg.titleBar[1]]], { wash: K.frameBar, ink: null });
    const dy = (pg.titleBar[0] + pg.titleBar[1]) / 2;
    [PAL.rose, PAL.ochre, PAL.sap].forEach((c, i) => paint(ellPts(B.x0 + 28 + i * 24, dy, 7.5, 7.5, 12), { wash: c, ink: PAL.ink, sw: SW(.6) }));
    const A = { ...ADDRESS, ...(o.address || {}) };
    if (A.focus > .01) {
      seed('url focus');
      paint(rrPts(B.x0 + 116, dy - 15, 568, 30, 15), { wash: QWIK.blue, washOp: 255 * clamp(A.focus), ink: null });
    }
    seed('url bar');
    paint(rrPts(B.x0 + 120, dy - 11, 560, 22, 11), { wash: K.url, ink: PAL.ink, sw: SW(.7) });
    if (FINE()) {
      if (A.icon) tinyBolt(...URL_ICON, 1.05);
      addressText(...URL_TEXT, A);
    }
    seed('page');
    sibling('drawPage', [o.page || {}], () => placeholderPage());
    seed('title rule');
    ink([[B.x0 + 2, pg.titleBar[1]], [B.x1 - 2, pg.titleBar[1]]], SW(.8));
  }
  function placeholderPage() {
    const pg = Wd.page, x0 = 5040, x1 = 5900, B = Wd.window;
    paint(R4(B.x0 + 20, pg.titleBar[1] + 2, B.x1 - 20, B.y1 - 10), { wash: K.pageBg, ink: null });
    for (const k of ['header', 'hero', 'card', 'reviews', 'footer']) {
      const [y0, y1] = pg[k];
      paint(rrPts(x0 + 6, y0, x1 - x0 - 12, y1 - y0, 6), { wash: '#EAE3F3', ink: null });
    }
  }
  function mug(t) {
    const x = 5982, y = Wd.desk.top;
    if (!vis(x - 60, y - 160, x + 60, y)) return;
    seed('mug');
    paint([[x + 22, y - 44], [x + 44, y - 40], [x + 44, y - 18], [x + 22, y - 14]], { wash: K.mug, ink: PAL.ink, sw: SW(.9), curv: .5 });
    paint([[x + 26, y - 36], [x + 36, y - 34], [x + 36, y - 24], [x + 26, y - 22]], { wash: K.paper, ink: PAL.ink, sw: SW(.6), curv: .5 });
    paint(rrPts(x - 26, y - 56, 52, 56, 9), { wash: K.mug, ink: PAL.ink, sw: SW(1) });
    paint(R4(x - 25, y - 44, x + 25, y - 36), { wash: QWIK.purple, washOp: 220, ink: null });
    if (FINE()) {
      tinyBolt(x, y - 20, .9);
      seed('steam');
      for (let i = 0; i < 2; i++) {
        const k = frac(t * .35 + i * .5), sx = x - 8 + i * 14, sy = y - 62 - 60 * k, a = 1 - k;
        if (a > .1) inkLine([[sx, sy + 20], [sx + 6 * Math.sin(t * 2 + i), sy + 8], [sx - 4 * Math.sin(t * 2 + i), sy - 6]], SW(.9) * a, '#FFF9EE', 'inkfine', .6);
      }
    }
  }
  function plant(t) {
    const x = 6150, y = Wd.desk.top;
    if (!vis(x - 110, y - 260, x + 110, y)) return;
    seed('plant');
    const leaves = [[-.9, 140], [-.45, 190], [0, 220], [.4, 180], [.85, 130], [-.2, 120], [.25, 150]];
    leaves.forEach(([a, len], i) => {
      const sway = .05 * Math.sin(t * 1.3 + i * 1.7), ang = -Math.PI / 2 + a + sway, bx = x, by = y - 58;
      const tip = [bx + Math.cos(ang) * len, by + Math.sin(ang) * len], mid = [bx + Math.cos(ang) * len * .5, by + Math.sin(ang) * len * .5];
      const nx = -Math.sin(ang) * 20, ny = Math.cos(ang) * 20;
      paint([[bx, by], [mid[0] + nx, mid[1] + ny], tip, [mid[0] - nx, mid[1] - ny]], { wash: i % 2 ? K.leaf : K.leafDk, ink: K.leafInk, sw: SW(.7), curv: .5 });
      if (FINE()) inkLine([[bx, by], mid, tip], SW(.4), K.leafInk, 'inkfine', .5);
    });
    paint([[x - 44, y - 66], [x + 44, y - 66], [x + 34, y], [x - 34, y]], { wash: K.pot, ink: PAL.ink, sw: SW(1) });
    paint(R4(x - 48, y - 72, x + 48, y - 56), { wash: K.potLt, ink: PAL.ink, sw: SW(.8) });
    paint([[x + 14, y - 56], [x + 40, y - 56], [x + 32, y - 2], [x + 12, y - 2]], { wash: K.potDk, washOp: 140, ink: null });
  }
  function realWindow(t) {
    const x0 = 5990, x1 = 6200, y0 = 150, y1 = 610;
    if (!vis(x0 - 60, y0 - 30, x1 + 30, y1 + 40)) return;
    seed('window glass');
    paint(R4(x0, y0, x1, y1), { wash: K.daySky, ink: null });
    paint(R4(x0, y0 + (y1 - y0) * .55, x1, y1), { wash: K.dayLow, washOp: 200, ink: null });
    paint([[x0, y1 - 70], [x0 + 60, y1 - 110], [x0 + 140, y1 - 96], [x1, y1 - 130], [x1, y1], [x0, y1]], { wash: K.dayHill, ink: null, curv: .4 });
    paint(cloudShape(x0 + 120, y0 + 110, 110, .4).pts, { wash: '#FFFBF4', ink: null });
    glow(x0 + 60, y0 + 60, 90, '#FFF4D0', .6);
    seed('window frame');
    const f = K.trim;
    paint(R4(x0 - 14, y0 - 14, x1 + 14, y0), { wash: f, ink: null });
    paint(R4(x0 - 14, y1, x1 + 14, y1 + 10), { wash: f, ink: null });
    paint(R4(x0 - 14, y0, x0, y1), { wash: f, ink: null });
    paint(R4(x1, y0, x1 + 14, y1), { wash: f, ink: null });
    paint(R4((x0 + x1) / 2 - 5, y0, (x0 + x1) / 2 + 5, y1), { wash: f, ink: null });
    paint(R4(x0, (y0 + y1) / 2 - 5, x1, (y0 + y1) / 2 + 5), { wash: f, ink: null });
    box(x0 - 14, y0 - 14, x1 + 14, y1 + 10, SW(1)); box(x0, y0, x1, y1, SW(.8));
    ink([[(x0 + x1) / 2 - 5, y0], [(x0 + x1) / 2 - 5, y1]], SW(.6), PAL.ink, 0); ink([[(x0 + x1) / 2 + 5, y0], [(x0 + x1) / 2 + 5, y1]], SW(.6), PAL.ink, 0);
    ink([[x0, (y0 + y1) / 2 - 5], [x1, (y0 + y1) / 2 - 5]], SW(.6), PAL.ink, 0); ink([[x0, (y0 + y1) / 2 + 5], [x1, (y0 + y1) / 2 + 5]], SW(.6), PAL.ink, 0);
    paint(rrPts(x0 - 26, y1 + 6, x1 - x0 + 52, 16, 5), { wash: f, ink: PAL.ink, sw: SW(.9) });
    seed('curtain');
    const sway = 4 * Math.sin(t * .9);
    paint([[x0 - 34, y0 - 30], [x0 + 40, y0 - 30], [x0 + 26 + sway, y0 + 120], [x0 + 6, y0 + 230], [x0 + 14 + sway, y1 + 20], [x0 - 34, y1 + 26]], { wash: K.curtain, ink: PAL.ink, sw: SW(.9), curv: .4 });
    if (FINE()) for (const dx of [-12, 6]) inkLine([[x0 + dx, y0 - 20], [x0 + dx - 4 + sway * .5, y0 + 180], [x0 + dx + 2, y1 + 14]], SW(.5), K.curtainDk, 'inkfine', .5);
    paint(rrPts(x0 - 44, y0 - 42, x1 - x0 + 76, 14, 6), { wash: K.brassDk, ink: PAL.ink, sw: SW(.8) });
    seed('sunbeam');
    paint([[x0 + 10, y1 + 20], [x1 - 10, y1 + 20], [x1 + 20, Wd.desk.top], [x0 - 30, Wd.desk.top]], { wash: '#FFF6DE', washOp: 70, ink: null });
  }

  function houseSet(t, o = {}) {
    ensureLand(t, o, [HO.x0 - 80, -340, HO.x1 + 80, 1100]);
    if (!vis(HO.x0 - 90, -350, HO.x1 + 90, 1110)) return;
    houseShell(t);
    wallpaper();
    realWindow(t);
    clockSlot(t, o);
    portholeBack();
    houseTube(t, o);
    shelf(t, o);
    desk(t);
    browserFrame(t, o);
    mug(t);
    plant(t);
    houseSections();
    portholeFront();
  }

  function paperVoid(t) {
    flushBrush();
    push(); resetMatrix(); translate(-W / 2, -H / 2); image(paperG, 0, 0); pop();
  }

  const SETS = {
    K, tubeAt, tubeS, tubeLen: PATH.len, path: PATH.P, shelfSlot: kind => SHELF_SLOTS[kind] ? SHELF_SLOTS[kind].slice() : null,
    nook: { x0: 4995, x1: 5175, y: ROAD }, horn: { mouth: [HORN.rim, 600], r: 104 },
    address: { icon: URL_ICON, text: URL_TEXT, width: urlWidth }, portholeFront: () => portholeFront(),
    funnelFront: (t, o = {}) => horn(t, o.funnelGulp || 0), nozzleFront: (t, o = {}) => nozzle(t, o.nozzleBulge || 0),
  };

  const scaleBolt = (x, y, key, mood = 'happy', t = 0) => {
    const o = { ...boltFeel(mood, t), boilKey: key };
    if (typeof qwik === 'function') qwik(x, y, 20, o); else bolt(x, y, 20, o);
  };
  LOOPS.setTower = t => {
    const placed = seg(t, 2, 2.3);
    camBegin(...CAMS.serverMaster);
    towerSet(t, {
      pipeRattle: seg(t, 1, 1.15) * (1 - seg(t, 1.7, 1.85)),
      funnelGulp: Math.sin(Math.PI * seg(t, 3.1, 3.7)),
      shelfParts: t < 2 ? ['header', 'hero', 'card', 'skeleton', 'footer'] : ['card', 'skeleton', 'footer'],
      board: { parts: { header: placed, hero: placed } },
    });
    scaleBolt(...Wd.boltServer, 'bolt', 'happy', t);
    camEnd();
  };
  LOOPS.setTower.len = 4;
  LOOPS.setLand = t => {
    const k = Math.floor(t), f = t - k;
    const cam = [CAMS.dockClose, [lerp(2000, 2700, f), 380, 1], [lerp(2400, 3700, f), 380, .55], CAMS.poster][k] || CAMS.dockClose;
    camBegin(...cam);
    landSet(t);
    towerSet(t);
    houseSet(t);
    camEnd();
  };
  LOOPS.setLand.len = 4;
  LOOPS.setHouse = t => {
    const on = k => seg(t, k, k + .3);
    camBegin(...CAMS.deskMaster);
    houseSet(t, {
      clockWhizz: seg(t, 1, 2),
      cubbyLit: { menu: 1, heart: seg(t, 2, 2.4) },
      nozzleBulge: Math.sin(Math.PI * seg(t, 3, 3.6)),
      page: { parts: { header: on(.2), hero: on(.2), card: on(.6), skeleton: on(1), footer: on(1.4) }, badge: 0 },
    });
    scaleBolt(...Wd.boltDesk, 'bolt', 'proud', t);
    camEnd();
  };
  LOOPS.setHouse.len = 4;
  LOOPS.setWorld = t => {
    camBegin(...(t < 1 ? CAMS.widest : CAMS.poster));
    landSet(t);
    towerSet(t);
    houseSet(t);
    scaleBolt(...Wd.boltServer, 'bolt server', 'happy', t);
    scaleBolt(...Wd.boltDesk, 'bolt', 'happy', t);
    camEnd();
  };
  LOOPS.setWorld.len = 2;

  Object.assign(window, { towerSet, landSet, houseSet, tubeContents, tubeGlass, paperVoid, SETS });
})();
