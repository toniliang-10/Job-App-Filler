// Background service worker - handles API communication

const API_URL = 'http://localhost:5000';

console.log('Job Application Filler: Background service worker loaded');

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'generateAnswers') {
    generateAnswersForFields(request.fields, request.mode)
      .then(answers => {
        sendResponse({ success: true, answers: answers });
      })
      .catch(error => {
        console.error('Error generating answers:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep channel open for async response
  }
});

async function generateAnswersForFields(fields, mode) {
  const answers = [];
  
  console.log(`Generating answers for ${fields.length} fields`);
  
  for (const field of fields) {
    try {
      // Construct question from field
      const question = constructQuestion(field);
      
      // Generate answer via API
      const answer = await generateAnswer(question, field);
      
      answers.push({
        index: field.index,
        question: question,
        answer: answer.answer,
        confidence: answer.confidence,
        field_type: field.field_type
      });
      
      console.log(`Generated answer for: ${question}`);
      
    } catch (error) {
      console.error(`Error generating answer for field ${field.index}:`, error);
      // Continue with other fields even if one fails
      answers.push({
        index: field.index,
        question: field.label || field.name,
        answer: '',
        confidence: 0.0,
        field_type: field.field_type,
        error: error.message
      });
    }
  }
  
  return answers;
}

function constructQuestion(field) {
  let question = '';
  
  if (field.label) {
    question = field.label;
  } else if (field.placeholder) {
    question = field.placeholder;
  } else if (field.name) {
    // Convert name to readable format
    question = field.name.replace(/[_-]/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2');
  }
  
  // Ensure it ends with a question mark
  if (question && !question.endsWith('?')) {
    question += '?';
  }
  
  return question;
}

async function generateAnswer(question, field) {
  const requestBody = {
    question: question,
    field_type: field.field_type,
    options: field.options || null,
    max_length: field.field_type === 'textarea' ? 2000 : 500
  };
  
  try {
    const response = await fetch(`${API_URL}/api/generate-answer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }
    
    return {
      answer: data.answer || '',
      confidence: data.confidence || 0.0
    };
    
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}

// Check server health periodically
setInterval(async () => {
  try {
    const response = await fetch(`${API_URL}/api/health`);
    if (response.ok) {
      console.log('Server health check: OK');
    }
  } catch (error) {
    console.warn('Server health check: Failed');
  }
}, 60000); // Check every minute

