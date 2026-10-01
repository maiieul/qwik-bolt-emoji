import {
  toSamples, makeRng, seedFrom, noteMidi, midiHz, hzMidi, stereo, mixMono, mixStereo, eqStereo, biquad, freeverb,
  loudness, dbToGain, compressor,
} from './dsp.mjs';
import {
  ukeString, strumScrape, pizzNote, glockNote, marimbaNote, bassNote, padVoices, drumKit,
} from './instruments.mjs';

export const BEAT = 0.5;
export const BAR = 2;

const VOICINGS = {
  C: { tones: [0, 4, 7], uke: ['G4', 'C4', 'E4', 'C5'] },
  C7: { tones: [0, 4, 7, 10], uke: ['G4', 'C4', 'E4', 'Bb4'] },
  Dm: { tones: [2, 5, 9], uke: ['A4', 'D4', 'F4', 'A4'] },
  Dm7: { tones: [2, 5, 9, 0], uke: ['A4', 'D4', 'F4', 'C5'] },
  Em: { tones: [4, 7, 11], uke: ['G4', 'E4', 'G4', 'B4'] },
  F: { tones: [5, 9, 0], uke: ['A4', 'C4', 'F4', 'A4'] },
  G: { tones: [7, 11, 2], uke: ['G4', 'D4', 'G4', 'B4'] },
  G7: { tones: [7, 11, 2, 5], uke: ['G4', 'D4', 'F4', 'B4'] },
  Am: { tones: [9, 0, 4], uke: ['A4', 'C4', 'E4', 'A4'] },
};

export const CHART = [
  [0, 'C'], [4, 'G7'], [6, 'C'], [8, 'G7'], [9, 'C'], [10, 'Am'], [12, 'F'], [13, 'G'], [14, 'C'], [15.5, 'C7'],
  [16, 'F'], [18, 'G'], [20, 'Am'], [22, 'Dm7'], [23, 'G7'], [24, 'C'], [26, 'F'], [27, 'G'],
  [28, 'C'], [30, 'Am'], [32, 'F'], [33, 'C'], [34, 'F'], [35, 'G7'], [36, 'C'], [38, 'Am'], [39, 'Dm'],
  [40, 'G'], [44, 'C'], [44.5, 'Dm'], [45, 'Em'], [45.5, 'F'], [46, 'G'], [47, 'Am'],
  [48, 'Dm7'], [49, 'G7'], [50, 'Dm7'], [50.5, 'G7'], [51.5, 'C'],
  [54, 'F'], [55, 'G'], [56, 'Em'], [57, 'Am'], [58, 'F'], [59, 'G'], [60, 'Am'], [60.5, 'G'], [61.5, 'C'],
  [62, 'F'], [63, 'G'], [64, 'C'],
];

export const SECTIONS = [
  [0, 'title: logo wakes, band in on the boing'],
  [6, 'workshop groove'],
  [11.5, 'snore break'],
  [13, 'workshop groove, sends'],
  [15.5, 'travel'],
  [17, 'parcels land'],
  [20.5, 'meanwhile at the server'],
  [22.5, 'out of order, page complete at 24'],
  [26, 'quiet: yawn and whistle'],
  [28, 'calm buffering'],
  [32, 'cool shuffle'],
  [35, 'cheeky fast click'],
  [38, 'suspicious'],
  [40, 'tension: held G and ticking'],
  [44, 'rising stretch'],
  [48, 'waiting vamp'],
  [50.5, 'lift'],
  [51.5, 'big resolution'],
  [54, 'relaxed groove'],
  [58.5, 'warm ending'],
  [64, 'final chord and fade'],
];

export function chordAt(t) {
  let name = CHART[0][1];
  for (const [at, chord] of CHART) {
    if (at > t + 1e-6) break;
    name = chord;
  }
  return name;
}

export function snapToChord(hz, t) {
  const target = hzMidi(hz), tones = VOICINGS[chordAt(t)].tones;
  let best = null;
  for (let octave = 0; octave <= 10; octave++) {
    for (const pc of tones) {
      const m = 12 * octave + pc;
      if (best === null || Math.abs(m - target) < Math.abs(best - target)) best = m;
    }
  }
  return midiHz(best);
}

export function chordTonesBetween(t, loHz, hiHz) {
  const tones = VOICINGS[chordAt(t)].tones, out = [];
  for (let m = Math.ceil(hzMidi(loHz)); m <= Math.floor(hzMidi(hiHz)); m++) if (tones.includes(((m % 12) + 12) % 12)) out.push(midiHz(m));
  return out;
}

const BLOCK = { high: midiHz(noteMidi('E6')), low: midiHz(noteMidi('A5')), tick: midiHz(noteMidi('D6')), tock: midiHz(noteMidi('G5')) };

const rootMidi = chord => {
  const pc = VOICINGS[chord].tones[0];
  return 36 + ((pc % 12) + 12) % 12;
};
const midiOf = note => (typeof note === 'number' ? note : noteMidi(note));

function compose() {
  const ev = { uke: [], pizz: [], bass: [], glock: [], marimba: [], pad: [], drums: [] };
  const rng = makeRng(seedFrom('score humanize'));
  const nudge = (t, amount = 0.004) => t + (rng() - 0.5) * 2 * amount;

  const strum = (t, vel, o = {}) => ev.uke.push({
    t, vel, chord: o.chord ?? chordAt(t), dir: o.dir ?? 'down', muted: !!o.muted, ring: o.ring ?? 2.5,
    spread: o.spread ?? (o.dir === 'up' ? 0.008 : 0.012),
  });
  const bass = (t, note, beats, vel = 0.75) => ev.bass.push({ t, midi: midiOf(note), dur: beats * BEAT, vel });
  const glock = (t, note, vel = 0.5) => ev.glock.push({ t, midi: midiOf(note), vel });
  const marimba = (t, note, vel = 0.5) => ev.marimba.push({ t, midi: midiOf(note), vel });
  const pizz = (t, note, vel = 0.5) => ev.pizz.push({ t, midi: midiOf(note), vel });
  const pad = (t, notes, seconds, vel, o = {}) => ev.pad.push({ t, midis: notes.map(midiOf), dur: seconds, vel, ...o });
  const drum = (t, kind, vel, o = {}) => ev.drums.push({ t, kind, vel, ...o });

  const players = {
    glock: (t, m, v) => glock(t, m, v),
    marimba: (t, m, v) => marimba(t, m, v),
    marimbaLow: (t, m, v) => marimba(t, m - 12, v),
  };
  const melody = (voices, t0, text) => {
    let t = t0;
    for (const token of text.trim().split(/\s+/)) {
      const [name, beats = '1'] = token.split(':');
      if (name !== 'r') {
        const tn = nudge(t, 0.003);
        for (const note of name.split('+')) for (const [who, vel] of voices) players[who](tn, noteMidi(note), vel * (0.92 + rng() * 0.16));
      }
      t += Number(beats) * BEAT;
    }
    return t;
  };
  const each = (t0, t1, step, fn) => {
    for (let k = 0; ; k++) {
      const t = t0 + k * step;
      if (t >= t1 - 1e-6) break;
      fn(t, k);
    }
  };
  const beatInBar = t => Math.round(((t % BAR) / BEAT) * 4) / 4;
  const sixteenth = t => Math.round((t % BAR) / (BEAT / 4));
  const root = t => rootMidi(chordAt(t));
  const fifth = t => root(t) + 7;

  const ISLAND = { 0: ['down', 1], 1: ['down', 0.72], 1.5: ['up', 0.55], 2.5: ['up', 0.55], 3: ['down', 0.75], 3.5: ['up', 0.5] };
  const island = (t0, t1, vel) => each(t0, t1, BEAT / 2, t => {
    const hit = ISLAND[beatInBar(t)];
    if (hit) strum(nudge(t), vel * hit[1], { dir: hit[0] });
  });
  const chug = (t0, t1, vel) => each(t0, t1, BEAT / 2, t => {
    const b = beatInBar(t), open = b % 2 === 0 || b % 2 === 1.5;
    strum(nudge(t), vel * (b % 1 === 0 ? 0.9 : 0.6), { dir: b % 1 === 0 ? 'down' : 'up', muted: !open, ring: 0.5 });
  });
  const bounce = (t0, t1, vel) => each(t0, t1, BEAT, t => {
    const b = beatInBar(t);
    const note = b === 0 ? root(t) : b === 2 ? root(t) + 12 : fifth(t);
    bass(nudge(t, 0.002), note, 0.9, vel * (b % 2 === 0 ? 1 : 0.85));
  });
  const drive = (t0, t1, vel) => each(t0, t1, BEAT / 2, (t, k) => {
    const note = [root(t), root(t), fifth(t), root(t) + 12][k % 4];
    bass(nudge(t, 0.002), note, 0.45, vel * (k % 2 ? 0.75 : 1));
  });

  const busyBeat = (t0, t1, vel = 1) => each(t0, t1, BEAT / 4, t => {
    const pos = sixteenth(t);
    if (pos === 0 || pos === 8) drum(t, 'kick', 0.8 * vel);
    if (pos === 4 || pos === 12) drum(nudge(t, 0.003), 'snap', 0.55 * vel);
    drum(nudge(t, 0.004), 'shaker', (pos % 2 === 0 ? 0.36 : 0.2) * vel);
    if (pos === 14) drum(t, 'block', 0.3 * vel, { hz: BLOCK.high });
    if (pos === 6) drum(t, 'block', 0.24 * vel, { hz: BLOCK.low });
  });
  const travelBeat = (t0, t1, vel = 1) => each(t0, t1, BEAT / 4, t => {
    const pos = sixteenth(t);
    if (pos % 4 === 0) drum(t, 'kick', (pos % 8 === 0 ? 0.75 : 0.5) * vel);
    if (pos === 4 || pos === 12) drum(t, 'brush', 0.5 * vel);
    drum(nudge(t, 0.004), 'shaker', (pos % 2 === 0 ? 0.4 : 0.24) * vel);
  });
  const calmBeat = (t0, t1, vel = 1) => each(t0, t1, BEAT, t => {
    const b = beatInBar(t);
    if (b === 1 || b === 3) drum(t, 'brush', 0.42 * vel);
    drum(nudge(t), 'tap', 0.2 * vel);
  });
  const shuffleBeat = (t0, t1, vel = 1) => each(t0, t1, BEAT, t => {
    const b = beatInBar(t);
    drum(nudge(t), 'tap', 0.26 * vel);
    drum(nudge(t + BEAT * 2 / 3), 'tap', 0.16 * vel);
    if (b === 1 || b === 3) drum(t, 'brush', 0.42 * vel);
    if (b === 0) drum(t, 'kick', 0.4 * vel);
  });
  const relaxedBeat = (t0, t1, vel = 1) => each(t0, t1, BEAT / 2, t => {
    const b = beatInBar(t);
    if (b === 0) drum(t, 'kick', 0.6 * vel);
    if (b === 2.5) drum(t, 'kick', 0.3 * vel);
    if (b === 1 || b === 3) drum(t, 'brush', 0.45 * vel);
    drum(nudge(t), 'shaker', (b % 1 === 0 ? 0.25 : 0.15) * vel);
  });
  const stretchBeat = (t0, t1, vel = 1) => each(t0, t1, BEAT / 4, t => {
    const pos = sixteenth(t);
    if (pos % 4 === 0) drum(t, 'kick', 0.75 * vel);
    if (pos === 4 || pos === 12) drum(t, 'snap', 0.55 * vel);
    drum(nudge(t, 0.003), 'shaker', (pos % 2 === 0 ? 0.42 : 0.26) * vel);
  });
  const run = (t0, notes, v0, v1, who = 'marimba') => notes.split(' ').forEach((note, k, all) =>
    players[who](t0 + k * BEAT / 8, noteMidi(note), v0 + (v1 - v0) * k / (all.length - 1)));

  const title = () => {
    pad(0, ['C3', 'G3', 'C4', 'E4'], 2.2, 0.55, { attack: 1.0, release: 0.9 });
    pizz(1.0, 'G4', 0.55);
    glock(1.0, 'C6', 0.3);
    pizz(1.5, 'C5', 0.6);
    glock(1.5, 'E6', 0.34);
    bass(1.75, 'G2', 0.5, 0.5);
    island(2.0, 5.5, 0.7);
    bounce(2.0, 5.0, 0.8);
    bass(5.0, 'G2', 1, 0.7);
    melody([['glock', 0.55], ['marimbaLow', 0.35]], 2.0, 'C5:.5 E5:.5 G5:1 A5:.5 G5:.5 E5:1 F5:.5 E5:.5 D5:1 B4:1');
    run(5.5, 'G4 A4 B4 C5 D5 E5 F5 G5', 0.35, 0.6);
    drum(2.0, 'kick', 0.8);
    drum(3.0, 'kick', 0.55);
    drum(4.0, 'kick', 0.65);
    drum(5.0, 'kick', 0.6);
    each(2.0, 5.5, BEAT / 2, (t, k) => drum(nudge(t), 'shaker', k % 2 ? 0.18 : 0.28));
    [2.5, 3.5, 4.5].forEach(t => drum(t, 'snap', 0.35));
  };

  const workshop = () => {
    island(6.0, 11.5, 0.72);
    strum(12.0, 0.38, { ring: 1.0 });
    island(13.0, 15.0, 0.72);
    strum(15.0, 0.85, { ring: 0.35 });
    strum(15.5, 0.6, { ring: 0.5 });
    bounce(6.0, 11.5, 0.8);
    bass(12.0, 'F2', 2, 0.45);
    bounce(13.0, 15.0, 0.8);
    bass(15.0, 'C2', 0.5, 0.85);
    bass(15.5, 'C3', 1, 0.65);
    melody([['marimba', 0.6], ['glock', 0.26]], 6.0, 'C5:.5 E5:.5 G5:1 A5:.5 G5:.5 E5:1 F5:.5 E5:.5 D5:1 E5:.5 D5:.5 C5:1 C5:.5 E5:.5 A5:1 G5:.5 E5:.5');
    melody([['marimba', 0.6], ['glock', 0.26]], 13.0, 'G5:1 D5:1 E5:.5 G5:.5 C6:1 C6+C5:1');
    busyBeat(6.0, 11.5);
    busyBeat(13.0, 15.0);
    drum(15.0, 'kick', 0.8);
    drum(15.0, 'snap', 0.6);
  };

  const travelAndParcels = () => {
    drum(15.5, 'snap', 0.4);
    chug(16.0, 17.0, 0.62);
    chug(17.0, 19.0, 0.5);
    strum(19.0, 0.4, { ring: 0.5 });
    strum(19.5, 0.65, { ring: 1.2 });
    strum(20.0, 0.4, { ring: 1.0 });
    drive(16.0, 19.0, 0.75);
    bass(19.0, 'G2', 1, 0.5);
    bass(19.5, 'G2', 1, 0.7);
    bass(20.0, 'A2', 1, 0.5);
    melody([['glock', 0.5], ['marimbaLow', 0.3]], 16.0, 'F5:.5 A5:.5 C6:1');
    glock(19.5, 'G5', 0.4);
    glock(19.54, 'B5', 0.4);
    glock(19.58, 'D6', 0.45);
    travelBeat(16.0, 17.0);
    travelBeat(17.0, 19.0, 0.75);
    drum(19.5, 'kick', 0.55);
  };

  const meanwhileAtServer = () => {
    [20.75, 21.25, 21.75].forEach(t => strum(t, 0.35, { muted: true, dir: 'up' }));
    bass(20.5, 'A2', 0.5, 0.5);
    bass(21.0, 'E2', 0.5, 0.45);
    bass(21.5, 'A2', 0.5, 0.5);
    bass(22.0, 'D2', 1, 0.55);
    each(20.5, 22.0, BEAT / 2, (t, k) => marimba(t, k % 2 ? 'E4' : 'A3', 0.3));
  };

  const outOfOrder = () => {
    strum(22.5, 0.5, { ring: 0.5 });
    strum(23.0, 0.6, { ring: 0.5 });
    strum(23.5, 0.45, { dir: 'up', ring: 0.5 });
    bass(22.5, 'D2', 1, 0.6);
    bass(23.0, 'G2', 1, 0.65);
    bass(23.5, 'B2', 1, 0.6);
    ['B4', 'D5', 'F5', 'G5'].forEach((note, k) => marimba(23.0 + k * BEAT / 2, note, 0.4 + 0.05 * k));
    island(24.0, 26.0, 0.7);
    bounce(24.0, 26.0, 0.78);
    melody([['glock', 0.55], ['marimba', 0.45]], 24.0, 'C5:.5 E5:.5 G5:1 A5:.5 G5:.5 C6:1');
    busyBeat(24.0, 26.0, 0.85);
  };

  const quietYawn = () => {
    strum(26.0, 0.45, { ring: 1.0 });
    strum(27.0, 0.4, { ring: 1.0 });
    bass(26.0, 'F2', 2, 0.5);
    bass(27.0, 'G2', 2, 0.45);
    pad(26.0, ['A3', 'C4', 'F4'], 1.0, 0.35, { attack: 0.3, release: 0.5 });
    pad(27.0, ['G3', 'B3', 'D4'], 1.0, 0.3, { attack: 0.3, release: 0.5 });
  };

  const calmBuffering = () => {
    strum(28.0, 0.5, { ring: 1.0 });
    strum(29.0, 0.35, { dir: 'up', ring: 1.0 });
    strum(30.0, 0.5, { ring: 1.0 });
    strum(31.0, 0.35, { dir: 'up', ring: 1.0 });
    bass(28.0, 'C2', 2, 0.55);
    bass(29.0, 'G2', 2, 0.45);
    bass(30.0, 'A2', 2, 0.55);
    bass(31.0, 'E2', 2, 0.45);
    melody([['glock', 0.45]], 28.0, 'E5:1 G5:1 C6:2 A5:1 G5:1 E5:2');
    pad(28.0, ['C4', 'E4', 'G4'], 2.0, 0.3, { attack: 0.5, release: 0.6 });
    pad(30.0, ['A3', 'C4', 'E4'], 2.0, 0.3, { attack: 0.5, release: 0.6 });
    calmBeat(28.0, 32.0, 0.8);
  };

  const coolShuffle = () => {
    each(32.0, 35.0, BEAT, t => {
      strum(nudge(t), 0.42, { ring: 0.4 });
      strum(nudge(t + BEAT * 2 / 3), 0.3, { muted: true, dir: 'up' });
    });
    [['F2', 32.0], ['A2', 32.5], ['C3', 33.0], ['G2', 33.5], ['F2', 34.0], ['C3', 34.5]].forEach(([note, t]) => bass(t, note, 1, 0.55));
    melody([['glock', 0.42]], 32.0, 'F5:1 A5:1 G5:1');
    [['E5', 33.5, 0.45], ['G5', 33.5 + 1 / 3, 0.4], ['A5', 34.0, 0.5], ['C6', 34.5, 0.45], ['A5', 34.5 + 1 / 3, 0.4]].forEach(([note, t, v]) => marimba(t, note, v));
    shuffleBeat(32.0, 35.0);
  };

  const cheekyClick = () => {
    ['G3', 'B3', 'D4', 'F4'].forEach((note, k) => pizz(35.0 + k * BEAT / 2, note, 0.5));
    bass(35.0, 'G2', 1, 0.45);
    strum(36.0, 0.75, { ring: 0.45 });
    bass(36.0, 'C2', 1, 0.8);
    drum(36.0, 'kick', 0.6);
    glock(36.5, 'G5', 0.3);
    strum(37.0, 0.6, { ring: 0.4 });
    glock(37.0, 'C6', 0.5);
    glock(37.0, 'E6', 0.4);
    marimba(37.0, 'C5', 0.45);
    bass(37.0, 'C2', 1, 0.7);
    strum(37.25, 0.35, { muted: true });
    strum(37.5, 0.45, { dir: 'up', ring: 0.3 });
    strum(37.75, 0.35, { muted: true });
    bass(37.5, 'G2', 1, 0.6);
    drum(37.0, 'kick', 0.5);
    drum(37.5, 'snap', 0.4);
  };

  const suspicious = () => {
    [['A3', 38.0], ['C4', 38.5], ['D4', 39.0], ['F4', 39.5]].forEach(([note, t], k) => pizz(t, note, k % 2 ? 0.45 : 0.5));
    [['A2', 38.0], ['E2', 38.5], ['D2', 39.0], ['A2', 39.5]].forEach(([note, t], k) => bass(t, note, 0.5, k % 2 ? 0.4 : 0.5));
    [38.25, 38.75, 39.25, 39.75].forEach(t => drum(t, 'block', 0.2, { hz: BLOCK.high }));
    glock(38.75, 'E6', 0.22);
  };

  const tension = () => {
    pad(40.0, ['G3', 'D4'], 4.0, 0.42, { attack: 0.25, release: 0.15, swell: 2.2 });
    each(40.5, 43.0, BEAT, (t, k) => drum(t, 'block', 0.18 + 0.03 * k, { hz: k % 2 ? BLOCK.tick : BLOCK.tock }));
    each(43.0, 44.0, BEAT / 2, (t, k) => drum(t, 'block', 0.3 + 0.04 * k, { hz: k % 2 ? BLOCK.tick : BLOCK.tock }));
    bass(42.0, 'G2', 2, 0.45);
    bass(43.0, 'A2', 1, 0.5);
    bass(43.5, 'B2', 1, 0.55);
    each(43.0, 44.0, 1 / 24, (t, k) => drum(t, 'tap', 0.08 + 0.3 * k / 24));
    run(43.5, 'G4 A4 B4 C5 D5 E5 F5 G5', 0.35, 0.6);
  };

  const risingStretch = () => {
    each(44.0, 46.0, BEAT, t => {
      strum(t, 0.75, { ring: 0.3 });
      strum(t + 0.25, 0.5, { ring: 0.2 });
      strum(t + 0.375, 0.5, { dir: 'up', ring: 0.2 });
    });
    strum(46.0, 0.9, { ring: 0.45 });
    strum(46.5, 0.7, { ring: 0.4 });
    strum(47.0, 0.8, { ring: 0.45 });
    [['C3', 44.0], ['D3', 44.5], ['E3', 45.0], ['F3', 45.5]].forEach(([note, t]) => bass(t, note, 0.9, 0.75));
    bass(46.0, 'G2', 1, 0.85);
    bass(46.5, 'G2', 0.5, 0.6);
    bass(47.0, 'A2', 1, 0.8);
    [['C5', 'E5', 'G5'], ['D5', 'F5', 'A5'], ['E5', 'G5', 'B5'], ['F5', 'A5', 'C6']].forEach((triad, b) => triad.forEach((note, k) => {
      const t = 44.0 + b * BEAT + k * BEAT / 3, v = 0.4 + 0.05 * b;
      glock(t, note, v);
      marimba(t, noteMidi(note) - 12, v * 0.8);
    }));
    ['G5', 'B5', 'D6'].forEach((note, k) => glock(46.0 + k * 0.014, note, 0.42));
    glock(46.25, 'G6', 0.38);
    glock(46.5, 'B5', 0.35);
    glock(47.0, 'A5', 0.4);
    glock(47.0, 'C6', 0.45);
    stretchBeat(44.0, 46.0);
    drum(46.0, 'kick', 0.85);
    drum(46.0, 'snap', 0.6);
    drum(46.5, 'snap', 0.5);
    drum(47.0, 'kick', 0.75);
  };

  const waitingVampAndLift = () => {
    each(48.0, 50.5, BEAT, (t, k) => drum(t, 'block', 0.32, { hz: k % 2 ? BLOCK.low : BLOCK.tick }));
    [48.0, 49.0, 50.0].forEach(t => strum(t, 0.4, { ring: 0.4 }));
    [48.25, 48.75, 49.25, 49.75, 50.25].forEach(t => strum(t, 0.32, { muted: true, dir: 'up' }));
    [['D2', 48.0], ['A2', 48.5], ['G2', 49.0], ['D3', 49.5], ['D2', 50.0]].forEach(([note, t]) => bass(t, note, 0.5, 0.6));
    ['D4', 'F4', 'A4', 'F4', 'G4', 'B4', 'D5', 'B4', 'D4', 'F4'].forEach((note, k) => marimba(48.0 + k * BEAT / 2, note, 0.28));
    each(50.5, 51.5, 0.125, (t, k) => strum(t, 0.2 + 0.065 * k, { dir: k % 2 ? 'up' : 'down', ring: 0.2 }));
    [['G2', 50.5], ['A2', 50.75], ['B2', 51.0], ['D3', 51.25]].forEach(([note, t], k) => bass(t, note, 0.5, 0.6 + 0.03 * k));
    each(50.5, 51.5, 1 / 16, (t, k) => marimba(t, k % 2 ? 'B4' : 'G4', 0.12 + 0.025 * k));
    each(50.5, 51.5, 1 / 24, (t, k) => drum(t, 'tap', 0.1 + 0.012 * k));
  };

  const bigResolution = () => {
    strum(51.5, 1.0, { ring: 0.5 });
    bass(51.5, 'C2', 1, 0.9);
    drum(51.5, 'kick', 0.9);
    drum(51.5, 'snap', 0.6);
    ['C4', 'E4', 'G4'].forEach((note, k) => marimba(51.5 + k * 0.014, note, 0.42));
    pad(51.5, ['C4', 'E4', 'G4', 'C5'], 2.5, 0.45, { attack: 0.05, release: 0.8 });
    island(52.0, 54.0, 0.75);
    bounce(52.0, 54.0, 0.82);
    busyBeat(52.0, 54.0);
    melody([['glock', 0.55], ['marimba', 0.45]], 52.0, 'C5:.5 E5:.5 G5:1 A5:.5 G5:.5 C6:1');
  };

  const relaxedGroove = () => {
    each(54.0, 58.0, 1.0, t => {
      strum(nudge(t), 0.58, { ring: 0.9 });
      strum(nudge(t + 0.5), 0.36, { muted: true });
      strum(nudge(t + 0.75), 0.3, { dir: 'up', ring: 0.3 });
      bass(t, root(t), 1.4, 0.7);
      bass(t + 0.75, fifth(t), 0.5, 0.5);
    });
    melody([['marimba', 0.5], ['glock', 0.22]], 54.0, 'A5:.5 G5:.5 F5:1 G5:.5 A5:.5 B5:1 G5:.5 E5:.5 B4:1 C5:.5 E5:.5 A5:1');
    relaxedBeat(54.0, 58.0);
  };

  const warmEnding = () => {
    strum(58.0, 0.55, { ring: 1.0 });
    bass(58.0, 'F2', 2, 0.6);
    strum(59.0, 0.55, { ring: 1.0 });
    bass(59.0, 'G2', 2, 0.6);
    strum(60.0, 0.5, { ring: 0.5 });
    bass(60.0, 'A2', 1, 0.55);
    melody([['glock', 0.5], ['marimba', 0.4]], 58.0, 'A5:1 C6:1 B5:1 D6:1 C6:1');
    drum(58.0, 'kick', 0.5);
    drum(59.0, 'kick', 0.45);
    drum(60.0, 'kick', 0.4);
    drum(58.5, 'brush', 0.35);
    drum(59.5, 'brush', 0.35);
    pad(60.5, ['G3', 'B3', 'D4'], 1.0, 0.35, { attack: 0.2, release: 0.3 });
    strum(61.5, 0.5, { ring: 0.5 });
    bass(61.5, 'C2', 1, 0.6);
    glock(61.5, 'G5', 0.4);
    drum(61.5, 'kick', 0.45);
    strum(62.0, 0.6, { ring: 1.0 });
    bass(62.0, 'F2', 2, 0.65);
    glock(62.0, 'A5', 0.5);
    drum(62.0, 'kick', 0.5);
    glock(62.5, 'C6', 0.5);
    strum(62.5, 0.35, { dir: 'up', ring: 0.5 });
    strum(63.0, 0.6, { ring: 1.0 });
    bass(63.0, 'G2', 1, 0.65);
    glock(63.0, 'B5', 0.5);
    drum(63.0, 'kick', 0.5);
    glock(63.5, 'D6', 0.45);
    bass(63.5, 'B1', 1, 0.55);
    strum(64.0, 0.75, { ring: 2.5, spread: 0.03 });
    bass(64.0, 'C2', 4, 0.7);
    ['C6', 'E6', 'G6'].forEach((note, k) => glock(64.0 + k * 0.04, note, 0.45 - 0.03 * k));
    ['C4', 'G4', 'C5'].forEach((note, k) => marimba(64.0 + k * 0.03, note, 0.5 - 0.03 * k));
    pad(64.0, ['C3', 'G3', 'C4', 'E4', 'G4'], 1.4, 0.45, { attack: 0.08, release: 1.2 });
    drum(64.0, 'kick', 0.55);
    drum(64.0, 'brush', 0.3, { length: 0.8 });
  };

  [title, workshop, travelAndParcels, meanwhileAtServer, outOfOrder, quietYawn, calmBuffering, coolShuffle, cheekyClick, suspicious, tension, risingStretch, waitingVampAndLift, bigResolution, relaxedGroove, warmEnding].forEach(section => section());

  return ev;
}

export function musicEventTimes() {
  return Object.values(compose()).flat().map(e => e.t).sort((a, b) => a - b);
}

function expandStrums(strums, rng) {
  const notes = [];
  for (const s of strums) {
    const voicing = VOICINGS[s.chord].uke.map(noteMidi);
    const order = s.dir === 'down' ? [0, 1, 2, 3] : [3, 2, 1, 0];
    const weights = s.dir === 'down' ? [1, 0.92, 0.95, 0.9] : [1, 0.9, 0.7, 0.55];
    order.forEach((string, k) => notes.push({
      t: s.t + k * s.spread, string, midi: voicing[string], vel: s.vel * weights[k] * (0.92 + 0.16 * rng()), muted: s.muted, ring: s.ring,
    }));
  }
  for (let string = 0; string < 4; string++) {
    const list = notes.filter(n => n.string === string).sort((a, b) => a.t - b.t);
    for (let i = 0; i + 1 < list.length; i++) list[i].ring = Math.max(0.05, Math.min(list[i].ring, list[i + 1].t - list[i].t + 0.01));
  }
  return notes;
}

const REVERB_RETURN = 0.6;

const BUSES = {
  uke: { lufs: -24.5, pan: -0.22, send: 0.16, eq: [biquad('hp', 110), biquad('peak', 290, 1, 2), biquad('highshelf', 4500, 0.7, -3)] },
  pizz: { lufs: -27, pan: -0.35, send: 0.2, eq: [biquad('hp', 120)] },
  bass: { lufs: -26, pan: 0, send: 0.02, eq: [biquad('hp', 35), biquad('lp', 900)] },
  glock: { lufs: -25, pan: 0.28, send: 0.3, eq: [biquad('highshelf', 6000, 0.7, -2)] },
  marimba: { lufs: -24, pan: 0.14, send: 0.2, eq: [biquad('hp', 90)] },
  pad: { lufs: -30, pan: 0, send: 0.32, eq: [biquad('hp', 100), biquad('lp', 3000)] },
  kick: { lufs: -30, pan: 0, send: 0, eq: [biquad('hp', 30)] },
  snap: { lufs: -31, pan: 0.12, send: 0.12, eq: [] },
  brush: { lufs: -32, pan: -0.12, send: 0.1, eq: [] },
  tap: { lufs: -35, pan: -0.18, send: 0.1, eq: [] },
  shaker: { lufs: -33, pan: 0.35, send: 0.05, eq: [] },
  block: { lufs: -33, pan: 0.2, send: 0.15, eq: [] },
};

function renderBus(name, n, ev, rng) {
  const bus = stereo(n), { pan } = BUSES[name], put = (buf, t, gain = 1, p = pan) => mixMono(bus, buf, toSamples(t), gain, p);
  if (name === 'uke') {
    for (const note of expandStrums(ev.uke, rng)) put(ukeString(note.midi, note.ring, note.vel, rng, note.muted), note.t);
    for (const s of ev.uke) if (s.muted) put(strumScrape(s.vel, rng), s.t);
  } else if (name === 'pizz') for (const e of ev.pizz) put(pizzNote(e.midi, e.vel, rng), e.t);
  else if (name === 'glock') for (const e of ev.glock) put(glockNote(e.midi, e.vel, rng), e.t);
  else if (name === 'marimba') for (const e of ev.marimba) put(marimbaNote(e.midi, e.vel, rng), e.t);
  else if (name === 'bass') {
    const list = ev.bass.slice().sort((a, b) => a.t - b.t);
    list.forEach((e, i) => {
      const next = list[i + 1], dur = next ? Math.min(e.dur, next.t - e.t) : e.dur;
      put(bassNote(e.midi, dur, e.vel, rng), e.t);
    });
  } else if (name === 'pad') {
    for (const e of ev.pad) mixStereo(bus, padVoices(e.midis, e.dur, e.vel, rng, e), toSamples(e.t));
  } else {
    for (const e of ev.drums) {
      if (e.kind !== name) continue;
      const play = drumKit[name];
      put(name === 'block' ? play(e.vel, rng, e.hz) : name === 'brush' ? play(e.vel, rng, e.length) : play(e.vel, rng), e.t);
    }
  }
  return eqStereo(bus, BUSES[name].eq);
}

export function renderMusic(seconds, { musicLufs = -20, report = false } = {}) {
  const n = toSamples(seconds), ev = compose();
  const dry = stereo(n), send = stereo(n), levels = {};
  for (const name of Object.keys(BUSES)) {
    const bus = renderBus(name, n, ev, makeRng(seedFrom('bus', name)));
    const measured = loudness(bus.L, bus.R).integrated, gain = dbToGain(BUSES[name].lufs - measured);
    levels[name] = measured;
    mixStereo(dry, bus, 0, gain);
    mixStereo(send, bus, 0, gain * BUSES[name].send);
  }
  const wet = eqStereo(freeverb(send, { room: 0.62, damp: 0.55, width: 0.9, predelay: 0.012 }), [biquad('hp', 160), biquad('lp', 6000)]);
  mixStereo(dry, wet, 0, REVERB_RETURN);
  const before = loudness(dry.L, dry.R).integrated;
  const deepest = compressor(dry, { thresholdDb: before + 10, ratio: 3, kneeDb: 6, attack: 0.002, release: 0.12, lookahead: 0.002 });
  const total = loudness(dry.L, dry.R).integrated, trim = dbToGain(musicLufs - total);
  for (let i = 0; i < n; i++) { dry.L[i] *= trim; dry.R[i] *= trim; }
  if (report) {
    const wetLufs = loudness(wet.L, wet.R).integrated + 20 * Math.log10(REVERB_RETURN);
    console.log('music buses (raw integrated LUFS before trim):', Object.entries(levels).map(([k, v]) => `${k} ${v.toFixed(1)}`).join(', '));
    console.log(`reverb return ${(wetLufs - before).toFixed(1)} LU against the dry music; bus compressor reaches ${deepest.toFixed(1)} dB`);
    console.log(`events: ${Object.entries(ev).map(([k, v]) => `${k} ${v.length}`).join(', ')}`);
  }
  return dry;
}
