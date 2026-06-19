import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.deps import get_current_user
from app.models import CoverLetter, CVProfile, JobMatch, SearchSession, User
from app.schemas import CoverLetterResponse, InterviewPrepResponse
from app.models import InterviewPrep
from app.services.ai import generate_cover_letter, generate_interview_prep

router = APIRouter(prefix="/api/v1/matches", tags=["cover-letters"])


async def _get_user_match(match_id: uuid.UUID, user: User, db: AsyncSession) -> JobMatch:
    result = await db.execute(
        select(JobMatch)
        .join(SearchSession)
        .options(
            selectinload(JobMatch.job),
            selectinload(JobMatch.profile),
        )
        .where(JobMatch.id == match_id, SearchSession.user_id == user.id)
    )
    match = result.scalar_one_or_none()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    return match


@router.post("/{match_id}/cover-letter", response_model=CoverLetterResponse)
async def create_cover_letter(
    match_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    match = await _get_user_match(match_id, user, db)
    profile_dict = {
        "skills": match.profile.skills or [],
        "education": match.profile.education or [],
        "certifications": match.profile.certifications or [],
        "experience": match.profile.experience or [],
        "keywords": match.profile.keywords or [],
        "ai_summary": match.profile.ai_summary or {},
    }
    job_dict = {
        "title": match.job.title,
        "company": match.job.company,
        "description": match.job.description,
    }
    match_dict = {
        "matched_skills": match.matched_skills or [],
        "missing_skills": match.missing_skills or [],
        "match_score": match.match_score,
    }

    content = await generate_cover_letter(profile_dict, job_dict, match_dict)

    existing = await db.execute(select(CoverLetter).where(CoverLetter.match_id == match.id))
    letter = existing.scalar_one_or_none()
    if letter:
        letter.content = content
    else:
        letter = CoverLetter(match_id=match.id, content=content)
        db.add(letter)
    await db.flush()
    return letter


@router.get("/{match_id}/cover-letter", response_model=CoverLetterResponse)
async def get_cover_letter(
    match_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    match = await _get_user_match(match_id, user, db)
    result = await db.execute(select(CoverLetter).where(CoverLetter.match_id == match.id))
    letter = result.scalar_one_or_none()
    if not letter:
        raise HTTPException(status_code=404, detail="Cover letter not found")
    return letter


@router.post("/{match_id}/interview-prep", response_model=InterviewPrepResponse)
async def create_interview_prep(
    match_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    match = await _get_user_match(match_id, user, db)
    profile_dict = {
        "skills": match.profile.skills or [],
        "ai_summary": match.profile.ai_summary or {},
    }
    job_dict = {"title": match.job.title, "company": match.job.company, "description": match.job.description}
    content = await generate_interview_prep(profile_dict, job_dict)

    existing = await db.execute(select(InterviewPrep).where(InterviewPrep.match_id == match.id))
    prep = existing.scalar_one_or_none()
    if prep:
        prep.content = content
    else:
        prep = InterviewPrep(match_id=match.id, content=content)
        db.add(prep)
    await db.flush()
    return prep
