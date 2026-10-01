(() => {
  const COL = {
    limb: '#5B3CC6', limbHi: '#8D73F0',
    glove: '#2BB4F4', gloveDk: '#1B80C2',
    cuff: '#FFFBF4',
    shoe: '#FFD447', shoeDk: '#E8962E',
    box: '#FFD447', boxHi: '#FFF1B8',
  };
  const TIP_H = 6.7, TIP_X = 2.1, SLACK = 1.3, HOVER = 1.4;
  const SHOULDER = [[-6.85, -6.75], [-.8, -6.55]], SHOULDER_LOW = [[-5.1, -4.95], [-.5, -4.55]];
  const HIP = [[-1.3, -1.6], [-.55, -1.5]];
  const ARM_LEN = 7.4, REST_A = -1.1, FOOT_X = 2.4, LEG_BOW = 1.04;
  const ANKLE_H = .85, HAND = 1.2, FOOT = 1.18;
  const ARM_W = [1.56, .82], LEG_W = [1.78, 1.0];
  const KINK_GAP = 5.5, SAG_MAX = 5, LIGHT = [.6, -.8];
  const GAIT = {
    walk: { duty: .56, travel: 11, lift: 1.9, bob: .5, rock: .05, base: -1.02, arm: .34, lag: .07, bend0: -.2, bendAmp: .42 },
    run: { duty: .34, travel: 17, lift: 3.4, bob: 1.1, rock: .06, base: -.62, arm: .5, lag: .09, bend0: .55, bendAmp: .45, peak: .6 },
  };

  const legRest = s => {
    const hx = TIP_X + HIP[s][0], hy = -(TIP_H - HIP[s][1]), fx = (s ? 1 : -1) * FOOT_X, fy = -ANKLE_H;
    return Math.hypot(fx - hx, fy - hy) * LEG_BOW;
  };

  function bodyMap(bx, by, u, o, sq, rot) {
    const c = Math.cos(rot), s = Math.sin(rot), turn = o.turnX ?? 1;
    const fx = (o.flip ? -1 : 1) * (o.sx ?? 1) * (1 + sq * .6), fy = (o.sy ?? 1) * (1 - sq);
    const map = (px, py) => {
      if (turn !== 1) px = BODY_CX + (px - BODY_CX) * turn;
      const qx = px * u * fx, qy = py * u * fy;
      return [bx + qx * c - qy * s, by + qx * s + qy * c];
    };
    map.inv = (wx, wy) => {
      const dx = wx - bx, dy = wy - by, px = (dx * c + dy * s) / (u * fx), py = (-dx * s + dy * c) / (u * fy);
      return [turn !== 1 ? BODY_CX + (px - BODY_CX) / turn : px, py];
    };
    return map;
  }

  function step(ph, gait) {
    const q = frac(ph), S = gait.travel * gait.duty;
    if (q < gait.duty) return { off: S / 2 - S * q / gait.duty, lift: 0, tilt: 0 };
    const k = (q - gait.duty) / (1 - gait.duty);
    return { off: -S / 2 + gait.travel * (ease(k) - (1 - gait.duty) * k), lift: gait.lift * Math.sin(Math.PI * Math.pow(k, gait.peak ?? .8)), tilt: .5 * Math.sin(TAU * k) };
  }

  const rot2 = ([x, y], a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
  const norm = ([x, y]) => { const d = Math.hypot(x, y) || 1; return [x / d, y / d]; };
  const quad = (A, C, B, s) => { const m = 1 - s; return [m * m * A[0] + 2 * m * s * C[0] + s * s * B[0], m * m * A[1] + 2 * m * s * C[1] + s * s * B[1]]; };
  const quadPath = (A, C, B) => Array.from({ length: 33 }, (_, i) => quad(A, C, B, i / 32));
  const cubicPath = (A, C, D, B) => Array.from({ length: 41 }, (_, i) => { const t = i / 40, m = 1 - t; return [0, 1].map(k => m * m * m * A[k] + 3 * m * m * t * C[k] + 3 * m * t * t * D[k] + t * t * t * B[k]); });
  const pathLen = P => { let L = 0; for (let i = 1; i < P.length; i++) L += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); return L; };
  const endAngle = P => { const p = P[P.length - 2], q = P[P.length - 1]; return Math.atan2(q[1] - p[1], q[0] - p[0]); };
  const tangentAt = (P, i) => norm([P[Math.min(P.length - 1, i + 1)][0] - P[Math.max(0, i - 1)][0], P[Math.min(P.length - 1, i + 1)][1] - P[Math.max(0, i - 1)][1]]);
  const zigzag = x => Math.asin(.992 * Math.sin(Math.PI * x)) / Math.asin(.992);

  function resamplePath(P, n) {
    const cum = [0];
    for (let i = 1; i < P.length; i++) cum.push(cum[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
    const total = cum[cum.length - 1], out = [];
    for (let k = 0, j = 0; k <= n; k++) {
      const at = total * k / n;
      while (j < P.length - 2 && cum[j + 1] < at) j++;
      const f = clamp((at - cum[j]) / ((cum[j + 1] - cum[j]) || 1));
      out.push([lerp(P[j][0], P[j + 1][0], f), lerp(P[j][1], P[j + 1][1], f)]);
    }
    return out;
  }

  const zoomOf = () => CAM ? CAM.zoom : 1;
  const textured = u => u * zoomOf() >= 15;
  const tex = (u, fill, op) => textured(u) ? { fill, fillOp: op, bleed: .03, tex: .5, border: .5 } : {};
  const kinkAmp = r => clamp((r - 1.6) / 1.6) * (1.1 + .14 * Math.sqrt(Math.max(0, r - 3)));
  const kinkGap = r => KINK_GAP * (1 + .06 * Math.max(0, r - 4));

  function limbHighlight(Z, n, width) {
    let lean = 0;
    for (let i = 0; i <= n; i += 3) { const t = tangentAt(Z, i); lean += -t[1] * LIGHT[0] + t[0] * LIGHT[1]; }
    const side = lean >= 0 ? 1 : -1, i0 = Math.round(n * .16), i1 = Math.round(n * .8), A = [], B = [];
    for (let i = i0; i <= i1; i++) {
      const t = tangentAt(Z, i), w = width(i) / 2, k = Math.pow(Math.max(0, Math.sin(Math.PI * (i - i0) / (i1 - i0))), .7);
      const inner = side * w * .3, outer = side * w * (.3 + .32 * k);
      A.push([Z[i][0] - t[1] * outer, Z[i][1] + t[0] * outer]); B.push([Z[i][0] - t[1] * inner, Z[i][1] + t[0] * inner]);
    }
    paint(A.concat(B.reverse()), { wash: COL.limbHi, washOp: 215, ink: null });
  }

  function drawLimb(base, rest, w0, w1, col, u, sw, seed = 0) {
    const total = pathLen(base);
    if (total < .05 * u || w0 < .05 * u) return;
    const r = total / rest, amp = kinkAmp(r) * u, gap = kinkGap(r) * u;
    const n = Math.ceil(clamp(total / (.25 * u), 24, amp > 0 ? Math.max(240, total / gap * 12) : 240)), wob = [jit(.05 * u), jit(.05 * u)];
    const C = resamplePath(base, n).map((p, i) => { const k = Math.sin(Math.PI * i / n); return [p[0] + wob[0] * k, p[1] + wob[1] * k]; });
    const knot = j => (j + .32 * (hash(j * 7.3 + seed) - .5)) * gap;
    const Z = amp < .02 * u ? C : C.map((p, i) => {
      const s = total * i / n;
      let j = Math.floor(s / gap);
      if (s < knot(j)) j--; else if (s >= knot(j + 1)) j++;
      const ph = j + (s - knot(j)) / (knot(j + 1) - knot(j));
      const off = amp * (.8 + .4 * hash(j * 3.1 + seed + 5)) * zigzag(ph) * ease(s / (1.3 * u)) * ease((total - s) / (1.7 * u)), t = tangentAt(C, i);
      return [p[0] - t[1] * off, p[1] + t[0] * off];
    });
    const thin = r > 1 ? Math.pow(r, -.4) : 1, z = zoomOf();
    const a = Math.max(Math.min(w0, Math.max(.7 * u, 11 / z)), w0 * thin), b = Math.max(Math.min(w1, Math.max(.56 * u, 8 / z)), w1 * thin);
    const width = i => lerp(a, b, Math.pow(i / n, .85));
    const Ls = [], Rs = [];
    Z.forEach((p, i) => { const t = tangentAt(Z, i), w = width(i) / 2; Ls.push([p[0] - t[1] * w, p[1] + t[0] * w]); Rs.push([p[0] + t[1] * w, p[1] - t[0] * w]); });

    const poly = Ls.concat(Rs.slice().reverse()), xs = poly.map(q => q[0]), ys = poly.map(q => q[1]);
    const extent = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) * z;
    if (extent < 1400) paint(poly, { wash: col, ...tex(u, mixCol(col, PAL.ink, .4), 50), ink: PAL.ink, sw: sw * .85 });
    else {
      const per = 24;
      for (let i = 0; i < n; i += per) { const j = Math.min(n, i + per + 1); paint(Ls.slice(i, j + 1).concat(Rs.slice(i, j + 1).reverse()), { wash: col, ink: null }); }
      for (const side of [Ls, Rs]) for (let i = 0; i < n; i += per) inkLine(side.slice(i, Math.min(n, i + per) + 1), sw * .85, PAL.ink, 'inkflat', .3);
      inkLine([Ls[0], Z[0], Rs[0]], sw * .85, PAL.ink, 'inkflat', .5);
      inkLine([Ls[n], Z[n], Rs[n]], sw * .85, PAL.ink, 'inkflat', .5);
    }
    if (textured(u) && extent < 1400 && amp < .3 * u) limbHighlight(Z, n, width);

    if (amp > .6 * u) {
      const corners = Math.max(1, Math.floor(total / gap - .5) + 1), chance = Math.min(.4, 5 / corners);
      for (let j = 0; j < corners; j++) {
        const s = (knot(j) + knot(j + 1)) / 2;
        if (s > total - 1.6 * u) break;
        if (random() > chance) continue;
        const i = Math.round(s / total * n), t = tangentAt(C, i), side = j % 2 ? -1 : 1, d = amp + .9 * u;
        spark(C[i][0] - t[1] * side * d, C[i][1] + t[0] * side * d, u * (1.05 + .35 * random()), Math.atan2(t[0] * side, -t[1] * side) + jit(.4), sw);
      }
    }
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
  const CUFF = [[.66, -.64], [.66, .64], [.1, .86], [-.3, .98], [-.36, .5], [-.38, 0], [-.36, -.5], [-.3, -.98], [.1, -.86]];
  const CUFF_ZAP = [[.3, -.62], [.08, -.22], [.32, .1], [.1, .5]];

  function glove(grip, u, sw, hook, upright) {
    const shape = GRIPS[grip] || GRIPS.open, k = u * HAND, P = pts => pts.map(([a, b]) => [a * k + jit(.03 * u), b * k + jit(.03 * u)]);
    paint(P(shape.back), { wash: COL.glove, ...tex(u, COL.gloveDk, 45), ink: PAL.ink, sw: sw * .8, curv: shape.curv ?? .45 });
    if (!shape.front) shape.lines.forEach(l => inkLine(P(l), sw * .45, PAL.ink, 'inkfine', .5));
    if (hook) { push(); translate(shape.hold[0] * k, shape.hold[1] * k); hook(u, sw, upright); pop(); }
    if (shape.front) {
      paint(P(shape.front), { wash: COL.glove, ...tex(u, COL.gloveDk, 45), ink: PAL.ink, sw: sw * .8, curv: .45 });
      shape.lines.forEach(l => inkLine(P(l), sw * .45, PAL.ink, 'inkfine', .5));
    }
    paint(P(CUFF), { wash: COL.cuff, ink: PAL.ink, sw: sw * .7, curv: .3 });
    if (textured(u)) inkLine(P(CUFF_ZAP), sw * .4, mixCol(COL.cuff, PAL.ink, .45), 'inkfine', 0);
  }

  function sparkShoe(back, heel, spike, collar, toe, front, dip) {
    const c = [.55, -.62], arc = (A, B, k, n = 6) => { const M = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2], Q = [lerp(M[0], c[0], k), lerp(M[1], c[1], k)]; return Array.from({ length: n }, (_, i) => quad(A, Q, B, i / n)); };
    return [...arc(back, heel, dip[0]), ...arc(heel, spike, dip[1]), ...arc(spike, collar, dip[2]), ...arc(collar, toe, dip[3]), ...arc(toe, front, dip[4]), ...arc(front, back, 0, 4)];
  }
  function zigzagSole(P, h, tooth = .78, peak = .22) {
    const below = q => q[1] > -h, n = P.length, start = P.findIndex(q => !below(q)), Q = [];
    for (let k = 0; k < n; k++) Q.push(P[(start + k) % n]);
    const cross = (a, b) => [lerp(a[0], b[0], (-h - a[1]) / (b[1] - a[1])), -h];
    const run = [];
    for (let k = 0; k < n; k++) {
      const a = Q[k], b = Q[(k + 1) % n];
      if (below(a) !== below(b)) run.push(cross(a, b));
      if (below(b)) run.push(b);
    }
    if (run.length < 3) return [];
    const from = run[run.length - 1], to = run[0], teeth = Math.max(1, Math.round(Math.abs(to[0] - from[0]) / tooth)), zig = [];
    for (let k = 1; k < 2 * teeth; k++) zig.push([lerp(from[0], to[0], k / (2 * teeth)), -h - (k % 2 ? peak : 0)]);
    return [...run, ...zig];
  }
  const SHOE = sparkShoe([-.85, 0], [-1.45, -.5], [-1.3, -2.25], [.45, -1.25], [3.2, -1.35], [2.25, 0], [.25, .62, .2, .45, .35]);
  const SOLE = zigzagSole(SHOE, .32), SHOE_ZAP = [[.9, -.62], [1.45, -.86], [1.55, -.6], [2.15, -.82]];

  function shoe(u, sw) {
    const k = u * FOOT, P = pts => pts.map(([a, b]) => [a * k + jit(.03 * u), b * k + jit(.03 * u)]);
    paint(P(SHOE), { wash: COL.shoe, ...tex(u, COL.shoeDk, 40), ink: null, curv: .25 });
    paint(P(SOLE), { wash: COL.shoeDk, ink: null });
    paint(P(SHOE), { ink: PAL.ink, sw: sw * .8, curv: .25 });
    if (textured(u)) inkLine(P(SHOE_ZAP), sw * .55, COL.shoeDk, 'ink', 0);
  }

  const restBend = a => .3 * Math.tanh(2 * (a + .7));

  function walkArms(p, run) {
    const g = run ? GAIT.run : GAIT.walk, ph = TAU * (p - g.lag), up = Math.cos(ph), vel = -Math.sin(ph);
    return { aL: g.base - .04 - g.arm * up, aR: g.base + g.arm * up, bendL: g.bend0 + g.bendAmp * vel, bendR: g.bend0 - g.bendAmp * vel };
  }

  function drawBody(x, y, u, o) {
    if (!o.noFace) return bolt(x, y, u, o);
    const eyesFlat = eyes;
    eyes = () => {};
    try { bolt(x, y, u, { ...o, mouth: null, blush: 0, gloom: 0, brows: null, shades: null, mustache: false, hands: null, thumbs: null, lasers: 0, sob: null, emote: null }); }
    finally { eyes = eyesFlat; }
  }

  function qwik(x, y, u, o = {}) {
    const id = o.boilKey ?? ++CLAWD_N, rs = part => boilSeed(`rigC ${id} ${part}`);
    const flip = o.flip ? -1 : 1, heading = o.dir ?? flip, sq = (o.sq || 0) + (o.take || 0), sw = clamp(u / 15, .45, 2.4) * (o.swMul || 1);
    const walking = o.walk != null, stride = walking ? clamp(o.stride ?? 1) : 0, gait = o.run ? GAIT.run : GAIT.walk, p = walking ? o.walk : 0;
    const spread = o.legSpread ?? 1, legLen = Math.max(0, o.legLen ?? 1), grown = Math.min(1, legLen);

    const steps = [step(p, gait), step(p + .5, gait)];
    const bob = stride * gait.bob * -Math.cos(4 * Math.PI * (p - .08));
    const slack = SLACK + 2 * stride, lift = -(o.dy || 0) + bob, over = lift - slack, air = over > 0 ? lift - slack * Math.exp(-over / .8) + .9 * (1 - Math.exp(-over / .6)) : 0;
    const tipH = lerp(HOVER, TIP_H, legLen) * (1 - sq * .8) + lift;
    const lean = (o.lean || 0) + (o.rot || 0) + stride * heading * ((o.run ? .16 : .07) + gait.rock * Math.sin(TAU * (p - .1)));
    const bx = x + (lerp(-BODY_CX, TIP_X, grown) * flip + (o.dx || 0)) * u, by = y - tipH * u;
    const toWorld = bodyMap(bx, by, u, o, sq, lean);
    const local = s => flip > 0 ? s : 1 - s, near = o.legFront ? (o.legFront === 'L' ? 0 : 1) : heading > 0 ? 1 : 0;

    const legs = [0, 1].map(s => {
      const sd = s ? 1 : -1, side = s ? 'R' : 'L', st = steps[s], hip = HIP[local(s)], mid = (HIP[0][0] + HIP[1][0]) / 2;
      const H = toWorld(lerp(hip[0], mid, .8 * stride), hip[1]), shift = o['step' + side] || [0, 0];
      const ground = [x + (sd * FOOT_X * spread * (1 - stride) + stride * st.off * heading + shift[0]) * u, y - (air + stride * st.lift - shift[1]) * u];
      const at = [lerp(H[0], ground[0], grown), lerp(H[1] + ANKLE_H * u, ground[1], grown)];
      const dir = lerp(sd, heading, stride), fdir = Math.sign(dir || 1), toe = clamp(o['toe' + side] || 0) * .5 * grown;
      let K = [at[0], at[1] - ANKLE_H * u];
      if (toe > 0) { const heel = [at[0] - .85 * FOOT * u * fdir, at[1]], v = rot2([K[0] - heel[0], K[1] - heel[1]], -toe * fdir); K = [heel[0] + v[0], heel[1] + v[1]]; }
      const cx = K[0] - H[0], cy = K[1] - H[1], c = Math.hypot(cx, cy) || 1e-3, L0 = legRest(local(s)) * u * Math.max(legLen, .01);
      const perp = [-cy / c, cx / c], toward = perp[0] * lerp(sd, heading, stride);
      const sag = Math.max(.45 * u * grown, c < L0 ? Math.sqrt(3 * c * (L0 - c) / 8) : 0);
      const C = [(H[0] + K[0]) / 2 + perp[0] * 2 * sag * toward, (H[1] + K[1]) / 2 + perp[1] * 2 * sag * toward];
      return { s, H, K, C, L0, at, foot: fdir * Math.max(.4, Math.abs(dir)), tilt: stride * st.tilt * heading - toe * fdir, size: clamp(legLen / .3) };
    });

    window.__dbgC = legs;
    rs('shadow');
    if (!o.noShadow) {
      const span = Math.abs(legs[1].at[0] - legs[0].at[0]) / 2 + 2.6 * u, k = 1 - Math.min(.5, (air + (1 - grown) * HOVER) * .12);
      const cx = lerp(x + (o.dx || 0) * u, (legs[0].at[0] + legs[1].at[0]) / 2, grown);
      paint(ellPts(cx, y + .1 * u, lerp(4.6 * u, span, grown) * k, .8 * u * k, 22), { fill: PAL.ink, fillOp: 70, bleed: .25, tex: .3, border: .1, ink: null });
    }

    const arms = [0, 1].map(s => {
      const K = s ? 'R' : 'L', sd = s ? 1 : -1;
      const at = o['handAt' + K], target = at ? toWorld(...at) : o['hand' + K], via = o['via' + K]?.length ? o['via' + K] : null;
      const crossing = target && !at && !via ? -sd * (target[0] - toWorld(BODY_CX, BODY_CY)[0]) / u - 2 : -1;
      const across = crossing > 0, low = across ? ease(clamp(crossing / 2.5)) : 0;
      const S = toWorld(...[0, 1].map(k => lerp(SHOULDER[local(s)][k], SHOULDER_LOW[local(s)][k], low)));
      const len = Math.max(0, o['len' + K] ?? 1), rest = ARM_LEN * Math.max(len, .01) * u, grow = clamp(len / .35);
      const grip = o['grip' + K] || 'open', hold = (GRIPS[grip] || GRIPS.open).hold, holdV = [hold[0] * u * HAND * grow, hold[1] * u * HAND * grow * sd];
      let a = o['a' + K], bend = o['bend' + K], B;
      const underFace = W => {
        const Sl = toWorld.inv(...S), Wl = toWorld.inv(...W), cub = yb => cubicPath(Sl, [lerp(Sl[0], Wl[0], .25), yb], [lerp(Sl[0], Wl[0], .7), yb], Wl);
        let yb = Math.max(Sl[1], Wl[1]) + .6, P = cub(yb);
        for (let k = 0; k < 4; k++) {
          const dip = Math.max(0, ...P.filter(q => q[0] > FACE.x - 2.8 && q[0] < FACE.x + 2.3).map(q => -4.6 - q[1]));
          if (dip < .02) break;
          yb = Math.min(yb + dip * 1.6, Math.max(Sl[1], Wl[1]) + 5); P = cub(yb);
        }
        return P.map(q => toWorld(...q));
      };
      const pathTo = W => {
        if (via) return through([S, ...via, W], 10);
        if (across) return underFace(W);
        const c = Math.hypot(W[0] - S[0], W[1] - S[1]) || 1e-3, d = [(W[0] - S[0]) / c, (W[1] - S[1]) / c], n = [-sd * d[1], sd * d[0]];
        const curl = target && c < rest ? Math.sqrt(3 * c * (rest - c) / 8) : 0;
        const sag = Math.sign(bend || restBend(a) || 1) * Math.min(SAG_MAX * u, Math.max(Math.abs(bend) * .28 * c, curl));
        return quadPath(S, [(S[0] + W[0]) / 2 + n[0] * 2 * sag, (S[1] + W[1]) / 2 + n[1] * 2 * sag], W);
      };
      if (target) {
        const aim = via ? via[0] : target, d = norm([aim[0] - S[0], aim[1] - S[1]]);
        a = Math.atan2(-d[1], sd * d[0]);
        if (bend == null) bend = restBend(a);
        B = target;
        for (let i = 0; i < 3; i++) { const off = rot2(holdV, endAngle(pathTo(B))); B = [target[0] - off[0], target[1] - off[1]]; }
      } else {
        const swing = walking ? walkArms(p, o.run) : null;
        if (a == null) a = swing ? lerp(REST_A, swing['a' + K], stride) : REST_A;
        if (bend == null) bend = swing ? lerp(restBend(REST_A), swing['bend' + K], stride) : restBend(a);
        const d = rot2([sd * Math.cos(a), -Math.sin(a)], lean * (swing ? .4 : 1)), chord = rest / (1 + 8 / 3 * (.28 * bend) ** 2);
        B = [S[0] + d[0] * chord, S[1] + d[1] * chord];
      }
      const path = pathTo(B), ang = endAngle(path), off = rot2(holdV, ang);
      const front = o['front' + K] ?? across, handFront = front || (o['handFront' + K] ?? !!at);
      return { K, sd, S, B, path, ang, grip, grow, front, handFront, hook: o['hold' + K], thick: clamp(len / .25), palm: [B[0] + off[0], B[1] + off[1]] };
    });

    const drawArm = A => {
      rs('arm' + A.K);
      if (A.front) paint(ellPts(A.S[0], A.S[1], ARM_W[0] * u * .62 * A.thick, ARM_W[0] * u * .62 * A.thick, 14), { wash: COL.limb, ink: PAL.ink, sw: sw * .85 });
      drawLimb(A.path, ARM_LEN * u, ARM_W[0] * u * A.thick, ARM_W[1] * u * A.thick, COL.limb, u, sw, A.sd > 0 ? 11 : 3);
    };
    const drawHand = A => {
      if (A.grow < .02) return;
      rs('hand' + A.K);
      push(); translate(A.B[0], A.B[1]); rotate(A.ang); if (A.sd < 0) scale(1, -1); scale(A.grow);
      const upright = () => { scale(1 / A.grow); if (A.sd < 0) scale(1, -1); rotate(-A.ang); };
      glove(A.grip, u, sw, A.hook, upright);
      pop();
    };

    if (!o.noLimbs) {
      (near ? legs : legs.slice().reverse()).forEach(Lg => {
        if (Lg.size < .02) return;
        rs('leg' + Lg.s);
        const col = Lg.s !== near && stride > 0 ? mixCol(COL.limb, PAL.ink, .2 * stride) : COL.limb, thick = clamp(legLen / .2);
        drawLimb(quadPath(Lg.H, Lg.C, Lg.K), Lg.L0, LEG_W[0] * u * thick, LEG_W[1] * u * thick, col, u, sw, 20 + Lg.s);
        push(); translate(Lg.K[0], Lg.K[1]); rotate(Lg.tilt); translate(0, ANKLE_H * u); scale(Lg.foot * Lg.size, Lg.size);
        shoe(u, sw);
        pop();
      });
      arms.filter(A => !A.front).forEach(A => { drawArm(A); if (!A.handFront) drawHand(A); });
    }

    const hover = HOVER * (1 - grown);
    drawBody(bx + BODY_CX * u, by + hover * u, u, { ...o, dx: 0, dy: 0, hover, sq, take: 0, rot: lean, noShadow: true, boilKey: id });

    if (!o.noLimbs) arms.forEach(A => { if (A.front) drawArm(A); if (A.handFront) drawHand(A); });
    rs('after');

    return {
      handL: arms[0].palm, handR: arms[1].palm, shoulderL: arms[0].S, shoulderR: arms[1].S, face: toWorld(FACE.x, FACE.y), top: toWorld(BOLT[1][0], BOLT[1][1]),
      feet: legs.map(Lg => Lg.at), armPathL: resamplePath(arms[0].path, 24), armPathR: resamplePath(arms[1].path, 24),
    };
  }

  function stroll(t, t0, t1, x0, x1, u, run = false) {
    const x = lerp(x0, x1, ease(seg(t, t0 + .1, t1 - .1))), moving = t > t0 && t < t1;
    const skipIn = jump(t, t0 + .05, t0 + .33, 2.2), skipOut = jump(t, t1 - .33, t1 - .05, 2.2);
    const stride = Math.min(ease(seg(t, t0 + .11, t0 + .27)), 1 - ease(seg(t, t1 - .27, t1 - .11)));
    return { x, walk: moving ? Math.abs(x - x0) / ((run ? GAIT.run : GAIT.walk).travel * u) : null, dir: x1 < x0 ? -1 : 1, stride,
      dy: skipIn.dy + skipOut.dy, sq: skipIn.sq + skipOut.sq, run };
  }

  const box = (s, col = COL.box, off = [0, 0]) => (u, sw, upright) => {
    if (upright) upright();
    translate(off[0] * u, off[1] * u);
    paint(rrPts(-s * u / 2, -s * u / 2, s * u, s * u, .22 * u), { wash: col, ink: PAL.ink, sw: sw * .8 });
    paint(rrPts(-s * u / 2 + .25 * u, -s * u / 2 + .25 * u, s * u - .5 * u, .35 * u, .12 * u), { wash: COL.boxHi, ink: null });
  };

  function heroPose(t, over = {}) {
    const bp = bpOf(t), f = frac(bp), pump = Math.exp(-f * 6) * Math.cos(f * 10), sway = Math.sin(TAU * t / 2), tap = Math.max(0, Math.sin(TAU * bp - .3));
    const mood = boltFeel('happy', t);
    return { ...mood, dy: mood.dy * .5, sq: mood.sq * .8, eyes: 'wink', mouth: 'grin', blush: .45,
      aR: .82 + .16 * pump, bendR: -.32 + .3 * pump, gripR: 'thumb', lenR: 1.02,
      aL: -.12 + .05 * Math.sin(TAU * t / 2 + .8) + .05 * Math.exp(-frac(bp + .5) * 6), bendL: .32 + .06 * sway, gripL: 'wave', lenL: .96,
      toeR: tap * .9, stepR: [.8, 0], stepL: [-.2, 0], rot: -.035 + .02 * sway, dx: .1 + .22 * sway, seed: 7, ...over };
  }

  function coolPose(t, over = {}) {
    const bp = bpOf(t), nod = Math.exp(-frac(bp) * 5);
    return { ...boltFeel('cool', t), legFront: 'L', stepL: [1.6, 0], stepR: [.1, 0], toeL: .5 + .3 * nod, lean: .1 + .02 * nod,
      handAtL: [-6.2, -3.4], gripL: 'fist', bendL: -1, aR: -.55 + .05 * nod, bendR: .45, gripR: 'open', ...over };
  }

  window.RIG_C = { qwik, walkArms, stroll, box, heroPose, coolPose, COL, STRIDE: GAIT.walk.travel, RUN_STRIDE: GAIT.run.travel, ARM_LEN };

  const floor = (y, x0 = 0, x1 = W) => inkLine([[x0 + 40, y + 6], [(x0 + x1) / 2, y + 4], [x1 - 40, y + 7]], .6, mixCol(PAL.paper, PAL.ink, .35), 'inkfine', .5);

  LOOPS.rigC = t => {
    const u = 11, cw = W / 3, gy = [470, 985], bp = bpOf(t);
    gy.forEach(g => floor(g));
    const cell = (c, r) => [cw * (c + .5), gy[r]];

    {
      const [x, y] = cell(0, 0), sway = Math.sin(TAU * t / 2), trail = Math.sin(TAU * bp - 1.2), trail2 = Math.sin(TAU * bp - 1.7);
      qwik(x, y, u, { ...boltFeel('happy', t), aL: -1.14 + .07 * Math.sin(TAU * t / 2 + .4) + .05 * trail, aR: -1.02 + .08 * Math.sin(TAU * t / 2 + 2.2) + .05 * trail2,
        bendL: -.36 - .16 * trail, bendR: -.28 - .14 * trail2, dx: .35 * sway, rot: .03 * Math.sin(TAU * t / 2 - .6), toeR: Math.max(0, Math.sin(TAU * bp)) * .7, seed: 1 });
    }
    {
      const [x, y] = cell(1, 0), p = t;
      for (let i = 0; i < 9; i++) {
        const tx = x - 260 + frac(i / 9 - p * GAIT.walk.travel * u / 520) * 520;
        inkLine([[tx, y + 14], [tx + 14, y + 14]], .8, mixCol(PAL.paper, PAL.ink, .4), 'inkfine', 0);
      }
      qwik(x, y, u, { ...boltFeel('happy', t), walk: p, aL: undefined, aR: undefined, lookX: .45, seed: 2 });
    }
    {
      const [x, y] = cell(2, 0), w = TAU * 2 * t;
      qwik(x, y, u, { ...boltFeel('happy', t), aR: 1.18 + .26 * Math.sin(w), bendR: -.12 - .42 * Math.sin(w - 1.3), gripR: 'wave', lenR: 1.05,
        aL: -1.12 + .05 * Math.sin(w * .5), bendL: -.3, rot: .05 + .015 * Math.sin(w), dx: .25, seed: 3 });
    }
    {
      const [x, y] = cell(0, 1), jab = Math.exp(-frac(bp) * 7);
      paint(starPts(x + 250, y - 150, 22, .45, 5, -Math.PI / 2 + .2 * Math.sin(TAU * t)), { wash: PAL.ochre, ink: PAL.ink, sw: .8 });
      qwik(x - 40, y, u, { ...boltFeel('happy', t), eyes: 'look', mouth: 'smile', lookX: 1, lookY: -.35, aR: .28 + .05 * jab, bendR: .08 - .1 * jab, lenR: 1.02 + .08 * jab, gripR: 'point',
        handAtL: [-5.9, -3.3], gripL: 'fist', bendL: -.9, rot: .05, legSpread: 1.1, seed: 4 });
    }
    {
      const [x, y] = cell(1, 1), sx = x - 150, bx = x + 222, by = y - 1.7 * u;
      const out = easeOut(seg(t, .2, .42)), back = seg(t, 1.56, 1.76), held = t > .42 && t < 1.56;
      const tug = held ? Math.sin(TAU * 2.5 * (t - .42)) * Math.exp(-(t - .42) * .6) : 0, yank = held ? .5 - .5 * Math.cos(TAU * (t - .42) / 1.2) : 0;
      const boxX = bx - 22 * yank, boxY = by - 3 * Math.abs(tug);
      paint(ellPts(boxX, y + .1 * u, 2 * u * (1 - .3 * yank), .45 * u, 16), { fill: PAL.ink, fillOp: 60 * (1 - .5 * Math.abs(tug)), bleed: .2, tex: .3, border: .1, ink: null });
      if (!held) paint(rrPts(boxX - 1.4 * u, boxY - 1.4 * u, 2.8 * u, 2.8 * u, .22 * u), { wash: COL.box, ink: PAL.ink, sw: .8 });
      if (!held) paint(rrPts(boxX - 1.15 * u, boxY - 1.15 * u, 2.3 * u, .35 * u, .12 * u), { wash: COL.boxHi, ink: null });
      const grip = [boxX - 1.15 * u, boxY], rest = [sx + 5 * u, y - 13 * u], reachT = [lerp(rest[0], grip[0], out), lerp(rest[1], grip[1], out) - 40 * Math.sin(Math.PI * out)];
      const snap = back > 0 ? [lerp(grip[0], rest[0], easeOut(back)) + 12 * spring(t, 1.76, 10, 20), lerp(grip[1], rest[1], easeOut(back))] : null;
      const wind = seg(t, 0, .2) * (1 - seg(t, .2, .3));
      const hand = snap || (t < .2 ? [rest[0] - 8 * wind * u / 11, rest[1] + 10 * wind] : reachT);
      const recoil = spring(t, 1.76, 9, 16);
      qwik(sx, y, u, { ...boltFeel('determined', t), handR: hand, gripR: held ? 'grab' : back > 0 && t < 1.9 ? 'open' : t > .2 && t < 1.9 ? 'grab' : 'fist', holdR: held ? box(2.8, COL.box, [1.15, 0]) : null,
        bendR: .15, aL: .7 + .45 * out * (1 - back) + .15 * tug, bendL: .35 - .2 * tug, lean: -.05 - .14 * (held ? 1 : out) * (1 - back) - .05 * tug + .06 * recoil - .05 * wind,
        legSpread: 1.25, dx: -.5 * out * (1 - back), seed: 5 });
    }
    {
      const [x, y] = cell(2, 1), k = frac(t), hop = jump(k, .2, .72, 3.2), lag = jump(frac(t - .07), .2, .72, 3.2);
      const bw = 8 * u, bh = 5 * u, cx = x - 1.4 * u, cy = y - (26.6 - lag.dy) * u + lag.sq * 3 * u, tilt = .07 * Math.sin(TAU * (k - .3)) - .03;
      const side = sd => [cx + sd * Math.cos(tilt) * (bw / 2 + .2 * u), cy + sd * Math.sin(tilt) * (bw / 2 + .2 * u)];
      push(); translate(cx, cy); rotate(tilt);
      paint(rrPts(-bw / 2, -bh / 2, bw, bh, .4 * u), { wash: COL.box, ink: PAL.ink, sw: .8 });
      paint(rrPts(-bw / 2 + .4 * u, -bh / 2 + .4 * u, bw - .8 * u, .6 * u, .2 * u), { wash: COL.boxHi, ink: null });
      pop();
      qwik(x, y, u, { ...boltFeel('excited', t), dy: hop.dy, sq: hop.sq, handL: side(-1), handR: side(1), gripL: 'open', gripR: 'open', bendL: .4, bendR: .28, seed: 6 });
    }
  };
  LOOPS.rigC.len = 2;

  LOOPS.rigCHero = t => {
    floor(960, 200, 1720);
    qwik(960, 960, 26, heroPose(t));
  };
  LOOPS.rigCHero.len = 2;

  LOOPS.rigCTest = t => {
    const u = 11, gy = [470, 985];
    gy.forEach(g => floor(g));
    const at = (i, r) => [200 + i * 380, gy[r]];
    qwik(...at(0, 0), u, { ...boltFeel('happy', t), flip: true, aR: 1.2 + .3 * Math.sin(TAU * 2 * t), gripR: 'wave', seed: 11 });
    qwik(...at(1, 0), u, { ...boltFeel('determined', t), walk: t * 1.5, run: true, aL: undefined, aR: undefined, seed: 12 });
    qwik(...at(2, 0), u, { ...boltFeel('happy', t), walk: t, flip: true, lookX: .5, aL: undefined, aR: undefined, seed: 13 });
    qwik(...at(3, 0), u, { ...boltFeel('excited', t), aR: .15, lenR: 2.5 + 1.5 * Math.sin(TAU * t / 2), gripR: 'point', aL: .8, seed: 14 });
    const J = jump(t, .3, 1.3, 7);
    qwik(...at(4, 0), u, { ...boltFeel('excited', t), dy: J.dy, sq: J.sq, aL: 1.2, aR: 1.3, gripL: 'wave', gripR: 'wave', seed: 15 });
    qwik(...at(0, 1), u, { ...boltFeel('happy', t), turnX: .55 + .45 * Math.cos(TAU * t / 2), seed: 16 });
    qwik(...at(1, 1), u, { ...boltFeel('thinking', t), handR: [at(1, 1)[0] - 9 * u, gy[1] - (12 + 3 * Math.sin(TAU * t / 2)) * u], gripR: 'point', bendR: .3, seed: 19 });
    qwik(...at(2, 1), u, { ...boltFeel('happy', t), handL: [at(2, 1)[0] + 7 * u, gy[1] - 16 * u], gripL: 'grab', seed: 20 });
    const [lx, ly] = at(3, 1);
    bolt(lx - 60, ly, u, { ...boltFeel('happy', t), boilKey: 'ref' });
    qwik(lx + 90, ly, u, { ...boltFeel('happy', t), legLen: 0, lenL: 0, lenR: 0, boilKey: 'tuck' });
    qwik(...at(4, 1), u, { legLen: .5 + .5 * Math.sin(TAU * t / 2), lenL: 0, lenR: 1, noFace: true, noSpark: true, aR: .5, seed: 21 });
  };
  LOOPS.rigCTest.len = 2;

  LOOPS.rigCStress = t => {
    const u = 20, y = 900;
    floor(y, 100, 1820);
    const legLen = kf(t, [[0, 0], [.3, 0], [.55, 1.3], [.8, .92], [1, 1], [1.6, 1], [1.85, 0]], easeOut);
    const len = kf(t, [[0, 0], [.45, 0], [.7, 2], [.95, 1], [1.5, 1], [1.8, 0]], easeOut);
    qwik(360, y, u, { ...boltFeel('happy', t), legLen, lenL: len, lenR: len, aL: .3, aR: .4, boilKey: 'spring' });
    qwik(860, y, u, { ...boltFeel('excited', t), sx: .4, sy: 1.8, aL: 1.4, aR: 1.45, lenL: 1.3, lenR: 1.3, boilKey: 'thin' });
    const yawn = .5 + .5 * Math.sin(TAU * t / 2);
    qwik(1300, y, u, { ...boltFeel('sleepy', t), mouth: 'yawn', aL: 1.3, aR: 1.2, lenL: 1 + 2 * yawn, lenR: 1 + 2 * yawn, bendL: -.2, bendR: -.25, gripL: 'fist', gripR: 'fist', lean: -.05, boilKey: 'yawn' });
    qwik(1680, y, u, coolPose(t, { boilKey: 'cool' }));
  };
  LOOPS.rigCStress.len = 2;

  LOOPS.rigCDbg = t => {
    [[11, 300, 500], [34, 1200, 1000]].forEach(([u, x, y], i) => {
      floor(y, x - 400, x + 400);
      const k = frac(t), hop = jump(k, .2, .72, 3.2), lag = jump(frac(t - .07), .2, .72, 3.2);
      const bw = 8 * u, bh = 5 * u, cx = x - 1.4 * u, cy = y - (26.6 - lag.dy) * u + lag.sq * 3 * u, tilt = .07 * Math.sin(TAU * (k - .3)) - .03;
      const side = sd => [cx + sd * Math.cos(tilt) * (bw / 2 + .2 * u), cy + sd * Math.sin(tilt) * (bw / 2 + .2 * u)];
      qwik(x, y, u, { ...boltFeel('excited', t), dy: hop.dy, sq: hop.sq, handL: side(-1), handR: side(1), gripL: 'open', gripR: 'open', bendL: .4, bendR: .28, seed: 6, boilKey: 'd' + i });
    });
  };
  LOOPS.rigCDbg.len = 2;

  LOOPS.rigCPoster = t => {
    const u = 20, y = 900, reach = ease(seg(t, .1, 1.1));
    camBegin(3250, 520, .5);
    floor(y, 1300, 5200);
    paint(rrPts(1500, 166, 64, 56, 8), { wash: COL.box, ink: PAL.ink, sw: 1.4 });
    const hand = [lerp(4700, 1540, reach), lerp(y - 14 * u, 194, reach) - 300 * Math.sin(Math.PI * reach)];
    const via = reach > .05 ? [[lerp(4800, 4500, reach), lerp(y - 18 * u, 120, reach)], [lerp(4700, 3000, reach), lerp(y - 16 * u, 80, reach)]] : null;
    qwik(4880, y, u, { ...boltFeel('determined', t), handL: hand, viaL: via, gripL: 'grab', aR: -.4, bendR: .3, lean: .1, legSpread: 1.3, boilKey: 'long' });
    camEnd();
  };
  LOOPS.rigCPoster.len = 2;
})();
