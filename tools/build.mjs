// Outil de construction (optionnel) :
//  1) génère les icônes PNG à partir de js/icon.js (via le Chromium de Playwright)
//  2) régénère la liste des fichiers mis en cache par le service worker (sw.js)
// Usage : node tools/build.mjs [--no-icons]
import { readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const require = createRequire(import.meta.url);

function walk(dir, out = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
}

if (!process.argv.includes('--no-icons')) {
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const src = readFileSync(join(root, 'js/icon.js'), 'utf8').replace('export function', 'function');
  await page.setContent('<html><body></body></html>');
  await page.addScriptTag({ content: src + '\nwindow.drawAppIcon = drawAppIcon;' });
  for (const [name, size, mask] of [['icon-180', 180, false], ['icon-192', 192, false], ['icon-512', 512, false], ['icon-maskable-512', 512, true]]) {
    const data = await page.evaluate(([size, mask]) => { const c = document.createElement('canvas'); c.width = c.height = size; window.drawAppIcon(c.getContext('2d'), size, mask); return c.toDataURL('image/png').split(',')[1]; }, [size, mask]);
    writeFileSync(join(root, 'icons', name + '.png'), Buffer.from(data, 'base64'));
    console.log('icône', name);
  }
  await browser.close();
}

const files = ['./', ...walk(root)
  .map((p) => relative(root, p).split('\\').join('/'))
  .filter((p) => /^(index\.html|manifest\.webmanifest|css\/|js\/|icons\/)/.test(p))
  .sort()];
const sw = readFileSync(join(root, 'sw.js'), 'utf8');
const version = 'astralume-' + new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
const out = sw
  .replace(/const VERSION = '[^']*';/, `const VERSION = '${version}';`)
  .replace(/const ASSETS = \[[\s\S]*?\];/, 'const ASSETS = ' + JSON.stringify(files, null, 2) + ';');
writeFileSync(join(root, 'sw.js'), out);
console.log(`sw.js : ${files.length} fichiers, version ${version}`);
