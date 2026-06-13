"""Pydantic models: student input (form) and the structured resume the AI returns."""

from __future__ import annotations

from pydantic import BaseModel, Field


# ----------------------------- INPUT (from the UI form) -----------------------------

class EducationIn(BaseModel):
    degree: str = ""
    institution: str = ""
    dates: str = ""
    score: str = ""          # CGPA / % — optional
    coursework: str = ""     # comma separated — optional


class ExperienceIn(BaseModel):
    role: str = ""
    company: str = ""
    client: str = ""         # for consultancy / staffing setups — optional
    dates: str = ""
    location: str = ""
    context: str = ""        # one line: what the project/team did
    highlights: str = ""     # free text: what the student actually did (raw, messy is fine)


class ProjectIn(BaseModel):
    name: str = ""
    description: str = ""


class StudentInput(BaseModel):
    # identity
    name: str
    email: str = ""
    phone: str = ""
    location: str = ""
    linkedin: str = ""
    github: str = ""

    # targeting
    target_role: str = "DevOps Engineer"
    experience_level: str = "Mid / 2-4 yrs"

    # content
    education: list[EducationIn] = Field(default_factory=list)
    experience: list[ExperienceIn] = Field(default_factory=list)
    projects: list[ProjectIn] = Field(default_factory=list)
    certifications: list[str] = Field(default_factory=list)
    selected_skills: list[str] = Field(default_factory=list)
    extra_skills: str = ""           # free text skills not in the catalog
    languages: str = ""

    # generation controls
    variation_seed: int | None = None   # set server-side for uniqueness


class FeedbackInput(BaseModel):
    """Rebuild request: prior resume + the user's corrections."""
    student: StudentInput
    previous_resume: dict
    accepted_skills: list[str] = Field(default_factory=list)
    rejected_skills: list[str] = Field(default_factory=list)
    feedback: str = ""               # free-text instructions to the AI


# ----------------------------- OUTPUT (resume the AI returns) -----------------------------

class CompetencyGroup(BaseModel):
    category: str
    skills: str          # comma-joined string, rendered inline


class ExperienceGroup(BaseModel):
    subhead: str
    bullets: list[str]


class ExperienceBlock(BaseModel):
    role: str
    company: str
    client: str = ""
    dates: str = ""
    location: str = ""
    context: str = ""
    groups: list[ExperienceGroup] = Field(default_factory=list)


class EducationBlock(BaseModel):
    degree: str
    institution: str = ""
    dates: str = ""
    score: str = ""
    coursework: str = ""


class ResumeModel(BaseModel):
    name: str
    title: str = ""
    location: str = ""
    email: str = ""
    phone: str = ""
    linkedin: str = ""
    github: str = ""
    impact_metrics: list[str] = Field(default_factory=list)   # header band chips
    summary: str = ""
    competencies: list[CompetencyGroup] = Field(default_factory=list)
    experience: list[ExperienceBlock] = Field(default_factory=list)
    projects: list[ExperienceGroup] = Field(default_factory=list)   # reuse: subhead=name
    education: list[EducationBlock] = Field(default_factory=list)
    certifications: list[str] = Field(default_factory=list)
    languages: str = ""
    target_roles: str = ""
    # fields the UI flags for the student to verify before download
    metrics_to_verify: list[str] = Field(default_factory=list)
