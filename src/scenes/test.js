(() => {
  LOOPS.boltTest = t => {
    paint(rectPts(-50, -50, W + 100, H + 100), { wash: PAL.paper, ink: null });
    bolt(700, 850, 32, boltFeel('happy', t));
    bolt(1300, 850, 32, boltFeel('excited', t));
  };
  LOOPS.boltTest.len = 2;
})();
