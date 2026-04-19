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

// Listener for manual push triggers from UI (e.g. toggling sync ON)
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.type === 'FORCE_SYNC_PUSH') {
    try {
      const { rules } = await chrome.storage.local.get(['rules']);
      const syncableRules = (rules || []).filter(r => r.actionIconType !== 'image');
      await chrome.storage.sync.set({ rules: syncableRules });
      sendResponse({ success: true });
    } catch (e) {
      sendResponse({ success: false, error: e.message });
    }
    return true; // Keep message channel open for async
  }
});
