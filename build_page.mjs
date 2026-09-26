import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const EMOJI = ['happy', 'love', 'dance', 'think', 'sad', 'rage', 'cool', 'sleepy', 'cry', 'wink', 'laser', 'thumbsup', 'verynice', 'ko'];
const svgOf = name => existsSync(`out/svg/${name}-animated.svg`) ? `out/svg/${name}-animated.svg` : `out/svg/${name}.svg`;
const inline = name => readFileSync(svgOf(name), 'utf8')
  .replace(/ width="128" height="128"/, ` role="img" aria-label="Qwik bolt: ${name}"`)
  .trim();

const html = `<title>Qwik Bolt Emoji</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Grandstander:wght@800&family=JetBrains+Mono:wght@500&display=swap">
<style>
  :root {
    --bg: #F4F3FA; --surface: #FFFFFF; --ink: #1B1928; --muted: #5E5A72; --line: #E2DFEE;
    --purple: #AC7EF4; --blue: #18B6F6;
    color-scheme: light;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) { --bg: #121119; --surface: #1B1A24; --ink: #EFEBF8; --muted: #A5A0BA; --line: #2C2A39; color-scheme: dark; }
  }
  :root[data-theme="dark"] { --bg: #121119; --surface: #1B1A24; --ink: #EFEBF8; --muted: #A5A0BA; --line: #2C2A39; color-scheme: dark; }
  body { background: var(--bg); color: var(--ink); font: 16px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
  main { max-width: 1000px; margin: 0 auto; padding-inline: 20px; padding-block: 40px 64px; display: grid; gap: 28px; }
  h1 { margin: 0; font: 800 clamp(40px, 7vw, 64px)/1 "Grandstander", "Trebuchet MS", system-ui, sans-serif; text-wrap: balance;
       text-shadow: .05em -.05em 0 var(--purple), -.05em .05em 0 var(--blue); }
  p { margin: 0; color: var(--muted); max-width: 60ch; }
  ul { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 14px; }
  li { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 12px 12px 14px; display: grid; justify-items: center; gap: 6px; }
  li svg { width: 100%; max-width: 160px; height: auto; aspect-ratio: 1; }
  code { font: 500 13px/1 "JetBrains Mono", ui-monospace, Menlo, monospace; color: var(--muted); }
</style>
<main>
  <h1>Qwik Bolt Emoji</h1>
  <p>The bolt from the Qwik logo in fourteen moods, as vector SVGs. All but one loop every 2 to 3 seconds.</p>
  <ul>
${EMOJI.map(n => `    <li>\n${inline(n)}\n      <code>:qwik_${n}:</code>\n    </li>`).join('\n')}
  </ul>
</main>
<script>
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) document.querySelectorAll('li svg').forEach(svg => svg.pauseAnimations());
</script>
`;
mkdirSync('out/site', { recursive: true });
writeFileSync('out/site/qwik-bolt-emoji.html', html);
console.log('out/site/qwik-bolt-emoji.html', Math.round(html.length / 1024), 'KB');
