import { SR, TAU, clamp, lerp, easeOut, track, svf, resample } from './dsp.mjs';
import { EFFECTS, len, decay, band, tone, modal, ping, wobble, mix, solo, pop, microClicks, squish } from './sfx.mjs';

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
    ), -0.3),
  },
  snailWake: {
    dur: 0.5, level: 'small', send: 0.12,
    render: ({ rng }) => {
      const stalk = reach => tone(0.08, t => lerp(420, 980 * reach, easeOut(t / 0.06)), [1, 0.25], decay(0.08, 0.03, 0.003));
      const hum = svf(tone(0.24, t => lerp(230, 310, (t / 0.24) ** 2), [1, 0.5, 0.33, 0.25, 0.2, 0.16], [[0, 0], [0.04, 0.6], [0.17, 0.5], [0.24, 0]]), 520, 1.2, 'lp');
      return solo(0.5, mix([stalk(1)], [stalk(1.12), 0.09, 0.9], [band(0.03, rng, 900, 0.8, decay(0.03, 0.008)), 0.2, 0.15], [hum, 0.22, 0.8]), -0.25);
    },
  },
  snailYawn: {
    dur: 0.66, level: 'small', send: 0.12,
    render: context => {
      const yawn = EFFECTS.yawn.render(context);
      return { L: resample(yawn.L, 1.3), R: resample(yawn.R, 1.3) };
    },
  },
  crawlSquish: {
    dur: 0.7, level: 'tiny', send: 0.08,
    render: ({ rng, k }) => solo(0.7, squish(rng), clamp(-0.15 - 0.15 * k, -0.7, 0)),
  },
  fingerDrum: {
    dur: 0.3, anchor: 0.125, level: 'small', send: 0.08,
    render: ({ rng, k }) => {
      const fingers = k % 2 ? [[2, 0.6], [3, 1]] : [[0, 0.5], [1, 0.65], [2, 0.8], [3, 1]];
      return solo(0.3, mix(...fingers.map(([finger, gain]) => [fingertip(rng, 250 + 22 * finger + 20 * rng()), finger / 24, gain])), 0.4);
    },
  },
  clockTick: {
    dur: 0.2, level: 'small', send: 0.15, duck: 0,
    render: ({ rng, k, snap }) => {
      const hz = snap(k % 2 ? 784 : 1175);
      return solo(0.2, mix([modal(0.2, [[hz, 1, 0.1], [hz * 2.41, 0.35, 0.04], [hz * 4.9, 0.12, 0.015], [hz / 2.9, 0.5, 0.06]])], [band(0.006, rng, 3000, 1.2, decay(0.006, 0.0012)), 0, 0.4]), -0.5);
    },
  },
  portholeSqueeze: {
    dur: 0.55, level: 'medium', send: 0.1,
    render: ({ rng }) => {
      const n = len(0.5), slip = wobble(0.5, rng, 25), env = [[0, 0], [0.05, 0.5], [0.35, 0.9], [0.46, 1], [0.5, 0]];
      const squeak = tone(0.5, t => lerp(650, 1050, (t / 0.5) ** 1.5), [1, 0.45, 0.2, 0.1], env);
      for (let i = 0; i < n; i++) squeak[i] *= (0.5 + 0.5 * Math.sin(TAU * 36 * i / SR + 3 * slip[i])) ** 2;
      const body = band(0.5, rng, t => 450 + 120 * Math.sin(TAU * 7 * t), 3, env);
      const glorp = at => {
        const hz = 150 + 80 * rng();
        return [tone(0.07, t => hz * (1 + 0.4 * clamp(t / 0.035)), [1], decay(0.07, 0.02, 0.003)), at, 0.3];
      };
      return solo(0.55, mix([squeak, 0, 0.55], [body], glorp(0.12), glorp(0.31)), -0.6);
    },
  },
  portholePop: {
    dur: 0.45, level: 'medium', send: 0.15,
    render: ({ rng, snap }) => solo(0.45, mix(
      [pop(snap(520), rng, 1.3)],
      [band(0.3, rng, 280, 0.7, decay(0.3, 0.07, 0.002), 'lp'), 0, 0.5],
      [ping(snap(1560), 0.35, 0.25, 0.05), 0.04, 0.15],
    ), -0.6),
  },
  pushIn: {
    dur: 1.6, level: 'medium', send: 0.06, duck: 0.25,
    render: ({ rng }) => {
      const env = [[0, 0], [0.7, 0.3], [1.3, 0.75], [1.47, 1], [1.56, 0]];
      const side = () => mix([band(1.6, rng, [[0, 350], [1, 900], [1.5, 2100]], 0.8, env)], [band(1.6, rng, 380, 0.7, env, 'lp'), 0, 0.3]);
      return { L: side(), R: side() };
    },
  },
};
