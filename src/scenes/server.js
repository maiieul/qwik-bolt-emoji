(() => {
  const Wd = WORLD, U = 20, BD = Wd.board, BX = Wd.boltServer[0] - 55, BY = Wd.boltServer[1], DBX = Wd.db[0] - 40, DBY = Wd.db[1];
  const MOUTH = SETS.horn.mouth;
  const CLOCK = [DBX + 134, 942], CLOCK_S = .8;
  const PIPE = [Wd.requestPipe[0] + 5, Wd.requestPipe[1]];
  const B = (dx, dy) => [BX + dx, BY + dy];
  const CATCH = B(83, -368);
  const PIN = { x: BD.x0 + 6, y: BD.y0 + 18, rot: -.16, s: .85 };
  const PIN_HOLD = [PIN.x, PIN.y + 43 * PIN.s - 12];
  const SLIP_S = 1.25, SLAP_T = .22, TUBE_V = 760;

  const mid = r => [(r[0] + r[2]) / 2, (r[1] + r[3]) / 2];
  const shelfAt = k => mid(SETS.shelfSlot(k));
  const slotAt = k => mid(boardSlot(k));
  const rigHas = f => Array.isArray(RIG.features) && RIG.features.includes(f);

  function upright() {
    // p5 2.x internals; if gone, the held slip tilts silently.
    const r = window.p5 && p5.instance && p5.instance._renderer, m = r && r.states && r.states.uModelMatrix, a = m && m.mat4;
    if (!a) return;
    scale(1, Math.sign(a[0] * a[5] - a[1] * a[4]) || 1);
    rotate(-Math.atan2(a[1], a[0]));
  }

  const PARTS = {
    header: { grab: 8.82, release: 8.87, slap: 9.0, send: 10.02, rel: B(-60, -595) },
    hero: { grab: 9.3, release: 9.35, slap: 9.5, send: 10.02, rel: B(-30, -610) },
    card: { grab: 10.74, release: 10.8, slap: 11.0, send: 13.14, rel: B(-75, -570) },
    skeleton: { grab: 13.32, release: 13.37, slap: 13.52, send: 13.84, rel: B(-35, -590) },
    footer: { grab: 14.02, release: 14.08, slap: 14.25, send: 14.52, rel: B(-75, -550) },
  };
  const SENDS = [
    { t: 10.02, parts: ['header', 'hero'], arrive: 17.0 },
    { t: 13.14, parts: ['card'], arrive: 17.5 },
    { t: 13.84, parts: ['skeleton'], arrive: 18.0 },
    { t: 14.52, parts: ['footer'], arrive: 18.5 },
  ];
  const CUT = 15.5;

  const HIP_L = { handL: 'hip', gripL: 'fist', aL: -1.6, bendL: -1 };
  const MOODS = [[4, 'determined', HIP_L], [6.5, 'thinking', HIP_L], [8.5, 'determined', HIP_L], [12.0, 'confused'], [13.0, 'smug'], [13.5, 'determined', HIP_L], [14.8, 'excited']];
  const GAZE = [
    [6.0, -1, .1], [6.55, -1, -.35], [6.95, -.7, .9], [7.35, 1, -.15], [7.78, -.25, -1],
    [8.04, .3, -.6], [8.14, .85, -.45], [8.52, .55, -1], [8.72, -1, -.6], [8.86, 1, -.5],
    [9.18, -1, -.7], [9.34, 1, -.3], [10.15, 1, -.9], [10.62, -1, -.2], [10.8, 1, .1],
    [11.3, -.9, .7], [12.62, -.9, .8], [12.95, 0, 0], [13.14, 1, .2], [13.22, -1, -.2],
    [13.32, 1, .4], [13.92, -1, .1], [14.08, 1, .6], [14.5, 1, .3], [14.62, 1, -.1],
  ];
  function saccade(t, keys, dur = .08) {
    let i = 0; while (i + 1 < keys.length && t >= keys[i + 1][0]) i++;
    const cur = keys[i], prev = keys[Math.max(0, i - 1)], k = i ? ease(seg(t, cur[0], cur[0] + dur)) : 1;
    return [lerp(prev[1], cur[1], k), lerp(prev[2], cur[2], k)];
  }

  function pokePoint(bubble, S) {
    const [bx, by, r] = bubble || [DBX + 29, DBY - 73, 24], tip = [bx + r * .9, by - r * .2];
    const d = [tip[0] - S[0], tip[1] - S[1]], l = Math.hypot(d[0], d[1]) || 1;
    return [tip[0] - d[0] / l * 56, tip[1] - d[1] / l * 56];
  }

  const PULL = B(70, -292), JAB = B(272, -300), JAB2 = B(262, -296);
  const jab = t0 => [[t0 - .13, PULL, 'open', ease], [t0 - .01, JAB, 'point', easeOut], [t0 + .26, JAB2, 'point']];
  const KN_ON = [DBX + 104, 850], KN_OFF = [DBX + 132, 828], KNOCKS = [11.54, 11.68], SIDE_L = B(-168, -380);
  const ARMS = {
    R: [
      { t0: 7.97, t1: 10.62, keys: [
        [7.97, 'mood'], [8.1, CATCH, 'open', easeOut], [8.13, CATCH, 'grab'], [8.22, B(95, -342), 'grab', easeOut],
        [8.45, B(137, -392), 'grab'], [8.5, B(137, -392), 'grab'], [8.66, PIN_HOLD, 'grab', ease], [8.68, PIN_HOLD, 'point'],
        [8.72, [PIN.x + 2, PIN.y + 20], 'point', easeOut], [8.78, [PIN.x + 2, PIN.y + 22], 'point'],
        [9.0, () => slotAt('header'), 'open', easeIn], [9.1, () => slotAt('header'), 'open'], [9.3, B(275, -400), 'open'],
        [9.5, () => slotAt('hero'), 'open', easeIn], [9.74, () => slotAt('hero'), 'open'],
        ...jab(10.02), [10.62, 'mood'],
      ] },
      { t0: 10.74, t1: 11.42, keys: [[10.74, 'mood'], [11.0, () => slotAt('card'), 'open', easeIn], [11.12, () => slotAt('card'), 'open'], [11.42, 'mood']] },
      { t0: 12.86, t1: 14.9, keys: [
        [12.86, 'mood'], ...jab(13.14),
        [13.52, () => slotAt('skeleton'), 'open', easeIn], [13.62, () => slotAt('skeleton'), 'open'],
        ...jab(13.84),
        [14.25, () => slotAt('footer'), 'open', easeIn], [14.34, () => slotAt('footer'), 'open'],
        ...jab(14.52), [14.9, 'mood'],
      ] },
    ],
    L: [
      { t0: 8.7, t1: 9.16, keys: [[8.7, 'mood'], [8.8, () => shelfAt('header'), 'open', easeOut], [8.82, () => shelfAt('header'), 'grab'], [8.87, PARTS.header.rel, 'grab', easeIn], [8.95, B(15, -640), 'open', easeOut], [9.04, SIDE_L, 'open'], [9.16, 'mood']] },
      { t0: 9.18, t1: 9.64, keys: [[9.18, 'mood'], [9.28, () => shelfAt('hero'), 'open', easeOut], [9.3, () => shelfAt('hero'), 'grab'], [9.35, PARTS.hero.rel, 'grab', easeIn], [9.43, B(35, -650), 'open', easeOut], [9.52, SIDE_L, 'open'], [9.64, 'mood']] },
      { t0: 10.62, t1: 11.1, keys: [[10.62, 'mood'], [10.72, () => shelfAt('card'), 'open', easeOut], [10.74, () => shelfAt('card'), 'grab'], [10.8, PARTS.card.rel, 'grab', easeIn], [10.88, B(-5, -620), 'open', easeOut], [10.97, SIDE_L, 'open'], [11.1, 'mood']] },
      { t0: 11.22, t1: 12.98, keys: [
        [11.22, 'mood'], [11.46, KN_OFF, 'fist', easeOut], [11.54, KN_ON, 'fist', easeIn], [11.61, KN_OFF, 'fist', easeOut], [11.68, KN_ON, 'fist', easeIn],
        [11.78, KN_OFF, 'fist', easeOut], [12.26, [KN_OFF[0] + 8, KN_OFF[1] - 8], 'fist'], [12.4, [DBX + 124, 808], 'point'],
        [12.5, 'poke', 'point', easeIn], [12.6, 'poke', 'point'], [12.78, B(-105, -220), 'open', easeOut], [12.98, 'mood'],
      ] },
      { t0: 13.16, t1: 13.68, keys: [
        [13.16, 'mood'], [13.3, () => shelfAt('skeleton'), 'open', easeOut], [13.32, () => shelfAt('skeleton'), 'grab'],
        [13.37, PARTS.skeleton.rel, 'grab', easeIn], [13.45, B(35, -640), 'open', easeOut], [13.54, SIDE_L, 'open'], [13.68, 'mood'],
      ] },
      { t0: 13.88, t1: 14.38, keys: [[13.88, 'mood'], [14.0, () => shelfAt('footer'), 'open', easeOut], [14.02, () => shelfAt('footer'), 'grab'], [14.08, PARTS.footer.rel, 'grab', easeIn], [14.16, B(-5, -610), 'open', easeOut], [14.25, SIDE_L, 'open'], [14.38, 'mood']] },
    ],
  };
  function armAt(t, side, ctx) {
    for (const w of ARMS[side]) {
      if (t < w.t0 || t > w.t1) continue;
      const K = w.keys;
      let i = 0; while (i + 1 < K.length && t >= K[i + 1][0]) i++;
      const j = Math.min(K.length - 1, i + 1), pt = key => {
        const v = key[1];
        if (v === 'mood') return ctx.mood[side];
        if (v === 'poke') return pokePoint(ctx.bubble, ctx.shoulderL);
        return typeof v === 'function' ? v(t) : v;
      };
      const k = j === i ? 1 : (K[j][3] || ease)(seg(t, K[i][0], K[j][0]));
      const a = pt(K[i]), b = pt(K[j]);
      let grip = null;
      for (let g = i; g >= 0 && !grip; g--) grip = K[g][2] || null;
      return { p: [lerp(a[0], b[0], k), lerp(a[1], b[1], k)], grip: grip || 'open' };
    }
    return null;
  }

  function slipHeld(t) {
    if (t < 8.13 || t >= 8.66) return null;
    const k = ease(seg(t, 8.5, 8.66));
    return { s: lerp(SLIP_S, PIN.s, k), dy: lerp(-43 * SLIP_S + 12, 0, k), rot: lerp(.12, PIN.rot, k), curl: lerp(.35, 0, seg(t, 8.13, 8.32)) };
  }

  function boltPose(t, ctx) {
    const mood = RIG.emotions(t, MOODS);
    const o = { ...mood, boilKey: 'bolt', rim: 1 };
    [o.lookX, o.lookY] = saccade(t, GAZE);
    if (t > 7.74 && t < 8.6) o.emoteK = (o.emoteK ?? 1) * (1 - seg(t, 7.74, 7.86));
    const startle = take(t, 7.8, .55), nod = Math.sin(Math.PI * seg(t, 10.4, 10.62));
    o.sq = (o.sq || 0) + startle.sq + .05 * nod; o.dy = (o.dy || 0) + startle.dy; o.rot = (o.rot || 0) + .07 * nod;
    o.lean = (o.lean || 0) - .08 + lerp(.035, .09, seg(t, 6.6, 6.8) * (1 - seg(t, 7.7, 7.8))) * o.lookX;
    for (const P of Object.values(PARTS)) if (t > P.slap) o.sq = (o.sq || 0) + .07 * Math.exp(-10 * (t - P.slap)) * Math.cos(18 * (t - P.slap));
    const shrug = Math.sin(Math.PI * seg(t, 12.9, 13.2));
    o.dy = (o.dy || 0) - .7 * shrug; o.rot = (o.rot || 0) - .1 * shrug;
    if (shrug > 0) o.bendR = .9;
    const moodPts = RIG.points(BX, BY, U, o);
    ctx.mood = { L: moodPts.handL, R: moodPts.handR };
    ctx.shoulderL = moodPts.shoulderL || B(-100, -283);
    for (const side of ['L', 'R']) {
      const A = armAt(t, side, ctx);
      if (!A) continue;
      o['hand' + side] = A.p; o['handMix' + side] = 1; o['grip' + side] = A.grip;
    }
    const held = slipHeld(t);
    if (held) o.holdR = () => { upright(); slip(0, held.dy, held.s, { rot: held.rot, curl: held.curl, key: 'req' }); };
    return o;
  }

  const skidX = t => t < 6.5 ? BX + 4360 * Math.pow(6.5 - t, 2) : BX;
  function skid(t, o) {
    if (t >= 6.8) return BX;
    const moving = t < 6.5, x = skidX(t);
    o.lean = moving ? .42 * (1 - ease(seg(t, 6.38, 6.5))) : -.3 * spring(t, 6.47, 6, 14) + o.lean * seg(t, 6.6, 6.8);
    o.dx = moving ? 1.6 * (1 - ease(seg(t, 6.4, 6.5))) : 0;
    o.heelL = -1.2 * (1 - seg(t, 6.5, 6.6)); o.heelR = -1 * (1 - seg(t, 6.5, 6.6));
    o.legSpread = moving ? .8 : lerp(.8, 1, seg(t, 6.5, 6.6));
    o.sq = moving ? -.04 : (o.sq || 0) + .18 * Math.exp(-9 * (t - 6.5)) * Math.cos(20 * (t - 6.5));
    const k = moving ? 0 : ease(seg(t, 6.5, 6.78)), flail = { aL: 2.15, aR: .12, bendL: -.6, bendR: .55 };
    for (const f in flail) o[f] = lerp(flail[f], o[f] ?? flail[f], k);
    for (const s of ['L', 'R']) {
      o['handMix' + s] = o['hand' + s] ? (o['handMix' + s] ?? 1) * k : 0;
      if (k < .5) o['grip' + s] = 'wave';
    }
    if (moving) { o.lookX = -1; o.lookY = .1; }
    return x;
  }

  function boardState(t) {
    const parts = {}, leave = {}, ghost = {}, tick = {};
    for (const [k, P] of Object.entries(PARTS)) {
      if (t >= P.slap + SLAP_T) parts[k] = 1;
      if (t >= P.send) {
        leave[k] = seg(t, P.send, P.send + .38);
        ghost[k] = 1;
        tick[k] = seg(t, P.send + .38, P.send + .78);
      }
    }
    return { parts, leave, ghost, tick, t };
  }
  const shelfParts = t => Object.keys(PARTS).filter(k => t < PARTS[k].grab);
  const gulpAt = t => SENDS.reduce((g, S) => Math.max(g, Math.sin(Math.PI * seg(t, S.t + .05, S.t + .55))), 0);

  function parcelS(S, t) {
    const t0 = S.t + .3, onTime = x => SETS.tubeLen - TUBE_V * (S.arrive - x), behind = onTime(t0) - 60;
    return onTime(t) - behind * (1 - ease(seg(t, t0, CUT)));
  }
  function parcels(t) {
    const items = [];
    SENDS.forEach((S, i) => {
      if (t < S.t + .3) return;
      const s = parcelS(S, t), v = (parcelS(S, t + .01) - parcelS(S, t - .01)) / .02;
      const stretch = s > SETS.tubeS(1360) ? clamp(.12 + (v - TUBE_V) / 3000, 0, .45) : 0;
      items.push({ kind: 'parcel', s, scale: .9, key: 'parcel ' + i, o: { stretch, dir: 1, part: S.parts, key: 'parcel ' + i } });
    });
    return items;
  }

  function looseParts(t, ctx) {
    for (const [k, P] of Object.entries(PARTS)) {
      if (t < P.grab || t >= P.slap + SLAP_T) continue;
      const S = SETS.shelfSlot(k), D = boardSlot(k), sw = S[2] - S[0], sh = S[3] - S[1], dw = D[2] - D[0], dh = D[3] - D[1];
      let c, w = sw, h = sh, rot = 0, sx = 1, sy = 1;
      if (t < P.release) c = ctx.handL || shelfAt(k);
      else if (t < P.slap) {
        const q = seg(t, P.release, P.slap);
        c = arcPt(P.rel, mid(D), 70, q); w = lerp(sw, dw, easeOut(q)); h = lerp(sh, dh, easeOut(q)); rot = -.3 * Math.sin(Math.PI * q);
      } else {
        const a = t - P.slap, q = .22 * Math.exp(-12 * a) * Math.cos(28 * a);
        c = mid(D); w = dw; h = dh; sy = 1 - q; sx = 1 + q * .35;
      }
      push(); translate(c[0], c[1]); rotate(rot); scale(sx, sy);
      pagePart(k, -w / 2, -h / 2, w, h, { key: 'board', t, badge: k === 'header' ? 0 : undefined });
      pop();
    }
  }
  function slapMarks(t) {
    for (const [k, P] of Object.entries(PARTS)) {
      const a = t - P.slap;
      if (a < 0 || a > .2) continue;
      const D = boardSlot(k), [cx, cy] = mid(D), q = a / .2;
      boilSeed('slap marks ' + k);
      for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
        const y = cy + (i - 1) * 14, x0 = s < 0 ? D[0] - 8 - 26 * easeOut(q) : D[2] + 8 + 26 * easeOut(q);
        inkLine([[x0, y + (i - 1) * 4], [x0 + s * 16 * (1 - q), y + (i - 1) * 7]], 1.6 * (1 - q), PAL.cream, 'ink', 0);
      }
    }
  }

  function lampOnMark() {
    glow(BX + 30, BY - 250, 360, '#FFC766', .4);
    push(); translate(BX + 20, BY - 6); scale(1, .3); glow(0, 0, 240, '#FFC766', .45); pop();
  }
  function knockMarks(t) {
    for (const k of KNOCKS) {
      const a = t - k;
      if (a < 0 || a > .2) continue;
      boilSeed('knock ' + k);
      const q = a / .2, c = [KN_ON[0] - 16, KN_ON[1] - 6];
      for (let i = 0; i < 3; i++) {
        const ang = -2.45 + i * .45, r0 = 30 + 22 * easeOut(q), r1 = r0 + 18 * (1 - q);
        inkLine([[c[0] + Math.cos(ang) * r0, c[1] + Math.sin(ang) * r0], [c[0] + Math.cos(ang) * r1, c[1] + Math.sin(ang) * r1]], 1.6 * (1 - q) + .3, PAL.ink, 'ink', 0);
      }
    }
  }
  function drawSlipFree(t) {
    if (t < 8.0 || t >= 8.13 && t < 8.66) return;
    if (t < 8.13) {
      const k = seg(t, 8.0, 8.13), to = [CATCH[0], CATCH[1] - 43 * SLIP_S + 12], p = arcPt(PIPE, to, -16, easeOut(k));
      slip(p[0], p[1], lerp(.7, SLIP_S, k), { curl: lerp(.95, .35, k), rot: lerp(.9, .12, k), key: 'req' });
      return;
    }
    const a = t - 8.72, q = a > 0 ? .16 * Math.exp(-14 * a) * Math.cos(30 * a) : 0;
    slip(PIN.x, PIN.y, PIN.s, { rot: PIN.rot, pin: t >= 8.72, key: 'req', sy: 1 - q, sx: 1 + q * .3 });
  }

  function skidFx(t, x) {
    if (t > 7.2) return;
    for (let i = 0; i < 6; i++) {
      const ts = 6.08 + i * .07;
      if (t < ts) continue;
      poof(skidX(ts) - 46 + (i % 2 ? 14 : -10), BY - 16, .75 - .06 * i, t - ts, { key: 'skid ' + i, life: .55 });
    }
    boilSeed('skid marks');
    const fade = 1 - seg(t, 6.6, 7.2), xa = skidX(Math.min(t, 6.5)) - 30, xb = Math.min(skidX(6.1), BX + 460);
    if (t > 6.15 && fade > 0 && xb - xa > 30) for (const dy of [-3, 5]) inkLine([[xa, BY + dy], [(xa + xb) / 2, BY + dy + 1], [xb, BY + dy]], 1.4 * fade, '#2A1E1C', 'dry', .2);
    if (t < 6.5) speedLines(x + 140, BY - 240, 300, -1, 1 - seg(t, 6.32, 6.5), { key: 'skid', spread: 170, col: '#8D86B8' });
  }

  function gazeDrift(t) {
    const w = seg(t, 6.5, 6.8) * (1 - seg(t, 7.6, 7.9));
    if (w <= 0) return [0, 0];
    let x = 0, y = 0;
    for (let i = 0; i < 8; i++) { const [a, b] = saccade(t - i * .06, GAZE); x += a / 8; y += b / 8; }
    return [46 * x * w, 26 * y * w];
  }
  function actionFocus(t) {
    for (const [k, P] of Object.entries(PARTS)) {
      if (t >= P.grab - .14 && t < P.release + .02) return shelfAt(k);
      if (t >= P.release + .02 && t < P.slap + .2) return slotAt(k);
    }
    return null;
  }
  function armFollow(t, base) {
    let x = 0, y = 0;
    for (let i = 0; i < 8; i++) {
      const f = actionFocus(t - i * .04);
      if (f) { x += (f[0] - base[0]) / 8; y += (f[1] - base[1]) / 8; }
    }
    return [.09 * x, .06 * y];
  }
  function camB(t) {
    const [gx, gy] = gazeDrift(t), c = camKeys(t, [
      [6.0, [1040, 600, 1.1]], [6.7, 'serverMaster'], [7.7, [722, 610, 1.17]], [8.25, [612, 590, 1.5]], [8.5, [618, 586, 1.5]],
      [8.95, [700, 590, 1.25]], [9.8, [720, 592, 1.25]], [10.3, [940, 552, 1.36]], [10.68, [944, 550, 1.38]], [11.05, [722, 600, 1.25]],
      [11.4, [700, 616, 1.25]], [11.9, [430, 718, 1.55]], [12.85, [424, 716, 1.58]], [13.25, [760, 610, 1.2]], [14.5, [784, 600, 1.22]],
      [14.9, [820, 600, 1.28]], [15.5, [1000, 590, 1.42]],
    ]);
    const [fx, fy] = armFollow(t, c);
    return [c[0] + gx + fx, c[1] + gy + fy, c[2]];
  }

  const LEAP = 15.06, AT_MOUTH = 15.4;
  const DIVE = [[BX + 20, BY - 154], [BX + 60, BY - 510], [BX + 150, BY - 365], [BX + 260, BY - 355]];
  function diveAt(t) {
    if (t < LEAP) return { c: DIVE[0], a: -Math.PI / 2 };
    const bez = u => {
      const v = 1 - u, [P0, C1, C2, P1] = DIVE;
      return [0, 1].map(d => v * v * v * P0[d] + 3 * u * v * v * C1[d] + 3 * u * u * v * C2[d] + u * u * u * P1[d]);
    };
    const u = seg(t, LEAP, AT_MOUTH), p = bez(u), q = bez(Math.min(1, u + .02)), r = bez(Math.max(0, u - .02));
    const a = clamp(Math.atan2(q[1] - r[1], q[0] - r[0]), -1.45, .1);
    if (t <= AT_MOUTH) return { c: p, a };
    const d = 650 * (t - AT_MOUTH);
    return { c: [p[0] + Math.cos(a) * d, p[1] + Math.sin(a) * d], a };
  }
  function diveDraw(t, o) {
    const { c, a } = diveAt(t), air = t >= LEAP, st = easeOut(seg(t, LEAP, LEAP + .1));
    const theta = air ? a + Math.PI / 2 : .14 * ease(seg(t, 14.9, LEAP));
    const crouch = ease(seg(t, 14.9, 15.03)) * (1 - seg(t, LEAP - .02, LEAP + .03));
    const g = air ? [c[0] - U, c[1] + 8.9 * U] : [BX, BY];
    const pose = { ...o, sx: lerp(1, .5, st), sy: lerp(1, 1.35, st), sq: .32 * crouch, dy: 0, rot: 0, lean: air ? 0 : .24 * crouch,
      legSpread: lerp(1, .3, st), heelL: lerp(0, 1.1, st), heelR: lerp(0, 1.1, st), liftL: -3 * st, liftR: -2.7 * st, noShadow: air, gripL: 'open', gripR: 'open', holdR: undefined,
      eyes: air ? 'squeeze' : o.eyes, mouth: air ? 'grin' : o.mouth };
    const tuck = air ? ease(seg(t, 15.34, 15.48)) : 0;
    if (tuck > 0 && rigHas('legLen')) {
      const before = RIG.points(g[0], g[1], U, pose).face;
      pose.legLen = 1 - tuck; pose.sx = lerp(pose.sx, .36, tuck); pose.sy = lerp(pose.sy, 1.5, tuck);
      const after = RIG.points(g[0], g[1], U, pose).face;
      g[0] += before[0] - after[0]; g[1] += before[1] - after[1];
    }
    const pts = RIG.points(g[0], g[1], U, pose), up = ease(seg(t, LEAP - .03, LEAP + .07));
    const back = [[g[0] - 150, g[1] - 120], [g[0] - 112, g[1] - 104]], over = [[pts.top[0] - 10, pts.top[1] - 72], [pts.top[0] + 12, pts.top[1] - 68]];
    const wind = ease(seg(t, 14.86, 14.98));
    Object.assign(pose, {
      handL: up > 0 ? [lerp(back[0][0], over[0][0], up), lerp(back[0][1], over[0][1], up)] : back[0], handR: up > 0 ? [lerp(back[1][0], over[1][0], up), lerp(back[1][1], over[1][1], up)] : back[1],
      handMixL: wind, handMixR: wind,
    });
    if (air) {
      boilSeed('dive shadow');
      const lift = clamp((BY - c[1] - 160) / 380);
      paint(ellPts(c[0] + 60, BY + 2, 120 * (1 - .5 * lift), 16 * (1 - .5 * lift), 18), { fill: PAL.ink, fillOp: 70 * (1 - .7 * lift), bleed: .2, tex: .3, ink: null });
      const tail = [c[0] - Math.cos(a) * 200, c[1] - Math.sin(a) * 200];
      speedLines(tail[0], tail[1], 280, [Math.cos(a), Math.sin(a)], seg(t, LEAP, LEAP + .08), { key: 'dive', spread: 80, col: '#9C95C8' });
    }
    push(); translate(c[0], c[1]); rotate(theta); translate(-c[0], -c[1]);
    qwik(g[0], g[1], U, pose);
    pop();
  }

  function shotB(t) {
    const cam = camB(t);
    camBegin(...cam);
    const gulp = Math.max(gulpAt(t), t > 15.28 ? ease(seg(t, 15.28, 15.44)) : 0);
    towerSet(t, {
      shelfParts: shelfParts(t), board: boardState(t), funnelGulp: gulp,
      pipeRattle: seg(t, 7.75, 7.8) * (1 - seg(t, 8.04, 8.25)),
    });
    alarmClock(...CLOCK, CLOCK_S, { key: 'clock' });
    const breathe = .5 + .5 * Math.sin(t * TAU * .42), grow = ease(seg(t, 11.45, 12.45));
    const D = db(DBX, DBY, U, {
      ...feel('sleepy', t, { eyes: 'closed' }), snore: lerp(.32 + .18 * breathe, 1, grow), pop: seg(t, 12.5, 12.74),
      smack: seg(t, 12.56, 12.9), roll: ease(seg(t, 12.66, 13.02)), rollDir: -1, dim: .55, boilKey: 'db',
      sq: KNOCKS.reduce((q, k) => q + .05 * spring(t, k, 12, 30), 0),
    });
    tubeContents(t, parcels(t));
    tubeGlass(t, { funnelGulp: gulp });
    drawQueue(t);
    lampOnMark();
    if (t > 8.0 && t < 8.6) poof(PIPE[0] + 8, PIPE[1] + 6, .32, t - 8.0, { key: 'pipe' });
    drawSlipFree(t);
    const ctx = { bubble: D.bubble };
    if (t < 14.86) {
      const o = boltPose(t, ctx), bx = skid(t, o);
      ctx.handL = o.handMixL && Array.isArray(o.handL) ? o.handL : null;
      looseParts(t, ctx);
      skidFx(t, bx);
      qwik(bx, BY, U, o);
    } else {
      looseParts(t, ctx);
      const o = RIG.emotions(t, MOODS);
      diveDraw(t, { ...o, lookX: 1, lookY: 0, boilKey: 'bolt', rim: 1 });
      SETS.funnelFront(t, { funnelGulp: gulp });
    }
    slapMarks(t);
    knockMarks(t);
    camEnd();
    if (t < 6.25) whip(.5 + .5 * seg(t, 6.0, 6.25), -1);
  }

  const WAKE = 20.82, SLAP = [21.06, 21.46], COUGH = [21.46, 22.2], HIT = SLAP[0] + .45 * (SLAP[1] - SLAP[0]);
  const ENV_OUT = COUGH[0] + .38 * (COUGH[1] - COUGH[0]), ENV_IN = 22.32;
  function envelopeFlight(t, mouth) {
    const k = seg(t, ENV_OUT, ENV_IN), P0 = [mouth[0] + 16, mouth[1] - 4], P3 = [MOUTH[0] + 12, MOUTH[1]];
    const C1 = [P0[0] + 120, P0[1] - 420], C2 = [P3[0] - 300, P3[1] - 120], u = lerp(k, ease(k), .35);
    const at = w => { const z = 1 - w; return [0, 1].map(d => z * z * z * P0[d] + 3 * w * z * z * C1[d] + 3 * w * w * z * C2[d] + w * w * w * P3[d]); };
    const p = at(u), q = at(Math.min(1, u + .02));
    return { p, a: Math.atan2(q[1] - p[1], q[0] - p[0]), s: lerp(.3, 1, backOut(clamp(k * 3.2))), k };
  }
  function camC2(t) {
    return camKeys(t, [[20.5, [392, 822, 1.9]], [21.74, [420, 814, 1.86]], [22.3, [1112, 602, 1.42]], [22.5, [1128, 598, 1.48]]]);
  }
  function shotC2(t) {
    const C = camC2(t), cam = { cx: C[0], cy: C[1], zoom: C[2], rot: 0 };
    camBegin(...C);
    const gulp = Math.sin(Math.PI * seg(t, ENV_IN - .08, ENV_IN + .4));
    towerSet(t, { shelfParts: [], board: boardState(t), funnelGulp: gulp });
    const flat = t > HIT ? Math.exp(-(t - HIT) * 1.4) : 0, ring = t < HIT ? 1 : 0;
    alarmClock(...CLOCK, CLOCK_S, { key: 'clock', ring, squash: .85 * flat, rot: t > HIT ? -.12 * flat : 0 });
    if (t > HIT && t < HIT + .5) { boilSeed('clock bonk'); emote('stars', CLOCK[0] + 6, CLOCK[1] - 60, 16, seg(t, HIT, HIT + .1) * (1 - seg(t, HIT + .35, HIT + .5)), t - HIT); }
    const up = t - WAKE, mood = emotions(t, [[0, 'sleepy', { eyes: 'closed' }], [WAKE, 'surprised'], [SLAP[0] + .02, 'angry'], [COUGH[0], 'neutral'], [22.22, 'relieved']]);
    const D = db(DBX, DBY, U, {
      ...mood, rollDir: -1, roll: t < WAKE + .04 ? 1 : 1 - ease(seg(t, WAKE + .04, WAKE + .26)),
      capUp: up > 0 ? .95 * Math.exp(-up * 2.6) * Math.abs(Math.cos(up * 9)) : 0,
      dy: (mood.dy || 0) - 1.1 * Math.sin(Math.PI * seg(t, WAKE, WAKE + .2)),
      dim: lerp(.55, 0, ease(seg(t, WAKE, WAKE + .2))), snore: t < WAKE ? .45 : 0,
      slap: seg(t, ...SLAP), slapDir: 1, cough: seg(t, ...COUGH), coughEnvelope: false, boilKey: 'db',
    });
    if (t > ENV_OUT && t < ENV_OUT + .5) poof(D.mouth[0] + 10, D.mouth[1] - 2, .5, t - ENV_OUT, { key: 'cough' });
    const items = [];
    if (t > ENV_IN) items.push({ kind: 'envelope', s: 60 + TUBE_V * (t - ENV_IN), scale: .9, key: 'env', o: { key: 'env' } });
    tubeContents(t, items);
    tubeGlass(t, { funnelGulp: gulp });
    drawSlipFree(t);
    if (t > ENV_OUT && t <= ENV_IN) {
      const E = envelopeFlight(t, D.mouth);
      envelope(E.p[0], E.p[1], E.s * 1.15, { rot: .5 * E.a + .25 * Math.sin(t * 19), flutter: .6, key: 'env' });
      if (E.k > .1 && E.k < .9) speedLines(E.p[0], E.p[1], 110, [Math.cos(E.a), Math.sin(E.a)], 1, { key: 'env', spread: 34, col: '#9C95C8' });
      SETS.funnelFront(t, { funnelGulp: gulp });
    }
    camEnd();
    if (t < 20.75) irisTo(.5 + .5 * seg(t, 20.5, 20.75), ...toScreen(CLOCK[0], CLOCK[1] - 40, cam));
    if (t > 22.25) irisTo(.5 * seg(t, 22.25, 22.5), ...toScreen(MOUTH[0] + 40, MOUTH[1] - 20, cam));
  }

  shots([[6.0, shotB], [20.5, shotC2]]);
})();
