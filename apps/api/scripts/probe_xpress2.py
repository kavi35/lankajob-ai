import re
import httpx

r = httpx.get(
    "https://www.xpressjobs.lk/static/js/main.dcd1d7b1.js",
    verify=False,
    timeout=30,
    headers={"User-Agent": "Mozilla/5.0"},
)
t = r.text
for pat in [r"baseURL:\"([^\"]+)\"", r"baseURL:'([^']+)'", r"REACT_APP_[A-Z_]+:\"([^\"]+)\""]:
    for m in re.finditer(pat, t):
        print("match", m.group()[:150])
for m in re.finditer(r"/v\d+/[a-zA-Z/_-]+", t):
    s = m.group()
    if "job" in s.lower() or "vac" in s.lower():
        print("path", s)
