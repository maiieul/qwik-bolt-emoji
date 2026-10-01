import { readFileSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import FFMPEG from 'ffmpeg-static';
import sharp from 'sharp';
import { readWav, loudness, gainToDb, SR, biquad, runBiquads } from './dsp.mjs';
import { EFFECTS } from './sfx.mjs';
import { SECTIONS, musicEventTimes, chordTonesBetween } from './score.mjs';

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

console.log('— files');
const files = ['soundtrack.wav', 'music_only.wav', 'sfx_only.wav'].map(name => ({ name, wav: readWav(asset(name)) }));
for (const { name, wav } of files) check(wav.rate === 44100 && wav.channels.length === 2 && wav.bits === 24 && wav.frames === 66 * 44100, `${name}: ${wav.rate} Hz, ${wav.channels.length} ch, ${wav.bits}-bit, ${(wav.frames / wav.rate).toFixed(4)} s`);
const [mix, music, sfx] = files.map(f => f.wav.channels);
let stemError = 0;
for (let c = 0; c < 2; c++) for (let i = 0; i < mix[c].length; i++) stemError = Math.max(stemError, Math.abs(mix[c][i] - music[c][i] - sfx[c][i]));
check(stemError < 1e-5, `music_only + sfx_only = soundtrack within ${gainToDb(stemError).toFixed(1)} dBFS (dither)`);

console.log('— ffmpeg ebur128 / loudnorm / astats');
const ebu = ffmpeg(['-i', asset('soundtrack.wav'), '-af', 'ebur128=peak=true', '-f', 'null', '-']);
const summary = ebu.slice(ebu.lastIndexOf('Summary:'));
const I = Number(/I:\s+(-?[\d.]+) LUFS/.exec(summary)[1]), LRA = Number(/LRA:\s+(-?[\d.]+) LU/.exec(summary)[1]);
const TP = Number(/True peak:\s+Peak:\s+(-?[\d.]+) dBFS/.exec(summary)[1]);
check(Math.abs(I + 16) <= 0.3, `ebur128 integrated ${I} LUFS (target -16)`);
check(TP <= -1.5, `ebur128 true peak ${TP} dBTP (limit -1.5), LRA ${LRA} LU`);
const ln = ffmpeg(['-i', asset('soundtrack.wav'), '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-']);
const loud = JSON.parse(ln.slice(ln.lastIndexOf('{'), ln.lastIndexOf('}') + 1));
check(Math.abs(Number(loud.input_i) + 16) <= 0.3 && Number(loud.input_tp) <= -1.5, `loudnorm input_i ${loud.input_i} LUFS, input_tp ${loud.input_tp} dBTP, input_lra ${loud.input_lra} LU, threshold ${loud.input_thresh}`);
for (const { name } of files) {
  const st = ffmpeg(['-i', asset(name), '-af', 'astats=metadata=0', '-f', 'null', '-']);
  const overall = st.slice(st.lastIndexOf('Overall'));
  const field = label => Number(new RegExp(`${label}:\\s+(-?[\\d.e+-]+)`).exec(overall)?.[1]);
  const dc = field('DC offset'), pk = field('Peak level dB'), flat = field('Flat factor'), peaks = field('Peak count');
  check(Math.abs(dc) < 1e-4 && pk < -1 && flat === 0, `${name} astats: DC offset ${dc}, peak ${pk.toFixed(2)} dBFS, flat factor ${flat} (no clipped runs), peak count ${peaks}`);
}
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
let hitCount = 0, hitsOnTime = 0;
const late = [];
for (const cue of cues) {
  if (gradualOnsets.has(cue.name)) continue;
  hitCount++;
  const near = detected.reduce((best, o) => (Math.abs(o.t - cue.t) < Math.abs(best.t - cue.t) ? o : best), { t: Infinity });
  const offset = near.t - cue.t;
  if (Math.abs(offset) <= 0.025) hitsOnTime++;
  else late.push(`${cue.name}@${cue.t} (${Number.isFinite(offset) ? (offset * 1000).toFixed(0) + ' ms' : 'none'})`);
}
check(hitsOnTime === hitCount, `${hitsOnTime}/${hitCount} hit cues have an onset within 25 ms${late.length ? ': off ' + late.join(', ') : ''}`);
const unexplained = detected.filter(o => o.level > -40 && !cues.some(c => o.t >= c.t - (EFFECTS[c.name].anchor ?? 0) - 0.03 && o.t <= c.t - (EFFECTS[c.name].anchor ?? 0) + EFFECTS[c.name].dur + 0.3));
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
let peakEnergy = 0, inTune = 0, inScale = 0, inChord = 0;
for (let t = 0; t + 8192 / SR < 66; t += 0.25) {
  const start = Math.round(t * SR), re = new Float64Array(8192), im = new Float64Array(8192);
  for (let i = 0; i < 8192; i++) re[i] = 0.5 * (music[0][start + i] + music[1][start + i]) * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / 8192));
  fft(re, im);
  const mag = Array.from({ length: 4096 }, (_, k) => re[k] * re[k] + im[k] * im[k]), top = Math.max(...mag);
  const chordPcs = new Set(chordTonesBetween(t + 0.09, 60, 130).map(hz => ((Math.round(69 + 12 * Math.log2(hz / 440)) % 12) + 12) % 12));
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
check(inTune / peakEnergy > 0.97 && inScale / peakEnergy > 0.97, `spectral peaks 60 Hz–2.2 kHz: ${(100 * inTune / peakEnergy).toFixed(1)}% within 15 cents of a semitone, ${(100 * inScale / peakEnergy).toFixed(1)}% on C major scale tones, ${(100 * inChord / peakEnergy).toFixed(1)}% on the current chord`);

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

console.log('— annotated picture');
const W = 1980, specH = 520, curveH = 220, H = specH + curveH, pxPerSecond = W / 66;
const pixels = Buffer.alloc(W * H * 3);
const fLo = 40, fHi = 16000, ramp = v => [Math.min(255, 40 + 330 * v), Math.min(255, 20 + 260 * v * v), Math.min(255, 70 + 180 * v - 120 * v * v)];
for (let x = 0; x < W; x++) {
  const frame = spec.frames[Math.min(spec.frames.length - 1, Math.floor(x / pxPerSecond * SR / spec.hop))];
  for (let y = 0; y < specH; y++) {
    const f = fLo * (fHi / fLo) ** (1 - y / specH), k = Math.max(1, Math.round(f / binHz));
    const db = 10 * Math.log10(frame[k] + 1e-12);
    const [r, g, b] = ramp(Math.max(0, Math.min(1, (db + 85) / 75)));
    const o = (y * W + x) * 3;
    pixels[o] = r; pixels[o + 1] = g; pixels[o + 2] = b;
  }
  for (let y = specH; y < H; y++) { const o = (y * W + x) * 3; pixels[o] = 250; pixels[o + 1] = 246; pixels[o + 2] = 238; }
}
const sfxLevels = loudness(...sfx);
const curveY = l => specH + 10 + (curveH - 20) * (1 - Math.max(0, Math.min(1, (l + 50) / 45)));
const path = series => series.map((l, k) => `${k ? 'L' : 'M'}${((k * 0.1 + 0.2) * pxPerSecond).toFixed(1)},${curveY(l).toFixed(1)}`).join('');
const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg" font-family="Helvetica, Arial, sans-serif">
  ${SECTIONS.map(([t, label], i) => `<line x1="${t * pxPerSecond}" y1="0" x2="${t * pxPerSecond}" y2="${H}" stroke="#ffffff" stroke-opacity="0.75" stroke-width="1.5"/>
  <text x="${t * pxPerSecond + 3}" y="${specH + curveH - 8 - (i % 3) * 14}" font-size="12" fill="#2b2233">${label}</text>`).join('')}
  ${cues.map(c => `<line x1="${c.t * pxPerSecond}" y1="0" x2="${c.t * pxPerSecond}" y2="14" stroke="#ffd27a" stroke-width="1.5"/>`).join('')}
  ${[-40, -30, -20, -10].map(l => `<line x1="0" y1="${curveY(l)}" x2="${W}" y2="${curveY(l)}" stroke="#2b2233" stroke-opacity="0.15"/><text x="2" y="${curveY(l) - 2}" font-size="11" fill="#2b2233">${l} LUFS</text>`).join('')}
  <path d="${path(musicLevels.momentary)}" fill="none" stroke="#4b3a8c" stroke-width="1.6"/>
  <path d="${path(sfxLevels.momentary)}" fill="none" stroke="#e8763a" stroke-width="1.3"/>
  ${Array.from({ length: 34 }, (_, s) => `<text x="${s * 2 * pxPerSecond + 2}" y="${specH - 4}" font-size="11" fill="#ffffff">${s * 2}</text>`).join('')}
  <text x="${W - 420}" y="${specH + 22}" font-size="13" fill="#4b3a8c">music momentary loudness</text>
  <text x="${W - 230}" y="${specH + 22}" font-size="13" fill="#e8763a">effects momentary loudness</text>
</svg>`;
await sharp(pixels, { raw: { width: W, height: H, channels: 3 } }).composite([{ input: Buffer.from(svg) }]).png().toFile(resolve(outDir, 'annotated.png'));
console.log('     out/audio/annotated.png (log-frequency spectrogram 40 Hz–16 kHz, cue ticks on top, section lines)');

console.log(failures.length ? `\n${failures.length} check(s) failed` : '\nall checks passed');
process.exitCode = failures.length ? 1 : 0;
