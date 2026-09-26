import puppeteer from 'puppeteer-core';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { cleanEdges, shrink, gifBytes } from './gif_util.mjs';

const FPS = 25, SIZE = 128, RENDER = 768;
const stills = readdirSync('out/svg').filter(f => f.endsWith('.svg') && !f.endsWith('-animated.svg')).map(f => f.slice(0, -4));
const names = process.argv.slice(2).length ? process.argv.slice(2) : stills;

const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--allow-file-access-from-files'] });
const page = await browser.newPage();
await page.setViewport({ width: RENDER, height: RENDER });
const open = async file => {
  await page.goto(pathToFileURL(resolve(file)).href);
  await page.evaluate(size => { const svg = document.documentElement; svg.setAttribute('width', size); svg.setAttribute('height', size); svg.pauseAnimations(); }, RENDER);
};
const capture = async () => {
  const px = await sharp(await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: RENDER, height: RENDER } })).ensureAlpha().raw().toBuffer();
  cleanEdges(px, RENDER, RENDER);
  return shrink(px, RENDER, RENDER / SIZE, SIZE);
};
for (const name of names) {
  const file = `out/svg/${name}-animated.svg`;
  if (!existsSync(file)) {
    await open(`out/svg/${name}.svg`);
    await sharp(await capture(), { raw: { width: SIZE, height: SIZE, channels: 4 } }).png().toFile(`out/svg/${name}.png`);
    console.log(`${name}.png  ${(statSync(`out/svg/${name}.png`).size / 1024).toFixed(0)} KB, static`);
    continue;
  }
  const dur = +readFileSync(file, 'utf8').match(/dur="([\d.]+)s"/)[1], n = Math.round(dur * FPS);
  await open(file);
  const frames = [];
  for (let i = 0; i < n; i++) {
    // Seek mid-frame, since keyTimes round the frame boundaries.
    await page.evaluate(t => new Promise(done => { document.documentElement.setCurrentTime(t); requestAnimationFrame(() => requestAnimationFrame(done)); }), (i + .5) / FPS);
    frames.push(await capture());
  }
  writeFileSync(`out/svg/${name}-animated.gif`, gifBytes(frames, SIZE, FPS));
  console.log(`${name}-animated.gif  ${(statSync(`out/svg/${name}-animated.gif`).size / 1024).toFixed(0)} KB, ${n} frames`);
}
await browser.close();
