// Renders tools/og.html to public/assets/img/og.png (1200 x 630).
// PLAYWRIGHT_CORE: path to playwright-core (kept outside the repo). CHROME_PATH: optional browser executable.
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

// createRequire accepts a package directory path, which a bare ESM import does not.
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const here = dirname(fileURLToPath(import.meta.url));
const src = pathToFileURL(join(here, 'og.html')).href;
const out = join(here, '..', 'public', 'assets', 'img', 'og.png');

const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.goto(src, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(300);
await page.screenshot({ path: out, fullPage: false, type: 'png' });
await browser.close();
console.log('wrote ' + out);
