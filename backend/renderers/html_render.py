"""Render a ResumeModel to standalone HTML (used for live preview and as PDF source)."""

from __future__ import annotations

from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape

from schema import ResumeModel

_TEMPLATE_DIR = Path(__file__).resolve().parent.parent / "templates"
_env = Environment(
    loader=FileSystemLoader(str(_TEMPLATE_DIR)),
    autoescape=select_autoescape(["html", "xml"]),
)


def render_html(resume: ResumeModel) -> str:
    return _env.get_template("resume.html.j2").render(r=resume)
