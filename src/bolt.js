const QWIK = {
  white: '#FFFBF4', whiteDk: '#E2DCF2',
  purple: '#AC7EF4', purpleDk: '#7B55CF', purpleLt: '#E2D2FF',
  blue: '#18B6F6', blueDk: '#1F7FC4', blueLt: '#A8E6FF',
  spark: '#FFE68A', fright: '#3C7CF0',
};
const SHADOW = .8;

const BOLT = [[1.112, -7.952], [-7.475, -16.301], [-6.554, -9.952], [-8.555, -7.952], [0, 0], [-.488, -6.352]];
const BOLT_R = [.5, .6, .3, .5, .6, .3];
const BODY_CX = -3.72, BODY_CY = -8.15;
const FACE = { x: -3.72, y: -8.1 };
const FACE_SPREAD = .3, MOUTH_SIZE = [1, 1.3], EYE_X = 2.1;
const EYE_FIT = {
  normal: { w: 2.3, h: 1.05, y: -5.9 }, look: { w: 1.75, h: 1, y: -5.6 }, wide: { w: 1.8, h: .78, y: -5.9 },
  happy: { w: 1.65, h: 1.2, y: -6.6, ink: 1.35 }, sad: { w: 2.1, h: 1.35, y: -6.2, x: 1.9 }, angry: { w: 1.75, h: 1.1 }, heart: { w: 1.4, h: 1.15, y: -5.9 }, white: { w: 1.3, h: 1.05, y: -6.1 },
  x: { w: 1.05, h: .85, y: -5.83, x: 1.85, ink: 1.7 }, red: { w: 1.7, h: 1, y: -5.9 }, sleepy: { w: 2.2, h: 1.45, y: -6.15, x: 1.95 }, cry: { w: 1.7 }, shades: { w: 1.4, h: 1.25, x: 2.85 },
};
const eyeFit = kind => ({ x: EYE_X, ...EYE_FIT[kind] });

function roundedPts(P, R, n = 5) {
  const out = [];
  for (let i = 0; i < P.length; i++) {
    const p = P[i], a = P[(i + P.length - 1) % P.length], b = P[(i + 1) % P.length];
    const da = Math.hypot(a[0] - p[0], a[1] - p[1]), db = Math.hypot(b[0] - p[0], b[1] - p[1]);
    const r = Math.min(R[i], da * .45, db * .45);
    const pa = [p[0] + (a[0] - p[0]) / da * r, p[1] + (a[1] - p[1]) / da * r], pb = [p[0] + (b[0] - p[0]) / db * r, p[1] + (b[1] - p[1]) / db * r];
    for (let j = 0; j <= n; j++) {
      const k = j / n, m = 1 - k;
      out.push([m * m * pa[0] + 2 * m * k * p[0] + k * k * pb[0], m * m * pa[1] + 2 * m * k * p[1] + k * k * pb[1]]);
    }
  }
  return out;
}

function clipHalf(P, a, b) {
  const side = p => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
  const out = [];
  for (let i = 0; i < P.length; i++) {
    const p = P[i], q = P[(i + 1) % P.length], sp = side(p), sq = side(q);
    if (sp <= 0) out.push(p);
    if ((sp <= 0) !== (sq <= 0)) { const k = sp / (sp - sq); out.push([p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k]); }
  }
  return out;
}

function insetPts(P, d) {
  const n = P.length, area = P.reduce((s, a, i) => s + a[0] * P[(i + 1) % n][1] - P[(i + 1) % n][0] * a[1], 0);
  if (area < 0) d = -d;
  const lines = P.map((a, i) => {
    const b = P[(i + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy);
    return [[a[0] - dy / l * d, a[1] + dx / l * d], [dx, dy]];
  });
  return P.map((_, i) => {
    const [p, r] = lines[(i + n - 1) % n], [q, v] = lines[i], k = ((q[0] - p[0]) * v[1] - (q[1] - p[1]) * v[0]) / (r[0] * v[1] - r[1] * v[0]);
    return [p[0] + r[0] * k, p[1] + r[1] * k];
  });
}
const scalePts = (P, u) => P.map(([x, y]) => [x * u, y * u]);
const shiftLine = ([a, b], [dx, dy]) => [[a[0] + dx, a[1] + dy], [b[0] + dx, b[1] + dy]];
function drawShifted(dy, draw) {
  push(); translate(0, dy); draw(); pop();
}
function drawEachScaled(k, draw) {
  const [paintFlat, inkLineFlat] = [paint, inkLine];
  const inPlace = pts => {
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    return pts.map(([x, y]) => [cx + (x - cx) * k, cy + (y - cy) * k]);
  };
  paint = (pts, o) => paintFlat(inPlace(pts), o);
  inkLine = (pts, ...rest) => inkLineFlat(inPlace(pts), ...rest);
  try { draw(); } finally { paint = paintFlat; inkLine = inkLineFlat; }
}

function boltTones(o) {
  const tone = (col, dk, lt, k) => tintCols({ tint: o.tint, tintK: (o.tintK ?? 1) * k, col, dk, lt });
  return { white: tone(QWIK.white, QWIK.whiteDk, '#FFFFFF', .5), purple: tone(QWIK.purple, QWIK.purpleDk, QWIK.purpleLt, .3), blue: tone(QWIK.blue, QWIK.blueDk, QWIK.blueLt, .3) };
}
function boltCols(o) {
  if (!o.tintFrom) return boltTones(o);
  const a = boltTones(o.tintFrom), b = boltTones(o.tintTo), k = o.tintMix;
  const mix = (x, y) => ({ col: mixCol(x.col, y.col, k), dk: mixCol(x.dk, y.dk, k), lt: mixCol(x.lt, y.lt, k) });
  return { white: mix(a.white, b.white), purple: mix(a.purple, b.purple), blue: mix(a.blue, b.blue) };
}

const ZAP = { excited: 1, furious: 1, angry: .7, idea: .8, starstruck: .8, surprised: .7, determined: .6, laugh: .5, scared: .5,
  ko: .6, dizzy: .4, happy: .35, proud: .4, playful: .4, cool: .3, love: .3, neutral: .15, hopeful: .25, smug: .15, mischief: .3,
  sad: 0, cry: 0, sleepy: 0, bored: 0 };

function spark(x, y, s, a, sw) {
  push(); translate(x, y); rotate(a);
  const P = [[0, 0], [.55, -.5], [.35, -.05], [1.05, -.55], [.7, .15], [1.05, .1], [.3, .75], [.45, .25]].map(([px, py]) => [px * s, py * s]);
  paint(P, { wash: QWIK.spark, ink: PAL.ink, sw: sw * .55 });
  pop();
}

function bolt(x, y, u, o = {}) {
  const id = o.boilKey ?? ++CLAWD_N, rs = part => boilSeed(`bolt ${id} ${part}`);
  const clock = o.clock ?? T, loopLen = o.loopLen ?? 2;
  const cycles = perSecond => clock * Math.max(1, Math.round(perSecond * loopLen)) / loopLen;
  x += ((o.dx || 0) - BODY_CX) * u;
  const hover = o.hover ?? 1.4, lift = (o.dy || 0) - hover, sq = (o.sq || 0) + (o.take || 0);
  const sw = clamp(u / 15, .45, 2.4) * (o.swMul || (o.emoji ? 1.5 : 1)), boil = o.emoji ? 1.8 : 1, J = u * .07 * boil;
  const tones = boltCols(o), zap = o.zap ?? ZAP[o.mood] ?? .15;

  rs('shadow');
  if (!o.noShadow && !o.emoji) {
    const f = 1 - Math.min(.5, Math.abs(lift) * .05);
    paint(ellPts(x + BODY_CX * u, y + u * .15, u * 4.6 * f, u * .85 * f, 22), { fill: PAL.ink, fillOp: 75, bleed: .25, tex: .3, border: .1, ink: null });
  }

  push();
  translate(x, y + lift * u);
  if (o.rot) rotate(o.rot);
  scale((o.flip ? -1 : 1) * (o.sx ?? 1) * (1 + sq * .6), (o.sy ?? 1) * (1 - sq));
  if (o.wind > .02) windArcs(u, sw, o.wind, cycles(2));
  const turn = o.turnX ?? 1, facing = turn > .2;
  if (turn !== 1) { translate(BODY_CX * u, 0); scale(turn, 1); translate(-BODY_CX * u, 0); }

  rs('body');
  const base = BOLT.map(([px, py]) => [px + jit(.07 * boil), py + jit(.07 * boil)]);
  const body = scalePts(roundedPts(base, BOLT_R), u), off = SHADOW * u;
  const moved = (dx, dy) => body.map(([px, py]) => [px + dx, py + dy]);
  paint(moved(-off, off), { wash: tones.blue.col, washOp: 255, ink: null });
  paint(moved(off, -off), { wash: tones.purple.col, washOp: 255, ink: null });
  paint(body, { wash: tones.white.col, washOp: 255, ink: null });
  // Unflushed washes bleed through the next fill into the notches.
  flushBrush();

  const inner = scalePts(roundedPts(insetPts(base, .5), BOLT_R.map(r => r * .6)), u);
  const lowerEdge = scalePts([base[4], base[3]], u), inward = [.68 * 1.3 * u, -.73 * 1.3 * u];
  const shade = clipHalf(inner, ...shiftLine(lowerEdge, inward));
  if (shade.length > 2) paint(shade, { fill: tones.white.dk, fillOp: 100, bleed: .03, tex: .6, border: .3, ink: null });
  if (o.fright) boltFright(u, body, o.fright);
  paint(body, { ink: PAL.ink, sw });

  rs('tip');
  if (!o.noSpark && hover > .3) {
    const k = SMOOTH ? .9 + .15 * Math.sin(cycles(2) * TAU) : .7 + .5 * random(), a = SMOOTH ? .15 * Math.sin(cycles(1) * TAU) : random() * .6 - .3;
    paint(starPts(.15 * u, .9 * u, u * 1.05 * k, .34, 4, a), { wash: QWIK.spark, ink: PAL.ink, sw: sw * .5 });
  }
  if (o.gloom > .02 && facing) boltGloom(u, sw, body, o.gloom);
  if (facing) {
    push(); translate(FACE.x * u, (FACE.y + 6) * u);
    const spread = FACE_SPREAD * u, [mouthW, mouthH] = o.mouthSize ?? MOUTH_SIZE;
    if (o.blush) drawShifted(spread, () => blush(u, sw, { sides: [-1, 1], bx: EYE_X - .2 }, o.blush === true ? 1 : o.blush));
    if (o.sob != null) sobFace(u, sw, o.sob, cycles(1.5));
    else { rs('eyes'); eyes(u, { ...o, eyeFit }, sw, [-1, 1], 0); }
    if (o.brows) brows(u, sw, o.brows);
    rs('mouth');
    drawShifted((o.mouthDy || 0) * u + spread, () =>
      drawScaled(mouthW, mouthH, () => mouth(u, o.mouth ?? (o.lid > .1 ? 'wail' : null), sw, o.mouthK ?? 1), [0, -4.9 * u]));
    if (o.mustache) drawShifted(spread + .2 * u, () => drawScaled(.8, 1, () => mustache(u, sw)));
    if (o.shades) shades(u, sw, o.shades);
    for (const h of o.hands || []) hand(u, sw, h, tones.white.col);
    for (const h of o.thumbs || []) thumbUp(u, sw, h, tones.white.col);
    if (o.lasers) laserEyes(u, o.lasers, o.laserFlick ?? 0);
    pop();
  }
  rs('hat');
  if (o.hat) { push(); translate(base[1][0] * u, base[1][1] * u); rotate(-.47); scale(.75); translate(0, 12.8 * u); hat(u, o.hat, sw / .75); pop(); }
  rs('draw'); if (o.draw) o.draw(u, sw);

  rs('zap');
  if (!o.noSpark) {
    const pull = o.emoji ? .8 : 1;
    const spots = [[1.8, -15.2, .5], [-10.6, -13.4, -.6], [3.6, -5.6, .9], [-9.6, -3.4, 2.6], [2.6, -1.4, 1.1], [-3.2, -18.4, -.3]]
      .map(([sx, sy, a]) => [BODY_CX + (sx - BODY_CX) * pull, BODY_CY + (sy - BODY_CY) * pull, a]);
    spots.forEach(([sx, sy, a], i) => {
      if (!SMOOTH) {
        if (random() < zap * .55) spark(sx * u + jit(.4 * u), sy * u + jit(.4 * u), u * (1 + .5 * random()) * (o.emoji ? 1.3 : 1), a + jit(.3), sw);
        return;
      }
      if (hash(i * 3.7 + 2) >= zap) return;
      const k = Math.sin((cycles(1) + hash(i)) * TAU);
      if (k > .05) spark(sx * u, sy * u, u * (.55 + .6 * k) * (o.emoji ? 1.3 : 1), a + .15 * Math.sin((cycles(1) + i / 6) * TAU), sw);
    });
  }
  pop();

  rs('emote');
  if (o.emote) {
    const top = EMOTE_TOP.includes(o.emote), dir = o.flip ? -1 : 1;
    const [atX, atY] = o.emoteAt ?? [0, 0], [sizeX, sizeY] = o.emoteSize ?? [1, 1];
    const ex = x + dir * ((top ? -5.6 : 2.4) + atX) * u, ey = y + lift * u + ((top ? -18.9 : -13.6) * (1 - sq) + atY) * u;
    drawScaled(sizeX, sizeY, () => drawEachScaled(o.emotePartSize ?? 1, () => emote(o.emote, ex, ey, u * .9, o.emoteK ?? 1, o.emoteAge ?? T)));
  }
  rs('after');
}

function windArcs(u, sw, k, phase) {
  for (const side of [-1, 1]) for (let j = 0; j < 2; j++) {
    if (k < .1 + .3 * j) continue;
    const rx = 6.1 + 1.4 * j, ry = 7.8 - 1.3 * j, reach = (.3 + .55 * k) * (1 - .2 * j), drift = .3 * Math.sin((phase + j / 2 + (side > 0 ? .25 : 0)) * TAU);
    const pts = [];
    for (let n = 0; n <= 12; n++) { const a = drift - reach + 2 * reach * n / 12; pts.push([(BODY_CX + side * rx * Math.cos(a)) * u, (BODY_CY + ry * Math.sin(a)) * u]); }
    inkLine(pts, sw * (.6 + .5 * k) * (1 - .25 * j), side < 0 ? QWIK.blue : QWIK.purple, 'ink', .5);
  }
}

function laserEyes(u, k, flick) {
  const P = pts => pts.map(([a, b]) => [a * u, b * u]), w = k * (1 + .2 * flick);
  for (const s of [-1, 1]) {
    const eye = [s * EYE_X, -6], far = [s * 24, 2.5], mid = [lerp(eye[0], far[0], .5), lerp(eye[1], far[1], .5)];
    paint(ribbon(P([eye, mid, far]), .9 * w * u, 3.4 * w * u), { wash: '#FF2A3D', ink: null });
    paint(ribbon(P([eye, mid, far]), .32 * w * u, 1.3 * w * u), { wash: '#FFE4E7', ink: null });
    paint(starPts(eye[0] * u, eye[1] * u, 2.3 * w * u, .24, 4, .35 + .35 * flick), { wash: '#FF2A3D', ink: null });
    paint(starPts(eye[0] * u, eye[1] * u, 1.35 * w * u, .3, 4, .35 + .35 * flick), { wash: '#FFF3F4', ink: null });
  }
}

function shades(u, sw, { dy = 0, rot = 0 } = {}) {
  const P = pts => pts.map(([a, b]) => [a * u, b * u]);
  const lens = cx => P([[cx - 1.4, -7.1], [cx + 1.4, -7.1], [cx + 1.3, -6.2], [cx + .8, -5.35], [cx, -5.2], [cx - .8, -5.35], [cx - 1.3, -6.2]]);
  push(); translate(0, (dy - 6.2) * u); rotate(rot); translate(0, 6.2 * u);
  for (const s of [-1, 1]) inkLine(P([[s * 3.9, -6.85], [s * 5, -6.95]]), sw * .8, PAL.ink, 'ink', 0);
  inkLine(P([[-1.15, -6.75], [0, -7.05], [1.15, -6.75]]), sw * .8, PAL.ink, 'ink', .5);
  for (const s of [-1, 1]) {
    const cx = s * 2.5;
    paint(lens(cx), { wash: '#2A2740', ink: PAL.ink, sw: sw * .9, curv: .3 });
    inkLine(P([[cx - .85, -6.35], [cx - .25, -6.85]]), sw * .45, PAL.cream, 'inkfine', 0);
    inkLine(P([[cx - .45, -5.85], [cx - .05, -6.2]]), sw * .3, PAL.cream, 'inkfine', 0);
  }
  pop();
}

function hand(u, sw, { x, y, rot = 0, side = 1, k = 1 }, col) {
  if (k < .03) return;
  push(); translate(x * u, y * u); rotate(rot); scale(side * k, k);
  paint(ellPts(-.5 * u, -.62 * u, .32 * u, .46 * u, 12, 0, -.45), { wash: col, ink: PAL.ink, sw: sw * .7 });
  paint(ellPts(0, 0, .95 * u, .78 * u, 18), { wash: col, ink: PAL.ink, sw: sw * .75 });
  for (const fy of [-.2, .22]) inkLine([[.3 * u, fy * u], [.82 * u, fy * u]], sw * .4, PAL.ink, 'inkfine', 0);
  pop();
}

function mustache(u, sw) {
  const P = pts => pts.map(([a, b]) => [a * u, b * u]);
  paint(P([[-2.5, -4.3], [-2.05, -4.85], [-1.15, -5.22], [0, -5.02], [1.15, -5.22], [2.05, -4.85], [2.5, -4.3], [1.95, -4.5], [.95, -4.58], [0, -4.5], [-.95, -4.58], [-1.95, -4.5]]),
    { wash: '#2B1E1B', ink: PAL.ink, sw: sw * .6, curv: .4 });
}

function brows(u, sw, k = 1) {
  if (k === 'up') {
    for (const s of [-1, 1]) inkLine([[s * 2.35 * u, -7.45 * u], [s * 1.7 * u, -7.95 * u], [s * u, -7.6 * u]], sw * 1.3, PAL.ink, 'ink', .6);
    return;
  }
  for (const s of [-1, 1]) inkLine([[s * 2.35 * u, -7.35 * u], [s * 1.65 * u, (-7.05 + .1 * k) * u], [s * .85 * u, (-6.7 + .25 * k) * u]], sw * 1.5, PAL.ink, 'ink', .4);
}

function thumbUp(u, sw, { x, y, rot = 0, side = 1, k = 1, arm = 0 }, col) {
  if (k < .03) return;
  push(); translate(x * u, y * u); rotate(rot); scale(-side * k, k);
  if (arm) paint(rrPts(-.8 * u, .3 * u, 1.65 * u, arm * u, .6 * u), { wash: col, ink: PAL.ink, sw: sw * .85 });
  paint(rrPts(-1.2 * u, -2.75 * u, .85 * u, 2.2 * u, .42 * u), { wash: col, ink: PAL.ink, sw: sw * .8 });
  paint(rrPts(-1.15 * u, -.95 * u, 2.3 * u, 1.95 * u, .55 * u), { wash: col, ink: PAL.ink, sw: sw * .85 });
  for (const fy of [-.35, .15, .62]) inkLine([[-.05 * u, fy * u], [.55 * u, (fy - .04) * u], [1.05 * u, fy * u]], sw * .45, PAL.ink, 'inkfine', .5);
  inkLine([[-.78 * u, -.55 * u], [-.35 * u, -.2 * u]], sw * .45, PAL.ink, 'inkfine', .5);
  pop();
}

function sobFace(u, sw, sob, flow) {
  const P = pts => pts.map(([a, b]) => [a * u, b * u]);
  const along = (path, f) => { const i = Math.min(path.length - 2, Math.floor(f * (path.length - 1))), k = f * (path.length - 1) - i; return [lerp(path[i][0], path[i + 1][0], k), lerp(path[i][1], path[i + 1][1], k)]; };
  for (const s of [-1, 1]) {
    const path = [[s * 3, -5.45], [s * 3.15, -4.3], [s * 3.4, -3.05], [s * 3.75, -1.8], [s * 4.2, -.55], [s * 4.7, .7]];
    paint(ribbon(P(path), 1.3 * u, 2.4 * u), { wash: PAL.sky, ink: PAL.ink, sw: sw * .45 });
    for (let j = 0; j < 3; j++) {
      const p = along(path, frac(flow + j / 3));
      paint(ellPts(p[0] * u, p[1] * u, .3 * u, .7 * u, 10, 0, s * -.2), { wash: '#FFFFFF', washOp: 230, ink: null });
    }
    const end = path[path.length - 1];
    for (let j = 0; j < 2; j++) {
      const f = frac(flow + j / 2), q = arcPt(end, [end[0] + s * 2, end[1] + 1.7], 1, f), r = .42 * (1 - .45 * f);
      paint(ellPts(q[0] * u, q[1] * u, r * u, r * 1.3 * u, 10), { wash: PAL.sky, ink: PAL.ink, sw: sw * .35 });
    }
    const half = .95 * EYE_FIT.cry.w;
    inkLine(P([[s * EYE_X - half, -5.75], [s * EYE_X, -6.3 + .12 * sob], [s * EYE_X + half, -5.75]]), sw * 1.35, PAL.ink, 'ink', .5);
  }
}

function boltFright(u, body, k) {
  const above = y => clipHalf(body, [-20 * u, y * u], [20 * u, y * u]), solid = above(-10.6);
  if (solid.length > 2) paint(solid, { wash: QWIK.fright, washOp: 255 * k, ink: null });
  for (let i = 0; i < 12; i++) {
    const band = above(lerp(-10.6, -9.5, i / 11));
    if (band.length > 2) paint(band, { wash: QWIK.fright, washOp: 50 * k, ink: null });
  }
}
function boltGloom(u, sw, body, g) {
  const brow = (FACE.y - 1.5) * u, top = clipHalf(body, [-20 * u, brow], [20 * u, brow]);
  if (top.length > 2) paint(top, { fill: PAL.indigo, fillOp: 150 * g, bleed: .08, tex: .5, border: .6, ink: null });
  for (let i = 0; i < 4; i++) {
    const gx = lerp(-6.1, -3.2, i / 3) * u, gy = -11.8 * u;
    inkLine([[gx, gy], [gx + jit(u * .05), gy + 2.2 * g * (.7 + .3 * hash(i)) * u]], sw * .45, PAL.ink, 'inkfine', 0);
  }
}

const boltFeel = (name, t, over = {}) => ({ ...feel(name, t), mood: name, ...over });

function boltEmotions(t, keys, o = {}) {
  const cur = emotions(t, keys, o);
  let i = 0; while (i + 1 < keys.length && t >= keys[i + 1][0]) i++;
  cur.mood = keys[i][1];
  const age = t - keys[i][0];
  delete cur.col; delete cur.dk; delete cur.lt;
  if (i > 0 && age < .5) {
    cur.tintFrom = feel(keys[i - 1][1], t, keys[i - 1][2]); cur.tintTo = feel(keys[i][1], t, keys[i][2]);
    cur.tintMix = ease(seg(age, 0, .3));
  }
  return cur;
}
