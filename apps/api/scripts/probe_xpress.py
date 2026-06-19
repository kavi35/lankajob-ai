import asyncio
import re

import httpx
from bs4 import BeautifulSoup

HEADERS = {"User-Agent": "Mozilla/5.0 Chrome/120.0.0.0"}


async def main():
    async with httpx.AsyncClient(timeout=30, follow_redirects=True, verify=False) as c:
        r = await c.get("https://www.xpressjobs.lk/static/js/main.dcd1d7b1.js", headers=HEADERS)
        t = r.text
        urls = set(re.findall(r"https://[a-zA-Z0-9._/-]+", t))
        for u in sorted(urls):
            if "xpress" in u.lower() and ("api" in u.lower() or "backend" in u.lower() or "prod" in u.lower()):
                print(u)
        # relative api paths
        for m in re.finditer(r'"/api/[^"]+"', t):
            print(m.group())
        for m in re.finditer(r"baseURL[:=][^,;]+", t):
            print(m.group()[:100])


asyncio.run(main())
