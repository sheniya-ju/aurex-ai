from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.database.models import User, UserSettings
from app.core.security import hash_password, verify_password, create_access_token
from pydantic import BaseModel, EmailStr, Field

router = APIRouter(prefix="/api/auth", tags=["Auth"])
class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=6, max_length=100)
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

def user_out(user): return {"id":user.id,"name":user.name,"email":user.email}

@router.post("/register")
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    email = data.email.lower()
    if db.query(User).filter(User.email == email).first(): raise HTTPException(status_code=400, detail="Email is already registered.")
    user = User(name=data.name.strip(), email=email, password_hash=hash_password(data.password))
    db.add(user); db.commit(); db.refresh(user)
    db.add(UserSettings(user_id=user.id)); db.commit()
    return {"access_token":create_access_token(user.id),"token_type":"bearer","user":user_out(user)}

@router.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email.lower()).first()
    if not user or not verify_password(data.password, user.password_hash): raise HTTPException(status_code=401, detail="Invalid email or password.")
    if not user.settings: db.add(UserSettings(user_id=user.id)); db.commit()
    return {"access_token":create_access_token(user.id),"token_type":"bearer","user":user_out(user)}
