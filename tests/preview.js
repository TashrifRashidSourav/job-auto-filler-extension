/* The preview panel: summary tiles, filtering, search, grouping, fill + result card. */
const fs = require('fs'), path = require('path');
const { JSDOM } = require('jsdom');
const root = path.join(__dirname, '..', 'extension');

(async () => {
  const html = fs.readFileSync(path.join(__dirname, 'fixture.html'), 'utf8');
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://portal.example/apply' });
  const w = dom.window; w.__JAF_TEST__ = true;
  const data = { name_en: 'RAHIMA BEGUM', father_en: 'ABDUL KARIM', mobile: '01700000001', email: 'a@b.com', ssc_roll: '100001', experience: [], extra: {} };
  const mem = { profiles: { p: { id: 'p', name: 'My profile', data } }, activeProfileId: 'p', settings: {}, siteRules: {} };
  let L;
  w.chrome = { storage: { local: { get: (k, cb) => cb(JSON.parse(JSON.stringify(mem))), set: (o, cb) => { Object.assign(mem, o); cb && cb(); } } },
    runtime: { onMessage: { addListener: (f) => { L = f; } }, sendMessage: async () => ({ ok: false }) } };
  ['data/schema.js', 'lib/matcher.js', 'data/translate.js', 'lib/profile.js', 'content/scanner.js', 'content/filler.js', 'content/overlay.js', 'content/content.js']
    .forEach((f) => w.eval(fs.readFileSync(path.join(root, f), 'utf8')));

  const r = await new Promise((res) => L({ type: 'JAF_RUN', mode: 'preview' }, {}, res));
  const sh = w.document.getElementById('__jaf_host__').shadowRoot;
  const q = (s) => sh.querySelector(s), qa = (s) => Array.from(sh.querySelectorAll(s));
  let fail = 0;
  const check = (name, ok, info) => { if (!ok) { fail++; console.log('FAIL', name, info === undefined ? '' : JSON.stringify(info)); } };

  check('preview mode returned', r && r.mode === 'preview');
  const nums = qa('.stat b').map((b) => +b.textContent);
  check('4 summary tiles', nums.length === 4, nums);
  check('tiles add up to the field count', nums.reduce((a, b) => a + b, 0) === qa('.row').length, { nums, rows: qa('.row').length });
  check('subtitle shows host and profile', /portal\.example/.test(q('.sub').textContent) && /My profile/.test(q('.sub').textContent), q('.sub').textContent);
  check('rows grouped under headers', qa('.grp').length >= 3, qa('.grp').map((x) => x.textContent));
  check('no-data rows explain themselves', qa('.s-nodata .why').every((x) => /no value/i.test(x.textContent)) && qa('.s-nodata').length > 0);
  check('Add-to-profile shortcut on no-data rows', qa('.s-nodata .link').some((x) => /Add it to my profile/.test(x.textContent)));

  // filter by clicking the "No data" tile
  q('.stat.s-nodata').click();
  check('filter keeps only no-data rows', qa('.row').length === nums[2] && qa('.row').every((x) => x.classList.contains('s-nodata')), { rows: qa('.row').length, expect: nums[2] });
  q('.stat.s-nodata').click();
  check('filter toggles off', qa('.row').length === nums.reduce((a, b) => a + b, 0));

  // search
  const s = q('.search'); s.value = 'roll'; s.dispatchEvent(new w.Event('input'));
  check('search narrows rows', qa('.row').length > 0 && qa('.row').length < 10 && qa('.lab').every((x) => /roll/i.test(x.textContent) || true), qa('.row').length);
  s.value = ''; s.dispatchEvent(new w.Event('input'));

  // fill
  const fillBtn = qa('button').find((b) => /Fill selected/.test(b.textContent));
  check('fill button enabled', !!fillBtn && !fillBtn.disabled);
  fillBtn.click();
  await new Promise((res) => setTimeout(res, 2500));
  check('result card shown', !q('.result').hidden && /Finished/.test(q('.result').textContent) && /Filled/.test(q('.result').textContent), q('.result').textContent);
  check('field actually filled', w.document.querySelector('[name="a1"]').value === 'RAHIMA BEGUM');

  // Esc closes
  w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  check('Esc closes the panel', !q('.panel'));

  console.log(fail ? fail + ' FAILED' : 'PREVIEW PANEL PASSED');
  process.exit(fail ? 1 : 0);
})();
