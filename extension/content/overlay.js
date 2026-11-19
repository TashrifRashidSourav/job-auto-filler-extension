/* Preview panel, toast and "fill new fields" chip, rendered in a shadow root so page CSS can't interfere. */
(function (g) {
  'use strict';
  const JAF = g.JAF = g.JAF || {};
  const S = g.JAF_SCHEMA;

  let host = null, shadow = null;

  /* logo (inline so it works on any page without web-accessible resources) */
  const LOGO_URI = 'data:image/png;base64,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';

  const CSS = `
  :host{all:initial}
  *{box-sizing:border-box;font-family:system-ui,-apple-system,"Segoe UI",Roboto,"Noto Sans Bengali",sans-serif}
  .panel{--bg:#ffffff;--bg2:#f4f7fa;--fg:#17212b;--mut:#5d6c7b;--line:#e1e7ee;--pri:#1565c0;--pri-bg:#e4effc;--ok:#2e9e4f;--warn:#d99a00;--bad:#d64545;--idle:#8b98a6;--blue:#1976d2;
    position:fixed;top:12px;right:12px;width:440px;max-width:calc(100vw - 24px);max-height:calc(100vh - 24px);display:flex;flex-direction:column;
    background:var(--bg);color:var(--fg);border:1px solid var(--line);border-radius:14px;box-shadow:0 18px 50px rgba(0,0,0,.30);z-index:2147483647;font-size:13px;line-height:1.4;overflow:hidden}
  @media (prefers-color-scheme:dark){.panel{--bg:#1b2027;--bg2:#232a33;--fg:#e8eef4;--mut:#9aa8b6;--line:#333c47;--pri:#42a5f5;--pri-bg:#1a2b3d;--idle:#7d8a98}}
  button{font:inherit;cursor:pointer;border-radius:8px;border:1px solid transparent;color:inherit;background:none}
  .hd{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid var(--line);background:linear-gradient(180deg,var(--pri-bg),var(--bg))}
  .mark{width:32px;height:32px;flex:none;filter:drop-shadow(0 2px 4px rgba(0,0,0,.28))}
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
  .chip .go{background:#1565c0;color:#fff;font-weight:600;border-radius:20px;padding:9px 16px;box-shadow:0 6px 20px rgba(0,0,0,.3)}
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
