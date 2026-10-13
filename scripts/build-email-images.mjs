/*
 * Renders the newsletter's images into images/email/ at twice their display
 * size, since email apps can't use the site's icon font or draw its buttons:
 *   - play.png: the Play button (320x44 in the email)
 *   - <service>.png: each link button's icon (20x20), named as in SERVICE_ICONS
 *     in scripts/build-feed.mjs, which places them
 *
 *   npm run build:email-images
 *
 * Icons come from the same Font Awesome version as the site and the button uses
 * Instrument Sans, both from node_modules. Needs Chromium (set CHROMIUM_PATH if
 * Playwright can't find it). Add a service here and in SERVICE_ICONS together.
 */
import { readFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'images/email');
const INK = '#0E100D';
const svg = (set, name) => readFileSync(join(ROOT, `node_modules/@fortawesome/fontawesome-free/svgs/${set}/${name}.svg`), 'utf8');
const font = (weight) => readFileSync(join(ROOT, `node_modules/@fontsource/instrument-sans/files/instrument-sans-latin-${weight}-normal.woff2`)).toString('base64');

// Output name → Font Awesome icon, as used on the post pages' buttons.
const ICONS = {
    bandcamp: ['brands', 'bandcamp'],
    'apple-music': ['brands', 'itunes-note'],
    youtube: ['brands', 'youtube'],
    'subvert-fm': ['solid', 'record-vinyl'],
    deezer: ['brands', 'deezer'],
    soundcloud: ['brands', 'soundcloud'],
};

const playButton = `
<style>
  @font-face { font-family: 'Instrument Sans'; font-weight: 700; src: url(data:font/woff2;base64,${font(700)}) format('woff2'); }
  body { margin: 0; background: transparent; }
  .button { box-sizing: border-box; width: 320px; height: 44px; display: flex; align-items: center; gap: 12px;
    padding: 0 16px; border-radius: 8px; background: ${INK}; color: #ffffff;
    font: 700 16px/1 'Instrument Sans', sans-serif; }
  .icon { width: 20px; display: flex; justify-content: center; }
  .icon svg { height: 15px; fill: #ffffff; }
</style>
<div class="button"><span class="icon">${svg('solid', 'play')}</span>Play</div>`;

const icon = ([set, name]) => `
<style>
  body { margin: 0; background: transparent; }
  .icon { width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; }
  .icon svg { max-width: 20px; max-height: 20px; fill: ${INK}; }
</style>
<div class="icon">${svg(set, name)}</div>`;

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage({ deviceScaleFactor: 2 });

async function render(html, selector, file) {
    await page.setContent(html);
    await page.evaluate(() => document.fonts.ready);
    await page.locator(selector).screenshot({ path: join(OUT, file), omitBackground: true });
    console.log(`images/email/${file}`);
}

await render(playButton, '.button', 'play.png');
for (const [name, source] of Object.entries(ICONS)) await render(icon(source), '.icon', `${name}.png`);
await browser.close();
