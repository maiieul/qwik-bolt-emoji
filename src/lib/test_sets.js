(() => {
  const zoomAt = t => .38 * Math.pow(1.6 / .38, clamp(t / 4));
  LOOPS.setsTubeZoom = t => {
    const z = zoomAt(t), cx = lerp(2600, 3050, clamp(t / 4));
    camBegin(cx, 270, z);
    landSet(t);
    towerSet(t);
    houseSet(t);
    camEnd();
  };
  LOOPS.setsTubeZoom.len = 4;

  const items = t => [
    { kind: 'parcel', s: SETS.tubeS(1300) - 380 + 140 * frac(t / 4), key: 'p0', o: { key: 'p0' } },
    { kind: 'parcel', x: 1400 + 600 * frac(t / 4), key: 'p1', o: { key: 'p1', stretch: .4 } },
    { kind: 'parcel', x: 1960 + 300 * frac(t / 4), key: 'p2', o: { key: 'p2' } },
    { kind: 'envelope', x: 4380 + 120 * frac(t / 4), key: 'e', o: { key: 'e' } },
    { kind: 'parcel', s: SETS.tubeLen - 90 + 60 * frac(t / 4), key: 'p3', o: { key: 'p3' } },
  ];
  LOOPS.setsTubeGlass = t => {
    const k = Math.floor(t), cams = [[1340, 400, 1.6], [1850, 260, 1.3], [4700, 300, 1.5], CAMS.deskMaster];
    camBegin(...cams[k] || cams[0]);
    landSet(t);
    towerSet(t);
    houseSet(t, { nozzleBulge: k === 2 ? .6 : 0 });
    tubeContents(t, items(t));
    tubeGlass(t, { nozzleBulge: k === 2 ? .6 : 0 });
    camEnd();
  };
  LOOPS.setsTubeGlass.len = 4;
})();
(() => {
  const Wd = WORLD, withCast = (fn, ...a) => { if (typeof window[fn] === 'function') window[fn](...a); };
  LOOPS.setsCast = t => {
    const k = Math.floor(t);
    if (k === 0) {
      camBegin(...CAMS.serverMaster);
      towerSet(t, { board: { parts: { header: 1, hero: 1 } }, shelfParts: ['card', 'skeleton', 'footer'] });
      withCast('db', ...Wd.db, 20, { ...feel('sleepy', t), snore: .5 + .5 * Math.sin(t * 3), dim: 1, boilKey: 'db' });
      bolt(...Wd.boltServer, 20, { ...boltFeel('determined', t), boilKey: 'bolt' });
      camEnd();
    } else if (k === 1) {
      camBegin(...CAMS.dockClose);
      landSet(t); towerSet(t);
      tubeGlass(t);
      for (const [kind, x] of Object.entries(Wd.queueX)) withCast('jsBox', x, Wd.roadY, 1.25, kind, { hop: 1, key: kind });
      withCast('snail', 2080, Wd.roadY, 20, { shell: 'blue', eyes: 'sleepy', boilKey: 's1' });
      withCast('snail', 2230, Wd.roadY, 20, { shell: 'teal', crawl: t, carry: 'menu', boilKey: 's2' });
      camEnd();
    } else {
      camBegin(...CAMS.deskMaster);
      houseSet(t, { cubbyLit: { menu: 1 }, page: { parts: { header: 1, hero: 1, card: 1, skeleton: 1, footer: 1 }, badge: 0 } });
      tubeGlass(t);
      withCast('snail', Wd.snailStop, Wd.roadY, 20, { shell: 'purple', carry: 'heart', boilKey: 's3' });
      withCast('snail', 5090, Wd.roadY, 20, { shell: 'blue', eyes: 'sleepy', hide: .6, boilKey: 's4' });
      withCast('jsBox', ...cubbyCentre('menu').map((v, i) => i ? v + 40 : v), 1.25, 'menu', { key: 'cm' });
      bolt(...Wd.boltDesk, 20, { ...boltFeel('cool', t), boilKey: 'bolt' });
      camEnd();
    }
  };
  LOOPS.setsCast.len = 3;
})();
(() => {
  const spots = [[4640, 690, 1.6], [870, 420, 1.6], [4420, 250, 1.6], [1700, 200, 1.6], [1250, 520, 1.6], [5100, 300, 1.6]];
  LOOPS.setsCloseUps = t => {
    const c = spots[Math.min(spots.length - 1, Math.floor(t))];
    camBegin(...c);
    landSet(t); towerSet(t, { board: { parts: { header: 1, hero: 1, card: 1 } } }); houseSet(t, { cubbyLit: { menu: 1, heart: 1 } });
    camEnd();
  };
  LOOPS.setsCloseUps.len = 6;
})();
(() => {
  LOOPS.setsPaper = t => {
    camBegin(...CAMS.poster);
    landSet(t); houseSet(t);
    if (t >= 1) paperVoid(t);
    camEnd();
    if (t >= 2) { landSet(t); paperVoid(t); }
  };
  LOOPS.setsPaper.len = 3;
  LOOPS.setsPerf = t => {
    const cams = [CAMS.serverMaster, CAMS.deskMaster, CAMS.dockClose, CAMS.poster, CAMS.widest, [2600, 380, 1], [3000, 380, .55]];
    camBegin(...cams[Math.min(cams.length - 1, Math.floor(t))]);
    landSet(t); towerSet(t); houseSet(t, { page: { parts: { header: 1, hero: 1, card: 1, skeleton: 1, footer: 1 } } });
    tubeGlass(t);
    camEnd();
  };
  LOOPS.setsPerf.len = 7;
})();
