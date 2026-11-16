const fs = require('fs'), path = require('path'), vm = require('vm');
const ctx = { self: null, TextDecoder, DecompressionStream, Blob, Response, console }; ctx.self = ctx; vm.createContext(ctx);
['data/schema.js', 'lib/matcher.js', 'lib/profile.js', 'lib/importers.js'].forEach(f => vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'extension', f), 'utf8'), ctx));
const I = ctx.JAFImport;
let fail = 0;
function check(name, cond) { if (!cond) { fail++; console.log('FAIL', name); } }

// blank template has every key and parses to nothing (no data)
check('blank template has no data', I.csvToItems(I.csvTemplate()).length === 0);

// new fields map correctly
const keys = 'name_en,ssc_roll,jsc_roll,jsc_reg,present_division,permanent_division,driving_license,license_validity,exp_1_department,exp_1_business,exp_2_org,honors_institute'.split(',');
let items = I.csvToItems('field,value\n' + keys.map(k => k + ',x').join('\n'));
keys.forEach(k => check('key ' + k, items.some(i => i.key === k)));

// human-readable headers from the profile website
items = I.csvToItems('Driving License No,License Validity,Organization Business,Department,JSC Roll,Division\nDL1,2030-01-01,Private,IT,77,Khulna');
const map = {}; items.forEach(i => map[i.label] = i.key);
check('driving', map['Driving License No'] === 'driving_license');
check('validity', map['License Validity'] === 'license_validity');
check('business', map['Organization Business'] === 'exp_1_business');
check('department', map['Department'] === 'exp_1_department');
check('jsc roll', map['JSC Roll'] === 'jsc_roll');

// text import with section headings
items = I.textToItems("Name: Ali Khan\nFather's Name: Karim\nSSC\nRoll: 123\nBoard: Dhaka\nHSC\nRoll: 456\nJSC\nRoll: 77");
const k2 = items.map(i => i.key);
['name_en', 'father_en', 'ssc_roll', 'ssc_board', 'hsc_roll', 'jsc_roll'].forEach(k => check('text ' + k, k2.includes(k)));

console.log(fail ? fail + ' FAILED' : 'IMPORT TESTS PASSED');
process.exit(fail ? 1 : 0);
