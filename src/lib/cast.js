(() => {
  const INK = PAL.ink;
  const { frame, at, closeMid, puffPts, lineK, detailed, tone, softShadow, texOK } = PROPS.util;
  const CAST = {
    shells: {
      blue: ['#18B6F6', '#0B78B8', '#A8EAFF'],
      purple: ['#AC7EF4', '#7048C8', '#E4D4FF'],
      teal: ['#16B5A2', '#0B7D70', '#9BEBDD'],
    },
    snail: { body: '#F3C79E', bodyDk: '#C98A5C', bodyLt: '#FFE7CE', eye: '#FFFDF6', blush: '#F29A9A' },
    db: { body: '#A8B6D6', bodyDk: '#6A79A3', bodyLt: '#DCE4F4', top: '#C9D3EA', stripe: '#55638E', led: '#7DF2A0', ledOff: '#2F3A60', night: '#343B6B', cap: '#E0485E', capDk: '#A82E43', capLt: '#FFF3E4', mitt: '#FFFBF4' },
    glove: { col: '#FFFBF4', shade: '#E2DCF2', cuff: '#F7F2FF' },
  };
  const shellCols = s => CAST.shells[s] || (typeof s === 'string' && s[0] === '#' ? [s, mixCol(s, INK, .35), mixCol(s, '#FFFFFF', .55)] : CAST.shells.blue);

  const LIDDED = ['closed', 'happy', 'squeeze'];
  function stalkEye(c, r, kind, side, o, sw, skin, flip) {
    const [cx, cy] = c, blink = ['normal', 'look', 'wide'].includes(kind) && ((T * .9 + (o.seed || 0) * 1.7 + (side > 0 ? .07 : 0)) % 3.3) < .12;
    const shut = LIDDED.includes(kind) || blink || (o.squint || 0) > .8;
    const ball = ellPts(cx, cy, r, r * 1.06, 18);
    if (shut) {
      paint(ball, { wash: skin, ink: INK, sw: sw * .7 });
      const k = blink || kind === 'closed' ? 'closed' : kind;
      push(); translate(cx, cy + r * .1); scale(flip ? -1 : 1, 1);
      eye(k, side, r * .58, o, sw * 1.05);
      pop();
      return;
    }
    paint(ball, { wash: CAST.snail.eye, ink: null });
    const lx = clamp(o.lookX || 0, -1, 1) * r * .32 * (flip ? -1 : 1), ly = clamp(o.lookY || 0, -1, 1) * r * .28;
    if (['normal', 'look', 'wide'].includes(kind)) {
      const w = kind === 'wide' ? .5 : .42, h = kind === 'wide' ? 1.05 : .9;
      paint(rrPts(cx + lx - w * r / 2, cy + ly - h * r / 2, w * r, h * r, w * r * .45, r * .02), { wash: INK, ink: null });
      paint(ellPts(cx + lx - w * r * .18, cy + ly - h * r * .26, r * .12, r * .16, 8), { wash: PAL.cream, ink: null });
    } else {
      push(); translate(cx + lx * .6, cy + ly * .6); scale(flip ? -1 : 1, 1);
      eye(kind, side, r * .55, { ...o, lookX: 0, lookY: 0 }, sw * 1.05);
      pop();
    }
    const lid = clamp(kind === 'sleepy' ? .52 : kind === 'narrow' ? .38 : 0, 0, 1) + (o.squint || 0) * .5;
    if (lid > .02) {
      const top = cy - r * 1.06, edge = lerp(top, cy + r * .9, lid), P = [];
      for (let i = 0; i <= 12; i++) { const a = Math.PI + i / 12 * Math.PI; P.push([cx + Math.cos(a) * r * 1.02, Math.min(edge, cy + Math.sin(a) * r * 1.08)]); }
      paint(P, { wash: skin, ink: null });
      inkLine([[cx - r * .98, edge + r * .05], [cx, edge + r * .12], [cx + r * .98, edge + r * .05]], sw * .8, INK, 'ink', .5);
      if (kind === 'narrow') { const bot = cy + r * .55; paint([[cx - r, bot], [cx + r, bot], [cx + r * .7, cy + r * .85], [cx, cy + r * 1.08], [cx - r * .7, cy + r * .85]], { wash: skin, ink: null }); }
    }
    paint(ball, { ink: INK, sw: sw * .7 });
  }

  function snailGeom(u, o) {
    const c = (o.crawl ?? 0) * TAU, duck = clamp(o.duck || 0), hide = clamp(o.hide || 0);
    const out = 1 - ease(seg(hide, .15, .7)), stalk = (1 - .78 * duck) * (1 - ease(seg(hide, 0, .3)));
    const reach = .22 * Math.sin(c) * out, lag = .12 * Math.sin(c - 1.3) * out;
    const bob = .07 * Math.sin(c + .6) * out, sRot = .05 * Math.sin(c + .2) * out - .06 * duck;
    const shellX = -.38 + .12 * hide, shellY = lerp(-1.56, -1.3, ease(seg(hide, .25, .9))) - bob + .12 * duck;
    const carryS = o.carryS ?? u / 20, R = 1.34;
    const top = [shellX + Math.sin(sRot) * R, shellY - Math.cos(sRot) * R + .24];
    return { c, duck, hide, out, stalk, reach, lag, bob, sRot, shellX, shellY, R, top, carryS };
  }
  function snail(x, y, u, o = {}) {
    const key = 'snail ' + (o.boilKey ?? ''), rs = p => boilSeed(key + ' ' + p), near = detailed();
    const sw = clamp(u / 21, .3, 1.8) * lineK(), G = snailGeom(u, o), S = CAST.snail, [col, dk, lt] = shellCols(o.shell);
    const flip = !!o.flip, sq = (o.sq || 0) + .18 * G.duck;
    const M = frame(x, y + (o.dy || 0) * .3 * u, u, { flip, rot: (o.rot || 0) * .5, sx: 1 + sq * .35, sy: 1 - sq });
    const eyesKind = G.duck > .45 ? 'squeeze' : (o.eyes || 'normal');
    const droop = o.droop ?? (['sleepy', 'closed'].includes(o.eyes) ? .6 : 0);
    const out = G.out, headX = lerp(.2, 1.8, out) + G.reach, headY = lerp(-.95, -1.32, out) + .35 * G.duck, hr = .76 * lerp(.55, 1, out);
    const tailX = lerp(-1.1, -2.4, out) - G.lag, frontX = lerp(.55, 2.12, out) + G.reach;

    rs('shadow');
    if (!o.noShadow) softShadow(ellPts(x + (flip ? -1 : 1) * (tailX + frontX) / 2 * u * .9, y + .06 * u, (frontX - tailX) / 2 * u * 1.05, .22 * u, 16), 70);
    if (o.trail > 2) {
      rs('trail');
      const tx = x + (flip ? -1 : 1) * tailX * u, L = o.trail;
      paint([[tx, y - .05 * u], [tx - (flip ? -1 : 1) * L, y - .02 * u], [tx - (flip ? -1 : 1) * L, y + .02 * u], [tx, y + .08 * u]], { wash: '#FFFFFF', washOp: 120, ink: null });
    }

    const stalkBase = side => [headX + side * .24 - .04, headY - hr * .8];
    const stalkTip = side => {
      const len = (1.42 + (side > 0 ? .02 : .1)) * G.stalk, sway = .09 * Math.sin(G.c - 1.3 + side) * out;
      const look = (o.lookX || 0) * .28, lookY = (o.lookY || 0) * .15;
      const b = stalkBase(side);
      return [b[0] + side * .16 + look + sway + droop * .55 * G.stalk, b[1] - len * (1 - droop * .3) + lookY + droop * .25 * G.stalk];
    };
    const eyeR = side => (side > 0 ? .54 : .49) * lerp(.4, 1, clamp(G.stalk / .6)) * (1 - .12 * G.duck);
    const drawStalk = side => {
      if (G.stalk < .04) return;
      const b = stalkBase(side), e = stalkTip(side), m = [(b[0] + e[0]) / 2 - .08 - droop * .15, (b[1] + e[1]) / 2 + droop * .12];
      paint(M(ribbon([b, m, e], .32, .19)), { wash: side < 0 ? S.bodyDk : S.body, ink: INK, sw: sw * .7 });
    };
    const drawEye = side => {
      if (G.stalk < .04) return;
      const e = at(M, stalkTip(side)), r = eyeR(side) * u;
      const kind = Array.isArray(eyesKind) ? eyesKind[side < 0 ? 0 : 1] : eyesKind;
      stalkEye(e, r, kind, side, o, sw * .9, side < 0 ? S.bodyDk : S.body, flip);
    };

    rs('far'); drawStalk(-1); drawEye(-1);
    rs('body');
    const bottom = []; for (let i = 0; i <= 8; i++) { const bx = lerp(tailX + .25, frontX - .15, i / 8), rip = .045 * Math.max(0, Math.sin(bx * 3.2 + G.c * 1)) * out; bottom.push([bx, -rip]); }
    const body = [[tailX, -.07], ...bottom, [frontX, -.06], [frontX + .2, -.3],
      [headX + hr * .95, headY + hr * .42], [headX + hr, headY - hr * .1], [headX + hr * .72, headY - hr * .72], [headX + hr * .12, headY - hr], [headX - hr * .5, headY - hr * .86],
      [headX - hr * .92, headY - hr * .25], [headX - hr - .05, -.74], [.1, -.72], [-1.5, -.55], [tailX + .6, -.3]];
    const bodyW = M(body);
    paint(bodyW, { wash: S.body, ink: null });
    tone(M([[tailX + .2, -.08], [frontX, -.08], [frontX, -.28], [tailX + .5, -.26]]), S.bodyDk, 110);
    tone(M(ellPts(headX + .1, headY - hr * .45, hr * .55, hr * .3, 10, 0, -.3)), S.bodyLt, 140);
    if (near && out > .3) for (let i = 0; i < 3; i++) {
      const rx = lerp(frontX - .35, tailX + .4, frac(i / 3 + G.c / TAU));
      if (rx > -1.9 && rx < frontX - .2) inkLine(M([[rx + .06, -.08], [rx - .02, -.28]]), sw * .45, S.bodyDk, 'inkfine', .5);
    }
    paint(closeMid(bodyW), { ink: INK, sw, curv: .25 });
    if ((o.blush ?? .5) > .02 && out > .5) paint(M(ellPts(headX + hr * .2, headY + hr * .38, hr * .26, hr * .15, 10)), { wash: S.blush, washOp: 150 * (o.blush ?? .5), ink: null });
    rs('mouth');
    if (o.mouth && out > .5 && near) {
      const mu = (['O', 'open', 'wail', 'laugh', 'yawn', 'grin', 'teeth'].includes(o.mouth) ? .24 : .3) * u, m = at(M, [headX + hr * .66, headY + hr * .3]);
      push(); translate(m[0], m[1] + 4.3 * mu); scale(flip ? -1 : 1, 1); mouth(mu, o.mouth, sw * .8); pop();
    }

    rs('shell');
    const sx0 = G.shellX, sy0 = G.shellY, R = G.R, rot = G.sRot;
    const Rt = pts => pts.map(([a, b]) => [sx0 + a * Math.cos(rot) - b * Math.sin(rot), sy0 + a * Math.sin(rot) + b * Math.cos(rot)]);
    const shell = M(Rt(ellPts(0, 0, R * 1.02, R, 26, .015)));
    paint(shell, { wash: col, ink: null });
    tone(M(Rt(ellPts(.3, .38, R * .78, R * .62, 16))), dk, 120);
    tone(M(Rt(ellPts(-.45, -.55, R * .42, R * .25, 12, 0, -.6))), lt, 170);
    const spiral = [], spiralLt = [];
    for (let i = 0; i <= 40; i++) {
      const k = i / 40, a = -1.6 + k * TAU * 1.72, q = lerp(.2, R * .9, Math.pow(k, .85));
      spiral.push([.12 + Math.cos(a) * q, -.08 + Math.sin(a) * q * .97]);
      if (i > 6) spiralLt.push([.12 + Math.cos(a - .3) * q * .84, -.08 + Math.sin(a - .3) * q * .8]);
    }
    if (near) inkLine(M(Rt(spiralLt)), sw * 1.25, lt, 'ink', .5);
    inkLine(M(Rt(spiral)), sw * .85, INK, 'ink', .5);
    paint(closeMid(shell), { ink: INK, sw });
    if (G.hide > .55) {
      rs('peek');
      const pk = ease(seg(G.hide, .55, .9)), hole = [R * .62, R * .52];
      paint(M(Rt(ellPts(hole[0], hole[1], .42 * pk, .3 * pk, 12, 0, -.6))), { wash: '#2A2336', ink: INK, sw: sw * .6 });
      if (pk > .6 && ((T * .8 + (o.seed || 0)) % 2.7) > .15) for (const e of [-.12, .12]) paint(M(Rt(ellPts(hole[0] + e, hole[1] - .03, .06, .08, 8))), { wash: PAL.cream, ink: null });
    }

    rs('near'); drawStalk(1); drawEye(1);

    let carry = at(M, G.top);
    if (o.carry && typeof jsBox === 'function') {
      rs('carry');
      jsBox(carry[0], carry[1], G.carryS, o.carry, { noShadow: true, rot: (flip ? -1 : 1) * G.sRot * .8, key: o.boilKey ? 'carry ' + o.boilKey : undefined, ...(o.box || {}) });
    }
    if (o.sweat > .02 && out > .3) {
      rs('sweat');
      const e = at(M, [headX + 1.05, headY - 1.5]);
      emote('sweat', e[0], e[1], .42 * u, clamp(o.sweat), T);
      const ph = frac(T * 1.4), d = at(M, [headX + hr * .7, headY - hr * .5 + ph * .5]);
      if (ph < .8) paint(ellPts(d[0], d[1], .11 * u, .15 * u, 8), { wash: PAL.sky, ink: INK, sw: sw * .4 });
    }
    if (o.emote) {
      rs('emote');
      const e = at(M, [headX + 1.1, headY - 2.9 * Math.max(.5, G.stalk)]);
      emote(o.emote, e[0], e[1], .45 * u, o.emoteK ?? 1, o.emoteAge ?? T);
    }
    rs('after');
    return { carry, head: at(M, [headX, headY]), eyes: [at(M, stalkTip(-1)), at(M, stalkTip(1))], top: at(M, [G.shellX, G.shellY - G.R]) };
  }
  function snailCarry(x, y, u, o = {}) {
    const G = snailGeom(u, o), sq = (o.sq || 0) + .18 * G.duck;
    return frame(x, y + (o.dy || 0) * .3 * u, u, { flip: !!o.flip, rot: (o.rot || 0) * .5, sx: 1 + sq * .35, sy: 1 - sq })([G.top])[0];
  }

  function taper(C, wAt) {
    const n = C.length, L = [], R = [];
    for (let i = 0; i < n; i++) {
      const a = C[Math.max(0, i - 1)], b = C[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
      const w = wAt(i / (n - 1)) / 2;
      L.push([C[i][0] - dy / d * w, C[i][1] + dx / d * w]); R.push([C[i][0] + dy / d * w, C[i][1] - dx / d * w]);
    }
    return L.concat(R.reverse());
  }
  const CAP_FLOP = [[0, 0], [-.45, -2.1], [.05, -3.85], [1.75, -4.7], [3.55, -4.05], [4.6, -2.45], [4.95, -.6], [4.95, 1.05]];
  const CAP_UP = [[0, 0], [-.1, -2], [0, -3.6], [.1, -4.9], [.2, -6], [.3, -6.9], [.38, -7.6], [.42, -8.2]];
  const capWidth = t => t < .26 ? lerp(6.2, 2.3, t / .26) : lerp(2.3, .7, (t - .26) / .74);

  const DB_VIEWS = { front: { fx: 0, fw: 1, sides: [-1, 1], led: 1 }, q: { fx: 2, fw: .78, sides: [-1, 1], led: .6 }, side: { fx: 3.75, fw: .5, sides: [1], led: 0 }, qback: { face: false, led: 0 }, back: { face: false, led: 0 } };
  const dbView = roll => roll < .14 ? 'front' : roll < .38 ? 'q' : roll < .62 ? 'side' : roll < .86 ? 'qback' : 'back';
  const TOP = 9, LID = 1.12, SEAMS = [-4.8, -3.25, -1.7];
  const diskMid = (x, a, b) => (arcY(x, a) + .38 + (b == null ? arcY(x, -1.25) : arcY(x, b))) / 2;
  function arcY(x, yk, sag = 1.25) { return yk + sag * Math.sqrt(Math.max(0, 1 - (x / 5) * (x / 5))); }
  function db(x, y, u0, o = {}) {
    const u = u0 * .87, key = 'db ' + (o.boilKey ?? ''), rs = p => boilSeed(key + ' ' + p), near = detailed(), D = CAST.db;
    const sw = clamp(u / 15, .45, 2.4) * lineK(), dim = clamp(o.dim || 0);
    const cough = clamp(o.cough || 0), roll = clamp(o.roll || 0), rdir = o.rollDir ?? -1;
    const inh = ease(seg(cough, 0, .34)), blast = seg(cough, .34, .5), rec = seg(cough, .5, 1);
    const coughing = cough > 0 && cough < 1;
    let sq = o.sq || 0, rot = o.rot || 0;
    let dx = o.dx || 0;
    if (coughing) {
      const tremble = inh * (1 - blast) * Math.sin(T * TAU * 11) * .025;
      sq += -.2 * inh * (1 - blast) + .3 * Math.sin(Math.PI * blast) + (blast >= 1 ? .12 * Math.exp(-6 * rec) * Math.cos(14 * rec) : 0);
      rot += .1 * Math.sin(Math.PI * blast) - .04 * inh * (1 - blast);
      dx += tremble * 4;
    }
    const smack = clamp(o.smack || 0);
    if (smack > 0 && smack < 1) sq += .04 * Math.sin(smack * TAU * 4.5) * Math.sin(Math.PI * smack);
    rot += rdir * .2 * Math.sin(Math.PI * roll);
    const view = DB_VIEWS[dbView(roll)], vname = dbView(roll);
    const M = frame(x + dx * u, y + (o.dy || 0) * u, u, { rot, sx: 1 + sq * .5, sy: 1 - sq });
    const bodyCol = mixCol(D.body, D.night, .42 * dim), dkCol = mixCol(D.bodyDk, D.night, .35 * dim), ltCol = mixCol(D.bodyLt, D.night, .4 * dim), topCol = mixCol(D.top, D.night, .42 * dim);

    rs('shadow');
    softShadow(ellPts(x + dx * u, y + .1 * u, 5.9 * u, 1.05 * u, 22), 90);

    const slap = clamp(o.slap || 0), sdir = o.slapDir ?? 1;
    const slapA = slap > 0 && slap < 1 ? (slap < .35 ? lerp(-.45, 1.25, easeOut(slap / .35)) : slap < .5 ? lerp(1.25, -.2, easeIn(seg(slap, .35, .5))) : lerp(-.2, -.45, ease(seg(slap, .5, 1)))) : null;
    const slapLen = slap > .3 && slap < .75 ? 1 + .95 * Math.sin(Math.PI * seg(slap, .3, .75)) : 1;
    let hand = null;
    const arm = side => {
      rs('arm' + side);
      let a = side < 0 ? (o.aL ?? -.5) : (o.aR ?? -.5), len = 1;
      if (slapA != null && side === sdir) { a = slapA; len = slapLen; }
      if (coughing && side !== sdir) a = lerp(a, .5, Math.sin(Math.PI * seg(cough, .2, .7)));
      const root = [side * (4.72 + .5 * clamp((a - .3) / .8)), -4.3 - .5 * clamp((a - .3) / .8)], L = 1.75 * len, dir = [side * Math.cos(a), -Math.sin(a)];
      const tip = [root[0] + dir[0] * L, root[1] + dir[1] * L], mid = [(root[0] + tip[0]) / 2 - side * .05, (root[1] + tip[1]) / 2 + .12];
      paint(M(ribbon([root, mid, tip], 1.05, .95)), { wash: bodyCol, ink: INK, sw: sw * .8 });
      paint(M(ellPts(tip[0] + dir[0] * .15, tip[1] + dir[1] * .15, .62, .58, 14, .02)), { wash: D.mitt, ink: INK, sw: sw * .8 });
      if (side === sdir) hand = at(M, tip);
      if (slap > .36 && slap < .6 && side === sdir) {
        const sm = 1 - Math.abs(seg(slap, .36, .6) * 2 - 1);
        for (let i = 0; i < 3; i++) {
          const rr = L * (.75 + i * .22), P = [];
          for (let k = 0; k <= 6; k++) { const aa = lerp(1.25, a + .25, k / 6); P.push([root[0] + side * Math.cos(aa) * rr, root[1] - Math.sin(aa) * rr]); }
          inkLine(M(P), sw * (.35 + .25 * sm), INK, 'inkfine', .6);
        }
      }
      if (slap > .46 && slap < .66 && side === sdir) {
        const q = seg(slap, .46, .66), c = at(M, [tip[0] + dir[0] * .9, tip[1] + dir[1] * .9]);
        paint(starPts(c[0], c[1], u * (.9 + .5 * easeOut(q)) * (1 - q * .6), .45, 7, .3), { wash: PAL.cream, ink: INK, sw: sw * .7 * (1 - q) + .1 });
      }
    };
    arm(-1); arm(1);

    rs('body');
    const back = []; for (let i = 0; i <= 14; i++) { const a = Math.PI + i / 14 * Math.PI; back.push([Math.cos(a) * 5, -TOP + Math.sin(a) * LID]); }
    const bot = []; for (let i = 0; i <= 14; i++) { const bx = 5 - i / 14 * 10; bot.push([bx, arcY(bx, -1.25)]); }
    const sil = M([...back, [5, -5], ...bot, [-5, -5]]);
    paint(sil, { wash: bodyCol, ink: null });
    const big = texOK(12 * u);
    tone(M([[1.8, -TOP + .6], [4.9, -TOP + .3], [4.9, -1.3], [1.8, -.4]]), dkCol, 90, big);
    tone(M([[-4.4, -TOP + .8], [-2.8, -TOP + 1], [-3, -2.2], [-4.4, -2.1]]), ltCol, 120, big);
    const topPts = ellPts(0, -TOP, 4.96, LID - .02, 26);
    paint(M(topPts), { wash: topCol, ink: null });
    tone(M(ellPts(-1.2, -TOP - .25, 2.6, .45, 14)), ltCol, 150);
    for (const yk of SEAMS) {
      const band = [], shade = [];
      for (let i = 0; i <= 12; i++) { const bx = -5 + i / 12 * 10; band.push([bx, arcY(bx, yk)]); shade.push([bx, arcY(bx, yk) - .5]); }
      for (let i = 12; i >= 0; i--) { const bx = -5 + i / 12 * 10; band.push([bx, arcY(bx, yk) + .38]); shade.push([bx, arcY(bx, yk)]); }
      tone(M(shade), dkCol, 70);
      paint(M(band), { wash: mixCol(D.stripe, D.night, .35 * dim), ink: null });
      const edge = []; for (let i = 0; i <= 12; i++) { const bx = -5 + i / 12 * 10; edge.push([bx, arcY(bx, yk) + .5]); }
      inkLine(M(edge), sw * .5, ltCol, 'inkfine', .5);
    }
    const rim = []; for (let i = 0; i <= 16; i++) { const bx = -5 + i / 16 * 10; rim.push([bx, arcY(bx, -TOP, LID)]); }
    inkLine(M(rim), sw * .85, INK, 'ink', .5);
    paint(closeMid(sil), { ink: INK, sw });

    if (near && view.led > 0) {
      rs('leds');
      const lx0 = 2.35 + (vname === 'q' ? rdir * 2 : 0);
      const on = (1 - dim) * view.led;
      if (on > .05) { const g = at(M, [lx0 + .72, diskMid(lx0 + .72, SEAMS[0], SEAMS[1])]); glow(g[0], g[1], 1.6 * u, D.led, .45 * on * (.75 + .25 * Math.sin(T * TAU * .9))); }
      for (let k = 0; k < 3; k++) {
        const lx = lx0 + k * .72, blink = .5 + .5 * Math.max(0, Math.sin(T * TAU * (.9 + k * .35) + k * 2.1));
        const p = at(M, [lx, diskMid(lx, SEAMS[0], SEAMS[1])]);
        paint(ellPts(p[0], p[1], .19 * u, .17 * u, 10), { wash: on > .05 ? mixCol(D.ledOff, k === 1 ? '#FFD36B' : D.led, on * blink) : D.ledOff, ink: INK, sw: sw * .35 });
      }
      for (let k = 0; k < 3; k++) { const vx = 2.5 + k * .5, vy = diskMid(vx, SEAMS[1], SEAMS[2]); inkLine(M([[vx, vy - .25], [vx + .05, vy + .25]]), sw * .55, dkCol, 'inkfine', 0); }
    }

    let mouthPt = at(M, [0, -4.87]);
    if (view.face !== false) {
      rs('face');
      const fx = view.fx * (vname === 'front' ? 0 : rdir), fu = .84 * u, faceO = { ...o };
      if (o.smack > 0 && o.smack < 1) faceO.mouth = ['pout', 'cat', 'o', 'cat'][Math.floor(o.smack * 9) % 4];
      if (coughing && cough < .7) {
        faceO.eyes = cough < .2 ? 'closed' : cough < .34 ? 'squeeze' : cough < .52 ? 'wide' : 'squeeze';
        faceO.mouth = cough < .2 ? 'o' : cough < .34 ? 'pout' : cough < .52 ? 'O' : 'wobble';
        faceO.squint = 0;
      }
      const f = at(M, [fx, -1.26]);
      push(); translate(f[0], f[1]); rotate(rot); scale(view.fw * (1 + sq * .5), 1 - sq);
      if (faceO.blush) blush(fu, sw, { sides: view.sides, bx: 3.4 }, faceO.blush === true ? 1 : faceO.blush);
      eyes(fu, faceO, sw, view.sides, 0);
      push(); translate(view.sides.length === 1 ? 1.6 * fu : 0, 0); mouth(fu, faceO.mouth, sw); pop();
      pop();
      mouthPt = at(M, [fx + (view.sides.length === 1 ? 1.35 : 0), -4.9]);
    }

    rs('cap');
    const cap = clamp(o.cap ?? 1), up = Math.max(clamp(o.capUp || 0), coughing ? .55 * Math.sin(Math.PI * seg(cough, .34, .62)) : 0);
    let emoteSide = 1;
    if (cap > .01) {
      const breathe = Math.sin(T * TAU * .3), flipK = ease(seg(roll, .25, .8)), fside = flipK < .5 ? 1 : -1;
      const up2 = Math.max(up, .72 * Math.sin(Math.PI * flipK));
      emoteSide = fside > 0 ? -1 : 1;
      const b0 = -TOP - .45, P = CAP_FLOP.map(([a, b], i) => {
        const [ua, ub] = CAP_UP[i], k = i / (CAP_FLOP.length - 1);
        return [lerp(a * fside, ua * fside, up2) + .12 * breathe * k, b0 + lerp(b, ub, up2) + .2 * breathe * k * k];
      });
      const C = through(P, 8), n = C.length - 1, cone = M(taper(C, capWidth));
      paint(cone, { wash: D.cap, ink: null });
      for (const [a, b] of [[.12, .2], [.33, .41], [.54, .62], [.75, .83]]) {
        const i0 = Math.floor(a * n), i1 = Math.ceil(b * n), sub = C.slice(i0, i1 + 1);
        if (sub.length > 1) paint(M(taper(sub, f => capWidth(lerp(i0, i1, f) / n) * .96)), { wash: D.capLt, ink: null });
      }
      tone(M(ellPts(2.2 * fside * (1 - up2), b0 - 3.6 - up2 * 2, 1.4 * (1 - .6 * up2), .45, 10, 0, .2 * fside)), D.capDk, 90);
      paint(closeMid(cone), { ink: INK, sw: sw * .85 });
      const cuff = []; for (let i = 0; i <= 16; i++) { const a = Math.PI + i / 16 * Math.PI; cuff.push([Math.cos(a) * 3.9, b0 + .15 + Math.sin(a) * .85]); }
      for (let i = 16; i >= 0; i--) { const a = Math.PI + i / 16 * Math.PI; cuff.push([Math.cos(a) * 4.0, b0 + 1.05 + Math.sin(a) * .75]); }
      paint(M(cuff.map(([a, b]) => [a + jit(.03), b + jit(.03)])), { wash: D.capLt, ink: INK, sw: sw * .7, curv: .3 });
      const tip = P[P.length - 1];
      paint(M(puffPts(tip[0], tip[1] + .45, .9, 6, 1.3, 20)), { wash: D.capLt, ink: INK, sw: sw * .7 });
    }

    rs('bubble');
    const snore = clamp(o.snore || 0), burst = clamp(o.pop || 0);
    let bubble = null;
    if (view.face !== false && snore > .02) {
      const r = 1.4 * snore * u, c = [mouthPt[0] + (r * .88 + .45 * u) * (view.fx && vname !== 'front' ? rdir : 1), mouthPt[1] + r * .5];
      bubble = [c[0], c[1], r];
      if (burst <= 0) {
        paint(ellPts(c[0], c[1], r, r * .96, 22), { wash: '#DDEEFF', washOp: 160, ink: INK, sw: sw * .55 });
        paint(ellPts(c[0] + r * .25, c[1] + r * .3, r * .62, r * .5, 16), { wash: '#A9C8EE', washOp: 70, ink: null });
        inkLine([[c[0] - r * .55, c[1] - r * .25], [c[0] - r * .35, c[1] - r * .55], [c[0] - r * .05, c[1] - r * .68]], sw * .8, '#FFFFFF', 'ink', .6);
        paint(ellPts(c[0] + r * .45, c[1] + r * .35, r * .08, r * .08, 8), { wash: '#FFFFFF', ink: null });
      } else if (burst < 1) {
        const k = easeOut(burst), fade = 1 - burst;
        if (burst < .35) {
          const q = burst / .35;
          paint(ellPts(c[0], c[1], r * (1 + .5 * q), r * (1 + .5 * q), 20), { ink: INK, sw: sw * .9 * (1 - q) + .05 });
          paint(starPts(c[0], c[1], r * (1.25 + .4 * q), .55, 8, .2), { wash: '#FFFFFF', washOp: 200 * (1 - q), ink: null });
        }
        for (let i = 0; i < 8; i++) {
          const a = i / 8 * TAU + .3, d = r * (.9 + 1.4 * k), p = [c[0] + Math.cos(a) * d, c[1] + Math.sin(a) * d + 2.2 * u * burst * burst];
          paint(ellPts(p[0], p[1], .2 * u * fade + .5, .26 * u * fade + .5, 8), { wash: '#CFE5FF', ink: INK, sw: sw * .4 * fade });
          if (i % 2 === 0) inkLine([[c[0] + Math.cos(a + .4) * r * (1 + .6 * k), c[1] + Math.sin(a + .4) * r * (1 + .6 * k)], [c[0] + Math.cos(a + .4) * r * (1.5 + k), c[1] + Math.sin(a + .4) * r * (1.5 + k)]], sw * .9 * fade, INK, 'ink', 0);
        }
        for (const sd of [-1, 1]) {
          const P = []; for (let j = 0; j <= 5; j++) { const a = sd * .4 + (sd < 0 ? Math.PI : 0) + (j / 5 - .5) * .9; P.push([c[0] + Math.cos(a) * r * (1.1 + .5 * k), c[1] + Math.sin(a) * r * (1.1 + .5 * k) + u * burst]); }
          inkLine(P, sw * .6 * fade, INK, 'inkfine', .6);
        }
      }
    }

    let env = null;
    if (cough > .38 && o.coughEnvelope !== false && typeof envelope === 'function') {
      rs('envelope');
      const k = seg(cough, .38, 1), to = o.coughTo || [mouthPt[0] + 7 * u, mouthPt[1] - 11 * u];
      const emerge = seg(k, 0, .14), fly = seg(k, .1, 1), out = [mouthPt[0] + .9 * u * easeOut(emerge), mouthPt[1] - .2 * u * emerge];
      const p = fly > 0 ? arcPt(out, to, Math.max(4 * u, .3 * Math.hypot(to[0] - out[0], to[1] - out[1])), easeOut(fly)) : out;
      if (k < .4) poof(mouthPt[0] + .4 * u, mouthPt[1], .5 * u / 20, k * .8, { key: key + ' cough' });
      envelope(p[0], p[1], lerp(.3, 1, backOut(clamp(k * 3.2))) * (o.envS ?? u0 / 20), { rot: -.25 + 2.4 * easeOut(fly), flutter: .5 * fly, key: key + ' env' });
      env = p;
    }
    if (o.emote) { rs('emote'); const e = at(M, [5.8 * emoteSide, -TOP - 2]); emote(o.emote, e[0], e[1], u * .9, o.emoteK ?? 1, o.emoteAge ?? T); }
    rs('after');
    return { mouth: mouthPt, top: at(M, [0, -TOP - LID]), hand, envelope: env, bubble };
  }

  const WRIST = { L: [-24, 184], R: [52, 184], sideL: [[-29, 152]], sideR: [[51, 166]] };
  const FINGERS = {
    point: [[-23, 128, -52, 101, 30], [0, 102, 0, 18, 36], [26, 104, 36, 101, 29], [37, 123, 46, 121, 27], [41, 144, 48, 144, 24]],
    thumb: [[-12, 108, -4, 60, 38], [22, 104, 34, 103, 31], [34, 125, 44, 124, 29], [37, 146, 46, 146, 27], [36, 166, 42, 167, 24]],
    wave: [[-24, 134, -64, 106, 29], [-11, 101, -27, 27, 27], [12, 96, 13, 13, 28], [34, 101, 48, 29, 27], [50, 118, 74, 62, 23]],
    lift: [[-23, 128, -52, 101, 30], [0, 102, 0, 18, 36], [26, 104, 37, 52, 26], [37, 123, 52, 78, 25], [41, 144, 58, 110, 22]],
  };
  function handOutline(F) {
    const out = [WRIST.L, ...WRIST.sideL], dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
    const geo = F.map(([bx, by, ex, ey, w], i) => {
      const l = Math.hypot(ex - bx, ey - by) || 1, d = [(ex - bx) / l, (ey - by) / l], L = [d[1], -d[0]], h = w / 2;
      let hb = h;
      if (i > 0) hb = Math.min(hb, dist(F[i - 1], F[i]) * .5);
      if (i < F.length - 1) hb = Math.min(hb, dist(F[i], F[i + 1]) * .5);
      return { b: [bx, by], e: [ex, ey], L, h, hb };
    });
    geo.forEach(({ b, e, L, h, hb }, i) => {
      out.push([b[0] + L[0] * hb, b[1] + L[1] * hb]);
      const a0 = Math.atan2(L[1], L[0]);
      for (let k = 0; k <= 7; k++) { const a = a0 + k / 7 * Math.PI; out.push([e[0] + Math.cos(a) * h, e[1] + Math.sin(a) * h]); }
      out.push([b[0] - L[0] * hb, b[1] - L[1] * hb]);
      if (i < geo.length - 1) {
        const n = geo[i + 1], p0 = [b[0] - L[0] * hb, b[1] - L[1] * hb], p1 = [n.b[0] + n.L[0] * n.hb, n.b[1] + n.L[1] * n.hb];
        const m = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2], tp = [14 - m[0], 140 - m[1]], tl = Math.hypot(...tp) || 1, depth = clamp(dist(p0, p1) * .45, 2.5, 9);
        for (const f of [.3, .5, .7]) { const q = Math.sin(Math.PI * f); out.push([lerp(p0[0], p1[0], f) + tp[0] / tl * depth * q, lerp(p0[1], p1[1], f) + tp[1] / tl * depth * q]); }
      }
    });
    out.push(...WRIST.sideR, WRIST.R);
    return out;
  }
  function mixFingers(A, B, k) { return A.map((f, i) => f.map((v, j) => lerp(v, B[i][j], k))); }
  function drumFingers(phase) {
    const F = FINGERS.point.map(f => f.slice());
    [4, 3, 2].forEach((fi, n) => {
      const p = frac(phase - n * .16), lift = p < .3 ? Math.sin(Math.PI * p / .3) : 0;
      F[fi] = mixFingers([FINGERS.point[fi]], [FINGERS.lift[fi]], lift)[0];
    });
    return F;
  }
  const CUFF = [[-28, 180], [12, 177], [55, 180], [61, 192], [59, 207], [52, 214], [12, 217], [-28, 214], [-35, 207], [-37, 192]];
  function cursorHand(x, y, s, o = {}) {
    const key = 'hand ' + (o.boilKey ?? o.key ?? ''), rs = p => boilSeed(key + ' ' + p), G = CAST.glove, near = detailed();
    const sw = clamp(1.25 * s, .45, 2.2) * lineK(), pose = o.pose || 'point', k = o.from ? clamp(o.k ?? 1) : 1;
    const phase = o.phase ?? T * 2;
    const fingersOf = p => p === 'wave' ? FINGERS.wave : p === 'drum' ? drumFingers(phase) : p === 'thumb' ? FINGERS.thumb : FINGERS.point;
    let shown = pose, F = fingersOf(pose), swap = 0;
    if (o.from && k < 1) { F = mixFingers(fingersOf(o.from), F, ease(k)); shown = k < .5 ? o.from : pose; swap = .6 * Math.sin(Math.PI * k); }
    const press = shown === 'press' ? clamp(o.press ?? 1) : 0;
    const waveA = shown === 'wave' ? .32 * Math.sin(phase * TAU * .55) * (o.from ? ease(k) : 1) : 0;
    const sqz = ([a, b]) => b < 102 ? [a * (1 + .24 * press * (1 - b / 102)), b * (1 - .3 * press)] : [a * (1 + .05 * press), b - 30.6 * press];
    const wav = ([a, b]) => { if (!waveA) return [a, b]; const c = Math.cos(waveA), n = Math.sin(waveA), px = 14, py = 190; return [px + (a - px) * c - (b - py) * n, py + (a - px) * n + (b - py) * c]; };
    const sq = (o.sq || 0) + .12 * swap;
    const M0 = frame(x, y, s, { rot: o.rot || 0, flip: o.flip, sx: 1 + sq * .4, sy: 1 - sq });
    const M = pts => M0(pts.map(p => wav(sqz(p))));

    const handPts = handOutline(F);
    if (o.shadow && o.shadow[2] > .01) {
      rs('shadow');
      const [dx, dy, sk] = o.shadow, Ms = pts => M(pts).map(([a, b]) => [a + dx, b + dy]);
      if (texOK(220 * s)) paint(Ms(handPts), { fill: INK, fillOp: 55 * sk, bleed: .18, tex: .3, border: .2, ink: null, curv: .3 });
      else paint(Ms(handPts), { wash: INK, washOp: 38 * sk, ink: null, curv: .3 });
      paint(Ms(CUFF), { wash: INK, washOp: 36 * sk, ink: null });
    }

    rs('hand');
    const P = M(handPts), len = f => Math.hypot(f[2] - f[0], f[3] - f[1]);
    paint(P, { wash: G.col, ink: null, curv: .3 });
    tone(M([[32, 116], [50, 128], [50, 176], [30, 180]]), G.shade, 150);
    tone(M([[-26, 150], [-8, 158], [-10, 180], [-24, 180]]), G.shade, 110);
    paint(P, { ink: INK, sw, curv: .3 });
    for (let i = 1; i < F.length; i++) {
      const a = F[i - 1], b = F[i];
      if (len(b) > 34 || (i === 1 && len(a) > 34)) continue;
      const v = [(a[0] + b[0]) / 2 + 8, (a[1] + b[1]) / 2], fist = F[1][3] > 80, reach = fist ? 34 : 14;
      inkLine(M([[v[0] - 2, v[1] + 1], [v[0] - reach * .5, v[1] + 2], [v[0] - reach, v[1] + (fist ? 1 : 5)]]), sw * .32, INK, 'inkfine', .5);
    }
    const th = F[0], thumbUp = th[3] < th[1] - 35 && th[2] > th[0] - 12;
    if (thumbUp) inkLine(M([[th[0] + 16, th[1] - 4], [th[0] + 24, th[1] + 8], [th[0] + 22, th[1] + 20]]), sw * .42, INK, 'inkfine', .5);
    else if (len(F[1]) > 40) inkLine(M([[-14, 118], [-17, 131], [-24, 142]]), sw * .42, INK, 'inkfine', .5);
    if (near) {
      const idx = F[1];
      if (len(idx) > 50) for (const f of [.42, .64]) { const cy = lerp(idx[3], idx[1], f), cx = lerp(idx[2], idx[0], f); inkLine(M([[cx - 6, cy], [cx, cy + 1.5], [cx + 6, cy]]), sw * .35, INK, 'inkfine', .5); }
      for (const sx2 of [-2, 12, 26]) inkLine(M([[sx2, 152], [sx2 + 1, 164], [sx2 + 3, 174]]), sw * .4, INK, 'inkfine', .5);
    }
    const thumbTip = at(M, [th[2], th[3]]);
    rs('cuff');
    const cuff = M(CUFF);
    paint(cuff, { wash: G.cuff, ink: null, curv: .45 });
    tone(M([[-33, 203], [58, 203], [55, 213], [-30, 213]]), G.shade, 140);
    paint(cuff, { ink: INK, sw: sw * .9, curv: .45 });
    inkLine(M([[-34, 195], [12, 192], [59, 195]]), sw * .55, INK, 'inkfine', .5);
    if (press > .4) {
      rs('press');
      const pk = seg(press, .4, 1);
      for (const a of [-2.3, -1.57, -.84]) inkLine([[x + Math.cos(a) * 22 * s, y + Math.sin(a) * 22 * s], [x + Math.cos(a) * (22 + 14 * pk) * s, y + Math.sin(a) * (22 + 14 * pk) * s]], sw * .8, INK, 'ink', 0);
    }
    if (shown === 'drum' && near) {
      rs('taps');
      [4, 3, 2].forEach((fi, n) => {
        const p = frac(phase - n * .16); if (p < .3 || p > .5) return;
        const f = FINGERS.point[fi], tip = at(M, [f[2] + 12, f[3] - 6]), q = seg(p, .3, .5);
        for (const a of [-1.1, -.3]) inkLine([[tip[0] + Math.cos(a) * 6 * s, tip[1] + Math.sin(a) * 6 * s], [tip[0] + Math.cos(a) * (10 + 8 * q) * s, tip[1] + Math.sin(a) * (10 + 8 * q) * s]], sw * .6 * (1 - q), INK, 'ink', 0);
      });
    }
    rs('after');
    return { tip: [x, y], palm: at(M, [14, 140]), thumb: thumbTip };
  }

  const S = PROPS.sheet;
  const boltRef = (x, y, t, mood = 'happy') => typeof qwik === 'function' ? qwik(x, y, 20, { ...boltFeel(mood, t), boilKey: 'bolt' }) : bolt(x, y, 20, { ...boltFeel(mood, t), boilKey: 'bolt' });
  const paper = () => paint(rectPts(-50, -50, W + 100, H + 100), { wash: PAL.paper, ink: null });
  const road = (x0, x1, y, key) => { boilSeed('road ' + key); paint(rrPts(x0, y, x1 - x0, 16, 8, .5), { wash: '#DCEBF2', ink: INK, sw: .6 }); inkLine([[x0 + 10, y + 5], [x1 - 10, y + 5]], .5, '#FFFFFF', 'inkfine', 0); };

  LOOPS.castSnail = t => {
    paper();
    const crawl = t * .5;
    [['blue', 'menu'], ['purple', 'heart'], ['teal', 'star']].forEach(([shell, carry], i) => {
      const cx = 330 + i * 630;
      S.cell(cx - 305, 12, 610, 372, 'big' + i);
      snail(cx - 20, 340, 38, { ...feel(['happy', 'neutral', 'hopeful'][i], t, { seed: i }), crawl: crawl + i * .33, carry, shell, trail: 60, boilKey: 'big' + i });
      S.floor(cx - 280, cx + 280, 342, 'big' + i);
    });
    const cells = [
      (x, y, k) => { const d = ease(seg(k, .8, 1)) * (1 - ease(seg(k, 2.6, 3))); snail(x, y, 28, { shell: 'blue', crawl, carry: 'share', duck: d, lookY: -d, boilKey: 'duck' }); if (d > .1) speedLines(x - 100, y - 150, 210, -1, d, { key: 'duckwhoosh' }); },
      (x, y, k) => snail(x, y, 28, { shell: 'purple', hide: ease(seg(k, .6, 1.2)) * (1 - ease(seg(k, 3, 3.6))), eyes: k < 2.8 ? 'normal' : 'wide', seed: 2, boilKey: 'hide' }),
      (x, y) => snail(x, y, 28, { ...feel('determined', t), crawl: t * .8, carry: 'cart', shell: 'teal', sweat: 1, mouth: 'wobble', boilKey: 'sweat' }),
      (x, y, k) => snail(x, y, 28, { ...emotions(k, [[0, 'sleepy', { eyes: 'closed' }], [2, 'surprised'], [3, 'happy']]), shell: 'blue', droop: 1 - ease(seg(k, 1.9, 2.2)), boilKey: 'nap' }),
      (x, y) => snail(x, y, 28, { ...feel('neutral', t), mouth: 'smile', lookX: Math.sin(t * TAU * .5), lookY: .3 * Math.sin(t * TAU), crawl, shell: 'purple', boilKey: 'look' }),
    ];
    cells.forEach((draw, i) => {
      const cx = 160 + i * 300;
      S.cell(cx - 148, 392, 296, 330, 'state' + i);
      draw(cx - 10, 668, t % 4);
      S.floor(cx - 128, cx + 128, 670, 'state' + i);
    });
    S.cell(4, 730, 1500, 340, 'real');
    road(40, 1470, 990, 'real');
    snail(210, 990, 20, { shell: 'blue', crawl, carry: 'menu', boilKey: 'r1' });
    snail(400, 990, 20, { shell: 'purple', crawl: crawl + .4, carry: 'heart', boilKey: 'r2' });
    snail(590, 990, 20, { shell: 'teal', crawl: crawl + .7, carry: 'cart', sweat: 1, ...feel('determined', t), boilKey: 'r3' });
    snail(780, 990, 20, { shell: 'blue', eyes: 'closed', emote: 'zzz', emoteAge: t, boilKey: 'r4' });
    snail(930, 990, 20, { shell: 'purple', hide: 1, boilKey: 'r5' });
    snail(1080, 990, 20, { ...feel('love', t), shell: 'teal', crawl, boilKey: 'r6' });
    jsBox(1250, 990, 1, 'gear', { hop: 1 });
    jsBox(1370, 990, 1, 'share', { hop: 1 });
    S.cell(1510, 392, 406, 678, 'bolt');
    S.floor(1540, 1890, 1030, 'bolt');
    boltRef(1735, 1030, t);
    snail(1600, 1030, 20, { shell: 'blue', crawl, carry: 'star', boilKey: 'r7' });
  };
  LOOPS.castSnail.len = 4;

  LOOPS.castDb = t => {
    paper();
    const k = t % 4, U = 22, cellAt = (i) => [15 + (i % 3) * 632, i < 3 ? 15 : 545];
    const floorY = y => y + 470;
    const draw = [
      (x, y) => db(x, y, U, { ...feel('sleepy', t, { eyes: 'closed' }), snore: .55 + .35 * Math.sin(t * TAU * .5), dim: .6, boilKey: 'd1' }),
      (x, y) => {
        const snore = k < 1.7 ? lerp(.3, 1, ease(seg(k, 0, 1.6))) : k > 2.9 ? .55 * ease(seg(k, 2.9, 4)) : 1, burst = seg(k, 1.7, 2.05);
        const jolt = k > 1.7 ? .12 * Math.exp(-(k - 1.7) * 7) * Math.cos((k - 1.7) * 30) : 0;
        const r = db(x, y, U, { ...feel('sleepy', t, { eyes: 'closed' }), sq: jolt, snore, pop: k > 1.7 && k < 2.9 ? burst : 0, smack: seg(k, 2, 2.85), dim: .5, boilKey: 'd2' });
        const b = r.bubble || [x + 40, y - 100, 20], reach = ease(seg(k, 1.15, 1.7)) * (1 - ease(seg(k, 1.95, 2.5)));
        cursorHand(lerp(b[0] + 230, b[0] + b[2] * .85, reach), b[1] - 4, .5, { pose: 'point', rot: -Math.PI / 2 - .05, key: 'poker' });
      },
      (x, y) => db(x, y, U, { ...feel('sleepy', t, { eyes: 'closed' }), roll: ease(seg(k, .6, 1.6)) * (1 - ease(seg(k, 2.8, 3.8))), rollDir: -1, dim: .5, snore: .4, boilKey: 'd3' }),
      (x, y) => {
        const hit = 1.85, awake = k > 1;
        const mood = emotions(k, [[0, 'sleepy', { eyes: 'closed' }], [1, 'surprised'], [1.45, 'angry'], [2.3, 'bored']]);
        db(x - 40, y, U, { ...mood, slap: seg(k, 1.45, 2.3), slapDir: 1, capUp: awake ? .9 * Math.exp(-(k - 1) * 2.5) * Math.abs(Math.cos((k - 1) * 9)) : 0, dim: awake ? 0 : .5, boilKey: 'd4' });
        const flat = k > hit ? Math.exp(-(k - hit) * 1.2) : 0;
        alarmClock(x + 178, y, 1.1, { ring: k < hit ? 1 : 0, squash: .8 * flat, key: 'd4clock' });
      },
      (x, y) => db(x - 60, y, U, { ...emotions(k, [[0, 'neutral'], [2.4, 'relieved']]), cough: seg(k, .6, 2.2), coughTo: [x + 170, y - 360], boilKey: 'd5' }),
      (x, y) => { db(x - 120, y, 20, { ...feel('happy', t), boilKey: 'd6' }); boltRef(x + 175, y, t, 'excited'); },
    ];
    draw.forEach((f, i) => {
      const [x0, y0] = cellAt(i);
      S.cell(x0, y0, 620, 520, 'db' + i);
      f(x0 + 310, floorY(y0), i);
      S.floor(x0 + 30, x0 + 590, floorY(y0), 'db' + i);
    });
  };
  LOOPS.castDb.len = 4;

  LOOPS.castHand = t => {
    paper();
    const page = (x, y, w, h, key) => { boilSeed('hand page ' + key); paint(rrPts(x, y, w, h, 16, 1), { wash: '#F1EBFB', ink: INK, sw: .6 }); };
    const button = (x, y, press, lit, key) => {
      boilSeed('hand button ' + key);
      const sq = .22 * press, w = 170 * (1 + sq * .3), h = 46 * (1 - sq);
      paint(rrPts(x - w / 2, y - h / 2 + 23 * sq, w, h, h / 2, .5), { wash: mixCol(QWIK.purple, '#FFE08A', .25 * lit), ink: INK, sw: .9 });
      icon('cart', x - 40, y + 23 * sq, 26, PAL.cream, { key: 'btn ' + key });
      paint(rrPts(x - 12, y - 4 + 23 * sq, 60, 8, 4), { wash: PAL.cream, ink: null });
    };
    ['point', 'thumb', 'wave', 'drum'].forEach((pose, i) => {
      const x0 = 15 + i * 477;
      page(x0, 15, 465, 510, 'p' + i);
      const bob = 6 * Math.sin(t * TAU * .5 + i);
      const pump = pose === 'thumb' ? Math.max(0, Math.sin(t * TAU)) : 0;
      cursorHand(x0 + 210, 90 + bob - 14 * pump, 1.3, { pose, phase: t * 1.5, rot: pose === 'point' ? .06 * Math.sin(t * TAU * .25) : pose === 'thumb' ? -.12 * pump : 0, shadow: [22 + 8 * pump, 26 + 10 * pump, 1], key: 'pose' + i });
    });
    page(15, 540, 1180, 525, 'press');
    const BY = 700, phases = [[0, 1], [.35, .5], [1, 0], [.35, .5], [0, 1]];
    phases.forEach(([pr, lift], i) => {
      const x = 130 + i * 230, pressed = pr > .5 ? pr : 0;
      button(x, BY, pressed, i === 2 ? 1 : 0, 's' + i);
      cursorHand(x + 14, BY - 4 + 5 * pressed, .95 * (1 + .05 * lift), { pose: pr > 0 ? 'press' : 'point', press: pr, shadow: [6 + 24 * lift, 8 + 28 * lift, 1 - .3 * lift], key: 'seq' + i });
      if (i === 2) clickSpark(x - 22, BY - 62, .9, { state: 'born', age: .12, key: 'seq' });
      if (i === 3) clickSpark(x - 50, BY - 105, .9, { state: 'fly', dir: [-.5, -1], trail: 45, key: 'seq3' });
    });
    page(1210, 540, 695, 525, 'loop');
    const k = t % 2, press = seg(k, .35, .5) * (1 - seg(k, .75, .95)), lift = 1 - press;
    button(1350, BY, press > .5 ? press : 0, seg(k, .5, .6) * (1 - seg(k, 1.3, 1.8)), 'loop');
    cursorHand(1364, BY - 4 + 5 * (press > .5 ? press : 0), .95 * (1 + .05 * lift), { pose: press > .02 ? 'press' : 'point', press, shadow: [6 + 24 * lift, 8 + 28 * lift, 1 - .3 * lift], key: 'loop' });
    if (k > .5) clickSpark(lerp(1328, 1280, easeOut(seg(k, .5, 1.3))), lerp(640, 600, easeOut(seg(k, .5, 1.3))), .9, { state: k < .9 ? 'born' : 'idle', age: k - .5, key: 'loop' });
    S.floor(1640, 1890, 1040, 'bolt');
    boltRef(1755, 1040, t, 'cool');
    cursorHand(1500, 830, 1, { pose: 'wave', phase: t * 1.2, shadow: [14, 18, .8], key: 'scale' });
  };
  LOOPS.castHand.len = 4;

  CAST.snailCarry = snailCarry;
  Object.assign(window, { CAST, snail, snailCarry, db, cursorHand });
})();
