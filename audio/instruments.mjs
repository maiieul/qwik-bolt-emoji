import {
  TAU, clamp, cosRamp, midiHz, toSamples, partials, harmonics, pluck, whiteNoise, svf, scale, multiply, addInto,
  fadeEdges, track, stereo, onePoleLowpass,
} from './dsp.mjs';

const airless = x => svf(svf(x, 7000, 0.7, 'lp'), 7000, 0.7, 'lp');
const noiseBurst = (seconds, rng, hz, q, tau) => {
  const n = toSamples(seconds), x = airless(svf(whiteNoise(n, rng), hz, q, 'bp'));
  return multiply(x, track(n, t => cosRamp(t / 0.0005) * Math.exp(-t / tau) * cosRamp((seconds - t) / 0.003)));
};

export function ukeString(midi, ring, vel, rng, muted = false) {
  const hz = midiHz(midi) * (1 + (rng() - 0.5) * 0.0012);
  const x = pluck({
    hz,
    dur: muted ? Math.min(ring, 0.1) : ring,
    t60: muted ? 0.07 : clamp(1.9 - (midi - 60) * 0.04, 0.9, 1.9),
    s: muted ? 0.5 : 0.36,
    exciteHz: muted ? 1300 : 2700,
    pick: 0.17 + rng() * 0.06,
    rng,
    release: muted ? 0.02 : 0.04,
  });
  return scale(x, vel * (muted ? 0.5 : 1));
}

export function strumScrape(vel, rng) {
  return scale(noiseBurst(0.05, rng, 1900, 1.2, 0.008), 0.18 * vel);
}

export function pizzNote(midi, vel, rng) {
  const x = pluck({ hz: midiHz(midi), dur: 0.5, t60: 0.42, s: 0.47, exciteHz: 1800, pick: 0.12, rng, release: 0.06 });
  return scale(x, vel);
}

export function glockNote(midi, vel, rng) {
  const hz = midiHz(midi), n = toSamples(2.2);
  const x = partials(n, hz, [[1, 1, 1.7], [2.76, 0.26, 0.42], [5.4, 0.08, 0.14], [8.93, 0.02, 0.06]]);
  addInto(x, noiseBurst(0.012, rng, 3200, 1.5, 0.002), 0, 0.05);
  fadeEdges(x, 0.0006, 0.1);
  return scale(x, vel * 0.8);
}

export function musicBoxNote(midi, vel, rng) {
  const hz = midiHz(midi), T = clamp(2.3 - (midi - 72) * 0.07, 0.7, 2.3), n = toSamples(T + 0.12);
  const x = partials(n, hz, [[1, 1, T], [1.0017, 0.4, T * 0.8], [2, 0.12, T * 0.35], [3, 0.04, T * 0.2], [6.27, 0.25 + 0.2 * vel, T * 0.1]]);
  addInto(x, noiseBurst(0.006, rng, 4200, 1.3, 0.0012), 0, 0.07);
  addInto(x, partials(toSamples(0.08), 1, [[360, 1, 0.04], [930, 0.35, 0.025]]), 0, 0.03);
  fadeEdges(x, 0.0008, 0.08);
  return scale(x, vel * 0.8);
}

export function marimbaNote(midi, vel, rng) {
  const hz = midiHz(midi), T = clamp(1.6 - (midi - 48) * 0.035, 0.35, 1.6), n = toSamples(T + 0.12);
  const bright = 0.1 + 0.14 * vel;
  const x = partials(n, hz, [[1, 1, T], [4, bright, T / 5], [9.9, bright * 0.22, T / 12]]);
  const thump = onePoleLowpass(whiteNoise(toSamples(0.008), rng), 700);
  fadeEdges(thump, 0.001, 0.006);
  addInto(x, thump, 0, 0.12);
  fadeEdges(x, 0.0025, 0.08);
  return scale(x, vel);
}

export function bassNote(midi, dur, vel, rng) {
  const hz = midiHz(midi) * (1 + (rng() - 0.5) * 0.0008), n = toSamples(dur + 0.06);
  const freq = track(n, t => hz * (1 + 0.01 * Math.exp(-t / 0.02)));
  const x = partials(n, freq, [[1, 1, 7], [2, 0.5, 1.5], [3, 0.24, 0.7], [4, 0.11, 0.4], [5, 0.05, 0.3]]);
  multiply(x, track(n, t => cosRamp(t / 0.007) * (1 + 0.35 * Math.exp(-t / 0.08))));
  fadeEdges(x, 0, 0.06);
  return scale(x, vel * 0.8);
}

export function padVoices(midis, dur, vel, rng, { attack = 0.6, release = 0.8, swell = 1 } = {}) {
  const n = toSamples(dur + release), out = stereo(n);
  const list = harmonics(Array.from({ length: 10 }, (_, k) => 1 / (k + 1) ** 1.5));
  const env = track(n, t => cosRamp(t / attack) * (1 + (swell - 1) * clamp(t / dur)) * (t > dur ? cosRamp(1 - (t - dur) / release) : 1));
  for (const midi of midis) {
    const hz = midiHz(midi);
    for (const [side, cents] of [['L', -4], ['R', 4]]) {
      const base = hz * 2 ** (cents / 1200), rate = 4.3 + rng() * 0.8, phase = rng() * TAU;
      const freq = track(n, t => base * (1 + 0.0016 * Math.sin(TAU * rate * t + phase) * cosRamp(t / 0.8)));
      const voice = partials(n, freq, list, { taperLo: 2200, taperHi: 3200 });
      addInto(out[side], multiply(voice, env), 0, vel * 0.22 / midis.length ** 0.5);
    }
  }
  return out;
}

export function kick(vel, rng) {
  const n = toSamples(0.42);
  const freq = track(n, t => 49 + 80 * Math.exp(-t / 0.03));
  const x = partials(n, freq, [[1, 1], [2, 0.06]]);
  multiply(x, track(n, t => cosRamp(t / 0.0015) * Math.exp(-t / 0.14)));
  const click = onePoleLowpass(whiteNoise(toSamples(0.004), rng), 2500);
  fadeEdges(click, 0.0005, 0.003);
  addInto(x, click, 0, 0.05);
  return scale(fadeEdges(x, 0, 0.05), vel);
}

export function snap(vel, rng) {
  const x = noiseBurst(0.14, rng, 2100, 2.6, 0.02);
  addInto(x, noiseBurst(0.14, rng, 1150, 4, 0.03), 0, 0.5);
  return scale(fadeEdges(x, 0, 0.02), vel * 0.9);
}

export function brushSwish(vel, rng, length = 0.24) {
  const n = toSamples(length);
  const x = airless(svf(whiteNoise(n, rng), 2600, 0.7, 'bp'));
  multiply(x, track(n, t => cosRamp(t / 0.035) * Math.exp(-Math.max(0, t - 0.035) / 0.07)));
  return scale(fadeEdges(x, 0, 0.03), vel * 0.7);
}

export function brushTap(vel, rng) {
  const x = noiseBurst(0.09, rng, 3200, 0.8, 0.02);
  return scale(fadeEdges(x, 0, 0.02), vel * 0.6);
}

export function shaker(vel, rng) {
  const n = toSamples(0.1);
  const x = airless(svf(whiteNoise(n, rng), 4800, 1.6, 'bp'));
  multiply(x, track(n, t => cosRamp(t / 0.006) * Math.exp(-t / 0.03)));
  return scale(fadeEdges(x, 0, 0.02), vel * 0.55);
}

export function woodblock(vel, rng, hz = 1100) {
  const n = toSamples(0.16);
  const x = partials(n, hz, [[1, 1, 0.09], [2.37, 0.3, 0.035]]);
  addInto(x, noiseBurst(0.01, rng, 3000, 1.2, 0.0012), 0, 0.15);
  return scale(fadeEdges(x, 0.0003, 0.03), vel * 0.7);
}

export const drumKit = { kick, snap, brush: brushSwish, tap: brushTap, shaker, block: woodblock };
