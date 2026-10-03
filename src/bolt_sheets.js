(() => {
  const label = (txt, x, y, size = 20) => letter(txt, x, y, size, PAL.ink, { ink: false, alpha: .8 });
  const floor = (y, x0 = 0, x1 = W) => inkLine([[x0 + 40, y + 6], [W / 2, y + 4], [x1 - 40, y + 7]], .6, mixCol(PAL.paper, PAL.ink, .35), 'inkfine', .5);

  LOOPS.boltEmotions = t => {
    const names = Object.keys(EMO), cols = 8, cw = W / cols, ch = H / 4;
    names.forEach((name, i) => {
      const cx = cw * (i % cols) + cw / 2, gy = ch * Math.floor(i / cols) + ch - 58;
      bolt(cx, gy, 9.2, boltFeel(name, t, { seed: i }));
      label(name, cx, gy + 32);
    });
    for (let r = 0; r < 4; r++) floor(ch * r + ch - 58);
  };
  LOOPS.boltEmotions.len = 4;

  LOOPS.boltHero = t => {
    bolt(620, 960, 38, boltFeel('happy', t, { seed: 1 }));
    bolt(1300, 960, 38, boltFeel('excited', t, { seed: 2 }));
    floor(960);
  };
  LOOPS.boltHero.len = 4;
})();
