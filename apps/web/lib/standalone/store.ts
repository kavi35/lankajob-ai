import type {
  CV,
  CVProfile,
  CoverLetter,
  JobMatch,
  SkillGap,
} from "@/lib/api-client";

const STORAGE_KEY = "lankajob-standalone-v1";

export type StoredCV = CV & { rawText?: string };

export type StandaloneData = {
  cvs: StoredCV[];
  profiles: Record<string, CVProfile>;
  matches: JobMatch[];
  skillGaps: SkillGap[];
  coverLetters: Record<string, CoverLetter>;
  interviewPreps: Record<string, { content: InterviewPrepContent }>;
  savedJobIds: string[];
};

export type InterviewPrepContent = {
  technical_questions?: string[];
  hr_questions?: string[];
  suggested_answers?: string[];
};

function emptyData(): StandaloneData {
  return {
    cvs: [],
    profiles: {},
    matches: [],
    skillGaps: [],
    coverLetters: {},
    interviewPreps: {},
    savedJobIds: [],
  };
}

export function loadStore(): StandaloneData {
  if (typeof window === "undefined") return emptyData();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyData();
    return { ...emptyData(), ...JSON.parse(raw) };
  } catch {
    return emptyData();
  }
}

export function saveStore(data: StandaloneData): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function updateStore(
  fn: (data: StandaloneData) => StandaloneData | void
): StandaloneData {
  const current = loadStore();
  const next = fn(current) ?? current;
  saveStore(next);
  return next;
}

export function newId(): string {
  return crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}
