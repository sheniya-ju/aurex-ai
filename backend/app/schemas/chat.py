from typing import Optional
from pydantic import BaseModel, Field

class SourceResponse(BaseModel):
    document_id: int
    filename: str
    page_number: int
    chunk: str

class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=20000)
    conversation_id: Optional[int] = None
    model: Optional[str] = None
    document_ids: list[int] = Field(default_factory=list)
    project_id: Optional[int] = None

class ChatResponse(BaseModel):
    conversation_id: int
    message_id: int
    role: str
    content: str
    sources: list[SourceResponse] = Field(default_factory=list)
    route: str = "general"

class ConversationResponse(BaseModel):
    id: int
    title: str
    created_at: str
    updated_at: str
    project_id: Optional[int] = None

class MessageResponse(BaseModel):
    id: int
    role: str
    content: str
    created_at: str
    sources: list[SourceResponse] = Field(default_factory=list)
