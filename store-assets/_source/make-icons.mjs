// Builds every logo/icon PNG from brand/logo.svg (and brand/logo-small.svg for 16/32/48 px).
//   node store-assets/_source/make-icons.mjs
import { render } from './render.mjs';
import { writeFileSync, mkdtempSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..', '..');
const brand = path.join(here, '..', 'brand');
const tmp = mkdtempSync(path.join(os.tmpdir(), 'tm-icons-'));

const wrap = (svgFile, size) =>
  `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:transparent}` +
  `img{display:block;width:${size}px;height:${size}px}</style>` +
  `<img src="file:///${path.join(brand, svgFile).replace(/\\/g, '/')}">`;

const targets = [
  // [svg, size, output]
  ['logo-small.svg', 16,  path.join(root, 'icons', 'icon16.png')],
  ['logo-small.svg', 32,  path.join(root, 'icons', 'icon32.png')],
  ['logo-small.svg', 48,  path.join(root, 'icons', 'icon48.png')],
  ['logo.svg',       128, path.join(root, 'icons', 'icon128.png')],   // Chrome store icon (96 px art + 16 px padding)
  ['logo.svg',       300, path.join(brand, 'logo-300x300.png')],      // Edge Add-ons logo
  ['logo.svg',       512, path.join(brand, 'logo-512.png')],
];

for (const [svg, size, out] of targets) {
  const html = path.join(tmp, `wrap-${svg}-${size}.html`);
  writeFileSync(html, wrap(svg, size));
  render(html, out, size, size, { transparent: true });
  console.log('wrote', path.relative(root, out));
}
