import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.agents.graph import run_matching_pipeline
from app.database import AsyncSessionLocal, get_db
from app.deps import get_current_user
from app.models import CV, CVProfile, JobListing, JobMatch, SearchSession, SkillGap, User
from app.schemas import JobMatchResponse, JobListingResponse, SearchSessionResponse, SessionCreateRequest

router = APIRouter(prefix="/api/v1/sessions", tags=["sessions"])


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


async def _run_session(session_id: uuid.UUID):
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(SearchSession)
            .options(selectinload(SearchSession.cv).selectinload(CV.profile))
            .where(SearchSession.id == session_id)
        )
        session = result.scalar_one_or_none()
        if not session or not session.cv or not session.cv.profile:
            return

        profile = session.cv.profile
        profile_dict = {
            "skills": profile.skills or [],
            "education": profile.education or [],
            "certifications": profile.certifications or [],
            "experience": profile.experience or [],
            "keywords": profile.keywords or [],
            "ai_summary": profile.ai_summary or {},
            "primary_domains": (profile.ai_summary or {}).get("primary_domains", []),
        }

        session.status = "running"
        await db.commit()

        try:
            pipeline = await run_matching_pipeline(db, profile_dict)
            ranked = pipeline["ranked_matches"]

            for item in ranked:
                job_uuid = uuid.UUID(item["job"]["id"])
                job_result = await db.execute(select(JobListing).where(JobListing.id == job_uuid))
                job = job_result.scalar_one_or_none()
                if not job:
                    continue
                match = JobMatch(
                    session_id=session.id,
                    profile_id=profile.id,
                    job_id=job.id,
                    match_score=item["match_score"],
                    potential_score=item["potential_score"],
                    matched_skills=item["matched_skills"],
                    missing_skills=item["missing_skills"],
                    match_explanation=item["match_explanation"],
                )
                db.add(match)

            await db.execute(
                SkillGap.__table__.delete().where(SkillGap.profile_id == profile.id)
            )
            for gap in pipeline["skill_gaps"]:
                db.add(
                    SkillGap(
                        profile_id=profile.id,
                        skill_name=gap["skill_name"],
                        priority=gap["priority"],
                        learning_path=gap["learning_path"],
                    )
                )

            session.status = "completed"
            session.completed_at = datetime.now(timezone.utc)
            await db.commit()
        except Exception:
            session.status = "failed"
            await db.commit()
            raise


@router.post("", response_model=SearchSessionResponse)
async def create_session(
    body: SessionCreateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cv_result = await db.execute(
        select(CV).options(selectinload(CV.profile)).where(CV.id == body.cv_id, CV.user_id == user.id)
    )
    cv = cv_result.scalar_one_or_none()
    if not cv:
        raise HTTPException(status_code=404, detail="CV not found")
    if not cv.profile:
        raise HTTPException(status_code=400, detail="Analyze CV before starting a search session")

    session = SearchSession(user_id=user.id, cv_id=cv.id, filters=body.filters, status="pending")
    db.add(session)
    await db.flush()
    await db.commit()

    try:
        await _run_session(session.id)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Job matching failed: {exc}") from exc

    result = await db.execute(
        select(SearchSession)
        .options(selectinload(SearchSession.matches).selectinload(JobMatch.job))
        .where(SearchSession.id == session.id)
    )
    session = result.scalar_one()
    matches = sorted(session.matches, key=lambda m: m.match_score, reverse=True)

    return SearchSessionResponse(
        id=session.id,
        cv_id=session.cv_id,
        status=session.status,
        filters=session.filters,
        started_at=session.started_at,
        completed_at=session.completed_at,
        matches=[_match_response(m) for m in matches],
    )


@router.get("", response_model=list[SearchSessionResponse])
async def list_sessions(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(SearchSession).where(SearchSession.user_id == user.id).order_by(SearchSession.started_at.desc())
    )
    sessions = result.scalars().all()
    return [
        SearchSessionResponse(
            id=s.id,
            cv_id=s.cv_id,
            status=s.status,
            filters=s.filters,
            started_at=s.started_at,
            completed_at=s.completed_at,
            matches=[],
        )
        for s in sessions
    ]


@router.get("/{session_id}", response_model=SearchSessionResponse)
async def get_session(
    session_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SearchSession)
        .options(selectinload(SearchSession.matches).selectinload(JobMatch.job))
        .where(SearchSession.id == session_id, SearchSession.user_id == user.id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    matches = sorted(session.matches, key=lambda m: m.match_score, reverse=True)
    return SearchSessionResponse(
        id=session.id,
        cv_id=session.cv_id,
        status=session.status,
        filters=session.filters,
        started_at=session.started_at,
        completed_at=session.completed_at,
        matches=[_match_response(m) for m in matches],
    )
