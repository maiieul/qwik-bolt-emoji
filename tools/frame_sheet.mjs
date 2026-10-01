import sharp from 'sharp';
const [, , dir, out, t0s, t1s, steps, colsS, wS] = process.argv;
const t0 = +t0s, t1 = +t1s, step = +steps, cols = +colsS, w = +wS, h = Math.round(w * 9 / 16);
const ts = [];
for (let t = t0; t <= t1 + 1e-6; t += step) ts.push(+t.toFixed(3));
const rows = Math.ceil(ts.length / cols);
const comps = [];
for (let i = 0; i < ts.length; i++) {
  const t = ts[i], f = `${dir}/f${String(Math.round(t * 24)).padStart(5, '0')}.jpg`;
  const label = Buffer.from(`<svg width="${w}" height="${h}"><rect x="0" y="0" width="64" height="20" fill="rgba(0,0,0,.65)"/><text x="4" y="15" font-size="14" fill="#fff" font-family="sans-serif">${t.toFixed(2)}</text></svg>`);
  const input = await sharp(f).resize(w, h).composite([{ input: label, top: 0, left: 0 }]).jpeg().toBuffer();
  comps.push({ input, left: (i % cols) * w, top: Math.floor(i / cols) * h });
}
await sharp({ create: { width: cols * w, height: rows * h, channels: 3, background: { r: 0, g: 0, b: 0 } } }).composite(comps).jpeg({ quality: 85 }).toFile(out);
console.log(out, ts.length);
