import asyncio
import re

import httpx
from bs4 import BeautifulSoup

HEADERS = {"User-Agent": "Mozilla/5.0 Chrome/120.0.0.0"}


async def main():
    async with httpx.AsyncClient(timeout=60, follow_redirects=True, verify=False) as c:
        r = await c.get(
            "https://www.topjobs.lk/applicant/vacancybyfunctionalarea.jsp?FA=SDQ&jst=OPEN",
            headers=HEADERS,
        )
        soup = BeautifulSoup(r.text, "lxml")
        for iframe in soup.select("iframe"):
            print("iframe", iframe.get("src", "")[:150])
        for a in soup.find_all("a", href=True):
            h = a["href"]
            if "vbfa" in h.lower() or "tiled" in h.lower() or "Vacancy" in h:
                print("a", a.get_text(" ", strip=True)[:60], "|", h[:120])

        # Try tiled VBFA direct URL patterns
        candidates = [
            "https://www.topjobs.lk/applicant/vacancybyfunctionalarea/tiledvbfa.jsp?FA=SDQ&jst=OPEN",
            "https://www.topjobs.lk/applicant/tiledvbfa.jsp?FA=SDQ&jst=OPEN",
            "https://www.topjobs.lk/applicant/vacancybrowse.jsp?FA=SDQ",
        ]
        for url in candidates:
            try:
                rr = await c.get(url, headers=HEADERS)
                print("try", url, rr.status_code, len(rr.text))
                for m in re.finditer(r"href=['\"]([^'\"]*[Vv]ac[^'\"]*)['\"]", rr.text):
                    print(" href", m.group(1)[:100])
                    break
            except Exception as e:
                print("try", url, e)


asyncio.run(main())
