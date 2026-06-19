import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.agents.graph import run_cv_analysis
from app.database import get_db
from app.deps import get_current_user
from app.models import CV, CVProfile, User
from app.schemas import CVProfileResponse, CVResponse
from app.services.cv_parser import delete_from_storage, download_from_storage, upload_to_storage

router = APIRouter(prefix="/api/v1/cv", tags=["cv"])


async def _delete_cv_record(cv: CV, db: AsyncSession) -> None:
    await delete_from_storage(cv.storage_path)
    await db.execute(delete(CV).where(CV.id == cv.id))


@router.post("/upload", response_model=CVResponse)
async def upload_cv(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if file.content_type not in {
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
    }:
        raise HTTPException(status_code=400, detail="Only PDF and DOCX files are supported")

    content = await file.read()
    storage_path = await upload_to_storage(str(user.id), file.filename or "cv.pdf", content, file.content_type or "application/pdf")

    # Replace previous uploads — keep only the latest CV per user.
    existing = await db.execute(select(CV).where(CV.user_id == user.id))
    for old_cv in existing.scalars().all():
        await _delete_cv_record(old_cv, db)

    cv = CV(
        user_id=user.id,
        file_name=file.filename or "cv.pdf",
        storage_path=storage_path,
        mime_type=file.content_type or "application/pdf",
        status="uploaded",
    )
    db.add(cv)
    await db.flush()
    return cv


@router.get("", response_model=list[CVResponse])
async def list_cvs(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CV).where(CV.user_id == user.id).order_by(CV.uploaded_at.desc()))
    return result.scalars().all()


@router.post("/{cv_id}/analyze", response_model=CVProfileResponse)
async def analyze_cv(
    cv_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(CV).where(CV.id == cv_id, CV.user_id == user.id))
    cv = result.scalar_one_or_none()
    if not cv:
        raise HTTPException(status_code=404, detail="CV not found")

    try:
        cv.status = "processing"
        await db.flush()
        content = await download_from_storage(cv.storage_path)
        analysis = await run_cv_analysis(content, cv.mime_type, cv.file_name)
        profile_data = analysis.get("parsed_profile", {})

        existing = await db.execute(select(CVProfile).where(CVProfile.cv_id == cv.id))
        profile = existing.scalar_one_or_none()
        if not profile:
            profile = CVProfile(cv_id=cv.id)
            db.add(profile)

        profile.skills = profile_data.get("skills", [])
        profile.education = profile_data.get("education", [])
        profile.certifications = profile_data.get("certifications", [])
        profile.experience = profile_data.get("experience", [])
        profile.keywords = profile_data.get("keywords", [])
        ai_summary = profile_data.get("ai_summary", {}) or {}
        if profile_data.get("primary_domains"):
            ai_summary["primary_domains"] = profile_data["primary_domains"]
        profile.ai_summary = ai_summary
        profile.analyzed_at = datetime.now(timezone.utc)
        cv.status = "analyzed"
        await db.flush()
        return profile
    except Exception as exc:
        cv.status = "uploaded"
        await db.flush()
        raise HTTPException(status_code=500, detail=f"CV analysis failed: {exc}") from exc


@router.get("/{cv_id}/profile", response_model=CVProfileResponse)
async def get_profile(
    cv_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(CVProfile)
        .join(CV)
        .where(CV.id == cv_id, CV.user_id == user.id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


@router.delete("/{cv_id}")
async def delete_cv(
    cv_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(CV).where(CV.id == cv_id, CV.user_id == user.id))
    cv = result.scalar_one_or_none()
    if not cv:
        raise HTTPException(status_code=404, detail="CV not found")

    await _delete_cv_record(cv, db)
    await db.flush()
    return {"deleted": True}
