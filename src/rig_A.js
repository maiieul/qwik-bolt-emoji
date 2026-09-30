(() => {
  const INK = PAL.ink, GLOVE = QWIK.white, GLOVE_SH = '#E4DCEE', SOLE = '#FFF1D4';
  const SHOE = QWIK.blue, SHOE_DK = QWIK.blueDk, SHOE_LT = QWIK.blueLt;

  const SHOULDER = { L: [-7.45, -7.85], R: [.15, -7.8] };
  const HIP = { L: [-2.25, -3.05], R: [-.6, -2.2] };
  const PELVIS = [(HIP.L[0] + HIP.R[0]) / 2, (HIP.L[1] + HIP.R[1]) / 2];
  const WAIST = { L: [-3.9, -3.3], R: [.1, -3.3] };
  const TOP = BOLT[1];
  const K = {
    hipH: 8.9, pelvisX: 1.0, footX: 2.35, ankleH: 1.35,
    armLen: 8.6, armW: .6, legW: .68, legSlack: 1.09, legReach: 1.2,
    glove: 1.45, shoe: 1, toeX: 2.75, heelX: -1.25,
  };

  const add = (a, b) => [a[0] + b[0], a[1] + b[1]], sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const mul = (a, k) => [a[0] * k, a[1] * k], norm = a => Math.hypot(a[0], a[1]);
  const unit = a => { const l = norm(a) || 1e-9; return [a[0] / l, a[1] / l]; };
  const rot2 = (p, a) => { const c = Math.cos(a), s = Math.sin(a); return [p[0] * c - p[1] * s, p[0] * s + p[1] * c]; };

  function hoseArc(S, E, L, side, n = 16) {
    const d = sub(E, S), c = norm(d) || 1e-6, ux = d[0] / c, uy = d[1] / c;
    const len = Math.max(L, c * 1.004), q = c / len, cap = Math.PI * .9;
    let h, R;
    if (Math.sin(cap) / cap > q) { h = cap; R = c / (2 * Math.sin(cap)); }
    else {
      let lo = 1e-4, hi = cap;
      for (let i = 0; i < 28; i++) { const m = (lo + hi) / 2; if (Math.sin(m) / m > q) lo = m; else hi = m; }
      h = (lo + hi) / 2; R = len / (2 * h);
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

  function drawGlove(grip, g, sw, hook, u) {
    const G = GRIPS[grip] || GRIPS.open, sc = pts => pts.map(p => [p[0] * g, p[1] * g]);
    const shake = list => list.map(c => { const o = [jit(.03), jit(.03)]; return { ...c, a: add(c.a, o), b: add(c.b, o) }; });
    paint(sc(silhouette(shake(G.back))), { wash: GLOVE, ink: INK, sw: sw * .75, curv: .3 });
    if (G.stitch) for (const y of [-.28, 0, .28]) inkLine(sc([[-.62, y * 1.05], [-.2, y * 1.15], [.08, y * 1.25]]), sw * .38, INK, 'inkfine', .5);
    for (const l of G.lines || []) inkLine(sc(l), sw * .45, INK, 'inkfine', .5);
    const cuff = sc(cuffPts(G.wrist));
    paint(cuff, { wash: GLOVE, ink: INK, sw: sw * .7, curv: .45 });
    inkLine(sc([[G.wrist - .44, -.7], [G.wrist - .5, 0], [G.wrist - .44, .7]]), sw * .4, INK, 'inkfine', .6);
    if (hook) { push(); hook(u, sw); pop(); }
    for (const layer of [G.front, G.front2]) if (layer) paint(sc(silhouette(shake(layer))), { wash: GLOVE, ink: INK, sw: sw * .7, curv: .3 });
    for (const l of G.frontLines || []) inkLine(sc(l), sw * .42, INK, 'inkfine', .5);
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
    walk: { stride: 10, duty: .56, lift: 3.1, bob: .6, lean: .06, rock: .025, arm: .36, spread: .8 },
    run: { stride: 14, duty: .42, lift: 3.4, bob: 1.0, lean: .2, rock: .03, arm: .8, spread: .3 },
  };
  const sagSide = a => clamp(Math.SQRT2 * Math.sin(a + Math.PI / 4), -1, 1);

  function limbRibbon(pts, w, sw) {
    paint(ribbon(pts, w, w), { wash: INK, ink: INK, sw: sw * .5 });
    if (w < 9) return;
    const n = pts.length, hi = [];
    for (let i = 1; i < n - 1; i++) {
      const d = unit(sub(pts[Math.min(n - 1, i + 1)], pts[i - 1])), nrm = [-d[1], d[0]], side = nrm[0] + nrm[1] < 0 ? 1 : -1;
      hi.push(add(pts[i], mul(nrm, side * w * .22)));
    }
    inkLine(hi.filter((_, i) => i > 1 && i < hi.length - 2), w * .07, '#5A5068', 'inkfine', .5);
  }

  function legRestLen(s) {
    const pelvis = [K.pelvisX, -K.hipH], hip = add(pelvis, sub(HIP[s], PELVIS));
    const ankle = [(s === 'L' ? -1 : 1) * K.footX, -K.ankleH];
    return norm(sub(ankle, hip)) * K.legSlack;
  }
  const LEG_LEN = { L: legRestLen('L'), R: legRestLen('R') };

  function legExtension(rise) {
    if (rise <= K.legReach) return rise;
    return Math.max(-1.3, K.legReach * (1 - (rise - K.legReach) / 2.2));
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

    const walking = o.walk != null, wk = walking ? clamp(o.walkK ?? 1) : 0, run = !!o.run, wd = (o.walkDir ?? fx) * fx < 0 ? -1 : 1;
    const G = run ? GAIT.run : GAIT.walk, phase = walking ? o.walk : 0;
    const bobWalk = walking ? wk * G.bob * (.5 - .5 * Math.cos((phase * 2 - .15) * TAU)) : 0;

    const sqB = (o.sq || 0) + (o.take || 0);
    const rise = -(o.dy || 0) - sqB * K.hipH * .45 + bobWalk;
    const ext = legExtension(rise), airborne = Math.max(0, rise - ext);
    const theta = (o.rot || 0) + (o.lean || 0) + wd * wk * (G.lean + G.rock * Math.cos((phase * 2 - .15) * TAU));
    const kx = (o.sx ?? 1) * (1 + sqB * .6), ky = (o.sy ?? 1) * (1 - sqB), turn = o.turnX ?? 1;
    const pelvis = [(K.pelvisX + (o.dx || 0)) * u, -(K.hipH + rise) * u];
    const cT = Math.cos(theta), sT = Math.sin(theta);
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
        const p = frac(phase + (s === 'L' ? 0 : .5)), A = G.stride * u * G.duty / 2;
        let wx, wy = 0;
        if (p < G.duty) {
          const k = p / G.duty;
          wx = A * (1 - 2 * k);
          tilt = -.32 * (1 - ease(k / .18)) + .5 * ease(seg(k, .68, 1));
        } else {
          const q = (p - G.duty) / (1 - G.duty);
          wx = -A + 2 * A * ease(q);
          wy = -G.lift * u * Math.sin(Math.PI * Math.pow(q, .68));
          tilt = lerp(.5, -.32, ease(q));
        }
        foot = [lerp(idle[0], wd * wx + out * G.spread * u, wk), wy * wk];
        tilt *= wk;
      }
      tilt += .55 * (pick('heel', s) || 0);
      feet[s] = { foot: [foot[0], foot[1] - (airborne + (pick('lift', s) || 0)) * u], tilt, dir: walking ? lerp(out, wd, wk) : out, far: wk > .5 && out === -wd };
    }

    const arm = s => {
      const out = s === 'L' ? -1 : 1, root = body(SHOULDER[s]);
      const L = K.armLen * u * (pick('len', s) ?? 1), grip = pick('grip', s) || 'open', GR = GRIPS[grip] || GRIPS.open;
      const reach = (Math.abs(GR.wrist) + .35) * K.glove * u, target = pick('hand', s);
      const turnHand = tan => {
        let ang = Math.atan2(tan[1], tan[0]);
        if (grip === 'thumb') { const up = out > 0 ? 0 : Math.PI; ang += .8 * Math.atan2(Math.sin(up - ang), Math.cos(up - ang)); }
        return ang + out * (pick('wrist', s) || 0);
      };
      let a = pick('a', s) ?? -1.2, bend = pick('bend', s), res, hand, ang;
      if (target) {
        const T = toRig(target), d = sub(T, root);
        a = Math.atan2(-d[1], out * d[0]);
        const side = (Math.sign(bend ?? sagSide(a)) || 1) * out;
        ang = turnHand(hoseArc(root, T, L + reach, side).tan);
        res = hoseArc(root, sub(T, [Math.cos(ang) * reach, Math.sin(ang) * reach]), L, side);
        hand = T;
      } else {
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
      }
      const front = pick('front', s) ?? boltDist(toLocal(hand)) < 1.8;
      return { s, out, root, res, hand, grip, hook: pick('hold', s), front, ang };
    };

    const legs = ['L', 'R'].map(s => {
      const out = s === 'L' ? -1 : 1, F = feet[s], hip = body(HIP[s]);
      F.xf = shoeXf(F.tilt, Math.max(.25, Math.abs(F.dir)));
      const ak = F.xf([0, -K.ankleH]), ankle = add(F.foot, [(F.dir < 0 ? -1 : 1) * ak[0] * u, ak[1] * u]);
      const c = norm(sub(ankle, hip)), bowDir = walking ? lerp(out, wd, wk) : out;
      const res = hoseArc(hip, ankle, lerp(c, LEG_LEN[s] * u, Math.min(1, Math.abs(bowDir))), -(Math.sign(bowDir) || 1));
      return { s, F, res };
    });

    const arms = o.noLimbs ? [] : [arm('L'), arm('R')];
    const anchor = sub(pelvis, [(PELVIS[0] * kx * u) * cT - (PELVIS[1] * ky * u) * sT, (PELVIS[0] * kx * u) * sT + (PELVIS[1] * ky * u) * cT]);
    const handOf = s => { const A = arms.find(A => A.s === s); return toWorld(A ? A.hand : body(SHOULDER[s])); };
    const [sl, sr] = flip ? ['R', 'L'] : ['L', 'R'];
    const pts = {
      handL: handOf(sl), handR: handOf(sr), face: toWorld(body([FACE.x, FACE.y])), top: toWorld(body(TOP)),
      feet: [toWorld(feet[sl].foot), toWorld(feet[sr].foot)], waist: [toWorld(body(WAIST[sl])), toWorld(body(WAIST[sr]))],
    };
    return { fx, sqB, theta, airborne, arms, legs, anchor: toWorld(anchor), pts };
  }

  function drawArm(A, u, sw, rs) {
    rs('arm' + A.s);
    limbRibbon(A.res.pts, K.armW * u * clamp(Math.sqrt(1 / Math.max(1, A.res.stretch)), .5, 1), sw);
    rs('glove' + A.s);
    push(); translate(A.hand[0], A.hand[1]); rotate(A.ang); scale(1, A.out);
    drawGlove(A.grip, K.glove * u, sw, A.hook, u);
    pop();
  }

  function drawLeg(Lg, u, sw, rs) {
    rs('leg' + Lg.s);
    limbRibbon(Lg.res.pts, K.legW * u * clamp(Math.sqrt(1 / Math.max(1, Lg.res.stretch)), .6, 1), sw);
    rs('shoe' + Lg.s);
    const F = Lg.F, pivot = F.tilt > 0 ? K.toeX : K.heelX, sx = Math.max(.25, Math.abs(F.dir));
    push(); translate(F.foot[0], F.foot[1]); scale(F.dir < 0 ? -1 : 1, 1);
    translate(0, F.xf.fix * u); translate(pivot * u, 0); rotate(F.tilt); translate(-pivot * u, 0); scale(sx, 1);
    drawShoe(u, sw, F.far);
    pop();
  }

  function qwik(x, y, u, o = {}) {
    const id = o.boilKey ?? ++CLAWD_N, rs = part => boilSeed(`rigA ${id} ${part}`);
    const sw = clamp(u / 15, .45, 2.4) * (o.swMul || 1), S = solve(x, y, u, o);

    rs('shadow');
    if (!o.noShadow) {
      const f = 1 - Math.min(.55, S.airborne * .07);
      paint(ellPts(x + S.fx * .3 * u, y + u * .12, u * 6.4 * f, u * .95 * f, 22), { fill: INK, fillOp: 70, bleed: .25, tex: .3, border: .1, ink: null });
    }
    push(); translate(x, y); scale(S.fx, 1);
    for (const A of S.arms) if (!A.front) drawArm(A, u, sw, rs);
    if (!o.noLimbs) for (const Lg of S.legs.slice().sort((a, b) => (b.F.far ? 1 : 0) - (a.F.far ? 1 : 0))) drawLeg(Lg, u, sw, rs);
    pop();

    bolt(S.anchor[0] + BODY_CX * u, S.anchor[1], u, { ...o, dx: 0, dy: 0, hover: 0, sq: S.sqB, take: 0, rot: S.fx * S.theta, noShadow: true, boilKey: id });

    push(); translate(x, y); scale(S.fx, 1);
    for (const A of S.arms) if (A.front) drawArm(A, u, sw, rs);
    pop();
    rs('after');
    return S.pts;
  }

  const points = (x, y, u, o = {}) => solve(x, y, u, o).pts;

  function stroll(t, t0, t1, x0, x1, u, run = false) {
    const x = lerp(x0, x1, ease(seg(t, t0, t1))), ramp = Math.min(.22, (t1 - t0) / 3);
    return { x, walk: Math.abs(x - x0) / ((run ? GAIT.run : GAIT.walk).stride * u), walkK: ease(seg(t, t0, t0 + ramp)) * (1 - ease(seg(t, t1 - ramp, t1))), walkDir: x1 < x0 ? -1 : 1, run };
  }

  window.RIG_A = { qwik, points, stroll, K, GRIPS, GAIT, stride: (u, run) => (run ? GAIT.run : GAIT.walk).stride * u };

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
      const w = Math.sin(t * TAU * 2);
      qwik(cx, gy, u, { ...boltFeel('happy', t), aR: 1.15 + .28 * w, bendR: -.35 * Math.cos(t * TAU * 2 - .6), gripR: 'wave', aL: -1.2, bendL: -.4, lean: -.04 });
    }],
    ['point', (cx, gy, u, t) => {
      const x = cx - 11 * u, tx = cx + 16 * u, ty = gy - 16.5 * u + .7 * u * Math.sin(t * TAU);
      paint(starPts(tx, ty, 1.8 * u, .45, 5, -Math.PI / 2 + .2 * Math.sin(t * TAU)), { wash: '#FFD34E', ink: INK, sw: u / 14 });
      const jab = backOut(seg(frac(t), 0, .2)) * (1 - ease(seg(frac(t), .6, 1)));
      const pose = { ...boltFeel('happy', t), eyes: 'normal', mouth: 'open', lookX: 1, lookY: -.3, aR: .22 + .04 * jab, lenR: 1 + .1 * jab, bendR: .06, gripR: 'point', lean: .06 + .03 * jab };
      qwik(x, gy, u, { ...pose, handL: points(x, gy, u, pose).waist[0], gripL: 'fist', bendL: -1 });
    }],
    ['reach', (cx, gy, u, t) => {
      const x = cx - 16 * u, bx = cx + 22.5 * u, by = gy - 13.5 * u + .45 * u * Math.sin(t * TAU * 2), tug = Math.sin(t * TAU);
      qwik(x, gy, u, { ...boltFeel('determined', t), lookX: 1, handR: [bx, by], gripR: 'grab', holdR: (uu, sw) => box(.5 * uu, 0, uu * 3.3, '#FFD34E', uu * 3.3, sw),
        aL: .6 + .15 * tug, bendL: -.5, gripL: 'open', lean: -.14 - .04 * tug, legSpread: 1.3 });
    }],
    ['carry', (cx, gy, u, t) => {
      const hop = jump(t % 1, .12, .7, 4.2), pose = { ...boltFeel('excited', t), dy: hop.dy, sq: hop.sq, gripL: 'grab', gripR: 'grab' };
      const P = points(cx, gy, u, pose), bw = 7 * u, bh = 4.8 * u, lag = 1.2 * u * (hop.sq || 0);
      const bx = P.face[0] + .6 * u, by = P.top[1] - 1.1 * u - bh / 2 + lag;
      box(bx, by, bw, '#AC7EF4', bh, u / 15);
      qwik(cx, gy, u, { ...pose, handL: [bx - bw / 2 + .5 * u, by + bh * .12], handR: [bx + bw / 2 - .5 * u, by + bh * .18] });
    }],
  ];
  const CELL = (i, u = 11) => [W / 3 * (i % 3) + W / 6, [470, 1010][Math.floor(i / 3)]];

  LOOPS.rigA = t => {
    [470, 1010].forEach(r => floor(r, 30, W - 30));
    POSES.forEach(([name, pose], i) => { const [cx, gy] = CELL(i); pose(cx, gy, 11, t); label(name, cx, gy + 40); });
  };
  LOOPS.rigA.len = 2;

  POSES.forEach(([name, pose], i) => {
    LOOPS['rigAZ' + i] = t => {
      const [cx, gy] = CELL(i);
      camBegin(cx, gy - 150, 1.75);
      floor(gy, cx - 400, cx + 400);
      pose(cx, gy, 11, t);
      camEnd();
    };
    LOOPS['rigAZ' + i].len = 2;
  });

  LOOPS.rigATest = t => {
    const u = 11, rows = [470, 1010];
    rows.forEach(r => floor(r, 30, W - 30));
    const mark = p => paint(ellPts(p[0], p[1], 5, 5, 8), { wash: '#E2476E', ink: null });
    let P = qwik(260, 470, u, { ...boltFeel('happy', t), flip: true, walk: t, aL: -1.1, aR: -1.1 });
    P.feet.forEach(mark); mark(P.handL); mark(P.handR);
    P = qwik(700, 470, u, { ...boltFeel('love', t), handR: [700 - 1.5 * u, 470 - 10.5 * u], gripR: 'open', aL: -1.1 });
    mark(P.handR); mark(P.face); mark(P.top);
    P = qwik(1150, 470, u, { ...boltFeel('determined', t), run: true, walk: t * 1.5, aL: -.9, aR: -.9, lookX: 1 });
    P = qwik(1650, 470, u, { ...boltFeel('surprised', t), flip: true, handL: [1650 - 30 * u, 470 - 12 * u], gripL: 'grab', holdL: (uu, sw) => box(0, 0, uu * 3, '#FFD34E', uu * 3, sw), aR: .8, bendR: -.4 });
    mark(P.handL);
    qwik(250, 1010, u, { ...boltFeel('happy', t), aR: .2, lenR: 3.5, bendR: .5, gripR: 'wave', aL: -1.1 });
    qwik(900, 1010, u, { ...boltFeel('neutral', t), turnX: .45 + .4 * Math.sin(t * Math.PI), aL: -1, aR: -1 });
    qwik(1250, 1010, u, { ...boltFeel('sad', t), noLimbs: true });
    const hop = jump(t % 1, .15, .75, 4);
    qwik(1650, 1010, u, { ...boltFeel('excited', t), dy: hop.dy, sq: hop.sq, aL: .9, aR: 1.0, gripL: 'fist', gripR: 'fist' });
  };
  LOOPS.rigATest.len = 2;

  LOOPS.rigARun = t => {
    floor(900, 300, W - 300);
    qwik(760, 900, 20, { ...boltFeel('determined', t), run: true, walk: t * 1.5, aL: -.8, aR: -.8, lookX: 1 });
    const hop = jump(t % 1, .2, .75, 5);
    qwik(1350, 900, 20, { ...boltFeel('excited', t), dy: hop.dy, sq: hop.sq, aL: .5 + 1.5 * Math.max(0, -hop.dy) / 5, aR: .4 + 1.5 * Math.max(0, -hop.dy) / 5, gripL: 'open', gripR: 'open' });
  };
  LOOPS.rigARun.len = 2;

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
    qwik(960, 960, 26, { ...boltFeel('happy', t), eyes: 'wink', mouth: 'grin',
      dy: -.55 * Math.abs(Math.sin(bp * Math.PI)), sq: .07 * hit - .03, lean: .05 + .03 * Math.sin(bp * Math.PI / 2),
      aR: .22 + .16 * jab, lenR: 1 + .12 * jab, bendR: -.5 + .25 * jab, gripR: 'thumb',
      aL: -.18 + .22 * wave, bendL: .35 - .45 * drag, gripL: 'wave', wristL: .25 * drag,
      heelL: odd ? .9 * hit : .15, heelR: odd ? 0 : .45 * hit });
  };
  LOOPS.rigAHero.len = 2;
})();
