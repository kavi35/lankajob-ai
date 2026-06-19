import asyncio
import re

import httpx
from bs4 import BeautifulSoup

HEADERS = {"User-Agent": "Mozilla/5.0 Chrome/120.0.0.0"}


async def main():
    async with httpx.AsyncClient(timeout=60, follow_redirects=True, verify=False) as c:
        for url in [
            "https://www.topjobs.lk/applicant/recentjobs.jsp",
            "https://xpress.jobs/sitemap.xml",
            "https://xpress.jobs/robots.txt",
        ]:
            try:
                r = await c.get(url, headers=HEADERS)
                print(url, r.status_code, len(r.text))
                print(r.text[:400])
                print("---")
            except Exception as e:
                print(url, e)


asyncio.run(main())
