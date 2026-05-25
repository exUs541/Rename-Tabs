let originalTitle = '';
let originalIconHref = '';

// Capture original title and icon as fallback
function captureOriginalState() {
  if (!originalTitle && document.title) {
    originalTitle = document.title;
  }
  if (!originalIconHref) {
    const links = document.querySelectorAll("link[rel*='icon']");
    if (links.length > 0) {
      originalIconHref = links[0].href;
    }
  }
}

// Attempt capture immediately and on DOMContentLoaded
captureOriginalState();
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', captureOriginalState);
} else {
  captureOriginalState();
}

function resetToOriginal() {
  // Disconnect observers
  if (window.__tabCustomizerTitleObserver) {
    window.__tabCustomizerTitleObserver.disconnect();
    window.__tabCustomizerTitleObserver = null;
  }
  if (window.__tabCustomizerIconObserver) {
    window.__tabCustomizerIconObserver.disconnect();
    window.__tabCustomizerIconObserver = null;
  }
  
  // Restore title
  if (originalTitle && document.title !== originalTitle) {
    document.title = originalTitle;
  }
  
  // Restore icon
  if (originalIconHref) {
    const links = document.querySelectorAll("link[rel*='icon']");
    links.forEach(link => {
      if (link.href !== originalIconHref) {
        link.href = originalIconHref;
      }
    });
  }
}

function applyRule(rule) {
  const newTitle = rule.actionTitle;
  const iconType = rule.actionIconType;
  const iconValue = rule.actionIconValue;
  
  // 1. Title Override
  if (newTitle && newTitle.trim() !== '') {
    const applyTitle = (mutationsList) => {
      // Capture original title before overwriting if browser parses native title
      if (mutationsList) {
        for (const mutation of mutationsList) {
          if (document.title !== newTitle && document.title !== '') {
            originalTitle = document.title;
          }
        }
      }
      if (document.title !== newTitle) {
        document.title = newTitle;
      }
    };
    
    applyTitle();

    if (!window.__tabCustomizerTitleObserver) {
      window.__tabCustomizerTitleObserver = new MutationObserver(applyTitle);
      window.__tabCustomizerTitleObserver.observe(document.documentElement, { 
        childList: true, 
        subtree: true, 
        characterData: true 
      });
    }
  } else {
    if (window.__tabCustomizerTitleObserver) {
      window.__tabCustomizerTitleObserver.disconnect();
      window.__tabCustomizerTitleObserver = null;
    }
    if (originalTitle && document.title !== originalTitle) {
      document.title = originalTitle;
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
            // Capture original favicon before overwriting
            if (!originalIconHref) {
              originalIconHref = link.href;
            }
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

      if (!window.__tabCustomizerIconObserver) {
        window.__tabCustomizerIconObserver = new MutationObserver(applyIcon);
        window.__tabCustomizerIconObserver.observe(document.documentElement, { 
          childList: true, 
          subtree: true 
        });
      }
    }
  } else {
    if (window.__tabCustomizerIconObserver) {
      window.__tabCustomizerIconObserver.disconnect();
      window.__tabCustomizerIconObserver = null;
    }
    if (originalIconHref) {
      let links = document.querySelectorAll("link[rel*='icon']");
      links.forEach(link => {
        if (link.href !== originalIconHref) {
          link.href = originalIconHref;
        }
      });
    }
  }
}

function checkRules() {
  chrome.runtime.sendMessage({ type: 'GET_TAB_RULE' }, (response) => {
    if (chrome.runtime.lastError) {
      checkPermanentRules();
      return;
    }
    if (response && response.rule) {
      applyRule(response.rule);
    } else {
      checkPermanentRules();
    }
  });
}

function checkPermanentRules() {
  chrome.storage.local.get(['rules'], (result) => {
    const rules = result.rules || [];
    let matched = false;

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
        matched = true;
        break;
      }
    }

    if (!matched) {
      resetToOriginal();
    }
  });
}

// Observe dynamic SPA transitions
checkRules();
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    checkRules();
  }
}).observe(document.documentElement, { subtree: true, childList: true });

// Listen for updates from options page, background context menu, or sync triggers
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && (changes.rules || changes.tempTabRules)) {
    checkRules();
  }
});

// Receive message triggers from background context menu
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'OPEN_CUSTOMIZER_MODAL') {
    showCustomizerModal(message.title, message.url);
    sendResponse({ success: true });
  } else if (message.type === 'REFRESH_RULES') {
    checkRules();
    sendResponse({ success: true });
  }
});

// modal rendering and customizer logic
function showCustomizerModal(currentTitle, currentUrl) {
  chrome.runtime.sendMessage({ type: 'GET_TAB_RULE' }, (tempResponse) => {
    const tempRule = tempResponse ? tempResponse.rule : null;
    
    chrome.storage.local.get(['rules'], (result) => {
      const rules = result.rules || [];
      let matchedRule = null;
      let matchedScope = 'temporary'; 
      
      if (tempRule) {
        matchedRule = tempRule;
        matchedScope = 'temporary';
      } else {
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
            matchedRule = rule;
            matchedScope = (rule.conditionType === 'exact') ? 'exact' : 'domain';
            break;
          }
        }
      }
      
      drawModal(matchedRule, matchedScope, currentTitle || document.title, currentUrl || window.location.href);
    });
  });
}

function drawModal(matchedRule, matchedScope, currentTitle, currentUrl) {
  let root = document.getElementById('tab-master-customizer-root');
  if (root) {
    root.remove();
  }
  
  root = document.createElement('div');
  root.id = 'tab-master-customizer-root';
  root.style.position = 'fixed';
  root.style.top = '0';
  root.style.left = '0';
  root.style.width = '100vw';
  root.style.height = '100vh';
  root.style.zIndex = '999999999';
  root.style.display = 'flex';
  root.style.alignItems = 'center';
  root.style.justifyContent = 'center';
  document.documentElement.appendChild(root);
  
  const shadow = root.attachShadow({ mode: 'open' });
  
  const style = document.createElement('style');
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');

    :host {
      all: initial;
      font-family: 'Outfit', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }

    .overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(10, 11, 18, 0.6);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.25s ease-out forwards;
    }

    .modal {
      background: #1a1d2d;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 20px;
      width: 90%;
      max-width: 480px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5), 0 0 40px rgba(99, 102, 241, 0.1);
      overflow: hidden;
      color: #edf2f7;
      display: flex;
      flex-direction: column;
      animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    .modal-header {
      padding: 20px 24px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .modal-header h2 {
      font-size: 20px;
      font-weight: 600;
      margin: 0;
      background: linear-gradient(135deg, #6366f1, #d946ef);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .btn-close {
      background: transparent;
      border: none;
      color: #a0aec0;
      font-size: 24px;
      cursor: pointer;
      padding: 0;
      line-height: 1;
      transition: color 0.2s, transform 0.2s;
    }

    .btn-close:hover {
      color: #edf2f7;
      transform: rotate(90deg);
    }

    .modal-body {
      padding: 24px;
      max-height: 70vh;
      overflow-y: auto;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-group label {
      display: block;
      font-size: 13px;
      font-weight: 500;
      color: #a0aec0;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    input[type="text"] {
      width: 100%;
      box-sizing: border-box;
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #edf2f7;
      padding: 12px 16px;
      border-radius: 10px;
      font-family: inherit;
      font-size: 15px;
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    input[type="text"]:focus {
      outline: none;
      border-color: #6366f1;
      box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
    }

    .tab-type-selector {
      display: flex;
      gap: 8px;
      background: rgba(0, 0, 0, 0.2);
      padding: 4px;
      border-radius: 10px;
      margin-bottom: 12px;
    }

    .tab-btn {
      flex: 1;
      background: transparent;
      border: none;
      color: #a0aec0;
      padding: 8px;
      border-radius: 8px;
      font-family: inherit;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .tab-btn.active {
      background: rgba(255, 255, 255, 0.08);
      color: #edf2f7;
    }

    .section-content {
      display: block;
    }

    .section-content.hidden {
      display: none !important;
    }

    .emoji-picker-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .quick-emojis {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .quick-emoji {
      font-size: 20px;
      padding: 8px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.04);
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
      user-select: none;
    }

    .quick-emoji:hover {
      background: rgba(255, 255, 255, 0.08);
      transform: scale(1.15);
    }

    .quick-emoji.selected {
      background: rgba(99, 102, 241, 0.15);
      border-color: rgba(99, 102, 241, 0.4);
    }

    .file-picker-container {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    input[type="file"] {
      flex: 1;
      color: #a0aec0;
      font-size: 14px;
    }

    input[type="file"]::file-selector-button {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #edf2f7;
      padding: 8px 16px;
      border-radius: 8px;
      cursor: pointer;
      font-family: inherit;
      margin-right: 12px;
      transition: all 0.2s;
    }

    input[type="file"]::file-selector-button:hover {
      background: rgba(255, 255, 255, 0.12);
    }

    .image-preview {
      width: 48px;
      height: 48px;
      border-radius: 8px;
      background: rgba(0, 0, 0, 0.2);
      border: 1px dashed rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    .image-preview img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .preview-placeholder {
      font-size: 9px;
      color: #a0aec0;
      text-align: center;
    }

    .rule-options {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .radio-label {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      background: rgba(0, 0, 0, 0.15);
      border: 1px solid rgba(255, 255, 255, 0.04);
      padding: 12px;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .radio-label:hover {
      background: rgba(255, 255, 255, 0.04);
      border-color: rgba(99, 102, 241, 0.2);
    }

    .radio-label input[type="radio"] {
      accent-color: #6366f1;
      margin-top: 3px;
      cursor: pointer;
    }

    .radio-custom-content {
      display: flex;
      flex-direction: column;
    }

    .radio-custom-content strong {
      font-size: 14px;
      color: #edf2f7;
    }

    .radio-custom-content span {
      font-size: 12px;
      color: #a0aec0;
      margin-top: 2px;
    }

    .modal-footer {
      padding: 16px 24px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(0, 0, 0, 0.1);
    }

    .btn {
      font-family: inherit;
      font-size: 14px;
      font-weight: 600;
      padding: 10px 18px;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-primary {
      background: linear-gradient(135deg, #6366f1, #d946ef);
      color: white;
      box-shadow: 0 4px 15px rgba(99, 102, 241, 0.25);
    }

    .btn-primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(99, 102, 241, 0.35);
    }

    .btn-muted {
      background: transparent;
      color: #a0aec0;
      border: 1px solid rgba(255, 255, 255, 0.08);
    }

    .btn-muted:hover {
      background: rgba(255, 255, 255, 0.04);
      color: #edf2f7;
    }

    .btn-secondary {
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
      border: 1px solid rgba(239, 68, 68, 0.2);
    }

    .btn-secondary:hover {
      background: rgba(239, 68, 68, 0.2);
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `;
  shadow.appendChild(style);
  
  const container = document.createElement('div');
  container.className = 'overlay';
  
  const prefilledTitle = matchedRule ? (matchedRule.actionTitle || '') : '';
  const prefilledIconType = matchedRule ? (matchedRule.actionIconType || 'emoji') : 'emoji';
  const prefilledIconValue = matchedRule ? (matchedRule.actionIconValue || '') : '';
  
  let hostname = '';
  try {
    hostname = new URL(currentUrl).hostname;
  } catch (e) {
    hostname = window.location.hostname;
  }
  
  container.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h2>Tab anpassen 🚀</h2>
        <button class="btn-close" id="closeBtn">&times;</button>
      </div>
      
      <div class="modal-body">
        <div class="form-group">
          <label>Tab-Name (Titel)</label>
          <input type="text" id="tabTitleInput" placeholder="Name des Tabs eingeben..." value="${prefilledTitle}">
        </div>
        
        <div class="form-group">
          <label>Tab-Icon (Favicon)</label>
          <div class="tab-type-selector">
            <button class="tab-btn ${prefilledIconType === 'emoji' ? 'active' : ''}" id="emojiTabBtn">Emoji</button>
            <button class="tab-btn ${prefilledIconType === 'image' ? 'active' : ''}" id="imageTabBtn">Custom Image</button>
          </div>
          
          <!-- Emoji Section -->
          <div id="emojiSection" class="section-content ${prefilledIconType === 'emoji' ? '' : 'hidden'}">
            <div class="emoji-picker-container">
              <input type="text" id="emojiInput" placeholder="Emoji eingeben (z. B. 🔥)" value="${prefilledIconType === 'emoji' ? prefilledIconValue : ''}" maxlength="5">
              <div class="quick-emojis">
                <span class="quick-emoji ${prefilledIconType === 'emoji' && prefilledIconValue === '🚀' ? 'selected' : ''}">🚀</span>
                <span class="quick-emoji ${prefilledIconType === 'emoji' && prefilledIconValue === '🔥' ? 'selected' : ''}">🔥</span>
                <span class="quick-emoji ${prefilledIconType === 'emoji' && prefilledIconValue === '💻' ? 'selected' : ''}">💻</span>
                <span class="quick-emoji ${prefilledIconType === 'emoji' && prefilledIconValue === '📊' ? 'selected' : ''}">📊</span>
                <span class="quick-emoji ${prefilledIconType === 'emoji' && prefilledIconValue === '📝' ? 'selected' : ''}">📝</span>
                <span class="quick-emoji ${prefilledIconType === 'emoji' && prefilledIconValue === '🛠️' ? 'selected' : ''}">🛠️</span>
                <span class="quick-emoji ${prefilledIconType === 'emoji' && prefilledIconValue === '💡' ? 'selected' : ''}">💡</span>
                <span class="quick-emoji ${prefilledIconType === 'emoji' && prefilledIconValue === '🔒' ? 'selected' : ''}">🔒</span>
                <span class="quick-emoji ${prefilledIconType === 'emoji' && prefilledIconValue === '🎨' ? 'selected' : ''}">🎨</span>
                <span class="quick-emoji ${prefilledIconType === 'emoji' && prefilledIconValue === '💬' ? 'selected' : ''}">💬</span>
              </div>
            </div>
          </div>
          
          <!-- Custom Image Section -->
          <div id="imageSection" class="section-content ${prefilledIconType === 'image' ? '' : 'hidden'}">
            <div class="file-picker-container">
              <input type="file" id="imageFileInput" accept="image/png, image/jpeg, image/x-icon, image/svg+xml">
              <div id="modalImagePreview" class="image-preview">
                ${prefilledIconType === 'image' && prefilledIconValue ? `<img src="${prefilledIconValue}" style="width:100%; height:100%; object-fit:contain;">` : '<span class="preview-placeholder">Kein Bild</span>'}
              </div>
            </div>
          </div>
        </div>
        
        <div class="form-group">
          <label>Regel-Typ (Gültigkeit)</label>
          <div class="rule-options">
            <label class="radio-label">
              <input type="radio" name="ruleScope" value="temporary" ${matchedScope === 'temporary' ? 'checked' : ''}>
              <div class="radio-custom-content">
                <strong>Nur für diesen Tab (Temporär)</strong>
                <span>Wird beim Schließen des Tabs gelöscht</span>
              </div>
            </label>
            <label class="radio-label">
              <input type="radio" name="ruleScope" value="exact" ${matchedScope === 'exact' ? 'checked' : ''}>
              <div class="radio-custom-content">
                <strong>Für diese genaue URL (Dauerhaft)</strong>
                <span>Gilt immer auf dieser spezifischen URL</span>
              </div>
            </label>
            <label class="radio-label">
              <input type="radio" name="ruleScope" value="domain" ${matchedScope === 'domain' ? 'checked' : ''}>
              <div class="radio-custom-content">
                <strong>Für die gesamte Website (Dauerhaft)</strong>
                <span>Gilt für alle Seiten von ${hostname}</span>
              </div>
            </label>
          </div>
        </div>
      </div>
      
      <div class="modal-footer">
        <button class="btn btn-secondary" id="resetBtn">Zurücksetzen</button>
        <div style="display: flex; gap: 10px;">
          <button class="btn btn-muted" id="cancelBtn">Abbrechen</button>
          <button class="btn btn-primary" id="saveBtn">Speichern</button>
        </div>
      </div>
    </div>
  `;
  shadow.appendChild(container);
  
  const closeBtn = shadow.getElementById('closeBtn');
  const cancelBtn = shadow.getElementById('cancelBtn');
  const resetBtn = shadow.getElementById('resetBtn');
  const saveBtn = shadow.getElementById('saveBtn');
  const overlay = shadow.querySelector('.overlay');
  
  const emojiTabBtn = shadow.getElementById('emojiTabBtn');
  const imageTabBtn = shadow.getElementById('imageTabBtn');
  const emojiSection = shadow.getElementById('emojiSection');
  const imageSection = shadow.getElementById('imageSection');
  
  const emojiInput = shadow.getElementById('emojiInput');
  const imageFileInput = shadow.getElementById('imageFileInput');
  const imagePreview = shadow.getElementById('modalImagePreview');
  
  let uploadedImageDataUrl = prefilledIconType === 'image' ? prefilledIconValue : '';
  
  function cleanupModal() {
    root.remove();
  }
  
  closeBtn.addEventListener('click', cleanupModal);
  cancelBtn.addEventListener('click', cleanupModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      cleanupModal();
    }
  });
  
  emojiTabBtn.addEventListener('click', () => {
    emojiTabBtn.classList.add('active');
    imageTabBtn.classList.remove('active');
    emojiSection.classList.remove('hidden');
    imageSection.classList.add('hidden');
  });

  imageTabBtn.addEventListener('click', () => {
    imageTabBtn.classList.add('active');
    emojiTabBtn.classList.remove('active');
    imageSection.classList.remove('hidden');
    emojiSection.classList.add('hidden');
  });
  
  shadow.querySelectorAll('.quick-emoji').forEach(elem => {
    elem.addEventListener('click', () => {
      shadow.querySelectorAll('.quick-emoji').forEach(e => e.classList.remove('selected'));
      elem.classList.add('selected');
      emojiInput.value = elem.textContent;
    });
  });
  
  emojiInput.addEventListener('input', () => {
    shadow.querySelectorAll('.quick-emoji').forEach(e => e.classList.remove('selected'));
  });
  
  imageFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        uploadedImageDataUrl = event.target.result;
        imagePreview.innerHTML = `<img src="${uploadedImageDataUrl}" style="width:100%; height:100%; object-fit:contain;">`;
      };
      reader.readAsDataURL(file);
    }
  });
  
  resetBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'CLEAR_TEMP_RULE' }, (res) => {
      if (matchedScope === 'exact' && matchedRule && matchedRule.id) {
        chrome.storage.local.get(['rules'], (resRules) => {
          const updatedRules = (resRules.rules || []).filter(r => r.id !== matchedRule.id);
          chrome.storage.local.set({ rules: updatedRules }, () => {
            cleanupModal();
          });
        });
      } else {
        cleanupModal();
      }
    });
  });
  
  saveBtn.addEventListener('click', () => {
    const newTitle = shadow.getElementById('tabTitleInput').value.trim();
    
    const isEmojiActive = emojiTabBtn.classList.contains('active');
    let iconType = 'emoji';
    let iconValue = '';
    
    if (isEmojiActive) {
      iconType = 'emoji';
      iconValue = emojiInput.value.trim();
    } else {
      iconType = 'image';
      iconValue = uploadedImageDataUrl;
    }
    
    const selectedScope = shadow.querySelector('input[name="ruleScope"]:checked').value;
    
    if (selectedScope === 'temporary') {
      chrome.runtime.sendMessage({
        type: 'SET_TEMP_RULE',
        rule: {
          actionTitle: newTitle,
          actionIconType: iconType,
          actionIconValue: iconValue
        }
      }, (res) => {
        cleanupModal();
      });
    } else {
      let conditionType = 'exact';
      let conditionValue = window.location.href;
      
      if (selectedScope === 'domain') {
        conditionType = 'contains';
        conditionValue = hostname;
      }
      
      chrome.storage.local.get(['rules'], (result) => {
        let currentRules = result.rules || [];
        
        if (matchedRule && matchedRule.id && (matchedScope === selectedScope)) {
          currentRules = currentRules.filter(r => r.id !== matchedRule.id);
        } else {
          currentRules = currentRules.filter(r => !(r.conditionType === conditionType && r.conditionValue.toLowerCase() === conditionValue.toLowerCase()));
        }
        
        const newRule = {
          id: 'rule_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
          conditionType: conditionType,
          conditionValue: conditionValue,
          actionTitle: newTitle,
          actionIconType: iconType,
          actionIconValue: iconValue
        };
        
        currentRules.unshift(newRule);
        
        chrome.storage.local.set({ rules: currentRules }, () => {
          chrome.runtime.sendMessage({ type: 'CLEAR_TEMP_RULE' }, () => {
            cleanupModal();
          });
        });
      });
    }
  });
}
