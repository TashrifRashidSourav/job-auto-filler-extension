/* End-to-end test: loads the real extension scripts into jsdom against a portal-like fixture. */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const root = path.join(__dirname, '..', 'extension');
const profile = {
  name_en: 'RAHIMA BEGUM', name_bn: 'রহিমা বেগম', father_en: 'ABDUL KARIM', father_bn: 'মোঃ আব্দুল করিম',
  mother_en: 'SALMA KHATUN', mother_bn: 'মোছাঃ সালমা খাতুন', dob: '1999-03-10', nationality: 'Bangladeshi', religion: 'Islam',
  gender: 'Female', nid: '1234567890', birth_reg: '19990101123456789', marital_status: 'Single', mobile: '01700000001', email: 'a@b.com',
  present_care_of: 'ABDUL KARIM', present_village: 'SAMPLEPARA,SADAR,KUSHTIA', present_district: 'Kushtia', present_upazila: 'Daulatpur',
  present_post_office: 'SAMPLEPARA', present_post_code: '7051', same_address: true,
  ssc_exam: 'S.S.C', ssc_board: 'Jashore', ssc_roll: '100001', ssc_group: 'Science', ssc_result_type: 'GPA(out of 5)', ssc_result: '5.00', ssc_year: '2017',
  hsc_roll: '100002', hsc_year: '2019',
  honors_exam: 'Honors', honors_subject: 'Applied Mathematics', honors_institute: 'Kushtia Govt. College', honors_result: 'Passed', honors_year: '2026', honors_duration: '04 Years',
  experience: [{ org: 'Alpha Ltd', designation: 'Intern', from: '2024-01-01', to: '2024-06-30' }, { org: 'Beta Ltd', designation: 'Analyst', from: '2024-07-01', to: '2025-01-01' }],
  extra: {}
};

(async function () {
  const html = fs.readFileSync(path.join(__dirname, 'fixture.html'), 'utf8');
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://portal.example/apply' });
  const w = dom.window;
  w.__JAF_TEST__ = true;
  // mock chrome
  const mem = { profiles: { p1: { id: 'p1', name: 't', data: profile } }, activeProfileId: 'p1', settings: {}, siteRules: {} };
  let listener = null;
  w.chrome = {
    storage: { local: {
      get: (k, cb) => cb(JSON.parse(JSON.stringify(mem))),
      set: (o, cb) => { Object.assign(mem, o); cb && cb(); }
    } },
    runtime: { onMessage: { addListener: (f) => { listener = f; } }, sendMessage: async () => ({ ok: false }) }
  };
  const load = (f) => w.eval(fs.readFileSync(path.join(root, f), 'utf8'));
  ['data/schema.js', 'lib/matcher.js', 'data/translate.js', 'lib/profile.js', 'content/scanner.js', 'content/filler.js', 'content/overlay.js', 'content/content.js'].forEach(load);

  const result = await new Promise((res) => listener({ type: 'JAF_RUN', mode: 'quick', overwrite: false }, {}, res));
  const q = (n) => w.document.querySelector('[name="' + n + '"]');
  const v = (n) => (q(n).type === 'checkbox' ? q(n).checked : q(n).value);

  const expect = {
    a1: 'RAHIMA BEGUM', a2: 'রহিমা বেগম', a3: 'ABDUL KARIM', a4: 'মোঃ আব্দুল করিম', a5: 'SALMA KHATUN', a6: 'মোছাঃ সালমা খাতুন',
    dob: '1999-03-10', nat: 'Bangladeshi', rel: 'Islam', gen: 'Female', hasnid: 'Yes', nid: '1234567890', hasbr: 'Yes', br: '19990101123456789', haspp: 'No',
    ms: 'Single', m1: '01700000001', m2: '01700000001', e1: 'a@b.com',
    pco: 'ABDUL KARIM', pv: 'SAMPLEPARA,SADAR,KUSHTIA', pd: 'Kushtia', pu: 'Daulatpur', ppo: 'SAMPLEPARA', ppc: '7051',
    s1: 'S.S.C', s2: 'Jashore', s3: '100001', s4: 'GPA(out of 5)', s5: '5.00', s6: 'Science', s7: '2017',
    h3: '100002', h7: '2019',
    g1: 'Honors', g2: 'Applied Mathematics', g3: 'Other', g3t: 'Kushtia Govt. College', g4: 'Passed', g5: '2026', g6: '04 Years',
    m_e: 'Select', ed: 'Intern', eo: 'Alpha Ltd', ef: '2024-01-01', et: '2024-06-30'
  };
  let fail = 0;
  Object.keys(expect).forEach((k) => {
    const got = v(k);
    if (got !== expect[k]) { fail++; console.log('FAIL', k, 'expected', JSON.stringify(expect[k]), 'got', JSON.stringify(got)); }
  });
  // same-as-present checkbox should be checked; permanent fields untouched (disabled)
  if (!w.document.getElementById('same').checked) { fail++; console.log('FAIL same-as-present not checked'); }
  // second experience block created via ADD MORE
  const eo = Array.from(w.document.querySelectorAll('[name="eo"]'));
  if (eo.length !== 2 || eo[1].value !== 'Beta Ltd') { fail++; console.log('FAIL second experience', eo.map((e) => e.value)); }
  console.log(result.summary);
  console.log(fail ? fail + ' FAILED' : 'ALL PASSED');
  process.exit(fail ? 1 : 0);
})();
