// Content script - runs on web pages to detect and fill form fields

console.log('Job Application Filler: Content script loaded');

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'detectFields') {
    const fields = detectFormFields();
    sendResponse({ fields: fields });
  } else if (request.action === 'fillFields') {
    fillFormFields(request.answers, request.mode);
    sendResponse({ success: true, filled: request.answers.length });
  }
  return true; // Keep channel open for async response
});

function detectFormFields() {
  const fields = [];
  let fieldIndex = 0;

  // Detect text inputs and email/phone fields
  const inputs = document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="image"])');
  inputs.forEach(input => {
    const type = input.type || 'text';
    
    // Skip radio and checkbox for now (handle separately)
    if (type === 'radio' || type === 'checkbox') return;
    
    const field = {
      index: fieldIndex++,
      element_id: input.id || generateUniqueId(),
      field_type: classifyInputType(type, input),
      label: extractLabel(input),
      name: input.name || '',
      placeholder: input.placeholder || '',
      required: input.required || false,
      value: input.value || ''
    };
    
    // Store element reference for later filling
    input.setAttribute('data-jaf-index', field.index);
    
    if (field.label || field.name || field.placeholder) {
      fields.push(field);
    }
  });

  // Detect textareas
  const textareas = document.querySelectorAll('textarea');
  textareas.forEach(textarea => {
    const field = {
      index: fieldIndex++,
      element_id: textarea.id || generateUniqueId(),
      field_type: 'textarea',
      label: extractLabel(textarea),
      name: textarea.name || '',
      placeholder: textarea.placeholder || '',
      required: textarea.required || false,
      value: textarea.value || ''
    };
    
    textarea.setAttribute('data-jaf-index', field.index);
    
    fields.push(field);
  });

  // Detect select dropdowns
  const selects = document.querySelectorAll('select');
  selects.forEach(select => {
    const options = Array.from(select.querySelectorAll('option'))
      .map(opt => opt.textContent.trim())
      .filter(opt => opt && opt.toLowerCase() !== 'select' && opt !== '--');
    
    const field = {
      index: fieldIndex++,
      element_id: select.id || generateUniqueId(),
      field_type: 'select',
      label: extractLabel(select),
      name: select.name || '',
      required: select.required || false,
      options: options,
      value: select.value || ''
    };
    
    select.setAttribute('data-jaf-index', field.index);
    
    fields.push(field);
  });

  // Detect radio button groups
  const radios = document.querySelectorAll('input[type="radio"]');
  const radioGroups = new Map();
  
  radios.forEach(radio => {
    const name = radio.name;
    if (!name) return;
    
    if (!radioGroups.has(name)) {
      radioGroups.set(name, {
        index: fieldIndex++,
        elements: [],
        options: []
      });
    }
    
    const group = radioGroups.get(name);
    group.elements.push(radio);
    
    const optionLabel = extractLabel(radio, true);
    if (optionLabel) {
      group.options.push(optionLabel);
    }
  });
  
  radioGroups.forEach((group, name) => {
    const firstRadio = group.elements[0];
    const field = {
      index: group.index,
      element_id: name,
      field_type: 'radio',
      label: extractLabel(firstRadio, false) || findGroupLabel(firstRadio) || name,
      name: name,
      required: false,
      options: group.options
    };
    
    group.elements.forEach(radio => {
      radio.setAttribute('data-jaf-index', field.index);
    });
    
    fields.push(field);
  });

  // Detect checkboxes
  const checkboxes = document.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach(checkbox => {
    const field = {
      index: fieldIndex++,
      element_id: checkbox.id || generateUniqueId(),
      field_type: 'checkbox',
      label: extractLabel(checkbox, true),
      name: checkbox.name || '',
      required: checkbox.required || false,
      value: checkbox.checked ? 'Yes' : 'No'
    };
    
    checkbox.setAttribute('data-jaf-index', field.index);
    
    fields.push(field);
  });

  console.log(`Detected ${fields.length} form fields`);
  return fields;
}

function classifyInputType(type, element) {
  const typeMap = {
    'email': 'email',
    'tel': 'phone',
    'phone': 'phone',
    'date': 'date',
    'number': 'number',
    'text': 'text'
  };
  
  if (typeMap[type]) return typeMap[type];
  
  // Try to infer from name/id/placeholder
  const combined = `${element.name} ${element.id} ${element.placeholder}`.toLowerCase();
  
  if (combined.includes('email') || combined.includes('e-mail')) return 'email';
  if (combined.includes('phone') || combined.includes('tel') || combined.includes('mobile')) return 'phone';
  if (combined.includes('date') || combined.includes('dob')) return 'date';
  
  return 'text';
}

function extractLabel(element, includeNearby = true) {
  // Method 1: Label with for attribute
  if (element.id) {
    const label = document.querySelector(`label[for="${element.id}"]`);
    if (label) return label.textContent.trim();
  }
  
  // Method 2: Parent label
  const parentLabel = element.closest('label');
  if (parentLabel) {
    // Get text without the input
    const clone = parentLabel.cloneNode(true);
    const inputClone = clone.querySelector('input, select, textarea');
    if (inputClone) inputClone.remove();
    return clone.textContent.trim();
  }
  
  // Method 3: aria-label
  if (element.getAttribute('aria-label')) {
    return element.getAttribute('aria-label').trim();
  }
  
  // Method 4: placeholder (if allowed)
  if (includeNearby && element.placeholder) {
    return element.placeholder.trim();
  }
  
  // Method 5: nearby text
  if (includeNearby) {
    const prev = element.previousElementSibling;
    if (prev && (prev.tagName === 'LABEL' || prev.tagName === 'SPAN')) {
      return prev.textContent.trim();
    }
  }
  
  return '';
}

function findGroupLabel(element) {
  const fieldset = element.closest('fieldset');
  if (fieldset) {
    const legend = fieldset.querySelector('legend');
    if (legend) return legend.textContent.trim();
  }
  return '';
}

function generateUniqueId() {
  return 'jaf-' + Math.random().toString(36).substr(2, 9);
}

async function fillFormFields(answers, mode) {
  console.log(`Filling ${answers.length} fields in ${mode} mode`);
  
  for (const answer of answers) {
    const elements = document.querySelectorAll(`[data-jaf-index="${answer.index}"]`);
    
    if (elements.length === 0) {
      console.warn(`No element found for index ${answer.index}`);
      continue;
    }
    
    const element = elements[0];
    const value = answer.answer;
    
    // In interactive mode, ask for confirmation
    if (mode === 'interactive') {
      // Highlight the field
      highlightElement(element);
      
      const confirmed = confirm(
        `Field: ${answer.question}\n\n` +
        `Suggested answer: ${value}\n\n` +
        `Confidence: ${Math.round(answer.confidence * 100)}%\n\n` +
        `Fill this field?`
      );
      
      unhighlightElement(element);
      
      if (!confirmed) {
        continue;
      }
    }
    
    // Fill based on field type
    if (answer.field_type === 'select') {
      fillSelect(element, value);
    } else if (answer.field_type === 'radio') {
      fillRadio(elements, value);
    } else if (answer.field_type === 'checkbox') {
      fillCheckbox(element, value);
    } else {
      fillText(element, value);
    }
    
    // Add small delay between fields (human-like)
    await sleep(300);
  }
  
  console.log('Form filling complete');
}

function fillText(element, value) {
  element.value = value;
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

function fillSelect(element, value) {
  // Try exact match first
  const options = Array.from(element.options);
  let matched = false;
  
  for (const option of options) {
    if (option.textContent.trim().toLowerCase() === value.toLowerCase()) {
      element.value = option.value;
      matched = true;
      break;
    }
  }
  
  // Try fuzzy match if no exact match
  if (!matched) {
    for (const option of options) {
      if (option.textContent.trim().toLowerCase().includes(value.toLowerCase()) ||
          value.toLowerCase().includes(option.textContent.trim().toLowerCase())) {
        element.value = option.value;
        matched = true;
        break;
      }
    }
  }
  
  if (matched) {
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

function fillRadio(elements, value) {
  for (const radio of elements) {
    const label = extractLabel(radio, true);
    if (label.toLowerCase().includes(value.toLowerCase()) ||
        value.toLowerCase().includes(label.toLowerCase())) {
      radio.checked = true;
      radio.dispatchEvent(new Event('change', { bubbles: true }));
      break;
    }
  }
}

function fillCheckbox(element, value) {
  const shouldCheck = value.toLowerCase().includes('yes') || 
                     value.toLowerCase().includes('true');
  element.checked = shouldCheck;
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

function highlightElement(element) {
  element.style.outline = '3px solid #667eea';
  element.style.outlineOffset = '2px';
  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function unhighlightElement(element) {
  element.style.outline = '';
  element.style.outlineOffset = '';
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Visual indicator that extension is active
const indicator = document.createElement('div');
indicator.style.cssText = `
  position: fixed;
  top: 10px;
  right: 10px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 8px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  z-index: 999999;
  box-shadow: 0 2px 10px rgba(0,0,0,0.2);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  display: none;
`;
indicator.textContent = '🚀 Job App Filler Active';
document.body.appendChild(indicator);

// Show indicator briefly when page loads
setTimeout(() => {
  indicator.style.display = 'block';
  setTimeout(() => {
    indicator.style.display = 'none';
  }, 3000);
}, 1000);

