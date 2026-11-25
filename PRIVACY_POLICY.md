# Privacy Policy for TabMaster (Rename-Tabs)

**Effective Date:** November 24, 2026

Thank you for choosing to use TabMaster ("we", "us", or "our"). We are committed to protecting your personal information and your right to privacy.

This Privacy Policy explains what information we collect, how we use it, and your rights when you use the TabMaster browser extension (the "Extension").

## 1. Information We Collect

**We do not collect, transmit, distribute, or sell your personal data.** 

The Extension has no account, no analytics and no servers of its own. The only data the Extension handles are the rules you create (conditions, tab names, and icon emojis or images) to customize your browser tabs. To apply a rule, it reads the address of the page you are on and sets that page's tab title and icon. It does not read or store page content, and it does not keep a browsing history.

## 2. Where Data is Stored

Your rules are saved locally on your device using the browser's built-in local storage (`chrome.storage.local`). This data is never sent to our servers or to any server operated by us or by third parties.

**Optional sync.** The dashboard has a setting called "Sync across devices", which is off by default. If you turn it on, your text and emoji rules (not custom images) are also written to the browser's own sync storage (`chrome.storage.sync`), so that they appear in your other browsers where you are signed in. That storage is provided and operated by your browser vendor under its own privacy policy. We never receive this data.

**Backup files.** If you export your rules, they are saved as a JSON file on your device. Where that file goes afterwards is up to you.

## 3. Permissions Used and Why

The Extension requires certain permissions to function correctly:
- **`storage`**: Used to save your rules locally on your device and, only if you turn sync on, in your browser's sync storage.
- **`tabs` / `activeTab`**: Used to read the address of the tab you are on, so the popup can pre-fill a new rule, and to tell open tabs to refresh their rules after you change them.
- **`contextMenus`**: Used to add the "customize this tab" entry to the right-click menu.
- **Access to all websites (`<all_urls>`)**: A rule can target any website, so the Extension's content script runs on every page. It reads the page address, compares it with your rules, and sets the tab title and icon. Nothing is sent anywhere.

None of these permissions are used to track your browsing history or collect analytics.

## 4. Changes to This Privacy Policy

We may update our Privacy Policy from time to time. Since the Extension does not collect personal data, any changes will likely be minor and related to functionality updates. We will notify you of any changes by updating the "Effective Date" at the top of this Privacy Policy and modifying this document in our GitHub repository.

## 5. Contact Us

If you have questions or comments about this policy, you may create an issue on our [GitHub Repository](https://github.com/exUs541/Rename-Tabs).
