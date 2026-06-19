const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
  timeoutMs = 60000
): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      const detail = err.detail;
      const message =
        typeof detail === "string"
          ? detail
          : Array.isArray(detail)
            ? detail.map((d: { msg?: string }) => d.msg).filter(Boolean).join(", ")
            : res.statusText || "Request failed";
      throw new Error(message);
    }

    return res.json();
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Request timed out. Is the API server running on port 8000?");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export type ApiClient = {
  fetch: <T>(path: string, options?: RequestInit) => Promise<T>;
  upload: <T>(path: string, formData: FormData) => Promise<T>;
};

export type CV = {
  id: string;
  file_name: string;
  mime_type: string;
  status: string;
  uploaded_at: string;
};

export type CVProfile = {
  id: string;
  cv_id: string;
  skills: string[];
  education: Record<string, string>[];
  certifications: string[];
  experience: Record<string, string | number>[];
  keywords: string[];
  ai_summary: Record<string, unknown>;
  analyzed_at: string | null;
};

export type JobListing = {
  id: string;
  source: string;
  title: string;
  company: string;
  location: string;
  salary_text: string | null;
  required_skills: string[];
  preferred_skills: string[];
  description: string;
  apply_url: string;
  posted_at?: string | null;
};

export function isDemoJob(job: JobListing): boolean {
  const url = job.apply_url.toLowerCase();
  return (
    url.includes("example.com") ||
    url.includes("linkedin.com/jobs/search") ||
    url.includes("jobs/search/?location=")
  );
}

export function jobSourceLabel(source: string): string {
  const labels: Record<string, string> = {
    topjobs: "TopJobs.lk",
    career_page: "Company careers",
    linkedin: "LinkedIn",
    xpressjobs: "XpressJobs",
  };
  return labels[source] ?? source;
}

export function normalizeTopJobsApplyUrl(url: string): string {
  return url.replace(
    "https://www.topjobs.lk/applicant/employer/JobAdvertismentServlet",
    "https://www.topjobs.lk/employer/JobAdvertismentServlet"
  );
}

export function jobApplyUrl(job: JobListing): string {
  return normalizeTopJobsApplyUrl(job.apply_url);
}

export type JobMatch = {
  id: string;
  match_score: number;
  potential_score: number;
  matched_skills: string[];
  missing_skills: string[];
  match_explanation: Record<string, unknown>;
  job: JobListing;
  created_at: string;
};

export type SearchSession = {
  id: string;
  cv_id: string;
  status: string;
  filters: Record<string, unknown>;
  started_at: string;
  completed_at: string | null;
  matches: JobMatch[];
};

export type DashboardStats = {
  total_matches: number;
  average_match_score: number;
  missing_skills_count: number;
  recommended_skills: string[];
};

export type SkillGap = {
  id: string;
  skill_name: string;
  priority: number;
  learning_path: {
    resources?: string[];
    estimated_weeks?: number;
  };
};

export type CoverLetter = {
  id: string;
  match_id: string;
  content: string;
  generated_at: string;
};
