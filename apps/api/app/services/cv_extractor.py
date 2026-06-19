"""Rule-based CV extraction when OpenAI is unavailable."""

from __future__ import annotations

import re
from typing import Any

SECTION_HEADERS = (
    "professional summary",
    "summary",
    "core competencies",
    "skills",
    "technical skills",
    "experience",
    "work experience",
    "employment",
    "education",
    "certifications",
)

DOMAIN_KEYWORDS: dict[str, tuple[str, ...]] = {
    "marketing": (
        "marketing", "brand", "campaign", "social media", "seo", "sem", "content",
        "digital marketing", "advertising", "public relations", "market research",
        "fmcg", "sales promotion", "mailchimp", "canva", "copywriting",
    ),
    "sales": (
        "sales", "business development", "account manager", "merchandising",
        "retail", "customer acquisition", "negotiation", "b2b", "b2c",
    ),
    "finance": (
        "finance", "accounting", "audit", "bookkeeping", "tax", "payroll",
        "financial analysis", "budget", "accounts payable", "accounts receivable",
    ),
    "hr": (
        "human resources", "recruitment", "talent acquisition", "payroll",
        "employee relations", "training", "onboarding", "hr",
    ),
    "it": (
        "software", "developer", "programming", "python", "java", "javascript",
        "typescript", "react", "node.js", "sql", "devops", "cloud", "aws",
        "full stack", "backend", "frontend", ".net", "docker", "kubernetes",
    ),
    "design": (
        "graphic design", "ui", "ux", "illustrator", "photoshop", "creative",
        "visual design", "branding",
    ),
    "operations": (
        "operations", "logistics", "supply chain", "warehouse", "procurement",
        "inventory", "production supervisor",
    ),
    "healthcare": (
        "nursing", "medical", "healthcare", "patient care", "clinical", "pharmacy",
    ),
    "education": (
        "teaching", "lecturer", "education", "curriculum", "classroom",
    ),
}

SKILL_CATALOG: dict[str, tuple[str, ...]] = {
    "Marketing": DOMAIN_KEYWORDS["marketing"],
    "Sales": DOMAIN_KEYWORDS["sales"],
    "Finance": DOMAIN_KEYWORDS["finance"] + ("excel", "sap"),
    "HR": DOMAIN_KEYWORDS["hr"],
    "IT": DOMAIN_KEYWORDS["it"],
    "Design": DOMAIN_KEYWORDS["design"],
    "Operations": DOMAIN_KEYWORDS["operations"],
    "Communication": ("communication", "presentation", "public speaking", "writing"),
    "Leadership": ("leadership", "team management", "people management", "supervision"),
    "Microsoft Office": ("microsoft office", "excel", "word", "powerpoint"),
    "Project Management": ("project management", "agile", "scrum", "planning"),
}

STOP_WORDS = {
    "and", "the", "for", "with", "from", "present", "lanka", "sri", "colombo",
    "june", "july", "august", "january", "february", "march", "april", "may",
    "september", "october", "november", "december", "completed", "specialization",
}


def _clean_text(text: str) -> str:
    text = text.replace("\uFFFD", " ")
    text = text.replace("�", " ")
    text = re.sub(r"[•●▪·]", "\n- ", text)
    text = re.sub(r"\r\n?", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _contains_term(text: str, term: str) -> bool:
    return bool(re.search(rf"(?<![a-z0-9]){re.escape(term.lower())}(?![a-z0-9])", text.lower()))


def _split_sections(text: str) -> dict[str, str]:
    lines = text.splitlines()
    sections: dict[str, list[str]] = {"body": []}
    current = "body"

    for line in lines:
        normalized = re.sub(r"[^a-z ]", "", line.strip().lower())
        if normalized in SECTION_HEADERS or any(
            normalized == header or normalized.startswith(header + " ")
            for header in SECTION_HEADERS
        ):
            current = normalized.split()[0] if normalized.split() else normalized
            sections.setdefault(current, [])
            continue
        sections.setdefault(current, []).append(line)

    return {key: "\n".join(value).strip() for key, value in sections.items() if value}


def _extract_skills(text: str) -> list[str]:
    found: list[str] = []
    lower = text.lower()

    for skill_name, terms in SKILL_CATALOG.items():
        if any(_contains_term(lower, term) for term in terms):
            found.append(skill_name)

    competency_text = ""
    for key in ("core", "skills", "technical"):
        if key in text.lower():
            competency_text = text
            break

    for line in text.splitlines():
        cleaned = line.strip(" -•\t")
        if not cleaned or len(cleaned) > 120:
            continue
        if ":" in cleaned and len(cleaned.split(":")[0]) < 40:
            label, values = cleaned.split(":", 1)
            if len(label.split()) <= 5:
                for part in re.split(r"[,/|]", values):
                    skill = part.strip()
                    if 2 < len(skill) < 60:
                        found.append(skill.title() if skill.islower() else skill)
            continue
        if cleaned.startswith("-") or cleaned.startswith("•"):
            skill = cleaned.lstrip("-• ").strip()
            if 2 < len(skill) < 60:
                found.append(skill)

    deduped: list[str] = []
    seen: set[str] = set()
    for skill in found:
        key = skill.lower()
        if key in seen:
            continue
        seen.add(key)
        deduped.append(skill)
    return deduped[:25]


def _parse_experience(text: str) -> list[dict[str, Any]]:
    experience: list[dict[str, Any]] = []
    exp_text = ""
    for key, content in _split_sections(text).items():
        if any(k in key for k in ("experience", "employment", "work")):
            exp_text = content
            break
    if not exp_text:
        return experience

    blocks = re.split(r"\n(?=[A-Z][A-Za-z/& -]{3,40}\n)", exp_text)
    for block in blocks:
        lines = [line.strip() for line in block.splitlines() if line.strip()]
        if not lines:
            continue
        title = lines[0]
        company = lines[1] if len(lines) > 1 else "Not specified"
        years = 1.0
        date_match = re.search(
            r"((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}).*?"
            r"((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}|Present)",
            block,
            re.I,
        )
        if date_match:
            years = 2.0 if "present" in date_match.group(2).lower() else 1.5
        if len(title.split()) <= 8:
            experience.append(
                {
                    "title": title,
                    "company": company.split("|")[0].strip(),
                    "years": years,
                    "highlights": [line.lstrip("-• ") for line in lines[2:] if line.startswith(("-", "•"))][:5],
                }
            )
    return experience[:6]


def _parse_education(text: str) -> list[dict[str, Any]]:
    education: list[dict[str, Any]] = []
    for key, content in _split_sections(text).items():
        if "education" in key:
            blocks = re.split(r"\n(?=[A-Z])", content)
            for block in blocks:
                lines = [line.strip() for line in block.splitlines() if line.strip()]
                if not lines:
                    continue
                degree = lines[0]
                institution = lines[1] if len(lines) > 1 else "Not specified"
                education.append({"degree": degree, "institution": institution})
            break
    if not education:
        for line in text.splitlines():
            lower = line.lower()
            if any(k in lower for k in ("bachelor", "diploma", "master", "mba", "degree", "b.a", "b.sc", "bba")):
                education.append({"degree": line.strip(), "institution": "Extracted from CV"})
    return education[:5]


def _detect_domains(text: str, skills: list[str], experience: list[dict[str, Any]]) -> list[str]:
    scores: dict[str, int] = {domain: 0 for domain in DOMAIN_KEYWORDS}
    blob = text.lower()
    for domain, keywords in DOMAIN_KEYWORDS.items():
        for keyword in keywords:
            if _contains_term(blob, keyword):
                scores[domain] += 2 if " " in keyword else 1

    for skill in skills:
        skill_lower = skill.lower()
        for domain, keywords in DOMAIN_KEYWORDS.items():
            if any(keyword in skill_lower or skill_lower in keyword for keyword in keywords):
                scores[domain] += 2

    for exp in experience:
        title = str(exp.get("title", "")).lower()
        for domain, keywords in DOMAIN_KEYWORDS.items():
            if any(keyword in title for keyword in keywords):
                scores[domain] += 3

    ranked = sorted(scores.items(), key=lambda item: item[1], reverse=True)
    top = [domain for domain, score in ranked if score > 0][:3]
    return top or ["general"]


def _build_keywords(skills: list[str], experience: list[dict[str, Any]], domains: list[str]) -> list[str]:
    keywords: list[str] = []
    keywords.extend(domains)
    keywords.extend(skills[:12])
    for exp in experience:
        title = str(exp.get("title", "")).strip()
        if title:
            keywords.append(title)
            keywords.extend(word for word in title.lower().split() if len(word) > 3 and word not in STOP_WORDS)
    deduped: list[str] = []
    seen: set[str] = set()
    for keyword in keywords:
        key = keyword.lower()
        if key in seen or key in STOP_WORDS:
            continue
        seen.add(key)
        deduped.append(keyword)
    return deduped[:20]


def extract_profile_from_text(raw_text: str) -> dict[str, Any]:
    text = _clean_text(raw_text)
    skills = _extract_skills(text)
    experience = _parse_experience(text)
    education = _parse_education(text)
    domains = _detect_domains(text, skills, experience)
    keywords = _build_keywords(skills, experience, domains)

    if not skills:
        skills = [domains[0].title()] if domains and domains[0] != "general" else ["Communication"]

    summary_bits = []
    if experience:
        summary_bits.append(f"{experience[0]['title']} background")
    if domains and domains[0] != "general":
        summary_bits.append(f"{domains[0]} professional")
    summary = " ".join(summary_bits).capitalize() + "." if summary_bits else "Professional candidate profile."

    return {
        "skills": skills,
        "education": education or [{"degree": "Not specified", "institution": "Extracted from CV"}],
        "certifications": [],
        "experience": experience or [{"title": "Professional Experience", "years": 1, "company": "Extracted from CV"}],
        "keywords": keywords,
        "primary_domains": domains,
        "ai_summary": {
            "seniority": "senior" if any(float(exp.get("years", 0)) >= 4 for exp in experience) else "mid",
            "domains": [domain.title() for domain in domains[:3]],
            "strengths": skills[:6],
            "summary": summary,
        },
    }


def build_profile_search_terms(profile: dict[str, Any]) -> list[str]:
    terms: set[str] = set()
    for skill in profile.get("skills", []):
        terms.add(skill.lower())
        terms.update(part.strip() for part in re.split(r"[,/&]", skill.lower()) if len(part.strip()) > 2)
    for keyword in profile.get("keywords", []):
        if len(keyword) > 2:
            terms.add(keyword.lower())
    for domain in profile.get("primary_domains", []):
        if domain != "general":
            terms.add(domain.lower())
    for domain in profile.get("ai_summary", {}).get("domains", []):
        terms.add(str(domain).lower())
    for exp in profile.get("experience", []):
        title = str(exp.get("title", "")).lower()
        terms.update(word for word in re.split(r"[^a-z]+", title) if len(word) > 3 and word not in STOP_WORDS)
    return [term for term in terms if term not in STOP_WORDS]


def score_job_for_profile(job_blob: str, terms: list[str]) -> int:
    score = 0
    blob = job_blob.lower()
    for term in terms:
        if len(term) < 3:
            continue
        if _contains_term(blob, term):
            score += 3 if " " in term else 1
    return score
