import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, rmSync, writeFileSync, statSync } from 'node:fs';
import sharp from 'sharp';
import { cleanEdges, shrink, gifBytes } from './gif_util.mjs';

const BOX = [576, 156, 768, 768], SIZE = 128, FPS = 25;
// Must match EMOJI_STILL in src/emoji.js.
const STILL = { happy: .5, love: .08, dance: .2, think: .8, sad: .5, rage: .1, cool: .5, sleepy: .6, cry: .1, wink: 1.4, laser: .3, thumbsup: .08, verynice: 0, ko: .5 };
const ALL = Object.keys(STILL);
const names = process.argv.slice(2).length ? process.argv.slice(2) : ALL;
mkdirSync('out/emoji', { recursive: true });

// The nofill pass has the true silhouette; watercolour bleeds past it.
async function frameRGBA(file, maskFile) {
  const [left, top, width, height] = BOX, raw = f => sharp(f).extract({ left, top, width, height }).ensureAlpha().raw().toBuffer();
  const [px, mask] = await Promise.all([raw(file), raw(maskFile)]);
  for (let i = 3; i < px.length; i += 4) px[i] = Math.min(px[i], mask[i]);
  cleanEdges(px, width, height);
  return shrink(px, width, width / SIZE, SIZE);
}

for (const name of names) {
  const dir = `out/emoji_frames/${name}`, maskDir = `${dir}_mask`;
  for (const [query, out] of process.env.REUSE ? [] : [['clear', dir], ['clear&nofill', maskDir]]) {
    rmSync(out, { recursive: true, force: true });
    execFileSync('node', ['render_bolt.mjs', '--page=bolt.html', `--query=${query}`, `--loop=emoji_${name}`, '--png', `--fps=${FPS}`, `--out=${out}`], { stdio: 'inherit' });
  }
  const files = readdirSync(dir).filter(f => f.endsWith('.png')).sort();
  const frames = await Promise.all(files.map(f => frameRGBA(`${dir}/${f}`, `${maskDir}/${f}`)));
  writeFileSync(`out/emoji/${name}.gif`, gifBytes(frames, SIZE, FPS));
  await sharp(frames[Math.round(STILL[name] * FPS)], { raw: { width: SIZE, height: SIZE, channels: 4 } }).png().toFile(`out/emoji/${name}.png`);
  console.log(`${name}.gif  ${(statSync(`out/emoji/${name}.gif`).size / 1024).toFixed(0)} KB, ${frames.length} frames`);
}

const stills = ALL.filter(n => { try { return statSync(`out/emoji/${n}.png`); } catch { return false; } });
const rowH = 150, colW = 210, W = 30 + colW * stills.length, H = rowH * 2 + 20;
const comps = [];
for (const r of [0, 1]) {
  for (const [i, n] of stills.entries()) {
    const x = 20 + i * colW, y = 10 + r * rowH;
    for (const [s, dx, dy] of [[128, 0, 10], [48, 135, 10], [22, 135, 70]]) {
      comps.push({ input: await sharp(`out/emoji/${n}.png`).resize(s, s, { kernel: 'lanczos3' }).toBuffer(), left: x + dx, top: y + dy });
    }
  }
}
const bgs = [['#313338', 0], ['#FFFFFF', 1]].map(([c, r]) => ({ input: { create: { width: W, height: rowH, channels: 4, background: c } }, left: 0, top: r * rowH }));
await sharp({ create: { width: W, height: H, channels: 4, background: '#888888' } }).composite([...bgs, ...comps]).png().toFile('out/emoji/preview.png');
console.log('out/emoji/preview.png');
