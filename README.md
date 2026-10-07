# AUREX AI

### Intelligence, unified.

AUREX AI is a full-stack AI chatbot platform that combines general-purpose AI assistance with document-based Retrieval-Augmented Generation (RAG) in a single interface.

Users can chat with the AI, upload PDF documents, ask questions about their documents, view relevant sources, manage conversations, and organize their work through projects.

---

## 🚀 Features

### 🤖 AI Chat
- General-purpose AI conversations
- Context-aware responses
- Markdown formatting
- Code block rendering
- Copy responses and code
- Conversation history
- New chat functionality

### 📄 PDF RAG
- Upload PDF documents
- Extract text from PDF pages
- Split documents into searchable chunks
- Generate vector embeddings
- Semantic document search
- Ask questions about uploaded documents
- Automatic document context retrieval
- Source document and page references

### 🔀 Intelligent Routing
AUREX AI can determine whether a question should be answered using:

- General AI knowledge
- Uploaded document information

This allows users to interact naturally without manually switching between AI and document modes.

### 💬 Chat Management
- Create new conversations
- View recent conversations
- Delete conversations
- Persistent conversation history
- User-specific conversations

### 👤 Authentication
- User registration
- User login
- Password hashing
- JWT-based authentication
- Protected API endpoints

### 📁 Projects
- Organize AI work into projects
- Project-based workspace structure
- Manage project information

### ⚙️ Settings
- User settings
- Theme support
- Dark mode
- Application preferences

---

## 🏗️ Architecture

```text
                    ┌─────────────────────┐
                    │     AUREX AI UI     │
                    │ React + TypeScript  │
                    └──────────┬──────────┘
                               │
                               │ HTTPS
                               ▼
                    ┌─────────────────────┐
                    │      FastAPI        │
                    │      Backend        │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
        ┌───────────┐    ┌───────────┐    ┌───────────┐
        │    Auth   │    │ AI / RAG  │    │   Chat    │
        │  Service  │    │  Service  │    │  Service  │
        └───────────┘    └─────┬─────┘    └───────────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
                    ▼                     ▼
             ┌─────────────┐       ┌─────────────┐
             │ PostgreSQL  │       │   Chroma    │
             │   Database  │       │ Vector DB   │
             └─────────────┘       └─────────────┘
