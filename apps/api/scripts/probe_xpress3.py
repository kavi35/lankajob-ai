import httpx

for url in [
    "https://xpress.jobs/jobs?page=1&limit=100",
    "https://xpress.jobs/api/jobs?page=1&limit=100",
    "https://www.xpressjobs.lk/jobs?page=1",
    "https://xpress.jobs/jobs/search?page=1",
]:
    try:
        r = httpx.get(url, verify=False, timeout=20, headers={"User-Agent": "Mozilla/5.0", "Accept": "application/json"})
        print(url, r.status_code, r.headers.get("content-type","")[:40], r.text[:150])
    except Exception as e:
        print(url, e)
