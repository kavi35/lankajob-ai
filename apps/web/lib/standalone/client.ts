import type { ApiClient } from "@/lib/api-client";
import type {
  CV,
  CVProfile,
  CoverLetter,
  DashboardStats,
  JobMatch,
  SearchSession,
  SkillGap,
} from "@/lib/api-client";
import { extractProfileFromText, profileSearchTerms } from "./cv-extract";
import { aggregateSkillGaps, rankJobsForProfile } from "./matching";
import { generateCoverLetter, generateInterviewPrep } from "./templates";
import { loadStore, newId, nowIso, updateStore } from "./store";

async function extractTextFromFile(formData: FormData): Promise<string> {
  const res = await fetch("/api/standalone/extract-text", {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Could not read CV file");
  }
  const data = (await res.json()) as { text: string };
  return data.text;
}

async function fetchJobs(terms: string[]) {
  const res = await fetch("/api/standalone/scrape-jobs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ terms }),
  });
  if (!res.ok) throw new Error("Failed to fetch jobs from TopJobs.lk");
  return (await res.json()) as { jobs: import("@/lib/api-client").JobListing[] };
}

export function createStandaloneClient(): ApiClient {
  return {
    fetch: async <T,>(path: string, options: RequestInit = {}): Promise<T> => {
      const method = (options.method || "GET").toUpperCase();
      const store = loadStore();

      if (path.startsWith("/api/v1/cv") && method === "GET" && path === "/api/v1/cv") {
        return store.cvs.map(({ rawText: _, ...cv }) => cv) as T;
      }

      const profileMatch = path.match(/^\/api\/v1\/cv\/([^/]+)\/profile$/);
      if (profileMatch && method === "GET") {
        const p = store.profiles[profileMatch[1]];
        if (!p) throw new Error("Profile not found");
        return p as T;
      }

      const analyzeMatch = path.match(/^\/api\/v1\/cv\/([^/]+)\/analyze$/);
      if (analyzeMatch && method === "POST") {
        const cvId = analyzeMatch[1];
        const cv = store.cvs.find((c) => c.id === cvId);
        if (!cv?.rawText) throw new Error("CV text not found — re-upload your CV");
        const profile = extractProfileFromText(cv.rawText, cvId);
        updateStore((d) => {
          d.profiles[cvId] = profile;
          d.cvs = d.cvs.map((c) =>
            c.id === cvId ? { ...c, status: "analyzed" } : c
          );
          return d;
        });
        return profile as T;
      }

      const deleteMatch = path.match(/^\/api\/v1\/cv\/([^/]+)$/);
      if (deleteMatch && method === "DELETE") {
        const cvId = deleteMatch[1];
        updateStore((d) => {
          d.cvs = d.cvs.filter((c) => c.id !== cvId);
          delete d.profiles[cvId];
          return d;
        });
        return {} as T;
      }

      if (path === "/api/v1/sessions" && method === "POST") {
        const body = options.body ? JSON.parse(String(options.body)) : {};
        const cvId = body.cv_id as string;
        const profile = store.profiles[cvId];
        if (!profile) throw new Error("Analyze your CV first");

        const terms = profileSearchTerms(profile);
        const { jobs } = await fetchJobs(terms);
        const matches = rankJobsForProfile(profile, jobs);
        const skillGaps = aggregateSkillGaps(matches);

        const session: SearchSession = {
          id: newId(),
          cv_id: cvId,
          status: "completed",
          filters: body.filters || {},
          started_at: nowIso(),
          completed_at: nowIso(),
          matches,
        };

        updateStore((d) => {
          d.matches = matches;
          d.skillGaps = skillGaps;
          return d;
        });

        return session as T;
      }

      const matchesUrl = path.match(/^\/api\/v1\/matches(?:\?min_score=(\d+))?$/);
      if (matchesUrl && method === "GET") {
        const min = Number(matchesUrl[1] || 0);
        return store.matches.filter((m) => m.match_score >= min) as T;
      }

      const coverMatch = path.match(/^\/api\/v1\/matches\/([^/]+)\/cover-letter$/);
      if (coverMatch && method === "POST") {
        const matchId = coverMatch[1];
        const match = store.matches.find((m) => m.id === matchId);
        if (!match) throw new Error("Match not found");
        const cvId = store.cvs[0]?.id;
        const profile = cvId ? store.profiles[cvId] : null;
        const content = generateCoverLetter(
          profile || { skills: match.matched_skills },
          match
        );
        const letter: CoverLetter = {
          id: newId(),
          match_id: matchId,
          content,
          generated_at: nowIso(),
        };
        updateStore((d) => {
          d.coverLetters[matchId] = letter;
          return d;
        });
        return letter as T;
      }

      const prepMatch = path.match(/^\/api\/v1\/matches\/([^/]+)\/interview-prep$/);
      if (prepMatch && method === "POST") {
        const matchId = prepMatch[1];
        const match = store.matches.find((m) => m.id === matchId);
        if (!match) throw new Error("Match not found");
        const prep = generateInterviewPrep(match);
        updateStore((d) => {
          d.interviewPreps[matchId] = prep;
          return d;
        });
        return prep as T;
      }

      const saveJob = path.match(/^\/api\/v1\/jobs\/([^/]+)\/save$/);
      if (saveJob && method === "POST") {
        const jobId = saveJob[1];
        updateStore((d) => {
          if (!d.savedJobIds.includes(jobId)) d.savedJobIds.push(jobId);
          return d;
        });
        return { saved: true } as T;
      }

      if (path === "/api/v1/skills/gaps" && method === "GET") {
        return store.skillGaps as T;
      }

      if (path === "/api/v1/skills/recommendations" && method === "GET") {
        const recs = store.skillGaps.slice(0, 5).map((g) => ({
          skill: g.skill_name,
          reason: `Appears in ${g.priority} missing match(es)`,
          resources: g.learning_path?.resources || [],
        }));
        return recs as T;
      }

      if (path === "/api/v1/skills/dashboard-stats" && method === "GET") {
        const matches = store.matches;
        const total = matches.length;
        const avg =
          total > 0
            ? matches.reduce((s, m) => s + m.match_score, 0) / total
            : 0;
        const stats: DashboardStats = {
          total_matches: total,
          average_match_score: Math.round(avg * 10) / 10,
          missing_skills_count: store.skillGaps.length,
          recommended_skills: store.skillGaps.slice(0, 5).map((g) => g.skill_name),
        };
        return stats as T;
      }

      throw new Error(`Standalone mode: unsupported ${method} ${path}`);
    },

    upload: async <T,>(path: string, formData: FormData): Promise<T> => {
      if (path !== "/api/v1/cv/upload") {
        throw new Error(`Standalone upload not supported for ${path}`);
      }
      const file = formData.get("file") as File | null;
      if (!file) throw new Error("No file provided");

      const text = await extractTextFromFile(formData);
      const cv: CV & { rawText: string } = {
        id: newId(),
        file_name: file.name,
        mime_type: file.type || "application/octet-stream",
        status: "uploaded",
        uploaded_at: nowIso(),
        rawText: text,
      };

      updateStore((d) => {
        d.cvs = [cv];
        d.profiles = {};
        d.matches = [];
        d.skillGaps = [];
        d.coverLetters = {};
        d.interviewPreps = {};
        return d;
      });

      const { rawText: _, ...publicCv } = cv;
      return publicCv as T;
    },
  };
}
