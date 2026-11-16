/* Bangla-language site: English fields must get English text, Bangla fields Bangla text. */
const fs = require('fs'), path = require('path');
const { JSDOM } = require('jsdom');
const root = path.join(__dirname, '..', 'extension');
const html = `<form>
<div><label for="a">নাম (ইংরেজি বড় অক্ষরে) *</label><input id="a"></div>
<div><label for="b">নাম (বাংলায়) *</label><input id="b"></div>
<div><label for="c">পিতার নাম (ইংরেজি) *</label><input id="c"></div>
<div><label for="d">পিতার নাম (বাংলায়) *</label><input id="d"></div>
<div><label for="e">মাতার নাম (ইংরেজি) *</label><input id="e"></div>
<div><label for="f">মাতার নাম (বাংলায়) *</label><input id="f"></div>
<div><label for="g">জন্ম তারিখ*</label><input id="g" type="date"></div>
<div><label for="h">জাতীয় পরিচয়পত্র নম্বর*</label><input id="h"></div>
<div><label for="i">লিঙ্গ</label><select id="i"><option>নির্বাচন করুন</option><option>পুরুষ</option><option>মহিলা</option></select></div>
<div><label for="j">বৈবাহিক অবস্থা</label><select id="j"><option>নির্বাচন করুন</option><option>অবিবাহিত</option><option>বিবাহিত</option></select></div>
</form>`;
(async () => {
  const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'https://x.example/' });
  const w = dom.window; w.__JAF_TEST__ = true;
  const data = { name_en: 'Md. Rahim Uddin', name_bn: 'মোঃ রহিম উদ্দিন', father_en: 'MD ABDUL JABBAR', father_bn: 'মোহাঃ আব্দুল জব্বার',
    mother_en: 'MST FATEMA KHATUN', mother_bn: 'মোসাঃ ফাতেমা খাতুন', dob: '1998-08-15', nid: '9876543210', gender: 'Male', marital_status: 'Single', experience: [], extra: {} };
  const mem = { profiles: { p: { id: 'p', name: 't', data } }, activeProfileId: 'p', settings: {}, siteRules: {} };
  let L;
  w.chrome = { storage: { local: { get: (k, cb) => cb(JSON.parse(JSON.stringify(mem))), set: (o, cb) => { Object.assign(mem, o); cb && cb(); } } },
    runtime: { onMessage: { addListener: (f) => { L = f; } }, sendMessage: async () => ({ ok: false }) } };
  ['data/schema.js', 'lib/matcher.js', 'data/translate.js', 'lib/profile.js', 'content/scanner.js', 'content/filler.js', 'content/overlay.js', 'content/content.js']
    .forEach((f) => w.eval(fs.readFileSync(path.join(root, f), 'utf8')));
  await new Promise((r) => L({ type: 'JAF_RUN', mode: 'quick', overwrite: true }, {}, r));
  const v = (id) => w.document.getElementById(id).value;
  const exp = { a: 'MD. RAHIM UDDIN', b: data.name_bn, c: 'MD ABDUL JABBAR', d: data.father_bn, e: 'MST FATEMA KHATUN', f: data.mother_bn,
    g: '1998-08-15', h: '9876543210', i: 'পুরুষ', j: 'অবিবাহিত' };
  let fail = 0;
  Object.keys(exp).forEach((k) => { if (v(k) !== exp[k]) { fail++; console.log('FAIL', k, JSON.stringify(v(k)), 'expected', JSON.stringify(exp[k])); } });
  console.log(fail ? fail + ' FAILED' : 'BANGLA SITE PASSED');
  process.exit(fail ? 1 : 0);
})();
