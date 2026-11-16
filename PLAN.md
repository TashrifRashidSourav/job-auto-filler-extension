# Job Auto Filler – Browser Extension Plan

A Chrome/Edge (Manifest V3) extension that fills job application forms from a saved personal profile. It works **fully offline without any API key**. A **Gemini API key is optional** and only makes things smarter (document parsing, hard-to-match fields).

---

## 1. Goals

1. Store one reusable **profile** (name, Bangla name, parents, DOB, NID, contacts, address, education, experience, etc.).
2. **Auto-detect form fields** on any website even when HTML tags/ids/names differ.
3. Fill the form with one click (text, select, radio, checkbox, date, textarea).
4. **Import data** from CSV, JSON, and (optionally with AI) free-form documents (PDF/DOCX/TXT/CV).
5. Optional Gemini key, entered by the user in the UI, used for extraction + smarter field matching.
6. Everything saved locally; the user stays in control (preview before fill, nothing auto-submitted).

### Non-goals
- No auto-submit, no payment, no CAPTCHA bypass.
- No backend server; all data stays in the browser.

---

## 2. Tech Stack

| Part | Choice | Why |
|---|---|---|
| Platform | Chrome Extension MV3 (works on Edge/Brave too) | Easiest to build, test, distribute |
| UI | Plain HTML/CSS/JS, or Preact + Vite (optional) | Small, no heavy framework needed |
| Storage | `chrome.storage.local` | Persistent, local, private |
| CSV | PapaParse | Robust CSV parsing |
| PDF text | pdf.js | Extract text from PDF CV |
| DOCX text | mammoth.js | Extract text from DOCX |
| Fuzzy match | Fuse.js or own token-similarity | Offline label matching |
| AI (optional) | Gemini REST API (`generativelanguage.googleapis.com`) | User-provided key |

---

## 3. Architecture

```
┌────────────────────────── Extension ──────────────────────────┐
│ Popup (quick actions)    Options page (profile, import, key)  │
│        │                          │                           │
│        └──────────┬───────────────┘                           │
│                   ▼                                           │
│        Service Worker (background)                            │
│   - storage access   - Gemini calls (key never hits page)     │
│   - message router                                            │
│                   ▲                                           │
│                   │ chrome.runtime messages                   │
│        Content Script (injected in the job page)              │
│   - scan fields  - match to profile  - fill  - highlight      │
└───────────────────────────────────────────────────────────────┘
```

Key rule: **the API key and Gemini calls live only in the service worker/options page**, never in the content script, so the website's JS can't read the key.

### Folder structure
```
job-auto-filler/
├─ manifest.json
├─ background/
│  └─ service-worker.js        # messaging, Gemini calls
├─ content/
│  ├─ scanner.js               # find fields + extract labels
│  ├─ matcher.js               # field -> profile key
│  ├─ filler.js                # set values + fire events
│  └─ overlay.js               # preview/highlight UI
├─ popup/                      # Fill button, status, profile picker
├─ options/                    # Profile editor, import, settings, key
├─ lib/                        # papaparse, pdfjs, mammoth, fuse
├─ data/
│  ├─ schema.js                # canonical profile keys
│  ├─ synonyms.js              # label dictionary (EN + BN)
│  └─ sample-profile.csv
└─ PLAN.md
```

---

## 4. Profile Data Model

Canonical keys (flat keys + arrays for repeating sections):

```jsonc
{
  "personal": {
    "name_en": "", "name_bn": "",
    "father_en": "", "father_bn": "",
    "mother_en": "", "mother_bn": "",
    "dob": "1999-03-10",
    "nationality": "Bangladeshi", "religion": "", "gender": "",
    "marital_status": "",
    "nid": "", "birth_reg": "", "passport": "",
    "quota": "Not Applicable"
  },
  "contact": { "mobile": "", "email": "" },
  "address": {
    "present":   { "care_of": "", "village_road": "", "district": "", "upazila": "", "post_office": "", "post_code": "" },
    "permanent": { "same_as_present": true, "...": "" }
  },
  "education": [
    { "level": "SSC", "exam": "S.S.C", "board": "Jashore", "roll": "", "group": "Science",
      "result_type": "GPA", "result": "5.00", "scale": 5, "year": "2017" },
    { "level": "HSC", "...": "" },
    { "level": "Honors", "institute": "", "subject": "", "result": "", "year": "", "duration": "04 Years" },
    { "level": "Masters", "...": "" }
  ],
  "experience": [
    { "org": "", "designation": "", "address": "", "from": "", "to": "", "current": false, "description": "" }
  ],
  "extra": { "any custom key": "value" }
}
```

- **Multiple profiles** supported (e.g. "Me", "Sibling").
- `extra` holds unknown/custom fields so nothing from an import is lost.
- Dates stored as ISO `YYYY-MM-DD`; formatted per field at fill time (the form in your screenshots uses `MM/DD/YYYY` date inputs).

---

## 5. Field Detection (the hard part) – Layered Approach

Every site differs, so detection runs in layers, from cheapest/most certain to AI fallback.

### Layer 1 – Scan
Collect all `input, select, textarea` (skip hidden/disabled/submit). Also handle:
- Shadow DOM and same-origin iframes.
- Fields added later (SPA, "ADD MORE" buttons) via `MutationObserver`.

### Layer 2 – Build a "field descriptor"
For each element gather every text clue:
1. `<label for=id>` / wrapping `<label>`
2. `aria-label`, `aria-labelledby`
3. `placeholder`, `title`, `name`, `id`, `autocomplete`
4. **Nearby text**: previous sibling cells/rows (the form in the screenshots uses a table-like layout: label on the left, input on the right → look at the left cell / previous element text)
5. Section heading (e.g. "SSC/Equivalent Level", "Present Address", "Permanent Address") – **crucial** to tell SSC roll vs HSC roll vs address post code
6. Input `type` (`email`, `tel`, `date`, `number`), `<select>` option texts

### Layer 3 – Rule-based matching (offline, no key)
- Normalize text (lowercase, strip punctuation, Bangla digit → English digit).
- Match against `synonyms.js`, e.g.
  - `name_en`: "applicant's name", "full name", "name of applicant", "your name"
  - `name_bn`: "আবেদনকারীর নাম", "name (bangla)", "নাম (বাংলায়)"
  - `father_en`: "father's name", "father name"; `father_bn`: "পিতার নাম"
  - `mobile`: "mobile", "phone", "cell", "contact number"
  - `nid`: "national id", "nid number", "এনআইডি"
- **Context scoring**: final score = label match + section heading match + type match + name/id match. Section heading decides the group: `SSC` → `education[SSC]`, `Present Address` → `address.present`.
- Pick best match above threshold; ambiguous/low score → mark "uncertain".
- Language hints: Bangla script in label → use `_bn` variant; `type=email` → email, etc.

### Layer 4 – Smart `<select>` handling
- Match profile value to option text/value: exact → case-insensitive → fuzzy (e.g. "Jashore" vs "Jessore", "Female" vs "F").
- Alias table for known aliases (district names, boards, "GPA(out of 5)" vs "CGPA").
- **Dependent dropdowns** (District → Upazila): fill District, fire `change`, **wait** for Upazila options to load (poll/MutationObserver), then fill Upazila.
- Conditional fields (National ID "Yes" → number field appears): fill in order, re-scan after each change.

### Layer 5 – Learning from the user
- If the user manually corrects a mapping (via the preview overlay), save a **site rule**: `hostname + field signature → profile key`. Next visit it's instant and 100% correct.
- Site rules are exportable/importable (shareable between friends applying to the same portal).

### Layer 6 – Gemini fallback (optional)
Only for fields still "uncertain" after layers 3–5 and only if a key is set:
- Send **only** field descriptors (labels, options, type) + the list of available profile keys – **not** the actual personal values.
- Gemini returns `{fieldId: profileKey}` as JSON.
- Result cached as a site rule so the AI is called once per site/form.

---

## 6. Filling Reliably

Modern forms (React/Angular/Vue) ignore plain `el.value = x`. The filler must:
- Use the **native setter** (`Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set`) then dispatch `input`, `change`, and `blur` events (bubbles: true).
- Date inputs: set as `YYYY-MM-DD` (that's what `type=date` requires regardless of the displayed MM/DD/YYYY).
- Checkboxes/radios: `.click()` so framework handlers run (e.g. "Same as Present Address" – then **don't** fill permanent address separately).
- Selects: set `selectedIndex` + dispatch `change`.
- Skip fields already filled unless "overwrite" is on; skip `readonly`/`disabled` fields.
- Repeating blocks (Job Experience "ADD MORE"): click add button as many times as needed, then fill each block in order.
- Fill order = top to bottom, with small delays/awaits for dependent fields.
- Bangla text: no special handling needed (UTF-8), but warn if a Bangla field gets an English-only value.

---

## 7. Importing Data

### 7.1 CSV (no key needed)
- Two supported shapes:
  1. **Key-Value**: columns `field,value` (e.g. `name_en,RAHIMA BEGUM`).
  2. **Wide/Row**: first row headers = keys, second row = values.
  3. **Education/Experience tables**: separate rows with a `level` or `section` column.
- Header names are run through the same synonym matcher, so `Full Name`, `Name`, `applicant name` all map to `name_en`.
- Import preview screen: shows "CSV column → profile key" mapping; user can fix before saving. Unknown columns go to `extra`.
- Provide a downloadable **template CSV** and **Export profile to CSV/JSON** button.

### 7.2 JSON
- Direct import/export of the full profile (also used for backup).

### 7.3 Document (PDF/DOCX/TXT) – no key (basic)
- Extract text, then run regex/heuristics: email regex, BD phone regex (`01[3-9]\d{8}`), NID digit lengths (10/13/17), dates, `Label: value` lines.
- Everything unrecognized is shown to the user to assign manually.

### 7.4 Document – with Gemini key (smart)
- Extract text locally (pdf.js/mammoth), send text to Gemini with a **structured-output prompt** + the profile JSON schema, `responseMimeType: application/json`.
- Handles missing or extra info: missing → left empty; extra → goes into `extra`.
- Result opens in the **review screen** (editable) before saving. The user always approves.
- Scanned image PDFs/photos: send as image/inline data to Gemini (multimodal) – only with key.

---

## 8. Gemini Integration (optional)

- Options page: "Gemini API key" input + **Test key** button + **Remove key** button. Clear text: "Optional. Without it, the extension still works using built-in matching."
- Stored in `chrome.storage.local` (not `sync`, so it doesn't leave the device). Never logged, never sent anywhere except Google's endpoint.
- Calls made from the service worker only; model name configurable (default a fast, cheap Gemini Flash model).
- Handle: invalid key, quota/rate limit (429 → friendly message + retry/backoff), network failure, malformed JSON (validate and retry once).
- Privacy toggles:
  - "Send field labels to AI for matching" (never values)
  - "Use AI to parse documents"
- Show a short disclosure the first time: document text is sent to Google when you use AI import.
- Every AI feature has a non-AI fallback, so the extension never breaks without a key.

---

## 9. UX Flows

**First run**
1. Open Options → create profile (manual form / import CSV / import document).
2. Review and save.

**Filling**
1. User opens a job form → clicks extension icon → **Fill form** (or keyboard shortcut / floating button on the page).
2. Extension scans, matches, and shows an **overlay preview**: fields highlighted green (confident), yellow (uncertain), red (not found). 
3. User can click a field to choose the correct profile key (saved as a site rule).
4. Click **Confirm** → filled. User reviews and submits manually.

**Popup**: profile selector, Fill button, "X of Y fields matched", overwrite toggle, settings link.

---

## 10. Security & Privacy

- All data local (`chrome.storage.local`); no analytics, no servers.
- Minimal permissions: `storage`, `activeTab`, `scripting`; host permissions only for `https://generativelanguage.googleapis.com/*`. Inject content script on user click (via `activeTab`) rather than `<all_urls>` if possible; otherwise offer an "enable on this site" toggle.
- Warn that NID/passport/birth-reg data is sensitive; optional **passphrase encryption** of the stored profile (WebCrypto AES-GCM) – Phase 5.
- Never auto-submit; never fill password fields; ignore fields with `autocomplete=off` payment/card inputs.
- Sanitize everything inserted into the overlay (no `innerHTML` with page text).

---

## 11. Implementation Phases

### Phase 0 – Setup (0.5 day)
- Repo, `manifest.json` (MV3), load unpacked in Chrome, hot-reload script.

### Phase 1 – MVP, no API key (3–4 days)
- Profile schema + Options page editor + storage.
- Scanner + label extraction (Layers 1–2).
- Synonym matcher EN + BN (Layer 3).
- Filler for text/select/radio/checkbox/date with framework-safe events.
- Popup "Fill form" button.
- **Test target**: the job portal form from your screenshots (name, Bangla name, parents, DOB, gender, NID, mobile, email, addresses, SSC/HSC/Honors).

### Phase 2 – Reliability (3 days)
- Section-heading context (SSC vs HSC vs Present/Permanent).
- Smart select matching + dependent dropdowns + "Same as present address".
- Repeating sections (education rows, job experience "ADD MORE").
- Overlay preview with confidence colors + manual correction.
- Site rules saved per hostname.

### Phase 3 – Import/Export (2–3 days)
- CSV import with mapping preview + template download.
- JSON import/export.
- Text/PDF/DOCX extraction with regex heuristics.

### Phase 4 – Gemini (optional) (2–3 days)
- Key settings UI + test.
- AI document → profile extraction with review screen.
- AI field-matching fallback with caching into site rules.
- Error/rate-limit handling, privacy toggles.

### Phase 5 – Polish (2 days)
- Multiple profiles, optional encryption, keyboard shortcut, floating button, onboarding, Bangla/English UI labels, icons, README, Chrome Web Store package (or share as unpacked/zip).

---

## 12. Testing Strategy

- **Fixture pages**: save 5–10 real/sample job forms as local HTML (table layout, label-for layout, placeholder-only, React-style controlled inputs, Bangla labels, shadow DOM) and run the matcher against them; assert expected `field → key` mapping (unit tests with Vitest/Jest + jsdom).
- Matching accuracy metric: % fields correctly mapped per fixture; target ≥ 90% without AI, ≥ 97% with AI.
- Manual end-to-end on the real portal, including date, dependent District → Upazila, and the "Same as Present Address" checkbox.
- Test with no key, invalid key, and rate-limited key.
- CSV edge cases: BOM, quoted commas, Bangla text (UTF-8), missing columns, extra columns.

---

## 13. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Sites with unusual markup | Layered detection + user corrections saved as site rules + AI fallback |
| Framework ignores filled values | Native setter + event dispatch; verify after fill and retry |
| Dropdown option names differ ("Jashore"/"Jessore") | Alias table + fuzzy match |
| Dependent/late-loading dropdowns | Await options with MutationObserver + timeout |
| AI returns wrong/invalid JSON | Schema validation, retry once, always user review |
| Sensitive data exposure | Local-only, optional encryption, send labels not values to AI |
| Gemini API/model changes | Model name configurable; isolate API code in one module |
| Wrong data submitted | Preview + no auto-submit |

---

## 14. Suggested Next Step

Start **Phase 0 + Phase 1**: scaffold the extension and get the form from your screenshots filling correctly with the offline matcher. I can build that scaffold next, if you want to go ahead.
