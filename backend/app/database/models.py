from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime,
    ForeignKey,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database.database import Base


# ============================================================
# USER
# ============================================================

class User(Base):
    __tablename__ = "aurex_users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    conversations = relationship(
        "Conversation",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    documents = relationship(
        "Document",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    projects = relationship(
        "Project",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    settings = relationship(
        "UserSettings",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )


# ============================================================
# CONVERSATION
# ============================================================

class Conversation(Base):
    __tablename__ = "aurex_conversations"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(
        String(255),
        default="New Chat",
    )

    user_id = Column(
        Integer,
        ForeignKey("aurex_users.id"),
        nullable=False,
        index=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    user = relationship(
        "User",
        back_populates="conversations",
    )

    messages = relationship(
        "Message",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="Message.created_at",
    )

    project_links = relationship(
        "ProjectConversation",
        back_populates="conversation",
        cascade="all, delete-orphan",
    )


# ============================================================
# MESSAGE
# ============================================================

class Message(Base):
    __tablename__ = "aurex_messages"

    id = Column(Integer, primary_key=True, index=True)

    conversation_id = Column(
        Integer,
        ForeignKey("aurex_conversations.id"),
        nullable=False,
        index=True,
    )

    role = Column(
        String(20),
        nullable=False,
    )

    content = Column(
        Text,
        nullable=False,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    conversation = relationship(
        "Conversation",
        back_populates="messages",
    )

    sources = relationship(
        "MessageSource",
        back_populates="message",
        cascade="all, delete-orphan",
    )


# ============================================================
# DOCUMENT
# ============================================================

class Document(Base):
    __tablename__ = "aurex_documents"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("aurex_users.id"),
        nullable=False,
        index=True,
    )

    filename = Column(
        String(255),
        nullable=False,
    )

    file_type = Column(
        String(50),
        default="application/pdf",
    )

    file_size = Column(
        Integer,
        nullable=True,
    )

    total_pages = Column(
        Integer,
        default=0,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    user = relationship(
        "User",
        back_populates="documents",
    )

    chunks = relationship(
        "DocumentChunk",
        back_populates="document",
        cascade="all, delete-orphan",
    )

    project_links = relationship(
        "ProjectDocument",
        back_populates="document",
        cascade="all, delete-orphan",
    )

    message_sources = relationship(
        "MessageSource",
        back_populates="document",
    )


# ============================================================
# DOCUMENT CHUNK
# ============================================================

class DocumentChunk(Base):
    __tablename__ = "aurex_document_chunks"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    document_id = Column(
        Integer,
        ForeignKey("aurex_documents.id"),
        nullable=False,
        index=True,
    )

    page_number = Column(
        Integer,
        nullable=False,
    )

    chunk_index = Column(
        Integer,
        nullable=False,
    )

    content = Column(
        Text,
        nullable=False,
    )

    document = relationship(
        "Document",
        back_populates="chunks",
    )


# ============================================================
# MESSAGE SOURCE
# ============================================================

class MessageSource(Base):
    __tablename__ = "aurex_message_sources"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    message_id = Column(
        Integer,
        ForeignKey("aurex_messages.id"),
        nullable=False,
        index=True,
    )

    document_id = Column(
        Integer,
        ForeignKey("aurex_documents.id"),
        nullable=False,
        index=True,
    )

    page_number = Column(
        Integer,
        nullable=False,
    )

    chunk = Column(
        Text,
        nullable=False,
    )

    message = relationship(
        "Message",
        back_populates="sources",
    )

    document = relationship(
        "Document",
        back_populates="message_sources",
    )


# ============================================================
# PROJECT
# ============================================================

class Project(Base):
    __tablename__ = "aurex_projects"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    user_id = Column(
        Integer,
        ForeignKey("aurex_users.id"),
        nullable=False,
        index=True,
    )

    name = Column(
        String(120),
        nullable=False,
    )

    description = Column(
        String(500),
        default="",
    )

    instructions = Column(
        Text,
        default="",
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    user = relationship(
        "User",
        back_populates="projects",
    )

    conversations = relationship(
        "ProjectConversation",
        back_populates="project",
        cascade="all, delete-orphan",
    )

    documents = relationship(
        "ProjectDocument",
        back_populates="project",
        cascade="all, delete-orphan",
    )


# ============================================================
# PROJECT - CONVERSATION
# ============================================================

class ProjectConversation(Base):
    __tablename__ = "aurex_project_conversations"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    project_id = Column(
        Integer,
        ForeignKey("aurex_projects.id"),
        nullable=False,
        index=True,
    )

    conversation_id = Column(
        Integer,
        ForeignKey("aurex_conversations.id"),
        nullable=False,
        index=True,
    )

    project = relationship(
        "Project",
        back_populates="conversations",
    )

    conversation = relationship(
        "Conversation",
        back_populates="project_links",
    )

    __table_args__ = (
        UniqueConstraint(
            "project_id",
            "conversation_id",
            name="uq_aurex_project_conversation",
        ),
    )


# ============================================================
# PROJECT - DOCUMENT
# ============================================================

class ProjectDocument(Base):
    __tablename__ = "aurex_project_documents"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    project_id = Column(
        Integer,
        ForeignKey("aurex_projects.id"),
        nullable=False,
        index=True,
    )

    document_id = Column(
        Integer,
        ForeignKey("aurex_documents.id"),
        nullable=False,
        index=True,
    )

    project = relationship(
        "Project",
        back_populates="documents",
    )

    document = relationship(
        "Document",
        back_populates="project_links",
    )

    __table_args__ = (
        UniqueConstraint(
            "project_id",
            "document_id",
            name="uq_aurex_project_document",
        ),
    )


# ============================================================
# USER SETTINGS
# ============================================================

class UserSettings(Base):
    __tablename__ = "aurex_user_settings"

    user_id = Column(
        Integer,
        ForeignKey("aurex_users.id"),
        primary_key=True,
    )

    theme = Column(
        String(20),
        default="system",
        nullable=False,
    )

    model = Column(
        String(100),
        default="openai/gpt-oss-20b",
        nullable=False,
    )

    enter_to_send = Column(
        Integer,
        default=1,
        nullable=False,
    )

    show_sources = Column(
        Integer,
        default=1,
        nullable=False,
    )

    auto_scroll = Column(
        Integer,
        default=1,
        nullable=False,
    )

    user = relationship(
        "User",
        back_populates="settings",
    )