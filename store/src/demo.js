/* Builds a realistic (fictional) job-application form and runs the real extension on it. */
(function () {
  function h(tag, attrs, kids) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { if (k === 'text') e.textContent = attrs[k]; else if (k === 'class') e.className = attrs[k]; else e.setAttribute(k, attrs[k]); });
    (kids || []).forEach(function (c) { e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  function years(a, b, bn) {
    var out = [];
    for (var y = a; y <= b; y++) out.push(bn ? String(y).replace(/\d/g, function (d) { return '০১২৩৪৫৬৭৮৯'[d]; }) : String(y));
    return out;
  }
  function control(f) {
    if (f.t === 'select') { var s = h('select'); [f.ph || 'Select'].concat(f.o).forEach(function (o) { s.appendChild(h('option', { text: o })); }); return s; }
    if (f.t === 'textarea') return h('textarea', { rows: '2' });
    return h('input', { type: f.t || 'text' });
  }
  function build(cfg) {
    var root = document.getElementById('form');
    cfg.sections.forEach(function (sec) {
      var card = h('section', { class: 'card' });
      if (sec.title) card.appendChild(h('h3', { text: sec.title }));
      var grid = h('div', { class: 'grid' });
      sec.fields.forEach(function (f) {
        grid.appendChild(h('label', { class: 'f' + (f.wide ? ' wide' : '') }, [h('span', { text: f.l }), control(f)]));
      });
      card.appendChild(grid);
      root.appendChild(card);
    });
  }
  window.JAFDemo = { build: build, years: years };

  // banner text + action come from the URL hash:  #fill|Title|Subtitle   or   #preview|Title|Subtitle
  window.addEventListener('load', function () {
    var parts = decodeURIComponent((location.hash || '#fill||').slice(1)).split('|');
    var mode = parts[0] || 'fill';
    if (parts[1]) document.getElementById('mkTitle').textContent = parts[1];
    if (parts[2]) document.getElementById('mkSub').textContent = parts[2];
    setTimeout(function () {
      var p = window.__JAF_RUN__(mode === 'preview' ? 'preview' : 'quick', { overwrite: true });
      // the screenshot tool waits for this flag, so it never captures a half-filled form
      Promise.resolve(p).then(function () { setTimeout(function () { window.scrollTo(0, 0); window.__SHOT_READY__ = true; }, 900); });
    }, 500);
  });
})();
