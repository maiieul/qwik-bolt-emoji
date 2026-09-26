import puppeteer from 'puppeteer-core';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--allow-file-access-from-files'] });
const page = await browser.newPage();
page.on('pageerror', e => console.log('[page error]', e.message));
await page.goto(pathToFileURL(resolve('bolt.html')).href + '?render', { waitUntil: 'networkidle0' });
await page.waitForFunction('window.ready === true');
const names = process.argv.slice(2).length ? process.argv.slice(2) : await page.evaluate(() => window.EMOJI_NAMES);

const report = await page.evaluate(names => {
  const PARTS = ['eyes', 'sobFace', 'mouth', 'brows', 'mustache'], BRUSH = { ink: 5.4, inkfine: 2.8, dry: 6 }, OUTLINE = 5.9;
  function recordParts(loop, t) {
    const shapes = [], saved = { paint, inkLine, flushBrush, glow }, drawers = {}, stack = [];
    let m = [1, 0, 0, 1, 0, 0], part = null;
    const transforms = {
      push: () => stack.push(m.slice()), pop: () => { m = stack.pop(); },
      translate: (x, y) => { m = [m[0], m[1], m[2], m[3], m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]; },
      rotate: a => { const c = Math.cos(a), s = Math.sin(a); m = [m[0] * c + m[2] * s, m[1] * c + m[3] * s, -m[0] * s + m[2] * c, -m[1] * s + m[3] * c, m[4], m[5]]; },
      scale: (sx, sy = sx) => { m = [m[0] * sx, m[1] * sx, m[2] * sy, m[3] * sy, m[4], m[5]]; },
    };
    const p5Transforms = Object.fromEntries(Object.keys(transforms).map(k => [k, Object.getOwnPropertyDescriptor(window, k)]));
    for (const [k, fn] of Object.entries(transforms)) Object.defineProperty(window, k, { value: fn, writable: true, configurable: true });
    for (const f of PARTS) {
      drawers[f] = window[f];
      window[f] = (...args) => { const outer = part; part = f === 'eyes' && args[1].eyes === 'shades' ? 'shades' : f; try { return drawers[f](...args); } finally { part = outer; } };
    }
    const toCanvas = ([x, y]) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
    paint = (pts, o = {}) => {
      if (!pts.length || (o.fill && !o.wash)) return;
      const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), size = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
      const ink = o.ink === null ? 0 : Math.min((o.sw ?? 1) * OUTLINE * (o.br === 'inkfine' ? .53 : 1), size * .09) * Math.hypot(m[0], m[1]);
      const isOutline = !part && pts.length === 36 && !o.wash && o.ink === PAL.ink;
      shapes.push({ part: isOutline ? 'outline' : part === 'sobFace' ? 'tears' : part, pts: pts.map(toCanvas), pad: ink / 2 });
    };
    inkLine = (pts, sw = 1, col, br = 'ink') => shapes.push({ part, pts: pts.map(toCanvas), pad: sw * (BRUSH[br] || BRUSH.ink) / 2 * Math.hypot(m[0], m[1]) });
    flushBrush = () => {}; glow = () => {};
    try { T = t; BOILN = Math.floor(t * BOIL); CLAWD_N = 0; boilSeed('frame'); noiseSeed(77); LOOPS[loop](t); }
    finally {
      ({ paint, inkLine, flushBrush, glow } = saved);
      for (const [k, d] of Object.entries(p5Transforms)) Object.defineProperty(window, k, d);
      for (const f of PARTS) window[f] = drawers[f];
    }
    return shapes;
  }
  const out = {};
  for (const name of names) {
    const worst = {}, loop = 'emoji_' + name, frames = Math.round(LOOPS[loop].len * 25);
    for (let i = 0; i < frames; i++) {
      const shapes = recordParts(loop, i / 25), outline = shapes.find(s => s.part === 'outline'), P = outline.pts;
      const inside = ([x, y]) => { let c = false; for (let a = 0, b = P.length - 1; a < P.length; b = a++) if ((P[a][1] > y) !== (P[b][1] > y) && x < (P[b][0] - P[a][0]) * (y - P[a][1]) / (P[b][1] - P[a][1]) + P[a][0]) c = !c; return c; };
      const toEdge = ([x, y]) => Math.min(...P.map((b, j) => {
        const a = P[(j + P.length - 1) % P.length], dx = b[0] - a[0], dy = b[1] - a[1], k = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy)));
        return Math.hypot(x - a[0] - k * dx, y - a[1] - k * dy);
      }));
      for (const s of shapes) {
        if (!PARTS.includes(s.part)) continue;
        for (const p of s.pts) {
          const margin = (inside(p) ? toEdge(p) : -toEdge(p)) - s.pad - outline.pad;
          if (margin < (worst[s.part]?.margin ?? Infinity)) worst[s.part] = { margin, frame: i };
        }
      }
    }
    out[name] = worst;
  }
  return out;
}, names);

const px = v => (v * 128 / 768).toFixed(1);
for (const [name, parts] of Object.entries(report)) {
  console.log(name.padEnd(9), Object.entries(parts).map(([part, { margin, frame }]) => `${part} ${px(margin)} (frame ${frame})`).join('   '));
}
await browser.close();
