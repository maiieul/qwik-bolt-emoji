(() => {
  const INK = PAL.ink;
  const PROPS = {
    kinds: ['menu', 'heart', 'star', 'share', 'gear', 'cart'],
    js: '#F7DF1E', jsDk: '#D2A814', jsLt: '#FFF3A6', jsLid: '#FBE64A',
    html: '#E8763A', htmlDk: '#B9521F', htmlLt: '#F8A56C', htmlIn: '#F6C29A', twine: '#F7E8C8',
    cream: '#FFF6E4', paperW: '#FFFBF1', gold: '#FFC93C', goldLt: '#FFF0A8', goldDk: '#E09612',
    wax: '#8A5BDB', waxDk: '#5F3BA8', waxLt: '#D9C2FF',
    brass: '#E3A33A', brassDk: '#A96F1C', brassLt: '#FFE0A0',
    confetti: ['#AC7EF4', '#18B6F6', '#F7DF1E', '#E8763A', '#E2476E', '#2FB8A6'],
    box: { w: 65, h: 57 }, parcel: { w: 84, h: 52 }, envelope: { w: 80, h: 52 }, slip: { w: 62, h: 86 },
    beatOff: { menu: 0, heart: 1 / 3, star: 2 / 3, share: 1, gear: 4 / 3, cart: 5 / 3 },
  };

  const zoom = () => (typeof lod === 'function' ? lod() : 1);
  const lineK = () => { const z = zoom(); return z < .5 ? Math.pow(z, -.5) : 1; };
  const detailed = () => zoom() >= .5;
  const dirVec = d => {
    if (Array.isArray(d)) { const l = Math.hypot(d[0], d[1]) || 1; return [d[0] / l, d[1] / l]; }
    return [Math.sign(d) || 1, 0];
  };
  function frame(x, y, s, o = {}) {
    const r = o.rot || 0, c = Math.cos(r), n = Math.sin(r), k = o.skew || 0;
    const sx = (o.sx ?? 1) * s * (o.flip ? -1 : 1), sy = (o.sy ?? 1) * s;
    return pts => pts.map(([a, b]) => { const u = (a + k * b) * sx, v = b * sy; return [x + u * c - v * n, y + u * n + v * c]; });
  }
  const at = (M, p) => M([p])[0];
  const texOK = px => px * zoom() > 150;
  // A textured fill costs ~3 ms per shape; a wash is nearly free.
  function tone(P, col, op = 100, textured = false) {
    if (textured) paint(P, { fill: col, fillOp: op, bleed: .05, tex: .55, border: .5, ink: null });
    else paint(P, { wash: col, washOp: Math.min(255, op * .72), ink: null });
  }
  function softShadow(P, op = 70) {
    let cx = 0, cy = 0; for (const [a, b] of P) { cx += a; cy += b; } cx /= P.length; cy /= P.length;
    const grow = k => P.map(([a, b]) => [cx + (a - cx) * k, cy + (b - cy) * (1 + (k - 1) * 1.6)]);
    paint(grow(1.15), { wash: INK, washOp: op * .26, ink: null });
    paint(grow(.88), { wash: INK, washOp: op * .36, ink: null });
  }
  const seeder = key => part => boilSeed(key + ' ' + part);
  const closeMid = P => { let j = 0; for (let i = 1; i < P.length; i++) if (P[i][1] > P[j][1]) j = i; return P.slice(j).concat(P.slice(0, j)); };

  function thick(P, w) {
    const n = P.length, L = [], R = [];
    const unit = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; };
    for (let i = 0; i < n; i++) {
      const d1 = i > 0 ? unit(P[i - 1], P[i]) : unit(P[0], P[1]), d2 = i < n - 1 ? unit(P[i], P[i + 1]) : d1;
      let tx = d1[0] + d2[0], ty = d1[1] + d2[1]; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
      const nx = -ty, ny = tx, m = (w / 2) / Math.max(.35, nx * -d1[1] + ny * d1[0]);
      L.push([P[i][0] + nx * m, P[i][1] + ny * m]); R.push([P[i][0] - nx * m, P[i][1] - ny * m]);
    }
    return L.concat(R.reverse());
  }
  function crescent(cx, cy, r, a0, a1, w, n = 14) {
    const out = [], inn = [];
    for (let i = 0; i <= n; i++) {
      const k = i / n, a = lerp(a0, a1, k), t = w * Math.pow(Math.sin(k * Math.PI), .7) + w * .08;
      out.push([cx + Math.cos(a) * (r + t / 2), cy + Math.sin(a) * (r + t / 2)]);
      inn.push([cx + Math.cos(a) * (r - t / 2), cy + Math.sin(a) * (r - t / 2)]);
    }
    return out.concat(inn.reverse());
  }
  function blobPts(cx, cy, r, n, amp, seed) {
    const p = [];
    for (let i = 0; i < n; i++) { const a = i / n * TAU, q = r * (1 + amp * (hash(seed + i * 1.37) - .5) * 2); p.push([cx + Math.cos(a) * q, cy + Math.sin(a) * q]); }
    return p;
  }
  function puffPts(cx, cy, r, bumps, seed, n = 30) {
    const p = [];
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU + seed, q = r * (1 + .16 * Math.pow(Math.abs(Math.sin(a * bumps / 2 + seed)), .6));
      p.push([cx + Math.cos(a) * q, cy + Math.sin(a) * q * .92]);
    }
    return p;
  }

  const GLYPH = {
    H: [[[0, 0], [0, 1]], [[.62, 0], [.62, 1]], [[0, .5], [.62, .5]]],
    T: [[[0, 0], [.72, 0]], [[.36, 0], [.36, 1]]],
    M: [[[0, 1], [0, 0], [.4, .6], [.8, 0], [.8, 1]]],
    L: [[[0, 0], [0, 1], [.56, 1]]],
    J: [[[.56, 0], [.56, .66], [.5, .88], [.3, 1], [.1, .95], [0, .78]]],
    S: [[[.6, .16], [.44, .02], [.2, .02], [.04, .2], [.14, .42], [.46, .56], [.62, .76], [.5, .96], [.22, 1], [0, .86]]],
  };
  const CURVY = { J: .5, S: .5 };
  const glyphW = ch => { const G = GLYPH[ch]; let w = .16; if (G) for (const st of G) for (const p of st) w = Math.max(w, p[0]); return w; };
  const glyphWidth = (txt, h) => [...txt].reduce((x, ch) => x + (glyphW(ch) + .34) * h, 0) - .34 * h;
  function glyphs(txt, M, x0, y0, h, col, sw) {
    let x = x0;
    for (const ch of txt) {
      for (const st of GLYPH[ch] || []) inkLine(M(st.map(([a, b]) => [x + a * h, y0 + b * h])), sw, col, 'inkfine', CURVY[ch] || 0);
      x += (glyphW(ch) + .34) * h;
    }
  }

  function gearPts(n = 8, R = .5, r = .37, hole = .15) {
    const pol = (q, a) => [Math.cos(a) * q, Math.sin(a) * q], out = [], tw = TAU / n;
    for (let i = 0; i < n; i++) {
      const a = i * tw - Math.PI / 2 - tw * .27;
      out.push(pol(r, a), pol(R, a + tw * .1), pol(R, a + tw * .44), pol(r, a + tw * .54), pol(r * 1.01, a + tw * .77));
    }
    const H = []; for (let k = 0; k <= 14; k++) H.push(pol(hole, -Math.PI / 2 - tw * .27 - k / 14 * TAU));
    return [...out, out[0], ...H, out[0]];
  }
  const ICON = {
    menu: () => [-.29, 0, .29].map(cy => rrPts(-.42, cy - .08, .84, .16, .075)),
    heart: () => [heartPts(0, -.075, .5)],
    star: () => [starPts(0, .05, .56, .45, 5)],
    share: () => [
      thick([[-.05, -.37], [-.39, -.37], [-.39, .39], [.37, .39], [.37, .05]], .13),
      thick([[-.1, .17], [.3, -.23]], .14),
      [[.47, -.47], [.1, -.39], [.39, -.1]],
    ],
    gear: () => [gearPts()],
    cart: () => [
      thick([[-.52, -.4], [-.37, -.4], [-.3, -.22]], .1),
      [[-.34, -.27], [.52, -.27], [.41, .1], [-.21, .1]],
      thick([[-.24, .06], [-.18, .22], [.42, .22]], .1),
      ellPts(-.11, .36, .095, .095, 10), ellPts(.33, .36, .095, .095, 10),
    ],
  };
  function icon(kind, x, y, s, col = INK, o = {}) {
    const shapes = ICON[kind];
    if (!shapes || s < 2) return;
    boilSeed('icon ' + kind + ' ' + (o.key ?? ''));
    const M = frame(x, y, s, o), shake = pts => pts.map(([a, b]) => [a + jit(.014), b + jit(.014)]);
    const sw = o.sw ?? clamp(s / 34, .35, 1.4) * lineK();
    const hollow = o.hollow && (kind === 'heart' || kind === 'star');
    for (const pts of shapes()) {
      const P = M(shake(pts));
      if (hollow) paint(P, { ink: col, sw });
      else if (o.fill) paint(P, { wash: o.fill, washOp: o.op ?? 255, ink: col, sw });
      else paint(P, { wash: col, washOp: o.op ?? 255, ink: null });
    }
  }

  function hopPose(kind, o) {
    const a = o.hop || 0;
    if (a <= 0) return { dy: 0, sq: 0 };
    const ph = frac((bpOf(T) + (o.beat ?? PROPS.beatOff[kind] ?? 0)) / 2);
    if (ph < .14) return { dy: 0, sq: .16 * a * ease(ph / .14) };
    if (ph < .5) { const k = (ph - .14) / .36; return { dy: -a * 20 * 4 * k * (1 - k), sq: -.13 * a * (1 - Math.abs(2 * k - 1)) + .16 * a * Math.max(0, 1 - k * 5) }; }
    const q = (ph - .5) * 2 * BEAT; return { dy: 0, sq: .2 * a * Math.exp(-q * 13) * Math.cos(q * 34) };
  }
  function jsBox(x, y, s, kind, o = {}) {
    const rs = seeder('jsbox ' + (o.key ?? kind)), near = detailed();
    const sw = clamp(.72 * s, .32, 1.5) * lineK();
    const hop = hopPose(kind, o), sq = (o.squash || 0) + hop.sq, lift = -hop.dy * s;
    const rot = (o.rot || 0) + (o.wobble || 0) * .15 * Math.sin(T * TAU * 5.5);
    const M = frame(x, y - lift, s, { rot, sx: 1 + sq * .45, sy: 1 - sq });
    rs('shadow');
    if (!o.noShadow) {
      const k = 1 - .5 * clamp(lift / (30 * s));
      softShadow(ellPts(x, y + s, 32 * s * k, 5 * s * k, 16), 70 * k);
    }
    rs('glow');
    const lit = clamp(o.lit || 0);
    if (lit > .01) { const c = at(M, [0, -30]); glow(c[0], c[1], 105 * s, '#FFD27A', lit); }
    rs('body');
    const body = M(rrPts(-29, -46, 58, 46, 5, .5));
    paint(body, { wash: lit ? mixCol(PROPS.js, '#FFF3A0', .45 * lit) : PROPS.js, ink: null });
    tone(M(rectPts(-28, -15, 56, 14, .5)), PROPS.jsDk, 100);
    tone(M(rectPts(17, -44, 11, 40, .5)), PROPS.jsDk, 75);
    tone(M(rectPts(-27, -46, 54, 5, .3)), PROPS.jsDk, 150);
    paint(closeMid(body), { ink: INK, sw });
    rs('lid');
    const lid = M(rrPts(-32.5, -57, 65, 12, 3.5, .4));
    paint(lid, { wash: lit ? mixCol(PROPS.jsLid, '#FFF6B8', .45 * lit) : PROPS.jsLid, ink: null });
    paint(closeMid(lid), { ink: INK, sw: sw * .92 });
    inkLine(M([[-26, -53.5], [-8, -54]]), sw * .6, PROPS.jsLt, 'inkfine', 0);
    if (near) {
      rs('icon'); const c = at(M, [-2.5, -24.5]);
      icon(kind, c[0], c[1], 29 * s, INK, { rot, sx: 1 + sq * .45, sy: 1 - sq, key: o.key ?? 'box' });
      rs('stamp'); glyphs('JS', M, 12.5, -12.5, 8.5, INK, clamp(.42 * s, .2, .9));
    }
    if (o.emote) { rs('emote'); const e = at(M, [30, -62]); emote(o.emote, e[0], e[1], 9 * s, o.emoteK ?? 1, o.emoteAge ?? T); }
    rs('after');
    return { top: at(M, [0, -57]), mid: at(M, [0, -28]) };
  }

  const PART_H = { header: 50, hero: 110, card: 120, skeleton: 70, reviews: 70, footer: 40 };
  function partRects(parts, [x0, y0, x1, y1]) {
    const gap = 6, total = parts.reduce((s, p) => s + (PART_H[p] || 60), 0) + gap * (parts.length - 1), k = (y1 - y0) / total;
    let y = y0;
    return parts.map(p => { const h = (PART_H[p] || 60) * k, r = [x0, y, x1, y + h]; y += h + gap * k; return r; });
  }
  function slotUnion(parts) {
    if (typeof pageSlot !== 'function') return null;
    const R = parts.map(p => pageSlot(p)).filter(r => Array.isArray(r) && r.length === 4);
    if (!R.length) return null;
    return [Math.min(...R.map(r => r[0])), Math.min(...R.map(r => r[1])), Math.max(...R.map(r => r[2])), Math.max(...R.map(r => r[3]))];
  }
  const PART_COL = { header: QWIK.purple, hero: QWIK.blue, card: '#EFE7FC', skeleton: '#CFCAD8', reviews: '#F4EFFB', footer: '#3E3760' };
  function partPlaceholder(kind, [x0, y0, x1, y1]) {
    const w = x1 - x0, h = y1 - y0;
    paint(rectPts(x0, y0, w, h), { wash: PART_COL[kind] || '#EEE8F6', ink: INK, sw: .5 });
    if (kind === 'hero') paint([[x0, y1], [x0, y0 + h * .6], [x0 + w * .4, y0 + h * .35], [x0 + w * .75, y0 + h * .65], [x1, y0 + h * .5], [x1, y1]], { wash: '#7FC47E', ink: null });
    if (kind === 'card') paint(rrPts(x1 - w * .3, y1 - h * .35, w * .24, h * .22, h * .06), { wash: QWIK.purple, ink: null });
    if (kind === 'reviews') for (let i = 0; i < 5; i++) paint(starPts(x0 + w * (.1 + i * .07), y0 + h * .5, h * .22, .45, 5), { wash: PROPS.gold, ink: null });
  }
  function drawParts(parts, rect) {
    const R = partRects(parts, rect);
    parts.forEach((p, i) => {
      boilSeed('parcel part ' + p);
      if (typeof pagePart === 'function') {
        const [a, b, c, d] = R[i];
        try { pagePart(p, a, b, c - a, d - b, {}); return; } catch (e) { partPlaceholder(p, R[i]); return; }
      }
      partPlaceholder(p, R[i]);
    });
  }
  function parcel(x, y, s, o = {}) {
    const rs = seeder('parcel ' + (o.key ?? '')), near = detailed();
    const sw = clamp(.75 * s, .32, 1.5) * lineK(), dir = Math.sign(o.dir ?? 1) || 1;
    const u = clamp(o.unfold || 0), st = clamp(o.stretch || 0);
    const untie = seg(u, 0, .3), open = seg(u, .24, .62), away = seg(u, .55, 1);
    const puff = .1 * Math.sin(Math.PI * untie), sq = (o.squash || 0);
    const M = frame(x, y, s, { rot: o.rot || 0, sx: (1 + .55 * st) * (1 + sq * .45) + puff, sy: (1 - .22 * st) * (1 - sq) + puff * .6, skew: .18 * st * dir });
    const paperOp = 255 * (1 - away);
    rs('shadow');
    if (!o.noShadow && away < 1) softShadow(ellPts(x, y + s, 44 * s * (1 + .4 * st), 5 * s, 16), 65 * (1 - away));
    const parts = o.part ? (Array.isArray(o.part) ? o.part : [o.part]) : null;
    const inner = M([[-36, -46], [36, -6]]);
    const from = [Math.min(inner[0][0], inner[1][0]), Math.min(inner[0][1], inner[1][1]), Math.max(inner[0][0], inner[1][0]), Math.max(inner[0][1], inner[1][1])];
    let content = from;
    if (u <= .24) {
      rs('body');
      const body = M(rrPts(-42, -52, 84, 52, 6, .5));
      paint(body, { wash: PROPS.html, ink: null });
      tone(M(rectPts(-41, -16, 82, 15, .5)), PROPS.htmlDk, 90);
      tone(M(rectPts(28, -50, 13, 46, .5)), PROPS.htmlDk, 70);
      tone(M(ellPts(-20, -40, 18, 7, 12)), PROPS.htmlLt, 120);
      inkLine(M([[-37, -44], [-6, -45], [12, -44]]), sw * .5, PROPS.htmlDk, 'inkfine', .5);
      inkLine(M([[-41, -12], [-34, -5]]), sw * .45, PROPS.htmlDk, 'inkfine', 0);
      paint(closeMid(body), { ink: INK, sw });
      if (near) {
        rs('label');
        const lab = M(rrPts(-37, -25, 44, 17, 3, .3).map(([a, b]) => [a + (b + 16) * .06, b]));
        paint(lab, { wash: PROPS.cream, ink: INK, sw: sw * .55 });
        const gw = glyphWidth('HTML', 8.4), L = frame(0, 0, 1, { skew: .06 });
        glyphs('HTML', pts => M(L(pts.map(([a, b]) => [a, b + 16])).map(([a, b]) => [a, b - 16])), -15 - gw / 2, -20.6, 8.4, INK, clamp(.44 * s, .2, .9));
      }
      rs('string');
      if (untie < .55) {
        const tug = 1 + untie * .6, tw = PROPS.twine;
        paint(M(thick([[-43, -30], [0, -30.6], [43, -30]], 3.6)), { wash: tw, ink: INK, sw: sw * .45 });
        paint(M(thick([[20, -53], [20.5, -27], [20, 1]], 3.6)), { wash: tw, ink: INK, sw: sw * .45 });
        if (near) {
          const bx = 20, by = -53, lp = 9 * tug * (1 - untie * .8), wig = .15 * Math.sin(T * TAU * 2 + 1);
          for (const sd of [-1, 1]) {
            paint(M(ellPts(bx + sd * lp * .8, by - lp * .45, lp * .8, lp * .42, 12, .3, sd * (.5 + wig))), { wash: tw, ink: INK, sw: sw * .45 });
            paint(M(thick([[bx, by], [bx + sd * 5, by + 7], [bx + sd * 7, by + 12 + 2 * wig]], 2.8)), { wash: tw, ink: INK, sw: sw * .4 });
          }
          paint(M(ellPts(bx, by, 3.6, 3, 8)), { wash: tw, ink: INK, sw: sw * .45 });
        }
      }
    }
    if (untie >= .55 && untie < 1) {
      rs('snap');
      const k = seg(untie, .55, 1), fade = 1 - k;
      [[20, -53, -1.2], [-43, -30, 3.3], [43, -30, -.2], [20, 1, 1.6]].forEach(([a, b, ang], i) => {
        const p = at(M, [a + Math.cos(ang) * 30 * k, b + Math.sin(ang) * 30 * k - 20 * k * (1 - k)]);
        if (fade > .05) inkLine([[p[0], p[1]], [p[0] + Math.cos(ang + 1) * 8 * s, p[1] + Math.sin(ang + 1) * 8 * s], [p[0] + Math.cos(ang) * 12 * s, p[1] + Math.sin(ang) * 12 * s]], sw * .8 * fade, PROPS.twine, 'ink', .6);
      });
    }
    if (u > .24) {
      if (away > 0 && parts) {
        const to = o.to || slotUnion(parts) || [from[0] - 30 * s, from[1] - 60 * s, from[2] + 30 * s, from[3] + 10 * s], k = backOut(away);
        content = from.map((v, i) => lerp(v, to[i], k));
      }
      if (away < 1) {
        rs('open');
        const f = Math.cos(Math.PI * open), inside = mixCol(PROPS.htmlIn, PROPS.paperW, .2);
        const drop = 40 * s * away * away, shrinkP = 1 - .55 * away, tilt = .35 * away * dir, c0 = at(M, [0, -26]);
        const N = pts => M(pts).map(([a, b]) => { const dx = (a - c0[0]) * shrinkP, dy = (b - c0[1]) * shrinkP; return [c0[0] + dx * Math.cos(tilt) - dy * Math.sin(tilt), c0[1] + drop + dx * Math.sin(tilt) + dy * Math.cos(tilt)]; });
        paint(N(rrPts(-42, -52, 84, 52, 6, .4)), { wash: PROPS.htmlDk, washOp: paperOp, ink: INK, sw: sw * (1 - away) });
        paint(N(rectPts(-38, -48, 76, 44, .3)), { wash: inside, washOp: paperOp, ink: null });
        for (const [hinge, dirY] of [[-52, 1], [0, -1]]) {
          const tip = hinge + dirY * 26 * f;
          const flap = [[-42, hinge], [42, hinge], [40, tip], [-40, tip]];
          if (Math.abs(f) > .04) paint(N(flap), { wash: f > 0 ? PROPS.html : inside, washOp: paperOp, ink: INK, sw: sw * .8 * (1 - away) });
        }
        if (near && f > .25 && away < .05) {
          const L = pts => N(pts.map(([a, b]) => [a + (b + 16) * .06, b * f]));
          paint(L(rrPts(-37, -25, 44, 17, 3, .3)), { wash: PROPS.cream, ink: INK, sw: sw * .55 });
          const gw = glyphWidth('HTML', 8.4);
          glyphs('HTML', L, -15 - gw / 2, -20.6, 8.4, INK, clamp(.44 * s, .2, .9));
        }
      }
      if (parts && open > .2) drawParts(parts, content);
    }
    rs('after');
    return { top: at(M, [0, -52]), mid: at(M, [0, -26]), content };
  }

  function boltMark(cx, cy, h, col, ink, sw) {
    if (typeof BOLT === 'undefined') { paint(starPts(cx, cy, h * .5, .45, 4), { wash: col, ink: null }); return; }
    const base = typeof roundedPts === 'function' ? roundedPts(BOLT, BOLT_R) : BOLT, k = h / 16.3;
    paint(base.map(([a, b]) => [cx + (a - BODY_CX) * k, cy + (b - BODY_CY) * k]), { wash: col, ink, sw });
  }
  function envelope(x, y, s, o = {}) {
    const rs = seeder('envelope ' + (o.key ?? '')), near = detailed();
    const sw = clamp(.72 * s, .32, 1.5) * lineK(), sq = o.squash || 0;
    const rot = (o.rot || 0) + (o.flutter || 0) * .13 * Math.sin(T * TAU * 3.1);
    const M = frame(x, y, s, { rot, sx: (o.sx ?? 1) * (1 + sq * .45), sy: (o.sy ?? 1) * (1 - sq) });
    rs('glow'); if (o.lit > .01) glow(x, y, 90 * s, '#FFE3A0', o.lit);
    rs('body');
    const body = M(rrPts(-40, -26, 80, 52, 3.5, .4));
    paint(body, { wash: PROPS.cream, ink: null });
    tone(M(rectPts(-39, 12, 78, 13, .4)), '#E9D3AE', 110);
    inkLine(M([[-39, 25], [-7, 3]]), sw * .5, mixCol(INK, PROPS.cream, .35), 'inkfine', 0);
    inkLine(M([[39, 25], [7, 3]]), sw * .5, mixCol(INK, PROPS.cream, .35), 'inkfine', 0);
    const flap = M([[-40, -26], [40, -26], [3, 5], [-3, 5]]);
    paint(flap, { wash: '#F8E9CC', ink: null });
    tone(M(rectPts(-30, -25, 60, 8, .3)), '#E9D3AE', 90);
    inkLine(M([[-40, -26], [-3, 4.5], [3, 4.5], [40, -26]]), sw * .7, INK, 'ink', .15);
    paint(closeMid(body), { ink: INK, sw });
    rs('seal');
    const seal = M(blobPts(0, 4, 12.5, 16, .06, 3.1));
    paint(seal, { wash: PROPS.wax, ink: null });
    tone(M(ellPts(3, 8, 9, 6, 12)), PROPS.waxDk, 120);
    paint(closeMid(seal), { ink: INK, sw: sw * .7 });
    if (near) {
      const c = at(M, [0, 4]);
      push(); translate(c[0], c[1]); rotate(rot);
      boltMark(0, 0, 15.5 * s, PROPS.waxLt, PROPS.waxDk, sw * .35);
      pop();
      inkLine(M([[-8, -2], [-6, -6], [-2, -8]]), sw * .5, PROPS.waxLt, 'inkfine', .5);
    }
    rs('after');
    return { seal: at(M, [0, 4]) };
  }

  const THUMB = [['titleBar', 0, .07, '#DCD4EC'], ['header', .09, .19, QWIK.purple], ['hero', .21, .44, QWIK.blue], ['card', .46, .7, '#EDE4FB'], ['reviews', .72, .86, '#F5F0FC'], ['footer', .88, .97, '#3E3760']];
  function pageThumb(M, x0, y0, w, h, cut, sw) {
    for (const [kind, a, b, col] of THUMB) {
      const top = y0 + a * h, bot = Math.min(y0 + b * h, cut);
      if (bot - top < 1.2) continue;
      paint(M(rectPts(x0, top, w, bot - top, .25)), { wash: col, ink: null });
      if (kind === 'titleBar') for (let i = 0; i < 3; i++) paint(M(ellPts(x0 + 3 + i * 3.4, (top + bot) / 2, 1.1, 1.1, 6)), { wash: ['#E2476E', PAL.ochre, PAL.sap][i], ink: null });
      if (kind === 'header' && bot - top > 3) { paint(M(ellPts(x0 + 4, (top + bot) / 2, 2, 2, 6)), { wash: PROPS.cream, ink: null }); paint(M(rectPts(x0 + w - 7, top + 1.5, 4.5, bot - top - 3)), { wash: PROPS.cream, ink: null }); }
      if (kind === 'hero') paint(M([[x0, bot], [x0, top + (bot - top) * .6], [x0 + w * .38, top + (bot - top) * .3], [x0 + w * .7, top + (bot - top) * .62], [x0 + w, top + (bot - top) * .45], [x0 + w, bot]]), { wash: '#79C27C', ink: null });
      if (kind === 'card' && bot - top > 6) {
        paint(M(rectPts(x0 + 3, top + 2.5, w * .32, bot - top - 5)), { wash: '#FFFFFF', washOp: 230, ink: null });
        for (const [dy, ww] of [[.25, .42], [.45, .3]]) paint(M(rectPts(x0 + w * .42, top + (bot - top) * dy, w * ww, 1.8)), { wash: '#B9B2C8', ink: null });
        paint(M(rrPts(x0 + w * .62, top + (bot - top) * .66, w * .3, (bot - top) * .22, 1.2)), { wash: QWIK.purple, ink: null });
      }
      if (kind === 'reviews' && bot - top > 4) for (let i = 0; i < 5; i++) paint(M(starPts(x0 + 4 + i * 4.4, (top + bot) / 2, 2.1, .45, 5)), { wash: PROPS.gold, ink: null });
    }
    paint(M(rectPts(x0, y0, w, Math.min(h, cut - y0))), { ink: mixCol(INK, '#FFFFFF', .35), sw: sw * .45 });
  }
  function slip(x, y, s, o = {}) {
    const rs = seeder('slip ' + (o.key ?? '')), near = detailed();
    const sw = clamp(.7 * s, .3, 1.5) * lineK(), curl = clamp(o.curl || 0);
    const rot = (o.rot || 0) + (o.flutter || 0) * .12 * Math.sin(T * TAU * 2.4);
    const M = frame(x, y, s, { rot, sx: o.sx ?? 1, sy: o.sy ?? 1 });
    const r = lerp(3.5, 12, curl), rollY = lerp(43 - 3.5, -24, curl), top = -43 + curl * 5;
    rs('paper');
    const sheet = M([[-31, top], [0, top - 1], [31, top], [31, rollY], [-31, rollY]]);
    paint(sheet, { wash: PROPS.paperW, ink: null });
    tone(M(rectPts(-30, rollY - 14, 60, 13, .3)), '#E7DCC6', 90 * (1 - curl * .5));
    if (near) {
      rs('thumb');
      const tx = -24, ty = top + 7, tw = 48, th = 70, cut = rollY - r - 1.5;
      if (o.thumb !== 'simple' && typeof pagePart === 'function' && s * tw > 60) {
        const kinds = ['header', 'hero', 'card', 'reviews', 'footer'], tl = at(M, [tx, ty]), br = at(M, [tx + tw, Math.min(ty + th, cut)]);
        if (br[1] - tl[1] > 8) {
          const R = partRects(kinds, [tl[0], tl[1], br[0], tl[1] + th * s]);
          kinds.forEach((k, i) => { if (R[i][3] <= br[1] + 1) { boilSeed('slip part ' + k); try { pagePart(k, R[i][0], R[i][1], R[i][2] - R[i][0], R[i][3] - R[i][1], {}); } catch (e) { partPlaceholder(k, R[i]); } } });
        }
      } else pageThumb(M, tx, ty, tw, th, cut, sw);
    }
    rs('edge');
    paint(sheet, { ink: INK, sw: sw * .9 });
    rs('roll');
    const ex = 31.5, cap = r * .42, roll = M([[-ex, rollY - r], [ex, rollY - r], [ex + cap * .7, rollY - r * .7], [ex + cap, rollY], [ex + cap * .7, rollY + r * .7], [ex, rollY + r], [-ex, rollY + r], [-ex - cap * .7, rollY + r * .7], [-ex - cap, rollY], [-ex - cap * .7, rollY - r * .7]]);
    paint(roll, { wash: '#F4EAD6', ink: null });
    tone(M(rectPts(-ex, rollY + r * .15, 2 * ex, r * .8, .2)), '#D6C4A2', 120);
    inkLine(M([[-ex + 4, rollY - r * .55], [ex - 6, rollY - r * .6]]), sw * .6, '#FFFFFF', 'inkfine', 0);
    paint(closeMid(roll), { ink: INK, sw: sw * .85 });
    for (const sd of [-1, 1]) {
      const c0 = [sd * (ex + cap * .15), rollY];
      paint(M(ellPts(c0[0], c0[1], cap * .85, r * .92, 14)), { wash: '#E9DCC2', ink: INK, sw: sw * .55 });
      if (r > 4.5) {
        const sp = []; for (let i = 0; i <= 16; i++) { const a = sd * i * .62, q = (1 - i / 19); sp.push([c0[0] + Math.cos(a) * cap * .7 * q, c0[1] + Math.sin(a) * r * .8 * q]); }
        inkLine(M(sp), sw * .42, INK, 'inkfine', .6);
      }
    }
    if (o.pin) {
      rs('pin');
      const p = at(M, [0, top + 5]);
      softShadow(ellPts(p[0] + 2 * s, p[1] + 3 * s, 6 * s, 3.5 * s, 10), 60);
      paint(ellPts(p[0], p[1], 5.5 * s, 5.5 * s, 12), { wash: '#D8394E', ink: INK, sw: sw * .6 });
      paint(ellPts(p[0] - 1.6 * s, p[1] - 1.8 * s, 1.8 * s, 1.5 * s, 8), { wash: '#FFC9CF', ink: null });
    }
    rs('after');
    return { top: at(M, [0, top]), bottom: at(M, [0, rollY + r]) };
  }

  function clickSpark(x, y, s, o = {}) {
    const rs = seeder('spark ' + (o.key ?? '')), st = o.state || 'idle', age = o.age ?? T, k = clamp(o.k ?? 1);
    const sw = clamp(.72 * s, .3, 1.5) * lineK(), R = 21 * s;
    if (k <= .01) return;
    if (st === 'held') {
      rs('held');
      const fl = .8 + .2 * Math.sin(T * 23) * Math.sin(T * 7.3);
      glow(x, y, 120 * s * k * fl, '#FFC957', .95 * k);
      glow(x, y, 55 * s * k, '#FFF1C2', .8 * k);
      const r0 = o.r0 ?? 18 * s;
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i - 2) * .62 + .08 * Math.sin(T * 9 + i * 2), len = (16 + 12 * Math.abs(Math.sin(T * 5 + i * 1.7))) * s * k, w = 3.2 * s;
        const b = [x + Math.cos(a) * r0, y + Math.sin(a) * r0], e = [x + Math.cos(a) * (r0 + len), y + Math.sin(a) * (r0 + len)], nx = -Math.sin(a) * w, ny = Math.cos(a) * w;
        paint([[b[0] + nx, b[1] + ny], [e[0], e[1]], [b[0] - nx, b[1] - ny]], { wash: PROPS.goldLt, washOp: 235, ink: null });
      }
      rs('after');
      return;
    }
    const born = st === 'born' ? backOut(clamp(age / .24)) : 1, sc = born * k;
    const tw = 1 + .1 * Math.sin(T * TAU * 2.2), spin = .12 * Math.sin(T * TAU * .7);
    rs('glow');
    glow(x, y, 95 * s * sc, '#FFC957', .9 * k);
    if (st === 'born' && age < .4) {
      rs('burst');
      const b = clamp(age / .4);
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * TAU + .2, r1 = R * (1.25 + 1.3 * easeOut(b)), r2 = r1 + R * (i % 2 ? .55 : .9) * (1 - b * .7);
        inkLine([[x + Math.cos(a) * r1, y + Math.sin(a) * r1], [x + Math.cos(a) * r2, y + Math.sin(a) * r2]], sw * 1.6 * (1 - b * .8), INK, 'ink', 0);
      }
    }
    if (st === 'fly') {
      rs('trail');
      const [dx, dy] = dirVec(o.dir ?? 1), L = (o.trail ?? 70) * s * k, nx = -dy, ny = dx, wob = 3 * s * Math.sin(T * 30);
      const P = [0, .35, .7, 1].map(f => [x - dx * L * f + nx * wob * f, y - dy * L * f + ny * wob * f]);
      paint(ribbon(P, R * 1.05, 1.5 * s), { wash: PROPS.goldLt, washOp: 210, ink: null });
      paint(ribbon(P.slice(0, 3), R * .5, 1 * s), { wash: '#FFFFFF', washOp: 170, ink: null });
      for (let i = 0; i < 3; i++) { const f = frac(T * 3 + i / 3), p = [x - dx * L * f + nx * 12 * s * Math.sin(i * 2.1), y - dy * L * f + ny * 12 * s * Math.sin(i * 2.1)]; paint(starPts(p[0], p[1], 5 * s * (1 - f), .35, 4), { wash: PROPS.goldLt, ink: INK, sw: sw * .35 }); }
    }
    rs('star');
    const a0 = -Math.PI / 2 + spin;
    paint(starPts(x, y, R * sc * tw, .4, 4, a0), { wash: PROPS.gold, ink: INK, sw: sw * .72 });
    paint(starPts(x - 1.5 * s * sc, y - 1.5 * s * sc, R * .52 * sc * tw, .42, 4, a0), { wash: PROPS.goldLt, ink: null });
    paint(ellPts(x - 3.5 * s * sc, y - 3.5 * s * sc, 2.4 * s * sc, 2.4 * s * sc, 8), { wash: '#FFFFFF', ink: null });
    if (typeof spark === 'function' && sc > .3) {
      rs('zaps');
      for (let i = 0; i < 2; i++) {
        const a = T * TAU * .75 + i * Math.PI, rr = R * 1.75 * sc;
        const zx = x + Math.cos(a) * rr, zy = y + Math.sin(a) * rr * .62;
        spark(zx - 6 * s, zy - 7 * s, 12 * s * sc, a + Math.PI / 2 + .3, sw * .75);
      }
    }
    rs('after');
  }

  function clockFace(M, cx, cy, r, hours, sw, near, blur = 0) {
    paint(M(ellPts(cx, cy, r, r, 24)), { wash: PROPS.cream, ink: null });
    tone(M(ellPts(cx + r * .2, cy + r * .25, r * .8, r * .7, 16)), '#E6D8BC', 100);
    paint(M(ellPts(cx, cy, r, r, 24)), { ink: INK, sw: sw * .7 });
    if (near) for (let i = 0; i < 12; i++) {
      const a = i / 12 * TAU, big = i % 3 === 0, r1 = r * (big ? .74 : .82), r2 = r * .92;
      inkLine(M([[cx + Math.sin(a) * r1, cy - Math.cos(a) * r1], [cx + Math.sin(a) * r2, cy - Math.cos(a) * r2]]), sw * (big ? .8 : .45), INK, 'inkfine', 0);
    }
    const am = (hours % 1) * TAU, ah = (hours / 12) * TAU;
    if (blur > .02) {
      for (const [rr, span] of [[.42, 1], [.62, .85], [.8, .7]]) {
        const pts = []; for (let i = 0; i <= 8; i++) { const a = am - i / 8 * 1.6 * blur * span; pts.push([cx + Math.sin(a) * r * rr, cy - Math.cos(a) * r * rr]); }
        inkLine(M(pts), sw * .45, mixCol(INK, PROPS.cream, .45), 'inkfine', .6);
      }
      const fan = [[cx, cy]]; for (let i = 0; i <= 8; i++) { const a = am - i / 8 * 1.4 * blur; fan.push([cx + Math.sin(a) * r * .8, cy - Math.cos(a) * r * .8]); }
      paint(M(fan), { wash: mixCol(INK, PROPS.cream, .7), washOp: 140 * blur, ink: null });
    }
    paint(M(thick([[cx - Math.sin(ah) * r * .1, cy + Math.cos(ah) * r * .1], [cx + Math.sin(ah) * r * .5, cy - Math.cos(ah) * r * .5]], r * .11)), { wash: INK, ink: null });
    paint(M(thick([[cx - Math.sin(am) * r * .12, cy + Math.cos(am) * r * .12], [cx + Math.sin(am) * r * .78, cy - Math.cos(am) * r * .78]], r * .07)), { wash: INK, ink: null });
    paint(M(ellPts(cx, cy, r * .09, r * .09, 8)), { wash: PROPS.brass, ink: INK, sw: sw * .4 });
  }
  const CLOCK_RED = '#D9463B', CLOCK_RED_DK = '#9E2B2B', CLOCK_RED_LT = '#F2836B';
  function alarmClock(x, y, s, o = {}) {
    const rs = seeder('alarm ' + (o.key ?? '')), near = detailed(), ring = clamp(o.ring || 0), sq = clamp(o.squash || 0, -.5, .9);
    const sw = clamp(.75 * s, .32, 1.5) * lineK(), flip = Math.floor(T * 24) % 2 ? 1 : -1;
    const hop = ring * 9 * Math.abs(Math.sin(T * TAU * 4.5)), rot = (o.rot || 0) + ring * .07 * flip;
    const M = frame(x, y - hop * s, s, { rot, sx: 1 + sq * .35, sy: 1 - sq * .5 });
    rs('shadow');
    softShadow(ellPts(x, y + s, 30 * s * (1 - hop / 30), 4.5 * s, 14), 70);
    rs('legs');
    for (const sd of [-1, 1]) {
      paint(M(thick([[sd * 13, -22], [sd * 19, -10], [sd * 23, -4]], 5)), { wash: PROPS.brassDk, ink: INK, sw: sw * .6 });
      paint(M(ellPts(sd * 24, -3.5, 7, 3.6, 10)), { wash: PROPS.brass, ink: INK, sw: sw * .6 });
    }
    rs('bells');
    const splay = .45 + sq * .5, ham = ring > .02 ? .5 * flip * ring : 0;
    paint(M(thick([[0, -76], [0, -86]], 3.2).map(([a, b]) => { const c = Math.cos(ham), n = Math.sin(ham); return [a * c - (b + 76) * n, -76 + a * n + (b + 76) * c]; })), { wash: PROPS.brassDk, ink: INK, sw: sw * .5 });
    const hb = [Math.sin(ham) * 12, -76 - Math.cos(ham) * 12];
    paint(M(ellPts(hb[0], hb[1], 4.5, 4.5, 10)), { wash: PROPS.brass, ink: INK, sw: sw * .6 });
    for (const sd of [-1, 1]) {
      const cx = sd * 20, cy = -78, a = sd * splay, dome = [];
      for (let i = 0; i <= 12; i++) { const t2 = Math.PI + i / 12 * Math.PI; dome.push([Math.cos(t2) * 15, Math.sin(t2) * 13]); }
      dome.push([15, 2], [-15, 2]);
      const Rt = pts => pts.map(([a2, b2]) => [cx + a2 * Math.cos(a) - b2 * Math.sin(a), cy + a2 * Math.sin(a) + b2 * Math.cos(a)]);
      paint(M(Rt(dome)), { wash: PROPS.brass, ink: null });
      tone(M(Rt(ellPts(-5, -6, 5, 3.5, 10))), PROPS.brassLt, 170);
      paint(M(Rt(dome)), { ink: INK, sw: sw * .75 });
      paint(M(Rt(ellPts(0, -14, 3.2, 3.2, 8))), { wash: PROPS.brassDk, ink: INK, sw: sw * .5 });
    }
    rs('body');
    const body = M(ellPts(0, -46, 31, 30, 26, .4));
    paint(body, { wash: CLOCK_RED, ink: null });
    tone(M(ellPts(8, -36, 22, 18, 16)), CLOCK_RED_DK, 110);
    tone(M(ellPts(-14, -62, 9, 5, 10, 0, -.6)), CLOCK_RED_LT, 170);
    paint(closeMid(body), { ink: INK, sw });
    rs('face');
    clockFace(M, 0, -46, 22, o.time ?? 7, sw, near);
    if (ring > .05) {
      rs('ringing');
      for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) {
        const a = -Math.PI / 2 + sd * (.55 + i * .32) + (flip > 0 ? .06 : -.06), r1 = 44 + (flip > 0 ? 3 : 0), r2 = r1 + 9 * ring;
        const c0 = [sd * 4, -74];
        inkLine(M([[c0[0] + Math.cos(a) * r1, c0[1] + Math.sin(a) * r1], [c0[0] + Math.cos(a) * r2, c0[1] + Math.sin(a) * r2]]), sw * .9, INK, 'ink', 0);
      }
      for (const sd of [-1, 1]) inkLine(M([[sd * 38, -62], [sd * 42, -46], [sd * 38, -30]]), sw * .6 * ring, INK, 'inkfine', .6);
    }
    rs('after');
    return { top: at(M, [0, -90]), face: at(M, [0, -46]) };
  }

  function wallClock(x, y, s, o = {}) {
    const rs = seeder('wallclock ' + (o.key ?? '')), near = detailed(), w = o.whizz || 0;
    const sw = clamp(.8 * s, .35, 1.6) * lineK(), blur = o.blur ?? (w > 0 && w < 1 ? Math.sin(Math.PI * w) : 0);
    const flip = Math.floor(T * 24) % 2 ? 1 : -1, M = frame(x, y, s, { rot: blur * .04 * flip });
    rs('rim');
    const rim = M(ellPts(0, 0, 58, 58, 30, .4));
    paint(rim, { wash: '#B98150', ink: null });
    tone(M(ellPts(10, 14, 46, 40, 18)), '#7E4F2B', 110, texOK(116 * s));
    tone(M(ellPts(-24, -30, 16, 8, 12, 0, -.7)), '#E2B07F', 150);
    paint(closeMid(rim), { ink: INK, sw });
    rs('face');
    clockFace(M, 0, 0, 47, (o.time ?? 10.1) + w, sw, near, blur);
    rs('after');
    return { centre: [x, y] };
  }

  function whistle(x, y, s, o = {}) {
    const rs = seeder('whistle ' + (o.key ?? '')), blow = clamp(o.blow || 0), sw = clamp(.95 * s, .35, 1.6) * lineK();
    const flip = Math.floor(T * 24) % 2 ? 1 : -1, d = (o.dir ?? -1) > 0 ? 1 : -1;
    const M = frame(x, y, s * 1.5, { rot: (o.rot || 0) + blow * .04 * flip, flip: d > 0 });
    rs('cord');
    inkLine(M([[-46, 16], [-44, 30], [-36, 42], [-22, 47]]), sw * 1.2, QWIK.purple, 'ink', .6);
    paint(M(ellPts(-46, 14, 4, 4, 10)), { ink: INK, sw: sw * .6 });
    rs('body');
    const shape = M([[1, -6], [1, 5], [-20, 5], [-22, 12], [-30, 17], [-40, 16], [-48, 9], [-49, -1], [-44, -9], [-35, -12], [-26, -9], [-24, -6]]);
    paint(shape, { wash: PROPS.brass, ink: null });
    tone(M(ellPts(-34, 7, 12, 8, 12)), PROPS.brassDk, 110);
    tone(M(rectPts(-18, -5, 18, 3, .2)), PROPS.brassLt, 190);
    paint(closeMid(shape), { ink: INK, sw });
    paint(M(rectPts(-21, -6.5, 6, 3.5)), { wash: INK, ink: null });
    inkLine(M([[-43, -4], [-38, -8.5], [-32, -9.5]]), sw * .55, PROPS.brassLt, 'inkfine', .5);
    if (blow > .05) {
      rs('puff');
      for (let i = 0; i < 3; i++) {
        const ph = frac(T * 3 + i / 3), b = [-18 + i * 2, -9 - ph * 14];
        inkLine(M([[b[0] - 3, b[1]], [b[0], b[1] - 3 * blow], [b[0] + 3, b[1] - 1]]), sw * .6 * (1 - ph), INK, 'inkfine', .6);
      }
    }
    rs('after');
    return { hole: at(M, [-18, -8]), tip: [x, y] };
  }
  function soundRings(x, y, k, dir = -1, o = {}) {
    if (k <= .01) return;
    const rs = seeder('rings ' + (o.key ?? '')), s = (o.s ?? 1) * 1.35, [dx, dy] = dirVec(dir), a = Math.atan2(dy, dx);
    const sw = clamp(.75 * s, .35, 1.6) * lineK();
    for (let i = 0; i < 3; i++) {
      const ki = clamp(k * 3 - i); if (ki <= .02) continue;
      rs('ring' + i);
      const r = (36 - i * 9) * s * (.55 + .45 * ki) * (1 + .05 * Math.sin(T * 17 + i * 2)), back = i * 17 * s;
      const cx = x - dx * (back + r), cy = y - dy * (back + r), span = 1 - i * .1;
      const P = crescent(cx, cy, r, a - span, a + span, 10.5 * s * ki);
      paint(P, { wash: '#FFF1CF', ink: INK, sw });
      paint(crescent(cx, cy, r + 1.5 * s, a - span * .6, a + span * .15, 2.8 * s * ki, 8), { wash: '#FFFFFF', washOp: 220, ink: null });
      paint(crescent(cx, cy, r - 2.5 * s, a + span * .1, a + span * .8, 3 * s * ki, 8), { wash: PROPS.brass, washOp: 110, ink: null });
    }
    rs('after');
  }

  function poof(x, y, s, age, o = {}) {
    const L = o.life ?? .7; if (age < 0 || age > L) return;
    const rs = seeder('poof ' + (o.key ?? '')), p = age / L;
    const burst = backOut(clamp(p / .2)), spread = easeOut(seg(p, .12, 1)), fade = 1 - ease(seg(p, .72, 1)), shrink = 1 - .9 * ease(seg(p, .32, 1));
    const sw = clamp(.6 * s, .28, 1.2) * lineK() * (1 - ease(seg(p, .55, .92)));
    if (p < .3) {
      rs('ticks');
      const b = p / .3;
      for (let i = 0; i < 9; i++) {
        const a = i / 9 * TAU + .3, r1 = (32 + 36 * easeOut(b)) * s, r2 = r1 + 13 * s * (1 - b);
        inkLine([[x + Math.cos(a) * r1, y + Math.sin(a) * r1], [x + Math.cos(a) * r2, y + Math.sin(a) * r2]], sw * 1.1, INK, 'ink', 0);
      }
    }
    const puff = (cx, cy, r, i) => {
      if (r < 1) return;
      paint(puffPts(cx, cy, r, 5, i), { wash: '#FFFBF3', washOp: 255 * fade, ink: null });
      tone(ellPts(cx + r * .22, cy + r * .28, r * .72, r * .55, 14), '#C7BCDD', 110 * fade);
      if (sw > .05) paint(puffPts(cx, cy, r, 5, i), { ink: INK, sw });
    };
    for (let i = 0; i < 6; i++) {
      rs('puff' + i);
      const a = i / 6 * TAU + .4 + .3 * hash(i), d = (15 + 36 * spread) * s, r = (15 + 6 * hash(i + 11)) * s * burst * shrink;
      puff(x + Math.cos(a) * d, y + Math.sin(a) * d * .8 - 16 * s * spread, r, i);
    }
    rs('core');
    puff(x, y - 8 * s * spread, 25 * s * burst * (1 - .75 * ease(seg(p, .3, .9))), 2.2);
    rs('after');
  }
  function sparkle(x, y, s, age, o = {}) {
    const L = o.life ?? .85; if (age < 0 || age > L) return;
    const rs = seeder('sparkle ' + (o.key ?? '')), sw = clamp(.6 * s, .28, 1.2) * lineK();
    rs('flash');
    const f = seg(age, 0, .3);
    if (f < 1) {
      glow(x, y, 70 * s * (1 - f * .5), '#FFE7A0', .8 * (1 - f));
      paint(starPts(x, y, 26 * s * Math.sin(Math.PI * f), .22, 4, .1), { wash: PROPS.goldLt, ink: INK, sw: sw * .8 });
    }
    for (let i = 0; i < 6; i++) {
      rs('star' + i);
      const d0 = .05 + i * .07, q = clamp((age - d0) / .5); if (q <= 0 || q >= 1) continue;
      const a = i / 6 * TAU + hash(i + 2) * .8, rr = (22 + 26 * hash(i + 7)) * s * (.7 + .3 * q), sz = (6 + 6 * hash(i + 5)) * s * Math.pow(Math.sin(Math.PI * q), .7);
      paint(starPts(x + Math.cos(a) * rr, y + Math.sin(a) * rr, sz, .3, 4, q * .9), { wash: [PROPS.gold, '#FFFFFF', PROPS.goldLt][i % 3], ink: INK, sw: sw * .6 });
    }
    rs('after');
  }
  function confetti(x, y, s, age, seed = 0, o = {}) {
    const L = o.life ?? 1.8; if (age < 0 || age > L) return;
    const rs = seeder('confetti ' + seed), sw = clamp(.4 * s, .2, .9) * lineK(), n = o.n ?? 16, fade = 1 - seg(age, L - .45, L);
    for (let i = 0; i < n; i++) {
      rs('bit' + i);
      const h = j => hash(seed * 31.7 + i * 7.3 + j * 1.9);
      const ang = -Math.PI / 2 + (h(1) - .5) * 2.4, v = (200 + 260 * h(2)) * s, drag = (1 - Math.exp(-2.6 * age)) / 2.6;
      const fall = (95 + 40 * h(9)) * s * (age - (1 - Math.exp(-2.2 * age)) / 2.2);
      const px = x + Math.cos(ang) * v * drag + 18 * s * Math.sin(age * (3 + 3 * h(6)) + h(7) * 6), py = y + Math.sin(ang) * v * drag + fall;
      const flutter = Math.cos(age * (9 + 7 * h(3)) + h(4) * TAU), rot = h(5) * TAU + age * (3 + 4 * h(1)) * (h(8) > .5 ? 1 : -1);
      const w = 5.5 * s * (.3 + .7 * Math.abs(flutter)) * fade, hh = 9 * s * fade, c = Math.cos(rot), sn = Math.sin(rot);
      if (w < .5) continue;
      const col = PROPS.confetti[i % PROPS.confetti.length];
      if (i % 5 === 4) {
        const pts = []; for (let k = 0; k < 5; k++) pts.push([px + c * (k - 2) * 3 * s - sn * Math.sin(k * 1.8) * 2.5 * s, py + sn * (k - 2) * 3 * s + c * Math.sin(k * 1.8) * 2.5 * s]);
        inkLine(pts, sw * 2.2 * fade, col, 'ink', .6);
      } else paint([[-w, -hh], [w, -hh], [w, hh], [-w, hh]].map(([a, b]) => [px + a * c - b * sn, py + a * sn + b * c]), { wash: col, ink: INK, sw: sw * fade });
    }
    rs('after');
  }
  function speedLines(x, y, len, dir = 1, k = 1, o = {}) {
    if (k <= .01 || len < 2) return;
    const rs = seeder('speed ' + (o.key ?? '')), [dx, dy] = dirVec(dir), nx = -dy, ny = dx, spread = o.spread ?? 40, lk = lineK();
    const col = o.col || mixCol(PAL.paper, INK, .5);
    const LINES = [[-.5, .95, 'dry', .55], [-.18, .6, 'charcoal', .9], [.08, 1, 'dry', .5], [.34, .7, 'inkfine', .35], [.52, .8, 'dry', .45], [-.34, .45, 'inkfine', .3]];
    LINES.forEach(([f, lf, br, w], i) => {
      rs('line' + i);
      const off = f * spread + jit(1.5), st = hash(i + 3) * .15 * len, L = len * lf * (.8 + .2 * hash(i + 9)) * (.4 + .6 * k);
      const b = [x - dx * st + nx * off, y - dy * st + ny * off], e = [b[0] - dx * L, b[1] - dy * L], m = [(b[0] + e[0]) / 2 + nx * jit(1.5), (b[1] + e[1]) / 2 + ny * jit(1.5)];
      inkLine([b, m, e], w * lk * (.5 + .5 * k), br === 'inkfine' ? INK : col, br, .3);
    });
    rs('after');
  }

  function sheetCell(x, y, w, h, key) {
    boilSeed('sheet cell ' + key);
    paint(rrPts(x + 8, y + 8, w - 16, h - 16, 18, 1.5), { wash: '#FFFFFF', washOp: 40, ink: mixCol(PAL.paper, INK, .22), sw: .5 });
  }
  function sheetFloor(x0, x1, y, key) { boilSeed('sheet floor ' + key); inkLine([[x0, y + 2], [(x0 + x1) / 2, y + 1], [x1, y + 3]], .5, mixCol(PAL.paper, INK, .35), 'inkfine', .4); }
  function sheetDark(x, y, w, h, key) { boilSeed('sheet dark ' + key); paint(rrPts(x, y, w, h, 14, 1), { wash: PAL.night, ink: INK, sw: .6 }); }
  PROPS.sheet = { cell: sheetCell, floor: sheetFloor, dark: sheetDark };
  LOOPS.propsSheet = t => {
    paint(rectPts(-50, -50, W + 100, H + 100), { wash: PAL.paper, ink: null });
    PROPS.kinds.forEach((k, i) => {
      const cx = 110 + i * 150;
      sheetCell(cx - 72, 20, 144, 220, 'icon' + i);
      icon(k, cx, 100, 76);
      icon(k, cx - 34, 196, 20);
      icon(k, cx + 22, 196, 32);
    });
    sheetCell(940, 20, 960, 220, 'boxes');
    PROPS.kinds.forEach((k, i) => jsBox(1010 + i * 118, 196, 1.3, k, { hop: 1 }));
    sheetFloor(960, 1880, 196, 'boxes');
    sheetCell(20, 250, 620, 290, 'box states');
    sheetDark(40, 270, 250, 250, 'cubby');
    jsBox(165, 470, 1.6, 'cart', { lit: .75 + .25 * Math.sin(T * TAU * .5) });
    const wob = Math.exp(-3 * (t % 2)) * (t % 2 < 1.2 ? 1 : 0);
    jsBox(360, 470, 1.6, 'gear', { wobble: wob, emote: '!', emoteK: seg(t % 2, 0, .2) * (1 - seg(t % 2, 1.2, 1.5)), emoteAge: t % 2 });
    jsBox(530, 470, 1.6, 'menu', { squash: .25 * Math.sin(t * TAU * .5) });
    sheetFloor(310, 620, 470, 'box states');
    sheetCell(650, 250, 1250, 290, 'parcels');
    parcel(760, 470, 1.6, { rot: .03 * Math.sin(T * 3) });
    const slide = frac(t / 2);
    speedLines(880 + 40 * Math.sin(slide * TAU), 440, 190, 1, 1);
    parcel(960 + 40 * Math.sin(slide * TAU), 470, 1.4, { stretch: .9, dir: 1 });
    const uf = seg(t % 2, .2, 1.6);
    parcel(1210, 470, 1.4, { unfold: uf, part: ['header', 'hero'], to: [1140, 290, 1300, 380] });
    envelope(1420, 400, 1.6, { flutter: 1, rot: .1 * Math.sin(T * 2) });
    slip(1620, 400, 1.35, { curl: ease(1 - seg(t % 2, .1, 1.1)) * (t % 2 < 1.6 ? 1 : 0), rot: -.06 });
    slip(1800, 400, 1.35, { curl: 0, pin: true, rot: .04 });
    sheetFloor(680, 1320, 470, 'parcels');
    sheetCell(20, 550, 900, 250, 'sparks');
    clickSpark(120, 670, 1.5, {});
    clickSpark(310, 670, 1.5, { state: 'born', age: t % 1.4 });
    sheetDark(410, 580, 200, 190, 'held');
    clickSpark(510, 690, 1.5, { state: 'held' });
    const f = frac(t / 1.4), fp = arcPt([660, 740], [880, 620], 60, f);
    clickSpark(fp[0], fp[1], 1.3, { state: 'fly', dir: [1, -.9 + 1.4 * f] });
    sheetCell(930, 550, 970, 250, 'clocks');
    alarmClock(1030, 770, 1.5, { ring: t % 2 < 1 ? 1 : 0 });
    wallClock(1220, 670, 1.05, { whizz: seg(t % 2, .3, 1.5) });
    const blow = t % 2 < 1.2 ? 1 : 0, fr = frac(t);
    whistle(1610, 665, 1.1, { blow });
    soundRings(lerp(1500, 1340, easeOut(fr)), 650, clamp(fr * 5) * (1 - seg(fr, .75, 1)), -1);
    soundRings(1830 - 60 * Math.sin(T * 2), 680, 1, 1, { s: .9, key: 'right' });
    sheetFloor(950, 1120, 770, 'clocks');
    sheetCell(20, 810, 1880, 250, 'effects');
    poof(180, 930, 1.6, (t % 1) * .75);
    sparkle(480, 930, 1.6, (t % 1) * .9);
    confetti(820, 950, 1.4, t % 2, 3);
    speedLines(1300, 930, 260, -1, .6 + .4 * Math.sin(T * 5));
    jsBox(1340, 980, 1.3, 'cart', { rot: -.06 });
    speedLines(1760, 910, 240, [1, -.5], 1, { key: 'diag' });
    envelope(1800, 890, 1.2, { rot: -.4 });
  };
  LOOPS.propsSheet.len = 4;

  PROPS.util = { frame, at, thick, crescent, blobPts, puffPts, closeMid, glyphs, glyphWidth, dirVec, lineK, detailed, boltMark, tone, softShadow, texOK };
  Object.assign(window, { PROPS, icon, jsBox, parcel, envelope, slip, clickSpark, alarmClock, wallClock, whistle, soundRings, poof, sparkle, confetti, speedLines });
})();
