chrome.storage.onChanged.addListener(async (changes, namespace) => {
  // Ignore changes if they don't involve rules
  if (!changes.rules) return;

  if (namespace === 'local') {
    const localCheck = await chrome.storage.local.get(['syncEnabled']);
    if (!localCheck.syncEnabled) return;

    const newLocalRules = changes.rules.newValue || [];
    const syncableRules = newLocalRules.filter(r => r.actionIconType !== 'image');

    // Retrieve current sync to compare
    const syncData = await chrome.storage.sync.get(['rules']);
    const currentSyncRules = syncData.rules || [];

    // Push to sync only if there's a difference
    if (JSON.stringify(syncableRules) !== JSON.stringify(currentSyncRules)) {
      try {
        await chrome.storage.sync.set({ rules: syncableRules });
      } catch (err) {
        console.error("TabMaster Sync Error:", err);
      }
    }
  }

  if (namespace === 'sync') {
    // Only pull from sync if sync is enabled locally
    const localCheck = await chrome.storage.local.get(['syncEnabled']);
    if (!localCheck.syncEnabled) return;

    const newSyncRules = changes.rules.newValue || [];
    
    // Retrieve current local to compare and merge
    const localData = await chrome.storage.local.get(['rules']);
    const localRules = localData.rules || [];

    // Local 'image' rules are preserved
    const imageRules = localRules.filter(r => r.actionIconType === 'image');
    
    // Merge by mapping
    const mergedMap = new Map();
    for (const rule of newSyncRules) mergedMap.set(rule.id, rule);
    for (const rule of imageRules) mergedMap.set(rule.id, rule); // Image rules override if collision

    const mergedRules = Array.from(mergedMap.values());

    // Write to local only if there's a difference
    // Note: sorting or order might fluctuate. For strict stability, keep order logic if needed.
    // For now, JSON stringify comparing the values will work if order is preserved by Array.from(Map).
    // Let's just write to local if the map sizes or contents slightly differ, or just trust the JSON check.
    // Best way to compare deep equivalence of arrays when order doesn't explicitly matter is checking length and fields, 
    // but JSON stringify usually handles the map iteration order well enough since sync rules come first.
    if (JSON.stringify(mergedRules) !== JSON.stringify(localRules)) {
      await chrome.storage.local.set({ rules: mergedRules });
    }
  }
});

// Listener for manual push triggers from UI and tab customization options
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'FORCE_SYNC_PUSH') {
    (async () => {
      try {
        const { rules } = await chrome.storage.local.get(['rules']);
        const syncableRules = (rules || []).filter(r => r.actionIconType !== 'image');
        await chrome.storage.sync.set({ rules: syncableRules });
        sendResponse({ success: true });
      } catch (e) {
        sendResponse({ success: false, error: e.message });
      }
    })();
    return true; // Keep message channel open for async
  }

  if (message.type === 'GET_TAB_RULE') {
    const tabId = sender.tab ? sender.tab.id : null;
    if (!tabId) {
      sendResponse({ rule: null });
      return false;
    }
    chrome.storage.local.get(['tempTabRules'], (result) => {
      const tempTabRules = result.tempTabRules || {};
      sendResponse({ rule: tempTabRules[tabId] || null });
    });
    return true; // Keep channel open for async
  }

  if (message.type === 'SET_TEMP_RULE') {
    const tabId = sender.tab ? sender.tab.id : message.tabId;
    if (!tabId) {
      sendResponse({ success: false });
      return false;
    }
    chrome.storage.local.get(['tempTabRules'], (result) => {
      const tempTabRules = result.tempTabRules || {};
      tempTabRules[tabId] = message.rule;
      chrome.storage.local.set({ tempTabRules }, () => {
        // Notify tab to update
        chrome.tabs.sendMessage(tabId, { type: 'REFRESH_RULES' }, () => {
          if (chrome.runtime.lastError) {
            // Tab might not have content script running or be closed
          }
        });
        sendResponse({ success: true });
      });
    });
    return true; // Keep channel open for async
  }

  if (message.type === 'CLEAR_TEMP_RULE') {
    const tabId = sender.tab ? sender.tab.id : message.tabId;
    if (!tabId) {
      sendResponse({ success: false });
      return false;
    }
    chrome.storage.local.get(['tempTabRules'], (result) => {
      const tempTabRules = result.tempTabRules || {};
      if (tempTabRules[tabId]) {
        delete tempTabRules[tabId];
        chrome.storage.local.set({ tempTabRules }, () => {
          chrome.tabs.sendMessage(tabId, { type: 'REFRESH_RULES' }, () => {
            if (chrome.runtime.lastError) {}
          });
          sendResponse({ success: true });
        });
      } else {
        sendResponse({ success: true });
      }
    });
    return true; // Keep channel open for async
  }
});

// Clean up temporary rules when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.local.get(['tempTabRules'], (result) => {
    const tempTabRules = result.tempTabRules || {};
    if (tempTabRules[tabId]) {
      delete tempTabRules[tabId];
      chrome.storage.local.set({ tempTabRules });
    }
  });
});

// Setup tab right-click context menu
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "customize-tab",
      title: "Tab anpassen (Rename / Icon)...",
      contexts: ["tab"]
    });
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "customize-tab") {
    chrome.tabs.sendMessage(tab.id, {
      type: "OPEN_CUSTOMIZER_MODAL",
      tabId: tab.id,
      url: tab.url,
      title: tab.title
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn("Could not open customizer modal (expected on non-content script tabs):", chrome.runtime.lastError.message);
      }
    });
  }
});
