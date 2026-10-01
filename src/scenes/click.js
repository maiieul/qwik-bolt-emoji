(() => {
  const U = 20, [BX, BY] = WORLD.boltDesk, PG = WORLD.page, LIKE = PG.likeBtn, CART = PG.cartBtn;
  const FULL = { header: 1, hero: 1, card: 1, reviews: 1, footer: 1 };
  const drawEyes = eyes;
  const mix2 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
  const add2 = (a, b) => [a[0] + b[0], a[1] + b[1]];
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const rot2 = (p, a) => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a)];
  const bump = (t, a, b) => Math.sin(Math.PI * seg(t, a, b));
  const decay = (t, at, amt, k) => (t >= at ? amt * Math.exp(-k * (t - at)) : 0);
  const bez2 = (a, c, b, k) => [0, 1].map(i => (1 - k) * (1 - k) * a[i] + 2 * (1 - k) * k * c[i] + k * k * b[i]);
  const bez3 = (a, b, c, d, k) => { const m = 1 - k; return [0, 1].map(i => m * m * m * a[i] + 3 * m * m * k * b[i] + 3 * m * k * k * c[i] + k * k * k * d[i]); };
  const arcDir = (p0, p1, h, k) => [p1[0] - p0[0], p1[1] - p0[1] - 4 * h * (1 - 2 * k)];
  const mixObj = (a, b, k) => Object.fromEntries(Object.keys(a).map(f => [f, lerp(a[f], b[f], k)]));

  const AT = {
    press1: 36.0, catch1: 36.3, flick: 36.78, heart: 37.0, holster: 37.74,
    move2: 38.05, peek: 38.8, press2: 40.0, catch2: 40.3, cubby: 40.48, take: 41.3,
    fist: 42.0, lookUp: 42.62, determined: 43.0, shoot: 43.47,
  };
  const PATS = [40.8, 40.96];
  const fromBolt = (dx, dy, z) => [BX + dx, BY + dy, z];
  const PORT = WORLD.house.x0, ROAD = WORLD.roadY, ARM_Y = ROAD - 112;

  function camAt(t) {
    const c = camKeys(t, [
      [35.0, 'deskMaster'], [36.05, fromBolt(285, -300, 1.2)], [38.55, fromBolt(292, -297, 1.215)], [39.8, fromBolt(356, -270, 1.32)], [40.44, fromBolt(360, -268, 1.325)],
      [41.0, fromBolt(-104, -274, 1.85)], [42.0, fromBolt(-96, -276, 1.865)], [42.45, fromBolt(8, -268, 2.0)], [42.64, fromBolt(6, -272, 2.0)],
      [43.0, fromBolt(220, -448, 1.4)], [43.06, fromBolt(220, -448, 1.4)], [43.45, fromBolt(320, -468, 1.22)],
    ]);
    if (t > 43.45) { const k = easeIn(seg(t, 43.45, 44.0)); c[1] -= 10 * k; c[2] -= .015 * k; }
    c[2] *= 1 + .035 * spring(t, AT.take, 7, 20);
    const [sx, sy] = shakeXY(t, decay(t, AT.take, 7, 9) + decay(t, AT.shoot, 8, 10));
    return [c[0] + sx / c[2], c[1] + sy / c[2], c[2]];
  }

  const pageAt = t => ({
    parts: FULL, badge: 0, t,
    liked: seg(t, AT.heart - .02, AT.heart + .3),
    cartPress: ease(seg(t, AT.press2 - .05, AT.press2)) * (1 - ease(seg(t, AT.press2 + .12, AT.press2 + .3))),
  });
  const cubbyLit = t => Object.fromEntries(QUEUE.map(k => [k, box(k, t).where === 'cubby' ? 1 : 0]));

  const HAND = {
    start: WORLD.handIn, c1: [LIKE[0] + 470, LIKE[1] - 470], c2: [LIKE[0] + 130, LIKE[1] - 270], hover1: [LIKE[0] + 30, LIKE[1] - 50], press1: [LIKE[0] + 2, LIKE[1] - 4],
    rest1: [LIKE[0] + 170, LIKE[1] - 260], hover2: [CART[0] + 24, CART[1] - 54], press2: [CART[0] + 22, CART[1] - 8], rest2: [CART[0] + 40, CART[1] - 90],
  };
  function handAt(t) {
    if (t < 35.95) {
      const k = 1 - Math.pow(1 - seg(t, 35.0, 35.84), 2.0), w = spring(t, 35.84, 11, 26);
      const p = add2(bez3(HAND.start, HAND.c1, HAND.c2, HAND.hover1, k), [-5 * w, 7 * w - 10 * ease(seg(t, 35.88, 35.95))]);
      return { p, rot: lerp(-.34, -.08, ease(seg(t, 35.25, 35.86))), press: 0, lift: 1 };
    }
    if (t < 36.1) {
      const k = easeIn(seg(t, 35.95, AT.press1));
      return { p: mix2(add2(HAND.hover1, [0, -10]), HAND.press1, k), rot: -.08 * (1 - k), press: seg(t, 35.975, AT.press1), lift: 1 - k };
    }
    if (t < AT.move2) {
      const up = ease(seg(t, 36.1, 36.46)), bob = seg(t, 36.4, 36.8);
      const p = bez2(HAND.press1, [HAND.press1[0] + 14, HAND.press1[1] - 170], HAND.rest1, up);
      p[1] += 5 * Math.sin((t - 36.46) * TAU * .55) * bob - 16 * bump(t, AT.heart + .04, AT.heart + .3) + 5 * spring(t, AT.heart + .3, 10, 24);
      return { p, rot: -.16 * up - .03 * Math.sin((t - 36.46) * TAU * .4) * bob, press: 1 - seg(t, 36.1, 36.2), lift: up };
    }
    if (t < 39.86) {
      const k = ease(seg(t, AT.move2, AT.peek)), w = spring(t, AT.peek, 9, 22), hov = seg(t, AT.peek, AT.peek + .3);
      const p = add2(bez2(HAND.rest1, [CART[0] + 90, CART[1] - 150], HAND.hover2, k), [-4 * w, 6 * w]);
      p[1] += 4 * Math.sin((t - AT.peek) * TAU * .9) * hov;
      p[0] += 5 * Math.sin((t - AT.peek) * TAU * .55) * hov;
      return { p, rot: lerp(-.16, -.24, k) + .03 * Math.sin((t - AT.peek) * TAU * .5) * hov, press: 0, lift: 1 };
    }
    if (t < 40.12) {
      const from = handAt(39.859).p, up = ease(seg(t, 39.86, 39.94)), down = easeIn(seg(t, 39.94, AT.press2));
      return { p: mix2(mix2(from, add2(from, [2, -12]), up), HAND.press2, down), rot: lerp(-.24, -.1, down), press: seg(t, 39.975, AT.press2), lift: 1 - down };
    }
    const up = ease(seg(t, 40.12, 40.42)), bob = seg(t, 40.4, 40.8);
    const p = bez2(HAND.press2, [HAND.press2[0] + 8, HAND.press2[1] - 70], HAND.rest2, up);
    p[1] += 4 * Math.sin((t - 40.42) * TAU * .6) * bob;
    return { p, rot: lerp(-.1, -.2, up), press: 1 - seg(t, 40.12, 40.22), lift: up };
  }
  function drawHand(t) {
    const h = handAt(t);
    if (cull(h.p[0] - 90, h.p[1] - 30, h.p[0] + 120, h.p[1] + 250)) return;
    cursorHand(h.p[0], h.p[1], 1.05, {
      pose: h.press > 0 ? 'press' : 'point', press: h.press, rot: h.rot,
      shadow: [8 + 26 * h.lift, 10 + 30 * h.lift, .85 - .3 * h.lift], boilKey: 'hand',
    });
  }

  const SPARK_S = 1.05;
  const FLY1 = { t0: AT.press1, tc: AT.catch1, born: [LIKE[0] - 8, LIKE[1] - 20], up: [LIKE[0] - 20, LIKE[1] - 58], to: [BX + 412, BY - 302], arc: 30 };
  const FLY3 = { t0: AT.press2, tc: AT.catch2, born: [CART[0] + 8, CART[1] - 28], up: [CART[0] - 8, CART[1] - 70], to: [BX + 418, BY - 310], arc: 44 };
  function flight(t, F) {
    const age = t - F.t0;
    if (t < F.t0 + .08) return { p: mix2(F.born, F.up, easeOut(seg(t, F.t0, F.t0 + .08))), state: 'born', age };
    const k = Math.pow(seg(t, F.t0 + .08, F.tc), 1.1);
    return { p: arcPt(F.up, F.to, F.arc, k), state: 'fly', dir: arcDir(F.up, F.to, F.arc, k), age };
  }
  const flickTo = [LIKE[0] - 2, LIKE[1] - 4];
  function flickSpark(t, tip) {
    const k = seg(t, AT.flick, AT.heart);
    return { p: arcPt(tip, flickTo, 46, k), state: 'fly', dir: arcDir(tip, flickTo, 46, k), age: t - AT.flick };
  }
  const heldSpark = (u, sw) => clickSpark(.15 * u, 0, SPARK_S, { state: 'held', r0: 22, key: 'held' });

  const LENS = cx => [[cx - 1.4, -7.1], [cx + 1.4, -7.1], [cx + 1.3, -6.2], [cx + .8, -5.35], [cx, -5.2], [cx - .8, -5.35], [cx - 1.3, -6.2]];
  function drawShades(u, sw, s) {
    const P = pts => pts.map(([a, b]) => [a * u, b * u]), w = s.w, lx = s.L / w, tn = s.turn || 0, far = Math.sign(tn), at = Math.abs(tn);
    const kx = sd => (sd === far ? 1 - .38 * at : 1 + .04 * at), cxOf = sd => sd * lx * (sd === far ? 1 - .2 * at : 1);
    push(); translate((s.dx || 0) * u, ((s.dy || 0) - 6.2) * u); rotate(s.rot || 0); scale(s.sx ?? 1, s.sy ?? 1); translate(0, 6.2 * u);
    drawScaled(w, s.h, () => {
      for (const sd of [-1, 1]) {
        const x0 = cxOf(sd) + sd * 1.4 * kx(sd), len = 1.1 * (sd === far ? 1 - .9 * at : 1 + .6 * at);
        inkLine(P([[x0, -6.85], [x0 + sd * len, -6.95]]), sw * .8, PAL.ink, 'ink', 0);
      }
      inkLine(P([[cxOf(-1) + 1.35 * kx(-1), -6.75], [(cxOf(-1) + cxOf(1)) / 2, -7.05], [cxOf(1) - 1.35 * kx(1), -6.75]]), sw * .8, PAL.ink, 'ink', .5);
      for (const sd of [-1, 1]) {
        const cx = cxOf(sd), k = kx(sd);
        paint(P(LENS(cx).map(([a, b]) => [cx + (a - cx) * k, b])), { wash: '#2A2740', ink: PAL.ink, sw: sw * .9, curv: .3 });
        inkLine(P([[cx - .85 * k, -6.35], [cx - .25 * k, -6.85]]), sw * .45, PAL.cream, 'inkfine', 0);
        inkLine(P([[cx - .45 * k, -5.85], [cx - .05 * k, -6.2]]), sw * .3, PAL.cream, 'inkfine', 0);
      }
    }, [0, -6.2 * u]);
    pop();
  }
  function bodySpan(by) {
    const xs = [];
    for (let i = 0; i < BOLT.length; i++) {
      const a = BOLT[i], b = BOLT[(i + 1) % BOLT.length];
      if (a[1] !== b[1] && (a[1] - by) * (b[1] - by) <= 0) xs.push(a[0] + (b[0] - a[0]) * (by - a[1]) / (b[1] - a[1]));
    }
    return xs.length ? [Math.min(...xs), Math.max(...xs)] : [0, 0];
  }
  function drawBrows(u, sw, B, eyeDy, shift, spread) {
    for (const sd of [-1, 1]) {
      const [lift, tilt] = sd < 0 ? B.L : B.R, y = -7.45 + eyeDy - lift * B.k, d = .4 * tilt * B.k, o = sd * spread * .5;
      const P = [[sd * 1.05 + o, y + d], [sd * 1.85 + o, y - .2 * B.k], [sd * 2.6 + o, y - d]].map(([x, py]) => {
        const [l, r] = bodySpan(py + FACE.y + 6), fx = x + shift + FACE.x;
        return [(clamp(fx, l + .45, r - .45) - FACE.x) * u, py * u];
      });
      inkLine(P, sw * 1.35, PAL.ink, 'ink', .6);
    }
  }
  function faceHook(F) {
    return (u, sw) => {
      const tn = F.turn || 0, shift = tn * 1.15 * u, ey = F.eyeDy || 0;
      push(); translate(FACE.x * u, (FACE.y + 6) * u);
      if (F.blush > .01) { push(); translate(shift, FACE_SPREAD * u); blush(u, sw, { sides: [-1, 1], bx: EYE_X - .2 }, F.blush); pop(); }
      boilSeed('bolt bolt eyes');
      if (F.shades && F.shades.rest) drawShades(u, sw, { ...F.shades, turn: tn, dx: tn * 1.15 });
      else if (!F.eyeSpread) { push(); translate(shift, ey * u); scale(1 - .1 * Math.abs(tn), 1); drawEyes(u, { ...F, eyeFit }, sw, [-1, 1], 0); pop(); }
      else for (const sd of [-1, 1]) { push(); translate(shift + sd * F.eyeSpread * u * (1 - .1 * Math.abs(tn)), ey * u); drawEyes(u, { ...F, eyeFit }, sw, [sd], 0); pop(); }
      if (F.brows) { boilSeed('click brows'); drawBrows(u, sw, F.brows, ey, tn * 1.15, F.eyeSpread || 0); }
      boilSeed('bolt bolt mouth');
      push(); translate(shift * .85, 0);
      drawShifted(((F.mouthDy || 0) + FACE_SPREAD) * u, () => drawScaled(MOUTH_SIZE[0], MOUTH_SIZE[1], () => mouth(u, F.mouth, sw, F.mouthK ?? 1), [0, -4.9 * u]));
      pop();
      if (F.shades && !F.shades.rest) { boilSeed('click shades'); drawShades(u, sw, F.shades); }
      pop();
    };
  }

  const SH_EYES = { dx: 0, dy: 0, rot: 0, w: 1.4, h: 1.25, L: 2.85, sx: 1, sy: 1 };
  const SH_PEEK = { dx: 0, dy: 1.25, rot: .05, w: 1.28, h: 1.2, L: 2.6, sx: 1, sy: 1 };
  const SH_HEAD = { dx: 0, dy: -3.2, rot: -.12, w: 1, h: 1, L: 2.5, sx: 1, sy: 1 };
  const FLY_UP = [AT.take - .02, AT.take + .22];
  function shadesAt(t, tn) {
    if (t < AT.peek) return { ...SH_EYES, rest: true };
    if (t < FLY_UP[0]) {
      const k = backOut(seg(t, AT.peek, AT.peek + .32));
      return { ...mixObj(SH_EYES, SH_PEEK, k), dx: tn * 1.15, turn: tn, rest: k < .02 };
    }
    if (t < FLY_UP[1]) {
      const k = seg(t, ...FLY_UP), e = easeOut(k), from = { ...SH_PEEK, dx: shadesAt(FLY_UP[0] - .001, tn).dx };
      const s = mixObj(from, SH_HEAD, e);
      s.dy -= 2.4 * Math.sin(Math.PI * k);
      s.rot += .55 * Math.sin(TAU * ease(k)) * (1 - k);
      s.sx = 1 - .12 * Math.sin(Math.PI * k); s.sy = 1 + .18 * Math.sin(Math.PI * k);
      return s;
    }
    const land = spring(t, FLY_UP[1], 8, 24), jolt = spring(t, AT.shoot, 9, 26);
    return { ...SH_HEAD, dy: SH_HEAD.dy + .32 * land - .2 * jolt, rot: SH_HEAD.rot + .1 * land + .06 * jolt, sx: 1 + .08 * land, sy: 1 - .1 * land };
  }

  const MOODS = [
    [35.0, 'cool'],
    [AT.peek, 'suspicious', { eyes: 'normal', squint: .3, mouth: 'flat' }],
    [AT.cubby, 'surprised', { eyes: 'normal', mouth: 'o', emote: null }],
    [AT.take, 'scared', {}],
    [42.05, 'nervous', {}],
    [AT.determined, 'determined', { mouth: 'flat' }],
  ];
  const TURN = [
    [36.34, 0], [36.44, -.75], [36.64, -.75], [36.72, .3], [37.3, .3], [37.48, .5], [37.72, .5], [37.95, 0],
    [AT.peek, 0], [38.92, .25], [AT.press2, .25], [40.2, .05], [40.46, .05], [40.58, -.15], [41.22, -.15], [AT.take, 0],
    [42.05, 0], [42.3, .2], [AT.lookUp, .2], [AT.lookUp + .14, -.5], [AT.determined, -.35],
  ];
  function browsAt(t) {
    if (t < AT.peek) return null;
    if (t < AT.cubby) return { k: ease(seg(t, AT.peek + .04, AT.peek + .24)), L: [-.1, .85], R: [.5, -.3] };
    if (t < AT.take) {
      const up = ease(seg(t, AT.cubby, AT.cubby + .15)), worry = ease(seg(t, 40.7, 41.2));
      return { k: 1, L: [lerp(-.1, .35 + .25 * worry, up), lerp(.85, -.4 - .35 * worry, up)], R: [lerp(.5, .35 + .25 * worry, up), lerp(-.3, -.4 - .35 * worry, up)] };
    }
    if (t < AT.determined) return { k: 1, L: [.85, -.8], R: [.85, -.8] };
    const set = ease(seg(t, AT.determined, AT.determined + .12));
    return { k: 1, L: [lerp(.85, -.2, set), lerp(-.8, 1, set)], R: [lerp(.85, -.2, set), lerp(-.8, 1, set)] };
  }
  function faceAt(t, mood) {
    const tn = kf(t, TURN, ease);
    const F = {
      turn: tn, eyes: mood.eyes, squint: mood.squint, lookX: mood.lookX, lookY: mood.lookY, seed: .55, blush: mood.blush,
      mouth: mood.mouth, eyeDy: 0, mouthDy: 0, brows: browsAt(t), shades: shadesAt(t, tn),
    };
    if (t >= AT.peek && t < AT.take) {
      const low = ease(seg(t, AT.peek, AT.peek + .3));
      F.eyeDy = -.5 * low; F.mouthDy = .55 * low; F.eyeSpread = .5 * low;
    }
    if (t >= AT.peek && t < AT.cubby) {
      const follow = ease(seg(t, AT.press2 + .02, AT.catch2 + .05)), hov = seg(t, AT.peek, AT.peek + .3) * (1 - seg(t, 39.86, 40.0));
      F.lookX = lerp(.5 + .12 * Math.sin((t - AT.peek) * TAU * .55) * hov, -.3, follow);
      F.lookY = lerp(.15 + .15 * Math.sin((t - AT.peek) * TAU * .9) * hov, -.1, follow);
    }
    if (t >= AT.cubby && t < AT.take) { F.lookX = -.55; F.lookY = .5; }
    if (t >= 42.05 && t < AT.determined) {
      const up = ease(seg(t, AT.lookUp, AT.lookUp + .14));
      F.lookX = lerp(.45, -1, up); F.lookY = lerp(1, -.9, up);
    }
    if (t >= AT.determined) { F.lookX = -1; F.lookY = -.7; }
    if (t >= AT.shoot - .03) F.mouth = 'teeth';
    if (t >= 37.52 && t < 37.72) F.mouth = 'o';
    return F;
  }

  function bodyAt(t, base, mood) {
    const groove = 1 - ease(seg(t, AT.peek, AT.peek + .2));
    let dy = (base.dy || 0) * groove, sq = (base.sq || 0) * groove, heelR = (base.heelR || 0) * groove;
    let lean = base.lean, dx = base.dx, rot = base.rot || 0, legSpread = base.legSpread;
    lean += .035 * bump(t, 36.08, 36.48) - .05 * bump(t, 36.36, 36.74) + .035 * bump(t, 36.72, 37.05);
    dy += .3 * bump(t, 36.36, 36.74);
    sq += .05 * spring(t, AT.catch1, 9, 30);
    const peek = ease(seg(t, AT.peek, AT.peek + .3)) * (1 - ease(seg(t, AT.cubby - .04, AT.cubby + .14)));
    lean += .06 * peek; dy += .4 * bump(t, AT.peek - .05, AT.peek + .3);
    const sway = peek * seg(t, AT.peek + .2, AT.peek + .6) * (1 - seg(t, AT.press2 - .2, AT.press2));
    lean += .018 * Math.sin((t - AT.peek) * TAU * .5) * sway; dy -= .12 * Math.abs(Math.sin(bpOf(t) * Math.PI)) * sway; dx += .15 * Math.sin((t - AT.peek) * TAU * .25) * sway;
    lean += .035 * bump(t, 40.05, AT.cubby);
    sq += .05 * spring(t, AT.catch2, 9, 30);
    const cub = ease(seg(t, AT.cubby, AT.cubby + .22)) * (1 - ease(seg(t, AT.take - .14, AT.take)));
    lean -= .08 * cub; dy += .5 * cub;
    for (const at of PATS) sq += .035 * spring(t, at, 12, 30);
    if (t >= AT.take - .14) {
      const hop = jump(t, AT.take, AT.take + .28, 1.8), up = ease(seg(t, AT.take - .02, AT.take + .14));
      dy += hop.dy; sq += .6 * hop.sq;
      lean = lerp(lean, 0, up); dx = lerp(dx, .2, up); legSpread = lerp(legSpread, 1.05, up); heelR = 0;
      dx += .12 * Math.sin(t * TAU * 11) * seg(t, AT.take + .25, AT.take + .3) * (1 - seg(t, 41.85, 42.1));
    }
    if (t >= 42.0) {
      const down = ease(seg(t, 42.05, 42.4)), up = ease(seg(t, AT.lookUp, AT.lookUp + .2)), off = 1 - ease(seg(t, AT.determined, AT.determined + .15));
      rot += lerp(.06 * down, -.07, up) * off;
      sq += .05 * down * (1 - up) * off;
      dx += .25 * Math.sin(bpOf(t) * Math.PI) * off * seg(t, 42.1, 42.4);
    }
    if (t >= AT.determined) {
      const set = ease(seg(t, AT.determined, AT.determined + .12)), wind = ease(seg(t, 43.05, 43.4));
      const rel = seg(t, AT.shoot, AT.shoot + .1), brace = ease(seg(t, AT.shoot + .05, AT.shoot + .35));
      legSpread = lerp(legSpread, 1.3, set);
      sq += .1 * wind * (1 - rel) - .1 * Math.sin(Math.PI * rel) + .02 * brace - .06 * take(t, AT.determined, .5).sq;
      rot = lerp(rot, 0, set) + .16 * wind * (1 - rel) - .1 * Math.sin(Math.PI * rel) + .07 * brace;
      dx = lerp(dx, .2, set) + .35 * wind * (1 - rel) - .5 * brace;
      dy += .35 * wind * (1 - rel) - .2 * Math.sin(Math.PI * rel);
    }
    return { dy, sq, heelR, lean, dx, rot, legSpread };
  }

  const ARM = RIG.K.armLen * U, GLOVE = 1.35 * RIG.K.glove * U;
  const lenFor = (sh, to, k) => Math.max(.3, (dist(sh, to) - GLOVE) * k / ARM);
  const armR = (B, to, k = 1.1) => ({ handR: to, handMixR: 1, lenR: lenFor(B.sh, to, k) });
  const armL = (B, to, k = 1.1) => ({ handL: to, handMixL: 1, lenL: lenFor(B.shL, to, k) });

  function reachArm(t, B, F, t0) {
    const k = easeOut(seg(t, t0, F.tc - .03)), aim = flight(Math.min(F.tc, t + .04), F).p, to = mix2(B.hip, aim, k), blend = ease(seg(t, t0, t0 + .08));
    return { handR: to, handMixR: 1, lenR: lerp(.62, lenFor(B.sh, to, .86), blend), bendR: lerp(-.55, .25, blend), wristR: -.3 * k, gripR: t < t0 + .03 ? 'fist' : 'open' };
  }
  function flickArm(t, B) {
    const chest = add2(B.sh, [64, 40]), cock = add2(B.sh, [30, -10]), out = add2(B.sh, [300, 30]), mouthSide = add2(B.face, [146, 76]);
    if (t < 36.64) {
      const k = easeOut(seg(t, AT.catch1, AT.catch1 + .22)), to = add2(mix2(FLY1.to, chest, k), [0, -10 * Math.sin(Math.PI * k)]), m = ease(seg(t, AT.catch1, AT.catch1 + .12));
      return { ...armR(B, to, lerp(.86, 1.1, m)), gripR: 'fist', holdR: heldSpark, bendR: lerp(.25, -.3, m) };
    }
    if (t < 36.74) {
      const k = ease(seg(t, 36.64, 36.73));
      return { ...armR(B, mix2(chest, cock, k), 1.12), gripR: 'fist', holdR: heldSpark, wristR: -.6 * k, bendR: -.3 };
    }
    if (t < 37.3) {
      const k = easeOut(seg(t, 36.74, 36.81)), kick = spring(t, AT.flick + .02, 9, 20), shot = t >= AT.flick;
      const to = add2(mix2(cock, out, k), [-8 * kick, -16 * kick]);
      return { ...armR(B, to, lerp(1.12, 1.0, k)), gripR: shot ? 'point' : 'fist', holdR: shot ? undefined : heldSpark, bendR: lerp(-.3, .2, k),
        aimR: shot ? Math.atan2(flickTo[1] - to[1], flickTo[0] - to[0]) - .35 * kick : undefined, wristR: shot ? undefined : lerp(-.6, 0, k) };
    }
    if (t < AT.holster) {
      const k = ease(seg(t, 37.3, 37.5)), to = mix2(out, mouthSide, k), aimOut = Math.atan2(flickTo[1] - out[1], flickTo[0] - out[0]);
      return { ...armR(B, to, lerp(1.0, 1.1, k)), gripR: 'point', bendR: lerp(.2, -.5, k), frontR: k > .5 ? false : undefined, aimR: lerp(aimOut, -Math.PI / 2 - .2, k) };
    }
    const k = ease(seg(t, AT.holster, 38.02)), twirl = TAU * ease(seg(t, AT.holster, AT.holster + .2)), to = bez2(mouthSide, add2(B.face, [170, 170]), B.hip, k);
    return { handR: to, handMixR: 1, lenR: lerp(lenFor(B.sh, mouthSide, 1.1), .62, k), bendR: lerp(-.5, -.55, k), gripR: t < 37.92 ? 'point' : 'fist',
      aimR: k < 1 ? -Math.PI / 2 - .2 + twirl : undefined, aimMix: 1 - ease(seg(t, 37.9, 38.02)), frontR: k < .8 ? false : undefined };
  }
  function fistArm(t, B) {
    const chest = add2(B.sh, [60, 44]), startle = add2(B.sh, [38, -4]), look = add2(B.face, [60, 96]), low = add2(B.sh, [48, 62]);
    const back = easeOut(seg(t, AT.catch2, AT.catch2 + .22)), m = ease(seg(t, AT.catch2, AT.catch2 + .12));
    let to = add2(mix2(FLY3.to, chest, back), [0, -10 * Math.sin(Math.PI * back)]);
    if (t >= AT.take - .04) to = mix2(chest, startle, backOut(seg(t, AT.take - .04, AT.take + .14)));
    if (t >= AT.fist) to = mix2(startle, look, ease(seg(t, AT.fist, AT.fist + .4)));
    if (t >= AT.determined) to = mix2(look, low, ease(seg(t, AT.determined, AT.determined + .26)));
    const shiver = t > AT.take && t < 42.1 ? 1 - seg(t, 41.8, 42.1) : 0;
    to = add2(to, [3 * Math.sin(t * TAU * 11) * shiver, 2 * Math.sin(t * TAU * 13) * shiver]);
    return { ...armR(B, to, lerp(.86, 1.08, m)), bendR: m < 1 ? lerp(.25, -.3, m) : -.3, gripR: 'fist', holdR: heldSpark, frontR: t >= AT.take && t < AT.determined + .1 ? true : undefined };
  }
  function rightArm(t, B) {
    if (t < 36.08) return {};
    if (t < AT.catch1) return reachArm(t, B, FLY1, 36.08);
    if (t < 38.02) return flickArm(t, B);
    if (t < 40.05) return {};
    if (t < AT.catch2) return reachArm(t, B, FLY3, 40.05);
    return fistArm(t, B);
  }

  const CART_CUBBY = cubbyCentre('cart'), PAT = add2(CART_CUBBY, [56, 35]), EMPTY = add2(CART_CUBBY, [72, -17]);
  const SHOOT = { end: [PORT - 47, ARM_Y], t1: 44.0, vEnd: 1690 };
  const OVER = [[PORT + 330, ROAD - 40], [PORT + 160, ROAD - 76], [PORT + 30, ROAD - 88], [PORT - 7, ARM_Y]];
  function shootPath(sh) {
    const K = add2(sh, [215, -225]);
    const P = [K, [K[0] - 70, K[1] - 95], [PORT + 400, ROAD + 36], ...OVER, SHOOT.end];
    const C = through(P, 8), L = [0];
    for (let i = 1; i < C.length; i++) L.push(L[i - 1] + dist(C[i], C[i - 1]));
    return { C, L, total: L[L.length - 1], K };
  }
  function alongPath(S, d) {
    if (d >= S.total) return [SHOOT.end[0] - (d - S.total), SHOOT.end[1]];
    let i = 1; while (i < S.L.length - 1 && S.L[i] < d) i++;
    return mix2(S.C[i - 1], S.C[i], clamp((d - S.L[i - 1]) / Math.max(1e-6, S.L[i] - S.L[i - 1])));
  }
  function shootDist(S, t) {
    const span = SHOOT.t1 - AT.shoot, tau = clamp((t - AT.shoot) / span), v = SHOOT.vEnd * span / S.total, a = 2 - v;
    return S.total * Math.min(1, a * tau + (1 - a) * tau * tau) + Math.max(0, t - SHOOT.t1) * SHOOT.vEnd;
  }
  const shootRoute = (sh, hand) => [[sh[0] + 8, sh[1] - 140], [PORT + 378, ROAD + 104], ...OVER].filter((p, i) => i < 2 || p[0] > hand[0] + 60);
  function leftArm(t, B) {
    if (t < 40.52) return {};
    if (t < AT.take - .06) {
      const k = ease(seg(t, 40.52, 40.68)), out = ease(seg(t, 41.02, 41.16));
      let lift = 0; for (const at of PATS) lift = Math.max(lift, bump(t, at - .12, at));
      const p = mix2(add2(arcPt(B.coolL, PAT, -34, k), [0, -18 * lift]), EMPTY, out);
      return { handL: p, handMixL: 1, lenL: lerp(.45, lenFor(B.shL, p, 1.15), k), bendL: lerp(-1, -.4, k), gripL: 'open', frontL: false,
        aimL: Math.PI - .12 + .25 * lift - 1.2 * out, wristFromL: .5, aimMixL: k };
    }
    const scared = add2(B.shL, [-150, -70]);
    if (t < 42.05) {
      const k = backOut(seg(t, AT.take - .06, AT.take + .14)), shiver = 1 - seg(t, 41.8, 42.05);
      const p = add2(mix2(EMPTY, scared, k), [5 * Math.sin(t * TAU * 9) * shiver, 4 * Math.sin(t * TAU * 7) * shiver]);
      return { ...armL(B, p), bendL: -.4, gripL: 'wave', aimL: Math.PI - 1.32, wristFromL: .2, aimMixL: 1 - ease(seg(t, AT.take - .06, AT.take + .06)) };
    }
    const hang = add2(B.shL, [-30, 150]);
    if (t < AT.determined) {
      const k = ease(seg(t, 42.05, 42.5));
      return { ...armL(B, mix2(scared, hang, k), 1.12), bendL: lerp(-.4, .5, k), wristL: .2 * (1 - k), gripL: 'open' };
    }
    const S = shootPath(B.shL);
    if (t < AT.shoot) {
      const k = ease(seg(t, 43.02, 43.38)), coil = ease(seg(t, 43.34, AT.shoot)), shake = 2.5 * Math.sin(t * TAU * 19) * seg(t, 43.28, AT.shoot);
      const to = add2(bez2(hang, add2(B.shL, [60, -40]), S.K, k), [14 * coil + shake, -6 * coil]);
      return { ...armL(B, to), gripL: 'fist', frontL: false, bendL: .5 };
    }
    const hand = alongPath(S, shootDist(S, t));
    const o = { handL: hand, handMixL: 1, gripL: 'open', frontL: hand[0] < B.shL[0] + 60, wristL: 0, bendL: .5, lenL: lenFor(B.shL, hand, 1.04) };
    if (hand[1] < 300) { o.viaL = shootRoute(B.shL, hand); o.sagL = .4; }
    return o;
  }

  function moodAt(t) {
    const m = boltEmotions(t, MOODS, { take: 0 });
    if (t < AT.peek) { m.emoteK = undefined; m.emoteAge = undefined; }
    else if (t < AT.peek + .3) { m.emote = 'music'; m.emoteK = 1 - seg(t, AT.peek, AT.peek + .25); m.emoteAge = undefined; }
    return m;
  }
  function boltPose(t) {
    const base = RIG.cool(t), mood = moodAt(t), body = bodyAt(t, base, mood);
    const bodyPose = { ...base, ...body };
    const P = RIG.points(BX, BY, U, bodyPose);
    const B = { sh: P.shoulderR, shL: P.shoulderL, hip: P.handR, coolL: P.handL, face: P.face, top: P.top };
    const F = faceAt(t, mood), R = rightArm(t, B), L = leftArm(t, B);
    const pose = {
      ...bodyPose, ...R, ...L,
      mood: mood.mood, emote: mood.emote, emoteK: mood.emoteK, emoteAge: mood.emoteAge,
      tint: mood.tint, tintK: mood.tintK, tintFrom: mood.tintFrom, tintTo: mood.tintTo, tintMix: mood.tintMix,
      mouth: null, brows: null, shades: null, blush: 0, gloom: 0, draw: faceHook(F), boilKey: 'bolt',
    };
    for (const f of ['aimR', 'aimL', 'aimMix', 'aimMixL', 'wristFromL']) delete pose[f];
    if (R.aimR != null) pose.wristR = aimed(pose, 'R', R.aimR) * (R.aimMix ?? 1);
    if (L.aimL != null) pose.wristL = lerp(L.wristFromL ?? 0, aimed(pose, 'L', L.aimL), L.aimMixL ?? 1);
    return { pose, B, F };
  }
  function aimed(pose, side, ang) {
    const A = RIG.points(BX, BY, U, { ...pose, ['wrist' + side]: 0 })['armPath' + side], h = A[A.length - 1], w = A[A.length - 2];
    const d0 = ang - Math.atan2(h[1] - w[1], h[0] - w[0]), d = Math.atan2(Math.sin(d0), Math.cos(d0));
    return side === 'R' ? d : -d;
  }
  function drawBolt(pose) {
    const keep = eyes;
    eyes = () => {};
    try { return qwik(BX, BY, U, pose); } finally { eyes = keep; }
  }
  function tipOf(pts) {
    const A = pts.armPathR, h = A[A.length - 1], w = A[A.length - 2], ang = Math.atan2(h[1] - w[1], h[0] - w[0]);
    return add2(h, rot2([57, -12], ang));
  }

  function heartPing(t) {
    const a = t - 36.46;
    if (a < 0 || a > .8) return null;
    const sq = a < .16 ? -.22 * Math.sin(Math.PI * a / .16) : .16 * Math.exp(-(a - .16) * 9) * Math.cos((a - .16) * 28);
    return { lift: 14 * bump(t, 36.46, 36.62), sq, lit: bump(t, 36.42, 37.0) };
  }
  function shelfBoxes(t) {
    for (const kind of QUEUE.slice().reverse()) {
      const b = box(kind, t);
      if (b.where !== 'cubby') continue;
      const ping = kind === 'heart' ? heartPing(t) : null;
      push(); if (ping) translate(0, -ping.lift);
      jsBox(b.x, b.y, 1, kind, { hop: b.hop, wobble: b.wobble, rot: b.rot, squash: (b.squash || 0) + (ping ? ping.sq : 0), lit: ping ? ping.lit : 0, emote: b.emote, emoteK: b.emoteK, emoteAge: b.emoteAge, key: 'queue ' + kind });
      pop();
    }
  }
  function cubbyFlare(t) {
    const k = bump(t, 36.4, 36.95);
    if (k <= .01) return;
    const [x, y] = cubbyCentre('heart');
    boilSeed('click flare');
    glow(x, y + 6, 160, '#FFC766', .75 * k);
  }
  function catchTicks(t, at, p) {
    const a = t - at;
    if (a < 0 || a > .16 || !p) return;
    boilSeed('click catch ' + at);
    const b = a / .16;
    for (let i = 0; i < 6; i++) {
      const ang = i / 6 * TAU + .4, r1 = 34 + 26 * easeOut(b), r2 = r1 + 16 * (1 - b);
      inkLine([[p[0] + Math.cos(ang) * r1, p[1] + Math.sin(ang) * r1], [p[0] + Math.cos(ang) * r2, p[1] + Math.sin(ang) * r2]], 1.6 * (1 - .7 * b), PAL.ink, 'ink', 0);
    }
  }
  function burstTicks(t, at, p) {
    const a = t - at;
    if (a < 0 || a > .2) return;
    boilSeed('click burst ' + at);
    const b = a / .2;
    for (let i = 0; i < 5; i++) {
      const ang = -Math.PI / 2 + (i - 2) * .55, r1 = 24 + 34 * easeOut(b), r2 = r1 + 20 * (i % 2 ? .65 : 1) * (1 - .6 * b);
      inkLine([[p[0] + Math.cos(ang) * r1, p[1] + Math.sin(ang) * r1], [p[0] + Math.cos(ang) * r2, p[1] + Math.sin(ang) * r2]], 1.5 * (1 - .7 * b), PAL.ink, 'ink', 0);
    }
  }
  function heartPops(t) {
    const a = t - AT.heart;
    if (a < 0 || a > 1) return;
    boilSeed('click heart pops');
    for (let i = 0; i < 4; i++) {
      const b = clamp((a - .05 * i) / .85);
      if (b <= 0 || b >= 1) continue;
      const ang = -Math.PI / 2 + (i - 1.5) * .55, r = 30 + 70 * easeOut(b), s = (5 + 3 * (i % 2)) * backOut(clamp(b * 4)) * (1 - ease(seg(b, .55, .85)));
      const x = LIKE[0] + Math.cos(ang) * r + 6 * Math.sin(b * 9 + i), y = LIKE[1] - 4 + Math.sin(ang) * r - 26 * b;
      if (s > 2) paint(heartPts(x, y, s), { wash: '#E2476E', ink: PAL.ink, sw: .55 * Math.min(1, s / 5) });
    }
  }
  function smoke(t, pts) {
    if (t < 37.36 || t > 37.86) return;
    const tip = tipOf(pts), grow = ease(seg(t, 37.36, 37.5)), blow = ease(seg(t, 37.55, 37.74)), fade = 1 - ease(seg(t, 37.68, 37.86));
    const P = [];
    for (let i = 0; i < 6; i++) {
      const f = i / 5, rise = 64 * grow * f;
      P.push([tip[0] + 9 * Math.sin(f * 6 + t * 8) * f + 70 * blow * f * f, tip[1] - 4 - rise + 26 * blow * f * f]);
    }
    boilSeed('click smoke');
    paint(ribbon(P, 13 * fade + 2, 5 * fade + 1), { wash: '#F6F1FA', washOp: 240 * fade, ink: PAL.ink, sw: .7 * fade, curv: .4 });
    const top = P[P.length - 1];
    paint(ellPts(top[0] + 4, top[1] - 4, 9 * fade + 1, 8 * fade + 1, 12), { wash: '#F6F1FA', washOp: 240 * fade, ink: PAL.ink, sw: .7 * fade });
  }
  function fistGlow(t, pts) {
    const k = ease(seg(t, AT.fist, AT.fist + .3)) * (1 - ease(seg(t, AT.determined - .05, AT.determined + .3)));
    if (k <= .01) return;
    boilSeed('click fist glow');
    glow(pts.handR[0], pts.handR[1], 150 + 30 * Math.sin(t * TAU * 2.5), '#FFC957', .55 * k);
  }
  function bang(t, pts) {
    const age = t - AT.take;
    if (age < 0 || age > .9) return;
    boilSeed('click bang');
    emote('!', pts.top[0] - 18, pts.top[1] - 46, U * 1.35, seg(age, 0, .1) * (1 - seg(age, .7, .9)), age);
  }
  function recoilLines(t, at, pts) {
    const k = seg(t, at + .02, at + .18);
    if (k <= 0 || k >= 1) return;
    speedLines(pts.handR[0] + 20, pts.handR[1], 130 * (1 - k), [-1, .06], 1 - k, { key: 'recoil ' + at, spread: 30 });
  }
  function dust(t) {
    poof(PAT[0] - 18, PAT[1] + 12, .3, t - PATS[1], { key: 'pat dust', life: .55 });
    for (const at of PATS) {
      const a = t - at;
      if (a < 0 || a > .14) continue;
      boilSeed('pat ' + at);
      const k = a / .14;
      for (const ang of [-2.2, -1.6, -1.0]) {
        const r1 = 30 + 12 * k, r2 = r1 + 12 * (1 - k);
        inkLine([[PAT[0] + Math.cos(ang) * r1, PAT[1] + 6 + Math.sin(ang) * r1], [PAT[0] + Math.cos(ang) * r2, PAT[1] + 6 + Math.sin(ang) * r2]], 1.3 * (1 - .6 * k), PAL.cream, 'ink', 0);
      }
    }
  }
  function whoosh(t, pts) {
    if (t < AT.shoot + .01) return;
    const A = pts.armPathL, h = A[A.length - 1], w = A[Math.max(0, A.length - 4)];
    speedLines(h[0], h[1], 220, [h[0] - w[0], h[1] - w[1]], 1, { key: 'shoot', spread: 46 });
  }

  function scene(t) {
    camBegin(...camAt(t));
    houseSet(t, { page: pageAt(t), cubbyLit: cubbyLit(t), clockWhizz: 1 });
    cubbyFlare(t);
    shelfBoxes(t);
    drawSnails(t);
    const [hx, hy] = cubbyCentre('heart');
    sparkle(hx + 4, hy - 26, .9, t - 36.48, { key: 'click heart' });
    const { pose } = boltPose(t);
    const pts = drawBolt(pose);
    fistGlow(t, pts);
    catchTicks(t, AT.catch1, pts.handR);
    catchTicks(t, AT.catch2, pts.handR);
    recoilLines(t, AT.catch1, pts);
    recoilLines(t, AT.catch2, pts);
    burstTicks(t, AT.press1, FLY1.born);
    burstTicks(t, AT.press2, FLY3.born);
    smoke(t, pts);
    heartPops(t);
    dust(t);
    bang(t, pts);
    whoosh(t, pts);
    let sp = null;
    if (t >= AT.press1 && t < AT.catch1) sp = flight(t, FLY1);
    else if (t >= AT.flick && t < AT.heart) sp = flickSpark(t, tipOf(drawlessPoints(AT.flick)));
    else if (t >= AT.press2 && t < AT.catch2) sp = flight(t, FLY3);
    if (sp) clickSpark(sp.p[0], sp.p[1], SPARK_S, { state: sp.state, age: sp.age, dir: sp.dir, trail: 60, key: 'free' });
    drawHand(t);
    camEnd();
  }
  const drawlessPoints = t => RIG.points(BX, BY, U, boltPose(t).pose);

  shots([[35.0, scene], [38.0, scene], [40.0, scene], [42.0, scene]]);
})();
