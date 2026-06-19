import type { CVProfile, JobMatch } from "@/lib/api-client";
import { extractProfileFromText, profileSearchTerms } from "./cv-extract";
import { aggregateSkillGaps, rankJobsForProfile } from "./matching";
import { loadStore, saveStore } from "./store";

export type ProcessStep =
  | "upload"
  | "read"
  | "extract"
  | "analyze"
  | "match"
  | "done"
  | "error";

export type CvAnalysisResult = {
  fileName: string;
  rawText: string;
  profile: CVProfile;
  matches: JobMatch[];
  processedAt: string;
};

const STORAGE_KEY = "lankajob-cv-result";

export function loadSavedResult(): CvAnalysisResult | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveResult(result: CvAnalysisResult) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
}

export function clearSavedResult() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

export type StepCallback = (step: ProcessStep, message?: string) => void;

/** Full pipeline: Upload → Read PDF → Extract Text → Analyze Skills → Match Jobs */
export async function processCvFile(
  file: File,
  onStep?: StepCallback
): Promise<CvAnalysisResult> {
  onStep?.("upload", "Uploading CV...");

  const form = new FormData();
  form.append("file", file);

  onStep?.("read", "Reading PDF / DOCX...");
  const extractRes = await fetch("/api/standalone/extract-text", {
    method: "POST",
    body: form,
  });
  if (!extractRes.ok) {
    const err = await extractRes.json().catch(() => ({}));
    throw new Error(
      (err as { detail?: string }).detail || `Server error (${extractRes.status})`
    );
  }
  const { text, fileName } = (await extractRes.json()) as {
    text: string;
    fileName: string;
  };

  onStep?.("extract", "Extracting text...");
  if (!text?.trim()) throw new Error("No text found in CV");

  onStep?.("analyze", "Analyzing skills...");
  const cvId = crypto.randomUUID();
  const profile = extractProfileFromText(text, cvId);

  onStep?.("match", "Calculating match scores...");
  const terms = profileSearchTerms(profile);
  const jobsRes = await fetch("/api/standalone/scrape-jobs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ terms }),
  });
  if (!jobsRes.ok) throw new Error("Failed to load jobs for matching");
  const { jobs } = (await jobsRes.json()) as {
    jobs: import("@/lib/api-client").JobListing[];
  };

  const matches = rankJobsForProfile(profile, jobs);

  const result: CvAnalysisResult = {
    fileName: fileName || file.name,
    rawText: text,
    profile,
    matches,
    processedAt: new Date().toISOString(),
  };

  saveResult(result);

  // Keep legacy store in sync for other dashboard pages
  const store = loadStore();
  store.cvs = [
    {
      id: cvId,
      file_name: result.fileName,
      mime_type: file.type,
      status: "analyzed",
      uploaded_at: result.processedAt,
      rawText: text,
    },
  ];
  store.profiles = { [cvId]: profile };
  store.matches = matches;
  store.skillGaps = aggregateSkillGaps(matches);
  saveStore(store);

  onStep?.("done", "Complete!");
  return result;
}

export const STEP_LABELS: Record<ProcessStep, string> = {
  upload: "Upload CV",
  read: "Read PDF",
  extract: "Extract Text",
  analyze: "Analyze Skills",
  match: "Calculate Match Score",
  done: "Show Results",
  error: "Error",
};

export const STEP_ORDER: ProcessStep[] = [
  "upload",
  "read",
  "extract",
  "analyze",
  "match",
  "done",
];
