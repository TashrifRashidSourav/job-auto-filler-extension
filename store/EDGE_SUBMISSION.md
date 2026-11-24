# Publishing Job Application Autofill on Microsoft Edge Add-ons

Everything below is ready to copy and paste. Limits and sizes come from Microsoft's page
["Publish a Microsoft Edge extension"](https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/publish-extension).

## 0. What is in this folder

| What | Where | Notes |
|---|---|---|
| **Package to upload** | `dist/job-application-autofill-1.0.0.zip` | Rebuild any time with `npm run package` |
| **Extension logo** (required) | `store/edge/store-logo-300x300.png` | 300x300, transparent PNG (Microsoft: 300x300 recommended, 128x128 minimum) |
| **Screenshots** (up to 6) | `store/edge/screenshots/01…06-*.png` | All exactly 1280x800 |
| **Small promotional tile** (optional) | `store/edge/promo-small-440x280.png` | 440x280 |
| **Large promotional tile** (optional) | `store/edge/promo-large-1400x560.png` | 1400x560 PNG |
| **Privacy policy** | `PRIVACY.md` (needs a public URL, see step 4) | Required because the extension handles personal details |

Regenerate all images from the real UI with `npm run assets` (needs `npm install` once and Chrome or Edge installed).

---

## 1. Create the developer account (one time)

1. Go to the **Microsoft Edge Add-ons developer dashboard**: https://partner.microsoft.com/dashboard/microsoftedge/overview
2. Sign in with a Microsoft account and complete the **"Register as a Microsoft Edge extension developer"** form
   (publisher / developer name, country, contact email). Microsoft's page does not mention a registration fee.
3. Suggested **developer / publisher name:** `Corvas`

## 2. Create the submission

1. Dashboard → **Create new extension**.
2. **Upload package** → choose `dist/job-application-autofill-1.0.0.zip`. The name and short description are read from the manifest
   (`Job Application Autofill` / *Fill job application forms from your saved profile. Offline-first, optional Gemini AI. Powered by Corvas.*).

## 3. Availability and Properties

| Field | Enter |
|---|---|
| Visibility | **Public** |
| Markets | All markets (default) |
| Category | **Productivity** (choose the closest if the list differs) |
| Website | `https://github.com/TashrifRashidSourav/job-auto-filler-extension` |
| Support contact details | `https://github.com/TashrifRashidSourav/job-auto-filler-extension/issues` |
| Mature content | **No** (leave unticked) |

## 4. Privacy page

**Privacy policy URL** (must load publicly; push this repo first):

```
https://github.com/TashrifRashidSourav/job-auto-filler-extension/blob/main/PRIVACY.md
```

**Single purpose description** (paste):

> Job Application Autofill has one purpose: to fill job application forms on the page the user is viewing with details the user has saved themselves in the extension, only when the user asks.

**Permission justifications** (paste one per permission):

| Permission | Justification |
|---|---|
| `storage` | Saves the user's profile, settings and per-site field corrections on their own device. Nothing is synced or sent to the developer. |
| `activeTab` | Lets the extension read and fill the form on the tab the user is currently using, only after the user clicks the extension button or presses its shortcut. |
| `scripting` | Injects the form-reading and form-filling code into the active tab, only after the user asks. |
| `https://generativelanguage.googleapis.com/*` | Optional. Only used if the user enters their own Google Gemini API key, to call the Gemini API directly from their browser for smarter field matching or document import. |
| Optional access to all sites (`<all_urls>`, requested at runtime) | Never granted automatically. Only if the user presses "Allow on all sites & embedded forms" in Settings, so the extension can also fill application forms embedded from another website (iframes). It still acts only when the user clicks it. |

**Remote code:** **No.** All code is inside the package; nothing is downloaded or evaluated (no `eval`, no remote scripts).

**Data usage disclosure** - recommended answers (Partner Center's checkbox wording may differ slightly):

- The extension **handles personal information the user types in** (name, contact details, address, date of birth, ID numbers, education, work history) and an **optional API key**.
- All of it is **stored only on the user's device**; the developer receives **nothing**.
- Data is sent off the device **only** if the user adds a Gemini key and uses an AI feature, directly to Google (details in the privacy policy).
- It is **not sold**, **not used for advertising**, and **not used for anything unrelated** to filling forms.
- Answer **Yes** to "collects or handles personal information" so that the privacy policy URL is required and reviewed. Being honest here avoids a certification failure.

## 5. Store listing (English)

**Extension name** (from manifest, 43 characters): `Job Application Autofill – English & Bangla`

**Short description** (from manifest, 120 characters):
`Autofill job application forms in one click: resume, CV, education and experience. Private, offline, English and Bangla.`

**Description** (limit 250–10,000 characters; this is ~2,400):

```
Autofill job applications in one click. Save your resume / CV details once (name, parents' names, date of birth, ID numbers, contact information, addresses, education and work experience) and this job form filler recognises the fields on any job application form and fills them in for you.

It is built for the long, repetitive forms that government job portals and company career pages ask you to complete again and again - and it is one of the few autofill tools that works with both English and Bangla forms, including Bangladeshi government job application websites.

WHY YOU WILL LIKE IT
• One click: press "Fill this form" or Alt+Shift+F.
• Smart field detection: it reads labels, section headings and field types, so it works even when every website is built differently.
• Review first: "Preview matches" shows exactly what will go where. Fix a field once and it is remembered for that site.
• English and Bangla: fill Bangla forms from an English profile (and the other way round). Districts, boards, religion, gender, results and more are matched automatically, even names matched by sound.
• Handles dropdowns, searchable select boxes, date pickers, radio buttons, masked phone fields and multi-step forms.
• Education and experience: SSC / HSC / Honors / Masters sections, "add one qualification" forms and repeated job-experience blocks.
• Import your details from CSV, JSON, text or Word files. (Reading PDFs and photos uses the optional AI feature.)
• Multiple profiles, backup and restore, and shareable site rules.

PRIVATE BY DESIGN
• Your details stay in your browser. No account, no servers, no analytics, no ads.
• Works fully offline.
• Optional: add your own Google Gemini API key for smarter matching and for reading CVs. Only then are field labels (never your profile values), a single dropdown value, or the document you choose sent to Google - directly from your browser.
• It never submits a form, never ticks declaration or terms boxes and never uploads files. You stay in charge.

HOW TO USE
1. Click the extension icon, then "Edit profile & settings", and enter your details (or import a CSV).
2. Open a job application form.
3. Click the icon and choose "Fill this form" (or "Preview matches first").
4. Check the form and submit it yourself.

Not affiliated with Google, Microsoft or any job portal. "Gemini" is a trademark of Google LLC.

Powered by Corvas.
```

**Search terms** (max 7 terms, 30 characters each, 21 words total - these 7 use 20 words):

```
job application autofill
autofill job applications
resume autofill
cv autofill
job form filler
govt job apply bangladesh
bangla form filler
```

**Extension logo:** upload `store/edge/store-logo-300x300.png`

**Screenshots** (upload in this order; 6 maximum):

| # | File | Suggested caption |
|---|---|---|
| 1 | `01-fill-in-one-click.png` | Fill any job application in one click |
| 2 | `02-review-before-filling.png` | Review every match before it fills |
| 3 | `03-english-and-bangla.png` | English profile, Bangla form |
| 4 | `04-save-your-details-once.png` | Save your details once |
| 5 | `05-import-csv-word-cv.png` | Import from CSV, Word or a CV |
| 6 | `06-private-by-design.png` | Private by design |

**Small promotional tile:** `store/edge/promo-small-440x280.png`  
**Large promotional tile:** `store/edge/promo-large-1400x560.png`  
**Video:** none (optional, YouTube link only)

All screenshots use fictional demo data (a made-up person and a made-up company site).

## 6. Notes for certification (paste into the box before Publish)

```
How to test (no account or login needed):
1. Install the extension, click its toolbar icon, then "Edit profile & settings".
2. On the Profile tab type a name, email and phone number (or use Import -> paste text such as "Name: Test User" / "Email: test@example.com" and Save).
3. Open any web page that contains a form (for example any job application or contact form) and click the extension icon -> "Fill this form". The fields are filled; nothing is submitted.
4. "Preview matches first" shows a review panel before filling.

Notes:
- The extension works fully offline. AI features are optional and need the user's own Google Gemini API key; they are not needed to review the extension.
- It runs only on the tab the user activates (activeTab). The "all sites" permission is optional and only requested if the user presses a button in Settings.
- No remote code is loaded or executed. No data is sent to the developer; there are no servers or analytics.
- Privacy policy: https://github.com/TashrifRashidSourav/job-auto-filler-extension/blob/main/PRIVACY.md
```

## 7. Publish

Make sure every step shows **Complete**, then click **Publish**. Microsoft says certification can take **up to seven business days**.

---

## Checklist before you click Publish

- [ ] `npm run validate` prints `Validation : OK`
- [ ] Zip built from the latest code (`npm run package`) and re-uploaded if you changed anything
- [ ] The privacy-policy URL opens in a private/incognito window (the repo is public and `PRIVACY.md` is pushed)
- [ ] You tried the zip yourself: `edge://extensions` → Developer mode → **Load unpacked** (use the `extension/` folder), then fill a real form
- [ ] You are happy for the description to say "Powered by Corvas" and the developer name to be `Corvas`

## Releasing an update later

1. Edit the code, run `npm test`.
2. Raise `"version"` in `extension/manifest.json` (for example `1.0.1`). Edge rejects an update with the same or lower version.
3. `npm run release` (validates, builds the zip, regenerates the images).
4. Dashboard → your extension → **Update** → upload the new zip → Publish.

## Good to know

- The name and short description come from `manifest.json`; to change them, edit the manifest and upload a new package.
- For a Bangla store listing, add a `_locales/bn/messages.json` and a second language page in the dashboard (optional).
- Edge also accepts Chrome Web Store-style MV3 extensions, so the same zip works for the Chrome Web Store (different dashboard and a one-time developer fee).
