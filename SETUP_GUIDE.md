# Setup Guide

## Prerequisites

1. **Python 3.9 or higher**
   ```bash
   python --version
   ```

2. **Google Gemini API Key**
   - Visit: https://makersuite.google.com/app/apikey
   - Click "Create API Key"
   - Copy your key

## Installation Steps

### Step 1: Create Virtual Environment

**Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

**Mac/Linux:**
```bash
python -m venv venv
source venv/bin/activate
```

### Step 2: Install Dependencies

```bash
pip install -r requirements.txt
```

This will install:
- playwright (browser automation)
- chromadb (vector database)
- sentence-transformers (embeddings)
- google-generativeai (Gemini API)
- pypdf2, python-docx, pdfplumber (document parsing)
- pyyaml, python-dotenv (configuration)
- beautifulsoup4 (HTML parsing)

### Step 3: Install Playwright Browsers

```bash
playwright install chromium
```

This downloads the Chromium browser for automation.

### Step 4: Configure API Key

Create a `.env` file in the project root:

```bash
# Windows
echo GEMINI_API_KEY=your_actual_api_key_here > .env

# Mac/Linux
echo "GEMINI_API_KEY=your_actual_api_key_here" > .env
```

Or manually create `.env` file with:
```
GEMINI_API_KEY=your_actual_api_key_here
```

Replace `your_actual_api_key_here` with your actual Gemini API key.

### Step 5: Add Your Documents

1. Create the documents directory if it doesn't exist:
   ```bash
   mkdir data\documents  # Windows
   # mkdir -p data/documents  # Mac/Linux
   ```

2. Add your documents:
   - Resume (PDF, DOCX, or TXT)
   - Cover letters
   - Portfolio documents
   - Any other relevant documents

### Step 6: Ingest Documents

```bash
python main.py ingest
```

This will:
- Parse all documents in `data/documents/`
- Create text chunks
- Generate embeddings
- Store in vector database

### Step 7: Verify Setup

```bash
python main.py status
```

This checks:
- Configuration loaded ✓
- API key configured ✓
- Documents found ✓
- Vector store initialized ✓

### Step 8: Test LLM Connection

```bash
python main.py test-llm
```

Should output: "✓ Connection successful!"

## You're Ready!

Now you can start filling job applications:

```bash
python main.py fill --interactive
```

## Troubleshooting

### "GEMINI_API_KEY not found"

Make sure your `.env` file:
1. Is in the project root directory
2. Contains: `GEMINI_API_KEY=your_actual_key`
3. Has no spaces around the `=`
4. The key is not wrapped in quotes

### "No documents found"

Make sure you:
1. Created the `data/documents/` directory
2. Added PDF, DOCX, or TXT files
3. Files are not corrupted

### "playwright not found"

Run:
```bash
pip install playwright
playwright install chromium
```

### Rate Limit Errors

Gemini Free Tier limits:
- 15 requests/minute
- 1,500 requests/day

If you hit limits:
1. Wait a minute
2. Use `--interactive` mode to slow down
3. Consider upgrading to paid tier

### Browser doesn't open

Try:
```bash
playwright install chromium --force
```

### Sentences-transformers download slow

First run downloads the embedding model (~80MB).
Be patient, it only happens once.

## Next Steps

See [README.md](README.md) for usage instructions and commands.

