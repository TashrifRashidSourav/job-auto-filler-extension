/* Preview panel, toast and "fill new fields" chip, rendered in a shadow root so page CSS can't interfere. */
(function (g) {
  'use strict';
  const JAF = g.JAF = g.JAF || {};
  const S = g.JAF_SCHEMA;

  let host = null, shadow = null;

  /* Corvas logo (inline so it works on any page without web-accessible resources) */
  const LOGO_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><linearGradient id="b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#43a047"/><stop offset="1" stop-color="#14532d"/></linearGradient></defs><rect width="512" height="512" rx="112" fill="url(#b)"/><path d="M362.07 362.07A150 150 0 1 1 362.07 149.93" fill="none" stroke="#fff" stroke-width="52" stroke-linecap="round"/><path d="M196 262L240 306L318 208" fill="none" stroke="#ffe082" stroke-width="46" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const LOGO_URI = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(LOGO_SVG);

  const CSS = `
  :host{all:initial}
  *{box-sizing:border-box;font-family:system-ui,-apple-system,"Segoe UI",Roboto,"Noto Sans Bengali",sans-serif}
  .panel{--bg:#ffffff;--bg2:#f4f7fa;--fg:#17212b;--mut:#5d6c7b;--line:#e1e7ee;--pri:#2e7d32;--pri-bg:#e7f3e8;--ok:#2e9e4f;--warn:#d99a00;--bad:#d64545;--idle:#8b98a6;--blue:#1976d2;
    position:fixed;top:12px;right:12px;width:440px;max-width:calc(100vw - 24px);max-height:calc(100vh - 24px);display:flex;flex-direction:column;
    background:var(--bg);color:var(--fg);border:1px solid var(--line);border-radius:14px;box-shadow:0 18px 50px rgba(0,0,0,.30);z-index:2147483647;font-size:13px;line-height:1.4;overflow:hidden}
  @media (prefers-color-scheme:dark){.panel{--bg:#1b2027;--bg2:#232a33;--fg:#e8eef4;--mut:#9aa8b6;--line:#333c47;--pri:#43a047;--pri-bg:#20352a;--idle:#7d8a98}}
  button{font:inherit;cursor:pointer;border-radius:8px;border:1px solid transparent;color:inherit;background:none}
  .hd{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid var(--line);background:linear-gradient(180deg,var(--pri-bg),var(--bg))}
  .mark{width:32px;height:32px;border-radius:9px;flex:none;box-shadow:0 2px 8px rgba(0,0,0,.25)}
  .by{text-align:center;padding:0 0 9px;font-size:10.5px;color:var(--mut);letter-spacing:.04em;background:var(--bg)}
  .by b{color:var(--pri);letter-spacing:.07em}
  .ttl{font-weight:700;font-size:14px}
  .sub{color:var(--mut);font-size:11.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:300px}
  .hd .x{margin-left:auto;font-size:18px;padding:2px 8px;color:var(--mut)}
  .hd .x:hover{background:var(--bg2)}
  .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:12px 14px 4px}
  .stat{display:flex;flex-direction:column;align-items:flex-start;padding:8px 10px;border-radius:10px;background:var(--bg2);border:1px solid transparent;text-align:left}
  .stat b{font-size:20px;line-height:1.1}
  .stat span{font-size:11px;color:var(--mut)}
  .stat.on{border-color:var(--pri);background:var(--pri-bg)}
  .stat.s-fill b{color:var(--ok)}.stat.s-check b{color:var(--warn)}.stat.s-nodata b{color:var(--idle)}.stat.s-un b{color:var(--bad)}
  .edu{margin:8px 14px 0;padding:8px 10px;border-radius:10px;background:var(--pri-bg);font-size:12px}
  .edu select{margin-top:6px}
  .toolbar{display:flex;gap:8px;align-items:center;padding:10px 14px 8px}
  .search{flex:1;padding:7px 10px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--fg);font-size:12.5px}
  .link{font-size:12px;color:var(--blue);padding:4px 6px}
  .link:hover{text-decoration:underline}
  .list{overflow:auto;flex:1;min-height:120px;border-top:1px solid var(--line)}
  .grp{position:sticky;top:0;z-index:1;background:var(--bg2);padding:6px 14px;font-size:11px;font-weight:700;letter-spacing:.03em;text-transform:uppercase;color:var(--mut);border-bottom:1px solid var(--line)}
  .row{display:grid;grid-template-columns:18px 22px 1fr;gap:9px;padding:10px 14px;border-bottom:1px solid var(--line);cursor:pointer}
  .row:hover{background:var(--bg2)}
  .row input[type=checkbox]{margin:3px 0 0;width:15px;height:15px;accent-color:var(--pri)}
  .ico{width:20px;height:20px;border-radius:50%;display:grid;place-items:center;color:#fff;font-size:11px;font-weight:800;margin-top:1px}
  .s-fill .ico{background:var(--ok)}.s-check .ico{background:var(--warn)}.s-nodata .ico{background:var(--idle)}.s-un .ico{background:var(--bad)}
  .l1{display:flex;gap:6px;align-items:baseline;flex-wrap:wrap}
  .lab{font-weight:650;word-break:break-word}
  .tag{font-size:10px;font-weight:600;padding:1px 7px;border-radius:9px;background:var(--bg2);color:var(--mut);border:1px solid var(--line)}
  .tag.src{background:var(--pri-bg);color:var(--pri);border-color:transparent}
  .map{margin-top:3px;color:var(--mut);font-size:12px}
  .map b{color:var(--fg);font-weight:600}
  .val{display:inline-block;margin-top:5px;max-width:100%;padding:3px 9px;border-radius:7px;background:var(--bg2);border:1px solid var(--line);font-size:12px;word-break:break-word}
  .why{margin-top:4px;font-size:12px}
  .s-nodata .why{color:var(--mut)}.s-un .why{color:var(--bad)}.s-check .why{color:var(--warn)}
  .acts{display:flex;gap:10px;margin-top:5px}
  select{width:100%;margin-top:6px;padding:6px 8px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--fg);font-size:12px}
  .empty{padding:28px 14px;text-align:center;color:var(--mut)}
  .result{margin:0;padding:10px 14px;background:var(--pri-bg);border-top:1px solid var(--line);white-space:pre-line;font-size:12.5px}
  .result b{color:var(--pri)}
  .ft{display:flex;gap:8px;padding:11px 14px;border-top:1px solid var(--line);align-items:center;background:var(--bg)}
  .ft .msg{flex:1;font-size:12px;color:var(--mut)}
  .btn{padding:8px 13px;border-color:var(--line);background:var(--bg)}
  .btn:hover{background:var(--bg2)}
  .pri{background:var(--pri);color:#fff;font-weight:700;padding:8px 16px;border-color:var(--pri)}
  .pri:disabled{opacity:.6;cursor:default}
  .legend{display:flex;gap:12px;flex-wrap:wrap;padding:0 14px 8px;font-size:11px;color:var(--mut)}
  .legend i{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:4px}
  .chip{position:fixed;left:16px;bottom:16px;display:flex;gap:4px;z-index:2147483647}
  .chip .go{background:#2e7d32;color:#fff;font-weight:600;border-radius:20px;padding:9px 16px;box-shadow:0 6px 20px rgba(0,0,0,.3)}
  .chip .x{background:#fff;border:1px solid #c5ced8;border-radius:50%;width:32px;height:32px;padding:0;color:#1b2430}
  .toast{position:fixed;right:16px;bottom:16px;max-width:360px;background:#1d6b35;color:#fff;padding:10px 14px;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.3);z-index:2147483647;font-size:13px;line-height:1.4;white-space:pre-line}
  .toast.err{background:#b3261e}
  `;

  function ensure() {
    if (host && host.isConnected) return;
    host = document.createElement('div');
    host.id = '__jaf_host__';
    shadow = host.attachShadow({ mode: 'open' });
    const st = document.createElement('style');
    st.textContent = CSS;
    shadow.appendChild(st);
    (document.body || document.documentElement).appendChild(host);
  }

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

  function clearPanel() {
    if (!shadow) return;
    shadow.querySelectorAll('.panel').forEach(function (n) { n.remove(); });
  }

  /* ---------- helpers ---------- */
  const STATUS = {
    fill:    { icon: '✓', label: 'Ready',    cls: 's-fill' },
    check:   { icon: '!', label: 'Check',    cls: 's-check' },
    nodata:  { icon: '–', label: 'No data',  cls: 's-nodata' },
    unmatched: { icon: '?', label: 'Unmatched', cls: 's-un' }
  };
  function statusOf(it) {
    if (!it.key) return 'unmatched';
    if (!it.hasValue) return 'nodata';
    return it.conf === 'high' ? 'fill' : 'check';
  }
  function keyInfo(key) {
    if (!key) return '';
    if (key.indexOf('extra:') === 0) return 'Custom detail · ' + key.slice(6);
    const f = S.byKey[key];
    if (f) {
      const gr = S.GROUPS.filter(function (x) { return x.id === f.group; })[0];
      return (gr && f.group !== 'misc' ? gr.title + ' · ' : '') + f.label;
    }
    const v = S.VIRTUAL_KEYS.filter(function (x) { return x.key === key; })[0];
    return v ? v.label : key;
  }
  function kindLabel(d) {
    switch (d.kind) {
      case 'select': case 'combobox': return 'Dropdown';
      case 'radio': case 'radiogroup': return 'Choice';
      case 'checkbox': return 'Checkbox';
      case 'textarea': case 'richtext': return 'Text area';
      default: return d.type === 'date' ? 'Date' : d.type === 'email' ? 'Email' : d.type === 'tel' ? 'Phone' : 'Text';
    }
  }
  const SRC = { rule: 'Saved for this site', ai: 'AI suggestion', manual: 'Set by you', extra: 'Custom detail' };

  const HL = [];
  function highlight(items) {
    unhighlight();
    items.forEach(function (it) {
      const el = it.el;
      if (!el || !el.style) return;
      HL.push([el, el.style.outline, el.style.outlineOffset]);
      const st = statusOf(it);
      el.style.outline = '2px solid ' + (st === 'unmatched' ? '#d64545' : st === 'nodata' ? '#8b98a6' : st === 'fill' ? '#2e9e4f' : '#d99a00');
      el.style.outlineOffset = '1px';
    });
  }
  function unhighlight() {
    HL.splice(0).forEach(function (x) { x[0].style.outline = x[1]; x[0].style.outlineOffset = x[2]; });
  }

  function keyOptions(sel, current) {
    sel.appendChild(h('option', { value: '', text: '— ignore this field —' }));
    S.GROUPS.forEach(function (gr) {
      const og = h('optgroup', { label: gr.title });
      S.fields.forEach(function (f) { if (f.group === gr.id) og.appendChild(h('option', { value: f.key, text: f.label })); });
      if (og.children.length) sel.appendChild(og);
    });
    const sp = h('optgroup', { label: 'Special' });
    S.VIRTUAL_KEYS.forEach(function (v) { sp.appendChild(h('option', { value: v.key, text: v.label })); });
    sel.appendChild(sp);
    if (current && current.indexOf('extra:') === 0) sel.appendChild(h('option', { value: current, text: 'Custom: ' + current.slice(6) }));
    sel.value = current || '';
  }

  /* ---------- the panel ---------- */
  function show(o) {
    ensure();
    clearPanel();
    const items = o.items;
    const meta = o.meta || {};
    let filter = 'all', query = '';
    const openSel = new WeakSet();

    const statEls = {};
    const stats = h('div', { class: 'stats' });
    [['fill', 'Ready'], ['check', 'Check'], ['nodata', 'No data'], ['unmatched', 'Unmatched']].forEach(function (s) {
      const num = h('b', { text: '0' });
      const b = h('button', { class: 'stat ' + STATUS[s[0]].cls, title: 'Show only: ' + s[1], onclick: function () { filter = filter === s[0] ? 'all' : s[0]; rebuild(); } }, [num, h('span', { text: s[1] })]);
      statEls[s[0]] = { btn: b, num: num };
      stats.appendChild(b);
    });

    const search = h('input', { class: 'search', type: 'search', placeholder: 'Search fields…' });
    search.addEventListener('input', function () { query = search.value.trim().toLowerCase(); rebuild(); });

    const list = h('div', { class: 'list' });
    const msg = h('div', { class: 'msg' });
    const fillBtn = h('button', { class: 'pri', text: 'Fill selected' });
    const resultBox = h('div', { class: 'result' });
    resultBox.hidden = true;
    const closeFn = function () { unhighlight(); document.removeEventListener('keydown', onKey, true); clearPanel(); if (o.onClose) o.onClose(); };
    function onKey(e) { if (e.key === 'Escape' && shadow && shadow.querySelector('.panel')) { e.stopPropagation(); closeFn(); } }
    document.addEventListener('keydown', onKey, true);

    function row(it) {
      const st = statusOf(it), S_ = STATUS[st];
      const canFill = st === 'fill' || st === 'check';
      const cb = h('input', { type: 'checkbox' });
      cb.checked = canFill && it.include;
      cb.disabled = !canFill;
      cb.addEventListener('click', function (ev) { ev.stopPropagation(); it.include = cb.checked; o.onToggle(it); rebuild(); });

      const l1 = h('div', { class: 'l1' }, [
        h('span', { class: 'lab', text: it.desc.label || it.desc.attrs || '(unlabeled field)' }),
        h('span', { class: 'tag', text: kindLabel(it.desc) }),
        SRC[it.src] ? h('span', { class: 'tag src', text: SRC[it.src] }) : null
      ]);
      const body = h('div', {}, [l1]);

      if (it.key) body.appendChild(h('div', { class: 'map', text: '' }, [document.createTextNode('→ '), h('b', { text: keyInfo(it.key) })]));
      if (st === 'fill' || st === 'check') {
        const v = it.value === true ? '✓ tick the box' : String(it.value);
        body.appendChild(h('span', { class: 'val', text: v.length > 70 ? v.slice(0, 70) + '…' : v, title: it.value === true ? '' : String(it.value) }));
        if (st === 'check') body.appendChild(h('div', { class: 'why', text: 'Not 100% sure this is the right field – please double-check.' }));
      } else if (st === 'nodata') {
        body.appendChild(h('div', { class: 'why', text: 'Your profile has no value for this field.' }));
      } else {
        body.appendChild(h('div', { class: 'why', text: 'Not recognised – choose which profile field it is (remembered for this site).' }));
      }

      const acts = h('div', { class: 'acts' });
      if (st === 'nodata' && o.onOpenSettings) acts.appendChild(h('button', { class: 'link', text: 'Add it to my profile ↗', onclick: function (ev) { ev.stopPropagation(); o.onOpenSettings(); } }));
      if (it.key) acts.appendChild(h('button', { class: 'link', text: openSel.has(it.el) ? 'Hide' : 'Change field', onclick: function (ev) { ev.stopPropagation(); if (openSel.has(it.el)) openSel.delete(it.el); else openSel.add(it.el); rebuild(); } }));
      if (acts.children.length) body.appendChild(acts);

      if (!it.key || openSel.has(it.el)) {
        const sel = h('select');
        keyOptions(sel, it.key);
        sel.addEventListener('click', function (ev) { ev.stopPropagation(); });
        sel.addEventListener('change', function () { o.onKeyChange(it, sel.value); rebuild(); });
        body.appendChild(sel);
      }

      const r = h('div', { class: 'row ' + S_.cls }, [cb, h('div', { class: 'ico', text: S_.icon, title: S_.label }), body]);
      r.addEventListener('mouseenter', function () { if (it.el.style) { it.el.style.outline = '3px solid #1976d2'; } });
      r.addEventListener('mouseleave', function () { highlight(items); });
      r.addEventListener('click', function () { try { it.el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) { /* ignore */ } });
      return r;
    }

    function rebuild() {
      const counts = { fill: 0, check: 0, nodata: 0, unmatched: 0 };
      items.forEach(function (it) { counts[statusOf(it)]++; });
      Object.keys(statEls).forEach(function (k) {
        statEls[k].num.textContent = String(counts[k]);
        statEls[k].btn.classList.toggle('on', filter === k);
      });
      list.textContent = '';
      const groups = [], byName = {};
      items.forEach(function (it) {
        if (filter !== 'all' && statusOf(it) !== filter) return;
        if (query) {
          const hay = ((it.desc.label || '') + ' ' + keyInfo(it.key) + ' ' + (it.desc.attrs || '')).toLowerCase();
          if (hay.indexOf(query) < 0) return;
        }
        const name = it.desc.section ? S.SECTIONS[it.desc.section].label : 'General';
        if (!byName[name]) { byName[name] = []; groups.push(name); }
        byName[name].push(it);
      });
      groups.forEach(function (gname) {
        list.appendChild(h('div', { class: 'grp', text: gname + ' · ' + byName[gname].length }));
        byName[gname].forEach(function (it) { list.appendChild(row(it)); });
      });
      if (!groups.length) list.appendChild(h('div', { class: 'empty', text: filter === 'all' && !query ? 'No fields found.' : 'Nothing matches this filter.' }));
      const n = items.filter(function (i) { return i.include && i.key && i.hasValue; }).length;
      msg.textContent = n + ' field' + (n === 1 ? '' : 's') + ' will be filled';
      fillBtn.disabled = n === 0;
      highlight(items);
    }

    function setAll(on) {
      items.forEach(function (it) {
        const can = it.key && it.hasValue;
        it.include = on && !!can;
        o.onToggle(it);
      });
      rebuild();
    }

    fillBtn.addEventListener('click', async function () {
      fillBtn.disabled = true; fillBtn.textContent = 'Filling…';
      const r = await o.onFill();
      fillBtn.textContent = 'Done ✓';
      resultBox.hidden = false;
      resultBox.textContent = '';
      resultBox.appendChild(h('b', { text: 'Finished. ' }));
      resultBox.appendChild(document.createTextNode(r.summary));
      msg.textContent = '';
      unhighlight();
    });

    let eduBar = null;
    if (o.edu) {
      const sel = h('select');
      o.edu.options.forEach(function (op) { sel.appendChild(h('option', { value: op.id, text: op.label })); });
      sel.value = o.edu.current;
      sel.addEventListener('change', function () { o.edu.onChange(sel.value); rebuild(); });
      eduBar = h('div', { class: 'edu' }, [h('b', { text: 'This form adds one qualification.' }), document.createTextNode(' Fill it with:'), sel]);
    }

    const sub = [meta.host, meta.profile ? 'profile “' + meta.profile + '”' : null].filter(Boolean).join(' · ');
    const panel = h('div', { class: 'panel' }, [
      h('div', { class: 'hd' }, [
        h('img', { class: 'mark', src: LOGO_URI, alt: '' }),
        h('div', {}, [h('div', { class: 'ttl', text: 'Review before filling' }), h('div', { class: 'sub', text: sub, title: sub })]),
        h('button', { class: 'x', text: '✕', title: 'Close (Esc)', onclick: closeFn })
      ]),
      stats,
      eduBar,
      h('div', { class: 'toolbar' }, [
        search,
        h('button', { class: 'link', text: 'Select all', onclick: function () { setAll(true); } }),
        h('button', { class: 'link', text: 'None', onclick: function () { setAll(false); } })
      ]),
      h('div', { class: 'legend' }, [
        h('span', {}, [h('i', { style: 'background:#2e9e4f' }), document.createTextNode('Ready')]),
        h('span', {}, [h('i', { style: 'background:#d99a00' }), document.createTextNode('Double-check')]),
        h('span', {}, [h('i', { style: 'background:#8b98a6' }), document.createTextNode('Nothing in profile')]),
        h('span', {}, [h('i', { style: 'background:#d64545' }), document.createTextNode('Not recognised')])
      ]),
      list,
      resultBox,
      h('div', { class: 'ft' }, [msg,
        o.onReport ? h('button', { class: 'btn', text: 'Copy report', title: 'Copies field names and match results (no personal values) so you can share them if a site misbehaves', onclick: function (ev) {
          const text = o.onReport(), b = ev.currentTarget;
          const done = function () { b.textContent = 'Copied ✓'; setTimeout(function () { b.textContent = 'Copy report'; }, 2000); };
          if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); done(); });
          else { fallbackCopy(text); done(); }
        } }) : null,
        h('button', { class: 'btn', text: 'Close', onclick: closeFn }), fillBtn]),
      h('div', { class: 'by' }, [document.createTextNode('Powered by '), h('b', { text: 'Corvas' })])
    ]);
    shadow.appendChild(panel);
    rebuild();
  }

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) { /* ignore */ }
    ta.remove();
  }

  /* small unobtrusive prompt, e.g. "3 fields here can be filled" after a multi-step form moves on */
  let chipTimer = null;
  function chip(text, onClick) {
    ensure();
    shadow.querySelectorAll('.chip').forEach(function (n) { n.remove(); });
    const c = h('div', { class: 'chip' }, [
      h('button', { class: 'go', text: '✔ ' + text + ' – Fill', onclick: function () { c.remove(); onClick(); } }),
      h('button', { class: 'x', text: '✕', onclick: function () { c.remove(); } })
    ]);
    shadow.appendChild(c);
    clearTimeout(chipTimer);
    chipTimer = setTimeout(function () { c.remove(); }, 20000);
  }

  let toastTimer = null;
  function toast(text, isErr) {
    ensure();
    shadow.querySelectorAll('.toast').forEach(function (n) { n.remove(); });
    const t = h('div', { class: 'toast' + (isErr ? ' err' : ''), text: text });
    shadow.appendChild(t);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.remove(); }, 7000);
  }

  JAF.overlay = { show: show, toast: toast, chip: chip, close: function () { unhighlight(); clearPanel(); } };
})(typeof window !== 'undefined' ? window : this);
