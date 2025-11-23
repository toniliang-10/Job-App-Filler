# Chrome Extension Installation Guide

This guide walks you through converting the Job Application Filler into a Chrome extension.

## 🎯 Architecture Overview

The extension uses a **hybrid architecture**:
- **Python Backend** (Flask API): Handles RAG, Gemini AI, and document processing
- **Chrome Extension** (JavaScript): Detects forms and fills fields in the browser

Communication flow:
```
Web Page → Content Script → Background Script → Flask API → Gemini AI
                ↓                                     ↓
            Fill Form ← ← ← ← ← ← ← ← ← ← ← Generated Answer
```

## 📋 Prerequisites

1. **Python Backend Setup** (Already Done! ✓)
   - Virtual environment created
   - Dependencies installed
   - Gemini API key configured
   - Documents ingested

2. **Flask Installed**
   ```bash
   pip install flask flask-cors
   ```

## 🚀 Step-by-Step Setup

### Step 1: Start the Python API Server

Open a terminal and run:

```bash
# Activate virtual environment
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Mac/Linux

# Start the API server
python api_server.py
```

You should see:
```
✓ Server initialized successfully!
============================================================
Job Application Filler API Server
============================================================

Server running on: http://localhost:5000
...
```

**Leave this terminal running!** The extension needs the server to generate answers.

### Step 2: Create Extension Icons (Optional but Recommended)

The extension needs PNG icons. Quick method:

**Option A: Use an online converter**
1. Go to: https://cloudconvert.com/svg-to-png
2. Upload `chrome-extension/icons/icon.svg`
3. Convert to PNG at these sizes:
   - 16x16 → save as `icon16.png`
   - 48x48 → save as `icon48.png`
   - 128x128 → save as `icon128.png`
4. Save all three in `chrome-extension/icons/` folder

**Option B: Create simple placeholders**
1. Open any image editor (Paint, Photoshop, etc.)
2. Create 3 purple squares:
   - 16x16 pixels → save as `icon16.png`
   - 48x48 pixels → save as `icon48.png`
   - 128x128 pixels → save as `icon128.png`
3. Save in `chrome-extension/icons/` folder

**Option C: Skip for now**
The extension will work without icons (Chrome will show a default puzzle piece).

### Step 3: Load Extension in Chrome

1. **Open Chrome Extensions Page**
   - Go to: `chrome://extensions`
   - Or: Menu → More Tools → Extensions

2. **Enable Developer Mode**
   - Toggle "Developer mode" in the top right corner
   - ![Developer Mode](https://developer.chrome.com/static/docs/extensions/mv3/getstarted/development-basics/image/extensions-page-e0d64d89a6acf_1920.png)

3. **Load Unpacked Extension**
   - Click "Load unpacked" button
   - Navigate to your project folder
   - Select the `chrome-extension` folder
   - Click "Select Folder"

4. **Verify Installation**
   - You should see "Job Application Filler" in your extensions list
   - Pin it to your toolbar for easy access (pin icon)

### Step 4: Test the Extension

1. **Check Server Connection**
   - Click the extension icon in Chrome toolbar
   - You should see "Server Connected" with a green dot
   - Stats should show your document count

2. **Test on a Sample Form**
   - Go to any job application page (LinkedIn, Indeed, company career pages)
   - Click the extension icon
   - Click "🔍 Detect Form Fields"
   - You should see a list of detected fields

3. **Fill Fields**
   - Click "✍️ Fill (Interactive)" for step-by-step filling
   - Or click "⚡ Fill (Auto)" for automatic filling
   - Review the results!

## 🎮 How to Use

### Basic Workflow

1. **Start Backend Server**
   ```bash
   python api_server.py
   ```

2. **Navigate to Job Application**
   - Open any job application form in Chrome

3. **Open Extension**
   - Click the extension icon in your toolbar

4. **Detect Fields**
   - Click "🔍 Detect Form Fields"
   - Extension scans the page and lists all form fields

5. **Choose Fill Mode**
   - **Interactive**: Review each answer before filling
   - **Auto**: Fills all fields automatically
   - **Suggest Only**: Shows answers without filling

6. **Review and Submit**
   - Check all filled fields
   - Make manual edits if needed
   - Submit the form manually

### Fill Modes Explained

**Interactive Mode** (Recommended)
- Shows each field one by one
- Displays suggested answer and confidence score
- Asks for confirmation before filling
- Best for important applications

**Auto Mode** (Fast but careful!)
- Fills all fields automatically
- No confirmation prompts
- Review carefully before submitting!
- Best for similar applications you've done before

**Suggest Only Mode** (Safe)
- Generates answers but doesn't fill anything
- Just shows suggestions
- You copy/paste manually
- Best for testing or paranoid mode 😄

## 📁 Project Structure

```
Job-App-Filler/
├── chrome-extension/          # Extension files
│   ├── manifest.json          # Extension configuration
│   ├── popup.html             # Extension popup UI
│   ├── popup.css              # Popup styling
│   ├── popup.js               # Popup logic
│   ├── content.js             # Form detection & filling
│   ├── background.js          # API communication
│   └── icons/                 # Extension icons
├── api_server.py              # Flask API server
├── src/                       # Python backend (existing)
└── ... (rest of your project)
```

## 🔧 Configuration

### Change API Server Port

If port 5000 is in use, edit these files:

1. `api_server.py` (line ~200):
   ```python
   app.run(host='localhost', port=5001, debug=False)  # Change 5000 to 5001
   ```

2. `chrome-extension/popup.js` (line 2):
   ```javascript
   const API_URL = 'http://localhost:5001';  // Change port
   ```

3. `chrome-extension/background.js` (line 3):
   ```javascript
   const API_URL = 'http://localhost:5001';  // Change port
   ```

4. `chrome-extension/manifest.json` (in host_permissions):
   ```json
   "host_permissions": [
     "http://localhost:5001/*"
   ]
   ```

### Adjust Settings

Edit `config/settings.yaml` to change:
- Gemini model (flash vs pro)
- Temperature (creativity level)
- RAG parameters (context retrieval)
- etc.

Restart API server after changes.

## 🐛 Troubleshooting

### "Server Offline" in Extension

**Problem**: Extension shows "Server Offline - Start API server"

**Solution**:
1. Make sure API server is running: `python api_server.py`
2. Check terminal for errors
3. Verify server is on `http://localhost:5000`
4. Try accessing http://localhost:5000/api/health in browser

### "Could not connect to page"

**Problem**: "Could not connect to page. Try refreshing the page."

**Solution**:
1. Refresh the web page
2. Make sure content script is loaded (check console for "Job Application Filler: Content script loaded")
3. Try reloading the extension (chrome://extensions → click reload)

### No Fields Detected

**Problem**: Extension says "No form fields detected"

**Solution**:
1. Make sure you're on a page with a form
2. Some forms load dynamically - wait a few seconds and try again
3. Try scrolling through the page to trigger lazy-loaded fields
4. Some sites use shadow DOM - may not be detectable

### API Errors

**Problem**: "Error generating answers"

**Solution**:
1. Check API server terminal for error messages
2. Verify Gemini API key is valid: `python main.py test-llm`
3. Check if you hit rate limits (wait a minute)
4. Make sure documents are ingested: `python main.py status`

### Extension Not Loading

**Problem**: Extension doesn't appear in Chrome

**Solution**:
1. Go to `chrome://extensions`
2. Check for error messages under the extension
3. Click "Errors" button if present
4. Make sure all required files exist in `chrome-extension/` folder
5. Try clicking "Reload" button under the extension

### CORS Errors

**Problem**: Console shows CORS errors

**Solution**:
1. Make sure Flask-CORS is installed: `pip install flask-cors`
2. Check that `api_server.py` has `CORS(app)` line
3. Restart API server

## 🎓 Advanced Usage

### Update Documents

1. Add new documents to `data/documents/`
2. With API server running, click extension icon
3. The server automatically includes new documents
4. Or manually re-ingest:
   ```bash
   python main.py ingest --rebuild
   ```

### View Answer History

While API server is running:
```bash
# In another terminal
python main.py history --recent 20
```

Or access the API directly:
```bash
curl http://localhost:5000/api/history?recent=10
```

### Batch Generate Answers

The extension can generate answers for all fields at once:
- It does this automatically when you click any fill button
- Processes all fields in parallel for speed
- Results are cached during the session

### Modify Extension Behavior

Edit `chrome-extension/content.js` to:
- Change field detection logic
- Adjust filling behavior
- Customize highlighting styles
- Add delays between fills

Changes require clicking "Reload" in `chrome://extensions`.

## 📊 Comparison: Extension vs CLI

| Feature | Chrome Extension | CLI (main.py) |
|---------|-----------------|---------------|
| **Setup** | Load extension | Run Python script |
| **Browser** | Works in current tab | Opens new browser |
| **Speed** | Instant access | Takes ~2-3 seconds |
| **Control** | Visual, in-page | Terminal-based |
| **Updates** | Page stays open | New browser window |
| **Best For** | Daily use | First-time setup |

## 🔒 Security & Privacy

- **Local Backend**: All processing happens on your computer
- **No Cloud Storage**: Documents stay on your machine
- **API Calls**: Only prompts sent to Gemini (not your documents)
- **No Tracking**: Extension doesn't collect any data
- **Open Source**: You can review all code

## 🚀 Exporting for Distribution (Advanced)

To share with others or publish:

### Create ZIP Package

1. Make sure icons are included
2. Create a ZIP of the `chrome-extension` folder:
   ```bash
   # Windows
   Compress-Archive -Path chrome-extension\* -DestinationPath JobAppFiller.zip
   
   # Mac/Linux
   cd chrome-extension
   zip -r ../JobAppFiller.zip *
   ```

3. Share `JobAppFiller.zip` + setup instructions

### Chrome Web Store (Optional)

To publish on Chrome Web Store:

1. **Create Icons** (required):
   - Must have 128x128 icon
   - Promotional images needed

2. **Create Developer Account**:
   - Go to: https://chrome.google.com/webstore/devconsole
   - Pay $5 one-time fee

3. **Upload Extension**:
   - Package as ZIP
   - Fill out store listing
   - Submit for review

4. **Important Notes**:
   - Users will still need to run Python backend
   - Consider including Windows/Mac executables
   - Provide clear setup instructions

## 🎉 Next Steps

Now that your extension is working:

1. **Customize Icons**: Create professional-looking icons
2. **Test Thoroughly**: Try on different job sites
3. **Add Documents**: Keep your resume updated
4. **Build History**: The more you use it, the better it gets
5. **Share**: Help others by sharing your setup

## 💡 Tips & Tricks

1. **Keep Server Running**: Start it once, use all day
2. **Pin Extension**: Keep it visible in toolbar
3. **Interactive First**: Always use interactive mode for important applications
4. **Review Before Submit**: Extension fills, you submit manually
5. **Update Regularly**: Add new experiences to your documents
6. **Check Confidence**: Low confidence (<70%) may need manual editing
7. **Test on Sample Sites**: Practice on less important applications first

## 📚 Additional Resources

- **Extension Documentation**: https://developer.chrome.com/docs/extensions/
- **Manifest V3**: https://developer.chrome.com/docs/extensions/mv3/intro/
- **Content Scripts**: https://developer.chrome.com/docs/extensions/mv3/content_scripts/
- **Flask Documentation**: https://flask.palletsprojects.com/

---

**You're all set!** 🎊

Your Job Application Filler is now a Chrome extension. Click the icon, fill forms, and land that dream job! 🚀

