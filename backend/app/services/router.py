from sqlalchemy.orm import Session

from app.services.rag_service import search_documents


DOCUMENT_HINTS = {
    "pdf",
    "document",
    "file",
    "uploaded",
    "upload",
    "page",
    "pages",
    "according to",
    "in this",
    "in the document",
    "in my pdf",
    "this pdf",
    "summarize this",
    "summary of this",
    "what does this say",
    "what is this about",
}


def retrieve_context(
    query: str,
    document_ids: list[int],
    db: Session,
    top_k: int = 8,
):

    if not document_ids:
        return []

    return search_documents(
        query=query,
        user_document_ids=document_ids,
        db=db,
        top_k=top_k,
    )


def route_query(
    query: str,
    sources: list[dict],
    explicit_documents: bool = False,
):

    if explicit_documents:
        return "document"

    lower = query.lower()

    hinted = any(
        hint in lower
        for hint in DOCUMENT_HINTS
    )

    strong = any(
        float(
            source.get(
                "distance",
                1.0,
            )
        ) <= 0.72
        for source in sources
    )

    if hinted or strong:
        return "document"

    return "general"