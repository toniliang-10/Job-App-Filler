import json
import os
import re
from io import BytesIO
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PyPDF2 import PdfReader
from dotenv import load_dotenv

try:
    import google.generativeai as genai  # type: ignore
except ImportError:  # The package is optional until installed by the user.
    genai = None


BASE_DIR = Path(__file__).resolve().parent
ROOT_DIR = BASE_DIR.parent
load_dotenv(ROOT_DIR / ".env")
load_dotenv(BASE_DIR / ".env")

app = FastAPI(title="Job Application Autofill Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

RESUME_CACHE_PATH = DATA_DIR / "resume_cache.json"
QA_HISTORY_PATH = DATA_DIR / "qa_history.json"
KEYWORD_ANSWERS_PATH = DATA_DIR / "keyword_answers.json"

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
DEFAULT_GEMINI_MODEL = "gemini-1.5-flash"
GEMINI_MODEL = os.getenv("GEMINI_MODEL", DEFAULT_GEMINI_MODEL)
LOCAL_RESUME_PATH = Path(os.getenv("LOCAL_RESUME_PATH", DATA_DIR / "resume.pdf"))


def load_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return default


def save_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def normalize_question(text: str) -> str:
    cleaned = re.sub(r"[^a-z0-9 ]", " ", text.lower())
    return " ".join(cleaned.split())


def extract_text_from_pdf(file_bytes: bytes) -> str:
    pdf = PdfReader(BytesIO(file_bytes))
    pages = []
    for page in pdf.pages:
        try:
            pages.append(page.extract_text() or "")
        except Exception:
            continue
    return "\n".join(pages)


def extract_structured_resume(raw_text: str) -> Dict[str, Any]:
    lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
    email_match = re.search(r"[\w\.\+-]+@[\w\.-]+", raw_text)
    phone_match = re.search(r"(\+?\d[\d\s\-\(\)]{7,}\d)", raw_text)

    def slice_section(keyword: str, span: int = 6) -> List[str]:
        for idx, line in enumerate(lines):
            if keyword in line.lower():
                return lines[idx + 1 : idx + 1 + span]
        return []

    skills_raw = slice_section("skill")
    education_raw = slice_section("education")
    experience_raw = slice_section("experience")

    summary = " ".join(raw_text.split())[:1200]
    full_name = lines[0] if lines else ""

    return {
        "full_name": full_name,
        "email": email_match.group(0) if email_match else "",
        "phone": phone_match.group(0) if phone_match else "",
        "skills": skills_raw,
        "education": education_raw,
        "experience": experience_raw,
        "summary": summary,
        "raw_text": raw_text,
    }


def build_resume_summary(resume: Dict[str, Any]) -> str:
    parts = []
    if resume.get("full_name"):
        parts.append(resume["full_name"])
    contact_bits = [resume.get("email", ""), resume.get("phone", "")]
    contact = ", ".join(bit for bit in contact_bits if bit)
    if contact:
        parts.append(contact)
    if resume.get("skills"):
        parts.append("Skills: " + "; ".join(resume["skills"]))
    if resume.get("education"):
        parts.append("Education: " + "; ".join(resume["education"]))
    if resume.get("experience"):
        parts.append("Experience highlights: " + "; ".join(resume["experience"]))
    if not parts and resume.get("summary"):
        return resume["summary"]
    return " | ".join(parts)


def load_local_resume_bytes() -> bytes:
    if not LOCAL_RESUME_PATH.exists():
        raise FileNotFoundError(
            f"Local resume not found at {LOCAL_RESUME_PATH}. "
            "Place a PDF or text resume there or set LOCAL_RESUME_PATH."
        )
    if LOCAL_RESUME_PATH.suffix.lower() == ".pdf":
        return LOCAL_RESUME_PATH.read_bytes()
    return LOCAL_RESUME_PATH.read_text(encoding="utf-8", errors="ignore").encode("utf-8")


def ensure_gemini_configured() -> bool:
    if not genai or not GEMINI_API_KEY:
        return False
    genai.configure(api_key=GEMINI_API_KEY)
    return True


def generate_with_gemini(prompt: str) -> Dict[str, str]:
    if not ensure_gemini_configured():
        return {
            "draft": "[Fallback] Configure GEMINI_API_KEY on the backend to enable AI drafting.",
            "source": "fallback",
        }
    errors = []
    for model_name in [GEMINI_MODEL, DEFAULT_GEMINI_MODEL]:
        try:
            model = genai.GenerativeModel(model_name)
            result = model.generate_content(prompt)
            text = result.text if hasattr(result, "text") else str(result)
            return {"draft": text, "source": f"gemini:{model_name}"}
        except Exception as exc:  # pragma: no cover - defensive
            errors.append(f"{model_name}: {exc}")
            continue
    return {
        "draft": f"[Fallback] Gemini call failed ({'; '.join(errors)}). "
        "Set GEMINI_MODEL to a supported model (e.g., gemini-1.5-flash or gemini-1.5-pro) "
        "and ensure the key is valid.",
        "source": "fallback",
    }


class ClosedQuestionPayload(BaseModel):
    question: str
    answer: Optional[str] = None
    choices: Optional[List[str]] = None
    intent: Optional[str] = None


class JobContext(BaseModel):
    company: Optional[str] = None
    role: Optional[str] = None
    job_description: Optional[str] = None
    url: Optional[str] = None
    extras: Optional[Dict[str, Any]] = None


class OpenQuestionPayload(BaseModel):
    question: str
    job_context: Optional[JobContext] = None
    resume_summary: Optional[str] = None


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.post("/parse-resume")
async def parse_resume(file: UploadFile = File(...)) -> Dict[str, Any]:
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty file uploaded.")

    if file.filename.lower().endswith(".pdf"):
        raw_text = extract_text_from_pdf(raw)
    else:
        try:
            raw_text = raw.decode("utf-8", errors="ignore")
        except Exception:
            raise HTTPException(status_code=400, detail="Unsupported file encoding.")

    resume = extract_structured_resume(raw_text)
    resume["filename"] = file.filename
    resume["summary"] = resume.get("summary") or build_resume_summary(resume)
    save_json(RESUME_CACHE_PATH, resume)
    return {"cached": True, "resume": resume}


@app.post("/parse-resume-local")
def parse_resume_local() -> Dict[str, Any]:
    try:
        raw = load_local_resume_bytes()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    if LOCAL_RESUME_PATH.suffix.lower() == ".pdf":
        raw_text = extract_text_from_pdf(raw)
    else:
        raw_text = raw.decode("utf-8", errors="ignore")

    resume = extract_structured_resume(raw_text)
    resume["filename"] = LOCAL_RESUME_PATH.name
    resume["summary"] = resume.get("summary") or build_resume_summary(resume)
    save_json(RESUME_CACHE_PATH, resume)
    return {"cached": True, "resume": resume, "source": str(LOCAL_RESUME_PATH)}


@app.get("/resume")
def get_resume() -> Dict[str, Any]:
    resume = load_json(RESUME_CACHE_PATH, {})
    if not resume:
        raise HTTPException(status_code=404, detail="No resume cached. Upload via /parse-resume first.")
    return resume


@app.post("/closed-question")
def handle_closed_question(payload: ClosedQuestionPayload) -> Dict[str, Any]:
    normalized = normalize_question(payload.question)
    history = load_json(QA_HISTORY_PATH, {})
    keyword_answers = load_json(KEYWORD_ANSWERS_PATH, {})
    response: Dict[str, Any] = {
        "question": payload.question,
        "normalized": normalized,
        "found": False,
        "answer": None,
    }

    if payload.answer:
        # Check if we need to update existing entry
        existing_entry = history.get(normalized)
        updated = False
        if existing_entry and existing_entry.get("answer") != payload.answer.strip():
            updated = True
        
        history[normalized] = {
            "question": payload.question.strip(),
            "answer": payload.answer.strip(),
            "choices": payload.choices or [],
        }
        
        # Update keyword answers as well
        if payload.intent:
            existing_intent = keyword_answers.get(payload.intent)
            if existing_intent != payload.answer.strip():
                keyword_answers[payload.intent] = payload.answer.strip()
                updated = True
        
        save_json(QA_HISTORY_PATH, history)
        save_json(KEYWORD_ANSWERS_PATH, keyword_answers)
        response.update({
            "answer": payload.answer.strip(), 
            "found": True, 
            "stored": True,
            "updated": updated
        })
        return response

    entry = history.get(normalized)
    if entry:
        response.update({"answer": entry.get("answer"), "found": True})
        return response
    if payload.intent:
        intent_answer = keyword_answers.get(payload.intent)
        if intent_answer:
            response.update({"answer": intent_answer, "found": True, "source": "intent"})
    return response


@app.post("/open-question")
def handle_open_question(payload: OpenQuestionPayload) -> Dict[str, Any]:
    resume = load_json(RESUME_CACHE_PATH, {})
    resume_summary = payload.resume_summary or build_resume_summary(resume) if resume else ""

    context_bits = []
    if payload.job_context:
        ctx = payload.job_context
        if ctx.company:
            context_bits.append(f"Company: {ctx.company}")
        if ctx.role:
            context_bits.append(f"Role: {ctx.role}")
        if ctx.url:
            context_bits.append(f"Posting: {ctx.url}")
        if ctx.job_description:
            context_bits.append(f"Job description snippet: {ctx.job_description}")
    context_text = "\n".join(context_bits)

    prompt = (
        "You are drafting a concise application response.\n"
        f"Question: {payload.question}\n\n"
        f"Candidate summary: {resume_summary or '[not provided]'}\n"
        f"{'Context: ' + context_text if context_text else ''}\n\n"
        "Return a short, specific answer (3-6 sentences)."
    )

    result = generate_with_gemini(prompt)
    return {
        "question": payload.question,
        "draft": result["draft"],
        "source": result["source"],
        "resume_included": bool(resume_summary),
        "context_included": bool(context_text),
    }


@app.get("/qa-history")
def qa_history() -> Dict[str, Any]:
    return load_json(QA_HISTORY_PATH, {})
