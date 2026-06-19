import logging

from sqlalchemy import delete, or_, select

from app.database import AsyncSessionLocal
from app.models import JobListing
from app.services.job_quality import FAKE_URL_MARKERS, normalize_topjobs_apply_url
from app.workers.scheduler import run_all_scrapers

logger = logging.getLogger(__name__)


def _fake_url_clause():
    return or_(*[JobListing.apply_url.like(f"%{marker}%") for marker in FAKE_URL_MARKERS])


async def purge_fake_jobs() -> int:
    async with AsyncSessionLocal() as db:
        result = await db.execute(delete(JobListing).where(_fake_url_clause()))
        await db.commit()
        return result.rowcount or 0


async def purge_demo_jobs() -> int:
    return await purge_fake_jobs()


async def fix_topjobs_apply_urls() -> int:
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(JobListing).where(
                JobListing.source == "topjobs",
                JobListing.apply_url.like("%/applicant/employer/JobAdvertismentServlet%"),
            )
        )
        updated = 0
        for job in result.scalars():
            fixed = normalize_topjobs_apply_url(job.apply_url)
            if fixed and fixed != job.apply_url:
                job.apply_url = fixed
                updated += 1
        await db.commit()
        return updated


async def refresh_all_jobs() -> dict:
    removed = await purge_fake_jobs()
    fixed = await fix_topjobs_apply_urls()
    await run_all_scrapers()
    fixed_after = await fix_topjobs_apply_urls()
    logger.info("Purged %d fake jobs, fixed %d TopJobs URLs, scrapers finished", removed, fixed + fixed_after)
    return {"removed_demo_jobs": removed, "fixed_apply_urls": fixed + fixed_after, "status": "completed"}
