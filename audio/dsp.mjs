import { writeFileSync, readFileSync } from 'node:fs';

export const SR = 44100;
export const TAU = Math.PI * 2;
const LN1000 = Math.log(1000);

export const clamp = (x, lo = 0, hi = 1) => (x < lo ? lo : x > hi ? hi : x);
export const lerp = (a, b, x) => a + (b - a) * x;
export const cosRamp = x => 0.5 - 0.5 * Math.cos(Math.PI * clamp(x));
export const easeOut = x => 1 - (1 - clamp(x)) ** 3;
export const easeIn = x => clamp(x) ** 3;
export const dbToGain = db => 10 ** (db / 20);
export const gainToDb = g => 20 * Math.log10(Math.max(Math.abs(g), 1e-12));
export const midiHz = m => 440 * 2 ** ((m - 69) / 12);
export const hzMidi = hz => 69 + 12 * Math.log2(hz / 440);
export const toSamples = seconds => Math.max(0, Math.round(seconds * SR));
export const decayStep = t60 => Math.exp(-LN1000 / (t60 * SR));

const STEPS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export function noteMidi(name) {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  if (!m) throw new Error(`bad note name ${name}`);
  return 12 * (Number(m[3]) + 1) + STEPS[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}

export function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function seedFrom(...parts) {
  let h = 2166136261;
  for (const ch of parts.join('|')) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

export const stereo = n => ({ L: new Float32Array(n), R: new Float32Array(n) });

export function panGains(pan) {
  const a = (clamp(pan, -1, 1) + 1) * Math.PI / 4;
  return [Math.cos(a), Math.sin(a)];
}

export function track(n, fn) {
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = fn(i / SR);
  return out;
}

export function curve(n, points) {
  const out = new Float32Array(n);
  const last = points.length - 1;
  let k = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    while (k < last && t >= points[k + 1][0]) k++;
    if (k >= last || t < points[0][0]) { out[i] = k >= last ? points[last][1] : points[0][1]; continue; }
    const [t0, v0] = points[k], [t1, v1] = points[k + 1];
    out[i] = v0 + (v1 - v0) * cosRamp((t - t0) / Math.max(t1 - t0, 1e-9));
  }
  return out;
}

export function scale(x, gain) {
  for (let i = 0; i < x.length; i++) x[i] *= gain;
  return x;
}
export function multiply(x, env) {
  const n = Math.min(x.length, env.length);
  for (let i = 0; i < n; i++) x[i] *= env[i];
  for (let i = n; i < x.length; i++) x[i] = 0;
  return x;
}
export function addInto(dst, src, start = 0, gain = 1) {
  const from = Math.max(0, -start), to = Math.min(src.length, dst.length - start);
  for (let i = from; i < to; i++) dst[start + i] += src[i] * gain;
  return dst;
}
export function fadeEdges(x, attack = 0.001, release = 0.01) {
  const a = Math.min(toSamples(attack), x.length), r = Math.min(toSamples(release), x.length);
  for (let i = 0; i < a; i++) x[i] *= cosRamp(i / a);
  for (let i = 0; i < r; i++) x[x.length - 1 - i] *= cosRamp(i / r);
  return x;
}
export function peak(x) {
  let p = 0;
  for (let i = 0; i < x.length; i++) { const v = Math.abs(x[i]); if (v > p) p = v; }
  return p;
}

export function mixMono(dst, src, start, gain = 1, pan = 0) {
  const from = Math.max(0, -start), to = Math.min(src.length, dst.L.length - start);
  if (typeof pan === 'number') {
    const [gl, gr] = panGains(pan);
    for (let i = from; i < to; i++) { const v = src[i] * gain; dst.L[start + i] += v * gl; dst.R[start + i] += v * gr; }
    return dst;
  }
  for (let i = from; i < to; i++) {
    const a = (clamp(pan[Math.min(i, pan.length - 1)], -1, 1) + 1) * Math.PI / 4, v = src[i] * gain;
    dst.L[start + i] += v * Math.cos(a);
    dst.R[start + i] += v * Math.sin(a);
  }
  return dst;
}
export function mixStereo(dst, src, start, gain = 1) {
  addInto(dst.L, src.L, start, gain);
  addInto(dst.R, src.R, start, gain);
  return dst;
}

export function whiteNoise(n, rng) {
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = rng() * 2 - 1;
  return out;
}

export function partials(n, freq, list, { taperLo = 6000, taperHi = 8500, phases } = {}) {
  const out = new Float32Array(n);
  const varying = typeof freq !== 'number';
  const span = taperHi - taperLo;
  for (let p = 0; p < list.length; p++) {
    const [ratio, amp, t60] = list[p];
    if (!varying && freq * ratio >= taperHi) continue;
    const step = t60 ? decayStep(t60) : 1;
    let a = amp, ph = phases ? phases[p] : 0;
    for (let i = 0; i < n; i++) {
      const f = (varying ? freq[i] : freq) * ratio;
      if (f < taperHi) out[i] += a * (f <= taperLo ? 1 : cosRamp((taperHi - f) / span)) * Math.sin(ph);
      ph += TAU * f / SR;
      if (ph > TAU) ph -= TAU;
      a *= step;
    }
  }
  return out;
}

export function harmonics(amps, t60s) {
  return amps.map((a, k) => [k + 1, a, t60s ? t60s[k] : undefined]);
}

export function pluck({ hz, dur, t60 = 1.5, s = 0.5, exciteHz = 3000, pick = 0.2, rng, release = 0.03 }) {
  const n = toSamples(dur + release);
  const period = SR / hz;
  const delay = Math.max(2, Math.floor(period - s - 0.2));
  const frac = period - s - delay;
  const ap = (1 - frac) / (1 + frac);
  const w0 = TAU * hz / SR;
  const zeroGain = Math.sqrt((1 - s) ** 2 + s * s + 2 * s * (1 - s) * Math.cos(w0));
  const loop = Math.min(0.99995, 10 ** (-3 / (t60 * hz)) / zeroGain);

  const excLen = Math.max(4, Math.round(period));
  const exc = new Float32Array(excLen);
  const lpA = 1 - Math.exp(-TAU * exciteHz / SR);
  let lp1 = 0, lp2 = 0;
  for (let i = 0; i < excLen; i++) { lp1 += lpA * (rng() * 2 - 1 - lp1); lp2 += lpA * (lp1 - lp2); exc[i] = lp2; }
  const pickLag = Math.max(1, Math.round(pick * period));
  for (let i = excLen - 1; i >= pickLag; i--) exc[i] -= exc[i - pickLag];
  let mean = 0;
  for (let i = 0; i < excLen; i++) mean += exc[i];
  mean /= excLen;
  for (let i = 0; i < excLen; i++) exc[i] -= mean;
  scale(exc, 0.5 / (peak(exc) || 1));

  const line = new Float32Array(delay);
  const out = new Float32Array(n);
  let idx = 0, prevIn = 0, prevZero = 0, prevAp = 0;
  for (let i = 0; i < n; i++) {
    const v = line[idx];
    const zero = (1 - s) * v + s * prevIn;
    prevIn = v;
    const all = ap * zero + prevZero - ap * prevAp;
    prevZero = zero;
    prevAp = all;
    const y = (i < excLen ? exc[i] : 0) + loop * all;
    line[idx] = y;
    idx = idx + 1 === delay ? 0 : idx + 1;
    out[i] = y;
  }
  dcBlock(out);
  return fadeEdges(out, 0.0012, release);
}

export function dcBlock(x, hz = 20) {
  const r = 1 - TAU * hz / SR;
  let x1 = 0, y1 = 0;
  for (let i = 0; i < x.length; i++) { const y = x[i] - x1 + r * y1; x1 = x[i]; y1 = y; x[i] = y; }
  return x;
}

export function svf(x, fc, q = Math.SQRT1_2, mode = 'bp') {
  const n = x.length, out = new Float32Array(n), k = 1 / q, varying = typeof fc !== 'number';
  const warp = f => Math.tan(Math.PI * clamp(f, 10, 0.45 * SR) / SR);
  let g = warp(varying ? fc[0] : fc), a1 = 0, a2 = 0, a3 = 0, ic1 = 0, ic2 = 0;
  const update = () => { a1 = 1 / (1 + g * (g + k)); a2 = g * a1; a3 = g * a2; };
  update();
  const m = mode === 'lp' ? 0 : mode === 'hp' ? 1 : 2;
  for (let i = 0; i < n; i++) {
    if (varying && (i & 7) === 0) { g = warp(fc[i]); update(); }
    const v0 = x[i], v3 = v0 - ic2, v1 = a1 * ic1 + a2 * v3, v2 = ic2 + a2 * ic1 + a3 * v3;
    ic1 = 2 * v1 - ic1;
    ic2 = 2 * v2 - ic2;
    out[i] = m === 0 ? v2 : m === 1 ? v0 - k * v1 - v2 : k * v1;
  }
  return out;
}

export function onePoleLowpass(x, hz) {
  const a = 1 - Math.exp(-TAU * hz / SR);
  let y = 0;
  for (let i = 0; i < x.length; i++) { y += a * (x[i] - y); x[i] = y; }
  return x;
}

function cubicAt(x, pos) {
  const j = Math.floor(pos), f = pos - j;
  const xm1 = x[j - 1] ?? 0, x0 = x[j] ?? 0, x1 = x[j + 1] ?? 0, x2 = x[j + 2] ?? 0;
  return x0 + 0.5 * f * (x1 - xm1 + f * (2 * xm1 - 5 * x0 + 4 * x1 - x2 + f * (3 * (x0 - x1) + x2 - xm1)));
}

export function varDelay(x, delaySeconds) {
  const out = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) out[i] = cubicAt(x, i - delaySeconds[i] * SR);
  return out;
}

export function resample(x, speed) {
  const out = new Float32Array(Math.floor((x.length - 1) / speed) + 1);
  for (let i = 0; i < out.length; i++) out[i] = cubicAt(x, i * speed);
  return out;
}

export function biquad(type, f0, q = Math.SQRT1_2, gainDb = 0) {
  const w = TAU * f0 / SR, c = Math.cos(w), s = Math.sin(w), al = s / (2 * q), A = 10 ** (gainDb / 40), sq = 2 * Math.sqrt(A) * al;
  let b0, b1, b2, a0, a1, a2;
  if (type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = b0; a0 = 1 + al; a1 = -2 * c; a2 = 1 - al; }
  else if (type === 'hp') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = b0; a0 = 1 + al; a1 = -2 * c; a2 = 1 - al; }
  else if (type === 'peak') { b0 = 1 + al * A; b1 = -2 * c; b2 = 1 - al * A; a0 = 1 + al / A; a1 = -2 * c; a2 = 1 - al / A; }
  else if (type === 'lowshelf') {
    b0 = A * (A + 1 - (A - 1) * c + sq); b1 = 2 * A * (A - 1 - (A + 1) * c); b2 = A * (A + 1 - (A - 1) * c - sq);
    a0 = A + 1 + (A - 1) * c + sq; a1 = -2 * (A - 1 + (A + 1) * c); a2 = A + 1 + (A - 1) * c - sq;
  } else if (type === 'highshelf') {
    b0 = A * (A + 1 + (A - 1) * c + sq); b1 = -2 * A * (A - 1 + (A + 1) * c); b2 = A * (A + 1 + (A - 1) * c - sq);
    a0 = A + 1 - (A - 1) * c + sq; a1 = 2 * (A - 1 - (A + 1) * c); a2 = A + 1 - (A - 1) * c - sq;
  } else throw new Error(`unknown biquad ${type}`);
  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
}
export function runBiquads(x, stages) {
  for (const { b0, b1, b2, a1, a2 } of stages) {
    let z1 = 0, z2 = 0;
    for (let i = 0; i < x.length; i++) {
      const v = x[i], y = b0 * v + z1;
      z1 = b1 * v - a1 * y + z2;
      z2 = b2 * v - a2 * y;
      x[i] = y;
    }
  }
  return x;
}
export function eqStereo(bus, stages) {
  runBiquads(bus.L, stages);
  runBiquads(bus.R, stages);
  return bus;
}

export function freeverb(input, { room = 0.6, damp = 0.5, width = 1, predelay = 0.012 } = {}) {
  const combTunings = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617], allpassTunings = [556, 441, 341, 225], spread = 23;
  const feedback = room * 0.28 + 0.7, damp1 = damp * 0.4, damp2 = 1 - damp1;
  const n = input.L.length, pre = toSamples(predelay);
  const wet = [new Float32Array(n), new Float32Array(n)];
  for (let ch = 0; ch < 2; ch++) {
    const combs = combTunings.map(len => ({ buf: new Float32Array(len + ch * spread), idx: 0, store: 0 }));
    const allpasses = allpassTunings.map(len => ({ buf: new Float32Array(len + ch * spread), idx: 0 }));
    const out = wet[ch];
    for (let i = 0; i < n; i++) {
      const j = i - pre, x = j >= 0 ? (input.L[j] + input.R[j]) * 0.015 : 0;
      let acc = 0;
      for (const c of combs) {
        const y = c.buf[c.idx];
        c.store = y * damp2 + c.store * damp1;
        c.buf[c.idx] = x + c.store * feedback;
        if (++c.idx === c.buf.length) c.idx = 0;
        acc += y;
      }
      for (const a of allpasses) {
        const y = a.buf[a.idx];
        a.buf[a.idx] = acc + y * 0.5;
        if (++a.idx === a.buf.length) a.idx = 0;
        acc = y - acc;
      }
      out[i] = acc * 3;
    }
  }
  const w1 = width / 2 + 0.5, w2 = (1 - width) / 2, L = new Float32Array(n), R = new Float32Array(n);
  for (let i = 0; i < n; i++) { L[i] = wet[0][i] * w1 + wet[1][i] * w2; R[i] = wet[1][i] * w1 + wet[0][i] * w2; }
  return { L, R };
}

function kWeighting() {
  let f0 = 1681.974450955533, Q = 0.7071752369554196;
  const G = 3.999843853973347;
  let K = Math.tan(Math.PI * f0 / SR);
  const Vh = 10 ** (G / 20), Vb = Vh ** 0.4996667741545416;
  let a0 = 1 + K / Q + K * K;
  const shelf = { b0: (Vh + Vb * K / Q + K * K) / a0, b1: 2 * (K * K - Vh) / a0, b2: (Vh - Vb * K / Q + K * K) / a0, a1: 2 * (K * K - 1) / a0, a2: (1 - K / Q + K * K) / a0 };
  f0 = 38.13547087602444; Q = 0.5003270373238773; K = Math.tan(Math.PI * f0 / SR);
  a0 = 1 + K / Q + K * K;
  const highpass = { b0: 1, b1: -2, b2: 1, a1: 2 * (K * K - 1) / a0, a2: (1 - K / Q + K * K) / a0 };
  return [shelf, highpass];
}

export function loudness(L, R, { shortTermHop = 0.1 } = {}) {
  const stages = kWeighting();
  const kl = runBiquads(Float64Array.from(L), stages), kr = runBiquads(Float64Array.from(R), stages);
  const n = L.length, sums = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) sums[i + 1] = sums[i] + kl[i] * kl[i] + kr[i] * kr[i];
  const meanSquare = (a, len) => (sums[a + len] - sums[a]) / len;
  const toLufs = z => -0.691 + 10 * Math.log10(Math.max(z, 1e-20));
  const block = toSamples(0.4), hop = toSamples(0.1);
  const blocks = [];
  for (let a = 0; a + block <= n; a += hop) blocks.push(meanSquare(a, block));
  const aboveAbs = blocks.filter(z => toLufs(z) > -70);
  const relGate = aboveAbs.length ? toLufs(aboveAbs.reduce((s, z) => s + z, 0) / aboveAbs.length) - 10 : -70;
  const gated = aboveAbs.filter(z => toLufs(z) > relGate);
  const integrated = gated.length ? toLufs(gated.reduce((s, z) => s + z, 0) / gated.length) : -Infinity;
  const momentary = blocks.map(toLufs);
  const shortWin = toSamples(3), shortHop = toSamples(shortTermHop), shortTerm = [];
  for (let end = shortHop; end <= n; end += shortHop) {
    const start = Math.max(0, end - shortWin);
    shortTerm.push(toLufs((sums[end] - sums[start]) / (end - start)));
  }
  return { integrated, momentary, shortTerm, blockHop: 0.1, shortTermHop };
}

export function maxLoudness(L, R, windowSeconds = 0.4) {
  const stages = kWeighting();
  const kl = runBiquads(Float64Array.from(L), stages), kr = runBiquads(Float64Array.from(R), stages);
  const n = kl.length, block = toSamples(windowSeconds), hop = Math.max(1, toSamples(0.005)), sums = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) sums[i + 1] = sums[i] + kl[i] * kl[i] + kr[i] * kr[i];
  let best = 0;
  for (let start = 0; start === 0 || start + block <= n; start += hop) best = Math.max(best, sums[Math.min(n, start + block)] - sums[start]);
  return -0.691 + 10 * Math.log10(Math.max(best / block, 1e-20));
}

const OVERSAMPLE = 4, HALF_TAPS = 12;
const interpolationPhases = (() => {
  const phases = [];
  for (let p = 1; p < OVERSAMPLE; p++) {
    const taps = new Float64Array(2 * HALF_TAPS);
    let sum = 0;
    for (let j = 0; j < 2 * HALF_TAPS; j++) {
      const k = j - HALF_TAPS + 1, x = k - p / OVERSAMPLE, u = x / HALF_TAPS;
      const sinc = x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x);
      const win = Math.abs(u) >= 1 ? 0 : 0.35875 + 0.48829 * Math.cos(Math.PI * u) + 0.14128 * Math.cos(2 * Math.PI * u) + 0.01168 * Math.cos(3 * Math.PI * u);
      taps[j] = sinc * win;
      sum += taps[j];
    }
    for (let j = 0; j < taps.length; j++) taps[j] /= sum;
    phases.push(taps);
  }
  return phases;
})();

export function truePeakEnvelope(L, R) {
  const n = L.length, env = new Float32Array(n), pad = HALF_TAPS, width = 2 * HALF_TAPS;
  for (const x of [L, R]) {
    const padded = new Float64Array(n + 2 * pad);
    padded.set(x, pad);
    for (let i = 0; i < n; i++) {
      let m = Math.abs(x[i]);
      const base = i + 1;
      for (const taps of interpolationPhases) {
        let y = 0;
        for (let j = 0; j < width; j++) y += padded[base + j] * taps[j];
        const a = y < 0 ? -y : y;
        if (a > m) m = a;
      }
      if (m > env[i]) env[i] = m;
    }
  }
  return env;
}
export const truePeakDb = (L, R) => gainToDb(peak(truePeakEnvelope(L, R)));

function slidingMin(x, radius) {
  const n = x.length, out = new Float32Array(n), dq = new Int32Array(n + 2 * radius + 1);
  let head = 0, tail = 0;
  for (let i = 0; i < n + radius; i++) {
    if (i < n) {
      while (tail > head && x[dq[tail - 1]] >= x[i]) tail--;
      dq[tail++] = i;
    }
    const centre = i - radius;
    if (centre < 0) continue;
    while (dq[head] < centre - radius) head++;
    out[centre] = x[dq[head]];
  }
  return out;
}
function boxAverage(x, radius) {
  const n = x.length, out = new Float32Array(n), sums = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) sums[i + 1] = sums[i] + x[i];
  for (let i = 0; i < n; i++) {
    const a = i - radius, b = i + radius + 1;
    const lo = Math.max(0, a), hi = Math.min(n, b);
    out[i] = (sums[hi] - sums[lo] + (lo - a) * x[0] + (b - hi) * x[n - 1]) / (2 * radius + 1);
  }
  return out;
}
const softKneeDb = (x, ceiling, knee) =>
  x <= ceiling - knee / 2 ? x : x >= ceiling + knee / 2 ? ceiling : x - (x - ceiling + knee / 2) ** 2 / (2 * knee);

export function limiterGain(L, R, { ceilingDb = -2, kneeDb = 1.5, lookahead = 0.0015, release = 0.12 } = {}) {
  const env = truePeakEnvelope(L, R), n = env.length, need = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const level = gainToDb(env[i]);
    need[i] = dbToGain(softKneeDb(level, ceilingDb, kneeDb) - level);
  }
  const radius = toSamples(lookahead);
  const smoothNeed = boxAverage(slidingMin(need, radius), radius);
  const rise = 1 - Math.exp(-1 / (release * SR));
  const gain = new Float32Array(n);
  let g = 1;
  for (let i = 0; i < n; i++) {
    const target = smoothNeed[i];
    g = target <= g ? target : g + (target - g) * rise;
    gain[i] = g;
  }
  return gain;
}

export const FULL_SCALE_24 = 8388607;

export function wavHeader24(frames) {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + frames * 6, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(2, 22);
  header.writeUInt32LE(SR, 24);
  header.writeUInt32LE(SR * 6, 28);
  header.writeUInt16LE(6, 32);
  header.writeUInt16LE(24, 34);
  header.write('data', 36);
  header.writeUInt32LE(frames * 6, 40);
  return header;
}

export function writeWav24(path, L, R, seed = 1) {
  const n = L.length, data = Buffer.alloc(44 + n * 6), rng = makeRng(seed), full = FULL_SCALE_24;
  wavHeader24(n).copy(data, 0);
  const quantize = v => Math.max(-8388608, Math.min(full, Math.round(v * full + rng() - rng())));
  for (let i = 0; i < n; i++) {
    data.writeIntLE(quantize(L[i]), 44 + i * 6, 3);
    data.writeIntLE(quantize(R[i]), 47 + i * 6, 3);
  }
  writeFileSync(path, data);
}

export function readWav(path) {
  const buf = readFileSync(path);
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') throw new Error(`${path} is not a WAV file`);
  let pos = 12, fmt = null;
  while (pos + 8 <= buf.length) {
    const id = buf.toString('ascii', pos, pos + 4), size = buf.readUInt32LE(pos + 4), body = pos + 8;
    if (id === 'fmt ') fmt = { format: buf.readUInt16LE(body), channels: buf.readUInt16LE(body + 2), rate: buf.readUInt32LE(body + 4), bits: buf.readUInt16LE(body + 14) };
    if (id === 'data') {
      const bytes = fmt.bits / 8, frames = Math.floor(size / (bytes * fmt.channels));
      const chans = Array.from({ length: fmt.channels }, () => new Float32Array(frames));
      const fullScale = 2 ** (fmt.bits - 1);
      for (let i = 0; i < frames; i++) {
        for (let c = 0; c < fmt.channels; c++) chans[c][i] = buf.readIntLE(body + (i * fmt.channels + c) * bytes, bytes) / fullScale;
      }
      return { ...fmt, frames, channels: chans };
    }
    pos = body + size + (size & 1);
  }
  throw new Error(`${path} has no data chunk`);
}

export function compressor(bus, { thresholdDb, ratio = 3, kneeDb = 6, attack = 0.002, release = 0.12, lookahead = 0.002 }) {
  const n = bus.L.length, ahead = toSamples(lookahead);
  const attackCoef = Math.exp(-1 / (attack * SR)), releaseCoef = Math.exp(-1 / (release * SR)), slope = 1 / ratio - 1;
  let g = 0, deepest = 0;
  for (let i = 0; i < n; i++) {
    const j = Math.min(n - 1, i + ahead);
    const over = gainToDb(Math.max(Math.abs(bus.L[j]), Math.abs(bus.R[j]))) - thresholdDb;
    const target = over <= -kneeDb / 2 ? 0 : over >= kneeDb / 2 ? slope * over : slope * (over + kneeDb / 2) ** 2 / (2 * kneeDb);
    g = target < g ? attackCoef * g + (1 - attackCoef) * target : releaseCoef * g + (1 - releaseCoef) * target;
    if (g < deepest) deepest = g;
    const k = dbToGain(g);
    bus.L[i] *= k;
    bus.R[i] *= k;
  }
  return deepest;
}
