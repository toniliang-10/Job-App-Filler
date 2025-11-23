# Quick Start Guide

Get up and running in 5 minutes!

## 1. Install Python 3.9+

Check if you have Python:
```bash
python --version
```

If not installed, download from: https://www.python.org/downloads/

## 2. Get Gemini API Key

1. Go to: https://makersuite.google.com/app/apikey
2. Click "Create API Key"
3. Copy the key

## 3. Setup Project

```bash
# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (Mac/Linux)
# source venv/bin/activate

# Install packages
pip install -r requirements.txt

# Install browser
playwright install chromium
```

## 4. Configure API Key

Create a file named `.env` in the project root:

```
GEMINI_API_KEY=your_actual_api_key_here
```

See `ENV_SETUP.txt` for detailed instructions.

## 5. Add Your Documents

Put your resume, cover letter, etc. in:
```
data/documents/
```

Supported formats: PDF, DOCX, TXT

## 6. Ingest Documents

```bash
python main.py ingest
```

Wait for it to process (~1-2 minutes first time).

## 7. Fill Your First Application

```bash
python main.py fill --interactive
```

Then:
1. Browser opens
2. Navigate to job application
3. Press ENTER in terminal
4. Review each generated answer
5. Press 'F' to fill or 'E' to edit
6. Submit form manually

## That's It!

You're ready to use the Job Application Filler!

## Next Steps

- Read [USAGE_GUIDE.md](USAGE_GUIDE.md) for all commands
- See [EXAMPLES.md](EXAMPLES.md) for sample workflows
- Check [SETUP_GUIDE.md](SETUP_GUIDE.md) for troubleshooting

## Quick Command Reference

```bash
# Check status
python main.py status

# Test API
python main.py test-llm

# Search your documents
python main.py search "Python"

# View answer history
python main.py history --recent 10

# Fill application (interactive)
python main.py fill --interactive

# Fill application (auto)
python main.py fill --batch
```

## Getting Help

If something doesn't work:

1. Run: `python main.py status`
2. Check error messages
3. See [SETUP_GUIDE.md](SETUP_GUIDE.md) troubleshooting section
4. Verify `.env` file has correct API key

## Free Tier Limits

Gemini Free Tier:
- 15 requests/minute
- 1,500 requests/day
- More than enough for job applications!

Interactive mode naturally stays within limits.

## Tips

1. **Use Interactive Mode First**: Review answers before filling
2. **Start with Resume**: Make sure your resume is complete
3. **Test Search**: Verify documents ingested correctly
4. **Edit When Needed**: Don't hesitate to modify answers
5. **Build History**: The more you use it, the better it gets

Happy job hunting! 🎉

