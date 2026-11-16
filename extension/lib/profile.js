/* Profile storage + value resolution helpers. */
(function (g) {
  'use strict';
  const S = g.JAF_SCHEMA;

  const DEFAULT_SETTINGS = {
    geminiKey: '',
    model: S.DEFAULT_MODEL,
    aiMatch: true,      // use Gemini to match fields that the offline matcher is unsure about
    aiDocs: true,       // use Gemini to parse documents on import
    watchSteps: true,   // after a fill, offer to fill fields that appear later (multi-step forms)
    aiOptions: true,    // use Gemini to pick a dropdown option when the built-in dictionary has no match
    overwrite: false    // overwrite text fields that already have a value
  };

  function uid() { return 'p' + Math.random().toString(36).slice(2, 9); }

  function emptyData() { return { experience: [], extra: {} }; }

  /* ---------- storage ---------- */
  const store = {
    get: function (keys) { return new Promise(function (r) { chrome.storage.local.get(keys, r); }); },
    set: function (obj) { return new Promise(function (r) { chrome.storage.local.set(obj, r); }); },
    remove: function (keys) { return new Promise(function (r) { chrome.storage.local.remove(keys, r); }); }
  };

  async function loadAll() {
    const s = await store.get(['profiles', 'activeProfileId', 'settings', 'siteRules']);
    let profiles = s.profiles || {};
    let active = s.activeProfileId;
    if (!Object.keys(profiles).length) {
      const id = uid();
      profiles[id] = { id: id, name: 'My profile', data: emptyData() };
      active = id;
      await store.set({ profiles: profiles, activeProfileId: active });
    }
    if (!active || !profiles[active]) active = Object.keys(profiles)[0];
    return {
      profiles: profiles,
      activeProfileId: active,
      settings: Object.assign({}, DEFAULT_SETTINGS, s.settings || {}),
      siteRules: s.siteRules || {}
    };
  }

  /* ---------- dates ---------- */
  function pad(n) { return String(n).padStart(2, '0'); }
  function toISODate(str) {
    if (str === null || str === undefined) return '';
    str = String(str).trim();
    if (!str) return '';
    let m;
    if ((m = str.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/))) return m[1] + '-' + pad(m[2]) + '-' + pad(m[3]);
    if ((m = str.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/))) {
      let d = +m[1], mo = +m[2];
      if (mo > 12 && d <= 12) { const t = d; d = mo; mo = t; }   // MM/DD given
      return m[3] + '-' + pad(mo) + '-' + pad(d);
    }
    const t = Date.parse(str);
    if (!isNaN(t)) { const x = new Date(t); return x.getFullYear() + '-' + pad(x.getMonth() + 1) + '-' + pad(x.getDate()); }
    return '';
  }

  /* format ISO date for a text input using its placeholder as a hint */
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function formatDateForText(iso, hint) {
    const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return iso;
    const ph = String(hint || '').toLowerCase();
    // find the d / m / y tokens in the hint, e.g. "dd-mm-yyyy", "MM/DD/YY", "dd MMM yyyy"
    const toks = [];
    ['d+', 'm+', 'y+'].forEach(function (re) {
      const r = ph.match(new RegExp('(^|[^a-z])(' + re + ')(?![a-z])'));
      if (r) toks.push({ at: ph.indexOf(r[2], r.index), t: r[2] });
    });
    if (toks.length < 3) {
      const sep0 = (ph.match(/[\/\-.]/) || ['/'])[0];
      return [m[3], m[2], m[1]].join(sep0);
    }
    toks.sort(function (a, b) { return a.at - b.at; });
    const sep = (ph.slice(toks[0].at + toks[0].t.length).match(/[^a-z]+/) || [' '])[0].trim() || ' ';
    const parts = toks.map(function (k) {
      if (k.t[0] === 'd') return k.t.length > 1 ? m[3] : String(+m[3]);
      if (k.t[0] === 'm') return k.t.length >= 3 ? MON[+m[2] - 1] : k.t.length === 2 ? m[2] : String(+m[2]);
      return k.t.length === 2 ? m[1].slice(2) : m[1];
    });
    return parts.join(sep);
  }

  /* ---------- keys / values ---------- */
  function str(v) { return v === null || v === undefined ? '' : String(v).trim(); }

  function sectionHasData(data, sec) {
    if (sec === 'exp') return (data.experience || []).some(function (e) { return e && (e.org || e.designation); });
    return Object.keys(data).some(function (k) { return k.indexOf(sec + '_') === 0 && str(data[k]); });
  }

  function isSameAddress(data) {
    if (data.same_address === true || data.same_address === 'true' || /^(yes|y|1)$/i.test(str(data.same_address))) return true;
    if (data.same_address === false || data.same_address === 'false' || /^(no|n|0)$/i.test(str(data.same_address))) return false;
    return !sectionHasData(data, 'permanent');
  }

  /* ctx: {expIndex} */
  function resolveValue(data, key, ctx) {
    data = data || {};
    ctx = ctx || {};
    if (!key) return '';
    if (key.indexOf('extra:') === 0) return str((data.extra || {})[key.slice(6)]);
    if (key.indexOf('applicable_') === 0) return sectionHasData(data, key.slice(11));
    if (key.indexOf('exp_') === 0) {
      const e = (data.experience || [])[ctx.expIndex || 0];
      if (!e) return '';
      const prop = key.slice(4);
      if (prop === 'current') return e.current === true || /^(yes|true|1|y)$/i.test(str(e.current));
      const v = str(e[prop]);
      return (prop === 'from' || prop === 'to') ? (toISODate(v) || v) : v;
    }
    switch (key) {
      case 'has_nid': return str(data.nid) ? 'Yes' : 'No';
      case 'has_birth_reg': return str(data.birth_reg) ? 'Yes' : 'No';
      case 'has_passport': return str(data.passport) ? 'Yes' : 'No';
      case 'mobile_confirm': return str(data.mobile);
      case 'email_confirm': return str(data.email);
      case 'same_address': return isSameAddress(data);
      case 'dob': return toISODate(data.dob) || str(data.dob);
      case 'dob_day': { const m = toISODate(data.dob).match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? String(+m[3]) : ''; }
      case 'dob_month': { const m = toISODate(data.dob).match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? String(+m[2]) : ''; }
      case 'dob_year': { const m = toISODate(data.dob).match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? m[1] : ''; }
    }
    if (key.indexOf('permanent_') === 0) {
      const v = str(data[key]);
      if (v) return v;
      return isSameAddress(data) ? str(data['present_' + key.slice(10)]) : '';
    }
    return str(data[key]);
  }

  /* set one key on a data object (used by import) */
  function setByKey(data, key, value) {
    value = str(value);
    let m;
    if ((m = key.match(/^exp_(\d+)_(\w+)$/))) {
      const idx = +m[1] - 1, prop = m[2];
      data.experience = data.experience || [];
      while (data.experience.length <= idx) data.experience.push({});
      data.experience[idx][prop] = (prop === 'current') ? /^(yes|true|1|y)$/i.test(value) : value;
      return;
    }
    if (key.indexOf('extra:') === 0) { data.extra = data.extra || {}; data.extra[key.slice(6)] = value; return; }
    if (key === 'same_address') { data.same_address = /^(yes|true|1|y)$/i.test(value); return; }
    if (S.byKey[key]) {
      data[key] = (key === 'dob') ? (toISODate(value) || value) : value;
      return;
    }
    data.extra = data.extra || {};
    data.extra[key] = value;
  }

  function cleanExperience(list) {
    return (list || []).filter(function (e) { return e && Object.keys(e).some(function (k) { return k !== 'current' && str(e[k]); }); });
  }

  /* flatten for CSV export: [[key, value], ...] */
  function toRows(data) {
    const rows = [];
    S.fields.forEach(function (f) {
      if (f.repeat || f.derived) return;
      const v = data[f.key];
      if (v !== undefined && v !== '' && v !== null) rows.push([f.key, f.type === 'bool' ? (v ? 'yes' : 'no') : v]);
    });
    cleanExperience(data.experience).forEach(function (e, i) {
      S.EXP_PROPS.forEach(function (p) {
        const v = e[p.prop];
        if (v !== undefined && v !== '' && v !== false) rows.push(['exp_' + (i + 1) + '_' + p.prop, v === true ? 'yes' : v]);
      });
    });
    Object.keys(data.extra || {}).forEach(function (k) { rows.push([k, data.extra[k]]); });
    return rows;
  }

  function completeness(data) {
    const core = S.fields.filter(function (f) { return !f.repeat && !f.derived && ['permanent', 'misc', 'masters', 'jsc'].indexOf(f.group) < 0 && ['driving_license', 'license_validity', 'blood_group', 'passport'].indexOf(f.key) < 0; });
    const filled = core.filter(function (f) { return str(data[f.key]); }).length;
    return { filled: filled, total: core.length };
  }

  g.JAFProfile = {
    DEFAULT_SETTINGS: DEFAULT_SETTINGS, store: store, uid: uid, emptyData: emptyData, loadAll: loadAll,
    toISODate: toISODate, formatDateForText: formatDateForText,
    resolveValue: resolveValue, setByKey: setByKey, sectionHasData: sectionHasData, cleanExperience: cleanExperience,
    toRows: toRows, completeness: completeness, str: str
  };
})(typeof self !== 'undefined' ? self : this);
