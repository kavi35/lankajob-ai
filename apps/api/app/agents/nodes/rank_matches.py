from app.services.ai import generate_match_explanation
from app.services.matching import aggregate_skill_gaps, calculate_match_score


async def rank_matches_node(state: dict) -> dict:
    profile = state.get("parsed_profile", {})
    jobs = state.get("job_candidates", [])
    ranked: list[dict] = []

    for job in jobs:
        scores = calculate_match_score(profile, job)
        explanation_text = await generate_match_explanation(profile, job, scores)
        scores["match_explanation"]["narrative"] = explanation_text
        ranked.append({"job": job, **scores})

    ranked.sort(key=lambda x: x["match_score"], reverse=True)
    return {"ranked_matches": ranked[:30]}


async def generate_insights_node(state: dict) -> dict:
    ranked = state.get("ranked_matches", [])
    skill_gaps = aggregate_skill_gaps(ranked)
    learning_paths = [
        {"skill": g["skill_name"], **g["learning_path"]}
        for g in skill_gaps[:10]
    ]
    return {"skill_gaps": skill_gaps, "learning_paths": learning_paths}
