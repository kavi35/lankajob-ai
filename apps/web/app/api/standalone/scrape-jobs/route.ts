import { NextResponse } from "next/server";
import { SAMPLE_JOBS } from "@/lib/standalone/sample-jobs";
import { filterJobsForProfile, scrapeTopJobs } from "@/lib/standalone/scrape-jobs";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { terms?: string[] };
    const terms = body.terms || [];

    let jobs = await scrapeTopJobs(60);
    if (jobs.length < 5) {
      jobs = [...jobs, ...SAMPLE_JOBS];
    }
    jobs = filterJobsForProfile(jobs, terms);

    // Deduplicate by title+company
    const seen = new Set<string>();
    jobs = jobs.filter((j) => {
      const key = `${j.title}|${j.company}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return NextResponse.json({ jobs, count: jobs.length });
  } catch (err) {
    console.error("scrape-jobs error:", err);
    return NextResponse.json({ jobs: SAMPLE_JOBS, count: SAMPLE_JOBS.length });
  }
}
