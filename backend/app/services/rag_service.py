import os
import uuid
import chromadb
import pymupdf
from sentence_transformers import SentenceTransformer
from app.database.models import Document

CHROMA_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "chroma_data")
embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
chroma_client = chromadb.PersistentClient(path=CHROMA_PATH)
collection = chroma_client.get_or_create_collection(name="aurex_documents")

def split_text(text: str, chunk_size: int = 1000, overlap: int = 150) -> list[str]:
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

def process_pdf(file_path: str, document: Document, db):
    pdf = pymupdf.open(file_path)
    document.total_pages = len(pdf)
    all_chunks = []
    chunk_index = 0
    for page_number in range(len(pdf)):
        text = pdf[page_number].get_text("text")
        if not text.strip():
            continue
        for chunk in split_text(text):
            all_chunks.append({"content": chunk, "page_number": page_number + 1, "chunk_index": chunk_index})
            chunk_index += 1
    pdf.close()
    from app.database.models import DocumentChunk
    for item in all_chunks:
        db.add(DocumentChunk(document_id=document.id, page_number=item["page_number"], chunk_index=item["chunk_index"], content=item["content"]))
    db.commit()
    texts = [item["content"] for item in all_chunks]
    if not texts:
        return 0
    embeddings = embedding_model.encode(texts, normalize_embeddings=True).tolist()
    ids = [f"doc_{document.id}_{uuid.uuid4().hex}" for _ in texts]
    metadatas = [{"document_id": document.id, "filename": document.filename, "page_number": item["page_number"], "chunk_index": item["chunk_index"]} for item in all_chunks]
    collection.add(ids=ids, documents=texts, embeddings=embeddings, metadatas=metadatas)
    return len(all_chunks)

def search_documents(query: str, user_document_ids: list[int], top_k: int = 8):
    if not user_document_ids:
        return []
    query_embedding = embedding_model.encode([query], normalize_embeddings=True).tolist()[0]
    results = collection.query(query_embeddings=[query_embedding], n_results=top_k, where={"document_id": {"$in": user_document_ids}})
    documents = results.get("documents", [[]])[0]
    metadatas = results.get("metadatas", [[]])[0]
    distances = results.get("distances", [[]])[0]
    return [{"content": text, "document_id": int(meta["document_id"]), "filename": meta["filename"], "page_number": int(meta["page_number"]), "distance": float(distance)} for text, meta, distance in zip(documents, metadatas, distances)]

def delete_document_vectors(document_id: int):
    results = collection.get(where={"document_id": document_id})
    ids = results.get("ids", [])
    if ids:
        collection.delete(ids=ids)
