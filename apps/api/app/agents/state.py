from typing import TypedDict


class AgentState(TypedDict, total=False):
    user_id: str
    cv_id: str
    session_id: str
    file_content: bytes
    mime_type: str
    file_name: str
    raw_text: str
    parsed_profile: dict
    ai_analysis: dict
    job_candidates: list[dict]
    ranked_matches: list[dict]
    skill_gaps: list[dict]
    learning_paths: list[dict]
