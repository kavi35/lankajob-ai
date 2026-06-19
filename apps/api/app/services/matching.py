from __future__ import annotations

import math
import re
from typing import Any

from rapidfuzz import fuzz


def _normalize_skill(skill: str) -> str:
    return re.sub(r"\s+", " ", skill.strip().lower())


def _skill_overlap(candidate_skills: list[str], job_skills: list[str]) -> tuple[float, list[str], list[str]]:
    if not job_skills:
        return 0.75, candidate_skills[:5], []

    norm_candidate = {_normalize_skill(s): s for s in candidate_skills}
    matched: list[str] = []
    missing: list[str] = []

    for job_skill in job_skills:
        norm_job = _normalize_skill(job_skill)
        best_ratio = 0
        best_match = None
        for norm_c, original in norm_candidate.items():
            ratio = fuzz.token_set_ratio(norm_job, norm_c) / 100
            if ratio > best_ratio:
                best_ratio = ratio
                best_match = original
        if best_ratio >= 0.75 and best_match:
            if best_match not in matched:
                matched.append(best_match)
        else:
            missing.append(job_skill)

    score = len(matched) / max(len(job_skills), 1)
    return score, matched, missing


def _experience_score(experience: list[dict[str, Any]], description: str) -> float:
    years = 0.0
    for exp in experience:
        years += float(exp.get("years", 0) or 0)
    if years == 0 and experience:
        years = len(experience) * 1.5

    desc = description.lower()
    if any(k in desc for k in ("senior", "lead", "principal")):
        required = 5
    elif any(k in desc for k in ("mid", "intermediate")):
        required = 3
    elif any(k in desc for k in ("junior", "entry", "graduate", "intern")):
        required = 1
    else:
        required = 2

    return min(years / required, 1.0) if required else 0.5


def _education_score(education: list[dict[str, Any]], description: str) -> float:
    if not education:
        return 0.3
    desc = description.lower()
    levels = {"phd": 1.0, "master": 0.9, "bachelor": 0.8, "diploma": 0.6, "certificate": 0.5}
    best = 0.5
    for edu in education:
        degree = str(edu.get("degree", "")).lower()
        for key, val in levels.items():
            if key in degree:
                best = max(best, val)
    if "degree" in desc or "bachelor" in desc:
        return min(best, 1.0)
    return best


def _certification_score(certifications: list[str], job_skills: list[str]) -> float:
    if not certifications:
        return 0.2
    norm_certs = {_normalize_skill(c) for c in certifications}
    hits = sum(1 for s in job_skills if _normalize_skill(s) in norm_certs)
    return min(hits / max(len(job_skills), 1), 1.0) if job_skills else 0.5


def _keyword_score(keywords: list[str], description: str) -> float:
    if not keywords:
        return 0.3
    desc = description.lower()
    hits = sum(1 for k in keywords if k.lower() in desc)
    return min(hits / max(len(keywords), 1), 1.0)


def calculate_match_score(
    profile: dict[str, Any],
    job: dict[str, Any],
) -> dict[str, Any]:
    skills = profile.get("skills", [])
    education = profile.get("education", [])
    certifications = profile.get("certifications", [])
    experience = profile.get("experience", [])
    keywords = profile.get("keywords", [])

    required = job.get("required_skills", []) or []
    preferred = job.get("preferred_skills", []) or []
    all_job_skills = list(dict.fromkeys(required + preferred))
    description = job.get("description", "")

    skill_score, matched, missing = _skill_overlap(skills, required or all_job_skills)
    exp_score = _experience_score(experience, description)
    edu_score = _education_score(education, description)
    cert_score = _certification_score(certifications, all_job_skills)
    kw_score = _keyword_score(keywords, description)
    domain_terms = [str(d).lower() for d in profile.get("primary_domains", [])]
    domain_terms += [str(d).lower() for d in profile.get("ai_summary", {}).get("domains", [])]
    if domain_terms:
        desc_lower = description.lower()
        title_lower = job.get("title", "").lower()
        domain_hits = sum(
            1 for domain in set(domain_terms)
            if domain and domain != "general" and (domain in desc_lower or domain in title_lower)
        )
        kw_score = max(kw_score, min(domain_hits / max(len(set(domain_terms)), 1), 1.0))

    composite = (
        skill_score * 0.40
        + exp_score * 0.25
        + edu_score * 0.15
        + cert_score * 0.10
        + kw_score * 0.10
    )
    match_score = int(round(composite * 100))

    # Potential score if top 3 missing skills acquired
    simulated_skills = skills + missing[:3]
    sim_score, _, _ = _skill_overlap(simulated_skills, required or all_job_skills)
    potential = int(
        round(
            (
                sim_score * 0.40
                + exp_score * 0.25
                + edu_score * 0.15
                + cert_score * 0.10
                + kw_score * 0.10
            )
            * 100
        )
    )

    explanation = {
        "summary": f"Strong alignment on {len(matched)} core skills" if matched else "Limited skill overlap",
        "skill_score": round(skill_score * 100),
        "experience_score": round(exp_score * 100),
        "education_score": round(edu_score * 100),
        "certification_score": round(cert_score * 100),
        "keyword_score": round(kw_score * 100),
    }

    return {
        "match_score": match_score,
        "potential_score": max(potential, match_score),
        "matched_skills": matched,
        "missing_skills": missing[:10],
        "match_explanation": explanation,
    }


def aggregate_skill_gaps(matches: list[dict[str, Any]]) -> list[dict[str, Any]]:
    counts: dict[str, int] = {}
    for match in matches:
        for skill in match.get("missing_skills", []):
            counts[skill] = counts.get(skill, 0) + 1

    ranked = sorted(counts.items(), key=lambda x: x[1], reverse=True)
    return [
        {
            "skill_name": skill,
            "priority": min(5, math.ceil(count / 2)),
            "learning_path": {
                "resources": [
                    f"https://www.coursera.org/search?query={skill.replace(' ', '%20')}",
                    f"https://www.youtube.com/results?search_query=learn+{skill.replace(' ', '+')}",
                ],
                "estimated_weeks": 4,
            },
        }
        for skill, count in ranked[:15]
    ]
