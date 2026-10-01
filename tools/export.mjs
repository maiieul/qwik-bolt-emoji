import FFMPEG from 'ffmpeg-static';
import { spawnSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';

const fps = 24, frames = 'out/frames/f%05d.jpg', audio = 'assets/soundtrack.wav';
const count = readdirSync('out/frames').filter(f => f.endsWith('.jpg')).length;
if (count !== 66 * fps) { console.error(`expected ${66 * fps} frames in out/frames, found ${count}`); process.exit(1); }

const outputs = [
  { file: 'out/qwik-javascript-streaming-1080p.mp4', scale: null, crf: 18, preset: 'slow' },
  { file: 'out/qwik-javascript-streaming-720p.mp4', scale: '1280:720', crf: 24, preset: 'slow' },
];
for (const o of outputs) {
  const args = ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', frames, '-i', audio, '-map', '0:v', '-map', '1:a',
    ...(o.scale ? ['-vf', `scale=${o.scale}:flags=lanczos`] : []),
    '-c:v', 'libx264', '-preset', o.preset, '-crf', String(o.crf), '-pix_fmt', 'yuv420p', '-tune', 'animation',
    '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', o.file];
  const r = spawnSync(FFMPEG, args, { stdio: 'inherit' });
  if (r.status) process.exit(r.status);
  console.log(`${o.file}  ${(statSync(o.file).size / 1e6).toFixed(1)} MB`);
}
