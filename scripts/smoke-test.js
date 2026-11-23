#!/usr/bin/env node
/* End-to-end smoke test in a REAL browser: loads the unpacked extension, uses the real settings page and
 * chrome.storage, then runs the real injection + fill path on a local test page.
 *   npm run smoke
 * (A temporary copy of the extension gets an extra host permission for 127.0.0.1 so the test can inject without a click.) */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), http = require('http');
let puppeteer;
try { puppeteer = require('puppeteer-core'); } catch (e) { console.error('Run "npm install" first.'); process.exit(1); }

const ROOT = path.resolve(__dirname, '..');
const BROWSERS = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'];
const executablePath = process.env.BROWSER_PATH || BROWSERS.find((p) => fs.existsSync(p));
if (!executablePath) { console.error('No Chrome/Edge found (set BROWSER_PATH).'); process.exit(1); }

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  fs.readdirSync(src, { withFileTypes: true }).forEach((d) => {
    const s = path.join(src, d.name), t = path.join(dst, d.name);
    d.isDirectory() ? copyDir(s, t) : fs.copyFileSync(s, t);
  });
}

let failures = 0;
const check = (name, ok, info) => { console.log((ok ? 'ok   ' : 'FAIL ') + name + (!ok && info !== undefined ? '  -> ' + JSON.stringify(info) : '')); if (!ok) failures++; };

(async () => {
  // temp copy of the extension + permission for the local test server
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jaf-smoke-'));
  const extDir = path.join(tmp, 'extension');
  copyDir(path.join(ROOT, 'extension'), extDir);
  const mf = JSON.parse(fs.readFileSync(path.join(extDir, 'manifest.json'), 'utf8'));
  mf.host_permissions = (mf.host_permissions || []).concat(['http://127.0.0.1/*']);
  fs.writeFileSync(path.join(extDir, 'manifest.json'), JSON.stringify(mf));

  // local server for the test page
  const server = http.createServer((req, res) => {
    const f = path.join(ROOT, 'tests', 'fixture.html');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(fs.readFileSync(f));
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;

  // Chrome 137+ no longer honours --load-extension; Puppeteer installs unpacked extensions over a debugging pipe instead
  const browser = await puppeteer.launch({ executablePath, headless: 'new', pipe: true, enableExtensions: [extDir], args: ['--no-first-run', '--no-default-browser-check'] });
  try {
    // 1. the extension loads and its service worker starts
    const swTarget = await browser.waitForTarget((t) => t.type() === 'service_worker' && t.url().includes('service-worker.js'), { timeout: 20000 });
    const id = new URL(swTarget.url()).host;
    check('service worker started', !!id, swTarget.url());
    const sw = await swTarget.worker();

    // 2. settings page works with real chrome.storage
    const errors = [];
    const opt = await browser.newPage();
    opt.on('pageerror', (e) => errors.push(String(e)));
    opt.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await opt.goto('chrome-extension://' + id + '/options/options.html', { waitUntil: 'load' });
    await opt.waitForSelector('#profileForm fieldset');
    check('settings page renders the profile form', (await opt.$$('#profileForm fieldset')).length >= 5);
    check('logo image loads', await opt.evaluate(() => { const i = document.querySelector('.hero .logo'); return !!i && i.complete && i.naturalWidth > 0; }));

    // type into the first field and press Save
    await opt.type('#profileForm input[type=text]', 'Test Person');
    await opt.click('#saveProfile');
    await new Promise((r) => setTimeout(r, 600));
    const saved = await opt.evaluate(() => new Promise((r) => chrome.storage.local.get(null, r)));
    const prof = saved.profiles && saved.profiles[saved.activeProfileId];
    check('Save button persisted the name', prof && prof.data.name_en === 'Test Person', prof && prof.data.name_en);

    // import by pasting text -> review table
    await opt.evaluate(() => document.querySelector('[data-tab="import"]').click());
    await opt.type('#pasteText', "Name: Test Person\nEmail: test@example.com\nMobile: 01700000001");
    await opt.click('#analyze');
    await opt.waitForSelector('#reviewTable tbody tr', { timeout: 8000 });
    check('import review lists the found items', (await opt.$$('#reviewTable tbody tr')).length >= 3);
    await opt.click('#applyImport');
    await new Promise((r) => setTimeout(r, 600));
    const after = await opt.evaluate(() => new Promise((r) => chrome.storage.local.get('profiles', r)));
    const d = Object.values(after.profiles)[0].data;
    check('importing saved email + mobile', d.email === 'test@example.com' && d.mobile === '01700000001', d);

    // seed a richer profile for the fill test
    await opt.evaluate(() => new Promise((r) => chrome.storage.local.get(['profiles', 'activeProfileId'], (s) => {
      const p = s.profiles[s.activeProfileId];
      Object.assign(p.data, { name_en: 'RAHIMA BEGUM', gender: 'Female', religion: 'Islam', nationality: 'Bangladeshi', present_district: 'Kushtia', ssc_roll: '100001', ssc_year: '2017' });
      chrome.storage.local.set({ profiles: s.profiles }, r);
    })));

    // 3. popup page loads
    const pop = await browser.newPage();
    const popErrors = [];
    pop.on('pageerror', (e) => popErrors.push(String(e)));
    await pop.goto('chrome-extension://' + id + '/popup/popup.html', { waitUntil: 'load' });
    await pop.waitForSelector('#profile option');
    check('popup renders with a profile', (await pop.$$eval('#profile option', (o) => o.length)) >= 1);
    check('popup has no script errors', popErrors.length === 0, popErrors);

    // 4. real injection + fill on a page
    const page = await browser.newPage();
    await page.goto('http://127.0.0.1:' + port + '/', { waitUntil: 'load' });
    const tabId = await sw.evaluate(async () => (await chrome.tabs.query({ url: 'http://127.0.0.1/*' }))[0].id);
    const result = await sw.evaluate(async (tid) => injectAndRun(tid, 'quick', true, 'auto'), tabId);
    check('injectAndRun reported success', result && result.ok === true, result);
    const vals = await page.evaluate(() => ({
      name: document.querySelector('[name="a1"]').value, gender: document.querySelector('[name="gen"]').value,
      religion: document.querySelector('[name="rel"]').value, roll: document.querySelector('[name="s3"]').value, year: document.querySelector('[name="s7"]').value
    }));
    check('name filled in the real page', vals.name === 'RAHIMA BEGUM', vals);
    check('dropdowns filled (gender, religion)', vals.gender === 'Female' && vals.religion === 'Islam', vals);
    check('SSC roll + year filled (section detection)', vals.roll === '100001' && vals.year === '2017', vals);
    check('toast shown inside the page', await page.evaluate(() => !!(document.getElementById('__jaf_host__') && document.getElementById('__jaf_host__').shadowRoot.querySelector('.toast'))));

    check('settings page had no console errors', errors.length === 0, errors);
  } catch (e) {
    check('smoke test ran to completion', false, String(e && e.stack || e));
  } finally {
    await browser.close();
    server.close();
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) { /* ignore */ }
  }
  console.log(failures ? '\n' + failures + ' FAILED' : '\nSMOKE TEST PASSED');
  process.exit(failures ? 1 : 0);
})();
