/* Canonical profile schema + label dictionary (English + Bangla).
 * Shared by content scripts, options page and service worker. */
(function (g) {
  'use strict';

  /* ---- Form sections (detected from headings like "SSC/Equivalent Level") ---- */
  const SECTIONS = {
    present:   { label: 'Present Address',      re: /\bpresent\b|বর্তমান/i },
    permanent: { label: 'Permanent Address',    re: /\bpermanent\b|স্থায়ী/i },
    masters:   { label: 'Masters',              re: /\bmasters?\b|post[\s-]?grad|\bm\.?\s?sc\b|স্নাতকোত্তর/i },
    honors:    { label: 'Graduation / Honors',  re: /graduat|\bhonou?rs\b|bachelor|undergrad|স্নাতক/i },
    jsc:       { label: 'JSC / Equivalent',     re: /\bj\.?\s?s\.?\s?c\b|\bj\.?d\.?c\b|junior school|জেএসসি/i },
    ssc:       { label: 'SSC / Equivalent',     re: /\bs\.?\s?s\.?\s?c\b|dakhil|o[\s-]?level|secondary school|এসএসসি|এস\.এস\.সি/i },
    hsc:       { label: 'HSC / Equivalent',     re: /\bh\.?\s?s\.?\s?c\b|alim\b|a[\s-]?level|higher secondary|diploma|এইচএসসি|এইচ\.এস\.সি/i },
    exp:       { label: 'Job Experience',       re: /experience|employment|work history|job history|অভিজ্ঞতা/i }
  };
  const SECTION_ORDER = ['present', 'permanent', 'masters', 'honors', 'jsc', 'ssc', 'hsc', 'exp'];

  const GROUPS = [
    { id: 'personal',  title: 'Personal Information' },
    { id: 'contact',   title: 'Contact' },
    { id: 'present',   title: 'Present Address' },
    { id: 'permanent', title: 'Permanent Address' },
    { id: 'jsc',       title: 'JSC / Equivalent' },
    { id: 'ssc',       title: 'SSC / Equivalent' },
    { id: 'hsc',       title: 'HSC / Equivalent / Diploma' },
    { id: 'honors',    title: 'Graduation / Honors' },
    { id: 'masters',   title: 'Masters / Equivalent' },
    { id: 'misc',      title: 'Other' },
    { id: 'exp',       title: 'Job Experience' }
  ];

  const fields = [];
  function add(f) {
    f.terms = f.terms || [];
    f.type = f.type || 'text';
    f.section = f.section || 'global';
    fields.push(f);
  }

  /* ---------------- Personal ---------------- */
  const NOT_PERSON = ['occupation', 'profession', 'nid', 'mobile', 'phone', 'income', 'nationality', 'age', 'alive', 'status', 'address', 'email'];
  add({ key: 'name_en', group: 'personal', label: "Applicant's name (English)", lang: 'en',
    not: ['father', 'mother', 'guardian', 'spouse', 'husband', 'wife', 'referee', 'reference', 'nominee', 'post', 'organization', 'organisation', 'company', 'পিতার', 'মাতার', 'পিতা', 'মাতা', 'বাবার', 'মায়ের'],
    terms: ["applicant's name", 'applicant name', 'name of applicant', 'name of the applicant', 'full name', 'candidate name', 'candidates name',
      'name of candidate', 'name of the candidate', 'your name', 'name in english', 'english name', 'name english', 'name in block letter', 'name', 'আবেদনকারীর নাম', 'প্রার্থীর নাম', 'আপনার নাম', 'নাম'] });
  add({ key: 'name_bn', group: 'personal', label: "Applicant's name (Bangla)", lang: 'bn',
    not: ['father', 'mother', 'পিতার', 'মাতার', 'পিতা', 'মাতা', 'বাবার', 'মায়ের'],
    terms: ['আবেদনকারীর নাম', 'প্রার্থীর নাম', 'আপনার নাম', 'name in bangla', 'bangla name', 'bengali name', 'name bangla', 'name bengali', 'নাম'] });
  add({ key: 'father_en', group: 'personal', label: "Father's name (English)", lang: 'en', not: NOT_PERSON,
    terms: ["father's name", 'father name', 'name of father', 'name of the father', "father's full name", 'পিতার নাম', 'বাবার নাম'] });
  add({ key: 'father_bn', group: 'personal', label: "Father's name (Bangla)", lang: 'bn', like: 'father_en', not: NOT_PERSON,
    terms: ['পিতার নাম', 'বাবার নাম', 'পিতা'] });
  add({ key: 'mother_en', group: 'personal', label: "Mother's name (English)", lang: 'en', not: NOT_PERSON,
    terms: ["mother's name", 'mother name', 'name of mother', 'name of the mother', "mother's full name", 'মাতার নাম', 'মায়ের নাম'] });
  add({ key: 'mother_bn', group: 'personal', label: "Mother's name (Bangla)", lang: 'bn', like: 'mother_en', not: NOT_PERSON,
    terms: ['মাতার নাম', 'মায়ের নাম', 'মাতা'] });
  add({ key: 'dob', group: 'personal', label: 'Date of birth', type: 'date',
    terms: ['date of birth', 'birth date', 'dob', 'birthday', 'date of birth dd mm yyyy', 'জন্ম তারিখ', 'জন্মতারিখ'] });
  add({ key: 'nationality', group: 'personal', label: 'Nationality', options: ['Bangladeshi'],
    terms: ['nationality', 'citizenship', 'জাতীয়তা'] });
  add({ key: 'religion', group: 'personal', label: 'Religion', options: ['Islam', 'Hinduism', 'Buddhism', 'Christianity', 'Other'],
    terms: ['religion', 'ধর্ম'] });
  add({ key: 'gender', group: 'personal', label: 'Gender', options: ['Male', 'Female', 'Other'],
    terms: ['gender', 'sex', 'লিঙ্গ'] });
  add({ key: 'marital_status', group: 'personal', label: 'Marital status', options: ['Single', 'Married', 'Divorced', 'Widowed'],
    terms: ['marital status', 'marital', 'বৈবাহিক অবস্থা'] });
  add({ key: 'blood_group', group: 'personal', label: 'Blood group', options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    terms: ['blood group', 'blood'] });
  add({ key: 'nid', group: 'personal', label: 'National ID number', elTypes: ['input'],
    terms: ['national id number', 'national id no', 'national id card number', 'national identity number', 'nid number', 'nid no', 'nid', 'national id',
      'জাতীয় পরিচয়পত্র নম্বর', 'জাতীয় পরিচয় পত্র নম্বর'] });
  add({ key: 'has_nid', group: 'personal', label: 'Has National ID? (auto)', derived: true, elTypes: ['select', 'radio'],
    terms: ['national id', 'nid', 'national id card', 'national identity card', 'have national id', 'জাতীয় পরিচয়পত্র'] });
  add({ key: 'birth_reg', group: 'personal', label: 'Birth registration number', elTypes: ['input'],
    terms: ['birth registration number', 'birth registration no', 'birth certificate number', 'birth certificate no', 'birth reg no',
      'birth registration', 'birth certificate', 'জন্ম নিবন্ধন নম্বর'] });
  add({ key: 'has_birth_reg', group: 'personal', label: 'Has birth registration? (auto)', derived: true, elTypes: ['select', 'radio'],
    terms: ['birth registration', 'birth certificate', 'have birth registration', 'জন্ম নিবন্ধন'] });
  add({ key: 'passport', group: 'personal', label: 'Passport number', elTypes: ['input'],
    terms: ['passport number', 'passport no', 'passport id number', 'passport id', 'passport'] });
  add({ key: 'has_passport', group: 'personal', label: 'Has passport? (auto)', derived: true, elTypes: ['select', 'radio'],
    terms: ['passport id', 'passport', 'have passport', 'passport no'] });

  add({ key: 'driving_license', group: 'personal', label: 'Driving license no',
    terms: ['driving license no', 'driving license number', 'driving licence no', 'driving licence number', 'driving license', 'driving licence', 'license no', 'licence no'] });
  add({ key: 'license_validity', group: 'personal', label: 'License validity', type: 'date',
    terms: ['license validity', 'licence validity', 'license expiry date', 'licence expiry date', 'license valid until', 'validity of license', 'validity'] });

  /* ---------------- Contact ---------------- */
  add({ key: 'mobile', group: 'contact', label: 'Mobile number', typeHint: 'tel',
    terms: ['mobile number', 'mobile no', 'mobile', 'phone number', 'phone no', 'phone', 'cell phone', 'cell number', 'contact number', 'contact no', 'মোবাইল নম্বর', 'মোবাইল'] });
  add({ key: 'mobile_confirm', group: 'contact', label: 'Confirm mobile (auto = mobile)', derived: true,
    terms: ['confirm mobile number', 'confirm mobile no', 'confirm mobile', 're enter mobile number', 'retype mobile number', 'confirm phone number', 'confirm phone'] });
  add({ key: 'email', group: 'contact', label: 'Email', typeHint: 'email',
    terms: ['email', 'e-mail', 'email address', 'email id', 'ইমেইল', 'ই-মেইল'] });
  add({ key: 'email_confirm', group: 'contact', label: 'Confirm email (auto = email)', derived: true,
    terms: ['confirm email', 'confirm email address', 're enter email', 'retype email', 'confirm e-mail'] });

  /* ---------------- Addresses ---------------- */
  const ADDR = [
    ['care_of', 'Care of', ['care of', 'c/o', 'care off', 'কেয়ার অফ', 'মারফত']],
    ['village', 'Village / Road / House / Flat (full address)', ['village road house flat', 'village road house', 'village', 'house', 'road', 'street address', 'address line 1', 'address line', 'address', 'গ্রাম বাসা রাস্তা ডাকঘর', 'গ্রাম বাসা রাস্তা', 'গ্রাম', 'বাসা', 'রাস্তা']],
    ['division', 'Division', ['division', 'বিভাগ']],
    ['district', 'District', ['district', 'zila', 'জেলা']],
    ['upazila', 'Upazila / P.S.', ['upazila p.s.', 'upazila', 'upazilla', 'thana', 'police station', 'sub district', 'উপজেলা', 'থানা']],
    ['post_office', 'Post office', ['post office', 'p.o.', 'ডাকঘর']],
    ['post_code', 'Post code', ['post code', 'postal code', 'zip code', 'zip', 'postcode', 'পোস্ট কোড', 'পোস্টকোড']]
  ];
  ['present', 'permanent'].forEach(function (sec) {
    ADDR.forEach(function (a) {
      add({ key: sec + '_' + a[0], group: sec, section: sec, label: a[1], terms: a[2], type: a[0] === 'village' ? 'textarea' : 'text' });
    });
  });
  add({ key: 'same_address', group: 'permanent', label: 'Permanent address same as present', type: 'bool', anySection: true, elTypes: ['checkbox'],
    terms: ['same as present address', 'same as present', 'permanent address same as present', 'same address', 'same as current address'] });

  /* ---------------- Education ---------------- */
  const EDU_KINDS = {
    exam:       ['Examination / degree', ['পরীক্ষার নাম', 'পরীক্ষা', 'ডিগ্রি', 'examination', 'exam', 'exam name', 'name of exam', 'name of examination', 'exam degree', 'level of education', 'education level', 'degree title', 'degree name', 'examination degree title']],
    board:      ['Board', ['বোর্ড', 'board', 'education board', 'board university', 'board of education']],
    institute:  ['Institute / University', ['প্রতিষ্ঠানের নাম', 'প্রতিষ্ঠান', 'বিশ্ববিদ্যালয়', 'মহাবিদ্যালয়', 'বিদ্যালয়', 'কলেজ', 'স্কুল', 'university inst', 'university institute', 'university institution', 'university', 'institute', 'institution', 'institution name', 'school college', 'school', 'college', 'name of institution', 'university name', 'college name', 'school name', 'institute name']],
    roll:       ['Roll no', ['রোল নম্বর', 'রোল নং', 'রোল', 'roll no', 'roll number', 'roll']],
    reg:        ['Registration no', ['রেজিস্ট্রেশন নম্বর', 'রেজিস্ট্রেশন নং', 'রেজিস্ট্রেশন', 'registration no', 'registration number', 'reg no', 'reg number']],
    group:      ['Group / subject', ['গ্রুপ', 'বিষয় গ্রুপ', 'বিভাগ', 'group subject', 'group', 'subject group', 'group or subject', 'group department']],
    subject:    ['Subject / degree', ['বিষয়ের নাম', 'বিষয়', 'subject degree', 'subject', 'major', 'major subject', 'department', 'discipline', 'degree subject', 'field of study', 'subject name']],
    result_type:['Result type (e.g. GPA(out of 5))', ['ফলাফলের ধরন', 'result type', 'grade type', 'gpa type', 'cgpa type', 'grading system']],
    result:     ['Result (GPA / marks / status)', ['ফলাফল', 'জিপিএ', 'সিজিপিএ', 'গ্রেড', 'result', 'gpa cgpa', 'cgpa', 'gpa', 'grade', 'marks', 'class division', 'result gpa', 'gpa cgpa division']],
    year:       ['Passing year', ['পাশের সন', 'পাসের সন', 'পাশের বছর', 'পাসের বছর', 'উত্তীর্ণের সাল', 'সাল', 'passing year', 'year of passing', 'pass year', 'passing yr', 'year', 'graduation year', 'year of graduation']],
    duration:   ['Course duration', ['কোর্সের মেয়াদ', 'মেয়াদ', 'course duration', 'duration', 'duration of course', 'years of study']]
  };
  const EDU = {
    jsc:     ['exam', 'board', 'institute', 'roll', 'reg', 'group', 'result_type', 'result', 'year'],
    ssc:    ['exam', 'board', 'institute', 'roll', 'reg', 'group', 'result_type', 'result', 'year'],
    hsc:     ['exam', 'board', 'institute', 'roll', 'reg', 'group', 'result_type', 'result', 'year'],
    honors:  ['exam', 'institute', 'subject', 'roll', 'reg', 'result_type', 'result', 'year', 'duration'],
    masters: ['exam', 'institute', 'subject', 'roll', 'reg', 'result_type', 'result', 'year', 'duration']
  };
  const EDU_EXAM_DEFAULT = { jsc: 'JSC/Equivalent Level', ssc: 'S.S.C', hsc: 'H.S.C', honors: 'Honors', masters: 'Masters' };
  Object.keys(EDU).forEach(function (sec) {
    EDU[sec].forEach(function (k) {
      const def = EDU_KINDS[k];
      const f = { key: sec + '_' + k, group: sec, section: sec, label: def[0], terms: def[1] };
      if (k === 'result_type') f.options = ['GPA(out of 5)', 'GPA(out of 4)', 'CGPA(out of 4)', 'CGPA(out of 5)', 'First Division', 'Second Division', 'Third Division', 'Passed'];
      if (k === 'exam') f.placeholder = EDU_EXAM_DEFAULT[sec];
      add(f);
    });
  });

  /* date of birth split into three dropdowns (day / month / year) */
  add({ key: 'dob_day', group: 'personal', label: 'Birth day (auto from date of birth)', derived: true, elTypes: ['select'],
    terms: ['day', 'birth day', 'dob day', 'date of birth day', 'দিন', 'জন্ম দিন', 'dd'] });
  add({ key: 'dob_month', group: 'personal', label: 'Birth month (auto)', derived: true, elTypes: ['select'],
    terms: ['month', 'birth month', 'dob month', 'date of birth month', 'মাস', 'জন্ম মাস', 'mm'] });
  add({ key: 'dob_year', group: 'personal', label: 'Birth year (auto)', derived: true, elTypes: ['select'],
    terms: ['year', 'birth year', 'dob year', 'year of birth', 'date of birth year', 'বছর', 'জন্ম বছর', 'yyyy'] });

  /* "Level" dropdown of single-qualification forms (value comes from the qualification being filled) */
  add({ key: 'edu_level', group: 'misc', label: 'Qualification level (auto)', derived: true, anySection: true, elTypes: ['select'],
    terms: ['পর্যায়', 'level', 'education level', 'level of education', 'degree level', 'exam level', 'শিক্ষার স্তর', 'শিক্ষাস্তর', 'স্তর', 'qualification level', 'level of study', 'qualification'] });

  /* ---------------- Misc ---------------- */
  add({ key: 'quota', group: 'misc', label: 'Quota', options: ['Not Applicable'], terms: ['quota', 'quota type', 'কোটা'] });
  add({ key: 'departmental_status', group: 'misc', label: 'Departmental status', options: ['Not Applicable'],
    terms: ['departmental status', 'department status', 'govt employee status', 'government employee'] });

  /* ---------------- Experience (repeating; stored in data.experience[]) ---------------- */
  const EXP = [
    ['type', 'Employed on / type', ['employed on', 'employment type', 'employer type', 'job type', 'sector'], 'text'],
    ['org', 'Organization', ['প্রতিষ্ঠানের নাম', 'প্রতিষ্ঠান', 'organization', 'organisation', 'company', 'employer', 'organization name', 'company name', 'institution'], 'text'],
    ['business', 'Organization business / type', ['organization business', 'business type', 'organization type', 'nature of business', 'industry', 'type of business'], 'text'],
    ['designation', 'Designation / post', ['পদবী', 'পদবি', 'পদ', 'designation post', 'designation', 'post', 'position', 'job title', 'post name', 'title'], 'text'],
    ['department', 'Department', ['ডিপার্টমেন্ট', 'বিভাগ', 'department', 'dept', 'division'], 'text'],
    ['address', 'Organization address / location', ['প্রতিষ্ঠানের ঠিকানা', 'address', 'organization address', 'organization location', 'company address', 'office address', 'location'], 'text'],
    ['from', 'From date', ['শুরুর তারিখ', 'যোগদানের তারিখ', 'length of service', 'from', 'start date', 'joining date', 'date from', 'from date'], 'date'],
    ['to', 'To date', ['শেষ তারিখ', 'ছাড়ার তারিখ', 'to', 'end date', 'leaving date', 'date to', 'till', 'to date'], 'date'],
    ['current', 'Currently working', ['বর্তমানে কর্মরত', 'currently working', 'current job', 'presently working', 'still working', 'current'], 'bool'],
    ['description', 'Job description', ['কাজের বিবরণ', 'দায়িত্ব', 'job description', 'description', 'responsibilities', 'duties', 'job responsibilities'], 'textarea']
  ];
  EXP.forEach(function (e) {
    add({ key: 'exp_' + e[0], group: 'exp', section: 'exp', label: e[1], terms: e[2], type: e[3], repeat: true, prop: e[0] });
  });

  const byKey = {};
  fields.forEach(function (f) { byKey[f.key] = f; });

  g.JAF_SCHEMA = {
    SECTIONS: SECTIONS,
    SECTION_ORDER: SECTION_ORDER,
    GROUPS: GROUPS,
    fields: fields,
    byKey: byKey,
    EXP_PROPS: EXP.map(function (e) { return { prop: e[0], label: e[1], type: e[3] }; }),
    EDU_KINDS: ['exam', 'board', 'institute', 'roll', 'reg', 'group', 'subject', 'result_type', 'result', 'year', 'duration'],
    EDU_SECTIONS: ['jsc', 'ssc', 'hsc', 'honors', 'masters'],
    EDU_LEVEL_NAME: { jsc: 'JSC/Equivalent', ssc: 'SSC/Equivalent', hsc: 'HSC/Equivalent', honors: 'Honors', masters: 'Masters' },
    VIRTUAL_KEYS: [
      { key: 'edu_level', label: 'Qualification form: level (SSC / HSC / Honors…)' },
      { key: 'edu_exam', label: 'Qualification form: exam / degree name' },
      { key: 'edu_board', label: 'Qualification form: board' },
      { key: 'edu_institute', label: 'Qualification form: institute name / address' },
      { key: 'edu_roll', label: 'Qualification form: roll no' },
      { key: 'edu_reg', label: 'Qualification form: registration no' },
      { key: 'edu_group', label: 'Qualification form: group' },
      { key: 'edu_subject', label: 'Qualification form: subject' },
      { key: 'edu_result_type', label: 'Qualification form: result type' },
      { key: 'edu_result', label: 'Qualification form: result (GPA / marks)' },
      { key: 'edu_year', label: 'Qualification form: passing year' },
      { key: 'edu_duration', label: 'Qualification form: course duration' },
      { key: 'applicable_masters', label: '"If applicable" checkbox – Masters' },
      { key: 'applicable_honors', label: '"If applicable" checkbox – Honors' },
      { key: 'applicable_exp', label: '"If applicable" checkbox – Experience' }
    ],
    DEFAULT_MODEL: 'gemini-2.5-flash'
  };
})(typeof self !== 'undefined' ? self : this);
