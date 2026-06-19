import asyncio
import re

import httpx
from bs4 import BeautifulSoup

HEADERS = {"User-Agent": "Mozilla/5.0 Chrome/120.0.0.0"}


async def main():
    async with httpx.AsyncClient(timeout=60, follow_redirects=True, verify=False) as c:
        r = await c.get("https://www.topjobs.lk/applicant/s/jobsearch.jsp", headers=HEADERS)
        text = r.text
        print("len", len(text))
        # Common topjobs patterns
        patterns = [
            r"viewVacancy\.jsp[^\"'\\s]*",
            r"VacancyDetail[^\"'\\s]*",
            r"vacancyId=\d+",
            r"JVAC=\d+",
            r"showVacancy[^\"'\\s]*",
        ]
        for p in patterns:
            ms = re.findall(p, text, re.I)
            print(p, len(ms), ms[:3] if ms else "")
        soup = BeautifulSoup(text, "lxml")
        # Look for job title patterns in spans/divs
        for a in soup.find_all("a", href=True):
            h = a["href"]
            t = a.get_text(" ", strip=True)
            if re.search(r"view|detail|vac|job", h, re.I) and len(t) > 15:
                if "topjobs" in h or h.startswith("/") or "applicant" in h:
                    print("LINK", t[:70], "|", h[:100])
        # limit output
        count = 0
        for a in soup.find_all("a", href=True):
            h = a["href"]
            t = a.get_text(" ", strip=True)
            if "viewVacancy" in h or "ViewVacancy" in h:
                print("VAC", t[:70], h[:100])
                count += 1
                if count >= 20:
                    break


asyncio.run(main())
