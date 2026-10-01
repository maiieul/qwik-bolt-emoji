(() => {
  LOOPS.boltTest = t => {
    paint(rectPts(-50, -50, W + 100, H + 100), { wash: PAL.paper, ink: null });
    bolt(700, 850, 32, boltFeel('happy', t));
    bolt(1300, 850, 32, boltFeel('excited', t));
  };
  LOOPS.boltTest.len = 2;
  LOOPS.longTest = t => {
    camBegin(3000, 400, .45);
    paint(rectPts(-200, -600, 6600, 2000), { wash: PAL.paper, ink: null });
    longRibbon([[200, 200], [2000, 150], [4000, 260], [5800, 200]], 60, 30, { wash: '#FFFBF4', sw: 1.4 });
    longLine([[200, 600], [5800, 600]], 1.2);
    camEnd();
  };
  LOOPS.longTest.len = 1;
})();
