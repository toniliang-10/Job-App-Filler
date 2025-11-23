# Usage Guide

## Quick Start

```bash
# 1. Activate virtual environment
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Mac/Linux

# 2. Ingest your documents
python main.py ingest

# 3. Start filling applications
python main.py fill --interactive
```

## Available Commands

### Check System Status

```bash
python main.py status
```

Shows:
- Configuration status
- API key status
- Number of documents
- Vector database stats
- Answer history stats

### Ingest Documents

```bash
# First time ingestion
python main.py ingest

# Add new documents (keeps existing)
python main.py ingest --update

# Rebuild from scratch (clears database)
python main.py ingest --rebuild
```

### Search Knowledge Base

```bash
# Search for information
python main.py search "Python experience"

# Get more results
python main.py search "education" --top-k 10
```

This helps verify your documents were ingested correctly.

### Fill Job Application

#### Interactive Mode (Recommended)

```bash
python main.py fill --interactive
```

Process:
1. Browser opens
2. Navigate to job application manually
3. Press ENTER in terminal
4. Tool detects all form fields
5. For each field:
   - Shows question
   - Generates answer
   - Shows confidence score
   - You choose: [F]ill, [E]dit, [S]kip, [Q]uit

Benefits:
- Full control
- Can edit answers
- Review before filling
- Safe and reliable

#### Batch Mode (Auto-fill)

```bash
python main.py fill --batch
```

Automatically fills all fields without prompting. Use with caution!

#### Suggest-Only Mode

```bash
python main.py fill --suggest-only
```

Shows answers but doesn't fill anything. Good for:
- Testing
- Getting ideas
- Manual copy-paste

### View Answer History

```bash
# View recent answers
python main.py history --recent 20

# View statistics
python main.py history --stats
```

Statistics show:
- Total questions answered
- Number of edited answers
- Average confidence scores
- Breakdown by field type

### List Documents

```bash
python main.py list-documents
```

Shows all documents in your knowledge base.

### Test LLM Connection

```bash
python main.py test-llm
```

Verifies Gemini API is working.

## Configuration

Edit `config/settings.yaml` to customize:

### Gemini Settings

```yaml
gemini:
  model: "gemini-1.5-flash"  # or "gemini-1.5-pro"
  temperature: 0.7           # 0.0-1.0 (lower = more focused)
  max_tokens: 1024           # Maximum response length
```

Models:
- `gemini-1.5-flash`: Faster, cheaper, good quality
- `gemini-1.5-pro`: Slower, better quality, costs more

Temperature:
- `0.3-0.5`: Conservative, factual
- `0.7`: Balanced (recommended)
- `0.9-1.0`: Creative, varied

### RAG Settings

```yaml
rag:
  top_k: 5                    # Number of context chunks to retrieve
  similarity_threshold: 0.3   # Minimum similarity (0.0-1.0)
  embedding_model: "all-MiniLM-L6-v2"
```

### Browser Settings

```yaml
browser:
  headless: false    # Set true to hide browser
  slow_mo: 500       # Delay in ms (human-like)
  timeout: 30000     # Timeout in ms
```

### Auto-fill Settings

```yaml
auto_fill:
  mode: "interactive"         # Default mode
  review_before_fill: true    # Show preview
```

## Tips & Best Practices

### For Best Results

1. **Use detailed documents**
   - Include specific achievements
   - Add measurable results
   - Use keywords from job descriptions

2. **Start with interactive mode**
   - Review generated answers
   - Edit if needed
   - Build confidence

3. **Check answer history**
   - See what worked well
   - Identify patterns
   - Refine your documents

### Field Types

The tool handles:

- **Text fields**: Full sentences/paragraphs
- **Text areas**: Longer responses
- **Dropdowns**: Selects best option
- **Radio buttons**: Chooses one option
- **Checkboxes**: Yes/No decisions
- **Date fields**: Extracts dates from resume
- **Number fields**: Extracts numbers

### Handling Difficult Fields

If a field isn't filled well:

1. **Skip it**: Press [S] in interactive mode
2. **Edit it**: Press [E] and type your answer
3. **Add more context**: Update your documents with relevant info
4. **Adjust settings**: Lower temperature for more focused answers

### Security & Privacy

- All processing is local (except Gemini API calls)
- Documents stay on your computer
- Vector database is local
- No data shared except with Gemini for generation
- Review all answers before submitting

### Rate Limits

Free tier limits:
- 15 requests/minute
- 1,500 requests/day

If you hit limits:
- Use interactive mode (slower)
- Add delays in config
- Upgrade to paid tier

## Common Workflows

### First Time User

```bash
# 1. Setup
python main.py status
python main.py test-llm

# 2. Ingest
python main.py ingest

# 3. Test search
python main.py search "skills"

# 4. Fill application
python main.py fill --interactive
```

### Regular Use

```bash
# Activate environment
venv\Scripts\activate

# Fill application
python main.py fill --interactive
```

### Adding New Documents

```bash
# Add file to data/documents/

# Update database
python main.py ingest --update

# Verify
python main.py list-documents
```

### Reviewing Performance

```bash
# Check history
python main.py history --stats

# Review recent answers
python main.py history --recent 20
```

## Troubleshooting

### Low Confidence Scores

- Add more relevant documents
- Make documents more detailed
- Check if documents were ingested: `python main.py list-documents`

### Wrong Answers

- Use interactive mode and edit
- Add more specific information to documents
- Lower temperature in config

### Fields Not Detected

- Some sites use complex forms
- Try disabling headless mode to see issues
- Some fields may need manual filling

### Can't Find Information

- Search your knowledge base: `python main.py search "query"`
- Add missing information to documents
- Re-ingest: `python main.py ingest --rebuild`

## Advanced Usage

### Custom Workflows

You can import the modules and create custom scripts:

```python
from src.rag_system.vector_store import VectorStore
from src.llm_integration.gemini_client import GeminiClient

# Your custom code here
```

### Exporting Data

Answer history is stored in: `data/answer_history.json`

You can:
- Back it up
- Share with other instances
- Analyze for patterns

### Multiple Profiles

Create separate configs for different job types:
- `config/settings_software.yaml`
- `config/settings_research.yaml`

Use with: `--config` flag (requires modification)

## Getting Help

If you encounter issues:

1. Check `python main.py status`
2. Review error messages
3. Check logs
4. Verify API key
5. Ensure documents are in correct format

