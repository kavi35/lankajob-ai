import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_user
from app.models import JobListing, SavedJob, User
from app.schemas import JobListingResponse
from app.services.job_refresh import refresh_all_jobs

router = APIRouter(prefix="/api/v1/jobs", tags=["jobs"])


@router.post("/refresh")
async def refresh_jobs(user: User = Depends(get_current_user)):
    result = await refresh_all_jobs()
    return result


@router.get("/{job_id}", response_model=JobListingResponse)
async def get_job(job_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(JobListing).where(JobListing.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.post("/{job_id}/save")
async def save_job(
    job_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    job_result = await db.execute(select(JobListing).where(JobListing.id == job_id))
    if not job_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Job not found")

    existing = await db.execute(
        select(SavedJob).where(SavedJob.user_id == user.id, SavedJob.job_id == job_id)
    )
    if existing.scalar_one_or_none():
        return {"saved": True}

    db.add(SavedJob(user_id=user.id, job_id=job_id))
    await db.flush()
    return {"saved": True}


@router.delete("/{job_id}/save")
async def unsave_job(
    job_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SavedJob).where(SavedJob.user_id == user.id, SavedJob.job_id == job_id)
    )
    saved = result.scalar_one_or_none()
    if saved:
        await db.delete(saved)
    return {"saved": False}
