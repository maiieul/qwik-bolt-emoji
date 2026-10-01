import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { SR, toSamples, stereo, makeRng, writeWav24, wavHeader24, FULL_SCALE_24, loudness, truePeakDb, gainToDb, peak } from './dsp.mjs';
import { renderSfx, duckGain, master } from './mix.mjs';
import { INTRO_START, INTRO_SECONDS, INTRO_CHART, renderIntroMusic, renderRoomTone, whizzTime } from './intro_score.mjs';
import { INTRO_EFFECTS } from './intro_sfx.mjs';

const TAIL_SECONDS = 1;
const INTRO_LUFS = -17.5;
const here = dirname(fileURLToPath(import.meta.url)), root = resolve(here, '..');
const asset = name => resolve(root, 'assets', name);
const started = Date.now();

const cues = JSON.parse(readFileSync(resolve(here, 'intro_cues.json'), 'utf8'));
const seconds = INTRO_SECONDS + TAIL_SECONDS, n = toSamples(seconds);
const music = renderIntroMusic(seconds, { whizzAt: whizzTime(cues) });
const room = renderRoomTone(seconds);
const { bus: sfx, sidechain } = renderSfx(cues, seconds, { effects: INTRO_EFFECTS, origin: INTRO_START, chart: INTRO_CHART, source: 'intro_cues.json' });
const duck = duckGain(sidechain);
const bed = stereo(n);
for (let i = 0; i < n; i++) {
  bed.L[i] = music.L[i] * duck[i] + room.L[i];
  bed.R[i] = music.R[i] * duck[i] + room.R[i];
}
const { mix, stats } = master(bed, sfx, new Float32Array(n).fill(1), { targetLufs: INTRO_LUFS, ceilingDb: -2, fadeOutStart: seconds - 0.4 });

const introFrames = toSamples(INTRO_SECONDS), tailFrames = n - introFrames;
writeWav24(asset('intro.wav'), mix.L.subarray(0, introFrames), mix.R.subarray(0, introFrames), 4);

if (!existsSync(asset('soundtrack.wav'))) throw new Error('assets/soundtrack.wav is missing: run node audio/make.mjs first');
const film = readFileSync(asset('soundtrack.wav')), filmFrames = (film.length - 44) / 6;
if (!film.subarray(0, 44).equals(wavHeader24(filmFrames))) throw new Error('assets/soundtrack.wav is not the 24-bit stereo file make.mjs writes');
const full = Buffer.concat([wavHeader24(introFrames + filmFrames), readFileSync(asset('intro.wav')).subarray(44), film.subarray(44)]);
const dither = makeRng(5), tailStart = 44 + introFrames * 6;
for (let i = 0; i < tailFrames; i++) {
  for (const [channel, x] of [[0, mix.L], [1, mix.R]]) {
    const at = tailStart + (2 * i + channel) * 3;
    const sum = full.readIntLE(at, 3) + Math.round(x[introFrames + i] * FULL_SCALE_24 + dither() - dither());
    full.writeIntLE(Math.max(-8388608, Math.min(FULL_SCALE_24, sum)), at, 3);
  }
}
writeFileSync(asset('soundtrack_full.wav'), full);

const intro = { L: mix.L.subarray(0, introFrames), R: mix.R.subarray(0, introFrames) };
const tailPeak = Math.max(peak(mix.L.subarray(introFrames)), peak(mix.R.subarray(introFrames)));
console.log(`intro: ${loudness(intro.L, intro.R).integrated.toFixed(2)} LUFS integrated, true peak ${truePeakDb(intro.L, intro.R).toFixed(2)} dBTP`);
console.log(`master gain ${stats.masterGainDb.toFixed(1)} dB, deepest limiting ${stats.deepestLimitDb.toFixed(1)} dB, ${stats.secondsLimitedOverHalfDb.toFixed(2)} s limited by more than 0.5 dB, music ducked by up to ${gainToDb(duck.reduce((a, g) => Math.min(a, g), 1)).toFixed(1)} dB`);
console.log(`tail mixed over the film's first ${TAIL_SECONDS} s: peak ${gainToDb(tailPeak).toFixed(1)} dBFS`);
console.log(`wrote assets/intro.wav (${INTRO_SECONDS} s) and assets/soundtrack_full.wav (${(introFrames + filmFrames) / SR} s) in ${((Date.now() - started) / 1000).toFixed(1)} s`);
