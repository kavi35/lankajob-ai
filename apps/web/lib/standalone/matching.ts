import type { JobListing, JobMatch } from "@/lib/api-client";
import { profileSearchTerms } from "./cv-extract";

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function skillOverlap(
  candidateSkills: string[],
  jobSkills: string[]
): { score: number; matched: string[]; missing: string[] } {
  if (!jobSkills.length) {
    return { score: 0.75, matched: candidateSkills.slice(0, 5), missing: [] };
  }
  const matched: string[] = [];
  const missing: string[] = [];
  for (const js of jobSkills) {
    const njs = norm(js);
    const hit = candidateSkills.find(
      (cs) => norm(cs).includes(njs) || njs.includes(norm(cs))
    );
    if (hit) matched.push(hit);
    else missing.push(js);
  }
  return {
    score: matched.length / Math.max(jobSkills.length, 1),
    matched: [...new Set(matched)],
    missing,
  };
}

export function calculateMatchScore(
  profile: {
    skills: string[];
    education: Record<string, string>[];
    certifications: string[];
    experience: Record<string, string | number>[];
    keywords: string[];
    ai_summary?: Record<string, unknown>;
  },
  job: JobListing
) {
  const allJobSkills = [
    ...new Set([...(job.required_skills || []), ...(job.preferred_skills || [])]),
  ];
  const desc = job.description || "";
  const { score: skillScore, matched, missing } = skillOverlap(
    profile.skills,
    allJobSkills.length ? allJobSkills : profileSearchTerms(profile)
  );

  const domains = (profile.ai_summary?.primary_domains as string[]) || [];
  const blob = `${desc} ${job.title}`.toLowerCase();
  const domainHit = domains.some(
    (d) => d && d !== "general" && blob.includes(d.toLowerCase())
  );
  const domainBoost = domainHit ? 0.15 : 0;

  const expYears = profile.experience.reduce(
    (sum, e) => sum + Number(e.years || 1),
    0
  );
  const expScore = Math.min(expYears / 3, 1) * 0.25;
  const eduScore = profile.education.length ? 0.15 : 0.05;
  const composite = Math.min(
    skillScore * 0.45 + expScore + eduScore + domainBoost + 0.1,
    1
  );
  const matchScore = Math.round(composite * 100);

  return {
    match_score: matchScore,
    potential_score: Math.min(matchScore + 15, 98),
    matched_skills: matched,
    missing_skills: missing.slice(0, 10),
    match_explanation: {
      summary: matched.length
        ? `Matched ${matched.length} skills for ${job.title}`
        : "Limited overlap — try refining your CV keywords",
      skill_score: Math.round(skillScore * 100),
    },
  };
}

export function rankJobsForProfile(
  profile: Parameters<typeof calculateMatchScore>[0],
  jobs: JobListing[]
): JobMatch[] {
  return jobs
    .map((job) => {
      const scores = calculateMatchScore(profile, job);
      return {
        id: crypto.randomUUID(),
        ...scores,
        job,
        created_at: new Date().toISOString(),
      };
    })
    .sort((a, b) => b.match_score - a.match_score);
}

export function aggregateSkillGaps(matches: JobMatch[]) {
  const counts: Record<string, number> = {};
  for (const m of matches) {
    for (const s of m.missing_skills || []) {
      counts[s] = (counts[s] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([skill_name, count]) => ({
      id: crypto.randomUUID(),
      skill_name,
      priority: Math.min(5, Math.ceil(count / 2)),
      learning_path: {
        resources: [
          `https://www.coursera.org/search?query=${encodeURIComponent(skill_name)}`,
          `https://www.youtube.com/results?search_query=learn+${encodeURIComponent(skill_name)}`,
        ],
        estimated_weeks: 4,
      },
    }));
}
