(() => {
  const INK = PAL.ink, GLOVE = QWIK.white, SOLE = '#FFF1D4';
  const SHOE = QWIK.blue, SHOE_DK = QWIK.blueDk, SHOE_LT = QWIK.blueLt, RIM = '#E6DCFF', LEAK = '#FFF0B8';

  const SHOULDER = { L: [-7.45, -7.85], R: [.15, -7.8] };
  const HIP = { L: [-2.25, -3.05], R: [-.6, -2.2] };
  const PELVIS = [(HIP.L[0] + HIP.R[0]) / 2, (HIP.L[1] + HIP.R[1]) / 2];
  const SPOTS = {
    hip: { L: [-4.2, -3.3], R: [.3, -3.4] }, chin: { L: [-4.7, -5.3], R: [-2.8, -5.3] },
    chest: { L: [-4.6, -4.5], R: [-2.7, -4.3] }, head: { L: [-7.7, -13.2], R: [-4.3, -14.1] },
  };
  const TOP = BOLT[1];
  const K = {
    hipH: 8.9, pelvisX: 1.0, footX: 2.35, ankleH: 1.35,
    armLen: 8.6, armW: .6, legW: .68, legSlack: 1.09, legReach: 1.2,
    glove: 1.45, shoe: 1, toeX: 2.75, heelX: -1.25,
    hover: 1.4, tuck: .3, sagCap: 1.6, hosePx: 540, hoseMinPx: 4.4, hoseStep: 12,
  };
  const HOVER_HIP = K.hover - PELVIS[1], LEG_SPAN = K.hipH - K.ankleH, TOUCH = (HOVER_HIP - K.ankleH) / LEG_SPAN;
  const HOVER_PELVIS_X = PELVIS[0] - BODY_CX;

  const add = (a, b) => [a[0] + b[0], a[1] + b[1]], sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const mul = (a, k) => [a[0] * k, a[1] * k], norm = a => Math.hypot(a[0], a[1]);
  const unit = a => { const l = norm(a) || 1e-9; return [a[0] / l, a[1] / l]; };
  const mix2 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
  const camZoom = () => (typeof CAM !== 'undefined' && CAM ? CAM.zoom : 1);
  const pathLen = P => { let l = 0; for (let i = 1; i < P.length; i++) l += norm(sub(P[i], P[i - 1])); return l; };
  function evenly(P, step) {
    const out = [P[0]];
    let carry = 0;
    for (let i = 1; i < P.length; i++) {
      const a = P[i - 1], d = norm(sub(P[i], a));
      let s = step - carry;
      while (s <= d) { out.push(mix2(a, P[i], s / d)); s += step; }
      carry = d - (s - step);
    }
    if (norm(sub(P[P.length - 1], out[out.length - 1])) > step * .2) out.push(P[P.length - 1]);
    return out;
  }

  function legGeom(L) {
    if (L === 1) return { hipH: K.hipH, pelvisX: K.pelvisX, shoe: 1, dangle: 0, pivot: 1, w: 1 };
    const shoe = L >= TOUCH ? 1 : ease(L / TOUCH), stand = K.ankleH * shoe + LEG_SPAN * L, hipH = Math.max(HOVER_HIP, stand);
    return { hipH, pelvisX: lerp(HOVER_PELVIS_X, K.pelvisX, Math.min(1, L)), shoe, dangle: hipH - stand, pivot: Math.min(1, L / TOUCH),
      w: L > 1 ? clamp(1 / Math.sqrt(L), .75, 1) : lerp(.55, 1, shoe) };
  }

  function centripetal(P, step) {
    const n = P.length, out = [P[0]];
    for (let i = 0; i < n - 1; i++) {
      const p1 = P[i], p2 = P[i + 1], p0 = i > 0 ? P[i - 1] : sub(mul(p1, 2), p2), p3 = i + 2 < n ? P[i + 2] : sub(mul(p2, 2), p1);
      const t1 = Math.sqrt(norm(sub(p1, p0))), t2 = t1 + Math.sqrt(norm(sub(p2, p1))), t3 = t2 + Math.sqrt(norm(sub(p3, p2)));
      const m = Math.max(2, Math.ceil(norm(sub(p2, p1)) / step));
      for (let k = 1; k <= m; k++) {
        const t = lerp(t1, t2, k / m);
        const a1 = mix2(p0, p1, t / t1), a2 = mix2(p1, p2, (t - t1) / (t2 - t1)), a3 = mix2(p2, p3, (t - t2) / (t3 - t2));
        out.push(mix2(mix2(a1, a2, t / t2), mix2(a2, a3, (t - t1) / (t3 - t1)), (t - t1) / (t2 - t1)));
      }
    }
    return out;
  }

  function byCount(P, n) {
    const S = [0];
    for (let i = 1; i < P.length; i++) S.push(S[i - 1] + norm(sub(P[i], P[i - 1])));
    const total = S[S.length - 1], out = [];
    for (let k = 0, i = 0; k < n; k++) {
      const s = total * k / (n - 1);
      while (i < P.length - 2 && S[i + 1] < s) i++;
      out.push(P.length < 2 ? P[0] : mix2(P[i], P[i + 1], (s - S[i]) / ((S[i + 1] - S[i]) || 1)));
    }
    return out;
  }

  function hosePath(ctl, sagK, u) {
    const P = [ctl[0]];
    for (let i = 1; i < ctl.length; i++) {
      const a = P[P.length - 1], b = ctl[i], d = sub(b, a), l = norm(d);
      if (l < 1) continue;
      const sag = Math.min(K.sagCap * u, l * .045) * Math.abs(d[0]) / l * sagK;
      if (Math.abs(sag) > .5 && l > 6 * u) P.push([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + sag]);
      P.push(b);
    }
    const C = P.length > 2 ? evenly(centripetal(P, K.hoseStep), K.hoseStep) : evenly(P, K.hoseStep), S = [0];
    for (let i = 1; i < C.length; i++) S.push(S[i - 1] + norm(sub(C[i], C[i - 1])));
    const len = S[S.length - 1];
    const idx = s => { let lo = 0, hi = S.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (S[m] <= s) lo = m; else hi = m; } return lo; };
    const at = s => {
      if (C.length < 2) return C[0];
      s = clamp(s, 0, len);
      const i = Math.min(idx(s), C.length - 2);
      return mix2(C[i], C[i + 1], (s - S[i]) / ((S[i + 1] - S[i]) || 1));
    };
    const upTo = s => C.slice(0, idx(Math.min(s, len)) + 1).concat([at(s)]);
    const backTo = (s, r) => {
      const H = at(s);
      let lo = Math.max(0, s - 2 * r), hi = s;
      if (norm(sub(at(lo), H)) < r) return lo;
      for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2; if (norm(sub(at(m), H)) > r) lo = m; else hi = m; }
      return (lo + hi) / 2;
    };
    return { len, at, upTo, backTo };
  }
  const swing = (c, a, b, k, out) => {
    const da = sub(a, c), db = sub(b, c), ta = Math.atan2(da[1], da[0]), tb = Math.atan2(db[1], db[0]);
    let d = Math.atan2(Math.sin(tb - ta), Math.cos(tb - ta));
    const inward = out > 0 ? Math.PI : 0, rel = frac(((d > 0 ? inward - ta : ta - inward) / TAU)) * TAU;
    if (rel < Math.abs(d)) d -= Math.sign(d) * TAU;
    const th = ta + k * d, r = lerp(norm(da), norm(db), k);
    return [c[0] + r * Math.cos(th), c[1] + r * Math.sin(th)];
  };
  const rot2 = (p, a) => { const c = Math.cos(a), s = Math.sin(a); return [p[0] * c - p[1] * s, p[0] * s + p[1] * c]; };
  function sweep(c, A, B, k, out) {
    const ang = p => Math.atan2(p[1] - c[1], p[0] - c[0]), ha = ang(A[A.length - 1]);
    let hd = Math.atan2(Math.sin(ang(B[B.length - 1]) - ha), Math.cos(ang(B[B.length - 1]) - ha));
    const inward = out > 0 ? Math.PI : 0, rel = frac(((hd > 0 ? inward - ha : ha - inward) / TAU)) * TAU;
    if (rel < Math.abs(hd)) hd -= Math.sign(hd) * TAU;
    return A.map((p, i) => {
      const ta = ang(p), ra = norm(sub(p, c)), rb = norm(sub(B[i], c));
      let d = Math.atan2(Math.sin(ang(B[i]) - ta), Math.cos(ang(B[i]) - ta));
      if (d * hd < 0 && Math.abs(hd) > Math.PI) d += Math.sign(hd) * TAU;
      const th = ta + k * d, r = lerp(ra, rb, k);
      return [c[0] + r * Math.cos(th), c[1] + r * Math.sin(th)];
    });
  }

  function hoseArc(S, E, L, side, maxSag = 0, n = 16) {
    const d = sub(E, S), c = norm(d) || 1e-6, ux = d[0] / c, uy = d[1] / c;
    const len = Math.max(L, c * 1.004), q = c / len, cap = Math.PI * .9;
    let h, R;
    if (Math.sin(cap) / cap > q) { h = cap; R = c / (2 * Math.sin(cap)); }
    else {
      let lo = 1e-4, hi = cap;
      for (let i = 0; i < 28; i++) { const m = (lo + hi) / 2; if (Math.sin(m) / m > q) lo = m; else hi = m; }
      h = (lo + hi) / 2; R = len / (2 * h);
    }
    if (maxSag && c * 1.004 >= L && R * (1 - Math.cos(h)) > maxSag) {
      R = (c * c / 4 + maxSag * maxSag) / (2 * maxSag); h = Math.asin(Math.min(1, c / (2 * R)));
      n = Math.max(n, Math.ceil(2 * R * h / K.hoseStep));
    }
    const off = R * Math.cos(h), M = [(S[0] + E[0]) / 2, (S[1] + E[1]) / 2], pts = [];
    for (let i = 0; i <= n; i++) {
      const f = -h + 2 * h * i / n, px = R * Math.sin(f), py = R * Math.cos(f) - off;
      pts.push([M[0] + ux * px - side * uy * py, M[1] + uy * px + side * ux * py]);
    }
    const tan = [ux * Math.cos(h) + side * uy * Math.sin(h), uy * Math.cos(h) - side * ux * Math.sin(h)];
    return { pts, tan, stretch: c / L };
  }

  const C = (ax, ay, bx, by, r, k = 0) => ({ a: [ax, ay], b: [bx, by], r, k });
  const O = (x, y, r, k = 0) => C(x, y, x, y, r, k);
  function sdCap(px, py, c) {
    const bax = c.b[0] - c.a[0], bay = c.b[1] - c.a[1], pax = px - c.a[0], pay = py - c.a[1];
    const l2 = bax * bax + bay * bay, h = l2 ? clamp((pax * bax + pay * bay) / l2) : 0;
    return Math.hypot(pax - bax * h, pay - bay * h) - c.r;
  }
  const smin = (a, b, k) => { if (!k) return Math.min(a, b); const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * .25; };

  function silhouette(prims, step = .055) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const c of prims) for (const p of [c.a, c.b]) {
      x0 = Math.min(x0, p[0] - c.r); x1 = Math.max(x1, p[0] + c.r); y0 = Math.min(y0, p[1] - c.r); y1 = Math.max(y1, p[1] + c.r);
    }
    x0 -= 3 * step; y0 -= 3 * step; x1 += 3 * step; y1 += 3 * step;
    const nx = Math.ceil((x1 - x0) / step) + 1, ny = Math.ceil((y1 - y0) / step) + 1, v = new Float64Array(nx * ny);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      let d = Infinity; const px = x0 + i * step, py = y0 + j * step;
      for (const c of prims) d = smin(d, sdCap(px, py, c), c.k);
      v[j * nx + i] = d;
    }
    const P = new Map(), adj = new Map();
    const at = (id, ax, ay, va, bx, by, vb) => { if (!P.has(id)) { const k = va / (va - vb); P.set(id, [ax + (bx - ax) * k, ay + (by - ay) * k]); } return id; };
    const link = (a, b) => { if (!adj.has(a)) adj.set(a, []); if (!adj.has(b)) adj.set(b, []); adj.get(a).push(b); adj.get(b).push(a); };
    for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
      const a = v[j * nx + i], b = v[j * nx + i + 1], c = v[(j + 1) * nx + i + 1], d = v[(j + 1) * nx + i];
      const code = (a < 0 ? 1 : 0) | (b < 0 ? 2 : 0) | (c < 0 ? 4 : 0) | (d < 0 ? 8 : 0);
      if (code === 0 || code === 15) continue;
      const X = x0 + i * step, Y = y0 + j * step, s = step;
      const T = () => at((j * nx + i) * 2, X, Y, a, X + s, Y, b), Rt = () => at((j * nx + i + 1) * 2 + 1, X + s, Y, b, X + s, Y + s, c);
      const B = () => at(((j + 1) * nx + i) * 2, X, Y + s, d, X + s, Y + s, c), Lf = () => at((j * nx + i) * 2 + 1, X, Y, a, X, Y + s, d);
      const inside = (a + b + c + d) / 4 < 0;
      switch (code) {
        case 1: case 14: link(Lf(), T()); break;
        case 2: case 13: link(T(), Rt()); break;
        case 3: case 12: link(Lf(), Rt()); break;
        case 4: case 11: link(Rt(), B()); break;
        case 6: case 9: link(T(), B()); break;
        case 7: case 8: link(Lf(), B()); break;
        case 5: if (inside) { link(T(), Rt()); link(B(), Lf()); } else { link(Lf(), T()); link(Rt(), B()); } break;
        case 10: if (inside) { link(Lf(), T()); link(Rt(), B()); } else { link(T(), Rt()); link(B(), Lf()); } break;
      }
    }
    let best = [], bestA = 0;
    const seen = new Set();
    for (const start of adj.keys()) {
      if (seen.has(start)) continue;
      const loop = []; let prev = null, cur = start;
      while (cur != null && !seen.has(cur)) {
        seen.add(cur); loop.push(P.get(cur));
        const nb = adj.get(cur), nxt = nb[0] !== prev ? nb[0] : nb[1]; prev = cur; cur = nxt;
      }
      let A = 0; for (let i = 0; i < loop.length; i++) { const p = loop[i], q = loop[(i + 1) % loop.length]; A += p[0] * q[1] - q[0] * p[1]; }
      if (Math.abs(A) > bestA) { bestA = Math.abs(A); best = loop; }
    }
    return best.filter((_, i) => i % 2 === 0);
  }

  const GRIPS = {
    open: {
      wrist: -1.0, stitch: true,
      back: [C(-.45, .04, .2, .02, .74), C(.3, -.44, 1.14, -.52, .28, .1), C(.35, .02, 1.34, .03, .3, .1), C(.3, .47, 1.1, .56, .27, .1), C(-.15, -.55, .4, -1.06, .25, .16)],
      lines: [[[1.12, -.25], [.86, -.24], [.6, -.23]], [[1.08, .3], [.84, .28], [.6, .26]]],
    },
    wave: {
      wrist: -1.0,
      back: [C(-.42, 0, .18, 0, .76), C(.25, -.5, .92, -1.1, .27, .1), C(.4, -.06, 1.4, -.34, .29, .1), C(.38, .42, 1.28, .62, .27, .1), C(-.25, -.62, -.12, -1.38, .25, .14)],
      lines: [[[-.45, -.28], [-.12, .02], [-.2, .42]]],
    },
    point: {
      wrist: -.98, stitch: true,
      back: [C(-.35, .06, .18, .08, .72), C(.25, -.36, 1.72, -.42, .25, .1)],
      front: [O(.6, .12, .32, .06), O(.52, .52, .3, .06)],
      front2: [C(-.1, -.5, .48, -.22, .23)],
      frontLines: [[[.86, .33], [.7, .34], [.55, .35]]],
    },
    fist: {
      wrist: -1.0, stitch: true,
      back: [C(-.35, .04, .25, .04, .76)],
      front: [O(.72, -.36, .3, .06), O(.8, .1, .32, .06), O(.7, .55, .3, .06)],
      front2: [C(0, -.6, .6, -.2, .24)],
      frontLines: [[[.98, -.13], [.82, -.12], [.66, -.12]], [[.98, .33], [.82, .32], [.66, .32]]],
    },
    thumb: {
      wrist: -1.0, stitch: true,
      back: [C(-.3, .1, .25, .1, .74), O(.72, -.22, .3, .06), O(.78, .22, .31, .06), O(.66, .62, .28, .06), C(.05, -.5, .16, -1.55, .27, .15)],
      lines: [[[.98, 0], [.82, 0], [.66, 0]], [[.94, .43], [.8, .42], [.64, .42]]],
    },
    grab: {
      wrist: -1.9, stitch: false,
      back: [C(-1.38, -.28, -1.32, .34, .6)],
      front: [C(-1.05, -.52, -.28, -.56, .23, .05), C(-1.0, -.06, -.16, -.05, .245, .05), C(-1.02, .4, -.3, .43, .22, .05)],
      frontLines: [[[-.36, -.29], [-.62, -.29], [-.88, -.3]], [[-.4, .2], [-.64, .19], [-.9, .18]]],
    },
  };

  function cuffPts(wx) {
    return [[wx + .05, -.56], [wx - .2, -.64], [wx - .52, -.8], [wx - .66, -.72], [wx - .7, 0], [wx - .66, .72], [wx - .52, .8], [wx - .2, .64], [wx + .05, .56], [wx + .12, 0]];
  }

  function drawGlove(grip, g, sw, hook, u, lit = false) {
    const G = GRIPS[grip] || GRIPS.open, sc = pts => pts.map(p => [p[0] * g, p[1] * g]);
    const shake = list => list.map(c => { const o = [jit(.03), jit(.03)]; return { ...c, a: add(c.a, o), b: add(c.b, o) }; });
    paint(sc(silhouette(shake(G.back))), { wash: GLOVE, ink: INK, sw: sw * .75, curv: .3 });
    if (G.stitch) for (const y of [-.28, 0, .28]) inkLine(sc([[-.62, y * 1.05], [-.2, y * 1.15], [.08, y * 1.25]]), sw * .38, INK, 'inkfine', .5);
    for (const l of G.lines || []) inkLine(sc(l), sw * .45, INK, 'inkfine', .5);
    const cuff = sc(cuffPts(G.wrist));
    paint(cuff, { wash: GLOVE, ink: INK, sw: sw * .7, curv: .45 });
    inkLine(sc([[G.wrist - .44, -.7], [G.wrist - .5, 0], [G.wrist - .44, .7]]), sw * .4, INK, 'inkfine', .6);
    if (hook) { push(); if (lit) { translate(g * .3, 0); rotate(Math.PI / 2); } hook(u, sw); pop(); }
    for (const layer of [G.front, G.front2]) if (layer) paint(sc(silhouette(shake(layer))), { wash: GLOVE, ink: INK, sw: sw * .7, curv: .3 });
    for (const l of G.frontLines || []) inkLine(sc(l), sw * .42, INK, 'inkfine', .5);
    if (lit) for (const l of G.frontLines || []) {
      const P = sc(l);
      inkLine([P[0], P[2]], sw * .55, LEAK, 'inkfine', 0);
      glow(P[0][0], P[0][1], g * .6, '#FFC957', .9);
    }
  }

  function emitsLight(hook, u, sw) {
    const keep = { paint, inkLine, glow, letter, flushBrush };
    let lit = false;
    paint = inkLine = letter = flushBrush = () => {};
    glow = () => { lit = true; };
    push();
    try { hook(u, sw); } catch (e) { lit = false; } finally { pop(); ({ paint, inkLine, glow, letter, flushBrush } = keep); }
    return lit;
  }

  const SHOE_PTS = silhouette([O(-.36, -.86, .86), O(1.72, -1.36, 1.36), C(-.36, -.6, 1.72, -.6, .6), C(-.1, -1.05, 1.2, -1.3, .8, .55)], .07).map(p => [p[0], Math.min(0, p[1])]);

  function shoeXf(tilt, sx) {
    const pv = [tilt > 0 ? K.toeX : K.heelX, 0], raw = p => add(pv, rot2(sub([p[0] * sx, p[1]], pv), tilt));
    let low = -Infinity; for (const p of SHOE_PTS) low = Math.max(low, raw(p)[1]);
    const fix = -low, xf = p => { const q = raw(p); return [q[0], q[1] + fix]; };
    xf.fix = fix;
    return xf;
  }

  function drawShoe(u, sw, far) {
    const s = u * K.shoe, P = pts => pts.map(p => [p[0] * s + jit(u * .025), p[1] * s + jit(u * .025)]);
    const hull = P(SHOE_PTS);
    paint(hull, { wash: far ? mixCol(SHOE, SHOE_DK, .35) : SHOE, ink: null });
    const shade = clipHalf(hull, [3.4 * s, -1.25 * s], [-1.8 * s, -.95 * s]);
    if (shade.length > 2) paint(shade, { fill: SHOE_DK, fillOp: 80, bleed: .06, tex: .5, border: .45, ink: null });
    const sole = clipHalf(hull, [3.4 * s, -.56 * s], [-1.8 * s, -.4 * s]);
    if (sole.length > 2) paint(sole, { wash: SOLE, ink: null });
    paint(P(ellPts(1.45, -2.08, .44, .24, 12, 0, -.35)), { wash: SHOE_LT, washOp: 230, ink: null });
    paint(hull, { ink: INK, sw: sw * .85 });
    inkLine(P([[-1.2, -.41], [.8, -.47], [3.0, -.56]]), sw * .5, INK, 'inkfine', .4);
    inkLine(P([[.55, -2.12], [.42, -1.3], [.62, -.5]]), sw * .42, INK, 'inkfine', .5);
    paint(P(ellPts(-.22, -1.66, .5, .19, 12)), { wash: INK, ink: null });
  }

  const GAIT = {
    walk: { stride: 10, duty: .56, lift: 3.1, bob: .6, lean: .06, rock: .025, arm: .36, spread: .55 },
    run: { stride: 14, duty: .42, lift: 3.4, bob: 1.0, lean: .2, rock: .03, arm: .8, spread: .45 },
  };
  const sagSide = a => clamp(Math.SQRT2 * Math.sin(a + Math.PI / 4), -1, 1);

  function limbRibbon(pts, w, sw, rim = 0) {
    paint(ribbon(pts, w, w), { wash: INK, ink: INK, sw: sw * .5 });
    if (w >= 9) {
      const n = pts.length, hi = [];
      for (let i = 1; i < n - 1; i++) {
        const d = unit(sub(pts[Math.min(n - 1, i + 1)], pts[i - 1])), nrm = [-d[1], d[0]], side = nrm[0] + nrm[1] < 0 ? 1 : -1;
        hi.push(add(pts[i], mul(nrm, side * w * .22)));
      }
      inkLine(hi.filter((_, i) => i > 1 && i < hi.length - 2), w * .07, '#5A5068', 'inkfine', .5);
    }
    if (rim > 0) for (const [P, k] of rimEdges(evenly(through(pts), Math.max(4, w * .8)), w, sw)) rimStroke(P.slice(1, -1), sw, rim, k);
  }

  function edges(C, half) {
    const n = C.length, Lp = [], Rp = [];
    for (let i = 0; i < n; i++) {
      const d = unit(sub(C[Math.min(n - 1, i + 1)], C[Math.max(0, i - 1)]));
      Lp.push([C[i][0] - d[1] * half, C[i][1] + d[0] * half]); Rp.push([C[i][0] + d[1] * half, C[i][1] - d[0] * half]);
    }
    return [Lp, Rp];
  }
  const rimEdges = (C, w, sw) => {
    const E = edges(C, w / 2 - sw * .3), mid = Math.floor(C.length / 2), up = E[0][mid][1] < E[1][mid][1] ? 0 : 1;
    return [[E[up], 1], [E[1 - up], .55]];
  };
  const rimStroke = (P, sw, rim, k) => { if (P.length > 1) inkLine(P, sw * (.12 + .16 * rim) * (.75 + .25 * k), mixCol(INK, RIM, rim * k), 'inkflat', 0); };

  function drawHose(C, w, sw, rsK, ctx) {
    const n = C.length;
    if (n < 2) return;
    const [Lp, Rp] = edges(C, w / 2), per = 24, last = Math.ceil((n - 1) / per) - 1, rimE = ctx.rim > 0 ? rimEdges(C, w, sw) : null;
    const seen = P => {
      if (typeof cull !== 'function') return true;
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const [px, py] of P) { const wx = ctx.x + ctx.fx * px, wy = ctx.y + py; x0 = Math.min(x0, wx); x1 = Math.max(x1, wx); y0 = Math.min(y0, wy); y1 = Math.max(y1, wy); }
      return !cull(x0 - w, y0 - w, x1 + w, y1 + w);
    };
    for (let i = 0, k = 0; i < n - 1; i += per, k++) {
      const j = Math.min(n - 1, i + per + 1), l = Lp.slice(i, j + 1), r = Rp.slice(i, j + 1);
      rsK(k);
      if (!seen(l.concat(r))) continue;
      paint(l.concat(r.slice().reverse()), { wash: INK, ink: null });
      inkLine(l, sw * .5, INK, 'inkflat', 0);
      inkLine(r, sw * .5, INK, 'inkflat', 0);
      const a = k === 0 ? 2 : 0, b = k === last ? 2 : 0;
      if (w >= 9) {
        const hi = [];
        for (let m = i; m <= j; m++) {
          const d = unit(sub(C[Math.min(n - 1, m + 1)], C[Math.max(0, m - 1)])), nrm = [-d[1], d[0]], side = nrm[0] + nrm[1] < 0 ? 1 : -1;
          hi.push(add(C[m], mul(nrm, side * w * .22)));
        }
        const Q = hi.slice(a, hi.length - b);
        if (Q.length > 1) inkLine(Q, w * .07, '#5A5068', 'inkfine', 0);
      }
      if (rimE) for (const [P, rk] of rimE) rimStroke(P.slice(i, j + 1).slice(a, j + 1 - i - b), sw, ctx.rim, rk);
    }
  }

  function legRestLen(s) {
    const pelvis = [K.pelvisX, -K.hipH], hip = add(pelvis, sub(HIP[s], PELVIS));
    const ankle = [(s === 'L' ? -1 : 1) * K.footX, -K.ankleH];
    return norm(sub(ankle, hip)) * K.legSlack;
  }
  const LEG_LEN = { L: legRestLen('L'), R: legRestLen('R') };

  function legExtension(rise, L = 1) {
    const reach = K.legReach * Math.min(1, L);
    if (rise <= reach) return rise;
    return Math.max(-1.3 * Math.min(1, L), reach * (1 - (rise - reach) / 2.2));
  }

  function boltDist(p) {
    let inside = false, d = Infinity;
    for (let i = 0, j = BOLT.length - 1; i < BOLT.length; j = i++) {
      const a = BOLT[i], b = BOLT[j];
      if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
      const ab = sub(b, a), k = clamp(((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1]) / (ab[0] * ab[0] + ab[1] * ab[1]));
      d = Math.min(d, norm(sub(p, add(a, mul(ab, k)))));
    }
    return inside ? -d : d;
  }

  function solve(x, y, u, o) {
    const flip = !!o.flip, fx = flip ? -1 : 1;
    const pick = (key, s) => o[key + (flip ? (s === 'L' ? 'R' : 'L') : s)];
    const toRig = p => [(p[0] - x) * fx, p[1] - y], toWorld = p => [x + fx * p[0], y + p[1]];
    const legK = Math.max(0, o.legLen ?? 1), LG = legGeom(legK);

    const walking = o.walk != null, wk = walking ? clamp(o.walkK ?? 1) : 0, run = !!o.run, wd = (o.walkDir ?? fx) * fx < 0 ? -1 : 1;
    const G = run ? GAIT.run : GAIT.walk, stride = G.stride * (o.stride ?? 1), phase = walking ? o.walk + (wd > 0 ? .5 : 0) + (2 * G.duty - 1) / 4 : 0;
    const bobWalk = walking ? wk * G.bob * (.5 - .5 * Math.cos((phase * 2 - .15) * TAU)) : 0;

    const sqB = (o.sq || 0) + (o.take || 0);
    const rise = -(o.dy || 0) - sqB * LG.hipH * .45 * LG.pivot + bobWalk;
    const ext = legExtension(rise, legK), airborne = Math.max(0, rise - ext);
    const theta = (o.rot || 0) + (o.lean || 0) + wd * wk * (G.lean + G.rock * Math.cos((phase * 2 - .15) * TAU));
    const kx = (o.sx ?? 1) * (1 + sqB * .6), ky = (o.sy ?? 1) * (1 - sqB), turn = o.turnX ?? 1;
    const cT = Math.cos(theta), sT = Math.sin(theta);
    const rsP = [(PELVIS[0] * kx * u) * cT - (PELVIS[1] * ky * u) * sT, (PELVIS[0] * kx * u) * sT + (PELVIS[1] * ky * u) * cT];
    let pelvis = [(LG.pelvisX + (o.dx || 0)) * u, -(LG.hipH + rise) * u];
    if (LG.pivot < 1) pelvis = add(pelvis, mul(sub(rsP, mul(PELVIS, u)), 1 - LG.pivot));
    const body = p => {
      const lx = (BODY_CX + (p[0] - BODY_CX) * turn - PELVIS[0]) * kx * u, ly = (p[1] - PELVIS[1]) * ky * u;
      return [pelvis[0] + lx * cT - ly * sT, pelvis[1] + lx * sT + ly * cT];
    };
    const toLocal = p => {
      const d = sub(p, pelvis), lx = (d[0] * cT + d[1] * sT) / (kx * u), ly = (-d[0] * sT + d[1] * cT) / (ky * u);
      return [(lx + PELVIS[0] - BODY_CX) / (turn || 1e-3) + BODY_CX, ly + PELVIS[1]];
    };

    const feet = {};
    for (const s of ['L', 'R']) {
      const out = s === 'L' ? -1 : 1, idle = [out * K.footX * (o.legSpread ?? 1) * u, 0];
      let foot = idle, tilt = 0;
      if (walking) {
        const p = frac(phase + (s === 'L' ? 0 : .5)), A = stride * u * G.duty / 2;
        let wx, wy = 0;
        if (p < G.duty) {
          const k = p / G.duty;
          wx = A * (1 - 2 * k);
          tilt = -.32 * (1 - ease(k / .18)) + .5 * ease(seg(k, .68, 1));
        } else {
          const q = (p - G.duty) / (1 - G.duty);
          const m = -2 * A * (1 - G.duty) / G.duty, q2 = q * q, q3 = q2 * q;
          wx = -A + 2 * A * (3 * q2 - 2 * q3) + m * (2 * q3 - 3 * q2 + q);
          wy = -G.lift * u * Math.sin(Math.PI * Math.pow(q, .68));
          tilt = lerp(.5, -.32, ease(q));
        }
        foot = [lerp(idle[0], wd * wx + out * G.spread * u, wk), wy * wk];
        tilt *= wk;
      }
      tilt += .55 * (pick('heel', s) || 0);
      if (LG.shoe < 1) foot = [lerp(body(HIP[s])[0], foot[0], LG.shoe), foot[1]];
      feet[s] = { foot: [foot[0], foot[1] - (airborne + LG.dangle + (pick('lift', s) || 0)) * u], tilt, dir: walking ? lerp(out, wd, wk) : out, far: wk > .5 && out === -wd, shoe: LG.shoe };
    }

    const arm = s => {
      const out = s === 'L' ? -1 : 1, root = body(SHOULDER[s]);
      const len = Math.max(0, pick('len', s) ?? 1), tk = len < K.tuck ? ease(len / K.tuck) : 1;
      const L = K.armLen * u * len, grip = pick('grip', s) || 'open', GR = GRIPS[grip] || GRIPS.open;
      const reach = (Math.abs(GR.wrist) + .35) * K.glove * u * tk, spot = pick('hand', s), mix = clamp(pick('handMix', s) ?? 1);
      const turnHand = tan => {
        let ang = Math.atan2(tan[1], tan[0]);
        if (grip === 'thumb') { const up = out > 0 ? 0 : Math.PI; ang += .8 * Math.atan2(Math.sin(up - ang), Math.cos(up - ang)); }
        return ang + out * (pick('wrist', s) || 0);
      };
      let a = pick('a', s) ?? -1.2, bend = pick('bend', s), res, hand, ang;
      if (walking) {
        const dir = s === 'R' ? 1 : -1, amp = G.arm * wk, psi = (phase - (s === 'R' ? .07 : .1)) * TAU;
        const v = dir * Math.cos(psi);
        a += amp * (v > 0 ? v : .45 * v);
        bend = (bend ?? .4 * sagSide(a)) + .7 * amp * dir * Math.sin(psi);
      }
      if (bend == null) bend = .4 * sagSide(a);
      const chord = L * (1 - .32 * Math.min(1, Math.abs(bend))), dir = [out * Math.cos(a), -Math.sin(a)];
      const Wr = add(root, mul(dir, chord));
      res = hoseArc(root, Wr, L, (Math.sign(bend) || 1) * out);
      ang = turnHand(res.tan);
      hand = add(Wr, [Math.cos(ang) * reach, Math.sin(ang) * reach]);
      const via = pick('via', s), viaOn = Array.isArray(via) && via.length > 0;
      let path = null, sEnd = 0;
      if (viaOn) {
        path = hosePath([root, ...via.map(toRig), ...(Array.isArray(spot) ? [toRig(spot)] : [])], pick('sag', s) ?? 1, u);
        sEnd = lerp(Math.min(path.len, L + reach), path.len, clamp(pick('reach', s) ?? 1));
      }
      if (viaOn && mix > 0) {
        const sW = path.backTo(sEnd, reach), Wv = path.at(sW), tan = unit(sub(path.at(sEnd), Wv)), vAng = turnHand(tan);
        if (mix >= 1) {
          ang = vAng;
          hand = add(Wv, [Math.cos(ang) * reach, Math.sin(ang) * reach]);
          res = { pts: path.upTo(sW), tan, stretch: sW / Math.max(1e-6, L), via: true };
        } else {
          const pts = sweep(root, byCount(res.pts, 24), byCount(path.upTo(sW), 24), mix, out);
          ang += mix * Math.atan2(Math.sin(vAng - ang), Math.cos(vAng - ang));
          hand = add(pts[pts.length - 1], [Math.cos(ang) * reach, Math.sin(ang) * reach]);
          res = { pts, tan: [Math.cos(ang), Math.sin(ang)], stretch: lerp(res.stretch, sW / Math.max(1e-6, L), mix) };
        }
      } else if (spot && mix > 0) {
        const named = typeof spot === 'string' ? (SPOTS[spot] || SPOTS.hip)[s] : null, goal = named ? body(named) : toRig(spot);
        let T = mix < 1 ? swing(root, hand, goal, mix, out) : goal;
        if (tk < 1) T = mix2(root, T, tk);
        const d = sub(T, root);
        const side = (Math.sign(pick('bend', s) ?? sagSide(Math.atan2(-d[1], out * d[0]))) || 1) * out;
        ang = turnHand(hoseArc(root, T, L + reach, side, K.sagCap * u).tan);
        res = hoseArc(root, sub(T, [Math.cos(ang) * reach, Math.sin(ang) * reach]), L, side, K.sagCap * u);
        hand = T;
      }
      const front = pick('front', s) ?? (tk < 1 ? false : boltDist(toLocal(hand)) < 1.8);
      return { s, out, root, res, hand, grip, hook: pick('hold', s), front, ang, tk };
    };

    const legs = ['L', 'R'].map(s => {
      const out = s === 'L' ? -1 : 1, F = feet[s], hip = body(HIP[s]);
      F.xf = shoeXf(F.tilt, Math.max(.25, Math.abs(F.dir)));
      const ak = F.xf([0, -K.ankleH]), ankle = add(F.foot, [(F.dir < 0 ? -1 : 1) * ak[0] * u * F.shoe, ak[1] * u * F.shoe]);
      const c = norm(sub(ankle, hip)), bowDir = walking ? lerp(out, wd, wk) : out;
      const res = hoseArc(hip, ankle, lerp(c, LEG_LEN[s] * u * legK, Math.min(1, Math.abs(bowDir))), -(Math.sign(bowDir) || 1));
      return { s, F, res, w: LG.w };
    });

    const arms = o.noLimbs ? [] : [arm('L'), arm('R')];
    const anchor = sub(pelvis, rsP);
    const armOf = s => arms.find(A => A.s === s);
    const handOf = s => { const A = armOf(s); return toWorld(A ? A.hand : body(SHOULDER[s])); };
    const pathOf = s => { const A = armOf(s); return A ? A.res.pts.concat([A.hand]).map(toWorld) : [toWorld(body(SHOULDER[s]))]; };
    const [sl, sr] = flip ? ['R', 'L'] : ['L', 'R'];
    const pts = {
      handL: handOf(sl), handR: handOf(sr), face: toWorld(body([FACE.x, FACE.y])), top: toWorld(body(TOP)),
      feet: [toWorld(feet[sl].foot), toWorld(feet[sr].foot)],
      shoulderL: toWorld(body(SHOULDER[sl])), shoulderR: toWorld(body(SHOULDER[sr])), armPathL: pathOf(sl), armPathR: pathOf(sr),
    };
    return { fx, sqB, theta, airborne, arms, legs, anchor: toWorld(anchor), pts, legK, tipH: -anchor[1] / u, bodyX: toWorld(anchor)[0] + fx * BODY_CX * u };
  }

  function drawArm(A, u, sw, rs, ctx) {
    if (A.tk < .02) return;
    rs('arm' + A.s);
    const zoom = camZoom(), px = pathLen(A.res.pts) * zoom;
    const w = Math.max(K.armW * u * clamp(Math.sqrt(1 / Math.max(1, A.res.stretch)), .5, 1) * A.tk, K.hoseMinPx / zoom * seg(px, K.hosePx * .75, K.hosePx));
    if (px > K.hosePx) drawHose(A.res.via ? A.res.pts : evenly(through(A.res.pts), K.hoseStep), w, sw, k => rs(`arm${A.s} ${k}`), ctx);
    else limbRibbon(A.res.pts, w, sw, ctx.rim);
    const hook = A.hook && A.tk < 1 ? (uu, ss) => { scale(A.tk); A.hook(uu, ss); } : A.hook, lit = !!hook && A.grip === 'fist' && emitsLight(hook, u, sw);
    rs('glove' + A.s);
    push(); translate(A.hand[0], A.hand[1]); rotate(A.ang); scale(1, A.out);
    drawGlove(A.grip, K.glove * u * A.tk, sw, hook, u, lit);
    pop();
  }

  function drawLeg(Lg, u, sw, rs, ctx) {
    const F = Lg.F;
    if (F.shoe < .02) return;
    rs('leg' + Lg.s);
    limbRibbon(Lg.res.pts, K.legW * u * clamp(Math.sqrt(1 / Math.max(1, Lg.res.stretch)), .6, 1) * Lg.w, sw, ctx.rim);
    rs('shoe' + Lg.s);
    const pivot = F.tilt > 0 ? K.toeX : K.heelX, sx = Math.max(.25, Math.abs(F.dir));
    push(); translate(F.foot[0], F.foot[1]); if (F.shoe !== 1) scale(F.shoe); scale(F.dir < 0 ? -1 : 1, 1);
    translate(0, F.xf.fix * u); translate(pivot * u, 0); rotate(F.tilt); translate(-pivot * u, 0); scale(sx, 1);
    drawShoe(u, sw, F.far);
    pop();
  }

  const NO_FACE = { mouth: null, lid: 0, blush: 0, gloom: 0, brows: null, mustache: null, shades: null, hands: null, thumbs: null, lasers: 0, sob: null };
  function faceless(draw) { const keep = eyes; eyes = () => {}; try { draw(); } finally { eyes = keep; } }

  function qwik(x, y, u, o = {}) {
    const id = o.boilKey ?? ++CLAWD_N, rs = part => boilSeed(`rigA ${id} ${part}`);
    const sw = clamp(u / 15, .45, 2.4) * (o.swMul || 1), S = solve(x, y, u, o), ctx = { x, y, fx: S.fx, rim: clamp(o.rim || 0) };

    if (S.legK === 0) boilSeed(`bolt ${id} shadow`); else rs('shadow');
    if (!o.noShadow) {
      const f = 1 - Math.min(.55, S.airborne * .07);
      if (S.legK >= 1) paint(ellPts(x + S.fx * .3 * u, y + u * .12, u * 6.4 * f, u * .95 * f, 22), { fill: INK, fillOp: 70, bleed: .25, tex: .3, border: .1, ink: null });
      else {
        const k = S.legK, fe = 1 - Math.min(.5, Math.abs(S.tipH) * .05);
        paint(ellPts(lerp(S.bodyX, x + S.fx * .3 * u, k), y + u * lerp(.15, .12, k), u * lerp(4.6 * fe, 6.4 * f, k), u * lerp(.85 * fe, .95 * f, k), 22),
          { fill: INK, fillOp: lerp(75, 70, k), bleed: .25, tex: .3, border: .1, ink: null });
      }
    }
    push(); translate(x, y); scale(S.fx, 1);
    if (!o.noLimbs) for (const Lg of S.legs.slice().sort((a, b) => (b.F.far ? 1 : 0) - (a.F.far ? 1 : 0))) drawLeg(Lg, u, sw, rs, ctx);
    for (const A of S.arms) if (!A.front) drawArm(A, u, sw, rs, ctx);
    pop();

    const tip = S.legK < .12 ? K.hover : 0;
    const B = { ...o, ...(o.noFace ? NO_FACE : null), dx: 0, dy: tip, hover: tip, sq: S.sqB, take: 0, rot: S.fx * S.theta, noShadow: true, boilKey: id };
    const drawBody = () => bolt(S.anchor[0] + BODY_CX * u, S.anchor[1], u, B);
    if (o.noFace) faceless(drawBody); else drawBody();

    push(); translate(x, y); scale(S.fx, 1);
    for (const A of S.arms) if (A.front) drawArm(A, u, sw, rs, ctx);
    pop();
    rs('after');
    return S.pts;
  }

  const points = (x, y, u, o = {}) => solve(x, y, u, o).pts;

  function stroll(t, t0, t1, x0, x1, u, run = false) {
    const x = lerp(x0, x1, ease(seg(t, t0, t1))), ramp = Math.min(.28, (t1 - t0) / 3), D = Math.abs(x1 - x0) || 1e-6;
    const cycles = Math.max(1, Math.round(D / ((run ? GAIT.run : GAIT.walk).stride * u)));
    return { x, walk: cycles * Math.abs(x - x0) / D, stride: D / (cycles * (run ? GAIT.run : GAIT.walk).stride * u),
      walkK: ease(seg(t, t0, t0 + ramp)) * (1 - ease(seg(t, t1 - ramp, t1))), walkDir: x1 < x0 ? -1 : 1, run };
  }

  const ARMS = {
    neutral: t => { const b = _b(t); return { aL: -1.1 + .04 * b.s1, aR: -1.15 - .04 * b.s1, bendL: -.35, bendR: -.32 }; },
    happy: t => { const b = _b(t); return { aL: -.95 + .12 * b.s1, aR: -1.0 - .12 * b.s1, bendL: -.3 + .15 * b.s1, bendR: -.3 - .15 * b.s1 }; },
    excited: t => { const b = _b(t), w = Math.sin(b.bp * TAU); return { aL: 1.05 + .3 * w, aR: 1.05 - .3 * w, bendL: .35, bendR: .35, gripL: 'fist', gripR: 'fist' }; },
    laugh: t => { const c = Math.sin(t * TAU * 5); return { aL: -1.95 + .05 * c, bendL: -.85, aR: .35 + .22 * c, bendR: .4, gripR: 'open' }; },
    love: t => { const s = Math.sin(_b(t).bp * Math.PI / 2); return { aL: -.75 + .12 * s, aR: -.85 - .12 * s, bendL: -.5, bendR: -.5 }; },
    shy: t => { const w = Math.sin(t * TAU * 1.5); return { aL: -1.9, aR: -1.95, bendL: -.4, bendR: -.4, wristL: .3 + .15 * w, wristR: .3 - .15 * w }; },
    proud: () => ({ handL: 'hip', handR: 'hip', aL: -1.6, aR: -1.6, bendL: -1, bendR: -1, gripL: 'fist', gripR: 'fist' }),
    smug: t => ({ handL: 'hip', aL: -1.6, bendL: -1, gripL: 'fist', aR: -1.05 + .05 * Math.sin(t * TAU), bendR: -.3 }),
    relieved: t => { const br = Math.sin(t * TAU * .35); return { aL: -1.3 + .05 * br, aR: -1.32 + .05 * br, bendL: -.2, bendR: -.2 }; },
    sad: () => ({ aL: -1.5, aR: -1.52, bendL: -.12, bendR: -.1, lenL: 1.08, lenR: 1.08 }),
    cry: t => { const w = Math.sin(t * TAU * 6); return { aL: .9 + .15 * w, aR: .9 - .15 * w, bendL: .3, bendR: .3 }; },
    angry: t => { const w = Math.sin(t * TAU * 18); return { aL: -1.2 + .04 * w, aR: -1.18 - .04 * w, bendL: .15, bendR: .15, gripL: 'fist', gripR: 'fist' }; },
    furious: t => { const w = Math.sin(t * TAU * 9); return { aL: .95 + .12 * w, aR: .95 - .12 * w, bendL: .5, bendR: .5, gripL: 'fist', gripR: 'fist' }; },
    scared: t => ({ aL: .5 + .05 * Math.sin(t * TAU * 17), aR: .45 + .05 * Math.sin(t * TAU * 19), bendL: -.9, bendR: -.9, gripL: 'wave', gripR: 'wave' }),
    surprised: () => ({ aL: .95, aR: .95, bendL: -.2, bendR: -.2, gripL: 'wave', gripR: 'wave' }),
    confused: t => ({ handR: 'head', aR: 1.3, bendR: .9, gripR: 'point', wristR: .25 * Math.sin(t * TAU * 3), aL: -1.1, bendL: -.3 }),
    thinking: () => ({ handR: 'chin', aR: -1.5, bendR: -1, gripR: 'fist', aL: -1.25, bendL: -.3 }),
    idea: t => ({ aR: 1.45 + .05 * _b(t).s2, bendR: .15, gripR: 'point', aL: -1.05, bendL: -.3 }),
    determined: t => { const b = _b(t), p1 = Math.sin(b.f * Math.PI), p2 = Math.abs(Math.cos(b.f * Math.PI)); return { aL: -.75 + .2 * p1, aR: -.75 + .2 * p2, bendL: .45, bendR: .45, gripL: 'fist', gripR: 'fist' }; },
    sleepy: () => ({ aL: -1.52, aR: -1.5, bendL: -.08, bendR: -.08, lenL: 1.06, lenR: 1.06 }),
    bored: t => ({ aL: -1.45 + .04 * Math.sin(t * 2), aR: -1.45 - .04 * Math.sin(t * 2), bendL: -.15, bendR: -.15 }),
    nervous: t => ({ aL: -1.85 + .08 * Math.sin(t * TAU * 5), aR: -1.85 + .08 * Math.sin(t * TAU * 5 + 1), bendL: -.5, bendR: -.5 }),
    suspicious: () => ({ handR: 'chin', aR: -1.5, bendR: -1, gripR: 'fist', handL: 'hip', aL: -1.6, bendL: -1, gripL: 'fist' }),
    disgusted: () => ({ aL: .25, aR: .15, bendL: -.3, bendR: -.3, gripL: 'wave', gripR: 'wave' }),
    dizzy: t => { const a = Math.sin(t * TAU * .8 * 1.3); return { aL: .2 + .5 * a, aR: .2 - .5 * a, bendL: .6, bendR: .6 }; },
    cool: () => ({ aR: -.15, bendR: .1, gripR: 'point', handL: 'hip', aL: -1.6, bendL: -1, gripL: 'fist' }),
    starstruck: t => { const w = Math.sin(_b(t).bp * TAU * 2); return { aL: 1.0 + .2 * w, aR: 1.0 + .2 * w, bendL: .8, bendR: .8 }; },
    ko: () => ({ aL: -.35, aR: -.25, bendL: .9, bendR: .85 }),
    playful: t => { const b = _b(t), side = beatN(t) % 2 ? 1 : -1, k = lerp(-side, side, easeOut(clamp(b.f * 3))); return { aL: -.1 + .2 * k, aR: -.1 - .2 * k, bendL: .2, bendR: .2, gripL: 'point', gripR: 'point' }; },
    mischief: t => { const r = Math.sin(t * TAU * 4); return { aL: -1.85 + .06 * r, aR: -1.85 - .06 * r, bendL: -.6, bendR: -.6, gripL: 'fist', gripR: 'fist' }; },
    hopeful: () => ({ handL: 'chest', handR: 'chest', aL: -1.5, aR: -1.5, bendL: -.8, bendR: -.8 }),
  };
  const ARM_KEYS = ['aL', 'aR', 'bendL', 'bendR', 'lenL', 'lenR', 'wristL', 'wristR', 'gripL', 'gripR', 'handL', 'handR', 'handMixL', 'handMixR', 'holdL', 'holdR'];
  const ARM_REST = { aL: -1.1, aR: -1.15, bendL: -.35, bendR: -.32, lenL: 1, lenR: 1, wristL: 0, wristR: 0 };
  const armsFor = (name, t, over = {}) => {
    const a = { gripL: 'open', gripR: 'open', ...(ARMS[name] || ARMS.neutral)(t) };
    for (const k of ARM_KEYS) if (over[k] !== undefined) a[k] = over[k];
    return a;
  };
  const feel = (name, t, over = {}) => ({ ...boltFeel(name, t, over), ...armsFor(name, t, over) });
  function emotions(t, keys, o = {}) {
    const cur = boltEmotions(t, keys, o);
    let i = 0; while (i + 1 < keys.length && t >= keys[i + 1][0]) i++;
    const age = t - keys[i][0], arms = armsFor(keys[i][1], t, keys[i][2]);
    if (i > 0 && age < .5) {
      const prev = armsFor(keys[i - 1][1], t, keys[i - 1][2]), k = backOut(seg(age, 0, .4));
      for (const f in ARM_REST) arms[f] = lerp(prev[f] ?? ARM_REST[f], arms[f] ?? ARM_REST[f], k);
      if (age < .07) { arms.gripL = prev.gripL; arms.gripR = prev.gripR; }
      for (const S of ['L', 'R']) {
        const h = 'hand' + S, m = 'handMix' + S, from = prev[h], to = arms[h], half = seg(age, 0, .18), rest = seg(age, .18, .4);
        if (from === to) continue;
        if (from && to) { arms[h] = half < 1 ? from : to; arms[m] = half < 1 ? 1 - ease(half) : ease(rest); }
        else if (to) arms[m] = ease(seg(age, 0, .35));
        else { arms[h] = from; arms[m] = 1 - ease(seg(age, 0, .35)); }
      }
    }
    return { ...cur, ...arms };
  }

  function cool(t) {
    const sh = typeof WORLD !== 'undefined' ? WORLD.shelf : { x1: 4760, y0: 560 }, nod = pulse(t, 7), tap = Math.sin(Math.PI * frac(bpOf(t) / 2));
    return { ...feel('cool', t), rot: 0, dy: -.22 * nod, sq: .04 * nod - .01, lean: -.12, dx: .8, legSpread: -.75, heelR: -.5 * tap * tap,
      handL: [sh.x1 - 58, sh.y0 - 9], handMixL: 1, gripL: 'open', lenL: .45, bendL: -1, wristL: .5,
      handR: 'hip', gripR: 'fist', aR: -1.6, bendR: -.55, lenR: .62 };
  }

  const FEATURES = ['legLen', 'lenL', 'lenR', 'noFace', 'noSpark', 'viaL', 'viaR', 'reachL', 'reachR', 'sagL', 'sagR',
    'shoulderL', 'shoulderR', 'armPathL', 'armPathR', 'rim', 'cool', 'litFist'];
  window.RIG = { qwik, points, stroll, feel, emotions, armsFor, cool, features: FEATURES, K, GRIPS, GAIT, stride: (u, run) => (run ? GAIT.run : GAIT.walk).stride * u };
  window.qwik = qwik;

  const floor = (y, x0, x1) => {
    boilSeed('floor ' + y + ' ' + x0);
    const n = Math.max(1, Math.round((x1 - x0) / 500));
    for (let i = 0; i < n; i++) {
      const a = lerp(x0, x1, i / n), b = lerp(x0, x1, (i + 1) / n);
      inkLine([[a, y + 3 + hash(i) * 2], [(a + b) / 2, y + 1 + hash(i + 9) * 2], [b + 4, y + 3 + hash(i + 1) * 2]], .6, mixCol(PAL.paper, PAL.ink, .35), 'inkfine', .5);
    }
  };
  const label = (txt, x, y) => letter(txt, x, y, 20, PAL.ink, { ink: false, alpha: .75 });
  const box = (cx, cy, s, col = '#FFD34E', h = s, sw = .7) => {
    paint(rrPts(cx - s / 2, cy - h / 2, s, h, Math.min(s, h) * .12), { wash: col, ink: INK, sw });
    inkLine([[cx - s * .5, cy - h * .12], [cx + s * .5, cy - h * .12]], sw * .6, INK, 'inkfine', 0);
  };

  const POSES = [
    ['idle', (cx, gy, u, t) => {
      const lagL = Math.cos((2 * t - .2) * TAU), lagR = Math.cos((2 * t - .28) * TAU);
      qwik(cx, gy, u, { ...boltFeel('happy', t), aL: -1.02 + .07 * Math.sin((t - .1) * TAU) - .06 * lagL, aR: -1.08 + .06 * Math.sin((t + .35) * TAU) - .06 * lagR,
        bendL: -.38 + .12 * lagL, bendR: -.32 + .12 * lagR });
    }],
    ['walk', (cx, gy, u, t) => {
      qwik(cx, gy, u, { ...boltFeel('happy', t), dy: 0, lookX: .7, walk: t, aL: -.95, aR: -.95 });
    }],
    ['wave', (cx, gy, u, t) => {
      const w = Math.sin(t * TAU * 2), hop = Math.abs(Math.sin(t * TAU));
      qwik(cx, gy, u, { ...boltFeel('happy', t), aR: 1.12 + .24 * w, bendR: -.32 * Math.cos(t * TAU * 2 - .6), wristR: .35 * Math.sin(t * TAU * 2 - 1.1), gripR: 'wave',
        aL: -1.15 + .06 * w, bendL: -.4, lean: -.05 + .025 * w, heelL: .35 + .45 * hop });
    }],
    ['point', (cx, gy, u, t) => {
      const x = cx - 11 * u, tx = cx + 16 * u, ty = gy - 16.5 * u + .7 * u * Math.sin(t * TAU);
      paint(starPts(tx, ty, 1.8 * u, .45, 5, -Math.PI / 2 + .2 * Math.sin(t * TAU)), { wash: '#FFD34E', ink: INK, sw: u / 14 });
      const jab = backOut(seg(frac(t), 0, .2)) * (1 - ease(seg(frac(t), .6, 1)));
      const pose = { ...boltFeel('happy', t), eyes: 'normal', mouth: 'open', seed: 1.3, lookX: 1, lookY: -.3, aR: .22 + .04 * jab, lenR: 1 + .1 * jab, bendR: .06, gripR: 'point', lean: .06 + .03 * jab };
      qwik(x, gy, u, { ...pose, handL: 'hip', gripL: 'fist', aL: -1.6, bendL: -1 });
    }],
    ['reach', (cx, gy, u, t) => {
      const x = cx - 16 * u, bx = cx + 22.5 * u, by = gy - 13.5 * u + .45 * u * Math.sin(t * TAU * 2), tug = Math.sin(t * TAU);
      qwik(x, gy, u, { ...boltFeel('determined', t), lookX: 1, handR: [bx, by], gripR: 'grab', holdR: (uu, sw) => box(.5 * uu, 0, uu * 3.3, '#FFD34E', uu * 3.3, sw),
        aL: .6 + .15 * tug, bendL: -.5, gripL: 'open', lean: -.14 - .04 * tug, legSpread: 1.3 });
    }],
    ['carry', (cx, gy, u, t) => {
      const hop = jump(t % 1, .12, .7, 4.2), pose = { ...boltFeel('excited', t), seed: .8, dy: hop.dy, sq: hop.sq, gripL: 'grab', gripR: 'grab' };
      const P = points(cx, gy, u, pose), bw = 7 * u, bh = 4.8 * u, lag = 1.2 * u * (hop.sq || 0);
      const bx = P.face[0] + .6 * u, by = P.top[1] - 1.1 * u - bh / 2 + lag;
      box(bx, by, bw, '#AC7EF4', bh, u / 15);
      qwik(cx, gy, u, { ...pose, handL: [bx - bw / 2 + .5 * u, by + bh * .12], handR: [bx + bw / 2 - .5 * u, by + bh * .18] });
    }],
  ];
  const CELL = i => [W / 3 * (i % 3) + W / 6, [470, 1010][Math.floor(i / 3)]];

  LOOPS.rigA = t => {
    [470, 1010].forEach(r => floor(r, 30, W - 30));
    POSES.forEach(([name, pose], i) => { const [cx, gy] = CELL(i); pose(cx, gy, 11, t); label(name, cx, gy + 40); });
  };
  LOOPS.rigA.len = 2;

  LOOPS.rigAMoves = t => {
    [520, 1010].forEach(r => floor(r, 60, W - 60));
    const u = 13, { x, ...gait } = t < 2 ? stroll(t, .15, 1.85, 330, 1590, u) : stroll(t, 2.15, 3.85, 1590, 330, u);
    qwik(x, 520, u, { ...feel('happy', t), ...gait, dy: 0, lookX: gait.walkDir * .6 });
    qwik(560, 1010, u, { ...feel('determined', t), run: true, walk: t * 1.5, aL: -.8, aR: -.8, lookX: 1 });
    const hop = jump(t % 1, .2, .75, 5);
    qwik(1360, 1010, u, { ...feel('excited', t), dy: hop.dy, sq: hop.sq });
  };
  LOOPS.rigAMoves.len = 4;

  LOOPS.rigAEmotions = t => {
    const names = Object.keys(ARMS), cols = 8, cw = W / cols, ch = H / 4, u = 7.2;
    names.forEach((name, i) => {
      const cx = cw * (i % cols) + cw / 2 + 8, gy = ch * Math.floor(i / cols) + ch - 50;
      qwik(cx, gy, u, feel(name, t, { seed: i }));
      label(name, cx - 8, gy + 30);
    });
    for (let r = 0; r < 4; r++) floor(ch * r + ch - 50, 30, W - 30);
  };
  LOOPS.rigAEmotions.len = 4;

  LOOPS.rigAActing = t => {
    floor(900, 400, W - 400);
    qwik(960, 900, 20, emotions(t, [[0, 'neutral'], [.6, 'thinking'], [1.4, 'idea'], [2.2, 'proud'], [3.0, 'surprised']]));
  };
  LOOPS.rigAActing.len = 3.6;

  LOOPS.rigALab = t => {
    const grips = Object.keys(GRIPS), sw = 1.6;
    grips.forEach((g, i) => {
      const cx = 170 + i * 300, cy = 330;
      push(); translate(cx, cy); rotate(-.35); drawGlove(g, 70 * K.glove, sw, g === 'grab' || g === 'fist' ? (uu, s) => box(0, 0, 70 * 1.2) : null, 70); pop();
      label(g, cx, cy + 190);
    });
    for (let i = 0; i < 3; i++) {
      push(); translate(360 + i * 520, 900); if (i === 1) scale(-1, 1); if (i === 2) { translate(-1.3 * 60, 0); rotate(-.3); translate(1.3 * 60, 0); }
      drawShoe(60, 1.6, false); pop();
    }
  };
  LOOPS.rigALab.len = 2;

  LOOPS.rigAHero = t => {
    floor(960, 200, W - 200);
    const bp = t / BEAT, hit = pulse(t, 5), odd = Math.floor(bp) % 2;
    const jab = backOut(seg(frac(bp / 2), 0, .18)) * (1 - ease(seg(frac(bp / 2), .45, .95)));
    const wave = Math.sin((t - .05) * TAU), drag = Math.cos((t - .05) * TAU);
    qwik(960, 960, 26, { ...boltFeel('happy', t), eyes: 'wink', mouth: 'grin', seed: 1.3,
      dy: -.55 * Math.abs(Math.sin(bp * Math.PI)), sq: .07 * hit - .03, lean: .05 + .03 * Math.sin(bp * Math.PI / 2),
      aR: .22 + .16 * jab, lenR: 1 + .12 * jab, bendR: -.5 + .25 * jab, gripR: 'thumb',
      aL: -.18 + .22 * wave, bendL: .35 - .45 * drag, gripL: 'wave', wristL: .25 * drag,
      heelL: odd ? .9 * hit : .15, heelR: odd ? 0 : .45 * hit });
  };
  LOOPS.rigAHero.len = 2;

  const boing = k => k < .3 ? 1.28 * easeOut(k / .3) : 1 + .28 * Math.exp(-7 * (k - .3)) * Math.cos(15 * (k - .3));
  const unroll = k => k < .35 ? 2 * easeOut(k / .35) : 1 + Math.exp(-6 * (k - .35)) * Math.cos(11 * (k - .35));
  const title = txt => letter(txt, 34, 52, 34, PAL.cream, { align: 'left', stroke: PAL.ink, screen: true });
  const tag = (txt, x, y) => letter(txt, x, y, 22, PAL.cream, { stroke: PAL.ink });
  const E5_VIA = () => [[4808, 470], [4760, 250], [4560, 182], [4415, 172], [1610, 158]];
  function stretchScene(t, reach, yank = 0) {
    const Wd = WORLD, cart = [Wd.queueX.cart, Wd.roadY], lift = Math.sin(Math.PI * yank) * 70, tgt = [cart[0] + 60 * yank, cart[1] - 29 - lift];
    if (typeof jsBox === 'function') {
      jsBox(Wd.queueX.gear, Wd.roadY, 1, 'gear', { key: 'rf gear' });
      jsBox(tgt[0], tgt[1] + 29, 1, 'cart', { key: 'rf cart', noShadow: yank > 0 });
    }
    qwik(...Wd.boltDesk, 20, { ...feel('determined', t), legSpread: 1.35, lean: .16, aR: -.4, bendR: .5, gripR: 'fist',
      viaL: E5_VIA(), handL: tgt, reachL: reach, gripL: 'grab', boilKey: 'bolt' });
  }
  const dart = (E, dir) => ({ legLen: 0, lenL: 0, lenR: 0, rot: Math.atan2(dir[1], dir[0]) + Math.PI / 2 + .089, sx: .35, sy: 1.8, noShadow: true,
    x: E[0] - 3.72 * 20, y: E[1] + 1.4 * 20 });

  const PAGES = [
    ['legLen · lenL/lenR to 0 · noFace + noSpark', t => {
      [330, 650, 1010].forEach(r => floor(r, 30, W - 30));
      const kb = Math.max(0, frac(t / 2) * 2 - .4);
      [0, .15, .35, .6, 1, 1.25].forEach((L, i) => {
        qwik(170 + i * 235, 330, 10, { ...feel('happy', t), legLen: L, boilKey: 'leg' + i });
        label('legLen ' + L, 170 + i * 235, 370);
      });
      qwik(1700, 330, 10, { ...feel('excited', t), legLen: boing(kb), boilKey: 'boing' });
      label('boing 0 → 1.25 → 1', 1700, 370);
      [0, .1, .2, .3, 1, 2].forEach((len, i) => {
        qwik(170 + i * 235, 650, 10, { ...feel('happy', t), lenL: len, lenR: len, aL: .1, aR: .1, bendL: .2, bendR: .2, boilKey: 'arm' + i });
        label('lenL/R ' + len, 170 + i * 235, 690);
      });
      const ln = unroll(kb);
      qwik(1700, 650, 10, { ...feel('excited', t), lenL: ln, lenR: ln, aL: -.05, aR: .05, bendL: .3, bendR: .3, legLen: boing(kb), boilKey: 'unroll' });
      label('unroll 0 → 2 → 1', 1700, 690);
      const ly = 1010, U = 14, face = feel('happy', t);
      bolt(330, ly, U, { ...face, boilKey: 'cmpA' });
      label('bolt()', 330, ly + 40);
      qwik(710, ly, U, { ...face, legLen: 0, lenL: 0, lenR: 0, boilKey: 'cmpA' });
      label('qwik legLen 0 (same pixels)', 710, ly + 40);
      qwik(1090, ly, U, { ...face, legLen: 0, lenL: 0, lenR: 0, noFace: true, noSpark: true, boilKey: 'cmpB' });
      label('noFace noSpark', 1090, ly + 40);
      qwik(1470, ly, U * .8, { ...feel('proud', t), noFace: true, noSpark: true, boilKey: 'cmpC' });
      label('noFace on legs', 1470, ly + 40);
    }],
    ['viaL + reachL at zoom .5 (poster)', t => {
      camBegin(...CAMS.poster);
      landSet(t); towerSet(t); houseSet(t);
      stretchScene(t, ease(seg(t, .1, 1.3)));
      camEnd();
    }],
    ['viaL at zoom 1.3: grab, yank, snap back', t => {
      camBegin(...CAMS.dockClose);
      landSet(t); towerSet(t); houseSet(t);
      stretchScene(t, 1 - easeIn(seg(t, 1.45, 1.95)), seg(t, .5, 1.3));
      camEnd();
    }],
    ['viaL shoot-out (handMixL) and recoil', t => {
      camBegin(...CAMS.deskMaster);
      houseSet(t, { cubbyLit: { menu: 1, heart: 1 } });
      const shoot = seg(t, .5, .95), back = seg(t, 1.25, 1.55), recoil = seg(t, 1.55, 2);
      const mix = t < 1.55 ? ease(seg(t, .5, .62)) : 1 - backOut(recoil), reach = .22 * easeOut(shoot) * (1 - easeIn(back));
      const wind = ease(seg(t, .05, .45)) * (1 - ease(seg(t, .5, .6)));
      qwik(...WORLD.boltDesk, 20, { ...feel('determined', t), lean: .1 - .08 * wind + .06 * shoot * (1 - back), sq: .08 * wind,
        aL: lerp(-1.1, 2.5, wind), bendL: lerp(-.35, .8, wind), lenL: 1 + .25 * spring(t, 1.55, 6, 22), gripL: 'grab',
        viaL: E5_VIA(), handL: [WORLD.queueX.cart, WORLD.roadY - 29], reachL: reach, handMixL: mix, sagL: 1 - shoot * (1 - back),
        aR: -1.3, bendR: -.3, boilKey: 'bolt' });
      camEnd();
    }],
    ['rim 0 / rim 1 on the indigo wall', t => {
      camBegin(...CAMS.serverMaster);
      towerSet(t);
      [[270, 0], [600, 1]].forEach(([bx, rim], i) => {
        qwik(bx, WORLD.shop.floor, 20, { ...feel('determined', t), aL: -1.2, aR: -1.25, bendL: -.5, bendR: -.5, legSpread: 1.3, rim, boilKey: 'rim' + i });
        tag('rim ' + rim, bx, WORLD.shop.floor + 26);
      });
      camEnd();
    }],
    ['RIG.cool(t) at the shelf', t => {
      camBegin(...CAMS.deskMaster);
      houseSet(t, { cubbyLit: { menu: 1, heart: 1 } });
      qwik(...WORLD.boltDesk, 20, { ...cool(t), boilKey: 'bolt' });
      camEnd();
    }],
    ['held spark: holdR clickSpark held in a fist', t => {
      camBegin(4930, 680, 1.7);
      houseSet(t, { cubbyLit: { menu: 1, heart: 1 } });
      const held = uu => { if (typeof clickSpark === 'function') clickSpark(.15 * uu, 0, 1.05, { state: 'held', r0: 22, key: 'held' }); };
      qwik(...WORLD.boltDesk, 20, { ...feel('determined', t), lookX: .8, lookY: -.2, aR: .5 + .04 * Math.sin(t * TAU), lenR: .6, bendR: .55, gripR: 'fist', holdR: held,
        aL: -1.2, bendL: -.4, shades: { dy: -3.4, rot: -.22 }, boilKey: 'bolt' });
      camEnd();
    }],
    ['squeeze: funnel dive, nozzle toothpaste', t => {
      if (t < 1) {
        const gulp = Math.sin(Math.PI * seg(t, .45, 1)), B = [lerp(1060, 1295, ease(seg(t, .05, .95))), 600], { x, y, ...o } = dart([B[0] - 588, 600], [1, 0]);
        camBegin(1010, 560, 1.15);
        towerSet(t, { funnelGulp: gulp });
        qwik(x, y, 20, { ...feel('determined', t), ...o, boilKey: 'bolt' });
        SETS.funnelFront(t, { funnelGulp: gulp });
        camEnd();
        return;
      }
      const bulge = 1 - seg(t, 1.45, 1.6), dir = [Math.SQRT1_2, Math.SQRT1_2], k = ease(seg(t, 1, 1.45)), back = seg(t, 1.45, 1.75), land = seg(t, 1.75, 2);
      const { x, y, ...o } = dart([5075 + (300 * k - 70) * dir[0], 345 + (300 * k - 70) * dir[1]], dir), sp = backOut(back);
      camBegin(5160, 560, 1.05);
      houseSet(t, { nozzleBulge: bulge });
      qwik(lerp(x, 5240, ease(back)), lerp(y, 900, ease(back)), 20, { ...feel('excited', t), ...o, rot: lerp(o.rot, 0, ease(back)), sx: lerp(.35, 1, sp), sy: lerp(1.8, 1, sp),
        legLen: boing(land), lenL: unroll(land) * ease(back), lenR: unroll(land) * ease(back), aL: .4, aR: .4, noShadow: back < .9, boilKey: 'bolt' });
      SETS.nozzleFront(t, { nozzleBulge: bulge });
      camEnd();
    }],
  ];
  LOOPS.rigFeatures = t => {
    const i = Math.min(PAGES.length - 1, Math.floor(t / 2));
    PAGES[i][1](t - 2 * i);
    title(PAGES[i][0]);
  };
  LOOPS.rigFeatures.len = 2 * PAGES.length;
})();
