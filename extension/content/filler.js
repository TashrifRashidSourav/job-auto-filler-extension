/* Sets values on form controls in a way React/Angular/Vue/jQuery widgets notice, then VERIFIES the result and
 * retries with a different strategy when the page rejected it.
 * Handles: native inputs/selects/radios/checkboxes, custom dropdowns (react-select, Select2, Chosen, Ant, MUI...),
 * hidden native selects behind widgets, readonly date pickers, masked inputs, autosuggest inputs, hidden/styled radios,
 * ARIA radiogroups & switches, contenteditable editors. */
(function (g) {
  'use strict';
  const JAF = g.JAF = g.JAF || {};
  const M = g.JAFMatcher;
  const P = g.JAFProfile;
  const T = g.JAFTranslate;

  const sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  const win = function (el) { return el.ownerDocument.defaultView || g; };

  function fire(el, type) {
    const w = win(el);
    let ev;
    if (type === 'input' && w.InputEvent) ev = new w.InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText' });
    else ev = new w.Event(type, { bubbles: true, cancelable: true });
    el.dispatchEvent(ev);
  }

  function setNative(el, value) {
    const w = win(el);
    const proto = el.tagName === 'SELECT' ? w.HTMLSelectElement.prototype
      : el.tagName === 'TEXTAREA' ? w.HTMLTextAreaElement.prototype : w.HTMLInputElement.prototype;
    const desc = Object.getOwnPropertyDescriptor(proto, 'value');
    if (desc && desc.set) desc.set.call(el, value); else el.value = value;
  }

  function isDisabled(el) {
    return !!el.disabled || el.getAttribute('aria-disabled') === 'true' || !!el.closest('fieldset[disabled]');
  }

  /* realistic click: libraries listen to pointerdown / mousedown, not just click */
  function realClick(el) {
    const w = win(el);
    ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(function (t) {
      const Ctor = /^pointer/.test(t) && w.PointerEvent ? w.PointerEvent : w.MouseEvent;
      el.dispatchEvent(new Ctor(t, { bubbles: true, cancelable: true, button: 0, view: w }));
    });
  }

  /* hidden (styled) checkbox / radio inputs are toggled by clicking their label */
  function clickTarget(el) {
    const hidden = g.__JAF_TEST__ ? (el.style && el.style.display === 'none') : el.getClientRects().length === 0;
    if (hidden && el.labels && el.labels[0]) return el.labels[0];
    return el;
  }

  /* wait until the DOM has been quiet for `quiet` ms (dependent dropdowns, async options...) */
  function settle(doc, quiet, max) {
    quiet = quiet || 200; max = max || 1800;
    return new Promise(function (res) {
      let t = null, mx = null;
      const mo = new (win(doc.documentElement).MutationObserver)(function () { clearTimeout(t); t = setTimeout(done, quiet); });
      function done() { mo.disconnect(); clearTimeout(t); clearTimeout(mx); res(); }
      mo.observe(doc.documentElement, { childList: true, subtree: true, attributes: true, characterData: true });
      t = setTimeout(done, quiet);
      mx = setTimeout(done, max);
    });
  }

  /* ---------------- option matching (selects / radios / custom dropdowns) ---------------- */
  const PLACE_ALIAS = { jessore: 'jashore', chittagong: 'chattogram', barisal: 'barishal', comilla: 'cumilla', bogra: 'bogura', jhalokathi: 'jhalakathi', jhalokati: 'jhalakathi', narshingdi: 'narsingdi', netrokona: 'netrakona', nawabganj: 'chapainawabganj', maulvibazar: 'moulvibazar' };
  const WHOLE_ALIAS = { m: 'male', f: 'female', muslim: 'islam', hindu: 'hinduism', christian: 'christianity', buddhist: 'buddhism', unmarried: 'single', bangladesh: 'bangladeshi', y: 'yes', n: 'no', true: 'yes', false: 'no' };
  function canon(s) {
    let n = M.norm(s);
    if (WHOLE_ALIAS[n]) n = WHOLE_ALIAS[n];
    return n.split(' ').map(function (t) { return PLACE_ALIAS[t] || t; }).join(' ');
  }
  function tokens(s) { return s ? s.split(' ') : []; }
  function subset(a, b) { return a.length > 0 && a.every(function (t) { return b.indexOf(t) >= 0; }); }

  function isPlaceholderOpt(o) {
    const t = M.norm(o.text);
    return (!o.value && !t) || /^(select|choose|please select|pick)\b/.test(t) || /^-+$/.test(o.text.trim()) || (o.value === '' && /select|choose/.test(t)) || /^নির্বাচন|^বাছাই/.test(t);
  }

  function scoreOne(v, t, val) {
    if (t === v || val === v) return 100;
    const tv = tokens(v), tt = tokens(t);
    if (subset(tv, tt) || subset(tt, tv)) return 70 - Math.abs(tt.length - tv.length) * 5;
    const inter = tv.filter(function (x) { return tt.indexOf(x) >= 0; }).length;
    return (inter / Math.max(tv.length, tt.length, 1)) * 60;
  }

  /* "GPA(out of 5)" <-> "জিপিএ (৫ এর মধ্যে)": compare the meaning (type + scale) instead of the words */
  function resultSig(text) {
    const s = M.norm(text);
    if (!s) return null;
    let type = null;
    if (/\bcgpa\b|সিজিপিএ/.test(s)) type = 'cgpa';
    else if (/\bgpa\b|জিপিএ/.test(s)) type = 'gpa';
    else if (/first (division|class)|প্রথম (বিভাগ|শ্রেণি|শ্রেণী)/.test(s)) type = 'd1';
    else if (/second (division|class)|দ্বিতীয় (বিভাগ|শ্রেণি|শ্রেণী)/.test(s)) type = 'd2';
    else if (/third (division|class)|তৃতীয় (বিভাগ|শ্রেণি|শ্রেণী)/.test(s)) type = 'd3';
    if (!type) return null;
    const m = s.match(/\b(\d+)\b/);
    return { type: type, scale: (type === 'gpa' || type === 'cgpa') && m ? m[1] : null };
  }
  function sigScore(a, b) {
    if (!a || !b || a.type !== b.type) return 0;
    if (a.scale && b.scale) return a.scale === b.scale ? 100 : 0;
    return 75;
  }

  /* returns index or -1. Tries the value AND its English/Bangla equivalents. */
  function bestOption(options, value, allowOther) {
    const vs = (T ? T.variants(value) : [String(value)]).map(canon).filter(Boolean);
    if (!vs.length) return -1;
    const valSig = resultSig(value);
    let best = -1, bs = 0, other = -1;
    options.forEach(function (o, i) {
      if (isPlaceholderOpt(o)) return;
      const t = canon(o.text), val = canon(o.value);
      if (t === 'other' || t === 'others') other = i;
      let s = 0;
      vs.forEach(function (v) { s = Math.max(s, scoreOne(v, t, val)); });
      s = Math.max(s, sigScore(valSig, resultSig(o.text)));
      if (s > bs) { bs = s; best = i; }
    });
    if (bs >= 55) return best;
    // phonetic fallback across scripts (Alamdanga <-> আলমডাঙ্গা): accept only a single unambiguous match
    if (T && T.skeleton && /[ঀ-৿]/.test(options.map(function (o) { return o.text; }).join(''))) {
      const sk = T.skeleton(value);
      if (sk.length >= 3) {
        let hit = -1, n = 0;
        options.forEach(function (o, i) { if (!isPlaceholderOpt(o) && T.skeleton(o.text) === sk) { hit = i; n++; } });
        if (n === 1) return hit;
      }
    }
    return allowOther ? other : -1;
  }

  async function waitOptions(sel) {
    for (let i = 0; i < 30 && sel.options.length <= 1; i++) await sleep(100);
  }

  /* ---------------- custom dropdown plumbing ---------------- */
  const OPTION_SEL = [
    '[role="option"]', '[cmdk-item]', '[role="listbox"] > li', '.select2-results__option', '[class*="select__option"]',
    '[class*="-option"]:not([class*="-options"]):not([class*="-optional"])', '.ant-select-item-option', 'mat-option', '.mat-mdc-option',
    '.chosen-results li', '.choices__item--choice', '.ts-dropdown .option', '.v-list-item', '.MuiAutocomplete-option', '.MuiMenuItem-root',
    '.dropdown-menu li', '.dropdown-menu a', '.dropdown-item', '.p-dropdown-item', '.p-select-option', '.nice-select .option',
    '.selectize-dropdown .option', '.el-select-dropdown__item', '.vs__dropdown-option', '.multiselect__element', '[role="menuitem"]',
    '.pac-item', '.ui-menu-item', '.autocomplete-suggestion', '.tt-suggestion', '.sumo-option'
  ].join(',');

  function shown(el) {
    if (g.__JAF_TEST__) return !(el.style && el.style.display === 'none') && !el.closest('[hidden]');
    return el.getClientRects().length > 0;
  }
  function optText(o) { return (o.innerText !== undefined ? o.innerText : o.textContent || '').replace(/\s+/g, ' ').trim(); }

  function visibleOptions(trigger) {
    const doc = trigger.ownerDocument;
    const list = Array.prototype.slice.call(doc.querySelectorAll(OPTION_SEL)).filter(function (o) { return shown(o) && !trigger.contains(o) && optText(o); });
    return list.filter(function (o) { return !list.some(function (x) { return x !== o && o.contains(x); }); });   // leaves only
  }
  function searchBox(trigger, firstOpt) {
    const doc = trigger.ownerDocument;
    const ae = doc.activeElement;
    if (ae && ae.tagName === 'INPUT' && ae !== trigger && ae.type !== 'checkbox') return ae;
    let node = firstOpt;
    for (let i = 0; i < 6 && node; i++) {
      const inp = node.querySelector && node.querySelector('input:not([type=checkbox]):not([type=radio]):not([type=hidden])');
      if (inp) return inp;
      node = node.parentElement;
    }
    return null;
  }
  async function waitFor(fn, ms) {
    const end = Date.now() + ms;
    for (;;) { const r = fn(); if (r) return r; if (Date.now() > end) return null; await sleep(60); }
  }
  function key(el, k, code) {
    ['keydown', 'keyup'].forEach(function (t) {
      (el.ownerDocument.activeElement || el).dispatchEvent(new (win(el).KeyboardEvent)(t, { key: k, code: code || k, bubbles: true, cancelable: true }));
    });
  }
  function closePopup(trigger) { key(trigger, 'Escape'); }

  /* long / virtualised lists: scroll the list container step by step, looking for the option */
  async function scrollSearch(trigger, pick) {
    let node = visibleOptions(trigger)[0];
    const doc = trigger.ownerDocument;
    while (node && node !== doc.body) {
      if (node.scrollHeight > node.clientHeight + 4 && /(auto|scroll)/.test(win(node).getComputedStyle(node).overflowY)) break;
      node = node.parentElement;
    }
    if (!node || node === doc.body) return -1;
    for (let i = 0; i < 60; i++) {
      const before = node.scrollTop;
      node.scrollTop += Math.max(node.clientHeight * 0.85, 60);
      await sleep(90);
      const l = visibleOptions(trigger);
      const idx = pick(l);
      if (idx >= 0) return { list: l, idx: idx };
      if (node.scrollTop === before) break;
    }
    return -1;
  }

  async function fillCombo(it, opts) {
    const el = it.el, v = String(it.value), doc = el.ownerDocument;
    if (isDisabled(el)) return 'disabled';
    const readNow = function () { return (el.tagName === 'INPUT' ? el.value : optText(el)).trim(); };
    const current = readNow();
    if (current && !isPlaceholderOpt({ text: current, value: '' }) && bestOption([{ text: current, value: current }], v) >= 0) return 'kept';

    const before = new Set(visibleOptions(el));
    if (el.tagName === 'INPUT') { try { el.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
    else realClick(el);
    const fresh = function () { const l = visibleOptions(el).filter(function (o) { return !before.has(o); }); return l.length ? l : null; };
    let list = await waitFor(fresh, 3000);
    if (!list && el.tagName === 'INPUT') { setNative(el, v); fire(el, 'input'); list = await waitFor(fresh, 2000); }
    if (!list) { const all = visibleOptions(el); list = all.length ? all : null; }
    if (!list) { closePopup(el); return 'nomatch'; }

    const pick = function (l) { return bestOption(l.map(function (o) { return { text: optText(o), value: '' }; }), v, false); };
    let idx = pick(list);
    if (idx < 0) {                                     // type into the search box (value, then its translations)
      const sb = searchBox(el, list[0]);
      if (sb) {
        const vs = (T ? T.variants(v) : [v]).slice(0, 4);
        for (let i = 0; i < vs.length && idx < 0; i++) {
          setNative(sb, vs[i]); fire(sb, 'input');
          await sleep(350);
          list = visibleOptions(el);
          if (list.length) idx = pick(list);
        }
      }
    }
    if (idx < 0) {                                     // virtualised list: scroll
      const r = await scrollSearch(el, pick);
      if (r && r.idx >= 0) { list = r.list; idx = r.idx; }
    }
    if (idx < 0 && opts.aiPick && list.length) {       // optional Gemini fallback
      const texts = list.slice(0, 120).map(optText);
      const k = await opts.aiPick(v, it.desc.label, texts);
      if (typeof k === 'number' && k >= 0 && k < list.length) { idx = k; if (T && opts.onLearn) opts.onLearn(v, texts[k]); }
    }
    if (idx < 0) { closePopup(el); return 'nomatch'; }
    const chosenText = optText(list[idx]);
    try { list[idx].scrollIntoView({ block: 'nearest' }); } catch (e) { /* ignore */ }
    realClick(list[idx]);
    await settle(doc, 150, 1200);

    // verify: popup closed or trigger text changed. Otherwise try the keyboard (type + arrow down + enter)
    const popupOpen = visibleOptions(el).some(function (o) { return !before.has(o); });
    const changed = readNow() !== current;
    if (popupOpen && !changed) {
      const sb = searchBox(el, list[0]) || (el.tagName === 'INPUT' ? el : null);
      if (sb) { setNative(sb, chosenText); fire(sb, 'input'); await sleep(250); }
      key(el, 'ArrowDown'); await sleep(80); key(el, 'Enter');
      await settle(doc, 150, 1000);
    }
    return 'filled';
  }

  /* ---------------- text ---------------- */
  async function fillText(el, value) {
    try { el.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
    setNative(el, value);
    fire(el, 'input');
    fire(el, 'change');
    el.dispatchEvent(new (win(el).Event)('blur', { bubbles: true }));
  }

  /* masked / validated inputs that reject programmatic values: type the characters one by one */
  async function typeInto(el, text) {
    const w = win(el);
    try { el.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
    setNative(el, ''); fire(el, 'input');
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      el.dispatchEvent(new w.KeyboardEvent('keydown', { key: ch, bubbles: true, cancelable: true }));
      el.dispatchEvent(new w.KeyboardEvent('keypress', { key: ch, bubbles: true, cancelable: true }));
      const bi = new w.InputEvent('beforeinput', { data: ch, inputType: 'insertText', bubbles: true, cancelable: true });
      if (el.dispatchEvent(bi)) {
        setNative(el, el.value + ch);
        el.dispatchEvent(new w.InputEvent('input', { data: ch, inputType: 'insertText', bubbles: true }));
      }
      el.dispatchEvent(new w.KeyboardEvent('keyup', { key: ch, bubbles: true }));
      await sleep(4);
    }
    fire(el, 'change');
    el.dispatchEvent(new w.Event('blur', { bubbles: true }));
  }

  function alnum(s) { return String(s).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ''); }
  function sameText(actual, expected) {
    const a = alnum(actual), e = alnum(expected);
    if (a === e) return true;
    const da = a.replace(/\D/g, ''), de = e.replace(/\D/g, '');
    if (de.length >= 6 && da === de) return true;
    if (a && e && (a.indexOf(e) >= 0 || e.indexOf(a) >= 0)) return true;          // reformatted by the page
    return false;
  }

  function dateHint(el) {
    return [el.getAttribute('placeholder'), el.getAttribute('data-date-format'), el.getAttribute('data-format'), el.getAttribute('data-mask'),
      el.getAttribute('format'), el.getAttribute('title'), el.getAttribute('aria-label'), el.getAttribute('pattern')].filter(Boolean).join(' ');
  }

  /* BD mobile numbers: 01XXXXXXXXX (local) / 1XXXXXXXXX (national) / +8801XXXXXXXXX (international), chosen from hints */
  function shapePhone(v, el) {
    const digits = String(v).replace(/[^\d]/g, '');
    const m = digits.match(/^(?:880|0)?(1[3-9]\d{8})$/);
    if (!m) return v;
    const ph = (el.getAttribute('placeholder') || '').trim();
    const ml = parseInt(el.getAttribute('maxlength') || '0', 10);
    if (/^\+?880/.test(ph)) return (ph[0] === '+' ? '+' : '') + '880' + m[1];
    if (/^1\d/.test(ph) || (ml === 10)) return m[1];
    if (ml === 13 || ml === 14) return '+880' + m[1];
    return '0' + m[1];
  }

  const SUGGEST_RE = /autocomplete|typeahead|suggest|pac-target|search|combobox/i;

  async function fillTextEl(it, opts) {
    const el = it.el, d = it.desc;
    let v = String(it.value);
    const ro = !!el.readOnly;
    const dateish = d.type === 'date' || /^(dob|license_validity|exp_from|exp_to)$/.test(it.key || '') ||
      /date|calendar|picker|datepicker|flatpickr/i.test((el.className || '') + ' ' + (el.getAttribute('data-provide') || '') + ' ' + (el.getAttribute('name') || ''));
    if (isDisabled(el)) return 'disabled';
    if (ro && !dateish) return 'disabled';
    if (!opts.overwrite && String(el.value).trim() !== '') return 'kept';

    if (/duration$/.test(it.key || '') && (d.type === 'number' || /বছর|year|yrs?\b/i.test(d.label || ''))) {
      const m = v.match(/\d+(\.\d+)?/);
      if (m) v = String(parseFloat(m[0]));
    }
    if (d.type === 'date') {
      const iso = P.toISODate(v);
      if (!iso) return 'nomatch';
      v = iso;
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(v) && (dateish || it.key === 'dob')) {
      v = P.formatDateForText(v, dateHint(el));
    }
    if (/^(mobile|mobile_confirm)$/.test(it.key || '')) v = shapePhone(v, el);
    if (d.type === 'number') { const m = v.match(/-?\d+(\.\d+)?/); if (m) v = m[0]; }

    const before = new Set(visibleOptions(el));
    if (ro) el.removeAttribute('readonly');              // readonly date-picker inputs
    await fillText(el, v);
    let ok = sameText(el.value, v) || d.type === 'date';
    if (!ok) {                                           // page reverted / masked the value: type it like a person
      await typeInto(el, v);
      ok = sameText(el.value, v);
    }
    if (ro) el.setAttribute('readonly', '');

    // autosuggest inputs (Google Places, typeahead...): click the matching suggestion
    if (SUGGEST_RE.test((el.className || '') + ' ' + (el.getAttribute('role') || '') + ' ' + (el.getAttribute('aria-autocomplete') || '')) || el.getAttribute('list')) {
      const l = await waitFor(function () { const x = visibleOptions(el).filter(function (o) { return !before.has(o); }); return x.length ? x : null; }, 700);
      if (l) {
        const idx = bestOption(l.map(function (o) { return { text: optText(o), value: '' }; }), v, false);
        if (idx >= 0) { realClick(l[idx]); await settle(el.ownerDocument, 150, 900); ok = true; }
      }
    }
    return ok ? 'filled' : 'failed';
  }

  /* ---------------- rich text / aria widgets ---------------- */
  async function fillRich(el, v) {
    try { el.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
    let ok = false;
    try {
      const w = win(el), sel = w.getSelection(), r = el.ownerDocument.createRange();
      r.selectNodeContents(el); sel.removeAllRanges(); sel.addRange(r);
      ok = el.ownerDocument.execCommand('insertText', false, v);
    } catch (e) { /* ignore */ }
    if (!ok || !optText(el)) { el.textContent = v; fire(el, 'input'); }
    fire(el, 'change');
    el.dispatchEvent(new (win(el).Event)('blur', { bubbles: true }));
    return optText(el) ? 'filled' : 'failed';
  }
  function isChecked(el) {
    return el.tagName === 'INPUT' ? !!el.checked : el.getAttribute('aria-checked') === 'true';
  }

  const OTHER_OK = /_(institute|board|subject|group|exam)$|^exp_type$/;

  /* ---------------- native <select> (also hidden selects behind Select2 / Chosen / bootstrap-select...) ---------------- */
  async function fillSelect(it, opts) {
    const el = it.el, d = it.desc, v = String(it.value);
    if (isDisabled(el)) return 'disabled';
    await waitOptions(el);
    const options = Array.prototype.map.call(el.options, function (o) { return { text: o.text.trim(), value: o.value }; });
    let idx = bestOption(options, v, false);
    if (idx < 0 && opts.aiPick && options.length > 1) {
      const texts = options.map(function (o) { return o.text; });
      const k = await opts.aiPick(v, d.label, texts.slice(0, 150));
      if (typeof k === 'number' && k >= 0 && k < options.length && !isPlaceholderOpt(options[k])) { idx = k; if (opts.onLearn) opts.onLearn(v, options[k].text); }
    }
    if (idx < 0) idx = bestOption(options, v, OTHER_OK.test(it.key || ''));
    if (idx < 0) return 'nomatch';
    const was = el.selectedIndex;
    if (was !== idx || d.mirror) {
      setNative(el, el.options[idx].value);
      if (el.selectedIndex !== idx) el.selectedIndex = idx;
      fire(el, 'input');
      fire(el, 'change');
      el.dispatchEvent(new (win(el).Event)('chosen:updated', { bubbles: true }));
      el.dispatchEvent(new (win(el).Event)('refresh', { bubbles: true }));
      await settle(el.ownerDocument, 200, 1800);       // dependent dropdowns (district -> upazila) load here
    }
    // widget wrapper (Select2 / Chosen ...) must show the new value too; if not, drive the visible widget
    if (d.wrapper) {
      const shownTxt = M.norm(optText(d.wrapper)), want = M.norm(options[idx].text);
      if (want && shownTxt.indexOf(want) < 0) {
        const trig = d.wrapper.querySelector(JAF.CUSTOM_TRIGGERS) || d.wrapper;
        const r = await fillCombo({ el: trig, desc: Object.assign({}, d, { kind: 'combobox' }), key: it.key, value: options[idx].text }, opts);
        return r === 'nomatch' ? 'failed' : 'filled';
      }
    }
    return was === idx && !d.mirror ? 'kept' : 'filled';
  }

  /* it: {el, desc, key, value}. returns 'filled' | 'kept' | 'disabled' | 'nomatch' | 'failed' */
  async function fill(it, opts) {
    const el = it.el, d = it.desc;
    opts = opts || {};
    try {
      switch (d.kind) {
        case 'combobox': return await fillCombo(it, opts);
        case 'select': return await fillSelect(it, opts);
        case 'richtext': {
          if (!opts.overwrite && optText(el)) return 'kept';
          return await fillRich(el, String(it.value));
        }
        case 'checkbox': {
          if (isDisabled(el)) return 'disabled';
          const want = it.value === true || /^(yes|true|1|y)$/i.test(String(it.value));
          if (want && !isChecked(el)) { realClick(clickTarget(el)); if (el.tagName === 'INPUT' && !el.checked) el.click(); await settle(el.ownerDocument, 150, 1200); return 'filled'; }
          return 'kept';
        }
        case 'radio': case 'radiogroup': {
          const idx = bestOption(d.optionTexts, String(it.value));
          if (idx < 0) return 'nomatch';
          const r = d.radios[idx];
          if (isDisabled(r)) return 'disabled';
          const on = r.tagName === 'INPUT' ? r.checked : r.getAttribute('aria-checked') === 'true';
          if (on) return 'kept';
          realClick(clickTarget(r));
          if (r.tagName === 'INPUT' && !r.checked) r.click();
          await settle(r.ownerDocument, 120, 1000);
          return 'filled';
        }
        default: return await fillTextEl(it, opts);
      }
    } catch (e) {
      return 'failed';
    }
  }

  /* is the control still empty? (used by the multi-step watcher) */
  function isEmpty(it) {
    const el = it.el, d = it.desc;
    switch (d.kind) {
      case 'checkbox': return !isChecked(el);
      case 'radio': return !d.radios.some(function (r) { return r.checked; });
      case 'radiogroup': return !d.radios.some(function (r) { return r.getAttribute('aria-checked') === 'true'; });
      case 'select': { const o = el.options[el.selectedIndex]; return !o || isPlaceholderOpt({ text: o.text.trim(), value: o.value }); }
      case 'combobox': { const t = (el.tagName === 'INPUT' ? el.value : optText(el)).trim(); return !t || isPlaceholderOpt({ text: t, value: '' }); }
      case 'richtext': return !optText(el);
      default: return String(el.value).trim() === '';
    }
  }

  /* find an "ADD MORE" style button near an element (used for repeating experience blocks) */
  function findAddMore(anchor) {
    let node = anchor;
    const re = /^\+?\s*add\s*(more|another|new|experience|row|entry)?\s*\+?$/i;
    for (let d = 0; d < 8 && node; d++) {
      const cands = node.querySelectorAll('button,a,[role="button"],span,div,i,label,input[type=button]');
      for (let i = 0; i < cands.length; i++) {
        const c = cands[i];
        const t = ((c.value && c.tagName === 'INPUT') ? c.value : (c.innerText !== undefined ? c.innerText : c.textContent) || '').replace(/\s+/g, ' ').trim();
        if (t && t.length <= 25 && re.test(t.replace(/[^\w\s+]/g, '').trim() || t)) return c;
      }
      node = node.parentElement;
    }
    return null;
  }

  JAF.filler = { fill: fill, sleep: sleep, bestOption: bestOption, findAddMore: findAddMore, isDisabled: isDisabled, isEmpty: isEmpty, settle: settle };
})(typeof window !== 'undefined' ? window : this);
