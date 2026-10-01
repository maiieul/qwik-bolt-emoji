import { readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { SR, writeWav24, loudness, gainToDb, dbToGain, toSamples } from './dsp.mjs';
import { renderMusic } from './score.mjs';
import { renderSfx, duckGain, master } from './mix.mjs';

const DURATION = 66;
const here = dirname(fileURLToPath(import.meta.url)), root = resolve(here, '..');
const report = process.argv.includes('--report');
const started = Date.now();

const cues = JSON.parse(readFileSync(resolve(here, 'cues.json'), 'utf8'));
const music = renderMusic(DURATION, { report });
const { bus: sfx, sidechain, placed } = renderSfx(cues, DURATION);
const duck = duckGain(sidechain);
const { mix, music: musicStem, sfx: sfxStem, stats } = master(music, sfx, duck, { targetLufs: -16, ceilingDb: -2 });

mkdirSync(resolve(root, 'assets'), { recursive: true });
writeWav24(resolve(root, 'assets/soundtrack.wav'), mix.L, mix.R, 1);
writeWav24(resolve(root, 'assets/music_only.wav'), musicStem.L, musicStem.R, 2);
writeWav24(resolve(root, 'assets/sfx_only.wav'), sfxStem.L, sfxStem.R, 3);

if (report) {
  const musicLevels = loudness(musicStem.L, musicStem.R), sfxLevels = loudness(sfxStem.L, sfxStem.R);
  const spanMax = (series, a, b) => Math.max(...series.slice(Math.max(0, Math.floor(a / 0.1)), Math.max(1, Math.ceil(b / 0.1))));
  console.log('cue                     t   music max LUFS(400ms)  sfx max LUFS(400ms)  duck dB  peak cap dB');
  for (const cue of placed) {
    const a = Math.max(0, cue.t - 0.3), b = Math.min(cue.end, cue.t + 0.3);
    console.log(`${cue.name.padEnd(18)} ${cue.t.toFixed(2).padStart(6)}  ${spanMax(musicLevels.momentary, a, b).toFixed(1).padStart(14)}  ${spanMax(sfxLevels.momentary, a, b).toFixed(1).padStart(18)}  ${gainToDb(duck[toSamples(cue.t + 0.03)]).toFixed(1).padStart(8)}  ${cue.cappedDb.toFixed(1).padStart(8)}`);
  }
  console.log(`music stem ${musicLevels.integrated.toFixed(1)} LUFS, sfx stem ${sfxLevels.integrated.toFixed(1)} LUFS`);
}
console.log(`soundtrack: ${stats.integrated.toFixed(2)} LUFS integrated, true peak ${stats.truePeak.toFixed(2)} dBTP, sample peak ${stats.samplePeak.toFixed(2)} dBFS`);
console.log(`master gain ${stats.masterGainDb.toFixed(1)} dB, deepest limiting ${stats.deepestLimitDb.toFixed(1)} dB, ${stats.secondsLimitedOverHalfDb.toFixed(2)} s limited by more than 0.5 dB`);
const deepestDuck = gainToDb(duck.reduce((a, g) => Math.min(a, g), 1)), duckedSeconds = duck.filter(g => g < dbToGain(-2)).length / SR;
console.log(`music ducked under the effects by up to ${deepestDuck.toFixed(1)} dB, by more than 2 dB for ${duckedSeconds.toFixed(1)} s`);
console.log(`wrote assets/soundtrack.wav, assets/music_only.wav, assets/sfx_only.wav (${DURATION} s, 44.1 kHz, 24-bit) in ${((Date.now() - started) / 1000).toFixed(1)} s`);
