/* Offline English <-> Bangla value dictionary used when a site's dropdown options are in the other language.
 * Learned translations (from Gemini picks) are merged in at runtime. */
(function (g) {
  'use strict';

  // [English names / spellings..., Bangla names / spellings...]
  const ENTRIES = [
    // ---- Districts (64) / divisions / board cities ----
    [['Dhaka'], ['ঢাকা']], [['Faridpur'], ['ফরিদপুর']], [['Gazipur'], ['গাজীপুর']], [['Gopalganj', 'Gopalgonj'], ['গোপালগঞ্জ']],
    [['Kishoreganj', 'Kishorganj'], ['কিশোরগঞ্জ']], [['Madaripur'], ['মাদারীপুর']], [['Manikganj'], ['মানিকগঞ্জ']], [['Munshiganj'], ['মুন্সিগঞ্জ', 'মুন্সীগঞ্জ']],
    [['Narayanganj'], ['নারায়ণগঞ্জ']], [['Narsingdi', 'Narshingdi'], ['নরসিংদী', 'নরসিংদি']], [['Rajbari'], ['রাজবাড়ী', 'রাজবাড়ি']], [['Shariatpur'], ['শরীয়তপুর', 'শরিয়তপুর']],
    [['Tangail'], ['টাঙ্গাইল']],
    [['Chattogram', 'Chittagong'], ['চট্টগ্রাম', 'চট্ট্রগ্রাম']], [['Bandarban'], ['বান্দরবান']], [['Brahmanbaria'], ['ব্রাহ্মণবাড়িয়া', 'ব্রাহ্মনবাড়িয়া']],
    [['Chandpur'], ['চাঁদপুর', 'চান্দপুর']], [['Cumilla', 'Comilla'], ['কুমিল্লা']], [["Cox's Bazar", 'Coxs Bazar', 'Cox Bazar'], ['কক্সবাজার', 'কক্স বাজার']],
    [['Feni'], ['ফেনী']], [['Khagrachhari', 'Khagrachari'], ['খাগড়াছড়ি']], [['Lakshmipur', 'Laxmipur'], ['লক্ষ্মীপুর']], [['Noakhali'], ['নোয়াখালী']],
    [['Rangamati'], ['রাঙ্গামাটি', 'রাঙামাটি']],
    [['Rajshahi'], ['রাজশাহী']], [['Bogura', 'Bogra'], ['বগুড়া']], [['Joypurhat'], ['জয়পুরহাট']], [['Naogaon'], ['নওগাঁ']], [['Natore'], ['নাটোর']],
    [['Chapainawabganj', 'Nawabganj', 'Chapai Nawabganj'], ['চাঁপাইনবাবগঞ্জ', 'চাপাইনবাবগঞ্জ', 'নবাবগঞ্জ']], [['Pabna'], ['পাবনা']], [['Sirajganj', 'Sirajgonj'], ['সিরাজগঞ্জ']],
    [['Khulna'], ['খুলনা']], [['Bagerhat'], ['বাগেরহাট']], [['Chuadanga'], ['চুয়াডাঙ্গা']], [['Jashore', 'Jessore'], ['যশোর']], [['Jhenaidah', 'Jhenaidaha'], ['ঝিনাইদহ']],
    [['Kushtia'], ['কুষ্টিয়া']], [['Magura'], ['মাগুরা']], [['Meherpur'], ['মেহেরপুর']], [['Narail'], ['নড়াইল']], [['Satkhira'], ['সাতক্ষীরা']],
    [['Barishal', 'Barisal'], ['বরিশাল']], [['Barguna'], ['বরগুনা']], [['Bhola'], ['ভোলা']], [['Jhalakathi', 'Jhalokathi', 'Jhalokati'], ['ঝালকাঠি', 'ঝালকাঠী']],
    [['Patuakhali'], ['পটুয়াখালী']], [['Pirojpur'], ['পিরোজপুর']],
    [['Sylhet'], ['সিলেট']], [['Habiganj'], ['হবিগঞ্জ']], [['Moulvibazar', 'Maulvibazar'], ['মৌলভীবাজার']], [['Sunamganj'], ['সুনামগঞ্জ']],
    [['Rangpur'], ['রংপুর']], [['Dinajpur'], ['দিনাজপুর']], [['Gaibandha'], ['গাইবান্ধা']], [['Kurigram'], ['কুড়িগ্রাম']], [['Lalmonirhat'], ['লালমনিরহাট']],
    [['Nilphamari'], ['নীলফামারী', 'নীলফামারি']], [['Panchagarh'], ['পঞ্চগড়']], [['Thakurgaon'], ['ঠাকুরগাঁও']],
    [['Mymensingh'], ['ময়মনসিংহ']], [['Jamalpur'], ['জামালপুর']], [['Netrokona', 'Netrakona'], ['নেত্রকোণা', 'নেত্রকোনা']], [['Sherpur'], ['শেরপুর']],

    // ---- Personal ----
    [['Male'], ['পুরুষ']], [['Female'], ['মহিলা', 'নারী']], [['Other', 'Others'], ['অন্যান্য', 'অন্য']], [['Third gender', 'Transgender'], ['তৃতীয় লিঙ্গ', 'হিজড়া']],
    [['Islam', 'Muslim'], ['ইসলাম', 'মুসলিম']], [['Hinduism', 'Hindu'], ['হিন্দু', 'হিন্দুধর্ম', 'হিন্দু ধর্ম']], [['Buddhism', 'Buddhist'], ['বৌদ্ধ', 'বৌদ্ধ ধর্ম']],
    [['Christianity', 'Christian'], ['খ্রিস্টান', 'খ্রিষ্টান']],
    [['Single', 'Unmarried'], ['অবিবাহিত']], [['Married'], ['বিবাহিত']], [['Divorced'], ['তালাকপ্রাপ্ত', 'বিবাহবিচ্ছিন্ন']], [['Widowed'], ['বিধবা', 'বিপত্নীক']],
    [['Bangladeshi', 'Bangladesh'], ['বাংলাদেশী', 'বাংলাদেশি', 'বাংলাদেশ']],
    [['Yes'], ['হ্যাঁ', 'হ্যা']], [['No'], ['না', 'নাই']], [['Not Applicable', 'N/A'], ['প্রযোজ্য নয়', 'প্রযোজ্য নহে']],
    [['Private'], ['বেসরকারি', 'বেসরকারী', 'প্রাইভেট']], [['Government', 'Govt'], ['সরকারি', 'সরকারী']], [['Semi government'], ['আধা-সরকারি', 'আধা সরকারি']],
    [['Autonomous'], ['স্বায়ত্তশাসিত']], [['NGO'], ['এনজিও', 'বেসরকারি সংস্থা']],

    // ---- Education ----
    [['S.S.C', 'SSC', 'Secondary School Certificate', 'SSC/Equivalent'], ['এসএসসি', 'এস.এস.সি', 'মাধ্যমিক', 'এসএসসি/সমমান']],
    [['H.S.C', 'HSC', 'Higher Secondary Certificate', 'HSC/Equivalent'], ['এইচএসসি', 'এইচ.এস.সি', 'উচ্চ মাধ্যমিক', 'এইচএসসি/সমমান']],
    [['JSC', 'J.S.C', 'JSC/Equivalent', 'JSC/Equivalent Level'], ['জেএসসি', 'জুনিয়র স্কুল সার্টিফিকেট', 'জেএসসি/সমমান']],
    [['PhD', 'Ph.D'], ['পিএইচডি']], [['M.Phil', 'MPhil'], ['এম.ফিল.', 'এম ফিল']], [['A Level', 'A-Level'], ['এ লেভেল']], [['O Level', 'O-Level'], ['ও লেভেল']],
    [['Other (not listed)', 'Others'], ['অন্যান্য (তালিকায় নেই)']], [['Dakhil'], ['দাখিল']], [['Alim'], ['আলিম']], [['Diploma'], ['ডিপ্লোমা']],
    [['Honors', 'Honours', 'Bachelor', 'Graduation', 'Graduate'], ['অনার্স', 'স্নাতক', 'ব্যাচেলর']], [['Masters', 'Master'], ['মাস্টার্স', 'স্নাতকোত্তর', 'মাস্টার']],
    [['Degree (Pass)', 'Pass course'], ['ডিগ্রি (পাস)', 'ডিগ্রি পাস']], [['B.Sc', 'BSc'], ['বি.এসসি', 'বিএসসি']], [['B.Sc Engineering', 'BSc Engineering'], ['বিএসসি ইঞ্জিনিয়ারিং', 'বি.এসসি ইঞ্জিনিয়ারিং']],
    [['Science'], ['বিজ্ঞান']], [['Humanities', 'Arts'], ['মানবিক', 'কলা']], [['Business Studies', 'Commerce'], ['ব্যবসায় শিক্ষা', 'ব্যবসায় শিক্ষা', 'বাণিজ্য']],
    [['Technical'], ['কারিগরি', 'টেকনিক্যাল']], [['Madrasah', 'Madrasa'], ['মাদ্রাসা']],
    [['Computer Science & Engineering', 'Computer Science and Engineering', 'CSE'], ['কম্পিউটার সায়েন্স অ্যান্ড ইঞ্জিনিয়ারিং', 'কম্পিউটার বিজ্ঞান ও প্রকৌশল']],
    [['Applied Mathematics'], ['ফলিত গণিত', 'applied mathematics']], [['Mathematics'], ['গণিত']], [['Physics'], ['পদার্থবিজ্ঞান']], [['Chemistry'], ['রসায়ন']],
    [['Accounting'], ['হিসাববিজ্ঞান']], [['English'], ['ইংরেজি']], [['Bangla', 'Bengali'], ['বাংলা']],
    [['First Division', 'First Class'], ['প্রথম বিভাগ', 'প্রথম শ্রেণি', 'প্রথম শ্রেণী']], [['Second Division', 'Second Class'], ['দ্বিতীয় বিভাগ', 'দ্বিতীয় শ্রেণি', 'দ্বিতীয় শ্রেণী']],
    [['Third Division', 'Third Class'], ['তৃতীয় বিভাগ', 'তৃতীয় শ্রেণি', 'তৃতীয় শ্রেণী']], [['Passed', 'Pass'], ['উত্তীর্ণ', 'পাস']],
    [['Awaiting', 'Awaiting result', 'Result awaiting'], ['ফলাফলের অপেক্ষায়', 'ফলাফল অপেক্ষমাণ', 'ফল প্রকাশিত হয়নি']],
    [['GPA'], ['জিপিএ']], [['CGPA'], ['সিজিপিএ']], [['Level'], ['স্তর']],

    // ---- months (numbers 1-12 <-> names), used by day / month / year dropdowns ----
    [['1', '01', 'January', 'Jan'], ['জানুয়ারি', 'জানুয়ারী']], [['2', '02', 'February', 'Feb'], ['ফেব্রুয়ারি', 'ফেব্রুয়ারী']],
    [['3', '03', 'March', 'Mar'], ['মার্চ']], [['4', '04', 'April', 'Apr'], ['এপ্রিল']], [['5', '05', 'May'], ['মে']], [['6', '06', 'June', 'Jun'], ['জুন']],
    [['7', '07', 'July', 'Jul'], ['জুলাই']], [['8', '08', 'August', 'Aug'], ['আগস্ট', 'আগষ্ট']], [['9', '09', 'September', 'Sep', 'Sept'], ['সেপ্টেম্বর']],
    [['10', 'October', 'Oct'], ['অক্টোবর']], [['11', 'November', 'Nov'], ['নভেম্বর']], [['12', 'December', 'Dec'], ['ডিসেম্বর']]
  ];

  const index = {};   // norm(text) -> Set of other-language strings
  let M = null;
  const learned = {}; // norm(value) -> [texts]

  function n(s) { return M ? M.norm(s) : String(s).toLowerCase(); }

  function init() {
    M = g.JAFMatcher;
    ENTRIES.forEach(function (e) {
      const all = e[0].concat(e[1]);
      all.forEach(function (a) {
        const k = n(a);
        if (!k) return;
        index[k] = index[k] || {};
        all.forEach(function (b) { if (b !== a) index[k][b] = true; });
      });
    });
  }

  /* all strings (original first) that mean the same as `value` */
  function variants(value) {
    if (!M) init();
    const v = String(value === null || value === undefined ? '' : value).trim();
    if (!v) return [];
    const out = [v];
    const add = function (s) { if (out.indexOf(s) < 0) out.push(s); };
    const k = n(v);
    if (index[k]) Object.keys(index[k]).forEach(add);
    (learned[k] || []).forEach(add);
    // "Kushtia Sadar" style: translate the first word if the whole string is unknown
    if (!index[k] && !learned[k] && k.indexOf(' ') > 0) {
      const w = k.split(' ')[0];
      if (index[w]) Object.keys(index[w]).forEach(function (b) { add(b); });
    }
    return out;
  }

  function learn(value, text) {
    if (!M) init();
    const k = n(value);
    if (!k || !text) return false;
    learned[k] = learned[k] || [];
    if (learned[k].indexOf(text) >= 0) return false;
    learned[k].push(text);
    return true;
  }
  function load(obj) {
    if (!M) init();
    Object.keys(obj || {}).forEach(function (k) { learned[k] = (obj[k] || []).slice(); });
  }
  function dump() { return JSON.parse(JSON.stringify(learned)); }

  /* ---- sound-based "consonant skeleton" so Latin and Bangla spellings of the same name compare equal ----
   * e.g. "Alamdanga" and "আলমডাঙ্গা" both reduce to "lmdng". Only used when exactly one option matches. */
  const BN = {
    'ক': 'k', 'খ': 'k', 'গ': 'g', 'ঘ': 'g', 'ঙ': 'ng', 'চ': 'C', 'ছ': 'C', 'জ': 'j', 'ঝ': 'j', 'ঞ': 'n',
    'ট': 't', 'ঠ': 't', 'ড': 'd', 'ঢ': 'd', 'ণ': 'n', 'ত': 't', 'থ': 't', 'দ': 'd', 'ধ': 'd', 'ন': 'n',
    'প': 'p', 'ফ': 'p', 'ব': 'b', 'ভ': 'b', 'ম': 'm', 'য': 'j', 'র': 'r', 'ল': 'l', 'শ': 's', 'ষ': 's', 'স': 's', 'হ': 'h',
    'ড়': 'r', 'ঢ়': 'r', 'ৎ': 't', 'ং': 'ng'
  };
  function skeleton(text) {
    let s = String(text || '').normalize('NFC').toLowerCase();
    s = s.replace(/chh/g, 'C').replace(/ch/g, 'C').replace(/sh/g, 's').replace(/([kgtdpbj])h/g, '$1').replace(/ph/g, 'p');
    let out = '';
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      let m = '';
      if (BN[c] !== undefined) {
        if (c === 'য' && s[i + 1] === '়') { i++; continue; }   // য় = "y" sound
        if ((c === 'ড' || c === 'ঢ') && s[i + 1] === '়') { i++; out += 'r'; continue; }   // ড় / ঢ় = flap "r"
        m = BN[c];
      } else if (/[a-z]/.test(c)) {
        if ('aeiouyw'.indexOf(c) >= 0) continue;
        m = c === 'c' || c === 'q' ? 'k' : c === 'z' ? 'j' : c === 'v' ? 'b' : c === 'f' ? 'p' : c === 'x' ? 'ks' : c;
      } else if (c === 'C') m = 'C';
      else continue;                                             // vowels signs, spaces, punctuation, digits
      out += m;
    }
    return out.replace(/(.)\1+/g, '$1');
  }

  g.JAFTranslate = { variants: variants, learn: learn, load: load, dump: dump, skeleton: skeleton, ENTRIES: ENTRIES };
})(typeof self !== 'undefined' ? self : this);
