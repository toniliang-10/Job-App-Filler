# Job Application Filler

Smart Chrome extension that auto-fills job applications using your resume, answer history, and AI.

## 🎯 How It Works

### For Different Question Types:

1. **Resume Data** (name, email, phone)
   - ✅ Auto-filled immediately from your resume

2. **Closed-Ended** (yes/no, dropdowns, checkboxes)
   - 🔍 First time: You fill manually
   - 💾 Extension saves your answer
   - ✨ Next time: Auto-filled from history

3. **Open-Ended** ("Why do you want to work here?")
   - 🤖 AI generates draft answer using Gemini
   - 👀 You review and edit before submitting

## 🚀 Quick Setup

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Add Your API Key

Create `.env` file:
```
GEMINI_API_KEY=your_actual_key_here
```

Get key from: https://makersuite.google.com/app/apikey

### 3. Add Your Resume

Place your resume PDF in:
```
data/documents/RESUME TONI LIANG.pdf
```

### 4. Start Backend

```bash
python backend.py
```

Leave this running!

### 5. Load Chrome Extension

1. Open Chrome: `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `chrome-extension` folder

### 6. Test It!

1. Open `test-job-application.html` in Chrome
2. Click the extension icon
3. Click "Detect Fields"
4. Click "Auto-Fill Known Fields"
5. Watch the magic! ✨

## 📖 Usage Workflow

### First Application on a Site:

1. **Click "Detect Fields"**
   - Extension scans the page
   - Shows: X from resume, Y known, Z need input, W AI drafts

2. **Click "Auto-Fill Known Fields"**
   - Name, email, phone filled from resume
   - Any previously answered questions filled from history
   - AI drafts inserted for essay questions

3. **Fill Unknown Fields Manually**
   - Extension highlights questions it hasn't seen before
   - You answer them normally

4. **Click "Save My Answers"**
   - Extension saves your new answers
   - Next application will auto-fill these!

### Second Application (Same Questions):

1. **Click "Detect Fields"**
2. **Click "Auto-Fill Known Fields"**
3. **Done!** All fields filled automatically

## 🎓 Smart Features

### Resume Data Auto-Fill
- Name, email, phone extracted once
- Always auto-filled
- No manual work

### Answer History Learning
- Closed questions saved after first answer
- "Are you authorized to work in the US?" → Saved forever
- "Years of experience" → Saved and reused
- Builds over time automatically

### AI-Powered Drafts
- "Why this company?" → AI generates personalized answer
- "Describe a challenge" → AI pulls from your resume
- You always review and can edit
- Based on your actual experience

## 🔧 API Endpoints

The backend provides:

- `GET /api/parse-resume` - Returns your name, email, phone
- `POST /api/closed-question` - Check/save closed answers
- `POST /api/open-question` - Generate AI drafts with Gemini
- `GET /api/history` - View all saved answers
- `POST /api/clear-history` - Clear answer history

## 📁 Project Structure

```
Job-App-Filler/
├── backend.py              # Simple Flask server
├── requirements.txt        # Just 5 dependencies!
├── .env                    # Your Gemini API key
├── data/
│   ├── documents/          # Your resume (PDF)
│   └── qa_history.json     # Saved answers
├── chrome-extension/
│   ├── manifest.json
│   ├── content.js          # Field detection & filling
│   ├── background.js       # API communication
│   ├── popup.html/css/js   # Extension UI
│   └── icons/
└── test-job-application.html  # Test page

```

## 💡 Pro Tips

1. **Build History Gradually**
   - First few applications: more manual work
   - After 5-10 applications: mostly auto-filled
   - Common questions saved forever

2. **Review AI Drafts**
   - AI is good but not perfect
   - Always read generated answers
   - Edit to match your voice

3. **Keep Resume Updated**
   - Better resume = better AI answers
   - Update PDF, restart backend

4. **Clear History When Needed**
   - Changed your answer strategy?
   - Click "Clear History" in extension
   - Start fresh

## 🐛 Troubleshooting

**"Server Offline"**
→ Run `python backend.py` in terminal

**Wrong name/email**
→ Check resume PDF is correct
→ Restart backend

**AI answers are generic**
→ Make sure resume has detailed info
→ More detail = better answers

**Some fields not filling**
→ Some sites use complex forms
→ May need manual filling

## 🔒 Privacy & Security

- ✅ Resume stays local (only parsed once)
- ✅ History stored locally in JSON
- ✅ Only question + resume sent to Gemini API
- ✅ No cloud storage, no tracking
- ✅ You control everything

## 📊 What Gets Saved?

**Saved to History:**
- Closed-ended questions and your answers
- Example: "Work authorization" → "Yes"

**NOT Saved:**
- Open-ended answers (generated fresh each time)
- Resume data (parsed from PDF each time)
- Any personal identifying info

## ⚡ Performance

- **Resume parsing**: 1 second (on startup)
- **Field detection**: <1 second
- **History lookup**: Instant
- **AI generation**: 2-5 seconds per question
- **Full form**: Usually <30 seconds total

## 🎉 You're Ready!

1. `python backend.py` → Start server
2. Load extension → One time setup
3. Open job application → Any site
4. Click extension → Detect & fill
5. Submit application → Manual review & submit

**The more you use it, the smarter it gets!** 🚀

---

Built with: Flask, Google Gemini, Chrome Extensions, PyPDF2

