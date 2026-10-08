from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, Field

from app.database.database import get_db
from app.database.models import User, UserSettings

from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
)


router = APIRouter(
    prefix="/api/auth",
    tags=["Auth"],
)


# ============================================================
# REQUEST MODELS
# ============================================================

class RegisterRequest(BaseModel):
    name: str = Field(
        min_length=2,
        max_length=100,
    )

    email: EmailStr

    password: str = Field(
        min_length=6,
        max_length=100,
    )


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


# ============================================================
# USER RESPONSE
# ============================================================

def user_out(user):
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
    }


def auth_response(user):
    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": user_out(user),
    }


# ============================================================
# REGISTER
# ============================================================

@router.post("/register")
def register(
    data: RegisterRequest,
    db: Session = Depends(get_db),
):
    email = data.email.lower()

    existing_user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email is already registered.",
        )

    user = User(
        name=data.name.strip(),
        email=email,
        password_hash=hash_password(data.password),
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    db.add(
        UserSettings(
            user_id=user.id
        )
    )

    db.commit()

    return auth_response(user)


# ============================================================
# LOGIN
# ============================================================

@router.post("/login")
def login(
    data: LoginRequest,
    db: Session = Depends(get_db),
):
    user = (
        db.query(User)
        .filter(
            User.email == data.email.lower()
        )
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password.",
        )

    if not verify_password(
        data.password,
        user.password_hash,
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password.",
        )

    # Create settings for older users
    if not user.settings:
        db.add(
            UserSettings(
                user_id=user.id
            )
        )
        db.commit()

    return auth_response(user)


# ============================================================
# REFRESH ACCESS TOKEN
# ============================================================

@router.post("/refresh")
def refresh_access_token(
    data: RefreshRequest,
    db: Session = Depends(get_db),
):
    user_id = decode_refresh_token(
        data.refresh_token
    )

    if user_id is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired refresh token.",
        )

    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=401,
            detail="User no longer exists.",
        )

    new_access_token = create_access_token(
        user.id
    )

    return {
        "access_token": new_access_token,
        "token_type": "bearer",
    }