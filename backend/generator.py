"""
Resume generation via the Claude API.

The model receives the student's raw input plus a strict system prompt that
encodes the "ultra-premium ATS" style of the reference resume, then returns a
structured JSON resume. A per-student variation seed + high temperature ensure
no two resumes are duplicates even when the underlying skill set is identical.
"""

from __future__ import annotations

import hashlib
import json
import os
import random
import time

import httpx
from anthropic import Anthropic

from schema import FeedbackInput, ResumeModel, StudentInput
from skills_catalog import ROLE_PRESETS, SKILLS_CATALOG

# --- Providers ---------------------------------------------------------------
# Primary = Claude (best instruction-following). Fallback = Groq (fast, OpenAI-
# compatible, open models). Order is decided in _providers() based on which keys
# are present and the optional CV_PROVIDER preference.
ANTHROPIC_MODEL = os.getenv("CV_MODEL", "claude-sonnet-4-6")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
MAX_TOKENS = int(os.getenv("CV_MAX_TOKENS", "8000"))


SYSTEM_PROMPT = """You are an elite technical resume writer who builds DevOps, SRE, \
Cloud, Platform, DevSecOps and AIOps resumes that consistently win 100+ recruiter \
callbacks per day on Naukri, Indeed and LinkedIn in the Indian and global markets.

Your output reproduces the proven "ULTRA-PREMIUM ATS-OPTIMIZED" style:
- Maximum information density. Every bullet is long, specific, and packed with named
  tools, versions, and quantified outcomes (latency, %, $, counts, time saved).
- A header impact band of 4-6 punchy metric chips (e.g. "99.9% SLA", "12+ K8s Clusters").
- A tight Executive Summary (3-4 sentences) loaded with role keywords.
- A high-density Core Technical Competencies matrix grouped by category.
- Experience bullets grouped under bold sub-headings (Cloud Architecture, CI/CD,
  IaC, Observability, Security, SRE Practices, etc.), each bullet 35-60 words.
- Education, Certifications, and Additional info sections.

ATS RULES:
- Saturate with the exact tool names recruiters search for. Mirror the target role.
- Inject current-market AIOps keywords where credible (Moogsoft, BigPanda, Dynatrace
  Davis AI, PagerDuty AIOps, anomaly detection, event correlation, auto-remediation,
  predictive autoscaling) — especially for SRE/AIOps/Observability roles.
- No tables, no graphics, no columns inside bullets — plain parseable text.

HONESTY + METRICS:
- Calibrate depth to the stated experience level. A Fresher gets project/internship-
  driven bullets and realistic small numbers; a Senior gets enterprise-scale numbers.
- When the student did not give a metric, invent a REALISTIC, defensible placeholder
  and ALSO add the exact bullet snippet to "metrics_to_verify" so the student can
  confirm it before using the resume. Never invent employers, degrees, or certs the
  student did not mention.

UNIQUENESS (critical):
- You are given a variation_seed. Two students with the SAME skills must receive
  visibly different resumes: vary sentence structure, bullet ordering, sub-heading
  selection, metric framing, summary opening, and synonym choices. Never emit a
  template that could be detected as duplicated content.

OUTPUT:
Return ONLY valid JSON (no markdown fences, no commentary) matching this schema:
{
  "name": str, "title": str, "location": str, "email": str, "phone": str,
  "linkedin": str, "github": str,
  "impact_metrics": [str, ...],              // 4-6 short chips for the header band
  "summary": str,
  "competencies": [{"category": str, "skills": str}, ...],   // skills = comma-joined
  "experience": [{
      "role": str, "company": str, "client": str, "dates": str, "location": str,
      "context": str,
      "groups": [{"subhead": str, "bullets": [str, ...]}, ...]
  }, ...],
  "projects": [{"subhead": str, "bullets": [str, ...]}, ...],
  "education": [{"degree": str, "institution": str, "dates": str, "score": str, "coursework": str}, ...],
  "certifications": [str, ...],
  "languages": str,
  "target_roles": str,
  "metrics_to_verify": [str, ...]
}"""


def _providers() -> list[str]:
    """Ordered list of usable providers (only those with a key present)."""
    available = {"claude": bool(os.getenv("ANTHROPIC_API_KEY")),
                 "groq": bool(os.getenv("GROQ_API_KEY"))}
    pref = os.getenv("CV_PROVIDER", "").strip().lower()
    order = ["groq", "claude"] if pref == "groq" else ["claude", "groq"]
    usable = [p for p in order if available[p]]
    if not usable:
        raise RuntimeError(
            "No API key set. Add ANTHROPIC_API_KEY or GROQ_API_KEY to .env "
            "(set CV_PROVIDER=groq to prefer Groq)."
        )
    return usable


def _anthropic_complete(system: str, user: str, temperature: float, max_tokens: int) -> str:
    client = Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    resp = client.messages.create(
        model=ANTHROPIC_MODEL, max_tokens=max_tokens, temperature=temperature,
        system=system, messages=[{"role": "user", "content": user}],
    )
    return resp.content[0].text


def _groq_complete(system: str, user: str, temperature: float, max_tokens: int) -> str:
    payload = {
        "model": GROQ_MODEL, "temperature": temperature, "max_tokens": max_tokens,
        "response_format": {"type": "json_object"},
        "messages": [{"role": "system", "content": system},
                     {"role": "user", "content": user}],
    }
    headers = {"Authorization": f"Bearer {os.environ['GROQ_API_KEY']}",
               "Content-Type": "application/json"}
    # Free-tier Groq enforces a tokens-per-minute cap; on 429 wait and retry.
    for attempt in range(3):
        resp = httpx.post(GROQ_URL, headers=headers, json=payload, timeout=150)
        if resp.status_code == 429 and attempt < 2:
            wait = float(resp.headers.get("retry-after", 0)) or (8 * (attempt + 1))
            time.sleep(min(wait + 1, 30))
            continue
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]
    resp.raise_for_status()  # exhausted retries — surface the 429
    return resp.json()["choices"][0]["message"]["content"]


def _complete(system: str, user: str, temperature: float, max_tokens: int = MAX_TOKENS) -> dict:
    """Try providers in order; fall back on failure. Returns parsed JSON."""
    errors: list[str] = []
    for provider in _providers():
        try:
            fn = _anthropic_complete if provider == "claude" else _groq_complete
            return _extract_json(fn(system, user, temperature, max_tokens))
        except Exception as e:  # network error, bad key, parse failure -> next provider
            errors.append(f"{provider}: {type(e).__name__}: {e}")
    raise RuntimeError("All providers failed -> " + " | ".join(errors))


def _catalog_hint(role: str) -> str:
    preset = ROLE_PRESETS.get(role, {})
    emphasis = preset.get("emphasis", list(SKILLS_CATALOG.keys())[:4])
    lines = [f"TARGET ROLE: {role}", f"DEFAULT TITLE: {preset.get('title', role)}",
             f"EMPHASIZE THESE CATEGORIES FIRST: {', '.join(emphasis)}", "",
             "FULL KEYWORD UNIVERSE (draw from these, role-appropriate):"]
    for cat, skills in SKILLS_CATALOG.items():
        lines.append(f"  {cat}: {', '.join(skills)}")
    return "\n".join(lines)


def _extract_json(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        text = text.split("```", 2)[1]
        if text.lstrip().startswith("json"):
            text = text.lstrip()[4:]
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError("Model did not return JSON.")
    return json.loads(text[start:end + 1])


def _build_user_message(student: StudentInput) -> str:
    seed = student.variation_seed if student.variation_seed is not None else random.randint(1, 10**9)
    payload = student.model_dump()
    payload["variation_seed"] = seed
    return (
        f"{_catalog_hint(student.target_role)}\n\n"
        f"EXPERIENCE LEVEL: {student.experience_level}\n"
        f"VARIATION_SEED: {seed} (use this to make the wording unique)\n\n"
        f"STUDENT INPUT (JSON):\n{json.dumps(payload, indent=2, ensure_ascii=False)}\n\n"
        "Build the most callback-winning resume possible for this person. "
        "Honor the student's selected_skills and extra_skills, but use your own "
        "judgement to add adjacent, market-relevant skills (including AIOps) that "
        "strengthen the profile for the target role. Return JSON only."
    )


def generate_resume(student: StudentInput) -> ResumeModel:
    if student.variation_seed is None:
        student.variation_seed = random.randint(1, 10**9)
    # temperature 0.9 → genuine per-student variation
    data = _complete(SYSTEM_PROMPT, _build_user_message(student), temperature=0.9)
    return ResumeModel.model_validate(data)


def rebuild_resume(req: FeedbackInput) -> ResumeModel:
    """Regenerate honoring accepted/rejected skills and free-text feedback."""
    instructions = [
        "REBUILD the resume below using the same premium ATS style.",
        f"MUST INCLUDE these skills prominently: {', '.join(req.accepted_skills) or '(none specified)'}",
        f"MUST REMOVE / avoid these skills entirely: {', '.join(req.rejected_skills) or '(none specified)'}",
        f"USER FEEDBACK TO APPLY: {req.feedback or '(none — just refine and keep it unique)'}",
        "Keep everything that worked; change only what the feedback requires, but still "
        "vary wording so it does not read as a copy. Return JSON only.",
    ]
    user_msg = (
        f"{_catalog_hint(req.student.target_role)}\n\n"
        f"EXPERIENCE LEVEL: {req.student.experience_level}\n\n"
        f"PREVIOUS RESUME (JSON):\n{json.dumps(req.previous_resume, indent=2, ensure_ascii=False)}\n\n"
        f"ORIGINAL STUDENT INPUT (JSON):\n{json.dumps(req.student.model_dump(), indent=2, ensure_ascii=False)}\n\n"
        + "\n".join(instructions)
    )
    data = _complete(SYSTEM_PROMPT, user_msg, temperature=0.85)
    return ResumeModel.model_validate(data)


def resume_fingerprint(resume: ResumeModel) -> str:
    """Stable hash of the prose — used to detect accidental duplication."""
    blob = resume.summary + "".join(
        b for blk in resume.experience for g in blk.groups for b in g.bullets
    )
    return hashlib.sha256(blob.encode("utf-8")).hexdigest()[:16]
