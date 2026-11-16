/* Pure (DOM-free) label -> profile-key matcher. Works offline. */
(function (g) {
  'use strict';
  const S = g.JAF_SCHEMA;
  const BN_DIGITS = '০১২৩৪৫৬৭৮৯';

  function norm(s) {
    if (s === null || s === undefined) return '';
    s = String(s).normalize('NFC')
      .replace(/([a-z])([A-Z])/g, '$1 $2')            // camelCase -> words
      .replace(/[০-৯]/g, function (c) { return String(BN_DIGITS.indexOf(c)); })
      .toLowerCase()
      .replace(/['’‘`]/g, '')                          // father's -> fathers
      .replace(/[^\p{L}\p{N}\p{M}]+/gu, ' ')
      .trim();
    return s;
  }

  function has(hay, needle) {
    return !!needle && (' ' + hay + ' ').indexOf(' ' + needle + ' ') >= 0;
  }

  function sectionFromText(text) {
    if (!text) return null;
    for (let i = 0; i < S.SECTION_ORDER.length; i++) {
      const k = S.SECTION_ORDER[i];
      if (S.SECTIONS[k].re.test(text)) return k;
    }
    return null;
  }

  /* Explicit markers win ("(ইংরেজি)" / "(English)" => en, "(বাংলায়)" / "(Bangla)" => bn);
   otherwise a Bengali-script label is assumed to ask for Bangla text. */
  function langOf(label) {
    label = label || '';
    if (/ইংরেজি|ইংরাজি|\benglish\b|\bcapital\b|বড় (অক্ষর|হাতের)|block letter/i.test(label)) return 'en';
    if (/বাংলা(?!দেশ)|\b(bangla|bengali|bangali)\b/i.test(label)) return 'bn';
    return /[ঀ-৿]/.test(label) ? 'bn' : 'en';
  }

  function termsOf(e) {
    if (!e._n) e._n = e.terms.map(norm).filter(Boolean);
    return e._n;
  }

  function scoreEntry(e, d) {
    if (e.elTypes && d.kind && e.elTypes.indexOf(d.kind === 'combobox' ? 'select' : d.kind === 'radiogroup' ? 'radio' : d.kind === 'richtext' ? 'textarea' : d.kind) < 0) return -Infinity;
    const fieldBn = d.lang === 'bn';
    if (e.lang === 'bn' && !fieldBn) return -Infinity;
    if (e.lang === 'en' && fieldBn) return -Infinity;
    const L = d._label, A = d._attrs;
    if (e.not) {
      for (let i = 0; i < e.not.length; i++) if (has(L, norm(e.not[i]))) return -Infinity;
    }
    let ts = termsOf(e);
    if (fieldBn && e.like) ts = ts.concat(termsOf(S.byKey[e.like]));

    let base = 0;
    if (L) {
      for (let i = 0; i < ts.length; i++) {
        const t = ts[i];
        if (L === t) base = Math.max(base, 200);
        else if (has(L, t)) base = Math.max(base, 100 + t.length);
      }
    }
    if (!base && A) {
      for (let i = 0; i < ts.length; i++) {
        const t = ts[i];
        if (t.length >= 4 && has(A, t)) base = Math.max(base, 60 + Math.min(t.length, 20) / 2);
      }
    }
    if (!base && e.typeHint && d.type === e.typeHint) base = 90;
    if (!base) return -Infinity;

    if (!e.anySection) {
      if (e.section === 'global') {
        if (d.section) return -Infinity;
      } else if (d.section === e.section) {
        base += 40;
      } else {
        return -Infinity;
      }
    }
    return base;
  }

  function prepare(d) {
    d._label = norm(d.label);
    d._attrs = norm(d.attrs);
    if (!d.lang) d.lang = langOf(d.label);
    return d;
  }

  /* d: {label, attrs, section, kind, type, lang, followSection}
   * returns [{key, score}] best first (score >= 60 only) */
  function matchField(d) {
    prepare(d);
    if (d.kind === 'checkbox' && /^(if )?applicable$/.test(d._label)) {
      const sec = d.followSection || d.section;
      if (sec && ['masters', 'honors', 'exp'].indexOf(sec) >= 0) return [{ key: 'applicable_' + sec, score: 150 }];
    }
    const out = [];
    for (let i = 0; i < S.fields.length; i++) {
      const sc = scoreEntry(S.fields[i], d);
      if (sc >= 60) out.push({ key: S.fields[i].key, score: sc });
    }
    out.sort(function (a, b) { return b.score - a.score; });
    return out.slice(0, 3);
  }

  /* Match against user's custom "extra" keys */
  function matchExtra(d, extra) {
    prepare(d);
    if (!extra || !d._label) return null;
    const keys = Object.keys(extra);
    for (let i = 0; i < keys.length; i++) {
      const k = norm(keys[i]);
      if (k && (k === d._label || has(d._label, k) && k.length >= 4)) return 'extra:' + keys[i];
    }
    return null;
  }

  /* Label-only matching (CSV headers, text documents) */
  function matchLabel(label, ctxSection, kind) {
    const d = { label: label, attrs: '', section: sectionFromText(label) || ctxSection || null, kind: kind || 'input', type: 'text' };
    const r = matchField(d);
    return r.length ? r[0] : null;
  }

  g.JAFMatcher = { norm: norm, has: has, sectionFromText: sectionFromText, langOf: langOf, matchField: matchField, matchExtra: matchExtra, matchLabel: matchLabel };
})(typeof self !== 'undefined' ? self : this);
