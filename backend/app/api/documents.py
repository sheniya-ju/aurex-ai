import os
import uuid
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session
from app.api.dependencies import get_current_user
from app.database.database import get_db
from app.database.models import Document, User
from app.services.rag_service import process_pdf, delete_document_vectors

router=APIRouter(prefix="/api/documents",tags=["Documents"])
UPLOAD_DIR=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))),"uploads")
os.makedirs(UPLOAD_DIR,exist_ok=True)

def out(d): return {"id":d.id,"filename":d.filename,"file_type":d.file_type,"file_size":d.file_size,"total_pages":d.total_pages,"created_at":str(d.created_at)}

@router.get("")
def list_documents(user:User=Depends(get_current_user),db:Session=Depends(get_db)):
    return [out(d) for d in db.query(Document).filter(Document.user_id==user.id).order_by(Document.created_at.desc()).all()]

@router.post("/upload")
async def upload_document(file:UploadFile=File(...),user:User=Depends(get_current_user),db:Session=Depends(get_db)):
    filename=file.filename or "document.pdf"
    if not filename.lower().endswith(".pdf"): raise HTTPException(status_code=400,detail="Only PDF files are supported.")
    data=await file.read()
    if len(data)>10*1024*1024: raise HTTPException(status_code=400,detail="PDF must be smaller than 10 MB.")
    safe=f"{uuid.uuid4().hex}.pdf"; path=os.path.join(UPLOAD_DIR,safe)
    with open(path,"wb") as f: f.write(data)
    d=Document(user_id=user.id,filename=filename,file_type="application/pdf",file_size=len(data),total_pages=0)
    db.add(d); db.commit(); db.refresh(d)
    try: process_pdf(path,d,db)
    except Exception as exc:
        db.delete(d); db.commit()
        if os.path.exists(path): os.remove(path)
        raise HTTPException(status_code=500,detail=f"Unable to process PDF: {exc}")
    return out(d)

@router.delete("/{document_id}")
def delete_document(document_id:int,user:User=Depends(get_current_user),db:Session=Depends(get_db)):
    d=db.query(Document).filter(Document.id==document_id,Document.user_id==user.id).first()
    if not d: raise HTTPException(status_code=404,detail="Document not found.")
    delete_document_vectors(d.id); db.delete(d); db.commit(); return {"message":"Document deleted successfully."}
