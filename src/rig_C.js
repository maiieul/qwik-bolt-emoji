(() => {
  const COL = {
    limb: '#6244CC', glove: '#29B3F2', gloveDk: '#1A7FC0', cuff: '#E9F8FF', shoe: '#FFD447', sole: '#E4952B', box: '#FFD447', boxDk: '#E4952B',
  };
  const TIP_H = 6.7, TIP_X = 2.1, SLACK = 1.3;
  const SHOULDER = [[-6.85, -6.75], [-.8, -6.55]];
  const HIP = [[-2.25, -2.75], [-.85, -2.35]];
  const ARM_LEN = 8, FOOT_X = 2.7, ANKLE_H = .85, HAND = 1.15, FOOT = 1.08;
  const ARM_W = [1.45, .82], LEG_W = [1.6, .95];
  const GAIT = {
    walk: { duty: .56, travel: 11, lift: 1.9, bob: .5, rock: .05, arm: .32 },
    run: { duty: .34, travel: 17, lift: 3.4, bob: 1.1, rock: .06, arm: .55, peak: .6 },
  };

  const LEG_REST = [0, 1].map(s => {
    const hx = TIP_X + HIP[s][0], hy = -(TIP_H - HIP[s][1]), fx = (s ? 1 : -1) * FOOT_X, fy = -ANKLE_H;
    return Math.hypot(fx - hx, fy - hy) * 1.14;
  });

  function bodyMap(bx, by, u, o, sq, rot) {
    const c = Math.cos(rot), s = Math.sin(rot), turn = o.turnX ?? 1;
    const fx = (o.flip ? -1 : 1) * (o.sx ?? 1) * (1 + sq * .6), fy = (o.sy ?? 1) * (1 - sq);
    return (px, py) => {
      if (turn !== 1) px = BODY_CX + (px - BODY_CX) * turn;
      const qx = px * u * fx, qy = py * u * fy;
      return [bx + qx * c - qy * s, by + qx * s + qy * c];
    };
  }

  function step(ph, G) {
    const q = frac(ph), S = G.travel * G.duty;
    if (q < G.duty) return { off: S / 2 - S * q / G.duty, lift: 0, tilt: 0 };
    const k = (q - G.duty) / (1 - G.duty);
    return { off: -S / 2 + G.travel * (ease(k) - (1 - G.duty) * k), lift: G.lift * Math.sin(Math.PI * Math.pow(k, G.peak ?? .8)), tilt: .5 * Math.sin(TAU * k) };
  }

  const quad = (A, C, B, s) => { const m = 1 - s; return [m * m * A[0] + 2 * m * s * C[0] + s * s * B[0], m * m * A[1] + 2 * m * s * C[1] + s * s * B[1]]; };
  const quadNormal = (A, C, B, s) => {
    const m = 1 - s, dx = m * (C[0] - A[0]) + s * (B[0] - C[0]), dy = m * (C[1] - A[1]) + s * (B[1] - C[1]), d = Math.hypot(dx, dy) || 1;
    return [-dy / d, dx / d];
  };
  const quadLen = (A, C, B) => {
    let L = 0, p = A;
    for (let i = 1; i <= 10; i++) { const q = quad(A, C, B, i / 10); L += Math.hypot(q[0] - p[0], q[1] - p[1]); p = q; }
    return L;
  };

  function limbPts(A, C, B, zig, kinks) {
    if (zig < .5) return [0, .16, .33, .5, .67, .84, 1].map(s => quad(A, C, B, s));
    const knots = [[0, 0], [.08, 0]];
    for (let j = 0; j < kinks; j++) knots.push([.08 + .84 * (j + .5) / kinks, j % 2 ? -1 : 1]);
    knots.push([.92, 0], [1, 0]);
    const pts = [];
    for (let i = 0; i < knots.length - 1; i++) {
      const [s0, o0] = knots[i], [s1, o1] = knots[i + 1];
      for (const f of [0, .16, .84]) {
        const s = lerp(s0, s1, f), off = lerp(o0, o1, f) * zig, p = quad(A, C, B, s), n = quadNormal(A, C, B, s);
        pts.push([p[0] + n[0] * off, p[1] + n[1] * off]);
      }
    }
    pts.push(B);
    return pts;
  }

  const textured = u => u * (CAM ? CAM.zoom : 1) >= 15;
  const tex = (u, fill, op) => textured(u) ? { fill, fillOp: op, bleed: .03, tex: .5, border: .5 } : {};

  function limb(A, C, B, rest, w0, w1, col, u, sw, kinks) {
    const arc = quadLen(A, C, B), r = arc / rest, thin = r > 1 ? Math.pow(r, -.4) : 1;
    const zig = clamp((r - 1.7) / 1.5) * 1.05 * u;
    const pts = limbPts(A, C, B, zig, kinks);
    paint(ribbon(pts, Math.max(.7 * u, w0 * thin), Math.max(.56 * u, w1 * thin)), { wash: col, ...tex(u, mixCol(col, PAL.ink, .4), 50), ink: PAL.ink, sw: sw * .85 });
    if (zig > .6 * u) {
      for (let j = 0; j < kinks; j++) {
        if (random() > .4) continue;
        const s = .08 + .84 * (j + .5) / kinks, p = quad(A, C, B, s), n = quadNormal(A, C, B, s), side = j % 2 ? -1 : 1;
        spark(p[0] + n[0] * side * (zig + .9 * u), p[1] + n[1] * side * (zig + .9 * u), u * (1.05 + .35 * random()), Math.atan2(n[1], n[0]) * side + jit(.4), sw);
      }
    }
    return { r, zig };
  }

  function fanHand(cx, rx, ry, digits, n = 96) {
    const reach = (d, L, w) => {
      const c = Math.cos(d), sn = Math.abs(Math.sin(d));
      if (c <= 0) return w;
      return w >= L * sn ? L * c + Math.sqrt(w * w - L * L * sn * sn) : w / sn;
    };
    const pts = [];
    for (let i = 0; i < n; i++) {
      const th = -Math.PI + TAU * i / n;
      let r = 1 / Math.sqrt((Math.cos(th) / rx) ** 2 + (Math.sin(th) / ry) ** 2);
      for (const [phi, L, w] of digits) r = Math.max(r, reach(Math.atan2(Math.sin(th - phi), Math.cos(th - phi)), L, w));
      pts.push([cx + r * Math.cos(th), r * Math.sin(th)]);
    }
    return pts;
  }

  const GRIPS = {
    open: {
      back: [[.3, -.6], [.8, -.9], [1.15, -1.05], [1.2, -1.5], [1.5, -1.75], [1.82, -1.58], [1.8, -1.1], [2.3, -.95], [2.8, -.7], [3.05, -.25], [2.95, .25], [2.55, .62], [1.8, .9], [1, .9], [.35, .6]],
      lines: [[[2.05, -.3], [2.5, -.25], [2.85, -.1]], [[2, .2], [2.45, .28], [2.75, .42]]],
      hold: [1.8, 0],
    },
    wave: {
      back: fanHand(1.55, 1.02, .95, [[Math.PI, 1.3, .62], [-1.38, 1.45, .36], [-.62, 1.85, .33], [-.06, 1.98, .33], [.5, 1.78, .32]]),
      lines: [],
      hold: [1.8, 0],
      curv: .15,
    },
    fist: {
      back: [[.3, -.6], [.75, -.95], [1.6, -1.08], [2.3, -.92], [2.66, -.58], [2.58, -.3], [2.74, -.05], [2.62, .22], [2.66, .5], [2.35, .84], [1.6, .97], [.8, .9], [.35, .6]],
      lines: [[[1.05, -.45], [1.6, -.25], [2.2, -.38]], [[2.12, -.28], [2.5, -.3]], [[2.18, .16], [2.52, .2]]],
      hold: [1.6, 0],
    },
    point: {
      back: [[.3, -.6], [.75, -.95], [1.6, -1.05], [2.2, -1], [3.1, -.95], [3.55, -.78], [3.45, -.45], [2.9, -.4], [2.5, -.3], [2.55, .35], [2.3, .8], [1.6, .95], [.8, .9], [.35, .6]],
      lines: [[[1.15, -.5], [1.7, -.35], [2.15, -.45]], [[2.1, .05], [2.48, .1]], [[2.05, .45], [2.4, .5]]],
      hold: [1.6, 0],
    },
    thumb: {
      back: [[.3, -.6], [.7, -.9], [1.05, -1], [1.02, -1.75], [1.22, -2.25], [1.6, -2.25], [1.78, -1.8], [1.82, -1.05], [2.35, -.92], [2.66, -.55], [2.56, -.25], [2.72, .05], [2.6, .35], [2.62, .6], [2.35, .86], [1.6, .97], [.8, .9], [.35, .6]],
      lines: [[[2.1, -.25], [2.48, -.26]], [[2.14, .2], [2.5, .22]]],
      hold: [1.6, 0],
    },
    grab: {
      back: [[.3, -.6], [.8, -1.05], [1.5, -1.35], [2.3, -1.35], [2.95, -1.1], [3.05, -.72], [2.6, -.62], [1.8, -.55], [1.6, .3], [1.7, .95], [1.1, 1], [.35, .6]],
      front: [[2.2, -.55], [2.95, -.6], [3.25, -.2], [3.2, .45], [2.85, .95], [2.2, 1.05], [1.75, .75], [2, .2]],
      lines: [[[2.45, -.1], [2.85, -.05], [3.1, .05]], [[2.35, .35], [2.75, .42], [3, .5]]],
      hold: [2.4, .2],
    },
  };
  const CUFF = [[-.1, -.62], [.2, -.72], [.62, -.86], [.72, -.3], [.72, .3], [.62, .86], [.2, .72], [-.1, .62]];

  function glove(grip, u, sw, hook, upright) {
    const G = GRIPS[grip] || GRIPS.open, k = u * HAND, P = pts => pts.map(([a, b]) => [a * k + jit(.03 * u), b * k + jit(.03 * u)]);
    paint(P(G.back), { wash: COL.glove, ...tex(u, COL.gloveDk, 45), ink: PAL.ink, sw: sw * .8, curv: G.curv ?? .45 });
    if (!G.front) G.lines.forEach(l => inkLine(P(l), sw * .45, PAL.ink, 'inkfine', .5));
    if (hook) { push(); translate(G.hold[0] * k, G.hold[1] * k); hook(u, sw, upright); pop(); }
    if (G.front) {
      paint(P(G.front), { wash: COL.glove, ...tex(u, COL.gloveDk, 45), ink: PAL.ink, sw: sw * .8, curv: .45 });
      G.lines.forEach(l => inkLine(P(l), sw * .45, PAL.ink, 'inkfine', .5));
    }
    paint(P(CUFF), { wash: COL.cuff, ink: PAL.ink, sw: sw * .7, curv: .3 });
  }

  const SHOE = [[-.85, -.06], [-1.3, -.42], [-.95, -.72], [-.6, -1.08], [.3, -1.1], [.75, -.82], [1.55, -.66], [2.3, -.66], [2.95, -1.08], [2.9, -.55], [2.45, -.1], [1.95, 0], [-.5, 0]];
  const SOLE = [[-1.2, -.36], [-.55, -.36], [-.2, -.56], [.2, -.34], [.75, -.34], [1.1, -.56], [1.5, -.32], [2.72, -.32], [2.45, -.1], [1.95, 0], [-.5, 0], [-.85, -.06]];

  function shoe(u, sw, col) {
    const k = u * FOOT, P = pts => pts.map(([a, b]) => [a * k + jit(.03 * u), b * k + jit(.03 * u)]);
    paint(P(SHOE), { wash: col, ...tex(u, COL.sole, 40), ink: null, curv: .35 });
    paint(P(SOLE), { wash: COL.sole, ink: null, curv: .05 });
    paint(P(SHOE), { ink: PAL.ink, sw: sw * .8, curv: .35 });
  }

  const rot2 = ([x, y], a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
  const norm = ([x, y]) => { const d = Math.hypot(x, y) || 1; return [x / d, y / d]; };
  const restBend = a => .3 * Math.tanh(2 * (a + .7));

  function walkArms(p, run) {
    const G = run ? GAIT.run : GAIT.walk, swing = Math.sin(TAU * (p - .25)), lag = Math.cos(TAU * (p - .25));
    if (run) return { aL: -.75 + G.arm * swing, aR: -.7 - G.arm * swing, bendL: .75 - .3 * lag, bendR: .75 + .3 * lag };
    return { aL: -1.08 + G.arm * swing, aR: -.98 - G.arm * swing, bendL: -.25 - .35 * lag, bendR: -.25 + .35 * lag };
  }

  function qwik(x, y, u, o = {}) {
    const id = o.boilKey ?? ++CLAWD_N, rs = part => boilSeed(`rigC ${id} ${part}`);
    const flip = o.flip ? -1 : 1, heading = o.dir ?? flip, sq = (o.sq || 0) + (o.take || 0), sw = clamp(u / 15, .45, 2.4);
    const walking = o.walk != null, gk = walking ? clamp(o.stride ?? 1) : 0, G = o.run ? GAIT.run : GAIT.walk, p = walking ? o.walk : 0;
    const spread = o.legSpread ?? 1;

    const steps = [step(p, G), step(p + .5, G)];
    const bob = gk * G.bob * -Math.cos(4 * Math.PI * (p - .08));
    const lift = -(o.dy || 0) + bob, over = lift - SLACK, air = over > 0 ? lift - SLACK * Math.exp(-over / .8) + .9 * (1 - Math.exp(-over / .6)) : 0;
    const tipH = TIP_H * (1 - sq * .8) + lift;
    const lean = (o.lean || 0) + (o.rot || 0) + gk * heading * ((o.run ? .16 : .07) + G.rock * Math.sin(TAU * (p - .1)));
    const bx = x + (TIP_X * flip + (o.dx || 0)) * u, by = y - tipH * u;
    const X = bodyMap(bx, by, u, o, sq, lean);
    const local = s => flip > 0 ? s : 1 - s;

    const feet = [0, 1].map(s => {
      const sd = s ? 1 : -1, st = steps[s];
      const fx = x + (sd * FOOT_X * spread * lerp(1, .38, gk) + gk * st.off * heading) * u;
      const fy = y - (air + gk * st.lift) * u;
      const dir = lerp(sd, heading, gk);
      return { at: [fx, fy], dir: Math.sign(dir || 1) * Math.max(.4, Math.abs(dir)), tilt: gk * st.tilt * heading, sd };
    });

    rs('shadow');
    if (!o.noShadow) {
      const cx = (feet[0].at[0] + feet[1].at[0]) / 2, w = Math.abs(feet[1].at[0] - feet[0].at[0]) / 2 + 2.6 * u, k = 1 - Math.min(.5, air * .12);
      paint(ellPts(cx, y + .1 * u, w * k, .8 * u * k, 22), { fill: PAL.ink, fillOp: 70, bleed: .25, tex: .3, border: .1, ink: null });
    }

    const arms = [0, 1].map(s => {
      const K = s ? 'R' : 'L', sd = s ? 1 : -1, S = X(...SHOULDER[local(s)]);
      const at = o['handAt' + K], target = at ? X(...at) : o['hand' + K], rest = ARM_LEN * (o['len' + K] ?? 1) * u, natural = ARM_LEN * u;
      const grip = o['grip' + K] || 'open', hold = (GRIPS[grip] || GRIPS.open).hold, holdV = [hold[0] * u * HAND, hold[1] * u * HAND * sd];
      let a = o['a' + K], bend = o['bend' + K], B, geo;
      const shape = W => {
        const c = Math.hypot(W[0] - S[0], W[1] - S[1]) || 1e-3, d = [(W[0] - S[0]) / c, (W[1] - S[1]) / c], n = [-sd * d[1], sd * d[0]];
        const curl = target && c < rest ? Math.sqrt(3 * c * (rest - c) / 8) : 0;
        const sag = Math.sign(bend || restBend(a) || 1) * Math.max(Math.abs(bend) * .28 * c, curl);
        const C = [(S[0] + W[0]) / 2 + n[0] * 2 * sag, (S[1] + W[1]) / 2 + n[1] * 2 * sag], tan = norm([W[0] - C[0], W[1] - C[1]]);
        return { C, ang: Math.atan2(tan[1], tan[0]) };
      };
      if (target) {
        const d = norm([target[0] - S[0], target[1] - S[1]]);
        a = Math.atan2(-d[1], sd * d[0]);
        if (bend == null) bend = restBend(a);
        B = target;
        for (let i = 0; i < 3; i++) { geo = shape(B); const off = rot2(holdV, geo.ang); B = [target[0] - off[0], target[1] - off[1]]; }
      } else {
        const swing = walking ? walkArms(p, o.run) : null;
        if (a == null) a = swing ? swing['a' + K] : -1.2;
        if (bend == null) bend = swing ? swing['bend' + K] : restBend(a);
        const d = rot2([sd * Math.cos(a), -Math.sin(a)], lean), chord = rest / (1 + 8 / 3 * (.28 * bend) ** 2);
        B = [S[0] + d[0] * chord, S[1] + d[1] * chord];
      }
      geo = shape(B);
      const C = [geo.C[0] + jit(.04 * u), geo.C[1] + jit(.04 * u)], off = rot2(holdV, geo.ang);
      const front = o['front' + K] ?? false, handFront = front || (o['handFront' + K] ?? !!at);
      return { K, sd, S, B, C, ang: geo.ang, grip, front, handFront, natural, hook: o['hold' + K], palm: [B[0] + off[0], B[1] + off[1]] };
    });

    const drawLimb = A => { rs('arm' + A.K); limb(A.S, A.C, A.B, A.natural, ARM_W[0] * u, ARM_W[1] * u, COL.limb, u, sw, 4); };
    const drawHand = A => {
      rs('hand' + A.K);
      push(); translate(A.B[0], A.B[1]); rotate(A.ang); if (A.sd < 0) scale(1, -1);
      const upright = () => { if (A.sd < 0) scale(1, -1); rotate(-A.ang); };
      glove(A.grip, u, sw, A.hook, upright);
      pop();
    };

    const legs = [0, 1].map(s => {
      const F = feet[s], H = X(...HIP[local(s)]), K = [F.at[0], F.at[1] - ANKLE_H * u];
      const cx = K[0] - H[0], cy = K[1] - H[1], c = Math.hypot(cx, cy) || 1e-3, L0 = LEG_REST[local(s)] * u;
      const perp = [-cy / c, cx / c], kd = [lerp(F.sd, heading, gk), 0], toward = perp[0] * kd[0] + perp[1] * kd[1];
      const sag = Math.max(.45 * u, c < L0 ? Math.sqrt(3 * c * (L0 - c) / 8) : 0);
      const C = [(H[0] + K[0]) / 2 + perp[0] * 2 * sag * toward + jit(.04 * u), (H[1] + K[1]) / 2 + perp[1] * 2 * sag * toward + jit(.04 * u)];
      return { s, H, K, C, L0, F };
    });

    if (!o.noLimbs) {
      legs.forEach(Lg => {
        rs('leg' + Lg.s);
        const col = Lg.s === 0 && gk > 0 ? mixCol(COL.limb, PAL.ink, .2 * gk) : COL.limb;
        limb(Lg.H, Lg.C, Lg.K, Lg.L0, LEG_W[0] * u, LEG_W[1] * u, col, u, sw, 4);
        push(); translate(Lg.K[0], Lg.K[1]); rotate(Lg.F.tilt); translate(0, ANKLE_H * u); scale(Lg.F.dir, 1);
        shoe(u, sw, COL.shoe);
        pop();
      });
      arms.filter(A => !A.front).forEach(A => { drawLimb(A); if (!A.handFront) drawHand(A); });
    }

    bolt(bx + BODY_CX * u, by, u, { ...o, dx: 0, dy: 0, hover: 0, sq, take: 0, rot: lean, noShadow: true, boilKey: id });

    if (!o.noLimbs) arms.forEach(A => { if (A.front) drawLimb(A); if (A.handFront) drawHand(A); });
    rs('after');

    return {
      handL: arms[0].palm, handR: arms[1].palm, face: X(FACE.x, FACE.y), top: X(BOLT[1][0], BOLT[1][1]),
      feet: feet.map(F => F.at), shoulderL: arms[0].S, shoulderR: arms[1].S,
    };
  }

  const box = (s, col = COL.box, off = [0, 0]) => (u, sw, upright) => {
    if (upright) upright();
    translate(off[0] * u, off[1] * u);
    paint(rrPts(-s * u / 2, -s * u / 2, s * u, s * u, .22 * u), { wash: col, ink: PAL.ink, sw: sw * .8 });
    paint(rrPts(-s * u / 2 + .25 * u, -s * u / 2 + .25 * u, s * u - .5 * u, .35 * u, .12 * u), { wash: '#FFF1B8', ink: null });
  };

  window.RIG_C = { qwik, walkArms, box, COL, STRIDE: GAIT.walk.travel, RUN_STRIDE: GAIT.run.travel, ARM_LEN };

  const floor = (y, x0 = 0, x1 = W) => inkLine([[x0 + 40, y + 6], [(x0 + x1) / 2, y + 4], [x1 - 40, y + 7]], .6, mixCol(PAL.paper, PAL.ink, .35), 'inkfine', .5);

  LOOPS.rigCLab = t => {
    const grips = Object.keys(GRIPS), u = 36;
    grips.forEach((g, i) => {
      const x = 170 + i * 300, y = 300;
      boilSeed('lab arm' + i);
      limb([x - 5 * u, y + 1.2 * u], [x - 2.5 * u, y + 1.6 * u], [x, y], ARM_LEN * u, ARM_W[0] * u, ARM_W[1] * u, COL.limb, u, 2, 5);
      push(); translate(x, y); rotate(-.2); glove(g, u, 2, g === 'grab' ? box(2.2) : null, () => rotate(.2)); pop();
    });
    [[400, 850, 1], [900, 850, -1], [1400, 850, 1]].forEach(([x, y, d], i) => {
      boilSeed('lab shoe' + i);
      limb([x - .5 * u, y - 7 * u], [x - 1.5 * u, y - 4 * u], [x, y - ANKLE_H * u], 8 * u, LEG_W[0] * u, LEG_W[1] * u, COL.limb, u, 2, 4);
      push(); translate(x, y); scale(d, 1); shoe(u, 2, COL.shoe); pop();
    });
  };
  LOOPS.rigCLab.len = 2;

  LOOPS.rigC = t => {
    const u = 11, cw = W / 3, gy = [470, 985];
    gy.forEach(g => floor(g));
    const cell = (c, r) => [cw * (c + .5), gy[r]];

    {
      const [x, y] = cell(0, 0);
      const bp = t / BEAT, drag = Math.sin(TAU * bp - 1.1);
      RIG_C.qwik(x, y, u, { ...boltFeel('happy', t), aL: -1.02 + .08 * Math.sin(TAU * t / 2 + .4) + .06 * drag, aR: -.92 + .1 * Math.sin(TAU * t / 2 + 2.1) + .05 * Math.sin(TAU * bp - 1.5),
        bendL: -.32 - .12 * drag, bendR: -.3 - .1 * Math.sin(TAU * bp - 1.6), dx: .3 * Math.sin(TAU * t / 2), rot: .025 * Math.sin(TAU * t / 2 - .5), seed: 1 });
    }
    {
      const [x, y] = cell(1, 0), p = t;
      for (let i = 0; i < 9; i++) {
        const tx = x - 260 + frac(i / 9 - p * RIG_C.STRIDE * u / 520) * 520;
        inkLine([[tx, y + 14], [tx + 14, y + 14]], .8, mixCol(PAL.paper, PAL.ink, .4), 'inkfine', 0);
      }
      RIG_C.qwik(x, y, u, { ...boltFeel('happy', t), walk: p, aL: undefined, aR: undefined, seed: 2 });
    }
    {
      const [x, y] = cell(2, 0), w = Math.sin(TAU * 2 * t);
      RIG_C.qwik(x, y, u, { ...boltFeel('happy', t), aR: 1.25 + .28 * w, bendR: -.2 - .35 * Math.cos(TAU * 2 * t), gripR: 'wave', aL: -1.2, bendL: -.3, seed: 3 });
    }
    {
      const [x, y] = cell(0, 1);
      paint(starPts(x + 250, y - 150, 22, .45, 5, -Math.PI / 2 + .2 * Math.sin(TAU * t)), { wash: PAL.ochre, ink: PAL.ink, sw: .8 });
      RIG_C.qwik(x - 40, y, u, { ...boltFeel('neutral', t), eyes: 'normal', lookX: 1, lookY: -.3, aR: .25 + .04 * Math.sin(TAU * t), bendR: .05, gripR: 'point', handAtL: [-5.9, -3.3], gripL: 'fist', bendL: -.9, seed: 4 });
    }
    {
      const [x, y] = cell(1, 1), sx = x - 150, bx = x + 250, by = y - 1.7 * u;
      const out = easeOut(seg(t, .2, .42)), back = seg(t, 1.56, 1.76), held = t > .42 && t < 1.56;
      const tug = held ? Math.sin(TAU * 2.5 * (t - .42)) * Math.exp(-(t - .42) * .6) : 0, yank = held ? .5 - .5 * Math.cos(TAU * (t - .42) / 1.2) : 0;
      const boxX = bx - 22 * yank, boxY = by - 3 * Math.abs(tug);
      if (!held) paint(rrPts(boxX - 1.4 * u, boxY - 1.4 * u, 2.8 * u, 2.8 * u, .22 * u), { wash: COL.box, ink: PAL.ink, sw: .8 });
      if (!held) paint(rrPts(boxX - 1.15 * u, boxY - 1.15 * u, 2.3 * u, .35 * u, .12 * u), { wash: '#FFF1B8', ink: null });
      const grip = [boxX - 1.15 * u, boxY], rest = [sx + 5 * u, y - 13 * u], reachT = [lerp(rest[0], grip[0], out), lerp(rest[1], grip[1], out) - 40 * Math.sin(Math.PI * out)];
      const snap = back > 0 ? [lerp(grip[0], rest[0], easeOut(back)) + 12 * spring(t, 1.76, 10, 20), lerp(grip[1], rest[1], easeOut(back))] : null;
      const wind = seg(t, 0, .2) * (1 - seg(t, .2, .3));
      const hand = snap || (t < .2 ? [rest[0] - 8 * wind * u / 11, rest[1] + 10 * wind] : reachT);
      const recoil = spring(t, 1.76, 9, 16);
      RIG_C.qwik(sx, y, u, { ...boltFeel('determined', t), handR: hand, gripR: held ? 'grab' : back > 0 && t < 1.9 ? 'open' : t > .2 && t < 1.9 ? 'grab' : 'fist', holdR: held ? box(2.8, COL.box, [1.15, 0]) : null,
        bendR: .15, aL: .7 + .45 * out * (1 - back) + .15 * tug, bendL: .35 - .2 * tug, lean: -.05 - .14 * (held ? 1 : out) * (1 - back) - .05 * tug + .06 * recoil - .05 * wind,
        legSpread: 1.25, dx: -.5 * out * (1 - back), seed: 5 });
    }
    {
      const [x, y] = cell(2, 1), k = frac(t), hop = jump(k, .2, .72, 3.2), lag = jump(frac(t - .07), .2, .72, 3.2);
      const bw = 8 * u, bh = 5 * u, cx = x - 1.4 * u, cy = y - (26.6 - lag.dy) * u + lag.sq * 3 * u;
      paint(rrPts(cx - bw / 2, cy - bh / 2, bw, bh, .4 * u), { wash: COL.box, ink: PAL.ink, sw: .8 });
      paint(rrPts(cx - bw / 2 + .4 * u, cy - bh / 2 + .4 * u, bw - .8 * u, .6 * u, .2 * u), { wash: '#FFF1B8', ink: null });
      RIG_C.qwik(x, y, u, { ...boltFeel('excited', t), dy: hop.dy, sq: hop.sq, handL: [cx - bw / 2 - .2 * u, cy], handR: [cx + bw / 2 + .2 * u, cy], gripL: 'open', gripR: 'open', bendL: .35, bendR: .35, seed: 6 });
    }
  };
  LOOPS.rigC.len = 2;

  LOOPS.rigCTest = t => {
    const u = 11, gy = [470, 985];
    gy.forEach(g => floor(g));
    const at = (i, r) => [240 + i * 480, gy[r]];
    RIG_C.qwik(...at(0, 0), u, { ...boltFeel('happy', t), flip: true, aR: 1.2 + .3 * Math.sin(TAU * 2 * t), gripR: 'wave', seed: 11 });
    RIG_C.qwik(...at(1, 0), u, { ...boltFeel('determined', t), walk: t * 1.5, run: true, aL: undefined, aR: undefined, seed: 12 });
    RIG_C.qwik(...at(2, 0), u, { ...boltFeel('happy', t), walk: t, dir: -1, aL: undefined, aR: undefined, seed: 13 });
    RIG_C.qwik(...at(3, 0), u, { ...boltFeel('excited', t), aR: .15, lenR: 2.5 + 1.5 * Math.sin(TAU * t / 2), gripR: 'point', aL: .8, seed: 14 });
    const J = jump(t, .3, 1.3, 7);
    RIG_C.qwik(...at(0, 1), u, { ...boltFeel('excited', t), dy: J.dy, sq: J.sq, aL: 1.2, aR: 1.3, gripL: 'wave', gripR: 'wave', seed: 15 });
    RIG_C.qwik(...at(1, 1), u, { ...boltFeel('happy', t), turnX: .55 + .45 * Math.cos(TAU * t / 2), seed: 16 });
    RIG_C.qwik(...at(2, 1), u, { ...boltFeel('scared', t), lean: -.3, sx: .9, sy: 1.1, aL: 1.3, aR: 1.4, gripL: 'open', gripR: 'open', seed: 17 });
    camBegin(1680, 820, 2.2);
    RIG_C.qwik(1680, 900, 6, { ...boltFeel('happy', t), gripR: 'thumb', aR: .9, seed: 18 });
    camEnd();
  };
  LOOPS.rigCTest.len = 2;

  LOOPS.rigCHero = t => {
    const u = 26, x = 920, y = 960, pump = pulse(t, 5);
    floor(y, 200, 1720);
    const bp = t / BEAT, beat = Math.floor(bp), f = bp - beat, hit = Math.exp(-f * 7) * Math.cos(f * 12), shift = Math.sin(TAU * t / 2);
    const mood = boltFeel('happy', t);
    RIG_C.qwik(x, y, u, { ...mood, dy: mood.dy * .55, eyes: 'wink', mouth: 'grin', handAtL: [-6.2, -3.1 + .15 * hit], gripL: 'fist', bendL: -1,
      aR: .72 + .22 * hit, bendR: -.2 + .35 * hit, gripR: 'thumb', legSpread: 1.12, dx: .35 * shift, rot: .03 * shift, seed: 7 });
  };
  LOOPS.rigCHero.len = 2;
})();
