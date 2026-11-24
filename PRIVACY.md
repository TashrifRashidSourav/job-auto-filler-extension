# Privacy Policy – Job Application Autofill

**Effective date:** 23 November 2026  
**Developer:** Corvas  
**Contact:** https://github.com/TashrifRashidSourav/job-auto-filler-extension/issues

Job Application Autofill is a browser extension that fills job application forms using details you save yourself. This policy explains exactly what it stores, what it sends, and what it never does.

## The short version

- Your details are stored **only on your own device**, inside your browser.
- **We (the developer) never receive your data.** There is no account, no server, no analytics, no advertising and no tracking.
- The only time anything leaves your browser is if **you** add a Google Gemini API key and use an AI feature. What is sent is listed below.
- You can see, export and delete everything at any time.

## What the extension stores (on your device only)

Stored with the browser's extension storage (`chrome.storage.local`), which is private to the extension:

| Data | Why |
|---|---|
| Your profile(s): name, parents' names, date of birth, ID numbers, phone, email, addresses, education, work experience, and any extra details you add | So it can fill forms for you |
| Your Gemini API key (only if you enter one) | So you can use the optional AI features |
| Settings (e.g. "overwrite existing values") | To remember your preferences |
| Site rules: "this field on this website = that profile field" (no personal values) | So corrections you make are remembered |
| Learned translations such as "Chuadanga = চুয়াডাঙ্গা" (no personal data beyond a place name you used) | So dropdowns in Bangla/English are matched faster next time |
| A counter for which qualification to fill next on a site | For multi-qualification forms |

This data is never synced to any cloud by the extension and is never sent to the developer.

## When the extension reads a web page

When – and only when – **you** click the extension button (or press its keyboard shortcut), it reads the form fields of the current page (labels, field types, dropdown options) to work out what each field is, then writes your saved values into them. It does not read or store the content you type elsewhere, does not record browsing history, and does not run in the background on pages you did not activate. It never submits a form, never ticks declaration/terms boxes, and never uploads files.

## Optional AI features (Google Gemini) – off unless you add a key

If you paste a Gemini API key in Settings, these features become available. Requests go **directly from your browser to Google** (`generativelanguage.googleapis.com`), using your own key. They are not routed through the developer.

| Feature | What is sent to Google |
|---|---|
| Matching unfamiliar fields | Field labels, section names, field types, dropdown option labels, and the page title and headings. **Not** your profile values. |
| Picking a dropdown option | The single value being selected (for example an upazila name) and that dropdown's option list. |
| Importing a document with AI | The text of the document (or the PDF/image) you choose to import, so it can be turned into profile fields. |

Google's handling of that data is governed by Google's own terms and privacy policy for the Gemini API and your account/plan. If you do not add a key, none of this happens. You can remove the key at any time in Settings.

## Permissions, and why they are needed

- **storage** – to keep your profile, settings and rules on your device.
- **activeTab** and **scripting** – to read and fill the form on the tab you activate, only when you ask.
- **Host access to `https://generativelanguage.googleapis.com/*`** – to reach the Gemini API, only if you add a key.
- **Optional access to all sites** – never requested automatically. It is only granted if you press "Allow on all sites & embedded forms" in Settings, to let the extension fill application forms embedded from another website (iframes). It still acts only when you click it.

## What we do **not** do

- We do not collect, sell, share or transfer your data to anyone.
- We do not use your data for advertising, profiling, creditworthiness or any purpose other than filling your forms.
- We do not load or execute remote code. All code ships inside the extension package.
- We do not use analytics, telemetry or crash reporting.

## Your control

- **View / edit:** Settings → Profile.
- **Export:** Settings → Export / Backup (JSON or CSV).
- **Delete:** delete a profile in Settings, press "Remove key" to erase the API key, or uninstall the extension to erase everything it stored.

## Children

The extension is a general-purpose tool and is not directed at children under 13.

## Not affiliated

Job Application Autofill is an independent project. It is not affiliated with, endorsed by or sponsored by Google, Microsoft or any job portal. "Gemini" is a trademark of Google LLC.

## Changes to this policy

If this policy changes, the new version will be published at the same address with a new effective date.
