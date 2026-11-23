#!/usr/bin/env node
/* Validates the extension and builds the .zip you upload to Microsoft Edge Add-ons (Partner Center).
 *   node scripts/package-edge.js            -> validate + dist/job-auto-filler-<version>.zip
 *   node scripts/package-edge.js --check    -> validate only
 * No dependencies. Entries are written with forward slashes, as the stores require. */
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib');

const ROOT = path.resolve(__dirname, '..');
const EXT = path.join(ROOT, 'extension');
const DIST = path.join(ROOT, 'dist');
const EXCLUDE = [/^sample-profile\.csv$/, /(^|\/)_[^/]*\.html$/, /(^|\/)\.DS_Store$/, /(^|\/)Thumbs\.db$/, /\.map$/];

const problems = [], warnings = [];
const fail = (m) => problems.push(m), warn = (m) => warnings.push(m);

function walk(dir, base) {
  base = base || dir;
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    return d.isDirectory() ? walk(p, base) : [path.relative(base, p).split(path.sep).join('/')];
  });
}
function pngSize(file) {
  const b = fs.readFileSync(file);
  if (b.readUInt32BE(0) !== 0x89504e47) return null;
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

/* ---------------- validation ---------------- */
function validate() {
  const mfPath = path.join(EXT, 'manifest.json');
  if (!fs.existsSync(mfPath)) { fail('extension/manifest.json is missing'); return null; }
  let m;
  try { m = JSON.parse(fs.readFileSync(mfPath, 'utf8')); } catch (e) { fail('manifest.json is not valid JSON: ' + e.message); return null; }

  if (m.manifest_version !== 3) fail('manifest_version must be 3');
  if (!m.name || m.name.length > 45) fail('name must be 1-45 characters (is ' + (m.name || '').length + ')');
  if (!m.description || m.description.length > 132) fail('description must be 1-132 characters (is ' + (m.description || '').length + ')');
  if (!/^\d+(\.\d+){0,3}$/.test(m.version || '')) fail('version must look like 1.0.0');

  const need = (rel, why) => { if (!fs.existsSync(path.join(EXT, rel))) fail('missing file ' + rel + ' (' + why + ')'); };
  Object.values(m.icons || {}).forEach((p) => need(p, 'icons'));
  Object.values((m.action && m.action.default_icon) || {}).forEach((p) => need(p, 'action icon'));
  if (m.action && m.action.default_popup) need(m.action.default_popup, 'popup');
  if (m.options_ui && m.options_ui.page) need(m.options_ui.page, 'options page');
  if (m.background && m.background.service_worker) need(m.background.service_worker, 'service worker');
  Object.keys(m.icons || {}).forEach((size) => {
    const f = path.join(EXT, m.icons[size]);
    if (!fs.existsSync(f)) return;
    const s = pngSize(f);
    if (!s) fail('icon ' + m.icons[size] + ' is not a PNG');
    else if (s.w !== +size || s.h !== +size) fail('icon ' + m.icons[size] + ' is ' + s.w + 'x' + s.h + ', manifest says ' + size);
  });

  // files injected by the service worker
  const sw = fs.existsSync(path.join(EXT, m.background.service_worker)) ? fs.readFileSync(path.join(EXT, m.background.service_worker), 'utf8') : '';
  const cf = sw.match(/CONTENT_FILES\s*=\s*\[([\s\S]*?)\]/);
  if (cf) (cf[1].match(/'([^']+)'/g) || []).forEach((q) => need(q.slice(1, -1), 'injected content script'));
  else warn('could not find CONTENT_FILES in the service worker');
  (sw.match(/importScripts\(([^)]*)\)/) || ['', ''])[1].split(',').map((x) => x.trim().replace(/^'|'$/g, '')).filter(Boolean)
    .forEach((p) => need(path.posix.normalize(path.posix.join(path.posix.dirname(m.background.service_worker), p)), 'importScripts'));

  const files = walk(EXT).filter((f) => !EXCLUDE.some((re) => re.test(f)));

  // HTML: local references exist, no inline script / handlers (blocked by MV3 CSP)
  files.filter((f) => f.endsWith('.html')).forEach((f) => {
    const html = fs.readFileSync(path.join(EXT, f), 'utf8');
    (html.match(/<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/gi) || []).forEach(() => fail(f + ': inline <script> is not allowed in extension pages'));
    if (/\son[a-z]+\s*=\s*["']/i.test(html)) fail(f + ': inline event handler attributes (onclick=...) are not allowed');
    (html.match(/(?:src|href)=["']([^"'#]+)["']/g) || []).forEach((attr) => {
      const u = attr.replace(/^(?:src|href)=["']/, '').replace(/["']$/, '');
      if (/^(https?:|data:|mailto:|#)/.test(u)) { if (/^https?:/.test(u) && /\.(js)(\?|$)/.test(u)) fail(f + ': remote script ' + u); return; }
      if (!fs.existsSync(path.join(EXT, path.posix.join(path.posix.dirname(f), u)))) fail(f + ': referenced file not found: ' + u);
    });
  });

  // JS: no remote code, no eval
  files.filter((f) => f.endsWith('.js')).forEach((f) => {
    const js = fs.readFileSync(path.join(EXT, f), 'utf8');
    if (/\beval\s*\(/.test(js)) fail(f + ': eval() is not allowed');
    if (/new\s+Function\s*\(/.test(js)) fail(f + ': new Function() is not allowed');
    if (/import\(\s*["']https?:/.test(js)) fail(f + ': remote import()');
    (js.match(/https?:\/\/[A-Za-z0-9._\-]+/g) || []).forEach((u) => {
      if (!/generativelanguage\.googleapis\.com|www\.w3\.org/.test(u)) warn(f + ': external URL ' + u + ' (make sure it is disclosed)');
    });
  });

  // permissions summary
  const perms = (m.permissions || []).concat(m.host_permissions || [], m.optional_host_permissions || []);
  console.log('Manifest   : ' + m.name + ' v' + m.version + ' (MV3)');
  console.log('Permissions: ' + perms.join(', '));
  console.log('Files      : ' + files.length);
  return { manifest: m, files: files };
}

/* ---------------- tiny zip writer ---------------- */
function crc32(buf) { return zlib.crc32 ? zlib.crc32(buf) >>> 0 : (function () { let c, crc = 0xffffffff; for (let n = 0; n < buf.length; n++) { c = (crc ^ buf[n]) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; } return (crc ^ 0xffffffff) >>> 0; })(); }
function makeZip(entries) {
  const dosTime = 0, dosDate = ((2026 - 1980) << 9) | (1 << 5) | 1;     // fixed timestamp -> reproducible zip
  const parts = [], central = [];
  let offset = 0;
  entries.forEach((e) => {
    const name = Buffer.from(e.name, 'utf8');
    const raw = e.data;
    const comp = zlib.deflateRawSync(raw, { level: 9 });
    const useDeflate = comp.length < raw.length;
    const data = useDeflate ? comp : raw, method = useDeflate ? 8 : 0, crc = crc32(raw);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6); lh.writeUInt16LE(method, 8);
    lh.writeUInt16LE(dosTime, 10); lh.writeUInt16LE(dosDate, 12); lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(data.length, 18); lh.writeUInt32LE(raw.length, 22); lh.writeUInt16LE(name.length, 26); lh.writeUInt16LE(0, 28);
    parts.push(lh, name, data);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x0800, 8); ch.writeUInt16LE(method, 10);
    ch.writeUInt16LE(dosTime, 12); ch.writeUInt16LE(dosDate, 14); ch.writeUInt32LE(crc, 16);
    ch.writeUInt32LE(data.length, 20); ch.writeUInt32LE(raw.length, 24); ch.writeUInt16LE(name.length, 28);
    ch.writeUInt32LE(offset, 42);
    central.push(ch, name);
    offset += lh.length + name.length + data.length;
  });
  const cd = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat(parts.concat([cd, end]));
}

/* ---------------- main ---------------- */
const res = validate();
warnings.forEach((w) => console.log('WARN  ' + w));
if (problems.length) { problems.forEach((p) => console.log('FAIL  ' + p)); console.log('\n' + problems.length + ' problem(s). Fix them before submitting.'); process.exit(1); }
console.log('Validation : OK');
if (process.argv.includes('--check')) process.exit(0);

fs.mkdirSync(DIST, { recursive: true });
const name = 'job-auto-filler-' + res.manifest.version + '.zip';
const out = path.join(DIST, name);
const entries = res.files.sort().map((f) => ({ name: f, data: fs.readFileSync(path.join(EXT, f)) }));
const zip = makeZip(entries);
fs.writeFileSync(out, zip);
console.log('Package    : ' + path.relative(ROOT, out) + '  (' + (zip.length / 1024).toFixed(1) + ' KB, ' + entries.length + ' files)');
