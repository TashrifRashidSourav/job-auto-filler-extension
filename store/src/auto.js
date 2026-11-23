/* Drives the real settings page for screenshots (demo data only). */
(function () {
  // the composition already has its own headline, so hide the page's own banner in these shots
  if (location.hash === '#profile' || location.hash === '#import') { var st = document.createElement('style'); st.textContent = '.hero{display:none!important}'; document.head.appendChild(st); }
  var SAMPLE = ["Name: Rahim Uddin", "Father's Name: Abdul Karim", "Mother's Name: Salma Khatun", "Date of Birth: 1998-08-15", "Gender: Male", "Mobile: 01700000001", "Email: rahim@example.com",
    "SSC", "Roll: 100001", "Board: Dhaka", "Passing Year: 2014", "HSC", "Roll: 100002", "Board: Dhaka", "Passing Year: 2016"].join('\n');
  setTimeout(function () {
    if (location.hash === '#import') {
      document.querySelector('[data-tab="import"]').click();
      document.getElementById('pasteText').value = SAMPLE;
      document.getElementById('analyze').click();
      setTimeout(function () { var r = document.getElementById('review'); window.scrollTo(0, document.getElementById('importMsg').getBoundingClientRect().top + window.scrollY - 40); }, 700);
    }
  }, 800);
})();
