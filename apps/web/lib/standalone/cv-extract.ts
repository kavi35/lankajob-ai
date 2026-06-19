/** Rule-based CV extraction (no OpenAI) — mirrors apps/api cv_extractor.py */

const DOMAIN_KEYWORDS: Record<string, string[]> = {
  marketing: [
    "marketing", "brand", "campaign", "social media", "seo", "sem", "content",
    "digital marketing", "advertising", "public relations", "market research",
    "fmcg", "mailchimp", "canva", "copywriting",
  ],
  sales: ["sales", "business development", "account manager", "retail", "b2b", "b2c"],
  finance: ["finance", "accounting", "audit", "bookkeeping", "tax", "payroll", "budget"],
  hr: ["human resources", "recruitment", "talent acquisition", "onboarding"],
  it: [
    "software", "developer", "programming", "python", "java", "javascript",
    "typescript", "react", "node.js", "sql", "devops", "cloud", "aws", "docker",
  ],
  design: ["graphic design", "ui", "ux", "photoshop", "creative", "branding"],
};

const SKILL_CATALOG: Record<string, string[]> = {
  Marketing: DOMAIN_KEYWORDS.marketing,
  Sales: DOMAIN_KEYWORDS.sales,
  Finance: [...DOMAIN_KEYWORDS.finance, "excel", "sap"],
  HR: DOMAIN_KEYWORDS.hr,
  IT: DOMAIN_KEYWORDS.it,
  Design: DOMAIN_KEYWORDS.design,
  Communication: ["communication", "presentation", "public speaking", "writing"],
  Leadership: ["leadership", "team management", "supervision"],
  "Microsoft Office": ["microsoft office", "excel", "word", "powerpoint"],
  "Project Management": ["project management", "agile", "scrum"],
};

function containsTerm(text: string, term: string): boolean {
  const escaped = term.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`, "i").test(text);
}

function extractSkills(text: string): string[] {
  const found: string[] = [];
  const lower = text.toLowerCase();

  for (const [skillName, terms] of Object.entries(SKILL_CATALOG)) {
    if (terms.some((t) => containsTerm(lower, t))) found.push(skillName);
  }

  for (const line of text.split("\n")) {
    const cleaned = line.trim().replace(/^[•●▪\-]\s*/, "");
    if (cleaned.includes(":") && cleaned.split(":")[0].split(" ").length <= 5) {
      const values = cleaned.split(":").slice(1).join(":");
      for (const part of values.split(/[,/|]/)) {
        const skill = part.trim();
        if (skill.length > 2 && skill.length < 60) found.push(skill);
      }
    }
  }

  const deduped: string[] = [];
  const seen = new Set<string>();
  for (const s of found) {
    const key = s.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(s);
    }
  }
  return deduped.slice(0, 25);
}

function detectDomains(text: string, skills: string[]): string[] {
  const scores: Record<string, number> = {};
  const blob = text.toLowerCase();
  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    scores[domain] = keywords.filter((k) => containsTerm(blob, k)).length;
    scores[domain] += skills.filter((s) =>
      keywords.some((k) => s.toLowerCase().includes(k))
    ).length;
  }
  const ranked = Object.entries(scores)
    .filter(([, s]) => s > 0)
    .sort((a, b) => b[1] - a[1]);
  return ranked.length ? [ranked[0][0]] : ["general"];
}

function parseEducation(text: string): Record<string, string>[] {
  const education: Record<string, string>[] = [];
  for (const line of text.split("\n")) {
    const lower = line.toLowerCase();
    if (/bachelor|diploma|master|mba|degree|b\.a|b\.sc|bba/.test(lower)) {
      education.push({ degree: line.trim(), institution: "From CV" });
    }
  }
  return education.slice(0, 5);
}

function parseExperience(text: string): Record<string, string | number>[] {
  const experience: Record<string, string | number>[] = [];
  const lines = text.split("\n").filter((l) => l.trim());
  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i].trim();
    if (/manager|executive|officer|assistant|specialist|engineer|analyst/i.test(line) && line.length < 80) {
      experience.push({
        title: line,
        company: lines[i + 1]?.trim() || "Not specified",
        years: 1.5,
      });
      if (experience.length >= 5) break;
    }
  }
  return experience;
}

export function extractProfileFromText(text: string, cvId: string) {
  const cleaned = text.replace(/\uFFFD/g, " ").replace(/\r\n?/g, "\n").trim();
  const skills = extractSkills(cleaned);
  const education = parseEducation(cleaned);
  const experience = parseExperience(cleaned);
  const domains = detectDomains(cleaned, skills);
  const keywords = skills.map((s) => s.toLowerCase()).slice(0, 15);

  return {
    id: crypto.randomUUID(),
    cv_id: cvId,
    skills,
    education,
    certifications: [] as string[],
    experience,
    keywords,
    ai_summary: {
      primary_domains: domains,
      domains,
      headline: domains[0] !== "general" ? `${domains[0]} professional` : "Job seeker",
      summary: `Profile extracted from CV with focus on ${domains.join(", ")}.`,
    },
    analyzed_at: new Date().toISOString(),
  };
}

export function profileSearchTerms(profile: {
  skills: string[];
  keywords: string[];
  ai_summary?: Record<string, unknown>;
}): string[] {
  const domains = (profile.ai_summary?.primary_domains as string[]) || [];
  return [...new Set([...profile.skills, ...profile.keywords, ...domains])].filter(Boolean);
}
