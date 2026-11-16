/* Import helpers: CSV, JSON, DOCX, plain text -> "review items".
 * An item is {label, key, value, include, conf} where conf is 'high' | 'med' | 'none'. */
(function (g) {
  'use strict';
  const S = g.JAF_SCHEMA;
  const M = g.JAFMatcher;
  const P = g.JAFProfile;

  /* ---------------- CSV ---------------- */
  function parseCSV(text) {
    text = text.replace(/^﻿/, '');
    const first = text.split(/\r?\n/)[0] || '';
    const delim = [',', ';', '\t'].reduce(function (best, d) {
      return first.split(d).length > first.split(best).length ? d : best;
    }, ',');
    const rows = [];
    let row = [], cell = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
        else cell += c;
      } else if (c === '"') q = true;
      else if (c === delim) { row.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(cell); rows.push(row); row = []; cell = '';
      } else cell += c;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    return rows;
  }

  function toCSV(rows) {
    return rows.map(function (r) {
      return r.map(function (c) {
        c = c === null || c === undefined ? '' : String(c);
        return /[",\r\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c;
      }).join(',');
    }).join('\r\n');
  }

  /* ---------------- label -> key ---------------- */
  /* returns {key, conf} ; key may be 'exp_2_org', a schema key, or null */
  function mapLabel(label, ctxSection) {
    const raw = String(label || '').trim();
    if (!raw) return { key: null, conf: 'none' };
    const us = raw.toLowerCase().replace(/[\s\-]+/g, '_');

    // exact schema key / experience key
    if (S.byKey[us] && !S.byKey[us].repeat) return { key: us, conf: 'high' };
    let m = us.match(/^exp(?:erience)?_?(\d+)_(\w+)$/) || us.match(/^exp_(\w+?)_(\d+)$/);
    if (m) {
      const idx = /^\d+$/.test(m[1]) ? m[1] : m[2];
      const prop = /^\d+$/.test(m[1]) ? m[2] : m[1];
      const ent = S.byKey['exp_' + prop];
      if (ent) return { key: 'exp_' + idx + '_' + prop, conf: 'high' };
      const mm = M.matchLabel(prop.replace(/_/g, ' '), 'exp');
      if (mm && S.byKey[mm.key].repeat) return { key: 'exp_' + idx + '_' + S.byKey[mm.key].prop, conf: 'high' };
    }
    // "Organization 2" / "Designation 3"
    m = raw.match(/^(.+?)[\s_\-]*(\d+)$/);
    if (m) {
      const mm = M.matchLabel(m[1], 'exp');
      if (mm && S.byKey[mm.key].repeat && /exp|job|work|employ|org|company|design/i.test(raw)) return { key: 'exp_' + m[2] + '_' + S.byKey[mm.key].prop, conf: 'med' };
    }
    const r = M.matchLabel(raw, ctxSection);
    if (r && !S.byKey[r.key]) return { key: null, conf: 'none' };
    if (r) {
      const f = S.byKey[r.key];
      if (f.repeat) return { key: 'exp_1_' + f.prop, conf: 'med' };
      if (f.derived) return { key: null, conf: 'none' };
      return { key: r.key, conf: r.score >= 100 ? 'high' : 'med' };
    }
    // job-experience labels without a section hint (e.g. "Department", "Organization Business")
    const ex = M.matchLabel(raw, 'exp');
    if (ex && S.byKey[ex.key] && S.byKey[ex.key].repeat && ex.score >= 100) return { key: 'exp_1_' + S.byKey[ex.key].prop, conf: 'med' };
    return { key: null, conf: 'none' };
  }

  function item(label, value, mapped) {
    return { label: label, key: mapped.key, value: value, include: !!mapped.key || true, conf: mapped.conf };
  }

  function csvToItems(text) {
    const rows = parseCSV(text).filter(function (r) { return r.some(function (c) { return String(c).trim() !== ''; }); });
    if (!rows.length) return [];
    const header = rows[0].map(function (s) { return String(s).trim(); });
    const maxCols = Math.max.apply(null, rows.map(function (r) { return r.length; }));
    const kvHeader = header.length <= 3 && /^(field|key|label|item|property|attribute|name)s?$/i.test(header[0]) && /^(value|data|answer|info)s?$/i.test(header[1] || '');
    const kv = kvHeader || (maxCols <= 2 && rows.length >= 3);
    const out = [];
    if (kv) {
      let section = null;
      rows.slice(kvHeader ? 1 : 0).forEach(function (r) {
        const label = String(r[0] || '').trim(), value = String(r[1] || '').trim();
        if (!label) return;
        if (!value) { const s = M.sectionFromText(label); if (s) section = s; return; }
        out.push(item(label, value, mapLabel(label, section)));
      });
    } else {
      const vals = rows[1] || [];
      header.forEach(function (h, i) {
        const v = String(vals[i] === undefined ? '' : vals[i]).trim();
        if (h && v) out.push(item(h, v, mapLabel(h, null)));
      });
    }
    return out;
  }

  /* ---------------- JSON ---------------- */
  function jsonToItems(obj) {
    const out = [];
    const data = obj && obj.data && typeof obj.data === 'object' ? obj.data : obj;
    Object.keys(data || {}).forEach(function (k) {
      const v = data[k];
      if (k === 'experience' && Array.isArray(v)) {
        v.forEach(function (e, i) {
          Object.keys(e || {}).forEach(function (p) {
            if (e[p] !== '' && e[p] !== false && e[p] !== null) out.push({ label: 'exp_' + (i + 1) + '_' + p, key: 'exp_' + (i + 1) + '_' + p, value: e[p] === true ? 'yes' : String(e[p]), include: true, conf: 'high' });
          });
        });
      } else if (k === 'extra' && v && typeof v === 'object') {
        Object.keys(v).forEach(function (x) { out.push({ label: x, key: 'extra:' + x, value: String(v[x]), include: true, conf: 'high' }); });
      } else if (v !== '' && v !== null && typeof v !== 'object') {
        const m = mapLabel(k, null);
        out.push({ label: k, key: m.key || 'extra:' + k, value: String(v), include: true, conf: m.key ? m.conf : 'none' });
      }
    });
    return out;
  }

  /* AI result -> items */
  function aiToItems(r) {
    const out = [];
    const f = (r && r.fields) || {};
    Object.keys(f).forEach(function (k) {
      if (f[k] === null || f[k] === '' || typeof f[k] === 'object') return;
      if (S.byKey[k] && !S.byKey[k].repeat) out.push({ label: S.byKey[k].label, key: k, value: String(f[k]), include: true, conf: 'high', src: 'ai' });
      else out.push({ label: k, key: 'extra:' + k, value: String(f[k]), include: true, conf: 'none', src: 'ai' });
    });
    ((r && r.experience) || []).forEach(function (e, i) {
      Object.keys(e || {}).forEach(function (p) {
        if (e[p] === '' || e[p] === null || e[p] === false) return;
        if (!S.byKey['exp_' + p]) return;
        out.push({ label: 'Experience ' + (i + 1) + ' – ' + S.byKey['exp_' + p].label, key: 'exp_' + (i + 1) + '_' + p, value: e[p] === true ? 'yes' : String(e[p]), include: true, conf: 'high', src: 'ai' });
      });
    });
    const x = (r && r.extra) || {};
    Object.keys(x).forEach(function (k) {
      if (x[k] !== '' && x[k] !== null && typeof x[k] !== 'object') out.push({ label: k, key: 'extra:' + k, value: String(x[k]), include: true, conf: 'none', src: 'ai' });
    });
    return out;
  }

  /* ---------------- Plain text (no AI) ---------------- */
  function textToItems(text) {
    const out = [];
    const seen = {};
    function push(label, value, mapped) {
      if (mapped.key) { if (seen[mapped.key]) return; seen[mapped.key] = true; }
      out.push({ label: label, key: mapped.key, value: value, include: true, conf: mapped.conf });
    }
    let section = null;
    text.split(/\r?\n/).forEach(function (line) {
      line = line.replace(/^[\s•\-\*•]+/, '').trim();
      if (!line) return;
      const m = line.match(/^(.{2,60}?)\s*(?::|\t|\||=|–|—)\s*(.+)$/);
      if (!m) {
        const s = M.sectionFromText(line);
        if (s && line.length < 70) section = s;
        return;
      }
      const label = m[1].trim(), value = m[2].trim();
      const lsec = M.sectionFromText(label);
      if (lsec && !value) { section = lsec; return; }
      push(label, value, mapLabel(label, section));
    });
    // generic patterns
    const email = text.match(/[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/);
    if (email && !seen.email) { seen.email = true; out.push({ label: 'Email (found in text)', key: 'email', value: email[0], include: true, conf: 'med' }); }
    const phone = text.replace(/[\s\-]/g, '').match(/(?:\+?88)?01[3-9]\d{8}/);
    if (phone && !seen.mobile) { seen.mobile = true; out.push({ label: 'Mobile (found in text)', key: 'mobile', value: phone[0].replace(/^\+?88/, ''), include: true, conf: 'med' }); }
    return out;
  }

  /* ---------------- DOCX (zip + deflate, no libraries) ---------------- */
  async function inflateRaw(bytes) {
    const ds = new DecompressionStream('deflate-raw');
    const stream = new Blob([bytes]).stream().pipeThrough(ds);
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }
  async function docxToText(buf) {
    const dv = new DataView(buf), u8 = new Uint8Array(buf);
    let eocd = -1;
    for (let i = u8.length - 22; i >= Math.max(0, u8.length - 70000); i--) {
      if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error('Not a valid .docx file.');
    let p = dv.getUint32(eocd + 16, true);
    const count = dv.getUint16(eocd + 10, true);
    const dec = new TextDecoder();
    for (let n = 0; n < count; n++) {
      if (dv.getUint32(p, true) !== 0x02014b50) break;
      const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true);
      const nlen = dv.getUint16(p + 28, true), elen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true);
      const lho = dv.getUint32(p + 42, true);
      const name = dec.decode(u8.subarray(p + 46, p + 46 + nlen));
      p += 46 + nlen + elen + clen;
      if (name !== 'word/document.xml') continue;
      const ln = dv.getUint16(lho + 26, true), le = dv.getUint16(lho + 28, true);
      const start = lho + 30 + ln + le;
      const data = u8.subarray(start, start + csize);
      const xml = dec.decode(method === 8 ? await inflateRaw(data) : data);
      return xml
        .replace(/<w:tab\/>/g, '\t').replace(/<\/w:tc>/g, '\t').replace(/<\/w:p>/g, '\n').replace(/<w:br\/>/g, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&')
        .replace(/\t+\n/g, '\n');
    }
    throw new Error('Could not find document text inside the .docx.');
  }

  /* ---------------- apply ---------------- */
  function applyItems(data, items, overwrite) {
    let n = 0;
    items.forEach(function (it) {
      if (!it.include || !it.key || it.value === '' || it.value === null) return;
      if (!overwrite) {
        const cur = it.key.indexOf('extra:') === 0 ? (data.extra || {})[it.key.slice(6)] : data[it.key];
        if (cur && !/^exp_/.test(it.key)) return;
      }
      P.setByKey(data, it.key, it.value);
      n++;
    });
    data.experience = P.cleanExperience(data.experience);
    return n;
  }

  /* Blank template: every field the profile supports, with no data. Column 3 explains each key. */
  function csvTemplate() {
    const rows = [['field', 'value', 'what_it_is']];
    S.fields.forEach(function (f) {
      if (f.repeat || f.derived) return;
      const grp = S.GROUPS.filter(function (x) { return x.id === f.group; })[0];
      rows.push([f.key, '', (grp ? grp.title + ' - ' : '') + f.label + (f.type === 'date' ? ' (YYYY-MM-DD)' : f.type === 'bool' ? ' (yes/no)' : '')]);
    });
    for (let n = 1; n <= 2; n++) {
      S.EXP_PROPS.forEach(function (p) {
        rows.push(['exp_' + n + '_' + p.prop, '', 'Job Experience ' + n + ' - ' + p.label + (p.type === 'date' ? ' (YYYY-MM-DD)' : p.type === 'bool' ? ' (yes/no)' : '')]);
      });
    }
    return toCSV(rows);
  }

  g.JAFImport = {
    parseCSV: parseCSV, toCSV: toCSV, mapLabel: mapLabel, csvToItems: csvToItems, jsonToItems: jsonToItems,
    aiToItems: aiToItems, textToItems: textToItems, docxToText: docxToText, applyItems: applyItems, csvTemplate: csvTemplate
  };
})(typeof self !== 'undefined' ? self : this);
