// Popup logic - Simplified workflow

const API_URL = 'http://localhost:5000';

let detectedFields = [];
let processedResults = null;
let unknownFields = [];

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await checkServerStatus();
  await restoreState(); // Restore previous state if popup was closed
  setupEventListeners();
});

async function checkServerStatus() {
  const statusIndicator = document.getElementById('server-status');
  const dot = statusIndicator.querySelector('.dot');
  const statusText = statusIndicator.querySelector('.status-text');
  const historyCount = document.getElementById('history-count');
  const fillBtn = document.getElementById('fill-btn');

  try {
    const response = await fetch(`${API_URL}/api/health`);
    
    if (response.ok) {
      const data = await response.json();
      
      dot.classList.add('online');
      statusText.textContent = 'Server Connected';
      fillBtn.disabled = false;
      
      // Show history count
      const historyResp = await fetch(`${API_URL}/api/history`);
      const historyData = await historyResp.json();
      document.getElementById('history-number').textContent = historyData.count;
      historyCount.style.display = 'block';
    } else {
      throw new Error('Server not responding');
    }
  } catch (error) {
    dot.classList.add('offline');
    statusText.textContent = 'Server Offline';
    statusText.title = 'Run: python backend.py';
    fillBtn.disabled = true;
  }
}

function setupEventListeners() {
  document.getElementById('fill-btn').addEventListener('click', fillApplication);
  document.getElementById('save-manual-btn').addEventListener('click', saveManualAnswers);
  document.getElementById('clear-history-btn').addEventListener('click', clearHistory);
  document.getElementById('new-form-btn').addEventListener('click', resetToStart);
}

function resetToStart() {
  // Clear state and reset UI
  clearState();
  document.getElementById('results-section').style.display = 'none';
  document.getElementById('main-actions').style.display = 'block';
}

async function fillApplication() {
  // Clear any previous state when starting new fill
  await clearState();
  
  showLoading('Detecting fields...');
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Step 1: Detect fields
    chrome.tabs.sendMessage(tab.id, { action: 'detectFields' }, async (response) => {
      if (chrome.runtime.lastError) {
        hideLoading();
        alert('Error: Could not connect to page. Try refreshing the page.');
        return;
      }
      
      if (!response || !response.fields) {
        hideLoading();
        alert('No form fields detected on this page.');
        return;
      }
      
      detectedFields = response.fields;
      showLoading(`Processing ${response.fields.length} fields...`);
      
      // Step 2: Process fields through backend
      chrome.runtime.sendMessage({
        action: 'processFields',
        fields: response.fields
      }, (result) => {
        if (result.error) {
          hideLoading();
          alert('Error processing fields: ' + result.error);
          return;
        }
        
        processedResults = result.results;
        unknownFields = result.results.unknown_closed;
        
        // Step 3: Auto-fill known fields
        fillKnownFields(result);
      });
    });
  } catch (error) {
    hideLoading();
    alert('Error: ' + error.message);
  }
}

async function fillKnownFields(result) {
  showLoading('Filling known fields...');
  
  try {
    // Combine all fields that have valid answers (filter out placeholders)
    const isValidAnswer = (answer) => {
      if (!answer || !answer.trim()) return false;
      const lower = answer.toLowerCase();
      return !lower.includes('user provided answer') && 
             !lower.includes('placeholder') &&
             !lower.includes('error') &&
             !lower.includes('question not in history');
    };
    
    const fieldsToFill = [
      ...result.results.resume_fields.filter(f => isValidAnswer(f.answer)),
      ...result.results.known_closed.filter(f => isValidAnswer(f.answer)),
      ...result.results.open_ended.filter(f => isValidAnswer(f.answer))
    ];
    
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    chrome.tabs.sendMessage(tab.id, {
      action: 'fillFields',
      fields: fieldsToFill,
      mode: 'auto'
    }, (response) => {
      hideLoading();
      
      if (!response || !response.success) {
        alert('Error filling fields');
        return;
      }
      
      // Show results
      displayResults(result);
    });
  } catch (error) {
    hideLoading();
    alert('Error: ' + error.message);
  }
}

function displayResults(result) {
  const resultsSection = document.getElementById('results-section');
  const mainActions = document.getElementById('main-actions');
  const manualSection = document.getElementById('manual-section');
  const saveSection = document.getElementById('save-section');
  const successBanner = document.getElementById('success-banner');
  const newFormBtn = document.getElementById('new-form-btn');
  const summary = result.summary;
  
  // Calculate filled vs unknown
  const filledCount = summary.resume_filled + summary.history_filled + summary.ai_generated;
  
  document.getElementById('filled-count').textContent = filledCount;
  document.getElementById('unknown-count').textContent = summary.needs_manual;
  
  // Hide main actions, show results section
  mainActions.style.display = 'none';
  resultsSection.style.display = 'block';
  
  // Reset displays
  manualSection.style.display = 'none';
  successBanner.style.display = 'none';
  newFormBtn.style.display = 'none';
  
  // ALWAYS show save button after filling (this is the key fix!)
  saveSection.style.display = 'block';
  
  // Show optional list of unknown fields (collapsible)
  if (summary.needs_manual > 0 && result.results.unknown_closed.length > 0) {
    const manualList = document.getElementById('manual-list');
    const manualCount = document.getElementById('manual-count');
    manualList.innerHTML = '';
    manualCount.textContent = result.results.unknown_closed.length;
    
    result.results.unknown_closed.forEach(field => {
      const li = document.createElement('li');
      li.className = 'field-item manual';
      li.setAttribute('data-field-index', field.index);
      
      const label = field.label || field.placeholder || field.name || 'Unknown field';
      
      li.innerHTML = `
        <div class="field-label">❓ ${label}</div>
        <div class="field-hint">Not in history yet</div>
      `;
      manualList.appendChild(li);
    });
    
    manualSection.style.display = 'block';
    console.log(`Showing ${result.results.unknown_closed.length} fields that need manual input`);
  }
  
  // If all fields were auto-filled, show success message too
  if (summary.needs_manual === 0) {
    successBanner.style.display = 'block';
  }
  
  // Save state so it persists when popup closes
  saveState(result);
}

async function saveManualAnswers() {
  if (!unknownFields || unknownFields.length === 0) {
    alert('No new answers to save');
    return;
  }
  
  showLoading('Reading your answers...');
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Get current values from the page
    chrome.tabs.sendMessage(tab.id, { 
      action: 'getFieldValues',
      fieldIndexes: unknownFields.map(f => f.index)
    }, async (response) => {
      if (!response || !response.values) {
        hideLoading();
        alert('Could not read field values from page');
        return;
      }
      
      showLoading('Saving answers...');
      
      let savedCount = 0;
      
      // Save each answer to backend
      for (const fieldIndex of unknownFields.map(f => f.index)) {
        const unknownField = unknownFields.find(f => f.index === fieldIndex);
        const currentValue = response.values[fieldIndex];
        
        if (currentValue && currentValue.trim()) {
          try {
            const saveResponse = await fetch(`${API_URL}/api/closed-question`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                question: unknownField.label,
                answer: currentValue
              })
            });
            
            if (saveResponse.ok) {
              savedCount++;
            }
          } catch (error) {
            console.error('Error saving answer:', error);
          }
        }
      }
      
      hideLoading();
      
       if (savedCount > 0) {
         alert(`✅ Saved ${savedCount} answer(s) for future use!\n\nNext time you fill a similar form, these questions will be auto-filled.`);
         
         // Update history count
         const historyResp = await fetch(`${API_URL}/api/history`);
         const historyData = await historyResp.json();
         document.getElementById('history-number').textContent = historyData.count;
         
         // Hide save section and manual list, show success
         document.getElementById('save-section').style.display = 'none';
         document.getElementById('manual-section').style.display = 'none';
         document.getElementById('success-banner').style.display = 'block';
         document.getElementById('new-form-btn').style.display = 'block';
         
         // Clear state since we're done
         await clearState();
       } else {
         alert('⚠️ No filled fields found to save.\n\nPlease fill the fields on the page first, then click "Save My Answers".');
       }
     });
  } catch (error) {
    hideLoading();
    alert('Error: ' + error.message);
  }
}

async function clearHistory() {
  if (!confirm('Clear all saved answers? This cannot be undone.')) {
    return;
  }
  
  try {
    await fetch(`${API_URL}/api/clear-history`, { method: 'POST' });
    await clearState(); // Also clear popup state
    alert('✅ History cleared');
    document.getElementById('history-number').textContent = '0';
    
    // Reset UI
    document.getElementById('results-section').style.display = 'none';
    document.getElementById('manual-section').style.display = 'none';
    document.getElementById('success-banner').style.display = 'none';
  } catch (error) {
    alert('Error clearing history: ' + error.message);
  }
}

function showLoading(text) {
  document.getElementById('loading-text').textContent = text;
  document.getElementById('loading').style.display = 'flex';
}

function hideLoading() {
  document.getElementById('loading').style.display = 'none';
}

// State persistence - so popup doesn't reset when you click away
async function saveState(result) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const state = {
      tabId: tab.id,
      url: tab.url,
      timestamp: Date.now(),
      processedResults: result,
      unknownFields: result.results.unknown_closed,
      detectedFields: detectedFields
    };
    await chrome.storage.local.set({ 'jaf_popup_state': state });
    console.log('State saved:', state);
  } catch (error) {
    console.error('Error saving state:', error);
  }
}

async function restoreState() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const stored = await chrome.storage.local.get('jaf_popup_state');
    
    if (stored.jaf_popup_state) {
      const state = stored.jaf_popup_state;
      
      // Check if state is for current tab and recent (within 10 minutes)
      const age = Date.now() - state.timestamp;
      if (state.tabId === tab.id && state.url === tab.url && age < 10 * 60 * 1000) {
        console.log('Restoring previous state:', state);
        
        processedResults = state.processedResults;
        unknownFields = state.unknownFields || [];
        detectedFields = state.detectedFields || [];
        
        // Restore UI
        displayResults(state.processedResults);
        return true;
      }
    }
    
    // Clear old/invalid state
    await chrome.storage.local.remove('jaf_popup_state');
    return false;
  } catch (error) {
    console.error('Error restoring state:', error);
    return false;
  }
}

async function clearState() {
  await chrome.storage.local.remove('jaf_popup_state');
  console.log('State cleared');
}
