(async function () {
  'use strict';
  const S = JAF_SCHEMA, P = JAFProfile, I = JAFImport;
  const $ = function (id) { return document.getElementById(id); };
  let st = await P.loadAll();
  let saveTimer = null;

  function h(tag, props, kids) {
    const e = document.createElement(tag);
    Object.keys(props || {}).forEach(function (k) {
      if (k === 'class') e.className = props[k];
      else if (k === 'text') e.textContent = props[k];
      else if (k.indexOf('on') === 0) e.addEventListener(k.slice(2), props[k]);
      else e.setAttribute(k, props[k]);
    });
    (kids || []).forEach(function (c) { if (c) e.appendChild(c); });
    return e;
  }
  const profile = function () { return st.profiles[st.activeProfileId]; };
  const data = function () { return profile().data; };

  async function persist() {
    await P.store.set({ profiles: st.profiles, activeProfileId: st.activeProfileId });
    $('saveState').textContent = 'All changes saved';
  }
  $('saveProfile').addEventListener('click', async function () {
    clearTimeout(saveTimer);
    data().experience = data().experience || [];
    await persist();
    $('saveState').textContent = 'Saved ✔ ' + new Date().toLocaleTimeString();
    $('saveState').classList.add('saved');
    setTimeout(function () { $('saveState').classList.remove('saved'); }, 2500);
  });
  window.addEventListener('beforeunload', function () { if (saveTimer) { clearTimeout(saveTimer); P.store.set({ profiles: st.profiles, activeProfileId: st.activeProfileId }); } });
  function queueSave() {
    $('saveState').textContent = 'Saving…';
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persist, 400);
  }
  function download(name, text, mime) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: mime || 'text/plain' }));
    a.download = name; a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  }
  function notice(el, text, err) { el.hidden = false; el.className = 'notice' + (err ? ' err' : ''); el.textContent = text; }

  /* ---------------- tabs ---------------- */
  document.querySelectorAll('.tab').forEach(function (t) {
    t.addEventListener('click', function () {
      document.querySelectorAll('.tab').forEach(function (x) { x.classList.toggle('active', x === t); });
      document.querySelectorAll('.panel').forEach(function (p) { p.classList.toggle('active', p.id === 'tab-' + t.dataset.tab); });
      if (t.dataset.tab === 'rules') renderRules();
    });
  });

  /* ---------------- profiles bar ---------------- */
  function renderProfileBar() {
    const sel = $('profileSel');
    sel.textContent = '';
    Object.keys(st.profiles).forEach(function (id) { sel.appendChild(h('option', { value: id, text: st.profiles[id].name })); });
    sel.value = st.activeProfileId;
  }
  $('profileSel').addEventListener('change', async function (e) { st.activeProfileId = e.target.value; await persist(); renderAll(); });
  $('pNew').addEventListener('click', async function () {
    const name = prompt('Name for the new profile?', 'New profile'); if (!name) return;
    const id = P.uid(); st.profiles[id] = { id: id, name: name, data: P.emptyData() }; st.activeProfileId = id;
    await persist(); renderAll();
  });
  $('pDup').addEventListener('click', async function () {
    const id = P.uid(); st.profiles[id] = { id: id, name: profile().name + ' (copy)', data: JSON.parse(JSON.stringify(data())) }; st.activeProfileId = id;
    await persist(); renderAll();
  });
  $('pRen').addEventListener('click', async function () {
    const name = prompt('Rename profile', profile().name); if (!name) return;
    profile().name = name; await persist(); renderProfileBar();
  });
  $('pDel').addEventListener('click', async function () {
    if (Object.keys(st.profiles).length < 2) { alert('You need at least one profile.'); return; }
    if (!confirm('Delete profile "' + profile().name + '"?')) return;
    delete st.profiles[st.activeProfileId]; st.activeProfileId = Object.keys(st.profiles)[0];
    await persist(); renderAll();
  });

  /* ---------------- profile form ---------------- */
  function fieldInput(f) {
    const d = data();
    let inp;
    if (f.type === 'bool') {
      inp = h('input', { type: 'checkbox' });
      inp.checked = d[f.key] === undefined ? true : !!d[f.key];
      inp.addEventListener('change', function () { d[f.key] = inp.checked; queueSave(); });
      return h('label', { class: 'chk f wide' }, [inp, h('span', { text: f.label })]);
    }
    if (f.type === 'textarea') inp = h('textarea', { rows: '2' });
    else inp = h('input', { type: f.type === 'date' ? 'date' : 'text' });
    if (f.placeholder) inp.placeholder = f.placeholder;
    if (f.options) {
      const id = 'dl_' + f.key;
      const dl = h('datalist', { id: id });
      f.options.forEach(function (o) { dl.appendChild(h('option', { value: o })); });
      inp.setAttribute('list', id);
      inp.value = d[f.key] || '';
      inp.addEventListener('input', function () { d[f.key] = inp.value; queueSave(); });
      return h('label', { class: 'f' }, [h('span', { text: f.label }), inp, dl]);
    }
    inp.value = f.type === 'date' ? (P.toISODate(d[f.key]) || '') : (d[f.key] || '');
    inp.addEventListener('input', function () { d[f.key] = inp.value; queueSave(); });
    return h('label', { class: 'f' + (f.type === 'textarea' ? ' wide' : '') }, [h('span', { text: f.label }), inp]);
  }

  function renderForm() {
    const root = $('profileForm'); root.textContent = '';
    S.GROUPS.forEach(function (g) {
      if (g.id === 'exp') return;
      const fs = S.fields.filter(function (f) { return f.group === g.id && !f.derived && !f.repeat; });
      if (!fs.length) return;
      const grid = h('div', { class: 'grid' });
      fs.forEach(function (f) { grid.appendChild(fieldInput(f)); });
      root.appendChild(h('fieldset', {}, [h('legend', { text: g.title }), grid]));
    });
  }

  function renderExp() {
    const root = $('expList'); root.textContent = '';
    const list = data().experience = data().experience || [];
    list.forEach(function (e, i) {
      const grid = h('div', { class: 'grid' });
      S.EXP_PROPS.forEach(function (p) {
        let inp;
        if (p.type === 'bool') {
          inp = h('input', { type: 'checkbox' }); inp.checked = !!e[p.prop];
          inp.addEventListener('change', function () { e[p.prop] = inp.checked; queueSave(); });
          grid.appendChild(h('label', { class: 'chk f' }, [inp, h('span', { text: p.label })]));
          return;
        }
        inp = p.type === 'textarea' ? h('textarea', { rows: '2' }) : h('input', { type: p.type === 'date' ? 'date' : 'text' });
        inp.value = p.type === 'date' ? (P.toISODate(e[p.prop]) || '') : (e[p.prop] || '');
        inp.addEventListener('input', function () { e[p.prop] = inp.value; queueSave(); });
        grid.appendChild(h('label', { class: 'f' + (p.type === 'textarea' ? ' wide' : '') }, [h('span', { text: p.label }), inp]));
      });
      root.appendChild(h('div', { class: 'card' }, [
        h('b', { text: 'Experience ' + (i + 1) }),
        h('button', { class: 'btn danger rm', text: 'Remove', onclick: function () { list.splice(i, 1); queueSave(); renderExp(); } }),
        grid]));
    });
  }
  $('expAdd').addEventListener('click', function () { data().experience.push({}); queueSave(); renderExp(); });

  function renderExtra() {
    const root = $('extraList'); root.textContent = '';
    const ex = data().extra = data().extra || {};
    Object.keys(ex).forEach(function (k) {
      const kin = h('input', { type: 'text' }); kin.value = k;
      const vin = h('input', { type: 'text' }); vin.value = ex[k];
      let cur = k;
      kin.addEventListener('change', function () {
        const nk = kin.value.trim(); if (!nk || nk === cur) { kin.value = cur; return; }
        ex[nk] = ex[cur]; delete ex[cur]; cur = nk; queueSave();
      });
      vin.addEventListener('input', function () { ex[cur] = vin.value; queueSave(); });
      root.appendChild(h('div', { class: 'kv' }, [kin, vin, h('button', { class: 'btn danger', text: '✕', onclick: function () { delete ex[cur]; queueSave(); renderExtra(); } })]));
    });
  }
  $('extraAdd').addEventListener('click', function () {
    const k = prompt('Name of the detail (e.g. "LinkedIn", "Skills")?'); if (!k) return;
    data().extra[k] = ''; queueSave(); renderExtra();
  });

  /* ---------------- import ---------------- */
  let pending = null;   // {items}
  function fileToBase64(file) {
    return new Promise(function (res, rej) {
      const r = new FileReader();
      r.onload = function () { res(String(r.result).split(',')[1]); };
      r.onerror = rej; r.readAsDataURL(file);
    });
  }
  function updateAIHint() {
    const has = !!st.settings.geminiKey;
    $('useAI').disabled = !has;
    if (!has) $('useAI').checked = false;
    $('aiHint').textContent = has ? '' : '(add a Gemini key in Settings to enable)';
  }

  function keySelect(it) {
    const sel = h('select');
    sel.appendChild(h('option', { value: '', text: '— skip —' }));
    S.GROUPS.forEach(function (g) {
      const og = h('optgroup', { label: g.title });
      S.fields.forEach(function (f) { if (f.group === g.id && !f.derived && !f.repeat) og.appendChild(h('option', { value: f.key, text: f.label })); });
      if (og.children.length) sel.appendChild(og);
    });
    const exp = h('optgroup', { label: 'Experience (number = entry)' });
    for (let n = 1; n <= 5; n++) S.EXP_PROPS.forEach(function (p) { exp.appendChild(h('option', { value: 'exp_' + n + '_' + p.prop, text: 'Experience ' + n + ' – ' + p.label })); });
    sel.appendChild(exp);
    if (it.key && !sel.querySelector('option[value="' + CSS.escape(it.key) + '"]')) sel.appendChild(h('option', { value: it.key, text: it.key.indexOf('extra:') === 0 ? 'Extra: ' + it.key.slice(6) : it.key }));
    sel.value = it.key || '';
    return sel;
  }

  function renderReview() {
    const tb = $('reviewTable').querySelector('tbody'); tb.textContent = '';
    pending.items.forEach(function (it) {
      const cb = h('input', { type: 'checkbox' }); cb.checked = it.include && !!it.key;
      cb.addEventListener('change', function () { it.include = cb.checked; });
      const sel = keySelect(it);
      sel.addEventListener('change', function () { it.key = sel.value || null; cb.checked = it.include = !!it.key; });
      const v = h('input', { type: 'text' }); v.value = it.value;
      v.addEventListener('input', function () { it.value = v.value; });
      tb.appendChild(h('tr', {}, [
        h('td', {}, [cb]),
        h('td', {}, [h('span', { class: 'badge b-' + (it.key ? it.conf : 'none') }), h('span', { text: it.label })]),
        h('td', {}, [sel]), h('td', {}, [v])]));
      it.include = cb.checked;
    });
    $('review').hidden = false;
  }

  $('analyze').addEventListener('click', async function () {
    const msg = $('importMsg'); $('review').hidden = true;
    const file = $('file').files[0], pasted = $('pasteText').value.trim();
    if (!file && !pasted) return notice(msg, 'Choose a file or paste some text first.', true);
    const useAI = $('useAI').checked && !!st.settings.geminiKey;
    $('analyze').disabled = true; notice(msg, 'Reading…');
    try {
      let items = null, text = pasted;
      const name = file ? file.name.toLowerCase() : '';
      if (file) {
        if (/\.json$/.test(name)) {
          const obj = JSON.parse(await file.text());
          if (obj && obj.profiles && typeof obj.profiles === 'object') {
            if (confirm('This is a full backup. Restore it (replaces ALL current profiles and site rules)?')) {
              st.profiles = obj.profiles; st.activeProfileId = obj.activeProfileId && obj.profiles[obj.activeProfileId] ? obj.activeProfileId : Object.keys(obj.profiles)[0];
              await P.store.set({ profiles: st.profiles, activeProfileId: st.activeProfileId, siteRules: obj.siteRules || {} });
              st.siteRules = obj.siteRules || {}; renderAll(); notice(msg, 'Backup restored.');
            } else msg.hidden = true;
            return;
          }
          items = I.jsonToItems(obj);
        } else if (/\.csv$/.test(name)) {
          items = I.csvToItems(await file.text());
        } else if (/\.(txt|md)$/.test(name)) {
          text = await file.text();
        } else if (/\.docx$/.test(name)) {
          text = await I.docxToText(await file.arrayBuffer());
        } else if (/\.(pdf|png|jpe?g|webp)$/.test(name)) {
          if (!useAI) throw new Error('PDFs and images need Gemini AI (add a key in Settings and tick "Use Gemini AI"). Alternatively paste the text, or use DOCX / TXT / CSV.');
          const mime = /\.pdf$/.test(name) ? 'application/pdf' : /\.png$/.test(name) ? 'image/png' : /\.webp$/.test(name) ? 'image/webp' : 'image/jpeg';
          const r = await JAFGemini.extractProfile({ key: st.settings.geminiKey, model: st.settings.model, inline: { mime: mime, base64: await fileToBase64(file) } });
          items = I.aiToItems(r);
        } else throw new Error('Unsupported file type.');
      }
      if (!items) {
        if (useAI) items = I.aiToItems(await JAFGemini.extractProfile({ key: st.settings.geminiKey, model: st.settings.model, text: text }));
        else items = I.textToItems(text);
      }
      if (!items.length) throw new Error('Nothing recognisable found.' + (useAI ? '' : ' Try the AI option, or use the CSV template.'));
      pending = { items: items };
      notice(msg, 'Found ' + items.length + ' items. Review them below, then save.');
      renderReview();
    } catch (e) { notice(msg, e.message || String(e), true); }
    finally { $('analyze').disabled = false; }
  });
  $('applyImport').addEventListener('click', async function () {
    const n = I.applyItems(data(), pending.items, $('ovr').checked);
    await persist(); renderForm(); renderExp(); renderExtra();
    $('review').hidden = true; pending = null;
    notice($('importMsg'), 'Saved ' + n + ' values to "' + profile().name + '". See the Profile tab.');
  });
  $('cancelImport').addEventListener('click', function () { $('review').hidden = true; pending = null; $('importMsg').hidden = true; });
  $('tplLink').addEventListener('click', function (e) { e.preventDefault(); download('job-profile-template.csv', '﻿' + I.csvTemplate(), 'text/csv'); });
  ['dragover', 'dragenter'].forEach(function (ev) { $('drop').addEventListener(ev, function (e) { e.preventDefault(); $('drop').classList.add('over'); }); });
  ['dragleave', 'drop'].forEach(function (ev) { $('drop').addEventListener(ev, function (e) { e.preventDefault(); $('drop').classList.remove('over'); }); });
  $('drop').addEventListener('drop', function (e) { if (e.dataTransfer.files[0]) $('file').files = e.dataTransfer.files; });

  /* ---------------- export ---------------- */
  $('expJSON').addEventListener('click', function () { download('job-profile.json', JSON.stringify({ name: profile().name, data: data() }, null, 2), 'application/json'); });
  $('expCSV').addEventListener('click', function () { download('job-profile.csv', '﻿' + I.toCSV([['field', 'value']].concat(P.toRows(data()))), 'text/csv'); });
  $('expAll').addEventListener('click', function () {
    download('job-auto-filler-backup.json', JSON.stringify({ profiles: st.profiles, activeProfileId: st.activeProfileId, siteRules: st.siteRules }, null, 2), 'application/json');
  });

  /* ---------------- rules ---------------- */
  async function renderRules() {
    st.siteRules = (await P.store.get('siteRules')).siteRules || {};
    const root = $('rulesList'); root.textContent = '';
    const hosts = Object.keys(st.siteRules);
    if (!hosts.length) root.appendChild(h('p', { class: 'muted', text: 'No saved rules yet.' }));
    hosts.forEach(function (host) {
      root.appendChild(h('h3', { text: host }));
      Object.keys(st.siteRules[host]).forEach(function (sig) {
        root.appendChild(h('div', { class: 'rule' }, [
          h('code', { text: sig.split('|').slice(0, 2).join(' · ') + '  →  ' + (st.siteRules[host][sig] || '(ignore)') }),
          h('button', { class: 'btn danger', text: 'Delete', onclick: async function () {
            delete st.siteRules[host][sig]; if (!Object.keys(st.siteRules[host]).length) delete st.siteRules[host];
            await P.store.set({ siteRules: st.siteRules }); renderRules();
          } })]));
      });
    });
  }
  $('rulesClear').addEventListener('click', async function () {
    if (!confirm('Delete all site rules?')) return;
    st.siteRules = {}; await P.store.set({ siteRules: {} }); renderRules();
  });

  /* ---------------- settings ---------------- */
  function renderSettings() {
    $('apiKey').value = st.settings.geminiKey || '';
    $('model').value = st.settings.model || S.DEFAULT_MODEL;
    $('aiMatch').checked = !!st.settings.aiMatch;
    $('aiDocs').checked = !!st.settings.aiDocs;
    $('aiOptions').checked = st.settings.aiOptions !== false;
    $('watchSteps').checked = st.settings.watchSteps !== false;
    refreshPerm();
    $('overwriteDefault').checked = !!st.settings.overwrite;
    $('useAI').checked = !!st.settings.geminiKey && !!st.settings.aiDocs;
    updateAIHint();
  }
  async function saveSettings() {
    st.settings.geminiKey = $('apiKey').value.trim();
    st.settings.model = $('model').value.trim() || S.DEFAULT_MODEL;
    st.settings.aiMatch = $('aiMatch').checked;
    st.settings.aiDocs = $('aiDocs').checked;
    st.settings.aiOptions = $('aiOptions').checked;
    st.settings.watchSteps = $('watchSteps').checked;
    st.settings.overwrite = $('overwriteDefault').checked;
    await P.store.set({ settings: st.settings });
    updateAIHint();
  }
  $('saveKey').addEventListener('click', async function () { await saveSettings(); notice($('keyMsg'), 'Settings saved.'); });
  $('overwriteDefault').addEventListener('change', saveSettings);
  $('watchSteps').addEventListener('change', saveSettings);
  function refreshPerm() {
    if (!chrome.permissions) return;
    chrome.permissions.contains({ origins: ['<all_urls>'] }, function (ok) { $('allSitesState').textContent = ok ? 'Allowed ✔' : 'Not allowed (current tab only)'; });
  }
  $('allSites').addEventListener('click', function () {
    chrome.permissions.request({ origins: ['<all_urls>'] }, function () { refreshPerm(); });
  });

  /* site rules: export / import */
  $('rulesExport').addEventListener('click', async function () {
    const rules = (await P.store.get('siteRules')).siteRules || {};
    download('job-auto-filler-rules.json', JSON.stringify(rules, null, 2), 'application/json');
  });
  $('rulesImportBtn').addEventListener('click', function () { $('rulesImport').click(); });
  $('rulesImport').addEventListener('change', async function (e) {
    const f = e.target.files[0]; if (!f) return;
    try {
      const inc = JSON.parse(await f.text());
      const cur = (await P.store.get('siteRules')).siteRules || {};
      Object.keys(inc).forEach(function (h) { if (inc[h] && typeof inc[h] === 'object') cur[h] = Object.assign(cur[h] || {}, inc[h]); });
      await P.store.set({ siteRules: cur }); renderRules();
    } catch (err) { alert('That file is not a valid rules export.'); }
    e.target.value = '';
  });
  $('showKey').addEventListener('click', function () {
    const t = $('apiKey').type === 'password'; $('apiKey').type = t ? 'text' : 'password'; $('showKey').textContent = t ? 'Hide' : 'Show';
  });
  $('testKey').addEventListener('click', async function () {
    const key = $('apiKey').value.trim(); if (!key) return notice($('keyMsg'), 'Enter a key first.', true);
    notice($('keyMsg'), 'Testing…');
    try { await JAFGemini.test(key, $('model').value.trim() || S.DEFAULT_MODEL); notice($('keyMsg'), 'Key works ✔'); }
    catch (e) { notice($('keyMsg'), e.message, true); }
  });
  $('removeKey').addEventListener('click', async function () {
    $('apiKey').value = ''; await saveSettings(); notice($('keyMsg'), 'Key removed. The extension keeps working offline.');
  });

  function renderAll() { renderProfileBar(); renderForm(); renderExp(); renderExtra(); renderSettings(); }
  renderAll();
})();
