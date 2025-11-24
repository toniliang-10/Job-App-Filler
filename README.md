# Job Application Auto-Filler

Chrome extension + FastAPI backend that reuses resume data and past answers to autofill job applications, while drafting open-ended responses with Gemini.

## Backend (FastAPI)

Requirements: Python 3.10+  
Setup:

```bash
cd backend
python -m venv .venv
. .venv/Scripts/activate   # Windows PowerShell
pip install -r requirements.txt
```

Populate `.env` (already provided) with `GEMINI_API_KEY`. Start the server:

```bash
uvicorn backend.main:app --reload
```

Resume input options:
- Upload ad hoc (preferred): `curl -F "file=@C:\path\to\resume.pdf" http://127.0.0.1:8000/parse-resume`
- Repo copy (your request): drop a PDF or text file at `backend/data/resume.pdf` (or set `LOCAL_RESUME_PATH` to another path) and run: `curl -X POST http://127.0.0.1:8000/parse-resume-local`
- Verify cache: `curl http://127.0.0.1:8000/resume`

Endpoints:
- `GET /health` – service check.
- `POST /parse-resume` – `multipart/form-data` with `file` (PDF or text). Caches parsed resume to `backend/data/resume_cache.json`.
- `POST /parse-resume-local` – reads local file from `LOCAL_RESUME_PATH` (default `backend/data/resume.pdf`) and caches it.
- `GET /resume` – returns cached resume data.
- `POST /closed-question` – body `{ question, answer?, choices? }`. If `answer` omitted, returns cached answer; if present, stores it.
- `POST /open-question` – body `{ question, job_context?, resume_summary? }`, returns Gemini draft (fallback if Gemini unavailable).
- `GET /qa-history` – returns stored closed-question answers.
- Config: set `GEMINI_MODEL` to control the model (default `gemini-1.5-flash`). If a model fails, the server falls back to the default. Use supported names such as `gemini-1.5-flash` or `gemini-1.5-pro`.

Data is stored locally under `backend/data/`.

## Chrome Extension

1. Build/ensure backend is running (default `http://localhost:8000`).
2. In Chrome, open `chrome://extensions`, enable Developer Mode, and **Load unpacked** pointing to the `extension` folder.
3. Open the options page to set your backend URL and toggle AI drafting.
4. Visit a job application form (try `test-job-application.html`), click the floating **Auto-Fill** button. Closed questions are reused; new selections are remembered after you choose them. Open-ended fields get a Gemini draft when enabled.

## Test page

Open `test-job-application.html` in the browser to sanity-check autofill behavior.
