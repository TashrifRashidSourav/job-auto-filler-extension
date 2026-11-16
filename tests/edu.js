/* "Add one qualification" form (Bangla UI, custom dropdowns, level -> exam dependency, no SSC/HSC headings). */
const fs = require('fs'), path = require('path');
const { JSDOM } = require('jsdom');
const root = path.join(__dirname, '..', 'extension');

const html = `<div id="card">
<h3>নতুন যোগ্যতা</h3>
<div><label id="l1">পর্যায় <span>*</span></label><button type="button" id="level" role="combobox" aria-labelledby="l1"><span>নির্বাচন করুন</span></button></div>
<div><label id="l2">ডিগ্রি/পরীক্ষার নাম <span>*</span></label><button type="button" id="exam" role="combobox" aria-labelledby="l2" aria-disabled="true"><span>নির্বাচন করুন</span></button></div>
<div><label for="yr">পাসের বছর <span>*</span></label><input id="yr"></div>
<fieldset><legend>ফলাফল (সিজিপিএ/শ্রেণি)</legend>
  <div><label id="l4">ফলাফলের ধরন <span>*</span></label><button type="button" id="rtype" role="combobox" aria-labelledby="l4"><span>নির্বাচন করুন</span></button></div>
</fieldset>
<div><label for="inst">শিক্ষা প্রতিষ্ঠানের নাম ও ঠিকানা <span>*</span></label><input id="inst"></div>
<div><label for="dur">কোর্সের মেয়াদ (বছর)</label><input id="dur" type="text"></div>
</div>
<script>
  const LEVELS = ['নির্বাচন করুন','পিএইচডি','এম.ফিল.','স্নাতকোত্তর','স্নাতক','ডিপ্লোমা','এইচএসসি/সমমান','এসএসসি/সমমান'];
  const EXAMS = { 'এইচএসসি/সমমান': ['নির্বাচন করুন','এ লেভেল','আলিম','এইচএসসি','অন্যান্য (তালিকায় নেই)'],
                  'এসএসসি/সমমান': ['নির্বাচন করুন','ও লেভেল','দাখিল','এসএসসি','অন্যান্য (তালিকায় নেই)'],
                  'স্নাতক': ['নির্বাচন করুন','বিবিএ','বি.এসসি ইঞ্জিনিয়ারিং','বিএ','অন্যান্য (তালিকায় নেই)'] };
  const RTYPES = ['নির্বাচন করুন','জিপিএ (৫ এর মধ্যে)','জিপিএ (৪ এর মধ্যে)','সিজিপিএ (৪ এর মধ্যে)','সিজিপিএ (৫ এর মধ্যে)','প্রথম শ্রেণি','দ্বিতীয় শ্রেণি'];
  let popup = null;
  function close() { if (popup) { popup.remove(); popup = null; } }
  function open(btn, items, onPick) {
    close();
    popup = document.createElement('div'); popup.setAttribute('role', 'listbox');
    popup.appendChild(Object.assign(document.createElement('input'), { type: 'text' }));
    items.forEach(i => { const o = document.createElement('div'); o.setAttribute('role', 'option'); o.textContent = i;
      o.addEventListener('click', () => { btn.firstChild.textContent = i; close(); onPick && onPick(i); }); popup.appendChild(o); });
    document.body.appendChild(popup);
  }
  const $ = id => document.getElementById(id);
  $('level').addEventListener('click', e => open(e.currentTarget, LEVELS, l => { $('exam').firstChild.textContent = 'নির্বাচন করুন'; if (EXAMS[l]) $('exam').removeAttribute('aria-disabled'); }));
  $('exam').addEventListener('click', e => { if (e.currentTarget.getAttribute('aria-disabled') === 'true') return; open(e.currentTarget, EXAMS[$('level').firstChild.textContent] || []); });
  $('rtype').addEventListener('click', e => open(e.currentTarget, RTYPES));
</script>`;

async function runCase(name, edu, exp) {
  const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'https://x.example/' });
  const w = dom.window; w.__JAF_TEST__ = true;
  const data = { name_en: 'X', experience: [], extra: {},
    ssc_exam: 'S.S.C', ssc_year: '2017', ssc_result_type: 'GPA(out of 5)', ssc_result: '4.82', ssc_institute: 'Sample Secondary School',
    hsc_exam: 'H.S.C', hsc_year: '2019', hsc_result_type: 'GPA(out of 5)', hsc_result: '4.83', hsc_institute: 'Sample College',
    honors_exam: 'B.Sc Engineering', honors_year: '2026', honors_result_type: 'CGPA(out of 4)', honors_result: '3.23', honors_institute: 'United International University', honors_duration: '4 Years' };
  const mem = { profiles: { p: { id: 'p', name: 't', data } }, activeProfileId: 'p', settings: {}, siteRules: {} };
  let L;
  w.chrome = { storage: { local: { get: (k, cb) => cb(JSON.parse(JSON.stringify(mem))), set: (o, cb) => { Object.assign(mem, o); cb && cb(); } } },
    runtime: { onMessage: { addListener: (f) => { L = f; } }, sendMessage: async () => ({ ok: false }) } };
  ['data/schema.js', 'lib/matcher.js', 'data/translate.js', 'lib/profile.js', 'content/scanner.js', 'content/filler.js', 'content/overlay.js', 'content/content.js']
    .forEach((f) => w.eval(fs.readFileSync(path.join(root, f), 'utf8')));
  const res = await new Promise((r) => L({ type: 'JAF_RUN', mode: 'quick', overwrite: true, edu }, {}, r));
  const g = (id) => { const e = w.document.getElementById(id); return (e.tagName === 'INPUT' ? e.value : e.textContent).trim(); };
  let fail = 0;
  Object.keys(exp).forEach((k) => { if (g(k) !== exp[k]) { fail++; console.log('FAIL [' + name + ']', k, JSON.stringify(g(k)), 'expected', JSON.stringify(exp[k])); } });
  console.log(name + ': ' + res.summary.split('\n').filter(Boolean).slice(-1)[0]);
  return fail;
}

(async () => {
  let fail = 0;
  fail += await runCase('HSC (explicit)', 'hsc', { level: 'এইচএসসি/সমমান', exam: 'এইচএসসি', yr: '2019', rtype: 'জিপিএ (৫ এর মধ্যে)', inst: 'Sample College', dur: '' });
  fail += await runCase('SSC (auto = first)', 'auto', { level: 'এসএসসি/সমমান', exam: 'এসএসসি', yr: '2017', rtype: 'জিপিএ (৫ এর মধ্যে)', inst: 'Sample Secondary School' });
  fail += await runCase('Honors', 'honors', { level: 'স্নাতক', exam: 'বি.এসসি ইঞ্জিনিয়ারিং', yr: '2026', inst: 'United International University', dur: '4' });
  console.log(fail ? fail + ' FAILED' : 'QUALIFICATION FORM PASSED');
  process.exit(fail ? 1 : 0);
})();
