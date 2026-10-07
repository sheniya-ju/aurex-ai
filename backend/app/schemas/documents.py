from pydantic import BaseModel


class DocumentResponse(BaseModel):
    id: int
    filename: str
    file_type: str
    file_size: int | None
    total_pages: int
    created_at: str


class SourceResponse(BaseModel):
    document_id: int
    filename: str
    page_number: int
    chunk: str