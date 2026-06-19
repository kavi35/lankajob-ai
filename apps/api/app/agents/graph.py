from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.nodes.parse_cv import analyze_profile_node, extract_skills_node, parse_cv_node
from app.agents.nodes.rank_matches import generate_insights_node, rank_matches_node
from app.agents.nodes.search_jobs import search_jobs_from_db
from app.services.ai import analyze_profile, extract_profile_from_cv, generate_match_explanation
from app.services.cv_parser import parse_cv_content
from app.services.matching import aggregate_skill_gaps, calculate_match_score


async def run_cv_analysis(file_content: bytes, mime_type: str, file_name: str) -> dict:
    """Run CV analysis pipeline (parse → extract → analyze)."""
    state: dict = {
        "file_content": file_content,
        "mime_type": mime_type,
        "file_name": file_name,
    }
    state.update(await parse_cv_node(state))
    state.update(await extract_skills_node(state))
    state.update(await analyze_profile_node(state))
    return state


async def run_matching_pipeline(db: AsyncSession, profile: dict) -> dict:
    jobs = await search_jobs_from_db(db, profile)
    ranked: list[dict] = []
    for job in jobs:
        scores = calculate_match_score(profile, job)
        explanation_text = await generate_match_explanation(profile, job, scores)
        scores["match_explanation"]["narrative"] = explanation_text
        ranked.append({"job": job, **scores})
    ranked.sort(key=lambda x: x["match_score"], reverse=True)
    ranked = ranked[:30]
    skill_gaps = aggregate_skill_gaps(ranked)
    learning_paths = [{"skill": g["skill_name"], **g["learning_path"]} for g in skill_gaps[:10]]
    return {
        "ranked_matches": ranked,
        "skill_gaps": skill_gaps,
        "learning_paths": learning_paths,
    }
