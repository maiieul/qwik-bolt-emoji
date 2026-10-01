(() => {
  const U = 20, [BX, BY] = WORLD.boltDesk, PG = WORLD.page, SHELF = WORLD.shelf;
  const has = f => typeof RIG !== 'undefined' && (RIG.features || []).includes(f);
  const mix2 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
  const add2 = (a, b) => [a[0] + b[0], a[1] + b[1]];
  const sub2 = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const len2 = a => Math.hypot(a[0], a[1]);
  const rot2 = (p, a) => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a)];
  const ramp = (t, a, b, e = ease) => e(seg(t, a, b));
  const hump = (t, a, b) => Math.sin(Math.PI * seg(t, a, b));
  const fade = (t, t0, k) => (t < t0 ? 0 : Math.exp(-k * (t - t0)));
  const bez3 = (a, b, c, d, k) => { const m = 1 - k; return [0, 1].map(i => m * m * m * a[i] + 3 * m * m * k * b[i] + 3 * m * k * k * c[i] + k * k * k * d[i]); };

  function boxTimes(kind) {
    let lift = null, cubby = null;
    for (let t = 44; t < 62; t += 1 / 480) {
      const w = box(kind, t).where;
      if (lift == null && w === 'bolt') lift = t;
      if (w === 'cubby') { cubby = t; break; }
    }
    const end = box(kind, 64), on = box(kind, lift - 1e-3);
    return { kind, grab: lift - .1, lift, cubby, from: [on.x, on.y], bottom: [end.x, end.y] };
  }
  const STAR = boxTimes('star'), CART = boxTimes('cart'), SHARE = boxTimes('share'), GEAR = boxTimes('gear');
  const SHELVED = ['menu', 'heart', 'star', 'cart', 'share', 'gear'].map(k => [k, k === 'menu' || k === 'heart' ? 0 : boxTimes(k).cubby]);

  const IMPACT = 48.083, NERVOUS = 48.4, PFF = 49.78, EXCITE = 50.0;
  const RELEASE = CART.cubby + .06, HIT = RELEASE + .24, POP = 51.5, LAND = POP - .01;
  const THUMB = 53.0, REPLY = [53.22, 53.86], WIPE = 54.0, WAVE = 54.5, GONE = 55.3;
  const FULL = 57.0, SLIDE = [57.3, 57.5], COOL = 57.5, SETTLE = 57.92;

  const BTN = PG.cartBtn, BTN_ICON = [BTN[0] - PG.cartBtnWH[0] * .27, BTN[1]];
  const BADGE = [PG.headerCart[0] + 15, PG.headerCart[1] - 12.5];
  const HEAD_SHADES = { dx: 0, dy: -3.2, rot: -.12, w: 1, h: 1, L: 2.5 }, EYE_SHADES = { dx: 0, dy: 0, rot: 0, w: 1.4, h: 1.25, L: 2.85 };
  const HOME = [[4372, 112], [4440, 106], [4530, 88], [4620, 78], [4710, 110], [4785, 260], [4790, 470]];

  const coolOf = t => (typeof RIG.cool === 'function' ? RIG.cool(t) : RIG.feel('cool', t));

  function camAt(t) {
    const D = CAMS.deskMaster, TWO = [5156, 565, 1.085];
    const keys = [
      [48.0, D], [48.42, D], [49.5, [5085, 566, 1.09]], [50.55, [5075, 562, 1.1]], [50.95, [5150, 566, 1.08]], [RELEASE + .02, TWO],
      [POP + .1, [5745, 442, 2.6]], [52.4, [5760, 437, 2.7]], [53.05, [5330, 566, 1.15]], [54.05, [5300, 568, 1.12]], [54.75, D], [55.35, D],
      [56.2, [5000, 575, 1.05]], [56.8, [5004, 576, 1.056]], [57.85, D], [58.6, D],
    ];
    let i = 1; while (i < keys.length - 1 && t >= keys[i][0]) i++;
    const [t0, a] = keys[i - 1], [t1, b] = keys[i], k = ease(seg(t, t0, t1));
    const c = [lerp(a[0], b[0], k), lerp(a[1], b[1], k), a[2] * Math.pow(b[2] / a[2], k)];
    const [sx, sy] = shakeXY(t, 6 * fade(t, IMPACT, 11) + 3 * fade(t, RELEASE, 14));
    return [c[0] + sx / c[2], c[1] + sy / c[2], c[2]];
  }

  function cubbyLit(t) {
    const lit = {};
    for (const [kind, at] of SHELVED) if (t >= at) lit[kind] = at ? ramp(t, at, at + .12) : 1;
    return lit;
  }

  const SHELF_ORDER = ['heart', 'cart', 'menu', 'star', 'share', 'gear'];
  function shelfBoxes(t) {
    for (const [kind, at] of SHELVED) {
      const b = box(kind, t);
      if (b.where !== 'cubby') continue;
      const i = SHELF_ORDER.indexOf(kind), wave = hump(t, FULL + .07 * i, FULL + .32 + .07 * i), flash = at ? .8 * fade(t, at, 4) : 0;
      const lit = clamp(flash + wave);
      jsBox(b.x, b.y - 10 * wave, 1, kind, { hop: b.hop, wobble: b.wobble, rot: b.rot, squash: (b.squash || 0) - .18 * wave, lit: lit > .02 ? lit : 0, key: 'queue ' + kind });
    }
  }

  function pageAt(t) {
    const lit = ramp(t, CART.cubby, CART.cubby + .12) + .5 * hump(t, HIT - .02, HIT + .3);
    return {
      parts: { header: 1, hero: 1, card: 1, skeleton: 0, reviews: 1, footer: 1 },
      badge: seg(t, POP - .12, POP + .18), liked: 1, cartPress: .65 * hump(t, HIT - .03, HIT + .2), cartLit: clamp(lit, 0, 1.3), t,
    };
  }

  const MOODS = [
    [47.0, 'determined', { mouth: 'teeth' }],
    [NERVOUS, 'nervous', { emote: null }],
    [EXCITE, 'excited'],
    [POP, 'proud'],
    [REPLY[0], 'happy', { eyes: 'normal', mouth: 'grin' }],
    [WIPE, 'relieved'],
    [WAVE + .05, 'happy', { eyes: 'normal' }],
    [COOL, 'cool'],
  ];

  const GAZE = [
    [48.0, [-1, -.75]], [48.12, [-1, -.75]], [48.24, [.8, .45]], [48.5, [.8, .45]], [48.6, [1, .05]], [49.0, [1, .05]],
    [49.08, [-.8, -.55]], [49.3, [-.8, -.55]], [49.37, [-1, -.85]], [50.45, [-1, -.95]], [50.62, [-.9, -.9]], [50.92, [-.6, .2]],
    [51.0, [1, -.05]], [51.28, [1, -.2]], [51.42, [1, -.6]], [52.9, [1, -.5]], [53.05, [1, 0]], [54.55, [1, -.2]], [55.2, [1, -.3]],
    [55.32, [-1, -.85]], [55.9, [-1, -.85]], [56.05, [-.8, .5]], [56.3, [-.95, -.8]], [56.5, [-.6, .5]], [56.95, [-.95, .2]],
  ];

  const tapAt = t => { const f = frac(bpOf(t) * 2); return f > .45 ? Math.sin(Math.PI * (f - .45) / .55) : 0; };

  function bodyAt(t, mood) {
    const b = { sq: 0, dy: 0, rot: 0, lean: 0, dx: 0, legSpread: 1.05, heelL: 0, heelR: 0, liftL: 0, liftR: 0 };
    const brace = 1 - ramp(t, IMPACT + .06, 48.5);
    b.legSpread = lerp(1.05, 1.3, brace); b.rot += .09 * brace; b.dx += -.35 * brace;
    b.sq += t >= IMPACT ? .2 * fade(t, IMPACT, 13) : 0;
    b.rot += .12 * spring(t, IMPACT, 5, 17); b.dx += .6 * spring(t, IMPACT - .02, 4.5, 14);
    const waiting = ramp(t, 48.45, 48.6) * (1 - ramp(t, 49.85, 50.0)), tap = tapAt(t) * waiting;
    b.heelR += -1.05 * tap; b.dy += -.1 * tap; b.dx += .1 * Math.sin(t * TAU * .5) * waiting;
    b.sq += -.12 * spring(t, PFF, 6, 22);
    const reach = ramp(t, 50.1, 50.42) * (1 - ramp(t, 50.6, 50.95));
    b.lean += -.07 * reach; b.dy += -.45 * reach; b.heelL += .5 * reach; b.heelR += .5 * reach;
    const into = ramp(t, 50.6, 50.95) * (1 - ramp(t, 51.0, 51.25));
    b.lean += -.06 * into;
    const fling = ramp(t, RELEASE - .03, RELEASE + .07) * (1 - ramp(t, 51.3, 51.75));
    b.lean += .1 * fling; b.dx += .35 * fling;
    const wind = ramp(t, 50.6, RELEASE - .03) * (1 - ramp(t, RELEASE - .03, RELEASE + .03));
    b.rot += -.09 * wind; b.sq += .06 * wind;
    const groove = ramp(t, 55.3, 55.5) * (1 - ramp(t, 56.7, 57.0));
    b.dy += -.25 * Math.abs(Math.sin(bpOf(t) * Math.PI)) * groove;
    const calm = t > 48.3 && t < 51.6 ? .5 : 1;
    b.sq += (mood.sq || 0) * .8; b.dy += (mood.dy || 0) * (t > 49.95 && t < 51.5 ? .3 : .8); b.rot += (mood.rot || 0) * calm; b.dx += (mood.dx || 0) * calm;
    return b;
  }

  function shoulderOf(side, o) {
    const sq = (o.sq || 0) + (o.take || 0), rise = -(o.dy || 0) - sq * 8.9 * .45, th = (o.rot || 0) + (o.lean || 0);
    const kx = (o.sx ?? 1) * (1 + sq * .6), ky = (o.sy ?? 1) * (1 - sq), P = side === 'L' ? [-7.45, -7.85] : [.15, -7.8];
    const lx = (P[0] + 1.425) * kx * U, ly = (P[1] + 2.625) * ky * U, px = (1 + (o.dx || 0)) * U, py = -(8.9 + rise) * U;
    return [BX + px + lx * Math.cos(th) - ly * Math.sin(th), BY + py + lx * Math.sin(th) + ly * Math.cos(th)];
  }
  function spotsOf(body) {
    const P = RIG.points(BX, BY, U, { ...body, handL: 'hip', handR: 'hip', handMixL: 1, handMixR: 1, gripL: 'fist', gripR: 'fist' });
    const C = RIG.points(BX, BY, U, { ...body, handL: 'chest', handR: 'chest', handMixL: 1, handMixR: 1, gripL: 'fist', gripR: 'fist' });
    const theta = (body.rot || 0) + (body.lean || 0), sq = body.sq || 0;
    const local = (lx, ly) => add2(P.face, rot2([(lx - FACE.x) * U * (1 + .6 * sq), (ly - FACE.y) * U * (1 - sq)], theta));
    return { shL: P.shoulderL || shoulderOf('L', body), shR: P.shoulderR || shoulderOf('R', body), hipL: P.handL, hipR: P.handR,
      chestL: C.handL, chestR: C.handR, face: P.face, top: P.top, theta, local };
  }

  const reachOf = grip => (Math.abs(((RIG.GRIPS || {})[grip] || { wrist: -1 }).wrist) + .35) * 1.45 * U;
  const slackOf = (sh, p, grip, k = 1.08) => Math.max(.35, (len2(sub2(p, sh)) - reachOf(grip)) * k / (8.6 * U));

  function track(t, keys) {
    const at = (v, tt) => (typeof v === 'function' ? v(tt) : v);
    if (t <= keys[0][0]) return at(keys[0][1], t);
    let i = 1; while (i < keys.length && t >= keys[i][0]) i++;
    if (i >= keys.length) return at(keys[keys.length - 1][1], t);
    const [t0, v0] = keys[i - 1], [t1, v1, o = {}] = keys[i];
    if (o.path) return o.path(t);
    const k = (o.e || ease)(seg(t, t0, t1)), a = at(v0, t), b = at(v1, t);
    let p = mix2(a, b, k);
    if (o.arc) { const d = sub2(b, a), L = len2(d) || 1, h = o.arc * Math.sin(Math.PI * k); p = add2(p, [-d[1] / L * h, d[0] / L * h]); }
    return p;
  }
  const step = (t, keys) => { let v = keys[0][1]; for (const [k, g] of keys) if (t >= k) v = g; return v; };

  const boxCentre = (B, t) => { const b = box(B.kind, Math.min(t, B.lift - 1e-3)); return [b.x, b.y - 28.5]; };
  function carried(B, t, o = {}) {
    const k = ease(seg(t, B.lift, B.cubby)), A = B.from, Z = B.bottom;
    const c1 = add2(A, [o.c1x ?? 30, -(o.up ?? 46)]), c2 = add2(Z, [o.c2x ?? 70, o.c2y ?? -90]);
    return bez3(A, c1, c2, Z, k);
  }
  const GRIP_BOX = [24, -34];
  const handOnBox = (B, o) => t => add2(t < B.lift ? add2(boxCentre(B, t), [0, 28.5]) : t < B.cubby ? carried(B, t, o) : B.bottom, GRIP_BOX);

  function homeRoute(t, rest) {
    const P = HOME.concat([rest]), L = [0];
    for (let i = 1; i < P.length; i++) L.push(L[i - 1] + len2(sub2(P[i], P[i - 1])));
    const d = L[L.length - 1] * kf(t, [[47.958, .02], [48.0, .14], [48.042, .55], [IMPACT, 1]], x => clamp(x));
    let i = 1; while (i < L.length - 1 && L[i] < d) i++;
    const p = mix2(P[i - 1], P[i], clamp((d - L[i - 1]) / (L[i] - L[i - 1])));
    return { p, via: P.slice(i, P.length - 1).reverse(), dir: sub2(P[i], P[i - 1]) };
  }

  function akimbo(o, side, p, hip) {
    const k = 1 - clamp(len2(sub2(p, hip)) / 70);
    if (k <= 0) return;
    o['len' + side] = lerp(o['len' + side], 1, k);
    o['bend' + side] = -1;
  }
  const reaching = t => (t > 48.33 && t < STAR.cubby) || (t > 50.14 && t < CART.cubby) || (t > 55.1 && t < SHARE.cubby);
  function leftArm(t, S, cool) {
    const rest = add2(S.shL, [-52, 168]);
    if (t < IMPACT) {
      const R = homeRoute(t, rest), o = { handL: R.p, handMixL: 1, gripL: 'open', frontL: false };
      if (has('viaL') && R.via.length) { o.viaL = R.via; o.sagL = .4; o.lenL = 3.5; } else o.lenL = slackOf(S.shL, R.p, 'open', 1.0);
      return { pose: o, whoosh: R };
    }
    const wob = spring(t, IMPACT, 5, 30), out = ramp(t, IMPACT, IMPACT + .04) * (1 - ramp(t, 48.28, 48.4)), REST = () => add2(rest, [-34 * out - 88 * wob, -26 * out + 16 * Math.abs(wob)]);
    const hip = () => S.hipL, shelfTop = () => coolPts(cool).handL, corner = [SHELF.x1 + 6, SHELF.y0 - 14];
    const keys = [
      [IMPACT, REST], [48.33, REST],
      [STAR.lift - .03, handOnBox(STAR), { e: ease }], [STAR.lift, handOnBox(STAR)],
      [STAR.cubby, handOnBox(STAR), { path: handOnBox(STAR, { up: 30, c1x: 10, c2x: 80, c2y: -110 }) }],
      [STAR.cubby + .06, () => add2(STAR.bottom, add2(GRIP_BOX, [8, -4]))], [49.42, REST, { arc: -30 }],
      [50.0, REST], [50.14, () => add2(rest, [10, 22]), { e: ease }],
      [CART.grab - .04, handOnBox(CART), { e: ease, arc: -80 }], [CART.lift, handOnBox(CART)],
      [CART.cubby, handOnBox(CART), { path: handOnBox(CART, { up: 40, c1x: 20, c2x: 90, c2y: -70 }) }],
      [CART.cubby + .07, () => add2(CART.bottom, add2(GRIP_BOX, [-6, 0]))], [CART.cubby + .14, () => add2(CART.bottom, add2(GRIP_BOX, [14, -6]))],
      [51.72, hip, { arc: 40 }], [WIPE + .05, hip], [WIPE + .45, REST],
      [55.1, REST], [SHARE.grab, handOnBox(SHARE), { e: ease, arc: 60 }], [SHARE.lift, handOnBox(SHARE)],
      [SHARE.cubby, handOnBox(SHARE), { path: handOnBox(SHARE, { up: 30, c1x: -10, c2x: 110, c2y: -60 }) }],
      [SHARE.cubby + .06, () => add2(SHARE.bottom, add2(GRIP_BOX, [8, -4]))], [56.45, REST, { arc: -30 }],
      [FULL + .05, REST], [FULL + .27, corner, { arc: 30 }], [FULL + .45, shelfTop, { e: ease }],
    ];
    const p = track(t, keys);
    let grip = step(t, [[0, 'open'], [STAR.lift - .05, 'grab'], [STAR.cubby + .02, 'open'], [CART.grab - .06, 'grab'], [CART.cubby + .05, 'open'],
      [51.55, 'fist'], [WIPE + .1, 'open'], [SHARE.grab - .03, 'grab'], [SHARE.cubby + .02, 'open']]);
    const o = { handL: p, handMixL: 1, gripL: grip, lenL: slackOf(S.shL, p, grip), bendL: t < IMPACT + .4 ? (wob > 0 ? .8 : -.8) : reaching(t) ? -.6 : undefined };
    akimbo(o, 'L', p, S.hipL);
    const kc = ramp(t, FULL + .25, FULL + .45);
    if (kc > 0) { o.lenL = lerp(o.lenL, cool.lenL ?? o.lenL, kc); o.bendL = cool.bendL; o.wristL = (cool.wristL || 0) * kc; }
    return { pose: o };
  }

  function coolPts(cool) {
    return RIG.points(BX, BY, U, cool);
  }

  function shadesPoint(S, s, t) {
    return S.local(FACE.x + s.dx + s.L + .9, FACE.y + s.dy - .1 + (s.L + .9) * Math.sin(s.rot || 0));
  }
  function shadesAt(t) {
    const k = ramp(t, SLIDE[0], SLIDE[1]);
    const o = {}; for (const f in EYE_SHADES) o[f] = lerp(HEAD_SHADES[f], EYE_SHADES[f], k);
    if (t < SLIDE[0]) { o.dy += .3 * spring(t, IMPACT, 8, 30); o.rot += .08 * spring(t, IMPACT, 8, 30); }
    return { k, s: o };
  }

  function sparkFist(t, S) {
    const jit2 = [3.5 * Math.sin(t * TAU * 9.3) * Math.sin(t * TAU * 2.1), 3 * Math.sin(t * TAU * 7.7 + 1)];
    let jolt = [0, 0];
    for (const [at, d] of [[48.72, [16, -10]], [49.2, [-12, -14]], [49.58, [14, 8]]]) {
      const w = spring(t, at, 9, 30); jolt = add2(jolt, [d[0] * w, d[1] * w]);
    }
    return add2(add2(S.shR, [62, 70]), add2(jit2, jolt));
  }

  function rightArm(t, S, cool) {
    const low = () => add2(S.shR, [48, 62]), fist = () => sparkFist(t, S), hip = () => S.hipR;
    const dip = () => add2(sparkFist(t, S), [-6, 22]), pump = () => add2(S.shR, [70, -130]), cocked = () => add2(S.shR, [-60, -125]), coiled = () => add2(S.shR, [-85, -100]), flung = () => add2(S.shR, [235, -40]);
    const overshoot = () => add2(S.shR, [410, 14]), follow = () => add2(S.shR, [222, 12]), thumbUp = () => add2(S.shR, [112, -58 - 10 * pulse(t, 9) * seg(t, 53.5, 53.6)]);
    const brow0 = () => S.local(FACE.x + 2.3, FACE.y - 1.9), brow1 = () => S.local(FACE.x - 2.4, FACE.y - 2.2), flick = () => S.local(FACE.x - 5.6, FACE.y - 4.6);
    const waveAt = () => add2(S.shR, [95, -150]), rest = () => add2(S.shR, [42, 170]);
    const shadeGrab = () => shadesPoint(S, HEAD_SHADES, t), shadeSlide = tt => shadesPoint(S, shadesAt(tt).s, tt), coolR = () => coolPts(cool).handR;
    const keys = [
      [48.0, low], [48.4, fist, { e: ease }], [49.9, fist], [49.99, dip, { e: ease }], [50.13, pump, { e: easeOut }], [50.45, pump],
      [50.8, cocked, { e: ease, arc: 30 }], [RELEASE - .08, coiled, { e: ease }], [RELEASE, flung, { e: easeIn, arc: -40 }], [RELEASE + .13, overshoot, { e: easeOut }],
      [51.42, follow, { e: ease }], [51.72, hip, { arc: -50 }],
      [REPLY[0], hip], [REPLY[0] + .2, thumbUp, { e: x => backOut(ease(x)), arc: -30 }], [REPLY[1], thumbUp],
      [WIPE + .12, brow0, { e: ease, arc: 40 }], [WIPE + .3, brow1, { e: ease }], [WIPE + .38, flick, { e: easeOut }],
      [WAVE + .14, waveAt, { e: ease, arc: -60 }], [55.25, waveAt], [55.55, rest],
      [GEAR.grab - .02, handOnBox(GEAR), { e: ease, arc: -80 }], [GEAR.lift, handOnBox(GEAR)],
      [GEAR.cubby, handOnBox(GEAR), { path: handOnBox(GEAR, { up: 40, c1x: 40, c2x: 110, c2y: -70 }) }],
      [GEAR.cubby + .06, () => add2(GEAR.bottom, add2(GRIP_BOX, [10, -4]))], [56.9, rest, { arc: 20 }],
      [57.12, rest], [SLIDE[0], shadeGrab, { e: ease, arc: 40 }], [SLIDE[1], shadeSlide, { path: shadeSlide }],
      [57.82, coolR, { e: ease, arc: -30 }],
    ];
    let p = track(t, keys);
    if (t > WAVE + .14 && t < 55.3) p = add2(p, [18 * Math.sin((t - WAVE) * TAU * 3.2) * hump(t, WAVE + .1, 55.3), 0]);
    const grip = step(t, [[0, 'fist'], [RELEASE, 'open'], [51.6, 'fist'], [REPLY[0] + .07, 'thumb'], [REPLY[1] + .05, 'open'], [WAVE + .05, 'wave'], [55.3, 'open'],
      [GEAR.grab - .03, 'grab'], [GEAR.cubby + .02, 'open'], [SLIDE[0] - .03, 'grab'], [SLIDE[1] + .02, 'open'], [57.62, 'fist']]);
    const o = { handR: p, handMixR: 1, gripR: grip, lenR: slackOf(S.shR, p, grip) };
    akimbo(o, 'R', p, S.hipR);
    if (t < RELEASE) o.holdR = (u, sw) => clickSpark(.15 * u, 0, 1.05, { state: 'held', r0: 22, k: .85 + .15 * Math.sin(t * TAU * 3.1), key: 'held' });
    if (t > WIPE - .1 && t < WIPE + .45) { o.frontR = true; o.wristR = 1.1; }
    if (t > GEAR.grab - .5 && t < GEAR.cubby + .1) o.frontR = false;
    if (t > SLIDE[0] - .2 && t < SLIDE[1] + .1) o.frontR = true;
    const kc = ramp(t, 57.66, 57.86);
    if (kc > 0) { o.bendR = cool.bendR; o.lenR = lerp(o.lenR, cool.lenR ?? o.lenR, kc); }
    return { pose: o };
  }

  function cheeks(k) {
    return (u, sw) => {
      const cy = -6.15 * u, r = (.7 + .45 * k) * u;
      for (const s of [-1, 1]) {
        const cx = (-3.72 + s * 1.85) * u;
        paint(ellPts(cx, cy, r, r * .92, 18), { wash: '#FFFBF4', ink: null });
        paint(ellPts(cx + s * .15 * u, cy + .25 * u, r * .62, r * .42, 12), { fill: PAL.rose, fillOp: 170 * k, bleed: .2, ink: null });
        const arc = []; for (let i = 0; i <= 9; i++) { const a = (s < 0 ? Math.PI * .45 : -Math.PI * .55) + i / 9 * Math.PI * 1.1; arc.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r * .92]); }
        inkLine(s < 0 ? arc : arc.reverse(), sw * 1.05, PAL.ink, 'ink', .5);
        inkLine([[cx + s * r * .2, cy - r * .55], [cx + s * r * .45, cy - r * .35]], sw * .5, PAL.cream, 'inkfine', 0);
      }
      paint(ellPts(-3.72 * u, -6.0 * u, .32 * u, .22 * u, 10), { wash: PAL.ink, ink: null });
    };
  }

  function paintedShades(s) {
    return (u, sw) => {
      push(); translate(FACE.x * u, (FACE.y + 6) * u);
      translate(s.dx * u, (s.dy - 6.2) * u); rotate(s.rot); translate(0, 6.2 * u);
      const lx = s.L / s.w, P = pts => pts.map(([a, b]) => [a * u, b * u]);
      drawScaled(s.w, s.h, () => {
        const lens = cx => P([[cx - 1.4, -7.1], [cx + 1.4, -7.1], [cx + 1.3, -6.2], [cx + .8, -5.35], [cx, -5.2], [cx - .8, -5.35], [cx - 1.3, -6.2]]);
        for (const sd of [-1, 1]) inkLine(P([[sd * (lx + 1.4), -6.85], [sd * (lx + 2.5), -6.95]]), sw * .8, PAL.ink, 'ink', 0);
        inkLine(P([[1.35 - lx, -6.75], [0, -7.05], [lx - 1.35, -6.75]]), sw * .8, PAL.ink, 'ink', .5);
        for (const sd of [-1, 1]) {
          const cx = sd * lx;
          paint(lens(cx), { wash: '#2A2740', ink: PAL.ink, sw: sw * .9, curv: .3 });
          inkLine(P([[cx - .85, -6.35], [cx - .25, -6.85]]), sw * .45, PAL.cream, 'inkfine', 0);
          inkLine(P([[cx - .45, -5.85], [cx - .05, -6.2]]), sw * .3, PAL.cream, 'inkfine', 0);
        }
      }, [0, -6.2 * u]);
      pop();
    };
  }

  function facePose(t, mood) {
    const f = {};
    const [lx, ly] = kf(t, GAZE, x => ease(x));
    f.lookX = lx; f.lookY = ly;
    if (t > IMPACT - .01 && t < 48.24) f.squint = Math.max(mood.squint || 0, 1 - seg(t, 48.17, 48.24));
    const puff = ramp(t, 48.46, 48.6) * (1 - ramp(t, PFF - .02, PFF + .05));
    if (puff > .01) { f.mouth = null; f.draw = cheeks(puff); f.emote = null; if (puff < .5) f.squint = Math.max(f.squint || 0, .6); }
    if (t > PFF - .02 && t < PFF + .2) f.mouth = 'O';
    if (t > WIPE + .1 && t < WIPE + .45) f.mouth = 'o';
    if (t < SLIDE[0]) { const sh = shadesAt(t).s; f.shades = { dy: sh.dy, rot: sh.rot }; }
    else if (t < SLIDE[1]) f.draw = paintedShades(shadesAt(t).s);
    if (mood.eyes === 'shades') f.squint = 0;
    return f;
  }

  function poseAt(t) {
    const cool = coolOf(t);
    if (t >= SETTLE) return { pose: { ...cool, boilKey: 'bolt' }, cool };
    const mood = RIG.emotions(t, MOODS);
    const body = bodyAt(t, mood);
    const kc = ramp(t, FULL + .05, SETTLE - .02);
    if (kc > 0) for (const f of ['lean', 'rot', 'dx', 'dy', 'sq', 'heelR', 'heelL']) body[f] = lerp(body[f] || 0, cool[f] || 0, kc);
    if (kc > 0) {
      body.legSpread = lerp(body.legSpread, cool.legSpread ?? 1, ramp(t, FULL + .12, FULL + .4));
      body.liftR = 1.1 * hump(t, FULL + .1, FULL + .42);
    }
    const S = spotsOf(body), face = facePose(t, mood);
    const L = leftArm(t, S, cool), R = rightArm(t, S, cool);
    const pose = {
      ...mood, ...body, ...face, ...L.pose, ...R.pose, seed: 2.2, boilKey: 'bolt',
    };
    if (t >= COOL) pose.emoteAge = t;
    return { pose, S, L, R, cool };
  }

  function heldBoxes(t, P) {
    for (const [B, side] of [[STAR, 'L'], [CART, 'L'], [SHARE, 'L'], [GEAR, 'R']]) {
      if (t < B.lift || t >= B.cubby) continue;
      const h = side === 'L' ? P.handL : P.handR, c = sub2(h, GRIP_BOX), k = seg(t, B.lift, B.cubby);
      jsBox(c[0], c[1], 1, B.kind, { rot: .18 * Math.sin(Math.PI * k) * (side === 'L' ? 1 : -1), squash: -.08 * Math.sin(Math.PI * k), noShadow: true, key: 'queue ' + B.kind });
    }
  }

  function zaps(t, P) {
    if (t >= FLY0) return;
    boilSeed('payoff zaps');
    for (const [at, a] of [[48.72, -.6], [49.2, -2.2], [49.58, .4], [50.15, -1.4]]) {
      const age = t - at;
      if (age < 0 || age > .3) continue;
      const r = 30 + 90 * easeOut(age / .3), s = 15 * (1 - age / .3) + 4;
      spark(P.handR[0] + Math.cos(a) * r - s / 2, P.handR[1] + Math.sin(a) * r - s / 2, s, a + .9, 1.2);
    }
  }

  let RELEASE_PT = null;
  const FLY0 = RELEASE + .005;
  const releasePt = () => RELEASE_PT || (RELEASE_PT = RIG.points(BX, BY, U, poseAt(FLY0).pose).handR);
  function flyingSpark(t) {
    if (t < FLY0 || t > HIT + .9) return;
    const a = releasePt(), b = [BTN_ICON[0], BTN_ICON[1] - 2];
    if (t < HIT) {
      const k = seg(t, FLY0, HIT), p = arcPt(a, b, 120, k), q = arcPt(a, b, 120, Math.max(0, k - .1));
      clickSpark(p[0], p[1], 1.25, { state: 'fly', dir: sub2(p, q), trail: 150, key: 'payoff fly' });
      return;
    }
    sparkle(b[0], b[1] - 4, 1.15, t - HIT, { key: 'payoff hit' });
  }

  function plushHop(t) {
    if (t < HIT || t > LAND + .08) return;
    const from = [BTN_ICON[0] + 8, BTN_ICON[1] - 24], to = [PG.headerCart[0] - 4, PG.headerCart[1] + 4];
    const k = seg(t, HIT, LAND), born = backOut(seg(t, HIT - .01, HIT + .08)), sink = 1 - easeIn(seg(t, LAND - .06, LAND + .06));
    const p = arcPt(from, to, 120, ease(k));
    qwikPlush(p[0], p[1], 64 * born * lerp(1, .55, ease(k)) * sink * (1 + .12 * Math.sin(Math.PI * k)), { rot: -.15 - 1.1 * ease(k), key: 'hop' });
    if (k > .1 && k < .9) speedLines(p[0] - 6, p[1] + 20, 56, sub2(to, from), 1 - Math.abs(2 * k - 1) * .6, { key: 'hop lines', spread: 24 });
  }

  function badgeFx(t) {
    const age = t - POP - .03;
    if (age < 0 || age > 1.8) return;
    confetti(BADGE[0] - 2, BADGE[1] - 20, .8, age, 7, { n: 20 });
  }

  function pffPuff(t, S) {
    const age = t - PFF;
    if (age < 0 || age > .45) return;
    const at = add2(S.local(FACE.x, FACE.y + 2.1), [70 * easeOut(age / .45), 30 * easeOut(age / .45)]);
    poof(at[0], at[1], .3, age, { key: 'pff', life: .45 });
  }

  function sweatFlick(t, S) {
    const age = t - (WIPE + .36);
    if (age < 0 || age > .5) return;
    boilSeed('payoff sweat');
    const o = S.local(FACE.x - 5.6, FACE.y - 4.6);
    for (let i = 0; i < 3; i++) {
      const p = arcPt(o, add2(o, [-60 - 40 * i, 70 + 30 * i]), 50 + 20 * i, clamp(age / .5)), r = 7 - i * 1.5;
      paint([[p[0], p[1] - r * 1.7], [p[0] + r, p[1] + r * .2], [p[0], p[1] + r], [p[0] - r, p[1] + r * .2]], { wash: PAL.sky, ink: PAL.ink, sw: .7, curv: .7 });
    }
  }

  function tapTicks(t, P) {
    const waiting = ramp(t, 48.5, 48.6) * (1 - ramp(t, 49.8, 49.9)), age = frac(bpOf(t) * 2) * BEAT / 2;
    if (waiting < .5 || age > .09) return;
    boilSeed('payoff tap ticks');
    const [fx, fy] = P.feet[1], k = 1 - age / .09;
    for (const a of [-1.3, -.82, -.34]) {
      const c = [fx + 64, fy - 1], r0 = 11 + 10 * (1 - k), r1 = r0 + 21 * k;
      inkLine([[c[0] + Math.cos(a) * r0, c[1] + Math.sin(a) * r0], [c[0] + Math.cos(a) * r1, c[1] + Math.sin(a) * r1]], .95 * k + .3, PAL.ink, 'ink', 0);
    }
  }

  function armWhoosh(t, P, L) {
    if (t < IMPACT && L.whoosh) {
      const R = L.whoosh, d = len2(R.dir) || 1;
      speedLines(P.handL[0], P.handL[1], 200, [R.dir[0] / d, R.dir[1] / d], 1, { key: 'arm home', spread: 46 });
      return;
    }
    const r = t - IMPACT;
    if (r < 0 || r > .3) return;
    boilSeed('payoff twang');
    const k = 1 - r / .3, c = P.handL;
    for (const s of [-1, 1]) for (let j = 0; j < 2; j++) {
      const R = 30 + 16 * j + 30 * (1 - k), pts = [];
      for (let i = 0; i <= 6; i++) { const a = (s < 0 ? Math.PI : 0) + (i / 6 - .5) * 1.2; pts.push([c[0] + Math.cos(a) * R, c[1] + Math.sin(a) * R * .8]); }
      inkLine(pts, 2.4 * k * (1 - .3 * j), PAL.ink, 'ink', .5);
    }
  }

  function fullShelf(t) {
    const age = t - FULL;
    if (age < 0 || age > 1) return;
    sparkle((SHELF.x0 + SHELF.x1) / 2 - 30, SHELF.y0 + 60, 1.25, age, { key: 'full a' });
    sparkle(SHELF.x0 + 60, SHELF.y0 + 230, .9, age - .12, { key: 'full b' });
    sparkle(SHELF.x1 - 50, SHELF.y1 - 60, .9, age - .2, { key: 'full c' });
  }

  function cursorAt(t) {
    const onBtn = [BTN[0] + 36, BTN[1] - 6], hover = [BTN[0] + 52, BTN[1] - 40];
    let p = mix2(onBtn, hover, ramp(t, 50.9, 51.1)), pose = t < 50.95 ? 'drum' : 'point', o = { phase: t * 2.5 + .3 };
    p = add2(p, [0, -22 * Math.max(0, spring(t, HIT + .02, 6, 16)) - 10 * Math.max(0, spring(t, POP, 7, 18))]);
    if (t >= 52.85) {
      const up = ramp(t, 52.85, THUMB + .12), pump = t > THUMB + .25 ? Math.max(0, Math.sin((t - THUMB - .25) * TAU * 1.6)) * (1 - ramp(t, 53.75, 54.0)) : 0;
      p = add2(p, [10 * up, -70 * up - 16 * pump]);
      if (t >= THUMB) { pose = 'thumb'; o = { from: 'point', k: seg(t, THUMB, THUMB + .13), rot: -.08 * pump }; }
    }
    if (t >= WAVE) {
      const go = easeIn(seg(t, 54.95, GONE));
      p = add2(p, [-10 * ramp(t, WAVE, WAVE + .2) + 760 * go, -20 * ramp(t, WAVE, WAVE + .2) - 260 * go]);
      pose = 'wave'; o = { from: 'thumb', k: seg(t, WAVE, WAVE + .22), phase: (t - WAVE) * 2.4, rot: .1 * go };
    }
    return { p, pose, o };
  }
  function drawCursor(t) {
    if (t > GONE + .05) return;
    const h = cursorAt(t);
    if (cull(h.p[0] - 90, h.p[1] - 30, h.p[0] + 110, h.p[1] + 250)) return;
    cursorHand(h.p[0], h.p[1], 1.05, { pose: h.pose, ...h.o, shadow: [16, 22, .8], boilKey: 'hand' });
  }

  function starSnailDuck(t) {
    if (t > 48.4) return;
    const s = snailAt('s3', t), duck = Math.max(s.duck, lerp(.85, 1, ramp(t, 47.98, 48.04)) * (1 - ramp(t, 48.1, 48.34)));
    if (cull(s.x - 70, s.y - 140, s.x + 70, s.y + 20)) return;
    snail(s.x, s.y, U, {
      shell: s.shell, crawl: s.crawl, carry: s.carry, duck, hide: s.hide, sweat: s.sweat, droop: s.droop, eyes: duck > .5 ? 'closed' : s.eyes, mouth: s.mouth,
      lookX: s.look, lookY: -duck, seed: s.seed, sq: s.sq, emote: s.emote, emoteK: s.emote ? 1 : 0, emoteAge: t + s.seed, boilKey: 'snail-s3',
    });
  }

  const PORT = { c: [4415, 218], ro: [40, 128], ri: [26, 113] };
  function portholeFront(t) {
    const near = ['s3', 's4', 's5', 's6'].some(id => { const s = snailAt(id, t); return s.visible && s.x > 4290 && s.x < 4560; });
    if (!near || cull(PORT.c[0] - 50, PORT.c[1] - 140, PORT.c[0] + 50, PORT.c[1] + 140)) return;
    boilSeed('set porthole front');
    const [cx, cy] = PORT.c, out = [], inn = [], sw = Math.pow(lod(), -.5);
    for (let i = 0; i <= 18; i++) {
      const a = -Math.PI / 2 + Math.PI * i / 18;
      out.push([cx + PORT.ro[0] * Math.cos(a), cy + PORT.ro[1] * Math.sin(a)]);
      inn.push([cx + PORT.ri[0] * Math.cos(a), cy + PORT.ri[1] * Math.sin(a)]);
    }
    paint(out.concat(inn.reverse()), { wash: SETS.K.brass, ink: PAL.ink, sw });
    const hl = [];
    for (let i = 2; i <= 10; i++) { const a = -Math.PI / 2 + Math.PI * i / 18; hl.push([cx + (PORT.ro[0] - 5) * Math.cos(a), cy + (PORT.ro[1] - 5) * Math.sin(a)]); }
    inkLine(hl, .9 * sw, SETS.K.brassLt, 'inkfine', .4);
    if (lod() >= .5) for (let i = 1; i < 6; i++) { const a = -Math.PI / 2 + Math.PI * i / 6; paint(ellPts(cx + (PORT.ro[0] + PORT.ri[0]) / 2 * Math.cos(a), cy + (PORT.ro[1] + PORT.ri[1]) / 2 * Math.sin(a), 3.2, 3.2, 8), { wash: SETS.K.brassDk, ink: null }); }
  }

  function desk(t) {
    camBegin(...camAt(t));
    houseSet(t, { page: pageAt(t), cubbyLit: cubbyLit(t), clockWhizz: clockWhizz(t) });
    shelfBoxes(t);
    drawSnails(t, id => id !== 's3' || t > 48.4);
    starSnailDuck(t);
    portholeFront(t);
    const B = poseAt(t), P = RIG.points(BX, BY, U, B.pose);
    heldBoxes(t, P);
    qwik(BX, BY, U, B.pose);
    if (B.L) armWhoosh(t, P, B.L);
    tapTicks(t, P);
    zaps(t, P);
    if (B.S) { pffPuff(t, B.S); sweatFlick(t, B.S); }
    flyingSpark(t);
    plushHop(t);
    badgeFx(t);
    fullShelf(t);
    drawCursor(t);
    camEnd();
  }

  shots([[48.0, desk], [50.5, desk], [54.0, desk]]);
})();
