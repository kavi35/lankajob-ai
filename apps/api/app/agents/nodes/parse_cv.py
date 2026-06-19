from app.services.ai import analyze_profile, extract_profile_from_cv
from app.services.cv_parser import parse_cv_content


async def parse_cv_node(state: dict) -> dict:
    content = state.get("file_content", b"")
    mime_type = state.get("mime_type", "application/pdf")
    file_name = state.get("file_name", "cv.pdf")
    raw_text = parse_cv_content(content, mime_type, file_name)
    return {"raw_text": raw_text}


async def extract_skills_node(state: dict) -> dict:
    raw_text = state.get("raw_text", "")
    parsed_profile = await extract_profile_from_cv(raw_text)
    return {"parsed_profile": parsed_profile}


async def analyze_profile_node(state: dict) -> dict:
    profile = state.get("parsed_profile", {})
    ai_analysis = await analyze_profile(profile)
    profile["ai_summary"] = ai_analysis
    return {"parsed_profile": profile, "ai_analysis": ai_analysis}
