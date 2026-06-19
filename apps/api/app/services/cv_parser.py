import io
import uuid
from pathlib import Path

import fitz
import pdfplumber
from docx import Document

from app.config import settings


def extract_text_from_pdf(content: bytes) -> str:
    text_parts: list[str] = []
    try:
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)
    except Exception:
        pass

    if not text_parts:
        doc = fitz.open(stream=content, filetype="pdf")
        for page in doc:
            text_parts.append(page.get_text())
        doc.close()

    return "\n".join(text_parts).strip()


def extract_text_from_docx(content: bytes) -> str:
    doc = Document(io.BytesIO(content))
    return "\n".join(p.text for p in doc.paragraphs if p.text.strip()).strip()


def parse_cv_content(content: bytes, mime_type: str, file_name: str) -> str:
    lower = file_name.lower()
    if mime_type == "application/pdf" or lower.endswith(".pdf"):
        return extract_text_from_pdf(content)
    if (
        mime_type
        in {
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/msword",
        }
        or lower.endswith(".docx")
    ):
        return extract_text_from_docx(content)
    raise ValueError("Unsupported file type. Upload PDF or DOCX.")


async def upload_to_storage(user_id: str, file_name: str, content: bytes, mime_type: str) -> str:
    if not settings.supabase_url or not settings.supabase_service_key:
        local_dir = Path("uploads") / user_id
        local_dir.mkdir(parents=True, exist_ok=True)
        path = local_dir / f"{uuid.uuid4()}_{file_name}"
        path.write_bytes(content)
        return str(path)

    from supabase import create_client

    client = create_client(settings.supabase_url, settings.supabase_service_key)
    storage_path = f"{user_id}/{uuid.uuid4()}_{file_name}"
    client.storage.from_(settings.supabase_storage_bucket).upload(
        storage_path,
        content,
        {"content-type": mime_type},
    )
    return storage_path


async def download_from_storage(storage_path: str) -> bytes:
    if storage_path.startswith("uploads") or Path(storage_path).exists():
        return Path(storage_path).read_bytes()

    from supabase import create_client

    client = create_client(settings.supabase_url, settings.supabase_service_key)
    return client.storage.from_(settings.supabase_storage_bucket).download(storage_path)


async def delete_from_storage(storage_path: str) -> None:
    path = Path(storage_path)
    if path.exists():
        path.unlink(missing_ok=True)
        return

    if not settings.supabase_url or not settings.supabase_service_key:
        return

    from supabase import create_client

    client = create_client(settings.supabase_url, settings.supabase_service_key)
    client.storage.from_(settings.supabase_storage_bucket).remove([storage_path])
