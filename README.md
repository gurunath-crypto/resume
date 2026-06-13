# DevOps / SRE / AIOps — Intelligent CV Builder

A local web tool that turns a student's raw details into a **premium, ATS-optimized,
callback-winning resume** in the same ultra-dense style as the proven reference CV —
then exports **PDF and Word**. Every resume is **uniquely generated** (no duplicates,
even for students with identical skill sets), and you can **refine with feedback**.

Built for the Indian + global DevOps/SRE market, with **AIOps** keywords injected
where credible.

## What it does
- **Smart form** — identity, target role, experience level, experience, projects,
  education, certifications, and tap-to-select skills (DevOps / SRE / Cloud / AIOps /
  Security taxonomy).
- **AI generation (Claude)** — rewrites rough notes into dense, metric-rich bullets;
  saturates ATS keywords for the chosen role; injects AIOps where it fits.
- **Uniqueness** — high-temperature + per-student variation seed so two identical
  inputs still produce visibly different resumes. A content fingerprint is shown.
- **Honest metrics** — when a student lacks numbers, the AI adds realistic placeholders
  **and flags them** in a yellow "verify before you apply" banner.
- **Feedback loop** — toggle skills to force-keep (green) / force-remove (red), add a
  note, and rebuild. Stays unique.
- **Download** — one-click PDF (Chromium-rendered, pixel-faithful) and Word (clean
  single-column, maximally ATS-parseable).

## Setup (Windows / PowerShell)

```powershell
cd C:\Users\Suriya\cv-builder
.\run.ps1          # first run: creates venv, installs deps + Chromium, makes .env
```

On the first run it creates `.env`. Open it and paste **at least one** API key:

```
ANTHROPIC_API_KEY=sk-ant-...     # primary
GROQ_API_KEY=gsk_...             # automatic fallback (open Llama models, fast)
```

Then run `.\run.ps1` again and open **http://localhost:8000**.

### Providers & fallback
- Claude is the primary engine; **Groq is used automatically if Claude fails** (bad key,
  rate limit, network error).
- Have only Groq? Set `CV_PROVIDER=groq` in `.env` to make Groq the primary.
- Models are configurable: `CV_MODEL` (Claude), `GROQ_MODEL` (default
  `llama-3.3-70b-versatile`).

### Manual setup (if you prefer)
```powershell
python -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt
.\.venv\Scripts\python -m playwright install chromium
Copy-Item .env.example .env   # then edit .env
.\.venv\Scripts\python -m uvicorn main:app --app-dir backend --port 8000
```

## How it's wired
```
frontend/        single-page UI (form + live preview + feedback + downloads)
backend/
  main.py        FastAPI routes: /api/generate, /api/rebuild, /api/preview, /api/download
  generator.py   Claude prompt + JSON resume generation + uniqueness/fingerprint
  schema.py      Pydantic models (input + resume)
  skills_catalog.py  DevOps/SRE/AIOps skill taxonomy + role presets
  templates/resume.html.j2   premium template (mirrors the reference LaTeX look)
  renderers/     html / pdf (Playwright) / docx (python-docx)
storage/         generated resumes (JSON), gitignored
```

## Notes
- Model defaults to `claude-sonnet-4-6` (fast + cheap for long output). Set
  `CV_MODEL=claude-opus-4-8` in `.env` for maximum polish.
- The PDF export needs Chromium once: `python -m playwright install chromium`
  (the launcher does this automatically).
- This is a local tool. To put it online later, host the FastAPI app and add auth +
  per-user storage.
