# Job Application Filler with RAG & Gemini

An intelligent Python application that uses browser automation, RAG (Retrieval-Augmented Generation), and Google Gemini AI to automatically fill job application forms.

## Features

- **Smart Context Retrieval**: Finds relevant information from your resume, cover letters, and documents
- **Field Type Awareness**: Different strategies for text inputs, dropdowns, checkboxes, etc.
- **Answer History Learning**: Improves over time by learning from previous answers
- **Manual Override**: Interactive mode to review and edit answers before filling
- **Confidence Scoring**: Flags uncertain answers for review
- **Multi-browser Support**: Works with Chrome, Firefox, and Edge via Playwright

## Quick Start

### Prerequisites

1. Python 3.9+
2. Google Gemini API Key (get from https://makersuite.google.com/app/apikey)

### Installation

```bash
# 1. Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Mac/Linux

# 2. Install dependencies
pip install -r requirements.txt

# 3. Install Playwright browsers
playwright install chromium

# 4. Configure API key
copy .env.example .env  # Windows
# cp .env.example .env  # Mac/Linux
# Edit .env and add your Gemini API key

# 5. Add your documents
# Place resume, cover letters in data/documents/
```

### Usage

```bash
# 1. Ingest your documents
python main.py ingest

# 2. Start filling applications
python main.py fill --interactive

# 3. Navigate to job application in opened browser
# 4. Press ENTER in terminal when ready
# 5. Review and approve each answer
```

## Commands

- `python main.py ingest` - Process and index your documents
- `python main.py fill --interactive` - Fill application with review
- `python main.py fill --batch` - Auto-fill without review
- `python main.py status` - Check system status
- `python main.py search "query"` - Search your knowledge base
- `python main.py history --recent 10` - View answer history
- `python main.py test-llm` - Test Gemini connection

## Project Structure

```
job-app-filler/
├── src/
│   ├── document_processor/    # Parse resumes, PDFs, DOCX
│   ├── rag_system/             # ChromaDB, embeddings, retrieval
│   ├── browser_automation/     # Playwright form detection
│   ├── llm_integration/        # Gemini API wrapper
│   ├── answer_generator/       # Combine RAG + LLM
│   └── history_tracker/        # Store answered questions
├── data/
│   ├── documents/              # Your resume, cover letters
│   ├── chroma_db/              # Vector database storage
│   └── answer_history.json     # Previous answers
├── config/
│   └── settings.yaml           # Configuration
└── main.py                     # Entry point
```

## License

MIT License - See LICENSE file for details

