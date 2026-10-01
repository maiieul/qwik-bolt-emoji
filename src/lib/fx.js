// fx.js: the step captions overlay, the title and end-card lettering, and the whip, paper-over and iris transitions.
(() => {
  const CAPTIONS = [
    { n: 1, t0: 6.5, t1: 14.8, text: 'The server renders the page' },
    { n: 2, t0: 15.5, t1: 25.5, text: 'HTML arrives in pieces, slow parts last' },
    { n: 3, t0: 28.5, t1: 34.6, text: 'JavaScript streams in the background' },
    { n: 4, t0: 42.0, t1: 53.6, text: 'A click? Its code jumps the queue' },
    { n: 5, t0: 54.5, t1: 58.3, text: '…and the rest keeps streaming' },
  ];
  const FONT = '"Permanent Marker", "Comic Sans MS", cursive';
  const FX = { ink: PAL.ink, band: '#2F2748', cream: PAL.cream, purple: '#AC7EF4', purpleDk: '#7B55CF', blue: '#18B6F6', paper: PAL.paper };

  let meter = null;
  const widths = {};
  function advances(txt, size) {
    const key = size + '|' + txt;
    if (widths[key]) return widths[key];
    if (!meter) meter = document.createElement('canvas').getContext('2d');
    meter.font = `${size}px ${FONT}`;
    const xs = [];
    for (let i = 0; i <= txt.length; i++) xs.push(meter.measureText(txt.slice(0, i)).width);
    return (widths[key] = xs);
  }

  function word(txt, x, y, size, col, o = {}) {
    const xs = advances(txt, size), n = txt.length, align = o.align || 'left';
    const x0 = align === 'center' ? x - xs[n] / 2 : align === 'right' ? x - xs[n] : x;
    for (let i = 0; i < n; i++) {
      const ch = txt[i];
      if (ch === ' ') continue;
      const cx = x0 + (xs[i] + xs[i + 1]) / 2;
      const inK = o.inOf ? o.inOf(cx) : o.inAt == null ? 1 : seg(o.t, o.inAt + i * (o.stagger ?? .016), o.inAt + i * (o.stagger ?? .016) + (o.inDur ?? .24));
      const outK = o.outOf ? o.outOf(cx) : 0;
      if (inK <= 0 || outK >= 1) continue;
      const boil = (hash(i * 13.7 + BOILN * 3.1 + size) - .5) * .035, lean = (hash(i * 7.3 + size) - .5) * .06;
      const drop = (1 - easeOut(inK)) * -size * .25 + easeIn(outK) * size * .3;
      letter(ch, cx, y + drop, size, col, {
        pop: inK < 1 ? inK : 1 - outK * .9, rot: lean + boil + (1 - inK) * -.3 + outK * .4, alpha: (o.alpha ?? 1) * (1 - easeIn(outK)),
        stroke: o.stroke ?? FX.ink, screen: o.screen, font: `${size}px ${FONT}`, align: 'center',
      });
    }
    return xs[n];
  }

  const CAP = { x: 82, y: 990, size: 48, badgeR: 32 };
  function swash(x0, x1, cy, h, key, k0, k1) {
    if (k1 - k0 < .01) return;
    boilSeed('caption swash ' + key);
    const a = lerp(x0, x1, k0), b = lerp(x0, x1, k1), top = [], bot = [];
    for (let i = 0; i <= 10; i++) {
      const u = i / 10, x = lerp(a, b, u);
      top.push([x, cy - h / 2 + Math.sin(u * 5.3 + 1) * 3 + jit(2)]);
      bot.push([x, cy + h / 2 + Math.sin(u * 4.1 + 2) * 3 + jit(2)]);
    }
    const tip = [];
    for (let i = 1; i < 6; i++) tip.push([b + (8 + 10 * hash(i * 3 + 1)) * Math.sin(i / 6 * Math.PI), cy - h / 2 + h * i / 6]);
    paint([...top, ...tip, ...bot.reverse()], { wash: FX.band, washOp: 205, fill: '#4A3F6B', fillOp: 60, bleed: .03, tex: .6, border: .5, ink: null });
  }
  function caption(c, t) {
    const inK = seg(t, c.t0, c.t0 + .5), outK = seg(t, c.t1 - .42, c.t1);
    if (inK <= 0 || outK >= 1) return;
    const { x, y, size, badgeR } = CAP, textX = x + badgeR + 24, xs = advances(c.text, size);
    const left = x - badgeR - 18, right = textX + xs[xs.length - 1] + 34;
    const head = lerp(left, right, easeOut(inK)), tail = lerp(left - 30, right + 30, easeIn(outK));
    swash(left, right, y + 2, size * 1.42, c.n, (tail - left) / (right - left), (head - left) / (right - left));
    const b = backOut(seg(t, c.t0, c.t0 + .26)) * (1 - clamp((tail - (x - badgeR)) / (badgeR * 2)));
    if (b > .02) {
      boilSeed('caption badge ' + c.n);
      paint(ellPts(x, y, badgeR * b, badgeR * b, 20, 1), { wash: FX.purple, ink: FX.ink, sw: 1.1 });
      paint(ellPts(x - badgeR * .3 * b, y - badgeR * .38 * b, badgeR * .32 * b, badgeR * .18 * b, 10, 0, -.6), { wash: '#D9C4FF', ink: null });
      letter(String(c.n), x + 1, y + 2, size * .92 * b, FX.cream, { screen: true, stroke: FX.ink, rot: -.06 + (hash(BOILN * 2.3 + c.n) - .5) * .04 });
    }
    word(c.text, textX, y + 1, size, FX.cream, { t, screen: true, inOf: cx => clamp((head - cx - 10) / 70), outOf: cx => clamp((tail - cx + 30) / 36) });
  }
  function drawOverlay(t) {
    for (const c of CAPTIONS) if (t > c.t0 - .01 && t < c.t1 + .01) caption(c, t);
  }

  function underline(x0, x1, y, k, col, key, sw = 5) {
    if (k <= 0) return;
    boilSeed('fx underline ' + key);
    const b = lerp(x0, x1, easeOut(k)), P = [];
    for (let i = 0; i <= 8; i++) { const u = i / 8, xx = lerp(x0, b, u); P.push([xx, y + Math.sin(u * 3 + .4) * 4 - u * 6]); }
    paint(ribbon(P, sw * 2.4, sw * .9), { wash: col, ink: FX.ink, sw: .9 });
  }
  function titleCard(t, x, y, k = 1) {
    if (k <= 0) return;
    const a = clamp(k);
    word('Qwik', x + 6, y - 132, 76, FX.purple, { t, inAt: 3.0, stagger: .03, alpha: a });
    const w1 = word('JavaScript', x, y - 22, 132, FX.blue, { t, inAt: 3.5, stagger: .022, alpha: a });
    word('Streaming', x, y + 110, 132, FX.purple, { t, inAt: 3.75, stagger: .022, alpha: a });
    if (a > .5) underline(x + 10, x + w1 * .9, y + 186, seg(t, 4.05, 4.4) * a, FX.blue, 'title', 6);
  }
  function endCard(t, x, y, k = 1) {
    if (k <= 0) return;
    const a = clamp(k);
    word('Qwik', x, y - 70, 176, FX.purple, { t, inAt: 62.0, stagger: .04, alpha: a });
    word('JavaScript Streaming', x + 8, y + 66, 74, FX.blue, { t, inAt: 62.5, stagger: .014, alpha: a });
    const w = word('qwik.dev', x + 8, y + 148, 56, FX.purpleDk, { t, inAt: 63.0, stagger: .025, alpha: a });
    if (a > .5) underline(x + 10, x + 8 + w, y + 184, seg(t, 63.3, 63.6) * a, FX.blue, 'end', 4);
  }

  function whip(p, dir = -1, cols = [FX.paper, PAL.indigo]) {
    if (p <= 0 || p >= 1) return;
    if (typeof flushLetters === 'function') flushLetters();
    const n = 7, travel = -Math.sign(dir || -1), bh = H / n + 36, cover = p < .5;
    push();
    if (travel < 0) { translate(W, 0); scale(-1, 1); }
    for (let i = 0; i < n; i++) {
      const d = hash(i * 4.1 + 2) * .3, y0 = -18 + i * H / n, col = cols[i % cols.length];
      const q = cover ? easeIn(clamp((p * 2 - d) / (1 - d))) : ease(clamp(((p - .5) * 2 - d * .6) / (1 - d * .6)));
      const x0 = cover ? -260 : lerp(-260, W + 260, q), x1 = cover ? lerp(-260, W + 420, q) : W + 420;
      if (x1 - x0 < 30) continue;
      boilSeed('whip band ' + i);
      const top = [], bot = [];
      for (let k = 0; k <= 8; k++) { const x = lerp(x0, x1, k / 8); top.push([x, y0 + Math.sin(k + i) * 6 + jit(3)]); bot.push([x, y0 + bh + Math.sin(k * .8 + i * 2) * 6 + jit(3)]); }
      const tip = [], tail = [];
      for (let k = 1; k < 8; k++) { const f = k / 8; tip.push([x1 + (30 + 90 * hash(i * 9 + k)) * Math.sin(f * Math.PI), y0 + bh * f]); }
      if (!cover) for (let k = 7; k > 0; k--) { const f = k / 8; tail.push([x0 - (20 + 80 * hash(i * 5 + k)) * Math.sin(f * Math.PI), y0 + bh * f]); }
      paint([...top, ...tip, ...bot.reverse(), ...tail], { wash: col, fill: mixCol(col, FX.ink, .18), fillOp: 70, bleed: .04, tex: .7, border: .6, ink: null });
      for (let k = 0; k < 4; k++) {
        const yy = y0 + bh * (.16 + .22 * k) + jit(4), len = (x1 - x0) * (.35 + .5 * hash(i * 7 + k));
        inkLine([[x1 - len, yy], [x1 - len * .5, yy + jit(3)], [x1 + 20, yy + 2]], 1.6, mixCol(col, k % 2 ? '#FFFFFF' : FX.ink, .28), 'dry', .2);
      }
    }
    if (cover) {
      boilSeed('whip lines');
      for (let i = 0; i < 9; i++) {
        const yy = 60 + hash(i * 3.3) * (H - 120), lead = lerp(-300, W + 200, easeIn(clamp(p * 2 * 1.15 - hash(i) * .2))), len = 180 + 260 * hash(i * 5.5);
        if (lead > -100) inkLine([[lead - len, yy], [lead, yy + jit(2)]], 1, mixCol(cols[i % cols.length], FX.ink, .35), 'dry', 0);
      }
    }
    pop();
  }

  function paperOver(p, cx = W / 2, cy = H / 2, o = {}) {
    if (p <= 0) return;
    if (typeof flushLetters === 'function') flushLetters();
    const r1 = o.hole ?? 150, far = Math.hypot(W, H), reachY = Math.max(cy, H - cy) + 90, reachX = Math.max(cx, W - cx) + 120;
    const hy = lerp(reachY, r1 * .85, easeOut(seg(p, 0, .62))), hx = lerp(reachX, r1, ease(seg(p, .3, 1)));
    boilSeed('paper over');
    const n = 44, hole = [];
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU, rag = 1 + .05 * Math.sin(a * 5 + 1.3) + .035 * Math.sin(a * 13 + 4) + .02 * (hash(i * 3.7) - .5) + jit(.01);
      const ex = Math.cos(a), ey = Math.sin(a), sq = Math.pow(Math.abs(ex), 2.6) + Math.pow(Math.abs(ey), 2.6);
      const r = Math.pow(sq, -1 / 2.6);
      hole.push([cx + ex * r * hx * rag, cy + ey * r * hy * rag]);
    }
    irisShape(hole, FX.paper, far * 2.5);
    boilSeed('paper over strokes');
    for (let i = 0; i < n; i++) {
      const a = hole[i], dx = a[0] - cx, dy = a[1] - cy, d = Math.hypot(dx, dy) || 1, ux = -dx / d, uy = -dy / d, tx = -uy, ty = ux;
      if (a[0] < -150 || a[0] > W + 150 || a[1] < -150 || a[1] > H + 150) continue;
      const len = Math.min(d * .35, 10 + 26 * hash(i * 2.7)), wid = 10 + 12 * hash(i * 5.3), sk = (hash(i * 9.1) - .5) * .8;
      paint([[a[0] - tx * wid - ux * 4, a[1] - ty * wid - uy * 4], [a[0] + (ux + tx * sk) * len, a[1] + (uy + ty * sk) * len], [a[0] + tx * wid - ux * 4, a[1] + ty * wid - uy * 4]], { wash: FX.paper, ink: null });
    }
    inkLine(hole.concat([hole[0]]), .7, mixCol(FX.paper, '#A8977A', .4), 'inkfine', .5);
  }
  function irisTo(p, cx = W / 2, cy = H / 2, col = FX.ink) {
    if (p <= 0 || p >= 1) return;
    if (typeof flushLetters === 'function') flushLetters();
    const R = Math.max(Math.hypot(cx, cy), Math.hypot(W - cx, cy), Math.hypot(cx, H - cy), Math.hypot(W - cx, H - cy)) + 60;
    const k = p < .5 ? 1 - easeIn(p / .5) : easeOut((p - .5) / .5), r = R * k;
    boilSeed('iris');
    if (r < 6) { paint(rectPts(-60, -60, W + 120, H + 120), { wash: col, ink: null }); return; }
    const pts = [];
    for (let i = 0; i < 48; i++) { const a = i / 48 * TAU, w = 1 + .025 * Math.sin(a * 7 + 1) + jit(.008); pts.push([cx + Math.cos(a) * r * w, cy + Math.sin(a) * r * w]); }
    irisShape(pts, col, R * 3);
    if (r < R * .9) inkLine(pts.concat([pts[0]]), 2.2, mixCol(col, '#6E5E96', .35), 'ink', .5);
  }

  function testBg(kind) {
    boilSeed('fx bg ' + kind);
    if (kind === 'tower') {
      paint(rectPts(-60, -60, W + 120, H + 120), { wash: '#262B57', ink: null });
      paint(rectPts(-60, 860, W + 120, 300), { wash: '#3A2F4F', ink: null });
      glow(900, 500, 520, '#FFC766', .8);
    } else if (kind === 'land') {
      paint(rectPts(-60, -60, W + 120, H + 120), { wash: '#DDEBF1', ink: null });
      paint([[-60, 760], [500, 680], [1100, 740], [1980, 660], [1980, 1140], [-60, 1140]], { wash: '#A9CA90', ink: null, curv: .4 });
      paint([[-60, 900], [700, 860], [1300, 920], [1980, 870], [1980, 1140], [-60, 1140]], { wash: '#8FBC6E', ink: null, curv: .4 });
    } else if (kind === 'house') {
      paint(rectPts(-60, -60, W + 120, H + 120), { wash: '#B8A4C3', ink: null });
      paint(rectPts(-60, 900, W + 120, 60), { wash: '#BA8552', ink: PAL.ink, sw: 1 });
    }
  }
  const standIn = (x, y, t, mood = 'happy') => (typeof qwik === 'function' ? qwik : bolt)(x, y, 20, { ...boltFeel(mood, t), boilKey: 'bolt' });
  LOOPS.fxSheet = t => {
    if (t < 3) {
      const bg = t < 1 ? 'tower' : t < 2 ? 'land' : 'house', vt = t < 1 ? lerp(6.4, 7.4, t) : t < 2 ? lerp(15.4, 16.4, t - 1) : lerp(25.0, 26.0, t - 2);
      testBg(bg); standIn(960, 900, t);
      drawOverlay(vt);
    } else if (t < 6) {
      paint(rectPts(-60, -60, W + 120, H + 120), { wash: PAL.paper, ink: null });
      standIn(430, 820, t, 'proud');
      titleCard(lerp(2.9, 5.3, (t - 3) / 3), 700, 520, 1);
    } else if (t < 9) {
      paint(rectPts(-60, -60, W + 120, H + 120), { wash: PAL.paper, ink: null });
      standIn(430, 820, t, 'playful');
      endCard(lerp(61.9, 64.5, (t - 6) / 3), 700, 520, 1 - seg(t, 8.6, 9));
    } else if (t < 10) {
      testBg(t < 9.5 ? 'land' : 'tower'); standIn(960, 900, t);
      whip(t - 9, -1, [PAL.paper, '#262B57']);
    } else if (t < 11) {
      testBg('land'); standIn(960, 700, t);
      paperOver(t - 10, 960, 560);
    } else {
      testBg(t < 11.5 ? 'house' : 'tower'); standIn(960, 900, t);
      irisTo(t - 11, t < 11.5 ? 1300 : 800, t < 11.5 ? 700 : 500);
    }
  };
  LOOPS.fxSheet.len = 12;

  Object.assign(window, { CAPTIONS, drawOverlay, titleCard, endCard, whip, paperOver, irisTo });
})();
