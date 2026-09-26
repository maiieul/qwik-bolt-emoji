if (new URLSearchParams(location.search).has('clear')) {
  draw = function () {
    if (!window.ready) return;
    LETTERS = []; CAM = LAST_CAM = null;
    clear();
    push(); translate(-W / 2, -H / 2);
    BOILN = Math.floor(T * BOIL); CLAWD_N = 0; boilSeed('frame'); noiseSeed(77);
    drawWorld(T);
    pop();
  };
  // Unflushed washes paint white into gaps on a clear canvas.
  const paintWithWash = paint, noFill = new URLSearchParams(location.search).has('nofill');
  paint = function (pts, o = {}) {
    if (!o.fill) return paintWithWash(pts, o);
    flushBrush();
    if (o.wash || o.hatch) { paintWithWash(pts, { ...o, fill: undefined, ink: null }); flushBrush(); }
    if (!noFill) { paintWithWash(pts, { ...o, wash: undefined, hatch: undefined, ink: null }); flushBrush(); }
    if (o.ink !== null) paintWithWash(pts, { ink: o.ink, sw: o.sw, br: o.br, curv: o.curv });
  };
  composite = function () {
    outX.clearRect(0, 0, W, H);
    outX.globalCompositeOperation = 'source-over'; outX.globalAlpha = 1;
    outX.drawImage(drawingContext.canvas, 0, 0, W, H);
    drawLetters(outX);
  };
}

(() => {
  SMOOTH = true;
  const CX = 960, CY = 540, S = 768, U = 32;
  window.EMOJI_BOX = [CX - S / 2, CY - S / 2, S, S];
  if (new URLSearchParams(location.search).has('clear')) glow = () => {};
  function emoji(t, len, name, over = {}, { k = 1, lift = -.5, scale = 1.2, body } = {}) {
    const T0 = T; T = t * k;
    try {
      const u = U * scale, o = boltFeel(name, t, { emoteAge: t * k, clock: t, loopLen: len, ...over });
      if (body) Object.assign(o, body(t));
      bolt(CX, CY + (lift - BODY_CY + (o.hover ?? 1.4)) * u, u, { emoji: true, ...o });
    } finally { T = T0; }
  }
  const cycles = (t, len, perSecond) => t * Math.max(1, Math.round(perSecond * len)) / len;
  const wave = (t, len, perSecond, phase = 0) => Math.sin((cycles(t, len, perSecond) + phase) * TAU);
  const NO_BLINK = .1176;

  const E = {
    happy: [2, .5, t => emoji(t, 2, 'happy', {}, { scale: 1.17, lift: 0 })],
    love: [2, .08, t => {
      const p = frac(t), thump = (at, w) => Math.exp(-(((p - at) / w) ** 2)), beat = thump(.08, .05) + .6 * thump(.28, .05);
      emoji(t, 2, 'love', { heartScale: 1 + .32 * beat, emoteAt: [0, 1.5] }, { k: 1 / 1.1, lift: -.59, body: t => {
        const bp = bpOf(t);
        return { dy: -.12 * Math.abs(Math.sin(Math.PI * bp)), rot: .035 * Math.sin(Math.PI * bp / 2), dx: 0, sq: 0 };
      } });
    }],
    dance: [2.4, .2, t => {
      const jump = wave(t, 2.4, 1.25), landing = Math.exp(-frac(cycles(t, 2.4, 2.5)) * 6);
      emoji(t, 2.4, 'excited', { hat: 'party', emote: null, mouth: 'laugh' },
        { scale: 1.02, lift: 1.46, body: () => ({ dy: -2.4 * Math.abs(jump), sq: .16 * landing - .06 * Math.abs(jump), rot: -.13 * jump, dx: 0 }) });
    }],
    think: [2, .8, t => emoji(t, 2, 'thinking', { seed: 1.306, lookX: .25, emoteAt: [-.4, 1.5], emoteSize: [1.4, 1.4] }, { k: .9 })],
    sad: [2, .5, t => emoji(t, 2, 'sad', { emoteAt: [1.88, 0], emoteSize: [2.2, 1.1] }, { k: 5 / 3, scale: 1.05, lift: .92, body: t => ({ sq: .08 + .02 * wave(t, 2, .5), rot: .03 * wave(t, 2, .5) }) })],
    rage: [2, .1, t => {
      const strength = .7 + .3 * wave(t, 2, .5) ** 2, shake = wave(t, 2, 3);
      emoji(t, 2, 'angry', { eyes: 'angry', mouth: 'scowl', brows: 1, tintK: 2, emote: 'anger', emoteK: 1 },
        { scale: 1.18, body: () => ({ rot: .085 * strength * shake, dx: .3 * strength * wave(t, 2, 3, .1), dy: 0, sq: .02 * strength, lookX: 0 }) });
    }],
    cool: [2, .5, t => emoji(t, 2, 'cool', {}, {
      k: .4 * Math.PI,
      body: t => { const bp = bpOf(t); return { dy: -.18 * Math.abs(Math.sin(Math.PI * bp)), rot: .03 * Math.sin(Math.PI * bp / 2), dx: 0, sq: .025 * pulse(t, 7) }; },
    })],
    sleepy: [2.4, .6, t => emoji(t, 2.4, 'sleepy', { hover: .5, emoteAt: [-2, 1.5], emoteSize: [1.4, 1.4] }, { k: 1 / .96, lift: -.8, body: t => ({ sq: .05 + .05 * wave(t, 2.4, 1 / 2.4), rot: .05 * wave(t, 2.4, 1 / 2.4, .16) }) })],
    cry: [2, .1, t => {
      const f = frac(cycles(t, 2, 1.5)), sob = f < .12 ? ease(f / .12) : 1 - ease((f - .12) / .88);
      emoji(t, 2, 'cry', { sob, mouth: 'sob', mouthK: .2 + .8 * sob, mouthSize: [1.45, 1.2], mouthDy: -1 }, { lift: -.8, body: () => ({ dy: 0, dx: 0, sq: .045 * sob, rot: .012 * wave(t, 2, 6) }) });
    }],
    wink: [3, 1.4, t => {
      const shut = ease(seg(t, .8, 1.2)) * (1 - ease(seg(t, 1.95, 2.35)));
      const out = t < 1.95 ? backOut(seg(t, .7, 1.1)) : 1 - ease(seg(t, 1.95, 2.4));
      const lean = -.2 * Math.sin(Math.PI * seg(t, .55, .7)), settle = .3 * spring(t, 2.4, 7, 15);
      emoji(t, 3, 'happy', { eyes: 'normal', squint: [0, shut], mouth: shut > .5 ? 'smirk' : 'smile', blush: .35, seed: NO_BLINK, zap: .2,
        emote: 'spark', emoteK: seg(t, 1.05, 1.3) * (1 - seg(t, 2, 2.25)) },
        { scale: 1.13, lift: 0, body: () => ({ dx: 1.15 * out + lean - settle, dy: -.2 * out, sq: -.03 * out, rot: .13 * out - .06 * settle }) });
    }],
    laser: [2, .3, t => {
      const f = Math.floor(t * 25 + 1e-6), jolt = n => hash(f * 1.73 + n * 7.1) * 2 - 1;
      emoji(t, 2, 'furious', { eyes: 'red', mouth: 'smirk', brows: 1, lid: 0, emote: null, tintK: .6, lasers: 1, laserFlick: f % 2, zap: 1 },
        { scale: 1.13, lift: -.4, body: () => ({ dx: .65 * jolt(1), dy: .45 * jolt(2), rot: .05 * jolt(3), sq: 0 }) });
    }],
    thumbsup: [2, .08, t => {
      const lift = phase => {
        const p = frac(cycles(t, 2, 2.5) + phase);
        return p < .22 ? 1 : p < .45 ? 1 - ease((p - .22) / .23) : p < .72 ? 0 : ease((p - .72) / .28);
      };
      const sway = .45 * (lift(.5) - lift(0));
      const thumbs = [1, -1].map((side, i) => ({ x: side * 5.8 - sway, y: lerp(1.6, -6.1, lift(i / 2)), rot: side * -.05, side, k: 1.7 }));
      emoji(t, 2, 'happy', { eyes: 'normal', mouth: 'beam', mouthDy: .5, mouthSize: [.9, 1], mustache: true, brows: 'up', blush: .3, thumbs, seed: NO_BLINK, zap: 0 },
        { lift: -.8, body: () => ({ dy: 0, dx: sway, rot: 0, sq: 0 }) });
    }],
    ko: [2, .5, t => emoji(t, 2, 'ko', {}, { k: .4 * Math.PI, lift: -1.4, body: t => ({ sq: .28 + .02 * wave(t, 2, .5), rot: .12 }) })],
  };
  for (const [name, [len, , draw]] of Object.entries(E)) { LOOPS['emoji_' + name] = draw; LOOPS['emoji_' + name].len = len; }
  window.EMOJI_NAMES = Object.keys(E);
  window.EMOJI_STILL = Object.fromEntries(Object.entries(E).map(([name, [, still]]) => [name, still]));
})();
