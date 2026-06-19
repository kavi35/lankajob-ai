import httpx
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models import User

security = HTTPBearer(auto_error=False)

_jwks_cache: dict | None = None


async def get_jwks() -> dict:
    global _jwks_cache
    if _jwks_cache is not None:
        return _jwks_cache
    if not settings.clerk_jwks_url:
        return {"keys": []}
    async with httpx.AsyncClient() as client:
        resp = await client.get(settings.clerk_jwks_url)
        resp.raise_for_status()
        _jwks_cache = resp.json()
        return _jwks_cache


def _get_signing_key(token: str, jwks: dict):
    from jwt import PyJWKClient

    if not settings.clerk_jwks_url:
        return None
    client = PyJWKClient(settings.clerk_jwks_url)
    return client.get_signing_key_from_jwt(token)


async def _get_or_create_dev_user(db: AsyncSession) -> User:
    result = await db.execute(select(User).where(User.clerk_id == "dev-user"))
    user = result.scalar_one_or_none()
    if not user:
        user = User(clerk_id="dev-user", email="dev@lankajob.ai", full_name="Dev User")
        db.add(user)
        await db.flush()
    return user


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    # Dev mode: no Clerk configured — allow unauthenticated requests as dev user
    if not settings.clerk_jwks_url:
        return await _get_or_create_dev_user(db)

    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    token = credentials.credentials

    try:
        signing_key = _get_signing_key(token, await get_jwks())
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            issuer=settings.clerk_issuer,
            options={"verify_aud": False},
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc

    clerk_id = payload.get("sub")
    email = payload.get("email") or payload.get("email_address") or ""
    name = payload.get("name") or payload.get("full_name")

    result = await db.execute(select(User).where(User.clerk_id == clerk_id))
    user = result.scalar_one_or_none()
    if not user:
        user = User(clerk_id=clerk_id, email=email, full_name=name)
        db.add(user)
        await db.flush()
    else:
        user.email = email or user.email
        user.full_name = name or user.full_name
    return user
