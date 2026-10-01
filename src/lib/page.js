// page.js: the shop page's parts, the page in the browser window and the page-shaped board on its easel (see LIBRARY_SPEC.md).
(() => {
  const KINDS = ['header', 'hero', 'card', 'skeleton', 'reviews', 'footer'];
  const PAGE = {
    kinds: KINDS,
    bg: '#EFE8FA', bgDk: '#DCD0F1', panel: '#FFFBF4', shade: '#DED2F2',
    purple: '#AC7EF4', purpleDk: '#7B55CF', purpleLt: '#E4D6FF',
    blue: '#18B6F6',
    text: '#45385F', grey: '#CDC5DB', greyDk: '#B3AAC4',
    skel: '#C9C2D5', skelPanel: '#E5E1EB', shimmer: '#F8F6FB',
    red: '#E5484D', redDk: '#A92E37', gold: '#FFC43D', footer: '#4A3B82',
    board: '#FBF4E6', wood: '#B98251', woodDk: '#7D5231', woodLt: '#D9A870', tick: '#4E9A52',
    h: { header: 50, hero: 110, card: 120, skeleton: 70, reviews: 70, footer: 40 },
  };
  const MINW = { header: 300, hero: 300, card: 470, skeleton: 300, reviews: 300, footer: 250 };
  const INK = PAL.ink;

  const zoom = () => (typeof lod === 'function' ? lod() : 1);
  const lineK = () => { const z = zoom(); return z < .5 ? Math.pow(z, -.5) : 1; };
  let GHOST = 0;
  const C = col => (GHOST ? mixCol(col, PAGE.board, GHOST) : col);
  const inkC = () => (GHOST ? mixCol(INK, PAGE.board, GHOST * .85) : INK);
  const rr = (x, y, w, h, r, j = 0) => rrPts(x, y, w, h, Math.max(.4, Math.min(r, w / 2 - .01, h / 2 - .01)), j);
  const bar = (x, y, w, h, col, j = .3) => { if (w > 1.2 && h > .6) paint(rr(x, y, w, h, h / 2, j), { wash: C(col), ink: null }); };
  function panel(P, col, det, sw) {
    paint(P, { wash: C(col), ink: null });
    if (det > 20 && !GHOST) paint(P, { fill: C(mixCol(col, '#B9A6DA', .35)), fillOp: 38, bleed: .015, tex: .7, border: .7, ink: null });
    if (det > 9) paint(P, { ink: inkC(), sw });
  }
  const dot = (x, y, r, col, o = {}) => paint(ellPts(x, y, r, r, o.n ?? 12, o.j ?? 0), { wash: C(col), ink: o.ink ? inkC() : null, sw: o.sw });

  function ico(kind, x, y, s, col, o = {}) {
    if (s < 2) return;
    if (typeof icon === 'function') return icon(kind, x, y, s, C(col), { ...o, fill: o.fill && C(o.fill), key: 'page' });
    const pts = kind === 'heart' ? heartPts(x, y - .075 * s, .5 * s) : kind === 'star' ? starPts(x, y + .05 * s, .56 * s, .45, 5) : rr(x - .4 * s, y - .3 * s, .8 * s, .6 * s, .1 * s);
    paint(pts, o.fill ? { wash: C(o.fill), ink: C(col), sw: o.sw ?? .6 } : { wash: C(col), ink: null });
  }

  function logo(cx, cy, h, sw) {
    if (typeof BOLT === 'undefined') { paint(starPts(cx, cy, h * .5, .4, 4), { wash: C(PAGE.purple), ink: null }); return; }
    const u = h / 18.4, base = typeof roundedPts === 'function' ? roundedPts(BOLT, BOLT_R) : BOLT, big = h * zoom() > 30, d = big ? .9 : 1.35;
    const at = (dx, dy) => base.map(([a, b]) => [cx + (a + 3.72 + dx) * u, cy + (b + 8.15 + dy) * u]);
    paint(at(-d, d), { wash: C(QWIK.blue), ink: null });
    paint(at(d, -d), { wash: C(QWIK.purple), ink: null });
    paint(at(0, 0), { wash: C(QWIK.white), ink: big ? inkC() : null, sw: sw * .5 });
  }

  const PLUSH_R = [1.5, 1.45, .8, 1.5, 1.55, .8];
  function qwikPlush(x, y, s, o = {}) {
    if (typeof BOLT === 'undefined' || s < 3) return;
    boilSeed('plush ' + (o.key ?? ''));
    const u = s / 18.2, rot = o.rot ?? -.1, sw = clamp(u * .09, .16, .7) * lineK();
    const base = BOLT.map(([a, b]) => [a + jit(.05), b + jit(.05)]), soft = roundedPts(base, PLUSH_R, 6);
    const c = Math.cos(rot), n = Math.sin(rot), M = pts => pts.map(([a, b]) => { const px = (a + 3.72) * u, py = (b + 8.15) * u; return [x + px * c - py * n, y + px * n + py * c]; });
    const off = (P, d) => P.map(([a, b]) => [a + d, b - d]);
    const big = s * zoom() > 26;
    paint(M(off(soft, -1)), { wash: C(QWIK.blue), ink: null });
    paint(M(off(soft, 1)), { wash: C(QWIK.purple), ink: null });
    paint(M(soft), { wash: C(QWIK.white), ink: inkC(), sw });
    if (!big) return;
    paint(M(clipHalf(soft, [-9, -3.2], [4, -5.4])), { fill: C(PAGE.purpleLt), fillOp: 150, bleed: .05, tex: .5, border: .4, ink: null });
    const seam = roundedPts(insetPts(base, .75), PLUSH_R.map(r => r * .6), 4), per = pathLength(seam);
    const R = resample(seam.concat([seam[0]]), per / 34);
    for (let i = 0; i + 1 < R.length; i += 2) inkLine(M([R[i], R[i + 1]]), sw * .55, C(PAGE.purple), 'inkfine', 0);
    for (const sd of [-1, 1]) {
      const [ex, ey] = [-3.72 + sd * 1.75, -8.9];
      paint(M(ellPts(ex, ey, .78, .82, 12)), { wash: C('#2E2540'), ink: null });
      paint(M(ellPts(ex - .22, ey - .28, .26, .26, 8)), { wash: C(PAL.cream), ink: null });
      paint(M(ellPts(-3.72 + sd * 2.45, -7.35, .72, .4, 10)), { wash: C('#F4A3B4'), washOp: 200, ink: null });
    }
    inkLine(M([[-4.35, -7.6], [-4.05, -7.25], [-3.72, -7.5], [-3.39, -7.25], [-3.09, -7.6]]), sw * .6, inkC(), 'inkfine', .4);
  }

  const DIGIT = {
    0: [[[.5, 0], [.9, .18], [1, .5], [.9, .82], [.5, 1], [.1, .82], [0, .5], [.1, .18], [.5, 0]]],
    1: [[[.12, .28], [.58, 0], [.58, 1]]],
    2: [[[.05, .26], [.3, .02], [.72, .02], [.94, .28], [.78, .55], [.06, 1], [.98, 1]]],
    3: [[[.08, .12], [.5, 0], [.9, .2], [.72, .45], [.38, .5]], [[.38, .5], [.84, .58], [.95, .82], [.55, 1], [.06, .9]]],
    4: [[[.72, 1], [.72, 0], [.04, .7], [.98, .7]]],
    5: [[[.92, 0], [.2, 0], [.12, .46], [.55, .38], [.92, .6], [.86, .9], [.48, 1], [.06, .9]]],
    6: [[[.82, .04], [.42, .1], [.1, .55], [.2, .92], [.55, 1], [.9, .8], [.8, .52], [.44, .45], [.1, .64]]],
    7: [[[.04, 0], [.96, 0], [.36, 1]]],
    8: [[[.5, .48], [.12, .3], [.28, .02], [.72, .02], [.88, .3], [.5, .48], [.08, .72], [.3, 1], [.7, 1], [.92, .72], [.5, .48]]],
    9: [[[.9, .42], [.5, .55], [.12, .36], [.28, .04], [.7, 0], [.92, .28], [.86, .7], [.5, 1], [.14, .9]]],
  };
  function digit(d, cx, cy, h, col) {
    const G = DIGIT[d] || DIGIT[0], w = h * .6, bw = h * .21;
    for (const st of G) paint(ribbon(st.map(([a, b]) => [cx - w / 2 + a * w + jit(h * .012), cy - h / 2 + b * h + jit(h * .012)]), bw, bw * .9), { wash: col, ink: null });
  }

  function header(x, y, w, h, o, det) {
    const s = h / PAGE.h.header, q = Math.min(s, w / MINW.header), sw = clamp(.55 * s, .15, 1) * lineK(), cy = y + h / 2;
    panel(rr(x, y, w, h, 8 * s, .4 * s), PAGE.panel, det, sw);
    bar(x + 3 * s, y + h - 5 * s, w - 6 * s, 3 * s, PAGE.purpleLt, 0);
    if (det < 9) { bar(x + 12 * q, cy - 4 * s, 90 * q, 8 * s, PAGE.purple); dot(x + w - 50 * q, cy, 9 * s, INK); return; }
    ico('menu', x + 24 * q, cy, 21 * q, PAGE.text);
    logo(x + 62 * q, cy, 34 * q, sw);
    bar(x + 84 * q, cy - 7 * s, 94 * q, 12 * s, PAGE.purpleDk);
    bar(x + 84 * q, cy + 7 * s, 58 * q, 5 * s, PAGE.grey);
    if (w / q > 560 && det > 20) for (let i = 0; i < 3; i++) bar(x + w * .46 + i * 70 * q, cy - 3 * s, [46, 52, 40][i] * q, 6.5 * s, PAGE.greyDk);
    const cx = x + w - 50 * q;
    ico('cart', cx, cy, 30 * q, INK);
    if (o.badge == null || det < 14) return;
    badge(cx + 15 * q, cy - 12.5 * s, 15.5 * Math.min(s, q * 1.2), o.badge, sw);
  }

  function badge(bx, by, r, value, sw) {
    const n = Math.floor(value + 1e-6), f = value - n, turning = f > 1e-4;
    const shown = turning && f >= .4 ? n + 1 : n;
    let k = 1;
    if (turning) k = f < .4 ? 1 - .3 * ease(f / .4) : .7 + .5 * backOut(seg(f, .4, .75)) - .2 * ease(seg(f, .75, 1));
    if (turning && f > .4) {
      const a = seg(f, .4, 1);
      for (let i = 0; i < 8; i++) {
        const ang = i / 8 * TAU + .2, r0 = r * (1.25 + .9 * a), r1 = r0 + r * .55 * (1 - a);
        if (r1 - r0 > .5) inkLine([[bx + Math.cos(ang) * r0, by + Math.sin(ang) * r0], [bx + Math.cos(ang) * r1, by + Math.sin(ang) * r1]], sw * .7 * (1 - a), C(PAGE.redDk), 'inkfine', 0);
      }
    }
    const R = r * k;
    paint(ellPts(bx, by, R, R, 16, R * .03), { wash: C(PAGE.red), ink: inkC(), sw: sw * .85 });
    paint(ellPts(bx - R * .52, by - R * .42, R * .2, R * .13, 8, 0, -.7), { wash: C('#FF9DA0'), ink: null });
    digit(Math.min(9, Math.max(0, shown)), bx + R * .03, by + R * .02, R * 1.15, C(PAL.cream));
  }

  function hero(x, y, w, h, o, det) {
    const s = h / PAGE.h.hero, q = Math.min(s, w / MINW.hero), sw = clamp(.55 * s, .15, 1) * lineK(), cr = 9 * s;
    const frame = rr(x, y, w, h, cr, .4 * s);
    paint(frame, { wash: C('#CFE9FA'), ink: null });
    paint(rr(x + w * .08, y + h * .45, w * .84, h * .4, h * .2), { fill: C('#FFF1D2'), fillOp: 160, bleed: .06, tex: .3, border: .3, ink: null });
    const sunX = x + w * .83, sunY = y + h * .3;
    if (det > 9) paint(ellPts(sunX, sunY, h * .2, h * .2, 18), { fill: C('#FFE7A0'), fillOp: 140, bleed: .08, tex: .2, border: .2, ink: null });
    dot(sunX, sunY, h * .11, '#FFD25E', { n: 16 });
    const ridge = (base, amp, f, ph, x0 = x + 1.5, x1 = x + w - 1.5, n = 22) => {
      const P = [];
      for (let i = 0; i <= n; i++) { const k = i / n; P.push([lerp(x0, x1, k), base + amp * (Math.sin(k * f + ph) * .7 + Math.sin(k * f * 2.3 + ph * 1.7) * .3)]); }
      return P;
    };
    const bottom = y + h - 1.5, inset = cr * .45;
    const hillPoly = P => [[x + inset, bottom], ...P, [x + w - inset, bottom]];
    paint(hillPoly(ridge(y + h * .56, h * .1, 7, .6)), { wash: C('#C6B2F2'), fill: C('#A98BE8'), fillOp: 60, bleed: .03, tex: .4, border: .4, ink: null });
    if (det > 9) {
      for (const [cx, cy, k] of [[.24, .22, 1], [.55, .16, .8]]) {
        const X = x + w * cx, Y = y + h * cy, r = h * .07 * k;
        paint([...ellPts(X - r * 1.2, Y + r * .2, r * 1.2, r * .7, 10), ...ellPts(X + r * .3, Y - r * .1, r * 1.3, r, 10)], { wash: C('#FFFBF2'), ink: null, curv: .4 });
      }
    }
    paint(hillPoly(ridge(y + h * .74, h * .07, 5, 2.4)), { wash: C('#9FD28A'), fill: C('#6FAE5E'), fillOp: 55, bleed: .03, tex: .4, border: .4, ink: null });
    if (det > 14) {
      const tx = x + w * .67, ty = y + h * .72;
      inkLine([[tx, ty + h * .08], [tx + h * .01, ty - h * .03]], sw * 1.4, C('#7A5236'), 'ink', 0);
      paint(ellPts(tx, ty - h * .08, h * .085, h * .1, 12, h * .005), { wash: C('#4F9A57'), ink: inkC(), sw: sw * .6 });
      const kx = x + w * .6, ky = y + h * .2, kh = h * .2, ku = kh / 17.4;
      if (typeof BOLT !== 'undefined' && det > 20) {
        inkLine([[kx - 1.6 * ku, ky + kh * .55], [kx + w * .02, ky + h * .45], [tx - h * .02, ty - h * .12]], sw * .45, inkC(), 'inkfine', .6);
        logo(kx, ky + kh * .1, kh, sw);
      }
      if (det > 20) for (let i = 0; i < 2; i++) inkLine([[x + w * (.38 + i * .06), y + h * (.14 + i * .05)], [x + w * (.4 + i * .06), y + h * (.12 + i * .05)], [x + w * (.42 + i * .06), y + h * (.14 + i * .05)]], sw * .5, inkC(), 'inkfine', .6);
    }
    if (det > 9) {
      const bx = x + 26 * q, by = y + 20 * s, bw = Math.min(w * .36, 290 * q), bh = h - 40 * s;
      paint(rr(bx, by, bw, bh, 9 * s, .4 * s), { wash: C(PAGE.panel), washOp: 238, ink: det > 14 ? inkC() : null, sw: sw * .8 });
      bar(bx + 16 * q, by + 13 * s, bw * .66, 13 * s, PAGE.text);
      bar(bx + 16 * q, by + 32 * s, bw * .5, 7 * s, PAGE.grey);
      const pw = Math.min(bw * .42, 110 * q), py = by + bh - 26 * s;
      paint(rr(bx + 16 * q, py, pw, 17 * s, 8.5 * s, .3 * s), { wash: C(QWIK.blue), ink: det > 14 ? inkC() : null, sw: sw * .7 });
      bar(bx + 16 * q + pw * .2, py + 6 * s, pw * .6, 5 * s, PAL.cream);
    }
    if (det > 9) paint(frame, { ink: inkC(), sw });
  }

  function card(x, y, w, h, o, det) {
    const s = h / PAGE.h.card, q = Math.min(s, w / MINW.card), sw = clamp(.55 * s, .15, 1) * lineK();
    paint(rr(x + 3 * s, y + 5 * s, w, h, 12 * s), { wash: C(PAGE.shade), ink: null });
    panel(rr(x, y, w, h, 12 * s, .4 * s), PAGE.panel, det, sw);
    const side = h - 20 * s, tx = x + 10 * s, ty = y + 10 * s;
    paint(rr(tx, ty, side, side, 10 * s, .3 * s), { wash: C('#E9DDFF'), ink: det > 14 ? inkC() : null, sw: sw * .7 });
    const likeX = x + w - 280 * q, cartX = x + w - 110 * q, rowY = y + 90 * s;
    if (det < 9) { bar(tx + side + 14 * s, y + 20 * s, w * .3, 12 * s, PAGE.text); paint(rr(cartX - 85 * q, rowY - 23 * s, 170 * q, 46 * s, 23 * s), { wash: C(PAGE.purple), ink: null }); return; }
    paint(ellPts(tx + side / 2, ty + side * .86, side * .3, side * .06, 14), { fill: C(PAGE.purpleDk), fillOp: 60, bleed: .15, tex: .2, border: .1, ink: null });
    qwikPlush(tx + side / 2, ty + side * .47, side * .78, { key: o.key ?? 'card', rot: -.1 + .03 * Math.sin((o.t ?? T) * TAU * .25) });
    const t0 = tx + side + 22 * s, t1 = x + w - 20 * s, likeL = likeX - 22 * q - 14 * s;
    bar(t0, y + 18 * s, Math.min((t1 - t0) * .5, 210 * s), 15 * s, PAGE.text);
    bar(t0, y + 43 * s, Math.min((t1 - t0) * .72, likeL - t0 + 120 * s), 8 * s, PAGE.grey);
    if (likeL - t0 > 60 * s) {
      bar(t0, y + 58 * s, Math.min((t1 - t0) * .55, likeL - t0), 8 * s, PAGE.grey);
      bar(t0, y + 80 * s, Math.min(78 * s, likeL - t0), 17 * s, PAGE.purpleDk);
    }
    likeButton(likeX, rowY, 22 * Math.min(s, q * 1.4), o.liked || 0, sw, det);
    cartButton(cartX, rowY, 170 * q, 46 * s, o, sw, det);
  }

  function likeButton(cx, cy, r, liked, sw, det) {
    const pop = liked > 0 && liked < 1 ? .2 * Math.sin(Math.PI * liked) : 0, R = r * (1 + pop);
    paint(ellPts(cx + r * .08, cy + r * .16, R, R, 18), { wash: C(PAGE.shade), ink: null });
    paint(ellPts(cx, cy, R, R, 18, r * .02), { wash: C(PAGE.panel), ink: inkC(), sw: sw * .9 });
    const hs = R * 1.15;
    ico('heart', cx, cy + R * .06, hs, INK, { fill: PAGE.panel, sw: sw * .8 });
    if (liked > .01) {
      const k = backOut(clamp(liked * 1.25)) * .86;
      paint(heartPts(cx, cy + R * .06 - .075 * hs, .5 * hs * k), { wash: C(PAGE.red), ink: null });
      paint(heartPts(cx - hs * .16 * k, cy - hs * .1 * k, .13 * hs * k), { wash: C('#FF9DA0'), washOp: 210, ink: null });
      ico('heart', cx, cy + R * .06, hs, INK, { hollow: true, sw: sw * .8 });
      if (liked < 1 && det > 14) {
        const a = seg(liked, .25, 1);
        for (let i = 0; i < 6; i++) {
          const ang = -Math.PI / 2 + (i - 2.5) * .55, r0 = R * (1.3 + .5 * a), r1 = r0 + R * .5 * (1 - a);
          inkLine([[cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0], [cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1]], sw * .8 * (1 - a), C(PAGE.red), 'inkfine', 0);
        }
      }
    }
  }

  function cartButton(cx, cy, bw, bh, o, sw, det) {
    const press = clamp(o.press || 0), lit = clamp(o.lit || 0);
    const sy = 1 - .2 * press, sx = 1 + .05 * press, dy = bh * .1 * press;
    paint(rr(cx - bw / 2 + 1, cy - bh / 2 + bh * .12, bw, bh, bh / 2), { wash: C(PAGE.purpleDk), ink: null });
    const W2 = bw * sx, H2 = bh * sy, top = cy - H2 / 2 + dy;
    paint(rr(cx - W2 / 2, top, W2, H2, H2 / 2, bh * .02), { wash: C(PAGE.purple), ink: inkC(), sw: sw * .9 });
    if (det > 14) inkLine([[cx - W2 * .36, top + H2 * .2], [cx + W2 * .1, top + H2 * .17]], sw * .7, C('#D9C4FF'), 'inkfine', .3);
    const ix = cx - W2 * .27, iy = top + H2 * .5, is = bh * .62 * sy;
    if (lit > .01 && typeof glow === 'function') glow(ix, iy, bh * 1.25, '#FFD27A', lit);
    ico('cart', ix, iy, is, lit > .01 ? mixCol(PAL.cream, '#FFD84A', lit) : PAL.cream);
    bar(cx - W2 * .06, iy - bh * .08, W2 * .38, bh * .16 * sy, PAL.cream);
  }

  function reviewBlocks(x, y, w, h, s, q) {
    const n = w / q > 640 ? 2 : 1, pad = 12 * s, bw = (w - pad * (n + 1)) / n;
    return Array.from({ length: n }, (_, i) => ({ bx: x + pad + i * (bw + pad), bw }));
  }
  function reviews(x, y, w, h, o, det) {
    const s = h / PAGE.h.reviews, q = Math.min(s, w / MINW.reviews), sw = clamp(.55 * s, .15, 1) * lineK();
    panel(rr(x, y, w, h, 10 * s, .4 * s), PAGE.panel, det, sw);
    for (const [i, { bx, bw }] of reviewBlocks(x, y, w, h, s, q).entries()) {
      const ax = bx + 22 * q, ay = y + h / 2;
      dot(ax, ay, 17 * Math.min(s, q * 1.2), i ? '#BFE6F7' : '#F6C9A9', { ink: det > 14, sw: sw * .7, n: 16 });
      if (det > 20) {
        const r = 17 * Math.min(s, q * 1.2);
        for (const sd of [-1, 1]) dot(ax + sd * r * .35, ay - r * .12, r * .1, INK, { n: 6 });
        inkLine([[ax - r * .32, ay + r * .25], [ax, ay + r * .42], [ax + r * .32, ay + r * .25]], sw * .5, inkC(), 'inkfine', .6);
      }
      const sx0 = ax + 30 * q, sr = 9.5 * Math.min(s, q * 1.2);
      for (let k = 0; k < 5; k++) {
        const pop = o.pop ? backOut(clamp(o.pop * 5 - k * .5)) : 1;
        if (pop > .02) paint(starPts(sx0 + k * sr * 2.3, y + h * .32, sr * pop, .47, 5), { wash: C(PAGE.gold), ink: det > 9 ? inkC() : null, sw: sw * .6 });
      }
      bar(sx0 - sr, y + h * .6, Math.min(bw - (sx0 - bx) - 4 * s, 250 * q), 7 * s, PAGE.grey);
      bar(sx0 - sr, y + h * .78, Math.min(bw - (sx0 - bx) - 4 * s, 170 * q), 7 * s, PAGE.grey);
    }
  }

  function clipBand(P, a0, a1, slope) {
    const clip = (Q, sign, c) => {
      const out = [], f = p => sign * (p[0] + p[1] * slope - c);
      for (let i = 0; i < Q.length; i++) {
        const p = Q[i], n = Q[(i + 1) % Q.length], fp = f(p), fn = f(n);
        if (fp <= 0) out.push(p);
        if ((fp <= 0) !== (fn <= 0)) { const k = fp / (fp - fn); out.push([p[0] + (n[0] - p[0]) * k, p[1] + (n[1] - p[1]) * k]); }
      }
      return out;
    };
    return clip(clip(P, -1, a0), 1, a1);
  }
  function skeleton(x, y, w, h, o, det) {
    const s = h / PAGE.h.skeleton, q = Math.min(s, w / MINW.skeleton), sw = clamp(.55 * s, .15, 1) * lineK();
    panel(rr(x, y, w, h, 10 * s, .4 * s), PAGE.skelPanel, det, sw);
    const shapes = [];
    for (const { bx, bw } of reviewBlocks(x, y, w, h, s, q)) {
      const ax = bx + 22 * q, sr = 9.5 * Math.min(s, q * 1.2), sx0 = ax + 30 * q, R = 17 * Math.min(s, q * 1.2);
      shapes.push(ellPts(ax, y + h / 2, R, R, 16));
      shapes.push(rr(sx0 - sr, y + h * .32 - sr * .8, sr * 11.2, sr * 1.6, sr * .8));
      shapes.push(rr(sx0 - sr, y + h * .6, Math.min(bw - (sx0 - bx) - 4 * s, 250 * q), 7 * s, 3.5 * s));
      shapes.push(rr(sx0 - sr, y + h * .78, Math.min(bw - (sx0 - bx) - 4 * s, 170 * q), 7 * s, 3.5 * s));
    }
    for (const P of shapes) paint(P, { wash: C(PAGE.skel), ink: null });
    if (det < 9 || GHOST) return;
    const slope = .45, span = w * 1.25 + h * slope, sweep = frac((o.t ?? T) / 1.25), c = x - w * .1 + sweep * span, bw = Math.max(46 * s, w * .09);
    for (const P of shapes) {
      for (const [a, b, col] of [[c - bw * 1.9, c - bw, mixCol(PAGE.skel, PAGE.shimmer, .45)], [c - bw, c, PAGE.shimmer], [c, c + bw * .5, mixCol(PAGE.skel, PAGE.shimmer, .55)]]) {
        const Q = clipBand(P, a, b, slope);
        if (Q.length > 2) paint(Q, { wash: C(col), ink: null });
      }
    }
  }

  function footer(x, y, w, h, o, det) {
    const s = h / PAGE.h.footer, q = Math.min(s, w / MINW.footer), sw = clamp(.55 * s, .15, 1) * lineK(), cy = y + h / 2;
    panel(rr(x, y, w, h, 8 * s, .4 * s), PAGE.footer, det, sw);
    if (det < 9) return;
    logo(x + 22 * q, cy, 24 * s, sw);
    [52, 64, 44].forEach((bw, i) => bar(x + 50 * q + [0, 70, 150][i] * q, cy - 3 * s, bw * q, 6 * s, '#CFC3F2'));
    for (let i = 0; i < 3; i++) dot(x + w - 24 * q - i * 26 * q, cy, 7.5 * Math.min(s, q * 1.2), ['#8FD9FA', '#D9C4FF', '#FFFBF4'][i], { n: 10 });
  }

  const DRAW = { header, hero, card, skeleton, reviews, footer };

  function pagePart(kind, x, y, w, h, o = {}) {
    const draw = DRAW[kind];
    if (!draw || w < 1 || h < 1) return;
    const k = o.k ?? 1;
    if (k <= .001) return;
    boilSeed('page ' + kind + ' ' + (o.key ?? ''));
    const prevGhost = GHOST;
    GHOST = o.ghost ? clamp(o.ghost) * .78 : 0;
    const det = h * zoom() * (o.detail ?? 1);
    try {
      if (k >= 1) { draw(x, y, w, h, o, det); return; }
      const cx = x + w / 2, cy = y + h / 2, wig = Math.sin(Math.PI * k), wide = clamp((w / h - 1.5) / 3);
      const sy = backOut(k), sx = lerp(backOut(k), lerp(.82, 1, easeOut(k)) + .025 * wig, wide);
      push(); translate(cx, cy - h * .3 * (1 - k) * (1 - k)); rotate(-.04 * wig * (1 - k)); scale(sx, sy); translate(-cx, -cy);
      draw(x, y, w, h, o, det);
      pop();
    } finally { GHOST = prevGhost; }
  }

  const WIN = WORLD.window, BANDS = WORLD.page;
  function pageSlot(kind) {
    const b = BANDS[kind === 'skeleton' ? 'reviews' : kind];
    return b ? [WIN.x0 + 20, b[0], WIN.x1 - 20, b[1]] : null;
  }
  const B = WORLD.board;
  const toBoard = ([x, y]) => [B.x0 + (x - WIN.x0) / (WIN.x1 - WIN.x0) * (B.x1 - B.x0), B.y0 + (y - WIN.y0) / (WIN.y1 - WIN.y0) * (B.y1 - B.y0)];
  function boardSlot(kind) {
    const r = pageSlot(kind);
    if (!r) return null;
    const [a, b] = toBoard([r[0], r[1]]), [c, d] = toBoard([r[2], r[3]]);
    return [a, b, c, d];
  }

  function swapCloud([x0, y0, x1, y1], swap, sw) {
    if (swap <= 0 || swap >= 1) return;
    boilSeed('page swap cloud');
    const w = x1 - x0, h = y1 - y0, cy = (y0 + y1) / 2, n = Math.max(3, Math.round(w / (h * 1.05)));
    const grow = seg(swap, 0, .4), fade = seg(swap, .55, .95), puffs = [];
    for (let i = 0; i < n; i++) {
      const f = n > 1 ? i / (n - 1) : .5, mid = 1 - Math.abs(f - .5) * 2, delay = (1 - mid) * .45;
      const g = backOut(clamp((grow - delay) / (1 - delay))), gone = clamp((fade - hash(i * 3.3) * .35) / .65);
      const r = h * (.46 + .2 * mid + .1 * hash(i * 1.9)) * g * (1 - easeIn(gone));
      const px = lerp(x0 + h * .55, x1 - h * .55, f) + (hash(i * 5.1) - .5) * h * .3, py = cy + (i % 2 ? -.12 : .1) * h - gone * h * .25;
      if (r > 1) puffs.push([px, py, r]);
    }
    const lw = sw * 2.2;
    for (const [px, py, r] of puffs) paint(ellPts(px, py, r * 1.12 + lw, r + lw, 18, r * .025), { wash: INK, ink: null });
    for (const [px, py, r] of puffs) paint(ellPts(px, py, r * 1.12, r, 18, r * .025), { wash: '#DCCFF1', ink: null });
    for (const [px, py, r] of puffs) paint(ellPts(px - r * .1, py - r * .13, r * 1.02, r * .88, 18, r * .02), { wash: PAL.cream, ink: null });
    for (const [px, py, r] of puffs) if (r > h * .35) inkLine([[px - r * .55, py - r * .35], [px - r * .2, py - r * .62], [px + r * .2, py - r * .66]], sw * .6, '#FFFFFF', 'inkfine', .6);
  }
  function twinkle(cx, cy, size, age, key) {
    if (typeof sparkle === 'function') { sparkle(cx, cy, size / 60, age); return; }
    boilSeed('page twinkle ' + key);
    const a = clamp(age / .7);
    if (a <= 0 || a >= 1) return;
    for (let i = 0; i < 4; i++) {
      const k = Math.sin(Math.PI * clamp(a * 1.4 - i * .12)), px = cx + (hash(i * 5) - .5) * size * 3.2, py = cy + (hash(i * 7) - .5) * size;
      if (k > .05) paint(starPts(px, py, size * .22 * k, .3, 4), { wash: '#FFE9A0', ink: INK, sw: .4 });
    }
  }

  function handShadow(x, y, k) {
    if (k <= .01) return;
    boilSeed('page hand shadow');
    const P = [[-10, 6], [-10, -46], [-6, -54], [0, -56], [6, -54], [9, -46], [10, -10], [30, -12], [44, 0], [46, 30], [36, 64], [-18, 64], [-30, 40], [-34, 12], [-24, 4]];
    for (const [g, op] of [[1.08, 40], [1, 55]]) paint(P.map(([a, b]) => [x + 22 + a * 1.15 * g, y + 66 + b * 1.15 * g]), { wash: INK, washOp: op * clamp(k), ink: null, curv: .5 });
  }

  function drawPage(st = {}) {
    const P = st.parts || {}, t = st.t ?? T, swap = clamp(st.swap || 0);
    boilSeed('page bg');
    paint(rectPts(WIN.x0 + 2, BANDS.titleBar[1], WIN.x1 - WIN.x0 - 4, WIN.y1 - BANDS.titleBar[1] - 2, .6), { wash: PAGE.bg, ink: null });
    const vis = {
      ...P,
      skeleton: swap >= .45 ? 0 : P.skeleton || 0,
      reviews: swap > 0 ? Math.max(P.reviews || 0, seg(swap, .45, .8)) : P.reviews || 0,
    };
    const opts = {
      header: { badge: st.badge ?? 0 },
      card: { liked: st.liked, press: st.cartPress, lit: st.cartLit, t },
      skeleton: { t },
      reviews: { pop: swap > 0 && swap < 1 ? seg(swap, .5, .95) : undefined },
    };
    for (const kind of KINDS) {
      const k = vis[kind] || 0;
      if (k <= 0) continue;
      const [x0, y0, x1, y1] = pageSlot(kind);
      pagePart(kind, x0, y0, x1 - x0, y1 - y0, { ...opts[kind], k, t });
    }
    if (swap > 0 && swap < 1) {
      const R = pageSlot('reviews');
      swapCloud(R, swap, .6 * lineK());
      twinkle(R[0] + (R[2] - R[0]) * .22, (R[1] + R[3]) / 2 - 6, 50, (swap - .78) * 1.9, 'swap a');
      twinkle(R[0] + (R[2] - R[0]) * .7, (R[1] + R[3]) / 2 + 4, 44, (swap - .84) * 1.9, 'swap b');
    }
    if (st.handShadow) handShadow(...st.handShadow);
  }

  const FLOOR = WORLD.shop ? WORLD.shop.floor : 940;
  function dashed(P, sw, col, dash = 16, gap = 11) {
    const R = resample(P.concat([P[0]]), 4), per = Math.round(dash / 4), step = Math.round((dash + gap) / 4);
    for (let i = 0; i + 1 < R.length; i += step) inkLine(R.slice(i, Math.min(R.length, i + per + 1)), sw, col, 'inkfine', 0);
  }
  function tick(cx, cy, r, k, sw) {
    if (k <= .01) return;
    const pk = backOut(seg(k, 0, .45));
    paint(ellPts(cx, cy, r * pk, r * pk, 16), { wash: PAL.cream, ink: PAGE.tick, sw: sw * .9 });
    const L = [[-.45, .02], [-.12, .36], [.5, -.38]].map(([a, b]) => [cx + a * r, cy + b * r]);
    const d = seg(k, .25, 1);
    if (d <= 0) return;
    const pts = d < .4 ? [L[0], [lerp(L[0][0], L[1][0], d / .4), lerp(L[0][1], L[1][1], d / .4)]] : [L[0], L[1], [lerp(L[1][0], L[2][0], (d - .4) / .6), lerp(L[1][1], L[2][1], (d - .4) / .6)]];
    inkLine(pts, sw * 1.7, PAGE.tick, 'ink', 0);
  }
  const woodCols = () => {
    const K = typeof SETS !== 'undefined' && SETS.K ? SETS.K : null;
    return K ? { wood: K.easel, dark: K.easelDk, light: mixCol(K.easel, '#FFE3B0', .35) } : { wood: PAGE.wood, dark: PAGE.woodDk, light: PAGE.woodLt };
  };
  function slat(a, b, w, col, sw) {
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]), nx = -(b[1] - a[1]) / d * w / 2, ny = (b[0] - a[0]) / d * w / 2;
    paint([[a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny], [b[0] - nx, b[1] - ny], [a[0] - nx, a[1] - ny]], { wash: col, ink: INK, sw });
  }
  function easelBack(sw) {
    boilSeed('board easel back');
    const cx = (B.x0 + B.x1) / 2, top = B.y0 - 36, c = woodCols();
    slat([cx + 4, top + 10], [cx + 74, FLOOR + 2], 15, c.dark, sw * .8);
    slat([cx - 30, top], [B.x0 + 26, FLOOR + 2], 19, c.wood, sw * .9);
    slat([cx + 30, top], [B.x1 - 26, FLOOR + 2], 19, c.wood, sw * .9);
    paint(rr(cx - 42, top - 10, 84, 20, 7, .4), { wash: c.wood, ink: INK, sw: sw * .9 });
  }
  function easelFront(sw) {
    boilSeed('board easel front');
    const cx = (B.x0 + B.x1) / 2, c = woodCols(), w = B.x1 - B.x0;
    paint(rr(B.x0 - 26, B.y1 - 6, w + 52, 22, 6, .5), { wash: c.wood, ink: INK, sw });
    inkLine([[B.x0 - 18, B.y1 + 1], [cx, B.y1 + 2], [B.x1 + 18, B.y1 + 1]], sw * .5, c.light, 'inkfine', .2);
    paint(rr(cx - 20, B.y0 - 14, 40, 24, 6, .4), { wash: c.wood, ink: INK, sw: sw * .85 });
    paint(ellPts(cx, B.y0 - 2, 5, 5, 10), { wash: c.dark, ink: null });
  }
  function boardPanel(sw) {
    boilSeed('board panel');
    const w = B.x1 - B.x0, h = B.y1 - B.y0, wood = woodCols().wood;
    paint(rr(B.x0 + 6, B.y0 + 8, w, h, 10), { wash: '#15122A', washOp: 140, ink: null });
    paint(rr(B.x0 - 10, B.y0 - 10, w + 20, h + 20, 12, .6), { wash: wood, ink: INK, sw });
    inkLine([[B.x0 - 4, B.y0 - 5], [B.x1 - 40, B.y0 - 6]], sw * .6, mixCol(wood, '#FFE3B0', .35), 'inkfine', .3);
    paint(rr(B.x0, B.y0, w, h, 6, .5), { wash: PAGE.board, ink: INK, sw: sw * .7 });
    const [, y1] = toBoard([0, BANDS.titleBar[1]]);
    paint(rr(B.x0 + 4, B.y0 + 4, w - 8, y1 - B.y0 - 6, 5, .3), { wash: PAGE.bgDk, ink: null });
    const ty = (B.y0 + y1) / 2;
    ['#E8606F', PAL.ochre, PAL.sap].forEach((c, i) => dot(B.x0 + 20 + i * 17, ty, 5.5, c, { ink: true, sw: sw * .5 }));
    paint(rr(B.x0 + 80, ty - 9, w - 110, 18, 9, .3), { wash: PAGE.panel, ink: INK, sw: sw * .5 });
    logo(B.x0 + 96, ty, 13, sw);
    bar(B.x0 + 110, ty - 2.5, 90, 5, PAGE.grey);
  }

  function drawBoard(st = {}) {
    const P = st.parts || {}, G = st.ghost || {}, TK = st.tick || {}, LV = st.leave || {}, t = st.t ?? T;
    const sw = .9 * lineK(), to = st.leaveTo || WORLD.funnel || [1230, 600], withEasel = st.easel !== false;
    if (withEasel) easelBack(sw);
    boardPanel(sw);
    boilSeed('board slots');
    const slots = ['header', 'hero', 'card', 'reviews', 'footer'];
    for (const kind of slots) {
      const [x0, y0, x1, y1] = boardSlot(kind), taken = (P[kind] || 0) >= 1 || (kind === 'reviews' && (P.skeleton || 0) >= 1);
      if (!taken) dashed(rr(x0 + 2, y0 + 2, x1 - x0 - 4, y1 - y0 - 4, 7), sw * .55, '#A99CC4');
    }
    for (const kind of KINDS) {
      const g = G[kind] || 0;
      if (g <= 0) continue;
      const [x0, y0, x1, y1] = boardSlot(kind);
      pagePart(kind, x0, y0, x1 - x0, y1 - y0, { ghost: g, t, key: 'ghost', detail: .7 });
    }
    for (const kind of KINDS) {
      const k = P[kind] || 0, lv = clamp(LV[kind] || 0);
      if (k <= 0 || lv >= 1) continue;
      const [x0, y0, x1, y1] = boardSlot(kind), w = x1 - x0, h = y1 - y0;
      const o = { k, t, key: 'board', badge: kind === 'header' ? 0 : undefined };
      if (lv <= 0) { pagePart(kind, x0, y0, w, h, o); continue; }
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, e = easeIn(lv), px = lerp(cx, to[0], e), py = lerp(cy, to[1], e) - 40 * Math.sin(Math.PI * lv);
      const sc = lerp(1, .08, ease(lv)), pull = 1 + .7 * Math.sin(Math.PI * Math.min(1, lv * 1.2));
      push(); translate(px, py); rotate(.12 * Math.sin(Math.PI * lv)); scale(sc * pull, sc / pull); translate(-cx, -cy);
      pagePart(kind, x0, y0, w, h, o);
      pop();
    }
    for (const kind of KINDS) {
      const k = TK[kind] || 0;
      if (k <= 0) continue;
      const [, y0, x1, y1] = boardSlot(kind);
      boilSeed('board tick ' + kind);
      tick(x1 - 20, (y0 + y1) / 2, Math.min(15, (y1 - y0) * .32), k, sw);
    }
    if (withEasel) easelFront(sw);
    if (st.slip > 0 && typeof slip === 'function') {
      const k = clamp(st.slip), x = B.x1 + 8, y = B.y0 + 26;
      slip(x + 30 * (1 - k), y - 40 * (1 - k), .8, { rot: .2 + .3 * (1 - k), pin: k > .6, key: 'board' });
    }
  }

  function boltStand(x, y, t, o = {}) {
    if (typeof qwik === 'function') return qwik(x, y, 20, { ...boltFeel(o.mood || 'happy', t), boilKey: 'bolt', ...o });
    return bolt(x, y, 20, { ...boltFeel(o.mood || 'happy', t), boilKey: 'bolt', ...o });
  }
  function mockHouse(t, page) {
    boilSeed('mock house');
    paint(rectPts(4000, -200, 2600, 1600), { wash: '#B8A6C9', ink: null });
    paint(rectPts(4000, 900, 2600, 500), { wash: '#A87650', ink: INK, sw: 1 });
    const x0 = WIN.x0, y0 = WIN.y0, w = WIN.x1 - x0, h = WIN.y1 - y0;
    paint(rectPts(5420, WIN.y1, 60, 900 - WIN.y1), { wash: '#6B6280', ink: INK, sw: .9 });
    paint(rr(x0 - 12, y0 - 12, w + 24, h + 24, 16, .5), { wash: '#5D5470', ink: INK, sw: 1.1 });
    paint(rectPts(x0, y0, w, BANDS.titleBar[1] - y0), { wash: '#E4DCEF', ink: null });
    ['#E8606F', PAL.ochre, PAL.sap].forEach((c, i) => dot(x0 + 22 + i * 20, (y0 + BANDS.titleBar[1]) / 2, 6.5, c, { ink: true, sw: .6 }));
    paint(rr(x0 + 90, y0 + 9, w - 140, 22, 11), { wash: PAGE.panel, ink: INK, sw: .6 });
    logo(x0 + 108, y0 + 20, 15, 1);
    if (typeof drawPage === 'function') drawPage(page);
    paint(rr(x0, y0, w, h, 6), { ink: INK, sw: 1.1 });
  }
  function mockShop() {
    boilSeed('mock shop');
    paint(rectPts(-200, -200, 1800, 1600), { wash: '#262B57', ink: null });
    paint(rectPts(-200, FLOOR, 1800, 400), { wash: '#3A2F4F', ink: INK, sw: 1 });
    glow(870, 560, 520, '#FFC766', .85);
    paint([[1180, 560], [1280, 560], [1320, 620], [1140, 620]], { wash: '#C9913F', ink: INK, sw: 1 });
  }
  const at = (t, a, b) => clamp((t - a) / (b - a));

  LOOPS.pageSheet = t => {
    const inHouse = typeof houseSet === 'function';
    camBegin(5200, 580, .95);
    const st = {
      parts: { header: at(t, 1, 1.45), hero: at(t, 1.5, 1.95), card: at(t, 2, 2.45), skeleton: at(t, 2.5, 2.95), footer: at(t, 3, 3.45), reviews: t > 5.5 ? 1 : 0 },
      swap: at(t, 5, 5.7),
      liked: at(t, 6.2, 6.6),
      cartPress: t < 7.6 ? at(t, 7.4, 7.6) : 1 - at(t, 7.9, 8.1),
      cartLit: at(t, 8.4, 8.9),
      badge: at(t, 9.6, 10.0),
      handShadow: t > 7 && t < 8.3 ? [5790, 690 - 40 * at(t, 7, 7.4) + 30 * at(t, 7.4, 7.6), .8] : null,
      t,
    };
    if (inHouse) houseSet(t, { page: st }); else mockHouse(t, st);
    boltStand(4880, 900, t, { mood: t < 6 ? 'happy' : 'proud' });
    camEnd();
  };
  LOOPS.pageSheet.len = 11;

  LOOPS.boardSheet = t => {
    const inTower = typeof towerSet === 'function';
    camBegin(740, 600, 1.1);
    const st = {
      parts: { header: at(t, 1, 1.35), hero: at(t, 1.5, 1.85), card: at(t, 3, 3.35), skeleton: at(t, 4.5, 4.85), footer: at(t, 5.75, 6.1) },
      leave: { header: at(t, 2.2, 2.8), hero: at(t, 2.2, 2.8), card: at(t, 4, 4.6), skeleton: at(t, 5.2, 5.8), footer: at(t, 6.5, 7.1) },
      ghost: { header: at(t, 2.4, 2.9), hero: at(t, 2.4, 2.9), card: at(t, 4.2, 4.7), skeleton: at(t, 5.4, 5.9), footer: at(t, 6.7, 7.2) },
      tick: { header: at(t, 2.6, 3), hero: at(t, 2.7, 3.1), card: at(t, 4.4, 4.8), skeleton: at(t, 5.6, 6), footer: at(t, 6.9, 7.3) },
      slip: at(t, .3, .8),
      t,
    };
    if (inTower) towerSet(t, { board: st }); else { mockShop(); drawBoard(st); }
    boltStand(560, 940, t, { mood: 'determined' });
    camEnd();
  };
  LOOPS.boardSheet.len = 8;

  Object.assign(window, { PAGE, pagePart, drawPage, drawBoard, pageSlot, boardSlot, qwikPlush });
})();
