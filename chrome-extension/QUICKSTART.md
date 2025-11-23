# Chrome Extension Quick Start

## 🚀 3-Minute Setup

### 1. Install Flask (if not already done)
```bash
pip install flask flask-cors
```

### 2. Start API Server
```bash
# Activate your virtual environment
venv\Scripts\activate

# Start server
python api_server.py
```

**Keep this terminal running!**

### 3. Load Extension in Chrome

1. Open Chrome and go to: `chrome://extensions`
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked"
4. Select the `chrome-extension` folder
5. Pin the extension to your toolbar

### 4. Use It!

1. Go to any job application page
2. Click the extension icon
3. Click "🔍 Detect Form Fields"
4. Click "✍️ Fill (Interactive)"
5. Review and approve each answer
6. Submit manually

## 📝 Quick Commands

```bash
# Start extension backend
python api_server.py

# Check status
python main.py status

# Update documents
python main.py ingest --rebuild
```

## ❓ Troubleshooting

**Extension shows "Server Offline"?**
→ Make sure `python api_server.py` is running

**No fields detected?**
→ Refresh the page and try again

**Extension won't load?**
→ Check `chrome://extensions` for errors

## 🎯 That's It!

Full guide: See [CHROME_EXTENSION_GUIDE.md](../CHROME_EXTENSION_GUIDE.md)

