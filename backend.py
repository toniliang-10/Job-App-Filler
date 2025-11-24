"""
Simple Job Application Filler Backend
Handles resume parsing, question history, and Gemini API calls
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import json
import PyPDF2
from pathlib import Path
import google.generativeai as genai
from dotenv import load_dotenv
import re

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Paths
RESUME_PATH = "data/documents/RESUME TONI LIANG.pdf"
HISTORY_PATH = "data/qa_history.json"

# Global storage
resume_data = {}
qa_history = {}


def load_history():
    """Load Q&A history from JSON file"""
    global qa_history
    if os.path.exists(HISTORY_PATH):
        with open(HISTORY_PATH, 'r', encoding='utf-8') as f:
            qa_history = json.load(f)
    else:
        qa_history = {}
    print(f"✓ Loaded {len(qa_history)} historical answers")


def save_history():
    """Save Q&A history to JSON file"""
    os.makedirs(os.path.dirname(HISTORY_PATH), exist_ok=True)
    with open(HISTORY_PATH, 'w', encoding='utf-8') as f:
        json.dump(qa_history, f, indent=2, ensure_ascii=False)


def normalize_question(question):
    """Normalize question text for matching"""
    # Remove extra whitespace, punctuation, lowercase
    normalized = question.lower().strip()
    normalized = re.sub(r'[^\w\s]', '', normalized)
    normalized = re.sub(r'\s+', ' ', normalized)
    return normalized


def parse_resume_pdf(pdf_path):
    """Extract text from resume PDF"""
    try:
        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
        return text.strip()
    except Exception as e:
        print(f"Error parsing PDF: {e}")
        return ""


def extract_structured_data(resume_text):
    """Extract structured data from resume (basic implementation)"""
    # This is a simple version - you can enhance with better parsing
    data = {
        'full_text': resume_text,
        'name': '',
        'email': '',
        'phone': '',
        'education': '',
        'experience': '',
        'skills': ''
    }
    
    # Extract email
    email_match = re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', resume_text)
    if email_match:
        data['email'] = email_match.group()
    
    # Extract phone
    phone_match = re.search(r'\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}', resume_text)
    if phone_match:
        data['phone'] = phone_match.group()
    
    # Extract name (first line usually)
    lines = [line.strip() for line in resume_text.split('\n') if line.strip()]
    if lines:
        data['name'] = lines[0]
    
    return data


def init_gemini():
    """Initialize Gemini API"""
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key or api_key == 'your_api_key_here':
        raise ValueError("GEMINI_API_KEY not set in .env file")
    
    genai.configure(api_key=api_key)
    return genai.GenerativeModel('gemini-1.5-flash')


# Initialize on startup
print("\n" + "="*60)
print("Job Application Filler Backend")
print("="*60)

try:
    # Parse resume
    print("\nParsing resume...")
    resume_text = parse_resume_pdf(RESUME_PATH)
    resume_data = extract_structured_data(resume_text)
    print(f"✓ Resume parsed: {len(resume_text)} characters")
    print(f"  Name: {resume_data['name']}")
    print(f"  Email: {resume_data['email']}")
    print(f"  Phone: {resume_data['phone']}")
    
    # Load history
    load_history()
    
    # Initialize Gemini
    gemini_model = init_gemini()
    print("✓ Gemini API initialized")
    
    print("\n✓ Backend ready!")
    print("="*60 + "\n")
    
except Exception as e:
    print(f"\n✗ Initialization error: {e}\n")
    gemini_model = None


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'resume_loaded': bool(resume_data.get('full_text')),
        'history_count': len(qa_history)
    })


@app.route('/api/parse-resume', methods=['GET'])
def get_resume_data():
    """Return parsed resume data"""
    return jsonify({
        'name': resume_data.get('name', ''),
        'email': resume_data.get('email', ''),
        'phone': resume_data.get('phone', ''),
        'has_full_text': bool(resume_data.get('full_text'))
    })


@app.route('/api/closed-question', methods=['POST'])
def handle_closed_question():
    """
    Handle closed-ended question
    Check history, return answer if exists, otherwise return null
    """
    try:
        data = request.json
        question = data.get('question', '')
        answer = data.get('answer')  # Only provided when saving new answer
        
        normalized_q = normalize_question(question)
        
        # If answer provided, save it
        if answer is not None:
            qa_history[normalized_q] = {
                'question': question,
                'answer': answer
            }
            save_history()
            return jsonify({
                'status': 'saved',
                'question': question,
                'answer': answer
            })
        
        # Otherwise, check if we have this question
        if normalized_q in qa_history:
            stored = qa_history[normalized_q]
            return jsonify({
                'found': True,
                'question': stored['question'],
                'answer': stored['answer']
            })
        else:
            return jsonify({
                'found': False,
                'message': 'Question not in history - user should fill manually'
            })
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/open-question', methods=['POST'])
def handle_open_question():
    """
    Handle open-ended question
    Generate answer using Gemini based on resume and question
    """
    try:
        if not gemini_model:
            return jsonify({'error': 'Gemini not initialized'}), 500
        
        data = request.json
        question = data.get('question', '')
        company_context = data.get('company_context', '')  # Optional
        job_description = data.get('job_description', '')  # Optional
        
        # Build prompt
        prompt = f"""You are helping someone fill out a job application. Generate a professional, concise answer to the following question based on their resume.

Resume Summary:
{resume_data.get('full_text', '')[:2000]}  

Question: {question}

{f"Company Context: {company_context}" if company_context else ""}
{f"Job Description: {job_description}" if job_description else ""}

Instructions:
- Write in first person (I, my, etc.)
- Be professional and concise
- Base the answer on the resume content
- Keep it between 100-300 words
- Make it specific and tailored
- Do not make up information not in the resume

Answer:"""
        
        # Generate with Gemini
        response = gemini_model.generate_content(prompt)
        answer = response.text.strip()
        
        return jsonify({
            'question': question,
            'answer': answer,
            'draft': True  # Indicates this is an AI-generated draft
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/history', methods=['GET'])
def get_history():
    """Get all stored Q&A history"""
    history_list = [
        {
            'question': v['question'],
            'answer': v['answer']
        }
        for v in qa_history.values()
    ]
    return jsonify({
        'count': len(history_list),
        'history': history_list
    })


@app.route('/api/clear-history', methods=['POST'])
def clear_history():
    """Clear all Q&A history"""
    global qa_history
    qa_history = {}
    save_history()
    return jsonify({'status': 'cleared'})


if __name__ == '__main__':
    print("Starting Flask server on http://localhost:5000")
    print("Press Ctrl+C to stop\n")
    app.run(host='localhost', port=5000, debug=False)

