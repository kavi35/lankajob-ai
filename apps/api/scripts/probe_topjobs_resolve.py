import asyncio
import re

import httpx


async def main() -> None:
    headers = {"User-Agent": "Mozilla/5.0 Chrome/120"}
    async with httpx.AsyncClient(timeout=45, verify=False, headers=headers) as client:
        text = (await client.get("https://www.topjobs.lk/index.jsp")).text
        params = re.findall(r"JobAdvertismentServlet\?([^\"'\)]+)", text)
        defzzz = [p for p in params if "DEFZZZ" in p]
        real = [p for p in params if "DEFZZZ" not in p]
        print("total links", len(params))
        print("DEFZZZ", len(defzzz))
        print("real ac/ec", len(real))

        jc = "0001514929"
        for endpoint in [
            f"https://www.topjobs.lk/applicant/employer/JobAdvertismentServlet?jc={jc}&ac=DEFZZZ&ec=DEFZZZ",
            f"https://www.topjobs.lk/applicant/employer/getJobAdvertisement?jc={jc}",
            f"https://www.topjobs.lk/applicant/employer/jobadvertisement?jc={jc}",
            f"https://www.topjobs.lk/applicant/employer/JobAdvertismentServlet?action=view&jc={jc}",
        ]:
            resp = await client.get(endpoint, follow_redirects=False)
            print("\n", endpoint.split("/")[-1][:60])
            print(" status", resp.status_code, "loc", resp.headers.get("location", "")[:80])
            if resp.status_code == 200 and len(resp.text) < 500:
                print(" body", resp.text[:200])

        # Try resolve via search page
        search = await client.get(
            "https://www.topjobs.lk/applicant/s/jobsearch.jsp",
            params={"keyword": "ACTED", "search": "Search"},
        )
        print("\nsearch len", len(search.text), "final", search.url)
        if jc in search.text:
            idx = search.text.find(jc)
            print("search context", search.text[idx - 120 : idx + 120])

        # Try vacancy search servlet
        resp = await client.post(
            "https://www.topjobs.lk/applicant/vacancybyfunctionalarea/vacancysearch.jsp",
            data={"keyword": "ACTED"},
            follow_redirects=True,
        )
        print("\nvacancysearch", resp.status_code, len(resp.text))
        found = re.findall(rf"JobAdvertismentServlet\?[^\"'\)<>]*{jc}[^\"'\)<>]*", resp.text)
        print("found for jc", found[:3])


if __name__ == "__main__":
    asyncio.run(main())
