import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.deps import get_current_user
from app.models import JobMatch, SearchSession, User
from app.schemas import JobMatchResponse, JobListingResponse
from app.services.job_quality import is_real_job_url

router = APIRouter(prefix="/api/v1/matches", tags=["matches"])


def _match_response(match: JobMatch) -> JobMatchResponse:
    return JobMatchResponse(
        id=match.id,
        match_score=match.match_score,
        potential_score=match.potential_score,
        matched_skills=match.matched_skills or [],
        missing_skills=match.missing_skills or [],
        match_explanation=match.match_explanation or {},
        job=JobListingResponse.model_validate(match.job),
        created_at=match.created_at,
    )


@router.get("", response_model=list[JobMatchResponse])
async def list_matches(
    min_score: int = Query(0, ge=0, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(JobMatch)
        .join(SearchSession)
        .join(JobMatch.job)
        .options(selectinload(JobMatch.job))
        .where(
            SearchSession.user_id == user.id,
            JobMatch.match_score >= min_score,
        )
        .order_by(JobMatch.match_score.desc(), JobMatch.created_at.desc())
    )
    seen_jobs: set = set()
    unique_matches: list[JobMatch] = []
    for match in result.scalars().all():
        if match.job_id in seen_jobs:
            continue
        if not is_real_job_url(match.job.apply_url):
            continue
        seen_jobs.add(match.job_id)
        unique_matches.append(match)
        if len(unique_matches) >= 50:
            break
    return [_match_response(m) for m in unique_matches]


@router.get("/{match_id}", response_model=JobMatchResponse)
async def get_match(
    match_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(JobMatch)
        .join(SearchSession)
        .options(selectinload(JobMatch.job))
        .where(JobMatch.id == match_id, SearchSession.user_id == user.id)
    )
    match = result.scalar_one_or_none()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    return _match_response(match)
