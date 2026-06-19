import asyncio
import re
from urllib.parse import urljoin

import httpx


async def main() -> None:
    headers = {
        "User-Agent": "Mozilla/5.0 Chrome/120",
        "Referer": "https://www.topjobs.lk/index.jsp",
    }
    async with httpx.AsyncClient(timeout=45, verify=False, headers=headers) as client:
        index = await client.get("https://www.topjobs.lk/index.jsp")
        scripts = re.findall(r'src="([^"]+)"', index.text)
        for src in scripts:
            if any(k in src.lower() for k in ("common", "util", "job", "main", "function")):
                url = urljoin("https://www.topjobs.lk/", src)
                js = await client.get(url)
                if "openSizeWindow" in js.text:
                    print("FOUND openSizeWindow in", url)
                    idx = js.text.find("openSizeWindow")
                    print(js.text[max(0, idx - 100) : idx + 600])
                    print("---")

        apply_url = (
            "https://www.topjobs.lk/applicant/employer/JobAdvertismentServlet"
            "?ac=DEFZZZ&ec=DEFZZZ&jc=0001514929&pg=index.jsp"
        )
        resp = await client.get(apply_url, follow_redirects=False)
        print("direct apply status", resp.status_code, "location", resp.headers.get("location"))
        print("cookies", client.cookies)

        # Try with popup-ish headers
        popup_headers = {
            **headers,
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "same-origin",
        }
        resp2 = await client.get(apply_url, headers=popup_headers, follow_redirects=False)
        print("popup headers status", resp2.status_code, "location", resp2.headers.get("location"))


if __name__ == "__main__":
    asyncio.run(main())
