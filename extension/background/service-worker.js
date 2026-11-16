importScripts('../data/schema.js', '../lib/profile.js', '../lib/gemini.js');

const CONTENT_FILES = [
  'data/schema.js', 'lib/matcher.js', 'data/translate.js', 'lib/profile.js',
  'content/scanner.js', 'content/filler.js', 'content/overlay.js', 'content/content.js'
];

/* inject into the page and ALL its frames (iframes on other sites need the optional "all sites" permission), run, merge results */
async function injectAndRun(tabId, mode, overwrite, edu) {
  let allFrames = true;
  try {
    await chrome.scripting.executeScript({ target: { tabId: tabId, allFrames: true }, files: CONTENT_FILES });
  } catch (e) {
    allFrames = false;
    try { await chrome.scripting.executeScript({ target: { tabId: tabId }, files: CONTENT_FILES }); }
    catch (e2) { return { ok: false, error: 'Cannot run on this page (browser pages, the Web Store and PDF viewers are blocked).' }; }
  }
  let results;
  try {
    results = await chrome.scripting.executeScript({
      target: { tabId: tabId, allFrames: allFrames },
      func: function (m, o, e) { return window.__JAF_RUN__ ? window.__JAF_RUN__(m, { overwrite: o, edu: e }) : null; },
      args: [mode, overwrite, edu]
    });
  } catch (e) {
    return { ok: false, error: 'Could not run on the page: ' + (e && e.message) };
  }
  const rs = results.map(function (r) { return r && r.result; }).filter(Boolean);
  const good = rs.filter(function (r) { return r.ok; });
  if (!good.length) return rs[0] || { ok: false, error: 'Nothing to fill on this page.' };
  const preview = good.filter(function (r) { return r.mode === 'preview'; })[0];
  if (preview) return preview;
  if (good.length === 1) return good[0];
  const sum = function (k) { return good.reduce(function (a, r) { return a + (r[k] || 0); }, 0); };
  return { ok: true, filled: sum('filled'), kept: sum('kept'), failed: sum('failed'), missing: sum('missing'), unmatched: sum('unmatched'),
    summary: good.map(function (r) { return r.summary; }).join('\n— another frame —\n') };
}

chrome.commands.onCommand.addListener(async function (cmd) {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tabs[0]) return;
  await injectAndRun(tabs[0].id, cmd === 'preview-form' ? 'preview' : 'quick');
});

chrome.runtime.onMessage.addListener(function (msg, sender, send) {
  if (!msg) return false;
  if (msg.type === 'JAF_INJECT_RUN') {
    injectAndRun(msg.tabId, msg.mode, msg.overwrite, msg.edu).then(send);
    return true;
  }
  if (msg.type === 'JAF_AI_MATCH') {
    (async function () {
      try {
        const all = await JAFProfile.store.get('settings');
        const s = Object.assign({}, JAFProfile.DEFAULT_SETTINGS, all.settings || {});
        if (!s.geminiKey) return send({ ok: false, error: 'No API key' });
        const mapping = await JAFGemini.matchFields({ key: s.geminiKey, model: s.model, fields: msg.fields, context: msg.context });
        send({ ok: true, mapping: mapping });
      } catch (e) {
        send({ ok: false, error: String(e && e.message || e) });
      }
    })();
    return true;
  }
  if (msg.type === 'JAF_OPEN_OPTIONS') { chrome.runtime.openOptionsPage(); return false; }
  if (msg.type === 'JAF_AI_PICK') {
    (async function () {
      try {
        const all = await JAFProfile.store.get('settings');
        const s = Object.assign({}, JAFProfile.DEFAULT_SETTINGS, all.settings || {});
        if (!s.geminiKey || !s.aiOptions) return send({ ok: false });
        const index = await JAFGemini.pickOption({ key: s.geminiKey, model: s.model, value: msg.value, label: msg.label, options: msg.options });
        send({ ok: true, index: index });
      } catch (e) { send({ ok: false, error: String(e && e.message || e) }); }
    })();
    return true;
  }
  return false;
});
