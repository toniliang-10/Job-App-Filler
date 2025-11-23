// Popup UI logic
const API_URL = 'http://localhost:5000';

let currentFields = [];

// Check server status on popup open
document.addEventListener('DOMContentLoaded', async () => {
  await checkServerStatus();
  setupEventListeners();
});

async function checkServerStatus() {
  const statusIndicator = document.getElementById('server-status');
  const dot = statusIndicator.querySelector('.dot');
  const statusText = statusIndicator.querySelector('.status-text');
  const statsSection = document.getElementById('stats-section');
  const buttons = document.querySelectorAll('.btn-primary, .btn-secondary');

  try {
    const response = await fetch(`${API_URL}/api/status`);
    
    if (response.ok) {
      const data = await response.json();
      
      dot.classList.add('online');
      statusText.textContent = 'Server Connected';
      
      // Show stats
      statsSection.style.display = 'flex';
      document.getElementById('doc-count').textContent = data.documents || 0;
      document.getElementById('answer-count').textContent = data.total_answers || 0;
      
      // Enable buttons
      buttons.forEach(btn => btn.disabled = false);
    } else {
      throw new Error('Server not responding');
    }
  } catch (error) {
    dot.classList.add('offline');
    statusText.textContent = 'Server Offline - Start API server';
    statsSection.style.display = 'none';
    buttons.forEach(btn => btn.disabled = true);
  }
}

function setupEventListeners() {
  document.getElementById('detect-fields-btn').addEventListener('click', detectFields);
  document.getElementById('fill-interactive-btn').addEventListener('click', () => fillFields('interactive'));
  document.getElementById('fill-auto-btn').addEventListener('click', () => fillFields('auto'));
  document.getElementById('suggest-only-btn').addEventListener('click', () => fillFields('suggest'));
  document.getElementById('view-history-btn').addEventListener('click', viewHistory);
  document.getElementById('settings-btn').addEventListener('click', openSettings);
}

async function detectFields() {
  showLoading(true);
  
  try {
    // Send message to content script to detect fields
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    chrome.tabs.sendMessage(tab.id, { action: 'detectFields' }, (response) => {
      showLoading(false);
      
      if (chrome.runtime.lastError) {
        alert('Error: Could not connect to page. Try refreshing the page.');
        return;
      }
      
      if (response && response.fields) {
        currentFields = response.fields;
        displayFields(response.fields);
      } else {
        alert('No form fields detected on this page.');
      }
    });
  } catch (error) {
    showLoading(false);
    alert('Error detecting fields: ' + error.message);
  }
}

function displayFields(fields) {
  const resultsSection = document.getElementById('results-section');
  const fieldsList = document.getElementById('fields-list');
  const fieldCount = document.getElementById('field-count');
  
  fieldCount.textContent = fields.length;
  fieldsList.innerHTML = '';
  
  fields.forEach((field, index) => {
    const fieldItem = document.createElement('div');
    fieldItem.className = 'field-item';
    fieldItem.innerHTML = `
      <div class="field-label">${field.label || 'Unnamed field'}</div>
      <div class="field-type">${field.field_type}</div>
      ${field.options ? `<div style="font-size: 11px; color: #6c757d; margin-top: 5px;">${field.options.length} options</div>` : ''}
    `;
    fieldsList.appendChild(fieldItem);
  });
  
  resultsSection.style.display = 'block';
}

async function fillFields(mode) {
  if (currentFields.length === 0) {
    alert('Please detect fields first');
    return;
  }
  
  showLoading(true);
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Send fields to background script for answer generation
    chrome.runtime.sendMessage({
      action: 'generateAnswers',
      fields: currentFields,
      mode: mode
    }, (response) => {
      if (response && response.success) {
        // Send answers to content script to fill
        chrome.tabs.sendMessage(tab.id, {
          action: 'fillFields',
          answers: response.answers,
          mode: mode
        }, (fillResponse) => {
          showLoading(false);
          
          if (fillResponse && fillResponse.success) {
            alert(`Successfully processed ${fillResponse.filled} field(s)!`);
          } else {
            alert('Error filling fields');
          }
        });
      } else {
        showLoading(false);
        alert('Error generating answers: ' + (response?.error || 'Unknown error'));
      }
    });
  } catch (error) {
    showLoading(false);
    alert('Error: ' + error.message);
  }
}

function viewHistory() {
  // Open history in new tab or modal
  window.open('history.html', '_blank');
}

function openSettings() {
  // Open settings page
  alert('Settings coming soon! Configure in config/settings.yaml for now.');
}

function showLoading(show) {
  document.getElementById('loading').style.display = show ? 'flex' : 'none';
}

