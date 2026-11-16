/* Finds form controls on the page and builds a descriptor (label, section, options...) for each.
 * Understands native controls AND the common custom widgets (react-select, Select2, Chosen, Ant, MUI, Material,
 * Choices, Tom Select, bootstrap-select, role=combobox/radiogroup/switch, contenteditable editors). */
(function (g) {
  'use strict';
  const JAF = g.JAF = g.JAF || {};
  const M = g.JAFMatcher;

  const SKIP_TYPES = /^(hidden|submit|button|reset|image|file|password|range|color)$/i;

  /* custom dropdown triggers that don't declare an ARIA role */
  const CUSTOM_TRIGGERS = [
    '.select2-selection', '[class*="select__control"]', '.ant-select', 'mat-select', '.mat-mdc-select', '.mat-select',
    '.chosen-single', '.chosen-choices', '.choices__inner', '.ts-control', '.v-select .v-field', '.p-dropdown', '.p-select',
    '.bootstrap-select > button', '.nice-select', '.selectize-input', '.vs__dropdown-toggle', '.el-select .el-input',
    '.multiselect__tags', '.rc-select-selector', '.MuiSelect-select', '.SumoSelect > .CaptionCont', '.ms-choice',
    '[class*="-control"][class*="css-"]', '[data-toggle="dropdown"]', '[data-bs-toggle="dropdown"]'
  ].join(',');
  const WIDGET_WRAPPERS = '.select2-container,.chosen-container,.bootstrap-select,.nice-select,.selectize-control,.ts-wrapper,.choices,.multiselect,.ms-parent,.SumoSelect';
  const ALL_SELECTOR = 'input,select,textarea,[role="combobox"]:not(input):not(select),[aria-haspopup="listbox"]:not(input):not(select),' +
    '[role="radiogroup"],[role="switch"]:not(input),[role="checkbox"]:not(input),[contenteditable=""],[contenteditable="true"],' + CUSTOM_TRIGGERS;

  function textOf(n) {
    const t = (n.innerText !== undefined ? n.innerText : n.textContent) || '';
    return t.replace(/\s+/g, ' ').trim();
  }
  function hasControl(n) {
    if (n.nodeType !== 1) return false;
    const sel = 'input,select,textarea,[role="combobox"],[aria-haspopup="listbox"],[role="radiogroup"]';
    if (n.matches && n.matches(sel)) return true;
    return !!(n.querySelector && n.querySelector(sel));
  }
  function cleanLabel(t) {
    return String(t || '').replace(/\s+/g, ' ').replace(/[*:]+\s*$/, '').replace(/^[\[\(]+|[\]\)]+$/g, '').replace(/[*:]+\s*$/, '').trim();
  }

  function shownEl(el) {
    if (g.__JAF_TEST__) return !(el.style && el.style.display === 'none') && !el.closest('[hidden]');
    if (el.getClientRects().length === 0) return false;
    const cs = el.ownerDocument.defaultView.getComputedStyle(el);
    return cs.visibility !== 'hidden';
  }
  function visible(el) {
    if (el.type === 'hidden') return false;
    if (shownEl(el)) return true;
    // styled radios / checkboxes: the input is hidden but its label is what users click
    if (/^(checkbox|radio)$/i.test(el.type || '') && el.labels && el.labels[0] && shownEl(el.labels[0])) return true;
    return false;
  }

  function labelTextNoControls(label) {
    const c = label.cloneNode(true);
    c.querySelectorAll('input,select,textarea,option').forEach(function (x) { x.remove(); });
    return textOf(c);
  }

  /* nearest text-only element to the left / above the control (table cells, divs, spans) */
  function leftText(el) {
    let node = el;
    for (let lvl = 0; lvl < 4 && node && node.parentElement; lvl++) {
      let sib = node.previousElementSibling, hops = 0;
      while (sib && hops < 4) {
        if (!hasControl(sib)) {
          const t = textOf(sib);
          if (t && t.length <= 100) return t;
        }
        sib = sib.previousElementSibling; hops++;
      }
      node = node.parentElement;
      if (node.matches('form,fieldset,body,table,tbody,section')) break;
    }
    return '';
  }

  function labelFor(el) {
    if (el.labels && el.labels.length) {
      const t = Array.prototype.map.call(el.labels, labelTextNoControls).join(' ').trim();
      if (t) return cleanLabel(t);
    }
    const aria = el.getAttribute('aria-label');
    if (aria) return cleanLabel(aria);
    const lb = el.getAttribute('aria-labelledby');
    if (lb) {
      const t = lb.split(/\s+/).map(function (id) { const n = el.ownerDocument.getElementById(id); return n ? textOf(n) : ''; }).join(' ').trim();
      if (t) return cleanLabel(t);
    }
    const lt = leftText(el);
    if (lt) return cleanLabel(lt);
    // floating labels: <input><label>Name</label>
    const nx = el.nextElementSibling;
    if (nx && /^(LABEL|SPAN|LEGEND|P|DIV)$/.test(nx.tagName) && !hasControl(nx)) {
      const t = textOf(nx);
      if (t && t.length < 80) return cleanLabel(t);
    }
    return cleanLabel(el.getAttribute('placeholder') || el.getAttribute('title') || el.getAttribute('data-label') || '');
  }

  /* is this element a section heading? returns its text or '' */
  function headingText(e) {
    if (!e || e.nodeType !== 1) return '';
    if (/^(H[1-6]|LEGEND|CAPTION)$/.test(e.tagName)) return textOf(e);
    if (hasControl(e)) return '';
    const t = textOf(e);
    if (!t || t.length > 90) return '';
    return M.sectionFromText(t) ? t : '';
  }

  const EDU_CTX = /qualification|শিক্ষাগত|যোগ্যতা|academic|education|শিক্ষা/i;
  function eduHintOf(el) {
    let node = el;
    for (let d = 0; d < 12 && node && node !== node.ownerDocument.body; d++) {
      let sib = node.previousElementSibling, k = 0;
      while (sib && k < 3) {
        if (/^(H[1-6]|LEGEND)$/.test(sib.tagName) || (!hasControl(sib) && textOf(sib).length < 60)) { if (EDU_CTX.test(textOf(sib))) return true; }
        sib = sib.previousElementSibling; k++;
      }
      node = node.parentElement;
    }
    return false;
  }

  function sectionOf(el) {
    let node = el;
    for (let d = 0; d < 12 && node && node !== node.ownerDocument.body; d++) {
      let sib = node.previousElementSibling, k = 0;
      while (sib && k < 3) {
        const t = headingText(sib);
        const s = M.sectionFromText(t);
        if (s) return s;
        sib = sib.previousElementSibling; k++;
      }
      const parent = node.parentElement;
      if (parent) {
        const first = parent.firstElementChild;
        if (first && first !== node) {
          const s = M.sectionFromText(headingText(first));
          if (s) return s;
        }
      }
      node = parent;
    }
    return null;
  }

  /* first section heading that appears AFTER the element in document order (for "If applicable" checkboxes) */
  function followingSection(el) {
    const doc = el.ownerDocument;
    const cands = doc.querySelectorAll('legend,h1,h2,h3,h4,h5,h6,div,span,p,label');
    let n = 0;
    for (let i = 0; i < cands.length; i++) {
      const c = cands[i];
      if (c === el || c.contains(el) || el.contains(c)) continue;
      if (!(el.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING)) continue;
      if (++n > 400) break;
      const s = M.sectionFromText(headingText(c));
      if (s) return s;
    }
    return null;
  }

  function attrText(el) {
    return [el.getAttribute('name'), el.id, el.getAttribute('placeholder'), el.getAttribute('autocomplete') !== 'off' && el.getAttribute('autocomplete'),
      el.getAttribute('title'), el.getAttribute('formcontrolname'), el.getAttribute('ng-model'), el.getAttribute('data-field')]
      .filter(Boolean).join(' ');
  }

  function collect(root, out, depth) {
    if (depth > 4) return;
    root.querySelectorAll(ALL_SELECTOR).forEach(function (el) { if (out.indexOf(el) < 0) out.push(el); });
    root.querySelectorAll('*').forEach(function (n) {
      if (n.shadowRoot) collect(n.shadowRoot, out, depth + 1);
      if (n.tagName === 'IFRAME') {
        try { if (n.contentDocument) collect(n.contentDocument, out, depth + 1); } catch (e) { /* cross-origin */ }
      }
    });
  }

  function widgetWrapperOf(sel) {
    const p = sel.parentElement;
    if (sel.nextElementSibling && sel.nextElementSibling.matches(WIDGET_WRAPPERS)) return sel.nextElementSibling;
    if (p && p.matches(WIDGET_WRAPPERS)) return p;
    if (sel.previousElementSibling && sel.previousElementSibling.matches(WIDGET_WRAPPERS)) return sel.previousElementSibling;
    return null;
  }

  function sigOf(d) {
    return [d.section || '', M.norm(d.label) || M.norm(d.attrs), d.kind, d.type, d.name || ''].join('|');
  }

  JAF.scan = function () {
    const els = [];
    collect(document, els, 0);

    // hidden native <select>s that sit behind a Select2 / Chosen / bootstrap-select ... wrapper: fill the real select
    const mirror = new Map();
    els.forEach(function (el) {
      if (el.tagName === 'SELECT' && !shownEl(el) && el.getAttribute('aria-hidden') !== 'true') {
        const w = widgetWrapperOf(el);
        if (w) mirror.set(el, w);
      }
    });
    const mirroredWrappers = Array.from(mirror.values());
    const comboSeen = [];
    const seenRadio = {};
    const out = [];

    els.forEach(function (el) {
      const tag = el.tagName;
      const role = el.getAttribute('role');
      const type = (el.getAttribute('type') || (tag === 'INPUT' ? 'text' : '')).toLowerCase();
      const isNative = tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA';
      if (tag === 'INPUT' && SKIP_TYPES.test(type)) return;
      if (isNative && el.getAttribute('aria-hidden') === 'true' && el.getAttribute('tabindex') === '-1') return;
      if ((tag === 'INPUT' || tag === 'TEXTAREA') && el.closest('[role="listbox"],[cmdk-root],[data-radix-popper-content-wrapper],.select2-dropdown,.chosen-drop,.ant-select-dropdown')) return;
      const cb = el.closest('[role="combobox"]');
      if ((tag === 'INPUT' || tag === 'TEXTAREA') && cb && cb !== el) return;
      if (!isNative && mirroredWrappers.some(function (w) { return w.contains(el); })) return;   // the native select handles it
      if (!isNative && comboSeen.some(function (c) { return c.contains(el); })) return;           // nested part of a trigger already taken
      if (!mirror.has(el) && !visible(el)) return;

      const isRich = !isNative && el.getAttribute('contenteditable') !== null && role !== 'combobox';
      const isGroup = role === 'radiogroup';
      const isAriaCheck = !isNative && (role === 'switch' || role === 'checkbox');
      const isCombo = (!isNative && !isRich && !isGroup && !isAriaCheck) || (isNative && role === 'combobox');
      if (isRich && el.closest('[role="combobox"],[role="listbox"]')) return;
      if (isGroup && el.querySelector('input[type=radio]')) return;     // native radios handle themselves

      const kind = isGroup ? 'radiogroup' : isRich ? 'richtext' : isAriaCheck ? 'checkbox' : isCombo ? 'combobox'
        : tag === 'SELECT' ? 'select' : tag === 'TEXTAREA' ? 'textarea' : type === 'checkbox' ? 'checkbox' : type === 'radio' ? 'radio' : 'input';
      if (kind === 'combobox') comboSeen.push(el);

      const d = { el: el, tag: tag.toLowerCase(), type: type, kind: kind, name: el.getAttribute('name') || '' };

      if (kind === 'radio') {
        const gk = (el.form ? 'f' : '') + d.name;
        if (d.name && seenRadio[gk]) return;
        if (d.name) seenRadio[gk] = true;
        const scope = el.form || el.ownerDocument;
        d.radios = d.name ? Array.prototype.slice.call(scope.querySelectorAll('input[type=radio]')).filter(function (r) { return r.name === d.name; }) : [el];
        const fs = el.closest('fieldset');
        const lg = fs && fs.querySelector('legend');
        d.label = lg ? cleanLabel(textOf(lg)) : cleanLabel(leftText(el.closest('label') || el.parentElement || el));
        d.optionTexts = d.radios.map(function (r) {
          const l = r.labels && r.labels[0] ? labelTextNoControls(r.labels[0]) : (r.nextSibling && r.nextSibling.textContent || r.value);
          return { text: String(l || '').trim(), value: r.value };
        });
      } else if (kind === 'radiogroup') {
        d.radios = Array.prototype.slice.call(el.querySelectorAll('[role="radio"]'));
        if (!d.radios.length) return;
        d.optionTexts = d.radios.map(function (r) { return { text: textOf(r), value: r.getAttribute('data-value') || r.getAttribute('value') || '' }; });
        d.label = labelFor(el);
      } else {
        d.label = labelFor(el);
      }
      if (kind === 'select') {
        d.options = Array.prototype.map.call(el.options, function (o) { return { text: o.text.trim(), value: o.value }; });
        if (mirror.has(el)) { d.wrapper = mirror.get(el); d.mirror = true; }
      }
      d.attrs = attrText(el);
      d.lang = M.langOf(d.label);
      d.section = sectionOf(el) || M.sectionFromText(d.label);
      if (kind === 'checkbox') d.followSection = followingSection(el);
      d.eduHint = !d.section && eduHintOf(el);
      d.sig = sigOf(d);
      out.push(d);
    });
    return out;
  };

  JAF.CUSTOM_TRIGGERS = CUSTOM_TRIGGERS;
  JAF.util = { textOf: textOf, hasControl: hasControl, shownEl: shownEl };
})(typeof window !== 'undefined' ? window : this);
