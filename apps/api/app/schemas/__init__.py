from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.services.job_quality import normalize_topjobs_apply_url


class CVProfileData(BaseModel):
    skills: list[str] = Field(default_factory=list)
    education: list[dict[str, Any]] = Field(default_factory=list)
    certifications: list[str] = Field(default_factory=list)
    experience: list[dict[str, Any]] = Field(default_factory=list)
    keywords: list[str] = Field(default_factory=list)
    ai_summary: dict[str, Any] = Field(default_factory=dict)


class CVResponse(BaseModel):
    id: UUID
    file_name: str
    mime_type: str
    status: str
    uploaded_at: datetime

    model_config = {"from_attributes": True}


class CVProfileResponse(CVProfileData):
    id: UUID
    cv_id: UUID
    analyzed_at: datetime | None

    model_config = {"from_attributes": True}


class JobListingResponse(BaseModel):
    id: UUID
    source: str
    title: str
    company: str
    location: str
    salary_text: str | None
    required_skills: list[str]
    preferred_skills: list[str]
    description: str
    apply_url: str
    posted_at: datetime | None

    @field_validator("apply_url")
    @classmethod
    def normalize_apply_url(cls, value: str) -> str:
        return normalize_topjobs_apply_url(value) or value

    model_config = {"from_attributes": True}


class JobMatchResponse(BaseModel):
    id: UUID
    match_score: int
    potential_score: int
    matched_skills: list[str]
    missing_skills: list[str]
    match_explanation: dict[str, Any]
    job: JobListingResponse
    created_at: datetime

    model_config = {"from_attributes": True}


class SearchSessionResponse(BaseModel):
    id: UUID
    cv_id: UUID
    status: str
    filters: dict[str, Any]
    started_at: datetime
    completed_at: datetime | None
    matches: list[JobMatchResponse] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class SessionCreateRequest(BaseModel):
    cv_id: UUID
    filters: dict[str, Any] = Field(default_factory=dict)


class CoverLetterResponse(BaseModel):
    id: UUID
    match_id: UUID
    content: str
    generated_at: datetime

    model_config = {"from_attributes": True}


class InterviewPrepResponse(BaseModel):
    id: UUID
    match_id: UUID
    content: dict[str, Any]
    generated_at: datetime

    model_config = {"from_attributes": True}


class SkillGapResponse(BaseModel):
    id: UUID
    skill_name: str
    priority: int
    learning_path: dict[str, Any]

    model_config = {"from_attributes": True}


class DashboardStats(BaseModel):
    total_matches: int
    average_match_score: float
    missing_skills_count: int
    recommended_skills: list[str]
