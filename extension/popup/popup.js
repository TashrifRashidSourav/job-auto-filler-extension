(async function () {
  const P = JAFProfile;
  const $ = function (id) { return document.getElementById(id); };
  let st = await P.loadAll();

  function renderProfiles() {
    const sel = $('profile');
    sel.textContent = '';
    Object.keys(st.profiles).forEach(function (id) {
      const o = document.createElement('option');
      o.value = id; o.textContent = st.profiles[id].name;
      sel.appendChild(o);
    });
    sel.value = st.activeProfileId;
    const c = P.completeness(st.profiles[st.activeProfileId].data || {});
    $('bar').style.width = Math.round(c.filled / c.total * 100) + '%';
    $('complete').textContent = c.filled + ' of ' + c.total + ' core profile fields filled';
  }
  function renderEdu() {
    const data = st.profiles[st.activeProfileId].data || {};
    const avail = JAF_SCHEMA.EDU_SECTIONS.filter(function (s) { return P.sectionHasData(data, s); });
    const sel = $('edu');
    sel.textContent = '';
    const auto = document.createElement('option');
    auto.value = 'auto'; auto.textContent = 'Auto – next one in order';
    sel.appendChild(auto);
    avail.forEach(function (s) {
      const o = document.createElement('option');
      o.value = s; o.textContent = JAF_SCHEMA.SECTIONS[s].label;
      sel.appendChild(o);
    });
    $('eduRow').hidden = avail.length === 0;
  }
  renderProfiles();
  renderEdu();
  $('overwrite').checked = !!st.settings.overwrite;
  $('aiState').textContent = st.settings.geminiKey && st.settings.aiMatch ? 'Offline matching + Gemini assist' : 'Offline matching (no API key needed)';

  $('profile').addEventListener('change', async function (e) {
    st.activeProfileId = e.target.value;
    await P.store.set({ activeProfileId: st.activeProfileId });
    renderProfiles();
    renderEdu();
  });
  $('overwrite').addEventListener('change', async function (e) {
    st.settings.overwrite = e.target.checked;
    await P.store.set({ settings: st.settings });
  });
  $('settings').addEventListener('click', function (e) { e.preventDefault(); chrome.runtime.openOptionsPage(); });

  async function go(mode) {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const out = $('result');
    out.hidden = false; out.className = 'result'; out.textContent = 'Working…';
    $('fill').disabled = $('preview').disabled = true;
    const r = await chrome.runtime.sendMessage({ type: 'JAF_INJECT_RUN', tabId: tabs[0].id, mode: mode, overwrite: $('overwrite').checked, edu: $('edu').value });
    $('fill').disabled = $('preview').disabled = false;
    if (!r || !r.ok) { out.className = 'result err'; out.textContent = (r && r.error) || 'Something went wrong.'; return; }
    if (r.mode === 'preview') { window.close(); return; }
    out.textContent = r.summary;
  }
  $('fill').addEventListener('click', function () { go('quick'); });
  $('preview').addEventListener('click', function () { go('preview'); });
})();
