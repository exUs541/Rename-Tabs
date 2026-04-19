document.addEventListener('DOMContentLoaded', () => {
  const openSettingsBtn = document.getElementById('openSettingsBtn');
  const quickAddForm = document.getElementById('quickAddForm');
  const conditionType = document.getElementById('conditionType');
  const conditionValue = document.getElementById('conditionValue');
  const suggestionsContainer = document.getElementById('suggestions');
  const actionTitle = document.getElementById('actionTitle');
  const actionEmoji = document.getElementById('actionEmoji');
  const successMessage = document.getElementById('successMessage');
  const saveRuleBtn = document.getElementById('saveRuleBtn');
  const descText = document.querySelector('.description');

  let editingRuleId = null;
  let originalMatchedRule = null;
  let currentActiveUrl = '';

  // Open settings dashboard
  openSettingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  function renderSuggestions(type) {
    if (!currentActiveUrl) return;
    suggestionsContainer.innerHTML = '';
    suggestionsContainer.classList.add('hidden');

    let suggestions = [];
    try {
      const urlObj = new URL(currentActiveUrl);
      const origin = urlObj.origin; 
      const host = urlObj.hostname; 
      const domain = host.replace('www.', ''); 

      if (type === 'startsWith') {
        suggestions.push(origin);
        suggestions.push(origin + '/');
        const segments = urlObj.pathname.split('/').filter(Boolean);
        if (segments.length > 0) {
          suggestions.push(origin + '/' + segments[0]);
        }
      } else if (type === 'contains') {
        suggestions.push(domain);
        suggestions.push(host);
        if (urlObj.pathname.length > 1) {
           const segments = urlObj.pathname.split('/').filter(Boolean);
           if (segments.length > 0) suggestions.push(segments[0]);
           if (segments.length > 1) suggestions.push(segments[segments.length - 1]);
        }
      } else if (type === 'endsWith') {
        if (urlObj.pathname.length > 1) suggestions.push(urlObj.pathname);
      }
    } catch(e) {}

    // Filter unique and non-empty
    suggestions = [...new Set(suggestions)].filter(Boolean);

    if (suggestions.length > 0) {
      document.querySelector('.input-row').style.marginBottom = "4px";
      suggestions.forEach(s => {
        const chip = document.createElement('span');
        chip.className = 'suggestion-chip';
        chip.textContent = s;
        chip.title = s; // for tooltip
        chip.addEventListener('click', () => {
          conditionValue.value = s;
        });
        suggestionsContainer.appendChild(chip);
      });
      suggestionsContainer.classList.remove('hidden');
    }
  }

  conditionType.addEventListener('change', (e) => {
    renderSuggestions(e.target.value);
  });

  // Fetch current tab URL
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs && tabs.length > 0) {
      currentActiveUrl = tabs[0].url;
      const lowerUrl = currentActiveUrl.toLowerCase();

      // Check if there is an existing rule for this URL
      chrome.storage.local.get(['rules'], (result) => {
        const rules = result.rules || [];
        
        let matchedRule = null;
        for (const rule of rules) {
          let isMatch = false;
          const lowerCondition = rule.conditionValue.toLowerCase();
          
          switch (rule.conditionType) {
            case 'startsWith': isMatch = lowerUrl.startsWith(lowerCondition); break;
            case 'endsWith': isMatch = lowerUrl.endsWith(lowerCondition); break;
            case 'contains': isMatch = lowerUrl.includes(lowerCondition); break;
            case 'notContains': isMatch = !lowerUrl.includes(lowerCondition); break;
            case 'exact': isMatch = lowerUrl === lowerCondition; break;
          }
          
          if (isMatch) {
            matchedRule = rule;
            break;
          }
        }

        if (matchedRule) {
          // Rule already exists - populate form for editing
          originalMatchedRule = matchedRule;
          editingRuleId = matchedRule.id;
          conditionType.value = matchedRule.conditionType;
          conditionValue.value = matchedRule.conditionValue;
          actionTitle.value = matchedRule.actionTitle || '';
          
          if (matchedRule.actionIconType === 'emoji') {
            actionEmoji.value = matchedRule.actionIconValue || '';
          }
          
          saveRuleBtn.textContent = "Update Existing Rule";
          descText.textContent = "A rule already applies to this tab. You can update it below.";
        } else {
          // No rule exists - default to exact match of current URL
          conditionType.value = 'exact';
          conditionValue.value = currentActiveUrl;
        }

        // Render initial suggestions based on initial select value
        renderSuggestions(conditionType.value);
      });
    }
  });

  // Handle save/update
  quickAddForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const cVal = conditionValue.value.trim();
    if (!cVal) return;

    let iconType = 'emoji';
    let iconValue = actionEmoji.value.trim();

    // Preserve custom image if editing an existing image rule and the emoji input is left blank
    if (editingRuleId && originalMatchedRule) {
      if (originalMatchedRule.actionIconType === 'image' && !iconValue) {
        iconType = 'image';
        iconValue = originalMatchedRule.actionIconValue;
      }
    }

    const newRuleData = {
      id: editingRuleId || Math.random().toString(36).substr(2, 9),
      conditionType: conditionType.value,
      conditionValue: cVal,
      actionTitle: actionTitle.value.trim(),
      actionIconType: iconType,
      actionIconValue: iconValue
    };

    // Save to storage
    chrome.storage.local.get(['rules'], (result) => {
      let rules = result.rules || [];
      
      if (editingRuleId) {
        const index = rules.findIndex(r => r.id === editingRuleId);
        if (index !== -1) {
          rules[index] = newRuleData;
        } else {
          rules.push(newRuleData);
        }
      } else {
        rules.push(newRuleData);
      }
      
      chrome.storage.local.set({ rules }, () => {
        quickAddForm.classList.add('hidden');
        successMessage.textContent = editingRuleId ? "✅ Rule updated successfully!" : "✅ Rule saved successfully!";
        successMessage.classList.remove('hidden');
        
        setTimeout(() => {
          window.close();
        }, 1200);
      });
    });
  });
});
