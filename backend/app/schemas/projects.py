from pydantic import BaseModel, Field
from typing import Optional

class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str = Field(default="", max_length=500)
    instructions: str = Field(default="", max_length=10000)

class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    description: Optional[str] = Field(default=None, max_length=500)
    instructions: Optional[str] = Field(default=None, max_length=10000)

class ProjectResponse(BaseModel):
    id: int
    name: str
    description: str
    instructions: str
    created_at: str
    updated_at: str
    document_count: int = 0
    conversation_count: int = 0
    document_ids: list[int] = []
