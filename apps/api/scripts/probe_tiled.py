import asyncio
import re

import httpx
from bs4 import BeautifulSoup

HEADERS = {"User-Agent": "Mozilla/5.0 Chrome/120.0.0.0"}


async def main():
    url = "https://www.topjobs.lk/applicant/vacancybyfunctionalarea/tiledvbfa.jsp?FA=SDQ&jst=OPEN"
    async with httpx.AsyncClient(timeout=60, follow_redirects=True, verify=False) as c:
        r = await c.get(url, headers=HEADERS)
        text = r.text
        print("status", r.status_code, "len", len(text))
        soup = BeautifulSoup(text, "lxml")
        # Look for vacancy tile divs
        for sel in [".vacancy", ".job", "[class*=vac]", "[class*=Vac]", "table.vacancy", ".tile"]:
            els = soup.select(sel)
            if els:
                print("selector", sel, len(els))
        # All links with employer or company patterns
        jobs = []
        for a in soup.find_all("a", href=True):
            h = a["href"]
            t = a.get_text(" ", strip=True)
            if not t or len(t) < 8:
                continue
            if any(x in h.lower() for x in ["vacancy", "job", "detail", "view", "employer"]):
                if "functionalarea" not in h.lower() and "login" not in h.lower():
                    jobs.append((t, h))
        print("candidate links", len(jobs))
        for t, h in jobs[:25]:
            print(" ", t[:65], "|", h[:90])
        # Search raw text for Engineer titles near href
        for m in re.finditer(r"(Software|Engineer|Developer|Analyst)[^<]{0,80}", text, re.I):
            s = m.group()[:100]
            if "<" not in s:
                print("text", s)


asyncio.run(main())
