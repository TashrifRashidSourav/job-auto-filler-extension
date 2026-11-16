<p align="center"><img src="extension/icons/icon512.png" width="110" alt="Job Auto Filler logo"></p>

<h1 align="center">Job Auto Filler</h1>
<p align="center"><i>Fill job applications in seconds - offline-first, optional Gemini AI, English + Bangla.</i><br><sub>Powered by <b>Corvas</b></sub></p>


Fills job-application forms from a profile you save once. Works **fully offline**; a **Gemini API key is optional** and only adds smarter matching and free-form document import.

## Install (unpacked)
1. Open `chrome://extensions` (or `edge://extensions`), turn on **Developer mode**.
2. Click **Load unpacked** and choose the [extension](extension/) folder.
3. Pin the extension. Click it → **Edit profile & settings**.

## Use
1. **Profile tab**: type your details, or go to **Import** and load a CSV / JSON / TXT / DOCX (and PDF / image / CV with a Gemini key). Review the mapping, then save.
2. Open a job form → click the extension → **Fill this form** (or press `Alt+Shift+F`).
   - **Preview matches, then fill** (`Alt+Shift+P`) shows every detected field (green = confident, yellow = unsure, red = unmatched, grey = no data). Change a mapping from the dropdown; it is remembered for that website (see **Site rules**).
3. Review the form and submit it yourself. The extension never submits.

## How fields are detected
Labels (including table-style "label | input" layouts), `aria-label`, placeholder, `name`/`id`, and the **section heading** (SSC / HSC / Graduation / Masters / Present / Permanent / Experience) are combined and matched against an English + Bangla dictionary ([extension/data/schema.js](extension/data/schema.js)). Dropdowns are matched fuzzily (e.g. Jessore ↔ Jashore, falls back to "Other" for institute/board). It also handles dependent dropdowns (District → Upazila), "Same as present address", "If applicable" checkboxes, and repeating experience blocks (clicks **ADD MORE**). Fields still unmatched go to Gemini if a key is set (labels only, never your values).

## CSV format
Two-column `field,value` (see Import → *Download CSV template*), or a wide file with headers in row 1 and values in row 2. Headers like `Full Name`, `SSC Roll`, `Father Name` are understood; experience uses `exp_1_org`, `exp_1_designation`, `exp_2_org`, … Unknown columns are kept as **Extra details**, which also fill forms whose label matches.

## Gemini (optional)
Settings → paste a key from Google AI Studio → Test. Stored only in this browser (`chrome.storage.local`) and used only from the extension's background/settings pages. The model name is configurable (default `gemini-2.5-flash`).

## Tests
```
cd tests && npm install && node run.js && node importtest.js
```
`run.js` loads the real extension scripts into jsdom against a portal-like fixture.

## Hard cases it handles
| Situation | What it does |
|---|---|
| Custom dropdowns (react-select, Select2, Chosen, Ant, MUI, Material, Choices, Tom Select, bootstrap-select, `role=combobox`) | Detects them by ARIA role **or** known class names, opens them, picks the option; searches / scrolls long lists; keyboard fallback |
| Hidden native `<select>` behind a widget | Fills the real select, then checks the visible widget updated; if not, drives the widget |
| Site shows Bangla options, profile is English (or vice-versa) | Built-in dictionary (districts, boards, religion, gender, results…), sound-based matching for names (Alamdanga ⇄ আলমডাঙ্গা), optional Gemini pick |
| "Add one qualification" forms (level dropdown, no SSC/HSC headings) | Fills the qualification you choose in the popup; "Auto" goes SSC → HSC → Honors on each click |
| Readonly date pickers, odd date formats | Reads the format from `placeholder` / `data-date-format` / `pattern`; temporarily lifts `readonly` |
| Day / Month / Year as three dropdowns | Splits the date of birth (month names in English or Bangla) |
| Masked / validating inputs that revert pasted values | Verifies after filling and retypes character by character |
| Phone fields (+880 / national / local) | Chooses the format from placeholder / maxlength |
| Autosuggest inputs (Places, typeahead) | Clicks the matching suggestion |
| Styled radios / checkboxes (input hidden), ARIA radiogroups and switches | Clicks the visible label / element |
| Rich-text editors (`contenteditable`) | Types into them |
| Dependent / late-loading fields | Waits until the page is quiet, then repeats passes |
| Multi-step wizards | After one fill, a chip appears when new fillable fields show up on the next step |
| Forms inside iframes | Same-origin: automatic. Other domains: Settings → "Allow on all sites" |
| Anything unmatched | Preview → pick the right field once (remembered per site); **Copy report** gives a value-free diagnostic to share; rules can be exported/imported |

It deliberately never ticks declaration / terms checkboxes, uploads files, or submits - it tells you what it left for you.

## Limits
- Cannot run on `chrome://` pages, the Web Store, or the built-in PDF viewer; cross-origin iframes are not scanned.
- PDF / image import needs a Gemini key (DOCX, TXT, CSV, JSON work offline).
- Sites with unusual widgets (custom div-based dropdowns) may need a manual fill for those fields.
