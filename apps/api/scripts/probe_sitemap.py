import asyncio
import re

import httpx

HEADERS = {"User-Agent": "Mozilla/5.0 Chrome/120.0.0.0"}


async def main():
    async with httpx.AsyncClient(timeout=60, follow_redirects=True, verify=False) as c:
        r = await c.get("https://xpress.jobs/sitemap.xml", headers=HEADERS)
        text = r.text
        urls = re.findall(r"<loc>(https://xpress\.jobs/jobs/view/\d+)</loc>", text)
        print("job urls", len(urls), urls[:5])
        if urls:
            jr = await c.get(urls[0], headers=HEADERS)
            print("sample job page", jr.status_code, len(jr.text))
            # title from html
            m = re.search(r"<title>([^<]+)</title>", jr.text, re.I)
            print("title tag", m.group(1) if m else "none")
            # og tags
            for prop in ["og:title", "og:description"]:
                m2 = re.search(rf'property="{prop}" content="([^"]+)"', jr.text)
                print(prop, m2.group(1)[:100] if m2 else "none")


asyncio.run(main())
