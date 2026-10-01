import {
  SR, TAU, cosRamp, toSamples, makeRng, seedFrom, noteMidi, stereo, mixMono, mixStereo, eqStereo, biquad, runBiquads,
  freeverb, loudness, dbToGain, whiteNoise, onePoleLowpass, curve, varDelay,
} from './dsp.mjs';
import { musicBoxNote, bassNote, padVoices } from './instruments.mjs';
import { wobble } from './sfx.mjs';
import { BEAT } from './score.mjs';

export const INTRO_START = -10;
export const INTRO_SECONDS = 10;

export const INTRO_CHART = [[-10, 'C'], [-8, 'Am'], [-6, 'F'], [-5, 'G'], [-3, 'Dm7'], [-2, 'G']];

export const INTRO_SECTIONS = [
  [-10, 'hold music: do mi sol, la sol mi'],
  [-7, 'enter: the request rides off'],
  [-5, 'the wait: the music droops'],
  [-3, 'clock whizz: the music snaps back'],
  [-2, 'the rise into the title'],
];

export const DROOP = { from: -5, cents: -110, wowCents: 14, wowHz: 1.7, quieterDb: -4, snapBack: 0.25, fadeOut: 0.4 };

export const whizzTime = cues => cues.find(cue => cue.name === 'clockWhizz')?.t ?? -3;

const BUSES = {
  box: { lufs: -24, pan: 0.18, send: 0.35, eq: [biquad('hp', 180)] },
  pad: { lufs: -30, pan: 0, send: 0.3, eq: [biquad('hp', 100), biquad('lp', 4000)] },
  bass: { lufs: -29, pan: 0, send: 0.04, eq: [biquad('hp', 35), biquad('lp', 700)] },
};
const REVERB_RETURN = 0.6;

const sampleAt = t => toSamples(t - INTRO_START);

function composeIntro() {
  const ev = { box: [], pad: [], bass: [] };
  const rng = makeRng(seedFrom('intro humanize'));
  const box = (t, note, vel) => ev.box.push({ t, midi: noteMidi(note), vel: vel * (0.92 + 0.16 * rng()) });
  const tune = (t0, text, vel) => text.split(' ').reduce((t, token) => {
    const [note, beats] = token.split(':');
    box(t, note, vel);
    return t + Number(beats) * BEAT;
  }, t0);
  const pad = (t, notes, seconds, vel, o = {}) => ev.pad.push({ t, midis: notes.map(noteMidi), dur: seconds, vel, ...o });
  const bass = (t, note, beats, vel) => ev.bass.push({ t, midi: noteMidi(note), dur: beats * BEAT, vel });

  tune(-10, 'C5:1 E5:1 G5:2 A5:1 G5:1 E5:2', 0.5);
  tune(-6, 'F5:1 E5:1 D5:2', 0.44);
  tune(-4, 'E5:1 D5:1', 0.36);
  box(-1.5, 'G5', 0.3);
  'G4 B4 D5 G5 B5 D6 G6'.split(' ').forEach((note, k) => box(-1 + k * BEAT / 4, note, 0.18 + 0.022 * k));

  pad(-10, ['C4', 'E4', 'G4'], 1.9, 0.4, { attack: 0.6, release: 0.6 });
  pad(-8, ['A3', 'C4', 'E4'], 1.9, 0.4, { attack: 0.4, release: 0.6 });
  pad(-6, ['A3', 'C4', 'F4'], 0.95, 0.38, { attack: 0.3, release: 0.4 });
  pad(-5, ['G3', 'B3', 'D4'], 1.95, 0.36, { attack: 0.3, release: 0.5 });
  pad(-2.75, ['A3', 'D4', 'F4'], 0.7, 0.3, { attack: 0.3, release: 0.35 });
  pad(-2, ['G3', 'B3', 'D4', 'G4'], 2, 0.3, { attack: 0.5, release: 0.6, swell: 1.4 });

  [['A2', -8, 2], ['E2', -7, 2], ['F2', -6, 2], ['G2', -5, 4], ['G2', -1.5, 2]]
    .forEach(([note, t, beats]) => bass(t, note, beats, 0.45));
  return ev;
}

function renderBus(name, events, n, rng) {
  const bus = stereo(n), { pan } = BUSES[name];
  if (name === 'box') for (const e of events) mixMono(bus, musicBoxNote(e.midi, e.vel, rng), sampleAt(e.t), 1, pan);
  else if (name === 'pad') for (const e of events) mixStereo(bus, padVoices(e.midis, e.dur, e.vel, rng, e), sampleAt(e.t));
  else {
    const list = events.slice().sort((a, b) => a.t - b.t);
    list.forEach((e, i) => {
      const next = list[i + 1], dur = next ? Math.min(e.dur, next.t - e.t) : e.dur;
      mixMono(bus, bassNote(e.midi, dur, e.vel, rng), sampleAt(e.t), 1, pan);
    });
  }
  return eqStereo(bus, BUSES[name].eq);
}

function droopDelay(n, whizzAt) {
  const delay = new Float32Array(n);
  let lag = 0;
  for (let i = 0; i < n; i++) {
    const t = INTRO_START + i / SR;
    if (t < DROOP.from) continue;
    if (t < whizzAt) {
      const x = (t - DROOP.from) / (whizzAt - DROOP.from);
      const cents = x * (DROOP.cents * x + DROOP.wowCents * Math.sin(TAU * DROOP.wowHz * (t - DROOP.from)));
      lag += (1 - 2 ** (cents / 1200)) / SR;
      delay[i] = lag;
    } else delay[i] = lag * cosRamp(1 - (t - whizzAt) / DROOP.snapBack);
  }
  return delay;
}

function droopGain(t, whizzAt) {
  if (t < DROOP.from) return 1;
  if (t < whizzAt) return dbToGain(DROOP.quieterDb * cosRamp((t - DROOP.from) / (whizzAt - DROOP.from)));
  return dbToGain(DROOP.quieterDb) * cosRamp(1 - (t - whizzAt) / DROOP.fadeOut);
}

function droop(bus, whizzAt) {
  const delay = droopDelay(bus.L.length, whizzAt), out = { L: varDelay(bus.L, delay), R: varDelay(bus.R, delay) };
  for (let i = 0; i < out.L.length; i++) {
    const g = droopGain(INTRO_START + i / SR, whizzAt);
    out.L[i] *= g;
    out.R[i] *= g;
  }
  return out;
}

export function renderIntroMusic(seconds, { musicLufs = -25, whizzAt = -3 } = {}) {
  const n = toSamples(seconds), ev = composeIntro();
  const hold = { dry: stereo(n), send: stereo(n) }, rise = { dry: stereo(n), send: stereo(n) };
  for (const name of Object.keys(BUSES)) {
    const rng = makeRng(seedFrom('intro bus', name));
    const before = renderBus(name, ev[name].filter(e => e.t < whizzAt), n, rng);
    const after = renderBus(name, ev[name].filter(e => e.t >= whizzAt), n, rng);
    const sum = mixStereo(mixStereo(stereo(n), before, 0), after, 0);
    const gain = dbToGain(BUSES[name].lufs - loudness(sum.L, sum.R).integrated);
    for (const [part, bus] of [[hold, before], [rise, after]]) {
      mixStereo(part.dry, bus, 0, gain);
      mixStereo(part.send, bus, 0, gain * BUSES[name].send);
    }
  }
  const withReverb = ({ dry, send }) => mixStereo(dry, eqStereo(freeverb(send, { room: 0.66, damp: 0.5, width: 0.9, predelay: 0.015 }), [biquad('hp', 160), biquad('lp', 6000)]), 0, REVERB_RETURN);
  const music = mixStereo(droop(withReverb(hold), whizzAt), withReverb(rise), 0);
  const trim = dbToGain(musicLufs - loudness(music.L, music.R).integrated);
  for (let i = 0; i < n; i++) { music.L[i] *= trim; music.R[i] *= trim; }
  return music;
}

export function renderRoomTone(seconds, { lufs = -45, until = -0.3 } = {}) {
  const n = toSamples(seconds), rng = makeRng(seedFrom('intro room tone')), out = stereo(n);
  const env = curve(n, [[0, 0], [0.4, 1], [until - 1.3 - INTRO_START, 1], [until - INTRO_START, 0]]);
  const drift = wobble(seconds, rng, 0.4);
  for (const side of ['L', 'R']) {
    const x = runBiquads(onePoleLowpass(onePoleLowpass(whiteNoise(n, rng), 1600), 1600), [biquad('hp', 90)]);
    for (let i = 0; i < n; i++) x[i] *= env[i] * (1 + 0.15 * drift[i]);
    out[side] = x;
  }
  const gain = dbToGain(lufs - loudness(out.L, out.R).integrated);
  for (let i = 0; i < n; i++) { out.L[i] *= gain; out.R[i] *= gain; }
  return out;
}
