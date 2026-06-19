import asyncio
import logging

from sqlalchemy import select

from app.database import AsyncSessionLocal, Base, engine
from app.models import JobListing
from app.workers.scrapers.career_pages import scrape_career_pages
from app.workers.scrapers.linkedin_ingest import scrape_linkedin_jobs
from app.workers.scrapers.topjobs import scrape_topjobs
from app.workers.scrapers.xpressjobs import scrape_xpressjobs

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def upsert_jobs(jobs: list[dict]):
    if not jobs:
        return
    allowed = {
        "source", "external_id", "title", "company", "location", "salary_text",
        "required_skills", "preferred_skills", "description", "apply_url", "posted_at",
    }
    async with AsyncSessionLocal() as db:
        for job in jobs:
            clean = {k: v for k, v in job.items() if k in allowed}
            result = await db.execute(
                select(JobListing).where(
                    JobListing.source == clean["source"],
                    JobListing.external_id == clean["external_id"],
                )
            )
            existing = result.scalar_one_or_none()
            if existing:
                for key, value in clean.items():
                    if key not in ("source", "external_id"):
                        setattr(existing, key, value)
            else:
                db.add(JobListing(**clean))
        await db.commit()
    logger.info("Upserted %d jobs", len(jobs))


async def run_all_scrapers():
    logger.info("Starting job scrapers (real listings)...")
    topjobs = await scrape_topjobs(limit=100)
    xpress = await scrape_xpressjobs()
    linkedin = await scrape_linkedin_jobs(limit=15)
    careers = await scrape_career_pages(limit=20)
    all_jobs = topjobs + xpress + linkedin + careers
    if not all_jobs:
        logger.warning("No real jobs scraped — check network/SSL access to TopJobs.lk")
    await upsert_jobs(all_jobs)
    logger.info("Scraping complete. Total: %d real jobs", len(all_jobs))


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


def main():
    from apscheduler.schedulers.blocking import BlockingScheduler

    asyncio.run(init_db())
    asyncio.run(run_all_scrapers())

    scheduler = BlockingScheduler()
    scheduler.add_job(lambda: asyncio.run(run_all_scrapers()), "interval", hours=4, id="scrape_jobs")
    logger.info("Worker scheduler started (4h interval)")
    scheduler.start()


if __name__ == "__main__":
    main()
