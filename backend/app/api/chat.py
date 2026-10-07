import json

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.database.database import get_db
from app.database.models import (
    Conversation,
    Document,
    Message,
    MessageSource,
    Project,
    ProjectConversation,
    ProjectDocument,
    User,
)
from app.schemas.chat import (
    ChatRequest,
    ChatResponse,
    ConversationResponse,
    MessageResponse,
)
from app.services.llm_service import generate_response, stream_response
from app.services.router import retrieve_context, route_query


router = APIRouter(
    prefix="/api/chat",
    tags=["Chat"],
)


# ============================================================
# PROJECT HELPERS
# ============================================================

def _project_for_user(
    db: Session,
    user_id: int,
    project_id: int | None,
):
    if not project_id:
        return None

    project = (
        db.query(Project)
        .filter(
            Project.id == project_id,
            Project.user_id == user_id,
        )
        .first()
    )

    if not project:
        raise HTTPException(
            status_code=404,
            detail="Project not found.",
        )

    return project


def _project_document_ids(
    db: Session,
    project_id: int | None,
):
    if not project_id:
        return []

    rows = (
        db.query(ProjectDocument)
        .filter(
            ProjectDocument.project_id == project_id
        )
        .all()
    )

    return [
        row.document_id
        for row in rows
    ]


# ============================================================
# SOURCE HELPERS
# ============================================================

def _source_dicts(
    db: Session,
    message_id: int,
):
    rows = (
        db.query(MessageSource, Document)
        .join(
            Document,
            Document.id == MessageSource.document_id,
        )
        .filter(
            MessageSource.message_id == message_id
        )
        .all()
    )

    return [
        {
            "document_id": source.document_id,
            "filename": document.filename,
            "page_number": source.page_number,
            "chunk": source.chunk,
        }
        for source, document in rows
    ]


# ============================================================
# PREPARE CHAT
# ============================================================

def _prepare(
    db: Session,
    user: User,
    data: ChatRequest,
):
    # --------------------------------------------------------
    # 1. Validate project
    # --------------------------------------------------------

    project = _project_for_user(
        db,
        user.id,
        data.project_id,
    )

    # --------------------------------------------------------
    # 2. Find or create conversation
    # --------------------------------------------------------

    if data.conversation_id:

        conversation = (
            db.query(Conversation)
            .filter(
                Conversation.id == data.conversation_id,
                Conversation.user_id == user.id,
            )
            .first()
        )

        if not conversation:
            raise HTTPException(
                status_code=404,
                detail="Conversation not found.",
            )

        # If using a project, make sure the conversation
        # belongs to that project.
        if project:

            project_conversation = (
                db.query(ProjectConversation)
                .filter(
                    ProjectConversation.project_id
                    == project.id,
                    ProjectConversation.conversation_id
                    == conversation.id,
                )
                .first()
            )

            if not project_conversation:
                raise HTTPException(
                    status_code=400,
                    detail="Conversation does not belong to this project.",
                )

    else:

        conversation = Conversation(
            title=data.message[:60],
            user_id=user.id,
        )

        db.add(conversation)
        db.commit()
        db.refresh(conversation)

        # Link new conversation to project.
        if project:

            db.add(
                ProjectConversation(
                    project_id=project.id,
                    conversation_id=conversation.id,
                )
            )

            db.commit()

    # --------------------------------------------------------
    # 3. Save user message
    # --------------------------------------------------------

    user_message = Message(
        conversation_id=conversation.id,
        role="user",
        content=data.message,
    )

    db.add(user_message)
    db.commit()

    # --------------------------------------------------------
    # 4. Get conversation history
    # --------------------------------------------------------

    history = (
        db.query(Message)
        .filter(
            Message.conversation_id == conversation.id
        )
        .order_by(
            Message.created_at.asc()
        )
        .all()
    )

    # --------------------------------------------------------
    # 5. Determine available documents
    # --------------------------------------------------------

    document_ids = list(
        data.document_ids
    )

    # If project is selected and no documents were
    # explicitly attached, use project documents.
    if project and not document_ids:

        document_ids = _project_document_ids(
            db,
            project.id,
        )

    # --------------------------------------------------------
    # 6. Validate explicitly selected documents
    # --------------------------------------------------------

    if data.document_ids:

        owned_rows = (
            db.query(Document.id)
            .filter(
                Document.user_id == user.id,
                Document.id.in_(
                    data.document_ids
                ),
            )
            .all()
        )

        owned_ids = {
            row[0]
            for row in owned_rows
        }

        if set(data.document_ids) != owned_ids:

            raise HTTPException(
                status_code=400,
                detail="One or more selected PDFs are invalid.",
            )

    else:

        # If there are no project-specific documents,
        # search the user's documents automatically.
        if not document_ids:

            document_ids = [
                row.id
                for row in (
                    db.query(Document)
                    .filter(
                        Document.user_id == user.id
                    )
                    .all()
                )
            ]

    # --------------------------------------------------------
    # 7. Retrieve relevant document context
    # --------------------------------------------------------

    sources = (
        retrieve_context(
            data.message,
            document_ids,
            top_k=8,
        )
        if document_ids
        else []
    )

    # --------------------------------------------------------
    # 8. Automatically decide General AI vs RAG
    # --------------------------------------------------------

    route = route_query(
        data.message,
        sources,
        explicit_documents=bool(
            data.document_ids
        ),
    )

    # --------------------------------------------------------
    # 9. Select relevant sources
    # --------------------------------------------------------

    if route == "general":

        relevant = []

    else:

        # When user explicitly attaches PDFs,
        # trust those selected documents.
        if data.document_ids:

            relevant = sources[:5]

        else:

            # Automatic RAG uses a relevance threshold.
            relevant = [
                source
                for source in sources
                if source.get(
                    "distance",
                    1.0,
                ) <= 0.80
            ][:5]

    # --------------------------------------------------------
    # 10. Build document context
    # --------------------------------------------------------

    context = ""

    if relevant:

        context = "\n\n".join(
            (
                f"SOURCE {index}\n"
                f"Document: {source['filename']}\n"
                f"Page: {source['page_number']}\n"
                f"Content:\n{source['content']}"
            )
            for index, source in enumerate(
                relevant,
                1,
            )
        )

    # --------------------------------------------------------
    # 11. Build project instructions
    # --------------------------------------------------------

    project_instruction = (
        project.instructions.strip()
        if project
        else ""
    )

    project_context = ""

    if project_instruction:

        project_context = (
            "PROJECT INSTRUCTIONS:\n"
            + project_instruction
            + "\n\n"
        )

    # --------------------------------------------------------
    # 12. Build document instructions
    # --------------------------------------------------------

    document_context = ""

    if relevant:

        document_context = (
            "RELEVANT DOCUMENT INFORMATION:\n"
            + context
            + "\n\n"
            "Use the document when relevant. "
            "Do not claim you cannot view the PDF "
            "when information is provided. "
            "Do not invent unsupported facts. "
            "Never mention embeddings, Chroma, "
            "vector databases, retrieval distances, "
            "or internal implementation details.\n"
        )

    # --------------------------------------------------------
    # 13. Build system prompt
    # --------------------------------------------------------

    system = (
        "You are AUREX AI, a helpful and professional "
        "AI assistant.\n\n"

        "Give accurate, clear and useful answers. "
        "Use Markdown when helpful. "
        "Render Markdown tables directly. "
        "Use fenced code blocks only for actual code "
        "or commands.\n\n"

        + project_context
        + document_context
    )

    # --------------------------------------------------------
    # 14. Build LLM message history
    # --------------------------------------------------------

    messages = [
        {
            "role": "system",
            "content": system,
        }
    ]

    messages += [
        {
            "role": message.role,
            "content": message.content,
        }
        for message in history
    ]

    return (
        conversation,
        messages,
        relevant,
        route,
    )


# ============================================================
# SAVE SOURCES
# ============================================================

def _save_sources(
    db: Session,
    message_id: int,
    sources,
):
    for source in sources:

        db.add(
            MessageSource(
                message_id=message_id,
                document_id=int(
                    source["document_id"]
                ),
                page_number=int(
                    source["page_number"]
                ),
                chunk=source["content"],
            )
        )

    db.commit()


# ============================================================
# RESPONSE BUILDER
# ============================================================

def _response(
    db: Session,
    conversation,
    assistant,
    route,
):
    return {
        "conversation_id": conversation.id,
        "message_id": assistant.id,
        "role": "assistant",
        "content": assistant.content,
        "sources": _source_dicts(
            db,
            assistant.id,
        ),
        "route": route,
    }


# ============================================================
# NORMAL CHAT
# ============================================================

@router.post(
    "/message",
    response_model=ChatResponse,
)
def send_message(
    data: ChatRequest,
    user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):

    conversation, messages, sources, route = _prepare(
        db,
        user,
        data,
    )

    try:

        answer = generate_response(
            messages,
            data.model,
        )

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=f"AI service error: {exc}",
        )

    # --------------------------------------------------------
    # Save assistant message
    # --------------------------------------------------------

    assistant = Message(
        conversation_id=conversation.id,
        role="assistant",
        content=answer,
    )

    db.add(assistant)
    db.commit()
    db.refresh(assistant)

    # --------------------------------------------------------
    # Save RAG sources
    # --------------------------------------------------------

    _save_sources(
        db,
        assistant.id,
        sources,
    )

    return _response(
        db,
        conversation,
        assistant,
        route,
    )


# ============================================================
# STREAMING CHAT
# ============================================================

@router.post("/stream")
def stream_message(
    data: ChatRequest,
    user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):

    conversation, messages, sources, route = _prepare(
        db,
        user,
        data,
    )

    # Create empty assistant message first.
    assistant = Message(
        conversation_id=conversation.id,
        role="assistant",
        content="",
    )

    db.add(assistant)
    db.commit()
    db.refresh(assistant)

    # Save sources before streaming.
    _save_sources(
        db,
        assistant.id,
        sources,
    )

    source_payload = _source_dicts(
        db,
        assistant.id,
    )

    def events():

        full = []

        # ----------------------------------------------------
        # Start event
        # ----------------------------------------------------

        yield (
            "data: "
            + json.dumps(
                {
                    "type": "start",
                    "conversation_id": conversation.id,
                    "message_id": assistant.id,
                    "route": route,
                    "sources": source_payload,
                }
            )
            + "\n\n"
        )

        try:

            # ------------------------------------------------
            # Stream tokens
            # ------------------------------------------------

            for token in stream_response(
                messages,
                data.model,
            ):

                full.append(token)

                yield (
                    "data: "
                    + json.dumps(
                        {
                            "type": "token",
                            "content": token,
                        }
                    )
                    + "\n\n"
                )

            # ------------------------------------------------
            # Save complete response
            # ------------------------------------------------

            assistant.content = "".join(full)

            db.commit()

            yield (
                "data: "
                + json.dumps(
                    {
                        "type": "done",
                    }
                )
                + "\n\n"
            )

        except Exception as exc:

            assistant.content = "".join(full)

            db.commit()

            yield (
                "data: "
                + json.dumps(
                    {
                        "type": "error",
                        "message": str(exc),
                    }
                )
                + "\n\n"
            )

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


# ============================================================
# GET CONVERSATIONS
# ============================================================

@router.get(
    "/conversations",
    response_model=list[ConversationResponse],
)
def get_conversations(
    project_id: int | None = None,
    user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):

    query = (
        db.query(Conversation)
        .filter(
            Conversation.user_id == user.id
        )
    )

    # --------------------------------------------------------
    # Filter by project if requested
    # --------------------------------------------------------

    if project_id:

        project = _project_for_user(
            db,
            user.id,
            project_id,
        )

        ids = [
            row.conversation_id
            for row in (
                db.query(ProjectConversation)
                .filter(
                    ProjectConversation.project_id
                    == project.id
                )
                .all()
            )
        ]

        if ids:

            query = query.filter(
                Conversation.id.in_(ids)
            )

        else:

            query = query.filter(False)

    # --------------------------------------------------------
    # Latest conversations first
    # --------------------------------------------------------

    rows = (
        query
        .order_by(
            Conversation.updated_at.desc()
        )
        .all()
    )

    result = []

    for conversation in rows:

        project_id_value = next(
            (
                link.project_id
                for link in conversation.project_links
                if link.project_id
            ),
            None,
        )

        result.append(
            {
                "id": conversation.id,
                "title": conversation.title,
                "created_at": str(
                    conversation.created_at
                ),
                "updated_at": str(
                    conversation.updated_at
                ),
                "project_id": project_id_value,
            }
        )

    return result


# ============================================================
# GET CONVERSATION MESSAGES
# ============================================================

@router.get(
    "/conversations/{conversation_id}/messages",
    response_model=list[MessageResponse],
)
def get_messages(
    conversation_id: int,
    user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):

    conversation = (
        db.query(Conversation)
        .filter(
            Conversation.id == conversation_id,
            Conversation.user_id == user.id,
        )
        .first()
    )

    if not conversation:

        raise HTTPException(
            status_code=404,
            detail="Conversation not found.",
        )

    rows = (
        db.query(Message)
        .filter(
            Message.conversation_id
            == conversation_id
        )
        .order_by(
            Message.created_at.asc()
        )
        .all()
    )

    return [
        {
            "id": message.id,
            "role": message.role,
            "content": message.content,
            "created_at": str(
                message.created_at
            ),
            "sources": _source_dicts(
                db,
                message.id,
            ),
        }
        for message in rows
    ]


# ============================================================
# DELETE CONVERSATION
# ============================================================

@router.delete(
    "/conversations/{conversation_id}"
)
def delete_conversation(
    conversation_id: int,
    user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):

    conversation = (
        db.query(Conversation)
        .filter(
            Conversation.id == conversation_id,
            Conversation.user_id == user.id,
        )
        .first()
    )

    if not conversation:

        raise HTTPException(
            status_code=404,
            detail="Conversation not found.",
        )

    db.delete(conversation)
    db.commit()

    return {
        "message": "Conversation deleted successfully."
    }