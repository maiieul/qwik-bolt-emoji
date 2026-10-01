import {
  SR, clamp, cosRamp, toSamples, makeRng, seedFrom, stereo, mixStereo, eqStereo, biquad, freeverb, loudness, maxLoudness,
  dbToGain, gainToDb, limiterGain, truePeakDb, peak,
} from './dsp.mjs';
import { EFFECTS, LEVELS, DUCK_WEIGHTS } from './sfx.mjs';
import { snapToChord, chordTonesBetween } from './score.mjs';

const PEAK_CAP_DB = -9;

export function effectLevel(effect) {
  return typeof effect.level === 'number' ? effect.level : LEVELS[effect.level];
}
const duckWeight = effect => (typeof effect.level === 'number' ? DUCK_WEIGHTS.small : DUCK_WEIGHTS[effect.level]);

export function renderSfx(cues, seconds) {
  const n = toSamples(seconds), dry = stereo(n), send = stereo(n), sidechain = stereo(n), placed = [];
  for (const cue of cues) {
    const effect = EFFECTS[cue.name];
    if (!effect) throw new Error(`cues.json: unknown effect "${cue.name}" at ${cue.t} s (known: ${Object.keys(EFFECTS).join(', ')})`);
    const buf = effect.render({
      t: cue.t,
      rng: makeRng(seedFrom('cue', cue.name, cue.t)),
      snap: hz => snapToChord(hz, cue.t),
      tones: (lo, hi) => chordTonesBetween(cue.t, lo, hi),
    });
    if (buf.L.length > toSamples(effect.dur + 0.001)) throw new Error(`effect "${cue.name}" renders ${(buf.L.length / SR).toFixed(3)} s, longer than its dur ${effect.dur}`);
    const byLoudness = dbToGain(effectLevel(effect) - maxLoudness(buf.L, buf.R, 0.1));
    const byPeak = dbToGain(PEAK_CAP_DB) / Math.max(peak(buf.L), peak(buf.R));
    const gain = Math.min(byLoudness, byPeak) * (cue.gain ?? 1);
    const start = toSamples(cue.t - (effect.anchor ?? 0));
    mixStereo(dry, buf, start, gain);
    mixStereo(send, buf, start, gain * (effect.send ?? 0.1));
    mixStereo(sidechain, buf, start, gain * duckWeight(effect));
    placed.push({ ...cue, start: start / SR, end: start / SR + buf.L.length / SR, cappedDb: gainToDb(Math.min(1, byPeak / byLoudness)) });
  }
  const wet = eqStereo(freeverb(send, { room: 0.5, damp: 0.6, width: 0.8, predelay: 0.008 }), [biquad('hp', 200), biquad('lp', 6000)]);
  mixStereo(dry, wet, 0, 0.8);
  return { bus: dry, sidechain, placed };
}

export function duckGain(sfx, { depthDb = 4, floorDb = -36, fullDb = -20, attack = 0.015, release = 0.25, lookahead = 0.015 } = {}) {
  const n = sfx.L.length, smoothing = 1 - Math.exp(-1 / (0.01 * SR)), level = new Float32Array(n);
  let meanSquare = 0;
  for (let i = 0; i < n; i++) {
    meanSquare += smoothing * (0.5 * (sfx.L[i] ** 2 + sfx.R[i] ** 2) - meanSquare);
    level[i] = 10 * Math.log10(meanSquare + 1e-12);
  }
  const ahead = toSamples(lookahead), attackCoef = Math.exp(-1 / (attack * SR)), releaseCoef = Math.exp(-1 / (release * SR));
  const gain = new Float32Array(n);
  let g = 0;
  for (let i = 0; i < n; i++) {
    const target = -depthDb * clamp((level[Math.min(n - 1, i + ahead)] - floorDb) / (fullDb - floorDb));
    g = target < g ? attackCoef * g + (1 - attackCoef) * target : releaseCoef * g + (1 - releaseCoef) * target;
    gain[i] = dbToGain(g);
  }
  return gain;
}

const MASTER_EQ = () => [biquad('hp', 30), biquad('highshelf', 8000, 0.7, -3), biquad('lp', 12000), biquad('lp', 12000)];

function fades(n, fadeIn, fadeOutStart) {
  const env = new Float32Array(n).fill(1), a = toSamples(fadeIn), b = toSamples(fadeOutStart);
  for (let i = 0; i < a; i++) env[i] = cosRamp(i / a);
  for (let i = b; i < n; i++) env[i] = cosRamp((n - 1 - i) / (n - 1 - b));
  return env;
}

export function master(music, sfx, duck, { targetLufs = -16, ceilingDb = -2, fadeIn = 0.005, fadeOutStart = 65 } = {}) {
  const n = music.L.length, env = fades(n, fadeIn, fadeOutStart);
  const m = stereo(n), s = stereo(n);
  for (let i = 0; i < n; i++) {
    m.L[i] = music.L[i] * duck[i] * env[i];
    m.R[i] = music.R[i] * duck[i] * env[i];
    s.L[i] = sfx.L[i] * env[i];
    s.R[i] = sfx.R[i] * env[i];
  }
  eqStereo(m, MASTER_EQ());
  eqStereo(s, MASTER_EQ());
  const pre = stereo(n);
  for (let i = 0; i < n; i++) { pre.L[i] = m.L[i] + s.L[i]; pre.R[i] = m.R[i] + s.R[i]; }

  let level = dbToGain(targetLufs - loudness(pre.L, pre.R).integrated), limit = null, out = null, measured = null;
  for (let pass = 0; pass < 6; pass++) {
    const scaled = stereo(n);
    for (let i = 0; i < n; i++) { scaled.L[i] = pre.L[i] * level; scaled.R[i] = pre.R[i] * level; }
    limit = limiterGain(scaled.L, scaled.R, { ceilingDb });
    out = stereo(n);
    for (let i = 0; i < n; i++) { out.L[i] = scaled.L[i] * limit[i]; out.R[i] = scaled.R[i] * limit[i]; }
    measured = loudness(out.L, out.R).integrated;
    if (Math.abs(measured - targetLufs) < 0.02) break;
    level *= dbToGain(targetLufs - measured);
  }
  const stem = bus => {
    const o = stereo(n);
    for (let i = 0; i < n; i++) { const k = level * limit[i]; o.L[i] = bus.L[i] * k; o.R[i] = bus.R[i] * k; }
    return o;
  };
  let deepest = 1, limitedTime = 0;
  for (let i = 0; i < n; i++) { if (limit[i] < deepest) deepest = limit[i]; if (limit[i] < dbToGain(-0.5)) limitedTime++; }
  return {
    mix: out, music: stem(m), sfx: stem(s),
    stats: {
      integrated: measured, truePeak: truePeakDb(out.L, out.R), samplePeak: gainToDb(Math.max(peak(out.L), peak(out.R))),
      masterGainDb: gainToDb(level), deepestLimitDb: gainToDb(deepest), secondsLimitedOverHalfDb: limitedTime / SR,
    },
  };
}
