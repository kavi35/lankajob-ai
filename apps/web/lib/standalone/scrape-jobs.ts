/** TopJobs.lk scraper for Vercel serverless (no Python API). */

import type { JobListing } from "@/lib/api-client";

const TOPJOBS_ORIGIN = "https://www.topjobs.lk";
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml",
};

const FA_CODES = ["SDQ", "HNS", "ITT", "COM", "ACA", "SMM", "HAT", "BAF"];

function normalizeApplyUrl(url: string): string {
  return url.replace(
    `${TOPJOBS_ORIGIN}/applicant/employer/JobAdvertismentServlet`,
    `${TOPJOBS_ORIGIN}/employer/JobAdvertismentServlet`
  );
}

function parseHref(href: string): string | null {
  const popup = href.match(/openSizeWindow\('([^']+)'/i);
  const path = popup?.[1] ?? href.match(/(employer\/JobAdvertismentServlet\?[^"'\s<>]+)/i)?.[1];
  if (!path) return null;
  if (path.startsWith("http")) return normalizeApplyUrl(path);
  return normalizeApplyUrl(`${TOPJOBS_ORIGIN}/${path.replace(/^\//, "")}`);
}

function splitTitleCompany(raw: string): { title: string; company: string } {
  const text = raw.replace(/\s+/g, " ").trim();
  const match = text.match(
    /(.+?)\s+([A-Z][\w\s&().'-]*(?:\(Pvt\)\s*Ltd\.?|Limited|PLC|Inc\.?)[.]?)$/i
  );
  if (match) return { title: match[1].trim().slice(0, 200), company: match[2].trim().slice(0, 200) };
  const words = text.split(" ");
  if (words.length > 5) {
    return {
      title: words.slice(0, -4).join(" ").slice(0, 200),
      company: words.slice(-4).join(" ").slice(0, 200),
    };
  }
  return { title: text.slice(0, 200), company: "See listing on TopJobs" };
}

function extractSkills(text: string): string[] {
  const common = [
    "Python", "Java", "JavaScript", "React", "SQL", "Excel", "Marketing",
    "Sales", "Accounting", "Communication", "Project Management", "HR",
    "Digital Marketing", "SEO", "Finance", "Customer Service", "Leadership",
  ];
  const lower = text.toLowerCase();
  return common.filter((s) => lower.includes(s.toLowerCase()));
}

function parseJobsFromHtml(html: string, sourceLabel: string): JobListing[] {
  const jobs: JobListing[] = [];
  const seen = new Set<string>();
  const linkRe =
    /<a[^>]+href=["']([^"']*(?:JobAdvertismentServlet|openSizeWindow)[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;

  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(html)) !== null) {
    const applyUrl = parseHref(m[1]);
    if (!applyUrl || seen.has(applyUrl)) continue;
    seen.add(applyUrl);

    const rawText = m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (rawText.length < 8) continue;

    const { title, company } = splitTitleCompany(rawText);
    const description = `${title} at ${company}. View full details on TopJobs.lk.`;
    jobs.push({
      id: crypto.randomUUID(),
      source: sourceLabel,
      title,
      company,
      location: "Sri Lanka",
      salary_text: null,
      required_skills: extractSkills(description + " " + title),
      preferred_skills: [],
      description,
      apply_url: applyUrl,
      posted_at: new Date().toISOString(),
    });
  }
  return jobs;
}

export async function scrapeTopJobs(limit = 80): Promise<JobListing[]> {
  const all: JobListing[] = [];
  const seen = new Set<string>();

  const urls = [
    `${TOPJOBS_ORIGIN}/index.jsp`,
    ...FA_CODES.map((fa) => `${TOPJOBS_ORIGIN}/applicant/vacancybyfunctionalarea.jsp?fa=${fa}`),
  ];

  for (const url of urls) {
    if (all.length >= limit) break;
    try {
      const res = await fetch(url, { headers: HEADERS, next: { revalidate: 3600 } });
      if (!res.ok) continue;
      const html = await res.text();
      for (const job of parseJobsFromHtml(html, "topjobs")) {
        if (seen.has(job.apply_url)) continue;
        seen.add(job.apply_url);
        all.push(job);
        if (all.length >= limit) break;
      }
    } catch {
      /* skip failed page */
    }
  }

  return all;
}

export function filterJobsForProfile(
  jobs: JobListing[],
  terms: string[]
): JobListing[] {
  if (!terms.length) return jobs;
  const scored = jobs.map((job) => {
    const blob = `${job.title} ${job.description} ${job.company}`.toLowerCase();
    const hits = terms.filter((t) => blob.includes(t.toLowerCase())).length;
    return { job, hits };
  });
  scored.sort((a, b) => b.hits - a.hits);
  const withHits = scored.filter((s) => s.hits > 0).map((s) => s.job);
  return withHits.length >= 5 ? withHits : jobs;
}
