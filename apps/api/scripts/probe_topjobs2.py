import asyncio
import re

import httpx
from bs4 import BeautifulSoup

HEADERS = {"User-Agent": "Mozilla/5.0 Chrome/120.0.0.0"}


async def main():
    urls = [
        "https://www.topjobs.lk/applicant/browsejobs.jsp",
        "https://www.topjobs.lk/applicant/vacancybyfunctionalarea.jsp?FA=SDQ&jst=OPEN",
        "https://www.topjobs.lk/applicant/s/jobsearch.jsp",
        "https://www.topjobs.lk/applicant/JobSearch.jsp",
    ]
    async with httpx.AsyncClient(timeout=30, follow_redirects=True, verify=False) as c:
        for url in urls:
            try:
                r = await c.get(url, headers=HEADERS)
                print(url, r.status_code, len(r.text))
                if "job" in r.text.lower()[:5000]:
                    pass
                # onclick handlers
                for m in re.finditer(r"onclick\s*=\s*['\"]([^'\"]+)['\"]", r.text, re.I):
                    s = m.group(1)
                    if "vac" in s.lower() or "job" in s.lower():
                        print(" onclick", s[:100])
                        break
                soup = BeautifulSoup(r.text, "lxml")
                for iframe in soup.select("iframe"):
                    print(" iframe", iframe.get("src"))
            except Exception as e:
                print(url, e)


asyncio.run(main())
