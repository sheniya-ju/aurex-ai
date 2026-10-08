from datetime import datetime, timedelta, timezone

from jose import jwt
from passlib.context import CryptContext

from app.core.config import settings


ALGORITHM = "HS256"

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
)


# ============================================================
# PASSWORD
# ============================================================

def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(
    plain_password: str,
    hashed_password: str,
) -> bool:
    return pwd_context.verify(
        plain_password,
        hashed_password,
    )


# ============================================================
# ACCESS TOKEN
# ============================================================

def create_access_token(user_id: int) -> str:
    expire = (
        datetime.now(timezone.utc)
        + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    )

    payload = {
        "sub": str(user_id),
        "type": "access",
        "exp": expire,
    }

    return jwt.encode(
        payload,
        settings.SECRET_KEY,
        algorithm=ALGORITHM,
    )


# ============================================================
# REFRESH TOKEN
# ============================================================

def create_refresh_token(user_id: int) -> str:
    expire = (
        datetime.now(timezone.utc)
        + timedelta(
            days=settings.REFRESH_TOKEN_EXPIRE_DAYS
        )
    )

    payload = {
        "sub": str(user_id),
        "type": "refresh",
        "exp": expire,
    }

    return jwt.encode(
        payload,
        settings.SECRET_KEY,
        algorithm=ALGORITHM,
    )


# ============================================================
# ACCESS TOKEN DECODER
# ============================================================

def decode_access_token(token: str):
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[ALGORITHM],
        )

        if payload.get("type") != "access":
            return None

        user_id = payload.get("sub")

        return (
            int(user_id)
            if user_id is not None
            else None
        )

    except Exception:
        return None


# ============================================================
# REFRESH TOKEN DECODER
# ============================================================

def decode_refresh_token(token: str):
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[ALGORITHM],
        )

        if payload.get("type") != "refresh":
            return None

        user_id = payload.get("sub")

        return (
            int(user_id)
            if user_id is not None
            else None
        )

    except Exception:
        return None