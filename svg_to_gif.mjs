import puppeteer from 'puppeteer-core';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { cleanEdges, shrink, gifBytes } from './gif_util.mjs';

const FPS = 25, SIZE = 128, RENDER = 768;
const all = readdirSync('out/svg').filter(f => f.endsWith('-animated.svg')).map(f => f.replace('-animated.svg', ''));
const names = process.argv.slice(2).length ? process.argv.slice(2) : all;

const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--allow-file-access-from-files'] });
const page = await browser.newPage();
await page.setViewport({ width: RENDER, height: RENDER });
for (const name of names) {
  const file = `out/svg/${name}-animated.svg`, dur = +readFileSync(file, 'utf8').match(/dur="([\d.]+)s"/)[1], n = Math.round(dur * FPS);
  await page.goto(pathToFileURL(resolve(file)).href);
  await page.evaluate(size => { const svg = document.documentElement; svg.setAttribute('width', size); svg.setAttribute('height', size); svg.pauseAnimations(); }, RENDER);
  const frames = [];
  for (let i = 0; i < n; i++) {
    // Seek mid-frame, since keyTimes round the frame boundaries.
    await page.evaluate(t => new Promise(done => { document.documentElement.setCurrentTime(t); requestAnimationFrame(() => requestAnimationFrame(done)); }), (i + .5) / FPS);
    const px = await sharp(await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: RENDER, height: RENDER } })).ensureAlpha().raw().toBuffer();
    cleanEdges(px, RENDER, RENDER);
    frames.push(shrink(px, RENDER, RENDER / SIZE, SIZE));
  }
  writeFileSync(`out/svg/${name}-animated.gif`, gifBytes(frames, SIZE, FPS));
  console.log(`${name}-animated.gif  ${(statSync(`out/svg/${name}-animated.gif`).size / 1024).toFixed(0)} KB, ${n} frames`);
}
await browser.close();
