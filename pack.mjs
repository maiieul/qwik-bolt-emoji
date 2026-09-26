import { copyFileSync, readdirSync, readFileSync } from 'node:fs';

const isCheck = process.argv.includes('--check');
const sameBytes = (a, b) => { try { return readFileSync(a).equals(readFileSync(b)); } catch { return false; } };
const pairs = readdirSync('out/svg').flatMap(file => {
  const [, name, animated, ext] = file.match(/^(\w+)(-animated)?\.(svg|gif)$/) ?? [];
  return name ? [[`out/svg/${file}`, `dist/qwik_${name}${animated ? '_animated' : ''}.${ext}`]] : [];
});
if (isCheck) {
  const changed = pairs.filter(([from, to]) => !sameBytes(from, to)).map(([, to]) => to);
  console.log(changed.length ? `differs from out/svg: ${changed.join(' ')}` : `dist/ matches out/svg (${pairs.length} files)`);
  process.exitCode = changed.length ? 1 : 0;
} else {
  pairs.forEach(([from, to]) => copyFileSync(from, to));
  console.log(`${pairs.length} files → dist/`);
}
