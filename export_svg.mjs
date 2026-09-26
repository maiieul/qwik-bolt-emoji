import puppeteer from 'puppeteer-core';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const FPS = 25, [BX, BY, BOX] = [576, 156, 768], SIZE = 128;
mkdirSync('out/svg', { recursive: true });

const num = v => String(Math.round(v * 10) / 10), exact = v => String(Math.round(v * 1e4) / 1e4);
const xy = ([x, y]) => `${num(x)} ${num(y)}`;
function pathOf({ pts, closed, smooth }) {
  if (!smooth || pts.length < 3) return `M${pts.map(xy).join(' ')}${closed ? 'Z' : ''}`;
  const n = pts.length, k = Math.min(1, smooth * 2) / 6, P = i => closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))];
  let d = `M${xy(pts[0])}`;
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    d += `C${xy([p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k])} ${xy([p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k])} ${xy(p2)}`;
  }
  return d + (closed ? 'Z' : '');
}
function transformOf([a, b, c, d, e, f]) {
  const x = num(e - BX), y = num(f - BY);
  const plain = Math.abs(a - 1) < 1e-4 && Math.abs(d - 1) < 1e-4 && Math.abs(b) < 1e-4 && Math.abs(c) < 1e-4;
  return plain ? `translate(${x} ${y})` : `matrix(${exact(a)} ${exact(b)} ${exact(c)} ${exact(d)} ${x} ${y})`;
}
// Name-scoped ids let several SVGs share one HTML page.
function build(name, frames) {
  const defs = new Map();
  const place = s => {
    const style = s.stroke ? `fill="none" stroke="${s.stroke}" stroke-width="${num(s.width)}"`
      : `fill="${s.fill}"${s.opacity < .999 ? ` fill-opacity="${Math.round(s.opacity * 100) / 100}"` : ''}${s.soft ? ` filter="url(#${name}-soft)"` : ''}`;
    const d = pathOf(s), key = d + '|' + style;
    if (!defs.has(key)) { const id = `${name}-${defs.size.toString(36)}`; defs.set(key, { id, el: `<path id="${id}" d="${d}" ${style}/>` }); }
    return `<use href="#${defs.get(key).id}" transform="${transformOf(s.m)}"/>`;
  };
  const placed = frames.map(shapes => shapes.map(place).join(''));
  return { defs: [...defs.values()].map(v => v.el).join('\n'), placed };
}
const svg = (name, defs, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BOX} ${BOX}" width="${SIZE}" height="${SIZE}">
<title>Qwik bolt: ${name}</title>
<defs><filter id="${name}-soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="4"/></filter>
${defs}</defs>
<g stroke-linecap="round" stroke-linejoin="round">
${body}
</g>
</svg>
`;
function gapsOf(frames) {
  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const { pts, m: [a, b, c, d, e, f], width = 0 } of frames.flat()) {
    const pad = width / 2 * Math.hypot(a, b);
    for (const [px, py] of pts) {
      const x = a * px + c * py + e - BX, y = b * px + d * py + f - BY;
      x0 = Math.min(x0, x - pad); x1 = Math.max(x1, x + pad);
      if (x >= 0 && x <= BOX) { y0 = Math.min(y0, y - pad); y1 = Math.max(y1, y + pad); }
    }
  }
  const px = v => (v * SIZE / BOX).toFixed(1);
  return `top ${px(y0)} bottom ${px(BOX - y1)} left ${px(x0)} right ${px(BOX - x1)}`;
}
function frameGroup(inner, i, n, dur) {
  const at = j => String(Math.round(j / n * 1e5) / 1e5);
  const [values, times] = i === 0 ? ['inline;none', `0;${at(1)}`] : i === n - 1 ? ['none;inline', `0;${at(i)}`] : ['none;inline;none', `0;${at(i)};${at(i + 1)}`];
  return `<g display="${i ? 'none' : 'inline'}"><animate attributeName="display" values="${values}" keyTimes="${times}" dur="${dur}s" calcMode="discrete" repeatCount="indefinite"/>${inner}</g>`;
}

const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--allow-file-access-from-files', '--use-angle=metal'] });
const page = await browser.newPage();
page.on('pageerror', e => console.log('[page error]', e.message));
await page.goto(pathToFileURL(resolve('bolt.html')).href + '?render', { waitUntil: 'networkidle0' });
await page.waitForFunction('window.ready === true');
const { names: all, lens, stills } = await page.evaluate(() => ({ names: window.EMOJI_NAMES, lens: Object.fromEntries(window.EMOJI_NAMES.map(n => [n, LOOPS['emoji_' + n].len])), stills: window.EMOJI_STILL }));
const names = process.argv.slice(2).length ? process.argv.slice(2) : all;
for (const name of names) {
  const n = Math.round(lens[name] * FPS), frames = [];
  for (let i = 0; i < n; i++) frames.push(await page.evaluate((e, t) => window.recordFrame('emoji_' + e, t), name, i / FPS));
  const still = build(name, [frames[Math.round(stills[name] * FPS)]]);
  writeFileSync(`out/svg/${name}.svg`, svg(name, still.defs, still.placed[0]));
  if (n > 1) {
    const anim = build(name, frames);
    writeFileSync(`out/svg/${name}-animated.svg`, svg(name, anim.defs, anim.placed.map((p, i) => frameGroup(p, i, n, lens[name])).join('\n')));
  }
  console.log(`${name}: ${n > 1 ? `${n} frames` : 'static'}, gaps in px ${gapsOf(frames)}`);
}
await browser.close();
