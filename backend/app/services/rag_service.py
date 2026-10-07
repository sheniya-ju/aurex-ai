import os
import uuid

import chromadb
import pymupdf
from chromadb.utils.embedding_functions import DefaultEmbeddingFunction

from app.database.models import Document


# ============================================================
# CHROMA CONFIGURATION
# ============================================================

CHROMA_PATH = os.path.join(
    os.path.dirname(
        os.path.dirname(
            os.path.dirname(__file__)
        )
    ),
    "chroma_data",
)

chroma_client = chromadb.PersistentClient(path=CHROMA_PATH)

embedding_function = DefaultEmbeddingFunction()

collection = chroma_client.get_or_create_collection(
    name="aurex_documents",
    embedding_function=embedding_function,
)


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
# PROCESS PDF
# ============================================================

def process_pdf(file_path: str, document: Document, db):

    pdf = pymupdf.open(file_path)

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

    pdf.close()

    # --------------------------------------------------------
    # SAVE CHUNKS TO DATABASE
    # --------------------------------------------------------

    from app.database.models import DocumentChunk

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

    texts = [
        item["content"]
        for item in all_chunks
    ]

    if not texts:
        return 0

    # --------------------------------------------------------
    # STORE DOCUMENTS IN CHROMA
    #
    # Chroma automatically creates embeddings using
    # DefaultEmbeddingFunction.
    # --------------------------------------------------------

    ids = [
        f"doc_{document.id}_{uuid.uuid4().hex}"
        for _ in texts
    ]

    metadatas = [
        {
            "document_id": document.id,
            "filename": document.filename,
            "page_number": item["page_number"],
            "chunk_index": item["chunk_index"],
        }
        for item in all_chunks
    ]

    collection.add(
        ids=ids,
        documents=texts,
        metadatas=metadatas,
    )

    return len(all_chunks)


# ============================================================
# SEARCH DOCUMENTS
# ============================================================

def search_documents(
    query: str,
    user_document_ids: list[int],
    top_k: int = 8,
):

    if not user_document_ids:
        return []

    results = collection.query(
        query_texts=[query],
        n_results=top_k,
        where={
            "document_id": {
                "$in": user_document_ids
            }
        },
    )

    documents = results.get(
        "documents",
        [[]],
    )[0]

    metadatas = results.get(
        "metadatas",
        [[]],
    )[0]

    distances = results.get(
        "distances",
        [[]],
    )[0]

    return [
        {
            "content": text,
            "document_id": int(meta["document_id"]),
            "filename": meta["filename"],
            "page_number": int(meta["page_number"]),
            "distance": float(distance),
        }
        for text, meta, distance
        in zip(
            documents,
            metadatas,
            distances,
        )
    ]


# ============================================================
# DELETE DOCUMENT VECTORS
# ============================================================

def delete_document_vectors(
    document_id: int,
):

    results = collection.get(
        where={
            "document_id": document_id
        }
    )

    ids = results.get(
        "ids",
        [],
    )

    if ids:

        collection.delete(
            ids=ids
        )