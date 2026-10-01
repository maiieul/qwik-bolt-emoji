// world.js: the shared world layout, camera presets and helpers for long strokes (see LIBRARY_SPEC.md).
(() => {
  const WORLD = {
    tubeY: 270, tubeR: 44, roadY: 226,
    tubeX0: 1300, tubeX1: 5000,
    nozzle: [5075, 345],
    couplers: [1460, 1940, 2420, 2900, 3380, 3860, 4340],

    tower: { x0: 40, x1: 1460, roof: -420 },
    shop: { x0: 120, x1: 1380, y0: 180, floor: 940 },
    boltServer: [560, 940],
    shelvesParts: { x0: 130, x1: 430, y0: 330, y1: 660 },
    db: [260, 940],
    requestPipe: [500, 470],
    board: { x0: 640, y0: 330, x1: 1100, y1: 830 },
    lamp: [870, 250],
    funnel: [1230, 600],

    dock: { x0: 1470, x1: 1960 },
    queueX: { menu: 1910, heart: 1830, star: 1750, share: 1670, gear: 1590, cart: 1510 },
    snailStart: 2000,

    land: { x0: 1460, x1: 4400 },
    house: { x0: 4400, x1: 6300, floor: 1000 },
    snailStop: 4640,
    wallClock: [4600, 430],
    desk: { x0: 4420, x1: 6250, top: 900 },
    shelf: { x0: 4440, x1: 4760, y0: 560, y1: 900 },
    cubbies: { heart: [0, 0], cart: [1, 0], menu: [0, 1], star: [1, 1], share: [0, 2], gear: [1, 2] },
    boltDesk: [4880, 900],
    window: { x0: 5020, x1: 5920, y0: 370, y1: 860 },
    page: {
      titleBar: [370, 410], header: [420, 470], hero: [480, 590], card: [600, 720], reviews: [730, 800], footer: [810, 850],
      headerCart: [5850, 445],
      likeBtn: [5620, 690], likeR: 22,
      cartBtn: [5790, 690], cartBtnWH: [170, 46],
    },
    handIn: [6500, 250],
  };

  const CAMS = {
    serverMaster: [740, 600, 1.1],
    deskMaster: [5200, 580, .95],
    dockClose: [1740, 200, 1.3],
    poster: [3250, 380, .5],
    widest: [3150, 300, .38],
  };

  function cubbyCentre(kind) {
    const [c, r] = WORLD.cubbies[kind], s = WORLD.shelf, cw = (s.x1 - s.x0) / 2, ch = (s.y1 - s.y0) / 3;
    return [s.x0 + cw * (c + .5), s.y0 + ch * (r + .5)];
  }

  function hills(x) {
    return 770 + 70 * Math.sin(x * .0021 + .6) + 45 * Math.sin(x * .0047 + 2.1) + 18 * Math.sin(x * .011 + 4);
  }
  function groundY(x) {
    if (x < WORLD.land.x0) return WORLD.shop.floor;
    if (x > WORLD.land.x1) return WORLD.house.floor;
    const edge = Math.min(x - WORLD.land.x0, WORLD.land.x1 - x), k = ease(clamp(edge / 260));
    const floor = x - WORLD.land.x0 < WORLD.land.x1 - x ? WORLD.shop.floor : WORLD.house.floor;
    return lerp(floor, hills(x), k);
  }

  const camOf = v => typeof v === 'string' ? CAMS[v] : v;
  function camKeys(t, keys, e = ease) { return kf(t, keys.map(([k, v]) => [k, camOf(v)]), e); }

  const lod = () => (CAM ? CAM.zoom : 1);
  function viewRect(margin = 80) {
    if (!CAM) return [-margin, -margin, W + margin, H + margin];
    const hw = (W / 2) / CAM.zoom + margin, hh = (H / 2) / CAM.zoom + margin, r = Math.abs(Math.sin(CAM.rot || 0)) * hw;
    return [CAM.cx - hw - r, CAM.cy - hh - r, CAM.cx + hw + r, CAM.cy + hh + r];
  }
  function cull(x0, y0, x1, y1) {
    const [a, b, c, d] = viewRect();
    return x1 < a || x0 > c || y1 < b || y0 > d;
  }
  function par(depth, ref = [W / 2, H / 2]) {
    if (!CAM) return [0, 0];
    return [(CAM.cx - ref[0]) * (1 - depth), (CAM.cy - ref[1]) * (1 - depth)];
  }

  function pathLength(P) { let L = 0; for (let i = 1; i < P.length; i++) L += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); return L; }
  function resample(P, step) {
    const out = [P[0]];
    let carry = 0;
    for (let i = 1; i < P.length; i++) {
      const [ax, ay] = P[i - 1], [bx, by] = P[i], d = Math.hypot(bx - ax, by - ay);
      let s = step - carry;
      while (s <= d) { const k = s / d; out.push([ax + (bx - ax) * k, ay + (by - ay) * k]); s += step; }
      carry = d - (s - step);
    }
    const last = P[P.length - 1], end = out[out.length - 1];
    if (Math.hypot(last[0] - end[0], last[1] - end[1]) > step * .2) out.push(last);
    return out;
  }
  function chunksOf(P, maxLen = 600) {
    const R = resample(P, 20), per = Math.max(2, Math.floor(maxLen / 20)), out = [];
    for (let i = 0; i < R.length - 1; i += per) out.push(R.slice(i, Math.min(R.length, i + per + 1)));
    if (out.length > 1 && out[out.length - 1].length < 4) { const tail = out.pop(); out[out.length - 1].push(...tail.slice(1)); }
    return out;
  }
  function longLine(P, sw = 1, col = PAL.ink, br = 'inkflat', curv = .5) {
    if (P.length < 2) return;
    for (const c of chunksOf(P)) if (c.length > 1) inkLine(c, sw, col, br, c.length > 2 ? curv : 0);
  }
  // A tapered ribbon along a long path, painted in chunks: flat wash per chunk, ink edges as longLines.
  function longRibbon(P, w0, w1 = w0, o = {}) {
    const C = resample(P.length > 2 ? through(P) : P, 18), n = C.length, L = [], R = [];
    if (n < 2) return;
    for (let i = 0; i < n; i++) {
      const a = C[Math.max(0, i - 1)], b = C[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
      const w = lerp(w0, w1, i / (n - 1)) / 2;
      L.push([C[i][0] - dy / d * w, C[i][1] + dx / d * w]); R.push([C[i][0] + dy / d * w, C[i][1] - dx / d * w]);
    }
    const per = 30;
    for (let i = 0; i < n - 1; i += per) {
      const j = Math.min(n - 1, i + per + 1), poly = L.slice(i, j + 1).concat(R.slice(i, j + 1).reverse());
      paint(poly, { wash: o.wash, washOp: o.washOp, fill: o.fill, fillOp: o.fillOp, bleed: o.bleed ?? .02, tex: o.tex ?? .3, border: o.border, ink: null });
    }
    if (o.ink !== null) {
      const sw = o.sw ?? 1, ink = o.ink || PAL.ink;
      longLine(L, sw, ink); longLine(R, sw, ink);
      if (o.caps !== false) { inkLine([L[0], C[0], R[0]], sw, ink, 'inkflat', .6); inkLine([L[n - 1], C[n - 1], R[n - 1]], sw, ink, 'inkflat', .6); }
    }
  }

  Object.assign(window, { WORLD, CAMS, cubbyCentre, groundY, camKeys, lod, viewRect, cull, par, pathLength, resample, chunksOf, longLine, longRibbon });
})();
