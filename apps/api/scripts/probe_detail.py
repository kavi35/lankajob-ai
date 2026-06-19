import asyncio
import re

import httpx
from bs4 import BeautifulSoup

HEADERS = {"User-Agent": "Mozilla/5.0 Chrome/120.0.0.0"}


async def main():
    url = "https://www.topjobs.lk/applicant/vacancybyfunctionalarea/tiledvbfa.jsp?FA=SDQ&jst=OPEN"
    async with httpx.AsyncClient(timeout=60, follow_redirects=True, verify=False) as c:
        r = await c.get(url, headers=HEADERS)
        soup = BeautifulSoup(r.text, "lxml")
        for a in soup.find_all("a", href=True):
            h = a["href"]
            if "JobAdvertismentServlet" in h or "JobAdvertisementServlet" in h:
                m = re.search(r"openSizeWindow\('([^']+)'", h)
                if m:
                    path = m.group(1)
                    full = f"https://www.topjobs.lk/applicant/{path}" if not path.startswith("http") else path
                    print("URL", full[:120])
                    print("TEXT", a.get_text(" ", strip=True)[:100])
                    # fetch detail
                    dr = await c.get(full.replace("applicant/employer", "employer") if "applicant/employer" in full else full, headers=HEADERS)
                    if dr.status_code != 200:
                        dr = await c.get(f"https://www.topjobs.lk/{path.lstrip('/')}", headers=HEADERS)
                    print("detail", dr.status_code, len(dr.text))
                    ds = BeautifulSoup(dr.text, "lxml")
                    print("detail text", ds.get_text(" ", strip=True)[:300])
                    break


asyncio.run(main())
