import asyncio
import json
from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field

from app.config import settings
from app.services.cv_extractor import extract_profile_from_text


class ExtractedProfile(BaseModel):
    skills: list[str] = Field(default_factory=list)
    education: list[dict[str, Any]] = Field(default_factory=list)
    certifications: list[str] = Field(default_factory=list)
    experience: list[dict[str, Any]] = Field(default_factory=list)
    keywords: list[str] = Field(default_factory=list)


class ProfileAnalysis(BaseModel):
    seniority: str = "mid"
    domains: list[str] = Field(default_factory=list)
    strengths: list[str] = Field(default_factory=list)
    summary: str = ""


def _get_llm() -> ChatOpenAI | None:
    if not settings.openai_api_key:
        return None
    return ChatOpenAI(
        model="gpt-4o-mini",
        api_key=settings.openai_api_key,
        temperature=0.2,
        timeout=45,
        max_retries=1,
    )


async def _with_timeout(coro, timeout_seconds: float, fallback):
    try:
        return await asyncio.wait_for(coro, timeout=timeout_seconds)
    except (asyncio.TimeoutError, Exception):
        return fallback


def _fallback_extract(raw_text: str) -> dict[str, Any]:
    data = extract_profile_from_text(raw_text)
    data.pop("ai_summary", None)
    return data


def _fallback_analysis(profile: dict[str, Any]) -> dict[str, Any]:
    domains = profile.get("primary_domains") or ["general"]
    experience = profile.get("experience", [])
    years = sum(float(exp.get("years", 0) or 0) for exp in experience)
    seniority = "senior" if years >= 5 else "mid" if years >= 2 else "junior"
    domain_label = domains[0].replace("_", " ").title()
    title = experience[0].get("title", "professional") if experience else "professional"
    return {
        "seniority": seniority,
        "domains": [domain.replace("_", " ").title() for domain in domains[:3]],
        "strengths": profile.get("skills", [])[:6],
        "summary": f"{domain_label} profile with {title} experience.",
    }


async def extract_profile_from_cv(raw_text: str) -> dict[str, Any]:
    llm = _get_llm()
    if not llm:
        return _fallback_extract(raw_text)

    structured = llm.with_structured_output(ExtractedProfile)
    result = await _with_timeout(
        structured.ainvoke(
            [
                SystemMessage(
                    content="Extract structured candidate data from this CV for Sri Lankan job market matching."
                ),
                HumanMessage(content=raw_text[:12000]),
            ]
        ),
        45,
        None,
    )
    if result is None:
        return _fallback_extract(raw_text)
    return result.model_dump()


async def analyze_profile(profile: dict[str, Any]) -> dict[str, Any]:
    llm = _get_llm()
    if not llm:
        return _fallback_analysis(profile)

    structured = llm.with_structured_output(ProfileAnalysis)
    result = await _with_timeout(
        structured.ainvoke(
            [
                SystemMessage(content="Analyze this candidate profile for job matching in Sri Lanka."),
                HumanMessage(content=json.dumps(profile)),
            ]
        ),
        30,
        None,
    )
    if result is None:
        return _fallback_analysis(profile)
    return result.model_dump()


async def generate_match_explanation(profile: dict[str, Any], job: dict[str, Any], scores: dict[str, Any]) -> str:
    llm = _get_llm()
    if not llm:
        matched = ", ".join(scores.get("matched_skills", [])[:5]) or "general background"
        return f"This role aligns with your {matched}. Consider upskilling in {', '.join(scores.get('missing_skills', [])[:3]) or 'listed requirements'}."

    resp = await llm.ainvoke(
        [
            SystemMessage(content="Write a concise 2-sentence job match explanation for a Sri Lankan job seeker."),
            HumanMessage(
                content=json.dumps({"profile": profile, "job": {"title": job.get("title"), "company": job.get("company")}, "scores": scores})
            ),
        ]
    )
    return resp.content if isinstance(resp.content, str) else str(resp.content)


async def generate_cover_letter(profile: dict[str, Any], job: dict[str, Any], match: dict[str, Any]) -> str:
    llm = _get_llm()
    name = profile.get("ai_summary", {}).get("summary", "Candidate")
    if not llm:
        return (
            f"Dear Hiring Manager,\n\n"
            f"I am writing to express my interest in the {job.get('title')} position at {job.get('company')}. "
            f"My background in {', '.join(match.get('matched_skills', [])[:4])} aligns well with your requirements.\n\n"
            f"I am eager to contribute to your team and welcome the opportunity to discuss my fit for this role.\n\n"
            f"Sincerely,\nApplicant"
        )

    resp = await llm.ainvoke(
        [
            SystemMessage(content="Write a professional cover letter for a Sri Lankan job application. 3 short paragraphs."),
            HumanMessage(content=json.dumps({"profile": profile, "job": job, "match": match})),
        ]
    )
    return resp.content if isinstance(resp.content, str) else str(resp.content)


async def generate_interview_prep(profile: dict[str, Any], job: dict[str, Any]) -> dict[str, Any]:
    llm = _get_llm()
    if not llm:
        return {
            "technical_questions": [
                f"Describe your experience with {profile.get('skills', ['your core skills'])[0]}.",
                "Walk through a challenging project you delivered.",
            ],
            "hr_questions": [
                "Why do you want to join our company?",
                "Where do you see yourself in 3 years?",
            ],
            "suggested_answers": [
                "Highlight measurable outcomes and team collaboration.",
                "Connect your goals with the company's mission in Sri Lanka.",
            ],
        }

    resp = await llm.ainvoke(
        [
            SystemMessage(
                content='Return JSON with keys: technical_questions (5), hr_questions (5), suggested_answers (5). Sri Lankan context.'
            ),
            HumanMessage(content=json.dumps({"profile": profile, "job": job})),
        ]
    )
    try:
        return json.loads(resp.content if isinstance(resp.content, str) else str(resp.content))
    except json.JSONDecodeError:
        return {"technical_questions": [str(resp.content)], "hr_questions": [], "suggested_answers": []}
