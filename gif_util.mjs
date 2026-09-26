import gifenc from 'gifenc';
const { GIFEncoder, quantize, applyPalette } = gifenc;

export function cleanEdges(px, width, height, reach = 2) {
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4, a = px[i + 3];
    if (a === 0 || a >= 250) continue;
    let r = 0, g = 0, b = 0, n = 0;
    for (let dy = -reach; dy <= reach; dy++) for (let dx = -reach; dx <= reach; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= width || yy >= height) continue;
      const j = (yy * width + xx) * 4;
      if (px[j + 3] < 250) continue;
      r += px[j]; g += px[j + 1]; b += px[j + 2]; n++;
    }
    if (n) { px[i] = r / n; px[i + 1] = g / n; px[i + 2] = b / n; }
    else if (a < 90) px[i + 3] = 0;
  }
}
// Block average: lanczos and mitchell overshoot into bright edge specks.
export function shrink(px, width, k, size) {
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (let dy = 0; dy < k; dy++) for (let dx = 0; dx < k; dx++) {
      const i = ((y * k + dy) * width + x * k + dx) * 4, w = px[i + 3];
      r += px[i] * w; g += px[i + 1] * w; b += px[i + 2] * w; a += w;
    }
    const o = (y * size + x) * 4;
    if (a) { out[o] = r / a; out[o + 1] = g / a; out[o + 2] = b / a; }
    out[o + 3] = a / (k * k);
  }
  return out;
}
export function gifBytes(frames, size, fps) {
  const palette = quantize(Buffer.concat(frames), 255, { format: 'rgba4444', oneBitAlpha: true, clearAlpha: true });
  const transparentIndex = palette.findIndex(c => c[3] === 0), gif = GIFEncoder();
  frames.forEach((rgba, i) => gif.writeFrame(applyPalette(rgba, palette, 'rgba4444'), size, size,
    { palette: i === 0 ? palette : undefined, delay: 1000 / fps, dispose: 2, transparent: transparentIndex >= 0, transparentIndex }));
  gif.finish();
  return gif.bytes();
}
