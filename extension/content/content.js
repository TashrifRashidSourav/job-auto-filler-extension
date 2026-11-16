/* Orchestrator: scan -> match -> (preview) -> fill, with multiple passes for dependent fields. */
(function (g) {
  'use strict';
  if (g.__JAF_LOADED__) return;
  g.__JAF_LOADED__ = true;

  const JAF = g.JAF;
  const M = g.JAFMatcher;
  const P = g.JAFProfile;
  const F = JAF.filler;

  const overrides = new WeakMap();   // el -> key ('' = ignore)   (user choices in preview)
  const excluded = new WeakSet();    // el unchecked in preview
  const aiKeys = new WeakMap();      // el -> key from Gemini
  let state = null;                  // {data, settings, rules, host}

  /* ask Gemini which dropdown option matches a value (sends only that value + the option list) */
  async function aiPick(value, label, options) {
    const s = state.settings;
    if (!s.geminiKey || !s.aiOptions) return -1;
    try {
      const r = await chrome.runtime.sendMessage({ type: 'JAF_AI_PICK', value: value, label: label, options: options });
      return r && r.ok && typeof r.index === 'number' ? r.index : -1;
    } catch (e) { return -1; }
  }
  async function onLearn(value, text) {
    if (!g.JAFTranslate.learn(value, text)) return;
    await P.store.set({ translations: g.JAFTranslate.dump() });
  }
  function fillOpts(overwrite) { return { overwrite: overwrite, aiPick: aiPick, onLearn: onLearn }; }

  function JAF_SCHEMA_LEVEL(sec) { return g.JAF_SCHEMA.EDU_LEVEL_NAME[sec] || sec; }

  function confOf(score) { return score >= 100 ? 'high' : score >= 60 ? 'med' : 'none'; }

  function looksLikeGrading(options) {
    return (options || []).some(function (o) { return /gpa|cgpa|division|class|grade/i.test(o.text); });
  }

  function adjustKey(key, d) {
    if (key && /_result$/.test(key) && d.kind === 'select' && looksLikeGrading(d.options)) return key + '_type';
    return key;
  }

  /* generic qualification keys (edu_year ...) resolve to the record being filled (hsc_year ...) */
  function effKey(key) {
    if (!key || key.indexOf('edu_') !== 0 || key === 'edu_level') return key;
    return state.eduSection ? state.eduSection + '_' + key.slice(4) : null;
  }

  /* "add one qualification" forms: no SSC/HSC headings, a level dropdown picks the record */
  const EDU_KIND_RE = /^(jsc|ssc|hsc|honors|masters)_(.+)$/;

  function buildPlan() {
    const descs = JAF.scan();
    const pre = descs.map(function (d) { return M.matchField(d); });
    const pageEdu = !!state.eduSection && (descs.some(function (d) { return d.eduHint; }) ||
      pre.some(function (c) { return c.length && c[0].key === 'edu_level'; }));
    state.pageEdu = pageEdu;
    return descs.map(function (d, di) {
      let key = null, score = 0, src = '';
      const ov = overrides.get(d.el);
      if (ov !== undefined) { key = ov || null; score = 1000; src = 'manual'; }
      else if (state.rules[d.sig] !== undefined) { key = state.rules[d.sig] || null; score = 500; src = 'rule'; }
      else {
        let c = pre[di];
        if (pageEdu && !d.section) {
          // try again as a field of the qualification being filled; keep whichever is the better match
          const c2 = M.matchField(Object.assign({}, d, { section: state.eduSection }));
          if (c2.length && EDU_KIND_RE.test(c2[0].key) && (!c.length || c2[0].score > c[0].score)) {
            c = [{ key: 'edu_' + c2[0].key.replace(EDU_KIND_RE, '$2'), score: c2[0].score }];
          }
        }
        if (c.length) { key = c[0].key; score = c[0].score; }
        if (!key || score < 100) {
          const ex = M.matchExtra(d, state.data.extra);
          if (ex && !key) { key = ex; score = 100; src = 'extra'; }
          else if (aiKeys.has(d.el) && score < 100) { key = aiKeys.get(d.el); score = 90; src = 'ai'; }
        }
        key = adjustKey(key, d);
      }
      return { el: d.el, desc: d, key: key, score: score, conf: confOf(score), src: src, include: !excluded.has(d.el) };
    });
  }

  function assignValues(items) {
    const counts = {};
    items.forEach(function (it) {
      if (!it.key) { it.value = ''; it.hasValue = false; return; }
      let expIndex = 0;
      if (it.key.indexOf('exp_') === 0) { counts[it.key] = counts[it.key] || 0; expIndex = counts[it.key]++; }
      if (it.key === 'edu_level') it.value = state.eduSection ? JAF_SCHEMA_LEVEL(state.eduSection) : '';
      else {
        const ek = effKey(it.key);
        it.value = ek ? P.resolveValue(state.data, ek, { expIndex: expIndex }) : '';
      }
      if (typeof it.value === 'string' && /^(name_en|father_en|mother_en)$/.test(it.key) && /capital|block letter|বড় (অক্ষর|হাতের)/i.test(it.desc.label || '')) it.value = it.value.toUpperCase();
      it.hasValue = it.value === true || (typeof it.value === 'string' && it.value.trim() !== '');
    });
  }

  function refresh() {
    const items = buildPlan();
    assignValues(items);
    return items;
  }

  /* ---- Gemini assist for uncertain fields (sends labels only, never values) ---- */
  async function aiAssist(items) {
    const s = state.settings;
    if (!s.geminiKey || !s.aiMatch) return 0;
    const unsure = items.filter(function (i) { return (!i.key || i.score < 100) && i.src !== 'manual' && i.desc.kind !== 'radio'; }).slice(0, 60);
    if (!unsure.length) return 0;
    const fields = unsure.map(function (it, n) {
      return { id: 'f' + n, label: it.desc.label, section: it.desc.section || null, tag: it.desc.kind, type: it.desc.type, name: it.desc.name,
        options: (it.desc.options || []).slice(0, 12).map(function (o) { return o.text; }) };
    });
    let resp;
    const headings = Array.prototype.slice.call(document.querySelectorAll('h1,h2,h3,legend')).map(function (h) { return (h.innerText || h.textContent || '').trim(); })
      .filter(Boolean).slice(0, 12);
    const context = { title: document.title, host: location.hostname, headings: headings, qualificationForm: !!state.pageEdu };
    try { resp = await chrome.runtime.sendMessage({ type: 'JAF_AI_MATCH', fields: fields, context: context }); } catch (e) { return 0; }
    if (!resp || !resp.ok) { if (resp && resp.error) JAF.overlay.toast('AI matching skipped: ' + resp.error, true); return 0; }
    let n = 0;
    unsure.forEach(function (it, i) {
      const k = resp.mapping['f' + i];
      if (k && (!it.key || it.score < 90)) { aiKeys.set(it.el, adjustKey(k, it.desc)); n++; }
    });
    return n;
  }

  /* ---- site rules ---- */
  async function saveRules(items) {
    let changed = false;
    items.forEach(function (it) {
      if (it.src === 'manual' || it.src === 'ai') {
        const k = it.src === 'ai' ? it.key : (overrides.get(it.el) || '');
        if (it.src === 'ai' && !it.key) return;
        state.rules[it.desc.sig] = k; changed = true;
      }
    });
    if (!changed) return;
    const all = (await P.store.get('siteRules')).siteRules || {};
    all[state.host] = state.rules;
    await P.store.set({ siteRules: all });
  }

  /* ---- the fill loop ---- */
  async function fillAll(items, opts) {
    const done = new WeakSet();
    const status = new Map();
    const maxPass = 4 + (state.data.experience || []).length;
    let plan = items;
    let pass = 0;
    for (; pass < maxPass; pass++) {
      let progress = false;
      const ordered = plan.slice().sort(function (a, b) {
        const aa = a.key && a.key.indexOf('applicable_') === 0 ? 0 : 1, bb = b.key && b.key.indexOf('applicable_') === 0 ? 0 : 1;
        return aa - bb;
      });
      for (let i = 0; i < ordered.length; i++) {
        const it = ordered[i];
        if (!it.key || !it.include || !it.hasValue || done.has(it.el)) continue;
        const r = await F.fill(it, opts);
        status.set(it.el, r);
        if (r === 'filled') { done.add(it.el); progress = true; }
        else if (r === 'kept') done.add(it.el);
        else if (r === 'nomatch' && pass >= 2) done.add(it.el);
      }
      // repeating experience blocks: click "ADD MORE" when the profile has more entries than the page has blocks
      let added = false;
      const needed = P.cleanExperience(state.data.experience).length;
      const have = plan.filter(function (i) { return i.key === 'exp_org'; }).length || plan.filter(function (i) { return i.key === 'exp_designation'; }).length;
      if (needed > have && have > 0) {
        const anchor = plan.filter(function (i) { return /^exp_/.test(i.key || ''); }).pop();
        const btn = anchor && F.findAddMore(anchor.el);
        if (btn) { btn.click(); await F.sleep(600); added = true; }
      }
      if (!progress && !added) break;
      const fresh = refresh();
      fresh.forEach(function (n) { if (excluded.has(n.el)) n.include = false; });
      plan = fresh;
    }
    const tally = { filled: 0, kept: 0, disabled: 0, failed: 0 };
    status.forEach(function (r) {
      if (r === 'filled') tally.filled++;
      else if (r === 'kept') tally.kept++;
      else if (r === 'disabled') tally.disabled++;
      else tally.failed++;
    });
    const missing = plan.filter(function (i) { return i.key && !i.hasValue; }).length;
    const unmatched = plan.filter(function (i) { return !i.key; }).length;
    // things the extension deliberately never does
    const uploads = document.querySelectorAll('input[type=file]').length;
    const declarations = plan.filter(function (i) {
      return !i.key && i.desc.kind === 'checkbox' && /declar|agree|accept|terms|consent|certif|সম্মত|ঘোষণা|শর্ত|অঙ্গীকার/i.test(i.desc.label || '');
    }).length;
    const summary = 'Filled ' + tally.filled + ' · already set ' + tally.kept + (tally.failed ? ' · couldn\'t set ' + tally.failed : '') +
      '\nNo data in profile: ' + missing + ' · unmatched fields: ' + unmatched +
      (uploads ? '\nFile uploads to do yourself: ' + uploads : '') +
      (declarations ? '\nDeclaration / terms boxes left for you: ' + declarations : '') +
      '\nReview the form, then submit it yourself.';
    return { ok: true, filled: tally.filled, kept: tally.kept, failed: tally.failed, missing: missing, unmatched: unmatched, summary: summary };
  }

  /* ---- diagnostic report the user can paste when a site misbehaves (contains NO personal values) ---- */
  function buildReport(items) {
    return JSON.stringify({
      page: { host: location.hostname, title: document.title, topFrame: g === g.top, qualificationForm: !!state.pageEdu, qualification: state.eduSection || null },
      fields: items.map(function (it) {
        return { label: it.desc.label, section: it.desc.section || null, kind: it.desc.kind, tag: it.desc.tag, type: it.desc.type,
          role: it.el.getAttribute && it.el.getAttribute('role'), cls: String(it.el.className && it.el.className.baseVal === undefined ? it.el.className : '').slice(0, 90),
          mirror: !!it.desc.mirror, options: (it.desc.options || []).length || undefined,
          key: it.key, score: Math.round(it.score), via: it.src || 'auto', hasValue: !!it.hasValue };
      })
    }, null, 1);
  }

  /* ---- multi-step forms: after one fill, notice fields that appear later and offer to fill them ---- */
  let busy = false, watcherOn = false, lastSig = '';
  function startWatcher() {
    if (watcherOn || !state.settings.watchSteps || !document.body) return;
    watcherOn = true;
    let t = null;
    const mo = new MutationObserver(function () { clearTimeout(t); t = setTimeout(check, 1000); });
    mo.observe(document.body, { childList: true, subtree: true });
    async function check() {
      if (busy) return;
      try {
        const items = refresh();
        const pending = items.filter(function (it) { return it.key && it.hasValue && it.include && F.isEmpty(it); });
        if (!pending.length) { lastSig = ''; return; }
        const sig = pending.map(function (i) { return i.desc.sig; }).join('~');
        if (sig === lastSig) return;
        lastSig = sig;
        JAF.overlay.chip(pending.length + ' field' + (pending.length > 1 ? 's' : '') + ' here can be filled', function () { run('quick', {}); });
      } catch (e) { /* ignore */ }
    }
  }

  async function run(mode, msgOpts) {
    busy = true;
    try { return await runInner(mode, msgOpts); }
    finally { busy = false; }
  }

  async function runInner(mode, msgOpts) {
    if (mode === 'preview' && g !== g.top) mode = 'quick';     // the preview panel lives in the top frame only
    const all = await P.loadAll();
    g.JAFTranslate.load((await P.store.get('translations')).translations);
    const profile = all.profiles[all.activeProfileId];
    const hostName = location.hostname || 'local';
    state = { data: profile.data || P.emptyData(), settings: all.settings, rules: Object.assign({}, all.siteRules[hostName] || {}), host: hostName };
    const overwrite = msgOpts && typeof msgOpts.overwrite === 'boolean' ? msgOpts.overwrite : !!state.settings.overwrite;

    // which qualification should a "add one qualification" form receive? (explicit choice, else the next one in order)
    const SEC = g.JAF_SCHEMA;
    state.eduAvail = SEC.EDU_SECTIONS.filter(function (s) { return P.sectionHasData(state.data, s); });
    const cursors = (await P.store.get('eduCursor')).eduCursor || {};
    const cur = (cursors[hostName] || 0) % Math.max(state.eduAvail.length, 1);
    const explicit = msgOpts && msgOpts.edu && msgOpts.edu !== 'auto' && state.eduAvail.indexOf(msgOpts.edu) >= 0 ? msgOpts.edu : null;
    state.eduSection = explicit || state.eduAvail[cur] || null;
    state.eduAuto = !explicit;
    async function advanceCursor() {
      if (!state.pageEdu || !state.eduAuto || state.eduAvail.length < 2) return;
      cursors[hostName] = (cur + 1) % state.eduAvail.length;
      await P.store.set({ eduCursor: cursors });
    }
    function eduNote() {
      if (!state.pageEdu || !state.eduSection) return '';
      const lab = function (s) { return SEC.SECTIONS[s].label; };
      const next = state.eduAvail.length > 1 && state.eduAuto ? state.eduAvail[(cur + 1) % state.eduAvail.length] : null;
      return '\nQualification filled: ' + lab(state.eduSection) + (next ? '. Submit it, then click Fill again for ' + lab(next) + '.' : '.');
    }

    if (!P.completeness(state.data).filled) {
      JAF.overlay.toast('Your profile is empty. Open the extension settings to add your details first.', true);
      return { ok: false, error: 'Profile is empty. Add your details in Settings first.' };
    }

    let items = refresh();
    if (!items.length) {
      JAF.overlay.toast('No form fields found on this page.', true);
      return { ok: false, error: 'No form fields found on this page.' };
    }
    await aiAssist(items);
    items = refresh();

    if (mode === 'preview') {
      JAF.overlay.show({
        items: items,
        meta: { host: hostName, profile: profile.name },
        onOpenSettings: function () { try { chrome.runtime.sendMessage({ type: 'JAF_OPEN_OPTIONS' }); } catch (e) { /* ignore */ } },
        onToggle: function (it) { if (it.include) excluded.delete(it.el); else excluded.add(it.el); },
        onKeyChange: function (it, key) {
          overrides.set(it.el, key);
          it.key = key || null; it.score = 1000; it.conf = 'high'; it.src = 'manual';
          assignValues(items);
        },
        edu: state.pageEdu && state.eduAvail.length ? {
          current: state.eduSection,
          options: state.eduAvail.map(function (s) { return { id: s, label: SEC.SECTIONS[s].label }; }),
          onChange: function (sec) {
            state.eduSection = sec; state.eduAuto = false;
            const fresh = refresh();
            items.length = 0;
            fresh.forEach(function (x) { items.push(x); });
          }
        } : null,
        onReport: function () { return buildReport(items); },
        onFill: async function () {
          busy = true;
          await saveRules(items);
          const r = await fillAll(items, fillOpts(overwrite));
          await advanceCursor();
          r.summary += eduNote();
          busy = false;
          startWatcher();
          return r;
        },
        onClose: function () { }
      });
      return { ok: true, mode: 'preview', total: items.length };
    }

    const r = await fillAll(items, fillOpts(overwrite));
    await saveRules(items);
    await advanceCursor();
    r.summary += eduNote();
    JAF.overlay.toast(r.summary);
    startWatcher();
    return r;
  }

  /* used by the background script to run in every frame and collect the results */
  g.__JAF_RUN__ = function (mode, o) { return run(mode, o || {}).catch(function (e) { return { ok: false, error: String(e && e.message || e) }; }); };

  chrome.runtime.onMessage.addListener(function (msg, sender, send) {
    if (msg && msg.type === 'JAF_RUN') {
      run(msg.mode, msg).then(send).catch(function (e) { send({ ok: false, error: String(e && e.message || e) }); });
      return true;
    }
    return false;
  });
})(typeof window !== 'undefined' ? window : this);
