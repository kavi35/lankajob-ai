import asyncio
import re

import httpx
from bs4 import BeautifulSoup

JC = "0001514929"


async def main() -> None:
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
    }
    async with httpx.AsyncClient(timeout=45, follow_redirects=True, verify=False, headers=headers) as client:
        index = await client.get("https://www.topjobs.lk/index.jsp")
        text = index.text

        matches = re.findall(r"JobAdvertismentServlet\?([^\"'\)]+)", text)
        real = [m for m in matches if "DEFZZZ" not in m]
        print("non-DEFZZZ servlet params:", len(real))
        for m in real[:5]:
            print(" ", m[:120])

        idx = text.find(JC)
        if idx >= 0:
            print("\ncontext around jc:")
            print(text[idx - 250 : idx + 250])

        urls = [
            f"https://www.topjobs.lk/applicant/jobview.jsp?jc={JC}",
            f"https://www.topjobs.lk/applicant/s/jobview.jsp?jc={JC}",
            f"https://www.topjobs.lk/applicant/vacancy/jobview.jsp?jc={JC}",
            f"https://www.topjobs.lk/applicant/employer/JobAdvertismentServlet?jc={JC}",
        ]
        for url in urls:
            resp = await client.get(url)
            print("\nURL:", url)
            print(" final:", resp.url)
            print(" status:", resp.status_code, "len:", len(resp.text))
            if "ACTED" in resp.text:
                print("  contains ACTED")
            servlet_links = re.findall(r"JobAdvertismentServlet\?[^\"'\s<>]+", resp.text)
            print("  servlet links:", servlet_links[:5])

        soup = BeautifulSoup(index.text, "lxml")
        for anchor in soup.find_all("a", href=True):
            if JC in anchor["href"] or JC in anchor.get_text():
                print("\nanchor href:", anchor["href"][:200])
                print("anchor text:", anchor.get_text(" ", strip=True)[:100])


if __name__ == "__main__":
    asyncio.run(main())
