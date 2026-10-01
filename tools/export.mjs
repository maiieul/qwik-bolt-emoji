import FFMPEG from 'ffmpeg-static';
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';

const fps = 24, frames = 'out/frames/f%05d.jpg';
const config = readFileSync('src/config.js', 'utf8');
const duration = +config.match(/duration:\s*([\d.]+)/)[1], audio = config.match(/audio:\s*'([^']+)'/)[1];
const name = process.argv.find(a => a.startsWith('--name='))?.slice(7);
const base = name ? `out/drafts/${name}` : 'out/qwik-javascript-streaming';
const count = readdirSync('out/frames').filter(f => f.endsWith('.jpg')).length;
if (count !== Math.round(duration * fps)) { console.error(`expected ${Math.round(duration * fps)} frames in out/frames, found ${count}`); process.exit(1); }

const outputs = [
  { file: `${base}-1080p.mp4`, scale: null, crf: 18, preset: 'slow' },
  { file: `${base}-720p.mp4`, scale: '1280:720', crf: 24, preset: 'slow' },
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
