// Background service worker - API communication

const API_URL = 'http://localhost:5000';

console.log('Job Application Filler: Background worker loaded');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'processFields') {
    processAllFields(request.fields)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ error: error.message }));
    return true;  // Keep channel open
  }
  
  if (request.action === 'saveAnswer') {
    saveClosedAnswer(request.question, request.answer)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }
});

async function processAllFields(fields) {
  /**
   * Process all fields according to their category:
   * - resume-data: Get from resume
   * - closed-ended: Check history
   * - open-ended: Generate with Gemini
   */
  
  const results = {
    resume_fields: [],
    known_closed: [],
    unknown_closed: [],
    open_ended: []
  };
  
  try {
    // Get resume data once
    const resumeData = await fetch(`${API_URL}/api/parse-resume`).then(r => r.json());
    
    for (const field of fields) {
      const question = field.label || field.placeholder || field.name;
      
      if (field.field_category === 'resume-data') {
        // Fill from resume immediately
        const answer = getResumeDataAnswer(field, resumeData);
        if (answer) {
          results.resume_fields.push({
            ...field,
            answer: answer,
            source: 'resume'
          });
        }
      }
      else if (field.field_category === 'closed-ended') {
        // Check history
        const response = await fetch(`${API_URL}/api/closed-question`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: question })
        });
        
        const data = await response.json();
        
        if (data.found) {
          results.known_closed.push({
            ...field,
            answer: data.answer,
            source: 'history'
          });
        } else {
          results.unknown_closed.push({
            ...field,
            source: 'needs_manual'
          });
        }
      }
      else if (field.field_category === 'open-ended') {
        // Generate with Gemini
        try {
          const response = await fetch(`${API_URL}/api/open-question`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question: question })
          });
          
          const data = await response.json();
          
          results.open_ended.push({
            ...field,
            answer: data.answer,
            source: 'ai_generated'
          });
        } catch (error) {
          console.error(`Error generating answer for: ${question}`, error);
          results.open_ended.push({
            ...field,
            answer: '',
            source: 'ai_error',
            error: error.message
          });
        }
      }
    }
    
    return {
      success: true,
      results: results,
      summary: {
        total: fields.length,
        resume_filled: results.resume_fields.length,
        history_filled: results.known_closed.length,
        needs_manual: results.unknown_closed.length,
        ai_generated: results.open_ended.length
      }
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

function getResumeDataAnswer(field, resumeData) {
  /**
   * Extract answer from resume data based on field type
   */
  const label = field.label.toLowerCase();
  const name = (field.name || '').toLowerCase();
  const combined = `${label} ${name}`;
  
  if (combined.includes('name') && !combined.includes('company')) {
    return resumeData.name;
  }
  if (combined.includes('email')) {
    return resumeData.email;
  }
  if (combined.includes('phone') || combined.includes('tel')) {
    return resumeData.phone;
  }
  
  return '';
}

async function saveClosedAnswer(question, answer) {
  /**
   * Save a closed-ended answer to history
   */
  try {
    const response = await fetch(`${API_URL}/api/closed-question`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: question,
        answer: answer
      })
    });
    
    const data = await response.json();
    return { success: true, data: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Health check
setInterval(async () => {
  try {
    await fetch(`${API_URL}/api/health`);
  } catch (error) {
    console.warn('Backend health check failed');
  }
}, 60000);
