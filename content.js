function applyRule(rule) {
  const newTitle = rule.actionTitle;
  const iconType = rule.actionIconType;
  const iconValue = rule.actionIconValue;
  
  // 1. Title Override
  if (newTitle && newTitle.trim() !== '') {
    const applyTitle = () => { if (document.title !== newTitle) document.title = newTitle; };
    applyTitle();

    if (!window.__tabCustomizerTitleObserver) {
      window.__tabCustomizerTitleObserver = new MutationObserver(applyTitle);
      window.__tabCustomizerTitleObserver.observe(document.documentElement, { 
        childList: true, 
        subtree: true, 
        characterData: true 
      });
    }
  }

  // 2. Icon Override
  if (iconValue && iconValue.trim() !== '') {
    let iconUrl = '';
    if (iconType === 'emoji') {
       const emojiSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">${iconValue}</text></svg>`;
       iconUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(emojiSvg)))}`;
    } else if (iconType === 'image') {
       iconUrl = iconValue;
    }

    if (iconUrl) {
      const applyIcon = () => {
        let links = document.querySelectorAll("link[rel*='icon']");
        let hasOurIcon = false;
        
        links.forEach(link => {
          if (link.href !== iconUrl) {
            link.href = iconUrl;
          } else {
            hasOurIcon = true;
          }
        });

        if (!hasOurIcon && links.length === 0) {
          const link = document.createElement('link');
          link.rel = 'shortcut icon';
          link.href = iconUrl;
          if (document.head) {
             document.head.appendChild(link);
          } else {
             document.documentElement.appendChild(link);
          }
        }
      };

      applyIcon();
      document.addEventListener('DOMContentLoaded', applyIcon);
      window.addEventListener('load', applyIcon);

      if (!window.__tabCustomizerIconObserver) {
        window.__tabCustomizerIconObserver = new MutationObserver(applyIcon);
        window.__tabCustomizerIconObserver.observe(document.documentElement, { 
          childList: true, 
          subtree: true 
        });
      }
    }
  }
}

function checkRules() {
  chrome.storage.local.get(['rules'], (result) => {
    const rules = result.rules || [];
    if (rules.length === 0) return;

    for (const rule of rules) {
      let isMatch = false;
      const lowerUrl = window.location.href.toLowerCase();
      const lowerCondition = rule.conditionValue.toLowerCase();

      switch (rule.conditionType) {
        case 'startsWith': isMatch = lowerUrl.startsWith(lowerCondition); break;
        case 'endsWith': isMatch = lowerUrl.endsWith(lowerCondition); break;
        case 'contains': isMatch = lowerUrl.includes(lowerCondition); break;
        case 'notContains': isMatch = !lowerUrl.includes(lowerCondition); break;
        case 'exact': isMatch = lowerUrl === lowerCondition; break;
      }

      if (isMatch) {
        applyRule(rule);
        break; // Only apply the first matching rule
      }
    }
  });
}

// Ensure execution happens immediately and catches dynamic SPA route changes without reload
checkRules();

let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    checkRules();
  }
}).observe(document.documentElement, { subtree: true, childList: true });

// Listen for live updates from settings dashboard or popup
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.rules) {
    checkRules();
  }
});
