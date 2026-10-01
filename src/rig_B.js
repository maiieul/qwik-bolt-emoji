(() => {
  const COL = {
    white: '#FFFBF4', purple: '#AC7EF4', blue: '#18B6F6', purpleDk: '#7B55CF', purpleLt: '#E2D2FF', box: '#F7DF1E', boxDk: '#D9B310',
  };
  const TIP = [-7.475, -16.301], FACE_C = [-3.72, -8.1];
  const HIPS = [[-1.6, -2.35], [-.45, -1.3]];
  const FEET = [-4.9, -.5];
  const FEET_C = (FEET[0] + FEET[1]) / 2;
  const GROUND = 5.3, ANKLE = 1.15;
  const SHOULDERS = [[-7.7, -7.95], [.25, -7.95]];
  const ARM_LEN = 6.5, ARM_W = [1.72, 1.5], LEG_W = [2.05, 1.8], EDGE = .38, HAND = 1.22;
  const LEG_SLACK = 1.045, LEG_STRETCH = 1.3, REST_A = -1.25, HOVER = 1.4;
  const HP = [(HIPS[0][0] + HIPS[1][0]) / 2, (HIPS[0][1] + HIPS[1][1]) / 2];
  const LEG_REST = HIPS.map(([hx, hy], i) => Math.hypot(FEET[i] - hx, GROUND - ANKLE - hy) * LEG_SLACK);
  const GAIT = {
    walk: { step: 4.2, lift: 1.8, bob: .6, bobAt: .25, stance: .5, lean: .02, swing: .38, bend: .35, lane: .12, kick: .8, arm: -1.25, squash: .04 },
    run: { step: 6.6, lift: 3.0, bob: 1.1, bobAt: .43, stance: .36, lean: .12, swing: .42, bend: .6, lane: .06, kick: .55, arm: -1.05, squash: .06 },
  };
  const STRIDE = GAIT.walk.step / GAIT.walk.stance, RUN_STRIDE = GAIT.run.step / GAIT.run.stance;

  const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const mul = (a, k) => [a[0] * k, a[1] * k];
  const len = a => Math.hypot(a[0], a[1]);
  const norm = a => { const l = len(a) || 1; return [a[0] / l, a[1] / l]; };
  const perp = a => [-a[1], a[0]];
  const shift = (P, d) => P.map(p => [p[0] + d[0], p[1] + d[1]]);
  const shadeCol = (c, k) => k ? mixCol(c, '#5B4E86', k) : c;

  function inside(p, poly) {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i], b = poly[j];
      if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c;
    }
    return c;
  }

  function halfAngle(ratio) {
    if (ratio >= 1) return 0;
    let lo = 0, hi = Math.PI;
    for (let i = 0; i < 28; i++) { const m = (lo + hi) / 2; if (Math.sin(m) / m > ratio) lo = m; else hi = m; }
    return (lo + hi) / 2;
  }

  function limbPath(p0, p1, restLen, side, sag = 0, n = 8, maxHalf = 1.8, minSag = 0) {
    const d0 = sub(p1, p0), c = len(d0) || 1e-4, d = mul(d0, 1 / c), nr = mul(perp(d), side);
    const x = Math.min(maxHalf, halfAngle(c / restLen));
    const pts = [];
    if (x < 1e-3) {
      const h = Math.max(sag, minSag);
      for (let i = 0; i <= n; i++) { const k = i / n; pts.push(add(add(p0, mul(d0, k)), mul(nr, h * 4 * k * (1 - k)))); }
      return pts;
    }
    const R = c / (2 * Math.sin(x)), m = mul(add(p0, p1), .5), O = sub(m, mul(nr, R * Math.cos(x)));
    const extra = Math.max(0, minSag - R * (1 - Math.cos(x)));
    for (let i = 0; i <= n; i++) {
      const th = -x + 2 * x * i / n, k = i / n;
      pts.push(add(O, add(mul(d, R * Math.sin(th)), mul(nr, R * Math.cos(th) + extra * 4 * k * (1 - k)))));
    }
    return pts;
  }

  const pathLen = P => P.reduce((acc, p, i) => i ? acc + len(sub(p, P[i - 1])) : 0, 0);
  function resample(P, step) {
    const out = [P[0]];
    for (let i = 1; i < P.length; i++) {
      const a = P[i - 1], b = P[i], n = Math.max(1, Math.ceil(len(sub(b, a)) / step));
      for (let k = 1; k <= n; k++) out.push(add(a, mul(sub(b, a), k / n)));
    }
    return out;
  }

  function tubeGeom(P, w0, w1, lit, step) {
    const C = step ? resample(through(P, 4), step) : through(P, 4), n = C.length, L = [], R = [], N = [];
    for (let i = 0; i < n; i++) {
      const a = C[Math.max(0, i - 1)], b = C[Math.min(n - 1, i + 1)], d = norm(sub(b, a)), w = lerp(w0, w1, i / (n - 1)) / 2;
      N.push([perp(d), w]); L.push(add(C[i], mul(perp(d), w))); R.push(sub(C[i], mul(perp(d), w)));
    }
    const d = norm(sub(C[1], C[0])), a0 = Math.atan2(d[1], d[0]), cap = [];
    for (let k = 1; k < 6; k++) { const a = a0 - Math.PI / 2 - k * Math.PI / 6; cap.push(add(C[0], [Math.cos(a) * w0 / 2, Math.sin(a) * w0 / 2])); }
    const side = Math.sign(N.reduce((acc, [nv]) => acc + nv[0] * lit[0] + nv[1] * lit[1], 0)) || 1, A = [], B = [];
    N.forEach(([nv, w], i) => {
      const k = clamp((side * (nv[0] * lit[0] + nv[1] * lit[1]) - .15) * 1.6);
      A.push(add(C[i], mul(nv, side * w * .92))); B.push(add(C[i], mul(nv, side * w * (.92 - .5 * k))));
    });
    return { C, L, R, cap, A, B };
  }

  function tube(path, w0, w1, fr, J, shade = 0) {
    const P = path.map((p, i) => i ? [p[0] + jit(J), p[1] + jit(J)] : p), zoom = CAM ? CAM.zoom : 1;
    const blue = shadeCol(COL.blue, shade), purple = shadeCol(COL.purple, shade), white = shadeCol(COL.white, shade), band = shadeCol(QWIK.whiteDk, shade);
    if (pathLen(P) * zoom <= 600) {
      const g = tubeGeom(P, w0, w1, fr.lit), R = g.L.concat(g.R.slice().reverse(), g.cap);
      paint(shift(R, fr.offB), { wash: blue, ink: null });
      paint(shift(R, fr.offP), { wash: purple, ink: null });
      paint(R, { wash: white, ink: null });
      paint(g.A.concat(g.B.slice().reverse()), { wash: band, washOp: 125, ink: null });
      paint(R, { ink: PAL.ink, sw: fr.sw * .9 });
      return;
    }
    const g = tubeGeom(P, w0, w1, fr.lit, 16 / zoom), n = g.C.length, per = Math.max(4, Math.round(420 / zoom / (16 / zoom)));
    const pieces = [];
    for (let i = 0; i < n - 1; i += per) {
      const j = Math.min(n - 1, i + per + 1);
      pieces.push({ poly: g.L.slice(i, j + 1).concat(g.R.slice(i, j + 1).reverse(), i ? [] : g.cap), band: g.A.slice(i, j + 1).concat(g.B.slice(i, j + 1).reverse()) });
    }
    pieces.forEach(c => paint(shift(c.poly, fr.offB), { wash: blue, ink: null }));
    pieces.forEach(c => paint(shift(c.poly, fr.offP), { wash: purple, ink: null }));
    pieces.forEach(c => paint(c.poly, { wash: white, ink: null }));
    pieces.forEach(c => paint(c.band, { wash: band, washOp: 125, ink: null }));
    const edge = E => { for (let i = 0; i < E.length - 1; i += per) inkLine(E.slice(i, Math.min(E.length, i + per + 1)), fr.sw * .9, PAL.ink, 'inkflat', .3); };
    edge(g.L); edge(g.R);
    inkLine([g.R[0], ...g.cap, g.L[0]], fr.sw * .9, PAL.ink, 'inkflat', .5);
  }

  function capsule(x0, y0, ang, L, w, n = 5) {
    const c = Math.cos(ang), s = Math.sin(ang), r = w / 2, tx = x0 + c * (L - r), ty = y0 + s * (L - r), pts = [];
    for (let k = 0; k <= n; k++) { const a = ang + Math.PI / 2 - k * Math.PI / n; pts.push([tx + Math.cos(a) * r, ty + Math.sin(a) * r]); }
    for (let k = 0; k <= n; k++) { const a = ang - Math.PI / 2 - k * Math.PI / n; pts.push([x0 + Math.cos(a) * r, y0 + Math.sin(a) * r]); }
    return pts;
  }
  const FIST = [[-1.05, -.7], [-.3, -1.05], [.6, -1.0], [1.15, -.5], [1.15, .4], [.75, .85], [-.2, .95], [-1.0, .6]];
  const PALM = [[-1.15, -.62], [-.4, -.98], [.45, -.98], [.98, -.55], [1.02, .28], [.62, .86], [-.3, .92], [-1.15, .6]];

  function mitten(u, sw, grip, layer, detail = true) {
    const P = pts => pts.map(([a, b]) => [a * u, b * u]);
    const s = (pts, curv = .45) => paint(P(pts), { wash: COL.white, ink: PAL.ink, sw: sw * .8, curv });
    const cap = (...a) => s(capsule(...a), 0);
    const crease = pts => { if (detail) inkLine(P(pts), sw * .42, PAL.ink, 'inkfine', .5); };
    if (grip === 'grab') {
      if (layer === 0) { s([[-1.1, -.6], [-.3, -1.0], [.55, -1.05], [1.1, -.75], [1.2, -.1], [.9, .6], [.15, .9], [-.6, .8], [-1.1, .5]]); return; }
      for (const [y, l] of [[-.62, 1.05], [-.05, 1.2], [.52, 1.1]]) cap(-.05, y, .12, l, .6);
      cap(-.45, .72, .55, .95, .58);
      return;
    }
    if (layer === 0) return;
    if (grip === 'fist') {
      s(FIST);
      for (const y of [-.52, -.05, .38]) crease([[.72, y], [1.02, y + .04], [1.12, y + .12]]);
      cap(-.35, .62, -.32, 1.25, .56);
    } else if (grip === 'point') {
      cap(.35, .28, .02, 2.25, .62);
      s(FIST);
      for (const y of [-.52, -.08]) crease([[.72, y], [1.02, y + .04], [1.12, y + .12]]);
      cap(-.4, .66, .12, 1.2, .56);
    } else if (grip === 'thumb') {
      cap(-.05, .5, 1.42, 1.75, .66);
      s(FIST);
      for (const y of [-.52, -.05, .38]) crease([[.72, y], [1.02, y + .04], [1.12, y + .12]]);
    } else if (grip === 'wave') {
      for (const a of [-.62, -.12, .38]) cap(.2 + .55 * Math.cos(a), .55 * Math.sin(a), a, 1.55, .64);
      cap(.05, .5, 1.25, 1.3, .64);
      s(PALM);
    } else {
      s([[-1.1, -.7], [-.3, -1.02], [.7, -1.06], [1.55, -.82], [1.88, -.22], [1.68, .42], [1.05, .72], [.45, .74], [.6, 1.26], [.35, 1.62], [-.08, 1.42], [-.35, .88], [-.95, .62]]);
      crease([[1.05, -.4], [1.74, -.34]]);
      crease([[1.0, .18], [1.62, .13]]);
    }
  }

  function drawCol(draw, col) {
    const [p0, l0] = [paint, inkLine];
    paint = (pts, o) => p0(pts, { ...o, wash: col, washOp: 255, ink: null, fill: null, hatch: null });
    inkLine = () => {};
    try { draw(); } finally { paint = p0; inkLine = l0; }
  }

  function hand(a, fr) {
    const hu = fr.u * HAND * a.scale, sw = fr.sw;
    push(); translate(a.at[0], a.at[1]); rotate(a.ang); scale(1, a.hs);
    const toLocal = v => { const c = Math.cos(-a.ang), s = Math.sin(-a.ang); return [v[0] * c - v[1] * s, (v[0] * s + v[1] * c) * a.hs]; };
    const offP = mul(toLocal(fr.offP), .55), offB = mul(toLocal(fr.offB), .55);
    const layer = k => {
      push(); translate(offB[0], offB[1]); drawCol(() => mitten(hu, sw, a.grip, k), shadeCol(COL.blue, a.shade)); pop();
      push(); translate(offP[0], offP[1]); drawCol(() => mitten(hu, sw, a.grip, k), shadeCol(COL.purple, a.shade)); pop();
      mitten(hu, sw, a.grip, k, fr.detail);
    };
    const hook = () => { if (a.hook) { push(); scale(1, -1); a.hook(fr.u, sw); pop(); } };
    layer(0);
    if (a.grip === 'grab') hook();
    layer(1);
    if (a.grip !== 'grab') hook();
    pop();
  }

  function boot(f, fr, J) {
    const u = fr.u * f.scale, sw = fr.sw, k = f.shade || 0;
    push(); translate(f.ankle[0], f.ankle[1]); rotate(f.tilt); scale(f.dir * f.fs, 1);
    const P = pts => pts.map(([a, b]) => [a * u + jit(J), b * u + jit(J)]);
    const shape = P([[-.95, -.5], [.9, -.5], [1.08, -.05], [1.6, -.12], [2.25, .12], [2.55, .62], [2.35, 1.1], [.4, 1.2], [-.85, 1.18], [-1.28, .9], [-1.3, .28], [-1.08, -.2]]);
    paint(shift(shape, [-EDGE * .6 * u * f.dir * f.fs, EDGE * .6 * u]), { wash: shadeCol(COL.blue, k), ink: null, curv: .5 });
    paint(shape, { wash: shadeCol(COL.purple, k), ink: PAL.ink, sw: sw * .85, curv: .5 });
    paint(P([[-1.2, .84], [2.45, .84], [2.3, 1.12], [.4, 1.18], [-.85, 1.16], [-1.2, 1.0]]), { wash: shadeCol(COL.purpleDk, k), ink: null, curv: .3 });
    if (fr.detail) {
      inkLine(P([[-1.25, .85], [.6, .86], [2.5, .84]]), sw * .5, PAL.ink, 'inkfine', .3);
      paint(ellPts(1.75 * u, .3 * u, .45 * u, .22 * u, 10, 0, -.4), { wash: shadeCol(COL.purpleLt, k), ink: null });
    }
    pop();
  }

  function frame(x, y, u, o) {
    const flip = o.flip ? -1 : 1, grow = clamp(o.grow ?? 1);
    const walking = o.walk != null, walk = o.walk ?? 0, gait = o.run ? GAIT.run : GAIT.walk, wk = walking ? clamp(o.walkK ?? 1) : 0;
    const bob = -wk * gait.bob * (1 + Math.cos((walk - gait.bobAt) * 4 * Math.PI)) / 2;
    const sq = (o.sq || 0) + (o.take || 0) - wk * gait.squash * Math.cos((walk - gait.bobAt) * 4 * Math.PI);
    const sxB = flip * (o.sx ?? 1) * (1 + sq * .6), syB = (o.sy ?? 1) * (1 - sq);
    const rot = (o.rot || 0) + ((o.lean || 0) - wk * (gait.lean + .035 * Math.sin(walk * TAU))) * flip;
    const cr = Math.cos(rot), sr = Math.sin(rot);
    const lin = ([px, py]) => { const X = px * u * sxB, Y = py * u * syB; return [X * cr - Y * sr, X * sr + Y * cr]; };
    const legK = grow * Math.max(0, o.legLen ?? 1), legK1 = Math.min(1, legK);
    const hipH = lerp(HOVER - HP[1], GROUND - HP[1], legK) * (1 - clamp(sq, -.3, .5) * .45);
    const ref = lerp(BODY_CX, FEET_C, legK1);
    const hipW = [x + flip * (HP[0] - ref) * u + (o.dx || 0) * u, y - hipH * u + ((o.dy || 0) + bob) * u];
    const T = sub(hipW, lin(HP)), zoom = CAM ? CAM.zoom : 1, lodMul = zoom < .5 ? Math.pow(zoom / .5, -.5) : 1;
    return {
      x, y, u, o, flip, grow, legK, legK1, walking, walk, wk, gait, sq, rot, lin, T, hipW, toW: p => add(T, lin(p)),
      hover: HOVER * (1 - clamp(legK * 5)),
      swMul: (o.swMul || 1) * lodMul, detail: zoom >= .5,
      sw: clamp(u / 15, .45, 2.4) * (o.swMul || 1) * lodMul, offP: lin([EDGE, -EDGE]), offB: lin([-EDGE, EDGE]), lit: norm(lin([-1, 1])),
    };
  }

  function footPose(i, fr) {
    const { o, walk, wk, gait, legK1 } = fr;
    const stand = (FEET[i] - FEET_C) * (o.legSpread ?? 1) * legK1 + (1 - legK1) * (HIPS[i][0] - BODY_CX) * .6;
    if (wk <= 0) return { x: stand, lift: 0, roll: 0, turn: 0 };
    const q = frac(walk + (i ? .5 : 0)), S = gait.step, st = gait.stance;
    let x, lift = 0, roll = 0;
    if (q < st) {
      const k = q / st; x = S / 2 - S * k;
      roll = -.3 * (1 - clamp(k / .2)) + .45 * clamp((k - .72) / .28);
    } else {
      const k = (q - st) / (1 - st);
      x = -S / 2 + S * ease(k); lift = gait.lift * Math.sin(Math.PI * Math.pow(k, gait.kick));
      roll = lerp(.45, -.3, ease(clamp(k * 1.3)));
    }
    const settle = Math.sin(Math.PI * wk) * (i ? .6 : .9) * (wk < 1 ? 1 : 0);
    return { x: lerp(stand, stand * gait.lane - x, wk), lift: lift * wk + settle, roll: roll * wk, turn: wk };
  }
  function footOverride(f, i, o) {
    const ov = o[i ? 'footR' : 'footL'];
    if (!ov) return f;
    return { ...f, x: f.x + (ov.dx || 0) * (i ? 1 : -1), lift: f.lift + (ov.lift || 0), roll: f.roll + (ov.roll || 0) };
  }

  function legs(fr) {
    const { o, u, flip, legK, legK1, x, y } = fr;
    return [0, 1].map(i => {
      const f = footOverride(footPose(i, fr), i, o), root = fr.toW(HIPS[i]);
      const standDir = (i ? 1 : -1) * flip, dir = f.turn > .5 ? -flip : standDir;
      const fs = f.turn > 0 && standDir !== -flip ? Math.max(.3, Math.abs(1 - 2 * f.turn)) * lerp(.8, 1, f.turn) : lerp(.8, 1, f.turn);
      const restLen = LEG_REST[i] * legK * u, reach = restLen * LEG_STRETCH;
      let ground = [x + flip * f.x * u, y - f.lift * u], roll = f.roll;
      let ankle = [ground[0], ground[1] - ANKLE * u * legK1];
      if (roll) {
        const pivot = roll < 0 ? -1.1 : 2.3, tilt = roll * dir;
        const pv = [ground[0] + pivot * u * dir * fs, ground[1]], rel = sub(ankle, pv), c = Math.cos(tilt), s = Math.sin(tilt);
        ankle = add(pv, [rel[0] * c - rel[1] * s, rel[0] * s + rel[1] * c]);
      }
      const dv = sub(ankle, root), dl = len(dv);
      let air = 0;
      if (dl > reach) {
        air = ease(clamp((dl - reach) / (2.2 * u)));
        const leave = add(root, mul(norm(dv), reach));
        const tuck = add(root, [flip * (i ? .8 : -1.3) * u * legK1, restLen * (i ? .8 : .68)]);
        ankle = [lerp(leave[0], tuck[0], air), lerp(leave[1], tuck[1], air)];
        ground = [ankle[0], ankle[1] + ANKLE * u * legK1];
        roll = lerp(roll, i ? .42 : .62, air);
      }
      const far = fr.walking && i === 0 ? .22 * fr.wk : 0;
      const bow = f.turn > .5 ? flip : (i ? -flip : flip);
      return { i, root, ankle, ground, dir, fs, tilt: roll * dir, air, shade: far, restLen, bow, scale: legK1 };
    });
  }

  function arms(fr) {
    const { o, u, flip, walking, walk, wk, gait, grow } = fr;
    const swingK = (o.swing ?? 1) * wk, body = BOLT.map(fr.toW);
    return [0, 1].map(i => {
      const side = i ? 1 : -1, sfx = i ? 'R' : 'L', hs = side * flip;
      const root = fr.toW(SHOULDERS[i]);
      const lenK = Math.max(0, o['len' + sfx] ?? 1), restL = ARM_LEN * lenK * u * grow;
      const target = o['hand' + sfx], via = target && o['via' + sfx]?.length ? o['via' + sfx] : null;
      const swingPh = walking ? Math.sin(walk * TAU) : 0, dragPh = walking ? Math.cos(walk * TAU) : 0;
      const a = (o['a' + sfx] ?? (walking ? lerp(REST_A, gait.arm, wk) : REST_A)) + swingK * gait.swing * swingPh * (i ? -1 : 1);
      const bendDef = .3 * clamp((a + .55) * 2.5, -1, 1) + swingK * gait.bend * dragPh * (i ? 1 : -1);
      const elbowDown = target ? Math.sign(perp(norm(sub(target, root)))[1] * hs) || 1 : 1;
      const bend = o['bend' + sfx] ?? (target ? .2 * elbowDown : bendDef);
      const grip = o['grip' + sfx] ?? (walking && o.run ? 'fist' : 'open');
      const gripOff = 1.05 * u * HAND * grow;
      let path, w = 1;
      if (via) {
        path = [root, ...via, sub(target, mul(norm(sub(target, via[via.length - 1])), gripOff))];
        w = clamp(Math.sqrt(restL / Math.max(pathLen(path), 1)), .5, 1);
      } else if (target) {
        let wrist = sub(target, mul(norm(sub(target, root)), gripOff));
        for (let it = 0; it < 3; it++) {
          const c = len(sub(wrist, root)), sag = c > restL ? Math.min(Math.abs(bend) * .14 * c, 2.5 * u) : 0;
          path = limbPath(root, wrist, restL, hs * (bend >= 0 ? 1 : -1), sag, 8, 1.2);
          wrist = sub(target, mul(norm(sub(path[path.length - 1], path[path.length - 2])), gripOff));
        }
        w = clamp(Math.sqrt(restL / Math.max(len(sub(wrist, root)), 1)), .5, 1);
      } else {
        const dl = norm(fr.lin([side * Math.cos(a), -Math.sin(a)]));
        const th = Math.abs(bend) * 2.4, chord = restL * (th < 1e-3 ? 1 : Math.sin(th / 2) / (th / 2));
        path = limbPath(root, add(root, mul(dl, chord)), restL, hs * (bend >= 0 ? 1 : -1));
        w = clamp(Math.sqrt(1 / Math.max(1, lenK)), .5, 1);
      }
      const end = path[path.length - 1], tan = norm(sub(end, path[path.length - 2]));
      const at = add(end, mul(tan, gripOff)), ang = Math.atan2(tan[1], tan[0]);
      const crossing = side * (at[0] - fr.toW(FACE_C)[0]) * flip < -1.4 * u || inside(at, body);
      return { i, sfx, root, path, w, at, ang, hs: -hs, grip, front: o['front' + sfx] ?? crossing, hook: o['hold' + sfx], shade: o['shade' + sfx] || 0, scale: grow * clamp(lenK * 4), shown: lenK * grow > .02 };
    });
  }

  function drawLeg(f, fr, key) {
    if (fr.legK < .02) return;
    const u = fr.u, J = u * .03;
    key('leg' + f.i);
    const path = limbPath(f.root, f.ankle, f.restLen, f.bow, 0, 8, 1.8, .38 * u * fr.legK1);
    const w = clamp(Math.sqrt(f.restLen / Math.max(len(sub(f.ankle, f.root)), 1)), .72, 1) * lerp(.55, 1, fr.legK1);
    tube(path, LEG_W[0] * u * w, LEG_W[1] * u * w, fr, J, f.shade);
    key('boot' + f.i);
    boot(f, fr, J);
  }

  function drawArm(a, fr, key) {
    if (!a.shown) return;
    const u = fr.u, J = u * .03, g = lerp(.55, 1, fr.grow);
    key('arm' + a.sfx);
    tube(a.path, ARM_W[0] * u * a.w * g, ARM_W[1] * u * Math.max(.72, a.w) * g, fr, J, a.shade);
    key('hand' + a.sfx);
    hand(a, fr);
  }

  function layout(x, y, u, o) {
    const fr = frame(x, y, u, o), feet = legs(fr), hands = arms(fr);
    const points = {
      handL: hands[0].at, handR: hands[1].at, shoulderL: hands[0].root, shoulderR: hands[1].root, armPathL: hands[0].path, armPathR: hands[1].path,
      face: fr.toW(FACE_C), top: fr.toW(TIP), feet: feet.map(f => f.ground), hip: fr.hipW,
    };
    return { fr, feet, hands, points };
  }

  function qwik(x, y, u, o = {}) {
    const id = o.boilKey ?? ++CLAWD_N, key = part => boilSeed(`rigB ${id} ${part}`);
    const { fr, feet, hands, points } = layout(x, y, u, o), limbs = !o.noLimbs;

    key('shadow');
    if (!o.noShadow) {
      const lift = Math.max(0, -(o.dy || 0)), f = 1 - Math.min(.55, lift * .06);
      const cx = limbs && fr.legK > .02 ? (feet[0].ground[0] + feet[1].ground[0]) / 2 + fr.flip * .5 * u : fr.toW([BODY_CX, 0])[0];
      paint(ellPts(cx, y + u * .15, u * 4.6 * f, u * .75 * f, 22), { fill: PAL.ink, fillOp: 75, bleed: .25, tex: .3, border: .1, ink: null });
    }
    if (limbs) {
      feet.forEach(f => drawLeg(f, fr, key));
      hands.filter(a => !a.front).forEach(a => drawArm(a, fr, key));
    }
    bolt(fr.T[0] + BODY_CX * u, fr.T[1] + fr.hover * u, u, { ...o, dx: 0, dy: 0, hover: fr.hover, rot: fr.rot, sq: fr.sq, take: 0, swMul: fr.swMul, noShadow: true, boilKey: `rigB${id}`, hands: null, thumbs: null });
    if (limbs) hands.filter(a => a.front).forEach(a => drawArm(a, fr, key));
    key('after');
    return points;
  }

  const bodyPoint = (x, y, u, o, p) => frame(x, y, u, o).toW(p);

  function stroll(t, t0, t1, x0, x1, u, o = {}) {
    const x = lerp(x0, x1, ease(seg(t, t0, t1))), dist = Math.abs(x - x0) / u, stride = o.run ? RUN_STRIDE : STRIDE;
    const walkK = ease(seg(t, t0, t0 + .22)) * (1 - ease(seg(t, t1 - .22, t1)));
    return { x, walk: t > t0 && t < t1 ? dist / stride : null, walkK, flip: x1 > x0, run: !!o.run };
  }

  const pose = (x, y, u, o = {}) => layout(x, y, u, o).points;

  const rubberArm = a => a >= .2 ? lerp(-1.15, 1.05, (a - .2) / .9) : lerp(-1.45, -1.15, clamp((a + .9) / 1.1));
  const withRubberArms = (o, over = {}) => ({ ...o, aL: rubberArm(o.aL ?? .2), aR: rubberArm(o.aR ?? .2), ...over });
  const feelB = (name, t, over = {}) => withRubberArms(boltFeel(name, t), over);
  const emotionsB = (t, keys, o = {}) => withRubberArms(boltEmotions(t, keys, o));

  window.RIG_B = { qwik, pose, bodyPoint, stroll, feel: feelB, emotions: emotionsB, STRIDE, RUN_STRIDE, COL, points: { tip: TIP, face: FACE_C, shoulders: SHOULDERS, hips: HIPS } };

  const floorLine = (y, x0, x1) => inkLine([[x0, y + 6], [(x0 + x1) / 2, y + 4], [x1, y + 7]], .6, mixCol(PAL.paper, PAL.ink, .35), 'inkfine', .5);
  function box(cx, cy, s, sw, rot = 0) {
    push(); translate(cx, cy); rotate(rot);
    paint(rrPts(-s, -s, 2 * s, 2 * s, s * .2), { wash: COL.box, ink: PAL.ink, sw: sw * .9 });
    paint(rrPts(-s * .88, s * .38, 1.76 * s, s * .5, s * .14), { wash: COL.boxDk, washOp: 140, ink: null });
    inkLine([[-s * .2, -s * .95], [-s * .2, s * .95]], sw * .45, PAL.ink, 'inkfine', 0);
    pop();
  }

  LOOPS.rigB = t => {
    const u = 11, cw = W / 3, rows = [455, 995], sw = clamp(u / 15, .45, 2.4);
    const col = i => cw * i + cw / 2;
    floorLine(rows[0], 60, W - 60); floorLine(rows[1], 60, W - 60);
    const b = _b(t), bp = bpOf(t);

    qwik(col(0), rows[0], u, { ...boltFeel('happy', t), boilKey: 'idle',
      aL: -1.05 + .12 * Math.sin(bp * Math.PI), bendL: -.28 + .14 * Math.sin((bp - .35) * Math.PI),
      aR: -1.1 + .1 * Math.sin((bp + .5) * Math.PI), bendR: -.26 + .12 * Math.sin((bp + .15) * Math.PI) });

    qwik(col(1), rows[0], u, { ...boltFeel('happy', t), boilKey: 'walk', dy: 0, sq: 0, walk: t, aL: -1.15, aR: -1.15, lookX: -.6 });

    const w2 = Math.sin(t * TAU * 2), w2l = Math.sin(t * TAU * 2 - .9);
    qwik(col(2), rows[0], u, { ...boltFeel('happy', t), boilKey: 'wave', eyes: 'happy', mouth: 'beam', lean: -.05, rot: .04 * w2,
      aL: -1.15, bendL: -.28, aR: 1.05 + .25 * w2, bendR: .3 + .25 * w2l, gripR: 'wave' });

    const pk = spring(frac(t / 2) * 2, .25, 5, 20);
    qwik(col(0) - 40, rows[1], u, { ...boltFeel('happy', t), boilKey: 'point', eyes: 'normal', mouth: 'smile', lookX: 1, lookY: -.1, seed: 1,
      lean: .09 + .03 * pk, aL: -1.2, bendL: -.3, aR: .12 + .04 * b.s1 + .1 * pk, bendR: .08 + .2 * pk, gripR: 'point' });
    const sparkX = col(0) + 250, sparkY = rows[1] - 15 * u;
    boilSeed('rigB spark');
    paint(starPts(sparkX, sparkY, u * (1.3 + .25 * pulse(t, 4)), .42, 4, .2 * Math.sin(t * TAU)), { wash: '#FFE68A', ink: PAL.ink, sw: sw * .7 });

    const T0 = .16, T1 = .4, T2 = 1.58, T3 = 1.74;
    const mx = col(1) - 150, bx = mx + 345, by = rows[1] - 6 * u, grip = [bx - 1.25 * u, by];
    const base = { ...boltFeel('determined', t), boilKey: 'reach', dy: 0, lookX: 1, gripL: 'open' };
    const windUp = w => ({ lean: lerp(.08, -.07, w), sq: .07 * w, aR: lerp(-1.1, -1.9, w), bendR: .15 - .3 * w, aL: lerp(-.9, -.2, w), bendL: .3 });
    const drawn = pose(mx, rows[1], u, { ...base, ...windUp(1) }).handR, rest = pose(mx, rows[1], u, { ...base, ...windUp(0) }).handR;
    const tug = Math.sin(seg(t, T1 + .1, T2 - .05) * Math.PI * 2), held = t >= T1 && t < T2;
    const hit = spring(t, T1, 8, 26), fling = spring(t, T0, 5, 14);
    let o;
    if (t < T0) o = windUp(ease(seg(t, 0, T0)));
    else if (t < T1) {
      const k = easeOut(seg(t, T0, T1));
      o = { lean: lerp(-.07, .14, k), handR: add(add(drawn, mul(sub(grip, drawn), k)), [0, -1.4 * u * Math.sin(Math.PI * k)]), gripR: k > .75 ? 'grab' : 'open', bendR: .1 };
    } else if (t < T2) o = { lean: .14 - .06 * hit - .09 * Math.max(0, tug), handR: grip, gripR: 'grab', bendR: .14 + .12 * Math.sin(t * TAU * 1.5) - .1 * Math.max(0, tug), sq: .03 * hit,
      holdR: (hu, s2) => { push(); scale(1 + .12 * hit, 1 - .12 * hit); box(1.25 * hu, 0, 1.25 * hu, s2); pop(); } };
    else if (t < T3) {
      const k = easeIn(seg(t, T2, T3));
      o = { lean: lerp(.14, -.02, k), handR: add(add(grip, mul(sub(rest, grip), k)), [0, -.8 * u * Math.sin(Math.PI * k)]), gripR: 'open', bendR: .2 };
    } else { const sp = spring(t, T3, 9, 22); o = { lean: lerp(-.02, .08, 1 - Math.exp(-10 * (t - T3))) - .06 * sp, aR: -1.1 + .55 * sp, bendR: .15 - .7 * sp }; }
    if (!held) box(bx, by, 1.25 * u, sw);
    const aL = t < T0 ? lerp(-.9, -.2, ease(seg(t, 0, T0))) : lerp(-.2, .85, easeOut(seg(t, T0, T1))) + .4 * fling + (held ? .25 * tug : 0) - 1.75 * ease(seg(t, T2, 1.95));
    qwik(mx, rows[1], u, { ...base, aL, bendL: .35 + .25 * fling + (held ? .15 * Math.cos(t * TAU * 1.5) : 0), ...o });

    const ph = frac(t), hop = jump(ph, .3, .82, 4.2), lag = spring(ph, .3, 7, 16) + spring(ph, .82, 9, 16);
    const bxx = col(2) - 1.3 * u, byy = rows[1] - (25 - hop.dy - 1.4 * lag) * u;
    box(bxx, byy, 2.8 * u, sw);
    qwik(col(2), rows[1], u, { ...boltFeel('happy', t), boilKey: 'carry', dy: hop.dy, sq: hop.sq, eyes: 'happy', mouth: 'beam',
      handL: [bxx - 2.9 * u, byy + 1.3 * u], handR: [bxx + 2.9 * u, byy + 1.3 * u], gripL: 'grab', gripR: 'grab', bendL: .35, bendR: .35 });
  };
  LOOPS.rigB.len = 2;

  LOOPS.rigBWalk = t => {
    const u = 22;
    floorLine(900, 300, W - 300);
    qwik(W / 2 + 60, 900, u, { ...boltFeel('happy', t), boilKey: 'walk', dy: 0, sq: 0, walk: t, aL: -1.15, aR: -1.15, lookX: -.6 });
  };
  LOOPS.rigBWalk.len = 1;

  LOOPS.rigBEmotions = t => {
    const names = Object.keys(EMO), cols = 8, cw = W / cols, ch = H / 4;
    names.forEach((name, i) => {
      const cx = cw * (i % cols) + cw / 2, gy = ch * Math.floor(i / cols) + ch - 30;
      qwik(cx + 10, gy, 8.5, { ...feelB(name, t, { seed: i }), boilKey: 'emo' + i });
    });
  };
  LOOPS.rigBEmotions.len = 4;

  LOOPS.rigBHands = t => {
    const u = 20, grips = ['open', 'wave', 'point', 'fist', 'grab', 'thumb'];
    grips.forEach((g, i) => {
      const cx = 330 + (i % 3) * 620, gy = 500 + Math.floor(i / 3) * 520;
      qwik(cx, gy, u, { ...boltFeel('happy', 0), dy: 0, sq: 0, aR: .25, bendR: .15, gripR: g, aL: -.95, bendL: -.3, gripL: g,
        holdR: g === 'grab' ? (hu, s2) => box(1.3 * hu, 0, 1.2 * hu, s2) : null });
    });
  };
  LOOPS.rigBHands.len = 2;

  LOOPS.rigBHero = t => {
    const u = 26, bp = bpOf(t), f = frac(bp), hit = pulse(t, 6);
    floorLine(960, 200, W - 200);
    const ta = frac(bp / 2) * 2 * BEAT, kick = spring(ta, 0, 4.5, 13), kick2 = spring(ta, .07, 4.5, 13);
    const sway = Math.sin(bp * Math.PI), wig = Math.sin(t * TAU * 7) * Math.exp(-2.5 * ta);
    const toe = -.42 * ease(seg(f, .12, .6)) * (1 - easeIn(seg(f, .78, 1)));
    qwik(W / 2 + 90, 960, u, { ...boltFeel('happy', t), eyes: 'happy', mouth: 'beam', legSpread: 1.3,
      dx: .3 * sway, lean: -.05 + .03 * sway + .04 * kick2, dy: -.55 * Math.sin(Math.PI * f), sq: .08 * hit,
      aL: .26 + .18 * kick2 + .06 * sway, bendL: .5 - .2 * kick2 + .05 * wig, gripL: 'wave',
      aR: .9 + .2 * kick + .05 * sway, bendR: .36 - .22 * kick + .05 * wig, gripR: 'wave',
      footR: { roll: toe } });
  };
  LOOPS.rigBHero.len = 2;
})();
