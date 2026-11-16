/* Optional Gemini integration. The API key is supplied by the user and is only
 * ever used from the service worker / options page (never from page scripts). */
(function (g) {
  'use strict';
  const S = g.JAF_SCHEMA;
  const BASE = 'https://generativelanguage.googleapis.com/v1beta/models/';

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  async function call(opts) {
    if (!opts.key) throw new Error('No Gemini API key set.');
    const url = BASE + encodeURIComponent(opts.model || S.DEFAULT_MODEL) + ':generateContent';
    const body = {
      contents: [{ role: 'user', parts: opts.parts }],
      generationConfig: { temperature: 0, responseMimeType: 'application/json' }
    };
    if (opts.system) body.systemInstruction = { parts: [{ text: opts.system }] };

    for (let attempt = 0; attempt < 2; attempt++) {
      let res;
      try {
        res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': opts.key },
          body: JSON.stringify(body)
        });
      } catch (e) {
        throw new Error('Network error: could not reach Gemini.');
      }
      if (res.status === 429 && attempt === 0) { await sleep(2500); continue; }
      if (!res.ok) {
        let msg = '';
        try { msg = (await res.json()).error.message || ''; } catch (e) { /* ignore */ }
        if (res.status === 400 && /api key/i.test(msg)) throw new Error('Invalid Gemini API key.');
        if (res.status === 401 || res.status === 403) throw new Error('Gemini rejected the API key (' + res.status + '). ' + msg);
        if (res.status === 404) throw new Error('Model not found. Check the model name in Settings. ' + msg);
        if (res.status === 429) throw new Error('Gemini rate limit / quota exceeded. Try again later.');
        throw new Error('Gemini error ' + res.status + '. ' + msg);
      }
      const j = await res.json();
      const text = ((j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts) || [])
        .map(function (p) { return p.text || ''; }).join('');
      if (!text) throw new Error('Gemini returned an empty answer (it may have been blocked).');
      return text;
    }
    throw new Error('Gemini request failed.');
  }

  function parseJSON(t) {
    t = t.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    try { return JSON.parse(t); } catch (e) {
      const m = t.match(/[\{\[][\s\S]*[\}\]]/);
      if (m) return JSON.parse(m[0]);
      throw new Error('Gemini returned invalid JSON.');
    }
  }

  async function callJSON(opts) {
    try { return parseJSON(await call(opts)); }
    catch (e) {
      if (/invalid JSON/.test(e.message)) return parseJSON(await call(opts)); // one retry
      throw e;
    }
  }

  function keyList() {
    return S.fields.filter(function (f) { return !f.derived; }).map(function (f) {
      return f.key + ' — ' + f.label + (f.type === 'date' ? ' (YYYY-MM-DD)' : '');
    }).join('\n');
  }

  /* Extract a profile from document text and/or an inline file (pdf/image) */
  async function extractProfile(o) {
    const system =
      'You extract job-application profile data from a CV / personal-details document.\n' +
      'Return ONLY a JSON object: {"fields": {<key>: <string>}, "experience": [{"type","org","designation","address","from","to","current","description"}], "extra": {<label>: <string>}}.\n' +
      'Rules:\n- Use ONLY these keys inside "fields" (omit keys with no information; NEVER guess or invent values):\n' + keyList() + '\n' +
      '- Dates as YYYY-MM-DD. "current" is true/false. Experience dates likewise.\n' +
      '- English names exactly as written; Bangla names in Bangla script.\n' +
      '- Education: ssc_*, hsc_*, honors_* (bachelor / graduation), masters_*. Result like "5.00" or "3.75"; result_type like "GPA(out of 5)" when the scale is clear.\n' +
      '- Gender/religion/marital status as a single capitalised word (Male, Female, Islam, Single...).\n' +
      '- Anything useful that does not fit a key (skills, languages, hobbies, links, etc.) goes in "extra" with a short English label as the key.\n' +
      '- If the same data appears several times, keep the most complete one.';
    const parts = [];
    if (o.inline) parts.push({ inline_data: { mime_type: o.inline.mime, data: o.inline.base64 } });
    if (o.text) parts.push({ text: 'DOCUMENT TEXT:\n' + o.text.slice(0, 60000) });
    parts.push({ text: 'Extract the profile JSON now.' });
    const r = await callJSON({ key: o.key, model: o.model, system: system, parts: parts });
    return r;
  }

  /* Match unknown form fields to profile keys (no personal values are sent) */
  async function matchFields(o) {
    const system =
      'You map web-form fields to profile keys for a job-application auto-filler.\n' +
      'Return ONLY JSON: {"<fieldId>": "<profileKey or null>"}. Use null when no key fits. Consider the section (e.g. ssc/hsc/honors/masters/present/permanent/exp) when choosing between similar keys.\n' +
      'Available keys:\n' + keyList() + '\n' +
      'For repeating job-experience fields use exp_type, exp_org, exp_designation, exp_address, exp_from, exp_to, exp_current, exp_description.\n' +
      'Derived keys also allowed: has_nid, has_birth_reg, has_passport (yes/no selects), mobile_confirm, email_confirm, same_address.\n' +
      'If the page is a form that adds ONE education qualification at a time (a level / degree / year / result / institution form without SSC/HSC headings), map its fields to the generic keys ' +
      'edu_level, edu_exam, edu_board, edu_institute, edu_roll, edu_reg, edu_group, edu_subject, edu_result_type, edu_result, edu_year, edu_duration instead of the ssc_/hsc_ keys.\n' +
      'The labels may be Bangla or English. Use the page context (title / headings) to understand what the form is for.';
    const r = await callJSON({
      key: o.key, model: o.model, system: system,
      parts: [{ text: 'PAGE CONTEXT:\n' + JSON.stringify(o.context || {}) + '\nFORM FIELDS:\n' + JSON.stringify(o.fields) }]
    });
    const out = {};
    const valid = {};
    S.fields.forEach(function (f) { valid[f.key] = true; });
    S.VIRTUAL_KEYS.forEach(function (f) { valid[f.key] = true; });
    Object.keys(r || {}).forEach(function (id) {
      const k = r[id];
      if (typeof k === 'string' && valid[k]) out[id] = k;
    });
    return out;
  }

  /* which dropdown option means the same as `value`? returns index or -1 */
  async function pickOption(o) {
    const system = 'You choose the dropdown option that means the same thing as a given value (the option list may be in Bangla or English; names of places may be spelled differently). Return ONLY JSON {"index": <0-based index>} or {"index": -1} if nothing clearly matches. Never guess between different places or categories.';
    const r = await callJSON({ key: o.key, model: o.model, system: system, parts: [{ text: JSON.stringify({ field: o.label || '', value: o.value, options: o.options }) }] });
    const i = r && typeof r.index === 'number' ? Math.floor(r.index) : -1;
    return i >= 0 && i < o.options.length ? i : -1;
  }

  async function test(key, model) {
    const r = await call({ key: key, model: model, parts: [{ text: 'Reply with JSON {"ok":true}' }] });
    return /ok/i.test(r);
  }

  g.JAFGemini = { call: call, extractProfile: extractProfile, matchFields: matchFields, pickOption: pickOption, test: test };
})(typeof self !== 'undefined' ? self : this);
