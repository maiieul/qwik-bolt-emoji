(() => {
  const U = 20;
  const has = f => typeof RIG !== 'undefined' && Array.isArray(RIG.features) && RIG.features.includes(f);
  const mix2 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
  const zoomLerp = (a, b, k) => Math.exp(lerp(Math.log(a), Math.log(b), k));
  const asCam = c => ({ cx: c[0], cy: c[1], zoom: c[2], rot: 0 });
  const camFocus = (wp, sp, z) => [wp[0] - (sp[0] - W / 2) / z, wp[1] - (sp[1] - H / 2) / z, z];

  const ARM_REST = { aL: -1.1, aR: -1.15, bendL: -.35, bendR: -.32, lenL: 1, lenR: 1, wristL: 0, wristR: 0 };
  const ARM_KEYS = ['aL', 'aR', 'bendL', 'bendR', 'lenL', 'lenR', 'wristL', 'wristR', 'gripL', 'gripR', 'handL', 'handR', 'handMixL', 'handMixR'];
  const armsOf = o => { const a = {}; for (const k of ARM_KEYS) if (o[k] !== undefined) a[k] = o[k]; return a; };
  function blendArms(A, B, k) {
    const o = {};
    for (const f in ARM_REST) o[f] = lerp(A[f] ?? ARM_REST[f], B[f] ?? ARM_REST[f], k);
    for (const s of ['L', 'R']) {
      const h = 'hand' + s, m = 'handMix' + s, ha = A[h], hb = B[h];
      o['grip' + s] = k < .5 ? A['grip' + s] || 'open' : B['grip' + s] || 'open';
      if (ha && !hb) { o[h] = ha; o[m] = (A[m] ?? 1) * (1 - k); }
      else if (!ha && hb) { o[h] = hb; o[m] = (B[m] ?? 1) * k; }
      else if (ha && hb && ha !== hb) { o[h] = k < .5 ? ha : hb; o[m] = k < .5 ? 1 - ease(k * 2) : ease(k * 2 - 1); }
      else if (ha) { o[h] = ha; o[m] = 1; }
      else o[h] = null;
    }
    return o;
  }

  const SPOT = [540, 790], REST = [968, 548, 1.1], TITLE = [830, 535];
  const LOGO_TIP = (() => {
    if (!has('legLen')) return [SPOT[0] + 3.72 * U, SPOT[1] - 1.4 * U];
    const f = RIG.points(SPOT[0], SPOT[1], U, { legLen: 0, lenL: 0, lenR: 0 }).face;
    return [f[0] - FACE.x * U, f[1] - FACE.y * U];
  })();
  const LOGO_C = [LOGO_TIP[0] + BODY_CX * U, LOGO_TIP[1] + BODY_CY * U];
  const restScreen = p => [W / 2 + (p[0] - REST[0]) * REST[2], H / 2 + (p[1] - REST[1]) * REST[2]];
  const T_FACE = 1.5, T_WAKE = 1.62, T_OPEN = 1.66, T_BOING = 2.0;

  function camA(t) {
    const zIn = 1.72 + .06 * ease(seg(t, 0, 2.0)), pb = Math.pow(ease(seg(t, 1.96, 2.38)), .55);
    const c = camFocus(LOGO_C, mix2([W / 2, 585], restScreen(LOGO_C), pb), zoomLerp(zIn, REST[2], pb));
    const drift = seg(t, 2.4, 3.4);
    c[0] += 5 * Math.sin(t * .9) * drift; c[1] += 3 * Math.sin(t * .7 + 1) * drift;
    c[2] *= 1 + .02 * ease(seg(t, 3.0, 5.0));
    c[0] -= 1500 * easeIn(seg(t, 5.5, 6.0));
    return c;
  }

  function outlinePath(base, u) {
    const ring = scalePts(roundedPts(base, BOLT_R), u), start = 0, n = ring.length;
    const P = []; for (let i = 0; i <= n; i++) P.push(ring[(start + i) % n]);
    return resample(P, 4);
  }
  function partial(P, s) {
    if (s >= 1) return P;
    const L = pathLength(P), want = s * L, out = [P[0]];
    let acc = 0;
    for (let i = 1; i < P.length; i++) {
      const d = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]);
      if (acc + d >= want) { const k = (want - acc) / (d || 1); out.push([lerp(P[i - 1][0], P[i][0], k), lerp(P[i - 1][1], P[i][1], k)]); return out; }
      acc += d; out.push(P[i]);
    }
    return out;
  }
  function copyOffset(t, land, from) {
    const k = seg(t, land - .26, land);
    if (k <= 0) return null;
    const d = Math.hypot(from[0], from[1]), ux = from[0] / d, uy = from[1] / d, back = 9 * spring(t, land, 7, 26);
    return [from[0] * (1 - easeOut(k)) - ux * back, from[1] * (1 - easeOut(k)) - uy * back];
  }
  const penSpeed = k => {
    const r = .14, v = 1 / (1 - r);
    if (k < r) return v * k * k / (2 * r);
    if (k > 1 - r) return 1 - v * (1 - k) * (1 - k) / (2 * r);
    return v * (k - r / 2);
  };
  function penStroke(P, k, sw, key) {
    if (k <= 0) return;
    const S = partial(resample(P, 2), k);
    boilSeed(key);
    if (pathLength(S) > 1.5) inkLine(S, sw, PAL.ink, 'ink', 0);
  }
  function facePen(u, sw, kEyeL, kEyeR, kSmile, key) {
    const eyeY = (FACE.y + .1) * u, ex = s => (FACE.x + s * 2.5) * u;
    penStroke([[ex(-1) - .8 * u, eyeY], [ex(-1) + .8 * u, eyeY]], kEyeL, sw, key + ' eyeL');
    penStroke([[ex(1) - .8 * u, eyeY], [ex(1) + .8 * u, eyeY]], kEyeR, sw, key + ' eyeR');
    const a = [(FACE.x - .8) * u, -6.31 * u], m = [FACE.x * u, -5.66 * u], b = [(FACE.x + .8) * u, -6.31 * u], c = [2 * m[0] - (a[0] + b[0]) / 2, 2 * m[1] - (a[1] + b[1]) / 2];
    const smile = []; for (let i = 0; i <= 12; i++) { const s = i / 12, r = 1 - s; smile.push([r * r * a[0] + 2 * r * s * c[0] + s * s * b[0], r * r * a[1] + 2 * r * s * c[1] + s * s * b[1]]); }
    penStroke(smile, kSmile, sw * .8, key + ' smile');
  }
  function penFace(t, u, sw) {
    facePen(u, sw, ease(seg(t, T_FACE, T_FACE + .045)), ease(seg(t, T_FACE + .035, T_FACE + .08)), ease(seg(t, T_FACE + .075, T_WAKE)), 'bk pen');
  }

  function paintLogo(t, tip) {
    const u = U, sw = clamp(u / 15, .45, 2.4), tones = boltTones({}), off = SHADOW * u;
    const bump = .035 * (spring(t, 1.0, 9, 30) + spring(t, 1.5, 9, 30));
    const local = ([px, py]) => toScreen(tip[0] + px * (1 + bump), tip[1] - 8 * u + (py + 8 * u) * (1 - bump));
    push(); translate(tip[0], tip[1] - 8 * u); scale(1 + bump, 1 - bump); translate(0, 8 * u);
    boilSeed('bolt bolt body');
    const base = BOLT.map(([px, py]) => [px + jit(.07), py + jit(.07)]);
    const body = scalePts(roundedPts(base, BOLT_R), u), moved = (dx, dy) => body.map(([px, py]) => [px + dx, py + dy]);
    const blue = copyOffset(t, 1.5, [-640, 330]), purple = copyOffset(t, 1.0, [560, -420]);
    boilSeed('bk logo copies');
    const trail = (o, from, land, key) => {
      const k = seg(t, land - .26, land);
      if (k <= .02 || k >= .97) return;
      const speed = 1 - k, d = Math.hypot(from[0], from[1]), ux = from[0] / d, uy = from[1] / d;
      speedLines(BODY_CX * u + o[0] + ux * 120, BODY_CY * u + o[1] + uy * 120, 300 * speed + 60, [-ux, -uy], speed, { key, spread: 150, col: mixCol(PAL.paper, PAL.ink, .55) });
    };
    if (blue) { paint(moved(-off + blue[0], off + blue[1]), { wash: tones.blue.col, washOp: 255, ink: null }); trail([-off + blue[0], off + blue[1]], [-640, 330], 1.5, 'bk blue trail'); }
    if (purple) { paint(moved(off + purple[0], -off + purple[1]), { wash: tones.purple.col, washOp: 255, ink: null }); trail([off + purple[0], -off + purple[1]], [560, -420], 1.0, 'bk purple trail'); }
    const rise = seg(t, .78, 1.2);
    if ((blue || purple) && rise < 1) {
      flushBrush();
      const S = body.map(local);
      push(); resetMatrix(); translate(-W / 2, -H / 2);
      beginClip(); beginShape(); for (const [x, y] of S) vertex(x, y); endShape(CLOSE); endClip();
      image(paperG, 0, 0);
      pop();
    }
    if (rise > 0) {
      const lvl = -lerp(-.2, 16.8, ease(rise)) * u, tilt = .16 * Math.sin((t - .78) * 17) * (1 - rise), cx = -3.7 * u;
      const a = [cx + 20 * u * Math.cos(tilt), lvl + 20 * u * Math.sin(tilt)], b = [cx - 20 * u * Math.cos(tilt), lvl - 20 * u * Math.sin(tilt)];
      const fill = rise >= 1 ? body : clipHalf(body, a, b);
      boilSeed('bk logo fill');
      if (fill.length > 2) paint(fill, { wash: tones.white.col, washOp: 255, ink: null });
      flushBrush();
      const inner = scalePts(roundedPts(insetPts(base, .5), BOLT_R.map(r => r * .6)), u);
      const lowerEdge = scalePts([base[4], base[3]], u), inward = [.68 * 1.3 * u, -.73 * 1.3 * u];
      let shade = clipHalf(inner, ...shiftLine(lowerEdge, inward));
      if (rise < 1 && shade.length > 2) shade = clipHalf(shade, a, b);
      if (shade.length > 2) paint(shade, { fill: tones.white.dk, fillOp: 100, bleed: .03, tex: .6, border: .3, ink: null });
      if (rise < 1 && fill.length > 2) {
        const side = p => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
        const on = fill.filter(p => Math.abs(side(p)) < 1e-3 * u * u).sort((p, q) => p[0] - q[0]);
        if (on.length > 1) {
          const l = on[0], r = on[on.length - 1], m = [(l[0] + r[0]) / 2, (l[1] + r[1]) / 2 + 3 * Math.sin(t * 40)];
          boilSeed('bk logo level');
          inkLine([l, m, r], sw * .7, mixCol(tones.white.dk, PAL.ink, .25), 'inkfine', .6);
        }
      }
    }
    boilSeed('bk logo ink');
    const draw = penSpeed(seg(t, .06, .78)), path = outlinePath(base, u);
    if (draw >= 1) paint(body, { ink: PAL.ink, sw });
    else {
      const P = partial(path, draw), head = P[P.length - 1], blot = backOut(seg(t, .02, .08));
      if (pathLength(P) > 3) inkLine(P, sw, PAL.ink, 'ink', 0);
      if (blot > 0) paint(ellPts(head[0], head[1], sw * 2.4 * blot, sw * 2.4 * blot, 10), { wash: PAL.ink, ink: null });
    }
    if (t >= T_FACE) penFace(t, u, sw);
    pop();
  }

  const KEYS_A = [[T_OPEN, 'happy', { eyes: 'normal', mouth: 'smile' }], [T_BOING, 'excited'], [3.0, 'proud', { eyes: 'normal', lookX: .9, lookY: .15 }], [3.95, 'proud'], [5.0, 'determined', { lookX: -1 }]];
  const T_UR = 2.08, T_UL = 2.15, T_SNAP_R = 2.64, T_SNAP_L = 2.68;

  function legBoing(t) {
    if (t < T_BOING) return 0;
    const a = t - T_BOING;
    if (a < .1) return 1.25 * easeOut(a / .1);
    return 1 + .25 * Math.exp(-6 * (a - .1)) * Math.cos(15 * (a - .1));
  }
  function unrollLen(t, t0, ts, peak = 2) {
    if (t < t0) return 0;
    if (t < ts) return peak * (1.07 * easeOut(seg(t, t0, t0 + .22)) - .07 * ease(seg(t, t0 + .18, t0 + .32))) + .05 * spring(t, t0 + .22, 5, 20);
    const a = t - ts;
    if (a < .06) return lerp(peak, .76, easeIn(a / .06));
    return 1 - .2 * Math.exp(-8 * (a - .06)) * Math.cos(20 * (a - .06));
  }
  const vibrate = (t, ts, amp, k = 9) => t < ts ? 0 : amp * Math.exp(-k * (t - ts)) * (Math.round((t - ts) * 24) % 2 ? -1 : 1);
  function unrollArms(t) {
    const kR = easeOut(seg(t, T_UR, T_UR + .22)), kL = easeOut(seg(t, T_UL, T_UL + .22));
    const jazzR = seg(t, T_UR + .2, T_UR + .3) * (1 - seg(t, T_SNAP_R - .04, T_SNAP_R)), jazzL = seg(t, T_UL + .2, T_UL + .3) * (1 - seg(t, T_SNAP_L - .04, T_SNAP_L));
    return {
      aR: lerp(.85, .2, kR) + .04 * Math.sin((t - T_UR) * TAU * 3) * jazzR - .75 * ease(seg(t, T_SNAP_R + .03, T_SNAP_R + .2)), bendR: lerp(.95, .12, kR) + vibrate(t, T_SNAP_R + .06, .35, 10), lenR: unrollLen(t, T_UR, T_SNAP_R),
      wristR: .35 * Math.sin((t - T_UR) * TAU * 6.5) * jazzR, gripR: 'wave', handR: null,
      aL: lerp(1.5, .72, kL) + .04 * Math.sin((t - T_UL) * TAU * 2.6 + 1) * jazzL - 1.0 * ease(seg(t, T_SNAP_L + .03, T_SNAP_L + .2)), bendL: lerp(.95, .3, kL) + vibrate(t, T_SNAP_L + .06, .35, 10), lenL: unrollLen(t, T_UL, T_SNAP_L),
      wristL: .35 * Math.sin((t - T_UL) * TAU * 5.5 + 1.7) * jazzL, gripL: 'wave', handL: null,
    };
  }
  const WIND_UP = { handR: 'chest', handMixR: 1, gripR: 'fist', aR: -.6, bendR: -.6, lenR: 1, handL: 'hip', handMixL: 1, gripL: 'fist', aL: -1.6, bendL: -1, lenL: 1 };
  const PRESENT = { aR: .05, bendR: -.5, gripR: 'wave', lenR: .8, wristR: -.6, handR: null, handL: 'hip', handMixL: 1, gripL: 'fist', aL: -1.6, bendL: -1, lenL: 1 };
  const CROUCH = { aL: -1.25, bendL: -.7, lenL: .85, gripL: 'fist', aR: -1.0, bendR: .55, lenR: .8, gripR: 'fist', handL: null, handR: null };
  const scramble = t => { const pump = Math.sin((t - 5.25) * TAU * 6); return { aL: .15 + .55 * pump, bendL: .45, lenL: .95, gripL: 'fist', aR: -.75 - .45 * pump, bendR: -.45, lenR: .85, gripR: 'fist', handL: null, handR: null }; };
  const ZIP = { aL: -.5, bendL: .3, lenL: .9, gripL: 'fist', aR: -.05, bendR: .25, lenR: 1.6, gripR: 'open', handL: null, handR: null };

  function presentArms(t) {
    const flick = ring(t, [3.5, 3.75], 7, 20), over = .16 * spring(t, 3.0, 8, 22);
    return { ...PRESENT, aR: PRESENT.aR + over + .05 * flick, wristR: PRESENT.wristR + .3 * flick };
  }
  function armsA(t) {
    if (t < T_UR) return { lenL: 0, lenR: 0, aL: 1.6, aR: .85, bendL: .95, bendR: .95, gripL: 'wave', gripR: 'wave', handL: null, handR: null };
    if (t < 2.84) return unrollArms(t);
    if (t < 2.93) return blendArms(unrollArms(t), WIND_UP, ease(seg(t, 2.84, 2.93)));
    if (t < 3.02) return blendArms(WIND_UP, presentArms(t), ease(seg(t, 2.93, 3.02)));
    if (t < 4.95) return presentArms(t);
    if (t < 5.2) return blendArms(presentArms(4.95), CROUCH, ease(seg(t, 4.95, 5.2)));
    if (t < 5.5) return blendArms(CROUCH, scramble(t), ease(seg(t, 5.2, 5.32)));
    return blendArms(scramble(t), ZIP, ease(seg(t, 5.5, 5.56)));
  }

  function shadowFade(t) { return ease(seg(t, T_OPEN, 1.98)); }
  function logoShadow(t, x, y, k) {
    if (k <= 0) return;
    boilSeed('bolt bolt shadow');
    paint(ellPts(x + BODY_CX * U + 3.72 * U, y + U * .15, U * 4.6 * .93, U * .85 * .93, 22), { fill: PAL.ink, fillOp: 75 * k, bleed: .25, tex: .3, border: .1, ink: null });
  }

  function boltA(t) {
    const mood = RIG.emotions(t, KEYS_A);
    const o = { ...mood, boilKey: 'bolt', lean: 0, legLen: legBoing(t), ...armsA(t) };
    let x = SPOT[0];
    if (t < T_BOING) {
      const alive = ease(seg(t, T_OPEN, 1.9)), wake = t < T_OPEN ? { sq: 0, dy: 0 } : take(t, T_OPEN, .55);
      o.squint = t < T_OPEN ? 1 : Math.max(1 - ease(seg(t, T_OPEN, T_OPEN + .06)), clamp(1 - (T_BOING - t) / .05));
      o.sq = (mood.sq || 0) * alive + wake.sq + .1 * ease(seg(t, T_WAKE, T_OPEN)) * (1 - seg(t, T_OPEN, T_OPEN + .05));
      o.dy = (mood.dy || 0) * alive + wake.dy - .35 * ease(seg(t, T_OPEN, 1.95));
      o.blush = .3 * ease(seg(t, T_OPEN, 1.9));
      o.noSpark = t < T_OPEN; o.noShadow = true; o.emote = null;
    } else if (t < 3.0) {
      o.dy = (mood.dy || 0) * (t < 2.3 ? 1 : .3) - .35;
      const snapJolt = spring(t, T_SNAP_R, 8, 30) + .7 * spring(t, T_SNAP_L, 8, 30);
      o.sq = (mood.sq || 0) + .07 * snapJolt;
      o.rot = (mood.rot || 0) - .03 * snapJolt;
      const look = kf(t, [[2.04, [0, 0]], [2.1, [.9, -.15]], [2.36, [.9, -.15]], [2.42, [-.85, -.7]], [2.62, [-.85, -.7]], [2.74, [.2, -.1]], [2.84, [.2, -.1]], [2.92, [1, .1]]]);
      o.lookX = look[0]; o.lookY = look[1];
      if (t > T_SNAP_R - .01 && t < T_SNAP_L + .08) o.squint = Math.max(o.squint || 0, 1 - seg(t, T_SNAP_L, T_SNAP_L + .08));
    }
    o.sq = (o.sq || 0) + .05 * ring(t, [3.0, 3.5, 3.75], 8, 18);
    if (t >= 5.0) {
      const wind = ease(seg(t, 5.0, 5.25)), scr = seg(t, 5.25, 5.5), zip = seg(t, 5.5, 5.7);
      const turn = take(t, 5.0, .7);
      o.lookX = -1;
      o.sq += .3 * wind * (1 - ease(scr * 2)) - .8 * turn.sq; o.dy -= .8 * turn.dy;
      o.lean = .3 * wind * (1 - ease(scr * 1.5)) - .22 * ease(scr * 1.5);
      if (scr > 0) Object.assign(o, { run: true, walk: (t - 5.25) * 6, walkK: 1, walkDir: -1 });
      if (zip > 0) {
        x -= 2200 * easeIn(zip);
        o.sx = 1 + .7 * Math.sin(Math.PI * Math.min(1, zip * 1.6)); o.sy = 1 - .15 * Math.sin(Math.PI * Math.min(1, zip * 1.6));
      }
    }
    if (t < T_BOING) logoShadow(t, x, SPOT[1], shadowFade(t));
    const P = qwik(x, SPOT[1], U, o);
    if (t >= T_OPEN && t < T_OPEN + .5) sparkle(LOGO_TIP[0] + .15 * U, LOGO_TIP[1] + .9 * U, .55, t - T_OPEN, { key: 'bk ignite' });
    return P;
  }

  function snapLines(t, P) {
    for (const [ts, side, key] of [[T_SNAP_R, 'R', 'bk snap R'], [T_SNAP_L, 'L', 'bk snap L']]) {
      const a = t - ts;
      if (a < .01 || a > .1) continue;
      const k = 1 - a / .1, sh = P['shoulder' + side], hand = P['hand' + side];
      if (!sh || !hand) continue;
      const d = [hand[0] - sh[0], hand[1] - sh[1]], len = Math.hypot(...d) || 1;
      speedLines(hand[0], hand[1], 260 * k, [-d[0] / len, -d[1] / len], k, { key, spread: 34 });
    }
  }

  function dashFx(t) {
    const zip = seg(t, 5.5, 5.75);
    if (t >= 5.28 && t < 5.5) {
      for (let i = 0; i < 3; i++) poof(SPOT[0] + 50 + i * 40, SPOT[1] - 8, .7 + .2 * i, (t - 5.28 - i * .07), { key: 'scramble ' + i, life: .5 });
    }
    if (t >= 5.5) poof(SPOT[0] - 20, SPOT[1] - 10, 1.1, t - 5.5, { key: 'launch', life: .7 });
    if (zip > 0 && zip < 1) {
      const head = SPOT[0] - 2200 * easeIn(seg(t, 5.5, 5.7));
      for (let i = 0; i < 3; i++) speedLines(head + 180, SPOT[1] - 120 - i * 110, Math.min(900, SPOT[0] + 200 - head), -1, 1 - zip, { key: 'zip ' + i, spread: 50 });
    }
  }

  function A1(t) {
    camBegin(...camA(t));
    if (t < T_WAKE) paintLogo(t, LOGO_TIP);
    else { const P = boltA(t); snapLines(t, P); }
    camEnd();
  }

  function A2(t) {
    camBegin(...camA(t));
    titleCard(t, TITLE[0], TITLE[1], 1);
    dashFx(t);
    boltA(t);
    camEnd();
    if (t > 5.75) whip(seg(t, 5.75, 6.0) * .5, -1);
  }

  const KINDS = ['menu', 'heart', 'star', 'share', 'gear', 'cart'];
  const BOLT_END = WORLD.boltDesk;
  const T_PULL = 59.5, T_CLOSE = 60.0, T_JUMP = 60.5, T_LAND = 61.5, T_WINK = 64.0;
  const S_TAKEOFF = [1380, 840], Z_TAKEOFF = .62, S_LAND = [restScreen(SPOT)[0], restScreen(SPOT)[1] - 50], Z_END = REST[2];
  const CAM_TAKEOFF = camFocus(BOLT_END, S_TAKEOFF, Z_TAKEOFF), CAM_END = camFocus(BOLT_END, S_LAND, Z_END);
  const screenOf = (p, c) => toScreen(p[0], p[1], asCam(c));

  function camG1(t) {
    const A = CAMS.deskMaster, B = CAMS.widest, k = ease(seg(t, 58.5, T_PULL));
    let s = mix2(screenOf(BOLT_END, A), screenOf(BOLT_END, B), k), z = zoomLerp(A[2], B[2], k) * (1 - .012 * ease(seg(t, 59.2, T_CLOSE)));
    const p = ease(seg(t, T_CLOSE, T_JUMP));
    s = mix2(s, S_TAKEOFF, p); z = zoomLerp(z, Z_TAKEOFF, p);
    return camFocus(BOLT_END, s, z);
  }
  function flightAt(t) {
    const k = seg(t, T_JUMP, T_LAND), kx = ease(k), ky = k;
    return [lerp(S_TAKEOFF[0], S_LAND[0], kx), lerp(S_TAKEOFF[1], S_LAND[1], ky) - 250 * 4 * k * (1 - k)];
  }
  function camG2(t) {
    const z = zoomLerp(Z_TAKEOFF, Z_END, easeOut(seg(t, T_JUMP, 61.4)));
    const c = camFocus(BOLT_END, t < T_LAND ? flightAt(t) : S_LAND, z);
    const push = 1 + .02 * ease(seg(t, 62.0, 64.0)) + .05 * ease(seg(t, 64.0, 66.2)), F = [880, 560];
    const w = [c[0] + (F[0] - W / 2) / c[2], c[1] + (F[1] - H / 2) / c[2]], zz = c[2] * push;
    return [w[0] - (F[0] - W / 2) / zz, w[1] - (F[1] - H / 2) / zz, zz];
  }

  const coolPose = t => typeof RIG.cool === 'function' ? RIG.cool(t) : RIG.feel('cool', t);
  function worldEnd(t) {
    const lit = {}; for (const k of KINDS) if (box(k, t).where === 'cubby') lit[k] = 1;
    const sent = { header: 1, hero: 1, card: 1, skeleton: 1, footer: 1 };
    towerSet(t, { shelfParts: [], board: { parts: sent, leave: sent, ghost: sent, tick: sent, t } });
    houseSet(t, {
      clockWhizz: clockWhizz(t), cubbyLit: lit,
      page: { parts: { header: 1, hero: 1, card: 1, skeleton: 0, reviews: 1, footer: 1 }, badge: 1, liked: 1, cartPress: 0, cartLit: 1, t },
    });
    drawQueue(t, { where: ['cubby'] });
    drawSnails(t);
  }

  function paperWindow(rect, key) {
    const [x0, y0, x1, y1] = rect;
    if (x1 - x0 < 2 || y1 - y0 < 2) { paperVoid(); return; }
    boilSeed('bk paper ' + key);
    const pts = [], n = 18, rag = (i, a) => a * (Math.sin(i * 2.1 + 1.3) * .6 + (hash(i * 7.7) - .5) + jit(.15));
    for (let i = 0; i <= n; i++) pts.push([lerp(x0, x1, i / n), y0 + rag(i, 7)]);
    for (let i = 1; i < 6; i++) pts.push([x1 + rag(i + 40, 9), lerp(y0, y1, i / 6)]);
    for (let i = n; i >= 0; i--) pts.push([lerp(x0, x1, i / n), y1 + rag(i + 20, 7)]);
    for (let i = 5; i > 0; i--) pts.push([x0 + rag(i + 60, 9), lerp(y0, y1, i / 6)]);
    flushBrush();
    push(); resetMatrix(); translate(-W / 2, -H / 2);
    beginClip({ invert: true });
    beginShape(); for (const [x, y] of pts) vertex(x, y); endShape(CLOSE);
    endClip();
    image(paperG, 0, 0);
    pop();
    boilSeed('bk paper tips ' + key);
    for (let i = 0; i < pts.length; i++) {
      const [x, y] = pts[i], cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      if (x < -60 || x > W + 60 || y < -60 || y > H + 60) continue;
      const dx = cx - x, dy = cy - y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d, tx = -uy, ty = ux;
      const len = 8 + 18 * hash(i * 2.7 + 1), wid = 7 + 9 * hash(i * 5.3);
      paint([[x - tx * wid - ux * 3, y - ty * wid - uy * 3], [x + ux * len, y + uy * len], [x + tx * wid - ux * 3, y + ty * wid - uy * 3]], { wash: PAL.paper, ink: null });
    }
    const edgeCol = mixCol(PAL.paper, '#A8977A', .45);
    for (const c of chunksOf(pts.concat([pts[0]]), 480)) {
      let a = Infinity, b = -Infinity, e = Infinity, f = -Infinity;
      for (const [x, y] of c) { a = Math.min(a, x); b = Math.max(b, x); e = Math.min(e, y); f = Math.max(f, y); }
      if (b < -20 || a > W + 20 || f < -20 || e > H + 20) continue;
      inkLine(c, .6, edgeCol, 'inkfine', .4);
    }
  }

  function closeIn(t, cam) {
    const p = seg(t, T_CLOSE, T_JUMP);
    if (p <= 0) return;
    const tube = toScreen(WORLD.tubeX0, WORLD.tubeY, cam), noz = toScreen(...WORLD.nozzle, cam);
    const band = (WORLD.tubeR + 12) * cam.zoom, cy = tube[1];
    const hy = lerp(Math.max(cy, H - cy) + 80, band, ease(seg(p, 0, .55)));
    const x1 = lerp(W + 80, noz[0] + 24, ease(seg(p, .12, .6)));
    const x0 = lerp(-80, noz[0] + 24, ease(seg(p, .42, .9)));
    paperWindow([x0, cy - hy, x1, cy + hy], 'g1');
  }

  const STAND = { aL: -1.15, aR: -1.2, bendL: -.35, bendR: -.3, lenL: 1, lenR: 1, gripL: 'open', gripR: 'open', handL: null, handR: null };
  const CROUCH_G = { aL: -1.3, aR: -1.38, bendL: -.55, bendR: -.5, lenL: .92, lenR: .92, gripL: 'fist', gripR: 'fist', handL: null, handR: null };
  function boltG1(t) {
    const cool = coolPose(t);
    if (t < 60.1) return { ...cool, boilKey: 'bolt' };
    const up = ease(seg(t, 60.1, 60.3)), dip = ease(seg(t, 60.3, T_JUMP));
    const o = { ...cool, boilKey: 'bolt' };
    for (const f of ['lean', 'rot', 'dx', 'heelR', 'heelL']) o[f] = lerp(cool[f] || 0, 0, up);
    o.legSpread = lerp(cool.legSpread ?? 1, 1.2, up);
    Object.assign(o, t < 60.3 ? blendArms(armsOf(cool), STAND, up) : blendArms(STAND, CROUCH_G, dip));
    o.sq = lerp(cool.sq || 0, 0, up) + .26 * dip;
    o.dy = lerp(cool.dy || 0, 0, up);
    return o;
  }

  const T_LEGS = 60.6, T_ARM_R = 60.68, T_FLOURISH = 60.7, T_REEL = 60.95, T_SNAP_G = 61.13;
  function flightArms(t) {
    const out = easeOut(seg(t, T_FLOURISH, T_FLOURISH + .2)), reel = easeIn(seg(t, T_REEL, T_SNAP_G));
    const wave = Math.sin((t - T_FLOURISH) * TAU * 4) * seg(t, T_FLOURISH + .12, T_FLOURISH + .2) * (1 - reel);
    const lenL = t < T_SNAP_G ? lerp(lerp(1, 3, out), .12, reel) : 0;
    return {
      aL: lerp(1.25, .32, out) + .06 * wave, bendL: lerp(.7, .14, out) + .25 * reel, lenL, gripL: 'wave', wristL: .45 * wave,
      aR: 1.15, bendR: .4, lenR: 1 - easeIn(seg(t, T_ARM_R, T_ARM_R + .08)), gripR: 'fist', handL: null, handR: null,
    };
  }
  const T_PLAIN = 61.62, T_REDRAW = 63.84;
  const faceOff = t => [1 - ease(seg(t, T_PLAIN + .08, T_PLAIN + .16)), 1 - ease(seg(t, T_PLAIN + .1, T_PLAIN + .18)), 1 - ease(seg(t, T_PLAIN, T_PLAIN + .08))];
  const faceOn = t => [ease(seg(t, T_REDRAW, T_REDRAW + .05)), ease(seg(t, T_REDRAW + .04, T_REDRAW + .09)), ease(seg(t, T_REDRAW + .08, T_WINK))];
  function boltG2(t) {
    const mood = RIG.emotions(t, [[T_JUMP, 'excited', { emote: null }], [T_LAND, 'happy', { eyes: 'normal', mouth: 'smile', emote: null }]]);
    const air = t < T_LAND, k = seg(t, T_JUMP, T_LAND);
    const o = { ...mood, boilKey: 'bolt', noShadow: true, legSpread: 1, lean: 0 };
    if (air) {
      Object.assign(o, flightArms(t));
      o.legLen = 1 - easeIn(seg(t, T_LEGS, T_LEGS + .1));
      o.sq = -.2 * Math.exp(-10 * (t - T_JUMP)) + .1 * spring(t, T_LEGS + .1, 10, 32) + .14 * spring(t, T_SNAP_G, 9, 30);
      o.rot = -.16 * Math.sin(Math.PI * k) + .35 * spring(t, T_SNAP_G, 7, 22);
      o.dy = 0;
      if (t > T_SNAP_G - .02 && t < T_SNAP_G + .12) o.squint = 1;
      return o;
    }
    Object.assign(o, { legLen: 0, lenL: 0, lenR: 0, handL: null, handR: null, noShadow: false, emote: null });
    const settle = t - T_LAND, still = 1 - seg(t, T_LAND + .06, T_PLAIN);
    o.sq = .14 * Math.exp(-7 * settle) * Math.cos(17 * settle) * still;
    o.rot = .05 * spring(t, T_LAND, 6, 16) * still;
    o.dy = 0; o.lookX = 0; o.lookY = 0;
    if (t < T_PLAIN) { o.squint = 1; return o; }
    const alive = ease(seg(t, T_WINK, T_WINK + .3));
    o.dy = -.12 * Math.sin((t - T_PLAIN) * TAU * .5) * (1 - alive) + (mood.dy || 0) * .4 * alive;
    if (t < T_WINK) return { ...o, noFace: true, noSpark: true };
    const wink = 1 - ease(seg(t, T_WINK + .42, T_WINK + .5));
    o.eyes = 'normal'; o.mouth = wink > .5 ? 'tongue' : 'smile';
    o.squint = [wink, 1 - ease(seg(t, T_WINK, T_WINK + .05))];
    o.blush = .3 * alive;
    o.rot = .09 * Math.sin(Math.PI * seg(t, T_WINK, T_WINK + .5)) + .03 * spring(t, T_WINK + .48, 7, 18);
    o.sq = (mood.sq || 0) * .4 * alive + .06 * spring(t, T_WINK, 8, 22);
    const [lx, ly] = kf(t, [[T_WINK + .55, [0, 0]], [T_WINK + .7, [.5, -.1]], [T_WINK + 1.1, [.5, -.1]], [T_WINK + 1.25, [0, 0]]]);
    o.lookX = lx; o.lookY = ly;
    return o;
  }

  function lockupPen(t, P) {
    if (t < T_PLAIN || t >= T_WINK || (t > T_PLAIN + .18 && t < T_REDRAW)) return;
    const k = t < T_REDRAW ? faceOff(t) : faceOn(t);
    const tip = [P.face[0] - FACE.x * U, P.face[1] - FACE.y * U];
    push(); translate(...tip);
    facePen(U, clamp(U / 15, .45, 2.4), ...k, 'bk lockup pen');
    pop();
  }

  function groundShadow(cam, k, key) {
    if (k <= 0) return;
    camBegin(...cam);
    boilSeed(key);
    paint(ellPts(BOLT_END[0], BOLT_END[1] + U * .15, U * 4.6 * .93, U * .85 * .93, 22), { fill: PAL.ink, fillOp: 75 * k, bleed: .25, tex: .3, border: .1, ink: null });
    camEnd();
  }

  function zipLines(t, P) {
    if (t < T_LEGS || t > T_ARM_R + .14) return;
    const legK = seg(t, T_LEGS, T_LEGS + .14), armK = seg(t, T_ARM_R, T_ARM_R + .14), hip = P.face;
    if (legK > 0 && legK < 1) for (let i = 0; i < 2; i++) {
      const f = P.feet[i], d = [hip[0] - f[0], hip[1] - f[1]], len = Math.hypot(...d) || 1;
      speedLines(lerp(f[0], hip[0], .45), lerp(f[1], hip[1], .45), 120 * (1 - legK), [d[0] / len, d[1] / len], 1 - legK, { key: 'bk zip leg ' + i, spread: 26 });
    }
    if (armK > 0 && armK < 1 && P.shoulderR) {
      const h = P.handR, d = [P.shoulderR[0] - h[0], P.shoulderR[1] - h[1]], len = Math.hypot(...d) || 1;
      speedLines(h[0], h[1], 110 * (1 - armK), [d[0] / len, d[1] / len], 1 - armK, { key: 'bk zip arm', spread: 26 });
    }
  }

  function snapFx(t, P) {
    const a = t - T_SNAP_G;
    if (a < -.12 || a > .25 || !P.shoulderL) return;
    const sh = P.shoulderL;
    if (a < 0) {
      const d = [P.handL[0] - sh[0], P.handL[1] - sh[1]], len = Math.hypot(...d) || 1;
      speedLines(P.handL[0], P.handL[1], Math.min(len, 260), [-d[0] / len, -d[1] / len], 1, { key: 'bk reel lines', spread: 40 });
      return;
    }
    const b = seg(a, 0, .22);
    if (b >= 1) return;
    boilSeed('bk snap burst');
    for (let i = 0; i < 6; i++) {
      const ang = i / 6 * TAU + .4, r0 = 22 + 40 * easeOut(b), r1 = r0 + 22 * (1 - b);
      inkLine([[sh[0] + Math.cos(ang) * r0, sh[1] + Math.sin(ang) * r0], [sh[0] + Math.cos(ang) * r1, sh[1] + Math.sin(ang) * r1]], 1.6 * (1 - b) + .4, PAL.ink, 'ink', 0);
    }
  }

  function flyingShades(t) {
    const a = t - T_JUMP;
    if (a < 0 || a > .5) return;
    const c0 = asCam(camG2(T_JUMP)), face = RIG.points(...BOLT_END, U, boltG2(T_JUMP)).face, s0 = toScreen(...face, c0);
    const z = c0.zoom * (1 + 1.2 * a), us = U * z, p = [s0[0] + 260 * a, s0[1] - 2200 * a + 1400 * a * a];
    boilSeed('bk shades');
    push(); translate(p[0], p[1]); rotate(a * 15); translate(0, 6.2 * us);
    shades(us, clamp(U / 15, .45, 2.4) * z, {});
    pop();
  }

  function winkTwinkle(t, P) {
    const age = t - (T_WINK + .04);
    if (age < 0 || age > .9) return;
    sparkle(P.face[0] - 2.6 * U, P.face[1] - 1.6 * U, .9, age, { key: 'wink' });
    const tip = [P.face[0] - FACE.x * U + .15 * U, P.face[1] - FACE.y * U + .9 * U];
    sparkle(tip[0], tip[1], .5, age + .04, { key: 'bk reignite' });
  }
  function sparkOut(t, P) {
    const age = t - T_PLAIN;
    if (age < 0 || age > .6) return;
    const tip = [P.face[0] - FACE.x * U + .15 * U, P.face[1] - FACE.y * U + .9 * U];
    poof(tip[0], tip[1] + 6, .32, age, { key: 'bk spark out', life: .5 });
  }

  function fadeToPaper(k) {
    if (k <= 0) return;
    flushLetters(); flushBrush();
    push(); resetMatrix(); translate(-W / 2, -H / 2); tint(255, 255 * clamp(k)); image(paperG, 0, 0); noTint(); pop();
  }

  const CARD_S = [800, 520];
  function G1(t) {
    const c = camG1(t);
    camBegin(...c);
    worldEnd(t);
    camEnd();
    closeIn(t, asCam(c));
    camBegin(...c);
    qwik(...BOLT_END, U, boltG1(t));
    camEnd();
  }
  function G2(t) {
    groundShadow(CAM_TAKEOFF, 1 - ease(seg(t, T_JUMP, T_JUMP + .16)), 'bk shadow takeoff');
    groundShadow(CAM_END, t < T_LAND ? ease(seg(t, 61.15, T_LAND)) : 0, 'bolt bolt shadow');
    const c = camG2(t);
    camBegin(...c);
    if (t >= T_LAND) endCard(t, CAM_END[0] + (CARD_S[0] - W / 2) / CAM_END[2], CAM_END[1] + (CARD_S[1] - H / 2) / CAM_END[2], 1);
    const P = qwik(...BOLT_END, U, boltG2(t));
    lockupPen(t, P);
    sparkOut(t, P);
    zipLines(t, P);
    snapFx(t, P);
    winkTwinkle(t, P);
    camEnd();
    flyingShades(t);
    fadeToPaper(ease(seg(t, 65.5, 65.96)));
  }

  shots([[0, A1], [3.0, A2], [58.5, G1], [60.5, G2]]);
})();
