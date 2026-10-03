(() => {
  const BRUSH_WIDTH = { ink: 5.4, inkfine: 2.8, dry: 6 }, OUTLINE_WIDTH = 5.9;

  window.recordFrame = (name, t) => {
    const shapes = [], saved = { paint, inkLine, flushBrush, glow };
    let m = [1, 0, 0, 1, 0, 0];
    const stack = [];
    // p5's transform globals are read-only, so swap their property descriptors.
    const transforms = {
      push: () => stack.push(m.slice()),
      pop: () => { m = stack.pop(); },
      translate: (x, y) => { m = [m[0], m[1], m[2], m[3], m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]; },
      rotate: a => { const c = Math.cos(a), s = Math.sin(a); m = [m[0] * c + m[2] * s, m[1] * c + m[3] * s, -m[0] * s + m[2] * c, -m[1] * s + m[3] * c, m[4], m[5]]; },
      scale: (sx, sy = sx) => { m = [m[0] * sx, m[1] * sx, m[2] * sy, m[3] * sy, m[4], m[5]]; },
    };
    const p5Transforms = Object.fromEntries(Object.keys(transforms).map(k => [k, Object.getOwnPropertyDescriptor(window, k)]));
    for (const [k, fn] of Object.entries(transforms)) Object.defineProperty(window, k, { value: fn, writable: true, configurable: true });
    paint = (pts, o = {}) => {
      if (!pts.length) return;
      const smooth = o.curv || 0, t = m.slice();
      if (o.wash) shapes.push({ pts, m: t, closed: true, smooth, fill: o.wash, opacity: (o.washOp ?? 255) / 255 });
      else if (o.fill) shapes.push({ pts, m: t, closed: true, smooth, fill: o.fill, opacity: .55 * (o.fillOp ?? 170) / 255, soft: true });
      if (o.ink === null) return;
      // Cap flat strokes by size, or they smother sparks and hearts.
      const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), size = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
      const width = (o.sw ?? 1) * OUTLINE_WIDTH * (o.br === 'inkfine' ? .53 : 1);
      shapes.push({ pts, m: t, closed: true, smooth, stroke: o.ink || PAL.ink, width: Math.min(width, size * .09) });
    };
    inkLine = (pts, sw = 1, col = PAL.ink, br = 'ink', curv = .5) => {
      shapes.push({ pts, m: m.slice(), closed: false, smooth: curv, stroke: col, width: sw * (BRUSH_WIDTH[br] || BRUSH_WIDTH.ink) });
    };
    flushBrush = () => {};
    glow = () => {};
    try {
      T = t; BOILN = Math.floor(t * BOIL); CLAWD_N = 0; boilSeed('frame'); noiseSeed(77);
      LOOPS[name](t);
    } finally {
      ({ paint, inkLine, flushBrush, glow } = saved);
      for (const [k, d] of Object.entries(p5Transforms)) Object.defineProperty(window, k, d);
    }
    return shapes;
  };
})();
