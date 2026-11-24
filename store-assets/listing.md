# TabMaster – store listing

Copy-paste texts and field values for the **Chrome Web Store** and **Microsoft Edge Add-ons**. One text serves both stores; a heading says so when something applies to one store only. Images and file names: see [README.md](README.md).

## Name and short description

Both come from the package (`manifest.json`), do not enter them by hand.

**Name** (41 characters)

```
Rename Tabs & Change Tab Icons: TabMaster
```

**Short description** (127 characters, Chrome allows 132)

```
Rename browser tabs & change tab icons automatically with URL rules. Customize tab titles, use emojis, or upload custom images.
```

## Description (both stores)

Plain text without formatting (Edge: 250 to 10,000 characters, required), hence the capitalised headings and the dots as bullets.

```
Too many tabs that all look the same? TabMaster renames your browser tabs and changes their icons automatically. Set a rule once, and every matching page gets the tab title and the icon you chose, every time you open it.

Make tabs readable at a glance: turn "Inbox (12) - anna@mail.example.com - Mail" into "Inbox" with a mailbox emoji, mark your admin console with a wrench, flag your staging site with a construction sign, and give every local project its own icon.

HOW IT WORKS
1. Click the TabMaster icon on any page. The address of the page is already filled in.
2. Choose how it should match, type a new tab name and add an emoji. Use the dashboard if you prefer your own image.
3. Save. The tab updates instantly, no reload needed.

FEATURES
• Rename tabs: replace the title of any page with a name you choose, or keep the original title and only change the icon.
• Change tab icons: use any emoji as the favicon, or upload your own image (PNG, JPG, ICO or SVG).
• Flexible URL rules: match web addresses that start with, end with, contain, do not contain or exactly equal your text. Matching ignores upper and lower case.
• One-click suggestions: the popup offers ready-made matches for the current page, such as the whole site or its first folder.
• Works on modern web apps: your title and icon stay in place when a site changes its own title or navigates without a reload.
• Right-click menu: customize the current tab from the context menu, for this tab only, for the exact page or for the whole website.
• Rules dashboard: see, edit and delete all your rules in one place.
• Sync across devices (optional): keep text and emoji rules in sync through your browser account. Custom images stay on the device where you added them.
• Backup and restore: export your rules as a JSON file, import them and merge, or replace everything.
• Light and dark theme: follows your system setting.

GOOD FOR
• Telling work, private and shared tabs apart
• Spotting dashboards, admin panels and tools among dozens of tabs
• Separating staging from production
• Giving cryptic page titles a clear, short name

PRIVATE BY DESIGN
TabMaster has no account, no analytics and no servers of its own. Your rules are stored locally in your browser. If you turn on sync, they travel through your browser's own sync service and never reach us.

Why does it need access to all websites? A rule can target any address, so TabMaster has to run on every page. It only looks at the address of the page and then sets the tab title and icon. Nothing else is read or sent anywhere.
```

## Fields

| Field | Value |
|---|---|
| Category | Productivity (both stores) |
| Language | English |
| Website / support | `https://github.com/exUs541/Rename-Tabs` |
| Privacy policy URL | `https://github.com/exUs541/Rename-Tabs/blob/main/PRIVACY_POLICY.md` |
| Mature content / remote code | No / No |

## Chrome Web Store only

Chrome has no search-term field. Only the name, the short description and the description count. The terms listed under "Microsoft Edge only" therefore also appear in the description, each one embedded naturally (Chrome's policy forbids repeating a term unnaturally more than five times and keyword lists, and neither is the case here).

For the "Privacy practices" tab use the permission lines of the certification notes below as the basis for each justification field. The same text serves as the test instructions for Chrome.

**Remote code:** No. **Data usage:** the extension does not collect or transmit user data. Tick none of the data types and confirm the three certifications (no sale of data, no use unrelated to the single purpose, no creditworthiness use).

## Microsoft Edge only

**Search terms** (max. 7 terms, each max. 30 characters, together max. 21 words; 7 terms, 17 words, longest term 17 characters)

```
favicon changer
tab renamer
tab title changer
change tab name
custom favicon
emoji favicon
auto rename tabs
```

Why these: "rename tab" and "tab icon" are already in the name, so the search terms add the synonyms people really search for (favicon, renamer, title changer). "Tab manager" and "tab organizer" are left out on purpose: TabMaster does not manage tabs, and Microsoft requires relevant terms.

**Notes for certification**

```
No account or login is needed. Rules are stored locally with chrome.storage.local. Only if the user switches on "Sync across devices" on the dashboard, text and emoji rules are also written to chrome.storage.sync (the browser's own sync service).

How to test: open any web page, click the TabMaster icon, keep the pre-filled address, choose "starts with", enter a Tab name and an emoji and click "Save rule". The tab title and icon change immediately. Click the gear button to open the rules dashboard (Rules and Settings).

Single purpose: rename tabs and replace tab icons based on user-defined URL rules.

Permissions
- storage: save the user's rules locally and, if enabled, sync them.
- tabs: tell open tabs to refresh their rules after a change, and clean up when a tab closes.
- activeTab: read the current tab's address to prefill a new rule from the popup.
- contextMenus: offer "customize this tab" in the right-click menu.
- Host access (all sites): a rule can target any website, so the content script that applies titles and icons must run on every page. It reads only the page address and sets the title and icon.
```

## Maintainer notes

- New icons, the English dialog texts (`content.js`, `background.js`) and the store texts go live only with a higher `version` in `manifest.json` (currently 1.1.0, already in the Chrome Web Store). Images and texts in `store-assets/` do not start a release. A package built before the bump still carries the old icons, so rebuild it afterwards.
- The right-click menu and dialog are English since 2026-11-24 ("Rename tab / change icon...", dialog "Customize tab"). The dialog's "Apply to" area had radio dots over the text and upper-case only; that is fixed.
- The Google Fonts import in the dialog is gone since 2026-11-24. The dialog uses the system font like the popup, and `content.js` makes no external requests, so "Nothing else is read or sent anywhere" in the description is accurate.
- The right-click dialog still has the old purple design that does not match the blue rest of the UI, so no screenshot shows it.
- `PRIVACY_POLICY.md` is up to date (optional sync, permissions). The store links to the version on `main`, which shows it after the merge.
- The screenshots show the real popup and dashboard with made-up example data (only `example.com`, no real sites or brands). Only the tab strips in screenshot 1 and in the large tile are a simplified illustration, labelled as such. Neither Chrome nor Edge is named in any image (Edge rejects "Chrome" in names, texts and images).
