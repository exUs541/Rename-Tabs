document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const rulesList = document.getElementById('rulesList');
  const emptyState = document.getElementById('emptyState');
  
  const addRuleBtn = document.getElementById('addRuleBtn');
  const ruleModal = document.getElementById('ruleModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const cancelRuleBtn = document.getElementById('cancelRuleBtn');
  const saveRuleBtn = document.getElementById('saveRuleBtn');
  
  const ruleForm = document.getElementById('ruleForm');
  const conditionType = document.getElementById('conditionType');
  const conditionValue = document.getElementById('conditionValue');
  const actionTitle = document.getElementById('actionTitle');
  const actionEmoji = document.getElementById('actionEmoji');
  const actionImage = document.getElementById('actionImage');
  const imagePreview = document.getElementById('imagePreview');
  const modalTitle = document.getElementById('modalTitle');
  
  const radioIconEmoji = document.querySelector('input[name="iconType"][value="emoji"]');
  const radioIconImage = document.querySelector('input[name="iconType"][value="image"]');
  const emojiInputGroup = document.getElementById('emojiInputGroup');
  const imageInputGroup = document.getElementById('imageInputGroup');

  // New Genenral Tab Elements
  const navRules = document.getElementById('navRules');
  const navGeneral = document.getElementById('navGeneral');
  const rulesSection = document.getElementById('rulesSection');
  const generalSection = document.getElementById('generalSection');
  const syncToggle = document.getElementById('syncToggle');
  const exportBtn = document.getElementById('exportBtn');
  const importMergeBtn = document.getElementById('importMergeBtn');
  const importOverwriteBtn = document.getElementById('importOverwriteBtn');
  const importFileInput = document.getElementById('importFileInput');

  let currentRules = [];
  let editingRuleId = null;
  let currentImageBase64 = '';
  let isSyncEnabled = false;
  let importMode = 'merge';

  // Initialization
  loadRules();
  
  chrome.storage.local.get(['syncEnabled'], (res) => {
    isSyncEnabled = !!res.syncEnabled;
    syncToggle.checked = isSyncEnabled;
  });

  // Listen for background updates
  chrome.storage.onChanged.addListener((changes, space) => {
    if (space === 'local' && changes.rules) {
      loadRules(); // reload if background synced new rules
    }
  });

  // ====== Event Listeners ======

  addRuleBtn.addEventListener('click', () => {
    openModal();
  });

  closeModalBtn.addEventListener('click', closeModal);
  cancelRuleBtn.addEventListener('click', closeModal);
  
  // close modal on click outside
  ruleModal.addEventListener('click', (e) => {
    if (e.target === ruleModal) closeModal();
  });

  // Tab Switching
  navRules.addEventListener('click', (e) => {
    e.preventDefault();
    navRules.classList.add('active');
    navGeneral.classList.remove('active');
    rulesSection.classList.remove('hidden');
    generalSection.classList.add('hidden');
  });

  navGeneral.addEventListener('click', (e) => {
    e.preventDefault();
    navGeneral.classList.add('active');
    navRules.classList.remove('active');
    generalSection.classList.remove('hidden');
    rulesSection.classList.add('hidden');
  });

  // Sync Toggle
  syncToggle.addEventListener('change', async (e) => {
    isSyncEnabled = e.target.checked;
    
    // Prompt user to convert Image rules to Emoji rules when enabling sync
    if (isSyncEnabled) {
      let modified = false;
      for (const rule of currentRules) {
        if (rule.actionIconType === 'image') {
          const ans = prompt(`The rule for "${rule.conditionValue}" uses a custom image, which cannot be synced.\n\nEnter a fallback emoji to replace the image so it can be synced, or leave blank to keep it as a local-only image:`);
          if (ans && ans.trim() !== '') {
            rule.actionIconType = 'emoji';
            rule.actionIconValue = ans.trim();
            modified = true;
          }
        }
      }
      if (modified) {
        await new Promise(r => chrome.storage.local.set({ rules: currentRules }, r));
      }
    }

    chrome.storage.local.set({ syncEnabled: isSyncEnabled }, () => {
      if (isSyncEnabled) {
        chrome.runtime.sendMessage({ type: 'FORCE_SYNC_PUSH' });
      }
      renderRules(); // re-render to show/hide the local-only badges
    });
  });

  // Export
  exportBtn.addEventListener('click', () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentRules, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "tabmaster-rules.json");
    document.body.appendChild(downloadAnchorNode); 
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  });

  // Import
  importMergeBtn.addEventListener('click', () => {
    importMode = 'merge';
    importFileInput.click();
  });

  importOverwriteBtn.addEventListener('click', () => {
    if(confirm("Are you sure? This will delete all your current rules and replace them with the backup file.")) {
      importMode = 'overwrite';
      importFileInput.click();
    }
  });

  importFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedRules = JSON.parse(event.target.result);
        if (!Array.isArray(importedRules)) throw new Error("Invalid format");
        
        if (importMode === 'overwrite') {
          currentRules = importedRules;
        } else {
          // Merge mode
          const mergedDict = {};
          // Load existing rules into dictionary
          currentRules.forEach(r => mergedDict[r.conditionType + '_' + r.conditionValue] = r);
          // Overwrite/merge imported rules
          importedRules.forEach(r => {
            const key = r.conditionType + '_' + r.conditionValue;
            if (mergedDict[key]) {
              r.id = mergedDict[key].id; // Keep original ID if condition is duplicate
            }
            mergedDict[key] = r;
          });
          currentRules = Object.values(mergedDict);
        }

        chrome.storage.local.set({ rules: currentRules }, () => {
          renderRules();
          alert(importMode === 'overwrite' ? "Rules overwritten fully!" : "Rules merged and duplicates removed!");
          importFileInput.value = ''; // reset
        });

      } catch (err) {
        alert("Error parsing JSON file. Please ensure it's a valid TabMaster backup.");
        console.error(err);
      }
    };
    reader.readAsText(file);
  });

  // Toggle Icon Input Type
  radioIconEmoji.addEventListener('change', () => {
    emojiInputGroup.classList.remove('hidden');
    imageInputGroup.classList.add('hidden');
  });

  radioIconImage.addEventListener('change', () => {
    emojiInputGroup.classList.add('hidden');
    imageInputGroup.classList.remove('hidden');
  });

  // Image Upload Handler
  actionImage.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          // Scale down to max 64x64 to avoid Chrome Storage quota issues with large JPGs
          const MAX_SIZE = 64;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height = Math.round(height * (MAX_SIZE / width));
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width = Math.round(width * (MAX_SIZE / height));
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          currentImageBase64 = canvas.toDataURL('image/png');
          imagePreview.innerHTML = `<img src="${currentImageBase64}" alt="Preview" />`;
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    } else {
      currentImageBase64 = '';
      imagePreview.innerHTML = '<span class="preview-placeholder">No image selected</span>';
    }
  });

  // Save Rule
  saveRuleBtn.addEventListener('click', saveRule);


  // ====== Core Functions ======

  function loadRules() {
    chrome.storage.local.get(['rules'], (result) => {
      currentRules = result.rules || [];
      renderRules();
    });
  }

  function renderRules() {
    rulesList.innerHTML = '';
    
    if (currentRules.length === 0) {
      emptyState.classList.remove('hidden');
    } else {
      emptyState.classList.add('hidden');
      
      currentRules.forEach(rule => {
        const li = document.createElement('li');
        li.className = 'rule-item';
        
        // Build preview icon
        let iconHtml = '';
        if (rule.actionIconType === 'emoji') {
          iconHtml = rule.actionIconValue || '📄';
        } else if (rule.actionIconType === 'image') {
          iconHtml = `<img src="${rule.actionIconValue}" alt="Icon">`;
        }

        // Build Title snippet
        const titleSnippet = rule.actionTitle 
          ? `Change name to: <strong>${rule.actionTitle}</strong>` 
          : `Keep original name`;

        const conditionMap = {
          'startsWith': 'Starts with',
          'endsWith': 'Ends with',
          'contains': 'Contains',
          'notContains': 'Does not contain',
          'exact': 'Exactly'
        };

        const isLocalOnly = isSyncEnabled && rule.actionIconType === 'image';
        const syncBadge = isLocalOnly ? `<span class="url-match" style="color: #ff9800; border-color: #ff9800; font-size: 0.7rem; margin-left:8px;">⚠️ Local Only</span>` : '';

        li.innerHTML = `
          <div class="rule-info">
            <div class="rule-icon-preview">
              ${iconHtml}
            </div>
            <div class="rule-details">
              <h4>${titleSnippet}</h4>
              <div>
                <span class="url-match">${conditionMap[rule.conditionType]}: ${rule.conditionValue}</span>
                ${syncBadge}
              </div>
            </div>
          </div>
          <div class="rule-actions">
            <button class="btn-icon edit-btn" title="Edit">✎</button>
            <button class="btn-icon danger delete-btn" title="Delete">🗑</button>
          </div>
        `;

        li.querySelector('.edit-btn').addEventListener('click', () => editRule(rule.id));
        li.querySelector('.delete-btn').addEventListener('click', () => deleteRule(rule.id));

        rulesList.appendChild(li);
      });
    }
  }

  function openModal(rule = null) {
    ruleForm.reset();
    imagePreview.innerHTML = '<span class="preview-placeholder">No image selected</span>';
    currentImageBase64 = '';

    if (rule) {
      modalTitle.textContent = 'Edit Rule';
      editingRuleId = rule.id;
      conditionType.value = rule.conditionType;
      conditionValue.value = rule.conditionValue;
      actionTitle.value = rule.actionTitle;

      if (rule.actionIconType === 'emoji') {
        radioIconEmoji.checked = true;
        actionEmoji.value = rule.actionIconValue;
        emojiInputGroup.classList.remove('hidden');
        imageInputGroup.classList.add('hidden');
      } else {
        radioIconImage.checked = true;
        currentImageBase64 = rule.actionIconValue;
        imagePreview.innerHTML = `<img src="${currentImageBase64}" alt="Preview" />`;
        emojiInputGroup.classList.add('hidden');
        imageInputGroup.classList.remove('hidden');
      }
    } else {
      modalTitle.textContent = 'Create New Rule';
      editingRuleId = null;
      radioIconEmoji.checked = true;
      emojiInputGroup.classList.remove('hidden');
      imageInputGroup.classList.add('hidden');
    }

    ruleModal.classList.remove('hidden');
  }

  function closeModal() {
    ruleModal.classList.add('hidden');
    editingRuleId = null;
  }

  function saveRule(e) {
    e.preventDefault();

    const cVal = conditionValue.value.trim();
    if (!cVal) {
      alert('Please enter a URL condition value.');
      return;
    }

    const newRule = {
      id: editingRuleId || generateId(),
      conditionType: conditionType.value,
      conditionValue: cVal,
      actionTitle: actionTitle.value.trim(),
      actionIconType: radioIconEmoji.checked ? 'emoji' : 'image',
      actionIconValue: radioIconEmoji.checked ? actionEmoji.value.trim() : currentImageBase64
    };

    if (editingRuleId) {
      const index = currentRules.findIndex(r => r.id === editingRuleId);
      if (index !== -1) currentRules[index] = newRule;
    } else {
      currentRules.push(newRule);
    }

    chrome.storage.local.set({ rules: currentRules }, () => {
      if (chrome.runtime.lastError) {
        alert("Speicherfehler: " + chrome.runtime.lastError.message + "\nVermutlich ist der interne Speicher voll.");
        return;
      }
      renderRules();
      closeModal();
    });
  }

  function editRule(id) {
    const rule = currentRules.find(r => r.id === id);
    if (rule) openModal(rule);
  }

  function deleteRule(id) {
    if (confirm('Are you sure you want to delete this rule?')) {
      currentRules = currentRules.filter(r => r.id !== id);
      chrome.storage.local.set({ rules: currentRules }, () => {
        renderRules();
      });
    }
  }

  function generateId() {
    return Math.random().toString(36).substr(2, 9);
  }

});
