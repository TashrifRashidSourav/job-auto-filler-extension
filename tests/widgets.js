/* Hard cases: widget libraries without ARIA roles, hidden native selects, readonly datepicker, masked input,
 * hidden radios, ARIA radiogroup, split DOB selects, autosuggest, contenteditable, multi-step watcher. */
const fs = require('fs'), path = require('path');
const { JSDOM } = require('jsdom');
const root = path.join(__dirname, '..', 'extension');

const html = `<div id="page">
<div><label for="nm">Full Name</label><input id="nm"></div>

<!-- readonly date picker with a format attribute -->
<div><label for="dob">Date of Birth</label><input id="dob" class="datepicker" readonly data-date-format="dd-mm-yyyy"></div>

<!-- masked phone: ignores programmatic values, accepts typed characters -->
<div><label for="mob">Mobile Number</label><input id="mob"></div>

<!-- hidden (styled) radios with visible labels -->
<fieldset><legend>Gender</legend>
  <input type="radio" name="g" id="g1" value="M" style="display:none"><label for="g1">Male</label>
  <input type="radio" name="g" id="g2" value="F" style="display:none"><label for="g2">Female</label>
</fieldset>

<!-- Select2-style: native select hidden, wrapper updates when native 'change' fires -->
<div><label>Religion</label>
  <select id="rel" style="display:none"><option value="">Select</option><option>Islam</option><option>Hinduism</option></select>
  <span class="select2-container"><span class="select2-selection" id="rel-view">Select</span></span></div>

<!-- Chosen-style: native select hidden, wrapper does NOT follow native changes; must click the widget -->
<div><label>Marital Status</label>
  <select id="ms" style="display:none"><option value="">Select</option><option>Single</option><option>Married</option></select>
  <div class="chosen-container"><a class="chosen-single" id="ms-view"><span>Select</span></a></div></div>

<!-- react-select style: no roles, emotion classes, options appear in a menu -->
<div><label>Blood Group</label>
  <div class="css-1abc-control" id="bg"><div>Select...</div></div></div>

<!-- ARIA radiogroup -->
<div><label id="nl">Nationality</label>
  <div role="radiogroup" aria-labelledby="nl" id="nat"><div role="radio" aria-checked="false">Bangladeshi</div><div role="radio" aria-checked="false">Other</div></div></div>

<!-- split date-of-birth dropdowns -->
<div><label>Day</label><select id="dd"><option value="">--</option><option>14</option><option>15</option><option>16</option></select></div>
<div><label>Month</label><select id="mm"><option value="">--</option><option>জুন</option><option>জুলাই</option><option>আগস্ট</option></select></div>
<div><label>Year</label><select id="yy"><option value="">--</option><option>1997</option><option>1998</option><option>1999</option></select></div>

<h3>Present Address</h3>
<div><label for="po">Post Office</label><input id="po" class="autocomplete"></div>

<h3>Job Experience</h3>
<div><label for="org">Organization</label><input id="org"></div>
<div><label>Job Description</label><div id="desc" contenteditable="true" role="textbox"></div></div>
</div>
<script>
  const $ = id => document.getElementById(id);
  // mask: only accept values that arrive right after a keydown
  let lastKey = 0, prev = '';
  $('mob').addEventListener('keydown', () => { lastKey = Date.now(); });
  $('mob').addEventListener('input', e => { if (Date.now() - lastKey > 25) { e.target.value = prev; } else { prev = e.target.value; } });
  // Select2: follows native change
  $('rel').addEventListener('change', () => { $('rel-view').textContent = $('rel').value; });
  // Chosen: click opens a results list; picking updates both
  let pop = null;
  function openMenu(anchor, items, onPick) {
    if (pop) pop.remove();
    pop = document.createElement('ul'); pop.className = anchor.dataset.menu;
    items.forEach(t => { const li = document.createElement('li'); li.textContent = t; li.className = anchor.dataset.item; li.addEventListener('click', () => { onPick(t); pop.remove(); pop = null; }); pop.appendChild(li); });
    document.body.appendChild(pop);
  }
  $('ms-view').dataset.menu = 'chosen-results'; $('ms-view').dataset.item = 'active-result';
  $('ms-view').addEventListener('click', e => openMenu(e.currentTarget, ['Single', 'Married'], t => { $('ms-view').firstChild.textContent = t; $('ms').value = t; }));
  // react-select style
  $('bg').dataset.menu = 'css-menu'; $('bg').dataset.item = 'css-1x-option';
  $('bg').addEventListener('click', e => openMenu(e.currentTarget, ['A+', 'A-', 'B+', 'B-', 'O+'], t => { $('bg').firstChild.textContent = t; }));
  // radiogroup
  document.querySelectorAll('#nat [role=radio]').forEach(r => r.addEventListener('click', () => { document.querySelectorAll('#nat [role=radio]').forEach(x => x.setAttribute('aria-checked', 'false')); r.setAttribute('aria-checked', 'true'); }));
  // autosuggest
  $('po').addEventListener('input', () => {
    document.querySelectorAll('.pac-container').forEach(n => n.remove());
    if (!$('po').value) return;
    const c = document.createElement('div'); c.className = 'pac-container';
    ['Samplepara Post Office', 'Samplepara Bazar Post Office'].forEach(t => { const d = document.createElement('div'); d.className = 'pac-item'; d.textContent = t; d.addEventListener('click', () => { $('po').value = t; c.remove(); }); c.appendChild(d); });
    document.body.appendChild(c);
  });
</script>`;

(async () => {
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://x.example/' });
  const w = dom.window; w.__JAF_TEST__ = true;
  const data = { name_en: 'Rahim Uddin', dob: '1998-08-15', mobile: '01700000002', gender: 'Male', religion: 'Islam', marital_status: 'Single',
    blood_group: 'B+', email: 'a@b.com', nationality: 'Bangladeshi', present_post_office: 'SAMPLEPARA',
    experience: [{ org: 'Example Education Ltd', description: 'Led the digitization project.' }], extra: {} };
  const mem = { profiles: { p: { id: 'p', name: 't', data } }, activeProfileId: 'p', settings: { watchSteps: true }, siteRules: {} };
  let L;
  w.chrome = { storage: { local: { get: (k, cb) => cb(JSON.parse(JSON.stringify(mem))), set: (o, cb) => { Object.assign(mem, o); cb && cb(); } } },
    runtime: { onMessage: { addListener: (f) => { L = f; } }, sendMessage: async () => ({ ok: false }) } };
  ['data/schema.js', 'lib/matcher.js', 'data/translate.js', 'lib/profile.js', 'content/scanner.js', 'content/filler.js', 'content/overlay.js', 'content/content.js']
    .forEach((f) => w.eval(fs.readFileSync(path.join(root, f), 'utf8')));

  const res = await new Promise((r) => L({ type: 'JAF_RUN', mode: 'quick', overwrite: true }, {}, r));
  const $ = (id) => w.document.getElementById(id);
  const checks = {
    'full name': [$('nm').value, 'Rahim Uddin'],
    'readonly date (dd-mm-yyyy)': [$('dob').value, '15-08-1998'],
    'readonly kept readonly': [$('dob').hasAttribute('readonly'), true],
    'masked phone (typed)': [$('mob').value, '01700000002'],
    'hidden radio (male)': [$('g1').checked && !$('g2').checked, true],
    'select2 mirror': [$('rel').value + '|' + $('rel-view').textContent, 'Islam|Islam'],
    'chosen: widget driven': [$('ms').value + '|' + $('ms-view').textContent.trim(), 'Single|Single'],
    'react-select (no roles)': [$('bg').textContent.trim(), 'B+'],
    'aria radiogroup': [w.document.querySelector('#nat [role=radio]').getAttribute('aria-checked'), 'true'],
    'split dob day': [$('dd').value, '15'],
    'split dob month (bangla)': [$('mm').value, 'আগস্ট'],
    'split dob year': [$('yy').value, '1998'],
    'autosuggest picked': [$('po').value, 'Samplepara Post Office'],
    'org': [$('org').value, 'Example Education Ltd'],
    'contenteditable': [$('desc').textContent.trim(), 'Led the digitization project.']
  };
  let fail = 0;
  Object.keys(checks).forEach((k) => { if (checks[k][0] !== checks[k][1]) { fail++; console.log('FAIL', k, JSON.stringify(checks[k][0]), 'expected', JSON.stringify(checks[k][1])); } });
  console.log(res.summary.split('\n')[0]);

  // multi-step watcher: a new step appears -> chip offered
  const f = w.document.createElement('div');
  f.innerHTML = '<label for="em">Email</label><input id="em">';
  w.document.getElementById('page').insertBefore(f, w.document.getElementById('page').firstChild);
  await new Promise((r) => setTimeout(r, 1500));
  const chip = w.document.getElementById('__jaf_host__') && w.document.getElementById('__jaf_host__').shadowRoot.querySelector('.chip');
  if (!chip) { fail++; console.log('FAIL watcher chip not shown'); }

  console.log(fail ? fail + ' FAILED' : 'WIDGETS PASSED');
  process.exit(fail ? 1 : 0);
})();
