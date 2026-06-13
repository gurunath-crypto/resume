"""
CV Builder — FastAPI backend.

Run from the project root:
    uvicorn backend.main:app --reload --port 8000
Then open http://localhost:8000
"""

from __future__ import annotations

import json
import re
import uuid
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles

load_dotenv()  # read .env before importing modules that read env at import time

from generator import generate_resume, rebuild_resume, resume_fingerprint  # noqa: E402
from renderers.docx_render import render_docx  # noqa: E402
from renderers.html_render import render_html  # noqa: E402
from renderers.pdf_render import html_to_pdf  # noqa: E402
from schema import FeedbackInput, ResumeModel, StudentInput  # noqa: E402
from skills_catalog import EXPERIENCE_LEVELS, ROLE_PRESETS, SKILLS_CATALOG  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
FRONTEND = ROOT / "frontend"
STORAGE = ROOT / "storage"
STORAGE.mkdir(exist_ok=True)

app = FastAPI(title="DevOps/SRE CV Builder")

# In-memory cache of the latest resume per session id (also persisted to disk).
_CACHE: dict[str, ResumeModel] = {}


def _safe_name(name: str) -> str:
    return re.sub(r"[^A-Za-z0-9]+", "_", name).strip("_") or "resume"


def _persist(rid: str, student: StudentInput, resume: ResumeModel) -> None:
    _CACHE[rid] = resume
    (STORAGE / f"{rid}.json").write_text(
        json.dumps({"student": student.model_dump(), "resume": resume.model_dump()},
                   indent=2, ensure_ascii=False),
        encoding="utf-8",
    )


def _get(rid: str) -> ResumeModel:
    if rid in _CACHE:
        return _CACHE[rid]
    f = STORAGE / f"{rid}.json"
    if f.exists():
        resume = ResumeModel.model_validate(json.loads(f.read_text(encoding="utf-8"))["resume"])
        _CACHE[rid] = resume
        return resume
    raise HTTPException(404, "Resume not found — generate it first.")


@app.get("/api/catalog")
def catalog() -> dict:
    return {
        "skills": SKILLS_CATALOG,
        "roles": list(ROLE_PRESETS.keys()),
        "levels": EXPERIENCE_LEVELS,
    }


@app.post("/api/generate")
def generate(student: StudentInput) -> JSONResponse:
    try:
        resume = generate_resume(student)
    except Exception as e:  # surface a clean message to the UI
        raise HTTPException(500, f"Generation failed: {e}")
    rid = uuid.uuid4().hex[:12]
    _persist(rid, student, resume)
    return JSONResponse({
        "id": rid,
        "resume": resume.model_dump(),
        "fingerprint": resume_fingerprint(resume),
    })


@app.post("/api/rebuild/{rid}")
def rebuild(rid: str, req: FeedbackInput) -> JSONResponse:
    try:
        resume = rebuild_resume(req)
    except Exception as e:
        raise HTTPException(500, f"Rebuild failed: {e}")
    _persist(rid, req.student, resume)
    return JSONResponse({
        "id": rid,
        "resume": resume.model_dump(),
        "fingerprint": resume_fingerprint(resume),
    })


@app.get("/api/preview/{rid}", response_class=HTMLResponse)
def preview(rid: str) -> str:
    return render_html(_get(rid))


@app.get("/api/download/{rid}.pdf")
def download_pdf(rid: str) -> Response:
    resume = _get(rid)
    pdf = html_to_pdf(render_html(resume))
    fname = f"{_safe_name(resume.name)}_Resume.pdf"
    return Response(pdf, media_type="application/pdf",
                    headers={"Content-Disposition": f'attachment; filename="{fname}"'})


@app.get("/api/download/{rid}.docx")
def download_docx(rid: str) -> Response:
    resume = _get(rid)
    data = render_docx(resume)
    fname = f"{_safe_name(resume.name)}_Resume.docx"
    return Response(
        data,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{fname}"'},
    )


# Serve the single-page frontend at /
app.mount("/", StaticFiles(directory=str(FRONTEND), html=True), name="frontend")
