# TabMaster (Rename-Tabs) 🚀

TabMaster is a powerful yet lightweight browser extension that allows you to easily customize your browser tabs. You can rename tabs and change their icons (using emojis or custom images) based on customizable URL matching rules.

## ✨ Features

- **Rename Tabs**: Dynamically override the document title of any tab based on URL rules.
- **Change Tab Icons**: Replace standard favicons with your favorite emojis or custom images.
- **URL Rules**: Create flexible rules using conditions like `Starts with`, `Ends with`, `Contains`, `Does not contain`, or `Is exactly`.
- **Quick Add**: Easily add a new rule for the current tab directly from the extension popup.
- **SPA Support**: Automatically detects and applies rules on Single Page Applications (SPAs) without needing a page reload.
- **Settings Dashboard**: An interactive options page to view, edit, reorder, and manage all your tab rules.

## 📦 Installation

Since this extension is not yet published on the Chrome Web Store, you can manually install it:

1. Clone or download this repository to your local machine:
   ```bash
   git clone https://github.com/exUs541/Rename-Tabs.git
   ```
2. Open your Chromium-based browser (Chrome, Edge, Brave, etc.).
3. Navigate to the extensions page (`chrome://extensions/` or `edge://extensions/`).
4. Enable **"Developer mode"** in the top right corner.
5. Click **"Load unpacked"** and select the folder where you cloned/downloaded this repository (`TabMaster`).
6. The extension is now installed and ready to be used!

## 🛠️ How to use

1. Click on the handy **TabMaster icon** in your browser's toolbar when you are on a webpage you want to customize.
2. The current URL will be automatically populated. Choose a condition (e.g., *Starts with*), enter the **New Tab Name**, and provide an **Emoji** for the icon override.
3. Click **Save Quick Rule**.
4. The tab will instantly update. 
5. To manage all your rules, click the **⚙️ (Manage Rules)** button in the extension popup to open the full Settings Dashboard.

## 🔒 Permissions Used

- `tabs` and `activeTab`: To read the current tab's URL so it can be easily added as a new rule.
- `storage`: To save your custom rules locally (`chrome.storage.local`).
- `scripting`: Required to inject the content script that handles the renaming and icon replacing.
- `<all_urls>`: Allows the content script to run and modify tab titles/icons across all websites you visit.

## 📜 License

MIT License. See the repository for more details.
