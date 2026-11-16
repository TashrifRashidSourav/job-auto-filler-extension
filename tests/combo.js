/* Custom searchable dropdowns (role=combobox) with Bangla option text, like the site in the screenshot. */
const fs = require('fs'), path = require('path');
const { JSDOM } = require('jsdom');
const root = path.join(__dirname, '..', 'extension');

const html = `<div id="app">
<h3>বর্তমান ঠিকানা</h3>
<div><label for="v">গ্রাম/বাসা, রাস্তা, ডাকঘর <span>*</span></label><textarea id="v"></textarea></div>
<div><label id="dl">জেলা <span>*</span></label><button type="button" id="dist" role="combobox" aria-expanded="false" aria-labelledby="dl"><span>নির্বাচন করুন</span></button></div>
<div><label id="ul">উপজেলা/থানা <span>*</span></label><button type="button" id="upz" role="combobox" aria-labelledby="ul" aria-disabled="true"><span>নির্বাচন করুন</span></button></div>
</div>
<script>
  const DISTRICTS = ['গাইবান্ধা','গাজীপুর','গোপালগঞ্জ','চট্টগ্রাম','চাঁদপুর','চাঁপাইনবাবগঞ্জ','চুয়াডাঙ্গা','কুষ্টিয়া'];
  const UPAZ = { 'চুয়াডাঙ্গা': ['আলমডাঙ্গা','চুয়াডাঙ্গা সদর','জীবননগর','দামুড়হুদা'] };
  let popup = null;
  function open(btn, items, onPick) {
    close();
    popup = document.createElement('div'); popup.setAttribute('role','listbox');
    const search = document.createElement('input'); search.type = 'text'; popup.appendChild(search);
    const list = document.createElement('div'); popup.appendChild(list);
    function render(q) {
      list.innerHTML = '';
      items.filter(i => !q || i.includes(q)).forEach(i => {
        const o = document.createElement('div'); o.setAttribute('role','option'); o.textContent = i;
        o.addEventListener('click', () => { btn.firstChild.textContent = i; close(); onPick(i); });
        list.appendChild(o);
      });
    }
    search.addEventListener('input', () => render(search.value));
    render('');
    document.body.appendChild(popup);
  }
  function close() { if (popup) { popup.remove(); popup = null; } }
  document.getElementById('dist').addEventListener('click', e => open(e.currentTarget, DISTRICTS, d => {
    const u = document.getElementById('upz'); u.firstChild.textContent = 'নির্বাচন করুন';
    if (UPAZ[d]) u.removeAttribute('aria-disabled');
  }));
  document.getElementById('upz').addEventListener('click', e => {
    const d = document.getElementById('dist').firstChild.textContent;
    if (e.currentTarget.getAttribute('aria-disabled') === 'true') return;
    open(e.currentTarget, UPAZ[d] || [], () => {});
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
</script>`;

(async () => {
  const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'https://x.example/' });
  const w = dom.window; w.__JAF_TEST__ = true;
  const data = { present_village: 'Sample Road, Sample Village, Alamdanga Municipality', present_district: 'Chuadanga', present_upazila: 'Alamdanga', experience: [], extra: {}, name_en: 'X' };
  const mem = { profiles: { p: { id: 'p', name: 't', data } }, activeProfileId: 'p', settings: {}, siteRules: {} };
  let L;
  w.chrome = { storage: { local: { get: (k, cb) => cb(JSON.parse(JSON.stringify(mem))), set: (o, cb) => { Object.assign(mem, o); cb && cb(); } } },
    runtime: { onMessage: { addListener: (f) => { L = f; } }, sendMessage: async () => ({ ok: false }) } };
  ['data/schema.js', 'lib/matcher.js', 'data/translate.js', 'lib/profile.js', 'content/scanner.js', 'content/filler.js', 'content/overlay.js', 'content/content.js']
    .forEach((f) => w.eval(fs.readFileSync(path.join(root, f), 'utf8')));
  const res = await new Promise((r) => L({ type: 'JAF_RUN', mode: 'quick', overwrite: true }, {}, r));
  const txt = (id) => w.document.getElementById(id).textContent.trim();
  const exp = { v: null, dist: 'চুয়াডাঙ্গা', upz: 'আলমডাঙ্গা' };
  let fail = 0;
  if (w.document.getElementById('v').value !== data.present_village) { fail++; console.log('FAIL village', w.document.getElementById('v').value); }
  ['dist', 'upz'].forEach((k) => { if (txt(k) !== exp[k]) { fail++; console.log('FAIL', k, JSON.stringify(txt(k)), 'expected', exp[k]); } });
  console.log(res.summary.split('\n')[0]);
  console.log(fail ? fail + ' FAILED' : 'CUSTOM DROPDOWNS PASSED');
  process.exit(fail ? 1 : 0);
})();
