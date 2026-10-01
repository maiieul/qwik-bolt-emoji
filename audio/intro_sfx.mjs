import { SR, TAU, clamp, lerp, cosRamp, easeOut, track, multiply, mixStereo, resample } from './dsp.mjs';
import { EFFECTS, len, decay, band, tone, modal, ping, wobble, mix, solo, pop, microClicks, squish, zip } from './sfx.mjs';

const keyThock = (rng, hz, size) => mix(
  [modal(0.09, [[hz, 1, 0.035 * size], [hz * 2.31, 0.45, 0.018 * size], [hz * 4.13, 0.15, 0.009]])],
  [band(0.006, rng, 3400 + 800 * rng(), 1.4, decay(0.006, 0.0012)), 0, 0.6],
  [tone(0.06, 140 + 40 * rng(), [1, 0.3], decay(0.06, 0.012 * size, 0.001)), 0, 0.35],
);

const fingertip = (rng, hz) => mix(
  [modal(0.08, [[hz, 1, 0.05], [hz * 2.7, 0.35, 0.02]])],
  [band(0.012, rng, 1700, 1, decay(0.012, 0.002)), 0, 0.5],
);

export const INTRO_EFFECTS = {
  ...EFFECTS,
  handGlide: {
    dur: 0.6, level: 'small', send: 0.12,
    render: ({ rng }) => {
      const env = [[0, 0], [0.12, 0.5], [0.3, 1], [0.55, 0]];
      return solo(0.6, mix(
        [band(0.6, rng, [[0, 600], [0.3, 1500], [0.55, 800]], 0.9, env)],
        [band(0.6, rng, 450, 0.7, env, 'lp'), 0, 0.35],
      ), [[0, 0.75], [0.55, 0.2]]);
    },
  },
  barGlow: {
    dur: 0.6, level: 'tiny', send: 0.25,
    render: ({ rng, tones }) => {
      const [low, high] = tones(1400, 3000);
      return solo(0.6, mix(
        [ping(low, 0.5, 0.35, 0.08), 0.02, 0.6],
        [ping(high, 0.5, 0.35, 0.08), 0.07, 0.45],
        [band(0.3, rng, [[0, 2200], [0.3, 3200]], 1.2, [[0, 0], [0.1, 0.25], [0.3, 0]])],
      ), 0.1);
    },
  },
  keyClack: {
    dur: 0.12, level: 'small', send: 0.05,
    render: ({ rng }) => solo(0.12, mix(
      [keyThock(rng, 360 + 180 * rng(), 1)],
      [band(0.004, rng, 2600, 1.5, decay(0.004, 0.001)), 0.05 + 0.02 * rng(), 0.22],
    ), 0.1 + 0.16 * (rng() - 0.5)),
  },
  enterKey: {
    dur: 0.45, level: 'medium', send: 0.1,
    render: ({ rng, snap }) => solo(0.45, mix(
      [keyThock(rng, 230, 2)],
      [microClicks(0.06, rng, 4, 2400, 0.004, 0.035, 0.3)],
      [band(0.14, rng, [[0, 1200], [0.12, 3200]], 1, [[0, 0], [0.03, 0.5], [0.13, 0]]), 0.015, 0.4],
      [pop(snap(660), rng, 0.8), 0.02, 0.45],
    ), 0.08),
  },
  spinnerTick: {
    dur: 0.05, level: 'tiny', send: 0.12,
    render: ({ rng, k }) => {
      const hz = k % 2 ? 2200 : 2600;
      return solo(0.05, mix([modal(0.05, [[hz, 1, 0.015], [hz * 1.48, 0.3, 0.008]], 0.0015)], [band(0.003, rng, 4200, 2, decay(0.003, 0.0008)), 0, 0.15]), -0.15);
    },
  },
  slipPop: {
    dur: 0.35, level: 'medium', send: 0.12,
    render: ({ rng, snap }) => solo(0.35, mix(
      [pop(snap(780), rng, 0.9)],
      [microClicks(0.3, rng, 5, 2800, 0.01, 0.12, 0.35)],
      [band(0.12, rng, [[0, 1500], [0.1, 2600]], 1, [[0, 0], [0.02, 0.4], [0.11, 0]]), 0, 0.5],
    ), 0),
  },
  slipFlutter: {
    dur: 0.5, level: 'small', send: 0.12,
    render: ({ rng }) => {
      const n = len(0.5), level = wobble(0.5, rng, 20);
      const flaps = track(n, t => (0.5 + 0.5 * Math.sin(TAU * (14 * t - 5 * t * t))) ** 3);
      const x = band(0.5, rng, [[0, 2600], [0.5, 1700]], 1.1, [[0, 0], [0.04, 1], [0.38, 0.7], [0.5, 0]]);
      for (let i = 0; i < n; i++) x[i] *= flaps[i] * (0.7 + 0.3 * level[i]);
      return solo(0.5, x, [[0, 0], [0.5, -0.4]]);
    },
  },
  shellTap: {
    dur: 0.2, level: 'tiny', send: 0.12,
    render: ({ rng, snap }) => solo(0.2, mix(
      [modal(0.2, [[snap(620), 1, 0.12], [1490, 0.3, 0.05]])],
      [band(0.03, rng, 1400, 0.8, decay(0.03, 0.006)), 0, 0.4],
    ), 0),
  },
  snailWake: {
    dur: 0.2, level: 'small', send: 0.12,
    render: () => {
      const stalk = reach => tone(0.08, t => lerp(420, 980 * reach, easeOut(t / 0.06)), [1, 0.25], decay(0.08, 0.03, 0.003));
      return solo(0.2, mix([stalk(1)], [stalk(1.12), 0.09, 0.9]), 0);
    },
  },
  snailYawn: {
    dur: 0.42, level: 'small', send: 0.12,
    render: context => {
      const yawn = EFFECTS.yawn.render(context);
      const voice = resample(Float32Array.from(yawn.L, (v, i) => v + yawn.R[i]), 1.35).subarray(0, len(0.42));
      return solo(0.42, multiply(voice, track(voice.length, t => cosRamp((0.42 - t) / 0.12))), 0);
    },
  },
  snailTurn: {
    dur: 0.45, level: 'tiny', send: 0.1,
    render: ({ rng }) => solo(0.45, mix(
      [tone(0.07, t => 170 + 60 * Math.exp(-t / 0.02), [1, 0.3], decay(0.07, 0.02, 0.002)), 0, 0.5],
      [band(0.1, rng, [[0, 900], [0.1, 2000]], 1, [[0, 0], [0.05, 1], [0.1, 0]]), 0, 0.6],
      [band(0.4, rng, [[0, 1400], [0.4, 500]], 0.7, decay(0.4, 0.09, 0.02), 'lp'), 0.04, 0.8],
    ), 0.05),
  },
  snailScoot: {
    dur: 0.36, level: 'small', send: 0.08,
    render: ({ rng }) => solo(0.36, resample(squish(rng), 2), -0.05),
  },
  crawlSquish: {
    dur: 0.7, anchor: 0.2, level: 'tiny', send: 0.08,
    render: ({ rng }) => solo(0.7, squish(rng), -0.1),
  },
  fingerDrum: {
    dur: 0.25, anchor: 0.16, level: 'small', send: 0.08,
    render: ({ rng }) => solo(0.25, mix(
      [fingertip(rng, 250 + 20 * rng()), 0, 0.55],
      [fingertip(rng, 272 + 20 * rng()), 0.08, 0.7],
      [fingertip(rng, 294 + 20 * rng()), 0.16, 1],
      [tone(0.08, t => 110 + 40 * Math.exp(-t / 0.015), [1, 0.2], decay(0.08, 0.025, 0.002)), 0.16, 0.35],
    ), 0.65),
  },
  clockTick: {
    dur: 0.2, level: 'small', send: 0.15, duck: 0,
    render: ({ rng, k, snap }) => {
      const hz = snap(k % 2 ? 784 : 1175);
      return solo(0.2, mix([modal(0.2, [[hz, 1, 0.1], [hz * 2.41, 0.35, 0.04], [hz * 4.9, 0.12, 0.015], [hz / 2.9, 0.5, 0.06]])], [band(0.006, rng, 3000, 1.2, decay(0.006, 0.0012)), 0, 0.4]), -0.5);
    },
  },
  snailDash: {
    dur: 0.45, level: 'small', send: 0.06,
    render: ({ rng }) => {
      const env = [[0, 0], [0.08, 0.3], [0.21, 1], [0.32, 0.35], [0.42, 0]];
      return solo(0.45, mix(
        [band(0.45, rng, [[0, 450], [0.21, 1600], [0.42, 700]], 0.9, env)],
        [band(0.45, rng, [[0, 220], [0.21, 800], [0.42, 350]], 0.7, env), 0, 0.5],
      ), [[0, 0.3], [0.45, -0.35]]);
    },
  },
  portholeSqueeze: {
    dur: 0.36, level: 'medium', send: 0.1,
    render: ({ rng }) => {
      const s = 0.35, stuck = 0.16, n = len(s), slip = wobble(s, rng, 25), env = [[0, 0], [0.04, 0.5], [stuck, 0.75], [0.31, 1], [s, 0]];
      const wiggle = t => Math.sin(60 * (t - stuck)) * clamp((t - stuck) / 0.04);
      const squeak = tone(s, t => lerp(650, 1050, (t / s) ** 1.5) * (1 + 0.05 * wiggle(t)), [1, 0.45, 0.2, 0.1], env);
      for (let i = 0; i < n; i++) squeak[i] *= (0.5 + 0.5 * Math.sin(TAU * 36 * i / SR + 3 * slip[i])) ** 2;
      const body = band(s, rng, t => 450 + 120 * wiggle(t), 3, env);
      const glorp = at => {
        const hz = 150 + 80 * rng();
        return [tone(0.07, t => hz * (1 + 0.4 * clamp(t / 0.035)), [1], decay(0.07, 0.02, 0.003)), at, 0.3];
      };
      return solo(0.36, mix([squeak, 0, 0.55], [body], glorp(0.03), glorp(stuck)), -0.33);
    },
  },
  portholePop: {
    dur: 0.55, level: 'medium', send: 0.15,
    render: ({ rng, snap }) => {
      const out = solo(0.55, mix(
        [pop(snap(520), rng, 1.3)],
        [band(0.3, rng, 280, 0.7, decay(0.3, 0.07, 0.002), 'lp'), 0, 0.5],
        [ping(snap(1560), 0.35, 0.25, 0.05), 0.04, 0.15],
        [band(0.55, rng, [[0, 1000], [0.5, 300]], 0.8, decay(0.55, 0.15, 0.01), 'lp'), 0, 0.35],
      ), -0.35);
      return mixStereo(out, solo(0.24, zip(0.24, 1100, 380, rng), [[0, -0.4], [0.2, -0.95]]), len(0.02), 0.35);
    },
  },
  pushIn: {
    dur: 1.45, level: 'medium', send: 0.06, duck: 0.25,
    render: ({ rng }) => {
      const env = [[0, 0], [0.25, 0.45], [0.5, 0.8], [0.79, 1], [1.05, 0.7], [1.25, 0.3], [1.42, 0]];
      const side = () => mix([band(1.45, rng, [[0, 350], [0.79, 1400], [1.42, 800]], 0.8, env)], [band(1.45, rng, 380, 0.7, env, 'lp'), 0, 0.3]);
      return { L: side(), R: side() };
    },
  },
  paperFade: {
    dur: 0.5, level: 'tiny', send: 0.2,
    render: ({ rng }) => {
      const sheet = () => mix(
        [band(0.5, rng, [[0, 1500], [0.45, 2600]], 0.8, [[0, 0], [0.15, 0.7], [0.3, 0.6], [0.48, 0]])],
        [microClicks(0.5, rng, 2, 3000, 0.1, 0.3, 0.25)],
      );
      return { L: sheet(), R: sheet() };
    },
  },
};
