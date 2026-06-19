from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import JobListing
from app.services.cv_extractor import build_profile_search_terms, score_job_for_profile
from app.services.job_quality import is_real_job_url


def _job_blob(job: JobListing) -> str:
    return " ".join(
        [
            job.title or "",
            job.company or "",
            job.description or "",
            " ".join(job.required_skills or []),
            " ".join(job.preferred_skills or []),
        ]
    )


async def search_jobs_from_db(db: AsyncSession, profile: dict, limit: int = 50) -> list[dict]:
    terms = build_profile_search_terms(profile)
    domain_terms = [
        term.lower()
        for term in (profile.get("primary_domains") or []) + profile.get("ai_summary", {}).get("domains", [])
        if str(term).lower() not in {"general", ""}
    ]

    result = await db.execute(select(JobListing).order_by(JobListing.scraped_at.desc()).limit(500))
    candidates = [job for job in result.scalars().all() if is_real_job_url(job.apply_url)]

    scored: list[tuple[int, JobListing]] = []
    for job in candidates:
        blob = _job_blob(job)
        score = score_job_for_profile(blob, terms)
        if domain_terms:
            score += score_job_for_profile(blob, domain_terms) * 2
        if score > 0:
            scored.append((score, job))

    scored.sort(key=lambda item: item[0], reverse=True)
    jobs = [job for _, job in scored[:limit]]

    if not jobs and domain_terms:
        fallback_scored: list[tuple[int, JobListing]] = []
        for job in candidates:
            score = score_job_for_profile(_job_blob(job), domain_terms)
            if score > 0:
                fallback_scored.append((score, job))
        fallback_scored.sort(key=lambda item: item[0], reverse=True)
        jobs = [job for _, job in fallback_scored[:limit]]

    return [
        {
            "id": str(job.id),
            "source": job.source,
            "title": job.title,
            "company": job.company,
            "location": job.location,
            "salary_text": job.salary_text,
            "required_skills": job.required_skills or [],
            "preferred_skills": job.preferred_skills or [],
            "description": job.description,
            "apply_url": job.apply_url,
        }
        for job in jobs
    ]


async def search_jobs_node(state: dict, db: AsyncSession) -> dict:
    profile = state.get("parsed_profile", {})
    jobs = await search_jobs_from_db(db, profile)
    return {"job_candidates": jobs}
