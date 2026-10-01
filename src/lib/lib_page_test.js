(() => {
  LOOPS.pageParts = t => {
    paint(rectPts(-50, -50, W + 100, H + 100), { wash: PAGE.bg, ink: null });
    const label = (txt, x, y) => letter(txt, x, y, 17, PAL.ink, { ink: false, align: 'left', alpha: .75, font: '17px system-ui, sans-serif' });
    const kinds = ['header', 'hero', 'card', 'skeleton', 'reviews', 'footer'];
    let y = 50;
    label('page size (860 wide)', 40, 30);
    for (const k of kinds) { const h = PAGE.h[k]; pagePart(k, 40, y, 860, h, { badge: 0, t }); y += h + 14; }
    y = 50;
    label('board size (440 wide)', 960, 30);
    for (const k of kinds) { const h = PAGE.h[k] * 1.02; pagePart(k, 960, y, 440, h, { badge: 0, t }); y += h + 12; }
    label('ghost', 1440, 30);
    y = 50;
    for (const k of kinds) { const h = PAGE.h[k] * .6; pagePart(k, 1440, y, 260, h, { ghost: 1, t }); y += h + 8; }
    label('slip', 1740, 30);
    y = 50;
    for (const k of kinds) { const h = PAGE.h[k] * .13; pagePart(k, 1740, y, 90, h, { t }); y += h + 2; }
    label('card: liked · pressed · lit', 40, 690);
    pagePart('card', 40, 710, 860, 120, { liked: 1, press: 1, lit: 1, t });
    label('badge 0 → 1', 40, 860);
    [0, .2, .45, .6, 1].forEach((b, i) => pagePart('header', 40 + i * 180, 880, 170, 50, { badge: b, t, key: 'b' + i }));
    label('qwikPlush', 1000, 690);
    qwikPlush(1100, 860, 240, { key: 'big' });
    qwikPlush(1300, 900, 120, { key: 'mid', rot: .1 });
    qwikPlush(1420, 930, 60, { key: 'small', rot: -.2 });
  };
  LOOPS.pageParts.len = 2;
})();
(() => {
  const camFor = t => t < 32 ? [1740, 200, 1.3] : t < 44 || t >= 48 ? CAMS.deskMaster : t < 45.5 ? CAMS.poster : [1740, 200, 1.3];
  LOOPS.schedWorld = t => {
    camBegin(...camFor(t));
    const cubbyLit = {}; for (const k of QUEUE) { const b = box(k, t); if (b.where === 'cubby') cubbyLit[k] = 1; }
    if (typeof landSet === 'function') landSet(t, {});
    if (typeof towerSet === 'function') towerSet(t, {});
    if (typeof houseSet === 'function') houseSet(t, { clockWhizz: clockWhizz(t), cubbyLit, page: { parts: { header: 1, hero: 1, card: 1, reviews: 1, footer: 1 }, badge: 0 } });
    drawQueue(t, { where: ['line', 'arm', 'bolt', 'cubby'] });
    drawSnails(t);
    const b = typeof qwik === 'function' ? qwik : bolt;
    if (t >= 32 && (t < 44 || t >= 48)) b(4880, 900, 20, { ...boltFeel('cool', t), boilKey: 'bolt' });
    camEnd();
  };
  LOOPS.schedWorld.len = 60;
})();
(() => {
  LOOPS.capProbe = t => {
    boilSeed('cap probe bg');
    paint(rectPts(-60, -60, W + 120, H + 120), { wash: t < 20 ? '#DDEBF1' : '#B8A4C3', ink: null });
    paint([[-60, 760], [500, 680], [1100, 740], [1980, 660], [1980, 1140], [-60, 1140]], { wash: '#A9CA90', ink: null, curv: .4 });
    drawOverlay(t);
  };
  LOOPS.capProbe.len = 66;
})();
(() => {
  LOOPS.schedCheck = () => {
    if (window.__checked) return; window.__checked = 1;
    const out = [], ids = ['s1', 's2', 's3', 's4', 's5', 's6'], skips = [32, 48];
    for (const id of ids) {
      let prev = null, worst = [0, 0];
      for (let f = 27 * 24; f <= 60 * 24; f++) {
        const t = f / 24, s = snailAt(id, t);
        if (prev && prev.visible && s.visible && !skips.some(k => prev.t < k && t >= k)) {
          const d = Math.hypot(s.x - prev.x, s.y - prev.y);
          if (d > worst[0]) worst = [d, t];
        }
        prev = { ...s, t };
      }
      out.push(`${id}: max step ${worst[0].toFixed(1)}px/frame at ${worst[1].toFixed(2)}`);
    }
    for (const k of QUEUE) {
      let prev = null, worst = [0, 0], firstSnail = null, firstCubby = null, firstArm = null;
      for (let f = 27 * 24; f <= 60 * 24; f++) {
        const t = f / 24, b = box(k, t);
        if (b.where === 'snail' && firstSnail == null) firstSnail = t;
        if ((b.where === 'arm' || b.where === 'bolt') && firstArm == null) firstArm = t;
        if (b.where === 'cubby' && firstCubby == null) firstCubby = t;
        if (prev && !skips.some(s => prev.t < s && t >= s)) { const d = Math.hypot(b.x - prev.x, b.y - prev.y); if (d > worst[0]) worst = [d, t]; }
        prev = { ...b, t };
      }
      out.push(`${k}: on snail ${firstSnail?.toFixed(2)} held ${firstArm?.toFixed(2)} cubby ${firstCubby?.toFixed(2)} max step ${worst[0].toFixed(1)} at ${worst[1].toFixed(2)}`);
    }
    for (const [id, tt] of [['s1', 32.25], ['s2', 32.5], ['s3', 48.5], ['s4', 55.5], ['s5', 49.75], ['s6', 56.0]]) {
      const a = snailAt(id, tt - .05), b = snailAt(id, tt);
      out.push(`${id} at ${tt}: x ${b.x.toFixed(1)} (0.05 s before ${a.x.toFixed(1)})`);
    }
    for (const tt of [44, 45, 46, 47, 47.9]) out.push(`E5 ${tt}: star ${snailAt('s3', tt).x.toFixed(0)} share ${snailAt('s4', tt).x.toFixed(0)} duck ${snailAt('s3', tt).duck.toFixed(2)}/${snailAt('s4', tt).duck.toFixed(2)} hand ${reachX(tt)?.toFixed(0)}`);
    for (const tt of [31.9, 32.0, 47.9, 48.0]) out.push(`t ${tt}: ` + ids.map(id => { const s = snailAt(id, tt); return s.visible ? `${id} ${s.x.toFixed(0)}` : `${id} -`; }).join(' '));
    for (const id of ['s4', 's5', 's6']) {
      let prev = null, worst = [0, 0], enter = null;
      for (let f = 48 * 24; f <= 58 * 24; f++) {
        const t = f / 24, st = snailAt(id, t);
        if (st.x > 4190 && enter == null) enter = t;
        if (prev && st.x > 4190) { const d = st.x - prev.x; if (d > worst[0]) worst = [d, t]; }
        prev = st;
      }
      out.push(`${id} in desk frame from ${enter?.toFixed(2)}: max step ${worst[0].toFixed(1)} at ${worst[1].toFixed(2)}`);
    }
    for (const tt of [48.9, 49.0, 49.1, 49.2, 49.3, 49.5]) out.push(`t ${tt}: s4 ${snailAt('s4', tt).x.toFixed(0)} s5 ${snailAt('s5', tt).x.toFixed(0)} s6 ${snailAt('s6', tt).x.toFixed(0)}`);
    console.warn(out.join('\n'));
  };
  LOOPS.schedCheck.len = 1;
})();
(() => {
  LOOPS.pageZoom = t => {
    const cams = [[5200, 580, .95], [4700, 450, .55], [3250, 380, .5], [3150, 300, .38]];
    const cam = cams[Math.min(3, Math.floor(t))];
    camBegin(...cam);
    const st = { parts: { header: 1, hero: 1, card: 1, skeleton: 1, footer: 1 }, badge: 0, t };
    if (typeof landSet === 'function' && cam[2] < .9) landSet(t, {});
    if (typeof towerSet === 'function' && cam[2] < .6) towerSet(t, { board: { parts: { card: 1, skeleton: 1 }, ghost: { header: 1, hero: 1 }, tick: { header: 1, hero: 1 } } });
    if (typeof houseSet === 'function') houseSet(t, { page: st });
    camEnd();
  };
  LOOPS.pageZoom.len = 4;
})();
