(() => {
  const Wd = WORLD, ROAD = Wd.roadY, U = 20;
  const mix2 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
  const PAGE_DONE = { parts: { header: 1, hero: 1, card: 1, reviews: 1, footer: 1 }, liked: 1, badge: 0 };

  function camToward(F, s0, z0, s1, z1, k) {
    const z = Math.exp(lerp(Math.log(z0), Math.log(z1), k)), s = mix2(s0, s1, k);
    return [F[0] - (s[0] - W / 2) / z, F[1] - (s[1] - H / 2) / z, z];
  }
  const screenOf = (cam, p) => [W / 2 + (p[0] - cam[0]) * cam[2], H / 2 + (p[1] - cam[1]) * cam[2]];

  function drawLine(t, o = {}) {
    for (const kind of QUEUE.slice().reverse()) {
      const b = box(kind, t);
      if (b.where !== 'line' && b.where !== 'arm') continue;
      if (o.skip && o.skip(kind, b)) continue;
      if (cull(b.x - 60, b.y - 100, b.x + 60, b.y + 20)) continue;
      const add = (o.extra && o.extra(kind, t, b)) || {};
      jsBox(b.x + (add.dx || 0), b.y + (add.dy || 0), 1, kind, {
        hop: add.hop ?? b.hop, wobble: Math.max(b.wobble, add.wobble || 0), rot: b.rot + (add.rot || 0), squash: b.squash + (add.squash || 0),
        emote: add.noEmote ? null : b.emote, emoteK: b.emoteK, emoteAge: b.emoteAge, key: 'queue ' + kind, noShadow: b.leap > 0 || b.where === 'arm',
      });
    }
  }

  // ---------------- C0 · travel (15.5–17.0) ----------------
  const RIDE = { pace: 760, head0: 1862, v0: 1750, tau: .3, t0: 15.5, len: 420, y: Wd.tubeY + 6 };
  const PARCELS_C0 = [[['header', 'hero'], 17.0], ['card', 17.5], ['skeleton', 18.0], ['footer', 18.5]];
  const parcelS = (beat, t) => SETS.tubeLen - RIDE.pace * (beat - t);
  function rideHead(t) {
    const dt = Math.max(0, t - RIDE.t0), e = Math.exp(-dt / RIDE.tau);
    return { x: RIDE.head0 + RIDE.pace * dt + (RIDE.v0 - RIDE.pace) * RIDE.tau * (1 - e), rush: e };
  }
  const RIDE_FACE = [[15.0, 'excited', { eyes: 'squeeze', mouth: 'grin', lookY: 0 }], [15.86, 'excited', { eyes: 'wide', mouth: 'open', lookY: -1 }]];
  function ridePose(t, rush) {
    const f = RIG.emotions(t, RIDE_FACE), relax = ease(seg(t, 15.56, 15.95));
    const sx = lerp(.36, .3, relax), sy = lerp(1.5, 1.17, relax) + .05 * rush, roll = .012 * Math.sin(t * TAU * 1.7);
    const rot = -Math.atan2(-16.301 * sy, -7.475 * sx) + roll;
    return {
      ...RIG.feel('excited', t), eyes: f.eyes, mouth: f.mouth, squint: f.squint, lookX: 0, lookY: f.lookY, blush: f.blush, mood: f.mood,
      tintFrom: f.tintFrom, tintTo: f.tintTo, tintMix: f.tintMix, emote: null, zap: 0,
      dy: 0, sq: .3 * (f.sq || 0) + .03 * pulse(t, 7), dx: 0, lean: 0, rot, sx, sy, legLen: 0, noSpark: true, noShadow: true, boilKey: 'bolt',
    };
  }
  function rideDraw(t) {
    const { x: head, rush } = rideHead(t), pose = ridePose(t, rush), tail = [head - RIDE.len, RIDE.y];
    const gx = tail[0] - 3.72 * U, gy = tail[1] + 1.4 * U, tip = [tail[0] + RIDE.len, tail[1]];
    const pull = ease(seg(t, 15.54, 15.8)), len = Math.max(0, 1 - pull);
    Object.assign(pose, {
      handL: [tip[0] + 34, tip[1] - 9], handR: [tip[0] + 40, tip[1] + 9], handMixL: 1, handMixR: 1,
      gripL: 'open', gripR: 'open', lenL: len, lenR: len, frontL: false, frontR: false,
    });
    if (rush > .05) speedLines(tail[0] + 30, tail[1], 120 + 420 * rush, 1, Math.min(1, rush * 1.6), { spread: 44, key: 'c0 bolt' });
    qwik(gx, gy, U, pose);
  }
  const C0_CAM = [[15.5, [2180, 292, 1.05]], [16.42, [2905, 386, .58]], [17.0, [3150, 380, .6]]];
  function c0Rattle(kind, t, b) {
    const pass = RIDE.t0 + (b.x - 1880) / 1500;
    const k = t > pass ? Math.exp(-(t - pass) * 6) : 0;
    return { wobble: .7 * k, squash: -.12 * spring(t, pass, 8, 30) };
  }
  function shotC0(t) {
    camBegin(...camKeys(t, C0_CAM));
    landSet(t, {});
    towerSet(t, {});
    houseSet(t, { page: { parts: {} } });
    rideDraw(t);
    tubeContents(t, PARCELS_C0.map(([part, beat], i) => ({
      kind: 'parcel', s: parcelS(beat, t), scale: 1.15, key: 'c0 parcel ' + i,
      o: { stretch: .28, dir: 1, part, key: 'p' + (i + 1), noShadow: true, rot: .025 * Math.sin(t * 7 + i * 2.1) },
    })));
    tubeGlass(t);
    drawSnails(t);
    drawLine(t, { extra: c0Rattle });
    camEnd();
  }

  // ---------------- D2 · the line (28.0–32.0) ----------------
  const RING = { x0: 2330, v: 1250, t0: 28, y: 132 };
  const ringX = t => RING.x0 - RING.v * (t - RING.t0);
  const ringPass = x => RING.t0 + (RING.x0 - x) / RING.v;
  function d2Box(kind, t, b) {
    const hit = ringPass(Wd.queueX[kind]) + .02, since = t - hit;
    const o = { squash: -.3 * spring(t, hit, 7, 24), wobble: since > 0 ? Math.exp(-since * 5) : 0 };
    if (t < 29 && b.where === 'line' && !b.leap) o.hop = .75 * ease(seg(t, hit + .05, hit + .35));
    if (kind === 'cart' && t > 30.45) {
      const eager = ease(seg(t, 30.45, 30.9)), ph = frac(bpOf(t) + .2), h = 30 * eager;
      let dy = 0, sq = 0;
      if (ph < .16) sq = .2 * ease(ph / .16);
      else if (ph < .58) { const k = (ph - .16) / .42; dy = -h * 4 * k * (1 - k); sq = -.16 * (1 - Math.abs(2 * k - 1)); }
      else { const q = (ph - .58) * BEAT; sq = .22 * Math.exp(-q * 14) * Math.cos(q * 30); }
      o.hop = lerp(b.hop, 0, eager); o.dy = dy; o.squash = (o.squash || 0) + sq * eager;
      o.rot = eager * (.1 + .07 * Math.sin(bpOf(t) * Math.PI)); o.dx = 6 * eager;
    } else if (t > 30.4 && b.where === 'line' && !b.leap) o.hop = lerp(b.hop, .3, ease(seg(t, 30.4, 30.9)));
    return o;
  }
  const D2_CAM = [[28, [1858, 172, 1.56]], [29.95, [1852, 170, 1.62]], [30.55, [1850, 170, 1.63]], [31.45, [1676, 180, 1.66]], [32, [1668, 180, 1.67]]];
  function shotD2(t) {
    camBegin(...camKeys(t, D2_CAM));
    towerSet(t, {});
    tubeContents(t, []);
    tubeGlass(t);
    drawSnails(t, ['s1', 's2']);
    drawLine(t, { extra: d2Box });
    const rx = ringX(t), k = 1 - ease(seg(rx, 1600, 1360));
    if (k > .01) soundRings(rx, RING.y + 6 * Math.sin(t * 17), k, -1, { s: 1.15, key: 'd2 rings' });
    camEnd();
  }

  // ---------------- E5 · the stretch (44.0–48.0) ----------------
  const ARM_Y = 114, SH_HEAD = { dy: -3.2, rot: -.12 }, ARM_REST = 8.6 * U;
  const RT = [[4744, 360], [4724, 202], [4560, 150], [4430, 138], [4393, ARM_Y]];
  const PLONK = 47, RELEASE = 47.42, ZIP = 47.62;
  const GRIP_AT = [15, -15];
  const gloveReach = grip => (Math.abs((RIG.GRIPS[grip] || RIG.GRIPS.open).wrist) + .35) * RIG.K.glove * U;
  const boxGrip = b => {
    const r = b.rot || 0, c = Math.cos(r), n = Math.sin(r), lx = GRIP_AT[0], ly = -28.5 + GRIP_AT[1];
    return [b.x + lx * c - ly * n, b.y + lx * n + ly * c];
  };
  const boing = t => t < RELEASE ? 0 : 52 * Math.exp(-(t - RELEASE) * 3.2) * Math.sin((t - RELEASE) * TAU * 5);
  function zipX(t, from) {
    const k = seg(t, ZIP, 48.075);
    return from + (5200 - from) * k * k * k;
  }

  function handE5(t) {
    if (t < 45.42) return { p: [reachX(t), ARM_Y], ang: Math.PI, grip: 'open' };
    if (t < 46) {
      const k = ease(seg(t, 45.42, 46.0)), c = boxGrip(box('cart', 46));
      return { p: [reachX(t), lerp(ARM_Y, c[1] - 4, k)], ang: lerp(Math.PI, 2.45, k), grip: t < 45.96 ? 'open' : 'grab' };
    }
    if (t < PLONK) {
      const b = box('cart', t), fly = seg(t, 46.5, 46.92);
      return { p: boxGrip(b), ang: 2.45 + .5 * Math.sin(Math.PI * fly) - .25 * seg(t, 46.92, 47), grip: 'grab', hold: b };
    }
    const b = box('cart', Math.min(t, RELEASE)), top = [b.x, b.y - 57];
    if (t < RELEASE) {
      const lift = ease(seg(t, PLONK, PLONK + .1)), pat = Math.abs(Math.sin(Math.PI * seg(t, 47.1, RELEASE) * 2));
      return { p: [top[0] + 2, top[1] - 36 * lift + 16 * (1 - pat) * lift], ang: 2.2, grip: 'open' };
    }
    const k = ease(seg(t, RELEASE, RELEASE + .16)), from = top[0] + 2 + 60 * ease(seg(t, RELEASE, ZIP));
    return { p: [zipX(t, from), lerp(top[1] - 36, ARM_Y - 40, k) + .85 * boing(t)], ang: lerp(2.2, Math.PI, k), grip: 'open' };
  }
  function viaE5(t, sh, H) {
    const reach = gloveReach(H.grip), dir = [Math.cos(H.ang), Math.sin(H.ang)];
    const wrist = [H.p[0] - dir[0] * reach, H.p[1] - dir[1] * reach], near = [wrist[0] - dir[0] * 60, wrist[1] - dir[1] * 60];
    const R1 = [sh[0] - 50, sh[1] - 86], slack = 1 - ease(seg(t, 44, 44.32));
    const out = [];
    if (slack > .02) out.push(mix2(mix2(sh, R1, .5), [sh[0] + 150, sh[1] + 70], slack));
    out.push(R1);
    for (const p of RT) if (p[0] > near[0] + 50) out.push(p);
    const last = out[out.length - 1], rise = near[1] - ARM_Y;
    for (let x = last[0] - 300; x > near[0] + 420; x -= 300) out.push([x, ARM_Y]);
    if (last[0] - near[0] > 420) out.push([near[0] + 320, ARM_Y + .12 * rise]);
    if (last[0] - near[0] > 240) out.push([near[0] + 140, ARM_Y + .5 * rise]);
    out.push(near, wrist);
    return out;
  }
  function snapWobble(t, via, hand) {
    const a = t < RELEASE ? 0 : 52 * Math.exp(-(t - RELEASE) * 3.2);
    if (a < .5) return via;
    const age = t - RELEASE, P = via.concat([hand]), n = P.length, acc = [0];
    for (let i = 1; i < n; i++) acc.push(acc[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
    const L = acc[n - 1];
    return via.map((p, i) => {
      const fromHand = L - acc[i], fall = Math.max(0, 1 - fromHand / 760);
      return i >= n - 3 ? p : [p[0], p[1] + a * fall * fall * Math.sin(age * TAU * 5 - fromHand / 90)];
    });
  }
  function twang(t, H) {
    const age = t - RELEASE;
    if (age < 0 || age > .4) return;
    boilSeed('e5 twang');
    const k = 1 - age / .4, c = H.p;
    for (const side of [-1, 1]) for (let j = 0; j < 2; j++) {
      const R = 40 + 18 * j + 34 * (1 - k), pts = [];
      for (let i = 0; i <= 6; i++) { const a = (side < 0 ? -Math.PI / 2 : Math.PI / 2) + (i / 6 - .5) * 1.3; pts.push([c[0] + Math.cos(a) * R * .8, c[1] + Math.sin(a) * R]); }
      inkLine(pts, 1.7 * k * (1 - .3 * j), PAL.ink, 'ink', .5);
    }
  }
  function holdCart(H) {
    if (!H.hold) return undefined;
    const b = H.hold;
    return () => {
      scale(1, -1); rotate(-H.ang); rotate(b.rot || 0);
      jsBox(-GRIP_AT[0], 28.5 - GRIP_AT[1], 1, 'cart', { squash: b.squash, key: 'queue cart', noShadow: true });
    };
  }
  const pathLen = P => { let L = 0; for (let i = 1; i < P.length; i++) L += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); return L; };
  const armStretch = t => 1 + .2 * ease(seg(t, 44.0, 45.0)) * (1 - ease(seg(t, RELEASE, 47.9)));

  const E5_START = [4140, 214, .86], E5_POSTER = [3226, 380, .512], E5_DOCK = [1890, 140, 1.15], DOCK_F = [1700, 175], PUSH = 45.55;
  function camRace(t) {
    const k = 1 - Math.pow(1 - seg(t, 44, PUSH), 2.4);
    return [lerp(E5_START[0], E5_POSTER[0], k), lerp(E5_START[1], E5_POSTER[1], k), Math.exp(lerp(Math.log(E5_START[2]), Math.log(E5_POSTER[2]), k))];
  }
  function camE5(t) {
    if (t < PUSH) return camRace(t);
    if (t < 46.05) return camToward(DOCK_F, screenOf(E5_POSTER, DOCK_F), E5_POSTER[2], screenOf(E5_DOCK, DOCK_F), E5_DOCK[2], ease(seg(t, PUSH, 46.05)));
    return [E5_DOCK[0] + 26 * seg(t, 46.05, 48), E5_DOCK[1], E5_DOCK[2] + .025 * seg(t, 46.05, 48)];
  }
  function e5Pose(t) {
    const b = _b(t), tug = Math.sin(Math.PI * seg(t, 44.0, 44.32)), brace = ease(seg(t, 44.22, 44.75));
    const tremble = seg(t, 44.5, 44.8);
    return {
      ...RIG.feel('determined', t), mouth: 'teeth', lookX: -1, lookY: lerp(-.7, -.25, ease(seg(t, 44, 44.6))), seed: 2.2,
      rot: .07 - .07 * tug + .08 * brace + .012 * tremble * Math.sin(t * TAU * 11),
      dx: -.3 - .25 * tug + .55 * brace + .04 * tremble * Math.sin(t * TAU * 13),
      sq: .1 * brace + .02 * b.hit, dy: 0, legSpread: 1.3 + .15 * brace, heelR: .25 * brace,
      shades: SH_HEAD, boilKey: 'bolt',
    };
  }
  function boltE5(t, H) {
    const [bx, by] = Wd.boltDesk, pose = e5Pose(t), P0 = RIG.points(bx, by, U, pose);
    const fist = [P0.shoulderR[0] + 48, P0.shoulderR[1] + 62], dR = Math.hypot(fist[0] - P0.shoulderR[0], fist[1] - P0.shoulderR[1]);
    Object.assign(pose, {
      handR: fist, handMixR: 1, gripR: 'fist', lenR: Math.max(.35, (dR - 39) * 1.08 / ARM_REST),
      holdR: () => clickSpark(.15 * U, 0, 1.05, { state: 'held', r0: 22, key: 'held' }),
      viaL: snapWobble(t, viaE5(t, P0.shoulderL, H), H.p), handL: H.p, handMixL: 1, reachL: 1, sagL: 0,
      gripL: H.grip, holdL: holdCart(H), frontL: false,
    });
    const L = pathLen(RIG.points(bx, by, U, pose).armPathL);
    pose.lenL = L / (ARM_REST * armStretch(t));
    return qwik(bx, by, U, pose);
  }
  const GEAR_TAKE = 46.56;
  function gearTake(kind, t) {
    if (kind !== 'gear' || t < GEAR_TAKE - .08 || t > 47.6) return null;
    const a = t - GEAR_TAKE, hop = a > 0 && a < .26 ? -26 * Math.sin(Math.PI * a / .26) : 0;
    const sq = a < 0 ? .22 * ease(seg(t, GEAR_TAKE - .08, GEAR_TAKE)) : a < .26 ? -.18 * Math.sin(Math.PI * a / .26) : .24 * Math.exp(-(a - .26) * 9) * Math.cos((a - .26) * 34);
    return { dy: hop, squash: sq, rot: a > 0 ? .22 * Math.exp(-a * 4) * Math.sin(a * 26) : 0, noEmote: true, hop: 0 };
  }
  function gearBang(t) {
    const k = seg(t, GEAR_TAKE, GEAR_TAKE + .12) * (1 - seg(t, 47.15, 47.32));
    if (k <= 0) return;
    boilSeed('e5 gear bang');
    emote('!', Wd.queueX.gear + 30, ROAD - 104, 13, k, t - GEAR_TAKE);
  }
  function snailS5(t) {
    const s = snailAt('s5', t);
    if (!s.visible || cull(s.x - 70, s.y - 160, s.x + 70, s.y + 20)) return;
    const a = t - PLONK, plonk = a > 0 ? .3 * Math.exp(-a * 9) * Math.cos(a * 30) : 0, popEyes = a > 0 && a < .45;
    snail(s.x, s.y, U, {
      shell: s.shell, crawl: s.crawl, carry: s.carry, duck: s.duck, hide: s.hide, sweat: s.sweat, droop: s.droop,
      eyes: popEyes ? 'wide' : s.eyes, mouth: popEyes ? 'o' : s.mouth, lookX: popEyes ? .2 : s.look, lookY: popEyes ? -.8 : s.lookY, seed: s.seed, sq: s.sq + plonk,
      emote: s.emote, emoteK: s.emote ? 1 : 0, emoteAge: t + s.seed, boilKey: 'snail-s5',
    });
  }
  function shotE5(t) {
    camBegin(...camE5(t));
    towerSet(t, {});
    houseSet(t, { page: PAGE_DONE, cubbyLit: { menu: 1, heart: 1 }, clockWhizz: 1 });
    tubeContents(t, []);
    tubeGlass(t);
    drawSnails(t, id => id !== 's5');
    snailS5(t);
    const H = handE5(t);
    drawLine(t, { skip: kind => kind === 'cart' && !!H.hold, extra: gearTake });
    gearBang(t);
    drawQueue(t, { where: ['cubby'] });
    if (t < 45.5) speedLines(H.p[0] + 40, H.p[1], 120 + 220 * seg(t, 44, 44.5) * (1 - seg(t, 45.1, 45.5)), -1, 1 - seg(t, 45.1, 45.5), { spread: 54, key: 'e5 race' });
    boltE5(t, H);
    twang(t, H);
    if (t > 47.74) speedLines(H.p[0] - 46, H.p[1] + 4, 140 + 300 * seg(t, 47.74, 47.88), 1, 1, { spread: 44, key: 'e5 zip' });
    camEnd();
  }

  shots([[15.5, shotC0], [28.0, shotD2], [44.0, shotE5]]);
})();
