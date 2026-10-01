import sharp from 'sharp';
const [, , dirA, dirB, out, timesArg, wArg] = process.argv;
const times = timesArg.split(',').map(Number), w = +(wArg || 480), h = Math.round(w * 9 / 16);
const label = (txt, ww) => Buffer.from(`<svg width="${ww}" height="22"><rect width="${ww}" height="22" fill="rgba(0,0,0,.7)"/><text x="6" y="16" font-size="14" fill="#fff" font-family="sans-serif">${txt}</text></svg>`);
const comps = [];
for (let i = 0; i < times.length; i++) {
  const t = times[i], f = `f${String(Math.round(t * 24)).padStart(5, '0')}.jpg`;
  for (const [j, dir, name] of [[0, dirA, 'before'], [1, dirB, 'after']]) {
    const input = await sharp(`${dir}/${f}`).resize(w, h).composite([{ input: label(`${t.toFixed(2)}s ${name}`, 130), top: 0, left: 0 }]).jpeg().toBuffer();
    comps.push({ input, left: j * w, top: i * h });
  }
}
await sharp({ create: { width: 2 * w, height: times.length * h, channels: 3, background: { r: 0, g: 0, b: 0 } } }).composite(comps).jpeg({ quality: 85 }).toFile(out);
console.log(out);
