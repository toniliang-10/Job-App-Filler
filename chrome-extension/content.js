// Content script - Detects and fills form fields

console.log('Job Application Filler: Content script loaded');

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'detectFields') {
    const fields = detectAndClassifyFields();
    sendResponse({ fields: fields });
  } 
  else if (request.action === 'fillFields') {
    fillFormFields(request.fields, request.mode);
    sendResponse({ success: true });
  }
  else if (request.action === 'getFieldValues') {
    const values = getFieldValues(request.fieldIndexes);
    sendResponse({ values: values });
  }
  return true;
});

function detectAndClassifyFields() {
  const fields = [];
  let fieldIndex = 0;

  // Detect all input fields
  const inputs = document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"])');
  
  inputs.forEach(input => {
    const type = input.type || 'text';
    
    // Skip file inputs
    if (type === 'file') return;
    
    const field = {
      index: fieldIndex++,
      element_type: type,
      field_category: classifyField(input, type),
      label: extractLabel(input),
      name: input.name || '',
      placeholder: input.placeholder || '',
      required: input.required || false
    };
    
    input.setAttribute('data-jaf-index', field.index);
    
    if (field.label || field.name || field.placeholder) {
      fields.push(field);
    }
  });

  // Detect textareas (usually open-ended)
  const textareas = document.querySelectorAll('textarea');
  textareas.forEach(textarea => {
    const field = {
      index: fieldIndex++,
      element_type: 'textarea',
      field_category: 'open-ended',
      label: extractLabel(textarea),
      name: textarea.name || '',
      placeholder: textarea.placeholder || '',
      required: textarea.required || false
    };
    
    textarea.setAttribute('data-jaf-index', field.index);
    fields.push(field);
  });

  // Detect select dropdowns (closed-ended)
  const selects = document.querySelectorAll('select');
  selects.forEach(select => {
    const options = Array.from(select.querySelectorAll('option'))
      .map(opt => opt.textContent.trim())
      .filter(opt => opt && opt.toLowerCase() !== 'select' && opt !== '--');
    
    const field = {
      index: fieldIndex++,
      element_type: 'select',
      field_category: 'closed-ended',
      label: extractLabel(select),
      name: select.name || '',
      options: options,
      required: select.required || false
    };
    
    select.setAttribute('data-jaf-index', field.index);
    fields.push(field);
  });

  // Detect radio button groups (closed-ended)
  const radioGroups = new Map();
  const radios = document.querySelectorAll('input[type="radio"]');
  
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
      element_type: 'radio',
      field_category: 'closed-ended',
      label: extractLabel(firstRadio, false) || findGroupLabel(firstRadio) || name,
      name: name,
      options: group.options,
      required: false
    };
    
    group.elements.forEach(radio => {
      radio.setAttribute('data-jaf-index', field.index);
      radio.setAttribute('data-jaf-group', name);
    });
    
    fields.push(field);
  });

  // Detect checkboxes (closed-ended)
  const checkboxes = document.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach(checkbox => {
    const field = {
      index: fieldIndex++,
      element_type: 'checkbox',
      field_category: 'closed-ended',
      label: extractLabel(checkbox, true),
      name: checkbox.name || '',
      required: checkbox.required || false
    };
    
    checkbox.setAttribute('data-jaf-index', field.index);
    fields.push(field);
  });

  console.log(`Detected ${fields.length} fields:`,
    `${fields.filter(f => f.field_category === 'closed-ended').length} closed,`,
    `${fields.filter(f => f.field_category === 'open-ended').length} open,`,
    `${fields.filter(f => f.field_category === 'resume-data').length} resume data`
  );
  
  return fields;
}

function getFieldValues(fieldIndexes) {
  /**
   * NEW FUNCTION: Get current values of specified fields from the page
   */
  const values = {};
  
  for (const index of fieldIndexes) {
    const elements = document.querySelectorAll(`[data-jaf-index="${index}"]`);
    
    if (elements.length === 0) continue;
    
    const element = elements[0];
    let value = '';
    
    if (element.type === 'radio') {
      // For radio groups, find the checked one
      const groupName = element.getAttribute('data-jaf-group');
      if (groupName) {
        const checkedRadio = document.querySelector(`input[type="radio"][data-jaf-group="${groupName}"]:checked`);
        if (checkedRadio) {
          value = extractLabel(checkedRadio, true);
        }
      }
    } else if (element.type === 'checkbox') {
      value = element.checked ? 'Yes' : 'No';
    } else if (element.tagName === 'SELECT') {
      const selectedOption = element.options[element.selectedIndex];
      value = selectedOption ? selectedOption.textContent.trim() : '';
    } else {
      value = element.value;
    }
    
    values[index] = value;
  }
  
  console.log('Read field values:', values);
  return values;
}

function classifyField(element, type) {
  const label = extractLabel(element).toLowerCase();
  const name = (element.name || '').toLowerCase();
  const placeholder = (element.placeholder || '').toLowerCase();
  const combined = `${label} ${name} ${placeholder}`;
  
  // Resume data fields
  if (combined.includes('name') && !combined.includes('company')) {
    return 'resume-data';
  }
  if (combined.includes('email') || type === 'email') {
    return 'resume-data';
  }
  if (combined.includes('phone') || combined.includes('tel') || type === 'tel') {
    return 'resume-data';
  }
  if (combined.includes('location') || combined.includes('address') || combined.includes('city')) {
    return 'resume-data';
  }
  
  return 'closed-ended';
}

function extractLabel(element, includeNearby = true) {
  if (element.id) {
    const label = document.querySelector(`label[for="${element.id}"]`);
    if (label) return label.textContent.trim();
  }
  
  const parentLabel = element.closest('label');
  if (parentLabel) {
    const clone = parentLabel.cloneNode(true);
    const inputClone = clone.querySelector('input, select, textarea');
    if (inputClone) inputClone.remove();
    return clone.textContent.trim();
  }
  
  if (element.getAttribute('aria-label')) {
    return element.getAttribute('aria-label').trim();
  }
  
  if (includeNearby && element.placeholder) {
    return element.placeholder.trim();
  }
  
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

async function fillFormFields(fieldsWithAnswers, mode) {
  console.log(`Filling ${fieldsWithAnswers.length} fields`);
  
  for (const fieldData of fieldsWithAnswers) {
    const elements = document.querySelectorAll(`[data-jaf-index="${fieldData.index}"]`);
    
    if (elements.length === 0) continue;
    
    const element = elements[0];
    const value = fieldData.answer;
    
    // Skip if no value or if it's placeholder/error text
    if (!value || !value.trim()) continue;
    const valueLower = value.toLowerCase();
    if (valueLower.includes('user provided answer') || 
        valueLower.includes('placeholder') ||
        valueLower.includes('error') ||
        valueLower.includes('question not in history')) {
      console.log(`Skipping placeholder text for field: ${fieldData.label}`);
      continue;
    }
    
    // Scroll to field
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await sleep(200);
    
    // Highlight field briefly
    const originalStyle = element.style.cssText;
    element.style.outline = '3px solid #667eea';
    element.style.outlineOffset = '2px';
    
    await sleep(300);
    
    // Fill based on type
    if (fieldData.element_type === 'select') {
      fillSelect(element, value, fieldData.options);
    } else if (fieldData.element_type === 'radio') {
      fillRadio(elements, value);
    } else if (fieldData.element_type === 'checkbox') {
      fillCheckbox(element, value);
    } else {
      fillText(element, value);
    }
    
    // Remove highlight
    element.style.cssText = originalStyle;
    
    await sleep(200);
  }
  
  console.log('Filling complete');
}

function fillText(element, value) {
  element.value = value;
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

function fillSelect(element, value, options) {
  const selectOptions = Array.from(element.options);
  
  for (const option of selectOptions) {
    if (option.textContent.trim().toLowerCase() === value.toLowerCase()) {
      element.value = option.value;
      element.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }
  }
  
  for (const option of selectOptions) {
    if (option.textContent.trim().toLowerCase().includes(value.toLowerCase())) {
      element.value = option.value;
      element.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }
  }
}

function fillRadio(elements, value) {
  for (const radio of elements) {
    const label = extractLabel(radio, true);
    if (label.toLowerCase().includes(value.toLowerCase())) {
      radio.checked = true;
      radio.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }
  }
}

function fillCheckbox(element, value) {
  const shouldCheck = value.toLowerCase().includes('yes') || value.toLowerCase().includes('true');
  element.checked = shouldCheck;
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Visual indicator
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
  display: none;
`;
indicator.textContent = '🚀 Auto-Fill Active';
document.body.appendChild(indicator);

setTimeout(() => {
  indicator.style.display = 'block';
  setTimeout(() => indicator.style.display = 'none', 2000);
}, 1000);
