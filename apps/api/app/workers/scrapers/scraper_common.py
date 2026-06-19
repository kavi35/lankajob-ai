import re
from typing import Any

import httpx

BROWSER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

# TopJobs functional areas — IT, engineering, finance, etc.
TOPJOBS_FA_CODES = [
    "SDQ",  # IT Software
    "HNS",  # IT Hardware/Networks
    "ITT",  # IT Telecom
    "COM",  # Corporate Management
    "ACA",  # Accounting/Finance
    "SMM",  # Sales/Marketing
    "HAT",  # HR/Training
    "BAF",  # Banking
]

TOPJOBS_ORIGIN = "https://www.topjobs.lk"
TOPJOBS_BASE = f"{TOPJOBS_ORIGIN}/applicant"
TOPJOBS_INDEX = f"{TOPJOBS_ORIGIN}/index.jsp"
JOB_SERVLET_PATH = "employer/JobAdvertismentServlet"

TECH_KEYWORDS = (
    "software", "developer", "programmer", "engineer", "devops", "data",
    "python", "java", "javascript", "typescript", "react", "node", ".net",
    "full stack", "network", "systems", " cloud", "analyst", "qa ", "test",
    "mobile", "android", "ios", "sql", "backend", "frontend", "it officer",
)

COMPANY_PATTERN = re.compile(
    r"(?P<company>[A-Z][\w\s&().'-]*(?:"
    r"\(Pvt\)\s*Ltd\.?|\(Private\)\s*Limited|PLC|Limited|Inc\.?|"
    r"Corporation\s*\(Pvt\)\s*Ltd\.?|Group of Companies|Lanka \(Pvt\) Ltd"
    r"))$",
    re.IGNORECASE,
)


def create_http_client() -> httpx.AsyncClient:
    """HTTP client for Sri Lankan job boards (some have SSL chain issues on Windows)."""
    return httpx.AsyncClient(
        timeout=45,
        follow_redirects=True,
        verify=False,
        headers=BROWSER_HEADERS,
    )


def extract_skills_from_text(text: str) -> list[str]:
    common = [
        "Python", "Java", "JavaScript", "TypeScript", "React", "Angular", "Node.js",
        "SQL", "AWS", "Azure", "Docker", "Kubernetes", "Git", "Agile", "Scrum",
        "Excel", "SAP", "Accounting", "Marketing", "Sales", "Communication",
        ".NET", "C#", "PHP", "Laravel", "DevOps", "CI/CD", "Machine Learning",
        "Data Analysis", "Power BI", "Project Management", "Spring", "Linux",
    ]
    lower = text.lower()
    return [s for s in common if s.lower() in lower]


def split_title_company(raw: str) -> tuple[str, str]:
    text = re.sub(r"\s+", " ", raw.strip())
    match = COMPANY_PATTERN.search(text)
    if match:
        company = match.group("company").strip()
        title = text[: match.start()].strip()
        if title:
            return title[:200], company[:200]
    words = text.split()
    if len(words) > 5:
        return " ".join(words[:-4])[:200], " ".join(words[-4:])[:200]
    return text[:200], "See listing on TopJobs"


def normalize_topjobs_apply_url(url: str) -> str:
    """TopJobs index links open from site root (/employer/...), not /applicant/employer/."""
    return url.replace(
        f"{TOPJOBS_ORIGIN}/applicant/employer/JobAdvertismentServlet",
        f"{TOPJOBS_ORIGIN}/employer/JobAdvertismentServlet",
    )


def parse_job_servlet_href(href: str) -> str | None:
    match = re.search(r"openSizeWindow\('([^']+)'", href, re.I)
    if match:
        path = match.group(1)
    else:
        servlet_match = re.search(r"(employer/JobAdvertismentServlet\?[^\"'\s<>]+)", href, re.I)
        if not servlet_match:
            return None
        path = servlet_match.group(1)

    if path.startswith("http"):
        return normalize_topjobs_apply_url(path)
    return normalize_topjobs_apply_url(f"{TOPJOBS_ORIGIN}/{path.lstrip('/')}")


def extract_job_id(url: str) -> str:
    match = re.search(r"jc=(\d+)", url)
    return match.group(1) if match else re.sub(r"[^a-z0-9]+", "-", url.lower())[:80]


async def fetch_topjobs_detail(client: httpx.AsyncClient, apply_url: str) -> dict[str, Any]:
    try:
        resp = await client.get(apply_url)
        resp.raise_for_status()
        text = re.sub(r"\s+", " ", resp.text)
        company = ""
        location = "Sri Lanka"
        salary_text = None

        company_match = re.search(
            r"(?:VACVIEW|topjobs)[^A-Z]*([A-Z][\w\s&().'-]{3,80}(?:\(Pvt\)\s*Ltd\.?|PLC|Limited))",
            text,
            re.I,
        )
        if company_match:
            company = company_match.group(1).strip()

        loc_match = re.search(r"([A-Za-z\s]+,\s*Sri Lanka)", text)
        if loc_match:
            location = loc_match.group(1).strip()

        desc_match = re.search(r"(Closing Date:[^<]{0,40}).{0,200}(Full Time|Part Time)?(.{200,2000})", text)
        description = desc_match.group(0) if desc_match else text[:1500]

        # Strip HTML tags crudely
        description = re.sub(r"<[^>]+>", " ", description)
        description = re.sub(r"\s+", " ", description).strip()[:3000]

        return {
            "company": company,
            "location": location,
            "salary_text": salary_text,
            "description": description,
        }
    except Exception:
        return {}


def _tech_priority(job: dict[str, Any]) -> int:
    blob = f"{job['title']} {job['company']} {job['description']}".lower()
    return sum(1 for keyword in TECH_KEYWORDS if keyword in blob)


def _parse_topjobs_anchors(soup, seen_ids: set[str]) -> list[dict[str, Any]]:
    jobs: list[dict[str, Any]] = []
    for anchor in soup.find_all("a", href=True):
        href = anchor["href"]
        if JOB_SERVLET_PATH not in href and "JobAdvertismentServlet" not in href:
            continue

        apply_url = parse_job_servlet_href(href)
        if not apply_url:
            continue

        external_id = extract_job_id(apply_url)
        if external_id in seen_ids:
            continue
        seen_ids.add(external_id)

        raw_text = anchor.get_text(" ", strip=True)
        if len(raw_text) < 10:
            continue

        title, company = split_title_company(raw_text)
        jobs.append(
            {
                "source": "topjobs",
                "external_id": external_id,
                "title": title,
                "company": company,
                "location": "Sri Lanka",
                "salary_text": None,
                "required_skills": extract_skills_from_text(f"{title} {raw_text}"),
                "preferred_skills": [],
                "description": raw_text,
                "apply_url": apply_url,
                "_needs_detail": True,
            }
        )
    return jobs


async def scrape_topjobs_from_index(
    client: httpx.AsyncClient,
    limit: int,
    seen_ids: set[str],
) -> list[dict[str, Any]]:
    jobs: list[dict[str, Any]] = []
    try:
        resp = await client.get(TOPJOBS_INDEX)
        resp.raise_for_status()
    except Exception:
        return jobs

    from bs4 import BeautifulSoup

    soup = BeautifulSoup(resp.text, "lxml")
    jobs = _parse_topjobs_anchors(soup, seen_ids)
    return jobs[:limit]


async def enrich_topjobs_jobs(client: httpx.AsyncClient, jobs: list[dict[str, Any]]) -> None:
    for job in jobs:
        if not job.pop("_needs_detail", False):
            continue
        detail = await fetch_topjobs_detail(client, job["apply_url"])
        if detail.get("company"):
            job["company"] = detail["company"]
        if detail.get("location"):
            job["location"] = detail["location"]
        if detail.get("description"):
            job["description"] = detail["description"]
        job["required_skills"] = extract_skills_from_text(
            f"{job['title']} {job['company']} {job['description']}"
        )

async def scrape_topjobs(limit: int = 60) -> list[dict[str, Any]]:
    seen_ids: set[str] = set()

    async with create_http_client() as client:
        await client.get(f"{TOPJOBS_BASE}/s/jobsearch.jsp")
        all_jobs = await scrape_topjobs_from_index(client, limit, seen_ids)
        await enrich_topjobs_jobs(client, all_jobs[: min(15, len(all_jobs))])

    return all_jobs
