import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, engine
from app.routers import cover_letters, cv, jobs, matches, sessions, skills
from app.services.job_refresh import refresh_all_jobs


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async def refresh_in_background() -> None:
        try:
            await refresh_all_jobs()
        except Exception:
            pass

    # Never block API startup — job scraping can take 30+ seconds.
    asyncio.create_task(refresh_in_background())
    yield


app = FastAPI(title="LankaJob AI API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(cv.router)
app.include_router(sessions.router)
app.include_router(matches.router)
app.include_router(jobs.router)
app.include_router(cover_letters.router)
app.include_router(skills.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "lankajob-ai-api"}
