import { readFileSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import FFMPEG from 'ffmpeg-static';
import sharp from 'sharp';
import { readWav, loudness, gainToDb, SR, biquad, runBiquads, toSamples, peak } from './dsp.mjs';
import { EFFECTS } from './sfx.mjs';
import { SECTIONS, musicEventTimes, chordTonesBetween } from './score.mjs';
import { expandCues, renderSfx } from './mix.mjs';
import { INTRO_START, INTRO_SECONDS, INTRO_SECTIONS, INTRO_CHART, DROOP, whizzTime, renderIntroMusic } from './intro_score.mjs';
import { INTRO_EFFECTS } from './intro_sfx.mjs';

const here = dirname(fileURLToPath(import.meta.url)), root = resolve(here, '..'), outDir = resolve(root, 'out/audio');
mkdirSync(outDir, { recursive: true });
const asset = name => resolve(root, 'assets', name);
const cues = JSON.parse(readFileSync(resolve(here, 'cues.json'), 'utf8'));
const failures = [];
const check = (ok, label) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}`); if (!ok) failures.push(label); };

function ffmpeg(args) {
  const r = spawnSync(FFMPEG, ['-hide_banner', '-nostats', ...args], { encoding: 'utf8', maxBuffer: 64 << 20 });
  if (r.status !== 0) throw new Error(r.stderr);
  return r.stderr;
}

function ebur128Of(name) {
  const log = ffmpeg(['-i', asset(name), '-af', 'ebur128=peak=true', '-f', 'null', '-']);
  const summary = log.slice(log.lastIndexOf('Summary:'));
  return {
    I: Number(/I:\s+(-?[\d.]+) LUFS/.exec(summary)[1]),
    LRA: Number(/LRA:\s+(-?[\d.]+) LU/.exec(summary)[1]),
    TP: Number(/True peak:\s+Peak:\s+(-?[\d.]+) dBFS/.exec(summary)[1]),
    momentary: new Map([...log.matchAll(/t:\s*([\d.]+)\s+TARGET:\S+ LUFS\s+M:\s*(-?[\d.]+)/g)].map(m => [Math.round(Number(m[1]) * 10), Number(m[2])])),
  };
}

function checkAstats(name) {
  const st = ffmpeg(['-i', asset(name), '-af', 'astats=metadata=0', '-f', 'null', '-']);
  const overall = st.slice(st.lastIndexOf('Overall'));
  const field = label => Number(new RegExp(`${label}:\\s+(-?[\\d.e+-]+)`).exec(overall)?.[1]);
  const dc = field('DC offset'), pk = field('Peak level dB'), flat = field('Flat factor'), peaks = field('Peak count');
  check(Math.abs(dc) < 1e-4 && pk < -1 && flat === 0, `${name} astats: DC offset ${dc}, peak ${pk.toFixed(2)} dBFS, flat factor ${flat} (no clipped runs), peak count ${peaks}`);
}

console.log('— files');
const files = ['soundtrack.wav', 'music_only.wav', 'sfx_only.wav'].map(name => ({ name, wav: readWav(asset(name)) }));
for (const { name, wav } of files) check(wav.rate === 44100 && wav.channels.length === 2 && wav.bits === 24 && wav.frames === 66 * 44100, `${name}: ${wav.rate} Hz, ${wav.channels.length} ch, ${wav.bits}-bit, ${(wav.frames / wav.rate).toFixed(4)} s`);
const [mix, music, sfx] = files.map(f => f.wav.channels);
let stemError = 0;
for (let c = 0; c < 2; c++) for (let i = 0; i < mix[c].length; i++) stemError = Math.max(stemError, Math.abs(mix[c][i] - music[c][i] - sfx[c][i]));
check(stemError < 1e-5, `music_only + sfx_only = soundtrack within ${gainToDb(stemError).toFixed(1)} dBFS (dither)`);

console.log('— ffmpeg ebur128 / loudnorm / astats');
const { I, LRA, TP, momentary: filmMomentary } = ebur128Of('soundtrack.wav');
check(Math.abs(I + 16) <= 0.3, `ebur128 integrated ${I} LUFS (target -16)`);
check(TP <= -1.5, `ebur128 true peak ${TP} dBTP (limit -1.5), LRA ${LRA} LU`);
const ln = ffmpeg(['-i', asset('soundtrack.wav'), '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-']);
const loud = JSON.parse(ln.slice(ln.lastIndexOf('{'), ln.lastIndexOf('}') + 1));
check(Math.abs(Number(loud.input_i) + 16) <= 0.3 && Number(loud.input_tp) <= -1.5, `loudnorm input_i ${loud.input_i} LUFS, input_tp ${loud.input_tp} dBTP, input_lra ${loud.input_lra} LU, threshold ${loud.input_thresh}`);
for (const { name } of files) checkAstats(name);
const silenceLog = ffmpeg(['-i', asset('soundtrack.wav'), '-af', 'silencedetect=noise=-50dB:d=0.25', '-f', 'null', '-']);
const gaps = [...silenceLog.matchAll(/silence_start: (-?[\d.]+)/g)].map(m => Number(m[1]));
check(gaps.every(t => t > 65.5), `silence below -50 dBFS for 0.25 s+: ${gaps.length ? gaps.map(t => t.toFixed(2)).join(', ') : 'none'}`);

console.log('— ffmpeg pictures');
const pictures = [
  ['soundtrack.wav', 'spectrum_linear.png', 'showspectrumpic=s=1980x720:legend=1:fscale=lin:scale=log:drange=96'],
  ['soundtrack.wav', 'spectrum_log.png', 'showspectrumpic=s=1980x720:legend=1:fscale=log:scale=log:drange=96'],
  ['soundtrack.wav', 'waves_soundtrack.png', 'showwavespic=s=1980x400:split_channels=1:colors=0x4b3a8c|0x18b6f6'],
  ['music_only.wav', 'waves_music.png', 'showwavespic=s=1980x400:split_channels=1:colors=0x4b3a8c|0x18b6f6'],
  ['sfx_only.wav', 'waves_sfx.png', 'showwavespic=s=1980x400:split_channels=1:colors=0xe8763a|0xac7ef4'],
];
for (const [input, output, filter] of pictures) {
  ffmpeg(['-y', '-i', asset(input), '-lavfi', filter, '-frames:v', '1', resolve(outDir, output)]);
  console.log(`     out/audio/${output}`);
}

function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let size = 2; size <= n; size <<= 1) {
    const step = -2 * Math.PI / size;
    for (let start = 0; start < n; start += size) {
      for (let k = 0; k < size / 2; k++) {
        const wr = Math.cos(step * k), wi = Math.sin(step * k), a = start + k, b = a + size / 2;
        const tr = re[b] * wr - im[b] * wi, ti = re[b] * wi + im[b] * wr;
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
      }
    }
  }
}
function spectrogram([L, R], size = 2048, hop = 1470) {
  const window = Float64Array.from({ length: size }, (_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / size)), frames = [];
  for (let start = 0; start + size <= L.length; start += hop) {
    const re = new Float64Array(size), im = new Float64Array(size);
    for (let i = 0; i < size; i++) re[i] = 0.5 * (L[start + i] + R[start + i]) * window[i];
    fft(re, im);
    const power = new Float64Array(size / 2), norm = 4 / (size * size * 0.25);
    for (let k = 0; k < size / 2; k++) power[k] = (re[k] * re[k] + im[k] * im[k]) * norm;
    frames.push(power);
  }
  return { frames, size, hop };
}

console.log('— spectrum balance');
const spec = spectrogram(mix);
const binHz = SR / spec.size;
let total = 0, above8k = 0, above12k = 0;
for (const frame of spec.frames) for (let k = 1; k < frame.length; k++) { total += frame[k]; if (k * binHz > 8000) above8k += frame[k]; if (k * binHz > 12000) above12k += frame[k]; }
check(10 * Math.log10(above8k / total) < -30, `energy above 8 kHz ${(10 * Math.log10(above8k / total)).toFixed(1)} dB, above 12 kHz ${(10 * Math.log10(above12k / total)).toFixed(1)} dB relative to the whole`);
let worstRatio = -Infinity, worstRatioAt = 0, loudestHigh = -Infinity, loudestHighAt = 0;
spec.frames.forEach((frame, f) => {
  let all = 0, high = 0;
  for (let k = 1; k < frame.length; k++) { all += frame[k]; if (k * binHz > 8000) high += frame[k]; }
  const t = f * spec.hop / SR, highDb = 10 * Math.log10(high + 1e-20), ratio = 10 * Math.log10((high + 1e-20) / (all + 1e-20));
  if (highDb > loudestHigh) { loudestHigh = highDb; loudestHighAt = t; }
  if (10 * Math.log10(all + 1e-20) > -40 && ratio > worstRatio) { worstRatio = ratio; worstRatioAt = t; }
});
check(worstRatio < -20 && loudestHigh < -36, `per 33 ms frame: most energy above 8 kHz ${worstRatio.toFixed(1)} dB of the frame (${worstRatioAt.toFixed(2)} s), loudest above 8 kHz ${loudestHigh.toFixed(1)} dBFS (${loudestHighAt.toFixed(2)} s)`);

console.log('— effect onsets in sfx_only.wav');
function onsets([L, R]) {
  const frame = 256, hop = 64, energy = [];
  for (let s = 0; s + frame <= L.length; s += hop) {
    let e = 0;
    for (let i = s; i < s + frame; i++) e += L[i] * L[i] + R[i] * R[i];
    energy.push(10 * Math.log10(e / frame + 1e-12));
  }
  const rise = energy.map((e, k) => (k < 8 ? 0 : Math.max(0, e - Math.max(...energy.slice(k - 8, k - 3)))));
  const found = [];
  for (let k = 1; k < rise.length - 1; k++) {
    if (rise[k] < 6 || rise[k] < rise[k - 1] || rise[k] < rise[k + 1] || energy[k] < -60) continue;
    const t = (k * hop + frame / 2) / SR;
    if (found.length && t - found[found.length - 1].t < 0.04) { if (rise[k] > found[found.length - 1].rise) found[found.length - 1] = { t, rise: rise[k], level: energy[k] }; continue; }
    found.push({ t, rise: rise[k], level: energy[k] });
  }
  return found;
}
const detected = onsets(sfx);
const gradualOnsets = new Set(['skid', 'lipSmack', 'paintSwish', 'slideIn', 'underlineSwish', 'whip', 'tubeTravel', 'iris', 'paperSlide', 'whooshBack', 'paperClose', 'sparkHum', 'snailSetOff', 'snailArrive', 'clockWhizz', 'clockWhizzLong', 'snore', 'yawn', 'windUp', 'squeeze', 'armUnroll', 'sparkWhoosh', 'wipeBrow', 'stretchZip', 'scramble', 'confetti', 'puffOut', 'armsBoing']);
function hitsOffTime(cueList, found, gradual) {
  const hits = cueList.filter(cue => !gradual.has(cue.name)), late = [];
  for (const cue of hits) {
    const near = found.reduce((best, o) => (Math.abs(o.t - cue.t) < Math.abs(best.t - cue.t) ? o : best), { t: Infinity });
    const offset = near.t - cue.t;
    if (Math.abs(offset) > 0.025) late.push(`${cue.name}@${cue.t} (${Number.isFinite(offset) ? (offset * 1000).toFixed(0) + ' ms' : 'none'})`);
  }
  return { hitCount: hits.length, late };
}
const { hitCount, late } = hitsOffTime(cues, detected, gradualOnsets);
check(late.length === 0, `${hitCount - late.length}/${hitCount} hit cues have an onset within 25 ms${late.length ? ': off ' + late.join(', ') : ''}`);
const unexplainedOnsets = (found, cueList, effects) => found.filter(o => o.level > -40 && !cueList.some(c => o.t >= c.t - (effects[c.name].anchor ?? 0) - 0.03 && o.t <= c.t - (effects[c.name].anchor ?? 0) + effects[c.name].dur + 0.3));
const unexplained = unexplainedOnsets(detected, cues, EFFECTS);
check(unexplained.length === 0, `onsets above -40 dBFS outside every cue (and its 0.3 s reverb tail): ${unexplained.length ? unexplained.map(o => o.t.toFixed(3)).join(', ') : 'none'}`);

console.log('— clicks and timing');
function highBandTransients(channels) {
  const found = [];
  for (const x of channels) {
    const y = runBiquads(Float32Array.from(x), [biquad('hp', 9000), biquad('hp', 9000)]), n = y.length, win = 1024, sums = new Float64Array(n + 1);
    for (let i = 0; i < n; i++) sums[i + 1] = sums[i] + y[i] * y[i];
    for (let i = win; i < n - win; i++) {
      const v = Math.abs(y[i]);
      if (v < 3e-4) continue;
      const around = Math.sqrt((sums[i - 16] - sums[i - win] + sums[i + win] - sums[i + 16]) / (2 * win - 32));
      if (v > 12 * around && !found.some(t => Math.abs(t - i / SR) < 0.02)) found.push(i / SR);
    }
  }
  return found.sort((a, b) => a - b);
}
const events = musicEventTimes();
const musicTransients = highBandTransients(music);
const strayMusic = musicTransients.filter(t => !events.some(e => t >= e - 0.005 && t <= e + 0.06));
check(strayMusic.length === 0, `music_only: ${musicTransients.length} sharp high-band transients, ${strayMusic.length} away from a scheduled note or hit${strayMusic.length ? ': ' + strayMusic.map(t => t.toFixed(3)).join(', ') : ''}`);
const sfxTransients = highBandTransients(sfx);
const spanOf = c => [c.t - (EFFECTS[c.name].anchor ?? 0), c.t - (EFFECTS[c.name].anchor ?? 0) + EFFECTS[c.name].dur];
const straySfx = sfxTransients.filter(t => !cues.some(c => { const [a, b] = spanOf(c); return t >= a - 0.005 && t <= b; }));
check(straySfx.length === 0, `sfx_only: ${sfxTransients.length} sharp high-band transients, ${straySfx.length} outside a cue${straySfx.length ? ': ' + straySfx.map(t => t.toFixed(3)).join(', ') : ''}`);
const grids = [0.125, 1 / 6, 1 / 16, 1 / 24];
const musicHits = onsets(music);
const onGrid = musicHits.filter(o => grids.some(g => Math.abs(o.t / g - Math.round(o.t / g)) * g < 0.02));
check(onGrid.length / musicHits.length > 0.95, `music onsets on the 120 BPM grid (16ths, triplets, rolls) within 20 ms: ${onGrid.length}/${musicHits.length}`);

console.log('— harmony (music_only.wav)');
const SCALE = [0, 2, 4, 5, 7, 9, 11];
function checkHarmony(channels, starts, chordTonesAt, label) {
  let peakEnergy = 0, inTune = 0, inScale = 0, inChord = 0;
  for (const t of starts) {
    const start = Math.round(t * SR), re = new Float64Array(8192), im = new Float64Array(8192);
    for (let i = 0; i < 8192; i++) re[i] = 0.5 * (channels[0][start + i] + channels[1][start + i]) * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / 8192));
    fft(re, im);
    const mag = Array.from({ length: 4096 }, (_, k) => re[k] * re[k] + im[k] * im[k]), top = Math.max(...mag);
    const chordPcs = new Set(chordTonesAt(t).map(hz => ((Math.round(69 + 12 * Math.log2(hz / 440)) % 12) + 12) % 12));
    for (let k = 2; k < 4095; k++) {
      if (!(mag[k] > mag[k - 1] && mag[k] >= mag[k + 1]) || mag[k] < top / 100) continue;
      const y0 = Math.log(mag[k - 1]), y1 = Math.log(mag[k]), y2 = Math.log(mag[k + 1]), hz = (k + 0.5 * (y0 - y2) / (y0 - 2 * y1 + y2)) * SR / 8192;
      if (hz < 60 || hz > 2200) continue;
      const m = 69 + 12 * Math.log2(hz / 440), pc = ((Math.round(m) % 12) + 12) % 12;
      peakEnergy += mag[k];
      if (Math.abs(m - Math.round(m)) <= 0.15) inTune += mag[k];
      if (SCALE.includes(pc)) inScale += mag[k];
      if (chordPcs.has(pc)) inChord += mag[k];
    }
  }
  check(inTune / peakEnergy > 0.97 && inScale / peakEnergy > 0.97, `${label}: ${(100 * inTune / peakEnergy).toFixed(1)}% within 15 cents of a semitone, ${(100 * inScale / peakEnergy).toFixed(1)}% on C major scale tones, ${(100 * inChord / peakEnergy).toFixed(1)}% on the current chord`);
}
const filmWindows = [];
for (let t = 0; t + 8192 / SR < 66; t += 0.25) filmWindows.push(t);
checkHarmony(music, filmWindows, t => chordTonesBetween(t + 0.09, 60, 130), 'spectral peaks 60 Hz–2.2 kHz');

console.log('— sections (music_only.wav)');
const musicLevels = loudness(...music);
const musicOnsets = onsets(music);
const musicSpec = spectrogram(music);
const bounds = [...SECTIONS.map(([t]) => t), 66];
console.log('   start   end   momentary LUFS (mean)  onsets/s  centroid Hz  section');
for (let s = 0; s < SECTIONS.length; s++) {
  const a = bounds[s], b = bounds[s + 1];
  const blocks = musicLevels.momentary.slice(Math.floor(a / 0.1), Math.max(Math.floor(a / 0.1) + 1, Math.floor((b - 0.4) / 0.1)));
  const mean = 10 * Math.log10(blocks.reduce((sum, l) => sum + 10 ** (l / 10), 0) / blocks.length);
  const rate = musicOnsets.filter(o => o.t >= a && o.t < b).length / (b - a);
  let num = 0, den = 0;
  musicSpec.frames.slice(Math.floor(a * SR / 1470), Math.floor(b * SR / 1470)).forEach(frame => frame.forEach((p, k) => { num += p * k * binHz; den += p; }));
  console.log(`   ${a.toFixed(1).padStart(5)} ${b.toFixed(1).padStart(5)}   ${mean.toFixed(1).padStart(8)}               ${rate.toFixed(1).padStart(5)}    ${(num / den).toFixed(0).padStart(6)}     ${SECTIONS[s][1]}`);
}

async function annotate({ spec, start = 0, seconds, sections, cues, curves, file }) {
  const W = 1980, specH = 520, curveH = 220, H = specH + curveH, pxPerSecond = W / seconds, x = t => (t - start) * pxPerSecond;
  const pixels = Buffer.alloc(W * H * 3);
  const fLo = 40, fHi = 16000, ramp = v => [Math.min(255, 40 + 330 * v), Math.min(255, 20 + 260 * v * v), Math.min(255, 70 + 180 * v - 120 * v * v)];
  for (let px = 0; px < W; px++) {
    const frame = spec.frames[Math.min(spec.frames.length - 1, Math.floor(px / pxPerSecond * SR / spec.hop))];
    for (let y = 0; y < specH; y++) {
      const f = fLo * (fHi / fLo) ** (1 - y / specH), k = Math.max(1, Math.round(f / binHz));
      const db = 10 * Math.log10(frame[k] + 1e-12);
      const [r, g, b] = ramp(Math.max(0, Math.min(1, (db + 85) / 75)));
      const o = (y * W + px) * 3;
      pixels[o] = r; pixels[o + 1] = g; pixels[o + 2] = b;
    }
    for (let y = specH; y < H; y++) { const o = (y * W + px) * 3; pixels[o] = 250; pixels[o + 1] = 246; pixels[o + 2] = 238; }
  }
  const curveY = l => specH + 10 + (curveH - 20) * (1 - Math.max(0, Math.min(1, (l + 50) / 45)));
  const path = (series, offset) => series.map((l, k) => `${k ? 'L' : 'M'}${x(start + offset + k * 0.1 + 0.2).toFixed(1)},${curveY(l).toFixed(1)}`).join('');
  const ticks = [];
  for (let s = Math.ceil(start / 2) * 2; s < start + seconds; s += 2) ticks.push(s);
  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg" font-family="Helvetica, Arial, sans-serif">
  ${sections.map(([t, label], i) => `<line x1="${x(t)}" y1="0" x2="${x(t)}" y2="${H}" stroke="#ffffff" stroke-opacity="0.75" stroke-width="1.5"/>
  <text x="${x(t) + 3}" y="${specH + curveH - 8 - (i % 3) * 14}" font-size="12" fill="#2b2233">${label}</text>`).join('')}
  ${cues.map(c => `<line x1="${x(c.t)}" y1="0" x2="${x(c.t)}" y2="14" stroke="#ffd27a" stroke-width="1.5"/>`).join('')}
  ${[-40, -30, -20, -10].map(l => `<line x1="0" y1="${curveY(l)}" x2="${W}" y2="${curveY(l)}" stroke="#2b2233" stroke-opacity="0.15"/><text x="2" y="${curveY(l) - 2}" font-size="11" fill="#2b2233">${l} LUFS</text>`).join('')}
  ${curves.map(({ series, offset = 0, color, width }) => `<path d="${path(series, offset)}" fill="none" stroke="${color}" stroke-width="${width}"/>`).join('')}
  ${ticks.map(s => `<text x="${x(s) + 2}" y="${specH - 4}" font-size="11" fill="#ffffff">${s}</text>`).join('')}
  ${curves.map(({ color, label }, i) => `<text x="${W - 420 + 190 * i}" y="${specH + 22}" font-size="13" fill="${color}">${label}</text>`).join('')}
</svg>`;
  await sharp(pixels, { raw: { width: W, height: H, channels: 3 } }).composite([{ input: Buffer.from(svg) }]).png().toFile(resolve(outDir, file));
}

console.log('— annotated picture');
await annotate({
  spec, seconds: 66, sections: SECTIONS, cues,
  curves: [
    { series: musicLevels.momentary, color: '#4b3a8c', width: 1.6, label: 'music momentary loudness' },
    { series: loudness(...sfx).momentary, color: '#e8763a', width: 1.3, label: 'effects momentary loudness' },
  ],
  file: 'annotated.png',
});
console.log('     out/audio/annotated.png (log-frequency spectrogram 40 Hz–16 kHz, cue ticks on top, section lines)');

console.log('— intro: files and join');
const introCues = expandCues(JSON.parse(readFileSync(resolve(here, 'intro_cues.json'), 'utf8')));
const introFrames = toSamples(INTRO_SECONDS), filmFrames = files[0].wav.frames, joinAt = INTRO_SECONDS;
const introWav = readWav(asset('intro.wav')), fullWav = readWav(asset('soundtrack_full.wav'));
for (const [name, wav, frames] of [['intro.wav', introWav, introFrames], ['soundtrack_full.wav', fullWav, introFrames + filmFrames]]) {
  check(wav.rate === 44100 && wav.channels.length === 2 && wav.bits === 24 && wav.frames === frames, `${name}: ${wav.rate} Hz, ${wav.channels.length} ch, ${wav.bits}-bit, ${(wav.frames / wav.rate).toFixed(4)} s`);
}
const dataOf = name => readFileSync(asset(name)).subarray(44);
const introData = dataOf('intro.wav'), filmData = dataOf('soundtrack.wav'), fullData = dataOf('soundtrack_full.wav');
check(fullData.subarray(0, introData.length).equals(introData), 'soundtrack_full.wav opens with intro.wav, byte for byte');
let tailFrames = 0;
for (let i = 0; i < Math.min(filmFrames, toSamples(3)); i++) {
  if (fullData.compare(filmData, i * 6, i * 6 + 6, introData.length + i * 6, introData.length + i * 6 + 6)) tailFrames = i + 1;
}
const restIsFilm = fullData.subarray(introData.length + tailFrames * 6).equals(filmData.subarray(tailFrames * 6));
check(restIsFilm && tailFrames <= toSamples(1), `the intro's tail covers the film's first ${(tailFrames / SR).toFixed(3)} s; from there soundtrack_full.wav is soundtrack.wav byte for byte`);
const slice = (channels, from, to) => channels.map(x => x.subarray(toSamples(from), toSamples(to)));
const tail = fullWav.channels.map((x, c) => Float32Array.from({ length: tailFrames }, (_, i) => x[introFrames + i] - mix[c][i]));
const tailLevels = loudness(...tail).momentary, underTail = loudness(...slice(mix, 0, tailFrames / SR)).momentary;
const tailMargin = Math.min(...tailLevels.map((l, k) => underTail[k] - l));
check(tailMargin >= 8, `tail: loudest 400 ms ${Math.max(...tailLevels).toFixed(1)} LUFS, peak ${gainToDb(Math.max(...tail.map(peak))).toFixed(1)} dBFS, at least ${tailMargin.toFixed(1)} LU under the film`);

const fullEbu = ebur128Of('soundtrack_full.wav'), introEbu = ebur128Of('intro.wav');
check(fullEbu.TP <= -1.5, `soundtrack_full.wav ebur128: integrated ${fullEbu.I} LUFS, true peak ${fullEbu.TP} dBTP (limit -1.5), LRA ${fullEbu.LRA} LU`);
check(introEbu.TP <= -1.5, `intro.wav ebur128: integrated ${introEbu.I} LUFS, true peak ${introEbu.TP} dBTP, LRA ${introEbu.LRA} LU`);
const filmOpening = loudness(...slice(mix, 0, 6)).integrated;
check(Math.abs(introEbu.I - filmOpening) <= 4, `intro ${introEbu.I} LUFS against ${filmOpening.toFixed(1)} LUFS for the film's first 6 s`);
const powerMean = levels => 10 * Math.log10(levels.reduce((sum, l) => sum + 10 ** (l / 10), 0) / levels.length);
const momentaryAt = (k0, k1) => Array.from({ length: k1 - k0 + 1 }, (_, i) => fullEbu.momentary.get(k0 + i));
const beforeJoin = powerMean(momentaryAt(joinAt * 10 - 6, joinAt * 10)), afterJoin = powerMean(momentaryAt(joinAt * 10 + 4, joinAt * 10 + 10));
check(Math.abs(afterJoin - beforeJoin) <= 3, `momentary across the join: ${beforeJoin.toFixed(1)} LUFS over the intro's last second, ${afterJoin.toFixed(1)} LUFS over the film's first`);
console.log('     story s   M full   M soundtrack.wav alone   (ebur128, 400 ms ending at t)');
for (let k = joinAt * 10 - 20; k <= joinAt * 10 + 20; k += 2) {
  const alone = k >= joinAt * 10 + 4 ? filmMomentary.get(k - joinAt * 10).toFixed(1).padStart(9) : '';
  console.log(`     ${((k - joinAt * 10) / 10).toFixed(1).padStart(6)}  ${fullEbu.momentary.get(k).toFixed(1).padStart(7)}  ${alone}`);
}
for (const name of ['intro.wav', 'soundtrack_full.wav']) checkAstats(name);

const nearJoin = highBandTransients(slice(fullWav.channels, joinAt - 1, joinAt + 1)).map(t => t + joinAt - 1).filter(t => Math.abs(t - joinAt) < 0.03);
const stepAt = (x, i) => Math.abs(x[i] - x[i - 1]);
const joinStep = Math.max(...fullWav.channels.map(x => stepAt(x, introFrames)));
const nearbyStep = Math.max(...fullWav.channels.map(x => {
  let largest = 0;
  for (let i = introFrames - toSamples(0.01); i <= introFrames + toSamples(0.01); i++) if (i !== introFrames) largest = Math.max(largest, stepAt(x, i));
  return largest;
}));
check(nearJoin.length === 0 && joinStep <= nearbyStep, `join: ${nearJoin.length} sharp high-band transients within 30 ms; sample step ${gainToDb(joinStep).toFixed(1)} dBFS, largest within 10 ms ${gainToDb(nearbyStep).toFixed(1)} dBFS`);

console.log('— intro: effect timing (the effects rendered alone) and tone (intro.wav)');
const introGradual = new Set([...gradualOnsets, 'handGlide', 'barGlow', 'slipFlutter', 'snailYawn', 'crawlSquish', 'portholeSqueeze', 'pushIn', 'spinnerTick']);
const { bus: introSfx } = renderSfx(introCues, INTRO_SECONDS, { effects: INTRO_EFFECTS, origin: INTRO_START, chart: INTRO_CHART, source: 'intro_cues.json' });
const introOnsets = onsets([introSfx.L, introSfx.R]).map(o => ({ ...o, t: o.t + INTRO_START }));
const introTiming = hitsOffTime(introCues, introOnsets, introGradual);
check(introTiming.late.length === 0, `${introTiming.hitCount - introTiming.late.length}/${introTiming.hitCount} intro hit cues have an onset within 25 ms${introTiming.late.length ? ': off ' + introTiming.late.join(', ') : ''}`);
const introStray = unexplainedOnsets(introOnsets, introCues, INTRO_EFFECTS);
check(introStray.length === 0, `intro onsets above -40 dBFS outside every cue: ${introStray.length ? introStray.map(o => o.t.toFixed(3)).join(', ') : 'none'}`);
const whizzAt = whizzTime(introCues), introMusic = renderIntroMusic(INTRO_SECONDS, { whizzAt }), introWindows = [];
for (let t = INTRO_START; t + 8192 / SR < INTRO_START + INTRO_SECONDS; t += 0.125) if (t + 8192 / SR < DROOP.from || t > whizzAt + DROOP.fadeOut) introWindows.push(t - INTRO_START);
checkHarmony([introMusic.L, introMusic.R], introWindows, t => chordTonesBetween(t + INTRO_START + 0.09, 60, 130, INTRO_CHART), `intro music peaks 60 Hz–2.2 kHz outside the droop (${DROOP.from} to ${whizzAt + DROOP.fadeOut} s)`);
const balance = channels => {
  const { frames } = spectrogram(channels), bands = [0, 200, 800, 3000, 8000, Infinity], energy = bands.slice(1).map(() => 0);
  let weighted = 0, total = 0;
  for (const frame of frames) for (let k = 1; k < frame.length; k++) {
    const hz = k * binHz;
    energy[bands.findIndex((edge, b) => hz >= edge && hz < bands[b + 1])] += frame[k];
    weighted += frame[k] * hz;
    total += frame[k];
  }
  return { shares: energy.map(e => 10 * Math.log10(e / total)), centroid: weighted / total };
};
const introTone = balance(introWav.channels), openingTone = balance(slice(mix, 0, 6));
const bandNames = ['<200 Hz', '200–800', '800–3k', '3k–8k', '>8k'];
console.log(`     band share dB   ${bandNames.map(b => b.padStart(8)).join('')}   centroid`);
for (const [label, tone] of [['intro', introTone], ['film 0–6 s', openingTone]]) {
  console.log(`     ${label.padEnd(15)} ${tone.shares.map(s => s.toFixed(1).padStart(8)).join('')}   ${tone.centroid.toFixed(0)} Hz`);
}
check(introTone.shares[4] < -30, `intro energy above 8 kHz ${introTone.shares[4].toFixed(1)} dB of the whole (film opening ${openingTone.shares[4].toFixed(1)} dB)`);
const introLevels = loudness(...introWav.channels).momentary;
console.log('   start   end   momentary LUFS (mean)  section');
INTRO_SECTIONS.forEach(([a, label], s) => {
  const b = INTRO_SECTIONS[s + 1]?.[0] ?? 0, from = Math.round((a - INTRO_START) * 10), to = Math.max(from + 1, Math.round((b - INTRO_START - 0.4) * 10));
  console.log(`   ${a.toFixed(1).padStart(5)} ${b.toFixed(1).padStart(5)}   ${powerMean(introLevels.slice(from, to)).toFixed(1).padStart(8)}               ${label}`);
});

console.log('— intro: pictures');
const introPictures = [
  ['intro.wav', 'intro_spectrum.png', 'showspectrumpic=s=1280x540:legend=1:fscale=log:scale=log:drange=96'],
  ['intro.wav', 'intro_waves.png', 'showwavespic=s=1280x300:split_channels=1:colors=0x4b3a8c|0x18b6f6'],
  ['soundtrack_full.wav', 'intro_join_spectrum.png', `atrim=${joinAt - 4}:${joinAt + 4},asetpts=PTS-STARTPTS,showspectrumpic=s=1280x540:legend=1:fscale=log:scale=log:drange=96`],
  ['soundtrack_full.wav', 'intro_join_waves.png', `atrim=${joinAt - 1}:${joinAt + 1},asetpts=PTS-STARTPTS,showwavespic=s=1280x300:split_channels=1:colors=0x4b3a8c|0x18b6f6`],
  ['soundtrack_full.wav', 'intro_full_waves.png', 'showwavespic=s=1980x300:split_channels=1:colors=0x4b3a8c|0x18b6f6'],
];
for (const [input, output, filter] of introPictures) {
  ffmpeg(['-y', '-i', asset(input), '-lavfi', filter, '-frames:v', '1', resolve(outDir, output)]);
  console.log(`     out/audio/${output}`);
}
const shown = 14, fullOpening = slice(fullWav.channels, 0, shown), storyEnd = INTRO_START + shown;
await annotate({
  spec: spectrogram(fullOpening), start: INTRO_START, seconds: shown,
  sections: [...INTRO_SECTIONS, ...SECTIONS.filter(([t]) => t < storyEnd)],
  cues: [...introCues, ...cues.filter(c => c.t < storyEnd)],
  curves: [
    { series: loudness(...fullOpening).momentary, color: '#4b3a8c', width: 1.6, label: 'soundtrack_full momentary' },
    { series: loudness(...slice(mix, 0, storyEnd)).momentary, offset: -INTRO_START, color: '#e8763a', width: 1.3, label: 'soundtrack.wav alone' },
  ],
  file: 'intro_annotated.png',
});
console.log(`     out/audio/intro_annotated.png (story ${INTRO_START} to ${storyEnd} s: spectrogram, cue ticks, momentary loudness)`);

console.log(failures.length ? `\n${failures.length} check(s) failed` : '\nall checks passed');
process.exitCode = failures.length ? 1 : 0;
