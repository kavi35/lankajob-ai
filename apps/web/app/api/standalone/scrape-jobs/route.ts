import { NextResponse } from "next/server";
import { isValidApplyUrl } from "@/lib/api-client";
import { filterJobsForProfile, scrapeTopJobs } from "@/lib/standalone/scrape-jobs";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { terms?: string[] };
    const terms = body.terms || [];

    let jobs = await scrapeTopJobs(80);
    jobs = filterJobsForProfile(jobs, terms);

    // Only return jobs with real TopJobs apply links (not index.jsp)
    jobs = jobs.filter((j) => isValidApplyUrl(j.apply_url));

    const seen = new Set<string>();
    jobs = jobs.filter((j) => {
      const key = j.apply_url;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return NextResponse.json({ jobs, count: jobs.length });
  } catch (err) {
    console.error("scrape-jobs error:", err);
    return NextResponse.json({ jobs: [], count: 0 });
  }
}
