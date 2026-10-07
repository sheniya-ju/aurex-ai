from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api.dependencies import get_current_user
from app.database.database import get_db
from app.database.models import Project, ProjectDocument, ProjectConversation, Document, User
from app.schemas.projects import ProjectCreate, ProjectUpdate, ProjectResponse
router = APIRouter(prefix="/api/projects", tags=["Projects"])

def serialize(p, db):
    return {"id":p.id,"name":p.name,"description":p.description or "","instructions":p.instructions or "","created_at":str(p.created_at),"updated_at":str(p.updated_at),"document_count":db.query(ProjectDocument).filter(ProjectDocument.project_id==p.id).count(),"conversation_count":db.query(ProjectConversation).filter(ProjectConversation.project_id==p.id).count(),"document_ids":[r.document_id for r in db.query(ProjectDocument).filter(ProjectDocument.project_id==p.id).all()]}

@router.get("", response_model=list[ProjectResponse])
def list_projects(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return [serialize(p,db) for p in db.query(Project).filter(Project.user_id==user.id).order_by(Project.updated_at.desc()).all()]

@router.post("", response_model=ProjectResponse)
def create_project(data: ProjectCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    p=Project(user_id=user.id,name=data.name.strip(),description=data.description,instructions=data.instructions); db.add(p); db.commit(); db.refresh(p); return serialize(p,db)

@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project_id:int,user:User=Depends(get_current_user),db:Session=Depends(get_db)):
    p=db.query(Project).filter(Project.id==project_id,Project.user_id==user.id).first()
    if not p: raise HTTPException(status_code=404,detail="Project not found.")
    return serialize(p,db)

@router.patch("/{project_id}", response_model=ProjectResponse)
def update_project(project_id:int,data:ProjectUpdate,user:User=Depends(get_current_user),db:Session=Depends(get_db)):
    p=db.query(Project).filter(Project.id==project_id,Project.user_id==user.id).first()
    if not p: raise HTTPException(status_code=404,detail="Project not found.")
    for field in ("name","description","instructions"):
        value=getattr(data,field)
        if value is not None: setattr(p,field,value.strip() if isinstance(value,str) else value)
    db.commit(); db.refresh(p); return serialize(p,db)

@router.delete("/{project_id}")
def delete_project(project_id:int,user:User=Depends(get_current_user),db:Session=Depends(get_db)):
    p=db.query(Project).filter(Project.id==project_id,Project.user_id==user.id).first()
    if not p: raise HTTPException(status_code=404,detail="Project not found.")
    db.delete(p); db.commit(); return {"message":"Project deleted successfully."}

@router.post("/{project_id}/documents/{document_id}")
def attach_document(project_id:int,document_id:int,user:User=Depends(get_current_user),db:Session=Depends(get_db)):
    p=db.query(Project).filter(Project.id==project_id,Project.user_id==user.id).first(); d=db.query(Document).filter(Document.id==document_id,Document.user_id==user.id).first()
    if not p or not d: raise HTTPException(status_code=404,detail="Project or document not found.")
    if not db.query(ProjectDocument).filter(ProjectDocument.project_id==project_id,ProjectDocument.document_id==document_id).first(): db.add(ProjectDocument(project_id=project_id,document_id=document_id)); db.commit()
    return {"message":"Document attached to project."}

@router.delete("/{project_id}/documents/{document_id}")
def detach_document(project_id:int,document_id:int,user:User=Depends(get_current_user),db:Session=Depends(get_db)):
    p=db.query(Project).filter(Project.id==project_id,Project.user_id==user.id).first()
    if not p: raise HTTPException(status_code=404,detail="Project not found.")
    row=db.query(ProjectDocument).filter(ProjectDocument.project_id==project_id,ProjectDocument.document_id==document_id).first()
    if row: db.delete(row); db.commit()
    return {"message":"Document detached from project."}
