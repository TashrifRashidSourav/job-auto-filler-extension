/* Stand-in for the browser extension APIs so the real extension pages/scripts can be rendered for store screenshots.
 * All data below is fictional. */
(function () {
  var DATA = {
    name_en: 'Rahim Uddin', name_bn: 'রহিম উদ্দিন', father_en: 'Abdul Karim', father_bn: 'আব্দুল করিম', mother_en: 'Salma Khatun', mother_bn: 'সালমা খাতুন',
    dob: '1998-08-15', gender: 'Male', religion: 'Islam', nationality: 'Bangladeshi', marital_status: 'Single', blood_group: 'B+',
    nid: '1234567890', mobile: '01700000001', email: 'rahim@example.com',
    present_care_of: 'Abdul Karim', present_village: 'House 12, Road 3, Sample Para', present_district: 'Kushtia', present_upazila: 'Daulatpur',
    present_post_office: 'Kushtia Sadar', present_post_code: '7000', same_address: true,
    ssc_exam: 'S.S.C', ssc_board: 'Jashore', ssc_roll: '100001', ssc_group: 'Science', ssc_result_type: 'GPA(out of 5)', ssc_result: '5.00', ssc_year: '2014',
    hsc_exam: 'H.S.C', hsc_board: 'Jashore', hsc_roll: '100002', hsc_group: 'Science', hsc_result_type: 'GPA(out of 5)', hsc_result: '4.90', hsc_year: '2016',
    honors_exam: 'Honors', honors_institute: 'Sample University', honors_subject: 'Computer Science', honors_result_type: 'CGPA(out of 4)', honors_result: '3.50', honors_year: '2021', honors_duration: '4 Years',
    experience: [{ org: 'Example Tech Ltd', designation: 'Software Engineer', from: '2022-01-01', to: '2024-06-30', description: 'Built internal tools and automated reporting for the operations team.' }],
    extra: {}
  };
  var store = {
    profiles: { p1: { id: 'p1', name: 'My profile', data: DATA } },
    activeProfileId: 'p1',
    settings: { watchSteps: false, overwrite: true },
    siteRules: {}
  };
  window.chrome = {
    storage: { local: { get: function (k, cb) { cb(JSON.parse(JSON.stringify(store))); }, set: function (o, cb) { Object.assign(store, o); cb && cb(); } } },
    runtime: { onMessage: { addListener: function () {} }, sendMessage: function () { return Promise.resolve({ ok: false }); }, openOptionsPage: function () {} },
    tabs: { query: function () { return Promise.resolve([{ id: 1 }]); } },
    permissions: { contains: function (o, cb) { cb(false); }, request: function (o, cb) { cb && cb(); } }
  };
})();
