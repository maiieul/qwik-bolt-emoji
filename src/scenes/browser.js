(() => {
  const U = 20, [BX, BY] = WORLD.boltDesk;
  const feats = () => (window.RIG && RIG.features) || [];
  const has = f => feats().includes(f);

  const FULL = { header: 1, hero: 1, card: 1, reviews: 1, footer: 1 };
  const GREY = { header: 1, hero: 1, card: 1, skeleton: 1, footer: 1 };

  const BOT = [0, 0], TOPP = [-7.475, -16.301], PELV = [-1.425, -2.625];
  const MOUTH = WORLD.nozzle, LEN = SETS.tubeLen, NOZ_A = Math.PI / 4, NOZ_DIR = [Math.cos(NOZ_A), Math.sin(NOZ_A)];
  const V = 760;
  const NECK = LEN - 70, S_ELBOW = SETS.tubeS(4958.6);

  const PARCELS = [
    { key: 'p1', parts: ['header', 'hero'], beat: 17.0, land: [5190, 545], fl: .17 },
    { key: 'p2', parts: ['card'], beat: 17.5, land: [5190, 700], fl: .2 },
    { key: 'p3', parts: ['skeleton'], beat: 18.0, land: [5190, 805], fl: .22 },
    { key: 'p4', parts: ['footer'], beat: 18.5, land: [5190, 852], fl: .22, grow: .17 },
  ];
  const OUT_S = 1.45;
  const unfoldOf = (a, grow = .3) => a < .07 ? .3 * a / .07 : a < .2 ? lerp(.3, .55, (a - .07) / .13) : lerp(.55, 1, clamp((a - .2) / grow));
  const doneAt = P => P.beat + P.fl + .2 + (P.grow ?? .3);

  function flight(P, t) {
    const tau = clamp(t - P.beat, 0, P.fl), fl = P.fl;
    const v0 = [NOZ_DIR[0] * V, NOZ_DIR[1] * V], d = [P.land[0] - MOUTH[0], P.land[1] - MOUTH[1]];
    const g = [2 * (d[0] - v0[0] * fl) / (fl * fl), 2 * (d[1] - v0[1] * fl) / (fl * fl)];
    return [MOUTH[0] + v0[0] * tau + .5 * g[0] * tau * tau, MOUTH[1] + v0[1] * tau + .5 * g[1] * tau * tau];
  }

  function parcelState(P, t) {
    if (t < P.beat) return { phase: 'tube', s: LEN - V * (P.beat - t) };
    const land = P.beat + P.fl;
    if (t < land) {
      const k = (t - P.beat) / P.fl, [x, y] = flight(P, t);
      return { phase: 'fly', x, y, s: lerp(1.1, OUT_S, easeOut(k)), rot: NOZ_A * (1 - easeOut(k)), stretch: .6 * (1 - k), squash: 0, unfold: 0 };
    }
    const a = t - land, unfold = unfoldOf(a, P.grow);
    return { phase: unfold >= 1 ? 'done' : 'open', x: P.land[0], y: P.land[1], s: OUT_S, rot: -.06 * spring(t, land, 9, 22), stretch: 0, squash: .3 * Math.exp(-a * 12) * Math.cos(a * 28), unfold };
  }

  const pulseIn = (s, a, w) => { const k = (s - a) / w; return k > 0 && k < 1 ? Math.sin(Math.PI * k) : 0; };

  function pageC1(t) {
    const parts = {};
    for (const P of PARCELS) if (t >= doneAt(P)) for (const p of P.parts) parts[p] = 1;
    const hd = doneAt(PARCELS[0]);
    return { parts, badge: t < hd ? 0 : lerp(-.6, 0, seg(t, hd, hd + .3)), t };
  }

  function tubeParcels(t) {
    const items = [];
    for (const P of PARCELS) {
      const st = parcelState(P, t);
      if (st.phase !== 'tube' || st.s < SETS.tubeS(4150)) continue;
      const p = SETS.tubeAt(st.s), squeeze = clamp((st.s - NECK) / 60);
      const i = PARCELS.indexOf(P), wob = .025 * Math.sin(t * 7 + i * 2.1) * (1 - clamp((st.s - S_ELBOW) / 30));
      items.push({ kind: 'parcel', s: st.s, scale: 1.15, rot: p.a + wob, key: 'parcel ' + P.key, o: { stretch: .28 + .5 * squeeze, dir: 1, key: P.key, noShadow: true } });
    }
    return items;
  }

  const unionOf = R => [Math.min(...R.map(r => r[0])), Math.min(...R.map(r => r[1])), Math.max(...R.map(r => r[2])), Math.max(...R.map(r => r[3]))];
  function unfoldParts(P, u, from, t) {
    const open = seg(u, .24, .62), away = seg(u, .55, 1);
    if (open <= .2) return;
    const slots = P.parts.map(pageSlot), Un = unionOf(slots);
    const kx0 = easeOut(away), kx1 = 1 - Math.pow(1 - away, 2.4), ky = lerp(easeOut(away), backOut(away), .45);
    const R = [lerp(from[0], Un[0], kx0), lerp(from[1], Un[1], ky), lerp(from[2], Un[2], kx1), lerp(from[3], Un[3], ky)];
    const fx = x => R[0] + (x - Un[0]) / (Un[2] - Un[0]) * (R[2] - R[0]), fy = y => R[1] + (y - Un[1]) / (Un[3] - Un[1]) * (R[3] - R[1]);
    P.parts.forEach((kind, i) => {
      const [a, b, c, d] = slots[i], x0 = fx(a), y0 = fy(b);
      pagePart(kind, x0, y0, fx(c) - x0, fy(d) - y0, { k: 1, t, ...(kind === 'header' ? { badge: 0 } : {}) });
    });
  }
  function outParcels(t) {
    for (const P of PARCELS) {
      const st = parcelState(P, t);
      if (st.phase === 'tube' || st.phase === 'done') continue;
      const r = parcel(st.x, st.y, st.s, { rot: st.rot, stretch: st.stretch, squash: st.squash, unfold: st.unfold, key: P.key, dir: 1 });
      if (st.phase === 'open') unfoldParts(P, st.unfold, r.content, t);
    }
  }

  const B_STUCK = 18.84, B_SLURP = 18.96, B_GONE = 19.07, B_OUT = 19.1, B_FREE = 19.32, B_LAND = 19.5;
  const RIDE_LEN = 420, HEAD_X = 4990, RIDE_AT17 = 2827 + 470, RIDE_V17 = 760, RIDE_HIT = 1700;
  const TIP_LEN = Math.hypot(TOPP[0] - BOT[0], TOPP[1] - BOT[1]);
  function rideHead(t) {
    const T = B_STUCK - 17, k = clamp((t - 17) / T), k2 = k * k, k3 = k2 * k;
    return (2 * k3 - 3 * k2 + 1) * RIDE_AT17 + (k3 - 2 * k2 + k) * T * RIDE_V17 + (-2 * k3 + 3 * k2) * HEAD_X + (k3 - k2) * T * RIDE_HIT;
  }
  function rideLen(t) {
    if (t < B_STUCK) return RIDE_LEN;
    const squashed = RIDE_LEN - 170 * (1 - Math.exp(-(Math.min(t, B_SLURP) - B_STUCK) * 14));
    return t < B_SLURP ? squashed : lerp(squashed, 0, Math.pow(seg(t, B_SLURP, B_GONE), 1.6));
  }
  const RIDE_FACE = { eyes: 'wide', mouth: 'open', lookY: -1, lookX: 0, squint: 0 };
  const STRAIN = { eyes: 'squeeze', mouth: 'teeth', lookY: 0, squint: 0 };
  const TUBE_FACE = [[17, 'excited', RIDE_FACE], [B_STUCK, 'determined', STRAIN]];
  function tubeBolt(t) {
    if (t >= B_GONE) return;
    const head = Math.min(rideHead(t), HEAD_X), len = rideLen(t);
    if (head < 4120 || len < 12) return;
    const squash = RIDE_LEN / len, kx = Math.min(.36, .3 * Math.pow(squash, .3)), ky = len / (TIP_LEN * U);
    const rot = -Math.atan2((TOPP[1] - BOT[1]) * ky, (TOPP[0] - BOT[0]) * kx);
    const tail = head - len, pel = pelvisFromTail([tail, WORLD.tubeY + 6], rot, kx, ky), [gx, gy] = groundFor(pel);
    if (t < B_STUCK) speedLines(tail - 6, WORLD.tubeY, 200, 1, 1, { spread: 34, key: 'bolt ride' });
    else if (t >= B_SLURP) speedLines(tail - 4, WORLD.tubeY + 4, 90 + 160 * seg(t, B_SLURP, B_GONE), 1, 1, { spread: 30, key: 'bolt slurp' });
    const f = RIG.emotions(t, TUBE_FACE), impact = t - B_STUCK;
    const shake = impact > 0 && impact < .14 ? 4 * Math.sin(impact * 130) * (1 - impact / .14) : 0;
    qwik(gx, gy + shake, U, { ...RIG.feel('excited', t), eyes: f.eyes, mouth: f.mouth, squint: f.squint, lookX: f.lookX, lookY: f.lookY, blush: f.blush,
      dy: 0, sq: 0, dx: 0, lean: 0, rot, sx: kx, sy: ky, zap: 0, noLimbs: true, noShadow: true, emote: null, boilKey: 'bolt tube' });
  }

  function nozzleBulge(t) {
    let b = 0;
    for (const P of PARCELS) b = Math.max(b, .75 * pulseIn(LEN - V * (P.beat - t), NECK, 140));
    const inside = ease(seg(t, B_STUCK - .02, B_STUCK + .06)) * (1 - ease(seg(t, B_FREE - .03, B_FREE + .05)));
    const glug = .35 * Math.sin(Math.PI * seg(t, B_SLURP + .04, B_OUT + .06));
    return Math.max(b, inside * (.75 + glug + .08 * Math.sin(t * 95)), .45 * spring(t, B_FREE, 10, 34));
  }

  function rotP(p, a) { const c = Math.cos(a), s = Math.sin(a); return [p[0] * c - p[1] * s, p[0] * s + p[1] * c]; }
  function pelvisFromTail(tail, rot, kx, ky) {
    const off = rotP([(PELV[0] - BOT[0]) * kx * U, (PELV[1] - BOT[1]) * ky * U], rot);
    return [tail[0] + off[0], tail[1] + off[1]];
  }
  function pelvisFromTop(top, rot, kx, ky) {
    const off = rotP([(PELV[0] - TOPP[0]) * kx * U, (PELV[1] - TOPP[1]) * ky * U], rot);
    return [top[0] + off[0], top[1] + off[1]];
  }
  function groundFor(pelvis, sq = 0) { return [pelvis[0] - RIG.K.pelvisX * U, pelvis[1] + (RIG.K.hipH - sq * RIG.K.hipH * .45) * U]; }
  const rotFor = (ang, kx, ky) => { const r = ang - Math.atan2((TOPP[1] - BOT[1]) * ky, (TOPP[0] - BOT[0]) * kx); return Math.atan2(Math.sin(r), Math.cos(r)); };

  const UPRIGHT = Math.atan2(TOPP[1] - BOT[1], TOPP[0] - BOT[0]) + TAU;
  const EX = { kx0: .24, kx: .42, ky0: .1, ky: 1.42, fall0: NOZ_A, fall: 1.7 };
  function extrude(t) {
    const k = seg(t, B_OUT, B_FREE), e = 1 - Math.pow(1 - k, 1.5);
    const kx = lerp(EX.kx0, EX.kx, e), ky = lerp(EX.ky0, EX.ky, e), fall = lerp(EX.fall0, EX.fall, lerp(ease(k), k, .35));
    const ang = fall + Math.PI, rot = rotFor(ang, kx, ky), topIn = 16 * (1 - k);
    const top = [MOUTH[0] - NOZ_DIR[0] * topIn, MOUTH[1] - NOZ_DIR[1] * topIn];
    return { kx, ky, ang, rot, pelvis: pelvisFromTop(top, rot, kx, ky) };
  }
  const EXIT = extrude(B_FREE);
  const LAND_PELVIS = [BX + RIG.K.pelvisX * U, BY - RIG.K.hipH * U];

  const LIMBS = {
    leg: t => lerp(0, 1, backOut(seg(t, B_FREE + .03, B_LAND - .03))),
    arm: t => lerp(0, 1, backOut(seg(t, B_FREE + .05, B_LAND + .04))),
  };
  const C1_MOOD = [[17, 'determined'], [B_STUCK, 'determined', STRAIN], [B_FREE, 'excited'], [B_LAND, 'proud']];
  const GLANCE = 19.84, SHOW = 19.98;
  function glanceC1(t, mood) {
    const g = ease(seg(t, GLANCE, GLANCE + .14));
    if (g <= 0) return mood;
    const blink = Math.max(0, 1 - Math.abs(t - GLANCE) / .07), show = backOut(seg(t, SHOW, SHOW + .24));
    const o = { ...mood, eyes: t < GLANCE ? mood.eyes : 'look', lookX: .95 * g, lookY: .55 * g, squint: Math.max(mood.squint || 0, blink), mouth: t < GLANCE + .1 ? mood.mouth : 'smirk' };
    if (show <= 0) return o;
    const rest = spotOf(mood, 'R', 'hip'), card = [5000, 752], to = mix2(rest, card, show);
    return { ...o, handR: to, handMixR: 1, gripR: show > .4 ? 'open' : 'fist', wristR: .45 * show, lenR: Math.max(.8, lerp(.8, 1.08, show)), frontR: true, lean: (o.lean || 0) + .05 * ease(seg(t, SHOW, SHOW + .3)) };
  }
  function boltC1(t, front) {
    const mood = glanceC1(t, RIG.emotions(t, C1_MOOD));
    if (t < B_OUT || (t < B_FREE) !== !front) return;
    if (t < B_FREE) {
      const X = extrude(t), [gx, gy] = groundFor(X.pelvis);
      qwik(gx, gy, U, { ...mood, ...STRAIN, squint: 0, dy: 0, sq: 0, dx: 0, lean: 0, rot: X.rot, sx: X.kx, sy: X.ky, zap: 0, noLimbs: true, noShadow: true, emote: null, boilKey: 'bolt' });
      return;
    }
    if (t < B_LAND) {
      const k = seg(t, B_FREE, B_LAND), age = t - B_FREE;
      const P0 = EXIT.pelvis, P1 = [P0[0] - 60, P0[1] - 120], P3 = LAND_PELVIS, P2 = [P3[0] + 20, P3[1] - 130];
      const e = lerp(k, easeIn(k), .3), m = 1 - e;
      const pel = [0, 1].map(i => m * m * m * P0[i] + 3 * m * m * e * P1[i] + 3 * m * e * e * P2[i] + e * e * e * P3[i]);
      const boing = Math.exp(-age * 7) * Math.cos(age * 20);
      const kx = 1 - (1 - EX.kx) * boing, ky = 1 + (EX.ky - 1) * boing;
      const rot = rotFor(lerp(EXIT.ang, UPRIGHT, ease(seg(k, 0, .82))), kx, ky);
      const [gx] = groundFor(pel), lift = (BY - RIG.K.hipH * U - pel[1]) / U;
      let o = { ...mood, dy: -lift, sq: 0, dx: 0, lean: 0, rot, sx: kx, sy: ky, wind: .9 * Math.sin(Math.PI * seg(t, B_FREE, B_LAND - .02)), boilKey: 'bolt' }, x = gx;
      if (has('legLen') && has('lenL')) {
        const legLen = LIMBS.leg(t), arm = LIMBS.arm(t), want = RIG.points(gx, BY, U, o).face, got = RIG.points(gx, BY, U, { ...o, legLen }).face;
        o = { ...o, legLen, lenL: arm, lenR: arm, noSpark: true, dy: o.dy + (want[1] - got[1]) / U };
        x += want[0] - got[0];
      } else o.noLimbs = t < 19.36;
      qwik(x, BY, U, o);
      if (age < .5) poof(MOUTH[0] + 10, MOUTH[1] + 10, .45, age, { key: 'mouth pop' });
      return;
    }
    const age = t - B_LAND, land = .3 * Math.exp(-age * 7) * Math.cos(age * 20);
    qwik(BX, BY, U, { ...mood, sq: (mood.sq || 0) + land, boilKey: 'bolt' });
  }

  function c1(t) {
    const bulge = nozzleBulge(t);
    const push = ease(seg(t, 19.65, 20.5));
    camBegin(lerp(5200, 5290, push), lerp(580, 640, push), lerp(.95, 1.04, push));
    houseSet(t, { page: pageC1(t), nozzleBulge: bulge });
    tubeContents(t, tubeParcels(t));
    tubeBolt(t);
    boltC1(t, false);
    tubeGlass(t, { nozzleBulge: bulge });
    outParcels(t);
    boltC1(t, true);
    const card = toScreen(5470, 765);
    camEnd();
    if (t > 20.25) irisTo(seg(t, 20.25, 20.5) * .5, ...card);
  }

  const HIPS = { handL: 'hip', handR: 'hip', aL: -1.6, aR: -1.6, bendL: -1, bendR: -1, gripL: 'fist', gripR: 'fist' };
  const DESK_MOOD = [
    [22.5, 'bored', { ...HIPS, lookX: .55, lookY: -.6 }],
    [22.75, 'surprised', { handL: 'hip', aL: -1.6, bendL: -1, gripL: 'fist', lookX: .45, lookY: -.75 }],
    [23.22, 'happy', { eyes: 'look', lookX: .8, lookY: .55 }],
    [24.2, 'proud'],
    [26, 'sleepy'],
    [27, 'happy'],
  ];
  const ENV = { pop: 22.75, catch: 23.12, post: 23.44, posted: 23.7, poof: 23.72 };
  const CARD = pageSlot('skeleton'), CARD_Y = (CARD[1] + CARD[3]) / 2, ENV_S = 1.3, ENV_HW = 40 * ENV_S;
  const CATCH = [5004, 566];
  function envFlight(t) {
    const out = seg(t, ENV.pop, 22.86), fall = seg(t, 22.86, ENV.catch);
    if (fall <= 0) {
      const e = easeOut(out);
      return { x: lerp(MOUTH[0] + 8, 5122, e), y: lerp(MOUTH[1] + 8, 392, e) - 14 * Math.sin(Math.PI * out), rot: lerp(.8, -.35, e) };
    }
    const sw = Math.sin(fall * Math.PI * 1.5) * (1 - fall * .6);
    return { x: lerp(5122, CATCH[0], ease(fall)) + 30 * sw, y: lerp(392, CATCH[1], fall * fall * .6 + fall * .4), rot: -.35 + .5 * sw * (1 - fall * .4) - .15 * fall };
  }
  const SLIDE_X0 = CARD[0] - ENV_HW - 6, SLIDE_X1 = CARD[0] + ENV_HW + 10;
  function envAt(t) {
    if (t < ENV.pop || t >= ENV.posted) return null;
    if (t < ENV.catch) return { ...envFlight(t), flutter: 1, free: true };
    const hold = [CATCH[0] + 16, CATCH[1] - 6], carry = ease(seg(t, 23.28, ENV.post)), slide = lerp(ease(seg(t, ENV.post, ENV.posted)), easeIn(seg(t, ENV.post, ENV.posted)), .5);
    const dip = 22 * Math.sin(Math.PI * seg(t, ENV.catch, 23.3));
    const x = slide > 0 ? lerp(SLIDE_X0, SLIDE_X1, slide) : lerp(hold[0], SLIDE_X0, carry);
    const y = slide > 0 ? CARD_Y : lerp(hold[1] + dip, CARD_Y, carry) - 30 * Math.sin(Math.PI * carry);
    return { x, y, rot: lerp(-.2 + .12 * spring(t, ENV.catch, 8, 24), 0, carry), flutter: 0, free: false };
  }
  const handOnEnv = E => [E.x - ENV_HW + 6, E.y + 8];

  const tapToe = t => { const ph = frac(bpOf(t) * 2); return ph < .22 ? easeOut(ph / .22) : ph < .84 ? 1 : 1 - easeIn((ph - .84) / .16); };

  function deskBolt(t) {
    let mood = RIG.emotions(t, DESK_MOOD);
    if (t < 22.75) mood = { ...mood, heelR: -1.15 * tapToe(t) };
    const E = envAt(t);
    if (t >= 22.8 && t < 24.25) {
      const face = RIG.points(BX, BY, U, mood).face, look = E || { x: CARD[0] + 140, y: CARD_Y };
      const lx = clamp((look.x - face[0]) / 260, -1, 1), ly = clamp((look.y - face[1]) / 260, -1, 1), k = ease(seg(t, 22.8, 22.9)) * (1 - ease(seg(t, 24.05, 24.2)));
      mood = { ...mood, lookX: lerp(mood.lookX || 0, lx, k), lookY: lerp(mood.lookY || 0, ly, k) };
    }
    if (t >= 22.75 && t < 24.3) mood = { ...mood, handL: 'hip', handMixL: 1, gripL: 'fist' };
    if (t >= 22.88 && t < 24.25) {
      const reach = ease(seg(t, 22.88, 23.08)), release = ease(seg(t, 23.72, 24.18));
      const tgt = E && !E.free ? handOnEnv(E) : t < ENV.catch ? [CATCH[0] - 30, CATCH[1] + 12] : [SLIDE_X1 - ENV_HW + 6, CARD_Y + 8];
      const pulled = [lerp(tgt[0], tgt[0] - 40, release), lerp(tgt[1], tgt[1] - 30, release)];
      mood = { ...mood, handR: pulled, handMixR: reach * (1 - release), gripR: t < ENV.catch - .03 ? 'open' : t < 23.7 ? 'grab' : 'open', frontR: true,
        lean: (mood.lean || 0) + .07 * Math.sin(Math.PI * seg(t, 23.25, 23.95)) };
    }
    if (t >= DUST.t0 && t < DUST.t1) mood = { ...mood, ...dustHands(t, mood) };
    mood = yawnPose(t, mood);
    const W = whistlePose(t, mood);
    mood = W.mood;
    if (E && !E.free) envelope(E.x, E.y, ENV_S, { rot: E.rot, key: 'reviews' });
    if (t >= ENV.post && t < ENV.posted + .03) {
      const [x0, y0, x1, y1] = CARD, gulp = Math.sin(Math.PI * seg(t, ENV.post + .1, ENV.posted + .03)), dx = 6 * gulp, dy = 9 * gulp;
      pagePart('skeleton', x0 - dx, y0 - dy, x1 - x0 + 2 * dx, y1 - y0 + 2 * dy, { k: 1, t });
    }
    qwik(BX, BY, U, { ...mood, boilKey: 'bolt' });
    if (W.whistle) {
      whistle(W.whistle.x, W.whistle.y, 1, { blow: W.whistle.blow, key: 'd1' });
      if (W.whistle.pop < .4) sparkle(W.whistle.x - 40, W.whistle.y, .5, W.whistle.pop, { key: 'whistle' });
    }
    if (E && E.free) envelope(E.x, E.y, ENV_S, { rot: E.rot, flutter: E.flutter, key: 'reviews' });
    if (t >= ENV.poof - .02) poof(CARD[0] + 70, CARD_Y, .8, t - ENV.poof, { key: 'swap' });
    if (t >= DUST.t0 && t < DUST.t1 + .4) for (const [i, at] of DUST.puffs.entries()) if (t >= at) {
      const P = RIG.points(BX, BY, U, mood);
      poof(P.handR[0] + 40, P.handR[1] + 4 - 22 * i, .38, t - at, { key: 'dust ' + i, life: .5 });
    }
  }
  const DUST = { t0: 24.92, in: 25.08, out: 25.46, t1: 25.66, puffs: [25.17, 25.33] };
  function dustHands(t, mood) {
    const k = ease(seg(t, DUST.t0, DUST.in)) * (1 - ease(seg(t, DUST.out, DUST.t1))), brush = Math.sin(seg(t, DUST.in, DUST.out) * TAU * 2);
    const hipL = spotOf(mood, 'L', 'hip'), hipR = spotOf(mood, 'R', 'hip'), c = RIG.points(BX, BY, U, mood).face;
    const toL = mix2(hipL, [c[0] - 22, c[1] + 128], k), toR = mix2(hipR, [c[0] + 22, c[1] + 116 + 22 * brush], k);
    return { handL: toL, handMixL: 1, handR: toR, handMixR: 1, gripL: k > .3 ? 'open' : 'fist', gripR: k > .3 ? 'open' : 'fist', frontL: true, frontR: true,
      wristL: .5 * k, wristR: -.3 * k, lenL: .9, lenR: 1 };
  }

  function deskPage(t) {
    const swap = seg(t, ENV.poof - .04, ENV.poof + .86);
    return swap >= 1 ? { parts: FULL, badge: 0, t } : { parts: GREY, badge: 0, swap, t };
  }
  function envBulge(t) { return Math.max(.85 * Math.sin(Math.PI * seg(t, 22.6, 22.8)), .3 * spring(t, 22.8, 9, 30)); }

  const DESK_CAM = [
    [22.5, 'deskMaster'], [22.95, 'deskMaster'], [23.38, [5060, 645, 1.2]], [24.02, [5070, 640, 1.2]], [24.85, [5225, 600, 1.0]],
    [26.0, [5215, 600, 1.0]], [26.45, [5030, 545, 1.0]], [26.95, [5010, 560, 1.03]], [27.4, [4985, 570, 1.0]], [28, [4975, 568, 1.0]],
  ];

  const YAWN = { lift: 26.08, chest: 26.18, head: 26.28, top: 26.46, snap: 26.66, pull: 26.78, drop: 26.94 };
  const spotOf = (mood, side, spot) => RIG.points(BX, BY, U, { ...mood, ['hand' + side]: spot, ['handMix' + side]: 1 })['hand' + side];
  function yawnPose(t, mood) {
    if (t < YAWN.lift - .02 || t > 27.06) return mood;
    const toChest = ease(seg(t, YAWN.lift, YAWN.chest)), toHead = ease(seg(t, YAWN.chest - .02, YAWN.head));
    const upL = ease(seg(t, YAWN.head - .03, YAWN.top)), upR = ease(seg(t, YAWN.head, YAWN.top + .05));
    const pull = seg(t, YAWN.snap, YAWN.pull), drop = ease(seg(t, YAWN.pull - .02, YAWN.drop));
    const boing = spring(t, YAWN.pull - .02, 8, 30), grow = easeOut(seg(t, YAWN.head + .02, YAWN.top + .1));
    const lenK = t < YAWN.snap ? lerp(1, 2.9, grow) : lerp(2.9, 1, easeIn(pull)) - .35 * boing;
    const raised = Math.max(toChest * .5, toHead) * (1 - drop), shiver = t > YAWN.top && t < YAWN.snap ? Math.sin(t * 70) * .03 : 0;
    const mouthOn = seg(t, YAWN.lift + .06, YAWN.head + .04) * (1 - seg(t, YAWN.snap + .02, YAWN.pull + .06));
    const m = {
      ...mood,
      aL: lerp(mood.aL ?? -1.5, 1.28 + shiver, toHead * (1 - drop)), aR: lerp(mood.aR ?? -1.5, 1.1 - shiver, toHead * (1 - drop)),
      bendL: lerp(mood.bendL ?? -.1, .1, raised), bendR: lerp(mood.bendR ?? -.1, -.12, raised),
      lenL: Math.max(.55, lenK), lenR: Math.max(.55, lenK - .2 * grow * (1 - drop)),
      gripL: raised > .3 ? 'fist' : mood.gripL, gripR: raised > .3 ? 'fist' : mood.gripR,
      sq: (mood.sq || 0) - .17 * raised + .16 * Math.max(0, boing) * drop, dy: (mood.dy || 0) - .55 * raised, heelL: .95 * raised, heelR: .75 * raised,
      mouth: mouthOn > .12 ? 'yawn' : mood.mouth, mouthK: mouthOn > .12 ? mouthOn : 1, eyes: raised > .5 ? 'squeeze' : mood.eyes, rot: (mood.rot || 0) + .04 * raised,
    };
    if (t < YAWN.top + .06) {
      const face = RIG.points(BX, BY, U, m).face, rub = seg(t, YAWN.chest, YAWN.head), raised = RIG.points(BX, BY, U, { ...m, handMixL: 0, handMixR: 0 });
      const before = RIG.points(BX, BY, U, mood);
      for (const [S, up, sd, ph] of [['L', upL, -1, 0], ['R', upR, 1, 2.2]]) {
        if (up >= 1) continue;
        const a = rub * TAU * 1.4 + ph, r = 7 * Math.sin(Math.PI * rub), eye = [face[0] + sd * 32 + r * Math.cos(a), face[1] + 8 + .8 * r * Math.sin(a)];
        const top = raised['hand' + S], to = up > 0 ? bez3(eye, [eye[0] + sd * 24, eye[1] - 150], [top[0] - sd * 10, top[1] + 130], top, ease(up)) : eye;
        const from = before['hand' + S], lift = 26 * Math.sin(Math.PI * toChest), hand = toChest < 1 ? [lerp(from[0], to[0], toChest), lerp(from[1], to[1], toChest) - lift] : to;
        m['hand' + S] = hand;
        m['handMix' + S] = 1;
        m['len' + S] = lenFor(m, S, hand, 1.05, .3);
      }
    }
    return m;
  }

  const WH = { grab: 27.04, at: 27.22, blow: 27.24, stop: 27.62, away: 27.84 };
  function mouthOf(mood) {
    const P = RIG.points(BX, BY, U, mood), th = (mood.rot || 0) + (mood.lean || 0);
    return [P.face[0] - 1.45 * U * Math.sin(th), P.face[1] + 1.45 * U * Math.cos(th)];
  }
  function whistlePose(t, mood) {
    if (t < WH.grab) return { mood };
    const blowing = seg(t, WH.blow, WH.blow + .05) * (1 - seg(t, WH.stop, WH.stop + .06));
    const lean = -.1 * ease(seg(t, WH.at - .05, WH.blow + .08)) * (1 - ease(seg(t, WH.stop, WH.away)));
    let m = { ...mood, lean: (mood.lean || 0) + lean, dx: (mood.dx || 0) + .05 * blowing * Math.sin(t * 80) };
    if (blowing > .3) m = { ...m, eyes: 'squeeze', mouth: 'o', blush: .5 };
    if (t > WH.stop) m = { ...m, lookX: -1 * ease(seg(t, WH.stop, WH.stop + .15)), lookY: -.6 * ease(seg(t, WH.stop, WH.stop + .15)), eyes: t > WH.stop + .06 ? 'look' : m.eyes };
    const mouth = mouthOf(m), up = ease(seg(t, WH.grab, WH.at)), down = ease(seg(t, WH.stop + .04, WH.away));
    const low = [mouth[0] - 30, mouth[1] + 150], tip = [lerp(low[0] + 40, mouth[0] - 2, up), lerp(low[1], mouth[1] + 4, up)];
    const held = [lerp(tip[0], low[0] + 30, down), lerp(tip[1], low[1] - 10, down)];
    m = { ...m, handL: [held[0] - 42, held[1] + 14], handMixL: ease(seg(t, WH.grab - .02, WH.grab + .1)), gripL: 'fist', frontL: true, handR: 'hip', handMixR: ease(seg(t, 27.0, 27.2)), gripR: 'fist' };
    return { mood: m, whistle: { x: held[0], y: held[1], blow: blowing, pop: t - WH.grab } };
  }
  function ringsAt(t) {
    const k = seg(t, WH.blow + .04, 27.92);
    if (k <= 0 || k >= 1) return null;
    const u = Math.pow(k, 1.55), P0 = [4710, 545], P1 = [4560, 430], P2 = [4330, 178], P3 = [3925, 156], m = 1 - u;
    const p = [0, 1].map(i => m * m * m * P0[i] + 3 * m * m * u * P1[i] + 3 * m * u * u * P2[i] + u * u * u * P3[i]);
    return { x: p[0], y: p[1] + 6 * Math.sin(t * 17), k: ease(seg(t, WH.blow + .04, WH.blow + .24)) };
  }

  function c3(t) {
    const bulge = envBulge(t);
    camBegin(...camKeys(t, DESK_CAM));
    houseSet(t, { page: deskPage(t), nozzleBulge: bulge });
    tubeGlass(t, { nozzleBulge: bulge });
    deskBolt(t);
    const R = ringsAt(t);
    if (R) soundRings(R.x, R.y, R.k, [-1, -.12], { s: 1.15, key: 'd1 rings' });
    const noz = toScreen(MOUTH[0] - 10, MOUTH[1] + 10);
    camEnd();
    if (t < 22.75) irisTo(.5 + .5 * seg(t, 22.5, 22.75), ...noz);
  }

  const mix2 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
  const add2 = (a, b) => [a[0] + b[0], a[1] + b[1]];
  const rot2 = (p, a) => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a)];
  const bez3 = (a, b, c, d, k) => { const m = 1 - k; return [0, 1].map(i => m * m * m * a[i] + 3 * m * m * k * b[i] + 3 * m * k * k * c[i] + k * k * k * d[i]); };
  const dist2 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const ARM = RIG.K.armLen * U, GLOVE = 1.35 * RIG.K.glove * U;

  function coolAt(t) {
    if (typeof RIG.cool === 'function') return RIG.cool(t);
    const b = _b(t);
    return {
      ...RIG.feel('cool', t), lean: -.1, rot: .015 * b.s1, dy: -.12 * b.hit, sq: .03 * b.hit,
      handL: [4706, 563], gripL: 'open', handMixL: 1, wristL: -.35, lenL: .7,
      aR: -1.3 + .04 * b.s1, bendR: -.35, gripR: 'open', handR: undefined, handMixR: undefined, lenR: 1,
      heelR: .45, legSpread: .92,
    };
  }

  const D3 = { perk: 32.12, reachA: 32.16, grabA: 32.4, liftA: 32.48, inA: 33.0, smug: 33.02, reachB: 33.04, grabB: 33.22, liftB: 33.27, inB: 33.5, swipe: 33.86, cool: 33.96, rest: 34.5 };
  const BIN = { menu: box('menu', 40), heart: box('heart', 40) };
  const D3_MOOD = [
    [31.5, 'happy', { eyes: 'look', lookX: -.8, lookY: -.9 }],
    [D3.smug, 'smug', { lookX: .2, lookY: .15 }],
    [D3.cool, 'cool'],
  ];

  const carryPt = (id, t) => { const s = snailAt(id, t); return snailCarry(s.x, s.y, U, { crawl: s.crawl, duck: s.duck, hide: s.hide, sq: s.sq }); };
  const shellRot = (id, t) => .04 * Math.sin(snailAt(id, t).crawl * TAU + .2);

  function menuBox(t) {
    if (t < D3.liftA || t >= D3.inA) return null;
    const P0 = carryPt('s1', D3.liftA), end = [BIN.menu.x, BIN.menu.y], up = [P0[0] - 4, P0[1] - 22];
    const pop = easeOut(seg(t, D3.liftA, D3.liftA + .09)), k = seg(t, D3.liftA + .07, D3.inA);
    if (k <= 0) return { x: lerp(P0[0], up[0], pop), y: lerp(P0[1], up[1], pop), rot: lerp(shellRot('s1', D3.liftA), .06, pop), squash: -.14 * pop };
    const e = lerp(ease(k), easeOut(k), .3), p = bez3(up, [up[0] + 80, up[1] + 150], [end[0] + 200, end[1] - 30], end, e);
    return { x: p[0], y: p[1], rot: .06 * (1 - k) + .2 * Math.sin(Math.PI * Math.min(1, k * 1.2)), squash: -.14 * (1 - seg(k, 0, .3)) + .1 * seg(k, .9, 1) };
  }
  function heartBox(t) {
    if (t < D3.liftB || t >= D3.inB) return null;
    const P0 = carryPt('s2', D3.liftB), end = [BIN.heart.x, BIN.heart.y], up = [P0[0] + 4, P0[1] - 18];
    const pop = easeOut(seg(t, D3.liftB, D3.liftB + .08)), k = seg(t, D3.liftB + .06, D3.inB);
    if (k <= 0) return { x: lerp(P0[0], up[0], pop), y: lerp(P0[1], up[1], pop), rot: lerp(shellRot('s2', D3.liftB), .06, pop), squash: -.12 * pop };
    const e = ease(k), sw = Math.sin(k * Math.PI * 2) * (1 - k);
    return { x: lerp(up[0], end[0], e) + 14 * sw - 34 * Math.sin(Math.PI * e), y: lerp(up[1], end[1], e), rot: .06 * (1 - k) - .12 * sw, squash: -.1 * Math.sin(Math.PI * k) + .1 * seg(k, .9, 1) };
  }
  const gripA = B => [B.x + 27, B.y - 22];
  const gripB = B => [B.x + 4, B.y - 66];

  function d3Lit(t) {
    const lit = (at) => t < at ? 0 : Math.min(1, easeOut(seg(t, at, at + .16)) + .25 * Math.exp(-(t - at) * 5) * Math.sin(seg(t, at, at + .5) * Math.PI));
    return { menu: lit(D3.inA), heart: lit(D3.inB) };
  }
  function d3Flare(t) {
    for (const [kind, at] of [['menu', D3.inA], ['heart', D3.inB]]) {
      const a = t - at;
      if (a < 0 || a > .6) continue;
      const [x, y] = cubbyCentre(kind);
      boilSeed('d3 flare ' + kind);
      glow(x, y + 6, 170, '#FFC766', .75 * Math.exp(-a * 6));
    }
  }

  function d3Snails(t) {
    for (const [id, kind, until] of [['s1', 'menu', D3.liftA], ['s2', 'heart', D3.liftB]]) {
      const s = snailAt(id, t);
      if (!s.visible || cull(s.x - 70, s.y - 140, s.x + 70, s.y + 20)) continue;
      snail(s.x, s.y, U, {
        shell: s.shell, crawl: s.crawl, carry: t < until ? kind : null, duck: s.duck, hide: s.hide, sweat: s.sweat, droop: s.droop,
        eyes: s.eyes, mouth: s.mouth, lookX: s.look, lookY: s.lookY, seed: s.seed, sq: s.sq,
        emote: s.emote, emoteK: s.emote ? 1 : 0, emoteAge: t + s.seed, boilKey: 'snail-' + id,
      });
    }
  }

  function lookAt(face, p, k = 1) { return { lookX: k * clamp((p[0] - face[0]) / 240, -1, 1), lookY: k * clamp((p[1] - face[1]) / 240, -1, 1) }; }
  function shoulderOf(pose, side) {
    const P = RIG.points(BX, BY, U, pose);
    if (P['shoulder' + side]) return P['shoulder' + side];
    const K = RIG.K, sq = (pose.sq || 0) + (pose.take || 0), rise = -(pose.dy || 0) - sq * K.hipH * .45, th = (pose.rot || 0) + (pose.lean || 0);
    const kx = (pose.sx ?? 1) * (1 + sq * .6), ky = (pose.sy ?? 1) * (1 - sq), S = side === 'L' ? [-7.45, -7.85] : [.15, -7.8];
    const lx = (S[0] - PELV[0]) * kx * U, ly = (S[1] - PELV[1]) * ky * U, px = (K.pelvisX + (pose.dx || 0)) * U, py = -(K.hipH + rise) * U;
    return [BX + px + lx * Math.cos(th) - ly * Math.sin(th), BY + py + lx * Math.sin(th) + ly * Math.cos(th)];
  }
  const lenFor = (pose, side, hand, k = 1.08, min = .6) => Math.max(min, (dist2(shoulderOf(pose, side), hand) - GLOVE) * k / ARM);

  function d3Body(t, m) {
    const C = coolAt(t), lean = ease(seg(t, 33.05, 33.55)), cross = ease(seg(t, 33.3, 33.8));
    const reach = ease(seg(t, D3.reachA - .04, D3.grabA)) * (1 - ease(seg(t, D3.liftA + .1, D3.inA - .05)));
    const crouch = Math.sin(Math.PI * seg(t, D3.inA - .25, D3.inA + .1));
    const wait = 1 - ease(seg(t, D3.reachA - .06, D3.reachA + .1)), perk = take(t, D3.perk, .55);
    const idle = 1 - .7 * Math.max(reach, lean);
    return {
      ...m,
      dy: (m.dy || 0) * idle - .7 * reach + .3 * crouch + perk.dy, sq: (m.sq || 0) * idle - .07 * reach + .06 * crouch + perk.sq,
      rot: (m.rot || 0) * idle,
      lean: -.09 * reach - .03 * crouch + lerp(0, C.lean ?? -.12, lean),
      dx: lerp(0, C.dx ?? 0, lean),
      legSpread: lerp(1, C.legSpread ?? 1, cross),
      heelL: .7 * reach, heelR: lerp(-1.15 * tapToe(t) * wait + .6 * reach, C.heelR || 0, cross),
    };
  }

  function d3LeftArm(t, m) {
    if (t < D3.reachA) return { handL: 'hip', handMixL: 1, aL: -1.6, bendL: -1, gripL: 'fist' };
    const hip = spotOf(m, 'L', 'hip');
    const BA = menuBox(t), onSnail = carryPt('s1', Math.min(t, D3.liftA)), snailGrip = gripA({ x: onSnail[0], y: onSnail[1] });
    if (t < D3.grabA) {
      const k = seg(t, D3.reachA, D3.grabA), to = mix2(hip, snailGrip, lerp(easeOut(k), backOut(k), .45));
      return { handL: to, handMixL: 1, lenL: lenFor(m, 'L', to, 1.03), gripL: k < .4 ? 'fist' : 'open', bendL: .3, frontL: true };
    }
    if (t < D3.inA) {
      const to = BA ? gripA(BA) : snailGrip;
      return { handL: to, handMixL: 1, lenL: lenFor(m, 'L', to, 1.05), gripL: 'grab', bendL: .4, frontL: true };
    }
    const C = coolAt(t), inBin = gripA(BIN.menu), k = ease(seg(t, D3.inA + .06, D3.inA + .36));
    if (k >= 1) return { handL: C.handL, handMixL: 1, lenL: C.lenL, gripL: C.gripL, wristL: C.wristL, viaL: C.viaL, sagL: C.sagL, bendL: C.bendL };
    const arc = Math.sin(Math.PI * k), to = [lerp(inBin[0], C.handL[0], k) + 26 * arc, lerp(inBin[1], C.handL[1], k) - 34 * arc];
    const o = { handL: to, handMixL: 1, lenL: lenFor(m, 'L', to, 1.08), gripL: k < .95 ? 'fist' : 'open', bendL: .5, frontL: true, wristL: lerp(0, C.wristL || 0, ease(seg(k, .5, 1))) };
    if (has('viaL') && C.viaL && C.viaL.length) {
      const sh = shoulderOf(m, 'L'), v = ease(seg(k, .45, 1));
      o.viaL = [mix2(mix2(sh, to, .5), C.viaL[0], v)];
      o.sagL = lerp(1, C.sagL ?? 1, v);
      o.lenL = lerp(o.lenL, C.lenL ?? 1, v);
    }
    return o;
  }

  const viaLen = (sh, vias, hand) => { let L = 0, a = sh; for (const v of [...vias, hand]) { L += dist2(a, v); a = v; } return L; };
  function routeAt(P, k, viaIdx = []) {
    const n = 12, C = through(P, n), S = [0];
    for (let i = 1; i < C.length; i++) S.push(S[i - 1] + dist2(C[i], C[i - 1]));
    const s = clamp(k) * S[S.length - 1];
    let i = 1; while (i < S.length - 1 && S[i] < s) i++;
    const hand = mix2(C[i - 1], C[i], clamp((s - S[i - 1]) / ((S[i] - S[i - 1]) || 1)));
    return { hand, vias: viaIdx.filter(j => S[j * n] <= s).map(j => P[j]) };
  }
  function overHead(m) {
    const P = RIG.points(BX, BY, U, m), sh = P.shoulderR || spotOf(m, 'R', 'hip');
    return { sh, o1: [sh[0] + 46, sh[1] - 175], o2: [P.top[0] + 70, P.top[1] - 125] };
  }
  function craneArm(o, sh, vias, to, slack) {
    if (has('viaR') && vias.length && viaLen(sh, vias, to) > 260) { o.viaR = vias; o.sagR = .45; o.lenR = Math.max(1, viaLen(sh, vias, to) / ARM / slack); }
    else if (has('viaR')) o.lenR = lenFor(o.m, 'R', to, 1.08);
    else { o.lenR = lenFor(o.m, 'R', to, 1.3); o.bendR = -1; }
    delete o.m;
    return o;
  }
  function d3RightArm(t, m) {
    const C = coolAt(t);
    if (t < D3.reachB) return { handR: 'hip', handMixR: 1, aR: -1.6, bendR: -1, gripR: 'fist' };
    const hipR = spotOf(m, 'R', 'hip'), { sh, o1, o2 } = overHead(m);
    const onSnail = carryPt('s2', Math.min(t, D3.liftB)), snailGrip = gripB({ x: onSnail[0], y: onSnail[1] });
    if (t < D3.grabB) {
      const k = seg(t, D3.reachB, D3.grabB), R = routeAt([hipR, o1, o2, [snailGrip[0] + 46, snailGrip[1] - 24], snailGrip], lerp(ease(k), easeOut(k), .4), [1, 2]);
      return craneArm({ m, handR: R.hand, handMixR: 1, gripR: k < .8 ? 'open' : 'grab', frontR: true }, sh, R.vias, R.hand, 1.3);
    }
    if (t < D3.inB + .03) {
      const BB = heartBox(t), to = BB ? gripB(BB) : t < D3.liftB ? snailGrip : gripB(BIN.heart);
      return craneArm({ m, handR: to, handMixR: 1, gripR: t < D3.inB ? 'grab' : 'open', frontR: true }, sh, [o1, o2], to, 1.25);
    }
    const face = RIG.points(BX, BY, U, m).face, th = (m.rot || 0) + (m.lean || 0), bridge = add2(face, rot2([0, -1.26 * U], th));
    const cock = [bridge[0] + 10, bridge[1] - 92], chin = [face[0] + 10, face[1] + 70];
    let o;
    if (t < D3.swipe) {
      const k = ease(seg(t, D3.inB + .03, D3.inB + .26)), R = routeAt([gripB(BIN.heart), [gripB(BIN.heart)[0] + 90, o2[1] - 10], o2, cock], k, [2]);
      const loose = ease(seg(k, .55, 1)), v1 = mix2(o1, mix2(sh, R.hand, .5), loose), hover = 10 * Math.sin(Math.PI * seg(t, D3.inB + .26, D3.swipe));
      const hand = [R.hand[0], R.hand[1] - hover];
      o = craneArm({ m, handR: hand, handMixR: 1, gripR: t < SHADES.pop ? 'open' : 'grab', frontR: true }, sh, loose < .85 ? [v1, ...(R.vias.length ? [] : [o2])] : [], hand, 1.15);
    } else if (t < D3.cool) {
      const to = mix2(cock, bridge, easeIn(seg(t, D3.swipe, D3.cool)));
      o = { handR: to, handMixR: 1, gripR: 'grab', frontR: true, lenR: lenFor(m, 'R', to, 1.1, .3) };
    } else {
      const s = seg(t, D3.cool, D3.cool + .1), h = ease(seg(t, D3.cool + .08, D3.cool + .4)), hip = spotOf(C, 'R', 'hip');
      const to = s < 1 ? mix2(bridge, chin, easeOut(s)) : mix2(chin, hip, h);
      if (h >= 1) return { handR: C.handR, handMixR: 1, gripR: C.gripR, aR: C.aR, bendR: C.bendR, lenR: C.lenR };
      return { handR: to, handMixR: 1, gripR: h > .55 ? 'fist' : 'open', frontR: true, wristR: -.3 * (1 - h), lenR: lenFor(m, 'R', to, 1.05, .3) };
    }
    if (t >= SHADES.pop) {
      const P = RIG.points(BX, BY, U, { ...m, ...o }), ap = P.armPathR, hand = P.handR;
      const wrist = ap && ap.length > 1 ? ap[ap.length - 2] : sh, ang = Math.atan2(hand[1] - wrist[1], hand[0] - wrist[0]);
      const sx = lerp(.1, 1, ease(seg(t, SHADES.pop, SHADES.open))) + .08 * spring(t, SHADES.open, 12, 30), tilt = lerp(-.3, th, ease(seg(t, SHADES.open, D3.cool)));
      o.holdR = (u, sw) => { push(); rotate(tilt - ang); shadesHeld(u, sw, sx); pop(); };
    }
    return o;
  }
  const SHADES = { pop: 33.66, open: 33.84, glint: 34.0 };
  function shadesGlint(t, pose) {
    const age = t - SHADES.glint;
    if (age < 0 || age > .85) return;
    const P = RIG.points(BX, BY, U, pose), th = (pose.rot || 0) + (pose.lean || 0), at = add2(P.face, rot2([2.9 * U, -1.4 * U], th));
    sparkle(at[0], at[1], .72, age, { key: 'shades glint' });
  }
  function shadesHeld(u, sw, sx) {
    const lensX = 2.85 / 1.4, P = pts => pts.map(([a, b]) => [a * 1.4 * sx * u, (b + 7.05) * 1.25 * u]);
    const lens = cx => P([[cx - 1.4, -7.1], [cx + 1.4, -7.1], [cx + 1.3, -6.2], [cx + .8, -5.35], [cx, -5.2], [cx - .8, -5.35], [cx - 1.3, -6.2]]);
    for (const sd of [-1, 1]) inkLine(P([[sd * (lensX + 1.4), -6.85], [sd * (lensX + 2.5), -6.95]]), sw * .8, PAL.ink, 'ink', 0);
    inkLine(P([[1.35 - lensX, -6.75], [0, -7.05], [lensX - 1.35, -6.75]]), sw * .8, PAL.ink, 'ink', .5);
    for (const sd of [-1, 1]) {
      const cx = sd * lensX;
      paint(lens(cx), { wash: '#2A2740', ink: PAL.ink, sw: sw * .9, curv: .3 });
      inkLine(P([[cx - .85, -6.35], [cx - .25, -6.85]]), sw * .45, PAL.cream, 'inkfine', 0);
      inkLine(P([[cx - .45, -5.85], [cx - .05, -6.2]]), sw * .3, PAL.cream, 'inkfine', 0);
    }
  }

  function d3Pose(t) {
    if (t >= D3.rest) return coolAt(t);
    let m = RIG.emotions(t, D3_MOOD);
    const face = RIG.points(BX, BY, U, m).face;
    if (t >= D3.perk && t < D3.smug) {
      const B = menuBox(t), tgt = t < D3.liftA ? carryPt('s1', t) : B ? [B.x, B.y - 28] : [BIN.menu.x, BIN.menu.y - 28];
      m = { ...m, ...lookAt(face, [tgt[0], tgt[1] - 28]), eyes: t < D3.perk + .02 ? m.eyes : 'look' };
    }
    if (t > D3.cool - .12 && t < D3.cool + .2) m.squint = 0;
    m = d3Body(t, m);
    m = { ...m, ...d3LeftArm(t, m) };
    m = { ...m, ...d3RightArm(t, m) };
    if (t >= D3.cool) {
      const C = coolAt(t), k = ease(seg(t, D3.cool, D3.rest));
      for (const f of ['dy', 'sq', 'rot', 'lean', 'dx', 'legSpread', 'heelL', 'heelR']) m[f] = lerp(m[f] ?? 0, C[f] ?? (f === 'legSpread' ? 1 : 0), k);
      m.emoteAge = t;
    }
    return m;
  }

  function d3(t) {
    camBegin(...CAMS.deskMaster);
    houseSet(t, { page: { parts: FULL, badge: 0, t }, cubbyLit: d3Lit(t), clockWhizz: clockWhizz(t) });
    d3Flare(t);
    for (const kind of QUEUE.slice().reverse()) {
      const b = box(kind, t), at = kind === 'heart' ? D3.inB : kind === 'menu' ? D3.inA : null;
      if (b.where !== 'cubby' || (at && t < at)) continue;
      jsBox(b.x, b.y, 1, kind, { squash: at ? .12 * spring(t, at, 7, 18) : b.squash, key: 'queue ' + kind });
    }
    drawSnails(t, id => id !== 's1' && id !== 's2');
    d3Snails(t);
    const BA = menuBox(t), BB = heartBox(t);
    if (BA) jsBox(BA.x, BA.y, 1, 'menu', { rot: BA.rot, squash: BA.squash, noShadow: true, key: 'queue menu' });
    if (BB) jsBox(BB.x, BB.y, 1, 'heart', { rot: BB.rot, squash: BB.squash, noShadow: true, key: 'queue heart' });
    const pose = d3Pose(t);
    qwik(BX, BY, U, { ...pose, boilKey: 'bolt' });
    shadesGlint(t, pose);
    camEnd();
  }

  shots([[17, c1], [22.5, c3], [26, c3], [32, d3]]);
})();
