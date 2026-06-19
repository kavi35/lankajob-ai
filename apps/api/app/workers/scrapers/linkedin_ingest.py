import re
from typing import Any

import httpx
from bs4 import BeautifulSoup

from app.config import settings
from app.workers.scrapers.scraper_common import create_http_client, extract_skills_from_text


async def scrape_linkedin_jobs(limit: int = 20) -> list[dict[str, Any]]:
    if settings.serpapi_key:
        return await _scrape_via_serpapi(limit)

    return await _scrape_linkedin_public_search(limit)


async def _scrape_via_serpapi(limit: int) -> list[dict[str, Any]]:
    jobs: list[dict[str, Any]] = []
    try:
        async with create_http_client() as client:
            resp = await client.get(
                "https://serpapi.com/search.json",
                params={
                    "engine": "google_jobs",
                    "q": "software engineer",
                    "location": "Sri Lanka",
                    "api_key": settings.serpapi_key,
                },
            )
            resp.raise_for_status()
            data = resp.json()
            for i, item in enumerate(data.get("jobs_results", [])[:limit]):
                apply = item.get("apply_options", [{}])[0].get("link", "")
                if not apply:
                    continue
                jobs.append(_normalize_job(item, apply, i))
    except Exception:
        return []
    return jobs


async def _scrape_linkedin_public_search(limit: int) -> list[dict[str, Any]]:
    """Find public LinkedIn job URLs via Google search (no API key required)."""
    jobs: list[dict[str, Any]] = []
    queries = [
        "site:linkedin.com/jobs/view Sri Lanka software engineer",
        "site:linkedin.com/jobs/view Colombo developer",
        "site:linkedin.com/jobs/view Sri Lanka analyst",
    ]
    seen: set[str] = set()

    async with create_http_client() as client:
        for query in queries:
            try:
                resp = await client.get(
                    "https://www.google.com/search",
                    params={"q": query, "num": 15},
                )
                if resp.status_code != 200:
                    continue
                urls = re.findall(
                    r"https://(?:[a-z]{2,3}\.)?linkedin\.com/jobs/view/[a-zA-Z0-9_-]+",
                    resp.text,
                )
                for url in urls:
                    url = url.split("&")[0].split("?")[0]
                    if url in seen:
                        continue
                    seen.add(url)
                    job = await _fetch_linkedin_job_page(client, url)
                    if job:
                        jobs.append(job)
                    if len(jobs) >= limit:
                        return jobs
            except Exception:
                continue
    return jobs


async def _fetch_linkedin_job_page(client: httpx.AsyncClient, url: str) -> dict[str, Any] | None:
    try:
        resp = await client.get(url)
        if resp.status_code != 200:
            return None
        soup = BeautifulSoup(resp.text, "lxml")
        title = soup.find("title")
        title_text = title.get_text(strip=True) if title else "Job Opening"
        title_text = title_text.replace("| LinkedIn", "").strip()

        og_desc = soup.find("meta", property="og:description")
        description = og_desc["content"] if og_desc and og_desc.get("content") else title_text

        company = "See LinkedIn listing"
        for meta in soup.find_all("meta"):
            if meta.get("property") == "og:title" and meta.get("content"):
                parts = meta["content"].split(" hiring ")
                if len(parts) > 1:
                    company = parts[0].strip()

        external_id = url.rstrip("/").split("/")[-1]
        return {
            "source": "linkedin",
            "external_id": external_id,
            "title": title_text[:200],
            "company": company[:200],
            "location": "Sri Lanka",
            "salary_text": None,
            "required_skills": extract_skills_from_text(f"{title_text} {description}"),
            "preferred_skills": [],
            "description": description[:3000],
            "apply_url": url,
        }
    except Exception:
        return None


def _normalize_job(item: dict, apply_url: str, index: int) -> dict[str, Any]:
    title = item.get("title", "Job Opening")
    return {
        "source": "linkedin",
        "external_id": f"serp-{index}-{title[:30].lower().replace(' ', '-')}",
        "title": title,
        "company": item.get("company_name", "Company"),
        "location": item.get("location", "Sri Lanka"),
        "salary_text": None,
        "required_skills": extract_skills_from_text(f"{title} {item.get('description', '')}"),
        "preferred_skills": [],
        "description": item.get("description", title),
        "apply_url": apply_url,
    }
