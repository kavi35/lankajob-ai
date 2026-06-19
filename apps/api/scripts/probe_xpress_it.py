import asyncio
import re

import httpx
from bs4 import BeautifulSoup

HEADERS = {"User-Agent": "Mozilla/5.0 Chrome/120.0.0.0"}


async def main():
    url = "https://xpress.jobs/jobs/sector/it"
    async with httpx.AsyncClient(timeout=60, follow_redirects=True, verify=False) as c:
        r = await c.get(url, headers=HEADERS)
        print("status", r.status_code, len(r.text))
        soup = BeautifulSoup(r.text, "lxml")
        for a in soup.find_all("a", href=True):
            h = a["href"]
            if "view" in h or "/jobs/" in h:
                t = a.get_text(" ", strip=True)
                if t and len(t) > 5:
                    print(t[:60], h[:80])
        for m in re.finditer(r"/jobs/view/\d+", r.text):
            print("id", m.group())


asyncio.run(main())
