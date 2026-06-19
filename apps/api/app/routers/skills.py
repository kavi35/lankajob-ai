from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.deps import get_current_user
from app.models import CV, CVProfile, JobMatch, SearchSession, SkillGap, User
from app.schemas import DashboardStats, SkillGapResponse

router = APIRouter(prefix="/api/v1/skills", tags=["skills"])


@router.get("/gaps", response_model=list[SkillGapResponse])
async def get_skill_gaps(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(SkillGap)
        .join(CVProfile)
        .join(CV)
        .where(CV.user_id == user.id)
        .order_by(SkillGap.priority.desc())
        .limit(20)
    )
    return result.scalars().all()


@router.get("/recommendations")
async def get_recommendations(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(SkillGap)
        .join(CVProfile)
        .join(CV)
        .where(CV.user_id == user.id)
        .order_by(SkillGap.priority.desc())
        .limit(10)
    )
    gaps = result.scalars().all()
    return [
        {
            "skill": g.skill_name,
            "priority": g.priority,
            "learning_path": g.learning_path,
        }
        for g in gaps
    ]


@router.get("/dashboard-stats", response_model=DashboardStats)
async def dashboard_stats(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    matches_result = await db.execute(
        select(JobMatch)
        .join(SearchSession)
        .where(SearchSession.user_id == user.id)
    )
    matches = matches_result.scalars().all()
    total = len(matches)
    avg = sum(m.match_score for m in matches) / total if total else 0.0

    gaps_result = await db.execute(
        select(SkillGap)
        .join(CVProfile)
        .join(CV)
        .where(CV.user_id == user.id)
    )
    gaps = gaps_result.scalars().all()

    return DashboardStats(
        total_matches=total,
        average_match_score=round(avg, 1),
        missing_skills_count=len(gaps),
        recommended_skills=[g.skill_name for g in gaps[:5]],
    )
