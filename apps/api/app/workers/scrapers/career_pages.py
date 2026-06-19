import re
from typing import Any

from bs4 import BeautifulSoup

from app.workers.scrapers.scraper_common import create_http_client, extract_skills_from_text

CAREER_PAGES = [
    {"company": "Virtusa", "url": "https://www.virtusa.com/careers", "source": "virtusa"},
    {"company": "WSO2", "url": "https://wso2.com/careers/", "source": "wso2"},
    {"company": "IFS", "url": "https://www.ifs.com/about/careers", "source": "ifs"},
    {"company": "99X", "url": "https://99x.io/careers", "source": "99x"},
    {"company": "Sysco LABS", "url": "https://syscolabs.co/careers/", "source": "syscolabs"},
]


async def scrape_career_pages(limit: int = 20) -> list[dict[str, Any]]:
    jobs: list[dict[str, Any]] = []
    seen: set[str] = set()

    async with create_http_client() as client:
        for page in CAREER_PAGES:
            try:
                resp = await client.get(page["url"])
                if resp.status_code != 200:
                    continue
                soup = BeautifulSoup(resp.text, "lxml")
                for anchor in soup.find_all("a", href=True):
                    href = anchor["href"]
                    text = anchor.get_text(" ", strip=True)
                    if not text or len(text) < 8:
                        continue
                    if not any(k in text.lower() for k in [
                        "engineer", "developer", "analyst", "manager",
                        "consultant", "designer", "intern", "lead", "architect",
                    ]):
                        continue
                    if href.startswith("/"):
                        from urllib.parse import urljoin
                        href = urljoin(page["url"], href)
                    if not href.startswith("http"):
                        continue
                    key = f"{page['source']}-{text[:60]}"
                    if key in seen:
                        continue
                    seen.add(key)
                    jobs.append(
                        {
                            "source": "career_page",
                            "external_id": re.sub(r"[^a-z0-9]+", "-", key.lower())[:80],
                            "title": text[:200],
                            "company": page["company"],
                            "location": "Sri Lanka",
                            "salary_text": None,
                            "required_skills": extract_skills_from_text(text),
                            "preferred_skills": [],
                            "description": f"{text} at {page['company']}. Apply via official career page.",
                            "apply_url": href,
                        }
                    )
                    if len(jobs) >= limit:
                        return jobs
            except Exception:
                continue
    return jobs[:limit]
