import asyncio
import re

import httpx

HEADERS = {"User-Agent": "Mozilla/5.0 Chrome/120.0.0.0"}


async def main():
    async with httpx.AsyncClient(timeout=60, follow_redirects=True, verify=False) as c:
        r = await c.get("https://xpress.jobs/sitemap.xml", headers=HEADERS)
        text = r.text.encode("utf-8", errors="ignore").decode("utf-8")
        locs = re.findall(r"<loc>([^<]+)</loc>", text)
        print("total locs", len(locs))
        job_locs = [u for u in locs if "job" in u.lower()]
        print("job locs sample", job_locs[:15])
        # nested sitemaps
        sitemaps = [u for u in locs if u.endswith(".xml")]
        print("nested sitemaps", sitemaps[:10])


asyncio.run(main())
