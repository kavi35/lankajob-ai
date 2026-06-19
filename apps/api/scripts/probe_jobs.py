import asyncio
import re

import httpx
from bs4 import BeautifulSoup

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
}


async def probe_topjobs():
    async with httpx.AsyncClient(timeout=30, follow_redirects=True, verify=False) as c:
        url = "https://www.topjobs.lk/applicant/vacancybyfunctionalarea.jsp?FA=SDQ"
        r = await c.get(url, headers=HEADERS)
        soup = BeautifulSoup(r.text, "lxml")
        print("topjobs IT", r.status_code, len(r.text))
        count = 0
        for a in soup.find_all("a", href=True):
            href = a["href"]
            title = a.get_text(" ", strip=True)
            if not title or len(title) < 10:
                continue
            if "vacancy" in href.lower() or "jobdetail" in href.lower() or "JobDetail" in href:
                print(" ", title[:70], "|", href[:90])
                count += 1
                if count >= 15:
                    break
        # iframe or jobdetail pattern
        for m in re.finditer(r"jobdetail[^\"']+", r.text, re.I):
            print("regex", m.group()[:80])
            break


async def probe_xpress():
    async with httpx.AsyncClient(timeout=30, follow_redirects=True, verify=False) as c:
        r = await c.get("https://www.xpressjobs.lk/", headers=HEADERS)
        # find api urls in bundle
        apis = set(re.findall(r"https?://[a-zA-Z0-9._/-]+api[a-zA-Z0-9._/-]*", r.text))
        print("xpress api hints", list(apis)[:10])
        scripts = re.findall(r'src="([^"]+\.js)"', r.text)
        print("scripts", scripts[:5])
        if scripts:
            js = await c.get(scripts[0] if scripts[0].startswith("http") else f"https://www.xpressjobs.lk{scripts[0]}", headers=HEADERS)
            urls = set(re.findall(r"https?://[a-zA-Z0-9._/-]+", js.text[:50000]))
            for u in sorted(urls):
                if "api" in u.lower() or "job" in u.lower():
                    print(" js url", u)


async def probe_google_jobs():
    # RSS or public feed alternatives
    async with httpx.AsyncClient(timeout=30, follow_redirects=True, verify=False) as c:
        q = "jobs+sri+lanka+site:topjobs.lk OR site:xpressjobs.lk"
        r = await c.get(
            "https://www.google.com/search",
            params={"q": "software engineer jobs site:topjobs.lk", "num": 10},
            headers=HEADERS,
        )
        print("google", r.status_code, len(r.text))


async def main():
    await probe_topjobs()
    await probe_xpress()


if __name__ == "__main__":
    asyncio.run(main())
