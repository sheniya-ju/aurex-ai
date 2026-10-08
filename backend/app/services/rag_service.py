import os
import re

import pymupdf
from sqlalchemy.orm import Session

from app.database.models import Document, DocumentChunk


# ============================================================
# TEXT CHUNKING
# ============================================================

def split_text(
    text: str,
    chunk_size: int = 1000,
    overlap: int = 150,
) -> list[str]:

    text = text.strip()

    if not text:
        return []

    chunks = []
    start = 0

    while start < len(text):

        end = start + chunk_size

        chunk = text[start:end].strip()

        if chunk:
            chunks.append(chunk)

        if end >= len(text):
            break

        start = end - overlap

    return chunks


# ============================================================
# KEYWORD HELPERS
# ============================================================

def _tokenize(text: str) -> list[str]:
    """
    Convert text into simple lowercase keywords.
    """

    return re.findall(
        r"\b[a-zA-Z0-9]{2,}\b",
        text.lower(),
    )


def _score_chunk(
    query: str,
    content: str,
) -> float:

    query_words = set(_tokenize(query))
    content_words = _tokenize(content)

    if not query_words or not content_words:
        return 0.0

    content_set = set(content_words)

    matched = query_words.intersection(content_set)

    if not matched:
        return 0.0

    # Basic keyword relevance score.
    #
    # More matching query words = higher score.
    #
    # Small bonus when the exact query appears.
    score = len(matched) / len(query_words)

    if query.lower().strip() in content.lower():
        score += 0.5

    return score


# ============================================================
# PROCESS PDF
# ============================================================

def process_pdf(
    file_path: str,
    document: Document,
    db: Session,
):

    pdf = pymupdf.open(file_path)

    try:

        document.total_pages = len(pdf)

        all_chunks = []

        chunk_index = 0

        for page_number in range(len(pdf)):

            text = pdf[page_number].get_text("text")

            if not text.strip():
                continue

            chunks = split_text(text)

            for chunk in chunks:

                all_chunks.append(
                    {
                        "content": chunk,
                        "page_number": page_number + 1,
                        "chunk_index": chunk_index,
                    }
                )

                chunk_index += 1

    finally:

        pdf.close()

    # --------------------------------------------------------
    # SAVE CHUNKS TO POSTGRESQL
    # --------------------------------------------------------

    for item in all_chunks:

        db.add(
            DocumentChunk(
                document_id=document.id,
                page_number=item["page_number"],
                chunk_index=item["chunk_index"],
                content=item["content"],
            )
        )

    db.commit()

    return len(all_chunks)


# ============================================================
# SEARCH DOCUMENTS
# ============================================================

def search_documents(
    query: str,
    user_document_ids: list[int],
    db: Session,
    top_k: int = 8,
):

    if not user_document_ids:
        return []

    # --------------------------------------------------------
    # Get chunks belonging only to the user's documents.
    # --------------------------------------------------------

    chunks = (
        db.query(
            DocumentChunk,
            Document,
        )
        .join(
            Document,
            Document.id == DocumentChunk.document_id,
        )
        .filter(
            Document.id.in_(user_document_ids),
        )
        .all()
    )

    if not chunks:
        return []

    # --------------------------------------------------------
    # Score chunks using lightweight keyword matching.
    # --------------------------------------------------------

    scored = []

    for chunk, document in chunks:

        score = _score_chunk(
            query,
            chunk.content,
        )

        if score <= 0:
            continue

        scored.append(
            {
                "content": chunk.content,
                "document_id": int(chunk.document_id),
                "filename": document.filename,
                "page_number": int(chunk.page_number),
                "chunk_index": int(chunk.chunk_index),
                "score": score,
            }
        )

    # --------------------------------------------------------
    # Highest relevance first.
    # --------------------------------------------------------

    scored.sort(
        key=lambda item: item["score"],
        reverse=True,
    )

    # --------------------------------------------------------
    # Convert score to a distance-like value.
    #
    # Existing AUREX routing expects "distance".
    #
    # 0.0 = highly relevant
    # 1.0 = not relevant
    # --------------------------------------------------------

    results = []

    for item in scored[:top_k]:

        score = item["score"]

        distance = max(
            0.0,
            min(
                1.0,
                1.0 - min(score, 1.0),
            ),
        )

        results.append(
            {
                "content": item["content"],
                "document_id": item["document_id"],
                "filename": item["filename"],
                "page_number": item["page_number"],
                "distance": distance,
            }
        )

    return results


# ============================================================
# DELETE DOCUMENT CHUNKS
# ============================================================

def delete_document_vectors(
    document_id: int,
    db: Session,
):

    db.query(DocumentChunk).filter(
        DocumentChunk.document_id == document_id
    ).delete(
        synchronize_session=False
    )

    db.commit()