# Quick Start Guide - Job Application Filler

## 🚀 Simple 3-Step Setup

### Step 1: Start Backend
```bash
python backend.py
```

You should see:
```
✓ Resume parsed: 5234 characters
  Name: Toni Liang
  Email: your@email.com
✓ Loaded 0 historical answers
✓ Gemini API initialized
✓ Backend ready!
```

### Step 2: Load Extension
1. Go to `chrome://extensions`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the `chrome-extension` folder
5. Click the extension icon (should show "Server Connected" 🟢)

### Step 3: Fill Application
1. Open any job application page (or `test-job-application.html`)
2. Click extension icon
3. Click **"✨ Fill Application"** button
4. Watch it auto-fill!

---

## 💡 How It Works

### First Time Using:
```
Click "Fill Application"
    ↓
Extension detects all fields
    ↓
Auto-fills:
  ✅ Name, email, phone (from resume)
  ✅ Essay questions (AI-generated drafts)
    ↓
Shows you which fields need manual input:
  ❓ "Are you authorized to work in the US?"
  ❓ "Years of experience?"
    ↓
You fill those fields on the webpage
    ↓
Click "💾 Save My Answers for Next Time"
    ↓
Done! Extension remembers these answers forever.
```

### Second Application (And All Future Ones):
```
Click "Fill Application"
    ↓
Auto-fills EVERYTHING:
  ✅ Name, email, phone
  ✅ All previously answered questions
  ✅ AI-generated essays
    ↓
Just review and submit!
```

---

## 🎯 Important: How the Popup Works

**The extension popup closes when you click on the page - this is normal Chrome behavior!**

### Don't Worry - Your Progress is Saved!

1. Click "Fill Application" → Fields fill automatically
2. Popup shows "5 Need Input" with list of unknown fields
3. **Click on the page** → Popup closes (this is expected!)
4. Fill the 5 fields manually on the page
5. **Click extension icon again** → Popup reopens
6. **Your progress is restored!** Still shows "5 Need Input"
7. Click "💾 Save My Answers for Next Time"
8. Done! Next time these will auto-fill ✅

### Key Points:
- ✅ **Popup remembers your progress** for 10 minutes
- ✅ **State persists per tab** - Each tab tracks independently
- ✅ **Auto-cleanup** - State clears after you save or after 10 minutes
- ✅ **No need to keep popup open** - Just reopen when ready to save

---

## 🎯 The New Workflow (What Changed)

### Before (Old System):
1. Click "Detect Fields" ← Extra step
2. Click "Start Filling"
3. Review each field one-by-one
4. Manual answers weren't saving properly ❌

### After (New System):
1. Click "Fill Application" ← ONE button
2. Everything fills instantly
3. Manual answers properly saved ✅
4. Clear visual feedback

---

## 📊 What Gets Filled Automatically

### Resume Fields (Instant):
- ✅ Full Name
- ✅ Email Address  
- ✅ Phone Number
- ✅ Location/Address

### Closed-Ended Questions (After First Time):
- ✅ "Are you authorized to work in the US?"
- ✅ "Years of experience"
- ✅ "Desired salary"
- ✅ Dropdown selections (employment type, location preference, etc.)

### Open-Ended Questions (AI-Generated):
- ✅ "Why do you want to work here?"
- ✅ "Tell us about yourself"
- ✅ "Describe a challenging project"
- ⚠️ **Always review AI answers before submitting!**

---

## 🔧 Troubleshooting

### "Server Offline" ❌
**Fix:** Run `python backend.py` in a terminal

### "No fields detected"
**Fix:** 
1. Refresh the job application page
2. Make sure there are actual form fields (not just links)

### "Save My Answers" doesn't work
**Fix:** 
1. Fill the fields **on the webpage** first
2. Then click "Save My Answers" in the extension

### AI answers are weird
**Fix:**
1. Update your resume in `data/documents/`
2. Restart backend: `python backend.py`

---

## 💾 Your Data

### Where It's Stored:
```
data/
├── documents/
│   └── RESUME TONI LIANG.pdf    ← Your resume (parsed on startup)
└── qa_history.json               ← Your saved answers (persistent)
```

### To Clear History:
Click "🗑️ Clear History" in extension footer

---

## ✨ Pro Tips

1. **First 5-10 applications take longer** - You're building your answer database
2. **After that, most fields auto-fill** - Just review and submit!
3. **Always review AI-generated essays** - They're drafts, not final answers
4. **Update resume → Restart backend** - To use new resume data
5. **Consistent answers build faster** - Try to answer similarly across applications

---

## 🎉 You're Ready!

The extension learns from every application you fill. The more you use it, the smarter it gets!

**Next Application:** Should take < 1 minute to fill 🚀
