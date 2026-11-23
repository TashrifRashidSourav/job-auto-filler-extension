#!/usr/bin/env node
/* Renders the Microsoft Edge Add-ons listing images from the real extension UI (using fictional demo data).
 *   npm install            (once, installs puppeteer-core)
 *   npm run assets
 * Needs Google Chrome or Microsoft Edge installed (set BROWSER_PATH to override). Output: store/edge/ */
'use strict';
const fs = require('fs'), path = require('path'), { pathToFileURL } = require('url');
let puppeteer;
try { puppeteer = require('puppeteer-core'); } catch (e) { console.error('Run "npm install" first (needs puppeteer-core).'); process.exit(1); }

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'store', 'src');
const OUT = path.join(ROOT, 'store', 'edge');
const SHOTS = path.join(OUT, 'screenshots');

const BROWSERS = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/microsoft-edge'
];
const executablePath = process.env.BROWSER_PATH || BROWSERS.find((p) => fs.existsSync(p));
if (!executablePath) { console.error('No Chrome/Edge found. Set BROWSER_PATH to the browser executable.'); process.exit(1); }

/* the real popup / settings pages, with a stand-in for the extension APIs, as throw-away files */
const TEMP = [];
function makeTemp(rel) {
  const src = path.join(ROOT, 'extension', rel), dst = path.join(path.dirname(src), '_store.html');
  let html = fs.readFileSync(src, 'utf8');
  html = html.replace(/<script src=/, '<script src="../../store/src/stub.js"></script>\n<script src=');
  html = html.replace('</body>', '<script src="../../store/src/auto.js"></script>\n</body>');
  fs.writeFileSync(dst, html);
  TEMP.push(dst);
}

function pngSize(file) { const b = fs.readFileSync(file); return b.readUInt32BE(0) === 0x89504e47 ? { w: b.readUInt32BE(16), h: b.readUInt32BE(20) } : null; }

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  makeTemp('popup/popup.html');
  makeTemp('options/options.html');
  const browser = await puppeteer.launch({ executablePath, headless: 'new', args: ['--allow-file-access-from-files', '--hide-scrollbars', '--force-color-profile=srgb'] });
  let bad = 0;
  async function shoot(page, hash, out, w, h, opts) {
    opts = opts || {};
    const p = await browser.newPage();
    await p.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
    await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
    await p.goto(pathToFileURL(path.join(SRC, page)).href + (hash ? '#' + encodeURIComponent(hash) : ''), { waitUntil: 'load' });
    if (opts.ready) await p.waitForFunction('window.__SHOT_READY__ === true', { timeout: 90000 });
    await new Promise((r) => setTimeout(r, opts.wait || 1500));
    await p.screenshot({ path: out, omitBackground: !!opts.transparent });
    await p.close();
    const s = pngSize(out), ok = s && s.w === w && s.h === h;
    if (!ok) bad++;
    console.log((ok ? 'ok   ' : 'SIZE ') + path.relative(ROOT, out) + (s ? '  ' + s.w + 'x' + s.h : ''));
  }
  try {
    // Screenshots: 1280x800 (Edge accepts 1280x800 or 640x480, max 6)
    await shoot('demo-form.html', 'fill|Fill any job application in one click|Your saved details go into the right fields in seconds - even offline.', path.join(SHOTS, '01-fill-in-one-click.png'), 1280, 800, { ready: true });
    await shoot('demo-form.html', 'preview|Review every match before it fills|See what will be filled, fix a field once, and it is remembered for that site.', path.join(SHOTS, '02-review-before-filling.png'), 1280, 800, { ready: true });
    await shoot('demo-form-bn.html', 'fill|English profile, Bangla form|Understands Bangla labels and dropdown options, including names matched by sound.', path.join(SHOTS, '03-english-and-bangla.png'), 1280, 800, { ready: true });
    await shoot('shot-profile.html', '', path.join(SHOTS, '04-save-your-details-once.png'), 1280, 800, { wait: 2000 });
    await shoot('shot-import.html', '', path.join(SHOTS, '05-import-csv-word-cv.png'), 1280, 800, { wait: 3000 });
    await shoot('shot-popup.html', '', path.join(SHOTS, '06-private-by-design.png'), 1280, 800, { wait: 2000 });
    // Promotional images and logo
    await shoot('tile-small.html', '', path.join(OUT, 'promo-small-440x280.png'), 440, 280, { wait: 800 });
    await shoot('tile-large.html', '', path.join(OUT, 'promo-large-1400x560.png'), 1400, 560, { wait: 2000 });
    await shoot('logo-300.html', '', path.join(OUT, 'store-logo-300x300.png'), 300, 300, { wait: 500, transparent: true });
  } finally {
    await browser.close();
    TEMP.forEach((f) => { try { fs.unlinkSync(f); } catch (e) { /* ignore */ } });
  }
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); TEMP.forEach((f) => { try { fs.unlinkSync(f); } catch (x) { /* ignore */ } }); process.exit(1); });
