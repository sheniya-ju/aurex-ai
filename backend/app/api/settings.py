from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api.dependencies import get_current_user
from app.database.database import get_db
from app.database.models import User, UserSettings, Conversation, Document
from app.schemas.settings import SettingsResponse, SettingsUpdate
router = APIRouter(prefix="/api/settings", tags=["Settings"])

def get_or_create(user, db):
    settings=db.query(UserSettings).filter(UserSettings.user_id==user.id).first()
    if not settings:
        settings=UserSettings(user_id=user.id); db.add(settings); db.commit(); db.refresh(settings)
    return settings

def out(s): return {"theme":s.theme,"model":s.model,"enter_to_send":bool(s.enter_to_send),"show_sources":bool(s.show_sources),"auto_scroll":bool(s.auto_scroll)}

@router.get("", response_model=SettingsResponse)
def get_settings(user:User=Depends(get_current_user),db:Session=Depends(get_db)): return out(get_or_create(user,db))

@router.patch("", response_model=SettingsResponse)
def update_settings(data:SettingsUpdate,user:User=Depends(get_current_user),db:Session=Depends(get_db)):
    s=get_or_create(user,db)
    for field in ("theme","model","enter_to_send","show_sources","auto_scroll"):
        value=getattr(data,field)
        if value is not None: setattr(s,field,int(value) if field in {"enter_to_send","show_sources","auto_scroll"} else value)
    db.commit(); db.refresh(s); return out(s)

@router.delete("/chats")
def clear_chats(user:User=Depends(get_current_user),db:Session=Depends(get_db)):
    db.query(Conversation).filter(Conversation.user_id==user.id).delete(synchronize_session=False); db.commit(); return {"message":"Chat history cleared."}
