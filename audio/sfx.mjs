import {
  SR, TAU, clamp, lerp, cosRamp, easeOut, easeIn, toSamples, whiteNoise, svf, partials, harmonics, curve, track, multiply,
  scale, addInto, fadeEdges, stereo, mixMono, onePoleLowpass, peak,
} from './dsp.mjs';

export const LEVELS = { big: -16, medium: -19, small: -24, tiny: -28 };
export const DUCK_WEIGHTS = { big: 1, medium: 1, small: 0.4, tiny: 0 };

export const len = seconds => toSamples(seconds);
const silent = seconds => new Float32Array(len(seconds));
const shape = (seconds, points) => curve(len(seconds), points);
export const decay = (seconds, tau, attack = 0.0005) => track(len(seconds), t => cosRamp(t / attack) * Math.exp(-t / tau) * cosRamp((seconds - t) / 0.005));
const series = (seconds, spec) => (typeof spec === 'number' || ArrayBuffer.isView(spec) ? spec : typeof spec === 'function' ? track(len(seconds), spec) : shape(seconds, spec));
const envOf = (seconds, spec) => (Array.isArray(spec) ? shape(seconds, spec) : spec);

export function band(seconds, rng, fc, q, envelope, mode = 'bp') {
  const shaped = svf(whiteNoise(len(seconds), rng), series(seconds, fc), q, mode);
  return multiply(svf(svf(shaped, 7000, 0.7, 'lp'), 7000, 0.7, 'lp'), envOf(seconds, envelope));
}
export function tone(seconds, freq, amps, envelope, options) {
  return multiply(partials(len(seconds), series(seconds, freq), harmonics(amps), options), envOf(seconds, envelope));
}
export function modal(seconds, modes, attack = 0.0003) {
  return fadeEdges(partials(len(seconds), 1, modes), attack, Math.min(0.02, seconds / 4));
}
export function ping(hz, seconds = 0.6, t60 = 0.45, bright = 0.15) {
  return fadeEdges(partials(len(seconds), hz, [[1, 1, t60], [2.76, bright, t60 / 3.5]]), 0.0005, 0.05);
}
export function wobble(seconds, rng, hz) {
  const x = onePoleLowpass(onePoleLowpass(whiteNoise(len(seconds), rng), hz), hz);
  return scale(x, 1 / (peak(x) || 1));
}
export function mix(...layers) {
  const out = new Float32Array(Math.max(...layers.map(([x, at = 0]) => x.length + len(at))));
  for (const [x, at = 0, gain = 1] of layers) addInto(out, x, len(at), gain);
  return out;
}
function placed(seconds, layers) {
  const out = stereo(Math.max(len(seconds), ...layers.map(([x, at = 0]) => x.length + len(at))));
  for (const [x, at = 0, gain = 1, pan = 0] of layers) mixMono(out, x, len(at), gain, Array.isArray(pan) ? shape(x.length / SR, pan) : pan);
  return out;
}
export const solo = (seconds, x, pan = 0) => placed(seconds, [[x, 0, 1, pan]]);

export function pop(hz, rng, size = 1) {
  const body = tone(0.28, t => hz * (1 + 1.6 * Math.exp(-t / 0.012)), [1, 0.25], decay(0.28, 0.05 * size));
  return fadeEdges(mix([body], [band(0.01, rng, 2500, 1.2, decay(0.01, 0.002)), 0, 0.3]), 0.0005, 0.03);
}
function slapSound(rng) {
  return mix([band(0.12, rng, 1400, 1.1, decay(0.12, 0.025, 0.0008))], [tone(0.15, 140, [1, 0.2], decay(0.15, 0.045, 0.001)), 0, 0.8]);
}
export function microClicks(seconds, rng, count, hz, from, to, amp = 0.4) {
  const out = silent(seconds);
  for (let k = 0; k < count; k++) addInto(out, band(0.004, rng, hz * (0.8 + 0.4 * rng()), 2, decay(0.004, 0.001)), len(from + (to - from) * rng()), amp * (0.5 + 0.5 * rng()));
  return out;
}
export function squish(rng) {
  const s = 0.7, body = band(s, rng, t => 700 + 200 * Math.sin(TAU * 3 * t), 3, [[0, 0], [0.2, 0.5], [0.5, 0.4], [0.7, 0]]);
  const w = wobble(s, rng, 12);
  for (let i = 0; i < body.length; i++) body[i] *= 1 + 0.5 * w[i];
  const glorp = at => [tone(0.08, t => (150 + 70 * rng()) * (1 + 0.4 * clamp(t / 0.04)), [1], decay(0.08, 0.025, 0.003)), at, 0.25];
  return mix([body], glorp(0.2), glorp(0.45));
}
function clockWhizz(seconds, rng) {
  const n = len(seconds), out = new Float32Array(n), speed = t => Math.sin(Math.PI * clamp(t / seconds)) ** 1.5;
  const tick = modal(0.012, [[2100, 1, 0.03], [3400, 0.4, 0.015]]);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    phase += (12 + 34 * speed(t)) / SR;
    if (phase >= 1) { phase -= 1; addInto(out, tick, i, 0.3 + 0.7 * speed(t)); }
  }
  const whirr = band(seconds, rng, t => 900 + 1300 * speed(t), 2, track(n, t => 0.3 * speed(t)));
  return mix([fadeEdges(out, 0.001, 0.02)], [whirr]);
}
function zip(seconds, from, to, rng) {
  const env = [[0, 0], [0.005, 0.7], [seconds * 0.6, 0.5], [seconds * 0.85, 0]];
  return mix(
    [tone(seconds, t => from * (to / from) ** clamp(t / (seconds * 0.7)), [1, 0.35, 0.12], env)],
    [band(seconds, rng, 2000, 1.2, env), 0, 0.3],
  );
}
const hop = (nominal, pan) => ({
  dur: 0.15, level: 'tiny', send: 0.12,
  render: ({ rng, snap }) => {
    const f = snap(nominal);
    return solo(0.15, mix([modal(0.15, [[f, 1, 0.22], [f * 2.4, 0.25, 0.08]])], [band(0.02, rng, 1200, 1, decay(0.02, 0.004)), 0, 0.3]), pan);
  },
});
const popEffect = nominal => ({ dur: 0.3, level: 'medium', send: 0.12, render: ({ rng, snap }) => solo(0.3, pop(snap(nominal), rng), 0.1) });

export const EFFECTS = {
  paintSwish: {
    dur: 1.3, level: 'medium', send: 0.12,
    render: ({ rng }) => {
      const stroke = band(0.85, rng, [[0, 1500], [0.8, 2600]], 0.9, [[0, 0], [0.06, 1], [0.6, 0.85], [0.84, 0]]);
      const fiber = wobble(0.85, rng, 35);
      for (let i = 0; i < stroke.length; i++) stroke[i] *= 1 + 0.25 * fiber[i];
      return placed(1.3, [
        [stroke, 0, 1, [[0, -0.5], [0.8, 0.4]]],
        [band(0.5, rng, [[0, 900], [0.45, 2200]], 0.7, [[0, 0], [0.1, 1], [0.35, 0.6], [0.5, 0]]), 0.78, 0.8],
        [band(1.25, rng, 600, 0.7, [[0, 0], [0.1, 1], [1.1, 0.6], [1.25, 0]], 'lp'), 0, 0.3],
      ]);
    },
  },
  slideIn: {
    dur: 0.35, level: 'tiny', send: 0.1,
    render: ({ rng }) => solo(0.35, band(0.35, rng, [[0, 600], [0.3, 1600]], 0.8, [[0, 0], [0.12, 1], [0.33, 0]]), [[0, -0.3], [0.35, 0]]),
  },
  boing: {
    dur: 0.75, level: 'big', send: 0.12,
    render: ({ snap }) => {
      const f0 = snap(196), s = 0.75;
      const freq = t => f0 * 2 ** (-7 * (1 - easeOut(t / 0.05)) / 12) * (1 + 0.07 * Math.exp(-t / 0.22) * Math.sin(TAU * 13 * t));
      const buzz = tone(s, freq, [1, 0.6, 0.45, 0.3, 0.2, 0.12, 0.08, 0.05], [[0, 0], [0.004, 1], [0.7, 0.3], [0.75, 0]]);
      const formant = svf(buzz, track(len(s), t => 3.5 * freq(t)), 2, 'bp');
      const x = mix([buzz, 0, 0.5], [formant, 0, 0.9]);
      return solo(s, multiply(x, track(x.length, t => Math.exp(-t / 0.3))));
    },
  },
  armUnroll: {
    dur: 0.55, level: 'small', send: 0.1,
    render: ({ rng }) => {
      const env = [[0, 0], [0.05, 0.8], [0.35, 0.6], [0.48, 0]];
      const x = mix(
        [tone(0.5, t => lerp(300, 700, easeOut(t / 0.42)) * (1 + 0.03 * Math.sin(TAU * 18 * t)), [1, 0.3, 0.1], env)],
        [band(0.5, rng, [[0, 1200], [0.45, 2400]], 1.2, env), 0, 0.4],
      );
      return placed(0.55, [[x, 0, 0.7, -0.4], [x, 0.012, 0.7, 0.4]]);
    },
  },
  armSnap: {
    dur: 0.45, anchor: 0.07, level: 'medium', send: 0.1,
    render: ({ rng }) => {
      const whip = tone(0.1, t => 1100 * (350 / 1100) ** clamp(t / 0.065), [1, 0.4, 0.15], [[0, 0], [0.06, 1], [0.07, 0.2], [0.09, 0]]);
      return placed(0.45, [[whip, 0, 0.3, 0.3], [slapSound(rng), 0.07, 1, 0.2], [whip, 0.04, 0.3, -0.3], [slapSound(rng), 0.11, 0.85, -0.2]]);
    },
  },
  scramble: {
    dur: 0.32, level: 'small', send: 0.08,
    render: ({ rng }) => {
      const taps = silent(0.32);
      for (let k = 0; k < 6; k++) addInto(taps, mix([tone(0.05, t => 260 + 90 * Math.exp(-t / 0.01), [1, 0.3], decay(0.05, 0.012, 0.001))], [band(0.02, rng, 1400, 1.2, decay(0.02, 0.005)), 0, 0.4]), len(0.02 + k * 0.045), 0.6 + 0.4 * (k / 5));
      const whirr = band(0.32, rng, [[0, 600], [0.3, 1500]], 1.2, [[0, 0], [0.05, 0.4], [0.27, 0.6], [0.32, 0]]);
      return solo(0.32, mix([taps], [whirr, 0, 0.5]), -0.45);
    },
  },
  popLow: popEffect(520),
  popMid: popEffect(700),
  popHigh: popEffect(900),
  popTop: popEffect(1100),
  unfold: {
    dur: 0.3, level: 'small', send: 0.1,
    render: ({ rng }) => solo(0.3, mix(
      [band(0.14, rng, [[0, 2200], [0.12, 3200]], 1, [[0, 0], [0.01, 1], [0.12, 0]])],
      [microClicks(0.3, rng, 6, 3500, 0.05, 0.25, 0.5)],
    ), 0.15),
  },
  underlineSwish: {
    dur: 0.4, level: 'tiny', send: 0.1,
    render: ({ rng }) => {
      const x = band(0.4, rng, [[0, 2200], [0.4, 3000]], 1, [[0, 0], [0.03, 0.6], [0.3, 0.5], [0.38, 0]]), w = wobble(0.4, rng, 30);
      for (let i = 0; i < x.length; i++) x[i] *= 1 + 0.25 * w[i];
      return solo(0.4, x, [[0, -0.3], [0.4, 0.3]]);
    },
  },
  whip: {
    dur: 0.8, level: 'big', send: 0.06,
    render: ({ rng }) => {
      const env = [[0, 0], [0.25, 0.25], [0.5, 1], [0.62, 0.6], [0.78, 0]];
      return solo(0.8, mix(
        [band(0.8, rng, [[0, 350], [0.5, 2800], [0.8, 900]], 0.85, env)],
        [band(0.8, rng, [[0, 175], [0.5, 1400], [0.8, 450]], 0.7, env), 0, 0.5],
      ), [[0, 0.7], [0.8, -0.7]]);
    },
  },
  skid: {
    dur: 0.6, level: 'medium', send: 0.08,
    render: ({ rng }) => {
      const env = [[0, 0], [0.02, 1], [0.4, 0.8], [0.55, 0]], walk = wobble(0.6, rng, 12);
      const freq = track(len(0.6), t => 1250 * (1 - 0.15 * t / 0.5)).map((f, i) => f * (1 + 0.025 * walk[i]));
      const squeal = multiply(tone(0.6, freq, [1, 0.35, 0.12], env), track(len(0.6), t => 1 + 0.35 * Math.sin(TAU * 47 * t)));
      return solo(0.6, mix(
        [squeal, 0, 0.8],
        [band(0.6, rng, 1800, 1.4, env), 0, 0.5],
        [tone(0.1, 130, [1, 0.2], decay(0.1, 0.03, 0.002)), 0.48, 0.4],
      ), [[0, 0.6], [0.5, 0.1]]);
    },
  },
  pipeRattle: {
    dur: 0.32, level: 'medium', send: 0.1,
    render: ({ rng }) => {
      const out = silent(0.32);
      for (let k = 0; k < 9; k++) {
        const f = 520 * (1 + (rng() - 0.5) * 0.06);
        addInto(out, modal(0.06, [[f, 1, 0.2], [f * 2.52, 0.5, 0.12], [f * 4.58, 0.25, 0.07]]), len(0.01 + k * 0.028 + (rng() - 0.5) * 0.012), 0.5 + 0.5 * rng());
      }
      return solo(0.32, fadeEdges(out, 0, 0.02), -0.35);
    },
  },
  tubeThunk: {
    dur: 0.45, level: 'medium', send: 0.1,
    render: ({ rng }) => solo(0.45, mix(
      [tone(0.45, t => 60 + 35 * Math.exp(-t / 0.05), [1, 0.3], decay(0.45, 0.09, 0.002))],
      [band(0.3, rng, [[0, 700], [0.25, 350]], 1, decay(0.3, 0.06, 0.001)), 0, 0.6],
      [band(0.08, rng, 1600, 1.2, decay(0.08, 0.02)), 0, 0.4],
    ), -0.35),
  },
  zipSlap: {
    dur: 0.42, anchor: 0.17, level: 'medium', send: 0.1,
    render: ({ rng }) => {
      const env = [[0, 0], [0.1, 0.6], [0.16, 0.25], [0.175, 0]];
      const whoosh = mix(
        [tone(0.18, t => lerp(500, 1500, easeIn(t / 0.16)), [1, 0.3], env)],
        [band(0.18, rng, [[0, 1500], [0.16, 3000]], 1.3, env), 0, 0.6],
      );
      const hit = mix([slapSound(rng)], [modal(0.1, [[330, 0.5, 0.25], [870, 0.3, 0.12]])]);
      return placed(0.42, [[whoosh, 0, 1, [[0, -0.3], [0.17, 0.15]]], [hit, 0.17, 1, 0.15]]);
    },
  },
  slap: {
    dur: 0.25, level: 'medium', send: 0.1,
    render: ({ rng, snap }) => solo(0.25, mix([slapSound(rng)], [modal(0.2, [[snap(1050), 0.25, 0.15]])]), -0.4),
  },
  fwoomp: {
    dur: 0.65, level: 'medium', send: 0.1,
    render: ({ rng }) => solo(0.65, mix(
      [band(0.65, rng, [[0, 2400], [0.35, 350], [0.65, 300]], 2.2, [[0, 0], [0.04, 1], [0.25, 0.6], [0.6, 0]], 'lp')],
      [tone(0.5, t => 55 + 30 * Math.exp(-t / 0.06), [1, 0.25], decay(0.5, 0.12, 0.01)), 0, 0.8],
      [tone(0.15, t => lerp(220, 520, cosRamp(t / 0.12)), [1, 0.2], [[0, 0], [0.02, 0.25], [0.12, 0.2], [0.15, 0]]), 0.3],
    ), [[0, 0.45], [0.6, 0.8]]),
  },
  snore: {
    dur: 1.05, level: 'medium', send: 0.1,
    render: ({ rng }) => {
      const inhale = 0.62, env = [[0, 0], [0.5, 1], [0.62, 0]], flutter = track(len(inhale), t => 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(TAU * 27 * t)) ** 3);
      const breath = multiply(band(inhale, rng, 330, 2.5, env), flutter);
      const voiced = multiply(svf(tone(inhale, 95, Array.from({ length: 12 }, (_, k) => 1 / (k + 1)), env), 420, 3, 'bp'), flutter);
      const exhale = mix(
        [tone(0.4, t => lerp(760, 520, t / 0.38), [1, 0.1], [[0, 0], [0.05, 0.5], [0.3, 0.4], [0.38, 0]]), 0, 0.35],
        [band(0.4, rng, 1500, 0.7, [[0, 0], [0.05, 0.3], [0.35, 0.2], [0.4, 0]]), 0, 0.3],
      );
      return solo(1.05, mix([breath, 0, 0.7], [voiced, 0, 0.6], [exhale, inhale]), -0.55);
    },
  },
  pokePop: {
    dur: 0.35, level: 'medium', send: 0.12,
    render: ({ rng }) => solo(0.35, mix(
      [tone(0.12, t => 380 + 140 * Math.exp(-t / 0.03), [1, 0.2], decay(0.12, 0.04, 0.002)), 0, 0.6],
      [tone(0.12, t => 900 * (1 + 1.5 * (1 - Math.exp(-t / 0.008))), [1], decay(0.12, 0.035)), 0.02],
      [band(0.05, rng, 3200, 1.2, decay(0.05, 0.015)), 0.02, 0.25],
    ), -0.45),
  },
  lipSmack: {
    dur: 0.5, level: 'small', send: 0.08,
    render: ({ rng }) => {
      const click = () => band(0.012, rng, 1100, 3, decay(0.012, 0.004));
      const hum = svf(tone(0.3, 130, [1, 0.25, 0.11, 0.06], [[0, 0], [0.08, 0.5], [0.25, 0.3], [0.3, 0]]), 600, 0.7, 'lp');
      return solo(0.5, mix([click()], [click(), 0.09, 0.8], [hum, 0.12], [band(0.3, rng, 900, 0.7, [[0, 0], [0.1, 0.3], [0.3, 0]], 'lp'), 0.18, 0.4]), -0.5);
    },
  },
  dive: {
    dur: 0.62, level: 'big', send: 0.1,
    render: ({ rng }) => {
      const freq = t => 1150 * (330 / 1150) ** clamp(t / 0.45), env = [[0, 0], [0.03, 0.8], [0.4, 0.7], [0.47, 0]];
      const breath = multiply(svf(whiteNoise(len(0.48), rng), track(len(0.48), freq), 4, 'bp'), shape(0.48, env));
      return solo(0.62, mix(
        [tone(0.48, freq, [1, 0.08], env)],
        [breath, 0, 0.25],
        [band(0.2, rng, [[0, 1800], [0.18, 250]], 2, [[0, 0], [0.03, 1], [0.18, 0]], 'lp'), 0.4],
        [tone(0.2, t => lerp(210, 90, clamp(t / 0.15)), [1, 0.2], decay(0.2, 0.06, 0.002)), 0.42, 0.6],
      ), [[0, 0.1], [0.55, 0.5]]);
    },
  },
  tubeTravel: {
    dur: 1.6, level: 'small', send: 0.05,
    render: ({ rng }) => {
      const x = band(1.6, rng, [[0, 900], [1.6, 1300]], 0.6, [[0, 0], [0.3, 0.6], [1.2, 0.6], [1.6, 0]]);
      return solo(1.6, multiply(x, track(x.length, t => 1 + 0.2 * Math.sin(TAU * 3 * t))), [[0, -0.6], [1.6, 0.6]]);
    },
  },
  squeeze: {
    dur: 0.5, level: 'medium', send: 0.08,
    render: ({ rng }) => {
      const body = band(0.5, rng, t => 500 + 350 * Math.sin(TAU * 9 * t) * (1 - t / 0.45), 4, [[0, 0], [0.05, 0.8], [0.38, 0.9], [0.46, 0]]);
      const bubbles = Array.from({ length: 4 }, () => {
        const f0 = 140 + 120 * rng();
        return [tone(0.06, t => f0 * (1 + 0.4 * clamp(t / 0.03)), [1], decay(0.06, 0.02, 0.002)), 0.05 + 0.35 * rng(), 0.3];
      });
      return solo(0.5, mix([body], ...bubbles), -0.15);
    },
  },
  land: {
    dur: 0.4, level: 'medium', send: 0.1,
    render: ({ rng, snap }) => {
      const f = snap(330);
      return solo(0.4, mix(
        [tone(0.25, t => 85 + 35 * Math.exp(-t / 0.03), [1, 0.2], decay(0.25, 0.06, 0.001))],
        [band(0.1, rng, 900, 0.9, decay(0.1, 0.02)), 0, 0.5],
        [tone(0.35, t => f * (1 + 0.05 * Math.exp(-t / 0.12) * Math.sin(TAU * 16 * t)), [1, 0.3, 0.15], decay(0.35, 0.12, 0.002)), 0.01, 0.35],
      ), -0.3);
    },
  },
  alarm: {
    dur: 0.72, level: 'medium', send: 0.15,
    render: ({ rng, snap }) => {
      const bells = [snap(1050), snap(1320)], out = silent(0.72);
      for (let k = 0; k / 18 < 0.64; k++) {
        const f = bells[k % 2];
        addInto(out, modal(0.12, [[f, 1, 0.3], [f * 2, 0.3, 0.17], [f * 2.9, 0.18, 0.12]]), len(k / 18), 0.6 + 0.4 * rng());
      }
      for (let k = 0; k * 0.125 < 0.6; k++) addInto(out, modal(0.04, [[620, 0.4, 0.1], [1500, 0.2, 0.05]]), len(k * 0.125 + 0.03), 0.5);
      multiply(out, shape(0.72, [[0, 0], [0.003, 1], [0.62, 1], [0.67, 0]]));
      return solo(0.72, svf(out, 5000, 0.7, 'lp'), -0.4);
    },
  },
  cough: {
    dur: 0.65, level: 'medium', send: 0.08,
    render: ({ rng }) => {
      const hack = (f0, strength) => {
        const s = 0.2, src = mix([whiteNoise(len(s), rng), 0, 0.6], [tone(s, t => f0 * (1 - 0.15 * t / s), Array.from({ length: 14 }, (_, k) => 1 / (k + 1)), [[0, 0], [0.01, 1], [0.2, 0]]), 0, 0.5]);
        const voiced = mix([svf(src, 650, 3)], [svf(src, 1150, 4), 0, 0.6], [svf(src, 2400, 5), 0, 0.25]);
        return scale(multiply(voiced, decay(s, 0.07, 0.004)), strength);
      };
      const spit = mix(
        [band(0.05, rng, 300, 0.7, decay(0.05, 0.012), 'lp')],
        [tone(0.15, t => lerp(600, 1400, t / 0.15), [1], [[0, 0], [0.02, 0.3], [0.12, 0.2], [0.15, 0]])],
      );
      return solo(0.65, mix([hack(165, 0.8)], [hack(150, 1), 0.2], [spit, 0.36]), -0.45);
    },
  },
  envelopePop: {
    dur: 0.35, level: 'medium', send: 0.1,
    render: ({ rng, snap }) => solo(0.35, mix(
      [pop(snap(600), rng), 0, 0.7],
      [band(0.08, rng, 1800, 1.1, decay(0.08, 0.03)), 0, 0.6],
      [microClicks(0.35, rng, 4, 3200, 0.03, 0.2, 0.4)],
    ), -0.15),
  },
  paperSlide: {
    dur: 0.35, level: 'small', send: 0.08,
    render: ({ rng }) => solo(0.35, mix(
      [band(0.3, rng, [[0, 2000], [0.3, 1600]], 0.9, [[0, 0], [0.05, 0.6], [0.2, 0.5], [0.27, 0]])],
      [microClicks(0.35, rng, 1, 2500, 0.255, 0.26, 0.6)],
    ), 0.1),
  },
  poofSparkle: {
    dur: 1.0, level: 'medium', send: 0.2,
    render: ({ rng, tones }) => {
      const poof = band(0.8, rng, [[0, 1100], [0.4, 350]], 0.8, decay(0.8, 0.2, 0.015), 'lp');
      const stars = tones(1000, 2700).slice(0, 5).map((f, k) => [ping(f), 0.08 + 0.08 * k, 0.35, -0.3 + 0.2 * k]);
      return placed(1.0, [[poof, 0, 1, 0.25], ...stars]);
    },
  },
  yawn: {
    dur: 0.85, level: 'medium', send: 0.1,
    render: ({ rng }) => {
      const n = len(0.85);
      const f0 = track(n, t => (t < 0.14 ? lerp(230, 300, cosRamp(t / 0.14)) : lerp(300, 190, cosRamp((t - 0.14) / 0.62))));
      const src = partials(n, f0, harmonics(Array.from({ length: 16 }, (_, k) => 1 / (k + 1) ** 1.1)), { taperLo: 3000, taperHi: 4500 });
      addInto(src, scale(whiteNoise(n, rng), 0.08));
      const f1 = shape(0.85, [[0, 700], [0.15, 800], [0.6, 450], [0.8, 300]]), f2 = shape(0.85, [[0, 1150], [0.15, 1200], [0.6, 850], [0.8, 700]]);
      const voice = multiply(mix([svf(src, f1, 5)], [svf(src, f2, 6), 0, 0.55], [svf(src, 2500, 8), 0, 0.2]), shape(0.85, [[0, 0], [0.08, 0.6], [0.22, 1], [0.62, 0.7], [0.78, 0]]));
      const creak = multiply(tone(0.45, t => lerp(600, 950, t / 0.45), [1, 0.2], [[0, 0], [0.08, 0.12], [0.38, 0.12], [0.45, 0]]), wobble(0.45, rng, 25).map(v => 0.6 + 0.4 * v));
      return solo(0.85, mix([voice], [creak, 0.2]), -0.3);
    },
  },
  whistle: {
    dur: 0.42, level: 'medium', send: 0.12,
    render: ({ rng, snap }) => {
      const f = snap(1568), blast = [[0, 0], [0.012, 1], [0.34, 0.9], [0.38, 0]];
      const body = tone(0.42, t => f * (1 + 0.012 * Math.sin(TAU * 26 * t)), [1, 0.12, 0.04], blast);
      multiply(body, track(body.length, t => 1 + 0.3 * Math.sin(TAU * 26 * t + 1)));
      const breath = multiply(svf(whiteNoise(len(0.42), rng), f, 6, 'bp'), shape(0.42, blast));
      return solo(0.42, mix([body], [breath, 0, 0.2]), [[0, 0], [0.42, -0.6]]);
    },
  },
  hopMenu: hop(1047, 0.23),
  hopHeart: hop(784, 0.12),
  hopStar: hop(659, 0.01),
  hopShare: hop(523, -0.09),
  hopGear: hop(659, -0.2),
  hopCart: hop(784, -0.31),
  leapOnSnail: {
    dur: 0.52, level: 'small', send: 0.1,
    render: ({ rng }) => solo(0.52, mix(
      [tone(0.08, t => lerp(400, 900, easeOut(t / 0.07)), [1, 0.3], decay(0.08, 0.03, 0.002))],
      [tone(0.1, t => 300 + 200 * Math.exp(-t / 0.01), [1, 0.2], decay(0.1, 0.03, 0.001)), 0.4, 0.6],
      [band(0.08, rng, 700, 2, decay(0.08, 0.03)), 0.4, 0.3],
    ), 0.2),
  },
  snailSetOff: { dur: 0.7, level: 'tiny', send: 0.08, render: ({ rng }) => solo(0.7, squish(rng), 0.35) },
  snailArrive: { dur: 0.7, level: 'tiny', send: 0.08, render: ({ rng }) => solo(0.7, squish(rng), -0.5) },
  clockWhizz: { dur: 0.6, level: 'small', send: 0.1, render: ({ rng }) => solo(0.6, clockWhizz(0.6, rng), -0.55) },
  clockWhizzLong: { dur: 1.15, level: 'small', send: 0.1, render: ({ rng }) => solo(1.15, clockWhizz(1.15, rng), -0.55) },
  cubbyClunk: {
    dur: 0.7, anchor: 0.07, level: 'medium', send: 0.12,
    render: ({ rng, snap }) => {
      const chime = fadeEdges(partials(len(0.6), snap(1050), [[1, 1, 0.9], [2, 0.1, 0.3]]), 0.015, 0.05);
      return solo(0.7, mix(
        [band(0.08, rng, 1300, 1, [[0, 0], [0.03, 0.4], [0.07, 0.2], [0.08, 0]])],
        [modal(0.3, [[175, 1, 0.45], [420, 0.55, 0.28], [760, 0.25, 0.14]]), 0.07],
        [band(0.05, rng, 1500, 0.7, decay(0.05, 0.012), 'lp'), 0.07, 0.4],
        [chime, 0.09, 0.22],
      ), -0.55);
    },
  },
  shadesClick: {
    dur: 0.15, level: 'tiny', send: 0.08,
    render: ({ rng }) => solo(0.15, mix(
      [band(0.004, rng, 2500, 2, decay(0.004, 0.001))],
      [band(0.004, rng, 2500, 2, decay(0.004, 0.001)), 0.025],
      [modal(0.03, [[900, 0.5, 0.05]])],
    ), -0.3),
  },
  click: {
    dur: 0.15, level: 'medium', send: 0.06,
    render: ({ rng }) => {
      const tick = () => mix([modal(0.06, [[2600, 0.6, 0.03], [1300, 0.5, 0.05], [700, 0.4, 0.07]])], [band(0.006, rng, 3000, 1.5, decay(0.006, 0.0015)), 0, 0.4]);
      return solo(0.15, mix([tick()], [tick(), 0.075, 0.6]), 0.45);
    },
  },
  sparkSparkle: {
    dur: 0.55, level: 'medium', send: 0.18,
    render: ({ rng, tones }) => {
      const pings = tones(1000, 2200).slice(0, 4).map((f, k) => {
        const p = ping(f, 0.35, 0.3, 0.12);
        return [multiply(p, track(p.length, t => 1 + 0.3 * Math.sin(TAU * 18 * t))), 0.02 + 0.05 * k, 0.35];
      });
      return solo(0.5, mix([microClicks(0.5, rng, 5, 3000, 0, 0.12, 0.3)], ...pings), 0.45);
    },
  },
  catch: {
    dur: 0.15, level: 'small', send: 0.08,
    render: ({ rng, snap }) => solo(0.15, mix(
      [tone(0.1, 180, [1, 0.2], decay(0.1, 0.03, 0.002))],
      [microClicks(0.15, rng, 2, 2800, 0, 0.03, 0.3)],
      [ping(snap(2000), 0.15, 0.15, 0.05), 0, 0.1],
    ), 0),
  },
  heartPop: {
    dur: 0.6, level: 'medium', send: 0.15,
    render: ({ rng, snap }) => {
      const root = snap(523);
      return solo(0.6, mix(
        [pop(snap(784), rng)],
        [tone(0.3, t => root * lerp(1, 1.5, easeOut(t / 0.12)), [1, 0.3, 0.1], [[0, 0], [0.01, 0.6], [0.15, 0.5], [0.3, 0]])],
        [ping(snap(1320), 0.4, 0.3), 0.08, 0.25],
        [ping(snap(1568), 0.4, 0.3), 0.14, 0.2],
      ), 0.42);
    },
  },
  sting: {
    dur: 0.9, level: 'big', send: 0.15,
    render: ({ rng, snap }) => {
      const env = [[0, 0], [0.01, 0.5], [0.06, 0.6], [0.07, 0]];
      const fwip = mix([tone(0.07, t => lerp(400, 1600, easeIn(t / 0.06)), [1, 0.3], env)], [band(0.07, rng, 2000, 1.2, env), 0, 0.4]);
      const tang = [784, 988, 1175].map(f => [fadeEdges(partials(len(0.8), snap(f), [[1, 1, 0.6], [2.76, 0.25, 0.15], [5.4, 0.06, 0.05]]), 0.0005, 0.05), 0.06, 0.33]);
      const dum = tone(0.8, t => snap(98) * (1 + 0.17 * Math.exp(-t / 0.03)), [1, 0.25, 0.1], decay(0.8, 0.35, 0.002));
      return solo(0.9, mix([fwip], ...tang, [dum, 0.06, 0.8], [band(0.1, rng, 300, 0.7, decay(0.1, 0.03), 'lp'), 0.06, 0.3]), 0);
    },
  },
  sparkHum: {
    dur: 2.0, level: -26, send: 0.12,
    render: ({ rng, snap }) => {
      const f = snap(98), n = len(2), amps = harmonics(Array.from({ length: 14 }, (_, k) => 1 / (k + 1) ** 1.2));
      const opts = { taperLo: 2000, taperHi: 3500 };
      const hum = mix([partials(n, f, amps, opts), 0, 0.5], [partials(n, f + 0.4, amps, opts), 0, 0.5]);
      const flicker = wobble(2, rng, 9);
      for (let i = 0; i < n; i++) hum[i] *= 1 + 0.15 * flicker[i];
      multiply(hum, shape(2, [[0, 0], [0.5, 0.7], [1.5, 1], [1.85, 0.8], [2, 0]]));
      return solo(2, mix([hum], [microClicks(2, rng, 8, 2500, 0.2, 1.8, 0.15)]), 0.05);
    },
  },
  windUp: {
    dur: 0.55, level: 'small', send: 0.08,
    render: () => {
      const n = len(0.55), ticks = new Float32Array(n), tick = modal(0.01, [[1600, 1, 0.03]]);
      let phase = 0;
      for (let i = 0; i < n; i++) {
        phase += lerp(10, 30, i / n) / SR;
        if (phase >= 1) { phase -= 1; addInto(ticks, tick, i, 0.4 + 0.6 * i / n); }
      }
      return solo(0.55, mix([fadeEdges(ticks, 0, 0.02)], [tone(0.55, t => lerp(200, 600, t / 0.55), [1, 0.4, 0.2], [[0, 0], [0.05, 0.2], [0.5, 0.35], [0.55, 0]]), 0, 0.3]), 0);
    },
  },
  stretchZip: {
    dur: 2.1, level: 'big', send: 0.08,
    render: ({ rng }) => {
      const f = t => (t < 0.5 ? 196 * 2 ** (24 * easeOut(t / 0.5) / 12) : 784 * 2 ** (5 * cosRamp((t - 0.5) / 1.1) / 12));
      const n = len(2.1), freq = track(n, t => f(t) * (1 + 0.025 * Math.sin(TAU * 11 * t)));
      const rubber = svf(partials(n, freq, harmonics([1, 0.5, 0.3, 0.18, 0.1])), track(n, t => 4 * f(t)), 1.5, 'lp');
      multiply(rubber, shape(2.1, [[0, 0], [0.05, 0.9], [0.5, 1], [1, 0.55], [1.6, 0.4], [2.05, 0]]));
      const whoosh = band(2.1, rng, [[0, 600], [0.5, 2400], [2, 1800]], 0.8, [[0, 0], [0.1, 0.6], [0.5, 0.9], [1.2, 0.6], [2, 0]]);
      return solo(2.1, mix([rubber], [whoosh, 0, 0.7]), [[0, 0], [0.5, -0.8], [0.7, -0.4], [2.1, -0.4]]);
    },
  },
  grab: {
    dur: 0.3, level: 'medium', send: 0.08,
    render: ({ rng }) => solo(0.3, mix(
      [tone(0.2, 130, [1, 0.2], decay(0.2, 0.05, 0.002))],
      [microClicks(0.3, rng, 7, 1600, 0, 0.08, 0.5)],
      [band(0.1, rng, 2000, 0.7, decay(0.1, 0.04), 'lp'), 0, 0.4],
    ), -0.2),
  },
  yank: {
    dur: 0.6, level: 'medium', send: 0.1,
    render: ({ rng, snap }) => {
      const wob = multiply(tone(0.5, 170, [1, 0.4], [[0, 0], [0.05, 0.4], [0.5, 0]]), track(len(0.5), t => 1 + 0.8 * Math.sin(TAU * 8 * t) * Math.exp(-t / 0.2)));
      return solo(0.6, mix(
        [band(0.32, rng, [[0, 800], [0.12, 2600], [0.3, 1200]], 1, [[0, 0], [0.08, 1], [0.3, 0]])],
        [tone(0.3, t => lerp(300, 900, easeOut(t / 0.15)), [1, 0.3], [[0, 0], [0.05, 0.4], [0.25, 0.2], [0.3, 0]])],
        [wob, 0, 0.5],
        [ping(snap(1320), 0.2, 0.3, 0.05), 0.05, 0.25],
      ), [[0, 0], [0.4, 0.4]]);
    },
  },
  plonk: {
    dur: 0.35, level: 'medium', send: 0.1,
    render: ({ rng }) => solo(0.35, mix(
      [modal(0.35, [[235, 1, 0.55], [590, 0.4, 0.28], [1100, 0.15, 0.14]])],
      [band(0.1, rng, 700, 2, decay(0.1, 0.06)), 0, 0.3],
    ), 0.3),
  },
  snapBack: {
    dur: 1.25, anchor: 0.483, level: 'big', send: 0.1,
    render: ({ rng, snap }) => {
      const env = [[0, 0], [0.03, 0.6], [0.26, 1], [0.3, 0]];
      const back = mix(
        [tone(0.3, t => 1100 * (250 / 1100) ** clamp(t / 0.28), [1, 0.4, 0.2], env)],
        [band(0.3, rng, [[0, 2400], [0.28, 700]], 0.9, env), 0, 0.6],
      );
      const incoming = band(0.1, rng, [[0, 600], [0.1, 1800]], 0.9, [[0, 0], [0.08, 0.6], [0.1, 0]]);
      const f0 = snap(220), n = len(0.75);
      const spring = multiply(
        partials(n, track(n, t => f0 * (1 + 0.06 * Math.exp(-t / 0.3) * Math.sin(TAU * 14 * t))), [[1, 1], [2.08, 0.5], [3.3, 0.3], [4.9, 0.15]]),
        decay(0.75, 0.32, 0.002),
      );
      return placed(1.25, [[back, 0, 1, [[0, -0.5], [0.3, 0.8]]], [incoming, 0.383, 0.6, -0.1], [slapSound(rng), 0.483, 1, -0.2], [fadeEdges(spring, 0, 0.05), 0.5, 1, -0.3]]);
    },
  },
  sparkWhoosh: {
    dur: 0.6, level: 'medium', send: 0.18,
    render: ({ rng, tones }) => {
      const steps = tones(700, 1600).slice(0, 5), pings = steps.map((f, k) => [ping(f, 0.3, 0.25), 0.02 + 0.045 * k, 0.2 + 0.03 * k]);
      const hit = [mix([pop(steps[steps.length - 1], rng)], [ping(2 * steps[steps.length - 1], 0.35, 0.3)]), 0.24, 0.5];
      return solo(0.6, mix([band(0.26, rng, [[0, 1000], [0.24, 3000]], 0.9, [[0, 0], [0.15, 0.7], [0.22, 1], [0.25, 0]])], ...pings, hit), [[0, -0.3], [0.3, 0.55]]);
    },
  },
  cartDing: {
    dur: 1.4, level: 'big', send: 0.2,
    render: ({ rng, snap }) => {
      const ka = mix([modal(0.05, [[900, 0.6, 0.06], [2100, 0.4, 0.03]])], [band(0.004, rng, 3000, 1, decay(0.004, 0.001)), 0, 0.3]);
      const bell = [1320, 1568, 2093].map((f, k) => [fadeEdges(partials(len(1.3), snap(f) * (1 + (k - 1) * 0.0008), [[1, 1, 1.1], [2.76, 0.2, 0.3]]), 0.0005, 0.1), 0.06, [0.5, 0.35, 0.3][k]]);
      return solo(1.4, mix([ka, 0, 0.6], ...bell), 0.6);
    },
  },
  confetti: {
    dur: 1.3, level: 'medium', send: 0.12,
    render: ({ rng }) => {
      const out = stereo(len(1.3));
      mixMono(out, mix([band(0.06, rng, 1500, 0.7, decay(0.06, 0.03), 'lp')], [tone(0.1, 160, [1], decay(0.1, 0.04, 0.001)), 0, 0.6]), 0, 1, 0.6);
      for (let k = 0; k < 50; k++) {
        const t = Math.min(1.2, 0.03 - Math.log(1 - rng()) * 0.3);
        mixMono(out, band(0.004, rng, 2500 + 2500 * rng(), 2, decay(0.004, 0.0012)), len(t), (0.2 + 0.4 * rng()) * Math.exp(-t / 0.6), -0.3 + 1.2 * rng());
      }
      mixMono(out, band(1.3, rng, 3500, 0.7, [[0, 0], [0.05, 0.25], [1.2, 0]]), 0, 0.15, 0.5);
      return { L: svf(out.L, 7000, 0.7, 'lp'), R: svf(out.R, 7000, 0.7, 'lp') };
    },
  },
  armsBoing: {
    dur: 0.6, anchor: 0.1, level: 'medium', send: 0.1,
    render: ({ snap }) => {
      const pull = tone(0.1, t => 900 * (300 / 900) ** clamp(t / 0.09), [1, 0.35, 0.12], [[0, 0], [0.08, 0.6], [0.1, 0]]);
      const f0 = snap(330), n = len(0.5);
      const spring = multiply(partials(n, track(n, t => f0 * (1 + 0.07 * Math.exp(-t / 0.18) * Math.sin(TAU * 15 * t))), [[1, 1], [2, 0.35], [3, 0.15]]), decay(0.5, 0.14, 0.002));
      return solo(0.6, mix([pull, 0, 0.25], [spring, 0.1]), -0.3);
    },
  },
  knock: {
    dur: 0.25, level: 'small', send: 0.1,
    render: ({ rng }) => solo(0.25, mix(
      [modal(0.25, [[220, 1, 0.3], [560, 0.5, 0.15], [1150, 0.2, 0.07]])],
      [band(0.02, rng, 1200, 1, decay(0.02, 0.004)), 0, 0.4],
    ), -0.5),
  },
  pat: {
    dur: 0.15, level: 'tiny', send: 0.08,
    render: ({ rng }) => solo(0.15, mix([modal(0.15, [[300, 0.8, 0.2], [720, 0.3, 0.1]])], [band(0.03, rng, 900, 0.8, decay(0.03, 0.008), 'lp'), 0, 0.5]), 0),
  },
  puffOut: {
    dur: 0.4, level: 'small', send: 0.08,
    render: ({ rng }) => {
      const air = band(0.4, rng, 1200, 0.8, [[0, 0], [0.02, 1], [0.25, 0.4], [0.35, 0]]);
      return solo(0.4, multiply(air, track(air.length, t => 1 + 0.4 * Math.sin(TAU * 30 * t))), -0.3);
    },
  },
  thumbsUp: {
    dur: 0.55, level: 'medium', send: 0.15,
    render: ({ rng, snap }) => solo(0.5, mix(
      [pop(snap(700), rng)],
      [ping(snap(1320), 0.4, 0.3), 0.04, 0.25],
      [ping(snap(1568), 0.4, 0.3), 0.11, 0.25],
    ), 0.5),
  },
  wipeBrow: {
    dur: 0.4, level: 'small', send: 0.08,
    render: ({ rng }) => solo(0.4, mix(
      [band(0.4, rng, [[0, 1500], [0.35, 900]], 0.8, [[0, 0], [0.1, 0.6], [0.35, 0]])],
      [band(0.35, rng, 1200, 1.5, [[0, 0], [0.08, 0.3], [0.3, 0]]), 0, 0.3],
    ), -0.3),
  },
  whooshBack: {
    dur: 1.4, level: 'medium', send: 0.05,
    render: ({ rng }) => {
      const fc = [[0, 400], [0.5, 1100], [1.35, 600]], env = [[0, 0], [0.25, 0.6], [0.5, 1], [0.9, 0.5], [1.35, 0]];
      const air = band(1.4, rng, 300, 0.7, env, 'lp');
      return { L: mix([band(1.4, rng, fc, 0.7, env)], [air, 0, 0.3]), R: mix([band(1.4, rng, fc, 0.7, env)], [air, 0, 0.3]) };
    },
  },
  paperClose: {
    dur: 0.55, level: 'small', send: 0.08,
    render: ({ rng }) => {
      const swish = () => band(0.5, rng, [[0, 1800], [0.45, 2600]], 0.9, [[0, 0], [0.05, 0.8], [0.4, 0.4], [0.5, 0]]);
      return placed(0.5, [[swish(), 0, 1, [[0, -0.7], [0.5, -0.2]]], [swish(), 0.02, 1, [[0, 0.7], [0.5, 0.2]]]]);
    },
  },
  jump: {
    dur: 0.25, level: 'small', send: 0.1,
    render: ({ rng }) => solo(0.25, mix(
      [tone(0.15, t => lerp(300, 750, easeOut(t / 0.1)), [1, 0.3], decay(0.15, 0.07, 0.004))],
      [band(0.15, rng, [[0, 800], [0.12, 1800]], 1, [[0, 0], [0.03, 0.3], [0.12, 0]]), 0, 0.3],
    ), -0.45),
  },
  zipIn: {
    dur: 0.2, level: 'small', send: 0.08,
    render: ({ rng }) => solo(0.2, mix(
      [zip(0.15, 1000, 350, rng)],
      [tone(0.05, t => 600 - 200 * clamp(t / 0.02), [1], decay(0.05, 0.015)), 0.12, 0.3],
    ), -0.45),
  },
  zipInSnap: {
    dur: 0.42, anchor: 0.2, level: 'medium', send: 0.1,
    render: ({ rng }) => solo(0.42, mix([zip(0.22, 1300, 300, rng)], [slapSound(rng), 0.2, 0.8]), -0.45),
  },
  landSoft: {
    dur: 0.6, level: 'small', send: 0.15,
    render: ({ rng, snap }) => solo(0.6, mix(
      [tone(0.25, 110, [1, 0.2], decay(0.25, 0.05, 0.002)), 0, 0.7],
      [ping(snap(1050), 0.55, 0.6, 0.1), 0.01, 0.3],
      [band(0.15, rng, 800, 0.7, decay(0.15, 0.05), 'lp'), 0, 0.3],
    ), -0.45),
  },
  iris: {
    dur: 0.55, level: 'tiny', send: 0.08,
    render: ({ rng }) => solo(0.55, band(0.55, rng, [[0, 500], [0.25, 1400], [0.5, 700]], 0.9, [[0, 0], [0.2, 0.5], [0.3, 0.5], [0.5, 0]]), 0),
  },
  winkTwinkle: {
    dur: 1.6, level: 'medium', send: 0.25,
    render: ({ rng, snap }) => {
      const f = snap(2093), ting = fadeEdges(partials(len(1.5), f, [[1, 1, 1.2], [2.76, 0.15, 0.25]]), 0.0005, 0.1);
      multiply(ting, track(ting.length, t => 1 + 0.15 * Math.sin(TAU * 7 * t)));
      const follow = [[2637, 0.07, 0.4], [1568, 0.13, 0.3], [2093, 0.2, 0.25]].map(([hz, at, gain]) =>
        [fadeEdges(partials(len(1.2), snap(hz), [[1, 1, 0.8], [2.76, 0.1, 0.2]]), 0.0005, 0.1), at, gain]);
      return solo(1.6, mix([ting], ...follow, [band(0.4, rng, 4000, 3, decay(0.4, 0.1)), 0, 0.05]), -0.4);
    },
  },
};
