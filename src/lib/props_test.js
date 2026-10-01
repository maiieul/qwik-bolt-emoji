(() => {
  LOOPS.seqLab = t => {
    paint(rectPts(-50, -50, W + 100, H + 100), { wash: PAL.paper, ink: null });
    for (let i = 0; i < 8; i++) {
      const u = i / 7;
      parcel(140 + i * 230, 200, 1.6, { unfold: u, part: ['header', 'hero'], to: [70 + i * 230, 250, 210 + i * 230, 330] });
      slip(140 + i * 230, 520, 1.6, { curl: 1 - u, rot: -.1 + u * .1 });
    }
    speedLines(380, 850, 300, 1, 1);
    parcel(460, 880, 1.5, { stretch: 1 });
    speedLines(1300, 850, 300, [1, -.3], .6);
    jsBox(1380, 880, 1.5, 'cart');
  };
  LOOPS.seqLab.len = 1;
})();
(() => {
  LOOPS.castLab = t => {
    paint(rectPts(-50, -50, W + 100, H + 100), { wash: PAL.paper, ink: null });
    const floor = (y, x0, x1) => inkLine([[x0, y + 2], [x1, y + 2]], .6, mixCol(PAL.paper, PAL.ink, .35), 'inkfine', .3);
    snail(260, 330, 60, { shell: 'blue', crawl: t * .5, carry: 'heart', eyes: 'normal', mouth: 'smile', boilKey: 'a' });
    floor(330, 60, 480);
    snail(700, 330, 60, { shell: 'purple', crawl: t * .5, eyes: 'happy', mouth: 'cat', boilKey: 'b' });
    snail(1100, 330, 60, { shell: 'teal', duck: 1, carry: 'star', boilKey: 'c' });
    snail(1500, 330, 60, { shell: 'blue', hide: .95, boilKey: 'd' });
    floor(330, 520, 1860);
    db(330, 1000, 30, { ...feel('sleepy', t, { eyes: 'closed' }), snore: .6 + .4 * Math.sin(t * 3), dim: .6, boilKey: 'db1' });
    db(900, 1000, 30, { ...feel('surprised', t), boilKey: 'db2' });
    floor(1000, 60, 1200);
    cursorHand(1350, 520, 1.6, { pose: 'point', shadow: [20, 24, 1] });
    cursorHand(1700, 520, 1.6, { pose: 'thumb' });
    cursorHand(1400, 830, 1, { pose: 'wave' });
    cursorHand(1650, 830, 1, { pose: 'drum' });
    cursorHand(1850, 830, 1, { pose: 'press' });
  };
  LOOPS.castLab.len = 4;
})();
(() => {
  const paper = () => paint(rectPts(-50, -50, W + 100, H + 100), { wash: PAL.paper, ink: null });
  LOOPS.snailCrawl = t => {
    paper();
    snail(700, 700, 60, { shell: 'blue', crawl: t * .5, carry: 'cart', mouth: 'smile', boilKey: 'x' });
    inkLine([[100, 702], [1800, 702]], .6, mixCol(PAL.paper, PAL.ink, .35), 'inkfine', .3);
    snail(1400, 700, 60, { shell: 'purple', crawl: t * .5 + .5, boilKey: 'y', ...feel('happy', t) });
  };
  LOOPS.snailCrawl.len = 2;
  LOOPS.dbActs = t => {
    paper();
    const k = seg(t, 0, 2);
    db(360, 800, 24, { ...feel('surprised', t), cough: k, boilKey: 'c1' });
    db(1000, 800, 24, { ...feel('sleepy', t, { eyes: 'closed' }), roll: k, boilKey: 'c2', dim: .5 });
    db(1600, 800, 24, { ...feel('angry', t), slap: k, boilKey: 'c3' });
    alarmClock(1900, 800, 1, { squash: k > .45 ? .8 * Math.exp(-(t - .9) * 3) : 0, ring: k < .45 ? 1 : 0 });
  };
  LOOPS.dbActs.len = 2;
  LOOPS.handActs = t => {
    paper();
    const k = seg(t % 2, .2, 1.2);
    cursorHand(250, 250, 1.2, { pose: 'thumb', from: 'point', k, shadow: [16, 20, 1] });
    cursorHand(700, 250, 1.2, { pose: 'wave', from: 'point', k });
    cursorHand(1150, 250, 1.2, { pose: 'press', press: Math.sin(Math.PI * k) });
    cursorHand(1600, 250, 1.2, { pose: 'drum', phase: t * 1.5 });
  };
  LOOPS.handActs.len = 2;
})();
(() => {
  LOOPS.handPoses = t => {
    paint(rectPts(-50, -50, W + 100, H + 100), { wash: '#F1ECFA', ink: null });
    ['point', 'thumb', 'wave', 'drum', 'press'].forEach((p, i) => cursorHand(200 + i * 380, 300, 2, { pose: p, shadow: [18, 22, 1], phase: t * 1.5 }));
    ['point', 'thumb', 'wave', 'drum', 'press'].forEach((p, i) => cursorHand(200 + i * 380, 800, 1, { pose: p, phase: t * 1.5 }));
  };
  LOOPS.handPoses.len = 2;
})();
(() => {
  LOOPS.slipCompare = t => {
    paint(rectPts(-50, -50, W + 100, H + 100), { wash: PAL.paper, ink: null });
    slip(300, 300, 3, { curl: 0, pin: true });
    slip(700, 300, 3, { curl: 0, pin: true, thumb: 'simple' });
    slip(1000, 250, 1.2, { curl: 0 });
    slip(1150, 250, 1.2, { curl: 0, thumb: 'simple' });
    for (let i = 0; i < 6; i++) parcel(200 + i * 300, 900, 1.6, { unfold: .3 + i * .14, part: ['card'], to: [100 + i * 300, 640, 330 + i * 300, 760] });
  };
  LOOPS.slipCompare.len = 1;
})();
(() => {
  LOOPS.fxLab = t => {
    paint(rectPts(-50, -50, W + 100, H + 100), { wash: PAL.paper, ink: null });
    paint(rectPts(0, 540, W, 540), { wash: '#EFE8FB', ink: null });
    for (let i = 0; i < 7; i++) { poof(160 + i * 260, 260, 1.5, i * .1); poof(160 + i * 260, 800, 1.5, i * .1, { key: 'b' }); }
  };
  LOOPS.fxLab.len = 1;
})();
(() => {
  const Wd = WORLD, safe = (f) => { try { f(); } catch (e) { console.warn('ctx', e.message); } };
  const P = Wd.page;
  const shots = [
    ['B3 serverMaster', 12.3, CAMS.serverMaster, t => {
      safe(() => towerSet(t, { board: { parts: { header: .02, hero: .02, card: 1 }, slip: 1 }, shelfParts: ['reviews', 'footer'] }));
      db(...Wd.db, 20, { ...feel('sleepy', t, { eyes: 'closed' }), snore: .6 + .3 * Math.sin(t * 3), dim: .8, boilKey: 'db' });
      bolt(...Wd.boltServer, 20, { ...boltFeel('thinking', t), boilKey: 'bolt' });
    }],
    ['C2 alarm', 21.3, [420, 760, 1.4], t => {
      safe(() => towerSet(t, { board: { parts: { header: .02, hero: .02, card: .02, skeleton: .02, footer: .02 } } }));
      db(...Wd.db, 20, { ...emotions(t, [[20.5, 'sleepy', { eyes: 'closed' }], [20.9, 'surprised'], [21.2, 'determined']]), cough: seg(t, 21.3, 22.3), coughTo: Wd.funnel, capUp: .5, boilKey: 'db' });
      alarmClock(Wd.db[0] + 170, Wd.db[1], 1, { ring: 0, squash: .6, key: 'c2' });
    }],
    ['D2 dockClose', 29.2, CAMS.dockClose, t => {
      safe(() => { landSet(t); towerSet(t); tubeGlass(t); });
      safe(() => { drawQueue(t); drawSnails(t); });
      soundRings(1650, 170, 1, 1, { key: 'ring' });
    }],
    ['E1 deskMaster', 36.15, CAMS.deskMaster, t => {
      safe(() => houseSet(t, { cubbyLit: { menu: 1, heart: 1 }, page: { parts: { header: 1, hero: 1, card: 1, reviews: 1, footer: 1 }, badge: 0, handShadow: [P.likeBtn[0] + 18, P.likeBtn[1] + 22, 1] } }));
      safe(() => { tubeGlass(t); drawQueue(t, { where: ['cubby'] }); drawSnails(t); });
      bolt(...Wd.boltDesk, 20, { ...boltFeel('cool', t), boilKey: 'bolt' });
      clickSpark(P.likeBtn[0] - 20, P.likeBtn[1] - 50, 1, { state: 'born', age: t - 36, key: 'click' });
      cursorHand(P.likeBtn[0] + 6, P.likeBtn[1] - 2, 1, { pose: 'press', press: 1, shadow: [8, 10, 1], key: 'user' });
    }],
    ['E6 deskMaster', 49.8, CAMS.deskMaster, t => {
      safe(() => houseSet(t, { clockWhizz: seg(t, 48, 49.5), cubbyLit: { menu: 1, heart: 1, star: 1 }, page: { parts: { header: 1, hero: 1, card: 1, reviews: 1, footer: 1 }, badge: 0, liked: 1 } }));
      safe(() => { tubeGlass(t); drawQueue(t, { where: ['cubby', 'bolt'] }); drawSnails(t); });
      bolt(...Wd.boltDesk, 20, { ...boltFeel('nervous', t), boilKey: 'bolt' });
      cursorHand(P.cartBtn[0] + 10, P.cartBtn[1] - 2, 1, { pose: 'drum', phase: t * 2, shadow: [18, 22, 1], key: 'user' });
    }],
    ['E5 poster', 45.1, CAMS.poster, t => {
      safe(() => { landSet(t); towerSet(t); houseSet(t); tubeGlass(t); drawQueue(t); drawSnails(t); });
    }],
    ['G1 widest', 59.6, CAMS.widest, t => {
      safe(() => { landSet(t); towerSet(t); houseSet(t, { cubbyLit: { menu: 1, heart: 1, star: 1, share: 1, gear: 1, cart: 1 } }); tubeGlass(t); drawQueue(t, { where: ['cubby'] }); drawSnails(t); });
    }],
  ];
  LOOPS.propsInSets = lt => {
    const [, t, cam, f] = shots[Math.min(shots.length - 1, Math.floor(lt))];
    camBegin(...cam);
    f(t + frac(lt) * .5);
    camEnd();
  };
  LOOPS.propsInSets.len = shots.length;
})();
(() => {
  LOOPS.inTube = lt => {
    const cams = [[1850, 260, 1.3], [3000, 300, .75], [4700, 320, 1.5]], k = Math.min(2, Math.floor(lt)), t = 16 + frac(lt);
    camBegin(...cams[k]);
    try {
      landSet(t); towerSet(t); houseSet(t, { nozzleBulge: k === 2 ? .5 : 0 });
      tubeContents(t, [
        { kind: 'parcel', x: 1700 + 300 * frac(lt), key: 'p1', o: { key: 'p1', stretch: .5 } },
        { kind: 'parcel', x: 1960 + 200 * frac(lt), key: 'p2', o: { key: 'p2', stretch: .3 } },
        { kind: 'parcel', x: 2700 + 300 * frac(lt), key: 'p3', o: { key: 'p3', stretch: .6 } },
        { kind: 'envelope', x: 3200 + 200 * frac(lt), key: 'e', o: { key: 'e', flutter: .5 } },
        { kind: 'parcel', x: 4600 + 60 * frac(lt), key: 'p4', o: { key: 'p4' } },
      ]);
      tubeGlass(t, { nozzleBulge: k === 2 ? .5 : 0 });
    } catch (e) { console.warn(e.message); }
    if (k === 0) speedLines(1700 + 300 * frac(lt) - 40, 290, 160, 1, .6, { key: 'tube' });
    camEnd();
  };
  LOOPS.inTube.len = 3;
})();
(() => {
  LOOPS.whistleCtx = lt => {
    const t = 27.2 + lt * .5;
    camBegin(...CAMS.deskMaster);
    try { houseSet(t, { page: { parts: { header: 1, hero: 1, card: 1, reviews: 1, footer: 1 }, badge: 0 } }); tubeGlass(t); } catch (e) { console.warn(e.message); }
    const [bx, by] = WORLD.boltDesk, u = 20;
    bolt(bx, by, u, { ...boltFeel('determined', t), mouth: 'o', boilKey: 'bolt' });
    const mouth = [bx - .2 * u, by - 8.4 * u];
    const h = whistle(mouth[0], mouth[1], 1, { blow: 1, rot: -.15 });
    for (let i = 0; i < 3; i++) {
      const age = frac(lt * 1.5 + i / 3), p = [lerp(h.hole[0], h.hole[0] - 700, easeOut(age)), lerp(h.hole[1], WORLD.tubeY - 40, easeOut(age))];
      soundRings(p[0], p[1], clamp(age * 4) * (1 - seg(age, .8, 1)), [-1, -.25], { key: 'r' + i });
    }
    camEnd();
  };
  LOOPS.whistleCtx.len = 2;
})();
(() => {
  LOOPS.snailHero = t => {
    paint(rectPts(-50, -50, W + 100, H + 100), { wash: PAL.paper, ink: null });
    snail(560, 800, 90, { ...feel('happy', t), eyes: 'normal', crawl: t * .5, carry: 'cart', shell: 'blue', boilKey: 'h1' });
    snail(1450, 800, 90, { ...feel('determined', t), crawl: t * .5 + .5, shell: 'purple', sweat: 1, boilKey: 'h2' });
    inkLine([[60, 802], [1860, 802]], .8, mixCol(PAL.paper, PAL.ink, .35), 'inkfine', .2);
  };
  LOOPS.snailHero.len = 2;
})();
(() => {
  LOOPS.dbSize = t => {
    paint(rectPts(-50, -50, W + 100, H + 100), { wash: PAL.paper, ink: null });
    const r = db(600, 800, 20, { ...feel('neutral', t), boilKey: 'size' });
    inkLine([[600 - 110, 800 - 240], [600 + 110, 800 - 240], [600 + 110, 800], [600 - 110, 800], [600 - 110, 800 - 240]], .5, '#E2476E', 'inkfine', 0);
    snail(1000, 800, 20, { shell: 'blue', boilKey: 'size' });
    inkLine([[955, 780], [955, 820]], .5, '#E2476E', 'inkfine', 0); inkLine([[1045, 780], [1045, 820]], .5, '#E2476E', 'inkfine', 0);
    cursorHand(1400, 580, 1, { pose: 'point', key: 'size' });
    inkLine([[1330, 580], [1480, 580]], .5, '#E2476E', 'inkfine', 0); inkLine([[1330, 800], [1480, 800]], .5, '#E2476E', 'inkfine', 0);
    jsBox(1700, 800, 1, 'cart'); inkLine([[1668, 744], [1732, 744]], .5, '#E2476E', 'inkfine', 0);
  };
  LOOPS.dbSize.len = 1;
})();
(() => {
  LOOPS.icon20 = t => {
    paint(rectPts(-50, -50, W + 100, H + 100), { wash: PAL.paper, ink: null });
    PROPS.kinds.forEach((k, i) => {
      icon(k, 60 + i * 40, 40, 20);
      icon(k, 60 + i * 40, 80, 20, PAL.cream, { key: 'c' });
      icon(k, 60 + i * 40, 120, 20, PAL.ink, { hollow: true, key: 'h' });
      jsBox(60 + i * 40, 200, 20 / 29, k);
    });
    paint(rectPts(40, 66, 240, 28), { wash: QWIK.purple, ink: null });
    PROPS.kinds.forEach((k, i) => icon(k, 60 + i * 40, 80, 20, PAL.cream, { key: 'c2' }));
  };
  LOOPS.icon20.len = 1;
})();
(() => {
  LOOPS.duckPoster = lt => {
    const t = 44.6 + lt;
    camBegin(...CAMS.poster);
    try { landSet(t); towerSet(t); houseSet(t); tubeGlass(t); } catch (e) { console.warn(e.message); }
    const d = ease(seg(lt, .2, .4)) * (1 - .62 * ease(seg(lt, .7, 1.2)));
    snail(3900, WORLD.roadY, 20, { shell: 'teal', carry: 'star', duck: d, lookY: -seg(lt, .7, 1.2), crawl: t * .5, boilKey: 'p1' });
    snail(3100, WORLD.roadY, 20, { shell: 'purple', carry: 'share', duck: d, crawl: t * .5 + .3, boilKey: 'p2' });
    const armX = lerp(5000, 1600, ease(seg(lt, 0, .5)));
    longRibbon([[4900, 640], [4700, 100], [4000, 120], [armX, 130]], 26, 20, { wash: '#FFFBF4', sw: 1.6 });
    camEnd();
  };
  LOOPS.duckPoster.len = 1.5;
})();
(() => {
  LOOPS.closeProps = t => {
    paint(rectPts(-50, -50, W + 100, H + 100), { wash: PAL.paper, ink: null });
    camBegin(960, 540, 2.5);
    jsBox(720, 560, 1, 'cart', { hop: .5 });
    parcel(840, 560, 1, {});
    envelope(960, 530, 1, {});
    slip(1060, 520, 1, { pin: true });
    clickSpark(1150, 490, 1, {});
    alarmClock(1210, 575, .9, {});
    camEnd();
  };
  LOOPS.closeProps.len = 2;
})();
