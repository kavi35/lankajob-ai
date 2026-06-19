"""Detect placeholder / demo job listings vs real apply URLs."""

FAKE_URL_MARKERS = (
    "example.com",
    "linkedin.com/jobs/search",
    "jobs/search/?location=",
)


def normalize_topjobs_apply_url(apply_url: str | None) -> str | None:
    if not apply_url:
        return apply_url
    return apply_url.replace(
        "https://www.topjobs.lk/applicant/employer/JobAdvertismentServlet",
        "https://www.topjobs.lk/employer/JobAdvertismentServlet",
    )


def is_real_job_url(apply_url: str | None) -> bool:
    if not apply_url or not apply_url.startswith("http"):
        return False
    lower = apply_url.lower()
    if any(marker in lower for marker in FAKE_URL_MARKERS):
        return False
    if lower.rstrip("/") in {"https://www.topjobs.lk/index.jsp", "https://www.topjobs.lk"}:
        return False
    return True
