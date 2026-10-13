/*
 * Renders the newsletter's images into images/email/ at twice their display
 * size, since email apps can't use the site's icon font:
 *   - play-icon.png: the Play button's icon, white (20x20 in the email)
 *   - <service>.png: each link button's icon (20x20), named as in SERVICE_ICONS
 *     in scripts/build-feed.mjs, which places them
 *
 *   npm run build:email-images
 *
 * Icons come from the same Font Awesome version as the site, from node_modules.
 * Needs Chromium (set CHROMIUM_PATH if Playwright can't find it). Add a service
 * here and in SERVICE_ICONS together. Give a changed image a new file name:
 * email apps and Brevo cache images by URL.
 */
import { readFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'images/email');
const INK = '#0E100D';
const svg = (set, name) => readFileSync(join(ROOT, `node_modules/@fortawesome/fontawesome-free/svgs/${set}/${name}.svg`), 'utf8');

// Output name → Font Awesome icon, as used on the post pages' buttons.
const ICONS = {
    bandcamp: ['brands', 'bandcamp'],
    'apple-music': ['brands', 'itunes-note'],
    youtube: ['brands', 'youtube'],
    'subvert-fm': ['solid', 'record-vinyl'],
    deezer: ['brands', 'deezer'],
    soundcloud: ['brands', 'soundcloud'],
};

const icon = ([set, name], color = INK, size = 20) => `
<style>
  body { margin: 0; background: transparent; }
  .icon { width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; }
  .icon svg { max-width: ${size}px; max-height: ${size}px; fill: ${color}; }
</style>
<div class="icon">${svg(set, name)}</div>`;

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage({ deviceScaleFactor: 2 });

async function render(html, selector, file) {
    await page.setContent(html);
    await page.locator(selector).screenshot({ path: join(OUT, file), omitBackground: true });
    console.log(`images/email/${file}`);
}

await render(icon(['solid', 'play'], '#ffffff', 14), '.icon', 'play-icon.png');
for (const [name, source] of Object.entries(ICONS)) await render(icon(source), '.icon', `${name}.png`);
await browser.close();
